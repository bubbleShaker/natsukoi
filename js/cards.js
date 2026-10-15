// 48 枚の花札。id = (月 - 1) * 4 + 番号。絵はすべてここで SVG を組み立てる（画像素材なし）。

export const MONTHS = [
  { m: 1, plant: '松', bg: '#fde9dc', key: '#2f8f4e' },
  { m: 2, plant: '梅', bg: '#fde7ef', key: '#d63a6a' },
  { m: 3, plant: '桜', bg: '#fff1f6', key: '#f27aa3' },
  { m: 4, plant: '藤', bg: '#efe9fc', key: '#8a5cd6' },
  { m: 5, plant: '菖蒲', bg: '#e4f0fc', key: '#3f63d0' },
  { m: 6, plant: '牡丹', bg: '#fde7e5', key: '#dd3d3a' },
  { m: 7, plant: '萩', bg: '#f7eedc', key: '#b8542e' },
  { m: 8, plant: '芒', bg: '#f6f1df', key: '#6f7330' },
  { m: 9, plant: '菊', bg: '#fff6d4', key: '#d99a0c' },
  { m: 10, plant: '紅葉', bg: '#feeadc', key: '#e0502a' },
  { m: 11, plant: '柳', bg: '#e2eef1', key: '#2b8f86' },
  { m: 12, plant: '桐', bg: '#f0e9f9', key: '#7550b8' },
];

// 種類：光 / 種 / 短 / カス
const DEF = [
  [['光', '松に鶴'], ['短', '松に赤短', 'red'], ['カス'], ['カス']],
  [['種', '梅に鶯'], ['短', '梅に赤短', 'red'], ['カス'], ['カス']],
  [['光', '桜に幕'], ['短', '桜に赤短', 'red'], ['カス'], ['カス']],
  [['種', '藤に不如帰'], ['短', '藤に短冊', 'plain'], ['カス'], ['カス']],
  [['種', '菖蒲に八橋'], ['短', '菖蒲に短冊', 'plain'], ['カス'], ['カス']],
  [['種', '牡丹に蝶'], ['短', '牡丹に青短', 'blue'], ['カス'], ['カス']],
  [['種', '萩に猪'], ['短', '萩に短冊', 'plain'], ['カス'], ['カス']],
  [['光', '芒に月'], ['種', '芒に雁'], ['カス'], ['カス']],
  [['種', '菊に盃'], ['短', '菊に青短', 'blue'], ['カス'], ['カス']],
  [['種', '紅葉に鹿'], ['短', '紅葉に青短', 'blue'], ['カス'], ['カス']],
  [['光', '柳に小野道風'], ['種', '柳に燕'], ['短', '柳に短冊', 'plain'], ['カス', '柳に雷']],
  [['光', '桐に鳳凰'], ['カス'], ['カス'], ['カス']],
];

export const CARDS = [];
DEF.forEach((month, mi) => month.forEach(([kind, name, tan], i) => {
  const mo = MONTHS[mi];
  CARDS.push({ id: mi * 4 + i, m: mi + 1, i, kind, tan: tan || null, name: name || `${mo.plant}のカス` });
}));

export const ID = {
  TSURU: 0, AKA1: 1, UGUISU: 4, AKA2: 5, MAKU: 8, AKA3: 9,
  CHO: 20, AO6: 21, INO: 24, TSUKI: 28, GAN: 29, SAKE: 32, AO9: 33,
  SHIKA: 36, AO10: 37, AME: 40, TSUBAME: 41, HOUOU: 44,
};

export const card = id => CARDS[id];
export const monthOf = id => CARDS[id].m;
export const KIND_LABEL = { '光': '光', '種': 'タネ', '短': 'タン', 'カス': 'カス' };

