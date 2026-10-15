/* Trading Academy — écran « Saison des résultats » (analyse fondamentale, habillage MT5). La logique est dans fund.js. */
(function () {
  'use strict';
  const TA = window.TA, FD = TA.FUND;
  if (!FD) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf0 = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (x) => nf0.format(Math.round(x)) + ' $';
  const px = (x) => nf2.format(x);
  const p1 = (x) => (x == null ? '—' : (x * 100).toFixed(1).replace('.', ',') + ' %');
  const sp1 = (x) => (x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(1).replace('.', ',') + ' %');
  const n1 = (x) => (x == null ? '—' : x.toFixed(1).replace('.', ','));
  const cls = (x) => (x > 0.0005 ? 'pos' : x < -0.0005 ? 'neg' : '');
  const KEY = 'ta:fund', HKEY = 'ta:fundhist';
  const S = { g: null, st: null, sel: 'QTX', tab: 'fiche', code: '', Q: 8, msg: '', ev: null, armed: false, qty: '' };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
  };
  const APP = () => window.TA_APP;
  const newCode = () => 'FD-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const persist = () => store.set(KEY, { v: 1, code: S.code, Q: S.Q, st: S.st });
  const kVis = () => S.g.H + S.st.d - (S.st.phase === 'pre' ? 1 : 0);
  const cur = () => S.g.cos.find((c) => c.id === S.sel) || S.g.cos[0];
  const median = (a) => { const b = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };

  /* ---------- carte d'accueil ---------- */
  function renderCard() {
    const box = $('#fund-card');
    if (!box) return;
    const saved = store.get(KEY), hist = store.get(HKEY) || [];
    box.innerHTML = `<h2>Saison des résultats <span class="tag soon">nouveau</span></h2>
      <p class="hint">Analyse fondamentale : huit sociétés fictives, des états financiers à lire, un consensus à battre. Prédis les résultats, repère les ventes gonflées, achète ce qui est sous-évalué. Les dividendes sont versés.</p>
      ${saved ? `<div class="pm-resume"><b>Saison en cours</b> · trimestre ${saved.st.d + 1} sur ${saved.Q}<div class="acts"><button class="btn primary sm" type="button" data-fd-home="resume">Reprendre</button><button class="btn ghost sm" type="button" data-fd-home="drop">Abandonner</button></div></div>` : ''}
      <div class="two"><label class="field"><span>Durée</span><select id="fd-q"><option value="8">8 trimestres (2 ans)</option><option value="12">12 trimestres (3 ans)</option></select></label>
      <label class="field"><span>Code (facultatif)</span><input id="fd-code" maxlength="12" placeholder="FD-XXXX-XXXX" spellcheck="false" autocomplete="off"></label></div>
      <p class="err" id="fd-err" role="alert"></p>
      <button class="btn primary big" type="button" data-fd-home="start">Ouvrir la saison</button>
      ${hist.length ? `<p class="sub">Dernières saisons</p><div class="glist">${hist.slice(0, 4).map((h) => `<div class="grow"><span class="mono">${esc(h.code)}</span><span class="mono"><b>${esc(h.grade)}</b> ${h.score}</span><span class="mono ${cls(h.alpha)}">${sp1(h.alpha)} vs indice</span></div>`).join('')}</div>` : ''}`;
  }
  function start(code, Q) {
    S.code = code || newCode(); S.Q = Q;
    S.g = FD.newGame(S.code, { quarters: Q }); S.st = FD.newState(S.g, 100000);
    S.ev = null; S.msg = ''; S.armed = false; S.tab = 'fiche'; S.sel = S.g.cos[1].id; S.qty = '';
    persist(); APP().show('fund'); render();
  }
  function resume() {
    const sv = store.get(KEY);
    if (!sv) return;
    S.code = sv.code; S.Q = sv.Q; S.g = FD.newGame(S.code, { quarters: S.Q }); S.st = sv.st; S.ev = null; S.msg = ''; S.armed = false; S.tab = 'fiche'; S.sel = S.g.cos[1].id;
    APP().show('fund'); render();
  }

  /* ---------- écran ---------- */
  function spark(c) {
    const g = S.g, st = S.st, W = 640, Hh = 150, pts = [], marks = [];
    const upto = g.H + st.d;
    for (let k = 0; k <= upto; k++) {
      pts.push(c.px.m1[k], c.px.m2[k], c.px.pre[k]);
      if (k < upto || st.phase === 'post') pts.push(c.px.post[k]);
      marks.push(pts.length - 1);
    }
    const lo = Math.min(...pts) * 0.95, hi = Math.max(...pts) * 1.05;
    const X = (i) => 4 + ((W - 8) * i) / Math.max(1, pts.length - 1), Y = (v) => Hh - 6 - ((Hh - 12) * (v - lo)) / (hi - lo);
    const line = pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const v = marks.slice(0, -1).map((i) => `<line x1="${X(i)}" x2="${X(i)}" y1="0" y2="${Hh}" class="gl v"/>`).join('');
    const avg = st.cost[c.id] && (st.sh[c.id] || 0) > 0 ? `<line x1="0" x2="${W}" y1="${Y(st.cost[c.id])}" y2="${Y(st.cost[c.id])}" class="avg"/><text x="${W - 4}" y="${Y(st.cost[c.id]) - 3}" text-anchor="end">prix moyen ${px(st.cost[c.id])}</text>` : '';
    const histX = X(g.H * 4 - 1);
    return `<svg class="pm-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Prix de ${esc(c.name)}">${v}<line x1="${histX}" x2="${histX}" y1="0" y2="${Hh}" class="gl"/><text x="${histX + 4}" y="12">début de la saison</text>${avg}<polyline points="${line}" class="lp"/></svg>`;
  }

  function statement(c) {
    const k1 = kVis(), k0 = Math.max(0, k1 - 7), rows = [];
    const cols = []; for (let k = k0; k <= k1; k++) cols.push(k);
    const lab = (k) => { const r = k - (S.g.H - 1); return r <= 0 ? `T${r === 0 ? '0' : '−' + -r}` : `S${r}`; };
    const th = cols.map((k) => `<th class="r${k === k1 && S.st.phase === 'post' ? ' new' : ''}">${lab(k)}</th>`).join('');
    const row = (name, fn, f = (x) => nf0.format(Math.round(x)), warn) => `<tr><td>${name}</td>${cols.map((k) => { const q = c.q[k]; const v = fn(q, k); return `<td class="r ${warn && warn(q, k) ? 'neg' : ''}">${v == null || !Number.isFinite(v) ? '—' : f(v)}</td>`; }).join('')}</tr>`;
    rows.push(row('Revenus (M$)', (q) => q.rev));
    rows.push(row('Marge d’exploitation', (q) => q.om, p1));
    rows.push(row('Bénéfice net (M$)', (q) => q.ni));
    rows.push(row('BPA ($)', (q) => q.eps, px));
    rows.push(row('Consensus du BPA ($)', (q) => q.cons, px));
    rows.push(row('Surprise', (q) => q.surprise, sp1, (q) => q.surprise < -0.1));
    rows.push(row('Flux d’exploitation (M$)', (q) => q.cfo, undefined, (q) => q.ni > 0 && q.cfo < q.ni * 0.6));
    rows.push(row('Flux de trésorerie libre (M$)', (q) => q.fcf));
    rows.push(row('Créances (jours de ventes)', (q) => q.dso, (x) => nf0.format(Math.round(x)), (q) => q.dso > c.dso * 1.15));
    rows.push(row('Dette nette (M$)', (q) => q.nd));
    return `<div class="scroll-x"><table class="mt-tbl pm-tbl fd-st"><thead><tr><th>${esc(c.name)}</th>${th}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }

  function render() {
    const root = $('#screen-fund');
    if (!root || !S.g) return;
    if (S.ev) { renderReport(root); return; }
    const { g, st } = S, c = cur(), k1 = kVis(), prices = FD.prices(g, st), eq = FD.equity(g, st);
    const rt = g.cos.map((x) => FD.ratios(g, x, k1, prices[x.id]));
    const med = { pe: median(rt.map((r) => r.pe)), pb: median(rt.map((r) => r.pb)), divY: median(rt.map((r) => r.divY)), fcfY: median(rt.map((r) => r.fcfY)) };
    const r = rt[g.cos.indexOf(c)], mc = g.macro[Math.min(g.H + st.d - (st.phase === 'pre' ? 1 : 0), g.T - 1)];
    const pre = st.phase === 'pre';
    const list = g.cos.map((x, i) => {
      const last = st.results.length && !pre ? st.results[st.results.length - 1].res.find((y) => y.id === x.id) : null;
      const prev = pre ? x.px.post[g.H + st.d - 1] : x.px.pre[g.H + st.d];
      const ch = prices[x.id] / prev - 1, held = st.sh[x.id] || 0;
      const sel = pre ? `<select class="fd-pred" data-fd-pred="${x.id}" aria-label="Prédiction ${esc(x.name)}"><option value="">?</option><option value="beat"${st.preds[x.id] === 'beat' ? ' selected' : ''}>Bat</option><option value="inline"${st.preds[x.id] === 'inline' ? ' selected' : ''}>En ligne</option><option value="miss"${st.preds[x.id] === 'miss' ? ' selected' : ''}>Déçoit</option></select>`
        : last ? (last.pred ? (last.hit ? '<b class="pos">✓</b>' : '<b class="neg">✗</b>') : '') : '';
      return `<tr data-fd-sel="${x.id}" class="${x.id === S.sel ? 'sel' : ''}"><td><b>${x.id}</b>${held ? ` <small>×${nf0.format(held)}</small>` : ''}</td><td class="r">${px(prices[x.id])}</td><td class="r ${cls(ch)}">${sp1(ch)}</td><td class="r">${rt[i].pe == null ? '—' : n1(rt[i].pe)}</td><td>${sel}</td></tr>`;
    }).join('');
    const nextC = pre && c.q[g.H + st.d] ? c.q[g.H + st.d].cons : null;
    const cards = [
      ['P/E', r.pe == null ? '—' : n1(r.pe), med.pe != null ? `médiane ${n1(med.pe)}` : '', r.pe != null && med.pe != null && r.pe < med.pe * 0.8 ? 'pos' : r.pe > med.pe * 1.3 ? 'neg' : ''],
      ['P/B', n1(r.pb), `médiane ${n1(med.pb)}`, ''],
      ['Rendement du dividende', p1(r.divY), `médiane ${p1(med.divY)}`, ''],
      ['Rendement du flux libre', p1(r.fcfY), `médiane ${p1(med.fcfY)}`, r.fcfY < 0 ? 'neg' : ''],
      ['ROE', p1(r.roe), '', ''],
      ['Croissance des revenus (12 m)', sp1(r.growth), '', ''],
      ['Dette nette / BAIIA', r.ndEbitda == null ? '—' : n1(r.ndEbitda) + ' ×', '', r.ndEbitda > 3.5 ? 'neg' : ''],
      ['Flux d’exploitation / bénéfice', r.cfoNi == null ? '—' : p1(r.cfoNi), 'sain : près de 100 %', r.cfoNi != null && r.cfoNi < 0.7 ? 'neg' : ''],
    ].map(([a, b, d, k]) => `<div class="fd-card"><span>${a}</span><b class="${k}">${b}</b><small>${d}</small></div>`).join('');
    const res = !pre && st.results.length ? st.results[st.results.length - 1].res : null;
    const resRows = res ? res.map((x) => `<tr data-fd-sel="${x.id}" class="${x.id === S.sel ? 'sel' : ''}"><td><b>${x.id}</b></td><td class="r">${px(x.eps)}</td><td class="r">${px(x.cons)}</td><td class="r ${cls(x.surprise)}">${sp1(x.surprise)}</td><td class="r ${cls(x.guide)}">${x.guide > 0.01 ? '▲' : x.guide < -0.01 ? '▼' : '►'}</td><td class="r ${cls(x.react)}">${sp1(x.react)}</td><td class="r">${x.held ? nf0.format(x.held) : '—'}</td><td class="r ${cls(x.held * (x.post - x.pre))}">${x.held ? (x.held * (x.post - x.pre) >= 0 ? '+' : '−') + money(Math.abs(x.held * (x.post - x.pre))) : '—'}</td><td>${x.pred ? (x.hit ? '<b class="pos">✓</b>' : '<b class="neg">✗</b>') + ' <small>' + ({ beat: 'bat', inline: 'en ligne', miss: 'déçoit' }[x.pred]) + '</small>' : '—'}</td></tr>`).join('') : '';
    const expl = res ? (res.find((x) => x.id === S.sel) || res[0]).explain.map((e) => `<div class="fd ${e.t === 'good' ? 'good' : e.t === 'bad' || e.t === 'warn' ? 'warn' : ''}"><i></i><p>${esc(e.x)}</p></div>`).join('') : '';
    const news = (g.news[Math.min(g.H + st.d - (pre ? 1 : 0), g.T - 1)] || []).map((n) => `<li>${esc(n)}</li>`).join('');
    const pos = g.cos.filter((x) => (st.sh[x.id] || 0) > 0).map((x) => { const v = st.sh[x.id] * prices[x.id]; return `<tr data-fd-sel="${x.id}"><td>${x.id}</td><td class="r">${nf0.format(st.sh[x.id])}</td><td class="r">${money(v)}</td><td class="r">${p1(v / eq)}</td><td class="r ${cls(prices[x.id] / st.cost[x.id] - 1)}">${sp1(prices[x.id] / st.cost[x.id] - 1)}</td></tr>`; }).join('');
    const held = st.sh[c.id] || 0, maxBuy = Math.floor(st.cash / (prices[c.id] * (1 + FD.FEE)));
    root.innerHTML = `
      <div class="mt-bar pm-bar" role="toolbar">
        ${pre ? '<button class="btn primary" type="button" data-fd="reveal">Publier les résultats ▶</button>' : '<button class="btn primary" type="button" data-fd="next">' + (st.d + 1 >= g.Q ? 'Voir le bilan ▶' : 'Trimestre suivant ▶') + '</button>'}
        <span class="mt-sep"></span>
        <span class="fd-top">Taux directeur <b>${(mc.rate * 100).toFixed(2).replace('.', ',')} %</b> · croissance <b>${sp1(mc.growth)}</b></span>
        <span class="sp"></span>
        <div class="mt-prog"><div class="ptxt">Trimestre ${st.d + 1} sur ${g.Q} · ${pre ? 'avant la publication' : 'après la publication'}</div><div class="prog"><i style="width:${((st.d + (pre ? 0 : 0.5)) / g.Q) * 100}%"></i></div></div>
        <button class="btn ghost" type="button" data-fd="end">${S.armed ? 'Confirmer : évaluer maintenant' : 'Terminer la saison'}</button>
      </div>
      <div class="pm-grid fd-grid">
        <aside class="mt-win pm-left"><header class="mt-wh"><b>Sociétés</b></header><div class="mt-wb">
          <table class="mt-tbl"><thead><tr><th>Symbole</th><th class="r">Prix</th><th class="r">Var.</th><th class="r">P/E</th><th>${pre ? 'Résultats' : ''}</th></tr></thead><tbody>${list}</tbody></table>
          <p class="mt-note">${pre ? 'Prédis chaque publication : bat, en ligne (±3 %) ou déçoit le consensus.' : 'Var. = depuis la dernière publication.'}</p></div></aside>
        <section class="pm-center">
          <div class="mt-win"><header class="mt-wh"><b>${esc(c.name)}</b><span class="mt-wsub">${esc(FD.SECTORS[c.sec].name)} · ${esc(c.blurb)}</span></header>
            <div class="fd-tabs"><button type="button" data-fd-tab="fiche" class="${S.tab === 'fiche' ? 'on' : ''}">Fiche financière</button><button type="button" data-fd-tab="prix" class="${S.tab === 'prix' ? 'on' : ''}">Prix</button><button type="button" data-fd-tab="nouv" class="${S.tab === 'nouv' ? 'on' : ''}">Nouvelles</button></div>
            <div class="mt-wb fd-body">
              ${S.tab === 'fiche' ? `<div class="fd-cards">${cards}</div>${nextC != null ? `<p class="mt-note">Consensus du prochain BPA : <b>${px(nextC)} $</b> (dernier : ${px(c.q[k1].eps)} $). Les analystes prolongent la tendance : à toi de juger si elle tiendra.</p>` : ''}${statement(c)}`
                : S.tab === 'prix' ? `<div class="pm-chart">${spark(c)}</div>`
                : `<ul class="pm-log fd-news">${news}</ul>`}
            </div></div>
          ${res ? `<div class="mt-win"><header class="mt-wh"><b>Résultats du trimestre</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th>Société</th><th class="r">BPA</th><th class="r">Consensus</th><th class="r">Surprise</th><th class="r">Perspectives</th><th class="r">Prix</th><th class="r">Actions</th><th class="r">Effet</th><th>Prédiction</th></tr></thead><tbody>${resRows}</tbody></table><div class="pm-pad">${expl}</div></div></div>` : ''}
        </section>
        <aside class="mt-win pm-right"><header class="mt-wh"><b>Ordre · ${esc(c.id)}</b></header><div class="mt-wb pm-pad">
          <dl class="kv pm-kv"><div><dt>Prix</dt><dd>${px(prices[c.id])} $</dd></div><div><dt>Détenues</dt><dd>${nf0.format(held)}</dd></div><div><dt>Liquidités</dt><dd>${money(st.cash)}</dd></div><div><dt>Valeur du compte</dt><dd>${money(eq)}</dd></div></dl>
          <label class="field"><span>Nombre d’actions</span><input id="fd-qty" inputmode="numeric" value="${esc(S.qty)}" placeholder="Ex. 100" autocomplete="off"></label>
          <div class="quick"><button type="button" data-fd-q="0.1">10 % du compte</button><button type="button" data-fd-q="0.25">25 %</button><button type="button" data-fd-q="max">Max (${nf0.format(maxBuy)})</button></div>
          <div class="acts" style="margin-top:8px"><button class="btn buy" type="button" data-fd="buy">Acheter</button><button class="btn sell" type="button" data-fd="sell">Vendre</button><button class="btn ghost" type="button" data-fd="sellall">Tout vendre</button></div>
          <p class="err" id="fd-msg" role="alert">${esc(S.msg)}</p>
          <p class="fine">Frais de 0,1 %. Pas de vente à découvert dans ce mode. Les dividendes sont versés à chaque publication.</p>
          ${pos ? `<p class="sub-t">Positions</p><table class="mt-tbl"><thead><tr><th>Titre</th><th class="r">Qté</th><th class="r">Valeur</th><th class="r">Poids</th><th class="r">P&amp;L</th></tr></thead><tbody>${pos}</tbody></table>` : ''}
        </div></aside>
      </div>
      <footer class="mt-status"><span>Saison des résultats · code ${esc(S.code)}</span><span class="mt-st-m">Prédictions : ${st.score.right} sur ${st.score.total}</span><span class="mt-st-r"><span class="mt-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>Sociétés fictives</span></footer>`;
  }

  function finish() {
    if (S.st.d < 1 && S.st.phase === 'pre' && !S.st.results.length) { S.msg = 'Joue au moins un trimestre avant le bilan.'; S.armed = false; render(); return; }
    S.st.ended = true;
    S.ev = FD.evaluate(S.g, S.st);
    const h = store.get(HKEY) || [];
    h.unshift({ code: S.code, grade: S.ev.score.grade, score: Math.round(S.ev.score.total), alpha: S.ev.alpha });
    store.set(HKEY, h.slice(0, 8)); store.del(KEY);
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'fund', grade: S.ev.score.grade, score: S.ev.score.total, alpha: S.ev.alpha, accuracy: S.ev.accuracy, avoided: S.g.agg.length - S.ev.heldThroughBlow.length, code: S.code } })); } catch (e) { /* rien */ }
    render();
  }

  function renderReport(root) {
    const { g, st, ev } = S, sc = ev.score;
    const bar = (v) => `<div class="pm-sbar"><i style="width:${Math.round(v)}%"></i></div>`;
    const picks = ev.picks.map((p) => `<tr><td><b>${p.id}</b> ${esc(p.name)}</td><td class="r">${p.held ? nf0.format(p.held) : '—'}</td><td class="r ${cls(p.retPeriod)}">${sp1(p.retPeriod)}</td><td class="r ${cls(p.ret)}">${p.ret == null ? '—' : sp1(p.ret)}</td><td>${p.isAgg ? '<b class="neg">comptabilité agressive</b>' : 'saine'}</td></tr>`).join('');
    const notes = [];
    if (g.agg.length) {
      const names = g.agg.map((id) => FD.byId(id).name).join(' et ');
      if (ev.heldThroughBlow.length) notes.push(['warn', 'Piège comptable', `Tu détenais ${ev.heldThroughBlow.map((id) => FD.byId(id).name).join(' et ')} lors de la radiation comptable. Les signaux étaient publics : créances en hausse (jours de ventes), flux d’exploitation bien sous le bénéfice net, croissance supérieure à celle des pairs. Compare toujours bénéfice et flux de trésorerie.`]);
      else notes.push(['good', 'Piège évité', `Les sociétés à comptabilité agressive étaient ${names}. Tu n’étais pas exposé au moment de la chute : c’est exactement l’utilité de l’analyse des états financiers.`]);
    }
    if (ev.maxW > 0.35) notes.push(['warn', 'Concentration', `Ta plus grosse position pèse ${p1(ev.maxW)} du compte. Au-delà d’environ 35 %, une seule surprise peut défaire la saison.`]);
    if (ev.accuracy != null) notes.push([ev.accuracy >= 0.5 ? 'good' : 'info', 'Prédictions', `${Math.round(ev.accuracy * 100)} % de bonnes prédictions (le hasard donne environ un tiers). Les analystes prolongent la tendance : les surprises viennent des marges, des créances et des perspectives.`]);
    else notes.push(['info', 'Aucune prédiction', 'Prédire chaque publication t’oblige à estimer ce que le consensus ignore : c’est l’exercice central de l’analyse fondamentale.']);
    notes.push([ev.alpha > 0.01 ? 'good' : ev.alpha < -0.01 ? 'warn' : 'info', 'Contre l’indice', `Rendement ${sp1(ev.tot)} contre ${sp1(ev.idxRet)} pour les huit sociétés à poids égaux (écart ${sp1(ev.alpha)}). Frais payés : ${money(ev.fees)}.`]);
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Bilan de la saison · code ${esc(S.code)}</b><span class="sp"></span><button class="btn" type="button" data-fd="replay">Rejouer ces sociétés</button><button class="btn primary" type="button" data-fd="home">Nouvelle saison</button></div>
      <div class="pm-report">
        <section class="mt-win pm-grade"><header class="mt-wh"><b>Évaluation</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${sc.grade <= 'B' ? 'pos' : sc.grade >= 'D' ? 'neg' : ''}">${sc.grade}</div><p class="pm-score">${Math.round(sc.total)} sur 100</p>
          <p class="hint">Valeur finale : <b>${money(ev.eq)}</b> (${sp1(ev.tot)})</p>
          <dl class="pm-parts"><dt>Performance contre l’indice (50 %)</dt><dd>${Math.round(sc.perf)}${bar(sc.perf)}</dd><dt>Justesse des prédictions (25 %)</dt><dd>${Math.round(sc.acc)}${bar(sc.acc)}</dd><dt>Gestion du risque (25 %)</dt><dd>${Math.round(sc.risk)}${bar(sc.risk)}</dd></dl>
        </div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Sociétés : la vérité</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th>Société</th><th class="r">Actions</th><th class="r">Saison</th><th class="r">Ton rendement</th><th>Comptabilité</th></tr></thead><tbody>${picks}</tbody></table></div></section>
        <section class="mt-win pm-notes"><header class="mt-wh"><b>Commentaires du coach</b></header><div class="mt-wb pm-pad">${notes.map(([k, t, x]) => `<div class="fd ${k === 'good' ? 'good' : k === 'warn' ? 'warn' : ''}"><i></i><div><b>${esc(t)}</b><p>${esc(x)}</p></div></div>`).join('')}</div></section>
      </div>`;
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const h = e.target.closest('[data-fd-home]');
      if (h) {
        const a = h.dataset.fdHome;
        if (a === 'start') start(($('#fd-code').value || '').trim().toUpperCase(), +$('#fd-q').value);
        else if (a === 'resume') resume();
        else if (a === 'drop') { store.del(KEY); renderCard(); }
        return;
      }
      if (!S.g) return;
      const row = e.target.closest('[data-fd-sel]');
      if (row && !e.target.closest('select')) { S.sel = row.dataset.fdSel; render(); return; }
      const tab = e.target.closest('[data-fd-tab]');
      if (tab) { S.tab = tab.dataset.fdTab; render(); return; }
      const q = e.target.closest('[data-fd-q]');
      if (q) {
        const c = cur(), p = FD.price(S.g, S.st, c), eq = FD.equity(S.g, S.st);
        const max = Math.floor(S.st.cash / (p * (1 + FD.FEE)));
        S.qty = String(q.dataset.fdQ === 'max' ? max : Math.min(max, Math.floor((eq * +q.dataset.fdQ) / p)));
        const inp = $('#fd-qty'); if (inp) inp.value = S.qty;
        return;
      }
      const b = e.target.closest('[data-fd]');
      if (!b) return;
      const a = b.dataset.fd, c = cur();
      if (a === 'buy' || a === 'sell') {
        const n = parseInt(String(($('#fd-qty') || {}).value || '').replace(/\s/g, ''), 10);
        if (!(n > 0)) { S.msg = 'Entre un nombre d’actions.'; render(); return; }
        const r = FD.trade(S.g, S.st, c.id, a === 'buy' ? n : -n);
        S.msg = r.ok ? `${a === 'buy' ? 'Achat' : 'Vente'} de ${nf0.format(n)} ${c.id} à ${px(r.price)} $.` : r.error;
        if (r.ok) persist(); render();
      } else if (a === 'sellall') {
        const n = S.st.sh[c.id] || 0;
        if (!n) { S.msg = 'Tu ne détiens pas ce titre.'; render(); return; }
        const r = FD.trade(S.g, S.st, c.id, -n); S.msg = r.ok ? `Vente de ${nf0.format(n)} ${c.id}.` : r.error; persist(); render();
      } else if (a === 'reveal') { FD.reveal(S.g, S.st); S.msg = ''; S.tab = 'fiche'; persist(); render(); }
      else if (a === 'next') { const r = FD.next(S.g, S.st); S.msg = ''; if (r.done) finish(); else { persist(); render(); } }
      else if (a === 'end') { if (!S.armed) { S.armed = true; render(); setTimeout(() => { if (S.armed && !S.ev) { S.armed = false; if (APP().screen === 'fund') render(); } }, 4000); } else { S.armed = false; finish(); } }
      else if (a === 'home') { S.g = null; S.ev = null; renderCard(); APP().show('home'); }
      else if (a === 'replay') start(S.code, S.Q);
    });
    document.addEventListener('change', (e) => {
      const p = e.target.dataset && e.target.dataset.fdPred;
      if (p && S.st) { FD.predict(S.st, p, e.target.value); persist(); }
    });
    document.addEventListener('input', (e) => { if (e.target.id === 'fd-qty') S.qty = e.target.value; });
  }
  bind(); renderCard();
  FD.ui = { render, renderCard };
})();
