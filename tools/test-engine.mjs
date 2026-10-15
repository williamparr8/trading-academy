import fs from 'node:fs';
import assert from 'node:assert/strict';
import '../trading/js/engine.js';
import '../trading/js/coach.js';
import '../trading/js/board.js';
import '../trading/js/tutorial.js';
const TA = globalThis.TA;
const read = (f) => JSON.parse(fs.readFileSync(`trading/data/${f}.json`));
const index = read('index'), bench = read('bench');
let n = 0;
const ok = (m) => { n++; console.log('  OK', m); };

// 1. Plans : tous les scénarios x styles x durées
for (const sc of TA.scenariosFor('stock')) for (const style of ['swing', 'long']) for (const L of TA.STYLES[style].lengths) {
  const plan = TA.planGame('TEST-0001', sc.id, style, L.n, index);
  assert(plan, `plan null ${sc.id} ${style} ${L.n}`);
  const g = TA.buildGame(read(plan.assetId), plan, style, L.n);
  assert(g.startIdx >= TA.CFG.CTX && g.endIdx - g.startIdx === L.n, `bornes ${sc.id} ${style} ${L.n}: ${g.startIdx}..${g.endIdx} / ${g.N}`);
  assert(Math.abs(g.c[g.startIdx] - 100) < 1e-9);
  const resolved = TA.SCENARIOS.find((s) => s.id === plan.scenarioId);
  const d0 = g.t[g.startIdx], d1 = g.t[g.endIdx];
  if (resolved.event) { const ev = TA.dayFromISO(resolved.event); assert(d0 <= ev && ev <= d1, `événement ${sc.id} hors de la partie : ${TA.fmt.date(d0)} → ${TA.fmt.date(d1)}`); }
  else assert(d0 >= TA.dayFromISO('2006-01-02') - 7, 'aléatoire trop ancien');
}
ok('planGame + buildGame : scenarios boursiers x 2 styles x 3 durees ; l evenement cle est toujours dans la partie');

// 2. Reproductibilité
const p1 = TA.planGame('ABCD-2345', 'random', 'swing', 120, index), p2 = TA.planGame('ABCD-2345', 'random', 'swing', 120, index);
assert.deepEqual(p1, p2);
assert.notDeepEqual(p1, TA.planGame('ABCD-2346', 'random', 'swing', 120, index));
assert.equal(TA.normCode('abcd 2345'), 'ABCD-2345');
ok('meme code = meme partie ; code different = autre partie');

// 3. Indicateurs vs calcul naïf
{
  const only = { assets: index.assets.filter((a) => a.id === 'AAPL') };
  const g = TA.buildGame(read('AAPL'), TA.planGame('X', 'random', 'swing', 60, only), 'swing', 60);
  const c = g.c, i = g.startIdx + 10;
  const naive = (k) => c.slice(i - k + 1, i + 1).reduce((a, b) => a + b, 0) / k;
  assert(Math.abs(g.ind.sma20[i] - naive(20)) < 1e-9); assert(Math.abs(g.ind.sma50[i] - naive(50)) < 1e-9);
  assert(isNaN(g.ind.sma20[18]) && !isNaN(g.ind.sma20[19]));
  for (let k = 30; k < g.N; k++) { const r = g.ind.rsi[k]; assert(r >= 0 && r <= 100); }
  const b = g.ind.boll; assert(b.up[i] > b.mid[i] && b.lo[i] < b.mid[i]);
  assert(Math.abs(g.ind.macd.hist[i] - (g.ind.macd.line[i] - g.ind.macd.signal[i])) < 1e-12);
  ok('SMA, RSI, Bollinger, MACD coherents');
}

// 4. Règles d'exécution (marché synthétique) ; bars = [open, high, low, close]
function synth(bars) {
  const len = bars.length + 100;
  const mk = (f) => Float64Array.from({ length: len }, (_, i) => (i < 100 ? 100 : bars[i - 100][f]));
  return { startIdx: 100, endIdx: len - 1, N: len, c: mk(3), o: mk(0), h: mk(1), l: mk(2), t: Array.from({ length: len }, (_, i) => i), v: new Float64Array(len).fill(1), meta: {}, unit: 'J', style: 'swing' };
}
{
  const g = synth([[100, 101, 99, 100], [100, 103, 95, 98], [97, 99, 90, 91], [91, 125, 90, 120]]);
  let st = TA.newState(g);
  let r = TA.submit(g, st, { side: 'buy', type: 'market', qty: 100, sl: 96, tp: 110 });
  assert(r.ok, r.error);
  const hs = TA.halfSpread(g, 100);
  assert(Math.abs(st.pos.avg - 100 * (1 + hs)) < 1e-9);
  const ev = TA.advance(g, st);
  assert(ev.some((e) => e.stop) && !st.pos);
  assert(Math.abs(st.trades[0].exit - 96 * (1 - TA.halfSpread(g, 101))) < 1e-9);
  ok('stop-loss execute au niveau du stop (spread inclus)');

  const g2 = synth([[100, 101, 99, 100], [90, 92, 88, 91]]);
  st = TA.newState(g2); TA.submit(g2, st, { side: 'buy', type: 'market', qty: 10, sl: 95 });
  TA.advance(g2, st);
  assert(Math.abs(st.trades[0].exit - 90 * (1 - TA.halfSpread(g2, 101))) < 1e-9);
  ok('gap : stop execute au prix d ouverture, pas au stop');

  st = TA.newState(g);
  r = TA.submit(g, st, { side: 'buy', type: 'limit', qty: 50, price: 99.5, tp: 120 });
  assert(r.ok && st.orders.length === 1);
  TA.advance(g, st);
  assert(st.pos && Math.abs(st.pos.avg - 99.5) < 1e-9, 'fill limite');
  TA.advance(g, st); TA.advance(g, st);
  assert(!st.pos && Math.abs(st.trades[0].exit - 120) < 1e-9);
  ok('ordre limite rempli puis take-profit atteint');

  st = TA.newState(g);
  assert(!TA.submit(g, st, { side: 'buy', type: 'limit', qty: 1, price: 101 }).ok);
  assert(!TA.submit(g, st, { side: 'buy', type: 'market', qty: 1, sl: 101 }).ok);
  assert(!TA.submit(g, st, { side: 'buy', type: 'market', qty: 1e6 }).ok);
  assert(!TA.submit(g, st, { side: 'buy', type: 'market', qty: 1.5 }).ok);
  ok('validations (niveaux incoherents, liquidites, quantite)');
}

// 5. Identité comptable sur parties réelles aléatoires
{
  let trades = 0;
  for (let k = 0; k < 40; k++) {
    const style = k % 2 ? 'long' : 'swing', L = TA.STYLES[style].lengths[k % 3].n;
    const plan = TA.planGame('SIM-' + k, 'random', style, L, index);
    const g = TA.buildGame(read(plan.assetId), plan, style, L);
    const st = TA.newState(g), rnd = TA.rng('act' + k);
    while (st.idx < g.endIdx) {
      const r = rnd(), c = g.c[st.idx];
      if (r < 0.15) TA.submit(g, st, { side: 'buy', type: 'market', qty: 1 + Math.floor(rnd() * 300), sl: rnd() < 0.6 ? c * 0.93 : null, tp: rnd() < 0.5 ? c * 1.1 : null });
      else if (r < 0.22 && st.pos) TA.submit(g, st, { side: 'sell', type: 'market', qty: Math.max(1, Math.floor(st.pos.qty * rnd())) });
      else if (r < 0.30) TA.submit(g, st, { side: 'buy', type: rnd() < 0.5 ? 'limit' : 'stop', qty: 10 + Math.floor(rnd() * 100), price: c * (rnd() < 0.5 ? 0.97 : 1.03) });
      else if (r < 0.34 && st.pos) TA.submit(g, st, { side: 'sell', type: rnd() < 0.5 ? 'limit' : 'stop', qty: Math.max(1, Math.floor(st.pos.qty / 2)), price: c * (rnd() < 0.5 ? 0.96 : 1.05) });
      else if (r < 0.37 && st.pos) TA.setExits(g, st, c * 0.95, c * 1.08);
      TA.advance(g, st);
      const m = TA.metrics(g, st);
      assert(st.cash > -1e-6, 'cash negatif');
      assert(Math.abs(m.realized + m.unreal - m.total) < 1e-6, `identite P&L ${m.realized} + ${m.unreal} != ${m.total}`);
    }
    TA.finish(g, st);
    const m = TA.metrics(g, st);
    assert(!st.pos && Math.abs(m.realized - m.total) < 1e-6 && Math.abs(st.cash - m.equity) < 1e-9);
    assert(st.equity.length === g.endIdx - g.startIdx + 1);
    const back = TA.sanitizeState(JSON.parse(JSON.stringify(st)), g);
    assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(st)));
    const sum = TA.summary(g, st, bench);
    assert(Number.isFinite(sum.retPct) && Number.isFinite(sum.sp) && Number.isFinite(sum.tsx) && sum.curves.you.length === sum.bars + 1);
    trades += st.trades.length;
  }
  ok(`40 parties aleatoires (${trades} transactions) : realise + non realise = total, cash >= 0, sauvegarde aller-retour`);
}

