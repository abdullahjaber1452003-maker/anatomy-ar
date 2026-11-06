/* 📅 «راجعو قبل ما تنساه» — a review date for every lesson (Abdullah, Nov 6 2026 10:57–11:01 PM: «جعل الموقع اذكى بمتابعة الدروس» →
   «يقلّك كل كم يوم لازم تراجع كل درس قبل ما تنساه»). Built on the 🧠 lesson memory already kept (assets/hifz.js NursinRet, nursin_ret_v1):
     every lesson he has opened / quizzed gets {lv, due, last} in nursin_rsch_v1 (this device only, no Firestore):
       intervals 1 · 3 · 7 · 14 · 30 · 60 days (I[lv]); the first study → due tomorrow;
       a REVIEW = on/after the due day, the lesson opened that day + (2 quiz answers on it, or ✍️ «اشرحلي بكلامك») →
         score ≥ 80 → 2 steps further · 50–79 → 1 step · < 50 → 1 step closer (min 1 day); then the next date is set.
     lessons met before this build: their date comes once from the memory curve (half-life h → the interval at or under it, from the last event).
   Shown: a chip on each lesson header «📅 راجعو بعد 3 أيام» / «⚠️ لازم تراجعو اليوم» / «🔴 متأخر يومين»; on each subject page
   «📅 لازم تراجع اليوم: …» (max 5 links); on hifzi.html#due the whole list; on the home ONE step of «🧭 مسار اليوم» (assets/home.js
   «📅 راجع N دروس قبل ما تنساهم» → hifzi.html#due). Pure parts are exported for the tests. ES5 for iOS 12. */
