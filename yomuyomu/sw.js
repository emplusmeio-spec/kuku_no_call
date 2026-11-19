// ホーム画面アプリ用。キャッシュは しない（いつも 新しい プログラムを よむ）。
// 電波が ない ときだけ、画面を ひらこうと したら「オフラインです」を 出す。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:40px;background:#fff8ee;color:#3e2f23"><h2>オフラインです</h2><p>電波の ある ところで もういちど ひらいてね。</p><button onclick="location.reload()" style="font-size:18px;padding:10px 20px">もういちど</button></body>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