// 6. Sanitize rejette les fichiers falsifiés
{
  const plan = TA.planGame('S', 'random', 'swing', 60, index), g = TA.buildGame(read(plan.assetId), plan, 'swing', 60);
  const st = TA.newState(g);
  const muts = [(s) => { s.idx = 1e9; }, (s) => { s.cash = 'a'; }, (s) => { s.equity = [1, 2]; }, (s) => { s.pos = { qty: -1, avg: 1, fees: 0, openIdx: 1 }; }, (s) => { s.orders = [{ side: 'x' }]; }];
  for (const mut of muts) { const c = JSON.parse(JSON.stringify(st)); mut(c); assert.throws(() => TA.sanitizeState(c, g)); }
  assert.throws(() => TA.sanitizeState(null, g));
  ok('fichiers falsifies rejetes');
}
// 7. Phase 2 : gestion du risque, calculateur de taille, journal, multiple R
{
  const J = { reason: 'trend', emotion: 'calm', note: 'test' };
  const g = synth([[100, 101, 99, 100], [100, 103, 95, 98], [97, 99, 90, 91], [91, 125, 90, 120]]);

  // règles obligatoires
  let st = TA.newState(g, 'strict2');
  assert.equal(st.rules.mode, 'block');
  let r = TA.submit(g, st, { side: 'buy', type: 'market', qty: 10, j: J });
  assert(!r.ok && /stop-loss/i.test(r.error), 'stop obligatoire');
  r = TA.submit(g, st, { side: 'buy', type: 'market', qty: 900, sl: 95, j: J });
  assert(!r.ok && /Risque trop élevé/.test(r.error) && /taille maximale/.test(r.error), 'risque max : ' + r.error);
  r = TA.submit(g, st, { side: 'buy', type: 'market', qty: 100, sl: 99, j: { reason: 'trend' } });
  assert(!r.ok && /Journal/.test(r.error), 'journal obligatoire');
  r = TA.submit(g, st, { side: 'buy', type: 'market', qty: 100, sl: 99, j: { reason: 'bidon', emotion: 'calm' } });
  assert(!r.ok && /Journal/.test(r.error), 'motif hors liste refusé');
  ok('mode obligatoire : stop requis, risque plafonné, journal requis');

  // calculateur : la taille proposée respecte le budget, et une action de plus le dépasserait
  for (const [pct, sl] of [[0.01, 97], [0.02, 95], [0.005, 99.5], [0.02, 90]]) {
    const last = g.c[st.idx], px = last * (1 + TA.halfSpread(g, st.idx));
    const s = TA.sizeForRisk(g, st, px, sl, pct);
    const budget = TA.metrics(g, st).equity * pct;
    assert(s.qty > 0 && TA.riskOf(g, st, s.qty, px, sl).risk <= budget + 1e-9, `taille ${s.qty} dépasse le budget`);
    if (!s.cashLimited) assert(TA.riskOf(g, st, s.qty + 1, px, sl).risk > budget, 'une action de plus devrait dépasser');
  }
  // la taille calculée est acceptée par le moteur en mode obligatoire
  const px0 = g.c[st.idx] * (1 + TA.halfSpread(g, st.idx));
  const sz = TA.sizeForRisk(g, st, px0, 98, 0.02);
  r = TA.submit(g, st, { side: 'buy', type: 'market', qty: sz.qty, sl: 98, j: J });
  assert(r.ok, 'taille calculée refusée : ' + r.error);
  assert(TA.riskOf(g, { ...st, pos: null, cash: st.cash }, 1, px0, 98).pct >= 0);
  ok('calculateur de taille : respecte le budget de risque, accepté par le moteur');

  // stop : ne peut ni être retiré ni éloigné en mode obligatoire
  assert(!TA.setExits(g, st, null, null).ok);
  assert(!TA.setExits(g, st, 97, null).ok);
  assert(TA.setExits(g, st, 98.5, 110).ok);
  ok('stop : rapprocher oui, éloigner ou retirer non');

  // multiple R : stop touché ≈ −1 R (coût du spread inclus)
  const st2 = TA.newState(g, 'strict2');
  TA.submit(g, st2, { side: 'buy', type: 'market', qty: 100, sl: 96, j: J });
  const risk0 = st2.pos.risk0;
  assert(Math.abs(risk0 - (100 * (st2.pos.avg - 96) + 2)) < 1e-9, 'risk0');
  TA.advance(g, st2);                      // low 95 <= 96 : stop touché
  const t = st2.trades[0];
  assert(t.r < -0.95 && t.r > -1.5, 'R du stop : ' + t.r);
  assert(t.entries.length === 1 && t.entries[0].reason === 'trend' && t.entries[0].emotion === 'calm' && t.entries[0].note === 'test');
  assert(TA.setNote(st2, t.id, 'Trop serré') && st2.trades[0].note === 'Trop serré');
  ok(`journal et multiple R : stop touché = ${t.r.toFixed(2)} R, entrée et note conservées`);

  // ordre en attente : le journal suit l'ordre jusqu'à son exécution
  const st3 = TA.newState(g, 'strict2');
  assert(TA.submit(g, st3, { side: 'buy', type: 'limit', qty: 50, price: 99.5, sl: 94, j: J }).ok);
  TA.advance(g, st3);
  assert(st3.pos && st3.pos.entries[0].reason === 'trend' && st3.pos.risk0 > 0);
  ok('ordre limite : journal et risque transmis à l’exécution');

  // mode conseillé : tout reste permis, comme en phase 1
  const st4 = TA.newState(g, 'soft');
  assert(TA.submit(g, st4, { side: 'buy', type: 'market', qty: 900 }).ok);
  assert(st4.pos.entries[0].reason === null && st4.pos.risk0 === 0);
  ok('mode conseillé : aucun blocage');

  // sauvegarde de la phase 1 (sans règles ni journal) : chargée en mode conseillé
  const old = JSON.parse(JSON.stringify(TA.newState(g, 'soft')));
  delete old.rules;
  assert.equal(TA.sanitizeState(old, g).rules.id, 'soft');
  // champs de journal falsifiés
  const bad = JSON.parse(JSON.stringify(st2));
  bad.trades[0].entries[0].reason = '<script>';
  assert.equal(TA.sanitizeState(bad, g).trades[0].entries[0].reason, null);
  bad.trades[0].entries[0].px = 'x';
  assert.throws(() => TA.sanitizeState(bad, g));
  ok('anciennes sauvegardes acceptées, journal falsifié nettoyé ou rejeté');

  // simulation réaliste en mode obligatoire : ordres dimensionnés par le calculateur, comptes toujours justes
  let nTr = 0, nBlocked = 0;
  for (let k = 0; k < 20; k++) {
    const style = k % 2 ? 'long' : 'swing', L = TA.STYLES[style].lengths[k % 3].n;
    const plan = TA.planGame('RISK-' + k, 'random', style, L, index);
    const gg = TA.buildGame(read(plan.assetId), plan, style, L);
    const s = TA.newState(gg, k % 3 === 0 ? 'strict1' : 'strict2'), rnd = TA.rng('r' + k);
    while (s.idx < gg.endIdx) {
      const c = gg.c[s.idx];
      if (rnd() < 0.2) {
        const px = c * (1 + TA.halfSpread(gg, s.idx)), sl = c * (0.93 + rnd() * 0.05);
        const q = TA.sizeForRisk(gg, s, px, sl, s.rules.max).qty;
        if (q > 0) {
          const rr = TA.submit(gg, s, { side: 'buy', type: 'market', qty: q, sl, tp: rnd() < 0.5 ? c * 1.1 : null, j: J });
          assert(rr.ok, 'ordre dimensionné refusé : ' + rr.error);
        }
        const big = TA.submit(gg, s, { side: 'buy', type: 'market', qty: Math.floor(s.cash / px) + 5, sl, j: J });
        if (!big.ok) nBlocked++;
      } else if (rnd() < 0.1 && s.pos) TA.submit(gg, s, { side: 'sell', type: 'market', qty: Math.max(1, Math.floor(s.pos.qty / 2)) });
      TA.advance(gg, s);
      const m = TA.metrics(gg, s);
      assert(Math.abs(m.realized + m.unreal - m.total) < 1e-6 && s.cash > -1e-6);
      if (s.pos) assert(s.pos.sl != null, 'position sans stop en mode obligatoire');
    }
    TA.finish(gg, s);
    nTr += s.trades.length;
    const back = TA.sanitizeState(JSON.parse(JSON.stringify(s)), gg);
    assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(s)));
  }
  ok(`20 parties en mode obligatoire (${nTr} transactions, ${nBlocked} ordres trop gros bloqués) : jamais de position sans stop`);
}

// 8. Phase 2 (suite) : Sharpe, drawdown, discipline, niveaux
{
  const J = { reason: 'trend', emotion: 'calm', note: '' };
  // Sharpe et drawdown : valeurs vérifiées à la main
  const curve = [100, 101, 100, 102];
  const r = [101 / 100 - 1, 100 / 101 - 1, 102 / 100 - 1], mean = r.reduce((a, b) => a + b) / 3;
  const sd = Math.sqrt(r.reduce((a, x) => a + (x - mean) ** 2, 0) / 2);
  assert(Math.abs(TA.sharpe(curve, 252) - (mean / sd) * Math.sqrt(252)) < 1e-12);
  assert.equal(TA.sharpe([100, 100, 100, 100], 252), null);
  assert.equal(TA.sharpe([100], 252), null);
  const dd = TA.drawdown([100, 110, 99, 105, 120, 90]);
  assert(Math.abs(dd.max - (90 / 120 - 1)) < 1e-12 && Math.abs(dd.cur - (90 / 120 - 1)) < 1e-12);
  const dd2 = TA.drawdown([100, 120, 90, 118]);
  assert(Math.abs(dd2.max - (90 / 120 - 1)) < 1e-12 && Math.abs(dd2.cur - (118 / 120 - 1)) < 1e-12);
  assert.equal(TA.drawdown([100, 101, 102]).max, 0);
  ok('Sharpe et drawdown : valeurs exactes, courbe plate = null');

  // marché plat de 60 barres : le drawdown reste minuscule, on contrôle la discipline
  const flat = (len) => synth(Array.from({ length: len }, () => [100, 100.5, 99.5, 100]));
  const play = (g, st, plan) => { for (let k = 0; k < 60 && st.idx < g.endIdx; k++) { plan(k); if (st.idx < g.endIdx) TA.advance(g, st); } };
  const round = (g, st, k, o = {}) => {   // un aller-retour : achat à k%10 === 0, vente à k%10 === 4
    if (k % 10 === 0) TA.submit(g, st, { side: 'buy', type: 'market', qty: 50, sl: 98, j: J, ...o });
    else if (k % 10 === 4 && st.pos) TA.submit(g, st, { side: 'sell', type: 'market', qty: st.pos.qty });
  };
  const fullGame = (rules, o) => {
    const g = flat(60), st = TA.newState(g, rules, 1);
    play(g, st, (k) => round(g, st, k, o));
    TA.finish(g, st);
    const sum = TA.summary(g, st, bench);
    return { g, st, sum };
  };
  let { g: g1, st: s1, sum: m1 } = fullGame('strict2');
  assert(s1.trades.length >= 5 && typeof m1.maxDD === 'number' && m1.maxDD <= 0);
  let ev = TA.evaluate(g1, s1, m1, 1);
  assert(ev.passed, 'partie propre refusée : ' + JSON.stringify(ev.criteria.filter((c) => !c.ok)));
  assert.equal(ev.criteria.length, 6);
  ok(`partie disciplinée (${s1.trades.length} transactions, drawdown ${(m1.maxDD * 100).toFixed(2)} %) : qualifiante au niveau Débutant`);

  // infractions comptées en mode conseillé
  let { g: g2, st: s2, sum: m2 } = fullGame('soft', { sl: null });
  assert(s2.disc.noStop >= 3);
  ev = TA.evaluate(g2, s2, m2, 1);
  assert(!ev.passed && !ev.criteria.find((c) => c.id === 'stops').ok && ev.criteria.find((c) => c.id === 'journal').ok);
  const gg = flat(60), sd2 = TA.newState(gg, 'soft', 1);
  TA.submit(gg, sd2, { side: 'buy', type: 'market', qty: 800, sl: 99, j: J });   // ~8 % du capital engagé, risque ≈ 1 % : pas de dépassement
  assert.equal(sd2.disc.overRisk, 0);
  TA.submit(gg, sd2, { side: 'buy', type: 'market', qty: 50, sl: 60, j: J });    // stop très loin : risque > 2 %
  assert.equal(sd2.disc.overRisk, 1);
  assert(TA.setExits(gg, sd2, 55, null).ok);                                       // stop éloigné : permis en conseillé, mais compté
  assert.equal(sd2.disc.widened, 1);
  assert(TA.setExits(gg, sd2, 90, null).ok);                                       // rapprocher n'est pas une infraction
  assert.equal(sd2.disc.widened, 1);
  ok('mode conseillé : stop absent, risque dépassé, stop éloigné comptés comme infractions');

  // journal incomplet, trop peu de transactions, partie abandonnée, drawdown excessif
  let t = fullGame('soft', { j: {} });
  assert(!TA.evaluate(t.g, t.st, t.sum, 1).criteria.find((c) => c.id === 'journal').ok);
  { const g = flat(60), st = TA.newState(g, 'strict2', 1); TA.submit(g, st, { side: 'buy', type: 'market', qty: 50, sl: 98, j: J }); for (let k = 0; k < 50; k++) TA.advance(g, st); TA.finish(g, st);
    const e = TA.evaluate(g, st, TA.summary(g, st, bench), 1); assert(!e.passed && !e.criteria.find((c) => c.id === 'trades').ok); }
  { const g = flat(60), st = TA.newState(g, 'strict2', 1); for (let k = 0; k < 20; k++) TA.advance(g, st); TA.finish(g, st);
    const e = TA.evaluate(g, st, TA.summary(g, st, bench), 1); assert(!e.criteria.find((c) => c.id === 'complete').ok); }
  { const bars = [[100, 100.5, 99.5, 100], ...Array.from({ length: 59 }, (_, k) => { const c = 100 * 0.97 ** (k + 1); return [c * 1.03, c * 1.035, c * 0.995, c]; })];
    const g = synth(bars), st = TA.newState(g, 'soft', 1);
    TA.submit(g, st, { side: 'buy', type: 'market', qty: 990, j: J });
    for (let k = 0; k < 59; k++) TA.advance(g, st);
    TA.finish(g, st);
    const m = TA.summary(g, st, bench), e = TA.evaluate(g, st, m, 1);
    assert(m.maxDD < -0.15 && !e.criteria.find((c) => c.id === 'dd').ok, 'dd ' + m.maxDD); }
  ok('critères : journal incomplet, trop peu de transactions, partie abandonnée, drawdown trop profond');

  // niveaux plus exigeants : Avancé demande un multiple R moyen ≥ 0
  assert.equal(TA.evaluate(g1, s1, m1, 4), null);
  assert(TA.evaluate(g1, s1, m1, 3).criteria.some((c) => c.id === 'r'));
  assert(TA.evaluate(g1, s1, m1, 2).need.maxDD < TA.evaluate(g1, s1, m1, 1).need.maxDD);
  ok('exigences croissantes par niveau, Pro sans évaluation');

  // progression : 2 parties disciplinées pour passer Intermédiaire, pas de double comptage
  const info = (code, over = {}) => ({ code, level: 1, ev: { passed: true }, ret: 0.01, dd: -0.02, trades: 5, ...over });
  let p = TA.newProfile();
  let a = TA.applyResult(p, info('AAAA-0001'));
  assert(a.counted && a.passed && !a.leveledUp && p.progress === 1 && a.needGames === 2);
  a = TA.applyResult(p, info('AAAA-0001'));
  assert(!a.counted && /déjà été joué/.test(a.why) && p.progress === 1);
  a = TA.applyResult(p, info('AAAA-0002', { replay: true }));
  assert(!a.counted && /rejouée/.test(a.why) && p.progress === 1);
  a = TA.applyResult(p, info('AAAA-0003', { ev: { passed: false } }));
  assert(a.counted && !a.passed && p.progress === 1);
  a = TA.applyResult(p, info('AAAA-0004', { level: 2 }));
  assert(!a.counted && /autre niveau/.test(a.why));
  a = TA.applyResult(p, info('AAAA-0005'));
  assert(a.counted && a.leveledUp && p.level === 2 && p.progress === 0);
  for (let k = 0; k < 3; k++) a = TA.applyResult(p, info('BBBB-000' + k, { level: 2 }));
  assert(a.leveledUp && p.level === 3);
  for (let k = 0; k < 4; k++) a = TA.applyResult(p, info('CCCC-000' + k, { level: 3 }));
  assert(a.leveledUp && p.level === 4);
  a = TA.applyResult(p, info('DDDD-0001', { level: 4, ev: null }));
  assert(!a.counted && /maximal/.test(a.why) && p.level === 4);
  assert(p.games.length <= 30 && p.games[0].code === 'DDDD-0001');
  ok('progression : 2 puis 3 puis 4 parties disciplinées, rejeu et codes déjà joués non comptés, niveau Pro atteint');

  // profil : sauvegarde propre et falsifications
  assert.deepEqual(TA.sanitizeProfile(JSON.parse(JSON.stringify(p))), p);
  assert.deepEqual(TA.sanitizeProfile(null), TA.newProfile());
  assert.equal(TA.sanitizeProfile({ v: 1, level: 99, progress: -4, games: 'x', played: [1, 'ok'] }).level, 1);
  assert.equal(TA.sanitizeProfile({ v: 1, level: 1, progress: 50 }).progress, 1);
  ok('profil : aller-retour exact, valeurs falsifiées ramenées à des valeurs sûres');

  // fonctions verrouillées
  assert(TA.canUse(1, 'short').ok, 'la vente à découvert est permise dès le niveau Débutant');
  assert(!TA.canUse(1, 'forex').ok && /Intermédiaire/.test(TA.canUse(1, 'forex').why) && !TA.canUse(1, 'leverage').ok);
  assert(TA.canUse(2, 'short').ok && TA.canUse(2, 'forex').ok && TA.canUse(2, 'leverage').ok);
  assert(!TA.canUse(2, 'options').ok && /Avancé/.test(TA.canUse(2, 'options').why));
  assert(TA.canUse(3, 'options').ok && TA.canUse(3, 'cryptoLeverage').ok);
  const sold = TA.submit(g1, TA.newState(g1, 'soft', 1), { side: 'sell', type: 'market', qty: 5 });
  assert(sold.ok && /à découvert/.test(sold.msg), 'vente à découvert permise au niveau 1 : ' + sold.error);
  const sold2 = TA.submit(g1, TA.newState(g1, 'soft', 2), { side: 'sell', type: 'market', qty: 5 });
  assert(sold2.ok && /à découvert/.test(sold2.msg), 'vente à découvert refusée au niveau 2 : ' + sold2.error);
  ok('fonctions verrouillées : message selon le niveau, vente à découvert ouverte dès Intermédiaire');

  // état sauvegardé : niveau et infractions conservés ; ancienne sauvegarde sans niveau
  const sv = JSON.parse(JSON.stringify(s2));
  assert.deepEqual(TA.sanitizeState(sv, g2).disc, s2.disc);
  delete sv.level; delete sv.disc;
  const old = TA.sanitizeState(sv, g2);
  assert(old.level === null && old.disc.noStop === 0);
  ok('état : niveau et infractions sauvegardés, ancienne sauvegarde acceptée');
}

