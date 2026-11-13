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
          <div class="bar"><div class="bar-fill" data-xpbar style="width:${(lv.into / lv.need * 100).toFixed(1)}%"></div></div>
        </div>
        <div class="lvl-coins"><span>💰</span><b data-coins>${S.profile.coins || 0}</b></div>
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

  const PERIODS = { manha: ['🌅', 'Manhã'], tarde: ['☀️', 'Tarde'], noite: ['🌙', 'Noite'] };

  function habitItem(h, t, compact = false) {
    const done = G.isDone(h.id, t);
    const amt = G.amount(h.id, t), goal = G.goalOf(h);
    const counter = G.isCounter(h);
    const wc = G.weekCount(h.id, t);
    const start = U.weekStart(t);
    const dots = Array.from({ length: 7 }, (_, i) => {
      const d = U.addDays(start, i);
      return `<i class="${G.isDone(h.id, d) ? 'on' : ''} ${d === t ? 'today' : ''} ${G.scheduledOn(h, d) ? '' : 'off'}"></i>`;
    }).join('');
    const hit = wc >= h.target_per_week;
    const hs = t === U.today() ? G.habitStreak(h) : 0;
    const color = h.color ? ` style="--hc:${esc(h.color)}"` : '';
    const sub = [];
    if (counter) sub.push(`<b class="cnt">${amt}/${goal}</b>${h.unit ? ' ' + esc(h.unit) : ''}`);
    if (h.remind_at && !done) sub.push(`⏰ ${esc(h.remind_at)}`);
    if (hs >= 2) sub.push(`<span class="hs">🔥 ${hs}</span>`);
    return `
      <div class="habit ${done ? 'done' : ''} ${compact ? 'compact' : ''} ${G.isAvoid(h) ? 'avoid' : ''} ${h.color ? 'colored' : ''}"${color} data-action="toggle-habit" data-id="${h.id}" data-date="${t}">
        <div class="habit-icon" data-action="habit-detail" data-id="${h.id}">${esc(h.icon)}${counter && !done ? `<svg class="mini-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16"/><circle cx="18" cy="18" r="16" class="fg" stroke-dasharray="100.5" stroke-dashoffset="${100.5 * (1 - Math.min(1, amt / goal))}"/></svg>` : ''}</div>
        <div class="habit-body">
          <div class="habit-name">${esc(h.name)}</div>
          ${compact
            ? (sub.length ? `<div class="habit-sub">${sub.join(' · ')}</div>` : '')
            : `<div class="habit-week"><span class="dots">${dots}</span><span class="${hit ? 'hit' : 'muted'}">${wc}/${h.target_per_week}${hit ? ' 🎯' : ''}</span>${sub.length ? `<span class="habit-sub">${sub.join(' · ')}</span>` : ''}</div>`}
        </div>
        ${counter && amt > 0 && !done ? `<button class="icon-btn subtle mini" data-action="habit-dec" data-id="${h.id}" data-date="${t}" aria-label="Diminuir">−</button>` : ''}
        ${counter && !done
          ? `<button class="count-btn" data-action="habit-inc" data-id="${h.id}" data-date="${t}" aria-label="Somar 1">+1</button>`
          : `<button class="check" aria-label="Concluir ${esc(h.name)}">${ICONS.check}</button>`}
      </div>`;
  }

  // Lista de hábitos do dia agrupada por período (manhã / tarde / noite / qualquer hora)
  function habitGroups(habits, t, compact) {
    const groups = { manha: [], tarde: [], noite: [], livre: [] };
    habits.forEach(h => (groups[h.time_of_day] || groups.livre).push(h));
    const used = Object.entries(groups).filter(([, l]) => l.length);
    if (used.length <= 1) return `<div class="habits ${compact ? 'compact' : ''}">${habits.map(h => habitItem(h, t, compact)).join('')}</div>`;
    return used.map(([k, l]) => `
      <p class="group-label">${k === 'livre' ? '🕐 Qualquer hora' : PERIODS[k].join(' ')}<span>${l.filter(h => G.isDone(h.id, t)).length}/${l.length}</span></p>
      <div class="habits ${compact ? 'compact' : ''}">${l.map(h => habitItem(h, t, compact)).join('')}</div>`).join('');
  }

  function taskRow(x, t) {
    const late = x.date < t && !x.done;
    return `
      <div class="task ${x.done ? 'done' : ''} ${x.priority ? 'prio' : ''}">
        <button class="task-check" data-action="toggle-task" data-id="${x.id}" aria-label="Concluir">${ICONS.check}</button>
        <div class="task-text" data-action="edit-task" data-id="${x.id}">${esc(x.text)}${late ? `<span class="tag">desde ${U.fmtShort(x.date)}</span>` : ''}${x.date > t ? `<span class="tag soft">${x.date === U.addDays(t, 1) ? 'amanhã' : U.fmtShort(x.date)}</span>` : ''}${x.note ? '<span class="tag soft">📝</span>' : ''}</div>
        ${x.done ? '' : `<button class="icon-btn subtle star ${x.priority ? 'on' : ''}" data-action="task-star" data-id="${x.id}" aria-label="Prioridade">${x.priority ? '★' : '☆'}</button>`}
        <button class="icon-btn subtle" data-action="del-task" data-id="${x.id}" aria-label="Apagar">${ICONS.trash}</button>
      </div>`;
  }
  const taskSort = (a, b) => (a.done - b.done) || ((b.priority || 0) - (a.priority || 0)) || a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at);

  function taskList(t) {
    const list = S.tasks.filter(x => x.date === t || (!x.done && x.date < t)).sort(taskSort);
    const upcoming = S.tasks.filter(x => x.date > t && !x.done).sort(taskSort);
    let html = list.length ? list.map(x => taskRow(x, t)).join('') : `<p class="empty">Nenhuma tarefa para hoje. O que você precisa fazer?</p>`;
    if (upcoming.length) {
      html += `<button class="link-btn upcoming-toggle" data-action="tasks-upcoming">${ui.upcomingOpen ? '▴' : '▾'} Próximos dias · ${upcoming.length}</button>`;
      if (ui.upcomingOpen) html += upcoming.map(x => taskRow(x, t)).join('');
    }
    if (list.some(x => x.done)) html += `<button class="link-btn subtle-right" data-action="tasks-clear">Limpar concluídas</button>`;
    return html;
  }

  function taskEditor(task) {
    if (!task) return;
    const m = U.modal(`
      <h2>Editar tarefa</h2>
      <label class="field"><span>Tarefa</span><input class="input" id="teText" maxlength="200" value="${esc(task.text)}"></label>
      <div class="row gap">
        <label class="field" style="flex:1"><span>Data</span><input class="input" type="date" id="teDate" value="${task.date}"></label>
        <label class="switch-row" style="flex:1;margin-top:10px"><span>★ Prioridade</span><input type="checkbox" id="tePrio" ${task.priority ? 'checked' : ''}></label>
      </div>
      ${DB.v5 ? `<label class="field"><span>Anotação</span><textarea id="teNote" rows="3" maxlength="600" placeholder="Detalhes, links, passos…">${esc(task.note || '')}</textarea></label>` : ''}
      <div class="row gap end">
        <button class="btn ghost danger-text" id="teDel">Apagar</button>
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary" id="teSave">Salvar</button>
      </div>`, { cls: 'sheet' });
    const $ = q => m.el.querySelector(q);
    $('#teSave').onclick = () => {
      const text = $('#teText').value.trim(); if (!text) return;
      const patch = { text, date: $('#teDate').value || task.date, priority: $('#tePrio').checked ? 1 : 0 };
      if ($('#teNote')) patch.note = $('#teNote').value.trim() || null;
      m.close(); App.patchTask(task.id, patch); U.play('pop');
    };
    $('#teDel').onclick = () => { m.close(); App.deleteTask(task.id); };
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

  // ------------------------------------------------------------------ HOJE (foco em UMA coisa)
  const ui = { dayOpen: U.store.get('raiz-day-open', '1') === '1', progTab: 'resumo', planDate: null, taskDate: 'hoje', taskPrio: false, upcomingOpen: false };

  function focusCard() {
    const st = F.state();
    const hard = G.isHardMode();
    const hardLink = `<button class="link-btn center-link" data-action="hard-mode">${hard ? '🌧️ Modo dia difícil ativo · desativar' : '🌧️ Dia difícil? Mostrar só o essencial'}</button>`;

    if (st.type === 'active') {
      const h = S.habits.find(x => x.id === st.active.habitId);
      const mins = Math.max(0, Math.round((Date.now() - st.active.started) / 60000));
      return `
        <div class="focus-card active">
          <p class="eyebrow">Você está fazendo agora</p>
          <div class="focus-ic xl breathe">${esc(h.icon)}</div>
          <h2 class="focus-title">${esc(h.name)}</h2>
          <p class="muted">${st.active.mini ? 'Versão mini. ' : ''}Começou ${mins < 1 ? 'agora há pouco' : `há ${mins} min`}. Foque só nisso. Quando terminar, volte e me conte como foi.</p>
          <button class="btn primary block big" data-action="focus-return">Voltei! Contar como foi</button>
          <button class="link-btn center-link" data-action="focus-cancel">Cancelar</button>
        </div>`;
    }
    if (st.type === 'suggest') {
      const h = st.habit;
      const mins = F.minutes(h);
      return `
        <div class="focus-card">
          <p class="eyebrow">${h.id === P.weeklyFocusId() ? '🎯 Foco da semana' : 'Sugestão para agora'}</p>
          <div class="focus-ic xl">${esc(h.icon)}</div>
          <h2 class="focus-title">${esc(h.name)}</h2>
          <p class="muted focus-why">${esc(F.why(h))}${mins ? ` · ⏱️ ${mins} min` : ''}</p>
          <button class="btn primary block big" data-action="focus-start" data-id="${h.id}">Começar agora</button>
          <div class="focus-alt">
            ${st.total > 1 ? `<button class="link-btn" data-action="focus-next">Outra sugestão</button><span>·</span>` : ''}
            <button class="link-btn" data-action="focus-already" data-id="${h.id}">Já fiz</button>
          </div>
        </div>
        ${hardLink}`;
    }
    if (st.type === 'review' || st.type === 'waiting') {
      const n = st.list.length;
      return `
        <div class="focus-card calm">
          <div class="focus-ic xl">${st.type === 'review' ? '🌙' : '🌿'}</div>
          <h2 class="focus-title">${st.type === 'review' ? 'Hora de fechar o dia' : 'Tudo de ativo feito!'}</h2>
          <p class="muted">${st.type === 'review'
            ? `${n > 1 ? `Faltam ${n} confirmações rápidas` : 'Falta 1 confirmação rápida'} sobre o seu dia. Sem julgamento.`
            : 'Que orgulho. À noite, volte para confirmar como foi o resto do dia.'}</p>
          <button class="btn ${st.type === 'review' ? 'primary' : 'soft'} block big" data-action="review-open">${st.type === 'review' ? 'Revisar o dia' : 'Revisar agora'}</button>
        </div>`;
    }
    if (st.type === 'done') {
      return `
        <div class="focus-card done">
          <div class="focus-ic xl">🌟</div>
          <h2 class="focus-title">Dia completo!</h2>
          <p class="muted">Você fez tudo o que se propôs hoje. Descanse, você merece. 🤍</p>
          <button class="btn soft block" data-action="journal-new">Escrever como foi o dia</button>
        </div>`;
    }
    return `
      <div class="focus-card">
        <div class="focus-ic xl">🌱</div>
        <h2 class="focus-title">Vamos começar?</h2>
        <p class="muted">Crie seu primeiro hábito para eu sugerir o que fazer.</p>
        <button class="btn primary block big" data-action="habit-new">Criar hábito</button>
      </div>`;
  }

  function dayStrip() {
    const t = U.today();
    const habits = G.visibleHabits();
    if (!habits.length) return '';
    const doneN = habits.filter(h => G.isDone(h.id, t)).length;
    return `
      <div class="day-strip ${ui.dayOpen ? 'open' : ''}">
        <button class="day-toggle" data-action="day-toggle" aria-expanded="${ui.dayOpen}">
          <span class="ring-wrap sm">${ring(doneN / habits.length, 34, 4)}</span>
          <span class="day-label"><b>Seu dia</b><small>${doneN} de ${habits.length} hábitos</small></span>
          <span class="chev">${ui.dayOpen ? '▴' : '▾'}</span>
        </button>
        ${ui.dayOpen ? `<div class="strip-body">${habitGroups(habits, t, true)}</div>` : ''}
      </div>`;
  }

  function checkinRow() {
    const t = U.today(), p = period();
    if (S.moods.some(m => m.date === t && m.period === p)) return '';
    return `
      <div class="ci-row">
        <span>Como você está?</span>
        <div class="ci-emojis">${MOODS.map(([e, l], i) => `<button data-action="ci-quick" data-v="${i + 1}" title="${l}" aria-label="${l}">${e}</button>`).join('')}</div>
      </div>`;
  }

  // Missões do dia
  function questsCard() {
    const qs = G.quests();
    if (!qs.length) return '';
    const d = G.daily();
    const allClaimed = qs.every(q => q.claimed);
    return `
      <div class="card quests">
        <div class="section-head">
          <h3>📜 Missões do dia</h3>
          <span class="quest-chest ${allClaimed ? (d.chest ? 'opened' : 'ready') : ''}" ${allClaimed && !d.chest ? 'data-action="chest-open"' : ''} title="Complete as 3 para ganhar um baú">${d.chest ? '✅' : '🧰'}</span>
        </div>
        ${qs.map(q => `
          <div class="quest ${q.done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}">
            <span class="quest-ic">${q.icon}</span>
            <div class="quest-body">
              <b>${esc(q.title)}</b>
              <div class="bar"><div class="bar-fill ${q.done ? 'gold' : ''}" style="width:${(q.prog / q.target * 100).toFixed(0)}%"></div></div>
            </div>
            ${q.claimed ? '<span class="quest-ok">✓</span>'
              : q.done ? `<button class="quest-claim" data-action="quest-claim" data-id="${q.id}">Pegar<small>+${q.coins} 💰</small></button>`
              : `<span class="quest-prog">${q.prog}/${q.target}</span>`}
          </div>`).join('')}
        ${!allClaimed ? `<p class="muted small center">Complete as 3 para abrir um <b>baú surpresa</b> 🧰</p>` : ''}
      </div>`;
  }

  function giftCard() {
    const d = G.daily();
    if (d.gift) return '';
    return `
      <button class="gift-card" data-action="gift-open">
        <span class="gift-ic">🎁</span>
        <span><b>Presente do dia</b><small>${(d.loginStreak || 1) > 1 ? `${d.loginStreak} dias seguidos abrindo o app · prêmio maior` : 'Toque para abrir'}</small></span>
        <span class="gift-go">Abrir</span>
      </button>`;
  }

  function banners() {
    const t = U.today();
    const out = [];
    if (!DB.v5) out.push(`<div class="banner warn">🛠️ <div><b>Atualize o banco para liberar tudo</b><small>No Supabase: SQL Editor → cole o <code>supabase/schema.sql</code> → Run. Seus dados não são apagados. Até lá, moedas e missões ficam salvas só neste aparelho.</small></div></div>`);
    const streak = G.streak();
    if (!G.activeDates().has(t) && streak > 0 && U.hour() >= 17) {
      out.push(`<div class="banner fire">🔥 <div><b>Sua sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'} acaba em <span data-countdown></span></b><small>Um hábito hoje mantém tudo vivo.</small></div></div>`);
    }
    if (P.push.state === 'off' && U.pref('notif-card-hidden') !== t && P.pushSupported()) {
      out.push(`<div class="banner info">🔔 <div><b>Ative os lembretes</b><small>Para receber avisos mesmo com o app fechado.</small><div class="row gap" style="margin-top:8px"><button class="btn primary sm" data-action="push-on">Ativar</button><button class="btn ghost sm" data-action="notif-card-hide">Agora não</button></div></div></div>`);
    }
    return out.join('');
  }

  function hoje() {
    const t = U.today();
    const streak = G.streak();
    const lit = G.activeDates().has(t);
    const lv = G.level(S.profile.xp);
    const mode = U.pref('home', 'lista');
    const habits = G.visibleHabits();
    const doneN = habits.filter(h => G.isDone(h.id, t)).length;
    const pct = habits.length ? doneN / habits.length : 0;
    const pend = S.tasks.filter(x => !x.done && x.date <= t).sort(taskSort);
    const tier = streak >= 100 ? 't4' : streak >= 30 ? 't3' : streak >= 7 ? 't2' : '';
    return `
      <header class="home-head">
        <div>
          <p class="muted cap small">${U.fmtLong(t)}</p>
          <h1>${greeting()}, ${esc(firstName())}</h1>
        </div>
        <div class="top-chips">
          <span class="top-chip flame ${lit ? 'lit' : ''} ${tier}" title="Dias seguidos">🔥 ${streak}</span>
          <span class="top-chip coin" title="Moedas">💰 <b data-coins>${S.profile.coins || 0}</b></span>
        </div>
      </header>
      <div class="home-xp" title="${esc(lv.title)}"><span>Nv ${lv.level}</span><div class="bar"><div class="bar-fill" data-xpbar style="width:${(lv.into / lv.need * 100).toFixed(1)}%"></div></div><small>${lv.into}/${lv.need}</small></div>
      ${banners()}
      ${P.reviewBanner()}
      ${P.riskBanner()}
      ${giftCard()}
      ${H.inNight() || H.nightSoon() ? H.nightCard() : ''}
      ${mode === 'foco' ? `${focusCard()}${dayStrip()}` : `
        ${habits.length ? `
        <div class="today-head">
          <div class="today-ring">${ring(pct, 64, 7)}<b>${Math.round(pct * 100)}%</b></div>
          <div><h2>${doneN === habits.length ? 'Dia completo! 🌟' : `${doneN} de ${habits.length} hábitos`}</h2>
            <p class="muted small">${doneN === habits.length ? 'Você fez tudo o que se propôs hoje.' : G.isHardMode() ? '🌧️ Modo dia difícil: só o essencial.' : 'Toque para marcar. Faça vários seguidos para fazer combo ⚡'}</p></div>
        </div>
        ${habitGroups(habits, t, false)}` : focusCard()}
        ${habits.length && F.state().type === 'active' ? focusCard() : ''}
        <div class="home-actions">
          ${F.state().type === 'suggest' ? `<button class="pill" data-action="focus-start" data-id="${F.state().habit.id}">🚀 Começar: ${esc(F.state().habit.name.slice(0, 22))}</button>` : ''}
          ${F.state().type === 'review' ? '<button class="pill on" data-action="review-open">🌙 Fechar o dia</button>' : ''}
          <button class="pill" data-action="hard-mode">${G.isHardMode() ? '🌧️ Dia difícil ✓' : '🌧️ Dia difícil?'}</button>
        </div>`}
      ${questsCard()}
      ${H.inNight() || H.nightSoon() ? '' : H.card()}
      ${pend.length ? `
        <div class="card mini-tasks">
          <div class="section-head"><h3>📋 Tarefas</h3><button class="link-btn" data-action="tasks-go">ver todas ›</button></div>
          ${pend.slice(0, 4).map(x => taskRow(x, t)).join('')}
          ${pend.length > 4 ? `<p class="muted small">+ ${pend.length - 4} tarefas</p>` : ''}
        </div>` : ''}
      ${checkinRow()}
      <div class="mode-switch">
        <button class="${mode === 'lista' ? 'on' : ''}" data-action="home-mode" data-v="lista">☰ Lista</button>
        <button class="${mode === 'foco' ? 'on' : ''}" data-action="home-mode" data-v="foco">🎯 Uma coisa por vez</button>
      </div>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ PLANO
  function plano() {
    const today = U.today();
    const t = ui.planDate && ui.planDate <= today ? ui.planDate : today;
    const isToday = t === today;
    const habits = G.visibleHabits(t);
    const hidden = G.activeHabits().filter(h => !G.scheduledOn(h, t));
    const hard = G.isHardMode();
    const doneN = habits.filter(h => G.isDone(h.id, t)).length;
    return `
      <header class="page-head"><div><h1>Plano</h1><p class="muted">Seus hábitos, metas e tarefas.</p></div></header>

      <section class="first">
        <div class="day-nav">
          <button class="icon-btn" data-action="plan-day" data-v="-1" aria-label="Dia anterior" ${t <= U.addDays(today, -14) ? 'disabled' : ''}>‹</button>
          <div class="day-nav-mid">
            <b class="cap">${isToday ? 'Hoje' : t === U.addDays(today, -1) ? 'Ontem' : U.fmtLong(t)}</b>
            <small>${doneN}/${habits.length} feitos${!isToday ? ' · você pode corrigir dias passados' : ''}</small>
          </div>
          <button class="icon-btn" data-action="plan-day" data-v="1" aria-label="Próximo dia" ${isToday ? 'disabled' : ''}>›</button>
        </div>
        ${!isToday ? '<button class="link-btn center-link" data-action="plan-today">Voltar para hoje</button>' : ''}
        <div class="section-head">
          <h2>Hábitos</h2>
          <div class="row gap">
            ${isToday ? `<button class="pill ${hard ? 'on' : ''}" data-action="hard-mode">🌧️ ${hard ? 'Dia difícil' : 'Dia difícil?'}</button>` : ''}
            <button class="pill" data-action="habit-new" aria-label="Novo hábito">${ICONS.plus}</button>
          </div>
        </div>
        ${hard && isToday ? `<p class="hard-note">Hoje, só o essencial. Fazer o mínimo já mantém sua sequência. 🤍</p>` : ''}
        ${habits.length ? habitGroups(habits, t, false) : `<p class="empty">Nenhum hábito para este dia.</p>`}
        ${hidden.length ? `<p class="muted small hint">Fora do dia: ${hidden.map(h => esc(h.icon)).join(' ')} (${hidden.length === 1 ? 'não é dia dele' : 'não é dia deles'})</p>` : ''}
        <p class="muted small hint">Toque no ícone de um hábito para ver detalhes. Editar e reordenar: Perfil → Meus hábitos.</p>
      </section>

      <section>
        <div class="section-head">
          <h2>Tarefas</h2>
          <button class="pill" data-action="pomodoro" data-v="25">⏱️ Focar</button>
        </div>
        <form class="add-task" data-form="add-task">
          <input class="input" id="taskInput" maxlength="200" placeholder="${ui.taskDate === 'amanha' ? 'Tarefa para amanhã…' : 'Adicionar tarefa…'}" autocomplete="off">
          <button class="btn primary icon" aria-label="Adicionar">${ICONS.plus}</button>
        </form>
        <div class="task-opts">
          <button class="pill ${ui.taskDate !== 'amanha' ? 'on' : ''}" data-action="task-date" data-v="hoje">Hoje</button>
          <button class="pill ${ui.taskDate === 'amanha' ? 'on' : ''}" data-action="task-date" data-v="amanha">Amanhã</button>
          <button class="pill ${ui.taskPrio ? 'on gold' : ''}" data-action="task-prio">★ Prioridade</button>
        </div>
        <div class="tasks">${taskList(today)}</div>
      </section>

      <section>
        <div class="section-head">
          <h2>Metas</h2>
          <button class="pill on" data-action="goal-new">${ICONS.plus} Nova</button>
        </div>
        <div class="goals">${goalList()}</div>
      </section>
      <div class="spacer"></div>`;
  }

  // Check-in em folha: humor já escolhido, falta a ansiedade
  function checkinSheet(mood) {
    const st = { anxiety: 5 };
    const m = U.modal(`
      <div class="ci-sheet">
        <div class="big-emoji xl center">${MOODS[mood - 1][0]}</div>
        <p class="muted center">${MOODS[mood - 1][1]}</p>
        <label class="field">
          <span>E a ansiedade agora? <b id="csVal">5</b>/10</span>
          <input type="range" min="0" max="10" value="5" id="csAnx" class="anx-range">
        </label>
        <input class="input" id="csNote" maxlength="200" placeholder="Quer anotar algo? (opcional)">
        <button class="btn primary block" id="csSave" style="margin-top:14px">Salvar</button>
      </div>`, { cls: 'small' });
    const $ = s => m.el.querySelector(s);
    $('#csAnx').oninput = e => { st.anxiety = +e.target.value; $('#csVal').textContent = e.target.value; };
    $('#csSave').onclick = async () => {
      $('#csSave').disabled = true;
      const ok = await App.saveCheckin({ mood, anxiety: st.anxiety, note: $('#csNote').value });
      if (ok) m.close(); else $('#csSave').disabled = false;
    };
  }

  // ------------------------------------------------------------------ MEDITAR
  const med = { minutes: +U.store.get('raiz-med-min', 10) || 10, mode: 'mindfulness', amb: U.store.get('raiz-amb', 'none') };

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
        <p class="muted small" style="margin:12px 0 8px">Som ambiente</p>
        <div class="amb-pick">
          ${Object.entries(Snd.Amb.LIST).map(([k, n]) => `<button class="${med.amb === k ? 'on' : ''}" data-action="med-amb" data-v="${k}">${n}</button>`).join('')}
          <button class="${med.amb === 'none' ? 'on' : ''}" data-action="med-amb" data-v="none">🔇 Silêncio</button>
        </div>
        ${med.amb !== 'none' ? `<button class="link-btn" data-action="amb-preview" data-v="${med.amb}">${Snd.Amb.current === med.amb ? '⏹ Parar prévia' : '▶ Ouvir prévia'}</button>` : ''}
        <button class="btn primary block big" data-action="med-start" style="margin-top:10px">Começar · ${med.minutes} min</button>
      </div>

      <div class="card pomo-card">
        <div class="section-head"><h3>⏱️ Foco profundo</h3>${G.flagged('pomodoro') ? '<span class="pill on">✓ hoje</span>' : ''}</div>
        <p class="muted small">Timer de concentração com som ambiente (chuva, mar, ruído marrom…). Eu aviso quando acabar, mesmo com a tela apagada.</p>
        <div class="durations pm-quick">${[15, 25, 45, 60].map(n => `<button class="dur" data-action="pomodoro" data-v="${n}"><b>${n}</b><small>min</small></button>`).join('')}</div>
      </div>

      <div class="card hrt-mini">
        <div class="section-head"><h3>✋ Treino anti-coçar</h3><button class="link-btn" data-action="hrt-learn">Como funciona</button></div>
        <p class="muted small">Resposta Concorrente (HRT): perceber a vontade, mãos nas coxas por 1 minuto e seguir a atividade.</p>
        <div class="row gap" style="margin-top:12px">
          <button class="btn hrt-btn" style="flex:1" data-action="hrt">✋ Vontade agora</button>
          <button class="btn soft" style="flex:1" data-action="hrt-sim">🎓 Simular</button>
        </div>
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

      <div class="card plan-card">
        <div class="section-head"><h3>🛡️ Meu plano anti-impulso</h3></div>
        ${P.plans().length || P.reasons().length
          ? `<p class="muted small">${P.reasons().length} ${P.reasons().length === 1 ? 'motivo' : 'motivos'} · ${P.plans().length} ${P.plans().length === 1 ? 'plano' : 'planos'} "Se… então…". Aparece sozinho quando você aperta 🌊 Impulso.</p>
             <div class="row gap" style="margin-top:12px"><button class="btn soft" data-action="plan-show">Ver</button><button class="btn ghost" data-action="plan-edit">Editar</button></div>`
          : `<p class="muted small">Escreva agora, com calma, seus motivos e o que fazer quando a vontade bater. Na hora do impulso, o app mostra isso para você.</p>
             <button class="btn primary block" data-action="plan-edit" style="margin-top:12px">Montar meu plano</button>`}
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
    const recent = S.impulses.filter(i => i.date >= since && i.kind !== H.KIND);
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
    const got = G.ACH.filter(a => S.achievements.has(a.code)).length;
    const seg = `
      <div class="seg tabs" role="tablist">
        <button class="${ui.progTab === 'resumo' ? 'on' : ''}" data-action="prog-tab" data-v="resumo">📈 Resumo</button>
        <button class="${ui.progTab === 'conquistas' ? 'on' : ''}" data-action="prog-tab" data-v="conquistas">🏆 ${got}/${G.ACH.length}</button>
        <button class="${ui.progTab === 'loja' ? 'on' : ''}" data-action="prog-tab" data-v="loja">🛍️ Loja</button>
      </div>`;
    if (ui.progTab === 'loja') {
      return `<header class="page-head"><div><h1>Loja</h1><p class="muted">Gaste as moedas que você ganhou.</p></div></header>${seg}${loja()}`;
    }
    if (ui.progTab === 'conquistas') {
      return `<header class="page-head"><div><h1>Progresso</h1><p class="muted">${got} de ${G.ACH.length} conquistas desbloqueadas</p></div></header>${seg}${conquistas(true)}`;
    }
    return `
      <header class="page-head"><div><h1>Progresso</h1><p class="muted">Cada quadradinho é uma vitória sua.</p></div></header>
      ${seg}
      ${header()}
      ${weekCard()}
      <div class="tiles" style="margin-top:14px">
        <div class="tile"><span>🔥</span><b>${G.streak()}</b><small>sequência atual</small></div>
        <div class="tile"><span>🏅</span><b>${s.best}</b><small>melhor sequência</small></div>
        <div class="tile"><span>✅</span><b>${s.habitTotal}</b><small>hábitos feitos</small></div>
        <div class="tile"><span>🌊</span><b>${s.resisted}</b><small>impulsos controlados</small></div>
        <div class="tile"><span>🌸</span><b>${s.medMinutes}</b><small>min meditados</small></div>
        <div class="tile"><span>⭐</span><b>${S.profile.xp}</b><small>XP total</small></div>
        <div class="tile"><span>🌟</span><b>${s.perfectDays}</b><small>dias perfeitos</small></div>
        <div class="tile"><span>🧰</span><b>${s.chests}</b><small>baús abertos</small></div>
        <div class="tile"><span>⚡</span><b>${s.maxCombo}</b><small>maior combo</small></div>
      </div>
      <div class="card"><h3>Seus dias</h3>${heatmap()}</div>
      <div class="card"><h3>Humor e ansiedade · 14 dias</h3>${moodChart()}</div>
      <div class="card"><h3>O que te ajuda</h3>${insights()}</div>
      <div class="card"><h3>Hábitos · últimas 4 semanas</h3>${habitRates()}</div>
      ${H.progressCard()}
      <div class="card"><h3>Impulsos · 30 dias</h3>${impulseBlock()}</div>
      <div class="card"><h3>Quando os impulsos aparecem</h3>${P.riskCard()}</div>
      <div class="spacer"></div>`;
  }

  // Pontos da semana vs semana passada (você contra você mesmo)
  function weekCard() {
    const ws = U.weekStart(U.today());
    const cur = G.weekPoints(ws), prev = G.weekPoints(U.addDays(ws, -7));
    const best = Math.max(prev, ...[2, 3, 4, 5].map(k => G.weekPoints(U.addDays(ws, -7 * k))));
    const diff = prev ? Math.round((cur - prev) / prev * 100) : null;
    const max = Math.max(cur, prev, 1);
    return `
      <div class="card week-card">
        <h3>🏁 Você vs. semana passada</h3>
        <div class="vs">
          <div class="vs-row"><span>Esta semana</span><div class="bar thick"><div class="bar-fill" style="width:${cur / max * 100}%"></div></div><b>${cur}</b></div>
          <div class="vs-row past"><span>Semana passada</span><div class="bar thick"><div class="bar-fill" style="width:${prev / max * 100}%"></div></div><b>${prev}</b></div>
        </div>
        <p class="muted small">${cur > prev ? `🔥 Você já passou a semana passada${diff !== null ? ` (+${diff}%)` : ''}! ${cur >= best ? 'E é a sua melhor semana do último mês.' : ''}`
          : `Faltam <b>${prev - cur + 1} pontos</b> para superar a semana passada.`}</p>
      </div>`;
  }

  // ------------------------------------------------------------------ LOJA
  function loja() {
    const items = G.shopItems();
    const acc = U.pref('accent', 'raiz');
    return `
      <div class="wallet"><span>💰</span><b data-coins>${S.profile.coins || 0}</b><small>moedas</small></div>
      <p class="muted small center">Ganhe moedas fazendo hábitos, missões do dia, baús, foco e vencendo vontades.</p>
      <div class="shop">
        ${items.map(i => `
          <div class="shop-item ${i.owned ? 'owned' : ''}">
            <span class="shop-ic" ${i.swatch ? `style="background:rgb(${i.swatch} / .18);color:rgb(${i.swatch})"` : ''}>${i.icon}</span>
            <div class="shop-body"><b>${esc(i.name)}</b><small>${esc(i.desc)}</small></div>
            ${i.owned ? `<button class="pill ${acc === i.id.slice(6) ? 'on' : ''}" data-action="accent" data-v="${i.id.slice(6)}">${acc === i.id.slice(6) ? 'Usando' : 'Usar'}</button>`
              : `<button class="buy ${(S.profile.coins || 0) >= i.price ? 'can' : ''}" data-action="buy" data-id="${i.id}" ${i.disabled ? 'disabled' : ''}>${i.disabled ? 'Máx.' : `💰 ${i.price}`}</button>`}
          </div>`).join('')}
      </div>
      <div class="card"><h3>🎨 Cores liberadas</h3>
        <div class="swatches">${Object.entries(G.THEMES).map(([k, t]) => `<button class="swatch ${acc === k ? 'on' : ''} ${G.themeUnlocked(k) ? '' : 'locked'}" style="--sw:${t.rgb}" data-action="${G.themeUnlocked(k) ? 'accent' : 'buy'}" data-v="${k}" data-id="theme:${k}" title="${esc(t.name)}">${G.themeUnlocked(k) ? '' : '🔒'}</button>`).join('')}</div>
      </div>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ CONQUISTAS
  function conquistas(embedded = false) {
    const lv = G.level(S.profile.xp);
    const got = G.ACH.filter(a => S.achievements.has(a.code)).length;
    const path = Array.from({ length: 11 }, (_, i) => i + 1).map(n => `
      <div class="lp ${n < lv.level ? 'past' : n === lv.level ? 'now' : ''}">
        <span>${n}</span><small>${esc(G.title(n))}</small>
      </div>`).join('');
    return `
      ${embedded ? '' : `<header class="page-head"><div><h1>Conquistas</h1><p class="muted">${got} de ${G.ACH.length} desbloqueadas</p></div></header>`}
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
      </div>

      <div class="card">
        <h3>🎨 Aparência e sensações</h3>
        <p class="muted small">Tema</p>
        <div class="seg small">${[['dark', '🌙 Escuro'], ['light', '☀️ Claro'], ['auto', '⚙️ Automático']].map(([k, n]) => `<button class="${U.pref('theme', 'dark') === k ? 'on' : ''}" data-action="theme-mode" data-v="${k}">${n}</button>`).join('')}</div>
        <p class="muted small">Cor</p>
        <div class="swatches">${Object.entries(G.THEMES).map(([k, t]) => `<button class="swatch ${U.pref('accent', 'raiz') === k ? 'on' : ''} ${G.themeUnlocked(k) ? '' : 'locked'}" style="--sw:${t.rgb}" data-action="${G.themeUnlocked(k) ? 'accent' : 'prog-tab'}" data-v="${G.themeUnlocked(k) ? k : 'loja'}" title="${esc(t.name)}">${G.themeUnlocked(k) ? '' : '🔒'}</button>`).join('')}</div>
        <label class="switch-row"><span>🔊 Sons</span><input type="checkbox" id="soundToggle" ${U.soundOn() ? 'checked' : ''}></label>
        <label class="field compact"><span>Volume</span><input type="range" id="volRange" min="0" max="100" value="${Math.round(Snd.volume() * 100)}"></label>
        <label class="switch-row"><span>📳 Vibração</span><input type="checkbox" id="hapticsToggle" ${U.pref('haptics', 'on') !== 'off' ? 'checked' : ''}></label>
        <label class="switch-row"><span>🎉 Confetes e comemorações</span><input type="checkbox" id="confettiToggle" ${U.celebrationsOn() ? 'checked' : ''}></label>
        <p class="muted small">Tela inicial</p>
        <div class="seg small">
          <button class="${U.pref('home', 'lista') === 'lista' ? 'on' : ''}" data-action="home-mode" data-v="lista">☰ Lista completa</button>
          <button class="${U.pref('home', 'lista') === 'foco' ? 'on' : ''}" data-action="home-mode" data-v="foco">🎯 Uma coisa por vez</button>
        </div>
      </div>

      <div class="card">
        <div class="section-head"><h3>Meus hábitos</h3><button class="pill on" data-action="habit-new">${ICONS.plus} Novo</button></div>
        <div class="habit-admin">
          ${hs.map((h, i) => `
            <div class="ha">
              <span class="ha-ic">${esc(h.icon)}</span>
              <div class="ha-body"><b>${esc(h.name)}</b><small class="muted">${G.daysLabel(h)} · ${h.target_per_week}x/sem${G.isCounter(h) ? ` · ${G.goalOf(h)} ${esc(h.unit || 'vezes')}` : ''}${h.remind_at ? ` · ⏰ ${esc(h.remind_at)}` : ''}${h.essential ? ' · essencial' : ''}</small></div>
              <button class="icon-btn subtle" data-action="habit-up" data-id="${h.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
              <button class="icon-btn subtle" data-action="habit-edit" data-id="${h.id}" aria-label="Editar">${ICONS.edit}</button>
            </div>`).join('') || '<p class="empty">Nenhum hábito ainda.</p>'}
        </div>
        <p class="muted small">Hábitos <b>essenciais</b> são os que aparecem no modo "Dia difícil".</p>
        ${S.habits.some(h => h.archived) ? '<button class="link-btn" data-action="habit-archived">Ver hábitos arquivados</button>' : ''}
      </div>

      <div class="card">
        <div class="section-head"><h3>✋ Treino anti-coçar</h3><button class="pill" data-action="hrt-settings">Ajustes</button></div>
        <p class="muted small">Resposta: <b>${esc(H.cfg().response)}</b> · ${H.cfg().seconds}s${H.cfg().remind ? ` · lembrete a cada ${H.cfg().remindEvery} min` : ''}</p>
      </div>

      <div class="card">
        <h3>Como funciona</h3>
        <ul class="how">
          <li>🔥 <b>Sequência:</b> conclua pelo menos 1 hábito por dia.</li>
          <li>🛡️ <b>Protetores:</b> a cada 7 dias seguidos você ganha 1 (máx. 3). Se falhar um dia, ele salva sua sequência sozinho.</li>
          <li>💰 <b>Moedas:</b> hábito +${G.COINS.habit} · missões · baús · dia perfeito +${G.COINS.perfect} · subir de nível +${G.COINS.level}. Gaste na loja (Progresso → Loja).</li>
          <li>📜 <b>Missões:</b> 3 por dia. Complete todas para abrir um baú surpresa (pode vir até um lendário 👑).</li>
          <li>⚡ <b>Combo:</b> marque hábitos em sequência (até 3 min entre eles) para ganhar XP extra.</li>
          <li>⭐ <b>XP:</b> hábito +${G.XP.habit} · impulso controlado +${G.XP.resisted} · deslize registrado +${G.XP.slip} · escrita +${G.XP.journal} · tarefa +${G.XP.task} · check-in +${G.XP.checkin} · meditação +${G.XP.medBase} +1/min +1 por volta ao foco · marco de meta +${G.XP.milestone} · conquista +${G.XP.achievement}</li>
          <li>🌧️ <b>Dia difícil:</b> mostra só os hábitos essenciais. Fazer o mínimo também conta.</li>
          <li>🤖 <b>Automático:</b> meditar, escrever ou resistir a um impulso já marcam o hábito correspondente.</li>
        </ul>
      </div>

      ${P.remindersCard()}

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
        <button class="btn soft block" data-action="export">⬇️ Baixar todos os meus dados (JSON)</button>
        <button class="btn soft block" data-action="export-csv">📊 Baixar histórico de hábitos (planilha)</button>
        <button class="btn ghost block" data-action="shortcuts">⌨️ Atalhos de teclado</button>
        <button class="btn ghost block danger-text" data-action="logout">Sair da conta</button>
      </div>
      <p class="muted small center">Raiz · feito para você crescer 🌱</p>
      <div class="spacer"></div>`;
  }

  // ------------------------------------------------------------------ Editor de hábito
  const EMOJIS = ['✋', '🧴', '💊', '✂️', '🧘', '🚶', '🏋️', '🏃', '🌊', '🧭', '✍️', '😴', '💧', '📖', '🥗', '🙏', '🧹', '📵', '🚭', '🌞', '🎯', '🧠', '🌬️', '🛁', '🌙', '❤️', '🚴', '🤸', '📞', '⏳', '🚫', '🤝'];

  // Sugestões (nomes genéricos: o código é público; personalize depois)
  const TEMPLATES = {
    'Corpo': [['🚶', '30 min de caminhada ou exercício'], ['🏋️', 'Treino de força'], ['🤸', 'Alongamento 10 min'], ['💧', 'Beber água', 8, 'copos'], ['🥗', 'Uma refeição saudável'], ['🌞', '15 min de sol']],
    'Pele': [['✋', 'Treino anti-coçar (resposta concorrente)'], ['🧴', 'Hidratei a pele', 2, 'vezes'], ['💊', 'Fiz o tratamento da pele'], ['✂️', 'Unhas curtas e lixadas']],
    'Mente': [['🧘', 'Meditação mindfulness'], ['✍️', 'Escrita terapêutica (até 10 min)'], ['📖', 'Ler', 10, 'páginas'], ['🙏', 'Anotar 3 gratidões'], ['🌬️', 'Respiração consciente 3x no dia']],
    'Autocontrole': [['🌊', 'Não obedeci automaticamente aos impulsos'], ['🧭', 'Evitei os gatilhos da compulsão'], ['⏳', 'Esperei 10 min antes de ceder a uma vontade'], ['📵', 'Celular fora do quarto à noite'], ['🚫', 'Sem redes sociais antes das 10h']],
    'Sono': [['😴', 'Mantive horário regular de sono'], ['🌙', 'Sem telas 1h antes de dormir']],
    'Vida': [['🧹', 'Arrumei meu espaço'], ['📞', 'Falei com alguém de quem gosto'], ['🎯', 'Fiz 1 tarefa importante'], ['🤝', 'Fiz algo gentil por alguém']]
  };

  const COLORS = ['', '#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#f87171'];
  const DAYN = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  function habitEditor(h) {
    const isNew = !h;
    h = h || { name: '', icon: '✨', target_per_week: 7, essential: false };
    const st = {
      icon: h.icon, target: h.target_per_week, essential: h.essential,
      days: h.days && h.days.length ? h.days.slice() : [1, 2, 3, 4, 5, 6, 7],
      tod: h.time_of_day || '', kind: h.kind || (G.isAvoid(h) && h.name ? 'avoid' : 'do'),
      goal: h.daily_goal || 1, color: h.color || ''
    };
    const v5 = DB.v5;
    const m = U.modal(`
      <h2>${isNew ? 'Novo hábito' : 'Editar hábito'}</h2>
      ${isNew ? `<details class="templates" open>
        <summary>💡 Sugestões</summary>
        ${Object.entries(TEMPLATES).map(([cat, list]) => `
          <p class="tpl-cat">${cat}</p>
          <div class="chips">${list.map(([ic, n, g, u]) => `<button type="button" class="chip" data-ti="${ic}" data-tn="${esc(n)}" data-tg="${g || 1}" data-tu="${esc(u || '')}">${ic} ${esc(n)}</button>`).join('')}</div>`).join('')}
      </details>` : ''}
      <label class="field"><span>Nome</span><input class="input" id="hName" maxlength="80" value="${esc(h.name)}" placeholder="Escreva o seu ou escolha uma sugestão"></label>
      <div class="field"><span>Ícone</span>
        <div class="emoji-grid">${EMOJIS.map(e => `<button type="button" class="${e === st.icon ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
      </div>
      ${v5 ? `
      <div class="field"><span>Tipo</span>
        <div class="seg small" id="hKind">
          <button type="button" data-k="do" class="${st.kind === 'do' ? 'on' : ''}">✅ Fazer algo</button>
          <button type="button" data-k="avoid" class="${st.kind === 'avoid' ? 'on' : ''}">🛡️ Evitar / manter</button>
        </div>
        <small class="muted" id="hKindHelp"></small>
      </div>
      <div class="field"><span>Dias da semana</span>
        <div class="days-pick" id="hDays">${DAYN.map((d, i) => `<button type="button" data-d="${i + 1}" class="${st.days.includes(i + 1) ? 'on' : ''}">${d}</button>`).join('')}</div>
        <div class="chips small-chips"><button type="button" class="chip" data-preset="all">Todo dia</button><button type="button" class="chip" data-preset="week">Dias úteis</button><button type="button" class="chip" data-preset="end">Fim de semana</button></div>
      </div>
      <div class="field"><span>Período do dia</span>
        <div class="seg small" id="hTod">${[['', '🕐 Qualquer'], ['manha', '🌅 Manhã'], ['tarde', '☀️ Tarde'], ['noite', '🌙 Noite']].map(([k, n]) => `<button type="button" data-t="${k}" class="${st.tod === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      </div>
      <div class="field"><span>Quantidade por dia</span>
        <div class="row gap">
          <div class="stepper"><button type="button" id="hGm">−</button><b id="hGv">${st.goal}</b><button type="button" id="hGp">+</button></div>
          <input class="input" id="hUnit" maxlength="20" placeholder="unidade (copos, páginas…)" value="${esc(h.unit || '')}" ${st.goal > 1 ? '' : 'hidden'}>
        </div>
        <small class="muted">1 = marcar como feito. Mais que 1 = contador (ex.: 8 copos de água).</small>
      </div>
      <label class="field"><span>⏰ Lembrete (opcional)</span><input class="input" type="time" id="hRemind" value="${esc(h.remind_at || '')}"></label>
      <div class="field"><span>Cor</span>
        <div class="swatches" id="hColor">${COLORS.map(c => `<button type="button" class="swatch ${st.color === c ? 'on' : ''} ${c ? '' : 'none'}" style="${c ? `background:${c}` : ''}" data-c="${c}">${c ? '' : '∅'}</button>`).join('')}</div>
      </div>` : `<p class="muted small banner warn" style="margin-bottom:14px">🛠️ Rode o <code>schema.sql</code> atualizado no Supabase para liberar: dias da semana, período, quantidade, lembrete e cor.</p>`}
      <div class="field"><span>Meta: <b id="hTargetVal">${st.target}</b>x por semana</span>
        <div class="seg small" id="hTarget">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" data-n="${n}" class="${n === st.target ? 'on' : ''}">${n}</button>`).join('')}</div>
      </div>
      <label class="switch-row"><span>Essencial <small class="muted">(aparece no dia difícil)</small></span><input type="checkbox" id="hEss" ${st.essential ? 'checked' : ''}></label>
      <div class="row gap end">
        ${isNew ? '' : '<button class="btn ghost danger-text" id="hDel">Arquivar</button>'}
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn primary" id="hSave">Salvar</button>
      </div>`, { cls: 'sheet' });
    const $ = q => m.el.querySelector(q);
    const syncKind = () => { if ($('#hKindHelp')) $('#hKindHelp').textContent = st.kind === 'avoid' ? 'Confirmado à noite, no "Fechar o dia" (ex.: não fumei, evitei gatilhos).' : 'Algo que você começa e faz (ex.: caminhar, meditar, ler).'; };
    syncKind();
    $('.emoji-grid').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      st.icon = b.dataset.e;
      m.el.querySelectorAll('.emoji-grid button').forEach(x => x.classList.toggle('on', x === b));
    };
    if ($('.templates')) $('.templates').onclick = e => {
      const b = e.target.closest('[data-tn]'); if (!b) return;
      $('#hName').value = b.dataset.tn;
      st.icon = b.dataset.ti;
      if (v5) {
        st.goal = +b.dataset.tg || 1; $('#hGv').textContent = st.goal;
        $('#hUnit').value = b.dataset.tu; $('#hUnit').hidden = st.goal <= 1;
        st.kind = G.isAvoid({ name: b.dataset.tn }) ? 'avoid' : 'do';
        m.el.querySelectorAll('#hKind button').forEach(x => x.classList.toggle('on', x.dataset.k === st.kind));
        syncKind();
      }
      m.el.querySelectorAll('.emoji-grid button').forEach(x => x.classList.toggle('on', x.dataset.e === st.icon));
      m.el.querySelectorAll('.templates .chip').forEach(x => x.classList.toggle('on', x === b));
      $('.templates').open = false;
      $('#hName').focus();
    };
    const segPick = (sel, attr, fn) => { const el = $(sel); if (!el) return; el.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      fn(b.dataset[attr]);
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      U.play('tap');
    }; };
    segPick('#hTarget', 'n', v => { st.target = +v; $('#hTargetVal').textContent = st.target; });
    segPick('#hKind', 'k', v => { st.kind = v; syncKind(); });
    segPick('#hTod', 't', v => { st.tod = v; });
    if ($('#hDays')) {
      const drawDays = () => m.el.querySelectorAll('#hDays button').forEach(x => x.classList.toggle('on', st.days.includes(+x.dataset.d)));
      $('#hDays').onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        const d = +b.dataset.d;
        st.days = st.days.includes(d) ? st.days.filter(x => x !== d) : st.days.concat(d);
        if (!st.days.length) st.days = [d];
        drawDays(); U.play('tap');
      };
      m.el.querySelector('.small-chips').onclick = e => {
        const b = e.target.closest('[data-preset]'); if (!b) return;
        st.days = b.dataset.preset === 'all' ? [1, 2, 3, 4, 5, 6, 7] : b.dataset.preset === 'week' ? [1, 2, 3, 4, 5] : [6, 7];
        if (st.target > st.days.length) { st.target = st.days.length; $('#hTargetVal').textContent = st.target; m.el.querySelectorAll('#hTarget button').forEach(x => x.classList.toggle('on', +x.dataset.n === st.target)); }
        drawDays(); U.play('tap');
      };
      const step = n => { st.goal = Math.max(1, Math.min(100, st.goal + n)); $('#hGv').textContent = st.goal; $('#hUnit').hidden = st.goal <= 1; U.play('tap'); };
      $('#hGm').onclick = () => step(-1);
      $('#hGp').onclick = () => step(1);
      $('#hColor').onclick = e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        st.color = b.dataset.c;
        m.el.querySelectorAll('#hColor .swatch').forEach(x => x.classList.toggle('on', x === b));
      };
    }
    $('#hSave').onclick = async () => {
      const name = $('#hName').value.trim();
      if (!name) { $('#hName').focus(); return; }
      const row = { name, icon: st.icon, target_per_week: st.target, essential: $('#hEss').checked };
      if (v5) Object.assign(row, {
        kind: st.kind, days: st.days.length === 7 ? null : st.days.sort(), time_of_day: st.tod || null,
        daily_goal: st.goal, unit: st.goal > 1 ? ($('#hUnit').value.trim() || null) : null,
        remind_at: $('#hRemind').value || null, color: st.color || null
      });
      try {
        if (isNew) {
          row.position = Math.max(-1, ...S.habits.map(x => x.position)) + 1;
          row.user_id = S.user.id;
          S.habits.push(await DB.insert('habits', row));
        } else {
          Object.assign(h, await DB.update('habits', h.id, row));
        }
        G.reindex();
        m.close(); App.render(); U.play('task'); U.toast('Hábito salvo ✓', 'success');
        if (row.remind_at && P.push.state !== 'on' && !N.granted()) U.toast('🔔 Para receber o lembrete, ative os lembretes em Perfil.', 'info', { action: 'Ativar', onAction: () => P.enablePush() });
      } catch (e) { console.error(e); U.toast('Erro ao salvar o hábito.', 'error'); }
    };
    if (!isNew) $('#hDel').onclick = async () => {
      if (!confirm(`Arquivar "${h.name}"? O histórico continua guardado.`)) return;
      try { Object.assign(h, await DB.update('habits', h.id, { archived: true })); m.close(); App.render(); }
      catch (e) { console.error(e); U.toast('Erro ao arquivar.', 'error'); }
    };
  }

  // Detalhes de um hábito: sequência, recorde, taxa e calendário de 12 semanas
  function habitDetail(h) {
    if (!h) return;
    const t = U.today();
    const streak = G.habitStreak(h), best = G.habitBest(h);
    const total = S.logs.filter(l => l.habit_id === h.id && G.isDone(h.id, l.date)).length;
    let sched = 0, done = 0;
    for (let i = 0; i < 30; i++) { const d = U.addDays(t, -i); if (G.scheduledOn(h, d)) { sched++; if (G.isDone(h.id, d)) done++; } }
    const rate = sched ? Math.round(done / sched * 100) : 0;
    const weeks = 12, start = U.addDays(U.weekStart(t), -7 * (weeks - 1));
    let cols = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const k = U.addDays(start, w * 7 + d);
        if (k > t) { cells += '<i class="future"></i>'; continue; }
        const a = G.amount(h.id, k);
        const lvl = G.isDone(h.id, k) ? 4 : a > 0 ? 2 : 0;
        cells += `<i class="l${lvl} ${G.scheduledOn(h, k) ? '' : 'off'}" title="${U.fmtShort(k)}${a ? `: ${a}` : ''}"></i>`;
      }
      cols += `<div class="hm-col">${cells}</div>`;
    }
    const m = U.modal(`
      <div class="hd-head"><span class="hd-ic" ${h.color ? `style="background:${esc(h.color)}22"` : ''}>${esc(h.icon)}</span><div><h2>${esc(h.name)}</h2>
        <p class="muted small">${G.daysLabel(h)}${h.time_of_day ? ' · ' + PERIODS[h.time_of_day].join(' ') : ''}${G.isCounter(h) ? ` · ${G.goalOf(h)} ${esc(h.unit || 'vezes')}/dia` : ''}${h.remind_at ? ` · ⏰ ${esc(h.remind_at)}` : ''}</p></div></div>
      <div class="tiles">
        <div class="tile"><span>🔥</span><b>${streak}</b><small>sequência</small></div>
        <div class="tile"><span>🏅</span><b>${best}</b><small>recorde</small></div>
        <div class="tile"><span>📈</span><b>${rate}%</b><small>últimos 30 dias</small></div>
      </div>
      <div class="card flat"><h3>Últimas 12 semanas</h3><div class="heatmap">${cols}</div></div>
      <p class="muted small center">Feito ${U.plural(total, 'vez', 'vezes')} no total.</p>
      <div class="row gap end" style="margin-top:12px">
        <button class="btn soft" id="hdEdit">Editar</button>
        ${!G.isAvoid(h) ? '<button class="btn primary" id="hdStart">Começar agora</button>' : ''}
      </div>`, { cls: 'sheet' });
    m.el.querySelector('#hdEdit').onclick = () => { m.close(); setTimeout(() => habitEditor(h), 220); };
    const st = m.el.querySelector('#hdStart');
    if (st) st.onclick = () => { m.close(); setTimeout(() => F.start(h.id), 220); };
  }

  function archivedSheet() {
    const list = S.habits.filter(h => h.archived);
    const m = U.modal(`
      <h2>Hábitos arquivados</h2>
      ${list.map(h => `<div class="ha"><span class="ha-ic">${esc(h.icon)}</span><div class="ha-body"><b>${esc(h.name)}</b></div><button class="btn soft" data-un="${h.id}">Restaurar</button></div>`).join('') || '<p class="empty">Nada arquivado.</p>'}
      <button class="btn ghost block" data-close style="margin-top:12px">Fechar</button>`, { cls: 'sheet' });
    m.el.onclick = async e => {
      const b = e.target.closest('[data-un]'); if (!b) return;
      const h = S.habits.find(x => x.id === b.dataset.un);
      try { Object.assign(h, await DB.update('habits', h.id, { archived: false })); b.closest('.ha').remove(); App.render(); U.toast(`${esc(h.icon)} Restaurado`, 'success'); }
      catch (err) { console.error(err); U.toast('Erro ao restaurar.', 'error'); }
    };
  }

  function shortcutsSheet() {
    U.modal(`
      <h2>⌨️ Atalhos</h2>
      <ul class="how keys">
        <li><kbd>1</kbd>–<kbd>5</kbd> trocar de aba</li>
        <li><kbd>C</kbd> vontade de coçar (treino anti-coçar)</li>
        <li><kbd>I</kbd> impulso (surfar a onda)</li>
        <li><kbd>N</kbd> nova tarefa</li>
        <li><kbd>H</kbd> novo hábito</li>
        <li><kbd>F</kbd> foco profundo (25 min)</li>
        <li><kbd>Esc</kbd> fechar janela</li>
      </ul>
      <button class="btn primary block" data-close>Ok</button>`, { cls: 'small' });
  }

  window.V = { hoje, plano, checkinSheet, ui, meditar, progresso, conquistas, perfil, header, habitEditor, habitDetail, archivedSheet, shortcutsSheet, taskEditor, goalEditor, ci, med, period };
})();
