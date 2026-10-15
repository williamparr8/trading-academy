/* Trading Academy — Chasse aux figures : 10 graphiques synthétiques, une figure chartiste à reconnaître chacun.
   Les barres sont générées autour d'un tracé type (avec du bruit), jamais copiées d'un vrai marché. Chaque réponse
   explique l'implication habituelle de la figure, le stop et l'objectif mesuré. Logique pure dans TA.PATTERN. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const PT = (TA.PATTERN = {});
  const ROUNDS = 10, BARS = 64;
  PT.ROUNDS = ROUNDS; PT.BARS = BARS;
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  PT.rng = (seed) => mulberry(hash('PT|' + seed));

  // points clés (x de 0 à 1, y de 0 à 1, 1 = haut) ; le tracé passe par ces points
  PT.TYPES = [
    { id: 'dtop', name: 'Double sommet', pts: [[0, 0.2], [0.25, 0.8], [0.45, 0.5], [0.65, 0.8], [0.85, 0.35], [1, 0.12]],
      why: 'Deux hauts au même niveau : les acheteurs échouent deux fois. La cassure de la ligne de cou (le creux entre les sommets) confirme un renversement baissier.', how: 'Vente sous la ligne de cou, stop au-dessus des sommets, objectif = hauteur de la figure reportée vers le bas.' },
    { id: 'dbot', name: 'Double creux', pts: [[0, 0.8], [0.25, 0.2], [0.45, 0.5], [0.65, 0.2], [0.85, 0.65], [1, 0.88]],
      why: 'Deux bas au même niveau : les vendeurs échouent deux fois. La cassure de la ligne de cou confirme un renversement haussier.', how: 'Achat au-dessus de la ligne de cou, stop sous les creux, objectif = hauteur de la figure.' },
    { id: 'hs', name: 'Épaule-tête-épaule', pts: [[0, 0.15], [0.2, 0.65], [0.32, 0.45], [0.5, 0.95], [0.68, 0.45], [0.8, 0.65], [0.92, 0.3], [1, 0.12]],
      why: 'Trois sommets dont le central est le plus haut : l’élan haussier s’épuise. Cassure de la ligne de cou = renversement baissier.', how: 'Vente sous la ligne de cou, stop au-dessus de la seconde épaule, objectif = distance tête-ligne de cou.' },
    { id: 'asc', name: 'Triangle ascendant', pts: [[0, 0.1], [0.2, 0.75], [0.35, 0.35], [0.5, 0.75], [0.62, 0.5], [0.76, 0.75], [0.86, 0.62], [1, 0.97]],
      why: 'Résistance plate et creux de plus en plus hauts : la pression acheteuse monte. La cassure se fait souvent vers le haut.', how: 'Achat sur cassure de la résistance avec volume, stop sous le dernier creux, objectif = hauteur de la base.' },
    { id: 'desc', name: 'Triangle descendant', pts: [[0, 0.9], [0.2, 0.25], [0.35, 0.65], [0.5, 0.25], [0.62, 0.5], [0.76, 0.25], [0.86, 0.38], [1, 0.03]],
      why: 'Support plat et sommets de plus en plus bas : la pression vendeuse monte. La cassure se fait souvent vers le bas.', how: 'Vente sous le support, stop au-dessus du dernier sommet, objectif = hauteur de la figure.' },
    { id: 'bflag', name: 'Drapeau haussier', pts: [[0, 0.05], [0.4, 0.85], [0.5, 0.74], [0.6, 0.8], [0.7, 0.68], [0.8, 0.74], [1, 1]],
      why: 'Forte impulsion (mât) puis courte consolidation légèrement descendante : une pause avant la reprise de la hausse.', how: 'Achat à la cassure du drapeau, stop sous son creux, objectif = hauteur du mât.' },
    { id: 'rbear', name: 'Drapeau baissier', pts: [[0, 0.95], [0.4, 0.15], [0.5, 0.26], [0.6, 0.2], [0.7, 0.32], [0.8, 0.26], [1, 0]],
      why: 'Forte chute (mât) puis courte consolidation légèrement ascendante : une pause avant la reprise de la baisse.', how: 'Vente à la cassure vers le bas, stop au-dessus du sommet du drapeau, objectif = hauteur du mât.' },
    { id: 'range', name: 'Rectangle (range)', pts: [[0, 0.5], [0.12, 0.85], [0.28, 0.15], [0.44, 0.85], [0.6, 0.15], [0.76, 0.85], [0.9, 0.15], [1, 0.5]],
      why: 'Le prix oscille entre un support et une résistance : équilibre entre acheteurs et vendeurs, sans tendance.', how: 'Achat près du support, vente près de la résistance, avec stop de l’autre côté ; la cassure du rectangle donne la direction suivante.' },
  ];

  // série OHLC synthétique : interpolation lissée entre les points clés, bruit proportionnel, mèches
  PT.generate = function (rng, type) {
    const pts = type.pts, closes = [];
    for (let i = 0; i < BARS; i++) {
      const x = i / (BARS - 1);
      let j = 0; while (j < pts.length - 2 && x > pts[j + 1][0]) j++;
      const [x0, y0] = pts[j], [x1, y1] = pts[j + 1], t = x1 === x0 ? 0 : (x - x0) / (x1 - x0), s = t * t * (3 - 2 * t);
      closes.push(y0 + (y1 - y0) * (0.6 * t + 0.4 * s));
    }
    const base = 40 + rng() * 120, amp = base * (0.12 + rng() * 0.12), o = [], h = [], l = [], c = [];
    let prev = closes[0];
    for (let i = 0; i < BARS; i++) {
      const target = closes[i], noise = (rng() - 0.5) * 0.06;
      const cl = base + amp * (target + noise), op = i === 0 ? cl : base + amp * (prev + (rng() - 0.5) * 0.02);
      const hi = Math.max(op, cl) + amp * (0.01 + rng() * 0.04), lo = Math.min(op, cl) - amp * (0.01 + rng() * 0.04);
      o.push(op); c.push(cl); h.push(hi); l.push(lo); prev = target + noise * 0.5;
    }
    return { o, h, l, c };
  };
  PT.question = function (rng) {
    const type = PT.TYPES[Math.floor(rng() * PT.TYPES.length)];
    const wrong = PT.TYPES.filter((t) => t.id !== type.id).sort(() => rng() - 0.5).slice(0, 3);
    const opts = [type, ...wrong].sort(() => rng() - 0.5);
    return { type, opts: opts.map((t) => t.id), d: PT.generate(rng, type) };
  };

  /* ---------- écran ---------- */
  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = { q: null, n: 0, right: 0, streak: 0, best: 0, pts: 0, code: '', rng: null, answered: null, log: [] };
  const HKEY = 'ta:patternhist';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } } };
  const APP = () => window.TA_APP;
  const newCode = () => 'PT-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const typeOf = (id) => PT.TYPES.find((t) => t.id === id);

  function svg(d) {
    const W = 640, H = 260, n = d.c.length, bw = (W - 20) / n;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { lo = Math.min(lo, d.l[i]); hi = Math.max(hi, d.h[i]); }
    const Y = (v) => 10 + ((hi - v) / (hi - lo)) * (H - 20);
    let s = '';
    for (let i = 0; i < n; i++) {
      const up = d.c[i] >= d.o[i], col = up ? '#1fb36b' : '#f23d4a', x = 10 + i * bw + bw / 2;
      s += `<line x1="${x}" x2="${x}" y1="${Y(d.h[i])}" y2="${Y(d.l[i])}" stroke="${col}"/><rect x="${x - bw * 0.32}" y="${Math.min(Y(d.o[i]), Y(d.c[i]))}" width="${bw * 0.64}" height="${Math.max(1, Math.abs(Y(d.o[i]) - Y(d.c[i])))}" fill="${col}"/>`;
    }
    return `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique synthétique à identifier">${s}</svg>`;
  }
  function start(code) {
    S.code = code || newCode(); S.rng = PT.rng(S.code); S.n = 0; S.right = 0; S.streak = 0; S.best = 0; S.pts = 0; S.answered = null; S.log = [];
    S.q = PT.question(S.rng); APP().show('pattern'); render();
  }
  function render() {
    const root = $('#screen-pattern');
    if (!root) return;
    if (S.n >= ROUNDS) { renderEnd(root); return; }
    const q = S.q, a = S.answered, t = a && typeOf(q.type.id);
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Chasse aux figures · ${S.n + 1} sur ${ROUNDS}</b><span class="sp"></span><span class="fd-top">Points <b>${S.pts}</b> · série <b>${S.streak}</b></span><span class="mt-sep"></span><button class="btn ghost" type="button" data-pt="quit">Quitter</button></div>
      <div class="pm-grid fl-grid"><section class="pm-center"><div class="mt-win"><header class="mt-wh"><b>Quelle figure vois-tu ?</b></header><div class="pm-chart">${svg(q.d)}</div></div></section>
        <aside class="mt-win pm-right"><header class="mt-wh"><b>Ta réponse</b></header><div class="mt-wb pm-pad">
          ${a ? `<div class="fl-res ${a === q.type.id ? 'pos' : 'neg'}"><b>${a === q.type.id ? 'Exact' : 'Raté'}</b><p>C’était : <b>${esc(t.name)}</b></p></div><p class="hint">${esc(t.why)}</p><p class="hint"><b>Comment la trader :</b> ${esc(t.how)}</p>
            <button class="btn primary big" type="button" data-pt="next">${S.n + 1 >= ROUNDS ? 'Voir le bilan' : 'Figure suivante'} ▶</button>`
          : `<div class="fl-btns">${q.opts.map((id) => `<button class="btn big" type="button" data-pt-a="${id}">${esc(typeOf(id).name)}</button>`).join('')}</div>`}
          <p class="fine">Les graphiques sont générés : aucun n’est un vrai marché. Code ${esc(S.code)}.</p>
        </div></aside></div>`;
  }
  function answer(id) {
    if (S.answered) return;
    S.answered = id;
    const ok = id === S.q.type.id;
    if (ok) { S.right++; S.streak++; S.best = Math.max(S.best, S.streak); S.pts += 10 + Math.min(10, S.streak * 2); } else S.streak = 0;
    S.log.push({ t: S.q.type.id, a: id, ok });
    render();
  }
  function next() { S.n++; S.answered = null; if (S.n >= ROUNDS) finish(); else { S.q = PT.question(S.rng); render(); } }
  function finish() {
    const h = store.get(HKEY) || [];
    h.unshift({ code: S.code, right: S.right }); store.set(HKEY, h.slice(0, 8));
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'pattern', right: S.right, total: ROUNDS, best: S.best, code: S.code } })); } catch (e) { /* rien */ }
    render(); renderCard();
  }
  function renderEnd(root) {
    const miss = {};
    S.log.filter((x) => !x.ok).forEach((x) => { miss[x.t] = (miss[x.t] || 0) + 1; });
    const worst = Object.entries(miss).sort((a, b) => b[1] - a[1])[0];
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Bilan · Chasse aux figures · code ${esc(S.code)}</b><span class="sp"></span><button class="btn" type="button" data-pt="replay">Rejouer ces graphiques</button><button class="btn primary" type="button" data-pt="quit">Terminer</button></div>
      <div class="pm-report"><section class="mt-win pm-grade"><header class="mt-wh"><b>Résultat</b></header><div class="mt-wb pm-pad"><div class="pm-big ${S.right >= 8 ? 'pos' : S.right <= 4 ? 'neg' : ''}">${S.right}/${ROUNDS}</div><p class="hint">${S.pts} points · meilleure série ${S.best}</p>
        ${worst ? `<p class="hint">À revoir : <b>${esc(typeOf(worst[0]).name)}</b>. ${esc(typeOf(worst[0]).why)}</p>` : '<p class="hint">Sans faute : tu reconnais bien les grandes figures.</p>'}</div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Tes réponses</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>${S.log.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(typeOf(x.t).name)}</td><td>${x.ok ? '<b class="pos">✓</b>' : '<b class="neg">✗</b> ' + esc(typeOf(x.a).name)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }
  function renderCard() {
    const box = $('#pattern-card');
    if (!box) return;
    const h = store.get(HKEY) || [];
    box.innerHTML = `<h2>Chasse aux figures <span class="tag soon">nouveau</span></h2>
      <p class="hint">Dix graphiques, une figure chartiste à reconnaître chacun : double sommet, épaule-tête-épaule, triangles, drapeaux, range. Après chaque réponse : ce que la figure annonce et comment la trader.</p>
      <label class="field"><span>Code (facultatif)</span><input id="pt-code" maxlength="12" placeholder="PT-XXXX-XXXX" spellcheck="false" autocomplete="off"></label>
      <button class="btn primary big" type="button" data-pt-home="start">Lancer 10 figures</button>
      ${h.length ? `<p class="sub">Dernières séances</p><div class="glist">${h.slice(0, 3).map((x) => `<div class="grow"><span class="mono">${esc(x.code)}</span><span class="mono"><b>${x.right}</b>/${ROUNDS}</span></div>`).join('')}</div>` : ''}`;
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-pt-home]');
    if (h) { start((($('#pt-code') || {}).value || '').trim().toUpperCase()); return; }
    const a = e.target.closest('[data-pt-a]');
    if (a) { answer(a.dataset.ptA); return; }
    const b = e.target.closest('[data-pt]');
    if (!b) return;
    if (b.dataset.pt === 'next') next();
    else if (b.dataset.pt === 'quit') { renderCard(); APP().show('home'); }
    else if (b.dataset.pt === 'replay') start(S.code);
  });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
