/* 📊 29v «جاهزيتك» + 🎚️ adaptive difficulty (Abdullah approved, Nov 6 2026).
   1) READINESS %: ONE number per مادة, 0–100 — the very same NursinMid.readiness(s).r the 🎯 «خطة امتحان 16» plan uses (assets/midterm.js:
      his 🧠 lesson memory NursinRet.score (fades with time, so an overdue spaced review lowers it) + mock results + lessons opened +
      mistakes of the last 14 days + overdue lessons). Shown:
        • on each subject page under the title: «📊 جاهزيتك: 62%» + a thin bar + «أضعف درس: …» (link to that lesson)
        • on midterm.html: a compact row of chips «⚖️ 62%» per مادة (not on home).
      Colour: < 50 red · 50–79 amber · ≥ 80 green.
   2) ADAPTIVE DIFFICULTY: every question gets a level 1 🟢 سهل / 2 🟡 وسط / 3 🔴 صعب (no field in the banks → derived: a patient case or a long
      stem, or a question he missed ≥ 2 times = صعب; a short recall stem = سهل; the rest = وسط). In the subject quizzes / 🔁 spaced review
      (assets/quiz.js) and the 🚌 ride review (assets/commute.js): after 2 right in a row the next question is one level harder, after a
      wrong one it is easier (or the same level) from the same lesson. Only the order of the questions still to come changes.
   Local only: no network, no Firestore. ES5 for iOS 12. No ads here. */
