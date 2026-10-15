// Tests du Flash technique : sorties de position, contexte, statistiques.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import '../trading/js/flash.js';
const FL = globalThis.TA.FLASH;
const read = (f) => JSON.parse(fs.readFileSync(`trading/data/${f}.json`));
let n = 0;
const ok = (m) => { n++; console.log('  OK flash:', m); };
{
  const d = { o: [], h: [], l: [], c: [] };
  for (let i = 0; i < 40; i++) { d.o.push(100); d.h.push(101); d.l.push(99); d.c.push(100); }
  const risk = 1.5 * FL.atr(d.h, d.l, d.c, 30);
  // futur : la barre 31 touche l'objectif à 2 R
  d.h[31] = 100 + 2 * risk + 0.1; d.l[31] = 100; d.o[31] = 100.5; d.c[31] = 100 + 2 * risk;
  const lo = FL.outcome(d, 30, 1);
  assert.equal(lo.exit, 'objectif'); assert.equal(lo.r, 2);
  const sh = FL.outcome(d, 30, -1);
  assert.equal(sh.exit, 'stop'); assert.equal(sh.r, -1);
  // gap contre la position : la sortie se fait à l'ouverture, pire que -1 R
  const g = { o: d.o.slice(), h: d.h.slice(), l: d.l.slice(), c: d.c.slice() };
  g.o[31] = 100 - 3 * risk; g.l[31] = g.o[31] - 1; g.h[31] = 100; g.c[31] = g.o[31];
  const gp = FL.outcome(g, 30, 1);
  assert(gp.exit === 'stop' && gp.r < -1.5, JSON.stringify(gp));
  ok('sortie par objectif (+2 R), par stop (−1 R) et par gap (pire que −1 R)');
}
{
  const idx = read('index').assets.filter((a) => a.n > 600);
  const rng = FL.rng('TEST-1'), rounds = [];
  for (let r = 0; r < 15; r++) {
    const p = FL.pick(rng, idx), d = read(p.asset.id), i = FL.indexFor(d.c.length, p.frac);
    assert(i >= 80 && i + FL.HOR < d.c.length, 'borne ' + i);
    const ctx = FL.context(d, i), a = { long: FL.outcome(d, i, 1), short: FL.outcome(d, i, -1) };
    assert(['haussière', 'baissière', 'neutre'].includes(ctx.trend) && ctx.rsiVal >= 0 && ctx.rsiVal <= 100);
    for (const o of [a.long, a.short]) { assert(Number.isFinite(o.r) && o.r >= -12 && o.r <= 2.0001, 'R ' + o.r); }
    const dir = r % 3 === 0 ? 0 : r % 2 ? 1 : -1;
    const o = dir === 0 ? { r: 0, exit: 'passé', bars: 0 } : dir === 1 ? a.long : a.short;
    rounds.push({ id: p.asset.id, dir, r: o.r, exit: o.exit, bars: o.bars, ctx, alt: a });
  }
  const sm = FL.summary(rounds);
  assert.equal(sm.n, 15); assert.equal(sm.taken + sm.passes, 15);
  assert(Math.abs(sm.total - rounds.reduce((s, x) => s + x.r, 0)) < 1e-9);
  assert(sm.regret >= -1e-9);
  FL.notes(sm);
  const again = FL.rng('TEST-1'); const p1 = FL.pick(again, idx);
  assert.equal(p1.asset.id, FL.pick(FL.rng('TEST-1'), idx).asset.id);
  ok('15 tours simulés : bornes, R finis, résumé cohérent, tirage reproductible');
}
console.log(`  ${n} groupes du flash technique réussis`);
