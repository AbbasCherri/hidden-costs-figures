/* charts-e.js - Item battery (Likert) and Correlation heatmap */
'use strict';

/* ------------------------------------------------------------ 9 · ITEM BATTERY */
CHARTS.likert = {
  fixedColours: true,   // diverging scales carry meaning, so the palette does not apply
  variants: [
    { id: 'diverge', label: 'Diverging stacked bars' }, { id: 'stack', label: '100% stacked bars' },
    { id: 'means', label: 'Ranked means' }, { id: 'heat', label: 'Heatmap' }],
  options: [
    { id: 'sort', label: 'Order items', choices: [['asis', 'As in sheet'], ['top', 'Highest top-two first'], ['mean', 'Highest mean first']], def: 'asis' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: true }],
  auto: (d, s, o) => {
    const n = d.rows.map(r => +r.n || 0), lo = Math.min(...n), hi = Math.max(...n);
    return { x: '', y: '', foot: s.foot || `n = ${lo === hi ? lo : lo + '–' + hi} respondents per item` };
  },
  draw(f, d, v, o) {
    const cats = d.headers.slice(3), k = cats.length;
    let items = d.rows.map(r => {
      const c = cats.map(x => +r[x] || 0), N = sum(c) || 1;
      return { label: String(r.item), n: r.n, mean: r.mean_code, c, p: c.map(x => x / N * 100) };
    });
    const m0 = items.map(it => sum(it.c.map((x, i) => x * i)) / (sum(it.c) || 1));
    const base = items.every((it, i) => !num(it.mean) || Math.abs(m0[i] - it.mean) < .02) ? 0 : (items.every((it, i) => !num(it.mean) || Math.abs(m0[i] + 1 - it.mean) < .02) ? 1 : 0);
    const top2 = it => sum(it.p.slice(-2));
    const sort = v === 'means' && o.sort === 'asis' ? 'mean' : o.sort;
    if (sort === 'top') items.sort((a, b) => top2(b) - top2(a));
    if (sort === 'mean') items.sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
    const cols = cats.map((_, i) => ramp(CH.lik, k > 1 ? i / (k - 1) : .5)), names = items.map(i => i.label);
    const h = clamp(items.length * 30 + 20, 150, 720), pt = x => `${x.toFixed(0)}`;
    if (v !== 'means') f.legend(cats.map((c, i) => ({ label: c, color: cols[i], fill: groupFill(f, i, cols[i]) })));

    if (v === 'diverge' || v === 'stack') {
      const mid = (k - 1) / 2, ext = it => {
        const neg = sum(it.p.filter((_, i) => i < mid)), neu = k % 2 ? it.p[mid] : 0, pos = sum(it.p.filter((_, i) => i > mid));
        return { neg, neu, pos, left: neg + neu / 2, right: pos + neu / 2 };
      };
      const lim = v === 'diverge' ? Math.max(20, Math.ceil(Math.max(...items.map(it => Math.max(ext(it).left, ext(it).right))) / 20) * 20) : 100;
      const F = frameH(f, { cats: names, min: v === 'diverge' ? -lim : 0, max: lim, h, xLabel: 'Share of respondents (%)', fmt: x => `${Math.abs(x)}%`, rpad: v === 'diverge' ? 62 : 6, n: v === 'diverge' ? Math.min(6, lim / 20 * 2) : 5 });
      const labs = [];
      items.forEach((it, i) => {
        const bh = Math.min(F.bh * .68, 26), e = ext(it);
        let x = v === 'diverge' ? -e.left : 0;
        it.p.forEach((p, j) => {
          f.add(el('rect', { x: F.x(x), y: F.cy(i) - bh / 2, width: Math.max(0, F.x(x + p) - F.x(x)), height: bh, fill: groupFill(f, j, cols[j]), stroke: CH.surf, 'stroke-width': 1.5 }));
          if (o.labels && F.x(x + p) - F.x(x) > tw(pt(p), S.val) + 6) labs.push(T((F.x(x) + F.x(x + p)) / 2, F.cy(i), pt(p), { anchor: 'middle', base: 'central', size: S.val, fill: textOn(cols[j]) }));
          x += p;
        });
        if (v === 'diverge') f.add(T(F.P.x + F.P.w + 8, F.cy(i), `${top2(it).toFixed(0)}%`, { base: 'central', size: S.val, weight: 'bold' }));
      });
      if (v === 'diverge') f.add(el('path', { d: `M${F.x(0)},${F.P.y}V${F.P.y + F.P.h}`, stroke: CH.ink, 'stroke-width': 1 }));   // centre line over the bars
      f.add(...labs);
      if (v === 'diverge') f.add(T(F.P.x + F.P.w + 8, F.P.y - 5, 'Top two', { size: S.note, fill: CH.ink2 }));
      if (v === 'diverge') f.notes.push(k % 2 ? 'Bars are centred on the middle category.' : 'Bars are split at the scale midpoint.');
    } else if (v === 'means') {
      const hi = base + k - 1, F = frameH(f, { cats: names, min: base, max: hi, n: Math.min(8, k - 1), h, xLabel: `Mean response (${base} = ${cats[0]}, ${hi} = ${cats[k - 1]})`, rpad: 38, zero: false });
      const midx = F.x(base + (k - 1) / 2);
      f.add(el('path', { d: `M${midx},${F.P.y}V${F.P.y + F.P.h}`, stroke: CH.ink2, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
      items.forEach((it, i) => {
        if (!num(it.mean)) return;
        f.add(el('path', { d: `M${F.x(base)},${F.cy(i)}H${F.x(it.mean)}`, stroke: CH.tintM, 'stroke-width': 2 }),
          el('circle', { cx: F.x(it.mean), cy: F.cy(i), r: 5.5, fill: CH.primary, stroke: CH.surf, 'stroke-width': 1.5 }));
        if (o.labels) f.add(T(F.x(it.mean) + 10, F.cy(i), f2(it.mean), { base: 'central', size: S.val }));
      });
      f.notes.push('Dashed line: scale midpoint.');
    } else {
      const G = frameGrid(f, { xs: cats, ys: names, h, xLabel: null, yLabel: null });
      const max = Math.max(...items.flatMap(it => it.p), 1);
      items.forEach((it, i) => it.p.forEach((p, j) => {
        const fill = ramp(CH.seq, p / max);
        f.add(el('rect', { x: G.P.x + j * G.cw, y: G.P.y + i * G.ch, width: G.cw, height: G.ch, fill, stroke: CH.surf, 'stroke-width': 2 }));
        if (o.labels) f.add(T(G.cx(j), G.cy(i), `${p.toFixed(0)}%`, { anchor: 'middle', base: 'central', size: S.val, fill: textOn(fill) }));
      }));
      f.notes.push('Cells show the share of respondents; darker = larger.');
    }
  },
};

/* ------------------------------------------------------------ 10 · CORRELATION HEATMAP */
const fmtR = r => r.toFixed(2).replace(/^(-?)0\./, '$1.').replace('-', '−');
const stars = p => (p < .001 ? '***' : p < .01 ? '**' : p < .05 ? '*' : '');

function clusterOrder(R) {
  let cl = R.map((_, i) => [i]);
  const dist = (A, B) => { let s = 0; for (const a of A) for (const b of B) s += 1 - Math.abs(R[a][b] || 0); return s / (A.length * B.length); };
  while (cl.length > 1) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const x = dist(cl[i], cl[j]); if (x < bd) { bd = x; bi = i; bj = j; } }
    cl = cl.filter((_, k) => k !== bi && k !== bj).concat([[...cl[bi], ...cl[bj]]]);
  }
  return cl[0];
}

function colorKey(f) {
  const id = 'cbar';
  const g = el('linearGradient', { id, x1: 0, x2: 1, y1: 0, y2: 0 });
  CH.div.forEach((c, i) => g.append(el('stop', { offset: i / 2, 'stop-color': c })));
  f.defs.append(g);
  const y = f.y + 4, w = 120, x0 = PADX + 64;
  f.add(T(PADX, y + 8, 'Spearman ρ', { size: S.legend, weight: 'bold' }), el('rect', { x: x0, y, width: w, height: 9, fill: `url(#${id})`, stroke: CH.grid }),
    T(x0, y + 22, '−1', { size: S.note, fill: CH.ink2 }), T(x0 + w / 2, y + 22, '0', { size: S.note, fill: CH.ink2, anchor: 'middle' }), T(x0 + w, y + 22, '+1', { size: S.note, fill: CH.ink2, anchor: 'end' }));
  f.y = y + 30;
}

CHARTS.corr = {
  fixedColours: true,   // diverging scales carry meaning, so the palette does not apply
  variants: [
    { id: 'tri', label: 'Triangle with coefficients' }, { id: 'full', label: 'Full matrix' },
    { id: 'circles', label: 'Circle matrix' }, { id: 'ranked', label: 'Strongest pairs (ranked)' }],
  options: [
    { id: 'basis', label: 'Significance stars', choices: [['p', 'Uncorrected p'], ['bonf', 'Bonferroni-adjusted p']], def: 'p' },
    { id: 'order', label: 'Variable order', choices: [['asis', 'As in sheet'], ['cluster', 'Group similar variables']], def: 'asis' },
    { id: 'top', label: 'Pairs shown (ranked)', choices: [['10', 'Top 10'], ['20', 'Top 20'], ['all', 'All']], def: '20' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: true }],
  auto: (d, s, o) => ({ x: '', y: '', foot: s.foot || '' }),
  draw(f, d, v, o) {
    const names = []; d.rows.forEach(r => [r.variable_a, r.variable_b].forEach(x => { x = String(x); if (!names.includes(x)) names.push(x); }));
    const idx = new Map(names.map((x, i) => [x, i])), n = names.length;
    const R = names.map(() => names.map(() => null)), Pm = names.map(() => names.map(() => 1)), N = names.map(() => names.map(() => 0));
    d.rows.forEach(r => {
      const i = idx.get(String(r.variable_a)), j = idx.get(String(r.variable_b)), p = o.basis === 'bonf' ? r.p_bonferroni : r.p_value;
      if (!num(r.rho)) return;
      R[i][j] = R[j][i] = r.rho; Pm[i][j] = Pm[j][i] = num(p) ? p : 1; N[i][j] = N[j][i] = r.n;
    });
    for (let i = 0; i < n; i++) { R[i][i] = 1; Pm[i][i] = 0; }
    const ord = o.order === 'cluster' ? clusterOrder(R) : names.map((_, i) => i);
    const nm = ord.map(i => names[i]), rr = (i, j) => R[ord[i]][ord[j]], pp = (i, j) => Pm[ord[i]][ord[j]];
    const basisTxt = o.basis === 'bonf' ? 'Bonferroni-adjusted' : 'uncorrected';
    const starNote = `* p < .05, ** p < .01, *** p < .001 (${basisTxt}).`;
    const cellTxt = (i, j) => fmtR(rr(i, j)) + stars(pp(i, j));
    if (v !== 'ranked') colorKey(f);

    if (v === 'tri' || v === 'full' || v === 'circles') {
      const tri = v !== 'full', xs = tri ? nm.slice(0, -1) : nm, ys = tri ? nm.slice(1) : nm;
      const probe = frameGrid(new Fig(f.w, {}), { xs, ys, h: 100 }), cell = probe.cw;
      const G = frameGrid(f, { xs, ys, h: Math.round(cell * ys.length) });
      const fs = clamp(cell * .3, 7.5, S.val);
      for (let i = 0; i < ys.length; i++) for (let j = 0; j < xs.length; j++) {
        const a = tri ? i + 1 : i, b = j;                     // matrix indices
        if (tri && b > a - 1) continue;
        const r = rr(a, b), x = G.P.x + j * G.cw, y = G.P.y + i * G.ch;
        if (r == null) { f.add(el('rect', { x, y, width: G.cw, height: G.ch, fill: '#f7f7f5', stroke: CH.surf, 'stroke-width': 2 })); continue; }
        if (v === 'circles') {
          const sig = pp(a, b) < .05, rad = Math.max(2, Math.sqrt(Math.abs(r)) * Math.min(G.cw, G.ch) * .46), col = ramp(CH.div, (r + 1) / 2);
          f.add(el('circle', { cx: G.cx(j), cy: G.cy(i), r: rad, fill: sig ? col : 'none', stroke: sig ? CH.surf : '#b4b9bf', 'stroke-width': 1 }));
          if (o.labels && sig && rad > 9) f.add(T(G.cx(j), G.cy(i), fmtR(r), { anchor: 'middle', base: 'central', size: fs - .5, fill: textOn(col) }));
        } else {
          const diag = a === b, fill = diag ? '#e9eaee' : ramp(CH.div, (r + 1) / 2);
          f.add(el('rect', { x, y, width: G.cw, height: G.ch, fill, stroke: CH.surf, 'stroke-width': 2 }));
          if (o.labels && !diag) f.add(T(G.cx(j), G.cy(i), cellTxt(a, b), { anchor: 'middle', base: 'central', size: fs, fill: textOn(fill) }));
        }
      }
      f.notes.push(v === 'circles' ? 'Circle area ∝ |ρ|; filled = p < .05, grey outline = not significant (' + basisTxt + ').' : starNote);
      return;
    }
    // ranked pairs
    const pairs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (R[i][j] != null) pairs.push({ a: names[i], b: names[j], r: R[i][j], p: Pm[i][j], n: N[i][j] });
    pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
    const top = o.top === 'all' ? pairs : pairs.slice(0, +o.top);
    const lim = Math.max(.5, Math.ceil(Math.max(...top.map(p => Math.abs(p.r))) * 10) / 10 + .05);
    const F = frameH(f, { cats: top.map(p => `${p.a} × ${p.b}`), min: -lim, max: lim, n: 4, h: clamp(top.length * 24 + 16, 140, 760), xLabel: 'Spearman ρ', fmt: x => (Math.abs(x) < 1e-9 ? '0' : fmtR(x)), rpad: 70 });
    top.forEach((p, i) => {
      const bh = Math.min(F.bh * .66, 16), sig = p.p < .05, col = p.r >= 0 ? CH.primary : CH.pal[1], x0 = F.x(0), x1 = F.x(p.r);
      f.add(el('rect', { x: Math.min(x0, x1), y: F.cy(i) - bh / 2, width: Math.abs(x1 - x0), height: bh, fill: col, 'fill-opacity': sig ? 1 : .32, stroke: CH.surf, 'stroke-width': 1 }));
      if (o.labels) f.add(T(p.r >= 0 ? x1 + 6 : x1 - 6, F.cy(i), `${fmtR(p.r)}${stars(p.p)}`, { anchor: p.r >= 0 ? 'start' : 'end', base: 'central', size: S.val }));
    });
    f.notes.push(`Pale bars: not significant at p < .05 (${basisTxt}). ${starNote}`);
  },
};

