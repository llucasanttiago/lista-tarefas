// Controlador principal: autenticação, navegação e ações.
(function () {
  const $ = s => document.querySelector(s);
  const busy = new Set();
  let lastDay = U.today();

  function show(id) {
    ['#splash', '#setup', '#auth', '#app'].forEach(s => { $(s).hidden = s !== id; });
  }

  const App = {
    render() {
      if (!S.profile) return;
      const view = $('#view');
      const fn = V[S.tab] || V.hoje;
      const y = window.scrollY;
      // preserva o que estava sendo digitado
      const act = document.activeElement;
      const keep = act && act.id && view.contains(act) && /INPUT|TEXTAREA/.test(act.tagName) ? { id: act.id, v: act.value, s: act.selectionStart } : null;
      view.innerHTML = fn();
      if (keep) {
        const el = document.getElementById(keep.id);
        if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch { /* ignore */ } }
      }
      document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
      // bolinha na aba Hoje quando há missão pronta para resgatar
      const dot = document.querySelector('.tabbar [data-tab="hoje"]');
      if (dot) dot.classList.toggle('badge', G.questsReady() > 0 || !G.daily().gift);
      window.scrollTo(0, y);
    },
    refreshHeader() {
      document.querySelectorAll('#lvlCard').forEach(el => { el.outerHTML = V.header(); });
      document.querySelectorAll('[data-coins]').forEach(el => { el.textContent = S.profile.coins || 0; });
      document.querySelectorAll('[data-xpbar]').forEach(el => {
        const lv = G.level(S.profile.xp);
        el.style.width = (lv.into / lv.need * 100).toFixed(1) + '%';
      });
    },
    // Atualiza só os pedaços que dependem do relógio (sem redesenhar a tela)
    refreshLive() {
      document.querySelectorAll('[data-countdown]').forEach(el => {
        const end = new Date(); end.setHours(24, 0, 0, 0);
        const m = Math.max(0, Math.round((end - Date.now()) / 60000));
        el.textContent = `${Math.floor(m / 60)}h${U.pad(m % 60)}`;
      });
    },
    pulseCoins(from) {
      document.querySelectorAll('[data-coins]').forEach(el => {
        U.countUp(el, from, S.profile.coins || 0, 600);
        const chip = el.closest('.top-chip'); if (chip) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
      });
    },
    flameBurst(n) {
      const chip = document.querySelector('.top-chip.flame');
      if (chip) { chip.classList.remove('burst'); void chip.offsetWidth; chip.classList.add('burst'); }
      U.toast(`🔥 <b>${n} dias seguidos!</b> Sequência mantida.`, 'gold', { ms: 2600 });
    },
    go(tab) {
      if (S.tab === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      S.tab = tab;
      U.store.set('raiz-tab', tab);
      U.play('tap');
      App.render();
      window.scrollTo(0, 0);
    },

    // ---------------------------------------------------------------- Tema
    applyTheme() {
      const mode = U.pref('theme', 'dark');
      const dark = mode === 'auto' ? !window.matchMedia('(prefers-color-scheme: light)').matches : mode !== 'light';
      const root = document.documentElement;
      root.dataset.theme = dark ? 'dark' : 'light';
      let accent = U.pref('accent', 'raiz');
      if (!S.profile || !G.themeUnlocked(accent) || !G.THEMES[accent]) accent = 'raiz';
      const t = G.THEMES[accent];
      root.style.setProperty('--accent-rgb', t.rgb);
      root.style.setProperty('--accent2-rgb', t.rgb2);
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.content = dark ? '#0b1020' : '#f4f6fb';
    },
    syncHrtButton() {
      const b = document.getElementById('hrtBtn');
      if (b) b.hidden = !H.cfg().button;
    },
    setAccent(id) {
      if (!G.themeUnlocked(id)) return;
      U.setPref('accent', id);
      App.applyTheme();
      U.play('pop');
    },

    // ---------------------------------------------------------------- Hábitos
    // Núcleo: muda a quantidade feita de um hábito num dia (0 = não feito).
    async setAmount(id, amount, { el = null, silent = false, date = U.today(), undoable = true } = {}) {
      const h = S.habitById.get(id);
      if (!h || busy.has(id)) return;
      const goal = G.goalOf(h);
      amount = G.isCounter(h) ? Math.max(0, Math.min(goal * 5, amount)) : Math.max(0, Math.min(1, amount));
      const prev = G.amount(id, date);
      if (prev === amount) return;
      const wasDone = prev >= goal, isDone = amount >= goal;
      const isToday = date === U.today();
      const hadActive = G.activeDates().has(date);
      const snapshot = S.logs.slice();
      const old = S.logs.find(l => l.habit_id === id && l.date === date);
      busy.add(id);

      S.logs = S.logs.filter(l => l !== old);
      if (amount > 0) S.logs.push({ habit_id: id, date, amount, created_at: old ? old.created_at : new Date().toISOString() });
      G.reindex();

      const anchor = el && (el.querySelector('.check, .count-btn') || el);
      let comboN = 0;
      if (!wasDone && isDone) {
        if (isToday) comboN = G.bumpCombo(id + '|' + date);
        if (!silent) {
          const n = G.visibleHabits(date).filter(x => G.isDone(x.id, date)).length - 1;
          U.play('done', n); U.vibrate(25);
          U.confettiAt(anchor);
        }
      } else if (amount > prev && !silent) { U.play('step', amount); U.vibrate(10); }
      else if (wasDone && !isDone && !silent) { U.play('undo'); U.vibrate(8); }
      App.render();

      try {
        if (amount === 0) await DB.remove('habit_logs', { habit_id: id, date });
        else if (!old) await DB.insert('habit_logs', { habit_id: id, date, amount, user_id: S.user.id });
        else if (DB.v5) {
          const { error } = await DB.client.from('habit_logs').update({ amount }).eq('habit_id', id).eq('date', date);
          if (error) throw error;
        }
      } catch (e) {
        console.error(e);
        S.logs = snapshot; G.reindex(); App.render();
        U.play('error');
        U.toast('Não consegui salvar. Verifique sua conexão.', 'error');
        busy.delete(id);
        return;
      }
      busy.delete(id);

      if (wasDone !== isDone) {
        const sign = isDone ? 1 : -1;
        const bonus = isDone ? G.comboBonus(comboN) : 0;
        if (comboN >= 2 && !silent) {
          setTimeout(() => { U.play('combo', comboN); U.floatText(anchor, `Combo x${comboN}! +${bonus}`, 'combo'); }, 260);
        }
        await G.reward({ xp: sign * G.XP.habit + bonus, coins: sign * G.COINS.habit, el: anchor, quiet: silent });
      }

      if (wasDone && !isDone) {
        if (!silent && undoable) {
          U.toast(`${U.esc(h.icon)} Desmarcado`, 'info', { action: 'Desfazer', onAction: () => App.setAmount(id, prev, { date, silent: true }) });
        }
        App.render();
        return;
      }
      if (!wasDone && isDone) {
        if (isToday && !hadActive) await G.onDayActivated();
        if (!isToday) {
          const best = Math.max(S.profile.best_streak || 0, G.streak());
          if (best !== S.profile.best_streak) DB.updateProfile({ best_streak: best }).catch(console.error);
        }
        if (isToday && G.isHardMode()) S.flags.hardDay = true;
        if (isToday) await G.checkPerfectDay();
      }
      App.render();
      await G.checkAchievements();
    },

    // Toque no hábito: conta +1 (hábitos com quantidade) ou marca/desmarca
    toggleHabit(id, el, silent = false, date = U.today()) {
      const h = S.habitById.get(id); if (!h) return;
      const cur = G.amount(id, date), goal = G.goalOf(h);
      if (G.isCounter(h)) return App.setAmount(id, cur >= goal ? 0 : cur + 1, { el, silent, date });
      return App.setAmount(id, cur >= goal ? 0 : goal, { el, silent, date });
    },
    decHabit(id, el, date = U.today()) {
      const cur = G.amount(id, date);
      if (cur > 0) return App.setAmount(id, cur - 1, { el, date, undoable: false });
    },
    // Garante que está feito (usado por meditação, escrita, foco…)
    completeHabit(id, el, silent = false) {
      const h = S.habitById.get(id);
      if (!h || G.isDone(id, U.today())) return;
      return App.setAmount(id, G.goalOf(h), { el, silent });
    },

    // Marca (sem festa extra) o 1º hábito do dia que combine com o nome/ícone. Retorna o nome.
    async autoMark(re, icon) {
      const list = G.visibleHabits();
      const h = list.find(x => re.test(x.name)) || list.find(x => x.icon === icon);
      if (!h || G.isDone(h.id, U.today())) return null;
      await App.completeHabit(h.id, null, true);
      return G.isDone(h.id, U.today()) ? h.name : null;
    },

    // ---------------------------------------------------------------- Metas
    async incGoal(id, el) {
      const g = S.goals.find(x => x.id === id);
      if (!g || g.completed_at || busy.has(id)) return;
      busy.add(id);
      const current = g.current + 1;
      const done = current >= g.target;
      const patch = { current, completed_at: done ? new Date().toISOString() : null };
      try { Object.assign(g, await DB.update('goals', id, patch)); }
      catch (e) { console.error(e); U.toast('Erro ao salvar.', 'error'); busy.delete(id); return; }
      busy.delete(id);
      if (done) {
        U.play('level'); U.confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 } });
        U.toast(`🏁 <b>Meta cumprida!</b> ${U.esc(g.title)}`, 'gold');
        await G.addXp(G.XP.goalDone, el);
      } else {
        U.play('task'); U.vibrate(10); U.confettiAt(el, { particleCount: 20 });
        await G.addXp(G.XP.goalStep, el);
      }
      App.render();
      G.checkAchievements();
    },

    resetGoal(id) {
      const g = S.goals.find(x => x.id === id);
      if (!g) return;
      const d = G.goalDays(g);
      const best = Math.max(g.best || 0, d);
      const m = U.modal(`
        <div class="celebrate">
          <div class="celebrate-icon">🌱</div>
          <h2>Recomeçar faz parte.</h2>
          <p class="muted">Você ficou <b>${d} ${d === 1 ? 'dia' : 'dias'}</b> livre, e isso não se apaga: seu cérebro aprendeu com cada um deles.${best > 0 ? ` Seu recorde de <b>${best} dias</b> continua salvo.` : ''}</p>
          <p class="muted">Quase todo mundo que muda um hábito tem deslizes no caminho. O que importa é voltar. Se quiser, registre o que aconteceu na escrita terapêutica.</p>
          <button class="btn primary block" id="rsYes">Recomeçar a partir de hoje</button>
          <button class="btn ghost block" data-close>Cancelar</button>
        </div>`, { cls: 'small' });
      m.el.querySelector('#rsYes').onclick = async () => {
        try {
          Object.assign(g, await DB.update('goals', id, { best, start_date: U.today(), resets: (g.resets || 0) + 1, milestone: 0 }));
          m.close(); App.render();
          U.toast('🌱 Dia 1 começa agora. Você consegue.', 'success');
        } catch (e) { console.error(e); U.toast('Erro ao salvar.', 'error'); }
      };
    },

    // Comemora marcos (1, 3, 7, 14, 30… dias) das metas "dias livre"
    async checkGoalMilestones() {
      for (const g of S.goals.filter(x => x.kind === 'days' && !x.archived)) {
        const d = G.goalDays(g);
        const ms = G.lastMilestone(d);
        if (ms > (g.milestone || 0)) {
          const patch = { milestone: ms };
          if (d > (g.best || 0)) patch.best = d;
          try { Object.assign(g, await DB.update('goals', g.id, patch)); } catch (e) { console.error(e); continue; }
          setTimeout(() => {
            U.play('achievement');
            U.confetti({ particleCount: 150, spread: 100, origin: { y: 0.45 } });
            U.toast(`${U.esc(g.icon)} <div><b>${ms} ${ms === 1 ? 'dia' : 'dias'}!</b><br>${U.esc(g.title)}</div>`, 'achievement');
          }, 1200);
          await G.addXp(G.XP.milestone);
        }
      }
    },

    async moveHabitUp(id) {
      const hs = G.activeHabits();
      const i = hs.findIndex(h => h.id === id);
      if (i <= 0) return;
      const a = hs[i], b = hs[i - 1];
      const pa = a.position, pb = b.position === pa ? pa - 1 : b.position;
      a.position = pb; b.position = pa;
      App.render();
      try { await Promise.all([DB.update('habits', a.id, { position: a.position }), DB.update('habits', b.id, { position: b.position })]); }
      catch (e) { console.error(e); U.toast('Erro ao reordenar.', 'error'); }
    },

    // ---------------------------------------------------------------- Tarefas
    async addTask(text, opts = {}) {
      let date = opts.date || (V.ui.taskDate === 'amanha' ? U.addDays(U.today(), 1) : U.today());
      let priority = opts.priority != null ? opts.priority : (V.ui.taskPrio ? 1 : 0);
      text = text.trim();
      // atalho: "!" no começo = prioridade
      if (text.startsWith('!')) { priority = 1; text = text.replace(/^!+\s*/, ''); }
      if (!text) return;
      try {
        const row = await DB.insert('tasks', { text, date, priority, user_id: S.user.id });
        if (row.priority === undefined) row.priority = 0;
        S.tasks.push(row);
        U.play('pop'); U.vibrate(8);
        V.ui.taskPrio = false;
        App.render();
        const inp = $('#taskInput'); if (inp) inp.focus();
      } catch (e) { console.error(e); U.play('error'); U.toast('Erro ao adicionar tarefa.', 'error'); }
    },
    async toggleTask(id, el) {
      const task = S.tasks.find(x => x.id === id);
      if (!task || busy.has(id)) return;
      busy.add(id);
      const done = !task.done;
      task.done = done;
      task.done_at = done ? new Date().toISOString() : null;
      if (done) { U.play('task'); U.vibrate(12); U.confettiAt(el, { particleCount: 25 }); }
      else U.play('undo');
      App.render();
      try {
        const r = await DB.update('tasks', id, { done, done_at: task.done_at });
        if (r) Object.assign(task, r);
      } catch (e) {
        console.error(e); task.done = !done; App.render();
        U.toast('Erro ao salvar tarefa.', 'error'); busy.delete(id); return;
      }
      busy.delete(id);
      await G.reward({ xp: done ? G.XP.task : -G.XP.task, coins: done ? G.COINS.task : -G.COINS.task, el });
      App.render();
      if (done) await G.checkAchievements();
    },
    async deleteTask(id) {
      const task = S.tasks.find(x => x.id === id);
      if (!task) return;
      S.tasks = S.tasks.filter(x => x.id !== id);
      App.render();
      try {
        await DB.remove('tasks', { id });
        if (task.done) await G.reward({ xp: -G.XP.task, coins: -G.COINS.task });
        U.toast('Tarefa apagada', 'info', {
          action: 'Desfazer', onAction: async () => {
            try {
              const rest = { ...task }; delete rest.id; delete rest.created_at;
              const row = await DB.insert('tasks', rest);
              S.tasks.push(row); App.render();
              if (task.done) await G.reward({ xp: G.XP.task, coins: G.COINS.task });
            } catch (e) { console.error(e); U.toast('Não consegui restaurar.', 'error'); }
          }
        });
      } catch (e) { console.error(e); S.tasks.push(task); App.render(); U.toast('Erro ao apagar.', 'error'); }
    },
    async patchTask(id, patch) {
      const task = S.tasks.find(x => x.id === id);
      if (!task) return;
      const before = { ...task };
      Object.assign(task, patch);
      App.render();
      try { const r = await DB.update('tasks', id, patch); if (r) Object.assign(task, r); }
      catch (e) { console.error(e); Object.assign(task, before); App.render(); U.toast('Erro ao salvar tarefa.', 'error'); }
    },
    async clearDoneTasks() {
      const done = S.tasks.filter(t => t.done && t.date <= U.today());
      if (!done.length || !confirm(`Apagar ${U.plural(done.length, 'tarefa concluída', 'tarefas concluídas')}? O XP continua com você.`)) return;
      S.tasks = S.tasks.filter(t => !done.includes(t));
      App.render();
      for (const t of done) await DB.remove('tasks', { id: t.id }).catch(console.error);
      U.toast('Lista limpa ✨', 'success');
    },

    // ---------------------------------------------------------------- Check-in
    async saveCheckin({ mood, anxiety, note = '' }) {
      if (!mood) return false;
      const t = U.today(), period = V.period();
      const existed = S.moods.some(m => m.date === t && m.period === period);
      try {
        const row = await DB.upsert('mood_checkins', {
          user_id: S.user.id, date: t, period, mood, anxiety, note: note.trim() || null
        }, 'user_id,date,period');
        S.moods = S.moods.filter(m => !(m.date === t && m.period === period));
        S.moods.push(row);
      } catch (e) { console.error(e); U.toast('Erro ao salvar check-in.', 'error'); return false; }
      U.play('task'); U.vibrate(10);
      if (anxiety >= 7) {
        U.toast('Ansiedade alta. Quer fazer uma <b>respiração 4-7-8</b> de 1 minuto agora? Está na aba Mente. 🌬️', 'success');
      } else if (mood <= 2) {
        U.toast('Obrigado por contar. Dias pesados passam. Vá no seu ritmo hoje. 🤍', 'success');
      } else {
        U.toast('Check-in salvo. Se conhecer é o primeiro passo. 💭', 'success');
      }
      App.render();
      if (!existed) { await G.reward({ xp: G.XP.checkin, coins: 2 }); App.render(); await G.checkAchievements(); }
      return true;
    },

    async toggleHardMode() {
      const t = U.today();
      const on = S.profile.hard_mode_date !== t;
      try { await DB.updateProfile({ hard_mode_date: on ? t : null }); }
      catch (e) { console.error(e); U.toast('Erro ao salvar.', 'error'); return; }
      if (on) U.toast('🤍 Modo dia difícil ativado. Só o essencial hoje.', 'info');
      App.render();
    },

    async exportData() {
      const data = {
        exportado_em: new Date().toISOString(),
        perfil: S.profile, habitos: S.habits, registros_habitos: S.logs, tarefas: S.tasks,
        humor: S.moods, impulsos: S.impulses, meditacoes: S.meds, protetores_usados: S.freezes,
        escrita_terapeutica: S.journal, metas: S.goals, revisoes: S.reviews, sessoes_foco: S.focusSessions,
        conquistas: [...S.achievements].map(([code, at]) => ({ code, at }))
      };
      U.download(`raiz-backup-${U.today()}.json`, JSON.stringify(data, null, 2));
    },

    exportCsv() {
      const rows = [['data', 'hábito', 'quantidade', 'meta', 'feito']];
      S.logs.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
        const h = S.habitById.get(l.habit_id);
        if (!h) return;
        rows.push([l.date, h.name, l.amount || 1, G.goalOf(h), G.isDone(l.habit_id, l.date) ? 'sim' : 'parcial']);
      });
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      U.download(`raiz-habitos-${U.today()}.csv`, '\ufeff' + csv, 'text/csv');
    },

    // ---------------------------------------------------------------- Início
    async start(user) {
      S.user = user;
      show('#splash');
      try {
        await DB.loadAll();
      } catch (e) {
        console.error(e);
        show('#auth');
        $('#authMsg').textContent = 'Erro ao carregar seus dados: ' + (e.message || e) + '. Você rodou o arquivo supabase/schema.sql no Supabase?';
        return;
      }
      // Sempre abre em "Hoje": a coisa mais importante primeiro
      S.tab = 'hoje';
      App.applyTheme();
      show('#app');
      App.syncHrtButton();
      if (Lock.enabled() && !recovery.pending) Lock.show();
      App.render();
      if (recovery.pending) openRecovery();
      await G.applyFreezes();
      const best = Math.max(S.profile.best_streak || 0, G.streak());
      if (best !== S.profile.best_streak) DB.updateProfile({ best_streak: best }).catch(console.error);
      await App.checkGoalMilestones();
      await P.refreshPushState();
      P.syncRiskHour();
      P.syncHabitReminders();
      N.start();
      App.render();
      await G.checkAchievements();
      App.askFocusReturn();
      H.resumeIfRunning();
    },

    // Se você saiu para fazer algo e voltou, pergunta como foi
    askFocusReturn() {
      const a = F.get();
      if (a && a.date === U.today() && Date.now() - a.started > 2 * 60000) setTimeout(() => F.openReturn(), 600);
    }
  };
  window.App = App;

  // ------------------------------------------------------------------ Bloqueio por PIN (por aparelho)
  const Lock = {
    key() { return 'raiz-pin-' + (S.user ? S.user.id : ''); },
    enabled() { return !!(S.user && U.store.get(Lock.key())); },
    async hash(pin) {
      const data = new TextEncoder().encode(S.user.id + ':' + pin);
      try {
        const buf = await crypto.subtle.digest('SHA-256', data);
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        let h = 2166136261;
        for (const c of data) { h ^= c; h = Math.imul(h, 16777619) >>> 0; }
        return 'f' + h.toString(16);
      }
    },
    // Teclado numérico em tela cheia
    pad({ title, sub = '', cancellable = false, onPin, onForgot }) {
      document.querySelectorAll('.lock').forEach(x => x.remove());
      const el = document.createElement('div');
      el.className = 'lock';
      el.innerHTML = `
        <div class="lock-box">
          <div class="logo-mark">🌱</div>
          <h2 class="lock-title">${U.esc(title)}</h2>
          <p class="muted small lock-sub">${U.esc(sub)}</p>
          <div class="pin-dots"><i></i><i></i><i></i><i></i></div>
          <div class="keypad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
            <button data-k="x" class="kp-alt">${cancellable ? 'Cancelar' : onForgot ? 'Esqueci' : ''}</button>
            <button data-k="0">0</button>
            <button data-k="del" class="kp-alt">⌫</button>
          </div>
        </div>`;
      document.body.appendChild(el);
      let pin = '';
      const dots = el.querySelectorAll('.pin-dots i');
      const api = {
        el,
        close() { el.remove(); document.removeEventListener('keydown', onKey); },
        error(msg) {
          el.querySelector('.pin-dots').classList.add('shake'); U.vibrate([40, 30, 40]);
          if (msg) el.querySelector('.lock-sub').textContent = msg;
          setTimeout(() => { el.querySelector('.pin-dots').classList.remove('shake'); pin = ''; draw(); }, 400);
        },
        reset(t, s) { el.querySelector('.lock-title').textContent = t; el.querySelector('.lock-sub').textContent = s || ''; pin = ''; draw(); }
      };
      function draw() { dots.forEach((d, i) => d.classList.toggle('on', i < pin.length)); }
      function press(k) {
        if (k === 'del') { pin = pin.slice(0, -1); draw(); return; }
        if (k === 'x') {
          if (cancellable) { api.close(); onPin(null); }
          else if (onForgot) onForgot();
          return;
        }
        if (pin.length >= 4) return;
        pin += k; draw(); U.vibrate(6);
        if (pin.length === 4) { const p = pin; setTimeout(() => onPin(p, api), 120); }
      }
      function onKey(e) {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') press('del');
      }
      el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
      document.addEventListener('keydown', onKey);
      return api;
    },
    show() {
      if (!Lock.enabled() || document.querySelector('.lock')) return;
      Lock.pad({
        title: 'Digite seu PIN',
        onPin: async (pin, api) => {
          if (await Lock.hash(pin) === U.store.get(Lock.key())) api.close();
          else api.error('PIN incorreto');
        },
        onForgot: () => {
          if (!confirm('Esqueceu o PIN? Você vai sair da conta e entrar de novo com email e senha. O PIN será removido.')) return;
          U.store.set(Lock.key(), '');
          try { localStorage.removeItem(Lock.key()); } catch { /* ignore */ }
          document.querySelectorAll('.lock').forEach(x => x.remove());
          DB.client.auth.signOut();
        }
      });
    },
    setup(onDone) {
      let first = null;
      Lock.pad({
        title: 'Crie um PIN', sub: '4 dígitos para abrir o app neste aparelho', cancellable: true,
        onPin: async (pin, api) => {
          if (pin === null) { onDone(false); return; }
          if (!first) { first = pin; api.reset('Confirme o PIN', 'Digite de novo'); return; }
          if (pin !== first) { first = null; api.error(); setTimeout(() => api.reset('Crie um PIN', 'Os PINs não batem. Tente de novo.'), 420); return; }
          U.store.set(Lock.key(), await Lock.hash(pin));
          api.close(); onDone(true);
          U.toast('🔒 PIN ativado neste aparelho.', 'success');
        }
      });
    },
    disable() { try { localStorage.removeItem(Lock.key()); } catch { /* ignore */ } }
  };
  window.Lock = Lock;

  // ------------------------------------------------------------------ Recuperação de senha
  const recovery = { pending: /type=recovery/.test(location.hash) };

  function openRecovery() {
    recovery.pending = false;
    const m = U.modal(`
      <h2>Criar nova senha</h2>
      <form id="recForm">
        <label class="field"><span>Nova senha</span><input class="input" type="password" id="recPass" minlength="6" required autocomplete="new-password"></label>
        <label class="field"><span>Confirme a nova senha</span><input class="input" type="password" id="recPass2" minlength="6" required autocomplete="new-password"></label>
        <p class="auth-msg" id="recMsg"></p>
        <button class="btn primary block" type="submit">Salvar nova senha</button>
      </form>`, { cls: 'small', dismissable: false });
    m.el.querySelector('#recForm').onsubmit = async e => {
      e.preventDefault();
      const p1 = m.el.querySelector('#recPass').value, p2 = m.el.querySelector('#recPass2').value;
      const msg = m.el.querySelector('#recMsg');
      if (p1.length < 6) { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
      if (p1 !== p2) { msg.textContent = 'As senhas não são iguais.'; return; }
      const { error } = await DB.client.auth.updateUser({ password: p1 });
      if (error) { msg.textContent = 'Erro: ' + error.message; return; }
      m.close();
      history.replaceState(null, '', location.pathname + location.search);
      U.toast('🔑 Senha alterada com sucesso!', 'success');
    };
    setTimeout(() => m.el.querySelector('#recPass').focus(), 250);
  }

  function siteUrl() {
    return location.protocol.startsWith('http') ? location.origin + location.pathname : undefined;
  }

  // ------------------------------------------------------------------ Eventos
  function bindEvents() {
    document.querySelector('.tabbar').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]');
      if (b) App.go(b.dataset.tab);
    });
    $('#sosBtn').addEventListener('click', () => { U.play('whoosh'); X.openImpulse(); });
    $('#hrtBtn').addEventListener('click', () => { H.open(); });

    const view = $('#view');
    view.addEventListener('click', e => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const id = a.dataset.id, v = a.dataset.v;
      switch (a.dataset.action) {
        case 'toggle-habit': App.toggleHabit(id, a, false, a.dataset.date || U.today()); break;
        case 'habit-inc': e.stopPropagation(); App.toggleHabit(id, a.closest('.habit'), false, a.dataset.date || U.today()); break;
        case 'habit-dec': e.stopPropagation(); App.decHabit(id, a.closest('.habit'), a.dataset.date || U.today()); break;
        case 'habit-detail': e.stopPropagation(); V.habitDetail(S.habitById.get(id)); break;
        case 'toggle-task': App.toggleTask(id, a); break;
        case 'del-task': App.deleteTask(id); break;
        case 'edit-task': V.taskEditor(S.tasks.find(t => t.id === id)); break;
        case 'task-date': V.ui.taskDate = v; U.play('tap'); App.render(); break;
        case 'task-prio': V.ui.taskPrio = !V.ui.taskPrio; U.play('tap'); App.render(); break;
        case 'task-star': { const t = S.tasks.find(x => x.id === id); if (t) { U.play('pop'); App.patchTask(id, { priority: t.priority ? 0 : 1 }); } break; }
        case 'task-later': U.play('tap'); App.patchTask(id, { date: U.addDays(U.today(), 1) }); U.toast('Tarefa movida para amanhã', 'info'); break;
        case 'tasks-go': App.go('plano'); break;
        case 'tasks-clear': App.clearDoneTasks(); break;
        case 'tasks-upcoming': V.ui.upcomingOpen = !V.ui.upcomingOpen; App.render(); break;
        case 'plan-day': {
          const nd = U.addDays(V.ui.planDate || U.today(), +v);
          if (nd <= U.today() && nd >= U.addDays(U.today(), -14)) { V.ui.planDate = nd; U.play('tap'); App.render(); }
          break;
        }
        case 'plan-today': V.ui.planDate = U.today(); App.render(); break;
        case 'hard-mode': App.toggleHardMode(); break;
        case 'ci-quick': U.vibrate(8); U.play('tap'); V.checkinSheet(+v); break;
        case 'focus-start': F.start(id); break;
        case 'focus-next': U.play('tap'); F.next(); break;
        case 'focus-already': App.completeHabit(id, a.closest('.focus-card')); break;
        case 'focus-return': F.openReturn(); break;
        case 'focus-cancel': F.cancel(); break;
        case 'review-open': F.openReview(); break;
        case 'plan-show': P.openPlan(); break;
        case 'plan-edit': P.editPlan(); break;
        case 'review-week': P.openReview(); break;
        case 'push-on': P.enablePush(); break;
        case 'push-off': if (confirm('Desativar os lembretes neste aparelho?')) P.disablePush(); break;
        case 'push-test': P.testPush(); break;
        case 'local-test': N.request().then(ok => { if (ok) { N.show('Teste 🌱', 'As notificações deste aparelho estão funcionando.', { tag: 'raiz-test' }); U.play('reminder'); } }); break;
        case 'notif-card-hide': U.setPref('notif-card-hidden', U.today()); App.render(); break;
        case 'quest-claim': G.claimQuest(id, a); break;
        case 'chest-open': G.openChest('quests'); break;
        case 'gift-open': G.openChest('gift'); break;
        case 'buy': G.buy(id); break;
        case 'accent': App.setAccent(v); App.render(); break;
        case 'theme-mode': U.setPref('theme', v); App.applyTheme(); U.play('tap'); App.render(); break;
        case 'home-mode': U.setPref('home', v); U.play('tap'); App.render(); break;
        case 'pomodoro': X.openPomodoro(+v || 25); break;
        case 'hrt': H.open(); break;
        case 'hrt-aware': H.quickAware(a); break;
        case 'hrt-check': H.check(); break;
        case 'hrt-kit': H.toggleKit(v); break;
        case 'hrt-learn': H.learn(); break;
        case 'hrt-sim': H.simulate(); break;
        case 'hrt-stats': V.ui.progTab = 'resumo'; App.go('progresso'); setTimeout(() => { const c = document.getElementById('hrtCard'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }, 100); break;
        case 'hrt-settings': H.settingsSheet(); break;
        case 'day-toggle':
          V.ui.dayOpen = !V.ui.dayOpen;
          U.store.set('raiz-day-open', V.ui.dayOpen ? '1' : '0');
          U.play('tap');
          App.render();
          break;
        case 'prog-tab': V.ui.progTab = v; U.play('tap'); App.render(); window.scrollTo(0, 0); break;
        case 'med-mode': V.med.mode = v; U.play('tap'); App.render(); break;
        case 'med-min': V.med.minutes = +v; U.store.set('raiz-med-min', v); U.play('tap'); App.render(); break;
        case 'med-amb': V.med.amb = v; U.setPref('amb', v); U.play('tap'); App.render(); break;
        case 'amb-preview':
          if (Snd.Amb.current === v) Snd.Amb.stop(); else Snd.Amb.start(v);
          App.render();
          break;
        case 'journal-new': X.openJournal(); break;
        case 'journal-read': X.readJournal(id); break;
        case 'goal-new': V.goalEditor(null); break;
        case 'goal-edit': V.goalEditor(S.goals.find(g => g.id === id)); break;
        case 'goal-inc': App.incGoal(id, a); break;
        case 'med-start': X.openMeditation(V.med.minutes, V.med.mode); break;
        case 'breath': X.openBreathing(v, +a.dataset.s); break;
        case 'grounding': X.openGrounding(); break;
        case 'impulse': X.openImpulse(); break;
        case 'habit-new': V.habitEditor(null); break;
        case 'habit-edit': V.habitEditor(S.habits.find(h => h.id === id)); break;
        case 'habit-up': App.moveHabitUp(id); break;
        case 'habit-archived': V.archivedSheet(); break;
        case 'shortcuts': V.shortcutsSheet(); break;
        case 'save-name': {
          const name = $('#nameInput').value.trim();
          if (!name) return;
          DB.updateProfile({ display_name: name })
            .then(() => U.toast('Nome salvo ✓', 'success'))
            .catch(err => { console.error(err); U.toast('Erro ao salvar.', 'error'); });
          break;
        }
        case 'export': App.exportData(); break;
        case 'export-csv': App.exportCsv(); break;
        case 'logout':
          if (confirm('Sair da conta neste aparelho?')) DB.client.auth.signOut();
          break;
      }
    });
    view.addEventListener('input', e => {
      if (e.target.id === 'ciAnx') { V.ci.anxiety = +e.target.value; $('#ciAnxVal').textContent = e.target.value; }
    });
    view.addEventListener('input', e => {
      if (e.target.id === 'volRange') { Snd.setVolume(+e.target.value / 100); }
    });
    view.addEventListener('change', e => {
      if (e.target.id === 'volRange') U.play('done', 3);
      if (e.target.id === 'soundToggle') { U.store.set('raiz-sound', e.target.checked ? 'on' : 'off'); if (e.target.checked) U.play('done', 2); }
      if (e.target.id === 'hapticsToggle') { U.store.set('raiz-haptics', e.target.checked ? 'on' : 'off'); U.vibrate(30); }
      if (e.target.id === 'confettiToggle') { U.store.set('raiz-confetti', e.target.checked ? 'on' : 'off'); U.confetti(); }
      if (e.target.dataset.rem) P.saveReminder({ [e.target.dataset.rem]: e.target.value || null });
      if (e.target.dataset.remB) P.saveReminder({ [e.target.dataset.remB]: e.target.checked });
      if (e.target.id === 'localNotifToggle') {
        if (e.target.checked) N.request().then(ok => { if (!ok) e.target.checked = false; else U.toast('🔔 Alarmes deste aparelho ativados.', 'success'); App.render(); });
      }
      if (e.target.id === 'pinToggle') {
        if (e.target.checked) Lock.setup(ok => { if (!ok) App.render(); });
        else if (confirm('Desativar o PIN neste aparelho?')) { Lock.disable(); U.toast('PIN desativado.', 'info'); }
        else e.target.checked = true;
      }
    });
    view.addEventListener('submit', e => {
      if (e.target.dataset.form === 'add-task') {
        e.preventDefault();
        const inp = $('#taskInput');
        App.addTask(inp.value);
        inp.value = '';
      }
    });

    // Ao sair/voltar para o app: bloqueio por PIN e virada do dia
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (!S.profile) return;
      if (Lock.enabled() && hiddenAt && Date.now() - hiddenAt > 60000) Lock.show();
      App.askFocusReturn();
      N.tick();
      if (U.today() !== lastDay) {
        lastDay = U.today();
        await G.applyFreezes();
        await App.checkGoalMilestones();
        App.render();
      }
    });
  }

  // ------------------------------------------------------------------ Teclado, conexão e tema do sistema
  function bindExtras() {
    document.addEventListener('keydown', e => {
      if (!S.profile || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (document.querySelector('.modal-backdrop, .lock')) return;
      const tabs = ['hoje', 'plano', 'meditar', 'progresso', 'perfil'];
      if (/^[1-5]$/.test(e.key)) { App.go(tabs[+e.key - 1]); e.preventDefault(); }
      else if (e.key === 'i') { X.openImpulse(); e.preventDefault(); }
      else if (e.key === 'c') { H.open(); e.preventDefault(); }
      else if (e.key === 'n') { App.go('plano'); setTimeout(() => { const i = $('#taskInput'); if (i) i.focus(); }, 50); e.preventDefault(); }
      else if (e.key === 'h') { V.habitEditor(null); e.preventDefault(); }
      else if (e.key === 'f') { X.openPomodoro(25); e.preventDefault(); }
      else if (e.key === '?') { V.shortcutsSheet(); e.preventDefault(); }
    });
    const net = () => {
      const was = S.online;
      S.online = navigator.onLine !== false;
      document.body.classList.toggle('offline', !S.online);
      if (was && !S.online) U.toast('📡 Sem internet. O que você marcar agora pode não salvar.', 'error', { ms: 5000 });
      if (!was && S.online) U.toast('✓ Conectado de novo.', 'success');
    };
    window.addEventListener('online', net);
    window.addEventListener('offline', net);
    try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => App.applyTheme()); } catch { /* ignore */ }
  }

  // ------------------------------------------------------------------ Auth
  function bindAuth() {
    let mode = 'login';
    const form = $('#authForm');
    function setMode(m) {
      mode = m;
      const forgot = m === 'forgot';
      $('#authPassField').hidden = forgot;
      $('#authPass').required = !forgot;
      $('#authForgot').hidden = m !== 'login';
      $('#authSubmit').textContent = m === 'login' ? 'Entrar' : m === 'signup' ? 'Criar conta' : 'Enviar link de recuperação';
      $('#authSwitchText').textContent = m === 'login' ? 'Ainda não tem conta?' : m === 'signup' ? 'Já tem conta?' : 'Lembrou a senha?';
      $('#authSwitch').textContent = m === 'login' ? 'Criar conta' : 'Entrar';
      $('#authPass').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
      $('#authHint').textContent = forgot ? 'Digite seu email. Vamos enviar um link para você criar uma nova senha.' : '';
      $('#authMsg').textContent = '';
      $('#authMsg').className = 'auth-msg';
    }
    $('#authSwitch').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
    $('#authForgot').addEventListener('click', () => setMode('forgot'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#authEmail').value.trim();
      const password = $('#authPass').value;
      const btn = $('#authSubmit');
      const msg = $('#authMsg');
      btn.disabled = true; msg.textContent = '';
      try {
        if (mode === 'login') {
          const { error } = await DB.client.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else if (mode === 'signup') {
          const { data, error } = await DB.client.auth.signUp({ email, password, options: { emailRedirectTo: siteUrl() } });
          if (error) throw error;
          if (!data.session) {
            msg.textContent = '✉️ Conta criada! Abra o email de confirmação que enviamos (veja também o spam) e depois volte aqui para entrar.';
            msg.className = 'auth-msg ok';
          }
        } else {
          const { error } = await DB.client.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
          if (error) throw error;
          msg.textContent = '✉️ Se esse email tiver conta, enviamos um link para criar uma nova senha. Veja também o spam.';
          msg.className = 'auth-msg ok';
        }
      } catch (err) {
        const m = String(err.message || err);
        msg.className = 'auth-msg';
        msg.textContent = /Invalid login/i.test(m) ? 'Email ou senha incorretos.'
          : /Email not confirmed/i.test(m) ? 'Confirme seu email antes de entrar (veja sua caixa de entrada e o spam).'
          : /already registered/i.test(m) ? 'Esse email já tem conta. Toque em "Entrar".'
          : /at least 6/i.test(m) ? 'A senha precisa ter pelo menos 6 caracteres.'
          : /security purposes|rate limit|too many/i.test(m) ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
          : /signups? not allowed|disabled/i.test(m) ? 'Novos cadastros estão desativados.'
          : 'Erro: ' + m;
      } finally { btn.disabled = false; }
    });
  }

  // ------------------------------------------------------------------ Boot
  async function boot() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
    }
    if (!DB.init()) { show('#setup'); return; }
    App.applyTheme();
    bindEvents();
    bindExtras();
    bindAuth();

    let started = false;
    DB.client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recovery.pending = true;
        if (started && S.profile) setTimeout(openRecovery, 0);
      }
      if (event === 'SIGNED_OUT') {
        started = false; S.profile = null;
        document.querySelectorAll('.lock').forEach(x => x.remove());
        document.getElementById('modal-root').innerHTML = '';
        show('#auth');
      } else if (session && !started && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        started = true;
        // fora do callback, como recomenda o Supabase
        setTimeout(() => App.start(session.user), 0);
      } else if (!session && event === 'INITIAL_SESSION') {
        show('#auth');
      }
    });
  }

  boot();
})();
