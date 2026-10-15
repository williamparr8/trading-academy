import fs from 'node:fs';
const f = 'trading/js/engine.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 80)); s = s.replace(a, () => b); };

// 1) buildGame : mode Live = vrais prix (multipliés par une puissance de 10), pas de rebase à 100
rep(`  TA.buildGame = function (data, plan, style, length) {`, `  // Mode Live : échelle en puissance de 10 qui ramène le prix entre 100 et 1000 (quantités entières, prix réel = prix ÷ k).
  TA.liveScale = (price) => Math.pow(10, Math.ceil(Math.log10(100 / price)));
  // opts.live = { k } : on garde les vrais prix (× k) au lieu de ramener le prix de départ à 100.
  TA.buildGame = function (data, plan, style, length, opts) {
    const live = opts && opts.live ? opts.live : null;`);
rep(`    const k = CFG.BASE_PRICE / raw.c[startIdx];`, `    const k = live ? live.k : CFG.BASE_PRICE / raw.c[startIdx];`);
rep(`      market: data.mk || 'stock',
      style, unit: u.unit,`, `      market: data.mk || 'stock', live: live ? { k: live.k } : null,
      style, unit: u.unit,`);

// 2) un compte Live ne compte pas dans la progression de niveau
rep(`    else if (info.replay) out.why = 'Partie rejouée : tu connais déjà la suite, elle ne compte pas.';`, `    else if (info.live) out.why = 'Compte Live : il ne compte pas dans ta progression de niveau.';
    else if (info.replay) out.why = 'Partie rejouée : tu connais déjà la suite, elle ne compte pas.';`);

// 3) codes de défi complets : CODE + marché, scénario, style, durée
rep(`  // Choisit l'actif et la date de départ à partir du code (même code = même partie).`, `  // Code de défi complet « ABCD-2345-A0S1 » : le code de partie suivi de A/F/C (actions, forex, crypto), du rang du scénario,
  // de S/L (swing, long terme) et du rang de la durée. Il reproduit exactement la même partie chez un ami.
  // Le rang des scénarios est celui de TA.SCENARIOS : on n'y ajoute que des scénarios à la fin.
  const CH_MARKETS = { stock: 'A', forex: 'F', crypto: 'C' };
  TA.makeChallenge = (code, market, scenarioId, style, lenIdx) =>
    \`\${code}-\${CH_MARKETS[market] || 'A'}\${Math.max(0, TA.SCENARIOS.findIndex((s) => s.id === scenarioId))}\${style === 'long' ? 'L' : 'S'}\${lenIdx | 0}\`;
  TA.parseChallenge = function (text) {
    const t = String(text || '').toUpperCase().replace(/\s+/g, '');
    const m = /^([A-Z0-9]{4})-?([A-Z0-9]{4})(?:-?([AFC])(\d)([SL])(\d))?$/.exec(t);
    if (!m) return null;
    const out = { code: m[1] + '-' + m[2], full: false };
    if (m[3]) {
      const market = Object.keys(CH_MARKETS).find((k) => CH_MARKETS[k] === m[3]), sc = TA.SCENARIOS[+m[4]], len = +m[6];
      if (!sc || !TA.scenariosFor(market).some((x) => x.id === sc.id) || len > 2) return null;
      Object.assign(out, { full: true, market, scenarioId: sc.id, style: m[5] === 'L' ? 'long' : 'swing', lenIdx: len });
    }
    return out;
  };

  // Choisit l'actif et la date de départ à partir du code (même code = même partie).`);
fs.writeFileSync(f, s);
console.log('ok');