// 9. Phase 3 : forex, crypto, vente à découvert, levier, marge
{
  const J = { reason: 'trend', emotion: 'calm', note: '' };
  const sm = (bars, market = 'stock') => ({ ...synth(bars), market });
  const flatBars = (k, o = 100) => Array.from({ length: k }, () => [o, o * 1.005, o * 0.995, o]);
  const ask = (g, st, dir = 1) => g.c[st.idx] * (1 + dir * TA.halfSpread(g, st.idx));
  const gs = sm(flatBars(10)), gf = sm(flatBars(10), 'forex'), gc = sm(flatBars(10), 'crypto');

  // frais et spreads par marché
  assert.equal(TA.fee(gf, 1000, 100), 0);
  assert(Math.abs(TA.fee(gc, 100, 50) - 5) < 1e-9);
  assert.equal(TA.fee(gs, 10, 100), 1);
  const hS = TA.halfSpread(gs, 105), hF = TA.halfSpread(gf, 105), hC = TA.halfSpread(gc, 105);
  assert(hF < hS && hS < hC, `spreads ${hF} ${hS} ${hC}`);
  ok('frais et spreads : forex sans commission et très serré, crypto 0,1 % et plus large');

  // vente à découvert : comptabilité et sorties inversées
  const gShort = sm([[100, 101, 99, 100], [100, 100.5, 94, 95], [95, 96, 89, 90], [90, 91, 88, 91], [91, 111, 90, 110]]);
  let st = TA.newState(gShort, 'soft', 2);
  let r = TA.submit(gShort, st, { side: 'sell', type: 'market', qty: 200, sl: 105, tp: 85, j: J });
  assert(r.ok && /à découvert/.test(r.msg), r.error);
  assert(st.pos.dir === -1 && st.pos.qty === 200);
  assert(Math.abs(st.pos.avg - 100 * (1 - TA.halfSpread(gShort, 100))) < 1e-9);
  assert(Math.abs(st.cash - (100000 + 200 * st.pos.avg - TA.fee(gShort, 200, st.pos.avg))) < 1e-6);
  TA.advance(gShort, st);
  assert(st.pos && TA.metrics(gShort, st).unreal > 0, 'un short gagne quand le prix baisse');
  TA.advance(gShort, st); TA.advance(gShort, st);
  const evs = TA.advance(gShort, st);     // haut 111 ≥ stop 105
  assert(evs.some((e) => e.stop) && !st.pos);
  let t = st.trades[0];
  assert(t.dir === -1 && t.net < 0 && Math.abs(t.exit - 105 * (1 + TA.halfSpread(gShort, 104))) < 1e-9);
  const m = TA.metrics(gShort, st);
  assert(Math.abs(m.realized + m.unreal - m.total) < 1e-6);
  ok('short : produit de la vente, gain si le prix baisse, stop au-dessus exécuté avec spread');

  // frais d'emprunt : actions vendues à découvert seulement, à chaque barre, dans les frais de la transaction
  {
    const rate = TA.MARKETS.stock.borrow, py = TA.perYear(gShort);
    assert(rate > 0 && rate < 0.1);
    const g = sm([[100, 101, 99, 100], [100, 100.5, 94, 95], [95, 96, 89, 90], [90, 91, 88, 91], [91, 92, 90, 91], [91, 92, 90, 91]]);
    const s = TA.newState(g, 'soft', 2);
    assert(TA.submit(g, s, { side: 'sell', type: 'market', qty: 100, j: J }).ok);
    const entryFee = TA.fee(g, 100, s.pos.avg), cash0 = s.cash;
    let paid = 0;
    for (let k = 0; k < 3; k++) { TA.advance(g, s); paid += 100 * g.c[s.idx] * rate / py; }
    assert(Math.abs(cash0 - s.cash - paid) < 1e-9, 'liquidités : un prélèvement par barre');
    assert(Math.abs(s.pos.fees - entryFee - paid) < 1e-9, 'frais de la position');
    TA.submit(g, s, { side: 'buy', type: 'market', qty: 100, j: J });
    const tr = s.trades[0], exitFee = TA.fee(g, 100, tr.exit);
    assert(Math.abs(tr.fees - (entryFee + paid + exitFee)) < 1e-9, 'la transaction contient les frais d’emprunt');
    assert(Math.abs(tr.net - (-100 * (tr.exit - tr.entry) - tr.fees)) < 1e-6, 'net = brut − frais');
    // le compte final tombe juste : liquidités = capital de départ + somme des résultats nets
    assert(Math.abs(s.cash - (TA.CFG.START_CASH + s.trades.reduce((a, x) => a + x.net, 0))) < 1e-6);
    // une position longue, du forex ou de la crypto à découvert ne paient rien
    const gl = sm([[100, 101, 99, 100], [100, 101, 99, 100], [100, 101, 99, 100]]);
    const sl = TA.newState(gl, 'soft', 2);
    TA.submit(gl, sl, { side: 'buy', type: 'market', qty: 100, j: J });
    const f0 = sl.pos.fees; TA.advance(gl, sl); TA.advance(gl, sl);
    assert.equal(sl.pos.fees, f0, 'pas de frais d’emprunt sur un long');
    for (const mk of ['forex', 'crypto']) {
      assert(!TA.MARKETS[mk].borrow, mk + ' sans frais d’emprunt');
    }
  }
  ok('frais d’emprunt : prélevés chaque barre sur une vente à découvert d’actions, inclus dans la transaction, comptes justes');

  // objectif d'un short, gap, ordre de couverture, annulation d'un ordre de fermeture orphelin
  const gTp = sm([[100, 101, 99, 100], [100, 100.5, 84, 86]]);
  st = TA.newState(gTp, 'soft', 2);
  TA.submit(gTp, st, { side: 'sell', type: 'market', qty: 100, sl: 110, tp: 90, j: J });
  TA.advance(gTp, st);
  assert(!st.pos && Math.abs(st.trades[0].exit - 90) < 1e-9 && st.trades[0].net > 0, 'objectif d’un short');
  const gGap = sm([[100, 101, 99, 100], [88, 89, 87, 88]]);
  st = TA.newState(gGap, 'soft', 2);
  TA.submit(gGap, st, { side: 'sell', type: 'market', qty: 100, tp: 90, j: J });
  TA.advance(gGap, st);
  assert(Math.abs(st.trades[0].exit - 88) < 1e-9, 'gap favorable : exécuté à l’ouverture');
  const gCover = sm([[100, 101, 99, 100], [100, 100.5, 91, 93], [93, 93.5, 80, 81]]);
  st = TA.newState(gCover, 'soft', 2);
  TA.submit(gCover, st, { side: 'sell', type: 'market', qty: 100, j: J });
  r = TA.submit(gCover, st, { side: 'buy', type: 'limit', qty: 100, price: 92 });
  assert(r.ok && st.orders[0].intent === 'close');
  TA.advance(gCover, st);                    // bas 91 ≤ 92 : couverture
  assert(!st.pos && Math.abs(st.trades[0].exit - 92) < 1e-9 && st.orders.length === 0);
  const gOrphan = sm([[100, 101, 99, 100], [100, 120, 99, 118], [118, 119, 90, 95]]);
  st = TA.newState(gOrphan, 'soft', 2);
  TA.submit(gOrphan, st, { side: 'sell', type: 'market', qty: 100, sl: 110, j: J });
  TA.submit(gOrphan, st, { side: 'buy', type: 'limit', qty: 100, price: 95 });   // objectif de couverture
  TA.advance(gOrphan, st);                   // stop touché d'abord
  assert(!st.pos);
  const ev2 = TA.advance(gOrphan, st);       // l'ordre de fermeture n'a plus de position : annulé, aucun short fantôme
  assert(!st.pos && st.orders.length === 0 && ev2.some((e) => e.kind === 'cancel'), 'ordre orphelin');
  ok('short : objectif, gap, ordre de couverture limite, ordre de fermeture orphelin annulé');

  // pas d'inversion en un seul ordre
  const gInv = sm(flatBars(10));
  st = TA.newState(gInv, 'soft', 2);
  TA.submit(gInv, st, { side: 'buy', type: 'market', qty: 50, j: J });
  r = TA.submit(gInv, st, { side: 'sell', type: 'market', qty: 80 });
  assert(!r.ok && /inverser/.test(r.error));
  ok('un ordre ne peut pas inverser une position');

  // accès selon niveau, marché et levier
  assert(TA.submit(gs, TA.newState(gs, 'soft', 1), { side: 'sell', type: 'market', qty: 5 }).ok, 'actions : vente à découvert dès le niveau 1');
  assert(TA.submit(gf, TA.newState(gf, 'soft', 2), { side: 'sell', type: 'market', qty: 5 }).ok);
  assert(/Avancé/.test(TA.submit(gc, TA.newState(gc, 'soft', 2, 1), { side: 'sell', type: 'market', qty: 5 }).error));
  assert(/levier/.test(TA.submit(gc, TA.newState(gc, 'soft', 3, 1), { side: 'sell', type: 'market', qty: 5 }).error));
  assert(TA.submit(gc, TA.newState(gc, 'soft', 3, 5), { side: 'sell', type: 'market', qty: 5 }).ok);
  assert.equal(TA.newState(gs, 'soft', 1, 5).maxLev, 1);
  assert.equal(TA.newState(gs, 'soft', 2, 2).maxLev, 2);
  assert.equal(TA.newState(gs, 'soft', 2, 5).maxLev, 1);
  assert.equal(TA.newState(gf, 'soft', 2, 5).maxLev, 5);
  assert.equal(TA.newState(gf, 'soft', 2, 10).maxLev, 1);
  assert.equal(TA.newState(gc, 'soft', 2, 5).maxLev, 1);
  assert.equal(TA.newState(gc, 'soft', 3, 5).maxLev, 5);
  assert.equal(TA.newState(gc, 'soft', 4, 10).maxLev, 10);
  assert(!TA.marketAccess('forex', 1).ok && TA.marketAccess('forex', 2).ok && TA.marketAccess('stock', 1).ok && !TA.marketAccess('crypto', 1).ok);
  ok('niveaux : vente à découvert, forex, crypto et levier verrouillés comme prévu, levier plafonné par marché et niveau');

  // levier : exposition limitée à levier × compte
  const gl = sm(flatBars(60));
  st = TA.newState(gl, 'soft', 2, 2);
  const pxl = gl.c[100] * (1 + TA.halfSpread(gl, 100)), mq = TA.maxQty(gl, st, pxl, 1);
  assert(mq > 1900 && mq < 2000, 'maxQty ×2 : ' + mq);
  const fits = (q) => q * pxl <= 2 * (TA.metrics(gl, st).equity - q * (pxl - gl.c[100]) - TA.fee(gl, q, pxl)) + 1e-9;
  assert(fits(mq) && !fits(mq + 1));
  assert(TA.submit(gl, st, { side: 'buy', type: 'market', qty: mq, j: J }).ok);
  const ml = TA.metrics(gl, st);
  assert(st.cash < 0 && Math.abs(ml.leverage - 2) < 0.01, 'levier utilisé ' + ml.leverage);
  r = TA.submit(gl, st, { side: 'buy', type: 'market', qty: 50, j: J });
  assert(!r.ok && /Marge insuffisante/.test(r.error));
  const st1 = TA.newState(gl, 'soft', 2, 1);
  assert(/Liquidités insuffisantes/.test(TA.submit(gl, st1, { side: 'buy', type: 'market', qty: 1200 }).error));
  ok(`levier ×2 : quantité maximale exacte (${mq}), exposition = 2 × compte, ordre au-delà refusé`);

  // appel de marge puis liquidation partielle (forex ×5)
  const flowBars = [[100, 100.5, 99.5, 100], [100, 100.2, 88, 90], [90, 90.5, 86, 87], [87, 87.2, 86.4, 86.5], [86.5, 87, 86, 86.5]];
  const gm = sm(flowBars, 'forex');
  st = TA.newState(gm, 'soft', 2, 5);
  const q5 = TA.maxQty(gm, st, gm.c[100] * (1 + TA.halfSpread(gm, 100)), 1);
  assert(TA.submit(gm, st, { side: 'buy', type: 'market', qty: q5, j: J }).ok);
  const lp = TA.liqPrice(gm, st);
  assert(lp > 83 && lp < 85.5, 'prix de liquidation ' + lp);
  const q0 = st.pos.qty, lv5 = TA.marginLevels(st);
  assert(Math.abs(lv5.initial - 0.2) < 1e-12 && Math.abs(lv5.call - 0.1) < 1e-12 && Math.abs(lv5.stopOut - 0.05) < 1e-12);
  let e1 = TA.advance(gm, st);   // clôture 90 : marge 11 %, pas d'appel
  assert(!e1.some((e) => e.kind === 'call') && !st.call);
  let e2 = TA.advance(gm, st);   // clôture 87 : marge < 10 %
  assert(e2.some((e) => e.kind === 'call') && st.call && st.pos.qty === q0, 'appel de marge attendu');
  let e3 = TA.advance(gm, st);   // toujours sous la marge : liquidation partielle
  assert(e3.some((e) => e.kind === 'fill' && /Appel de marge non réglé/.test(e.msg)), JSON.stringify(e3));
  assert(st.pos && st.pos.qty < q0 && st.call === null);
  assert(TA.metrics(gm, st).ratio >= lv5.initial * 0.98, 'marge rétablie ' + TA.metrics(gm, st).ratio);
  assert(st.trades[st.trades.length - 1].reason === 'Liquidation');
  ok('appel de marge à la clôture, puis liquidation partielle jusqu’à la marge initiale');

  // le joueur règle l'appel lui-même : pas de liquidation
  st = TA.newState(gm, 'soft', 2, 5);
  TA.submit(gm, st, { side: 'buy', type: 'market', qty: q5, j: J });
  TA.advance(gm, st); TA.advance(gm, st);
  assert(st.call);
  assert(TA.submit(gm, st, { side: 'sell', type: 'market', qty: Math.floor(st.pos.qty * 0.6) }).ok);
  const e4 = TA.advance(gm, st);
  assert(!e4.some((e) => e.kind === 'fill' && /non réglé/.test(e.msg)) && st.call === null && st.pos);
  ok('réduire sa position avant la barre suivante règle l’appel de marge');

  // liquidation en cours de barre (stop-out) et compte épuisé par un gap
  const gStop = sm([[100, 100.5, 99.5, 100], [100, 100.2, 80, 85]], 'forex');
  st = TA.newState(gStop, 'soft', 2, 5);
  const qs = TA.maxQty(gStop, st, ask(gStop, st), 1);
  TA.submit(gStop, st, { side: 'buy', type: 'market', qty: qs, j: J });
  const lps = TA.liqPrice(gStop, st);
  const e5 = TA.advance(gStop, st);
  assert(!st.pos && e5.some((e) => e.stop && /Liquidation forcée/.test(e.msg)) && !st.ruined);
  assert(Math.abs(st.trades[0].exit - lps * (1 - TA.halfSpread(gStop, 101))) < 1e-6, 'sortie au prix de liquidation');
  assert(TA.metrics(gStop, st).equity > 0 && TA.metrics(gStop, st).equity < 25000);
  const gGapR = sm([[100, 100.5, 99.5, 100], [60, 61, 59, 60]], 'forex');
  st = TA.newState(gGapR, 'soft', 2, 5);
  TA.submit(gGapR, st, { side: 'buy', type: 'market', qty: TA.maxQty(gGapR, st, ask(gGapR, st), 1), j: J });
  const e6 = TA.advance(gGapR, st);
  assert(st.ruined && e6.some((e) => e.kind === 'ruin') && TA.metrics(gGapR, st).equity < 0);
  ok('stop-out intrabar au prix de liquidation ; un gap qui dépasse la marge épuise le compte');

  // short avec levier : même mécanique, prix de liquidation au-dessus
  const gSq = sm([[100, 100.5, 99.5, 100], [100, 190, 99, 150]]);
  st = TA.newState(gSq, 'soft', 2, 2);
  TA.submit(gSq, st, { side: 'sell', type: 'market', qty: TA.maxQty(gSq, st, ask(gSq, st, -1), -1), j: J });
  // les frais d'emprunt de la barre réduisent les liquidités avant le contrôle de marge : on les applique à l'avance
  const bfSq = st.pos.qty * gSq.c[101] * TA.MARKETS.stock.borrow / TA.perYear(gSq);
  const cashSq = st.cash, feesSq = st.pos.fees;
  st.cash -= bfSq; st.pos.fees += bfSq;
  const lpShort = TA.liqPrice(gSq, st);
  st.cash = cashSq; st.pos.fees = feesSq;
  assert(lpShort > 100 && lpShort < 190);
  const e7 = TA.advance(gSq, st);
  assert(!st.pos && e7.some((e) => /Liquidation forcée/.test(e.msg)));
  assert(Math.abs(st.trades[0].exit - lpShort * (1 + TA.halfSpread(gSq, 101))) < 1e-6);
  ok('short à levier ×2 : liquidation quand le prix monte au-dessus du prix de liquidation');

  // plans par marché
  for (const market of ['forex', 'crypto']) for (const sc of TA.scenariosFor(market)) for (const style of ['swing', 'long']) for (const L of TA.STYLES[style].lengths) {
    const plan = TA.planGame('MK-0001', sc.id, style, L.n, index, market);
    assert(plan, `plan nul : ${market} ${sc.id} ${style} ${L.n}`);
    const d = read(plan.assetId);
    assert.equal(d.mk, market);
    const g = TA.buildGame(d, plan, style, L.n);
    assert(g.market === market && g.endIdx - g.startIdx === L.n, `bornes ${market} ${sc.id} ${style} ${L.n}`);
    const resolved = TA.SCENARIOS.find((s) => s.id === plan.scenarioId);
    if (resolved.event) { const ev = TA.dayFromISO(resolved.event); assert(g.t[g.startIdx] <= ev && ev <= g.t[g.endIdx], `événement ${market} ${resolved.id} hors partie`); }
    if (resolved.assets) assert(resolved.assets.includes(plan.assetId));
  }
  assert.deepEqual(TA.planGame('ABCD-2345', 'random', 'swing', 120, index), TA.planGame('ABCD-2345', 'random', 'swing', 120, index, 'stock'));
  assert.notEqual(TA.planGame('ABCD-2345', 'random', 'swing', 120, index, 'crypto').assetId, TA.planGame('ABCD-2345', 'random', 'swing', 120, index, 'stock').assetId);
  assert(TA.scenariosFor('forex').some((s) => s.id === 'brexit') && !TA.scenariosFor('stock').some((s) => s.id === 'brexit') && TA.scenariosFor('crypto').some((s) => s.id === 'bubble21'));
  assert(TA.planGame('Z', 'brexit', 'swing', 60, index, 'stock').scenarioId === 'random');   // scénario indisponible sur ce marché : repli
  ok('forex et crypto : tous les scénarios × styles × durées donnent une partie valide, événement clé inclus');

  // parties aléatoires multi-marchés avec shorts, levier, ordres : comptes toujours justes
  let nTr = 0, nCalls = 0, nLiq = 0, nRuin = 0, nShort = 0;
  for (let k = 0; k < 60; k++) {
    const market = ['stock', 'forex', 'crypto'][k % 3], style = k % 4 === 3 ? 'long' : 'swing', L = TA.STYLES[style].lengths[k % 3].n;
    const choices = TA.leverChoices(market, 4), lev = choices[k % choices.length];
    const plan = TA.planGame('MIX-' + k, 'random', style, L, index, market);
    const g = TA.buildGame(read(plan.assetId), plan, style, L);
    const s = TA.newState(g, 'soft', 4, lev), rnd = TA.rng('mix' + k);
    assert.equal(s.maxLev, lev);
    while (s.idx < g.endIdx && !s.ruined) {
      const c = g.c[s.idx], r = rnd();
      if (r < 0.18) {
        const dir = rnd() < 0.5 ? 1 : -1, px = c * (1 + dir * TA.halfSpread(g, s.idx));
        const q = Math.floor(TA.maxQty(g, s, px, dir) * (0.2 + 0.8 * rnd()));
        if (q > 0) { const o = TA.submit(g, s, { side: dir === 1 ? 'buy' : 'sell', type: 'market', qty: q, sl: rnd() < 0.5 ? c * (1 - dir * 0.08) : null, tp: rnd() < 0.4 ? c * (1 + dir * 0.1) : null, j: J }); if (o.ok && dir === -1) nShort++; }
      } else if (r < 0.26 && s.pos) TA.submit(g, s, { side: s.pos.dir === 1 ? 'sell' : 'buy', type: 'market', qty: Math.max(1, Math.floor(s.pos.qty * rnd())) });
      else if (r < 0.34) { const dir = rnd() < 0.5 ? 1 : -1; const q = Math.max(1, Math.floor(TA.maxQty(g, s, c, dir) * 0.3 * rnd())); TA.submit(g, s, { side: dir === 1 ? 'buy' : 'sell', type: rnd() < 0.5 ? 'limit' : 'stop', qty: q, price: c * (1 + (rnd() < 0.5 ? -1 : 1) * 0.03) }); }
      else if (r < 0.38 && s.pos) TA.setExits(g, s, s.pos.dir === 1 ? c * 0.93 : c * 1.07, s.pos.dir === 1 ? c * 1.08 : c * 0.92);
      else if (r < 0.40 && s.orders.length) TA.cancelOrder(s, s.orders[0].id);
      const evs = TA.advance(g, s);
      for (const e of evs) { if (e.kind === 'call') nCalls++; if (e.kind === 'fill' && /iquidation/.test(e.msg)) nLiq++; if (e.kind === 'ruin') nRuin++; }
      const mm = TA.metrics(g, s);
      assert(Number.isFinite(mm.equity) && Number.isFinite(s.cash), `valeurs non finies ${market} ${k}`);
      assert(Math.abs(mm.realized + mm.unreal - mm.total) < 1e-5 * Math.max(1, Math.abs(mm.total) + 1e5), `identité P&L ${market} ${k}: ${mm.realized} + ${mm.unreal} ≠ ${mm.total}`);
      if (lev === 1 && (!s.pos || s.pos.dir === 1)) assert(s.cash >= -1e-6, 'trésorerie négative sans levier');
      if (s.pos) assert(s.pos.qty > 0 && (s.pos.dir === 1 || s.pos.dir === -1));
    }
    TA.finish(g, s);
    assert(!s.pos && Math.abs(s.cash - s.equity[s.equity.length - 1]) < 1e-6);
    const back = TA.sanitizeState(JSON.parse(JSON.stringify(s)), g);
    assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(s)));
    nTr += s.trades.length;
  }
  ok(`60 parties multi-marchés avec shorts et levier (${nTr} transactions, ${nShort} shorts, ${nCalls} appels de marge, ${nLiq} liquidations, ${nRuin} comptes épuisés) : comptes justes, sauvegarde aller-retour`);

  // formation : meilleur résultat conservé, profil assaini
  const pf = TA.newProfile();
  TA.recordQuiz(pf, 'candles', 2, 4); TA.recordQuiz(pf, 'candles', 4, 4); TA.recordQuiz(pf, 'candles', 1, 4);
  assert.equal(pf.lessons.candles.best, 4);
  assert.deepEqual(Object.keys(TA.sanitizeProfile(JSON.parse(JSON.stringify(pf))).lessons), ['candles']);
  const dirty = TA.sanitizeProfile({ v: 1, level: 1, progress: 0, lessons: { ok: { best: 3, total: 4 }, 'X<script>': { best: 1, total: 2 }, big: { best: 9, total: 4 }, neg: { best: -1, total: 4 } } });
  assert.deepEqual(Object.keys(dirty.lessons), ['ok']);
  ok('formation : meilleur score conservé, identifiants et scores falsifiés rejetés');

  // anciennes sauvegardes (positions sans direction, ordres sans intention) : lues comme des longs
  const gOld = sm(flatBars(60));
  const old = JSON.parse(JSON.stringify(TA.newState(gOld, 'soft', 1)));
  old.pos = { qty: 10, avg: 100, fees: 1, sl: 95, tp: null, openIdx: 100, lastBuyIdx: 100, entries: [], risk0: 0 };
  old.orders = [{ id: 1, side: 'sell', type: 'limit', qty: 5, price: 110, sl: null, tp: null, idx: 100, j: null }];
  delete old.maxLev; delete old.call; delete old.ruined;
  const back = TA.sanitizeState(old, gOld);
  assert(back.pos.dir === 1 && back.pos.lastEntryIdx === 100 && back.orders[0].intent === 'close' && back.maxLev === 1 && back.call === null);
  ok('sauvegardes des phases 1 et 2 : positions lues comme longues, ordres de vente comme fermetures');
}

