/* Trading Academy — campagne : mise en scène, chapitres 6 à 10, dilemmes et épilogue (suite de camp-story.js). */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CS = TA.CAMPSTORY;
  if (!CS) return;
  const { C, L, K, T, V, N, G, M, P, sc } = CS.helpers;

  /* ========== Chapitre 6 : dans les livres de Karim ========== */
  sc(51, 'Lundi · 9 h 00 · bureau de Karim', [
    M('Le bureau de Karim ressemble à une bibliothèque qui aurait explosé : des rapports annuels en équilibre sur chaque surface.'),
    K('« Voici Nordmétal : équipements miniers, trois mille employés, un titre que beaucoup de gens adorent en ce moment. Premier document : le compte de résultat. »'),
    P('Que cherche-t-on ?'),
    K('« D’abord ce qu’il dit. Ensuite ce qu’il cache. »'),
  ], ['Lis ce compte de résultat. Que dit-il ?', 'Même document, autre ligne.', 'Une dernière lecture avant de tourner la page.'],
  [K('Tu sais lire la première page. Les pièges, eux, se cachent dans la suite.')]);
  sc(52, 'Lundi · 11 h 15 · bureau de Karim', [
    K('« Les ventes de Nordmétal montent. Mais gagne-t-on mieux sa vie en vendant plus ? »'),
    T('Théo bâille. « On dirait de la comptabilité. »'),
    K('« C’est de la comptabilité. Et c’est ce qui révèle les mensonges. »'),
  ], ['Calcule la marge d’exploitation.', 'Même calcul, autre société.'],
  [K('La marge est le thermomètre de l’activité. Tu sais le lire.')]);
  sc(53, 'Lundi · 15 h 30 · bureau de Karim', [
    T('« Le bénéfice a monté de 12 % : c’est bon ! »'),
    K('« Par action ? Il y a eu des émissions d’actions. »'),
    P('Je vérifie par le calcul avant de répondre.'),
  ], ['Calcule le bénéfice par action, puis sa croissance.', 'Une autre société, même méthode.'],
  [K('Le bénéfice total monte, le BPA recule : voilà ce qu’on appelle de la dilution. Bien vu.')]);
  sc(54, 'Mardi · 9 h 20 · bureau de Karim', [
    K('« Le bilan est une photo : ce qu’on possède, ce qu’on doit, ce qui reste aux actionnaires. »'),
    P('Et celui de Nordmétal ?'),
    K('« Regarde les dettes. Elles ont doublé en deux ans. »'),
  ], ['Que représente cette ligne du bilan ?', 'Une autre ligne, même document.'],
  [K('Actifs égalent dettes plus capitaux propres : l’équation que tout le reste respecte.')]);
  sc(55, 'Mardi · 13 h 45 · bureau de Karim', [
    K('« Nordmétal a doublé sa dette en deux ans. La question : combien d’années de bénéfices pour la rembourser ? »'),
    T('« Si ça rapporte, c’est bien d’emprunter. »'),
    K('« Tant que ça rapporte. Et tant que le prêteur est patient. »'),
  ], ['Calcule la dette nette sur le BAIIA.', 'Même mesure pour une autre société.'],
  [K('Au-delà de quelques années de bénéfices, la dette devient le sujet principal. Retiens le chiffre.')]);
  sc(56, 'Mercredi · 9 h 40 · bureau de Karim', [
    K('« Le bénéfice est une opinion comptable. Le flux de trésorerie, c’est de l’argent réel. »'),
    P('Les deux ne disent pas la même chose ?'),
    K('« Pas toujours. Cherche la différence. »'),
  ], ['Que montre ce tableau des flux ?', 'Une autre section du tableau.'],
  [K('Exploitation, investissement, financement : trois sources, trois histoires.')]);
  sc(57, 'Mercredi · 14 h 30 · bureau de Karim', [
    K('« Ce qui reste après avoir investi : le flux libre. C’est ce que les actionnaires peuvent vraiment recevoir. »'),
    L('Léa, de passage : « Un graphique sans flux libre, c’est une histoire sans fin. »'),
  ], ['Calcule le flux de trésorerie libre.', 'Même calcul, autre société.'],
  [K('Le flux libre ne ment presque jamais. Garde-le sous la main.')]);
  sc(58, 'Jeudi · 9 h 10 · bureau de Karim', [
    K('« Voilà ce qui m’inquiète chez Nordmétal : un bénéfice qui monte, un flux qui baisse. »'),
    P('Des ventes non encaissées ?'),
    K('« Peut-être. Montre-moi laquelle des sociétés présente ce signal. »'),
  ], ['Laquelle de ces sociétés présente un bénéfice qui ne devient pas du flux ?', 'Même question, autre trio.'],
  [K('Bénéfice sans flux : c’est le premier symptôme. Souvent, ce n’est pas le dernier.')]);
  sc(59, 'Jeudi · 15 h 00 · bureau de Karim', [
    K('« Les créances de Nordmétal, en jours de ventes : 48, 61, 79. Quelqu’un vend à crédit des produits que personne ne paie. »'),
    T('« Peut-être que les clients sont lents ? »'),
    K('« Ou peut-être que les clients n’existent pas vraiment. Calcule. »'),
  ], ['Calcule les créances en jours de ventes.', 'Cette hausse des créances est-elle un signal d’alarme ?'],
  [K('Les créances qui explosent : un classique des mauvaises surprises. Tu viens de le voir à l’œuvre.')]);
  sc(60, 'Vendredi · 10 h 00 · bureau de Karim', [
    K('Karim pose le dossier devant toi. « Voici ton diagnostic : marge, croissance, dette, flux, créances. Que dit Nordmétal ? »'),
    C('Cécile entre. « Vallier a recommandé Nordmétal à ses clients cette semaine. »'),
    T('« Mon oncle veut en acheter. Il dit que c’est “l’affaire de la décennie”. »'),
  ], ['Premier verdict : la marge et la croissance.', 'Deuxième verdict : le bilan et la dette.', 'Troisième : le flux.', 'Quatrième : les créances.', 'Dernier point du dossier.'],
  [K('Diagnostic posé : bénéfices supérieurs aux flux, créances qui explosent. Nous n’en voulons pas, et nous le consignons par écrit.')]);

  /* ========== Chapitre 7 : combien ça vaut ? ========== */
  sc(61, 'Lundi · 9 h 30 · bureau de Karim', [
    M('Une rumeur d’acquisition traverse la salle. Les écrans clignotent.'),
    K('« Un bon titre n’est pas une bonne affaire. Tout dépend du prix payé. Commençons par le P/E : combien paies-tu pour un dollar de bénéfice ? »'),
  ], ['Calcule le P/E de cette société.', 'Même calcul, autre société.'],
  [K('Le P/E est le début de la conversation, jamais sa fin.')]);
  sc(62, 'Lundi · 14 h 15 · bureau de Karim', [
    K('« Pour une banque, le P/E ne dit pas tout. Le P/B compare le prix à la valeur comptable, et le ROE mesure ce qu’elle en fait. »'),
    T('« Deux ratios de plus à retenir. »'),
    K('« Un seul métier : savoir quel ratio convient à quelle société. »'),
  ], ['Calcule le ratio demandé pour cette banque.', 'Le ROE : combien rapporte chaque dollar de capital ?'],
  [K('Le bon ratio pour la bonne société. Tu y viens.')]);
  sc(63, 'Mardi · 10 h 00 · bureau de Karim', [
    G('Gilberte rappelle. « Je vis de mes dividendes, moi. Vous m’avez trouvé un titre à 9 % ? »'),
    K('« Un rendement très élevé est souvent un avertissement. Calculons ce que ce dividende représente vraiment. »'),
  ], ['Calcule le rendement du dividende.', 'Ce dividende est-il couvert par les bénéfices ?'],
  [G('Un rendement trop beau pour être vrai, c’est ce que ma mère appelait un piège à moineaux. Merci de m’avoir prévenue.')]);
  sc(64, 'Mardi · 15 h 20 · bureau de Karim', [
    K('« Le flux libre rapporté à la capitalisation : difficile à maquiller. C’est mon ratio préféré. »'),
    L('« Tu peux gonfler un bénéfice. Gonfler du cash, c’est une autre histoire. »'),
  ], ['Calcule le rendement du flux libre.', 'Même ratio, autre société.'],
  [K('Quand le flux libre rapporte plus que les obligations, ça mérite attention.')]);
  sc(65, 'Mercredi · 9 h 50 · bureau de Karim', [
    T('« Ce titre a un P/E de 40, c’est beaucoup trop cher ! »'),
    K('« Et sa croissance ? »'),
    T('« Euh… 30 % par an. »'),
    K('« Alors il est peut-être moins cher que tu ne penses. Calcule le PEG. »'),
  ], ['Calcule le PEG de ce titre.', 'Même ratio sur un autre titre.'],
  [K('Le PEG relie le prix à la croissance. Un P/E élevé n’est pas toujours cher.')]);
  sc(66, 'Mercredi · 14 h 00 · bureau de Karim', [
    K('« Trois sociétés du même secteur, mêmes ratios. La moins chère n’est pas toujours celle qu’on croit. »'),
    P('Comment décider ?'),
    K('« On les aligne côte à côte. »'),
  ], ['Trois sociétés, mêmes ratios : laquelle est la moins chère à qualité égale ?', 'Un autre trio, une autre décision.'],
  [K('Comparer, c’est la seule façon de savoir si le prix est bon.')]);
  sc(67, 'Jeudi · 9 h 15 · bureau de Karim', [
    M('Un message s’affiche sur l’écran de Théo. Étienne Vallier recommande Nordmétal : « P/E de six fois. Affaire de la décennie. »'),
    K('« Un P/E bas n’est pas une aubaine si les bénéfices ne sont pas réels. Le prix bas est souvent mérité. »'),
    T('« Mais six fois, c’est bas ! »'),
  ], ['Ce P/E bas est-il une aubaine ou un piège ?', 'Un autre titre bon marché : que cache-t-il ?'],
  [K('Tu viens de distinguer un titre bon marché d’un titre mérité. Garde cette image.')]);
  sc(68, 'Jeudi · 13 h 40 · bureau de Karim', [
    K('« À prix égal, je prends la société de qualité : rentable, au bilan sain, aux bénéfices bien encaissés. »'),
    L('« Moi, je prends celle dont le graphique me plaît. »'),
    K('« Léa, on n’est pas dans le même débat. »'),
  ], ['Laquelle de ces sociétés est de meilleure qualité ?', 'Même exercice sur un autre trio.'],
  [K('La qualité d’abord : c’est ce qui sauve un portefeuille quand le marché se retourne.')]);
  sc(69, 'Vendredi · 9 h 30 · bureau de Karim', [
    K('« Une action vaut la somme de ses flux futurs, actualisés. Change le taux d’actualisation, et tout change. »'),
    T('« J’ai pris 5 %… on peut dire 4 ? »'),
    K('« Tu veux justifier le prix ou le calculer ? »'),
  ], ['Calcule la valeur actualisée.', 'Que se passe-t-il si le taux monte ?'],
  [K('L’actualisation, c’est le temps converti en prix. Tu viens d’apprendre l’essentiel.')]);
  sc(70, 'Vendredi · 16 h 30 · bureau de Karim', [
    C('« Trois sociétés, un client, une rumeur d’acquisition. »'),
    K('« Choisis la meilleure affaire. Et justifie chaque ratio : le client veut comprendre. »'),
    M('Le téléphone vibre : numéro masqué.'),
  ], ['Premier ratio : combien paie-t-on ?', 'Qualité des bénéfices.', 'Le piège de valeur ?', 'Valeur actualisée.', 'Dernier verdict.'],
  [K('La rumeur s’est dégonflée. Les titres que tu as écartés ont perdu 20 % en deux semaines. Les chiffres, eux, n’ont pas menti.')]);

  /* ========== Chapitre 8 : la saison des résultats ========== */
  sc(71, 'Lundi · 7 h 50 · salle des marchés', [
    M('Les résultats trimestriels tombent ce matin. La salle est tendue : tout le monde fixe l’écran.'),
    K('« Le prix ne bouge pas parce que les résultats sont bons. Il bouge parce qu’ils sont meilleurs que ce que le marché attendait. »'),
  ], ['Qu’est-ce que le consensus, et pourquoi compte-t-il ?', 'Calcule l’écart avec le consensus.'],
  [K('Le consensus est déjà dans le prix. Seul l’écart compte.')]);
  sc(72, 'Lundi · 9 h 10 · salle des marchés', [
    T('« Le BPA est de 1,10 $ ! Le consensus était de 1,05 $ ! »'),
    K('« Calcule la surprise en pourcentage. Est-elle “en ligne” ou franchement positive ? »'),
  ], ['Calcule la surprise en pourcentage.', 'Autre publication, même mesure.'],
  [K('Une surprise se mesure, elle ne se devine pas. Tu viens de le faire.')]);
  sc(73, 'Mardi · 8 h 30 · salle des marchés', [
    K('« Le trimestre est derrière nous. Le marché achète l’avenir : lis la guidance. »'),
    L('« Un très bon trimestre avec une guidance en baisse, c’est une chute de 10 % le lendemain. »'),
  ], ['Que dit la guidance sur la suite ?', 'Cette perspective est-elle plus ou moins bonne que prévu ?'],
  [K('La guidance pèse souvent plus que le chiffre du trimestre. Tu lis l’avenir au lieu du passé.')]);
  sc(74, 'Mardi · 11 h 40 · salle des marchés', [
    M('Le communiqué de Nordmétal est enthousiaste : « record », « croissance exceptionnelle », « cap vers l’excellence ». Aucune mention des flux.'),
    K('« Le ton ne prouve rien. Ce qu’on ne mentionne pas en dit souvent plus. »'),
  ], ['Que révèle ce ton sur la société ?', 'Qu’est-ce qui manque dans ce communiqué ?'],
  [K('Tu lis entre les lignes, mais tu vérifies avec des chiffres. C’est le bon équilibre.')]);
  sc(75, 'Mardi · 15 h 00 · salle des marchés', [
    K('« Une société endettée est sensible au moindre faux pas. Un baisse de ventes de 5 %, et le bénéfice fond de 20 %. »'),
    P('C’est l’effet de levier.'),
    K('« Exactement. Classe ces sociétés par fragilité. »'),
  ], ['Laquelle de ces sociétés est la plus sensible à un ralentissement ?', 'Même question, autre groupe.'],
  [K('Le levier amplifie tout, dans les deux sens. Tu en tiens compte, maintenant.')]);
  sc(76, 'Mercredi · 13 h 45 · salle des marchés', [
    C('« La banque centrale parle à 14 h. Tous les secteurs ne réagissent pas de la même façon. »'),
    K('« Les titres de croissance, dont les flux sont lointains, sont les plus sensibles aux taux. Les banques, elles, y trouvent parfois leur compte. »'),
  ], ['Que fait une hausse des taux à ce secteur ?', 'Quel secteur en profite ?'],
  [C('Un taux n’affecte jamais tout le monde pareil. Tu sais déjà qui gagne et qui perd.')]);
  sc(77, 'Jeudi · 9 h 25 · salle des marchés', [
    K('« La croissance des revenus mesure la demande avant toute manipulation de marges. Qui accélère ? »'),
    T('« Celui dont les ventes montent le plus ! »'),
    K('« Pas tout à fait. Celui dont la croissance s’accélère. »'),
  ], ['Laquelle de ces sociétés voit sa croissance accélérer ?', 'Même question, autre groupe.'],
  [K('L’accélération, pas le niveau : c’est ce que le marché récompense.')]);
  sc(78, 'Jeudi · 14 h 15 · salle des marchés', [
    K('« Une marge qui monte, c’est un levier opérationnel : chaque dollar de revenu en plus rapporte davantage. »'),
    L('« C’est ce que j’aime d’un graphique qui monte avec des marges qui suivent. »'),
  ], ['Laquelle améliore ses marges ?', 'Même question, autre trio.'],
  [K('La marge qui monte avec les ventes : le signe d’une société qui maîtrise ses coûts.')]);
  sc(79, 'Vendredi · 15 h 20 · salle des marchés', [
    M('Nordmétal publie dans quarante minutes. Dans la salle, tout le monde regarde Karim.'),
    K('« Ventes gonflées, créances en hausse, flux inférieur au bénéfice : montre-moi les traces. »'),
    N('Nadia Roy, la chef de la conformité, est entrée sans bruit. Elle s’adosse au mur. « Je suis là pour observer. »'),
  ], ['Quelle société présente les traces d’un gonflement des ventes ?', 'Même traque, autre groupe.'],
  [K('Tu as vu les traces avant le communiqué. C’est précisément ce qu’on attend d’un analyste.')]);
  sc(80, 'Vendredi · 16 h 05 · salle des marchés', [
    M('Nordmétal publie : les ventes ont été « reclassées », les créances douteuses sont passées de 40 à 160 millions. L’action chute de 38 % en une séance.'),
    C('« Nous n’étions pas exposés. Grâce à vous trois. »'),
    T('Théo est livide. « Mon oncle avait acheté. Vingt mille dollars… »'),
    K('« Passe-moi le dossier de la saison. On traverse ça proprement. »'),
  ], ['Surprise : calcule l’écart avec le consensus.', 'Quels signaux comptables auraient dû alerter ?', 'Quelle société reste de qualité ?', 'Qui souffre le plus de la hausse des taux ?', 'Dernière vérification du dossier.'],
  [C('Karim et Léa te recommandent. Le comité de placement veut te voir : il y a un vrai mandat à gérer.')]);

  /* ========== Chapitre 9 : le portefeuille de la Fondation ========== */
  sc(81, 'Lundi · 10 h 00 · salle du comité', [
    M('La Fondation Soleil confie 250 000 $ à la firme. À la tête du comité, une voix familière : Gilberte Beaulieu, la cliente du premier jour.'),
    G('« Je vous ai vu débuter. Voyons ce que vous valez. »'),
    C('« Un portefeuille n’est pas une collection de bons titres. C’est un ensemble qui doit respecter un mandat. »'),
  ], ['Calcule le rendement attendu du portefeuille.', 'Même calcul, autres poids.'],
  [G('Voilà qui est clair. Poursuivez.')]);
  sc(82, 'Lundi · 14 h 30 · salle du comité', [
    G('« Combien peut-on perdre ? Mon comité ne dort pas quand les marchés baissent. »'),
    C('« Le risque d’un portefeuille n’est pas la moyenne des risques. Il dépend des poids, des volatilités et de la corrélation. »'),
  ], ['Calcule la volatilité de ce portefeuille.', 'Même calcul, autre combinaison.'],
  [C('Le risque se calcule, il ne se devine pas. Madame Beaulieu a noté.')]);
  sc(83, 'Mardi · 9 h 40 · salle du comité', [
    K('« Deux actifs qui montent ensemble ne se protègent pas. C’est la corrélation qui compte. »'),
    L('« En 2008, tout est devenu corrélé. Ceux qui pensaient être diversifiés l’ont découvert. »'),
  ], ['Quelle paire d’actifs réduit le plus le risque ?', 'Même question, autres actifs.'],
  [K('La corrélation, c’est la mesure de la protection mutuelle. Tu viens de la manier.')]);
  sc(84, 'Mardi · 14 h 15 · salle du comité', [
    C('« Vallier a présenté dix actions technologiques comme une diversification. »'),
    L('« Dix chevaux de la même écurie. »'),
    G('« Ça me semblait déjà bizarre. »'),
  ], ['Ce portefeuille est-il vraiment diversifié ?', 'Quelle combinaison diversifie réellement ?'],
  [C('Dix titres du même secteur ne diversifient pas. Ton explication est exactement ce que Gilberte voulait entendre.')]);
  sc(85, 'Mercredi · 10 h 10 · salle du comité', [
    G('« Nous voulons préserver le capital et verser 4 % par an à nos programmes. »'),
    C('« Tolérance au risque : la plus faible entre la capacité et la volonté. Choisis l’allocation qui correspond. »'),
  ], ['Quelle allocation correspond à ce profil ?', 'Même exercice, autre profil.'],
  [G('Voilà ce qu’on attend d’un conseiller : écouter, puis décider.')]);
  sc(86, 'Mercredi · 15 h 30 · salle du comité', [
    M('Six mois ont passé. Les actions ont gagné 18 %.'),
    C('« Le portefeuille n’est plus celui que nous avons approuvé. Calcule la dérive. »'),
  ], ['Calcule les nouveaux poids après la hausse des actions.', 'Même exercice, autre portefeuille.'],
  [C('La dérive, c’est l’ennemie silencieuse : sans le voir, on prend plus de risque que prévu.')]);
  sc(87, 'Jeudi · 9 h 20 · salle du comité', [
    K('« Vendre un peu de ce qui a monté, acheter ce qui a pris du retard. Ça va contre l’instinct. »'),
    T('« On vend les gagnants ? »'),
    K('« On respecte le mandat. L’instinct, lui, n’a pas de mandat. »'),
  ], ['Calcule la transaction pour rééquilibrer.', 'Même calcul, autres montants.'],
  [K('Rééquilibrer, c’est acheter ce que tout le monde fuit. Pas facile, mais c’est la discipline.')]);
  sc(88, 'Jeudi · 14 h 00 · salle du comité', [
    N('Nadia Roy sort un document. « Actions maximales : 60 %. Dix pour cent par émetteur. Liquidité minimale : 5 %. Une contrainte violée, c’est une erreur à déclarer. »'),
    C('« On ne négocie pas avec l’énoncé de politique. »'),
  ], ['Cette proposition respecte-t-elle l’énoncé de politique ?', 'Quelle contrainte est violée ?', 'Même vérification, autre portefeuille.'],
  [N('L’énoncé, c’est la loi du client. Tu l’as respectée.')]);
  sc(89, 'Vendredi · 9 h 50 · salle du comité', [
    C('« Contre quoi nous jugera-t-on ? L’indice de référence doit être investissable, transparent, représentatif. »'),
    G('« Je ne veux pas que vous choisissiez l’indice qui vous arrange. »'),
  ], ['Quel indice de référence convient à ce mandat ?', 'Quel indice n’est pas un bon standard ici ?'],
  [C('Le bon indice rend la comparaison honnête. Madame Beaulieu y tenait.')]);
  sc(90, 'Vendredi · 16 h 00 · salle du comité', [
    C('« Le comité décide demain. Vallier s’est présenté avec un rendement attendu de 11 % et aucune contrainte. »'),
    G('« Je veux voir ce que vous, vous allez nous promettre. »'),
    C('« Le dossier complet : rendement, risque, dérive, contraintes, profil. »'),
  ], ['Rendement attendu du portefeuille proposé.', 'Risque de ce portefeuille.', 'La dérive et ses conséquences.', 'Les contraintes de l’énoncé.', 'Le profil du client.'],
  [G('Nous vous confions la Fondation. Vous avez parlé de risque, de contraintes et de ce qui peut mal tourner. Les autres promettaient seulement.')]);

  /* ========== Chapitre 10 : le grand mandat ========== */
  sc(91, 'Lundi · 9 h 00 · hôtel de ville', [
    M('Le régime de retraite des employés municipaux cherche un gestionnaire. Le comité d’investissement vous attend dans trois semaines.'),
    C('« Ils vont comparer sur le ratio de Sharpe. Sachons le calculer les yeux fermés. »'),
  ], ['Calcule le ratio de Sharpe de ce gestionnaire.', 'Compare avec un autre portefeuille.'],
  [C('Sharpe : le rendement obtenu par unité de risque. Tu l’as calculé comme le comité le fera.')]);
  sc(92, 'Lundi · 14 h 20 · hôtel de ville', [
    C('« Un retraité ne ressent pas la volatilité. Il ressent la perte maximale. »'),
    G('Gilberte est passée t’encourager : « C’est vrai. Je me souviens de 2008. »'),
  ], ['Calcule la perte maximale de ce portefeuille.', 'Quel portefeuille a subi le pire recul ?'],
  [C('La perte maximale, c’est le chiffre que le client garde en mémoire. Tu l’as mesurée.')]);
  sc(93, 'Mardi · 10 h 30 · hôtel de ville', [
    K('« Combien d’écart avec l’indice, et pour quel gain ? Le ratio d’information répond. »'),
    T('« C’est la même chose que Sharpe ? »'),
    K('« Presque. Mais le référentiel change : ici, on compare à l’indice. »'),
  ], ['Calcule le ratio d’information.', 'Quelle erreur de suivi ce gestionnaire a-t-il prise ?'],
  [K('Le ratio d’information mesure ce que vaut le risque pris par rapport à l’indice.')]);
  sc(94, 'Mardi · 15 h 10 · hôtel de ville', [
    K('« Le bêta explique ce que le marché t’a donné. L’alpha, c’est ce que tu as vraiment apporté. »'),
    T('« Et si le bêta fait tout le travail ? »'),
    K('« Alors le client paie cher pour quelque chose qu’il pouvait acheter pour presque rien. »'),
  ], ['Calcule le bêta de ce portefeuille.', 'Calcule l’alpha de Jensen.'],
  [K('Bêta et alpha : la frontière entre la chance du marché et la valeur ajoutée.')]);
  sc(95, 'Mercredi · 9 h 45 · hôtel de ville', [
    C('« D’où vient l’écart avec l’indice ? Surpondérations, sous-pondérations, choix de titres. Le comité le demandera. »'),
    L('« Ils vont aimer une explication qui se tient. »'),
  ], ['Quelle part de l’écart vient de l’allocation ?', 'Quelle part vient de la sélection de titres ?'],
  [C('Tu sais expliquer d’où vient la performance. C’est ce qui distingue un gestionnaire d’un chanceux.')]);
  sc(96, 'Mercredi · 14 h 30 · hôtel de ville', [
    N('Nadia Roy s’assoit en face de toi. « La première règle : le client passe avant. Convenance, transparence, déclaration des erreurs et des conflits. »'),
    P('Même quand ça nous coûte ?'),
    N('« Surtout quand ça nous coûte. »'),
  ], ['Que fait un professionnel dans cette situation ?', 'Quelle est la bonne conduite face à ce conflit d’intérêts ?', 'Que doit-on divulguer ?'],
  [N('Voilà les réflexes qu’on ne peut pas enseigner à la dernière minute. Bien.')]);
  sc(97, 'Jeudi · 17 h 15 · couloir de l’hôtel de ville', [
    M('Dans le couloir, Étienne Vallier te retient par le coude.'),
    V('« Une fusion sera annoncée lundi. Entre nous. Vous pourriez en profiter, sans que personne ne le sache. »'),
    N('Nadia surgit au bout du couloir. « Ça s’appelle de l’information privilégiée. »'),
    P('Non merci. Je ne veux pas le savoir.'),
  ], ['Que faire d’une information privilégiée ?', 'Quelle situation constitue un manquement ?'],
  [N('Tu as refusé sans hésiter. Vallier a souri, mais ce sourire-là n’avait plus rien de charmant.')]);
  sc(98, 'Vendredi · 9 h 00 · hôtel de ville', [
    C('« Technique et fondamental ensemble : lis un graphique, une société et une mesure de performance. »'),
    L('« Je te laisse seul(e) avec le graphique. »'),
    K('« Et moi avec les chiffres. À toi de les marier. »'),
  ], ['Applique la règle au graphique.', 'Analyse la société : que montrent les chiffres ?', 'Piège de valeur ou aubaine ?', 'Calcule la performance ajustée du risque.', 'La tendance confirme-t-elle ?'],
  [C('Graphique, société, performance : tu les as lus d’une seule traite. Plus que le dossier du comité.')]);
  sc(99, 'Lundi suivant · 8 h 30 · hôtel de ville', [
    C('« La veille du comité. Portefeuille, risque, contraintes, déontologie : le dossier complet. »'),
    N('« Si quelque chose manque, ils le verront. »'),
    T('Théo glisse un mot sur ton bureau : « Je serai dans la salle. Ne gâche pas ça. »'),
  ], ['Quelle paire d’actifs protège le mieux ?', 'Le profil du régime : quelle allocation ?', 'Corrige la dérive.', 'Cette décision respecte-t-elle l’énoncé de politique ?', 'Mesure le ratio d’information.', 'Dernier point d’éthique.'],
  [C('Tout y est. Cette nuit, relis ton dossier, puis dors. Demain, ça se joue.')]);
  sc(100, 'Mardi · 10 h 00 · salle du conseil de la Ville', [
    M('Salle du conseil. Vingt personnes en rangs. Au fond, Étienne Vallier, souriant. Cécile, Léa, Karim, Théo, Nadia et Gilberte sont derrière toi.'),
    C('« Tout ce que tu sais. Ils te poseront de tout. »'),
    V('« Je serai curieux de voir ce que ces gens ont fait de toi. »'),
  ], ['Une bougie, pour commencer : lis-la.', 'La tendance : qui contrôle le marché ?', 'Un indicateur à lire.', 'Une figure à reconnaître.', 'Le risque d’un trade.', 'Un état financier.', 'Un signal de qualité.', 'Un ratio de valorisation.', 'Un calcul de risque de portefeuille.', 'Un dilemme éthique.'],
  [M('Le président se lève. « Nous avons un gestionnaire. »')]);

  /* ---- dilemmes : un choix à la fin de chaque épreuve de chapitre ; ils n’affectent pas les étoiles ---- */
  CS.CHOICES = {
    10: { who: 'T', ask: 'Avant la présentation, Théo te montre sa fiche : il a fait une erreur de calcul sur le rendement de Gilberte. Si tu la corriges devant tout le monde, il perd la face. Si tu te tais, le comité reçoit un chiffre faux.', opts: [
      { t: 'Tu lui en parles en privé : il corrige avant la réunion.', r: [['T', '« Merci… Je te dois une. Je recalcule tout, deux fois. »']], v: 1 },
      { t: 'Tu laisses passer : ce n’est pas ton dossier.', r: [['M', 'Le comité reçoit le chiffre faux. Cécile le repère en trente secondes, et le regard qu’elle pose sur Théo est long.']], v: -1 },
      { t: 'Tu le corriges devant tout le monde.', r: [['C', '« Le chiffre était faux, exact. Mais la prochaine fois, on se parle avant. »']], v: 0 } ] },
    20: { who: 'T', ask: 'Théo a tout vendu au plus bas ce matin, et il te demande de lui dire qu’il a eu raison. Ce n’est pas vrai : la structure ne justifiait pas la panique.', opts: [
      { t: 'Tu lui montres calmement les pivots : il a vendu par peur.', r: [['T', '« Aïe. Mais tu as raison. La prochaine fois, je regarde la structure avant de vendre. »']], v: 1 },
      { t: 'Tu dis oui : c’est plus simple pour tout le monde.', r: [['L', 'Léa a entendu. « Dire à quelqu’un ce qu’il veut entendre, ce n’est pas l’aider. »']], v: -1 },
      { t: 'Tu changes de sujet.', r: [['T', '« Tu ne dis rien ? Ça veut dire que j’ai tort. »']], v: 0 } ] },
    30: { who: 'T', ask: 'Théo veut « ajuster » les paramètres de l’indicateur de Léa jusqu’à ce qu’il fonctionne sur le passé. Il te promet un rendement incroyable en simulation.', opts: [
      { t: 'Tu lui expliques le surajustement et proposes de tester sur d’autres données.', r: [['L', '« Excellent réflexe. Un indicateur qui ne marche que sur le passé ne marche nulle part. »']], v: 1 },
      { t: 'Tu le laisses faire : ce n’est que de la simulation.', r: [['L', '« Les simulations mensongères deviennent des convictions. C’est comme ça qu’on perd des clients. »']], v: -1 },
      { t: 'Tu refuses de t’en mêler.', r: [['T', '« Bon. Je le ferai tout seul. »']], v: 0 } ] },
    40: { who: 'V', ask: 'Après la présentation, Vallier t’offre un café. « Un jeune talent comme vous mérite mieux qu’une petite boîte. Venez chez nous : 20 % de plus. Montrez-moi seulement votre analyse du titre vedette, pour voir. »', opts: [
      { t: 'Tu refuses poliment : tu restes chez Boréale et tes notes sont à la firme.', r: [['V', '« Dommage. La loyauté se paie rarement, vous savez. »']], v: 1 },
      { t: 'Tu demandes du temps pour réfléchir.', r: [['V', '« Prenez tout le temps qu’il faut. Mon offre n’expire pas. »']], v: 0 },
      { t: 'Tu lui donnes un aperçu de tes notes.', r: [['C', 'Cécile apprend la fuite le lendemain. Le silence dans la salle de réunion est lourd.']], v: -1 } ] },
    50: { who: 'T', ask: 'Théo a perdu 2 % de son compte fictif et veut « se refaire » en doublant la mise sans stop. Il te demande ce que tu en penses.', opts: [
      { t: 'Tu lui rappelles l’histoire de Marc et lui proposes de réduire la taille.', r: [['T', '« Revenge trading, j’ai compris. Je reste à ma taille. »']], v: 1 },
      { t: 'Tu lui dis d’y aller : c’est pour la simulation.', r: [['C', '« Les habitudes de simulation deviennent les habitudes réelles. Rappelle-toi Marc. »']], v: -1 },
      { t: 'Tu lui montres seulement le calcul : le reste, c’est sa décision.', r: [['T', '« Bon. Tu as peut-être raison. »']], v: 0 } ] },
    60: { who: 'T', ask: 'Théo a déjà acheté Nordmétal avec 1 000 $ de son propre argent sur la foi d’un message de Vallier. Il te demande ce que tu en penses.', opts: [
      { t: 'Tu lui montres les chiffres : bénéfice sans flux, créances en hausse.', r: [['T', '« …Je vends. Merci de me l’avoir montré avant qu’il soit trop tard. »']], v: 1 },
      { t: 'Tu dis que c’est son argent, sa décision.', r: [['T', '« Je garde. Si Vallier le recommande… »']], v: 0 },
      { t: 'Tu lui dis d’en acheter plus : la rumeur peut encore monter.', r: [['K', 'Karim a tout entendu. Il ne dit rien, mais son regard dit tout.']], v: -1 } ] },
    70: { who: 'V', ask: 'Vallier t’appelle. « Entre collègues : que pensez-vous de Nordmétal ? Dites-moi ce que Karim a vraiment trouvé. Je vous le revaudrai. »', opts: [
      { t: 'Tu refuses : l’analyse appartient à la firme et à ses clients.', r: [['V', '« Dommage. Les gens prudents n’ont jamais rien gagné. »']], v: 1 },
      { t: 'Tu réponds vaguement.', r: [['V', '« Je note votre prudence. Elle n’est pas gratuite. »']], v: 0 },
      { t: 'Tu partages ton analyse : il n’y a pas de mal.', r: [['N', 'Nadia consigne l’appel au dossier. « On parlera de la confidentialité, toi et moi. »']], v: -1 } ] },
    80: { who: 'T', ask: 'L’oncle de Théo veut poursuivre Vallier. Théo te demande de lui remettre les notes internes de Karim sur Nordmétal « comme preuve ».', opts: [
      { t: 'Tu refuses de sortir des documents internes et lui suggères un conseiller juridique et les informations publiques.', r: [['N', '« Exactement. La confidentialité est un devoir, même pour une bonne cause. »']], v: 1 },
      { t: 'Tu en parles d’abord à Nadia.', r: [['N', '« Tu as bien fait de me consulter. On va l’encadrer. »']], v: 1 },
      { t: 'Tu lui donnes une photocopie : c’est pour une bonne cause.', r: [['C', 'Cécile apprend la fuite. « Une bonne cause ne justifie pas de contourner la confidentialité. »']], v: -1 } ] },
    90: { who: 'G', ask: 'Avant le vote, Gilberte te prend à part. « Soyez franc : pouvez-vous garantir 6 % par an à la Fondation ? »', opts: [
      { t: 'Tu dis non : personne ne peut garantir un rendement.', r: [['G', '« C’est exactement ce que Vallier n’a pas osé dire. Merci. »']], v: 1 },
      { t: 'Tu dis que c’est probable, mais pas garanti.', r: [['G', '« Honnête. Un peu timide, mais honnête. »']], v: 0 },
      { t: 'Tu dis oui : tu veux le mandat.', r: [['C', 'Cécile ferme les yeux un instant. « Tu viens de promettre l’impossible. »']], v: -1 } ] },
    99: { who: 'N', ask: 'La veille du comité, tu repères une petite erreur dans un tableau déjà remis à la Ville : un chiffre de performance trop favorable. Personne ne l’a vue.', opts: [
      { t: 'Tu la signales tout de suite à Nadia et Cécile pour corriger avant la séance.', r: [['N', '« C’est ça, la déontologie : on la déclare avant qu’on nous la fasse déclarer. »']], v: 1 },
      { t: 'Tu attends de voir si quelqu’un la remarque.', r: [['N', '« Ce n’est pas une option. Mais tu y as pensé, c’est déjà bien. »']], v: 0 },
      { t: 'Tu laisses : l’écart est minime.', r: [['N', '« L’écart minime est le début de toutes les grandes fautes. »']], v: -1 } ] },
  };
  // fin de l'histoire selon le nombre de dilemmes bien traités (somme des valeurs v)
  CS.EPILOGUE = {
    hi: [['C', '« Tu as gagné le mandat avec ton travail, et avec la manière dont tu l’as fait. À la Maison Boréale, c’est ce qui compte. Bienvenue chez nous, pour de bon. »'], ['G', '« Je vous ai vu débuter, et je vous vois partir loin. »'], ['T', '« Le prochain concours, c’est moi qui gagne. Mais je te l’ai déjà dit. »']],
    mid: [['C', '« Tu as gagné le mandat et tu as encore des choses à apprendre. L’éthique se joue dans les petites décisions : on te les remettra. Bienvenue chez nous. »'], ['G', '« Un bon début. Soyez attentif aux détails. »']],
    lo: [['C', '« Tu connais le métier. Il te reste à apprendre ce qu’il ne s’enseigne pas dans les exercices : ne rien cacher, ne rien promettre, ne rien faire dont tu ne voudrais pas rendre compte. Le mandat est à toi, mais je serai plus près de ton travail. »'], ['N', '« Je garderai ton dossier ouvert. Ce n’est pas une menace : c’est un rendez-vous. »']],
  };
  // somme des valeurs des choix faits : choices = { niveau: indice de l’option choisie }
  CS.integrity = (choices) => Object.entries(choices || {}).reduce((s, [n, k]) => { const d = CS.CHOICES[n], o = d && d.opts[k]; return s + (o ? o.v : 0); }, 0);
})(typeof window !== 'undefined' ? window : globalThis);
