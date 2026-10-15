// 盤面の DOM。札は id ごとに 1 つの要素を使い回し、置き場所が変わったら FLIP で動かす。
import { CARDS, cardSVG, BACK_SVG, KIND_LABEL } from './cards.js';
import { matches, progress, yaku } from './rules.js';

export const SPEED = { f: 1 };
export const AUTO = { on: false }; // 確認用：シートを自動で閉じる
export const wait = ms => new Promise(r => setTimeout(r, ms * SPEED.f));
const $ = s => document.querySelector(s);
const KINDS = ['光', '種', '短', 'カス'];

export class Board {
  constructor(sound) {
    this.sound = sound;
    this.els = new Map();
    this.c = {
      aiHand: $('#aiHand'), field: $('#field'), stock: $('#stock'), drawn: $('#drawn'),
      myHand: $('#myHand'), aiCaps: $('#aiCaps'), myCaps: $('#myCaps'),
      aiChips: $('#aiChips'), myChips: $('#myChips'), status: $('#status'),
    };
    this.peek = /[?&]peek=1/.test(location.search);
    this.pending = null; // 人の入力待ち
    this.c.myHand.addEventListener('click', e => this.onHand(e));
    this.c.field.addEventListener('click', e => this.onField(e));
    for (const box of [this.c.aiChips, this.c.myChips]) box.addEventListener('click', e => this.onChip(e));
    addEventListener('resize', () => this.st && this.layoutHand());
  }

  el(id) {
    let e = this.els.get(id);
    if (!e) {
      e = document.createElement('div');
      e.className = 'card down';
      e.dataset.id = id;
      e.innerHTML = `<div class="face">${cardSVG(id)}</div><div class="back">${BACK_SVG}</div>`;
      e.setAttribute('aria-label', CARDS[id].name);
      this.els.set(id, e);
    }
    return e;
  }

  reset() {
    for (const e of this.els.values()) e.remove();
    this.els.clear();
    this.c.field.innerHTML = '';
    for (const k of ['aiCaps', 'myCaps']) {
      this.c[k].innerHTML = KINDS.map(kd => `<div class="grp" data-kind="${kd}"><b>${KIND_LABEL[kd]}<i>0</i></b><div class="pile"></div></div>`).join('');
    }
  }

