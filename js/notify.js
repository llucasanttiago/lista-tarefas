// Notificações locais e lembretes enquanto o app está aberto (ou em segundo plano).
// Os lembretes com o app FECHADO vêm do servidor (função "lembretes" no Supabase).
(function () {
  const timers = new Map(); // id -> timeout
  let tickIv = null, lastTick = U.minutesNow();

  const N = {
    supported() { return 'Notification' in window; },
    granted() { return N.supported() && Notification.permission === 'granted'; },

    async request() {
      if (!N.supported()) { U.toast('Este navegador não suporta notificações.', 'error'); return false; }
      if (Notification.permission === 'denied') {
        U.toast('As notificações estão bloqueadas para este site. Libere nas configurações do navegador (cadeado ao lado do endereço).', 'error', { ms: 6000 });
        return false;
      }
      const p = await Notification.requestPermission();
      return p === 'granted';
    },

    // Mostra uma notificação do sistema (via service worker quando possível)
    async show(title, body, { tag = 'raiz', url = './', requireInteraction = false, silent = false } = {}) {
      if (!N.granted()) return false;
      const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url }, renotify: true, requireInteraction, silent, vibrate: [80, 60, 80] };
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, opts);
          return true;
        }
        new Notification(title, opts);
        return true;
      } catch (e) { console.warn(e); return false; }
    },

    // Alarme: se o app está na tela, toca som e mostra aviso; se não, notificação do sistema.
    alert(title, body, { tag, sound = 'reminder', action, onAction, url } = {}) {
      if (!document.hidden) {
        U.play(sound); U.vibrate([60, 60, 60, 60, 120]);
        U.toast(`<b>${title}</b><br>${body}`, 'gold', { action, onAction, ms: 9000 });
      } else {
        N.show(title, body, { tag, url, requireInteraction: true });
        U.play(sound);
      }
    },

    // Agenda um alarme único (cancelável) para daqui a "ms"
    at(id, ms, fn) {
      N.cancel(id);
      timers.set(id, setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, ms)));
    },
    cancel(id) { if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); } },

    // ---------------------------------------------------------------- lembretes locais (minuto a minuto)
    start() {
      if (tickIv) return;
      lastTick = U.minutesNow();
      tickIv = setInterval(N.tick, 20000);
    },
    // Envia de verdade só se a função do servidor não for cuidar disso (evita duplicar)
    serverCovers() { return P.push.state === 'on'; },
    sentKey(k) { return `raiz-local-sent-${U.today()}-${k}`; },
    once(k) {
      if (U.store.get(N.sentKey(k))) return false;
      U.store.set(N.sentKey(k), '1');
      return true;
    },
    tick() {
      if (!S.profile) return;
      const now = U.minutesNow();
      const passed = at => at !== null && (lastTick < now ? at > lastTick && at <= now : at > lastTick || at <= now);
      const t = U.today();
      const showNames = !!P.settings().showNames;

      // Lembrete de cada hábito
      G.visibleHabits().forEach(h => {
        const at = U.toMin(h.remind_at);
        if (!passed(at) || G.isDone(h.id, t) || !N.once('h' + h.id)) return;
        if (document.hidden && N.serverCovers()) return;
        N.alert(`${h.icon} ${showNames || !document.hidden ? U.esc(h.name) : 'Hora do seu hábito'}`, 'Um passo pequeno agora. Bora?',
          { tag: 'raiz-h-' + h.id, action: 'Começar', onAction: () => F.start(h.id) });
      });

      // Sequência em risco
      const r = P.settings();
      const streakAt = U.toMin(r.streakAt || '20:30');
      if (r.streak !== false && passed(streakAt) && !G.activeDates().has(t) && G.streak() > 0 && N.once('streak')) {
        if (!(document.hidden && N.serverCovers())) {
          N.alert('🔥 Sua sequência está em risco', `Faça 1 hábito hoje para manter seus ${G.streak()} dias.`, { tag: 'raiz-streak', sound: 'streak' });
        }
      }
      H.tickReminder();
      lastTick = now;
      App.refreshLive && App.refreshLive();
    }
  };

  window.N = N;
})();
