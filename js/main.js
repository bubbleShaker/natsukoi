// 画面の切り替え・対局の流れ・記録
import { CARDS } from './cards.js';
import * as R from './rules.js';
import * as AI from './ai.js';
import { Sound } from './audio.js';
import { World } from './world.js';
import { Board, SPEED, AUTO, wait, toast, sheet, noiseSay, coach } from './ui.js';
import { playRound, aiController, humanController } from './game.js';
import { openRules, tutorialPreset, tutorialAI, tutorialHooks } from './guide.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const sound = new Sound();
const world = new World($('#world'));
const board = new Board(sound);
const seed = +params.get('seed') || (Date.now() % 1e9);
const rnd = R.rng(seed);

// ---------- 記録 ----------
const KEY = 'natsukoi.v1';
const rec = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
rec.games ??= 0; rec.wins ??= 0; rec.best ??= 0; rec.months ??= 6;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch {} };

// ---------- 画面 ----------
const screens = ['title', 'story', 'board', 'final'];
function show(name) {
  for (const s of screens) $('#' + s).hidden = s !== name;
  document.body.dataset.screen = name;
}

const fmtAcc = pts => {
  const man = pts * 1000;            // 1点 = 1000万
  if (man >= 10000) { const oku = Math.floor(man / 10000), rest = man % 10000; return `${oku}億${rest ? rest + '万' : ''}`; }
  return `${man}万`;
};

function renderTitle() {
  $('#rec').textContent = rec.games ? `これまで ${rec.games} 戦 ${rec.wins} 勝 ／ 最高 ${rec.best} 点` : '';
  document.querySelectorAll('#months button').forEach(b => b.classList.toggle('on', +b.dataset.v === rec.months));
  $('#btnTutorial').classList.toggle('first', !rec.tutorialDone);
  world.setDark(0);
}

// ---------- 導入の物語 ----------
const STORY = [
  '世界中の人がアバターでつながる仮想世界〈ハルカ〉。<br>買い物も、役所の手続きも、信号も、水道も、いまはハルカで動いている。',
  'ある夏の日、正体不明のAI〈ノイズ〉が、<br>ハルカのアカウントを次々に<b>乗っ取りはじめた</b>。',
  '止まる電車。あふれる水道。<br>落ちてくるかもしれない人工衛星。<br>乗っ取られたアカウントは <b>4億</b> をこえた。',
  'けれどノイズには、ひとつだけ弱点がある。<br><b>「ゲーム」と「賭け」が大好きなのだ。</b>',
  'おばあちゃん直伝の<b>花札</b>で、ノイズに勝負を挑もう。<br>賭けるのは、アカウント。<br><b>夏の決戦、こいこい！</b>',
];

async function story() {
  show('story');
  world.setDark(.5);
  const p = $('#storyText');
  for (let i = 0; i < STORY.length; i++) {
    p.classList.remove('on');
    await new Promise(r => setTimeout(r, 120));
    p.innerHTML = STORY[i];
    p.classList.add('on');
    if (i === 1) sound.noise_();
    const skipped = await new Promise(res => {
      const go = e => { cleanup(); res(e?.target?.id === 'skipStory'); };
      const cleanup = () => { $('#story').removeEventListener('click', go); };
      $('#story').addEventListener('click', go);
    });
    if (skipped) break;
  }
  rec.storySeen = true; save();
}

// ---------- 上の点数表示 ----------
function updateTop(m, i) {
  $('#monthLbl').innerHTML = `<b>${i + 1}</b>/${m.months}月`;
  $('#myPts').textContent = m.totals[0];
  $('#aiPts').textContent = m.totals[1];
  const sum = m.totals[0] + m.totals[1];
  $('#tug i').style.width = (sum ? m.totals[0] / sum * 100 : 50) + '%';
  $('#cheerBadge').hidden = !m.cheer;
  world.setDark(.25 + Math.max(0, Math.min(.6, (m.totals[1] - m.totals[0]) / 25)));
}

