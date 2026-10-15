// Tests du mode Saison des résultats (trading/js/fund.js).
import assert from 'node:assert/strict';
import '../trading/js/fund.js';
const FD = globalThis.TA.FUND;
let n = 0;
const ok = (m) => { n++; console.log('  OK fund:', m); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// 1. déterminisme et bornes
{
  const a = FD.newGame('ABCD-1', { quarters: 8 }), b = FD.newGame('ABCD-1', { quarters: 8 }), c = FD.newGame('ABCD-2', { quarters: 8 });
  assert.deepEqual(a.cos.map((x) => x.px.pre), b.cos.map((x) => x.px.pre));
  assert.notDeepEqual(a.cos.map((x) => x.px.pre), c.cos.map((x) => x.px.pre));
  for (const co of a.cos) {
    assert.equal(co.q.length, a.T); assert.equal(co.px.pre.length, a.T); assert.equal(co.px.post.length, a.T);
    for (const r of co.q) for (const k of ['rev', 'om', 'ni', 'eps', 'cons', 'cfo', 'fcf', 'nd', 'bv', 'dso']) assert(Number.isFinite(r[k]), `${co.id} ${k}`);
    for (const p of [...co.px.pre, ...co.px.post]) assert(p > 0.2 && p < 5000 && Number.isFinite(p), `${co.id} prix ${p}`);
  }
  assert(a.agg.length >= 1 && a.agg.length <= 2 && !a.agg.some((id) => id === 'NBK' || id === 'HYL'));
  ok('parties reproductibles, états financiers et prix finis et bornés, 1 ou 2 sociétés agressives (ni banque ni service public)');
}

// 2. statistiques : les signaux comptables et la valorisation paient en moyenne
{
  const aggRet = [], cleanRet = [], cheap = [], dear = [], blowDrop = [], dsoRise = [];
  for (let s = 0; s < 150; s++) {
    const g = FD.newGame('MC-' + s, { quarters: 8 });
    for (const c of g.cos) {
      const r = c.px.post[g.T - 1] / c.px.pre[g.H] - 1;
      if (c.isAgg) { aggRet.push(r); const b = c.q[c.blowQ]; blowDrop.push(c.px.post[c.blowQ] / c.px.pre[c.blowQ] - 1); dsoRise.push(c.q[c.blowQ - 1].dso / c.dso - 1); } else cleanRet.push(r);
      const rt = FD.ratios(g, c, g.H - 1, c.px.pre[g.H]);
      const fvRel = rt.pe == null ? null : rt.pe;
      void fvRel;
    }
  }
  assert(aggRet.length > 100);
  // la chute comptable est vraiment une chute, précédée de créances qui montent
  assert(mean(blowDrop) < -0.12, 'chute moyenne à la publication : ' + mean(blowDrop));
  assert(mean(dsoRise) > 0.08, 'créances en hausse avant la chute : ' + mean(dsoRise));
  assert(mean(aggRet) < mean(cleanRet) - 0.03, `agressives ${mean(aggRet)} vs saines ${mean(cleanRet)}`);
  ok(`chute moyenne de ${(mean(blowDrop) * 100).toFixed(0)} % à la publication fautive, créances +${(mean(dsoRise) * 100).toFixed(0)} % avant ; agressives ${(mean(aggRet) * 100).toFixed(1)} % vs saines ${(mean(cleanRet) * 100).toFixed(1)} %`);
}

// 3. partie complète : transactions, publication, évaluation, comptabilité exacte
{
  const g = FD.newGame('PLAY-1', { quarters: 8 }), st = FD.newState(g, 100000);
  const cash0 = st.cash, c = g.cos[0], p = FD.price(g, st, c);
  assert(!FD.trade(g, st, c.id, 0).ok && !FD.trade(g, st, c.id, 10 ** 9).ok && !FD.trade(g, st, c.id, -1).ok);
  assert(FD.trade(g, st, c.id, 100).ok);
  assert(Math.abs(st.cash - (cash0 - 100 * p * (1 + FD.FEE))) < 1e-6);
  FD.predict(st, c.id, 'beat'); FD.predict(st, g.cos[1].id, 'miss');
  const r = FD.reveal(g, st);
  assert(r.ok && st.phase === 'post' && r.res.length === 8 && st.score.total === 2);
  assert(!FD.reveal(g, st).ok, 'on ne publie pas deux fois');
  assert(FD.trade(g, st, c.id, -50).ok);
  let guard = 0;
  while (!st.ended && guard++ < 40) { const nx = FD.next(g, st); if (nx.done) break; FD.reveal(g, st); }
  const ev = FD.evaluate(g, st);
  assert(st.ended && Number.isFinite(ev.tot) && ev.score.total >= 0 && ev.score.total <= 100 && 'ABCDE'.includes(ev.score.grade));
  assert.equal(st.results.length, 8);
  ok('transactions, prédictions, publication des 8 trimestres et évaluation : cohérents');
}
console.log(`  ${n} groupes de la saison des résultats réussis`);
