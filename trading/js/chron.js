/* Trading Academy — chroniques : huit épisodes réels des marchés vécus décision après décision.
   À chaque étape (date réelle, clôture du jour), tu vois le contexte tel qu'on le connaissait, tu répartis 100 000 $
   entre cinq placements et du cash, puis les vraies cotes révèlent la suite. Le bilan compare ton parcours à un
   portefeuille 60/40 resté passif. La logique de simulation est pure et testée (tools/test-chron.mjs). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CH = (TA.CHRON = {});
  CH.CAPITAL = 100000;
  CH.FEE = 0.001;            // frais d'exécution : 0,1 % de chaque montant déplacé
  CH.PRE = 150;              // jours de calendrier d'historique montrés avant chaque décision
  CH.NAMES = { SPY: 'Actions américaines (S&P 500)', QQQ: 'Technologie (Nasdaq-100)', TLT: 'Obligations du Trésor 20 ans et plus', GLD: 'Or', XOM: 'Pétrole : ExxonMobil', JPM: 'Banques : JPMorgan', XEG_TO: 'Énergie canadienne (indice TSX)', BTC_USD: 'Bitcoin' };
  CH.SHORT = { SPY: 'S&P 500', QQQ: 'Nasdaq-100', TLT: 'Obligations', GLD: 'Or', XOM: 'ExxonMobil', JPM: 'JPMorgan', XEG_TO: 'Énergie CA', BTC_USD: 'Bitcoin' };
  CH.COLORS = { SPY: '#2563eb', QQQ: '#7c3aed', TLT: '#0891b2', GLD: '#d97706', XOM: '#dc2626', JPM: '#059669', XEG_TO: '#be123c', BTC_USD: '#ea8a00' };
  CH.BENCH = { SPY: 0.6, TLT: 0.4 };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  CH.dayOf = (iso) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
  // dernière cote connue à la date d (jours depuis 1970), ou null avant le début de la série
  CH.priceOn = (s, d) => {
    const t = s.t;
    let lo = 0, hi = t.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (t[m] <= d) { r = m; lo = m + 1; } else hi = m - 1; }
    return r < 0 ? null : s.c[r];
  };
  const firstIdx = (t, d) => { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < d) lo = m + 1; else hi = m; } return lo; };

  /* ----- simulation ----- */
  CH.start = () => ({ value: CH.CAPITAL, w: {}, path: [], peak: CH.CAPITAL, dd: 0, fees: 0, bench: null });
  // une étape : réallocation vers `target` (poids 0 à 1, somme ≤ 1) à la clôture de dFrom, puis cotes jusqu'à dTo
  CH.advance = (world, ids, G, dFrom, dTo, target) => {
    let turnover = 0, invested = 0;
    for (const id of ids) { const wt = clamp(+target[id] || 0, 0, 1); turnover += Math.abs(wt - (G.w[id] || 0)); invested += wt; }
    if (invested > 1 + 1e-9) throw new Error('Allocation supérieure à 100 %');
    const before = G.value, fee = before * turnover * CH.FEE, v0 = before - fee;
    const units = {};
    for (const id of ids) {
      const p = CH.priceOn(world[id], dFrom);
      if (p == null) throw new Error('Cotes indisponibles : ' + id);
      units[id] = (+target[id] || 0) > 0 ? (v0 * target[id]) / p : 0;
    }
    const cash = v0 * (1 - invested);
    if (!G.bench) {
      const bv = CH.CAPITAL * (1 - CH.FEE), u = {};
      for (const id of Object.keys(CH.BENCH)) u[id] = (bv * CH.BENCH[id]) / CH.priceOn(world[id], dFrom);
      G.bench = { units: u, value: bv, peak: CH.CAPITAL, dd: 0, start: bv };
      G.path.push({ d: dFrom, v: CH.CAPITAL, b: CH.CAPITAL });
    }
    const benchBefore = G.bench.value;
    const val = (d) => { let v = cash; for (const id of ids) if (units[id]) v += units[id] * CH.priceOn(world[id], d); return v; };
    const bval = (d) => { let v = 0; for (const id of Object.keys(CH.BENCH)) v += G.bench.units[id] * CH.priceOn(world[id], d); return v; };
    const cal = world.SPY.t;
    let v = v0, b = benchBefore;
    for (let k = firstIdx(cal, dFrom + 1); k < cal.length && cal[k] <= dTo; k++) {
      const d = cal[k];
      v = val(d); b = bval(d);
      G.path.push({ d, v, b });
      if (v > G.peak) G.peak = v;
      G.dd = Math.min(G.dd, v / G.peak - 1);
      if (b > G.bench.peak) G.bench.peak = b;
      G.bench.dd = Math.min(G.bench.dd, b / G.bench.peak - 1);
    }
    if (G.path.length && G.path[G.path.length - 1].d < dTo) { v = val(dTo); b = bval(dTo); }
    G.value = v; G.bench.value = b; G.fees += fee;
    const assetRet = {}, w = {};
    for (const id of ids) {
      assetRet[id] = CH.priceOn(world[id], dTo) / CH.priceOn(world[id], dFrom) - 1;
      w[id] = units[id] ? (units[id] * CH.priceOn(world[id], dTo)) / v : 0;
    }
    G.w = w;
    return { before, after: v, ret: v / before - 1, benchRet: b / benchBefore - 1, fee, turnover, assetRet, w, cashW: 1 - Object.values(w).reduce((a, x) => a + x, 0) };
  };
  CH.GRADES = [[80, 'A'], [65, 'B'], [50, 'C'], [35, 'D'], [0, 'E']];
  // note finale : performance relative au 60/40 passif, risque subi, résultat absolu, discipline
  CH.grade = (G, journal) => {
    const ret = G.value / CH.CAPITAL - 1, bRet = G.bench.value / CH.CAPITAL - 1;
    const perf = clamp(25 + 100 * (ret - bRet), 0, 45);
    const risk = clamp(20 + 100 * (G.dd - G.bench.dd), 0, 30);
    const abs = ret >= 0 ? 10 : clamp(10 + 40 * ret, 0, 10);
    const conc = journal.filter((j) => Object.entries(j.target).some(([id, w]) => w > 0.7 && id !== 'SPY')).length;
    const disc = clamp(15 - 5 * conc, 0, 15);
    const avgInv = journal.length ? journal.reduce((s, j) => s + Object.values(j.target).reduce((a, x) => a + x, 0), 0) / journal.length : 0;
    let score = perf + risk + abs + disc;
    const timid = avgInv < 0.15;
    if (timid) score = Math.min(score, 55);
    score = Math.round(score);
    const grade = CH.GRADES.find(([min]) => score >= min)[1];
    return { score, grade, ret, bRet, dd: G.dd, bDD: G.bench.dd, parts: { perf: Math.round(perf), risk: Math.round(risk), abs: Math.round(abs), disc: Math.round(disc) }, conc, avgInv, timid };
  };
  // contrôle de cohérence d'une chronique (utilisé par les tests)
  CH.validate = (c) => {
    const errs = [];
    if (!c.id || !c.title || !Array.isArray(c.ids) || c.ids.length < 3) errs.push('structure');
    if (!c.ids.includes('SPY') || !c.ids.includes('TLT')) errs.push('SPY et TLT requis pour le portefeuille de référence');
    const dates = c.steps.map((s) => s.date).concat(c.end.date).map(CH.dayOf);
    for (let i = 1; i < dates.length; i++) if (!(dates[i] > dates[i - 1])) errs.push('dates non croissantes');
    for (const s of c.steps) for (const k of ['head', 'ctx', 'after', 'lesson']) if (!s[k] || s[k].length < (k === 'head' ? 5 : 20)) errs.push(s.date + ' : texte ' + k);
    if (!c.end.text) errs.push('fin');
    return errs;
  };

  if (typeof document === 'undefined') return;
  /* ---------- interface ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const APP = () => window.TA_APP;
  const KEY = 'ta:chron';
  const DATA = () => TA.CHRON_DATA || [];
  const load = () => {
    const out = { v: 1, best: {} };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1 && s.best && typeof s.best === 'object') {
        for (const [k, b] of Object.entries(s.best)) if (b && Number.isFinite(b.score) && typeof b.grade === 'string' && 'ABCDE'.includes(b.grade)) out.best[k] = { score: clamp(Math.round(b.score), 0, 100), grade: b.grade, ret: Number.isFinite(b.ret) ? b.ret : 0 };
      }
    } catch (e) { /* rien */ }
    return out;
  };
  let P = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* rien */ } };
  const COLORS2 = { credit08: ['#1e293b', '#475569'], covid20: ['#0ea5e9', '#6366f1'], inflation22: ['#f59e0b', '#dc2626'], politique16: ['#7c3aed', '#db2777'], crypto17: ['#f59e0b', '#a21caf'], petrole14: ['#374151', '#b45309'], banques23: ['#0f766e', '#1d4ed8'], tarifs25: ['#e11d48', '#4f46e5'] };
  const cache = new Map();
  async function loadAsset(id) {
    if (cache.has(id)) return cache.get(id);
    const r = await fetch(`data/${id}.json`);
    if (!r.ok) throw new Error('Cotes indisponibles : ' + id);
    const d = await r.json();
    const s = { t: d.t, c: d.c };
    cache.set(id, s);
    return s;
  }
  const S = { view: 'home', c: null, world: null, G: null, i: 0, journal: [], alloc: {}, last: null, fin: null, busy: false, err: '' };
  const dates = () => S.c.steps.map((s) => s.date).concat(S.c.end.date);
  const pct = (x, d = 1) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d).replace('.', ',') + ' %';
  const money = (x) => Math.round(x).toLocaleString('fr-CA').replace(/ | /g, ' ') + ' $';
  const cls = (x) => (x > 0.0005 ? 'pos' : x < -0.0005 ? 'neg' : '');
  const fmtLong = (iso) => new Date(CH.dayOf(iso) * 86400000).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const fmtShort = (d) => new Date(d * 86400000).toLocaleDateString('fr-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' });

  // graphique à échelle logarithmique, base 100 au début de la fenêtre
  function plot(series, d0, d1, split) {
    const W = 720, H = 250, L = 44, R = 10, T = 12, B = 24;
    let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const [, v] of s.pts) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!Number.isFinite(lo) || d1 <= d0) return '';
    const a = Math.log(lo * 0.96), b = Math.log(hi * 1.04);
    const X = (d) => L + ((d - d0) / (d1 - d0)) * (W - L - R), Y = (v) => T + (1 - (Math.log(v) - a) / (b - a)) * (H - T - B);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = Math.exp(a + ((b - a) * k) / 4), y = Y(v); g += `<line x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e3e7f3"/><text x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#7b86a3">${Math.round(v)}</text>`; }
    g += [d0, Math.round((d0 + d1) / 2), d1].map((d, k) => `<text x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}" font-size="11" fill="#7b86a3">${esc(fmtShort(d))}</text>`).join('');
    let fut = '';
    if (split != null && split > d0 && split < d1) fut = `<rect x="${X(split).toFixed(1)}" y="${T}" width="${(X(d1) - X(split)).toFixed(1)}" height="${H - T - B}" fill="#fff4d6" opacity=".7"/><line x1="${X(split).toFixed(1)}" x2="${X(split).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="#d9a400" stroke-dasharray="4 3"/>`;
    const lines = series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="${s.w || 1.8}" stroke-linejoin="round" points="${s.pts.map(([d, v]) => X(d).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des placements, base 100" class="ch-svg">${fut}${g}${lines}</svg>`;
  }
  function assetSeries(ids, d0, d1) {
    return ids.map((id) => {
      const s = S.world[id], base = CH.priceOn(s, d0);
      const pts = [];
      if (base != null) for (let k = firstIdx(s.t, d0); k < s.t.length && s.t[k] <= d1; k++) pts.push([s.t[k], (s.c[k] / base) * 100]);
      return { id, color: CH.COLORS[id], pts };
    }).filter((s) => s.pts.length > 1);
  }
  const legend = (ids) => `<div class="ch-legend">${ids.map((id) => `<span><i style="background:${CH.COLORS[id]}"></i>${esc(CH.SHORT[id])}</span>`).join('')}</div>`;
  const allocText = (t) => {
    const parts = Object.entries(t).filter(([, w]) => w > 0).map(([id, w]) => `${CH.SHORT[id]} ${Math.round(w * 100)} %`);
    const cash = 1 - Object.values(t).reduce((a, x) => a + x, 0);
    if (cash > 0.004) parts.push(`cash ${Math.round(cash * 100)} %`);
    return parts.join(' · ') || 'cash 100 %';
  };

  const html = {
    home() {
      const done = DATA().filter((c) => P.best[c.id]).length;
      const cards = DATA().map((c) => {
        const b = P.best[c.id], col = COLORS2[c.id] || ['#334155', '#64748b'];
        return `<button type="button" class="ch-card" style="--c1:${col[0]};--c2:${col[1]}" data-ch-open="${esc(c.id)}"><span class="ico" aria-hidden="true">${c.icon}</span><b>${esc(c.title)}</b><span>${esc(c.tagline)}</span><i>${esc(c.period)} · ${esc(c.level)}${b ? ` · ${esc(c.tag)} · meilleure note ${b.grade}` : ''}</i></button>`;
      }).join('');
      return `<div class="mt-bar pm-bar"><b class="pm-title">Chroniques des marchés</b><span class="sp"></span><span class="fd-top">${done} sur ${DATA().length}</span><span class="mt-sep"></span><button class="btn ghost" type="button" data-ch="home">Accueil</button></div>
        <div class="cp-level"><section class="mt-win"><header class="mt-wh"><b>Vis l’histoire, une décision à la fois</b></header><div class="mt-wb pm-pad"><p>Chaque chronique te place à une vraie date, avec le contexte de l’époque. Tu répartis 100 000 $ entre cinq placements et du cash, puis les cotes réelles révèlent la suite. À la fin, on compare ton parcours à un portefeuille 60/40 resté passif.</p>
          <p class="hint">Les étapes sont des clôtures réelles. Les frais d’exécution sont de 0,1 % du montant déplacé.</p></div></section>
          <div class="ch-cards">${cards}</div></div>`;
    },
    intro() {
      const c = S.c;
      return `<div class="mt-bar pm-bar"><b class="pm-title">${esc(c.title)}</b><span class="sp"></span><button class="btn ghost" type="button" data-ch="list">Chroniques</button></div>
        <div class="cp-level"><section class="mt-win"><header class="mt-wh"><b>${esc(c.period)}</b></header><div class="mt-wb pm-pad"><p class="cp-quote">${esc(c.intro)}</p>
          <p>${c.steps.length} décisions · ${c.ids.length} placements disponibles :</p><ul class="ch-assets">${c.ids.map((id) => `<li><i style="background:${CH.COLORS[id]}"></i>${esc(CH.NAMES[id])}</li>`).join('')}</ul>
          ${S.err ? `<p class="err">${esc(S.err)}</p>` : ''}
          <div class="acts"><button class="btn primary big" type="button" data-ch="begin"${S.busy ? ' disabled' : ''}>${S.busy ? 'Chargement des cotes…' : 'Commencer la chronique'} ▶</button></div></div></section></div>`;
    },
    step() {
      const c = S.c, st = c.steps[S.i], D = dates(), d = CH.dayOf(D[S.i]);
      const ser = assetSeries(c.ids, d - CH.PRE, d);
      return `<div class="mt-bar pm-bar"><b class="pm-title">${esc(c.title)} · décision ${S.i + 1} sur ${c.steps.length}</b><span class="sp"></span><span class="fd-top">${money(S.G.value)}</span><span class="mt-sep"></span><button class="btn ghost" type="button" data-ch="list">Quitter</button></div>
        <div class="cp-level">
          <section class="mt-win"><header class="mt-wh"><b>${esc(st.head)}</b><span class="mt-wsub">${esc(fmtLong(D[S.i]))}</span></header><div class="mt-wb pm-pad"><p class="cp-quote">${esc(st.ctx)}</p></div></section>
          <section class="mt-win"><header class="mt-wh"><b>Les six mois qui précèdent</b><span class="mt-wsub">base 100, échelle logarithmique</span></header><div class="mt-wb pm-pad ch-chart">${plot(ser, d - CH.PRE, d, null)}${legend(c.ids)}</div></section>
          <section class="mt-win"><header class="mt-wh"><b>Ton portefeuille</b><span class="mt-wsub">${money(S.G.value)}</span></header><div class="mt-wb pm-pad">
            <div class="ch-alloc">${c.ids.map((id) => `<div class="ch-row"><i style="background:${CH.COLORS[id]}"></i><label for="ch-${id}">${esc(CH.NAMES[id])}</label><input type="range" id="ch-${id}" min="0" max="100" step="5" value="${S.alloc[id] || 0}" data-ch-id="${id}"><b data-ch-pct="${id}">${S.alloc[id] || 0} %</b></div>`).join('')}
              <div class="ch-row cash"><i></i><label>Cash</label><div class="ch-cashbar"><u id="ch-cashbar"></u></div><b id="ch-cash">100 %</b></div></div>
            <div class="acts ch-presets"><span class="fine">Répartitions rapides :</span><button class="btn sm" type="button" data-ch-preset="cash">Tout en cash</button><button class="btn sm" type="button" data-ch-preset="prudent">Prudent</button><button class="btn sm" type="button" data-ch-preset="equilibre">Équilibré 60/40</button><button class="btn sm" type="button" data-ch-preset="offensif">Offensif</button><button class="btn sm" type="button" data-ch-preset="garder">Garder</button></div>
            <div class="acts"><button class="btn primary big" type="button" data-ch="confirm">Valider cette répartition ▶</button></div>
            <p class="fine">Le solde non investi reste en cash, sans rendement. Changer ta répartition coûte 0,1 % des montants déplacés.</p></div></section></div>`;
    },
    result() {
      const c = S.c, st = c.steps[S.i], D = dates(), d0 = CH.dayOf(D[S.i]), d1 = CH.dayOf(D[S.i + 1]), r = S.last, j = S.journal[S.journal.length - 1];
      const ser = assetSeries(c.ids, d0 - CH.PRE, d1);
      const last = S.i + 1 >= c.steps.length;
      return `<div class="mt-bar pm-bar"><b class="pm-title">${esc(c.title)} · résultat ${S.i + 1} sur ${c.steps.length}</b><span class="sp"></span><span class="fd-top">${money(r.after)}</span></div>
        <div class="cp-level">
          <section class="mt-win"><header class="mt-wh"><b>Ce qui s’est passé</b><span class="mt-wsub">${esc(fmtLong(D[S.i]))} → ${esc(fmtLong(D[S.i + 1]))}</span></header><div class="mt-wb pm-pad">
            <p class="cp-quote">${esc(st.after)}</p>
            <div class="ch-chart">${plot(ser, d0 - CH.PRE, d1, d0)}${legend(c.ids)}</div></div></section>
          <section class="mt-win"><header class="mt-wh"><b>Résultat de la période</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>
            <tr><td><b>Ton portefeuille</b><br><span class="dim">${esc(allocText(j.target))}</span></td><td class="r ${cls(r.ret)}"><b>${pct(r.ret)}</b><br><span class="dim">${money(r.before)} → ${money(r.after)}</span></td></tr>
            <tr><td>Portefeuille 60/40 passif</td><td class="r ${cls(r.benchRet)}">${pct(r.benchRet)}</td></tr>
            ${c.ids.map((id) => `<tr><td><i class="ch-dot" style="background:${CH.COLORS[id]}"></i>${esc(CH.NAMES[id])}</td><td class="r ${cls(r.assetRet[id])}">${pct(r.assetRet[id])}</td></tr>`).join('')}
            ${r.fee > 0.5 ? `<tr><td>Frais d’exécution</td><td class="r neg">−${money(r.fee)}</td></tr>` : ''}</tbody></table></div></section>
          <section class="mt-win"><header class="mt-wh"><b>À retenir</b></header><div class="mt-wb pm-pad"><p>${esc(st.lesson)}</p>
            <div class="acts"><button class="btn primary big" type="button" data-ch="next">${last ? 'Voir le bilan' : 'Décision suivante'} ▶</button></div></div></section></div>`;
    },
    final() {
      const c = S.c, f = S.fin, G = S.G;
      const d0 = G.path[0].d, d1 = G.path[G.path.length - 1].d;
      const rebase = (key) => G.path.map((p) => [p.d, (p[key] / CH.CAPITAL) * 100]);
      const ser = [{ id: 'you', color: '#2563eb', w: 2.4, pts: rebase('v') }, { id: 'bench', color: '#94a3b8', w: 2, pts: rebase('b') }];
      const bar = (n, max, label) => `<div class="ch-part"><span>${label}</span><div class="ch-pbar"><i style="width:${(n / max) * 100}%"></i></div><b>${n} / ${max}</b></div>`;
      const msg = f.timid ? 'Tu es resté presque entièrement en cash : sans risque pris, la note est plafonnée. Le cash protège, mais il ne fait pas fructifier le capital.'
        : f.score >= 80 ? 'Excellent parcours : tu as battu le portefeuille passif en maîtrisant le risque.'
        : f.score >= 65 ? 'Bon parcours, au niveau d’un portefeuille 60/40 passif. Cherche où tu peux faire mieux.'
        : f.score >= 50 ? 'Parcours correct, mais le portefeuille passif a fait mieux ou subi moins de risque.'
        : 'Parcours difficile : relis les leçons de chaque étape et rejoue la chronique avec ce que tu sais maintenant.';
      return `<div class="mt-bar pm-bar"><b class="pm-title">Bilan · ${esc(c.title)}</b><span class="sp"></span><button class="btn" type="button" data-ch="replay">Rejouer</button><button class="btn primary" type="button" data-ch="list">Chroniques</button></div>
        <div class="pm-report">
          <section class="mt-win pm-grade"><header class="mt-wh"><b>Note</b></header><div class="mt-wb pm-pad"><div class="pm-big ${f.score >= 50 ? 'pos' : 'neg'}">${f.grade}</div><p class="pm-score">${f.score} sur 100</p><p class="hint">${esc(msg)}</p></div></section>
          <section class="mt-win pm-res"><header class="mt-wh"><b>Face au portefeuille 60/40 passif</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th></th><th class="r">Toi</th><th class="r">60/40 passif</th></tr></thead><tbody>
            <tr><td>Rendement total</td><td class="r ${cls(f.ret)}">${pct(f.ret)}</td><td class="r ${cls(f.bRet)}">${pct(f.bRet)}</td></tr>
            <tr><td>Valeur finale</td><td class="r">${money(G.value)}</td><td class="r">${money(G.bench.value)}</td></tr>
            <tr><td>Perte maximale (clôtures)</td><td class="r neg">${pct(f.dd)}</td><td class="r neg">${pct(f.bDD)}</td></tr>
            <tr><td>Frais d’exécution</td><td class="r">${money(G.fees)}</td><td class="r">—</td></tr></tbody></table></div></section>
          <section class="mt-win pm-notes"><header class="mt-wh"><b>Courbe de ton capital</b><span class="mt-wsub">base 100</span></header><div class="mt-wb pm-pad ch-chart">${plot(ser, d0, d1, null)}<div class="ch-legend"><span><i style="background:#2563eb"></i>Toi</span><span><i style="background:#94a3b8"></i>60/40 passif</span></div></div></section>
          <section class="mt-win pm-notes"><header class="mt-wh"><b>Détail de la note</b></header><div class="mt-wb pm-pad">${bar(f.parts.perf, 45, 'Performance relative')}${bar(f.parts.risk, 30, 'Maîtrise du risque')}${bar(f.parts.abs, 10, 'Résultat absolu')}${bar(f.parts.disc, 15, 'Discipline')}
            ${f.conc ? `<p class="fine">Concentration : ${f.conc} étape${f.conc > 1 ? 's' : ''} avec plus de 70 % sur un seul placement hors indice large.</p>` : ''}</div></section>
          <section class="mt-win pm-notes"><header class="mt-wh"><b>Journal de tes décisions</b></header><div class="mt-wb"><table class="mt-tbl"><tbody>${S.journal.map((j) => `<tr><td><b>${esc(S.c.steps[j.i].head)}</b><br><span class="dim">${esc(allocText(j.target))}</span></td><td class="r ${cls(j.ret)}">${pct(j.ret)}</td></tr>`).join('')}</tbody></table></div></section>
        </div>`;
    },
  };

  function render() {
    const root = $('#screen-chron');
    if (!root) return;
    root.innerHTML = html[S.view]();
    root.scrollTop = 0;
    if (S.view === 'step') paintAlloc();
    renderCard();
  }
  function renderCard() {
    const box = $('#chron-card');
    if (!box) return;
    const done = DATA().filter((c) => P.best[c.id]).length;
    box.innerHTML = `<h2>Chroniques historiques <span class="tag soon">${DATA().length} épisodes</span></h2>
      <p class="hint">Krach, pandémie, inflation, faillites : prends des décisions de portefeuille à de vraies dates et compare-toi à un 60/40 passif. ${done ? done + ' sur ' + DATA().length + ' terminée' + (done > 1 ? 's' : '') + '.' : ''}</p>
      <div class="acts"><button class="btn primary" type="button" data-ch="open">${done ? 'Continuer' : 'Commencer'}</button></div>`;
  }
  CH.doneCount = () => Object.keys(P.best).length;
  CH.open = () => { S.view = 'home'; APP().show('chron'); render(); };

  // allocation : met à jour les étiquettes sans redessiner la page
  const sumAlloc = () => S.c.ids.reduce((a, id) => a + (S.alloc[id] || 0), 0);
  function paintAlloc() {
    for (const id of S.c.ids) {
      const i = $('#ch-' + id), b = document.querySelector(`[data-ch-pct="${id}"]`);
      if (i) i.value = S.alloc[id] || 0;
      if (b) b.textContent = (S.alloc[id] || 0) + ' %';
    }
    const cash = 100 - sumAlloc();
    const cb = $('#ch-cash'), bar = $('#ch-cashbar');
    if (cb) cb.textContent = cash + ' %';
    if (bar) bar.style.width = cash + '%';
  }
  function preset(name) {
    const ids = S.c.ids, a = {};
    const eq = ids.filter((id) => id !== 'TLT' && id !== 'GLD');
    ids.forEach((id) => { a[id] = 0; });
    if (name === 'prudent') { a.TLT = 40; a.GLD = 20; if (ids.includes('SPY')) a.SPY = 20; }
    else if (name === 'equilibre') { a.SPY = 60; a.TLT = 40; }
    else if (name === 'offensif') { const each = Math.floor(100 / eq.length / 5) * 5; eq.forEach((id) => { a[id] = each; }); }
    else if (name === 'garder') ids.forEach((id) => { a[id] = Math.round(((S.G.w[id] || 0) * 100) / 5) * 5; });
    S.alloc = a;
    paintAlloc();
  }

  async function begin() {
    if (S.busy) return;
    S.busy = true; S.err = ''; render();
    try {
      const need = [...new Set(S.c.ids.concat(['SPY', 'TLT']))];
      const world = {};
      for (const id of need) world[id] = await loadAsset(id);
      S.world = world;
      S.G = CH.start(); S.i = 0; S.journal = []; S.alloc = {}; S.last = null; S.fin = null;
      S.view = 'step';
    } catch (e) { S.err = 'Impossible de charger les cotes : ' + e.message; }
    S.busy = false;
    render();
  }
  function confirm() {
    const D = dates(), target = {};
    for (const id of S.c.ids) target[id] = (S.alloc[id] || 0) / 100;
    try {
      const r = CH.advance(S.world, S.c.ids, S.G, CH.dayOf(D[S.i]), CH.dayOf(D[S.i + 1]), target);
      S.last = r;
      S.journal.push({ i: S.i, date: D[S.i], target, ret: r.ret, benchRet: r.benchRet, fee: r.fee });
      S.view = 'result';
    } catch (e) { S.err = e.message; }
    render();
  }
  function next() {
    if (S.i + 1 < S.c.steps.length) {
      S.i++;
      S.alloc = {};
      S.c.ids.forEach((id) => { S.alloc[id] = Math.round(((S.G.w[id] || 0) * 100) / 5) * 5; });
      if (sumAlloc() > 100) S.alloc = {};
      S.view = 'step';
    } else {
      S.fin = CH.grade(S.G, S.journal);
      const prev = P.best[S.c.id];
      if (!prev || S.fin.score > prev.score) P.best[S.c.id] = { score: S.fin.score, grade: S.fin.grade, ret: S.fin.ret };
      save();
      try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'chron', id: S.c.id, grade: S.fin.grade, score: S.fin.score, ret: S.fin.ret, beat: S.fin.ret > S.fin.bRet, doneCount: Object.keys(P.best).length, total: DATA().length, code: 'chron-' + S.c.id } })); } catch (e) { /* rien */ }
      S.view = 'final';
    }
    render();
  }

  document.addEventListener('input', (e) => {
    const r = e.target.closest && e.target.closest('[data-ch-id]');
    if (!r || S.view !== 'step') return;
    const id = r.dataset.chId, others = sumAlloc() - (S.alloc[id] || 0);
    S.alloc[id] = Math.min(+r.value, 100 - others);
    paintAlloc();
  });
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-ch-open]');
    if (o) { S.c = DATA().find((c) => c.id === o.dataset.chOpen); if (S.c) { S.view = 'intro'; S.err = ''; render(); } return; }
    const p = e.target.closest('[data-ch-preset]');
    if (p) { preset(p.dataset.chPreset); return; }
    const b = e.target.closest('[data-ch]');
    if (!b) return;
    const k = b.dataset.ch;
    if (k === 'open') CH.open();
    else if (k === 'list') { S.view = 'home'; render(); }
    else if (k === 'home') { renderCard(); APP().show('home'); }
    else if (k === 'begin') begin();
    else if (k === 'confirm') confirm();
    else if (k === 'next') next();
    else if (k === 'replay') { S.view = 'intro'; render(); }
  });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
