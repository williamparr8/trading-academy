// Tests de la ligue hebdomadaire contre des rivaux fictifs.
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../trading/js/league.js');
const LG = globalThis.TA.LEAGUE;
let n = 0;
const ok = (m) => { n++; console.log('  OK ligue: ' + m); };

{
  const a = LG.field('2026-10-12', 0), b = LG.field('2026-10-12', 0), c = LG.field('2026-10-19', 0);
  assert.equal(a.length, LG.SIZE - 1);
  assert.deepEqual(a.map((r) => [r.n, r.total]), b.map((r) => [r.n, r.total]), 'même semaine, même classement');
  assert.notDeepEqual(a.map((r) => r.total), c.map((r) => r.total));
  assert.equal(new Set(a.map((r) => r.n)).size, a.length, 'rivaux distincts');
  for (const r of a) { assert(Math.abs(r.w.reduce((x, y) => x + y, 0) - 1) < 1e-9); assert(r.total > 0); }
  ok('sept rivaux distincts, déterministes, poids journaliers normalisés');
}
{
  for (const tier of [0, 4]) for (const r of LG.field('2026-10-12', tier)) {
    let prev = -1;
    for (let e = 0; e <= 7.0001; e += 0.25) { const v = LG.xpAt(r, e); assert(v >= prev, 'croissant'); prev = v; }
    assert.equal(LG.xpAt(r, 7), r.total); assert.equal(LG.xpAt(r, 0), 0); assert.equal(LG.xpAt(r, 99), r.total);
  }
  const lo = LG.field('2026-10-12', 0).reduce((s, r) => s + r.total, 0), hi = LG.field('2026-10-12', 4).reduce((s, r) => s + r.total, 0);
  assert(hi > lo * 2, 'les ligues hautes sont plus exigeantes');
  ok('points croissants dans la semaine, ligues plus fortes plus haut');
}
{
  const rows = LG.standings('2026-10-12', 1, 100000, 7);
  assert.equal(rows[0].me, true); assert.equal(rows.length, LG.SIZE);
  for (let i = 1; i < rows.length; i++) assert(rows[i - 1].xp >= rows[i].xp);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3, 4, 5, 6, 7, 8]);
  const zero = LG.standings('2026-10-12', 1, 0, 7);
  assert.equal(zero[zero.length - 1].me, true, 'sans point, dernier');
  // égalité : le joueur est derrière
  const t = LG.field('2026-10-12', 0)[0].total, tie = LG.standings('2026-10-12', 0, t, 7);
  const ri = tie.findIndex((r) => r.xp === t && !r.me), mi = tie.findIndex((r) => r.me);
  assert(ri < mi);
  ok('classement trié, égalités défavorables au joueur');
}
{
  assert.equal(LG.verdict(1, 50, 0), 'up');
  assert.equal(LG.verdict(3, 50, 0), 'up');
  assert.equal(LG.verdict(4, 50, 0), 'stay');
  assert.equal(LG.verdict(7, 50, 2), 'down');
  assert.equal(LG.verdict(8, 0, 0), 'stay', 'on ne descend pas sous Bronze');
  assert.equal(LG.verdict(1, 0, 3), 'down', 'aucun point : jamais de promotion');
  assert.equal(LG.verdict(1, 999, 4), 'stay', 'plafond de la dernière ligue');
  ok('promotion, maintien, relégation, bornes');
}
{
  const lg = { v: 1, tier: 0, settled: '2026-09-28', hist: [] };
  const done = LG.settle(lg, '2026-10-26', (w) => (w === '2026-10-05' ? 5000 : 0));
  assert.deepEqual(done.map((h) => h.week), ['2026-10-05', '2026-10-12', '2026-10-19']);
  assert.equal(done[0].res, 'up'); assert.equal(lg.hist.length, 3);
  assert.equal(done[1].tier, 1); assert.equal(done[1].res, 'down', 'une semaine inactive fait redescendre');
  assert.equal(lg.tier, 0); assert.equal(lg.settled, '2026-10-19');
  assert.deepEqual(LG.settle(lg, '2026-10-26', () => 9999), [], 'rien à régler deux fois');
  ok('règlement de plusieurs semaines, inactivité pénalisée, idempotent');
}
{
  const c = LG.clean({ v: 1, tier: 99, settled: 'x', hist: [{ week: '2026-10-05', rank: 2, tier: 1, xp: -5, res: 'zzz' }, null, { week: 3 }] }, '2026-10-19');
  assert.equal(c.tier, 0); assert.equal(c.settled, '2026-10-12');
  assert.equal(c.hist.length, 1); assert.equal(c.hist[0].xp, 0); assert.equal(c.hist[0].res, 'stay');
  assert.deepEqual(LG.clean(null, '2026-10-19').hist, []);
  ok('validation des données lues');
}
console.log('  ' + n + ' groupes de la ligue réussis');
