// Exercícios: respiração guiada, botão de impulso, meditação, aterramento.
(function () {
  const PATTERNS = {
    calma: { name: 'Respiração calmante', phases: [['Inspire', 4, 'in'], ['Segure', 2, 'hold'], ['Expire devagar', 6, 'out']] },
    '478': { name: 'Respiração 4-7-8', phases: [['Inspire pelo nariz', 4, 'in'], ['Segure', 7, 'hold'], ['Expire pela boca', 8, 'out']] },
    caixa: { name: 'Respiração quadrada', phases: [['Inspire', 4, 'in'], ['Segure', 4, 'hold'], ['Expire', 4, 'out'], ['Segure', 4, 'holdout']] }
  };

  // Desenha e anima um círculo de respiração dentro de `host`.
  function breathe(host, patternKey, totalSec, onDone) {
    const pat = PATTERNS[patternKey];
    host.innerHTML = `
      <div class="breath">
        <div class="breath-orb"><div class="breath-core"></div></div>
        <p class="breath-label">Prepare-se…</p>
        <p class="breath-time"></p>
      </div>`;
    const orb = host.querySelector('.breath-orb');
    const label = host.querySelector('.breath-label');
    const time = host.querySelector('.breath-time');
    const end = Date.now() + totalSec * 1000;
    let i = -1, timer = null, ticker = null, stopped = false;

    function next() {
      if (stopped) return;
      if (Date.now() >= end) { finish(); return; }
      i = (i + 1) % pat.phases.length;
      const [txt, sec, kind] = pat.phases[i];
      label.textContent = txt;
      orb.style.transitionDuration = sec + 's';
      orb.dataset.phase = kind;
      if (kind === 'in') U.play('breathIn', sec);
      else if (kind === 'out') U.play('breathOut', sec);
      else U.play('hold');
      if (kind === 'in') U.vibrate(30); else if (kind === 'out') U.vibrate([10, 40, 10]);
      timer = setTimeout(next, sec * 1000);
    }
    function tick() {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      time.textContent = `${Math.floor(left / 60)}:${U.pad(left % 60)}`;
    }
    function finish() { stop(); onDone && onDone(); }
    function stop() { stopped = true; clearTimeout(timer); clearInterval(ticker); }

    tick();
    ticker = setInterval(tick, 250);
    timer = setTimeout(next, 900);
    return { stop };
  }

  // -------------------------------------------------------------------
  // Botão de impulso: surfar a onda
  // -------------------------------------------------------------------
  const TRIGGERS = ['Ansiedade', 'Tédio', 'Estresse', 'Solidão', 'Cansaço', 'Tristeza', 'Raiva', 'Redes sociais', 'Celular à noite', 'Fome'];

  function triggerList() {
    const custom = G.settings().triggers || [];
    const used = {};
    S.impulses.forEach(i => (i.triggers || []).forEach(t => { if (!t.includes(':') && !['hrt', 'rápido', 'interrompi', 'simulação'].includes(t)) used[t] = (used[t] || 0) + 1; }));
    const all = [...new Set([...custom, ...TRIGGERS, ...Object.keys(used)])];
    return all.sort((a, b) => (used[b] || 0) - (used[a] || 0));
  }

  function openImpulse() {
    const kinds = [...new Set(S.impulses.map(i => i.kind).filter(k => k && k !== 'Coçar'))].slice(-12);
    const data = { kind: '', before: 7, after: null, triggers: new Set(), note: '' };
    let breath = null;

    const m = U.modal(`<div class="impulse" id="impulseBody"></div>`, {
      cls: 'full', dismissable: false, onClose: () => breath && breath.stop()
    });
    const body = m.el.querySelector('#impulseBody');

    function step1() {
      body.innerHTML = `
        <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
        <div class="impulse-hero">
          <div class="wave-emoji">🌊</div>
          <h2>Tudo bem. Você está no controle.</h2>
          <p class="muted">Um impulso é como uma onda: ele sobe, atinge o pico e passa. Normalmente em poucos minutos. Você não precisa obedecer, só precisa surfar.</p>
        </div>
        ${P.impulseBlock()}
        <button class="btn soft block hrt-shortcut" id="impHrt">✋ É vontade de coçar? Abrir o treino anti-coçar</button>
        <label class="field">
          <span>Qual é o impulso? <em class="muted">(opcional)</em></span>
          <input class="input" id="impKind" list="impKinds" maxlength="60" placeholder="ex.: celular, doce, comprar, cigarro…" autocomplete="off">
          <datalist id="impKinds">${kinds.map(k => `<option value="${U.esc(k)}">`).join('')}</datalist>
        </label>
        <label class="field">
          <span>Intensidade agora: <b id="impBeforeVal">${data.before}</b>/10</span>
          <input type="range" id="impBefore" min="1" max="10" value="${data.before}">
        </label>
        <button class="btn sos-btn block" id="impStart">Surfar a onda · 90 segundos</button>
        <button class="btn ghost block" id="impSkip">Pular respiração e registrar</button>`;
      const r = body.querySelector('#impBefore');
      r.oninput = () => { body.querySelector('#impBeforeVal').textContent = r.value; };
      const collect = () => { data.kind = body.querySelector('#impKind').value.trim(); data.before = +r.value; };
      body.querySelector('#impStart').onclick = () => { collect(); step2(); };
      body.querySelector('#impHrt').onclick = () => { m.close(); setTimeout(() => H.open(), 230); };
      if (P.impulseBlock()) G.flag('planRead');
      body.querySelector('#impSkip').onclick = () => { collect(); step3(); };
    }

    function step2() {
      body.innerHTML = `
        <div class="impulse-breath">
          <p class="eyebrow">Respire comigo</p>
          <div id="breathHost"></div>
          <p class="muted small center">Observe o impulso sem agir. Note onde ele aparece no corpo. Ele vai diminuir.</p>
          <button class="btn ghost block" id="breathEnd">Já passou, continuar</button>
        </div>`;
      breath = breathe(body.querySelector('#breathHost'), 'calma', 90, () => { U.play('soft'); step3(); });
      body.querySelector('#breathEnd').onclick = () => { breath.stop(); step3(); };
    }

    function step3() {
      breath && breath.stop();
      body.innerHTML = `
        <h2 class="center">E agora?</h2>
        <label class="field">
          <span>Intensidade do impulso agora: <b id="impAfterVal">${Math.max(1, data.before - 2)}</b>/10</span>
          <input type="range" id="impAfter" min="1" max="10" value="${Math.max(1, data.before - 2)}">
        </label>
        <div class="field">
          <span>O que disparou? <em class="muted">(toque para marcar)</em></span>
          <div class="chips" id="trigChips">
            ${triggerList().map(t => `<button type="button" class="chip" data-t="${U.esc(t)}">${U.esc(t)}</button>`).join('')}
            <button type="button" class="chip add" id="trigAdd">+ outro</button>
          </div>
        </div>
        <label class="field">
          <span>Algo que queira anotar? <em class="muted">(opcional)</em></span>
          <textarea id="impNote" rows="2" maxlength="500" placeholder="O que estava acontecendo, como se sentiu…"></textarea>
        </label>
        <div class="decide">
          <button class="btn primary big" id="impWon">💪 Resisti!</button>
          <button class="btn soft big" id="impLost">Cedi dessa vez</button>
        </div>`;
      const r = body.querySelector('#impAfter');
      r.oninput = () => { body.querySelector('#impAfterVal').textContent = r.value; };
      body.querySelector('#trigChips').onclick = e => {
        const c = e.target.closest('.chip'); if (!c) return;
        if (c.id === 'trigAdd') {
          const t = (prompt('Qual gatilho?') || '').trim().slice(0, 30);
          if (!t) return;
          data.triggers.add(t);
          const nb = document.createElement('button');
          nb.type = 'button'; nb.className = 'chip on'; nb.dataset.t = t; nb.textContent = t;
          c.before(nb);
          const list = G.settings().triggers || [];
          if (!list.includes(t)) G.saveSettings({ triggers: list.concat(t).slice(-20) });
          return;
        }
        const t = c.dataset.t;
        data.triggers.has(t) ? data.triggers.delete(t) : data.triggers.add(t);
        c.classList.toggle('on');
      };
      const save = resisted => {
        data.after = +r.value;
        data.note = body.querySelector('#impNote').value.trim();
        finish(resisted);
      };
      body.querySelector('#impWon').onclick = () => save(true);
      body.querySelector('#impLost').onclick = () => save(false);
    }

    async function finish(resisted) {
      const row = {
        user_id: S.user.id, date: U.today(), kind: data.kind || null,
        intensity_before: data.before, intensity_after: data.after,
        resisted, triggers: [...data.triggers], note: data.note || null
      };
      body.innerHTML = `<div class="center pad"><div class="spinner"></div></div>`;
      try {
        const saved = await DB.insert('impulse_logs', row);
        S.impulses.push(saved);
      } catch (e) {
        console.error(e);
        U.toast('Não consegui salvar. Verifique sua conexão.', 'error');
        m.close();
        return;
      }
      const month = U.today().slice(0, 7);
      const monthWins = S.impulses.filter(i => i.resisted && i.kind !== 'Coçar' && i.date.startsWith(month)).length;
      if (resisted) {
        U.play('achievement'); U.vibrate([30, 40, 30]);
        U.confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🏄</div>
            <h2>Você surfou a onda!</h2>
            <div class="reward-row"><span>+${G.XP.resisted} XP</span><span>+${G.COINS.resisted} 💰</span></div>
            <p class="muted">Esse é o impulso nº <b>${monthWins}</b> que você controlou este mês. Cada vez que você resiste, o próximo fica mais fraco. É assim que o cérebro aprende.</p>
            <p class="muted small" id="impMarked"></p>
            <button class="btn primary block" data-close>Voltar</button>
          </div>`;
        await G.reward({ xp: G.XP.resisted, coins: G.COINS.resisted, quiet: true });
        const marked = await App.autoMark(/impuls/i, '🌊');
        if (marked) body.querySelector('#impMarked').innerHTML = `✓ Hábito <b>${U.esc(marked)}</b> marcado como feito hoje.`;
      } else {
        U.play('soft');
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🤍</div>
            <h2>Obrigado por ser honesto consigo.</h2>
            <p class="celebrate-title">+${G.XP.slip} XP pela coragem de registrar</p>
            <p class="muted">Um deslize não apaga seu progresso. ${monthWins ? `Você já controlou <b>${monthWins}</b> ${monthWins === 1 ? 'impulso' : 'impulsos'} este mês, e isso continua valendo.` : ''} Olhe os gatilhos que marcou: eles mostram onde você pode se preparar da próxima vez.</p>
            <p class="muted">Que tal agora fazer algo gentil por você? Um copo d'água, uma caminhada curta, um banho.</p>
            <button class="btn primary block" data-close>Voltar</button>
          </div>`;
        await G.addXp(G.XP.slip);
      }
      App.render();
      G.checkAchievements();
    }

    step1();
  }

  // -------------------------------------------------------------------
  // Meditação guiada com timer
  // -------------------------------------------------------------------
  const GUIDES = {
    mindfulness: [
      'Sente-se confortável, coluna ereta, ombros soltos. Feche os olhos se quiser.',
      'Leve a atenção para a respiração. Escolha um ponto: as narinas, o peito ou a barriga.',
      'Só observe o ar entrando e saindo. Não precisa controlar nada.',
      'A mente vai se distrair. Isso é normal, não é erro: faz parte do treino.',
      'Quando perceber que se distraiu, reconheça com gentileza: "pensando". E volte para a respiração.',
      'Toque em "Me distraí e voltei" sempre que isso acontecer. Cada volta é uma repetição para o cérebro.',
      'Perceber a distração É o momento da meditação. É ali que o autocontrole cresce.',
      'Inspira… expira… Uma respiração de cada vez.',
      'Se vier um impulso ou uma vontade, observe como observa a respiração. Ele vem e vai.',
      'Continue. Volte quantas vezes forem necessárias, sem se julgar.'
    ],
    corpo: [
      'Feche os olhos ou baixe o olhar.',
      'Leve a atenção aos pés. Note o contato com o chão.',
      'Suba para as pernas. Há tensão? Deixe soltar.',
      'Sinta a barriga subir e descer com a respiração.',
      'Note o peito, os ombros. Solte o que estiver preso.',
      'Relaxe a mandíbula, a testa, os olhos.',
      'Agora sinta o corpo inteiro, respirando como um todo.'
    ],
    ansiedade: [
      'Ansiedade é desconfortável, mas não é perigosa. Você está seguro agora.',
      'Note onde a ansiedade está no corpo. Só observe, sem lutar.',
      'Respire como se estivesse soprando uma vela devagar.',
      'Diga para si: "isso é ansiedade, e vai passar".',
      'Abra espaço para a sensação, como o céu abre espaço para as nuvens.',
      'Pensamentos não são fatos. Deixe-os passar como carros na rua.',
      'Volte para a respiração sempre que precisar.'
    ],
    livre: ['Silêncio. Apenas esteja aqui.']
  };
  const MODE_NAMES = { mindfulness: 'Mindfulness da respiração', corpo: 'Escaneamento corporal', ansiedade: 'Para ansiedade', livre: 'Silenciosa' };

  async function openMeditation(minutes, mode) {
    const total = minutes * 60;
    const guides = GUIDES[mode] || GUIDES.livre;
    let elapsed = 0, running = true, last = Date.now(), gi = -1, lock = null, done = false, returns = 0;
    const C = 2 * Math.PI * 110;

    const amb = V.med.amb || 'none';
    const m = U.modal(`
      <div class="med-session">
        <p class="eyebrow">${U.esc(MODE_NAMES[mode])} · ${minutes} min</p>
        <div class="med-ring">
          <svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="110" class="ring-bg"/><circle cx="120" cy="120" r="110" class="ring-fg" id="medRing" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div class="med-time" id="medTime">${minutes}:00</div>
        </div>
        <p class="med-guide" id="medGuide">Respire fundo. Vamos começar.</p>
        ${mode === 'livre' ? '' : `
        <button class="return-btn" id="medReturn">
          <span>🎯 Me distraí e voltei</span>
          <small id="medReturnN">toque sempre que voltar para a respiração</small>
        </button>`}
        <div class="amb-mini">${Object.entries(Snd.Amb.LIST).map(([k, n]) => `<button data-amb="${k}" class="${amb === k ? 'on' : ''}" title="${n}">${n.split(' ')[0]}</button>`).join('')}<button data-amb="none" class="${amb === 'none' ? 'on' : ''}" title="Sem som">🔇</button></div>
        <div class="row gap">
          <button class="btn soft" id="medPause">Pausar</button>
          <button class="btn ghost" id="medStop">Encerrar</button>
        </div>
      </div>`, { cls: 'full', dismissable: false, onClose: cleanup });

    const $ = s => m.el.querySelector(s);
    U.play('bell');
    if (amb !== 'none') Snd.Amb.start(amb);
    m.el.querySelector('.amb-mini').onclick = e => {
      const b = e.target.closest('[data-amb]'); if (!b) return;
      const k = b.dataset.amb;
      V.med.amb = k; U.setPref('amb', k);
      if (k === 'none') Snd.Amb.stop(); else Snd.Amb.start(k);
      m.el.querySelectorAll('.amb-mini button').forEach(x => x.classList.toggle('on', x === b));
    };
    let lastMin = 0;
    U.wakeLock().then(l => {
      lock = l;
      if (done && lock) { try { lock.release(); } catch { /* ignore */ } }
    });

    const iv = setInterval(() => {
      const now = Date.now();
      if (running) elapsed += (now - last) / 1000;
      last = now;
      const left = Math.max(0, total - elapsed);
      $('#medTime').textContent = `${Math.floor(left / 60)}:${U.pad(Math.floor(left % 60))}`;
      $('#medRing').setAttribute('stroke-dashoffset', String(C * (1 - elapsed / total)));
      const idx = Math.min(guides.length - 1, Math.floor(elapsed / Math.max(20, total / guides.length)));
      if (idx !== gi) {
        gi = idx;
        const g = $('#medGuide');
        g.classList.remove('fade'); void g.offsetWidth; g.classList.add('fade');
        g.textContent = guides[idx];
      }
      // sino suave a cada 5 minutos (sessões de 10 min ou mais)
      const mn = Math.floor(elapsed / 300);
      if (running && total >= 600 && mn > lastMin && left > 30) { lastMin = mn; U.play('soft'); }
      if (left <= 0) complete();
    }, 250);

    if ($('#medReturn')) $('#medReturn').onclick = () => {
      returns++;
      U.vibrate(10);
      const b = $('#medReturn');
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      $('#medReturnN').textContent = `${returns} ${returns === 1 ? 'volta' : 'voltas'} · cada uma fortalece sua atenção`;
    };
    $('#medPause').onclick = () => {
      running = !running;
      $('#medPause').textContent = running ? 'Pausar' : 'Continuar';
    };
    $('#medStop').onclick = () => {
      const mins = Math.floor(elapsed / 60);
      if (mins >= 1) complete(mins); else m.close();
    };

    function cleanup() { clearInterval(iv); Snd.Amb.stop(); N.cancel('med-end'); if (lock) { try { lock.release(); } catch { /* ignore */ } } }
    N.at('med-end', total * 1000 + 1500, () => { if (!done && document.hidden) N.show('🌸 Meditação concluída', 'Volte ao Raiz para registrar.', { tag: 'raiz-med' }); });

    async function complete(mins = minutes) {
      if (done) return; done = true;
      cleanup();
      U.play('bell'); U.vibrate([40, 60, 40]);
      m.el.innerHTML = `<div class="center pad"><div class="spinner"></div></div>`;
      let ok = true;
      try {
        const saved = await DB.insert('meditation_sessions', { user_id: S.user.id, date: U.today(), minutes: mins, mode, returns });
        S.meds.push(saved);
      } catch (e) { console.error(e); ok = false; }
      if (!ok) { U.toast('Não consegui salvar a sessão. Verifique sua conexão.', 'error'); m.close(); return; }

      const xp = G.XP.medBase + mins + Math.min(returns, 20);
      const coins = Math.min(10, 2 + Math.floor(mins / 3));
      U.confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      m.el.innerHTML = `
        <div class="celebrate">
          <div class="celebrate-icon">🌸</div>
          <h2>${mins} ${mins === 1 ? 'minuto' : 'minutos'} de presença</h2>
          <div class="reward-row"><span>+${xp} XP</span><span>+${coins} 💰</span></div>
          ${returns ? `<p class="muted">Você percebeu a distração e voltou <b>${returns} ${returns === 1 ? 'vez' : 'vezes'}</b>. Cada volta é exatamente o treino que fortalece o autocontrole.</p>`
                    : `<p class="muted">Você deu ao seu cérebro um descanso de verdade.</p>`}
          <p class="muted small" id="medMarked"></p>
          <button class="btn primary block" data-close>Concluir</button>
        </div>`;
      await G.reward({ xp, coins, quiet: true });
      const marked = await App.autoMark(/medit|mindful/i, '🧘');
      if (marked) m.el.querySelector('#medMarked').innerHTML = `✓ Hábito <b>${U.esc(marked)}</b> marcado como feito hoje.`;
      App.render();
      G.checkAchievements();
    }
  }

  // -------------------------------------------------------------------
  // Respiração avulsa (sem registro)
  // -------------------------------------------------------------------
  function openBreathing(key, seconds) {
    let b = null;
    const m = U.modal(`
      <div class="impulse-breath">
        <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
        <p class="eyebrow">${U.esc(PATTERNS[key].name)}</p>
        <div id="bh"></div>
        <button class="btn ghost block" data-close>Encerrar</button>
      </div>`, { cls: 'full', dismissable: false, onClose: () => b && b.stop() });
    b = breathe(m.el.querySelector('#bh'), key, seconds, async () => {
      U.play('achievement');
      m.el.querySelector('.breath-label').textContent = 'Muito bem. 🌿';
      if (!G.flagged('breath')) { await G.flag('breath'); await G.reward({ xp: 5, coins: 3, quiet: true }); U.toast('🌬️ Respiração feita · +5 XP · +3 💰', 'success'); App.render(); }
    });
  }

  // -------------------------------------------------------------------
  // Aterramento 5-4-3-2-1 (para crises de ansiedade)
  // -------------------------------------------------------------------
  function openGrounding() {
    const steps = [
      ['👀', '5 coisas que você VÊ', 'Olhe ao redor e nomeie, em voz baixa, 5 coisas que consegue ver.'],
      ['✋', '4 coisas que você SENTE', 'A textura da roupa, o chão sob os pés, a temperatura do ar…'],
      ['👂', '3 coisas que você OUVE', 'Sons perto e longe. Carros, vento, sua respiração.'],
      ['👃', '2 coisas que você CHEIRA', 'Se não sentir nada, lembre de 2 cheiros que você gosta.'],
      ['👅', '1 coisa que você SENTE O GOSTO', 'Ou tome um gole de água e sinta o gosto.']
    ];
    let i = 0;
    const m = U.modal(`<div class="grounding" id="gBody"></div>`, { cls: 'full', dismissable: false });
    const body = m.el.querySelector('#gBody');
    function draw() {
      if (i >= steps.length) {
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🌿</div>
            <h2>Você está aqui, agora.</h2>
            <p class="celebrate-title">+${G.XP.grounding} XP</p>
            <p class="muted">Seu cérebro saiu do modo alarme e voltou para o presente. Use isso sempre que a ansiedade subir.</p>
            <button class="btn primary block" data-close>Concluir</button>
          </div>`;
        S.flags.grounding = true;
        U.play('achievement');
        if (!G.flagged('breath')) G.flag('breath');
        G.addXp(G.XP.grounding).then(() => G.checkAchievements());
        return;
      }
      const [ic, title, desc] = steps[i];
      body.innerHTML = `
        <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
        <div class="g-progress">${steps.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="g-step">
          <div class="g-icon">${ic}</div>
          <h2>${title}</h2>
          <p class="muted">${desc}</p>
        </div>
        <button class="btn primary block" id="gNext">${i === steps.length - 1 ? 'Concluir' : 'Próximo'}</button>`;
      body.querySelector('#gNext').onclick = () => { i++; U.play('soft'); draw(); };
    }
    draw();
  }

  // -------------------------------------------------------------------
  // Escrita terapêutica
  // -------------------------------------------------------------------
  const PROMPTS = [
    'O que estou sentindo agora, e onde sinto isso no corpo?',
    'O que disparou meus impulsos hoje? O que posso fazer diferente da próxima vez?',
    'Que pensamento está me preocupando? Ele é um fato ou uma suposição?',
    'O que eu diria para um amigo que estivesse passando pelo que estou passando?',
    'Três coisas pelas quais sou grato hoje, por menores que sejam.',
    'Uma pequena vitória de hoje, e por que ela importa.',
    'Quem eu quero ser daqui a 90 dias? Que escolha de hoje me aproxima disso?',
    'O que estou evitando sentir quando o impulso aparece?',
    'Do que eu preciso de verdade agora: descanso, conexão, movimento, carinho?',
    'Escrita livre: escreva sem parar e sem corrigir, o que vier.'
  ];

  function openJournal() {
    const LIMIT = 10 * 60;
    let prompt = PROMPTS[Math.floor(Math.random() * (PROMPTS.length - 1))];
    let started = null, iv = null, done = false, warned = false;

    const m = U.modal(`
      <div class="journal">
        <div class="journal-head">
          <p class="eyebrow">Escrita terapêutica</p>
          <span class="journal-timer" id="jTimer">10:00</span>
        </div>
        <div class="journal-prompt">
          <p id="jPrompt">${U.esc(prompt)}</p>
          <button class="icon-btn" id="jShuffle" aria-label="Outra pergunta" title="Outra pergunta">🔄</button>
        </div>
        <textarea id="jText" class="journal-text" placeholder="Escreva aqui. Ninguém além de você vai ler."></textarea>
        <p class="muted small">🔒 Privado: só você, logado na sua conta, tem acesso.</p>
        <div class="row gap end">
          <button class="btn ghost" id="jCancel">Cancelar</button>
          <button class="btn primary" id="jSave">Salvar · +${G.XP.journal} XP</button>
        </div>
      </div>`, { cls: 'full', dismissable: false, onClose: () => clearInterval(iv) });
    const $ = s => m.el.querySelector(s);

    $('#jShuffle').onclick = () => {
      const others = PROMPTS.filter(p => p !== prompt);
      prompt = others[Math.floor(Math.random() * others.length)];
      $('#jPrompt').textContent = prompt;
    };
    $('#jText').addEventListener('input', () => {
      if (started) return;
      started = Date.now();
      iv = setInterval(() => {
        const left = Math.max(0, LIMIT - (Date.now() - started) / 1000);
        $('#jTimer').textContent = `${Math.floor(left / 60)}:${U.pad(Math.floor(left % 60))}`;
        if (left <= 0 && !warned) {
          warned = true; U.play('soft');
          $('#jTimer').textContent = 'tempo!';
          $('#jTimer').classList.add('over');
        }
      }, 500);
    });
    $('#jCancel').onclick = () => {
      if ($('#jText').value.trim() && !confirm('Descartar o que você escreveu?')) return;
      m.close();
    };
    $('#jSave').onclick = async () => {
      const content = $('#jText').value.trim();
      if (!content) { $('#jText').focus(); return; }
      if (done) return; done = true;
      clearInterval(iv);
      const minutes = started ? Math.max(1, Math.round((Date.now() - started) / 60000)) : 1;
      try {
        const row = await DB.insert('journal_entries', { user_id: S.user.id, date: U.today(), prompt, content, minutes });
        S.journal.push(row);
      } catch (e) {
        console.error(e); done = false;
        U.toast('Não consegui salvar. Verifique sua conexão. Seu texto continua aqui.', 'error');
        return;
      }
      U.play('achievement');
      U.confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
      m.el.innerHTML = `
        <div class="celebrate">
          <div class="celebrate-icon">✍️</div>
          <h2>Colocou pra fora.</h2>
          <p class="celebrate-title">+${G.XP.journal} XP</p>
          <p class="muted">Escrever organiza o que está bagunçado por dentro e tira força dos impulsos. Bom trabalho.</p>
          <p class="muted small" id="jMarked"></p>
          <button class="btn primary block" data-close>Concluir</button>
        </div>`;
      await G.reward({ xp: G.XP.journal, coins: 5, quiet: true });
      const marked = await App.autoMark(/escrita|di[áa]rio|journal/i, '✍️');
      if (marked) m.el.querySelector('#jMarked').innerHTML = `✓ Hábito <b>${U.esc(marked)}</b> marcado como feito hoje.`;
      App.render();
      G.checkAchievements();
    };
    setTimeout(() => $('#jText').focus(), 300);
  }

  function readJournal(id) {
    const e = S.journal.find(x => x.id === id);
    if (!e) return;
    const m = U.modal(`
      <p class="eyebrow">${U.fmtLong(e.date)}</p>
      ${e.prompt ? `<p class="journal-prompt-read">${U.esc(e.prompt)}</p>` : ''}
      <div class="journal-read">${U.esc(e.content).replace(/\n/g, '<br>')}</div>
      <div class="row gap end">
        <button class="btn ghost danger-text" id="jDel">Apagar</button>
        <button class="btn soft" data-close>Fechar</button>
      </div>`, { cls: 'sheet' });
    m.el.querySelector('#jDel').onclick = async () => {
      if (!confirm('Apagar esta escrita para sempre?')) return;
      try {
        await DB.remove('journal_entries', { id });
        S.journal = S.journal.filter(x => x.id !== id);
        m.close(); App.render();
      } catch (err) { console.error(err); U.toast('Erro ao apagar.', 'error'); }
    };
  }

  // -------------------------------------------------------------------
  // Foco profundo (pomodoro) com som ambiente e alarme
  // -------------------------------------------------------------------
  function openPomodoro(minutes = 25) {
    const st = { minutes, task: '', amb: U.pref('pomo-amb', 'marrom') };
    const pending = S.tasks.filter(t => !t.done && t.date <= U.today()).slice(0, 6);
    const m = U.modal(`<div class="pomo" id="pmB"></div>`, { cls: 'full', dismissable: false, onClose: cleanup });
    const body = m.el.querySelector('#pmB');
    let iv = null, end = 0, pausedLeft = null, lock = null, done = false;

    function setup() {
      body.innerHTML = `
        <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
        <p class="eyebrow">⏱️ Foco profundo</p>
        <h2>Uma coisa só, sem distração.</h2>
        <div class="durations pm-dur">${[15, 25, 45, 60].map(n => `<button class="dur ${st.minutes === n ? 'on' : ''}" data-n="${n}"><b>${n}</b><small>min</small></button>`).join('')}</div>
        <label class="field"><span>No que você vai focar?</span>
          <input class="input" id="pmTask" maxlength="100" placeholder="ex.: estudar capítulo 3" value="${U.esc(st.task)}"></label>
        ${pending.length ? `<div class="chips pm-tasks">${pending.map(t => `<button type="button" class="chip" data-t="${U.esc(t.text)}">${U.esc(t.text.slice(0, 30))}</button>`).join('')}</div>` : ''}
        <div class="field"><span>Som ambiente</span>
          <div class="amb-pick">${Object.entries(Snd.Amb.LIST).map(([k, n]) => `<button data-amb="${k}" class="${st.amb === k ? 'on' : ''}">${n}</button>`).join('')}<button data-amb="none" class="${st.amb === 'none' ? 'on' : ''}">🔇 Silêncio</button></div></div>
        <button class="btn primary block big" id="pmGo">Começar · ${st.minutes} min</button>`;
      body.querySelector('.pm-dur').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; st.minutes = +b.dataset.n; st.task = body.querySelector('#pmTask').value; U.play('tap'); setup(); };
      const ch = body.querySelector('.pm-tasks'); if (ch) ch.onclick = e => { const c = e.target.closest('[data-t]'); if (c) body.querySelector('#pmTask').value = c.dataset.t; };
      body.querySelector('.amb-pick').onclick = e => {
        const b = e.target.closest('[data-amb]'); if (!b) return;
        st.amb = b.dataset.amb; U.setPref('pomo-amb', st.amb);
        body.querySelectorAll('.amb-pick button').forEach(x => x.classList.toggle('on', x === b));
        if (st.amb === 'none') Snd.Amb.stop(); else Snd.Amb.start(st.amb);
      };
      body.querySelector('#pmGo').onclick = () => { st.task = body.querySelector('#pmTask').value.trim(); run(); };
    }

    const C = 2 * Math.PI * 110;
    function run() {
      end = Date.now() + st.minutes * 60000;
      U.play('start'); U.vibrate(30);
      if (st.amb !== 'none') Snd.Amb.start(st.amb); else Snd.Amb.stop();
      U.wakeLock().then(l => { lock = l; });
      N.at('pomo-end', st.minutes * 60000, () => finish());
      body.innerHTML = `
        <p class="eyebrow">Foco profundo · ${st.minutes} min</p>
        ${st.task ? `<h2 class="pm-task">${U.esc(st.task)}</h2>` : ''}
        <div class="med-ring">
          <svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="110" class="ring-bg"/><circle cx="120" cy="120" r="110" class="ring-fg pm" id="pmRing" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="med-time" id="pmTime"></div>
        </div>
        <p class="muted center">📵 Celular de lado. Se surgir uma distração, anote e volte.</p>
        <div class="row gap">
          <button class="btn soft" id="pmPause">Pausar</button>
          <button class="btn ghost" id="pmStop">Encerrar</button>
        </div>`;
      const draw = () => {
        const left = pausedLeft !== null ? pausedLeft : Math.max(0, end - Date.now());
        const sec = Math.ceil(left / 1000);
        const t = body.querySelector('#pmTime'); if (!t) return;
        t.textContent = `${Math.floor(sec / 60)}:${U.pad(sec % 60)}`;
        body.querySelector('#pmRing').setAttribute('stroke-dashoffset', String(C * (1 - left / (st.minutes * 60000))));
        document.title = `${Math.floor(sec / 60)}:${U.pad(sec % 60)} · Foco`;
      };
      draw(); iv = setInterval(draw, 500);
      body.querySelector('#pmPause').onclick = e => {
        if (pausedLeft === null) { pausedLeft = Math.max(0, end - Date.now()); N.cancel('pomo-end'); Snd.Amb.stop(); e.target.textContent = 'Continuar'; }
        else { end = Date.now() + pausedLeft; N.at('pomo-end', pausedLeft, () => finish()); pausedLeft = null; if (st.amb !== 'none') Snd.Amb.start(st.amb); e.target.textContent = 'Pausar'; }
      };
      body.querySelector('#pmStop').onclick = () => {
        const mins = Math.floor((st.minutes * 60000 - (pausedLeft !== null ? pausedLeft : end - Date.now())) / 60000);
        if (mins >= 5 && confirm(`Encerrar e registrar ${mins} minutos de foco?`)) finish(mins);
        else if (mins < 5 && confirm('Encerrar o foco?')) m.close();
      };
    }

    async function finish(mins = st.minutes) {
      if (done) return; done = true;
      cleanup();
      U.play('timerEnd'); U.vibrate([80, 60, 80, 60, 160]);
      if (document.hidden) N.show('⏱️ Foco concluído!', `${mins} minutos de foco profundo. Hora de uma pausa.`, { tag: 'raiz-pomo', requireInteraction: true });
      const xp = G.XP.pomodoro + Math.round(mins / 3), coins = 5 + Math.floor(mins / 5);
      DB.insert('focus_sessions', { user_id: S.user.id, date: U.today(), habit_id: null, minutes: mins, outcome: 'done', mini: false, started_at: new Date(Date.now() - mins * 60000).toISOString() })
        .then(r => S.focusSessions.push(r)).catch(e => console.warn('focus_sessions:', e.message || e));
      U.confetti({ particleCount: 130, spread: 100, origin: { y: 0.5 } });
      body.innerHTML = `
        <div class="celebrate">
          <div class="celebrate-icon">🧠</div>
          <h2>${mins} minutos de foco!</h2>
          <div class="reward-row"><span>+${xp} XP</span><span>+${coins} 💰</span></div>
          ${st.task ? `<p class="muted">Foco em: <b>${U.esc(st.task)}</b></p>` : ''}
          <p class="muted">Faça uma pausa de 5 minutos: levante, beba água, olhe longe.</p>
          <button class="btn soft block" id="pmBreak">☕ Pausa de 5 min</button>
          <button class="btn primary block big" data-close>Concluir</button>
        </div>`;
      body.querySelector('#pmBreak').onclick = () => {
        m.close();
        N.at('pomo-break', 5 * 60000, () => N.alert('☕ Pausa terminou', 'Bora para mais um foco?', { action: 'Focar', onAction: () => openPomodoro(st.minutes) }));
        U.toast('☕ Pausa de 5 min. Eu aviso quando acabar.', 'info');
      };
      await G.flag('pomodoro');
      G.bumpStat('pomodoros');
      await G.reward({ xp, coins, quiet: true });
      App.render();
      G.checkAchievements();
    }

    function cleanup() {
      clearInterval(iv); Snd.Amb.stop(); N.cancel('pomo-end');
      document.title = 'Raiz · Hábitos';
      if (lock) { try { lock.release(); } catch { /* ignore */ } }
    }
    setup();
  }

  window.X = { openImpulse, openMeditation, openBreathing, openGrounding, openJournal, readJournal, openPomodoro, PATTERNS, MODE_NAMES };
})();
