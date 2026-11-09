// オンライン管理（九九ラボと同じしくみ）
//
//   ?i=コード が その子の かぎ（1コード 1人）。はじめて ひらいた ときに ニックネームを きめる
//   2かいめからは どの たんまつで ひらいても その子の 記録で はじまる（端末には 記録しない）
//   先生画面（?teacher）        → ログイン、しょうたいコード発行、みんなの様子、ひきつぎ URL
//   Firebase が読みこめない所（claude.ai の公開版・オフライン）では、端末の中だけで動く。
//
// 九九ラボと同じ Firebase プロジェクトを使い、データは rst_ で始まる別のコレクションに置く。
// （九九ラボの users / invites / board とは混ざらない）

const CLOUD = (() => {
  const FB_CONFIG = { apiKey: "AIzaSyCwFcL6Zsizljlu-xjph0cQSWCMhjysOV4", authDomain: "kuku-lab.firebaseapp.com", projectId: "kuku-lab", storageBucket: "kuku-lab.firebasestorage.app", messagingSenderId: "921149180959", appId: "1:921149180959:web:417d63b3338df9d1f7d92a" };
  const TEACHER_EMAIL = "terauchi@em-plus.net";
  const COL = { users: "rst_users", invites: "rst_invites", board: "rst_board" };
  const APP = "よむよむ チャレンジ";
  const SITE = location.origin + location.pathname;

  let db = null, auth = null, TOKEN = null, ME = null, timer = null, onReadyCb = null;
  try { if (window.firebase) { firebase.initializeApp(FB_CONFIG); db = firebase.firestore(); auth = firebase.auth(); } } catch (e) { db = null; }
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (n, chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") => { const a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => chars[x % chars.length]).join(""); };
  const lineShare = (text) => "https://line.me/R/share?text=" + encodeURIComponent(text);
  const fmt = (t) => (t && t.seconds ? new Date(t.seconds * 1000).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "-");
  const $app = () => document.getElementById("app");
  const copy = (text, btn) => navigator.clipboard?.writeText(text).then(() => { if (btn) { const o = btn.textContent; btn.textContent = "コピーしました"; setTimeout(() => (btn.textContent = o), 1500); } }).catch(() => {});

  // ---------- URL が その子の かぎ（九九ラボと 同じ「1コード 1人」） ----------
  //   ?i=コード を ひらく → そのコードを もっている子の 記録で はじまる（どの たんまつでも おなじ）
  //   まだ だれも もっていない コードなら、ニックネームを きめて その子の ものに する
  let CUR = null; // いま ひらいている子の コード
  const kidURL = (c) => `${SITE}?i=${c}`;

  function gate(html) {
    const a = $app();
    a.innerHTML = `<div class="gate">${html}<p class="ver">版 ${APP_VER}</p></div>`;
    return a;
  }

  async function loadKid(token, code) {
    const d = await db.collection(COL.users).doc(token).get();
    if (!d.exists) return false;
    TOKEN = token; ME = d.data(); CUR = code || ME.inv;
    // URL を その子の URL に して おく（ホーム画面に 追加しても その子で ひらける）
    history.replaceState(null, "", `${location.pathname}?i=${CUR}`);
    onReadyCb(ME.progress || null);
    return true;
  }

  async function openCode(code) {
    const d = await db.collection(COL.invites).doc(code).get();
    if (!d.exists) { gate(`<h2 class="title">この URL は つかえません</h2><p>コード <b>${esc(code)}</b> が みつかりません。おくってくれた人に もういちど URL を もらってください。</p>`); return; }
    const inv = d.data();
    if (Array.isArray(inv.cands) && inv.cands.length > 1) return chooseKid(code, inv.cands);
    if (inv.uid && (await loadKid(inv.uid, code))) return;
    return register(code, inv, inv.uid || null);
  }

  // 以前の つくりで おなじ コードに 2人 いる ときだけ：どちらかを えらぶ
  function chooseKid(code, cands) {
    const a = gate(`<h2 class="title">どちらが やる？</h2><div class="kidlist">${cands.map((c, i) => `<button class="go kid" data-i="${i}">${esc(c.nick)}</button>`).join("")}</div><p class="err" id="gErr"></p>`);
    a.querySelectorAll("[data-i]").forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      if (!(await loadKid(cands[+b.dataset.i].uid, code).catch(() => false))) { a.querySelector("#gErr").textContent = "よみこめませんでした。電波を たしかめて もういちど。"; b.disabled = false; }
    }));
  }

  // 登録：さきに コードを おさえて（1コード 1人）、おさえられたら その子の 記録を つくる
  function register(code, inv, claimed) {
    const a = gate(`<h2 class="title">はじめまして</h2>
      <p>${esc(inv.nick || "先生")} さんからの しょうたいです。<br>アプリで つかう <b>ニックネーム</b> を きめてください。</p>
      <input id="nickIn" maxlength="12" placeholder="ニックネーム（12もじまで）">
      <p class="hint">すすみぐあいは オンラインに のこります。本名ではなく ニックネームを おすすめします。<br>この URL が この子の かぎに なります。つぎからは、どの たんまつでも この URL を ひらけば つづきから できます。</p>
      <button class="allbtn" id="regBtn">はじめる</button><p class="err" id="gErr"></p>`);
    const err = (m) => { a.querySelector("#gErr").textContent = m; a.querySelector("#regBtn").disabled = false; };
    a.querySelector("#regBtn").onclick = async () => {
      const nick = a.querySelector("#nickIn").value.trim();
      if (!nick) { a.querySelector("#gErr").textContent = "ニックネームを 入れてね"; return; }
      a.querySelector("#regBtn").disabled = true;
      const token = claimed || rnd(24, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), my = rnd(6);
      if (!claimed) {
        try { await db.collection(COL.invites).doc(code).update({ uid: token, usedAt: ts() }); }
        catch (e) {
          let used = false;
          try { const d = await db.collection(COL.invites).doc(code).get(); used = !!(d.exists && (d.data().uid || d.data().cands)); } catch (_) {}
          if (used) { gate(`<h2 class="title">この URL は もう つかわれています</h2><p>あたらしく はじめる 人は、しょうたい してくれた人に べつの URL を もらってください。</p>`); return; }
          return err("とうろくに しっぱいしました。電波を たしかめて もういちど。");
        }
      }
      const root = inv.by === "teacher" ? code : inv.root || code;
      try {
        await db.collection(COL.users).doc(token).set({ nick, code: my, inv: code, root, progress: null, lv: 1, passed: [], created: ts(), updated: ts() });
        await db.collection(COL.invites).doc(my).set({ by: "user", parent: code, root, nick, created: ts() }); // みんなの様子 用
      } catch (e) { claimed = token; return err("とうろくに しっぱいしました。電波を たしかめて もういちど。"); }
      TOKEN = token; ME = { nick, code: my, inv: code, root }; CUR = code;
      history.replaceState(null, "", `${location.pathname}?i=${code}`);
      onReadyCb(null);
      boardSave(null);
    };
  }

  async function boot(onReady) {
    onReadyCb = onReady;
    const q = new URLSearchParams(location.search);
    if (q.has("teacher")) return teacherScreen();
    if (!db) return onReady(null); // 端末の中だけで動く
    const code = (q.get("i") || "").toUpperCase();
    try {
      if (code) return await openCode(code);
      if (q.get("t") && (await loadKid(q.get("t")))) return; // 以前の ひきつぎ URL
    } catch (e) { gate(`<h2 class="title">よみこめませんでした</h2><p>電波を たしかめて、もういちど ひらいてください。</p>`); return; }
    gate(`<h2 class="title">${APP}</h2><p>この アプリは <b>しょうたい URL</b> から ひらきます。<br>先生や、すでに つかっている人から もらった URL を ひらいてください。</p>`);
  }

  // ---------- ほぞん ----------
  // sum = { lv, passed:[], done, all, weak:[], answers, week }
  function save(state, sum) {
    if (!db || !TOKEN) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      db.collection(COL.users).doc(TOKEN).update({ progress: state, nick: ME.nick, lv: sum.lv, passed: sum.passed, done: sum.done, all: sum.all, weak: sum.weak, answers: sum.answers, week: sum.week, updated: ts() }).catch(() => {});
      boardSave(sum);
    }, 1200);
  }
  function boardSave(sum) {
    if (!db || !ME || !ME.code) return;
    const s = sum || { lv: 1, passed: [], done: 0, all: 0 };
    db.collection(COL.board).doc(ME.code).set({ nick: ME.nick, root: ME.root || "", lv: s.lv, passed: s.passed, done: s.done, all: s.all, updated: ts() }).catch(() => {});
  }

  // ---------- みんなの様子：行＝子ども、列＝レベル ----------
  function boardHTML(users, roots, me) {
    const student = !!me, now = Date.now() / 1000;
    const L = LEVELS.map((l) => l.lv);
    const sorted = users.slice().sort((a, b) => (b.lv || 0) - (a.lv || 0) || (b.updated?.seconds || 0) - (a.updated?.seconds || 0));
    const dist = L.map((n) => sorted.filter((u) => (u.lv || 1) === n && now - (u.updated?.seconds || 0) < 14 * 86400).length);
    let h = `<div class="legend2"><span><i class="d"></i>ごうかく</span><span><i class="cur"></i>いま</span><span>うすい行＝7日いじょう やっていない</span><span>赤い数＝そのレベルに いる人数（2週間）</span>
      ${student ? "" : `<select id="bFilter"><option value="">すべての枝</option>${roots.map((r) => `<option value="${esc(r.id)}">${esc(r.label || r.id)}</option>`).join("")}</select>`}</div>
      <div class="board"><table><tr><th class="nm"></th>${L.map((n) => `<th class="n">Lv${n}</th>`).join("")}<th></th></tr>
      <tr class="dist"><td class="nm">人数</td>${dist.map((n) => `<td>${n ? `<span class="bub">${n}</span>` : ""}</td>`).join("")}<td></td></tr>`;
    sorted.forEach((u) => {
      const passed = new Set(u.passed || []), cur = u.lv || 1, idle = now - (u.updated?.seconds || 0) > 7 * 86400, isMe = student && u.id === me;
      h += `<tr class="${idle ? "idle" : ""}${isMe ? " me" : ""}" data-root="${esc(u.root || "")}"><td class="nm">${isMe ? "★ " : ""}${esc(u.nick)}</td>${L.map((n) => `<td class="c${passed.has(n) ? " d" : ""}${n === cur ? " cur" : ""}" title="${esc(u.nick)} Lv${n}${passed.has(n) ? "（ごうかく）" : ""}"></td>`).join("")}<td class="meta">★${u.done || 0}/${u.all || 0}　${fmt(u.updated)}</td></tr>`;
    });
    if (!sorted.length) h += `<tr><td class="nm">まだ だれも いません</td></tr>`;
    return h + "</table></div>";
  }
  async function renderMates(box) {
    if (!db || !ME) { box.innerHTML = '<p class="hint">みんなの様子は オンライン版（しょうたい URL から ひらいた とき）で 見られます。</p>'; return; }
    box.innerHTML = '<p class="hint">よみこみ中…</p>';
    try {
      const snap = await db.collection(COL.board).get();
      box.innerHTML = boardHTML(snap.docs.map((d) => ({ id: d.id, ...d.data() })), [], ME.code) + '<p class="hint">★ が じぶん。ニックネームと レベルだけが 見えます。</p>';
    } catch (e) { box.innerHTML = '<p class="hint">よみこめませんでした。電波を たしかめて もういちど。</p>'; }
  }

  // ---------- しょうたい（ともだちを さそう）：おすたびに あたらしい コードを 1つ つくる ----------
  function renderInvite(box) {
    if (!ME || !CUR) { box.innerHTML = '<p class="hint">しょうたいは オンライン版（しょうたい URL から ひらいた とき）で つかえます。</p>'; return; }
    box.innerHTML = `<p>ともだち 1人に 1つ、しょうたい URL を つくります。</p><button class="allbtn" id="mkInv">しょうたい URL を つくる</button><div id="invOut"></div>`;
    box.querySelector("#mkInv").onclick = async () => {
      const out = box.querySelector("#invOut");
      out.innerHTML = '<p class="hint">つくっています…</p>';
      const code = rnd(6);
      try { await db.collection(COL.invites).doc(code).set({ by: "user", kind: "issued", parent: CUR, root: ME.root || CUR, nick: ME.nick, created: ts() }); }
      catch (e) { out.innerHTML = '<p class="err">つくれませんでした。電波を たしかめて もういちど。</p>'; return; }
      const url = kidURL(code);
      const text = `${APP}（よむ ちから トレーニング）への しょうたいです。この URL を ひらいて ニックネームを きめると はじめられます。\n${url}`;
      out.innerHTML = `<h3 class="sec">しょうたい URL（${code}）</h3><div class="codebox">${esc(url)}</div><div class="pbar"><a class="go sm" href="${lineShare(text)}" target="_blank" rel="noopener">LINE で おくる</a><button class="go sm ghost" data-copy="${esc(url)}">URL を コピー</button></div><p class="hint">もう 1人 しょうたい するときは、もういちど「しょうたい URL を つくる」を おしてね。</p>`;
      bindCopy(out);
    };
  }
  // この子の URL（どの たんまつでも この URL で つづき）
  function handoverHTML() {
    if (!TOKEN || !CUR) return "";
    const url = kidURL(CUR);
    return `<h3 class="sec">この子の URL（どの たんまつでも、この URL を ひらけば つづきから。家族いがいに おくらない）</h3><div class="codebox">${esc(url)}</div>
      <div class="pbar"><a class="go sm" href="${lineShare(`${APP} ${ME.nick} さんの URL（家族いがいに おくらない）\n${url}`)}" target="_blank" rel="noopener">LINE で じぶんに おくる</a><button class="go sm ghost" data-copy="${esc(url)}">コピー</button></div>`;
  }
  function bindCopy(root) { root.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => copy(b.dataset.copy, b))); }

  // ---------- せいせきを あわせる ----------
  //   ことば・型ごと：クリアは どれかで クリアなら クリア、回答数は たす、連続正解は 大きい ほう
  function mergeProgress(list) {
    const out = { lv: 1, passed: {}, units: {}, days: {}, badges: { g: 0, s: 0, b: 0 }, name: "" };
    for (const p of list) {
      out.lv = Math.max(out.lv, p.lv || 1);
      Object.entries(p.passed || {}).forEach(([k, v]) => { if (v) out.passed[k] = true; });
      Object.entries(p.units || {}).forEach(([k, u]) => {
        const o = out.units[k] || { s: 0, w: false, m: false, n: 0 };
        out.units[k] = { s: Math.max(o.s, u.s || 0), w: o.w || !!u.w, m: o.m || !!u.m, n: o.n + (u.n || 0) };
      });
      Object.entries(p.days || {}).forEach(([d, c]) => (out.days[d] = (out.days[d] || 0) + c));
      ["g", "s", "b"].forEach((x) => (out.badges[x] += (p.badges || {})[x] || 0));
      if (!out.name && p.name) out.name = p.name;
    }
    return out;
  }

  // ---------- 先生画面 ----------
  function teacherScreen() {
    const a = gate("");
    if (!db) { a.innerHTML = '<div class="gate"><h2 class="title">先生画面</h2><p>Firebase に つながっていません。自分で置いたサイト（GitHub Pages など）で ひらいてください。</p></div>'; return; }
    const login = () => {
      a.innerHTML = `<div class="gate"><h2 class="title">先生ログイン</h2><input id="tEmail" placeholder="メール" value="${TEACHER_EMAIL}"><input id="tPw" type="password" placeholder="パスワード"><button class="allbtn" id="tLogin">ログイン</button><p class="err" id="tErr"></p></div>`;
      a.querySelector("#tLogin").onclick = () => auth.signInWithEmailAndPassword(a.querySelector("#tEmail").value, a.querySelector("#tPw").value).catch((e) => (a.querySelector("#tErr").textContent = "ログインできません: " + e.code));
    };
    auth.onAuthStateChanged((u) => (u && u.email === TEACHER_EMAIL ? dashboard() : login()));
    // せいせきを あわせて 1人に する（先生だけが できる：ほかの 記録を けす ため）
    async function mergeKids(iv, keep, others, nick) {
      const all = [keep, ...others];
      const P = mergeProgress(all.map((u) => u.progress || {}));
      const passed = [...new Set(all.flatMap((u) => u.passed || []))].sort((x, y) => x - y);
      const weak = [...new Set(all.flatMap((u) => u.weak || []))];
      const sum = (f) => all.reduce((n, u) => n + (u[f] || 0), 0), max = (f) => Math.max(...all.map((u) => u[f] || 0));
      await db.collection(COL.users).doc(keep.id).update({ nick, progress: P, lv: Math.max(1, max("lv")), passed, weak, done: max("done"), all: max("all"), answers: sum("answers"), week: sum("week"), updated: ts() });
      await db.collection(COL.invites).doc(iv.id).update({ uid: keep.id, cands: null });
      if (keep.code) {
        await db.collection(COL.invites).doc(keep.code).update({ nick }).catch(() => {});
        await db.collection(COL.board).doc(keep.code).set({ nick, root: keep.root || "", lv: Math.max(1, max("lv")), passed, done: max("done"), all: max("all"), updated: ts() }).catch(() => {});
      }
      for (const u of others) {
        await db.collection(COL.users).doc(u.id).delete();
        if (u.code) {
          await db.collection(COL.board).doc(u.code).delete().catch(() => {});
          await db.collection(COL.invites).doc(u.code).delete().catch(() => {});
        }
      }
    }
    async function dashboard() {
      a.innerHTML = '<p class="hint">よみこみ中…</p>';
      const [us, is] = await Promise.all([db.collection(COL.users).get(), db.collection(COL.invites).get()]);
      const users = us.docs.map((d) => ({ id: d.id, ...d.data() })), invites = is.docs.map((d) => ({ id: d.id, ...d.data() }));
      // おなじ URL（コード）に 何人も 登録されて しまった 子を さがす（以前の つくりや、古い プログラムが のこっていた とき）
      const claimedElsewhere = (u, code) => invites.some((j) => j.id !== code && j.uid === u.id);
      const groupOf = (iv) => {
        const ids = new Set(users.filter((u) => u.inv === iv.id && !claimedElsewhere(u, iv.id)).map((u) => u.id));
        if (iv.uid) ids.add(iv.uid);
        if (Array.isArray(iv.cands)) iv.cands.forEach((c) => ids.add(c.uid));
        return [...ids].map((id) => users.find((u) => u.id === id)).filter(Boolean);
      };
      const dups = [];
      for (const iv of invites) {
        const g = groupOf(iv);
        if (g.length > 1) dups.push({ iv, users: g });
        else if (g.length === 1 && !iv.uid) { iv.uid = g[0].id; await db.collection(COL.invites).doc(iv.id).update({ uid: iv.uid }).catch(() => {}); }
      }
      const roots = invites.filter((i) => i.by === "teacher");
      const kidsOf = (iv) => (iv.uid ? users.filter((u) => u.id === iv.uid) : Array.isArray(iv.cands) ? iv.cands.map((c) => users.find((u) => u.id === c.uid)).filter(Boolean) : []);
      const codeOf = (u) => { const iv = invites.find((i) => i.uid === u.id || (Array.isArray(i.cands) && i.cands.some((c) => c.uid === u.id))); return iv ? iv.id : u.inv; };
      // その子が しょうたいした 子：その子が つくった コード（parent）や、以前の つくりの コード（u.code）で 登録した 子
      const childrenOf = (u) => invites.filter((i) => i.id !== codeOf(u) && (i.parent === codeOf(u) || i.id === u.code)).flatMap(kidsOf).filter((x) => x.id !== u.id);
      const node = (u, seen = new Set()) => { if (seen.has(u.id)) return ""; seen.add(u.id); const url = kidURL(codeOf(u));
        return `<li><b>${esc(u.nick)}</b><span class="mt">Lv${u.lv || 1}　★${u.done || 0}/${u.all || 0}　ごうかく ${(u.passed || []).length}　${fmt(u.updated)}</span> <button class="go sm ghost" data-copy="${esc(url)}">この子の URL</button><ul class="tree">${childrenOf(u).map((c) => node(c, seen)).join("")}</ul></li>`; };
      const countKids = (u, seen = new Set()) => { if (seen.has(u.id)) return 0; seen.add(u.id); return 1 + childrenOf(u).reduce((n, c) => n + countKids(c, seen), 0); };
      const unused = roots.filter((r) => !kidsOf(r).length);
      let h = `<div class="gate"><h2 class="title">先生画面　${APP}</h2><p>登録 ${users.length} 人　<button class="go sm ghost" id="tReload">更新</button> <button class="go sm ghost" id="tOut">ログアウト</button></p>
        <h3 class="sec">みんなの様子</h3>${boardHTML(users, roots)}
        <h3 class="sec">しょうたい URL を 発行（1人に 1つ）</h3><p class="hint">URL が その子の かぎに なります。はじめて ひらいた子の ものに なり、そのあとは どの たんまつでも その子で ひらきます。メモに 子どもの なまえを 入れてください。</p>
        <div class="pbar"><input id="tLabel" placeholder="メモ（例：さくら組 たろう）"><button class="go sm" id="tNew">発行</button></div><div id="tNewOut"></div>`;
      if (dups.length) h = h.replace('<h3 class="sec">みんなの様子</h3>', `<div class="rep warn"><h3>おなじ URL に 何人も 登録されています（${dups.length}）</h3><p class="hint">おなじ 子なら、のこす ニックネームを えらんで「1人に まとめる」を おしてください。せいせき（星・ごうかく・メダル）は ぜんぶ あわせます。</p>
        ${dups.map((d, k) => `<div class="dup" data-k="${k}"><p><b>${esc(d.iv.label || d.iv.id)}</b>　<span class="mt">?i=${esc(d.iv.id)}</span></p>
          ${d.users.map((u, j) => `<label class="dupu"><input type="radio" name="dup${k}" value="${j}"${j === 0 ? " checked" : ""}> ${esc(u.nick)}<span class="mt">Lv${u.lv || 1}　★${u.done || 0}/${u.all || 0}　回答${u.answers || 0}　${fmt(u.updated)}</span></label>`).join("")}
          <label class="dupu"><input type="radio" name="dup${k}" value="new"> べつの ニックネーム：<input class="dupnick" maxlength="12" placeholder="ニックネーム"></label>
          <button class="go sm" data-merge="${k}">1人に まとめる</button><p class="err"></p></div>`).join("")}</div><h3 class="sec">みんなの様子</h3>`);
      if (unused.length) h += `<div class="rep"><h3>まだ ひらかれていない URL（${unused.length}）</h3><ul class="tree">${unused.map((r) => `<li>${esc(r.label || "（メモなし）")}<span class="mt">${fmt(r.created)}</span> <button class="go sm ghost" data-copy="${esc(kidURL(r.id))}">URL を コピー</button></li>`).join("")}</ul></div>`;
      const used = roots.filter((r) => kidsOf(r).length).sort((x, y) => (y.created?.seconds || 0) - (x.created?.seconds || 0));
      if (used.length) h += `<div class="rep"><h3>登録ずみ（しょうたいの つながり）</h3>${used.map((r) => `<p class="mt">${esc(r.label || "（メモなし）")}　${kidsOf(r).reduce((n, u) => n + countKids(u), 0)} 人</p><ul class="tree">${kidsOf(r).map((u) => node(u)).join("")}</ul>`).join("")}</div>`;
      h += `<h3 class="sec">一覧（さいごに つかった順）</h3><div class="board"><table class="rec"><tr><th>ニックネーム</th><th>レベル</th><th>★</th><th>まちがえた ことば（まだ クリア していない）</th><th>この1週間</th><th>さいご</th><th>この子の URL</th></tr>
        ${users.sort((x, y) => (y.updated?.seconds || 0) - (x.updated?.seconds || 0)).map((u) => { const url = kidURL(codeOf(u)); return `<tr><td>${esc(u.nick)}</td><td>${u.lv || 1}</td><td>${u.done || 0}/${u.all || 0}</td><td>${esc((u.weak || []).join("・")) || "-"}</td><td>${u.week || 0}もん</td><td>${fmt(u.updated)}</td><td><button class="go sm ghost" data-copy="${esc(url)}">コピー</button> <a class="go sm ghost" target="_blank" rel="noopener" href="${lineShare(`${APP} ${u.nick} さんの URL（家族いがいに おくらない）\n${url}`)}">LINE</a></td></tr>`; }).join("")}</table></div>
        <p class="hint">この子の URL は その子の かぎ です。保護者本人にだけ おくってください。</p></div>`;
      a.innerHTML = h;
      bindCopy(a);
      a.querySelector("#tReload").onclick = dashboard;
      a.querySelector("#tOut").onclick = () => auth.signOut();
      const bf = a.querySelector("#bFilter");
      if (bf) bf.onchange = () => a.querySelectorAll(".board tr[data-root]").forEach((tr) => (tr.hidden = !!bf.value && tr.dataset.root !== bf.value));
      a.querySelectorAll("[data-merge]").forEach((btn) => (btn.onclick = async () => {
        const k = +btn.dataset.merge, d = dups[k], box = btn.closest(".dup");
        const v = box.querySelector(`input[name="dup${k}"]:checked`).value;
        const nick = v === "new" ? box.querySelector(".dupnick").value.trim() : d.users[+v].nick;
        if (!nick) { box.querySelector(".err").textContent = "ニックネームを 入れてください"; return; }
        // のこす 記録：えらんだ子（べつの ニックネームの ときは いちばん 答えた 子）
        const keep = v === "new" ? d.users.slice().sort((x, y) => (y.answers || 0) - (x.answers || 0))[0] : d.users[+v];
        btn.disabled = true; btn.textContent = "まとめています…";
        try { await mergeKids(d.iv, keep, d.users.filter((u) => u.id !== keep.id), nick); dashboard(); }
        catch (e) { box.querySelector(".err").textContent = "まとめられませんでした：" + (e.code || e.message); btn.disabled = false; btn.textContent = "1人に まとめる"; }
      }));
      a.querySelector("#tNew").onclick = async () => {
        const code = rnd(6), label = a.querySelector("#tLabel").value.trim();
        await db.collection(COL.invites).doc(code).set({ by: "teacher", label, root: code, nick: "先生", created: ts() });
        a.querySelector("#tNewOut").innerHTML = `<p>発行しました（${esc(label || "メモなし")}）。</p><div class="codebox">${esc(kidURL(code))}</div><p class="hint">この URL を その子の 保護者に おくってください（LINE など）。</p>`;
        setTimeout(dashboard, 1500);
      };
    }
  }

  return {
    get online() { return !!(db && TOKEN); },
    get nick() { return ME ? ME.nick : ""; },
    boot, save, renderMates, renderInvite, handoverHTML, bindCopy,
  };
})();
