// 花札を知らない人向け：ルール解説画面と、遊びながら覚えるチュートリアル局
import { CARDS, MONTHS, cardSVG, KIND_LABEL, ID } from './cards.js';
import { YAKU_DEFS } from './rules.js';
import { coach } from './ui.js';

const mini = (id, cls = '') => `<div class="mini ${cls}">${cardSVG(id)}</div>`;

const TABS = [
  ['flow', '遊び方'],
  ['cards', '札'],
  ['yaku', '役'],
  ['score', '点数'],
];

function flowHTML() {
  return `
  <p class="lead">花札は、<b>12 か月の花の札が 4 枚ずつ、全部で 48 枚</b>。札の左上の数字が「月」です。<br>
  「こいこい」は、同じ月の札を合わせて取り、取った札で<b>役</b>を作る 2 人のゲーム。</p>
  <ol class="steps">
    <li><span class="no">1</span><div><b>手札から 1 枚出す</b><br>場に<b>同じ月</b>の札があれば、2 枚とも自分のものに。なければ出した札は場に置かれます。
      <div class="demo">${mini(10)}<span>＋</span>${mini(8)}<span>→ 取れる！（どちらも 3月）</span></div></div></li>
    <li><span class="no">2</span><div><b>山札を 1 枚めくる</b><br>めくった札も同じように、場に同じ月があれば取れます。</div></li>
    <li><span class="no">3</span><div><b>役ができたら選ぶ</b><br>
      <b class="tag">勝負</b> ここで終わって点をもらう。<br>
      <b class="tag koi">こいこい</b> 続けてもっと点を狙う。ただし相手が先に役を作ると、相手の点が 2 倍に。</div></li>
    <li><span class="no">4</span><div><b>交代しながら続ける</b><br>8 枚ずつ出し切ってもどちらも勝負しなければ、その月は引き分け。決めた月数を戦い、合計点の多い方の勝ち。</div></li>
  </ol>
  <p class="tip">迷ったら「ヒント」ボタン。光っている手札は、場の札と合わせられる札です。</p>`;
}

function cardsHTML() {
  const kindNote = `<p class="lead">札には 4 つの種類があり、点の高さは <b class="k k光">光</b> ＞ <b class="k k種">タネ</b> ＞ <b class="k k短">タン</b> ＞ <b class="k kカス">カス</b>。札の下のラベルで見分けられます。</p>`;
  const rows = MONTHS.map(mo => `<div class="mrow"><div class="mname" style="--key:${mo.key}"><b>${mo.m}月</b><span>${mo.plant}</span></div>
    <div class="mcards">${CARDS.filter(c => c.m === mo.m).map(c => `<figure>${mini(c.id)}<figcaption>${c.name.replace(/^.+?に/, '')}</figcaption></figure>`).join('')}</div></div>`).join('');
  return kindNote + rows + `<p class="tip">「菊に盃」はタネですが、カスとしても数えます。</p>`;
}

function yakuHTML() {
  const pick = {
    goko: [ID.TSURU, ID.MAKU, ID.TSUKI, ID.AME, ID.HOUOU],
    shiko: [ID.TSURU, ID.MAKU, ID.TSUKI, ID.HOUOU],
    ameshiko: [ID.TSURU, ID.MAKU, ID.TSUKI, ID.AME],
    sanko: [ID.TSURU, ID.MAKU, ID.TSUKI],
    tane: [ID.UGUISU, 12, 16, ID.CHO, ID.INO],
    tan: [ID.AKA1, 13, 17, 25, ID.AO9],
    kasu: [2, 3, 6, 7, 10, 11, 14, 15, 18, 19],
  };
  return `<p class="lead">取った札で役ができると点になります。複数の役ができたら<b>合計</b>。</p>` + YAKU_DEFS.map(y => `
    <div class="yrow"><div class="yhead"><b>${y.name}</b><span class="pts">${y.pts}点${y.need ? '〜' : ''}</span></div>
    <p>${y.desc}</p><div class="cardrow">${(pick[y.key] || y.cards).map(id => mini(id)).join('')}</div></div>`).join('');
}

function scoreHTML() {
  return `
  <ul class="rules">
    <li><b>7点以上で勝負</b>すると点が <b>2 倍</b>。</li>
    <li>相手が<b>こいこい</b>したあとに自分が役を作って勝負すると <b>2 倍</b>（こいこい返し）。</li>
    <li>こいこいしたあとに新しい役ができたら、また「こいこい／勝負」を選べます。</li>
    <li>配られた手札に<b>同じ月が 4 枚</b>あれば、すぐに <b>手四（6点）</b> で勝ち。</li>
    <li>その月に勝った方が、次の月の<b>親（先に打つ人）</b>になります。</li>
    <li class="special">このゲームだけのルール：<b>世界の応援</b>。ノイズに大きく負け越すと、世界中のアバターがアカウントを託してくれて、次にあなたが勝ったときの点が <b>2 倍</b> になります。</li>
  </ul>
  <p class="tip">1点 ＝ 1000万アカウント。ノイズより多く取り返せば、仮想世界ハルカは元に戻ります。</p>`;
}

