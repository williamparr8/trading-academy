/* Trading Academy — ligue hebdomadaire contre des rivaux fictifs.
   Chaque semaine (du lundi au dimanche), tu es classé selon tes points d'expérience contre sept rivaux simulés.
   Les trois premiers montent d'une ligue, les deux derniers descendent. Les rivaux n'existent pas : leur rythme est
   calculé de façon déterministe à partir de la semaine et de la ligue, donc le classement est stable et honnête.
   Données locales (clé ta:league). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const LG = (TA.LEAGUE = {});

  LG.TIERS = ['Bronze', 'Argent', 'Or', 'Saphir', 'Diamant'];
  LG.ICONS = ['🥉', '🥈', '🥇', '💠', '💎'];
  LG.BASE = [140, 230, 340, 480, 660];     // points hebdomadaires typiques d'un rival, par ligue
  LG.SIZE = 8; LG.UP = 3; LG.DOWN = 2;     // joueurs par ligue, places de promotion, places de relégation
  LG.RIVALS = [
    { n: 'Léa Tremblay', ico: '🦉', s: 'Prudente : la régularité avant tout', k: 1.0 },
    { n: 'Max Gauthier', ico: '🐯', s: 'Impulsif : gros jours, puis pause', k: 1.05, burst: true },
    { n: 'Kim Nguyen', ico: '🤖', s: 'Quantitative : cadence parfaite', k: 1.0, steady: true },
    { n: 'Sofia Rossi', ico: '🦊', s: 'Value : lente mais sûre', k: 0.9 },
    { n: 'Hugo Lavoie', ico: '🚀', s: 'Momentum : accélère en fin de semaine', k: 1.1, late: true },
    { n: 'Camille Roy', ico: '🐢', s: 'Dividendes : peu de bruit', k: 0.8 },
    { n: 'Noah Pelletier', ico: '⚡', s: 'Scalpeur : hyperactif', k: 1.2 },
    { n: 'Inès Haddad', ico: '🧭', s: 'Macro : suit les grandes tendances', k: 1.0 },
    { n: 'Théo Fortin', ico: '🦈', s: 'Contrarien : fort la fin de semaine', k: 0.95, weekend: true },
    { n: 'Maya Singh', ico: '🌙', s: 'Nocturne : joue tard', k: 1.0 },
    { n: 'Olivier Côté', ico: '🎯', s: 'Discipliné : objectifs quotidiens', k: 1.05, steady: true },
    { n: 'Zoé Martin', ico: '🧪', s: 'Expérimentatrice : teste tout', k: 0.95 },
    { n: 'Samuel Bouchard', ico: '🏔️', s: 'Long terme : patient', k: 0.85 },
    { n: 'Nadia Belkacem', ico: '🔥', s: 'Série de trente jours', k: 1.15 },
  ];

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pad = (n) => String(n).padStart(2, '0');
  LG.addDays = (day, n) => { const [y, m, d] = String(day).split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); };

  // les sept rivaux de la semaine dans une ligue, avec leur poids par jour et leur total
  LG.field = (week, tier) => {
    const r = mulberry(hash('LG|' + week + '|' + tier));
    const pool = LG.RIVALS.map((x, i) => ({ x, o: r() + i * 1e-6 })).sort((a, b) => a.o - b.o).slice(0, LG.SIZE - 1).map((p) => p.x);
    return pool.map((x) => {
      const rr = mulberry(hash('RV|' + x.n + '|' + week + '|' + tier));
      const total = LG.BASE[tier] * x.k * (0.6 + 0.8 * rr());
      let w = [];
      for (let d = 0; d < 7; d++) {
        let v = 0.5 + rr();
        if (x.steady) v = 1;
        if (x.burst) v = rr() < 0.35 ? 2.5 + rr() : 0.12;
        if (x.late) v *= 0.4 + d * 0.25;
        if (x.weekend) v *= d >= 5 ? 2.2 : 0.6;
        w.push(v);
      }
      const sum = w.reduce((a, b) => a + b, 0);
      w = w.map((v) => v / sum);
      return { n: x.n, ico: x.ico, s: x.s, total: Math.round(total), w };
    });
  };
  // points d'un rival après `elapsed` jours (0 à 7, fractionnaire) : l'activité d'une journée se concentre entre 8 h et 22 h
  LG.xpAt = (rv, elapsed) => {
    const e = Math.min(7, Math.max(0, elapsed));
    if (e >= 7) return rv.total;
    const d = Math.floor(e), f = e - d;
    let acc = 0;
    for (let i = 0; i < d; i++) acc += rv.w[i];
    acc += rv.w[d] * Math.min(1, Math.max(0, (f * 24 - 8) / 14));
    return Math.round(rv.total * acc);
  };
  // classement : le joueur perd les égalités
  LG.standings = (week, tier, playerXp, elapsed, name = 'Toi') => {
    const rows = LG.field(week, tier).map((r) => ({ n: r.n, ico: r.ico, s: r.s, xp: LG.xpAt(r, elapsed), me: false }));
    rows.push({ n: name, ico: '🧑‍🎓', s: '', xp: Math.max(0, Math.round(playerXp)), me: true });
    rows.sort((a, b) => b.xp - a.xp || (a.me ? 1 : 0) - (b.me ? 1 : 0) || (a.n < b.n ? -1 : 1));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  };
  // verdict de fin de semaine
  LG.verdict = (rank, xp, tier) => {
    if (xp > 0 && rank <= LG.UP && tier < LG.TIERS.length - 1) return 'up';
    if ((rank > LG.SIZE - LG.DOWN || xp === 0) && tier > 0) return 'down';
    return 'stay';
  };
  const fresh = (week) => ({ v: 1, tier: 0, settled: LG.addDays(week, -7), hist: [] });
  LG.clean = (s, week) => {
    const out = fresh(week);
    if (!s || s.v !== 1) return out;
    if (Number.isInteger(s.tier) && s.tier >= 0 && s.tier < LG.TIERS.length) out.tier = s.tier;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.settled || '')) out.settled = s.settled;
    if (Array.isArray(s.hist)) out.hist = s.hist.filter((h) => h && typeof h.week === 'string' && Number.isInteger(h.rank) && Number.isInteger(h.tier)).slice(0, 12).map((h) => ({ week: h.week, tier: h.tier, rank: h.rank, xp: Math.max(0, h.xp | 0), res: ['up', 'down', 'stay'].includes(h.res) ? h.res : 'stay' }));
    return out;
  };
  // règle les semaines terminées : xpOf(week) donne les points du joueur (0 si inactif) ; renvoie la liste des semaines réglées
  LG.settle = (lg, currentWeek, xpOf) => {
    const done = [];
    let w = LG.addDays(lg.settled, 7), guard = 0;
    while (w < currentWeek && guard++ < 12) {
      const xp = xpOf(w) || 0, rows = LG.standings(w, lg.tier, xp, 7), me = rows.find((r) => r.me);
      const res = LG.verdict(me.rank, xp, lg.tier);
      const h = { week: w, tier: lg.tier, rank: me.rank, xp, res };
      lg.hist.unshift(h); done.push(h);
      if (res === 'up') lg.tier++; else if (res === 'down') lg.tier--;
      lg.settled = w;
      w = LG.addDays(w, 7);
    }
    lg.hist = lg.hist.slice(0, 12);
    return done;
  };

  if (typeof document === 'undefined') return;
  /* ---------- interface ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'ta:league';
  const CR = () => TA.CAREER;
  const weekNow = () => CR().weekStart();
  const load = () => { try { return LG.clean(JSON.parse(localStorage.getItem(KEY)), weekNow()); } catch (e) { return fresh(weekNow()); } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* rien */ } };
  // jours écoulés depuis le lundi 0 h (heure locale)
  const elapsedDays = () => { const n = new Date(), [y, m, d] = weekNow().split('-').map(Number); return (n.getTime() - new Date(y, m - 1, d).getTime()) / 86400000; };
  const xpOfWeek = (st) => (w) => (st.wk && st.wk.week === w ? st.wk.xp : st.wkPrev && st.wkPrev.week === w ? st.wkPrev.xp : 0);
  const fmtWeek = (w) => { const [y, m, d] = w.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }); };
  const ord = (n) => (n === 1 ? '1ᵉʳ' : n + 'ᵉ');
  let lastSettled = [];

  function render() {
    const box = $('#league-card');
    if (!box || !CR()) return;
    const st = CR().state(), wk = weekNow();
    const lg = load();
    const done = LG.settle(lg, wk, xpOfWeek(st));
    if (done.length) {
      save(lg); lastSettled = done;
      try {
        if (done.some((h) => h.res === 'up') && CR().giveBadge) CR().giveBadge('leaguePromo');
        if (lg.tier >= LG.TIERS.length - 1 && CR().giveBadge) CR().giveBadge('leagueTop');
      } catch (e) { /* rien */ }
    }
    const xp = st.wk && st.wk.week === wk ? st.wk.xp : 0;
    const rows = LG.standings(wk, lg.tier, xp, elapsedDays());
    const left = Math.max(1, Math.ceil(7 - elapsedDays()));
    const last = lg.hist[0];
    const lastTxt = last ? `Semaine du ${fmtWeek(last.week)} : ${ord(last.rank)} en ${LG.TIERS[last.tier]}, ${last.res === 'up' ? 'promotion en ' + LG.TIERS[Math.min(LG.TIERS.length - 1, last.tier + 1)] : last.res === 'down' ? 'relégation en ' + LG.TIERS[Math.max(0, last.tier - 1)] : 'maintien'}.` : '';
    box.innerHTML = `<h2>Ligue ${LG.ICONS[lg.tier]} ${LG.TIERS[lg.tier]} <span class="tag soon">${left} j restant${left > 1 ? 's' : ''}</span></h2>
      <p class="hint">Les ${LG.UP} premiers montent${lg.tier === 0 ? '' : ', les ' + LG.DOWN + ' derniers descendent'}. Classement aux points d’expérience de la semaine du ${fmtWeek(wk)}.</p>
      <div class="lg-list">${rows.map((r) => `<div class="lg-row${r.me ? ' me' : ''}${r.rank <= LG.UP && lg.tier < LG.TIERS.length - 1 ? ' up' : r.rank > LG.SIZE - LG.DOWN && lg.tier > 0 ? ' down' : ''}"${r.s ? ` title="${esc(r.s)}"` : ''}><span class="lg-rk">${r.rank}</span><span class="lg-av">${r.ico}</span><span class="lg-nm">${esc(r.n)}</span><span class="lg-xp">${r.xp} XP</span></div>`).join('')}</div>
      ${lastTxt ? `<p class="fine">${esc(lastTxt)}</p>` : '<p class="fine">Joue pour gagner des points : ta première semaine est en cours.</p>'}`;
  }
  LG.render = render;

  function mount() {
    if ($('#league-card')) return;
    const stack = $('.side-stack'), career = $('#career-card');
    if (!stack) return;
    const card = document.createElement('section');
    card.className = 'card'; card.id = 'league-card'; card.setAttribute('aria-label', 'Ligue');
    if (career && career.parentNode === stack) stack.insertBefore(card, career.nextSibling); else stack.appendChild(card);
  }
  mount();
  render();
  window.addEventListener('ta:xp', () => setTimeout(render, 40));
  try {
    const home = $('#screen-home');
    if (home) new MutationObserver(() => { if (!home.hidden) render(); }).observe(home, { attributes: true, attributeFilter: ['hidden'] });
  } catch (e) { /* rien */ }
  LG.lastSettled = () => lastSettled;
})(typeof window !== 'undefined' ? window : globalThis);
