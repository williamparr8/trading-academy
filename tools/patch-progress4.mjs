import fs from 'node:fs';
const f = 'progression/index.html';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 80)); s = s.split(a).join(b); };

rep("const MAJ = '2 octobre 2026';", "const MAJ = '13 octobre 2026';");
rep("const STATUT = 'Phases 1 à 3 sur 5 terminées';", "const STATUT = 'Phases 1 à 3 terminées, phase 4 livrée (un essai à faire)';");
rep(/const PROCHAINE = '.*';/.exec(s)[0], "const PROCHAINE = 'Essayer le coach IA dans la page publiée (bouton « Analyse approfondie par l’IA » dans l’onglet Coach, après une transaction fermée), puis lancer la phase 5 : classement partagé, défis par code et mode Live.';");

// carte « Où on en est »
rep("const IDEES = {", `const OU_ON_EN_EST = {
  jouable: [
    'Trois marchés réels : 24 actions (TSX, NYSE, Nasdaq), 6 paires de forex, 6 cryptomonnaies, avec actif et date cachés.',
    'Ordres au marché, limite et stop, vente à découvert, levier avec appel de marge et liquidation, options (calls et puts).',
    'Risque obligatoire ou conseillé, journal de trades, niveaux Débutant à Pro, Sharpe et drawdown, comparaison avec les indices.',
    'Huit leçons plus une sur les options, avec quiz, et deux coachs : un à règles toujours actif, un IA sur demande.',
    'Sauvegarde automatique, export et import de fichier, version téléphone.',
  ],
  reste: [
    'Phase 5 : classement partagé de toutes les parties, défis par code avec filtre, mode Live.',
    'Mode Live : la page ne peut pas aller chercher de prix sur Internet. La meilleure option sera d’y intégrer les cours les plus récents au moment de la publication (à confirmer en phase 5).',
    'Le day trading reste désactivé : les données gratuites de 1 à 5 minutes ne couvrent que les 60 derniers jours.',
  ],
};

const IDEES = {`);
rep("PHASES.map((p) => carte(p, true)).join('') + carte(IDEES, false);", "PHASES.map((p) => carte(p, true)).join('') + carte(IDEES, false);\nconst liste2 = (a) => '<ul>' + a.map((t) => `<li class=\"fait\"><span class=\"icone\">•</span><span>${esc(t)}</span></li>`).join('') + '</ul>';\ndocument.getElementById('contenu').insertAdjacentHTML('afterbegin', `<section class=\"carte\"><h2><span class=\"titre\">Où on en est</span></h2><div class=\"groupe\">Jouable dès maintenant</div>${liste2(OU_ON_EN_EST.jouable)}<div class=\"groupe\">Ce qui reste</div>${liste2(OU_ON_EN_EST.reste)}</section>`);");

// phase 4
const start = s.indexOf("  { titre: 'Phase 4 – Options et coach IA'");
const end = s.indexOf("  { titre: 'Phase 5");
if (start < 0 || end < 0) throw new Error('phase 4 introuvable');
const p4 = `  { titre: 'Phase 4 – Options et coach IA', etat: 'cours', etiquette: 'Livrée, à valider',
    note: 'Livrée le 13 octobre 2026. 49 groupes de tests du moteur. Le coach IA a été testé avec des réponses simulées : le premier essai réel doit se faire dans la page publiée.',
    groupes: [
      { nom: 'Options', items: [
        [true, 'Options (calls et puts) à l’achat : prime Black-Scholes avec la volatilité récente, trois échéances, cinq prix d’exercice, delta et point mort affichés'],
        [true, 'Vente avant l’échéance ou règlement en espèces, perte maximale = prime, règle de risque appliquée à la prime, débloquées au niveau Avancé'],
        [true, 'Leçon sur les options avec son quiz'] ] },
      { nom: 'Coach', items: [
        [true, 'Coach à règles après chaque transaction fermée : stop absent, risque trop élevé, perte plus grande que prévue, émotion, revenge trading, liquidation, frais, et ce qui est bien fait'],
        [true, 'Bilan du coach à la fin de chaque partie : espérance, fréquence, discipline, pertes par émotion ou par raison, sorties trop tôt, gains rendus, stops trop serrés'],
        [true, 'Coach IA sur demande, par transaction et pour la partie, avec des données anonymes avant la révélation de l’actif'],
        [true, 'Repli automatique sur le coach à règles si la capacité « poser une question à Claude » n’est pas disponible'],
        [false, 'Premier essai réel du coach IA dans la page publiée'] ] },
    ] },
`;
s = s.slice(0, start) + p4 + s.slice(end);

// phase 5 : précision sur le mode Live
rep("[false, 'Prix récents en direct (à confirmer selon les données disponibles)']", "[false, 'Mode Live : cours les plus récents (la page ne peut pas les télécharger elle-même, donc intégrés à la publication ; à confirmer)']");
fs.writeFileSync(f, s);
console.log('ok');
