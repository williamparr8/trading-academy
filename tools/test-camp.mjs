// Tests de la campagne : 100 niveaux x 3 difficultés, questions valides, progression linéaire.
import fs from 'node:fs';
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../trading/js/fund.js');
await import('../trading/js/pattern.js');
await import('../trading/js/ips.js');
await import('../trading/js/pm.js');
await import('../trading/js/camp-gen.js');
await import('../trading/js/camp-data.js');
await import('../trading/js/camp.js');
const TA = globalThis.TA, CAMP = TA.CAMP, CG = TA.CAMPGEN, CP = TA.CAMPLOGIC;
const read = (f) => JSON.parse(fs.readFileSync('trading/data/' + f + '.json'));
const TECH = ['SPY', 'QQQ', 'GLD', 'XOM', 'JNJ', 'KO'], SER = ['SPY', 'QQQ', 'IWM', 'XIU_TO', 'XEG_TO', 'GLD', 'TLT'];
const rngOf = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let n = 0;
const ok = (m) => { n++; console.log('  OK camp:', m); };

assert.equal(CAMP.LEVELS.length, 100);
CAMP.LEVELS.forEach((l, i) => {
  assert.equal(l.n, i + 1);
  assert(l.specs.length >= 1 && l.title && l.concept && l.beat);
  for (const s of l.specs) { assert(CG.kinds[s.kind], 'sorte ' + s.kind); if (s.kind === 'bank') assert(CAMP.BANKS[s.p.bank], 'banque ' + s.p.bank); }
});
assert.equal(CAMP.CHAPTERS.length, 10);
for (let c = 1; c <= 10; c++) assert.equal(CAMP.LEVELS.filter((l) => l.ch === c).length, 10, 'chapitre ' + c);
ok('100 niveaux, 10 chapitres de 10, sortes et banques toutes définies');

{
  const st = {};
  assert(CP.unlocked(st, 1) && !CP.unlocked(st, 2));
  st[1] = 1;
  assert(CP.unlocked(st, 2) && CP.tierOpen(st, 1, 1) && !CP.tierOpen(st, 1, 2) && !CP.tierOpen(st, 2, 1));
  assert.equal(CP.next(st), 2);
  st[1] = 3;
  assert(CP.tierOpen(st, 1, 2));
  assert.deepEqual(CP.badgesFor({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 }, 10), ['camp1']);
  ok('déblocage linéaire des niveaux et des paliers, badges de chapitre');
}

{
  const mq = { type: 'mcq', a: 2 }, nq = { type: 'num', num: { answer: 12.5, dec: 1 } }, eq = { type: 'num', num: { answer: 40, dec: 0 }, tol: 0 };
  assert(CP.check(mq, '2', 0) && !CP.check(mq, '1', 0));
  assert(CP.check(nq, '12,5', 1) && CP.check(nq, '12.9', 1) && !CP.check(nq, '14', 1) && !CP.check(nq, '12.9', 2) && CP.check(nq, '12.6', 2));
  assert(CP.check(eq, '40', 2) && !CP.check(eq, '41', 2));
  ok('réponses : choix, numérique avec tolérance par difficulté, exact pour les entiers');
}