// ---------- 対局 ----------
function koikoiSheet(st, p, y, m) {
  const now = R.score(y.total, st.koi[1], m.cheer);
  const oppNear = R.progress(st.caps[1]).filter(g => g.have > 0 && g.need - g.have === 1 && (g.cards || g.have >= g.need - 1));
  const left = st.hands[0].length;
  const warn = st.koi[1] > 0 ? 'ノイズはもう役を持っている。次にノイズが役を作ったら負け！'
    : oppNear.length ? `注意：ノイズは「${oppNear.map(g => g.name).join('・')}」まであと 1 枚。` : 'ノイズはまだ役に遠い。続けるのもあり。';
  return sheet({
    html: `<h3>役ができた！</h3>
      <ul class="ylist">${y.list.map(x => `<li><b>${x.name}</b><span>${x.pts}点</span></li>`).join('')}</ul>
      <div class="koi-explain">
        <p><b class="tag">勝負</b> いま終われば <b>${now.pts}点</b>${now.mult.length ? `（${now.mult.join('・')}）` : ''}</p>
        <p><b class="tag koi">こいこい</b> 続けてもっと狙う。ノイズが役を作ると、ノイズの点が 2 倍に。</p>
        <p class="small">${warn}（手札のこり ${left} 枚）</p>
      </div>`,
    buttons: [['こいこい', true, 'koi'], ['勝負する', false]],
  });
}

function aiHooks() {
  const lines = ['…ツギ', 'アカウント、ワタサナイ', 'オモシロイ', 'ヨミドオリ', 'ハナフダ…スキ'];
  return {
    async played({ p, got }) { if (p === 1 && got.some(x => CARDS[x].kind === '光')) noiseSay('ヒカリ、イタダク'); },
    async drawn({ p, got }) {
      if (p === 0 && got.some(x => CARDS[x].kind === '光')) noiseSay('…ムム');
      else if (p === 1 && Math.random() < .12) noiseSay(lines[Math.floor(Math.random() * lines.length)]);
    },
  };
}

async function roundSheet(res, sc, m, i, st) {
  const last = i === m.months - 1;
  let html;
  if (res.winner < 0) {
    html = `<h3>引き分け</h3><p>どちらも勝負しないまま、札がなくなった。</p>`;
  } else {
    const me = res.winner === 0;
    html = `<h3 class="${me ? 'win' : 'lose'}">${me ? 'あなたの勝ち！' : 'ノイズの勝ち…'}</h3>
      <ul class="ylist">${res.list.map(x => `<li><b>${x.name}</b><span>${x.pts}点</span></li>`).join('')}</ul>
      ${sc.mult.length ? `<p class="mult">${sc.mult.join(' ・ ')}</p>` : ''}
      <p class="gain">${me ? '＋' : ''}${sc.pts}点<small>${me ? `${fmtAcc(sc.pts)}アカウントを取り返した！` : `${fmtAcc(sc.pts)}アカウントが乗っ取られた…`}</small></p>`;
  }
  html += `<div class="totals"><span>あなた <b>${m.totals[0]}</b></span><span>ノイズ <b>${m.totals[1]}</b></span></div>`;
  await sheet({ html, buttons: [[last ? '最終結果へ' : `${i + 2}月へ`, true]] });
}

const CHEER_WORDS = ['がんばれ！', 'Good luck!', '加油！', 'Viel Glück!', '¡Ánimo!', '화이팅!', 'Bonne chance!', 'Boa sorte!', 'Forza!', 'Удачи!', 'Semangat!', 'Lycka till!', 'Kia kaha!', 'Sterkte!', 'Chúc may mắn!', 'Powodzenia!'];

