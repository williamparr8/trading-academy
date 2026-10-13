/* Trading Academy — tutoriel : une courte partie guidée sur la vraie interface.
   Ce fichier ne contient que le contenu et les conditions des étapes (pas de DOM) : l'orchestration est dans app.js.
   Chaque étape « d'action » se franchit toute seule dès que sa condition est vraie ; les autres attendent un clic. */
(function () {
  'use strict';
  const TA = (globalThis.TA = globalThis.TA || {});

  // Partie d'entraînement fixe : un titre calme (le nom reste caché), une hausse douce sur trois jours,
  // jamais de journée agitée autour du départ, et le stop à 96 $ n'est pas touché.
  const PLAN = { assetId: 'JNJ', startDay: 16218, scenarioId: 'random', market: 'stock' };
  const BARS = 3;   // jours à faire avancer avant de fermer

  const stopSuggestion = (c) => Math.floor(c.last * 0.96);

  const STEPS = [
    {
      id: 'welcome', title: 'Ton premier trade, en 3 minutes', manual: 'Commencer',
      text: () => 'Tu as <b>100 000 $ virtuels</b>. L’actif et la date sont cachés, comme dans une vraie partie. Tu vas ouvrir une position, la suivre, puis la fermer. Rien de ce que tu fais ici n’est sauvegardé ni compté.',
    },
    {
      id: 'chart', title: 'Le graphique', target: ['.chartbox'],
      text: (c) => `Chaque bougie représente un jour. <b>Verte</b> : le prix a monté. <b>Rouge</b> : il a baissé. Les mèches montrent le plus haut et le plus bas atteints. Tout part de ${c.money(c.last)}. Survole une bougie pour lire ses prix.`,
    },
    {
      id: 'stop', title: '1. Fixe ta limite de perte', target: ['#f-exits'],
      text: (c) => `Avant d’acheter, décide à quel prix tu abandonnes. Écris <b>${stopSuggestion(c)}</b> dans « Stop-loss ». Si le prix tombe là, la plateforme te sort toute seule : ta perte maximale est connue d’avance.`,
      when: (c) => c.sl != null && c.sl >= c.last * 0.8 && c.sl <= c.last * 0.995,
      ok: 'Stop placé : ta perte maximale est connue d’avance.',
    },
    {
      id: 'size', title: '2. Choisis la bonne quantité', target: ['#t-size'],
      text: (c) => `Le piège du débutant : acheter trop. Ici, tu risques <b>1 %</b> de ton compte (${c.money(c.equity * 0.01)}) par trade. Le calculateur trouve combien d’actions acheter avec ton stop.${c.risk !== 1 ? ' Mets <b>1</b> dans « Risquer … % ».' : ''} Clique <b>Utiliser</b>.`,
      when: (c) => c.sizeQty > 0 && c.qty === c.sizeQty,
      ok: 'Bonne taille : si le stop est touché, tu perds environ 1 % du compte.',
    },
    {
      id: 'journal', title: '3. Note pourquoi tu entres', target: ['#f-journal'],
      text: () => 'Choisis une <b>raison</b> d’entrée et une <b>émotion</b>. Ton journal te montrera plus tard quelles raisons et quels états d’esprit te coûtent de l’argent.',
      when: (c) => !!c.reason && !!c.emotion,
      ok: 'Journal rempli : les traders qui progressent notent leurs raisons.',
    },
    {
      id: 'buy', title: '4. Passe l’ordre', target: ['#t-go'],
      text: (c) => (c.side !== 'buy' ? 'Choisis <b>Acheter</b> en haut du ticket : tu gagnes si le prix monte.'
        : c.type !== 'market' ? 'Choisis le type <b>Marché</b> : l’ordre s’exécute tout de suite, au prix du moment.'
          : 'Tout est prêt. Clique <b>Acheter au marché</b> : l’ordre s’exécute au prix du moment, avec un petit écart (le spread) et une commission, comme en vrai.'),
      when: (c) => c.hasPos,
      ok: 'Position ouverte.',
    },
    {
      id: 'watch', title: '5. Laisse le temps passer', target: ['#btn-next', '#mb-next'], tab: 'pos',
      text: (c) => `Clique <b>Jour suivant</b> (ou la touche →). Observe le <b>P&amp;L non réalisé</b> dans le portefeuille : tant que tu n’as pas vendu, le gain ou la perte n’est pas encaissé. ${c.bars >= BARS ? '' : `Encore ${BARS - c.bars} jour${BARS - c.bars > 1 ? 's' : ''}.`}`,
      when: (c) => c.bars >= BARS || !c.hasPos,
    },
    {
      id: 'pnl', title: 'Ton portefeuille', target: ['#pf'], manual: 'Suivant',
      text: () => '<b>Valeur du compte</b> : liquidités plus position. <b>P&amp;L non réalisé</b> : gain ou perte sur la position ouverte. <b>P&amp;L réalisé</b> : ce que tu as vraiment encaissé. <b>Drawdown</b> : le recul depuis ton plus haut, une mesure du stress subi par ton compte.',
    },
    {
      id: 'close', title: '6. Ferme ta position', target: ['#p-close'], tab: 'pos',
      text: () => 'Clique <b>Clôturer la position</b> dans l’onglet Position. Dans une vraie partie, ton stop ou un objectif peuvent aussi le faire à ta place.',
      when: (c) => !c.hasPos,
      ok: 'Position fermée : le résultat est maintenant réalisé.',
    },
    {
      id: 'result', title: 'Ton résultat', target: ['#tabs'], tab: 'hist', manual: 'Suivant',
      text: (c) => {
        const t = c.lastTrade;
        const res = t ? `Résultat : <b>${c.smoney(t.net)}</b>${t.r == null ? '' : `, soit <b>${t.r > 0 ? '+' : ''}${c.num(t.r, 2)} R</b>`}. ` : '';
        return `${res}Un <b>R</b> est ce que tu risquais au départ : +1 R veut dire que tu as gagné autant que tu avais accepté de perdre. Le journal garde chaque trade et l’onglet <b>Coach</b> te donne un commentaire après chacun.`;
      },
    },
    {
      id: 'done', title: 'Tu es prêt', manual: 'Terminer le tutoriel',
      text: () => 'Tu sais lire le graphique, fixer un stop, dimensionner une position, la suivre et la fermer. Dans une vraie partie, tu choisis le marché, la période et le niveau de risque, et l’actif est révélé à la fin. Les puces au-dessus du graphique ajoutent des indicateurs, et les <b>leçons</b> de l’accueil complètent ce que tu viens de voir.',
    },
  ];

  TA.TUTORIAL = { plan: PLAN, length: 15, rules: 'strict2', level: 1, bars: BARS, code: 'TUTO-0001', steps: STEPS };
})();
