import fs from 'node:fs';
const f = 'trading/index.html';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('repère introuvable : ' + a.slice(0, 80)); s = s.replace(a, () => b); };

// mode Entraînement / Live
rep(`        <div class="row"><span class="lab">Mode</span>
          <div class="seg" role="group" aria-label="Mode">
            <button type="button" class="on">Entraînement</button>
            <button type="button" disabled title="Prix récents en direct : prévu à la phase 5">Live · bientôt</button>
          </div></div>`, `        <div class="row"><span class="lab">Mode</span>
          <div class="seg" id="s-mode" role="group" aria-label="Mode">
            <button type="button" data-v="train" class="on">Entraînement</button>
            <button type="button" data-v="live" id="mode-live">Live</button>
          </div></div>
        <p class="hint" id="s-mode-desc"></p>`);
// actif du compte Live
rep(`        <p class="hint" id="s-market-desc"></p>`, `        <p class="hint" id="s-market-desc"></p>
        <div class="row" id="r-asset" hidden><label class="lab" for="s-asset">Actif</label><select id="s-asset"></select></div>`);
// code de défi : reconnaissance
rep(`        <p class="err" id="s-err" role="alert"></p>`, `        <p class="hint" id="s-code-desc"></p>
        <p class="err" id="s-err" role="alert"></p>`);
// cartes d'accueil
rep(`      <form class="card setup" id="setup"`, `      <section class="card resume" id="live-card" hidden></section>
      <form class="card setup" id="setup"`);
rep(`      <section class="card" id="learn-card" aria-label="Formation"></section>`, `      <section class="card" id="board-card" aria-label="Classement"></section>
      <section class="card" id="learn-card" aria-label="Formation"></section>`);
// écran du classement
rep(`  <!-- ===== Formation ===== -->`, `  <!-- ===== Classement ===== -->
  <main class="board" id="screen-board" hidden>
    <div class="lhead"><h1>Classement</h1><button class="btn" type="button" id="b-back">Retour à l’accueil</button></div>
    <p class="dim" id="b-status" style="margin:0"></p>
    <div class="bfilters">
      <label class="field"><span>Code de défi</span><input id="b-code" placeholder="ABCD-2345 ou ABCD-2345-A0S1" autocomplete="off" spellcheck="false"></label>
      <label class="field"><span>Joueur</span><select id="b-pseudo"></select></label>
      <label class="field"><span>Mode</span><select id="b-mode"><option value="all">Tous</option><option value="train">Entraînement</option><option value="live">Live</option></select></label>
      <label class="field"><span>Marché</span><select id="b-market"><option value="all">Tous</option><option value="stock">Actions</option><option value="forex">Forex</option><option value="crypto">Crypto</option></select></label>
    </div>
    <div class="scroll-x"><table class="tbl btable" id="b-table"></table></div>
    <p class="fine" id="b-note"></p>
  </main>

  <!-- ===== Formation ===== -->`);
rep(`<script src="js/coach.js"></script>`, `<script src="js/coach.js"></script>
<script src="js/board.js"></script>`);
// CSS
rep(`/* ---- options et coach ---- */`, `/* ---- classement ---- */
.board{display:grid;gap:12px;padding-block:28px 56px;max-width:1100px;margin:0 auto}
.bfilters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.btable{min-width:760px}
.btable th{white-space:nowrap}
.btable th button{background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer}
.btable th button:hover{color:var(--text)}
.btable th[aria-sort] button{color:var(--text)}
.btable td.r,.btable th.r{text-align:right}
.btable tr.me td{background:var(--accent-a)}
.btable .code{font-family:var(--f-mono);font-size:12px;color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-align:left}
.btable .code:hover{color:var(--accent)}
@media (max-width:700px){.bfilters{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* ---- options et coach ---- */`);
fs.writeFileSync(f, s);
console.log('ok');
