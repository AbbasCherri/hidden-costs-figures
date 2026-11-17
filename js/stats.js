/* stats.js - small statistics used by the Scatter chart: t distribution, ranks, correlations, OLS, seeded rng. */
'use strict';
/* ---- statistics used by Scatter (everything else arrives pre-computed) ---- */
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + .5) * Math.log(t); let s = 1.000000000190015;
  for (let j = 0; j < 6; j++) s += c[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function betai(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function tcdf(t, df) { const p = .5 * betai(df / 2, .5, df / (df + t * t)); return t > 0 ? 1 - p : p; }
function tinv(p, df) { let lo = -60, hi = 60; for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (tcdf(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
function ranks(a) {
  const idx = a.map((v, i) => i).sort((i, j) => a[i] - a[j]), r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++; for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}
function pearson(x, y) {
  const n = x.length, mx = sum(x) / n, my = sum(y) / n; let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
function spearman(x, y) {
  const n = x.length; if (n < 4) return null;
  const rho = pearson(ranks(x), ranks(y)); if (!isFinite(rho)) return null;
  const t = rho * Math.sqrt((n - 2) / Math.max(1e-12, 1 - rho * rho));
  return { rho, n, p: 2 * (1 - tcdf(Math.abs(t), n - 2)) };
}
function ols(x, y) {
  const n = x.length, mx = sum(x) / n, my = sum(y) / n; let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  const b = sxy / sxx, a = my - b * mx, rss = sum(x.map((xi, i) => (y[i] - a - b * xi) ** 2)), se = Math.sqrt(rss / Math.max(1, n - 2));
  return { a, b, n, mx, sxx, se };
}
const pTxt = p => (p < .001 ? 'p < .001' : `p = ${p.toFixed(3).replace(/^0/, '')}`);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

