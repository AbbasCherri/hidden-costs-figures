/* app.js - the whole interface: load data, pick a style, tweak text, export. */
'use strict';

const SIZES = [
  { id: 'single', label: 'Single column', inch: 3.5 },
  { id: 'mid', label: '1.5 column', inch: 5.2 },
  { id: 'double', label: 'Double column', inch: 7.2 },
];
const state = {
  data: null, type: null, source: '', settings: {},
  variant: {}, opts: {}, text: { title: '', x: '', y: '', foot: '' }, dirty: {},
  showTitle: false, size: 'mid', patterns: false, hue: 'blue', palette: 'journal', svg: null,
};

let downloads = null;

const $ = s => document.querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const typeMeta = id => TYPE_LIST.find(t => t.id === id);

/* ---------- loading ---------- */
function load(t, source) {
  state.data = t; state.type = t.type; state.settings = t.settings || {}; state.source = source; state.dirty = {};
  const def = CHARTS[t.type];
  if (!def.variants.some(v => v.id === state.variant[t.type])) state.variant[t.type] = def.variants[0].id;
  const saved = state.opts[t.type] || {};
  state.opts[t.type] = Object.fromEntries(def.options.map(o => {
    const v = saved[o.id], ok = o.choices ? o.choices.some(c => c[0] === v) : typeof v === 'boolean';
    return [o.id, ok ? v : o.def];
  }));
  setError('');
  buildPanel(); render();
}

function exampleTable(id) {
  const e = Object.values(EXAMPLES.examples).find(x => detectType(x.headers) === id);
  if (!e) return null;
  const rows = e.rows.map(r => Object.fromEntries(e.headers.map((k, i) => [k, r[i]])));
  const m = EXAMPLES.meta, current = detectType(e.headers) === 'meanci';
  return { type: id, headers: e.headers, rows, settings: current ? { title: m.title, x: m.x, y: m.y, foot: m.foot } : {} };
}

function setError(msg) { const e = $('#err'); e.textContent = msg; e.hidden = !msg; }
async function tryLoad(fn, source) {
  try { load(await fn(), source); } catch (err) { setError(err.message || String(err)); }
}

/* ---------- text fields: filled from the sheet, editable, resettable ---------- */
function autoText() {
  const def = CHARTS[state.type], s = state.settings, a = def.auto(state.data, s, state.opts[state.type]);
  return { title: s.title || '', x: a.x, y: a.y, foot: a.foot };
}
function syncText() {
  const a = autoText();
  for (const k of ['title', 'x', 'y', 'foot']) {
    if (!state.dirty[k]) state.text[k] = a[k] || '';
    $('#t-' + k).value = state.text[k];
  }
}

/* ---------- control panel ---------- */
function seg(name, choices, value, onChange) {
  return h('div', { class: 'seg', role: 'radiogroup' }, choices.map(([v, label]) =>
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === value), class: v === value ? 'on' : '', onclick: () => onChange(v) }, label)));
}

