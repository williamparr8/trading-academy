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
- **Graphique à la TradingView** : indicateurs ajoutables et retirables avec leurs paramètres (moyennes mobiles,
  Bollinger, RSI, MACD, ATR, volume), outils de dessin (support / résistance, tendance, zone, gomme), stop-loss et
  objectif posés ou glissés directement sur le graphique. Le coach juge tes stops, objectifs et entrées d'après les
  niveaux que tu as tracés avant d'entrer.
- **Tutoriel** : un mini-parcours de 3 minutes où le joueur ouvre, suit et ferme un premier trade sur la vraie
  interface (stop, taille de position à 1 % du compte, journal, portefeuille, résultat en R). Rien n'est sauvegardé ni compté.
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
npm test            # 57 groupes de tests : moteur, coach, classement, tutoriel, tracés
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
