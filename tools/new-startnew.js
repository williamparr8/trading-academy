  async function startNew() {
    if (App.prefs.mode === 'live') { startLive(); return; }
    const err = $('#s-err'); err.textContent = '';
    // un code de défi complet impose marché, scénario, style et durée : même partie que chez l'ami
    const raw = $('#s-code').value, ch = TA.parseChallenge(raw);
    let style = App.prefs.style, lenIdx = Math.min(App.prefs.len | 0, 2), scen = $('#s-scen').value, market = App.prefs.market;
    if (ch && ch.full) { style = ch.style; lenIdx = ch.lenIdx; scen = ch.scenarioId; market = ch.market; }
    const code = ch ? ch.code : TA.normCode(raw) || TA.newCode(), len = TA.STYLES[style].lengths[lenIdx].n;
    const level = App.profile.level, access = TA.marketAccess(market, level);
    if (!access.ok) { err.textContent = access.why; return; }
    const plan = TA.planGame(code, scen, style, len, App.index, market);
    if (!plan) { err.textContent = 'Aucune donnée ne correspond à ce choix. Essaie une durée plus courte.'; return; }
    setReady(false, 'Chargement…');
    try {
      const g = TA.buildGame(await loadAsset(plan.assetId), plan, style, len);
      const rules = TA.rulesOf($('#s-risk').value).id, lev = +$('#s-lev').value || 1;
      const challenge = TA.makeChallenge(code, market, scen, style, lenIdx);
      begin({ v: 1, mode: 'train', code, challenge, scenario: scen, resolved: plan.scenarioId, style, length: len, lenIdx, plan, market, time: App.prefs.time, rules, level, maxLev: lev, created: Date.now() }, g, TA.newState(g, rules, level, lev));
      $('#s-code').value = ''; onCodeInput();
    } catch (e) {
      err.textContent = 'Impossible de charger les cotes : ' + e.message;
    }
    setReady(true);
  }

