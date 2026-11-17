/* chart-kit.js - the CHARTS registry plus frames, pivots and legends shared by the chart files. */
'use strict';
function spread(items, gap, lo, hi) {
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) items[i].y = Math.max(items[i].y, items[i - 1].y + gap);
  const over = items.length ? items[items.length - 1].y - hi : 0;
  if (over > 0) { items[items.length - 1].y = hi; for (let i = items.length - 2; i >= 0; i--) items[i].y = Math.min(items[i].y, items[i + 1].y - gap); }
  for (const it of items) it.y = Math.max(it.y, lo);
  return items;
}

const CHARTS = {};     // id -> { variants, options, auto, draw }
const plotH = (w, k = .6, lo = 150, hi = 340) => clamp(Math.round(w * k * .78), lo, hi);   // landscape plots read better than tall ones

/* Categorical grid (heatmaps, bubbles): labels down the left, along the bottom. */
function frameGrid(f, o) {
  const n = o.xs.length, m = o.ys.length;
  const maxLabW = Math.min(f.w * .34, Math.max(...o.ys.map(c => tw(c, S.tick))) + 2);
  const yl = o.ys.map(c => wrap(c, maxLabW, S.tick));
  const lw = Math.max(...yl.map(a => Math.max(...a.map(s => tw(s, S.tick)))));
  const l = PADX + (o.yLabel ? S.label + 10 : 0) + lw + 10, r = PADX + (o.rpad || 4);
  const cw = (f.w - l - r) / n;
  let xl = o.xs.map(c => wrap(c, cw - 4, S.tick)), rot = 0;
  if (Math.max(...xl.map(a => a.length)) > 3 || (n > 8 && Math.max(...o.xs.map(c => tw(c, S.tick))) > cw * 1.2)) { rot = -40; xl = o.xs.map(c => [String(c)]); }
  const labH = rot ? Math.sin(Math.PI * 40 / 180) * Math.max(...o.xs.map(c => tw(c, S.tick))) + 10 : Math.max(...xl.map(a => a.length)) * (S.tick + 2) + 6;
  const b = labH + (o.xLabel ? S.label + 8 : 2);
  const P = f.begin(o.h, { l, r, b, t: o.t });
  const ch = P.h / m, cx = j => P.x + cw * (j + .5), cy = i => P.y + ch * (i + .5);
  o.xs.forEach((c, j) => {
    if (rot) f.add(T(cx(j) + 3, P.y + P.h + 6, c, { anchor: 'end', fill: CH.ink, rot, base: 'hanging' }));
    else xl[j].forEach((ln, k) => f.add(T(cx(j), P.y + P.h + 6 + (k + 1) * (S.tick + 1) - 1, ln, { anchor: 'middle', fill: CH.ink2 })));
  });
  o.ys.forEach((c, i) => yl[i].forEach((ln, k) => f.add(T(P.x - 8, cy(i) + (k - (yl[i].length - 1) / 2) * (S.tick + 1), ln, { anchor: 'end', base: 'central', fill: CH.ink }))));
  if (o.xLabel) f.add(T(P.x + P.w / 2, P.y + P.h + b - 3, o.xLabel, { anchor: 'middle', size: S.label }));
  if (o.yLabel) f.add(T(PADX + S.label * .8, P.y + P.h / 2, o.yLabel, { anchor: 'middle', size: S.label, rot: -90 }));
  return { P, cw, ch, cx, cy };
}

/* rows -> {cats, grps, get(cat, grp)} for tables with a category and a group column */
function pivot(rows, cKey, gKey) {
  const g = r => String(r[gKey] == null ? 'All respondents' : r[gKey]);
  const cats = [...new Set(rows.map(r => String(r[cKey])))], grps = [...new Set(rows.map(g))];
  const m = new Map(rows.map(r => [String(r[cKey]) + '\u0001' + g(r), r]));
  return { cats, grps, get: (c, gr) => m.get(c + '\u0001' + gr) };
}
const groupLegend = (f, grps, kind) => grps.map((g, i) => ({ label: g, color: gcol(i), fill: kind ? undefined : groupFill(f, i, gcol(i)), kind }));

/* marker shapes for redundant (colour + shape) group coding */
function markEl(s, x, y, r, a) {
  s %= 4;
  if (s === 0) return el('circle', { cx: x, cy: y, r, ...a });
  if (s === 1) return el('rect', { x: x - r * .9, y: y - r * .9, width: r * 1.8, height: r * 1.8, ...a });
  if (s === 2) return el('path', { d: `M${x},${y - r * 1.3}L${x + r * 1.3},${y}L${x},${y + r * 1.3}L${x - r * 1.3},${y}Z`, ...a });
  return el('path', { d: `M${x},${y - r * 1.25}L${x + r * 1.2},${y + r * .95}L${x - r * 1.2},${y + r * .95}Z`, ...a });
}

/* numeric x and y axes. o.xticks = [{v, label}] overrides the automatic x ticks */
function frameXY(f, o) {
  const ty = niceTicks(o.ymin, o.ymax, o.yn || 5), fy = o.yfmt || tickFmt(ty.step);
  let tx = o.xticks ? { ticks: o.xticks.map(t => t.v), lo: o.xmin, hi: o.xmax } : niceTicks(o.xmin, o.xmax, 6);
  const fx = tx.step != null ? tickFmt(tx.step) : null;
  const l = leftMargin(ty, fy, !!o.yLabel), r = PADX + (o.rpad || 10), b = 6 + S.tick + 4 + (o.xLabel ? S.label + 8 : 2);
  const P = f.begin(o.h, { l, r, b, t: o.t });
  const x = linear(tx.lo, tx.hi, P.x, P.x + P.w), y = linear(ty.lo, ty.hi, P.y + P.h, P.y);
  yAxisDraw(f, P, y, ty, fy, { label: o.yLabel, zero: o.yzero });
  xAxisLine(f, P);
  (o.xticks || tx.ticks.map(v => ({ v, label: fx(v) }))).forEach(t => {
    f.add(el('path', { d: `M${x(t.v)},${P.y + P.h}v4`, stroke: CH.ink2, 'stroke-width': .8 }), T(x(t.v), P.y + P.h + 6 + S.tick, t.label, { anchor: 'middle', fill: CH.ink2 }));
  });
  if (o.xLabel) f.add(T(P.x + P.w / 2, P.y + P.h + b - 3, o.xLabel, { anchor: 'middle', size: S.label }));
  return { P, x, y, tx, ty };
}

