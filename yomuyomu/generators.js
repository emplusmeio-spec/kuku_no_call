// 問題ジェネレーター（よむ れんしゅう）
//
// tpl(分野, id, 使うレベルの はじめ, おわり, 生成関数)
//   生成関数は (lv) を受けとり、呼ぶたびに新しい問題を1つ返す。
//   1つの「型」が マスター判定の1単位になる（2回／3回つづけて正解でクリア）。
//
// 表記は notate() が最後にそろえる：
//   lv<5 なら {漢字|よみ} → よみ、 lv<4 なら カタカナ → ひらがな
// なので、型の中では「いちばん上のレベルの表記」で書いておけばよい。

// ---------- 道具 ----------
const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const coin = () => Math.random() < 0.5;
const LABELS = ["あ", "い", "う", "え", "お"];

const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
function notate(s, lv) {
  if (typeof s !== "string") return s;
  if (lv < 5) s = s.replace(/\{([^|}]+)\|([^}]+)\}/g, "$2");
  if (lv < 4) s = kataToHira(s);
  return s;
}

// choices: [{text?, svg?, emoji?, ok}]。fixed でなければ順番をシャッフル。図には あいうえ をふる。
function build(o) {
  const cs = o.fixed ? o.choices : shuffle(o.choices);
  return {
    ...o,
    choices: cs.map(({ ok, ...c }, i) => (c.svg && !c.text ? { ...c, text: LABELS[i] } : c)),
    answer: cs.map((c, i) => (c.ok ? i : -1)).filter((i) => i >= 0),
  };
}
const opts = (texts, correct) => texts.map((t) => ({ text: t, ok: [].concat(correct).includes(t) }));
const TF = ["ただしい", "まちがい", "わからない"];
const tfChoices = (ans) => TF.map((t) => ({ text: t, ok: t === ans }));
const SAMEDIFF = (same) => [{ text: "おなじ", ok: same }, { text: "ちがう", ok: !same }];
const SAME_ASK = "アと　イは、おなじ　ことを　いって　いますか。";
const TF_ASK = (stmt) => `うえの　ぶんが　ほんとうの　とき、つぎの　ぶんは　どれですか。\n「${stmt}」`;

// ---------- 図の部品 ----------
const COLOR = { まる: "#ef5350", さんかく: "#42a5f5", しかく: "#ffca28" };
const HEX = { あか: "#ef5350", あお: "#42a5f5", きいろ: "#fbc02d", みどり: "#66bb6a", しろ: "#eceff1" };
const fillShape = (t, x, y, s = 16, col) => {
  const c = col || COLOR[t];
  if (t === "まる") return `<circle cx="${x}" cy="${y}" r="${s}" fill="${c}"/>`;
  if (t === "さんかく") return `<polygon points="${x},${y - s - 1} ${x - s - 2},${y + s - 2} ${x + s + 2},${y + s - 2}" fill="${c}"/>`;
  return `<rect x="${x - s + 1}" y="${y - s + 1}" width="${2 * s - 2}" height="${2 * s - 2}" fill="${c}"/>`;
};
const lineShape = (t, x, y, s = 30) => {
  const st = `fill="none" stroke="${COLOR[t]}" stroke-width="4" stroke-linejoin="round"`;
  if (t === "まる") return `<circle cx="${x}" cy="${y}" r="${s}" ${st}/>`;
  if (t === "さんかく") return `<polygon points="${x},${y - s - 6} ${x - s - 6},${y + s - 4} ${x + s + 6},${y + s - 4}" ${st}/>`;
  return `<rect x="${x - s + 2}" y="${y - s + 2}" width="${2 * s - 4}" height="${2 * s - 4}" ${st}/>`;
};
const svg = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const emo = (e, x, y, s = 28) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" dominant-baseline="central">${e}</text>`;
const strokeSvg = (inner) =>
  svg(120, 120, `<g fill="none" stroke="#37474f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`);
// むきが わかる さかな（dir: 0=みぎ 90=した 180=ひだり 270=うえ）
const fish = (x, y, dir, col = "#ff8a65") =>
  `<g transform="translate(${x} ${y}) rotate(${dir})"><polygon points="-14,0 -28,-11 -28,11" fill="${col}"/><ellipse cx="2" cy="0" rx="18" ry="11" fill="${col}"/><circle cx="11" cy="-2" r="2.6" fill="#263238"/></g>`;
const star = (x, y, s = 10, col = "#fbc02d") => {
  const p = [];
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + (i * Math.PI) / 5; p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(" ")}" fill="${col}"/>`;
};

// ---------- ことばの たな ----------
const ANIMALS = ["いぬ", "ねこ", "うさぎ", "くま", "りす", "きつね", "たぬき", "ぶた", "さる", "ぞう", "かえる", "ひよこ"];
const NAMES_SMALL = ["けんくん", "ゆいちゃん", "そうたくん", "はるちゃん", "りくくん", "めいちゃん"];
const NAMES_BIG = ["みさきさん", "ゆいさん", "はるかさん", "りこさん", "けんたさん", "ゆうきさん", "はるとさん", "そらさん"];
const names = (lv) => (lv >= 5 ? NAMES_BIG : NAMES_SMALL);
const PERSON5 = ["おじいさん", "おばあさん", "おまわりさん", "{先生|せんせい}"];
const CHILD5 = ["{女|おんな}の{子|こ}", "{男|おとこ}の{子|こ}", "ゆうたくん", "みおさん"];
const COLORS = ["{赤|あか}い", "{青|あお}い", "きいろい", "{白|しろ}い"];
const COLOR_KU = { "{赤|あか}い": "{赤|あか}く", "{青|あお}い": "{青|あお}く", "きいろい": "きいろく", "{白|しろ}い": "{白|しろ}く" };

// ================================================================
const TPL = [];
const tpl = (field, id, from, to, gen) => TPL.push({ field, id, from, to, gen });

// ================================================================
//  係り受け解析
// ================================================================
tpl("kakari", "asonde", 1, 3, () => {
  const [A, B] = sample(ANIMALS, 2);
  const P = pick(["にわ", "こうえん", "はらっぱ", "おか"]);
  const [v, vi] = pick([["ねむって", "ねむって　いる"], ["ひなたぼっこを　して", "ひなたぼっこを　して　いる"], ["ごはんを　たべて", "ごはんを　たべて　いる"], ["うたを　うたって", "うたを　うたって　いる"]]);
  return build({
    passage: `${A}と　あそんで　いた　${B}が、${P}で　${v}　います。`,
    ask: `${P}で　${vi}のは（　　）です。`,
    choices: opts([A, B, P], B),
    explain: `「${A}と　あそんで　いた」は　${B}の　せつめい。${vi}のは　${B}　だね。`,
    note: "文頭の語に引っぱられず、「〜が」がつく主語と述語の対応をつかめるか。",
  });
});
tpl("kakari", "ageta", 1, 2, () => {
  const [A, B] = sample(ANIMALS, 2);
  const O = pick(["どんぐり", "おはな", "りんご", "くり", "はっぱ"]);
  const recv = coin();
  return build({
    passage: `${A}が　${B}に　${O}を　あげました。`,
    ask: recv ? `${O}を　もらったのは（　　）です。` : `${O}を　あげたのは（　　）です。`,
    choices: opts([A, B, O], recv ? B : A),
    explain: `「${A}が」あげて、「${B}に」あげたね。あげたのは　${A}、もらったのは　${B}。`,
    note: "「が」（する人）と「に」（受け取る人）のちがいがわかるか。",
  });
});
tpl("kakari", "motta", 1, 4, () => {
  const [A, B] = sample(ANIMALS, 2);
  const c = pick(COLORS);
  const O = pick(["ふうせん", "はた", "かさ"]);
  const q = coin();
  return build({
    passage: `${c}　${O}を　もった　${A}が、${B}を　よんで　います。`,
    ask: q ? `${O}を　もって　いるのは（　　）です。` : `よんで　いるのは（　　）です。`,
    choices: opts([A, B, O], A),
    explain: `「${c}　${O}を　もった」は　${A}の　せつめい。${B}は　よばれて　いる　ほうだよ。`,
    note: "修飾語「〜をもった」がどの語にかかるか、「〜を よぶ」の主語と目的語を区別できるか。",
  });
});
tpl("kakari", "moratta", 2, 4, () => {
  const [A, B] = sample(ANIMALS, 2);
  const O = pick(["どんぐり", "おはな", "りんご", "ぼうし", "えほん"]);
  const giver = coin();
  return build({
    passage: `${A}は　${B}に　${O}を　もらいました。`,
    ask: giver ? `${O}を　あげたのは（　　）です。` : `${O}を　もらったのは（　　）です。`,
    choices: opts([A, B, O], giver ? B : A),
    explain: `「${B}に　もらいました」は、${B}が　くれた　と　いう　こと。あげたのは　${B}、もらったのは　${A}。`,
    note: "「〜に もらう」の「に」は渡す側。「〜に あげる」と「に」の役割が逆になることに気づけるか。",
  });
});
tpl("kakari", "suruto", 3, 5, (lv) => {
  const [A, B] = sample(lv >= 5 ? names(lv) : ANIMALS, 2);
  const [a1, a2, a1p, a2p] = pick([
    ["うたを　うたう", "おどりました", "うたを　うたった", "おどった"],
    ["たいこを　たたく", "はしりだしました", "たいこを　たたいた", "はしりだした"],
    ["{手|て}を　たたく", "とびはねました", "{手|て}を　たたいた", "とびはねた"],
  ]);
  const first = coin();
  return build({
    passage: `${A}が　${a1}と、${B}が　${a2}。`,
    ask: first ? `${a1p}のは（　　）です。` : `${a2p}のは（　　）です。`,
    choices: opts([A, B, `${A}と　${B}`], first ? A : B),
    explain: `「${A}が　${a1}」と「${B}が　${a2}」の　ふたつに　わけて　よもう。${a1p}のは　${A}、${a2p}のは　${B}。`,
    note: "2つの節（〜と、〜）それぞれの主語を取りちがえないか。",
  });
});
tpl("kakari", "tsukutta", 3, 6, (lv) => {
  const [C, B] = sample(lv >= 5 ? [...PERSON5, ...CHILD5] : ANIMALS, 2);
  const F = pick(["カレー", "ケーキ", "おにぎり", "サンドイッチ"]);
  const make = coin();
  return build({
    passage: `${C}が　つくった　${F}を、${B}が　おいしそうに　たべて　います。`,
    ask: make ? `${F}を　つくったのは（　　）です。` : `${F}を　たべて　いるのは（　　）です。`,
    choices: opts([C, B, F], make ? C : B),
    explain: `「${C}が　つくった」は　${F}の　せつめい。たべて　いるのは　${B}　だよ。`,
    note: "名詞を修飾する節（〜がつくった）の中の主語と、文全体の主語を区別できるか。",
  });
});
tpl("kakari", "tonari", 4, 5, () => {
  const [A, B, C] = sample(ANIMALS, 3);
  const [s1, s2, s1n, s2n] = coin() ? ["{大|おお}きな", "{小|ちい}さな", "{大|おお}きい", "{小|ちい}さい"] : ["{小|ちい}さな", "{大|おお}きな", "{小|ちい}さい", "{大|おお}きい"];
  const [ask, ans] = pick([["ねて　いるのは（　　）です。", B], [`${s2n}のは（　　）です。`, B], [`${s1n}のは（　　）です。`, A]]);
  return build({
    passage: `${s1}　${A}の　となりで、${s2}　${B}が　ねて　います。`,
    ask, choices: opts([A, B, C], ans),
    explain: `「${s1}」は　${A}の、「${s2}」は　${B}の　せつめい。ねて　いるのは　${B}　だね。`,
    note: "2つの修飾語がそれぞれどの名詞にかかるか、主語はどちらかを区別できるか。",
  });
});
tpl("kakari", "tsureta", 5, 7, () => {
  const [mod, modN] = pick([["{犬|いぬ}を　つれた", "{犬|いぬ}"], ["{赤|あか}ちゃんを　だいた", "{赤|あか}ちゃん"], ["{大|おお}きな　にもつを　もった", "にもつ"]]);
  const B = pick(PERSON5), C = pick(CHILD5);
  const O = pick(["{赤|あか}い　ふうせん", "{花|はな}", "てがみ", "おちゃ"]);
  const [ask, ans] = pick([[`${O}を　もらったのは（　　）です。`, B], [`${O}を　わたしたのは（　　）です。`, C], [`${modN}と　いっしょに　いたのは（　　）です。`, B]]);
  return build({
    passage: `${mod}　${B}に、${C}が　${O}を　わたしました。`,
    ask, choices: opts([modN, B, C, O], ans),
    explain: `「${C}が　わたしました」だから、わたしたのは　${C}。「${B}に」わたしたので、もらったのは　${B}。「${mod}」は　${B}の　せつめい　だよ。`,
    note: "格助詞「に」（受け手）と「が」（動作主）を区別できるか。文頭の修飾部に引っぱられないか。",
  });
});
tpl("kakari", "hoerareta", 5, 6, () => {
  const B = pick(["こねこ", "うさぎ", "{小|ちい}さな　{男|おとこ}の{子|こ}"]);
  const C = pick(["おかあさん", "{大|おお}きな　{木|き}", "おにいさん"]);
  const [ask, ans] = pick([["ほえたのは（　　）です。", "{犬|いぬ}"], ["かくれたのは（　　）です。", B]]);
  return build({
    passage: `{犬|いぬ}に　ほえられた　${B}が、${C}の　うしろに　かくれました。`,
    ask, choices: opts(["{犬|いぬ}", B, C], ans),
    explain: `「{犬|いぬ}に　ほえられた」は、{犬|いぬ}が　ほえた　と　いう　こと。ほえられて　かくれたのは　${B}　だね。`,
    note: "受け身「〜に〜られた」から、動作をした側とされた側を読み分けられるか。",
  });
});
tpl("kakari", "kashita", 6, 7, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const [O1, O2] = sample(["えほん", "いろえんぴつ", "けしゴム", "はさみ", "クレヨン"], 2);
  const [ask, ans] = pick([[`${O2}を　かりたのは（　　）です。`, A], [`${O1}を　かりたのは（　　）です。`, B], [`${O2}を　かしたのは（　　）です。`, B]]);
  return build({
    passage: `${A}は　${B}に　${O1}を　かしました。${B}は　その　かわりに　${O2}を　${A}に　かしました。`,
    ask, choices: opts([A, B, O1, O2], ans),
    explain: `${O1}は　${A}から　${B}へ、${O2}は　${B}から　${A}へ。「かした」ほうと「かりた」ほうは　はんたい　だよ。`,
    note: "「かす／かりる」の向きを、2文にわたって正しく追えるか。",
  });
});
tpl("kakari", "torareta", 6, 7, (lv) => {
  const A = pick(names(lv));
  const B = pick(["からす", "さる", "とんび"]);
  const O = pick(["パン", "おにぎり", "ぼうし"]);
  const [ask, ans] = pick([[`${O}を　とったのは（　　）です。`, B], ["ないたのは（　　）です。", A]]);
  return build({
    passage: `${A}は　${B}に　${O}を　とられて、ないて　しまいました。`,
    ask, choices: opts([A, B, O], ans),
    explain: `「${B}に　とられた」は、${B}が　とった　と　いう　こと。ないたのは　とられた　${A}　だね。`,
    note: "受け身「〜に〜をとられる」の動作主（とった側）を読み取れるか。",
  });
});
tpl("kakari", "tanomarete", 7, 7, (lv) => {
  const [A, B, C] = sample(names(lv), 3);
  const O = pick(["てがみ", "おべんとう", "わすれもの"]);
  const [ask, ans] = pick([["たのんだのは（　　）です。", B], [`${O}を　とどけたのは（　　）です。`, A], [`${O}を　うけとったのは（　　）です。`, C]]);
  return build({
    passage: `${A}は　${B}に　たのまれて、${C}に　${O}を　とどけました。`,
    ask, choices: opts([A, B, C, O], ans),
    explain: `たのんだのは　${B}、とどけたのは　${A}、うけとったのは　${C}。「〜に　たのまれて」は　たのんだ　{人|ひと}を　あらわすよ。`,
    note: "3人の登場人物の役割（依頼者・動作主・受け手）を、受け身と格助詞から読み分けられるか。",
  });
});
tpl("kakari", "oshiete", 7, 7, (lv) => {
  const [A, B, C] = sample(names(lv), 3);
  const G = pick(["あやとり", "こまの　まわしかた", "つるの　おりかた"]);
  const first = coin();
  return build({
    passage: `${A}は　${B}に　おしえて　もらった　${G}を、${C}に　おしえました。`,
    ask: first ? `さいしょに　${G}を　おしえたのは（　　）です。` : `${C}に　おしえたのは（　　）です。`,
    choices: opts([A, B, C], first ? B : A),
    explain: `まず　${B}が　${A}に　おしえた。つぎに　${A}が　${C}に　おしえた。じゅんばんに　たどろう。`,
    note: "「〜に おしえてもらった」の向きと、出来事の順序を追えるか。",
  });
});

