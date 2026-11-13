// XP, moedas, níveis, sequência, protetores, missões, baús, combo, loja e conquistas.
(function () {
  const TITLES = ['Semente', 'Broto', 'Muda', 'Raiz firme', 'Planta jovem', 'Arbusto',
    'Árvore jovem', 'Árvore', 'Árvore forte', 'Carvalho', 'Floresta'];

  const XP = { habit: 10, task: 5, checkin: 5, resisted: 20, slip: 5, medBase: 5, achievement: 25, grounding: 5,
    journal: 15, goalStep: 5, goalDone: 50, milestone: 20, perfect: 25, pomodoro: 15 };
  const COINS = { habit: 2, task: 1, perfect: 15, level: 25, achievement: 10, resisted: 5 };

  const MILESTONES = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365, 500, 730, 1000];

  // Hábitos de "evitar/manter" (se confirmam no fim do dia), quando o tipo não foi escolhido
  const PASSIVE = /evit|n[ãa]o obedec|mantive|^sem\s|dorm|^n[ãa]o\s/i;

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
    { code: 'plan_1', icon: '🗺️', title: 'Preparado', desc: 'Montou seu plano anti-impulso', test: s => s.plans >= 1 },
    { code: 'review_1', icon: '📅', title: 'Olhando para trás', desc: 'Fez sua primeira revisão da semana', test: s => s.reviews >= 1 },
    { code: 'review_4', icon: '🗓️', title: 'Um mês de revisões', desc: '4 revisões da semana', test: s => s.reviews >= 4 },
    { code: 'grounding', icon: '🖐️', title: 'Pés no chão', desc: 'Fez o exercício de aterramento 5-4-3-2-1', test: s => s.grounding },
    { code: 'checkin_7', icon: '💭', title: 'Autoconhecimento', desc: '7 check-ins de humor', test: s => s.checkins >= 7 },
    { code: 'checkin_30', icon: '📔', title: 'Diário da mente', desc: '30 check-ins de humor', test: s => s.checkins >= 30 },
    { code: 'tasks_10', icon: '📋', title: 'Fazedor', desc: '10 tarefas concluídas', test: s => s.tasksDone >= 10 },
    { code: 'tasks_100', icon: '🚀', title: 'Máquina de fazer', desc: '100 tarefas concluídas', test: s => s.tasksDone >= 100 },
    { code: 'hard_day', icon: '🌧️', title: 'Mesmo na chuva', desc: 'Cumpriu um hábito em um dia difícil', test: s => s.hardDay },
    { code: 'level_5', icon: '🌳', title: 'Planta jovem', desc: 'Chegou ao nível 5', test: s => s.level >= 5 },
    { code: 'level_10', icon: '🌲', title: 'Carvalho', desc: 'Chegou ao nível 10', test: s => s.level >= 10 },
    { code: 'quest_1', icon: '📜', title: 'Missão cumprida', desc: 'Resgatou sua primeira missão do dia', test: s => s.quests >= 1 },
    { code: 'quest_30', icon: '🗺️', title: 'Aventureiro', desc: '30 missões do dia resgatadas', test: s => s.quests >= 30 },
    { code: 'quest_100', icon: '🧭', title: 'Lenda das missões', desc: '100 missões do dia resgatadas', test: s => s.quests >= 100 },
    { code: 'chest_1', icon: '🧰', title: 'Caçador de tesouros', desc: 'Abriu seu primeiro baú', test: s => s.chests >= 1 },
    { code: 'chest_25', icon: '💰', title: 'Colecionador', desc: 'Abriu 25 baús', test: s => s.chests >= 25 },
    { code: 'legendary', icon: '👑', title: 'Sorte lendária', desc: 'Encontrou um baú lendário', test: s => s.legendary >= 1 },
    { code: 'perfect_1', icon: '🌟', title: 'Dia perfeito', desc: 'Fez todos os hábitos do dia', test: s => s.perfectDays >= 1 },
    { code: 'perfect_7', icon: '✨', title: 'Sete dias perfeitos', desc: '7 dias perfeitos', test: s => s.perfectDays >= 7 },
    { code: 'perfect_30', icon: '🌠', title: 'Constelação', desc: '30 dias perfeitos', test: s => s.perfectDays >= 30 },
    { code: 'combo_3', icon: '⚡', title: 'Combo!', desc: 'Fez 3 hábitos em sequência rápida', test: s => s.maxCombo >= 3 },
    { code: 'combo_6', icon: '💥', title: 'Imparável', desc: 'Combo de 6 hábitos', test: s => s.maxCombo >= 6 },
    { code: 'coins_1000', icon: '💰', title: 'Poupador', desc: 'Ganhou 1000 moedas no total', test: s => s.coinsEarned >= 1000 },
    { code: 'shop_1', icon: '🛍️', title: 'Primeira compra', desc: 'Comprou algo na loja', test: s => s.purchases >= 1 },
    { code: 'pomo_1', icon: '⏱️', title: 'Foco profundo', desc: 'Completou uma sessão de foco', test: s => s.pomodoros >= 1 },
    { code: 'pomo_25', icon: '🧠', title: 'Mente afiada', desc: '25 sessões de foco', test: s => s.pomodoros >= 25 },
    { code: 'habit_21', icon: '⛓️', title: 'Hábito de ferro', desc: '21 dias seguidos no mesmo hábito', test: s => s.habitBest >= 21 },
    { code: 'hrt_1', icon: '✋', title: 'Vontade não é ordem', desc: 'Sentiu vontade de coçar e não coçou', test: s => s.hrtNot >= 1 },
    { code: 'hrt_25', icon: '🙌', title: 'Mãos tranquilas', desc: '25 vontades de coçar vencidas', test: s => s.hrtNot >= 25 },
    { code: 'hrt_100', icon: '🧘', title: 'Pele em paz', desc: '100 vontades de coçar vencidas', test: s => s.hrtNot >= 100 },
    { code: 'hrt_300', icon: '🏅', title: 'Associação quebrada', desc: '300 vontades de coçar vencidas', test: s => s.hrtNot >= 300 },
    { code: 'hrt_sim_5', icon: '🎓', title: 'Ensaio geral', desc: '5 dias com simulação do treino anti-coçar', test: s => s.hrtSims >= 5 },
    { code: 'level_15', icon: '🏔️', title: 'Montanha', desc: 'Chegou ao nível 15', test: s => s.level >= 15 },
    { code: 'level_20', icon: '🌌', title: 'Infinito', desc: 'Chegou ao nível 20', test: s => s.level >= 20 }
  ];

  // Temas de cor (desbloqueáveis na loja)
  const THEMES = {
    raiz: { name: 'Raiz', icon: '🌱', price: 0, rgb: '52 211 153', rgb2: '16 185 129' },
    oceano: { name: 'Oceano', icon: '🌊', price: 200, rgb: '56 189 248', rgb2: '14 165 233' },
    lavanda: { name: 'Lavanda', icon: '💜', price: 200, rgb: '167 139 250', rgb2: '139 92 246' },
    por_do_sol: { name: 'Pôr do sol', icon: '🌅', price: 300, rgb: '251 146 60', rgb2: '249 115 22' },
    cereja: { name: 'Cereja', icon: '🌸', price: 300, rgb: '244 114 182', rgb2: '236 72 153' },
    ouro: { name: 'Ouro', icon: '👑', price: 600, rgb: '250 204 21', rgb2: '234 179 8' }
  };

  // Raridades dos baús
  const RARITY = [
    { name: 'Comum', cls: 'common', icon: '📦', coins: [10, 25], xp: 10 },
    { name: 'Raro', cls: 'rare', icon: '💠', coins: [30, 60], xp: 25 },
    { name: 'Épico', cls: 'epic', icon: '🔮', coins: [80, 130], xp: 50 },
    { name: 'Lendário', cls: 'legendary', icon: '👑', coins: [220, 300], xp: 100, freeze: true }
  ];

  const combo = { n: 0, last: 0, seen: new Set() };

  const G = {
    XP, COINS, ACH, MILESTONES, THEMES, RARITY,

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

    // ================================================================ hábitos
    reindex() {
      S.logMap = new Map();
      S.logs.forEach(l => S.logMap.set(l.habit_id + '|' + l.date, l.amount || 1));
      S.habitById = new Map(S.habits.map(h => [h.id, h]));
    },
    goalOf(h) { return Math.max(1, (h && h.daily_goal) || 1); },
    amount(habitId, date) { return S.logMap.get(habitId + '|' + date) || 0; },
    isDone(habitId, date) {
      const a = S.logMap.get(habitId + '|' + date);
      if (!a) return false;
      const h = S.habitById && S.habitById.get(habitId);
      return a >= G.goalOf(h);
    },
    isAvoid(h) { return h.kind ? h.kind === 'avoid' : PASSIVE.test(h.name); },
    isCounter(h) { return G.goalOf(h) > 1; },
    scheduledOn(h, date = U.today()) {
      return !h.days || !h.days.length || h.days.includes(U.dow(date));
    },
    daysLabel(h) {
      if (!h.days || !h.days.length || h.days.length === 7) return 'todo dia';
      const N = ['', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
      const s = [...h.days].sort().join(',');
      if (s === '1,2,3,4,5') return 'dias úteis';
      if (s === '6,7') return 'fim de semana';
      return [...h.days].sort().map(d => N[d]).join(' · ');
    },

    activeHabits() { return S.habits.filter(h => !h.archived).sort((a, b) => a.position - b.position); },
    isHardMode() { return S.profile && S.profile.hard_mode_date === U.today(); },
    // hábitos do dia (agendados para a data; no modo dia difícil, só os essenciais)
    visibleHabits(date = U.today()) {
      const all = G.activeHabits().filter(h => G.scheduledOn(h, date));
      if (date !== U.today() || !G.isHardMode()) return all;
      const ess = all.filter(h => h.essential);
      return ess.length ? ess : all.slice(0, 2);
    },
    doneToday() { const t = U.today(); return G.visibleHabits().filter(h => G.isDone(h.id, t)).length; },

    // dias "ativos" = pelo menos 1 hábito concluído, ou salvo por protetor
    activeDates() {
      const s = new Set();
      S.logs.forEach(l => { if (G.isDone(l.habit_id, l.date)) s.add(l.date); });
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
    // sequência de um hábito: dias agendados seguidos com ele feito (hoje pendente não quebra)
    habitStreak(h) {
      let k = U.today(), n = 0, guard = 0;
      if (!G.isDone(h.id, k)) k = U.addDays(k, -1);
      while (guard++ < 1500) {
        if (G.scheduledOn(h, k)) { if (!G.isDone(h.id, k)) break; n++; }
        k = U.addDays(k, -1);
        if (k < (h.created_at || '2000').slice(0, 10) && !G.isDone(h.id, k)) break;
      }
      return n;
    },
    habitBest(h) {
      const dates = S.logs.filter(l => l.habit_id === h.id && G.isDone(h.id, l.date)).map(l => l.date).sort();
      if (!dates.length) return 0;
      let best = 0, cur = 0, k = dates[0];
      const last = U.today();
      while (k <= last) {
        if (G.isDone(h.id, k)) { cur++; best = Math.max(best, cur); }
        else if (G.scheduledOn(h, k) && k !== last) cur = 0;
        k = U.addDays(k, 1);
      }
      return best;
    },
    perfectDays() {
      const byDate = {};
      S.logs.forEach(l => { (byDate[l.date] = byDate[l.date] || []).push(l.habit_id); });
      let n = 0;
      Object.keys(byDate).forEach(d => {
        const vis = G.activeHabits().filter(h => G.scheduledOn(h, d) && (h.created_at || '').slice(0, 10) <= d);
        if (vis.length >= 2 && vis.every(h => G.isDone(h.id, d))) n++;
      });
      return n;
    },

    // ================================================================ moedas, ajustes sincronizados e dia
    settings() { return S.profile.settings || (S.profile.settings = {}); },
    stat(k) { return (G.settings().stats || {})[k] || 0; },
    async saveSettings(patch) {
      const s = Object.assign({}, G.settings(), patch);
      try { await DB.updateProfile({ settings: s }); } catch (e) { console.error(e); }
    },
    async bumpStat(k, n = 1, max = false) {
      const stats = Object.assign({}, G.settings().stats || {});
      stats[k] = max ? Math.max(stats[k] || 0, n) : (stats[k] || 0) + n;
      await G.saveSettings({ stats });
    },

    daily() {
      const d = S.profile.daily || {};
      if (d.date === U.today()) return d;
      return { date: U.today(), claimed: [], chest: false, gift: false, perfect: false, flags: {},
        loginStreak: d.date === U.addDays(U.today(), -1) ? (d.loginStreak || 1) + 1 : 1 };
    },
    async saveDaily(patch) {
      const d = Object.assign({}, G.daily(), patch);
      try { await DB.updateProfile({ daily: d }); } catch (e) { console.error(e); }
      return d;
    },
    flagged(name) { return !!(G.daily().flags || {})[name]; },
    async flag(name, n = true) {
      const d = G.daily();
      const flags = Object.assign({}, d.flags || {});
      flags[name] = typeof n === 'number' ? (flags[name] || 0) + n : n;
      await G.saveDaily({ flags });
      App.refreshLive && App.refreshLive();
    },

    // Recompensa única: XP + moedas, com animação e um só salvamento
    async reward({ xp = 0, coins = 0, el = null, quiet = false } = {}) {
      if (!xp && !coins) return;
      const before = G.level(S.profile.xp).level;
      const patch = {};
      if (xp) patch.xp = Math.max(0, S.profile.xp + xp);
      if (coins) patch.coins = Math.max(0, (S.profile.coins || 0) + coins);
      if (el && !quiet) {
        if (xp) U.floatXp(el, xp);
        if (coins > 0) setTimeout(() => U.floatText(el, `+${coins} 💰`, 'coin'), 180);
      }
      const prevCoins = S.profile.coins || 0;
      try { await DB.updateProfile(patch); } catch (e) { console.error(e); }
      if (coins > 0) { G.bumpStat('coinsEarned', coins); App.pulseCoins && App.pulseCoins(prevCoins); }
      const after = G.level(S.profile.xp).level;
      if (after > before) G.celebrateLevel(after);
      App.refreshHeader();
    },
    addXp(n, el) { return G.reward({ xp: n, el }); },

    celebrateLevel(level) {
      U.play('level'); U.vibrate([40, 50, 40, 50, 80]);
      U.confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
      setTimeout(() => U.confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 300);
      setTimeout(() => U.confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 450);
      const coins = COINS.level;
      DB.updateProfile({ coins: (S.profile.coins || 0) + coins }).catch(console.error);
      U.modal(`
        <div class="celebrate level-up">
          <div class="lvl-burst"><div class="lvl-num">${level}</div></div>
          <p class="eyebrow">Subiu de nível!</p>
          <h2>${U.esc(G.title(level))}</h2>
          <div class="reward-row"><span>+${coins} 💰</span></div>
          <p class="muted">Cada pequena escolha está construindo quem você quer ser.</p>
          <button class="btn primary block big" data-close>Continuar</button>
        </div>`, { cls: 'small' });
    },

    // ================================================================ combo e dia perfeito
    // Chamado a cada hábito concluído; devolve o combo atual
    bumpCombo(key) {
      const now = Date.now();
      if (combo.seen.has(key)) return 0;
      combo.seen.add(key);
      combo.n = now - combo.last < 3 * 60000 ? combo.n + 1 : 1;
      combo.last = now;
      if (combo.n > G.stat('maxCombo')) G.bumpStat('maxCombo', combo.n, true);
      return combo.n;
    },
    comboBonus(n) { return n >= 2 ? Math.min(10, (n - 1) * 2) : 0; },

    async checkPerfectDay() {
      const vis = G.visibleHabits(), t = U.today();
      if (vis.length < 2 || !vis.every(h => G.isDone(h.id, t))) return false;
      if (G.daily().perfect) return false;
      await G.saveDaily({ perfect: true });
      setTimeout(() => {
        U.play('perfect'); U.vibrate([30, 40, 30, 40, 120]);
        U.confetti({ particleCount: 220, spread: 140, origin: { y: 0.6 } });
        U.modal(`
          <div class="celebrate perfect">
            <div class="celebrate-icon">🌟</div>
            <p class="eyebrow">Dia perfeito</p>
            <h2>Todos os hábitos de hoje!</h2>
            <div class="reward-row"><span>+${XP.perfect} XP</span><span>+${COINS.perfect} 💰</span></div>
            <p class="muted">Isso é o que constância parece. Aproveite essa sensação: foi você que construiu.</p>
            <button class="btn primary block big" data-close>Continuar</button>
          </div>`, { cls: 'small' });
      }, 500);
      await G.reward({ xp: XP.perfect, coins: COINS.perfect, quiet: true });
      return true;
    },

    // ================================================================ missões do dia
    QUESTS: [
      { id: 'habits', icon: '✅', xp: 15, coins: 10, make: n => ({ target: n, title: `Conclua ${n} hábitos` }),
        n: () => Math.max(1, Math.min(4, Math.ceil(G.visibleHabits().length * 0.6))), ok: () => G.visibleHabits().length >= 2,
        progress: () => G.doneToday() },
      { id: 'early', icon: '🌅', xp: 15, coins: 12, make: () => ({ target: 1, title: 'Conclua um hábito antes das 11h' }),
        ok: () => U.hour() < 11, progress: () => S.logs.some(l => l.date === U.today() && l.created_at && new Date(l.created_at).getHours() < 11 && G.isDone(l.habit_id, l.date)) ? 1 : 0 },
      { id: 'checkin', icon: '💭', xp: 10, coins: 6, make: () => ({ target: 1, title: 'Faça um check-in de humor' }),
        progress: () => S.moods.some(m => m.date === U.today()) ? 1 : 0 },
      { id: 'meditate', icon: '🧘', xp: 15, coins: 10, make: () => ({ target: 5, title: 'Medite 5 minutos' }),
        progress: () => S.meds.filter(m => m.date === U.today()).reduce((a, m) => a + m.minutes, 0) },
      { id: 'tasks', icon: '📋', xp: 10, coins: 8, make: () => ({ target: 2, title: 'Conclua 2 tarefas' }),
        progress: () => S.tasks.filter(t => t.done && t.done_at && U.dateKey(new Date(t.done_at)) === U.today()).length },
      { id: 'journal', icon: '✍️', xp: 15, coins: 10, make: () => ({ target: 1, title: 'Faça uma escrita terapêutica' }),
        progress: () => S.journal.some(j => j.date === U.today()) ? 1 : 0 },
      { id: 'breath', icon: '🌬️', xp: 10, coins: 6, make: () => ({ target: 1, title: 'Faça um exercício de respiração' }),
        progress: () => G.flagged('breath') ? 1 : 0 },
      { id: 'focus', icon: '⏱️', xp: 20, coins: 12, make: () => ({ target: 1, title: 'Faça uma sessão de foco profundo' }),
        progress: () => G.flagged('pomodoro') ? 1 : 0 },
      { id: 'start', icon: '🚀', xp: 15, coins: 10, make: () => ({ target: 1, title: 'Use "Começar agora" e volte com "Consegui"' }),
        ok: () => G.visibleHabits().some(h => !G.isAvoid(h)), progress: () => G.flagged('focusDone') ? 1 : 0 },
      { id: 'weekfocus', icon: '🎯', xp: 15, coins: 10, make: () => ({ target: 1, title: 'Faça o seu foco da semana' }),
        ok: () => { const f = P.weeklyFocusId(); return !!f && G.visibleHabits().some(h => h.id === f); },
        progress: () => G.isDone(P.weeklyFocusId(), U.today()) ? 1 : 0 },
      { id: 'perfect', icon: '🌟', xp: 25, coins: 15, make: () => ({ target: 1, title: 'Tenha um dia perfeito' }),
        ok: () => G.visibleHabits().length >= 2 && G.visibleHabits().length <= 6, progress: () => G.daily().perfect ? 1 : 0 },
      { id: 'hrt', icon: '✋', xp: 15, coins: 10, make: () => ({ target: 3, title: 'Perceba 3 vontades de coçar e faça a resposta' }),
        ok: () => H.logs(30).length > 0, progress: () => H.today().filter(i => H.outcome(i) !== 'scratched').length },
      { id: 'hrtnight', icon: '🌙', xp: 15, coins: 10, make: () => ({ target: 3, title: 'À noite: faça 3 checagens "como estão minhas mãos?"' }),
        ok: () => H.cfg().night, progress: () => (G.daily().flags || {}).hrtChecks || 0 },
      { id: 'hrtsim', icon: '🎓', xp: 10, coins: 8, make: () => ({ target: 1, title: 'Faça uma simulação do treino anti-coçar' }),
        progress: () => G.flagged('hrtSim') ? 1 : 0 },
      { id: 'plan', icon: '🛡️', xp: 10, coins: 6, make: () => ({ target: 1, title: 'Releia seu plano anti-impulso' }),
        ok: () => P.plans().length > 0, progress: () => G.flagged('planRead') ? 1 : 0 }
    ],
    quests() {
      const t = U.today();
      const rnd = U.seeded((S.user ? S.user.id : '') + t);
      const d = G.daily();
      const pool = G.QUESTS.filter(q => d.claimed.includes(q.id) || !q.ok || q.ok());
      // "hábitos" sempre aparece; as outras são sorteadas de forma estável no dia
      const fixed = pool.filter(q => q.id === 'habits');
      const rest = pool.filter(q => q.id !== 'habits').map(q => ({ q, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.q);
      // missões já resgatadas continuam na lista mesmo se deixarem de valer
      const pick = fixed.concat(rest).slice(0, 3);
      return pick.map(q => {
        const meta = q.make(q.n ? q.n() : null);
        const prog = Math.min(meta.target, q.progress());
        return { id: q.id, icon: q.icon, xp: q.xp, coins: q.coins, ...meta, prog, done: prog >= meta.target, claimed: d.claimed.includes(q.id) };
      });
    },
    questsReady() { return G.quests().filter(q => q.done && !q.claimed).length; },
    async claimQuest(id, el) {
      const q = G.quests().find(x => x.id === id);
      const d = G.daily();
      if (!q || !q.done || d.claimed.includes(id)) return;
      U.play('coin'); U.vibrate([15, 30, 15]);
      U.confettiAt(el, { particleCount: 35, colors: ['#fbbf24', '#fde68a', '#f59e0b'] });
      await G.saveDaily({ claimed: d.claimed.concat(id) });
      G.bumpStat('quests');
      await G.reward({ xp: q.xp, coins: q.coins, el });
      App.render();
      if (G.quests().every(x => x.claimed)) setTimeout(() => G.openChest('quests'), 700);
      G.checkAchievements();
    },

    // ================================================================ baús
    rollRarity(boost = 0) {
      const r = Math.random() * 100 - boost;
      return r < 1 ? 3 : r < 8 ? 2 : r < 30 ? 1 : 0;
    },
    // source: 'quests' (todas as missões), 'gift' (presente do dia), 'shop'
    openChest(source = 'quests') {
      const d = G.daily();
      if (source === 'quests' && d.chest) return;
      if (source === 'gift' && d.gift) return;
      const boost = source === 'gift' ? Math.min(12, (d.loginStreak || 1) * 1.5) - 6 : source === 'quests' ? 4 : 0;
      const tier = G.rollRarity(boost);
      const R = RARITY[tier];
      let coins = U.rand(R.coins[0], R.coins[1]);
      if (source === 'gift') coins = Math.max(5, Math.round(coins * 0.5) + Math.min(20, (d.loginStreak || 1) * 2));
      const xp = source === 'gift' ? Math.round(R.xp / 2) : R.xp;
      const freeze = R.freeze && (S.profile.freezes || 0) < 3;
      let taps = 0, opened = false;
      // marca já para não abrir duas vezes
      G.saveDaily(source === 'quests' ? { chest: true } : source === 'gift' ? { gift: true } : {});

      const m = U.modal(`
        <div class="chest-wrap" id="chW">
          <p class="eyebrow">${source === 'gift' ? `🎁 Presente do dia${(d.loginStreak || 1) > 1 ? ` · ${d.loginStreak} dias seguidos` : ''}` : source === 'quests' ? '🏆 Missões do dia completas' : 'Baú'}</p>
          <h2 id="chTitle">Toque no baú para abrir</h2>
          <button class="chest" id="chest" aria-label="Abrir baú"><span class="chest-emoji">${source === 'gift' ? '🎁' : '🧰'}</span><span class="chest-glow"></span></button>
          <div class="chest-taps"><i></i><i></i><i></i></div>
          <div id="chReward" class="chest-reward" hidden></div>
        </div>`, { cls: 'small chest-modal', dismissable: false });
      const $ = s => m.el.querySelector(s);
      $('#chest').onclick = async () => {
        if (opened) return;
        taps++;
        m.el.querySelectorAll('.chest-taps i').forEach((x, i) => x.classList.toggle('on', i < taps));
        const ch = $('#chest');
        ch.classList.remove('shake'); void ch.offsetWidth; ch.classList.add('shake');
        U.play('chestShake'); U.vibrate(25);
        if (taps < 3) return;
        opened = true;
        ch.classList.add('open', R.cls);
        U.play('chestOpen', tier); U.vibrate(tier >= 2 ? [40, 40, 40, 40, 120] : [30, 30, 60]);
        U.confetti({ particleCount: 60 + tier * 70, spread: 80 + tier * 20, origin: { y: 0.45 },
          colors: tier === 3 ? ['#fbbf24', '#fde68a', '#f59e0b', '#fff'] : tier === 2 ? ['#a78bfa', '#c084fc', '#f0abfc'] : tier === 1 ? ['#38bdf8', '#7dd3fc', '#a5f3fc'] : undefined });
        $('#chTitle').innerHTML = `<span class="rarity ${R.cls}">${R.icon} ${R.name}</span>`;
        const box = $('#chReward');
        box.hidden = false;
        box.innerHTML = `
          <div class="reward-row big"><span><b id="chCoins">0</b> 💰</span><span>+${xp} XP</span></div>
          ${freeze ? '<p class="gold-text">🛡️ + 1 protetor de sequência!</p>' : ''}
          <button class="btn primary block big" data-close>Pegar</button>`;
        U.countUp($('#chCoins'), 0, coins, 900);
        setTimeout(() => U.play('coins'), 250);
        const patch = {};
        if (freeze) patch.freezes = (S.profile.freezes || 0) + 1;
        if (Object.keys(patch).length) DB.updateProfile(patch).catch(console.error);
        G.bumpStat('chests');
        if (tier === 3) G.bumpStat('legendary');
        await G.reward({ xp, coins, quiet: true });
        App.render();
        G.checkAchievements();
      };
    },

    // ================================================================ loja
    shopItems() {
      const unlocked = G.settings().unlocked || [];
      const items = [{
        id: 'freeze', icon: '🛡️', name: 'Protetor de sequência', desc: `Salva sua sequência se você falhar um dia. Você tem ${S.profile.freezes || 0}/3.`,
        price: 150, owned: false, disabled: (S.profile.freezes || 0) >= 3
      }];
      Object.entries(THEMES).filter(([, t]) => t.price).forEach(([id, t]) => items.push({
        id: 'theme:' + id, icon: t.icon, name: `Tema ${t.name}`, desc: 'Muda a cor do app inteiro.', price: t.price,
        owned: unlocked.includes(id), swatch: t.rgb
      }));
      return items;
    },
    themeUnlocked(id) { return id === 'raiz' || (G.settings().unlocked || []).includes(id); },
    async buy(id) {
      const item = G.shopItems().find(i => i.id === id);
      if (!item || item.owned || item.disabled) return;
      if ((S.profile.coins || 0) < item.price) {
        U.play('error'); U.vibrate([20, 40, 20]);
        U.toast(`Faltam <b>${item.price - S.profile.coins} 💰</b>. Complete missões e abra baús para juntar mais.`, 'error');
        return;
      }
      const patch = { coins: S.profile.coins - item.price };
      if (id === 'freeze') patch.freezes = (S.profile.freezes || 0) + 1;
      try { await DB.updateProfile(patch); } catch (e) { console.error(e); U.toast('Erro ao comprar.', 'error'); return; }
      if (id.startsWith('theme:')) {
        const t = id.slice(6);
        await G.saveSettings({ unlocked: (G.settings().unlocked || []).concat(t) });
        App.setAccent(t);
      }
      G.bumpStat('purchases');
      U.play('coins'); U.vibrate([20, 30, 60]);
      U.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      U.toast(`${item.icon} <b>${U.esc(item.name)}</b> é seu!`, 'gold');
      App.render();
      G.checkAchievements();
    },

    // ================================================================ pontos da semana
    weekPoints(ws) {
      const we = U.addDays(ws, 6), inW = d => d >= ws && d <= we;
      let p = 0;
      S.logs.forEach(l => { if (inW(l.date) && G.isDone(l.habit_id, l.date)) p += XP.habit; });
      S.tasks.forEach(t => { if (t.done && t.done_at && inW(U.dateKey(new Date(t.done_at)))) p += XP.task; });
      S.impulses.forEach(i => { if (inW(i.date)) p += i.resisted ? XP.resisted : XP.slip; });
      S.meds.forEach(m => { if (inW(m.date)) p += XP.medBase + m.minutes; });
      S.journal.forEach(j => { if (inW(j.date)) p += XP.journal; });
      S.moods.forEach(m => { if (inW(m.date)) p += XP.checkin; });
      return p;
    },

    stats() {
      const lv = G.level(S.profile.xp);
      return {
        habitTotal: S.logs.filter(l => G.isDone(l.habit_id, l.date)).length,
        best: Math.max(S.profile.best_streak || 0, G.streak()),
        weekGoal: G.activeHabits().some(h => G.weekCount(h.id) >= h.target_per_week),
        resisted: S.impulses.filter(i => i.resisted && i.kind !== 'Coçar').length,
        slips: S.impulses.filter(i => !i.resisted).length,
        medSessions: S.meds.length,
        medMinutes: S.meds.reduce((a, m) => a + m.minutes, 0),
        checkins: S.moods.length,
        tasksDone: S.tasks.filter(t => t.done).length,
        returns: S.meds.reduce((a, m) => a + (m.returns || 0), 0),
        journal: S.journal.length,
        freeDays: Math.max(0, ...S.goals.filter(g => g.kind === 'days' && !g.archived).map(g => Math.max(g.best || 0, G.goalDays(g)))),
        goalsDone: S.goals.filter(g => g.kind === 'count' && g.completed_at).length,
        plans: (S.profile.if_then || []).length,
        reviews: (S.reviews || []).length,
        hardDay: S.flags.hardDay,
        grounding: S.flags.grounding,
        level: lv.level,
        quests: G.stat('quests'),
        chests: G.stat('chests'),
        legendary: G.stat('legendary'),
        maxCombo: G.stat('maxCombo'),
        coinsEarned: G.stat('coinsEarned'),
        purchases: G.stat('purchases'),
        pomodoros: G.stat('pomodoros'),
        perfectDays: G.perfectDays(),
        habitBest: Math.max(0, ...G.activeHabits().map(h => G.habitStreak(h))),
        hrtNot: S.impulses.filter(i => i.kind === 'Coçar' && i.resisted).length,
        hrtSims: G.stat('hrtSims')
      };
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
      if (streak > 1) {
        setTimeout(() => {
          U.play('streak');
          App.flameBurst && App.flameBurst(streak);
        }, 450);
      }
      if ([3, 7, 14, 21, 30, 50, 66, 100, 150, 200, 365].includes(streak)) {
        setTimeout(() => U.toast(`🔥 <b>${streak} dias seguidos!</b> Continue assim.`, 'gold'), 1200);
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
        U.play('achievement'); U.vibrate([20, 40, 20, 40, 60]);
        U.confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
        U.toast(`<span class="toast-ach">${a.icon}</span><div><b>Conquista desbloqueada!</b><br>${U.esc(a.title)} · +${XP.achievement} XP · +${COINS.achievement} 💰</div>`, 'achievement', { ms: 4500 });
      }, 900 + i * 1700));
      await G.reward({ xp: XP.achievement * fresh.length, coins: COINS.achievement * fresh.length, quiet: true });
      if (S.tab === 'progresso') App.render();
    }
  };

  window.G = G;
})();