// ---------- SVG ----------
const W = 50, H = 80;
const f5 = (cx, cy, r, fill, mid = '#ffe36b') => {
  let s = '';
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5 - Math.PI / 2;
    s += `<circle cx="${(cx + Math.cos(a) * r * .55).toFixed(1)}" cy="${(cy + Math.sin(a) * r * .55).toFixed(1)}" r="${(r * .5).toFixed(1)}" fill="${fill}"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${(r * .28).toFixed(1)}" fill="${mid}"/>`;
};
const star = (cx, cy, r, fill, rot = 0) => {
  let pts = [];
  for (let k = 0; k < 10; k++) {
    const a = rot + k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * .45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
};
const sun = (fill = '#ef4b3c') => `<circle cx="34" cy="22" r="11" fill="${fill}"/>`;

// 月ごとの植物（カスの絵）。full=false のときは下の方だけ描いて主役の邪魔をしない
const PLANT = {
  1: full => `<path d="M14 80 C16 62 22 56 20 40" stroke="#7a4b2a" stroke-width="3.2" fill="none"/>
    ${[[20, 40, 12], [10, 52, 9], [30, 54, 10], [16, 64, 9], [36, 68, 9]].slice(full ? 0 : 2).map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .55}" fill="#2f7a3e"/><ellipse cx="${x}" cy="${y - 1.5}" rx="${r * .7}" ry="${r * .3}" fill="#58a85a"/>`).join('')}`,
  2: full => `<path d="M2 ${full ? 30 : 58} L22 52 L48 ${full ? 44 : 66}" stroke="#4a2c1e" stroke-width="2.6" fill="none"/>
    ${[[10, 40], [20, 52], [32, 48], [42, 55], [26, 64], [14, 62]].slice(full ? 0 : 3).map(([x, y]) => f5(x, y, 7, '#d63a6a', '#ffe08a')).join('')}`,
  3: full => `${[[12, 22], [26, 16], [38, 26], [18, 36], [34, 40], [10, 52], [26, 54], [40, 60], [18, 68], [32, 72]].slice(full ? 0 : 5).map(([x, y]) => f5(x, y, 8, '#f7a8c4', '#ffffff')).join('')}`,
  4: full => `<path d="M0 6 Q25 14 50 6" stroke="#5b3a7a" stroke-width="2" fill="none"/>
    ${[12, 25, 38].map((x, j) => Array.from({ length: full ? 6 : 3 }, (_, k) => `<circle cx="${x + (k % 2 ? 1.5 : -1.5)}" cy="${(full ? 14 : 14) + k * 7 + j * 3}" r="${4.2 - k * .45}" fill="${k % 2 ? '#a77ee8' : '#8a5cd6'}"/>`).join('')).join('')}`,
  5: full => `${[8, 18, 30, 42].map(x => `<path d="M${x} 80 L${x + 3} ${full ? 30 : 56} L${x + 6} 80Z" fill="#3e8f4a"/>`).join('')}
    ${(full ? [[14, 30], [34, 38]] : [[24, 56]]).map(([x, y]) => `<path d="M${x} ${y} l-7 -6 l7 -8 l7 8z" fill="#4b3fc0"/><path d="M${x} ${y} l-4 6 h8z" fill="#7a6ee8"/><circle cx="${x}" cy="${y - 4}" r="1.6" fill="#ffd94a"/>`).join('')}`,
  6: full => `<path d="M6 80 Q10 66 4 58 Q18 62 22 76" fill="#3e8f4a"/><path d="M44 80 Q40 64 48 56 Q32 62 30 78" fill="#3e8f4a"/>
    ${(full ? [[25, 38, 13], [14, 62, 8], [37, 64, 8]] : [[25, 66, 9]]).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dd3d3a"/><circle cx="${x}" cy="${y}" r="${r * .66}" fill="#f2737a"/><circle cx="${x}" cy="${y}" r="${r * .3}" fill="#ffd2d2"/>`).join('')}`,
  7: full => `${[[6, 80, 30, 20], [24, 80, 14, 30], [40, 80, 46, 26]].map(([x0, y0, x1, y1]) => `<path d="M${x0} ${y0} Q${(x0 + x1) / 2 + 6} ${(y0 + y1) / 2} ${x1} ${full ? y1 : y1 + 30}" stroke="#7a5a2a" stroke-width="1.2" fill="none"/>`).join('')}
    ${Array.from({ length: full ? 16 : 7 }, (_, k) => { const x = 6 + (k * 13) % 40, y = (full ? 22 : 54) + (k * 7) % (full ? 52 : 24); return `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.6" fill="${k % 3 ? '#c94a5a' : '#6aa04a'}" transform="rotate(${k * 37} ${x} ${y})"/>`; }).join('')}`,
  8: full => `<path d="M0 ${full ? 46 : 56} Q25 ${full ? 30 : 44} 50 ${full ? 46 : 56} V80 H0Z" fill="#33312c"/>
    ${Array.from({ length: 7 }, (_, k) => `<path d="M${4 + k * 7} 80 Q${6 + k * 7} ${full ? 56 : 64} ${2 + k * 7} ${full ? 44 : 54}" stroke="#f3ead0" stroke-width="1" fill="none"/>`).join('')}`,
  9: full => `<path d="M10 80 Q14 66 25 ${full ? 46 : 62}" stroke="#3e8f4a" stroke-width="2" fill="none"/>
    ${(full ? [[25, 36, 13], [12, 62, 8], [38, 66, 8]] : [[34, 66, 9], [14, 70, 7]]).map(([x, y, r]) => Array.from({ length: 12 }, (_, k) => `<ellipse cx="${x}" cy="${y - r * .55}" rx="${r * .18}" ry="${r * .5}" fill="#f2b31a" transform="rotate(${k * 30} ${x} ${y})"/>`).join('') + `<circle cx="${x}" cy="${y}" r="${r * .3}" fill="#e07b1a"/>`).join('')}`,
  10: full => `${(full ? [[14, 22, 9, 0], [34, 30, 10, .3], [20, 46, 9, .6], [38, 56, 8, .2], [12, 66, 8, .5], [30, 72, 7, .1]] : [[14, 66, 8, .4], [34, 70, 8, .1]]).map(([x, y, r, a], k) => star(x, y, r, k % 2 ? '#f08a2a' : '#e0402a', a)).join('')}`,
  11: full => `<path d="M0 4 Q25 0 50 6" stroke="#4a6a3a" stroke-width="2" fill="none"/>
    ${Array.from({ length: full ? 8 : 5 }, (_, k) => { const x = 3 + k * (full ? 6.3 : 10); return `<path d="M${x} 4 Q${x + 4} 30 ${x - 1} ${full ? 70 : 30}" stroke="#4fa35a" stroke-width="2.2" fill="none" stroke-dasharray="5 2"/>`; }).join('')}`,
  12: full => `<path d="M0 80 Q8 62 24 66 Q20 76 26 80Z" fill="#3e8f4a"/><path d="M50 80 Q42 60 26 68 Q32 76 28 80Z" fill="#58a85a"/>
    ${(full ? [[14, 18], [25, 12], [36, 18]] : [[25, 50]]).map(([x, y]) => Array.from({ length: 5 }, (_, k) => `<circle cx="${x}" cy="${y + k * 5}" r="${3.4 - k * .3}" fill="${k % 2 ? '#a77ee8' : '#7550b8'}"/>`).join('')).join('')}`,
};