  // ---------- 描画 ----------
  render(st) {
    this.st = st;
    const first = new Map();
    for (const [id, e] of this.els) if (e.isConnected) first.set(id, e.getBoundingClientRect());
    const stockTop = this.c.stock.getBoundingClientRect();

    const put = (id, parent, faceUp) => {
      const e = this.el(id);
      if (e.parentNode !== parent || e.nextSibling) parent.appendChild(e);
      e.classList.toggle('down', !faceUp);
      return e;
    };

    // 山札
    st.stock.forEach((id, i) => { const e = put(id, this.c.stock, false); e.style.setProperty('--k', Math.min(i, 5)); });
    this.c.stock.dataset.n = st.stock.length;
    if (st.drawn != null) put(st.drawn, this.c.drawn, true);

    // 場
    const nSlots = Math.max(10, Math.ceil(st.field.length / 5) * 5);
    while (this.c.field.children.length < nSlots) { const s = document.createElement('div'); s.className = 'slot'; this.c.field.appendChild(s); }
    while (this.c.field.children.length > nSlots && !this.c.field.lastChild.children.length) this.c.field.lastChild.remove();
    [...this.c.field.children].forEach((s, i) => { s.dataset.slot = i; });
    st.field.forEach((id, i) => { if (id != null) { const e = put(id, this.c.field.children[i], true); e.classList.remove('landing'); } });
    if (st.landing) put(st.landing.id, this.c.field.children[st.landing.slot], true).classList.add('landing');

    // 手札
    st.hands[0].forEach(id => put(id, this.c.myHand, true));
    st.hands[1].forEach(id => put(id, this.c.aiHand, this.peek));

    // 取り札
    for (const [p, box] of [[0, this.c.myCaps], [1, this.c.aiCaps]]) {
      for (const kd of KINDS) {
        const g = box.querySelector(`[data-kind="${kd}"]`);
        const ids = st.caps[p].filter(x => CARDS[x].kind === kd).sort((a, b) => a - b);
        g.querySelector('i').textContent = ids.length;
        g.classList.toggle('empty', !ids.length);
        const pile = g.querySelector('.pile');
        ids.forEach(id => put(id, pile, true));
      }
    }
    // どこにも属さなくなった札（新しい局で）を外す
    const live = new Set([...st.stock, ...st.field, ...st.hands[0], ...st.hands[1], ...st.caps[0], ...st.caps[1], st.drawn, st.landing?.id].filter(x => x != null));
    for (const [id, e] of this.els) if (!live.has(id)) e.remove();

    this.layoutHand();
    this.renderChips(st);

    // FLIP
    const moving = [];
    for (const [id, e] of this.els) {
      if (!e.isConnected) continue;
      let a = first.get(id);
      if (!a && st.stock.includes(id)) continue;
      if (!a) a = stockTop;
      const b = e.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top, s = a.width / (b.width || 1);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < .02) continue;
      e.style.transition = 'none';
      e.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      e.classList.add('fly');
      moving.push(e);
    }
    if (moving.length) {
      void document.body.offsetWidth;
      const dur = Math.round(360 * SPEED.f);
      for (const e of moving) {
        e.style.transition = `transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;
        e.style.transform = '';
        clearTimeout(e._t);
        e._t = setTimeout(() => { e.classList.remove('fly'); e.style.transition = ''; }, dur + 30);
      }
    }
  }

  // 手札は幅に合わせて重ねる
  layoutHand() {
    const piles = document.querySelectorAll('.pile');
    for (const box of [this.c.myHand, this.c.aiHand, ...piles]) {
      const kids = [...box.children];
      if (!kids.length) continue;
      const w = kids[0].offsetWidth, room = box.clientWidth;
      const gap = box === this.c.myHand ? 6 : box === this.c.aiHand ? 3 : 2;
      const need = kids.length * w + (kids.length - 1) * gap;
      const ov = need > room ? (room - kids.length * w) / (kids.length - 1) : gap;
      kids.forEach((k, i) => { k.style.marginLeft = i ? `${ov}px` : '0'; });
    }
  }

  renderChips(st) {
    for (const [p, box] of [[0, this.c.myChips], [1, this.c.aiChips]]) {
      const got = new Set(yaku(st.caps[p]).list.map(y => y.key));
      const done = { hikari: ['goko', 'shiko', 'ameshiko', 'sanko'] };
      const chips = progress(st.caps[p]).filter(g => {
        if (g.kind) return g.have >= g.need - 3 && g.have > 0;
        return g.have > 0;
      }).map(g => {
        const isDone = (done[g.key] || [g.key]).some(k => got.has(k));
        const near = !isDone && g.need - g.have === 1;
        return `<button class="chip${isDone ? ' done' : ''}${near ? ' near' : ''}" data-key="${g.key}" data-p="${p}">${g.name}<span>${g.have}/${g.need}</span></button>`;
      });
      box.innerHTML = chips.join('') || `<span class="chip-hint">${p ? '' : '札を取ると、役までの進み具合がここに出ます'}</span>`;
    }
  }

  onChip(e) {
    const b = e.target.closest('.chip');
    if (!b || !this.st) return;
    const p = +b.dataset.p, g = progress(this.st.caps[p]).find(x => x.key === b.dataset.key);
    const caps = new Set(this.st.caps[p]);
    const ids = g.cards || CARDS.filter(c => c.kind === g.kind || (g.key === 'kasu' && c.id === 32)).map(c => c.id);
    const label = { hikari: '光の札（3枚で三光・4枚で四光・5枚で五光。雨は特別）', hanami: '花見で一杯', tsukimi: '月見で一杯', isc: '猪鹿蝶', akatan: '赤短', aotan: '青短', tane: 'タネ（5枚から）', tan: 'タン（5枚から）', kasu: 'カス（10枚から）' }[g.key];
    sheet({
      html: `<h3>${p ? 'ノイズ' : 'あなた'}の「${g.name}」 ${g.have}/${g.need}</h3><p class="small">${label}。明るい札は取った札です。</p>
        <div class="cardrow">${ids.map(id => `<div class="mini${caps.has(id) ? '' : ' dim'}">${cardSVG(id)}</div>`).join('')}</div>`,
      buttons: [['とじる', 0]],
    });
  }

  setTurn(p) {
    document.body.dataset.turn = p;
  }

  status(t) { this.c.status.textContent = t || ''; }

  // ---------- 人の操作 ----------
  // allowed：チュートリアルで選べる札を絞る
  humanMove(st, { allowed, onSelect } = {}) {
    return new Promise(res => {
      this.pending = { kind: 'move', st, res, allowed, onSelect, sel: null };
      this.markPlayable(st, allowed);
      this.status('手札から 1 枚えらぼう（光っている札は場の札と合う）');
    });
  }

  markPlayable(st, allowed) {
    for (const id of st.hands[0]) {
      const e = this.el(id);
      e.classList.toggle('can', matches(st, id).length > 0);
      e.classList.toggle('locked', !!allowed && !allowed.includes(id));
    }
  }

  clearMarks() {
    for (const e of this.els.values()) e.classList.remove('sel', 'match', 'can', 'locked', 'hint');
  }

  select(id) {
    const pd = this.pending, st = pd.st;
    pd.sel = id;
    for (const h of st.hands[0]) this.el(h).classList.toggle('sel', h === id);
    const m = matches(st, id);
    for (const f of st.field) if (f != null) this.el(f).classList.toggle('match', m.includes(f));
    const c = CARDS[id];
    if (!m.length) this.status(`「${c.name}」は合う札がない → もう一度タップで場に出す`);
    else if (m.length === 2) this.status(`合う札が 2 枚。取りたい方の場札をタップ`);
    else this.status(`「${c.name}」 → もう一度タップ（か光る場札をタップ）で取る`);
    this.sound.tap();
    pd.onSelect?.(id);
  }

  finish(val) {
    const pd = this.pending;
    this.pending = null;
    this.clearMarks();
    this.status('');
    pd.res(val);
  }

  onHand(e) {
    const pd = this.pending;
    const cardEl = e.target.closest('.card');
    if (!pd || pd.kind !== 'move' || !cardEl) return;
    const id = +cardEl.dataset.id;
    if (!pd.st.hands[0].includes(id)) return;
    if (pd.allowed && !pd.allowed.includes(id)) { cardEl.animate([{ translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], 200); return; }
    if (pd.sel !== id) return this.select(id);
    const m = matches(pd.st, id);
    if (m.length === 2) return;
    this.finish({ card: id, target: null });
  }

  onField(e) {
    const pd = this.pending;
    if (!pd) return;
    const cardEl = e.target.closest('.card');
    const id = cardEl ? +cardEl.dataset.id : null;
    if (pd.kind === 'move') {
      if (pd.sel == null) return;
      const m = matches(pd.st, pd.sel);
      if (id != null && m.includes(id)) return this.finish({ card: pd.sel, target: id });
      if (!m.length) return this.finish({ card: pd.sel, target: null });
    } else if (pd.kind === 'draw') {
      if (id != null && pd.opts.includes(id)) this.finish(id);
    }
  }

  humanDrawTarget(st, id, opts) {
    return new Promise(res => {
      this.pending = { kind: 'draw', st, res, opts };
      for (const f of opts) this.el(f).classList.add('match');
      this.status('めくった札と合う札が 2 枚。取りたい方をタップ');
    });
  }

  showHint(mv, text) {
    if (!this.pending || this.pending.kind !== 'move') return;
    this.select(mv.card);
    if (mv.target != null) this.el(mv.target).classList.add('hint');
    this.status('ヒント：' + text);
  }
}

// ---------- 画面の上に出す部品 ----------
export function toast(html, { cls = '', ms = 1300 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.innerHTML = html;
  $('#fx').appendChild(t);
  return wait(ms).then(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); });
}

// 下から出るシート。buttons: [[ラベル, 値, cls]]
export function sheet({ html, buttons = [['OK', true]], cls = '' }) {
  return new Promise(res => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet ${cls}">${html}<div class="btns">${buttons.map(([l, v, c], i) => `<button class="btn ${c || (i === buttons.length - 1 ? 'primary' : '')}" data-i="${i}"${c && c.includes('disabled') ? ' disabled' : ''}>${l}</button>`).join('')}</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
    if (AUTO.on) setTimeout(() => wrap.querySelector(`[data-i="${buttons.length - 1}"]`).click(), 30);
    wrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-i]');
      if (!b || b.disabled) return;
      wrap.classList.remove('on');
      wrap.style.pointerEvents = 'none';
      setTimeout(() => wrap.remove(), 300);
      res(buttons[+b.dataset.i][1]);
    });
  });
}

// ノイズのせりふ
export function noiseSay(text, ms = 1600) {
  const b = $('#noiseSay');
  b.textContent = text;
  b.classList.add('on');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('on'), ms * SPEED.f);
}

// チュートリアルの吹き出し。next=true なら「つぎへ」を押すまで待つ
export function coach(text, { next = false, pos = 'mid' } = {}) {
  const c = $('#coach');
  c.hidden = !text;
  c.dataset.pos = pos;
  if (!text) return Promise.resolve();
  c.querySelector('p').innerHTML = text;
  const btn = c.querySelector('button');
  btn.hidden = !next;
  if (!next) return Promise.resolve();
  return new Promise(res => { btn.onclick = () => { btn.onclick = null; res(); }; });
}