// ================================================================
//  照応解決
// ================================================================
const SORE = "「それ」は　なんですか。";
tpl("shoou", "hanbunko", 1, 2, () => {
  const P = pick(["おかあさん", "おとうさん", "おばあちゃん", "おじいちゃん"]), S = pick(["おとうと", "いもうと", "おにいちゃん", "ともだち"]);
  const [F, make] = pick([["おにぎり", "つくって"], ["おまんじゅう", "かって"], ["すいか", "きって"], ["おもち", "やいて"], ["りんご", "むいて"]]);
  return build({
    passage: `${P}が　${F}を　${make}　くれました。わたしは　それを　${S}と　はんぶんこ　しました。`,
    ask: SORE, choices: opts([P, F, S], F),
    explain: `はんぶんこ　したのは　${F}。「それ」は　${F}の　ことだね。`,
    note: "指示語「それ」が前の文のどの名詞を指すかを特定できるか。",
  });
});
tpl("shoou", "miseta", 1, 3, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const T = pick(["きれいな　いし", "あかい　はっぱ", "まるい　どんぐり", "ちいさな　かい"]);
  return build({
    passage: `${A}が　${T}を　みつけました。${A}は　それを　${B}に　みせました。`,
    ask: SORE, choices: opts([A, T, B], T),
    explain: `${B}に　みせたのは　みつけた　${T}。「それ」は　${T}の　ことだよ。`,
    note: "指示語の指す対象を、人物ではなく「もの」として特定できるか。",
  });
});
tpl("shoou", "tsukue", 1, 3, (lv) => {
  const A = pick(names(lv));
  const T = pick(["えほん", "はさみ", "のり", "ふでばこ", "いろえんぴつ"]);
  return build({
    passage: `つくえの　うえに　${T}が　あります。${A}は　それを　かばんに　いれました。`,
    ask: SORE, choices: opts(["つくえ", T, "かばん", A], T),
    explain: `かばんに　いれたのは　${T}。つくえは　かばんに　はいらないね。`,
    note: "直前に出てくる複数の名詞から、意味が通るものを選べるか。",
  });
});
tpl("shoou", "sorede", 1, 4, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const [T, V, W] = pick([["いろえんぴつ", "えを　かきました", "え"], ["はさみ", "かみを　きりました", "かみ"], ["じょうろ", "はなに　みずを　あげました", "はな"], ["ふで", "じを　かきました", "じ"]]);
  return build({
    passage: `${A}は　${B}に　${T}を　かして　あげました。${B}は　それで　${V}。`,
    ask: SORE, choices: opts([A, B, T, W], T),
    explain: `${B}が　つかったのは、かして　もらった　${T}。「それで」は「${T}で」と　いう　ことだね。`,
    note: "「それで（＝それを使って）」の指す道具を、人物や作ったものと区別できるか。",
  });
});
tpl("shoou", "soko", 2, 4, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const [P, P2] = sample(["こうえん", "としょかん", "うみ", "やま", "{学校|がっこう}", "スーパー"], 2);
  return build({
    passage: `${A}は　${P}へ　いきました。そこで　${B}に　あいました。`,
    ask: "「そこ」は　どこですか。",
    choices: opts([A, B, P, P2], P),
    explain: `${B}に　あったのは　${P}。「そこ」は　ばしょを　さす　ことばで、${P}の　ことだよ。`,
    note: "場所を指す指示語「そこ」を、人物と区別して特定できるか。",
  });
});
tpl("shoou", "imide", 3, 6, (lv) => {
  const A = pick(names(lv));
  const P = pick(["にわ", "こうえん", "はらっぱ"]);
  const [X, Y, Z, why] = pick([
    ["ダンゴムシ", "{小|ちい}さな　{石|いし}", "くるんと　まるく　なりました", "まるく　なるのは　ダンゴムシ"],
    ["カエル", "{大|おお}きな　はっぱ", "ぴょんと　はねて　にげました", "はねて　にげるのは　カエル"],
    ["てんとう{虫|むし}", "{白|しろ}い　{花|はな}", "ぱっと　とんで　いきました", "じぶんで　とんで　いくのは　てんとう{虫|むし}"],
    ["こねこ", "{青|あお}い　ボール", "ニャーと　なきました", "なくのは　こねこ"],
  ]);
  const passage = coin()
    ? `${A}は　${P}で　${Y}を　{見|み}つけました。その　そばに　${X}が　いました。${A}が　そっと　それを　{手|て}に　のせると、${Z}。`
    : `${A}は　${P}で　${X}と　${Y}を　{見|み}つけました。${A}が　そっと　それを　{手|て}に　のせると、${Z}。`;
  return build({
    passage, ask: SORE, choices: opts([X, Y, P, A], X),
    explain: `${why}。だから「それ」は　${X}の　ことだね。あとの　ぶんまで　よむと　わかるよ。`,
    note: "指示語の候補が複数あるとき、後続文の内容と矛盾しないものを選べるか（前だけでなく後ろも読む）。",
  });
});
tpl("shoou", "sokode", 4, 7, (lv) => {
  const A = pick(names(lv));
  const [P1, P2, V, why] = pick([
    ["{森|もり}", "いけ", "さかなが　およいで　いました", "さかなが　およげるのは　いけ"],
    ["こうえん", "すなば", "すなやまを　つくりました", "すなやまを　つくれるのは　すなば"],
    ["{学校|がっこう}", "としょしつ", "{本|ほん}を　よみました", "{本|ほん}が　あるのは　としょしつ"],
    ["いえ", "にわ", "{花|はな}が　さいて　いました", "{花|はな}が　さくのは　にわ"],
  ]);
  return build({
    passage: `${A}は　${P1}へ　いきました。${P1}には　${P2}が　あって、そこで　${V}。`,
    ask: "「そこ」は　どこですか。",
    choices: opts([P1, P2, A, "{山|やま}"], P2),
    explain: `${why}。「そこ」は　すぐ　まえの　${P2}の　ことだね。`,
    note: "場所の候補が2つあるとき、直前の語と後続の内容から指示先を決められるか。",
  });
});
tpl("shoou", "mouhitotsu", 5, 7, (lv) => {
  const N = pick(names(lv)), P = pick(["おとうと", "いもうと", "ともだち"]);
  const [T, V] = pick([["かさ", "さして"], ["ぼうし", "かぶって"], ["ふうせん", "もって"], ["てぶくろ", "はめて"]]);
  const [c1, c2] = sample(COLORS, 2);
  const [keep, give] = shuffle([c1, c2]);
  return build({
    passage: `${N}は　${c1}　${T}と　${c2}　${T}を　もって　います。${N}は　${keep}　ほうを　${V}、もう　{一|ひと}つを　${P}に　かしました。`,
    ask: "「もう　{一|ひと}つ」は　どれですか。",
    choices: opts([`${c1}　${T}`, `${c2}　${T}`, N, P], `${give}　${T}`),
    explain: `${N}が　つかったのは　${keep}　${T}。だから「もう　{一|ひと}つ」は　${give}　${T}　だね。`,
    note: "「もう一つ」が、2つのうち先に述べたものではない方を指すと理解できるか。",
  });
});
const SHOOU_FIXED = [
  () => build({
    passage: "けんたさんは　おとうさんと　{川|かわ}へ　いきました。そこで　{大|おお}きな　さかなを　つりました。",
    ask: "「そこ」は　どこですか。", choices: opts(["おうち", "{川|かわ}", "おとうさん", "さかな"], "{川|かわ}"),
    explain: "さかなを　つったのは　{川|かわ}。「そこ」は　{川|かわ}の　ことだね。", note: "場所を指す指示語「そこ」の指す先を特定できるか。",
  }),
  () => build({
    passage: "はなさんの　つくえの　{上|うえ}に、えんぴつと　けしゴムが　あります。はなさんは　それで　{名|な}まえを　かきました。",
    ask: SORE, choices: opts(["えんぴつ", "けしゴム", "つくえ", "はなさん"], "えんぴつ"),
    explain: "{名|な}まえを　かけるのは　えんぴつ。けしゴムでは　かけないね。", note: "候補が2つあるとき、述語（かく）と意味が合う方を選べるか。",
  }),
  () => build({
    passage: "おばあさんが　くれた　{白|しろ}い　{犬|いぬ}の　ぬいぐるみを、いもうとは　{大|だい}じに　して　います。まいばん　それを　だいて　ねます。",
    ask: SORE, choices: opts(["おばあさん", "{白|しろ}い　{犬|いぬ}", "ぬいぐるみ", "いもうと"], "ぬいぐるみ"),
    explain: "だいて　ねるのは　ぬいぐるみ。ほんものの　{犬|いぬ}は　でて　こないよ。", note: "「白い犬の」が「ぬいぐるみ」を修飾していることを読み取れるか。",
  }),
  () => build({
    passage: "{空|そら}に　まるい　{月|つき}が　でて　いました。おとうとは　それを　{見|み}て、「おだんごみたい」と　いいました。",
    ask: SORE, choices: opts(["{空|そら}", "{月|つき}", "おとうと", "おだんご"], "{月|つき}"),
    explain: "おだんごみたいに　まるいのは　{月|つき}。「それ」は　{月|つき}の　ことだね。", note: "指示語の後に出てくる語に引っぱられず、前の語を指すと判断できるか。",
  }),
];
tpl("shoou", "tezukuri", 5, 7, () => pick(SHOOU_FIXED)());
tpl("shoou", "koto", 6, 7, (lv) => {
  const A = pick(names(lv));
  const [act, obj, koto] = pick([
    ["{犬|いぬ}に　えさを　あげます", "{犬|いぬ}", "まいあさ　{犬|いぬ}に　えさを　あげる　こと"],
    ["{花|はな}に　{水|みず}を　やります", "{花|はな}", "まいあさ　{花|はな}に　{水|みず}を　やる　こと"],
    ["しんぶんを　とって　きます", "しんぶん", "まいあさ　しんぶんを　とって　くる　こと"],
  ]);
  return build({
    passage: `${A}は　まいあさ　${act}。それが　${A}の　おてつだいです。`,
    ask: SORE, choices: opts([koto, obj, A, "おてつだい"], koto),
    explain: `「それ」は　ものでは　なく、まえの　ぶんの「${koto}」を　さして　いるよ。`,
    note: "指示語が名詞ではなく、前の文の内容（〜すること）全体を指す場合を読み取れるか。",
  });
});
tpl("shoou", "nokori", 7, 7, () => {
  const [T, u] = pick([["おさら", "まい"], ["えんぴつ", "ほん"], ["おりがみ", "まい"]]);
  const n = 5 + rand(5), m = 1 + rand(n - 2);
  const ch = [...new Set([n - m, m, n, n + m])];
  return build({
    passage: `${T}が　${n}${u}　あります。${m}${u}を　つかって、のこりを　はこに　しまいました。`,
    ask: `はこに　しまった　${T}は　なん${u}ですか。`,
    choices: opts(ch.map((x) => `${x}${u}`), `${n - m}${u}`),
    explain: `「のこり」は　つかわなかった　ぶん。${n}${u}から　${m}${u}　つかったので、のこりは　${n - m}${u}。`,
    note: "「のこり」が何を指すかを、数量の関係から特定できるか。",
  });
});

