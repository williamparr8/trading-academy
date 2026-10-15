import fs from 'node:fs';
let s = fs.readFileSync('trading/js/lessons.js', 'utf8');
const i = s.lastIndexOf('// Illustrations');
const garbage = s.slice(i + '// Illustrations'.length);   // texte inséré par erreur à la place de « $' »
let n = 0;
for (const pre of ["'+2 ", "'−3 ", "'−1 "]) {
  const needle = pre + garbage;
  while (s.includes(needle)) { s = s.replace(needle, () => pre + "$'"); n++; }
}
fs.writeFileSync('trading/js/lessons.js', s);
console.log('réparations :', n);
