// がんばりグラフ と つまずき（子ども・おうちの方・先生画面で 共通）
//
//   進み具合 p（state / progress）に 次を 記録する
//     p.hist[日付] = その日 いちばん 進んだ 位置（レベル − 1 ＋ そのレベルで あつめた 星の わりあい）
//                   例：レベル3で 星が 半分 → 2.5、レベル3 ごうかく → 3
//     p.units[key].x = まちがえた 回数（つまずき）
//     p.days[日付]  = その日に こたえた 数（もとから ある）

const INS = (() => {
  const today = () => new Date().toLocaleDateString("sv-SE");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const yomi = (s) => String(s).replace(/\{([^|}]+)\|([^}]+)\}/g, "$2");
  const U = (p, k) => (p.units || {})[k] || { s: 0, w: false, m: false, n: 0 };
  const wrongs = (u) => (u.x != null ? u.x : u.w ? 1 : 0); // 記録を はじめる 前の 分は「まちがえた ことが ある」＝1回
  const made = () => LEVELS.map((l) => l.lv);

  // ---------- いまの 位置 ----------
  function pos(p) {
    const lv = p.lv || 1;
    if ((p.passed || {})[lv]) return lv;
    const words = termsAt(lv).filter((t) => t.lv === lv || !U(p, `w:${t.id}`).m).map((t) => `w:${t.id}`);
    const reads = templatesAt(lv).map((t) => unitKey(lv, t));
    const all = [...words, ...reads];
    const done = all.filter((k) => U(p, k).m).length;
    return lv - 1 + (all.length ? done / all.length : 0);
  }
  // きょうの 位置を のこす（その日 いちばん 進んだ ところ）
  function stamp(p) {
    p.hist = p.hist || {};
    const v = Math.round(pos(p) * 100) / 100, d = today();
    if (!(p.hist[d] >= v)) p.hist[d] = v;
  }

  // ---------- がんばりグラフ（よこ＝ひづけ、たて＝レベル、下の ぼう＝こたえた 数） ----------
  function chart(p, opt = {}) {
    const hist = p.hist || {}, days = p.days || {};
    const all = [...new Set([...Object.keys(hist), ...Object.keys(days), today()])].sort();
    const DAYS = opt.days || 42;
    const start = new Date(all[0]), end = new Date(today());
    let list = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) list.push(d.toLocaleDateString("sv-SE"));
    if (list.length > DAYS) list = list.slice(-DAYS);
    if (list.length < 7) { const f = new Date(list[0]); while (list.length < 7) { f.setDate(f.getDate() - 1); list.unshift(f.toLocaleDateString("sv-SE")); } }
    const W = 480, H = 270, L = 44, R = 10, T = 12, B = 30, BAR = 46;
    const plotH = H - T - B - BAR - 10;
    const vals = list.map((d) => hist[d]).filter((v) => v != null);
    const top = Math.max(1, Math.ceil(Math.max(0, ...vals) + 0.25));
    const x = (i) => L + ((W - L - R) * (i + 0.5)) / list.length;
    const y = (v) => T + plotH - (plotH * v) / top;
    let s = "";
    // レベルの おび
    for (let k = 0; k < top; k++) {
      s += `<rect x="${L}" y="${y(k + 1)}" width="${W - L - R}" height="${plotH / top}" fill="${k % 2 ? "#fff8e1" : "#fffdf6"}"/>`;
      s += `<line x1="${L}" x2="${W - R}" y1="${y(k)}" y2="${y(k)}" stroke="#e6d9bf"/>`;
      s += `<text x="${L - 6}" y="${y(k + 0.5)}" font-size="13" text-anchor="end" dominant-baseline="central" fill="#8d7b6a">Lv${k + 1}</text>`;
    }
    // こたえた 数の ぼう
    const maxA = Math.max(1, ...list.map((d) => days[d] || 0));
    const bw = Math.max(3, ((W - L - R) / list.length) * 0.6), by = H - B;
    list.forEach((d, i) => { const c = days[d] || 0; if (c) s += `<rect x="${x(i) - bw / 2}" y="${by - (BAR * c) / maxA}" width="${bw}" height="${(BAR * c) / maxA}" rx="2" fill="#90caf9"/>`; });
    s += `<text x="${L - 6}" y="${by - BAR / 2}" font-size="11" text-anchor="end" dominant-baseline="central" fill="#5c8fbf">こたえた<tspan x="${L - 6}" dy="13">かず</tspan></text>`;
    // 進み具合の 線（あいだの 日は まえの 位置の まま）
    let last = null, path = "";
    const pts = [];
    list.forEach((d, i) => { if (hist[d] != null) last = hist[d]; if (last != null) { path += `${path ? "L" : "M"}${x(i).toFixed(1)},${y(last).toFixed(1)}`; if (hist[d] != null) pts.push([i, hist[d]]); } });
    if (path) s += `<path d="${path}" fill="none" stroke="#ff7043" stroke-width="3" stroke-linejoin="round"/>`;
    pts.forEach(([i, v]) => (s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#ff7043"><title>${list[i]}　Lv${Math.floor(v) + 1 > top ? top : Math.min(Math.floor(v) + 1, top)}（${Math.round((v % 1) * 100)}%）</title></circle>`));
    // ひづけ
    const step = Math.ceil(list.length / 7);
    list.forEach((d, i) => { if (i % step === 0 || i === list.length - 1) s += `<text x="${x(i)}" y="${H - 12}" font-size="12" text-anchor="middle" fill="#8d7b6a">${+d.slice(5, 7)}/${+d.slice(8)}</text>`; });
    const empty = !vals.length ? `<text x="${(W + L) / 2}" y="${T + plotH / 2}" font-size="15" text-anchor="middle" fill="#8d7b6a">きょうから きろく します</text>` : "";
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="がんばりグラフ">${s}${empty}</svg>`;
  }

  // ---------- つまずき ----------
  const labelCache = new Map();
  function label(key) {
    if (labelCache.has(key)) return labelCache.get(key);
    let out;
    if (key.startsWith("w:")) {
      const t = TERMS.find((x) => x.id === key.slice(2));
      out = { field: "ことば", name: t ? `ことば「${yomi(notate(t.word, t.lv))}」` : key, note: t ? yomi(notate(t.card, t.lv)) : "" };
    } else {
      const [lv, f, id] = key.split(":");
      const t = TPL.find((x) => x.field === f && x.id === id);
      const fd = FIELDS.find((x) => x.id === f);
      let note = "";
      try { note = t ? drawFromTemplate(t, +lv).note || "" : ""; } catch (e) {}
      out = { field: fd ? fd.name : f, name: `Lv${lv} ${fd ? fd.name : f}`, note };
    }
    labelCache.set(key, out);
    return out;
  }
  // まちがいが 多い 順（同じなら まちがいの わりあいが 高い 順）
  function stumbles(p, limit = 8) {
    return Object.entries(p.units || {}).map(([k, u]) => ({ key: k, x: wrongs(u), n: u.n || 0, m: !!u.m }))
      .filter((r) => r.x > 0).sort((a, b) => b.x - a.x || b.x / b.n - a.x / a.n).slice(0, limit)
      .map((r) => ({ ...r, ...label(r.key) }));
  }
  // 分野べつの まちがいの わりあい
  function fieldStats(p) {
    const rows = [{ id: "w", name: "ことば" }, ...FIELDS.map((f) => ({ id: f.id, name: f.name }))].map((f) => ({ ...f, x: 0, n: 0 }));
    Object.entries(p.units || {}).forEach(([k, u]) => {
      const id = k.startsWith("w:") ? "w" : k.split(":")[1];
      const r = rows.find((z) => z.id === id);
      if (r) { r.x += wrongs(u); r.n += u.n || 0; }
    });
    return rows.filter((r) => r.n > 0);
  }
  function stumbleHTML(p) {
    const fs = fieldStats(p), st = stumbles(p);
    if (!fs.length) return '<p class="hint">まだ こたえた きろくが ありません。</p>';
    const bars = fs.map((r) => { const pc = Math.round((100 * r.x) / r.n); return `<div class="fbar"><span class="fn">${esc(r.name)}</span><span class="ft"><i style="width:${Math.min(100, pc)}%"></i></span><span class="fv">${pc}%<small>（${r.x}/${r.n}）</small></span></div>`; }).join("");
    const list = st.length ? `<table class="rec stum"><tr><th>ところ</th><th class="nw">まちがい</th><th class="nw">いま</th></tr>${st.map((r) => `<tr><td><b>${esc(r.name)}</b>${r.note ? `<br><small>${esc(r.note)}</small>` : ""}</td><td class="nw">${r.x}／${r.n}</td><td>${r.m ? '<b class="okc">クリア</b>' : '<span class="ngc">れんしゅう</span>'}</td></tr>`).join("")}</table>` : '<p class="hint">まちがいは まだ ありません。</p>';
    return `<p class="sub">分野べつ　まちがいの わりあい（まちがい／こたえた かず）</p>${bars}<p class="sub" style="margin-top:10px">まちがいが 多い ところ（まちがい／こたえた かず）</p>${list}`;
  }
  // クラス全体（先生画面）：おなじ ところで つまずいた 子の かず
  function classStumbles(progressList, limit = 10) {
    const agg = new Map();
    progressList.forEach((p) => Object.entries((p && p.units) || {}).forEach(([k, u]) => {
      const x = wrongs(u); if (!x) return;
      const a = agg.get(k) || { key: k, kids: 0, x: 0, n: 0 };
      a.kids++; a.x += x; a.n += u.n || 0; agg.set(k, a);
    }));
    return [...agg.values()].sort((a, b) => b.kids - a.kids || b.x - a.x).slice(0, limit).map((r) => ({ ...r, ...label(r.key) }));
  }

  return { pos, stamp, chart, stumbles, fieldStats, stumbleHTML, classStumbles, wrongs, made };
})();
