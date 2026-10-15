// 背景の仮想世界〈ハルカ〉：白い空間に浮かぶ島と、漂うアバターたち。ノイズの侵食と、世界の応援もここで描く。

const COLORS = ['#ff7ab6', '#5fc8ff', '#ffd23f', '#7be08a', '#b18cff', '#ff9a5a', '#4fe0d0', '#ff6f6f', '#9ad0ff', '#f7a8e0'];
const EARS = ['rabbit', 'cat', 'bear', 'none', 'rabbit', 'antenna'];

export function makeAvatar(r = Math.random) {
  return {
    color: COLORS[Math.floor(r() * COLORS.length)],
    ear: EARS[Math.floor(r() * EARS.length)],
    belly: r() < .5,
    eye: r() < .7 ? 'dot' : 'smile',
  };
}

export function drawAvatar(g, a, x, y, s, t = 0) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.lineWidth = 3; g.strokeStyle = '#fff';
  g.fillStyle = a.color;
  // 耳
  if (a.ear === 'rabbit') {
    for (const k of [-1, 1]) { g.beginPath(); g.ellipse(k * 7, -22, 5, 13, k * .15 + Math.sin(t * 3) * .05, 0, Math.PI * 2); g.fill(); g.stroke(); }
  } else if (a.ear === 'cat') {
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 4, -14); g.lineTo(k * 14, -22); g.lineTo(k * 15, -6); g.closePath(); g.fill(); g.stroke(); }
  } else if (a.ear === 'bear') {
    for (const k of [-1, 1]) { g.beginPath(); g.arc(k * 12, -12, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
  } else if (a.ear === 'antenna') {
    g.beginPath(); g.moveTo(0, -16); g.lineTo(0, -26); g.stroke();
    g.beginPath(); g.arc(0, -27, 4, 0, Math.PI * 2); g.fillStyle = '#ffd23f'; g.fill(); g.fillStyle = a.color;
  }
  g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill(); g.stroke();
  if (a.belly) { g.beginPath(); g.ellipse(0, 7, 8, 6, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.65)'; g.fill(); }
  g.fillStyle = '#222';
  if (a.eye === 'dot') { for (const k of [-1, 1]) { g.beginPath(); g.arc(k * 5.5, -3, 2.2, 0, Math.PI * 2); g.fill(); } }
  else { g.strokeStyle = '#222'; g.lineWidth = 1.8; for (const k of [-1, 1]) { g.beginPath(); g.arc(k * 5.5, -2, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  g.fillStyle = 'rgba(255,120,150,.45)';
  for (const k of [-1, 1]) { g.beginPath(); g.arc(k * 10, 3, 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

export class World {
  constructor(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.dark = 0; this.darkTo = 0;
    this.t = 0;
    this.flyers = [];
    this.sparks = [];
    this.islands = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: .1 + i * .13 + Math.random() * .05, r: .12 + Math.random() * .14, ph: Math.random() * 6 }));
    this.floaters = Array.from({ length: 22 }, () => this.newFloater(true));
    this.resize();
    addEventListener('resize', () => this.resize());
    this.last = 0;
    const loop = now => {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      if (now - this.last < 32) return;
      const dt = Math.min(.1, (now - this.last) / 1000 || .03);
      this.last = now;
      this.step(dt);
      this.draw();
    };
    requestAnimationFrame(loop);
  }

  newFloater(anywhere) {
    return {
      a: makeAvatar(), x: Math.random(), y: anywhere ? Math.random() : 1.1,
      s: .45 + Math.random() * .5, vy: -(0.008 + Math.random() * .015), ph: Math.random() * 6,
    };
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setDark(v) { this.darkTo = Math.max(0, Math.min(1, v)); }

  // 世界中のアバターが画面の中心（tx,ty）めがけて飛んでくる
  cheer(n = 160, sec = 3.2, tx = .5, ty = .62) {
    for (let i = 0; i < n; i++) {
      const side = Math.random() * Math.PI * 2;
      this.flyers.push({
        a: makeAvatar(), delay: Math.random() * sec * .8,
        x0: .5 + Math.cos(side) * .9, y0: .5 + Math.sin(side) * .9,
        tx: tx + (Math.random() - .5) * .9, ty: ty + (Math.random() - .5) * .5,
        s: .5 + Math.random() * .6, t: 0, dur: .9 + Math.random() * .8, stay: 1.6 + Math.random() * 1.6,
      });
    }
    this.flash = 1;
  }

  spark(x, y, n = 18, colors = COLORS) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .7 + Math.random() * .5, c: colors[i % colors.length] });
    }
  }

  step(dt) {
    this.t += dt;
    this.dark += (this.darkTo - this.dark) * Math.min(1, dt * 2);
    for (const f of this.floaters) {
      f.y += f.vy * dt * 3;
      if (f.y < -.1) Object.assign(f, this.newFloater(false));
    }
    for (const f of this.flyers) f.t += dt;
    this.flyers = this.flyers.filter(f => f.t < f.delay + f.dur + f.stay + .6);
    for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    this.sparks = this.sparks.filter(p => p.life > 0);
    if (this.flash) this.flash = Math.max(0, this.flash - dt * .8);
  }

  draw() {
    const { g, w, h, t } = this;
    const d = this.dark;
    const top = mix([246, 251, 255], [30, 22, 48], d), bot = mix([214, 236, 255], [70, 26, 46], d);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, `rgb(${top})`); grd.addColorStop(1, `rgb(${bot})`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);

    // 方眼
    g.strokeStyle = `rgba(${d > .5 ? '255,80,120' : '120,170,230'},${.12 + d * .08})`;
    g.lineWidth = 1;
    const step = 36, off = (t * 8) % step;
    g.beginPath();
    for (let x = -off; x < w; x += step) { g.moveTo(x, 0); g.lineTo(x, h); }
    for (let y = -off; y < h; y += step) { g.moveTo(0, y); g.lineTo(w, y); }
    g.stroke();

    // 浮かぶ島（円盤）
    for (const is of this.islands) {
      const x = is.x * w, y = is.y * h + Math.sin(t * .6 + is.ph) * 6, r = is.r * Math.min(w, 600);
      g.fillStyle = `rgba(${d > .5 ? '90,40,80' : '170,205,240'},.35)`;
      g.beginPath(); g.ellipse(x, y + r * .18, r, r * .3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,255,255,${.75 - d * .55})`;
      g.beginPath(); g.ellipse(x, y, r, r * .28, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(95,200,255,${.5 - d * .2})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(x, y, r * .8, r * .2, 0, 0, Math.PI * 2); g.stroke();
    }

    for (const f of this.floaters) {
      drawAvatar(g, f.a, f.x * w + Math.sin(t + f.ph) * 12, f.y * h, f.s * (1 - d * .3), t + f.ph);
    }

    // ノイズの侵食：黒と赤のブロックが端からにじむ
    if (d > .02) {
      for (let i = 0; i < 26; i++) {
        const seed = Math.sin(i * 91.7 + Math.floor(t * 6) * 13.1) * 1e4;
        const rnd = seed - Math.floor(seed);
        const side = i % 2, bw = 20 + rnd * 70, bh = 6 + rnd * 22;
        const x = side ? w - bw * d * 1.6 * rnd : 0, y = ((i * 97) % 100) / 100 * h;
        g.fillStyle = i % 3 ? `rgba(10,8,20,${d * .55})` : `rgba(255,40,90,${d * .45})`;
        g.fillRect(x, y, bw * d * 1.6, bh);
      }
    }

    for (const f of this.flyers) {
      const k = f.t - f.delay;
      if (k < 0) continue;
      const p = Math.min(1, k / f.dur), e = 1 - Math.pow(1 - p, 3);
      let x = f.x0 + (f.tx - f.x0) * e, y = f.y0 + (f.ty - f.y0) * e;
      const leave = k - f.dur - f.stay;
      let alpha = 1;
      if (leave > 0) { y -= leave * .6; alpha = Math.max(0, 1 - leave * 1.6); }
      g.globalAlpha = alpha;
      drawAvatar(g, f.a, x * w, y * h + Math.sin(this.t * 6 + f.s * 9) * 3, f.s, this.t);
      g.globalAlpha = 1;
    }

    for (const p of this.sparks) {
      g.globalAlpha = Math.min(1, p.life * 1.5);
      g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    if (this.flash) { g.fillStyle = `rgba(255,255,255,${this.flash * .5})`; g.fillRect(0, 0, w, h); }
  }
}

const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',');
