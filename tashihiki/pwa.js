// ホーム画面アプリ（PWA）と おうちの方の確認 … 九九ラボ・よむよむ 共通
//
// ・manifest.webmanifest に start_url を 書かない。ホーム画面に 追加した ときの URL（?i=その子の コード）で ひらく
//   （iPhone・iPad も Android も、start_url が ない ときは 追加した ページの URL を つかう）
// ・sw.js は キャッシュしない（古い プログラムが のこらない）。電波が ない ときだけ「オフラインです」を 出す
// ・PWA.gate(fn) … 子どもが 外の サイト（LINE・ブログなど）へ 行けないように、2けたの たし算で 確かめてから fn を よぶ
// ・PWA.guideHTML(name) … ホーム画面に 追加する 手順と、端末の 設定（アクセスガイド・アプリ固定・見られる サイトを 決める）

const PWA = (() => {
  let deferred = null; // Android Chrome の「インストール」
  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; document.querySelectorAll(".pwa-install").forEach((b) => (b.hidden = false)); });

  const css = `.pwa-modal{position:fixed;inset:0;background:rgba(40,30,20,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:60}
.pwa-box{background:#fffdf6;border-radius:18px;padding:18px;max-width:340px;width:100%;font-size:17px;line-height:1.7;color:#3e2f23;text-align:center}
.pwa-box input{font:inherit;font-size:24px;width:6em;text-align:center;padding:6px;border:2px solid #bcaaa4;border-radius:10px;margin:6px 0}
.pwa-box .pwa-btns{display:flex;gap:10px;margin-top:8px}.pwa-box button{flex:1;font:inherit;font-weight:800;border:none;border-radius:12px;padding:10px;cursor:pointer}
.pwa-ok{background:#ff7043;color:#fff}.pwa-no{background:#cfd8dc;color:#37474f}.pwa-err{color:#d84315;min-height:1.4em;font-size:14px}
.pwa-guide{text-align:left;font-size:14px;line-height:1.75}.pwa-guide h4{margin:12px 0 4px}.pwa-guide ol{margin:4px 0 4px 1.2em;padding:0}
.pwa-install{font:inherit;font-weight:800;border:none;border-radius:12px;padding:8px 14px;background:#43a047;color:#fff;cursor:pointer}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // おうちの方の確認（子どもが 外へ 出る ボタンを 押せないように）
  function gate(onOk) {
    const a = 21 + Math.floor(Math.random() * 59), b = 13 + Math.floor(Math.random() * 37);
    const m = document.createElement("div");
    m.className = "pwa-modal";
    m.innerHTML = `<div class="pwa-box"><b>おうちの方へ</b><br>${a}＋${b}＝？<br><input type="number" inputmode="numeric" autocomplete="off"><div class="pwa-err"></div><div class="pwa-btns"><button class="pwa-no">やめる</button><button class="pwa-ok">ひらく</button></div></div>`;
    document.body.appendChild(m);
    const inp = m.querySelector("input");
    const ok = () => { if (+inp.value === a + b) { m.remove(); onOk(); } else { m.querySelector(".pwa-err").textContent = "ちがいます"; inp.value = ""; } };
    m.querySelector(".pwa-ok").onclick = ok;
    inp.onkeydown = (e) => { if (e.key === "Enter") ok(); };
    m.querySelector(".pwa-no").onclick = () => m.remove();
    setTimeout(() => inp.focus(), 50);
  }

  // ホーム画面に 追加する 手順と、端末の 設定
  function guideHTML(name, site) {
    const host = (site || location.host || "emplusmeio-spec.github.io").replace(/^https?:\/\//, "").split("/")[0];
    return `<div class="pwa-guide">
      <h4>ホーム画面に「${name}」を 追加する（この子の 画面で）</h4>
      ${standalone() ? "<p>いま ホーム画面アプリとして ひらいています。</p>" : ""}
      <p><button class="pwa-install" hidden>ホーム画面に 追加（Android）</button></p>
      <ol><li><b>iPhone・iPad</b>：Safari で この画面を ひらき、共有ボタン（□に↑）→「ホーム画面に追加」</li>
      <li><b>Android</b>：Chrome で この画面を ひらき、右上の ︙ →「アプリを インストール」（または「ホーム画面に追加」）</li></ol>
      <p>ホーム画面の アイコンから ひらくと、アドレスバーの ない 画面に なり、この子の 記録で はじまります。きょうだいは それぞれの URL で 追加してください。</p>
      <h4>ほかの アプリ・サイトに 行けないように（おすすめ）</h4>
      <ol><li><b>この画面から 出られなくする</b>：iPhone・iPad は「設定 → アクセシビリティ → アクセスガイド」を オンにし、アプリを ひらいて サイドボタン（ホームボタン）を 3回 おす。Android は「設定 → セキュリティ → アプリ固定」を オンにして、アプリを 固定する。</li>
      <li><b>見られる サイトを 決める</b>：iPhone・iPad は「設定 → スクリーンタイム → コンテンツとプライバシーの制限 → App Store とメディア → Webコンテンツ」で「許可された Web サイトのみ」にし、<code>${host}</code> を 追加。Android は「ファミリーリンク」で Chrome を「承認済みの サイトのみ」に する。</li></ol>
      <p style="font-size:12px;color:#8d7b6a">メニューの 名前は 機種や OS の 版で 少し ちがう ことが あります。</p></div>`;
  }
  // guideHTML を 入れた あとに よぶ（Android の インストール ボタンを 動かす）
  function bind(root) {
    (root || document).querySelectorAll(".pwa-install").forEach((b) => {
      b.hidden = !deferred;
      b.onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; b.hidden = true; };
    });
  }
  return { gate, guideHTML, bind, standalone };
})();
window.PWA = PWA;