// 光・タネの主役の絵
const STAR_ART = {
  [ID.TSURU]: () => sun() + `<path d="M12 56 Q20 40 30 46 Q36 50 40 44" stroke="#222" stroke-width="2" fill="none"/>
    <ellipse cx="22" cy="54" rx="11" ry="6" fill="#fff" stroke="#bbb" stroke-width=".6"/><path d="M11 54 L4 50 L12 52Z" fill="#222"/><circle cx="40" cy="43" r="2.2" fill="#e5332a"/>`,
  [ID.UGUISU]: () => `<ellipse cx="26" cy="30" rx="8" ry="5.5" fill="#8aa83a"/><circle cx="33" cy="26" r="4" fill="#8aa83a"/><path d="M36.5 26 l3 1 l-3 1z" fill="#3b2a1a"/><circle cx="34" cy="25" r=".9" fill="#222"/><path d="M19 31 l-7 3 l7 -6z" fill="#6c8a2a"/>`,
  [ID.MAKU]: () => `<rect x="2" y="44" width="46" height="30" fill="#fff"/>${Array.from({ length: 5 }, (_, k) => `<rect x="${2 + k * 9.2}" y="44" width="4.6" height="30" fill="#d8343a"/>`).join('')}<rect x="2" y="41" width="46" height="5" fill="#e8b23a"/>`,
  [ID.CHO]: () => [[17, 26, '#ffd23f'], [33, 36, '#5aa6f0']].map(([x, y, c]) => `<ellipse cx="${x - 4}" cy="${y - 3}" rx="5" ry="4" fill="${c}"/><ellipse cx="${x + 4}" cy="${y - 3}" rx="5" ry="4" fill="${c}"/><ellipse cx="${x - 3}" cy="${y + 3}" rx="3.4" ry="3" fill="${c}"/><ellipse cx="${x + 3}" cy="${y + 3}" rx="3.4" ry="3" fill="${c}"/><rect x="${x - .8}" y="${y - 6}" width="1.6" height="11" rx=".8" fill="#333"/>`).join(''),
  [ID.INO]: () => `<ellipse cx="25" cy="44" rx="15" ry="9" fill="#8a5a32"/><ellipse cx="39" cy="46" rx="5" ry="4" fill="#a8744a"/><circle cx="35" cy="41" r="1.2" fill="#111"/><path d="M14 52 v6 M20 53 v6 M30 53 v6 M35 52 v6" stroke="#5a3a20" stroke-width="2.4"/><path d="M12 38 Q20 32 30 35" stroke="#5a3a20" stroke-width="2" fill="none"/>`,
  [ID.TSUKI]: () => `<rect x="2" y="2" width="46" height="46" fill="#ef5a3c"/><circle cx="25" cy="26" r="14" fill="#fff6cf"/>`,
  [ID.GAN]: () => `<rect x="2" y="2" width="46" height="44" fill="#f7a64a"/>${[[14, 16], [26, 24], [36, 14]].map(([x, y]) => `<path d="M${x - 6} ${y - 2} Q${x - 2} ${y} ${x} ${y + 2} Q${x + 2} ${y} ${x + 6} ${y - 2} Q${x + 2} ${y + 1} ${x} ${y + 4} Q${x - 2} ${y + 1} ${x - 6} ${y - 2}Z" fill="#2a2a2a"/>`).join('')}`,
  [ID.SAKE]: () => `<ellipse cx="25" cy="30" rx="16" ry="6" fill="#c8202a"/><path d="M9 30 Q25 52 41 30Z" fill="#d8343a"/><rect x="19" y="44" width="12" height="4" rx="1" fill="#a81a22"/><text x="25" y="41" font-size="10" text-anchor="middle" fill="#ffd94a" font-weight="700">寿</text>`,
  [ID.SHIKA]: () => `<ellipse cx="24" cy="44" rx="13" ry="7" fill="#b07a40"/><path d="M33 40 L37 26 L41 28 L38 40Z" fill="#b07a40"/><ellipse cx="40" cy="26" rx="5" ry="3.4" fill="#b07a40"/><path d="M38 23 l-3 -8 M38 22 l-6 -4 M41 23 l2 -8 M42 22 l5 -4" stroke="#6a4420" stroke-width="1.4"/><circle cx="41.5" cy="25.5" r=".9" fill="#111"/><path d="M15 50 v8 M20 50 v8 M29 50 v8 M33 49 v8" stroke="#7a5228" stroke-width="2"/><circle cx="20" cy="42" r="1.2" fill="#fff"/><circle cx="26" cy="45" r="1.2" fill="#fff"/>`,
  [ID.AME]: () => `<rect x="2" y="2" width="46" height="76" fill="#3a4766"/>${Array.from({ length: 10 }, (_, k) => `<path d="M${4 + k * 5} ${4 + (k * 13) % 20} l-3 9" stroke="#9fb3d8" stroke-width=".8"/>`).join('')}
    <path d="M8 40 Q22 22 36 40Z" fill="#e5332a"/><path d="M22 40 v18" stroke="#3a2a1a" stroke-width="1.4"/><path d="M16 46 L28 46 L30 70 L14 70Z" fill="#f2c94c"/><circle cx="22" cy="42" r="3.4" fill="#f4d5b0"/><ellipse cx="38" cy="70" rx="5" ry="3.4" fill="#5aa64a"/><circle cx="36" cy="67" r="1" fill="#111"/>`,
  [ID.TSUBAME]: () => `<path d="M10 30 Q22 22 32 26 L44 18 L38 28 L46 32 L34 32 Q24 38 10 30Z" fill="#1f2a44"/><path d="M14 30 Q24 34 32 30" stroke="#e5332a" stroke-width="1.6" fill="none"/>`,
  [ID.HOUOU]: () => `<path d="M12 50 Q6 30 20 22 Q30 16 36 24 Q30 26 32 32 Q40 36 44 48 Q34 42 30 48 Q26 60 12 50Z" fill="#e5332a"/>
    <path d="M16 46 Q14 34 22 28 Q26 36 24 46Z" fill="#48b04a"/><path d="M28 44 Q32 52 42 56 Q30 58 24 50Z" fill="#f2c94c"/><circle cx="33" cy="22" r="3" fill="#f2c94c"/><path d="M36 22 l4 1 l-4 1z" fill="#d99a0c"/><circle cx="33.5" cy="21.5" r=".8" fill="#111"/>`,
};
const KAMINARI = () => `<rect x="2" y="2" width="46" height="76" fill="#2c2f45"/><path d="M28 6 L16 34 H26 L18 62 L38 26 H28 L36 6Z" fill="#ffd94a"/>
  <ellipse cx="25" cy="66" rx="16" ry="6" fill="#d8343a"/><rect x="9" y="62" width="32" height="4" fill="#a81a22"/>`;