// ================================================================
//  同義文判定
// ================================================================
tpl("dougi", "ukemi", 1, 3, () => {
  const [X, Y] = sample(ANIMALS, 2);
  const [v, vp, vt] = pick([["おいかけました", "おいかけられました", "おいかけた"], ["よびました", "よばれました", "よんだ"], ["おしました", "おされました", "おした"], ["みつけました", "みつけられました", "みつけた"]]);
  const k = rand(3);
  const b = [`${Y}が　${X}に　${vp}。`, `${Y}が　${X}を　${v}。`, `${X}が　${Y}に　${vp}。`][k];
  return build({
    passage: `${X}が　${Y}を　${v}。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: [`どちらも　${vt}のは　${X}。だから　おなじ　だね。`, `アで　${vt}のは　${X}、イで　${vt}のは　${Y}。だから　ちがう。`, `イは「${Y}が　${vt}」と　いう　いみ。アと　はんたい　だから　ちがう。`][k],
    note: "能動文と受動文（〜られる）の言いかえで、「誰が何をしたか」が保たれているか判断できるか。",
  });
});
tpl("dougi", "hako", 1, 2, () => {
  const [c1, c2] = sample(COLORS, 2);
  const same = coin();
  return build({
    passage: `${c1}　はこは　${c2}　はこより　おおきいです。`,
    passage2: same ? `${c2}　はこは　${c1}　はこより　ちいさいです。` : `${c2}　はこは　${c1}　はこより　おおきいです。`,
    ask: SAME_ASK, choices: SAMEDIFF(same), fixed: true,
    explain: same ? `どちらも　おおきいのは　${c1}　はこ。だから　おなじ。` : `アでは　${c1}　はこが　おおきい。イでは　${c2}　はこが　おおきい。ちがう　ね。`,
    note: "「AはBより大きい」＝「BはAより小さい」という比較の言いかえがわかるか。",
  });
});
tpl("dougi", "junban", 1, 2, () => {
  const [X, Y] = sample(ANIMALS, 2);
  const act = pick(["あそんで　います", "うたって　います", "ねむって　います"]);
  const same = coin();
  return build({
    passage: `${X}と　${Y}が　${act}。`,
    passage2: same ? `${Y}と　${X}が　${act}。` : `${X}が　${Y}と　けんかを　して　います。`,
    ask: SAME_ASK, choices: SAMEDIFF(same), fixed: true,
    explain: same ? "ならべる　じゅんばんが　ちがう　だけで、して　いる　ことは　おなじ　だね。" : `アは　${act.replace("　います", "　いる")}。イは　けんかを　して　いる。ちがう　ね。`,
    note: "語順が入れかわっただけなら意味は同じ、と判断できるか。",
  });
});
tpl("dougi", "himo", 2, 4, () => {
  const [c1, c2] = sample(COLORS, 2);
  const k = rand(4);
  const b = [`${c2}　ひもは　${c1}　ひもより　みじかいです。`, `${c2}　ひもは　${c1}　ひもより　ながいです。`, `${c1}　ひもは　${c2}　ひもより　みじかいです。`, `${c1}　ひもと　${c2}　ひもは　おなじ　ながさです。`][k];
  return build({
    passage: `${c1}　ひもは　${c2}　ひもより　ながいです。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `どちらも　ながいのは　${c1}　ひも。おなじ　だね。` : `アでは　${c1}　ひもが　ながい。イは　そう　いって　いないね。ちがう。`,
    note: "「長い⇔短い」を使った比較の言いかえを判断できるか。",
  });
});
tpl("dougi", "ageru", 3, 5, (lv) => {
  const [A, B] = sample(lv >= 5 ? names(lv) : ANIMALS, 2);
  const O = pick(["{花|はな}", "てがみ", "えほん", "おりがみ"]);
  const give = lv >= 5 ? "わたしました" : "あげました";
  const k = rand(3);
  const b = [`${B}は　${A}から　${O}を　もらいました。`, `${A}は　${B}から　${O}を　もらいました。`, `${B}は　${A}に　${O}を　${give}。`][k];
  return build({
    passage: `${A}は　${B}に　${O}を　${give}。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `${O}は　${A}から　${B}へ。どちらも　おなじ　だね。` : `アでは　${O}は　${A}から　${B}へ。イでは　はんたいに　うごいて　いるね。`,
    note: "「あげる／わたす」と「もらう」、「に」と「から」の組み合わせで、ものの動きが同じかを判断できるか。",
  });
});
tpl("dougi", "maeushiro", 3, 6, (lv) => {
  const [A, B] = sample(lv >= 5 ? names(lv) : ANIMALS, 2);
  const k = rand(3);
  const b = [`${B}の　うしろに　${A}が　います。`, `${B}の　まえに　${A}が　います。`, `${A}の　うしろに　${B}が　います。`][k];
  return build({
    passage: `${A}の　まえに　${B}が　います。`, passage2: b,
    ask: "おなじ　ほうを　むいて　ならんで　います。アと　イは、おなじ　ことを　いって　いますか。",
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `まえに　いるのは　どちらも　${B}。おなじ　だね。` : `アでは　まえに　いるのは　${B}。イでは　${A}が　まえ。ちがう　ね。`,
    note: "「AのまえにB」＝「BのうしろにA」という位置関係の言いかえを判断できるか。",
  });
});
tpl("dougi", "ichiban", 4, 7, (lv) => {
  const A = pick(names(lv));
  const k = rand(3);
  const b = [`クラスには、${A}より　せが　たかい　{子|こ}は　ひとりも　いません。`, `クラスには、${A}より　せが　たかい　{子|こ}が　います。`, `${A}は　クラスで　いちばん　せが　ひくいです。`][k];
  return build({
    passage: `${A}は　クラスで　いちばん　せが　たかいです。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `いちばん　たかい　なら、${A}より　たかい　{子|こ}は　いない。おなじ　だね。` : `いちばん　たかいのは　${A}。イは　それと　あわないね。ちがう。`,
    note: "「いちばん〜」＝「〜より…な人はいない」という最上級と否定の言いかえを判断できるか。",
  });
});
tpl("dougi", "yori", 5, 7, (lv) => {
  const [X, Y] = sample(names(lv), 2);
  const [a, opp] = pick([["せが　たかいです", "せが　ひくいです"], ["{早|はや}く　{学校|がっこう}に　つきました", "おそく　{学校|がっこう}に　つきました"], ["{先|さき}に　ゴールしました", "あとから　ゴールしました"], ["{大|おお}きな　こえで　うたいました", "{小|ちい}さな　こえで　うたいました"]]);
  const k = rand(3);
  const b = [`${Y}は　${X}より　${opp}。`, `${Y}は　${X}より　${a}。`, `${X}は　${Y}より　${opp}。`][k];
  return build({
    passage: `${X}は　${Y}より　${a}。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `イは　${Y}から　みた　いいかた。どちらも　おなじ　ことを　いって　いるね。` : "ことばは　にて　いるけど、くらべた　けっかが　はんたいに　なって　いるね。だから　ちがう。",
    note: "「AはBより〜」の比較文で、主語を入れかえたときに意味が保たれているかを判断できるか。",
  });
});
tpl("dougi", "kasu", 6, 7, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const O = pick(["えほん", "かさ", "じてんしゃ", "なわとび"]);
  const k = rand(3);
  const b = [`${B}は　${A}から　${O}を　かりました。`, `${A}は　${B}から　${O}を　かりました。`, `${B}は　${A}に　${O}を　かしました。`][k];
  return build({
    passage: `${A}は　${B}に　${O}を　かしました。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `かしたのは　${A}、かりたのは　${B}。おなじ　だね。` : `アでは　かしたのは　${A}。イは　${B}が　かした　ことに　なって　いるね。ちがう。`,
    note: "「かす⇔かりる」「に⇔から」の言いかえを判断できるか。",
  });
});
tpl("dougi", "oshieru", 7, 7, (lv) => {
  const [A, B] = sample(names(lv), 2);
  const G = pick(["けんだま", "おりがみ", "なわとび", "ひらがな"]);
  const k = rand(3);
  const b = [`${B}は　${A}に　${G}を　おそわりました。`, `${A}は　${B}に　${G}を　おそわりました。`, `${B}は　${A}に　${G}を　おしえました。`][k];
  return build({
    passage: `${A}は　${B}に　${G}を　おしえました。`, passage2: b, ask: SAME_ASK,
    choices: SAMEDIFF(k === 0), fixed: true,
    explain: k === 0 ? `おしえたのは　${A}、おそわったのは　${B}。おなじ　だね。` : `アで　おしえたのは　${A}。イでは　はんたいに　なって　いるね。ちがう。`,
    note: "「おしえる⇔おそわる」の言いかえで、立場が保たれているか判断できるか。",
  });
});

