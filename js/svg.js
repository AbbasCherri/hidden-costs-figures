/* svg.js - SVG helpers, scales and ticks, group colours and patterns, class Fig, axes and plot frames. */
'use strict';
const S = { tick: 10.5, label: 11.5, legend: 10.5, title: 13.5, note: 9.5, val: 10.5 };
const PADX = 8;

/* ---------- tiny helpers ---------- */
const num = v => (typeof v === 'number' && isFinite(v));
const sum = a => a.reduce((s, v) => s + v, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function el(tag, a, ...kids) {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]);
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

/* text: T(x, y, 'label', {size, anchor, weight, fill, base, rot, italic}) */
function T(x, y, s, o = {}) {
  const t = el('text', {
    x, y, 'font-family': CH.font, 'font-size': o.size || S.tick, fill: o.fill || CH.ink,
    'text-anchor': o.anchor || 'start', 'font-weight': o.weight || 'normal',
    'dominant-baseline': o.base || 'alphabetic', 'font-style': o.italic ? 'italic' : null,
    transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null,
  });
  t.textContent = s;
  return t;
}

const _ctx = document.createElement('canvas').getContext('2d');
function tw(s, size = S.tick, weight = 'normal') {
  _ctx.font = `${weight} ${size}px ${CH.font}`;
  return _ctx.measureText(String(s)).width;
}

/* greedy word wrap to a pixel width; very long words are kept whole */
function wrap(str, maxW, size = S.tick, weight = 'normal') {
  const words = String(str).split(/\s+/).filter(Boolean);
  const out = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && tw(t, size, weight) > maxW) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

/* ---------- scales and ticks ---------- */
function linear(d0, d1, r0, r1) {
  const f = v => r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0);
  f.d = [d0, d1]; f.r = [r0, r1];
  return f;
}

function niceTicks(min, max, n = 5) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { ticks, lo, hi, step };
}

function tickFmt(step) {
  const s = String(+step.toPrecision(10)), d = s.includes('.') ? s.split('.')[1].length : 0;
  return v => (+v).toFixed(Math.min(d, 4)).replace('-', '\u2212');
}
const f1 = v => (+v).toFixed(1);
const f2 = v => (+v).toFixed(2).replace('-', '−');
const pctTxt = v => `${(+v).toFixed(1)}%`;
const intTxt = v => String(Math.round(v));

function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function ramp(stops, t) {                       // t in [0,1] along equally spaced stops
  t = clamp(t, 0, 1);
  const k = (stops.length - 1) * t, i = Math.min(stops.length - 2, Math.floor(k));
  return mixHex(stops[i], stops[i + 1], k - i);
}
const luminance = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };
const textOn = bg => (luminance(bg) < 0.45 ? '#ffffff' : CH.ink);

/* rounded data-end bar anchored to its baseline: dir = up | right */
function rbar(x, y, w, h, dir, fill, extra = {}) {
  if (!(w > 0) || !(h > 0)) return el('path', { d: '' });
  const d = dir === 'up' ? `M${x},${y + h}V${y}H${x + w}V${y + h}Z` : `M${x},${y}H${x + w}V${y + h}H${x}Z`;
  const edge = typeof fill === 'string' && fill[0] === '#' ? mixHex(fill, '#000000', .32) : CH.axis;   // thin darker outline, as in journal bar charts
  return el('path', { d, fill, stroke: edge, 'stroke-width': .8, 'stroke-linejoin': 'miter', ...extra });
}

/* ---------- group colours and print-safe patterns ---------- */
function groupFill(f, i, color) {
  if (i > 0) f.canPattern = true;               // nothing to tell apart with a single fill
  if (!f.cfg.patterns || i === 0) return color;
  const id = `pat${i}_${String(color).replace(/[^0-9a-z]/gi, '')}`;
  if (!f.defs.querySelector('#' + id)) {
    const p = el('pattern', { id, width: 6, height: 6, patternUnits: 'userSpaceOnUse' },
      el('rect', { width: 6, height: 6, fill: color }));
    const ln = (x1, y1, x2, y2) => el('path', { d: `M${x1},${y1}L${x2},${y2}`, stroke: '#fff', 'stroke-width': 1.3 });
    const kind = (i - 1) % 5;
    if (kind === 0) p.append(ln(0, 6, 6, 0), ln(-1, 1, 1, -1), ln(5, 7, 7, 5));
    if (kind === 1) p.append(ln(0, 0, 6, 6), ln(-1, 5, 1, 7), ln(5, -1, 7, 1));
    if (kind === 2) p.append(el('circle', { cx: 3, cy: 3, r: 1.1, fill: '#fff' }));
    if (kind === 3) p.append(ln(0, 3, 6, 3));
    if (kind === 4) p.append(ln(3, 0, 3, 6), ln(0, 3, 6, 3));
    f.defs.append(p);
  }
  return `url(#${id})`;
}
const gcol = i => CH.pal[i % CH.pal.length];

