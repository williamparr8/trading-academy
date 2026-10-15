// Tests de la progression : grades, code du jour, XP et badges.
import assert from 'node:assert/strict';
globalThis.localStorage = { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
import '../trading/js/career.js';
const CR = globalThis.TA.CAREER;
let n = 0;
const ok = (m) => { n++; console.log('  OK career:', m); };
const ok2 = ok;
assert.equal(CR.rankOf(0).name, 'Stagiaire'); assert.equal(CR.rankOf(150).name, 'Analyste junior'); assert.equal(CR.rankOf(99999).next, null);
assert(Math.abs(CR.rankOf(275).pct - 0.5) < 1e-9);
assert.equal(CR.dayCode('2026-10-15'), CR.dayCode('2026-10-15')); assert.notEqual(CR.dayCode('2026-10-15'), CR.dayCode('2026-10-16'));
assert(/^FL-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(CR.dayCode('2026-10-15')));
ok('grades, progression vers le grade suivant, code du jour reproductible');
{
  const r1 = CR.apply({ kind: 'game', ret: 0.1, bh: 0.05, dd: -0.05, trades: 4, counted: true, passed: true, replay: false, scenario: 'gfc' });
  assert(r1.xp >= 85 && r1.badges.includes('first') && r1.badges.includes('beat') && r1.badges.includes('discipline') && r1.badges.includes('crisis'), JSON.stringify(r1));
  const xp1 = CR.state().xp;
  const r2 = CR.apply({ kind: 'pm', grade: 'A', monthsBad: 0 });
  assert(r2.badges.includes('pm1') && r2.badges.includes('pmA') && r2.badges.includes('pmClean'));
  const r3 = CR.apply({ kind: 'fund', grade: 'B', accuracy: 0.7, predictions: 8, avoided: 1 });
  assert(r3.badges.includes('trap') && r3.badges.includes('oracle') && r3.badges.includes('fund1'));
  const r4 = CR.apply({ kind: 'flash', total: 6, taken: 10, wins: 6, code: CR.dayCode() });
  assert(r4.badges.includes('flash1') && r4.badges.includes('flashPos') && r4.why.some((x) => x.includes('défi du jour')));
  assert(CR.state().badges.all, 'badge touche-à-tout');
  assert(CR.state().xp > xp1 && CR.state().days.streak === 1);
  const q = CR.apply({ kind: 'quiz', id: 'candles', score: 4, total: 4 });
  assert(q.xp >= 15);
  const q2 = CR.apply({ kind: 'quiz', id: 'candles', score: 4, total: 4 });
  assert(q2.xp < q.xp, 'un quiz refait rapporte moins');
  ok('XP et badges des cinq modules, objectifs du jour, quiz refait moins payant');
}
{
  const r = CR.apply({ kind: 'exam', pct: 0.95, pass: true, n: 20, review: false, code: 'EX-TEST' });
  assert(r.badges.includes('exam') && r.badges.includes('exam90'));
  const r2 = CR.apply({ kind: 'exam', pct: 0.5, pass: false, n: 10, review: true, code: 'EX-TEST2' });
  assert(!r2.badges.includes('exam') && r2.xp > 0);
  ok('examen : XP et badges, la révision rapporte moins');
}
{
  globalThis.window = globalThis;
  await import('../trading/js/missions.js');
  const MS = globalThis.TA.MISSIONS;
  const a = MS.pick('ABCD-2345'), b = MS.pick('ABCD-2345');
  assert.deepEqual(a.map((m) => m.id), b.map((m) => m.id));
  assert.equal(new Set(a.map((m) => m.id)).size, 3);
  const ctx = { sum: { maxDD: -0.05, retPct: 0.1, bh: 0.02, trades: 3 }, bars: 60, trades: [
    { dir: 1, net: 300, r: 1.5, openIdx: 0, closeIdx: 12 }, { dir: -1, net: 200, r: 1, openIdx: 20, closeIdx: 25 }, { dir: 1, net: -100, r: -1, openIdx: 30, closeIdx: 33 } ] };
  const ok = Object.fromEntries(MS.evaluate(MS.ALL, ctx).map((x) => [x.id, x.ok]));
  assert(ok.dd8 && ok.three && ok.rr && ok.short && ok.cap2r && ok.beat && ok.patience && ok.half && ok.green && ok.calm, JSON.stringify(ok));
  const bad = Object.fromEntries(MS.evaluate(MS.ALL, { sum: { maxDD: -0.3, retPct: -0.1, bh: 0.2, trades: 1 }, bars: 60, trades: [{ dir: 1, net: -500, r: -3, openIdx: 0, closeIdx: 2 }] }).map((x) => [x.id, x.ok]));
  assert(!bad.dd8 && !bad.three && !bad.cap2r && !bad.beat && !bad.green && !bad.short && !bad.patience);
  const r = CR.apply({ kind: 'game', ret: 0.1, bh: 0.02, dd: -0.05, trades: 3, counted: false, passed: false, replay: false, missions: 3, missionsTotal: 3 });
  assert(r.badges.includes('missions') && r.why.some((w) => w.includes('mission')));
  ok2('missions : tirage reproductible, évaluation juste, XP et badge');
}
console.log(`  ${n} groupes de la carrière réussis`);
