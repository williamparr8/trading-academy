/* Trading Academy — carnet d'erreurs et révision espacée.
   Chaque question ratée (campagne, examen blanc, quiz de leçons) est ajoutée au carnet. Elle revient ensuite à des
   intervalles de plus en plus longs (1, 3, 7, 16, puis 35 jours) tant qu'elle est réussie ; une erreur la ramène au début.
   Après cinq réussites de suite, la question est « maîtrisée » et quitte le carnet. Données locales (clé ta:review). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const RV = (TA.REVIEW = {});
  RV.INTERVALS = [1, 3, 7, 16, 35];   // jours avant la prochaine révision, selon la boîte (0 à 4)
  RV.MAX = 150;                       // taille maximale du carnet
  RV.SESSION = 10;                    // questions par séance

  const pad = (n) => String(n).padStart(2, '0');
  RV.addDays = (day, n) => { const [y, m, d] = String(day).split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); };
  RV.fresh = () => ({ v: 1, items: [], mastered: 0, reviewed: 0 });

  // question réduite à l'essentiel (le SVG volumineux est écarté)
  RV.slim = (q) => {
    const o = { type: q.type === 'num' ? 'num' : 'mcq', text: String(q.text || ''), expl: String(q.expl || '') };
    if (o.type === 'mcq') { o.opts = (q.opts || []).map(String); o.a = Number(q.a); }
    else if (q.num) { o.num = { answer: Number(q.num.answer), dec: q.num.dec | 0, unit: String(q.num.unit || '') }; if (q.tol != null) o.tol = Number(q.tol); }
    if (q.svg && String(q.svg).length <= 12000) o.svg = String(q.svg);
    if (q.html && String(q.html).length <= 6000) o.html = String(q.html);
    if (q.hint) o.hint = String(q.hint);
    return o;
  };
  const validQ = (q) => !!q && typeof q.text === 'string' && ((q.type === 'mcq' && Array.isArray(q.opts) && q.opts.length >= 2 && Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length)
    || (q.type === 'num' && q.num && Number.isFinite(q.num.answer)));
  // état lu du stockage : on écarte ce qui est invalide
  RV.clean = (s) => {
    const out = RV.fresh();
    if (!s || s.v !== 1 || !Array.isArray(s.items)) return out;
    out.mastered = Number.isInteger(s.mastered) && s.mastered > 0 ? s.mastered : 0;
    out.reviewed = Number.isInteger(s.reviewed) && s.reviewed > 0 ? s.reviewed : 0;
    for (const it of s.items) {
      if (!it || typeof it.key !== 'string' || !validQ(it.q) || !/^\d{4}-\d{2}-\d{2}$/.test(it.due || '')) continue;
      if (out.items.some((x) => x.key === it.key)) continue;
      out.items.push({ key: it.key, src: String(it.src || ''), title: String(it.title || ''), q: it.q, box: Math.min(RV.INTERVALS.length - 1, Math.max(0, it.box | 0)), due: it.due, ok: Math.max(0, it.ok | 0), ko: Math.max(0, it.ko | 0), added: String(it.added || it.due) });
    }
    out.items = out.items.slice(0, RV.MAX);
    return out;
  };
  RV.add = (st, it, day) => {
    const old = st.items.find((x) => x.key === it.key);
    if (old) { old.box = 0; old.ko++; old.due = RV.addDays(day, 1); return st; }
    st.items.push({ key: it.key, src: it.src || '', title: it.title || '', q: RV.slim(it.q), box: 0, due: RV.addDays(day, 1), ok: 0, ko: 1, added: day });
    while (st.items.length > RV.MAX) {   // on retire d'abord ce qui est le mieux retenu, puis le plus ancien
      let k = 0;
      for (let i = 1; i < st.items.length; i++) { const a = st.items[i], b = st.items[k]; if (a.box > b.box || (a.box === b.box && a.added < b.added)) k = i; }
      st.items.splice(k, 1);
    }
    return st;
  };
  RV.due = (st, day) => st.items.filter((x) => x.due <= day).sort((a, b) => a.box - b.box || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  // résultat d'une réponse : { mastered, box, next } ou null si la question n'est pas (ou plus) au carnet
  RV.answer = (st, key, ok, day) => {
    const it = st.items.find((x) => x.key === key);
    if (!it) return null;
    st.reviewed++;
    if (!ok) { it.box = 0; it.ko++; it.due = RV.addDays(day, 1); return { mastered: false, box: 0, next: 1 }; }
    it.ok++;
    if (it.box >= RV.INTERVALS.length - 1) { st.items = st.items.filter((x) => x !== it); st.mastered++; return { mastered: true, box: RV.INTERVALS.length, next: null }; }
    it.box++; it.due = RV.addDays(day, RV.INTERVALS[it.box]);
    return { mastered: false, box: it.box, next: RV.INTERVALS[it.box] };
  };
  RV.stats = (st, day) => {
    const boxes = RV.INTERVALS.map(() => 0);
    st.items.forEach((x) => { boxes[x.box]++; });
    const by = {};
    st.items.forEach((x) => { const k = x.title || x.src; by[k] = (by[k] || 0) + x.ko; });
    const weak = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { total: st.items.length, due: RV.due(st, day).length, mastered: st.mastered, boxes, weak };
  };
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  RV.keyOf = (src, text) => src + ':' + hash(text);

  if (typeof document === 'undefined') return;
  /* ---------- interface ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'ta:review';
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };   // date locale, comme career.js
  const APP = () => window.TA_APP;
  const load = () => { try { return RV.clean(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return RV.fresh(); } };
  let ST = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* stockage indisponible */ } };
  RV.state = () => ST;
  RV.dueCount = () => RV.due(ST, today()).length;
  const S = { view: 'home', queue: [], i: 0, right: 0, answered: null, practice: false, mastered: 0, wrong: [] };

  const check = (q, raw) => {
    if (q.type === 'mcq') return Number(raw) === q.a;
    if (TA.CAMPLOGIC && TA.CAMPLOGIC.check) return TA.CAMPLOGIC.check(q, raw, 1);
    return Math.abs(parseFloat(String(raw).replace(',', '.')) - q.num.answer) <= Math.abs(q.num.answer) * 0.05 + 1e-9;
  };
  const dots = (b) => RV.INTERVALS.map((_, k) => `<span class="rv-dot${k <= b ? ' on' : ''}"></span>`).join('');
  const inDays = (n) => (n === 1 ? 'demain' : `dans ${n} jours`);

  const html = {
    home() {
      const t = today(), s = RV.stats(ST, t), more = ST.items.length - s.due;
      const body = !ST.items.length
        ? `<section class="mt-win"><header class="mt-wh"><b>Carnet vide</b></header><div class="mt-wb pm-pad"><p>Aucune erreur à réviser pour l’instant.</p><p class="hint">Les questions ratées dans la campagne, l’examen blanc et les quiz de leçons s’ajoutent ici automatiquement, puis reviennent au bon moment pour s’ancrer en mémoire.${ST.mastered ? ` Tu as déjà maîtrisé ${ST.mastered} question${ST.mastered > 1 ? 's' : ''}.` : ''}</p></div></section>`
        : `<section class="mt-win"><header class="mt-wh"><b>Aujourd’hui</b></header><div class="mt-wb pm-pad">
            <div class="rv-big ${s.due ? 'neg' : 'pos'}">${s.due}</div><p class="pm-score">${s.due ? `question${s.due > 1 ? 's' : ''} à revoir` : 'rien à revoir : bravo'}</p>
            <div class="acts">${s.due ? `<button class="btn primary big" type="button" data-rv="start">Réviser (${Math.min(s.due, RV.SESSION)})</button>` : ''}${more > 0 ? `<button class="btn" type="button" data-rv="practice">S’entraîner sur tout le carnet (${ST.items.length})</button>` : ''}</div>
            ${s.due ? '' : '<p class="hint">Les prochaines questions reviendront à leur échéance. L’entraînement libre ne compte pas pour les points.</p>'}</div></section>
          <section class="mt-win"><header class="mt-wh"><b>Mémoire</b><span class="mt-wsub">${s.total} au carnet · ${s.mastered} maîtrisée${s.mastered > 1 ? 's' : ''}</span></header><div class="mt-wb pm-pad">
            <div class="rv-boxes">${s.boxes.map((n, k) => `<div class="rv-box"><i style="height:${Math.min(100, 12 + n * 14)}%"></i><b>${n}</b><span>${RV.INTERVALS[k]} j</span></div>`).join('')}</div>
            <p class="fine">Une bonne réponse fait avancer d’une boîte, une erreur ramène à la première. Après la dernière boîte, la question est maîtrisée.</p></div></section>
          ${s.weak.length ? `<section class="mt-win"><header class="mt-wh"><b>Points faibles</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>${s.weak.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r neg">${v} erreur${v > 1 ? 's' : ''}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
          <p class="acts"><button class="btn ghost sm" type="button" data-rv="clear">Vider le carnet</button></p>`;
      return `<div class="mt-bar pm-bar"><b class="pm-title">Révision · carnet d’erreurs</b><span class="sp"></span><button class="btn ghost" type="button" data-rv="home">Accueil</button></div><div class="cp-level">${body}</div>`;
    },
    play() {
      const it = S.queue[S.i], q = it.q, a = S.answered;
      const input = q.type === 'mcq'
        ? `<div class="cp-opts">${q.opts.map((o, k) => `<button type="button" class="ex-opt${a ? (k === q.a ? ' good' : String(k) === String(a.v) ? ' bad' : '') : ''}" data-rv-a="${k}"${a ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>`
        : `<div class="cp-num"><input id="rv-in" inputmode="decimal" autocomplete="off" placeholder="Ta réponse"${a ? ' disabled value="' + esc(a.v) + '"' : ''}><span>${esc(q.num.unit)}</span>${a ? '' : '<button class="btn primary" type="button" data-rv="submit">Valider</button>'}</div>`;
      const fb = a ? `<div class="fd ${a.ok ? 'good' : 'warn'}"><i></i><div><b>${a.ok ? 'Exact.' : 'Pas tout à fait.'}</b><p>${esc(q.expl || '')}</p>${q.type === 'num' && !a.ok ? `<p>Réponse attendue : <b>${esc(String(q.num.answer.toFixed(q.num.dec)).replace('.', ','))} ${esc(q.num.unit)}</b>.</p>` : ''}
        <p class="fine">${a.res ? (a.res.mastered ? 'Question maîtrisée : elle quitte le carnet.' : a.ok ? `Elle reviendra ${inDays(a.res.next)}.` : 'Elle reviendra demain.') : 'Entraînement libre : le calendrier ne change pas.'}</p></div></div>
        <button class="btn primary big" type="button" data-rv="next">${S.i + 1 >= S.queue.length ? 'Voir le résultat' : 'Question suivante'} ▶</button>` : '';
      return `<div class="mt-bar pm-bar"><b class="pm-title">Révision${S.practice ? ' libre' : ''} · ${S.i + 1} sur ${S.queue.length}</b><span class="sp"></span><div class="mt-prog"><div class="ptxt">${esc(it.title || 'Carnet')}</div><div class="prog"><i style="width:${(S.i / S.queue.length) * 100}%"></i></div></div><button class="btn ghost" type="button" data-rv="quit">Quitter</button></div>
        <div class="cp-play"><section class="mt-win"><header class="mt-wh"><b>Question ${S.i + 1}</b><span class="mt-wsub rv-dots">${dots(it.box)}</span></header><div class="mt-wb pm-pad">
          <p class="ex-text">${esc(q.text)}</p>${q.svg ? `<div class="pm-chart">${q.svg}</div>` : ''}${q.html || ''}
          ${input}${fb}</div></section></div>`;
    },
    result() {
      const n = S.queue.length;
      return `<div class="mt-bar pm-bar"><b class="pm-title">Révision terminée</b><span class="sp"></span><button class="btn ghost" type="button" data-rv="home">Accueil</button></div>
        <div class="cp-level"><section class="mt-win"><header class="mt-wh"><b>Résultat</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${S.right / n >= 0.7 ? 'pos' : 'neg'}">${S.right}/${n}</div>
          <p class="pm-score">${S.mastered ? `${S.mastered} question${S.mastered > 1 ? 's' : ''} maîtrisée${S.mastered > 1 ? 's' : ''}` : 'Chaque rappel renforce la mémoire'}</p>
          ${S.wrong.length ? `<p class="hint">Reviendront demain : ${S.wrong.map((w) => esc(w)).join(' · ')}</p>` : '<p class="hint">Aucune erreur dans cette séance.</p>'}
          <div class="acts"><button class="btn primary" type="button" data-rv="home">Retour au carnet</button></div></div></section></div>`;
    },
  };
  function render() {
    const root = $('#screen-review');
    if (!root) return;
    root.innerHTML = html[S.view]();
    root.scrollTop = 0;
    if (S.view === 'play') { const inp = $('#rv-in'); if (inp && !S.answered) inp.focus(); }
    renderCard();
  }
  function renderCard() {
    const box = $('#review-card');
    if (!box) return;
    const due = RV.dueCount();
    box.innerHTML = `<h2>Révision · carnet d’erreurs${due ? ` <span class="tag soon">${due} à revoir</span>` : ''}</h2>
      <p class="hint">${ST.items.length ? `${ST.items.length} question${ST.items.length > 1 ? 's' : ''} au carnet · ${ST.mastered} maîtrisée${ST.mastered > 1 ? 's' : ''}. Les erreurs reviennent à des intervalles croissants pour s’ancrer.` : 'Tes erreurs de la campagne, de l’examen et des quiz arrivent ici, puis reviennent au bon moment.'}</p>
      <div class="acts"><button class="btn${due ? ' primary' : ''}" type="button" data-rv="open">${due ? `Réviser (${Math.min(due, RV.SESSION)})` : 'Ouvrir le carnet'}</button></div>`;
  }
  RV.open = () => { S.view = 'home'; APP().show('review'); render(); };

  function begin(practice) {
    const list = practice ? ST.items.slice().sort((a, b) => a.box - b.box) : RV.due(ST, today());
    const picked = list.slice(0, practice ? 15 : RV.SESSION);
    if (!picked.length) return;
    Object.assign(S, { view: 'play', queue: picked.map((x) => ({ key: x.key, title: x.title, box: x.box, q: x.q, due: x.due <= today() })), i: 0, right: 0, answered: null, practice, mastered: 0, wrong: [] });
    render();
  }
  function answer(raw) {
    if (S.answered) return;
    const it = S.queue[S.i], ok = check(it.q, raw);
    let res = null;
    if (it.due || !S.practice) res = RV.answer(ST, it.key, ok, today());
    if (ok) S.right++; else S.wrong.push(it.title || 'question');
    if (res && res.mastered) S.mastered++;
    S.answered = { v: raw, ok, res };
    save();
    render();
  }
  function finish() {
    S.view = 'result';
    save();
    if (!S.practice) {
      try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'review', right: S.right, total: S.queue.length, mastered: S.mastered, masteredTotal: ST.mastered } })); } catch (e) { /* rien */ }
    }
    render();
  }
  // une question ratée ailleurs entre au carnet ; une réussie qui y figure compte comme un rappel
  window.addEventListener('ta:miss', (ev) => {
    const d = ev.detail;
    if (!d || !d.key || !d.q) return;
    try { RV.add(ST, { key: d.key, src: d.src, title: d.title, q: d.q }, today()); save(); renderCard(); } catch (e) { /* rien */ }
  });
  window.addEventListener('ta:hit', (ev) => {
    const d = ev.detail;
    if (!d || !d.key) return;
    const it = ST.items.find((x) => x.key === d.key);
    if (it && it.due <= today()) { RV.answer(ST, d.key, true, today()); save(); renderCard(); }
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-rv-a]');
    if (a && !a.disabled) { answer(a.dataset.rvA); return; }
    const b = e.target.closest('[data-rv]');
    if (!b) return;
    const k = b.dataset.rv;
    if (k === 'open') RV.open();
    else if (k === 'start') begin(false);
    else if (k === 'practice') begin(true);
    else if (k === 'home') { renderCard(); APP().show('home'); }
    else if (k === 'quit') { S.view = 'home'; render(); }
    else if (k === 'submit') { const v = ($('#rv-in') || {}).value; if (v != null && String(v).trim()) answer(v); }
    else if (k === 'next') { if (S.i + 1 >= S.queue.length) finish(); else { S.i++; S.answered = null; render(); } }
    else if (k === 'clear') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmer : tout effacer'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Vider le carnet'; }, 4000); return; }
      ST = RV.fresh(); save(); render();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'rv-in') { e.preventDefault(); const v = e.target.value; if (String(v).trim()) answer(v); } });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