/* ---------- the figure: title, legend, plot area, footnote ---------- */
class Fig {
  constructor(w, cfg) {
    this.w = w; this.cfg = cfg || {};
    this.svg = el('svg', { xmlns: NS, width: w, 'font-family': CH.font });
    this.defs = el('defs'); this.bg = el('rect', { x: 0, y: 0, fill: CH.surf });
    this.g = el('g'); this.svg.append(this.defs, this.bg, this.g);
    this.y = 10; this.notes = [];
    if (this.cfg.showTitle && this.cfg.title) {
      for (const ln of wrap(this.cfg.title, w - 2 * PADX, S.title, 'bold')) {
        this.y += S.title; this.g.append(T(PADX, this.y, ln, { size: S.title, weight: 'bold' })); this.y += 3;
      }
      this.y += 6;
    }
  }
  add(...n) { this.g.append(...n.flat()); return this; }

  /* items: [{label, color, kind: 'box'|'line'|'dot', fill}] flowing in rows */
  legend(items, title) {
    if (!items || !items.length) return this;
    let x = PADX, y = this.y + S.legend, row = 0;
    const lh = S.legend + 7;
    if (title) { this.add(T(x, y, title, { size: S.legend, weight: 'bold' })); x += tw(title, S.legend, 'bold') + 12; }
    for (const it of items) {
      const w = 16 + tw(it.label, S.legend) + 14;
      if (x + w > this.w - PADX && x > PADX + 1) { x = PADX; y += lh; row++; }
      const cy = y - S.legend * .35;
      if (it.kind === 'mark') this.add(markEl(it.shape, x + 6, cy, 4.2, { fill: it.color, stroke: CH.surf, 'stroke-width': .8 }));
      else if (it.kind === 'line') this.add(el('path', { d: `M${x},${cy}H${x + 14}`, stroke: it.color, 'stroke-width': 2 }), el('circle', { cx: x + 7, cy, r: 3, fill: it.color, stroke: CH.surf }));
      else if (it.kind === 'dot') this.add(el('circle', { cx: x + 6, cy, r: 4.5, fill: it.color, stroke: CH.surf }));
      else this.add(el('rect', { x, y: cy - 5, width: 12, height: 10, rx: 2, fill: it.fill || it.color }));
      this.add(T(x + 17, y, it.label, { size: S.legend }));
      x += w;
    }
    this.y = y + 10;
    return this;
  }

  /* reserve the plot rectangle; l/r/b are margins, h the plot height */
  begin(h, m) {
    this.plot = { x: m.l, y: this.y + (m.t || 4), w: this.w - m.l - m.r, h };
    this.m = m;
    return this.plot;
  }

  end() {
    const P = this.plot;
    let y = (P ? P.y + P.h + this.m.b : this.y) + 4;
    const foot = [this.cfg.foot, ...(this.notes || [])].map(s => String(s || '').trim()).filter(Boolean).map(s => (/[.!?)]$/.test(s) ? s : s + '.')).join(' ');
    if (foot) {
      for (const ln of wrap(foot, this.w - 2 * PADX, S.note)) {
        y += S.note + 3; this.add(T(PADX, y, ln, { size: S.note, fill: CH.ink2 }));
      }
      y += 2;
    }
    y += 8;
    this.h = Math.ceil(y);
    this.svg.setAttribute('height', this.h);
    this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    this.bg.setAttribute('width', this.w); this.bg.setAttribute('height', this.h);
    return this.svg;
  }
}

/* ---------- axes ---------- */
function yAxisDraw(f, P, sc, tk, fmt, o = {}) {
  const g = [];
  const lo = sc(tk.ticks[0]), hi = sc(tk.ticks[tk.ticks.length - 1]);
  g.push(el('path', { d: `M${P.x},${Math.min(lo, hi)}V${Math.max(lo, hi, P.y + P.h)}`, stroke: CH.axis, 'stroke-width': .9, fill: 'none' }));
  for (const v of tk.ticks) {
    const y = sc(v);
    g.push(el('path', { d: `M${P.x - 3.5},${y}H${P.x}`, stroke: CH.axis, 'stroke-width': .9 }));
    g.push(T(P.x - 7, y, fmt(v), { anchor: 'end', base: 'central', fill: CH.ink }));
  }
  if (o.label) g.push(T(PADX + S.label * .8, P.y + P.h / 2, o.label, { anchor: 'middle', size: S.label, rot: -90 }));
  f.add(...g);
}
function xAxisLine(f, P) { f.add(el('path', { d: `M${P.x},${P.y + P.h}H${P.x + P.w}`, stroke: CH.axis, 'stroke-width': .9 })); }

function leftMargin(tk, fmt, hasLabel) {
  return PADX + (hasLabel ? S.label + 10 : 0) + Math.max(...tk.ticks.map(v => tw(fmt(v), S.tick))) + 10;
}

