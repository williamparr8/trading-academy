/* Trading Academy — carrière : points d'expérience, grades, série de jours, défis du jour et badges.
   Les modules (partie, gestionnaire, saison des résultats, flash, quiz) émettent l'événement « ta:xp » ; ce fichier
   les convertit en progression. Tout est local au navigateur (clé ta:career). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CR = (TA.CAREER = {});

  CR.RANKS = [
    { xp: 0, name: 'Stagiaire' }, { xp: 150, name: 'Analyste junior' }, { xp: 400, name: 'Analyste' }, { xp: 900, name: 'Analyste principal' },
    { xp: 1700, name: 'Gestionnaire associé' }, { xp: 2800, name: 'Gestionnaire' }, { xp: 4500, name: 'Directeur des placements' },
    { xp: 7000, name: 'Chef de la gestion' }, { xp: 10000, name: 'Légende du marché' },
  ];
  CR.BADGES = [
    { id: 'first', name: 'Premier trade', desc: 'Termine une partie de trading.' },
    { id: 'beat', name: 'Meilleur que l’acheter-conserver', desc: 'Bats le rendement de l’actif sur une partie.' },
    { id: 'discipline', name: 'Discipliné', desc: 'Termine une partie qui remplit tous les critères de discipline.' },
    { id: 'crisis', name: 'Survivant des crises', desc: 'Finis en gain un scénario de krach ou de pandémie.' },
    { id: 'pm1', name: 'Gestionnaire', desc: 'Termine un mandat de gestion de portefeuille.' },
    { id: 'pmA', name: 'Mandat noté A', desc: 'Obtiens la note A à un mandat.' },
    { id: 'pmClean', name: 'Politique respectée', desc: 'Termine un mandat sans aucun dépassement de contrainte.' },
    { id: 'fund1', name: 'Analyste', desc: 'Termine une saison des résultats.' },
    { id: 'trap', name: 'Flair comptable', desc: 'Évite l’exposition aux sociétés à comptabilité agressive pendant une saison.' },
    { id: 'oracle', name: 'Oracle du consensus', desc: 'Au moins 60 % de bonnes prédictions de résultats (6 prédictions ou plus).' },
    { id: 'flash1', name: 'Éclair', desc: 'Termine une séance de Flash technique.' },
    { id: 'flashPos', name: 'Œil technique', desc: 'Finis une séance Flash en gain de plus de 5 R.' },
    { id: 'quiz3', name: 'Étudiant assidu', desc: 'Réussis trois quiz de leçons.' },
    { id: 'quizAll', name: 'Diplômé', desc: 'Réussis tous les quiz de leçons.' },
    { id: 'streak3', name: 'Trois jours de suite', desc: 'Joue trois jours consécutifs.' },
    { id: 'streak7', name: 'Une semaine de suite', desc: 'Joue sept jours consécutifs.' },
    { id: 'pattern1', name: 'Œil de chartiste', desc: 'Termine une Chasse aux figures.' },
    { id: 'patternAce', name: 'Sans faute chartiste', desc: 'Au moins 9 figures sur 10 reconnues.' },
    { id: 'boss', name: 'Boss de la semaine', desc: 'Obtiens au moins B au mandat de crise de la semaine.' },
    { id: 'all', name: 'Touche-à-tout', desc: 'Termine une séance de chaque mode : partie, mandat, saison et flash.' },
  ];

  const KEY = 'ta:career';
  const blank = () => ({ v: 1, xp: 0, days: { last: null, streak: 0, best: 0 }, daily: { date: null, done: {} }, badges: {}, stats: { game: 0, pm: 0, fund: 0, flash: 0, quiz: 0 }, quizPass: {}, log: [] });
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yesterday = () => { const d = new Date(Date.now() - 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  CR.today = today;
  // lundi de la semaine en cours : le « boss » de la semaine est le même pour tous
  CR.weekStart = (d = new Date()) => { const day = (d.getDay() + 6) % 7, m = new Date(d.getTime() - day * 86400000); return m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0'); };
  CR.weekCode = () => CR.dayCode(CR.weekStart(), 'PM');
  CR.state = () => { const s = store.get(); return s && s.v === 1 ? { ...blank(), ...s } : blank(); };

  CR.rankOf = (xp) => {
    let i = 0;
    for (let k = 0; k < CR.RANKS.length; k++) if (xp >= CR.RANKS[k].xp) i = k;
    const cur = CR.RANKS[i], next = CR.RANKS[i + 1] || null;
    return { i, name: cur.name, xp, from: cur.xp, to: next ? next.xp : null, next: next ? next.name : null, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
  };
  // code du défi du jour : le même pour tout le monde à une date donnée
  CR.dayCode = (date = today(), prefix = 'FL') => {
    let h = 2166136261;
    for (const ch of prefix + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h >>>= 0;
    const a = h.toString(36).toUpperCase().padStart(8, '0').slice(-8);
    return `${prefix}-${a.slice(0, 4)}-${a.slice(4)}`;
  };

  // XP d'un événement : { xp, reasons[], badges[] }
  CR.award = function (e, st) {
    const out = { xp: 0, why: [], badges: [] };
    const add = (n, t) => { if (n > 0) { out.xp += Math.round(n); out.why.push(t); } };
    const gradeBonus = { A: 100, B: 70, C: 40, D: 20, E: 5 };
    if (e.kind === 'game') {
      const f = e.replay ? 0.3 : 1;
      add(20 * f, 'partie terminée');
      if (e.counted && e.passed) add(40 * f, 'partie disciplinée');
      if (e.ret > e.bh) add(15 * f, 'meilleur que l’acheter-conserver');
      if (e.dd != null && e.dd > -0.1) add(10 * f, 'perte maximale sous 10 %');
      out.badges.push('first');
      if (e.ret > e.bh && e.trades > 0) out.badges.push('beat');
      if (e.counted && e.passed) out.badges.push('discipline');
      if (['crisis', 'gfc', 'covid', 'rates', 'crash22', 'winter18'].includes(String(e.scenario || '')) && e.ret > 0) out.badges.push('crisis');
    } else if (e.kind === 'pm') {
      add(30, 'mandat terminé'); add(gradeBonus[e.grade] || 0, `note ${e.grade}`);
      if (e.monthsBad === 0) { add(20, 'aucune contrainte dépassée'); out.badges.push('pmClean'); }
      out.badges.push('pm1'); if (e.grade === 'A') out.badges.push('pmA');
    } else if (e.kind === 'fund') {
      add(30, 'saison terminée'); add(gradeBonus[e.grade] || 0, `note ${e.grade}`);
      if (e.accuracy != null) add(e.accuracy * 40, 'justesse des prédictions');
      if (e.avoided > 0) { add(30, 'piège comptable évité'); out.badges.push('trap'); }
      out.badges.push('fund1');
      if (e.accuracy != null && e.accuracy >= 0.6 && e.predictions >= 6) out.badges.push('oracle');
    } else if (e.kind === 'flash') {
      add(20, 'séance terminée'); add(Math.min(60, Math.max(0, e.total) * 5), 'résultat en R');
      if (e.taken && e.wins / e.taken >= 0.5) add(10, 'plus de la moitié de réussite');
      out.badges.push('flash1'); if (e.total >= 5) out.badges.push('flashPos');
    } else if (e.kind === 'pattern') {
      add(15 + e.right * 4, `${e.right} figures sur ${e.total}`);
      out.badges.push('pattern1'); if (e.right >= 9) out.badges.push('patternAce');
    } else if (e.kind === 'quiz') {
      const first = !st.quizPass[e.id];
      if (e.score / e.total >= 0.75) { add(first ? 15 : 3, first ? 'quiz réussi' : 'quiz refait'); }
      else add(3, 'quiz tenté');
    }
    return out;
  };

  CR.apply = function (e) {
    const st = CR.state(), now = today();
    const before = CR.rankOf(st.xp);
    // série de jours
    if (st.days.last !== now) {
      st.days.streak = st.days.last === yesterday() ? st.days.streak + 1 : 1;
      st.days.last = now; st.days.best = Math.max(st.days.best, st.days.streak);
    }
    if (st.daily.date !== now) st.daily = { date: now, done: {} };
    const a = CR.award(e, st);
    // objectifs du jour : bonus unique par objectif
    const mode = e.kind === 'game' ? 'trade' : e.kind;
    if (e.kind === 'flash' && e.code === CR.dayCode(now, 'FL') && !st.daily.done.flash) { st.daily.done.flash = true; a.xp += 40; a.why.push('défi du jour : Flash'); }
    if (e.kind === 'pm' && e.code === CR.weekCode() && (!st.weekly || st.weekly.week !== CR.weekStart())) {
      st.weekly = { week: CR.weekStart(), grade: e.grade };
      const bonus = ['A', 'B', 'C'].includes(e.grade) ? 80 : 20;
      a.xp += bonus; a.why.push('boss de la semaine');
      if (['A', 'B'].includes(e.grade)) a.badges.push('boss');
    }
    if ((e.kind === 'pm' || e.kind === 'fund') && !st.daily.done.manager) { st.daily.done.manager = true; a.xp += 30; a.why.push('objectif du jour : gestion'); }
    if ((e.kind === 'quiz' || e.kind === 'game') && !st.daily.done.learn) { st.daily.done.learn = true; a.xp += 15; a.why.push('objectif du jour : apprendre ou jouer'); }
    if (a.xp > 0 && st.days.streak >= 2) { const b = Math.min(20, 5 * st.days.streak); a.xp += b; a.why.push(`série de ${st.days.streak} jours`); }
    st.xp += a.xp;
    const key = e.kind === 'game' ? 'game' : e.kind;
    st.stats[key] = (st.stats[key] || 0) + 1;
    if (e.kind === 'quiz' && e.score / e.total >= 0.75) st.quizPass[e.id] = true;
    // badges
    const got = [];
    const give = (id) => { if (!st.badges[id]) { st.badges[id] = now; got.push(id); } };
    a.badges.forEach(give);
    const passN = Object.keys(st.quizPass).length;
    if (passN >= 3) give('quiz3');
    const total = (TA.LESSONS || []).length;
    if (total && (TA.LESSONS || []).every((l) => st.quizPass[l.id])) give('quizAll');
    if (st.days.streak >= 3) give('streak3');
    if (st.days.streak >= 7) give('streak7');
    if (st.stats.game && st.stats.pm && st.stats.fund && st.stats.flash) give('all');
    void mode;
    st.log = [{ t: now, kind: e.kind, xp: a.xp, why: a.why }, ...(st.log || [])].slice(0, 20);
    store.set(st);
    const after = CR.rankOf(st.xp);
    return { xp: a.xp, why: a.why, badges: got, rank: after, promoted: after.i > before.i, streak: st.days.streak };
  };

  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = new Intl.NumberFormat('fr-CA');
  const now0 = () => today();

  function toast(res) {
    let box = $('#xp-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'xp-toasts'; box.className = 'xp-toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'xp-toast';
    const bn = res.badges.map((id) => (CR.BADGES.find((b) => b.id === id) || {}).name).filter(Boolean);
    el.innerHTML = `<b>+${res.xp} XP</b> <span>${esc(res.why.slice(0, 3).join(' · '))}</span>${res.promoted ? `<div class="up">Nouveau grade : ${esc(res.rank.name)}</div>` : ''}${bn.length ? `<div class="bd">Badge : ${esc(bn.join(', '))}</div>` : ''}`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, res.promoted || bn.length ? 7000 : 4500);
  }
  // parcours recommandé : la prochaine étape non faite met l'apprenant sur la bonne voie
  function path(st) {
    let prefs = null;
    try { prefs = JSON.parse(localStorage.getItem('ta:prefs')); } catch (e) { /* rien */ }
    const tuto = (prefs && prefs.tuto) || {};
    const q = (id) => !!st.quizPass[id];
    return [
      { t: 'Tutoriel : ton premier trade', done: !!tuto.basics, go: () => { const b = document.querySelector('[data-tuto="start"][data-mod="basics"]'); if (b) b.click(); } },
      { t: 'Leçon : lire les chandeliers', done: q('candles'), go: () => lesson('candles') },
      { t: 'Ta première partie', done: st.stats.game >= 1, go: () => scrollTo('setup') },
      { t: 'Une séance de Flash technique', done: st.stats.flash >= 1, go: () => scrollTo('flash-card') },
      { t: 'Leçon : lire les états financiers', done: q('statements'), go: () => lesson('statements') },
      { t: 'Une saison des résultats', done: st.stats.fund >= 1, go: () => scrollTo('fund-card') },
      { t: 'Leçon : l’énoncé de politique', done: q('ips'), go: () => lesson('ips') },
      { t: 'Un mandat de gestion', done: st.stats.pm >= 1, go: () => scrollTo('pm-card') },
      { t: 'Leçon : mesurer la performance', done: q('metrics'), go: () => lesson('metrics') },
      { t: 'Une partie disciplinée', done: !!st.badges.discipline, go: () => scrollTo('setup') },
    ];
  }
  const scrollTo = (id) => {
    const hm = { setup: 'trade', 'flash-card': 'tech', 'fund-card': 'fund', 'pm-card': 'pm' }[id];
    if (hm) { const b = document.querySelector('[data-hmode="' + hm + '"]'); if (b) b.click(); }
    const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const lesson = (id) => { const hb = document.querySelector('[data-hmode="learn"]'); if (hb) hb.click(); const b = document.querySelector('[data-lesson="' + id + '"]'); if (b) b.click(); else { const o = document.getElementById('learn-open'); if (o) o.click(); } };
  let pathCache = [];
  function renderCard() {
    const box = $('#career-card');
    if (!box) return;
    const st = CR.state(), r = CR.rankOf(st.xp), now = today(), done = st.daily.date === now ? { ...st.daily.done } : {};
    if (st.weekly && st.weekly.week === CR.weekStart()) done.weekly = true;
    const live = st.days.last === now || st.days.last === yesterday() ? st.days.streak : 0;
    const pth = path(st), nextI = pth.findIndex((x) => !x.done);
    pathCache = pth;
    const goals = [
      ['weekly', 'Boss de la semaine : retraitée en pleine crise de 2008', 'wk', 80],
      ['flash', 'Défi du jour : Flash technique', 'fl', 40], ['manager', 'Le mandat ou la saison du jour', 'mgr', 30], ['learn', 'Une partie ou un quiz', null, 15],
    ].map(([k, t, a, xp]) => `<li class="${done[k] ? 'ok' : ''}"><span class="ic">${done[k] ? '✓' : '○'}</span><span>${esc(t)} <small>+${xp} XP</small></span>${a === 'fl' && !done[k] ? '<button class="btn sm" type="button" data-career="daily">Jouer</button>' : a === 'mgr' && !done[k] ? '<button class="btn sm" type="button" data-career="mgr">Jouer</button>' : a === 'wk' && !done[k] ? '<button class="btn sm" type="button" data-career="wk">Jouer</button>' : ''}</li>`).join('');
    const badges = CR.BADGES.map((b) => `<span class="cr-badge ${st.badges[b.id] ? 'on' : ''}" title="${esc(b.name)} : ${esc(b.desc)}${st.badges[b.id] ? ' (obtenu le ' + esc(st.badges[b.id]) + ')' : ''}">${esc(b.name)}</span>`).join('');
    box.innerHTML = `<h2>Ta carrière</h2>
      <div class="cr-top"><div><b class="cr-rank">${esc(r.name)}</b><small>${nf.format(st.xp)} XP${r.next ? ` · prochain grade : ${esc(r.next)} à ${nf.format(r.to)}` : ' · grade maximal'}</small></div><div class="cr-streak" title="Jours consécutifs"><b>${live}</b><small>jour${live > 1 ? 's' : ''} de suite</small></div></div>
      <div class="prog"><i style="width:${Math.round(r.pct * 100)}%"></i></div>
      ${nextI >= 0 ? `<div class="cr-next"><span>Prochaine étape</span><b>${esc(pth[nextI].t)}</b><button class="btn sm primary" type="button" data-career="path" data-i="${nextI}">Y aller</button></div>` : ""}<details class="cr-det"><summary>Parcours recommandé · ${pth.filter((x) => x.done).length} sur ${pth.length}</summary><ul class="cr-goals cr-path">${pth.map((x, i) => `<li class="${x.done ? 'ok' : i === nextI ? 'next' : ''}"><span class="ic">${x.done ? '✓' : i === nextI ? '▶' : '○'}</span><span>${esc(x.t)}</span>${i === nextI ? `<button class="btn sm primary" type="button" data-career="path" data-i="${i}">Y aller</button>` : ''}</li>`).join('')}</ul></details>
      <p class="sub">Objectifs du jour</p><ul class="cr-goals">${goals}</ul>
      <details class="cr-det"><summary>Badges · ${Object.keys(st.badges).length} sur ${CR.BADGES.length}</summary><div class="cr-badges">${badges}</div></details>`;
  }
  // sélecteur de mode : l'accueil ne montre que les cartes du mode choisi
  (function homeModes() {
    const card = $('#career-card');
    if (!card || $('#home-modes')) return;
    const modes = [['trade', 'Trading'], ['tech', 'Technique'], ['fund', 'Analyste'], ['pm', 'Gestionnaire'], ['learn', 'Formation']];
    let cur = 'trade';
    try { const v = localStorage.getItem('ta:homemode'); if (modes.some((m) => m[0] === v)) cur = v; } catch (e) { /* rien */ }
    const seg = document.createElement('div');
    seg.className = 'seg home-modes'; seg.id = 'home-modes'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Mode de jeu');
    const paint = () => { document.body.dataset.hm = cur; seg.innerHTML = modes.map(([id, n]) => `<button type="button" data-hmode="${id}" class="${id === cur ? 'on' : ''}">${n}</button>`).join(''); };
    seg.addEventListener('click', (e) => { const b = e.target.closest('[data-hmode]'); if (!b) return; cur = b.dataset.hmode; try { localStorage.setItem('ta:homemode', cur); } catch (err) { /* rien */ } paint(); });
    card.after(seg); paint();
  })();
  window.addEventListener('ta:xp', (ev) => {
    try { const res = CR.apply(ev.detail || {}); toast(res); renderCard(); } catch (e) { /* la progression ne doit jamais casser un module */ }
  });
  document.addEventListener('click', (e) => {
    const pb = e.target.closest('[data-career="path"]');
    if (pb && pathCache[+pb.dataset.i]) { pathCache[+pb.dataset.i].go(); return; }
    if (e.target.closest('[data-career="wk"]')) {
      const sel = $('#pm-mand'), sc = $('#pm-scen'), code = $('#pm-code'), b = document.querySelector('[data-pm-home="start"]');
      if (sel && sc && code && b) {
        sel.value = 'retraitee'; sel.dispatchEvent(new Event('change', { bubbles: true }));
        sc.value = 'krach2008'; sc.dispatchEvent(new Event('change', { bubbles: true }));
        code.value = CR.weekCode(); b.click();
      }
      return;
    }
    if (e.target.closest('[data-career="mgr"]')) {
      const day = Math.floor(Date.now() / 86400000);
      if (day % 2 === 0) { const sel = $('#pm-mand'), code = $('#pm-code'), b = document.querySelector('[data-pm-home="start"]'); if (sel && code && b) { sel.value = ['retraitee', 'jeune', 'fondation', 'regime'][day % 4 === 0 ? 0 : 2]; sel.dispatchEvent(new Event('change', { bubbles: true })); code.value = CR.dayCode(now0(), 'PM'); b.click(); } }
      else { const code = $('#fd-code'), b = document.querySelector('[data-fd-home="start"]'); if (code && b) { code.value = CR.dayCode(now0(), 'FD'); b.click(); } }
      return;
    }
    if (!e.target.closest('[data-career="daily"]')) return;
    const code = CR.dayCode(), inp = $('#fl-code'), b = document.querySelector('[data-fl-home="start"]');
    if (inp && b) { inp.value = code; b.click(); }
  });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
