/* Trading Academy — écran du mode Gestionnaire de portefeuille (habillage MT5).
   Toute la logique est dans pm.js ; ici : carte d'accueil, écran de gestion, rapport d'évaluation, sauvegarde. */
(function () {
  'use strict';
  const TA = window.TA, PM = TA.PM;
  if (!PM) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf0 = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
  const money = (x) => nf0.format(Math.round(x)) + ' $';
  const sgn = (x) => (x > 0 ? '+' : x < 0 ? '−' : '');
  const p1 = (x) => (x * 100).toFixed(1).replace('.', ',') + ' %';
  const sp1 = (x) => sgn(Math.round(x * 1000) / 1000) + Math.abs(x * 100).toFixed(1).replace('.', ',') + ' %';
  const n2 = (x) => (x == null ? '—' : x.toFixed(2).replace('.', ','));
  const cls = (x) => (x > 0.00005 ? 'pos' : x < -0.00005 ? 'neg' : '');
  const dateOf = (d) => new Date(d * 86400000).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const KEY = 'ta:pm', HKEY = 'ta:pmhist';
  const S = { g: null, st: null, ev: null, series: null, targets: {}, mand: null, scen: 'random', code: '', msg: '', armed: false, busy: false };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : la partie reste jouable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } },
  };
  const mandOf = (id) => PM.MANDATES.find((m) => m.id === id) || PM.MANDATES[0];
  const newCode = () => 'PM-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  async function loadSeries() {
    if (S.series) return S.series;
    const out = {};
    await Promise.all(['SPY', ...PM.RISKY.filter((x) => x !== 'SPY')].map(async (id) => {
      const r = await fetch(`data/${id}.json`);
      if (!r.ok) throw new Error('Cotes indisponibles : ' + id);
      const d = await r.json();
      out[id] = { t: d.t, c: d.c };
    }));
    S.series = out;
    return out;
  }

  /* ---------- carte d'accueil ---------- */
  function renderCard() {
    const box = $('#pm-card');
    if (!box) return;
    const saved = store.get(KEY), hist = store.get(HKEY) || [];
    const opts = PM.MANDATES.map((m) => `<option value="${m.id}"${S.mand === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
    const scs = PM.SCENARIOS.map((s) => `<option value="${s.id}"${S.scen === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
    const m = mandOf(S.mand || PM.MANDATES[0].id);
    box.innerHTML = `<h2>Gestionnaire de portefeuille <span class="tag soon">nouveau</span></h2>
      <p class="hint">Un client, un énoncé de politique de placement, des FNB réels : rééquilibre chaque mois, respecte les contraintes, bats l’indice de politique. Évalué comme un mandat de gestion (conformité, Sharpe, erreur de suivi, attribution).</p>
      ${saved ? `<div class="pm-resume"><b>Mandat en cours</b> · ${esc(mandOf(saved.mand).name)} · mois ${saved.st.m} sur ${mandOf(saved.mand).horizon}<div class="acts"><button class="btn primary sm" type="button" data-pm-home="resume">Reprendre</button><button class="btn ghost sm" type="button" data-pm-home="drop">Abandonner</button></div></div>` : ''}
      <label class="field"><span>Mandat</span><select id="pm-mand">${opts}</select></label>
      <p class="hint" id="pm-mand-d">${esc(m.client)}. ${esc(m.blurb)}</p>
      <div class="two"><label class="field"><span>Période</span><select id="pm-scen">${scs}</select></label>
      <label class="field"><span>Code (facultatif)</span><input id="pm-code" maxlength="12" placeholder="PM-XXXX-XXXX" spellcheck="false" autocomplete="off"></label></div>
      <p class="err" id="pm-err" role="alert"></p>
      <button class="btn primary big" type="button" data-pm-home="start">Prendre le mandat</button>
      ${hist.length ? `<p class="sub">Derniers mandats</p><div class="glist">${hist.slice(0, 4).map((h) => `<div class="grow"><span>${esc(h.name)}</span><span class="mono"><b>${esc(h.grade)}</b> ${h.score}</span><span class="mono ${cls(h.active)}">${sp1(h.active)}/an vs indice</span></div>`).join('')}</div>` : ''}`;
  }

  async function start(mandId, scen, code) {
    if (S.busy) return;
    S.busy = true;
    const err = $('#pm-err');
    try {
      const series = await loadSeries();
      const m = mandOf(mandId);
      S.mand = m.id; S.scen = scen; S.code = code || newCode();
      S.g = PM.build(m, series, { seed: S.code, scenario: scen });
      S.st = PM.newState(S.g); S.ev = null; S.msg = ''; S.armed = false;
      S.targets = currentTargets();
      persist();
      TA_APP().show('pm');
      render();
    } catch (e) {
      if (err) err.textContent = 'Impossible de lancer le mandat : ' + e.message;
    }
    S.busy = false;
  }
  const TA_APP = () => window.TA_APP;
  async function resume() {
    const saved = store.get(KEY);
    if (!saved) return;
    try {
      const series = await loadSeries();
      const m = mandOf(saved.mand);
      S.mand = m.id; S.scen = saved.scen; S.code = saved.code;
      S.g = PM.build(m, series, { seed: saved.code, scenario: saved.scen });
      S.st = saved.st; S.ev = null; S.msg = ''; S.armed = false;
      S.targets = currentTargets();
      TA_APP().show('pm');
      render();
    } catch (e) { const err = $('#pm-err'); if (err) err.textContent = 'Reprise impossible : ' + e.message; }
  }
  const persist = () => store.set(KEY, { v: 1, mand: S.mand, scen: S.scen, code: S.code, st: S.st });

  function currentTargets() {
    const w = PM.value(S.g, S.st).w, t = {};
    for (const id of PM.RISKY) t[id] = Math.round(w[id] * 1000) / 1000;
    return t;
  }
  const targetCash = () => 1 - PM.RISKY.reduce((s, id) => s + (S.targets[id] || 0), 0);
  const targetW = () => ({ ...S.targets, CASH: targetCash() });

  /* ---------- écran de gestion ---------- */
  function chartSVG() {
    const { g, st } = S, P = st.pidx, B = st.bidx, W = 760, H = 220, tot = g.N * PM.BARS;
    const lo = Math.min(...P, ...B, 100) * 0.985, hi = Math.max(...P, ...B, 100) * 1.015;
    const X = (i) => 4 + ((W - 8) * i) / tot, Y = (v) => H - 6 - ((H - 12) * (v - lo)) / (hi - lo);
    const line = (a) => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    let pk = -Infinity, dd = [];
    for (const v of P) { pk = Math.max(pk, v); dd.push(1 - v / pk); }
    const ddMax = Math.max(0.02, ...dd), DH = 46;
    const area = `M${X(0)},0 ` + dd.map((d, i) => `L${X(i).toFixed(1)},${((d / ddMax) * DH).toFixed(1)}`).join(' ') + ` L${X(dd.length - 1).toFixed(1)},0 Z`;
    const grid = [90, 100, 110, 120, 130, 150, 200].filter((v) => v > lo && v < hi).map((v) => `<line x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gl"/><text x="${W - 4}" y="${(Y(v) - 3).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
    const marks = st.trades.map((t) => `<path d="M${X(t.m * PM.BARS).toFixed(1)},${H - 2} l-3,-6 l6,0 z" class="mk"/>`).join('');
    const years = [];
    for (let k = 12; k < g.N; k += 12) years.push(`<line x1="${X(k * PM.BARS)}" x2="${X(k * PM.BARS)}" y1="0" y2="${H}" class="gl v"/><text x="${X(k * PM.BARS) + 3}" y="12">M${k}</text>`);
    return `<svg class="pm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valeur du compte et de l’indice de politique, base 100">${grid}${years.join('')}
      <polyline points="${line(B)}" class="lb"/><polyline points="${line(P)}" class="lp"/>${marks}</svg>
      <svg class="pm-svg dd" viewBox="0 0 ${W} ${DH}" role="img" aria-label="Perte depuis le sommet"><path d="${area}" class="da"/></svg>`;
  }

  function statusFor(check, after) {
    return check.map((c, i) => {
      const a = after && after[i];
      const v = c.val == null ? '—' : c.k === 'ban' ? (c.val > 0.0005 ? p1(c.val) : 'aucun') : p1(c.val);
      const av = a && a.val != null ? (a.k === 'ban' ? (a.val > 0.0005 ? p1(a.val) : 'aucun') : p1(a.val)) : null;
      const changed = a && (a.ok !== c.ok || (av && av !== v && ['maxEquity', 'maxPos', 'minCash', 'ban', 'maxActive'].includes(c.k)));
      return `<li class="${c.ok ? 'ok' : 'bad'}"><span class="ic">${c.ok ? '✓' : '✗'}</span><span>${esc(c.text)}<br><small>actuel : ${v}${changed ? ` · après les cibles : <b class="${a.ok ? 'pos' : 'neg'}">${av} ${a.ok ? '✓' : '✗'}</b>` : ''}</small></span></li>`;
    }).join('');
  }

  function render() {
    const root = $('#screen-pm');
    if (!root || !S.g) return;
    if (S.ev) { renderReport(root); return; }
    const { g, st } = S, m = g.mand, cur = PM.value(g, st), L = PM.live(g, st);
    const lastR = st.mon.length ? st.mon[st.mon.length - 1] : null;
    const saa = PM.saaOf(m), tw = targetW();
    const chk = PM.check(g, st), after = PM.check(g, st, tw);
    const sumT = PM.RISKY.reduce((s, id) => s + (S.targets[id] || 0), 0);
    const rows = PM.ALL.map((id) => {
      const a = PM.info(id), w = cur.w[id], pol = saa[id] || 0, gap = w - pol;
      const m1 = lastR ? lastR.rA[id] : null;
      const since = id === 'CASH' ? null : g.px[id][st.idx] / g.px[id][g.start] - 1;
      const tgt = id === 'CASH' ? `<span class="mono" id="pm-t-CASH">${(targetCash() * 100).toFixed(1).replace('.', ',')}</span>`
        : `<input class="pm-in" data-pm-t="${id}" inputmode="decimal" value="${((S.targets[id] || 0) * 100).toFixed(1).replace('.', ',')}" aria-label="Poids cible ${esc(a.name)} en pourcentage">`;
      return `<tr><td><b>${esc(a.name)}</b><br><small>${esc(a.sub)}</small></td><td class="r">${money(cur.v[id])}</td><td class="r">${p1(w)}</td>
        <td class="r">${tgt} %</td><td class="r">${p1(pol)}</td><td class="r ${Math.abs(gap) > 0.05 ? 'neg' : ''}">${sgn(gap)}${Math.abs(gap * 100).toFixed(1).replace('.', ',')}</td>
        <td class="r ${cls(m1)}">${m1 == null ? '—' : sp1(m1)}</td><td class="r ${cls(since)}">${since == null ? '—' : sp1(since)}</td></tr>`;
    }).join('');
    const log = st.log.slice().reverse().slice(0, 12).map((l) => `<li class="${l.kind}"><small>Mois ${l.m}</small> ${esc(l.text)}</li>`).join('');
    const trades = st.trades.slice().reverse().slice(0, 4).map((t) => `<li><small>Mois ${t.m}</small> ${money(t.traded)} échangés, frais ${money(t.cost)}${t.note ? ` — « ${esc(t.note)} »` : ''}</li>`).join('');
    root.innerHTML = `
      <div class="mt-bar pm-bar" role="toolbar" aria-label="Actions du gestionnaire">
        <button class="btn primary" type="button" data-pm="next">Mois suivant ▶</button>
        <span class="mt-sep"></span>
        <button class="btn" type="button" data-pm="apply" id="pm-apply">Appliquer les cibles</button>
        <button class="btn ghost" type="button" data-pm="saa">Cibles = politique</button>
        <button class="btn ghost" type="button" data-pm="hold">Cibles = portefeuille actuel</button>
        <span class="sp"></span>
        <div class="mt-prog"><div class="ptxt">Mois ${st.m} sur ${g.N}</div><div class="prog"><i style="width:${(st.m / g.N) * 100}%"></i></div></div>
        <button class="btn ghost" type="button" data-pm="end">${S.armed ? 'Confirmer : évaluer maintenant' : 'Terminer le mandat'}</button>
      </div>
      <div class="pm-grid">
        <aside class="mt-win pm-left"><header class="mt-wh"><b>Mandat du client</b></header>
          <div class="mt-wb pm-pad">
            <p class="pm-client"><b>${esc(m.client)}</b></p><p class="hint">${esc(m.blurb)}</p>
            <p class="sub-t">Objectif</p><p>${esc(m.objective.text)}</p>
            <p class="sub-t">Contraintes de l’énoncé de politique</p><ul class="pm-cons" id="pm-cons">${statusFor(chk, after)}</ul>
            <p class="sub-t">Indice de politique</p><p class="hint">${Object.entries(m.bench).map(([id, w]) => `${esc(PM.info(id).name)} ${p1(w)}`).join(' · ')}</p>
            <p class="fine">Frais : de 0,03 % à 0,15 % du montant échangé selon le FNB. Retraits ou cotisations : ${st.flow ? (st.flow > 0 ? '+' : '−') + money(Math.abs(st.flow)) + ' par mois' : 'aucun'}.</p>
          </div></aside>
        <section class="pm-center">
          <div class="mt-win"><header class="mt-wh"><b>Valeur du compte et indice de politique</b><span class="mt-wsub"><i class="lg p"></i>Portefeuille <i class="lg b"></i>Indice</span></header>
            <div class="pm-chart">${chartSVG()}</div></div>
          <div class="mt-win"><header class="mt-wh"><b>Allocation</b><span class="mt-wsub">cibles : <span id="pm-sum" class="${Math.abs(sumT - 1) <= 1.0001 && sumT <= 1.0001 ? '' : 'neg'}">${p1(sumT)}</span> en FNB, reste en encaisse</span></header>
            <div class="mt-wb"><table class="mt-tbl pm-tbl"><thead><tr><th>Actif</th><th class="r">Valeur</th><th class="r">Poids</th><th class="r">Cible</th><th class="r">Politique</th><th class="r">Écart (pts)</th><th class="r">Dernier mois</th><th class="r">Depuis le début</th></tr></thead><tbody>${rows}</tbody>
              <tfoot><tr class="sumrow"><td>Total</td><td class="r">${money(cur.total)}</td><td class="r">100 %</td><td class="r"></td><td class="r">100 %</td><td></td><td></td><td></td></tr></tfoot></table></div>
            <div class="pm-note"><label class="field"><span>Justification de la décision (consignée au journal)</span><input id="pm-note" maxlength="160" placeholder="Pourquoi ce rééquilibrage ? Ex. : ramener les actions sous la limite" autocomplete="off"></label>
              <p class="err" id="pm-msg" role="alert">${esc(S.msg)}</p></div>
          </div>
        </section>
        <aside class="mt-win pm-right"><header class="mt-wh"><b>Indicateurs</b></header>
          <div class="mt-wb pm-pad">
            <dl class="kv pm-kv">
              <div><dt>Valeur du compte</dt><dd>${money(cur.total)}</dd></div>
              <div><dt>Rendement</dt><dd class="${cls(L.ret)}">${sp1(L.ret)}</dd></div>
              <div><dt>Indice de politique</dt><dd class="${cls(L.bret)}">${sp1(L.bret)}</dd></div>
              <div><dt>Écart</dt><dd class="${cls(L.ret - L.bret)}">${sp1(L.ret - L.bret)}</dd></div>
              <div><dt>Perte depuis le sommet</dt><dd class="${L.dd > 0.0005 ? 'neg' : ''}">${p1(L.dd)}</dd></div>
              <div><dt>Volatilité annualisée</dt><dd>${L.vol == null ? '—' : p1(L.vol)}</dd></div>
              <div><dt>Ratio de Sharpe</dt><dd>${n2(L.sharpe)}</dd></div>
              <div><dt>Erreur de suivi</dt><dd>${L.te == null ? '—' : p1(L.te)}</dd></div>
              <div><dt>Frais cumulés</dt><dd>${money(st.costs)}</dd></div>
              <div><dt>Rotation cumulée</dt><dd>${p1(st.turnover / m.start)}</dd></div>
            </dl>
            <p class="sub-t">Journal</p><ul class="pm-log">${log}</ul>
            ${trades ? `<p class="sub-t">Décisions</p><ul class="pm-log">${trades}</ul>` : ''}
          </div></aside>
      </div>
      <footer class="mt-status"><span>${esc(m.name)} · mois ${st.m} sur ${g.N}</span><span class="mt-st-m">Code ${esc(S.code)}</span><span class="mt-st-r"><span class="mt-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>Données historiques</span></footer>`;
  }

  // les cibles se tapent sans tout redessiner (le champ garde le focus)
  function onTarget(e) {
    const id = e.target.dataset.pmT;
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    S.targets[id] = Number.isFinite(v) && v >= 0 ? Math.min(100, v) / 100 : 0;
    const sum = PM.RISKY.reduce((s, k) => s + (S.targets[k] || 0), 0), cash = $('#pm-t-CASH'), tot = $('#pm-sum');
    if (cash) cash.textContent = (Math.max(0, 1 - sum) * 100).toFixed(1).replace('.', ',') + (sum > 1.0001 ? ' (dépasse 100 %)' : '');
    if (tot) { tot.textContent = p1(sum); tot.className = sum <= 1.0001 ? '' : 'neg'; }
    const box = $('#pm-cons');
    if (box) box.innerHTML = statusFor(PM.check(S.g, S.st), PM.check(S.g, S.st, targetW()));
  }

  function doApply() {
    const note = ($('#pm-note') || {}).value || '';
    const r = PM.rebalance(S.g, S.st, S.targets, note);
    S.msg = r.ok ? r.msg : r.error;
    if (r.ok) { S.targets = currentTargets(); S.st.log.push({ m: S.st.m, kind: 'info', text: r.traded ? `Rééquilibrage : ${money(r.traded)} échangés${note ? ' — ' + note : ''}.` : 'Cibles confirmées sans échange.' }); persist(); }
    render();
  }
  function doNext() {
    const r = PM.step(S.g, S.st);
    S.msg = '';
    if (r.events && r.events.length) S.msg = r.events.join(' ');
    if (r.done) { finish(); return; }
    S.targets = currentTargets();
    S.armed = false; persist(); render();
  }
  function finish() {
    if (S.st.m < 3) { S.msg = 'Joue au moins 3 mois avant l’évaluation.'; S.armed = false; render(); return; }
    S.st.ended = true;
    S.ev = PM.evaluate(S.g, S.st);
    const h = store.get(HKEY) || [];
    h.unshift({ name: S.g.mand.name, grade: S.ev.score.grade, score: Math.round(S.ev.score.total), active: S.ev.ann - S.ev.bann, code: S.code });
    store.set(HKEY, h.slice(0, 8));
    store.del(KEY);
    render();
  }

  /* ---------- rapport d'évaluation ---------- */
  function renderReport(root) {
    const { g, st, ev } = S, m = g.mand, sc = ev.score;
    const d0 = g.t[g.start], d1 = g.t[st.idx];
    const bar = (v) => `<div class="pm-sbar"><i style="width:${Math.round(v)}%"></i></div>`;
    const kpi = (lab, a, b, fmt = p1, better = 'high') => {
      const win = a != null && b != null && (better === 'high' ? a > b : a < b);
      return `<tr><td>${lab}</td><td class="r ${win ? 'pos' : ''}">${a == null ? '—' : fmt(a)}</td><td class="r">${b == null ? '—' : fmt(b)}</td></tr>`;
    };
    const attr = PM.ALL.map((id) => `<tr><td>${esc(PM.info(id).name)}</td><td class="r ${cls(ev.attr[id])}">${sp1(ev.attr[id] / Math.max(1, st.mon.length) * 12)}</td></tr>`).join('');
    const kinds = { good: 'fd good', warn: 'fd warn', info: 'fd' };
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Rapport de gestion · ${esc(m.name)}</b><span class="sp"></span>
        <button class="btn" type="button" data-pm="replay">Rejouer cette période</button><button class="btn primary" type="button" data-pm="home">Nouveau mandat</button></div>
      <div class="pm-report">
        <section class="mt-win pm-grade"><header class="mt-wh"><b>Évaluation</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${sc.grade <= 'B' ? 'pos' : sc.grade >= 'D' ? 'neg' : ''}">${sc.grade}</div><p class="pm-score">${Math.round(sc.total)} sur 100</p>
          <p class="hint">${esc(dateOf(d0))} → ${esc(dateOf(d1))} · ${st.mon.length} mois · code ${esc(S.code)}</p>
          <p class="hint">Valeur finale : <b>${money(ev.finalValue)}</b></p>
          <dl class="pm-parts"><dt>Conformité à la politique (40 %)</dt><dd>${Math.round(sc.cons)}${bar(sc.cons)}</dd>
          <dt>Performance contre l’indice (25 %)</dt><dd>${Math.round(sc.perf)}${bar(sc.perf)}</dd>
          <dt>Objectif du client (20 %)</dt><dd>${Math.round(sc.obj)}${bar(sc.obj)}</dd>
          <dt>Discipline : rotation et frais (15 %)</dt><dd>${Math.round(sc.disc)}${bar(sc.disc)}</dd></dl>
        </div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Résultats</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th></th><th class="r">Portefeuille</th><th class="r">Indice de politique</th></tr></thead><tbody>
          ${kpi('Rendement total', ev.tot, ev.btot, sp1)}${kpi('Rendement annualisé', ev.ann, ev.bann, sp1)}${kpi('Volatilité annualisée', ev.vol, ev.bvol, p1, 'low')}
          ${kpi('Perte maximale', ev.dd, ev.bdd, p1, 'low')}${kpi('Ratio de Sharpe', ev.sharpe, ev.sharpeB, n2)}
          <tr><td>Ratio de Sortino</td><td class="r">${n2(ev.sortino)}</td><td class="r">—</td></tr>
          <tr><td>Erreur de suivi (annualisée)</td><td class="r">${p1(ev.te)}</td><td class="r">—</td></tr>
          <tr><td>Ratio d’information</td><td class="r ${cls(ev.ir)}">${n2(ev.ir)}</td><td class="r">—</td></tr>
          <tr><td>Bêta contre l’indice</td><td class="r">${n2(ev.beta)}</td><td class="r">1,00</td></tr>
          <tr><td>Alpha de Jensen (annuel)</td><td class="r ${cls(ev.alpha)}">${ev.alpha == null ? '—' : sp1(ev.alpha)}</td><td class="r">—</td></tr>
          <tr><td>Perte mensuelle probable (VaR 95 %)</td><td class="r">${p1(ev.var95)}</td><td class="r">—</td></tr>
          <tr><td>Capture à la hausse / à la baisse</td><td class="r">${ev.upCap == null ? '—' : p1(ev.upCap)} / ${ev.dnCap == null ? '—' : p1(ev.dnCap)}</td><td class="r">100 % / 100 %</td></tr>
          <tr><td>Rotation annuelle · frais</td><td class="r">${p1(ev.turnover)} · ${money(ev.costs)}</td><td class="r">—</td></tr>
        </tbody></table></div></section>
        <section class="mt-win pm-att"><header class="mt-wh"><b>Attribution de l’écart à l’indice (par an)</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>${attr}
          <tr><td>Frais de transaction</td><td class="r ${cls(ev.costDrag)}">${sp1(ev.costDrag / Math.max(1, st.mon.length) * 12)}</td></tr>
          <tr class="sumrow"><td>Écart total à l’indice</td><td class="r ${cls(ev.ann - ev.bann)}">${sp1(ev.ann - ev.bann)}</td></tr></tbody></table></div>
          <p class="mt-note">Poids actif × rendement relatif de chaque actif, mois par mois. La somme approche l’écart total : le reste vient de la composition des rendements et de la dérive.</p></section>
        <section class="mt-win pm-notes"><header class="mt-wh"><b>Commentaires du coach</b></header><div class="mt-wb pm-pad">
          ${ev.notes.map((n) => `<div class="${kinds[n.kind] || 'fd'}"><i></i><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p></div></div>`).join('')}
          ${st.trades.length ? `<p class="sub-t">Journal des décisions</p><ul class="pm-log">${st.trades.map((t) => `<li><small>Mois ${t.m}</small> ${money(t.traded)} échangés, frais ${money(t.cost)}${t.note ? ` — « ${esc(t.note)} »` : ''}</li>`).join('')}</ul>` : ''}
        </div></section>
      </div>`;
  }

  /* ---------- événements ---------- */
  function bind() {
    document.addEventListener('click', (e) => {
      const h = e.target.closest('[data-pm-home]');
      if (h) {
        const a = h.dataset.pmHome;
        if (a === 'start') start($('#pm-mand').value, $('#pm-scen').value, ($('#pm-code').value || '').trim().toUpperCase());
        else if (a === 'resume') resume();
        else if (a === 'drop') { store.del(KEY); renderCard(); }
        return;
      }
      const b = e.target.closest('[data-pm]');
      if (!b || !S.g) return;
      const a = b.dataset.pm;
      if (a === 'next') doNext();
      else if (a === 'apply') doApply();
      else if (a === 'saa') { const s = PM.saaOf(S.g.mand); for (const id of PM.RISKY) S.targets[id] = s[id] || 0; render(); }
      else if (a === 'hold') { S.targets = currentTargets(); render(); }
      else if (a === 'end') { if (!S.armed) { S.armed = true; render(); setTimeout(() => { if (S.armed) { S.armed = false; if (!S.ev && TA_APP().screen === 'pm') render(); } }, 4000); } else { S.armed = false; finish(); } }
      else if (a === 'home') { S.g = null; S.ev = null; renderCard(); TA_APP().show('home'); }
      else if (a === 'replay') start(S.mand, S.scen, S.code);
    });
    document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.pmT) onTarget(e); });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'pm-mand') { S.mand = e.target.value; const d = $('#pm-mand-d'), m = mandOf(S.mand); if (d) d.textContent = `${m.client}. ${m.blurb}`; }
      else if (e.target.id === 'pm-scen') S.scen = e.target.value;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.dataset && e.target.dataset.pmT) { e.preventDefault(); doApply(); }
    });
  }
  S.mand = PM.MANDATES[0].id;
  bind(); renderCard();
  PM.ui = { render, renderCard };
})();