// 10. Phase 4 : options (calls et puts) et coach
{
  const J = { reason: 'trend', emotion: 'calm', note: '' };
  const sm = (bars, market = 'stock') => ({ ...synth(bars), market });
  const flat = (k, v = 100) => Array.from({ length: k }, () => [v, v * 1.002, v * 0.998, v]);
  const rally = (k) => Array.from({ length: k }, (_, i) => { const c = 100 * (1 + 0.01 * Math.max(0, i - 4)); return [c, c * 1.002, c * 0.998, c]; });
  const r = TA.CFG.OPT_RATE;

  // prime : propriétés financières
  const C = TA.bs('call', 100, 100, 0.25, 0.3, r), P = TA.bs('put', 100, 100, 0.25, 0.3, r);
  assert(Math.abs(C - P - (100 - 100 * Math.exp(-r * 0.25))) < 1e-9, 'parité call-put');
  assert(TA.bs('call', 110, 100, 0, 0.3, r) === 10 && TA.bs('put', 90, 100, 0, 0.3, r) === 10 && TA.bs('call', 90, 100, 0, 0.3, r) === 0);
  assert(TA.bs('call', 100, 100, 0.25, 0.4, r) > C && TA.bs('call', 100, 100, 0.5, 0.3, r) > C && TA.bs('call', 105, 100, 0.25, 0.3, r) > C);
  assert(TA.bs('call', 100, 100, 0.25, 0.3, r) < 100 && TA.bs('put', 100, 100, 0.25, 0.3, r) < 100);
  ok('prime Black-Scholes : parité call-put exacte, valeur intrinsèque à l’échéance, croissante avec le prix, la volatilité et la durée');

  // chaîne, volatilité sans regard vers l'avenir
  const gA = sm(rally(40));
  assert.deepEqual(TA.optionExpiries(gA), [10, 20, 40]);
  assert.deepEqual(TA.optionExpiries({ ...gA, style: 'long' }), [4, 8, 13]);
  const ks = TA.optionStrikes(100);
  assert(ks.includes(100) && ks.length === 5 && ks[0] < 100 && ks[4] > 100, JSON.stringify(ks));
  const v1 = TA.volAt(gA, 112);
  const gB = { ...gA, c: Float64Array.from(gA.c, (x, i) => (i > 112 ? NaN : x)), _vol: undefined };
  assert(Math.abs(TA.volAt(gB, 112) - v1) < 1e-12, 'la volatilité à la barre 112 ne doit dépendre que du passé');
  const q = TA.optionQuote(gA, 100, 'call', 100, 110);
  assert(q.ask > q.mid && q.bid < q.mid && q.delta > 0.4 && q.delta < 0.6);
  assert(TA.optionQuote(gA, 100, 'put', 100, 110).delta < 0);
  ok('chaîne d’options, volatilité calculée avec le passé seulement, delta cohérent');

  // achat : niveau, règles, liquidités, validations
  let st = TA.newState(gA, 'strict2', 2);
  assert(/Avancé/.test(TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 1, j: J }).error));
  st = TA.newState(gA, 'strict2', 3);
  let res = TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 100, j: J });
  assert(!res.ok && /Risque trop élevé/.test(res.error) && /au plus \d+ contrat/.test(res.error), res.error);
  assert(/Journal obligatoire/.test(TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 5, j: {} }).error));
  assert(!TA.buyOption(gA, st, { kind: 'call', strike: 133, expIdx: 110, qty: 1, j: J }).ok);
  assert(!TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 115, qty: 1, j: J }).ok);
  assert(!TA.buyOption(gA, st, { kind: 'straddle', strike: 100, expIdx: 110, qty: 1, j: J }).ok);
  assert(!TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 0, j: J }).ok);
  res = TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 20, j: J });
  assert(res.ok, res.error);
  assert.equal(st.opts.length, 1);
  const eq0 = TA.metrics(gA, st).equity, qq = TA.optionQuote(gA, 100, 'call', 100, 110);
  assert(Math.abs(eq0 - (100000 - (qq.ask - qq.mid) * 20 * 100 - 20)) < 1e-6, 'équité après achat');
  assert(Math.abs(st.cash - (100000 - 20 * 100 * qq.ask - 20)) < 1e-6);
  // même contrat : fusion
  assert(TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 5, j: J }).ok && st.opts.length === 1 && st.opts[0].qty === 25);
  // mode conseillé : permis, mais compté
  const soft = TA.newState(gA, 'soft', 3);
  assert(TA.buyOption(gA, soft, { kind: 'call', strike: 100, expIdx: 110, qty: 100 }).ok && soft.disc.overRisk === 1);
  ok('achat d’options : niveau Avancé requis, risque = prime payée, journal obligatoire, validations, fusion des contrats');

  // échéance dans la monnaie : règlement en espèces à la valeur intrinsèque
  st = TA.newState(gA, 'strict2', 3);
  TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 110, qty: 20, j: J });
  const ask0 = st.opts[0].avg;
  let ev = [];
  for (let k = 0; k < 10; k++) {
    ev = TA.advance(gA, st);
    const m = TA.metrics(gA, st);
    assert(Math.abs(m.realized + m.unreal - m.total) < 1e-6, 'identité avec options à la barre ' + k);
  }
  assert.equal(st.opts.length, 0);
  const S10 = gA.c[110], intr = Math.max(0, S10 - 100), tr = st.trades[0];
  assert(tr.kind === 'option' && tr.reason === 'Échéance, dans la monnaie' && Math.abs(tr.exit - intr) < 1e-9);
  assert(Math.abs(tr.net - ((intr - ask0) * 20 * 100 - 20)) < 1e-6, 'résultat net à l’échéance');
  assert(ev.some((e) => e.kind === 'fill' && /échéance/i.test(e.msg)));
  assert(Math.abs(st.cash - (100000 - 20 * 100 * ask0 - 20 + 20 * 100 * intr)) < 1e-6);
  // hors de la monnaie : prime perdue en entier, R = −1
  st = TA.newState(gA, 'strict2', 3);
  TA.buyOption(gA, st, { kind: 'put', strike: 100, expIdx: 110, qty: 20, j: J });
  for (let k = 0; k < 10; k++) TA.advance(gA, st);
  const t2 = st.trades[0];
  assert(t2.reason === 'Expirée sans valeur' && t2.exit === 0 && Math.abs(t2.r + 1) < 1e-9 && t2.net < 0, JSON.stringify(t2));
  ok('échéance : valeur intrinsèque encaissée dans la monnaie ; prime perdue (−1 R) hors de la monnaie ; comptes justes à chaque barre');

  // vente anticipée et fin de partie
  st = TA.newState(gA, 'soft', 3);
  TA.buyOption(gA, st, { kind: 'call', strike: 100, expIdx: 120, qty: 10, j: J });
  for (let k = 0; k < 6; k++) TA.advance(gA, st);
  const id = st.opts[0].id, bid = TA.optionQuote(gA, st.idx, 'call', 100, 120).bid, cash0 = st.cash;
  res = TA.sellOption(gA, st, id, 4);
  assert(res.ok && st.opts[0].qty === 6 && Math.abs(st.cash - (cash0 + 4 * 100 * bid - 4)) < 1e-6);
  assert(!TA.sellOption(gA, st, id, 7).ok && !TA.sellOption(gA, st, 999).ok);
  TA.finish(gA, st);
  assert(st.opts.length === 0 && st.trades.length === 2 && st.trades[1].reason === 'Fin de partie' && Math.abs(st.cash - st.equity[st.equity.length - 1]) < 1e-9);
  const mf = TA.metrics(gA, st);
  assert(Math.abs(mf.realized - mf.total) < 1e-6);
  ok('vente partielle au prix acheteur, fermeture de tout à la fin de la partie, comptes justes');

  // sauvegarde aller-retour avec options ouvertes et fermées
  st = TA.newState(gA, 'soft', 3);
  TA.buyOption(gA, st, { kind: 'put', strike: 95, expIdx: 120, qty: 3, j: J });
  TA.buyOption(gA, st, { kind: 'call', strike: 105, expIdx: 110, qty: 2, j: J });
  for (let k = 0; k < 10; k++) TA.advance(gA, st);
  assert(st.opts.length === 1 && st.trades.length === 1);
  const back = TA.sanitizeState(JSON.parse(JSON.stringify(st)), gA);
  assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(st)));
  const hacked = JSON.parse(JSON.stringify(st)); hacked.opts[0].kind = 'straddle';
  assert.throws(() => TA.sanitizeState(hacked, gA));
  ok('options : sauvegarde aller-retour exacte, options falsifiées rejetées');

  // parties réelles aléatoires avec options et sous-jacent
  let nOpt = 0, nBuyFail = 0;
  for (let k = 0; k < 30; k++) {
    const market = ['stock', 'forex', 'crypto'][k % 3], style = k % 5 === 4 ? 'long' : 'swing', L = TA.STYLES[style].lengths[k % 3].n;
    const plan = TA.planGame('OPT-' + k, 'random', style, L, index, market), g = TA.buildGame(read(plan.assetId), plan, style, L);
    const s = TA.newState(g, k % 2 ? 'soft' : 'strict2', 4, 1), rnd = TA.rng('o' + k);
    while (s.idx < g.endIdx && !s.ruined) {
      const c = g.c[s.idx], x = rnd();
      if (x < 0.14) {
        const ex = TA.optionExpiries(g), ks2 = TA.optionStrikes(c);
        const rr = TA.buyOption(g, s, { kind: rnd() < 0.5 ? 'call' : 'put', strike: ks2[Math.floor(rnd() * ks2.length)], expIdx: s.idx + ex[Math.floor(rnd() * ex.length)], qty: 1 + Math.floor(rnd() * 6), j: J });
        if (rr.ok) nOpt++; else nBuyFail++;
      } else if (x < 0.22 && s.opts.length) TA.sellOption(g, s, s.opts[0].id, rnd() < 0.5 ? undefined : 1);
      else if (x < 0.30) {
        const dir = rnd() < 0.5 ? 1 : -1, px = c * (1 + dir * TA.halfSpread(g, s.idx)), q2 = Math.floor(TA.maxQty(g, s, px, dir) * 0.3 * rnd());
        if (q2 > 0) TA.submit(g, s, { side: dir === 1 ? 'buy' : 'sell', type: 'market', qty: q2, sl: c * (1 - dir * 0.06), j: J });
      } else if (x < 0.36 && s.pos) TA.submit(g, s, { side: s.pos.dir === 1 ? 'sell' : 'buy', type: 'market', qty: s.pos.qty });
      TA.advance(g, s);
      const mm = TA.metrics(g, s);
      assert(Number.isFinite(mm.equity), 'équité non finie');
      assert(Math.abs(mm.realized + mm.unreal - mm.total) < 1e-5 * Math.max(1, Math.abs(mm.total) + 1e5), `identité ${market} ${k}`);
      for (const o of s.opts) assert(o.expIdx > s.idx, 'option échue encore détenue');
    }
    TA.finish(g, s);
    assert(!s.pos && s.opts.length === 0);
    const bk = TA.sanitizeState(JSON.parse(JSON.stringify(s)), g);
    assert.deepEqual(JSON.parse(JSON.stringify(bk)), JSON.parse(JSON.stringify(s)));
  }
  ok(`30 parties multi-marchés avec options (${nOpt} achats, ${nBuyFail} refus) : comptes justes, aucune option échue conservée`);

  // coach à règles : constats attendus, jamais de regard vers l'avenir
  const gc = sm([[100, 101, 99, 100], [100, 100.5, 94, 95], [95, 96, 89, 90], [90, 91, 88, 91], [91, 111, 90, 110], [110, 112, 109, 111], [111, 112, 110, 111]]);
  const open = (stt, over) => TA.submit(gc, stt, { side: 'buy', type: 'market', qty: 100, j: J, ...over });
  let s1 = TA.newState(gc, 'soft', 2);
  open(s1, {}); TA.advance(gc, s1); TA.submit(gc, s1, { side: 'sell', type: 'market', qty: 100 });
  const f1 = TA.coachTrade(gc, s1, s1.trades[0]);
  assert(f1.some((f) => f.id === 'nostop' && f.level === 'warn'), 'pas de stop');
  s1 = TA.newState(gc, 'soft', 2);
  open(s1, { sl: 50, j: { reason: 'trend', emotion: 'fomo', note: '' } });   // stop très loin : risque ≈ 5 % du compte
  TA.advance(gc, s1); TA.submit(gc, s1, { side: 'sell', type: 'market', qty: 100 });
  const f2 = TA.coachTrade(gc, s1, s1.trades[0]);
  assert(f2.some((f) => f.id === 'oversize') && f2.some((f) => f.id === 'emotion'), JSON.stringify(f2.map((f) => f.id)));
  // revenge : perte puis position plus grosse dans les deux barres
  s1 = TA.newState(gc, 'soft', 2);
  open(s1, { qty: 100, sl: 94 }); TA.advance(gc, s1);   // stop touché (bas 94 ≤ 94)
  assert.equal(s1.trades.length, 1, 'stop attendu');
  open(s1, { qty: 160, sl: 85 }); TA.advance(gc, s1); TA.submit(gc, s1, { side: 'sell', type: 'market', qty: 160 });
  const f3 = TA.coachTrade(gc, s1, s1.trades[1]);
  assert(f3.some((f) => f.id === 'revenge'), JSON.stringify(f3.map((f) => f.id)));
  assert(TA.coachTrade(gc, s1, s1.trades[0]).some((f) => f.id === 'stopok'));
  // l'analyse immédiate ne regarde jamais les barres suivantes
  const gFuture = { ...gc, o: Float64Array.from(gc.o, (v, i) => (i > s1.trades[1].closeIdx ? NaN : v)), h: Float64Array.from(gc.h, (v, i) => (i > s1.trades[1].closeIdx ? NaN : v)), l: Float64Array.from(gc.l, (v, i) => (i > s1.trades[1].closeIdx ? NaN : v)), c: Float64Array.from(gc.c, (v, i) => (i > s1.trades[1].closeIdx ? NaN : v)) };
  assert.deepEqual(TA.coachTrade(gFuture, s1, s1.trades[1]), TA.coachTrade(gc, s1, s1.trades[1]));
  ok('coach à règles : absence de stop, risque excessif, émotion, revenge trading, stop respecté ; aucun regard vers l’avenir');

  // bilan de fin de partie : sortie trop tôt vue avec le recul, données anonymes
  const gE = sm([[100, 101, 99, 100], [100, 103, 99, 103], [103, 104, 102, 103], [103, 112, 103, 111], [111, 118, 110, 117], [117, 120, 116, 119]]);
  const sE = TA.newState(gE, 'soft', 2);
  TA.submit(gE, sE, { side: 'buy', type: 'market', qty: 100, sl: 96, j: J });
  TA.advance(gE, sE); TA.submit(gE, sE, { side: 'sell', type: 'market', qty: 100 });   // sortie à ~103
  for (let k = 0; k < 4; k++) TA.advance(gE, sE);
  TA.finish(gE, sE);
  const sumE = TA.summary(gE, sE, bench);
  const gm = TA.coachGame(gE, sE, sumE);
  assert(gm.findings.some((f) => f.id === 'early'), JSON.stringify(gm.findings.map((f) => f.id)));
  const pay = TA.coachPayload(gE, sE, sE.trades[0], false), payR = TA.coachPayload(gE, sE, sE.trades[0], true);
  assert(!('actif' in pay) && !JSON.stringify(pay).includes('"AAPL"') && 'actif' in payR);
  assert(TA.coachGame(gE, TA.newState(gE, 'soft', 1), sumE).findings[0].id === 'none');
  ok('bilan : sortie trop tôt détectée avec le recul ; charge utile du coach IA anonyme avant la révélation');
}

