/* Trading Academy — Atelier EPP : six dossiers de clients à analyser comme un gestionnaire (compétence CFA centrale).
   Pour chaque client : tolérance au risque globale (la plus faible de la capacité et de la volonté), contraintes
   qui ressortent, puis la politique d'allocation qui convient. Notes et explications à chaque dossier. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const IPS = (TA.IPS = {});

  IPS.RISK = [['faible', 'Faible'], ['moderee', 'Modérée'], ['elevee', 'Élevée']];
  IPS.CONS = [['horizon', 'Horizon de placement'], ['liquidite', 'Liquidité'], ['fiscalite', 'Fiscalité'], ['legal', 'Obligations légales ou réglementaires'], ['special', 'Circonstances particulières']];
  IPS.ALLOCS = [
    { id: 'A', name: 'Prudent', mix: '20 % actions · 60 % obligations · 20 % encaisse' },
    { id: 'B', name: 'Équilibré', mix: '45 % actions · 45 % obligations · 10 % encaisse' },
    { id: 'C', name: 'Croissance', mix: '70 % actions · 25 % obligations · 5 % encaisse' },
    { id: 'D', name: 'Agressif', mix: '95 % actions · 0 % obligations · 5 % encaisse' },
  ];
  IPS.CASES = [
    { id: 'marc', title: 'Marc, 28 ans, programmeur', facts: ['Revenu élevé et stable, aucune dette, fonds d’urgence de six mois.', 'Il épargne pour sa retraite, dans 35 ans.', 'Il dit que les baisses de marché « ne le dérangent pas » et qu’il n’a jamais vendu en panique.'],
      ability: 'élevée', willingness: 'élevée', risk: 'elevee', cons: ['horizon'], alloc: 'C',
      why: { risk: 'Capacité et volonté sont élevées : la tolérance globale est élevée.', cons: 'Seul l’horizon très long ressort : pas de besoin de liquidités, de contrainte fiscale ou légale particulière.', alloc: 'Une allocation de croissance (70 / 25 / 5) capte l’essentiel du potentiel. Le 95 % d’actions sans aucune obligation laisse peu de coussin pour un premier investisseur, même à 35 ans.' } },
    { id: 'helene', title: 'Hélène, 64 ans, retraite dans un an', facts: ['Pension prévue modeste, épargne de 400 000 $.', 'Elle devra puiser environ 20 000 $ par an dès la retraite.', 'Elle dit : « Je ne supporterais pas de voir mon compte perdre 20 %. »'],
      ability: 'moyenne', willingness: 'faible', risk: 'faible', cons: ['liquidite', 'horizon'], alloc: 'A',
      why: { risk: 'La volonté est faible (elle ne supporterait pas une perte de 20 %), la capacité moyenne : on retient la plus faible, donc faible.', cons: 'Des retraits annuels exigent de la liquidité, et l’horizon est mixte : court pour les retraits, long pour l’espérance de vie.', alloc: 'Une allocation prudente protège le capital et finance les retraits. L’équilibré expose à des pertes qu’elle a dit ne pas tolérer.' } },
    { id: 'fondation', title: 'Fondation Soleil, fonds de dotation', facts: ['Doit verser chaque année 3,5 % de ses actifs en bourses (règle de son statut).', 'Existence perpétuelle ; le conseil est prudent et veut éviter les années très négatives.', 'Politique : aucune entreprise du tabac ni des armes.'],
      ability: 'élevée', willingness: 'moyenne', risk: 'moderee', cons: ['legal', 'liquidite', 'special'], alloc: 'B',
      why: { risk: 'Capacité élevée (horizon perpétuel) mais volonté modérée : la tolérance globale est modérée.', cons: 'Distribution annuelle obligatoire (légal), besoin de liquidité pour les bourses, exclusions éthiques (circonstances particulières).', alloc: 'Un équilibré (45 / 45 / 10) soutient la distribution de 3,5 % plus l’inflation sans les pertes que le conseil veut éviter.' } },
    { id: 'jean', title: 'Jean, 45 ans, entrepreneur', facts: ['Revenu très irrégulier, hypothèque importante, deux enfants aux études.', '70 % de son patrimoine est dans sa propre entreprise.', 'Il se décrit comme « un amateur de risque » et voudrait tout placer en actions.'],
      ability: 'faible', willingness: 'élevée', risk: 'faible', cons: ['liquidite', 'special'], alloc: 'A',
      why: { risk: 'La volonté est élevée, mais la capacité est faible (revenu irrégulier, dettes, concentration) : on retient la plus faible, donc faible.', cons: 'Revenu irrégulier = besoin de liquidité ; forte concentration dans son entreprise = circonstance particulière.', alloc: 'Son patrimoine est déjà un pari risqué : le portefeuille financier doit être le coussin. Le profil prudent s’impose malgré son goût du risque.' } },
    { id: 'sophie', title: 'Sophie, 35 ans, médecin', facts: ['Revenu élevé, cotise au maximum à ses comptes enregistrés exonérés d’impôt.', 'Vise l’indépendance financière dans 25 ans.', 'Après la crise de 2008, elle est restée investie mais « a très mal dormi ».'],
      ability: 'élevée', willingness: 'moyenne', risk: 'moderee', cons: ['horizon', 'fiscalite'], alloc: 'B',
      why: { risk: 'Capacité élevée, volonté moyenne (inconfort réel en crise) : tolérance globale modérée.', cons: 'Horizon long et comptes enregistrés : la fiscalité guide le choix des comptes pour chaque type de revenu.', alloc: 'Équilibré : elle a la capacité de prendre du risque mais le tempérament d’une baisse supportable. Un portefeuille trop agressif risquerait de la faire vendre au pire moment.' } },
    { id: 'couple', title: 'Pierre et Lise, 55 ans', facts: ['Patrimoine de 500 000 $. Ils veulent acheter un chalet de 150 000 $ dans trois ans.', 'Le reste est pour la retraite, dans dix ans.', 'Ils acceptent des fluctuations modérées, sans plus.'],
      ability: 'moyenne', willingness: 'moyenne', risk: 'moderee', cons: ['liquidite', 'horizon'], alloc: 'B',
      why: { risk: 'Capacité et volonté sont moyennes : tolérance modérée.', cons: 'Un besoin précis dans trois ans (liquidité) et deux horizons différents (trois ans, dix ans).', alloc: 'Allocation équilibrée pour la partie retraite ; les 150 000 $ du chalet se placent en encaisse et obligations courtes, à l’abri des marchés.' } },
  ];

  // note d'un dossier : tolérance 40, contraintes 30 (jaccard), allocation 30
  IPS.grade = function (c, a) {
    const set = (x) => new Set(x || []), A = set(a.cons), B = set(c.cons);
    const inter = [...A].filter((x) => B.has(x)).length, uni = new Set([...A, ...B]).size;
    const jac = uni ? inter / uni : 1;
    const risk = a.risk === c.risk ? 40 : 0, cons = Math.round(30 * jac), alloc = a.alloc === c.alloc ? 30 : 0;
    return { risk, cons, alloc, total: risk + cons + alloc, jac };
  };

  /* ---------- écran ---------- */
  if (typeof document === 'undefined') return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const S = { i: 0, ans: [], cur: { risk: null, cons: [], alloc: null }, shown: false, res: [] };
  const HKEY = 'ta:ipshist';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } } };
  const APP = () => window.TA_APP;
  const lab = (arr, id) => (arr.find((x) => x[0] === id) || [id, id])[1];

  function start() { S.i = 0; S.res = []; S.cur = { risk: null, cons: [], alloc: null }; S.shown = false; APP().show('ips'); render(); }
  function render() {
    const root = $('#screen-ips');
    if (!root) return;
    if (S.i >= IPS.CASES.length) { renderEnd(root); return; }
    const c = IPS.CASES[S.i], r = S.shown ? IPS.grade(c, S.cur) : null;
    const mark = (ok) => (S.shown ? (ok ? ' <b class="pos">✓</b>' : ' <b class="neg">✗</b>') : '');
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Atelier EPP · dossier ${S.i + 1} sur ${IPS.CASES.length}</b><span class="sp"></span><button class="btn ghost" type="button" data-ips="quit">Quitter</button></div>
      <div class="pm-grid fl-grid"><section class="pm-center"><div class="mt-win"><header class="mt-wh"><b>${esc(c.title)}</b></header><div class="mt-wb pm-pad">
        <ul class="ips-facts">${c.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <p class="sub-t">1. Tolérance au risque globale${S.shown ? ` : ${esc(lab(IPS.RISK, c.risk))}${mark(S.cur.risk === c.risk)}` : ''}</p>
        <div class="seg">${IPS.RISK.map(([id, n]) => `<button type="button" data-ips-risk="${id}" class="${S.cur.risk === id ? 'on' : ''}"${S.shown ? ' disabled' : ''}>${n}</button>`).join('')}</div>
        <p class="sub-t">2. Contraintes qui ressortent (plusieurs possibles)${S.shown ? ` : ${esc(c.cons.map((x) => lab(IPS.CONS, x)).join(', '))}${mark(r.jac === 1)}` : ''}</p>
        <div class="ips-cons">${IPS.CONS.map(([id, n]) => `<label class="chk"><input type="checkbox" data-ips-con="${id}"${S.cur.cons.includes(id) ? ' checked' : ''}${S.shown ? ' disabled' : ''}> ${n}</label>`).join('')}</div>
        <p class="sub-t">3. Politique d’allocation${S.shown ? ` : ${esc(IPS.ALLOCS.find((a) => a.id === c.alloc).name)}${mark(S.cur.alloc === c.alloc)}` : ''}</p>
        <div class="ips-allocs">${IPS.ALLOCS.map((a) => `<button type="button" class="ex-opt${S.cur.alloc === a.id ? ' pick' : ''}" data-ips-alloc="${a.id}"${S.shown ? ' disabled' : ''}><b>${a.name}</b> · ${esc(a.mix)}</button>`).join('')}</div>
        ${S.shown ? `<div class="fd good"><i></i><div><b>Tolérance</b><p>${esc(c.why.risk)}</p></div></div><div class="fd good"><i></i><div><b>Contraintes</b><p>${esc(c.why.cons)}</p></div></div><div class="fd good"><i></i><div><b>Allocation</b><p>${esc(c.why.alloc)}</p></div></div>` : ''}
      </div></div></section>
      <aside class="mt-win pm-right"><header class="mt-wh"><b>Dossier</b></header><div class="mt-wb pm-pad">
        <dl class="kv pm-kv"><div><dt>Capacité de risque</dt><dd>${esc(S.shown ? c.ability : '?')}</dd></div><div><dt>Volonté de risque</dt><dd>${esc(S.shown ? c.willingness : '?')}</dd></div></dl>
        ${S.shown ? `<p class="pm-score">${r.total} sur 100</p><button class="btn primary big" type="button" data-ips="next">${S.i + 1 >= IPS.CASES.length ? 'Voir le bilan' : 'Dossier suivant'} ▶</button>`
          : `<button class="btn primary big" type="button" data-ips="check"${S.cur.risk && S.cur.alloc ? '' : ' disabled'}>Valider mes réponses</button><p class="fine">Choisis la tolérance et l’allocation (les contraintes peuvent être vides).</p>`}
      </div></aside></div>`;
  }
  function renderEnd(root) {
    const tot = Math.round(S.res.reduce((s, r) => s + r.total, 0) / S.res.length), grade = tot >= 85 ? 'A' : tot >= 70 ? 'B' : tot >= 55 ? 'C' : tot >= 40 ? 'D' : 'E';
    root.innerHTML = `
      <div class="mt-bar pm-bar"><b class="pm-title">Bilan de l’atelier EPP</b><span class="sp"></span><button class="btn" type="button" data-ips="replay">Recommencer</button><button class="btn primary" type="button" data-ips="quit">Terminer</button></div>
      <div class="pm-report"><section class="mt-win pm-grade"><header class="mt-wh"><b>Résultat</b></header><div class="mt-wb pm-pad"><div class="pm-big ${tot >= 70 ? 'pos' : 'neg'}">${grade}</div><p class="pm-score">${tot} sur 100</p></div></section>
        <section class="mt-win pm-res"><header class="mt-wh"><b>Par dossier</b></header><div class="mt-wb"><table class="mt-tbl"><thead><tr><th>Client</th><th class="r">Tolérance /40</th><th class="r">Contraintes /30</th><th class="r">Allocation /30</th><th class="r">Total</th></tr></thead><tbody>${IPS.CASES.map((c, i) => { const r = S.res[i]; return `<tr><td>${esc(c.title)}</td><td class="r">${r.risk}</td><td class="r">${r.cons}</td><td class="r">${r.alloc}</td><td class="r"><b>${r.total}</b></td></tr>`; }).join('')}</tbody></table></div></section></div>`;
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-ips-home]');
    if (h) { start(); return; }
    const rk = e.target.closest('[data-ips-risk]');
    if (rk && !S.shown) { S.cur.risk = rk.dataset.ipsRisk; render(); return; }
    const al = e.target.closest('[data-ips-alloc]');
    if (al && !S.shown) { S.cur.alloc = al.dataset.ipsAlloc; render(); return; }
    const b = e.target.closest('[data-ips]');
    if (!b) return;
    const k = b.dataset.ips;
    if (k === 'check') { S.shown = true; S.res[S.i] = IPS.grade(IPS.CASES[S.i], S.cur); render(); }
    else if (k === 'next') {
      S.i++; S.cur = { risk: null, cons: [], alloc: null }; S.shown = false;
      if (S.i >= IPS.CASES.length) finish(); else render();
    } else if (k === 'quit') { renderCard(); APP().show('home'); }
    else if (k === 'replay') start();
  });
  document.addEventListener('change', (e) => {
    const c = e.target.dataset && e.target.dataset.ipsCon;
    if (!c || S.shown) return;
    S.cur.cons = e.target.checked ? [...new Set([...S.cur.cons, c])] : S.cur.cons.filter((x) => x !== c);
  });
  function finish() {
    const tot = S.res.reduce((s, r) => s + r.total, 0) / S.res.length;
    const h = store.get(HKEY) || []; h.unshift({ score: Math.round(tot) }); store.set(HKEY, h.slice(0, 8));
    try { window.dispatchEvent(new CustomEvent('ta:xp', { detail: { kind: 'ips', score: tot } })); } catch (e) { /* rien */ }
    render(); renderCard();
  }
  function renderCard() {
    const box = $('#ips-card');
    if (!box) return;
    const h = store.get(HKEY) || [];
    box.innerHTML = `<h2>Atelier EPP <span class="tag soon">nouveau</span></h2>
      <p class="hint">Six dossiers de clients : tolérance au risque (capacité contre volonté), contraintes et politique d’allocation. L’exercice central d’un gestionnaire, expliqué à chaque dossier.</p>
      <button class="btn primary big" type="button" data-ips-home>Ouvrir les dossiers</button>
      ${h.length ? `<p class="sub">Derniers résultats</p><div class="glist">${h.slice(0, 3).map((x) => `<div class="grow"><span>Atelier</span><span class="mono ${x.score >= 70 ? 'pos' : 'neg'}">${x.score} / 100</span></div>`).join('')}</div>` : ''}`;
  }
  renderCard();
})(typeof window !== 'undefined' ? window : globalThis);
