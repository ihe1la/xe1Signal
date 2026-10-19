/* Shared escalating horror audio (Web Audio API) — dissonant drones, stabs, screams. */
(function (global) {
  let ctx = null;
  let master = null;
  let started = false;
  let heartbeat = null;
  let drone = null;
  let whisper = null;
  let lastPhase = -1;
  let lastTickAt = 0;
  let lastScareAt = 0;
  let mix = 1; // 0 silent → 1 full horror

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.42 * mix;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    if (!started) {
      started = true;
      startDrone();
      startWhisper();
      startHeartbeat(0);
      stringStab();
    }
  }

  function tone(freq, dur, type, gain, slideTo) {
    const c = ensure();
    if (!c || !started) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = type || "sawtooth";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
    }
    f.type = "lowpass";
    f.frequency.value = Math.min(8000, freq * 8);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + dur + 0.03);
  }

  function makeNoiseBuffer(seconds) {
    const c = ensure();
    const n = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseBurst(dur, gain, opts) {
    const c = ensure();
    if (!c || !started) return;
    opts = opts || {};
    const src = c.createBufferSource();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    src.buffer = makeNoiseBuffer(Math.max(dur, 0.05));
    f.type = opts.type || "bandpass";
    f.frequency.value = opts.freq || 700 + Math.random() * 1600;
    f.Q.value = opts.q || 4;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }

  /** Rising dissonant scream / violin scrape */
  function scream(dur, gain) {
    const c = ensure();
    if (!c || !started) return;
    dur = dur || 0.9;
    gain = gain || 0.22;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o1.type = "sawtooth";
    o2.type = "square";
    o1.frequency.setValueAtTime(220, c.currentTime);
    o1.frequency.exponentialRampToValueAtTime(1400, c.currentTime + dur * 0.7);
    o1.frequency.exponentialRampToValueAtTime(180, c.currentTime + dur);
    o2.frequency.setValueAtTime(233, c.currentTime);
    o2.frequency.exponentialRampToValueAtTime(1511, c.currentTime + dur * 0.7);
    f.type = "bandpass";
    f.frequency.setValueAtTime(600, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(2400, c.currentTime + dur * 0.5);
    f.Q.value = 8;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(gain * 0.8, c.currentTime + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o1.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(master);
    o1.start();
    o2.start();
    o1.stop(c.currentTime + dur + 0.02);
    o2.stop(c.currentTime + dur + 0.02);
    noiseBurst(dur * 0.6, gain * 0.45, { freq: 1800, q: 2, type: "highpass" });
  }

  /** Classic horror string stab (dissonant cluster) */
  function stringStab() {
    const c = ensure();
    if (!c || !started) return;
    // minor second + tritone cluster
    const freqs = [110, 116.5, 155.5, 220, 311];
    freqs.forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.55 + i * 0.05, "sawtooth", 0.07 + (i === 0 ? 0.06 : 0), freq * 0.92), i * 8);
    });
    noiseBurst(0.25, 0.16, { freq: 200, q: 1, type: "lowpass" });
  }

  /** Sub hit + metal scrape jump scare */
  function jumpScare() {
    const c = ensure();
    if (!c || !started) return;
    tone(45, 0.5, "sine", 0.35);
    tone(90, 0.35, "square", 0.12);
    scream(0.55, 0.2);
    noiseBurst(0.4, 0.28, { freq: 900, q: 0.7, type: "highpass" });
    setTimeout(() => tone(38, 0.8, "sawtooth", 0.18), 80);
  }

  function doorCreak() {
    const c = ensure();
    if (!c || !started) return;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(80, c.currentTime);
    o.frequency.linearRampToValueAtTime(190, c.currentTime + 0.4);
    o.frequency.linearRampToValueAtTime(60, c.currentTime + 0.9);
    f.type = "bandpass";
    f.frequency.value = 400;
    f.Q.value = 12;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.95);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + 1);
  }

  function startDrone() {
    const c = ensure();
    if (!c || drone) return;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const o3 = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    // tritone + beating minor second = dread
    o1.type = "sawtooth";
    o2.type = "sawtooth";
    o3.type = "sine";
    o1.frequency.value = 46;
    o2.frequency.value = 65; // ~tritone-ish against low
    o3.frequency.value = 47.2;
    f.type = "lowpass";
    f.frequency.value = 280;
    g.gain.value = 0.055;
    o1.connect(f);
    o2.connect(f);
    o3.connect(f);
    f.connect(g);
    g.connect(master);
    o1.start();
    o2.start();
    o3.start();
    drone = { o1, o2, o3, g, f };
  }

  function startWhisper() {
    const c = ensure();
    if (!c || whisper) return;
    const src = c.createBufferSource();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    src.buffer = makeNoiseBuffer(2);
    src.loop = true;
    f.type = "bandpass";
    f.frequency.value = 1200;
    f.Q.value = 6;
    g.gain.value = 0.012;
    lfo.frequency.value = 0.35;
    lfoG.gain.value = 0.01;
    lfo.connect(lfoG);
    lfoG.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
    lfo.start();
    whisper = { src, g, f, lfo };
  }

  function thud() {
    tone(55, 0.14, "sine", 0.28);
    tone(40, 0.22, "triangle", 0.16);
    noiseBurst(0.08, 0.1, { freq: 120, type: "lowpass", q: 1 });
  }

  function startHeartbeat(intensity) {
    const c = ensure();
    if (!c) return;
    if (heartbeat) clearInterval(heartbeat);
    const interval = Math.max(240, 880 - intensity * 560);
    const beat = () => {
      if (!started) return;
      thud();
      setTimeout(() => {
        tone(48, 0.18, "sine", 0.14 + intensity * 0.12);
      }, 95);
    };
    beat();
    heartbeat = setInterval(beat, interval);
  }

  function stinger() {
    stringStab();
    setTimeout(() => scream(0.7, 0.16), 40);
  }

  function endScream() {
    const c = ensure();
    if (!c || !started) return;
    jumpScare();
    setTimeout(() => scream(1.4, 0.28), 120);
    setTimeout(() => {
      tone(55, 1.8, "sawtooth", 0.22, 28);
      noiseBurst(1.5, 0.3, { freq: 400, type: "lowpass", q: 0.5 });
    }, 200);
    setTimeout(() => scream(1.1, 0.24), 500);
    setTimeout(() => tone(30, 2.2, "square", 0.15), 300);
  }

  function update(progress, running) {
    if (!started || !running) return;
    const c = ensure();
    if (!c) return;

    let phase = 0;
    const left = 1 - progress;
    if (left <= 0.12) phase = 4;
    else if (left <= 0.28) phase = 3;
    else if (left <= 0.5) phase = 2;
    else if (left <= 0.75) phase = 1;

    const intensity = Math.min(1, Math.pow(progress, 1.05));

    if (drone) {
      drone.g.gain.setTargetAtTime(0.05 + intensity * 0.16, c.currentTime, 0.25);
      drone.o1.frequency.setTargetAtTime(42 + intensity * 28, c.currentTime, 0.35);
      drone.o2.frequency.setTargetAtTime(58 + intensity * 50, c.currentTime, 0.35);
      drone.o3.frequency.setTargetAtTime(43.5 + intensity * 30, c.currentTime, 0.35);
      drone.f.frequency.setTargetAtTime(260 + intensity * 900, c.currentTime, 0.4);
    }
    if (whisper) {
      whisper.g.gain.setTargetAtTime(0.01 + intensity * 0.06, c.currentTime, 0.3);
      whisper.f.frequency.setTargetAtTime(900 + intensity * 1400, c.currentTime, 0.4);
      whisper.f.Q.setTargetAtTime(4 + intensity * 10, c.currentTime, 0.4);
    }

    if (phase !== lastPhase) {
      lastPhase = phase;
      startHeartbeat(intensity);
      if (phase === 1) doorCreak();
      if (phase === 2) stinger();
      if (phase === 3) {
        jumpScare();
        setTimeout(doorCreak, 200);
      }
      if (phase === 4) {
        jumpScare();
        setTimeout(() => scream(0.8, 0.22), 150);
      }
    }

    // clock ticks → bone clicks
    const tickEvery = phase >= 4 ? 160 : phase >= 3 ? 280 : phase >= 2 ? 480 : phase >= 1 ? 700 : 0;
    if (tickEvery && c.currentTime - lastTickAt > tickEvery / 1000) {
      lastTickAt = c.currentTime;
      tone(1400 + intensity * 800, 0.035, "square", 0.035 + intensity * 0.07);
      tone(90, 0.05, "triangle", 0.04 + intensity * 0.05);
      if (phase >= 3 && Math.random() < 0.45) {
        noiseBurst(0.12, 0.1 + intensity * 0.12, { freq: 2200, type: "highpass", q: 1 });
      }
    }

    // random scares near the end
    if (phase >= 3 && c.currentTime - lastScareAt > (phase >= 4 ? 1.1 : 2.2)) {
      if (Math.random() < (phase >= 4 ? 0.55 : 0.3)) {
        lastScareAt = c.currentTime;
        if (Math.random() < 0.4) scream(0.45 + Math.random() * 0.4, 0.12 + intensity * 0.1);
        else if (Math.random() < 0.5) doorCreak();
        else stringStab();
      }
    }

    if (phase >= 4 && Math.random() < 0.12) {
      tone(30 + Math.random() * 25, 0.35, "sawtooth", 0.12);
    }
  }

  function finish() {
    endScream();
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  }

  function setMix(level) {
    mix = Math.max(0, Math.min(1, level));
    const c = ensure();
    if (!c || !master) return;
    master.gain.setTargetAtTime(0.42 * mix, c.currentTime, 0.35);
  }

  function resetPhases() {
    lastPhase = -1;
    lastTickAt = 0;
    lastScareAt = 0;
  }

  function stopAll() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    started = false;
    lastPhase = -1;
    if (drone) {
      try {
        drone.o1.stop();
        drone.o2.stop();
        drone.o3.stop();
      } catch (_) {}
      drone = null;
    }
    if (whisper) {
      try {
        whisper.src.stop();
        whisper.lfo.stop();
      } catch (_) {}
      whisper = null;
    }
    if (ctx) {
      try {
        ctx.close();
      } catch (_) {}
      ctx = null;
      master = null;
    }
  }

  global.HorrorAudio = { resume, update, finish, stopAll, stinger, resetPhases, setMix };
})(window);
