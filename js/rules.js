// こいこいのルール（DOM なし）。状態はただのオブジェクトで、手を進める関数がそれを書き換える。
import { CARDS, ID, monthOf } from './cards.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sameMonthFour = ids => {
  const n = {};
  for (const id of ids) n[monthOf(id)] = (n[monthOf(id)] || 0) + 1;
  return Object.keys(n).filter(m => n[m] === 4).map(Number);
};

// 1 局ぶんの配り。preset があればその並びをそのまま使う（チュートリアル用）
export function deal(r, oya, preset) {
  let hands, field, stock;
  for (let tries = 0; ; tries++) {
    if (preset) {
      hands = [preset.hands[0].slice(), preset.hands[1].slice()];
      field = preset.field.slice();
      stock = preset.stock.slice();
    } else {
      const d = shuffle(CARDS.map(c => c.id), r);
      hands = [[], []]; field = [];
      // 実際の配り方に近く、2 枚ずつ 子→場→親 の順
      for (let k = 0; k < 4; k++) {
        hands[1 - oya].push(d.pop(), d.pop());
        field.push(d.pop(), d.pop());
        hands[oya].push(d.pop(), d.pop());
      }
      stock = d;
    }
    // 場に同じ月が 4 枚そろったら配り直し
    if (preset || !sameMonthFour(field).length || tries > 50) break;
  }
  const st = {
    hands, field, stock,
    caps: [[], []],
    koi: [0, 0],         // こいこいした回数
    last: [0, 0],        // 最後に判断したときの役の点
    oya, turn: oya,
    landing: null,       // 場札に重ねている途中の札 { id, slot }
    teshi: -1,
  };
  if (!preset) for (const p of [oya, 1 - oya]) if (sameMonthFour(hands[p]).length) { st.teshi = p; break; }
  sortHand(st.hands[0]);
  return st;
}

export const sortHand = h => h.sort((a, b) => a - b);

export const fieldIds = st => st.field.filter(x => x != null);
export const matches = (st, id) => fieldIds(st).filter(f => monthOf(f) === monthOf(id));

// 場に置く（空いている枠を先に埋める）
export function placeOnField(st, id) {
  const empty = st.field.indexOf(null);
  if (empty >= 0) { st.field[empty] = id; return empty; }
  st.field.push(id);
  return st.field.length - 1;
}

export function removeFromField(st, ids) {
  st.field = st.field.map(x => (ids.includes(x) ? null : x));
  while (st.field.length > 8 && st.field[st.field.length - 1] == null) st.field.pop();
}

// 札 id を出したときに取れる札。target は 2 枚と合うときに選んだ方
export function captureSet(st, id, target) {
  const m = matches(st, id);
  if (m.length === 0) return [];
  if (m.length === 3) return m;
  if (m.length === 2) return [target ?? m[0]];
  return m;
}

// ---------- 役 ----------
const LIGHTS = [ID.TSURU, ID.MAKU, ID.TSUKI, ID.AME, ID.HOUOU];
const ISC = [ID.INO, ID.SHIKA, ID.CHO];
const AKA = [ID.AKA1, ID.AKA2, ID.AKA3];
const AO = [ID.AO6, ID.AO9, ID.AO10];
const isKasu = id => CARDS[id].kind === 'カス' || id === ID.SAKE; // 菊に盃はカスにも数える

export const YAKU_DEFS = [
  { key: 'goko', name: '五光', pts: 10, cards: LIGHTS, desc: '光の札 5 枚すべて' },
  { key: 'shiko', name: '四光', pts: 8, cards: LIGHTS.filter(x => x !== ID.AME), desc: '雨（柳に小野道風）以外の光 4 枚' },
  { key: 'ameshiko', name: '雨四光', pts: 7, cards: LIGHTS, desc: '雨をふくむ光 4 枚' },
  { key: 'sanko', name: '三光', pts: 5, cards: LIGHTS.filter(x => x !== ID.AME), desc: '雨以外の光 3 枚' },
  { key: 'hanami', name: '花見で一杯', pts: 5, cards: [ID.MAKU, ID.SAKE], desc: '桜に幕 ＋ 菊に盃' },
  { key: 'tsukimi', name: '月見で一杯', pts: 5, cards: [ID.TSUKI, ID.SAKE], desc: '芒に月 ＋ 菊に盃' },
  { key: 'isc', name: '猪鹿蝶', pts: 5, cards: ISC, desc: '萩に猪・紅葉に鹿・牡丹に蝶' },
  { key: 'akatan', name: '赤短', pts: 5, cards: AKA, desc: '字の書いた赤い短冊 3 枚（松・梅・桜）' },
  { key: 'aotan', name: '青短', pts: 5, cards: AO, desc: '青い短冊 3 枚（牡丹・菊・紅葉）' },
  { key: 'tane', name: 'タネ', pts: 1, need: 5, kind: '種', desc: 'タネ 5 枚で 1 点。1 枚ふえるごとに +1' },
  { key: 'tan', name: 'タン', pts: 1, need: 5, kind: '短', desc: 'タン 5 枚で 1 点。1 枚ふえるごとに +1' },
  { key: 'kasu', name: 'カス', pts: 1, need: 10, kind: 'カス', desc: 'カス 10 枚で 1 点。1 枚ふえるごとに +1（菊に盃もカスに数える）' },
];

