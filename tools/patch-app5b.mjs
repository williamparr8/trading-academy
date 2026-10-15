import fs from 'node:fs';
const f = 'trading/js/app.js';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 90)); s = s.replace(a, () => b); };

// updateAll : puces du contexte et adaptation Live
rep("    $('#ctx').innerHTML = `<span class=\"tag\">Entraînement</span><span class=\"tag\">${esc(TA.MARKETS[g.market].name)}</span><span class=\"tag\">${esc(u.name)}</span><span class=\"tag\">${esc(sc ? sc.name : '')}</span>",
  "    const lead = isLive() ? `<span class=\"tag\">Live</span><span class=\"tag\">${esc(TA.MARKETS[g.market].name)}</span><span class=\"tag\">Cotes au ${shortDay(g.t[i])}</span>` : `<span class=\"tag\">Entraînement</span><span class=\"tag\">${esc(TA.MARKETS[g.market].name)}</span><span class=\"tag\">${esc(u.name)}</span><span class=\"tag\">${esc(sc ? sc.name : '')}</span>`;\n    $('#ctx').innerHTML = `${lead}");
rep("id=\"copy-code\" title=\"Copier le code de la partie\">Code ${esc(App.cfg.code)}</button>`;", "id=\"copy-code\" title=\"Copier le code de défi\">${isLive() ? esc(App.cfg.code) : 'Défi ' + esc(App.cfg.challenge || App.cfg.code)}</button>`;");
rep("updateTicket(); renderPos(); renderOpts(); renderOrders(); renderJournal(); renderCoach();", "updateTicket(); renderPos(); renderOpts(); renderOrders(); renderJournal(); renderCoach(); applyLiveChrome();");

// légende : prix réels au compte Live
rep("`<span>O <b>${n2(g.o[i])}</b></span><span>H <b>${n2(g.h[i])}</b></span><span>B <b>${n2(g.l[i])}</b></span><span>F <b>${n2(g.c[i])}</b></span>",
  "`<span>O <b>${g.live ? realPx(g.o[i]) : n2(g.o[i])}</b></span><span>H <b>${g.live ? realPx(g.h[i]) : n2(g.h[i])}</b></span><span>B <b>${g.live ? realPx(g.l[i]) : n2(g.l[i])}</b></span><span>F <b>${g.live ? realPx(g.c[i]) : n2(g.c[i])}</b></span>");

// journal : une seule date pour un compte Live
rep("const when = (i, reveal) => (reveal ? `${rel(i)} · ${F.date(App.g.t[i])}` : rel(i));", "const when = (i, reveal) => (reveal && !App.g.live ? `${rel(i)} · ${F.date(App.g.t[i])}` : rel(i));");

// fin de partie : profil, résultats complets, clé de sauvegarde
rep("const out = TA.applyResult(App.profile, { code: App.cfg.code, level, ev, ret: sum.retPct, dd: sum.maxDD, trades: sum.trades, replay: !!App.cfg.replay });\n    saveProfile();\n    App.endInfo = { level, ev, out };\n    const res = store.get(KEY_RESULTS) || [];\n    res.unshift({ at: Date.now(), code: App.cfg.code, style: App.cfg.style, scenario: App.cfg.resolved, asset: App.g.meta.s, ret: sum.retPct, bh: sum.bh, trades: sum.trades });\n    store.set(KEY_RESULTS, res.slice(0, 50));\n    store.del(KEY_SAVE);\n    showEnd(sum);",
  "const live = isLive();\n    const out = TA.applyResult(App.profile, { code: App.cfg.code, level, ev, ret: sum.retPct, dd: sum.maxDD, trades: sum.trades, replay: !!App.cfg.replay, live });\n    saveProfile();\n    App.endInfo = { level, ev, out, fresh: !App.cfg.replay };\n    App.sum = sum;\n    const res = store.get(KEY_RESULTS) || [];\n    res.unshift(TA.boardRow(App.cfg, App.st, sum, App.prefs.pseudo || 'Moi', App.uid || deviceId(), App.cfg.challenge || App.cfg.code));\n    store.set(KEY_RESULTS, res.slice(0, 100));\n    store.del(live ? KEY_LIVE : KEY_SAVE);\n    showEnd(sum);");

// écran de fin : texte du compte Live, carte de publication, défi à copier
rep("<p class=\"eyebrow\">Tu viens de trader…</p>", "<p class=\"eyebrow\">${isLive() ? 'Compte Live clôturé' : 'Tu viens de trader…'}</p>");
rep("${s.bars} ${s.bars > 1 ? (g.style === 'long' ? 'semaines' : g.market === 'stock' ? 'jours de bourse' : 'jours') : u.barName} · ${esc(sc ? sc.name : '')}</p>",
  "${s.bars} ${s.bars > 1 ? (g.style === 'long' ? 'semaines' : g.market === 'stock' ? 'jours de bourse' : 'jours') : u.barName} · ${isLive() ? 'Compte Live' : esc(sc ? sc.name : '')}</p>");
