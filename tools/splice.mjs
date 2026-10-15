// Remplace le bloc « État de la partie » … (jusqu'au « Résumé de fin de partie ») de engine.js par tools/new-core.js
import fs from 'node:fs';
const f = 'trading/js/engine.js';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const a = lines.findIndex((l) => l.includes('/* ---------- État de la partie ---------- */'));
const b = lines.findIndex((l) => l.includes('/* ---------- Résumé de fin de partie ---------- */'));
if (a < 0 || b < 0 || b < a) throw new Error('repères introuvables ' + a + ' ' + b);
const core = fs.readFileSync('tools/new-core.js', 'utf8').replace(/\n+$/, '').split('\n');
const out = [...lines.slice(0, a), ...core, '', ...lines.slice(b)];
fs.writeFileSync(f, out.join('\n'));
console.log(`bloc remplacé : lignes ${a + 1}-${b} (${b - a} lignes) → ${core.length + 1} lignes`);
