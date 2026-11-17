/* charts-b.js - Grouped / stacked, Mean by group (95% CI), Box plot */
'use strict';

/* ------------------------------------------------------------ 3 · GROUPED / STACKED */
CHARTS.grouped = {
  variants: [
    { id: 'grouped', label: 'Grouped bars' }, { id: 'stacked', label: 'Stacked bars' },
    { id: 'stack100', label: '100% stacked, horizontal' }, { id: 'heat', label: 'Heatmap' }, { id: 'dots', label: 'Dot plot' }],
  options: [
    { id: 'basis', label: 'Values', choices: [['count', 'As in sheet'], ['col', '% of each group'], ['row', '% of each category']], def: 'count' },
    { id: 'labels', label: 'Show values', kind: 'toggle', def: true }],
  auto: (d, s, o) => ({
    x: s.x || '', y: { count: 'Respondents (count)', col: 'Share of group (%)', row: 'Share of category (%)' }[o.basis],
    foot: `n = ${sum(d.rows.map(r => +r.total || 0))} respondents`,
  }),
  draw(f, d, v, o) {
    const grps = d.headers.slice(1, -1), cats = d.rows.map(r => String(r.category));
    const raw = d.rows.map(r => grps.map(g => +r[g] || 0));
    const colT = grps.map((_, j) => sum(raw.map(r => r[j])) || 1), rowT = raw.map(r => sum(r) || 1);
    const basis = v === 'stack100' ? 'row' : o.basis;
    const val = raw.map((r, i) => r.map((x, j) => (basis === 'col' ? x / colT[j] * 100 : basis === 'row' ? x / rowT[i] * 100 : x)));
    const isPct = basis !== 'count', txt = x => (isPct ? `${x.toFixed(0)}%` : (Number.isInteger(x) ? intTxt(x) : f1(x)));
    const G = grps.length, multi = G > 1;
    if (multi && v !== 'heat') f.legend(groupLegend(f, grps, v === 'dots' ? 'dot' : null));
    const h = plotH(f.w, .62), yLabel = f.cfg.y, xLabel = f.cfg.x;

    if (v === 'grouped' || v === 'stacked') {
      const stacked = v === 'stacked', tot = val.map(r => sum(r));
      const max = stacked ? Math.max(...tot) : Math.max(...val.flat(), 1);
      const F = frameV(f, { cats, min: 0, max: max * 1.1, h, xLabel, yLabel });
      cats.forEach((c, i) => {
        const bwid = stacked ? Math.min(F.bw * .62, 70) : Math.min(F.bw * .8 / G, 44);
        let acc = 0;
        grps.forEach((g, j) => {
          const x0 = stacked ? F.cx(i) - bwid / 2 : F.cx(i) - bwid * G / 2 + j * bwid, fill = groupFill(f, j, gcol(j)), x = val[i][j];
          if (stacked) {
            f.add(el('rect', { x: x0, y: F.y(acc + x), width: bwid, height: Math.max(0, F.y(acc) - F.y(acc + x)), fill, stroke: CH.surf, 'stroke-width': 1.5 }));
            if (o.labels && F.y(acc) - F.y(acc + x) > 15 && x > 0) f.add(T(x0 + bwid / 2, (F.y(acc) + F.y(acc + x)) / 2, txt(x), { anchor: 'middle', base: 'central', size: S.val, fill: '#fff', weight: 'bold' }));
            acc += x;
          } else {
            f.add(rbar(x0 + 1, F.y(x), bwid - 2, F.y(0) - F.y(x), 'up', fill));
            if (o.labels && G <= 3 && bwid > tw(txt(x), S.val) + 2) f.add(T(x0 + bwid / 2, F.y(x) - 5, txt(x), { anchor: 'middle', size: S.val }));
          }
        });
        if (stacked && o.labels && G > 1) f.add(T(F.cx(i), F.y(tot[i]) - 5, txt(tot[i]), { anchor: 'middle', size: S.val, weight: 'bold' }));
      });
    } else if (v === 'stack100') {
      const F = frameH(f, { cats, min: 0, max: 100, h: clamp(cats.length * 32, 120, 560), xLabel: 'Share of category (%)', yLabel: xLabel });
      cats.forEach((c, i) => {
        let acc = 0; const bh = Math.min(F.bh * .66, 28);
        grps.forEach((g, j) => {
          const x = val[i][j], fill = groupFill(f, j, gcol(j));
          f.add(el('rect', { x: F.x(acc), y: F.cy(i) - bh / 2, width: Math.max(0, F.x(acc + x) - F.x(acc)), height: bh, fill, stroke: CH.surf, 'stroke-width': 1.5 }));
          if (o.labels && F.x(acc + x) - F.x(acc) > tw(txt(x), S.val) + 8) f.add(T((F.x(acc) + F.x(acc + x)) / 2, F.cy(i), txt(x), { anchor: 'middle', base: 'central', size: S.val, fill: '#fff', weight: 'bold' }));
          acc += x;
        });
      });
    } else if (v === 'heat') {
      const G2 = frameGrid(f, { xs: grps, ys: cats, h: clamp(cats.length * 34, 130, 520), xLabel: null, yLabel: xLabel });
      const max = Math.max(...val.flat(), 1);
      cats.forEach((c, i) => grps.forEach((g, j) => {
        const fill = ramp(CH.seq, val[i][j] / max);
        f.add(el('rect', { x: G2.P.x + j * G2.cw, y: G2.P.y + i * G2.ch, width: G2.cw, height: G2.ch, fill, stroke: CH.surf, 'stroke-width': 2 }));
        if (o.labels) f.add(T(G2.cx(j), G2.cy(i), txt(val[i][j]), { anchor: 'middle', base: 'central', size: S.val + 1, fill: textOn(fill) }));
      }));
      f.notes.push('Darker cells = larger values.');
    } else { // dots
      const F = frameH(f, { cats, min: 0, max: Math.max(...val.flat(), 1) * 1.08, h: clamp(cats.length * 34, 130, 560), xLabel: yLabel, yLabel: xLabel, rpad: 12 });
      cats.forEach((c, i) => {
        const lo = Math.min(...val[i]), hi = Math.max(...val[i]);
        f.add(el('path', { d: `M${F.x(lo)},${F.cy(i)}H${F.x(hi)}`, stroke: CH.grid, 'stroke-width': 4, 'stroke-linecap': 'round' }));
        grps.forEach((g, j) => f.add(el('circle', { cx: F.x(val[i][j]), cy: F.cy(i), r: 5.5, fill: gcol(j), stroke: CH.surf, 'stroke-width': 1.5 })));
      });
    }
  },
};

