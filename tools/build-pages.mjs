// Construit le site statique dans dist/ pour GitHub Pages.
// trading/index.html est un fragment (il est aussi publié tel quel comme artifact) : on l'enveloppe ici
// dans un vrai document HTML, puis on copie js/ et data/.
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'trading', OUT = 'dist';
const fragment = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

const titleMatch = /<title>[\s\S]*?<\/title>/.exec(fragment);
const title = titleMatch ? titleMatch[0] : '<title>Trading Academy</title>';
const body = titleMatch ? fragment.replace(titleMatch[0], '') : fragment;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${title}
<meta name="description" content="Simulateur de trading en français : entraîne-toi sur de vrais marchés historiques, actif et date cachés, sans risquer un sou.">
<meta name="theme-color" content="#080c11">
<style>:root{color-scheme:dark;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}html{background:#080c11}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const d of ['js', 'data']) fs.cpSync(path.join(SRC, d), path.join(OUT, d), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const files = fs.readdirSync(path.join(OUT, 'data')).length;
console.log(`dist/ prêt : index.html, ${fs.readdirSync(path.join(OUT, 'js')).length} scripts, ${files} fichiers de données`);
