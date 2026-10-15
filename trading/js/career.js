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
    { id: 'missions', name: 'Missions accomplies', desc: 'Réussis les trois missions d’une partie.' },
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
    { id: 'ips1', name: 'Rédacteur d’EPP', desc: 'Termine les six dossiers de l’atelier EPP.' },
    { id: 'ips80', name: 'Conseiller de confiance', desc: 'Obtiens 80 sur 100 ou plus à l’atelier EPP.' },
    { id: 'exam', name: 'Examen réussi', desc: 'Obtiens 70 % ou plus à l’examen blanc.' },
    { id: 'exam90', name: 'Mention excellence', desc: 'Obtiens 90 % ou plus à l’examen blanc.' },
    { id: 'boss', name: 'Boss de la semaine', desc: 'Obtiens au moins B au mandat de crise de la semaine.' },
    { id: 'all', name: 'Touche-à-tout', desc: 'Termine une séance de chaque mode : partie, mandat, saison et flash.' },
  ];

  for (let i = 1; i <= 10; i++) CR.BADGES.push({ id: 'camp' + i, name: 'Chapitre ' + i, desc: 'Réussis les 10 niveaux du chapitre ' + i + ' de la campagne.' });
  CR.BADGES.push({ id: 'campAll', name: 'Gestionnaire de la Maison Boréale', desc: 'Termine le niveau 100 de la campagne.' }, { id: 'campGold', name: 'Maîtrise totale', desc: 'Obtiens trois étoiles aux 100 niveaux.' });
  CR.BADGES.push({ id: 'rev1', name: 'Mémoire en marche', desc: 'Termine une séance de révision du carnet d’erreurs.' }, { id: 'rev25', name: 'Mémoire d’acier', desc: 'Maîtrise 25 questions de ton carnet d’erreurs.' });
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
  CR.gameCode = (date = today()) => {
    const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let h = 2166136261;
    for (const ch of 'TG' + date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h >>>= 0;
    let s = '';
    for (let i = 0; i < 8; i++) { s += A[h % A.length]; h = (Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) || 7; if (i === 3) s += '-'; }
    return s;
  };
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
    if (e.kind === 'game' && !(e.trades > 0)) {
      // aucune transaction : ni points ni badge (sinon « Nouvelle partie » puis « Terminer » ferait grimper les grades)
    } else if (e.kind === 'game') {
      const f = e.replay ? 0.3 : 1;
      add(20 * f, 'partie terminée');
      if (e.counted && e.passed) add(40 * f, 'partie disciplinée');
      if (e.ret > e.bh) add(15 * f, 'meilleur que l’acheter-conserver');
      if (e.dd != null && e.dd > -0.1) add(10 * f, 'perte maximale sous 10 %');
      if (e.missions) add(e.missions * 10 * f, `${e.missions} mission${e.missions > 1 ? 's' : ''} sur ${e.missionsTotal}`);
      if (e.missions && e.missions === e.missionsTotal && e.missionsTotal >= 3) { add(20 * f, 'toutes les missions'); out.badges.push('missions'); }
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
      if (e.taken >= 3) add(20, 'séance terminée');
      add(Math.min(60, Math.max(0, e.total) * 5), 'résultat en R');
      if (e.timed) add(15, 'mode chrono');
      if (e.taken && e.wins / e.taken >= 0.5) add(10, 'plus de la moitié de réussite');
      if (e.taken >= 3) out.badges.push('flash1');
      if (e.total >= 5) out.badges.push('flashPos');
    } else if (e.kind === 'camp') {
      const base = [10, 20, 35][e.tier] || 10;
      add(base * (e.boss ? 1.5 : 1), `campagne : niveau ${e.n}, palier ${e.tier + 1}`);
      if (e.pct >= 1) add(8, 'sans faute');
      (e.badgeIds || []).forEach((id) => out.badges.push(id));
    } else if (e.kind === 'ips') {
      add(20 + e.score * 0.4, `atelier EPP : ${Math.round(e.score)} sur 100`);
      out.badges.push('ips1'); if (e.score >= 80) out.badges.push('ips80');
    } else if (e.kind === 'exam') {
      const f = e.review ? 0.5 : 1;
      add(f * e.pct * 45, `${Math.round(e.pct * 100)} % à l’examen`);
      if (e.pass && !e.review) add(30, 'examen réussi');
      if (!e.review && e.pass) out.badges.push('exam');
      if (!e.review && e.pct >= 0.9) out.badges.push('exam90');
    } else if (e.kind === 'pattern') {
      add(15 + e.right * 4, `${e.right} figures sur ${e.total}`);
      out.badges.push('pattern1'); if (e.right >= 9) out.badges.push('patternAce');
    } else if (e.kind === 'review') {
      add(Math.min(40, e.right * 4), `${e.right} réponse${e.right > 1 ? 's' : ''} juste${e.right > 1 ? 's' : ''} en révision`);
      if (e.total >= 5 && e.right / e.total >= 0.8) add(10, 'révision réussie');
      if (e.total >= 1) out.badges.push('rev1');
      if (e.masteredTotal >= 25) out.badges.push('rev25');
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
    st.active = Array.isArray(st.active) ? st.active : [];
    if (!st.active.includes(now)) st.active = [...st.active, now].slice(-120);
    const a = CR.award(e, st);
    const ck = e.code && e.kind !== 'quiz' ? e.kind + ':' + String(e.code) : null;
    st.seen = Array.isArray(st.seen) ? st.seen : [];
    const dup = !!ck && st.seen.includes(ck);
    if (ck && !dup) st.seen = [...st.seen, ck].slice(-300);
    if (dup) { a.xp = Math.round(a.xp * 0.15); a.why = ['même code déjà joué : points réduits']; }
    // objectifs du jour : bonus unique par objectif
    const mode = e.kind === 'game' ? 'trade' : e.kind;
    if (!dup && e.kind === 'flash' && e.code === CR.dayCode(now, 'FL') && !st.daily.done.flash) { st.daily.done.flash = true; a.xp += 40; a.why.push('défi du jour : Flash'); }
    if (!dup && e.kind === 'game' && e.trades > 0 && String(e.code || '').startsWith(CR.gameCode(now)) && !st.daily.done.dailygame) { st.daily.done.dailygame = true; a.xp += 40; a.why.push('défi du jour : partie'); }
    if (e.kind === 'pm' && e.code === CR.weekCode() && e.scenario === 'krach2008' && e.mand === 'retraitee' && (!st.weekly || st.weekly.week !== CR.weekStart())) {
      st.weekly = { week: CR.weekStart(), grade: e.grade };
      const bonus = ['A', 'B', 'C'].includes(e.grade) ? 80 : 20;
      a.xp += bonus; a.why.push('boss de la semaine');
      if (['A', 'B'].includes(e.grade)) a.badges.push('boss');
    }
    if ((e.kind === 'pm' || e.kind === 'fund') && !st.daily.done.manager) { st.daily.done.manager = true; a.xp += 30; a.why.push('objectif du jour : gestion'); }
    if ((e.kind === 'quiz' || e.kind === 'game' || e.kind === 'review') && !st.daily.done.learn) { st.daily.done.learn = true; a.xp += 15; a.why.push('objectif du jour : apprendre ou jouer'); }
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
    try { if (TA.SFX) TA.SFX.play(res.promoted ? 'level' : res.badges.length ? 'badge' : res.xp > 0 ? 'xp' : 'tick'); } catch (e) { /* rien */ }
    if (res.promoted || res.badges.length) { try { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) confetti(); } catch (e) { /* rien */ } }
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
  // carte de chaleur des 8 dernières semaines
  function heat(st) {
    const set = new Set(st.active || []), cells = [], day0 = new Date();
    for (let k = 55; k >= 0; k--) {
      const d = new Date(day0.getTime() - k * 86400000), id = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      cells.push(`<i class="${set.has(id) ? 'on' : ''}" title="${id}"></i>`);
    }
    return `<div class="cr-heat" aria-label="Jours joués">${cells.join('')}</div>`;
  }
  // confettis pour un nouveau grade
  function confetti() {
    const box = document.createElement('div');
    box.className = 'cr-confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = ['#d9a400', '#0b3fd6', '#d81e27', '#1a8f4f', '#6b3fb5'];
    for (let i = 0; i < 46; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'; box.appendChild(p); }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }
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
      ['dailygame', 'Défi du jour : partie d’entraînement', 'dg', 40],
      ['flash', 'Défi du jour : Flash technique', 'fl', 40], ['manager', 'Le mandat ou la saison du jour', 'mgr', 30], ['learn', 'Une partie ou un quiz', null, 15],
    ].map(([k, t, a, xp]) => `<li class="${done[k] ? 'ok' : ''}"><span class="ic">${done[k] ? '✓' : '○'}</span><span>${esc(t)} <small>+${xp} XP</small></span>${a === 'fl' && !done[k] ? '<button class="btn sm" type="button" data-career="daily">Jouer</button>' : a === 'mgr' && !done[k] ? '<button class="btn sm" type="button" data-career="mgr">Jouer</button>' : a === 'wk' && !done[k] ? '<button class="btn sm" type="button" data-career="wk">Jouer</button>' : a === 'dg' && !done[k] ? '<button class="btn sm" type="button" data-career="dg">Jouer</button>' : ''}</li>`).join('');
    const badges = CR.BADGES.map((b) => `<span class="cr-badge ${st.badges[b.id] ? 'on' : ''}" title="${esc(b.name)} : ${esc(b.desc)}${st.badges[b.id] ? ' (obtenu le ' + esc(st.badges[b.id]) + ')' : ''}">${esc(b.name)}</span>`).join('');
    box.innerHTML = `<h2>Ta carrière</h2>
      <div class="cr-top"><div><b class="cr-rank">${esc(r.name)}</b><small>${nf.format(st.xp)} XP${r.next ? ` · prochain grade : ${esc(r.next)} à ${nf.format(r.to)}` : ' · grade maximal'}</small></div><div class="cr-streak" title="Jours consécutifs"><b>${live}</b><small>jour${live > 1 ? 's' : ''} de suite</small></div></div>
      <div class="prog"><i style="width:${Math.round(r.pct * 100)}%"></i></div>
      ${nextI >= 0 ? `<div class="cr-next"><span>Prochaine étape</span><b>${esc(pth[nextI].t)}</b><button class="btn sm primary" type="button" data-career="path" data-i="${nextI}">Y aller</button></div>` : ""}<details class="cr-det"><summary>Parcours recommandé · ${pth.filter((x) => x.done).length} sur ${pth.length}</summary><ul class="cr-goals cr-path">${pth.map((x, i) => `<li class="${x.done ? 'ok' : i === nextI ? 'next' : ''}"><span class="ic">${x.done ? '✓' : i === nextI ? '▶' : '○'}</span><span>${esc(x.t)}</span>${i === nextI ? `<button class="btn sm primary" type="button" data-career="path" data-i="${i}">Y aller</button>` : ''}</li>`).join('')}</ul></details>
      <p class="sub">Objectifs du jour</p><ul class="cr-goals">${goals}</ul>
      <details class="cr-det"><summary>Activité · ${(st.active || []).length} jour${(st.active || []).length > 1 ? 's' : ''}</summary>${heat(st)}</details>
      <div class="acts" style="margin-top:8px"><button class="btn sm ghost" type="button" data-career="export">Exporter ma progression</button><label class="btn sm ghost" for="cr-import" style="cursor:pointer">Importer</label><input type="file" id="cr-import" accept=".json,application/json" hidden></div>
      <details class="cr-det"><summary>Badges · ${Object.keys(st.badges).length} sur ${CR.BADGES.length}</summary><div class="cr-badges">${badges}</div></details>`;
  }
  // sélecteur de mode : l'accueil ne montre que les cartes du mode choisi
  (function homeModes() {
    const card = $('#career-card');
    if (!card || $('#home-modes')) return;
    const modes = [['camp', '🎓 Campagne'], ['trade', '📈 Trading'], ['tech', '🔬 Technique'], ['fund', '📊 Analyste'], ['pm', '💼 Gestionnaire'], ['learn', '📚 Formation']];
    let cur = 'camp';
    try { const v = localStorage.getItem('ta:homemode'); if (modes.some((m) => m[0] === v)) cur = v; } catch (e) { /* rien */ }
    const seg = document.createElement('div');
    seg.className = 'seg home-modes'; seg.id = 'home-modes'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Mode de jeu');
    const paint = () => { document.body.dataset.hm = cur; seg.innerHTML = modes.map(([id, n]) => `<button type="button" data-hmode="${id}" class="${id === cur ? 'on' : ''}">${n}</button>`).join(''); };
    seg.addEventListener('click', (e) => { const b = e.target.closest('[data-hmode]'); if (!b) return; cur = b.dataset.hmode; try { localStorage.setItem('ta:homemode', cur); } catch (err) { /* rien */ } paint(); });
    const stack = card.parentNode;
    stack.prepend(seg);                       // le sélecteur de mode passe en premier
    stack.insertBefore(card, stack.querySelector(':scope > p.fine'));   // la carrière descend sous les cartes du mode
    paint();
  })();
  // sauvegarde de la progression : export et import d'un fichier (le navigateur peut tout oublier)
  const KEYS = ['ta:career', 'ta:camp', 'ta:fundhist', 'ta:pmhist', 'ta:flashhist', 'ta:patternhist', 'ta:examhist', 'ta:exammiss', 'ta:ipshist', 'ta:homemode', 'ta:review', 'ta:league', 'ta:chron'];
  function exportProgress() {
    const data = {};
    for (const k of KEYS) { try { const v = localStorage.getItem(k); if (v != null) data[k] = v; } catch (e) { /* rien */ } }
    const blob = new Blob([JSON.stringify({ app: 'trading-academy', v: 1, data })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'trading-academy-progression.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function importProgress(file) {
    try {
      const j = JSON.parse(await file.text());
      if (!j || j.app !== 'trading-academy' || !j.data) throw new Error('format');
      let n = 0;
      for (const k of KEYS) {
        if (typeof j.data[k] !== 'string' || j.data[k].length > 200000) continue;
        const v = JSON.parse(j.data[k]);
        if (k === 'ta:career' && !(v && typeof v === 'object' && Number.isFinite(v.xp) && v.badges && typeof v.badges === 'object' && !Array.isArray(v.badges))) continue;
        if (k.endsWith('hist') && !Array.isArray(v)) continue;
        if (k === 'ta:camp' && !(v && typeof v === 'object' && v.stars && typeof v.stars === 'object')) continue;
        localStorage.setItem(k, j.data[k]); n++;
      }
      renderCard();
      toast({ xp: 0, why: [n + ' éléments de progression restaurés'], badges: [], promoted: false });
    } catch (e) { toast({ xp: 0, why: ['Fichier de progression invalide'], badges: [], promoted: false }); }
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-career="export"]')) exportProgress(); });
  document.addEventListener('change', (e) => { if (e.target.id === 'cr-import' && e.target.files[0]) { importProgress(e.target.files[0]); e.target.value = ''; } });
  // première visite : présentation des modes
  (function welcome() {
    let seen = false;
    try { seen = !!localStorage.getItem('ta:welcome'); } catch (e) { seen = true; }
    if (seen) return;
    const m = document.createElement('div');
    m.className = 'mt-modal'; m.id = 'cr-welcome';
    m.innerHTML = `<div role="dialog" aria-label="Bienvenue"><header><span>Bienvenue sur Trading Academy</span></header><div class="mb">
      <p>Un seul simulateur, trois métiers à apprendre sur de vrais marchés historiques, sans risquer un sou :</p>
      <p><b>Trader.</b> Parties d’entraînement, Flash technique, Chasse aux figures.</p>
      <p><b>Analyste.</b> Saison des résultats : états financiers, consensus, signaux comptables.</p>
      <p><b>Gestionnaire.</b> Mandats de clients, énoncé de politique, risque, déontologie, rapport façon CFA.</p>
      <p>Choisis un mode en haut de l’accueil. Ta carrière (points, grades, badges) te propose un parcours : suis la prochaine étape.</p></div>
      <div class="mf"><button class="btn primary" type="button" data-career="welcome">Commencer</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-career="welcome"]') || e.target === m) { try { localStorage.setItem('ta:welcome', '1'); } catch (err) { /* rien */ } m.remove(); } });
  })();
  window.addEventListener('ta:xp', (ev) => {
    try { const res = CR.apply(ev.detail || {}); toast(res); renderCard(); } catch (e) { /* la progression ne doit jamais casser un module */ }
  });
  document.addEventListener('click', (e) => {
    const pb = e.target.closest('[data-career="path"]');
    if (pb && pathCache[+pb.dataset.i]) { pathCache[+pb.dataset.i].go(); return; }
    if (e.target.closest('[data-career="dg"]')) {
      const hb = document.querySelector('[data-hmode="trade"]'); if (hb) hb.click();
      const pick = (sel, v) => { const b = document.querySelector(sel + ' [data-v="' + v + '"]'); if (b) b.click(); };
      pick('#s-mode', 'train'); pick('#s-market', 'stock'); pick('#s-style', 'swing');
      const sc = $('#s-scen'), code = $('#s-code'), go = $('#s-go');
      if (sc && code && go) {
        sc.value = 'random'; sc.dispatchEvent(new Event('change', { bubbles: true }));
        code.value = CR.gameCode(); code.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => go.click(), 50);
      }
      return;
    }
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

  /* ---- accueil façon jeu : tableau de bord du joueur et grille de modes ---- */
  const TILES = [
    { id: 'camp', hm: 'camp', ico: '🎓', t: 'Campagne', d: 'Cent niveaux et une histoire : de stagiaire à gestionnaire.', c: ['#4f46e5', '#9333ea'], big: true },
    { id: 'trade', hm: 'trade', ico: '📈', t: 'Parties libres', d: 'De vrais marchés, actif et date cachés.', c: ['#0ea5e9', '#2563eb'] },
    { id: 'flash', hm: 'tech', target: 'flash-card', ico: '⚡', t: 'Flash technique', d: 'Quinze graphiques, une décision chacun.', c: ['#f59e0b', '#ef4444'] },
    { id: 'fig', hm: 'tech', target: 'pattern-card', ico: '🔍', t: 'Chasse aux figures', d: 'Reconnais la figure, vite.', c: ['#10b981', '#0891b2'] },
    { id: 'fund', hm: 'fund', ico: '📊', t: 'Saison des résultats', d: 'Sociétés fictives, états financiers à lire.', c: ['#8b5cf6', '#d946ef'] },
    { id: 'pm', hm: 'pm', target: 'pm-card', ico: '💼', t: 'Mandat de gestion', d: 'Un client, une politique, des contraintes.', c: ['#0d9488', '#047857'] },
    { id: 'ips', hm: 'pm', target: 'ips-card', ico: '📝', t: 'Atelier EPP', d: 'Six dossiers de clients à analyser.', c: ['#f97316', '#be123c'] },
    { id: 'rev', hm: 'learn', ico: '🧠', t: 'Révision', d: 'Tes erreurs reviennent au bon moment.', c: ['#14b8a6', '#0369a1'] },
    { id: 'learn', hm: 'learn', ico: '📚', t: 'Formation', d: 'Leçons, examen blanc, glossaire.', c: ['#64748b', '#1e293b'] },
  ];
  const AVATARS = ['🧑‍🎓', '🧑‍💼', '📈', '🧠', '🏦', '🦉', '👔', '🚀', '👑'];
  let introDone = false;
  function gameUI() {
    const home = $('#screen-home'), stack = $('.side-stack');
    if (!home || !stack) return;
    const st = CR.state(), r = CR.rankOf(st.xp), now = today();
    let camp = { stars: {} };
    try { if (TA.CAMPLOGIC && TA.CAMPLOGIC.progress) camp = TA.CAMPLOGIC.progress(); } catch (e) { /* rien */ }
    const stars = Object.values(camp.stars).reduce((a, b) => a + b, 0), done = Object.values(camp.stars).filter((v) => v >= 1).length;
    const goals = st.daily.date === now ? Object.keys(st.daily.done).length : 0;
    const streak = st.days.last === now || st.days.last === yesterday() ? st.days.streak : 0;
    const hero = home.firstElementChild;
    let hud = $('#hud');
    if (!hud && hero) { hud = document.createElement('div'); hud.id = 'hud'; hud.className = 'hud'; hero.appendChild(hud); }
    if (hud) hud.innerHTML = `<div class="hud-av" aria-hidden="true">${AVATARS[r.i] || '🧑‍🎓'}</div>
      <div class="hud-main"><div class="hud-rank">${esc(r.name)}</div><div class="hud-sub"><span data-count="${st.xp}">${nf.format(st.xp)}</span> XP${r.next ? ' · prochain grade : ' + esc(r.next) : ' · grade maximal'}</div><div class="hud-bar"><i style="width:${Math.round(r.pct * 100)}%"></i></div></div>
      <div class="hud-chips"><div class="hud-chip"><b>🔥 ${streak}</b>jour${streak > 1 ? 's' : ''} de suite</div><div class="hud-chip"><b>⭐ ${stars}</b>étoiles</div><div class="hud-chip"><b>🎯 ${goals}/4</b>objectifs</div></div>`;
    const cnt = hud && hud.querySelector('[data-count]');
    if (cnt) {
      const from = +(window.__taHudXp || 0), to = st.xp;
      window.__taHudXp = to;
      if (from !== to && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        const t0 = performance.now();
        const step = (t) => { const k = Math.min(1, (t - t0) / 700); cnt.textContent = nf.format(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    }
    // grille de modes
    const hm = document.body.dataset.hm;
    let grid = $('#mode-grid');
    if (!grid) { grid = document.createElement('section'); grid.id = 'mode-grid'; stack.prepend(grid); }
    const info = {
      camp: `${done} / 100 niveaux · ${stars} ★`, trade: `${st.stats.game || 0} partie${(st.stats.game || 0) > 1 ? 's' : ''}`, flash: `${st.stats.flash || 0} séance${(st.stats.flash || 0) > 1 ? 's' : ''}`,
      fig: `${st.stats.pattern || 0} séance${(st.stats.pattern || 0) > 1 ? 's' : ''}`, fund: `${st.stats.fund || 0} saison${(st.stats.fund || 0) > 1 ? 's' : ''}`, pm: `${st.stats.pm || 0} mandat${(st.stats.pm || 0) > 1 ? 's' : ''}`,
      ips: st.badges.ips1 ? 'terminé' : 'à découvrir', rev: TA.REVIEW ? (TA.REVIEW.dueCount() ? TA.REVIEW.dueCount() + ' à revoir' : 'à jour') : '—', learn: `${Object.keys(st.quizPass || {}).length} quiz réussis`,
    };
    grid.innerHTML = `<div class="mode-head"><h2>Choisis ton mode</h2><span>Chaque mode entraîne une compétence différente.</span></div><div class="mode-grid${introDone ? '' : ' intro'}">${TILES.map((t) => `<button type="button" class="mode-tile${t.big ? ' big' : ''}${t.hm === hm && !t.target ? ' on' : ''}" style="--c1:${t.c[0]};--c2:${t.c[1]}" data-mode-tile="${t.id}" data-hm-go="${t.hm}"${t.target ? ' data-target="' + t.target + '"' : ''}><span class="ico" aria-hidden="true">${t.ico}</span><b>${esc(t.t)}</b><span>${esc(t.d)}</span><i>${t.id === 'camp' ? (done ? 'Continuer · niveau ' + Math.min(100, done + 1) : 'Commencer l’aventure') : esc(info[t.id])}</i></button>`).join('')}</div>`;
    introDone = true;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-mode-tile]');
    if (!t) return;
    const id = t.dataset.modeTile, b = document.querySelector('[data-hmode="' + t.dataset.hmGo + '"]');
    if (id === 'rev' && TA.REVIEW) { TA.REVIEW.open(); return; }
    if (b) b.click();
    if (id === 'camp') { const go = document.querySelector('#camp-card [data-cp-open]'); if (go) { go.click(); return; } }
    gameUI();
    setTimeout(() => {
      const el = (t.dataset.target && document.getElementById(t.dataset.target)) || document.querySelector('.side-stack > .card:not(#career-card)');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  });
  try {
    const homeEl = $('#screen-home');
    if (homeEl) new MutationObserver(() => { if (!homeEl.hidden) gameUI(); }).observe(homeEl, { attributes: true, attributeFilter: ['hidden'] });
  } catch (e) { /* rien */ }
  window.addEventListener('ta:xp', () => setTimeout(gameUI, 30));
  renderCard();
  gameUI();
})(typeof window !== 'undefined' ? window : globalThis);
