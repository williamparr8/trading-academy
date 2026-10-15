/* Trading Academy — missions de partie : trois objectifs tirés du code de la partie, vérifiés à la fin.
   Ils orientent l'attention (discipline, taille des pertes, patience) sans changer les règles du jeu. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const MS = (TA.MISSIONS = {});
  const stats = (c) => {
    const t = c.trades || [], w = t.filter((x) => x.net > 0), l = t.filter((x) => x.net <= 0);
    const avgW = w.length ? w.reduce((s, x) => s + x.net, 0) / w.length : 0, avgL = l.length ? -l.reduce((s, x) => s + x.net, 0) / l.length : 0;
    return { n: t.length, wins: w.length, avgW, avgL };
  };
  MS.ALL = [
    { id: 'dd8', text: 'Garder une perte maximale de moins de 8 %', test: (c) => c.sum.trades > 0 && c.sum.maxDD > -0.08 },
    { id: 'three', text: 'Faire au moins 3 transactions', test: (c) => (c.trades || []).length >= 3 },
    { id: 'rr', text: 'Gain moyen au moins 1,5 fois la perte moyenne', test: (c) => { const s = stats(c); return s.n >= 2 && s.wins > 0 && (s.avgL === 0 || s.avgW >= 1.5 * s.avgL); } },
    { id: 'short', text: 'Conclure une vente à découvert gagnante', test: (c) => (c.trades || []).some((t) => t.dir === -1 && t.net > 0) },
    { id: 'cap2r', text: 'Aucune perte de plus de 2 R', test: (c) => (c.trades || []).length > 0 && c.trades.every((t) => t.r == null || t.r >= -2) },
    { id: 'beat', text: 'Faire mieux que l’acheter-conserver', test: (c) => c.sum.retPct > c.sum.bh },
    { id: 'patience', text: 'Garder une position au moins 10 barres', test: (c) => (c.trades || []).some((t) => t.closeIdx - t.openIdx >= 10) },
    { id: 'half', text: 'Au moins la moitié des transactions gagnantes', test: (c) => { const s = stats(c); return s.n >= 2 && s.wins / s.n >= 0.5; } },
    { id: 'green', text: 'Terminer en gain', test: (c) => c.sum.retPct > 0 },
    { id: 'calm', text: 'Au plus une transaction par 10 barres', test: (c) => (c.trades || []).length > 0 && c.trades.length <= Math.max(1, (c.bars || 0) / 10) },
  ];
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // trois missions distinctes, toujours les mêmes pour un même code
  MS.pick = function (seed) {
    let h = hash('MS|' + seed);
    const idx = [];
    let guard = 0;
    while (idx.length < 3 && guard++ < 200) { const i = h % MS.ALL.length; if (!idx.includes(i)) idx.push(i); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0; if (h === 0) h = 7; }
    for (let i = 0; idx.length < 3; i++) if (!idx.includes(i)) idx.push(i);   // filet de sécurité : toujours trois missions
    return idx.map((i) => MS.ALL[i]);
  };
  MS.evaluate = (list, ctx) => list.map((m) => { let ok = false; try { ok = !!m.test(ctx); } catch (e) { ok = false; } return { id: m.id, text: m.text, ok }; });
  MS.endHTML = function (list, ctx) {
    const r = MS.evaluate(list, ctx), n = r.filter((x) => x.ok).length;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<section class="card"><h2>Missions de la partie · ${n} sur ${r.length}</h2><ul class="crit">${r.map((x) => `<li class="${x.ok ? 'fait' : 'afaire'}"><span class="icone">${x.ok ? '✓' : '✗'}</span><span>${esc(x.text)}</span></li>`).join('')}</ul><p class="fine">Chaque mission réussie rapporte des points d’expérience.</p></section>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
