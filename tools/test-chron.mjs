// Tests des chroniques historiques : données, simulation sur les vraies cotes, notation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.window = globalThis;
await import('../trading/js/chron-data.js');
await import('../trading/js/chron.js');
const CH = globalThis.TA.CHRON, DATA = globalThis.TA.CHRON_DATA;
let n = 0;
const ok = (m) => { n++; console.log('  OK chroniques: ' + m); };

const cache = {};
const get = (id) => cache[id] || (cache[id] = (() => { const d = JSON.parse(fs.readFileSync('trading/data/' + id + '.json', 'utf8')); return { t: d.t, c: d.c }; })());
const worldOf = (c) => { const w = {}; for (const id of new Set(c.ids.concat(['SPY', 'TLT']))) w[id] = get(id); return w; };
const run = (c, targets) => {
  const world = worldOf(c), G = CH.start(), D = c.steps.map((s) => s.date).concat(c.end.date), journal = [];
  c.steps.forEach((s, i) => {
    const t = typeof targets === 'function' ? targets(i, G) : targets;
    const r = CH.advance(world, c.ids, G, CH.dayOf(D[i]), CH.dayOf(D[i + 1]), t);
    journal.push({ i, target: t, ret: r.ret, fee: r.fee });
  });
  return { G, journal, world };
};

