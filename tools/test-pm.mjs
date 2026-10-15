// Tests du mode Gestionnaire de portefeuille (logique pure de trading/js/pm.js).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import '../trading/js/pm.js';
const PM = globalThis.TA.PM;
const read = (f) => JSON.parse(fs.readFileSync(`trading/data/${f}.json`));
const series = {};
for (const id of ['SPY', ...PM.RISKY.filter((x) => x !== 'SPY')]) { const d = read(id); series[id] = { t: d.t, c: d.c }; }
let n = 0;
const ok = (m) => { n++; console.log('  OK pm:', m); };
const near = (a, b, e = 1e-6, msg = '') => assert(Math.abs(a - b) <= e * Math.max(1, Math.abs(b)), `${msg} ${a} vs ${b}`);
const rnd = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

// 1. alignement : pas de trou après le départ, report de la dernière cote
{
  const g = PM.build(PM.MANDATES[0], series, { seed: 'T1' });
  for (const id of PM.RISKY) for (let i = g.start; i <= g.end; i++) assert(g.px[id][i] > 0, `${id} ${i}`);
  assert(g.end < g.t.length && g.start >= 10);
  ok('cotes alignées sur le calendrier de SPY, sans trou, pour les sept FNB');
}

// 2. départ : valeur = capital, poids = politique ; reproductible
{
  for (const m of PM.MANDATES) {
    const g = PM.build(m, series, { seed: 'ABCD' }), st = PM.newState(g), v = PM.value(g, st);
    near(v.total, m.start);
    for (const id of PM.ALL) near(v.w[id], PM.saaOf(m)[id] || 0, 1e-9, id);
    assert.equal(PM.build(m, series, { seed: 'ABCD' }).start, g.start);
  }
  const sc = PM.build(PM.MANDATES[0], series, { scenario: 'krach2008' });
  const y = new Date(sc.t[sc.start] * 86400000).getUTCFullYear();
  assert(y === 2007, 'krach 2008 démarre en 2007, pas ' + y);
  ok('départ aligné sur la politique pour les 4 mandats ; période reproductible ; scénario daté');
}

// 3. rééquilibrage : comptabilité exacte (valeur après = valeur avant - frais)
{
  const m = PM.MANDATES[1], g = PM.build(m, series, { seed: 'R1' }), st = PM.newState(g);
  const before = PM.value(g, st).total;
  const r = PM.rebalance(g, st, { SPY: 0.5, QQQ: 0.3, XIU_TO: 0.1, TLT: 0.05, GLD: 0.05 });
  assert(r.ok && r.cost > 0 && r.traded > 0);
  const a = PM.value(g, st);
  near(a.total, before - r.cost, 1e-9);
  near(a.w.QQQ, 0.3 * (before - r.cost - 0) / a.total, 2e-3, 'QQQ');
  assert(a.w.CASH >= -1e-9 && Math.abs(Object.values(a.w).reduce((s, x) => s + x, 0) - 1) < 1e-9);
  assert(!PM.rebalance(g, st, { SPY: 0.8, QQQ: 0.4 }).ok, 'plus de 100 % refusé');
  assert.equal(PM.rebalance(g, st, { SPY: 0.5, QQQ: 0.3, XIU_TO: 0.1, TLT: 0.05, GLD: 0.05 }).traded < 10, true, 'second appel identique : presque rien');
  ok('rééquilibrage : valeur après = valeur avant moins les frais, poids aux cibles, plus de 100 % refusé');
}

// 4. un mois : indice du compte = produit des rendements mensuels ; référence idem
{
  const m = PM.MANDATES[3], g = PM.build(m, series, { seed: 'S4' }), st = PM.newState(g);
  for (let k = 0; k < 12; k++) PM.step(g, st);
  let p = 100, b = 100;
  st.mon.forEach((x, i) => { p *= 1 + x.r; b *= 1 + x.rb; near(st.pidx[(i + 1) * PM.BARS], p, 1e-9, 'p' + i); near(st.bidx[(i + 1) * PM.BARS], b, 1e-9, 'b' + i); });
  assert.equal(st.pidx.length, 12 * PM.BARS + 1);
  // sans aucun échange, le portefeuille de départ colle à l'indice de politique à quelques points de base près
  near(p, b, 0.03, 'dérive sans échange');
  ok('indice du compte et de la référence = produit des rendements mensuels sur 12 mois, sans dérive de calcul');
}

