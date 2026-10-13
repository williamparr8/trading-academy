// Ajoute le symbole (s), le nom (nm) et la devise de cotation (cur) de chaque actif à data/index.json,
// pour que la page puisse lister les actifs du mode Live sans charger les 36 fichiers.
import fs from 'node:fs';
const idx = JSON.parse(fs.readFileSync('trading/data/index.json', 'utf8'));
for (const a of idx.assets) {
  const d = JSON.parse(fs.readFileSync(`trading/data/${a.id}.json`, 'utf8'));
  a.s = d.s; a.nm = d.n; a.cur = d.cur; a.mk = a.mk || d.mk || 'stock';
  a.to = d.t[d.t.length - 1]; a.from = d.t[0]; a.n = d.t.length;
}
idx.refreshed = new Date().toISOString().slice(0, 10);
fs.writeFileSync('trading/data/index.json', JSON.stringify(idx));
console.log(idx.assets.length, 'actifs, dernière séance', new Date(Math.max(...idx.assets.map((a) => a.to)) * 86400000).toISOString().slice(0, 10), '| rafraîchi le', idx.refreshed);
console.log(idx.assets.slice(0, 3).concat(idx.assets.slice(-2)).map((a) => `${a.id}:${a.s}:${a.nm}:${a.cur}`).join('\n'));
