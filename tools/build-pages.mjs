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
<meta name="theme-color" content="#27307a">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Trading">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}html{background:#f0f0f0}[hidden]{display:none!important}</style>
</head>
<body>
${body}
<script>if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) { addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); }); }</script>
</body>
</html>
`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
for (const d of ['js', 'data']) fs.cpSync(path.join(SRC, d), path.join(OUT, d), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// appli installable et hors ligne : manifeste, icônes, service worker (liste de la coquille générée ici)
fs.copyFileSync(path.join(SRC, 'manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
fs.cpSync(path.join(SRC, 'icons'), path.join(OUT, 'icons'), { recursive: true });
const shell = ['./', 'index.html', 'manifest.webmanifest', ...fs.readdirSync(path.join(OUT, 'icons')).map((f) => 'icons/' + f), ...fs.readdirSync(path.join(OUT, 'js')).map((f) => 'js/' + f)];
const build = Date.now().toString(36);
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8').split('__BUILD__').join(build).split('__SHELL__').join(JSON.stringify(shell)));

const files = fs.readdirSync(path.join(OUT, 'data')).length;
console.log(`dist/ prêt : index.html, ${fs.readdirSync(path.join(OUT, 'js')).length} scripts, ${files} fichiers de données`);
