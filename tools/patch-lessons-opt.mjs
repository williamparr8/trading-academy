import fs from 'node:fs';
let s = fs.readFileSync('trading/js/lessons.js', 'utf8');
const marker = "  ];\n\n  // Illustrations";
if (!s.includes(marker)) throw new Error('repère introuvable');
const lesson = `    {
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
`;
s = s.replace(marker, lesson + marker);
fs.writeFileSync('trading/js/lessons.js', s);
let a = fs.readFileSync('trading/js/app.js', 'utf8');
const old = 'fondamentaux, vente à découvert, levier, forex et crypto.</p>';
if (!a.includes(old)) throw new Error('repère carte formation introuvable');
a = a.replace(old, 'fondamentaux, vente à découvert, levier, forex, crypto et options.</p>');
fs.writeFileSync('trading/js/app.js', a);
console.log('ok');