{
  assert.equal(DATA.length, 8);
  assert.equal(new Set(DATA.map((c) => c.id)).size, 8);
  for (const c of DATA) {
    assert.deepEqual(CH.validate(c), [], c.id);
    assert(c.steps.length >= 3 && c.steps.length <= 6, c.id + ' : nombre d’étapes');
    for (const id of c.ids) assert(CH.NAMES[id] && CH.SHORT[id] && CH.COLORS[id], 'nom/couleur : ' + id);
    for (const id of c.ids) {
      const s = get(id), first = CH.dayOf(c.steps[0].date) - CH.PRE, last = CH.dayOf(c.end.date);
      assert(s.t[0] <= first, `${c.id} : ${id} commence trop tard`);
      assert(s.t[s.t.length - 1] >= last, `${c.id} : ${id} s’arrête trop tôt`);
    }
    // chaque date d'étape est un jour de Bourse (cote le jour même)
    for (const d of c.steps.map((s) => s.date).concat(c.end.date)) assert(get('SPY').t.includes(CH.dayOf(d)), `${c.id} : ${d} n’est pas un jour de Bourse`);
  }
  ok('huit chroniques : structure, dates de Bourse, cotes disponibles');
}
{
  const c = DATA[0], world = worldOf(c);
  const s = world.SPY, d = CH.dayOf('2008-09-12');
  assert.equal(CH.priceOn(s, d), s.c[s.t.indexOf(d)]);
  assert.equal(CH.priceOn(s, d + 1), CH.priceOn(s, d), 'week-end : dernière cote connue');
  assert.equal(CH.priceOn(s, s.t[0] - 1), null);
  ok('cote à une date, week-end, avant le début');
}
{
  for (const c of DATA) {
    const { G, journal } = run(c, {});
    assert(Math.abs(G.value - 100000) < 1e-6, 'tout en cash : le capital ne bouge pas');
    assert.equal(G.dd, 0); assert.equal(G.fees, 0);
    const g = CH.grade(G, journal);
    assert(g.timid && g.score <= 55, 'tout en cash : note plafonnée');
  }
  ok('tout en cash : capital intact, aucun frais, note plafonnée');
}
{
  const c = DATA[0], world = worldOf(c);
  const one = { SPY: 1 };
  const G = CH.start();
  const r = CH.advance(world, c.ids, G, CH.dayOf('2007-10-09'), CH.dayOf('2008-03-17'), one);
  const exp = (100000 * (1 - CH.FEE)) * (CH.priceOn(world.SPY, CH.dayOf('2008-03-17')) / CH.priceOn(world.SPY, CH.dayOf('2007-10-09')));
  assert(Math.abs(G.value - exp) < 1e-6, 'valeur = capital net de frais x variation');
  assert(Math.abs(r.fee - 100) < 1e-9, 'frais de 0,1 % sur 100 000 $');
  assert(Math.abs(r.assetRet.SPY - (CH.priceOn(world.SPY, CH.dayOf('2008-03-17')) / CH.priceOn(world.SPY, CH.dayOf('2007-10-09')) - 1)) < 1e-12);
  assert(Math.abs(G.w.SPY - 1) < 1e-9 && Object.keys(G.w).every((k) => k === 'SPY' || G.w[k] === 0));
  assert.throws(() => CH.advance(world, c.ids, CH.start(), 1, 2, { SPY: 0.7, TLT: 0.4 }), /100 %/);
  ok('un seul placement : valeur, frais, rendement par actif, poids, refus au-delà de 100 %');
}
{
  const c = DATA[1], world = worldOf(c), G = CH.start(), D = c.steps.map((s) => s.date).concat(c.end.date);
  CH.advance(world, c.ids, G, CH.dayOf(D[0]), CH.dayOf(D[1]), { SPY: 0.5, TLT: 0.3 });
  const keep = { ...G.w };
  const before = G.fees;
  const r = CH.advance(world, c.ids, G, CH.dayOf(D[1]), CH.dayOf(D[2]), keep);
  assert(r.fee < 1e-6 && Math.abs(G.fees - before) < 1e-6, 'garder la répartition dérivée ne coûte rien');
  const days = G.path.map((p) => p.d);
  for (let i = 1; i < days.length; i++) assert(days[i] > days[i - 1], 'chemin chronologique');
  assert(G.dd <= 0 && G.dd > -1);
  assert(G.bench && G.bench.dd <= 0);
  ok('garder la répartition est gratuit, chemin chronologique, pertes maximales bornées');
}
{
  // le 60/40 rééquilibré à chaque étape reste proche du passif : note de milieu de tableau
  for (const c of DATA) {
    const { G, journal } = run(c, { SPY: 0.6, TLT: 0.4 });
    const g = CH.grade(G, journal);
    assert(Math.abs(g.ret - g.bRet) < 0.08, c.id + ' : 60/40 rééquilibré proche du passif');
    assert(g.score >= 55 && g.score <= 90, `${c.id} : note du 60/40 ${g.score}`);
    assert(!g.timid && g.conc === 0);
  }
  ok('un 60/40 rééquilibré obtient une note de milieu de tableau');
}
{
  const c = DATA.find((x) => x.id === 'crypto17');
  const hold = run(c, { BTC_USD: 1 }), g = CH.grade(hold.G, hold.journal);
  assert.equal(g.conc, c.steps.length, 'tout en bitcoin à chaque étape : concentration');
  assert(g.parts.disc === 0);
  assert(g.score < 70);
  // sortir de la crypto à l'étape du sommet bat le tout-en-bitcoin
  const smart = run(c, (i) => (i <= 1 ? { BTC_USD: 0.4, SPY: 0.3, TLT: 0.3 } : { SPY: 0.5, TLT: 0.3, GLD: 0.2 }));
  assert(smart.G.value > hold.G.value, 'réduire le bitcoin au sommet protège le capital');
  const gs = CH.grade(smart.G, smart.journal);
  assert(gs.score > g.score);
  ok('la concentration est sanctionnée et la prudence récompensée (bitcoin)');
}
{
  const c = DATA.find((x) => x.id === 'credit08');
  const crash = run(c, (i) => (i < 2 ? { SPY: 0.6, TLT: 0.4 } : { TLT: 0.6, GLD: 0.2 }));
  const bull = run(c, { SPY: 0.6, JPM: 0.4 });
  assert(CH.grade(crash.G, crash.journal).score > CH.grade(bull.G, bull.journal).score);
  ok('2008 : se protéger avant Lehman est mieux noté que rester offensif');
}
{
  const G = { value: 150000, dd: -0.05, bench: { value: 110000, dd: -0.2 } };
  const g = CH.grade(G, [{ target: { SPY: 0.6, TLT: 0.4 } }]);
  assert.equal(g.grade, 'A'); assert(g.score >= 80);
  const bad = CH.grade({ value: 60000, dd: -0.5, bench: { value: 100000, dd: -0.1 } }, [{ target: { SPY: 1 } }]);
  assert.equal(bad.grade, 'E');
  assert.equal(CH.GRADES[CH.GRADES.length - 1][0], 0);
  ok('barème : battre le passif avec moins de risque donne A, la déroute donne E');
}
console.log('  ' + n + ' groupes des chroniques réussis');
