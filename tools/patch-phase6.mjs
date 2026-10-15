import fs from 'node:fs';
function patch(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(file + ' : repère introuvable : ' + a.slice(0, 80));
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, s);
}

patch('trading/js/app.js', [
  ["    stock: 'Actions de la Bourse de Toronto, du NYSE et du Nasdaq.',",
   "    stock: 'Actions et FNB (fonds négociés en bourse, des paniers d’actifs vendus comme des actions) de la Bourse de Toronto, du NYSE et du Nasdaq. Vendre à découvert coûte des frais d’emprunt.',"],
  ["if (sc.ok) hint = 'Ouvre une vente à découvert : tu gagnes si le prix baisse. Le stop se place au-dessus du prix.';",
   "if (sc.ok) hint = 'Ouvre une vente à découvert : tu gagnes si le prix baisse. Le stop se place au-dessus du prix.' + (TA.MARKETS[g.market].borrow ? ' Des frais d’emprunt de ' + F.pct(TA.MARKETS[g.market].borrow).replace(',00', '') + ' par an sont prélevés à chaque barre.' : '');"],
  ["${p.dir === -1 ? '<p class=\"hint\">Vente à découvert : ton stop se place au-dessus du prix, ton objectif en dessous.</p>' : ''}",
   "${p.dir === -1 ? `<p class=\"hint\">Vente à découvert : ton stop se place au-dessus du prix, ton objectif en dessous.${mk.borrow ? ` Frais d’emprunt : ${F.pct(mk.borrow).replace(',00', '')} par an, prélevés à chaque barre et inclus dans les frais de la transaction.` : ''}</p>` : ''}"],
]);

patch('trading/js/lessons.js', [
  ["'En réalité, il faut aussi payer des frais d’emprunt et rembourser les dividendes. Ce n’est pas simulé ici.'",
   "'Les actions vendues à découvert sont empruntées : le simulateur prélève des frais d’emprunt de 2 % par an à chaque barre. Les dividendes à rembourser sont déjà comptés, car les prix sont ajustés des dividendes.'"],
]);
console.log('ok');
