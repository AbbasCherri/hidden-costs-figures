/* charts-c.js - Scatter */
'use strict';

function scatterAxes(rows) {
  const lab = new Map();
  rows.forEach(r => { if (!lab.has(r.x_value)) lab.set(r.x_value, r.x_label == null ? String(r.x_value) : String(r.x_label)); });
  const codes = [...lab.keys()].sort((a, b) => a - b);
  const cat = codes.length <= 8 && codes.some(c => lab.get(c) !== String(c) && isNaN(+lab.get(c)));
  const ys = rows.map(r => r.y_value), xs = rows.map(r => r.x_value);
  const yr = Math.max(...ys) - Math.min(...ys) || 1, xr = Math.max(...xs) - Math.min(...xs) || 1;
  return { cat, codes, cats: codes.map(c => lab.get(c)), nx: codes.length,
    ymin: Math.min(...ys) - yr * .05, ymax: Math.max(...ys) + yr * .05,
    xmin: Math.min(...xs) - xr * .04, xmax: Math.max(...xs) + xr * .04 };
}

/* draw one scatter panel into figure f. groups: [{name, i, pts:[{x,y}]}] */
function scatterPanel(f, spec, groups, o, v, h, xLabel, yLabel) {
  const colorBy = v === 'groups' || v === 'facets', trend = v === 'trend' || (colorBy && o.trend);
  let px, py, unit, P;
  if (spec.cat) {
    const F = frameV(f, { cats: spec.cats, min: spec.ymin, max: spec.ymax, h, xLabel, yLabel });
    const at = new Map(spec.codes.map((c, i) => [c, i]));
    px = c => F.cx(at.get(c)); py = F.y; unit = F.bw; P = F.P;
    if (spec.nx > 1) { const lin = linear(spec.codes[0], spec.codes[spec.nx - 1], F.cx(0), F.cx(spec.nx - 1)); px = c => (at.has(c) ? F.cx(at.get(c)) : lin(c)); }
  } else {
    const F = frameXY(f, { xmin: spec.xmin, xmax: spec.xmax, ymin: spec.ymin, ymax: spec.ymax, h, xLabel, yLabel });
    px = F.x; py = F.y; P = F.P; unit = P.w / Math.max(1, spec.nx);
  }
  const jw = o.jitter ? (spec.cat ? unit * .26 : (spec.nx <= 12 ? unit * .18 : 0)) : 0, rnd = rng(11);
  groups.forEach(g => {
    const col = colorBy ? gcol(g.i) : CH.primary;
    if (trend && g.pts.length > 3) {
      const m = ols(g.pts.map(p => p.x), g.pts.map(p => p.y)), t = tinv(.975, Math.max(1, m.n - 2));
      const xs = g.pts.map(p => p.x), lo = Math.min(...xs), hi = Math.max(...xs), N = 40, up = [], dn = [];
      const cl = y => clamp(py(y), P.y, P.y + P.h);
      for (let k = 0; k <= N; k++) {
        const x = lo + (hi - lo) * k / N, yh = m.a + m.b * x, se = m.se * Math.sqrt(1 / m.n + (x - m.mx) ** 2 / m.sxx) * t;
        up.push([px(x), cl(yh + se)]); dn.push([px(x), cl(yh - se)]);
      }
      f.add(el('path', { d: 'M' + up.map(p => p.join(',')).join('L') + 'L' + dn.reverse().map(p => p.join(',')).join('L') + 'Z', fill: col, 'fill-opacity': .15 }),
        el('path', { d: `M${px(lo)},${cl(m.a + m.b * lo)}L${px(hi)},${cl(m.a + m.b * hi)}`, stroke: col, 'stroke-width': 2.2, fill: 'none' }));
    }
  });
  groups.forEach(g => g.pts.forEach(p => {
    const col = colorBy ? gcol(g.i) : CH.primary, jx = jw ? (rnd() - .5) * 2 * jw : 0;
    f.add(markEl(colorBy ? g.i : 0, px(p.x) + jx, py(p.y), 3.3, { fill: col, 'fill-opacity': .62, stroke: CH.surf, 'stroke-width': .6 }));
  }));
  return { P, px, py };
}