async function cheerEvent() {
  const box = $('#cheer');
  const n = 1200000 + Math.floor(Math.random() * 2400000);
  box.hidden = false;
  box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
  const words = box.querySelector('.words');
  words.innerHTML = CHEER_WORDS.map((w, k) => `<span style="--x:${(k * 37) % 72 + 4}%;--y:${k % 2 ? 6 + (k * 7) % 22 : 74 + (k * 5) % 16}%;--d:${(k % 8) * .25}s">${w}</span>`).join('');
  const cnt = box.querySelector('.count');
  box.querySelector('.go').hidden = true;
  world.cheer(180, 3.2);
  sound.cheer(3.2);
  const t0 = performance.now(), dur = 3000 * SPEED.f;
  await new Promise(res => {
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      cnt.textContent = Math.floor(n * (1 - Math.pow(1 - k, 2))).toLocaleString('ja-JP');
      if (k < 1) requestAnimationFrame(tick); else res();
    };
    tick();
  });
  world.spark(innerWidth / 2, innerHeight * .45, 40);
  const go = box.querySelector('.go');
  go.hidden = false;
  await new Promise(res => { go.onclick = res; if (AUTO.on) setTimeout(res, 30); });
  box.hidden = true;
  noiseSay('…ナンダ、コレハ', 2000);
}

async function playMatch(months) {
  show('board');
  sound.startBgm();
  const m = { months, totals: [0, 0], cheer: false, cheersUsed: 0, oya: 0 };
  window.__natsukoi.match = m;
  const auto = AUTO.on;
  const ai = aiController(sound, rnd, { lines: !auto });
  const human = auto ? aiController(sound, rnd, { lines: false }) : humanController(board, { koikoi: (st, p, y) => koikoiSheet(st, p, y, m) });
  noiseSay('ショウブ、シヨウ。カケルノハ、アカウント。', 2400);
  for (let i = 0; i < months; i++) {
    updateTop(m, i);
    const st = R.deal(rnd, m.oya);
    window.__natsukoi.st = st;
    const banner = () => toast(`<b>${i + 1}月</b><small>${m.oya ? 'ノイズ' : 'あなた'}が親（先に打つ）</small>`, { cls: 'month', ms: 1100 });
    const res = await playRound({ st, ctrl: [human, ai], board, sound, hooks: aiHooks(), banner });
    let sc = { pts: 0, mult: [] };
    if (res.winner >= 0) {
      sc = R.score(res.base, st.koi[1 - res.winner], res.winner === 0 && m.cheer);
      m.totals[res.winner] += sc.pts;
      if (res.winner === 0) { m.cheer = false; world.spark(innerWidth / 2, innerHeight * .7, 30); }
      m.oya = res.winner;
      if (res.winner === 0 && (sc.pts >= 10 || st.koi[0])) world.cheer(40, 1.5);
    }
    updateTop(m, i);
    res.winner === 0 ? sound.win() : res.winner === 1 ? sound.lose() : 0;
    await roundSheet(res, sc, m, i, st);
    const behind = m.totals[1] - m.totals[0], remain = months - 1 - i;
    if (remain > 0 && !m.cheer && m.cheersUsed < 2 && (behind >= 6 || (remain === 1 && behind > 0))) {
      await cheerEvent();
      m.cheer = true; m.cheersUsed++;
      updateTop(m, i);
    }
  }
  sound.stopBgm();
  await finale(m);
}

