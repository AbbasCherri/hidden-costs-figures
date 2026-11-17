/* charts-a.js - Bar / Pie and Histogram */
'use strict';

/* ------------------------------------------------------------ 1 · BAR / PIE */
function barItems(d, o) {
  const it = d.rows.map(r => ({ label: String(r.category), count: +r.count || 0, pct: +r.percent || 0 }));
  if (o.sort === 'desc') it.sort((a, b) => b.count - a.count);
  for (const r of it) { r.v = o.value === 'count' ? r.count : r.pct; r.txt = o.value === 'count' ? intTxt(r.v) : pctTxt(r.v); }
  return it;
}
const shade = (i, n, o) => (o.hue === 'cat' ? gcol(i) : ramp([CH.tintL, CH.primary, CH.deep], n > 1 ? i / (n - 1) : .5));
/* fill for one category of a single-series chart: one blue, or a distinct colour each */
const catFill = (f, i, o) => groupFill(f, i, o.hue === 'cat' ? gcol(i) : CH.primary);
const catCol = (i, o) => (o.hue === 'cat' ? gcol(i) : CH.primary);

function donutChart(f, it, o) {
  const tot = sum(it.map(r => r.count)) || 1, w = f.w;
  const labW = clamp(w * .3, 70, 150), R = Math.max(40, Math.min(115, (w / 2 - labW - 14) / 1.25)), r0 = R * .58;
  const P = f.begin(R * 2.7, { l: PADX, r: PADX, b: 4 }), cx = w / 2, cy = P.y + P.h / 2;
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  let acc = -Math.PI / 2; const sides = { L: [], R: [] };
  it.forEach((r, i) => {
    const a0 = acc, a1 = acc + Math.min(2 * Math.PI - 1e-4, r.count / tot * 2 * Math.PI), lg = a1 - a0 > Math.PI ? 1 : 0;
    acc = a1;
    const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
    f.add(el('path', { d: `M${x0},${y0}A${R},${R} 0 ${lg} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${lg} 0 ${x3},${y3}Z`, fill: groupFill(f, i, shade(i, it.length, o)), stroke: CH.surf, 'stroke-width': 1.5 }));
    const m = (a0 + a1) / 2, side = Math.cos(m) >= 0 ? 'R' : 'L';
    sides[side].push({ r, m, side, y: cy + (R + 14) * Math.sin(m), lines: [...wrap(r.label, labW, S.tick), r.txt] });
  });
  for (const k of ['L', 'R']) {
    const arr = sides[k]; if (!arr.length) continue;
    const gap = Math.max(...arr.map(a => a.lines.length)) * (S.tick + 1) + 3;
    spread(arr, gap, P.y + gap / 2, P.y + P.h - gap / 2);
    for (const a of arr) {
      const sx = k === 'R' ? 1 : -1, [ax, ay] = pt(R, a.m), [bx, by] = pt(R * 1.1, a.m), tx = cx + sx * (R * 1.1 + 12);
      f.add(el('path', { d: `M${ax},${ay}L${bx},${by}L${tx - sx * 3},${a.y}`, fill: 'none', stroke: CH.ink2, 'stroke-width': .8 }));
      a.lines.forEach((ln, j) => f.add(T(tx, a.y + (j - (a.lines.length - 1) / 2) * (S.tick + 1), ln,
        { anchor: k === 'R' ? 'start' : 'end', base: 'central', weight: j === a.lines.length - 1 ? 'bold' : 'normal' })));
    }
  }
  f.add(T(cx, cy - 3, 'n', { anchor: 'middle', fill: CH.ink2, size: S.tick, italic: true }), T(cx, cy + 12, intTxt(tot), { anchor: 'middle', size: 15, weight: 'bold' }));
}

function stackBarChart(f, it, o) {
  const tot = sum(it.map(r => r.count)) || 1;
  f.legend(it.map((r, i) => ({ label: `${r.label} · ${pctTxt(r.count / tot * 100)}`, color: shade(i, it.length, o), fill: groupFill(f, i, shade(i, it.length, o)) })));
  const P = f.begin(42, { l: PADX + 2, r: PADX + 2, b: 8, t: 6 }), x = linear(0, 100, P.x, P.x + P.w);
  let acc = 0;
  it.forEach((r, i) => {
    const s = r.count / tot * 100, base = shade(i, it.length, o), fill = groupFill(f, i, base), t = (s < 10 ? s.toFixed(1) : s.toFixed(0)) + '%';
    f.add(el('rect', { x: x(acc), y: P.y, width: Math.max(0, x(acc + s) - x(acc)), height: P.h, fill, stroke: CH.surf, 'stroke-width': 1.5 }));
    if (o.labels && x(acc + s) - x(acc) > tw(t, S.val, 'bold') + 8) f.add(T((x(acc) + x(acc + s)) / 2, P.y + P.h / 2, t, { anchor: 'middle', base: 'central', size: S.val, weight: 'bold', fill: textOn(base) }));
    acc += s;
  });
}

