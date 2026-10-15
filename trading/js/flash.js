/* Trading Academy — Flash technique : 15 décisions rapides sur de vrais graphiques cachés.
   Chaque tour : un graphique de 70 barres, trois choix (acheter, vendre à découvert, passer). Stop à 1,5 ATR, objectif à 2 R,
   horizon de 20 barres. Résultat en multiples de R, puis statistiques par contexte (tendance, RSI, cassure) pour voir
   où ton « avantage » existe vraiment. Logique pure dans TA.FLASH, écran et carte d'accueil dans le même fichier. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const FL = (TA.FLASH = {});
  const ROUNDS = 15, SHOW = 70, HOR = 20, MIN = 80;
  FL.ROUNDS = ROUNDS; FL.SHOW = SHOW; FL.HOR = HOR;

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  FL.rng = (seed) => mulberry(hash('FL|' + seed));

  const sma = (c, i, n) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += c[j]; return s / n; };
  FL.atr = (h, l, c, i, n = 14) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])); return s / n; };
  FL.rsi = (c, i, n = 14) => { let up = 0, dn = 0; for (let j = i - n + 1; j <= i; j++) { const d = c[j] - c[j - 1]; if (d > 0) up += d; else dn -= d; } return dn === 0 ? 100 : 100 - 100 / (1 + up / dn); };

  // contexte lisible à la barre i : sert aux statistiques de fin de séance
  FL.context = function (d, i) {
    const c = d.c, s20 = sma(c, i, 20), s50 = sma(c, i, 50), r = FL.rsi(c, i);
    let hi = -Infinity, lo = Infinity;
    for (let j = i - 20; j < i; j++) { hi = Math.max(hi, d.h[j]); lo = Math.min(lo, d.l[j]); }
    return {
      trend: c[i] > s50 && s20 > s50 ? 'haussière' : c[i] < s50 && s20 < s50 ? 'baissière' : 'neutre',
      rsi: r > 70 ? 'surachat' : r < 30 ? 'survente' : 'médian',
      breakout: c[i] > hi ? 'cassure haussière' : c[i] < lo ? 'cassure baissière' : 'aucune',
      rsiVal: r,
    };
  };

  // issue d'une position prise à la clôture de la barre i
  FL.outcome = function (d, i, dir, rr = 2) {
    const entry = d.c[i], risk = 1.5 * FL.atr(d.h, d.l, d.c, i);
    const stop = entry - dir * risk, target = entry + dir * rr * risk;
    for (let j = i + 1; j <= i + HOR && j < d.c.length; j++) {
      if (dir === 1) {
        if (d.o[j] <= stop) return { r: (d.o[j] - entry) / risk, exit: 'stop', bars: j - i, px: d.o[j], stop, target, risk, entry };
        if (d.l[j] <= stop) return { r: -1, exit: 'stop', bars: j - i, px: stop, stop, target, risk, entry };
        if (d.h[j] >= target) return { r: rr, exit: 'objectif', bars: j - i, px: target, stop, target, risk, entry };
      } else {
        if (d.o[j] >= stop) return { r: (entry - d.o[j]) / risk, exit: 'stop', bars: j - i, px: d.o[j], stop, target, risk, entry };
        if (d.h[j] >= stop) return { r: -1, exit: 'stop', bars: j - i, px: stop, stop, target, risk, entry };
        if (d.l[j] <= target) return { r: rr, exit: 'objectif', bars: j - i, px: target, stop, target, risk, entry };
      }
    }
    const j = Math.min(i + HOR, d.c.length - 1);
    return { r: (dir * (d.c[j] - entry)) / risk, exit: 'horizon', bars: j - i, px: d.c[j], stop, target, risk, entry };
  };

  // choisit un tour : actif, barre de décision (au moins 80 barres d'historique, 20 barres de futur)
  FL.pick = function (rng, assets) {
    const a = assets[Math.floor(rng() * assets.length)];
    return { asset: a, frac: rng() };
  };
  FL.indexFor = (n, frac) => MIN + Math.floor(frac * (n - MIN - HOR - 1));

  FL.summary = function (rounds) {
    const taken = rounds.filter((r) => r.dir !== 0), by = {};
    const add = (key, r) => { (by[key] = by[key] || { n: 0, sum: 0, wins: 0 }); by[key].n++; by[key].sum += r.r; if (r.r > 0) by[key].wins++; };
    for (const r of taken) {
      add('dir:' + (r.dir === 1 ? 'achat' : 'vente'), r);
      add('trend:' + r.ctx.trend + ':' + (r.dir === 1 ? 'achat' : 'vente'), r);
      add('rsi:' + r.ctx.rsi + ':' + (r.dir === 1 ? 'achat' : 'vente'), r);
      if (r.ctx.breakout !== 'aucune') add('breakout:' + r.ctx.breakout + ':' + (r.dir === 1 ? 'achat' : 'vente'), r);
    }
    const total = taken.reduce((s, r) => s + r.r, 0), wins = taken.filter((r) => r.r > 0).length;
    const best = rounds.map((r) => Math.max(r.alt.long.r, r.alt.short.r, 0));
    return { n: rounds.length, taken: taken.length, passes: rounds.length - taken.length, total, wins, win: taken.length ? wins / taken.length : null,
      exp: taken.length ? total / taken.length : null, by, regret: best.reduce((s, x) => s + x, 0) - total };
  };
  FL.notes = function (sm) {
    const out = [], fmt = (x) => x.toFixed(2).replace('.', ',');
    for (const [k, v] of Object.entries(sm.by)) {
      if (v.n < 2) continue;
      const [kind, ctx, dir] = k.split(':');
      if (kind === 'dir') continue;
      const avg = v.sum / v.n;
      const lab = kind === 'trend' ? `en tendance ${ctx}` : kind === 'rsi' ? `avec un RSI en ${ctx}` : `sur une ${ctx}`;
      if (avg <= -0.5) out.push({ kind: 'warn', text: `Tu as fait ${v.n} ${dir}s ${lab} : ${fmt(avg)} R en moyenne. Ce contexte te coûte : évite-le ou exige une meilleure raison.` });
      else if (avg >= 0.5) out.push({ kind: 'good', text: `${v.n} ${dir}s ${lab} : +${fmt(avg)} R en moyenne. Voilà un avantage à répéter.` });
    }
    if (sm.taken && sm.passes === 0) out.push({ kind: 'info', text: 'Tu as pris toutes les occasions. Passer est une décision : sans avantage visible, ne rien faire protège le capital.' });
    if (sm.exp != null) out.push({ kind: sm.exp > 0 ? 'good' : 'warn', text: `Espérance : ${sm.exp > 0 ? '+' : ''}${fmt(sm.exp)} R par transaction avec ${Math.round(sm.win * 100)} % de réussite. Avec un objectif à 2 R, il suffit de gagner 34 % du temps pour être rentable avant les frais.` });
    return out;
  };

  /* ---------- écran ---------- */
  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (x) => x.toFixed(2).replace('.', ',');
  const sr = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2).replace('.', ',') + ' R';
  const cls = (x) => (x > 0.005 ? 'pos' : x < -0.005 ? 'neg' : '');
  const S = { rounds: [], r: 0, cur: null, rng: null, code: '', phase: 'idle', index: null, cache: new Map(), busy: false, msg: '' };
  const HKEY = 'ta:flashhist';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } } };
  const APP = () => window.TA_APP;
  const newCode = () => 'FL-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  async function load(id) {
    if (S.cache.has(id)) return S.cache.get(id);
    const r = await fetch(`data/${id}.json`);
    if (!r.ok) throw new Error('Cotes indisponibles');
    const d = await r.json();
    if (S.cache.size >= 4) S.cache.delete(S.cache.keys().next().value);
    S.cache.set(id, d);
    return d;
  }
  async function newRound() {
    if (!S.index) { const r = await fetch('data/index.json'); S.index = (await r.json()).assets.filter((a) => (a.mk || 'stock') !== 'crypto' || a.n > 600); }
    const p = FL.pick(S.rng, S.index), d = await load(p.asset.id);
    const i = FL.indexFor(d.c.length, p.frac), ctx = FL.context(d, i);
    S.cur = { id: p.asset.id, d, i, ctx, alt: { long: FL.outcome(d, i, 1), short: FL.outcome(d, i, -1) } };
    S.phase = 'choose';
  }
  async function start(code) {
    if (S.busy) return;
    S.busy = true;
    try {
      S.code = code || newCode(); S.rng = FL.rng(S.code); S.rounds = []; S.r = 0; S.msg = '';
      await newRound();
      APP().show('flash'); render();
    } catch (e) { const el = $('#fl-err'); if (el) el.textContent = 'Impossible de lancer : ' + e.message; }
    S.busy = false;
  }
  function chart(d, i, upto, outc) {
    const W = 760, H = 330, from = i - SHOW + 1, last = Math.min(upto, d.c.length - 1), n = last - from + 1, padR = 46;
    const vol = d.v && d.v.some((x) => x > 0);
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (let j = from; j <= last; j++) { lo = Math.min(lo, d.l[j]); hi = Math.max(hi, d.h[j]); vmax = Math.max(vmax, d.v ? d.v[j] : 0); }
    if (outc) { lo = Math.min(lo, outc.stop, outc.target); hi = Math.max(hi, outc.stop, outc.target); }
    const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    const ph = vol ? H * 0.78 : H - 8, Y = (v) => 4 + ((hi - v) / (hi - lo)) * (ph - 8), bw = (W - padR) / (SHOW + HOR);
    const X = (j) => 4 + (j - from) * bw + bw / 2;
    let s = '';
    for (let j = from; j <= last; j++) {
      const up = d.c[j] >= d.o[j], col = j > i ? (up ? '#ffffff' : '#9aa0a6') : (up ? '#1fb36b' : '#f23d4a'), x = X(j);
      s += `<line x1="${x}" x2="${x}" y1="${Y(d.h[j])}" y2="${Y(d.l[j])}" stroke="${col}"/><rect x="${x - bw * 0.35}" y="${Math.min(Y(d.o[j]), Y(d.c[j]))}" width="${bw * 0.7}" height="${Math.max(1, Math.abs(Y(d.o[j]) - Y(d.c[j])))}" fill="${col}"/>`;
      if (vol && d.v[j] > 0) s += `<rect x="${x - bw * 0.35}" y="${H - (d.v[j] / vmax) * (H * 0.2)}" width="${bw * 0.7}" height="${(d.v[j] / vmax) * (H * 0.2)}" fill="#3a5f8f"/>`;
    }
    const line = (n2, col) => { let p = ''; for (let j = Math.max(from, i - SHOW + n2); j <= Math.min(last, i); j++) p += `${X(j).toFixed(1)},${Y(sma(d.c, j, n2)).toFixed(1)} `; return `<polyline points="${p}" fill="none" stroke="${col}" stroke-width="1.4"/>`; };
    s += line(20, '#f0b34a') + line(50, '#4f9dff');
    const hl = (v, col, t) => `<line x1="0" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="${col}" stroke-dasharray="4 3"/><text x="${W - 4}" y="${Y(v) + 4}" text-anchor="end" fill="${col}">${t}</text>`;
    s += `<line x1="${X(i)}" x2="${X(i)}" y1="0" y2="${H}" stroke="#555" stroke-dasharray="2 3"/>`;
    if (outc) s += hl(outc.entry, '#bbb', 'entrée') + hl(outc.stop, '#f23d4a', 'stop') + hl(outc.target, '#1fb36b', 'objectif');
    return `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graphique à deviner">${s}</svg>`;
  }

  function render() {
    const root = $('#screen-flash');
    if (!root) return;
    if (S.phase === 'done') { renderSummary(root); return; }
    const { cur, rounds } = S, d = cur.d, rev = S.phase === 'reveal', last = rounds[rounds.length - 1];
    const o = rev && last ? (last.dir === 1 ? cur.alt.long : cur.alt.short) : null;
    const upto = rev ? cur.i + (o ? o.bars : HOR) : cur.i;
    const total = rounds.reduce((s, r) => s + r.r, 0);
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Flash technique · tour ${Math.min(S.r + 1, ROUNDS)} sur ${ROUNDS}</b><span class="sp"></span>
        <span class="fd-top">Total <b class="${cls(total)}">${sr(total)}</b> · série <b>${streak()}</b></span><span class="mt-sep"></span>
        <button class="btn ghost" type="button" data-fl="quit">Quitter</button></div>
      <div class="pm-grid fl-grid"><section class="pm-center"><div class="mt-win"><header class="mt-wh"><b>${rev ? esc(cur.id) + ' · ' + esc(cur.d.s || cur.id) : 'Actif caché'}</b><span class="mt-wsub"><i class="lg b"></i>MM 20 <i class="lg p"></i>MM 50 · barres vertes/rouges = passé, blanches = futur</span></header>
          <div class="pm-chart">${chart(d, cur.i, upto, rev && o ? o : null)}</div>
          <div class="fl-ctx"><span>Contexte</span> <b>tendance ${esc(cur.ctx.trend)}</b> · <b>RSI ${Math.round(cur.ctx.rsiVal)}</b>${cur.ctx.breakout !== 'aucune' ? ' · <b>' + esc(cur.ctx.breakout) + '</b>' : ''}</div></div></section>
        <aside class="mt-win pm-right"><header class="mt-wh"><b>Ta décision</b></header><div class="mt-wb pm-pad">
          ${rev && last ? `<div class="fl-res ${cls(last.r)}"><b>${sr(last.r)}</b><p>${last.dir === 0 ? 'Tu es passé.' : (last.dir === 1 ? 'Achat' : 'Vente à découvert') + ' : sortie par ' + last.exit + ' après ' + last.bars + ' barres.'}</p></div>
            <p class="hint">Si tu avais acheté : <b>${sr(cur.alt.long.r)}</b> · vendu à découvert : <b>${sr(cur.alt.short.r)}</b></p>
            <p class="hint">${last.dir === 0 ? (Math.max(cur.alt.long.r, cur.alt.short.r) < 0.5 ? 'Bonne décision : aucune des deux directions ne payait.' : 'Une occasion était là.') : last.r > 0 ? 'Bien joué.' : 'Perte contrôlée : le stop a fait son travail.'}</p>
            <button class="btn primary big" type="button" data-fl="next">${S.r + 1 >= ROUNDS ? 'Voir le bilan' : 'Tour suivant'} ▶</button>`
          : `<p class="hint">Stop à 1,5 ATR, objectif à 2 R, 20 barres au maximum. Lis le graphique : tendance, RSI, cassure.</p>
            <div class="fl-btns"><button class="btn buy big" type="button" data-fl="long">Acheter</button><button class="btn sell big" type="button" data-fl="short">Vendre à découvert</button><button class="btn ghost big" type="button" data-fl="pass">Passer</button></div>`}
          <p class="err">${esc(S.msg)}</p><p class="fine">Code ${esc(S.code)} : le même code redonne les mêmes graphiques.</p>
        </div></aside></div>`;
  }
  const streak = () => { let n = 0; for (let k = S.rounds.length - 1; k >= 0 && S.rounds[k].r >= 0 && (S.rounds[k].dir === 0 || S.rounds[k].r > 0); k--) n++; return n; };

  function decide(dir) {
    const c = S.cur, o = dir === 0 ? { r: 0, exit: 'passé', bars: 0 } : FL.outcome(c.d, c.i, dir);
    S.rounds.push({ id: c.id, dir, r: o.r, exit: o.exit, bars: o.bars, ctx: c.ctx, alt: c.alt });
    S.phase = 'reveal'; render();
  }
  async function next() {
    S.r++;
    if (S.r >= ROUNDS) { finish(); return; }
    try { await newRound(); S.msg = ''; render(); } catch (e) { S.msg = 'Cotes indisponibles : ' + e.message; render(); }
  }
  function finish() {
    S.phase = 'done';
    const sm = FL.summary(S.rounds), h = store.get(HKEY) || [];
    h.unshift({ code: S.code, total: sm.total, win: sm.win }); store.set(HKEY, h.slice(0, 8));
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'flash', total: sm.total, taken: sm.taken, wins: sm.wins, code: S.code } })); } catch (e) { /* rien */ }
    render(); renderCard();
  }
  function renderSummary(root) {
    const sm = FL.summary(S.rounds), notes = FL.notes(sm);
    const tbl = Object.entries(sm.by).filter(([k]) => !k.startsWith('dir:')).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([k, v]) => { const [kind, ctx, dir] = k.split(':'); return `<tr><td>${esc(({ trend: 'Tendance ', rsi: 'RSI ', breakout: '' }[kind] || '') + ctx)}</td><td>${esc(dir)}</td><td class="r">${v.n}</td><td class="r">${Math.round((v.wins / v.n) * 100)} %</td><td class="r ${cls(v.sum / v.n)}">${sr(v.sum / v.n)}</td></tr>`; }).join('');
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Bilan du Flash technique · code ${esc(S.code)}</b><span class="sp"></span><button class="btn" type="button" data-fl="replay">Rejouer ces graphiques</button><button class="btn primary" type="button" data-fl="quit">Terminer</button></div>
      <div class="pm-report"><section class="mt-win pm-grade"><header class="mt-wh"><b>Résultat</b></header><div class="mt-wb pm-pad">
          <div class="pm-big ${cls(sm.total)}">${sr(sm.total)}</div>
          <p class="hint">${sm.taken} transactions, ${sm.passes} passes · réussite ${sm.win == null ? '—' : Math.round(sm.win * 100) + ' %'} · espérance ${sm.exp == null ? '—' : sr(sm.exp)}</p>
          <p class="hint">Meilleur résultat possible avec le recul : ${sr(sm.total + sm.regret)}</p></div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Où est ton avantage ?</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th>Contexte</th><th>Sens</th><th class="r">Fois</th><th class="r">Réussite</th><th class="r">Moyenne</th></tr></thead><tbody>${tbl || '<tr><td colspan="5">Trop peu de transactions pour des statistiques.</td></tr>'}</tbody></table></div></section>
        <section class="mt-win pm-notes"><header class="mt-wh"><b>Commentaires du coach</b></header><div class="mt-wb pm-pad">${notes.map((n) => `<div class="fd ${n.kind === 'good' ? 'good' : n.kind === 'warn' ? 'warn' : ''}"><i></i><p>${esc(n.text)}</p></div>`).join('') || '<p class="hint">Joue plus de tours pour voir tes tendances.</p>'}
          <p class="sub-t">Tes tours</p><table class="mt-tbl"><tbody>${S.rounds.map((r, k) => `<tr><td>${k + 1}</td><td>${esc(r.id)}</td><td>${r.dir === 1 ? 'achat' : r.dir === -1 ? 'vente' : 'passé'}</td><td class="r ${cls(r.r)}">${sr(r.r)}</td><td>${esc(r.exit)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }
  function renderCard() {
    const box = $('#flash-card');
    if (!box) return;
    const h = store.get(HKEY) || [];
    box.innerHTML = `<h2>Flash technique <span class="tag soon">nouveau</span></h2>
      <p class="hint">15 graphiques réels cachés, une décision chacun : acheter, vendre à découvert ou passer. Résultat en R, puis tes statistiques par tendance, RSI et cassure. Dix minutes pour savoir où est ton avantage.</p>
      <label class="field"><span>Code (facultatif)</span><input id="fl-code" maxlength="12" placeholder="FL-XXXX-XXXX" spellcheck="false" autocomplete="off"></label>
      <p class="err" id="fl-err" role="alert"></p>
      <button class="btn primary big" type="button" data-fl-home="start">Lancer 15 tours</button>
      ${h.length ? `<p class="sub">Dernières séances</p><div class="glist">${h.slice(0, 4).map((x) => `<div class="grow"><span class="mono">${esc(x.code)}</span><span class="mono ${cls(x.total)}">${sr(x.total)}</span><span class="mono">${x.win == null ? '—' : Math.round(x.win * 100) + ' %'}</span></div>`).join('')}</div>` : ''}`;
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-fl-home]');
    if (h) { start(($('#fl-code').value || '').trim().toUpperCase()); return; }
    const b = e.target.closest('[data-fl]');
    if (!b) return;
    const a = b.dataset.fl;
    if (a === 'long') decide(1); else if (a === 'short') decide(-1); else if (a === 'pass') decide(0);
    else if (a === 'next') next();
    else if (a === 'quit') { S.phase = 'idle'; renderCard(); APP().show('home'); }
    else if (a === 'replay') start(S.code);
  });
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