export function openRules(tab = 'flow') {
  const el = document.getElementById('rules');
  const body = el.querySelector('.rbody');
  const show = t => {
    el.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    body.innerHTML = { flow: flowHTML, cards: cardsHTML, yaku: yakuHTML, score: scoreHTML }[t]();
    body.scrollTop = 0;
  };
  if (!el.dataset.ready) {
    el.querySelector('.tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
    el.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); });
    el.querySelector('.close').addEventListener('click', () => { el.hidden = true; });
    el.dataset.ready = 1;
  }
  show(tab);
  el.hidden = false;
}

// ---------- チュートリアル ----------
const FIELD = [8, 34, 0, 22, 26, 43, 45, 14];
const MINE = [10, 32, 4, 5, 36, 38, 29, 30];
const NOISE = [16, 17, 18, 31, 37, 39, 6, 7];
const STOCK_HEAD = [2, 44, 24];

export function tutorialPreset() {
  const used = new Set([...FIELD, ...MINE, ...NOISE, ...STOCK_HEAD]);
  const rest = CARDS.map(c => c.id).filter(id => !used.has(id));
  return { field: FIELD, hands: [MINE.slice().sort((a, b) => a - b), NOISE], stock: [...STOCK_HEAD, ...rest] };
}

export function tutorialAI() {
  return {
    async move() { await new Promise(r => setTimeout(r, 700)); return { card: 16, target: null }; },
    async drawTarget(st, p, id, opts) { return opts[0]; },
    async koikoi() { return false; },
  };
}

// game.playRound の hooks と、人の操作の制限
export function tutorialHooks(sheet) {
  let myTurn = 0, drawn = 0;
  return {
    async start() {
      await coach('花札は <b>12 か月の花の札</b>が 4 枚ずつ。札の左上の数字が<b>月</b>だよ。<br>いちばん下が<b>あなたの手札</b>、まん中が<b>場</b>だよ。', { next: true });
      await coach('基本はひとつだけ。<b>手札から 1 枚出して、場にある同じ月の札を取る</b>。取った札で「役」を作ると点になる。', { next: true });
    },
    moveOpts() {
      myTurn++;
      if (myTurn === 1) {
        coach('<b>3月（桜）</b>の札をタップしてみよう。合う場札が光るよ。');
        return { allowed: [10], onSelect: () => coach('場の「桜に幕」は <b>光</b>の札。とても強い！ <b>もう一度タップ</b>して取ろう。') };
      }
      coach('次は <b>9月の「菊に盃」</b>を出そう。盃は「桜に幕」と組むと <b>花見で一杯</b> という役になる。');
      return { allowed: [32], onSelect: () => coach('もう一度タップで、場の 9月の札と合わせて取る！') };
    },
    async played({ p }) {
      if (p === 0 && myTurn === 1) coach('取れた！ 出したあとは<b>山札を 1 枚めくる</b>。めくった札も、同じ月があれば取れる。');
      else if (p === 0) coach('');
    },
    async drawn({ p }) {
      drawn++;
      if (drawn === 1) await coach('めくった松の札で <b>松に鶴（光）</b> も取れた！ 取った札は種類ごとに下にたまっていくよ。', { next: true });
      if (drawn === 1) coach('次はノイズの番。');
      if (drawn === 2) await coach('ノイズは合う札がなくて 1 枚を場に置き、めくった札で <b>桐に鳳凰（光）</b> を取った。油断できない…', { next: true, pos: 'bottom' });
    },
    async yaku({ p }) {
      if (p === 0) await coach('<b>花見で一杯</b>（5点）ができた！ 役ができると、続けるか終わるかを選べる。', { next: true });
      coach('');
    },
    koikoi: async () => {
      await sheet({
        html: `<h3>役ができた！ どうする？</h3>
          <div class="koi-explain"><p><b class="tag">勝負</b> ここで終わって、今の役の点（5点）をもらう。</p>
          <p><b class="tag koi">こいこい</b> 続けて、もっと点を狙う。でもノイズが先に役を作ると、ノイズの点が 2 倍になってしまう。</p></div>
          <p class="small">今回は練習なので「勝負」を選ぼう。</p>`,
        buttons: [['こいこい', true, 'ghost disabled'], ['勝負する', false]],
      });
      return false;
    },
  };
}
