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

