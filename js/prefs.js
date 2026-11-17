/* prefs.js - remember look-and-feel choices on this device (localStorage). */
'use strict';
/* ---------- saved preferences (localStorage) ----------
   Remembers look-and-feel choices on this device: style per chart type, options, palette,
   colours, patterns, title switch and size. Data and typed text are never stored. */
const PREF_KEY = 'figure-studio-prefs-v1';
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    if (!p || typeof p !== 'object') return;
    if (PALETTES.some(x => x.id === p.palette)) state.palette = p.palette;
    if (SIZES.some(x => x.id === p.size)) state.size = p.size;
    if (typeof p.patterns === 'boolean') state.patterns = p.patterns;
    if (typeof p.showTitle === 'boolean') state.showTitle = p.showTitle;
    if (p.hue === 'blue' || p.hue === 'cat') state.hue = p.hue;
    if (p.variant && typeof p.variant === 'object') state.variant = p.variant;   // checked per chart type in load()
    if (p.opts && typeof p.opts === 'object') state.opts = p.opts;
  } catch (e) { /* storage blocked or unreadable: carry on with defaults */ }
}
function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({
      palette: state.palette, size: state.size, patterns: state.patterns, showTitle: state.showTitle,
      hue: state.hue, variant: state.variant, opts: state.opts }));
  } catch (e) { /* private window or storage full: preferences simply are not saved */ }
}
function resetPrefs() {
  try { localStorage.removeItem(PREF_KEY); } catch (e) { /* ignore */ }
  Object.assign(state, { variant: {}, opts: {}, showTitle: false, size: 'mid', patterns: false, hue: 'blue', palette: 'journal' });
  if (state.data) load(state.data, state.source);
  say('Saved preferences cleared.');
}
