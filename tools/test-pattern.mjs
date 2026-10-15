// Tests de la Chasse aux figures et du commentaire de la direction.
import assert from 'node:assert/strict';
import '../trading/js/pattern.js';
import '../trading/js/fund.js';
const PT = globalThis.TA.PATTERN, FD = globalThis.TA.FUND;
let n = 0;
const ok = (m) => { n++; console.log('  OK figures:', m); };
{
  const rng = PT.rng('T1');
  for (const t of PT.TYPES) {
    const d = PT.generate(rng, t);
    assert.equal(d.c.length, PT.BARS);
    for (let i = 0; i < PT.BARS; i++) assert(Number.isFinite(d.o[i] + d.h[i] + d.l[i] + d.c[i]) && d.h[i] >= Math.max(d.o[i], d.c[i]) && d.l[i] <= Math.min(d.o[i], d.c[i]));
  }
  // double sommet : les deux sommets dépassent nettement le creux central
  const dt = PT.generate(PT.rng('T2'), PT.TYPES.find((t) => t.id === 'dtop'));
  const hi = (a, b) => Math.max(...dt.c.slice(a, b)), lo = (a, b) => Math.min(...dt.c.slice(a, b));
  assert(hi(10, 22) > lo(26, 34) && hi(36, 48) > lo(26, 34));
  for (let k = 0; k < 40; k++) { const q = PT.question(PT.rng('Q' + k)); assert.equal(new Set(q.opts).size, 4); assert(q.opts.includes(q.type.id)); }
  assert.deepEqual(PT.question(PT.rng('Z')).opts, PT.question(PT.rng('Z')).opts);
  ok('huit figures générées avec barres cohérentes, double sommet reconnaissable, questions à 4 choix reproductibles');
}
{
  const g = FD.newGame('CM-1', { quarters: 8 });
  for (const c of g.cos) for (let k = g.H; k < g.T; k++) { const a = FD.commentary(c, k), b = FD.commentary(c, k); assert(a.length >= 1 && JSON.stringify(a) === JSON.stringify(b)); }
  // le langage promotionnel est plus fréquent chez les sociétés agressives (signal faible)
  let aggP = 0, aggN = 0, cleanP = 0, cleanN = 0;
  for (let s = 0; s < 60; s++) {
    const gg = FD.newGame('CMX-' + s, { quarters: 8 });
    for (const c of gg.cos) for (let k = gg.H; k < gg.T; k++) {
      const promo = /record|sans précédent|sommet historique/.test(FD.commentary(c, k).join(' '));
      if (c.isAgg && k < c.blowQ) { aggN++; if (promo) aggP++; } else if (!c.isAgg) { cleanN++; if (promo) cleanP++; }
    }
  }
  assert(aggP / aggN > cleanP / cleanN + 0.3, `${aggP / aggN} vs ${cleanP / cleanN}`);
  ok('commentaire de la direction : reproductible, plus promotionnel chez les sociétés agressives');
}
console.log(`  ${n} groupes des figures réussis`);
