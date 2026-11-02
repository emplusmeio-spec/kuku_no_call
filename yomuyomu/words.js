// ことばチェック（各レベルの先頭）
//
// TERMS = [{ id, lv, word, card, gen }]
//   lv   : そのことばを はじめて使うレベル（このレベルの ことばチェックで出る）
//   card : まちがえたとき・おわったときに見せる「ことばカード」の説明
//   gen  : 呼ぶたびに ちがう絵・ちがう組み合わせで 1問つくる
// 読む力ではなく「ことばの意味」を確かめるので、指示（ask）は読み上げる。
// 表記は notate(…, lv) でレベルにそろえる。

const ANI = [["ねこ", "🐈"], ["いぬ", "🐕"], ["うさぎ", "🐇"], ["くま", "🐻"], ["ぶた", "🐖"], ["ひよこ", "🐤"], ["かえる", "🐸"], ["さる", "🐒"]];
const FRU = [["りんご", "🍎"], ["みかん", "🍊"], ["バナナ", "🍌"], ["ぶどう", "🍇"], ["いちご", "🍓"], ["もも", "🍑"]];
const COLS = [["あか", "あかい", "#ef5350"], ["あお", "あおい", "#42a5f5"], ["きいろ", "きいろい", "#fbc02d"]];
const BOXC = "#c8a165";

// ことばチェックも 読む問題と同じ形にそろえる（同じ絵・同じ選択肢は 1つに まとめる）
const W = (o) => {
  const seen = new Set();
  const choices = o.choices.slice().sort((a, b) => b.ok - a.ok).filter((c) => { const k = c.svg || (c.emoji || "") + c.text; if (seen.has(k)) return false; seen.add(k); return true; });
  return build({ ...o, choices: o.fixed ? o.choices.filter((c) => choices.includes(c)) : choices });
};
const textItem = (ask, list, correct, extra = {}) => W({ ask, choices: opts(list, correct), ...extra });
const dotsSvg = (cols) => svg(140, 60, cols.map((c, i) => `<circle cx="${18 + (i % 5) * 26}" cy="${cols.length > 5 ? (i < 5 ? 16 : 44) : 30}" r="10" fill="${c}"/>`).join(""));
const rowEmoji = (list, w = 150) => svg(w, 44, list.map((e, i) => emo(e, 18 + i * ((w - 36) / Math.max(1, list.length - 1)), 22, 26)).join(""));
const countSvg = (e, n) => svg(150, 60, Array.from({ length: n }, (_, i) => emo(e, 18 + (i % 5) * 28, n > 5 ? (i < 5 ? 16 : 44) : 30, 22)).join(""));
const sentencePairs = (bank, ask) => { const [a, b, ans] = pick(bank); return { scene: null, a, b, ans, ask }; };

const TERMS = [];
const term = (id, lv, word, card, gen) => TERMS.push({ id, lv, word, card, gen });