// ================================================================
//  推論
// ================================================================
tpl("suiron", "petto", 1, 3, (lv) => {
  const N = pick(names(lv));
  const [X, Y] = sample(["いぬ", "ねこ", "うさぎ", "ことり", "きんぎょ"], 2);
  const [stmt, ans, exp] = pick([
    [`${N}の　いえには　いきものが　います。`, "ただしい", `${X}は　いきもの。だから　ただしい。`],
    [`${N}の　いえには　${X}は　いません。`, "まちがい", `${X}が　いると　かいて　あるね。だから　まちがい。`],
    [`${N}の　いえには　${Y}は　いません。`, "わからない", `${Y}の　ことは　かいて　いないね。だから　わからない。`],
    [`${N}の　いえには　${Y}も　います。`, "わからない", `${Y}の　ことは　かいて　いないね。だから　わからない。`],
  ]);
  return build({
    passage: `${N}の　いえには　${X}が　います。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "書かれていることから言えること／書かれていないので判断できないことを区別できるか。",
  });
});
tpl("suiron", "dake", 1, 5, (lv) => {
  const T = lv >= 4 ? pick(["ビーだま", "おはじき", "ボタン"]) : "たま";
  const [c1, c2] = sample(COLORS, 2);
  const n = pick(["みっつ", "よっつ", "いつつ"]);
  const [stmt, ans, exp] = pick([
    [`${c2}　${T}は　{入|はい}って　いません。`, "ただしい", `{入|はい}って　いるのは　${c1}　${T}「だけ」。だから　${c2}　${T}は　ない。`],
    [`${c2}　${T}も　{入|はい}って　います。`, "まちがい", `${c1}　${T}「だけ」だから、${c2}　${T}は　{入|はい}って　いないよ。`],
    [`${T}は　${n}　{入|はい}って　います。`, "わからない", "いくつ　{入|はい}って　いるかは　かいて　いないね。"],
  ]);
  return build({
    passage: `はこの　なかには　${c1}　${T}だけが　{入|はい}って　います。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「だけ」の意味から、他の色がないことを導けるか。数は書かれていないので判断できない。",
  });
});
tpl("suiron", "suki", 1, 2, (lv) => {
  const N = pick(names(lv));
  const [F, G] = sample(["いちご", "みかん", "ぶどう", "すいか"], 2);
  const [stmt, ans, exp] = pick([
    [`${N}は　${F}が　きらいです。`, "まちがい", `${F}が　だいすき　だから、きらいは　まちがい。`],
    [`${N}は　${G}が　きらいです。`, "わからない", `${G}の　ことは　かいて　いないね。`],
    [`${N}には　すきな　たべものが　あります。`, "ただしい", `${F}は　たべもの。だから　すきな　たべものは　ある。`],
  ]);
  return build({
    passage: `${N}は　${F}が　だいすきです。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "本文と反対のこと（まちがい）と、本文にないこと（わからない）を区別できるか。",
  });
});
tpl("suiron", "ookii", 2, 3, () => {
  const [A, B, C] = sample(ANIMALS, 3);
  const [stmt, ans, exp] = pick([
    [`${B}は　${A}より　ちいさいです。`, "ただしい", `${A}の　ほうが　おおきい　なら、${B}は　ちいさい。ただしい。`],
    [`${B}は　${A}より　おおきいです。`, "まちがい", `おおきいのは　${A}。だから　まちがい。`],
    [`${C}は　${A}より　おおきいです。`, "わからない", `${C}の　ことは　かいて　いないね。`],
  ]);
  return build({
    passage: `${A}は　${B}より　おおきいです。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "比較文から逆向きの比較を導けるか。登場しないものは判断できない。",
  });
});
tpl("suiron", "minna", 3, 6, (lv) => {
  const [N, M] = sample(names(lv), 2);
  const [p, np] = pick([["{青|あお}い　ぼうしを　かぶって　います", "{赤|あか}い　ぼうしを　かぶって　います"], ["{名|な}ふだを　つけて　います", "{名|な}ふだを　つけて　いません"], ["{白|しろ}い　うわばきを　はいて　います", "きいろい　うわばきを　はいて　います"]]);
  const pr = p.replace("　います", "　いる");
  const [stmt, ans, exp] = pick([
    [`${N}は　${p}。`, "ただしい", `クラスの　{子|こ}は「みんな」${pr}。${N}も　クラスの　{子|こ}だから　ただしい。`],
    [`${N}は　${np}。`, "まちがい", `クラスの　{子|こ}は　みんな　${pr}ので、${N}も　おなじ。だから　まちがい。`],
    [`となりの　クラスの　${M}も　${p}。`, "わからない", "かいて　あるのは　この　クラスの　ことだけ。となりの　クラスの　ことは　わからないね。"],
  ]);
  return build({
    passage: `この　クラスの　{子|こ}は　みんな　${p}。${N}は　この　クラスの　{子|こ}です。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「みんな（すべて）」と「〜の一人である」を組み合わせて結論を導けるか。範囲外は判断できない。",
  });
});
tpl("suiron", "hitotsumo", 4, 5, () => {
  const [c1, c2] = sample(COLORS, 2);
  const T = pick(["ビーだま", "ボタン", "おはじき"]);
  const ku = COLOR_KU[c1];
  const [stmt, ans, exp] = pick([
    [`はこの　なかに　${c1}　${T}が　あります。`, "まちがい", `「ひとつも　${ku}ない」のだから、${c1}　${T}は　ないね。`],
    [`はこの　なかの　${T}は　みんな　${c2.replace(/い$/, "")}です。`, "わからない", `${ku}ない　ことは　わかるけど、なにいろかは　かいて　いないね。`],
    [`${c1}　${T}は　ひとつも　ありません。`, "ただしい", `「ひとつも　${ku}ない」と　おなじ　いみ。ただしい。`],
  ]);
  return build({
    passage: `はこの　なかの　${T}は、ひとつも　${ku}ありません。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「ひとつも〜ない」（全部否定）から言えることと、言えないこと（実際の色）を区別できるか。",
  });
});
tpl("suiron", "junjo", 4, 6, (lv) => {
  const [A, B, C, D] = sample(names(lv), 4);
  const [p, pp, pn] = pick([["せが　たかいです", "せが　たかい", "せが　ひくい"], ["あしが　はやいです", "あしが　はやい", "あしが　おそい"]]);
  const order = `${A}　→　${B}　→　${C}の　じゅんに　${pp}。`;
  const [stmt, ans, exp] = pick([
    [`${A}は　${C}より　${p}。`, "ただしい", `${order}だから　${A}は　${C}より　${pp}。ただしい。`],
    [`${C}は　${A}より　${p}。`, "まちがい", `${order}${C}は　${A}より　${pn}ので　まちがい。`],
    [`${A}は　${D}より　${p}。`, "わからない", `${D}の　ことは　かいて　いないね。`],
  ]);
  return build({
    passage: `${A}は　${B}より　${p}。${B}は　${C}より　${p}。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "2つの比較文をつないで順序を推論できるか（推移律）。登場しない人物は判断できない。",
  });
});
tpl("suiron", "iru", 5, 7, (lv) => {
  const N = pick(names(lv));
  const X = pick(["サッカー", "おりがみ", "なわとび", "おにごっこ"]);
  const [stmt, ans, exp] = pick([
    [`${N}の　クラスの　{子|こ}は　みんな　${X}が　すきです。`, "わからない", "「すきな　{子|こ}が　いる」だけでは、みんなが　すきかは　わからないね。"],
    [`${N}の　クラスには　${X}が　すきな　{子|こ}は　{一人|ひとり}も　いません。`, "まちがい", "すきな　{子|こ}が「いる」と　かいて　あるね。だから　まちがい。"],
    [`${N}の　クラスには　${X}が　すきな　{子|こ}が　すくなくとも　{一人|ひとり}　います。`, "ただしい", "「いる」のだから、{一人|ひとり}　いじょうは　いるね。ただしい。"],
  ]);
  return build({
    passage: `${N}の　クラスには、${X}が　すきな　{子|こ}が　います。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「〜な子がいる（存在）」を「みんな〜（全称）」と取りちがえないか。",
  });
});
tpl("suiron", "ya", 6, 7, (lv) => {
  const N = pick(names(lv));
  const [X, Y] = sample(["りんご", "みかん", "パン", "ぎゅうにゅう", "たまご", "にんじん"], 2);
  const [stmt, ans, exp] = pick([
    [`${N}は　${X}を　かいました。`, "ただしい", `「${X}や　${Y}」と　あるので、${X}は　かった。ただしい。`],
    [`${N}が　かったのは　${X}と　${Y}だけです。`, "わからない", `「や」は「ほかにも　ある　かも」と　いう　いいかた。${X}と　${Y}だけ　とは　いえないね。`],
    [`${N}は　${Y}を　かいませんでした。`, "まちがい", `${Y}も　かったと　かいて　あるね。まちがい。`],
  ]);
  return build({
    passage: `${N}は　スーパーで　${X}や　${Y}を　かいました。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「AやB」は例示で、ほかにもある可能性を含む（「AとB」との違い）ことを理解できるか。",
  });
});
tpl("suiron", "tara", 6, 7, () => {
  const s = pick([
    { c: "{雨|あめ}が　ふったら、えんそくは　ちゅうしです。", yes: "きょうは　{雨|あめ}が　ふりました。", no: "きょうは　よく　はれました。", rs: "えんそくは　ちゅうしに　なりました。", rn: "えんそくに　いきました。" },
    { c: "しゅくだいが　おわったら、テレビを　{見|み}ても　いいです。", yes: "しゅくだいが　おわりました。", no: "しゅくだいが　まだ　おわって　いません。", rs: "テレビを　{見|み}ても　いいです。", rn: "テレビを　{見|み}ては　いけません。" },
    { c: "100てんを　とったら、おかあさんが　ケーキを　かって　くれます。", yes: "テストで　100てんを　とりました。", no: "テストは　80てん　でした。", rs: "ケーキを　かって　もらえます。", rn: "ケーキは　かって　もらえません。" },
  ]);
  const [st, stmt, ans, exp] = pick([
    [s.yes, s.rs, "ただしい", "「〜たら」の　とおりに　なったので、ただしい。"],
    [s.yes, s.rn, "まちがい", "「〜たら」の　とおりに　なるはず　だから、まちがい。"],
    [s.no, s.rs, "わからない", "「〜たら」の　ときの　ことしか　かいて　いないね。そう　ならなかった　ときは　わからない。"],
  ]);
  return build({
    passage: `${s.c}${st}`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "条件文「〜たら…」から、条件が成り立つときの結論は導けるが、成り立たないときは判断できないことを理解できるか。",
  });
});
tpl("suiron", "kamo", 7, 7, (lv) => {
  const N = pick(names(lv));
  const [x, xs, xn] = pick([
    ["かぜを　ひいた", "かならず　かぜを　ひいて　います", "かぜを　ひいて　いない"],
    ["おなかが　いたく　なった", "かならず　おなかが　いたいです", "おなかは　いたく　ない"],
    ["ねぼうを　した", "かならず　ねぼうを　して　います", "ねぼうを　して　いない"],
  ]);
  const [stmt, ans, exp] = pick([
    [`${N}は　${xs}。`, "わからない", "「かもしれない」は、そうか　どうか　まだ　わからない　と　いう　いいかた。かならず　とは　いえないね。"],
    [`${N}が　${xn}　ことも　あります。`, "ただしい", "「かもしれない」なら、そうで　ない　ことも　ある。ただしい。"],
  ]);
  return build({
    passage: `${N}は　きょう　{学校|がっこう}を　やすみました。${x}のかもしれません。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "推量「かもしれない」は確定ではない（そうでない可能性もある）と理解できるか。",
  });
});
tpl("suiron", "shika", 7, 7, (lv) => {
  const N = pick(names(lv));
  const n = pick([100, 50, 10]);
  const [stmt, ans, exp] = pick([
    [`${N}は　${n * 5}えん　もって　います。`, "まちがい", `「${n}えんしか　ない」から、${n * 5}えんは　もって　いないね。`],
    [`${N}は　おかねを　もって　います。`, "ただしい", `${n}えんは　あるので、おかねは　もって　いる。ただしい。`],
    [`${N}の　いえには　おかねが　たくさん　あります。`, "わからない", "さいふの　ことしか　かいて　いないね。いえの　ことは　わからない。"],
  ]);
  return build({
    passage: `${N}の　さいふには　${n}えんしか　ありません。`, ask: TF_ASK(stmt),
    choices: tfChoices(ans), fixed: true, explain: exp,
    note: "「〜しか〜ない」が「それだけ（少ない）」を表すことを理解し、範囲外（家）は判断できないとわかるか。",
  });
});

