// Treino anti-coçar: Treinamento de Reversão de Hábitos (HRT), técnica da Resposta Concorrente.
// Fluxo: 1) perceber a vontade  2) resposta concorrente por 1 min (continuando a atividade)
//        3) registrar como foi. Mais: psicoeducação, simulações, estatísticas e lembretes de treino.
// Os registros vão para impulse_logs com kind = 'Coçar' (não precisa de tabela nova).
(function () {
  const KIND = 'Coçar';
  const ACTIVE = 'raiz-hrt-active';
  const MANTRA = 'Eu sinto vontade de coçar, mas não preciso transformar essa vontade em uma ação.';
  const AREAS = ['Braço', 'Mão', 'Perna', 'Rosto', 'Couro cabeludo', 'Pescoço', 'Costas', 'Barriga', 'Outro'];
  const SITS = ['À toa / sem fazer nada', 'Celular', 'TV', 'Computador', 'Conversando', 'Deitado / cama', 'Estudando / trabalhando', 'Ansioso', 'Entediado', 'Depois do banho', 'Outro'];
  const esc = s => U.esc(s);
  const HANDS = '<svg class="hrt-hands" viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="30" width="40" height="60" rx="18" class="thigh"/><rect x="66" y="30" width="40" height="60" rx="18" class="thigh"/><g class="palm"><ellipse cx="34" cy="44" rx="15" ry="12"/><rect x="21" y="18" width="5.5" height="22" rx="2.75"/><rect x="28" y="14" width="5.5" height="24" rx="2.75"/><rect x="35" y="15" width="5.5" height="23" rx="2.75"/><rect x="42" y="20" width="5" height="20" rx="2.5"/><rect x="46" y="38" width="12" height="5.5" rx="2.75" transform="rotate(-30 46 38)"/></g><g class="palm"><ellipse cx="86" cy="44" rx="15" ry="12"/><rect x="73" y="20" width="5" height="20" rx="2.5"/><rect x="79.5" y="15" width="5.5" height="23" rx="2.75"/><rect x="86.5" y="14" width="5.5" height="24" rx="2.75"/><rect x="93.5" y="18" width="5.5" height="22" rx="2.75"/><rect x="62" y="38" width="12" height="5.5" rx="2.75" transform="rotate(30 74 38)"/></g></svg>';

  // Frases curtas mostradas durante a resposta (rodam a cada 12 s)
  const CUES = [
    'Mãos nas coxas. Palmas apoiadas. Dedos soltos.',
    'Não precisa apertar. Só deixe as mãos aí.',
    'Continue o que estava fazendo.',
    'Não fique testando se passou.',
    'A vontade pode subir, descer ou voltar. Tudo bem.',
    MANTRA
  ];

  // "Kit mãos ocupadas": coisas para as mãos no horário de risco (editável nos ajustes)
  const KIT = ['🟠 Bolinha / fidget', '✏️ Desenhar ou escrever', '🧊 Segurar algo gelado', '🧩 Cubo mágico / quebra-cabeça', '🎮 Jogo com as duas mãos', '🧶 Tricô, dobradura, montar algo', '🧴 Passar hidratante (em vez de coçar)', '🍵 Preparar um chá'];

  let tick = null, pill = null, finishing = false, timerModal = null;

  const H = {
    KIND, MANTRA,
    cfg() {
      return Object.assign({
        response: 'Mãos sobre as coxas, palmas apoiadas, dedos relaxados.',
        seconds: 60, button: true, areas: AREAS, remind: false, remindEvery: 120,
        night: true, nightFrom: '20:00', nightTo: '00:30', nightEvery: 30, kit: KIT
      }, G.settings().hrt || {});
    },
    async saveCfg(patch) {
      const c = Object.assign(H.cfg(), patch);
      await G.saveSettings({ hrt: c });
      // o servidor também precisa saber, para avisar com o app fechado
      const r = S.profile.reminders;
      if (r) await DB.updateProfile({ reminders: Object.assign({}, r, { hrtNight: { on: !!c.night, from: c.nightFrom, to: c.nightTo, every: c.nightEvery } }) }).catch(console.error);
    },

    // ============================================================ Modo noite (horário de risco)
    // Janela pode passar da meia-noite (ex.: 20:00 → 00:30)
    inWindow(minNow, from, to) {
      const a = U.toMin(from), b = U.toMin(to);
      if (a === null || b === null) return false;
      return a <= b ? minNow >= a && minNow < b : minNow >= a || minNow < b;
    },
    inNight() { const c = H.cfg(); return c.night && H.inWindow(U.minutesNow(), c.nightFrom, c.nightTo); },
    nightSoon() { const c = H.cfg(); const a = U.toMin(c.nightFrom); if (!c.night || a === null) return false; const d = (a - U.minutesNow() + 1440) % 1440; return d > 0 && d <= 45; },
    // quantas vontades caíram dentro da janela da noite (últimos 30 dias)
    nightShare() {
      const c = H.cfg(), list = H.logs(30).filter(i => i.created_at);
      if (list.length < 3) return null;
      const n = list.filter(i => { const d = new Date(i.created_at); return H.inWindow(d.getHours() * 60 + d.getMinutes(), c.nightFrom, c.nightTo); }).length;
      return { n, total: list.length, pct: Math.round(n / list.length * 100) };
    },

    // Checagem rápida: "como estão suas mãos?"
    check() {
      const m = U.modal(`
        <div class="hrt center">
          <div class="hrt-hero-svg">${HANDS}</div>
          <h2>Como estão suas mãos agora?</h2>
          <p class="muted">Repare no corpo por 3 segundos. Tem alguma vontade de coçar, mesmo pequena?</p>
          <button class="btn primary block big" id="hcOk">😌 Tranquilo, mãos ocupadas</button>
          <button class="btn hrt-btn block big" id="hcUrge">✋ Tem um sinal de vontade</button>
        </div>`, { cls: 'small' });
      m.el.querySelector('#hcOk').onclick = async () => {
        m.close();
        U.play('done', 2); U.vibrate(15);
        const first = (G.daily().flags || {}).hrtChecks || 0;
        await G.flag('hrtChecks', 1);
        if (first < 6) await G.reward({ xp: 3, coins: 1, quiet: true });
        U.toast('😌 Boa. Perceber o corpo sem agir é o treino.', 'success');
        App.render();
      };
      m.el.querySelector('#hcUrge').onclick = () => { m.close(); setTimeout(() => H.startResponse(3, { sit: 'À toa / sem fazer nada' }), 230); };
    },

    async toggleKit(item) {
      const d = G.daily(), flags = Object.assign({}, d.flags || {});
      const kit = new Set(flags.kit || []);
      kit.has(item) ? kit.delete(item) : kit.add(item);
      flags.kit = [...kit];
      const firstKit = !d.flags || !(d.flags.kit || []).length;
      await G.saveDaily({ flags });
      U.play(kit.has(item) ? 'pop' : 'undo');
      if (firstKit && kit.size) { await G.reward({ xp: 5, coins: 2, quiet: true }); U.toast('🌙 Kit pronto. Mãos ocupadas deixam menos espaço para a vontade.', 'success'); }
      App.render();
    },

    // Cartão que sobe para o topo da tela Hoje no horário da noite
    nightCard() {
      const c = H.cfg(), d = G.daily();
      const kit = new Set((d.flags || {}).kit || []);
      const t = H.today().filter(i => { const x = new Date(i.created_at || Date.now()); return H.inWindow(x.getHours() * 60 + x.getMinutes(), c.nightFrom, c.nightTo); });
      const not = t.filter(i => H.outcome(i) !== 'scratched').length;
      const checks = (d.flags || {}).hrtChecks || 0;
      const soon = !H.inNight();
      return `
        <div class="card hrt-night">
          <div class="section-head">
            <h3>🌙 ${soon ? 'Sua noite começa logo' : 'Horário de atenção'}</h3>
            <button class="icon-btn subtle" data-action="hrt-settings" aria-label="Ajustes">⚙️</button>
          </div>
          <p class="muted small">${esc(c.nightFrom)}–${esc(c.nightTo)} é quando a vontade de coçar costuma ser maior: corpo parado, mente à toa, atenção indo para a pele. Prepare as mãos <b>antes</b> da vontade chegar.</p>
          <p class="eyebrow night-eye">Kit mãos ocupadas · escolha 1 ou 2</p>
          <div class="kit">${c.kit.map(k => `<button class="${kit.has(k) ? 'on' : ''}" data-action="hrt-kit" data-v="${esc(k)}">${esc(k)}</button>`).join('')}</div>
          <div class="hrt-today">
            <div><b>${checks}</b><small>checagens hoje</small></div>
            <div><b class="ok">${not}/${t.length}</b><small>vontades vencidas à noite</small></div>
          </div>
          <button class="btn hrt-btn block big" data-action="hrt">✋ Estou com vontade de coçar</button>
          <div class="row gap" style="margin-top:8px">
            <button class="btn soft" style="flex:1" data-action="hrt-check">👀 Checar mãos</button>
            <button class="btn soft" style="flex:1" data-action="hrt-aware">✓ Percebi e já fiz</button>
          </div>
          <div class="focus-alt"><button class="link-btn" data-action="hrt-sim">🎓 Simular</button><span>·</span><button class="link-btn" data-action="hrt-learn">Como funciona</button></div>
          <p class="hrt-mantra small-mantra">"${esc(MANTRA)}"</p>
        </div>`;
    },

    logs(days = null) {
      const since = days ? U.addDays(U.today(), -(days - 1)) : '0000';
      return S.impulses.filter(i => i.kind === KIND && i.date >= since);
    },
    today() { return H.logs(1); },
    outcome(i) { return i.resisted ? 'not' : (i.triggers || []).includes('interrompi') ? 'stopped' : 'scratched'; },

    // ============================================================ 1) Perceber
    open(prefill = {}) {
      if (H.active()) { H.openTimer(); return; }
      U.play('whoosh');
      const m = U.modal(`
        <div class="hrt" id="hrtBody">
          <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
          <p class="eyebrow">Passo 1 de 3 · Perceba</p>
          <div class="hrt-hero">✋</div>
          <p class="hrt-say">"Estou sentindo vontade de coçar."</p>
          <p class="muted small center">Diga isso mentalmente. Perceber já é metade do treino. Quanto mais cedo, melhor.</p>
          <p class="hrt-q">Qual a força da vontade agora?</p>
          <div class="hrt-levels">
            <button data-i="3"><span>🌱</span><b>Leve</b><small>primeiro sinal</small></button>
            <button data-i="6"><span>🌊</span><b>Média</b></button>
            <button data-i="9"><span>🔥</span><b>Forte</b></button>
          </div>
          <p class="muted small center hrt-tip">Toque e comece a resposta na hora. Os detalhes ficam para o final.</p>
        </div>`, { cls: 'full', dismissable: false });
      m.el.querySelector('.hrt-levels').onclick = e => {
        const b = e.target.closest('[data-i]'); if (!b) return;
        U.vibrate(20);
        m.close();
        H.startResponse(+b.dataset.i, prefill);
      };
    },

    // ============================================================ 2) Resposta concorrente
    active() { try { return JSON.parse(U.store.get(ACTIVE) || 'null'); } catch { return null; } },
    setActive(v) { if (v) U.store.set(ACTIVE, JSON.stringify(v)); else { try { localStorage.removeItem(ACTIVE); } catch { /* ignore */ } } },

    startResponse(intensity, prefill = {}) {
      const secs = H.cfg().seconds;
      const a = { start: Date.now(), end: Date.now() + secs * 1000, secs, intensity, extra: 0, ...prefill };
      H.setActive(a);
      U.play('start');
      N.at('hrt-end', secs * 1000, H.onEnd);
      H.openTimer();
    },
    remaining() { const a = H.active(); return a ? Math.max(0, Math.ceil((a.end - Date.now()) / 1000)) : 0; },

    openTimer() {
      const a = H.active(); if (!a) return;
      H.hidePill();
      const C = 2 * Math.PI * 100;
      const cfg = H.cfg();
      let ci = 0, cueIv = null;
      const m = U.modal(`
        <div class="hrt" id="hrtT">
          <p class="eyebrow">Passo 2 de 3 · Resposta concorrente</p>
          <div class="hrt-ring">
            <svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="100" class="ring-bg"/><circle cx="110" cy="110" r="100" class="ring-fg" id="hrtRing" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
            <div class="hrt-ring-in">
              ${HANDS}
              <div class="hrt-time" id="hrtTime">1:00</div>
            </div>
          </div>
          <p class="hrt-instr">${esc(cfg.response)}</p>
          <p class="hrt-cue" id="hrtCue">${esc(CUES[0])}</p>
          <button class="btn primary block big" id="hrtMin">Continuar o que eu estava fazendo</button>
          <p class="muted small center">O timer fica num cantinho da tela. Eu aviso quando der 1 minuto.</p>
          <button class="btn ghost block" id="hrtDone">Terminar agora</button>
        </div>`, { cls: 'full hrt-modal', dismissable: false, onClose: () => { timerModal = null; clearInterval(cueIv); clearInterval(tick); tick = null; if (H.active()) H.showPill(); } });
      timerModal = m;
      const $ = s => m.el.querySelector(s);
      const draw = () => {
        const cur = H.active(); if (!cur) return;
        const left = H.remaining(), total = cur.secs + cur.extra;
        $('#hrtTime').textContent = `${Math.floor(left / 60)}:${U.pad(left % 60)}`;
        $('#hrtRing').setAttribute('stroke-dashoffset', String(C * (1 - left / total)));
        if (left > 0 && left % 15 === 0 && left !== total) U.play('tick');
      };
      draw();
      clearInterval(tick);
      tick = setInterval(draw, 1000);
      cueIv = setInterval(() => {
        ci = (ci + 1) % CUES.length;
        const c = $('#hrtCue'); if (!c) return;
        c.classList.remove('fade'); void c.offsetWidth; c.classList.add('fade');
        c.textContent = CUES[ci];
      }, 12000);
      $('#hrtMin').onclick = () => { U.play('tap'); m.close(); };
      $('#hrtDone').onclick = () => { m.close(); H.finish(); };
    },

    // Faixa flutuante com o tempo, para usar o app/celular normalmente
    showPill() {
      if (pill || !H.active()) return;
      pill = document.createElement('button');
      pill.className = 'hrt-pill';
      pill.innerHTML = '<span>✋</span><b id="hrtPillT"></b><small>mãos nas coxas</small>';
      pill.onclick = () => H.openTimer();
      document.body.appendChild(pill);
      const upd = () => {
        const left = H.remaining();
        const t = document.getElementById('hrtPillT');
        if (t) t.textContent = `${Math.floor(left / 60)}:${U.pad(left % 60)}`;
      };
      upd();
      pill._iv = setInterval(upd, 1000);
    },
    hidePill() { if (pill) { clearInterval(pill._iv); pill.remove(); pill = null; } },

    onEnd() {
      const a = H.active(); if (!a) return;
      if (Date.now() < a.end - 500) { N.at('hrt-end', a.end - Date.now(), H.onEnd); return; }
      U.play('timerEnd'); U.vibrate([80, 60, 80]);
      if (document.hidden) N.show('✋ 1 minuto concluído', 'Muito bem. Toque para registrar como foi.', { tag: 'raiz-hrt' });
      // fecha o timer aberto e pergunta se a vontade continua
      if (timerModal) timerModal.close();
      clearInterval(tick); tick = null;
      H.hidePill();
      const m = U.modal(`
        <div class="hrt center">
          <div class="celebrate-icon">⏱️</div>
          <h2>1 minuto feito.</h2>
          <p class="muted">A vontade ainda está aí?</p>
          <button class="btn soft block big" id="hrtMore">Ainda sinto: manter mais 1 minuto</button>
          <button class="btn primary block big" id="hrtOk">Diminuiu, posso seguir</button>
        </div>`, { cls: 'small', dismissable: false });
      m.el.querySelector('#hrtMore').onclick = () => {
        const cur = H.active();
        cur.end = Date.now() + 60000; cur.extra += 60;
        H.setActive(cur);
        N.at('hrt-end', 60000, H.onEnd);
        U.play('start');
        m.close(); setTimeout(() => H.openTimer(), 230);
      };
      m.el.querySelector('#hrtOk').onclick = () => { m.close(); setTimeout(() => H.finish(), 230); };
    },

    resumeIfRunning() {
      const a = H.active(); if (!a) return;
      if (Date.now() - a.end > 30 * 60000) { H.setActive(null); return; } // abandonado
      if (Date.now() >= a.end) H.onEnd();
      else { N.at('hrt-end', a.end - Date.now(), H.onEnd); H.showPill(); }
    },

    // ============================================================ 3) Registrar
    finish() {
      if (finishing) return;
      const a = H.active(); if (!a) return;
      finishing = true;
      N.cancel('hrt-end'); H.hidePill(); clearInterval(tick); tick = null;
      const secs = Math.round((Date.now() - a.start) / 1000);
      const st = { outcome: null, area: a.area || null, sit: a.sit || null, after: Math.max(1, a.intensity - 3) };
      const areas = H.cfg().areas;
      const m = U.modal(`
        <div class="hrt" id="hrtF">
          <p class="eyebrow">Passo 3 de 3 · Como foi?</p>
          <h2 class="center">Você segurou por ${secs >= 60 ? U.plural(Math.round(secs / 60), 'minuto', 'minutos') : secs + ' segundos'}.</h2>
          <div class="outcomes">
            <button class="outcome good" data-o="not"><span>💪</span><b>Não cocei</b></button>
            <button class="outcome mid" data-o="stopped"><span>🤚</span><b>Comecei, mas interrompi</b></button>
            <button class="outcome soft" data-o="scratched"><span>🤍</span><b>Acabei coçando</b></button>
          </div>
          <div id="hrtDetails" hidden>
            <div class="field"><span>Onde? <em class="muted">(opcional)</em></span>
              <div class="chips" id="hrtArea">${areas.map(x => `<button type="button" class="chip ${st.area === x ? 'on' : ''}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <div class="field"><span>O que você estava fazendo? <em class="muted">(opcional)</em></span>
              <div class="chips" id="hrtSit">${SITS.map(x => `<button type="button" class="chip ${st.sit === x ? 'on' : ''}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
            <label class="field"><span>Vontade agora: <b id="hrtAfterV">${st.after}</b>/10</span>
              <input type="range" id="hrtAfter" min="1" max="10" value="${st.after}"></label>
            <button class="btn primary block big" id="hrtSave">Salvar</button>
          </div>
        </div>`, { cls: 'full', dismissable: false, onClose: () => { finishing = false; } });
      const $ = s => m.el.querySelector(s);
      $('.outcomes').onclick = e => {
        const b = e.target.closest('[data-o]'); if (!b) return;
        st.outcome = b.dataset.o;
        m.el.querySelectorAll('.outcome').forEach(x => x.classList.toggle('picked', x === b));
        $('#hrtDetails').hidden = false;
        U.play('tap');
        $('#hrtDetails').scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const single = (sel, key) => { $(sel).onclick = e => {
        const c = e.target.closest('.chip'); if (!c) return;
        st[key] = st[key] === c.dataset.v ? null : c.dataset.v;
        m.el.querySelectorAll(sel + ' .chip').forEach(x => x.classList.toggle('on', x.dataset.v === st[key]));
      }; };
      single('#hrtArea', 'area'); single('#hrtSit', 'sit');
      $('#hrtAfter').oninput = e => { st.after = +e.target.value; $('#hrtAfterV').textContent = e.target.value; };
      $('#hrtSave').onclick = () => H.save(a, st, secs, m);
    },

    async save(a, st, secs, m) {
      m.el.querySelector('#hrtSave').disabled = true;
      const triggers = ['hrt'];
      if (st.area) triggers.push('área:' + st.area);
      if (st.sit) triggers.push('sit:' + st.sit);
      if (st.outcome === 'stopped') triggers.push('interrompi');
      if (a.sim) triggers.push('simulação');
      const row = {
        user_id: S.user.id, date: U.today(), kind: KIND, intensity_before: a.intensity, intensity_after: st.after,
        resisted: st.outcome === 'not', triggers, note: `resposta concorrente · ${secs}s`
      };
      try { S.impulses.push(await DB.insert('impulse_logs', row)); }
      catch (e) { console.error(e); U.toast('Não consegui salvar. Verifique sua conexão.', 'error'); m.el.querySelector('#hrtSave').disabled = false; return; }
      H.setActive(null);
      const todayNot = H.today().filter(i => i.resisted).length;
      const body = m.el.querySelector('#hrtF');
      let xp, coins;
      if (st.outcome === 'not') {
        xp = G.XP.resisted; coins = G.COINS.resisted;
        U.play('achievement'); U.vibrate([30, 40, 30]);
        U.confetti({ particleCount: 140, spread: 100, origin: { y: 0.5 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">💪</div>
            <h2>Vontade sentida. Ação não tomada.</h2>
            <div class="reward-row"><span>+${xp} XP</span><span>+${coins} 💰</span></div>
            <p class="muted">Essa é a ${todayNot}ª vez hoje. Cada repetição enfraquece a ligação automática entre <b>sentir coceira</b> e <b>coçar</b>.</p>
            <p class="hrt-mantra">"${esc(MANTRA)}"</p>
            <p class="muted small" id="hrtMarked"></p>
            <button class="btn primary block big" data-close>Voltar</button>
          </div>`;
      } else if (st.outcome === 'stopped') {
        xp = 12; coins = 3;
        U.play('done', 3); U.vibrate(25);
        U.confetti({ particleCount: 60, spread: 70, origin: { y: 0.55 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🤚</div>
            <h2>Interromper também é vitória.</h2>
            <div class="reward-row"><span>+${xp} XP</span><span>+${coins} 💰</span></div>
            <p class="muted">Você percebeu no meio e parou. É a mesma habilidade, só um pouco mais tarde. Da próxima vez, tente começar a resposta no primeiro sinal.</p>
            <button class="btn primary block big" data-close>Voltar</button>
          </div>`;
      } else {
        xp = G.XP.slip; coins = 0;
        U.play('soft');
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🤍</div>
            <h2>Tudo bem. Interrompa e siga.</h2>
            <div class="reward-row"><span>+${xp} XP pela honestidade</span></div>
            <p class="muted">Se acabar coçando, pare e volte ao treino na próxima oportunidade. <b>O resto do dia não está perdido.</b></p>
            <p class="muted small">Se a coceira continuar forte, siga cuidando da pele e da causa (hidratação, tratamento, médico). A técnica cuida do comportamento, não da causa física.</p>
            <button class="btn primary block big" data-close>Voltar</button>
          </div>`;
      }
      await G.reward({ xp, coins, quiet: true });
      if (st.outcome !== 'scratched') {
        const marked = await App.autoMark(/co[çc]a|co[çc]ar|hrt|resposta concorrente/i, '✋');
        const el = m.el.querySelector('#hrtMarked');
        if (marked && el) el.innerHTML = `✓ Hábito <b>${esc(marked)}</b> marcado como feito hoje.`;
      }
      App.render();
      G.checkAchievements();
    },

    // Registro rápido: "percebi e já fiz a resposta" (sem timer)
    async quickAware(el) {
      try {
        S.impulses.push(await DB.insert('impulse_logs', {
          user_id: S.user.id, date: U.today(), kind: KIND, intensity_before: 3, intensity_after: 1,
          resisted: true, triggers: ['hrt', 'rápido'], note: 'percebi e fiz a resposta'
        }));
      } catch (e) { console.error(e); U.toast('Não consegui salvar.', 'error'); return; }
      U.play('done', H.today().length); U.vibrate(20);
      U.confettiAt(el, { particleCount: 30 });
      await G.reward({ xp: 10, coins: 2, el });
      App.render();
      G.checkAchievements();
    },

    // ============================================================ Aprender
    learn() {
      U.modal(`
        <div class="hrt-learn">
          <p class="eyebrow">Treino anti-coçar · TCC</p>
          <h2>Resposta Concorrente</h2>
          <p class="muted">Faz parte do <b>Treinamento de Reversão de Hábitos (HRT)</b>. O objetivo é enfraquecer a ligação automática entre <b>sentir coceira</b> e <b>coçar</b>. Use sempre que perceber a vontade, mesmo se ela estiver muito forte.</p>

          <div class="hrt-steps">
            <div><span>1</span><div><b>Perceba a vontade</b><p>No instante em que notar, diga mentalmente: <i>"Estou sentindo vontade de coçar."</i></p></div></div>
            <div><span>2</span><div><b>Faça a resposta concorrente</b><p>${esc(H.cfg().response)} Não aperte os músculos. Só mantenha as mãos nessa posição.</p></div></div>
            <div><span>3</span><div><b>Continue sua atividade</b><p>TV, conversa, trabalho, computador. Não fique esperando a coceira desaparecer.</p></div></div>
            <div><span>4</span><div><b>Mantenha por 1 minuto</b><p>Se a vontade continuar, mantenha. Se diminuir, siga normalmente.</p></div></div>
          </div>

          <p class="eyebrow" style="margin-top:18px">Três regras fundamentais</p>
          <ul class="how">
            <li>⏱️ <b>Não espere a vontade ficar forte.</b> Comece no primeiro sinal.</li>
            <li>🚫 <b>Não fique testando</b> se a coceira passou.</li>
            <li>🔁 <b>Se acabar coçando</b>, interrompa e volte ao treino na próxima oportunidade, sem desistir do resto do dia.</li>
          </ul>

          <p class="hrt-mantra">"${esc(MANTRA)}"</p>
          <p class="muted small">Essa técnica controla o comportamento, não necessariamente a causa física da coceira. Se ela persistir, continue tratando a pele e a causa identificada.</p>
          <button class="btn primary block big" id="hlSim" style="margin-top:14px">Treinar com uma simulação</button>
          <button class="btn ghost block" data-close>Fechar</button>
        </div>`, { cls: 'sheet' }).el.querySelector('#hlSim').onclick = e => {
        e.target.closest('.modal-backdrop').querySelector('[data-close]').click();
        setTimeout(H.simulate, 240);
      };
    },

    // ============================================================ Simulação (treino mental + físico)
    SCENES: [
      { ic: '📱', s: 'Você está mexendo no celular e aparece uma vontade <b>muito forte</b> de coçar o braço.' },
      { ic: '📺', s: 'Você está assistindo TV, relaxado, e sente uma coceira leve na perna.' },
      { ic: '💬', s: 'Você está conversando com alguém e a vontade de coçar o rosto começa.' },
      { ic: '🛏️', s: 'Você está deitado, quase dormindo, e a coceira aparece nas costas.' },
      { ic: '💻', s: 'Você está concentrado no computador e percebe que a mão já foi em direção ao pescoço.' },
      { ic: '🚿', s: 'Você acabou de sair do banho e a pele começa a coçar.' }
    ],
    simulate() {
      const pick = H.SCENES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      const OPTS = [
        ['Coço só um pouquinho, para aliviar.', false, 'Coçar "só um pouquinho" reforça a associação automática. A ideia é não transformar a vontade em ação.'],
        ['Fico discutindo mentalmente com a vontade.', false, 'Não precisa brigar com a vontade. Reconheça e faça a resposta.'],
        ['Reconheço a sensação, ponho as mãos nas coxas e continuo o que estava fazendo.', true, 'Isso! Reconhecer, resposta concorrente e seguir a atividade.'],
        ['Paro tudo e espero a coceira passar, conferindo toda hora.', false, 'Não fique esperando nem testando se passou. Continue sua atividade.']
      ];
      let i = 0, right = 0;
      const m = U.modal(`<div class="hrt" id="simB"></div>`, { cls: 'full', dismissable: false });
      const body = m.el.querySelector('#simB');
      function scene() {
        if (i >= pick.length) return practice();
        const sc = pick[i];
        const opts = OPTS.slice().sort(() => Math.random() - 0.5);
        body.innerHTML = `
          <button class="icon-btn close-x" data-close aria-label="Fechar">✕</button>
          <div class="g-progress">${pick.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).concat('<span></span>').join('')}</div>
          <p class="eyebrow" style="margin-top:16px">Simulação ${i + 1} de ${pick.length}</p>
          <div class="sim-scene"><div class="sim-ic">${sc.ic}</div><p>Imagine: ${sc.s}</p></div>
          <p class="hrt-q">O que você faz?</p>
          <div class="sim-opts">${opts.map((o, k) => `<button data-k="${k}">${esc(o[0])}</button>`).join('')}</div>
          <p class="sim-fb" id="simFb"></p>
          <button class="btn primary block big" id="simNext" hidden>Próxima</button>`;
        body.querySelector('.sim-opts').onclick = e => {
          const b = e.target.closest('[data-k]'); if (!b || body.querySelector('.sim-opts.answered')) return;
          const o = opts[+b.dataset.k];
          body.querySelector('.sim-opts').classList.add('answered');
          b.classList.add(o[1] ? 'right' : 'wrong');
          if (!o[1]) body.querySelectorAll('.sim-opts button').forEach((x, k) => { if (opts[k][1]) x.classList.add('right'); });
          if (o[1]) { right++; U.play('done', right + 1); U.vibrate(20); } else { U.play('undo'); }
          body.querySelector('#simFb').innerHTML = (o[1] ? '✅ ' : '💡 ') + esc(o[2]);
          body.querySelector('#simNext').hidden = false;
        };
        body.querySelector('#simNext').onclick = () => { i++; scene(); };
      }
      // Ensaio físico: fazer a resposta de verdade por 20 s
      function practice() {
        let left = 20;
        body.innerHTML = `
          <p class="eyebrow">Ensaio de verdade</p>
          <div class="hrt-hero-svg">${HANDS}</div>
          <h2 class="center">Faça a resposta agora</h2>
          <p class="muted center">${esc(H.cfg().response)} Imagine a vontade e mantenha. Ensaiar no corpo deixa a resposta automática.</p>
          <div class="sim-count" id="simC">20</div>`;
        U.play('start');
        const iv = setInterval(() => {
          left--;
          const c = body.querySelector('#simC'); if (c) c.textContent = left;
          if (left === 10) U.play('tick');
          if (left <= 0) { clearInterval(iv); done(); }
        }, 1000);
      }
      async function done() {
        const first = !G.flagged('hrtSim');
        U.play('achievement'); U.confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        body.innerHTML = `
          <div class="celebrate">
            <div class="celebrate-icon">🎓</div>
            <h2>Treino concluído</h2>
            <p class="celebrate-title">${right}/${pick.length} respostas certas</p>
            ${first ? '<div class="reward-row"><span>+15 XP</span><span>+5 💰</span></div>' : '<p class="muted small">Recompensa da simulação: 1 vez por dia.</p>'}
            <p class="hrt-mantra">"${esc(MANTRA)}"</p>
            <button class="btn primary block big" data-close>Fechar</button>
          </div>`;
        if (first) {
          await G.flag('hrtSim');
          await G.reward({ xp: 15, coins: 5, quiet: true });
          G.bumpStat('hrtSims');
          App.render();
          G.checkAchievements();
        }
      }
      scene();
    },

    // ============================================================ Ajustes
    settingsSheet() {
      const c = H.cfg();
      const m = U.modal(`
        <h2>✋ Ajustes do treino anti-coçar</h2>
        <label class="field"><span>Minha resposta concorrente</span>
          <textarea id="hsResp" rows="2" maxlength="160">${esc(c.response)}</textarea></label>
        <div class="field"><span>Duração da resposta</span>
          <div class="seg small" id="hsSecs">${[60, 90, 120].map(n => `<button type="button" data-n="${n}" class="${c.seconds === n ? 'on' : ''}">${n / 60 === 1 ? '1 min' : n === 90 ? '1min30' : '2 min'}</button>`).join('')}</div></div>
        <label class="field"><span>Áreas do corpo (separe por vírgula)</span>
          <input class="input" id="hsAreas" value="${esc(c.areas.join(', '))}"></label>
        <label class="switch-row"><span>🌙 Modo noite <small class="muted">(plano no topo da tela e checagens no seu horário de risco)</small></span><input type="checkbox" id="hsNight" ${c.night ? 'checked' : ''}></label>
        <div id="hsNightF" ${c.night ? '' : 'hidden'}>
          <div class="rem-grid">
            <label>Começa<input type="time" class="input" id="hsFrom" value="${esc(c.nightFrom)}"></label>
            <label>Termina<input type="time" class="input" id="hsTo" value="${esc(c.nightTo)}"></label>
          </div>
          <div class="field"><span>Checagem "como estão suas mãos?" a cada</span>
            <div class="seg small" id="hsNE">${[15, 20, 30, 45, 60].map(n => `<button type="button" data-n="${n}" class="${c.nightEvery === n ? 'on' : ''}">${n} min</button>`).join('')}</div></div>
          <label class="field"><span>Kit mãos ocupadas (um por linha)</span>
            <textarea id="hsKit" rows="5" maxlength="600">${esc(c.kit.join('\n'))}</textarea></label>
        </div>
        <label class="switch-row"><span>Mostrar botão ✋ flutuante</span><input type="checkbox" id="hsBtn" ${c.button ? 'checked' : ''}></label>
        <label class="switch-row"><span>Lembrete de atenção durante o dia</span><input type="checkbox" id="hsRem" ${c.remind ? 'checked' : ''}></label>
        <div class="field" id="hsEveryF" ${c.remind ? '' : 'hidden'}><span>A cada</span>
          <div class="seg small" id="hsEvery">${[30, 60, 120, 180].map(n => `<button type="button" data-n="${n}" class="${c.remindEvery === n ? 'on' : ''}">${n < 60 ? n + ' min' : n / 60 + 'h'}</button>`).join('')}</div></div>
        <p class="muted small">O lembrete pergunta "como estão suas mãos agora?", para treinar a percepção. Funciona com o app aberto ou em segundo plano.</p>
        <div class="row gap end" style="margin-top:14px">
          <button class="btn ghost" data-close>Cancelar</button>
          <button class="btn primary" id="hsSave">Salvar</button>
        </div>`, { cls: 'sheet' });
      const $ = s => m.el.querySelector(s);
      const st = { seconds: c.seconds, remindEvery: c.remindEvery, nightEvery: c.nightEvery };
      $('#hsNight').onchange = e => { $('#hsNightF').hidden = !e.target.checked; };
      $('#hsNE').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.nightEvery = +b.dataset.n; m.el.querySelectorAll('#hsNE button').forEach(x => x.classList.toggle('on', x === b)); };
      $('#hsSecs').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.seconds = +b.dataset.n; m.el.querySelectorAll('#hsSecs button').forEach(x => x.classList.toggle('on', x === b)); };
      $('#hsEvery').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.remindEvery = +b.dataset.n; m.el.querySelectorAll('#hsEvery button').forEach(x => x.classList.toggle('on', x === b)); };
      $('#hsRem').onchange = e => { $('#hsEveryF').hidden = !e.target.checked; if (e.target.checked) N.request(); };
      $('#hsSave').onclick = async () => {
        const areas = $('#hsAreas').value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 14);
        await H.saveCfg({
          response: $('#hsResp').value.trim() || H.cfg().response, seconds: st.seconds,
          areas: areas.length ? areas : AREAS, button: $('#hsBtn').checked, remind: $('#hsRem').checked, remindEvery: st.remindEvery,
          night: $('#hsNight').checked, nightFrom: $('#hsFrom').value || '20:00', nightTo: $('#hsTo').value || '00:30', nightEvery: st.nightEvery,
          kit: (() => { const k = $('#hsKit').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12); return k.length ? k : KIT; })()
        });
        if ($('#hsNight').checked && !N.granted()) N.request();
        m.close(); App.syncHrtButton(); App.render();
        U.toast('✋ Ajustes salvos', 'success');
      };
    },

    // Lembrete periódico de atenção (com o app aberto ou em segundo plano)
    tickReminder() {
      const c = H.cfg();
      if (H.active()) return;
      // início da noite: aviso para preparar as mãos
      if (c.night && H.inNight() && N.once('hrt-night-start')) {
        U.store.set('raiz-hrt-last-remind', String(Date.now()));
        if (!(document.hidden && N.serverCovers())) {
          N.alert('🌙 Começou seu horário de atenção', 'Deixe as mãos ocupadas e faça checagens rápidas. Você está preparado.',
            { tag: 'raiz-hrt-night', sound: 'soft', action: 'Ver plano', onAction: () => App.go('hoje') });
        }
        if (S.tab === 'hoje') App.render();
        return;
      }
      // dentro da noite: checagens mais frequentes
      if (c.night && H.inNight()) {
        const last = +U.store.get('raiz-hrt-last-remind', '0');
        if (Date.now() - last < c.nightEvery * 60000) return;
        U.store.set('raiz-hrt-last-remind', String(Date.now()));
        if (document.hidden && N.serverCovers()) return;
        N.alert('✋ Como estão suas mãos?', 'Repare no corpo. Se houver vontade, mãos nas coxas por 1 minuto.',
          { tag: 'raiz-hrt-remind', sound: 'soft', action: 'Checar', onAction: () => H.check() });
        return;
      }
      if (!c.remind) return;
      const last = +U.store.get('raiz-hrt-last-remind', '0') || Date.now();
      if (!U.store.get('raiz-hrt-last-remind')) { U.store.set('raiz-hrt-last-remind', String(Date.now())); return; }
      const h = U.hour();
      if (h < 8 || h >= 23) return;
      if (Date.now() - last < c.remindEvery * 60000) return;
      U.store.set('raiz-hrt-last-remind', String(Date.now()));
      N.alert('✋ Como estão suas mãos agora?', 'Percebeu alguma vontade? Se sim, mãos nas coxas por 1 minuto.',
        { tag: 'raiz-hrt-remind', sound: 'soft', action: 'Treinar', onAction: () => H.open() });
    },

    // ============================================================ Números
    stats(days = 14) {
      const list = H.logs(days);
      const not = list.filter(i => i.resisted).length;
      const stopped = list.filter(i => H.outcome(i) === 'stopped').length;
      const early = list.filter(i => (i.intensity_before || 10) <= 4).length;
      const tag = p => { const c = {}; list.forEach(i => (i.triggers || []).forEach(t => { if (t.startsWith(p)) { const k = t.slice(p.length); c[k] = (c[k] || 0) + 1; } })); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
      const perDay = [];
      for (let k = days - 1; k >= 0; k--) {
        const d = U.addDays(U.today(), -k);
        const dl = list.filter(i => i.date === d);
        perDay.push({ d, n: dl.length, not: dl.filter(i => i.resisted).length });
      }
      let streak = 0, k = U.today();
      const daysWith = new Set(H.logs().map(i => i.date));
      if (!daysWith.has(k)) k = U.addDays(k, -1);
      while (daysWith.has(k)) { streak++; k = U.addDays(k, -1); }
      return { total: list.length, not, stopped, early, areas: tag('área:'), sits: tag('sit:'), perDay, streak, all: H.logs().length, allNot: H.logs().filter(i => i.resisted).length };
    },

    // Cartão da tela Hoje
    card() {
      const t = H.today();
      const not = t.filter(i => i.resisted).length;
      return `
        <div class="card hrt-card">
          <div class="section-head">
            <h3>✋ Treino anti-coçar</h3>
            <button class="icon-btn subtle" data-action="hrt-settings" aria-label="Ajustes">⚙️</button>
          </div>
          <div class="hrt-today">
            <div><b>${t.length}</b><small>vontades percebidas hoje</small></div>
            <div><b class="ok">${not}</b><small>sem coçar</small></div>
          </div>
          <button class="btn hrt-btn block big" data-action="hrt">✋ Estou com vontade de coçar</button>
          <div class="row gap" style="margin-top:8px">
            <button class="btn soft" style="flex:1" data-action="hrt-aware">✓ Percebi e já fiz</button>
            <button class="btn soft" style="flex:1" data-action="hrt-sim">🎓 Simular</button>
          </div>
          <button class="link-btn center-link" data-action="hrt-learn">Como funciona a técnica</button>
        </div>`;
    },

    // Cartão da aba Progresso
    progressCard() {
      const s = H.stats(14);
      if (!s.all) return `<div class="card" id="hrtCard"><h3>✋ Treino anti-coçar</h3><p class="empty">Toque em ✋ sempre que sentir vontade de coçar. Seus números aparecem aqui: quantas vezes percebeu, quantas não coçou, onde e quando acontece.</p></div>`;
      const max = Math.max(1, ...s.perDay.map(p => p.n));
      const pct = s.total ? Math.round(s.not / s.total * 100) : 0;
      return `
        <div class="card" id="hrtCard">
          <h3>✋ Treino anti-coçar · 14 dias</h3>
          <div class="tiles">
            <div class="tile"><span>👁️</span><b>${s.total}</b><small>vontades percebidas</small></div>
            <div class="tile"><span>💪</span><b>${pct}%</b><small>sem coçar</small></div>
            <div class="tile"><span>🌱</span><b>${s.total ? Math.round(s.early / s.total * 100) : 0}%</b><small>pegas no início</small></div>
          </div>
          <div class="hrt-bars">${s.perDay.map(p => `<div class="hb" title="${U.fmtShort(p.d)}: ${p.n} vontades, ${p.not} sem coçar"><i style="height:${p.n / max * 100}%"><em style="height:${p.n ? p.not / p.n * 100 : 0}%"></em></i></div>`).join('')}</div>
          <div class="chart-x"><span>${U.fmtShort(s.perDay[0].d)}</span><span>hoje</span></div>
          <div class="legend"><span><i class="mood"></i>Sem coçar</span><span><i class="anx" style="background:var(--surface-3)"></i>Percebidas</span></div>
          ${(() => { const ns = H.nightShare(); return ns && ns.pct >= 30 ? `<p class="insight">🌙 <b>${ns.pct}%</b> das suas vontades (últimos 30 dias) acontecem no horário da noite (${esc(H.cfg().nightFrom)}–${esc(H.cfg().nightTo)}). ${H.cfg().night ? 'O modo noite está ativo para te ajudar nesse horário.' : 'Ative o modo noite nos ajustes do treino.'}</p>` : ''; })()}
          ${s.stopped ? `<p class="insight">🤚 Em <b>${s.stopped}</b> ${s.stopped === 1 ? 'vez' : 'vezes'} você começou a coçar e interrompeu. Isso também é treino.</p>` : ''}
          ${s.areas.length ? `<p class="muted small">Onde mais aparece:</p><div class="chips static">${s.areas.slice(0, 5).map(([t, n]) => `<span class="chip">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
          ${s.sits.length ? `<p class="muted small" style="margin-top:10px">Em que situações:</p><div class="chips static">${s.sits.slice(0, 5).map(([t, n]) => `<span class="chip">${esc(t)} · ${n}</span>`).join('')}</div>` : ''}
          <p class="muted small" style="margin-top:12px">🔥 ${U.plural(s.streak, 'dia seguido', 'dias seguidos')} treinando · ${s.allNot} vontades vencidas no total</p>
        </div>`;
    }
  };

  window.H = H;
})();