// ================================================================
// レベル1
// ================================================================
// うえ・した・なか・よこ（はこ と もの）
const boxScene = (e, where) => {
  const box = (op) => `<rect x="35" y="44" width="50" height="34" rx="3" fill="${BOXC}" stroke="#8d6e3f" stroke-width="2" opacity="${op}"/>`;
  const pos = { うえ: [60, 28], した: [60, 96], なか: [60, 62], よこ: [104, 62] }[where];
  if (where === "なか") return svg(120, 120, emo(e, pos[0], pos[1], 24) + box(0.55));
  return svg(120, 120, box(1) + emo(e, pos[0], pos[1], 28));
};
const placeTerm = (where) => () => {
  const [n, e] = pick(ANI);
  return W({
    ask: `${n}が　はこの　${where}に　いる　えは　どれ？`,
    choices: ["うえ", "した", "なか", "よこ"].map((w) => ({ svg: boxScene(e, w), ok: w === where })),
  });
};
term("ue", 1, "うえ", "「うえ」は　たかい　ほう。あたまの　ほう　だよ。", placeTerm("うえ"));
term("shita", 1, "した", "「した」は　ひくい　ほう。あしの　ほう　だよ。", placeTerm("した"));
term("naka", 1, "なか", "「なか」は　かこまれた　うちがわ。はこの　なかに　はいって　いる　ことだよ。", placeTerm("なか"));
term("soto", 1, "そと", "「そと」は　かこいの　はいって　いない　ほう。まるの　せんの　むこうがわ　だよ。", () => {
  const [n, e] = pick(ANI);
  const ring = `<circle cx="60" cy="60" r="38" fill="none" stroke="#8d6e63" stroke-width="4"/>`;
  const inside = [[60, 60], [48, 50], [72, 70], [60, 44], [46, 70]];
  const outside = pick([[14, 14], [106, 16], [106, 106], [14, 106]]);
  return W({
    ask: `${n}が　まるの　そとに　いる　えは　どれ？`,
    choices: [{ svg: svg(120, 120, ring + emo(e, outside[0], outside[1], 22)), ok: true }, ...sample(inside, 3).map((p) => ({ svg: svg(120, 120, ring + emo(e, p[0], p[1], 22)), ok: false }))],
  });
});
const sizeTerm = (big) => () => {
  const [[n1, e1], [, e2]] = sample(FRU, 2);
  const s = (e, sz) => svg(100, 100, emo(e, 50, 52, sz));
  return W({
    ask: `${big ? "おおきい" : "ちいさい"}　${n1}は　どれ？`,
    choices: [{ svg: s(e1, 70), ok: big }, { svg: s(e1, 30), ok: !big }, { svg: s(e2, 70), ok: false }, { svg: s(e2, 30), ok: false }],
  });
};
term("ookii", 1, "おおきい", "「おおきい」は、くらべて　かさが　たくさん　ある　ほう。", sizeTerm(true));
term("chiisai", 1, "ちいさい", "「ちいさい」は、くらべて　かさが　すこし　しか　ない　ほう。", sizeTerm(false));
term("onaji", 1, "おなじ", "「おなじ」は、かたちも　いろも　ならびかたも　ぜんぶ　いっしょ　と　いう　こと。", () => {
  const [a, b] = sample(["まる", "さんかく", "しかく"], 2);
  const pic = (x, y) => svg(120, 60, x + y);
  const L = (t, c) => fillShape(t, 35, 30, 16, c), R = (t, c) => fillShape(t, 85, 30, 16, c);
  const other = ["まる", "さんかく", "しかく"].find((t) => t !== a && t !== b);
  return W({
    scene: pic(L(a), R(b)),
    ask: "うえの　えと　おなじ　えは　どれ？",
    choices: [{ svg: pic(L(a), R(b)), ok: true }, { svg: pic(L(b), R(a)), ok: false }, { svg: pic(L(a), R(other)), ok: false }, { svg: pic(L(a, "#66bb6a"), R(b)), ok: false }],
  });
});
term("dake", 1, "だけ", "「〜だけ」は、ほかの　ものは　ない　と　いう　こと。「あかい　まる　だけ」なら、あかい　まるの　ほかは　ない。", () => {
  const [cn, , ch] = pick(COLS);
  const others = COLS.filter((c) => c[0] !== cn).map((c) => c[2]);
  const n = 3 + rand(3);
  return W({
    ask: `${cn}い　まる　だけが　ある　えは　どれ？`,
    choices: [
      { svg: dotsSvg(Array(n).fill(ch)), ok: true },
      { svg: dotsSvg(shuffle([...Array(n - 1).fill(ch), pick(others)])), ok: false },
      { svg: dotsSvg(shuffle([...Array(2).fill(ch), ...Array(n - 2).fill(pick(others))])), ok: false },
      { svg: dotsSvg(Array(n).fill(pick(others))), ok: false },
    ],
  });
});
const giveScene = (eL, eR, eO, toRight) => svg(160, 70, emo(eL, 22, 36, 30) + emo(eR, 138, 36, 30) + emo(eO, 80, 22, 22) +
  `<path d="${toRight ? "M50,48 L110,48 M100,40 L110,48 L100,56" : "M110,48 L50,48 M60,40 L50,48 L60,56"}" stroke="#5d4037" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
term("ageru", 1, "あげる・もらう", "「Aが　Bに　あげる」と「Bが　Aから　もらう」は　おなじ　こと。ものは　Aから　Bへ　うごくよ。", () => {
  const [[nA, eA], [nB, eB]] = sample(ANI, 2);
  const [[nO, eO], [, eX]] = sample(FRU, 2);
  const aLeft = coin();
  const good = aLeft ? giveScene(eA, eB, eO, true) : giveScene(eB, eA, eO, false);
  const rev = aLeft ? giveScene(eA, eB, eO, false) : giveScene(eB, eA, eO, true);
  const wrongObj = aLeft ? giveScene(eA, eB, eX, true) : giveScene(eB, eA, eX, false);
  const ask = coin() ? `${nA}が　${nB}に　${nO}を　あげて　いる　えは　どれ？` : `${nB}が　${nA}から　${nO}を　もらって　いる　えは　どれ？`;
  return W({ ask, choices: [{ svg: good, ok: true }, { svg: rev, ok: false }, { svg: wrongObj, ok: false }] });
});

// ================================================================
// レベル2
// ================================================================
const lrTerm = (right) => () => {
  const [[nX, eX], [nY, eY]] = sample(ANI, 2);
  const p = (a, b, vert) => svg(120, 120, vert ? emo(a, 60, 30, 32) + emo(b, 60, 90, 32) : emo(a, 30, 60, 32) + emo(b, 90, 60, 32));
  return W({
    ask: `${nX}の　${right ? "みぎ" : "ひだり"}に　${nY}が　いる　えは　どれ？`,
    choices: [{ svg: p(eX, eY), ok: right }, { svg: p(eY, eX), ok: !right }, { svg: p(eX, eY, true), ok: false }, { svg: p(eY, eX, true), ok: false }],
  });
};
term("migi", 2, "みぎ", "「みぎ」は、おはしを　もつ　ての　ほう（みぎての　ほう）。えでは　むかって　みぎがわ　だよ。", lrTerm(true));
term("hidari", 2, "ひだり", "「ひだり」は、おちゃわんを　もつ　ての　ほう（ひだりての　ほう）。", lrTerm(false));
const lenTerm = (long) => () => {
  const [c1, c2] = sample(COLS, 2);
  const rope = (col, len) => svg(130, 40, `<line x1="${65 - len / 2}" y1="20" x2="${65 + len / 2}" y2="20" stroke="${col}" stroke-width="9" stroke-linecap="round"/>`);
  return W({
    ask: `${c1[1]}　${long ? "ながい" : "みじかい"}　ひもは　どれ？`,
    choices: [{ svg: rope(c1[2], 110), ok: long }, { svg: rope(c1[2], 36), ok: !long }, { svg: rope(c2[2], 110), ok: false }, { svg: rope(c2[2], 36), ok: false }],
  });
};
term("nagai", 2, "ながい", "「ながい」は、はしから　はしまでが　とおい　こと。ひもや　えんぴつに　つかうよ。", lenTerm(true));
term("mijikai", 2, "みじかい", "「みじかい」は、はしから　はしまでが　ちかい　こと。", lenTerm(false));
term("ko", 2, "〜こ", "「3こ」は　ぜんぶで　3つ　ある　こと。「3ばんめ」とは　ちがうよ。", () => {
  const [n, e] = pick(FRU);
  const k = 2 + rand(4);
  return W({
    ask: `${n}が　${k}こ　ある　えは　どれ？`,
    choices: [k - 1, k, k + 1, k + 2].map((m) => ({ svg: countSvg(e, m), ok: m === k })),
  });
});
term("banme", 2, "〜ばんめ", "「ひだりから　3ばんめ」は、ひだりから　1、2、3と　かぞえて　3つめに　ある　もの。", () => {
  const row = sample(ANI, 5);
  const k = 2 + rand(3); // 2〜4
  const fromR = row[5 - k];
  const picks = [...new Set([row[k - 1], row[k - 2], row[k], fromR])];
  return W({
    scene: rowEmoji(row.map((x) => x[1]), 170),
    ask: `ひだりから　${k}ばんめに　いるのは　だれ？`,
    choices: picks.map(([n, e]) => ({ text: n, emoji: e, ok: n === row[k - 1][0] })),
  });
});
term("zenbu", 2, "ぜんぶ", "「ぜんぶ」は、ひとつも　のこさず　みんな　と　いう　こと。", () => {
  const [cn, , ch] = pick(COLS);
  const ot = pick(COLS.filter((c) => c[0] !== cn))[2];
  return W({
    ask: `まるが　ぜんぶ　${cn === "きいろ" ? "きいろ" : cn}い　えは　どれ？`,
    choices: [{ svg: dotsSvg(Array(4).fill(ch)), ok: true }, { svg: dotsSvg(shuffle([ch, ch, ch, ot])), ok: false }, { svg: dotsSvg(shuffle([ch, ch, ot, ot])), ok: false }, { svg: dotsSvg(Array(4).fill(ot)), ok: false }],
  });
});
const REASON = [["あめが　ふって　いる", "かさを　さします", "どうして　かさを　さすの？"], ["おなかが　すいた", "ごはんを　たべます", "どうして　ごはんを　たべるの？"], ["さむい", "うわぎを　きます", "どうして　うわぎを　きるの？"], ["ねむい", "ふとんに　はいります", "どうして　ふとんに　はいるの？"], ["のどが　かわいた", "みずを　のみます", "どうして　みずを　のむの？"]];
term("kara", 2, "〜から（わけ）", "「〜から」は　わけを　いう　ことば。「あめが　ふって　いるから、かさを　さす」の　わけは「あめ」だよ。", () => {
  const [[w, r, q], ...rest] = shuffle(REASON);
  return textItem(`「${w}から、${r}」。${q}`, [`${w}から`, `${rest[0][0]}から`, `${rest[1][0]}から`], `${w}から`);
});

// ================================================================
// レベル3
// ================================================================
const maeTerm = (mae) => () => {
  const faceR = coin();
  const pic = (fr, starR, above) => svg(140, 90, fish(70, 50, fr ? 0 : 180) + star(above ? 70 : starR ? 118 : 22, above ? 16 : 50, 11));
  const front = faceR; // まえ が みぎ
  const goodR = mae ? front : !front;
  return W({
    scene: null,
    ask: `さかなの　${mae ? "まえ" : "うしろ"}に　ほしが　ある　えは　どれ？`,
    choices: [{ svg: pic(faceR, goodR), ok: true }, { svg: pic(!faceR, goodR), ok: false }, { svg: pic(faceR, !goodR), ok: false }, { svg: pic(faceR, false, true), ok: false }],
  });
};
term("mae", 3, "まえ", "「まえ」は　かおが　むいて　いる　ほう。むきが　かわると「まえ」も　かわるよ。", maeTerm(true));
term("ushiro", 3, "うしろ", "「うしろ」は　せなかの　ほう（さかななら　しっぽの　ほう）。", maeTerm(false));
term("tonari", 3, "となり", "「となり」は、すぐ　よこに　くっついて　ならんで　いる　こと。あいだに　ほかの　ものが　ない。", () => {
  const row = sample(ANI, 4);
  const end = coin() ? 0 : 3;
  const nb = end === 0 ? 1 : 2;
  return W({
    scene: rowEmoji(row.map((x) => x[1]), 150),
    ask: `${row[end][0]}の　となりに　いるのは　だれ？`,
    choices: row.filter((_, i) => i !== end).map(([n, e], i) => ({ text: n, emoji: e, ok: n === row[nb][0] })),
  });
});
term("aida", 3, "あいだ", "「Aと　Bの　あいだ」は、Aと　Bに　はさまれた　まんなかの　ところ。", () => {
  const row = sample(ANI, 5);
  const i = rand(3);
  return W({
    scene: rowEmoji(row.map((x) => x[1]), 170),
    ask: `${row[i][0]}と　${row[i + 2][0]}の　あいだに　いるのは　だれ？`,
    choices: shuffle(row.filter((_, j) => j !== i && j !== i + 2)).map(([n, e]) => ({ text: n, emoji: e, ok: n === row[i + 1][0] })),
  });
});
term("ooi", 3, "おおい・すくない", "「おおい」は　かずが　たくさん　ある　こと。おおきさとは　ちがうよ。ちいさくても　たくさん　あれば「おおい」。", () => {
  const [n, e] = pick(FRU);
  const a = 2 + rand(2), b = a + 2 + rand(3);
  const many = (k, sz) => svg(150, 70, Array.from({ length: k }, (_, i) => emo(e, 18 + (i % 5) * 28, k > 5 ? (i < 5 ? 18 : 50) : 35, sz)).join(""));
  const trap = coin(); // おおい ほうを ちいさく かく
  const ooi = coin();
  return W({
    ask: `${n}が　${ooi ? "おおい" : "すくない"}　ほうは　どっち？`,
    choices: [{ svg: many(b, trap ? 16 : 26), ok: ooi }, { svg: many(a, trap ? 34 : 24), ok: !ooi }],
  });
});
const kid = (hat, col) => `<circle cx="0" cy="8" r="11" fill="#ffe0b2" stroke="#8d6e63" stroke-width="1.5"/>${hat ? `<polygon points="-11,0 11,0 0,-16" fill="${col}"/>` : ""}`;
const kidsRow = (hats) => svg(160, 60, hats.map((h, i) => `<g transform="translate(${22 + i * 38} 32)">${kid(h, "#42a5f5")}</g>`).join(""));
term("minna", 3, "みんな", "「みんな」は、そこに　いる　ひと　ぜんいん。ひとりでも　ちがえば「みんな」では　ない。", () => W({
  ask: "みんな　ぼうしを　かぶって　いる　えは　どれ？",
  choices: [{ svg: kidsRow([1, 1, 1, 1]), ok: true }, { svg: kidsRow(shuffle([1, 1, 1, 0])), ok: false }, { svg: kidsRow(shuffle([1, 0, 0, 0])), ok: false }, { svg: kidsRow([0, 0, 0, 0]), ok: false }],
}));
term("hitotsumo", 3, "ひとつも〜ない", "「ひとつも　〜ない」は、ぜんぜん　ない　こと。1つでも　あれば　ちがう。", () => {
  const [cn, , ch] = pick(COLS);
  const ot = COLS.filter((c) => c[0] !== cn).map((c) => c[2]);
  return W({
    ask: `${cn}い　まるが　ひとつも　ない　えは　どれ？`,
    choices: [{ svg: dotsSvg([ot[0], ot[1], ot[0], ot[1]]), ok: true }, { svg: dotsSvg(shuffle([ch, ot[0], ot[1], ot[0]])), ok: false }, { svg: dotsSvg(shuffle([ch, ch, ot[1], ot[0]])), ok: false }, { svg: dotsSvg([ch, ch, ch, ch]), ok: false }],
  });
});
term("ichiban", 3, "いちばん", "「いちばん　おおきい」は、ぜんぶの　なかで　ほかの　どれよりも　おおきい　ひとつ。", () => {
  const [n, e] = pick(FRU);
  const big = coin();
  const sizes = shuffle([22, 32, 44, 58]);
  return W({
    ask: `いちばん　${big ? "おおきい" : "ちいさい"}　${n}は　どれ？`,
    choices: sizes.map((s) => ({ svg: svg(100, 100, emo(e, 50, 52, s)), ok: s === (big ? 58 : 22) })),
  });
});
const house = (x) => `<polygon points="${x - 30},50 ${x},22 ${x + 30},50" fill="#e57373"/><rect x="${x - 24}" y="50" width="48" height="40" fill="#ffe0b2" stroke="#8d6e63"/><rect x="${x - 8}" y="66" width="16" height="24" fill="#8d6e63"/>`;
term("deru", 3, "でる・はいる", "「でる」は　なかから　そとへ、「はいる」は　そとから　なかへ　うごく　こと。", () => {
  const [n, e] = pick(ANI);
  const out = coin();
  const pic = (dir) => svg(170, 100, house(45) + emo(e, 125, 76, 28) + (dir === 0 ? "" : `<path d="${dir > 0 ? "M78,92 L150,92 M140,85 L150,92 L140,99" : "M150,92 L78,92 M88,85 L78,92 L88,99"}" stroke="#5d4037" stroke-width="4" fill="none" stroke-linecap="round"/>`));
  return W({
    ask: out ? `${n}が　いえから　でて　いく　えは　どれ？` : `${n}が　いえに　はいって　いく　えは　どれ？`,
    choices: [{ svg: pic(1), ok: out }, { svg: pic(-1), ok: !out }, { svg: pic(0), ok: false }],
  });
});
const DEMO = [["おなかが　いっぱい。", "ケーキを　たべた。", "でも"], ["あめが　ふって　いる。", "そとで　あそんだ。", "でも"], ["ねむい。", "まだ　おきて　いた。", "でも"], ["あさ　おきた。", "かおを　あらった。", "そして"], ["てを　あらった。", "おやつを　たべた。", "そして"]];
term("demo", 3, "でも", "「でも」は、まえと　はんたいの　ことや、おもって　いたのと　ちがう　ことを　いう　ときに　つかうよ。", () => {
  const [a, b, ans] = pick(DEMO);
  return textItem(`「${a}（　　）、${b}」。（　　）に　あう　ことばは？`, ["でも", "そして"], ans, { fixed: true });
});
const OPP = [["おおきい", "ちいさい"], ["ながい", "みじかい"], ["うえ", "した"], ["みぎ", "ひだり"], ["はやい", "おそい"], ["あつい", "さむい"], ["おおい", "すくない"], ["まえ", "うしろ"]];
term("hantai", 3, "はんたい", "「はんたい」は、ぎゃくの　いみの　ことば。「おおきい」の　はんたいは「ちいさい」。", () => {
  const [[a, b], ...rest] = shuffle(OPP);
  return textItem(`「${a}」の　はんたいの　ことばは　どれ？`, [b, rest[0][0], rest[1][1], rest[2][0]], b);
});

// ================================================================
// レベル4
// ================================================================
term("mannaka", 4, "まんなか", "「まんなか」は、りょうはしから　おなじ　だけ　はなれた　ところ。", () => {
  const row = sample(ANI, 5);
  return W({
    scene: rowEmoji(row.map((x) => x[1]), 170), ask: "まんなかに　いるのは　だれ？",
    choices: shuffle([row[2], row[1], row[3], row[0]]).map(([n, e]) => ({ text: n, emoji: e, ok: n === row[2][0] })),
  });
});
term("hashi", 4, "はし", "「はし」は、ならびの　いちばん　さいごの　ところ。みぎの　はし、ひだりの　はしが　あるよ。", () => {
  const row = sample(ANI, 5);
  const right = coin();
  const ans = right ? row[4] : row[0];
  return W({
    scene: rowEmoji(row.map((x) => x[1]), 170), ask: `${right ? "みぎ" : "ひだり"}の　はしに　いるのは　だれ？`,
    choices: shuffle([row[0], row[4], row[2], right ? row[3] : row[1]]).map(([n, e]) => ({ text: n, emoji: e, ok: n === ans[0] })),
  });
});
term("takai", 4, "たかい・ひくい", "「たかい」は　したから　うえまでが　ながい　こと。よこに　ひろくても　たかいとは　かぎらないよ。", () => {
  const tall = coin();
  const specs = shuffle([[24, 90], [60, 46], [36, 68], [30, 30]]); // [はば, たかさ]
  const bld = ([w, h]) => svg(100, 100, `<rect x="${50 - w / 2}" y="${96 - h}" width="${w}" height="${h}" fill="#90a4ae" stroke="#455a64" stroke-width="2"/><line x1="0" y1="96" x2="100" y2="96" stroke="#6d4c41" stroke-width="3"/>`);
  const goal = tall ? 90 : 30;
  return W({ ask: `いちばん　${tall ? "たかい" : "ひくい"}　ビルは　どれ？`, choices: specs.map((s) => ({ svg: bld(s), ok: s[1] === goal })) });
});
term("awasete", 4, "あわせて", "「あわせて」は、ぜんぶ　いっしょに　すると　いくつ　かを　かんがえる　こと（たしざん）。", () => {
  const a = 1 + rand(4), b = 1 + rand(4);
  const [c1, c2] = sample(COLS, 2);
  const nums = [...new Set([a + b, a, b, Math.abs(a - b) || a + b + 1, a + b + 1])].slice(0, 4);
  return W({
    scene: dotsSvg([...Array(a).fill(c1[2]), ...Array(b).fill(c2[2])]),
    ask: `${c1[1]}　まると　${c2[1]}　まる、あわせて　いくつ？`,
    choices: nums.map((x) => ({ text: `${x}こ`, ok: x === a + b })),
  });
});
term("igai", 4, "いがい", "「Aいがい」は、Aを　のぞいた　ほかの　もの　ぜんぶ。", () => {
  const [c1, c2, c3] = shuffle(COLS);
  const k = 1 + rand(3), m = 2 + rand(3);
  const list = shuffle([...Array(k).fill(c1[2]), ...Array(m).fill(pick([c2, c3])[2])]);
  const nums = [...new Set([m, k, k + m, m + 1])];
  return W({ scene: dotsSvg(list), ask: `${c1[1]}　まる　いがいの　まるは　いくつ？`, choices: nums.map((x) => ({ text: `${x}こ`, ok: x === m })) });
});
term("dochiraka", 4, "どちらか", "「Aか　Bの　どちらか」は、Aと　Bの　うち　かたほう。りょうほうでは　ない。", () => {
  const [[nA, eA], [nB, eB], [, eC]] = sample(FRU, 3);
  const plate = (es) => svg(120, 70, `<ellipse cx="60" cy="48" rx="50" ry="14" fill="#eceff1" stroke="#90a4ae" stroke-width="2"/>` + es.map((e, i) => emo(e, 60 + (i - (es.length - 1) / 2) * 30, 36, 26)).join(""));
  return W({
    ask: `${nA}か　${nB}の、どちらか　ひとつ　だけが　のって　いる　おさらは　どれ？`,
    choices: [{ svg: plate([pick([eA, eB])]), ok: true }, { svg: plate([eA, eB]), ok: false }, { svg: plate([eC]), ok: false }, { svg: plate([]), ok: false }],
  });
});
const CAT = {
  くだもの: [["りんご", "🍎"], ["みかん", "🍊"], ["ぶどう", "🍇"], ["いちご", "🍓"], ["バナナ", "🍌"]],
  どうぶつ: [["ねこ", "🐈"], ["いぬ", "🐕"], ["うさぎ", "🐇"], ["くま", "🐻"], ["さる", "🐒"]],
  のりもの: [["くるま", "🚗"], ["バス", "🚌"], ["でんしゃ", "🚃"], ["じてんしゃ", "🚲"], ["ひこうき", "✈️"]],
  きるもの: [["シャツ", "👕"], ["ズボン", "👖"], ["くつした", "🧦"], ["ぼうし", "🧢"], ["ワンピース", "👗"]],
};
term("nakama", 4, "なかま", "「なかま」は、おなじ　しゅるいの　もの。くだもの、どうぶつ、のりもの　などの　まとまりだよ。", () => {
  const [c1, c2] = sample(Object.keys(CAT), 2);
  const odd = pick(CAT[c2]);
  return W({
    ask: "なかまじゃ　ない　ものは　どれ？",
    choices: [...sample(CAT[c1], 3).map(([n, e]) => ({ text: n, emoji: e, ok: false })), { text: odd[0], emoji: odd[1], ok: true }],
  });
});
term("tabun", 4, "たぶん・かならず", "「かならず」は　ぜったい　そう　なる　こと。「たぶん」は　そう　なりそう　だけど、ちがう　ことも　ある。", () => {
  const [s, yes, no] = pick([["あしたは", "はれる", "はれない"], ["けんくんは", "くる", "こない"], ["バスは", "8じに　つく", "8じに　つかない"]]);
  return coin()
    ? textItem(`「${s}　たぶん　${yes}」。ほんとうに　${yes}？`, [`${yes}と　おもうけど、${no}　ことも　ある`, "ぜったいに　" + yes, "ぜったいに　" + no], `${yes}と　おもうけど、${no}　ことも　ある`)
    : textItem(`「${s}　かならず　${yes}」。ほんとうに　${yes}？`, [`${yes}と　おもうけど、${no}　ことも　ある`, "ぜったいに　" + yes, "ぜったいに　" + no], "ぜったいに　" + yes);
});
term("kinou", 4, "きのう・あした", "「きのう」は　きょうの　1にち　まえ、「あした」は　きょうの　1にち　あと。", () => {
  const d = 3 + rand(25);
  const t = coin();
  const ans = t ? d + 1 : d - 1;
  return W({ ask: `きょうは　${d}にち。${t ? "あした" : "きのう"}は　なんにち？`, choices: [d - 1, d, d + 1, d + 2].map((x) => ({ text: `${x}にち`, ok: x === ans })), fixed: true });
});

// ================================================================
// レベル5
// ================================================================
const tateyoko = (tate) => () => {
  const S = pick(["まる", "さんかく", "しかく"]);
  const line = (d) => svg(120, 120, [0, 1, 2].map((i) => { const o = (i - 1) * 30; const [x, y] = d === "たて" ? [60, 60 + o] : d === "よこ" ? [60 + o, 60] : [60 + o, 60 - o]; return fillShape(S, x, y, 11); }).join(""));
  const rect = (wide) => svg(120, 120, `<rect x="${wide ? 14 : 42}" y="${wide ? 42 : 14}" width="${wide ? 92 : 36}" height="${wide ? 36 : 92}" fill="#80cbc4" stroke="#00796b" stroke-width="3"/>`);
  const w = tate ? "たて" : "よこ";
  return coin()
    ? W({ ask: `${S}が　${w}に　ならんで　いる　えは　どれ？`, choices: [{ svg: line(w), ok: true }, { svg: line(tate ? "よこ" : "たて"), ok: false }, { svg: line("ななめ"), ok: false }] })
    : W({ ask: `${w}に　ながい　しかくは　どれ？`, choices: [{ svg: rect(!tate), ok: true }, { svg: rect(tate), ok: false }, { svg: svg(120, 120, `<rect x="30" y="30" width="60" height="60" fill="#80cbc4" stroke="#00796b" stroke-width="3"/>`), ok: false }] });
};
term("tate", 5, "たて", "「たて」は　{上|うえ}と　{下|した}の　むき。「たてに　ならぶ」は　{上|うえ}から　{下|した}へ　ならぶ　こと。「たてに　ながい」は　{上|うえ}から　{下|した}までが　ながい　こと。", tateyoko(true));
term("yoko", 5, "よこ", "「よこ」は　{左|ひだり}と　{右|みぎ}の　むき。「よこに　ならぶ」は　{左|ひだり}から　{右|みぎ}へ　ならぶ　こと。", tateyoko(false));
term("nokori", 5, "のこり", "「のこり」は、つかったり　たべたり　した　あとに　まだ　ある　ぶん（ひきざん）。", () => {
  const [n] = pick(FRU);
  const a = 4 + rand(6), b = 1 + rand(a - 2);
  return W({ ask: `${n}が　${a}こ　あります。${b}こ　たべました。のこりは　なんこ？`, choices: [...new Set([a - b, b, a, a + b])].map((x) => ({ text: `${x}こ`, ok: x === a - b })) });
});
term("chigai", 5, "ちがい（かず）", "「かずの　ちがい」は、どれだけ　おおいか・すくないか。おおい　ほうから　すくない　ほうを　ひくよ。", () => {
  const a = 5 + rand(5), b = 1 + rand(a - 2);
  const [c1, c2] = sample(COLS, 2);
  return W({
    scene: dotsSvg([...Array(a).fill(c1[2]), ...Array(b).fill(c2[2])]),
    ask: `${c1[1]}　まるは　${a}こ、${c2[1]}　まるは　${b}こ。ちがいは　なんこ？`,
    choices: [...new Set([a - b, a + b, a, b])].map((x) => ({ text: `${x}こ`, ok: x === a - b })),
  });
});
term("zutsu", 5, "〜ずつ", "「2こずつ」は、ひとりに　2こ、つぎの　{人|ひと}にも　2こ…と　おなじ　かずに　する　こと。", () => {
  const [, e] = pick(FRU);
  const k = 2 + rand(2);
  const plates = (cs) => svg(170, 70, cs.map((c, i) => `<ellipse cx="${30 + i * 55}" cy="52" rx="24" ry="8" fill="#eceff1" stroke="#90a4ae"/>` + Array.from({ length: c }, (_, j) => emo(e, 30 + i * 55 + (j - (c - 1) / 2) * 14, 38, 16)).join("")).join(""));
  return W({
    ask: `ひとりに　${k}こずつ　くばった　えは　どれ？`,
    choices: [{ svg: plates([k, k, k]), ok: true }, { svg: plates(shuffle([k - 1, k, k + 1])), ok: false }, { svg: plates([k + 1, k + 1, k + 1]), ok: false }, { svg: plates(shuffle([k, k, k - 1])), ok: false }],
  });
});
term("sukunakutomo", 5, "すくなくとも", "「すくなくとも　2つ」は、2つか、それより　おおい　こと。2つでも　3つでも　あてはまるよ。", () => {
  const [cn, , ch] = pick(COLS);
  const ot = pick(COLS.filter((c) => c[0] !== cn))[2];
  const pic = (k) => dotsSvg(shuffle([...Array(k).fill(ch), ...Array(4 - k).fill(ot)]));
  return W({ ask: `${cn}い　まるが　すくなくとも　2つ　ある　えを　すべて　えらんでね。`, multi: true, choices: [0, 1, 2, 3].map((k) => ({ svg: pic(k), ok: k >= 2 })) });
});
term("kasu", 5, "かす・かりる", "「かす」は　じぶんの　ものを　あいてに　つかわせる　こと。「かりる」は　あいての　ものを　つかわせて　もらう　こと。あとで　かえすよ。", () => {
  const [[nA, eA], [nB, eB]] = sample(ANI, 2);
  const [O] = pick([["えほん"], ["かさ"], ["クレヨン"]]);
  const [ask, ans] = pick([[`${O}を　かりたのは　だれ？`, nB], [`${O}を　あとで　かえすのは　だれ？`, nB], [`${O}を　かしたのは　だれ？`, nA]]);
  return W({ ask: `「${nA}は　${nB}に　${O}を　かしました」。${ask}`, choices: [{ text: nA, emoji: eA, ok: ans === nA }, { text: nB, emoji: eB, ok: ans === nB }] });
});
term("kureru", 5, "くれる", "「〜が　わたしに　くれる」は、あいてが　じぶんに　ものを　わたす　こと。もらうのは　じぶん。", () => {
  const P = pick(["おばあちゃん", "おとうさん", "ともだち"]);
  const O = pick(["あめ", "えほん", "シール"]);
  return textItem(`「${P}が　わたしに　${O}を　くれました」。${O}を　もらったのは　だれ？`, ["わたし", P], "わたし", { fixed: true });
});
term("mouhitotsu", 5, "もう{一|ひと}つ", "「もう{一|ひと}つ」は、ふたつ　あるうちの　まだ　いって　いない　ほう。", () => {
  const [c1, c2] = sample(COLS, 2);
  const ball = (c) => svg(80, 80, `<circle cx="40" cy="40" r="26" fill="${c}"/>`);
  return W({ ask: `${c1[1]}　ボールと　${c2[1]}　ボールが　あります。${c1[1]}　ほうを　とりました。もう{一|ひと}つは　どれ？`, choices: [{ svg: ball(c2[2]), ok: true }, { svg: ball(c1[2]), ok: false }] });
});
const DAKARA = [["{雨|あめ}が　ふって　きた。", "かさを　さした。", "だから"], ["おなかが　すいた。", "ごはんを　たくさん　たべた。", "だから"], ["さむい。", "セーターを　きた。", "だから"], ["おなかが　いっぱい。", "ケーキを　たべた。", "でも"], ["{雨|あめ}が　ふって　いる。", "そとで　あそんだ。", "でも"]];
term("dakara", 5, "だから", "「だから」は、まえの　ことが　わけで、あとの　ことが　おきる　ときに　つかうよ。", () => {
  const [a, b, ans] = pick(DAKARA);
  return textItem(`「${a}（　　）、${b}」。（　　）に　あう　ことばは？`, ["だから", "でも"], ans, { fixed: true });
});

// ================================================================
// レベル6
// ================================================================
term("naname", 6, "ななめ", "「ななめ」は、たてでも　よこでも　なく　かたむいて　いる　むき。", () => {
  const ln = (x1, y1, x2, y2) => svg(100, 100, `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#37474f" stroke-width="7" stroke-linecap="round"/>`);
  const diag = coin() ? ln(18, 82, 82, 18) : ln(18, 18, 82, 82);
  return W({ ask: "ななめの　せんは　どれ？", choices: [{ svg: diag, ok: true }, { svg: ln(50, 12, 50, 88), ok: false }, { svg: ln(12, 50, 88, 50), ok: false }] });
});
term("sakasama", 6, "さかさま", "「さかさま」は　{上|うえ}と　{下|した}が　ぎゃくに　なる　こと。", () => {
  const e = pick(["🏠", "🌳", "🍦", "🚗", "⛄"]);
  const rot = (deg) => svg(100, 100, `<g transform="rotate(${deg} 50 50)">${emo(e, 50, 50, 54)}</g>`);
  return W({ ask: "さかさまに　なって　いる　えは　どれ？", choices: [{ svg: rot(180), ok: true }, { svg: rot(0), ok: false }, { svg: rot(90), ok: false }] });
});
term("muki", 6, "むき", "「みぎを　むく」は、かおが　みぎの　ほうに　ある　こと。", () => {
  const dirs = [["みぎ", 0], ["ひだり", 180], ["うえ", 270], ["した", 90]];
  const [w] = pick(dirs);
  return W({ ask: `${w}を　むいて　いる　さかなは　どれ？`.replace("みぎ", "{右|みぎ}").replace("ひだり", "{左|ひだり}").replace("うえ", "{上|うえ}").replace("した", "{下|した}"), choices: dirs.map(([n, d]) => ({ svg: svg(100, 100, fish(50, 50, d)), ok: n === w })) });
});
term("omoi", 6, "おもい・かるい", "「おもい」は　もちあげるのに　ちからが　いる　こと。おおきくても　かるい　ものも　あるよ。シーソーは　おもい　ほうが　{下|さ}がる。", () => {
  // じっさいの おもさと あう くみだけ（おおきいのに かるい くみ／おおきくて おもい くみ を まぜる）
  const [[nBig, eBig], [nSmall, eSmall], heavySmall] = pick([
    [["ふうせん", "🎈"], ["いし", "🪨"], true], [["ぬいぐるみ", "🧸"], ["かなづち", "🔨"], true], [["はね", "🪶"], ["りんご", "🍎"], true],
    [["すいか", "🍉"], ["いちご", "🍓"], false], [["ほん", "📚"], ["えんぴつ", "✏️"], false],
  ]);
  const seesaw = svg(170, 100, `<polygon points="85,96 75,78 95,78" fill="#8d6e63"/><g transform="rotate(${heavySmall ? 12 : -12} 85 76)"><rect x="15" y="72" width="140" height="7" fill="#a1887f"/>${emo(eBig, 30, 52, 38)}${emo(eSmall, 140, 58, 26)}</g>`);
  const askHeavy = coin();
  const heavy = heavySmall ? eSmall : eBig;
  const target = askHeavy ? heavy : heavy === eBig ? eSmall : eBig;
  return W({ scene: seesaw, ask: `シーソーを　みてね。${askHeavy ? "おもい" : "かるい"}　ほうは　どっち？`, choices: [[nBig, eBig], [nSmall, eSmall]].map(([n, e]) => ({ emoji: e, text: n, ok: e === target })) });
});
term("migikara", 6, "{右|みぎ}から〇ばんめ", "「{右|みぎ}から　2ばんめ」は、{右|みぎ}の　はしから　1、2と　かぞえる。{左|ひだり}から　かぞえないように　しよう。", () => {
  const row = sample(ANI, 5);
  const k = 2 + rand(2);
  const ansI = 5 - k, trapI = k - 1;
  const ids = [...new Set([ansI, trapI, ansI - 1, ansI + 1].filter((i) => i >= 0 && i < 5))];
  return W({ scene: rowEmoji(row.map((x) => x[1]), 170), ask: `{右|みぎ}から　${k}ばんめに　いるのは　だれ？`, choices: ids.map((i) => ({ text: row[i][0], emoji: row[i][1], ok: i === ansI })) });
});
term("ya", 6, "や（〜など）", "「Aや　B」は、Aと　Bの　ほかにも　ある　かも　しれない　いいかた。「Aと　B」は　それで　ぜんぶ。", () => {
  const [[x], [y]] = sample(FRU, 2);
  const ya = coin();
  return textItem(`「${x}${ya ? "や" : "と"}　${y}を　かいました」。かった　ものは？`, [`${x}と　${y}　だけ`, `${x}と　${y}。ほかにも　かったか　どうかは　わからない`], ya ? `${x}と　${y}。ほかにも　かったか　どうかは　わからない` : `${x}と　${y}　だけ`, { fixed: true });
});
term("tara", 6, "〜たら", "「Aたら　B」は、Aに　なった　ときに　Bに　なる　と　いう　きまり。", () => {
  const [c, r, ok] = pick([["{雨|あめ}が　ふったら", "えんそくは　ちゅうし", "{雨|あめ}が　ふりました"], ["ベルが　なったら", "きょうしつに　もどる", "ベルが　なりました"], ["{手|て}を　あらったら", "おやつを　たべて　いい", "{手|て}を　あらいました"]]);
  return textItem(`「${c}、${r}」。${ok}。どう　なる？`, [r, `${r}に　ならない`], r, { fixed: true });
});
term("ototoi", 6, "おととい・あさって", "「おととい」は　きのうの　まえの　日（2日　まえ）、「あさって」は　あしたの　つぎの　日（2日　あと）。", () => {
  const d = 4 + rand(22);
  const t = coin();
  const ans = t ? d + 2 : d - 2;
  return W({ ask: `きょうは　${d}にち。${t ? "あさって" : "おととい"}は　なんにち？`, choices: [d - 2, d - 1, d + 1, d + 2].map((x) => ({ text: `${x}にち`, ok: x === ans })), fixed: true });
});

