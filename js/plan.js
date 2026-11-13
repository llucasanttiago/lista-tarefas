// Plano anti-impulso (Se… então…), motivos, mapa de risco,
// revisão da semana e lembretes (notificações).
(function () {
  const esc = s => U.esc(s);
  const DOW = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const hh = h => `${((h % 24) + 24) % 24}h`;

  const P = {
    // ============================================================ Motivos e planos
    reasons() { return (S.profile.reasons || []).filter(Boolean); },
    plans() { return (S.profile.if_then || []).filter(p => p && p.if && p.then); },
    randomReason() { const r = P.reasons(); return r.length ? r[Math.floor(Math.random() * r.length)] : null; },

    // Bloco mostrado no começo do botão de impulso
    impulseBlock() {
      const reason = P.randomReason(), plans = P.plans();
      if (!reason && !plans.length) return '';
      return `
        <div class="imp-plan">
          ${reason ? `<p class="imp-reason">💚 Lembre por quê: <b>${esc(reason)}</b></p>` : ''}
          ${plans.slice(0, 3).map(p => `
            <div class="ift"><div><span class="ift-k">Se</span><span>${esc(p.if)}</span></div><div><span class="ift-k then">Então</span><b>${esc(p.then)}</b></div></div>`).join('')}
        </div>`;
    },

    // Visualizar plano (a partir da tela Hoje no horário de risco, ou da aba Mente)
    openPlan() {
      const reasons = P.reasons(), plans = P.plans();
      const m = U.modal(`
        <h2>🛡️ Meu plano</h2>
        ${reasons.length ? `<p class="eyebrow">Por que estou mudando</p>
          <ul class="reason-list">${reasons.map(r => `<li>💚 ${esc(r)}</li>`).join('')}</ul>` : ''}
        ${plans.length ? `<p class="eyebrow" style="margin-top:14px">Quando bater a vontade</p>
          ${plans.map(p => `<div class="ift"><div><span class="ift-k">Se</span><span>${esc(p.if)}</span></div><div><span class="ift-k then">Então</span><b>${esc(p.then)}</b></div></div>`).join('')}` : ''}
        ${!reasons.length && !plans.length ? '<p class="muted">Você ainda não montou seu plano.</p>' : ''}
        <button class="btn sos-btn block" id="ppImp" style="margin-top:16px">🌊 Estou com um impulso agora</button>
        <button class="btn soft block" id="ppEdit">Editar meu plano</button>
        <button class="btn ghost block" data-close>Fechar</button>`, { cls: 'sheet' });
      G.flag('planRead');
      m.el.querySelector('#ppImp').onclick = () => { m.close(); setTimeout(X.openImpulse, 220); };
      m.el.querySelector('#ppEdit').onclick = () => { m.close(); setTimeout(P.editPlan, 220); };
    },

    editPlan() {
      const st = {
        reasons: P.reasons().slice(),
        plans: P.plans().map(p => ({ ...p }))
      };
      if (!st.reasons.length) st.reasons.push('');
      if (!st.plans.length) st.plans.push({ if: '', then: '' });

      const m = U.modal(`<div id="peBody"></div>`, { cls: 'sheet', dismissable: false });
      const body = m.el.querySelector('#peBody');

      function collect() {
        body.querySelectorAll('[data-r]').forEach(i => { st.reasons[+i.dataset.r] = i.value; });
        body.querySelectorAll('[data-pi]').forEach(i => { st.plans[+i.dataset.pi].if = i.value; });
        body.querySelectorAll('[data-pt]').forEach(i => { st.plans[+i.dataset.pt].then = i.value; });
      }
      function draw() {
        body.innerHTML = `
          <h2>Meu plano anti-impulso</h2>
          <p class="muted small">Escreva com calma, agora. Na hora do impulso, o app mostra isso para você, e aí não precisa pensar, só seguir.</p>

          <p class="eyebrow" style="margin-top:16px">💚 Por que estou mudando</p>
          <p class="muted small">Seus motivos de verdade. Ex.: "quero ter energia de manhã", "quero me respeitar".</p>
          ${st.reasons.map((r, i) => `
            <div class="pe-row">
              <input class="input" data-r="${i}" maxlength="120" value="${esc(r)}" placeholder="Um motivo seu">
              <button class="icon-btn subtle" data-del-r="${i}" aria-label="Remover">✕</button>
            </div>`).join('')}
          ${st.reasons.length < 5 ? '<button class="link-btn" id="peAddR">+ Adicionar motivo</button>' : ''}

          <p class="eyebrow" style="margin-top:18px">🛡️ Se… então…</p>
          <p class="muted small">Situação de risco e o que você vai fazer. Ex.: Se "for 23h e eu estiver no quarto com o celular", então "deixo o celular na sala e vou dormir".</p>
          ${st.plans.map((p, i) => `
            <div class="pe-plan">
              <label class="pe-lbl">Se…</label>
              <input class="input" data-pi="${i}" maxlength="140" value="${esc(p.if)}" placeholder="a situação / o gatilho">
              <label class="pe-lbl">Então…</label>
              <input class="input" data-pt="${i}" maxlength="140" value="${esc(p.then)}" placeholder="o que eu vou fazer">
              <button class="link-btn danger-text" data-del-p="${i}">Remover este plano</button>
            </div>`).join('')}
          ${st.plans.length < 5 ? '<button class="link-btn" id="peAddP">+ Adicionar plano</button>' : ''}

          <div class="row gap end" style="margin-top:16px">
            <button class="btn ghost" data-close>Cancelar</button>
            <button class="btn primary" id="peSave">Salvar plano</button>
          </div>`;
      }
      body.addEventListener('click', async e => {
        const t = e.target;
        if (t.id === 'peAddR') { collect(); st.reasons.push(''); draw(); }
        else if (t.id === 'peAddP') { collect(); st.plans.push({ if: '', then: '' }); draw(); }
        else if (t.dataset.delR !== undefined) { collect(); st.reasons.splice(+t.dataset.delR, 1); draw(); }
        else if (t.dataset.delP !== undefined) { collect(); st.plans.splice(+t.dataset.delP, 1); draw(); }
        else if (t.id === 'peSave') {
          collect();
          const reasons = st.reasons.map(r => r.trim()).filter(Boolean);
          const if_then = st.plans.map(p => ({ if: p.if.trim(), then: p.then.trim() })).filter(p => p.if && p.then);
          try {
            await DB.updateProfile({ reasons, if_then });
            m.close(); App.render();
            U.toast('🛡️ Plano salvo. Ele vai aparecer quando você precisar.', 'success');
            G.checkAchievements();
          } catch (err) { console.error(err); U.toast('Erro ao salvar. Você rodou o schema.sql atualizado?', 'error'); }
        }
      });
      draw();
    },

    // ============================================================ Mapa de risco
    risk() {
      const since = U.addDays(U.today(), -60);
      const list = S.impulses.filter(i => i.date >= since && i.created_at);
      const byHour = Array(24).fill(0), byDow = Array(7).fill(0);
      list.forEach(i => {
        const d = new Date(i.created_at);
        byHour[d.getHours()]++;
        byDow[(d.getDay() + 6) % 7]++;
      });
      const total = list.length;
      let best = 0, start = 0;
      for (let h = 0; h < 24; h++) {
        const s = byHour[h] + byHour[(h + 1) % 24] + byHour[(h + 2) % 24];
        if (s > best) { best = s; start = h; }
      }
      const maxDow = Math.max(...byDow);
      return {
        total, byHour, byDow,
        window: total >= 3 && best >= 2 ? { start, end: (start + 3) % 24, count: best, pct: best / total } : null,
        dow: total >= 3 && maxDow >= 2 ? byDow.indexOf(maxDow) : null
      };
    },
    riskNow() {
      const r = P.risk();
      if (!r.window) return null;
      const rel = (U.hour() - r.window.start + 24) % 24;
      return rel < 3 || rel === 23 ? r : null; // 1h antes até o fim da janela
    },

    riskCard() {
      const r = P.risk();
      if (r.total < 3) return `<p class="empty">Com pelo menos 3 impulsos registrados, aparece aqui em que horários e dias eles são mais fortes. Assim dá para se preparar antes.</p>`;
      const maxH = Math.max(1, ...r.byHour), maxD = Math.max(1, ...r.byDow);
      const inWin = h => r.window && ((h - r.window.start + 24) % 24) < 3;
      return `
        ${r.window ? `<p class="insight">⏰ Seus impulsos são mais fortes entre <b>${hh(r.window.start)} e ${hh(r.window.end)}</b> (${Math.round(r.window.pct * 100)}% deles).${r.dow !== null ? ` O dia mais difícil costuma ser <b>${DOW[r.dow]}</b>.` : ''} Nesse horário, a tela Hoje mostra seu plano.</p>` : ''}
        <div class="hours">${r.byHour.map((n, h) => `<i class="${inWin(h) ? 'hot' : ''}" style="height:${Math.max(4, n / maxH * 100)}%" title="${h}h: ${n}"></i>`).join('')}</div>
        <div class="chart-x"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
        <div class="dows">${r.byDow.map((n, d) => `
          <div class="dw"><div class="dw-bar"><i style="height:${Math.max(4, n / maxD * 100)}%" class="${d === r.dow ? 'hot' : ''}"></i></div><small>${DOW[d].slice(0, 3)}</small></div>`).join('')}</div>`;
    },

    // Faixa discreta na tela Hoje durante o horário de risco
    riskBanner() {
      const r = P.riskNow();
      if (!r) return '';
      const has = P.plans().length || P.reasons().length;
      return `
        <button class="risk-banner" data-action="${has ? 'plan-show' : 'plan-edit'}">
          <span>⏰</span>
          <span><b>Seu horário mais difícil (${hh(r.window.start)}–${hh(r.window.end)})</b><small>${has ? 'Toque para ver seu plano' : 'Toque para montar um plano para este horário'}</small></span>
        </button>`;
    },

    // ============================================================ Revisão da semana
    reviewWeek() {
      // Domingo (a partir das 12h): revisa a semana atual. Segunda/terça: a semana passada.
      const t = U.today(), dow = new Date().getDay();
      if (dow === 0 && U.hour() >= 12) return U.weekStart(t);
      if (dow === 1 || dow === 2) return U.addDays(U.weekStart(t), -7);
      return null;
    },
    reviewPending() {
      const ws = P.reviewWeek();
      if (!ws || !G.activeHabits().length) return null;
      if ((S.reviews || []).some(r => r.week_start === ws)) return null;
      const we = U.addDays(ws, 6);
      if (!S.logs.some(l => l.date >= ws && l.date <= we)) return null;
      return ws;
    },
    reviewBanner() {
      return P.reviewPending() ? `<button class="review-banner" data-action="review-week">📅 <b>Sua semana em 1 minuto</b><span>›</span></button>` : '';
    },

    weekSummary(ws) {
      const we = U.addDays(ws, 6), pws = U.addDays(ws, -7), pwe = U.addDays(ws, -1);
      const inW = (d, a, b) => d >= a && d <= b;
      const logs = S.logs.filter(l => inW(l.date, ws, we));
      const prevLogs = S.logs.filter(l => inW(l.date, pws, pwe));
      const days = new Set(logs.map(l => l.date)).size;
      const imp = S.impulses.filter(i => inW(i.date, ws, we));
      const meds = S.meds.filter(m => inW(m.date, ws, we));
      const moods = S.moods.filter(m => inW(m.date, ws, we));
      const count = {};
      logs.forEach(l => { count[l.habit_id] = (count[l.habit_id] || 0) + 1; });
      const topId = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      const top = topId && S.habits.find(h => h.id === topId);
      return {
        habits: logs.length, prevHabits: prevLogs.length, days,
        resisted: imp.filter(i => i.resisted).length, impulses: imp.length,
        medMin: meds.reduce((a, m) => a + m.minutes, 0),
        anxiety: moods.length ? +(moods.reduce((a, m) => a + m.anxiety, 0) / moods.length).toFixed(1) : null,
        top: top ? { name: top.name, icon: top.icon, n: count[topId] } : null
      };
    },

    openReview() {
      const ws = P.reviewPending() || P.reviewWeek() || U.weekStart(U.today());
      const s = P.weekSummary(ws);
      const st = { wentWell: '', focus: null };
      const nextWeek = new Date().getDay() === 0 ? U.addDays(U.weekStart(U.today()), 7) : U.weekStart(U.today());
      const m = U.modal(`<div id="rwBody"></div>`, { cls: 'sheet', dismissable: false });
      const body = m.el.querySelector('#rwBody');
      const diff = s.habits - s.prevHabits;

      function step1() {
        body.innerHTML = `
          <p class="eyebrow">Semana de ${U.fmtShort(ws)} a ${U.fmtShort(U.addDays(ws, 6))}</p>
          <h2>Sua semana</h2>
          <div class="tiles rw-tiles">
            <div class="tile"><span>✅</span><b>${s.habits}</b><small>hábitos feitos</small></div>
            <div class="tile"><span>📅</span><b>${s.days}/7</b><small>dias ativos</small></div>
            <div class="tile"><span>🌊</span><b>${s.resisted}</b><small>impulsos vencidos</small></div>
          </div>
          <ul class="how rw-list">
            ${diff > 0 ? `<li>📈 <b>${diff} hábitos a mais</b> que na semana anterior.</li>` : s.prevHabits ? `<li>🌱 Semana mais leve que a anterior, e tudo bem. Ritmo não é linha reta.</li>` : ''}
            ${s.top ? `<li>${esc(s.top.icon)} Seu hábito mais forte: <b>${esc(s.top.name)}</b> (${s.top.n}x).</li>` : ''}
            ${s.medMin ? `<li>🧘 ${s.medMin} minutos de meditação.</li>` : ''}
            ${s.anxiety !== null ? `<li>💭 Ansiedade média: <b>${s.anxiety}</b>/10.</li>` : ''}
            ${s.impulses && s.resisted < s.impulses ? `<li>🤍 ${s.impulses - s.resisted} ${s.impulses - s.resisted === 1 ? 'deslize registrado' : 'deslizes registrados'} com honestidade. Isso também é progresso.</li>` : ''}
          </ul>
          <button class="btn primary block" id="rwNext">Continuar</button>
          <button class="btn ghost block" data-close>Depois</button>`;
        body.querySelector('#rwNext').onclick = step2;
      }
      function step2() {
        body.innerHTML = `
          <h2>O que deu certo?</h2>
          <p class="muted small">Uma coisa, por menor que seja. Treinar o olhar para o que funcionou ajuda a repetir.</p>
          <textarea id="rwWell" rows="4" maxlength="600" placeholder="Ex.: caminhei mesmo cansado na quarta…"></textarea>
          <button class="btn primary block" id="rwNext" style="margin-top:14px">Continuar</button>`;
        body.querySelector('#rwNext').onclick = () => { st.wentWell = body.querySelector('#rwWell').value.trim(); step3(); };
      }
      function step3() {
        const hs = G.activeHabits();
        body.innerHTML = `
          <h2>Um foco para a próxima semana</h2>
          <p class="muted small">Escolha só UM hábito para priorizar. A tela Hoje vai sugerir ele primeiro.</p>
          <div class="focus-pick">${hs.map(h => `<button data-h="${h.id}"><span>${esc(h.icon)}</span>${esc(h.name)}</button>`).join('')}</div>
          <button class="btn primary block" id="rwSave" style="margin-top:14px" disabled>Concluir revisão · +20 XP</button>`;
        body.querySelector('.focus-pick').onclick = e => {
          const b = e.target.closest('[data-h]'); if (!b) return;
          st.focus = b.dataset.h;
          body.querySelectorAll('.focus-pick button').forEach(x => x.classList.toggle('on', x === b));
          body.querySelector('#rwSave').disabled = false;
        };
        body.querySelector('#rwSave').onclick = save;
      }
      async function save() {
        body.querySelector('#rwSave').disabled = true;
        try {
          const row = await DB.upsert('weekly_reviews', {
            user_id: S.user.id, week_start: ws, summary: s, went_well: st.wentWell || null, focus_habit_id: st.focus
          }, 'user_id,week_start');
          S.reviews = (S.reviews || []).filter(r => r.week_start !== ws).concat(row);
          await DB.updateProfile({ weekly_focus_habit: st.focus, weekly_focus_week: nextWeek });
        } catch (err) {
          console.error(err); U.toast('Erro ao salvar. Você rodou o schema.sql atualizado?', 'error');
          body.querySelector('#rwSave').disabled = false; return;
        }
        const h = S.habits.find(x => x.id === st.focus);
        U.play('achievement'); U.confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">📅</div>
            <h2>Semana revisada.</h2>
            <p class="celebrate-title">+20 XP</p>
            <p class="muted">Foco da próxima semana: <b>${esc(h.icon)} ${esc(h.name)}</b>. Um de cada vez. Você está construindo isso.</p>
            <button class="btn primary block" data-close>Fechar</button>
          </div>`;
        await G.addXp(20);
        App.render();
        G.checkAchievements();
      }
      step1();
    },

    weeklyFocusId() {
      const p = S.profile;
      return p.weekly_focus_habit && p.weekly_focus_week === U.weekStart(U.today()) ? p.weekly_focus_habit : null;
    },

    // ============================================================ Lembretes
    push: { state: 'unknown' }, // unsupported | ios-install | off | on

    pushSupported() {
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
    },
    isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); },
    isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },

    async refreshPushState() {
      if (P.isIOS() && !P.isStandalone()) { P.push.state = 'ios-install'; return; }
      if (!P.pushSupported() || !window.RAIZ_CONFIG.VAPID_PUBLIC_KEY) { P.push.state = 'unsupported'; return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        P.push.state = sub && Notification.permission === 'granted' && (S.profile.reminders || {}).enabled ? 'on' : 'off';
      } catch { P.push.state = 'off'; }
    },

    defaults() {
      return { enabled: false, morning: '08:00', evening: '21:30', risk: true, focus: true, streak: true, streakAt: '20:30', habits: true, showNames: false, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo' };
    },
    settings() { return Object.assign(P.defaults(), S.profile.reminders || {}); },

    async enablePush() {
      if (Notification.permission === 'denied') {
        U.toast('As notificações estão bloqueadas para este site. Libere nas configurações do navegador.', 'error');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { U.toast('Sem permissão, não consigo enviar lembretes.', 'error'); return; }
      try {
        await P.ensureSubscription();
        const r = P.risk();
        const c = H.cfg();
        await DB.updateProfile({ reminders: Object.assign(P.settings(), { enabled: true, riskHour: r.window ? r.window.start : null, hrtNight: { on: !!c.night, from: c.nightFrom, to: c.nightTo, every: c.nightEvery } }) });
        P.push.state = 'on';
        U.toast('🔔 Lembretes ativados neste aparelho.', 'success');
        App.render();
      } catch (e) {
        console.error(e);
        U.toast('Não consegui ativar os lembretes: ' + U.esc(e.message || e), 'error');
      }
    },

    async disablePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await DB.remove('push_subscriptions', { endpoint: sub.endpoint }).catch(() => {});
          await sub.unsubscribe();
        }
        await DB.updateProfile({ reminders: Object.assign(P.settings(), { enabled: false }) });
      } catch (e) { console.error(e); }
      P.push.state = 'off';
      U.toast('Lembretes desativados neste aparelho.', 'info');
      App.render();
    },

    async saveReminder(patch) {
      try { await DB.updateProfile({ reminders: Object.assign(P.settings(), patch) }); U.toast('Lembrete salvo ✓', 'success'); U.play('pop'); }
      catch (e) { console.error(e); U.toast('Erro ao salvar.', 'error'); }
    },
    // Mantém o fuso horário em dia (o servidor usa para saber "que horas são aí")
    async syncHabitReminders() {
      const r = S.profile.reminders;
      if (!r || !r.enabled) return;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || r.tz;
      const c = H.cfg();
      const hrtNight = { on: !!c.night, from: c.nightFrom, to: c.nightTo, every: c.nightEvery };
      if (r.tz !== tz || JSON.stringify(r.hrtNight) !== JSON.stringify(hrtNight)) {
        await DB.updateProfile({ reminders: Object.assign({}, r, { tz, hrtNight }) }).catch(console.error);
      }
    },

    // Garante que este aparelho tem uma inscrição válida, com a chave certa, salva no banco.
    // Devolve { sub, renewed }.
    async ensureSubscription(force = false) {
      const reg = await navigator.serviceWorker.ready;
      const key = b64ToBytes(window.RAIZ_CONFIG.VAPID_PUBLIC_KEY);
      let sub = await reg.pushManager.getSubscription();
      let renewed = false;
      // inscrição antiga feita com outra chave (ou forçada): refaz
      const sameKey = s => {
        try {
          const k = s.options && s.options.applicationServerKey;
          if (!k) return true;
          const a = new Uint8Array(k);
          return a.length === key.length && a.every((v, i) => v === key[i]);
        } catch { return true; }
      };
      if (sub && (force || !sameKey(sub))) {
        await DB.remove('push_subscriptions', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
      if (!sub) { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); renewed = true; }
      const j = sub.toJSON();
      await DB.upsert('push_subscriptions', {
        user_id: S.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200)
      }, 'endpoint');
      return { sub, renewed };
    },

    // Diagnóstico completo: testa cada etapa e mostra onde parou
    async testPush() {
      const m = U.modal(`
        <h2>🔔 Testando lembretes</h2>
        <ul class="diag" id="dg"></ul>
        <div id="dgEnd"></div>
        <button class="btn ghost block" data-close style="margin-top:12px">Fechar</button>`, { cls: 'sheet' });
      const list = m.el.querySelector('#dg'), end = m.el.querySelector('#dgEnd');
      const step = (txt) => { const li = document.createElement('li'); li.innerHTML = `<span class="dg-i">⏳</span><span>${txt}</span>`; list.appendChild(li); return (ok, extra = '') => { li.querySelector('.dg-i').textContent = ok === true ? '✅' : ok === false ? '❌' : '⚠️'; if (extra) li.querySelector('span:last-child').innerHTML += `<small>${extra}</small>`; }; };
      const fail = html => { end.innerHTML = `<div class="banner warn" style="margin-top:12px">💡 <div>${html}</div></div>`; };

      // 1) permissão
      let s = step('Permissão de notificações neste aparelho');
      if (Notification.permission !== 'granted') {
        s(false, Notification.permission === 'denied' ? 'Bloqueada.' : 'Ainda não concedida.');
        return fail('Libere as notificações: no Android, segure o ícone do Raiz (ou do Chrome) → <b>Informações do app → Notificações → Permitir</b>. No navegador, toque no cadeado ao lado do endereço → Notificações → Permitir.');
      }
      s(true);

      // 2) notificação local (testa o celular, sem servidor)
      s = step('Notificação local (sem servidor)');
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('Teste local 🌱', { body: 'Se você está vendo isso, o aparelho mostra notificações do Raiz.', tag: 'raiz-local-test', icon: 'icons/icon-192.png' });
        s(true, 'Ela deve ter aparecido agora. Se não apareceu, o sistema do celular está escondendo (veja a dica abaixo).');
      } catch (e) { s(false, U.esc(e.message || e)); }

      // 3) inscrição do aparelho
      s = step('Registro deste aparelho no servidor');
      let renewed = false;
      try { renewed = (await P.ensureSubscription()).renewed; s(true, renewed ? 'Registro refeito agora (o anterior estava faltando ou com a chave errada).' : 'Registro ok e salvo no banco.'); }
      catch (e) { s(false, U.esc(e.message || e)); return fail('Não consegui registrar o aparelho. Feche o app, abra de novo e tente outra vez.'); }

      // 4) servidor envia
      s = step('Servidor enviando o teste');
      let data = null;
      try {
        const r = await DB.client.functions.invoke('lembretes', { body: { test: true } });
        if (r.error) throw r.error;
        data = r.data || {};
      } catch (e) {
        s(false, U.esc(e.message || e));
        return fail('A função "lembretes" não respondeu. Confira em Supabase → Edge Functions se ela está publicada.');
      }
      if (data.sent > 0) {
        s(true, `Enviado para ${U.plural(data.sent, 'aparelho', 'aparelhos')}.`);
        U.toast('Teste enviado! Deve chegar em alguns segundos.', 'success');
        return fail('Se a notificação do servidor <b>não chegar</b> em 1 minuto, mas a local apareceu: no Android, desative a <b>economia de bateria</b> para o Chrome/Raiz e veja se o <b>"Não perturbe"</b> está desligado.');
      }
      const errs = data.errors || [];
      if (data.subs === 0) {
        s(false, 'O servidor não encontrou nenhum aparelho seu registrado.');
        return fail('Toque em <b>Desativar</b> e depois em <b>Ativar lembretes</b> de novo.');
      }
      if (errs.length) {
        const codes = errs.map(x => x.status || '?').join(', ');
        s(false, `O serviço de notificações recusou (código ${U.esc(codes)}).`);
        if (errs.some(x => x.status === 403 || x.status === 401)) return fail('As chaves do servidor não batem com as do app. No Supabase → Edge Functions → <b>Secrets</b>, confira se <code>VAPID_PUBLIC_KEY</code> é exatamente igual à chave pública do app (<code>js/config.js</code>) e se a <code>VAPID_PRIVATE_KEY</code> é o par dela. Se perdeu a privada, peça para gerar um par novo.');
        if (errs.some(x => x.status === 404 || x.status === 410)) {
          try { await P.ensureSubscription(true); } catch { /* ignore */ }
          return fail('O registro do aparelho tinha expirado. Já refiz: toque em <b>Enviar teste</b> mais uma vez.');
        }
        return fail('Erro inesperado no envio: ' + U.esc(errs.map(x => x.message).join(' · ')));
      }
      s(null, 'O servidor respondeu, mas não informou detalhes (função antiga?).');
      fail('Publique de novo a função <b>lembretes</b> com o arquivo atualizado (ela agora mostra o motivo do erro) e teste outra vez.');
    },

    // Mantém o horário de risco atualizado para o servidor
    async syncRiskHour() {
      const r = S.profile.reminders;
      if (!r || !r.enabled) return;
      const w = P.risk().window;
      const hour = w ? w.start : null;
      if (r.riskHour !== hour) await DB.updateProfile({ reminders: Object.assign({}, r, { riskHour: hour }) }).catch(console.error);
    },

    // "Voltou? Como foi?" quando você começa algo pelo app
    async scheduleFocusReminder(minutes) {
      const r = S.profile.reminders;
      if (!r || !r.enabled || r.focus === false) return;
      const at = new Date(Date.now() + (minutes || 30) * 60000).toISOString();
      await DB.updateProfile({ focus_reminder_at: at }).catch(console.error);
    },
    async clearFocusReminder() {
      if (S.profile.focus_reminder_at) await DB.updateProfile({ focus_reminder_at: null }).catch(console.error);
    },

    remindersCard() {
      const st = P.push.state, r = P.settings();
      const nHab = G.activeHabits().filter(h => h.remind_at).length;
      const common = `
          <div class="rem-grid">
            <label>🌅 Bom dia<input type="time" class="input" data-rem="morning" value="${esc(r.morning || '')}"></label>
            <label>🌙 Fechar o dia<input type="time" class="input" data-rem="evening" value="${esc(r.evening || '')}"></label>
            <label>🔥 Sequência em risco<input type="time" class="input" data-rem="streakAt" value="${esc(r.streakAt || '20:30')}"></label>
          </div>
          <label class="switch-row"><span>🔥 Avisar se a sequência estiver em risco <small class="muted">(só se ainda não fez nada no dia)</small></span><input type="checkbox" data-rem-b="streak" ${r.streak !== false ? 'checked' : ''}></label>
          <label class="switch-row"><span>⏰ Lembrete de cada hábito <small class="muted">(${nHab ? U.plural(nHab, 'hábito com horário', 'hábitos com horário') : 'defina o horário ao editar um hábito'})</small></span><input type="checkbox" data-rem-b="habits" ${r.habits !== false ? 'checked' : ''}></label>
          <label class="switch-row"><span>⚠️ Avisar antes do meu horário de risco</span><input type="checkbox" data-rem-b="risk" ${r.risk ? 'checked' : ''}></label>
          <label class="switch-row"><span>🤍 Perguntar "como foi?" depois de começar algo</span><input type="checkbox" data-rem-b="focus" ${r.focus !== false ? 'checked' : ''}></label>
          <label class="switch-row"><span>👁️ Mostrar o nome do hábito na notificação <small class="muted">(aparece na tela bloqueada)</small></span><input type="checkbox" data-rem-b="showNames" ${r.showNames ? 'checked' : ''}></label>`;
      let inner;
      if (st === 'ios-install') {
        inner = `<p class="muted small">No iPhone, os lembretes com o app fechado só funcionam com o app instalado: toque em <b>Compartilhar → Adicionar à Tela de Início</b> e abra o Raiz pelo ícone.</p>`;
      } else if (st === 'unsupported') {
        inner = `<p class="muted small">Lembretes com o app fechado não funcionam aqui. ${location.protocol !== 'https:' ? 'Abra o app pelo endereço do GitHub Pages (https).' : 'Tente pelo Chrome.'}</p>`;
      } else if (st === 'on') {
        inner = `
          <p class="ok-line">✅ Ativado neste aparelho. Chegam mesmo com o app fechado.</p>
          ${common}
          <div class="row gap" style="margin-top:10px">
            <button class="btn soft" data-action="push-test">Enviar teste</button>
            <button class="btn ghost danger-text" data-action="push-off">Desativar</button>
          </div>`;
      } else {
        inner = `
          <p class="muted small">Lembretes que chegam <b>mesmo com o app fechado</b>: bom dia, fechar o dia, horário de cada hábito, sequência em risco, horário de risco e "como foi?".</p>
          <button class="btn primary block" data-action="push-on" style="margin-top:10px">🔔 Ativar lembretes neste aparelho</button>`;
      }
      const local = N.granted();
      return `
        <div class="card" id="remCard"><h3>🔔 Lembretes e notificações</h3>${inner}
          <div class="sub-card">
            <label class="switch-row"><span>⏰ Alarmes com o app aberto <small class="muted">(fim do foco, timer anti-coçar, meditação)</small></span><input type="checkbox" id="localNotifToggle" ${local ? 'checked disabled' : ''}></label>
            ${local ? '<button class="link-btn" data-action="local-test">Testar alarme deste aparelho</button>' : ''}
          </div>
        </div>`;
    }
  };

  function b64ToBytes(s) {
    const pad = '='.repeat((4 - s.length % 4) % 4);
    const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  window.P = P;
})();
