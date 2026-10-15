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
  const S = { g: null, st: null, sel: 'QTX', tab: 'fiche', code: '', Q: 8, msg: '', ev: null, armed: false, qty: '', diff: 'normal' };
  const gameOpts = () => ({ quarters: S.Q, agg: S.diff === 'expert' ? 2 : undefined, noise: S.diff === 'expert' ? 1.35 : 1 });
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
  };
  const APP = () => window.TA_APP;
  const newCode = () => 'FD-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const persist = () => store.set(KEY, { v: 1, code: S.code, Q: S.Q, diff: S.diff, st: S.st });
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
      <label class="field"><span>Difficulté</span><select id="fd-diff"><option value="normal">Normal : un ou deux pièges comptables</option><option value="expert">Expert : deux pièges, prix plus bruités</option></select></label>
      <p class="err" id="fd-err" role="alert"></p>
      <button class="btn primary big" type="button" data-fd-home="start">Ouvrir la saison</button>
      ${hist.length ? `<p class="sub">Dernières saisons</p><div class="glist">${hist.slice(0, 4).map((h) => `<div class="grow"><span class="mono">${esc(h.code)}</span><span class="mono"><b>${esc(h.grade)}</b> ${h.score}</span><span class="mono ${cls(h.alpha)}">${sp1(h.alpha)} vs indice</span></div>`).join('')}</div>` : ''}`;
  }
  function start(code, Q, diff) {
    S.code = code || newCode(); S.Q = Q; S.diff = diff || 'normal';
    S.g = FD.newGame(S.code, gameOpts()); S.st = FD.newState(S.g, 100000);
    S.ev = null; S.ai = null; S.msg = ''; S.armed = false; S.tab = 'fiche'; S.sel = S.g.cos[1].id; S.qty = '';
    persist(); APP().show('fund'); render();
  }
  function resume() {
    const sv = store.get(KEY);
    if (!sv) return;
    S.code = sv.code; S.Q = sv.Q; S.diff = sv.diff || 'normal'; S.g = FD.newGame(S.code, gameOpts()); S.st = sv.st; S.ev = null; S.ai = null; S.msg = ''; S.armed = false; S.tab = 'fiche'; S.sel = S.g.cos[1].id;
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

  // comparaison des huit sociétés sur les mêmes indicateurs : le point de départ d'un tri de titres
  function compareHTML(rt, prices) {
    const g = S.g, k1 = kVis();
    const rows = g.cos.map((x, i) => {
      const r = rt[i], q = x.q[k1], q0 = x.q[Math.max(0, k1 - 4)];
      return `<tr data-fd-sel="${x.id}" class="${x.id === S.sel ? 'sel' : ''}"><td><b>${x.id}</b> <small>${esc(FD.SECTORS[x.sec].name)}</small></td><td class="r">${px(prices[x.id])}</td><td class="r">${r.pe == null ? '—' : n1(r.pe)}</td><td class="r">${n1(r.pb)}</td><td class="r">${p1(r.divY)}</td><td class="r ${r.fcfY < 0 ? 'neg' : ''}">${p1(r.fcfY)}</td><td class="r">${p1(r.roe)}</td><td class="r">${p1(r.margin)}</td><td class="r">${sp1(r.growth)}</td><td class="r ${r.ndEbitda > 3.5 ? 'neg' : ''}">${r.ndEbitda == null ? '—' : n1(r.ndEbitda)}</td><td class="r ${r.cfoNi != null && r.cfoNi < 0.7 ? 'neg' : ''}">${r.cfoNi == null ? '—' : p1(r.cfoNi)}</td><td class="r ${q.dso > q0.dso * 1.12 ? 'neg' : ''}">${Math.round(q.dso)} j</td></tr>`;
    }).join('');
    return `<div class="scroll-x"><table class="mt-tbl pm-tbl"><thead><tr><th>Société</th><th class="r">Prix</th><th class="r">P/E</th><th class="r">P/B</th><th class="r">Dividende</th><th class="r">Flux libre</th><th class="r">ROE</th><th class="r">Marge</th><th class="r">Croissance</th><th class="r">Dette/BAIIA</th><th class="r">Flux/Bénéfice</th><th class="r">Créances</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="mt-note">Cherche les écarts : un P/E bas avec un flux libre négatif, des créances qui montent ou un ratio flux/bénéfice faible sont des signaux d’alerte, pas des aubaines. Clique une ligne pour ouvrir la fiche.</p>`;
  }
  // valeur intrinsèque par flux de trésorerie actualisés : l'outil central de l'analyste
  function dcfCalc(f0, g, r, tg) {
    if (!(r > tg)) return null;
    let v = 0, f = f0;
    for (let t = 1; t <= 5; t++) { f *= 1 + g; v += f / Math.pow(1 + r, t); }
    return v + (f * (1 + tg)) / (r - tg) / Math.pow(1 + r, 5);
  }
  function dcfHTML(c, r, mc, price) {
    const t = FD.ttm(c, kVis()), f0 = t.fcf / c.sh, gDef = Math.max(0, Math.min(0.25, Math.round((c.q[kVis()].gRep) * 100) / 100)), rDef = Math.round((0.07 + (mc.rate - 0.03)) * 1000) / 1000;
    S.dcf = S.dcf && S.dcf.id === c.id && S.dcf.k === kVis() ? S.dcf : { id: c.id, k: kVis(), g: gDef, r: rDef, tg: 0.025 };
    const d = S.dcf, v = dcfCalc(f0, d.g, d.r, d.tg), mos = v != null ? v / price - 1 : null;
    return `<div class="fd-dcf">
      <p class="hint">Valeur d’une action = somme des flux libres des 5 prochaines années, plus une valeur terminale, actualisés au taux d’exigence. Les trois hypothèses ci-dessous font toute la différence : change-les et regarde.</p>
      <div class="two">
        <label class="field"><span>Flux libre par action (12 derniers mois)</span><input value="${px(f0)} $" disabled></label>
        <label class="field"><span>Prix actuel</span><input value="${px(price)} $" disabled></label>
        <label class="field"><span>Croissance annuelle sur 5 ans (%)</span><input data-dcf="g" inputmode="decimal" value="${(d.g * 100).toFixed(1).replace('.', ',')}"></label>
        <label class="field"><span>Taux d’actualisation (%)</span><input data-dcf="r" inputmode="decimal" value="${(d.r * 100).toFixed(1).replace('.', ',')}"></label>
        <label class="field"><span>Croissance à perpétuité (%)</span><input data-dcf="tg" inputmode="decimal" value="${(d.tg * 100).toFixed(1).replace('.', ',')}"></label>
      </div>
      <div class="fd-dcf-out" id="fd-dcf-out">${dcfOut(f0, d, price)}</div>
      <p class="mt-note">Le taux d’actualisation monte avec les taux directeurs et le risque de l’entreprise. Un petit changement de taux modifie beaucoup la valeur : exige une marge de sécurité.</p>
    </div>`;
  }
  function dcfOut(f0, d, price) {
    if (!(f0 > 0)) return '<p class="neg">Flux libre négatif : la méthode ne s’applique pas telle quelle. Utilise les revenus et la trajectoire de marge.</p>';
    const v = dcfCalc(f0, d.g, d.r, d.tg);
    if (v == null) return '<p class="neg">Le taux d’actualisation doit dépasser la croissance à perpétuité.</p>';
    const mos = v / price - 1;
    return `<div class="fd-card"><span>Valeur estimée</span><b>${px(v)} $</b><small>par action</small></div><div class="fd-card"><span>Écart avec le prix</span><b class="${mos > 0.15 ? 'pos' : mos < -0.15 ? 'neg' : ''}">${sp1(mos)}</b><small>${mos > 0.15 ? 'marge de sécurité' : mos < -0.15 ? 'cher selon ces hypothèses' : 'proche du prix'}</small></div>`;
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
          <p class="mt-note">${pre ? 'Prédis chaque publication : bat, en ligne (±3 %) ou déçoit le consensus.' : 'Var. = depuis la dernière publication.'}</p>
          <p class="sub-t" style="padding:0 10px">Banque centrale ce trimestre</p><div style="padding:0 10px 6px">${pre ? `<select class="fd-pred" data-fd-mpred aria-label="Prédiction du taux directeur"><option value="">? (facultatif)</option><option value="up"${st.mpred === 'up' ? ' selected' : ''}>Hausse des taux</option><option value="flat"${st.mpred === 'flat' ? ' selected' : ''}>Taux stables</option><option value="down"${st.mpred === 'down' ? ' selected' : ''}>Baisse des taux</option></select>` : (() => { const m = st.results[st.results.length - 1].macro; const w = { up: 'hausse', flat: 'stables', down: 'baisse' }; return `Résultat : <b>${w[m.kind]}</b>${m.pred ? (m.hit ? ' <b class="pos">✓</b>' : ' <b class="neg">✗</b>') : ''}`; })()}</div>
          <p class="sub-t" style="padding:0 10px">Conseil du mentor</p><p class="hint" style="padding:0 10px 8px">${esc(mentor())}</p></div></aside>
        <section class="pm-center">
          <div class="mt-win"><header class="mt-wh"><b>${esc(c.name)}</b><span class="mt-wsub">${esc(FD.SECTORS[c.sec].name)} · ${esc(c.blurb)}</span></header>
            <div class="fd-tabs"><button type="button" data-fd-tab="fiche" class="${S.tab === 'fiche' ? 'on' : ''}">Fiche financière</button><button type="button" data-fd-tab="comp" class="${S.tab === 'comp' ? 'on' : ''}">Comparer</button><button type="button" data-fd-tab="val" class="${S.tab === 'val' ? 'on' : ''}">Valeur (DCF)</button><button type="button" data-fd-tab="prix" class="${S.tab === 'prix' ? 'on' : ''}">Prix</button><button type="button" data-fd-tab="nouv" class="${S.tab === 'nouv' ? 'on' : ''}">Nouvelles</button></div>
            <div class="mt-wb fd-body">
              ${S.tab === 'fiche' ? `<div class="fd-cards">${cards}</div>${nextC != null ? `<p class="mt-note">Consensus du prochain BPA : <b>${px(nextC)} $</b> (dernier : ${px(c.q[k1].eps)} $). Les analystes prolongent la tendance : à toi de juger si elle tiendra.</p>` : ''}${statement(c)}<p class="sub-t" style="margin-top:10px">Commentaire de la direction</p><blockquote class="fd-quote">${FD.commentary(c, k1).map((t) => esc(t)).join(' ')}</blockquote><p class="fine">Le ton se lit, il ne prouve rien : vérifie-le contre les flux de trésorerie.</p>`
                : S.tab === 'comp' ? compareHTML(rt, prices) : S.tab === 'val' ? dcfHTML(c, r, mc, prices[c.id]) : S.tab === 'prix' ? `<div class="pm-chart">${spark(c)}</div>`
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
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'fund', grade: S.ev.score.grade, score: S.ev.score.total, alpha: S.ev.alpha, accuracy: S.ev.accuracy, predictions: S.st.score.total, avoided: S.ev.blown.length - S.ev.heldThroughBlow.length, code: S.code } })); } catch (e) { /* rien */ }
    render();
  }

  function curveSVG() {
    const { g, st } = S, n = st.eq.length;
    if (n < 1) return '<p class="mt-note">Aucun trimestre joué.</p>';
    const you = [1, ...st.eq.map((v) => v / st.start)];
    const idx = [1, ...st.eq.map((_, j) => g.cos.reduce((s, c) => s + c.px.post[g.H + j] / c.px.pre[g.H], 0) / g.cos.length)];
    const W = 640, H = 170, lo = Math.min(...you, ...idx) * 0.97, hi = Math.max(...you, ...idx) * 1.03;
    const X = (i) => 6 + ((W - 12) * i) / Math.max(1, you.length - 1), Y = (v) => H - 8 - ((H - 16) * (v - lo)) / (hi - lo);
    const line = (a) => a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
    return `<div class="pm-chart"><svg class="pm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valeur du compte et indice, base 1"><line x1="0" x2="${W}" y1="${Y(1)}" y2="${Y(1)}" class="gl"/><polyline points="${line(idx)}" class="lb"/><polyline points="${line(you)}" class="lp"/></svg></div>`;
  }
  function mentor() {
    const { st } = S, pre = st.phase === 'pre';
    const tips = [
      'Commence par l’onglet Comparer : repère les P/E, les flux libres et les créances qui détonnent avant de lire une seule fiche.',
      'Compare le flux d’exploitation au bénéfice net : un écart qui grandit annonce souvent une déception.',
      'Les analystes prolongent la tendance : demande-toi ce que la direction dit des marges et des perspectives, pas seulement du trimestre.',
      'Un P/E bas n’est pas une aubaine si les bénéfices reculent. Vérifie la croissance et la dette avant d’acheter.',
      'Ne mets pas plus d’environ 35 % du compte sur un seul titre : une surprise négative peut défaire toute la saison.',
    ];
    if (!pre) return 'Relis l’explication de chaque publication : la surprise vient-elle des revenus, des marges ou des perspectives ? Le prix a-t-il réagi au chiffre ou à l’avenir ?';
    if (st.d === 0 && !Object.keys(st.preds).length) return tips[0];
    return tips[(st.d + 1) % tips.length];
  }
  function aiFacts() {
    const { g, st, ev } = S;
    return {
      trimestres: st.results.length, rendement_pct: +(100 * ev.tot).toFixed(1), indice_pct: +(100 * ev.idxRet).toFixed(1), ecart_pct: +(100 * ev.alpha).toFixed(1),
      predictions_justes_pct: ev.accuracy == null ? null : Math.round(100 * ev.accuracy), predictions: st.score.total, position_max_pct: Math.round(100 * ev.maxW), frais: Math.round(ev.fees),
      societes_a_comptabilite_agressive: g.agg, detenues_lors_de_la_chute: ev.heldThroughBlow, note: Math.round(ev.score.total),
      titres: ev.picks.map((p) => ({ id: p.id, agressive: p.isAgg, rendement_saison_pct: Math.round(100 * p.retPeriod), detenu: p.held > 0 })),
    };
  }
  async function askAI() {
    S.ai = { state: 'loading' }; paintAI();
    try { S.ai = { state: 'done', data: await TA.AI.ask('fund', aiFacts()) }; } catch (e) { S.ai = { state: 'error', msg: TA.AI.errMsg(e) }; }
    paintAI();
  }
  function paintAI() { const el = $('#fd-ai-body'); if (el) el.innerHTML = TA.AI.html(S.ai); }
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
      <div class="mt-bar pm-bar"><b class="pm-title">Bilan de la saison · code ${esc(S.code)}</b><span class="sp"></span><button class="btn" type="button" data-fd="share">Copier mon résultat</button><button class="btn" type="button" data-fd="replay">Rejouer ces sociétés</button><button class="btn primary" type="button" data-fd="home">Nouvelle saison</button></div>
      <div class="pm-report">
        <section class="mt-win pm-grade"><header class="mt-wh"><b>Évaluation</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${sc.grade <= 'B' ? 'pos' : sc.grade >= 'D' ? 'neg' : ''}">${sc.grade}</div><p class="pm-score">${Math.round(sc.total)} sur 100</p>
          <p class="hint">Valeur finale : <b>${money(ev.eq)}</b> (${sp1(ev.tot)})</p>
          <dl class="pm-parts"><dt>Performance contre l’indice (50 %)</dt><dd>${Math.round(sc.perf)}${bar(sc.perf)}</dd><dt>Justesse des prédictions (25 %)</dt><dd>${Math.round(sc.acc)}${bar(sc.acc)}</dd><dt>Gestion du risque (25 %)</dt><dd>${Math.round(sc.risk)}${bar(sc.risk)}</dd></dl>
        </div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Sociétés : la vérité</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th>Société</th><th class="r">Actions</th><th class="r">Saison</th><th class="r">Ton rendement</th><th>Comptabilité</th></tr></thead><tbody>${picks}</tbody></table></div></section>
        ${TA.AI && TA.AI.ok() ? `<section class="mt-win pm-notes"><header class="mt-wh"><b>Coach IA</b></header><div class="mt-wb pm-pad ai-box" id="fd-ai-body">${TA.AI.html(S.ai)}</div></section>` : ''}
        <section class="mt-win pm-att"><header class="mt-wh"><b>Compte et indice des huit sociétés</b><span class="mt-wsub"><i class="lg p"></i>Ton compte <i class="lg b"></i>Indice</span></header>${curveSVG()}</section>
        <section class="mt-win pm-notes"><header class="mt-wh"><b>Commentaires du coach</b></header><div class="mt-wb pm-pad">${notes.map(([k, t, x]) => `<div class="fd ${k === 'good' ? 'good' : k === 'warn' ? 'warn' : ''}"><i></i><div><b>${esc(t)}</b><p>${esc(x)}</p></div></div>`).join('')}</div></section>
      </div>`;
  }

  function bind() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#fd-ai-body [data-ai-go]')) { askAI(); return; }
      const h = e.target.closest('[data-fd-home]');
      if (h) {
        const a = h.dataset.fdHome;
        if (a === 'start') start(($('#fd-code').value || '').trim().toUpperCase(), +$('#fd-q').value, $('#fd-diff').value);
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
      else if (a === 'replay') start(S.code, S.Q, S.diff);
    });
    document.addEventListener('change', (e) => {
      if (e.target.dataset && e.target.dataset.fdMpred != null && S.st) { FD.predictMacro(S.st, e.target.value); persist(); return; }
      const p = e.target.dataset && e.target.dataset.fdPred;
      if (p && S.st) { FD.predict(S.st, p, e.target.value); persist(); }
    });
    document.addEventListener('input', (e) => {
      if (e.target.id === 'fd-qty') S.qty = e.target.value;
      const k = e.target.dataset && e.target.dataset.dcf;
      if (k && S.dcf && S.g) {
        const v = parseFloat(String(e.target.value).replace(',', '.'));
        if (Number.isFinite(v)) S.dcf[k] = v / 100;
        const c = cur(), t = FD.ttm(c, kVis()), out = $('#fd-dcf-out');
        if (out) out.innerHTML = dcfOut(t.fcf / c.sh, S.dcf, FD.price(S.g, S.st, c));
      }
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fd="share"]');
      if (!b || !S.ev) return;
      const sc = S.ev.score, txt = `Saison des résultats ${S.code} : note ${sc.grade} (${Math.round(sc.total)}/100), ${sp1(S.ev.tot)} contre ${sp1(S.ev.idxRet)} pour l’indice. Rejoue les mêmes sociétés avec le code ${S.code} sur Trading Academy.`;
      try { navigator.clipboard.writeText(txt); b.textContent = 'Copié ✓'; } catch (err) { b.textContent = txt; }
    });
  }
  bind(); renderCard();
  FD.ui = { render, renderCard };
})();
