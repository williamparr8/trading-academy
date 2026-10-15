/* Trading Academy — leçons de la deuxième série : analyse fondamentale, valorisation, résultats, analyse technique
   appliquée, gestion de portefeuille, mesure de la performance, diversification. Même format que lessons.js. */
(function () {
  'use strict';
  const TA = (window.TA = window.TA || {});
  if (!TA.LESSONS) return;
  TA.LESSONS.push(
    {
      id: 'statements', title: 'Lire les états financiers', mins: 5,
      intro: 'Une action est une part d’entreprise. Pour juger l’entreprise, tu lis trois documents. Ils racontent la même histoire sous trois angles, et c’est leur désaccord qui révèle les problèmes.',
      body: [
        { h: 'Les trois états' },
        { ul: ['État des résultats : revenus, charges, bénéfice net et bénéfice par action (BPA). C’est la performance sur la période.', 'Bilan : ce que l’entreprise possède (actifs) et doit (dettes) à une date, la différence étant les capitaux propres.', 'Flux de trésorerie : l’argent réellement encaissé et décaissé. Le bénéfice est une opinion comptable, le flux de trésorerie est un fait.'] },
        { h: 'Les ratios à calculer chaque fois' },
        { ul: ['Marge d’exploitation = résultat d’exploitation ÷ revenus : la rentabilité de l’activité.', 'Flux d’exploitation ÷ bénéfice net : près de 100 % ou plus, c’est sain. Sous 70 % de façon durable, méfie-toi.', 'Dette nette ÷ BAIIA : au-delà de 3 à 4 fois, la dette devient un risque, surtout quand les taux montent.', 'Créances en jours de ventes : si elles gonflent plus vite que les ventes, le client ne paie peut-être pas.'] },
        { tip: 'Les fraudes et les maquillages comptables laissent presque toujours la même trace : le bénéfice monte, mais la trésorerie ne suit pas, et les créances grimpent.' },
      ],
      quiz: [
        { q: 'Quel état montre l’argent réellement encaissé et décaissé ?', o: ['L’état des résultats', 'Le tableau des flux de trésorerie', 'Le bilan'], a: 1, e: 'Le tableau des flux de trésorerie suit la trésorerie réelle, sans les estimations comptables.' },
        { q: 'Le bénéfice net monte, mais le flux d’exploitation baisse et les créances grimpent. Que soupçonner ?', o: ['Des ventes peu ou pas encaissées, donc des profits de mauvaise qualité', 'Une meilleure efficacité', 'Un dividende qui va augmenter'], a: 0, e: 'Des profits comptabilisés mais non encaissés sont le signal classique d’une comptabilité agressive.' },
        { q: 'Une dette nette de 5 fois le BAIIA signifie…', o: ['qu’il faut cinq ans de BAIIA pour la rembourser, un levier élevé', 'que l’entreprise est très liquide', 'que le dividende est garanti'], a: 0, e: 'Plus ce ratio est élevé, plus une baisse des revenus ou une hausse des taux fait mal.' },
        { q: 'La marge d’exploitation mesure…', o: ['la part des revenus qui reste après les charges d’exploitation', 'le rendement du dividende', 'la croissance des ventes'], a: 0, e: 'Résultat d’exploitation ÷ revenus : la rentabilité de l’activité courante.' },
      ],
    },
    {
      id: 'valuation', title: 'Valoriser : P/E, P/B et valeur actualisée', mins: 5,
      intro: 'Un bon titre n’est pas toujours une bonne affaire. La valorisation compare ce que tu paies à ce que l’entreprise génère, et dit si les attentes sont déjà dans le prix.',
      body: [
        { p: 'Aucun multiple n’est vrai en soi. Il se lit contre la croissance, la qualité, le secteur et le niveau des taux.' },
        { ul: ['P/E (cours ÷ bénéfice par action) : combien tu paies pour un dollar de bénéfice. Un P/E de 30 n’est pas cher pour une société qui double ses bénéfices, et l’est pour une société stagnante.', 'P/B (cours ÷ valeur comptable) : pertinent pour les banques et les entreprises à gros actifs.', 'Rendement du flux de trésorerie libre : le flux disponible ÷ la capitalisation. Difficile à truquer.', 'Rendement du dividende : utile, mais un rendement très élevé peut annoncer une coupure.'] },
        { h: 'Pourquoi les taux comptent' },
        { p: 'La valeur d’une société est la valeur actualisée de ses flux futurs. Quand les taux montent, on actualise plus fort : les sociétés dont les flux sont lointains (technologie, services publics) perdent le plus. Les banques, elles, profitent souvent de marges plus larges.' },
        { tip: 'Une action « bon marché » peut être un piège : un P/E bas avec des bénéfices qui reculent est souvent mérité. Cherche un prix bas par rapport à des bénéfices qui tiennent.' },
      ],
      quiz: [
        { q: 'Un P/E de 8 est-il toujours une bonne affaire ?', o: ['Oui, c’est toujours bon marché', 'Non : si les bénéfices s’effondrent, le multiple bas est mérité (piège de valeur)', 'Oui, si le titre paie un dividende'], a: 1, e: 'Le multiple se juge avec la tendance des bénéfices : un faible P/E sur des bénéfices en chute est un piège.' },
        { q: 'Que font des taux d’intérêt plus élevés aux sociétés à flux lointains (technologie) ?', o: ['Ils les rendent plus précieuses', 'Ils réduisent leur valeur actualisée', 'Aucun effet'], a: 1, e: 'Plus le taux d’actualisation monte, plus les flux éloignés valent peu aujourd’hui.' },
        { q: 'Quel indicateur est le plus difficile à maquiller ?', o: ['Le bénéfice par action', 'Le rendement du flux de trésorerie libre', 'Le chiffre d’affaires déclaré'], a: 1, e: 'La trésorerie réelle est plus difficile à manipuler que les écritures comptables.' },
        { q: 'Un rendement de dividende de 12 % doit te faire penser…', o: ['à un cadeau', 'qu’une coupure du dividende est peut-être attendue par le marché', 'que l’action va doubler'], a: 1, e: 'Un rendement exceptionnel signale souvent que le prix a chuté parce que le dividende est jugé fragile.' },
      ],
    },
    {
      id: 'earnings', title: 'La saison des résultats : consensus et surprises', mins: 4,
      intro: 'Le prix bouge rarement parce que les résultats sont bons. Il bouge parce qu’ils sont meilleurs ou pires que ce que le marché attendait. C’est la règle qui gouverne chaque publication.',
      body: [
        { ul: ['Le consensus est la moyenne des prévisions d’analystes. Il est déjà dans le prix.', 'La surprise = résultat réel moins consensus. Une bonne nouvelle déjà attendue ne fait rien.', 'Les perspectives de la direction (guidance) pèsent souvent plus que le trimestre écoulé : le marché achète l’avenir.', 'Après une surprise, le prix continue souvent dans le même sens quelques semaines : c’est la dérive post-publication.'] },
        { h: 'Où chercher l’avantage' },
        { ul: ['Les analystes prolongent la tendance : repère les marges qui s’améliorent plus vite que prévu.', 'Compare le bénéfice au flux de trésorerie : un écart croissant précède souvent une déception.', 'Regarde les créances et les stocks : ce sont les premiers endroits où les excès se voient.'] },
        { tip: 'Ne parie pas sur « de bons résultats ». Parie sur des résultats meilleurs que le consensus, ou sur un consensus trop optimiste.' },
      ],
      quiz: [
        { q: 'Une société publie un bénéfice record, mais le titre chute. Pourquoi est-ce possible ?', o: ['Le record était déjà attendu, ou les perspectives sont décevantes', 'Les marchés sont irrationnels, rien d’autre', 'Le dividende est trop bas'], a: 0, e: 'Le prix réagit à l’écart avec les attentes et aux perspectives, pas au niveau absolu des résultats.' },
        { q: 'Qu’est-ce que le consensus ?', o: ['La moyenne des prévisions d’analystes', 'Le prix cible du président', 'Le nombre d’actions vendues'], a: 0, e: 'C’est la référence contre laquelle la surprise est mesurée.' },
        { q: 'La dérive post-publication désigne…', o: ['la tendance du prix à poursuivre dans le sens de la surprise', 'une baisse du volume', 'l’augmentation des frais'], a: 0, e: 'Après une surprise, les prix ajustent progressivement : le mouvement se prolonge souvent.' },
        { q: 'Quel signal peut annoncer une déception avant la publication ?', o: ['Des créances qui montent plus vite que les ventes', 'Un nom plus court', 'Un volume de transactions élevé'], a: 0, e: 'Des ventes mal encaissées sont un signal avancé de problèmes comptables ou commerciaux.' },
      ],
    },
    {
      id: 'techapplied', title: 'Analyse technique appliquée : tendance, cassure, stop', mins: 5,
      intro: 'L’analyse technique ne devine pas l’avenir : elle organise la décision. Où entrer, où sortir si tu as tort, combien risquer. Voici le noyau, sans mythologie.',
      body: [
        { ul: ['Tendance : plus hauts et plus bas croissants (haussière) ou décroissants (baissière). Une moyenne mobile qui monte avec le prix au-dessus d’elle résume bien la tendance.', 'Support et résistance : zones où le prix a déjà réagi. Une cassure confirmée par un volume élevé est plus fiable qu’une cassure sans volume.', 'Fausse cassure : le prix dépasse le niveau, puis revient. Elle piège ceux qui entrent sans stop.', 'RSI : mesure d’élan. Au-dessus de 70 n’est pas « vends » : en forte tendance, il peut rester longtemps.'] },
        { h: 'Le stop et le multiple R' },
        { p: 'Le stop se place là où ton idée est invalidée, pas là où ça « fait mal ». L’ATR (amplitude moyenne) sert de règle : un stop à 1,5 ATR évite d’être sorti par le bruit normal. Le risque (R) est la distance entrée-stop ; viser 2 R pour 1 R de risque suffit à être rentable en gagnant un tiers du temps.' },
        { tip: 'Mesure tes résultats par contexte : acheter dans une tendance haussière et acheter contre la tendance n’ont pas la même espérance. Le mode Flash technique te le montre en chiffres.' },
      ],
      quiz: [
        { q: 'Où placer un stop-loss ?', o: ['À un montant fixe que tu peux supporter, peu importe le graphique', 'Là où ton idée de trade est invalidée, en tenant compte de l’ATR', 'Le plus près possible du prix d’entrée'], a: 1, e: 'Un stop trop serré se fait sortir par le bruit ; il doit correspondre à l’invalidation de ton idée.' },
        { q: 'Avec un objectif à 2 R, quelle réussite minimale rend la stratégie rentable avant frais ?', o: ['50 %', 'Environ 34 %', '80 %'], a: 1, e: 'Gagner 2 R une fois sur trois et perdre 1 R les deux autres fois donne un résultat nul : au-delà de 33 %, c’est positif.' },
        { q: 'Une cassure de résistance sans volume est…', o: ['plus fiable qu’avec volume', 'moins fiable : elle risque d’être une fausse cassure', 'sans importance'], a: 1, e: 'Le volume confirme l’engagement des acheteurs ; sans lui, la cassure échoue plus souvent.' },
        { q: 'Un RSI à 75 en forte tendance haussière signifie…', o: ['qu’il faut vendre à découvert immédiatement', 'que l’élan est fort ; il peut rester suracheté longtemps', 'que le prix va s’effondrer'], a: 1, e: 'Le RSI mesure l’élan : en tendance forte, il reste souvent élevé sans retournement.' },
      ],
    },
    {
      id: 'ips', title: 'L’énoncé de politique de placement', mins: 5,
      intro: 'Un gestionnaire ne « choisit pas des actions ». Il applique un mandat. L’énoncé de politique de placement (EPP) est le contrat qui dit quoi viser, combien de risque prendre et ce qui est interdit.',
      body: [
        { h: 'Objectifs et contraintes' },
        { ul: ['Objectif de rendement : ce qu’il faut gagner (par exemple inflation plus 4 %) pour atteindre le but du client.', 'Tolérance au risque : capacité (situation financière) et volonté (tempérament). On retient la plus faible des deux.', 'Contraintes : horizon, liquidité (retraits à payer), fiscalité, règles légales, et les circonstances particulières (exclusions éthiques, concentration existante).'] },
        { h: 'Du mandat à la décision' },
        { ul: ['L’allocation stratégique (politique) fixe les poids cibles à long terme et l’indice de référence.', 'L’allocation tactique s’en écarte de façon limitée quand tu as une conviction.', 'Le rééquilibrage ramène le portefeuille vers la cible quand il dérive : calendrier ou bandes de tolérance.'] },
        { tip: 'Respecter l’EPP prime sur la performance. Un gestionnaire qui bat l’indice en dépassant ses limites a manqué à son devoir.' },
      ],
      quiz: [
        { q: 'Quand la capacité et la volonté de prendre du risque diffèrent, on retient…', o: ['la plus élevée', 'la plus faible des deux', 'la moyenne'], a: 1, e: 'Le client ne doit jamais être exposé au-delà de ce qu’il peut ou veut supporter : on prend la plus prudente.' },
        { q: 'Le rôle de l’allocation stratégique est de…', o: ['fixer les poids cibles à long terme et l’indice de référence', 'prévoir les marchés du prochain mois', 'choisir les titres du jour'], a: 0, e: 'C’est le cadre de long terme dont l’allocation tactique ne s’écarte que de façon limitée.' },
        { q: 'Une fondation exclut l’énergie fossile. C’est…', o: ['une contrainte de circonstances particulières', 'un objectif de rendement', 'une mesure de risque'], a: 0, e: 'Les exclusions éthiques ou de concentration font partie des circonstances particulières de l’EPP.' },
        { q: 'Un gestionnaire bat l’indice de 2 % mais dépasse la limite de perte de l’EPP. Verdict ?', o: ['Excellent, le rendement compte seul', 'Manquement : la contrainte est un contrat', 'Sans importance si le client est content'], a: 1, e: 'Respecter les contraintes du mandat est le premier devoir du gestionnaire.' },
      ],
    },
    {
      id: 'metrics', title: 'Mesurer la performance : Sharpe, erreur de suivi, alpha', mins: 5,
      intro: 'Un rendement seul ne dit rien. Il faut le comparer au risque pris et à un indice de référence. Voici le vocabulaire standard d’un comité de placement.',
      body: [
        { ul: ['Volatilité : l’écart-type des rendements, annualisé. C’est l’ampleur typique des fluctuations.', 'Ratio de Sharpe = (rendement − taux sans risque) ÷ volatilité. Combien de rendement par unité de risque.', 'Ratio de Sortino : comme Sharpe, mais ne compte que le risque à la baisse.', 'Perte maximale (drawdown) : la pire chute depuis un sommet. C’est ce que le client ressent vraiment.', 'VaR : la perte qu’on ne dépasse pas dans 95 % des mois (méthode historique).'] },
        { h: 'Contre l’indice' },
        { ul: ['Erreur de suivi : volatilité de l’écart entre ton portefeuille et l’indice.', 'Ratio d’information = rendement actif ÷ erreur de suivi : la qualité de ta gestion active.', 'Bêta : la sensibilité à l’indice. Alpha de Jensen : le rendement qui n’est pas expliqué par le bêta.', 'Capture à la hausse et à la baisse : combien du marché tu prends dans les mois positifs et négatifs.'] },
        { tip: 'Un alpha positif durable avec une faible erreur de suivi est rare. Un haut rendement avec un Sharpe médiocre a surtout été payé en risque.' },
      ],
      quiz: [
        { q: 'Le ratio de Sharpe mesure…', o: ['le rendement par unité de risque total', 'la perte maximale', 'les frais de gestion'], a: 0, e: 'Rendement excédentaire sur le taux sans risque, divisé par la volatilité.' },
        { q: 'Que mesure l’erreur de suivi ?', o: ['La volatilité de l’écart entre le portefeuille et son indice', 'Les erreurs de transaction', 'Le rendement actif'], a: 0, e: 'Plus elle est élevée, plus le portefeuille s’écarte de l’indice, dans les deux sens.' },
        { q: 'Une capture à la baisse de 70 % veut dire…', o: ['que tu as subi 70 % des baisses de l’indice : bonne protection', 'que tu as perdu 70 %', 'que tu as battu l’indice de 70 %'], a: 0, e: 'Moins de 100 % à la baisse signifie que le portefeuille a mieux protégé le capital que l’indice.' },
        { q: 'Le bêta d’un portefeuille est de 1,3. Si l’indice monte de 10 %, on s’attend à…', o: ['+13 %, toutes choses égales', '+10 %', '+7,7 %'], a: 0, e: 'Le bêta est la sensibilité à l’indice : 1,3 × 10 % = 13 %.' },
      ],
    },
    {
      id: 'diversify', title: 'Diversification, corrélation et rééquilibrage', mins: 4,
      intro: 'La diversification est le seul repas gratuit de la finance, mais seulement si les actifs ne bougent pas tous ensemble. Les corrélations changent justement quand on a le plus besoin d’elles.',
      body: [
        { ul: ['Corrélation : de −1 (opposés) à +1 (identiques). Moins elle est élevée, plus la diversification aide.', 'Le risque d’un portefeuille n’est pas la moyenne des risques : il dépend des corrélations.', 'Contribution au risque : un actif de 10 % du poids mais très volatil peut peser 25 % du risque.', 'En crise, les corrélations montent vers 1 : les actions chutent ensemble, d’où l’intérêt des obligations d’État, de l’encaisse et parfois de l’or.'] },
        { h: 'Rééquilibrer' },
        { p: 'Sans action, les gagnants gonflent et le risque dérive. Rééquilibrer vend un peu de ce qui a monté et achète ce qui a baissé : une discipline contre-intuitive, mais qui maintient le niveau de risque voulu. Chaque échange coûte des frais : on rééquilibre par bandes de tolérance, pas à chaque variation.' },
        { tip: 'Diversifier ne veut pas dire détenir beaucoup de titres. Dix actions du même secteur ne diversifient presque rien.' },
      ],
      quiz: [
        { q: 'Deux actifs de corrélation +1 apportent comme diversification…', o: ['beaucoup', 'aucune', 'une réduction de moitié du risque'], a: 1, e: 'Parfaitement corrélés, ils bougent identiquement : aucune réduction du risque.' },
        { q: 'En période de crise, les corrélations entre actions tendent à…', o: ['baisser', 'monter vers 1', 'rester constantes'], a: 1, e: 'Les actifs risqués chutent ensemble : la diversification entre actions protège moins qu’on le croit.' },
        { q: 'Pourquoi rééquilibrer ?', o: ['Pour maintenir le niveau de risque voulu quand les poids dérivent', 'Pour acheter toujours les gagnants', 'Pour maximiser les frais'], a: 0, e: 'Les poids dérivent avec les prix ; le rééquilibrage ramène le risque vers la cible de la politique.' },
        { q: 'Un actif de 10 % du poids peut représenter 25 % du risque si…', o: ['il est très volatil ou très corrélé au reste', 'il paie un dividende', 'il est coté au Canada'], a: 0, e: 'La contribution au risque dépend du poids, de la volatilité et des corrélations.' },
      ],
    },
    {
      id: 'patterns', title: 'Les figures chartistes', mins: 4,
      intro: 'Certaines formes reviennent parce qu’elles résument un rapport de force. Aucune ne garantit quoi que ce soit : elles donnent un scénario, un point d’invalidation et un objectif mesuré.',
      body: [
        { fig: 'patterns' },
        { ul: ['Double sommet : deux hauts au même niveau puis cassure de la ligne de cou : signal baissier. Le double creux est son miroir.', 'Épaule-tête-épaule : trois hauts, celui du milieu plus élevé, puis cassure de la ligne de cou.', 'Triangle ascendant : résistance plate et creux de plus en plus hauts ; la cassure se fait souvent vers le haut.', 'Drapeau : forte impulsion puis courte consolidation inclinée ; la tendance reprend souvent.'] },
        { h: 'Comment s’en servir' },
        { ul: ['L’entrée est la cassure confirmée (clôture au-delà de la ligne, idéalement avec volume).', 'Le stop se place de l’autre côté de la figure : si le prix y retourne, la figure est invalidée.', 'L’objectif mesuré reprend la hauteur de la figure à partir de la cassure.'] },
        { tip: 'Une figure n’est complète qu’à la cassure. Avant, c’est une hypothèse : beaucoup de « doubles sommets » ne sont que des pauses.' },
      ],
      quiz: [
        { q: 'À quel moment un double sommet est-il confirmé ?', o: ['Dès que le deuxième sommet apparaît', 'Quand le prix casse la ligne de cou vers le bas', 'Quand le volume baisse'], a: 1, e: 'Sans cassure de la ligne de cou, la figure n’est qu’une hypothèse.' },
        { q: 'Où place-t-on le stop d’un trade pris sur une cassure de triangle ascendant ?', o: ['Loin, pour ne jamais être sorti', 'De l’autre côté de la figure, là où elle serait invalidée', 'Au prix d’entrée exactement'], a: 1, e: 'Le stop correspond à l’invalidation de la figure.' },
        { q: 'L’objectif mesuré d’une figure est en général…', o: ['la hauteur de la figure reportée depuis la cassure', 'le double du prix d’entrée', 'le plus haut de l’année'], a: 0, e: 'On reporte la hauteur de la figure depuis le point de cassure.' },
        { q: 'Un drapeau haussier annonce…', o: ['un renversement de tendance', 'une pause avant une probable reprise de la hausse', 'une faillite'], a: 1, e: 'Après une forte impulsion, une courte consolidation précède souvent la reprise.' },
      ],
    },
  );
  // illustrations : tracés schématiques (pas des données réelles)
  const fig = (title, pts, extra = '') => '<figure class="fig-card"><svg viewBox="0 0 200 110" class="fig" role="img" aria-label="' + title + '"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' + extra + '</svg><figcaption>' + title + '</figcaption></figure>';
  const dash = (x1, y1, x2, y2, c = '#d81e27') => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-dasharray="4 3"/>';
  TA.FIGURES = TA.FIGURES || {};
  TA.FIGURES.patterns = () => '<div class="fig-grid">' + [
    fig('Double sommet', '10,90 40,40 70,70 100,40 130,75 160,95 190,105', dash(0, 72, 200, 72)),
    fig('Double creux', '10,20 40,70 70,45 100,70 130,40 160,18 190,8', dash(0, 45, 200, 45, '#0b3fd6')),
    fig('Épaule-tête-épaule', '10,90 30,55 50,75 80,25 110,75 130,55 150,80 175,100', dash(0, 76, 200, 76)),
    fig('Triangle ascendant', '10,95 40,40 60,75 90,40 110,62 140,40 160,52 190,15', dash(0, 40, 160, 40, '#0b3fd6')),
    fig('Drapeau haussier', '10,100 50,30 70,38 90,32 110,46 135,40 190,5'),
    fig('Cassure de résistance', '10,70 40,45 60,60 90,42 120,58 150,42 170,25 190,10', dash(0, 42, 200, 42, '#0b3fd6')),
  ].join('') + '</div>';
})();
