  /* ---------- mode Live : compte sur de vrais prix récents ---------- */
  const KEY_LIVE = 'ta:live', KEY_UID = 'ta:uid';
  const shortDay = (day) => new Date(day * 86400000).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const lastDataDay = () => (App.index ? Math.max(...App.index.assets.map((a) => a.to)) : null);
  const isLive = () => !!(App.cfg && App.cfg.mode === 'live');
  // Prix réel d'un prix affiché (les prix du mode Live sont multipliés par une puissance de 10 : quantités entières).
  const realDecimals = (x) => (x < 10 ? 4 : 2);
  const realPx = (x) => { const g = App.g, v = g.live ? x / g.live.k : x; return F.num(v, g.live ? realDecimals(v) : 2); };

  function liveInfo() {
    if (App.g && isLive() && !App.st.closed) return { cfg: App.cfg, st: App.st };
    const sv = store.get(KEY_LIVE);
    return sv && sv.v === 1 && sv.cfg && sv.st && Array.isArray(sv.st.equity) ? { cfg: sv.cfg, st: sv.st } : null;
  }
  function renderLiveCard() {
    const box = $('#live-card'), r = liveInfo();
    if (!r) { box.hidden = true; return; }
    const a = App.index && App.index.assets.find((x) => x.id === r.cfg.plan.assetId), eq = r.st.equity[r.st.equity.length - 1];
    const d = lastDataDay();
    box.hidden = false;
    box.innerHTML = `<h2>Compte Live</h2>
      <p style="margin:0">${esc(a ? `${a.s} · ${a.nm}` : r.cfg.plan.assetId)}</p>
      <p class="mono dim" style="margin:0">valeur ${F.money(eq)} <span class="${cls(eq - CFG.START_CASH)}">(${F.spct(eq / CFG.START_CASH - 1)})</span></p>
      <div class="acts"><button class="btn primary" type="button" id="l-go">Ouvrir le compte</button></div>
      <p class="fine">Le compte avance quand de nouvelles cotes sont publiées dans cette page${d ? ` (cotes jusqu’au ${shortDay(d)})` : ''}. Il ne bouge pas en temps réel.</p>`;
    $('#l-go').onclick = openLive;
  }
  async function openLive() {
    if (App.g && isLive() && !App.st.closed) { enterGame(); return; }
    try { await loadFromSave(store.get(KEY_LIVE)); } catch (e) { toast(e.message, 'err'); }
  }
  async function startLive() {
    const err = $('#s-err'); err.textContent = '';
    if (liveInfo()) { err.textContent = 'Un compte Live est déjà ouvert : ouvre-le, ou clôture-le avant d’en créer un autre.'; return; }
    const a = App.index.assets.find((x) => x.id === $('#s-asset').value);
    if (!a) { err.textContent = 'Choisis un actif.'; return; }
    const level = App.profile.level, access = TA.marketAccess(a.mk || 'stock', level);
    if (!access.ok) { err.textContent = access.why; return; }
    setReady(false, 'Chargement…');
    try {
      const data = await loadAsset(a.id), last = data.t[data.t.length - 1], k = TA.liveScale(data.c[data.c.length - 1]);
      const plan = { assetId: a.id, startDay: last, scenarioId: 'random', market: a.mk || 'stock' };
      const g = TA.buildGame(data, plan, 'swing', 1e9, { live: { k } });
      const rules = TA.rulesOf($('#s-risk').value).id, lev = +$('#s-lev').value || 1;
      const cfg = { v: 1, mode: 'live', code: 'LIVE-' + TA.newCode().slice(0, 4), scenario: 'random', resolved: 'random', style: 'swing', length: 400, lenIdx: 0, plan, market: plan.market, time: 'turn', rules, level, maxLev: lev, live: { k }, created: Date.now() };
      begin(cfg, g, TA.newState(g, rules, level, lev));
      saveNow();
    } catch (e) {
      err.textContent = 'Impossible d’ouvrir le compte : ' + e.message;
    }
    setReady(true);
  }
  // Rattrape les séances publiées depuis la dernière ouverture du compte.
  function catchUp(g, st) {
    const notes = [];
    let n = 0;
    while (!st.closed && st.idx < g.endIdx) {
      for (const e of TA.advance(g, st)) if (e.kind === 'fill' || e.kind === 'call' || e.kind === 'cancel') notes.push(e.msg);
      n++;
      if (st.ruined) break;
    }
    return { n, notes };
  }

  /* ---------- mode d'accueil : entraînement ou Live, reconnaissance des codes de défi ---------- */
  function fillAssets() {
    const lvl = App.profile.level, market = App.prefs.market;
    const list = App.index ? App.index.assets.filter((a) => (a.mk || 'stock') === market && TA.marketAccess(a.mk || 'stock', lvl).ok) : [];
    $('#s-asset').innerHTML = list.map((a) => `<option value="${esc(a.id)}">${esc(a.s)} · ${esc(a.nm)}</option>`).join('');
    if (list.some((a) => a.id === App.prefs.asset)) $('#s-asset').value = App.prefs.asset;
  }
  function applyMode() {
    const live = App.prefs.mode === 'live';
    setSeg($('#s-mode'), App.prefs.mode);
    for (const sel of ['#s-style', '#s-scen', '#s-len', '#s-time', '#s-code']) { const row = $(sel).closest('.row'); if (row) row.hidden = live; }
    $('#s-scen-desc').hidden = live; $('#s-code-desc').hidden = live; $('#r-asset').hidden = !live;
    const d = lastDataDay();
    $('#s-mode-desc').textContent = live
      ? `Un compte qui dure, sur de vrais prix récents (cotes jusqu’au ${d ? shortDay(d) : '…'}). Il avance quand de nouvelles cotes sont publiées : ce n’est pas du temps réel. L’actif est visible.`
      : 'Parties d’entraînement : l’actif et la date sont cachés, tu avances à ton rythme.';
    if (live) fillAssets();
    const b = $('#s-go'); if (!b.disabled) b.textContent = live ? 'Ouvrir un compte Live' : 'Lancer la partie';
  }
  function onCodeInput() {
    const v = $('#s-code').value, d = $('#s-code-desc'), ch = TA.parseChallenge(v);
    if (!v.trim()) { d.textContent = ''; return; }
    if (!ch) { d.textContent = 'Code non reconnu : il sera utilisé tel quel pour tirer la partie.'; return; }
    if (!ch.full) { d.textContent = 'Code de partie : même actif et même départ chez ton ami si vos réglages (marché, scénario, style, durée) sont identiques. Un code de défi complet reprend ces réglages tout seul.'; return; }
    const acc = TA.marketAccess(ch.market, App.profile.level);
    if (!acc.ok) { d.textContent = `Défi reconnu, mais ${acc.why.charAt(0).toLowerCase() + acc.why.slice(1)}`; return; }
    App.prefs.mode = 'train'; App.prefs.market = ch.market; App.prefs.scen = ch.scenarioId; App.prefs.style = ch.style; App.prefs.len = ch.lenIdx; savePrefs();
    setSeg($('#s-style'), ch.style); refreshSetup();
    const sc = TA.SCENARIOS.find((s) => s.id === ch.scenarioId);
    d.textContent = `Défi reconnu : ${TA.MARKETS[ch.market].name} · ${sc.name} · ${TA.STYLES[ch.style].name} · ${TA.STYLES[ch.style].lengths[ch.lenIdx].label}. Les réglages sont repris.`;
  }

  /* ---------- classement partagé ---------- */
  App.board = { rows: [], sort: 'at', dir: 'desc', filter: { code: '', market: 'all', mode: 'all', pseudo: 'all' }, unsub: null, shared: false, status: '' };
  App.db = null; App.canWrite = null; App.uid = null;
  function deviceId() {
    let id = null;
    try { id = localStorage.getItem(KEY_UID); } catch (e) { id = null; }
    if (!id) { id = 'd_' + Math.random().toString(36).slice(2, 12); try { localStorage.setItem(KEY_UID, id); } catch (e) { /* rien */ } }
    return id;
  }
  async function detectShared() {
    App.uid = deviceId();
    try {
      if (window.claude && window.claude.use) {
        const user = await window.claude.use('user');
        if (user) { const id = await user.id(); if (id) App.uid = id; App.canWrite = await user.can('data.write'); }
        App.db = await window.claude.use('db');
      }
    } catch (e) { App.db = null; }
    renderBoardCard();
    if (App.screen === 'end' && App.sum) showEnd(App.sum);
  }
  function renderBoardCard() {
    $('#board-card').innerHTML = `<h2>Classement</h2>
      <p style="margin:0">${App.db ? 'Toutes les parties publiées par les joueurs de cette page, avec tri, filtres et défis par code.' : 'Ton historique de parties. Le classement partagé n’est pas disponible dans cette vue.'}</p>
      <div class="acts" style="margin-top:10px"><button class="btn sm" type="button" id="board-open">Voir le classement</button></div>`;
  }
  function localBoard() {
    App.board.shared = false;
    App.board.rows = (store.get(KEY_RESULTS) || []).map((r, i) => TA.cleanBoardRow('local' + i, r)).filter(Boolean);
  }
  function openBoard() {
    show('board');
    closeBoard();
    App.board.status = 'Chargement…'; renderBoard();
    if (!App.db) { localBoard(); App.board.status = ''; renderBoard(); return; }
    App.board.shared = true;
    try {
      App.board.unsub = App.db.collection('games').orderBy('at', 'desc').limit(1000).onSnapshot((snap) => {
        App.board.rows = snap.docs.map((d) => TA.cleanBoardRow(d.id, d.data())).filter(Boolean);
        App.board.status = ''; renderBoard();
      }, (e) => { localBoard(); App.board.status = `Le classement partagé est indisponible (${(e && e.code) || 'erreur'}). Voici ton historique local.`; renderBoard(); });
    } catch (e) { localBoard(); App.board.status = ''; renderBoard(); }
  }
  function closeBoard() { if (App.board.unsub) { App.board.unsub(); App.board.unsub = null; } }
  const SC_NAME = (id) => (id === 'live' ? 'Compte Live' : (TA.SCENARIOS.find((s) => s.id === id) || { name: id }).name);
  function renderBoard() {
    const B = App.board, all = B.rows;
    const rows = TA.boardSort(TA.boardFilter(all, B.filter), B.sort, B.dir);
    const names = [...new Set(all.map((r) => r.pseudo))].sort((a, b) => a.localeCompare(b, 'fr'));
    const opts = '<option value="all">Tous</option>' + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    const sel = $('#b-pseudo');
    if (sel.innerHTML !== opts) sel.innerHTML = opts;
    sel.value = names.includes(B.filter.pseudo) ? B.filter.pseudo : 'all';
    $('#b-status').textContent = B.status || `${rows.length} partie${rows.length > 1 ? 's' : ''} affichée${rows.length > 1 ? 's' : ''} sur ${all.length}, ${names.length} joueur${names.length > 1 ? 's' : ''}${B.shared ? '' : ' (historique local)'}.`;
    const cols = [['#', null, 'r'], ['Joueur', 'pseudo', ''], ['Mode', 'mode', ''], ['Marché', 'market', ''], ['Scénario', 'scenario', ''], ['Réglages', null, ''], ['Rendement', 'ret', 'r'], ['Sharpe', 'sharpe', 'r'], ['Drawdown', 'dd', 'r'], ['Transactions', 'trades', 'r'], ['Date', 'at', ''], ['Code', null, ''], ['', null, '']];
    const head = cols.map(([t, k, c]) => (k ? `<th class="${c}" aria-sort="${B.sort === k ? (B.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${k}">${t}${B.sort === k ? (B.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>` : `<th class="${c}">${t}</th>`)).join('');
    const body = rows.length ? rows.map((r, i) => {
      const len = (TA.STYLES[r.style] || TA.STYLES.swing).lengths[r.lenIdx] || {}, mine = App.uid && r.uid === App.uid;
      const play = r.mode === 'train' && TA.parseChallenge(r.code) && TA.parseChallenge(r.code).full ? `<button class="btn sm" type="button" data-play="${esc(r.code)}">Jouer</button>` : '';
      const del = mine && B.shared && !r.id.startsWith('local') ? `<button class="btn sm ghost" type="button" data-del="${esc(r.id)}">Retirer</button>` : '';
      return `<tr class="${mine ? 'me' : ''}"><td class="r mono">${i + 1}</td><td>${esc(r.pseudo)}${mine ? ' <span class="dim">(toi)</span>' : ''}</td><td>${r.mode === 'live' ? 'Live' : 'Entraînement'}</td><td>${esc(TA.MARKETS[r.market].name)}</td><td>${esc(SC_NAME(r.scenario))}</td>
        <td class="dim">${r.mode === 'live' ? '' : `${r.style === 'long' ? 'Long terme' : 'Swing'} · ${esc((len.label || '').replace(/ \(.*\)/, ''))} · `}${esc(r.rules === 'soft' ? 'risque conseillé' : 'risque ' + r.rules.replace('strict', '') + ' %')}${r.lev > 1 ? ` · ×${r.lev}` : ''}</td>
        <td class="r ${cls(r.ret)}">${F.spct(r.ret)}</td><td class="r">${r.sharpe == null ? '—' : F.num(r.sharpe, 2)}</td><td class="r ${r.dd < -0.0005 ? 'neg' : ''}">${F.spct(r.dd)}</td><td class="r">${r.trades}</td>
        <td>${new Date(r.at).toLocaleDateString('fr-CA')}</td><td><button class="code" type="button" data-code="${esc(r.code)}" title="Filtrer sur ce code">${esc(r.code)}</button></td><td>${play}${del}</td></tr>`;
    }).join('') : `<tr><td colspan="${cols.length}" class="dim">${all.length ? 'Aucune partie ne correspond à ces filtres.' : 'Aucune partie publiée pour le moment. Termine une partie et publie-la depuis l’écran de fin.'}</td></tr>`;
    $('#b-table').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
    $('#b-note').textContent = 'Les résultats sont déclarés par chaque joueur : ils ne sont pas vérifiés. Le rendement d’un défi se compare à réglages égaux (même code complet).';
  }
  // Carte de publication à l'écran de fin.
  function publishHTML() {
    const info = App.endInfo || {};
    if (!info.fresh) return `<section class="card" id="pub-card"><h2>Classement</h2><p class="dim" style="margin:0">${App.cfg.replay ? 'Une partie rejouée ne peut pas être publiée : tu en connaissais déjà la suite.' : 'Une partie importée depuis un fichier ne peut pas être publiée. Seules les parties terminées ici le peuvent.'}</p></section>`;
    if (!App.db) return `<section class="card" id="pub-card"><h2>Classement</h2><p class="dim" style="margin:0">Le classement partagé n’est pas disponible dans cette vue. Ta partie est gardée dans ton historique local.</p></section>`;
    if (App.canWrite === false) return `<section class="card" id="pub-card"><h2>Classement</h2><p class="dim" style="margin:0">Ton accès à cette page te permet de voir le classement, pas d’y publier. Demande à son auteur de t’inviter comme Contributeur ou Éditeur.</p></section>`;
    if (info.published) return `<section class="card" id="pub-card"><h2>Classement</h2><p style="margin:0"><strong>Publié.</strong> Ta partie est dans le classement partagé.</p><div class="acts" style="margin-top:10px"><button class="btn sm" type="button" id="pub-see">Voir le classement</button></div></section>`;
    return `<section class="card" id="pub-card"><h2>Classement</h2>
      <p style="margin:0 0 10px">Publie cette partie pour la comparer à celles de tes amis. Seuls le pseudo, les réglages et le résultat sont publiés : ni l’actif ni les dates.</p>
      <div class="two"><label class="field"><span>Pseudo</span><input id="pub-pseudo" maxlength="24" value="${esc(App.prefs.pseudo || '')}" placeholder="Ton pseudo" autocomplete="nickname"></label>
        <div style="align-self:end"><button class="btn primary" type="button" id="pub-go" style="width:100%">Publier au classement</button></div></div>
      <p class="err" id="pub-err" role="alert" style="margin-top:8px"></p></section>`;
  }
  async function publishScore() {
    const pseudo = $('#pub-pseudo').value.trim(), err = $('#pub-err'), info = App.endInfo;
    err.textContent = '';
    if (!pseudo) { err.textContent = 'Choisis un pseudo.'; return; }
    App.prefs.pseudo = pseudo.slice(0, 24); savePrefs();
    const challenge = App.cfg.challenge || App.cfg.code;
    const row = TA.boardRow(App.cfg, App.st, App.sum, pseudo, App.uid, challenge);
    const id = `${App.uid}_${App.cfg.created}`.replace(/[^A-Za-z0-9_.~:@+-]/g, '_');
    $('#pub-go').disabled = true;
    try {
      await App.db.doc('games/' + id).set(row);
      info.published = true;
      toast('Partie publiée au classement.', 'ok');
    } catch (e) {
      $('#pub-go').disabled = false;
      const c = e && e.code;
      err.textContent = c === 'invalid_argument' ? 'Ton accès ne permet pas de publier. Demande à l’auteur de t’inviter comme Contributeur ou Éditeur.'
        : c === 'quota_exceeded' ? 'Le classement est plein : demande à l’auteur de faire le ménage.' : 'Publication impossible pour le moment. Réessaie dans un instant.';
      return;
    }
    const card = $('#pub-card'); if (card) card.outerHTML = publishHTML();
  }
  function playChallenge(code) {
    goHome();
    App.prefs.mode = 'train'; applyMode();
    $('#s-code').value = code; onCodeInput();
    $('#setup').scrollIntoView({ block: 'start' });
  }

