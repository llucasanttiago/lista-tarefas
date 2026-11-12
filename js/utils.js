// Utilidades: datas, escape de HTML, sons, toasts, modais, efeitos.
(function () {
  const pad = n => String(n).padStart(2, '0');

  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  };

  // ---- Áudio (Web Audio, sem arquivos) ----
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, start, dur, vol = 0.12, type = 'sine') {
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    const t0 = c.currentTime + start;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

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

    soundOn() { return store.get('raiz-sound', 'on') !== 'off'; },
    play(kind) {
      if (!U.soundOn()) return;
      try {
        if (kind === 'done') { tone(660, 0, 0.25); tone(990, 0.09, 0.4, 0.1); }
        else if (kind === 'task') { tone(740, 0, 0.22, 0.09); }
        else if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.6, 0.11)); }
        else if (kind === 'bell') { tone(528, 0, 4, 0.18); tone(1056, 0, 2.5, 0.04); tone(792, 0.02, 3, 0.03); }
        else if (kind === 'soft') { tone(440, 0, 0.5, 0.06); }
        else if (kind === 'achievement') { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.5, 0.09, 'triangle')); }
      } catch { /* ignore */ }
    },
    vibrate(p = 15) { try { navigator.vibrate && navigator.vibrate(p); } catch { /* ignore */ } },

    confetti(opts = {}) {
      if (!window.confetti) return;
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

    toast(html, type = 'info') {
      const box = document.getElementById('toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.innerHTML = html;
      box.appendChild(el);
      setTimeout(() => el.classList.add('out'), 3400);
      setTimeout(() => el.remove(), 3800);
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
      requestAnimationFrame(() => wrap.classList.add('open'));
      let closed = false;
      const close = () => {
        if (closed) return; closed = true;
        wrap.classList.remove('open');
        setTimeout(() => wrap.remove(), 220);
        onClose && onClose();
      };
      wrap.addEventListener('click', e => {
        if ((dismissable && e.target === wrap) || e.target.closest('[data-close]')) close();
      });
      return { el: wrap.querySelector('.modal'), close };
    },

    download(filename, text) {
      const blob = new Blob([text], { type: 'application/json' });
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
