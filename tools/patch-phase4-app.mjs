// Applique les modifications de la phase 4 à trading/js/app.js (remplacements exacts, échoue si un repère manque).
import fs from 'node:fs';
const f = 'trading/js/app.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 80)); s = s.replace(a, b); };

// 1) ticket : instrument marché / options
rep(`    const go = $('#t-go'), verb = a.closing ? (a.p.dir === 1 ? 'Vendre' : 'Couvrir') : a.dir === 1 ? 'Acheter' : 'Vendre à découvert';
    go.className = 'btn big ' + (App.t.side === 'buy' ? 'buy' : 'sell');
    go.textContent = verb + (type === 'market' ? ' au marché' : type === 'limit' ? ' (ordre limite)' : ' (ordre stop)');
  }`, `    const go = $('#t-go'), verb = a.closing ? (a.p.dir === 1 ? 'Vendre' : 'Couvrir') : a.dir === 1 ? 'Acheter' : 'Vendre à découvert';
    go.className = 'btn big ' + (App.t.side === 'buy' ? 'buy' : 'sell');
    go.textContent = verb + (type === 'market' ? ' au marché' : type === 'limit' ? ' (ordre limite)' : ' (ordre stop)');
    // instrument : sous-jacent ou options
    const can = TA.canUse(st.level || 1, 'options'), opt = App.t.inst === 'opt' && can.ok;
    if (!can.ok) App.t.inst = 'base';
    $('#inst-opt').disabled = !can.ok; $('#inst-opt').title = can.ok ? '' : can.why;
    setSeg($('#t-inst'), opt ? 'opt' : 'base');
    $('#opt-panel').hidden = !opt;
    for (const id of ['#t-side', '#t-act', '#t-type', '#f-qty', '#t-quick', '#t-est']) $(id).hidden = opt;
    if (opt) {
      for (const id of ['#f-price', '#f-exits', '#t-size']) $(id).hidden = true;
      $('#f-journal').hidden = false;
      go.className = 'btn big buy'; go.textContent = 'Acheter l’option';
    }
  }`);

// 2) updateTicket : en mode options, panneau dédié
rep(`    const g = App.g, st = App.st; if (!g || !st) return;
    ticketChrome();
    const o = readTicket(),`, `    const g = App.g, st = App.st; if (!g || !st) return;
    ticketChrome();
    if (App.t.inst === 'opt') { updateOptPanel(); return; }
    const o = readTicket(),`);

// 3) soumission
rep(`  function submitTicket() {
    const err = $('#t-err'); err.textContent = '';`, `  function submitTicket() {
    if (App.t.inst === 'opt') { submitOption(); return; }
    const err = $('#t-err'); err.textContent = '';`);

// 4) position principale dans #pos-main
rep(`const st = App.st, p = st.pos, box = $('#tab-pos');`, `const st = App.st, p = st.pos, box = $('#pos-main');`);
fs.writeFileSync(f, s);
console.log('ok');
