// Motor de som: efeitos sintetizados (sem arquivos) e sons ambientes.
// Tudo passa por um compressor e um volume geral, com um pouco de reverb.
(function () {
  let ctx = null, master = null, comp = null, verb = null, verbIn = null;
  const pref = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = Snd.volume();
    comp.connect(master).connect(ctx.destination);
    // reverb curto gerado na hora (sala pequena)
    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    verbIn = ctx.createGain(); verbIn.gain.value = 0.22;
    verbIn.connect(verb).connect(comp);
    return ctx;
  }

  // Desbloqueia o áudio no primeiro toque (exigência dos navegadores)
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, () => { if (Snd.on() || Amb.current) init(); }, { once: true, passive: true }));

  // ---------------------------------------------------------------- primitivas
  function tone(freq, start, dur, { vol = 0.2, type = 'sine', attack = 0.008, wet = false, slide = 0, detune = 0 } = {}) {
    const c = init(); if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(comp);
    if (wet) g.connect(verbIn);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // timbre de marimba/sino: fundamental + harmônicos que caem rápido
  function mallet(freq, start = 0, vol = 0.22, dur = 0.5, wet = true) {
    tone(freq, start, dur, { vol, type: 'sine', wet });
    tone(freq * 4, start, dur * 0.25, { vol: vol * 0.25, type: 'sine', wet });
    tone(freq * 2.01, start, dur * 0.5, { vol: vol * 0.18, type: 'triangle', wet });
  }
  function bell(freq, start = 0, vol = 0.22, dur = 4) {
    [[1, 1], [2.0, 0.5], [2.76, 0.35], [5.4, 0.18], [8.9, 0.08]].forEach(([m, v]) =>
      tone(freq * m, start, dur / Math.sqrt(m), { vol: vol * v, wet: true, attack: 0.004 }));
  }
  let noiseBuf = null;
  function noise() {
    const c = init(); if (!c) return null;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function burst(start, dur, { vol = 0.15, freq = 2000, q = 1, type = 'bandpass', sweep = 0 } = {}) {
    const c = init(); if (!c) return;
    const t0 = c.currentTime + start;
    const s = c.createBufferSource(); s.buffer = noise();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(comp);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  // escala pentatônica: cada hábito do dia toca uma nota mais alta
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
  const note = i => PENTA[Math.max(0, Math.min(PENTA.length - 1, i))];

  const SOUNDS = {
    tap() { tone(1800, 0, 0.04, { vol: 0.05, type: 'triangle' }); },
    pop() { tone(600, 0, 0.12, { vol: 0.16, slide: 2.2 }); },
    // n = quantos hábitos já foram feitos hoje (sobe a nota)
    done(n = 0) {
      const f = note(n);
      mallet(f, 0, 0.24, 0.5);
      mallet(f * 1.5, 0.08, 0.2, 0.7);
      burst(0, 0.12, { vol: 0.04, freq: 6000, q: 0.7, type: 'highpass' });
    },
    step(n = 0) { mallet(note(n) * 0.75, 0, 0.18, 0.35); },
    undo() { tone(500, 0, 0.18, { vol: 0.12, slide: 0.6, type: 'triangle' }); },
    task() { mallet(987.77, 0, 0.18, 0.35); mallet(1318.5, 0.07, 0.14, 0.45); },
    coin() {
      tone(987.77, 0, 0.09, { vol: 0.12, type: 'square' });
      tone(1318.51, 0.08, 0.35, { vol: 0.12, type: 'square' });
      tone(2637, 0.08, 0.3, { vol: 0.03, wet: true });
    },
    coins() { [0, 0.07, 0.14, 0.21, 0.3].forEach((t, i) => { tone(1318.5 + i * 90, t, 0.18, { vol: 0.07, type: 'square' }); }); },
    combo(n = 2) {
      const f = note(Math.min(10, n + 2));
      tone(f, 0, 0.12, { vol: 0.13, type: 'triangle' });
      tone(f * 1.25, 0.06, 0.12, { vol: 0.13, type: 'triangle' });
      tone(f * 1.5, 0.12, 0.3, { vol: 0.15, type: 'triangle', wet: true });
    },
    level() {
      // fanfarra curta: I – IV – V – I
      [[523.25, 659.25, 783.99], [698.46, 880, 1046.5], [783.99, 987.77, 1174.66], [1046.5, 1318.51, 1567.98]].forEach((ch, i) =>
        ch.forEach(f => tone(f, i * 0.16, i === 3 ? 1.4 : 0.3, { vol: 0.09, type: 'triangle', wet: true })));
      burst(0.48, 0.8, { vol: 0.05, freq: 8000, type: 'highpass' });
    },
    achievement() {
      [784, 988, 1175, 1568, 1976].forEach((f, i) => mallet(f, i * 0.08, 0.16, 0.7));
      tone(1568, 0.4, 1.2, { vol: 0.06, wet: true });
    },
    perfect() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => mallet(f, i * 0.07, 0.17, 0.9));
      [523.25, 783.99, 1046.5].forEach(f => tone(f, 0.5, 2, { vol: 0.07, type: 'triangle', wet: true }));
    },
    streak() {
      burst(0, 0.5, { vol: 0.12, freq: 400, sweep: 8, q: 0.8 });
      mallet(880, 0.25, 0.2, 0.6); mallet(1318.5, 0.35, 0.2, 0.9);
    },
    chestShake() { tone(140, 0, 0.12, { vol: 0.2, type: 'triangle', slide: 0.7 }); burst(0, 0.1, { vol: 0.08, freq: 900, q: 2 }); },
    chestOpen(rarity = 0) {
      burst(0, 0.5, { vol: 0.14, freq: 300, sweep: 12, q: 0.6 });
      const base = [659.25, 783.99, 880, 1046.5][rarity] || 659.25;
      [1, 1.25, 1.5, 2, 2.5, 3].slice(0, 3 + rarity).forEach((m, i) => mallet(base * m, 0.2 + i * 0.08, 0.17, 0.9));
      if (rarity >= 2) tone(base * 2, 0.7, 2.2, { vol: 0.08, wet: true });
    },
    reminder() { mallet(880, 0, 0.22, 0.5); mallet(1174.66, 0.18, 0.22, 0.5); mallet(1760, 0.36, 0.18, 0.9); },
    error() { tone(196, 0, 0.18, { vol: 0.14, type: 'sawtooth' }); tone(185, 0.12, 0.25, { vol: 0.12, type: 'sawtooth' }); },
    whoosh() { burst(0, 0.28, { vol: 0.05, freq: 800, sweep: 4, q: 0.5 }); },
    soft() { mallet(523.25, 0, 0.12, 0.6); },
    bell() { bell(528, 0, 0.26, 5); },
    gong() { bell(196, 0, 0.3, 7); bell(392, 0.02, 0.12, 5); },
    breathIn(sec = 4) {
      const c = init(); if (!c) return;
      tone(220, 0, sec, { vol: 0.05, attack: sec * 0.8, slide: 1.5, wet: true });
      burst(0, sec, { vol: 0.03, freq: 500, sweep: 3, q: 0.4, type: 'lowpass' });
    },
    breathOut(sec = 4) {
      tone(330, 0, sec, { vol: 0.05, attack: 0.3, slide: 0.66, wet: true });
      burst(0, sec, { vol: 0.03, freq: 1500, sweep: 0.3, q: 0.4, type: 'lowpass' });
    },
    hold() { tone(440, 0, 0.3, { vol: 0.04, wet: true }); },
    tick() { tone(2400, 0, 0.03, { vol: 0.05, type: 'square' }); },
    start() { mallet(659.25, 0, 0.2, 0.4); mallet(987.77, 0.1, 0.2, 0.6); },
    timerEnd() { [0, 0.5, 1].forEach(t => { mallet(1046.5, t, 0.22, 0.4); mallet(1318.5, t + 0.12, 0.22, 0.5); }); }
  };

  // ---------------------------------------------------------------- ambiente
  // Sons contínuos gerados em tempo real (chuva, mar, ruído marrom, lareira).
  const Amb = {
    current: null, nodes: null,
    LIST: { chuva: '🌧️ Chuva', mar: '🌊 Mar', marrom: '🟤 Ruído marrom', lareira: '🔥 Lareira', floresta: '🌲 Floresta' },
    start(kind) {
      Amb.stop();
      if (!kind || !Amb.LIST[kind]) return;
      const c = init(); if (!c) return;
      const out = c.createGain();
      out.gain.setValueAtTime(0.0001, c.currentTime);
      out.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 2.5);
      out.connect(master);
      const len = c.sampleRate * 4, buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let last = 0, b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (kind === 'marrom' || kind === 'mar') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
          else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16; }
        }
      }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter();
      const g = c.createGain();
      const timers = [];
      const extra = [];
      if (kind === 'chuva') { f.type = 'highpass'; f.frequency.value = 900; g.gain.value = 0.5; }
      else if (kind === 'marrom') { f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0.55; }
      else if (kind === 'floresta') { f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.3; g.gain.value = 0.12; }
      else if (kind === 'lareira') { f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.5; }
      else if (kind === 'mar') {
        f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0.25;
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 0.085; lg.gain.value = 0.22;
        lfo.connect(lg).connect(g.gain); lfo.start();
        const lf2 = c.createOscillator(), lg2 = c.createGain();
        lf2.frequency.value = 0.085; lg2.gain.value = 500;
        lf2.connect(lg2).connect(f.frequency); lf2.start();
        extra.push(lfo, lf2);
      }
      src.connect(f).connect(g).connect(out);
      src.start();
      // detalhes aleatórios: gotas, estalos, passarinhos
      const sched = (fn, min, max) => {
        const loop = () => { fn(); timers.push(setTimeout(loop, min + Math.random() * (max - min))); };
        timers.push(setTimeout(loop, min));
      };
      const blip = (freq, dur, vol, type = 'sine', slide = 0) => {
        const t0 = c.currentTime, o = c.createOscillator(), gg = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
        gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
        gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(gg).connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
      };
      if (kind === 'chuva') sched(() => blip(1800 + Math.random() * 2500, 0.05, 0.02 + Math.random() * 0.03, 'sine', 0.5), 60, 260);
      if (kind === 'lareira') sched(() => {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) setTimeout(() => blip(800 + Math.random() * 3000, 0.015, 0.06 + Math.random() * 0.08, 'square', 0.3), i * 30);
      }, 90, 700);
      if (kind === 'floresta') sched(() => {
        const base = 2500 + Math.random() * 2000, n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) setTimeout(() => blip(base * (1 + Math.random() * 0.2), 0.08, 0.035, 'sine', 1.3), i * 110);
      }, 1800, 6000);
      Amb.current = kind;
      Amb.nodes = { src, out, timers, extra };
    },
    stop() {
      if (!Amb.nodes || !ctx) { Amb.current = null; return; }
      const { src, out, timers, extra } = Amb.nodes;
      timers.forEach(clearTimeout);
      const t = ctx.currentTime;
      try {
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        src.stop(t + 1.3); extra.forEach(o => o.stop(t + 1.3));
      } catch { /* ignore */ }
      Amb.nodes = null; Amb.current = null;
    }
  };

  const Snd = {
    on() { return pref('raiz-sound', 'on') !== 'off'; },
    volume() { return Math.max(0, Math.min(1, +pref('raiz-volume', '0.8'))); },
    setVolume(v) {
      try { localStorage.setItem('raiz-volume', String(v)); } catch { /* ignore */ }
      if (master) master.gain.value = v;
    },
    play(kind, arg) {
      if (!Snd.on()) return;
      try { const fn = SOUNDS[kind]; if (fn) fn(arg); } catch (e) { console.warn(e); }
    },
    Amb
  };
  window.Snd = Snd;
})();