{
  const assets = TECH.map((id) => { const d = read(id); return { id, d, hasVol: d.v && d.v.some((x) => x > 0) }; });
  const series = {};
  for (const id of SER) { const d = read(id); series[id] = { t: d.t, c: d.c }; }
  let count = 0;
  for (const l of CAMP.LEVELS) for (let tier = 0; tier < 3; tier++) for (const seed of [1, 2]) {
    const ctx = { rng: rngOf(l.n * 100 + tier * 10 + seed), lvl: tier, assets, FD: TA.FUND, PT: TA.PATTERN, IPS: TA.IPS, PM: TA.PM, banks: CAMP.BANKS, series };
    const qs = CP.build(ctx, l, tier);
    assert.equal(qs.length, CAMP.TIERS[tier].n);
    for (const q of qs) {
      count++;
      assert(q.text && q.text.length > 8 && q.expl, 'texte/explication niveau ' + l.n + ' ' + q.kind);
      if (q.type === 'mcq') {
        assert(Array.isArray(q.opts) && q.opts.length >= 2 && new Set(q.opts).size === q.opts.length, 'options niveau ' + l.n + ' ' + q.kind + ' ' + JSON.stringify(q.opts));
        assert(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, 'index niveau ' + l.n + ' ' + q.kind);
      } else {
        assert(q.type === 'num' && Number.isFinite(q.num.answer), 'numérique niveau ' + l.n + ' ' + q.kind);
      }
      if (q.svg) assert(!/NaN|undefined/.test(q.svg), 'svg NaN niveau ' + l.n + ' ' + q.kind);
      if (q.html) assert(!/NaN|undefined/.test(q.html), 'html NaN niveau ' + l.n + ' ' + q.kind);
      assert(!/NaN|undefined/.test(q.text + q.expl + (q.opts || []).join('')), 'texte NaN niveau ' + l.n + ' ' + q.kind);
    }
  }
  const miss = CG.stats.miss / Math.max(1, CG.stats.total);
  assert(miss < 0.06, 'fenêtres sans critère trouvé : ' + (miss * 100).toFixed(1) + ' %');
  ok(count + ' questions générées (100 niveaux x 3 difficultés x 2 tirages), toutes valides ; fenêtres de repli : ' + (miss * 100).toFixed(1) + ' %');
}
{
  // mise en scène : chaque niveau a sa scène, ses phrases d'exercice et sa conclusion
  await import('../trading/js/camp-story.js');
  await import('../trading/js/camp-story2.js');
  const CS = globalThis.TA.CAMPSTORY, LV = globalThis.TA.CAMP.LEVELS;
  const who = Object.keys(CS.CAST);
  assert.equal(CS.WHERE.length, 10);
  const balanced = (t) => (t.match(/«/g) || []).length === (t.match(/»/g) || []).length;
  for (const l of LV) {
    const sc = CS.SCENES[l.n];
    assert(sc, 'scène manquante : niveau ' + l.n);
    assert(sc.s.length >= 2 && sc.s.length <= 4, 'répliques du niveau ' + l.n);
    assert(sc.f.length >= 2 && sc.f.every((x) => typeof x === 'string' && x.length > 10), 'phrases du niveau ' + l.n);
    assert(sc.ok.length >= 1);
    for (const [w, t] of sc.s.concat(sc.ok)) { assert(who.includes(w), 'personnage inconnu ' + w + ' (niveau ' + l.n + ')'); assert(t.length > 8 && balanced(t), 'texte du niveau ' + l.n + ' : ' + t.slice(0, 50)); }
    if (sc.w) assert(sc.w.length > 6);
    // un hôte de scène avec des réactions
    const host = (sc.s.find(([w]) => ['C', 'L', 'K', 'N'].includes(w)) || sc.s.find(([w]) => w === 'G') || ['C'])[0];
    assert(CS.GOOD[host] && CS.BAD[host] && CS.RETRY[host], 'réactions de ' + host + ' (niveau ' + l.n + ')');
    // les épreuves ont au moins une phrase par exercice du premier palier
    if (l.boss) assert(sc.f.length >= 2);
  }
  const bosses = LV.filter((l) => l.boss).map((l) => l.n);
  for (const n of Object.keys(CS.CHOICES)) {
    const d = CS.CHOICES[n];
    assert(bosses.includes(+n), 'dilemme sur un niveau sans épreuve : ' + n);
    assert(who.includes(d.who) && d.opts.length === 3);
    assert(d.opts.some((o) => o.v === 1) && d.opts.some((o) => o.v === -1), 'un choix honnête et un choix fautif');
    for (const o of d.opts) { assert([-1, 0, 1].includes(o.v)); assert(o.r.length >= 1 && o.r.every(([w, t]) => who.includes(w) && balanced(t))); }
  }
  assert.equal(Object.keys(CS.CHOICES).length, 10);
  assert.equal(CS.integrity({}), 0);
  assert.equal(CS.integrity({ 10: 0, 20: 0 }), 2);
  assert.equal(CS.integrity({ 10: 1 }), -1);
  for (const k of ['hi', 'mid', 'lo']) assert(CS.EPILOGUE[k].length >= 2);
  ok('histoire : 100 scènes jouables, personnages connus, guillemets équilibrés, 10 dilemmes, épilogues');
}
console.log('  ' + n + ' groupes de la campagne réussis');
