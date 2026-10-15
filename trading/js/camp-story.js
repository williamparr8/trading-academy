/* Trading Academy — campagne : la mise en scène. Pour chaque niveau, une scène jouée par des personnages
   (dialogues, lieu et moment), des phrases qui introduisent les exercices, et une conclusion qui fait avancer l'intrigue.
   Ce fichier ne contient que du texte : les exercices sont toujours fabriqués par camp-gen.js.
   Fil rouge : un stagiaire arrive à la Maison Boréale, un concurrent (Vallier Capital) rôde, une société (Nordmétal)
   cache des chiffres, et un grand mandat de retraite est en jeu. Suite des chapitres 6 à 10 : camp-story2.js. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const CS = (TA.CAMPSTORY = {});

  // personnages : nom, rôle, portrait (emoji) et couleurs
  CS.CAST = {
    C: { name: 'Cécile Marchand', role: 'Directrice des placements', ico: '👩‍💼', c: ['#4f46e5', '#9333ea'] },
    L: { name: 'Léa Fortin', role: 'Trader technique', ico: '👩‍💻', c: ['#0ea5e9', '#2563eb'] },
    K: { name: 'Karim Haddad', role: 'Analyste fondamental', ico: '🧔', c: ['#10b981', '#0891b2'] },
    T: { name: 'Théo Vachon', role: 'Stagiaire', ico: '🧑‍🎓', c: ['#f59e0b', '#ef4444'] },
    V: { name: 'Étienne Vallier', role: 'Vallier Capital', ico: '🕴️', c: ['#475569', '#0f172a'] },
    N: { name: 'Nadia Roy', role: 'Chef de la conformité', ico: '👩‍⚖️', c: ['#be185d', '#7c3aed'] },
    G: { name: 'Gilberte Beaulieu', role: 'Cliente, présidente de la Fondation Soleil', ico: '👵', c: ['#f472b6', '#fb923c'] },
    P: { name: 'Toi', role: 'Stagiaire', ico: '🙂', c: ['#22d3ee', '#6366f1'] },
    M: { name: '', role: '', ico: '', c: ['#64748b', '#334155'] },
  };
  // lieu et moment par chapitre (un niveau peut avoir le sien)
  CS.WHERE = [
    'Maison Boréale · Montréal · première semaine', 'Salle des marchés · une journée de repli', 'Atelier de Léa · sous-sol de la Maison Boréale',
    'Archives de la firme · un après-midi de pluie', 'Salle de réunion · après l’incident', 'Bureau de Karim · la pile de rapports annuels',
    'Bureau de Karim · la rumeur du marché', 'Salle des marchés · la saison des résultats', 'Salle du comité · Fondation Soleil', 'Hôtel de ville · le grand mandat',
  ];
  // réactions de l'hôte de la scène après chaque réponse
  CS.GOOD = {
    C: ['Exact.', 'Bien joué.', 'C’est ça.', 'Propre et précis.', 'Tu progresses.', 'Voilà ce que j’attendais.'],
    L: ['Bien lu.', 'Exactement.', 'Tu vois la structure.', 'Net.', 'Voilà.', 'Tu as l’œil.'],
    K: ['Rigoureux.', 'Exact.', 'Bonne lecture des chiffres.', 'C’est bien ça.', 'Tu as l’œil pour les détails.', 'Voilà.'],
    N: ['C’est la bonne réponse.', 'Exact.', 'Tu as le bon réflexe.'],
    G: ['Très bien.', 'C’est ça.', 'Vous m’impressionnez.'],
  };
  CS.BAD = {
    C: ['Pas tout à fait.', 'Reprenons calmement.', 'Non, regarde de plus près.', 'Ce n’est pas ça.', 'Un client ne te pardonnerait pas celle-là.'],
    L: ['Pas tout à fait. Regarde encore.', 'Non, relis le graphique.', 'Presque. Mais non.', 'Mauvaise lecture. Reprends.', 'Le marché te dirait non.'],
    K: ['Vérifie tes chiffres.', 'Pas exactement. Reprends le calcul.', 'Non, regarde la ligne de plus près.', 'Les détails, justement.', 'Ce n’est pas ça.'],
    N: ['Ce n’est pas la bonne réponse.', 'Réfléchis aux conséquences.', 'Non. Pense au client.'],
    G: ['Hm, non.', 'Pas tout à fait, mon petit.', 'Reprenons.'],
  };
  // si le palier est raté : l'hôte encourage
  CS.RETRY = {
    C: 'Ça arrive. Relis tes notes, respire, et on reprend : chaque tentative tire de nouveaux exercices.',
    L: 'Pas grave. Même les bons traders manquent des graphiques. Reprends tes notes, puis retente.',
    K: 'Les chiffres ne bougent pas : ils attendent. Relis tes notes, puis reprends le dossier.',
    N: 'Mieux vaut échouer ici que devant un client. Reprends, calmement.',
    G: 'Allons, recommencez. Je ne vous quitte pas des yeux.',
  };

  const SC = (CS.SCENES = {});
  const C = (t) => ['C', t], L = (t) => ['L', t], K = (t) => ['K', t], T = (t) => ['T', t], V = (t) => ['V', t], N = (t) => ['N', t], G = (t) => ['G', t], M = (t) => ['M', t], P = (t) => ['P', t];
  // sc(niveau, lieu|null, [répliques], [phrases d'exercice], [conclusion])
  const sc = (n, where, lines, frames, ok) => { SC[n] = { w: where, s: lines, f: frames, ok }; };
  CS.helpers = { C, L, K, T, V, N, G, M, P, sc };

  /* ========== Chapitre 1 : premier jour ========== */
  sc(1, 'Lundi · 9 h 02 · étage des placements', [
    M('Le téléphone du desk sonne avant même que tu aies posé ton sac. Cécile décroche, écoute, puis te tend le combiné d’un geste sec.'),
    G('Allô ? Gilberte Beaulieu à l’appareil. J’ai acheté 200 actions ce matin “à 41,00 $” et on me dit que j’ai payé 41,07 $. On m’a volée ?'),
    C('Réponds-lui. Elle vient de découvrir le spread, et elle n’est pas la première. Montre-moi que tu comprends ce que ça coûte.'),
  ], ['Gilberte attend en ligne. Chiffre-lui ce que ça lui a coûté.', 'Pas d’approximation : un client se fie à ton chiffre.', 'Encore un calcul de coût, et tu peux la rappeler.'],
  [G('Un coût d’entrée, pas un vol ? Vous m’avez rassurée, merci.')]);
  sc(2, 'Lundi · 11 h 30 · le desk', [
    T('Théo Vachon, l’autre stagiaire, fait rouler sa chaise jusqu’à toi. « Tu as vu ? Un gars a payé 3 % de trop à l’ouverture. Un ordre “au marché”, comme un débutant. »'),
    C('Cécile pose trois jetons sur ton bureau : un rouge, un bleu, un vert. « Marché, limite, stop. Pour chaque situation de nos clients, tu choisis le bon ordre. Sans hésiter. »'),
  ], ['Voici une vraie situation d’un de nos clients. Quel ordre ?', 'Même exercice, autre client. Réfléchis à ce qui compte : le prix ou l’exécution ?', 'Dernier cas. Pense au pire scénario.'],
  [C('Gilberte aurait évité sa mauvaise surprise avec un ordre limite. Retiens-le.')]);
  sc(3, 'Lundi · 14 h 15 · devant les écrans', [
    L('Léa Fortin, trader technique, passe en coup de vent, un café dans chaque main. « Tu es notre stagiaire du jour ? Bien. Un graphique, c’est une suite de petites phrases. Une bougie, une phrase. »'),
    T('Depuis son écran : « Une bougie verte, c’est bon, une rouge, c’est mauvais. Voilà, j’ai fini la formation. »'),
    L('Sans lever les yeux : « Théo, relis ta phrase dans deux semaines. » Elle te tend un relevé : « Ouverture, plus haut, plus bas, clôture. Lis-moi ça. »'),
  ], ['Une bougie sur l’écran. Lis-moi ça.', 'Une autre phrase. Qui contrôlait la séance ?', 'Dernière bougie avant mon café.'],
  [L('Tu lis déjà mieux que la moitié du plancher. Théo, prends des notes.')]);
  sc(4, 'Mardi · 8 h 40 · le couloir des archives', [
    M('Un vieux graphique encadré orne le mur, annoté au crayon rouge.'),
    L('« Mes premiers dollars. Je ne savais pas lire les mèches. »'),
    P('Qu’est-ce qui s’est passé ?'),
    L('« J’ai acheté un sommet. La mèche haute hurlait que les vendeurs avaient repoussé le prix. Je n’ai rien entendu. Toi, tu vas entendre. »'),
  ], ['Sur le vieux graphique, chaque mèche raconte quelque chose. Mesure-la.', 'Corps ou mèche ? Chaque partie a sa taille.', 'Une dernière, pour ne pas faire comme moi.'],
  [L('Les mèches parlent, maintenant tu les entends. Voilà ta première vraie compétence.')]);
  sc(5, 'Mardi · 9 h 25 · près de la machine à café', [
    C('Cécile t’arrête devant la machine à café. « Le comité de 9 h 30 veut un chiffre sur le titre de Gilberte. Combien a-t-il bougé aujourd’hui ? Sois précis, je ne veux pas “beaucoup”. »'),
    T('Théo, derrière elle, te souffle : « Dis “environ trois pour cent”. »'),
    P('Je préfère calculer avant de répondre.'),
  ], ['Le comité attend. Donne-moi le chiffre exact.', 'Autre séance, autre mesure. Précis, comme tout à l’heure.'],
  [C('Précis et rapide. Le comité apprécie les chiffres, pas les adjectifs.')]);
  sc(6, 'Mardi · 15 h 10 · salle de formation', [
    L('Léa accroche trois graphiques au tableau. « Trois rejets, trois histoires. Dans chacun, un camp a essayé de pousser le prix, et il s’est fait repousser. »'),
    T('Théo hasarde : « Un doji, c’est un oubli de l’imprimante ? »'),
    L('« C’est l’hésitation d’un marché qui ne sait plus qui a raison. Trouve la bougie qui parle. »'),
  ], ['Une bougie à identifier. Qui a essayé, et qui a refusé ?', 'Une autre histoire de rejet.', 'Dernière bougie : quelle histoire raconte-t-elle ?'],
  [L('Doji, marteau, étoile filante : tu sais maintenant qui a perdu son combat.')]);
  sc(7, 'Mercredi · 8 h 55 · devant les écrans de Léa', [
    M('Dans un coin de l’écran de Léa, deux bougies se chevauchent.'),
    L('« Là, les acheteurs ont repris la main. Regarde la grande bougie : elle avale la précédente. »'),
    P('Un changement de garde.'),
    L('« Exactement. Maintenant, trouve les prochains. »'),
  ], ['Qui a repris le contrôle ici ?', 'Cherche le changement de garde.', 'Une dernière paire. Fais attention à qui englobe qui.'],
  [L('Quand tu vois un avalement, tu sais maintenant qui vient de reprendre la main.')]);
  sc(8, 'Mercredi · 13 h 40 · le desk', [
    C('Cécile s’arrête à ton bureau. « Léa m’a dit que tu progresses. Reconnaître la conviction, c’est ce qu’on te demande : un camp écrase l’autre, sans une mèche. »'),
    T('Théo grommelle : « Moi, on m’a dit que je confondais conviction et entêtement. »'),
    C('Elle ne sourit pas, mais ses yeux oui : « Justement. Apprends la différence. »'),
  ], ['Conviction ou hésitation ? Regarde bien le corps et les mèches.', 'Même question, autre bougie.', 'Une dernière, et on passe au volume.'],
  [C('Tu distingues la conviction de l’hésitation. Théo, c’est un début aussi pour toi.')]);
  sc(9, 'Jeudi · 10 h 05 · couloir des analystes', [
    K('Karim Haddad, l’analyste fondamental, passe en coup de vent, des rapports sous le bras. « Un prix sans volume, c’est une voix sans écho. »'),
    T('« C’est de la poésie ou des maths ? »'),
    K('« Les deux. Combien de titres ont changé de mains ? Voilà ta question. »'),
  ], ['Un mouvement. Combien de monde derrière ?', 'Écoute l’écho : le volume confirme-t-il le prix ?', 'Une dernière séance.'],
  [K('Tu écoutes l’écho. Beaucoup oublient qu’il existe.')]);
  sc(10, 'Vendredi · 8 h 30 · salle de réunion', [
    C('Cécile convoque l’équipe. « Gilberte Beaulieu veut savoir si elle doit garder son titre. Le comité du matin veut un dossier complet. Tu présentes. »'),
    T('Théo te souffle : « Si tu rates, je prends ta place au micro. Je plaisante. À moitié. »'),
    C('« Prix, ordres, bougies, volume : tout ce que tu as appris cette semaine. »'),
  ], ['Le dossier de Gilberte. Prends le temps de tout lire.', 'Une autre pièce du dossier. Continue.', 'Les ordres : explique ce que nous ferions.', 'Plus que quelques points, concentre-toi.'],
  [C('Gilberte a appelé : elle reste cliente, et elle demande que ce soit toi qui la rappelles à l’avenir. Première confiance gagnée.')]);

  /* ========== Chapitre 2 : la salle des marchés ========== */
  sc(11, 'Jeudi · 10 h 40 · salle des marchés', [
    M('Les écrans passent au rouge : l’indice perd 2 % avant même la pause du matin.'),
    L('« Pas de panique. Six écrans, six graphiques. Dis-moi qui contrôle chacun : acheteurs ou vendeurs ? »'),
    T('« Moi je dis que tout est baissier ! »'),
    L('« Tout n’est pas baissier, Théo. Regarde la structure. »'),
  ], ['Premier écran. Qui contrôle ce marché ?', 'Écran suivant. Garde la tête froide.', 'Encore un. Ne te laisse pas influencer par le rouge ambiant.'],
  [L('Dans le chaos, tu as lu la structure. Théo, lui, a tout vendu à l’ouverture.')]);
  sc(12, 'Jeudi · 11 h 25 · salle des marchés', [
    L('Léa tapote un graphique plat. « Ici, personne ne gagne. Savoir reconnaître un marché sans tendance évite de perdre en en cherchant une. »'),
    T('« J’ai acheté ce titre hier : il fait du surplace depuis trois semaines. »'),
    L('« Parce que tu as cherché une tendance là où il n’y en a pas. »'),
  ], ['Ce marché a-t-il une tendance, ou tourne-t-il en rond ?', 'Un autre graphique. Ne force pas une tendance.', 'Dernier écran, dernier verdict.'],
  [L('Savoir ne pas trader vaut un bon trade. Retiens-le.')]);
  sc(13, 'Jeudi · 13 h 10 · salle des marchés', [
    L('« Ne regarde pas la couleur des bougies. Regarde les pivots. »'),
    P('Les sommets et les creux ?'),
    L('« Chaque rebond et chaque repli est un témoin. Compte-les : ce sont eux qui disent qui gagne. »'),
  ], ['Lis les pivots de ce graphique.', 'Même exercice, autre titre.'],
  [L('Les pivots ne mentent pas. Tu sais maintenant lire une structure.')]);
  sc(14, 'Jeudi · 14 h 30 · salle des marchés', [
    C('Cécile s’approche. « Le comité veut le titre le plus fort parmi trois. Avant 15 h. »'),
    L('« Un seul est vraiment en tendance, dit Léa. Les deux autres font semblant. Lequel ? »'),
  ], ['Trois titres, un seul vraiment en tendance. Lequel ?', 'Cette fois, cherche le plus faible.'],
  [C('Le comité a suivi ton choix. Le titre a terminé la séance en hausse quand l’indice reculait.')]);
  sc(15, 'Jeudi · 15 h 45 · salle des marchés', [
    M('Léa trace des lignes colorées sur un écran.'),
    L('« Un seul de ces niveaux est solide. Les autres, c’est du dessin. »'),
    T('« Laisse-moi deviner : celui qui a l’air bien ? »'),
    L('« Celui qui a été touché plusieurs fois. Les autres, c’est ton imagination. »'),
  ], ['Un seul niveau est un vrai support. Lequel ?', 'Même question sur un autre graphique.', 'Dernier titre.'],
  [L('Tu sais maintenant où le prix aime rebondir. C’est précieux.')]);
  sc(16, 'Vendredi · 8 h 50 · salle des marchés', [
    C('« Les résistances sont des plafonds, dit Cécile. Dans une salle des marchés, on les connaît par cœur avant l’ouverture. »'),
    L('« Lequel est vraiment un plafond ? Pas celui qui a été touché une fois. »'),
  ], ['Quel niveau est un vrai plafond ?', 'Un autre graphique, une autre résistance.', 'Dernier niveau à identifier.'],
  [C('Tu as repéré le plafond avant l’ouverture. C’est exactement ce qu’on demande.')]);
  sc(17, 'Vendredi · 10 h 20 · salle des marchés', [
    L('« Le marché a de la mémoire. Un plancher cassé devient un plafond. »'),
    T('« C’est exactement ce qui est arrivé à mon titre d’hier ! J’ai racheté sur l’ancien support. »'),
    L('« Et il n’a pas rebondi. Les acheteurs piégés vendent quand le prix revient à leur prix d’entrée. »'),
  ], ['Un niveau a changé de rôle. Que va-t-il se passer ?', 'Pourquoi le marché se comporte-t-il ainsi ?', 'Dernière situation de ce genre.'],
  [L('Théo a pris des notes. Toi aussi, et tu ne rachètes plus sur un plancher cassé.')]);
  sc(18, 'Vendredi · 11 h 45 · salle des marchés', [
    M('Une règle en plastique dans la main, Léa trace une diagonale à même l’écran.'),
    L('« Trois points, ou ce n’est pas une ligne. »'),
    P('Et si je n’en trouve que deux ?'),
    L('« Alors tu as une hypothèse, pas une tendance. »'),
  ], ['Une ligne est-elle valide ? Combien de contacts ?', 'Que signifie cette cassure ?', 'Dernier point sur les lignes de tendance.'],
  [L('Tu traces maintenant des lignes qui tiennent. Tu es plus dangereux que Théo.')]);
  sc(19, 'Vendredi · 14 h 05 · salle des marchés', [
    L('Léa montre deux cassures côte à côte. « Une seule est digne de confiance. »'),
    K('Karim, de passage : « Si le volume ne suit pas, c’est un piège. »'),
  ], ['Deux cassures. Laquelle est digne de confiance ?', 'Même question, autres graphiques.', 'Une dernière, pour la route.'],
  [L('La cassure sans volume, c’est un faux départ. Tu l’as vu avant les autres.')]);
  sc(20, 'Vendredi · 16 h 40 · salle des marchés', [
    C('« Vingt minutes avant la clôture. Le marché a rebondi, et ça sent le renversement. Léa est en réunion : tu lis la situation seul(e). »'),
    T('Théo : « J’ai tout vendu au plus bas ce matin. Dis-moi que j’ai eu raison. »'),
    C('« Tendance, structure, niveaux, volume : tout est sur l’écran. »'),
  ], ['Lis la tendance avant de donner ton avis.', 'Vérifie la structure : les pivots.', 'Y a-t-il un niveau qui compte ici ?', 'Le volume confirme-t-il le mouvement ?', 'Dernier point avant la clôture.'],
  [L('Léa revient, jette un œil : « Bien. Tu lis un graphique comme on lit une pièce : l’acte, pas la réplique. »')]);

  /* ========== Chapitre 3 : l'atelier des indicateurs ========== */
  sc(21, 'Lundi · 9 h 10 · atelier de Léa', [
    M('Au sous-sol, Léa a monté un tableau de bord avec douze indicateurs qui clignotent.'),
    L('« Un indicateur est un instrument de mesure, pas une boule de cristal. Commençons par le plus simple : la moyenne mobile. »'),
    T('« Elle clignote en vert. On achète ? »'),
    L('« Elle te dit où va le marché depuis dix jours. Pas où il va. »'),
  ], ['Dans quelle direction pointe cette moyenne ?', 'Même mesure, autre titre.'],
  [L('La pente te dit la direction de fond. Tu n’as pas besoin de plus pour commencer.')]);
  sc(22, 'Lundi · 11 h 00 · atelier de Léa', [
    T('« Le prix est loin au-dessus de sa moyenne : donc je vends, c’est trop cher ! »'),
    L('« Au-dessus de sa moyenne, c’est de la force. Pas de l’excès. »'),
    P('Et le contraire ?'),
    L('« En dessous, c’est de la faiblesse. À toi de le voir. »'),
  ], ['Où est le prix par rapport à sa moyenne ? Que dit-il ?', 'Un autre graphique, même question.'],
  [L('Théo a vendu trop tôt. Toi, tu sais lire la force relative.')]);
  sc(23, 'Lundi · 14 h 30 · atelier de Léa', [
    L('Deux moyennes se croisent sur l’écran. « C’est un signal. Mais il arrive après le mouvement. Retarder, c’est le prix de la confirmation. »'),
    K('Karim passe la tête : « Le “croisement doré” dont tout le monde parle ? C’est une constatation, pas une prédiction. »'),
  ], ['Que signale ce croisement ?', 'Autre graphique, autre croisement.', 'Dernier croisement. Lequel est haussier ?'],
  [L('Tu sais ce qu’un croisement dit, et ce qu’il ne dit pas. C’est la moitié du métier.')]);
  sc(24, 'Mardi · 9 h 30 · atelier de Léa', [
    L('Deux moyennes, même période : l’une colle au prix, l’autre traîne.'),
    P('L’exponentielle réagit plus vite ?'),
    L('« Parce qu’elle pèse davantage le récent. La simple oublie moins vite. »'),
  ], ['Laquelle de ces moyennes réagit le plus vite ?', 'Lis cette moyenne : que dit-elle ?'],
  [L('Simple ou exponentielle : tu choisis ton outil selon ce que tu veux mesurer.')]);
  sc(25, 'Mardi · 11 h 15 · atelier de Léa', [
    T('« RSI à 78 ! Je vends tout. »'),
    L('« Le RSI mesure l’élan, pas le sommet. Mais il a ses zones : au-dessus de 70, on dit surachat. Sous 30, survente. »'),
    P('Et qu’est-ce qu’on en fait ?'),
    L('« Ça dépend du contexte. On y vient. »'),
  ], ['Que dit le RSI sur ce graphique ?', 'Zone de surachat ou de survente ?', 'Autre titre, même lecture.'],
  [L('Tu lis le RSI sans en faire un ordre automatique. C’est mieux que la plupart.')]);
  sc(26, 'Mardi · 15 h 00 · atelier de Léa', [
    L('« Regarde ce titre : RSI au-dessus de 70 depuis trois semaines. Et il a continué de monter. »'),
    T('« Mais j’ai vendu à 70 ! J’ai laissé 15 % sur la table. »'),
    L('« Le prix a le droit d’être fort longtemps. En tendance forte, surachat ne veut pas dire vente. »'),
  ], ['Tendance forte, RSI haut : que fais-tu ?', 'Un autre contexte, même indicateur.'],
  [L('Le RSI sans contexte est un piège. Avec le contexte, c’est un instrument.')]);
  sc(27, 'Mercredi · 9 h 45 · atelier de Léa', [
    L('« Le MACD compare deux moyennes exponentielles. Quand il croise sa ligne de signal vers le haut, l’élan s’inverse à la hausse. »'),
    T('« C’est trois lignes, un histogramme et un tableau de bord. »'),
    L('« Et pourtant c’est la différence de deux moyennes. Lis-le comme tel. »'),
  ], ['Lis ce MACD : l’élan est-il haussier ou baissier ?', 'Que signale ce croisement avec la ligne de signal ?'],
  [L('Le MACD n’a plus de secret. Il t’indique l’élan, rien de plus, rien de moins.')]);
  sc(28, 'Mercredi · 13 h 20 · atelier de Léa', [
    M('Sur l’écran, les bandes de Bollinger se resserrent comme un étau.'),
    L('« Quand les bandes se resserrent, c’est le calme avant la tempête. Ce n’est pas un signal de direction : c’est un avertissement. »'),
    P('Mais la direction ?'),
    L('« Tu l’obtiens autrement. Ce que tu sais, c’est que ça va bouger. »'),
  ], ['Les bandes sont-elles larges ou serrées ? Que dit la volatilité ?', 'Le prix touche la bande haute : que signifie-t-il ?'],
  [L('Tu sais lire la volatilité dans les bandes. Ça te sauvera de bien des mauvaises surprises.')]);
  sc(29, 'Jeudi · 9 h 00 · atelier de Léa', [
    C('Cécile descend à l’atelier. « Où poserais-tu un stop sur ce titre ? À 1 % ? À 10 % ? Il faut mesurer ce que le titre bouge normalement. »'),
    L('« Il y a un instrument pour ça : l’ATR. Il mesure l’amplitude moyenne, gaps compris. »'),
  ], ['Calcule l’amplitude moyenne : voilà ta mesure de volatilité.', 'Même calcul, autre titre.'],
  [C('Un stop sans mesure de volatilité, c’est une prière. Désormais, tu mesures.')]);
  sc(30, 'Vendredi · 15 h 30 · atelier de Léa', [
    C('Cécile organise un petit concours interne. « Un tableau de bord, un titre. Toi contre Théo, devant Léa. Qui lit le mieux les instruments ? »'),
    T('« Je te préviens, je suis en forme. »'),
    L('« Moyennes, RSI, MACD, Bollinger, ATR. Cinq instruments, un seul verdict. »'),
  ], ['Premier instrument : la moyenne mobile.', 'Deuxième instrument : le RSI.', 'Troisième : le MACD.', 'Quatrième : les bandes de Bollinger.', 'Dernier instrument : l’ATR.'],
  [L('Match nul sur le score, mais Théo a pris trois instruments pour des oracles. Toi, aucun. Voilà la vraie différence.')]);

  /* ========== Chapitre 4 : les figures du passé ========== */
  sc(31, 'Lundi · 14 h 00 · archives de la firme', [
    M('Aux archives, des boîtes de graphiques imprimés depuis 1987. Léa en sort un, jauni.'),
    L('« Henri Boréale, le fondateur, l’avait annoté en rouge : deux sommets au même niveau. Les acheteurs ont échoué deux fois. »'),
    P('Que s’est-il passé ensuite ?'),
    L('« Regarde la ligne de cou. »'),
  ], ['Identifie la figure sur ce vieux graphique.', 'Où se situe la ligne de cou ?', 'Dernière archive : même figure, autre époque.'],
  [L('Le fondateur aurait été fier : tu lis les mêmes figures que lui, quarante ans plus tard.')]);
  sc(32, 'Lundi · 15 h 20 · archives de la firme', [
    L('« Le même, à l’envers. Le marché essaie deux fois de casser un plancher, et il échoue. »'),
    T('« Deux fois, ça fait une figure ? »'),
    L('« Ça fait une histoire. Mais seule la ligne de cou décide. »'),
  ], ['Double sommet ou double creux ? Que fera le prix ?', 'Lis la confirmation de la figure.'],
  [L('Tu ne confonds plus les deux. Bien joué.')]);
  sc(33, 'Mardi · 10 h 15 · archives de la firme', [
    L('« Trois sommets, celui du milieu plus haut. Un marché qui s’essouffle. »'),
    P('On dirait un visage.'),
    L('« Beaucoup l’ont vu. Peu l’ont vendu au bon moment. La cassure de la ligne de cou, voilà ton signal. »'),
  ], ['Reconnais la figure, puis dis ce que suggère sa cassure.', 'Même figure, graphique différent.'],
  [L('Épaule-tête-épaule : une des figures les plus célèbres, et tu n’en fais plus une caricature.')]);
  sc(34, 'Mardi · 14 h 40 · archives de la firme', [
    L('« Un triangle, c’est un ressort qu’on comprime. Il finit toujours par se libérer. »'),
    T('« Dans quel sens ? »'),
    L('« Selon sa forme. Un triangle ascendant penche d’un côté, descendant de l’autre. Regarde. »'),
  ], ['Quel est ce triangle ? Dans quel sens se libère-t-il ?', 'Un autre triangle. Même méthode.', 'Dernier triangle de la série.'],
  [L('Tu as compris le ressort. Il ne te reste qu’à choisir ton stop.')]);
  sc(35, 'Mercredi · 9 h 35 · archives de la firme', [
    L('« Après un grand mouvement, le marché reprend son souffle : c’est un drapeau. Il repart ensuite dans le même sens. »'),
    P('Et si ça ne repart pas ?'),
    L('« Alors ce n’était pas un drapeau. Garde un stop. »'),
  ], ['Un drapeau est-il haussier ou baissier ? Que s’ensuit-il ?', 'Même figure, autre graphique.'],
  [L('Le drapeau est une pause, pas une fin. Tu sais maintenant faire la différence.')]);
  sc(36, 'Mercredi · 11 h 50 · archives de la firme', [
    L('« Un rectangle : le marché est enfermé entre deux murs. Tant qu’il ne sort pas, ne devine pas. »'),
    T('« Et si on achète en bas et on vend en haut ? »'),
    L('« C’est possible, tant que le mur tient. Et il finit toujours par céder. »'),
  ], ['Dans quelle zone le prix est-il enfermé ?', 'Qu’indique la sortie du rectangle ?'],
  [L('Le rectangle est la figure de la patience. Tu l’as comprise.')]);
  sc(37, 'Jeudi · 10 h 00 · archives de la firme', [
    C('Cécile s’invite dans les archives. « Une figure sans objectif, c’est une belle image. Mesure la hauteur, reporte-la depuis la cassure. »'),
    L('« Ce n’est pas une prévision, c’est un ordre de grandeur pour décider si le jeu en vaut la chandelle. »'),
  ], ['Mesure la hauteur de la figure, puis reporte-la.', 'Même calcul, autre figure.', 'Dernier objectif à fixer.'],
  [C('Un objectif mesuré vaut mieux qu’un espoir. Tu sais maintenant en fixer un.')]);
  sc(38, 'Jeudi · 15 h 10 · archives de la firme', [
    L('« Après un mouvement, les corrections s’arrêtent souvent près de 38, 50 ou 62 %. Pas de magie : beaucoup de gens regardent les mêmes niveaux. »'),
    T('« Alors c’est vrai parce que tout le monde y croit ? »'),
    L('« C’est utile parce que tout le monde y croit. Nuance. »'),
  ], ['Calcule le niveau de retracement demandé.', 'Même exercice, autre mouvement.'],
  [L('Tu manies Fibonacci sans y croire à la magie. Voilà la bonne attitude.')]);
  sc(39, 'Vendredi · 9 h 15 · salle de réunion', [
    M('Le téléphone sonne. Étienne Vallier, de Vallier Capital, demande Cécile. Elle prend l’appel debout, la mâchoire serrée.'),
    C('Elle raccroche. « Il vient de débaucher deux de nos clients. Il dit qu’il est meilleur que nous. »'),
    L('« Il est surtout meilleur pour vendre de la certitude. Il pousse ses clients à entrer sur des cassures qui ne tiennent pas. Regarde celle-ci. »'),
  ], ['Cette cassure tient-elle ? Quels signes dans le graphique ?', 'Une autre cassure. Vraie ou fausse ?', 'Dernière tentative de cassure.'],
  [L('Tu repères une fausse cassure avant qu’elle ne piège un client. C’est exactement ce qui nous distingue de Vallier.')]);
  sc(40, 'Vendredi · 17 h 00 · salle de réunion', [
    C('« Vallier présente demain devant nos clients, avec de beaux graphiques et des promesses de rendement. On répond avec l’analyse technique de notre titre vedette. »'),
    L('« Figures, objectifs, retracements, fausses cassures : tout le chapitre. »'),
    T('« Tu vas lui montrer. »'),
  ], ['Premier élément du dossier : la figure.', 'Mesure l’objectif.', 'Le retracement de Fibonacci.', 'Vérifie la fausse cassure.', 'Dernière bougie du dossier.'],
  [C('Les clients sont restés. Vallier a perdu cette manche, mais il n’oublie rien.')]);
  /* ========== Chapitre 5 : le plan de trade ========== */
  sc(41, 'Lundi · 8 h 05 · salle de réunion', [
    M('L’ambiance est glaciale. Marc Daigle, trader junior, a perdu 14 % d’un compte client en deux jours.'),
    C('« Pas de stop. “Il allait remonter.” Aujourd’hui, on apprend à poser un stop qui a du sens. »'),
    T('« Il n’avait pas de stop ? Jamais ? »'),
    C('« Le stop se place là où ton idée est invalidée, pas là où ça te fait mal. »'),
  ], ['Où poser le stop sur ce titre ?', 'Même question, volatilité différente.', 'Dernier stop de la série.'],
  [C('Un stop pensé, pas un stop subi. Voilà ce qu’on attend de toi.')]);

    sc(42, 'Lundi · 10 h 30 · salle de réunion', [
    C('« Marc n’a pas perdu parce qu’il avait tort. Il a perdu parce qu’il a misé trop gros. Combien d’actions achète-t-on avec 100 000 $, un stop à 3 $ et 1 % de risque ? »'),
    T('« Je mettrais tout, si j’étais sûr. »'),
    C('« Personne n’est sûr. Calcule. »'),
  ], ['Calcule la taille de position de ce trade.', 'Même méthode, autres chiffres.', 'Une dernière taille à calculer.'],
  [C('Tu dimensionnes à partir du risque, pas de l’espoir. Marc l’aurait fait, il serait encore là.')]);
  sc(43, 'Lundi · 14 h 00 · salle de réunion', [
    C('« Pour risquer un dollar, j’en veux au moins deux. »'),
    T('« Et si on gagne souvent ? »'),
    C('« Même alors. Calcule le ratio. »'),
  ], ['Calcule le rendement sur risque de ce trade.', 'Même calcul, autre scénario.'],
  [C('Un bon ratio protège de tes erreurs. Tu viens de l’apprendre.')]);
  sc(44, 'Mardi · 9 h 15 · salle de réunion', [
    C('« On ne parle pas en dollars, on parle en R : combien de fois le risque initial. »'),
    L('Léa, de passage : « +2 R, c’est deux fois ce que tu étais prêt à perdre. Ça change la façon de voir un résultat. »'),
  ], ['Exprime ce résultat en multiple de R.', 'Autre trade, même unité.'],
  [C('Le R est ton langage commun avec toute la salle des marchés.')]);
  sc(45, 'Mardi · 11 h 40 · salle de réunion', [
    C('« Combien rapporte une stratégie en moyenne, par trade ? Pas le meilleur trade : la moyenne. »'),
    K('Karim, de la porte : « C’est l’espérance. La même logique qu’en finance : pondérer par les probabilités. »'),
  ], ['Calcule l’espérance de cette stratégie.', 'Autre stratégie, même calcul.'],
  [C('L’espérance dit si ça vaut la peine d’y retourner. Tu viens de découvrir comment le casino pense.')]);
  sc(46, 'Mardi · 15 h 20 · salle de réunion', [
    T('« Je gagne 40 % de mes trades. Je suis nul ? »'),
    C('« Pas si tes gains sont trois fois tes pertes. Tout dépend du ratio. »'),
    P('Et en dessous de combien de réussite perd-on de l’argent ?'),
    C('« C’est exactement la question. Calcule. »'),
  ], ['Quel taux de réussite minimal pour ce ratio ?', 'Même calcul avec un autre ratio.'],
  [C('Tu sais maintenant que le taux de réussite seul ne dit rien. Théo en sort soulagé.')]);
  sc(47, 'Mercredi · 9 h 00 · salle de réunion', [
    C('« Une règle écrite avant l’ouverture, appliquée sans état d’âme. Pas d’interprétation à midi. »'),
    L('« Elle est ennuyeuse, ta règle. Et c’est pour ça qu’elle marche. »'),
  ], ['Applique la règle de tendance à ce graphique.', 'Même règle, autre situation.'],
  [C('Appliquer une règle sans état d’âme, c’est plus dur que de la concevoir. Tu y arrives.')]);
  sc(48, 'Mercredi · 14 h 10 · salle de réunion', [
    L('« Cassure ou repli en tendance : deux règles classiques, chacune avec ses conditions. »'),
    C('« Quelle règle s’applique ? À quel prix entre-t-on ? Où sort-on ? Tout est écrit. »'),
  ], ['Applique la règle de cassure à cette situation.', 'Même exercice, règle de repli cette fois.'],
  [C('Chaque règle a sa place. Tu sais maintenant laquelle choisir.')]);
  sc(49, 'Jeudi · 9 h 40 · couloir', [
    M('Marc passe devant ton bureau, ses affaires dans une boîte. Il ne dit rien.'),
    C('« Il n’était pas incompétent. Il était fatigué, il voulait se refaire. On appelle ça le revenge trading. Regarde les pièges. »'),
    T('« Moi, je ne ferais jamais ça… »'),
    C('« Tout le monde pense ça. »'),
  ], ['Quel est le piège psychologique à l’œuvre ici ?', 'Même scénario, autre biais.', 'Dernier piège.'],
  [C('Reconnaître le piège avant d’y tomber : c’est la seule vraie protection.')]);
  sc(50, 'Vendredi · 11 h 00 · salle de réunion', [
    C('« M. Pelletier, un client, menace de partir après l’épisode Marc. Tu lui présentes notre plan : taille, stop, ratio, espérance. »'),
    K('Karim passe la tête : « Quand tu auras fini, viens me voir. J’ai trouvé quelque chose d’étrange dans les chiffres de Nordmétal. »'),
    T('« C’est l’heure de vérité. »'),
  ], ['Premier point du plan : la taille de position.', 'Place le stop.', 'Applique la règle d’entrée.', 'Vérifie le plan.', 'Calcule l’espérance : voilà ce que le client veut entendre.'],
  [C('M. Pelletier reste. Vallier a embauché Marc la semaine suivante. Il ramasse tout ce qui tombe.')]);
})(typeof window !== 'undefined' ? window : globalThis);
