// Tests du carnet d'erreurs et de la révision espacée.
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../trading/js/review.js');
const RV = globalThis.TA.REVIEW;
let n = 0;
const ok = (m) => { n++; console.log('  OK révision: ' + m); };

const Q = (t, a = 1) => ({ type: 'mcq', text: t, opts: ['a', 'b', 'c'], a, expl: 'e' });
const D0 = '2026-03-30';

{
  assert.equal(RV.addDays('2026-03-30', 1), '2026-03-31');
  assert.equal(RV.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(RV.addDays('2024-02-28', 2), '2024-03-01');
  ok('calcul des dates (fin de mois, fin d’année, bissextile)');
}
{
  const st = RV.fresh();
  RV.add(st, { key: 'k1', src: 'camp', title: 'T', q: Q('q1') }, D0);
  assert.equal(st.items.length, 1);
  assert.equal(st.items[0].due, '2026-03-31', 'une nouvelle erreur revient le lendemain');
  assert.equal(RV.due(st, D0).length, 0);
  assert.equal(RV.due(st, '2026-03-31').length, 1);
  RV.add(st, { key: 'k1', src: 'camp', title: 'T', q: Q('q1') }, '2026-04-02');
  assert.equal(st.items.length, 1, 'même clé : pas de doublon');
  assert.equal(st.items[0].ko, 2);
  assert.equal(st.items[0].due, '2026-04-03');
  ok('ajout, échéance au lendemain, pas de doublon');
}
{
  const st = RV.fresh();
  RV.add(st, { key: 'k', src: 'x', q: Q('q') }, D0);
  let day = '2026-03-31';
  const seen = [];
  for (let b = 0; b < RV.INTERVALS.length; b++) {
    const r = RV.answer(st, 'k', true, day);
    if (b < RV.INTERVALS.length - 1) { assert.equal(r.mastered, false); seen.push(r.next); day = RV.addDays(day, r.next); }
    else assert.equal(r.mastered, true);
  }
  assert.deepEqual(seen, [3, 7, 16, 35]);
  assert.equal(st.items.length, 0);
  assert.equal(st.mastered, 1);
  ok('cinq réussites : intervalles 3, 7, 16, 35 jours puis question maîtrisée');
}
{
  const st = RV.fresh();
  RV.add(st, { key: 'k', src: 'x', q: Q('q') }, D0);
  RV.answer(st, 'k', true, '2026-03-31'); RV.answer(st, 'k', true, '2026-04-03');
  assert.equal(st.items[0].box, 2);
  const r = RV.answer(st, 'k', false, '2026-04-10');
  assert.equal(r.box, 0);
  assert.equal(st.items[0].due, '2026-04-11', 'une erreur ramène à la première boîte, demain');
  assert.equal(RV.answer(st, 'inconnu', true, D0), null);
  ok('une erreur remet la question au début');
}
{
  const st = RV.fresh();
  for (let i = 0; i < RV.MAX + 10; i++) RV.add(st, { key: 'k' + i, src: 'x', q: Q('q' + i) }, D0);
  assert.equal(st.items.length, RV.MAX);
  ok('carnet plafonné à ' + RV.MAX);
}
{
  const st = RV.fresh();
  RV.add(st, { key: 'a', src: 's', title: 'T1', q: Q('qa') }, D0);
  RV.add(st, { key: 'b', src: 's', title: 'T2', q: Q('qb') }, D0);
  RV.add(st, { key: 'b', src: 's', title: 'T2', q: Q('qb') }, D0);
  st.items.find((x) => x.key === 'a').box = 3;
  const due = RV.due(st, '2026-04-30');
  assert.equal(due[0].key, 'b', 'les boîtes les plus faibles passent d’abord');
  const s = RV.stats(st, '2026-04-30');
  assert.equal(s.total, 2); assert.equal(s.due, 2); assert.equal(s.boxes[3], 1);
  assert.equal(s.weak[0][0], 'T2');
  ok('tri par boîte, statistiques, points faibles');
}
{
  const bad = { v: 1, mastered: 3, reviewed: 'x', items: [
    { key: 'g', q: Q('ok'), due: '2026-05-01', box: 99, ok: -4, ko: 2 },
    { key: 'g', q: Q('dup'), due: '2026-05-01', box: 0 },
    { key: 'h', q: { type: 'mcq', text: 't', opts: ['a'], a: 0 }, due: '2026-05-01' },
    { key: 'i', q: Q('t'), due: 'demain' },
    null, { q: Q('t'), due: '2026-05-01' },
    { key: 'n', q: { type: 'num', text: 'n', num: { answer: NaN, dec: 0 } }, due: '2026-05-01' },
    { key: 'm', q: { type: 'num', text: 'n', num: { answer: 4.5, dec: 1, unit: '%' } }, due: '2026-05-01' },
  ] };
  const c = RV.clean(bad);
  assert.deepEqual(c.items.map((x) => x.key), ['g', 'm']);
  assert.equal(c.items[0].box, RV.INTERVALS.length - 1);
  assert.equal(c.items[0].ok, 0);
  assert.equal(c.mastered, 3); assert.equal(c.reviewed, 0);
  assert.deepEqual(RV.clean(null).items, []);
  assert.deepEqual(RV.clean({ v: 2, items: [{}] }).items, []);
  ok('validation des données lues (doublons, formats, bornes)');
}
{
  const s = RV.slim({ type: 'num', text: 't', num: { answer: 3, dec: 1, unit: '$' }, svg: 'x'.repeat(13000), html: '<b>ok</b>', expl: 'e', secret: 1 });
  assert.equal(s.svg, undefined); assert.equal(s.html, '<b>ok</b>'); assert.equal(s.secret, undefined);
  assert.equal(s.type, 'num'); assert.equal(s.num.answer, 3);
  const m = RV.slim(Q('t', 2));
  assert.deepEqual(m.opts, ['a', 'b', 'c']); assert.equal(m.a, 2);
  assert.equal(RV.keyOf('camp', 'abc'), RV.keyOf('camp', 'abc'));
  assert.notEqual(RV.keyOf('camp', 'abc'), RV.keyOf('camp', 'abd'));
  ok('réduction des questions et clés stables');
}
console.log('  ' + n + ' groupes de la révision réussis');
