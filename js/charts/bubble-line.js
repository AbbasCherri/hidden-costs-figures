/* charts-d.js - Bubble / heatmap and Line (responses over time) */
'use strict';

/* ------------------------------------------------------------ 7 · BUBBLE / HEATMAP */
CHARTS.bubble = {
  variants: [{ id: 'bubble', label: 'Bubbles' }, { id: 'heat', label: 'Heatmap' }],
  options: [
    { id: 'value', label: 'Values', choices: [['count', 'Count'], ['percent', '% of respondents']], def: 'count' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: true }],
  useSheetY: true,
  auto: (d, s, o) => ({ x: s.x || '', y: s.y || '', foot: s.foot || `n = ${sum(d.rows.map(r => +r.count || 0))} respondents` }),
  draw(f, d, v, o) {
    const kx = r => (r.x_value == null ? r.x_label : r.x_value), ky = r => (r.y_value == null ? r.y_label : r.y_value);
    const xl = new Map(), yl = new Map(), cell = new Map();
    d.rows.forEach(r => { xl.set(kx(r), String(r.x_label)); yl.set(ky(r), String(r.y_label)); cell.set(kx(r) + '\u0001' + ky(r), r); });
    const order = m => [...m.keys()].sort((a, b) => (num(a) && num(b) ? a - b : 0));
    const xk = order(xl), yk = order(yl).reverse();                 // y ascends upward
    const val = r => (r ? (o.value === 'percent' ? +r.percent || 0 : +r.count || 0) : 0);
    const txt = x => (o.value === 'percent' ? `${x.toFixed(0)}%` : intTxt(x));
    const max = Math.max(...d.rows.map(val), 1), h = clamp(yk.length * 34 + 30, 150, 560);
    const spec = { xs: xk.map(k => xl.get(k)), ys: yk.map(k => yl.get(k)), h, xLabel: f.cfg.x, yLabel: f.cfg.y };
    if (v === 'bubble') {
      const probe = frameGrid(new Fig(f.w, {}), spec), rmax = Math.min(probe.cw, probe.ch) * .46;
      const refs = [...new Set([Math.max(1, Math.round(max / 10)), Math.max(1, Math.round(max / 3)), Math.round(max)])].sort((a, b) => a - b);
      let x = PADX; const cy = f.y + rmax + 2;
      f.add(T(x, cy, o.value === 'percent' ? 'Share:' : 'Count:', { size: S.legend, weight: 'bold', base: 'central' })); x += 48;
      refs.forEach(rv => {
        const r = rmax * Math.sqrt(rv / max);
        f.add(el('circle', { cx: x + r, cy, r, fill: CH.primary, 'fill-opacity': .85 }), T(x + 2 * r + 5, cy, txt(rv), { size: S.legend, base: 'central' })); x += 2 * r + 14 + tw(txt(rv), S.legend);
      });
      f.y += rmax * 2 + 10;
    }
    const G = frameGrid(f, spec);
    if (v === 'bubble') {
      const rmax = Math.min(G.cw, G.ch) * .46;
      xk.forEach((_, j) => f.add(el('path', { d: `M${G.cx(j)},${G.P.y}V${G.P.y + G.P.h}`, stroke: CH.grid, 'stroke-width': .8 })));
      yk.forEach((_, i) => f.add(el('path', { d: `M${G.P.x},${G.cy(i)}H${G.P.x + G.P.w}`, stroke: CH.grid, 'stroke-width': .8 })));
      yk.forEach((y, i) => xk.forEach((x, j) => {
        const r = cell.get(x + '\u0001' + y), vv = val(r); if (!vv) return;
        const rr = rmax * Math.sqrt(vv / max);
        f.add(el('circle', { cx: G.cx(j), cy: G.cy(i), r: rr, fill: CH.primary, 'fill-opacity': .85, stroke: CH.surf, 'stroke-width': 1.2 }));
        if (o.labels && rr > 8) f.add(T(G.cx(j), G.cy(i), txt(vv), { anchor: 'middle', base: 'central', size: S.val - 1, fill: '#fff', weight: 'bold' }));
      }));
      f.notes.push('Bubble area is proportional to the value.');
    } else {
      yk.forEach((y, i) => xk.forEach((x, j) => {
        const vv = val(cell.get(x + '\u0001' + y)), fill = vv ? ramp(CH.seq, vv / max) : '#f7f7f5';
        f.add(el('rect', { x: G.P.x + j * G.cw, y: G.P.y + i * G.ch, width: G.cw, height: G.ch, fill, stroke: CH.surf, 'stroke-width': 2 }));
        if (o.labels) f.add(T(G.cx(j), G.cy(i), txt(vv), { anchor: 'middle', base: 'central', size: S.val, fill: vv ? textOn(fill) : '#b5b3ad' }));
      }));
      f.notes.push('Darker cells = more respondents.');
    }
  },
};