// ================================================================
// レベル7
// ================================================================
const depthTerm = (back) => () => {
  const [, e] = pick(FRU);
  const box = `<rect x="35" y="48" width="50" height="40" fill="${BOXC}" stroke="#8d6e3f" stroke-width="2"/>`;
  const behind = svg(120, 120, emo(e, 60, 40, 32) + box);
  const front = svg(120, 120, box + emo(e, 60, 90, 32));
  const top = svg(120, 120, box + emo(e, 60, 30, 28).replace('y="30"', 'y="32"'));
  const side = svg(120, 120, box + emo(e, 104, 70, 28));
  return W({
    ask: `はこの　${back ? "おく" : "てまえ"}に　ある　えは　どれ？`,
    choices: [{ svg: behind, ok: back }, { svg: front, ok: !back }, { svg: side, ok: false }],
  });
};
term("temae", 7, "てまえ", "「てまえ」は　じぶんに　ちかい　ほう。えでは　{下|した}の　ほうに　かかれ、ものに　かさなって　みえる。", depthTerm(false));
term("oku", 7, "おく", "「おく」は　じぶんから　とおい　ほう。えでは　{上|うえ}の　ほうに　かかれ、ほかの　ものに　かくれて　みえる。", depthTerm(true));
term("hiroi", 7, "ひろい・せまい", "「ひろい」は　めんせき（ばしょの　おおきさ）が　おおきい　こと。ながくても　ほそければ　ひろく　ない。", () => {
  const specs = shuffle([[80, 70], [100, 18], [40, 40], [24, 90]]);
  const wide = coin();
  const area = (s) => s[0] * s[1];
  const best = specs.reduce((a, b) => ((wide ? area(b) > area(a) : area(b) < area(a)) ? b : a));
  return W({ ask: `いちばん　${wide ? "ひろい" : "せまい"}　へや（しかく）は　どれ？`, choices: specs.map((s) => ({ svg: svg(120, 110, `<rect x="${60 - s[0] / 2}" y="${55 - s[1] / 2}" width="${s[0]}" height="${s[1]}" fill="#c5e1a5" stroke="#558b2f" stroke-width="2"/>`), ok: s === best })) });
});
term("futoi", 7, "ふとい・ほそい", "「ふとい」は　はばが　ある　こと。ながさとは　ちがうよ。", () => {
  const thick = coin();
  const specs = shuffle([[14, 50], [3, 110], [8, 80], [5, 40]]); // [ふとさ, ながさ]
  const goal = thick ? 14 : 3;
  return W({ ask: `いちばん　${thick ? "ふとい" : "ほそい"}　せんは　どれ？`, choices: specs.map(([w, l]) => ({ svg: svg(130, 40, `<line x1="${65 - l / 2}" y1="20" x2="${65 + l / 2}" y2="20" stroke="#5d4037" stroke-width="${w}" stroke-linecap="round"/>`), ok: w === goal })) });
});
term("shika", 7, "しか〜ない", "「〜しか　ない」は「それだけ　ある」と　いう　いみ。すくない　かんじを　あらわすよ。", () => {
  const [n, e] = pick(FRU);
  const k = 1 + rand(2);
  return W({ ask: `「${n}が　${k}こしか　ない」　えは　どれ？`, choices: [k, k + 2, k + 4, 0].map((m) => ({ svg: countSvg(e, m || 0) , ok: m === k })).filter((c, i, a) => a.findIndex((x) => x.svg === c.svg) === i) });
});
term("kamo", 7, "かもしれない", "「かもしれない」は、そう　なる　ことも、ならない　ことも　ある　いいかた。", () => {
  const [s, x, y] = pick([["あしたは", "{雨|あめ}が　ふる", "ふらない"], ["けんたさんは", "おくれて　くる", "おくれない"], ["この　はこには", "おかしが　{入|はい}って　いる", "{入|はい}って　いない"]]);
  return textItem(`「${s}　${x}かもしれない」。どう　いう　いみ？`, [`${x}か　どうか、まだ　わからない`, `かならず　${x}`, `ぜったいに　${y}`], `${x}か　どうか、まだ　わからない`);
});
term("oshieru", 7, "おしえる・おそわる", "「おしえる」は　しって　いる　ことを　あいてに　つたえる　こと。「おそわる」は　あいてから　ならう　こと。", () => {
  const [[nA, eA], [nB, eB]] = sample(ANI, 2);
  const G = pick(["おりがみ", "なわとび", "うた"]);
  const [ask, ans] = pick([[`${G}を　おそわったのは　だれ？`, nB], [`${G}を　おしえたのは　だれ？`, nA]]);
  return W({ ask: `「${nA}は　${nB}に　${G}を　おしえました」。${ask}`, choices: [{ text: nA, emoji: eA, ok: ans === nA }, { text: nB, emoji: eB, ok: ans === nB }] });
});
term("shokubutsu", 7, "しょくぶつ・どうぶつ", "「しょくぶつ」は　ねを　はって　そだつ　いきもの（{花|はな}や　{木|き}）。「どうぶつ」は　じぶんで　うごく　いきもの。", () => {
  const PL = [["ひまわり", "🌻"], ["チューリップ", "🌷"], ["さくら", "🌸"], ["{木|き}", "🌳"]];
  const AN = [["{犬|いぬ}", "🐕"], ["ちょう", "🦋"], ["さかな", "🐟"], ["ねこ", "🐈"]];
  const plant = coin();
  const [one, many] = plant ? [PL, AN] : [AN, PL];
  return W({ ask: `${plant ? "しょくぶつ" : "どうぶつ"}は　どれ？`, choices: [pick(one), ...sample(many, 3)].map(([n, e], i) => ({ text: n, emoji: e, ok: i === 0 })) });
});

// ----------------------------------------------------------------
const termsAt = (lv) => TERMS.filter((t) => t.lv <= lv);
const newTermsAt = (lv) => TERMS.filter((t) => t.lv === lv);
function drawWord(t) {
  const q = t.gen();
  const n = (s) => notate(s, t.lv);
  return {
    ...q, kind: "word", level: t.lv, unit: `w:${t.id}`, term: t,
    ask: n(q.ask), explain: n(t.card), word: n(t.word),
    choices: q.choices.map((c) => ({ ...c, text: n(c.text) })),
  };
}
if (typeof module !== "undefined") module.exports = { TERMS, termsAt, newTermsAt, drawWord };
