/* Trading Academy — campagne « La Maison Boréale » : carte, niveaux, exercices, progression.
   100 niveaux linéaires, une compétence par niveau, trois difficultés (Apprenti, Compagnon, Maître).
   Les données du niveau sont dans camp-data.js, les exercices sont fabriqués par camp-gen.js. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CAMP = TA.CAMP, CG = TA.CAMPGEN;
  if (!CAMP || !CG) return;
  const LV = CAMP.LEVELS, N = LV.length;

  /* ---------- logique pure (testable) ---------- */
  const CP = (TA.CAMPLOGIC = {});
  CP.unlocked = (stars, n) => n === 1 || (stars[n - 1] || 0) >= 1;
  CP.tierOpen = (stars, n, t) => CP.unlocked(stars, n) && (t === 0 || (stars[n] || 0) >= t);
  CP.next = (stars) => { for (let n = 1; n <= N; n++) if ((stars[n] || 0) < 1) return n; return null; };
  CP.totalStars = (stars) => Object.values(stars).reduce((s, x) => s + x, 0);
  // tolérance d'une réponse numérique selon la difficulté
  CP.check = (q, raw, tier) => {
    if (q.type === 'mcq') return Number(raw) === q.a;
    const v = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.').replace(/[−–]/g, '-'));
    if (!Number.isFinite(v)) return false;
    const { answer, dec } = q.num, rel = q.tol != null ? q.tol : tier >= 2 ? 0.02 : 0.05;
    const abs = Math.max(Math.abs(answer) * rel, rel === 0 ? 0.5 * Math.pow(10, -dec) : 0.5 * Math.pow(10, -dec));
    return Math.abs(v - answer) <= abs + 1e-9;
  };
  CP.badgesFor = (stars, n) => {
    const out = [], ch = LV[n - 1].ch;
    const inCh = LV.filter((l) => l.ch === ch);
    if (inCh.every((l) => (stars[l.n] || 0) >= 1)) out.push('camp' + ch);
    if ((stars[N] || 0) >= 1) out.push('campAll');
    if (LV.every((l) => (stars[l.n] || 0) >= 3)) out.push('campGold');
    return out;
  };
  // fabrique les questions d'une tentative (ctx fourni : rng, assets, FD, PT, IPS, PM, banks, series)
  CP.build = (ctx, level, tier) => {
    const T = CAMP.TIERS[tier], out = [];
    ctx.lvl = tier;
    for (let i = 0; i < T.n; i++) {
      const spec = level.specs[i % level.specs.length];
      const q = CG.make(ctx, spec);
      if (q.type === 'num' && tier === 0) { const c = CG.numChoices(ctx.rng, q); q.type = 'mcq'; q.opts = c.opts; q.a = c.a; }
      out.push(q);
    }
    return out;
  };

  /* ---------- interface ---------- */
  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'ta:camp';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } } };
  const APP = () => window.TA_APP;
  const P = (() => {
    const s = store.get(KEY), p = { v: 1, stars: {}, seen: {}, best: {} };
    if (s && s.v === 1 && s.stars && typeof s.stars === 'object') {
      for (const [k, v] of Object.entries(s.stars)) { const n = +k; if (Number.isInteger(n) && n >= 1 && n <= N && Number.isInteger(v)) p.stars[n] = Math.min(3, Math.max(0, v)); }   // jamais plus de 3 étoiles
      if (s.seen && typeof s.seen === 'object') p.seen = s.seen;
      if (s.best && typeof s.best === 'object') p.best = s.best;
    }
    return p;
  })();
  const save = () => store.set(KEY, P);
  const S = { view: 'map', n: 1, tier: 0, qs: [], i: 0, right: 0, answered: null, hint: false, busy: false, log: [] };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const stars = (n) => '★'.repeat(P.stars[n] || 0) + '☆'.repeat(3 - (P.stars[n] || 0));

  // données réelles pour les exercices techniques
  const cache = new Map();
  const TECH = ['SPY', 'QQQ', 'GLD', 'XOM', 'JNJ', 'KO'], SER = ['SPY', 'QQQ', 'IWM', 'XIU_TO', 'XEG_TO', 'GLD', 'TLT'];
  async function load(id) {
    if (cache.has(id)) return cache.get(id);
    const r = await fetch(`data/${id}.json`);
    if (!r.ok) throw new Error('Cotes indisponibles : ' + id);
    const d = await r.json();
    cache.set(id, d);
    return d;
  }
  const needs = (level) => ({
    tech: level.specs.some((s) => ['candlePat', 'volRead', 'trendId', 'trendPick', 'swingRead', 'srPick', 'breakVol', 'maRead', 'rsiRead', 'macdRead', 'bandRead', 'fakeBreak', 'atrStop', 'tradeRule'].includes(s.kind)),
    series: level.specs.some((s) => s.kind === 'corrPick'),
  });
  async function makeCtx(level, rng) {
    const ctx = { rng, lvl: 0, assets: [], FD: TA.FUND, PT: TA.PATTERN, IPS: TA.IPS, PM: TA.PM, banks: CAMP.BANKS, series: null };
    const nd = needs(level);
    if (nd.tech) {
      const ids = TECH.slice().sort(() => rng() - 0.5).slice(0, 3);
      for (const id of ids) { const d = await load(id); ctx.assets.push({ id, d, hasVol: d.v && d.v.some((x) => x > 0) }); }
    }
    if (nd.series) { ctx.series = {}; for (const id of SER) { const d = await load(id); ctx.series[id] = { t: d.t, c: d.c }; } }
    return ctx;
  }

  /* ----- rendu ----- */
  const html = {
    map() {
      const next = CP.next(P.stars), total = CP.totalStars(P.stars);
      const chs = CAMP.CHAPTERS.map((ch) => {
        const lvls = LV.filter((l) => l.ch === ch.id), done = lvls.filter((l) => (P.stars[l.n] || 0) >= 1).length, open = CP.unlocked(P.stars, lvls[0].n);
        return `<section class="mt-win cp-ch${open ? '' : ' lock'}"><header class="mt-wh"><b>${ch.id}. ${esc(ch.title)}</b><span class="mt-wsub">${esc(ch.topic)} · ${done}/${lvls.length}</span></header>
          <div class="cp-grid">${lvls.map((l) => { const un = CP.unlocked(P.stars, l.n), s = P.stars[l.n] || 0; return `<button type="button" class="cp-tile${un ? '' : ' lock'}${s ? ' done' : ''}${l.boss ? ' boss' : ''}${l.n === next ? ' next' : ''}" data-cp-open="${l.n}"${un ? '' : ' disabled'} title="${esc(l.title)}"><b>${l.n}</b><span>${esc(l.title)}</span><i>${un ? stars(l.n) : '🔒'}</i></button>`; }).join('')}</div></section>`;
      }).join('');
      return `<div class="mt-bar pm-bar"><b class="pm-title">Campagne · La Maison Boréale</b><span class="sp"></span><span class="fd-top">${total} étoiles sur ${N * 3}</span><span class="mt-sep"></span>${next ? `<button class="btn primary" type="button" data-cp-open="${next}">Continuer · niveau ${next}</button>` : '<b class="pos">Campagne terminée</b>'}<button class="btn ghost" type="button" data-cp="home">Accueil</button></div><div class="cp-map">${chs}</div>`;
    },
    level() {
      const l = LV[S.n - 1], ch = CAMP.CHAPTERS[l.ch - 1], first = LV.find((x) => x.ch === l.ch).n === l.n;
      const intro = first && !P.seen[l.ch] ? `<section class="mt-win cp-story"><header class="mt-wh"><b>Chapitre ${ch.id} · ${esc(ch.title)}</b></header><div class="mt-wb pm-pad"><p class="cp-quote">${esc(ch.intro)}</p></div></section>` : '';
      const tiers = CAMP.TIERS.map((t) => { const open = CP.tierOpen(P.stars, S.n, t.id), got = (P.stars[S.n] || 0) > t.id; return `<button type="button" class="btn ${open ? 'primary' : ''} cp-tier" data-cp-tier="${t.id}"${open ? '' : ' disabled'}><b>${t.icon} ${t.name}</b><span>${got ? '★ réussi' : open ? `${t.n} questions · ${Math.round(t.pass * 100)} %` : '🔒 réussis le palier précédent'}</span></button>`; }).join('');
      return `<div class="mt-bar pm-bar"><b class="pm-title">Niveau ${l.n} · ${esc(l.title)}</b><span class="sp"></span><span class="fd-top">${stars(l.n)}</span><span class="mt-sep"></span><button class="btn ghost" type="button" data-cp="map">Carte</button></div>
        <div class="cp-level">${intro}
          <section class="mt-win"><header class="mt-wh"><b>${l.boss ? 'Épreuve du chapitre' : 'Mini-leçon'}</b></header><div class="mt-wb pm-pad"><p class="cp-quote">${esc(l.beat)}</p><p>${esc(l.concept)}</p></div></section>
          <section class="mt-win"><header class="mt-wh"><b>Choisis ta difficulté</b></header><div class="mt-wb pm-pad cp-tiers">${tiers}<p class="fine">Chaque palier réussi donne une étoile et débloque le suivant. Réussis l’Apprenti pour passer au niveau suivant.</p></div></section></div>`;
    },
    play() {
      const q = S.qs[S.i], T = CAMP.TIERS[S.tier], a = S.answered, l = LV[S.n - 1];
      const input = q.type === 'mcq'
        ? `<div class="cp-opts">${q.opts.map((o, k) => `<button type="button" class="ex-opt${a ? (k === q.a ? ' good' : String(k) === String(a.v) ? ' bad' : '') : ''}" data-cp-a="${k}"${a ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>`
        : `<div class="cp-num"><input id="cp-in" inputmode="decimal" autocomplete="off" placeholder="Ta réponse"${a ? ' disabled value="' + esc(a.v) + '"' : ''}><span>${esc(q.num.unit)}</span>${a ? '' : '<button class="btn primary" type="button" data-cp="submit">Valider</button>'}</div>`;
      return `<div class="mt-bar pm-bar"><b class="pm-title">Niveau ${l.n} · ${esc(l.title)} · ${T.name}</b><span class="sp"></span><div class="mt-prog"><div class="ptxt">Question ${S.i + 1} sur ${S.qs.length}</div><div class="prog"><i style="width:${(S.i / S.qs.length) * 100}%"></i></div></div><button class="btn ghost" type="button" data-cp="level">Quitter</button></div>
        <div class="cp-play"><section class="mt-win"><header class="mt-wh"><b>Question ${S.i + 1}</b></header><div class="mt-wb pm-pad">
          <p class="ex-text">${esc(q.text)}</p>${q.svg ? `<div class="pm-chart">${q.svg}</div>` : ''}${q.html || ''}
          ${input}
          ${T.hint && !a ? `<button class="btn sm ghost" type="button" data-cp="hint">${S.hint ? 'Masquer l’indice' : 'Indice'}</button>${S.hint ? `<p class="hint">${esc(q.hint || '')}</p>` : ''}` : ''}
          ${a ? `<div class="fd ${a.ok ? 'good' : 'warn'}"><i></i><div><b>${a.ok ? 'Exact.' : 'Pas tout à fait.'}</b><p>${esc(q.expl || '')}</p>${q.type === 'num' && !a.ok ? `<p>Réponse attendue : <b>${esc(String(q.num.answer.toFixed(q.num.dec)).replace('.', ','))} ${esc(q.num.unit)}</b>.</p>` : ''}</div></div><button class="btn primary big" type="button" data-cp="next">${S.i + 1 >= S.qs.length ? 'Voir le résultat' : 'Question suivante'} ▶</button>` : ''}
        </div></section></div>`;
    },
    result() {
      const l = LV[S.n - 1], T = CAMP.TIERS[S.tier], n = S.qs.length, pct = S.right / n, pass = pct >= T.pass;
      const ch = CAMP.CHAPTERS[l.ch - 1], last = LV.filter((x) => x.ch === l.ch).slice(-1)[0].n === l.n;
      const nextN = S.n < N ? S.n + 1 : null;
      return `<div class="mt-bar pm-bar"><b class="pm-title">Niveau ${l.n} · ${esc(l.title)} · ${T.name}</b><span class="sp"></span><button class="btn ghost" type="button" data-cp="map">Carte</button></div>
        <div class="cp-level"><section class="mt-win"><header class="mt-wh"><b>${pass ? 'Réussi' : 'À retenter'}</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${pass ? 'pos' : 'neg'}">${S.right}/${n}</div><p class="pm-score">${Math.round(pct * 100)} % · seuil ${Math.round(T.pass * 100)} %</p>
          <p class="cp-stars">${stars(l.n)}</p>
          ${pass ? `<p class="hint">${S.tier < 2 ? 'Tu peux aussi viser le palier suivant pour gagner une étoile de plus.' : 'Maîtrise complète de ce niveau.'}</p>` : '<p class="hint">Relis la mini-leçon, puis réessaie : chaque tentative tire de nouveaux exercices.</p>'}
          ${pass && last && S.tier === 0 ? `<p class="cp-quote">${esc(ch.outro)}</p>` : ''}
          <div class="acts">
            <button class="btn" type="button" data-cp-tier="${S.tier}">Rejouer ce palier</button>
            ${pass && S.tier < 2 && CP.tierOpen(P.stars, S.n, S.tier + 1) ? `<button class="btn" type="button" data-cp-tier="${S.tier + 1}">Palier ${CAMP.TIERS[S.tier + 1].name}</button>` : ''}
            ${pass && nextN && CP.unlocked(P.stars, nextN) ? `<button class="btn primary" type="button" data-cp-open="${nextN}">Niveau suivant ▶</button>` : ''}
          </div></div></section></div>`;
    },
  };
  function render() {
    const root = $('#screen-camp');
    if (!root) return;
    root.innerHTML = html[S.view]();
    root.scrollTop = 0;
    renderCard();
    if (S.view === 'play') { const inp = $('#cp-in'); if (inp && !S.answered) inp.focus(); }
  }
  function renderCard() {
    const box = $('#camp-card');
    if (!box) return;
    const next = CP.next(P.stars), total = CP.totalStars(P.stars), done = LV.filter((l) => (P.stars[l.n] || 0) >= 1).length;
    const l = next && LV[next - 1];
    box.innerHTML = `<h2>Campagne · La Maison Boréale <span class="tag soon">100 niveaux</span></h2>
      <p class="hint">Stagiaire à la Maison Boréale, tu apprends l’analyse technique, l’analyse fondamentale et la gestion de portefeuille, un niveau à la fois. Chaque niveau a trois difficultés.</p>
      <div class="prog"><i style="width:${(done / N) * 100}%"></i></div>
      <p class="fine">${done} niveaux sur ${N} · ${total} étoiles sur ${N * 3}</p>
      ${l ? `<p><b>Prochain :</b> niveau ${l.n}, ${esc(l.title)}</p><div class="acts"><button class="btn primary" type="button" data-cp-open="${l.n}">${done ? 'Continuer' : 'Commencer'} la campagne</button><button class="btn" type="button" data-cp="map-open">Voir la carte</button></div>` : '<p><b class="pos">Campagne terminée.</b></p><div class="acts"><button class="btn" type="button" data-cp="map-open">Voir la carte</button></div>'}`;
  }

  /* ----- actions ----- */
  async function startTier(t) {
    if (S.busy) return;
    S.busy = true;
    const l = LV[S.n - 1];
    try {
      const rng = mulberry(Math.floor(Math.random() * 2 ** 31));
      const ctx = await makeCtx(l, rng);
      S.tier = t; S.qs = CP.build(ctx, l, t); S.i = 0; S.right = 0; S.answered = null; S.hint = false; S.view = 'play';
      render();
    } catch (e) { const el = $('#screen-camp'); if (el) el.insertAdjacentHTML('afterbegin', `<p class="err">Impossible de préparer le niveau : ${esc(e.message)}</p>`); }
    S.busy = false;
  }
  function answer(raw) {
    if (S.answered) return;
    const q = S.qs[S.i], ok = CP.check(q, raw, S.tier);
    if (ok) S.right++;
    S.answered = { v: raw, ok };
    render();
  }
  function finish() {
    const T = CAMP.TIERS[S.tier], pass = S.right / S.qs.length >= T.pass, l = LV[S.n - 1];
    const before = P.stars[S.n] || 0;
    if (pass && before < S.tier + 1) P.stars[S.n] = S.tier + 1;
    const ch = l.ch;
    if (!P.seen[ch]) P.seen[ch] = true;
    const key = S.n + ':' + S.tier;
    P.best[key] = Math.max(P.best[key] || 0, S.right / S.qs.length);
    save();
    if (pass) {
      try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'camp', n: S.n, tier: S.tier, boss: !!l.boss, code: 'camp-' + S.n + '-' + S.tier, pct: S.right / S.qs.length, badgeIds: CP.badgesFor(P.stars, S.n), stars: CP.totalStars(P.stars) } })); } catch (e) { /* rien */ }
    }
    S.view = 'result'; render();
  }
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-cp-open]');
    if (open) {
      const n = +open.dataset.cpOpen;
      if (!CP.unlocked(P.stars, n)) return;
      S.n = n; S.view = 'level';
      const l = LV[n - 1], first = LV.find((x) => x.ch === l.ch).n === n;
      APP().show('camp'); render();
      if (first && !P.seen[l.ch]) { P.seen[l.ch] = true; save(); }
      return;
    }
    const t = e.target.closest('[data-cp-tier]');
    if (t && !t.disabled) { startTier(+t.dataset.cpTier); return; }
    const a = e.target.closest('[data-cp-a]');
    if (a && !a.disabled) { answer(a.dataset.cpA); return; }
    const b = e.target.closest('[data-cp]');
    if (!b) return;
    const k = b.dataset.cp;
    if (k === 'map-open') { S.view = 'map'; APP().show('camp'); render(); }
    else if (k === 'map') { S.view = 'map'; render(); }
    else if (k === 'level') { S.view = 'level'; render(); }
    else if (k === 'home') { renderCard(); APP().show('home'); }
    else if (k === 'submit') { const v = ($('#cp-in') || {}).value; if (v != null && String(v).trim()) answer(v); }
    else if (k === 'hint') { S.hint = !S.hint; render(); }
    else if (k === 'next') { if (S.i + 1 >= S.qs.length) finish(); else { S.i++; S.answered = null; S.hint = false; render(); } }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'cp-in') { e.preventDefault(); const v = e.target.value; if (String(v).trim()) answer(v); } });
  CP.progress = () => P;
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
