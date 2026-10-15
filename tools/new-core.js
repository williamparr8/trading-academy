  /* ---------- État de la partie ---------- */
  // `maxLev` : levier maximal choisi au départ (doit être permis par le marché et le niveau, sinon ×1).
  TA.newState = (g, rulesId, level, maxLev) => {
    const lv = Number.isInteger(level) && level >= 1 && level <= TA.LEVELS.length ? level : 1;
    return {
      idx: g.startIdx, cash: CFG.START_CASH, pos: null, orders: [], trades: [], fills: [],
      equity: [CFG.START_CASH], nextId: 1, closed: false, log: [], rules: TA.rulesOf(rulesId),
      level: lv,
      maxLev: TA.leverChoices(g.market, lv).includes(maxLev) ? maxLev : 1,
      call: null,          // appel de marge en cours : { idx } = barre où il a été lancé
      ruined: false,       // compte épuisé : la partie s'arrête
      disc: { noStop: 0, widened: 0, overRisk: 0 },   // entorses à la discipline (possibles seulement en mode conseillé)
    };
  };

  // Peut-on vendre à découvert ? Dépend du niveau, du marché et (en crypto) du levier choisi.
  TA.shortCheck = function (g, st) {
    const lv = st.level || 1, base = TA.canUse(lv, 'short');
    if (!base.ok) return base;
    if ((g.market || 'stock') === 'crypto') {
      if (!TA.canUse(lv, 'cryptoLeverage').ok) return { ok: false, why: 'Vente à découvert en crypto : réservée au niveau Avancé, avec du levier.' };
      if ((st.maxLev || 1) < 2) return { ok: false, why: 'Vente à découvert en crypto : choisis un levier d’au moins ×2 au départ de la partie.' };
    }
    return { ok: true };
  };

  // Prix de liquidation : prix où le compte tomberait au niveau de liquidation (stop-out). null si aucun risque de liquidation.
  TA.liqPrice = function (g, st) {
    const p = st.pos;
    if (!p) return null;
    const m2 = TA.marginLevels(st).stopOut;
    if (p.dir === 1) { const x = -st.cash / (p.qty * (1 - m2)); return x > 0 ? x : null; }   // long : cash + Q·p = m2·Q·p
    return st.cash / (p.qty * (1 + m2));                                                     // short : cash − Q·p = m2·Q·p
  };

  const openVerb = (dir) => (dir === 1 ? 'Acheté' : 'Vendu à découvert');
  const closeVerb = (dir) => (dir === 1 ? 'Vendu' : 'Racheté');   // dir = sens de la position fermée

  // Ouvre ou augmente une position dans le sens `dir` (1 long, −1 short).
  function execOpen(g, st, dir, qty, px, o) {
    const fee = TA.fee(g, qty, px), j = (o && o.j) || cleanJ(null);
    st.cash += (dir === 1 ? -qty * px : qty * px) - fee;
    if (!st.pos) st.pos = { dir, qty: 0, avg: 0, fees: 0, sl: null, tp: null, openIdx: st.idx, lastEntryIdx: st.idx, entries: [], risk0: 0 };
    const p = st.pos;
    p.avg = (p.avg * p.qty + px * qty) / (p.qty + qty);
    p.qty += qty; p.fees += fee; p.lastEntryIdx = st.idx;
    if (o && o.sl != null) p.sl = o.sl;
    if (o && o.tp != null) p.tp = o.tp;
    p.entries.push({ idx: st.idx, qty, px, reason: j.reason, emotion: j.emotion, note: j.note });
    if (p.sl != null) p.risk0 += Math.max(0, dir * qty * (px - p.sl)) + 2 * fee;   // base du multiple R
    st.fills.push({ idx: st.idx, side: dir === 1 ? 'buy' : 'sell', qty, px });
    return { qty, px, fee };
  }
  // Ferme tout ou partie de la position.
  function execClose(g, st, qty, px, reason) {
    const p = st.pos, d = p.dir;
    qty = Math.min(qty, p.qty);
    const frac = qty / p.qty, fee = TA.fee(g, qty, px), entryFees = p.fees * frac, risk0 = p.risk0 * frac;
    st.cash += (d === 1 ? qty * px : -qty * px) - fee;
    const net = d * (px - p.avg) * qty - entryFees - fee;
    st.trades.push({
      id: st.nextId++, dir: d, openIdx: p.openIdx, closeIdx: st.idx, qty, entry: p.avg, exit: px, fees: entryFees + fee, net, ret: net / (p.avg * qty), reason,
      entries: p.entries.map((e) => ({ ...e })), risk0, r: risk0 > 0 ? net / risk0 : null, note: '',
    });
    p.qty -= qty; p.fees -= entryFees; p.risk0 -= risk0;
    if (p.qty <= 1e-9) st.pos = null;
    st.fills.push({ idx: st.idx, side: d === 1 ? 'sell' : 'buy', qty, px });
    return { qty, px, fee, net };
  }

  // Soumet un ordre : {side:'buy'|'sell', type:'market'|'limit'|'stop', qty, price, sl, tp, j}
  // Acheter ouvre un long (ou couvre un short) ; vendre ferme un long (ou ouvre un short).
  TA.submit = function (g, st, o) {
    const fail = (error) => ({ ok: false, error });
    if (st.closed) return fail('La partie est terminée.');
    const i = st.idx, last = g.c[i], hs = TA.halfSpread(g, i), qty = o.qty, dir = o.side === 'buy' ? 1 : -1;
    const u = (n) => TA.unit(g, n);
    if (!Number.isInteger(qty) || qty < 1) return fail(`Entre une quantité entière d’au moins 1 ${u(1)}.`);
    const p = st.pos, closing = !!p && p.dir !== dir;
    if (closing && qty > p.qty) return fail(`Tu as ${p.qty} ${u(p.qty)} en position ${p.dir === 1 ? 'longue' : 'courte'} : un ordre ne peut pas inverser ta position. Ferme-la d’abord.`);
    if (!p && dir === -1) {
      const sc = TA.shortCheck(g, st);
      if (!sc.ok) return fail(`Tu n’as aucune position à vendre. ${sc.why}`);
    }
    if (o.type !== 'market') {
      const pr = o.price;
      if (!(pr > 0)) return fail('Entre un prix valide.');
      if (o.side === 'buy' && o.type === 'limit' && pr >= last) return fail(`Une limite d’achat se place sous le prix actuel (${money(last)}). Pour acheter tout de suite, utilise « Marché ».`);
      if (o.side === 'buy' && o.type === 'stop' && pr <= last) return fail(`Un stop d’achat se place au-dessus du prix actuel (${money(last)}).`);
      if (o.side === 'sell' && o.type === 'limit' && pr <= last) return fail(`Une limite de vente se place au-dessus du prix actuel (${money(last)}). Pour vendre tout de suite, utilise « Marché ».`);
      if (o.side === 'sell' && o.type === 'stop' && pr >= last) return fail(`Un stop de vente se place sous le prix actuel (${money(last)}).`);
    }
    const ref = o.type === 'market' ? last * (1 + dir * hs) : o.price;
    const rules = st.rules || TA.rulesOf('soft');
    let j = null, overRisk = false;
    if (!closing) {
      if (dir === 1) {
        if (o.sl != null && !(o.sl > 0 && o.sl < Math.min(ref, last))) return fail('Le stop-loss doit être sous le prix d’entrée.');
        if (o.tp != null && !(o.tp > ref)) return fail('Le take-profit doit être au-dessus du prix d’entrée.');
      } else {
        if (o.sl != null && !(o.sl > Math.max(ref, last))) return fail('Pour une vente à découvert, le stop-loss doit être au-dessus du prix d’entrée.');
        if (o.tp != null && !(o.tp > 0 && o.tp < ref)) return fail('Pour une vente à découvert, l’objectif doit être sous le prix d’entrée.');
      }
      const mq = TA.maxQty(g, st, ref, dir);
      if (qty > mq) {
        if ((st.maxLev || 1) > 1) return fail(`Marge insuffisante : avec un levier de ×${st.maxLev}, tu peux ${dir === 1 ? 'acheter' : 'vendre à découvert'} au plus ${mq} ${u(mq)}.`);
        return fail(dir === 1 ? `Liquidités insuffisantes : tu peux acheter au plus ${mq} ${u(mq)} (${money(st.cash)} disponibles).` : `Marge insuffisante : tu peux vendre à découvert au plus ${mq} ${u(mq)}.`);
      }
      j = cleanJ(o.j);
      if (rules.mode === 'block') {
        if (o.sl == null) return fail('Gestion du risque obligatoire : place un stop-loss avant d’ouvrir une position.');
        const { pct } = TA.riskOf(g, st, qty, ref, o.sl, dir);
        if (pct > rules.max + 1e-12) {
          const s = TA.sizeForRisk(g, st, ref, o.sl, rules.max, dir);
          return fail(`Risque trop élevé : ${TA.fmt.pct(pct)} du compte pour un maximum de ${TA.fmt.pct(rules.max)}. ` +
            (s.qty > 0 ? `Avec ce stop, la taille maximale est de ${s.qty} ${u(s.qty)}.` : 'Rapproche ton stop du prix d’entrée.'));
        }
        if (!j.reason || !j.emotion) return fail('Journal obligatoire : choisis la raison de l’entrée et ton émotion.');
      } else if (o.sl != null) {
        overRisk = TA.riskOf(g, st, qty, ref, o.sl, dir).pct > rules.max + 1e-12;
      }
      // en mode conseillé tout est permis, mais les entorses sont comptées pour la progression de niveau
      const d = st.disc || (st.disc = { noStop: 0, widened: 0, overRisk: 0 });
      if (o.sl == null) d.noStop++;
      if (overRisk) d.overRisk++;
    }
    const entry = { i, a: o.side, t: o.type, q: qty };
    if (o.price != null) entry.p = o.price;
    if (o.sl != null) entry.sl = o.sl;
    if (o.tp != null) entry.tp = o.tp;
    if (j) entry.j = j;
    if (o.type === 'market') {
      if (closing) {
        const f = execClose(g, st, qty, last * (1 + dir * hs), p.dir === 1 ? 'Vente au marché' : 'Rachat au marché');
        st.log.push(entry);
        return { ok: true, msg: `${closeVerb(-dir)} ${f.qty} à ${money(f.px)} · P&L net ${TA.fmt.smoney(f.net)}` };
      }
      const f = execOpen(g, st, dir, qty, ref, { sl: o.sl, tp: o.tp, j });
      st.log.push(entry);
      return { ok: true, msg: `${openVerb(dir)} ${f.qty} à ${money(f.px)} (frais ${money(f.fee)})` };
    }
    st.orders.push({ id: st.nextId++, side: o.side, type: o.type, qty, price: o.price, sl: closing ? null : o.sl ?? null, tp: closing ? null : o.tp ?? null, idx: i, j, intent: closing ? 'close' : 'open' });
    st.log.push(entry);
    return { ok: true, msg: 'Ordre placé : il sera exécuté si le prix atteint ton niveau.' };
  };

  // Note personnelle ajoutée après coup à une transaction fermée (« ce que j'en retiens »).
  TA.setNote = function (st, id, text) {
    const t = st.trades.find((x) => x.id === id);
    if (!t) return false;
    t.note = String(text || '').slice(0, 300);
    return true;
  };

  TA.cancelOrder = function (st, id) {
    const n = st.orders.length;
    st.orders = st.orders.filter((o) => o.id !== id);
    if (st.orders.length !== n) st.log.push({ i: st.idx, a: 'cancel', id });
    return st.orders.length !== n;
  };

  // Modifie le stop-loss / take-profit de la position (null = retirer). Long : stop dessous, objectif dessus ; short : l'inverse.
  TA.setExits = function (g, st, sl, tp) {
    const p = st.pos;
    if (!p) return { ok: false, error: 'Aucune position ouverte.' };
    const last = g.c[st.idx], long = p.dir === 1, pre = long ? '' : 'Pour une vente à découvert, ';
    if (sl != null && !(sl > 0 && (long ? sl < last : sl > last))) return { ok: false, error: `${pre}le stop-loss doit être ${long ? 'sous' : 'au-dessus de'} le prix actuel (${money(last)}).`.replace(/^./, (c) => c.toUpperCase()) };
    if (tp != null && !(tp > 0 && (long ? tp > last : tp < last))) return { ok: false, error: `${pre}l’objectif doit être ${long ? 'au-dessus du' : 'sous le'} prix actuel (${money(last)}).`.replace(/^./, (c) => c.toUpperCase()) };
    const widens = p.sl != null && (sl == null || (long ? sl < p.sl - 1e-9 : sl > p.sl + 1e-9));
    if (st.rules && st.rules.mode === 'block') {
      if (sl == null) return { ok: false, error: 'Gestion du risque obligatoire : la position doit garder un stop-loss.' };
      if (widens) return { ok: false, error: `Tu peux rapprocher ton stop, pas l’éloigner (actuellement ${money(p.sl)}).` };
    }
    if (widens) {   // stop éloigné ou retiré (permis seulement en mode conseillé, mais compté)
      const d = st.disc || (st.disc = { noStop: 0, widened: 0, overRisk: 0 });
      d.widened++;
    }
    p.sl = sl; p.tp = tp;
    st.log.push({ i: st.idx, a: 'exits', sl, tp });
    return { ok: true, msg: 'Niveaux de sortie mis à jour.' };
  };

  // Passe à la barre suivante : ordres en attente, stops et objectifs, puis marge (liquidation, appel de marge).
  TA.advance = function (g, st) {
    if (st.closed || st.idx >= g.endIdx) return [];
    const ev = [];
    st.idx++;
    const i = st.idx, hs = TA.halfSpread(g, i), O = g.o[i], H = g.h[i], L = g.l[i], u = (n) => TA.unit(g, n);

    for (const od of st.orders.slice()) {
      const dir = od.side === 'buy' ? 1 : -1, intent = od.intent || (od.side === 'sell' ? 'close' : 'open');
      const drop = (msg) => { st.orders = st.orders.filter((x) => x.id !== od.id); ev.push({ kind: 'cancel', msg }); };
      if (intent === 'close' && (!st.pos || st.pos.dir === dir)) { drop('Ordre annulé : plus aucune position à fermer.'); continue; }
      let px = null;
      if (od.side === 'buy') {
        if (od.type === 'limit' && L <= od.price) px = Math.min(od.price, O);
        else if (od.type === 'stop' && H >= od.price) px = Math.max(od.price, O) * (1 + hs);
      } else if (od.type === 'limit' && H >= od.price) px = Math.max(od.price, O);
      else if (od.type === 'stop' && L <= od.price) px = Math.min(od.price, O) * (1 - hs);
      if (px == null) continue;
      st.orders = st.orders.filter((x) => x.id !== od.id);
      if (intent === 'close') {
        const pd = st.pos.dir, f = execClose(g, st, Math.min(od.qty, st.pos.qty), px, od.type === 'limit' ? 'Ordre limite' : 'Ordre stop');
        ev.push({ kind: 'fill', side: od.side, msg: `Ordre exécuté : ${closeVerb(pd).toLowerCase()} ${f.qty} à ${money(f.px)} · ${TA.fmt.smoney(f.net)}` });
      } else {
        if (st.pos && st.pos.dir !== dir) { ev.push({ kind: 'cancel', msg: 'Ordre annulé : ta position a changé de sens.' }); continue; }
        if (od.qty > TA.maxQty(g, st, px, dir)) { ev.push({ kind: 'cancel', msg: 'Ordre annulé : marge ou liquidités insuffisantes.' }); continue; }
        const f = execOpen(g, st, dir, od.qty, px, od);
        ev.push({ kind: 'fill', side: od.side, msg: `Ordre exécuté : ${openVerb(dir).toLowerCase()} ${f.qty} à ${money(f.px)}` });
      }
    }

    const p = st.pos;
    if (p) {
      const d = p.dir, justOpened = p.lastEntryIdx === i;   // même barre : on suppose le pire, le stop passe avant l'objectif
      let hit = null;
      if (d === 1) {
        if (p.sl != null && L <= p.sl) hit = { px: Math.min(p.sl, O) * (1 - hs), reason: 'Stop-loss', stop: true };
        else if (p.tp != null && !justOpened && H >= p.tp) hit = { px: Math.max(p.tp, O), reason: 'Take-profit' };
      } else if (p.sl != null && H >= p.sl) hit = { px: Math.max(p.sl, O) * (1 + hs), reason: 'Stop-loss', stop: true };
      else if (p.tp != null && !justOpened && L <= p.tp) hit = { px: Math.min(p.tp, O), reason: 'Take-profit' };
      if (hit) {
        const f = execClose(g, st, p.qty, hit.px, hit.reason);
        ev.push({ kind: 'fill', side: d === 1 ? 'sell' : 'buy', stop: !!hit.stop, msg: `${hit.stop ? 'Stop-loss touché' : 'Objectif atteint'} : ${closeVerb(d).toLowerCase()} ${f.qty} à ${money(f.px)} · ${TA.fmt.smoney(f.net)}` });
      }
    }

    // Marge. 1) liquidation immédiate si le prix traverse le prix de liquidation pendant la barre.
    if (st.pos) {
      const q = st.pos, d = q.dir, lp = TA.liqPrice(g, st);
      if (lp != null && (d === 1 ? L <= lp : H >= lp)) {
        const f = execClose(g, st, q.qty, d === 1 ? Math.min(lp, O) * (1 - hs) : Math.max(lp, O) * (1 + hs), 'Liquidation');
        st.call = null;
        ev.push({ kind: 'fill', side: d === 1 ? 'sell' : 'buy', stop: true, msg: `Liquidation forcée : ton compte ne couvrait plus la position (${closeVerb(d).toLowerCase()} ${f.qty} à ${money(f.px)} · ${TA.fmt.smoney(f.net)}).` });
      }
    }
    // 2) appel de marge à la clôture ; s'il n'est pas réglé à la barre suivante, liquidation partielle.
    if (st.pos) {
      const m = TA.metrics(g, st), lv = TA.marginLevels(st), pctTxt = (x) => TA.fmt.pct(x).replace(',00', '');
      if (m.ratio < lv.call) {
        if (st.call && st.call.idx < i) {
          const pd = st.pos.dir, c = g.c[i], keep = Math.min(st.pos.qty - 1, Math.max(0, Math.floor(m.equity / (lv.initial * c))));
          const f = execClose(g, st, st.pos.qty - keep, c * (1 - pd * hs), 'Liquidation');
          st.call = null;
          ev.push({ kind: 'fill', side: pd === 1 ? 'sell' : 'buy', stop: true, msg: `Appel de marge non réglé : liquidation de ${f.qty} ${u(f.qty)} à ${money(f.px)} · ${TA.fmt.smoney(f.net)}.` });
        } else if (!st.call) {
          st.call = { idx: i };
          ev.push({ kind: 'call', msg: `Appel de marge : ton compte ne couvre plus ta position (marge ${pctTxt(m.ratio)}, minimum ${pctTxt(lv.call)}). Réduis-la avant la barre suivante, sinon elle sera liquidée.` });
        }
      } else st.call = null;
    } else st.call = null;

    const eq = TA.metrics(g, st).equity;
    st.equity.push(eq);
    if (eq <= 0) { st.ruined = true; ev.push({ kind: 'ruin', msg: 'Compte épuisé : la partie s’arrête.' }); }
    if (st.idx >= g.endIdx) ev.push({ kind: 'end' });
    return ev;
  };

  // Clôture la partie : liquide la position au dernier cours (avec spread et frais).
  TA.finish = function (g, st) {
    if (st.closed) return;
    if (st.pos) execClose(g, st, st.pos.qty, g.c[st.idx] * (1 - st.pos.dir * TA.halfSpread(g, st.idx)), 'Fin de partie');
    st.orders = [];
    st.call = null;
    st.closed = true;
    st.equity[st.equity.length - 1] = st.cash;
  };

  TA.metrics = function (g, st) {
    const c = g.c[st.idx], p = st.pos, d = p ? p.dir : 0;
    const unreal = p ? d * p.qty * (c - p.avg) - p.fees : 0;
    const realized = st.trades.reduce((s, t) => s + t.net, 0);
    const equity = st.cash + (p ? d * p.qty * c : 0);
    const total = equity - CFG.START_CASH, exposure = p ? p.qty * c : 0;
    return { price: c, equity, cash: st.cash, unreal, realized, total, totalPct: total / CFG.START_CASH, exposure, leverage: exposure > 0 && equity > 0 ? exposure / equity : 0, ratio: exposure > 0 ? equity / exposure : Infinity };
  };

