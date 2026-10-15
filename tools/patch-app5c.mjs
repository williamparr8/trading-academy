import fs from 'node:fs';
const f = 'trading/js/app.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 90)); s = s.replace(a, () => b); };
// la carte de publication est redessinée après chaque étape : les boutons passent par la délégation d'événements
rep("    const pubGo = $('#pub-go'); if (pubGo) pubGo.onclick = publishScore;\n    const pubSee = $('#pub-see'); if (pubSee) pubSee.onclick = openBoard;\n", '');
rep("      if (e.target.closest('#board-open')) { openBoard(); return; }", "      if (e.target.closest('#board-open') || e.target.closest('#pub-see')) { openBoard(); return; }\n      if (e.target.closest('#pub-go')) { publishScore(); return; }");
// libellé plus clair de l'échelle des prix du mode Live
rep("note.textContent = k === 1 ? 'Cours réels. Le compte avance quand de nouvelles cotes sont publiées.' : `Prix du graphique et du ticket ×${F.num(k, k < 1 ? 2 : 0)} : cours réel = prix ÷ ${F.num(k, k < 1 ? 2 : 0)}. Le compte avance quand de nouvelles cotes sont publiées.`;",
  "note.textContent = k === 1 ? 'Cours réels. Le compte avance quand de nouvelles cotes sont publiées.' : `Prix du graphique et du ticket = cours réel × ${String(k).replace('.', ',')}, pour garder des quantités entières. L’en-tête et la légende montrent le cours réel. Le compte avance quand de nouvelles cotes sont publiées.`;");
fs.writeFileSync(f, s);
console.log('ok');