// ================================================================
//  イメージ同定
// ================================================================
const DIRV = { うえ: [0, -1], した: [0, 1], みぎ: [1, 0], ひだり: [-1, 0] };
tpl("image", "ichi", 1, 4, (lv) => {
  const dirs = lv === 1 ? ["うえ", "した"] : ["うえ", "した", "みぎ", "ひだり"];
  const inG = (p) => p[0] >= 0 && p[0] < 3 && p[1] >= 0 && p[1] < 3;
  const add = (p, d, m = 1) => [p[0] + d[0] * m, p[1] + d[1] * m];
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const loose = (p, q, d) => (d[0] ? Math.sign(q[0] - p[0]) === d[0] : Math.sign(q[1] - p[1]) === d[1]);
  for (;;) {
    const [X, Y, Z] = shuffle(["まる", "さんかく", "しかく"]);
    const r1 = pick(dirs), r2 = pick(dirs);
    const d1 = DIRV[r1], d2 = DIRV[r2];
    const goods = [];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) {
      const px = [x, y], py = add(px, d1), pz = add(py, d2);
      if (inG(py) && inG(pz) && !same(pz, px)) goods.push({ [X]: px, [Y]: py, [Z]: pz });
    }
    if (!goods.length) continue;
    const good = pick(goods);
    const fits = (L) => loose(L[X], L[Y], d1) && loose(L[Y], L[Z], d2);
    const key = (L) => [X, Y, Z].map((s) => L[s].join()).join("|");
    const seen = new Set([key(good)]);
    const bad = [];
    const tryAdd = (L) => {
      if (![X, Y, Z].every((s) => inG(L[s]))) return;
      if (new Set([X, Y, Z].map((s) => L[s].join())).size < 3 || seen.has(key(L)) || fits(L)) return;
      seen.add(key(L)); bad.push(L);
    };
    const swap = (a, b) => ({ ...good, [a]: good[b], [b]: good[a] });
    shuffle([swap(X, Y), swap(Y, Z), swap(X, Z),
      { [X]: good[X], [Y]: add(good[X], d1, -1), [Z]: add(add(good[X], d1, -1), d2) },
      { [X]: good[X], [Y]: good[Y], [Z]: add(good[Y], d2, -1) }]).forEach(tryAdd);
    for (let i = 0; i < 60 && bad.length < 3; i++) {
      const cells = sample([...Array(9).keys()], 3).map((n) => [n % 3, Math.floor(n / 3)]);
      tryAdd({ [X]: cells[0], [Y]: cells[1], [Z]: cells[2] });
    }
    if (bad.length < 3) continue;
    const draw = (L) => svg(120, 120, [X, Y, Z].map((s) => fillShape(s, 22 + L[s][0] * 38, 22 + L[s][1] * 38)).join(""));
    return build({
      passage: `${X}の　${r1}に　${Y}が　あります。${Y}の　${r2}に　${Z}が　あります。`,
      ask: "ぶんに　あう　えを　ひとつ　えらびましょう。",
      choices: [{ svg: draw(good), ok: true }, ...bad.slice(0, 3).map((L) => ({ svg: draw(L), ok: false }))],
      explain: `${X}の　${r1}に　${Y}、その　${Y}の　${r2}に　${Z}。じゅんばんに　ゆびで　たどって　みよう。`,
      note: "位置のことばを、2つの文にわたって正しく図に置きかえられるか。",
    });
  }
});
tpl("image", "nakasoto", 1, 4, () => {
  const [C, I, S] = shuffle(["まる", "さんかく", "しかく"]);
  const draw = (iIn, sIn) => {
    let s = lineShape(C, 52, 60, 34);
    s += fillShape(I, iIn ? 46 : 104, iIn ? 66 : 28, 10);
    s += fillShape(S, sIn ? 60 : 104, sIn ? 56 : 92, 10);
    return svg(120, 120, s);
  };
  return build({
    passage: `おおきな　${C}の　なかに　${I}が　あります。${S}は　${C}の　そとに　あります。`,
    ask: "ぶんに　あう　えを　ひとつ　えらびましょう。",
    choices: [{ svg: draw(true, false), ok: true }, { svg: draw(false, true), ok: false }, { svg: draw(true, true), ok: false }, { svg: draw(false, false), ok: false }],
    explain: `${I}は　${C}の　なか、${S}は　${C}の　そと。ふたつとも　たしかめよう。`,
    note: "「なか」「そと」の2条件を両方確かめられるか。",
  });
});
tpl("image", "aida", 3, 5, () => {
  const [X, Y, Z] = shuffle(["まる", "さんかく", "しかく"]);
  const row = (a) => svg(120, 60, a.map((s, i) => fillShape(s, 22 + i * 38, 30, 13)).join(""));
  const good = coin() ? [X, Z, Y] : [Y, Z, X];
  return build({
    passage: `${X}と　${Y}の　あいだに　${Z}が　あります。`,
    ask: "ぶんに　あう　えを　ひとつ　えらびましょう。",
    choices: [{ svg: row(good), ok: true }, { svg: row([Z, X, Y]), ok: false }, { svg: row([X, Y, Z]), ok: false }, { svg: row([Z, Y, X]), ok: false }],
    explain: `${Z}が　まんなかで、りょうがわに　${X}と　${Y}。それが「あいだ」だよ。`,
    note: "「AとBのあいだ」＝両側にAとBがある真ん中、を図にできるか。",
  });
});
const DIR5 = { "{右|みぎ}": [1, 0], "{左|ひだり}": [-1, 0], "{上|うえ}": [0, -1], "{下|した}": [0, 1] };
const NUM5 = ["", "{一|ひと}つ", "{二|ふた}つ", "{三|みっ}つ"];
tpl("image", "nakakazu", 5, 7, () => {
  const [C, I] = sample(["まる", "さんかく", "しかく"], 2);
  const S = pick(["まる", "さんかく", "しかく"].filter((s) => s !== C));
  const dname = pick(Object.keys(DIR5));
  const k = 1 + rand(3);
  const draw = (sp) => {
    const [dx, dy] = sp.d, px = -dy, py = dx;
    const cx = 80 - dx * 25, cy = 80 - dy * 25;
    let s = lineShape(sp.C, cx, cy);
    const ix = sp.innerOut ? cx + px * 48 : cx, iy = sp.innerOut ? cy + py * 48 : cy + (sp.C === "さんかく" ? 8 : 0);
    s += fillShape(sp.I, ix, iy, 9);
    const bx = 80 + dx * 48, by = 80 + dy * 48;
    for (let i = 0; i < sp.k; i++) {
      const o = (i - (sp.k - 1) / 2) * 27;
      const z = sp.zig ? (i % 2 ? 9 : -9) : 0;
      s += sp.along ? fillShape(sp.S, bx + dx * o + px * z, by + dy * o + py * z, 11) : fillShape(sp.S, bx + px * o + dx * z, by + py * o + dy * z, 11);
    }
    return svg(160, 160, s);
  };
  const base = { C, I, S, d: DIR5[dname], k, along: false, zig: false, innerOut: false };
  const goods = [base];
  if (k === 2) goods.push({ ...base, along: true });
  if (k >= 2) goods.push({ ...base, zig: true });
  const nGood = goods.length > 1 && coin() ? 2 : 1;
  const opp = { "{右|みぎ}": "{左|ひだり}", "{左|ひだり}": "{右|みぎ}", "{上|うえ}": "{下|した}", "{下|した}": "{上|うえ}" };
  const wrongK = shuffle([1, 2, 3].filter((n) => n !== k));
  const otherS = ["まる", "さんかく", "しかく"].filter((t) => t !== S && t !== C);
  const bads = shuffle([{ ...base, k: wrongK[0] }, { ...base, k: wrongK[1] }, { ...base, d: DIR5[opp[dname]] }, ...(I !== S ? [{ ...base, C: I, I: C }] : []), { ...base, innerOut: true }, ...(otherS.length ? [{ ...base, S: pick(otherS) }] : [])]);
  const seen = new Set(), ch = [];
  const put = (sp, ok) => { const v = draw(sp); if (!seen.has(v)) { seen.add(v); ch.push({ svg: v, ok }); } };
  sample(goods, nGood).forEach((g) => put(g, true));
  for (const b of bads) if (ch.length < 4) put(b, false);
  return build({
    passage: `{大|おお}きな　${C}の　{中|なか}に、{小|ちい}さな　${I}が　あります。${C}の　${dname}には、${S}が　${NUM5[k]}　あります。`,
    ask: "ぶんに　あう　えを　すべて　えらびましょう。", multi: true, choices: ch,
    explain: `たしかめるのは　3つ。①${C}の　{中|なか}に　${I}　②${C}の　${dname}に　${S}　③${S}は　${NUM5[k]}。ならびかたは　かいて　いないので、どう　ならんで　いても　いいよ。`,
    note: "「中」「右」「数」の3条件をすべて確かめられるか。文に書かれていない並び方は問わない。",
  });
});
tpl("image", "narabi", 5, 7, (lv) => {
  const S = pick(["まる", "さんかく", "しかく"]);
  const dir = pick(lv >= 6 ? ["たて", "よこ", "ななめ"] : ["たて", "よこ"]);
  const n = 2 + rand(3);
  const draw = (d, k) => {
    let s = "";
    for (let i = 0; i < k; i++) {
      const o = (i - (k - 1) / 2) * 26;
      const [x, y] = d === "たて" ? [60, 60 + o] : d === "よこ" ? [60 + o, 60] : [60 + o, 60 - o];
      s += fillShape(S, x, y, 10);
    }
    return svg(120, 120, s);
  };
  const others = ["たて", "よこ", "ななめ"].filter((d) => d !== dir);
  const wrongN = n === 4 ? 3 : n + 1;
  const ch = [{ svg: draw(dir, n), ok: true }, ...others.map((d) => ({ svg: draw(d, n), ok: false })), { svg: draw(dir, wrongN), ok: false }];
  const kazu = ["", "", "{二|ふた}つ", "{三|みっ}つ", "{四|よっ}つ"][n];
  const how = { たて: "たては　{上|うえ}から　{下|した}への　むき。", よこ: "よこは　{左|ひだり}から　{右|みぎ}への　むき。", ななめ: "ななめは　かたむいた　むき。" }[dir];
  return build({
    passage: `${S}が　${dir}に　${kazu}　ならんで　います。`,
    ask: "ぶんに　あう　えを　ひとつ　えらびましょう。", choices: ch,
    explain: `「${dir}に　ならぶ」と「${kazu}」の　りょうほうを　たしかめよう。${how}`,
    note: "「たて・よこ・ななめに並ぶ」という並びの向きと個数を、図で正しく判断できるか。",
  });
});
tpl("image", "sakana", 6, 7, () => {
  const faceR = coin();
  const where = pick(["まえ", "うしろ"]);
  const draw = (fr, starRight) => svg(140, 80, fish(70, 40, fr ? 0 : 180) + star(starRight ? 118 : 22, 40, 11));
  const goodStarRight = (where === "まえ") === faceR;
  return build({
    passage: `さかなが　${faceR ? "{右|みぎ}" : "{左|ひだり}"}を　むいて　います。さかなの　${where}に　ほしが　あります。`,
    ask: "ぶんに　あう　えを　ひとつ　えらびましょう。",
    choices: [{ svg: draw(faceR, goodStarRight), ok: true }, { svg: draw(faceR, !goodStarRight), ok: false }, { svg: draw(!faceR, goodStarRight), ok: false }, { svg: draw(!faceR, !goodStarRight), ok: false }],
    explain: "まず　さかなの　むきを　たしかめよう。「まえ」は　かおが　むいて　いる　ほう、「うしろ」は　しっぽの　ほう　だよ。",
    note: "向きによって「まえ・うしろ」が変わること（絵の右左とは別）を理解できるか。",
  });
});
tpl("image", "okuni", 7, 7, () => {
  const [A, B] = sample(["まる", "さんかく", "しかく"], 2);
  const box = `<rect x="35" y="48" width="50" height="40" fill="#bcaaa4" stroke="#6d4c41" stroke-width="2"/>`;
  const back = (t, x = 60) => fillShape(t, x, 42, 14);  // はこの うしろ：うえに すこし みえる（はこに かくれる）
  const front = (t, x = 60) => fillShape(t, x, 90, 14); // はこの てまえ：はこに かさなって まえに みえる
  const draw = (parts) => svg(120, 120, parts.filter((p) => p.z === 0).map((p) => p.s).join("") + box + parts.filter((p) => p.z === 1).map((p) => p.s).join(""));
  return build({
    passage: `はこの　おくに　${A}が　あります。はこの　てまえに　${B}が　あります。`,
    ask: "ぶんに　あう　えを　ひとつ　えらびましょう。",
    choices: [
      { svg: draw([{ z: 0, s: back(A) }, { z: 1, s: front(B) }]), ok: true },
      { svg: draw([{ z: 0, s: back(B) }, { z: 1, s: front(A) }]), ok: false },
      { svg: draw([{ z: 0, s: back(A, 44) }, { z: 0, s: back(B, 76) }]), ok: false },
      { svg: draw([{ z: 1, s: front(A, 44) }, { z: 1, s: front(B, 76) }]), ok: false },
    ],
    explain: "おくに　ある　ものは　はこの　うしろで、すこし　かくれて　みえる。てまえに　ある　ものは　はこより　こちらがわで、はこに　かさなって　みえるよ。",
    note: "平面の絵の中で「手前・奥」を、重なり（隠れ方）から読み取れるか。",
  });
});

