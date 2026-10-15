// Tests de l'appli installable : manifeste, icônes, service worker (gabarit).
import assert from 'node:assert/strict';
import fs from 'node:fs';
let n = 0;
const ok = (m) => { n++; console.log('  OK appli installable: ' + m); };

const mf = JSON.parse(fs.readFileSync('trading/manifest.webmanifest', 'utf8'));
{
  assert.equal(mf.display, 'standalone');
  assert(mf.name && mf.short_name && mf.start_url === './' && mf.scope === './');
  assert(/^#[0-9a-f]{6}$/i.test(mf.theme_color) && /^#[0-9a-f]{6}$/i.test(mf.background_color));
  assert(mf.icons.some((i) => i.sizes === '192x192') && mf.icons.some((i) => i.sizes === '512x512'));
  assert(mf.icons.some((i) => i.purpose === 'maskable'));
  ok('manifeste complet (nom, portée, couleurs, icônes dont maskable)');
}
{
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const ic of mf.icons.concat([{ src: 'icons/apple-touch-icon.png', sizes: '180x180' }])) {
    const b = fs.readFileSync('trading/' + ic.src);
    assert.deepEqual(b.subarray(0, 8), sig, ic.src + ' : signature PNG');
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.equal(w + 'x' + h, ic.sizes, ic.src + ' : dimensions');
    assert.equal(b.subarray(b.length - 8, b.length - 4).toString('hex'), '49454e44', ic.src + ' : fin du fichier');
  }
  ok('icônes PNG valides aux bonnes dimensions');
}
{
  const sw = fs.readFileSync('trading/sw.js', 'utf8');
  assert(sw.includes('__BUILD__') && sw.includes('__SHELL__'), 'marqueurs de génération');
  const built = sw.split('__BUILD__').join('abc').split('__SHELL__').join(JSON.stringify(['./', 'index.html']));
  new Function(built);   // syntaxe valide une fois les marqueurs remplacés
  assert(/data\\\/\[\^\/\]\+\\\.json/.test(sw) || sw.includes('/data/'), 'cotes servies depuis le cache');
  ok('service worker : gabarit valide, cotes en cache');
}
{
  const html = fs.readFileSync('tools/build-pages.mjs', 'utf8');
  assert(html.includes('manifest.webmanifest') && html.includes("register(\"sw.js\")"));
  const idx = fs.readFileSync('trading/index.html', 'utf8');
  assert(idx.includes('js/pwa.js'));
  ok('construction : manifeste, enregistrement du service worker, script d’installation');
}
console.log('  ' + n + ' groupes de l’appli installable réussis');