CHARTS.bar = {
  hue: true,
  variants: [
    { id: 'bars', label: 'Vertical bars' }, { id: 'hbars', label: 'Horizontal bars' },
    { id: 'lolli', label: 'Lollipop' }, { id: 'donut', label: 'Donut' }, { id: 'stack', label: 'Single stacked bar' }],
  options: [
    { id: 'value', label: 'Values', choices: [['percent', 'Percent'], ['count', 'Count']], def: 'percent' },
    { id: 'sort', label: 'Order', choices: [['asis', 'As in sheet'], ['desc', 'Largest first']], def: 'asis' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: true }],
  auto: (d, s, o) => ({ x: s.x || '', y: o.value === 'count' ? 'Respondents (count)' : 'Respondents (%)', foot: `n = ${sum(d.rows.map(r => +r.count || 0))} respondents` }),
  draw(f, d, v, o) {
    const it = barItems(d, o), horiz = v === 'hbars' || v === 'lolli';
    if (v === 'donut') return donutChart(f, it, o);
    if (v === 'stack') return stackBarChart(f, it, o);
    const max = Math.max(...it.map(r => r.v), 1), cats = it.map(r => r.label);
    if (!horiz) {
      const F = frameV(f, { cats, min: 0, max: max * 1.1, h: plotH(f.w, .6), xLabel: f.cfg.x, yLabel: f.cfg.y });
      it.forEach((r, i) => {
        const bw = Math.min(F.bw * .58, 54);
        f.add(rbar(F.cx(i) - bw / 2, F.y(r.v), bw, F.y(0) - F.y(r.v), 'up', catFill(f, i, o)));
        if (o.labels) f.add(T(F.cx(i), F.y(r.v) - 5, r.txt, { anchor: 'middle', size: S.val }));
      });
      return;
    }
    const F = frameH(f, { cats, min: 0, max: max * 1.12, h: clamp(it.length * 30, 110, 560), xLabel: f.cfg.y, yLabel: f.cfg.x, rpad: 34 });
    it.forEach((r, i) => {
      const y = F.cy(i);
      if (v === 'hbars') { const bh = Math.min(F.bh * .62, 26); f.add(rbar(F.x(0), y - bh / 2, F.x(r.v) - F.x(0), bh, 'right', catFill(f, i, o))); }
      else f.add(el('path', { d: `M${F.x(0)},${y}H${F.x(r.v)}`, stroke: catCol(i, o), 'stroke-width': 2 }), el('circle', { cx: F.x(r.v), cy: y, r: 5.5, fill: catCol(i, o), stroke: CH.surf, 'stroke-width': 1.5 }));
      if (o.labels) f.add(T(F.x(r.v) + (v === 'lolli' ? 10 : 6), y, r.txt, { base: 'central', size: S.val }));
    });
  },
};

/* ------------------------------------------------------------ 2 · HISTOGRAM */
CHARTS.hist = {
  hue: true,
  variants: [{ id: 'bars', label: 'Bars' }, { id: 'step', label: 'Outline' }, { id: 'cum', label: 'Cumulative line' }],
  options: [
    { id: 'value', label: 'Values', choices: [['count', 'Count'], ['percent', 'Percent']], def: 'count' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: false }],
  auto: (d, s, o) => ({ x: s.x || '', y: o.value === 'percent' ? 'Respondents (%)' : 'Respondents (count)', foot: `n = ${sum(d.rows.map(r => +r.count || 0))} respondents` }),
  draw(f, d, v, o) {
    const rows = d.rows.map(r => ({ label: String(r.bin_label), c: +r.count || 0, p: +r.percent || 0, cum: +r.cumulative_percent || 0 }));
    const val = r => (o.value === 'percent' ? r.p : r.c), txt = r => (o.value === 'percent' ? pctTxt(r.p) : intTxt(r.c));
    const cats = rows.map(r => r.label), h = plotH(f.w, .6);
    if (v === 'cum') {
      const F = frameV(f, { cats, min: 0, max: 100, n: 5, h, xLabel: f.cfg.x, yLabel: 'Cumulative respondents (%)' });
      f.add(el('path', { d: rows.map((r, i) => `${i ? 'L' : 'M'}${F.cx(i)},${F.y(r.cum)}`).join(''), fill: 'none', stroke: CH.primary, 'stroke-width': 2 }));
      rows.forEach((r, i) => {
        f.add(el('circle', { cx: F.cx(i), cy: F.y(r.cum), r: 3.8, fill: CH.primary, stroke: CH.surf, 'stroke-width': 1.5 }));
        if (o.labels) f.add(T(F.cx(i), F.y(r.cum) - 8, pctTxt(r.cum), { anchor: 'middle', size: S.val }));
      });
      return;
    }
    const max = Math.max(...rows.map(val), 1);
    const F = frameV(f, { cats, min: 0, max: max * 1.1, h, xLabel: f.cfg.x, yLabel: f.cfg.y });
    if (v === 'bars') {
      rows.forEach((r, i) => {
        f.add(el('rect', { x: F.cx(i) - F.bw * .47, y: F.y(val(r)), width: F.bw * .94, height: F.y(0) - F.y(val(r)), fill: catFill(f, i, o), stroke: CH.surf, 'stroke-width': 1 }));
        if (o.labels) f.add(T(F.cx(i), F.y(val(r)) - 5, txt(r), { anchor: 'middle', size: S.val }));
      });
    } else {
      let dd = `M${F.cx(0) - F.bw / 2},${F.y(0)}`;
      rows.forEach((r, i) => { dd += `L${F.cx(i) - F.bw / 2},${F.y(val(r))}L${F.cx(i) + F.bw / 2},${F.y(val(r))}`; });
      dd += `L${F.cx(rows.length - 1) + F.bw / 2},${F.y(0)}`;
      f.add(el('path', { d: dd + 'Z', fill: CH.tintL, 'fill-opacity': .55, stroke: 'none' }), el('path', { d: dd, fill: 'none', stroke: CH.primary, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      if (o.labels) rows.forEach((r, i) => f.add(T(F.cx(i), F.y(val(r)) - 5, txt(r), { anchor: 'middle', size: S.val })));
    }
  },
};

