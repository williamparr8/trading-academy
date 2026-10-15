/* Trading Academy — campagne : générateurs d'exercices.
   Chaque « sorte » (kind) fabrique une question à partir de vraies données (graphiques cachés), de sociétés fictives
   (FUND) ou de nombres tirés au hasard. La bonne réponse est TOUJOURS calculée à partir de ce qui est affiché.
   Question : { type:'mcq'|'num', text, svg?, html?, opts?, a?, num?, expl, hint }. Logique pure (sans DOM). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CG = (TA.CAMPGEN = {});
  CG.stats = { total: 0, miss: 0 };   // fenêtres cherchées / critère non trouvé (surveillé par les tests)

  /* ---------- outils ---------- */
  const f = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  const R = (r, a, b) => a + r() * (b - a);
  const RI = (r, a, b) => Math.floor(a + r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shuffle = (r, a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const mcq = (r, text, correct, wrongs, extra = {}) => {
    const uniq = []; for (const w of wrongs) if (w !== correct && !uniq.includes(w)) uniq.push(w);
    const opts = extra.fixed ? [correct, ...uniq].sort() : shuffle(r, [correct, ...uniq]);   // fixed : A, B, C, D dans l'ordre
    return { type: 'mcq', text, opts, a: opts.indexOf(correct), ...extra };
  };
  const num = (text, answer, unit, dec, extra = {}) => ({ type: 'num', text, num: { answer, unit: unit || '', dec: dec == null ? 2 : dec }, ...extra });
  // choix numériques pour le niveau Apprenti : la bonne valeur et trois valeurs plausibles
  CG.numChoices = (r, q) => {
    const { answer, dec, unit } = q.num, set = new Map();
    const add = (v) => { const k = f(v, dec); if (!set.has(k) && Number.isFinite(v)) set.set(k, v); };
    add(answer);
    const base = Math.abs(answer) || 1;
    for (const m of shuffle(r, [0.5, 1.5, 2, 0.75, 1.25, 0.1, 3])) { if (set.size >= 4) break; add(answer * m + (answer === 0 ? base : 0)); }
    let k = 1; while (set.size < 4) add(answer + k++ * Math.pow(10, -dec) * 7);
    const vals = shuffle(r, [...set.keys()]);
    const labels = vals.map((v) => v + (unit ? ' ' + unit : ''));
    return { opts: labels, a: vals.indexOf(f(answer, dec)) };
  };

  /* ---------- indicateurs ---------- */
  const sma = (c, i, n) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += c[j]; return s / n; };
  const atr = (d, i, n = 14) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += Math.max(d.h[j] - d.l[j], Math.abs(d.h[j] - d.c[j - 1]), Math.abs(d.l[j] - d.c[j - 1])); return s / n; };
  const rsi = (c, i, n = 14) => { let up = 0, dn = 0; for (let j = i - n + 1; j <= i; j++) { const x = c[j] - c[j - 1]; if (x > 0) up += x; else dn -= x; } return dn === 0 ? 100 : 100 - 100 / (1 + up / dn); };
  const ema = (c, i, n) => { let e = c[Math.max(0, i - n * 6)]; const k = 2 / (n + 1); for (let j = Math.max(1, i - n * 6 + 1); j <= i; j++) e = c[j] * k + e * (1 - k); return e; };
  const macdAt = (c, i) => {
    const line = (j) => ema(c, j, 12) - ema(c, j, 26);
    const s = []; for (let j = i - 20; j <= i; j++) s.push(line(j));
    let sig = s[0]; const k = 2 / 10;
    for (let j = 1; j < s.length; j++) sig = s[j] * k + sig * (1 - k);
    return { m: s[s.length - 1], sig, prevM: s[s.length - 2] };
  };
  CG.ind = { sma, atr, rsi, ema, macdAt };

  // sommets et creux (pivots) sur [from, to]
  const pivots = (d, from, to, k = 3) => {
    const hi = [], lo = [];
    for (let j = from + k; j <= to - k; j++) {
      let isH = true, isL = true;
      for (let t = 1; t <= k; t++) { if (d.h[j] < d.h[j - t] || d.h[j] < d.h[j + t]) isH = false; if (d.l[j] > d.l[j - t] || d.l[j] > d.l[j + t]) isL = false; }
      if (isH) hi.push({ j, p: d.h[j] }); if (isL) lo.push({ j, p: d.l[j] });
    }
    return { hi, lo };
  };

  // issue d'une position prise à la clôture de la barre i (stop 1,5 ATR, objectif 2 R, 20 barres)
  const outcome = (d, i, dir) => {
    const e = d.c[i], risk = 1.5 * atr(d, i), stop = e - dir * risk, tgt = e + dir * 2 * risk;
    for (let j = i + 1; j <= i + 20 && j < d.c.length; j++) {
      if (dir === 1) { if (d.o[j] <= stop) return (d.o[j] - e) / risk; if (d.l[j] <= stop) return -1; if (d.h[j] >= tgt) return 2; }
      else { if (d.o[j] >= stop) return (e - d.o[j]) / risk; if (d.h[j] >= stop) return -1; if (d.l[j] <= tgt) return 2; }
    }
    const j = Math.min(i + 20, d.c.length - 1);
    return (dir * (d.c[j] - e)) / risk;
  };

  /* ---------- fenêtres de données réelles ---------- */
  // cherche une fenêtre qui satisfait pred ; sinon renvoie une fenêtre quelconque (la réponse est recalculée dessus)
  function win(ctx, pred, o = {}) {
    const { rng, assets } = ctx;
    CG.stats.total++;
    const pool = o.vol ? assets.filter((a) => a.hasVol) : assets;
    const src = pool.length ? pool : assets;
    for (let t = 0; t < 700; t++) {
      const a = src[Math.floor(rng() * src.length)], n = a.d.c.length, lo = 90, hi = n - 30;
      if (hi <= lo) continue;
      const i = lo + Math.floor(rng() * (hi - lo));
      if (!pred || pred(a.d, i)) return { d: a.d, i, id: a.id, ok: true };
    }
    CG.stats.miss++;
    const a = src[0];
    return { d: a.d, i: Math.min(150, a.d.c.length - 40), id: a.id, ok: false };
  }

  function chart(d, i, o = {}) {
    const W = o.w || 640, H = o.h || 300, bars = o.bars || 60, fut = o.fut || 0, last = Math.min(d.c.length - 1, i + fut), from = i - bars + 1;
    const vol = o.vol !== false && d.v && d.v.some((x) => x > 0) && o.vol;
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (let j = from; j <= last; j++) { lo = Math.min(lo, d.l[j]); hi = Math.max(hi, d.h[j]); vmax = Math.max(vmax, d.v ? d.v[j] : 0); }
    for (const h of o.hl || []) { lo = Math.min(lo, h.p); hi = Math.max(hi, h.p); }
    const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
    const ph = vol ? H * 0.78 : H - 8, Y = (v) => 4 + ((hi - v) / (hi - lo)) * (ph - 8), padR = 52, bw = (W - padR) / (bars + fut), X = (j) => 4 + (j - from) * bw + bw / 2;
    let s = '';
    for (let j = from; j <= last; j++) {
      const up = d.c[j] >= d.o[j], col = j > i ? (up ? '#ffffff' : '#9aa0a6') : (up ? '#1fb36b' : '#f23d4a'), x = X(j);
      s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${Y(d.h[j]).toFixed(1)}" y2="${Y(d.l[j]).toFixed(1)}" stroke="${col}"/><rect x="${(x - bw * 0.33).toFixed(1)}" y="${Math.min(Y(d.o[j]), Y(d.c[j])).toFixed(1)}" width="${(bw * 0.66).toFixed(1)}" height="${Math.max(1, Math.abs(Y(d.o[j]) - Y(d.c[j]))).toFixed(1)}" fill="${col}"/>`;
      if (vol && d.v[j] > 0) s += `<rect x="${(x - bw * 0.33).toFixed(1)}" y="${(H - (d.v[j] / vmax) * (H * 0.2)).toFixed(1)}" width="${(bw * 0.66).toFixed(1)}" height="${((d.v[j] / vmax) * (H * 0.2)).toFixed(1)}" fill="#3a5f8f"/>`;
    }
    for (const n of o.ma || []) {
      let p = '';
      for (let j = Math.max(from, n - 1); j <= i; j++) p += `${X(j).toFixed(1)},${Y(sma(d.c, j, n)).toFixed(1)} `;
      s += `<polyline points="${p}" fill="none" stroke="${n <= 20 ? '#f0b34a' : '#4f9dff'}" stroke-width="1.4"/>`;
    }
    for (const h of o.hl || []) s += `<line x1="0" x2="${W - padR}" y1="${Y(h.p).toFixed(1)}" y2="${Y(h.p).toFixed(1)}" stroke="${h.c || '#f0b34a'}" stroke-dasharray="5 3" stroke-width="1.4"/><text x="${W - 6}" y="${(Y(h.p) + 4).toFixed(1)}" text-anchor="end" fill="${h.c || '#f0b34a'}" font-size="12" font-weight="700">${h.t}</text>`;
    for (const m of o.marks || []) s += `<path d="M${X(m.j).toFixed(1)},${(Y(d.h[m.j]) - 8).toFixed(1)} l-5,-9 l10,0 z" fill="#fff"/><text x="${X(m.j).toFixed(1)}" y="${(Y(d.h[m.j]) - 20).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="11">${m.t || ''}</text>`;
    s += `<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="0" y2="${H}" stroke="#555" stroke-dasharray="2 3"/>`;
    return `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique de l’exercice">${s}</svg>`;
  }
  CG.chart = chart;

  /* ---------- sociétés fictives ---------- */
  const money = (x) => Math.round(x).toLocaleString('fr-CA').replace(/ | /g, ' ');

  /* ---------- sortes d'exercices ---------- */
  const K = (CG.kinds = {});
  const NOTE = { dir: 'direction', body: 'corps', range: 'amplitude', upper: 'mèche haute', lower: 'mèche basse', chg: 'variation' };

  K.spreadCost = (ctx, p) => {
    const { rng } = ctx, bid = RI(rng, 20, 150) + (ctx.lvl > 0 ? RI(rng, 0, 99) / 100 : 0), s = pick(rng, [0.02, 0.05, 0.1, 0.25, 0.5]), ask = bid + s, n = pick(rng, [100, 200, 500, 1000]);
    const mode = p.mode || 'abs';
    if (mode === 'pct') return num(`Une action cote ${f(bid)} $ (bid) et ${f(ask)} $ (ask). Quel est le spread en pourcentage du prix d’achat (ask) ?`, (s / ask) * 100, '%', 3, { expl: `Spread = ask − bid = ${f(s)} $. En pourcentage de l’ask : ${f(s)} ÷ ${f(ask)} = ${f((s / ask) * 100, 3)} %.`, hint: 'Divise l’écart (ask − bid) par le prix d’achat.' });
    if (mode === 'round') return num(`Tu achètes ${n} actions au ask (${f(ask)} $) puis tu les revends immédiatement au bid (${f(bid)} $). Combien le spread te coûte-t-il ?`, n * s, '$', 2, { expl: `Aller-retour : ${n} × (${f(ask)} − ${f(bid)}) = ${f(n * s)} $. Le spread est un coût payé à chaque transaction.`, hint: 'Tu achètes au ask et tu vends au bid.' });
    return num(`Une action cote ${f(bid)} $ (bid) et ${f(ask)} $ (ask). Quel est le spread en dollars ?`, s, '$', 2, { expl: `Spread = ask − bid = ${f(ask)} − ${f(bid)} = ${f(s)} $.`, hint: 'Le spread est l’écart entre le prix demandé (ask) et le prix offert (bid).' });
  };

  K.candleNums = (ctx, p) => {
    const { rng } = ctx, base = RI(rng, 30, 150), up = rng() < 0.5, body = R(rng, 0.3, 3.2), u = R(rng, 0.1, 2), l = R(rng, 0.1, 2);
    const o = base, c = up ? base + body : base - body, h = Math.max(o, c) + u, lo = Math.min(o, c) - l;
    const d2 = (x) => Math.round(x * 100) / 100;
    const O = d2(o), C = d2(c), H = d2(h), L = d2(lo);
    const t = `Une bougie journalière : ouverture ${f(O)} $, plus haut ${f(H)} $, plus bas ${f(L)} $, clôture ${f(C)} $.`;
    const ask = p.ask || pick(rng, ['dir', 'body', 'range']);
    if (ask === 'dir') return mcq(rng, `${t} Cette bougie est-elle haussière ou baissière ?`, C >= O ? 'Haussière' : 'Baissière', [C >= O ? 'Baissière' : 'Haussière', 'Impossible à dire'], { expl: C >= O ? 'La clôture est au-dessus de l’ouverture : bougie haussière.' : 'La clôture est sous l’ouverture : bougie baissière.', hint: 'Compare la clôture à l’ouverture.' });
    const ans = { body: Math.abs(C - O), range: H - L, upper: H - Math.max(O, C), lower: Math.min(O, C) - L, chg: ((C - O) / O) * 100 }[ask];
    const q = { body: 'Quelle est la longueur du corps (en $) ?', range: 'Quelle est l’amplitude de la bougie, du plus bas au plus haut (en $) ?', upper: 'Quelle est la longueur de la mèche haute (en $) ?', lower: 'Quelle est la longueur de la mèche basse (en $) ?', chg: 'Quelle est la variation de la séance, de l’ouverture à la clôture (en %) ?' }[ask];
    const ex = { body: `Corps = |clôture − ouverture| = |${f(C)} − ${f(O)}|.`, range: `Amplitude = plus haut − plus bas = ${f(H)} − ${f(L)}.`, upper: `Mèche haute = plus haut − max(ouverture, clôture) = ${f(H)} − ${f(Math.max(O, C))}.`, lower: `Mèche basse = min(ouverture, clôture) − plus bas = ${f(Math.min(O, C))} − ${f(L)}.`, chg: `Variation = (clôture − ouverture) ÷ ouverture = (${f(C)} − ${f(O)}) ÷ ${f(O)}.` }[ask];
    return num(`${t} ${q}`, ans, ask === 'chg' ? '%' : '$', 2, { expl: ex, hint: `Il s’agit de la ${NOTE[ask]}.` });
  };

  const PATS = {
    doji: { n: 'Doji', t: (d, i) => { const b = Math.abs(d.c[i] - d.o[i]), r = d.h[i] - d.l[i]; return r > 0 && b <= 0.1 * r && r >= 0.6 * atr(d, i); }, e: 'Corps minuscule : ouverture et clôture presque égales, le marché hésite.' },
    hammer: { n: 'Marteau', t: (d, i) => { const b = Math.abs(d.c[i] - d.o[i]), lw = Math.min(d.c[i], d.o[i]) - d.l[i], uw = d.h[i] - Math.max(d.c[i], d.o[i]); return b > 0 && lw >= 2 * b && uw <= 0.5 * b && d.c[i - 1] < d.c[i - 3] && d.h[i] - d.l[i] >= 0.6 * atr(d, i); }, e: 'Longue mèche basse, petit corps en haut, après une baisse : rejet des prix bas.' },
    shooting: { n: 'Étoile filante', t: (d, i) => { const b = Math.abs(d.c[i] - d.o[i]), lw = Math.min(d.c[i], d.o[i]) - d.l[i], uw = d.h[i] - Math.max(d.c[i], d.o[i]); return b > 0 && uw >= 2 * b && lw <= 0.5 * b && d.c[i - 1] > d.c[i - 3] && d.h[i] - d.l[i] >= 0.6 * atr(d, i); }, e: 'Longue mèche haute, petit corps en bas, après une hausse : rejet des prix hauts.' },
    engBull: { n: 'Avalement haussier', t: (d, i) => d.c[i - 1] < d.o[i - 1] && d.c[i] > d.o[i] && d.o[i] <= d.c[i - 1] && d.c[i] >= d.o[i - 1], e: 'Une grande bougie haussière englobe le corps de la bougie baissière précédente.' },
    engBear: { n: 'Avalement baissier', t: (d, i) => d.c[i - 1] > d.o[i - 1] && d.c[i] < d.o[i] && d.o[i] >= d.c[i - 1] && d.c[i] <= d.o[i - 1], e: 'Une grande bougie baissière englobe le corps de la bougie haussière précédente.' },
    maru: { n: 'Marubozu', t: (d, i) => { const r = d.h[i] - d.l[i]; return r > 0 && Math.abs(d.c[i] - d.o[i]) >= 0.9 * r && r >= atr(d, i); }, e: 'Corps presque sans mèches : un camp a dominé la séance de bout en bout.' },
  };
  K.candlePat = (ctx, p) => {
    const { rng } = ctx, ids = p.pats || ['doji', 'hammer', 'shooting'], want = pick(rng, ids);
    const w = win(ctx, (d, i) => PATS[want].t(d, i) && !ids.some((x) => x !== want && PATS[x].t(d, i)));
    const hit = ids.find((x) => PATS[x].t(w.d, w.i));
    const none = 'Aucune de ces figures';
    const correct = hit ? PATS[hit].n : none;
    const opts = ids.map((x) => PATS[x].n);
    return mcq(rng, 'Quelle figure forme la dernière bougie (marquée) ?', correct, [...opts, none].filter((x) => x !== correct).slice(0, 3 + (ctx.lvl > 0 ? 1 : 0)), { svg: chart(w.d, w.i, { bars: 16, marks: [{ j: w.i, t: '' }], h: 260 }), expl: hit ? PATS[hit].e : 'Aucune des figures proposées ne correspond : le corps et les mèches ne remplissent pas leurs critères.', hint: 'Regarde la taille du corps par rapport aux mèches, puis la direction précédente.' });
  };

  K.volRead = (ctx) => {
    const { rng } = ctx;
    const w = win(ctx, (d, i) => { const a = sum(d.v.slice(i - 20, i)) / 20; return a > 0 && (d.v[i] / a > 1.6 || d.v[i] / a < 0.8); }, { vol: true });
    const a = sum(w.d.v.slice(w.i - 20, w.i)) / 20, r = a > 0 ? w.d.v[w.i] / a : 1;
    const cat = r > 1.5 ? 'Nettement supérieur à la moyenne' : r > 1.05 ? 'Légèrement supérieur' : 'Inférieur ou égal à la moyenne';
    return mcq(rng, 'Le volume de la dernière barre (en bas du graphique) est…', cat, ['Nettement supérieur à la moyenne', 'Légèrement supérieur', 'Inférieur ou égal à la moyenne'], { svg: chart(w.d, w.i, { bars: 40, vol: true }), expl: `Le volume est ${f(r, 1)} fois la moyenne des 20 barres précédentes. Un volume élevé traduit un engagement plus fort des participants.`, hint: 'Compare la dernière barre de volume à celles qui la précèdent.' });
  };

  K.trendId = (ctx, p) => {
    const { rng } = ctx, n = p.n || 40, allowR = !!p.range, want = pick(rng, allowR ? ['up', 'down', 'flat'] : ['up', 'down']);
    const T = (d, i) => (d.c[i] - d.c[i - n]) / atr(d, i);
    const w = win(ctx, (d, i) => (want === 'up' ? T(d, i) > 4 : want === 'down' ? T(d, i) < -4 : Math.abs(T(d, i)) < 1.2));
    const t = T(w.d, w.i), cls = t > 4 ? 'Tendance haussière' : t < -4 ? 'Tendance baissière' : Math.abs(t) < 1.2 && allowR ? 'Marché latéral' : t > 0 ? 'Tendance haussière' : 'Tendance baissière';
    const names = ['Tendance haussière', 'Tendance baissière', ...(allowR ? ['Marché latéral'] : [])];
    return mcq(rng, `Quelle est la tendance sur les ${n} dernières barres ?`, cls, names, { svg: chart(w.d, w.i, { bars: Math.max(50, n + 10), ma: ctx.lvl === 0 ? [20, 50] : [] }), expl: `En ${n} barres le prix a varié de ${f(t, 1)} fois l’amplitude moyenne quotidienne (ATR). ${cls === 'Marché latéral' ? 'Il n’y a pas de direction nette : le prix oscille.' : 'La direction est nette.'}`, hint: 'Compare le prix d’il y a n barres à aujourd’hui, et regarde si les sommets et les creux montent ou descendent.' });
  };

  K.trendPick = (ctx, p) => {
    const { rng } = ctx, want = p.want || pick(rng, ['up', 'down']), n = 40, T = (d, i) => (d.c[i] - d.c[i - n]) / atr(d, i);
    const good = win(ctx, (d, i) => (want === 'up' ? T(d, i) > 4 : T(d, i) < -4));
    const others = [0, 1].map(() => win(ctx, (d, i) => (want === 'up' ? T(d, i) < 1 : T(d, i) > -1)));
    const all = shuffle(rng, [{ w: good, ok: true }, ...others.map((w) => ({ w, ok: false }))]);
    const letters = ['A', 'B', 'C'], corr = letters[all.findIndex((x) => x.ok)];
    const svg = all.map((x, k) => `<div class="cq-mini"><b>${letters[k]}</b>${chart(x.w.d, x.w.i, { bars: 50, h: 170, w: 420 })}</div>`).join('');
    return mcq(rng, `Lequel de ces trois graphiques montre une tendance ${want === 'up' ? 'haussière' : 'baissière'} ?`, corr, letters, { fixed: true, html: `<div class="cq-grid">${svg}</div>`, expl: `Le graphique ${corr} est celui où le prix a le plus ${want === 'up' ? 'monté' : 'baissé'} sur la période, avec des sommets et des creux ${want === 'up' ? 'croissants' : 'décroissants'}.`, hint: 'Cherche le graphique dont les sommets et les creux vont tous dans le même sens.' });
  };

  K.swingRead = (ctx) => {
    const { rng } = ctx, want = pick(rng, ['up', 'down', 'mix']);
    const cls = (d, i) => {
      const pv = pivots(d, i - 70, i, 3), h = pv.hi.slice(-2), l = pv.lo.slice(-2);
      if (h.length < 2 || l.length < 2) return null;
      const hh = h[1].p > h[0].p, hl = l[1].p > l[0].p;
      return hh && hl ? 'up' : !hh && !hl ? 'down' : 'mix';
    };
    const w = win(ctx, (d, i) => cls(d, i) === want);
    const c = cls(w.d, w.i) || 'mix', pv = pivots(w.d, w.i - 70, w.i, 3);
    const names = { up: 'Sommets et creux de plus en plus hauts', down: 'Sommets et creux de plus en plus bas', mix: 'Structure mixte, sans direction claire' };
    const marks = [...pv.hi.slice(-2), ...pv.lo.slice(-2)].map((x) => ({ j: x.j, t: '' }));
    return mcq(rng, 'Que dit la structure des deux derniers sommets et des deux derniers creux (marqués) ?', names[c], Object.values(names), { svg: chart(w.d, w.i, { bars: 70, marks }), expl: c === 'up' ? 'Chaque nouveau sommet et chaque nouveau creux dépasse le précédent : c’est la définition d’une tendance haussière.' : c === 'down' ? 'Sommets et creux de plus en plus bas : tendance baissière.' : 'Un sommet monte alors que le creux baisse (ou l’inverse) : pas de tendance claire.', hint: 'Compare le dernier sommet au précédent, puis le dernier creux au précédent.' });
  };

  K.srPick = (ctx, p) => {
    const { rng } = ctx, sup = p.side !== 'res';
    const cluster = (d, i) => {
      const pv = pivots(d, i - 80, i, 3), pts = (sup ? pv.lo : pv.hi).map((x) => x.p), tol = 0.4 * atr(d, i);
      let best = null;
      for (const a of pts) { const grp = pts.filter((b) => Math.abs(b - a) <= tol); if (!best || grp.length > best.n) best = { p: sum(grp) / grp.length, n: grp.length }; }
      return best;
    };
    const w = win(ctx, (d, i) => { const c = cluster(d, i); return c && c.n >= 3; });
    const best = cluster(w.d, w.i) || { p: w.d.c[w.i], n: 1 }, A = atr(w.d, w.i);
    let lo = Infinity, hi = -Infinity;
    for (let j = w.i - 60; j <= w.i; j++) { lo = Math.min(lo, w.d.l[j]); hi = Math.max(hi, w.d.h[j]); }
    const lines = [best.p];
    // les faux niveaux ne doivent tomber ni sur la ligne retenue ni sur un autre groupe de contacts (sinon deux réponses seraient défendables)
    const touches = (sup ? pivots(w.d, w.i - 80, w.i, 3).lo : pivots(w.d, w.i - 80, w.i, 3).hi).map((x) => x.p);
    for (let t = 0; t < 200 && lines.length < 4; t++) { const v = R(rng, lo, hi); if (lines.every((x) => Math.abs(x - v) > 0.9 * A) && touches.every((x) => Math.abs(x - v) > (t < 150 ? 0.5 : 0.25) * A)) lines.push(v); }
    while (lines.length < 4) lines.push(best.p + (lines.length * 1.2 + 1) * A);
    const order = shuffle(rng, lines.map((v, k) => ({ v, ok: k === 0 })));
    const letters = ['A', 'B', 'C', 'D'], hl = order.map((x, k) => ({ p: x.v, t: letters[k], c: ['#f0b34a', '#4f9dff', '#b69cff', '#4cc3d9'][k] }));
    const corr = letters[order.findIndex((x) => x.ok)];
    return mcq(rng, `Quelle ligne est le ${sup ? 'support' : 'la résistance'} le plus solide ?`, corr, letters, { fixed: true, svg: chart(w.d, w.i, { bars: 80, hl }), expl: `La ligne ${corr} a été touchée environ ${best.n} fois sur ${sup ? 'des creux' : 'des sommets'} : un niveau est solide quand le prix y a réagi plusieurs fois.`, hint: 'Compte combien de fois le prix a rebondi sur chaque ligne.' });
  };

  K.breakVol = (ctx) => {
    const { rng } = ctx, want = rng() < 0.5;
    const cond = (d, i) => { let mx = -Infinity; for (let j = i - 20; j < i; j++) mx = Math.max(mx, d.h[j]); const a = sum(d.v.slice(i - 20, i)) / 20; if (!(d.c[i] > mx && a > 0)) return false; const r = d.v[i] / a; return want ? r > 1.5 : r < 0.9; };
    const w = win(ctx, cond, { vol: true });
    let mx = -Infinity; for (let j = w.i - 20; j < w.i; j++) mx = Math.max(mx, w.d.h[j]);
    const a = sum(w.d.v.slice(w.i - 20, w.i)) / 20, r = a > 0 ? w.d.v[w.i] / a : 1, brk = w.d.c[w.i] > mx, conf = r > 1.5;
    const yes = 'Oui : volume nettement supérieur, la cassure est confirmée', no = 'Non : volume faible, la cassure est suspecte';
    return mcq(rng, brk ? 'La dernière barre casse le plus haut des 20 barres précédentes. La cassure est-elle confirmée par le volume ?' : 'Le prix n’a pas cassé le plus haut des 20 dernières barres. Le volume suffit-il à parler de cassure confirmée ?', brk ? (conf ? yes : no) : no, [yes, no], { svg: chart(w.d, w.i, { bars: 45, vol: true, hl: [{ p: mx, t: 'plus haut 20 j', c: '#f0b34a' }] }), expl: `Le volume de la barre est ${f(r, 1)} fois la moyenne. Une cassure appuyée par un volume élevé est plus fiable.`, hint: 'Regarde la barre de volume de la dernière séance.' });
  };

  K.maRead = (ctx, p) => {
    const { rng } = ctx, mode = p.mode || 'slope';
    if (mode === 'slope') {
      const want = pick(rng, ['up', 'down', 'flat']), S = (d, i) => (sma(d.c, i, 50) - sma(d.c, i - 10, 50)) / atr(d, i);
      const w = win(ctx, (d, i) => (want === 'up' ? S(d, i) > 1 : want === 'down' ? S(d, i) < -1 : Math.abs(S(d, i)) < 0.25));
      const s = S(w.d, w.i), c = s > 0.6 ? 'Montante' : s < -0.6 ? 'Descendante' : 'Plate';
      return mcq(rng, 'Comment évolue la moyenne mobile 50 jours (ligne bleue) ?', c, ['Montante', 'Descendante', 'Plate'], { svg: chart(w.d, w.i, { bars: 70, ma: [20, 50] }), expl: 'Une moyenne qui monte confirme une tendance haussière ; qui descend, une tendance baissière ; plate, un marché sans direction.', hint: 'Regarde la ligne bleue : va-t-elle vers le haut, vers le bas ou reste-t-elle à plat ?' });
    }
    if (mode === 'priceVs') {
      const want = rng() < 0.5, S = (d, i) => (d.c[i] - sma(d.c, i, 50)) / atr(d, i);
      const w = win(ctx, (d, i) => (want ? S(d, i) > 1 : S(d, i) < -1));
      const above = w.d.c[w.i] > sma(w.d.c, w.i, 50);
      return mcq(rng, 'Où se situe le prix par rapport à la moyenne mobile 50 jours (ligne bleue) ?', above ? 'Au-dessus' : 'Au-dessous', ['Au-dessus', 'Au-dessous'], { svg: chart(w.d, w.i, { bars: 70, ma: [50] }), expl: above ? 'Un prix au-dessus de sa moyenne longue indique une force relative : les acheteurs dominent.' : 'Un prix sous sa moyenne longue indique une faiblesse relative : les vendeurs dominent.', hint: 'Compare la dernière bougie à la ligne bleue.' });
    }
    const want = pick(rng, ['up', 'down', 'none']);
    const cr = (d, i) => { for (let j = i - 7; j <= i; j++) { const a0 = sma(d.c, j - 1, 20) - sma(d.c, j - 1, 50), a1 = sma(d.c, j, 20) - sma(d.c, j, 50); if (a0 <= 0 && a1 > 0) return 'up'; if (a0 >= 0 && a1 < 0) return 'down'; } return 'none'; };
    const w = win(ctx, (d, i) => cr(d, i) === want);
    const c = cr(w.d, w.i), names = { up: 'Croisement haussier récent (MM20 passe au-dessus de MM50)', down: 'Croisement baissier récent (MM20 passe sous MM50)', none: 'Aucun croisement dans les 8 dernières barres' };
    return mcq(rng, 'Que s’est-il passé entre la MM20 (orange) et la MM50 (bleue) ces 8 dernières barres ?', names[c], Object.values(names), { svg: chart(w.d, w.i, { bars: 60, ma: [20, 50] }), expl: c === 'none' ? 'Les deux moyennes ne se sont pas croisées récemment.' : 'Le croisement de la moyenne courte avec la moyenne longue est un signal de changement d’élan, souvent tardif.', hint: 'Cherche l’endroit où la ligne orange traverse la ligne bleue.' });
  };

  K.rsiRead = (ctx, p) => {
    const { rng } = ctx, mode = p.mode || 'zone';
    if (mode === 'ctx') {
      const w = win(ctx, (d, i) => rsi(d.c, i) > 70 && d.c[i] > sma(d.c, i, 50) && sma(d.c, i, 20) > sma(d.c, i, 50));
      const v = rsi(w.d.c, w.i), ok = 'L’élan est fort : en tendance haussière, un RSI élevé peut durer, ce n’est pas un signal de vente automatique';
      return mcq(rng, `Le RSI vaut ${f(v, 0)}, le prix est au-dessus de ses moyennes en tendance haussière. Que conclure ?`, ok, ['Vendre à découvert tout de suite : le RSI est suracheté', 'Le prix va forcément chuter demain', ok], { svg: chart(w.d, w.i, { bars: 60, ma: [20, 50] }), expl: 'Le RSI mesure l’élan, pas la valeur. Dans une tendance forte il peut rester au-dessus de 70 longtemps : l’utiliser seul pour vendre est une erreur classique.', hint: 'Un indicateur d’élan élevé peut signifier une tendance forte.' });
    }
    const want = pick(rng, ['over', 'under', 'mid']);
    const w = win(ctx, (d, i) => (want === 'over' ? rsi(d.c, i) > 72 : want === 'under' ? rsi(d.c, i) < 28 : rsi(d.c, i) > 42 && rsi(d.c, i) < 58));
    const v = rsi(w.d.c, w.i), c = v > 70 ? 'Surachat (RSI au-dessus de 70)' : v < 30 ? 'Survente (RSI sous 30)' : 'Zone neutre (entre 30 et 70)';
    return mcq(rng, `Le RSI (14) de la dernière barre vaut ${f(v, 0)}. Dans quelle zone est-il ?`, c, ['Surachat (RSI au-dessus de 70)', 'Survente (RSI sous 30)', 'Zone neutre (entre 30 et 70)'], { svg: chart(w.d, w.i, { bars: 50 }), expl: 'Au-dessus de 70 : zone de surachat ; sous 30 : zone de survente ; entre les deux : neutre. Ce sont des zones d’attention, pas des ordres.', hint: 'Les seuils usuels sont 30 et 70.' });
  };

  K.macdRead = (ctx, p) => {
    const { rng } = ctx, want = pick(rng, ['up', 'down', 'none']);
    const cr = (d, i) => { const a = macdAt(d.c, i), b = macdAt(d.c, i - 3); const sa = a.m - a.sig, sb = b.m - b.sig; return sb <= 0 && sa > 0 ? 'up' : sb >= 0 && sa < 0 ? 'down' : 'none'; };
    const w = win(ctx, (d, i) => cr(d, i) === want);
    const m = macdAt(w.d.c, w.i), c = cr(w.d, w.i);
    const above = m.m > m.sig;
    if (p.mode === 'pos') return mcq(rng, `Le MACD vaut ${f(m.m, 2)} et sa ligne de signal ${f(m.sig, 2)}. Que dit cette position ?`, above ? 'Élan haussier : le MACD est au-dessus de sa ligne de signal' : 'Élan baissier : le MACD est sous sa ligne de signal', ['Élan haussier : le MACD est au-dessus de sa ligne de signal', 'Élan baissier : le MACD est sous sa ligne de signal'], { svg: chart(w.d, w.i, { bars: 60 }), expl: 'Le MACD au-dessus de sa ligne de signal indique un élan haussier ; en dessous, un élan baissier.', hint: 'Compare les deux valeurs.' });
    const names = { up: 'Croisement haussier (le MACD passe au-dessus de sa ligne de signal)', down: 'Croisement baissier (le MACD passe sous sa ligne de signal)', none: 'Aucun croisement dans les 3 dernières barres' };
    return mcq(rng, `Il y a 3 barres, le MACD valait ${f(macdAt(w.d.c, w.i - 3).m, 2)} (signal ${f(macdAt(w.d.c, w.i - 3).sig, 2)}). Aujourd’hui il vaut ${f(m.m, 2)} (signal ${f(m.sig, 2)}). Que s’est-il passé ?`, names[c], Object.values(names), { svg: chart(w.d, w.i, { bars: 60 }), expl: 'Un croisement du MACD avec sa ligne de signal marque un changement d’élan.', hint: 'Regarde le signe de (MACD − signal) hier et aujourd’hui.' });
  };

  K.bandRead = (ctx, p) => {
    const { rng } = ctx, band = (d, i) => { const m = sma(d.c, i, 20); let v = 0; for (let j = i - 19; j <= i; j++) v += (d.c[j] - m) ** 2; const sd = Math.sqrt(v / 20); return { m, up: m + 2 * sd, lo: m - 2 * sd, w: (4 * sd) / m }; };
    if (p.mode === 'squeeze') {
      const want = pick(rng, ['sq', 'ex']);
      const med = (d, i) => { const a = []; for (let j = i - 100; j <= i; j += 5) a.push(band(d, j).w); a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
      const w = win(ctx, (d, i) => { const r = band(d, i).w / med(d, i); return want === 'sq' ? r < 0.6 : r > 1.5; });
      const r = band(w.d, w.i).w / med(w.d, w.i), c = r < 0.7 ? 'Resserrement : la volatilité est faible, un mouvement peut se préparer' : r > 1.35 ? 'Élargissement : la volatilité est élevée' : 'Largeur normale';
      return mcq(rng, 'Que montre la largeur des bandes de Bollinger aujourd’hui comparée à son niveau habituel ?', c, ['Resserrement : la volatilité est faible, un mouvement peut se préparer', 'Élargissement : la volatilité est élevée', 'Largeur normale'], { svg: chart(w.d, w.i, { bars: 60 }), expl: `La largeur actuelle vaut ${f(r, 2)} fois sa valeur habituelle. Un resserrement précède souvent une expansion de volatilité (sans dire dans quel sens).`, hint: 'Les bandes sont-elles plus serrées ou plus écartées que d’habitude ?' });
    }
    const want = pick(rng, ['above', 'below', 'in']);
    const pos = (d, i) => { const b = band(d, i); return d.c[i] > b.up ? 'above' : d.c[i] < b.lo ? 'below' : 'in'; };
    const w = win(ctx, (d, i) => pos(d, i) === want);
    const c = pos(w.d, w.i), names = { above: 'Au-dessus de la bande haute', below: 'Sous la bande basse', in: 'À l’intérieur des bandes' };
    return mcq(rng, 'Où est la clôture par rapport aux bandes de Bollinger (20 jours, 2 écarts-types) ?', names[c], Object.values(names), { svg: chart(w.d, w.i, { bars: 50 }), expl: 'Environ 95 % des clôtures restent dans les bandes ; en sortir signale un mouvement fort (ou une anomalie à surveiller).', hint: 'Compare la clôture à la bande haute (m + 2σ) et basse (m − 2σ).' });
  };

  K.atrCalc = (ctx) => {
    const { rng } = ctx, pc = RI(rng, 40, 120), h = pc + R(rng, 0.2, 3), l = pc - R(rng, 0.2, 3);
    const gapUp = rng() < 0.5, H = Math.round((gapUp ? h + R(rng, 1, 3) : h) * 100) / 100, L = Math.round((gapUp ? l + R(rng, 0.5, 2) : l) * 100) / 100, PC = pc;
    const tr = Math.max(H - L, Math.abs(H - PC), Math.abs(L - PC));
    return num(`Plus haut ${f(H)} $, plus bas ${f(L)} $, clôture précédente ${f(PC)} $. Quelle est l’amplitude vraie (True Range) de la séance ?`, tr, '$', 2, { expl: `True Range = max(plus haut − plus bas ; |plus haut − clôture précédente| ; |plus bas − clôture précédente|) = ${f(tr)} $. L’ATR est la moyenne de cette valeur sur 14 séances.`, hint: 'Prends le plus grand des trois écarts, en comptant le gap.' });
  };

  K.patternSynth = (ctx, p) => {
    const { rng } = ctx, PT = ctx.PT, types = PT.TYPES.filter((t) => !p.types || p.types.includes(t.id));
    const type = pick(rng, types), data = PT.generate(rng, type);
    const others = shuffle(rng, PT.TYPES.filter((t) => t.id !== type.id));
    const names = [type, ...others].slice(0, 4).map((t) => t.name);
    const W = 640, H = 240, n = data.c.length, bw = (W - 20) / n;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { lo = Math.min(lo, data.l[i]); hi = Math.max(hi, data.h[i]); }
    const Y = (v) => 10 + ((hi - v) / (hi - lo)) * (H - 20);
    let s = '';
    for (let i = 0; i < n; i++) { const up = data.c[i] >= data.o[i], col = up ? '#1fb36b' : '#f23d4a', x = 10 + i * bw + bw / 2; s += `<line x1="${x}" x2="${x}" y1="${Y(data.h[i])}" y2="${Y(data.l[i])}" stroke="${col}"/><rect x="${x - bw * 0.32}" y="${Math.min(Y(data.o[i]), Y(data.c[i]))}" width="${bw * 0.64}" height="${Math.max(1, Math.abs(Y(data.o[i]) - Y(data.c[i])))}" fill="${col}"/>`; }
    return mcq(rng, 'Quelle figure chartiste reconnais-tu ?', type.name, names, { svg: `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Figure à reconnaître">${s}</svg>`, expl: `${type.why} ${type.how}`, hint: 'Compte les sommets et les creux et repère le niveau de la ligne de cou.' });
  };

  K.measuredMove = (ctx, p) => {
    const { rng } = ctx, top = RI(rng, 60, 140), h = RI(rng, 6, 18) + (ctx.lvl > 1 ? 0.5 : 0), neck = top - h, kind = p.fig || pick(rng, ['dtop', 'dbot', 'hs']);
    if (kind === 'dbot') return num(`Double creux : creux à ${f(neck)} $, ligne de cou (sommet intermédiaire) à ${f(top)} $. Le prix casse la ligne de cou vers le haut. Quel est l’objectif mesuré ?`, top + h, '$', 2, { expl: `Hauteur de la figure = ${f(top)} − ${f(neck)} = ${f(h)} $. Objectif = ligne de cou + hauteur = ${f(top + h)} $.`, hint: 'Reporte la hauteur de la figure depuis la cassure.' });
    return num(`${kind === 'hs' ? 'Épaule-tête-épaule : tête à ' + f(top) + ' $' : 'Double sommet : sommets à ' + f(top) + ' $'}, ligne de cou à ${f(neck)} $. Le prix casse la ligne de cou vers le bas. Quel est l’objectif mesuré ?`, neck - h, '$', 2, { expl: `Hauteur = ${f(top)} − ${f(neck)} = ${f(h)} $. Objectif = ligne de cou − hauteur = ${f(neck - h)} $.`, hint: 'Reporte la hauteur de la figure depuis la cassure.' });
  };

  K.fibCalc = (ctx, p) => {
    const { rng } = ctx, lo = RI(rng, 40, 100), h = lo + RI(rng, 10, 40), lvl = p.lvl || pick(rng, [0.382, 0.5, 0.618]);
    const price = h - lvl * (h - lo);
    return num(`Après une hausse de ${f(lo)} $ à ${f(h)} $, le prix recule. Quel est le niveau de retracement de ${f(lvl * 100, 1)} % de Fibonacci ?`, price, '$', 2, { expl: `Retracement = plus haut − ${f(lvl * 100, 1)} % × (plus haut − plus bas) = ${f(h)} − ${f(lvl, 3)} × ${f(h - lo)} = ${f(price)} $.`, hint: 'Applique le pourcentage à l’amplitude de la hausse, puis soustrais-le du plus haut.' });
  };

  K.fakeBreak = (ctx) => {
    const { rng } = ctx, want = rng() < 0.5;
    const cond = (d, i) => { let mx = -Infinity; for (let j = i - 20; j < i; j++) mx = Math.max(mx, d.h[j]); if (!(d.c[i] > mx)) return false; return want ? d.c[i + 3] > mx : d.c[i + 3] <= mx; };
    const w = win(ctx, cond);
    let mx = -Infinity; for (let j = w.i - 20; j < w.i; j++) mx = Math.max(mx, w.d.h[j]);
    const held = w.d.c[w.i + 3] > mx, yes = 'La cassure tient : le prix reste au-dessus du niveau', no = 'Fausse cassure : le prix est revenu sous le niveau';
    return mcq(rng, 'La barre marquée a cassé la résistance. Trois barres plus tard, que conclure ?', held ? yes : no, [yes, no], { svg: chart(w.d, w.i, { bars: 45, fut: 3, marks: [{ j: w.i, t: 'cassure' }], hl: [{ p: mx, t: 'résistance', c: '#f0b34a' }] }), expl: held ? 'La clôture est restée au-dessus du niveau cassé : la cassure est confirmée.' : 'Le prix a réintégré la zone : c’est une fausse cassure, un piège pour ceux qui sont entrés sans stop.', hint: 'Compare la dernière clôture au niveau (ligne orange).' });
  };

  K.atrStop = (ctx) => {
    const { rng } = ctx, long = rng() < 0.65, w = win(ctx, null), e = w.d.c[w.i], a = atr(w.d, w.i), s = long ? -1 : 1;
    const good = e + s * 1.5 * a, tight = e + s * 0.2 * a, far = e + s * 4.5 * a, wrong = e - s * 1.5 * a;
    return mcq(rng, `Tu ${long ? 'achètes' : 'vends à découvert'} à ${f(e)} $. L’ATR (14) vaut ${f(a)} $. Où placer un stop raisonnable (environ 1,5 ATR) ?`, `${f(good)} $`, [`${f(tight)} $`, `${f(far)} $`, `${f(wrong)} $`], { svg: chart(w.d, w.i, { bars: 50 }), expl: `1,5 ATR = ${f(1.5 * a)} $ : assez loin pour éviter le bruit normal, assez près pour limiter la perte. ${long ? 'Le stop d’un achat se place sous le prix.' : 'Le stop d’une vente à découvert se place au-dessus du prix.'}`, hint: 'Multiplie l’ATR par 1,5 et retire (achat) ou ajoute (vente) cette distance.' });
  };

  K.sizeCalc = (ctx) => {
    const { rng } = ctx, acct = pick(rng, [10000, 25000, 50000, 100000]), rk = pick(rng, [0.5, 1, 2]), e = RI(rng, 20, 150), d = RI(rng, 1, 6) + (ctx.lvl > 0 ? 0.5 : 0), stop = e - d;
    const shares = Math.floor((acct * rk / 100) / d);
    return num(`Compte de ${money(acct)} $, risque de ${f(rk, 1)} % par transaction. Achat à ${f(e)} $ avec un stop à ${f(stop)} $. Combien d’actions peux-tu acheter ?`, shares, 'actions', 0, { expl: `Risque en dollars = ${money(acct)} × ${f(rk, 1)} % = ${money(acct * rk / 100)} $. Perte par action = ${f(e)} − ${f(stop)} = ${f(d)} $. Quantité = ${money(acct * rk / 100)} ÷ ${f(d)} = ${shares} actions (arrondi vers le bas).`, hint: 'Quantité = risque en dollars ÷ perte par action.', tol: 0 });
  };

  K.rrCalc = (ctx) => {
    const { rng } = ctx, e = RI(rng, 30, 120), risk = RI(rng, 1, 5) + (ctx.lvl > 0 ? 0.5 : 0), rew = risk * pick(rng, [1, 1.5, 2, 2.5, 3, 4]);
    return num(`Entrée à ${f(e)} $, stop à ${f(e - risk)} $, objectif à ${f(e + rew)} $. Quel est le ratio gain / risque ?`, rew / risk, ': 1', 2, { expl: `Gain potentiel = ${f(rew)} $ ; risque = ${f(risk)} $ ; ratio = ${f(rew)} ÷ ${f(risk)} = ${f(rew / risk)}.`, hint: 'Divise la distance jusqu’à l’objectif par la distance jusqu’au stop.' });
  };

  K.rCalc = (ctx) => {
    const { rng } = ctx, e = RI(rng, 30, 120), risk = RI(rng, 1, 4) + 0.5, mult = pick(rng, [-1, -0.5, 0.5, 1, 1.5, 2, 3]), exit = e + mult * risk;
    return num(`Entrée à ${f(e)} $ avec un stop à ${f(e - risk)} $ (risque de ${f(risk)} $ par action). Tu sors à ${f(exit)} $. Quel est le résultat en multiples de R ?`, mult, 'R', 2, { expl: `R = (sortie − entrée) ÷ risque initial = (${f(exit)} − ${f(e)}) ÷ ${f(risk)} = ${f(mult)} R.`, hint: 'Divise le gain (ou la perte) par le risque pris à l’entrée.' });
  };

  K.expectancy = (ctx) => {
    const { rng } = ctx, w = pick(rng, [35, 40, 45, 50, 55, 60]), win = pick(rng, [1, 1.5, 2, 2.5, 3]), loss = ctx.lvl > 1 ? pick(rng, [1, 1.2]) : 1;
    const E = (w / 100) * win - (1 - w / 100) * loss;
    return num(`Une stratégie gagne ${w} % du temps, avec un gain moyen de ${f(win, 1)} R et une perte moyenne de ${f(loss, 1)} R. Quelle est son espérance par transaction (en R) ?`, E, 'R', 2, { expl: `Espérance = ${f(w / 100)} × ${f(win, 1)} − ${f(1 - w / 100)} × ${f(loss, 1)} = ${f(E)} R. ${E > 0 ? 'Positive : rentable avant frais.' : 'Négative : perdante à long terme.'}`, hint: 'Espérance = P(gain) × gain moyen − P(perte) × perte moyenne.' });
  };

  K.breakevenWin = (ctx) => {
    const { rng } = ctx, x = pick(rng, [1, 1.5, 2, 3, 4]), p = 100 / (1 + x);
    return num(`Avec un objectif de ${f(x, 1)} R pour un risque de 1 R, quel taux de réussite minimal (en %) rend la stratégie rentable avant frais ?`, p, '%', 1, { expl: `Seuil = 1 ÷ (1 + ${f(x, 1)}) = ${f(p, 1)} %. Plus le ratio gain/risque est élevé, moins il faut gagner souvent.`, hint: 'Cherche le taux qui rend l’espérance nulle : p × x = (1 − p) × 1.' });
  };

  K.tradeRule = (ctx, p) => {
    const { rng } = ctx, rule = p.rule || 'trend';
    const feat = (d, i) => {
      const A = atr(d, i), T = (d.c[i] - d.c[i - 40]) / A, s20 = sma(d.c, i, 20), s50 = sma(d.c, i, 50), r = rsi(d.c, i);
      let hi = -Infinity, lo = Infinity; for (let j = i - 20; j < i; j++) { hi = Math.max(hi, d.h[j]); lo = Math.min(lo, d.l[j]); }
      return { T, s20, s50, r, c: d.c[i], hi, lo };
    };
    const act = (d, i) => {
      const x = feat(d, i);
      if (rule === 'trend') return x.T > 4 ? 'buy' : x.T < -4 ? 'sell' : 'pass';
      if (rule === 'ma') return x.c > x.s50 && x.s20 > x.s50 ? 'buy' : x.c < x.s50 && x.s20 < x.s50 ? 'sell' : 'pass';
      if (rule === 'break') return x.c > x.hi ? 'buy' : x.c < x.lo ? 'sell' : 'pass';
      return x.T > 4 && x.r < 45 ? 'buy' : x.T < -4 && x.r > 55 ? 'sell' : 'pass';
    };
    const want = pick(rng, ['buy', 'sell', 'pass']);
    const w = win(ctx, (d, i) => act(d, i) === want);
    const a = act(w.d, w.i), x = feat(w.d, w.i);
    const names = { buy: 'Acheter', sell: 'Vendre à découvert', pass: 'Passer' };
    const rules = {
      trend: 'Règle : acheter si le prix a gagné plus de 4 ATR sur 40 barres, vendre à découvert s’il a perdu plus de 4 ATR, sinon passer.',
      ma: 'Règle : acheter si le prix est au-dessus de la MM50 et la MM20 au-dessus de la MM50 ; vendre à découvert dans le cas inverse ; sinon passer.',
      break: 'Règle : acheter si la clôture dépasse le plus haut des 20 barres précédentes ; vendre à découvert si elle passe sous le plus bas ; sinon passer.',
      pull: 'Règle : en tendance haussière (plus de +4 ATR sur 40 barres) acheter si le RSI est sous 45 (repli) ; en tendance baissière vendre si le RSI est au-dessus de 55 ; sinon passer.',
    };
    const out = a === 'pass' ? null : outcome(w.d, w.i, a === 'buy' ? 1 : -1);
    return mcq(rng, `${rules[rule]} Que fais-tu ici ?`, names[a], Object.values(names), { svg: chart(w.d, w.i, { bars: 60, ma: rule === 'ma' ? [20, 50] : [] }), expl: `Application de la règle : ${names[a].toLowerCase()}.${out == null ? '' : ` Pour information, ce trade aurait donné ${f(out, 1)} R sur ce graphique : une règle ne gagne pas à chaque fois, elle se juge sur la durée.`}`, hint: 'Applique la règle mot à mot : ne cherche pas à deviner la suite.' });
  };

  /* ----- fondamental ----- */
  const fdGameQ = (ctx) => ctx.FD.newGame('CQ' + Math.floor(ctx.rng() * 1e9), { quarters: 8, agg: ctx.aggN });
  K.stmtCalc = (ctx, p) => {
    const { rng, FD } = ctx, g = fdGameQ(ctx), c = pick(rng, g.cos.filter((x) => !x.isAgg && x.id !== 'VMB')), k = g.H - 1 + RI(rng, 0, 4), q = c.q[k], q4 = c.q[k - 4];   // VMB (marge naissante) donnerait des ratios extrêmes
    const m = (x) => Math.round(x), what = p.what || 'margin';
    const rev = m(q.rev), op = m(q.opInc), ni = m(q.ni), cfo = m(q.cfo), capex = m(q.capex), nd = m(q.nd), bv = m(q.bv), div = m(q.div), rec = m(q.rec), eb = m(q.opInc + 0.03 * q.revTrue);
    const tbl = `<table class="mt-tbl"><tbody><tr><td>Revenus du trimestre</td><td class="r">${money(rev)} M$</td></tr><tr><td>Résultat d’exploitation</td><td class="r">${money(op)} M$</td></tr><tr><td>BAIIA du trimestre</td><td class="r">${money(eb)} M$</td></tr><tr><td>Bénéfice net</td><td class="r">${money(ni)} M$</td></tr><tr><td>Dividendes versés</td><td class="r">${money(div)} M$</td></tr><tr><td>Flux d’exploitation</td><td class="r">${money(cfo)} M$</td></tr><tr><td>Investissements</td><td class="r">${money(capex)} M$</td></tr><tr><td>Créances clients</td><td class="r">${money(rec)} M$</td></tr><tr><td>Dette nette</td><td class="r">${money(nd)} M$</td></tr><tr><td>Capitaux propres</td><td class="r">${money(bv)} M$</td></tr><tr><td>BPA du trimestre</td><td class="r">${f(q.eps)} $</td></tr><tr><td>BPA il y a un an (même trimestre)</td><td class="r">${f(q4.eps)} $</td></tr></tbody></table>`;
    const T = { margin: [op / rev * 100, '%', `Marge d’exploitation = résultat d’exploitation ÷ revenus = ${money(op)} ÷ ${money(rev)}.`, 'Quelle est la marge d’exploitation (en %) ?'],
      netMargin: [ni / rev * 100, '%', `Marge nette = bénéfice net ÷ revenus = ${money(ni)} ÷ ${money(rev)}.`, 'Quelle est la marge nette (en %) ?'],
      epsGrowth: [(q.eps / q4.eps - 1) * 100, '%', `Croissance du BPA = BPA actuel ÷ BPA d’il y a un an − 1 = ${f(q.eps)} ÷ ${f(q4.eps)} − 1.`, 'Quelle est la croissance annuelle du BPA (en %) ?'],
      payout: [div / ni * 100, '%', `Taux de distribution = dividendes ÷ bénéfice net = ${money(div)} ÷ ${money(ni)}.`, 'Quel est le taux de distribution du dividende (en % du bénéfice) ?'],
      roe: [(ni * 4) / bv * 100, '%', `ROE annualisé = bénéfice net × 4 ÷ capitaux propres = ${money(ni)} × 4 ÷ ${money(bv)}.`, 'Quel est le ROE annualisé (en %) ?'],
      ndEbitda: [nd / (eb * 4), '×', `Dette nette ÷ BAIIA annualisé = ${money(nd)} ÷ (${money(eb)} × 4).`, 'Quel est le ratio dette nette / BAIIA annualisé ?'],
      dso: [rec / rev * 90, 'jours', `Créances en jours de ventes = créances ÷ revenus × 90 = ${money(rec)} ÷ ${money(rev)} × 90.`, 'Combien de jours de ventes représentent les créances ?'],
      fcf: [cfo - capex, 'M$', `Flux de trésorerie libre = flux d’exploitation − investissements = ${money(cfo)} − ${money(capex)}.`, 'Quel est le flux de trésorerie libre (en M$) ?'],
    }[what];
    return num(`${c.name} (société fictive). ${T[3]}`, T[0], T[1], what === 'fcf' ? 0 : 1, { html: tbl, expl: T[2], hint: 'Repère les deux lignes du tableau dont tu as besoin.' });
  };

  K.ratioCalc = (ctx, p) => {
    const { rng } = ctx, what = p.what || 'pe', price = RI(rng, 20, 150), eps = Math.round(price / R(rng, 8, 28) * 100) / 100, bv = Math.round(price / R(rng, 1, 4) * 100) / 100, dps = Math.round(price * R(rng, 0.01, 0.05) * 100) / 100, sh = pick(rng, [100, 200, 500]), fcf = Math.round(sh * price * R(rng, 0.02, 0.08)), g = pick(rng, [5, 8, 10, 12, 15, 20]);
    const L = {
      pe: [price / eps, '', 1, `Une action cote ${f(price)} $ et le bénéfice par action des 12 derniers mois est de ${f(eps)} $. Quel est le P/E ?`, `P/E = prix ÷ BPA = ${f(price)} ÷ ${f(eps)}.`],
      pb: [price / bv, '', 2, `Une action cote ${f(price)} $ et la valeur comptable par action est de ${f(bv)} $. Quel est le P/B ?`, `P/B = prix ÷ valeur comptable par action = ${f(price)} ÷ ${f(bv)}.`],
      divY: [dps / price * 100, '%', 2, `Une action cote ${f(price)} $ et verse un dividende annuel de ${f(dps)} $. Quel est le rendement du dividende (en %) ?`, `Rendement = dividende ÷ prix = ${f(dps)} ÷ ${f(price)}.`],
      fcfY: [fcf / (sh * price) * 100, '%', 2, `Une entreprise de ${sh} millions d’actions cotées ${f(price)} $ génère un flux de trésorerie libre de ${money(fcf)} M$. Quel est son rendement du flux libre (en %) ?`, `Rendement du flux libre = flux libre ÷ capitalisation = ${money(fcf)} ÷ (${sh} × ${f(price)}).`],
      eY: [eps / price * 100, '%', 2, `Une action cote ${f(price)} $ avec un BPA de ${f(eps)} $. Quel est le rendement des bénéfices (en %) ?`, `Rendement des bénéfices = BPA ÷ prix = ${f(eps)} ÷ ${f(price)} (l’inverse du P/E).`],
      peg: [price / eps / g, '', 2, `Une action cote ${f(price)} $ (BPA ${f(eps)} $) et ses bénéfices croissent de ${g} % par an. Quel est le PEG (P/E divisé par la croissance en %) ?`, `PEG = (prix ÷ BPA) ÷ croissance = (${f(price)} ÷ ${f(eps)}) ÷ ${g}.`],
    }[what];
    return num(L[3], L[0], L[1], L[2], { expl: L[4], hint: 'Écris la formule avant de remplacer les nombres.' });
  };

  const tblCos = (rows, cols) => `<table class="mt-tbl"><thead><tr><th>Société</th>${cols.map((c) => `<th class="r">${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r.id}</b></td>${cols.map((c) => `<td class="r">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  K.flagPick = (ctx, p) => {
    const { rng, FD } = ctx, flag = p.flag || 'cashConv';
    for (let tries = 0; tries < 40; tries++) {
      const g = FD.newGame('CQ' + Math.floor(rng() * 1e9), { quarters: 8, agg: flag === 'cashConv' || flag === 'dsoUp' ? 1 : undefined });
      let k = g.H - 1 + RI(rng, 0, 3);
      const agg = g.cos.find((c) => c.isAgg);
      if ((flag === 'cashConv' || flag === 'dsoUp') && agg) k = Math.min(g.T - 1, Math.max(g.H, agg.blowQ - 1));
      const rowsAll = g.cos.map((c) => {
        const t = FD.ttm(c, k), r = FD.ratios(g, c, k, c.px.pre[k]);
        const dso0 = c.q[k - 4].dso;
        return { id: c.id, name: c.name, cfoNi: t.ni > 0 ? t.cfo / t.ni : null, dsoUp: c.q[k].dso - dso0, dso: c.q[k].dso, nd: r.ndEbitda, g: r.growth, m: r.margin, roe: r.roe, pe: r.pe, peg: r.pe && r.growth > 0 ? r.pe / (r.growth * 100) : null, divY: r.divY, epsG: c.q[k].eps / c.q[k - 4].eps - 1 };
      });
      const ok = rowsAll.filter((r) => r.cfoNi != null && r.pe != null && r.g != null && r.nd != null);
      if (ok.length < 6) continue;
      const rows = shuffle(rng, ok).slice(0, 4);
      const key = { cashConv: ['cfoNi', 'min'], dsoUp: ['dsoUp', 'max'], leverage: ['nd', 'max'], growth: ['g', 'max'], margin: ['m', 'max'], roe: ['roe', 'max'], cheap: ['pe', 'min'], peg: ['peg', 'min'] }[flag];
      let target;
      if (flag === 'quality') {
        const good = rows.filter((r) => r.nd < 3 && r.cfoNi > 0.85);
        if (good.length < 1) continue;
        target = good.sort((a, b) => b.roe - a.roe)[0];
      } else {
        const vals = rows.map((r) => r[key[0]]);
        if (vals.some((v) => v == null)) continue;
        const sorted = rows.slice().sort((a, b) => (key[1] === 'min' ? a[key[0]] - b[key[0]] : b[key[0]] - a[key[0]]));
        const gap = Math.abs(sorted[0][key[0]] - sorted[1][key[0]]);
        const scale = Math.abs(sorted[0][key[0]]) || 1;
        if (gap / scale < 0.12) continue;
        target = sorted[0];
      }
      const col = {
        cashConv: [['Bénéfice net → flux (12 m)', (r) => f(r.cfoNi * 100, 0) + ' %'], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %']],
        dsoUp: [['Créances (jours) il y a un an → aujourd’hui', (r) => `${f(r.dso - r.dsoUp, 0)} → ${f(r.dso, 0)}`], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %']],
        leverage: [['Dette nette / BAIIA', (r) => f(r.nd, 1) + ' ×'], ['Marge', (r) => f(r.m * 100, 1) + ' %'], ['ROE', (r) => f(r.roe * 100, 1) + ' %']],
        growth: [['Croissance des revenus (12 m)', (r) => f(r.g * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %'], ['P/E', (r) => f(r.pe, 1)]],
        margin: [['Marge d’exploitation', (r) => f(r.m * 100, 1) + ' %'], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['ROE', (r) => f(r.roe * 100, 1) + ' %']],
        roe: [['ROE', (r) => f(r.roe * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %'], ['Dette / BAIIA', (r) => f(r.nd, 1) + ' ×']],
        cheap: [['P/E', (r) => f(r.pe, 1)], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %']],
        peg: [['P/E', (r) => f(r.pe, 1)], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['PEG', (r) => (r.peg == null ? '—' : f(r.peg, 2))]],
        quality: [['ROE', (r) => f(r.roe * 100, 1) + ' %'], ['Dette / BAIIA', (r) => f(r.nd, 1) + ' ×'], ['Flux / bénéfice', (r) => f(r.cfoNi * 100, 0) + ' %']],
      }[flag];
      const ask = { cashConv: 'a le flux d’exploitation le plus faible par rapport à son bénéfice net', dsoUp: 'a vu ses créances (en jours de ventes) le plus augmenter en un an', leverage: 'est la plus endettée par rapport à son BAIIA', growth: 'a la croissance des revenus la plus rapide', margin: 'a la marge d’exploitation la plus élevée', roe: 'a le ROE le plus élevé', cheap: 'a le P/E le plus bas', peg: 'offre le PEG le plus bas (la croissance la moins chère)', quality: 'est de la meilleure qualité (ROE élevé, dette sous 3 × BAIIA, flux supérieur à 85 % du bénéfice)' }[flag];
      const why = { cashConv: 'Un flux bien inférieur au bénéfice net signale des profits peu encaissés : un signal d’alerte comptable.', dsoUp: 'Des créances qui gonflent plus vite que les ventes peuvent cacher des ventes mal encaissées.', leverage: 'Plus la dette nette est grande par rapport au BAIIA, plus la société est fragile aux taux et aux revenus.', growth: 'La croissance des revenus mesure la demande, avant toute manipulation de marges.', margin: 'La marge d’exploitation mesure la rentabilité de l’activité courante.', roe: 'Le ROE mesure le rendement des fonds propres, à lire avec l’endettement.', cheap: 'Le P/E le plus bas est le moins cher par dollar de bénéfice, avant de juger la qualité.', peg: 'Le PEG corrige le P/E par la croissance : un PEG bas offre de la croissance bon marché.', quality: 'La qualité combine rentabilité, bilan sain et bénéfices bien encaissés.' }[flag];
      return mcq(rng, `Parmi ces sociétés, laquelle ${ask} ?`, target.id, rows.map((r) => r.id), { html: tblCos(rows, col), expl: `${target.id} (${target.name}) : ${why}`, hint: 'Compare la colonne qui compte, ligne par ligne.' });
    }
    return mcq(rng, 'Quelle société a le P/E le plus bas ?', 'NBK', ['NBK', 'QTX', 'PBO', 'MVD'], { expl: 'Question de repli.', hint: '' });
  };

  K.valueTrap = (ctx) => {
    const { rng, FD } = ctx;
    for (let t = 0; t < 60; t++) {
      const g = FD.newGame('CQ' + Math.floor(rng() * 1e9), { quarters: 8 }), k = g.H - 1;
      const rows = g.cos.map((c) => { const r = FD.ratios(g, c, k, c.px.pre[k + 1]), e1 = FD.ttm(c, k).eps, e0 = FD.ttm(c, k - 3).eps; return { id: c.id, name: c.name, pe: r.pe, epsG: e0 > 0 ? e1 / e0 - 1 : null, g: r.growth }; }).filter((r) => r.pe && r.epsG != null);
      const cheap = rows.filter((r) => r.epsG < -0.04).sort((a, b) => a.pe - b.pe)[0], grow = rows.filter((r) => r.epsG > 0.04 && cheap && r.pe > cheap.pe * 1.2).sort((a, b) => b.epsG - a.epsG)[0];
      if (!cheap || !grow) continue;
      const pair = shuffle(rng, [cheap, grow]);
      return mcq(rng, 'Lequel de ces deux titres est le piège de valeur le plus probable ?', cheap.id, pair.map((r) => r.id), { html: tblCos(pair, [['P/E', (r) => f(r.pe, 1)], ['Évolution du BPA (12 m)', (r) => f(r.epsG * 100, 0) + ' %'], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %']]), expl: `${cheap.id} paraît bon marché (P/E de ${f(cheap.pe, 1)}) mais ses bénéfices reculent de ${f(-cheap.epsG * 100, 0)} % : le multiple bas est mérité. Un prix bas n’est pas une aubaine si les bénéfices baissent.`, hint: 'Un faible P/E ne suffit pas : regarde la direction des bénéfices.' });
    }
    return mcq(rng, 'Un titre au P/E de 6 dont le bénéfice baisse de 25 % par an est…', 'un piège de valeur probable', ['une aubaine certaine', 'un piège de valeur probable', 'une société de croissance'], { expl: 'Un multiple bas sur des bénéfices en chute est souvent mérité.', hint: '' });
  };

  K.dcfNum = (ctx) => {
    const { rng } = ctx, f0 = pick(rng, [2, 3, 4, 5]), g = pick(rng, [0.05, 0.08, 0.1]), r = pick(rng, [0.08, 0.09, 0.1]), tg = 0.025;
    let v = 0, x = f0; for (let t = 1; t <= 5; t++) { x *= 1 + g; v += x / (1 + r) ** t; }
    const tv = (x * (1 + tg)) / (r - tg) / (1 + r) ** 5, val = v + tv;
    return num(`Flux libre par action : ${f(f0)} $ cette année, en croissance de ${f(g * 100, 0)} % par an pendant 5 ans, puis ${f(tg * 100, 1)} % à perpétuité. Taux d’actualisation : ${f(r * 100, 0)} %. Quelle est la valeur par action (DCF) ?`, val, '$', 1, { expl: `Somme des 5 flux actualisés = ${f(v, 2)} $ ; valeur terminale actualisée = ${f(tv, 2)} $ ; total ≈ ${f(val, 1)} $.`, hint: 'Actualise chaque flux, puis ajoute la valeur terminale actualisée.', tol: 0.03 });
  };

  K.surpriseCalc = (ctx, p) => {
    const { rng } = ctx, cons = Math.round(R(rng, 0.4, 3) * 100) / 100, s = pick(rng, [-0.12, -0.06, -0.02, 0.01, 0.03, 0.07, 0.15]), act = Math.round(cons * (1 + s) * 100) / 100, sp = (act / cons - 1) * 100;
    if (p.mode === 'class') { const c = sp > 3 ? 'Dépasse le consensus' : sp < -3 ? 'Déçoit' : 'En ligne avec le consensus'; return mcq(rng, `BPA publié : ${f(act)} $. Consensus : ${f(cons)} $. Écart de ${f(sp, 1)} %. Comment qualifier ce résultat (seuil de ±3 %) ?`, c, ['Dépasse le consensus', 'En ligne avec le consensus', 'Déçoit'], { expl: `Surprise = ${f(act)} ÷ ${f(cons)} − 1 = ${f(sp, 1)} %.`, hint: 'Compare l’écart aux seuils de ±3 %.' }); }
    return num(`BPA publié : ${f(act)} $. Consensus des analystes : ${f(cons)} $. Quelle est la surprise (en %) ?`, sp, '%', 1, { expl: `Surprise = publié ÷ consensus − 1 = ${f(act)} ÷ ${f(cons)} − 1 = ${f(sp, 1)} %.`, hint: 'Divise le résultat publié par le consensus, puis soustrais 1.' });
  };

  K.trapSpot = (ctx) => {
    const { rng, FD } = ctx;
    for (let t = 0; t < 50; t++) {
      const g = FD.newGame('CQ' + Math.floor(rng() * 1e9), { quarters: 8, agg: 1 }), a = g.cos.find((c) => c.isAgg);
      const k = Math.min(g.T - 1, a.blowQ - 1), rows = g.cos.map((c) => {
        const tt = FD.ttm(c, k), r = FD.ratios(g, c, k, c.px.pre[k]);
        return { id: c.id, name: c.name, isAgg: c.isAgg, cfoNi: tt.ni > 0 ? tt.cfo / tt.ni : null, dso: c.q[k].dso, dso0: c.q[k - 4].dso, g: r.growth, m: r.margin };
      }).filter((r) => r.cfoNi != null && r.g != null);
      const ag = rows.find((r) => r.isAgg);
      if (!ag) continue;
      const others = shuffle(rng, rows.filter((r) => !r.isAgg)).slice(0, 3);
      if (others.some((o) => o.cfoNi <= ag.cfoNi + 0.1 || o.dso - o.dso0 >= ag.dso - ag.dso0)) continue;
      const four = shuffle(rng, [ag, ...others]);
      return mcq(rng, 'Laquelle de ces sociétés a le plus probablement une comptabilité agressive (ventes ou bénéfices gonflés) ?', ag.id, four.map((r) => r.id), { html: tblCos(four, [['Flux / bénéfice (12 m)', (r) => f(r.cfoNi * 100, 0) + ' %'], ['Créances (jours) : il y a un an → aujourd’hui', (r) => `${f(r.dso0, 0)} → ${f(r.dso, 0)}`], ['Croissance revenus', (r) => f(r.g * 100, 1) + ' %'], ['Marge', (r) => f(r.m * 100, 1) + ' %']]), expl: `${ag.id} cumule les signaux : un flux d’exploitation bien inférieur au bénéfice (${f(ag.cfoNi * 100, 0)} %) et des créances qui montent de ${f(ag.dso0, 0)} à ${f(ag.dso, 0)} jours. Les profits sont comptabilisés mais pas encaissés.`, hint: 'Cherche à la fois un flux faible par rapport au bénéfice et des créances en hausse.' });
    }
    return mcq(rng, 'Des créances qui gonflent plus vite que les ventes sont…', 'un signal d’alerte', ['un signal d’alerte', 'une bonne nouvelle', 'sans importance'], { expl: 'Elles peuvent cacher des ventes mal encaissées.', hint: '' });
  };

  /* ----- portefeuille ----- */
  K.wReturn = (ctx) => {
    const { rng } = ctx, names = shuffle(rng, ['Actions américaines', 'Actions canadiennes', 'Obligations', 'Or', 'Technologie']).slice(0, 3), w = pick(rng, [[50, 30, 20], [60, 30, 10], [40, 40, 20], [70, 20, 10], [25, 50, 25]]), r = [RI(rng, -8, 16), RI(rng, -6, 12), RI(rng, -5, 8)];
    const tot = (w[0] * r[0] + w[1] * r[1] + w[2] * r[2]) / 100;
    return num(`Portefeuille : ${names.map((n, i) => `${w[i]} % ${n} (${r[i] >= 0 ? '+' : ''}${r[i]} %)`).join(', ')}. Quel est le rendement du portefeuille (en %) ?`, tot, '%', 2, { expl: `Rendement = Σ poids × rendement = ${w.map((x, i) => `${x} % × ${r[i]} %`).join(' + ')} = ${f(tot)} %.`, hint: 'Pondère le rendement de chaque actif par son poids.' });
  };
  K.volTwo = (ctx) => {
    const { rng } = ctx, w1 = pick(rng, [0.5, 0.6, 0.4]), w2 = 1 - w1, s1 = pick(rng, [10, 15, 20]), s2 = pick(rng, [5, 8, 12]), rho = pick(rng, [-0.3, 0, 0.3, 0.5, 0.8, 1]);
    const v = Math.sqrt((w1 * s1) ** 2 + (w2 * s2) ** 2 + 2 * w1 * w2 * rho * s1 * s2);
    return num(`Un portefeuille est investi à ${f(w1 * 100, 0)} % dans A (volatilité ${s1} %) et ${f(w2 * 100, 0)} % dans B (volatilité ${s2} %). La corrélation est de ${f(rho, 1)}. Quelle est la volatilité du portefeuille (en %) ?`, v, '%', 2, { expl: `σ = √[(w₁σ₁)² + (w₂σ₂)² + 2·w₁w₂·ρ·σ₁σ₂] = ${f(v)} %. Moins la corrélation est élevée, plus la volatilité du portefeuille est faible.`, hint: 'Utilise la formule à deux actifs avec la corrélation.' });
  };
  K.corrPick = (ctx) => {
    const { rng } = ctx, PM = ctx.PM;
    if (!ctx.series || !PM) return mcq(rng, 'Quelle paire diversifie le mieux ?', 'Actions et obligations d’État', ['Deux FNB d’actions américaines', 'Actions et obligations d’État', 'Deux actions du même secteur'], { expl: 'Des actifs peu corrélés réduisent le risque.', hint: '' });
    const ids = ['SPY', 'QQQ', 'IWM', 'XIU_TO', 'XEG_TO', 'GLD', 'TLT'].filter((x) => ctx.series[x]);
    const mt = ctx.series.SPY.t, i1 = RI(rng, 400, mt.length - 5), lo = i1 - 250;
    const px = {}; for (const id of ids) px[id] = PM.align(mt, ctx.series[id].t, ctx.series[id].c);
    const ret = (id) => { const a = []; for (let t = lo + 1; t <= i1; t++) a.push(px[id][t] / px[id][t - 1] - 1); return a; };
    const cor = (a, b) => { const x = ret(a), y = ret(b), n = x.length, mx = sum(x) / n, my = sum(y) / n; let sxy = 0, sx = 0, sy = 0; for (let t = 0; t < n; t++) { sxy += (x[t] - mx) * (y[t] - my); sx += (x[t] - mx) ** 2; sy += (y[t] - my) ** 2; } return sxy / Math.sqrt(sx * sy); };
    for (let t = 0; t < 60; t++) {
      const pairs = []; const seen = new Set();
      while (pairs.length < 3) { const a = pick(rng, ids), b = pick(rng, ids), k = [a, b].sort().join(); if (a !== b && !seen.has(k)) { seen.add(k); pairs.push({ a, b, c: cor(a, b) }); } }
      const s = pairs.slice().sort((x, y) => x.c - y.c);
      if (s[1].c - s[0].c < 0.15 || pairs.some((x) => !Number.isFinite(x.c))) continue;
      const nm = (id) => id.replace('_TO', '');
      const labels = pairs.map((x) => `${nm(x.a)} et ${nm(x.b)}`);
      const best = `${nm(s[0].a)} et ${nm(s[0].b)}`;
      return mcq(rng, 'Sur les 12 derniers mois, quelle paire a offert la meilleure diversification (corrélation la plus faible) ?', best, labels, { html: `<table class="mt-tbl"><thead><tr><th>Paire</th><th class="r">Corrélation</th></tr></thead><tbody>${pairs.map((x) => `<tr><td>${nm(x.a)} et ${nm(x.b)}</td><td class="r">${f(x.c, 2)}</td></tr>`).join('')}</tbody></table>`, expl: `${best} : corrélation de ${f(s[0].c, 2)}, la plus faible. Plus la corrélation est basse, plus la combinaison réduit le risque.`, hint: 'La corrélation la plus basse (ou négative) diversifie le mieux.' });
    }
    return mcq(rng, 'Quelle paire diversifie le mieux ?', 'Actions et obligations d’État', ['Deux FNB d’actions américaines', 'Actions et obligations d’État', 'Deux actions du même secteur'], { expl: 'Des actifs peu corrélés réduisent le risque.', hint: '' });
  };
  K.drift = (ctx) => {
    const { rng } = ctx, w = pick(rng, [[60, 40], [50, 50], [70, 30], [40, 60]]), r = [RI(rng, 5, 30), RI(rng, -10, 8)];
    const v = [w[0] * (1 + r[0] / 100), w[1] * (1 + r[1] / 100)], tot = v[0] + v[1], nw = (v[0] / tot) * 100;
    return num(`Un portefeuille est à ${w[0]} % actions et ${w[1]} % obligations. Les actions montent de ${r[0]} % et les obligations ${r[1] >= 0 ? 'montent' : 'baissent'} de ${Math.abs(r[1])} %. Quel est le nouveau poids des actions (en %) ?`, nw, '%', 1, { expl: `Valeurs : actions ${f(v[0], 1)}, obligations ${f(v[1], 1)}, total ${f(tot, 1)}. Poids des actions = ${f(v[0], 1)} ÷ ${f(tot, 1)} = ${f(nw, 1)} %. Le portefeuille a dérivé.`, hint: 'Calcule la valeur de chaque poche puis son poids dans le total.' });
  };
  K.rebalanceTrade = (ctx) => {
    const { rng } = ctx, V = pick(rng, [100000, 250000, 500000]), cur = pick(rng, [48, 52, 55, 62, 66]), tgt = pick(rng, [40, 45, 50, 60]);
    const amt = V * (cur - tgt) / 100;
    return num(`Portefeuille de ${money(V)} $. Les actions pèsent ${cur} % pour une cible de ${tgt} %. Combien de dollars d’actions faut-il ${amt >= 0 ? 'vendre' : 'acheter'} pour revenir à la cible ?`, Math.abs(amt), '$', 0, { expl: `Écart = ${cur} % − ${tgt} % = ${cur - tgt} points de ${money(V)} $ = ${money(Math.abs(amt))} $ à ${amt >= 0 ? 'vendre' : 'acheter'}.`, hint: 'Multiplie l’écart de poids par la valeur du portefeuille.', tol: 0.01 });
  };
  K.consCheck = (ctx) => {
    const { rng } = ctx, eqMax = pick(rng, [40, 50, 60]), posMax = pick(rng, [20, 25, 30]), cashMin = pick(rng, [5, 10]);
    const which = pick(rng, ['equity', 'pos', 'cash']);
    let eq = eqMax - 8, pos = posMax - 6, cash = cashMin + 4;
    if (which === 'equity') eq = eqMax + 7; if (which === 'pos') pos = posMax + 7; if (which === 'cash') cash = cashMin - 3;
    const names = { equity: 'La limite d’actions', pos: 'La limite par position', cash: 'L’encaisse minimale' };
    return mcq(rng, `Énoncé de politique : actions ${eqMax} % au plus, une position ${posMax} % au plus, encaisse ${cashMin} % au moins. Le portefeuille contient ${eq} % d’actions, une plus grosse position de ${pos} % et ${cash} % d’encaisse. Quelle contrainte est violée ?`, names[which], Object.values(names), { expl: `${names[which]} est dépassée : ${which === 'equity' ? `${eq} % contre ${eqMax} %` : which === 'pos' ? `${pos} % contre ${posMax} %` : `${cash} % contre ${cashMin} %`}. Une contrainte est un contrat.`, hint: 'Compare chaque valeur à sa limite.' });
  };
  K.ipsPick = (ctx, p) => {
    const { rng } = ctx, IPS = ctx.IPS;
    if (!IPS) return mcq(rng, 'On retient la tolérance au risque…', 'la plus faible de la capacité et de la volonté', ['la plus élevée', 'la plus faible de la capacité et de la volonté', 'la moyenne'], { expl: 'Le client ne doit jamais être exposé au-delà de ce qu’il peut ou veut supporter.', hint: '' });
    const c = pick(rng, IPS.CASES), RK = { faible: 'Faible', moderee: 'Modérée', elevee: 'Élevée' };
    const html = `<ul class="ips-facts">${c.facts.map((x) => `<li>${x}</li>`).join('')}<li>Capacité de risque : <b>${c.ability}</b> · Volonté de risque : <b>${c.willingness}</b></li></ul>`;
    if (p.ask === 'alloc') return mcq(rng, `${c.title} : quelle politique d’allocation convient ?`, IPS.ALLOCS.find((a) => a.id === c.alloc).name, IPS.ALLOCS.map((a) => a.name), { html, expl: c.why.alloc, hint: 'Détermine d’abord la tolérance globale, puis choisis l’allocation.' });
    return mcq(rng, `${c.title} : quelle est la tolérance au risque globale ?`, RK[c.risk], Object.values(RK), { html, expl: c.why.risk, hint: 'On retient la plus faible de la capacité et de la volonté.' });
  };
  K.sharpeCalc = (ctx) => {
    const { rng } = ctx, rp = pick(rng, [6, 8, 10, 12, 15]), rf = pick(rng, [1, 2, 3, 4]), sd = pick(rng, [5, 8, 10, 12, 15]);
    return num(`Un portefeuille a rapporté ${rp} % par an avec une volatilité de ${sd} %. Le taux sans risque est de ${rf} %. Quel est son ratio de Sharpe ?`, (rp - rf) / sd, '', 2, { expl: `Sharpe = (rendement − taux sans risque) ÷ volatilité = (${rp} − ${rf}) ÷ ${sd} = ${f((rp - rf) / sd)}.`, hint: 'Soustrais d’abord le taux sans risque.' });
  };
  K.ddCalc = (ctx) => {
    const { rng } = ctx;
    let a, mx = 0, pkv = 100, tv = 100;
    for (let t = 0; t < 30 && mx < 0.03; t++) {   // on veut un vrai recul
      a = [100]; let x = 100;
      for (let i = 0; i < 6; i++) { x = Math.round(x * (1 + R(rng, -0.12, 0.1))); a.push(x); }
      let pk = a[0]; mx = 0;
      for (const v of a) { if (v > pk) pk = v; const d = (pk - v) / pk; if (d > mx) { mx = d; pkv = pk; tv = v; } }
    }
    return num(`Valeur d’un portefeuille à sept dates successives : ${a.join(' → ')}. Quelle est la perte maximale depuis un sommet (en %) ?`, mx * 100, '%', 1, { expl: `Le pire recul va de ${pkv} à ${tv} : (${pkv} − ${tv}) ÷ ${pkv} = ${f(mx * 100, 1)} %.`, hint: 'Repère le sommet puis le creux qui suit, avant tout nouveau sommet.' });
  };
  K.irCalc = (ctx) => {
    const { rng } = ctx, act = pick(rng, [1, 1.5, 2, 3]), te = pick(rng, [2, 3, 4, 5]);
    return num(`Un gestionnaire bat son indice de ${f(act, 1)} % par an avec une erreur de suivi de ${te} %. Quel est son ratio d’information ?`, act / te, '', 2, { expl: `Ratio d’information = rendement actif ÷ erreur de suivi = ${f(act, 1)} ÷ ${te} = ${f(act / te)}.`, hint: 'Divise le rendement actif par l’erreur de suivi.' });
  };
  K.betaCalc = (ctx, p) => {
    const { rng } = ctx, beta = pick(rng, [0.6, 0.8, 1.2, 1.4]), rm = pick(rng, [6, 8, 10]), rf = pick(rng, [2, 3]), alpha = pick(rng, [-1, 0, 1, 2]);
    const rp = rf + beta * (rm - rf) + alpha;
    if (p.mode === 'beta') return num(`Le marché monte de ${rm} %. Un portefeuille de bêta ${f(beta, 1)} (taux sans risque ${rf} %, alpha nul) devrait rapporter combien (en %) ?`, rf + beta * (rm - rf), '%', 2, { expl: `Rendement attendu = ${rf} + ${f(beta, 1)} × (${rm} − ${rf}) = ${f(rf + beta * (rm - rf))} %.`, hint: 'Utilise rf + β × (marché − rf).' });
    return num(`Rendement du portefeuille : ${f(rp, 1)} %. Bêta : ${f(beta, 1)}. Marché : ${rm} %. Taux sans risque : ${rf} %. Quel est l’alpha de Jensen (en %) ?`, alpha, '%', 1, { expl: `Rendement attendu = ${rf} + ${f(beta, 1)} × (${rm} − ${rf}) = ${f(rf + beta * (rm - rf), 1)} %. Alpha = ${f(rp, 1)} − ${f(rf + beta * (rm - rf), 1)} = ${f(alpha, 1)} %.`, hint: 'Alpha = rendement réalisé − rendement attendu selon le bêta.' });
  };
  K.attrCalc = (ctx) => {
    const { rng } = ctx, wp = pick(rng, [30, 35, 40, 50]), wb = pick(rng, [20, 25, 30]), ri = pick(rng, [6, 8, 10, 12]), rb = pick(rng, [3, 4, 5]);
    const e = ((wp - wb) / 100) * (ri - rb);
    return num(`Tu détiens ${wp} % d’un secteur contre ${wb} % dans l’indice. Le secteur rapporte ${ri} %, l’indice ${rb} %. Quel est l’effet d’allocation de ce secteur (en points de %) ?`, e, '%', 2, { expl: `Effet d’allocation = (poids portefeuille − poids indice) × (rendement du secteur − rendement de l’indice) = ${f((wp - wb) / 100, 2)} × ${ri - rb} % = ${f(e)} %.`, hint: 'Multiplie l’écart de poids par le rendement relatif du secteur.' });
  };

  // banque de questions rédigées (concepts) : tirage sans remise
  K.bank = (ctx, p) => {
    const { rng } = ctx, B = ctx.banks && ctx.banks[p.bank];
    if (!B || !B.length) return mcq(rng, 'Question introuvable.', 'OK', ['OK', 'KO'], { expl: '', hint: '' });
    const used = ctx.used || (ctx.used = {}), u = used[p.bank] || (used[p.bank] = []);
    let idx = shuffle(rng, B.map((_, i) => i)).find((i) => !u.includes(i));
    if (idx == null) { u.length = 0; idx = Math.floor(rng() * B.length); }
    u.push(idx);
    const q = B[idx], order = shuffle(rng, q.o.map((_, i) => i));
    return { type: 'mcq', text: q.q, opts: order.map((i) => q.o[i]), a: order.indexOf(q.a), expl: q.e, hint: q.h || 'Élimine d’abord les réponses clairement fausses.' };
  };

  // fabrique la question d'indice n d'une liste {kind, p}
  CG.make = (ctx, spec) => {
    const k = K[spec.kind];
    if (!k) throw new Error('sorte inconnue : ' + spec.kind);
    const q = k(ctx, spec.p || {});
    q.kind = spec.kind;
    return q;
  };
})(typeof window !== 'undefined' ? window : globalThis);
