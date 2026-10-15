/* Trading Academy — coach IA des modes Gestionnaire et Saison des résultats.
   Réutilise la capacité « poser une question à Claude » détectée par app.js (TA_APP.sample), disponible seulement dans
   la page privée sur claude.ai. Hors de cette page, rien n'est affiché et les coachs à règles restent seuls. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const AI = (TA.AI = {});
  const RULES = 'Règles : tutoie l’élève, appuie-toi uniquement sur les faits fournis (n’invente aucun chiffre ni événement), ne donne aucun conseil d’investissement réel, reste concret et bienveillant. Réponds en JSON strict de la forme {"bilan": string (3 phrases au plus), "forts": [string], "faibles": [string], "plan": [string]} avec au plus 3 éléments par liste, en français.';
  AI.ok = () => { const a = root.TA_APP; return !!(a && a.aiOK && a.sample && typeof a.sample.json === 'function'); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clean = (d) => {
    const arr = (x) => (Array.isArray(x) ? x.map((y) => String(y).trim().slice(0, 300)).filter(Boolean).slice(0, 4) : []);
    const out = { bilan: String((d && d.bilan) || '').trim().slice(0, 600), forts: arr(d && d.forts), faibles: arr(d && d.faibles), plan: arr(d && d.plan) };
    if (!out.bilan && !out.forts.length && !out.faibles.length && !out.plan.length) throw { code: 'invalid_json' };
    return out;
  };
  const errMsg = (e) => {
    const c = e && e.code;
    if (c === 'rate_limited') return 'Trop de demandes ou limite d’utilisation atteinte. Réessaie plus tard.';
    if (c === 'invalid_json' || c === 'empty_completion') return 'Le coach a répondu dans un format inattendu. Tu peux réessayer.';
    if (c === 'session_expired') return 'Reconnecte-toi à Claude, puis réessaie.';
    return 'Connexion interrompue. Tu peux réessayer.';
  };
  // kind : 'pm' ou 'fund' ; data : objet de faits anonymes
  AI.ask = async function (kind, data) {
    const who = kind === 'pm'
      ? 'Un élève (étudiant en gestion de commerce, futur gestionnaire de portefeuille) vient de terminer un mandat de gestion simulé dans un simulateur éducatif. Évalue sa gestion comme le ferait un analyste CFA : respect de l’énoncé de politique, risque pris, rendement relatif à l’indice de politique, coûts, jugement déontologique.'
      : 'Un élève (étudiant en gestion de commerce, futur analyste) vient de terminer une saison de résultats simulée sur huit sociétés FICTIVES. Évalue son analyse fondamentale : lecture des états financiers, prédictions, gestion du risque et réaction aux signaux comptables.';
    const prompt = `Tu es un coach dans un simulateur éducatif en français. ${who}\n${RULES}\nFaits : ${JSON.stringify(data)}`;
    return clean(await root.TA_APP.sample.json(prompt, { modelTier: 'default' }));
  };
  AI.errMsg = errMsg;
  AI.html = (st) => {
    if (!st) return '<button class="btn sm" type="button" data-ai-go>Bilan approfondi par l’IA</button> <span class="fine">Utilise ton propre compte Claude ; une confirmation te sera demandée la première fois.</span>';
    if (st.state === 'loading') return '<p class="dim">Le coach réfléchit… (jusqu’à une minute)</p>';
    if (st.state === 'error') return `<p class="neg">${esc(st.msg)}</p><button class="btn sm" type="button" data-ai-go>Réessayer</button>`;
    const d = st.data, li = (a) => (a.length ? `<ul style="margin:2px 0 8px;padding-left:18px">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    return `<p>${esc(d.bilan)}</p>${d.forts.length ? `<p><b>Points forts</b></p>${li(d.forts)}` : ''}${d.faibles.length ? `<p><b>À travailler</b></p>${li(d.faibles)}` : ''}${d.plan.length ? `<p><b>Plan pour la prochaine fois</b></p>${li(d.plan)}` : ''}`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
