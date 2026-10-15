/* Trading Academy — mode Gestionnaire de portefeuille.
   Logique pure (aucun accès au DOM) : un client avec un énoncé de politique de placement (EPP), un portefeuille de
   FNB réels et de l'encaisse, une décision par mois (rééquilibrer ou non), puis une évaluation à la façon d'un
   analyste CFA : rendement et risque contre l'indice de politique, conformité aux contraintes, attribution,
   ratios (Sharpe, Sortino, information, alpha de Jensen, capture), frais et rotation.
   Les rendements sont en devise locale de chaque FNB (le change est ignoré) et l'encaisse suit un taux approximatif. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const PM = (TA.PM = {});
  const BARS = 21, DAY = 86400000;
  PM.BARS = BARS;

  // taux à court terme annuel approximatif, par année (sert à l'encaisse et au taux sans risque)
  const RF = { 2005: 0.032, 2006: 0.048, 2007: 0.045, 2008: 0.015, 2009: 0.0015, 2010: 0.0015, 2011: 0.0005, 2012: 0.001, 2013: 0.001, 2014: 0.001, 2015: 0.002, 2016: 0.0035, 2017: 0.009, 2018: 0.019, 2019: 0.021, 2020: 0.004, 2021: 0.0005, 2022: 0.02, 2023: 0.051, 2024: 0.05, 2025: 0.042, 2026: 0.038 };
  const rfAt = (day) => { const v = RF[new Date(day * DAY).getUTCFullYear()]; return v == null ? 0.03 : v; };
  PM.rfAt = rfAt;

  PM.ASSETS = [
    { id: 'SPY', name: 'Actions américaines', sub: 'FNB S&P 500', cls: 'equity', cost: 0.0003 },
    { id: 'QQQ', name: 'Technologie américaine', sub: 'FNB Nasdaq-100', cls: 'equity', cost: 0.0004 },
    { id: 'IWM', name: 'Petites capitalisations', sub: 'FNB Russell 2000', cls: 'equity', cost: 0.0008 },
    { id: 'XIU_TO', name: 'Actions canadiennes', sub: 'FNB S&P/TSX 60', cls: 'equity', cost: 0.0006 },
    { id: 'XEG_TO', name: 'Énergie canadienne', sub: 'FNB S&P/TSX énergie', cls: 'equity', cost: 0.0015 },
    { id: 'GLD', name: 'Or', sub: 'FNB or physique', cls: 'real', cost: 0.0008 },
    { id: 'TLT', name: 'Obligations longues', sub: 'FNB Trésor 20 ans et plus', cls: 'bond', cost: 0.0006 },
    { id: 'CASH', name: 'Encaisse', sub: 'Taux à court terme', cls: 'cash', cost: 0 },
  ];
  const A = Object.fromEntries(PM.ASSETS.map((a) => [a.id, a]));
  PM.RISKY = PM.ASSETS.filter((a) => a.id !== 'CASH').map((a) => a.id);
  PM.ALL = PM.ASSETS.map((a) => a.id);
  PM.info = (id) => A[id];

  PM.SCENARIOS = [
    { id: 'random', name: 'Période aléatoire' },
    { id: 'krach2008', name: 'Krach de 2008', day: Math.floor(Date.UTC(2007, 8, 1) / DAY) },
    { id: 'covid', name: 'Pandémie de 2020', day: Math.floor(Date.UTC(2019, 7, 1) / DAY) },
    { id: 'taux2022', name: 'Hausse des taux de 2022', day: Math.floor(Date.UTC(2021, 9, 1) / DAY) },
    { id: 'calme', name: 'Marché haussier (2012)', day: Math.floor(Date.UTC(2012, 0, 3) / DAY) },
  ];

  // Mandats : un client, un énoncé de politique, un indice de politique (poids fixes), des contraintes, des événements.
  PM.MANDATES = [
    { id: 'retraitee', name: 'Retraitée prudente', client: 'Lise Tremblay, 67 ans, retraitée', start: 100000, horizon: 60, flow: -500,
      blurb: 'Elle vit de son épargne : préserver le capital, financer 500 $ de retraits par mois et dormir tranquille.',
      objective: { type: 'abs', ret: 0.035, text: 'Rendement annualisé d’au moins 3,5 %, retraits payés' },
      bench: { SPY: 0.2, XIU_TO: 0.1, TLT: 0.35, GLD: 0.05, CASH: 0.3 },
      cons: [{ k: 'maxDD', v: 0.12 }, { k: 'maxEquity', v: 0.4 }, { k: 'minCash', v: 0.05 }, { k: 'maxPos', v: 0.3 }],
      events: [
        { m: 18, text: 'Mme Tremblay doit refaire son toit : retrait exceptionnel de 8 000 $ ce mois-ci.', once: -8000 },
        { m: 36, text: 'Ses dépenses augmentent : les retraits passent à 800 $ par mois.', setFlow: -800 },
      ] },
    { id: 'jeune', name: 'Jeune professionnel', client: 'Alex Gagnon, 32 ans, ingénieur', start: 50000, horizon: 60, flow: 1000,
      blurb: 'Il cotise 1 000 $ par mois et vise la croissance sur 25 ans, mais il achètera une maison d’ici quelques années.',
      objective: { type: 'rel', text: 'Battre l’indice de politique, frais déduits' },
      bench: { SPY: 0.4, QQQ: 0.1, XIU_TO: 0.2, TLT: 0.2, GLD: 0.05, CASH: 0.05 },
      cons: [{ k: 'maxDD', v: 0.35 }, { k: 'maxPos', v: 0.4 }, { k: 'minCash', v: 0.02 }],
      events: [
        { m: 24, text: 'Alex reçoit une prime : cotisation exceptionnelle de 15 000 $.', once: 15000 },
        { m: 40, text: 'Il achète une maison dans deux ans : sa tolérance à la perte baisse, plafond ramené à 20 %.', setCons: { maxDD: 0.2 } },
      ] },
    { id: 'fondation', name: 'Fondation étudiante', client: 'Fondation Lumière, fonds de dotation de 250 000 $', start: 250000, horizon: 60, flow: -1000,
      blurb: 'Elle verse des bourses chaque mois et doit protéger le pouvoir d’achat du fonds. Son conseil exclut les énergies fossiles.',
      objective: { type: 'abs', ret: 0.065, text: 'Rendement annualisé d’au moins 6,5 % (inflation plus 4 %)' },
      bench: { SPY: 0.3, XIU_TO: 0.15, IWM: 0.05, TLT: 0.3, GLD: 0.1, CASH: 0.1 },
      cons: [{ k: 'maxDD', v: 0.22 }, { k: 'maxPos', v: 0.3 }, { k: 'ban', ids: ['XEG_TO'] }, { k: 'minCash', v: 0.03 }],
      events: [
        { m: 20, text: 'Le conseil adopte une politique plus prudente : au plus 55 % en actions.', setCons: { maxEquity: 0.55 }, addCons: [{ k: 'maxEquity', v: 0.55 }] },
        { m: 42, text: 'Une campagne de dons ajoute 40 000 $ au fonds.', once: 40000 },
      ] },
    { id: 'regime', name: 'Régime de retraite (gestion active)', client: 'Régime de retraite des employés municipaux, 1 M$', start: 1000000, horizon: 60, flow: 0,
      blurb: 'Le comité vous confie la gestion active : faire mieux que l’indice 60/40 sans vous en éloigner trop.',
      objective: { type: 'rel', text: 'Battre l’indice 60/40, frais déduits, avec une erreur de suivi contrôlée' },
      bench: { SPY: 0.35, XIU_TO: 0.25, TLT: 0.4 },
      cons: [{ k: 'maxActive', v: 0.15 }, { k: 'maxTE', v: 0.05 }, { k: 'maxDD', v: 0.25 }],
      events: [
        { m: 30, text: 'Le comité resserre le risque actif : erreur de suivi maximale ramenée à 3 %.', setCons: { maxTE: 0.03 } },
      ] },
  ];
  PM.saaOf = (m) => m.saa || m.bench;

  /* ---------- outils ---------- */
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const pct = (v) => { const p = v * 100; return (Math.abs(p - Math.round(p)) < 0.05 ? String(Math.round(p)) : p.toFixed(1).replace('.', ',')) + ' %'; };
  PM.pct = pct;
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // cotes alignées sur le calendrier de SPY, avec report de la dernière cote connue
  PM.align = function (mt, t, c) {
    const out = new Float64Array(mt.length);
    let j = 0, last = NaN;
    for (let i = 0; i < mt.length; i++) {
      while (j < t.length && t[j] <= mt[i]) { last = c[j]; j++; }
      out[i] = last;
    }
    return out;
  };

  PM.build = function (mand, series, opts = {}) {
    const mt = series.SPY.t, n = mt.length, N = mand.horizon, px = {};
    for (const id of PM.RISKY) px[id] = PM.align(mt, series[id].t, series[id].c);
    const lo = 10, hi = n - 1 - N * BARS;
    if (hi <= lo) throw new Error('Pas assez de données pour ce mandat.');
    const sc = PM.SCENARIOS.find((s) => s.id === opts.scenario);
    let start;
    if (sc && sc.day != null) { start = mt.findIndex((d) => d >= sc.day); if (start < 0) start = hi; }
    else start = lo + Math.floor(mulberry(hash((opts.seed || 'academie') + '|' + mand.id))() * (hi - lo + 1));
    start = clamp(start, lo, hi);
    return { mand, N, t: mt, px, start, end: start + N * BARS, scenario: sc ? sc.id : 'random', seed: opts.seed || '' };
  };

  PM.newState = function (g) {
    const m = g.mand, saa = PM.saaOf(m);
    const st = { m: 0, idx: g.start, cash: 0, units: {}, flow: m.flow || 0, cons: JSON.parse(JSON.stringify(m.cons)),
      pidx: [100], bidx: [100], mon: [], trades: [], breach: [], turnover: 0, costs: 0, log: [], vpre: m.start, ended: false, notes: {} };
    for (const id of PM.ALL) {
      const w = saa[id] || 0;
      if (id === 'CASH') st.cash += m.start * w; else if (w > 0) st.units[id] = (m.start * w) / g.px[id][g.start];
    }
    st.log.push({ m: 0, kind: 'info', text: 'Mandat confié : ' + m.client + '. Portefeuille de départ aligné sur la politique.' });
    return st;
  };

  PM.value = function (g, st, idx, cash) {
    const i = idx == null ? st.idx : idx, v = { CASH: cash == null ? st.cash : cash };
    let total = v.CASH;
    for (const id of PM.RISKY) { v[id] = (st.units[id] || 0) * g.px[id][i]; total += v[id]; }
    const w = {};
    for (const id of PM.ALL) w[id] = total > 0 ? v[id] / total : 0;
    return { total, v, w };
  };

  /* ---------- décisions ---------- */
  PM.rebalance = function (g, st, target, note) {
    if (st.ended) return { ok: false, error: 'Le mandat est terminé.' };
    const cur = PM.value(g, st), V = cur.total;
    let sum = 0;
    for (const id of PM.RISKY) {
      const w = Number(target[id]) || 0;
      if (!(w >= 0) || w > 1.0001) return { ok: false, error: 'Un des poids n’est pas valide.' };
      sum += w;
    }
    if (sum > 1.0001) return { ok: false, error: 'Les poids dépassent 100 % : l’encaisse ne peut pas être négative.' };
    let cost0 = 0;
    for (const id of PM.RISKY) cost0 += Math.abs((Number(target[id]) || 0) * V - cur.v[id]) * A[id].cost;
    const base = V - cost0, desired = {};
    let cost = 0, traded = 0, risky = 0;
    for (const id of PM.RISKY) {
      desired[id] = (Number(target[id]) || 0) * base;
      const d = Math.abs(desired[id] - cur.v[id]);
      traded += d; cost += d * A[id].cost; risky += desired[id];
    }
    if (traded < V * 1e-6) return { ok: true, traded: 0, cost: 0, msg: 'Aucun changement : le portefeuille est déjà aux cibles.' };
    for (const id of PM.RISKY) st.units[id] = desired[id] / g.px[id][st.idx];
    st.cash = Math.max(0, V - cost - risky);
    st.turnover += traded; st.costs += cost;
    st.trades.push({ m: st.m, traded, cost, note: String(note || '').slice(0, 200) });
    return { ok: true, traded, cost, msg: `Rééquilibrage exécuté : ${Math.round(traded).toLocaleString('fr-CA')} $ échangés, frais ${cost.toFixed(2).replace('.', ',')} $.` };
  };

  // vente forcée pour combler un manque de liquidités (retrait supérieur à l'encaisse)
  function raise(g, st) {
    if (st.cash >= 0) return;
    const cur = PM.value(g, st);
    const risky = cur.total - st.cash;      // valeur des positions
    if (risky <= 0) { st.cash = 0; return; }
    const need = -st.cash;
    const cAvg = PM.RISKY.reduce((s, id) => s + cur.v[id] * A[id].cost, 0) / risky;
    const f = Math.min(1, need / (risky * (1 - cAvg)));
    let cost = 0;
    for (const id of PM.RISKY) { cost += cur.v[id] * f * A[id].cost; st.units[id] *= 1 - f; }
    st.cash = Math.max(0, risky * f - need - cost);
    st.costs += cost; st.turnover += risky * f;
    st.log.push({ m: st.m, kind: 'warn', text: `Vente forcée de ${Math.round(risky * f).toLocaleString('fr-CA')} $ de positions pour payer un retrait : tu manquais d’encaisse.` });
  }

  /* ---------- conformité ---------- */
  const consText = (c) => {
    switch (c.k) {
      case 'maxDD': return `Perte maximale depuis le sommet : ${pct(c.v)}`;
      case 'maxEquity': return `Actions : ${pct(c.v)} du portefeuille au maximum`;
      case 'maxPos': return `Une seule position : ${pct(c.v)} au maximum`;
      case 'minCash': return `Encaisse d’au moins ${pct(c.v)} (besoins de liquidités)`;
      case 'ban': return `Exclusion : ${c.ids.map((id) => A[id].name).join(', ')} interdit`;
      case 'maxActive': return `Écart à l’indice : ${pct(c.v)} au maximum par actif`;
      case 'maxTE': return `Erreur de suivi sur 12 mois : ${pct(c.v)} par an au maximum`;
      default: return c.k;
    }
  };
  PM.consText = consText;
  function trailingTE(st, k) {
    if (st.mon.length < k) return null;
    const act = st.mon.slice(-k).map((x) => x.r - x.rb);
    return sd(act) * Math.sqrt(12);
  }
  PM.check = function (g, st, weights) {
    const w = weights || PM.value(g, st).w, m = g.mand, out = [];
    const eq = PM.RISKY.filter((id) => A[id].cls === 'equity').reduce((s, id) => s + w[id], 0);
    const peak = Math.max(...st.pidx), dd = 1 - st.pidx[st.pidx.length - 1] / peak;
    for (const c of st.cons) {
      let ok = true, val = null;
      if (c.k === 'maxDD') { val = dd; ok = dd <= c.v + 1e-9; }
      else if (c.k === 'maxEquity') { val = eq; ok = eq <= c.v + 1e-9; }
      else if (c.k === 'maxPos') { val = Math.max(...PM.RISKY.map((id) => w[id])); ok = val <= c.v + 1e-9; }
      else if (c.k === 'minCash') { val = w.CASH; ok = val >= c.v - 1e-9; }
      else if (c.k === 'ban') { val = Math.max(...c.ids.map((id) => w[id] || 0)); ok = val <= 0.0005; }
      else if (c.k === 'maxActive') { val = Math.max(...PM.ALL.map((id) => Math.abs(w[id] - (m.bench[id] || 0)))); ok = val <= c.v + 1e-9; }
      else if (c.k === 'maxTE') { val = trailingTE(st, 12); ok = val == null || val <= c.v + 1e-9; }
      out.push({ k: c.k, ok, val, v: c.v, text: consText(c) });
    }
    return out;
  };

  /* ---------- le temps passe : un mois ---------- */
  PM.step = function (g, st) {
    if (st.ended) return { ok: false };
    const m = g.mand, i0 = st.idx, i1 = i0 + BARS, wb = m.bench;
    const bad = PM.check(g, st).filter((c) => !c.ok).map((c) => c.k);
    st.breach.push(bad);
    const w0 = PM.value(g, st).w, vpre = st.vpre, rfa = rfAt(g.t[i0]);
    const pBase = st.pidx[st.pidx.length - 1], bBase = st.bidx[st.bidx.length - 1];
    const rA = { CASH: Math.pow(1 + rfa, BARS / 252) - 1 };
    for (const id of PM.RISKY) rA[id] = g.px[id][i1] / g.px[id][i0] - 1;
    for (let k = 1; k <= BARS; k++) {
      const gc = Math.pow(1 + rfa, k / 252);
      st.pidx.push(pBase * PM.value(g, st, i0 + k, st.cash * gc).total / vpre);
      let b = 0;
      for (const id of Object.keys(wb)) b += wb[id] * (id === 'CASH' ? gc : g.px[id][i0 + k] / g.px[id][i0]);
      st.bidx.push(bBase * b);
    }
    const gcEnd = Math.pow(1 + rfa, BARS / 252);
    st.cash *= gcEnd;
    const v1 = PM.value(g, st, i1).total;
    const rb = Object.keys(wb).reduce((s, id) => s + wb[id] * rA[id], 0);
    const cost = st.trades.filter((t) => t.m === st.m).reduce((s, t) => s + t.cost, 0);
    st.mon.push({ r: v1 / vpre - 1, rb, rf: rA.CASH, w: w0, rA, cost: cost / vpre, flow: st.lastFlow || 0, v0: vpre });
    st.idx = i1; st.m += 1; st.lastFlow = 0;
    if (st.m >= g.N) { st.ended = true; st.vpre = v1; return { ok: true, done: true, events: [] }; }
    // événements et flux du nouveau mois
    const msgs = [];
    let flow = st.flow;
    for (const ev of m.events || []) {
      if (ev.m !== st.m) continue;
      msgs.push(ev.text);
      st.log.push({ m: st.m, kind: 'event', text: ev.text });
      if (ev.setFlow != null) { st.flow = ev.setFlow; flow = st.flow; }
      if (ev.once) flow += ev.once;
      if (ev.setCons) for (const c of st.cons) if (ev.setCons[c.k] != null) c.v = ev.setCons[c.k];
      if (ev.addCons) for (const nc of ev.addCons) if (!st.cons.some((c) => c.k === nc.k)) st.cons.push({ ...nc });
    }
    st.cash += flow; st.lastFlow = flow;
    raise(g, st);
    st.vpre = PM.value(g, st).total;
    return { ok: true, done: false, events: msgs, flow };
  };

  /* ---------- mesures ---------- */
  PM.live = function (g, st) {
    const cur = PM.value(g, st), p = st.pidx, b = st.bidx;
    const peak = Math.max(...p), r = st.mon.map((x) => x.r), rf = st.mon.map((x) => x.rf);
    const ex = r.map((x, i) => x - rf[i]);
    const act = st.mon.map((x) => x.r - x.rb);
    return {
      total: cur.total, ret: p[p.length - 1] / 100 - 1, bret: b[b.length - 1] / 100 - 1,
      dd: 1 - p[p.length - 1] / peak, vol: r.length >= 3 ? sd(r) * Math.sqrt(12) : null,
      sharpe: r.length >= 6 && sd(r) > 0 ? (mean(ex) / sd(r)) * Math.sqrt(12) : null,
      te: act.length >= 6 ? sd(act) * Math.sqrt(12) : null, w: cur.w,
    };
  };

  PM.evaluate = function (g, st) {
    const m = g.mand, r = st.mon.map((x) => x.r), rb = st.mon.map((x) => x.rb), rf = st.mon.map((x) => x.rf), n = r.length;
    const yrs = Math.max(n / 12, 1e-9), P = st.pidx, B = st.bidx;
    const tot = P[P.length - 1] / 100 - 1, btot = B[B.length - 1] / 100 - 1;
    const ann = Math.pow(1 + tot, 1 / yrs) - 1, bann = Math.pow(1 + btot, 1 / yrs) - 1;
    const ddOf = (s) => { let pk = -Infinity, mx = 0; for (const v of s) { pk = Math.max(pk, v); mx = Math.max(mx, 1 - v / pk); } return mx; };
    const sp = sd(r), sb = sd(rb), ex = r.map((x, i) => x - rf[i]), exb = rb.map((x, i) => x - rf[i]);
    const down = (a) => Math.sqrt(a.reduce((s, x) => s + Math.min(0, x) * Math.min(0, x), 0) / Math.max(1, a.length));
    const act = r.map((x, i) => x - rb[i]), te = sd(act) * Math.sqrt(12);
    const covv = (() => { const mr = mean(r), mb = mean(rb); return n > 1 ? r.reduce((s, x, i) => s + (x - mr) * (rb[i] - mb), 0) / (n - 1) : 0; })();
    const beta = sb > 0 ? covv / (sb * sb) : null;
    const alpha = beta == null ? null : (mean(ex) - beta * mean(exb)) * 12;
    const sorted = r.slice().sort((a, b) => a - b), var95 = n ? -sorted[Math.max(0, Math.floor(0.05 * n))] : 0;
    const upIdx = rb.map((x, i) => (x > 0 ? i : -1)).filter((i) => i >= 0), dnIdx = rb.map((x, i) => (x < 0 ? i : -1)).filter((i) => i >= 0);
    const cap = (idx) => (idx.length && mean(idx.map((i) => rb[i])) !== 0 ? mean(idx.map((i) => r[i])) / mean(idx.map((i) => rb[i])) : null);
    // attribution : (poids actif) x (rendement de l'actif moins celui de l'indice), cumulée mois par mois
    const attr = {};
    for (const id of PM.ALL) attr[id] = 0;
    st.mon.forEach((x) => { for (const id of PM.ALL) attr[id] += ((x.w[id] || 0) - (m.bench[id] || 0)) * ((x.rA[id] || 0) - x.rb); });
    const attrSum = PM.ALL.reduce((s, id) => s + attr[id], 0);
    const costDrag = -st.mon.reduce((s, x) => s + x.cost, 0);
    const resid = mean(act) * n - attrSum - costDrag;
    // conformité
    const types = {};
    st.breach.forEach((b) => b.forEach((k) => { types[k] = (types[k] || 0) + 1; }));
    const monthsBad = st.breach.filter((b) => b.length).length, monthsChk = st.breach.length;
    const avgV = Math.max(1, mean(st.mon.map((x) => x.v0)));
    const turnover = st.turnover / avgV / yrs;
    const sharpe = sp > 0 ? (mean(ex) / sp) * Math.sqrt(12) : null, sharpeB = sb > 0 ? (mean(exb) / sb) * Math.sqrt(12) : null;
    const ir = te > 1e-9 ? (mean(act) * 12) / te : null;
    const objMet = m.objective.type === 'abs' ? ann >= m.objective.ret : ann >= bann;
    // note sur 100 : conformité 40 %, performance relative 25 %, objectif 20 %, discipline 15 %
    const sCons = monthsChk ? clamp(100 * (1 - monthsBad / monthsChk), 0, 100) : 100;
    const sPerf = clamp(50 + 1000 * (ann - bann) + 20 * ((sharpe || 0) - (sharpeB || 0)), 0, 100);
    const sObj = m.objective.type === 'abs' ? (objMet ? 100 : clamp((100 * ann) / m.objective.ret, 0, 100)) : (objMet ? 100 : clamp(100 - 2000 * (bann - ann), 0, 100));
    const sDisc = clamp(100 - 25 * Math.max(0, turnover - 1), 0, 100);
    const score = 0.4 * sCons + 0.25 * sPerf + 0.2 * sObj + 0.15 * sDisc;
    const grade = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : score >= 45 ? 'D' : 'E';
    const ev = { tot, btot, ann, bann, vol: sp * Math.sqrt(12), bvol: sb * Math.sqrt(12), dd: ddOf(P), bdd: ddOf(B), sharpe, sharpeB,
      sortino: down(ex) > 0 ? (mean(ex) / down(ex)) * Math.sqrt(12) : null, te, ir, beta, alpha, var95, upCap: cap(upIdx), dnCap: cap(dnIdx),
      attr, costDrag, resid, types, monthsBad, monthsChk, turnover, costs: st.costs, objMet,
      score: { cons: sCons, perf: sPerf, obj: sObj, disc: sDisc, total: score, grade }, finalValue: PM.value(g, st).total };
    ev.notes = PM.coach(g, st, ev);
    return ev;
  };

  // commentaires à règles, comme le coach des transactions : ce qui est bien et ce qui coûte
  PM.coach = function (g, st, ev) {
    const m = g.mand, out = [], add = (kind, title, text) => out.push({ kind, title, text });
    const names = { maxDD: 'plafond de perte', maxEquity: 'limite d’actions', maxPos: 'concentration', minCash: 'liquidité', ban: 'exclusion', maxActive: 'écart à l’indice', maxTE: 'erreur de suivi' };
    if (!ev.monthsBad) add('good', 'Politique respectée', `Tu as respecté toutes les contraintes de l’énoncé de politique pendant les ${ev.monthsChk} mois. C’est le premier devoir d’un gestionnaire.`);
    else {
      const top = Object.entries(ev.types).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${names[k] || k} (${c} mois)`).join(', ');
      add('warn', 'Contraintes dépassées', `Tu étais hors politique ${ev.monthsBad} mois sur ${ev.monthsChk} : ${top}. Un client peut reprocher cela même quand le rendement est bon : la contrainte est un contrat, pas une suggestion.`);
    }
    if (ev.turnover > 1.5) add('warn', 'Rotation élevée', `Ta rotation est de ${pct(ev.turnover)} par an et les frais ont coûté ${Math.round(ev.costs).toLocaleString('fr-CA')} $. Chaque transaction doit avoir une raison documentée.`);
    else if (st.trades.length === 0) add('warn', 'Aucun rééquilibrage', 'Tu n’as jamais rééquilibré : le portefeuille a dérivé avec le marché. Une politique se défend par des règles (bandes de tolérance, calendrier).');
    else add('good', 'Rotation raisonnable', `Rotation de ${pct(ev.turnover)} par an, frais de ${Math.round(ev.costs).toLocaleString('fr-CA')} $ : l’activité reste proportionnée.`);
    const act = ev.ann - ev.bann;
    if (act > 0.005) add('good', 'Valeur ajoutée', `Tu fais mieux que l’indice de politique de ${pct(act)} par an${ev.ir != null ? `, avec un ratio d’information de ${ev.ir.toFixed(2).replace('.', ',')}` : ''}.`);
    else if (act < -0.005) add('warn', 'Sous l’indice', `Tu es sous l’indice de politique de ${pct(-act)} par an. Sans conviction documentée, la gestion passive de l’indice aurait mieux servi le client.`);
    else add('info', 'Près de l’indice', 'Ton rendement est proche de celui de l’indice de politique : ta décision principale a été de ne pas trop t’en éloigner.');
    if (ev.dd > ev.bdd + 0.03) add('warn', 'Plus de risque que l’indice', `Ta pire perte (${pct(ev.dd)}) dépasse celle de l’indice (${pct(ev.bdd)}). Le client a pris plus de risque que sa politique ne prévoyait.`);
    const dnc = ev.dnCap;
    if (dnc != null && dnc < 0.9 && act >= -0.005) add('good', 'Bonne protection', `Capture à la baisse de ${pct(dnc)} : tu as mieux protégé le capital que l’indice dans les mois négatifs.`);
    const cashAvg = mean(st.mon.map((x) => x.w.CASH || 0)), cashB = m.bench.CASH || 0;
    if (cashAvg > cashB + 0.15) add('warn', 'Trop d’encaisse', `Ton encaisse moyenne (${pct(cashAvg)}) dépasse celle de la politique de ${pct(cashAvg - cashB)} : la prudence a un coût de renonciation.`);
    if (!ev.objMet) add('warn', 'Objectif non atteint', m.objective.type === 'abs' ? `Il fallait ${pct(m.objective.ret)} par an ; tu as fait ${pct(ev.ann)}.` : 'Tu n’as pas battu l’indice de politique net de frais.');
    else add('good', 'Objectif atteint', m.objective.type === 'abs' ? `Objectif de ${pct(m.objective.ret)} atteint (${pct(ev.ann)}).` : 'Tu as battu l’indice de politique net de frais.');
    return out;
  };

  PM.summaryText = (ev) => `Mandat noté ${ev.score.grade} (${Math.round(ev.score.total)}/100)`;
  PM.stats = { mean, sd };
})(typeof window !== 'undefined' ? window : globalThis);
