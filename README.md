# Trading Academy

Simulateur de trading en français pour s'entraîner sans risquer un sou. Les marchés sont de vrais marchés
historiques : l'actif et la date sont cachés pendant la partie, puis révélés à la fin.

**▶ Jouer en ligne : https://williamparr8.github.io/trading-academy/**

## Ce que contient le jeu

- **Marchés** : 42 actions et FNB (TSX, NYSE, Nasdaq), 6 paires de forex, 6 cryptomonnaies, de 2005 à octobre 2026.
- **Ordres** : marché, limite, stop, stop-loss, objectif, vente à découvert (frais d'emprunt de 2 % par an),
  levier avec appel de marge et liquidation, options (calls et puts à l'achat, prime Black-Scholes).
- **Scénarios** : période aléatoire, crise surprise, krach de 2008, COVID 2020, hausse des taux 2022, Brexit,
  bulle crypto de 2021, hiver crypto de 2018, effondrement de 2022.
- **Discipline** : risque maximal par transaction (obligatoire ou conseillé), journal de trades, niveaux
  Débutant à Pro qui se gagnent par la discipline et non par les gains.
- **Statistiques de fin de partie** : rendement, Sharpe, drawdown, taux de réussite, gain et perte moyens,
  comparaison avec l'acheter-conserver et avec les indices S&P 500 et S&P/TSX.
- **Plateforme façon MetaTrader 5** : fenêtre claire avec menus (Fichier, Affichage, Insertion, Graphiques, Outils, Fenêtre, Aide),
  observation du marché (Bid / Ask), navigateur d'indicateurs (double-clic), graphique noir, fenêtre d'ordre à deux boutons
  Vendre (rouge, au Bid) et Acheter (bleu, à l'Ask), boîte à outils (Trading, Ordres, Historique, Coach) et barre d'état.
  Présentation inspirée de MetaTrader 5 ; les données et le compte restent virtuels.
- **Campagne « La Maison Boréale »** : 100 niveaux linéaires, une compétence par niveau (bougies, tendance, indicateurs, figures,
  gestion du trade, états financiers, valorisation, résultats, portefeuille, mesure et déontologie), trois difficultés par niveau
  (Apprenti, Compagnon, Maître), une histoire en dix chapitres, exercices générés sur de vraies données.
- **Gestionnaire de portefeuille** : quatre mandats de clients (retraitée, jeune professionnel, fondation, régime de retraite)
  avec énoncé de politique, indice de politique, contraintes vérifiées chaque mois, événements, questions de déontologie,
  risque et corrélations ; rapport façon CFA (Sharpe, Sortino, information, alpha, capture, VaR, attribution) et lettre au client.
- **Saison des résultats** (analyse fondamentale) : huit sociétés fictives, états financiers, consensus, prédictions, comparateur,
  valeur par flux actualisés, signaux de comptabilité agressive, dividendes, prédiction du taux directeur.
- **Flash technique** (15 décisions sur de vrais graphiques cachés, résultat en R, statistiques par contexte) et **Chasse aux figures**
  (reconnaître double sommet, épaule-tête-épaule, triangles, drapeaux).
- **Formation** : 17 leçons avec quiz (dont états financiers, valorisation, figures, EPP, mesures de performance), **examen blanc** et
  révision des erreurs.
- **Atelier EPP** (six dossiers de clients : tolérance au risque, contraintes, allocation), **missions de partie**, **glossaire** de 50 termes,
  outil **Fibonacci**, jeux de couleurs du graphique, mode **chrono** du Flash, coach IA des rapports (page privée seulement).
- **Carrière** : points d’expérience, neuf grades, série de jours, objectifs et défi du jour, boss de la semaine, badges, parcours recommandé.
- **Chroniques** : huit épisodes réels des marchés (2008, COVID, inflation 2022, Brexit et élection de 2016, bulle du bitcoin,
  pétrole 2014, banques 2023, droits de douane 2025) vécus décision après décision : contexte de l'époque, répartition de 100 000 $
  entre cinq placements et du cash, vraies cotes, bilan face à un 60/40 passif.
- **Révision espacée** : les questions ratées (campagne, examen blanc, quiz) entrent dans un carnet d'erreurs et reviennent à
  1, 3, 7, 16 puis 35 jours ; cinq réussites de suite la rendent « maîtrisée ».
- **Ligue hebdomadaire** : classement aux points d'expérience contre sept rivaux fictifs (déterministes), cinq ligues,
  promotion des trois premiers, relégation des deux derniers.
- **Sons et animations** : sons synthétisés (WebAudio, désactivables), transitions et retours visuels ; respecte « réduire les animations ».
- **Appli installable et hors ligne** (site public) : manifeste, icônes et service worker ; les cotes ouvertes restent disponibles hors ligne.
- **Graphique à la TradingView** : indicateurs ajoutables et retirables avec leurs paramètres (moyennes mobiles,
  Bollinger, RSI, MACD, ATR, volume), outils de dessin (support / résistance, tendance, zone, gomme), stop-loss et
  objectif posés ou glissés directement sur le graphique. Le coach juge tes stops, objectifs et entrées d'après les
  niveaux que tu as tracés avant d'entrer.
- **Tutoriels** (trois parcours guidés sur la vraie interface, rien n'est sauvegardé ni compté) : un premier trade
  (stop, taille à 1 % du compte, journal, portefeuille, résultat en R), parier contre le marché (vente à découvert,
  disponible dès le départ sur les actions), et les indicateurs en détail (volume, moyennes, Bollinger, RSI, MACD, ATR).
- **Formation** : 9 leçons avec quiz et un coach à règles après chaque transaction.
- **Défis** : un code de défi (ex. `ABCD-2345-A0S1`) redonne exactement la même partie.
- **Mode Live** : un compte qui dure, sur les cours réels les plus récents intégrés au site.
- **Sauvegarde** automatique dans le navigateur, export et import d'un fichier `.json`, version téléphone.

## Différences avec la version « artifact » de Claude

Le jeu existe aussi en page privée sur claude.ai. Cette version publique n'a pas :

- le **classement partagé** (il demande un espace de données partagé, fourni seulement par claude.ai) : ici,
  chaque joueur a son historique dans son navigateur, et on se compare en jouant le même code de défi ;
- le **coach IA** (il passe par le compte Claude du joueur) : le coach à règles reste actif.

## Développement

```bash
npm test            # 58 groupes de tests : moteur, coach, classement, tutoriels, tracés
npm run build       # construit le site statique dans dist/
npm run serve       # serveur local sur http://localhost:8765
```

- `trading/` : le jeu (`index.html`, `js/engine.js` pour la logique pure, `js/app.js` pour l'interface, `data/` pour les cotes).
- `tools/` : téléchargement des cotes (Yahoo Finance), tests, construction du site.
- Un push sur `main` lance les tests puis publie sur GitHub Pages (`.github/workflows/deploy.yml`).

### Rafraîchir les cotes

```bash
node tools/fetch-data.mjs        # 24 actions de départ + indices (réécrit index.json)
node tools/fetch-fx-crypto.mjs   # forex et crypto
node tools/fetch-more.mjs        # actions et FNB ajoutés ensuite
node tools/index-names.mjs       # symboles, noms et devises dans data/index.json
node tools/check-data.mjs        # vérifications de qualité
```

Les cotes viennent de Yahoo Finance (ajustées des dividendes et des fractionnements) et servent ici à
l'apprentissage seulement. Les résultats passés ne disent rien de l'avenir, et ce jeu n'est pas un conseil financier.