/* Vertical frame: categories on x, numbers on y. Returns helpers for marks. */
function frameV(f, o) {
  const tk = niceTicks(o.min, o.max, o.n || 5), fmt = o.fmt || tickFmt(tk.step);
  let l = leftMargin(tk, fmt, !!o.yLabel); const r = PADX + 4, n = o.cats.length;
  let bw = (f.w - l - r) / n;
  let lines = o.cats.map(c => wrap(c, bw - 6, S.tick)), rot = 0;
  if (Math.max(...lines.map(a => a.length)) > 3 || Math.max(...o.cats.map(c => tw(c, S.tick))) > bw * 1.4 && n > 6) { rot = -40; lines = o.cats.map(c => [String(c)]); }
  const maxLab = Math.max(...o.cats.map(c => tw(c, S.tick)));
  if (rot) {                                   // keep the first rotated label inside the figure
    const need = tw(o.cats[0], S.tick) * Math.cos(Math.PI * 40 / 180) + 6 - bw / 2;
    if (need > l) { l = need; bw = (f.w - l - r) / n; }
  }
  const labH = rot ? Math.sin(Math.PI * 40 / 180) * maxLab + 10 : Math.max(...lines.map(a => a.length)) * (S.tick + 2) + 6;
  const b = labH + (o.xLabel ? S.label + 8 : 2);
  const P = f.begin(o.h, { l, r, b });
  const y = linear(tk.lo, tk.hi, P.y + P.h, P.y);
  yAxisDraw(f, P, y, tk, fmt, { label: o.yLabel });
  xAxisLine(f, P);
  const cx = i => P.x + bw * (i + .5);
  o.cats.forEach((c, i) => {
    const X = cx(i);
    f.add(el('path', { d: `M${X},${P.y + P.h}v3.5`, stroke: CH.axis, 'stroke-width': .9 }));
    if (rot) f.add(T(X + 3, P.y + P.h + 9, c, { anchor: 'end', fill: CH.ink, rot, base: 'hanging' }));
    else lines[i].forEach((ln, k) => f.add(T(X, P.y + P.h + 6 + (k + 1) * (S.tick + 1) - 1, ln, { anchor: 'middle', fill: CH.ink })));
  });
  if (o.xLabel) f.add(T(P.x + P.w / 2, P.y + P.h + b - 3, o.xLabel, { anchor: 'middle', size: S.label }));
  return { P, y, cx, bw, tk, fmt };
}

/* Horizontal frame: categories down the left, numbers along x. */
function frameH(f, o) {
  const tk = niceTicks(o.min, o.max, o.n || 5), fmt = o.fmt || tickFmt(tk.step);
  const maxLabW = Math.min(f.w * .38, Math.max(...o.cats.map(c => tw(c, S.tick))) + 2);
  const lines = o.cats.map(c => wrap(c, maxLabW, S.tick));
  const lw = Math.max(...lines.map(a => Math.max(...a.map(s => tw(s, S.tick)))));
  const l = PADX + (o.yLabel ? S.label + 10 : 0) + lw + 10, r = PADX + (o.rpad || 6);
  const b = 6 + S.tick + 4 + (o.xLabel ? S.label + 8 : 2);
  const P = f.begin(o.h, { l, r, b });
  const x = linear(tk.lo, tk.hi, P.x, P.x + P.w), bh = P.h / o.cats.length;
  f.add(el('path', { d: `M${P.x},${P.y + P.h}H${P.x + P.w}`, stroke: CH.axis, 'stroke-width': .9 }), el('path', { d: `M${P.x},${P.y}V${P.y + P.h}`, stroke: CH.axis, 'stroke-width': .9 }));
  for (const v of tk.ticks) {
    f.add(el('path', { d: `M${x(v)},${P.y + P.h}v3.5`, stroke: CH.axis, 'stroke-width': .9 }),
      T(x(v), P.y + P.h + 6 + S.tick - 1, fmt(v), { anchor: 'middle', fill: CH.ink }));
    if (v === 0 && o.zero !== false && x(v) > P.x + 1) f.add(el('path', { d: `M${x(v)},${P.y}V${P.y + P.h}`, stroke: CH.axis, 'stroke-width': .9 }));
  }
  const cy = i => P.y + bh * (i + .5);
  o.cats.forEach((c, i) => lines[i].forEach((ln, k) =>
    f.add(T(P.x - 8, cy(i) + (k - (lines[i].length - 1) / 2) * (S.tick + 1), ln, { anchor: 'end', base: 'central', fill: CH.ink }))));
  if (o.xLabel) f.add(T(P.x + P.w / 2, P.y + P.h + b - 3, o.xLabel, { anchor: 'middle', size: S.label }));
  if (o.yLabel) f.add(T(PADX + S.label * .8, P.y + P.h / 2, o.yLabel, { anchor: 'middle', size: S.label, rot: -90 }));
  return { P, x, cy, bh, tk, fmt };
}

