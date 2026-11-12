// Renderização das telas.
(function () {
  const esc = U.esc;
  const MOODS = [['😣', 'Muito mal'], ['😕', 'Mal'], ['😐', 'Ok'], ['🙂', 'Bem'], ['😄', 'Muito bem']];

  const PHRASES = [
    'Você não precisa ser perfeito. Só precisa voltar.',
    'Pequenos passos todos os dias viram uma vida diferente.',
    'A vontade passa. O orgulho de ter resistido fica.',
    'Seja gentil consigo hoje. Você está aprendendo.',
    'Um dia ruim não apaga uma semana boa.',
    'Disciplina é lembrar do que você quer de verdade.',
    'Você já sobreviveu a 100% dos seus piores dias.',
    'Feito é melhor que perfeito. Comece pelo menor passo.',
    'Cada hábito saudável é um voto na pessoa que você quer ser.',
    'Respire. Você tem tempo para fazer uma coisa de cada vez.',
    'O impulso grita, mas não manda em você.',
    'Cuidar de si não é egoísmo, é manutenção.',
    'Hoje, escolha uma coisa que o você de amanhã vai agradecer.',
    'Progresso, não perfeição.',
    'Sua mente é um jardim. O que você rega, cresce.',
    'Você está construindo raízes. Elas crescem antes do que aparece.',
    'Movimente o corpo e a mente acompanha.',
    'Não é sobre nunca cair. É sobre sempre levantar.',
    'Ansiedade é um alarme, não uma profecia.',
    'Seja a pessoa que cumpre as promessas que faz a si mesma.',
    'Recomeçar também é progresso.'
  ];

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  };

  function dayOfYear() { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5); }
  function greeting() { const h = U.hour(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function period() { return U.hour() < 14 ? 'manha' : 'noite'; }
  function firstName() { return (S.profile.display_name || 'você').split(' ')[0]; }

  function ring(pct, size = 56, stroke = 6) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>`;
  }

  // ------------------------------------------------------------------ Header
  function header() {
    const lv = G.level(S.profile.xp);
    return `
      <div class="lvl-card" id="lvlCard">
        <div class="lvl-badge">${lv.level}</div>
        <div class="lvl-info">
          <div class="lvl-top"><b>${esc(lv.title)}</b><span class="muted">${lv.into}/${lv.need} XP</span></div>
          <div class="bar"><div class="bar-fill" style="width:${(lv.into / lv.need * 100).toFixed(1)}%"></div></div>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ HOJE
  const ci = { mood: null, anxiety: 5, editing: false };

  function checkinCard() {
    const t = U.today(), p = period();
    const existing = S.moods.find(m => m.date === t && m.period === p);
    const label = p === 'manha' ? 'manhã' : 'noite';
    if (existing && !ci.editing) {
      return `
        <div class="card checkin done">
          <div class="checkin-done">
            <span class="big-emoji">${MOODS[existing.mood - 1][0]}</span>
            <div><b>Check-in da ${label} feito</b><p class="muted small">Ansiedade ${existing.anxiety}/10${existing.note ? ' · ' + esc(existing.note.slice(0, 40)) : ''}</p></div>
            <button class="icon-btn" data-action="ci-edit" aria-label="Editar">${ICONS.edit}</button>
          </div>
        </div>`;
    }
    if (existing && ci.mood === null) { ci.mood = existing.mood; ci.anxiety = existing.anxiety; }
    return `
      <div class="card checkin">
        <h3>Como você está ${p === 'manha' ? 'nesta manhã' : 'agora à noite'}?</h3>
        <div class="moods">
          ${MOODS.map(([e, l], i) => `<button class="mood ${ci.mood === i + 1 ? 'on' : ''}" data-action="ci-mood" data-v="${i + 1}" title="${l}"><span>${e}</span><small>${l}</small></button>`).join('')}
        </div>
        <label class="field compact">
          <span>Ansiedade: <b id="ciAnxVal">${ci.anxiety}</b>/10</span>
          <input type="range" min="0" max="10" value="${ci.anxiety}" id="ciAnx" class="anx-range">
        </label>
        <input class="input" id="ciNote" maxlength="200" placeholder="Uma palavra sobre seu momento (opcional)" value="${esc(existing ? existing.note || '' : '')}">
        <button class="btn primary block" data-action="ci-save" ${ci.mood ? '' : 'disabled'}>Salvar check-in · +${G.XP.checkin} XP</button>
      </div>`;
  }

  function habitItem(h, t) {
    const done = G.isDone(h.id, t);
    const wc = G.weekCount(h.id, t);
    const start = U.weekStart(t);
    const dots = Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(start, i);
      return `<i class="${G.isDone(h.id, d) ? 'on' : ''} ${d === t ? 'today' : ''}"></i>`;
    }).join('');
    const hit = wc >= h.target_per_week;
    return `
      <div class="habit ${done ? 'done' : ''}" data-action="toggle-habit" data-id="${h.id}">
        <div class="habit-icon">${esc(h.icon)}</div>
        <div class="habit-body">
          <div class="habit-name">${esc(h.name)}</div>
          <div class="habit-week"><span class="dots">${dots}</span><span class="${hit ? 'hit' : 'muted'}">${wc}/${h.target_per_week}${hit ? ' 🎯' : ''}</span></div>
        </div>
        <button class="check" aria-label="Concluir ${esc(h.name)}">${ICONS.check}</button>
      </div>`;
  }

  function taskList(t) {
    const list = S.tasks.filter(x => x.date === t || (!x.done && x.date < t))
      .sort((a, b) => (a.done - b.done) || a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
    if (!list.length) return `<p class="empty">Nenhuma tarefa ainda. O que você precisa fazer hoje?</p>`;
    return list.map(x => `
      <div class="task ${x.done ? 'done' : ''}">
        <button class="task-check" data-action="toggle-task" data-id="${x.id}" aria-label="Concluir">${ICONS.check}</button>
        <div class="task-text">${esc(x.text)}${x.date < t ? `<span class="tag">desde ${U.fmtShort(x.date)}</span>` : ''}</div>
        <button class="icon-btn subtle" data-action="del-task" data-id="${x.id}" aria-label="Apagar">${ICONS.trash}</button>
      </div>`).join('');
  }

  // ------------------------------------------------------------------ Metas
  function goalList() {
    const gs = S.goals.filter(g => !g.archived).sort((a, b) => (!!a.completed_at - !!b.completed_at) || a.position - b.position);
    if (!gs.length) return `<p class="empty">Crie um contador de <b>"Dias livre de…"</b> para um hábito que quer largar, ou uma meta numérica, como "Ler 5 livros".</p>`;
    return gs.map(g => g.kind === 'days' ? goalDaysCard(g) : goalCountCard(g)).join('');
  }

  function goalDaysCard(g) {
    const d = G.goalDays(g), next = G.nextMilestone(d), prev = G.lastMilestone(d);
    const pct = Math.min(1, (d - prev) / (next - prev));
    return `
      <div class="goal days">
        <div class="goal-ic">${esc(g.icon)}</div>
        <div class="goal-body">
          <div class="goal-title">${esc(g.title)}</div>
          <div class="goal-big"><b>${d}</b> ${d === 1 ? 'dia' : 'dias'}</div>
          <div class="bar"><div class="bar-fill" style="width:${(pct * 100).toFixed(1)}%"></div></div>
          <small class="muted">Próximo marco: ${next} dias${(g.best || 0) > d ? ` · recorde ${g.best}` : ''}</small>
        </div>
        <button class="icon-btn" data-action="goal-edit" data-id="${g.id}" aria-label="Editar">${ICONS.edit}</button>
      </div>`;
  }

  function goalCountCard(g) {
    const pct = Math.min(1, g.current / Math.max(1, g.target));
    const done = !!g.completed_at;
    return `
      <div class="goal ${done ? 'complete' : ''}">
        <div class="goal-ic">${done ? '🏁' : esc(g.icon)}</div>
        <div class="goal-body">
          <div class="goal-title">${esc(g.title)}</div>
          <div class="goal-big"><b>${g.current}</b> / ${g.target}${done ? ' <span class="hit">· concluída!</span>' : ''}</div>
          <div class="bar"><div class="bar-fill ${done ? 'gold' : ''}" style="width:${(pct * 100).toFixed(1)}%"></div></div>
        </div>
        ${done ? '' : `<button class="goal-inc" data-action="goal-inc" data-id="${g.id}" aria-label="Somar 1">+1</button>`}
        <button class="icon-btn" data-action="goal-edit" data-id="${g.id}" aria-label="Editar">${ICONS.edit}</button>
      </div>`;
  }

  const GOAL_EMOJIS = ['🕊️', '🎯', '🚭', '📵', '🍷', '🍬', '🎮', '💸', '🌱', '💪', '📚', '🏃', '💰', '⛰️', '❤️', '🧠'];

  function goalEditor(g) {
    const isNew = !g;
    const st = { kind: g ? g.kind : 'days', icon: g ? g.icon : '🕊️' };
    const m = U.modal(`
      <h2>${isNew ? 'Nova meta' : 'Editar meta'}</h2>
      ${isNew ? `<div class="seg small" id="gKind">
        <button type="button" data-k="days" class="on">🕊️ Dias livre de…</button>
        <button type="button" data-k="count">🎯 Meta numérica</button>
      </div>` : ''}
      <p class="muted small" id="gHelp"></p>
      <label class="field"><span>Nome</span><input class="input" id="gTitle" maxlength="80" value="${esc(g ? g.title : '')}"></label>
      <div class="field"><span>Ícone</span>
        <div class="emoji-grid" id="gIcons">${GOAL_EMOJIS.map(e => `<button type="button" class="${e === st.icon ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
      </div>
      <div id="gDays">
        <label class="field"><span>Começou em</span><input class="input" type="date" id="gStart" max="${U.today()}" value="${g && g.start_date ? g.start_date : U.today()}"></label>
      </div>
      <div id="gCount" hidden>
        <div class="row gap">
          <label class="field" style="flex:1"><span>Meta</span><input class="input" type="number" id="gTarget" min="1" max="100000" value="${g && g.target ? g.target : 10}"></label>
          <label class="field" style="flex:1"><span>Feito até agora</span><input class="input" type="number" id="gCurrent" min="0" max="100000" value="${g ? g.current : 0}"></label>
        </div>
      </div>
      ${!isNew && g.kind === 'days' ? `<button class="btn soft block" id="gReset">🌱 Recomeçar a contagem</button>` : ''}
      <div class="row gap end" style="margin-top:14px">
        ${isNew ? '' : '<button class="btn ghost danger-text" id="gDel">Arquivar</button>'}
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary" id="gSave">Salvar</button>
      </div>`, { cls: 'sheet' });
    const $ = s => m.el.querySelector(s);

    function syncKind() {
      $('#gDays').hidden = st.kind !== 'days';
      $('#gCount').hidden = st.kind !== 'count';
      $('#gTitle').placeholder = st.kind === 'days' ? 'ex.: Dias sem redes sociais à noite' : 'ex.: Ler 5 livros';
      $('#gHelp').textContent = st.kind === 'days'
        ? 'Conta os dias desde que você parou. Comemora cada marco: 1, 3, 7, 14, 30, 90 dias… Se tiver um deslize, você recomeça sem perder seu recorde.'
        : 'Uma meta com número. Toque em +1 sempre que avançar.';
    }
    syncKind();
    if ($('#gKind')) $('#gKind').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.kind = b.dataset.k;
      m.el.querySelectorAll('#gKind button').forEach(x => x.classList.toggle('on', x === b));
      syncKind();
    };
    $('#gIcons').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.icon = b.dataset.e;
      m.el.querySelectorAll('#gIcons button').forEach(x => x.classList.toggle('on', x === b));
    };
    $('#gSave').onclick = async () => {
      const title = $('#gTitle').value.trim();
      if (!title) { $('#gTitle').focus(); return; }
      const row = { title, icon: st.icon };
      if (st.kind === 'days') {
        const start = $('#gStart').value || U.today();
        row.start_date = start > U.today() ? U.today() : start;
      } else {
        row.target = Math.max(1, parseInt($('#gTarget').value, 10) || 1);
        row.current = Math.max(0, parseInt($('#gCurrent').value, 10) || 0);
        if (row.current >= row.target && !(g && g.completed_at)) row.completed_at = new Date().toISOString();
        if (row.current < row.target) row.completed_at = null;
      }
      try {
        if (isNew) {
          row.kind = st.kind;
          row.user_id = S.user.id;
          row.position = Math.max(-1, ...S.goals.map(x => x.position)) + 1;
          if (st.kind === 'days') row.milestone = G.lastMilestone(G.goalDays(row));
          S.goals.push(await DB.insert('goals', row));
        } else {
          if (st.kind === 'days' && row.start_date !== g.start_date) row.milestone = G.lastMilestone(G.goalDays(row));
          Object.assign(g, await DB.update('goals', g.id, row));
        }
        m.close(); App.render(); U.toast('Meta salva ✓', 'success');
        G.checkAchievements();
      } catch (e) { console.error(e); U.toast('Erro ao salvar a meta. Você rodou o schema.sql atualizado?', 'error'); }
    };
    if ($('#gReset')) $('#gReset').onclick = () => { m.close(); App.resetGoal(g.id); };
    if ($('#gDel')) $('#gDel').onclick = async () => {
      if (!confirm(`Arquivar "${g.title}"?`)) return;
      try { Object.assign(g, await DB.update('goals', g.id, { archived: true })); m.close(); App.render(); }
      catch (e) { console.error(e); U.toast('Erro ao arquivar.', 'error'); }
    };
    if (isNew) setTimeout(() => $('#gTitle').focus(), 250);
  }

  function hoje() {
    const t = U.today();
    const habits = G.visibleHabits();
    const doneN = habits.filter(h => G.isDone(h.id, t)).length;
    const pct = habits.length ? doneN / habits.length : 0;
    const streak = G.streak();
    const todayActive = G.activeDates().has(t);
    const hard = G.isHardMode();

    return `
      <header class="page-head">
        <div>
          <p class="muted cap">${U.fmtLong(t)}</p>
          <h1>${greeting()}, ${esc(firstName())}</h1>
        </div>
      </header>
      ${header()}

      <div class="stat-row">
        <div class="stat ${todayActive ? 'lit' : 'cold'}">
          <span class="stat-ic flame">🔥</span>
          <div><b>${streak}</b><small>${streak === 1 ? 'dia seguido' : 'dias seguidos'}</small></div>
        </div>
        <div class="stat">
          <span class="stat-ic">🛡️</span>
          <div><b>${S.profile.freezes}</b><small>protetores</small></div>
        </div>
        <div class="stat">
          <div class="ring-wrap">${ring(pct, 44, 5)}<span>${doneN}/${habits.length}</span></div>
          <div><b>${Math.round(pct * 100)}%</b><small>do dia</small></div>
        </div>
      </div>
      ${!todayActive && streak > 0 ? `<p class="nudge">⚡ Conclua 1 hábito hoje para manter sua sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}.</p>` : ''}

      <div class="quote">“${esc(PHRASES[dayOfYear() % PHRASES.length])}”</div>

      ${checkinCard()}

      <section>
        <div class="section-head">
          <h2>Hábitos de hoje</h2>
          <button class="pill ${hard ? 'on' : ''}" data-action="hard-mode">${hard ? '🌧️ Dia difícil' : '🌧️ Dia difícil?'}</button>
        </div>
        ${hard ? `<p class="hard-note">Tudo bem ter dias assim. Hoje, só o essencial. Fazer o mínimo já mantém sua sequência. 🤍</p>` : ''}
        <div class="habits">
          ${habits.length ? habits.map(h => habitItem(h, t)).join('') : `<p class="empty">Nenhum hábito. Crie em Perfil → Meus hábitos.</p>`}
        </div>
        ${doneN === habits.length && habits.length ? `<div class="all-done">🌟 Todos os hábitos de hoje feitos. Que orgulho!</div>` : ''}
      </section>

      <section>
        <div class="section-head">
          <h2>Metas</h2>
          <button class="pill on" data-action="goal-new">${ICONS.plus} Nova</button>
        </div>
        <div class="goals">${goalList()}</div>
      </section>

      <section>
        <div class="section-head"><h2>Tarefas</h2></div>
        <form class="add-task" data-form="add-task">
          <input class="input" id="taskInput" maxlength="200" placeholder="Adicionar tarefa…" autocomplete="off">
          <button class="btn primary icon" aria-label="Adicionar">${ICONS.plus}</button>
        </form>
        <div class="tasks">${taskList(t)}</div>
      </section>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ MEDITAR
  const med = { minutes: +U.store.get('raiz-med-min', 10) || 10, mode: 'mindfulness' };

  function journalList() {
    const list = S.journal.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
    if (!list.length) return '';
    return `<div class="journal-list">${list.map(e => `
      <button class="jl" data-action="journal-read" data-id="${e.id}">
        <span class="jl-date">${U.fmtShort(e.date)}</span>
        <span class="jl-text">${esc(e.content.slice(0, 90))}</span>
      </button>`).join('')}</div>`;
  }

  function meditar() {
    const total = S.meds.reduce((a, m) => a + m.minutes, 0);
    const returns = S.meds.reduce((a, m) => a + (m.returns || 0), 0);
    const ws = U.weekStart(U.today());
    const week = S.meds.filter(m => m.date >= ws).reduce((a, m) => a + m.minutes, 0);
    const wroteToday = S.journal.some(e => e.date === U.today());
    return `
      <header class="page-head"><div><h1>Mente</h1><p class="muted">Atenção, calma e autocontrole se treinam.</p></div></header>

      <div class="card med-setup">
        <h3>🧘 Meditação</h3>
        <div class="seg" role="group" aria-label="Tipo">
          ${Object.entries(X.MODE_NAMES).map(([k, n]) => `<button class="${med.mode === k ? 'on' : ''}" data-action="med-mode" data-v="${k}">${n}</button>`).join('')}
        </div>
        ${med.mode === 'mindfulness' ? `<p class="muted small med-explain">Atenção na respiração. Quando a mente se distrair, reconheça e volte, e toque em <b>"Me distraí e voltei"</b>. Cada volta é uma repetição para o cérebro.</p>` : ''}
        <div class="durations">
          ${[3, 5, 10, 15, 20, 30].map(n => `<button class="dur ${med.minutes === n ? 'on' : ''}" data-action="med-min" data-v="${n}"><b>${n}</b><small>min</small></button>`).join('')}
        </div>
        <button class="btn primary block big" data-action="med-start">Começar · ${med.minutes} min</button>
      </div>

      <div class="stat-row">
        <div class="stat"><span class="stat-ic">⏱️</span><div><b>${week}</b><small>min na semana</small></div></div>
        <div class="stat"><span class="stat-ic">🌸</span><div><b>${total}</b><small>min no total</small></div></div>
        <div class="stat"><span class="stat-ic">🎯</span><div><b>${returns}</b><small>voltas ao foco</small></div></div>
      </div>

      <div class="card">
        <div class="section-head"><h3>✍️ Escrita terapêutica</h3>${wroteToday ? '<span class="pill on">✓ hoje</span>' : ''}</div>
        <p class="muted small">Até 10 minutos escrevendo o que está sentindo. Tira força dos impulsos e organiza a cabeça. Tem perguntas para te guiar.</p>
        <button class="btn soft block" data-action="journal-new" style="margin-top:12px">Escrever agora</button>
        ${journalList()}
      </div>

      <h2 class="h2-space">Socorro rápido para ansiedade</h2>
      <div class="tools">
        <button class="tool" data-action="breath" data-v="478" data-s="76">
          <span class="tool-ic">🌬️</span><div><b>Respiração 4-7-8</b><small>Acalma o sistema nervoso · 1 min</small></div>
        </button>
        <button class="tool" data-action="breath" data-v="caixa" data-s="64">
          <span class="tool-ic">⬜</span><div><b>Respiração quadrada</b><small>Foco e controle · 1 min</small></div>
        </button>
        <button class="tool" data-action="grounding">
          <span class="tool-ic">🖐️</span><div><b>Aterramento 5-4-3-2-1</b><small>Para crises e pensamentos acelerados</small></div>
        </button>
        <button class="tool sos-tool" data-action="impulse">
          <span class="tool-ic">🌊</span><div><b>Estou com um impulso</b><small>Surfar a onda sem ceder</small></div>
        </button>
      </div>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ PROGRESSO
  function heatmap() {
    const t = U.today();
    const weeks = 17;
    const start = U.addDays(U.weekStart(t), -7 * (weeks - 1));
    const nHabits = Math.max(1, G.activeHabits().length);
    const byDate = {};
    S.logs.forEach(l => { byDate[l.date] = (byDate[l.date] || 0) + 1; });
    const fz = new Set(S.freezes);
    let cols = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const k = U.addDays(start, w * 7 + d);
        if (k > t) { cells += '<i class="future"></i>'; continue; }
        const r = (byDate[k] || 0) / nHabits;
        const lvl = r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4;
        cells += `<i class="l${lvl} ${fz.has(k) ? 'frz' : ''}" title="${U.fmtShort(k)}: ${byDate[k] || 0} hábitos${fz.has(k) ? ' (protetor)' : ''}"></i>`;
      }
      cols += `<div class="hm-col">${cells}</div>`;
    }
    return `<div class="heatmap">${cols}</div>
      <div class="hm-legend"><span>menos</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>mais</span><i class="frz l0"></i><span>protetor</span></div>`;
  }

  function moodChart() {
    const t = U.today();
    const days = 14;
    const pts = [];
    for (let i = days - 1; i >= 0; i--) {
      const k = U.addDays(t, -i);
      const ms = S.moods.filter(m => m.date === k);
      pts.push(ms.length ? {
        k, mood: ms.reduce((a, m) => a + m.mood, 0) / ms.length,
        anx: ms.reduce((a, m) => a + m.anxiety, 0) / ms.length
      } : { k });
    }
    if (!pts.some(p => p.mood)) return `<p class="empty">Faça check-ins de humor para ver seu gráfico aqui.</p>`;
    const W = 320, H = 130, px = 14, py = 12;
    const x = i => px + i * (W - 2 * px) / (days - 1);
    const yM = v => py + (H - 2 * py) * (1 - (v - 1) / 4);
    const yA = v => py + (H - 2 * py) * (1 - v / 10);
    function line(get, y, cls) {
      let d = '', dots = '', prev = false;
      pts.forEach((p, i) => {
        const v = get(p);
        if (v == null) { prev = false; return; }
        d += `${prev ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" class="${cls}"/>`;
        prev = true;
      });
      return `<path d="${d}" class="${cls}"/>${dots}`;
    }
    const grid = [0.25, 0.5, 0.75].map(f => `<line x1="${px}" x2="${W - px}" y1="${py + (H - 2 * py) * f}" y2="${py + (H - 2 * py) * f}" class="grid"/>`).join('');
    return `
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}
        ${line(p => p.anx, yA, 'anx')}${line(p => p.mood, yM, 'mood')}
      </svg>
      <div class="chart-x"><span>${U.fmtShort(pts[0].k)}</span><span>hoje</span></div>
      <div class="legend"><span><i class="mood"></i>Humor</span><span><i class="anx"></i>Ansiedade</span></div>`;
  }

  function habitRates() {
    const t = U.today();
    const hs = G.activeHabits();
    if (!hs.length) return '';
    return hs.map(h => {
      let done = 0;
      for (let i = 0; i < 28; i++) if (G.isDone(h.id, U.addDays(t, -i))) done++;
      const goal = h.target_per_week * 4;
      const pct = Math.min(1, done / goal);
      return `
        <div class="rate">
          <span class="rate-ic">${esc(h.icon)}</span>
          <div class="rate-body">
            <div class="rate-top"><span>${esc(h.name)}</span><span class="muted">${done}/${goal}</span></div>
            <div class="bar"><div class="bar-fill ${pct >= 1 ? 'gold' : ''}" style="width:${(pct * 100).toFixed(0)}%"></div></div>
          </div>
        </div>`;
    }).join('');
  }

  function impulseBlock() {
    const since = U.addDays(U.today(), -29);
    const recent = S.impulses.filter(i => i.date >= since);
    if (!recent.length) return `<p class="empty">Quando sentir um impulso, toque no botão 🌊 <b>Impulso</b>. Seus registros aparecem aqui.</p>`;
    const won = recent.filter(i => i.resisted).length;
    const pct = won / recent.length;
    const trig = {};
    recent.forEach(i => (i.triggers || []).forEach(t => { trig[t] = (trig[t] || 0) + 1; }));
    const top = Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const drops = recent.filter(i => i.intensity_after != null && i.intensity_before != null);
    const avgDrop = drops.length ? drops.reduce((a, i) => a + (i.intensity_before - i.intensity_after), 0) / drops.length : null;
    return `
      <div class="imp-summary">
        <div class="imp-big"><b>${won}</b><small>controlados</small></div>
        <div class="imp-bar">
          <div class="bar thick"><div class="bar-fill" style="width:${(pct * 100).toFixed(0)}%"></div></div>
          <p class="muted small">${Math.round(pct * 100)}% dos ${recent.length} impulsos dos últimos 30 dias</p>
        </div>
      </div>
      ${avgDrop != null && avgDrop > 0 ? `<p class="insight">🌊 Depois de respirar, a intensidade cai em média <b>${avgDrop.toFixed(1)} pontos</b>. A onda sempre passa.</p>` : ''}
      ${top.length ? `<p class="muted small">Gatilhos mais comuns:</p><div class="chips static">${top.map(([t, n]) => `<span class="chip">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}`;
  }

  function insights() {
    const out = [];
    const since = U.addDays(U.today(), -60);
    const anxByDate = {};
    S.moods.filter(m => m.date >= since).forEach(m => { (anxByDate[m.date] = anxByDate[m.date] || []).push(m.anxiety); });
    const dates = Object.keys(anxByDate);
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    G.activeHabits().forEach(h => {
      const yes = [], no = [];
      dates.forEach(d => (G.isDone(h.id, d) ? yes : no).push(avg(anxByDate[d])));
      if (yes.length >= 3 && no.length >= 3) {
        const a = avg(yes), b = avg(no);
        if (b - a >= 0.8) out.push(`${esc(h.icon)} Nos dias em que você fez <b>${esc(h.name)}</b>, sua ansiedade média foi <b>${a.toFixed(1)}</b>, contra <b>${b.toFixed(1)}</b> nos outros dias.`);
      }
    });
    if (!out.length) return `<p class="empty">Continue fazendo check-ins. Com algumas semanas de dados, o Raiz mostra quais hábitos mais reduzem sua ansiedade.</p>`;
    return out.map(s => `<p class="insight">${s}</p>`).join('');
  }

  function progresso() {
    const s = G.stats();
    return `
      <header class="page-head"><div><h1>Progresso</h1><p class="muted">Cada quadradinho é uma vitória sua.</p></div></header>
      <div class="tiles">
        <div class="tile"><span>🔥</span><b>${G.streak()}</b><small>sequência atual</small></div>
        <div class="tile"><span>🏅</span><b>${s.best}</b><small>melhor sequência</small></div>
        <div class="tile"><span>✅</span><b>${s.habitTotal}</b><small>hábitos feitos</small></div>
        <div class="tile"><span>🌊</span><b>${s.resisted}</b><small>impulsos controlados</small></div>
        <div class="tile"><span>🌸</span><b>${s.medMinutes}</b><small>min meditados</small></div>
        <div class="tile"><span>⭐</span><b>${S.profile.xp}</b><small>XP total</small></div>
      </div>
      <div class="card"><h3>Seus dias</h3>${heatmap()}</div>
      <div class="card"><h3>Humor e ansiedade · 14 dias</h3>${moodChart()}</div>
      <div class="card"><h3>O que te ajuda</h3>${insights()}</div>
      <div class="card"><h3>Hábitos · últimas 4 semanas</h3>${habitRates()}</div>
      <div class="card"><h3>Impulsos · 30 dias</h3>${impulseBlock()}</div>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ CONQUISTAS
  function conquistas() {
    const lv = G.level(S.profile.xp);
    const got = G.ACH.filter(a => S.achievements.has(a.code)).length;
    const path = Array.from({ length: 11 }, (_, i) => i + 1).map(n => `
      <div class="lp ${n < lv.level ? 'past' : n === lv.level ? 'now' : ''}">
        <span>${n}</span><small>${esc(G.title(n))}</small>
      </div>`).join('');
    return `
      <header class="page-head"><div><h1>Conquistas</h1><p class="muted">${got} de ${G.ACH.length} desbloqueadas</p></div></header>
      ${header()}
      <div class="level-path">${path}</div>
      <div class="ach-grid">
        ${G.ACH.map(a => {
          const at = S.achievements.get(a.code);
          return `
          <div class="ach ${at ? 'got' : ''}">
            <div class="ach-ic">${at ? a.icon : '🔒'}</div>
            <b>${esc(a.title)}</b>
            <small>${esc(a.desc)}</small>
            ${at ? `<em>${U.fmtShort(U.dateKey(new Date(at)))}</em>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ PERFIL
  function perfil() {
    const hs = G.activeHabits();
    return `
      <header class="page-head"><div><h1>Perfil</h1><p class="muted">${esc(S.user.email)}</p></div></header>

      <div class="card">
        <label class="field compact"><span>Como quer ser chamado?</span>
          <div class="row gap"><input class="input" id="nameInput" maxlength="40" value="${esc(S.profile.display_name || '')}"><button class="btn soft" data-action="save-name">Salvar</button></div>
        </label>
        <label class="switch-row">
          <span>🔊 Sons de conquista</span>
          <input type="checkbox" id="soundToggle" ${U.soundOn() ? 'checked' : ''}>
        </label>
      </div>

      <div class="card">
        <div class="section-head"><h3>Meus hábitos</h3><button class="pill on" data-action="habit-new">${ICONS.plus} Novo</button></div>
        <div class="habit-admin">
          ${hs.map((h, i) => `
            <div class="ha">
              <span class="ha-ic">${esc(h.icon)}</span>
              <div class="ha-body"><b>${esc(h.name)}</b><small class="muted">${h.target_per_week}x por semana${h.essential ? ' · essencial' : ''}</small></div>
              <button class="icon-btn subtle" data-action="habit-up" data-id="${h.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
              <button class="icon-btn subtle" data-action="habit-edit" data-id="${h.id}" aria-label="Editar">${ICONS.edit}</button>
            </div>`).join('') || '<p class="empty">Nenhum hábito ainda.</p>'}
        </div>
        <p class="muted small">Hábitos <b>essenciais</b> são os que aparecem no modo "Dia difícil".</p>
      </div>

      <div class="card">
        <h3>Como funciona</h3>
        <ul class="how">
          <li>🔥 <b>Sequência:</b> conclua pelo menos 1 hábito por dia.</li>
          <li>🛡️ <b>Protetores:</b> a cada 7 dias seguidos você ganha 1 (máx. 3). Se falhar um dia, ele salva sua sequência sozinho.</li>
          <li>⭐ <b>XP:</b> hábito +${G.XP.habit} · impulso controlado +${G.XP.resisted} · deslize registrado +${G.XP.slip} · escrita +${G.XP.journal} · tarefa +${G.XP.task} · check-in +${G.XP.checkin} · meditação +${G.XP.medBase} +1/min +1 por volta ao foco · marco de meta +${G.XP.milestone} · conquista +${G.XP.achievement}</li>
          <li>🌧️ <b>Dia difícil:</b> mostra só os hábitos essenciais. Fazer o mínimo também conta.</li>
          <li>🤖 <b>Automático:</b> meditar, escrever ou resistir a um impulso já marcam o hábito correspondente.</li>
        </ul>
      </div>

      <div class="card">
        <h3>🔒 Privacidade</h3>
        <label class="switch-row">
          <span>Bloquear o app com PIN neste aparelho</span>
          <input type="checkbox" id="pinToggle" ${Lock.enabled() ? 'checked' : ''}>
        </label>
        <p class="muted small">Pede um PIN de 4 dígitos ao abrir o app e ao voltar para ele depois de 1 minuto. Esqueceu o PIN? Basta sair e entrar de novo com email e senha.</p>
        <p class="muted small" style="margin-top:10px">Seus registros ficam no seu banco de dados, protegidos pelo seu login. Ninguém mais consegue ler. O código do app é público, mas não contém nenhum dado seu.</p>
      </div>

      <div class="card help">
        <h3>💚 Apoio gratuito</h3>
        <p class="muted small">O Raiz é uma ferramenta de apoio. Se as coisas ficarem pesadas, você não está sozinho:</p>
        <ul class="how">
          <li><b>CVV · ligue 188</b>: conversa gratuita, sigilosa, 24h. Também tem chat em cvv.org.br.</li>
          <li><b>CAPS (SUS)</b>: atendimento psicológico gratuito, inclusive para dependências (CAPS AD). Procure a UBS do seu bairro para ser encaminhado.</li>
          <li><b>Clínicas-escola de Psicologia</b>: faculdades oferecem terapia gratuita ou a preço simbólico.</li>
          <li><b>Mapa da Saúde Mental</b>: mapasaudemental.com.br lista atendimentos gratuitos e voluntários.</li>
          <li><b>Grupos de apoio</b>: grupos anônimos e gratuitos para diversos tipos de compulsão.</li>
        </ul>
        <p class="muted small">Em emergência: <b>SAMU 192</b>.</p>
      </div>

      <div class="card">
        <button class="btn soft block" data-action="export">⬇️ Baixar todos os meus dados</button>
        <button class="btn ghost block danger-text" data-action="logout">Sair da conta</button>
      </div>
      <p class="muted small center">Raiz · feito para você crescer 🌱</p>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ Editor de hábito
  const EMOJIS = ['🧘', '🚶', '🏋️', '🏃', '🌊', '🧭', '✍️', '😴', '💧', '📖', '🥗', '🙏', '🧹', '📵', '🚭', '🌞', '🎯', '🧠', '🌬️', '🛁', '🌙', '❤️', '🚴', '🤸', '📞', '⏳', '🚫', '🤝'];

  // Sugestões (nomes genéricos: o código é público; personalize depois)
  const TEMPLATES = {
    'Corpo': [['🚶', '30 min de caminhada ou exercício'], ['🏋️', 'Treino de força'], ['🤸', 'Alongamento 10 min'], ['💧', 'Beber 2L de água'], ['🥗', 'Uma refeição saudável'], ['🌞', '15 min de sol']],
    'Mente': [['🧘', 'Meditação mindfulness'], ['✍️', 'Escrita terapêutica (até 10 min)'], ['📖', 'Ler 10 páginas'], ['🙏', 'Anotar 3 gratidões'], ['🌬️', 'Respiração consciente 3x no dia']],
    'Autocontrole': [['🌊', 'Não obedeci automaticamente aos impulsos'], ['🧭', 'Evitei os gatilhos da compulsão'], ['⏳', 'Esperei 10 min antes de ceder a uma vontade'], ['📵', 'Celular fora do quarto à noite'], ['🚫', 'Sem redes sociais antes das 10h']],
    'Sono': [['😴', 'Mantive horário regular de sono'], ['🌙', 'Sem telas 1h antes de dormir']],
    'Vida': [['🧹', 'Arrumei meu espaço'], ['📞', 'Falei com alguém de quem gosto'], ['🎯', 'Fiz 1 tarefa importante'], ['🤝', 'Fiz algo gentil por alguém']]
  };

  function habitEditor(h) {
    const isNew = !h;
    h = h || { name: '', icon: '✨', target_per_week: 7, essential: false };
    const st = { icon: h.icon, target: h.target_per_week, essential: h.essential };
    const m = U.modal(`
      <h2>${isNew ? 'Novo hábito' : 'Editar hábito'}</h2>
      ${isNew ? `<details class="templates" open>
        <summary>💡 Sugestões</summary>
        ${Object.entries(TEMPLATES).map(([cat, list]) => `
          <p class="tpl-cat">${cat}</p>
          <div class="chips">${list.map(([ic, n]) => `<button type="button" class="chip" data-ti="${ic}" data-tn="${esc(n)}">${ic} ${esc(n)}</button>`).join('')}</div>`).join('')}
      </details>` : ''}
      <label class="field"><span>Nome</span><input class="input" id="hName" maxlength="80" value="${esc(h.name)}" placeholder="Escreva o seu ou escolha uma sugestão"></label>
      <div class="field"><span>Ícone</span>
        <div class="emoji-grid">${EMOJIS.map(e => `<button type="button" class="${e === st.icon ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
      </div>
      <div class="field"><span>Meta: <b id="hTargetVal">${st.target}</b>x por semana</span>
        <div class="seg small">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" data-n="${n}" class="${n === st.target ? 'on' : ''}">${n}</button>`).join('')}</div>
      </div>
      <label class="switch-row"><span>Essencial <small class="muted">(aparece no dia difícil)</small></span><input type="checkbox" id="hEss" ${st.essential ? 'checked' : ''}></label>
      <div class="row gap end">
        ${isNew ? '' : '<button class="btn ghost danger-text" id="hDel">Arquivar</button>'}
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary" id="hSave">Salvar</button>
      </div>`, { cls: 'sheet' });
    const $ = s => m.el.querySelector(s);
    $('.emoji-grid').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.icon = b.dataset.e;
      m.el.querySelectorAll('.emoji-grid button').forEach(x => x.classList.toggle('on', x === b));
    };
    if ($('.templates')) $('.templates').onclick = e => {
      const b = e.target.closest('[data-tn]'); if (!b) return;
      $('#hName').value = b.dataset.tn;
      st.icon = b.dataset.ti;
      m.el.querySelectorAll('.emoji-grid button').forEach(x => x.classList.toggle('on', x.dataset.e === st.icon));
      m.el.querySelectorAll('.templates .chip').forEach(x => x.classList.toggle('on', x === b));
      $('.templates').open = false;
      $('#hName').focus();
    };
    $('.seg').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.target = +b.dataset.n; $('#hTargetVal').textContent = st.target;
      m.el.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
    };
    $('#hSave').onclick = async () => {
      const name = $('#hName').value.trim();
      if (!name) { $('#hName').focus(); return; }
      const row = { name, icon: st.icon, target_per_week: st.target, essential: $('#hEss').checked };
      try {
        if (isNew) {
          row.position = Math.max(-1, ...S.habits.map(x => x.position)) + 1;
          row.user_id = S.user.id;
          S.habits.push(await DB.insert('habits', row));
        } else {
          Object.assign(h, await DB.update('habits', h.id, row));
        }
        m.close(); App.render(); U.toast('Hábito salvo ✓', 'success');
      } catch (e) { console.error(e); U.toast('Erro ao salvar o hábito.', 'error'); }
    };
    if (!isNew) $('#hDel').onclick = async () => {
      if (!confirm(`Arquivar "${h.name}"? O histórico continua guardado.`)) return;
      try { Object.assign(h, await DB.update('habits', h.id, { archived: true })); m.close(); App.render(); }
      catch (e) { console.error(e); U.toast('Erro ao arquivar.', 'error'); }
    };
  }

  window.V = { hoje, meditar, progresso, conquistas, perfil, header, habitEditor, goalEditor, ci, med, period };
})();
