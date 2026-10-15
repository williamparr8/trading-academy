// Insère le contenu d'un fichier juste avant une ligne repère d'un fichier cible.
// Usage : node tools/insert.mjs <cible> <fichier à insérer> <texte du repère>
import fs from 'node:fs';
const [target, src, marker] = process.argv.slice(2);
const lines = fs.readFileSync(target, 'utf8').split('\n');
const at = lines.findIndex((l) => l.includes(marker));
if (at < 0) throw new Error('repère introuvable : ' + marker);
const add = fs.readFileSync(src, 'utf8').replace(/\n+$/, '').split('\n');
fs.writeFileSync(target, [...lines.slice(0, at), ...add, '', ...lines.slice(at)].join('\n'));
console.log(`inséré ${add.length} lignes avant la ligne ${at + 1}`);
