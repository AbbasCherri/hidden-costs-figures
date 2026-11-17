/* core.js - drawing primitives shared by every chart.
   Everything is plain SVG built from the DOM; sizes are CSS px at 96 dpi,
   so 1 in of journal width = 96 units and text sizes are true to print. */
'use strict';

const NS = 'http://www.w3.org/2000/svg';
const CH = {                         // "Classic" design tokens
  font: 'Arial, Helvetica, "Liberation Sans", sans-serif',
  ink: '#141414', ink2: '#2e2e2e', axis: '#1f1f1f', grid: '#e4e4e1', surf: '#ffffff',
  pal: ['#3f6c9f', '#c2704b', '#6a9a82', '#c9a24a', '#8a6a9c', '#7e8793'],
  primary: '#3f6c9f',
  seq: ['#eef2f7', '#3f6c9f', '#16314f'],
  div: ['#b8553b', '#f4f3f0', '#3f6c9f'],
  lik: ['#a9503a', '#dba58f', '#dcdad5', '#9db7d2', '#3f6c9f'],
  tintL: '#d5e0ec', tintM: '#9db7d2', deep: '#16314f', neut: '#8a8985', paper: '#f4f4f2',
};
/* ---------- standard publication palettes ---------- */
const PALETTES = [
  { id: 'journal', name: 'Journal muted (default)', cb: true, note: 'Desaturated steel blue, terracotta and sage, in the tone of Lancet, NEJM and Nature figures.',
    c: ['#3f6c9f', '#c2704b', '#6a9a82', '#c9a24a', '#8a6a9c', '#7e8793'] },
  { id: 'classic', name: 'Vivid (previous default)', cb: true, note: 'Saturated blue, orange and green. First three colours validated for colour-vision deficiency.',
    c: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'] },
  { id: 'okabe', name: 'Okabe-Ito (colour-blind safe)', cb: true, note: 'Designed for readers with colour-vision deficiency; recommended by many journals.',
    c: ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#56B4E9', '#CC79A7', '#F0E442', '#000000'] },
  { id: 'tolbright', name: 'Paul Tol · Bright', cb: true, note: 'Tol\'s bright qualitative scheme, designed to stay distinguishable under common colour blindness.',
    c: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'] },
  { id: 'tolmuted', name: 'Paul Tol · Muted', cb: true, note: 'Tol\'s muted scheme: softer colours, colour-blind friendly.',
    c: ['#332288', '#88CCEE', '#44AA99', '#117733', '#999933', '#DDCC77', '#CC6677', '#882255', '#AA4499'] },
  { id: 'dark2', name: 'ColorBrewer · Dark2', cb: false, note: 'ColorBrewer qualitative set. Pair with patterns if readers may be colour-blind.',
    c: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'] },
  { id: 'npg', name: 'Nature (NPG)', cb: false, note: 'Colours used in Nature Publishing Group figures. Pair with patterns for colour-blind readers.',
    c: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000'] },
  { id: 'aaas', name: 'Science (AAAS)', cb: false, note: 'Colours used in Science journals. Pair with patterns for colour-blind readers.',
    c: ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0000', '#5F559B', '#A20056'] },
  { id: 'lancet', name: 'The Lancet', cb: false, note: 'Colours used in The Lancet. Pair with patterns for colour-blind readers.',
    c: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6'] },
  { id: 'jama', name: 'JAMA', cb: false, note: 'Colours used in JAMA. Pair with patterns for colour-blind readers.',
    c: ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599', '#80796B'] },
  { id: 'grey', name: 'Greyscale (print)', cb: true, note: 'Black-and-white print. Turn on patterns so groups stay distinguishable.',
    c: ['#1b1b1b', '#6b6b6b', '#9c9c9c', '#c4c4c4', '#e0e0e0'] },
];
function applyPalette(id) {
  const P = PALETTES.find(p => p.id === id) || PALETTES[0], p0 = P.c[0];
  CH.pal = P.c; CH.primary = p0;
  CH.tintL = mixHex(p0, '#ffffff', .82); CH.tintM = mixHex(p0, '#ffffff', .45); CH.deep = mixHex(p0, '#000000', .6);
  CH.seq = [mixHex(p0, '#ffffff', .92), p0, CH.deep];
  if (P.id === 'journal') { CH.div = ['#b8553b', '#f4f3f0', '#3f6c9f']; CH.lik = ['#a9503a', '#dba58f', '#dcdad5', '#9db7d2', '#3f6c9f']; }
  else { CH.div = ['#eb6834', '#f2f2f0', '#2a78d6']; CH.lik = ['#c2410c', '#f0a07a', '#d4d3cf', '#7fb1ea', '#1a5fb4']; }
  return P;
}