// ================================================================
//  具体例同定（辞書）… 定義ひとつが 1つの型
// ================================================================
const it = (text, emoji, fact) => ({ text, emoji, fact });
function defTemplate(field, d) {
  tpl(field, d.id, d.lv, d.lv, () => {
    const np = Math.min(d.pos.length, 1 + rand(3));
    const ps = sample(d.pos, np), ns = sample(d.neg, 4 - np);
    const ch = [...ps.map((i) => ({ ...i, ok: true })), ...ns.map((i) => ({ ...i, ok: false }))];
    const q = build({ passage: d.def, ask: `「${d.word}」に　あてはまる　ものを　すべて　えらびましょう。`, multi: true, choices: ch.map(({ fact, ...c }) => c), note: d.note });
    q.explain = ch.map((c) => `${c.ok ? "⭕" : "✖️"}　${c.text.replace(/。$/, "")}\n　　…　${c.fact}`).join("\n");
    return q;
  });
}
const FOUR = "あしが　4ほんで　けが　ある";
[
  { id: "kemono", lv: 1, word: "けもの", def: "あしが　4ほん　あって、からだに　けが　はえて　いる　どうぶつを「けもの」と　いいます。",
    pos: [it("いぬ", "🐕", FOUR), it("ねこ", "🐈", FOUR), it("うま", "🐎", FOUR), it("うさぎ", "🐇", FOUR), it("うし", "🐄", FOUR)],
    neg: [it("にわとり", "🐔", "あしが　2ほんで、けでは　なく　はね"), it("きんぎょ", "🐟", "あしが　ない"), it("かめ", "🐢", "あしは　4ほん　だけど　けが　ない"), it("かえる", "🐸", "あしは　4ほん　だけど　けが　ない"), it("へび", "🐍", "あしも　けも　ない")],
    note: "定義の条件（あし4本・け）を一つずつ当てはめて判断できるか。かめ・かえるは片方だけ満たすひっかけ。" },
  { id: "tori", lv: 1, word: "とり", def: "からだに　はねが　はえて　いて、くちばしが　ある　いきものを「とり」と　いいます。",
    pos: [it("にわとり", "🐔", "はねと　くちばしが　ある"), it("すずめ", "🐦", "はねと　くちばしが　ある"), it("あひる", "🦆", "はねと　くちばしが　ある"), it("ふくろう", "🦉", "はねと　くちばしが　ある")],
    neg: [it("ちょう", "🦋", "はねは　あるけど　くちばしが　ない"), it("てんとうむし", "🐞", "はねは　あるけど　くちばしが　ない"), it("いぬ", "🐕", "はねも　くちばしも　ない"), it("かめ", "🐢", "はねが　ない")],
    note: "「はね」だけで決めず、2つめの条件「くちばし」まで確かめられるか。" },
  { id: "akagumi", lv: 1, word: "あかぐみ", def: "いろが　あかい　たべものを「あかぐみ」と　よぶ　ことに　します。",
    pos: [it("いちご", "🍓", "あかい　いろ"), it("りんご", "🍎", "あかい　いろ"), it("さくらんぼ", "🍒", "あかい　いろ")],
    neg: [it("みかん", "🍊", "だいだいいろ"), it("ぶどう", "🍇", "むらさきいろ"), it("なす", "🍆", "むらさきいろ"), it("きゅうり", "🥒", "みどりいろ")],
    note: "本文で決めた約束ごと（色が赤い）だけで判断できるか。" },
  { id: "konchu", lv: 2, word: "こんちゅう", def: "あしが　6ぽん　ある　ちいさな　いきものを「こんちゅう」と　いいます。",
    pos: [it("ちょう", "🦋", "あしが　6ぽん"), it("あり", "🐜", "あしが　6ぽん"), it("てんとうむし", "🐞", "あしが　6ぽん"), it("はち", "🐝", "あしが　6ぽん")],
    neg: [it("くも", "🕷️", "あしが　8ほん"), it("すずめ", "🐦", "あしが　2ほん"), it("ねこ", "🐈", "あしが　4ほん"), it("へび", "🐍", "あしが　ない")],
    note: "見た目ではなく、あしの数という定義で判断できるか（くもがひっかけ）。" },
  { id: "sakana", lv: 2, word: "さかな", def: "みずの　なかに　すんで　いて、ひれを　つかって　およぐ　いきものを「さかな」と　いいます。",
    pos: [it("きんぎょ", "🐟", "みずの　なかで　ひれを　つかって　およぐ"), it("ふぐ", "🐡", "みずの　なかで　ひれを　つかって　およぐ"), it("さめ", "🦈", "みずの　なかで　ひれを　つかって　およぐ")],
    neg: [it("かに", "🦀", "みずの　なかに　いるけど　ひれが　ない"), it("かえる", "🐸", "みずに　はいるけど　ひれが　ない"), it("にわとり", "🐔", "みずの　なかに　すんで　いない"), it("いぬ", "🐕", "みずの　なかに　すんで　いない")],
    note: "「水の中」だけで決めず、「ひれで泳ぐ」まで確かめられるか。" },
  { id: "sora", lv: 2, word: "そらの　なかま", def: "はねを　つかって　そらを　とぶ　いきものを「そらの　なかま」と　よぶ　ことに　します。",
    pos: [it("すずめ", "🐦", "はねで　そらを　とぶ"), it("ちょう", "🦋", "はねで　そらを　とぶ"), it("はち", "🐝", "はねで　そらを　とぶ"), it("ふくろう", "🦉", "はねで　そらを　とぶ")],
    neg: [it("いぬ", "🐕", "そらを　とばない"), it("きんぎょ", "🐟", "みずの　なかを　およぐ"), it("かめ", "🐢", "そらを　とばない"), it("へび", "🐍", "そらを　とばない")],
    note: "「とり」かどうかではなく、定義（はねで空をとぶ）で判断できるか。" },
  { id: "ashinashi", lv: 3, word: "あしなし　なかま", def: "あしが　ひとつも　ない　いきものを「あしなし　なかま」と　よぶ　ことに　します。",
    pos: [it("へび", "🐍", "あしが　ない"), it("きんぎょ", "🐟", "あしが　ない"), it("みみず", "🪱", "あしが　ない"), it("くじら", "🐳", "あしが　ない")],
    neg: [it("かめ", "🐢", "あしが　4ほん　ある"), it("にわとり", "🐔", "あしが　2ほん　ある"), it("あり", "🐜", "あしが　6ぽん　ある"), it("かに", "🦀", "あしが　ある")],
    note: "「ひとつも〜ない」を条件として当てはめられるか。" },
  { id: "mizunoikimono", lv: 3, word: "みずの　いきもの", def: "みずの　なかで　くらす　いきものを「みずの　いきもの」と　よぶ　ことに　します。",
    pos: [it("きんぎょ", "🐟", "みずの　なかで　くらす"), it("かに", "🦀", "みずの　なかで　くらす"), it("たこ", "🐙", "みずの　なかで　くらす"), it("くじら", "🐳", "みずの　なかで　くらす")],
    neg: [it("ねこ", "🐈", "りくで　くらす"), it("すずめ", "🐦", "りくや　そらで　くらす"), it("うし", "🐄", "りくで　くらす"), it("ちょう", "🦋", "そらを　とぶ")],
    note: "「さかな」（ひれで泳ぐ）より広い定義。定義が変わると仲間も変わることに気づけるか。" },
  { id: "norimono", lv: 3, word: "のりもの", def: "ひとを　のせて、ほかの　ところへ　はこぶ　ものを「のりもの」と　いいます。",
    pos: [it("じてんしゃ", "🚲", "ひとを　のせて　はこぶ"), it("ふね", "🚢", "ひとを　のせて　はこぶ"), it("ひこうき", "✈️", "ひとを　のせて　はこぶ"), it("でんしゃ", "🚃", "ひとを　のせて　はこぶ")],
    neg: [it("いす", "🪑", "すわれるけど、はこばない"), it("かばん", "👜", "ものを　いれるけど、ひとは　のれない"), it("かさ", "☂️", "ひとを　のせない"), it("ほん", "📕", "ひとを　のせない")],
    note: "「ひとをのせる」「はこぶ」の両方を満たすか確かめられるか。" },
  { id: "dougu", lv: 4, word: "どうぐ", def: "なにかを　する　ために、てに　もって　つかう　ものを「どうぐ」と　いいます。",
    pos: [it("はさみ", "✂️", "かみを　きる　ために　てで　つかう"), it("かなづち", "🔨", "くぎを　うつ　ために　てで　つかう"), it("ほうき", "🧹", "そうじの　ために　てで　つかう"), it("えんぴつ", "✏️", "じを　かく　ために　てで　つかう")],
    neg: [it("りんご", "🍎", "たべもの"), it("ねこ", "🐈", "いきもの"), it("くも", "☁️", "てに　もてない"), it("き", "🌳", "てに　もって　つかう　ものでは　ない")],
    note: "身近な語でも、定義（何かをするために・手に持って使う）に照らして判断できるか。" },
  { id: "nomimono", lv: 4, word: "のみもの", def: "くちから　のんで、おなかに　いれる　ものを「のみもの」と　いいます。",
    pos: [it("ぎゅうにゅう", "🥛", "のんで　おなかに　いれる"), it("おちゃ", "🍵", "のんで　おなかに　いれる"), it("ジュース", "🧃", "のんで　おなかに　いれる")],
    neg: [it("パン", "🍞", "たべる　もので、のむ　ものでは　ない"), it("りんご", "🍎", "たべる　もの"), it("せっけん", "🧼", "おなかに　いれては　いけない"), it("くつ", "👟", "はく　もの")],
    note: "「飲む」「おなかに入れる」の2条件で判断できるか。" },
  { id: "gakki", lv: 4, word: "がっき", def: "おとを　だして、きょくを　えんそう　する　ための　どうぐを「がっき」と　いいます。",
    pos: [it("たいこ", "🥁", "きょくを　えんそう　できる"), it("ピアノ", "🎹", "きょくを　えんそう　できる"), it("ギター", "🎸", "きょくを　えんそう　できる"), it("トランペット", "🎺", "きょくを　えんそう　できる")],
    neg: [it("でんわ", "☎️", "おとは　でるけど、えんそうの　どうぐでは　ない"), it("テレビ", "📺", "おとは　でるけど、えんそうの　どうぐでは　ない"), it("はさみ", "✂️", "えんそう　しない"), it("ボール", "⚽", "えんそう　しない")],
    note: "「音が出る」だけで決めず、「曲を演奏するため」まで確かめられるか。" },
  { id: "otetsudai", lv: 5, word: "おてつだい", def: "おうちの　{人|ひと}が　する　しごとを、かわりに　やったり、{手|て}を　かしたり　する　ことを「おてつだい」と　いいます。",
    pos: [it("おかあさんの　かわりに　おふろを　あらう。", null, "おうちの　しごとを　かわりに　やって　いる"), it("おとうさんと　いっしょに　せんたくものを　たたむ。", null, "おうちの　しごとに　{手|て}を　かして　いる"), it("ごはんの　まえに　おさらを　ならべる。", null, "おうちの　しごとを　して　いる"), it("おばあちゃんが　{草|くさ}を　ぬくのを　{手|て}つだう。", null, "おうちの　しごとに　{手|て}を　かして　いる")],
    neg: [it("じぶんの　すきな　{本|ほん}を　よむ。", null, "じぶんの　たのしみ"), it("ともだちと　こうえんで　あそぶ。", null, "じぶんの　あそび"), it("テレビで　アニメを　{見|み}る。", null, "じぶんの　たのしみ"), it("おやつを　たべる。", null, "おうちの　しごとでは　ない")],
    note: "定義の2つのパターン（代わりにやる／手を貸す）それぞれに当てはまる場面を選べるか。" },
  { id: "yakusoku", lv: 5, word: "やくそく", def: "ほかの　{人|ひと}と、これから　する　ことを　きめて、まもろうと　する　ことを「やくそく」と　いいます。",
    pos: [it("ともだちと「あした　{三|さん}じに　こうえんで　あおうね」と　きめた。", null, "ほかの　{人|ひと}と　これからの　ことを　きめた"), it("おかあさんと「ゲームは　{一|いち}じかん　だけ」と　きめた。", null, "ほかの　{人|ひと}と　これからの　ことを　きめた"), it("おとうとに「つぎは　かして　あげるね」と　いった。", null, "これから　する　ことを　あいてに　つたえた")],
    neg: [it("{一人|ひとり}で　えを　かいた。", null, "ほかの　{人|ひと}と　きめて　いない"), it("きのう　こうえんで　あそんだ。", null, "これからの　ことでは　ない"), it("{先生|せんせい}に「おはようございます」と　いった。", null, "あいさつで、なにかを　きめて　いない"), it("ねる　まえに　はを　みがいた。", null, "ほかの　{人|ひと}と　きめて　いない")],
    note: "「ほかの人と」「これからすること」「きめる」の3条件で判断できるか。" },
  { id: "hayaoki", lv: 5, word: "{早|はや}おき", def: "いつもより　{早|はや}い　じこくに　おきる　ことを「{早|はや}おき」と　いいます。",
    pos: [it("いつも　7じに　おきる　{人|ひと}が、6じに　おきた。", null, "いつもより　{早|はや}い"), it("いつも　8じに　おきる　{人|ひと}が、7じに　おきた。", null, "いつもより　{早|はや}い"), it("いつも　7じ　はんに　おきる　{人|ひと}が、7じに　おきた。", null, "いつもより　{早|はや}い")],
    neg: [it("いつも　6じに　おきる　{人|ひと}が、6じに　おきた。", null, "いつもと　おなじ"), it("いつも　6じに　おきる　{人|ひと}が、7じに　おきた。", null, "いつもより　おそい"), it("いつも　7じに　おきる　{人|ひと}が、8じに　おきた。", null, "いつもより　おそい")],
    note: "「早い」が絶対的な時刻ではなく「いつもより」という比較であることを読み取れるか。" },
  { id: "aisatsu", lv: 6, word: "あいさつ", def: "{人|ひと}と　あった　ときや、わかれる　ときに　いう　ことばを「あいさつ」と　いいます。",
    pos: [it("「おはよう」", null, "あった　ときに　いう"), it("「こんにちは」", null, "あった　ときに　いう"), it("「さようなら」", null, "わかれる　ときに　いう"), it("「またね」", null, "わかれる　ときに　いう")],
    neg: [it("「おなかが　すいた」", null, "あった　ときや　わかれる　ときの　ことばでは　ない"), it("「これ　なあに？」", null, "たずねる　ことば"), it("「{雨|あめ}が　ふって　きた」", null, "ようすを　つたえる　ことば"), it("「あ、{虫|むし}だ」", null, "{見|み}つけた　ことを　いう　ことば")],
    note: "「会ったとき」「別れるとき」という場面の条件で言葉を分類できるか。" },
  { id: "sanpo", lv: 6, word: "さんぽ", def: "とくに　ようじが　なくても、ぶらぶらと　あるいて　でかける　ことを「さんぽ」と　いいます。",
    pos: [it("{犬|いぬ}と　いっしょに　ちかくの　{川|かわ}べりを　あるく。", null, "ようじが　なくて　あるいて　いる"), it("ゆうごはんの　あと、おじいさんと　{町|まち}を　ぶらぶら　あるく。", null, "ようじが　なくて　あるいて　いる"), it("{花|はな}を　{見|み}ながら　こうえんを　ゆっくり　あるく。", null, "ようじが　なくて　あるいて　いる")],
    neg: [it("{学校|がっこう}へ　あるいて　いく。", null, "{学校|がっこう}と　いう　ようじが　ある"), it("{車|くるま}で　おみせに　いく。", null, "あるいて　いないし、ようじも　ある"), it("おつかいで　パンを　かいに　いく。", null, "かいものの　ようじが　ある"), it("へやで　ねころんで　{本|ほん}を　よむ。", null, "でかけて　いない")],
    note: "「用事がない」「歩く」「出かける」の3条件で場面を判断できるか。" },
  { id: "otoshimono", lv: 6, word: "おとしもの", def: "もって　いた　ものを、しらない　うちに　どこかに　おとして　なくして　しまった　ものを「おとしもの」と　いいます。",
    pos: [it("かえり{道|みち}で　いつのまにか　なくした　てぶくろ。", null, "しらない　うちに　おとした"), it("こうえんで　ポケットから　おちて　しまった　ハンカチ。", null, "しらない　うちに　おとした")],
    neg: [it("ともだちに　あげた　シール。", null, "じぶんで　あげた"), it("いえの　つくえの　{上|うえ}に　おいて　ある　{本|ほん}。", null, "なくして　いない"), it("じぶんで　ごみばこに　すてた　かみ。", null, "しって　いて　すてた"), it("おかあさんに　あずけた　さいふ。", null, "なくして　いない")],
    note: "「しらないうちに」「なくした」という条件で、似た場面（あげた・すてた）と区別できるか。" },
  { id: "shokubutsu", lv: 7, word: "しょくぶつ", def: "つちに　ねを　はって、そこから　うごかずに　そだつ　いきものを「しょくぶつ」と　いいます。",
    pos: [it("ひまわり", "🌻", "つちに　ねを　はって　そだつ"), it("さくらの　{木|き}", "🌸", "つちに　ねを　はって　そだつ"), it("チューリップ", "🌷", "つちに　ねを　はって　そだつ")],
    neg: [it("ちょう", "🦋", "とんで　うごく"), it("{犬|いぬ}", "🐕", "あるいて　うごく"), it("{石|いし}", "🪨", "いきものでは　ない"), it("さかな", "🐟", "およいで　うごく")],
    note: "「根をはる」「動かずに育つ」「生き物」の条件で判断できるか（石＝生き物でない）。" },
  { id: "doubutsu", lv: 7, word: "どうぶつ", def: "じぶんで　うごいて、ほかの　いきものを　たべて　いきる　いきものを「どうぶつ」と　いいます。",
    pos: [it("{犬|いぬ}", "🐕", "うごいて、ほかの　いきものを　たべる"), it("ちょう", "🦋", "とんで　うごき、{花|はな}の　みつを　すう"), it("さかな", "🐟", "およいで　うごき、ほかの　いきものを　たべる"), it("カエル", "🐸", "うごいて、{虫|むし}を　たべる")],
    neg: [it("ひまわり", "🌻", "うごかない　しょくぶつ"), it("さくらの　{木|き}", "🌸", "うごかない　しょくぶつ"), it("{石|いし}", "🪨", "いきものでは　ない"), it("{車|くるま}", "🚗", "うごくけど　いきものでは　ない")],
    note: "日常語の「動物＝けもの」ではなく、定義の「動く・食べる・生き物」で判断できるか（車は動くが生き物でない）。" },
  { id: "kyoudai", lv: 7, word: "きょうだい", def: "おなじ　おとうさんと　おかあさんから　うまれた　{子|こ}どうしを「きょうだい」と　いいます。",
    pos: [it("じぶんの　おにいさん", null, "おなじ　おやから　うまれた"), it("じぶんの　いもうと", null, "おなじ　おやから　うまれた"), it("じぶんの　おねえさん", null, "おなじ　おやから　うまれた")],
    neg: [it("じぶんの　いとこ", null, "おやが　ちがう"), it("じぶんの　おじさん", null, "おやの　きょうだいで、じぶんとは　ちがう"), it("おなじ　クラスの　ともだち", null, "おやが　ちがう"), it("じぶんの　おかあさん", null, "おや　そのもの")],
    note: "親族関係の定義を、日常の呼び方ではなく「同じ親から生まれた」で判断できるか。" },
].forEach((d) => defTemplate("jisho", d));

