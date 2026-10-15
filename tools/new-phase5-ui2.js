  // Adapte l'écran de partie au compte Live : vrais prix, vraies dates, plus de bouton « jour suivant ».
  function applyLiveChrome() {
    const live = isLive(), g = App.g, st = App.st, i = st.idx;
    for (const id of ['#btn-next', '#tm-mode', '#mb-next']) $(id).hidden = live;
    if (live) $('#rt').hidden = true;
    const name = document.querySelector('.asset .name');
    name.textContent = live ? `${g.meta.s} · ${g.meta.n}` : 'Actif mystère';
    let note = document.getElementById('live-note');
    if (live) {
      $('#px').textContent = `${realPx(g.c[i])} ${g.meta.cur || ''}`.trim();
      $('#prog-txt').textContent = `Dernière séance : ${shortDay(g.t[i])}`;
      $('#prog-bar').style.width = '100%';
      if (!note) { note = document.createElement('span'); note.id = 'live-note'; note.className = 'fine'; document.querySelector('.chart-head').appendChild(note); }
      const k = g.live.k;
      note.textContent = k === 1 ? 'Cours réels. Le compte avance quand de nouvelles cotes sont publiées.' : `Prix du graphique et du ticket ×${F.num(k, k < 1 ? 2 : 0)} : cours réel = prix ÷ ${F.num(k, k < 1 ? 2 : 0)}. Le compte avance quand de nouvelles cotes sont publiées.`;
      note.hidden = false;
    } else if (note) note.hidden = true;
    const be = $('#btn-end'); if (be && !be.dataset.armed) be.textContent = live ? 'Clôturer le compte' : 'Terminer la partie';
  }