rep("      ${disciplineHTML(App.endInfo)}\n      <section class=\"card\"><h2>Ton journal</h2>", "      ${disciplineHTML(App.endInfo)}\n      ${publishHTML()}\n      <section class=\"card\"><h2>Ton journal</h2>");
rep("<button class=\"btn\" type=\"button\" id=\"e-replay\">Rejouer ce défi (code ${esc(App.cfg.code)})</button>",
  "${isLive() ? '' : `<button class=\"btn\" type=\"button\" id=\"e-replay\">Rejouer ce défi</button><button class=\"btn\" type=\"button\" id=\"e-copy\">Copier le code de défi ${esc(App.cfg.challenge || App.cfg.code)}</button>`}");
rep("    $('#e-replay').onclick = async () => {", "    const copyBtn = $('#e-copy');\n    if (copyBtn) copyBtn.onclick = () => { const c = App.cfg.challenge || App.cfg.code; try { navigator.clipboard.writeText(c).then(() => toast('Code de défi copié : ' + c, 'ok'), () => toast('Code de défi : ' + c, 'info', 8000)); } catch (e) { toast('Code de défi : ' + c, 'info', 8000); } };\n    const pubGo = $('#pub-go'); if (pubGo) pubGo.onclick = publishScore;\n    const pubSee = $('#pub-see'); if (pubSee) pubSee.onclick = openBoard;\n    const replayBtn = $('#e-replay');\n    if (replayBtn) replayBtn.onclick = async () => {");
rep("function goHome() { pause(); saveNow(); show('home'); renderResume(); renderProfile(); refreshSetup(); renderLearnCard(); }",
  "function goHome() { pause(); saveNow(); show('home'); renderResume(); renderLiveCard(); renderProfile(); refreshSetup(); renderLearnCard(); }");

// branchements
rep("    $('#t-go').onclick = submitTicket;", `    $('#t-go').onclick = submitTicket;
    // accueil : mode, défi, classement
    bindSeg($('#s-mode'), (v) => { App.prefs.mode = v; applyMode(); savePrefs(); });
    $('#s-asset').addEventListener('change', () => { App.prefs.asset = $('#s-asset').value; savePrefs(); });
    $('#s-code').addEventListener('input', onCodeInput);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#board-open')) { openBoard(); return; }
      if (e.target.closest('#b-back')) { goHome(); return; }
      const so = e.target.closest('#b-table [data-sort]');
      if (so) {
        const k = so.dataset.sort, B = App.board;
        if (B.sort === k) B.dir = B.dir === 'desc' ? 'asc' : 'desc';
        else { B.sort = k; B.dir = ['pseudo', 'mode', 'market', 'scenario'].includes(k) ? 'asc' : 'desc'; }
        renderBoard(); return;
      }
      const cd = e.target.closest('#b-table [data-code]');
      if (cd) { App.board.filter.code = cd.dataset.code; $('#b-code').value = cd.dataset.code; renderBoard(); return; }
      const pl = e.target.closest('#b-table [data-play]');
      if (pl) { playChallenge(pl.dataset.play); return; }
      const dl = e.target.closest('#b-table [data-del]');
      if (dl && App.db) {
        App.db.doc('games/' + dl.dataset.del).delete().then(() => toast('Partie retirée du classement.', 'info'), () => toast('Impossible de retirer cette partie.', 'err'));
      }
    });
    $('#b-code').addEventListener('input', () => { App.board.filter.code = $('#b-code').value; renderBoard(); });
    for (const [id, key] of [['b-pseudo', 'pseudo'], ['b-mode', 'mode'], ['b-market', 'market']]) $('#' + id).addEventListener('change', () => { App.board.filter[key] = $('#' + id).value; renderBoard(); });`);

// démarrage
rep("    renderResume(); renderProfile(); renderLearnCard();\n    detectAI();", "    renderResume(); renderLiveCard(); renderProfile(); renderLearnCard(); renderBoardCard();\n    detectAI(); detectShared();");
rep("      setReady(true);\n    } catch (e) {\n      $('#s-err').textContent = 'Les cotes historiques", "      setReady(true); refreshSetup(); renderLiveCard();\n    } catch (e) {\n      $('#s-err').textContent = 'Les cotes historiques");
fs.writeFileSync(f, s);
console.log('ok');
