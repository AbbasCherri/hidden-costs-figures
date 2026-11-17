/* export.js - SVG serialising and PNG export with 300 dpi metadata. */
'use strict';
/* ---------- export ---------- */
function svgString(svg) { return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg); }

const _crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (const b of u8) c = _crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

/* write a pHYs chunk so Word / InDesign place the PNG at its true size */
function pngWithDpi(buf, dpi) {
  const u8 = new Uint8Array(buf), ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(u8.length + 21);
  out.set(u8.subarray(0, 33)); out.set(chunk, 33); out.set(u8.subarray(33), 54);
  return out;
}

async function pngBlob(svg, dpi = 300) {
  const w = +svg.getAttribute('width'), h = +svg.getAttribute('height'), k = dpi / 96;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(svg));
  await img.decode();
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  const raw = await new Promise(r => c.toBlob(r, 'image/png'));
  return new Blob([pngWithDpi(await raw.arrayBuffer(), dpi)], { type: 'image/png' });
}

/* nudge label centres apart so they never overlap: items [{y}] sorted in place */