function buildPanel() {
  const t = state.type, def = CHARTS[t], meta = typeMeta(t);
  $('#chip-type').textContent = meta.name;
  $('#chip-meta').textContent = `${state.data.rows.length} rows · ${state.source}`;
  $('#data-ok').hidden = false;
  $('#example').value = '';

  const vbox = $('#variants'); vbox.replaceChildren(...def.variants.map(v =>
    h('button', { type: 'button', class: 'variant' + (state.variant[t] === v.id ? ' on' : ''), role: 'radio', 'aria-checked': String(state.variant[t] === v.id),
      onclick: () => { state.variant[t] = v.id; buildPanel(); render(); } }, h('span', { class: 'dot' }), v.label)));

  const pal = applyPalette(state.palette);
  $('#palette').replaceChildren(...PALETTES.map(q => h('option', { value: q.id, selected: q.id === state.palette }, q.name)));
  $('#swatches').replaceChildren(...pal.c.map(col => h('span', { class: 'sw-chip', style: `background:${col}`, title: col })));
  $('#pal-note').textContent = pal.note;
  $('#pal-row').hidden = !!def.fixedColours;
  $('#hue-row').hidden = !def.hue;
  $('#hue').replaceChildren(seg('hue', [['blue', 'One colour'], ['cat', 'Distinct colours']], state.hue, v => { state.hue = v; buildPanel(); render(); }));
  const obox = $('#options'); obox.replaceChildren(...def.options.map(o => {
    const val = state.opts[t][o.id], set = v => { state.opts[t][o.id] = v; syncText(); buildPanel(); render(); };
    if (o.kind === 'toggle')
      return h('label', { class: 'switch' }, h('input', { type: 'checkbox', id: `o-${o.id}`, checked: !!val, onchange: e => set(e.target.checked) }), h('span', { class: 'sw' }), o.label);
    return h('div', { class: 'field' }, h('span', { class: 'lab' }, o.label),
      o.choices.length <= 3 ? seg(o.id, o.choices, val, set)
        : h('select', { id: `o-${o.id}`, onchange: e => set(e.target.value) }, o.choices.map(([v, l]) => h('option', { value: v, selected: v === val }, l))));
  }));

  $('#size').replaceChildren(seg('size', SIZES.map(s => [s.id, `${s.label} · ${s.inch} in`]), state.size, v => { state.size = v; buildPanel(); render(); }));
  $('#title-on').checked = state.showTitle; $('#patterns').checked = state.patterns;
  syncText();
}

/* ---------- drawing ---------- */
function render() {
  if (!state.data) return;
  savePrefs();
  applyPalette(state.palette);
  const def = CHARTS[state.type], size = SIZES.find(s => s.id === state.size), w = Math.round(size.inch * 96);
  const f = new Fig(w, { title: state.text.title, showTitle: state.showTitle, x: state.text.x, y: state.text.y, foot: state.text.foot, patterns: state.patterns });
  const stage = $('#fig');
  try {
    def.draw(f, state.data, state.variant[state.type], { ...state.opts[state.type], hue: state.hue });
    const svg = f.end();
    state.svg = svg; stage.replaceChildren(svg); stage.style.setProperty('--w', w + 'px');
    $('#stage-err').hidden = true;
    $('#pat-row').hidden = !f.canPattern;
    $('#px').textContent = `${size.inch} in wide · exports ${Math.round(w * 300 / 96)} × ${Math.round(f.h * 300 / 96)} px at 300 dpi`;
    const groups = new Set(state.data.rows.map(r => r.group_category || r.group_label).filter(Boolean)).size;
    $('#warn').textContent = groups > 6 ? `This table has ${groups} groups. Colours repeat after 6, so consider filtering in Graph_Maker.` : '';
  } catch (err) {
    console.error(err); state.svg = null; stage.replaceChildren();
    $('#stage-err').hidden = false; $('#stage-err').textContent = `This chart could not be drawn: ${err.message}`;
  }
}

/* ---------- export ---------- */
function say(msg, bad) { const s = $('#say'); s.textContent = msg; s.className = bad ? 'bad' : ''; clearTimeout(say.t); say.t = setTimeout(() => (s.textContent = ''), 6000); }
function fileBase() { return `figure_${state.type}_${state.variant[state.type]}_${state.size}`; }

function showImage(blob, name, why) {
  const url = URL.createObjectURL(blob), m = $('#modal');
  $('#modal-img').src = url; $('#modal-name').textContent = name; $('#modal-why').textContent = why;
  m.hidden = false; m.dataset.url = url; $('#modal-close').focus();
}
function closeModal() { const m = $('#modal'); if (m.dataset.url) URL.revokeObjectURL(m.dataset.url); m.hidden = true; $('#modal-img').removeAttribute('src'); }

