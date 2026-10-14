/* Trading Academy — coach à règles (toujours disponible, aucune connexion requise).
   - coachTrade : analyse d'une transaction fermée. N'utilise QUE ce qui est connu à la fermeture (aucun regard vers l'avenir).
   - coachGame  : bilan de fin de partie. La partie est finie : on peut regarder ce qui s'est passé après chaque sortie.
   Chaque constat : { id, level: 'warn' | 'good' | 'info', title, text }. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const TA = (root.TA = root.TA || {});
  const F = TA.fmt, mult = (t) => (t.kind === 'option' ? TA.CFG.OPT_MULT : 1);
  const pct1 = (x) => F.pct(x).replace(/,00(?=\s)/, '');
  const rTxt = (r) => (r == null ? '' : `${r > 0 ? '+' : ''}${F.num(r, 1)} R`);
  const notional = (t) => t.qty * t.entry * mult(t);
  const WARN = 0, GOOD = 1, INFO = 2;
  const order = { warn: WARN, good: GOOD, info: INFO };

  // Niveaux tracés par le joueur et déjà connus à la barre idx : lignes, zones, tendances prolongées jusqu'à idx.
  function levelsAt(st, idx) {
    const out = [];
    for (const d of st.draw || []) {
      if (d.at > idx) continue;   // posé plus tard : le joueur ne le connaissait pas à ce moment
      if (d.k === 'h') out.push({ k: 'h', lo: d.p, hi: d.p });
      else if (d.k === 'r') out.push({ k: 'r', lo: Math.min(d.a.p, d.b.p), hi: Math.max(d.a.p, d.b.p) });
      else if (d.k === 't' && d.a.i !== d.b.i) {
        const p = d.a.p + ((d.b.p - d.a.p) * (idx - d.a.i)) / (d.b.i - d.a.i);
        if (p > 0) out.push({ k: 't', lo: p, hi: p });
      }
    }
    return out;
  }
  TA.levelsAt = levelsAt;
  const levelName = (l, role) => (l.k === 'r' ? `ta zone de ${role}` : l.k === 't' ? 'ta ligne de tendance' : role === 'support' ? 'ton support' : 'ta résistance');

  TA.optLabel = (t) => (t && t.kind === 'option' ? `${t.opt.kind === 'call' ? 'Call' : 'Put'} ${F.num(t.opt.strike, 2)}` : '');

  TA.coachTrade = function (g, st, t) {
    const out = [], max = (st.rules && st.rules.max) || 0.02, isOpt = t.kind === 'option';
    const eqAt = st.equity[Math.max(0, t.openIdx - g.startIdx)] || TA.CFG.START_CASH;   // valeur du compte à l'ouverture
    const held = t.closeIdx - t.openIdx, emotions = (t.entries || []).map((e) => e.emotion).filter(Boolean);
    const push = (id, level, title, text) => out.push({ id, level, title, text });

    if (!isOpt && t.risk0 === 0 && t.reason !== 'Liquidation') {
      push('nostop', 'warn', 'Entrée sans stop-loss', 'Sans stop, ta perte maximale n’était pas définie. Fixe le stop avant d’entrer, puis calcule la taille à partir de lui.');
    }
    if (t.risk0 > 0 && t.risk0 / eqAt > max * 1.0001) {
      const p = t.risk0 / eqAt;
      push('oversize', 'warn', `Risque trop élevé : ${pct1(p)} du compte`, `Ta règle fixe ${pct1(max)} par transaction. Trois pertes de cette taille de suite coûteraient environ ${pct1(1 - (1 - p) ** 3)} du compte.`);
    }
    if (t.reason === 'Liquidation') {
      push('liquidated', 'warn', 'Position liquidée par la plateforme', 'Ton compte ne couvrait plus la marge. Avec du levier, la distance jusqu’au prix de liquidation compte autant que le stop : réduis la taille ou le levier.');
    } else if (!isOpt && t.r != null && t.r < -1.3) {
      push('gap', 'warn', `Perte plus grande que prévu (${rTxt(t.r)})`, 'Le stop a glissé (ouverture en gap, marché agité) ou il a été éloigné. Quand le marché est nerveux, prends une taille plus petite : un stop n’est pas une garantie de prix.');
    }
    const bad = { fomo: 'la peur de rater le coup', revenge: 'l’envie de te refaire', euphoric: 'l’euphorie', stressed: 'le stress' };
    const e1 = emotions.find((e) => bad[e]);
    if (e1) push('emotion', 'warn', `Entrée sous l’effet de ${bad[e1]}`, 'Tu l’as noté toi-même dans ton journal. Cette émotion pousse à entrer tard ou trop gros : applique une règle simple, comme attendre une barre avant d’agir quand tu la ressens.');
    const idx = st.trades.findIndex((x) => x.id === t.id), prev = idx > 0 ? st.trades[idx - 1] : null;
    if (prev && prev.net < 0 && t.openIdx - prev.closeIdx <= 2 && notional(t) >= 1.3 * notional(prev)) {
      push('revenge', 'warn', 'Taille augmentée juste après une perte', `Tu as rouvert une position ${F.num(notional(t) / notional(prev), 1)} fois plus grosse en moins de trois barres après une perte. C’est le schéma du « revenge trading » : après une perte, on réduit la taille ou on attend.`);
    }
    if ((t.entries || []).some((e) => !e.reason || !e.emotion)) {
      push('journal', 'info', 'Journal incomplet', 'Sans la raison et l’émotion de l’entrée, ce trade ne t’apprend presque rien. Quelques secondes suffisent.');
    }
    if (!isOpt && t.reason !== 'Liquidation') {
      const e0 = (t.entries || [])[0] || {}, long = t.dir !== -1, ent = t.entry, atr = TA.atrAt(g, t.openIdx);
      const sl0 = e0.sl > 0 ? e0.sl : null, tp0 = e0.tp > 0 ? e0.tp : null, lv = levelsAt(st, t.openIdx);
      const tol = 0.1 * atr;
      // du côté du stop (support pour un achat, résistance pour une vente) et du côté de l'objectif
      const behind = lv.filter((l) => (long ? l.hi <= ent + tol : l.lo >= ent - tol)).sort((a, b) => (long ? b.hi - a.hi : a.lo - b.lo))[0];
      const ahead = lv.filter((l) => (long ? l.lo >= ent - tol : l.hi <= ent + tol)).sort((a, b) => (long ? a.lo - b.lo : b.hi - a.hi))[0];
      const roleB = long ? 'support' : 'résistance', roleA = long ? 'résistance' : 'support';
      if (behind && sl0 != null) {
        const edge = long ? behind.lo : behind.hi, near = Math.abs(ent - edge);
        const past = long ? edge - sl0 : sl0 - edge;   // > 0 : le stop est de l'autre côté du niveau
        const who = levelName(behind, roleB);
        if (near <= 6 * atr) {
          if (past > 0 && past <= 1.5 * atr) push('stoplevel', 'good', `Stop placé juste au-delà de ${who}`, `Ton stop est ${long ? 'sous' : 'au-dessus de'} le niveau que tu avais tracé, avec une marge raisonnable : si le niveau cède tu sors, et s’il tient, le bruit du marché ne te sort pas.`);
          else if (past <= 0) push('stoplevel', 'info', `Stop ${long ? 'au-dessus de' : 'en dessous de'} ${who}`, `Si le niveau tient, le prix peut rebondir juste là et toucher ton stop avant que ton idée ait eu raison. Place le stop de l’autre côté du niveau, avec une marge d’une demi à une amplitude moyenne de barre (environ ${F.money(atr)} ici).`);
          else if (past > 3 * atr) push('stopfar', 'info', `Stop très loin de ${who}`, `Entre ton niveau et ton stop, il y a ${F.money(past)} (${F.num(past / atr, 1)} fois l’amplitude moyenne d’une barre). Si le niveau casse, tu perds bien plus que nécessaire : rapproche le stop juste de l’autre côté.`);
        }
      }
      if (ahead) {
        const space = long ? ahead.lo - ent : ent - ahead.hi, risk = sl0 != null ? Math.abs(ent - sl0) : null, who = levelName(ahead, roleA);
        if (space > -tol && space < atr && (risk == null || space < risk)) {
          push('obstacle', 'warn', `Entrée tout près de ${who}`, `Il restait ${F.money(Math.max(0, space))} avant ce niveau${risk != null ? `, contre un risque de ${F.money(risk)}` : ''}. Un niveau proche limite le gain possible : attends que le prix le franchisse, ou entre plus ${long ? 'bas' : 'haut'}.`);
        }
        if (tp0 != null) {
          const far = long ? ahead.hi : ahead.lo, beyond = long ? tp0 - far : far - tp0, before = long ? ahead.lo - tp0 : tp0 - ahead.hi;
          if (beyond > 0.25 * atr) push('targetbeyond', 'info', `Objectif au-delà de ${who}`, 'Le prix doit d’abord franchir ce niveau pour atteindre ton objectif. Une sortie partielle au niveau, ou un objectif juste avant, rend le plan plus réaliste.');
          else if (before >= 0 && before <= 0.75 * atr) push('targetlevel', 'good', `Objectif placé juste avant ${who}`, 'Tu vises un prix que le marché a des chances d’atteindre avant l’obstacle : c’est ainsi qu’on place un objectif réaliste.');
        }
      }
      // la raison notée parle d'un niveau : en avait-il un de tracé près de l'entrée ?
      const r0 = (t.entries || []).map((e) => e.reason).find((r) => ['breakout', 'support', 'breakdown', 'reject'].includes(r));
      if (r0 && !lv.some((l) => ent >= l.lo - 1.5 * atr && ent <= l.hi + 1.5 * atr)) {
        push('reasonlevel', 'info', 'Entrée sur un niveau que tu n’avais pas tracé', `Ton journal dit « ${TA.labelOf(TA.REASONS, r0)} », mais aucun niveau tracé n’était proche de ton entrée. Trace-le avant d’entrer : un niveau écrit sur le graphique est un plan, un niveau « dans la tête » est une impression.`);
      }
    }
    if (isOpt) {
      if (t.reason === 'Expirée sans valeur') push('optworthless', 'info', 'Prime perdue en entier', 'L’option a expiré sans valeur : le temps joue contre l’acheteur. Choisis une échéance plus longue ou un prix d’exercice plus proche du prix actuel quand tu n’attends pas un mouvement rapide.');
      else if (t.reason.startsWith('Échéance') && t.net > 0) push('optitm', 'good', 'Option gardée jusqu’à l’échéance, dans la monnaie', 'Tu as encaissé la valeur intrinsèque. Compare ce résultat à une vente anticipée : parfois la valeur temps vaut la peine d’être récupérée avant.');
    } else {
      if (t.reason === 'Stop-loss' && t.r != null && t.r >= -1.3) push('stopok', 'good', `Le stop a fait son travail (${rTxt(t.r)})`, 'Perte limitée à ce que tu avais prévu. C’est exactement ainsi qu’un compte survit à une série de pertes.');
      if (t.r != null && t.r >= 2) push('rr', 'good', `Gain de ${rTxt(t.r)}`, 'Ton gain vaut plus de deux fois le risque pris : avec un ratio comme celui-ci, tu peux te tromper une fois sur deux et rester gagnant.');
      else if (t.reason === 'Take-profit') push('plan', 'good', 'Sortie à l’objectif prévu', 'Tu as pris ton gain à un niveau fixé à l’avance : c’est la marque d’un plan appliqué.');
    }
    const gross = t.net + t.fees;
    if (Math.abs(gross) > 0 && t.fees / Math.abs(gross) > 0.3 && t.fees > 5) push('fees', 'info', 'Les frais pèsent sur ce résultat', `Frais et spread : ${F.money(t.fees)}, soit ${pct1(t.fees / Math.abs(gross))} du résultat brut. Moins de transactions, mais plus soignées, coûtent moins cher.`);
    if (held <= 1 && !isOpt && t.reason !== 'Liquidation' && t.reason !== 'Stop-loss') push('short', 'info', 'Position tenue très peu de temps', 'Une seule barre : à ce rythme, les frais et le spread prennent une grande part du résultat. Laisse le trade respirer, sauf si ton plan prévoit cette sortie.');
    out.sort((a, b) => order[a.level] - order[b.level]);
    return out;
  };

  // Regroupe les transactions selon l'émotion ou la raison de la première entrée.
  function byKey(trades, field) {
    const m = new Map();
    for (const t of trades) {
      const e = (t.entries || [])[0], k = e && e[field];
      if (!k) continue;
      const o = m.get(k) || { n: 0, net: 0 };
      o.n++; o.net += t.net; m.set(k, o);
    }
    return m;
  }

  // Les lignes et zones tracées ont-elles tenu ? Un épisode commence quand le prix touche le niveau (à 0,3 amplitude près),
  // « tenu » si les cinq barres suivantes ne clôturent pas au-delà, « cédé » sinon.
  function levelStats(g, st) {
    const out = { n: 0, tested: 0, held: 0, broke: 0 };
    for (const d of st.draw || []) {
      if (d.k === 't') continue;   // une tendance bouge avec le temps : on juge seulement lignes et zones
      const lo = d.k === 'h' ? d.p : Math.min(d.a.p, d.b.p), hi = d.k === 'h' ? d.p : Math.max(d.a.p, d.b.p);
      out.n++;
      const side = g.c[d.at] >= hi ? 1 : g.c[d.at] <= lo ? -1 : 0;   // 1 : le prix était au-dessus (support), -1 : en dessous (résistance)
      if (side === 0) continue;
      const end = st.idx, away = (k) => (side === 1 ? g.l[k] > hi + TA.atrAt(g, k) : g.h[k] < lo - TA.atrAt(g, k));
      let k = d.at + 1;
      while (k <= end) {
        const tol = 0.3 * TA.atrAt(g, k);
        if (!(side === 1 ? g.l[k] <= hi + tol : g.h[k] >= lo - tol)) { k++; continue; }
        out.tested++;
        let broke = false;
        for (let j = k; j <= Math.min(end, k + 5); j++) {
          if (side === 1 ? g.c[j] < lo - 0.5 * TA.atrAt(g, j) : g.c[j] > hi + 0.5 * TA.atrAt(g, j)) { broke = true; break; }
        }
        if (broke) out.broke++; else out.held++;
        k++;
        while (k <= end && !away(k)) k++;   // on attend que le prix s'éloigne avant de compter un nouvel épisode
      }
    }
    return out;
  }

  TA.coachGame = function (g, st, sum) {
    const ts = st.trades, out = [], push = (id, level, title, text) => out.push({ id, level, title, text });
    const wins = ts.filter((t) => t.net > 0), losses = ts.filter((t) => t.net <= 0);
    const avgWin = wins.length ? wins.reduce((a, t) => a + t.net, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, t) => a + t.net, 0) / losses.length : 0;
    const payoff = avgLoss < 0 ? avgWin / -avgLoss : null, winRate = ts.length ? wins.length / ts.length : null;
    const fees = ts.reduce((a, t) => a + t.fees, 0), net = ts.reduce((a, t) => a + t.net, 0);
    const stats = { n: ts.length, winRate, avgWin, avgLoss, payoff, fees, net, expectancy: ts.length ? net / ts.length : 0, levels: levelStats(g, st) };
    if (!ts.length) {
      push('none', 'info', 'Aucune transaction', 'Rester en dehors du marché est une décision, mais on n’apprend à trader qu’en pratiquant. Essaie une petite taille avec un stop serré pour voir comment tes décisions se comportent.');
      return { findings: out, stats };
    }
    // espérance
    if (winRate != null && payoff != null) {
      if (winRate >= 0.5 && payoff < 0.8) push('expect', 'warn', 'Tu gagnes souvent, mais tes pertes sont plus grosses que tes gains', `Taux de réussite de ${pct1(winRate)}, mais gain moyen ${F.money(avgWin)} contre perte moyenne ${F.money(avgLoss)}. Coupe les pertes plus vite ou laisse courir tes gains plus longtemps.`);
      else if (winRate < 0.4 && payoff < 1.5) push('expect', 'warn', 'Peu de gains et des gains trop petits', `Seulement ${pct1(winRate)} de transactions gagnantes pour un ratio gain/perte de ${F.num(payoff, 1)}. Il faut l’un ou l’autre : viser des gains au moins deux fois plus grands que les pertes si tu te trompes souvent.`);
      else if (stats.expectancy > 0 && payoff >= 1.5) push('expect', 'good', 'Une bonne asymétrie', `Ton gain moyen vaut ${F.num(payoff, 1)} fois ta perte moyenne : même avec un taux de réussite modeste, cette structure est durable.`);
    }
    // fréquence
    const bars = Math.max(1, st.idx - g.startIdx);
    if (ts.length > bars / 4 && ts.length >= 6) push('overtrade', 'warn', 'Beaucoup de transactions pour la durée de la partie', `${ts.length} transactions en ${bars} barres, dont ${F.money(fees)} de frais et de spread. Chaque transaction doit avoir une raison claire : en faire moins permet d’en faire de meilleures.`);
    else if (fees > 0.01 * TA.CFG.START_CASH) push('fees', 'info', 'Les frais ont un poids réel', `${F.money(fees)} de frais sur la partie, soit ${pct1(fees / TA.CFG.START_CASH)} du capital.`);
    // discipline
    const d = st.disc || {};
    const slips = (d.noStop || 0) + (d.widened || 0) + (d.overRisk || 0);
    if (slips > 0) push('discipline', 'warn', `${slips} entorse${slips > 1 ? 's' : ''} à ta discipline`, `${d.noStop ? `${d.noStop} entrée${d.noStop > 1 ? 's' : ''} sans stop. ` : ''}${d.widened ? `${d.widened} stop${d.widened > 1 ? 's' : ''} éloigné${d.widened > 1 ? 's' : ''} ou retiré${d.widened > 1 ? 's' : ''}. ` : ''}${d.overRisk ? `${d.overRisk} fois plus de risque que le maximum de ta règle. ` : ''}Ces entorses coûtent le plus cher quand le marché va contre toi, et c’est justement là qu’on a envie de les faire.`);
    else if (ts.every((t) => t.kind === 'option' || t.risk0 > 0 || t.reason === 'Liquidation')) push('discipline', 'good', 'Stop et risque respectés sur toute la partie', 'Chaque entrée avait son stop et ton risque est resté dans ta règle. C’est la base sur laquelle tout le reste se construit.');
    // liquidations
    const liq = ts.filter((t) => t.reason === 'Liquidation');
    if (liq.length) push('liquidations', 'warn', `${liq.length} liquidation${liq.length > 1 ? 's' : ''}`, `Pertes de ${F.money(liq.reduce((a, t) => a + t.net, 0))} par liquidation forcée. Le levier réduit la distance entre ton entrée et la liquidation : prends une taille plus petite ou un levier plus bas, surtout sur un marché volatil.`);
    // émotions et raisons : où l'argent est perdu
    for (const [field, label, names] of [['emotion', 'émotion', TA.EMOTIONS], ['reason', 'raison d’entrée', TA.REASONS]]) {
      const groups = [...byKey(ts, field)].filter(([, v]) => v.n >= 2 && v.net < 0).sort((a, b) => a[1].net - b[1].net);
      if (groups.length) {
        const [k, v] = groups[0];
        push('by_' + field, 'warn', `Tes pertes se concentrent sur une ${label} : « ${TA.labelOf(names, k)} »`, `${v.n} transactions, ${F.money(v.net)} au total. Relis ces entrées dans ton journal : qu’est-ce qui se répète ?`);
      }
    }
    // avec le recul : sorties trop tôt, gains rendus, stops trop serrés (la partie est finie)
    const last = Math.min(g.N - 1, g.endIdx + 15);
    let early = 0, earlyMove = 0, gaveBack = 0, whipsaw = 0;
    for (const t of ts) {
      if (t.kind === 'option' || t.reason === 'Liquidation' || t.reason === 'Fin de partie') continue;
      const longPos = t.dir !== -1, from = t.openIdx, to = t.closeIdx;
      const after = Math.min(last, to + 15);
      let bestAfter = t.exit, peak = t.entry;
      for (let k = from; k <= to; k++) peak = longPos ? Math.max(peak, g.h[k]) : Math.min(peak, g.l[k]);
      for (let k = to + 1; k <= after; k++) bestAfter = longPos ? Math.max(bestAfter, g.h[k]) : Math.min(bestAfter, g.l[k]);
      const realized = (t.dir === -1 ? t.entry - t.exit : t.exit - t.entry) / t.entry;
      const further = (t.dir === -1 ? t.exit - bestAfter : bestAfter - t.exit) / t.entry;
      const peakGain = (t.dir === -1 ? t.entry - peak : peak - t.entry) / t.entry;
      if (t.net > 0 && ['Vente au marché', 'Rachat au marché', 'Take-profit', 'Ordre limite'].includes(t.reason) && further >= Math.max(0.03, realized)) { early++; earlyMove += further; }
      if (t.net > 0 && peakGain >= 0.03 && (peakGain - realized) / peakGain > 0.5) gaveBack++;
      if (t.reason === 'Stop-loss' && to < last) {
        let back = false;
        for (let k = to + 1; k <= Math.min(last, to + 10); k++) if (longPos ? g.c[k] > t.entry : g.c[k] < t.entry) { back = true; break; }
        if (back) whipsaw++;
      }
    }
    if (early) push('early', 'warn', `${early} sortie${early > 1 ? 's' : ''} trop tôt`, `Après ta sortie, le prix a continué dans ton sens d’environ ${pct1(earlyMove / early)} en moyenne. Un stop suiveur ou une sortie en deux temps te laisse profiter de la suite sans tout risquer.`);
    if (gaveBack) push('gaveback', 'warn', `${gaveBack} gain${gaveBack > 1 ? 's' : ''} rendu${gaveBack > 1 ? 's' : ''} en grande partie`, 'Tu étais bien en gain, puis plus de la moitié du gain maximal s’est évaporée avant la sortie. Remonter ton stop à mesure que le prix avance protège ce que tu as gagné.');
    if (whipsaw) push('whipsaw', 'info', `${whipsaw} stop touché${whipsaw > 1 ? 's' : ''} avant que le prix reparte`, 'Le stop a été touché, puis le prix est revenu au-delà de ton entrée dans les dix barres suivantes. Soit le stop était trop serré pour la volatilité, soit c’est le prix normal d’une protection : compare avec l’amplitude moyenne des barres.');
    // niveaux tracés
    const L = stats.levels;
    if (!(st.draw || []).length && ts.length >= 2) push('nolevels', 'info', 'Aucun niveau tracé', 'Avec l’outil « Support / résistance », marque les prix où le marché a déjà réagi avant d’entrer : tes stops et tes objectifs auront alors une raison d’être, et le coach pourra les évaluer.');
    else if (L.n > 0) {
      if (L.tested >= 2 && L.held / L.tested >= 0.6) push('levels', 'good', `Tes niveaux ont tenu (${L.held} sur ${L.tested})`, 'Tu lis bien les endroits où le marché réagit. Continue de placer tes stops de l’autre côté de ces niveaux.');
      else if (L.tested >= 2 && L.held / L.tested <= 0.4) push('levels', 'info', `Tes niveaux ont souvent cédé (${L.broke} sur ${L.tested})`, 'Une ligne exacte est rarement respectée au centime : trace plutôt une zone qui couvre les mèches, ou attends une clôture de l’autre côté avant de conclure que le niveau tient.');
      else if (L.tested === 0) push('levels', 'info', 'Tes niveaux n’ont pas été testés', 'Le prix n’est jamais revenu sur les niveaux que tu as tracés pendant la partie : ils restent à valider.');
    }
    out.sort((a, b) => order[a.level] - order[b.level]);
    return { findings: out.slice(0, 7), stats };
  };

  // Données anonymes pour le coach IA : rien qui révèle l'actif ni la date tant que la partie n'est pas terminée.
  TA.coachPayload = function (g, st, t, reveal) {
    const eqAt = st.equity[Math.max(0, t.openIdx - g.startIdx)] || TA.CFG.START_CASH;
    return {
      marche: TA.MARKETS[g.market || 'stock'].name,
      sens: t.kind === 'option' ? `option ${t.opt.kind === 'call' ? 'call' : 'put'}` : t.dir === -1 ? 'vente à découvert' : 'achat',
      quantite: t.qty, barres_detenues: t.closeIdx - t.openIdx,
      risque_initial_pct_compte: t.risk0 ? +(100 * t.risk0 / eqAt).toFixed(2) : null,
      resultat_net_dollars: Math.round(t.net), multiple_R: t.r == null ? null : +t.r.toFixed(2), sortie: t.reason,
      frais_dollars: Math.round(t.fees), regle_de_risque: st.rules.mode === 'block' ? `obligatoire, ${(100 * st.rules.max).toFixed(0)} % maximum` : 'conseillée',
      niveau: (TA.LEVELS[(st.level || 1) - 1] || {}).name,
      journal: (t.entries || []).map((e) => ({ raison: TA.labelOf(TA.REASONS, e.reason), emotion: TA.labelOf(TA.EMOTIONS, e.emotion), note: e.note || null })),
      note_apres_coup: t.note || null,
      ...(t.kind === 'option' ? {} : (() => {
        const e0 = (t.entries || [])[0] || {}, atr = TA.atrAt(g, t.openIdx), r2 = (x) => +x.toFixed(2);
        return {
          stop_initial: e0.sl > 0 ? r2(e0.sl) : null, objectif_initial: e0.tp > 0 ? r2(e0.tp) : null, prix_entree: r2(t.entry), amplitude_moyenne_barre: r2(atr),
          niveaux_traces_connus_a_l_entree: TA.levelsAt(st, t.openIdx).slice(0, 6).map((l) => ({ type: l.k === 'h' ? 'ligne' : l.k === 'r' ? 'zone' : 'tendance', bas: r2(l.lo), haut: r2(l.hi) })),
        };
      })()),
      constats_du_coach_a_regles: TA.coachTrade(g, st, t).map((f) => f.title),
      ...(reveal ? { actif: g.meta.s, titre: g.meta.n } : {}),
    };
  };
})();
