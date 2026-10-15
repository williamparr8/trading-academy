/* Trading Academy — Examen blanc : 20 questions tirées de toutes les leçons, corrigé à la fin, note par thème,
   puis révision des erreurs (les questions ratées reviennent dans « Réviser mes erreurs »). Logique pure dans TA.EXAM. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const EX = (TA.EXAM = {});
  EX.SIZE = 20; EX.PASS = 0.7;

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  EX.rng = (seed) => mulberry(hash('EX|' + seed));
  const shuffle = (a, r) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  // banque de questions : { key, lesson, topic, q, o, a, e }
  EX.pool = function (lessons) {
    const out = [];
    for (const l of lessons) l.quiz.forEach((q, i) => out.push({ key: l.id + ':' + i, lesson: l.id, topic: l.title, q: q.q, o: q.o, a: q.a, e: q.e }));
    return out;
  };
  // questions de l'examen : réparties entre les leçons, options mélangées (la bonne réponse change de place)
  EX.build = function (pool, rng, n = EX.SIZE, onlyKeys = null) {
    const src = onlyKeys ? pool.filter((p) => onlyKeys.includes(p.key)) : pool;
    const picked = shuffle(src, rng).slice(0, Math.min(n, src.length));
    return picked.map((p) => {
      const order = shuffle(p.o.map((_, i) => i), rng);
      return { key: p.key, lesson: p.lesson, topic: p.topic, q: p.q, e: p.e, o: order.map((i) => p.o[i]), a: order.indexOf(p.a) };
    });
  };
  EX.grade = function (qs, answers) {
    const topics = {}, wrong = [];
    let right = 0;
    qs.forEach((q, i) => {
      const t = (topics[q.topic] = topics[q.topic] || { n: 0, ok: 0 });
      t.n++;
      if (answers[i] === q.a) { right++; t.ok++; } else wrong.push({ i, q, chosen: answers[i] });
    });
    const pct = qs.length ? right / qs.length : 0;
    return { right, n: qs.length, pct, pass: pct >= EX.PASS, topics, wrong };
  };

  /* ---------- écran ---------- */
  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = { qs: [], i: 0, ans: [], mode: 'exam', code: '', done: false, shown: false };
  const MKEY = 'ta:exammiss', HKEY = 'ta:examhist';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } } };
  const APP = () => window.TA_APP;
  const newCode = () => 'EX-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  function start(mode, code) {
    const pool = EX.pool(TA.LESSONS || []);
    S.mode = mode; S.code = code || newCode(); S.i = 0; S.ans = []; S.done = false; S.shown = false;
    const rng = EX.rng(S.code);
    const miss = (store.get(MKEY) || []).filter((k) => pool.some((p) => p.key === k));
    S.qs = mode === 'review' ? EX.build(pool, rng, 10, miss) : EX.build(pool, rng, EX.SIZE);
    if (!S.qs.length) { const el = $('#ex-err'); if (el) el.textContent = 'Aucune erreur à réviser : fais d’abord un examen blanc.'; return; }
    APP().show('exam'); render();
  }
  function render() {
    const root = $('#screen-exam');
    if (!root) return;
    if (S.done) { renderEnd(root); return; }
    const q = S.qs[S.i], a = S.ans[S.i], review = S.mode === 'review', shown = review && a != null;
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">${review ? 'Réviser mes erreurs' : 'Examen blanc'} · question ${S.i + 1} sur ${S.qs.length}</b><span class="sp"></span><div class="mt-prog"><div class="ptxt">${esc(q.topic)}</div><div class="prog"><i style="width:${(S.i / S.qs.length) * 100}%"></i></div></div><button class="btn ghost" type="button" data-ex="quit">Quitter</button></div>
      <div class="pm-grid fl-grid"><section class="pm-center"><div class="mt-win"><header class="mt-wh"><b>Question</b></header><div class="mt-wb pm-pad ex-q">
        <p class="ex-text">${esc(q.q)}</p>
        ${q.o.map((o, i) => `<button type="button" class="ex-opt${shown ? (i === q.a ? ' good' : i === a ? ' bad' : '') : a === i ? ' pick' : ''}" data-ex-a="${i}"${shown ? ' disabled' : ''}>${esc(o)}</button>`).join('')}
        ${shown ? `<p class="expl"><strong>${a === q.a ? 'Bonne réponse.' : 'Pas tout à fait.'}</strong> ${esc(q.e)}</p>` : ''}
      </div></div></section>
      <aside class="mt-win pm-right"><header class="mt-wh"><b>Navigation</b></header><div class="mt-wb pm-pad">
        <div class="ex-nav">${S.qs.map((_, i) => `<button type="button" class="${i === S.i ? 'cur' : S.ans[i] != null ? 'done' : ''}" data-ex-go="${i}">${i + 1}</button>`).join('')}</div>
        <div class="acts" style="margin-top:10px">${S.i > 0 ? '<button class="btn" type="button" data-ex="prev">◀ Précédente</button>' : ''}${S.i + 1 < S.qs.length ? '<button class="btn primary" type="button" data-ex="next">Suivante ▶</button>' : '<button class="btn primary" type="button" data-ex="finish">Terminer et corriger</button>'}</div>
        <p class="fine">${review ? 'Le corrigé s’affiche après chaque réponse.' : 'Le corrigé complet est donné à la fin. Réussite à ' + Math.round(EX.PASS * 100) + ' %.'}</p>
      </div></aside></div>`;
  }
  function finish() {
    const g = EX.grade(S.qs, S.ans);
    S.done = true;
    const miss = new Set(store.get(MKEY) || []);
    S.qs.forEach((q, i) => { if (S.ans[i] === q.a) miss.delete(q.key); else miss.add(q.key); });
    store.set(MKEY, [...miss].slice(0, 60));
    S.qs.forEach((q, i) => { try { window.dispatchEvent(new CustomEvent(S.ans[i] === q.a ? 'ta:hit' : 'ta:miss', { detail: { src: 'exam', key: 'exam:' + q.key, title: 'Examen · ' + q.topic, q: { type: 'mcq', text: q.q, opts: q.o, a: q.a, expl: q.e } } })); } catch (e) { /* rien */ } });
    const h = store.get(HKEY) || [];
    h.unshift({ code: S.code, pct: g.pct, mode: S.mode }); store.set(HKEY, h.slice(0, 8));
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'exam', pct: g.pct, pass: g.pass, n: g.n, review: S.mode === 'review', code: S.code } })); } catch (e) { /* rien */ }
    render(); renderCard();
  }
  function renderEnd(root) {
    const g = EX.grade(S.qs, S.ans);
    const topics = Object.entries(g.topics).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Résultat · ${S.mode === 'review' ? 'révision' : 'examen blanc'} · ${esc(S.code)}</b><span class="sp"></span><button class="btn" type="button" data-ex="replay">Refaire cet examen</button><button class="btn primary" type="button" data-ex="quit">Terminer</button></div>
      <div class="pm-report"><section class="mt-win pm-grade"><header class="mt-wh"><b>Note</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${g.pass ? 'pos' : 'neg'}">${Math.round(g.pct * 100)} %</div><p class="pm-score">${g.right} sur ${g.n} · ${g.pass ? 'réussi' : 'à retravailler'}</p>
          <p class="hint">Seuil de réussite : ${Math.round(EX.PASS * 100)} %.</p></div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Par thème (du plus faible au plus fort)</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>${topics.map(([t, v]) => `<tr><td>${esc(t)}</td><td class="r">${v.ok} / ${v.n}</td><td class="r ${v.ok === v.n ? 'pos' : v.ok / v.n < 0.5 ? 'neg' : ''}">${Math.round((v.ok / v.n) * 100)} %</td></tr>`).join('')}</tbody></table></div></section>
        <section class="mt-win pm-notes"><header class="mt-wh"><b>Corrigé des erreurs</b></header><div class="mt-wb pm-pad">${g.wrong.length ? g.wrong.map((w) => `<div class="fd warn"><i></i><div><b>${esc(w.q.q)}</b><p>Ta réponse : ${w.chosen == null ? 'aucune' : esc(w.q.o[w.chosen])}. Bonne réponse : <b>${esc(w.q.o[w.q.a])}</b>. ${esc(w.q.e)}</p></div></div>`).join('') : '<p class="hint">Aucune erreur : excellent.</p>'}</div></section></div>`;
  }
  function renderCard() {
    const box = $('#exam-card');
    if (!box) return;
    const h = store.get(HKEY) || [], miss = (store.get(MKEY) || []).length, n = (TA.LESSONS || []).reduce((s, l) => s + l.quiz.length, 0);
    box.innerHTML = `<h2>Examen blanc <span class="tag soon">nouveau</span></h2>
      <p class="hint">${EX.SIZE} questions tirées des ${(TA.LESSONS || []).length} leçons (${n} questions en banque), options mélangées, corrigé à la fin. Les questions ratées reviennent en révision.</p>
      <p class="err" id="ex-err" role="alert"></p>
      <div class="acts"><button class="btn primary" type="button" data-ex-home="exam">Examen de ${EX.SIZE} questions</button><button class="btn" type="button" data-ex-home="review">Réviser mes erreurs (${miss})</button></div>
      ${h.length ? `<p class="sub">Derniers résultats</p><div class="glist">${h.slice(0, 4).map((x) => `<div class="grow"><span class="mono">${esc(x.code)}</span><span>${x.mode === 'review' ? 'révision' : 'examen'}</span><span class="mono ${x.pct >= EX.PASS ? 'pos' : 'neg'}">${Math.round(x.pct * 100)} %</span></div>`).join('')}</div>` : ''}`;
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-ex-home]');
    if (h) { start(h.dataset.exHome === 'review' ? 'review' : 'exam'); return; }
    const a = e.target.closest('[data-ex-a]');
    if (a && !a.disabled) { S.ans[S.i] = +a.dataset.exA; render(); return; }
    const go = e.target.closest('[data-ex-go]');
    if (go) { S.i = +go.dataset.exGo; render(); return; }
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    const k = b.dataset.ex;
    if (k === 'next') { S.i = Math.min(S.qs.length - 1, S.i + 1); render(); }
    else if (k === 'prev') { S.i = Math.max(0, S.i - 1); render(); }
    else if (k === 'finish') finish();
    else if (k === 'quit') { S.done = false; renderCard(); APP().show('home'); }
    else if (k === 'replay') start(S.mode, S.code);
  });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