const HOTOTOGISU = () => `<path d="M38 6 a10 10 0 1 0 6 16 a8 8 0 1 1 -6 -16Z" fill="#ffd94a"/><path d="M8 36 Q20 30 28 34 L40 30 L34 38 Q22 44 8 36Z" fill="#2a2440"/><path d="M28 34 l4 -1" stroke="#e5332a" stroke-width="1.4"/>`;
const YATSUHASHI = () => `<path d="M0 64 L18 56 L22 64 L4 72Z M22 64 L40 56 L44 64 L26 72Z M30 74 L48 66 L50 74 L34 80Z" fill="#9a6a3a" stroke="#6a4420" stroke-width=".8"/>`;

function tanzaku(color, text) {
  const fill = color === 'red' ? '#d8343a' : color === 'blue' ? '#3449c8' : '#d8343a';
  let s = `<rect x="18" y="8" width="13" height="46" rx="1.5" fill="${fill}" stroke="#fff" stroke-width="1"/>`;
  if (text) [...text].forEach((ch, k) => { s += `<text x="24.5" y="${17 + k * 7.6}" font-size="6.6" text-anchor="middle" fill="${color === 'blue' ? '#fff' : '#111'}" font-weight="700">${ch}</text>`; });
  return s;
}

const cache = new Map();
export function cardSVG(id) {
  if (cache.has(id)) return cache.get(id);
  const c = CARDS[id], mo = MONTHS[c.m - 1];
  let art = '';
  if (c.kind === 'カス') {
    art = id === 43 ? KAMINARI() : PLANT[c.m](true);
  } else if (c.kind === '短') {
    const text = c.tan === 'red' ? (c.m === 3 ? 'みよしの' : 'あかよろし') : '';
    art = PLANT[c.m](false) + tanzaku(c.tan, text);
  } else {
    const fn = STAR_ART[id] || (id === 12 ? HOTOTOGISU : id === 16 ? YATSUHASHI : null);
    art = (c.m === 8 || id === ID.AME ? '' : PLANT[c.m](false)) + (fn ? fn() : '') + (c.m === 8 ? PLANT[8](false) : '');
  }
  const kindLbl = KIND_LABEL[c.kind];
  const kindCol = { '光': '#e5332a', '種': '#2a7ad8', '短': '#8a3fc0', 'カス': '#8a8a8a' }[c.kind];
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="0" y="0" width="${W}" height="${H}" rx="5" fill="#fff"/>
<svg x="2" y="2" width="46" height="76" viewBox="2 2 46 76"><rect x="2" y="2" width="46" height="76" rx="3.5" fill="${mo.bg}"/>${art}</svg>
${c.kind === '光' ? `<circle cx="42" cy="11" r="6" fill="#e5332a" stroke="#fff" stroke-width="1.2"/><text x="42" y="13.6" font-size="7" text-anchor="middle" fill="#fff" font-weight="800">光</text>` : ''}
<circle cx="8.5" cy="9" r="6" fill="${mo.key}" stroke="#fff" stroke-width="1.2"/><text x="8.5" y="11.6" font-size="${c.m >= 10 ? 6.2 : 7.4}" text-anchor="middle" fill="#fff" font-weight="800">${c.m}</text>
<rect x="${25 - kindLbl.length * 3.6 - 2}" y="69" width="${kindLbl.length * 7.2 + 4}" height="9" rx="4.5" fill="${kindCol}" stroke="#fff" stroke-width=".9"/>
<text x="25" y="76" font-size="6.6" text-anchor="middle" fill="#fff" font-weight="800">${kindLbl}</text>
</svg>`;
  cache.set(id, svg);
  return svg;
}

export const BACK_SVG = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect width="${W}" height="${H}" rx="5" fill="#fff"/><rect x="2.5" y="2.5" width="45" height="75" rx="3.5" fill="#1d2a6b"/>
<circle cx="25" cy="40" r="13" fill="none" stroke="#5fd0ff" stroke-width="2"/><circle cx="25" cy="40" r="7" fill="none" stroke="#ff7ac0" stroke-width="2"/>
<circle cx="25" cy="40" r="2.4" fill="#ffd94a"/><path d="M6 10 H44 M6 70 H44" stroke="#5fd0ff" stroke-width="1" stroke-dasharray="2 3"/></svg>`;
