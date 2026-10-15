// 暴走AI〈ノイズ〉の打ち方。ヒントボタンもこれを自分側の視点で使う。
import { CARDS, ID } from './cards.js';
import { matches, captureSet, yaku, progress } from './rules.js';

const BASE = { '光': 9, '種': 3, '短': 2.5, 'カス': 1 };
const SPECIAL = {
  [ID.SAKE]: 8, [ID.AME]: 5, [ID.INO]: 6, [ID.SHIKA]: 6, [ID.CHO]: 6,
  [ID.AKA1]: 5, [ID.AKA2]: 5, [ID.AKA3]: 5, [ID.AO6]: 5, [ID.AO9]: 5, [ID.AO10]: 5,
};

// caps を持つ人にとって札 id がどれだけ欲しいか
export function cardValue(id, caps) {
  const c = CARDS[id];
  let v = SPECIAL[id] ?? BASE[c.kind];
  const before = yaku(caps).total, after = yaku([...caps, id]).total;
  v += (after - before) * 10;
  for (const g of progress(caps)) {
    const inGroup = g.cards ? g.cards.includes(id) : (g.kind === c.kind || (g.key === 'kasu' && id === ID.SAKE));
    if (inGroup && g.have > 0) v += g.have / g.need * (g.cards ? 6 : 3);
  }
  return v;
}

const valueSet = (ids, caps) => ids.reduce((s, x) => s + cardValue(x, caps), 0);

// 手札から出す 1 手を選ぶ。{ card, target, score } を返す
export function chooseMove(st, p, r = Math.random) {
  const me = st.caps[p], op = st.caps[1 - p];
  const hand = st.hands[p];
  let best = null;
  for (const id of hand) {
    const m = matches(st, id);
    const targets = m.length === 2 ? m : [null];
    for (const t of targets) {
      const got = captureSet(st, id, t);
      let s;
      if (got.length) {
        const all = [id, ...got];
        s = valueSet(all, me) + .7 * valueSet(all, op);
      } else {
        // 捨て札は相手に取られやすい。同じ月を手に持っていれば次に自分で取れる
        const mine = hand.some(h => h !== id && CARDS[h].m === CARDS[id].m);
        s = -.6 * cardValue(id, op) - .25 * cardValue(id, me) + (mine ? .3 * cardValue(id, me) : 0);
      }
      s += r() * .3;
      if (!best || s > best.score) best = { card: id, target: t, score: s };
    }
  }
  return best;
}

// 山札からめくった札が場の 2 枚と合うとき、どちらを取るか
export function chooseDrawTarget(st, p, id, opts) {
  const me = st.caps[p], op = st.caps[1 - p];
  let best = opts[0], bs = -1e9;
  for (const t of opts) {
    const s = cardValue(t, me) + .7 * cardValue(t, op);
    if (s > bs) { bs = s; best = t; }
  }
  return best;
}

// 相手があと 1 枚で役になるか
export function threat(caps) {
  return progress(caps).some(g => g.have > 0 && g.need - g.have === 1 && (g.cards || g.have >= g.need - 1));
}

// こいこいするか。true でこいこい
export function decideKoikoi(st, p, base, r = Math.random) {
  const left = st.hands[p].length;
  if (base >= 7 || left <= 2) return false;
  if (st.koi[1 - p] > 0) return false;           // 相手はもう役がある
  if (threat(st.caps[1 - p])) return false;
  if (left >= 5) return r() < .8;
  return r() < .45;
}

// ヒント用：おすすめ理由をひとこと
export function explainMove(st, p, mv) {
  const got = captureSet(st, mv.card, mv.target);
  const c = CARDS[mv.card];
  if (!got.length) return `「${c.name}」を場に出すのがよさそう（相手に取られても痛くない札）`;
  const all = [mv.card, ...got];
  const before = yaku(st.caps[p]).total, after = yaku([...st.caps[p], ...all]).total;
  const names = got.map(x => CARDS[x].name).join('・');
  if (after > before) return `「${c.name}」で「${names}」を取ると役ができる！`;
  return `「${c.name}」で「${names}」を取ろう`;
}
