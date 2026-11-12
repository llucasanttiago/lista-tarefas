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

  function openImpulse() {
    const kinds = [...new Set(S.impulses.map(i => i.kind).filter(Boolean))].slice(-12);
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
            ${TRIGGERS.map(t => `<button type="button" class="chip" data-t="${U.esc(t)}">${U.esc(t)}</button>`).join('')}
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
      const monthWins = S.impulses.filter(i => i.resisted && i.date.startsWith(month)).length;
      if (resisted) {
        U.play('achievement'); U.vibrate([30, 40, 30]);
        U.confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🏄</div>
            <h2>Você surfou a onda!</h2>
            <p class="celebrate-title">+${G.XP.resisted} XP</p>
            <p class="muted">Esse é o impulso nº <b>${monthWins}</b> que você controlou este mês. Cada vez que você resiste, o próximo fica mais fraco. É assim que o cérebro aprende.</p>
            <p class="muted small" id="impMarked"></p>
            <button class="btn primary block" data-close>Voltar</button>
          </div>`;
        await G.addXp(G.XP.resisted);
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
        <div class="row gap">
          <button class="btn soft" id="medPause">Pausar</button>
          <button class="btn ghost" id="medStop">Encerrar</button>
        </div>
      </div>`, { cls: 'full', dismissable: false, onClose: cleanup });

    const $ = s => m.el.querySelector(s);
    U.play('bell');
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

    function cleanup() { clearInterval(iv); if (lock) { try { lock.release(); } catch { /* ignore */ } } }

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
      U.confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      m.el.innerHTML = `
        <div class="celebrate">
          <div class="celebrate-icon">🌸</div>
          <h2>${mins} ${mins === 1 ? 'minuto' : 'minutos'} de presença</h2>
          <p class="celebrate-title">+${xp} XP</p>
          ${returns ? `<p class="muted">Você percebeu a distração e voltou <b>${returns} ${returns === 1 ? 'vez' : 'vezes'}</b>. Cada volta é exatamente o treino que fortalece o autocontrole.</p>`
                    : `<p class="muted">Você deu ao seu cérebro um descanso de verdade.</p>`}
          <p class="muted small" id="medMarked"></p>
          <button class="btn primary block" data-close>Concluir</button>
        </div>`;
      await G.addXp(xp);
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
    b = breathe(m.el.querySelector('#bh'), key, seconds, () => {
      U.play('soft');
      m.el.querySelector('.breath-label').textContent = 'Muito bem. 🌿';
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
      await G.addXp(G.XP.journal);
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

  window.X = { openImpulse, openMeditation, openBreathing, openGrounding, openJournal, readJournal, PATTERNS, MODE_NAMES };
})();