(function (w, d) {
  "use strict";
  var V = "20261030r";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function page() { try { return (w.location.pathname || "").split("/").pop() || "index.html"; } catch (e) { return "index.html"; } }
  function NL() { return w.NLESSONS || {}; }
  var styled = false;

  /* ---------------- 📊 readiness ---------------- */
  function pct(s) { var M = w.NursinMid; if (!M || !M.readiness) return null; try { var r = M.readiness(s); return r ? { p: Math.max(0, Math.min(100, Math.round(+r.r || 0))), weakL: r.weakL || "" } : null; } catch (e) { return null; } }
  function col(p) { return p < 50 ? "red" : p < 80 ? "amb" : "grn"; }
  function subjOfPage(p) { var S = NL().subjects || {}; p = p || page(); for (var k in S) if (S[k] && S[k].page === p) return k; return null; }
  function lessonOf(id) { var L = NL().list || []; for (var i = 0; i < L.length; i++) if (L[i].s + ":" + (L[i].l || L[i].t) === id) return L[i]; return null; }
  function headHtml(s) {
    var r = pct(s); if (!r) return "";
    var h = '<div class="rdy rdy-' + col(r.p) + '" data-rdy="' + esc(s) + '"><p class="rdyt">📊 ' + T("جاهزيتك:", "Ta préparation (جاهزيتك) :") + ' <b dir="ltr">' + r.p + '%</b></p>' +
      '<div class="rdyb"><i style="width:' + r.p + '%"></i></div>';
    var l = lessonOf(r.weakL);
    if (l) h += '<p class="rdyw">' + T("أضعف درس:", "Leçon la plus faible (أضعف درس) :") + ' <a href="' + esc(l.href || "#") + '">' + esc(l.n) + " ←</a></p>";
    return h + "</div>";
  }
  function emo(s) { var M = w.NursinMid, E = (M && M.EMO) || {}, x = (NL().subjects || {})[s] || {}; return E[s] || x.e || "📘"; }
  function chipsHtml(list) {
    var M = w.NursinMid; list = list || (M && M.subjects ? M.subjects() : []); var h = "";
    list.forEach(function (s) { var r = pct(s); if (!r) return; var x = (NL().subjects || {})[s] || {};
      h += '<a class="rdc rdy-' + col(r.p) + '" data-rdy="' + esc(s) + '" href="' + esc(x.page || "#") + '">' + emo(s) + " " + esc(M && M.subjName ? M.subjName(s) : (x.ar || s)) + ' <b dir="ltr">' + r.p + "%</b></a>"; });
    return h ? '<div class="rdcs" aria-label="' + esc(T("جاهزيتك بكل مادة", "Ta préparation par matière (جاهزيتك)")) + '"><p class="rdct">📊 ' + T("جاهزيتك بكل مادة", "Ta préparation par matière (جاهزيتك بكل مادة)") + "</p>" + h + "</div>" : "";
  }

  /* ---------------- 🎚️ difficulty ---------------- */
  var CASE = /([0-9\u0660-\u0669]+\s*(سنة|سنين|ans?\b))|مريض|مريضة|\bpatient|حالة|عالطوارئ|إجا ع|اجا ع/i;
  var lv = {};
  function stem(q) { return String((q && q.q) || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
  function missOf(id, o) { var it = o && o.weak; if (!it) { try { it = ((JSON.parse(localStorage.getItem("nursin_weak_v1") || "null") || {}).items) || {}; } catch (e) { it = {}; } } var e = it[id]; return e ? (e.miss | 0) : 0; }
  function level(q, o) {                                     // → 1 easy · 2 medium · 3 hard
    if (!q) return 2; if (q.lvl === 1 || q.lvl === 2 || q.lvl === 3) return q.lvl;
    var base = lv[q.id]; if (!base || (o && o.fresh)) { var t = stem(q); base = CASE.test(t) || t.length > 110 ? 3 : t.length < 45 ? 1 : 2; if (q.id) lv[q.id] = base; }
    return missOf(q.id, o) >= 2 ? 3 : base;
  }
  var NAME = { 1: ["🟢 سهل", "🟢 Facile (سهل)"], 2: ["🟡 وسط", "🟡 Moyen (وسط)"], 3: ["🔴 صعب", "🔴 Difficile (صعب)"] };
  function badge(q) { var l = level(q); style(); return '<span class="adl adl' + l + '" data-adl="' + l + '">' + T(NAME[l][0], NAME[l][1]) + "</span>"; }
  /* st = {run} per quiz. step() → the target for the NEXT question: {lvl, t (same lesson topic after a wrong one), why} */
  function step(st, q, ok) {
    var l = level(q); st.run = ok ? (st.run | 0) + 1 : 0;
    if (!ok) return (st.want = { lvl: Math.max(1, l - 1), t: q.t, why: "down" });
    if (st.run >= 2) { st.run = 0; return (st.want = { lvl: Math.min(3, l + 1), why: "up" }); }
    return (st.want = { lvl: l, why: "same" });
  }
  function cost(c, tg) {
    var l = level(c), dl = l - tg.lvl;
    if (tg.why === "down") return (dl > 0 ? 10 * dl : -dl) + (tg.t && c.t !== tg.t ? 3 : 0);   // easier or same, same lesson first
    if (tg.why === "up") return dl < 0 ? -10 * dl : dl;                                           // harder, never easier when there is a choice
    return Math.abs(dl);
  }
  /* reorder(arr, from, to, get, tg): brings the best next question of arr[from..to) to arr[from]; the others keep their order */
  function reorder(arr, from, to, get, tg) {
    if (!arr || !tg || from >= arr.length - 1) return arr; to = Math.min(to == null ? arr.length : to, arr.length);
    var bi = -1, bc = 1e9;
    for (var i = from; i < to; i++) { var c = get ? get(arr[i]) : arr[i]; if (!c) continue; var k = cost(c, tg); if (k < bc) { bc = k; bi = i; } }
    if (bi > from) { var x = arr.splice(bi, 1)[0]; arr.splice(from, 0, x); }
    return arr;
  }

  function style() {
    if (styled || !d || !d.createElement) return; styled = true;
    var c = ".rdy{margin:6px 0 10px;padding:7px 11px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-size:.93em;line-height:1.45}" +
      ".rdyt{margin:0}.rdyt b{font-size:1.1em}.rdyb{height:5px;border-radius:9px;background:#e5e7eb;overflow:hidden;margin:4px 0}.rdyb i{display:block;height:100%;border-radius:9px}" +
      ".rdyw{margin:0;font-size:.92em}.rdyw a{text-decoration:none}" +
      ".rdy-red .rdyb i{background:#ef4444}.rdy-amb .rdyb i{background:#f59e0b}.rdy-grn .rdyb i{background:#22c55e}" +
      ".rdy-red .rdyt b,.rdc.rdy-red b{color:#dc2626}.rdy-amb .rdyt b,.rdc.rdy-amb b{color:#d97706}.rdy-grn .rdyt b,.rdc.rdy-grn b{color:#16a34a}" +
      ".rdcs{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 10px}.rdct{width:100%;margin:0;font-weight:600;font-size:.95em}" +
      ".rdc{padding:3px 9px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;color:inherit;text-decoration:none;font-size:.86em;white-space:nowrap}" +
      ".rdc.rdy-red{border-color:#fca5a5}.rdc.rdy-amb{border-color:#fcd34d}.rdc.rdy-grn{border-color:#86efac}" +
      ".adl{display:inline-block;margin-inline-start:6px;padding:0 7px;border-radius:999px;font-size:.78em;font-weight:600;background:#f1f5f9;vertical-align:middle}" +
      ".mmlk{display:inline-block;margin:2px 0 8px;padding:6px 13px;border-radius:999px;border:1px solid #99f6e4;background:#f0fdfa;color:#0f766e;font-weight:700;text-decoration:none;font-size:.92em}html[data-theme=night] .mmlk{background:#13302c;border-color:#1f5f56;color:#5eead4}" +
      "html[data-theme=night] .rdy,html[data-theme=night] .rdc{background:#1b232b;border-color:#3a4a58}html[data-theme=night] .adl{background:#26313b}html[data-theme=night] .rdyb{background:#33404c}";
    var s = d.createElement("style"); s.id = "rdycss"; s.textContent = c; (d.head || d.documentElement).appendChild(s);
  }
  function mountAll() {
    if (!d || !d.querySelector) return;
    var s = subjOfPage(), h1 = d.querySelector("main h1");
    if (s && h1 && !d.querySelector(".rdy")) { var h = headHtml(s); if (h) { style(); h1.insertAdjacentHTML("afterend", h); } }
    // 🗺️ «الخرائط الذهنية» entry in the subject header (Nov 6 2026, assets/mindmap.js) — Med-Surg's page opens the whole list
    if (s && h1 && !d.querySelector(".mmlk")) { style(); h1.insertAdjacentHTML("afterend", '<a class="mmlk" href="mindmap.html' + (s === "medsurg" ? "" : "#s=" + esc(s)) + '">🗺️ ' + T("الخرائط الذهنية", "Cartes mentales (الخرائط الذهنية)") + " ←</a>"); }
    var app = d.getElementById("mid-app");
    if (app && !d.querySelector(".rdcs")) { var c = chipsHtml(); if (c) { style(); app.insertAdjacentHTML("beforebegin", c); } }
  }
  function refresh() { if (!d || !d.querySelectorAll) return; [].forEach.call(d.querySelectorAll(".rdy,.rdcs"), function (e) { e.parentNode.removeChild(e); }); mountAll(); }

  w.NursinReady = { V: V, pct: pct, col: col, subjOfPage: subjOfPage, headHtml: headHtml, chipsHtml: chipsHtml, mount: mountAll, refresh: refresh };
  w.NursinAD = { level: level, badge: badge, step: step, cost: cost, reorder: reorder, NAME: NAME };
  if (!d || !d.addEventListener) return;
  d.addEventListener("nursin:mid", function () { if (d.querySelector(".rdcs")) refresh(); });
  if (d.readyState === "complete") setTimeout(mountAll, 0); else d.addEventListener("DOMContentLoaded", mountAll);   // after every deferred script (midterm.js, hifz.js)
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