// 11. Phase 5 : défis par code et mode Live
{
  const J = { reason: 'trend', emotion: 'calm', note: '' };
  // codes de défi : aller-retour, rejets, même partie
  for (const [m, sc, st, li] of [['stock', 'gfc', 'swing', 1], ['forex', 'brexit', 'long', 2], ['crypto', 'bubble21', 'swing', 0], ['stock', 'random', 'long', 0]]) {
    const ch = TA.makeChallenge('ABCD-2345', m, sc, st, li), p = TA.parseChallenge(ch);
    assert(p && p.full && p.code === 'ABCD-2345' && p.market === m && p.scenarioId === sc && p.style === st && p.lenIdx === li, ch);
    assert.deepEqual(TA.parseChallenge(ch.toLowerCase().replace(/-/g, ' ')), p);
  }
  assert.deepEqual(TA.parseChallenge('abcd 2345'), { code: 'ABCD-2345', full: false });
  assert.equal(TA.parseChallenge('ABCD-2345-A9S1'), null);        // scénario inexistant
  assert.equal(TA.parseChallenge('ABCD-2345-A5S1'), null);        // Brexit n'existe pas pour les actions
  assert.equal(TA.parseChallenge('ABCD-2345-A0S7'), null);        // durée inexistante
  assert.equal(TA.parseChallenge('pas un code'), null);
  assert.equal(TA.parseChallenge('ABCD-2345-A0S1').scenarioId, 'random');
  ok('codes de défi : aller-retour exact, saisie tolérante, combinaisons impossibles rejetées');

  // échelle des prix en mode Live : toujours entre 100 et 1000, quantités entières possibles
  for (const px of [0.0012, 0.85, 1.0834, 9.99, 30, 99, 100, 330, 999.9, 1000, 4300, 62000, 125000]) {
    const k = TA.liveScale(px), v = px * k;
    assert(v >= 100 - 1e-9 && v < 1000 + 1e-9, `${px} × ${k} = ${v}`);
    assert(Math.abs(Math.log10(k) - Math.round(Math.log10(k))) < 1e-9, 'puissance de 10');
  }
  ok('échelle Live : prix ramenés entre 100 et 1000 par une puissance de 10');

  // un compte Live reprend sur de nouvelles données : même résultat qu'une partie jouée d'un trait
  const full = read('AAPL'), CUT = 25, N = full.t.length;
  const cut = { ...full, t: full.t.slice(0, N - CUT), o: full.o.slice(0, N - CUT), h: full.h.slice(0, N - CUT), l: full.l.slice(0, N - CUT), c: full.c.slice(0, N - CUT), v: full.v.slice(0, N - CUT) };
  const startDay = cut.t[cut.t.length - 1], k = TA.liveScale(cut.c[cut.c.length - 1]);
  const plan = { assetId: 'AAPL', startDay, scenarioId: 'random', market: 'stock' };
  const g1 = TA.buildGame(cut, plan, 'swing', 1e9, { live: { k } });
  assert(g1.live && g1.live.k === k && g1.endIdx === g1.N - 1 && g1.startIdx === g1.N - 1);
  assert(Math.abs(g1.c[g1.startIdx] - cut.c[cut.c.length - 1] * k) < 1e-9, 'vrais prix, pas de rebase à 100');
  const act = (g, st) => { TA.submit(g, st, { side: 'buy', type: 'market', qty: 40, sl: g.c[st.idx] * 0.9, tp: g.c[st.idx] * 1.05, j: J }); TA.submit(g, st, { side: 'buy', type: 'limit', qty: 10, price: g.c[st.idx] * 0.97, sl: g.c[st.idx] * 0.9, j: J }); };
  const st1 = TA.newState(g1, 'strict2', 2, 1);
  act(g1, st1);
  assert.equal(TA.advance(g1, st1).length, 0, 'aucune barre à jouer : le compte attend de nouvelles données');
  assert.equal(st1.idx, g1.startIdx);
  // plus tard : les données se sont allongées ; on reprend le compte enregistré
  const saved = JSON.parse(JSON.stringify(st1));
  const g2 = TA.buildGame(full, plan, 'swing', 1e9, { live: { k } });
  assert.equal(g2.startIdx, g1.startIdx, 'le départ du compte est stable');
  assert.equal(g2.endIdx, N - 1);
  const st2 = TA.sanitizeState(saved, g2);
  let caught = 0;
  while (st2.idx < g2.endIdx) { TA.advance(g2, st2); caught++; }
  assert.equal(caught, CUT);
  // référence : mêmes actions, jouées d'un trait sur les données complètes
  const gRef = TA.buildGame(full, plan, 'swing', 1e9, { live: { k } }), stRef = TA.newState(gRef, 'strict2', 2, 1);
  act(gRef, stRef);
  while (stRef.idx < gRef.endIdx) TA.advance(gRef, stRef);
  assert.deepEqual(JSON.parse(JSON.stringify(st2)), JSON.parse(JSON.stringify(stRef)));
  const mm = TA.metrics(g2, st2);
  assert(Math.abs(mm.realized + mm.unreal - mm.total) < 1e-6);
  ok(`compte Live : ${CUT} nouvelles séances rattrapées, résultat identique à une partie jouée d'un trait`);

  // classement : lignes publiées, assainissement, filtres et tri
  const mkRow = (o) => TA.cleanBoardRow('x' + Math.random(), { v: 1, uid: 'u1', pseudo: 'Ana', mode: 'train', market: 'stock', scenario: 'gfc', style: 'swing', lenIdx: 1, level: 1, rules: 'strict2', lev: 1, code: 'ABCD-2345-A2S1', ret: 0.05, sharpe: 1.2, dd: -0.04, trades: 6, winRate: 0.5, bh: 0.1, bars: 120, at: 1000, ...o });
  const rows = [
    mkRow({ pseudo: 'Ana', ret: 0.12, at: 1 }), mkRow({ pseudo: 'Bob', ret: -0.03, code: 'ABCD-2345-A2S1', at: 2 }),
    mkRow({ pseudo: 'Cléo', ret: 0.05, code: 'ABCD-2345-F5S1', market: 'forex', scenario: 'brexit', at: 3 }), mkRow({ pseudo: 'Dan', ret: 0.2, code: 'WXYZ-9999-A0S0', sharpe: null, at: 4 }),
    mkRow({ pseudo: 'Eve', ret: 0.01, mode: 'live', code: 'LIVE-AAPL-0001', scenario: 'live', at: 5 }),
  ];
  assert.equal(rows.length, 5);
  assert.deepEqual(TA.boardFilter(rows, { code: 'ABCD-2345-A2S1' }).map((r) => r.pseudo), ['Ana', 'Bob']);   // même défi exact
  assert.deepEqual(TA.boardFilter(rows, { code: 'abcd 2345' }).map((r) => r.pseudo), ['Ana', 'Bob', 'Cléo']);  // même code de base
  assert.deepEqual(TA.boardFilter(rows, { market: 'forex' }).map((r) => r.pseudo), ['Cléo']);
  assert.deepEqual(TA.boardFilter(rows, { mode: 'live' }).map((r) => r.pseudo), ['Eve']);
  assert.equal(TA.boardFilter(rows, {}).length, 5);
  assert.equal(TA.boardFilter(rows, { code: '', market: 'all', mode: 'all', pseudo: 'all' }).length, 5);
  assert.deepEqual(TA.boardSort(rows, 'ret', 'desc').map((r) => r.pseudo), ['Dan', 'Ana', 'Cléo', 'Eve', 'Bob']);
  assert.deepEqual(TA.boardSort(rows, 'sharpe', 'desc').map((r) => r.pseudo).slice(-1), ['Dan']);   // valeur absente en dernier
  assert.deepEqual(TA.boardSort(rows, 'ret', 'asc').map((r) => r.pseudo)[0], 'Bob');
  // données falsifiées par un autre joueur
  assert.equal(TA.cleanBoardRow('z', { v: 1, ret: 'beaucoup', dd: 0, at: 1, trades: 1 }), null);
  assert.equal(TA.cleanBoardRow('z', null), null);
  const evil = TA.cleanBoardRow('z', { v: 1, uid: 'u', pseudo: '<img src=x onerror=alert(1)>Mallory', ret: 9999, dd: 5, at: 1, trades: 3, mode: 'hack', market: 'moon', scenario: 'xx', code: 'a<b>c' });
  assert(!/[<>]/.test(evil.pseudo) && evil.ret === 100 && evil.dd === 0 && evil.mode === 'train' && evil.market === 'stock' && evil.scenario === 'random' && !/[<>]/.test(evil.code));
  // une ligne publiée à partir d'une vraie partie
  const gR = TA.buildGame(read('MSFT'), TA.planGame('BRD1-0001', 'random', 'swing', 60, index), 'swing', 60), sR = TA.newState(gR, 'strict2', 1, 1);
  TA.submit(gR, sR, { side: 'buy', type: 'market', qty: 50, sl: gR.c[sR.idx] * 0.95, j: J });
  while (sR.idx < gR.endIdx) TA.advance(gR, sR);
  TA.finish(gR, sR);
  const sumR = TA.summary(gR, sR, bench), pub = TA.boardRow({ mode: 'train', market: 'stock', scenario: 'random', style: 'swing', lenIdx: 0, code: 'BRD1-0001' }, sR, sumR, 'Zoé', 'u_42', 'BRD1-0001-A0S0');
  const back2 = TA.cleanBoardRow('id1', JSON.parse(JSON.stringify(pub)));
  assert(back2 && back2.pseudo === 'Zoé' && Math.abs(back2.ret - sumR.retPct) < 1e-12 && back2.code === 'BRD1-0001-A0S0');
  assert(!JSON.stringify(pub).includes('"MSFT"') && !('asset' in pub) && !('day0' in pub));
  ok('classement : défi exact ou code de base, filtres, tris, valeurs absentes en dernier, données falsifiées nettoyées, aucune révélation d’actif');

  // clôture d'un compte Live : n'entre pas dans la progression de niveau
  TA.finish(g2, st2);
  const prof = TA.newProfile();
  const res = TA.applyResult(prof, { code: 'LIVE-0001', level: 1, ev: { passed: true }, ret: 0.01, dd: -0.01, trades: 2, live: true });
  assert(!res.counted && /Live/.test(res.why) && prof.progress === 0);
  ok('compte Live clôturé : ne compte pas pour le niveau');
}