CHARTS.scatter = {
  variants: [
    { id: 'points', label: 'Points' }, { id: 'trend', label: 'Points with trend line' },
    { id: 'groups', label: 'Colour and shape by group' }, { id: 'facets', label: 'Small multiples by group' }],
  options: [
    { id: 'stats', label: 'Show Spearman ρ and n', kind: 'toggle', def: true },
    { id: 'trend', label: 'Trend lines (group views)', kind: 'toggle', def: true },
    { id: 'jitter', label: 'Jitter discrete values', kind: 'toggle', def: true }],
  useSheetY: true,
  auto: (d, s, o) => ({ x: s.x || '', y: s.y || '', foot: s.foot || `n = ${d.rows.length} respondents` }),
  draw(f, d, v, o) {
    const rows = d.rows.filter(r => num(r.x_value) && num(r.y_value));
    if (!rows.length) throw new Error('This scatter table has no numeric x and y values.');
    const spec = scatterAxes(rows), gname = r => String(r.group_label == null ? 'All respondents' : r.group_label);
    const names = [...new Set(rows.map(gname))];
    const groups = names.map((n, i) => ({ name: n, i, pts: rows.filter(r => gname(r) === n).map(r => ({ x: r.x_value, y: r.y_value })) }));
    const pooled = [{ name: 'All', i: 0, pts: rows.map(r => ({ x: r.x_value, y: r.y_value })) }];
    const stat = pts => { const s = spearman(pts.map(p => p.x), pts.map(p => p.y)); return s ? `ρ = ${s.rho.toFixed(2).replace(/^(-?)0/, '$1').replace('-', '−')}, ${pTxt(s.p)}, n = ${s.n}` : `n = ${pts.length}`; };
    const multi = names.length > 1;
    let trendShown = v === 'trend';
    if ((v === 'groups' || v === 'facets') && multi) {
      trendShown = !!o.trend;
      if (v === 'groups') {
        f.legend(groups.map(g => ({ label: o.stats ? `${g.name} (${stat(g.pts)})` : g.name, color: gcol(g.i), kind: 'mark', shape: g.i })));
        scatterPanel(f, spec, groups, o, 'groups', plotH(f.w, .66), f.cfg.x, f.cfg.y);
      } else {
        const cols = Math.min(groups.length, f.w >= 480 ? 3 : 2), lp = f.cfg.y ? S.label + 12 : 0, pw = (f.w - lp) / cols, y0 = f.y;
        const subs = groups.map(g => {
          const sub = new Fig(pw, {});
          sub.add(T(PADX, sub.y + S.legend, `${g.name} (n=${g.pts.length})`, { weight: 'bold', size: S.legend })); sub.y += S.legend + 8;
          const R = scatterPanel(sub, spec, [g], o, 'facets', Math.round(pw * .62), null, null);
          if (o.stats) sub.add(T(R.P.x + 6, R.P.y + 13, stat(g.pts), { size: S.note, fill: CH.ink }));
          sub.end(); return sub;
        });
        const rowH = Math.max(...subs.map(s => s.h)), rowsN = Math.ceil(groups.length / cols);
        subs.forEach((sub, k) => {
          sub.svg.setAttribute('x', lp + (k % cols) * pw); sub.svg.setAttribute('y', y0 + Math.floor(k / cols) * rowH);
          f.add(sub.svg);
        });
        f.y = y0 + rowsN * rowH;
        f.begin(0, { l: 0, r: 0, b: f.cfg.x ? S.label + 10 : 2, t: 0 });
        if (f.cfg.x) f.add(T(f.w / 2 + lp / 2, f.plot.y + S.label + 2, f.cfg.x, { anchor: 'middle', size: S.label }));
        if (f.cfg.y) f.add(T(PADX + S.label * .8, y0 + rowsN * rowH / 2, f.cfg.y, { anchor: 'middle', size: S.label, rot: -90 }));
      }
    } else {
      const R = scatterPanel(f, spec, pooled, o, v === 'trend' ? 'trend' : 'points', plotH(f.w, .66), f.cfg.x, f.cfg.y);
      if (o.stats) f.add(T(R.P.x + 8, R.P.y + 14, stat(pooled[0].pts), { size: S.val, fill: CH.ink }));
    }
    if (o.jitter && (spec.cat || spec.nx <= 12)) f.notes.push('Points are jittered horizontally to show overlapping responses.');
    if (trendShown) f.notes.push('Line: linear fit; band: 95% CI.');
  },
};

