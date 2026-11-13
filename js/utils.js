// Utilidades: datas, escape de HTML, sons, toasts, modais, efeitos.
(function () {
  const pad = n => String(n).padStart(2, '0');

  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  };

  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  window.U = {
    store,
    pad,
    dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); },
    addDays(k, n) { const d = U.parseKey(k); d.setDate(d.getDate() + n); return U.dateKey(d); },
    today() { return U.dateKey(); },
    // segunda-feira da semana da data
    weekStart(k) { const d = U.parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return U.dateKey(d); },
    fmtLong(k) { return U.parseKey(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); },
    fmtShort(k) { const d = U.parseKey(k); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; },
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    hour() { return new Date().getHours(); },
    minutesNow() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
    toMin(hhmm) { if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; },
    dow(k = U.today()) { return (U.parseKey(k).getDay() + 6) % 7 + 1; }, // 1=seg … 7=dom
    plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; },
    // número aleatório estável a partir de um texto (missões do dia etc.)
    seeded(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
    },
    rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    // anima um número de "from" até "to"
    countUp(el, from, to, ms = 700) {
      if (!el) return;
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },

    soundOn() { return Snd.on(); },
    play(kind, arg) { Snd.play(kind, arg); },
    pref(k, d = null) { return store.get('raiz-' + k, d); },
    setPref(k, v) { store.set('raiz-' + k, v); },
    vibrate(p = 15) {
      if (store.get('raiz-haptics', 'on') === 'off') return;
      try { navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ }
    },
    celebrationsOn() { return store.get('raiz-confetti', 'on') !== 'off'; },

    confetti(opts = {}) {
      if (!window.confetti || !U.celebrationsOn()) return;
      window.confetti(Object.assign({
        particleCount: 80, spread: 70, origin: { y: 0.7 }, disableForReducedMotion: true,
        colors: ['#34d399', '#818cf8', '#fbbf24', '#22d3ee', '#f472b6']
      }, opts));
    },
    confettiAt(el, opts = {}) {
      if (!el) return U.confetti(opts);
      const r = el.getBoundingClientRect();
      U.confetti(Object.assign({
        particleCount: 40, spread: 55, startVelocity: 25,
        origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }
      }, opts));
    },

    // toast(html, tipo, { action: 'Desfazer', onAction, ms })
    toast(html, type = 'info', opts = {}) {
      const box = document.getElementById('toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + type + (opts.action ? ' has-action' : '') + (opts.onClick ? ' clickable' : '');
      el.innerHTML = `<div class="toast-body">${html}</div>`;
      if (opts.action) {
        const b = document.createElement('button');
        b.className = 'toast-action'; b.textContent = opts.action;
        b.onclick = () => { opts.onAction && opts.onAction(); dismiss(); };
        el.appendChild(b);
      }
      while (box.children.length > 3) box.firstChild.remove();
      box.appendChild(el);
      const ms = opts.ms || (opts.action ? 5000 : 3400);
      let gone = false;
      function dismiss() {
        if (gone) return; gone = true;
        el.classList.add('out'); setTimeout(() => el.remove(), 380);
      }
      el.addEventListener('click', e => { if (!e.target.closest('.toast-action') && opts.onClick) { opts.onClick(); dismiss(); } });
      setTimeout(dismiss, ms);
      return { dismiss };
    },
    floatText(el, text, cls = '') {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'xp-float ' + cls;
      f.textContent = text;
      f.style.left = (r.left + r.width / 2) + 'px';
      f.style.top = r.top + 'px';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1300);
    },
    floatXp(el, n) {
      if (!el || !n) return;
      const r = el.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'xp-float' + (n < 0 ? ' neg' : '');
      f.textContent = (n > 0 ? '+' : '') + n + ' XP';
      f.style.left = (r.left + r.width / 2) + 'px';
      f.style.top = r.top + 'px';
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 1200);
    },

    // Modal genérico. Retorna { el, close }.
    modal(html, { onClose, cls = '', dismissable = true } = {}) {
      const root = document.getElementById('modal-root');
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
      root.appendChild(wrap);
      document.body.classList.add('modal-open');
      void wrap.offsetWidth; wrap.classList.add('open'); // força o layout para a animação de entrada rodar
      let closed = false;
      const close = () => {
        if (closed) return; closed = true;
        wrap.classList.remove('open');
        document.removeEventListener('keydown', onEsc);
        setTimeout(() => { wrap.remove(); if (!root.children.length) document.body.classList.remove('modal-open'); }, 220);
        onClose && onClose();
      };
      wrap.addEventListener('click', e => {
        if ((dismissable && e.target === wrap) || e.target.closest('[data-close]')) close();
      });
      function onEsc(e) { if (e.key === 'Escape' && dismissable && root.lastElementChild === wrap) close(); }
      document.addEventListener('keydown', onEsc);
      return { el: wrap.querySelector('.modal'), close };
    },

    download(filename, text, type = 'application/json') {
      const blob = new Blob([text], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    async wakeLock() {
      try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { return null; }
    }
  };
})();
