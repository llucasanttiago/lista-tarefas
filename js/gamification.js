// XP, níveis, sequência, protetores e conquistas.
(function () {
  const TITLES = ['Semente', 'Broto', 'Muda', 'Raiz firme', 'Planta jovem', 'Arbusto',
    'Árvore jovem', 'Árvore', 'Árvore forte', 'Carvalho', 'Floresta'];

  const XP = { habit: 10, task: 5, checkin: 5, resisted: 20, slip: 5, medBase: 5, achievement: 25, grounding: 5,
    journal: 15, goalStep: 5, goalDone: 50, milestone: 20 };

  const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000];

  const ACH = [
    { code: 'primeiro_passo', icon: '🌱', title: 'Primeiro passo', desc: 'Concluiu seu primeiro hábito', test: s => s.habitTotal >= 1 },
    { code: 'streak_3', icon: '🔥', title: 'Pegando fogo', desc: '3 dias seguidos', test: s => s.best >= 3 },
    { code: 'streak_7', icon: '⚡', title: 'Uma semana inteira', desc: '7 dias seguidos', test: s => s.best >= 7 },
    { code: 'streak_14', icon: '🌟', title: 'Duas semanas', desc: '14 dias seguidos', test: s => s.best >= 14 },
    { code: 'streak_30', icon: '🏆', title: 'Um mês de raiz', desc: '30 dias seguidos', test: s => s.best >= 30 },
    { code: 'streak_66', icon: '🧠', title: 'Hábito formado', desc: '66 dias seguidos, o tempo médio para um hábito virar automático', test: s => s.best >= 66 },
    { code: 'streak_100', icon: '💎', title: 'Centenário', desc: '100 dias seguidos', test: s => s.best >= 100 },
    { code: 'week_goal', icon: '🎯', title: 'Meta da semana', desc: 'Bateu a meta semanal de um hábito', test: s => s.weekGoal },
    { code: 'habits_50', icon: '✅', title: 'Constância', desc: '50 hábitos concluídos', test: s => s.habitTotal >= 50 },
    { code: 'habits_200', icon: '🧱', title: 'Disciplina', desc: '200 hábitos concluídos', test: s => s.habitTotal >= 200 },
    { code: 'habits_500', icon: '⛰️', title: 'Inabalável', desc: '500 hábitos concluídos', test: s => s.habitTotal >= 500 },
    { code: 'impulse_1', icon: '🌊', title: 'Surfista', desc: 'Surfou o primeiro impulso sem ceder', test: s => s.resisted >= 1 },
    { code: 'impulse_10', icon: '🏄', title: 'Domando ondas', desc: '10 impulsos controlados', test: s => s.resisted >= 10 },
    { code: 'impulse_50', icon: '🛡️', title: 'Autocontrole', desc: '50 impulsos controlados', test: s => s.resisted >= 50 },
    { code: 'impulse_100', icon: '👑', title: 'Mestre das ondas', desc: '100 impulsos controlados', test: s => s.resisted >= 100 },
    { code: 'honesty', icon: '🤝', title: 'Honestidade', desc: 'Registrou um deslize com sinceridade, e é assim que se muda', test: s => s.slips >= 1 },
    { code: 'med_1', icon: '🧘', title: 'Primeira pausa', desc: 'Fez sua primeira meditação', test: s => s.medSessions >= 1 },
    { code: 'med_60', icon: '⏳', title: '1 hora de presença', desc: '60 minutos meditados', test: s => s.medMinutes >= 60 },
    { code: 'med_300', icon: '🕊️', title: 'Mente serena', desc: '300 minutos meditados', test: s => s.medMinutes >= 300 },
    { code: 'med_1000', icon: '🌸', title: 'Monge', desc: '1000 minutos meditados', test: s => s.medMinutes >= 1000 },
    { code: 'focus_50', icon: '🎯', title: 'Atenção treinada', desc: 'Notou a distração e voltou 50 vezes', test: s => s.returns >= 50 },
    { code: 'focus_500', icon: '🧠', title: 'Músculo da atenção', desc: 'Notou a distração e voltou 500 vezes', test: s => s.returns >= 500 },
    { code: 'journal_1', icon: '✍️', title: 'Primeira página', desc: 'Fez sua primeira escrita terapêutica', test: s => s.journal >= 1 },
    { code: 'journal_10', icon: '📓', title: 'Colocando pra fora', desc: '10 escritas terapêuticas', test: s => s.journal >= 10 },
    { code: 'journal_30', icon: '📚', title: 'Autor da própria história', desc: '30 escritas terapêuticas', test: s => s.journal >= 30 },
    { code: 'free_7', icon: '🕊️', title: 'Uma semana livre', desc: '7 dias seguidos em uma meta de "dias livre"', test: s => s.freeDays >= 7 },
    { code: 'free_30', icon: '🦅', title: 'Um mês livre', desc: '30 dias seguidos em uma meta de "dias livre"', test: s => s.freeDays >= 30 },
    { code: 'free_90', icon: '🌅', title: 'Nova vida', desc: '90 dias seguidos em uma meta de "dias livre"', test: s => s.freeDays >= 90 },
    { code: 'goal_done', icon: '🏁', title: 'Meta cumprida', desc: 'Completou uma meta numérica', test: s => s.goalsDone >= 1 },
    { code: 'grounding', icon: '🖐️', title: 'Pés no chão', desc: 'Fez o exercício de aterramento 5-4-3-2-1', test: s => s.grounding },
    { code: 'checkin_7', icon: '💭', title: 'Autoconhecimento', desc: '7 check-ins de humor', test: s => s.checkins >= 7 },
    { code: 'checkin_30', icon: '📔', title: 'Diário da mente', desc: '30 check-ins de humor', test: s => s.checkins >= 30 },
    { code: 'tasks_10', icon: '📋', title: 'Fazedor', desc: '10 tarefas concluídas', test: s => s.tasksDone >= 10 },
    { code: 'tasks_100', icon: '🚀', title: 'Máquina de fazer', desc: '100 tarefas concluídas', test: s => s.tasksDone >= 100 },
    { code: 'hard_day', icon: '🌧️', title: 'Mesmo na chuva', desc: 'Cumpriu um hábito em um dia difícil', test: s => s.hardDay },
    { code: 'level_5', icon: '🌳', title: 'Planta jovem', desc: 'Chegou ao nível 5', test: s => s.level >= 5 },
    { code: 'level_10', icon: '🌲', title: 'Carvalho', desc: 'Chegou ao nível 10', test: s => s.level >= 10 }
  ];

  const G = {
    XP, ACH, MILESTONES,

    // dias desde o início de uma meta "dias livre"
    goalDays(g) {
      if (!g.start_date) return 0;
      return Math.max(0, Math.round((U.parseKey(U.today()) - U.parseKey(g.start_date)) / 864e5));
    },
    nextMilestone(days) { return MILESTONES.find(m => m > days) || days + 365; },
    lastMilestone(days) { let r = 0; MILESTONES.forEach(m => { if (m <= days) r = m; }); return r; },

    level(xp) {
      let lvl = 1, need = 100, acc = 0;
      while (xp >= acc + need) { acc += need; lvl++; need = 100 * lvl; }
      return { level: lvl, into: xp - acc, need, title: G.title(lvl) };
    },
    title(lvl) { return lvl <= TITLES.length ? TITLES[lvl - 1] : `Floresta ${lvl - TITLES.length + 1}`; },

    reindex() { S.logSet = new Set(S.logs.map(l => l.habit_id + '|' + l.date)); },
    isDone(habitId, date) { return S.logSet.has(habitId + '|' + date); },

    activeHabits() { return S.habits.filter(h => !h.archived).sort((a, b) => a.position - b.position); },
    isHardMode() { return S.profile && S.profile.hard_mode_date === U.today(); },
    visibleHabits() {
      const all = G.activeHabits();
      if (!G.isHardMode()) return all;
      const ess = all.filter(h => h.essential);
      return ess.length ? ess : all.slice(0, 2);
    },

    // dias "ativos" = pelo menos 1 hábito concluído, ou salvo por protetor
    activeDates() {
      const s = new Set(S.logs.map(l => l.date));
      S.freezes.forEach(d => s.add(d));
      return s;
    },
    streak() {
      const a = G.activeDates();
      let k = U.today();
      if (!a.has(k)) k = U.addDays(k, -1);
      let n = 0;
      while (a.has(k)) { n++; k = U.addDays(k, -1); }
      return n;
    },
    weekCount(habitId, date = U.today()) {
      const start = U.weekStart(date);
      let n = 0;
      for (let i = 0; i < 7; i++) if (G.isDone(habitId, U.addDays(start, i))) n++;
      return n;
    },

    stats() {
      const lv = G.level(S.profile.xp);
      return {
        habitTotal: S.logs.length,
        best: Math.max(S.profile.best_streak || 0, G.streak()),
        weekGoal: G.activeHabits().some(h => G.weekCount(h.id) >= h.target_per_week),
        resisted: S.impulses.filter(i => i.resisted).length,
        slips: S.impulses.filter(i => !i.resisted).length,
        medSessions: S.meds.length,
        medMinutes: S.meds.reduce((a, m) => a + m.minutes, 0),
        checkins: S.moods.length,
        tasksDone: S.tasks.filter(t => t.done).length,
        returns: S.meds.reduce((a, m) => a + (m.returns || 0), 0),
        journal: S.journal.length,
        freeDays: Math.max(0, ...S.goals.filter(g => g.kind === 'days' && !g.archived).map(g => Math.max(g.best || 0, G.goalDays(g)))),
        goalsDone: S.goals.filter(g => g.kind === 'count' && g.completed_at).length,
        hardDay: S.flags.hardDay,
        grounding: S.flags.grounding,
        level: lv.level
      };
    },

    // ---- XP ----
    async addXp(n, el) {
      if (!n) return;
      const before = G.level(S.profile.xp).level;
      const xp = Math.max(0, S.profile.xp + n);
      if (el) U.floatXp(el, n);
      try { await DB.updateProfile({ xp }); } catch (e) { console.error(e); }
      const after = G.level(xp).level;
      if (after > before) G.celebrateLevel(after);
      App.refreshHeader();
    },

    celebrateLevel(level) {
      U.play('level');
      U.confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
      U.modal(`
        <div class="celebrate">
          <div class="celebrate-icon">🌿</div>
          <p class="eyebrow">Subiu de nível!</p>
          <h2>Nível ${level}</h2>
          <p class="celebrate-title">${U.esc(G.title(level))}</p>
          <p class="muted">Cada pequena escolha está construindo quem você quer ser.</p>
          <button class="btn primary block" data-close>Continuar</button>
        </div>`, { cls: 'small' });
    },

    // Chamado quando o dia de hoje passa a ter o 1º hábito concluído.
    async onDayActivated() {
      const p = S.profile, t = U.today();
      const streak = G.streak();
      const patch = {};
      if (streak > (p.best_streak || 0)) patch.best_streak = streak;
      if (streak > 0 && streak % 7 === 0 && p.freeze_awarded_on !== t && p.freezes < 3) {
        patch.freezes = p.freezes + 1;
        patch.freeze_awarded_on = t;
        setTimeout(() => U.toast('🛡️ <b>Você ganhou um protetor de sequência!</b><br>Ele salva sua sequência se você falhar um dia.', 'gold'), 900);
      }
      if ([3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365].includes(streak)) {
        setTimeout(() => U.toast(`🔥 <b>${streak} dias seguidos!</b> Continue assim.`, 'gold'), 400);
      }
      if (Object.keys(patch).length) {
        try { await DB.updateProfile(patch); } catch (e) { console.error(e); }
      }
    },

    // Ao abrir o app: se ficou dia(s) sem hábito, usa protetores para salvar a sequência.
    async applyFreezes() {
      const p = S.profile;
      if (!p || p.freezes <= 0) return;
      const a = G.activeDates();
      const gap = [];
      let d = U.addDays(U.today(), -1);
      while (!a.has(d) && gap.length <= p.freezes) { gap.push(d); d = U.addDays(d, -1); }
      if (!gap.length || gap.length > p.freezes || !a.has(d)) return;
      try {
        await DB.insertMany('streak_freezes', gap.map(date => ({ date, user_id: S.user.id })));
        S.freezes.push(...gap);
        await DB.updateProfile({ freezes: p.freezes - gap.length });
        const n = G.streak();
        setTimeout(() => U.toast(`🛡️ <b>Protetor usado!</b> Sua sequência de ${n} ${n === 1 ? 'dia' : 'dias'} foi salva. Hoje é um novo dia.`, 'gold'), 600);
      } catch (e) { console.error(e); }
    },

    async checkAchievements() {
      const s = G.stats();
      const fresh = ACH.filter(a => !S.achievements.has(a.code) && a.test(s));
      for (const a of fresh) {
        try {
          await DB.insert('achievements', { code: a.code, user_id: S.user.id });
        } catch (e) {
          if (!String(e.message || '').includes('duplicate')) { console.error(e); continue; }
        }
        S.achievements.set(a.code, new Date().toISOString());
      }
      if (!fresh.length) return;
      fresh.forEach((a, i) => setTimeout(() => {
        U.play('achievement');
        U.confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
        U.toast(`<span class="toast-ach">${a.icon}</span><div><b>Conquista desbloqueada!</b><br>${U.esc(a.title)}</div>`, 'achievement');
      }, 700 + i * 1600));
      await G.addXp(XP.achievement * fresh.length);
      if (S.tab === 'conquistas') App.render();
    }
  };

  window.G = G;
})();
