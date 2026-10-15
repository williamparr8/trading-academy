import fs from 'node:fs';
const f = 'trading/js/app.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 90)); s = s.replace(a, b); };

// updateAll : options et coach
rep(`updateTicket(); renderPos(); renderOrders(); renderJournal();`, `updateTicket(); renderPos(); renderOpts(); renderOrders(); renderJournal(); renderCoach();`);

// journal : options ouvertes, transactions d'options
rep(`    for (const t of st.trades.slice().reverse()) {
      const r = t.r == null ? '' : \` · \${t.r > 0 ? '+' : ''}\${F.num(t.r, 2)} R\`;`, `    for (const o of st.opts) {
      cards.push(\`<article class="jc open"><header><span class="when">Option ouverte · \${o.kind === 'call' ? 'Call' : 'Put'} \${n2(o.strike)} · \${F.int(o.qty)} contrat\${o.qty > 1 ? 's' : ''} · échéance \${rel(o.expIdx)}</span><span class="res dim">en cours</span></header>\${o.entries.map((e) => entryHTML(e, reveal)).join('')}</article>\`);
    }
    for (const t of st.trades.slice().reverse()) {
      const r = t.r == null ? '' : \` · \${t.r > 0 ? '+' : ''}\${F.num(t.r, 2)} R\`;`);
rep("· ${t.dir === -1 ? 'short · ' : ''}${F.int(t.qty)} ${unitName()} · ${esc(t.reason)}</span>", "· ${esc(tradeLabel(t))} · ${esc(t.reason)}</span>");
rep("key = [st.trades.length, st.pos ? st.pos.entries.length + ':' + st.pos.qty : 'x'].join('|');", "key = [st.trades.length, st.pos ? st.pos.entries.length + ':' + st.pos.qty : 'x', st.opts.map((o) => o.id + ':' + o.qty).join(',')].join('|');");
rep("$('#b-hist').textContent = st.trades.length + (st.pos ? 1 : 0);", "$('#b-hist').textContent = st.trades.length + (st.pos ? 1 : 0) + st.opts.length;");

// onglets
rep("for (const k of ['pos', 'ord', 'hist']) $('#tab-' + k).hidden = k !== t;", "for (const k of ['pos', 'ord', 'hist', 'coach']) $('#tab-' + k).hidden = k !== t;");

// pas de temps et actions manuelles : coup d'œil du coach à chaque fermeture
rep(`    const ev = TA.advance(App.g, App.st);
    App.chart && App.chart.push(App.st);`, `    const nTr = App.st.trades.length;
    const ev = TA.advance(App.g, App.st);
    App.chart && App.chart.push(App.st);`);
rep(`    updateAll(); saveSoon();
    if (ev.some((e) => e.kind === 'end' || e.kind === 'ruin')) endGame();`, `    updateAll(); saveSoon();
    if (App.st.trades.length > nTr) coachToast(nTr);
    if (ev.some((e) => e.kind === 'end' || e.kind === 'ruin')) endGame();`);
rep(`  function afterAction() {
    App.chart && App.chart.refresh(App.st);
    updateAll(); saveSoon();
  }`, `  function afterAction() {
    const nTr = App.lastTrades == null ? App.st.trades.length : App.lastTrades;
    App.chart && App.chart.refresh(App.st);
    updateAll(); saveSoon();
    if (App.st.trades.length > nTr) coachToast(nTr);
    App.lastTrades = App.st.trades.length;
  }`);

// écran de fin : bilan du coach avant la discipline
rep("      ${disciplineHTML(App.endInfo)}", "      ${coachGameHTML()}\n      ${disciplineHTML(App.endInfo)}");

// sélection initiale
rep("    setSide('buy'); setType('market');\n  }", "    App.t.inst = 'base'; App.lastTrades = st.trades.length; App.coachAI = {}; App.coachKey = '';\n    setSide('buy'); setType('market');\n  }");
fs.writeFileSync(f, s);
console.log('ok');
