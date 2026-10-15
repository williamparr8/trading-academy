/* Trading Academy — moteur de marché (logique pure, sans DOM)
   Aléa déterministe, scénarios, barres, indicateurs, ordres, portefeuille, résumé de partie. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const TA = (root.TA = root.TA || {});

  const CFG = (TA.CFG = {
    START_CASH: 100000,   // capital virtuel de départ
    CTX: 100,             // barres d'historique visibles avant le départ
    BASE_PRICE: 100,      // le prix du premier jour est ramené à 100 $ (l'actif reste masqué)
    FEE_MIN: 1,           // commission minimale par ordre
    FEE_PER_SHARE: 0.005, // commission par action
  });

  /* ---------- Formats québécois : 1 234,56 $ ---------- */
  const nfMoney = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
  const nfMoneySigned = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', signDisplay: 'always' });
  const nfPct = new Intl.NumberFormat('fr-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfPctSigned = new Intl.NumberFormat('fr-CA', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' });
  const nfInt = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  TA.fmt = {
    money: (x) => nfMoney.format(x),
    smoney: (x) => nfMoneySigned.format(Math.abs(x) < 0.005 ? 0 : x),
    pct: (x) => nfPct.format(x),
    spct: (x) => nfPctSigned.format(Math.abs(x) < 0.00005 ? 0 : x),
    int: (x) => nfInt.format(x),
    num: (x, d = 2) => new Intl.NumberFormat('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x),
    date: (day) => new Date(day * 86400000).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
  const money = TA.fmt.money;

  /* ---------- Aléa déterministe (codes de défi) ---------- */
  const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  TA.newCode = () => {
    let s = '';
    for (let i = 0; i < 8; i++) {
      s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
      if (i === 3) s += '-';
    }
    return s;
  };
  TA.normCode = (c) => {
    const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s;
  };
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  TA.rng = (seed) => {
    let a = hashSeed(String(seed));
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Scénarios et styles ---------- */
  TA.dayFromISO = (s) => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000);

  const ALL = ['stock', 'forex', 'crypto'];
  TA.SCENARIOS = [
    { id: 'random', name: 'Période aléatoire', desc: 'N’importe quand, aussi loin que les données remontent. Le plus réaliste : tu ne sais rien du contexte.', from: '2006-01-02', to: null, markets: ALL },
    { id: 'crisis', name: 'Crise surprise', desc: 'Une des grandes crises de ce marché, tirée au hasard et gardée secrète jusqu’à la fin.', pool: ['gfc', 'covid', 'rates', 'brexit', 'bubble21', 'winter18', 'crash22'], markets: ALL },
    // `event` : date clé du scénario. La partie est placée pour que cette date tombe toujours à l'intérieur, quelle que soit la durée.
    { id: 'gfc', name: 'Krach de 2008', desc: 'La crise financière mondiale : faillites bancaires, panique, ruée vers le dollar.', event: '2008-10-06', markets: ['stock', 'forex'] },
    { id: 'covid', name: 'COVID — mars 2020', desc: 'L’effondrement éclair de février-mars 2020, puis le rebond.', event: '2020-03-16', markets: ALL },
    { id: 'rates', name: 'Hausse des taux 2022', desc: 'L’inflation et la remontée rapide des taux directeurs.', event: '2022-06-13', markets: ALL },
    { id: 'brexit', name: 'Brexit — juin 2016', desc: 'Le référendum britannique : la livre sterling s’effondre en une nuit.', event: '2016-06-24', markets: ['forex'], assets: ['GBPUSD_X'] },
    { id: 'bubble21', name: 'Bulle crypto 2021', desc: 'L’euphorie du printemps 2021 jusqu’au sommet, puis l’effondrement de mai.', event: '2021-05-19', markets: ['crypto'] },
    { id: 'winter18', name: 'Hiver crypto 2018', desc: 'L’éclatement de la bulle de 2017 : des baisses de 80 % en quelques mois.', event: '2018-01-16', markets: ['crypto'] },
    { id: 'crash22', name: 'Effondrement crypto 2022', desc: 'La chute de Terra en mai, puis la faillite de FTX en novembre.', event: '2022-05-12', markets: ['crypto'] },
  ];
  TA.scenariosFor = (market) => TA.SCENARIOS.filter((s) => s.markets.includes(market || 'stock'));
  TA.STYLES = {
    swing: { id: 'swing', name: 'Swing trading', unit: 'J', barName: 'jour', next: 'Jour suivant', perYear: 252, lengths: [
      { n: 60, label: '60 jours de bourse (~3 mois)' }, { n: 120, label: '120 jours de bourse (~6 mois)' }, { n: 250, label: '250 jours de bourse (~1 an)' } ] },
    long: { id: 'long', name: 'Investissement long terme', unit: 'S', barName: 'semaine', next: 'Semaine suivante', perYear: 52, lengths: [
      { n: 52, label: '52 semaines (1 an)' }, { n: 104, label: '104 semaines (2 ans)' }, { n: 156, label: '156 semaines (3 ans)' } ] },
  };

  // Code de défi complet « ABCD-2345-A0S1 » : le code de partie suivi de A/F/C (actions, forex, crypto), du rang du scénario,
  // de S/L (swing, long terme) et du rang de la durée. Il reproduit exactement la même partie chez un ami.
  // Le rang des scénarios est celui de TA.SCENARIOS : on n'y ajoute que des scénarios à la fin.
  const CH_MARKETS = { stock: 'A', forex: 'F', crypto: 'C' };
  TA.makeChallenge = (code, market, scenarioId, style, lenIdx) =>
    `${code}-${CH_MARKETS[market] || 'A'}${Math.max(0, TA.SCENARIOS.findIndex((s) => s.id === scenarioId))}${style === 'long' ? 'L' : 'S'}${lenIdx | 0}`;
  TA.parseChallenge = function (text) {
    const t = String(text || '').toUpperCase().replace(/\s+/g, '');
    const m = /^([A-Z0-9]{4})-?([A-Z0-9]{4})(?:-?([AFC])(\d)([SL])(\d))?$/.exec(t);
    if (!m) return null;
    const out = { code: m[1] + '-' + m[2], full: false };
    if (m[3]) {
      const market = Object.keys(CH_MARKETS).find((k) => CH_MARKETS[k] === m[3]), sc = TA.SCENARIOS[+m[4]], len = +m[6];
      if (!sc || !TA.scenariosFor(market).some((x) => x.id === sc.id) || len > 2) return null;
      Object.assign(out, { full: true, market, scenarioId: sc.id, style: m[5] === 'L' ? 'long' : 'swing', lenIdx: len });
    }
    return out;
  };

  // Choisit l'actif et la date de départ à partir du code (même code = même partie).
  TA.planGame = function (code, scenId, style, length, index, market) {
    market = market || 'stock';
    // pour les actions, la graine reste celle de la phase 1 : un ancien code redonne la même partie
    const rnd = TA.rng([code, scenId, style, length].join('|') + (market === 'stock' ? '' : '|' + market));
    const avail = TA.scenariosFor(market);
    let sc = avail.find((s) => s.id === scenId) || avail[0];
    if (sc.pool) {
      const pool = sc.pool.filter((id) => avail.some((s) => s.id === id));
      const pick = pool[Math.floor(rnd() * pool.length)];
      sc = TA.SCENARIOS.find((s) => s.id === pick);
    }
    const weekly = style === 'long';
    const histDays = weekly ? 760 : 160;
    const spanDays = Math.ceil(length * (weekly ? 7 : TA.MARKETS[market].cal)) + 10;
    const pool = index.assets.filter((a) => (a.mk || 'stock') === market && (!sc.assets || sc.assets.includes(a.id)));
    if (!pool.length) return null;
    // départ : soit n'importe quand (aléatoire), soit de façon que l'événement tombe entre 15 % et 85 % de la partie
    const span = spanDays - 10;
    const winFrom = sc.event ? TA.dayFromISO(sc.event) - Math.round(0.85 * span) : TA.dayFromISO(sc.from);
    const winTo = sc.event ? TA.dayFromISO(sc.event) - Math.round(0.15 * span) : sc.to ? TA.dayFromISO(sc.to) : Math.max(...pool.map((a) => a.to));
    const cands = [];
    for (const a of pool) {
      const lo = Math.max(winFrom, a.from + histDays);
      const hi = Math.min(winTo, a.to - spanDays);
      if (hi >= lo) cands.push({ id: a.id, lo, hi });
    }
    if (!cands.length) return null;
    const c = cands[Math.floor(rnd() * cands.length)];
    return { assetId: c.id, startDay: c.lo + Math.floor(rnd() * (c.hi - c.lo + 1)), scenarioId: sc.id, market };
  };

  /* ---------- Barres et indicateurs ---------- */
  function weekly(d) {
    const o = { t: [], o: [], h: [], l: [], c: [], v: [] };
    let key = null;
    for (let i = 0; i < d.t.length; i++) {
      const k = Math.floor((d.t[i] + 3) / 7); // semaines du lundi au dimanche
      if (k !== key) {
        key = k;
        o.t.push(d.t[i]); o.o.push(d.o[i]); o.h.push(d.h[i]); o.l.push(d.l[i]); o.c.push(d.c[i]); o.v.push(d.v[i]);
      } else {
        const j = o.t.length - 1;
        o.t[j] = d.t[i]; o.h[j] = Math.max(o.h[j], d.h[i]); o.l[j] = Math.min(o.l[j], d.l[i]); o.c[j] = d.c[i]; o.v[j] += d.v[i];
      }
    }
    return o;
  }
  function lowerBound(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return lo;
  }
  const nanArr = (n) => new Float64Array(n).fill(NaN);
  function sma(a, n) {
    const o = nanArr(a.length); let s = 0;
    for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; }
    return o;
  }
  function ema(a, n, from = 0) {
    const o = nanArr(a.length), k = 2 / (n + 1); let s = 0;
    for (let i = from; i < a.length; i++) {
      const j = i - from;
      if (j < n - 1) s += a[i];
      else if (j === n - 1) { s += a[i]; o[i] = s / n; }
      else o[i] = a[i] * k + o[i - 1] * (1 - k);
    }
    return o;
  }
  function rsi(c, n = 14) {
    const o = nanArr(c.length); let g = 0, l = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } }
      else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    }
    return o;
  }
  function macd(c, fast = 12, slow = 26, sig = 9) {
    const e12 = ema(c, fast), e26 = ema(c, slow), m = nanArr(c.length);
    for (let i = 0; i < c.length; i++) if (!isNaN(e26[i])) m[i] = e12[i] - e26[i];
    const first = m.findIndex((x) => !isNaN(x));
    const sg = first < 0 ? nanArr(c.length) : ema(m, sig, first);
    const hist = nanArr(c.length);
    for (let i = 0; i < c.length; i++) if (!isNaN(sg[i])) hist[i] = m[i] - sg[i];
    return { line: m, signal: sg, hist };
  }
  function boll(c, n = 20, k = 2) {
    const mid = sma(c, n), up = nanArr(c.length), lo = nanArr(c.length);
    for (let i = n - 1; i < c.length; i++) {
      let v = 0;
      for (let j = i - n + 1; j <= i; j++) v += (c[j] - mid[i]) ** 2;
      const sd = Math.sqrt(v / n);
      up[i] = mid[i] + k * sd; lo[i] = mid[i] - k * sd;
    }
    return { mid, up, lo };
  }
  // ATR de Wilder : amplitude moyenne vraie d'une barre sur n barres (volatilité exprimée en prix).
  function atr(h, l, c, n = 14) {
    const o = nanArr(c.length); let s = 0;
    for (let i = 1; i < c.length; i++) {
      const tr = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (i < n) s += tr;
      else if (i === n) { s += tr; o[i] = s / n; }
      else o[i] = (o[i - 1] * (n - 1) + tr) / n;
    }
    return o;
  }
  TA.indicators = (c) => ({ sma20: sma(c, 20), sma50: sma(c, 50), boll: boll(c), rsi: rsi(c), macd: macd(c) });
  TA.ind = { sma, ema, rsi, macd, boll, atr };   // indicateurs à paramètres libres, utilisés par le graphique
  // Amplitude moyenne d'une barre à l'index i (sans regarder après i) ; repli sur l'amplitude haut-bas si l'historique manque.
  TA.atrAt = (g, i) => {
    const a = g.atr14 && g.atr14[i];
    if (a > 0) return a;
    let s = 0, n = 0;
    for (let k = Math.max(0, i - 13); k <= i; k++) { s += g.h[k] - g.l[k]; n++; }
    return n && s > 0 ? s / n : g.c[i] * 0.01;
  };

  // Construit la partie : barres ramenées à un prix de départ de 100 $, volume relatif, indicateurs.
  // Mode Live : échelle en puissance de 10 qui ramène le prix entre 100 et 1000 (quantités entières, prix réel = prix ÷ k).
  TA.liveScale = (price) => Math.pow(10, Math.ceil(Math.log10(100 / price)));
  // opts.live = { k } : on garde les vrais prix (× k) au lieu de ramener le prix de départ à 100.
  TA.buildGame = function (data, plan, style, length, opts) {
    const live = opts && opts.live ? opts.live : null;
    const raw = style === 'long' ? weekly(data) : data;
    const N = raw.t.length;
    let startIdx = lowerBound(raw.t, plan.startDay);
    if (startIdx < CFG.CTX) startIdx = CFG.CTX;
    if (startIdx > N - 1 || (!live && startIdx >= N - 1)) throw new Error('Données insuffisantes pour cette partie.');   // un compte Live commence sur la dernière séance
    const endIdx = Math.min(startIdx + length, N - 1);
    const k = live ? live.k : CFG.BASE_PRICE / raw.c[startIdx];
    const mk = (a) => Float64Array.from(a, (x) => x * k);
    let vs = 0;
    for (let i = startIdx - CFG.CTX; i <= startIdx; i++) vs += raw.v[i];
    const vm = vs / (CFG.CTX + 1) || 1;
    const c = mk(raw.c), hi = mk(raw.h), lo = mk(raw.l);
    const u = TA.STYLES[style];
    return {
      meta: { s: data.s, n: data.n, x: data.x, sec: data.sec, cur: data.cur },
      market: data.mk || 'stock', live: live ? { k: live.k } : null,
      style, unit: u.unit, startIdx, endIdx, N, t: raw.t,
      o: mk(raw.o), h: hi, l: lo, c,
      v: Float64Array.from(raw.v, (x) => x / vm),
      ind: TA.indicators(c), atr14: atr(hi, lo, c, 14),
    };
  };

  /* ---------- Marchés : coûts, levier ---------- */
  // spread = [base, part de l'amplitude du jour, plafond] (demi-spread) ; maxLev = levier maximal par niveau (Débutant → Pro)
  TA.MARKETS = {
    stock: { id: 'stock', name: 'Actions', one: 'action', many: 'actions', cal: 1.42, spread: [0.0003, 0.02, 0.01], perYear: 252, levers: [1, 2, 4, 5], maxLev: [1, 2, 4, 5], borrow: 0.02 },
    forex: { id: 'forex', name: 'Forex', one: 'unité', many: 'unités', cal: 1.4, spread: [0.00008, 0.01, 0.002], perYear: 260, levers: [1, 5, 10, 20, 30], maxLev: [1, 5, 20, 30] },
    crypto: { id: 'crypto', name: 'Crypto', one: 'unité', many: 'unités', cal: 1, spread: [0.0005, 0.03, 0.02], perYear: 365, levers: [1, 2, 5, 10], maxLev: [1, 1, 5, 10] },
  };
  CFG.CRYPTO_FEE = 0.001;   // 0,1 % du montant, comme sur une plateforme d'échange
  const mkt = (g) => TA.MARKETS[(g && g.market) || 'stock'];
  TA.unit = (g, n) => (n === 1 ? mkt(g).one : mkt(g).many);
  // Demi-spread : plus large les jours agités, très serré au forex, plus large en crypto.
  TA.halfSpread = (g, i) => { const [a, b, cap] = mkt(g).spread; return Math.min(cap, a + b * ((g.h[i] - g.l[i]) / g.c[i])); };
  // Frais d'une transaction : actions = commission par action ; forex = aucun (le spread suffit) ; crypto = 0,1 % du montant.
  TA.fee = (g, qty, px) => {
    const m = (g && g.market) || 'stock';
    if (m === 'forex') return 0;
    if (m === 'crypto') return qty * px * CFG.CRYPTO_FEE;
    return Math.max(CFG.FEE_MIN, qty * CFG.FEE_PER_SHARE);
  };
  TA.feeText = (market) => (market === 'forex' ? 'aucune commission (le spread suffit)' : market === 'crypto' ? `${TA.fmt.pct(CFG.CRYPTO_FEE).replace(',00', '')} du montant` : `${TA.fmt.money(CFG.FEE_MIN)} minimum ou ${TA.fmt.num(CFG.FEE_PER_SHARE, 3)} $ par action`);
  TA.maxLeverage = (market, level) => TA.MARKETS[market || 'stock'].maxLev[Math.min(Math.max(level || 1, 1), 4) - 1];
  TA.leverChoices = (market, level) => TA.MARKETS[market || 'stock'].levers.filter((l) => l <= TA.maxLeverage(market, level));
  // Niveaux de marge selon le levier maximal choisi : initiale 1/L, appel de marge à la moitié, liquidation au quart.
  TA.marginLevels = (st) => { const m0 = 1 / (st.maxLev || 1); return { initial: m0, call: m0 / 2, stopOut: m0 / 4 }; };

  /* ---------- Gestion du risque et journal ---------- */
  TA.RULES = [
    { id: 'strict2', mode: 'block', max: 0.02, name: 'Obligatoire · 2 % maximum par transaction' },
    { id: 'strict1', mode: 'block', max: 0.01, name: 'Obligatoire · 1 % maximum par transaction' },
    { id: 'soft', mode: 'warn', max: 0.02, name: 'Conseillée · simple avertissement au-delà de 2 %' },
  ];
  // Règle inconnue ou absente (anciennes sauvegardes) : mode conseillé, comme en phase 1.
  TA.rulesOf = (id) => { const r = TA.RULES.find((x) => x.id === id) || TA.RULES[2]; return { id: r.id, mode: r.mode, max: r.max }; };
  TA.REASONS = [
    ['trend', 'Tendance haussière'], ['breakout', 'Cassure d’une résistance'], ['support', 'Rebond sur un support'],
    ['downtrend', 'Tendance baissière'], ['breakdown', 'Cassure d’un support'], ['reject', 'Rejet sur une résistance'],
    ['signal', 'Signal d’indicateur (RSI, MACD, Bollinger)'], ['oversold', 'Survente après une forte baisse'], ['overbought', 'Surachat après une forte hausse'],
    ['longterm', 'Idée de long terme'], ['hunch', 'Intuition, sans plan précis'], ['other', 'Autre'],
  ];
  TA.EMOTIONS = [
    ['confident', 'Confiant'], ['calm', 'Calme'], ['hesitant', 'Hésitant'], ['stressed', 'Stressé'],
    ['euphoric', 'Euphorique'], ['fomo', 'Peur de rater le coup'], ['revenge', 'Envie de me refaire'],
  ];
  TA.labelOf = (list, id) => { const x = list.find((e) => e[0] === id); return x ? x[1] : null; };
  const inList = (list, v) => (list.some((e) => e[0] === v) ? v : null);
  const cleanJ = (j) => ({ reason: inList(TA.REASONS, j && j.reason), emotion: inList(TA.EMOTIONS, j && j.emotion), note: String((j && j.note) || '').slice(0, 160) });

  // Perte si le stop est touché, en $ et en % du compte actuel (spread et frais compris).
  // `qty` unités s'ajoutent à la position éventuelle (même sens : dir = 1 long, −1 short) ; `sl` protège l'ensemble.
  TA.riskOf = function (g, st, qty, px, sl, dir = 1) {
    const same = st.pos && st.pos.dir === dir ? st.pos.qty : 0, mark = g.c[st.idx], eq = TA.metrics(g, st).equity;
    const risk = dir * (same * (mark - sl) + qty * (px - sl)) + TA.fee(g, qty, px) + TA.fee(g, same + qty, mark);
    return { risk, pct: risk / eq };
  };
  // Quantité maximale qu'on peut ouvrir ou ajouter dans le sens `dir` sans dépasser le levier choisi.
  // Règle : exposition après l'ordre ≤ levier × valeur du compte après l'ordre (spread et frais déduits).
  TA.maxQty = function (g, st, px, dir = 1) {
    const mark = g.c[st.idx], eq = TA.metrics(g, st).equity, lev = st.maxLev || 1;
    const same = st.pos && st.pos.dir === dir ? st.pos.qty : 0;
    if (st.pos && st.pos.dir !== dir) return 0;
    const fits = (q) => same * mark + q * px <= lev * (eq - q * Math.abs(px - mark) - TA.fee(g, q, px)) + 1e-9;
    let lo = 0, hi = Math.max(0, Math.floor((lev * eq) / px));
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (fits(m)) lo = m; else hi = m - 1; }
    return lo;
  };
  // Calculateur de taille : plus grande quantité dont le risque tient dans `pct` du compte (et dans le levier permis).
  TA.sizeForRisk = function (g, st, px, sl, pct, dir = 1) {
    if (!(sl > 0) || !(dir * (px - sl) > 0)) return { qty: 0, cashLimited: false };
    const budget = TA.metrics(g, st).equity * pct, cap = TA.maxQty(g, st, px, dir);
    let a = 0, b = Math.max(0, Math.floor(budget / Math.abs(px - sl)));   // le risque dépasse toujours q × |px − sl|
    while (a < b) { const m = Math.ceil((a + b) / 2); if (TA.riskOf(g, st, m, px, sl, dir).risk <= budget) a = m; else b = m - 1; }
    return { qty: Math.min(a, cap), cashLimited: a > cap };
  };

  /* ---------- Performance : Sharpe et drawdown ---------- */
  // Ratio de Sharpe annualisé (taux sans risque = 0) à partir d'une courbe de valeurs ; null si la courbe est plate.
  TA.sharpe = function (curve, perYear) {
    const r = [];
    for (let i = 1; i < curve.length; i++) r.push(curve[i] / curve[i - 1] - 1);
    if (r.length < 2) return null;
    const mean = r.reduce((a, x) => a + x, 0) / r.length;
    const sd = Math.sqrt(r.reduce((a, x) => a + (x - mean) ** 2, 0) / (r.length - 1));
    return sd < 1e-12 ? null : (mean / sd) * Math.sqrt(perYear);
  };
  // Drawdown : recul depuis le sommet précédent (valeurs négatives). `max` = pire recul, `cur` = recul actuel.
  TA.drawdown = function (curve) {
    let peak = curve[0], max = 0, cur = 0;
    for (const v of curve) { peak = Math.max(peak, v); cur = v / peak - 1; if (cur < max) max = cur; }
    return { max, cur };
  };

  /* ---------- Niveaux, discipline et fonctions verrouillées ---------- */
  CFG.BARS_PER_TRADE = 4;   // au plus une transaction toutes les 4 barres en moyenne
  CFG.MIN_PLAYED = 0.8;     // part minimale de la partie à jouer pour qu'elle compte
  // `need` = ce qu'il faut réussir pour quitter ce niveau : `games` parties disciplinées
  TA.LEVELS = [
    { id: 1, name: 'Débutant', blurb: 'Actions, vente à découvert, sans levier', need: { games: 2, maxDD: 0.15, minTrades: 3, rMean: null } },
    { id: 2, name: 'Intermédiaire', blurb: 'Forex, crypto, levier faible', need: { games: 3, maxDD: 0.10, minTrades: 5, rMean: null } },
    { id: 3, name: 'Avancé', blurb: 'Options, crypto à levier', need: { games: 4, maxDD: 0.08, minTrades: 8, rMean: 0 } },
    { id: 4, name: 'Pro', blurb: 'Toutes les fonctions, sans restriction', need: null },
  ];
  // `ready: false` = prévu dans une phase suivante : débloquer le niveau ne suffit pas encore à l'utiliser.
  TA.FEATURES = {
    short: { name: 'Vente à découvert', level: 1, ready: true },   // parier contre le marché : permis dès le départ sur les actions
    forex: { name: 'Forex', level: 2, ready: true },
    crypto: { name: 'Crypto sans levier', level: 2, ready: true },
    leverage: { name: 'Levier faible', level: 2, ready: true },
    options: { name: 'Options (calls et puts)', level: 3, ready: true },
    cryptoLeverage: { name: 'Crypto à levier', level: 3, ready: true },
  };
  // Accès à un marché selon le niveau : les actions sont toujours ouvertes.
  TA.marketAccess = (market, level) => (market === 'forex' ? TA.canUse(level, 'forex') : market === 'crypto' ? TA.canUse(level, 'crypto') : { ok: true });
  TA.canUse = function (levelId, key) {
    const f = TA.FEATURES[key];
    if ((levelId || 1) < f.level) return { ok: false, why: `${f.name} : se débloque au niveau ${TA.LEVELS[f.level - 1].name}.` };
    if (!f.ready) return { ok: false, soon: true, why: `${f.name} : débloquée pour toi, mais pas encore disponible dans le simulateur.` };
    return { ok: true };
  };
  const p0 = (x) => TA.fmt.pct(x).replace(',00', '');

  // Évalue une partie terminée selon les exigences du niveau de départ.
  TA.evaluate = function (g, st, sum, levelId) {
    const lv = TA.LEVELS[(levelId || 1) - 1], need = lv && lv.need;
    if (!need) return null;
    const total = g.endIdx - g.startIdx, d = st.disc || { noStop: 0, widened: 0, overRisk: 0 };
    const positions = new Set(st.trades.map((t) => t.openIdx)).size;
    const maxTrades = Math.max(need.minTrades, Math.floor(total / CFG.BARS_PER_TRADE));
    let missing = 0;
    for (const t of st.trades) {
      if (!t.entries || !t.entries.length) missing++;
      else for (const e of t.entries) if (!e.reason || !e.emotion) missing++;
    }
    const rs = st.trades.filter((t) => t.r != null), rMean = rs.length ? rs.reduce((a, t) => a + t.r, 0) / rs.length : null;
    const n = (k, one, many) => (k === 0 ? 'aucune infraction' : `${k} ${k > 1 ? many : one}`);
    const criteria = [
      { id: 'complete', label: `Partie menée à au moins ${Math.round(CFG.MIN_PLAYED * 100)} %`, ok: sum.bars >= CFG.MIN_PLAYED * total - 1e-9, detail: `${Math.round((100 * sum.bars) / total)} % jouée` },
      { id: 'stops', label: 'Stop-loss à chaque entrée, jamais éloigné ni retiré', ok: d.noStop + d.widened === 0, detail: n(d.noStop + d.widened, 'infraction', 'infractions') },
      { id: 'risk', label: 'Risque par transaction sous le maximum de ta règle', ok: d.overRisk === 0, detail: n(d.overRisk, 'dépassement', 'dépassements') },
      { id: 'journal', label: 'Journal complet : raison et émotion à chaque entrée', ok: missing === 0, detail: missing === 0 ? 'complet' : `${missing} entrée${missing > 1 ? 's' : ''} incomplète${missing > 1 ? 's' : ''}` },
      { id: 'dd', label: `Drawdown maximal de ${p0(need.maxDD)} ou moins`, ok: -sum.maxDD <= need.maxDD + 1e-12, detail: TA.fmt.spct(sum.maxDD) },
      { id: 'trades', label: `Entre ${need.minTrades} et ${maxTrades} transactions`, ok: positions >= need.minTrades && positions <= maxTrades, detail: `${positions} transaction${positions > 1 ? 's' : ''}` },
    ];
    if (need.rMean != null) criteria.push({ id: 'r', label: `Multiple R moyen d’au moins ${TA.fmt.num(need.rMean, 1)}`, ok: rMean != null && rMean >= need.rMean, detail: rMean == null ? 'aucun' : `${TA.fmt.num(rMean, 2)} R` });
    return { level: levelId, need, criteria, passed: criteria.every((c) => c.ok) };
  };

  TA.newProfile = () => ({ v: 1, level: 1, progress: 0, games: [], played: [], lessons: {} });
  // Garde le meilleur résultat d'un quiz de formation.
  TA.recordQuiz = function (profile, id, score, total) {
    const prev = profile.lessons[id];
    if (!prev || score >= prev.best) profile.lessons[id] = { best: score, total, at: Date.now() };
    return profile.lessons[id];
  };
  // Enregistre le résultat d'une partie dans le profil. `info` : {code, level, ev, ret, dd, trades, replay}
  TA.applyResult = function (profile, info) {
    const out = { counted: false, passed: !!(info.ev && info.ev.passed), leveledUp: false, why: null };
    if (!info.ev) out.why = 'Tu as déjà atteint le niveau maximal.';
    else if (info.live) out.why = 'Compte Live : il ne compte pas dans ta progression de niveau.';
    else if (info.replay) out.why = 'Partie rejouée : tu connais déjà la suite, elle ne compte pas.';
    else if (profile.played.includes(info.code)) out.why = 'Ce code a déjà été joué : il ne compte qu’une fois.';
    else if (info.level !== profile.level) out.why = 'Partie commencée à un autre niveau : elle ne compte pas.';
    else out.counted = true;
    if (info.code && !profile.played.includes(info.code)) profile.played.push(info.code);
    if (profile.played.length > 300) profile.played.shift();
    const need = (TA.LEVELS[profile.level - 1] || {}).need;
    if (out.counted && out.passed && need) {
      profile.progress++;
      if (profile.progress >= need.games) { profile.level++; profile.progress = 0; out.leveledUp = true; }
    }
    profile.games.unshift({ at: Date.now(), code: info.code, level: info.level, ret: info.ret, dd: info.dd, trades: info.trades, passed: out.passed, counted: out.counted });
    profile.games = profile.games.slice(0, 30);
    out.progress = profile.progress;
    out.needGames = need ? need.games : 0;
    return out;
  };
  TA.sanitizeProfile = function (raw) {
    const p = TA.newProfile();
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return p;
    if (Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= TA.LEVELS.length) p.level = raw.level;
    const need = TA.LEVELS[p.level - 1].need;
    if (Number.isInteger(raw.progress) && raw.progress >= 0) p.progress = need ? Math.min(raw.progress, need.games - 1) : 0;
    if (Array.isArray(raw.played)) p.played = raw.played.filter((c) => typeof c === 'string' && c.length <= 12).slice(-300);
    if (raw.lessons && typeof raw.lessons === 'object') {
      for (const [k, v] of Object.entries(raw.lessons).slice(0, 40)) {
        if (/^[a-z]{2,20}$/.test(k) && v && Number.isInteger(v.best) && Number.isInteger(v.total) && v.total >= 1 && v.total <= 20 && v.best >= 0 && v.best <= v.total) p.lessons[k] = { best: v.best, total: v.total, at: Number.isFinite(v.at) ? v.at : 0 };
      }
    }
    if (Array.isArray(raw.games)) {
      p.games = raw.games.slice(0, 30).filter((x) => x && Number.isFinite(x.at) && Number.isFinite(x.ret) && Number.isFinite(x.dd) && Number.isInteger(x.trades)).map((x) => ({
        at: x.at, code: String(x.code || '').slice(0, 12), level: Number.isInteger(x.level) ? x.level : 1, ret: x.ret, dd: x.dd, trades: x.trades, passed: !!x.passed, counted: !!x.counted }));
    }
    return p;
  };

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
      opts: [],            // options détenues (achats de calls et de puts)
      disc: { noStop: 0, widened: 0, overRisk: 0 },   // entorses à la discipline (possibles seulement en mode conseillé)
      draw: [],            // tracés du joueur sur le graphique : lignes, tendances, zones (voir TA.addDraw)
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
    const m2 = TA.marginLevels(st).stopOut, base = st.cash + TA.optionsValue(g, st);   // les options détenues comptent comme garantie
    if (p.dir === 1) { const x = -base / (p.qty * (1 - m2)); return x > 0 ? x : null; }   // long : cash + Q·p = m2·Q·p
    return base / (p.qty * (1 + m2));                                                     // short : cash − Q·p = m2·Q·p
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
    p.entries.push({ idx: st.idx, qty, px, reason: j.reason, emotion: j.emotion, note: j.note, sl: p.sl, tp: p.tp });
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

    TA.settleOptions(g, st, ev);   // options arrivées à échéance

    // Frais d'emprunt : une action vendue à découvert est empruntée, ce qui coûte un taux annuel sur sa valeur.
    // Prélevé à chaque barre où la position reste ouverte ; il s'ajoute aux frais de la transaction (donc au résultat net).
    if (st.pos && st.pos.dir === -1 && mkt(g).borrow) {
      const bf = st.pos.qty * g.c[i] * mkt(g).borrow / TA.perYear(g);
      st.cash -= bf; st.pos.fees += bf;
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
    for (const o of (st.opts || []).slice()) {   // options encore ouvertes : vendues au prix acheteur
      const q = TA.optionQuote(g, st.idx, o.kind, o.strike, o.expIdx);
      st.cash += o.qty * CFG.OPT_MULT * q.bid - o.qty * CFG.OPT_FEE;
      recordOptionTrade(g, st, o, o.qty, q.bid, 'Fin de partie');
    }
    st.orders = [];
    st.call = null;
    st.closed = true;
    st.equity[st.equity.length - 1] = st.cash;
  };

  TA.metrics = function (g, st) {
    const c = g.c[st.idx], p = st.pos, d = p ? p.dir : 0;
    let optValue = 0, optUnreal = 0;
    for (const o of st.opts || []) {   // options détenues, valorisées à la prime théorique
      const mid = TA.optionQuote(g, st.idx, o.kind, o.strike, o.expIdx).mid;
      optValue += o.qty * CFG.OPT_MULT * mid;
      optUnreal += o.qty * CFG.OPT_MULT * (mid - o.avg) - o.fees;
    }
    const unreal = (p ? d * p.qty * (c - p.avg) - p.fees : 0) + optUnreal;
    const realized = st.trades.reduce((s, t) => s + t.net, 0);
    const equity = st.cash + (p ? d * p.qty * c : 0) + optValue;
    const total = equity - CFG.START_CASH, exposure = p ? p.qty * c : 0;
    return { price: c, equity, cash: st.cash, optValue, unreal, realized, total, totalPct: total / CFG.START_CASH, exposure, leverage: exposure > 0 && equity > 0 ? exposure / equity : 0, ratio: exposure > 0 ? equity / exposure : Infinity };
  };

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
    p.entries.push({ idx: i, qty, px: q.ask, reason: j.reason, emotion: j.emotion, note: j.note, sl: null, tp: null });
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

  /* ---------- Résumé de fin de partie ---------- */
  function closeAt(b, day) {
    const i = lowerBound(b.t, day + 1) - 1;
    return b.c[Math.max(0, i)];
  }
  TA.summary = function (g, st, bench) {
    const s0 = g.startIdx, s1 = st.idx;
    const day0 = g.t[s0], day1 = g.t[s1];
    const m = TA.metrics(g, st);
    const wins = st.trades.filter((t) => t.net > 0), losses = st.trades.filter((t) => t.net <= 0);
    const home = g.meta.x === 'TSX' ? 'tsx' : 'sp';
    const idxRet = (b) => closeAt(b, day1) / closeAt(b, day0) - 1;
    const curves = { you: [], asset: [], index: [] };
    for (let i = s0; i <= s1; i++) {
      curves.you.push((st.equity[i - s0] / CFG.START_CASH) * 100);
      curves.asset.push((g.c[i] / g.c[s0]) * 100);
      curves.index.push((closeAt(bench[home], g.t[i]) / closeAt(bench[home], day0)) * 100);
    }
    const per = g.style === 'long' ? TA.STYLES.long.perYear : mkt(g).perYear, mine = TA.drawdown(curves.you), asset = TA.drawdown(curves.asset);
    return {
      sharpe: TA.sharpe(curves.you, per), assetSharpe: TA.sharpe(curves.asset, per), maxDD: mine.max, assetMaxDD: asset.max,
      day0, day1, bars: s1 - s0, equity: m.equity, retPct: m.totalPct, total: m.total,
      trades: st.trades.length, wins: wins.length,
      winRate: st.trades.length ? wins.length / st.trades.length : null,
      avgWin: wins.length ? wins.reduce((s, t) => s + t.net, 0) / wins.length : null,
      avgLoss: losses.length ? losses.reduce((s, t) => s + t.net, 0) / losses.length : null,
      fees: st.trades.reduce((s, t) => s + t.fees, 0),
      bh: g.c[s1] / g.c[s0] - 1, sp: idxRet(bench.sp), tsx: idxRet(bench.tsx), home, curves,
    };
  };

  /* ---------- Sauvegarde : validation d'un fichier importé ---------- */
  const fin = (x) => typeof x === 'number' && Number.isFinite(x);
  const optNum = (x) => (x == null ? null : fin(x) ? x : NaN);

  /* ---------- Tracés du joueur : ligne horizontale (k 'h'), tendance ('t'), zone ('r') ---------- */
  // Un tracé garde la barre où il a été posé (at) : le coach ne juge une entrée que d'après les tracés déjà faits.
  const DRAW_MAX = 40;
  function cleanDraw(g, d, st) {
    if (!d || typeof d !== 'object') return null;
    const okI = (i) => Number.isInteger(i) && i >= 0 && i <= st.idx;   // jamais dans le futur
    const okP = (p) => fin(p) && p > 0 && p < 1e9;
    const at = Number.isInteger(d.at) && d.at >= 0 && d.at <= st.idx ? d.at : st.idx;
    if (d.k === 'h') return okP(d.p) ? { k: 'h', p: d.p, at } : null;
    if ((d.k === 't' || d.k === 'r') && d.a && d.b && okI(d.a.i) && okI(d.b.i) && okP(d.a.p) && okP(d.b.p)) {
      if (d.k === 't' && d.a.i === d.b.i) return null;
      return { k: d.k, a: { i: d.a.i, p: d.a.p }, b: { i: d.b.i, p: d.b.p }, at };
    }
    return null;
  }
  TA.addDraw = function (g, st, raw) {
    if (st.closed) return { ok: false, error: 'La partie est terminée.' };
    if (st.draw.length >= DRAW_MAX) return { ok: false, error: `Maximum ${DRAW_MAX} tracés : efface-en avant d’en ajouter.` };
    const d = cleanDraw(g, { ...raw, at: st.idx }, st);
    if (!d) return { ok: false, error: 'Tracé impossible à cet endroit.' };
    d.id = st.nextId++;
    st.draw.push(d);
    return { ok: true, draw: d };
  };
  TA.removeDraw = function (st, id) {
    const n = st.draw.length;
    st.draw = st.draw.filter((d) => d.id !== id);
    return st.draw.length < n;
  };
  // Déplace une ligne horizontale (le seul tracé qu'on glisse) ; sa barre de création ne change pas.
  TA.moveDraw = function (g, st, id, p) {
    const d = st.draw.find((x) => x.id === id);
    if (!d || d.k !== 'h' || !(fin(p) && p > 0 && p < 1e9)) return false;
    d.p = p;
    return true;
  };
  TA.clearDraws = function (st) { const n = st.draw.length; st.draw = []; return n; };
  // Reconstruit un état propre à partir d'un objet quelconque ; lève une erreur s'il est incohérent.
  TA.sanitizeState = function (raw, g) {
    const bad = () => { throw new Error('Fichier de sauvegarde invalide.'); };
    if (!raw || typeof raw !== 'object') bad();
    const idx = raw.idx;
    if (!Number.isInteger(idx) || idx < g.startIdx || idx > g.endIdx) bad();
    if (!fin(raw.cash) || Math.abs(raw.cash) > 1e9) bad();   // la trésorerie peut être négative (levier)
    if (!Array.isArray(raw.equity) || raw.equity.length !== idx - g.startIdx + 1 || !raw.equity.every(fin)) bad();
    const lvl = Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= TA.LEVELS.length ? raw.level : null;
    const st = { idx, cash: raw.cash, pos: null, orders: [], trades: [], fills: [], equity: raw.equity.slice(), nextId: Number.isInteger(raw.nextId) ? raw.nextId : 1, closed: !!raw.closed, log: [], rules: TA.rulesOf(raw.rules && raw.rules.id),
      level: lvl,   // null = ancienne sauvegarde : l'appli met le niveau actuel
      maxLev: TA.leverChoices(g.market, lvl || TA.LEVELS.length).includes(raw.maxLev) ? raw.maxLev : 1,   // le levier doit rester permis par le niveau
      call: raw.call && Number.isInteger(raw.call.idx) ? { idx: raw.call.idx } : null, ruined: !!raw.ruined, opts: [],
      disc: { noStop: 0, widened: 0, overRisk: 0 } };
    if (raw.disc && typeof raw.disc === 'object') for (const k of ['noStop', 'widened', 'overRisk']) if (Number.isInteger(raw.disc[k]) && raw.disc[k] >= 0) st.disc[k] = Math.min(raw.disc[k], 1e6);
    // entrées du journal : numériques, motifs et émotions limités aux listes connues
    const cleanEntries = (arr) => {
      const out = [];
      for (const e of Array.isArray(arr) ? arr.slice(0, 200) : []) {
        if (!e || !Number.isInteger(e.idx) || !fin(e.qty) || !fin(e.px)) bad();
        out.push({ idx: e.idx, qty: e.qty, px: e.px, reason: inList(TA.REASONS, e.reason), emotion: inList(TA.EMOTIONS, e.emotion), note: String(e.note || '').slice(0, 160), sl: fin(e.sl) && e.sl > 0 ? e.sl : null, tp: fin(e.tp) && e.tp > 0 ? e.tp : null });
      }
      return out;
    };
    if (raw.pos) {
      const p = raw.pos;
      if (!fin(p.qty) || p.qty <= 0 || !fin(p.avg) || p.avg <= 0 || !fin(p.fees) || !Number.isInteger(p.openIdx)) bad();
      const sl = optNum(p.sl), tp = optNum(p.tp);
      if (Number.isNaN(sl) || Number.isNaN(tp)) bad();
      const last = Number.isInteger(p.lastEntryIdx) ? p.lastEntryIdx : Number.isInteger(p.lastBuyIdx) ? p.lastBuyIdx : idx;
      st.pos = { dir: p.dir === -1 ? -1 : 1, qty: p.qty, avg: p.avg, fees: p.fees, sl, tp, openIdx: p.openIdx, lastEntryIdx: last, entries: cleanEntries(p.entries), risk0: fin(p.risk0) && p.risk0 > 0 ? p.risk0 : 0 };
    }
    for (const o of Array.isArray(raw.orders) ? raw.orders : []) {
      if (!['buy', 'sell'].includes(o.side) || !['limit', 'stop'].includes(o.type) || !Number.isInteger(o.qty) || o.qty < 1 || !fin(o.price) || o.price <= 0) bad();
      const sl = optNum(o.sl), tp = optNum(o.tp);
      if (Number.isNaN(sl) || Number.isNaN(tp)) bad();
      st.orders.push({ id: Number.isInteger(o.id) ? o.id : st.nextId++, side: o.side, type: o.type, qty: o.qty, price: o.price, sl, tp, idx: Number.isInteger(o.idx) ? o.idx : idx, j: o.j ? cleanJ(o.j) : null, intent: o.intent === 'close' || o.intent === 'open' ? o.intent : o.side === 'sell' ? 'close' : 'open' });
    }
    for (const t of Array.isArray(raw.trades) ? raw.trades : []) {
      if (![t.qty, t.entry, t.exit, t.fees, t.net, t.ret].every(fin) || !Number.isInteger(t.openIdx) || !Number.isInteger(t.closeIdx)) bad();
      const rec = {
        id: Number.isInteger(t.id) ? t.id : st.nextId++, dir: t.dir === -1 ? -1 : 1, openIdx: t.openIdx, closeIdx: t.closeIdx, qty: t.qty, entry: t.entry, exit: t.exit, fees: t.fees, net: t.net, ret: t.ret,
        reason: String(t.reason || '').slice(0, 40), entries: cleanEntries(t.entries), risk0: fin(t.risk0) && t.risk0 > 0 ? t.risk0 : 0, r: fin(t.r) ? t.r : null, note: String(t.note || '').slice(0, 300),
      };
      if (t.kind === 'option' && t.opt && ['call', 'put'].includes(t.opt.kind) && fin(t.opt.strike) && Number.isInteger(t.opt.expIdx)) {
        rec.kind = 'option'; rec.opt = { kind: t.opt.kind, strike: t.opt.strike, expIdx: t.opt.expIdx };
        rec.dir = 1;
        const rec2 = { id: rec.id, kind: rec.kind, opt: rec.opt, ...rec };   // ordre des champs identique à celui du moteur
        st.trades.push(rec2);
      } else st.trades.push(rec);
    }
    for (const o of Array.isArray(raw.opts) ? raw.opts.slice(0, 50) : []) {
      if (!o || !['call', 'put'].includes(o.kind) || !fin(o.strike) || o.strike <= 0 || !Number.isInteger(o.expIdx) || !Number.isInteger(o.qty) || o.qty < 1 || !fin(o.avg) || o.avg < 0 || !fin(o.fees) || !Number.isInteger(o.openIdx)) bad();
      st.opts.push({ id: Number.isInteger(o.id) ? o.id : st.nextId++, kind: o.kind, strike: o.strike, expIdx: o.expIdx, qty: o.qty, avg: o.avg, fees: o.fees, openIdx: o.openIdx, entries: cleanEntries(o.entries), risk0: fin(o.risk0) && o.risk0 > 0 ? o.risk0 : 0 });
    }
    for (const f of Array.isArray(raw.fills) ? raw.fills : []) {
      if (!['buy', 'sell'].includes(f.side) || !Number.isInteger(f.idx) || !fin(f.qty) || !fin(f.px)) bad();
      st.fills.push({ idx: f.idx, side: f.side, qty: f.qty, px: f.px });
    }
    if (Array.isArray(raw.log)) st.log = raw.log.slice(0, 2000).filter((e) => e && typeof e === 'object');
    st.draw = [];   // les tracés invalides sont écartés sans faire échouer la lecture
    for (const d of Array.isArray(raw.draw) ? raw.draw.slice(0, DRAW_MAX) : []) {
      const c = cleanDraw(g, d, st);
      if (c) { c.id = Number.isInteger(d.id) && d.id > 0 ? d.id : st.nextId++; st.draw.push(c); }
    }
    return st;
  };
})();
