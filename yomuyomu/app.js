(() => {
  const app = document.getElementById("app");
  const fieldOf = (id) => FIELDS.find((f) => f.id === id);
  const STORE = "rst-kids-progress-v3";

  // ---------------- 記録 ----------------
  //   units[key] = { s: いまの連続正解, w: 一度でもまちがえた, m: マスター, n: こたえた回数 }
  //   key … ことば "w:ue" ／ 読む型 "3:kakari:asonde"
  //   days[日付] = その日に こたえた数
  //   badges = 1回の れんしゅうの メダル（きん・ぎん・どう）、name = ライセンスに のせる なまえ
  const fresh = () => ({ lv: 1, passed: {}, units: {}, days: {}, badges: { g: 0, s: 0, b: 0 }, name: "" });
  let state = fresh();
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(STORE)) || {}); } catch (e) {}
  const save = () => {
    try { if (!CLOUD.online) localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
    CLOUD.save(state, summary());
  };
  const today = () => new Date().toLocaleDateString("sv-SE");
  const weekCount = () => Object.entries(state.days).filter(([d]) => Date.now() - new Date(d).getTime() < 7 * 864e5).reduce((n, [, c]) => n + c, 0);
  const U = (key) => state.units[key] || { s: 0, w: false, m: false, n: 0 };
  const need = (u) => (u.w ? MASTER_AFTER_MISS : MASTER_NEW);
  function record(key, ok) {
    const u = { ...U(key) };
    u.n++;
    state.days[today()] = (state.days[today()] || 0) + 1;
    if (ok) { u.s++; if (u.s >= need(u)) u.m = true; } else { u.s = 0; u.w = true; }
    state.units[key] = u;
    return u;
  }

  // ---------------- レベルの中身 ----------------
  const levelNums = LEVELS.map((l) => l.lv);
  const wordUnits = (lv) => termsAt(lv).map((t) => ({ key: `w:${t.id}`, t }));      // そのレベルで使える ことば（前のレベルの分も）
  const readUnits = (lv, f) => templatesAt(lv, f).map((t) => ({ key: unitKey(lv, t), t }));
  const cnt = (list) => ({ done: list.filter((x) => U(x.key).m).length, all: list.length });
  const wordsTried = (lv) => newTermsAt(lv).every((t) => U(`w:${t.id}`).n > 0);
  const levelDone = (lv) => [...wordUnits(lv), ...readUnits(lv)].every((x) => U(x.key).m);
  const isOpen = (lv) => { const i = levelNums.indexOf(lv); return i <= 0 || !!state.passed[levelNums[i - 1]]; };
  if (!levelNums.includes(state.lv)) state.lv = 1;

  // ---------------- 表示の道具 ----------------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rb = (s) => esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>").replace(/\n/g, "<br>");
  const yomi = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2");
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(yomi(text).replace(/[（）「」]/g, " "));
    u.lang = "ja-JP"; u.rate = 0.85;
    speechSynthesis.speak(u);
  };
  const dots = (u) => { const k = need(u); return u.m ? "◎" : "●".repeat(Math.min(u.s, k)) + "○".repeat(Math.max(0, k - u.s)); };
  // 点線の星＝まだ、ぬりつぶした星＝クリア。昇段に必要なものを ひと目で わかるように する
  //   frac … 途中まで ぬる わりあい（1回せいかいで 1/2、まちがえた後は 1/3 ずつ）
  const STARPTS = "12,2.2 14.9,8.6 21.8,9.3 16.6,13.9 18.1,20.8 12,17.2 5.9,20.8 7.4,13.9 2.2,9.3 9.1,8.6";
  let starId = 0;
  const star = (on, big, frac = 0) => {
    const id = `sc${starId++}`;
    const part = !on && frac > 0 ? `<clipPath id="${id}"><rect x="0" y="0" width="${(24 * frac).toFixed(1)}" height="24"/></clipPath><polygon class="part" clip-path="url(#${id})" points="${STARPTS}"/>` : "";
    return `<svg class="st${on ? " on" : ""}${big ? " big" : ""}" viewBox="0 0 24 24" aria-hidden="true">${part}<polygon points="${STARPTS}"/></svg>`;
  };
  const ustar = (u, big) => star(u.m, big, u.m ? 1 : u.s / need(u));
  const stars = (list) => `<span class="stars" role="img" aria-label="${list.filter((x) => U(x.key).m).length}/${list.length} クリア">${list.map((x) => ustar(U(x.key))).join("")}</span>`;
  // ことばは、このレベルの新しい ことば と、まだ クリアして いない 前の ことば
  const reqWords = (lv) => wordUnits(lv).filter((x) => x.t.lv === lv || !U(x.key).m);
  const bar = (c) => `<div class="bar"><i style="width:${c.all ? (100 * c.done) / c.all : 0}%"></i></div>`;

  // ---------------- ホーム ----------------
  function home() {
    const lv = state.lv;
    const L = LEVELS.find((l) => l.lv === lv);
    app.innerHTML = "";
    app.append(el(`<h1 class="title">よむよむ　チャレンジ</h1>`));
    if (CLOUD.nick) app.append(el(`<p class="lead who">${esc(CLOUD.nick)}　さん</p>`));

    const ladder = el(`<div class="ladder"></div>`);
    for (let n = 1; n <= MAX_LEVEL; n++) {
      const made = levelNums.includes(n);
      const cls = ["step", made ? "made" : "", n === lv ? "now" : "", state.passed[n] ? "passed" : "", made && !isOpen(n) ? "locked" : ""].join(" ");
      const s = el(`<button class="${cls}" ${made ? "" : "disabled"}>${state.passed[n] ? "★" : n}</button>`);
      if (made) s.onclick = () => pickLevel(n);
      ladder.append(s);
    }
    app.append(ladder);
    const mapRow = el(`<div class="pbar center top0"><button class="go sm ghost" id="mapBtn">ちず</button>${shelf()}</div>`);
    mapRow.querySelector("#mapBtn").onclick = () => map();
    app.append(mapRow);

    const cw = cnt(reqWords(lv)), cr = cnt(readUnits(lv));
    const left = cw.all - cw.done + cr.all - cr.done;
    app.append(el(`<div class="lvhead">
      <div class="lvnum">レベル <b>${lv}</b>${state.passed[lv] ? '<span class="badge">ごうかく</span>' : ""}</div>
      <div class="lvgrade">${L.grade}</div>
      <div class="lvdesc">${esc(L.desc)}</div>
      <div class="goal">${left ? `${star(false)}を　ぜんぶ　${star(true)}に　すると　ごうかく！　のこり　<b>${left}こ</b>` : `${star(true)}　ぜんぶ　そろった！`}${bar({ done: cw.done + cr.done, all: cw.all + cr.all })}</div>
    </div>`));

    // ① ことばチェック
    const ready = wordsTried(lv);
    const wb = el(`<button class="wordbtn">
      <span class="step1">①</span>
      <span class="wb"><b>ことばチェック</b>${stars(reqWords(lv))}</span>
    </button>`);
    wb.onclick = () => startWords(lv);
    app.append(wb);

    // ② よむ れんしゅう
    app.append(el(`<h3 class="sec">②　よむ　れんしゅう${ready ? "" : "<small>（さきに ことばチェックを しよう）</small>"}</h3>`));
    const grid = el(`<div class="grid"></div>`);
    FIELDS.forEach((f) => {
      const c = cnt(readUnits(lv, f.id));
      const b = el(`<button class="field${c.all && c.done === c.all ? " cleared" : ""}" style="--c:${f.color}">
        <span class="kid">${f.kid}</span>
        <span class="adult">${f.name}</span>
        ${stars(readUnits(lv, f.id))}
      </button>`);
      b.disabled = !ready || !c.all;
      b.onclick = () => startField(lv, f.id);
      grid.append(b);
    });
    app.append(grid);

    const mix = el(`<button class="allbtn">まぜて　れんしゅう</button>`);
    mix.disabled = !ready;
    mix.onclick = () => startMix(lv);
    app.append(mix);
    app.append(el(`<p class="hint legend">${star(false)} まだ　${star(false, false, 0.5)} とちゅう　${star(true)} クリア<br>ほしは　2かい　つづけて　せいかいで　ぬりつぶせるよ（まちがえたら　3かい）</p>`));

    if (CLOUD.online) {
      const row = el(`<div class="pbar center"><button class="go sm ghost" id="matesBtn">みんなの　ようす</button><button class="go sm ghost" id="invBtn">ともだちを　しょうたい</button></div>`);
      row.querySelector("#matesBtn").onclick = mates;
      row.querySelector("#invBtn").onclick = invite;
      app.append(row);
    }
    const rec = el(`<button class="link">おうちの方・先生へ：きろく・れんらく</button>`);
    rec.onclick = () => records(lv);
    app.append(rec);
  }

  // 画面の中に出す かくにん（window.confirm が使えない環境でも動くように）
  function ask(msg, yes, onYes) {
    const m = el(`<div class="modal"><div class="mbox"><p>${rb(msg)}</p><div class="mbtns"><button class="go mno">やめる</button><button class="go myes">${yes}</button></div></div></div>`);
    m.querySelector(".mno").onclick = () => m.remove();
    m.querySelector(".myes").onclick = () => { m.remove(); onYes(); };
    document.body.append(m);
  }
  function pickLevel(n) {
    const go = () => { state.lv = n; save(); home(); };
    if (isOpen(n)) return go();
    const prev = levelNums[levelNums.indexOf(n) - 1];
    ask(`【おうちの方へ】\nレベル${prev}に まだ ごうかく していません。\nレベル${n}を ひらきますか？`, "ひらく", go);
  }

  // ---------------- 出題の えらびかた ----------------
  // まだ クリアして いない ものを 優先。連続正解が いるので 同じ ものが 何度か 出る。
  function plan(units, count) {
    const todo = units.filter((x) => !U(x.key).m);
    const pool = todo.length ? todo : units;
    const out = [];
    let round = [];
    while (out.length < count && pool.length) {
      if (!round.length) round = shuffle(pool);
      let nx = round.shift();
      if (out.length && out[out.length - 1].key === nx.key && round.length) { round.push(nx); nx = round.shift(); }
      out.push(nx);
    }
    return { list: out, review: !todo.length };
  }
  const makeQ = (lv, x) => (x.key.startsWith("w:") ? drawWord(x.t) : drawFromTemplate(x.t, lv));

  let S = null; // いまの セッション
  function startWords(lv) {
    const all = wordUnits(lv);
    const fresh = all.filter((x) => x.t.lv === lv && !U(x.key).m);
    const old = all.filter((x) => x.t.lv < lv && !U(x.key).m);
    const p = plan(fresh.length ? [...fresh, ...old] : all, Math.max(WORD_SESSION, fresh.length));
    begin(lv, "ことばチェック", p);
  }
  const startField = (lv, f) => begin(lv, fieldOf(f).kid, plan(readUnits(lv, f), PRACTICE_COUNT));
  function startMix(lv) {
    const words = wordUnits(lv).filter((x) => !U(x.key).m);
    const p = plan(readUnits(lv), MIX_COUNT);
    // まだ おぼえて いない ことばを 2つまで まぜる
    sample(words, 2).forEach((w) => p.list.splice(rand(p.list.length + 1), 0, w));
    begin(lv, "まぜて れんしゅう", p);
  }
  function begin(lv, title, p) {
    S = { lv, title, list: p.list, review: p.review, pos: 0, score: 0, newly: [], wasDone: levelDone(lv) };
    show();
  }

  // ---------------- 1もん ----------------
  function show() {
    const x = S.list[S.pos];
    const q = makeQ(S.lv, x);
    window.__rstCurrent = q; // テスト用
    const isWord = q.kind === "word";
    const f = isWord ? null : fieldOf(q.field);
    let picked = new Set();
    let done = false;

    app.innerHTML = "";
    const top = el(`<div class="top">
      <button class="back">← もどる</button>
      <span class="tag" style="--c:${isWord ? "#8d6e63" : f.color}">${isWord ? "ことば" : f.kid}</span>
      <span class="hint" style="margin:0 0 0 auto">${S.pos + 1}/${S.list.length}</span>
    </div>`);
    top.querySelector(".back").onclick = () => { window.speechSynthesis?.cancel(); home(); };
    app.append(top);

    if (q.scene) app.append(el(`<div class="passage scene">${q.scene}</div>`));
    if (q.passage) {
      if (q.passage2) {
        app.append(el(`<div class="passage"><span class="lbl">ア</span>${rb(q.passage)}</div>`));
        app.append(el(`<div class="passage"><span class="lbl">イ</span>${rb(q.passage2)}</div>`));
      } else app.append(el(`<div class="passage">${rb(q.passage)}</div>`));
    }
    const ask = el(`<div class="ask${isWord ? " big" : ""}"><button class="speak" aria-label="よみあげ">🔊</button><span>${rb(q.ask)}</span></div>`);
    ask.querySelector(".speak").onclick = () => speak(q.ask);
    app.append(ask);
    if (isWord) speak(q.ask); // ことばチェックは 指示を 読み上げる

    const long = q.choices.some((c) => yomi(c.text || "").length > 9);
    const box = el(`<div class="choices${long ? " long" : ""}"></div>`);
    const buttons = q.choices.map((c, i) => {
      const b = el(`<button class="choice">${c.svg || ""}${c.emoji ? `<span class="emoji">${c.emoji}</span>` : ""}${c.text && c.text.trim() ? `<span>${rb(c.text)}</span>` : ""}</button>`);
      b.onclick = () => {
        if (done) return;
        if (q.multi) picked.has(i) ? picked.delete(i) : picked.add(i);
        else picked = new Set([i]);
        buttons.forEach((bb, j) => bb.classList.toggle("picked", picked.has(j)));
        go.disabled = picked.size === 0;
      };
      box.append(b);
      return b;
    });
    app.append(box);
    if (q.multi) app.append(el(`<p class="hint">あてはまる　ものは　ひとつとは　かぎらないよ</p>`));

    const go = el(`<button class="go" disabled>こたえる</button>`);
    app.append(go);
    go.onclick = () => {
      if (done) { S.pos++; S.pos < S.list.length ? show() : end(); return; }
      done = true;
      const ans = new Set(q.answer);
      const ok = ans.size === picked.size && [...ans].every((a) => picked.has(a));
      const before = U(x.key).m;
      const u = record(x.key, ok);
      if (ok) S.score++;
      if (!before && u.m) S.newly.push(isWord ? `ことば「${yomi(q.word)}」` : `${f.kid}（${x.t.id}）`);
      if (!S.wasDone && levelDone(S.lv)) state.passed[S.lv] = true;
      save();
      buttons.forEach((b, j) => {
        b.disabled = true; b.classList.remove("picked");
        if (ans.has(j)) b.classList.add("correct"); else if (picked.has(j)) b.classList.add("wrong");
      });
      const prog = u.m
        ? (before ? "" : `<div class="prog get">${star(true, true)}<b>ほしを　ゲット！</b></div>`)
        : `<div class="prog">${ustar(u, true)}あと　<b>${need(u) - u.s}かい</b>　つづけて　せいかいで　ほしが　つくよ　<span>${dots(u)}</span></div>`;
      const card = isWord
        ? `<div class="card ${ok ? "" : "warn"}"><div class="cw">ことばカード「${rb(q.word)}」</div><p>${rb(q.explain)}</p></div>`
        : `<p class="explain">${rb(q.explain)}</p><details><summary>おうちの方・先生へ（${f.name}）</summary><p>${esc(q.note || "")}</p></details>`;
      go.before(el(`<div class="result"><div class="mark ${ok ? "ok" : "ng"}">${ok ? "◎ せいかい！" : "△ おしい！"}</div>${prog}${card}</div>`));
      go.textContent = S.pos + 1 < S.list.length ? "つぎへ" : "おわり";
      if (!ok && isWord) speak(q.explain);
    };
    window.scrollTo(0, 0);
  }

  function end() {
    const lv = S.lv;
    const passedNow = !S.wasDone && levelDone(lv);
    // メダル：ぜんもん せいかい＝きん、7わり いじょう＝ぎん、それより すくない＝どう
    const rate = S.score / S.list.length;
    const kind = rate === 1 ? "g" : rate >= 0.7 ? "s" : "b";
    state.badges[kind]++;
    const isl = islandOf(lv);
    const islandNow = passedNow && isl && islandDone(isl);
    save();
    const next = levelNums[levelNums.indexOf(lv) + 1];
    app.innerHTML = "";
    app.append(el(`<div class="end">
      ${passedNow ? `<div class="badge lvb" style="--il:${isl ? isl.color : "#ff7043"}">Lv${lv}</div><h2>レベル${lv}　ごうかく！</h2>` : ""}
      ${islandNow ? `<h2 class="ilmsg" style="color:${isl.color}">${isl.name}の　メダル！　ライセンスが　もらえるよ</h2>` : ""}
      <div class="badge ${kind}">${{ g: "きん", s: "ぎん", b: "どう" }[kind]}</div>
      <h2>${S.list.length}もん　ちゅう　${S.score}もん　せいかい！</h2>
      <p class="lead">${{ g: "ぜんぶ　せいかい！", s: "よく　よめて　いるね。", b: "まちがえた　ところが　つぎの　れんしゅう。" }[kind]}</p>
      ${shelf()}
      ${S.newly.length ? `<p class="lead">${S.newly.map(() => star(true, true)).join("")}<br>ほしを　${S.newly.length}こ　ゲット！</p>` : ""}
      <p class="lead">${passedNow ? (next ? `レベル${next}に　すすめるよ。` : "つぎの　レベルは　じゅんびちゅう。") : S.review ? "ぜんぶ　クリアずみ。ふくしゅう　できたね。" : "この　ちょうしで　つづけよう。"}</p>
    </div>`));
    if (passedNow && next) {
      const n = el(`<button class="allbtn">レベル${next}へ　すすむ</button>`);
      n.onclick = () => { state.lv = next; save(); home(); };
      app.append(n);
    }
    if (islandNow) { const m = el(`<button class="allbtn">ちずで　ライセンスを　みる</button>`); m.onclick = () => map(isl.id); app.append(m); }
    const b = el(`<button class="go">はじめに　もどる</button>`);
    b.onclick = home;
    app.append(b);
  }
  const shelf = () => `<div class="shelf"><span><i class="g"></i>${state.badges.g}</span><span><i class="s"></i>${state.badges.s}</span><span><i class="b"></i>${state.badges.b}</span></div>`;

  // ---------------- おうちの方・先生へ ----------------
  function records(lv) {
    app.innerHTML = "";
    const top = el(`<div class="top"><button class="back">← もどる</button><span class="tag" style="--c:#8d6e63">レベル${lv}の　きろく</span></div>`);
    top.querySelector(".back").onclick = home;
    app.append(top);
    const st = (u) => (u.m ? `<b class="okc">◎ クリア</b>` : u.n ? `${dots(u)}${u.w ? ' <span class="ngc">まちがえ あり</span>' : ""}` : '<span class="sub">まだ</span>');
    const rows = (list, label) => list.map((x) => `<tr><td>${label(x)}</td><td>${U(x.key).n}</td><td>${st(U(x.key))}</td></tr>`).join("");
    const html = [`<p class="sub">◎＝クリア　●○＝いまの連続正解／必要回数（まちがえたことがあると3回）</p>`,
      `<h3 class="sec">ことば</h3><table class="rec"><tr><th>ことば</th><th>回数</th><th>ようす</th></tr>${rows(wordUnits(lv), (x) => `${rb(notate(x.t.word, x.t.lv))}<small> Lv${x.t.lv}</small>`)}</table>`];
    FIELDS.forEach((f) => {
      const list = readUnits(lv, f.id);
      if (list.length) html.push(`<h3 class="sec">${f.name}</h3><table class="rec"><tr><th>型</th><th>回数</th><th>ようす</th></tr>${rows(list, (x) => x.t.id)}</table>`);
    });
    app.append(el(`<div>${html.join("")}</div>`));
    const rep = el(`<div><h3 class="sec">おうちへ（れんらく帳・LINE 用）</h3><textarea class="reptxt" readonly id="repTxt">${esc(reportText())}</textarea><div class="pbar"><button class="go sm" id="repCopy">コピー</button></div></div>`);
    rep.querySelector("#repCopy").onclick = (e) => navigator.clipboard?.writeText(reportText()).then(() => (e.target.textContent = "コピーしました")).catch(() => rep.querySelector("#repTxt").select());
    app.append(rep);
    const ho = CLOUD.handoverHTML();
    if (ho) {
      const box = el(`<div>${ho}</div>`);
      CLOUD.bindCopy(box);
      const sw = box.querySelector("#swKid"); if (sw) sw.onclick = () => CLOUD.switchKid();
      app.append(box);
    }
    const pr = el(`<div><h3 class="sec">いんさつ（じぶんで おいた サイトで つかえます）</h3><div class="pbar"><button class="go sm" id="prRep">おうちへの おしらせ（A4）</button><button class="go sm ghost" id="prHw">このレベルの しゅくだい</button><button class="go sm ghost" id="prHw3">しゅくだい 3まい</button></div><p class="err" id="prErr"></p></div>`);
    pr.querySelector("#prRep").onclick = () => printSheets(reportSheet(), pr);
    pr.querySelector("#prHw").onclick = () => printSheets(homeworkSheet(lv), pr);
    pr.querySelector("#prHw3").onclick = () => printSheets([homeworkSheet(lv), homeworkSheet(lv), homeworkSheet(lv)].join(""), pr);
    app.append(pr);
    const reset = el(`<button class="link">このレベルの きろくを けす</button>`);
    reset.onclick = () => ask(`レベル${lv}の きろくを けしますか？`, "けす", () => {
      [...wordUnits(lv).filter((x) => x.t.lv === lv), ...readUnits(lv)].forEach((x) => delete state.units[x.key]);
      delete state.passed[lv]; save(); records(lv);
    });
    app.append(reset);
  }


  // ---------------- しまの ちず ----------------
  // がくねんごとの しま。ぜんぶの レベルに ごうかく すると しまの メダルと ライセンス
  const ISLANDS = [
    { id: "nencho", name: "ねんちょうの　しま", lvs: [1, 2, 3, 4], color: "#ff8a65", lic: "ねんちょう　よみの　ライセンス" },
    { id: "sho1", name: "1ねんせいの　しま", lvs: [5, 6, 7, 8], color: "#4fc3f7", lic: "1ねんせい　よみの　ライセンス" },
    { id: "sho2", name: "2ねんせいの　しま", lvs: [9, 10, 11, 12], color: "#aed581", lic: "2ねんせい　よみの　ライセンス" },
    { id: "sho3", name: "3ねんせいの　しま", lvs: [13, 14, 15], color: "#9575cd", lic: "3年生　読みの　ライセンス" },
    { id: "sho4", name: "4ねんせいの　しま", lvs: [16, 17, 18], color: "#f06292", lic: "4年生　読みの　ライセンス" },
    { id: "sho5", name: "5ねんせいの　しま", lvs: [19, 20, 21], color: "#4db6ac", lic: "5年生　読みの　ライセンス" },
    { id: "sho6", name: "6ねんせいの　しま", lvs: [22, 23, 24], color: "#ffb74d", lic: "6年生　読みの　ライセンス" },
    { id: "chu", name: "ちゅうがくの　しま", lvs: [25, 26, 27, 28, 29, 30], color: "#7986cb", lic: "読解力　ライセンス" },
  ];
  const islandOf = (lv) => ISLANDS.find((i) => i.lvs.includes(lv));
  const islandReady = (isl) => isl.lvs.every((n) => levelNums.includes(n));
  const islandDone = (isl) => islandReady(isl) && isl.lvs.every((n) => state.passed[n]);
  function allStars() {
    const keys = new Set([...TERMS.map((t) => `w:${t.id}`), ...levelNums.flatMap((lv) => readUnits(lv).map((x) => x.key))]);
    return { done: [...keys].filter((k) => U(k).m).length, all: keys.size };
  }
  function map(openLic) {
    app.innerHTML = "";
    const top = el(`<div class="top"><button class="back">← もどる</button><span class="tag" style="--c:#5d4037">ちず</span></div>`);
    top.querySelector(".back").onclick = home;
    app.append(top);
    const a = allStars();
    app.append(el(`<div class="bigbar"><div class="lab"><span>あつめた　ほし</span><b>${a.done} / ${a.all}</b></div>${bar(a)}</div>`));
    const sea = el(`<div class="sea"></div>`);
    ISLANDS.forEach((isl) => {
      const ready = islandReady(isl), done = islandDone(isl);
      const sec = el(`<div class="island${done ? " done" : ""}${!isl.lvs.some((n) => levelNums.includes(n)) ? " soon" : ""}" style="--il:${isl.color}">
        <h3>${isl.name}<span class="medal${done ? "" : " off"}">${done ? "メダル" : isl.lvs.some((n) => levelNums.includes(n)) ? "まだ" : "じゅんびちゅう"}</span></h3><div class="foot"></div></div>`);
      const foot = sec.querySelector(".foot");
      isl.lvs.forEach((n) => {
        const made = levelNums.includes(n);
        const c = el(`<button class="lstep${state.passed[n] ? " done" : ""}${n === state.lv ? " cur" : ""}${!made || !isOpen(n) ? " lock" : ""}">${n}<small>${made ? (state.passed[n] ? "ごうかく" : n === state.lv ? "いま" : "") : "じゅんび"}</small></button>`);
        if (made) c.onclick = () => pickLevel(n);
        foot.append(c);
      });
      if (done) {
        const lb = el(`<button class="go sm">ライセンスを　みる</button>`);
        lb.onclick = () => license(isl, sec);
        sec.append(lb);
      }
      sea.append(sec);
      if (openLic === isl.id && done) setTimeout(() => license(isl, sec), 0);
    });
    app.append(sea);
  }
  function license(isl, sec) {
    sec.querySelector(".licbox")?.remove();
    const nm = state.name || CLOUD.nick || "";
    const box = el(`<div class="licbox"><div class="lic" style="--il:${isl.color}"><div class="seal">さいごまで<br>よめた</div><div class="t">YOMUYOMU LICENSE</div><h2>${isl.lic}</h2>
      <input id="licName" placeholder="なまえ" value="${esc(nm)}"><div class="row"><span>レベル ${isl.lvs[0]}〜${isl.lvs[isl.lvs.length - 1]} ごうかく</span><span>${today().replace(/-/g, ".")}</span></div>
      <div class="row"><span>ほし ${allStars().done} こ</span><span>ぶんを さいごまで よんで こたえられる</span></div></div>
      <div class="pbar"><button class="go sm ghost" id="licPrint">いんさつ する</button></div><p class="err" id="prErr"></p></div>`);
    box.querySelector("#licName").oninput = (e) => { state.name = e.target.value; save(); };
    box.querySelector("#licPrint").onclick = () => printSheets(`<div class="sheet center"><div class="lic print"><div class="seal">さいごまで<br>よめた</div><div class="t">YOMUYOMU LICENSE</div><h2>${isl.lic}</h2><div class="nm">${esc(state.name || nm) || "　"}</div><div class="row"><span>レベル ${isl.lvs[0]}〜${isl.lvs[isl.lvs.length - 1]} ごうかく</span><span>${today().replace(/-/g, ".")}</span></div><div class="row"><span>ほし ${allStars().done} こ</span><span>ぶんを さいごまで よんで こたえられる</span></div></div></div>`, box);
    sec.append(box);
  }

  // ---------------- いんさつ（おうちへ・しゅくだい） ----------------
  // claude.ai の ページでは いんさつ できないので、じぶんで おいた サイトで つかう
  function printSheets(html, where) {
    const area = document.getElementById("printArea") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "printArea" }));
    area.innerHTML = html;
    if (/claude|anthropic/i.test(location.hostname)) {
      const e = where && where.querySelector("#prErr");
      if (e) e.textContent = "いんさつは、じぶんで おいた サイト（GitHub Pages など）で できます。";
      return;
    }
    setTimeout(() => window.print(), 50);
  }
  function reportSheet() {
    const s = summary(), L = LEVELS.find((l) => l.lv === s.lv);
    const nm = esc(state.name || CLOUD.nick || "");
    const pill = (list) => list.map((w) => `<span class="pl">${esc(w)}</span>`).join("") || "なし";
    const mastered = TERMS.filter((t) => U(`w:${t.id}`).m).map((t) => yomi(notate(t.word, t.lv)));
    const fieldRows = FIELDS.map((f) => { const c = cnt(readUnits(s.lv, f.id)); return `<tr><th>${f.name}</th><td>${c.done} / ${c.all}</td></tr>`; }).join("");
    return `<div class="sheet"><div class="sh"><h1>よむよむ チャレンジ　おうちへの おしらせ</h1><div class="meta">なまえ<span>${nm}</span>　${today().replace(/-/g, "/")}</div></div>
      <div class="rsec"><h2>いまの ようす</h2><table><tr><th>いまの レベル</th><td>${s.lv}（${L.grade}）　ほし ${s.done} / ${s.all}</td></tr><tr><th>ごうかく した レベル</th><td>${s.passed.length ? s.passed.join("・") : "まだ"}</td></tr><tr><th>この1週間</th><td>${s.week} もん</td></tr><tr><th>メダル</th><td>きん ${state.badges.g}　ぎん ${state.badges.s}　どう ${state.badges.b}</td></tr></table></div>
      <div class="rsec"><h2>このレベルの 分野べつ（クリアした 型 / 型の数）</h2><table>${fieldRows}</table></div>
      <div class="rsec"><h2>まちがえて、まだ クリア していない ことば（いま 練習中）</h2>${pill(s.weak)}</div>
      <div class="rsec"><h2>クリアした ことば</h2>${pill(mastered)}</div>
      <div class="rsec"><h2>このアプリについて</h2>
      文の意味を正確に読み取る力（リーディングスキル）を、7つの分野（係り受け・指示語・同じ意味か・推論・図にする・定義にあてはめる）で練習します。答えは毎回変わるので、覚えて答えることはできません。2回つづけて（まちがえたら3回つづけて）正解すると星がつき、そのレベルの星がそろうと次のレベルへ進みます。<br>
      各レベルのはじめに、そのレベルで使う「ことば」（うえ・した、だけ、みんな など）を絵で確かめます。読みのつまずきの多くは、ことばの意味があいまいなことから起こります。</div>
      <div class="rsec"><h2>おうちで できる こえかけ 3つ</h2>
      ① 答えより先に「どこに かいて あった？」と聞く（文のどこを読んだかを指でさせれば合格）<br>
      ② 「かいて いない ことは わからない」でよいと伝える（推論で「わからない」を選べるのは大事な力）<br>
      ③ まちがえた問題は、もう一度声に出して読んでもらう。速さは問題にしない</div>
      <div class="pfoot">よむよむ チャレンジ</div></div>`;
  }
  function homeworkSheet(lv) {
    // まだ クリア していない 型を さきに、6もん。ことばは 2もん（おうちの人が よみあげる）
    const reads = plan(readUnits(lv), 6).list.map((x) => drawFromTemplate(x.t, lv));
    const words = plan(reqWords(lv), 2).list.map((x) => drawWord(x.t));
    const mark = ["①", "②", "③", "④", "⑤"];
    const qHTML = (q, i) => `<div class="hq"><div class="hn">${i + 1}</div><div class="hb">
      ${q.scene ? `<div class="hs">${q.scene}</div>` : ""}
      ${q.passage ? `<div class="hp">${q.passage2 ? `ア　${rb(q.passage)}<br>イ　${rb(q.passage2)}` : rb(q.passage)}</div>` : ""}
      <div class="ha">${rb(q.ask)}${q.multi ? "（あてはまる ものを ぜんぶ）" : ""}</div>
      <div class="hc">${q.choices.map((c, j) => `<span class="hcc">${mark[j]}${c.svg || ""}${c.emoji || ""}${c.svg ? "" : rb(c.text || "")}</span>`).join("")}</div></div></div>`;
    const key = (q, i, off) => `${i + 1 + off}：${q.answer.map((a) => mark[a]).join("")}`;
    return `<div class="sheet"><div class="sh"><h1>よむよむ　しゅくだい　レベル${lv}</h1><div class="meta">なまえ<span>${esc(state.name || CLOUD.nick || "")}</span></div></div>
      <div class="hint2">● ことばの もんだい（おうちの人が もんだいを よみあげてね）</div>${words.map((q, i) => qHTML(q, i)).join("")}
      <div class="hint2">● ぶんを よんで こたえよう。こたえの ばんごうに ○を つけよう。</div>${reads.map((q, i) => qHTML(q, i + words.length)).join("")}
      <div class="pfoot">おうちの人へ　こたえ　${[...words.map((q, i) => key(q, i, 0)), ...reads.map((q, i) => key(q, i, words.length))].join("　")}　／　答えより「どこに かいて あった？」を聞いてください。</div></div>`;
  }

  // ---------------- まとめ（先生画面・おうちへ） ----------------
  function summary() {
    const lv = state.lv;
    const cw = cnt(reqWords(lv)), cr = cnt(readUnits(lv));
    const weak = TERMS.filter((t) => { const u = U(`w:${t.id}`); return u.w && !u.m; }).map((t) => yomi(notate(t.word, t.lv)));
    const answers = Object.values(state.units).reduce((n, u) => n + (u.n || 0), 0);
    return { lv, passed: Object.keys(state.passed).filter((k) => state.passed[k]).map(Number).sort((a, b) => a - b), done: cw.done + cr.done, all: cw.all + cr.all, weak, answers, week: weekCount() };
  }
  function reportText() {
    const s = summary();
    const L = LEVELS.find((l) => l.lv === s.lv);
    return `【よむよむ チャレンジ ${today().replace(/-/g, "/")}】${CLOUD.nick || "お子さん"}
いまの レベル: ${s.lv}（${L.grade}）　★ ${s.done}/${s.all}
ごうかく した レベル: ${s.passed.length ? s.passed.join("・") : "まだ"}
まちがえて、まだ クリア していない ことば: ${s.weak.length ? s.weak.join("・") : "なし"}
この1週間: ${s.week}もん
※ 文を さいごまで よんで こたえる れんしゅうです。おうちでは「どこに かいて あった？」と きいて あげてください。`;
  }

  // ---------------- みんなの様子・しょうたい ----------------
  function mates() {
    app.innerHTML = "";
    const top = el(`<div class="top"><button class="back">← もどる</button><span class="tag" style="--c:#8d6e63">みんなの　ようす</span></div>`);
    top.querySelector(".back").onclick = home;
    app.append(top);
    const box = el(`<div class="matebox"></div>`);
    app.append(box);
    CLOUD.renderMates(box);
  }
  function invite() {
    app.innerHTML = "";
    const top = el(`<div class="top"><button class="back">← もどる</button><span class="tag" style="--c:#8d6e63">ともだちを　しょうたい</span></div>`);
    top.querySelector(".back").onclick = home;
    app.append(top);
    const box = el(`<div>${CLOUD.inviteHTML()}</div>`);
    CLOUD.bindCopy(box);
    app.append(box);
  }

  // オンライン版：しょうたい URL・ひきつぎ URL を みて、その子の 記録で はじめる
  CLOUD.boot((progress) => {
    if (CLOUD.online) state = Object.assign(fresh(), progress || {});
    if (!levelNums.includes(state.lv)) state.lv = 1;
    home();
    if (CLOUD.online) save(); // 先生画面・みんなの様子の ★の数を すぐ そろえる
  });
})();
