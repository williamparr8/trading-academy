import fs from 'node:fs';
const f = 'progression/index.html';
let s = fs.readFileSync(f, 'utf8');
const a = s.indexOf("const liste2 = ");
const b = s.indexOf("\n", s.indexOf("document.getElementById('contenu').insertAdjacentHTML"));
if (a < 0 || b < 0) throw new Error('repère introuvable');
s = s.slice(0, a) + s.slice(b + 1);   // retire l'insertion tardive
// carte « Où on en est » construite avant l'affectation principale
const marker = "document.getElementById('contenu').innerHTML =";
const card = "const liste2 = (a) => '<ul>' + a.map((t) => `<li class=\"fait\"><span class=\"icone\">•</span><span>${esc(t)}</span></li>`).join('') + '</ul>';\nconst ouCard = `<section class=\"carte\"><h2><span class=\"titre\">Où on en est</span></h2><div class=\"groupe\">Jouable dès maintenant</div>${liste2(OU_ON_EN_EST.jouable)}<div class=\"groupe\">Ce qui reste</div>${liste2(OU_ON_EN_EST.reste)}</section>`;\n";
s = s.replace(marker, () => card + marker);
const anchor = "`<section class=\"carte suite\"><h2>Prochaine étape</h2><p>${esc(PROCHAINE)}</p></section>` +";
if (!s.includes(anchor)) throw new Error('carte suite introuvable');
s = s.replace(anchor, () => anchor + "\n  ouCard +");
fs.writeFileSync(f, s);
console.log('ok');
