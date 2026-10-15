import fs from 'node:fs';
const f = 'trading/js/app.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 90)); s = s.replace(a, b); };
rep("    if (App.st.trades.length > nTr) coachToast(nTr);\n    if (ev.some((e) => e.kind === 'end' || e.kind === 'ruin')) endGame();", "    if (App.st.trades.length > nTr) coachToast(nTr);\n    App.lastTrades = App.st.trades.length;\n    if (ev.some((e) => e.kind === 'end' || e.kind === 'ruin')) endGame();");
rep("    $('#t-go').onclick = submitTicket;", `    $('#t-go').onclick = submitTicket;
    // options
    bindSeg($('#t-inst'), (v) => { App.t.inst = v; refreshTicketChrome(); updateTicket(); });
    bindSeg($('#o-kind'), (v) => { optSel.kind = v; updateTicket(); });
    $('#o-exp').addEventListener('change', () => { optSel.exp = +$('#o-exp').value; updateTicket(); });
    $('#o-strike').addEventListener('change', () => { optSel.k = +$('#o-strike').value; updateTicket(); });
    $('#o-qty').addEventListener('input', () => { $('#t-err').textContent = ''; updateTicket(); });
    $('#pos-opts').addEventListener('click', (e) => {
      const b = e.target.closest('[data-optsell]'); if (!b) return;
      const r = TA.sellOption(App.g, App.st, +b.dataset.optsell);
      if (!r.ok) { toast(r.error, 'err'); return; }
      toast(r.msg, 'ok'); afterAction();
    });
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-coach-ai]'); if (b) askCoach(b.dataset.coachAi); });`);
rep("    renderResume(); renderProfile(); renderLearnCard();\n    try {", "    renderResume(); renderProfile(); renderLearnCard();\n    detectAI();   // le coach IA n'apparaît que si la page peut interroger Claude\n    try {");
fs.writeFileSync(f, s);
console.log('ok');
