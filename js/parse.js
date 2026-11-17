/* parse.js - turn whatever the researcher gives us into {type, headers, rows, settings}.
   Accepts: (1) cells copied from Graph_Maker (the table, or the whole sheet),
            (2) a CSV/TSV file, (3) the workbook itself (.xlsx). */
'use strict';

const TYPE_LIST = [
  { id: 'bar',     name: 'Bar / Pie',          note: 'distribution of one variable' },
  { id: 'hist',    name: 'Histogram',          note: 'binned distribution' },
  { id: 'grouped', name: 'Grouped / stacked',  note: 'X by group' },
  { id: 'meanci',  name: 'Mean by group',      note: 'with 95% CI' },
  { id: 'box',     name: 'Box plot',           note: 'Y by X' },
  { id: 'scatter', name: 'Scatter',            note: 'one row per respondent' },
  { id: 'bubble',  name: 'Bubble / heatmap',   note: 'X × Y with counts' },
  { id: 'line',    name: 'Line',               note: 'responses over time' },
  { id: 'likert',  name: 'Item battery',       note: 'Likert scales' },
  { id: 'corr',    name: 'Correlation heatmap', note: 'Spearman pairs' },
];

function detectType(h) {
  const has = k => h.includes(k);
  if (has('variable_a') && has('rho')) return 'corr';
  if (has('case_id') && has('x_value')) return 'scatter';
  if (has('date') && has('recorded')) return 'line';
  if (h[0] === 'item' && has('mean_code')) return 'likert';
  if (has('q1') && has('median') && has('whisker_low')) return 'box';
  if (has('ci95_low') && has('mean')) return 'meanci';
  if (has('bin_start')) return 'hist';
  if (has('x_label') && has('y_label') && has('count')) return 'bubble';
  if (h[0] === 'category' && has('cumulative_percent')) return 'bar';
  if (h[0] === 'category' && h[h.length - 1] === 'total') return 'grouped';
  return null;
}

/* quote-aware delimited text -> 2-D array (Excel puts newlines inside quoted cells) */
function parseDelimited(text) {
  text = text.replace(/\r\n?/g, '\n');
  const first = text.split('\n', 6).join('\n');
  const d = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === '') q = true;
    else if (c === d) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  row.push(cur); rows.push(row);
  return rows;
}

function coerce(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  v = String(v).trim();
  if (v === '') return null;
  if (/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v)) return Number(v);
  if (/^[-+]?\d+,\d+$/.test(v) && !v.includes('\t')) return Number(v.replace(',', '.'));
  return v;
}

/* find the chart-ready table and the control/suggestion cells around it */
function extract(grid) {
  grid = grid.map(r => r.map(coerce));
  const cell = (r, c) => (grid[r] ? grid[r][c] : null);
  let hdrRow = -1, type = null, hdrs = [];
  for (let r = 0; r < grid.length && hdrRow < 0; r++) {
    const h = [];
    for (const v of grid[r]) { if (v == null) break; h.push(String(v)); }
    const t = h.length >= 3 ? detectType(h) : null;
    if (t) { hdrRow = r; type = t; hdrs = h; }
  }
  if (hdrRow < 0) return null;
  const startCol = 0, rows = [];
  for (let r = hdrRow + 1; r < grid.length; r++) {
    if (grid[r][startCol] == null) break;
    const o = {};
    hdrs.forEach((h, i) => { o[h] = grid[r][i] === undefined ? null : grid[r][i]; });
    rows.push(o);
  }
  const labels = { 'Suggested title': 'title', 'X axis': 'x', 'Y axis': 'y', 'Legend / series': 'legend', 'Footnote': 'foot', 'Graph type': 'graphType', 'Status': 'status' };
  const settings = {};
  for (let r = 0; r < hdrRow; r++) {
    for (let c = 0; c < (grid[r] || []).length; c++) {
      const k = labels[cell(r, c)];
      if (!k) continue;
      for (let j = c + 1; j < grid[r].length; j++) if (grid[r][j] != null) { settings[k] = String(grid[r][j]); break; }
    }
  }
  return { type, headers: hdrs, rows, settings };
}

function fromText(text) {
  const t = extract(parseDelimited(text));
  if (!t) throw new Error('No Graph_Maker table found. Copy the table including its header row (x_category, n, mean …), or the whole Graph_Maker sheet.');
  return t;
}

let _xlsxLoading = null;
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve();
  if (_xlsxLoading) return _xlsxLoading;
  _xlsxLoading = new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = ok; s.onerror = () => { _xlsxLoading = null; no(new Error('The Excel reader could not load. Copy the table from Graph_Maker and paste it here instead.')); };
    document.head.append(s);
  });
  return _xlsxLoading;
}

async function fromFile(file) {
  if (/\.(csv|tsv|txt)$/i.test(file.name)) return fromText(await file.text());
  await loadSheetJS();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const name = wb.SheetNames.find(n => /graph[_ ]?maker/i.test(n));
  if (!name) throw new Error('This workbook has no Graph_Maker sheet. Open the study workbook, or paste the table instead.');
  const ws = wb.Sheets[name];
  ws['!ref'] = 'A1:N620';
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  const t = extract(grid);
  if (!t) throw new Error('Graph_Maker has no calculated table. Open the workbook in Excel, let it recalculate, save it and upload it again.');
  t.source = file.name;
  return t;
}

