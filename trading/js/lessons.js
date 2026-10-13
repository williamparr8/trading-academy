/* Trading Academy — leçons et quiz (contenu pédagogique)
   Blocs d'une leçon : {h} sous-titre, {p} paragraphe, {ul} liste, {tip} à retenir, {fig} illustration.
   Quiz : {q} question, {o} choix, {a} index de la bonne réponse, {e} explication affichée après correction. */
(function () {
  'use strict';
  const TA = (window.TA = window.TA || {});
  TA.PASS_RATIO = 0.75;   // 3 bonnes réponses sur 4 pour réussir un quiz

  TA.LESSONS = [
    {
      id: 'candles', title: 'Lire les chandeliers', mins: 3,
      intro: 'Chaque bougie du graphique résume une période en quatre prix. Une fois la forme comprise, tu lis la bataille entre acheteurs et vendeurs d’un coup d’œil.',
      body: [
        { p: 'Un chandelier montre l’ouverture, le plus haut, le plus bas et la clôture d’une période (un jour, une semaine…).' },
        { fig: 'candles' },
        { ul: ['Le corps relie l’ouverture à la clôture. Vert : la clôture est au-dessus de l’ouverture (hausse). Rouge : elle est dessous (baisse).', 'Les mèches (ou ombres) montrent les extrêmes atteints pendant la période.', 'Un long corps traduit une conviction : un camp a dominé de bout en bout.'] },
        { h: 'Quelques formes à connaître' },
        { ul: ['Doji : corps minuscule, l’ouverture et la clôture sont presque identiques. Le marché hésite.', 'Marteau : petit corps en haut et longue mèche basse, après une baisse. Les vendeurs ont poussé le prix vers le bas, puis les acheteurs l’ont repris.', 'Étoile filante : l’inverse, petit corps en bas et longue mèche haute, après une hausse.'] },
        { tip: 'Un chandelier seul ne prédit rien. Lis-le dans son contexte : tendance en cours, supports et résistances, volume.' },
      ],
      quiz: [
        { q: 'Que montre le corps d’un chandelier ?', o: ['Le plus haut et le plus bas de la période', 'L’écart entre l’ouverture et la clôture', 'Le nombre d’actions échangées'], a: 1, e: 'Le corps va de l’ouverture à la clôture. Les mèches, elles, montrent le plus haut et le plus bas.' },
        { q: 'Un chandelier vert (haussier) signifie que…', o: ['le prix a atteint un record historique', 'le volume était très élevé', 'la clôture est au-dessus de l’ouverture'], a: 2, e: 'Vert : la période a terminé plus haut qu’elle n’a commencé.' },
        { q: 'Petit corps en haut, longue mèche basse, après une baisse : c’est…', o: ['un marteau', 'une étoile filante', 'un doji'], a: 0, e: 'Le marteau montre un rejet des prix bas : les acheteurs ont repris le contrôle en cours de période.' },
        { q: 'Un doji indique surtout…', o: ['une forte hausse', 'une hésitation du marché', 'une annonce de résultats'], a: 1, e: 'Ouverture et clôture presque identiques : aucun camp n’a gagné la période.' },
      ],
    },
    {
      id: 'levels', title: 'Supports et résistances', mins: 3,
      intro: 'Les prix ont de la mémoire : certains niveaux arrêtent la baisse ou la hausse encore et encore. Les repérer t’aide à placer entrées, stops et objectifs.',
      body: [
        { ul: ['Un support est une zone où la baisse s’est arrêtée plusieurs fois : les acheteurs y sont nombreux.', 'Une résistance est une zone où la hausse a déjà buté : les vendeurs y sont nombreux.'] },
        { h: 'Pourquoi ça marche (souvent)' },
        { p: 'Des ordres s’accumulent autour des mêmes prix, des chiffres ronds ou d’anciens sommets. Plus un niveau a été touché sans céder, plus il compte.' },
        { h: 'Quand un niveau cède' },
        { p: 'Une cassure nette change souvent le rôle du niveau : une ancienne résistance devient un support, et l’inverse. Méfie-toi des fausses cassures : attends une clôture au-delà du niveau, idéalement avec du volume.' },
        { ul: ['Trace des zones, pas des lignes au centime près.', 'Cherche au moins deux ou trois contacts.', 'Place ton stop de l’autre côté du niveau, avec une marge, jamais pile dessus.'] },
        { tip: 'Un support ou une résistance n’est pas un mur : c’est une zone où la probabilité de réaction est plus élevée.' },
      ],
      quiz: [
        { q: 'Une résistance est…', o: ['un plancher garanti', 'une zone où la hausse a déjà buté plusieurs fois', 'une moyenne mobile'], a: 1, e: 'Les vendeurs y sont nombreux, ce qui freine la hausse.' },
        { q: 'Quand une résistance est franchie nettement, elle devient souvent…', o: ['inutile', 'un indicateur', 'un support'], a: 2, e: 'Les acheteurs défendent alors l’ancien niveau de résistance.' },
        { q: 'Où placer le stop d’un achat appuyé sur un support ?', o: ['Pile sur le support', 'Un peu sous la zone de support', 'Au-dessus du prix d’entrée'], a: 1, e: 'Une marge évite d’être sorti par un simple faux mouvement autour du niveau.' },
        { q: 'Pourquoi un niveau touché quatre fois est-il plus significatif qu’un niveau touché une fois ?', o: ['Il est forcément rond', 'Plus d’ordres s’y sont accumulés : le marché s’en souvient', 'Ce n’est pas plus significatif'], a: 1, e: 'Chaque contact confirme que des participants réagissent à ce prix.' },
      ],
    },
    {
      id: 'indicators', title: 'Les indicateurs', mins: 4,
      intro: 'Moyennes mobiles, RSI, MACD, Bollinger : des calculs sur les prix passés. Ils décrivent ce qui s’est passé, ils ne prédisent pas ce qui va arriver.',
      body: [
        { ul: ['Moyenne mobile (MM) : moyenne des N dernières clôtures. Elle lisse le bruit. Une MM 20 réagit vite, une MM 50 est plus lente. Un prix au-dessus d’une MM montante suggère une tendance haussière.', 'RSI (0 à 100) : mesure la vitesse des hausses par rapport aux baisses. Au-dessus de 70, on parle de surachat ; sous 30, de survente. Dans une forte tendance, il peut rester longtemps à ces niveaux.', 'MACD : écart entre deux moyennes mobiles exponentielles (12 et 26), comparé à sa ligne de signal (9). Un croisement signale un changement d’élan.', 'Bandes de Bollinger : deux écarts-types autour d’une MM 20. Resserrées, elles signalent un calme qui précède souvent un mouvement ; le prix qui touche une bande n’est pas un signal d’inversion automatique.'] },
        { tip: 'Plus d’indicateurs ne veut pas dire meilleure décision : ils disent souvent la même chose. Deux ou trois, bien compris, suffisent.' },
      ],
      quiz: [
        { q: 'Un indicateur technique est…', o: ['une prévision officielle', 'un calcul fait sur les prix passés', 'un conseil d’achat'], a: 1, e: 'Il résume ce qui s’est passé, il ne garantit rien sur la suite.' },
        { q: 'Un RSI à 80 signifie…', o: ['qu’il faut vendre immédiatement', 'que le titre est sous-évalué', 'que le prix a beaucoup monté récemment, sans annoncer forcément une baisse'], a: 2, e: 'Surachat ne veut pas dire retournement : en tendance forte, le RSI reste haut longtemps.' },
        { q: 'Quand les bandes de Bollinger se resserrent…', o: ['la volatilité est faible, souvent avant un mouvement plus marqué', 'la tendance est terminée', 'il n’y a plus de volume'], a: 0, e: 'Les bandes mesurent la volatilité : calme avant la tempête, parfois.' },
        { q: 'Pourquoi dit-on qu’une moyenne mobile est « en retard » ?', o: ['Elle ignore les clôtures', 'Elle est calculée sur des prix déjà passés', 'Elle est mal programmée'], a: 1, e: 'Une moyenne est faite de prix passés : elle confirme une tendance plutôt qu’elle ne l’annonce.' },
      ],
    },
    {
      id: 'psychology', title: 'La psychologie du trader', mins: 4,
      intro: 'Les pertes les plus coûteuses viennent rarement d’un mauvais graphique : elles viennent des émotions. Les connaître, c’est déjà les contrôler.',
      body: [
        { ul: ['FOMO (peur de rater le coup) : on achète parce que ça monte vite. On entre tard, souvent près du sommet.', 'Revenge trading : après une perte, on augmente la taille pour se refaire vite. C’est le début d’une spirale.', 'Aversion à la perte : on garde les positions perdantes par espoir et on coupe vite les gagnantes par peur. C’est l’inverse de ce qui marche.', 'Biais de confirmation : on ne retient que ce qui soutient notre idée.'] },
        { h: 'Les remèdes' },
        { ul: ['Un plan écrit avant l’entrée : raison, stop, objectif.', 'Un risque fixe par transaction (1 à 2 % du compte), pour qu’une série de pertes ne détruise pas le compte.', 'Un journal : relis tes émotions à chaque entrée.', 'Une pause après deux ou trois pertes de suite.'] },
        { tip: 'Le journal du simulateur enregistre ta raison et ton émotion à chaque entrée. À la fin de la partie, cherche tes pires pertes : quelle émotion y était associée ?' },
      ],
      quiz: [
        { q: 'Le « revenge trading » consiste à…', o: ['copier un autre trader', 'augmenter la taille après une perte pour se refaire vite', 'revendre ses titres le lendemain'], a: 1, e: 'C’est une réaction émotionnelle : on prend plus de risque au pire moment.' },
        { q: 'Pourquoi risquer un petit pourcentage fixe du compte par transaction ?', o: ['Pour payer moins de frais', 'Parce que la loi l’exige', 'Pour qu’une série de pertes ne détruise pas le compte'], a: 2, e: 'Avec 1 % de risque, il faut 20 pertes de suite pour perdre environ 18 % du compte.' },
        { q: 'Quel comportement illustre l’aversion à la perte ?', o: ['Garder une position perdante par espoir, mais vendre vite une gagnante', 'Placer un stop-loss', 'Diversifier ses placements'], a: 0, e: 'On laisse courir les pertes et on coupe les gains : le contraire d’un bon ratio rendement/risque.' },
        { q: 'Le FOMO pousse surtout à…', o: ['attendre un signal clair', 'entrer tard après une forte hausse, par peur de rater le coup', 'ne plus jamais trader'], a: 1, e: 'On achète l’excitation, pas un plan : le prix est souvent déjà loin.' },
      ],
    },
    {
      id: 'fundamentals', title: 'Les fondamentaux', mins: 4,
      intro: 'L’analyse fondamentale cherche ce qui fait vraiment la valeur d’un actif : bénéfices, taux d’intérêt, croissance, offre et demande.',
      body: [
        { h: 'Actions' },
        { ul: ['Bénéfice par action et ratio cours/bénéfice (P/E) : le prix payé pour chaque dollar de bénéfice. Compare toujours à des entreprises du même secteur.', 'Dividende et rendement : la part des bénéfices versée aux actionnaires.', 'Dette et croissance : une entreprise très endettée est plus fragile quand les taux montent.'] },
        { p: 'À chaque publication de résultats, le prix peut faire un gap à l’ouverture. Ce qui le fait bouger, c’est la surprise par rapport aux attentes, pas le chiffre en soi : le marché a déjà pris en compte ce que tout le monde savait.' },
        { h: 'Taux d’intérêt, forex, crypto' },
        { ul: ['Une hausse rapide des taux pèse sur les valorisations, surtout celles des entreprises de croissance.', 'Au forex, une devise suit les taux d’intérêt relatifs, l’inflation et la politique de sa banque centrale.', 'En crypto, il n’y a pas de bénéfices : on regarde l’offre limitée, l’adoption, la liquidité mondiale, la réglementation et le sentiment.'] },
        { tip: 'Dans ce simulateur, l’actif est caché : tu ne peux pas lire les nouvelles. Apprends à reconnaître leurs effets sur le prix : gaps à l’ouverture, chutes soudaines, tendances qui changent après une annonce.' },
      ],
      quiz: [
        { q: 'Le ratio cours/bénéfice (P/E) mesure…', o: ['le dividende annuel', 'la dette de l’entreprise', 'le prix payé pour chaque dollar de bénéfice'], a: 2, e: 'Un P/E de 20 veut dire qu’on paie 20 $ pour 1 $ de bénéfice annuel.' },
        { q: 'Après une annonce de résultats, qu’est-ce qui fait bouger le prix ?', o: ['La surprise par rapport aux attentes', 'Le montant absolu des bénéfices', 'L’heure de publication'], a: 0, e: 'Le marché anticipe déjà : seul l’écart avec ce qui était attendu crée un mouvement.' },
        { q: 'Une hausse rapide des taux d’intérêt…', o: ['fait toujours monter les actions', 'pèse souvent sur les valorisations, surtout celles de croissance', 'n’a aucun effet sur les marchés'], a: 1, e: 'Des taux plus élevés réduisent la valeur actuelle des bénéfices futurs.' },
        { q: 'Qu’est-ce qui influence fortement une devise ?', o: ['Les dividendes versés', 'Le ratio P/E', 'Les taux d’intérêt et la politique de la banque centrale'], a: 2, e: 'Les capitaux vont vers les devises qui rapportent le plus, à risque égal.' },
      ],
    },
    {
      id: 'short', title: 'La vente à découvert', mins: 4,
      intro: 'Gagner quand le prix baisse : c’est possible, mais le risque n’est pas symétrique. Il faut comprendre pourquoi avant de s’y essayer.',
      body: [
        { p: 'Vendre à découvert, c’est vendre un actif qu’on ne possède pas (emprunté) en espérant le racheter moins cher plus tard, ce qu’on appelle couvrir sa position. Tu encaisses à la vente, puis tu dois racheter.' },
        { h: 'Un risque asymétrique' },
        { ul: ['Gain maximal : 100 % (le prix ne peut pas descendre sous zéro).', 'Perte maximale : théoriquement illimitée, car le prix peut monter sans limite.', 'Short squeeze : une hausse brutale force les vendeurs à découvert à racheter, ce qui pousse le prix encore plus haut.'] },
        { h: 'Dans le simulateur' },
        { ul: ['Le stop-loss se place au-dessus du prix d’entrée, l’objectif en dessous.', 'La vente à découvert s’ouvre au niveau Intermédiaire. En crypto, elle exige le niveau Avancé et du levier.', 'Les actions vendues à découvert sont empruntées : le simulateur prélève des frais d’emprunt de 2 % par an à chaque barre. Les dividendes à rembourser sont déjà comptés, car les prix sont ajustés des dividendes.'] },
        { tip: 'Une vente à découvert sans stop est l’une des positions les plus dangereuses qui soient.' },
      ],
      quiz: [
        { q: 'Un vendeur à découvert gagne quand…', o: ['le prix baisse', 'le prix monte', 'le volume augmente'], a: 0, e: 'Il a vendu haut et rachètera plus bas.' },
        { q: 'Quelle est la perte maximale théorique d’un short sur une action ?', o: ['100 % de la mise', '50 % de la mise', 'Illimitée'], a: 2, e: 'Le prix peut monter indéfiniment : la perte aussi.' },
        { q: 'Où place-t-on le stop-loss d’un short ?', o: ['En dessous du prix d’entrée', 'Au-dessus du prix d’entrée', 'Il n’en faut pas'], a: 1, e: 'Le danger vient d’une hausse : le stop doit protéger de ce côté.' },
        { q: 'Un « short squeeze », c’est…', o: ['un type d’ordre', 'une baisse de 10 %', 'une hausse brutale qui force les vendeurs à racheter, ce qui l’amplifie'], a: 2, e: 'Les rachats forcés ajoutent de la demande et accélèrent la hausse.' },
      ],
    },
    {
      id: 'leverage', title: 'Le levier et l’appel de marge', mins: 5,
      intro: 'Le levier amplifie tout : gains, pertes et vitesse à laquelle un compte peut disparaître. C’est l’outil qui fait le plus de dégâts chez les débutants.',
      body: [
        { p: 'Le levier est le rapport entre ta position et ton capital. Avec un levier ×5 et 10 000 $, tu contrôles 50 000 $. Un mouvement de 1 % du prix devient 5 % de ton capital, dans un sens comme dans l’autre.' },
        { h: 'La marge' },
        { ul: ['La marge est la garantie que tu immobilises. La marge initiale vaut 1 divisé par le levier : 20 % à ×5.', 'Si ton compte tombe sous la moitié de cette marge (le seuil de maintien), c’est l’appel de marge : tu dois réduire ta position.', 'Si tu ne règles pas l’appel, la plateforme liquide tout ou partie de ta position.', 'Si le prix traverse le prix de liquidation, tout est fermé immédiatement. Le simulateur trace ce prix sur le graphique.'] },
        { h: 'Ce que ça change' },
        { ul: ['Si tu utilises tout ton levier ×5, un recul d’environ 11 % du prix déclenche l’appel de marge et un recul d’environ 16 % la liquidation. Un recul de 20 % anéantirait le compte.', 'Un gap peut faire perdre plus que ton capital.', 'Le levier permet une grande position avec un stop serré, mais un stop trop serré est touché plus souvent.', 'Forex : jusqu’à ×30 en pratique. Crypto : jusqu’à ×10 ici. Actions : ×2 à ×5.'] },
        { tip: 'Commence à ×2. Un levier élevé n’est pas un avantage : c’est un compte à rebours. Ta règle de risque (1 à 2 % par transaction) reste ta vraie limite.' },
      ],
      quiz: [
        { q: 'Avec un levier ×5 et 10 000 $, tu contrôles…', o: ['5 000 $', '50 000 $', '10 000 $'], a: 1, e: '10 000 × 5 = 50 000 $ de position.' },
        { q: 'Avec un levier ×5, un recul de 20 % du prix de l’actif…', o: ['fait perdre 20 % du capital', 'est sans effet', 'peut anéantir le capital'], a: 2, e: '20 % × 5 = 100 % du capital : la position est liquidée avant d’en arriver là.' },
        { q: 'Un appel de marge se déclenche quand…', o: ['le compte ne couvre plus assez la position', 'le prix atteint un support', 'le volume baisse'], a: 0, e: 'La valeur du compte est passée sous le seuil de maintien exigé.' },
        { q: 'Si on ne règle pas un appel de marge…', o: ['rien ne se passe', 'la plateforme ferme tout ou partie de la position', 'le courtier ajoute des fonds'], a: 1, e: 'C’est la liquidation : la plateforme protège son prêt, pas ton compte.' },
      ],
    },
    {
      id: 'markets', title: 'Forex et crypto : ce qui change', mins: 4,
      intro: 'Mêmes graphiques, autre jeu : horaires, coûts, volatilité et risques ne sont pas ceux des actions.',
      body: [
        { h: 'Forex' },
        { ul: ['On échange une devise contre une autre. EUR/USD à 1,10 veut dire que 1 € vaut 1,10 $.', 'Marché ouvert 24 h sur 24, du lundi au vendredi. Les spreads sont très serrés et il n’y a pas de commission : le spread est ton coût.', 'Les annonces des banques centrales (taux) et les données sur l’emploi et l’inflation provoquent les plus gros mouvements.'] },
        { h: 'Crypto' },
        { ul: ['Marché ouvert 24 h sur 24, 7 jours sur 7 : les barres incluent les fins de semaine.', 'Volatilité extrême : ±10 % en une journée n’a rien d’exceptionnel. Frais d’environ 0,1 % et spread plus large.', 'Des cycles de bulle (2017, 2021) puis d’effondrement (2018, 2022). Les liquidations de positions à levier amplifient les chutes en cascade.'] },
        { tip: 'La même taille de position ne représente pas le même risque d’un actif à l’autre. Plus l’actif est volatil, plus ton stop doit être large et plus ta taille doit être petite pour risquer le même pourcentage. Le calculateur de taille le fait pour toi.' },
      ],
      quiz: [
        { q: 'Au forex, EUR/USD à 1,10 signifie que…', o: ['1 $ vaut 1,10 €', '1 € vaut 1,10 $', 'l’intérêt est de 1,10 %'], a: 1, e: 'Le premier code est la devise qu’on achète ou vend, le second celle qui sert de prix.' },
        { q: 'Une différence majeure entre actions et crypto ?', o: ['La crypto se négocie 24 h sur 24, 7 jours sur 7', 'La crypto est fermée le week-end', 'La crypto n’a jamais de spread'], a: 0, e: 'Il n’y a ni ouverture ni fermeture : les prix bougent aussi la fin de semaine.' },
        { q: 'Pourquoi réduire sa taille sur un actif très volatil ?', o: ['Pour payer plus de frais', 'Parce qu’il faut un stop plus large, donc moins d’unités pour risquer le même pourcentage', 'Pour toucher des dividendes'], a: 1, e: 'Risque = taille × distance du stop. Stop plus large, taille plus petite.' },
        { q: 'Au forex, le principal coût de transaction est…', o: ['une commission de 1 $', 'les dividendes', 'le spread'], a: 2, e: 'Pas de commission : on paie l’écart entre le prix d’achat et le prix de vente.' },
      ],
    },
    {
      id: 'options', title: 'Les options : calls et puts', mins: 5,
      intro: 'Une option te donne un droit, pas une obligation. Ton risque est connu d’avance : la prime que tu paies. Mais acheter une option n’est pas « gratuit » pour autant.',
      body: [
        { p: 'Une option donne le droit d’acheter (call) ou de vendre (put) un actif à un prix fixé, le prix d’exercice, d’ici une date, l’échéance. En échange, tu paies une prime. Un contrat porte sur 100 unités : une prime de 2,50 $ coûte donc 250 $ par contrat.' },
        { ul: ['Un call gagne si le prix monte au-delà du prix d’exercice plus la prime (le point mort).', 'Un put gagne si le prix descend sous le prix d’exercice moins la prime.', 'Ta perte maximale d’acheteur est la prime payée, frais compris : pas de stop-loss nécessaire.'] },
        { h: 'Ce qui fait varier la prime' },
        { ul: ['Le prix : plus il s’éloigne dans ton sens, plus l’option vaut cher. Le delta mesure cette sensibilité : environ 0,5 pour une option au prix, proche de 1 loin dans la monnaie.', 'La volatilité : plus l’actif bouge, plus l’option est chère.', 'Le temps : la valeur temps s’érode chaque jour, et de plus en plus vite près de l’échéance. Le temps joue contre l’acheteur.'] },
        { h: 'Dans le simulateur' },
        { ul: ['Tu n’achètes que des options (pas de vente d’options), au niveau Avancé.', 'La prime vient d’un modèle de Black-Scholes avec la volatilité récemment observée, plus 10 %. L’écart acheteur-vendeur est d’environ 3 %.', 'À l’échéance, le règlement se fait en espèces, à la valeur intrinsèque.'] },
        { tip: 'Une option très peu chère et loin du prix n’est pas une bonne affaire : c’est une petite probabilité de gagner. Compare toujours le point mort à ce que tu penses réaliste.' },
      ],
      quiz: [
        { q: 'Quelle est la perte maximale de l’acheteur d’un call ?', o: ['La prime payée, frais compris', 'Illimitée', 'Le prix d’exercice'], a: 0, e: 'Il ne peut perdre que ce qu’il a payé pour l’option.' },
        { q: 'Un call de prix d’exercice 100, payé 3 $ la prime. À l’échéance l’actif vaut 102. Résultat par unité ?', o: ['+2 $', '−3 $', '−1 $'], a: 2, e: 'Valeur à l’échéance : 102 − 100 = 2 $. Moins la prime de 3 $ : −1 $.' },
        { q: 'Toutes choses égales, que devient la valeur d’une option achetée avec le temps ?', o: ['Elle augmente', 'Elle reste stable', 'Elle s’érode : la valeur temps diminue'], a: 2, e: 'C’est l’érosion temporelle : elle accélère près de l’échéance.' },
        { q: 'Un put est gagnant à l’échéance si…', o: ['le prix monte', 'le prix baisse nettement sous le prix d’exercice moins la prime', 'le volume augmente'], a: 1, e: 'Il faut dépasser le point mort : prix d’exercice moins la prime.' },
      ],
    },
  ];

  // Illustrations (SVG en ligne, couleurs du thème)
  TA.FIGURES = {
    candles() {
      const cd = (x, up, o, c, h, l) => {
        const col = up ? 'var(--up)' : 'var(--down)', top = Math.min(o, c), bot = Math.max(o, c);
        return `<line x1="${x}" x2="${x}" y1="${h}" y2="${l}" stroke="${col}" stroke-width="2"/><rect x="${x - 14}" y="${top}" width="28" height="${bot - top}" fill="${col}"/>`;
      };
      const lab = (x, y, t, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
      const ln = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--faint)" stroke-dasharray="3 3"/>`;
      return `<svg class="fig" viewBox="0 0 520 190" role="img" aria-label="Anatomie d’un chandelier haussier et d’un chandelier baissier">
        ${cd(110, true, 130, 60, 30, 160)}${cd(380, false, 60, 130, 30, 160)}
        ${ln(124, 30, 190, 30)}${lab(194, 34, 'Plus haut')}${ln(124, 60, 190, 60)}${lab(194, 64, 'Clôture')}${ln(124, 130, 190, 130)}${lab(194, 134, 'Ouverture')}${ln(110, 160, 190, 160)}${lab(194, 164, 'Plus bas')}
        ${lab(110, 182, 'Hausse', 'middle')}${lab(380, 182, 'Baisse', 'middle')}
        ${ln(394, 60, 330, 60)}${lab(326, 64, 'Ouverture', 'end')}${ln(394, 130, 330, 130)}${lab(326, 134, 'Clôture', 'end')}
        ${lab(412, 100, 'Corps')}${lab(412, 46, 'Mèche haute')}${lab(412, 156, 'Mèche basse')}
      </svg>`;
    },
  };
})();
