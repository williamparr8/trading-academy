/* Trading Academy — habillage façon MetaTrader 5.
   Menus, observation du marché, navigateur, fenêtre d'ordre à deux boutons (vendre au Bid / acheter à l'Ask),
   panneaux qu'on ouvre et ferme, barre d'état. Aucune règle de jeu ici : tout passe par les boutons et les
   champs de app.js (engine.js reste la seule source de vérité). */
(function () {
  'use strict';
  const TA = (window.TA = window.TA || {});
  const MT = (TA.MT5 = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const nf = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const S = { watch: true, nav: true, tool: true, order: true, open: null, prevBid: null, dir: '' };
  const A = () => window.TA_APP || null;
  const game = () => $('#screen-game');
  const click = (sel) => { const e = $(sel); if (e && !e.disabled) e.click(); };
  const tool = (t) => click(`#draw-tools [data-tool="${t}"]`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- données d'affichage ---------- */
  const symbol = (a) => (a.g && a.g.live && a.g.meta && a.g.meta.s ? a.g.meta.s : 'ACTIF');
  const frame = (a) => (a.g && a.g.style === 'long' ? 'W1' : 'D1');
  function login(a) {
    const s = String((a.cfg && (a.cfg.code || a.cfg.challenge)) || 'academie');
    let h = 7;
    for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
    return String(10000000 + (h % 89999999));
  }
  const barLabel = (a) => {
    const g = a.g, i = a.st.idx;
    if (g.live) return new Date(g.t[i] * 86400000).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return g.unit + (i - g.startIdx);
  };
  // « 100,52 » → petits chiffres puis les deux derniers en gros, comme les boutons d'ordre de la plateforme
  function pxHTML(p) {
    const s = nf.format(p), k = s.lastIndexOf(',');
    return k < 0 ? esc(s) : `${esc(s.slice(0, k + 1))}<b>${esc(s.slice(k + 1))}</b>`;
  }

  /* ---------- icônes des objets graphiques ---------- */
  const svg = (inner) => `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${inner}</svg>`;
  const ICONS = {
    cursor: svg('<path d="M3 1.5l7 6.2-3.1.5 1.9 3.6-1.5.8-1.9-3.6L3 11z" fill="#fff" stroke="#222" stroke-linejoin="round"/>'),
    h: svg('<path d="M1 7h12" stroke="#2a5db0" stroke-width="1.7"/>'),
    t: svg('<path d="M2 12L12 3" stroke="#2a5db0" stroke-width="1.7"/><circle cx="2.5" cy="11.5" r="1.4" fill="#fff" stroke="#2a5db0"/><circle cx="11.5" cy="3.5" r="1.4" fill="#fff" stroke="#2a5db0"/>'),
    r: svg('<rect x="1.5" y="3.5" width="11" height="7" fill="#f3d9a0" stroke="#b07d1a"/>'),
    sl: svg('<path d="M1 7h12" stroke="#d81e27" stroke-width="1.7" stroke-dasharray="3 2"/>'),
    tp: svg('<path d="M1 7h12" stroke="#0b3fd6" stroke-width="1.7" stroke-dasharray="3 2"/>'),
    erase: svg('<path d="M3 10l5-6 4 3-4 5H5z" fill="#f4b8b8" stroke="#8a4a4a" stroke-linejoin="round"/>'),
  };
  function decorateTools() {
    for (const b of $$('#draw-tools [data-tool]')) {
      if (b.dataset.ic || !ICONS[b.dataset.tool]) continue;
      b.dataset.ic = '1';
      b.insertAdjacentHTML('afterbegin', ICONS[b.dataset.tool]);
    }
  }

  /* ---------- panneaux ---------- */
  function applyLayout() {
    const g = game();
    if (!g) return;
    g.classList.toggle('no-watch', !S.watch);
    g.classList.toggle('no-nav', !S.nav);
    g.classList.toggle('no-left', !S.watch && !S.nav);
    g.classList.toggle('no-tool', !S.tool);
    g.classList.toggle('no-right', !S.order);
    const b = $('#mt-neworder');
    if (b) b.setAttribute('aria-pressed', String(S.order));
  }
  function toggle(k) { S[k] = !S[k]; applyLayout(); }

  /* ---------- fenêtres modales (aide) ---------- */
  function modal(title, html) {
    closeModal();
    const m = document.createElement('div');
    m.className = 'mt-modal'; m.id = 'mt-modal';
    m.innerHTML = `<div role="dialog" aria-label="${esc(title)}"><header><span>${esc(title)}</span><button class="mt-x" type="button" aria-label="Fermer">×</button></header><div class="mb">${html}</div><div class="mf"><button class="btn sm" type="button">Fermer</button></div></div>`;
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('button')) closeModal(); });
    document.body.appendChild(m);
    const ok = $('.mf button', m); if (ok) ok.focus();
  }
  function closeModal() { const m = $('#mt-modal'); if (m) m.remove(); }

  /* ---------- menus ---------- */
  // jeux de couleurs du graphique (comme les « schémas » de MetaTrader)
  const SCHEMES = [['', 'Noir (par défaut)'], ['white', 'Blanc'], ['green', 'Vert sur noir'], ['classic', 'Classique']];
  let scheme = '';
  try { scheme = localStorage.getItem('ta:chart') || ''; } catch (e) { /* rien */ }
  function setScheme(id) {
    scheme = SCHEMES.some((s) => s[0] === id) ? id : '';
    if (scheme) document.documentElement.dataset.chart = scheme; else delete document.documentElement.dataset.chart;
    try { localStorage.setItem('ta:chart', scheme); } catch (e) { /* rien */ }
    const a = A();
    if (a && a.chart && a.chart.applyScheme) a.chart.applyScheme();
  }
  if (scheme) document.documentElement.dataset.chart = scheme;
  const nextOff = () => { const b = $('#btn-next'); return !b || b.hidden || b.disabled; };
  const MENUS = [
    { id: 'file', label: 'Fichier', items: [
      { t: 'Exporter la partie…', do: () => click('#btn-export') },
      { t: 'Terminer la partie', do: () => click('#btn-end') },
      '-',
      { t: 'Retour à l’accueil', do: () => click('#btn-home') },
    ] },
    { id: 'view', label: 'Affichage', items: [
      { t: 'Observation du marché', chk: () => S.watch, do: () => toggle('watch') },
      { t: 'Navigateur', chk: () => S.nav, do: () => toggle('nav') },
      { t: 'Boîte à outils', chk: () => S.tool, do: () => toggle('tool') },
      { t: 'Fenêtre d’ordre', kb: 'F9', chk: () => S.order, do: () => toggle('order') },
      '-',
      { t: 'Zoom avant', do: () => click('#z-in') },
      { t: 'Zoom arrière', do: () => click('#z-out') },
      { t: 'Recentrer le graphique', do: () => click('#z-reset') },
    ] },
    { id: 'insert', label: 'Insertion', items: [
      { t: 'Indicateurs…', do: () => click('#ind-open') },
      '-',
      { t: 'Support / résistance (ligne horizontale)', do: () => tool('h') },
      { t: 'Ligne de tendance', do: () => tool('t') },
      { t: 'Zone', do: () => tool('r') },
      { t: 'Stop-loss', do: () => tool('sl') },
      { t: 'Objectif', do: () => tool('tp') },
    ] },
    { id: 'chart', label: 'Graphiques', items: [
      { t: 'Curseur', do: () => tool('cursor') },
      { t: 'Gomme', do: () => tool('erase') },
      '-',
      { t: 'Supprimer tous les objets', do: () => click('#draw-clear') },
      '-',
      ...SCHEMES.map(([id, name]) => ({ t: 'Couleurs : ' + name, chk: () => scheme === id, do: () => setScheme(id) })),
    ] },
    { id: 'tools', label: 'Outils', items: [
      { t: 'Nouvel ordre', kb: 'F9', do: () => { S.order = true; applyLayout(); const q = $('#t-qty'); if (q && q.offsetParent) q.focus(); } },
      { t: 'Barre suivante', kb: '→', off: nextOff, do: () => click('#btn-next') },
      '-',
      { t: 'Mode : tour par tour', off: () => !$('#tm-mode') || $('#tm-mode').hidden, do: () => click('#tm-mode [data-v="turn"]') },
      { t: 'Mode : temps réel', off: () => !$('#tm-mode') || $('#tm-mode').hidden, do: () => click('#tm-mode [data-v="rt"]') },
    ] },
    { id: 'win', label: 'Fenêtre', items: [
      { t: () => { const a = A(); return a && a.g ? `1 ${symbol(a)},${frame(a)}` : '1 ACTIF,D1'; }, chk: () => true, do: () => {} },
    ] },
    { id: 'help', label: 'Aide', items: [
      { t: 'Raccourcis clavier', do: () => modal('Raccourcis clavier', '<p><kbd>→</kbd> ou <kbd>N</kbd> : barre suivante</p><p><kbd>Espace</kbd> : lecture / pause (temps réel)</p><p><kbd>F9</kbd> : ouvrir ou fermer la fenêtre d’ordre</p><p><kbd>Échap</kbd> : revenir au curseur</p><p><kbd>Suppr</kbd> : effacer le tracé sélectionné</p><p>Glisse un stop ou un objectif directement sur le graphique pour le déplacer.</p>') },
      { t: 'À propos de la plateforme', do: () => modal('Trading Academy', '<p>Plateforme d’entraînement au trading, dont la présentation s’inspire de MetaTrader 5 : observation du marché, graphique, fenêtre d’ordre et boîte à outils.</p><p>Les cotes sont de vrais prix historiques, le compte est virtuel. Simulation éducative : rien ici n’est un conseil financier.</p>') },
    ] },
  ];
  function closeMenu() {
    const d = $('#mt-drop');
    if (d) d.remove();
    $$('.mt-m.open').forEach((b) => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
    S.open = null;
  }
  function openMenu(btn) {
    closeMenu();
    const m = MENUS.find((x) => x.id === btn.dataset.menu);
    if (!m) return;
    const d = document.createElement('div');
    d.className = 'mt-drop'; d.id = 'mt-drop'; d.setAttribute('role', 'menu');
    d.innerHTML = m.items.map((it, k) => {
      if (it === '-') return '<div class="mt-msep" role="separator"></div>';
      const label = typeof it.t === 'function' ? it.t() : it.t, off = it.off && it.off();
      return `<button type="button" class="mt-mi" role="menuitem" data-k="${k}"${off ? ' disabled' : ''}><span class="ck">${it.chk && it.chk() ? '✓' : ''}</span><span>${esc(label)}</span>${it.kb ? `<span class="kb">${esc(it.kb)}</span>` : ''}</button>`;
    }).join('');
    const r = btn.getBoundingClientRect();
    d.style.left = Math.max(0, Math.min(r.left, window.innerWidth - 250)) + 'px';
    d.style.top = r.bottom + 'px';
    d.addEventListener('click', (e) => {
      const b = e.target.closest('.mt-mi'); if (!b || b.disabled) return;
      const it = m.items[+b.dataset.k];
      closeMenu();
      if (it && it.do) setTimeout(it.do, 0);   // après les écouteurs de clic « à l'extérieur » (le panneau des indicateurs se refermerait)
    });
    document.body.appendChild(d);
    btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    S.open = m.id;
  }
  function buildMenubar() {
    const bar = $('#mt-menubar');
    if (!bar) return;
    bar.innerHTML = MENUS.map((m) => `<button class="mt-m" type="button" data-menu="${m.id}" aria-haspopup="true" aria-expanded="false">${m.label}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-menu]'); if (!b) return;
      if (S.open === b.dataset.menu) closeMenu(); else openMenu(b);
    });
    bar.addEventListener('mouseover', (e) => {
      const b = e.target.closest('[data-menu]');
      if (b && S.open && S.open !== b.dataset.menu) openMenu(b);
    });
    document.addEventListener('click', (e) => { if (S.open && !e.target.closest('.mt-menubar') && !e.target.closest('.mt-drop')) closeMenu(); });
    window.addEventListener('resize', closeMenu);
  }

  /* ---------- navigateur ---------- */
  const TREE = [
    { n: 'Comptes', open: true, kids: [
      { n: 'Academy-Demo', open: true, kids: [{ n: () => { const a = A(); return a && a.g ? `${login(a)} : compte démo` : 'Compte démo'; }, leaf: true, dim: true }] },
    ] },
    { n: 'Indicateurs', open: true, kids: [
      { n: 'Tendance', open: true, kids: [
        { n: 'Moyenne mobile', ind: 'sma' }, { n: 'Moyenne mobile exponentielle', ind: 'ema' }, { n: 'Bandes de Bollinger', ind: 'boll' },
      ] },
      { n: 'Oscillateurs', open: true, kids: [{ n: 'RSI', ind: 'rsi' }, { n: 'MACD', ind: 'macd' }] },
      { n: 'Volatilité', open: false, kids: [{ n: 'ATR', ind: 'atr' }] },
      { n: 'Volumes', open: false, kids: [{ n: 'Volumes', ind: 'vol' }] },
    ] },
    { n: 'Conseillers experts', open: false, kids: [{ n: 'Coach (onglet Coach)', leaf: true, dim: true }] },
    { n: 'Scripts', open: false, kids: [{ n: 'Aucun script', leaf: true, dim: true }] },
  ];
  function treeHTML(nodes) {
    return '<ul>' + nodes.map((n) => {
      const name = typeof n.n === 'function' ? n.n() : n.n;
      if (n.kids) {
        return `<li><button class="mt-tn" type="button" data-fold><span class="pm">${n.open ? '−' : '+'}</span>${esc(name)}</button>${n.open ? treeHTML(n.kids) : ''}</li>`;
      }
      return `<li><button class="mt-tn leaf${n.dim ? ' dim' : ''}" type="button"${n.ind ? ` data-ind="${n.ind}" title="Double-clique pour ajouter au graphique"` : ''}>${esc(name)}</button></li>`;
    }).join('') + '</ul>';
  }
  function renderTree() {
    const box = $('#mt-nav-tree');
    if (box) box.innerHTML = `<div class="mt-tree">${treeHTML(TREE)}</div>`;
  }
  function foldTo(nodes, label) {
    for (const n of nodes) {
      const name = typeof n.n === 'function' ? n.n() : n.n;
      if (n.kids) { if (name === label) { n.open = !n.open; return true; } if (foldTo(n.kids, label)) return true; }
    }
    return false;
  }
  function addIndicator(t) {
    let b = $(`#ind-catalog [data-ind-add="${t}"]`), opened = false;
    if (!b) { click('#ind-open'); opened = true; b = $(`#ind-catalog [data-ind-add="${t}"]`); }
    if (b) b.click();
    if (opened) click('#ind-close');
  }
  function bindTree() {
    const box = $('#mt-nav-tree');
    if (!box) return;
    box.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fold]');
      if (f) {
        const label = f.textContent.replace(/^[−+]/, '').trim();
        if (foldTo(TREE, label)) renderTree();
      }
    });
    box.addEventListener('dblclick', (e) => {
      const l = e.target.closest('[data-ind]');
      if (l) addIndicator(l.dataset.ind);
    });
  }

  /* ---------- observation du marché, titres, barre d'état ---------- */
  MT.sync = function (a) {
    const g = a && a.g, st = a && a.st;
    if (!g || !st) return;
    const i = st.idx, last = g.c[i], hs = TA.halfSpread(g, i), bid = last * (1 - hs), ask = last * (1 + hs);
    const sym = symbol(a), tf = frame(a), bar = barLabel(a);
    if (S.prevBid != null && Math.abs(bid - S.prevBid) > 1e-9) S.dir = bid > S.prevBid ? 'up' : 'dn';
    S.prevBid = bid;
    const body = $('#mt-watch-body');
    if (body) {
      body.innerHTML = `<tr class="sel"><td>◆ ${esc(sym)}</td><td class="r"><span class="${S.dir}">${nf.format(bid)}</span></td><td class="r"><span class="${S.dir}">${nf.format(ask)}</span></td><td class="r">${Math.round((ask - bid) * 100)}</td></tr><tr class="mt-add"><td colspan="4">cliquer pour ajouter…</td></tr>`;
    }
    const wt = $('#mt-watch-t'); if (wt) wt.textContent = `Observation du marché : ${bar}`;
    const t = $('#mt-title');
    if (t) { t.hidden = false; t.textContent = `${login(a)} - Academy-Demo : compte démo - Netting - [${sym},${tf}]`; }
    const ct = $('#mt-ctab'); if (ct) ct.textContent = `${sym},${tf}`;
    const os = $('#mt-ord-sym'); if (os) os.textContent = `${sym},${tf}`;
    const sl = $('#mt-st-l');
    if (sl) {
      const total = g.endIdx - g.startIdx, played = i - g.startIdx;
      sl.textContent = g.live ? `${sym} · cotes au ${bar}` : `${sym},${tf} · barre ${played} sur ${total}`;
    }
    const sr = $('#mt-st-r'); if (sr) sr.textContent = g.live ? 'Cotes publiées' : 'Données historiques';
    // le tutoriel a besoin de voir la fenêtre d'ordre et la boîte à outils
    if (a.tuto && (!S.order || !S.tool)) { S.order = true; S.tool = true; applyLayout(); }
    // missions de la partie : statut en direct
    const list = $('#mt-mis-list');
    if (list) {
      if (a.tuto || !TA.MISSIONS || !g.endIdx || g.live) list.innerHTML = '<li class="dim">Aucune mission dans ce mode.</li>';
      else {
        const dd = TA.drawdown(st.equity), m = TA.metrics(g, st);
        const ctx = { sum: { maxDD: dd.max, retPct: m.totalPct, bh: g.c[i] / g.c[g.startIdx] - 1, trades: st.trades.length }, trades: st.trades, bars: g.endIdx - g.startIdx };
        list.innerHTML = TA.MISSIONS.evaluate(TA.MISSIONS.pick((a.cfg && (a.cfg.challenge || a.cfg.code)) || 'x'), ctx).map((x) => `<li class="${x.ok ? 'ok' : ''}"><span class="ic">${x.ok ? '✓' : '○'}</span><span>${esc(x.text)}</span></li>`).join('');
      }
    }
    MT.onTicket(a);
  };

  /* ---------- fenêtre d'ordre : deux boutons, prix Bid et Ask ---------- */
  MT.onTicket = function (a) {
    const box = $('#ticket'), g = a && a.g, st = a && a.st;
    if (!box || !g || !st || !a.t) return;
    const mode = a.t.inst === 'opt' ? 'opt' : a.t.type === 'market' ? 'market' : 'pending';
    box.dataset.mode = mode;
    if (mode !== 'market') return;
    const i = st.idx, last = g.c[i], hs = TA.halfSpread(g, i), p = st.pos;
    $('#mt-bid').innerHTML = pxHTML(last * (1 - hs));
    $('#mt-ask').innerHTML = pxHTML(last * (1 + hs));
    let sell = 'Vendre au marché', buy = 'Acheter au marché', sc, bc, off = false;
    if (p) {
      if (p.dir === 1) { sell = 'Vendre (fermer)'; sc = 'Ferme ta position longue'; bc = 'Augmente ta position longue'; }
      else { buy = 'Acheter (couvrir)'; bc = 'Couvre ta vente à découvert'; sc = 'Augmente ta vente à découvert'; }
    } else {
      bc = 'Ouvre une position longue : tu gagnes si le prix monte';
      const chk = TA.shortCheck(g, st);
      if (chk.ok) sc = 'Vente à découvert : tu gagnes si le prix baisse'; else { sc = chk.why; off = true; }
    }
    const sb = $('#mt-sell'), bb = $('#mt-buy');
    sb.querySelector('.mt-dl').textContent = sell; bb.querySelector('.mt-dl').textContent = buy;
    $('#mt-sell-c').textContent = sc; $('#mt-buy-c').textContent = bc;
    sb.disabled = off; sb.title = off ? sc : '';
    sb.classList.toggle('picked', !!a.tuto && a.t.side === 'sell');
    bb.classList.toggle('picked', !!a.tuto && a.t.side === 'buy');
  };
  function deal(side) {
    const a = A();
    if (!a || !a.g) return;
    const b = $(`#t-side [data-v="${side}"]`);
    if (b) b.click();                // choisit le sens (comme l'ancien sélecteur)
    if (a.tuto) return;              // tutoriel : on choisit le sens, « Exécuter » valide à l'étape voulue
    click('#t-go');
  }

  /* ---------- démarrage ---------- */
  function init() {
    buildMenubar(); renderTree(); bindTree(); decorateTools(); applyLayout();
    // le contexte de la partie (mode, marché, niveau…) loge dans la barre d'état, comme les infos de la plateforme
    const bar = $('#mt-status'), ctx = $('#ctx'), mid = $('#mt-st-l');
    if (bar && ctx && mid) bar.insertBefore(ctx, mid);
    const sell = $('#mt-sell'), buy = $('#mt-buy');
    if (sell) sell.addEventListener('click', () => deal('sell'));
    if (buy) buy.addEventListener('click', () => deal('buy'));
    const no = $('#mt-neworder');
    if (no) no.addEventListener('click', () => toggle('order'));
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-close]');
      if (c && S[c.dataset.close] != null) { S[c.dataset.close] = false; applyLayout(); }
    });
    document.addEventListener('keydown', (e) => {
      const a = A();
      if (e.key === 'Escape') { closeMenu(); closeModal(); }
      if (e.key === 'F9' && a && a.screen === 'game') { e.preventDefault(); toggle('order'); }
    });
  }
  init();
})();
