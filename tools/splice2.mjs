// Remplace le bloc du ticket d'ordre de app.js (de « function setSide » jusqu'à « function afterAction ») par tools/new-ticket.js
import fs from 'node:fs';
const f = 'trading/js/app.js';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const a = lines.findIndex((l) => l.includes('function setSide(v) {'));
const b = lines.findIndex((l) => l.includes('function afterAction() {'));
if (a < 0 || b < 0 || b < a) throw new Error('repères introuvables ' + a + ' ' + b);
const core = fs.readFileSync('tools/new-ticket.js', 'utf8').replace(/\n+$/, '').split('\n');
fs.writeFileSync(f, [...lines.slice(0, a), ...core, ...lines.slice(b)].join('\n'));
console.log(`ticket remplacé : ${b - a} lignes → ${core.length}`);