/* ------------------------------------------------------------ 8 · LINE (TIME) */
const DAY = 864e5, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function toDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY;
  const t = Date.parse(s); return isNaN(t) ? NaN : Math.floor(t / DAY);
}
function dayLabel(n, step) { const d = new Date(n * DAY); return step >= 60 ? `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; }

CHARTS.line = {
  variants: [{ id: 'daily', label: 'Daily responses (bars)' }, { id: 'cum', label: 'Cumulative (lines)' }, { id: 'mean', label: 'Mean of Y by day' }],
  options: [
    { id: 'series', label: 'Series', choices: [['both', 'Recorded and eligible'], ['rec', 'Recorded only'], ['elig', 'Eligible only']], def: 'both' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: false }],
  auto: (d, s, o) => ({ x: 'Date', y: '', foot: s.foot || '' }),
  draw(f, d, v, o) {
    const rows = d.rows.map(r => ({ ...r, t: toDay(r.date) })).filter(r => isFinite(r.t)).sort((a, b) => a.t - b.t);
    if (!rows.length) throw new Error('Could not read the dates in this table.');
    const t0 = rows[0].t, t1 = rows[rows.length - 1].t, span = Math.max(1, t1 - t0), maxT = f.w < 400 ? 5 : 8;
    const step = [1, 2, 3, 5, 7, 14, 30, 61, 91, 182, 365].find(s => Math.ceil(span / s) + 1 <= maxT) || 365;
    const xticks = []; for (let t = t0; t <= t1 + 1e-9; t += step) xticks.push({ v: t, label: dayLabel(t, step) });
    const xmin = t0 - .6, xmax = t1 + .6, ser = [];
    const defs = { rec: { name: 'Recorded', col: gcol(0), k: 'recorded', c: 'cumulative_recorded' }, elig: { name: 'Eligible', col: gcol(1), k: 'eligible', c: 'cumulative_eligible' } };
    if (v !== 'mean') (o.series === 'both' ? ['rec', 'elig'] : [o.series]).forEach(k => ser.push(defs[k]));
    const yearTxt = new Date(t0 * DAY).getUTCFullYear() === new Date(t1 * DAY).getUTCFullYear() && step < 60 ? ` (${new Date(t0 * DAY).getUTCFullYear()})` : '';
    const xLabel = (f.cfg.x || 'Date') + (f.cfg.x === 'Date' || !f.cfg.x ? yearTxt : '');
    const h = plotH(f.w, .55);
    if (v === 'mean') {
      const pts = rows.filter(r => num(r.mean_of_y)), ys = pts.map(r => r.mean_of_y), pad = (Math.max(...ys) - Math.min(...ys)) * .12 || 1;
      const F = frameXY(f, { xmin, xmax, ymin: Math.min(...ys) - pad, ymax: Math.max(...ys) + pad, h, xLabel, yLabel: f.cfg.y || 'Mean of Y', xticks });
      f.add(el('path', { d: pts.map((r, i) => `${i ? 'L' : 'M'}${F.x(r.t)},${F.y(r.mean_of_y)}`).join(''), fill: 'none', stroke: CH.primary, 'stroke-width': 2 }));
      pts.forEach(r => {
        f.add(el('circle', { cx: F.x(r.t), cy: F.y(r.mean_of_y), r: 3.8, fill: CH.primary, stroke: CH.surf, 'stroke-width': 1.4 }));
        if (o.labels) f.add(T(F.x(r.t), F.y(r.mean_of_y) - 8, f1(r.mean_of_y), { anchor: 'middle', size: S.val }));
      });
      return;
    }
    if (ser.length > 1) f.legend(ser.map(s => ({ label: s.name, color: s.col, kind: v === 'cum' ? 'line' : null })));
    const key = s => (v === 'cum' ? s.c : s.k), ymax = Math.max(...rows.flatMap(r => ser.map(s => +r[key(s)] || 0)), 1);
    const F = frameXY(f, { xmin, xmax, ymin: 0, ymax: ymax * 1.1, h, xLabel, yLabel: v === 'cum' ? 'Cumulative responses' : 'Responses per day', xticks });
    const pxDay = F.P.w / (xmax - xmin);
    if (v === 'daily') {
      const bw = Math.min(pxDay * .8 / ser.length, 30);
      rows.forEach(r => ser.forEach((s, j) => {
        const val = +r[key(s)] || 0, x = F.x(r.t) - bw * ser.length / 2 + j * bw;
        f.add(rbar(x + .5, F.y(val), bw - 1, F.y(0) - F.y(val), 'up', s.col));
        if (o.labels && val) f.add(T(x + bw / 2, F.y(val) - 4, intTxt(val), { anchor: 'middle', size: S.val - 1 }));
      }));
    } else {
      ser.forEach(s => {
        f.add(el('path', { d: rows.map((r, i) => `${i ? 'L' : 'M'}${F.x(r.t)},${F.y(+r[key(s)] || 0)}`).join(''), fill: 'none', stroke: s.col, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
        if (rows.length <= 40) rows.forEach(r => f.add(el('circle', { cx: F.x(r.t), cy: F.y(+r[key(s)] || 0), r: 3.4, fill: s.col, stroke: CH.surf, 'stroke-width': 1.2 })));
        const last = rows[rows.length - 1];
        if (o.labels) f.add(T(F.x(last.t) - 6, F.y(+last[key(s)] || 0) - 9, intTxt(+last[key(s)] || 0), { anchor: 'end', size: S.val, weight: 'bold' }));
      });
    }
  },
};

