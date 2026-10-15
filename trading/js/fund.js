/* Trading Academy — mode Saison des résultats (analyse fondamentale).
   Huit sociétés FICTIVES, générées à partir d'un code : états financiers sur 8 trimestres d'historique, consensus des
   analystes, publication des résultats trimestre après trimestre, réaction du prix. Les prix suivent la valeur
   fondamentale (bénéfices, croissance, taux d'intérêt) avec du bruit : l'analyse paie, mais pas à tout coup.
   Deux sociétés au plus ont une comptabilité agressive (ventes gonflées, créances qui montent, flux de trésorerie
   qui décrochent) : les signaux sont visibles dans les chiffres avant la chute. Logique pure, sans DOM. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const FD = (TA.FUND = {});
  const H = 8;                  // trimestres d'historique visibles au départ
  FD.HIST = H;

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const gauss = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const sum = (a) => a.reduce((s, x) => s + x, 0);

  FD.SECTORS = {
    bank: { name: 'Banques', pe: 11, dur: -1.0, cyc: 1.3, beta: 1.1, vol: 1.0 },
    tech: { name: 'Technologie', pe: 26, dur: 6, cyc: 1.1, beta: 1.3, vol: 1.4 },
    energy: { name: 'Énergie', pe: 11, dur: 1, cyc: 1.6, beta: 1.0, vol: 1.2 },
    retail: { name: 'Consommation', pe: 17, dur: 2, cyc: 0.8, beta: 0.9, vol: 0.9 },
    health: { name: 'Santé', pe: 20, dur: 3, cyc: 0.3, beta: 0.7, vol: 0.9 },
    util: { name: 'Services publics', pe: 16, dur: 5, cyc: 0.2, beta: 0.5, vol: 0.6 },
    mat: { name: 'Matériaux', pe: 12, dur: 1.5, cyc: 1.7, beta: 1.2, vol: 1.2 },
    auto: { name: 'Transport électrique', pe: 30, dur: 5, cyc: 1.2, beta: 1.6, vol: 1.6 },
  };
  // rev : revenus trimestriels (M$) ; om : marge d'exploitation ; omT : marge cible ; g : croissance annuelle de long terme
  // nd : dette nette / BAIIA annuel ; sh : actions (M) ; pay : taux de distribution ; dso : jours de ventes en créances
  FD.COMPANIES = [
    { id: 'NBK', name: 'Banque Nordik', sec: 'bank', rev: 2400, om: 0.30, omT: 0.30, g: 0.04, nd: 0, sh: 900, pay: 0.45, dso: 35, blurb: 'Grande banque canadienne : marge d’intérêt, prêts et frais.' },
    { id: 'QTX', name: 'Quantix Logiciels', sec: 'tech', rev: 600, om: 0.22, omT: 0.26, g: 0.18, nd: -0.6, sh: 300, pay: 0, dso: 55, blurb: 'Logiciels par abonnement : forte croissance, valorisation élevée.' },
    { id: 'PBO', name: 'Pétrole Boréal', sec: 'energy', rev: 3000, om: 0.18, omT: 0.17, g: 0.03, nd: 1.2, sh: 700, pay: 0.35, dso: 40, blurb: 'Producteur pétrolier : très sensible au cycle économique.' },
    { id: 'MVD', name: 'Maison Verdure', sec: 'retail', rev: 1500, om: 0.08, omT: 0.08, g: 0.04, nd: 1.6, sh: 500, pay: 0.40, dso: 12, blurb: 'Détaillant de produits pour la maison : marges minces, stable.' },
    { id: 'CLA', name: 'Clinique Aurore', sec: 'health', rev: 900, om: 0.20, omT: 0.21, g: 0.08, nd: 0.8, sh: 400, pay: 0.25, dso: 50, blurb: 'Réseau de cliniques : demande défensive et croissance régulière.' },
    { id: 'HYL', name: 'Hydro-Lac', sec: 'util', rev: 800, om: 0.35, omT: 0.35, g: 0.03, nd: 4.5, sh: 600, pay: 0.70, dso: 38, blurb: 'Services publics : dividende élevé, très endettée, sensible aux taux.' },
    { id: 'ACL', name: 'Acier Laurentien', sec: 'mat', rev: 1100, om: 0.12, omT: 0.11, g: 0.02, nd: 2.8, sh: 450, pay: 0.30, dso: 45, blurb: 'Sidérurgie : cyclique et endettée, les marges bougent beaucoup.' },
    { id: 'VMB', name: 'Voltis Mobilité', sec: 'auto', rev: 350, om: 0.02, omT: 0.12, g: 0.35, nd: 1.0, sh: 250, pay: 0, dso: 40, blurb: 'Véhicules électriques : très forte croissance, rentabilité naissante.' },
  ];
  FD.byId = (id) => FD.COMPANIES.find((c) => c.id === id);

  /* ---------- génération d'une partie (tout est déterminé par le code) ---------- */
  FD.newGame = function (seed, opts = {}) {
    const Q = opts.quarters || 8, T = H + Q, rnd = mulberry(hash('FD|' + seed)), nz = opts.noise || 1;
    // macroéconomie : taux directeur, croissance, rendement trimestriel du marché
    const macro = [];
    let rate = 0.025 + rnd() * 0.02, growth = 0.02, regime = 0;
    for (let k = 0; k < T; k++) {
      if (rnd() < 0.3) regime = [-1, 0, 0, 1][Math.floor(rnd() * 4)];
      const prev = rate;
      rate = clamp(rate + regime * 0.0045 + gauss(rnd) * 0.001, 0.005, 0.07);
      growth = 0.02 + 0.5 * (growth - 0.02) + gauss(rnd) * 0.013;
      const mkt = 0.004 + 2 * (growth - 0.02) - 3 * (rate - prev) + gauss(rnd) * 0.045;
      const dr = rate - prev;
      const head = dr >= 0.004 ? `La banque centrale relève ses taux à ${(rate * 100).toFixed(2).replace('.', ',')} %.`
        : dr <= -0.004 ? `La banque centrale abaisse ses taux à ${(rate * 100).toFixed(2).replace('.', ',')} %.`
        : growth < 0 ? 'L’économie se contracte : les craintes de récession pèsent sur les marchés.'
        : growth > 0.035 ? 'Croissance vigoureuse : les prévisions de bénéfices sont revues à la hausse.'
        : 'Trimestre sans grande surprise macroéconomique.';
      macro.push({ k, rate, prevRate: prev, growth, mkt, head });
    }
    const mktM = [];     // rendements mensuels du marché (3 par trimestre)
    for (let k = 0; k < T; k++) for (let m = 0; m < 3; m++) mktM.push(macro[k].mkt / 3 + gauss(rnd) * 0.022);

    // sociétés à comptabilité agressive : une ou deux, jamais une banque ni un service public
    const cand = FD.COMPANIES.filter((c) => c.sec !== 'util' && c.sec !== 'bank').map((c) => c.id);
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const nAgg = opts.agg != null ? opts.agg : 1 + (rnd() < 0.6 ? 1 : 0);
    const agg = cand.slice(0, nAgg);

    const cos = FD.COMPANIES.map((t) => {
      const sec = FD.SECTORS[t.sec], isAgg = agg.includes(t.id);
      const rev0 = t.rev * (0.85 + rnd() * 0.3), gStar = t.g + (rnd() - 0.5) * 0.03, om0 = t.om + (rnd() - 0.5) * 0.03, omT = t.omT + (rnd() - 0.5) * 0.02;
      const blowQ = isAgg ? H + 2 + Math.floor(rnd() * Math.max(1, Q - 4)) : -1;
      const startInfl = isAgg ? 0 : T + 1;
      let revT = rev0 / Math.pow(1 + gStar / 4, 2), g = gStar, om = om0, infl = 0, writeBase = 0;
      let nd = t.nd * 4 * rev0 * (om0 + 0.04), bv = rev0 * 6, recPrev = (rev0 * t.dso) / 90;
      const q = [];
      for (let k = 0; k < T; k++) {
        const mc = macro[k];
        const gPrev = g;
        g = gStar + 0.5 * (g - gStar) + sec.cyc * (mc.growth - 0.02) + gauss(rnd) * 0.012;
        revT *= 1 + g / 4;
        om = om + 0.3 * (omT - om) + 0.18 * (g - gStar) + gauss(rnd) * 0.005;
        let oneoff = 0, blow = false;
        if (isAgg) {
          if (k >= startInfl && k !== blowQ) infl += 0.016 + 0.004 * gauss(rnd);
          if (k === blowQ) { blow = true; oneoff = 1.1 * writeBase; infl = 0; g -= 0.05; om -= 0.02; }
        }
        const lev = Math.max(0, t.nd);
        const interest = (nd > 0 ? nd * (mc.rate + 0.012 + 0.004 * lev) : nd * mc.rate * 0.8) / 4;
        const infOp = revT * infl * 0.6;
        if (isAgg && !blow) writeBase += infOp;
        const revRep = revT * (1 + infl), opRep = revT * om + infOp;
        const pre = opRep - interest - oneoff, ni = pre > 0 ? pre * 0.75 : pre;
        const eps = ni / t.sh;
        const dso = t.dso * (1 + 3 * infl) * (1 + gauss(rnd) * 0.02), rec = (revRep * dso) / 90;
        const trueNI = (revT * om - interest) * 0.75;
        const cfo = trueNI + 0.03 * revT - (rec - recPrev);
        const capex = 0.04 * revT * (1 + Math.max(0, g) * 2);
        const fcf = cfo - capex, div = t.pay * Math.max(ni, 0);
        nd = nd - fcf + div; bv += ni - div; recPrev = rec;
        // consensus (connu avant la publication) : les analystes prolongent la tendance affichée
        const prevQ = q[k - 1];
        const base = prevQ ? prevQ.eps : eps / (1 + g / 4);
        const gRep = prevQ ? prevQ.gRep : gStar;
        const cons = base * (1 + 0.5 * (gRep / 4) + 0.5 * (gStar / 4)) + Math.abs(base) * 0.01 * gauss(rnd);
        const denom = Math.max(Math.abs(cons), 0.04);
        const surprise = clamp((eps - cons) / denom, -1.5, 1.5);
        const guide = clamp(g - (0.5 * gPrev + 0.5 * gStar), -0.08, 0.08);
        // croissance « affichée » : revenus déclarés sur douze mois contre les douze mois précédents (approchée)
        const gRepNow = clamp(g + (isAgg ? infl * 1.2 : 0), -0.3, 0.6);
        q.push({ k, rev: revRep, revTrue: revT, om: opRep / revRep, opInc: opRep, interest, ni, eps, cons, surprise, guide, cfo, capex, fcf, div, rec, dso, nd, bv, oneoff, blow, g, gRep: gRepNow, infl });
      }
      return { ...t, ...{ gStar, omT, isAgg, blowQ }, q };
    });

    // prix : dérive mensuelle + rappel vers la valeur fondamentale ; saut à la publication
    const monthlyDur = (c) => FD.SECTORS[c.sec].dur;
    for (const c of cos) {
      const sec = FD.SECTORS[c.sec], px = { pre: [], post: [], m1: [], m2: [] };
      const ttm = (k) => { let s = 0, n = 0; for (let j = Math.max(0, k - 3); j <= k; j++) { s += c.q[j].eps; n++; } return (s / n) * 4; };
      const fvAt = (k, rate) => {
        const e = ttm(k), r = c.q[k], gExp = 0.5 * r.gRep + 0.5 * c.gStar;
        const lev = Math.max(0, c.nd);
        let pe = sec.pe * (1 + 2.5 * (gExp - 0.05)) * Math.exp(-sec.dur * (rate - 0.03) * 0.6) * (lev > 2.5 ? 1 - 0.04 * (lev - 2.5) : 1);
        pe = clamp(pe, 5, 60);
        const revPS = (sum(c.q.slice(Math.max(0, k - 3), k + 1).map((x) => x.rev)) / Math.min(4, k + 1)) * 4 / c.sh;
        const salesBased = revPS * (2.5 + 8 * clamp(gExp, 0, 0.4)) * 0.5;
        return Math.max(e * pe, salesBased, 1);
      };
      let P = fvAt(0, macro[0].prevRate) * Math.exp(gauss(rnd) * 0.18 + (c.sec === 'tech' || c.sec === 'auto' ? 0.12 : 0));
      const P0 = P;
      let mi = 0;
      for (let k = 0; k < T; k++) {
        const mc = macro[k], fvPrev = k === 0 ? fvAt(0, mc.prevRate) : fvAt(k - 1, mc.rate);
        for (let m = 0; m < 3; m++) {
          const hype = c.isAgg && k < c.blowQ ? 0.003 : 0;
          const r = sec.beta * mktM[mi] + gauss(rnd) * 0.032 * sec.vol * nz + (0.3 / 12) * Math.log(fvPrev / P) - monthlyDur(c) * ((mc.rate - mc.prevRate) / 3) * 0.6 + hype;
          P *= Math.exp(clamp(r, -0.35, 0.35));
          mi++;
          if (m === 0) px.m1.push(P); else if (m === 1) px.m2.push(P);
        }
        px.pre.push(P);
        const rq = c.q[k];
        const react = 0.45 * clamp(rq.surprise, -0.5, 0.5) + 2.0 * rq.guide + gauss(rnd) * 0.025 + (rq.blow ? -0.06 : 0);
        P *= Math.exp(clamp(react, -0.6, 0.45));
        px.post.push(P);
        rq.react = Math.exp(clamp(react, -0.6, 0.45)) - 1;
      }
      c.px = px; c.P0 = P0;
    }
    // nouvelles : indices avant une chute comptable (sans la nommer)
    const news = [];
    for (let k = 0; k < T; k++) {
      const n = [macro[k].head];
      for (const c of cos) {
        const r = c.q[k];
        if (c.isAgg && c.blowQ - k === 1 && rnd() < 0.7) n.push(`${c.name} : des analystes s’interrogent sur la hausse des créances clients.`);
        if (r.blow) n.push(`${c.name} : radiation comptable et révision des chiffres antérieurs.`);
        else if (r.surprise > 0.12) n.push(`${c.name} : bénéfice nettement supérieur aux attentes.`);
        else if (r.surprise < -0.12) n.push(`${c.name} : bénéfice inférieur aux attentes.`);
      }
      news.push(n);
    }
    return { seed: String(seed), Q, T, H, macro, cos, news, agg };
  };

  /* ---------- état du joueur ---------- */
  FD.newState = function (g, cash = 100000) {
    return { d: 0, phase: 'pre', cash, sh: {}, cost: {}, preds: {}, results: [], eq: [], trades: [], log: [], score: { right: 0, total: 0 }, fees: 0, ended: false, start: cash };
  };
  const kNow = (g, st) => g.H + st.d;      // trimestre dont les résultats sont à publier (phase pre) ou venant de l'être (phase post)
  FD.price = (g, st, c) => (st.phase === 'pre' ? c.px.pre[kNow(g, st)] : c.px.post[kNow(g, st)]);
  FD.prices = (g, st) => Object.fromEntries(g.cos.map((c) => [c.id, FD.price(g, st, c)]));
  FD.equity = (g, st) => st.cash + g.cos.reduce((s, c) => s + (st.sh[c.id] || 0) * FD.price(g, st, c), 0);
  FD.FEE = 0.001;

  FD.trade = function (g, st, id, shares) {
    const c = g.cos.find((x) => x.id === id);
    if (!c || !Number.isInteger(shares) || shares === 0) return { ok: false, error: 'Quantité invalide.' };
    const p = FD.price(g, st, c), have = st.sh[id] || 0;
    if (shares > 0) {
      const cost = shares * p * (1 + FD.FEE);
      if (cost > st.cash + 1e-9) return { ok: false, error: 'Liquidités insuffisantes.' };
      st.cash -= cost; st.fees += shares * p * FD.FEE;
      st.cost[id] = ((st.cost[id] || 0) * have + shares * p) / (have + shares);
      st.sh[id] = have + shares;
    } else {
      const n = -shares;
      if (n > have) return { ok: false, error: 'Tu ne détiens pas autant d’actions (pas de vente à découvert dans ce mode).' };
      st.cash += n * p * (1 - FD.FEE); st.fees += n * p * FD.FEE;
      st.sh[id] = have - n;
    }
    st.trades.push({ d: st.d, phase: st.phase, id, shares, price: p });
    return { ok: true, price: p };
  };

  FD.ttm = (c, k) => {
    const lo = Math.max(0, k - 3), rows = c.q.slice(lo, k + 1), n = rows.length, f = 4 / n;
    return { rev: sum(rows.map((r) => r.rev)) * f, ni: sum(rows.map((r) => r.ni)) * f, eps: sum(rows.map((r) => r.eps)) * f, cfo: sum(rows.map((r) => r.cfo)) * f, fcf: sum(rows.map((r) => r.fcf)) * f, div: sum(rows.map((r) => r.div)) * f, op: sum(rows.map((r) => r.opInc)) * f };
  };
  // indicateurs que l'analyste calcule à partir des états financiers publiés (jusqu'au trimestre k inclus)
  FD.ratios = function (g, c, k, price) {
    const t = FD.ttm(c, k), r = c.q[k], yoy = k >= 4 ? (sum(c.q.slice(k - 3, k + 1).map((x) => x.rev)) / sum(c.q.slice(k - 7 < 0 ? 0 : k - 7, k - 3).map((x) => x.rev)) - 1) : null;
    const cap = price * c.sh, ebitda = t.op + 0.03 * r.revTrue * 4;
    return {
      pe: t.eps > 0.01 ? price / t.eps : null, pb: cap / r.bv, divY: (t.div / c.sh) / price, fcfY: t.fcf / cap, roe: t.ni / r.bv,
      margin: r.om, ndEbitda: ebitda > 0 ? r.nd / ebitda : null, growth: yoy, cfoNi: t.ni > 0 ? t.cfo / t.ni : null, dso: r.dso, cap,
      epsTTM: t.eps, revTTM: t.rev,
    };
  };

  /* ---------- le temps passe ---------- */
  FD.predictMacro = (st, p) => { if (st.phase === 'pre' && ['up', 'flat', 'down'].includes(p)) st.mpred = p; };
  FD.predict = (st, id, p) => { if (st.phase === 'pre' && ['beat', 'inline', 'miss'].includes(p)) st.preds[id] = p; };
  FD.reveal = function (g, st) {
    if (st.phase !== 'pre' || st.ended) return { ok: false };
    const k = kNow(g, st), res = [];
    for (const c of g.cos) {
      const r = c.q[k], pre = c.px.pre[k], post = c.px.post[k];
      const kind = r.surprise > 0.03 ? 'beat' : r.surprise < -0.03 ? 'miss' : 'inline';
      const pred = st.preds[c.id] || null;
      if (pred) { st.score.total++; if (pred === kind) st.score.right++; }
      const held = st.sh[c.id] || 0, dps = r.div / c.sh;
      if (held > 0 && dps > 0) st.cash += held * dps;
      res.push({ id: c.id, dps, eps: r.eps, cons: r.cons, surprise: r.surprise, guide: r.guide, react: post / pre - 1, kind, pred, hit: pred ? pred === kind : null, explain: FD.explain(g, c, k), pre, post, held: st.sh[c.id] || 0 });
    }
    const mc = g.macro[k], dr = mc.rate - mc.prevRate, kindM = dr >= 0.004 ? 'up' : dr <= -0.004 ? 'down' : 'flat';
    if (st.mpred) { st.score.total++; if (st.mpred === kindM) st.score.right++; }
    st.phase = 'post';
    st.results.push({ d: st.d, k, res, macro: { pred: st.mpred || null, kind: kindM, hit: st.mpred ? st.mpred === kindM : null } });
    st.eq.push(FD.equity(g, st));
    return { ok: true, res };
  };
  FD.next = function (g, st) {
    if (st.phase !== 'post') return { ok: false };
    if (st.d + 1 >= g.Q) { st.ended = true; return { ok: true, done: true }; }
    st.d++; st.phase = 'pre'; st.preds = {}; st.mpred = null;
    return { ok: true, done: false };
  };

  // explications à règles : ce que les chiffres annonçaient, et pourquoi le prix a bougé
  FD.explain = function (g, c, k) {
    const r = c.q[k], p = c.q[k - 1], out = [];
    const pct = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';
    if (r.blow) {
      out.push({ t: 'bad', x: `Radiation comptable : les ventes gonflées des trimestres précédents sont renversées. Les signaux étaient dans les chiffres : créances à ${Math.round(p.dso)} jours de ventes (contre ${c.dso} au départ), flux de trésorerie bien sous le bénéfice net.` });
      return out;
    }
    if (Math.abs(r.surprise) > 0.03) out.push({ t: r.surprise > 0 ? 'good' : 'bad', x: `Bénéfice par action ${r.surprise > 0 ? 'supérieur' : 'inférieur'} au consensus de ${pct(Math.abs(r.surprise))}.` });
    else out.push({ t: 'info', x: 'Résultats en ligne avec le consensus : peu de nouvelle information.' });
    if (Math.abs(r.guide) > 0.01) out.push({ t: r.guide > 0 ? 'good' : 'bad', x: `Perspectives de croissance ${r.guide > 0 ? 'relevées' : 'abaissées'} : c’est souvent ce qui fait bouger le prix plus que le trimestre lui-même.` });
    const dm = r.om - (p ? p.om : r.om);
    if (Math.abs(dm) > 0.008) out.push({ t: dm > 0 ? 'good' : 'bad', x: `Marge d’exploitation ${dm > 0 ? 'en hausse' : 'en baisse'} de ${(Math.abs(dm) * 100).toFixed(1).replace('.', ',')} point.` });
    const mc = g.macro[k];
    const dr = mc.rate - mc.prevRate, dur = FD.SECTORS[c.sec].dur;
    if (Math.abs(dr) >= 0.004 && Math.abs(dur) >= 3) out.push({ t: dr > 0 ? 'bad' : 'good', x: `Taux directeur ${dr > 0 ? 'en hausse' : 'en baisse'} : les titres à longue « duration » (technologie, services publics) en souffrent ou en profitent le plus.` });
    if (c.isAgg && c.blowQ - k >= 1) {
      const t0 = c.q[Math.max(0, k - 3)];
      if (r.dso > c.dso * 1.12) out.push({ t: 'warn', x: `Attention : les créances montent à ${Math.round(r.dso)} jours de ventes. Des ventes qui ne sont pas encaissées sont un signal d’alerte (compare le flux de trésorerie d’exploitation au bénéfice net).` });
      void t0;
    }
    return out;
  };

  // commentaire de la direction : le ton se lit, mais il ne prouve rien. Les sociétés à comptabilité agressive sont
  // presque toujours promotionnelles et muettes sur la trésorerie ; quelques sociétés saines le sont aussi.
  FD.commentary = function (c, k) {
    const r = c.q[k], p = c.q[k - 1] || r, rnd = mulberry(hash('CM|' + c.id + '|' + k)), out = [];
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const promo = c.isAgg && !r.blow ? rnd() < 0.85 : r.surprise > 0.05 && rnd() < 0.35;
    if (r.blow) out.push(pick(['Nous révisons nos états financiers antérieurs et enregistrons une charge exceptionnelle.', 'Une revue interne nous a conduits à reconnaître nos ventes de façon plus prudente.']));
    else if (promo) out.push(pick(['Trimestre record : notre élan commercial est exceptionnel et la demande dépasse nos attentes.', 'Nous avons connu une croissance sans précédent et nos clients adoptent massivement notre offre.', 'Les ventes ont atteint un sommet historique, ce qui confirme la force de notre stratégie.']));
    else if (r.surprise < -0.03) out.push(pick(['Le trimestre a été plus difficile que prévu, dans des conditions de marché exigeantes.', 'Nos résultats sont inférieurs à nos attentes, en raison de coûts plus élevés.']));
    else out.push(pick(['Le trimestre s’est déroulé conformément à notre plan.', 'Nous avons livré des résultats stables dans un contexte sans grande surprise.']));
    if (!r.blow) {
      const conv = r.ni > 0 ? r.cfo / r.ni : null;
      if (conv != null && conv > 0.9 && !promo) out.push(pick(['Nos flux de trésorerie d’exploitation ont bien soutenu nos investissements et notre dividende.', 'La génération de trésorerie reste solide et finance notre croissance.']));
      if (r.om - p.om < -0.008) out.push(pick(['Les marges ont subi la pression des coûts des intrants.', 'La hausse des coûts a réduit notre marge d’exploitation.']));
      if (r.om - p.om > 0.008) out.push('Des gains d’efficacité ont amélioré notre marge d’exploitation.');
      if (r.guide < -0.015) out.push('Nous adoptons une posture prudente pour les prochains trimestres.');
      if (r.guide > 0.015) out.push('Nous relevons nos perspectives de croissance pour les prochains trimestres.');
    }
    return out;
  };

  /* ---------- évaluation ---------- */
  FD.evaluate = function (g, st) {
    const eq = FD.equity(g, st), tot = eq / st.start - 1;
    // indice : les huit sociétés à poids égaux, depuis le premier prix de la partie jusqu'au dernier
    const k0 = g.H, k1 = g.H + st.d;
    const phaseEnd = st.phase === 'post' ? 'post' : 'pre';
    const idxRet = g.cos.reduce((s, c) => s + (c.px[phaseEnd][k1] / c.px.pre[k0] - 1), 0) / g.cos.length;
    // titres : rendement de chaque société détenue
    const picks = g.cos.map((c) => {
      const buys = st.trades.filter((t) => t.id === c.id && t.shares > 0), held = st.sh[c.id] || 0;
      const last = c.px[phaseEnd][k1];
      return { id: c.id, name: c.name, held, ret: st.cost[c.id] ? last / st.cost[c.id] - 1 : null, bought: buys.length > 0, isAgg: c.isAgg, blowQ: c.blowQ, retPeriod: last / c.px.pre[k0] - 1 };
    });
    const trapped = g.cos.filter((c) => c.isAgg && c.blowQ <= k1 && st.trades.some((t) => t.id === c.id && t.shares > 0 && g.H + t.d < c.blowQ));
    const heldThroughBlow = trapped.filter((c) => { const r = st.results.find((x) => x.k === c.blowQ); if (!r) return false; const h = r.res.find((y) => y.id === c.id); return h && h.held > 0; });
    const accuracy = st.score.total ? st.score.right / st.score.total : null;
    const maxW = (() => { let m = 0; for (const c of g.cos) m = Math.max(m, ((st.sh[c.id] || 0) * FD.price(g, st, c)) / Math.max(1, eq)); return m; })();
    const sPerf = clamp(50 + 250 * (tot - idxRet), 0, 100), sAcc = accuracy == null ? 40 : clamp(accuracy * 150 - 10, 0, 100);
    const sRisk = clamp(100 - 220 * Math.max(0, maxW - 0.35) - 40 * heldThroughBlow.length, 0, 100);
    const score = 0.5 * sPerf + 0.25 * sAcc + 0.25 * sRisk;
    return { eq, tot, idxRet, alpha: tot - idxRet, picks, heldThroughBlow: heldThroughBlow.map((c) => c.id), accuracy, maxW, fees: st.fees,
      score: { perf: sPerf, acc: sAcc, risk: sRisk, total: score, grade: score >= 82 ? 'A' : score >= 68 ? 'B' : score >= 54 ? 'C' : score >= 42 ? 'D' : 'E' } };
  };
})(typeof window !== 'undefined' ? window : globalThis);
