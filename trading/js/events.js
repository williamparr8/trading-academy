/* Trading Academy — repères historiques : les événements réels qui ont marqué les marchés depuis 2005.
   Affichés à la fin d'une partie (quand les dates sont révélées) pour relier les mouvements du graphique à ce qui
   se passait dans le monde. Dates et libellés de mémoire, à valeur pédagogique. */
(function (root) {
  'use strict';
  const TA = (root.TA = root.TA || {});
  const L = [
    ['2005-08-29', 'L’ouragan Katrina frappe la Nouvelle-Orléans : choc sur l’énergie et les assureurs.'],
    ['2007-08-09', 'BNP Paribas gèle trois fonds : début de la crise du crédit hypothécaire.'],
    ['2008-03-16', 'Bear Stearns est racheté en urgence par JPMorgan.'],
    ['2008-09-15', 'Faillite de Lehman Brothers : la panique s’empare des marchés.'],
    ['2008-10-03', 'Adoption du plan de sauvetage du système financier américain (TARP).'],
    ['2009-03-09', 'Creux boursier de la crise : le S&P 500 touche son plus bas.'],
    ['2010-05-06', '« Flash crash » : l’indice chute de près de 9 % en quelques minutes avant de rebondir.'],
    ['2011-08-05', 'Standard & Poor’s retire la note AAA aux États-Unis.'],
    ['2012-07-26', 'Mario Draghi promet de faire « tout ce qu’il faut » pour sauver l’euro.'],
    ['2013-05-22', 'Le président de la Fed évoque la réduction des achats d’actifs : le « taper tantrum ».'],
    ['2014-06-20', 'Début de la chute du pétrole : le baril perdra plus de la moitié de sa valeur.'],
    ['2015-08-11', 'La Chine dévalue le yuan : secousse sur les marchés mondiaux.'],
    ['2016-06-23', 'Référendum du Brexit : le Royaume-Uni vote pour quitter l’Union européenne.'],
    ['2016-11-08', 'Élection de Donald Trump : rotation vers les banques et les cycliques.'],
    ['2018-02-05', '« Volmageddon » : la volatilité explose et des produits à effet de levier s’effondrent.'],
    ['2018-12-24', 'Plus bas de fin d’année 2018, après une série de hausses de taux de la Fed.'],
    ['2020-03-11', 'L’OMS déclare la pandémie de COVID-19 : le krach le plus rapide de l’histoire.'],
    ['2020-03-23', 'Creux du krach du COVID : la Fed annonce des achats d’actifs illimités.'],
    ['2020-04-20', 'Le prix du pétrole américain passe sous zéro.'],
    ['2021-01-28', 'Épisode GameStop : une action devient le champ de bataille des investisseurs particuliers.'],
    ['2022-02-24', 'Invasion de l’Ukraine : choc sur l’énergie, les céréales et l’inflation.'],
    ['2022-03-16', 'Première hausse de taux de la Fed du cycle : fin de l’argent gratuit.'],
    ['2022-06-13', 'L’inflation surprend : le S&P 500 entre en marché baissier.'],
    ['2023-03-10', 'Faillite de Silicon Valley Bank : crise de confiance dans les banques régionales.'],
    ['2023-03-19', 'UBS rachète Credit Suisse dans l’urgence.'],
    ['2024-08-05', 'Débouclement du « carry trade » sur le yen : brève panique mondiale.'],
    ['2025-04-02', 'Annonce de droits de douane américains généralisés : forte baisse des marchés.'],
  ].map(([d, t]) => ({ day: Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000), text: t }));
  const EV = (TA.EVENTS = {});
  EV.list = L;
  // événements dont la date tombe dans [d0, d1] (jours depuis 1970)
  EV.within = (d0, d1) => L.filter((e) => e.day >= d0 && e.day <= d1);
  const fmt = (day) => new Date(day * 86400000).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  EV.rows = (d0, d1) => EV.within(d0, d1).map((e) => ({ date: fmt(e.day), text: e.text }));
  EV.html = (d0, d1, title = 'Ce qui se passait dans le monde') => {
    const r = EV.rows(d0, d1);
    if (!r.length) return '';
    return `<section class="card"><h2>${title}</h2><div class="glist">${r.map((x) => `<div class="grow"><span class="mono">${x.date}</span><span>${x.text}</span></div>`).join('')}</div><p class="fine">Repères réels : compare-les aux mouvements de ton graphique.</p></section>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