// ================================================================
//  具体例同定（理数）
// ================================================================
function randPoly(n) {
  for (;;) {
    const a = Array.from({ length: n }, () => Math.random() * Math.PI * 2).sort((x, y) => x - y);
    const gaps = a.map((v, i) => (i + 1 < n ? a[i + 1] - v : a[0] + Math.PI * 2 - v));
    if (Math.min(...gaps) < (n === 3 ? 1.1 : 0.8)) continue;
    const rx = 38 + rand(8), ry = 38 + rand(8);
    return a.map((t) => [60 + rx * Math.cos(t), 60 + ry * Math.sin(t)]);
  }
}
const pts = (P) => P.map((p) => p.map((v) => v.toFixed(0)).join(",")).join(" ");
const shapeSvg = {
  closed: (P) => strokeSvg(`<polygon points="${pts(P)}"/>`),
  open: (P) => {
    const n = P.length, a = P[n - 1], b = P[0];
    const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return strokeSvg(`<polyline points="${pts([at(0.7), ...P, at(0.3)])}"/>`);
  },
  curved: (P) => {
    const n = P.length, a = P[n - 1], b = P[0];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const c = [m[0] + (60 - m[0]) * 0.9, m[1] + (60 - m[1]) * 0.9];
    return strokeSvg(`<path d="M${pts([P[0]])} L${pts(P.slice(1))} Q${pts([c])} ${pts([b])} Z"/>`);
  },
};
const upright = {
  3: () => { const w = 30 + rand(14), h = 30 + rand(10), f = coin() ? 1 : -1; return [[60, 60 - f * h], [60 + w, 60 + f * h], [60 - w, 60 + f * h]]; },
  4: () => { const w = 30 + rand(14), h = 26 + rand(16); return [[60 - w, 60 - h], [60 + w, 60 - h], [60 + w, 60 + h], [60 - w, 60 + h]]; },
};
function shapeDef(n) {
  return () => {
    const word = n === 3 ? "さんかく" : "しかく";
    const num = n === 3 ? "3ぼん" : "4ほん";
    const np = 1 + rand(3);
    const pos = Array.from({ length: np }, (_, i) => ({ svg: shapeSvg.closed(i === 0 && coin() ? upright[n]() : randPoly(n)), ok: true, kind: "ok" }));
    const neg = shuffle([
      { svg: shapeSvg.open(randPoly(n)), ok: false, kind: "open" },
      { svg: shapeSvg.curved(randPoly(n)), ok: false, kind: "curved" },
      { svg: shapeSvg.closed(randPoly(n === 3 ? 4 : 3)), ok: false, kind: "count" },
      { svg: shapeSvg.closed(randPoly(5)), ok: false, kind: "count" },
    ]).slice(0, 4 - np);
    const kinds = new Set(neg.map((c) => c.kind));
    const ex = [`${word}は、まっすぐな　せん　${num}で　ぐるりと　かこまれた　かたち。むきが　かわっても　${word}だよ。`];
    if (kinds.has("open")) ex.push("せんが　とぎれて　いる　ものは、かこまれて　いないね。");
    if (kinds.has("curved")) ex.push("まがった　せんが　ある　ものは　ちがうよ。");
    if (kinds.has("count")) ex.push("せんの　かずが　ちがう　ものも　あるね。");
    return build({
      passage: `まっすぐな　せん　${num}で　ぐるりと　かこまれた　かたちを「${word}」と　いいます。`,
      ask: `「${word}」に　あてはまる　ものを　すべて　えらびましょう。`, multi: true,
      choices: [...pos, ...neg].map(({ kind, ...c }) => c), explain: ex.join(""),
      note: "見た目ではなく「まっすぐ」「本数」「かこまれた」という定義で判断できるか。向きが変わっても同じ図形と言えるか。",
    });
  };
}
tpl("risu", "sankaku", 1, 1, shapeDef(3));
tpl("risu", "shikaku", 1, 1, shapeDef(4));
tpl("risu", "marugata", 2, 2, () => {
  const posPool = [
    () => strokeSvg(`<circle cx="60" cy="60" r="${30 + rand(12)}"/>`),
    () => strokeSvg(`<ellipse cx="60" cy="60" rx="${40 + rand(8)}" ry="${22 + rand(10)}"/>`),
    () => strokeSvg(`<ellipse cx="60" cy="60" rx="${22 + rand(10)}" ry="${40 + rand(8)}"/>`),
  ];
  const negPool = [
    [() => strokeSvg(`<path d="M18,72 A42,42 0 0 1 102,72 Z"/>`), "はんぶんの　まるは、かどが　2つ　ある"],
    [() => strokeSvg(`<path d="M60,14 C98,62 92,104 60,104 C28,104 22,62 60,14 Z"/>`), "しずくの　かたちは、うえに　かどが　1つ　ある"],
    [() => shapeSvg.closed(randPoly(3)), "さんかくは　かどが　ある"],
    [() => shapeSvg.closed(upright[4]()), "しかくは　かどが　ある"],
  ];
  const np = 1 + rand(2);
  const negs = sample(negPool, 4 - np);
  return build({
    passage: "かどが　ひとつも　ない　かたちを「まるがた」と　よぶ　ことに　します。",
    ask: "「まるがた」に　あてはまる　ものを　すべて　えらびましょう。", multi: true,
    choices: [...sample(posPool, np).map((f) => ({ svg: f(), ok: true })), ...negs.map(([f]) => ({ svg: f(), ok: false }))],
    explain: "かどが　ひとつも　なければ、ほそながくても「まるがた」。" + negs.map(([, t]) => t).join("。") + "。",
    note: "「かどがひとつもない」を条件として当てはめられるか。半円・しずく形（かどが少しだけある）がひっかけ。",
  });
});
const dotRow = (cs) => svg(140, 40, cs.map((c, i) => `<circle cx="${20 + i * 33}" cy="20" r="13" fill="${HEX[c]}"/>`).join(""));
tpl("risu", "soroi", 2, 2, () => {
  const cols = ["あか", "あお", "きいろ", "みどり"];
  const np = 1 + rand(2);
  const ch = [], seen = new Set();
  while (ch.length < np) { const r0 = Array(4).fill(pick(cols)); if (!seen.has(r0.join())) { seen.add(r0.join()); ch.push({ svg: dotRow(r0), ok: true }); } }
  while (ch.length < 4) { const c = pick(cols); const r0 = Array(4).fill(c); r0[rand(4)] = pick(cols.filter((x) => x !== c)); if (!seen.has(r0.join())) { seen.add(r0.join()); ch.push({ svg: dotRow(r0), ok: false }); } }
  return build({
    passage: "ならんで　いる　まるが、ぜんぶ　おなじ　いろの　ならびを「そろい」と　よぶ　ことに　します。",
    ask: "「そろい」に　あてはまる　ものを　すべて　えらびましょう。", multi: true, choices: ch,
    explain: "ひとつでも　ちがう　いろが　まざって　いたら「ぜんぶ　おなじ」では　ないね。はしから　じゅんに　たしかめよう。",
    note: "「ぜんぶ」の条件を、一つずつ確かめられるか（1つだけ違う色がまざったものがひっかけ）。",
  });
});
tpl("risu", "koutai", 3, 3, () => {
  const cols = ["あか", "あお", "きいろ"];
  const okRow = (x) => x.every((c, i) => i === 0 || c !== x[i - 1]);
  const gen = () => Array.from({ length: 4 }, () => pick(cols));
  const np = 1 + rand(2);
  const ch = [], seen = new Set();
  while (ch.filter((c) => c.ok).length < np) { const x = gen(); if (okRow(x) && !seen.has(x.join())) { seen.add(x.join()); ch.push({ svg: dotRow(x), ok: true }); } }
  while (ch.length < 4) { const x = gen(); if (!okRow(x) && !seen.has(x.join())) { seen.add(x.join()); ch.push({ svg: dotRow(x), ok: false }); } }
  return build({
    passage: "となりどうしの　まるが、いつも　ちがう　いろに　なって　いる　ならびを「こうたい　ならび」と　よぶ　ことに　します。",
    ask: "「こうたい　ならび」に　あてはまる　ものを　すべて　えらびましょう。", multi: true, choices: ch,
    explain: "となりあう　ふたつを　ひとくみずつ　みて、おなじ　いろが　となりに　ないか　たしかめよう。",
    note: "隣り合う全ペアについて条件を確かめられるか（原典Q26「同じ文字が2つ以上続かない」の入り口）。",
  });
});
function seqDef(d) {
  tpl("risu", d.id, d.lv, d.lv, () => {
    const np = 1 + rand(3);
    const seen = new Set(), ch = [];
    while (ch.filter((c) => c.ok).length < np) { const a = d.pos(); const k = a.join(); if (!seen.has(k)) { seen.add(k); ch.push({ a, ok: true }); } }
    while (ch.length < 4) { const a = d.neg(); const k = a.join(); if (!seen.has(k) && !d.test(a)) { seen.add(k); ch.push({ a, ok: false }); } }
    const fmt = d.pair ? (a) => `（${a.join("、")}）` : (a) => a.join("　");
    return build({
      passage: d.def, ask: `「${d.word}」に　あてはまる　ものを　すべて　えらびましょう。`, multi: true,
      choices: ch.map((c) => ({ text: fmt(c.a), ok: c.ok })), explain: d.ex,
      note: "定義の条件を、すべての数（となり合う組）について確かめられるか。ほぼ当てはまるひっかけを見ぬけるか。",
    });
  });
}
const rr = (lo, hi) => lo + rand(hi - lo + 1);
const asc = (n) => sample([1, 2, 3, 4, 5, 6, 7, 8, 9], n).sort((x, y) => x - y);
seqDef({ id: "nobori", lv: 3, word: "のぼり　ならび",
  def: "みっつの　かずが　ならんで　いて、ひだりから　みぎへ　いつも　おおきく　なって　いく　ならびを「のぼり　ならび」と　いいます。",
  test: (a) => a[0] < a[1] && a[1] < a[2], pos: () => asc(3),
  neg: () => pick([() => { const a = rr(1, 8), b = rr(a + 1, 9); return coin() ? [a, a, b] : [a, b, b]; }, () => asc(3).reverse(), () => { const s = asc(3); return [s[0], s[2], s[1]]; }])(),
  ex: "みぎへ　いく　たびに　かならず　おおきく　なって　いるか、ひとつずつ　たしかめよう。おなじ　かずが　つづくと「おおきく　なる」とは　いえないね。" });