// 5. flux, ventes forcées, événements
{
  const m = JSON.parse(JSON.stringify(PM.MANDATES[0]));
  m.flow = -40000; m.start = 100000;   // retrait énorme : plus que l'encaisse
  const g = PM.build(m, series, { seed: 'F5' }), st = PM.newState(g);
  PM.step(g, st);
  assert(st.cash >= -1e-6, 'encaisse jamais négative');
  assert(st.log.some((l) => l.kind === 'warn'), 'vente forcée signalée');
  const m2 = PM.MANDATES[0], g2 = PM.build(m2, series, { seed: 'F6' }), s2 = PM.newState(g2);
  for (let k = 0; k < 19; k++) PM.step(g2, s2);
  assert(s2.log.some((l) => l.kind === 'event' && l.m === 18), 'événement du mois 18');
  const m3 = PM.MANDATES[1], g3 = PM.build(m3, series, { seed: 'F7' }), s3 = PM.newState(g3);
  for (let k = 0; k < 41; k++) PM.step(g3, s3);
  assert.equal(s3.cons.find((c) => c.k === 'maxDD').v, 0.2, 'plafond ramené à 20 %');
  ok('retraits plus grands que l’encaisse : vente forcée ; événements : retrait unique, nouveau plafond');
}

// 6. parties complètes avec un gestionnaire aléatoire : aucune valeur absurde, évaluation complète
{
  let games = 0;
  for (const m of PM.MANDATES) for (const seed of ['A', 'B', 'C']) {
    const g = PM.build(m, series, { seed }), st = PM.newState(g), R = rnd(seed.charCodeAt(0) * 7 + m.horizon);
    while (!st.ended) {
      if (R() < 0.4) {
        const t = {}; let left = 1;
        for (const id of PM.RISKY) { const w = Math.min(left, R() * 0.35); t[id] = w; left -= w; }
        assert(PM.rebalance(g, st, t, 'test').ok);
      }
      const cur = PM.value(g, st);
      assert(cur.total > 0 && Number.isFinite(cur.total) && cur.v.CASH >= -1e-6, 'valeur saine');
      PM.step(g, st);
    }
    assert.equal(st.mon.length, g.N); assert.equal(st.pidx.length, g.N * PM.BARS + 1);
    const ev = PM.evaluate(g, st);
    for (const k of ['tot', 'ann', 'vol', 'dd', 'te']) assert(Number.isFinite(ev[k]), k);
    assert(ev.score.total >= 0 && ev.score.total <= 100 && 'ABCDE'.includes(ev.score.grade));
    assert(ev.notes.length >= 3);
    // attribution : somme des contributions + frais + résidu = écart arithmétique cumulé
    const act = st.mon.reduce((s, x) => s + x.r - x.rb, 0);
    near(PM.ALL.reduce((s, id) => s + ev.attr[id], 0) + ev.costDrag + ev.resid, act, 1e-9, 'attribution');
    games++;
  }
  ok(games + ' mandats complets avec gestionnaire aléatoire : valeurs saines, évaluation, attribution qui boucle');
}

// 7. conformité : un portefeuille hors politique est signalé
{
  const m = PM.MANDATES[2], g = PM.build(m, series, { seed: 'C7' }), st = PM.newState(g);
  PM.rebalance(g, st, { XEG_TO: 0.5, SPY: 0.5 });
  const bad = PM.check(g, st).filter((c) => !c.ok).map((c) => c.k);
  assert(bad.includes('ban') && bad.includes('maxPos') && bad.includes('minCash'), bad.join());
  PM.step(g, st);
  assert(st.breach[0].includes('ban'));
  ok('exclusion, concentration et liquidité : dépassements détectés et comptés');
}
console.log(`  ${n} groupes du gestionnaire de portefeuille réussis`);
