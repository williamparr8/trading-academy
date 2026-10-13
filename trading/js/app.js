/* Trading Academy — interface et orchestration (écrans, ordres, temps, sauvegardes) */
(function () {
  'use strict';
  const TA = window.TA, F = TA.fmt, CFG = TA.CFG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cls = (x) => (x > 0.004 ? 'pos' : x < -0.004 ? 'neg' : '');
  const n2 = (x) => F.num(x, 2);

  /* ---------- stockage local (peut être indisponible) ---------- */
  const KEY_SAVE = 'ta:save', KEY_PREFS = 'ta:prefs', KEY_RESULTS = 'ta:results', KEY_PROFILE = 'ta:profile';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
  };

  const PREFS0 = { ind: { vol: true, sma20: true, sma50: false, boll: false, rsi: false, macd: false }, speed: 1, pauseFill: true, time: 'turn', style: 'swing', scen: 'random', len: 1, rules: 'strict2', market: 'stock', lev: 1, mode: 'train', asset: '', pseudo: '' };
  const App = {
    prefs: { ...PREFS0, ...(store.get(KEY_PREFS) || {}) }, index: null, bench: null, cache: new Map(),
    cfg: null, g: null, st: null, chart: null, timer: null, playing: false, screen: 'home', posKey: '', tab: 'pos', sum: null,
    t: { side: 'buy', type: 'market' }, saveT: null,
  };
  App.prefs.ind = { ...PREFS0.ind, ...App.prefs.ind };
  const savePrefs = () => store.set(KEY_PREFS, App.prefs);
  App.profile = TA.sanitizeProfile(store.get(KEY_PROFILE));   // niveau et progression, gardés dans ce navigateur
  const saveProfile = () => store.set(KEY_PROFILE, App.profile);

  /* ---------- petits utilitaires d'interface ---------- */
  function toast(msg, kind = 'info', ms = 4200) {
    const box = $('#toasts'), el = document.createElement('div');
    el.className = 'toast ' + kind; el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), ms);
  }
  function bindSeg(root, cb) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b || b.disabled) return;
      setSeg(root, b.dataset.v); cb(b.dataset.v);
    });
  }
  function setSeg(root, v) { $$('button[data-v]', root).forEach((b) => b.classList.toggle('on', b.dataset.v === String(v))); }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return null;
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }
  const inp = (x) => (x == null ? '' : (Math.round(x * 100) / 100).toFixed(2));
  const short = (day) => new Date(day * 86400000).toLocaleDateString('fr-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  async function loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error('Chargement impossible : ' + path);
    return r.json();
  }
  async function loadAsset(id) {
    if (!App.cache.has(id)) {
      if (App.cache.size >= 3) App.cache.delete(App.cache.keys().next().value);
      App.cache.set(id, await loadJSON(`data/${id}.json`));
    }
    return App.cache.get(id);
  }
  const unitWord = () => (App.g.style === 'long' ? 'Semaine' : 'Jour');
  const rel = (i) => {
    if (App.g.live) return shortDay(App.g.t[i]);   // compte Live : vraies dates
    const r = i - App.g.startIdx; return App.g.unit + (r < 0 ? '−' + -r : r);
  };

  function show(name) {
    App.screen = name;
    for (const s of ['home', 'game', 'end', 'learn', 'board']) $('#screen-' + s).hidden = s !== name;
    $('#top-actions').hidden = name === 'home' || name === 'learn' || name === 'board';
    if (name !== 'board') closeBoard();
    $('#ctx').hidden = name !== 'game';
    $('#minibar').hidden = name !== 'game';
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     Accueil : nouvelle partie, reprise, import
     ===================================================================== */
  function buildSetup() {
    $('#s-scen').innerHTML = TA.SCENARIOS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('#s-scen').value = TA.SCENARIOS.some((s) => s.id === App.prefs.scen) ? App.prefs.scen : 'random';
    if (!TA.STYLES[App.prefs.style]) App.prefs.style = 'swing';
    setSeg($('#s-style'), App.prefs.style);
    setSeg($('#s-time'), App.prefs.time);
    refreshSetup();
    $('#s-risk').innerHTML = TA.RULES.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    $('#s-risk').value = TA.RULES.some((r) => r.id === App.prefs.rules) ? App.prefs.rules : 'strict2';
    riskDesc();
    $('#s-risk').addEventListener('change', () => { App.prefs.rules = $('#s-risk').value; riskDesc(); savePrefs(); });
    bindSeg($('#s-market'), (v) => { App.prefs.market = v; refreshSetup(); savePrefs(); });
    $('#s-lev').addEventListener('change', () => { App.prefs.lev = +$('#s-lev').value; levDesc(); savePrefs(); });
    bindSeg($('#s-style'), (v) => { App.prefs.style = v; fillLengths(); savePrefs(); });
    bindSeg($('#s-time'), (v) => { App.prefs.time = v; savePrefs(); });
    $('#s-scen').addEventListener('change', () => { App.prefs.scen = $('#s-scen').value; scenDesc(); savePrefs(); });
    $('#s-len').addEventListener('change', () => { App.prefs.len = +$('#s-len').value; savePrefs(); });
    $('#setup').addEventListener('submit', (e) => { e.preventDefault(); startNew(); });
  }
  const MARKET_DESC = {
    stock: 'Actions et FNB (paniers d’actifs négociés comme des actions) de la Bourse de Toronto, du NYSE et du Nasdaq.',
    forex: 'Paires de devises, ouvertes 24 h sur 24 en semaine. Pas de commission : le spread est ton coût.',
    crypto: 'Cryptomonnaies, ouvertes 24 h sur 24, 7 jours sur 7. Très volatiles, frais d’environ 0,1 %.',
  };
  // Remet à jour tout ce qui dépend du marché choisi et du niveau : marchés ouverts, scénarios, durées, levier, frais.
  function refreshSetup() {
    const lvl = App.profile.level;
    let market = TA.MARKETS[App.prefs.market] ? App.prefs.market : 'stock';
    if (!TA.marketAccess(market, lvl).ok) market = 'stock';
    App.prefs.market = market;
    setSeg($('#s-market'), market);
    for (const b of $$('#s-market button[data-v]')) {
      const a = TA.marketAccess(b.dataset.v, lvl);
      b.disabled = !a.ok; b.title = a.ok ? '' : a.why;
    }
    $('#s-market-desc').textContent = MARKET_DESC[market] + (TA.marketAccess('forex', lvl).ok ? '' : ' Forex et crypto se débloquent au niveau Intermédiaire.');
    const list = TA.scenariosFor(market);
    $('#s-scen').innerHTML = list.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('#s-scen').value = list.some((s) => s.id === App.prefs.scen) ? App.prefs.scen : 'random';
    const choices = TA.leverChoices(market, lvl);
    $('#s-lev').innerHTML = choices.map((l) => `<option value="${l}">${l === 1 ? '×1 (aucun levier)' : '×' + l}</option>`).join('');
    $('#s-lev').value = choices.includes(App.prefs.lev) ? App.prefs.lev : 1;
    $('#s-lev').disabled = choices.length < 2;
    fillLengths(); scenDesc(); levDesc();
    $('#s-fine').textContent = `Capital de départ ${F.money(CFG.START_CASH)} (virtuel). Frais : ${TA.feeText(market)}. Spread réaliste, plus large les jours agités.`;
    applyMode();
  }
  function levDesc() {
    const lvl = App.profile.level, market = App.prefs.market, max = TA.maxLeverage(market, lvl), next = TA.LEVELS[lvl];
    const upper = next ? TA.maxLeverage(market, lvl + 1) : max;
    $('#s-lev-desc').textContent = max < 2
      ? `Pas de levier avec ton niveau pour ce marché.${upper > 1 ? ` Niveau ${next.name} : jusqu’à ×${upper}.` : ''}`
      : `Un levier élevé accélère gains et pertes, et rapproche la liquidation. Maximum à ton niveau : ×${max}.${upper > max ? ` Niveau ${next.name} : ×${upper}.` : ''}`;
  }
  function fillLengths() {
    const market = App.prefs.market, style = App.prefs.style, L = TA.STYLES[style].lengths;
    const span = (l) => { const mo = Math.max(1, Math.round((l.n * TA.MARKETS[market].cal) / 30.4)); return mo >= 12 ? '~1 an' : `~${mo} mois`; };
    const label = (l) => (style === 'swing' && market !== 'stock' ? `${l.n} jours${market === 'forex' ? ' de marché' : ''} (${span(l)})` : l.label);
    $('#s-len').innerHTML = L.map((l, i) => `<option value="${i}">${esc(label(l))}</option>`).join('');
    $('#s-len').value = Math.min(Math.max(App.prefs.len | 0, 0), L.length - 1);
  }
  function scenDesc() {
    const s = TA.SCENARIOS.find((x) => x.id === $('#s-scen').value);
    $('#s-scen-desc').textContent = s.desc + (s.pool || s.id !== 'random' ? ' Le titre et la date exacte restent cachés.' : '');
  }
  function riskDesc() {
    const r = TA.rulesOf($('#s-risk').value);
    $('#s-risk-desc').textContent = r.mode === 'block'
      ? `Chaque achat exige un stop-loss, une raison et une émotion dans le journal, et ne peut pas risquer plus de ${F.pct(r.max).replace(',00', '')} du compte. On peut rapprocher un stop, pas l’éloigner.`
      : 'Le ticket affiche le risque et te prévient au-delà de 2 % du compte, mais rien n’est bloqué.';
  }
  function setReady(on, label) {
    const b = $('#s-go');
    b.disabled = !on; b.textContent = label || (App.prefs.mode === 'live' ? 'Ouvrir un compte Live' : 'Lancer la partie');
  }

  async function startNew() {
    if (App.prefs.mode === 'live') { startLive(); return; }
    const err = $('#s-err'); err.textContent = '';
    // un code de défi complet impose marché, scénario, style et durée : même partie que chez l'ami
    const raw = $('#s-code').value, ch = TA.parseChallenge(raw);
    let style = App.prefs.style, lenIdx = Math.min(App.prefs.len | 0, 2), scen = $('#s-scen').value, market = App.prefs.market;
    if (ch && ch.full) { style = ch.style; lenIdx = ch.lenIdx; scen = ch.scenarioId; market = ch.market; }
    const code = ch ? ch.code : TA.normCode(raw) || TA.newCode(), len = TA.STYLES[style].lengths[lenIdx].n;
    const level = App.profile.level, access = TA.marketAccess(market, level);
    if (!access.ok) { err.textContent = access.why; return; }
    const plan = TA.planGame(code, scen, style, len, App.index, market);
    if (!plan) { err.textContent = 'Aucune donnée ne correspond à ce choix. Essaie une durée plus courte.'; return; }
    setReady(false, 'Chargement…');
    try {
      const g = TA.buildGame(await loadAsset(plan.assetId), plan, style, len);
      const rules = TA.rulesOf($('#s-risk').value).id, lev = +$('#s-lev').value || 1;
      const challenge = TA.makeChallenge(code, market, scen, style, lenIdx);
      begin({ v: 1, mode: 'train', code, challenge, scenario: scen, resolved: plan.scenarioId, style, length: len, lenIdx, plan, market, time: App.prefs.time, rules, level, maxLev: lev, created: Date.now() }, g, TA.newState(g, rules, level, lev));
      $('#s-code').value = ''; onCodeInput();
    } catch (e) {
      err.textContent = 'Impossible de charger les cotes : ' + e.message;
    }
    setReady(true);
  }

  function resumeInfo() {
    if (App.g && App.st && !App.st.closed && !isLive()) return { cfg: App.cfg, st: App.st };
    const sv = store.get(KEY_SAVE);
    if (sv && sv.v === 1 && sv.cfg && sv.st && Array.isArray(sv.st.equity)) return { cfg: sv.cfg, st: sv.st };
    return null;
  }
  function renderResume() {
    const box = $('#resume'), r = resumeInfo();
    if (!r) { box.hidden = true; return; }
    const u = TA.STYLES[r.cfg.style] || TA.STYLES.swing, sc = TA.SCENARIOS.find((s) => s.id === r.cfg.scenario);
    const eq = r.st.equity[r.st.equity.length - 1], played = r.st.equity.length - 1;
    box.hidden = false;
    box.innerHTML = `<h2>Partie en cours</h2>
      <p style="margin:0">${esc(u.name)} · ${esc(sc ? sc.name : '')}</p>
      <p class="mono dim" style="margin:0">${unitWord2(r.cfg.style)} ${played} sur ${r.cfg.length} · valeur ${F.money(eq)} <span class="${cls(eq - CFG.START_CASH)}">(${F.spct(eq / CFG.START_CASH - 1)})</span></p>
      <div class="acts"><button class="btn primary" type="button" id="r-go">Reprendre</button><button class="btn ghost" type="button" id="r-drop">Abandonner</button></div>
      <p class="fine">Lancer une nouvelle partie remplace celle-ci. Exporte-la d’abord pour la garder.</p>`;
    $('#r-go').onclick = resume;
    let armed = null;
    $('#r-drop').onclick = (e) => {
      const b = e.currentTarget;
      if (!armed) { b.textContent = 'Confirmer l’abandon'; armed = setTimeout(() => { armed = null; b.textContent = 'Abandonner'; }, 4000); return; }
      clearTimeout(armed); store.del(KEY_SAVE); App.g = null; App.st = null; renderResume();
    };
  }
  const unitWord2 = (style) => (style === 'long' ? 'Semaine' : 'Jour');

  async function resume() {
    if (App.g && App.st && !App.st.closed && !isLive()) { enterGame(); return; }
    const sv = store.get(KEY_SAVE);
    try { await loadFromSave(sv); } catch (e) { toast(e.message, 'err'); store.del(KEY_SAVE); renderResume(); }
  }

  /* ---------- fichiers .json : export / import ---------- */
  function cleanCfg(c) {
    const okNum = Number.isInteger;
    const live = !!(c && c.mode === 'live');
    if (!c || typeof c.code !== 'string' || !TA.STYLES[c.style] || !okNum(c.length) || (!live && (c.length < 10 || c.length > 400)) || !c.plan) throw new Error('Fichier de sauvegarde invalide.');
    const p = c.plan;
    if (typeof p.assetId !== 'string' || !App.index.assets.some((a) => a.id === p.assetId) || !okNum(p.startDay)) throw new Error('Fichier de sauvegarde invalide.');
    const sc = TA.SCENARIOS.some((s) => s.id === c.scenario) ? c.scenario : 'random';
    const rs = TA.SCENARIOS.some((s) => s.id === c.resolved) ? c.resolved : sc;
    const market = TA.MARKETS[c.market] ? c.market : 'stock', lenIdx = okNum(c.lenIdx) && c.lenIdx >= 0 && c.lenIdx <= 2 ? c.lenIdx : 0, code = TA.normCode(c.code).slice(0, 12);
    const out = { v: 1, mode: live ? 'live' : 'train', code, scenario: sc, resolved: rs, style: live ? 'swing' : c.style, length: live ? 400 : c.length, lenIdx, plan: { assetId: p.assetId, startDay: p.startDay, scenarioId: rs, market }, market, maxLev: okNum(c.maxLev) ? c.maxLev : 1, time: c.time === 'rt' && !live ? 'rt' : 'turn', rules: TA.rulesOf(c.rules).id, created: okNum(c.created) ? c.created : Date.now() };
    if (live) {
      if (!(c.live && Number.isFinite(c.live.k) && c.live.k > 0)) throw new Error('Fichier de sauvegarde invalide.');
      out.live = { k: c.live.k };
    } else out.challenge = TA.makeChallenge(code, market, sc, out.style, lenIdx);
    return out;
  }
  async function loadFromSave(o) {
    if (!App.index) throw new Error('Les cotes sont encore en chargement, réessaie dans un instant.');
    if (!o || typeof o !== 'object' || o.app !== 'trading-academy') throw new Error('Ce fichier n’est pas une sauvegarde Trading Academy.');
    if (o.v !== 1) throw new Error('Version de sauvegarde non prise en charge.');
    const cfg = cleanCfg(o.cfg), live = cfg.mode === 'live';
    const g = TA.buildGame(await loadAsset(cfg.plan.assetId), cfg.plan, cfg.style, live ? 1e9 : cfg.length, live ? { live: cfg.live } : undefined);
    const st = TA.sanitizeState(o.st, g);
    cfg.rules = st.rules.id;   // la règle suit l'état de la partie (sauvegardes de la phase 1 : « conseillée »)
    if (st.level == null) st.level = App.profile.level;   // ancienne sauvegarde : niveau actuel
    cfg.level = st.level; cfg.maxLev = st.maxLev; cfg.market = g.market;
    cfg.replay = !!(o.cfg && o.cfg.replay);
    // compte Live : on intègre les séances publiées depuis la dernière ouverture
    const gap = live && !st.closed ? catchUp(g, st) : { n: 0, notes: [] };
    begin(cfg, g, st);
    if (gap.n) {
      toast(`${gap.n} nouvelle${gap.n > 1 ? 's' : ''} séance${gap.n > 1 ? 's' : ''} intégrée${gap.n > 1 ? 's' : ''} : ton compte est à jour au ${shortDay(g.t[st.idx])}.`, 'info', 6000);
      gap.notes.slice(0, 4).forEach((m) => toast(m, 'warn', 7000));
    }
  }
  async function exportSave() {
    if (!App.g) return;
    const text = JSON.stringify({ app: 'trading-academy', v: 1, savedAt: new Date().toISOString(), cfg: App.cfg, st: App.st });
    const name = `trading-academy_${App.cfg.code}_${unitWord().toLowerCase()}${App.st.idx - App.g.startIdx}.json`;
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename: name, data: text }); toast('Sauvegarde exportée.', 'ok'); }
      catch (e) { if (!e || e.code !== 'declined') toast('Export impossible (' + ((e && e.code) || 'erreur') + ').', 'err'); }
      return;
    }
    // dans l'artifact, les téléchargements passent uniquement par la capacité « downloads »
    if (window.claude) { toast('L’export de fichier n’est pas disponible dans cette vue.', 'err'); return; }
    // hors de l'artifact (test local) : téléchargement classique
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Sauvegarde exportée.', 'ok');
  }
  function importFile(file) {
    const rd = new FileReader();
    rd.onerror = () => toast('Lecture du fichier impossible.', 'err');
    rd.onload = async () => {
      try { await loadFromSave(JSON.parse(String(rd.result))); toast('Partie importée.', 'ok'); }
      catch (e) { toast(e instanceof SyntaxError ? 'Ce fichier n’est pas un JSON valide.' : e.message, 'err'); }
    };
    rd.readAsText(file);
  }

  /* =====================================================================
     Partie : démarrage, mise à jour de l'écran
     ===================================================================== */
  function begin(cfg, g, st) {
    pause();
    App.cfg = cfg; App.g = g; App.st = st; App.posKey = ''; App.jKey = ''; App.sum = null;
    if (st.closed) {   // partie terminée importée : on la montre, sans toucher au profil
      const sum = TA.summary(g, st, App.bench);
      App.endInfo = { level: st.level || App.profile.level, ev: TA.evaluate(g, st, sum, st.level || App.profile.level), out: { counted: false, why: 'Partie importée : elle ne compte pas dans ta progression.' } };
      showEnd(sum); return;
    }
    if (st.ruined || (cfg.mode !== 'live' && st.idx >= g.endIdx)) { endGame(); return; }
    enterGame();
    const m = TA.metrics(g, st);
    $('#t-qty').value = Math.max(1, Math.floor((m.equity * 0.2) / g.c[st.idx]));
    $('#t-price').value = $('#t-sl').value = $('#t-tp').value = $('#j-note').value = '';
    $('#t-risk').value = F.num(Math.min(st.rules.max, 0.01) * 100, 1);
    fillJournalSelects(); resetJournal(true);
    $('#t-err').textContent = '';
    App.t.inst = 'base'; App.lastTrades = st.trades.length; App.coachAI = {}; App.coachKey = '';
    setSide('buy'); setType('market');
  }
  function enterGame() {
    show('game');
    if (!window.LightweightCharts) { toast('Le graphique n’a pas pu se charger (connexion ?).', 'err', 8000); return; }
    if (!App.chart) App.chart = new TA.PriceChart($('#chart'), { onHover: (i) => updateLegend(i) });
    const noVol = App.g.market === 'forex';   // le forex n'a pas de volume centralisé
    $('#inds [data-k=vol]').hidden = noVol;
    App.chart.setGame(App.g, App.st, { ...App.prefs.ind, vol: App.prefs.ind.vol && !noVol });
    $$('#inds .chip').forEach((c) => c.classList.toggle('on', !!App.prefs.ind[c.dataset.k]));
    setTimeMode(App.cfg.time, true);
    setSeg($('#tm-speed'), App.prefs.speed);
    $('#pause-fill').checked = App.prefs.pauseFill;
    updateAll();
    requestAnimationFrame(() => requestAnimationFrame(() => App.chart && App.chart.reset()));
  }

  function updateAll() {
    const g = App.g, st = App.st, i = st.idx, m = TA.metrics(g, st), u = TA.STYLES[g.style];
    $('#px').textContent = F.money(g.c[i]);
    const ch = g.c[i] / g.c[i - 1] - 1;
    $('#chg').textContent = F.spct(ch); $('#chg').className = 'chg ' + cls(ch);
    updateLegend(null);
    // portefeuille
    $('#pf-eq').textContent = F.money(m.equity);
    $('#pf-chg').textContent = `${F.smoney(m.total)} · ${F.spct(m.totalPct)}`; $('#pf-chg').className = 'eq-chg ' + cls(m.total);
    $('#pf-cash').textContent = F.money(m.cash);
    $('#pf-pos').textContent = F.money(st.pos ? st.pos.dir * st.pos.qty * m.price : 0);
    $('#pf-unr').textContent = F.smoney(m.unreal); $('#pf-unr').className = cls(m.unreal);
    $('#pf-real').textContent = F.smoney(m.realized); $('#pf-real').className = cls(m.realized);
    const dd = TA.drawdown(st.equity);
    $('#pf-dd').textContent = F.spct(dd.cur); $('#pf-dd').className = dd.cur < -0.0005 ? 'neg' : '';
    $('#pf-ddmax').textContent = F.spct(dd.max); $('#pf-ddmax').className = dd.max < -0.0005 ? 'neg' : '';
    const lp = TA.liqPrice(g, st), lev = st.maxLev > 1 || (st.pos && st.pos.dir === -1);
    $('#pf-levrow').hidden = !lev; $('#pf-liqrow').hidden = !(lev && lp != null);
    $('#pf-lev').textContent = m.leverage > 0 ? '×' + F.num(m.leverage, 2) + (st.maxLev > 1 ? ' sur ×' + st.maxLev : '') : '—';
    if (lp != null) { $('#pf-liq').textContent = `${F.money(lp)} · ${F.spct(lp / m.price - 1)}`; $('#pf-liq').className = Math.abs(lp / m.price - 1) < 0.08 ? 'neg' : 'warn'; }
    marginBanner(m);
    spark(st.equity);
    // temps
    const played = i - g.startIdx, total = g.endIdx - g.startIdx;
    $('#prog-txt').textContent = `${unitWord()} ${played} sur ${total}`;
    $('#prog-bar').style.width = (played / total) * 100 + '%';
    $('#btn-next').textContent = u.next; $('#mb-next').textContent = u.next;
    $('#mb-px').textContent = F.money(g.c[i]);
    $('#mb-pnl').textContent = `${F.smoney(m.total)} · ${F.spct(m.totalPct)}`; $('#mb-pnl').className = 'mono ' + cls(m.total);
    // contexte
    const sc = TA.SCENARIOS.find((s) => s.id === App.cfg.scenario);
    const rl = st.rules, rtag = rl.mode === 'block' ? `Risque ${F.pct(rl.max).replace(',00', '')} max` : 'Risque conseillé';
    const lead = isLive() ? `<span class="tag">Live</span><span class="tag">${esc(TA.MARKETS[g.market].name)}</span><span class="tag">Cotes au ${shortDay(g.t[i])}</span>` : `<span class="tag">Entraînement</span><span class="tag">${esc(TA.MARKETS[g.market].name)}</span><span class="tag">${esc(u.name)}</span><span class="tag">${esc(sc ? sc.name : '')}</span>`;
    $('#ctx').innerHTML = `${lead}<span class="tag">${rtag}</span>${st.maxLev > 1 ? `<span class="tag">Levier ×${st.maxLev}</span>` : ''}<span class="tag">Niveau ${esc(TA.LEVELS[(st.level || 1) - 1].name)}</span><button class="tag mono" type="button" id="copy-code" title="Copier le code de défi">${isLive() ? esc(App.cfg.code) : 'Défi ' + esc(App.cfg.challenge || App.cfg.code)}</button>`;
    updateTicket(); renderPos(); renderOpts(); renderOrders(); renderJournal(); renderCoach(); applyLiveChrome();
  }

  function updateLegend(hi) {
    const g = App.g; if (!g) return;
    const i = hi == null ? App.st.idx : hi, ch = g.c[i] / g.c[i - 1] - 1;
    $('#legend').innerHTML = `<span>O <b>${g.live ? realPx(g.o[i]) : n2(g.o[i])}</b></span><span>H <b>${g.live ? realPx(g.h[i]) : n2(g.h[i])}</b></span><span>B <b>${g.live ? realPx(g.l[i]) : n2(g.l[i])}</b></span><span>F <b>${g.live ? realPx(g.c[i]) : n2(g.c[i])}</b></span><span class="${cls(ch)}">${F.spct(ch)}</span>${g.market === 'forex' ? '' : `<span>Vol. <b>×${F.num(g.v[i], 1)}</b></span>`}<span>${rel(i)}</span>`;
  }
  // Bandeau d'appel de marge : visible tant que l'appel n'est pas réglé.
  function marginBanner(m) {
    const st = App.st, box = $('#mcall');
    if (!st.call || !st.pos) { box.hidden = true; return; }
    const lv = TA.marginLevels(st), pct = (x) => F.pct(x).replace(',00', '');
    box.hidden = false;
    box.innerHTML = `<b>Appel de marge.</b> Ton compte ne couvre plus ta position (marge ${pct(m.ratio)}, minimum ${pct(lv.call)}). Réduis ta position avant la barre suivante, sinon elle sera liquidée${TA.liqPrice(App.g, st) != null ? ` (prix de liquidation : ${F.money(TA.liqPrice(App.g, st))})` : ''}.`;
  }

  function spark(eq) {
    const W = 300, H = 44, base = CFG.START_CASH;
    let lo = Math.min(base, ...eq), hi = Math.max(base, ...eq);
    const pad = (hi - lo) * 0.1 || base * 0.001; lo -= pad; hi += pad;
    const y = (v) => (H - ((v - lo) / (hi - lo)) * H).toFixed(1), n = eq.length;
    const pts = eq.map((v, k) => `${((n < 2 ? 0 : k / (n - 1)) * W).toFixed(1)},${y(v)}`).join(' ');
    const up = eq[n - 1] >= base, c = up ? 'var(--up)' : 'var(--down)';
    $('#pf-spark').innerHTML = `<line x1="0" x2="${W}" y1="${y(base)}" y2="${y(base)}" stroke="var(--line-2)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>` +
      (n > 1 ? `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` : '');
  }

  /* =====================================================================
     Ticket d'ordre
     ===================================================================== */
  function setSide(v) {
    App.t.side = v; setSeg($('#t-side'), v);
    refreshTicketChrome(); updateTicket();
  }
  function setType(v) { App.t.type = v; setSeg($('#t-type'), v); refreshTicketChrome(); updateTicket(); }
  function fillJournalSelects() {
    const opt = (list) => '<option value="">Choisir…</option>' + list.map(([id, t]) => `<option value="${id}">${esc(t)}</option>`).join('');
    $('#j-reason').innerHTML = opt(TA.REASONS);
    $('#j-emo').innerHTML = opt(TA.EMOTIONS);
  }
  // En mode obligatoire, chaque ordre repart d'un journal vierge : le choix doit être conscient.
  function resetJournal(force) {
    if (force || App.st.rules.mode === 'block') { $('#j-reason').value = ''; $('#j-emo').value = ''; }
    $('#j-note').value = '';
  }
  // Que ferait un ordre dans le sens choisi ? Acheter ouvre un long ou couvre un short ; vendre ferme un long ou ouvre un short.
  function ticketAction() {
    const st = App.st, g = App.g, dir = App.t.side === 'buy' ? 1 : -1, p = st.pos, closing = !!p && p.dir !== dir;
    let hint, locked = false;
    if (closing) hint = p.dir === 1 ? 'Ferme ta position longue.' : 'Couvre ta vente à découvert : tu rachètes pour fermer ta position.';
    else if (dir === 1) hint = p ? 'Augmente ta position longue.' : 'Ouvre une position longue : tu gagnes si le prix monte.';
    else if (p) hint = 'Augmente ta vente à découvert.';
    else {
      const sc = TA.shortCheck(g, st);
      if (sc.ok) hint = 'Ouvre une vente à découvert : tu gagnes si le prix baisse. Le stop se place au-dessus du prix.' + (TA.MARKETS[g.market].borrow ? ' Des frais d’emprunt de ' + F.pct(TA.MARKETS[g.market].borrow).replace(',00', '') + ' par an sont prélevés à chaque barre.' : '');
      else { hint = sc.why; locked = true; }
    }
    return { dir, closing, hint, locked, p };
  }
  // Libellés et champs du ticket selon l'action (sans toucher aux valeurs saisies).
  function ticketChrome() {
    const g = App.g, st = App.st, { type } = App.t, strict = st.rules.mode === 'block', a = ticketAction();
    $('#sl-l').textContent = strict ? 'Stop-loss (obligatoire)' : 'Stop-loss';
    $('#t-sl').placeholder = strict ? 'Obligatoire' : 'Facultatif';
    $('#j-legend').textContent = strict ? 'Journal de l’ordre (obligatoire)' : 'Journal de l’ordre (facultatif)';
    $('#qty-l').textContent = `Quantité (${TA.MARKETS[g.market].many})`;
    for (const id of ['#f-exits', '#t-size', '#f-journal']) $(id).hidden = a.closing;
    $('#t-act').textContent = a.hint; $('#t-act').className = 'hint' + (a.locked ? ' warn' : '');
    $('#f-price').hidden = type === 'market';
    $('#f-price-l').textContent = type === 'limit' ? 'Prix limite' : 'Prix de déclenchement (stop)';
    const go = $('#t-go'), verb = a.closing ? (a.p.dir === 1 ? 'Vendre' : 'Couvrir') : a.dir === 1 ? 'Acheter' : 'Vendre à découvert';
    go.className = 'btn big ' + (App.t.side === 'buy' ? 'buy' : 'sell');
    go.textContent = verb + (type === 'market' ? ' au marché' : type === 'limit' ? ' (ordre limite)' : ' (ordre stop)');
    // instrument : sous-jacent ou options
    const can = TA.canUse(st.level || 1, 'options'), opt = App.t.inst === 'opt' && can.ok;
    if (!can.ok) App.t.inst = 'base';
    $('#inst-opt').disabled = !can.ok; $('#inst-opt').title = can.ok ? '' : can.why;
    setSeg($('#t-inst'), opt ? 'opt' : 'base');
    $('#opt-panel').hidden = !opt;
    for (const id of ['#t-side', '#t-act', '#t-type', '#f-qty', '#t-quick', '#t-est']) $(id).hidden = opt;
    if (opt) {
      for (const id of ['#f-price', '#f-exits', '#t-size']) $(id).hidden = true;
      $('#f-journal').hidden = false;
      go.className = 'btn big buy'; go.textContent = 'Acheter l’option';
    }
  }
  function refreshTicketChrome() {
    if (!App.st) return;
    ticketChrome();
    $('#t-err').textContent = '';
  }
  function readTicket() {
    return {
      side: App.t.side, type: App.t.type, qty: parseNum($('#t-qty').value), price: parseNum($('#t-price').value), sl: parseNum($('#t-sl').value), tp: parseNum($('#t-tp').value),
      j: { reason: $('#j-reason').value, emotion: $('#j-emo').value, note: $('#j-note').value.trim() },
    };
  }
  // Calculateur : quantité qui fait risquer X % du compte avec le stop saisi (plafonné par la règle en mode obligatoire).
  function updateSizeBox(o, px, dir) {
    const g = App.g, st = App.st, last = g.c[st.idx], rules = st.rules, txt = $('#sz-txt'), use = $('#sz-use'), box = $('#t-size');
    let pct = parseNum($('#t-risk').value) / 100, note = '';
    use.hidden = true; box.classList.remove('over'); App.sizeQty = 0;
    if (!(pct > 0)) { txt.textContent = 'Entre le risque voulu, par exemple 1.'; return; }
    if (rules.mode === 'block' && pct > rules.max + 1e-12) { pct = rules.max; note = ` (plafonné à ${F.pct(rules.max).replace(',00', '')})`; box.classList.add('over'); }
    else if (rules.mode === 'warn' && pct > rules.max + 1e-12) box.classList.add('over');
    const ref = px || last * (1 + dir * TA.halfSpread(g, st.idx));
    const okSl = dir === 1 ? o.sl > 0 && o.sl < Math.min(ref, last) : o.sl > Math.max(ref, last);
    if (!okSl) { txt.textContent = dir === 1 ? 'Entre un stop-loss pour calculer la taille.' : 'Entre un stop-loss (au-dessus du prix) pour calculer la taille.'; return; }
    const s = TA.sizeForRisk(g, st, ref, o.sl, pct, dir), mk = TA.MARKETS[g.market];
    App.sizeQty = s.qty;
    txt.textContent = s.qty > 0 ? `= ${F.int(s.qty)} ${s.qty === 1 ? mk.one : mk.many}${s.cashLimited ? (st.maxLev > 1 ? ' (limité par ta marge)' : ' (limité par tes liquidités)') : ''}${note}` : `Aucune ${mk.one} : ce stop est trop loin pour ce risque.`;
    use.hidden = s.qty < 1;
  }
  function updateTicket() {
    const g = App.g, st = App.st; if (!g || !st) return;
    ticketChrome();
    if (App.t.inst === 'opt') { updateOptPanel(); return; }
    const o = readTicket(), i = st.idx, last = g.c[i], hs = TA.halfSpread(g, i), m = TA.metrics(g, st), a = ticketAction(), dir = a.dir, mk = TA.MARKETS[g.market];
    const q = Number.isInteger(o.qty) && o.qty > 0 ? o.qty : null;
    const px = o.type === 'market' ? last * (1 + dir * hs) : o.price > 0 ? o.price : null;
    const row = (k, v, c = '') => `<div><dt>${k}</dt><dd class="${c}">${v}</dd></div>`;
    let html = '';
    if (!q || !px) {
      html = row('Prix estimé', px ? F.money(px) : '—') + row('Montant', '—');
    } else {
      const fee = TA.fee(g, q, px), amt = q * px;
      html += row(o.type === 'market' ? 'Prix estimé (spread inclus)' : 'Prix demandé', F.money(px)) + row('Montant', F.money(amt)) + row('Frais', F.money(fee));
      if (!a.closing) {
        const same = st.pos ? st.pos.qty : 0, eqAfter = m.equity - q * Math.abs(px - last) - fee, expo = same * last + q * px;
        html += row('Part du compte', F.pct(amt / m.equity));
        if (st.maxLev > 1 || dir === -1) html += row('Levier après l’ordre', '×' + F.num(eqAfter > 0 ? expo / eqAfter : 99, 2) + (st.maxLev > 1 ? ' (max ×' + st.maxLev + ')' : ''));
        const mq = TA.maxQty(g, st, px, dir);
        if (q > mq) html += `<div class="risk over"><dt>${st.maxLev > 1 ? 'Marge insuffisante' : dir === 1 ? 'Liquidités insuffisantes' : 'Marge insuffisante'}</dt><dd class="warn">maximum : ${F.int(mq)} ${mq === 1 ? mk.one : mk.many}</dd></div>`;
        const sl = dir === 1 ? (o.sl > 0 && o.sl < Math.min(px, last) ? o.sl : null) : (o.sl > Math.max(px, last) ? o.sl : null);
        const tp = dir === 1 ? (o.tp > px ? o.tp : null) : (o.tp > 0 && o.tp < px ? o.tp : null);
        if (sl) {
          const { risk, pct: rp } = TA.riskOf(g, st, q, px, sl, dir), max = st.rules.max, over = rp > max + 1e-12, maxTxt = F.pct(max).replace(',00', '');
          html += `<div class="risk${over ? ' over' : ''}"><dt>Risque si le stop est touché</dt><dd class="neg">${F.money(-risk)} · ${F.pct(rp)} du compte${over ? (st.rules.mode === 'block' ? ` · bloqué (max ${maxTxt})` : ` · au-delà de ${maxTxt}`) : ''}</dd></div>`;
          if (tp) {
            const own = dir * (px - sl) * q + 2 * fee, reward = dir * (tp - px) * q - 2 * fee;
            html += row('Gain si l’objectif est atteint', F.smoney(reward), 'pos') + row('Rendement / risque', '1 : ' + F.num(reward / own, 2), reward / own >= 2 ? 'pos' : reward / own < 1 ? 'warn' : '');
          }
        } else {
          html += st.rules.mode === 'block'
            ? `<div class="risk over"><dt>Stop-loss obligatoire</dt><dd class="warn">place un stop pour ouvrir</dd></div>`
            : `<div class="risk"><dt>Sans stop-loss</dt><dd class="warn">perte non limitée</dd></div>`;
        }
      } else if (q <= a.p.qty) {
        const pd = a.p.dir, net = pd * (px - a.p.avg) * q - (a.p.fees * q) / a.p.qty - fee;
        html += row(pd === 1 ? 'Produit net' : 'Coût du rachat', F.money(pd === 1 ? amt - fee : amt + fee)) + row('P&L réalisé estimé', F.smoney(net), cls(net));
      }
    }
    $('#t-est').innerHTML = html;
    if (!a.closing) updateSizeBox(o, px, dir);
  }
  function quickQty(p) {
    const g = App.g, st = App.st, o = readTicket(), a = ticketAction(), last = g.c[st.idx], hs = TA.halfSpread(g, st.idx);
    if (a.closing) return Math.max(1, p === 1 ? a.p.qty : Math.floor(a.p.qty * p));
    const px = o.type === 'market' || !(o.price > 0) ? last * (1 + a.dir * hs) : o.price;
    return Math.max(0, p === 1 ? TA.maxQty(g, st, px, a.dir) : Math.floor(TA.maxQty(g, st, px, a.dir) * p));
  }
  function submitTicket() {
    if (App.t.inst === 'opt') { submitOption(); return; }
    const err = $('#t-err'); err.textContent = '';
    const o = readTicket(), a = ticketAction();
    if ([o.price, o.sl, o.tp].some(Number.isNaN)) { err.textContent = 'Un des prix saisis n’est pas un nombre valide.'; return; }
    if (a.closing) { o.sl = null; o.tp = null; }
    if (o.type === 'market') o.price = null;
    const r = TA.submit(App.g, App.st, o);
    if (!r.ok) { err.textContent = r.error; return; }
    toast(r.msg, 'ok');
    $('#t-price').value = $('#t-sl').value = $('#t-tp').value = '';
    resetJournal();
    afterAction();
  }
  function afterAction() {
    const nTr = App.lastTrades == null ? App.st.trades.length : App.lastTrades;
    App.chart && App.chart.refresh(App.st);
    updateAll(); saveSoon();
    if (App.st.trades.length > nTr) coachToast(nTr);
    App.lastTrades = App.st.trades.length;
  }

  /* =====================================================================
     Onglets : position, ordres, historique
     ===================================================================== */
  function renderPos() {
    const st = App.st, p = st.pos, box = $('#pos-main');
    const key = p ? [p.dir, p.qty, p.avg.toFixed(5), p.sl, p.tp].join('|') : 'none';
    if (key !== App.posKey) {
      App.posKey = key;
      if (!p) {
        box.innerHTML = '<p class="empty">Aucune position ouverte. Place un ordre pour commencer : un achat ouvre une position longue, une vente à découvert (dès le niveau Intermédiaire) gagne quand le prix baisse.</p>';
      } else {
        const mk = TA.MARKETS[App.g.market];
        box.innerHTML = `<div class="pos-box">
          <div class="pos-head"><span class="tag ${p.dir === 1 ? 'long' : 'short'}">${p.dir === 1 ? 'Long' : 'Short'}</span><span class="mono">${F.int(p.qty)} ${p.qty === 1 ? mk.one : mk.many}</span></div>
          <dl class="kv"><div><dt>Prix moyen</dt><dd>${F.money(p.avg)}</dd></div><div><dt>Dernier prix</dt><dd id="p-last"></dd></div>
            <div><dt>Valeur</dt><dd id="p-val"></dd></div><div><dt>P&amp;L non réalisé</dt><dd id="p-pnl"></dd></div></dl>
          <div class="two"><label class="field"><span>Stop-loss</span><input id="p-sl" inputmode="decimal" value="${inp(p.sl)}" placeholder="Aucun" autocomplete="off"></label>
            <label class="field"><span>Objectif</span><input id="p-tp" inputmode="decimal" value="${inp(p.tp)}" placeholder="Aucun" autocomplete="off"></label></div>
          ${p.dir === -1 ? `<p class="hint">Vente à découvert : ton stop se place au-dessus du prix, ton objectif en dessous.${mk.borrow ? ` Frais d’emprunt : ${F.pct(mk.borrow).replace(',00', '')} par an, prélevés à chaque barre et inclus dans les frais de la transaction.` : ''}</p>` : ''}
          ${st.rules.mode === 'block' ? '<p class="hint">Règle obligatoire : tu peux rapprocher ton stop, pas l’éloigner ni le retirer.</p>' : ''}
          <div class="acts"><button class="btn" type="button" id="p-apply">Appliquer</button><button class="btn sell" type="button" id="p-close">Clôturer la position</button></div>
          <p class="err" id="p-err" role="alert"></p></div>`;
        $('#p-apply').onclick = () => {
          const sl = parseNum($('#p-sl').value), tp = parseNum($('#p-tp').value);
          if (Number.isNaN(sl) || Number.isNaN(tp)) { $('#p-err').textContent = 'Un des prix saisis n’est pas un nombre valide.'; return; }
          const r = TA.setExits(App.g, App.st, sl, tp);
          if (!r.ok) { $('#p-err').textContent = r.error; return; }
          toast(r.msg, 'ok'); App.posKey = ''; afterAction();
        };
        $('#p-close').onclick = () => {
          const r = TA.submit(App.g, App.st, { side: App.st.pos.dir === 1 ? 'sell' : 'buy', type: 'market', qty: App.st.pos.qty });
          if (!r.ok) { $('#p-err').textContent = r.error; return; }
          toast(r.msg, 'ok'); afterAction();
        };
      }
    }
    if (p) {
      const c = App.g.c[st.idx], pnl = p.dir * p.qty * (c - p.avg) - p.fees;
      $('#p-last').textContent = F.money(c); $('#p-val').textContent = F.money(p.dir * p.qty * c);
      $('#p-pnl').textContent = `${F.smoney(pnl)} · ${F.spct(pnl / (p.qty * p.avg))}`; $('#p-pnl').className = cls(pnl);
    }
  }
  function renderOrders() {
    const os = App.st.orders; $('#b-ord').textContent = os.length;
    $('#tab-ord').innerHTML = os.length
      ? '<div class="olist">' + os.map((o) => `<div class="orow"><span>${o.side === 'buy' ? 'Achat' : 'Vente'} ${o.type === 'limit' ? 'limite' : 'stop'}${o.intent === 'close' ? ' (fermeture)' : ''} ·<span class="mono">${F.int(o.qty)} @ ${F.money(o.price)}</span>${o.sl ? ` <span class="dim mono">SL ${n2(o.sl)}</span>` : ''}${o.tp ? ` <span class="dim mono">OBJ ${n2(o.tp)}</span>` : ''}</span><button class="btn sm ghost" type="button" data-cancel="${o.id}">Annuler</button></div>`).join('') + '</div>'
      : '<p class="empty">Aucun ordre en attente. Les ordres limite et stop apparaissent ici jusqu’à leur exécution.</p>';
  }
  /* ---------- journal de trades : généré à partir des ordres, complété par tes notes ---------- */
  const tagHTML = (t) => (t ? `<span class="tag">${esc(t)}</span>` : '');
  const when = (i, reveal) => (reveal && !App.g.live ? `${rel(i)} · ${F.date(App.g.t[i])}` : rel(i));
  const unitName = () => TA.MARKETS[App.g.market].many;
  function entryHTML(e, reveal) {
    return `<div class="jent"><span class="mono">${when(e.idx, reveal)}</span><span class="mono">${F.int(e.qty)} @ ${F.money(e.px)}</span>${tagHTML(TA.labelOf(TA.REASONS, e.reason))}${tagHTML(TA.labelOf(TA.EMOTIONS, e.emotion))}</div>` +
      (e.note ? `<p class="jnote">« ${esc(e.note)} »</p>` : '');
  }
  function journalHTML(reveal) {
    const st = App.st, cards = [];
    if (st.pos) {
      cards.push(`<article class="jc open"><header><span class="when">Position ${st.pos.dir === -1 ? 'courte' : 'longue'} ouverte · ${F.int(st.pos.qty)} ${unitName()}</span><span class="res dim">en cours</span></header>${st.pos.entries.map((e) => entryHTML(e, reveal)).join('') || '<p class="jnote dim">Entrée sans journal (partie commencée avant le journal).</p>'}</article>`);
    }
    for (const o of st.opts) {
      cards.push(`<article class="jc open"><header><span class="when">Option ouverte · ${o.kind === 'call' ? 'Call' : 'Put'} ${n2(o.strike)} · ${F.int(o.qty)} contrat${o.qty > 1 ? 's' : ''} · échéance ${rel(o.expIdx)}</span><span class="res dim">en cours</span></header>${o.entries.map((e) => entryHTML(e, reveal)).join('')}</article>`);
    }
    for (const t of st.trades.slice().reverse()) {
      const r = t.r == null ? '' : ` · ${t.r > 0 ? '+' : ''}${F.num(t.r, 2)} R`;
      cards.push(`<article class="jc"><header><span class="when">${when(t.openIdx, reveal)} → ${when(t.closeIdx, reveal)} · ${esc(tradeLabel(t))} · ${esc(t.reason)}</span><span class="res ${cls(t.net)}">${F.smoney(t.net)}${r}</span></header>` +
        (t.entries.map((e) => entryHTML(e, reveal)).join('') || '') +
        `<label class="field"><span>Ce que j’en retiens</span><input data-note="${t.id}" maxlength="300" value="${esc(t.note || '')}" placeholder="Une leçon, une erreur, un bon réflexe…" autocomplete="off"></label></article>`);
    }
    return cards.length ? `<div class="jlist">${cards.join('')}</div>` : '<p class="empty">Ton journal se remplit tout seul : raison d’entrée, émotion, résultat et multiple R de chaque transaction.</p>';
  }
  function renderJournal() {
    const st = App.st, key = [st.trades.length, st.pos ? st.pos.entries.length + ':' + st.pos.qty : 'x', st.opts.map((o) => o.id + ':' + o.qty).join(',')].join('|');
    $('#b-hist').textContent = st.trades.length + (st.pos ? 1 : 0) + st.opts.length;
    if (key === App.jKey) return;     // pas de rendu à chaque barre : on ne dérange pas une note en cours de saisie
    App.jKey = key;
    $('#tab-hist').innerHTML = journalHTML(false);
  }
  function setTab(t) {
    App.tab = t;
    $$('#tabs .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    for (const k of ['pos', 'ord', 'hist', 'coach']) $('#tab-' + k).hidden = k !== t;
  }

  /* =====================================================================
     Temps : tour par tour / temps réel accéléré
     ===================================================================== */
  const PERIOD = { 1: 1200, 2: 600, 5: 240, 10: 120 };
  function setTimeMode(v, silent) {
    if (!App.cfg) return;
    App.cfg.time = v; App.prefs.time = v; savePrefs();
    setSeg($('#tm-mode'), v);
    $('#rt').hidden = v !== 'rt';
    if (v === 'turn') pause();
    if (!silent) saveSoon();
  }
  function play() {
    if (App.timer || !App.g || App.st.closed || isLive()) return;
    App.playing = true;
    App.timer = setInterval(() => step(true), PERIOD[App.prefs.speed] || 1200);
    $('#btn-play').textContent = 'Pause';
  }
  function pause() {
    if (App.timer) clearInterval(App.timer);
    App.timer = null; App.playing = false;
    const b = $('#btn-play'); if (b) b.textContent = 'Lecture';
  }
  function step(auto) {
    if (!App.g || App.st.closed || App.screen !== 'game' || isLive()) return;   // un compte Live ne peut pas avancer sans nouvelles cotes
    const nTr = App.st.trades.length;
    const ev = TA.advance(App.g, App.st);
    App.chart && App.chart.push(App.st);
    let touched = false;
    for (const e of ev) {
      if (e.kind === 'fill') { toast(e.msg, e.stop ? 'warn' : 'ok', 5000); touched = true; }
      else if (e.kind === 'cancel') { toast(e.msg, 'warn'); touched = true; }
      else if (e.kind === 'call') { toast(e.msg, 'err', 10000); touched = true; }
      else if (e.kind === 'ruin') toast(e.msg, 'err', 8000);
    }
    // un appel de marge arrête toujours le temps réel : il faut réagir avant la barre suivante
    if (auto && touched && (App.prefs.pauseFill || ev.some((e) => e.kind === 'call'))) pause();
    updateAll(); saveSoon();
    if (App.st.trades.length > nTr) coachToast(nTr);
    App.lastTrades = App.st.trades.length;
    if (ev.some((e) => e.kind === 'end' || e.kind === 'ruin')) endGame();
  }

  /* =====================================================================
     Sauvegarde automatique
     ===================================================================== */
  function saveNow() {
    clearTimeout(App.saveT); App.saveT = null;
    if (!App.g || !App.st || App.st.closed) return;
    store.set(isLive() ? KEY_LIVE : KEY_SAVE, { app: 'trading-academy', v: 1, savedAt: Date.now(), cfg: App.cfg, st: App.st });
  }
  function saveSoon() { if (!App.saveT) App.saveT = setTimeout(saveNow, 300); }

  /* =====================================================================
     Fin de partie : révélation
     ===================================================================== */
  function endGame() {
    pause();
    TA.finish(App.g, App.st);
    const sum = TA.summary(App.g, App.st, App.bench);
    // discipline : la partie est évaluée selon le niveau de départ, puis le profil est mis à jour
    const level = App.st.level || App.profile.level;
    const ev = TA.evaluate(App.g, App.st, sum, level);
    const live = isLive();
    const out = TA.applyResult(App.profile, { code: App.cfg.code, level, ev, ret: sum.retPct, dd: sum.maxDD, trades: sum.trades, replay: !!App.cfg.replay, live });
    saveProfile();
    App.endInfo = { level, ev, out, fresh: !App.cfg.replay };
    App.sum = sum;
    const res = store.get(KEY_RESULTS) || [];
    res.unshift(TA.boardRow(App.cfg, App.st, sum, App.prefs.pseudo || 'Moi', App.uid || deviceId(), App.cfg.challenge || App.cfg.code));
    store.set(KEY_RESULTS, res.slice(0, 100));
    store.del(live ? KEY_LIVE : KEY_SAVE);
    showEnd(sum);
  }
  function cmpSVG(c) {
    const W = 640, H = 240, L = 46, R = 12, T = 12, B = 26;
    const all = [...c.you, ...c.asset, ...c.index];
    let lo = Math.min(...all, 100), hi = Math.max(...all, 100);
    const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const n = c.you.length, x = (i) => L + (W - L - R) * (n < 2 ? 0 : i / (n - 1)), y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const line = (a, col, w) => `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" points="${a.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ')}"/>`;
    let grid = '';
    for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4; grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${F.num(v, 0)}</text>`; }
    return `<svg class="cmp" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution comparée de ton portefeuille, de l’actif et de l’indice, base 100">${grid}
      <line x1="${L}" x2="${W - R}" y1="${y(100).toFixed(1)}" y2="${y(100).toFixed(1)}" stroke="var(--line-2)" stroke-dasharray="4 4"/>
      ${line(c.index, 'var(--warn)', 1.5)}${line(c.asset, 'var(--faint)', 1.5)}${line(c.you, 'var(--accent)', 2.2)}</svg>`;
  }
  function verdict(s) {
    if (!s.trades) return `Tu n’as fait aucune transaction : ton capital est resté intact pendant que l’actif faisait ${F.spct(s.bh)}.`;
    const d = (s.retPct - s.bh) * 100;
    return d >= 0
      ? `Tu as fait mieux que d’acheter et de conserver : ${F.spct(s.retPct)} contre ${F.spct(s.bh)}, soit ${F.num(d, 1)} points de plus.`
      : `Acheter et conserver aurait fait mieux : ${F.spct(s.bh)} contre ${F.spct(s.retPct)} pour toi, soit ${F.num(-d, 1)} points de moins.`;
  }
  const unlockNames = (levelId) => Object.values(TA.FEATURES).filter((f) => f.level === levelId).map((f) => f.name);
  // Carte « Ta discipline » : critères du niveau de départ, résultat et éventuel passage de niveau.
  function disciplineHTML(info) {
    if (!info) return '';
    const { ev, out, level } = info, next = TA.LEVELS[level];
    if (!ev) return `<section class="card"><h2>Niveau</h2><p class="verdict">Tu es déjà Pro : toutes les fonctions sont débloquées, il n’y a plus de niveau à franchir.</p></section>`;
    const crit = ev.criteria.map((c) => `<li class="${c.ok ? 'fait' : 'afaire'}"><span class="icone">${c.ok ? '✓' : '✗'}</span><span>${esc(c.label)} <span class="dim">· ${esc(c.detail)}</span></span></li>`).join('');
    let msg;
    if (out.leveledUp) msg = `<p class="up-note"><strong>Niveau ${esc(next.name)} débloqué.</strong> Nouveau : ${esc(unlockNames(next.id).join(', ') || 'aucune nouvelle fonction')}. Certaines fonctions arrivent dans les prochaines phases du simulateur.</p>`;
    else if (!out.counted) msg = `<p class="dim" style="margin:0">${esc(out.why)}${out.passed ? ' Tous les critères étaient pourtant remplis.' : ''}</p>`;
    else if (out.passed) msg = `<p style="margin:0"><strong>Partie disciplinée :</strong> ${out.progress} sur ${out.needGames} pour passer ${esc(next.name)}.</p>`;
    else msg = `<p style="margin:0"><strong>Partie non qualifiante.</strong> Corrige les points marqués ✗ : ta progression reste à ${out.progress} sur ${out.needGames}.</p>`;
    return `<section class="card profile"><h2>Ta discipline · niveau ${esc(TA.LEVELS[level - 1].name)}</h2><ul class="crit">${crit}</ul>${msg}</section>`;
  }
  function showEnd(s) {
    App.sum = s;
    const g = App.g, m = g.meta, sc = TA.SCENARIOS.find((x) => x.id === App.cfg.resolved), u = TA.STYLES[g.style];
    const homeName = s.home === 'tsx' ? 'S&P/TSX' : 'S&P 500';
    const kp = (label, v) => `<div><dt>${label}</dt><dd class="${cls(v)}">${F.spct(v)}</dd></div>`;
    const stat = (k, v, c = '') => `<div><dt>${k}</dt><dd class="${c}">${v}</dd></div>`;
    const rs = App.st.trades.filter((t) => t.r != null), rMean = rs.length ? rs.reduce((a, t) => a + t.r, 0) / rs.length : null;
    $('#screen-end').innerHTML = `
      <section class="card reveal">
        <p class="eyebrow">${isLive() ? 'Compte Live clôturé' : 'Tu viens de trader…'}</p>
        <h1 class="tick">${esc(m.s)}</h1>
        <p class="aname">${esc(m.n)} · ${esc(m.x)} · ${esc(m.sec)}</p>
        <p class="range">Du ${F.date(s.day0)} au ${F.date(s.day1)} · ${s.bars} ${s.bars > 1 ? (g.style === 'long' ? 'semaines' : g.market === 'stock' ? 'jours de bourse' : 'jours') : u.barName} · ${isLive() ? 'Compte Live' : esc(sc ? sc.name : '')}</p>
        ${App.st.ruined ? '<p class="neg" style="margin:10px 0 0">Ton compte a été épuisé avant la fin de la période : la partie s’est arrêtée.</p>' : ''}
      </section>
      <dl class="kpis">${kp('Ton rendement', s.retPct)}${kp('Actif (acheter et conserver)', s.bh)}${kp(homeName, s.home === 'tsx' ? s.tsx : s.sp)}${kp(s.home === 'tsx' ? 'S&P 500' : 'S&P/TSX', s.home === 'tsx' ? s.sp : s.tsx)}</dl>
      <section class="card"><h2>Évolution, base 100 au départ</h2>${cmpSVG(s.curves)}
        <div class="leg"><span><i style="--c:var(--accent)"></i>Ton portefeuille</span><span><i style="--c:var(--faint)"></i>${esc(m.s)}</span><span><i style="--c:var(--warn)"></i>${homeName}</span></div>
        <p class="dim" style="margin:8px 0 0">${short(s.day0)} → ${short(s.day1)}</p></section>
      <section class="card"><p class="verdict">${verdict(s)}</p>
        <dl class="kv" style="margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          ${stat('Valeur finale', F.money(s.equity))}${stat('Gain ou perte', F.smoney(s.total), cls(s.total))}${stat('Transactions', s.trades)}
          ${stat('Taux de réussite', s.winRate == null ? '—' : F.pct(s.winRate))}${stat('Gain moyen', s.avgWin == null ? '—' : F.smoney(s.avgWin), 'pos')}${stat('Perte moyenne', s.avgLoss == null ? '—' : F.smoney(s.avgLoss), 'neg')}${stat('Frais payés', F.money(s.fees))}${stat('Multiple R moyen', rMean == null ? '—' : (rMean > 0 ? '+' : '') + F.num(rMean, 2) + ' R', rMean == null ? '' : cls(rMean))}
          ${stat('Ratio de Sharpe <span class="dim">(annualisé)</span>', (s.sharpe == null ? '—' : F.num(s.sharpe, 2)) + `<br><span class="dim">actif : ${s.assetSharpe == null ? '—' : F.num(s.assetSharpe, 2)}</span>`, s.sharpe == null ? '' : cls(s.sharpe))}
          ${stat('Drawdown maximal', F.spct(s.maxDD) + `<br><span class="dim">actif : ${F.spct(s.assetMaxDD)}</span>`, s.maxDD < -0.0005 ? 'neg' : '')}</dl>
        <p class="fine" style="margin-top:10px">Le Sharpe compare le rendement au risque pris, taux sans risque à 0 %. Le drawdown est le pire recul depuis un sommet de ton compte.</p></section>
      ${App.st.trades.some((t) => t.reason === 'Liquidation') ? `<section class="card"><p class="verdict">Une de tes positions a été liquidée par la plateforme : ton compte ne couvrait plus la marge exigée. La leçon sur le levier explique pourquoi et comment l’éviter.</p><div style="margin-top:10px"><button class="btn" type="button" data-lesson="leverage">Ouvrir la leçon sur le levier</button></div></section>` : ''}
      ${coachGameHTML()}
      ${disciplineHTML(App.endInfo)}
      ${publishHTML()}
      <section class="card"><h2>Ton journal</h2>${journalHTML(true)}</section>
      <div class="end-acts"><button class="btn primary" type="button" id="e-new">Nouvelle partie</button>${isLive() ? '' : `<button class="btn" type="button" id="e-replay">Rejouer ce défi</button><button class="btn" type="button" id="e-copy">Copier le code de défi ${esc(App.cfg.challenge || App.cfg.code)}</button>`}<button class="btn ghost" type="button" id="e-export">Exporter la partie</button></div>`;
    $('#e-new').onclick = goHome;
    $('#e-export').onclick = exportSave;
    const copyBtn = $('#e-copy');
    if (copyBtn) copyBtn.onclick = () => { const c = App.cfg.challenge || App.cfg.code; try { navigator.clipboard.writeText(c).then(() => toast('Code de défi copié : ' + c, 'ok'), () => toast('Code de défi : ' + c, 'info', 8000)); } catch (e) { toast('Code de défi : ' + c, 'info', 8000); } };
    const replayBtn = $('#e-replay');
    if (replayBtn) replayBtn.onclick = async () => {
      try {
        const c = { ...App.cfg, created: Date.now(), replay: true, level: App.profile.level, maxLev: TA.leverChoices(App.cfg.market, App.profile.level).includes(App.cfg.maxLev) ? App.cfg.maxLev : 1 };   // partie rejouée : ne compte pas pour le niveau
        const g2 = TA.buildGame(await loadAsset(c.plan.assetId), c.plan, c.style, c.length);
        begin(c, g2, TA.newState(g2, c.rules, c.level, c.maxLev));
      } catch (e) { toast(e.message, 'err'); }
    };
    show('end');
  }

  function goHome() { pause(); saveNow(); show('home'); renderResume(); renderLiveCard(); renderProfile(); refreshSetup(); renderLearnCard(); }

  /* ---------- options : panneau du ticket, options détenues ---------- */
  const optSel = { kind: 'call', exp: 1, k: 2 };   // échéance et prix d'exercice choisis par leur rang : ils suivent le prix à chaque barre
  function optChain() {
    const g = App.g, st = App.st, S = g.c[st.idx], exps = TA.optionExpiries(g), ks = TA.optionStrikes(S);
    return { S, exps, ks, e: Math.min(optSel.exp, exps.length - 1), k: Math.min(optSel.k, ks.length - 1) };
  }
  function updateOptPanel() {
    const g = App.g, st = App.st, { S, exps, ks, e, k } = optChain(), unit = g.style === 'long' ? 'semaines' : 'jours';
    const eHtml = exps.map((x, i) => `<option value="${i}">${x} ${unit} (échéance ${rel(st.idx + x)})</option>`).join('');
    const kHtml = ks.map((x, i) => {
      const m = x / S - 1, itm = optSel.kind === 'call' ? x < S : x > S;
      return `<option value="${i}">${n2(x)} · ${Math.abs(m) < 0.012 ? 'au prix' : itm ? 'dans la monnaie' : 'hors de la monnaie'} (${F.spct(m)})</option>`;
    }).join('');
    if ($('#o-exp').innerHTML !== eHtml) $('#o-exp').innerHTML = eHtml;
    if ($('#o-strike').innerHTML !== kHtml) $('#o-strike').innerHTML = kHtml;
    $('#o-exp').value = String(e); $('#o-strike').value = String(k);
    setSeg($('#o-kind'), optSel.kind);
    const K = ks[k], expIdx = st.idx + exps[e], qty = parseNum($('#o-qty').value), q = TA.optionQuote(g, st.idx, optSel.kind, K, expIdx), m = TA.metrics(g, st);
    const mult = CFG.OPT_MULT, row = (a, b, c = '') => `<div><dt>${a}</dt><dd class="${c}">${b}</dd></div>`;
    const be = optSel.kind === 'call' ? K + q.ask : K - q.ask;
    let html = row('Prime (prix d’achat)', `${F.money(q.ask)} par unité`) + row('Delta', F.num(q.delta, 2)) + row('Volatilité estimée', F.pct(q.sigma).replace(',00', '')) +
      row('Point mort à l’échéance', `${F.money(be)} (${F.spct(be / S - 1)})`);
    if (Number.isInteger(qty) && qty >= 1) {
      const cost = qty * mult * q.ask, fee = qty * CFG.OPT_FEE, risk = cost + fee, rp = risk / m.equity, max = st.rules.max, over = rp > max + 1e-12;
      html += row('Coût de la prime', F.money(cost)) + row('Frais', F.money(fee));
      html += `<div class="risk${over ? ' over' : ''}"><dt>Perte maximale (prime + frais)</dt><dd class="neg">${F.money(-risk)} · ${F.pct(rp)} du compte${over ? (st.rules.mode === 'block' ? ` · bloqué (max ${F.pct(max).replace(',00', '')})` : ` · au-delà de ${F.pct(max).replace(',00', '')}`) : ''}</dd></div>`;
      if (risk > Math.max(0, st.cash)) html += `<div class="risk over"><dt>Liquidités insuffisantes</dt><dd class="warn">une option se paie comptant</dd></div>`;
    } else html += row('Coût de la prime', '—');
    $('#o-est').innerHTML = html;
  }
  function submitOption() {
    const err = $('#t-err'); err.textContent = '';
    const { ks, exps, e, k } = optChain(), st = App.st, qty = parseNum($('#o-qty').value);
    const r = TA.buyOption(App.g, st, { kind: optSel.kind, strike: ks[k], expIdx: st.idx + exps[e], qty, j: readTicket().j });
    if (!r.ok) { err.textContent = r.error; return; }
    toast(r.msg, 'ok');
    resetJournal();
    afterAction();
  }
  function renderOpts() {
    const st = App.st, g = App.g, box = $('#pos-opts');
    $('#pf-optrow').hidden = !st.opts.length;
    if (!st.opts.length) { box.innerHTML = ''; return; }
    const m = TA.metrics(g, st);
    $('#pf-opt').textContent = F.money(m.optValue);
    box.innerHTML = '<p class="sub-t" style="margin-top:14px">Options détenues</p><div class="olist">' + st.opts.map((o) => {
      const q = TA.optionQuote(g, st.idx, o.kind, o.strike, o.expIdx), pnl = (q.bid - o.avg) * o.qty * CFG.OPT_MULT - o.fees, left = o.expIdx - st.idx;
      return `<div class="orow"><span><span class="tag ${o.kind === 'call' ? 'long' : 'short'}">${o.kind === 'call' ? 'Call' : 'Put'}</span> <span class="mono">${n2(o.strike)}</span> · ${F.int(o.qty)} contrat${o.qty > 1 ? 's' : ''}<br>
        <span class="dim mono">échéance ${rel(o.expIdx)} (dans ${left} barre${left > 1 ? 's' : ''}) · valeur ${F.money(o.qty * CFG.OPT_MULT * q.bid)} · <span class="${cls(pnl)}">${F.smoney(pnl)}</span></span></span>
        <button class="btn sm sell" type="button" data-optsell="${o.id}">Vendre</button></div>`;
    }).join('') + '</div>';
  }

  /* ---------- coach : règles (toujours) et IA (sur demande) ---------- */
  const AI_HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  App.coachAI = {}; App.coachVer = 0; App.aiOK = false; App.sample = null;
  async function detectAI() {
    try {
      const s = window.claude && window.claude.use ? await window.claude.use('sample') : null;
      App.sample = s && typeof s.json === 'function' ? s : null;
    } catch (e) { App.sample = null; }
    App.aiOK = !!App.sample;
    if (App.g && App.st) { App.coachKey = ''; renderCoach(); if (App.screen === 'end') showEnd(App.sum); }
  }
  const aiErr = (e) => {
    const c = e && e.code;
    if (c === 'rate_limited') return 'Trop de demandes ou limite d’utilisation atteinte. Réessaie plus tard.';
    if (c === 'invalid_json' || c === 'empty_completion') return 'Le coach a répondu dans un format inattendu. Tu peux réessayer.';
    if (c === 'session_expired') return 'Reconnecte-toi à Claude, puis réessaie.';
    if (c === 'refused') return 'Le coach n’a pas pu analyser cette demande.';
    return 'Connexion interrompue. Tu peux réessayer.';
  };
  const str = (x, n) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
  function aiBlock(key) {
    if (!App.aiOK) return '';
    const a = App.coachAI[key], label = key === 'game' ? 'Bilan approfondi par l’IA' : 'Analyse approfondie par l’IA';
    if (!a) return `<div class="ai-box"><button class="btn sm" type="button" data-coach-ai="${key}">${label}</button><span class="fine">Utilise ton propre compte Claude. Une confirmation te sera demandée la première fois.</span></div>`;
    if (a.state === 'loading') return `<div class="ai-box"><span class="lab2">Coach IA</span><p class="dim">Le coach réfléchit… (jusqu’à une minute)</p></div>`;
    if (a.state === 'error') return `<div class="ai-box"><span class="lab2">Coach IA</span><p class="neg">${esc(a.msg)}</p><button class="btn sm" type="button" data-coach-ai="${key}">Réessayer</button></div>`;
    const d = a.data, li = (arr) => (arr.length ? `<ul style="margin:2px 0 0;padding-left:18px">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    if (key === 'game') return `<div class="ai-box"><span class="lab2">Coach IA</span><p>${esc(d.bilan)}</p>${d.forts.length ? `<p><b>Points forts</b></p>${li(d.forts)}` : ''}${d.faibles.length ? `<p><b>À travailler</b></p>${li(d.faibles)}` : ''}${d.plan.length ? `<p><b>Plan pour la prochaine partie</b></p>${li(d.plan)}` : ''}</div>`;
    return `<div class="ai-box"><span class="lab2">Coach IA</span>${d.bien ? `<p><b>Bien :</b> ${esc(d.bien)}</p>` : ''}${d.erreur ? `<p><b>À améliorer :</b> ${esc(d.erreur)}</p>` : ''}${d.conseil ? `<p><b>Conseil :</b> ${esc(d.conseil)}</p>` : ''}</div>`;
  }
  const findingsHTML = (fs) => fs.map((f) => `<div class="fd ${f.level}"><i></i><div><b>${esc(f.title)}</b><p>${esc(f.text)}</p></div></div>`).join('');
  const tradeLabel = (t) => (t.kind === 'option' ? `${TA.optLabel(t)} · ${F.int(t.qty)} contrat${t.qty > 1 ? 's' : ''}` : `${t.dir === -1 ? 'Short · ' : ''}${F.int(t.qty)} ${unitName()}`);
  function renderCoach() {
    const st = App.st, g = App.g;
    $('#b-coach').textContent = st.trades.length;
    const key = st.trades.length + ':' + App.coachVer + ':' + App.aiOK;
    if (key === App.coachKey) return;
    App.coachKey = key;
    const note = App.aiOK ? '' : '<p class="fine" style="margin-top:10px">Le coach à règles est toujours actif. L’analyse approfondie par l’IA n’est pas disponible dans cette vue.</p>';
    if (!st.trades.length) { $('#tab-coach').innerHTML = '<p class="empty">Après chaque transaction fermée, le coach analyse ton risque, ton stop, ton journal et tes réactions. Tu y verras aussi ce que tu as bien fait.</p>' + note; return; }
    $('#tab-coach').innerHTML = '<div class="coach-list">' + st.trades.slice().reverse().map((t) => {
      const f = TA.coachTrade(g, st, t);
      return `<article class="cc"><header><span class="when">${rel(t.openIdx)} → ${rel(t.closeIdx)} · ${esc(tradeLabel(t))}</span><span class="res ${cls(t.net)}">${F.smoney(t.net)}${t.r == null ? '' : ` · ${t.r > 0 ? '+' : ''}${F.num(t.r, 2)} R`}</span></header>` +
        (f.length ? findingsHTML(f) : '<p class="dim" style="margin:0">Rien de particulier à signaler : transaction conforme à ta règle.</p>') + aiBlock('t' + t.id) + '</article>';
    }).join('') + '</div>' + note;
  }
  // Après une fermeture : un coup d'œil immédiat (toast), le détail est dans l'onglet Coach.
  function coachToast(prevLen) {
    const st = App.st;
    for (const t of st.trades.slice(prevLen)) {
      const w = TA.coachTrade(App.g, st, t).filter((f) => f.level === 'warn');
      if (w.length) toast(`Coach : ${w.length} point${w.length > 1 ? 's' : ''} à revoir sur ta dernière transaction : ${w[0].title.toLowerCase()}. Détail dans l’onglet Coach.`, 'warn', 7000);
      else toast('Coach : transaction conforme à ta règle. Détail dans l’onglet Coach.', 'ok', 4500);
    }
  }
  function coachGameHTML() {
    const cg = TA.coachGame(App.g, App.st, App.sum);
    return `<section class="card" id="coach-end"><h2>Bilan du coach</h2>${findingsHTML(cg.findings)}${aiBlock('game')}</section>`;
  }
  async function askCoach(key) {
    if (!App.sample || (App.coachAI[key] && App.coachAI[key].state === 'loading')) return;
    const g = App.g, st = App.st;
    let prompt, tier = 'quick';
    const rules = 'Règles : tutoie l’élève, appuie-toi uniquement sur les faits fournis (n’invente aucun chiffre, aucun événement de marché), ne donne aucun conseil d’investissement réel, reste concret et bienveillant mais exigeant. Réponds uniquement par un objet JSON.';
    if (key === 'game') {
      const s = App.sum, cg = TA.coachGame(g, st, s);
      const data = {
        actif: g.meta.s, nom: g.meta.n, marche: TA.MARKETS[g.market].name, periode: `${F.date(s.day0)} au ${F.date(s.day1)}`,
        rendement_pct: +(100 * s.retPct).toFixed(2), acheter_conserver_pct: +(100 * s.bh).toFixed(2), indice_pct: +(100 * (s.home === 'tsx' ? s.tsx : s.sp)).toFixed(2),
        sharpe: s.sharpe == null ? null : +s.sharpe.toFixed(2), drawdown_max_pct: +(100 * s.maxDD).toFixed(2), nb_transactions: s.trades, taux_reussite_pct: s.winRate == null ? null : +(100 * s.winRate).toFixed(0),
        gain_moyen: s.avgWin == null ? null : Math.round(s.avgWin), perte_moyenne: s.avgLoss == null ? null : Math.round(s.avgLoss), frais: Math.round(s.fees),
        regle_de_risque: st.rules.mode === 'block' ? `obligatoire ${(100 * st.rules.max).toFixed(0)} %` : 'conseillée', levier_max: st.maxLev, infractions: st.disc, constats_du_coach_a_regles: cg.findings.map((f) => f.title),
        transactions: st.trades.slice(0, 18).map((t) => ({ type: t.kind === 'option' ? 'option' : t.dir === -1 ? 'short' : 'long', barres: t.closeIdx - t.openIdx, net: Math.round(t.net), R: t.r == null ? null : +t.r.toFixed(1), sortie: t.reason,
          emotion: TA.labelOf(TA.EMOTIONS, (t.entries[0] || {}).emotion), raison: TA.labelOf(TA.REASONS, (t.entries[0] || {}).reason), note: t.note || undefined })),
      };
      tier = 'default';
      prompt = `Tu es un coach de trading dans un simulateur éducatif en français. Un élève (étudiant en gestion de commerce, il veut devenir trader) vient de terminer une partie d’entraînement. L’actif et la période viennent de lui être révélés. Voici le bilan en JSON :\n${JSON.stringify(data)}\n\n${rules} Format : {"bilan": "2 à 3 phrases de synthèse honnête", "forts": ["1 à 2 points forts"], "faibles": ["1 à 3 points à travailler, liés aux faits"], "plan": ["3 actions concrètes pour la prochaine partie"]}.`;
    } else {
      const t = st.trades.find((x) => 't' + x.id === key);
      if (!t) return;
      prompt = `Tu es un coach de trading dans un simulateur éducatif en français. Un élève (étudiant en gestion de commerce, il veut devenir trader) vient de fermer une transaction dont on ne lui a pas encore révélé l’actif. Voici les faits en JSON :\n${JSON.stringify(TA.coachPayload(g, st, t, false))}\n\n${rules} Format : {"bien": "ce qui était bien, 1 phrase (ou chaîne vide)", "erreur": "le point faible principal, 1 à 2 phrases (ou chaîne vide s’il n’y en a pas)", "conseil": "UN conseil concret pour la prochaine transaction, 1 phrase"}.`;
    }
    App.coachAI[key] = { state: 'loading' }; App.coachVer++; refreshCoachUI();
    try {
      const d = await App.sample.json(prompt, { modelTier: tier });
      const arr = (x) => (Array.isArray(x) ? x.map((y) => str(y, 300)).filter(Boolean).slice(0, 4) : []);
      const data = key === 'game'
        ? { bilan: str(d && d.bilan, 600), forts: arr(d && d.forts), faibles: arr(d && d.faibles), plan: arr(d && d.plan) }
        : { bien: str(d && d.bien, 300), erreur: str(d && d.erreur, 400), conseil: str(d && d.conseil, 300) };
      if (!Object.values(data).some((v) => (Array.isArray(v) ? v.length : v))) throw { code: 'invalid_json' };
      App.coachAI[key] = { state: 'done', data };
    } catch (e) {
      if (e && AI_HIDE.includes(e.code)) { App.aiOK = false; delete App.coachAI[key]; }
      else App.coachAI[key] = { state: 'error', msg: aiErr(e) };
    }
    App.coachVer++; refreshCoachUI();
  }
  function refreshCoachUI() {
    renderCoach();
    const end = $('#coach-end');
    if (end && App.screen === 'end') end.outerHTML = coachGameHTML();
  }

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
      <p style="margin:0">${App.db ? 'Toutes les parties publiées par les joueurs de cette page, avec tri, filtres et défis par code.' : window.claude ? 'Ton historique de parties. Le classement partagé n’est pas disponible dans cette vue.' : 'Ton historique de parties, gardé dans ce navigateur. Pour te comparer à des amis, jouez le même code de défi et échangez vos résultats.'}</p>
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
    if (!App.db) return `<section class="card" id="pub-card"><h2>Classement</h2><p class="dim" style="margin:0">${window.claude ? 'Le classement partagé n’est pas disponible dans cette vue. Ta partie est gardée dans ton historique local.' : 'Ta partie est gardée dans l’historique de ce navigateur. Pour te comparer à des amis, jouez le même code de défi et échangez vos résultats.'}</p></section>`;
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

  // Adapte l'écran de partie au compte Live : vrais prix, vraies dates, plus de bouton « jour suivant ».
  function applyLiveChrome() {
    const live = isLive(), g = App.g, st = App.st, i = st.idx;
    for (const id of ['#btn-next', '#tm-mode', '#mb-next']) $(id).hidden = live;
    if (live) $('#rt').hidden = true;
    const name = document.querySelector('.asset .name');
    name.textContent = live ? `${g.meta.s} · ${g.meta.n}` : 'Actif mystère';
    let note = document.getElementById('live-note');
    if (live) {
      $('#px').textContent = `${realPx(g.c[i])} ${g.meta.cur || ''}`.trim();
      $('#mb-px').textContent = `${realPx(g.c[i])} ${g.meta.cur || ''}`.trim();
      $('#prog-txt').textContent = `Dernière séance : ${shortDay(g.t[i])}`;
      $('#prog-bar').style.width = '100%';
      if (!note) { note = document.createElement('span'); note.id = 'live-note'; note.className = 'fine'; document.querySelector('.chart-head').appendChild(note); }
      const k = g.live.k;
      note.textContent = k === 1 ? 'Cours réels. Le compte avance quand de nouvelles cotes sont publiées.' : `Prix du graphique et du ticket = cours réel × ${String(k).replace('.', ',')}, pour garder des quantités entières. L’en-tête et la légende montrent le cours réel. Le compte avance quand de nouvelles cotes sont publiées.`;
      note.hidden = false;
    } else if (note) note.hidden = true;
    const be = $('#btn-end'); if (be && !be.dataset.armed) be.textContent = live ? 'Clôturer le compte' : 'Terminer la partie';
  }

  /* ---------- carte « Ton niveau » (accueil) ---------- */
  function renderProfile() {
    const p = App.profile, lv = TA.LEVELS[p.level - 1], next = TA.LEVELS[p.level], need = lv.need;
    const ladder = TA.LEVELS.map((l) => `<li class="${l.id < p.level ? 'done' : l.id === p.level ? 'now' : ''}"><b>${l.id < p.level ? '✓' : l.id}</b><span>${esc(l.name)}</span></li>`).join('');
    let goal = '<p class="dim" style="margin:0">Niveau maximal : tout est débloqué.</p>', reqs = '';
    if (need) {
      const pct = F.pct(need.maxDD).replace(',00', '');
      const list = [
        `Partie menée à au moins ${Math.round(CFG.MIN_PLAYED * 100)} %`, 'Stop-loss à chaque entrée, jamais éloigné ni retiré', 'Risque par transaction sous le maximum de ta règle',
        'Journal complet : raison et émotion à chaque entrée', `Drawdown maximal de ${pct} ou moins`,
        `Au moins ${need.minTrades} transactions, et pas plus d’une toutes les ${CFG.BARS_PER_TRADE} barres en moyenne`, need.rMean != null ? 'Multiple R moyen positif ou nul' : null,
      ].filter(Boolean);
      goal = `<div class="eq"><span>Pour passer <b>${esc(next.name)}</b></span><span class="mono dim">${p.progress} sur ${need.games} parties disciplinées</span></div><div class="prog"><i style="width:${(p.progress / need.games) * 100}%"></i></div>`;
      reqs = `<p class="sub">Une partie disciplinée remplit tous ces critères</p><ul class="crit">${list.map((t) => `<li class="req"><span class="icone">○</span><span>${esc(t)}</span></li>`).join('')}</ul>
        <p class="fine">Le profit n’est pas exigé : c’est la discipline qui compte. Les parties rejouées, les codes déjà joués et les parties importées ne comptent pas.</p>`;
    }
    const feat = Object.values(TA.FEATURES).map((f) => {
      const open = p.level >= f.level;
      return `<div class="frow"><span>${esc(f.name)}</span>${open ? (f.ready ? '<span class="tag ok">Disponible</span>' : '<span class="tag soon">Débloqué · bientôt</span>') : `<span class="tag">Niveau ${esc(TA.LEVELS[f.level - 1].name)}</span>`}</div>`;
    }).join('');
    const games = p.games.slice(0, 5).map((x) => `<div class="grow"><span class="mono">${esc(x.code)}</span><span class="mono ${cls(x.ret)}">${F.spct(x.ret)}</span><span class="mono dim">DD ${F.spct(x.dd)}</span><span>${x.counted ? (x.passed ? '<span class="pos">disciplinée</span>' : '<span class="neg">non qualifiante</span>') : '<span class="dim">non comptée</span>'}</span></div>`).join('');
    $('#profile').innerHTML = `<h2>Ton niveau</h2>
      <div class="lvl-head"><b>${esc(lv.name)}</b><span class="dim">${esc(lv.blurb)}</span></div>
      <ol class="ladder" style="list-style:none">${ladder}</ol>
      ${goal}${reqs}
      <p class="sub">Fonctions</p><div class="glist">${feat}</div>
      ${games ? `<p class="sub">Dernières parties</p><div class="glist">${games}</div>` : ''}
      <p class="fine">Ton niveau est gardé dans ce navigateur.</p>`;
  }

  /* =====================================================================
     Formation : leçons et quiz
     ===================================================================== */
  const lessonPassed = (id) => { const r = App.profile.lessons[id]; return !!r && r.best / r.total >= TA.PASS_RATIO; };
  function renderLearnCard() {
    const n = TA.LESSONS.filter((l) => lessonPassed(l.id)).length, tot = TA.LESSONS.length;
    $('#learn-card').innerHTML = `<h2>Formation</h2>
      <p style="margin:0">${tot} leçons courtes, chacune avec son quiz : chandeliers, supports et résistances, indicateurs, psychologie, fondamentaux, vente à découvert, levier, forex, crypto et options.</p>
      <div class="eq" style="margin-top:10px"><span class="dim mono">${n} sur ${tot} réussies</span><button class="btn sm" type="button" id="learn-open">Ouvrir la formation</button></div>
      <div class="prog"><i style="width:${(n / tot) * 100}%"></i></div>`;
  }
  function openLearn(id) { App.learn = { id: id || null }; renderLearn(); show('learn'); }
  function lessonBlock(b) {
    if (b.h) return `<h3>${esc(b.h)}</h3>`;
    if (b.p) return `<p>${esc(b.p)}</p>`;
    if (b.ul) return `<ul>${b.ul.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    if (b.tip) return `<p class="tipbox"><strong>À retenir.</strong> ${esc(b.tip)}</p>`;
    if (b.fig) return TA.FIGURES[b.fig] ? TA.FIGURES[b.fig]() : '';
    return '';
  }
  function renderLearn() {
    const box = $('#screen-learn'), id = App.learn && App.learn.id;
    if (!id) {
      const cards = TA.LESSONS.map((l) => {
        const r = App.profile.lessons[l.id];
        const st = r ? (lessonPassed(l.id) ? `<span class="tag ok">Réussi ${r.best}/${r.total}</span>` : `<span class="tag soon">À refaire ${r.best}/${r.total}</span>`) : '<span class="tag">Pas commencée</span>';
        return `<button class="lcard" type="button" data-lesson="${l.id}"><b>${esc(l.title)}</b><span class="dim">${esc(l.intro)}</span><span class="meta">${l.mins} min · ${st}</span></button>`;
      }).join('');
      box.innerHTML = `<div class="lhead"><h1>Formation</h1><button class="btn" type="button" data-act="home">Retour à l’accueil</button></div>
        <p class="dim" style="margin:0">Chaque leçon se termine par un quiz de ${TA.LESSONS[0].quiz.length} questions : ${Math.round(TA.PASS_RATIO * 100)} % de bonnes réponses pour le réussir. Tu peux le refaire autant de fois que tu veux.</p>
        <div class="lgrid">${cards}</div>`;
      return;
    }
    const l = TA.LESSONS.find((x) => x.id === id);
    const quiz = l.quiz.map((q, i) => `<div class="qq" data-q="${i}"><p class="qtext">${i + 1}. ${esc(q.q)}</p>${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"><span>${esc(o)}</span></label>`).join('')}</div>`).join('');
    box.innerHTML = `<div class="lhead"><h1>${esc(l.title)}</h1><button class="btn" type="button" data-act="list">Toutes les leçons</button></div>
      <section class="card lesson"><p class="dim">${esc(l.intro)}</p>${l.body.map(lessonBlock).join('')}</section>
      <section class="card"><h2>Quiz · ${l.quiz.length} questions</h2><div class="quiz">${quiz}</div>
        <p class="err" id="quiz-err" role="alert" style="margin-top:10px"></p><div id="quiz-end" class="acts" style="margin-top:12px"><button class="btn primary" type="button" data-act="check">Vérifier mes réponses</button></div></section>`;
  }
  function checkQuiz() {
    const l = TA.LESSONS.find((x) => x.id === App.learn.id), box = $('#screen-learn');
    const picks = l.quiz.map((q, i) => { const c = box.querySelector(`input[name="q${i}"]:checked`); return c ? +c.value : null; });
    if (picks.includes(null)) { $('#quiz-err').textContent = 'Réponds à toutes les questions avant de vérifier.'; return; }
    $('#quiz-err').textContent = '';
    let score = 0;
    l.quiz.forEach((q, i) => {
      const qb = box.querySelector(`.qq[data-q="${i}"]`), opts = [...qb.querySelectorAll('.opt')];
      opts.forEach((o, j) => { o.querySelector('input').disabled = true; if (j === q.a) o.classList.add('good'); else if (j === picks[i]) o.classList.add('bad'); });
      if (picks[i] === q.a) score++;
      qb.insertAdjacentHTML('beforeend', `<p class="expl"><strong>${picks[i] === q.a ? 'Bonne réponse.' : 'Pas tout à fait.'}</strong> ${esc(q.e)}</p>`);
    });
    TA.recordQuiz(App.profile, l.id, score, l.quiz.length); saveProfile();
    const ok = score / l.quiz.length >= TA.PASS_RATIO, nextL = TA.LESSONS[TA.LESSONS.indexOf(l) + 1];
    $('#quiz-end').innerHTML = `<p class="score" style="width:100%;margin:0 0 4px"><strong>${score} sur ${l.quiz.length}.</strong> ${ok ? 'Quiz réussi.' : 'Pas encore : relis la leçon et réessaie.'}</p>
      <button class="btn" type="button" data-act="retry">Refaire le quiz</button>${nextL ? `<button class="btn primary" type="button" data-lesson="${nextL.id}">Leçon suivante</button>` : ''}<button class="btn ghost" type="button" data-act="list">Toutes les leçons</button>`;
    $('#quiz-end').scrollIntoView({ block: 'nearest' });
  }

  /* =====================================================================
     Branchements
     ===================================================================== */
  function bind() {
    $('#go-home').onclick = goHome; $('#btn-home').onclick = goHome;
    $('#btn-export').onclick = exportSave;
    $('#file-import').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
    $('#ctx').addEventListener('click', (e) => {
      if (!e.target.closest('#copy-code')) return;
      const code = App.cfg.challenge || App.cfg.code;
      const ok = () => toast('Code copié : ' + code, 'ok');
      try { navigator.clipboard.writeText(code).then(ok, () => toast('Code de la partie : ' + code, 'info', 7000)); } catch (err) { toast('Code de la partie : ' + code, 'info', 7000); }
    });
    // graphique
    $('#inds').addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c || !App.chart) return;
      const k = c.dataset.k; App.prefs.ind[k] = !App.prefs.ind[k]; c.classList.toggle('on', App.prefs.ind[k]);
      App.chart.setFlags({ [k]: App.prefs.ind[k] }); savePrefs();
    });
    $('#z-in').onclick = () => App.chart && App.chart.zoom(0.7);
    $('#z-out').onclick = () => App.chart && App.chart.zoom(1.4);
    $('#z-reset').onclick = () => App.chart && App.chart.reset();
    // temps
    $('#btn-next').onclick = () => step(false);
    $('#mb-next').onclick = () => step(false);
    bindSeg($('#tm-mode'), (v) => setTimeMode(v));
    bindSeg($('#tm-speed'), (v) => { App.prefs.speed = +v; savePrefs(); if (App.playing) { pause(); play(); } });
    $('#btn-play').onclick = () => (App.playing ? pause() : play());
    $('#pause-fill').onchange = (e) => { App.prefs.pauseFill = e.target.checked; savePrefs(); };
    let armed = null;
    $('#btn-end').onclick = (e) => {
      const b = e.currentTarget;
      const base = isLive() ? 'Clôturer le compte' : 'Terminer la partie';
      if (!armed) { b.textContent = isLive() ? 'Confirmer la clôture' : 'Confirmer : révéler l’actif'; armed = setTimeout(() => { armed = null; b.textContent = base; }, 4000); return; }
      clearTimeout(armed); armed = null; b.textContent = base;
      endGame();
    };
    // ticket
    bindSeg($('#t-side'), setSide);
    bindSeg($('#t-type'), setType);
    for (const id of ['t-qty', 't-price', 't-sl', 't-tp', 't-risk']) $('#' + id).addEventListener('input', () => { $('#t-err').textContent = ''; updateTicket(); });
    $('#sz-use').onclick = () => { if (App.sizeQty > 0) { $('#t-qty').value = App.sizeQty; updateTicket(); } };
    // formation : ouverture depuis l'accueil, navigation entre leçons, quiz (délégation : les cartes sont redessinées)
    document.addEventListener('click', (e) => {
      if (e.target.closest('#learn-open')) { openLearn(null); return; }
      const les = e.target.closest('[data-lesson]');
      if (les) { openLearn(les.dataset.lesson); return; }
      const act = e.target.closest('#screen-learn [data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'home') goHome(); else if (a === 'list') openLearn(null); else if (a === 'check') checkQuiz(); else if (a === 'retry') openLearn(App.learn.id);
    });
    // notes personnelles du journal (onglet Journal et écran de fin)
    document.addEventListener('change', (e) => {
      const i = e.target.closest && e.target.closest('[data-note]');
      if (i && App.st && TA.setNote(App.st, +i.dataset.note, i.value)) saveSoon();
    });
    $('#t-quick').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]'); if (!b || !App.g) return;
      $('#t-qty').value = quickQty(+b.dataset.p) || ''; updateTicket();
    });
    $('#t-go').onclick = submitTicket;
    // accueil : mode, défi, classement
    bindSeg($('#s-mode'), (v) => { App.prefs.mode = v; applyMode(); savePrefs(); });
    $('#s-asset').addEventListener('change', () => { App.prefs.asset = $('#s-asset').value; savePrefs(); });
    $('#s-code').addEventListener('input', onCodeInput);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#board-open') || e.target.closest('#pub-see')) { openBoard(); return; }
      if (e.target.closest('#pub-go')) { publishScore(); return; }
      if (e.target.closest('#b-back')) { goHome(); return; }
      const so = e.target.closest('#b-table [data-sort]');
      if (so) {
        const k = so.dataset.sort, B = App.board;
        if (B.sort === k) B.dir = B.dir === 'desc' ? 'asc' : 'desc';
        else { B.sort = k; B.dir = ['pseudo', 'mode', 'market', 'scenario'].includes(k) ? 'asc' : 'desc'; }
        renderBoard(); return;
      }
      const cd = e.target.closest('#b-table [data-code]');
      if (cd) { App.board.filter.code = cd.dataset.code; $('#b-code').value = cd.dataset.code; renderBoard(); return; }
      const pl = e.target.closest('#b-table [data-play]');
      if (pl) { playChallenge(pl.dataset.play); return; }
      const dl = e.target.closest('#b-table [data-del]');
      if (dl && App.db) {
        App.db.doc('games/' + dl.dataset.del).delete().then(() => toast('Partie retirée du classement.', 'info'), () => toast('Impossible de retirer cette partie.', 'err'));
      }
    });
    $('#b-code').addEventListener('input', () => { App.board.filter.code = $('#b-code').value; renderBoard(); });
    for (const [id, key] of [['b-pseudo', 'pseudo'], ['b-mode', 'mode'], ['b-market', 'market']]) $('#' + id).addEventListener('change', () => { App.board.filter[key] = $('#' + id).value; renderBoard(); });
    // options
    bindSeg($('#t-inst'), (v) => { App.t.inst = v; refreshTicketChrome(); updateTicket(); });
    bindSeg($('#o-kind'), (v) => { optSel.kind = v; updateTicket(); });
    $('#o-exp').addEventListener('change', () => { optSel.exp = +$('#o-exp').value; updateTicket(); });
    $('#o-strike').addEventListener('change', () => { optSel.k = +$('#o-strike').value; updateTicket(); });
    $('#o-qty').addEventListener('input', () => { $('#t-err').textContent = ''; updateTicket(); });
    $('#pos-opts').addEventListener('click', (e) => {
      const b = e.target.closest('[data-optsell]'); if (!b) return;
      const r = TA.sellOption(App.g, App.st, +b.dataset.optsell);
      if (!r.ok) { toast(r.error, 'err'); return; }
      toast(r.msg, 'ok'); afterAction();
    });
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-coach-ai]'); if (b) askCoach(b.dataset.coachAi); });
    // onglets
    $('#tabs .tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-t]'); if (b) setTab(b.dataset.t); });
    $('#tab-ord').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cancel]'); if (!b) return;
      TA.cancelOrder(App.st, +b.dataset.cancel); toast('Ordre annulé.', 'info'); afterAction();
    });
    // clavier : → ou N = barre suivante, Espace = lecture/pause
    document.addEventListener('keydown', (e) => {
      if (App.screen !== 'game' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') { e.preventDefault(); step(false); }
      else if (e.key === ' ' && App.cfg.time === 'rt') { e.preventDefault(); App.playing ? pause() : play(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); saveNow(); } });
    window.addEventListener('pagehide', saveNow);
  }

  async function init() {
    bind(); buildSetup(); setTab('pos');
    renderResume(); renderLiveCard(); renderProfile(); renderLearnCard(); renderBoardCard();
    detectAI(); detectShared();   // le coach IA n'apparaît que si la page peut interroger Claude
    try {
      [App.index, App.bench] = await Promise.all([loadJSON('data/index.json'), loadJSON('data/bench.json')]);
      setReady(true); refreshSetup(); renderLiveCard();
    } catch (e) {
      $('#s-err').textContent = 'Les cotes historiques n’ont pas pu être chargées. Recharge la page.';
      setReady(false, 'Indisponible');
    }
  }
  init();
  window.TA_APP = App; // pour le débogage
})();
