// 音はすべて Web Audio で合成する（外部ファイルなし）

const PENTA = [261.63, 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99, 880]; // 都節っぽい五音

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.bgmOn = false; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : .8;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = .32;
    this.music.connect(this.master);
    const len = ctx.sampleRate * .5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(1.8);
    const wet = ctx.createGain(); wet.gain.value = .3;
    this.verb.connect(wet).connect(this.master);
  }

  impulse(sec) {
    const ctx = this.ctx, n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    return b;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : .8, this.ctx.currentTime, .05);
  }

  tone(f, t0, dur, { type = 'triangle', vol = .2, out, verb = .3, glide } = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .008);
    g.gain.exponentialRampToValueAtTime(.0005, t0 + dur);
    o.connect(g).connect(out || this.master);
    if (verb) { const s = ctx.createGain(); s.gain.value = verb; g.connect(s).connect(this.verb); }
    o.start(t0); o.stop(t0 + dur + .05);
  }

  hit(t0, { freq = 1800, q = 1.2, vol = .5, dur = .08, type = 'bandpass' } = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t0); s.stop(t0 + dur + .02);
  }

  now() { return this.ctx ? this.ctx.currentTime + .005 : 0; }

  // 札を場に打つ「パチッ」
  place() { const t = this.now(); this.hit(t, { freq: 2600, q: 2, vol: .55, dur: .05 }); this.tone(180, t, .08, { type: 'sine', vol: .25, verb: 0 }); }
  tap() { const t = this.now(); this.tone(1200, t, .05, { type: 'sine', vol: .08, verb: 0 }); }
  flip() { const t = this.now(); this.hit(t, { freq: 4000, q: .8, vol: .18, dur: .12, type: 'highpass' }); }
  capture() {
    const t = this.now();
    this.hit(t, { freq: 2200, q: 2, vol: .45, dur: .05 });
    this.tone(784, t + .02, .25, { vol: .1 }); this.tone(1046.5, t + .08, .3, { vol: .09 });
  }
  yaku() {
    const t = this.now();
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * .07, .6, { vol: .13, type: 'square', verb: .5 }));
    this.taiko(t);
  }
  taiko(t = this.now(), vol = .9) {
    this.tone(110, t, .45, { type: 'sine', vol, glide: 55, verb: .4 });
    this.hit(t, { freq: 300, q: .7, vol: .4, dur: .12, type: 'lowpass' });
  }
  koikoi() { const t = this.now(); this.taiko(t); this.taiko(t + .18, .7); [880, 1174.7].forEach((f, i) => this.tone(f, t + .3 + i * .1, .4, { vol: .1, type: 'sawtooth' })); }
  noise_() { const t = this.now(); for (let i = 0; i < 5; i++) this.tone(80 + Math.random() * 600, t + i * .05, .08, { type: 'square', vol: .06, verb: 0 }); }
  win() { const t = this.now(); [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * .12, .5, { vol: .12, verb: .5 })); }
  lose() { const t = this.now(); [392, 349.23, 293.66, 261.63].forEach((f, i) => this.tone(f, t + i * .2, .6, { vol: .12, type: 'sine' })); }
  // 応援：きらきらが重なっていく
  cheer(sec = 3) {
    const t = this.now();
    for (let i = 0; i < sec * 14; i++) {
      const f = PENTA[Math.floor(Math.random() * PENTA.length)] * 2;
      this.tone(f, t + i / 14 + Math.random() * .03, .5, { vol: .05 + i / (sec * 14) * .06, type: 'sine', verb: .7 });
    }
    [261.63, 329.63, 392, 523.25].forEach(f => this.tone(f, t + sec - .4, 1.8, { vol: .1, verb: .6 }));
  }

  // BGM：五音のゆるいループ（太鼓つき）
  startBgm() {
    if (!this.ctx || this.bgmOn) return;
    this.bgmOn = true;
    const ctx = this.ctx, beat = .42;
    let next = ctx.currentTime + .1, step = 0;
    const melody = [5, -1, 4, 3, 2, -1, 3, -1, 4, 5, 7, -1, 6, 5, 4, -1, 2, 3, 4, -1, 3, 2, 0, -1, 1, 2, 3, 4, 2, -1, -1, -1];
    const bass = [0, 0, 3, 3, 2, 2, 0, 0];
    const tick = () => {
      if (!this.bgmOn) return;
      while (next < ctx.currentTime + .6) {
        const n = melody[step % melody.length];
        if (n >= 0) this.tone(PENTA[n] , next, beat * 1.6, { type: 'triangle', vol: .09, out: this.music, verb: .25 });
        if (step % 4 === 0) this.tone(PENTA[bass[(step / 4) % 8]] / 2, next, beat * 3.5, { type: 'sine', vol: .12, out: this.music, verb: 0 });
        if (step % 8 === 0) this.tone(90, next, .35, { type: 'sine', vol: .25, glide: 50, out: this.music, verb: 0 });
        if (step % 8 === 6) this.tone(1600, next, .05, { type: 'square', vol: .02, out: this.music, verb: 0 });
        next += beat; step++;
      }
      this.bgmTimer = setTimeout(tick, 200);
    };
    tick();
  }
  stopBgm() { this.bgmOn = false; clearTimeout(this.bgmTimer); }
}
