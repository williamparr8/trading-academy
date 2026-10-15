// Tests de l'examen blanc.
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../trading/js/exam.js');
const EX = globalThis.TA.EXAM;
const lessons = [
  { id: 'a', title: 'A', quiz: [{ q: 'q1', o: ['x', 'y', 'z'], a: 1, e: 'e1' }, { q: 'q2', o: ['x', 'y'], a: 0, e: 'e2' }] },
  { id: 'b', title: 'B', quiz: [{ q: 'q3', o: ['x', 'y', 'z'], a: 2, e: 'e3' }] },
];
const pool = EX.pool(lessons);
assert.equal(pool.length, 3);
const qs = EX.build(pool, EX.rng('S1'), 20);
assert.equal(qs.length, 3);
for (const q of qs) { const src = pool.find((p) => p.key === q.key); assert.equal(q.o[q.a], src.o[src.a], 'la bonne réponse suit le mélange'); }
assert.deepEqual(EX.build(pool, EX.rng('S1'), 20).map((q) => q.key), qs.map((q) => q.key));
const g = EX.grade(qs, qs.map((q) => q.a));
assert(g.pass && g.right === 3 && g.pct === 1);
const g2 = EX.grade(qs, qs.map((q) => (q.a + 1) % q.o.length));
assert(!g2.pass && g2.wrong.length === 3);
assert.equal(EX.build(pool, EX.rng('S1'), 20, ['a:0']).length, 1);
console.log('  OK examen: banque, mélange des options, correction, révision ciblée');

// Atelier EPP : notation des dossiers
await import('../trading/js/ips.js');
const IPS = globalThis.TA.IPS;
assert.equal(IPS.CASES.length, 6);
for (const c of IPS.CASES) {
  assert(IPS.RISK.some((r) => r[0] === c.risk) && IPS.ALLOCS.some((a) => a.id === c.alloc) && c.cons.every((x) => IPS.CONS.some((k) => k[0] === x)));
  const perfect = IPS.grade(c, { risk: c.risk, cons: c.cons, alloc: c.alloc });
  assert.equal(perfect.total, 100);
  const bad = IPS.grade(c, { risk: c.risk === 'faible' ? 'elevee' : 'faible', cons: [], alloc: c.alloc === 'A' ? 'D' : 'A' });
  assert(bad.total < 40 && bad.total >= 0);
}
const partial = IPS.grade(IPS.CASES[1], { risk: 'faible', cons: ['liquidite'], alloc: 'B' });
assert.equal(partial.risk, 40); assert.equal(partial.cons, 15); assert.equal(partial.alloc, 0);
console.log('  OK atelier EPP: six dossiers cohérents, notation exacte (tolérance, contraintes partielles, allocation)');