/* ------------------------------------------------------------ 4 · MEAN BY GROUP */
CHARTS.meanci = {
  hue: true,
  variants: [
    { id: 'bars', label: 'Bars with 95% CI' }, { id: 'dots', label: 'Dots with 95% CI' },
    { id: 'line', label: 'Line with 95% CI' }, { id: 'forest', label: 'Forest (horizontal)' }],
  options: [
    { id: 'zero', label: 'Axis starts at 0 (dots, line, forest)', kind: 'toggle', def: false },
    { id: 'labels', label: 'Show means', kind: 'toggle', def: true },
    { id: 'showN', label: 'Show n in labels', kind: 'toggle', def: true }],
  useSheetY: true,
  auto: (d, s, o) => ({ x: s.x || '', y: s.y || 'Mean (95% CI)', foot: s.foot || '' }),
  draw(f, d, v, o) {
    const P = pivot(d.rows, 'x_category', 'group_category'), G = P.grps.length, multi = G > 1;
    const cell = (c, g) => P.get(c, g);
    const cats = P.cats.map(c => (!multi && o.showN && cell(c, P.grps[0]) && cell(c, P.grps[0]).n != null ? `${c} (n=${cell(c, P.grps[0]).n})` : c));
    const all = d.rows.filter(r => num(r.mean));
    let lo = Math.min(...all.map(r => num(r.ci95_low) ? r.ci95_low : r.mean)), hi = Math.max(...all.map(r => num(r.ci95_high) ? r.ci95_high : r.mean));
    const zero = v === 'bars' || o.zero, pad = (hi - lo) * .08 || 1;
    lo = zero ? Math.min(0, lo) : lo - pad; hi += pad + (o.labels && !multi ? (hi - lo) * .06 : 0);
    if (multi) f.legend(groupLegend(f, P.grps, v === 'bars' ? null : (v === 'line' ? 'line' : 'dot')));
    const h = plotH(f.w, .62), dodge = (j, w) => (j - (G - 1) / 2) * w;
    const ci = (i, j) => (!multi && o.hue === 'cat' ? i : j);        // distinct colour per category when there is only one group

    if (v === 'forest') {
      const rowsN = P.cats.length, maxLab = o.labels && !multi ? 92 : 0;
      const F = frameH(f, { cats, min: lo, max: hi, h: clamp(rowsN * (multi ? 22 * G : 34), 130, 600), xLabel: f.cfg.y, yLabel: f.cfg.x, zero: zero, rpad: maxLab + 6 });
      P.cats.forEach((c, i) => P.grps.forEach((g, j) => {
        const r = cell(c, g); if (!r || !num(r.mean)) return;
        const y = F.cy(i) + dodge(j, Math.min(15, F.bh / (G + 1)));
        if (num(r.ci95_low)) f.add(el('path', { d: `M${F.x(r.ci95_low)},${y}H${F.x(r.ci95_high)}`, stroke: gcol(ci(i, j)), 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
        f.add(el('circle', { cx: F.x(r.mean), cy: y, r: 5.5, fill: gcol(ci(i, j)), stroke: CH.surf, 'stroke-width': 1.5 }));
        if (maxLab) f.add(T(F.P.x + F.P.w + 8, y, `${f1(r.mean)} [${f1(r.ci95_low)}, ${f1(r.ci95_high)}]`, { base: 'central', size: S.val }));
      }));
      if (maxLab) f.add(T(F.P.x + F.P.w + 8, F.P.y - 6, 'Mean [95% CI]', { size: S.note, fill: CH.ink2 }));
      f.notes.push('Points show the mean; lines show the 95% confidence interval.');
      return;
    }
    const F = frameV(f, { cats, min: lo, max: hi, h, xLabel: f.cfg.x, yLabel: f.cfg.y });
    const bwid = Math.min(F.bw * .7 / G, 46), cap = Math.min(5, bwid * .3 + 2);
    if (v === 'line' && G >= 1) P.grps.forEach((g, j) => {
      const pts = P.cats.map((c, i) => [i, cell(c, g)]).filter(([, r]) => r && num(r.mean));
      f.add(el('path', { d: pts.map(([i, r], k) => `${k ? 'L' : 'M'}${F.cx(i) + dodge(j, Math.min(10, F.bw / (G + 2)))},${F.y(r.mean)}`).join(''), fill: 'none', stroke: gcol(j), 'stroke-width': 1.8 }));
    });
    P.cats.forEach((c, i) => P.grps.forEach((g, j) => {
      const r = cell(c, g); if (!r || !num(r.mean)) return;
      const off = v === 'bars' ? dodge(j, bwid) : dodge(j, Math.min(10, F.bw / (G + 2))), x = F.cx(i) + off;
      if (v === 'bars') f.add(rbar(x - bwid / 2 + 1, F.y(r.mean), bwid - 2, F.y(0) - F.y(r.mean), 'up', groupFill(f, ci(i, j), gcol(ci(i, j)))));
      const ec = v === 'bars' ? CH.ink : gcol(ci(i, j));
      if (num(r.ci95_low)) f.add(el('path', { d: `M${x},${F.y(r.ci95_low)}V${F.y(r.ci95_high)}M${x - cap},${F.y(r.ci95_low)}H${x + cap}M${x - cap},${F.y(r.ci95_high)}H${x + cap}`, stroke: ec, 'stroke-width': 1.6, fill: 'none' }));
      if (v !== 'bars') f.add(el('circle', { cx: x, cy: F.y(r.mean), r: 5.2, fill: gcol(ci(i, j)), stroke: CH.surf, 'stroke-width': 1.5 }));
      else f.add(el('circle', { cx: x, cy: F.y(r.mean), r: 3.2, fill: CH.surf, stroke: CH.ink, 'stroke-width': 1.4 }));
      if (o.labels && G <= 2) f.add(T(x + (G === 2 ? 0 : 0), F.y(num(r.ci95_high) ? r.ci95_high : r.mean) - 7, f1(r.mean), { anchor: 'middle', size: S.val }));
    }));
    f.notes.push(v === 'bars' ? 'Circles mark the mean; whiskers show the 95% confidence interval.' : 'Points show the mean; error bars show the 95% confidence interval.');
  },
};

/* ------------------------------------------------------------ 5 · BOX PLOT */
CHARTS.box = {
  hue: true,
  variants: [{ id: 'box', label: 'Box and whiskers' }, { id: 'hbox', label: 'Horizontal boxes' }, { id: 'minimal', label: 'Minimal (IQR bar)' }],
  options: [
    { id: 'mean', label: 'Show mean (diamond)', kind: 'toggle', def: true },
    { id: 'ext', label: 'Show most extreme outlier', kind: 'toggle', def: true },
    { id: 'showN', label: 'Show n in labels', kind: 'toggle', def: true }],
  useSheetY: true,
  auto: (d, s, o) => ({ x: s.x || '', y: s.y || 'Value', foot: s.foot || '' }),
  draw(f, d, v, o) {
    const P = pivot(d.rows, 'x_category', 'group_category'), G = P.grps.length, multi = G > 1, horiz = v === 'hbox';
    const cell = (c, g) => P.get(c, g);
    const cats = P.cats.map(c => (!multi && o.showN && cell(c, P.grps[0]) && cell(c, P.grps[0]).n != null ? `${c} (n=${cell(c, P.grps[0]).n})` : c));
    const rows = d.rows.filter(r => num(r.median));
    let lo = Math.min(...rows.map(r => (o.ext && num(r.min) ? r.min : r.whisker_low))), hi = Math.max(...rows.map(r => (o.ext && num(r.max) ? r.max : r.whisker_high)));
    const pad = (hi - lo) * .06 || 1; lo -= pad; hi += pad;
    if (multi) f.legend(groupLegend(f, P.grps));
    const dodge = (j, w) => (j - (G - 1) / 2) * w;
    const ci = (i, j) => (!multi && o.hue === 'cat' ? i : j);
    const draw = (c, g, j, i, pos, along, bwid) => {
      const r = cell(c, g); if (!r || !num(r.median)) return;
      const A = (cr, val) => (horiz ? { x: along(val), y: pos(cr) } : { x: pos(cr), y: along(val) });  // (cross, value)
      const seg = (c1, v1, c2, v2, st) => { const p = A(c1, v1), q = A(c2, v2); f.add(el('path', { d: `M${p.x},${p.y}L${q.x},${q.y}`, fill: 'none', stroke: CH.ink, ...st })); };
      const cx0 = 0, hw = bwid / 2, fill = groupFill(f, ci(i, j), mixHex(gcol(ci(i, j)), '#ffffff', .5));
      const wl = num(r.whisker_low) ? r.whisker_low : r.min, wh = num(r.whisker_high) ? r.whisker_high : r.max;
      if (v === 'minimal') {
        seg(cx0, wl, cx0, wh, { 'stroke-width': 1, stroke: CH.ink2 });
        const a = A(-3.5, r.q1), b = A(3.5, r.q3);
        f.add(el('rect', { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), rx: 2, fill: gcol(ci(i, j)) }));
      } else {
        seg(cx0, wl, cx0, r.q1, { 'stroke-width': 1.2 }); seg(cx0, r.q3, cx0, wh, { 'stroke-width': 1.2 });
        seg(-hw * .45, wl, hw * .45, wl, { 'stroke-width': 1.2 }); seg(-hw * .45, wh, hw * .45, wh, { 'stroke-width': 1.2 });
        const a = A(-hw, r.q1), b = A(hw, r.q3);
        f.add(el('rect', { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), fill, stroke: CH.ink, 'stroke-width': 1.2 }));
        seg(-hw, r.median, hw, r.median, { 'stroke-width': 2.4 });
      }
      if (v === 'minimal') { const m = A(0, r.median); f.add(el('circle', { cx: m.x, cy: m.y, r: 3.4, fill: '#fff', stroke: CH.ink, 'stroke-width': 1.3 })); }
      if (o.ext) [[r.min, wl], [r.max, wh]].forEach(([e, w]) => { if (num(e) && e !== w && (e < wl || e > wh)) { const p = A(0, e); f.add(el('circle', { cx: p.x, cy: p.y, r: 3, fill: 'none', stroke: CH.ink2, 'stroke-width': 1 })); } });
      if (o.mean && num(r.mean)) { const p = A(0, r.mean); f.add(el('path', { d: `M${p.x},${p.y - 5}L${p.x + 5},${p.y}L${p.x},${p.y + 5}L${p.x - 5},${p.y}Z`, fill: '#fff', stroke: CH.ink, 'stroke-width': 1.2 })); }
    };
    let F;
    if (horiz) F = frameH(f, { cats, min: lo, max: hi, h: clamp(cats.length * (G > 1 ? 30 * G : 38), 140, 640), xLabel: f.cfg.y, yLabel: f.cfg.x, zero: false });
    else F = frameV(f, { cats, min: lo, max: hi, h: plotH(f.w, .66), xLabel: f.cfg.x, yLabel: f.cfg.y });
    const band = horiz ? F.bh : F.bw, bwid = Math.min(band * .6 / G, 56);
    P.cats.forEach((c, i) => P.grps.forEach((g, j) => {
      const ctr = (horiz ? F.cy(i) : F.cx(i)) + dodge(j, bwid * 1.08);
      // draw into a translated group so (cross, value) maps cleanly
      const pos = k => ctr + k, along = horiz ? F.x : F.y;
      draw(c, g, j, i, pos, along, bwid * .86);
    }));
    f.notes.push(`Box: interquartile range; line: median; whiskers: most extreme values within 1.5 × IQR${o.ext ? '; open circle: most extreme outlier' : ''}${o.mean ? '; diamond: mean' : ''}.`);
  },
};