// 12. Tutoriel : la partie guidée suit le script sans accroc et les étapes réagissent à ce que fait le joueur
{
  const T = TA.TUTORIAL, J = { reason: 'trend', emotion: 'calm', note: '' };
  assert(T && T.steps.length >= 8 && T.steps.every((s) => s.id && s.title && typeof s.text === 'function'));
  assert.equal(new Set(T.steps.map((s) => s.id)).size, T.steps.length);
  const g = TA.buildGame(read(T.plan.assetId), T.plan, 'swing', T.length);
  const st = TA.newState(g, T.rules, T.level, 1);
  assert(g.endIdx - g.startIdx === T.length && Math.abs(g.c[g.startIdx] - 100) < 1e-9);
  const ctx = (o = {}) => {
    const m = TA.metrics(g, st), ts = st.trades;
    return { last: g.c[st.idx], equity: m.equity, sl: null, qty: null, sizeQty: 0, risk: 1, reason: '', emotion: '', side: 'buy', type: 'market',
      hasPos: !!st.pos, bars: st.idx - g.startIdx, lastTrade: ts.length ? ts[ts.length - 1] : null, money: TA.fmt.money, smoney: TA.fmt.smoney, num: TA.fmt.num, ...o };
  };
  const by = (id) => T.steps.find((s) => s.id === id);
  // chaque étape produit un texte propre, dans tous les états
  for (const s of T.steps) for (const c of [ctx(), ctx({ sl: 96, qty: 250, sizeQty: 250, reason: 'trend', emotion: 'calm', side: 'sell', type: 'limit', risk: 2 })]) {
    const t = s.text(c);
    assert(typeof t === 'string' && t.length > 20 && !/undefined|NaN|\[object/.test(t), 'texte : ' + s.id + ' : ' + t);
  }
  // 1) stop : refusé tant qu'il est absurde ou au-dessus du prix, accepté dès qu'il est raisonnable
  const stop = by('stop');
  assert(!stop.when(ctx()) && !stop.when(ctx({ sl: 9 })) && !stop.when(ctx({ sl: 101 })) && stop.when(ctx({ sl: 96 })));
  assert(/96/.test(stop.text(ctx())));
  // 2) taille : le calculateur donne une quantité qui risque 1 % du compte
  const ask = g.c[st.idx] * (1 + TA.halfSpread(g, st.idx));
  const sz = TA.sizeForRisk(g, st, ask, 96, 0.01, 1);
  assert(sz.qty > 100 && sz.qty < 600, 'quantité : ' + sz.qty);
  const size = by('size');
  assert(!size.when(ctx({ sl: 96, qty: 200, sizeQty: sz.qty })) && size.when(ctx({ sl: 96, qty: sz.qty, sizeQty: sz.qty })) && !size.when(ctx({ qty: 0, sizeQty: 0 })));
  // 3) journal, 4) ordre réel avec les règles obligatoires
  const journal = by('journal');
  assert(!journal.when(ctx({ reason: 'trend' })) && journal.when(ctx({ reason: 'trend', emotion: 'calm' })));
  const buy = by('buy');
  assert(!buy.when(ctx()) && /Acheter/.test(buy.text(ctx({ side: 'sell' }))) && /Marché/.test(buy.text(ctx({ type: 'limit' }))));
  const r = TA.submit(g, st, { side: 'buy', type: 'market', qty: sz.qty, sl: 96, j: J });
  assert(r.ok, r.error);
  assert(buy.when(ctx()));
  const risk = TA.riskOf(g, st, sz.qty, st.pos.avg, 96, 1);
  assert(risk.pct > 0.008 && risk.pct <= 0.0201, 'risque : ' + risk.pct);
  // 5) trois jours : la position survit (stop non touché), le gain est visible
  const watch = by('watch');
  for (let k = 0; k < T.bars; k++) { assert(!watch.when(ctx())); TA.advance(g, st); }
  assert(watch.when(ctx()) && st.pos && st.trades.length === 0);
  assert(TA.metrics(g, st).unreal > 0, 'gain non réalisé visible après trois jours');
  assert(/Encore 2 jours/.test(watch.text(ctx({ bars: 1 }))) && !/Encore/.test(watch.text(ctx({ bars: 3 }))));
  // 6) fermeture et résultat
  const close = by('close');
  assert(!close.when(ctx()));
  assert(TA.submit(g, st, { side: 'sell', type: 'market', qty: st.pos.qty }).ok);
  assert(close.when(ctx()) && st.trades.length === 1);
  const resText = by('result').text(ctx());
  assert(/Résultat/.test(resText) && /R<\/b>/.test(resText) && /\+/.test(resText), resText);
  // le stop reste intact sur les 10 premiers jours de la partie guidée
  let minLow = Infinity; for (let i = g.startIdx + 1; i <= g.startIdx + 10; i++) minLow = Math.min(minLow, g.l[i]);
  assert(minLow > 97, 'creux : ' + minLow);
  // un stop touché avant la fin de l'étape « watch » ne bloque pas le parcours : l'étape se franchit sans position
  assert(watch.when(ctx({ bars: 1, hasPos: false })));
  ok('tutoriel : étapes, textes, taille à 1 % du compte, trois jours puis fermeture, résultat en R');
}

// 13. Tracés du joueur, indicateurs à paramètres libres, ATR et coach des niveaux
{
  const J = { reason: 'trend', emotion: 'calm', note: '' };
  // historique avant le départ avec des barres de 2 de haut : l'ATR vaut 2 dès la première barre jouée
  const synthA = (bars) => { const g = synth(bars); for (let i = 0; i < 100; i++) { g.h[i] = 101; g.l[i] = 99; } return g; };
  const same = (a, b) => a.length === b.length && a.every((v, i) => (Number.isNaN(v) && Number.isNaN(b[i])) || Math.abs(v - b[i]) < 1e-9);
  // indicateurs libres : mêmes valeurs que les indicateurs fixes, et paramètres pris en compte
  const gI = TA.buildGame(read('MSFT'), TA.planGame('DRW1-0001', 'random', 'swing', 60, index), 'swing', 60);
  assert(same(TA.ind.sma(gI.c, 20), gI.ind.sma20) && same(TA.ind.macd(gI.c).line, gI.ind.macd.line) && same(TA.ind.macd(gI.c, 12, 26, 9).hist, gI.ind.macd.hist));
  assert(same(TA.ind.atr(gI.h, gI.l, gI.c, 14), gI.atr14));
  const m5 = TA.ind.macd(gI.c, 5, 13, 4);
  assert(!same(m5.line, gI.ind.macd.line) && !Number.isNaN(m5.line[20]));
  const e10 = TA.ind.ema(gI.c, 10);
  assert(Number.isNaN(e10[8]) && !Number.isNaN(e10[9]));
  assert(TA.atrAt(gI, gI.startIdx) > 0 && TA.atrAt(gI, gI.startIdx) < gI.c[gI.startIdx] * 0.1);
  // l'ATR d'une barre de 100 de haut-bas sur fond plat vaut 2 (repli sans historique)
  const flat = (n) => Array.from({ length: n }, () => [100, 101, 99, 100]);
  assert(Math.abs(TA.atrAt(synthA(flat(5)), 100) - 2) < 1e-9);

  // API des tracés
  const g = synthA(flat(30));
  const st = TA.newState(g, 'soft', 2);
  const h = TA.addDraw(g, st, { k: 'h', p: 95 });
  assert(h.ok && h.draw.k === 'h' && h.draw.at === st.idx && st.draw.length === 1);
  assert(!TA.addDraw(g, st, { k: 'h', p: -3 }).ok && !TA.addDraw(g, st, { k: 'h', p: NaN }).ok && !TA.addDraw(g, st, { k: 'x', p: 95 }).ok);
  assert(!TA.addDraw(g, st, { k: 't', a: { i: 100, p: 90 }, b: { i: 100, p: 95 } }).ok, 'tendance verticale');
  assert(!TA.addDraw(g, st, { k: 't', a: { i: 90, p: 90 }, b: { i: 110, p: 95 } }).ok, 'pas de tracé dans le futur');
  const tl = TA.addDraw(g, st, { k: 't', a: { i: 90, p: 98 }, b: { i: 100, p: 100 } });
  const zn = TA.addDraw(g, st, { k: 'r', a: { i: 95, p: 104 }, b: { i: 100, p: 102 } });
  assert(tl.ok && zn.ok && new Set(st.draw.map((d) => d.id)).size === 3);
  assert(TA.moveDraw(g, st, h.draw.id, 96) && st.draw[0].p === 96 && !TA.moveDraw(g, st, tl.draw.id, 99) && !TA.moveDraw(g, st, h.draw.id, 0));
  // aller-retour de sauvegarde, tracés falsifiés écartés, ancienne sauvegarde sans tracés
  const raw = JSON.parse(JSON.stringify(st));
  raw.draw.push({ id: 99, k: 'h', p: 'beaucoup' }, null, { id: 98, k: 'r', a: { i: 500, p: 1 }, b: { i: 1, p: 1 } }, { id: 97, k: '<script>', p: 5 });
  const back = TA.sanitizeState(raw, g);
  assert.deepEqual(back.draw, st.draw);
  delete raw.draw;
  assert.deepEqual(TA.sanitizeState(raw, g).draw, []);
  for (let k = 0; k < 60; k++) TA.addDraw(g, st, { k: 'h', p: 80 + k });
  assert(st.draw.length === 40 && !TA.addDraw(g, st, { k: 'h', p: 70 }).ok, 'maximum de tracés');
  assert(TA.removeDraw(st, h.draw.id) && st.draw.length === 39 && !TA.removeDraw(st, 123456));
  assert(TA.clearDraws(st) === 39 && st.draw.length === 0);

  // le stop et l'objectif de chaque entrée sont gardés, et survivent à la sauvegarde
  const g2 = synthA(flat(30)), s2 = TA.newState(g2, 'soft', 2);
  assert(TA.submit(g2, s2, { side: 'buy', type: 'market', qty: 10, sl: 94, tp: 110, j: { reason: 'support', emotion: 'calm', note: '' } }).ok);
  assert(s2.pos.entries[0].sl === 94 && s2.pos.entries[0].tp === 110);
  const back2 = TA.sanitizeState(JSON.parse(JSON.stringify(s2)), g2);
  assert.deepEqual(back2.pos.entries, s2.pos.entries);

  // coach : stops et objectifs jugés par rapport aux niveaux tracés AVANT l'entrée
  const play = (setup, order, bars = flat(30)) => {
    const gg = synthA(bars), ss = TA.newState(gg, 'soft', 2);
    setup(gg, ss);
    assert(TA.submit(gg, ss, { side: 'buy', type: 'market', qty: 10, j: { reason: 'trend', emotion: 'calm', note: '' }, ...order }).ok);
    TA.advance(gg, ss); TA.advance(gg, ss);
    assert(TA.submit(gg, ss, { side: 'sell', type: 'market', qty: 10 }).ok);
    return { g: gg, st: ss, t: ss.trades[0], found: TA.coachTrade(gg, ss, ss.trades[0]) };
  };
  const ids = (r) => r.found.map((x) => x.id + ':' + x.level);
  const drawH = (p) => (gg, ss) => TA.addDraw(gg, ss, { k: 'h', p });
  // support à 95, stop à 94 : juste en dessous
  assert(ids(play(drawH(95), { sl: 94 })).includes('stoplevel:good'));
  // stop à 96 : au-dessus du support
  assert(ids(play(drawH(95), { sl: 96 })).includes('stoplevel:info'));
  // stop très loin sous le support
  assert(ids(play(drawH(95), { sl: 80 })).includes('stopfar:info'));
  // résistance à 101 juste au-dessus d'une entrée à ~100 avec un risque de 6 : peu de place
  assert(ids(play(drawH(101), { sl: 94 })).includes('obstacle:warn'));
  // objectif au-delà d'une résistance, puis objectif juste avant
  assert(ids(play(drawH(105), { sl: 94, tp: 112 })).includes('targetbeyond:info'));
  assert(ids(play(drawH(105), { sl: 94, tp: 104.5 })).includes('targetlevel:good'));
  // raison « support » sans aucun niveau tracé
  const nolvl = play(() => {}, { sl: 94, j: { reason: 'support', emotion: 'calm', note: '' } });
  assert(ids(nolvl).includes('reasonlevel:info'));
  // aucune consigne liée aux niveaux quand le tracé vient après l'entrée (pas de regard vers l'avenir)
  const late = (() => {
    const gg = synthA(flat(30)), ss = TA.newState(gg, 'soft', 2);
    assert(TA.submit(gg, ss, { side: 'buy', type: 'market', qty: 10, sl: 94, j: J }).ok);
    TA.advance(gg, ss);
    TA.addDraw(gg, ss, { k: 'h', p: 95 }); TA.addDraw(gg, ss, { k: 'h', p: 101 });
    assert(TA.submit(gg, ss, { side: 'sell', type: 'market', qty: 10 }).ok);
    return TA.coachTrade(gg, ss, ss.trades[0]).map((x) => x.id);
  })();
  assert(!late.some((id) => ['stoplevel', 'stopfar', 'obstacle', 'targetbeyond', 'targetlevel'].includes(id)), late.join());
  // vente à découvert : miroir (résistance au-dessus, stop de l'autre côté)
  const shortG = synthA(flat(30)), shortS = TA.newState(shortG, 'soft', 2);
  TA.addDraw(shortG, shortS, { k: 'h', p: 105 });
  assert(TA.submit(shortG, shortS, { side: 'sell', type: 'market', qty: 10, sl: 106, j: J }).ok);
  TA.advance(shortG, shortS);
  assert(TA.submit(shortG, shortS, { side: 'buy', type: 'market', qty: 10 }).ok);
  assert(TA.coachTrade(shortG, shortS, shortS.trades[0]).some((x) => x.id === 'stoplevel' && x.level === 'good'));
  // la charge utile du coach IA contient stop, objectif et niveaux connus, sans l'actif
  const pl = TA.coachPayload(shortG, shortS, shortS.trades[0], false);
  assert(pl.stop_initial === 106 && pl.niveaux_traces_connus_a_l_entree.length === 1 && pl.niveaux_traces_connus_a_l_entree[0].type === 'ligne');
  assert(!JSON.stringify(pl).includes('MSFT'));

  // bilan : niveaux testés, tenus ou cédés (avec le recul)
  const bars = flat(2).concat([
    [100, 100, 94.8, 98], [98, 102, 98, 101], [101, 103, 100, 102],       // touche 95 puis repart : tenu
    [100, 100, 94.9, 97.5], [98, 102, 98, 101], [101, 103, 100, 102],      // second contact : tenu
  ], flat(6));
  const gL = synthA(bars), sL = TA.newState(gL, 'soft', 2);
  TA.addDraw(gL, sL, { k: 'h', p: 95 });
  assert(TA.submit(gL, sL, { side: 'buy', type: 'market', qty: 10, sl: 90, j: J }).ok);
  while (sL.idx < gL.endIdx) TA.advance(gL, sL);
  TA.finish(gL, sL);
  const lvl = TA.coachGame(gL, sL, TA.summary(gL, sL, bench));
  assert(lvl.stats.levels.n === 1 && lvl.stats.levels.tested === 2 && lvl.stats.levels.held === 2 && lvl.stats.levels.broke === 0, JSON.stringify(lvl.stats.levels));
  assert(lvl.findings.some((x) => x.id === 'levels' && x.level === 'good'));
  const bars2 = flat(2).concat([[100, 100, 94.8, 92], [92, 93, 91, 92]], flat(8));
  const gB = synthA(bars2), sB = TA.newState(gB, 'soft', 2);
  TA.addDraw(gB, sB, { k: 'h', p: 95 });
  assert(TA.submit(gB, sB, { side: 'buy', type: 'market', qty: 10, j: J }).ok);
  while (sB.idx < gB.endIdx) TA.advance(gB, sB);
  TA.finish(gB, sB);
  const lb = TA.coachGame(gB, sB, TA.summary(gB, sB, bench)).stats.levels;
  assert(lb.tested === 1 && lb.broke === 1 && lb.held === 0, JSON.stringify(lb));
  ok('tracés : ajout, limites, déplacement, sauvegarde ; indicateurs libres et ATR ; coach : stop, objectif et entrée jugés sur les niveaux connus, miroir en vente à découvert, niveaux testés au bilan');
}

// 14. Modules du tutoriel : vente à découvert et indicateurs
{
  const T = TA.TUTORIAL, J = { reason: 'reject', emotion: 'calm', note: '' };
  assert.deepEqual(T.modules.map((m) => m.id), ['basics', 'short', 'indicators']);
  const mkCtx = (g, st, o = {}) => {
    const m = TA.metrics(g, st), inds = o.inds || [];
    return { last: g.c[st.idx], equity: m.equity, atr: TA.atrAt(g, st.idx), sl: null, qty: null, sizeQty: 0, risk: 1, reason: '', emotion: '', side: 'buy', type: 'market',
      hasPos: !!st.pos, posDir: st.pos ? st.pos.dir : 0, bars: st.idx - g.startIdx, lastTrade: st.trades.length ? st.trades[st.trades.length - 1] : null,
      inds, has: (t) => inds.some((x) => x.t === t), count: (t) => inds.filter((x) => x.t === t).length,
      money: TA.fmt.money, smoney: TA.fmt.smoney, num: TA.fmt.num, ...o };
  };
  // tous les textes de tous les modules sont propres dans tous les états
  for (const mod of T.modules) {
    const g = TA.buildGame(read(mod.plan.assetId), mod.plan, 'swing', mod.length), st = TA.newState(g, mod.rules, mod.level, 1);
    assert(g.endIdx - g.startIdx === mod.length && Math.abs(g.c[g.startIdx] - 100) < 1e-9, mod.id);
    assert.equal(new Set(mod.steps.map((x) => x.id)).size, mod.steps.length, 'étapes uniques : ' + mod.id);
    for (const step of mod.steps) {
      assert(step.title && typeof step.text === 'function');
      for (const c of [mkCtx(g, st), mkCtx(g, st, { sl: 96, qty: 250, sizeQty: 250, reason: 'trend', emotion: 'calm', side: 'sell', type: 'limit', risk: 2, inds: [{ t: 'sma', n: 20 }, { t: 'sma', n: 50 }, { t: 'atr', n: 14 }] })]) {
        const txt = [step.text(c), typeof step.todo === 'function' ? step.todo(c) : step.todo || '', ...(step.pts || []).flat()].join(' ');
        assert(txt.length > 20 && !/undefined|NaN|\[object/.test(txt), 'texte : ' + mod.id + '/' + step.id + ' : ' + txt.slice(0, 120));
      }
      if (step.gate) assert(typeof step.when === 'function' && step.todo, 'étape à valider : ' + mod.id + '/' + step.id);
    }
  }

  // module « parier contre le marché » : parcours complet à la baisse, stop au-dessus jamais touché
  {
    const mod = T.modules.find((m) => m.id === 'short'), by = (id) => mod.steps.find((x) => x.id === id);
    const g = TA.buildGame(read(mod.plan.assetId), mod.plan, 'swing', mod.length), st = TA.newState(g, mod.rules, mod.level, 1);
    assert(!by('side').when(mkCtx(g, st)) && by('side').when(mkCtx(g, st, { side: 'sell' })));
    const stop = by('stop');
    assert(!stop.when(mkCtx(g, st, { side: 'sell', sl: 96 })) && !stop.when(mkCtx(g, st, { side: 'sell', sl: 10 })) && stop.when(mkCtx(g, st, { side: 'sell', sl: 104 })));
    assert(/104/.test(stop.text(mkCtx(g, st))));
    const bid = g.c[st.idx] * (1 - TA.halfSpread(g, st.idx));
    const sz = TA.sizeForRisk(g, st, bid, 104, 0.01, -1);
    assert(sz.qty > 100 && sz.qty < 600, 'quantité à découvert : ' + sz.qty);
    assert(by('size').when(mkCtx(g, st, { side: 'sell', sl: 104, qty: sz.qty, sizeQty: sz.qty })));
    assert(by('journal').when(mkCtx(g, st, { reason: 'reject', emotion: 'calm' })));
    const r = TA.submit(g, st, { side: 'sell', type: 'market', qty: sz.qty, sl: 104, j: J });
    assert(r.ok, r.error);
    assert(by('go').when(mkCtx(g, st)) && st.pos.dir === -1);
    for (let k = 0; k < mod.bars; k++) { assert(!by('watch').when(mkCtx(g, st))); TA.advance(g, st); }
    assert(by('watch').when(mkCtx(g, st)) && st.pos && st.trades.length === 0, 'le stop à 104 n’est pas touché');
    assert(TA.metrics(g, st).unreal > 0, 'un pari à la baisse gagne quand le prix baisse');
    assert(TA.submit(g, st, { side: 'buy', type: 'market', qty: st.pos.qty }).ok);
    assert(by('close').when(mkCtx(g, st)) && st.trades[0].dir === -1);
    const txt = by('result').text(mkCtx(g, st));
    assert(/Résultat/.test(txt) && /R<\/b>/.test(txt) && /emprunt/.test(txt), txt);
    let hi = 0; for (let i = g.startIdx + 1; i <= g.startIdx + 10; i++) hi = Math.max(hi, g.h[i]);
    assert(hi < 103.5, 'plus haut sur dix jours : ' + hi);
  }

  // module « indicateurs » : conditions de chaque étape à valider, et un historique qui montre de vrais signaux
  {
    const mod = T.modules.find((m) => m.id === 'indicators'), by = (id) => mod.steps.find((x) => x.id === id);
    const g = TA.buildGame(read(mod.plan.assetId), mod.plan, 'swing', mod.length), st = TA.newState(g, mod.rules, mod.level, 1);
    const withInds = (inds, o = {}) => mkCtx(g, st, { inds, ...o });
    assert(!by('vol').when(withInds([])) && by('vol').when(withInds([{ t: 'vol' }])));
    assert(by('sma').when(withInds([{ t: 'sma', n: 20 }])) && !by('sma').when(withInds([{ t: 'ema', n: 20 }])));
    assert(!by('sma2').when(withInds([{ t: 'sma', n: 20 }])) && !by('sma2').when(withInds([{ t: 'sma', n: 20 }, { t: 'sma', n: 20 }])) && by('sma2').when(withInds([{ t: 'sma', n: 20 }, { t: 'sma', n: 50 }])));
    for (const t of ['ema', 'boll', 'rsi', 'macd']) assert(by(t).when(withInds([{ t }])) && !by(t).when(withInds([])), t);
    const atr = TA.atrAt(g, st.idx), last = g.c[st.idx], atrStep = by('atr');
    assert(!atrStep.when(withInds([{ t: 'atr', n: 14 }])), 'sans stop');
    assert(!atrStep.when(withInds([], { sl: last - 2 * atr })), 'sans ATR affiché');
    assert(!atrStep.when(withInds([{ t: 'atr', n: 14 }], { sl: last - 0.2 * atr })) && !atrStep.when(withInds([{ t: 'atr', n: 14 }], { sl: last - 6 * atr })));
    assert(atrStep.when(withInds([{ t: 'atr', n: 14 }], { sl: last - 2 * atr })));
    assert(by('prune').when(withInds([{ t: 'sma' }, { t: 'rsi' }, { t: 'vol' }])) && !by('prune').when(withInds([1, 2, 3, 4].map(() => ({ t: 'sma' })))));
    // les signaux annoncés dans le texte existent vraiment dans les 60 barres avant le départ
    const rsi = TA.ind.rsi(g.c, 14), s20 = TA.ind.sma(g.c, 20), s50 = TA.ind.sma(g.c, 50), bb = TA.ind.boll(g.c, 20, 2);
    let rmin = 100, rmax = 0, cross = 0, bwMin = 1e9, bwMax = 0;
    for (let j = g.startIdx - 60; j <= g.startIdx; j++) {
      rmin = Math.min(rmin, rsi[j]); rmax = Math.max(rmax, rsi[j]);
      if (j > g.startIdx - 60 && (s20[j] - s50[j]) * (s20[j - 1] - s50[j - 1]) < 0) cross++;
      const bw = (bb.up[j] - bb.lo[j]) / bb.mid[j]; bwMin = Math.min(bwMin, bw); bwMax = Math.max(bwMax, bw);
    }
    assert(rmin <= 33 && rmax >= 65 && cross >= 1 && bwMax / bwMin >= 2, JSON.stringify({ rmin, rmax, cross, sq: bwMax / bwMin }));
  }
  ok('modules du tutoriel : parcours à la baisse jusqu’au résultat, étapes des indicateurs, signaux présents dans l’historique');
}

{
  // outil Fibonacci : deux points, prix différents, jamais dans le futur
  const plan = TA.planGame('TEST-FIB', 'random', 'swing', 120, index);
  const g = TA.buildGame(read(plan.assetId), plan, 'swing', 120), st = TA.newState(g, 'strict2', 1, 1);
  const i0 = g.startIdx - 10, i1 = g.startIdx;
  assert(TA.addDraw(g, st, { k: 'f', a: { i: i0, p: g.c[i0] }, b: { i: i1, p: g.c[i1] * 1.1 } }).ok, 'fibonacci accepté');
  assert(!TA.addDraw(g, st, { k: 'f', a: { i: i0, p: 100 }, b: { i: i1, p: 100 } }).ok, 'prix identiques refusés');
  assert(!TA.addDraw(g, st, { k: 'f', a: { i: i0, p: 100 }, b: { i: g.startIdx + 50, p: 110 } }).ok, 'futur refusé');
  assert(TA.levelsAt(st, g.startIdx).every((l) => l.k !== 'f'), 'le coach ignore les retracements');
  console.log('  OK fibonacci : tracé accepté et validé, le coach l’ignore');
}
await import('./test-pm.mjs');   // gestionnaire de portefeuille
await import('./test-fund.mjs');   // saison des résultats
await import('./test-flash.mjs');   // flash technique
await import('./test-career.mjs');   // carrière
await import('./test-pattern.mjs');   // figures et commentaires
await import('./test-exam.mjs');   // examen blanc
await import('./test-camp.mjs');   // campagne
await import('./test-review.mjs');   // révision espacée
await import('./test-league.mjs');   // ligue hebdomadaire
await import('./test-chron.mjs');   // chroniques historiques
await import('./test-pwa.mjs');   // appli installable
console.log(`\n${n} groupes de tests reussis`);
console.log(TA.fmt.money(1234.5), '|', TA.fmt.smoney(-12.3), '|', TA.fmt.spct(0.0321), '|', TA.fmt.date(TA.dayFromISO('2008-09-15')));
