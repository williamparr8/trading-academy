// Génère les icônes de l'appli (PNG) sans dépendance : dégradé indigo et trois chandeliers.
// Usage : node tools/make-icons.mjs   (écrit dans trading/icons/)
import fs from 'node:fs';
import zlib from 'node:zlib';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const A = hex('#0d1636'), B = hex('#5b3df5'), C = hex('#22d3ee');

// contenu en coordonnées unitaires (0 à 1) : [x0, y0, x1, y1, couleur]
const SHAPES = [
  [0.265, 0.30, 0.285, 0.82, '#cfd6ff'], [0.20, 0.45, 0.35, 0.70, '#ef5468'],
  [0.490, 0.20, 0.510, 0.75, '#cfd6ff'], [0.42, 0.35, 0.58, 0.62, '#2dbe8b'],
  [0.720, 0.10, 0.740, 0.62, '#cfd6ff'], [0.65, 0.22, 0.81, 0.50, '#2dbe8b'],
].map(([a, b, c, d, col]) => [a, b, c, d, hex(col)]);

function icon(N, { maskable }) {
  const out = Buffer.alloc(N * N * 4), SS = 3;
  const pad = maskable ? 0.18 : 0.14, span = 1 - pad * 2;
  const R = maskable ? 0 : 0.22 * N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
      // coins arrondis (icône « any ») : hors du carré arrondi = transparent
      let inside = true;
      if (R > 0) {
        const cx = px < R ? R : px > N - R ? N - R : px, cy = py < R ? R : py > N - R ? N - R : py;
        inside = (px - cx) ** 2 + (py - cy) ** 2 <= R * R;
      }
      if (!inside) continue;
      const t = (px + py) / (2 * N);
      let col = [0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * Math.min(1, t * 1.25));
      // halo cyan en haut à droite
      const dh = Math.hypot(px / N - 0.85, py / N - 0.12), halo = Math.max(0, 1 - dh / 0.55) * 0.55;
      col = col.map((v, i) => v + (C[i] - v) * halo);
      const ux = (px / N - pad) / span, uy = (py / N - pad) / span;
      for (const [x0, y0, x1, y1, c] of SHAPES) if (ux >= x0 && ux <= x1 && uy >= y0 && uy <= y1) { col = c; break; }
      r += col[0]; g += col[1]; b += col[2]; a += 255;
    }
    const n = SS * SS, o = (y * N + x) * 4;
    out[o] = a ? Math.round(r / (a / 255)) : 0; out[o + 1] = a ? Math.round(g / (a / 255)) : 0; out[o + 2] = a ? Math.round(b / (a / 255)) : 0; out[o + 3] = Math.round(a / n);
  }
  return png(N, N, out);
}

fs.mkdirSync('trading/icons', { recursive: true });
const files = { 'icon-192.png': [192, false], 'icon-512.png': [512, false], 'icon-maskable-512.png': [512, true], 'apple-touch-icon.png': [180, true] };
for (const [name, [n, m]] of Object.entries(files)) { fs.writeFileSync('trading/icons/' + name, icon(n, { maskable: m })); console.log('trading/icons/' + name); }