async function getDownloads() {
  if (downloads) return downloads;
  try { downloads = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { downloads = null; }
  return downloads;
}

async function save(ext) {
  if (!state.svg) return say('Nothing to export yet.', true);
  const name = `${fileBase()}.${ext}`;
  let blob; say('Preparing ' + name + ' …');
  try {
    const clone = state.svg.cloneNode(true);
    blob = ext === 'png' ? await pngBlob(clone, 300) : new Blob([svgString(clone)], { type: 'image/svg+xml' });
  } catch (err) { return say(`Could not build the ${ext.toUpperCase()}: ${err.message || err}`, true); }
  const d = await getDownloads();
  if (d) {
    try { await d.save({ filename: name, data: blob }); return say(`Saved ${name}`); }
    catch (err) { if (err && err.code === 'declined') return say('Save cancelled.'); /* otherwise fall through to the manual route */ }
  }
  if (!window.claude) {   // an ordinary website: a normal download link works
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return say(`Saved ${name}`);
  }
  if (ext === 'png') return showImage(blob, name, 'Direct saving is not available here. Right-click the image and choose Save image as (on a phone, press and hold).');
  say('Direct saving is not available here. Use Download PNG or Copy instead.', true);
}
async function copyImage() {
  if (!state.svg) return;
  let blob; say('Preparing image …');
  try { blob = await pngBlob(state.svg.cloneNode(true), 300); } catch (err) { return say(`Could not build the image: ${err.message || err}`, true); }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    say('Image copied. Paste it into Word or PowerPoint.');
  } catch (err) { showImage(blob, `${fileBase()}.png`, 'Copying is blocked in this view. Right-click the image and choose Copy image.'); }
}

/* ---------- wiring ---------- */
function init() {
  $('#example').append(...TYPE_LIST.filter(t => t.id !== 'scatter').map(t => h('option', { value: t.id }, `${t.name} · ${t.note}`)));
  $('#example').addEventListener('change', e => { const t = exampleTable(e.target.value); if (t) load(t, 'example from the workbook'); });
  $('#file').addEventListener('change', e => { const f = e.target.files[0]; if (f) tryLoad(() => fromFile(f), f.name); e.target.value = ''; });
  $('#use-paste').addEventListener('click', () => { const v = $('#paste').value; if (v.trim()) tryLoad(async () => fromText(v), 'pasted table'); });

  document.addEventListener('paste', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const t = e.clipboardData && e.clipboardData.getData('text/plain');
    if (t && t.trim()) { e.preventDefault(); tryLoad(async () => fromText(t), 'pasted table'); }
  });
  const dz = $('#drop');
  ['dragenter', 'dragover'].forEach(n => document.addEventListener(n, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(n => document.addEventListener(n, e => { e.preventDefault(); if (n === 'drop' || e.target === document.documentElement) dz.classList.remove('over'); }));
  document.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) tryLoad(() => fromFile(f), f.name); });

  for (const k of ['title', 'x', 'y', 'foot']) $('#t-' + k).addEventListener('input', e => {
    state.text[k] = e.target.value; state.dirty[k] = true;
    if (k === 'title' && e.target.value.trim() && !state.showTitle) { state.showTitle = true; $('#title-on').checked = true; }   // typing a title means you want it shown
    render();
  });
  $('#palette').addEventListener('change', e => { state.palette = e.target.value; buildPanel(); render(); });
  $('#title-on').addEventListener('change', e => { state.showTitle = e.target.checked; render(); });
  $('#patterns').addEventListener('change', e => { state.patterns = e.target.checked; render(); });
  $('#reset-prefs').addEventListener('click', resetPrefs);
  $('#reset-text').addEventListener('click', () => { state.dirty = {}; syncText(); render(); });
  $('#png').addEventListener('click', () => save('png'));
  $('#svg').addEventListener('click', () => save('svg'));
  $('#copy').addEventListener('click', copyImage);

  getDownloads();
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  loadPrefs();
  load(exampleTable('meanci'), 'example from the workbook');
}
document.addEventListener('DOMContentLoaded', init);