async function finale(m) {
  const [me, ai] = m.totals, win = me > ai, draw = me === ai;
  rec.games++; if (win) rec.wins++; rec.best = Math.max(rec.best, me); save();
  show('final');
  $('#final').dataset.result = win ? 'win' : draw ? 'draw' : 'lose';
  $('#finalTitle').textContent = win ? 'ハルカ、奪還！' : draw ? '引き分け' : 'ノイズの勝ち…';
  $('#finalText').innerHTML = win
    ? `取り返したアカウントは <b>${fmtAcc(me)}</b>。<br>止まっていた電車が動き出し、ハルカに歓声がひびく。<br>夏の空に、アバターたちが舞い上がった。`
    : draw ? `一歩もゆずらない勝負だった。<br>ノイズはまだハルカのどこかにいる。`
    : `ノイズは <b>${fmtAcc(ai)}</b> のアカウントを手にした。<br>でも、まだ終わらない。<br>世界中が、あなたの次の一手を待っている。`;
  $('#finalScore').innerHTML = `<span>あなた <b>${me}</b></span><span>ノイズ <b>${ai}</b></span>`;
  if (win) { world.setDark(0); world.cheer(220, 3); sound.cheer(3); } else world.setDark(.6);
  window.__natsukoi.done = { me, ai };
}

async function tutorial() {
  show('board');
  sound.startBgm();
  const m = { months: 1, totals: [0, 0], cheer: false };
  updateTop(m, 0);
  $('#monthLbl').innerHTML = '<b>れんしゅう</b>';
  const hooks = tutorialHooks(sheet);
  const st = R.deal(rnd, 0, tutorialPreset());
  window.__natsukoi.st = st;
  const human = humanController(board, { moveOpts: hooks.moveOpts, koikoi: hooks.koikoi });
  const res = await playRound({ st, ctrl: [human, tutorialAI()], board, sound, hooks });
  coach('');
  sound.win();
  world.cheer(60, 1.6);
  rec.tutorialDone = true; save();
  const go = await sheet({
    html: `<h3 class="win">れんしゅう完了！</h3>
      <p>花見で一杯 <b>${res.base || 5}点</b> で勝ち。これが基本の流れです。</p>
      <ul class="rules"><li>同じ月を合わせて取る</li><li>山札をめくって、また合わせる</li><li>役ができたら「こいこい」か「勝負」</li></ul>
      <p class="small">役の一覧は画面左上の「？」からいつでも見られます。</p>`,
    buttons: [['役の一覧を見る', 'rules', 'ghost'], ['ノイズと対決する', 'play']],
  });
  sound.stopBgm();
  if (go === 'rules') { show('title'); renderTitle(); openRules('yaku'); return; }
  startMatch();
}

async function startMatch() {
  if (!rec.storySeen && !AUTO.on) await story();
  await playMatch(rec.months);
}

// ---------- ボタン ----------
function firstTouch() { sound.init(); }
addEventListener('pointerdown', firstTouch, { capture: true });

$('#btnStart').onclick = () => startMatch();
$('#btnTutorial').onclick = () => tutorial();
$('#btnRules').onclick = () => openRules('flow');
$('#btnStory').onclick = async () => { await story(); show('title'); renderTitle(); };
$('#help').onclick = () => openRules('flow');
$('#months').onclick = e => { const b = e.target.closest('button'); if (!b) return; rec.months = +b.dataset.v; save(); renderTitle(); };
$('#hint').onclick = () => {
  const st = board.st;
  if (!st || !board.pending || board.pending.kind !== 'move' || board.pending.allowed) return;
  const mv = AI.chooseMove(st, 0, () => .5);
  board.showHint(mv, AI.explainMove(st, 0, mv));
};
$('#btnAgain').onclick = () => playMatch(rec.months);
$('#btnHome').onclick = () => { show('title'); renderTitle(); };
const muteBtn = $('#mute');
const setMute = v => { rec.muted = v; save(); sound.setMuted(v); muteBtn.classList.toggle('off', v); };
muteBtn.onclick = () => setMute(!rec.muted);
setMute(!!rec.muted);

if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// 確認用
window.__natsukoi = { board, world, sound, rec, R, AI, cheerEvent };

show('title');
renderTitle();
if (params.get('auto') === '1') {
  AUTO.on = true;
  SPEED.f = +params.get('speed') || .03;
  rec.months = +params.get('months') || 12;
  playMatch(rec.months);
} else if (params.get('tutorial') === '1') tutorial();
