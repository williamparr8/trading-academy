/* Trading Academy — tutoriels : de courtes parties guidées sur la vraie interface, en trois modules.
   Ce fichier ne contient que le contenu et les conditions des étapes (pas de DOM) : l'orchestration est dans app.js.
   - étape « d'action » (when) : elle se franchit toute seule dès que sa condition est vraie ;
   - étape « à valider » (gate + when) : elle montre ce qu'il y a à faire, puis un bouton Suivant quand c'est fait ;
   - étape sans condition : elle attend un clic sur Suivant. */
(function () {
  'use strict';
  const TA = (globalThis.TA = globalThis.TA || {});
  const BARS = 3;   // jours à faire avancer avant de fermer
  const IND_TARGET = ['#ind-open', '#ind-chips'];

  /* ---------- 1. Ton premier trade : une partie calme (le nom reste caché), hausse douce, stop à 96 $ jamais touché ---------- */
  const BASICS = [
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
      text: (c) => `Avant d’acheter, décide à quel prix tu abandonnes. Écris <b>${Math.floor(c.last * 0.96)}</b> dans « Stop-loss ». Si le prix tombe là, la plateforme te sort toute seule : ta perte maximale est connue d’avance. Tu peux aussi cliquer l’outil <b>Stop-loss</b> au-dessus du graphique, puis le prix voulu.`,
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
      text: () => 'Tu sais lire le graphique, fixer un stop, dimensionner une position, la suivre et la fermer. Dans une vraie partie, tu choisis le marché, la période et le niveau de risque, et l’actif est révélé à la fin. Il reste deux parcours courts à l’accueil : <b>parier contre le marché</b> et <b>les indicateurs</b>.',
    },
  ];

  /* ---------- 2. Parier contre le marché : une baisse douce sur trois jours, stop à 104 $ jamais touché ---------- */
  const SHORT = [
    {
      id: 'intro', title: 'Parier contre le marché', manual: 'Commencer',
      text: () => 'Quand tu penses qu’un prix va <b>baisser</b>, tu peux <b>vendre à découvert</b> : tu empruntes l’action, tu la vends tout de suite, puis tu la rachètes plus tard, si possible moins cher. Tu encaisses la différence. C’est l’inverse d’un achat : <b>tu gagnes quand le prix baisse</b>.',
    },
    {
      id: 'risk', title: 'Le risque est inversé', manual: 'Suivant',
      text: () => 'Un achat ne peut pas perdre plus que sa mise : un prix tombe au pire à zéro. Une vente à découvert peut perdre davantage, parce qu’un prix peut monter sans limite. C’est pourquoi le <b>stop-loss</b> est encore plus important ici : il se place <b>au-dessus</b> du prix. Tu paies aussi des frais d’emprunt (2 % par an sur les actions), prélevés à chaque barre.',
    },
    {
      id: 'side', title: '1. Choisis « Vendre »', target: ['#t-side'],
      text: () => 'En haut du ticket, clique <b>Vendre</b>. Le texte sous les boutons confirme que tu ouvres une vente à découvert : un pari à la baisse.',
      when: (c) => c.side === 'sell' && !c.hasPos,
      ok: 'Tu parieras à la baisse.',
    },
    {
      id: 'stop', title: '2. Le stop se place au-dessus', target: ['#f-exits'],
      text: (c) => `Ton ennemi, c’est la hausse. Écris <b>${Math.ceil(c.last * 1.04)}</b> dans « Stop-loss » : si le prix monte jusque-là, tu rachètes et ta perte est limitée.`,
      when: (c) => c.side === 'sell' && c.sl != null && c.sl > c.last * 1.005 && c.sl <= c.last * 1.2,
      ok: 'Stop placé au-dessus du prix.',
    },
    {
      id: 'size', title: '3. Même règle de taille', target: ['#t-size'],
      text: (c) => `Le calculateur utilise la distance jusqu’à ton stop : ${c.money(c.equity * 0.01)} de risque, pas plus.${c.risk !== 1 ? ' Mets <b>1</b> dans « Risquer … % ».' : ''} Clique <b>Utiliser</b>.`,
      when: (c) => c.sizeQty > 0 && c.qty === c.sizeQty,
      ok: 'Taille calculée sur ton risque.',
    },
    {
      id: 'journal', title: '4. Journal', target: ['#f-journal'],
      text: () => 'Choisis une <b>raison</b> (par exemple « Tendance baissière » ou « Rejet sur une résistance ») et une <b>émotion</b>.',
      when: (c) => !!c.reason && !!c.emotion,
      ok: 'Journal rempli.',
    },
    {
      id: 'go', title: '5. Vends à découvert', target: ['#t-go'],
      text: (c) => (c.side !== 'sell' ? 'Choisis <b>Vendre</b> en haut du ticket.' : 'Clique <b>Vendre à découvert au marché</b> : l’ordre s’exécute au prix du moment, avec le spread et la commission.'),
      when: (c) => c.posDir === -1,
      ok: 'Position à découvert ouverte.',
    },
    {
      id: 'watch', title: '6. Laisse le prix baisser', target: ['#btn-next', '#mb-next'], tab: 'pos',
      text: (c) => `Clique <b>Jour suivant</b>. Ici, c’est l’inverse : quand le prix <b>baisse</b>, ton P&amp;L non réalisé <b>monte</b> ; quand il monte, il diminue. ${c.bars >= BARS ? '' : `Encore ${BARS - c.bars} jour${BARS - c.bars > 1 ? 's' : ''}.`}`,
      when: (c) => c.bars >= BARS || !c.hasPos,
    },
    {
      id: 'close', title: '7. Couvre ta position', target: ['#p-close'], tab: 'pos',
      text: () => 'Pour fermer une vente à découvert, tu <b>rachètes</b> l’action : on dit « couvrir ». Clique <b>Clôturer la position</b>.',
      when: (c) => !c.hasPos,
      ok: 'Position couverte.',
    },
    {
      id: 'result', title: 'Ton résultat', target: ['#tabs'], tab: 'hist', manual: 'Suivant',
      text: (c) => {
        const t = c.lastTrade;
        const res = t ? `Résultat : <b>${c.smoney(t.net)}</b>${t.r == null ? '' : `, soit <b>${t.r > 0 ? '+' : ''}${c.num(t.r, 2)} R</b>`}, frais compris (${c.money(t.fees)} : commission, spread et emprunt). ` : '';
        return `${res}Une vente à découvert se juge comme un achat : par rapport au risque pris. Attention aux marchés qui montent fort : les pertes à la hausse peuvent aller vite, d’où le stop obligatoire.`;
      },
    },
    {
      id: 'done', title: 'Tu peux parier dans les deux sens', manual: 'Terminer le tutoriel',
      text: () => 'Tu sais maintenant ouvrir un pari à la baisse, placer le stop du bon côté et couvrir. Dans une vraie partie, c’est le même ticket : le bouton <b>Vendre</b> sans position ouvre une vente à découvert. Les marchés de <b>forex</b> permettent aussi de parier contre une devise.',
    },
  ];

  /* ---------- 3. Les indicateurs : un graphique vide d'indicateurs, puis on les ajoute un à un ---------- */
  const add = (id, title, todo, has, text, pts, extra = {}) => ({ id, title, gate: true, target: IND_TARGET, todo, when: has, text: () => text, pts, ok: 'Ajouté.', ...extra });
  const INDICATORS = [
    {
      id: 'intro', title: 'Lire le marché avec des indicateurs', manual: 'Commencer',
      text: () => 'Les indicateurs sont des calculs faits sur les <b>prix passés</b>. Ils ne prédisent rien : ils résument ce qui s’est passé pour t’aider à lire la tendance, l’élan et la volatilité. Tu vas en ajouter sept un par un, comprendre ce qu’ils mesurent, comment les lire et <b>quand s’en méfier</b>. Le graphique démarre sans aucun indicateur.',
    },
    add('vol', 'Le volume', 'Clique <b>+ Indicateur</b> au-dessus du graphique, puis <b>Volume</b>.', (c) => c.has('vol'),
      'Chaque barre du bas montre combien d’actions ont changé de mains pendant la bougie. Le volume est relatif au début de la partie : ×1 = normal.',
      [['Comment le lire', 'Un mouvement appuyé par un gros volume est plus convaincant : beaucoup de participants agissent dans le même sens. Une cassure de niveau avec un volume faible se retourne plus souvent.'],
        ['Le piège', 'Le volume ne dit pas dans quel sens ira le prix, seulement combien de monde participe. Compare-le toujours aux barres voisines.'],
        ['À essayer', 'Repère la barre de volume la plus haute à gauche : que faisait le prix ce jour-là ?']]),
    add('sma', 'La moyenne mobile', 'Ouvre <b>+ Indicateur</b> et ajoute une <b>Moyenne mobile</b>.', (c) => c.has('sma'),
      'La moyenne mobile (MM) est la moyenne des N derniers prix de clôture : 20 par défaut, environ un mois de Bourse. Elle suit le prix en le lissant.',
      [['Comment la lire', 'Prix au-dessus d’une moyenne qui monte : tendance haussière. Prix sous une moyenne qui descend : tendance baissière. La pente donne la force, et la ligne sert souvent de support ou de résistance mobile.'],
        ['Choisir la période', 'Courte (10, 20) : réactive mais nerveuse. Longue (50, 100, 200) : lente, fiable pour la tendance de fond.'],
        ['Le piège', 'Elle est toujours en retard : elle confirme une tendance, elle ne l’annonce pas. En marché sans tendance, le prix la croise sans arrêt et donne de faux signaux.']]),
    add('sma2', 'Le croisement de deux moyennes', 'Ajoute une <b>deuxième</b> moyenne mobile : elle prend la période <b>50</b>, plus lente que la première (tu peux la changer dans le panneau).', (c) => c.inds.some((i) => i.t === 'sma' && i.n >= 40) && c.count('sma') >= 2,
      'Une moyenne courte et une longue ensemble donnent l’un des signaux les plus connus.',
      [['Comment le lire', 'Quand la courte passe au-dessus de la longue, la tendance récente prend le dessus : croisement haussier. L’inverse est un croisement baissier.'],
        ['Le piège', 'Le signal arrive tard et se répète dans un marché plat. Ne l’utilise jamais seul.'],
        ['À essayer', 'Cherche à gauche un croisement : le prix a-t-il continué dans le même sens ensuite ?']]),
    add('ema', 'La moyenne exponentielle', 'Ajoute une <b>Moyenne mobile exponentielle</b>.', (c) => c.has('ema'),
      'La moyenne exponentielle (MME) donne plus de poids aux prix récents : elle colle davantage au prix et tourne plus vite que la moyenne simple.',
      [['Comment la lire', 'Même lecture que la moyenne simple, avec un signal plus précoce. Les courtes (9, 12, 21) servent au court terme, les longues (50, 200) à la tendance de fond.'],
        ['Le piège', 'Plus rapide veut aussi dire plus de faux signaux. Compare-la à la moyenne simple de même période : l’écart montre que le prix vient de bouger vite.']]),
    add('boll', 'Les bandes de Bollinger', 'Ajoute les <b>Bandes de Bollinger</b>.', (c) => c.has('boll'),
      'Trois lignes : une moyenne mobile au milieu et deux bandes à 2 écarts-types au-dessus et en dessous. Environ 95 % des prix restent entre les bandes.',
      [['Comment les lire', 'Bandes qui s’écartent : la volatilité monte. Bandes qui se resserrent (le « squeeze ») : le marché est calme et prépare souvent un mouvement ample, sans dire dans quel sens.'],
        ['Le piège', 'Toucher la bande du haut n’est pas un signal de vente. Dans une tendance forte, le prix « marche » sur la bande. La bande dit « inhabituel », pas « retournement ».'],
        ['À essayer', 'Trouve à gauche l’endroit où les bandes sont les plus serrées : que s’est-il passé juste après ?']]),
    add('rsi', 'Le RSI', 'Ajoute le <b>RSI</b>.', (c) => c.has('rsi'),
      'Le RSI va de 0 à 100 et compare l’ampleur des hausses et des baisses récentes (14 barres par défaut). Il s’affiche dans son propre volet.',
      [['Comment le lire', 'Au-dessus de 70 : « suracheté », le prix a beaucoup monté. Sous 30 : « survendu », il a beaucoup baissé. Dans une tendance haussière, un passage sous 40 est souvent une occasion de rebond.'],
        ['La divergence', 'Si le prix fait un nouveau sommet mais que le RSI n’en fait pas, la hausse s’essouffle.'],
        ['Le piège', '« Suracheté » ne veut pas dire « va baisser » : dans une forte tendance, le RSI reste au-dessus de 70 longtemps. Vendre juste parce qu’il dépasse 70 est une erreur classique.'],
        ['À essayer', 'Cherche à gauche le moment où le RSI est passé sous 30 : le prix a-t-il rebondi ?']]),
    add('macd', 'Le MACD', 'Ajoute le <b>MACD</b>.', (c) => c.has('macd'),
      'Le MACD mesure l’élan : la ligne est l’écart entre deux moyennes exponentielles (12 et 26), le signal en est une moyenne (9), et l’histogramme montre l’écart entre les deux.',
      [['Comment le lire', 'Ligne au-dessus du signal et histogramme positif : élan haussier. Un histogramme qui se contracte annonce que l’élan faiblit, souvent avant que le prix ne tourne.'],
        ['Les croisements', 'La ligne qui croise le signal vers le haut : signal d’achat classique ; vers le bas : signal de vente. Au-dessus de zéro, la tendance de fond est haussière.'],
        ['Le piège', 'Comme les moyennes, il est en retard et s’agite en marché plat. Il répond à la même question que le RSI : choisis l’un ou l’autre, pas les deux.']]),
    add('atr', 'L’ATR : mesurer le bruit', (c) => `Ajoute l’<b>ATR</b>, lis sa valeur dans le volet du bas, puis écris dans « Stop-loss » le prix actuel moins 2 ATR (environ <b>${c.num(c.last - 2 * c.atr, 2)}</b> ici).`,
      (c) => c.has('atr') && c.sl != null && c.sl >= c.last - 3 * c.atr && c.sl <= c.last - 1.5 * c.atr,
      'L’ATR est l’amplitude moyenne d’une barre, en dollars (14 barres par défaut). Il ne donne aucune direction : il mesure le « bruit » normal du marché.',
      [['Pourquoi c’est utile', 'Un stop trop proche du prix est touché par le simple bruit. Règle courante : un stop à 1,5 à 2 ATR de l’entrée. Un titre plus nerveux demande un stop plus loin, donc une plus petite quantité pour le même risque.'],
        ['Le piège', 'Un ATR qui monte annonce plus de risque, pas une direction.']],
      { ok: 'Stop placé à une distance qui tient compte du bruit.' }),
    {
      id: 'combine', title: 'Les assembler sans te perdre', manual: 'Suivant',
      text: () => 'Tous ces indicateurs viennent du même prix : en empiler plusieurs dit la même chose plusieurs fois et donne une fausse impression de confirmation.',
      pts: [['Un rôle chacun', 'Tendance : moyennes mobiles. Élan : RSI ou MACD. Volatilité : ATR ou Bollinger. Participation : volume.'],
        ['Trois au plus', 'Deux ou trois indicateurs bien choisis, de rôles différents, valent mieux qu’un graphique chargé.'],
        ['Le plan d’abord', 'Un indicateur aide à décider, il ne remplace pas ton plan : niveau, stop, taille, objectif. Et il est calculé sur le passé : il n’annonce jamais l’avenir.']],
    },
    {
      id: 'prune', title: 'Garde l’essentiel', gate: true, target: IND_TARGET,
      todo: () => 'Retire les indicateurs en trop avec la croix de leur pastille (ou dans le panneau) : garde-en <b>trois au plus</b>.',
      when: (c) => c.inds.length <= 3,
      text: () => 'Ajouter ou retirer un indicateur prend un clic : essaie différentes combinaisons dans tes parties, et garde celles que tu sais lire.',
      ok: 'Graphique allégé.',
    },
    {
      id: 'done', title: 'Tu sais lire tes indicateurs', manual: 'Terminer le tutoriel',
      text: () => 'Tu connais maintenant le volume, les moyennes (simple et exponentielle), Bollinger, le RSI, le MACD et l’ATR, ce qu’ils mesurent et leurs pièges. Dans une partie, le bouton <b>+ Indicateur</b> te permet de les ajouter, de les retirer et de changer leurs périodes. Le <b>coach</b> relève les entrées où ton journal parle d’un signal, et les leçons de l’accueil approfondissent.',
    },
  ];

  const base = { rules: 'strict2', level: 1 };
  TA.TUTORIAL = {
    modules: [
      { id: 'basics', title: 'Ton premier trade', mins: 3, blurb: 'Stop, taille, journal, achat, suivi et résultat.', ...base, length: 15, code: 'TUTO-0001', bars: BARS,
        plan: { assetId: 'JNJ', startDay: 16218, scenarioId: 'random', market: 'stock' }, steps: BASICS },
      { id: 'short', title: 'Parier contre le marché', mins: 3, blurb: 'Vendre à découvert : gagner quand le prix baisse.', ...base, length: 15, code: 'TUTO-0002', bars: BARS,
        plan: { assetId: 'BCE_TO', startDay: 17410, scenarioId: 'random', market: 'stock' }, steps: SHORT },
      { id: 'indicators', title: 'Les indicateurs en détail', mins: 6, blurb: 'Volume, moyennes, Bollinger, RSI, MACD, ATR.', ...base, length: 30, code: 'TUTO-0003', bars: 0, clearInds: true,
        plan: { assetId: 'TLT', startDay: 15581, scenarioId: 'random', market: 'stock' }, steps: INDICATORS },
    ],
  };
  // raccourci : le premier module garde l'ancienne forme (plan, steps…) pour les anciens appels
  const m0 = TA.TUTORIAL.modules[0];
  Object.assign(TA.TUTORIAL, { plan: m0.plan, length: m0.length, rules: m0.rules, level: m0.level, bars: m0.bars, code: m0.code, steps: m0.steps });
})();
