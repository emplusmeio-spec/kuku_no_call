// オンライン管理（九九ラボと同じしくみ）
//
//   しょうたい URL（?i=コード） → ニックネーム登録 → この端末に記録
//   ひきつぎ URL（?t=トークン） → べつの端末で つづき
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
  const LS_KIDS = "rst-kids-kids", LS_TOKEN = "rst-kids-token";
  const SITE = location.origin + location.pathname;

  let db = null, auth = null, TOKEN = null, ME = null, timer = null, onReadyCb = null;
  try { if (window.firebase) { firebase.initializeApp(FB_CONFIG); db = firebase.firestore(); auth = firebase.auth(); } } catch (e) { db = null; }
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (n, chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") => { const a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => chars[x % chars.length]).join(""); };
  const inviteURL = (code) => `${SITE}?i=${code}`;
  const handoverURL = () => `${SITE}?t=${TOKEN}`;
  const lineShare = (text) => "https://line.me/R/share?text=" + encodeURIComponent(text);
  const fmt = (t) => (t && t.seconds ? new Date(t.seconds * 1000).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "-");
  const $app = () => document.getElementById("app");
  const copy = (text, btn) => navigator.clipboard?.writeText(text).then(() => { if (btn) { const o = btn.textContent; btn.textContent = "コピーしました"; setTimeout(() => (btn.textContent = o), 1500); } }).catch(() => {});

  // ---------- この端末で つかっている子（きょうだいで 1台を つかえる） ----------
  const kidsGet = () => { try { return JSON.parse(localStorage.getItem(LS_KIDS) || "[]"); } catch (e) { return []; } };
  const kidsPut = (k) => { try { localStorage.setItem(LS_KIDS, JSON.stringify(k)); } catch (e) {} };
  const kidsAdd = (t, nick) => kidsPut([...kidsGet().filter((x) => x.t !== t), { t, nick }]);

  function gate(html) {
    const a = $app();
    a.innerHTML = `<div class="gate">${html}</div>`;
    return a;
  }

  async function openKid(t) {
    try {
      const d = await db.collection(COL.users).doc(t).get();
      if (!d.exists) return false;
      TOKEN = t; ME = d.data();
      try { localStorage.setItem(LS_TOKEN, t); } catch (e) {}
      kidsAdd(t, ME.nick);
      history.replaceState(null, "", location.pathname);
      onReadyCb(ME.progress || null);
      return true;
    } catch (e) { return false; }
  }

  function pickKid(code) {
    const kids = kidsGet();
    const a = gate(`<h2 class="title">${code ? "しょうたい URL を ひらきました" : "だれが やる？"}</h2>
      ${code ? `<p>この たんまつには もう つかっている子が います。</p><button class="allbtn" id="newKid">あたらしい子として はじめる</button><p class="lead">つづきを する子は こちら</p>` : ""}
      <div class="kidlist">${kids.map((k, i) => `<button class="go kid" data-i="${i}">${esc(k.nick || "（なまえ よみこみ中）")}</button>`).join("")}</div>
      ${code ? "" : '<p class="hint">あたらしい子を ふやすときは、しょうたい URL を ひらいてください。</p>'}<p class="err" id="gErr"></p>`);
    a.querySelectorAll("[data-i]").forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      if (!(await openKid(kids[+b.dataset.i].t))) { a.querySelector("#gErr").textContent = "よみこめませんでした。電波を たしかめて もういちど。"; b.disabled = false; }
    }));
    const nb = a.querySelector("#newKid"); if (nb) nb.onclick = () => register(code);
  }

  async function register(code) {
    let inv = null;
    try { const d = await db.collection(COL.invites).doc(code).get(); if (d.exists) inv = d.data(); } catch (e) {}
    if (!inv) { gate(`<h2 class="title">しょうたい URL が ちがいます</h2><p>コード <b>${esc(code)}</b> は みつかりません。おくってくれた人に もういちど URL を もらってください。</p>`); return; }
    const a = gate(`<h2 class="title">はじめまして</h2>
      <p>${esc(inv.nick || "先生")} さんからの しょうたいです。<br>アプリで つかう <b>ニックネーム</b> を きめてください。</p>
      <input id="nickIn" maxlength="12" placeholder="ニックネーム（12もじまで）">
      <p class="hint">すすみぐあいは オンラインに のこります。本名ではなく ニックネームを おすすめします。<br>べつの たんまつで つづきを するときは、ここで 登録せず「おうちの方・先生へ」の「ひきつぎ URL」を ひらいてください。</p>
      <button class="allbtn" id="regBtn">はじめる</button><p class="err" id="gErr"></p>`);
    a.querySelector("#regBtn").onclick = async () => {
      const nick = a.querySelector("#nickIn").value.trim();
      if (!nick) { a.querySelector("#gErr").textContent = "ニックネームを 入れてね"; return; }
      a.querySelector("#regBtn").disabled = true;
      const token = rnd(24, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), my = rnd(6);
      const root = inv.by === "teacher" ? code : inv.root || code;
      try {
        await db.collection(COL.users).doc(token).set({ nick, code: my, inv: code, root, progress: null, lv: 1, passed: [], created: ts(), updated: ts() });
        await db.collection(COL.invites).doc(my).set({ by: "user", parent: code, root, nick, created: ts() });
      } catch (e) {
        a.querySelector("#gErr").textContent = "とうろくに しっぱいしました。電波を たしかめて もういちど。";
        a.querySelector("#regBtn").disabled = false; return;
      }
      TOKEN = token; ME = { nick, code: my, inv: code, root };
      try { localStorage.setItem(LS_TOKEN, token); } catch (e) {}
      kidsAdd(token, nick);
      history.replaceState(null, "", location.pathname);
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
    if (q.get("t") && (await openKid(q.get("t")))) return;
    const kids = kidsGet();
    if (kids.some((k) => !k.nick)) {
      await Promise.all(kids.filter((k) => !k.nick).map((k) => db.collection(COL.users).doc(k.t).get().then((d) => { if (d.exists) k.nick = d.data().nick; }).catch(() => {})));
      kidsPut(kids.filter((k) => k.nick));
    }
    const K = kidsGet();
    if (code && K.length) return pickKid(code);
    if (code) return register(code);
    if (K.length === 1 && (await openKid(K[0].t))) return;
    if (K.length > 1) return pickKid("");
    gate(`<h2 class="title">${APP}</h2><p>この アプリは <b>しょうたい URL</b> から ひらきます。<br>先生や、すでに つかっている人から もらった URL を ひらいてください。</p><p>べつの たんまつで つづきを する人は、「おうちの方・先生へ」の「ひきつぎ URL」を ひらいてください。</p>`);
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

  // ---------- しょうたい（ともだちを さそう） ----------
  function inviteHTML() {
    if (!ME) return '<p class="hint">しょうたいは オンライン版（しょうたい URL から ひらいた とき）で つかえます。</p>';
    const url = inviteURL(ME.code);
    const text = `${APP}（よむ ちから トレーニング）への しょうたいです。この URL から ひらいて ニックネームを きめると はじめられます。\n${url}`;
    return `<div class="codebox">${esc(url)}</div><div class="pbar"><a class="go sm" href="${lineShare(text)}" target="_blank" rel="noopener">LINE で おくる</a><button class="go sm ghost" data-copy="${esc(url)}">URL を コピー</button></div><p class="hint">しょうたいされた人も、また べつの人を しょうたい できます。</p>`;
  }
  function handoverHTML() {
    if (!TOKEN) return "";
    const url = handoverURL();
    return `<h3 class="sec">ひきつぎ URL（べつの たんまつで つづきを するとき。家族いがいに おくらない）</h3><div class="codebox">${esc(url)}</div>
      <div class="pbar"><a class="go sm" href="${lineShare(`${APP} ひきつぎURL（家族いがいに おくらない）\n${url}`)}" target="_blank" rel="noopener">LINE で じぶんに おくる</a><button class="go sm ghost" data-copy="${esc(url)}">コピー</button></div>
      ${kidsGet().length > 1 ? '<button class="go sm ghost" id="swKid">べつの子に こうたい</button>' : ""}`;
  }
  function bindCopy(root) { root.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => copy(b.dataset.copy, b))); }

  // ---------- 先生画面 ----------
  function teacherScreen() {
    const a = gate("");
    if (!db) { a.innerHTML = '<div class="gate"><h2 class="title">先生画面</h2><p>Firebase に つながっていません。自分で置いたサイト（GitHub Pages など）で ひらいてください。</p></div>'; return; }
    const login = () => {
      a.innerHTML = `<div class="gate"><h2 class="title">先生ログイン</h2><input id="tEmail" placeholder="メール" value="${TEACHER_EMAIL}"><input id="tPw" type="password" placeholder="パスワード"><button class="allbtn" id="tLogin">ログイン</button><p class="err" id="tErr"></p></div>`;
      a.querySelector("#tLogin").onclick = () => auth.signInWithEmailAndPassword(a.querySelector("#tEmail").value, a.querySelector("#tPw").value).catch((e) => (a.querySelector("#tErr").textContent = "ログインできません: " + e.code));
    };
    auth.onAuthStateChanged((u) => (u && u.email === TEACHER_EMAIL ? dashboard() : login()));
    async function dashboard() {
      a.innerHTML = '<p class="hint">よみこみ中…</p>';
      const [us, is] = await Promise.all([db.collection(COL.users).get(), db.collection(COL.invites).get()]);
      const users = us.docs.map((d) => ({ id: d.id, ...d.data() })), invites = is.docs.map((d) => ({ id: d.id, ...d.data() }));
      const roots = invites.filter((i) => i.by === "teacher");
      const byInv = (c) => users.filter((u) => u.inv === c).sort((x, y) => (y.updated?.seconds || 0) - (x.updated?.seconds || 0));
      const node = (u) => `<li><b>${esc(u.nick)}</b><span class="mt">Lv${u.lv || 1}　★${u.done || 0}/${u.all || 0}　ごうかく ${(u.passed || []).length}　${fmt(u.updated)}</span><ul class="tree">${byInv(u.code).map(node).join("")}</ul></li>`;
      const countBranch = (c) => byInv(c).reduce((n, u) => n + 1 + countBranch(u.code), 0);
      let h = `<div class="gate"><h2 class="title">先生画面　${APP}</h2><p>登録 ${users.length} 人 ／ 枝 ${roots.length} 本　<button class="go sm ghost" id="tReload">更新</button> <button class="go sm ghost" id="tOut">ログアウト</button></p>
        <h3 class="sec">みんなの様子</h3>${boardHTML(users, roots)}
        <h3 class="sec">あたらしい しょうたいコードを 発行</h3><div class="pbar"><input id="tLabel" placeholder="メモ（例：年長 さくら組）"><button class="go sm" id="tNew">発行</button></div><div id="tNewOut"></div>`;
      roots.sort((x, y) => (y.created?.seconds || 0) - (x.created?.seconds || 0)).forEach((r) => {
        h += `<div class="rep"><h3>${esc(r.label || "（メモなし）")}　<span class="mt">コード ${esc(r.id)}　${countBranch(r.id)} 人　${fmt(r.created)}</span></h3><div class="codebox">${esc(inviteURL(r.id))}</div><ul class="tree">${byInv(r.id).map(node).join("") || '<li class="mt">まだ だれも</li>'}</ul></div>`;
      });
      const orphan = users.filter((u) => !invites.some((i) => i.id === u.inv));
      if (orphan.length) h += `<div class="rep"><h3>しょうたい元が 不明</h3><ul class="tree">${orphan.map(node).join("")}</ul></div>`;
      h += `<h3 class="sec">一覧（さいごに つかった順）</h3><div class="board"><table class="rec"><tr><th>ニックネーム</th><th>レベル</th><th>★</th><th>まちがえた ことば（まだ クリア していない）</th><th>この1週間</th><th>さいご</th><th>ひきつぎ URL</th></tr>
        ${users.sort((x, y) => (y.updated?.seconds || 0) - (x.updated?.seconds || 0)).map((u) => `<tr><td>${esc(u.nick)}</td><td>${u.lv || 1}</td><td>${u.done || 0}/${u.all || 0}</td><td>${esc((u.weak || []).join("・")) || "-"}</td><td>${u.week || 0}もん</td><td>${fmt(u.updated)}</td><td><button class="go sm ghost" data-copy="${esc(SITE + "?t=" + u.id)}">コピー</button> <a class="go sm ghost" target="_blank" rel="noopener" href="${lineShare(`${APP} ${u.nick} さんの ひきつぎURL（家族いがいに おくらない）\n${SITE}?t=${u.id}`)}">LINE</a></td></tr>`).join("")}</table></div>
        <p class="hint">ひきつぎ URL は その子の かぎ です。保護者本人にだけ おくってください。</p></div>`;
      a.innerHTML = h;
      bindCopy(a);
      a.querySelector("#tReload").onclick = dashboard;
      a.querySelector("#tOut").onclick = () => auth.signOut();
      const bf = a.querySelector("#bFilter");
      if (bf) bf.onchange = () => a.querySelectorAll(".board tr[data-root]").forEach((tr) => (tr.hidden = !!bf.value && tr.dataset.root !== bf.value));
      a.querySelector("#tNew").onclick = async () => {
        const code = rnd(6), label = a.querySelector("#tLabel").value.trim();
        await db.collection(COL.invites).doc(code).set({ by: "teacher", label, root: code, nick: "先生", created: ts() });
        a.querySelector("#tNewOut").innerHTML = `<p>発行しました。</p><div class="codebox">${esc(inviteURL(code))}</div><p class="hint">この URL を 保護者に おくってください（LINE など）。</p>`;
        setTimeout(dashboard, 1500);
      };
    }
  }

  return {
    get online() { return !!(db && TOKEN); },
    get nick() { return ME ? ME.nick : ""; },
    boot, save, renderMates, inviteHTML, handoverHTML, bindCopy,
    switchKid: () => pickKid(""),
  };
})();