export function yaku(caps) {
  const has = new Set(caps);
  const list = [];
  const add = (key, pts) => { const d = YAKU_DEFS.find(y => y.key === key); list.push({ key, name: d.name, pts }); };
  const nl = LIGHTS.filter(x => has.has(x)).length, ame = has.has(ID.AME);
  if (nl === 5) add('goko', 10);
  else if (nl === 4) add(ame ? 'ameshiko' : 'shiko', ame ? 7 : 8);
  else if (nl === 3 && !ame) add('sanko', 5);
  if (has.has(ID.MAKU) && has.has(ID.SAKE)) add('hanami', 5);
  if (has.has(ID.TSUKI) && has.has(ID.SAKE)) add('tsukimi', 5);
  if (ISC.every(x => has.has(x))) add('isc', 5);
  if (AKA.every(x => has.has(x))) add('akatan', 5);
  if (AO.every(x => has.has(x))) add('aotan', 5);
  const nTane = caps.filter(x => CARDS[x].kind === '種').length;
  const nTan = caps.filter(x => CARDS[x].kind === '短').length;
  const nKasu = caps.filter(isKasu).length;
  if (nTane >= 5) add('tane', nTane - 4);
  if (nTan >= 5) add('tan', nTan - 4);
  if (nKasu >= 10) add('kasu', nKasu - 9);
  return { list, total: list.reduce((s, y) => s + y.pts, 0) };
}

// 役への進み具合（画面のチップと AI の判断に使う）
export function progress(caps) {
  const has = new Set(caps);
  const nl = LIGHTS.filter(x => has.has(x) && x !== ID.AME).length + (has.has(ID.AME) ? 1 : 0);
  const cnt = (cards) => cards.filter(x => has.has(x)).length;
  const out = [
    { key: 'hikari', name: '光', have: nl, need: nl >= 3 ? Math.min(5, nl + 1) : 3, cards: LIGHTS },
    { key: 'hanami', name: '花見', have: cnt([ID.MAKU, ID.SAKE]), need: 2, cards: [ID.MAKU, ID.SAKE] },
    { key: 'tsukimi', name: '月見', have: cnt([ID.TSUKI, ID.SAKE]), need: 2, cards: [ID.TSUKI, ID.SAKE] },
    { key: 'isc', name: '猪鹿蝶', have: cnt(ISC), need: 3, cards: ISC },
    { key: 'akatan', name: '赤短', have: cnt(AKA), need: 3, cards: AKA },
    { key: 'aotan', name: '青短', have: cnt(AO), need: 3, cards: AO },
    { key: 'tane', name: 'タネ', have: caps.filter(x => CARDS[x].kind === '種').length, need: 5, kind: '種' },
    { key: 'tan', name: 'タン', have: caps.filter(x => CARDS[x].kind === '短').length, need: 5, kind: '短' },
    { key: 'kasu', name: 'カス', have: caps.filter(isKasu).length, need: 10, kind: 'カス' },
  ];
  for (const g of out) if (g.kind && g.have >= g.need) g.need = g.have + 1;
  return out;
}

// 勝負したときの点。base は役の合計
export function score(base, opponentKoi, cheer = false) {
  let pts = base, mult = [];
  if (base >= 7) { pts *= 2; mult.push('7点以上 ×2'); }
  if (opponentKoi > 0) { pts *= 2; mult.push('こいこい返し ×2'); }
  if (cheer) { pts *= 2; mult.push('世界の応援 ×2'); }
  return { pts, mult };
}

export const TESHI_PTS = 6;
