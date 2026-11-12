// Foco: sugere UMA coisa para fazer agora, acompanha enquanto você faz
// e acolhe o resultado quando você volta (consegui / um pouco / não deu).
(function () {
  const KEY = 'raiz-focus';
  // Hábitos que não se "começam", se confirmam no fim do dia (evitar, manter, não fazer…)
  const PASSIVE = /evit|n[ãa]o obedec|mantive|^sem\s|dorm|^n[ãa]o\s/i;
  const MED = /medit|mindful/i;
  const JOUR = /escrita|di[áa]rio|journal/i;
  const WHY = [
    [MED, 'Alguns minutos de atenção fortalecem o controle dos impulsos.'],
    [/camin|exerc|trein|corr|along|bike|pedal|academia|malh/i, 'Mexer o corpo baixa a ansiedade e melhora o humor por horas.'],
    [JOUR, 'Colocar no papel tira o peso da cabeça.'],
    [/ler\b|leitura|livro|p[áa]gina/i, 'Ler acalma a mente e te tira do celular.'],
    [/[áa]gua/i, 'Pequeno, fácil, e seu corpo agradece.'],
    [/\bsol\b/i, 'Luz do sol regula o sono e melhora o humor.'],
    [/gratid/i, 'Treinar o olhar para o que é bom muda o humor.'],
    [/arrum|limp|organiz/i, 'Espaço em ordem, cabeça mais leve.'],
    [/falei|liguei|amig|fam[ií]lia/i, 'Conexão com pessoas é remédio para a ansiedade.']
  ];
  const GENERIC = 'Um passo pequeno agora vale mais que um plano perfeito.';
  let skip = 0;

  const esc = s => U.esc(s);
  const habitById = id => S.habits.find(h => h.id === id);

  const F = {
    returnOpen: false,

    get() { try { return JSON.parse(U.store.get(KEY) || 'null'); } catch { return null; } },
    set(v) {
      if (v) U.store.set(KEY, JSON.stringify(v));
      else { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
    },
    isPassive(h) { return PASSIVE.test(h.name); },
    why(h) { const w = WHY.find(([re]) => re.test(h.name)); return w ? w[1] : GENERIC; },
    minutes(h) { const m = h.name.match(/(\d+)\s*min/i); return m ? +m[1] : null; },

    candidates() {
      const t = U.today(), hr = U.hour();
      const dayIdx = (new Date().getDay() + 6) % 7 + 1;
      const score = h => {
        let s = 0;
        if (h.essential) s += 3;
        if (hr < 12 && /medit|mindful|camin|exerc|trein|sol|along/i.test(h.name)) s += 2;
        if (hr >= 18 && /escrita|di[áa]rio|ler\b|leitura|gratid/i.test(h.name)) s += 2;
        if (G.weekCount(h.id, t) < h.target_per_week * dayIdx / 7) s += 1;
        return s;
      };
      return G.visibleHabits()
        .filter(h => !G.isDone(h.id, t) && !F.isPassive(h))
        .map((h, i) => ({ h, s: score(h), i }))
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .map(x => x.h);
    },
    pendingPassive() {
      const t = U.today();
      return G.visibleHabits().filter(h => !G.isDone(h.id, t) && F.isPassive(h));
    },

    // O que mostrar no cartão principal da tela Hoje
    state() {
      const a = F.get();
      if (a && a.date === U.today() && habitById(a.habitId)) return { type: 'active', active: a };
      if (a) F.set(null);
      if (!G.activeHabits().length) return { type: 'empty' };
      const c = F.candidates();
      if (c.length) return { type: 'suggest', habit: c[skip % c.length], total: c.length };
      const p = F.pendingPassive();
      if (p.length) return { type: U.hour() >= 18 ? 'review' : 'waiting', list: p };
      return { type: 'done' };
    },

    next() { skip++; App.render(); },

    // ---------------------------------------------------------------- Começar
    start(id, mini = false) {
      const h = habitById(id);
      if (!h) return;
      if (!mini && (MED.test(h.name) || h.icon === '🧘')) { X.openMeditation(V.med.minutes, 'mindfulness'); return; }
      if (!mini && (JOUR.test(h.name) || h.icon === '✍️')) { X.openJournal(); return; }
      const mins = F.minutes(h);
      const m = U.modal(`
        <div class="focus-sheet">
          <div class="focus-ic xl">${esc(h.icon)}</div>
          <p class="eyebrow">${mini ? 'Versão mini' : 'Agora é só isso'}</p>
          <h2>${esc(h.name)}</h2>
          <ul class="focus-tips">
            ${mini
              ? `<li>🌱 Só 5 minutos. O objetivo é só começar.</li>
                 <li>💛 Se quiser continuar depois, ótimo. Se não, já valeu.</li>`
              : `<li>📵 Deixe o celular de lado e faça só isso agora.</li>
                 <li>🌱 Não precisa ser perfeito. Fazer um pouco já conta.</li>`}
            <li>↩️ Quando terminar, volte aqui e me conte como foi.</li>
          </ul>
          ${!mini && mins ? `<p class="muted small">⏱️ Cerca de ${mins} minutos</p>` : ''}
          <button class="btn primary block big" id="fGo">Vou lá 💪</button>
          <button class="btn ghost block" data-close>Agora não</button>
        </div>`, { cls: 'small' });
      m.el.querySelector('#fGo').onclick = () => {
        F.set({ habitId: id, started: Date.now(), date: U.today(), mini });
        m.close();
        U.play('soft'); U.vibrate(15);
        U.toast('Vai lá! Estou te esperando aqui. 🤍', 'info');
        App.render();
        window.scrollTo(0, 0);
      };
    },

    cancel() {
      if (!confirm('Cancelar esta atividade? Tudo bem, você pode começar de novo quando quiser.')) return;
      F.set(null); App.render();
    },

    // ---------------------------------------------------------------- Voltei
    openReturn() {
      const a = F.get();
      if (!a || F.returnOpen) return;
      const h = habitById(a.habitId);
      if (!h) { F.set(null); return; }
      const mins = Math.max(1, Math.round((Date.now() - a.started) / 60000));
      F.returnOpen = true;
      const m = U.modal(`
        <div class="focus-sheet" id="fBody">
          <div class="focus-ic xl">${esc(h.icon)}</div>
          <p class="eyebrow">Que bom que voltou</p>
          <h2>Como foi?</h2>
          <p class="muted">${esc(h.name)} · ${mins} min</p>
          <div class="outcomes">
            <button class="outcome good" data-o="done"><span>✅</span><b>Consegui!</b></button>
            <button class="outcome mid" data-o="partial"><span>🌱</span><b>Fiz só um pouco</b></button>
            <button class="outcome soft" data-o="not"><span>🤍</span><b>Não deu dessa vez</b></button>
          </div>
          <button class="btn ghost block" data-close>Ainda estou fazendo</button>
        </div>`, { cls: 'small', onClose: () => { F.returnOpen = false; App.render(); } });
      m.el.querySelector('.outcomes').onclick = e => {
        const b = e.target.closest('[data-o]');
        if (b) F.finish(b.dataset.o, a, h, mins, m);
      };
    },

    async finish(outcome, a, h, mins, m) {
      const body = m.el.querySelector('#fBody');
      body.innerHTML = '<div class="center pad"><div class="spinner"></div></div>';
      F.set(null);
      // histórico (se a tabela ainda não existir, segue sem quebrar)
      DB.insert('focus_sessions', {
        user_id: S.user.id, date: U.today(), habit_id: h.id, minutes: mins,
        outcome, mini: !!a.mini, started_at: new Date(a.started).toISOString()
      }).catch(e => console.warn('focus_sessions:', e.message || e));

      if (outcome === 'done' || outcome === 'partial') {
        if (!G.isDone(h.id, U.today())) await App.toggleHabit(h.id, null, true);
        const streak = G.streak();
        if (outcome === 'done') {
          U.play('achievement'); U.vibrate([30, 40, 30]);
          U.confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
          body.innerHTML = `
            <div class="celebrate">
              <div class="celebrate-icon">🎉</div>
              <h2>Você fez!</h2>
              <p class="celebrate-title">+${G.XP.habit + 5} XP</p>
              <p class="muted">Você disse que ia fazer, e fez. É assim que a confiança em si mesmo volta, uma promessa cumprida de cada vez.</p>
              ${streak > 0 ? `<p class="muted small">🔥 ${streak} ${streak === 1 ? 'dia' : 'dias'} seguidos</p>` : ''}
              <button class="btn primary block" data-close>Continuar</button>
            </div>`;
          await G.addXp(5);
        } else {
          U.play('done'); U.vibrate(20);
          U.confetti({ particleCount: 60, spread: 70, origin: { y: 0.55 } });
          body.innerHTML = `
            <div class="celebrate">
              <div class="celebrate-icon">🌱</div>
              <h2>Um pouco também conta.</h2>
              <p class="celebrate-title">+${G.XP.habit} XP</p>
              <p class="muted">Fazer um pouco mantém o hábito vivo. O que muda o cérebro é a repetição, não a perfeição. Marquei como feito hoje.</p>
              <button class="btn primary block" data-close>Continuar</button>
            </div>`;
        }
      } else {
        U.play('soft');
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🤍</div>
            <h2>Tudo bem. De verdade.</h2>
            <p class="celebrate-title">+3 XP por tentar</p>
            <p class="muted">Você tentou, e isso já é diferente de não tentar. Dias assim fazem parte de qualquer mudança. Não diz nada sobre quem você é.</p>
            <p class="muted">Quer tentar uma versão bem pequena? Às vezes 5 minutos destravam o resto.</p>
            <button class="btn primary block" id="fMini">Tentar só 5 minutos</button>
            <button class="btn ghost block" data-close>Deixar pra depois</button>
          </div>`;
        body.querySelector('#fMini').onclick = () => { m.close(); setTimeout(() => F.start(h.id, true), 250); };
        await G.addXp(3);
      }
      G.checkAchievements();
    },

    // ---------------------------------------------------------------- Fechar o dia
    openReview() {
      const list = F.pendingPassive();
      if (!list.length) { App.render(); return; }
      const m = U.modal(`
        <div class="review">
          <div class="focus-ic xl">🌙</div>
          <h2>Como foi o seu dia?</h2>
          <p class="muted small">Responda com sinceridade. Não existe resposta errada aqui.</p>
          <div class="review-list">
            ${list.map(h => `
              <div class="rv" data-id="${h.id}">
                <span class="rv-ic">${esc(h.icon)}</span>
                <span class="rv-name">${esc(h.name)}</span>
                <div class="rv-btns">
                  <button class="rv-yes" data-r="yes">Sim</button>
                  <button class="rv-no" data-r="no">Hoje não</button>
                </div>
                <p class="rv-msg"></p>
              </div>`).join('')}
          </div>
          <button class="btn primary block" data-close>Concluir</button>
        </div>`, { cls: 'small', onClose: () => App.render() });
      m.el.querySelector('.review-list').onclick = async e => {
        const b = e.target.closest('[data-r]');
        if (!b) return;
        const row = b.closest('.rv');
        if (row.classList.contains('answered')) return;
        row.classList.add('answered', b.dataset.r);
        if (b.dataset.r === 'yes') {
          U.play('done'); U.vibrate(15);
          U.floatXp(b, G.XP.habit);
          row.querySelector('.rv-msg').textContent = 'Boa! Isso é autocontrole de verdade. 💪';
          await App.toggleHabit(row.dataset.id, null, true);
        } else {
          row.querySelector('.rv-msg').textContent = 'Tudo bem. Amanhã é uma nova chance. 🤍';
        }
      };
    }
  };

  window.F = F;
})();
