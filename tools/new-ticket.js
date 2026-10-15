  function setSide(v) {
    App.t.side = v; setSeg($('#t-side'), v);
    refreshTicketChrome(); updateTicket();
  }
  function setType(v) { App.t.type = v; setSeg($('#t-type'), v); refreshTicketChrome(); updateTicket(); }
  function fillJournalSelects() {
    const opt = (list) => '<option value="">Choisir…</option>' + list.map(([id, t]) => `<option value="${id}">${esc(t)}</option>`).join('');
    $('#j-reason').innerHTML = opt(TA.REASONS);
    $('#j-emo').innerHTML = opt(TA.EMOTIONS);
  }
  // En mode obligatoire, chaque ordre repart d'un journal vierge : le choix doit être conscient.
  function resetJournal(force) {
    if (force || App.st.rules.mode === 'block') { $('#j-reason').value = ''; $('#j-emo').value = ''; }
    $('#j-note').value = '';
  }
  // Que ferait un ordre dans le sens choisi ? Acheter ouvre un long ou couvre un short ; vendre ferme un long ou ouvre un short.
  function ticketAction() {
    const st = App.st, g = App.g, dir = App.t.side === 'buy' ? 1 : -1, p = st.pos, closing = !!p && p.dir !== dir;
    let hint, locked = false;
    if (closing) hint = p.dir === 1 ? 'Ferme ta position longue.' : 'Couvre ta vente à découvert : tu rachètes pour fermer ta position.';
    else if (dir === 1) hint = p ? 'Augmente ta position longue.' : 'Ouvre une position longue : tu gagnes si le prix monte.';
    else if (p) hint = 'Augmente ta vente à découvert.';
    else {
      const sc = TA.shortCheck(g, st);
      if (sc.ok) hint = 'Ouvre une vente à découvert : tu gagnes si le prix baisse. Le stop se place au-dessus du prix.';
      else { hint = sc.why; locked = true; }
    }
    return { dir, closing, hint, locked, p };
  }
  // Libellés et champs du ticket selon l'action (sans toucher aux valeurs saisies).
  function ticketChrome() {
    const g = App.g, st = App.st, { type } = App.t, strict = st.rules.mode === 'block', a = ticketAction();
    $('#sl-l').textContent = strict ? 'Stop-loss (obligatoire)' : 'Stop-loss';
    $('#t-sl').placeholder = strict ? 'Obligatoire' : 'Facultatif';
    $('#j-legend').textContent = strict ? 'Journal de l’ordre (obligatoire)' : 'Journal de l’ordre (facultatif)';
    $('#qty-l').textContent = `Quantité (${TA.MARKETS[g.market].many})`;
    for (const id of ['#f-exits', '#t-size', '#f-journal']) $(id).hidden = a.closing;
    $('#t-act').textContent = a.hint; $('#t-act').className = 'hint' + (a.locked ? ' warn' : '');
    $('#f-price').hidden = type === 'market';
    $('#f-price-l').textContent = type === 'limit' ? 'Prix limite' : 'Prix de déclenchement (stop)';
    const go = $('#t-go'), verb = a.closing ? (a.p.dir === 1 ? 'Vendre' : 'Couvrir') : a.dir === 1 ? 'Acheter' : 'Vendre à découvert';
    go.className = 'btn big ' + (App.t.side === 'buy' ? 'buy' : 'sell');
    go.textContent = verb + (type === 'market' ? ' au marché' : type === 'limit' ? ' (ordre limite)' : ' (ordre stop)');
  }
  function refreshTicketChrome() {
    if (!App.st) return;
    ticketChrome();
    $('#t-err').textContent = '';
  }
  function readTicket() {
    return {
      side: App.t.side, type: App.t.type, qty: parseNum($('#t-qty').value), price: parseNum($('#t-price').value), sl: parseNum($('#t-sl').value), tp: parseNum($('#t-tp').value),
      j: { reason: $('#j-reason').value, emotion: $('#j-emo').value, note: $('#j-note').value.trim() },
    };
  }
  // Calculateur : quantité qui fait risquer X % du compte avec le stop saisi (plafonné par la règle en mode obligatoire).
  function updateSizeBox(o, px, dir) {
    const g = App.g, st = App.st, last = g.c[st.idx], rules = st.rules, txt = $('#sz-txt'), use = $('#sz-use'), box = $('#t-size');
    let pct = parseNum($('#t-risk').value) / 100, note = '';
    use.hidden = true; box.classList.remove('over'); App.sizeQty = 0;
    if (!(pct > 0)) { txt.textContent = 'Entre le risque voulu, par exemple 1.'; return; }
    if (rules.mode === 'block' && pct > rules.max + 1e-12) { pct = rules.max; note = ` (plafonné à ${F.pct(rules.max).replace(',00', '')})`; box.classList.add('over'); }
    else if (rules.mode === 'warn' && pct > rules.max + 1e-12) box.classList.add('over');
    const ref = px || last * (1 + dir * TA.halfSpread(g, st.idx));
    const okSl = dir === 1 ? o.sl > 0 && o.sl < Math.min(ref, last) : o.sl > Math.max(ref, last);
    if (!okSl) { txt.textContent = dir === 1 ? 'Entre un stop-loss pour calculer la taille.' : 'Entre un stop-loss (au-dessus du prix) pour calculer la taille.'; return; }
    const s = TA.sizeForRisk(g, st, ref, o.sl, pct, dir), mk = TA.MARKETS[g.market];
    App.sizeQty = s.qty;
    txt.textContent = s.qty > 0 ? `= ${F.int(s.qty)} ${s.qty === 1 ? mk.one : mk.many}${s.cashLimited ? (st.maxLev > 1 ? ' (limité par ta marge)' : ' (limité par tes liquidités)') : ''}${note}` : `Aucune ${mk.one} : ce stop est trop loin pour ce risque.`;
    use.hidden = s.qty < 1;
  }
  function updateTicket() {
    const g = App.g, st = App.st; if (!g || !st) return;
    ticketChrome();
    const o = readTicket(), i = st.idx, last = g.c[i], hs = TA.halfSpread(g, i), m = TA.metrics(g, st), a = ticketAction(), dir = a.dir, mk = TA.MARKETS[g.market];
    const q = Number.isInteger(o.qty) && o.qty > 0 ? o.qty : null;
    const px = o.type === 'market' ? last * (1 + dir * hs) : o.price > 0 ? o.price : null;
    const row = (k, v, c = '') => `<div><dt>${k}</dt><dd class="${c}">${v}</dd></div>`;
    let html = '';
    if (!q || !px) {
      html = row('Prix estimé', px ? F.money(px) : '—') + row('Montant', '—');
    } else {
      const fee = TA.fee(g, q, px), amt = q * px;
      html += row(o.type === 'market' ? 'Prix estimé (spread inclus)' : 'Prix demandé', F.money(px)) + row('Montant', F.money(amt)) + row('Frais', F.money(fee));
      if (!a.closing) {
        const same = st.pos ? st.pos.qty : 0, eqAfter = m.equity - q * Math.abs(px - last) - fee, expo = same * last + q * px;
        html += row('Part du compte', F.pct(amt / m.equity));
        if (st.maxLev > 1 || dir === -1) html += row('Levier après l’ordre', '×' + F.num(eqAfter > 0 ? expo / eqAfter : 99, 2) + (st.maxLev > 1 ? ' (max ×' + st.maxLev + ')' : ''));
        const mq = TA.maxQty(g, st, px, dir);
        if (q > mq) html += `<div class="risk over"><dt>${st.maxLev > 1 ? 'Marge insuffisante' : dir === 1 ? 'Liquidités insuffisantes' : 'Marge insuffisante'}</dt><dd class="warn">maximum : ${F.int(mq)} ${mq === 1 ? mk.one : mk.many}</dd></div>`;
        const sl = dir === 1 ? (o.sl > 0 && o.sl < Math.min(px, last) ? o.sl : null) : (o.sl > Math.max(px, last) ? o.sl : null);
        const tp = dir === 1 ? (o.tp > px ? o.tp : null) : (o.tp > 0 && o.tp < px ? o.tp : null);
        if (sl) {
          const { risk, pct: rp } = TA.riskOf(g, st, q, px, sl, dir), max = st.rules.max, over = rp > max + 1e-12, maxTxt = F.pct(max).replace(',00', '');
          html += `<div class="risk${over ? ' over' : ''}"><dt>Risque si le stop est touché</dt><dd class="neg">${F.money(-risk)} · ${F.pct(rp)} du compte${over ? (st.rules.mode === 'block' ? ` · bloqué (max ${maxTxt})` : ` · au-delà de ${maxTxt}`) : ''}</dd></div>`;
          if (tp) {
            const own = dir * (px - sl) * q + 2 * fee, reward = dir * (tp - px) * q - 2 * fee;
            html += row('Gain si l’objectif est atteint', F.smoney(reward), 'pos') + row('Rendement / risque', '1 : ' + F.num(reward / own, 2), reward / own >= 2 ? 'pos' : reward / own < 1 ? 'warn' : '');
          }
        } else {
          html += st.rules.mode === 'block'
            ? `<div class="risk over"><dt>Stop-loss obligatoire</dt><dd class="warn">place un stop pour ouvrir</dd></div>`
            : `<div class="risk"><dt>Sans stop-loss</dt><dd class="warn">perte non limitée</dd></div>`;
        }
      } else if (q <= a.p.qty) {
        const pd = a.p.dir, net = pd * (px - a.p.avg) * q - (a.p.fees * q) / a.p.qty - fee;
        html += row(pd === 1 ? 'Produit net' : 'Coût du rachat', F.money(pd === 1 ? amt - fee : amt + fee)) + row('P&L réalisé estimé', F.smoney(net), cls(net));
      }
    }
    $('#t-est').innerHTML = html;
    if (!a.closing) updateSizeBox(o, px, dir);
  }
  function quickQty(p) {
    const g = App.g, st = App.st, o = readTicket(), a = ticketAction(), last = g.c[st.idx], hs = TA.halfSpread(g, st.idx);
    if (a.closing) return Math.max(1, p === 1 ? a.p.qty : Math.floor(a.p.qty * p));
    const px = o.type === 'market' || !(o.price > 0) ? last * (1 + a.dir * hs) : o.price;
    return Math.max(0, p === 1 ? TA.maxQty(g, st, px, a.dir) : Math.floor(TA.maxQty(g, st, px, a.dir) * p));
  }
  function submitTicket() {
    const err = $('#t-err'); err.textContent = '';
    const o = readTicket(), a = ticketAction();
    if ([o.price, o.sl, o.tp].some(Number.isNaN)) { err.textContent = 'Un des prix saisis n’est pas un nombre valide.'; return; }
    if (a.closing) { o.sl = null; o.tp = null; }
    if (o.type === 'market') o.price = null;
    const r = TA.submit(App.g, App.st, o);
    if (!r.ok) { err.textContent = r.error; return; }
    toast(r.msg, 'ok');
    $('#t-price').value = $('#t-sl').value = $('#t-tp').value = '';
    resetJournal();
    afterAction();
  }
