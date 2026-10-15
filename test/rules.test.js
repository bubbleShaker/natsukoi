// ブラウザで test/index.html を開くと実行される
const results = [];
const test = (name, fn) => { try { fn(); results.push(['ok', name]); } catch (e) { results.push(['NG', name, String(e.message || e)]); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || ''} ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const assert = { equal: eq, deepEqual: eq, ok: (v, m) => { if (!v) throw new Error(m || 'not ok'); } };
import { CARDS, ID } from '../js/cards.js';
import { yaku, deal, rng, score, matches, captureSet, placeOnField } from '../js/rules.js';
import { chooseMove, decideKoikoi } from '../js/ai.js';

const kinds = k => CARDS.filter(c => c.kind === k).length;
const names = caps => yaku(caps).list.map(y => y.name);

test('48 枚の内訳', () => {
  assert.equal(CARDS.length, 48);
  assert.deepEqual([kinds('光'), kinds('種'), kinds('短'), kinds('カス')], [5, 9, 10, 24]);
});

test('光の役', () => {
  assert.deepEqual(names([ID.TSURU, ID.MAKU, ID.TSUKI]), ['三光']);
  assert.deepEqual(names([ID.TSURU, ID.MAKU, ID.AME]), []);
  assert.deepEqual(names([ID.TSURU, ID.MAKU, ID.TSUKI, ID.AME]), ['雨四光']);
  assert.equal(yaku([ID.TSURU, ID.MAKU, ID.TSUKI, ID.HOUOU]).total, 8);
  assert.equal(yaku([ID.TSURU, ID.MAKU, ID.TSUKI, ID.HOUOU, ID.AME]).total, 10);
});

test('一杯・猪鹿蝶・短', () => {
  assert.deepEqual(names([ID.MAKU, ID.SAKE]), ['花見で一杯']);
  assert.deepEqual(names([ID.INO, ID.SHIKA, ID.CHO]), ['猪鹿蝶']);
  assert.deepEqual(names([ID.AKA1, ID.AKA2, ID.AKA3, ID.AO6, ID.AO9]), ['赤短', 'タン']);
  assert.equal(yaku([ID.AKA1, ID.AKA2, ID.AKA3, ID.AO6, ID.AO9, ID.AO10]).total, 5 + 5 + 2);
});

test('カス 10 枚、盃もカスに数える', () => {
  const kasu = CARDS.filter(c => c.kind === 'カス').map(c => c.id);
  assert.deepEqual(names(kasu.slice(0, 9)), []);
  assert.deepEqual(names([...kasu.slice(0, 9), ID.SAKE]), ['カス']);
  assert.equal(yaku(kasu.slice(0, 12)).total, 3);
});

test('得点の倍率', () => {
  assert.equal(score(5, 0).pts, 5);
  assert.equal(score(7, 0).pts, 14);
  assert.equal(score(5, 1).pts, 10);
  assert.equal(score(8, 1, true).pts, 64);
});

test('配り：8・8・8・24、場に同じ月 4 枚はない', () => {
  for (let s = 1; s < 300; s++) {
    const st = deal(rng(s), s % 2);
    assert.equal(st.hands[0].length, 8); assert.equal(st.hands[1].length, 8);
    assert.equal(st.field.length, 8); assert.equal(st.stock.length, 24);
    const all = new Set([...st.hands[0], ...st.hands[1], ...st.field, ...st.stock]);
    assert.equal(all.size, 48);
    const n = {}; for (const id of st.field) n[CARDS[id].m] = (n[CARDS[id].m] || 0) + 1;
    assert.ok(Object.values(n).every(v => v < 4));
  }
});

test('AI 同士で最後まで打てる', () => {
  for (let s = 1; s < 200; s++) {
    const r = rng(s), st = deal(r, 0);
    let p = 0, done = false;
    while (st.hands[0].length || st.hands[1].length) {
      const mv = chooseMove(st, p, r);
      st.hands[p].splice(st.hands[p].indexOf(mv.card), 1);
      let got = captureSet(st, mv.card, mv.target);
      if (got.length) { st.field = st.field.map(x => got.includes(x) ? null : x); st.caps[p].push(mv.card, ...got); }
      else placeOnField(st, mv.card);
      const d = st.stock.shift();
      const m = matches(st, d);
      got = captureSet(st, d, m[0]);
      if (got.length) { st.field = st.field.map(x => got.includes(x) ? null : x); st.caps[p].push(d, ...got); }
      else placeOnField(st, d);
      const y = yaku(st.caps[p]).total;
      if (y > st.last[p]) { st.last[p] = y; if (!decideKoikoi(st, p, y, r)) { done = true; break; } st.koi[p]++; }
      p = 1 - p;
    }
    const total = st.caps[0].length + st.caps[1].length + st.field.filter(x => x != null).length + st.stock.length + st.hands[0].length + st.hands[1].length;
    assert.equal(total, 48, `seed ${s}`);
    if (!done) assert.equal(st.stock.length, 8);
  }
});

window.__results = results;
document.body.textContent = results.map(r => r.join(' ')).join('\n');
