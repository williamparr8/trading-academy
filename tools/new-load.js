  function cleanCfg(c) {
    const okNum = Number.isInteger;
    const live = !!(c && c.mode === 'live');
    if (!c || typeof c.code !== 'string' || !TA.STYLES[c.style] || !okNum(c.length) || (!live && (c.length < 10 || c.length > 400)) || !c.plan) throw new Error('Fichier de sauvegarde invalide.');
    const p = c.plan;
    if (typeof p.assetId !== 'string' || !App.index.assets.some((a) => a.id === p.assetId) || !okNum(p.startDay)) throw new Error('Fichier de sauvegarde invalide.');
    const sc = TA.SCENARIOS.some((s) => s.id === c.scenario) ? c.scenario : 'random';
    const rs = TA.SCENARIOS.some((s) => s.id === c.resolved) ? c.resolved : sc;
    const market = TA.MARKETS[c.market] ? c.market : 'stock', lenIdx = okNum(c.lenIdx) && c.lenIdx >= 0 && c.lenIdx <= 2 ? c.lenIdx : 0, code = TA.normCode(c.code).slice(0, 12);
    const out = { v: 1, mode: live ? 'live' : 'train', code, scenario: sc, resolved: rs, style: live ? 'swing' : c.style, length: live ? 400 : c.length, lenIdx, plan: { assetId: p.assetId, startDay: p.startDay, scenarioId: rs, market }, market, maxLev: okNum(c.maxLev) ? c.maxLev : 1, time: c.time === 'rt' && !live ? 'rt' : 'turn', rules: TA.rulesOf(c.rules).id, created: okNum(c.created) ? c.created : Date.now() };
    if (live) {
      if (!(c.live && Number.isFinite(c.live.k) && c.live.k > 0)) throw new Error('Fichier de sauvegarde invalide.');
      out.live = { k: c.live.k };
    } else out.challenge = TA.makeChallenge(code, market, sc, out.style, lenIdx);
    return out;
  }
  async function loadFromSave(o) {
    if (!App.index) throw new Error('Les cotes sont encore en chargement, réessaie dans un instant.');
    if (!o || typeof o !== 'object' || o.app !== 'trading-academy') throw new Error('Ce fichier n’est pas une sauvegarde Trading Academy.');
    if (o.v !== 1) throw new Error('Version de sauvegarde non prise en charge.');
    const cfg = cleanCfg(o.cfg), live = cfg.mode === 'live';
    const g = TA.buildGame(await loadAsset(cfg.plan.assetId), cfg.plan, cfg.style, live ? 1e9 : cfg.length, live ? { live: cfg.live } : undefined);
    const st = TA.sanitizeState(o.st, g);
    cfg.rules = st.rules.id;   // la règle suit l'état de la partie (sauvegardes de la phase 1 : « conseillée »)
    if (st.level == null) st.level = App.profile.level;   // ancienne sauvegarde : niveau actuel
    cfg.level = st.level; cfg.maxLev = st.maxLev; cfg.market = g.market;
    cfg.replay = !!(o.cfg && o.cfg.replay);
    // compte Live : on intègre les séances publiées depuis la dernière ouverture
    const gap = live && !st.closed ? catchUp(g, st) : { n: 0, notes: [] };
    begin(cfg, g, st);
    if (gap.n) {
      toast(`${gap.n} nouvelle${gap.n > 1 ? 's' : ''} séance${gap.n > 1 ? 's' : ''} intégrée${gap.n > 1 ? 's' : ''} : ton compte est à jour au ${shortDay(g.t[st.idx])}.`, 'info', 6000);
      gap.notes.slice(0, 4).forEach((m) => toast(m, 'warn', 7000));
    }
  }
