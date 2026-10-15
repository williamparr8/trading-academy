/* Trading Academy — glossaire : les termes que l'on rencontre dans les leçons, les modes d'analyse et de gestion. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const G = (TA.GLOSSARY = [
    ['Action', 'Part de propriété d’une entreprise. Son prix reflète les attentes sur ses bénéfices futurs.', 'base'],
    ['Allocation d’actifs', 'Répartition du portefeuille entre grandes classes (actions, obligations, encaisse…). C’est la décision qui explique l’essentiel du rendement et du risque.', 'gestion'],
    ['Allocation stratégique', 'Poids cibles de long terme fixés par l’énoncé de politique. Sert de point de départ et d’indice de référence.', 'gestion'],
    ['Allocation tactique', 'Écart limité et temporaire par rapport à l’allocation stratégique, fondé sur une conviction.', 'gestion'],
    ['Alpha', 'Rendement obtenu au-delà de ce que le bêta explique. Mesure la valeur ajoutée du gestionnaire.', 'performance'],
    ['Appel de marge', 'Avis du courtier que le compte ne couvre plus la marge exigée : il faut réduire la position ou ajouter des fonds.', 'trading'],
    ['ATR', 'Amplitude vraie moyenne : l’écart typique entre le plus haut et le plus bas. Sert à dimensionner un stop.', 'technique'],
    ['Bandes de Bollinger', 'Enveloppe de deux écarts-types autour d’une moyenne mobile. Elle s’élargit quand la volatilité monte.', 'technique'],
    ['BAIIA', 'Bénéfice avant intérêts, impôts et amortissements : approximation de la rentabilité d’exploitation.', 'fondamental'],
    ['Benchmark (indice de référence)', 'Portefeuille de comparaison. Un gestionnaire est jugé par rapport à lui, après frais.', 'gestion'],
    ['Bêta', 'Sensibilité d’un portefeuille à son indice. Un bêta de 1,2 amplifie de 20 % les mouvements de l’indice.', 'performance'],
    ['BPA (bénéfice par action)', 'Bénéfice net divisé par le nombre d’actions. La base de la plupart des multiples.', 'fondamental'],
    ['Capitalisation', 'Valeur de marché d’une entreprise : prix de l’action fois nombre d’actions.', 'fondamental'],
    ['Capture à la baisse', 'Part des mois négatifs de l’indice que le portefeuille subit. Moins de 100 % signifie une meilleure protection.', 'performance'],
    ['Cassure', 'Franchissement d’un support ou d’une résistance. Plus fiable avec un volume élevé.', 'technique'],
    ['Conflit d’intérêts', 'Situation où un avantage personnel pourrait influencer une décision prise pour le client. Se déclare et s’évite.', 'déontologie'],
    ['Consensus', 'Moyenne des prévisions d’analystes. Le prix l’incorpore déjà : seule la surprise le fait bouger.', 'fondamental'],
    ['Convenance (suitability)', 'Obligation de recommander ce qui convient à la situation, aux objectifs et à la tolérance au risque du client.', 'déontologie'],
    ['Corrélation', 'Mesure de −1 à +1 du degré auquel deux actifs bougent ensemble. Moins elle est élevée, plus la diversification aide.', 'gestion'],
    ['Créances (jours de ventes)', 'Délai moyen d’encaissement des ventes. Une hausse rapide peut annoncer des ventes douteuses.', 'fondamental'],
    ['Délit d’initié', 'Utiliser une information importante et non publique pour négocier. Interdit, même indirectement.', 'déontologie'],
    ['Dette nette / BAIIA', 'Nombre d’années de BAIIA nécessaires pour rembourser la dette. Au-delà de 3 à 4 fois, le levier devient un risque.', 'fondamental'],
    ['Diversification', 'Répartir le risque entre actifs peu corrélés. Elle réduit le risque sans réduire proportionnellement le rendement attendu.', 'gestion'],
    ['Drawdown', 'Pire recul depuis un sommet. C’est ce que le client ressent vraiment.', 'performance'],
    ['Duration', 'Sensibilité du prix d’un titre aux taux d’intérêt. Plus elle est longue, plus la baisse est forte quand les taux montent.', 'fondamental'],
    ['EPP (énoncé de politique de placement)', 'Contrat qui fixe objectifs, tolérance au risque, contraintes et allocation. La référence de toute décision.', 'gestion'],
    ['Erreur de suivi', 'Volatilité de l’écart entre le portefeuille et son indice. Plus elle est élevée, plus la gestion est active.', 'performance'],
    ['Flux de trésorerie libre', 'Argent généré par l’exploitation après les investissements. Difficile à maquiller, il finance dividendes et croissance.', 'fondamental'],
    ['Gap', 'Écart entre la clôture et l’ouverture suivante. Un stop peut être exécuté au-delà de son niveau.', 'trading'],
    ['Guidance (perspectives)', 'Prévisions de la direction. Elle pèse souvent plus que le trimestre écoulé dans la réaction du prix.', 'fondamental'],
    ['Levier', 'Exposition supérieure au capital propre, obtenue par emprunt. Il amplifie les gains et les pertes.', 'trading'],
    ['Liquidation', 'Fermeture forcée d’une position par le courtier lorsque la marge n’est plus suffisante.', 'trading'],
    ['MACD', 'Indicateur d’élan : écart entre deux moyennes mobiles exponentielles, comparé à sa ligne de signal.', 'technique'],
    ['Marge d’exploitation', 'Résultat d’exploitation divisé par les revenus. Mesure la rentabilité de l’activité courante.', 'fondamental'],
    ['Moyenne mobile', 'Moyenne des derniers prix. Résume la tendance et sert de support ou de résistance dynamique.', 'technique'],
    ['Multiple R', 'Gain ou perte exprimé en multiples du risque initial. +2 R signifie deux fois le montant risqué.', 'trading'],
    ['Option (call, put)', 'Droit d’acheter (call) ou de vendre (put) à un prix fixé. L’acheteur risque au plus la prime payée.', 'trading'],
    ['Ordre limite', 'Ordre exécuté seulement au prix demandé ou mieux.', 'trading'],
    ['Ordre stop', 'Ordre déclenché quand le prix touche un niveau. Devient un ordre au marché.', 'trading'],
    ['P/B (cours sur valeur comptable)', 'Prix divisé par les capitaux propres par action. Pertinent pour les banques et les entreprises à gros actifs.', 'fondamental'],
    ['P/E (cours sur bénéfice)', 'Prix divisé par le bénéfice par action. Se lit contre la croissance, le secteur et les taux.', 'fondamental'],
    ['Prime', 'Prix payé pour une option, ou écart de rendement exigé pour un risque.', 'trading'],
    ['Ratio d’information', 'Rendement actif divisé par l’erreur de suivi. Qualité de la gestion active.', 'performance'],
    ['Ratio de Sharpe', 'Rendement excédentaire sur le taux sans risque, par unité de volatilité.', 'performance'],
    ['Ratio de Sortino', 'Comme Sharpe, mais ne compte que le risque à la baisse.', 'performance'],
    ['Rééquilibrage', 'Retour aux poids cibles quand le portefeuille a dérivé. Maintient le niveau de risque voulu ; coûte des frais.', 'gestion'],
    ['ROE', 'Bénéfice net divisé par les capitaux propres. Rentabilité des fonds des actionnaires.', 'fondamental'],
    ['Rotation', 'Montant échangé divisé par la valeur du portefeuille sur une période. Une rotation élevée coûte des frais.', 'gestion'],
    ['RSI', 'Indicateur d’élan de 0 à 100. Au-dessus de 70, suracheté ; sous 30, survendu ; en tendance forte, il peut rester extrême.', 'technique'],
    ['Spread', 'Écart entre le prix d’achat (ask) et de vente (bid). Un coût à chaque transaction.', 'trading'],
    ['Stop-loss', 'Ordre qui limite la perte en fermant la position si le prix atteint un niveau d’invalidation.', 'trading'],
    ['Support et résistance', 'Zones de prix où l’offre ou la demande a déjà réagi. Une fois cassées, elles changent souvent de rôle.', 'technique'],
    ['Surprise', 'Écart entre le résultat publié et le consensus. C’est elle, plus que le niveau absolu, qui fait bouger le prix.', 'fondamental'],
    ['Tendance', 'Suite de sommets et de creux croissants (haussière) ou décroissants (baissière).', 'technique'],
    ['VaR (valeur à risque)', 'Perte qu’on ne dépasse pas avec un niveau de confiance donné (par exemple 95 %) sur une période.', 'performance'],
    ['Vente à découvert', 'Vendre un titre emprunté pour le racheter plus bas. Gagne quand le prix baisse ; la perte est théoriquement illimitée.', 'trading'],
    ['Volatilité', 'Amplitude typique des variations de prix, souvent mesurée par l’écart-type annualisé des rendements.', 'performance'],
  ]);
  G.search = (q) => {
    const n = String(q || '').trim().toLowerCase();
    if (!n) return G;
    return G.filter((e) => e[0].toLowerCase().includes(n) || e[1].toLowerCase().includes(n) || e[2].toLowerCase().includes(n));
  };
  if (typeof document === 'undefined') return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = (q) => G.search(q).map((e) => `<div class="gl-row"><b>${esc(e[0])}</b> <span class="tag">${esc(e[2])}</span><p>${esc(e[1])}</p></div>`).join('') || '<p class="hint">Aucun terme trouvé.</p>';
  function render() {
    const box = document.getElementById('gloss-card');
    if (!box) return;
    box.innerHTML = `<h2>Glossaire <span class="tag">${G.length} termes</span></h2>
      <label class="field"><span>Chercher un terme</span><input id="gl-q" placeholder="Ex. Sharpe, stop, consensus…" autocomplete="off"></label>
      <div class="gl-list" id="gl-list">${list('')}</div>`;
  }
  document.addEventListener('input', (e) => { if (e.target.id === 'gl-q') { const l = document.getElementById('gl-list'); if (l) l.innerHTML = list(e.target.value); } });
  render();
})(typeof window !== 'undefined' ? window : globalThis);
