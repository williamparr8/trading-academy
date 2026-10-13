/* Trading Academy — classement partagé : lignes publiées, assainissement, tri et filtres (fonctions pures).
   Une ligne = une partie terminée d'un joueur. Rien qui révèle l'actif ni les dates réelles d'une partie d'entraînement :
   un code de défi n'en dit pas plus que ce que son auteur en a déjà dit à ses amis. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const TA = (root.TA = root.TA || {});
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const MODES = ['train', 'live'];

  // Construit le document à publier à partir d'une partie terminée.
  TA.boardRow = function (cfg, st, sum, pseudo, uid, challenge) {
    return {
      v: 1, uid: String(uid).slice(0, 64), pseudo: String(pseudo || 'Anonyme').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Anonyme',
      mode: cfg.mode === 'live' ? 'live' : 'train', market: cfg.market || 'stock', scenario: cfg.mode === 'live' ? 'live' : cfg.scenario, style: cfg.style, lenIdx: cfg.lenIdx | 0,
      level: st.level || 1, rules: st.rules.id, lev: st.maxLev || 1, code: challenge || cfg.code,
      ret: sum.retPct, sharpe: sum.sharpe == null ? null : sum.sharpe, dd: sum.maxDD, trades: sum.trades, winRate: sum.winRate == null ? null : sum.winRate, bh: sum.bh,
      bars: sum.bars, at: Date.now(),
    };
  };

  // Ce que les autres joueurs ont écrit est une donnée non fiable : on reconstruit une ligne propre ou on la rejette.
  TA.cleanBoardRow = function (id, raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    if (!num(raw.ret) || !num(raw.dd) || !num(raw.at) || !Number.isInteger(raw.trades)) return null;
    const market = ['stock', 'forex', 'crypto'].includes(raw.market) ? raw.market : 'stock';
    const sc = raw.scenario === 'live' || (TA.SCENARIOS || []).some((s) => s.id === raw.scenario) ? raw.scenario : 'random';
    return {
      id: String(id).slice(0, 120), uid: String(raw.uid || '').slice(0, 64),
      pseudo: String(raw.pseudo || 'Anonyme').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Anonyme',
      mode: MODES.includes(raw.mode) ? raw.mode : 'train', market, scenario: sc, style: raw.style === 'long' ? 'long' : 'swing', lenIdx: clamp(raw.lenIdx | 0, 0, 2),
      level: clamp(raw.level | 0, 1, 4), rules: String(raw.rules || '').slice(0, 10), lev: clamp(raw.lev | 0, 1, 30),
      code: String(raw.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20),
      ret: clamp(raw.ret, -1, 100), sharpe: num(raw.sharpe) ? clamp(raw.sharpe, -50, 50) : null, dd: clamp(raw.dd, -1, 0), trades: clamp(raw.trades, 0, 100000),
      winRate: num(raw.winRate) ? clamp(raw.winRate, 0, 1) : null, bh: num(raw.bh) ? clamp(raw.bh, -1, 1000) : null, bars: clamp(raw.bars | 0, 0, 100000), at: raw.at,
    };
  };

  // Filtres : { code, market, mode, pseudo, scenario } ; chaîne vide ou 'all' = pas de filtre.
  TA.boardFilter = function (rows, f) {
    f = f || {};
    const q = String(f.code || '').trim();
    const ch = q ? TA.parseChallenge(q) : null, text = q.toUpperCase().replace(/\s+/g, '');
    return rows.filter((r) => {
      if (f.market && f.market !== 'all' && r.market !== f.market) return false;
      if (f.mode && f.mode !== 'all' && r.mode !== f.mode) return false;
      if (f.pseudo && f.pseudo !== 'all' && r.pseudo !== f.pseudo) return false;
      if (f.scenario && f.scenario !== 'all' && r.scenario !== f.scenario) return false;
      if (q) {
        if (ch && ch.full) return r.code === TA.makeChallenge(ch.code, ch.market, ch.scenarioId, ch.style, ch.lenIdx);
        if (ch) return r.code.startsWith(ch.code);
        return r.code.includes(text);
      }
      return true;
    });
  };

  // Tri : les valeurs absentes passent toujours en dernier ; pour le drawdown, « meilleur » = moins négatif.
  TA.boardSort = function (rows, key, dir) {
    const sgn = dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const x = a[key], y = b[key];
      if (x == null && y == null) return b.at - a.at;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y;
      return c !== 0 ? sgn * c : b.at - a.at;
    });
  };
})();
