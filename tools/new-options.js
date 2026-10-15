  /* ---------- Options : calls et puts (achat seulement) ---------- */
  CFG.OPT_MULT = 100;    // un contrat porte sur 100 unités du sous-jacent
  CFG.OPT_FEE = 1;       // frais par contrat, à l'achat comme à la vente
  CFG.OPT_RATE = 0.02;   // taux sans risque utilisé pour calculer les primes
  TA.perYear = (g) => (g.style === 'long' ? TA.STYLES.long.perYear : mkt(g).perYear);

  function ncdf(x) {   // loi normale cumulative (Abramowitz et Stegun)
    const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989422804014327 * Math.exp((-x * x) / 2);
    const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? 1 - p : p;
  }
  // Prime théorique (Black-Scholes). T en années. À l'échéance : valeur intrinsèque.
  TA.bs = function (kind, S, K, T, sigma, r) {
    if (T <= 0) return Math.max(0, kind === 'call' ? S - K : K - S);
    const sq = sigma * Math.sqrt(T), d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / sq, d2 = d1 - sq, disc = Math.exp(-r * T);
    return kind === 'call' ? S * ncdf(d1) - K * disc * ncdf(d2) : K * disc * ncdf(-d2) - S * ncdf(-d1);
  };
  // Volatilité annualisée estimée à la barre i avec les 20 dernières barres seulement (aucun regard vers l'avenir).
  TA.volAt = function (g, i) {
    const cache = g._vol || (g._vol = new Map());
    if (cache.has(i)) return cache.get(i);
    const r = [];
    for (let j = i; j > i - 20 && j > 0; j--) r.push(Math.log(g.c[j] / g.c[j - 1]));
    const mean = r.reduce((a, x) => a + x, 0) / (r.length || 1);
    const sd = r.length > 1 ? Math.sqrt(r.reduce((a, x) => a + (x - mean) ** 2, 0) / (r.length - 1)) : 0.01;
    const sigma = Math.min(2, Math.max(0.1, sd * Math.sqrt(TA.perYear(g)) * 1.1));   // 10 % de prime sur la volatilité observée
    cache.set(i, sigma);
    return sigma;
  };
  TA.optionExpiries = (g) => (g.style === 'long' ? [4, 8, 13] : [10, 20, 40]);   // en barres à partir de maintenant
  TA.optionStrikes = function (S) {
    const step = S < 20 ? 0.5 : S < 50 ? 1 : S < 200 ? 2.5 : S < 500 ? 5 : 10;
    return [...new Set([-0.1, -0.05, 0, 0.05, 0.1].map((m) => Math.round((S * (1 + m)) / step) * step))].filter((k) => k > 0);
  };
  // Cotation d'une option à la barre i : prime théorique (mid), prix d'achat (ask) et de vente (bid).
  TA.optionQuote = function (g, i, kind, K, expIdx) {
    const S = g.c[i], T = Math.max(0, (expIdx - i) / TA.perYear(g)), sigma = TA.volAt(g, i);
    const mid = TA.bs(kind, S, K, T, sigma, CFG.OPT_RATE), half = Math.max(0.02, 0.03 * mid);
    let delta = null;
    if (T > 0) { const d1 = (Math.log(S / K) + (CFG.OPT_RATE + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T)); delta = kind === 'call' ? ncdf(d1) : ncdf(d1) - 1; }
    else delta = kind === 'call' ? (S > K ? 1 : 0) : S < K ? -1 : 0;
    return { mid, bid: Math.max(0, mid - half), ask: mid + half, sigma, T, S, delta };
  };
  TA.optionsValue = function (g, st) {
    let v = 0;
    for (const o of st.opts || []) v += o.qty * CFG.OPT_MULT * TA.optionQuote(g, st.idx, o.kind, o.strike, o.expIdx).mid;
    return v;
  };
  function recordOptionTrade(g, st, o, qty, px, reason, withFee = true) {
    const frac = qty / o.qty, fee = withFee ? qty * CFG.OPT_FEE : 0, entryFees = o.fees * frac, risk0 = o.risk0 * frac;
    const net = (px - o.avg) * qty * CFG.OPT_MULT - entryFees - fee;
    st.trades.push({
      id: st.nextId++, kind: 'option', opt: { kind: o.kind, strike: o.strike, expIdx: o.expIdx }, dir: 1, openIdx: o.openIdx, closeIdx: st.idx, qty, entry: o.avg, exit: px,
      fees: entryFees + fee, net, ret: net / (o.avg * qty * CFG.OPT_MULT), reason, entries: o.entries.map((e) => ({ ...e })), risk0, r: risk0 > 0 ? net / risk0 : null, note: '',
    });
    o.qty -= qty; o.fees -= entryFees; o.risk0 -= risk0;
    if (o.qty <= 0) st.opts = st.opts.filter((x) => x.id !== o.id);
    return { net, fee };
  }

  // Achat d'une option : {kind:'call'|'put', strike, expIdx, qty, j}. Perte maximale = prime payée + frais.
  TA.buyOption = function (g, st, o) {
    const fail = (error) => ({ ok: false, error });
    if (st.closed) return fail('La partie est terminée.');
    const can = TA.canUse(st.level || 1, 'options');
    if (!can.ok) return fail(can.why);
    const i = st.idx, qty = o.qty;
    if (!Number.isInteger(qty) || qty < 1) return fail('Entre un nombre entier de contrats, au moins 1.');
    if (o.kind !== 'call' && o.kind !== 'put') return fail('Choisis un call ou un put.');
    if (!TA.optionStrikes(g.c[i]).some((k) => Math.abs(k - o.strike) < 1e-6)) return fail('Ce prix d’exercice n’est pas offert : choisis-en un dans la liste.');
    if (!TA.optionExpiries(g).includes(o.expIdx - i)) return fail('Cette échéance n’est pas offerte : choisis-en une dans la liste.');
    const q = TA.optionQuote(g, i, o.kind, o.strike, o.expIdx), m = TA.metrics(g, st), rules = st.rules || TA.rulesOf('soft');
    const cost = qty * CFG.OPT_MULT * q.ask, fee = qty * CFG.OPT_FEE, risk = cost + fee, pct = risk / m.equity, j = cleanJ(o.j);
    if (rules.mode === 'block') {
      if (pct > rules.max + 1e-12) {
        const n = Math.floor((rules.max * m.equity) / (CFG.OPT_MULT * q.ask + CFG.OPT_FEE));
        return fail(`Risque trop élevé : la prime représente ${TA.fmt.pct(pct)} du compte pour un maximum de ${TA.fmt.pct(rules.max)}. ${n > 0 ? `Tu peux acheter au plus ${n} contrat${n > 1 ? 's' : ''} de cette option.` : 'Choisis une option moins chère.'}`);
      }
      if (!j.reason || !j.emotion) return fail('Journal obligatoire : choisis la raison de l’entrée et ton émotion.');
    } else if (pct > rules.max + 1e-12) (st.disc || (st.disc = { noStop: 0, widened: 0, overRisk: 0 })).overRisk++;
    if (risk > Math.max(0, st.cash) + 1e-9) return fail(`Liquidités insuffisantes : une option se paie comptant (${money(risk)} requis, ${money(Math.max(0, st.cash))} disponibles).`);
    const after = m.equity - (q.ask - q.mid) * qty * CFG.OPT_MULT - fee;
    if (m.exposure > 0 && after < TA.marginLevels(st).initial * m.exposure) return fail('Marge insuffisante : cet achat laisserait ta position de départ sous la marge exigée.');
    st.cash -= risk;
    let p = st.opts.find((x) => x.kind === o.kind && Math.abs(x.strike - o.strike) < 1e-6 && x.expIdx === o.expIdx);
    if (!p) { p = { id: st.nextId++, kind: o.kind, strike: o.strike, expIdx: o.expIdx, qty: 0, avg: 0, fees: 0, openIdx: i, entries: [], risk0: 0 }; st.opts.push(p); }
    p.avg = (p.avg * p.qty + q.ask * qty) / (p.qty + qty);
    p.qty += qty; p.fees += fee; p.risk0 += risk;
    p.entries.push({ idx: i, qty, px: q.ask, reason: j.reason, emotion: j.emotion, note: j.note });
    st.log.push({ i, a: 'opt', k: o.kind, s: o.strike, e: o.expIdx, q: qty, j });
    return { ok: true, msg: `Acheté ${qty} contrat${qty > 1 ? 's' : ''} ${o.kind === 'call' ? 'call' : 'put'} ${F2(o.strike)} à ${money(q.ask)} la prime (coût ${money(risk)})` };
  };
  const F2 = (x) => TA.fmt.num(x, 2);

  // Vente d'une option détenue au prix acheteur (bid). qty omis = tout.
  TA.sellOption = function (g, st, id, qty) {
    const o = st.opts.find((x) => x.id === id);
    if (!o) return { ok: false, error: 'Cette option n’est plus dans ton portefeuille.' };
    qty = qty == null ? o.qty : qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > o.qty) return { ok: false, error: `Tu détiens ${o.qty} contrat${o.qty > 1 ? 's' : ''}.` };
    const q = TA.optionQuote(g, st.idx, o.kind, o.strike, o.expIdx), kind = o.kind;
    st.cash += qty * CFG.OPT_MULT * q.bid - qty * CFG.OPT_FEE;
    const r = recordOptionTrade(g, st, o, qty, q.bid, 'Vente au marché');
    st.log.push({ i: st.idx, a: 'optsell', id, q: qty });
    return { ok: true, msg: `Vendu ${qty} contrat${qty > 1 ? 's' : ''} ${kind === 'call' ? 'call' : 'put'} à ${money(q.bid)} la prime · P&L net ${TA.fmt.smoney(r.net)}` };
  };
  // Échéances : règlement en espèces à la valeur intrinsèque.
  TA.settleOptions = function (g, st, ev) {
    for (const o of (st.opts || []).slice()) {
      if (o.expIdx > st.idx) continue;
      const S = g.c[st.idx], intrinsic = Math.max(0, o.kind === 'call' ? S - o.strike : o.strike - S), qty = o.qty, kind = o.kind;
      st.cash += qty * CFG.OPT_MULT * intrinsic;
      const r = recordOptionTrade(g, st, o, qty, intrinsic, intrinsic > 0 ? 'Échéance, dans la monnaie' : 'Expirée sans valeur', false);   // pas de frais au règlement
      ev.push({ kind: 'fill', side: 'sell', stop: intrinsic === 0, msg: intrinsic > 0 ? `Option arrivée à échéance : ${kind === 'call' ? 'call' : 'put'} ${F2(o.strike)} réglé ${money(intrinsic)} la prime · ${TA.fmt.smoney(r.net)}` : `Option expirée sans valeur : ${kind === 'call' ? 'call' : 'put'} ${F2(o.strike)}, la prime est perdue · ${TA.fmt.smoney(r.net)}` });
    }
  };

