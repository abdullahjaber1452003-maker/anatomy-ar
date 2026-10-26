/* ✅ أهدافك اليوم (Abdullah, Oct 26 2026 12:36 PM: "a button at the top side with the goals you have to finish: your weak points,
   today's exams, your class's exams…"). A small pill in the header's top corner on every page (never over the content or the ads).
   Signed in: tap → a sheet with today's goals, built only from data the site already has (no new backend):
     🎯 كويز نقاط ضعفك      — when Weak.count() > 0; done when a weak-points quiz is finished today
     📅 امتحان اليوم: …      — each weekly exam scheduled today (Nursin.examsFor); done when taken (examResults, or finished here today)
     🏫 امتحان صفّك: …        — each class the student is in (classes.js tutorSummary); done when this week's class exam is submitted
     ❓ سؤال اليوم            — when they're in a class; done when answered today
     📝 كويز ١٠ أسئلة         — only when nothing else is on the list
   Each row has a ✅ when done and goes straight to it. Badge "2/4". Done-state per Beirut day in localStorage (nursin_goals_v1).
   Signed out: the pill shows 🔒 and the sheet only offers Google sign-in (assets/gate.js state). */
(function (w, d) {
  var K = "nursin_goals_v1", LK = "nursin_goals_live_v1", LIVE_MS = 10 * 60e3;
  function N() { return w.Nursin || {}; }
  function today() { var n = N(); return n.dayKey ? n.dayKey() : new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, ss) { try { return JSON.parse((ss ? sessionStorage : localStorage).getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v, ss) { try { (ss ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }
  function state() { var o = lsGet(K), dk = today(); if (!o || o.d !== dk || typeof o.done !== "object" || !o.done) o = { d: dk, done: {} }; return o; }
  function mark(k) { var o = state(); if (o.done[k]) return; o.done[k] = Date.now(); lsSet(K, o); refresh(); }
  function weakCount() {
    if (w.Weak && w.Weak.count) return w.Weak.count();
    var x = lsGet("nursin_weak_v1"); return x && x.items ? Object.keys(x.items).length : 0;
  }
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!N().me; }
  function todayExams() { var n = N(); try { return n.examsFor ? n.examsFor(today()) : []; } catch (e) { return []; } }

  /* the list itself: a pure function (tests run it) */
  function build(o) {
    var D = o.done || {}, g = [], st = o.st || {}, cl = (o.classes && o.classes.list) || [];
    if ((o.weak | 0) > 0 || D.weak) g.push({ k: "weak", e: "🎯", n: "كويز نقاط ضعفك", s: o.weak ? o.weak + (o.weak === 1 ? " سؤال غلطت فيه" : " أسئلة غلطت فيها") : "خلصتو اليوم", href: "quiz.html?t=weak", done: !!D.weak });
    (o.exams || []).forEach(function (ex) {
      var s = (st[ex.id] || {}).s;
      g.push({ k: "ex:" + ex.id, e: "📅", n: "امتحان اليوم: " + ex.n, s: ex.ar || "", href: "quiz.html?exam=" + encodeURIComponent(ex.id), done: !!(D["ex:" + ex.id] || s === "done" || s === "started") });
    });
    cl.forEach(function (c) {
      g.push({ k: "cls:" + (c.name || ""), e: "🏫", n: "امتحان صفّك" + (c.name ? ": " + c.name : ""), s: c.mine ? "قدّمتو: " + c.mine.score + "/" + c.mine.total : (c.week && c.week.n ? c.week.n + " سؤال هالأسبوع" : "امتحان الأسبوع"), href: "classes.html", done: !!c.mine });
    });
    var dq = cl.filter(function (c) { return c.dq && typeof c.dq === "object"; });
    if (dq.length) g.push({ k: "dq", e: "❓", n: "سؤال اليوم", s: "نفس السؤال لكل الصف", href: "classes.html#cdq", done: !!D.dq || dq.every(function (c) { return !!c.dq.mine; }) });
    if (!g.length) g.push({ k: "quiz10", e: "📝", n: "كويز ١٠ أسئلة", s: "أسئلة مخلوطة من كل الدروس", href: "quiz.html?t=all&n=10", done: !!D.quiz10 });
    return g;
  }
  if (!d) { if (typeof module !== "undefined" && module.exports) module.exports = { build: build }; return; }   // node tests
  function goals() {
    var L = live && live.dk === today() ? live : {};
    return build({ weak: weakCount(), exams: todayExams(), st: L.st, classes: L.classes, done: state().done });
  }

  /* exam status + classes from Firebase (the same reads the tutor makes), cached 10 min per tab */
  var live = lsGet(LK, true), busy = null;
  function fetchLive(force) {
    var A = w.NursinFB; if (!A || !A.user || !A.mod) return Promise.resolve(null);
    if (!force && live && live.uid === A.user.uid && live.dk === today() && Date.now() - live.at < LIVE_MS) return Promise.resolve(live);
    if (busy) return busy;
    var exs = todayExams();
    busy = Promise.all([
      A.mod("exams").then(function (m) { return m && m.tutorStatus ? m.tutorStatus(A, exs) : null; }).catch(function () { return null; }),
      A.mod("classes").then(function (m) { return m && m.tutorSummary ? m.tutorSummary(A) : null; }).catch(function () { return null; })
    ]).then(function (r) {
      busy = null; if (!A.user) return null;
      live = { uid: A.user.uid, dk: today(), at: Date.now(), st: r[0] || {}, classes: r[1] && r[1].list ? { list: r[1].list } : null };
      lsSet(LK, live, true); refresh(); return live;
    }, function () { busy = null; return null; });
    return busy;
  }

  /* ---- UI ---- */
  var pill = null, sheet = null, scrim = null;
  function count() { var g = goals(), n = 0; g.forEach(function (x) { if (x.done) n++; }); return { g: g, n: n }; }
  function paint() {
    if (!pill) return;
    if (!signed()) {
      pill.className = "gopill out"; pill.innerHTML = '<span aria-hidden="true">🔒</span><span class="gol">أهدافك اليوم</span>';
      pill.setAttribute("aria-label", "أهدافك اليوم — مقفول، سجّل دخول بغوغل"); return;
    }
    var c = count(), all = c.n === c.g.length;
    pill.className = "gopill" + (all ? " all" : "");
    pill.innerHTML = '<span aria-hidden="true">✅</span><span class="gol">أهدافك اليوم</span><b class="gob" dir="ltr">' + c.n + "/" + c.g.length + "</b>";
    pill.setAttribute("aria-label", "أهدافك اليوم: خلصت " + c.n + " من " + c.g.length);
  }
  function sheetHtml() {
    if (!signed()) {
      var G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
      return '<div class="glk-card gocard"><p class="glk-h">🔒 أهدافك اليوم مقفولة — سجّل دخول بغوغل</p><p class="small">بعد ما تسجّل، كل يوم بتلاقي هون شو لازم تخلّص: نقاط ضعفك، امتحانات اليوم، وامتحانات صفّك.</p>' +
        '<button class="gbtn glk-go" type="button">' + G + '<span>تسجيل الدخول بغوغل</span></button><p class="glk-err small" hidden></p></div>';
    }
    var c = count();
    return '<p class="small gonote">' + (c.n === c.g.length ? "🔥 خلصت كل أهدافك اليوم! برافو" : "خلصت " + c.n + " من " + c.g.length + " · كبسة على أي هدف بتاخدك عليه") + "</p>" +
      c.g.map(function (x) {
        return '<a class="gi goi' + (x.done ? " done" : "") + '" href="' + esc(x.href) + '" data-k="' + esc(x.k) + '"><span class="gie" aria-hidden="true">' + x.e + '</span><span class="git"><b>' + esc(x.n) + "</b>" + (x.s ? "<small>" + esc(x.s) + "</small>" : "") + '</span><span class="gotick" aria-label="' + (x.done ? "خلص" : "لسّا") + '">' + (x.done ? "✅" : "⬜") + "</span></a>";
      }).join("");
  }
  function close() { if (sheet) sheet.remove(); if (scrim) scrim.remove(); sheet = scrim = null; if (pill) pill.setAttribute("aria-expanded", "false"); }
  function open() {
    if (sheet) { close(); return; }
    if (!signed() && N().loadFB) N().loadFB();
    scrim = d.createElement("div"); scrim.className = "gscrim"; scrim.addEventListener("click", close);
    sheet = d.createElement("div"); sheet.className = "gsheet gosheet"; sheet.id = "gosheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", "أهدافك اليوم");
    d.body.appendChild(scrim); d.body.appendChild(sheet); fill();
    if (w.matchMedia && w.matchMedia("(min-width: 860px)").matches) {
      var r = pill.getBoundingClientRect(), wd = Math.min(360, innerWidth - 24);
      sheet.style.top = Math.round(r.bottom + 6) + "px"; sheet.style.width = wd + "px";
      sheet.style.left = Math.round(Math.max(12, Math.min(innerWidth - wd - 12, r.left))) + "px";
    }
    pill.setAttribute("aria-expanded", "true");
    if (signed()) fetchLive(live && Date.now() - live.at > 60e3);
  }
  function fill() {
    if (!sheet) return;
    sheet.innerHTML = '<div class="gsh"><b>✅ أهدافك اليوم</b><button class="gx" type="button" aria-label="سكّر">✕</button></div><nav class="gil">' + sheetHtml() + "</nav>";
    sheet.querySelector(".gx").addEventListener("click", function () { close(); pill.focus(); });
  }
  function refresh() { paint(); fill(); }
  function goTo(e) {
    var a = e.target.closest && e.target.closest("a.goi"); if (!a) return;
    var href = a.getAttribute("href"), page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    // already on quiz.html: start the quiz right here (no reload)
    var m = /^quiz\.html\?t=(\w+)(?:&n=(\d+))?$/.exec(href);
    if (page === "quiz.html" && m && w.NursinQuiz && w.NursinQuiz.start) { e.preventDefault(); close(); w.NursinQuiz.start(m[1], m[2] ? +m[2] : 0); return; }
    close();
  }
  function mount() {
    var bar = d.querySelector(".topbar .bar"); if (!bar || d.querySelector(".gopill")) return;
    pill = d.createElement("button"); pill.type = "button"; pill.className = "gopill";
    pill.setAttribute("aria-haspopup", "dialog"); pill.setAttribute("aria-expanded", "false"); pill.setAttribute("aria-controls", "gosheet");
    pill.addEventListener("click", open);
    bar.insertBefore(pill, bar.querySelector(".menu-btn"));
    d.addEventListener("click", function (e) { if (sheet && sheet.contains(e.target)) goTo(e); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet) close(); });
    paint();
    if (signed()) fetchLive();
  }

  // done marks: a quiz finished on this page
  d.addEventListener("nursin:quiz-done", function (e) {
    var x = e.detail || {};
    if (x.exam) mark("ex:" + x.exam);
    else if (x.set === "weak") mark("weak");
    else if (!x.challenge) mark("quiz10");
    if (x.exam) { live = null; lsSet(LK, null, true); }
  });
  d.addEventListener("nursin:gate", function () { refresh(); if (signed()) fetchLive(); });
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) fetchLive(); else refresh(); });
  d.addEventListener("nursin:me", paint);
  w.addEventListener("storage", function (e) { if (e.key === K || e.key === "nursin_weak_v1") refresh(); });
  w.addEventListener("pageshow", function (e) { if (e.persisted) refresh(); });

  w.NursinGoals = { build: build, mark: mark, state: state, KEY: K, refresh: refresh, open: open };
  if (typeof module !== "undefined" && module.exports) module.exports = w.NursinGoals;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", mount); else mount();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
