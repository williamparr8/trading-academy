import fs from 'node:fs';
const iso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
const idx = JSON.parse(fs.readFileSync('trading/data/index.json'));
for (const a of idx.assets) {
  const d = JSON.parse(fs.readFileSync(`trading/data/${a.id}.json`));
  let mx = 0, mxi = 0, gaps = 0, zv = 0, bad = 0, flat = 0, wk = 0, big = 0;
  for (let i = 1; i < d.t.length; i++) {
    const r = d.c[i] / d.c[i - 1] - 1;
    if (Math.abs(r) > Math.abs(mx)) { mx = r; mxi = i; }
    if (d.t[i] - d.t[i - 1] > (a.mk === 'crypto' ? 1 : 5)) gaps++;
    if (d.v[i] === 0) zv++;
    if (d.h[i] < d.l[i] || d.c[i] > d.h[i] || d.c[i] < d.l[i]) bad++;
    if (d.h[i] === d.l[i]) flat++;
    if ((d.h[i] - d.l[i]) / d.c[i] > 0.4) big++;
    const dow = (d.t[i] + 4) % 7;     // 0 = dimanche
    if (a.mk === 'forex' && (dow === 0 || dow === 6)) wk++;
  }
  if (a.mk !== 'stock') console.log(a.mk.padEnd(7), a.id.padEnd(9), 'maxΔ', (mx * 100).toFixed(1).padStart(7) + '%', iso(d.t[mxi]), '| trous', gaps, '| vol=0', zv, '| incoh.', bad, '| plates', flat, '| barres>40%', big, '| week-end', wk, '| mk', d.mk, d.s, 'min', Math.min(...d.c).toPrecision(4), 'max', Math.max(...d.c).toPrecision(5));
}
console.log('actifs par marché:', JSON.stringify(idx.assets.reduce((m, a) => ((m[a.mk] = (m[a.mk] || 0) + 1), m), {})));