(function (w, d) {
  "use strict";
  var K = "nursin_rsch_v1", DAY = 864e5, I = [1, 3, 7, 14, 30, 60];
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dayOf(ts) {
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts)).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    return new Date(ts + 2 * 36e5).toISOString().slice(0, 10);
  }
  function today() { var N = w.Nursin; try { if (N && N.dayKey) return N.dayKey(); } catch (e) {} return dayOf(Date.now()); }
  function addDays(day, n) { return new Date(Date.parse(day + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10); }
  function diff(a, b) { return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / DAY); }

  /* ---------------- pure ---------------- */
  // the next date after a review (rec = null → first study); score 0–100 or null (no score = a plain step)
  function next(rec, score, day) {
    var lv;
    if (!rec) lv = 0;
    else if (score == null || (score >= 50 && score < 80)) lv = (rec.lv | 0) + 1;
    else if (score >= 80) lv = (rec.lv | 0) + 2;
    else lv = Math.max(0, (rec.lv | 0) - 1);
    lv = Math.min(I.length - 1, lv);
    var gap = I[lv];
    if (rec && score != null && score < 50) gap = Math.min(gap, Math.max(1, ivl(rec) - 1));   // a bad one always pulls closer
    return { lv: lv, due: addDays(day, gap), last: day, n: (rec ? rec.n | 0 : 0) + 1, sc: score == null ? null : Math.round(score) };
  }
  function ivl(rec) { return rec && rec.last && rec.due ? Math.max(1, diff(rec.due, rec.last)) : I[rec ? rec.lv | 0 : 0]; }
  // the memory curve → a first date (lessons met before this build)
  function fromRet(r) {
    if (!r || !r.t) return null; var h = +r.h || 2, lv = 0;
    for (var i = 0; i < I.length; i++) if (I[i] <= h) lv = i;
    var last = dayOf(r.t); return { lv: lv, due: addDays(last, I[lv]), last: last, n: r.n | 0, sc: null, bf: 1 };
  }
  // {k:'later'|'today'|'late', n: days}
  function stateOf(rec, day) { if (!rec || !rec.due) return null; var n = diff(rec.due, day); return { k: n > 0 ? "later" : n === 0 ? "today" : "late", n: Math.abs(n) }; }
  function daysAr(n) { return n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم"; }
  function chipText(rec, day) {
    var s = stateOf(rec, day); if (!s) return "";
    if (s.k === "today") return T("⚠️ لازم تراجعو اليوم", "⚠️ À réviser aujourd'hui (لازم تراجعو اليوم)");
    if (s.k === "late") return T("🔴 متأخر " + daysAr(s.n), "🔴 En retard de " + s.n + " j (متأخر " + daysAr(s.n) + ")");
    return s.n === 1 ? T("📅 راجعو بكرا", "📅 À réviser demain (راجعو بكرا)") : T("📅 راجعو بعد " + daysAr(s.n), "📅 À réviser dans " + s.n + " j (راجعو بعد " + daysAr(s.n) + ")");
  }
  // one day of activity on a lesson → maybe a review: x = {o: opened, q: [ok, n], x: explain score|null}
  function judge(rec, x, day) {
    x = x || {}; var q = x.q || [0, 0], hasX = x.x != null, touched = !!(x.o || q[1] || hasX);
    if (!rec) return touched ? next(null, null, day) : null;
    if (rec.last === day || rec.due > day) return null;                    // already counted today / not due yet
    if (!x.o || !(q[1] >= 2 || hasX)) return null;                          // a review = opened + (2 answers or ✍️)
    var sc = q[1] >= 2 ? (100 * q[0]) / q[1] : null;
    if (hasX) sc = sc == null ? +x.x : (sc + (+x.x)) / 2;
    return next(rec, sc, day);
  }
  // due lessons (due ≤ day), most overdue first; L = [{id, n, href, s}]
  function dueList(S, L, day) {
    var out = []; (L || []).forEach(function (l) { var r = S[l.id]; if (r && r.due && r.due <= day) out.push({ id: l.id, n: l.n, href: l.href, s: l.s, late: diff(day, r.due) }); });
    return out.sort(function (a, b) { return b.late - a.late || (a.id < b.id ? -1 : 1); });
  }

  /* ---------------- store ---------------- */
  function lessons() { return ((w.NLESSONS && w.NLESSONS.list) || []).map(function (l) { return { id: l.s + ":" + (l.l || l.t), n: l.n, href: l.href, s: l.s }; }); }
  function known(id) { var L = (w.NLESSONS && w.NLESSONS.list) || []; for (var i = 0; i < L.length; i++) if (L[i].s + ":" + (L[i].l || L[i].t) === id) return true; return false; }
  function load() { var x = lsGet(K); if (!x || typeof x !== "object" || !x.L) x = { v: 1, L: {}, a: { d: "", m: {} } }; if (!x.a || typeof x.a !== "object") x.a = { d: "", m: {} }; return x; }
  function backfill(x) {
    var ret = lsGet("nursin_ret_v1"), ch = false; if (!ret || !ret.L) return false;
    Object.keys(ret.L).forEach(function (id) { if (!x.L[id] && known(id)) { var r = fromRet(ret.L[id]); if (r) { x.L[id] = r; ch = true; } } });
    return ch;
  }
  function sched() { var x = load(), ch = backfill(x); if (!x.bf || ch) { x.bf = 1; lsSet(K, x); } return x.L; }   // a lesson the memory met since → a date too
  var tPaint = 0;
  function touch(id, kind, val) {
    if (!id || !known(id)) return null;
    var x = load(), day = today(); if (!x.bf) { backfill(x); x.bf = 1; }
    if (x.a.d !== day) x.a = { d: day, m: {} };
    var a = x.a.m[id] || (x.a.m[id] = { o: 0, q: [0, 0], x: null });
    if (kind === "open") a.o = 1;
    else if (kind === "ans") { a.q[1]++; if (val) a.q[0]++; }
    else if (kind === "x") a.x = Math.max(a.x == null ? 0 : a.x, +val || 0);
    var r = judge(x.L[id], a, day); if (r) x.L[id] = r;
    lsSet(K, x); clearTimeout(tPaint); tPaint = setTimeout(paint, 80);
    return x.L[id] || null;
  }
  function rec(id) { return sched()[id] || null; }
  function due(day) { return dueList(sched(), lessons(), day || today()); }
  function dueCount() { return due().length; }

  /* ---------------- events (the same ones the lesson memory listens to) ---------------- */
  function ofQid(qid) { var R = w.NursinRet, q = null; (w.QUIZ || []).concat(w.LINKQ || []).some(function (y) { if (y && y.id === qid) { q = y; return true; } return false; }); if (!q) return []; if (q.ls) return q.ls.slice(); var id = R && R.ofQ ? R.ofQ(q) : null; return id ? [id] : []; }
  if (d && d.addEventListener) {
    d.addEventListener("nursin:answer", function (e) { var x = e.detail || {}; if (x.qid) ofQid(x.qid).forEach(function (id) { touch(id, "ans", !!x.ok); }); });
    d.addEventListener("nursin:flash", function (e) { var x = e.detail || {}; if (x.id) touch(String(x.id).split("#")[0], "ans", !!x.ok); });
    d.addEventListener("nursin:lesson-read", function (e) { var x = e.detail || {}; if (x.k) touch(String(x.k).split("#")[0], "open"); });
    d.addEventListener("nursin:explain", function (e) { var x = e.detail || {}; if (x.lid) touch(String(x.lid).split("#")[0], "x", x.score); });
    d.addEventListener("toggle", function (e) { var el = e.target; if (el && el.tagName === "DETAILS" && el.open) { var l = lessonOfEl(el); if (l) touch(l.id, "open"); } }, true);
  }
  // answers recorded straight on the memory (🔁 سؤال شبيه, 📝 كويز هالجزء, 🚌) count too
  (function wrap() {
    var R = w.NursinRet; if (!R || !R.apply || R.apply.rv) return;
    var f = R.apply, g = function (id, kind) { var out = f.apply(R, arguments); try { if (kind === "ok" || kind === "bad") touch(id, "ans", kind === "ok"); else if (kind === "read") touch(id, "open"); } catch (e) {} return out; };
    g.rv = 1; R.apply = g;
  })();

  /* ---------------- on the page ---------------- */
  function page() { try { return (w.location.pathname || "").split("/").pop() || "index.html"; } catch (e) { return "index.html"; } }
  function pageLessons() { var p = page(); return lessons().filter(function (l) { return l.href.split("#")[0] === p; }); }
  function lessonOfEl(el) { var id = el && el.id; if (!id) return null; var L = pageLessons(); for (var i = 0; i < L.length; i++) { var a = L[i].href.split("#")[1]; if (a && (id === a || id.indexOf(a + "-p") === 0)) return L[i]; } return null; }
  function chipHtml(r, day) { var s = stateOf(r, day); if (!s) return ""; return '<span class="rvchip rv-' + s.k + '">' + esc(chipText(r, day)) + "</span>"; }
  function listHtml(xs, max) {
    if (!xs.length) return "";
    var sh = xs.slice(0, max || xs.length);
    return '<div class="rvdue" id="rvdue"><b>' + esc(T("📅 لازم تراجع اليوم:", "📅 À réviser aujourd'hui (لازم تراجع اليوم) :")) + "</b> " +
      sh.map(function (l) { return '<a href="' + esc(l.href) + '">' + esc(l.n) + (l.late ? ' <small>🔴 ' + esc(T(daysAr(l.late), l.late + " j")) + "</small>" : "") + "</a>"; }).join(" · ") +
      (xs.length > sh.length ? ' <a class="small" href="hifzi.html#due">+' + (xs.length - sh.length) + "</a>" : "") + "</div>";
  }
  function style() {
    if (!d || d.getElementById("rvcss")) return;
    var s = d.createElement("style"); s.id = "rvcss";
    s.textContent = ".rvchip{display:inline-block;margin-inline-start:6px;padding:1px 7px;border-radius:999px;font-size:11.5px;font-weight:600;line-height:1.6;vertical-align:middle;white-space:nowrap;background:rgba(15,118,110,.1);color:#0f766e}" +
      ".rvchip.rv-today{background:rgba(217,119,6,.14);color:#b45309}.rvchip.rv-late{background:rgba(220,38,38,.12);color:#b91c1c}" +
      ".rvdue{margin:8px 0;padding:8px 12px;border-radius:12px;border:1px solid rgba(217,119,6,.35);background:rgba(217,119,6,.07);font-size:14px;line-height:1.8}" +
      ".rvdue a{text-decoration:underline}.rvall{list-style:none;padding:0;margin:8px 0}.rvall li{padding:6px 0;border-bottom:1px solid rgba(127,127,127,.18)}";
    (d.head || d.body).appendChild(s);
  }
  function paint() {
    if (!d || !d.querySelector) return;
    var day = today(), S = sched(), PL = pageLessons(), p = page();
    if (PL.length) {
      style();
      PL.forEach(function (l) {
        var a = l.href.split("#")[1], el = a ? d.getElementById(a) : null, host = el ? (el.querySelector("summary .t b") || el.querySelector("summary b") || el.querySelector("summary") || el.querySelector("h2,h3")) : null;
        if (!host) return; var old = host.querySelector(".rvchip"); if (old) old.parentNode.removeChild(old);
        var h = chipHtml(S[l.id], day); if (h) host.insertAdjacentHTML("beforeend", h);
      });
      var xs = dueList(S, PL, day), box = d.getElementById("rvdue"); if (box) box.parentNode.removeChild(box);
      var at = d.querySelector("main .rdy") || d.querySelector("main h1");
      if (xs.length && at) at.insertAdjacentHTML("afterend", listHtml(xs, 5));
    }
    var all = d.getElementById("due");
    if (all && p === "hifzi.html") {
      style(); var ys = dueList(S, lessons(), day), SUB = (w.NLESSONS && w.NLESSONS.subjects) || {};
      all.innerHTML = "<h2>" + esc(T("📅 لازم تراجع اليوم قبل ما تنسى", "📅 À réviser aujourd'hui, avant d'oublier (قبل ما تنسى)")) + "</h2>" +
        (ys.length ? '<ul class="rvall">' + ys.map(function (l) { var sj = SUB[l.s]; return '<li><a href="' + esc(l.href) + '">' + esc(l.n) + "</a> " + chipHtml(S[l.id], day) + (sj ? ' <small>' + esc(T(sj.ar, sj.fr)) + "</small>" : "") + "</li>"; }).join("") + "</ul>" +
          '<p class="small">' + esc(T("افتح الدرس وجاوب سؤالين عليه (أو ✍️ اشرحلي بكلامك) وبيتسجّل موعد المراجعة الجاية.", "Ouvre la leçon et réponds à 2 questions (ou ✍️ explique-la) : la prochaine date se fixe toute seule.")) + "</p>"
          : '<p class="small">' + esc(T("👌 ما في ولا درس لازم تراجعو اليوم.", "👌 Aucune leçon à réviser aujourd'hui (ما في درس لازم تراجعو).")) + "</p>");
    }
  }
  function boot() { sched(); paint(); setTimeout(paint, 700); }
  if (d && d.addEventListener) {
    d.addEventListener("nursin:ret", function () { clearTimeout(tPaint); tPaint = setTimeout(paint, 120); });
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
  }
  w.NursinRev = { key: K, I: I, next: next, fromRet: fromRet, stateOf: stateOf, chipText: chipText, judge: judge, dueList: dueList, ivl: ivl,
    touch: touch, rec: rec, due: due, dueCount: dueCount, sched: sched, listHtml: listHtml, chipHtml: chipHtml, paint: paint };
})(window, window.document);
