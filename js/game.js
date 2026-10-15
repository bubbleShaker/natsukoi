// 1 局の進行。ctrl[p] が手を決め（人・AI・チュートリアル）、board が見せる。
import { CARDS } from './cards.js';
import * as R from './rules.js';
import * as AI from './ai.js';
import { wait, toast, noiseSay } from './ui.js';

export function aiController(sound, r = Math.random, { lines = true } = {}) {
  const say = (t, ms) => lines && noiseSay(t, ms);
  return {
    async move(st, p) {
      await wait(450);
      return AI.chooseMove(st, p, r);
    },
    async drawTarget(st, p, id, opts) { await wait(300); return AI.chooseDrawTarget(st, p, id, opts); },
    async koikoi(st, p, y) {
      await wait(500);
      const k = AI.decideKoikoi(st, p, y.total, r);
      if (p === 1) say(k ? 'コイコイ。モット、ホシイ。' : 'ショウブ。', 1800);
      return k;
    },
  };
}

export function humanController(board, hooks = {}) {
  return {
    move: st => board.humanMove(st, hooks.moveOpts?.(st) || {}),
    drawTarget: (st, p, id, opts) => board.humanDrawTarget(st, id, opts),
    koikoi: (st, p, y) => hooks.koikoi(st, p, y),
  };
}

async function doPlay(st, p, id, target, board, sound, fromHand) {
  const got = R.captureSet(st, id, target);
  if (fromHand) st.hands[p].splice(st.hands[p].indexOf(id), 1);
  if (got.length) {
    st.landing = { id, slot: st.field.indexOf(got[0]) };
    board.render(st); sound.place();
    await wait(420);
    st.landing = null;
    R.removeFromField(st, got);
    st.caps[p].push(id, ...got);
    board.render(st); sound.capture();
    await wait(380);
  } else {
    R.placeOnField(st, id);
    board.render(st); sound.place();
    await wait(380);
  }
  return got;
}

// 結果：{ winner, base, list, teshi? }。winner = -1 は引き分け
export async function playRound({ st, ctrl, board, sound, hooks = {}, banner }) {
  const H = async (name, d) => { if (hooks[name]) await hooks[name](d); };
  board.reset();
  if (banner) await banner();
  board.render(st);
  await wait(500);
  if (st.teshi >= 0) {
    const p = st.teshi;
    const four = st.hands[p].filter(id => st.hands[p].filter(x => CARDS[x].m === CARDS[id].m).length === 4);
    await toast(`<b>手四</b><small>${p ? 'ノイズ' : 'あなた'}の手札に${CARDS[four[0]].m}月が 4 枚</small>`, { cls: 'yaku', ms: 1800 });
    return { winner: p, base: R.TESHI_PTS, list: [{ name: '手四', pts: R.TESHI_PTS }], teshi: true };
  }
  await H('start', st);
  while (st.hands[0].length + st.hands[1].length > 0) {
    const p = st.turn;
    board.setTurn(p);
    await H('turn', p);
    const mv = await ctrl[p].move(st, p);
    const got1 = await doPlay(st, p, mv.card, mv.target, board, sound, true);
    await H('played', { p, card: mv.card, got: got1 });

    const d = st.stock.shift();
    st.drawn = d;
    board.render(st); sound.flip();
    await wait(520);
    const m = R.matches(st, d);
    let t = null;
    if (m.length === 2) t = await ctrl[p].drawTarget(st, p, d, m);
    st.drawn = null;
    const got2 = await doPlay(st, p, d, t, board, sound, false);
    await H('drawn', { p, card: d, got: got2 });

    const y = R.yaku(st.caps[p]);
    if (y.total > st.last[p]) {
      const fresh = y.list.filter(x => !(st.lastList?.[p] || []).some(o => o.key === x.key && o.pts === x.pts));
      st.last[p] = y.total;
      st.lastList = st.lastList || [[], []];
      st.lastList[p] = y.list;
      sound.yaku();
      await toast(`${fresh.map(x => `<b>${x.name}</b>`).join('')}<small>${p ? 'ノイズ' : 'あなた'}の役 ${y.total}点</small>`, { cls: 'yaku' + (p ? ' ai' : ''), ms: 1500 });
      await H('yaku', { p, y });
      const koi = st.hands[p].length === 0 ? false : await ctrl[p].koikoi(st, p, y);
      if (!koi) {
        sound.taiko();
        await toast('<b>勝負！</b>', { cls: 'big', ms: 900 });
        return { winner: p, base: y.total, list: y.list };
      }
      st.koi[p]++;
      sound.koikoi();
      await toast('<b>こいこい！</b>', { cls: 'big koi' + (p ? ' ai' : ''), ms: 1000 });
      await H('koikoi', { p });
    }
    st.turn = 1 - p;
  }
  return { winner: -1 };
}
