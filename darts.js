// ダーツ（ごほうび）… 九九ラボ・よむよむ 共通
//
// サーバー（Firestore の darts コレクション）に 子ども1人の「財布」を 1つ おく。
//   darts/{wid} = { balance:いま持っている本数, earned:もらった合計, paid:先生が支払った合計,
//                   claims:{ もらった記録 }, log:[ さいきんの記録 ], name:先生のメモ }
//   子どもの記録（users / rst_users）に wid を入れて つなぐ。九九とよむよむの 財布は、先生画面で 1つにまとめる。
//
// もらい方
//   ログイン          … 1日 1本（九九・よむよむ 共通）
//   銅（初めて）       … そのステージ／レベルで 1本
//   銀（初めて）       … さらに 1本 ＋ ルーレット（銀）
//   金（初めて）       … ルーレット（金＝銀の2倍）。初めての メダルが 金なら、銀ルーレットの かわりに 金ルーレット
//   ルーレット         … 12マス。銀：1本×8・2本×3・5本×1 ／ 金：その2倍
// 子どもが 自分で ふやせるのは 1回に 12本まで、もらった記録（claims）が ふえる ときだけ（ルールで 制限）。
// 支払い（へらす）は 先生だけ。

const DARTS = (() => {
  const ROULETTE = { s: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 5], g: [2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 10] };
  const COL = "darts";
  let db = null, ctx = null, wallet = null, wid = null;
  const FV = () => firebase.firestore.FieldValue;
  const today = () => new Date().toLocaleDateString("sv-SE").replace(/-/g, "");
  const rnd = (n) => { const c = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, (x) => c[x % c.length]).join(""); };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 見た目（どちらのアプリでも つかえるように ここで 入れる） ----------
  const css = `.dt-chip{display:inline-flex;align-items:center;gap:4px;font-weight:800;font-variant-numeric:tabular-nums;background:#fff3e0;border:2px solid #ffb74d;border-radius:999px;padding:2px 10px;color:#5d4037}
.dt-box{margin:12px auto;max-width:420px;background:#fffdf6;border:3px dashed #ffb74d;border-radius:16px;padding:12px 14px;text-align:center;color:#3e2f23}
.dt-box .dt-get{font-size:20px;font-weight:900;color:#e65100}.dt-box .dt-now{font-size:15px;margin-top:4px}
.dt-btn{font:inherit;font-weight:800;border:none;border-radius:999px;padding:10px 18px;background:#ff7043;color:#fff;font-size:17px;margin-top:8px;cursor:pointer;box-shadow:0 3px 0 #d84315}
.dt-btn:disabled{opacity:.5}.dt-wheel{width:230px;height:230px;margin:8px auto;position:relative}.dt-wheel svg{width:100%;height:100%;transition:transform 3.2s cubic-bezier(.12,.7,.15,1)}
.dt-ptr{position:absolute;left:50%;top:-4px;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid #d32f2f;z-index:2}
.dt-res{font-size:22px;font-weight:900;color:#d84315;min-height:1.4em}
.dt-wrap{overflow-x:auto}.dt-tab{width:100%;min-width:560px;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}.dt-tab th{white-space:nowrap}.dt-tab td,.dt-tab th{border-bottom:1px solid #e6d9bf;padding:5px 6px;text-align:left;vertical-align:middle}
.dt-tab input[type=number]{width:5em;font:inherit;padding:3px 6px}.dt-tab .dt-pay{font:inherit;padding:4px 10px;border-radius:8px;border:2px solid #ff7043;background:#fff;color:#d84315;font-weight:700;cursor:pointer}
@media (prefers-reduced-motion:reduce){.dt-wheel svg{transition:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- 財布 ----------
  // ctx = { db, col:"users"|"rst_users", token, me, app:"kuku"|"yomu" }
  async function init(c) {
    ctx = c; db = c && c.db; wallet = null; wid = null;
    if (!db || !c.token) return null;
    wid = (c.me && c.me.wid) || null;
    if (wid) {
      const d = await db.collection(COL).doc(wid).get().catch(() => null);
      if (d && d.exists) { wallet = d.data(); return wallet; }
    }
    // まだ 財布が なければ つくって つなぐ
    wid = rnd(20);
    wallet = { balance: 0, earned: 0, paid: 0, claims: {}, log: [], name: "", created: FV().serverTimestamp(), updated: FV().serverTimestamp() };
    try {
      await db.collection(COL).doc(wid).set(wallet);
      await db.collection(c.col).doc(c.token).update({ wid });
      if (c.me) c.me.wid = wid;
    } catch (e) { wallet = null; wid = null; }
    return wallet;
  }
  const balance = () => (wallet ? wallet.balance || 0 : null);
  const has = (k) => !!(wallet && wallet.claims && wallet.claims[k]);

  // もらう：claims（もらった記録）と いっしょに サーバーへ。n は 0〜12（0 は ルーレットの 権利だけ）
  async function give(n, keys, why) {
    if (!wallet || !wid || n < 0 || !keys.length) return 0;
    const up = { balance: FV().increment(n), earned: FV().increment(n), updated: FV().serverTimestamp() };
    if (n) up.log = FV().arrayUnion({ t: Date.now(), app: ctx.app, why, n });
    keys.forEach((k) => (up["claims." + k] = true));
    try { await db.collection(COL).doc(wid).update(up); }
    catch (e) { return -1; }
    wallet.balance = (wallet.balance || 0) + n; wallet.earned = (wallet.earned || 0) + n;
    wallet.claims = wallet.claims || {}; keys.forEach((k) => (wallet.claims[k] = true));
    return n;
  }

  // ログイン：1日1本（九九・よむよむ 共通）
  async function login() {
    const k = "login_" + today();
    if (!wallet || has(k)) return 0;
    return Math.max(0, await give(1, [k], "ログイン"));
  }

  // メダル：unit はステージ／レベル（例 "kuku_5"、"yomu_19"）。kind は "g" | "s" | "b"
  //   銅（初）+1、銀（初）+1 と 銀ルーレット、金（初）金ルーレット（銀と同時に初めてなら 銀ルーレットの かわり）
  async function medal(unit, kind) {
    if (!wallet) return { gained: 0, roulette: null };
    let n = 0; const keys = []; let roulette = null;
    if (!has(unit + "_b")) { n++; keys.push(unit + "_b"); }
    if ((kind === "s" || kind === "g") && !has(unit + "_s")) {
      n++; keys.push(unit + "_s");
      if (kind === "s") { keys.push(unit + "_rp_s"); roulette = "s"; }
    }
    if (kind === "g" && !has(unit + "_g")) { keys.push(unit + "_g", unit + "_rp_g"); roulette = "g"; }
    if (!keys.length) return { gained: 0, roulette: null };
    const got = await give(n, keys, `メダル（${{ g: "金", s: "銀", b: "銅" }[kind]}）`);
    return got < 0 ? { gained: 0, roulette: null } : { gained: got, roulette };
  }
  // まだ 回していない ルーレット
  function pending() {
    if (!wallet || !wallet.claims) return [];
    const out = [];
    Object.keys(wallet.claims).forEach((k) => {
      const m = k.match(/^(.*)_rp_(s|g)$/);
      if (m && !has(m[1] + "_rd_" + m[2])) out.push({ unit: m[1], tier: m[2] });
    });
    return out;
  }

  // ルーレット：回して、出た本数を もらう
  function wheelSVG(tier) {
    const vals = ROULETTE[tier], cols = ["#ffcc80", "#fff59d", "#c5e1a5", "#b3e5fc"];
    let s = "";
    vals.forEach((v, i) => {
      const a = (i * 30 - 90 - 15) * Math.PI / 180, b = ((i + 1) * 30 - 90 - 15) * Math.PI / 180;
      s += `<path d="M100,100 L${100 + 95 * Math.cos(a)},${100 + 95 * Math.sin(a)} A95,95 0 0 1 ${100 + 95 * Math.cos(b)},${100 + 95 * Math.sin(b)} Z" fill="${v >= 5 ? "#ff8a65" : cols[i % 4]}" stroke="#fff" stroke-width="2"/>`;
      const m = (i * 30 - 90) * Math.PI / 180;
      s += `<text x="${100 + 66 * Math.cos(m)}" y="${100 + 66 * Math.sin(m)}" font-size="${v >= 5 ? 22 : 18}" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#4e342e">${v}</text>`;
    });
    return `<svg viewBox="0 0 200 200">${s}<circle cx="100" cy="100" r="14" fill="#fff" stroke="#bcaaa4" stroke-width="3"/></svg>`;
  }
  function roulette(box, p, onDone) {
    const vals = ROULETTE[p.tier];
    box.innerHTML = `<div class="dt-box"><div class="dt-get">${p.tier === "g" ? "金" : "銀"}ルーレット チャンス！</div><div class="dt-wheel"><div class="dt-ptr"></div>${wheelSVG(p.tier)}</div><div class="dt-res"></div><button class="dt-btn">まわす</button></div>`;
    const btn = box.querySelector(".dt-btn"), svgEl = box.querySelector(".dt-wheel svg"), res = box.querySelector(".dt-res");
    btn.onclick = async () => {
      btn.disabled = true;
      const i = Math.floor(Math.random() * 12), n = vals[i];
      svgEl.style.transform = `rotate(${360 * 5 - i * 30}deg)`;
      await new Promise((r) => setTimeout(r, window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 3300));
      const got = await give(n, [p.unit + "_rd_" + p.tier], `ルーレット（${p.tier === "g" ? "金" : "銀"}）`);
      res.textContent = got > 0 ? `${n}本 ゲット！` : "つながりませんでした。あとで もういちど";
      btn.textContent = "OK"; btn.disabled = false;
      btn.onclick = () => onDone && onDone(got);
      box.querySelector(".dt-box").insertAdjacentHTML("beforeend", `<div class="dt-now">いま 🎯 <b>${balance()}</b>本</div>`);
    };
  }

  // 演習の おわりに：メダルの 下に もらった本数と いまの本数、ルーレット
  async function resultBox(box, unit, kind) {
    if (!wallet) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="dt-box">…</div>';
    const r = await medal(unit, kind);
    const show = () => {
      const pend = pending();
      box.innerHTML = `<div class="dt-box">${r.gained ? `<div class="dt-get">🎯 ダーツ ＋${r.gained}本！</div>` : ""}<div class="dt-now">いま もっている ダーツ 🎯 <b>${balance()}</b>本</div>${pend.length ? `<button class="dt-btn">ルーレットに チャレンジ（${pend.length}）</button>` : ""}</div>`;
      const b = box.querySelector(".dt-btn");
      if (b) b.onclick = () => roulette(box, pend[0], show);
    };
    show();
  }
  // ホーム用：いまの本数と、のこっている ルーレット
  function chipHTML() { return wallet ? `<span class="dt-chip">🎯 ${balance()}本</span>` : ""; }
  function homeBox(box, onChange) {
    if (!wallet) { box.innerHTML = ""; return; }
    const pend = pending();
    if (!pend.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="dt-box"><div>ルーレットが のこってるよ！</div><button class="dt-btn">まわす</button></div>`;
    box.querySelector(".dt-btn").onclick = () => roulette(box, pend[0], () => { homeBox(box, onChange); onChange && onChange(); });
  }

  // ---------- 先生画面：財布の 一覧・支払い・まとめる ----------
  async function teacherPanel(box, tdb) {
    box.innerHTML = '<p>ダーツを よみこみ中…</p>';
    const [ws, ku, yo] = await Promise.all([
      tdb.collection(COL).get(),
      tdb.collection("users").get().catch(() => ({ docs: [] })),
      tdb.collection("rst_users").get().catch(() => ({ docs: [] })),
    ]);
    const wallets = ws.docs.map((d) => ({ id: d.id, ...d.data() }));
    const kids = [...ku.docs.map((d) => ({ id: d.id, app: "九九", col: "users", ...d.data() })), ...yo.docs.map((d) => ({ id: d.id, app: "よむよむ", col: "rst_users", ...d.data() }))];
    const kidsOf = (w) => kids.filter((k) => k.wid === w.id);
    const rows = wallets.filter((w) => kidsOf(w).length || w.balance).sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const sum = rows.reduce((n, w) => n + (w.balance || 0), 0);
    box.innerHTML = `<h3>ダーツ（九九・よむよむ 共通）　<span style="font-weight:400;font-size:.85em">支払っていない本数の合計 ${sum}本</span></h3>
      <p style="font-size:.85em;color:#8d7b6a">同じ子の 九九と よむよむの 財布は、2つに チェックを入れて「1つにまとめる」。支払いの欄は、はじめは 全部の本数です。</p>
      <div class="dt-wrap"><table class="dt-tab"><tr><th></th><th>子ども（アプリ）</th><th>メモ</th><th>いま</th><th>もらった</th><th>支払った</th><th>支払い</th></tr>
      ${rows.map((w) => `<tr data-w="${esc(w.id)}"><td><input type="checkbox" class="dt-sel"></td><td>${kidsOf(w).map((k) => `${esc(k.nick)}<small>（${k.app}）</small>`).join("<br>") || "<small>つながっていない</small>"}</td>
        <td><input class="dt-name" value="${esc(w.name || "")}" placeholder="本名など" style="width:7em"></td><td><b>${w.balance || 0}</b></td><td>${w.earned || 0}</td><td>${w.paid || 0}</td>
        <td><input type="number" min="0" max="${w.balance || 0}" value="${w.balance || 0}" class="dt-n"> <button class="dt-pay"${w.balance ? "" : " disabled"}>支払う</button></td></tr>`).join("") || '<tr><td colspan="7">まだ ありません</td></tr>'}</table></div>
      <button class="dt-btn" id="dtMerge" style="font-size:14px">チェックした 財布を 1つにまとめる</button><p class="dt-msg" style="color:#d84315"></p>`;
    const msg = (t) => (box.querySelector(".dt-msg").textContent = t);
    box.querySelectorAll("tr[data-w]").forEach((tr) => {
      const id = tr.dataset.w, w = wallets.find((x) => x.id === id);
      tr.querySelector(".dt-pay").onclick = async () => {
        const n = Math.floor(+tr.querySelector(".dt-n").value);
        if (!(n > 0 && n <= (w.balance || 0))) { msg("支払う本数を 1〜いまの本数で 入れてください"); return; }
        await tdb.collection(COL).doc(id).update({ balance: FV().increment(-n), paid: FV().increment(n), updated: FV().serverTimestamp(), log: FV().arrayUnion({ t: Date.now(), app: "先生", why: "支払い", n: -n }) });
        teacherPanel(box, tdb);
      };
      tr.querySelector(".dt-name").onchange = (e) => tdb.collection(COL).doc(id).update({ name: e.target.value.trim() });
    });
    box.querySelector("#dtMerge").onclick = async () => {
      const ids = [...box.querySelectorAll(".dt-sel:checked")].map((c) => c.closest("tr").dataset.w);
      if (ids.length < 2) { msg("まとめる 財布を 2つ以上 えらんでください"); return; }
      const ws2 = ids.map((id) => wallets.find((w) => w.id === id));
      const keep = ws2[0], others = ws2.slice(1);
      const claims = Object.assign({}, ...ws2.map((w) => w.claims || {}));
      const tot = (f) => ws2.reduce((n, w) => n + (w[f] || 0), 0);
      await tdb.collection(COL).doc(keep.id).update({ balance: tot("balance"), earned: tot("earned"), paid: tot("paid"), claims, name: ws2.map((w) => w.name).find(Boolean) || "", updated: FV().serverTimestamp() });
      for (const w of others) {
        for (const k of kidsOf(w)) await tdb.collection(k.col).doc(k.id).update({ wid: keep.id });
        await tdb.collection(COL).doc(w.id).delete();
      }
      teacherPanel(box, tdb);
    };
  }

  return { init, login, medal, resultBox, homeBox, chipHTML, balance, pending, teacherPanel, ROULETTE };
})();
window.DARTS = DARTS;