seqDef({ id: "kudari", lv: 4, word: "くだり　ならび",
  def: "みっつの　かずが　ならんで　いて、ひだりから　みぎへ　いつも　ちいさく　なって　いく　ならびを「くだり　ならび」と　いいます。",
  test: (a) => a[0] > a[1] && a[1] > a[2], pos: () => asc(3).reverse(),
  neg: () => pick([() => { const a = rr(2, 9), b = rr(1, a - 1); return coin() ? [a, a, b] : [a, b, b]; }, () => asc(3), () => { const s = asc(3).reverse(); return [s[1], s[0], s[2]]; }])(),
  ex: "みぎへ　いく　たびに　かならず　ちいさく　なって　いるか、ひとつずつ　たしかめよう。" });
seqDef({ id: "go", lv: 4, word: "5の　なかま", pair: true,
  def: "ふたつの　かずを　あわせると　5に　なる　くみを「5の　なかま」と　いいます。",
  test: (a) => a[0] + a[1] === 5, pos: () => { const a = rr(1, 4); return [a, 5 - a]; },
  neg: () => { const t = pick([4, 6]); const a = rr(1, t - 1); return [a, t - a]; },
  ex: "ふたつの　かずを　あわせて　みよう。4や　6に　なる　くみが　まざって　いるよ。" });
seqDef({ id: "tsuzuki", lv: 5, word: "つづき　ならび",
  def: "{左|ひだり}から　{右|みぎ}へ、かずが　{一|ひと}つずつ　ふえて　いく　ならびを「つづき　ならび」と　いいます。",
  test: (a) => a[1] === a[0] + 1 && a[2] === a[1] + 1, pos: () => { const a = rr(1, 7); return [a, a + 1, a + 2]; },
  neg: () => pick([() => { const a = rr(1, 5); return [a, a + 2, a + 4]; }, () => { const a = rr(1, 6); return coin() ? [a, a + 1, a + 3] : [a, a + 2, a + 3]; }, () => { const a = rr(3, 9); return [a, a - 1, a - 2]; }, () => { const a = rr(1, 8); return [a, a, a + 1]; }])(),
  ex: "となりどうしの　ちがいが　いつも「1」で、ふえて　いるかを　みよう。へって　いく　ものや、2　とんで　いる　ものは　ちがうね。" });
seqDef({ id: "juu", lv: 5, word: "10の　なかま", pair: true,
  def: "{三|みっ}つの　かずを　ぜんぶ　たすと　10に　なる　くみを「10の　なかま」と　いいます。",
  test: (a) => a[0] + a[1] + a[2] === 10, pos: () => { for (;;) { const a = rr(1, 8), b = rr(1, 8), c = 10 - a - b; if (c >= 1 && c <= 8) return [a, b, c]; } },
  neg: () => { for (;;) { const t = pick([9, 11]); const a = rr(1, 8), b = rr(1, 8), c = t - a - b; if (c >= 1 && c <= 9) return [a, b, c]; } },
  ex: "{三|みっ}つの　かずを　じゅんに　たして　みよう。10より　{一|ひと}つ　すくない　ものや　おおい　ものが　まざって　いるよ。" });
seqDef({ id: "nitobi", lv: 6, word: "2とび　ならび",
  def: "{左|ひだり}から　{右|みぎ}へ、かずが　いつも　2ずつ　ふえて　いく　ならびを「2とび　ならび」と　いいます。",
  test: (a) => a[1] === a[0] + 2 && a[2] === a[1] + 2, pos: () => { const a = rr(1, 5); return [a, a + 2, a + 4]; },
  neg: () => pick([() => { const a = rr(1, 7); return [a, a + 1, a + 2]; }, () => { const a = rr(1, 4); return coin() ? [a, a + 2, a + 5] : [a, a + 3, a + 5]; }, () => { const a = rr(5, 9); return [a, a - 2, a - 4]; }])(),
  ex: "となりどうしの　ちがいが　いつも「2」で、ふえて　いるかを　みよう。" });
seqDef({ id: "tonarichigai", lv: 6, word: "となりちがい",
  def: "{四|よっ}つの　かずが　ならんで　いて、となりどうしに　おなじ　かずが　ない　ならびを「となりちがい」と　いいます。",
  test: (a) => a.every((v, i) => i === 0 || v !== a[i - 1]),
  pos: () => { for (;;) { const a = Array.from({ length: 4 }, () => rr(1, 3)); if (a.every((v, i) => i === 0 || v !== a[i - 1])) return a; } },
  neg: () => { for (;;) { const a = Array.from({ length: 4 }, () => rr(1, 3)); if (!a.every((v, i) => i === 0 || v !== a[i - 1])) return a; } },
  ex: "となりあう　ふたつを　ひとくみずつ　みて、おなじ　かずが　ならんで　いないか　たしかめよう。はなれて　いれば　おなじ　かずが　あっても　いいよ。" });
seqDef({ id: "chigai3", lv: 7, word: "3ちがい", pair: true,
  def: "ふたつの　かずの　ちがいが　3に　なる　くみを「3ちがい」と　よぶ　ことに　します。",
  test: (a) => Math.abs(a[0] - a[1]) === 3, pos: () => { const a = rr(3, 9); return coin() ? [a, a - 3] : [a - 3, a]; },
  neg: () => { const a = rr(1, 9); const d = pick([1, 2, 4, 5]); return coin() ? [a, a + d] : [a + d, a]; },
  ex: "{大|おお}きい　ほうから　{小|ちい}さい　ほうを　ひいて　みよう。どちらが　{先|さき}に　かいて　あっても、ちがいは　おなじ　だよ。" });
seqDef({ id: "yama", lv: 7, word: "やま　ならび",
  def: "{三|みっ}つの　かずが　ならんで　いて、まんなかの　かずが　いちばん　{大|おお}きい　ならびを「やま　ならび」と　よぶ　ことに　します。",
  test: (a) => a[1] > a[0] && a[1] > a[2], pos: () => { const s = asc(3); return coin() ? [s[0], s[2], s[1]] : [s[1], s[2], s[0]]; },
  neg: () => pick([() => asc(3), () => asc(3).reverse(), () => { const s = asc(2); return coin() ? [s[1], s[1], s[0]] : [s[0], s[1], s[1]]; }, () => { const s = asc(3); return [s[2], s[0], s[1]]; }])(),
  ex: "まんなかの　かずが、りょうどなりの　どちらよりも　{大|おお}きいか　たしかめよう。おなじ　かずでは「いちばん　{大|おお}きい」とは　いえないね。" });

// ================================================================
const templatesAt = (lv, field) => TPL.filter((t) => t.from <= lv && lv <= t.to && (!field || t.field === field));
const unitKey = (lv, t) => `${lv}:${t.field}:${t.id}`;

// 型から問題をつくる（最近出た問題は なるべく さける）
const recent = new Map();
function drawFromTemplate(t, lv) {
  const key = unitKey(lv, t);
  const rec = recent.get(key) || [];
  let q, sig;
  for (let i = 0; i < 30; i++) {
    q = t.gen(lv);
    sig = q.passage + "|" + (q.passage2 || "") + "|" + q.ask + "|" + q.choices.map((c) => c.svg || c.text).join("#");
    if (!rec.includes(sig)) break;
  }
  rec.push(sig);
  if (rec.length > 10) rec.shift();
  recent.set(key, rec);
  const n = (s) => notate(s, lv);
  return {
    ...q, kind: "read", level: lv, field: t.field, unit: key,
    passage: n(q.passage), passage2: n(q.passage2), ask: n(q.ask), explain: n(q.explain),
    choices: q.choices.map((c) => ({ ...c, text: n(c.text) })),
  };
}

if (typeof module !== "undefined") module.exports = { TPL, templatesAt, drawFromTemplate, notate, unitKey };
