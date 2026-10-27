/* ✅ أهدافك اليوم (Abdullah, Oct 26 2026 12:36 PM: "a button at the top side with the goals you have to finish: your weak points,
   today's exams, your class's exams…"). A small pill in the header's top corner on every page (never over the content or the ads).
   Signed in: tap → a sheet with today's goals, built only from data the site already has (no new backend):
     🎯 كويز نقاط ضعفك      — when Weak.count() > 0; done when a weak-points quiz is finished today (weak store's ranAt, nursin_weak_v1.ran)
     📅 امتحان اليوم: …      — each weekly exam scheduled today (Nursin.examsFor); done when taken (examResults / examStarts via exams.js tutorStatus, or finished here today)
     🏫 امتحان صفّك: …        — each class the student is in (classes.js goalsStatus); done when this week's result doc classes/{cid}/results/{wk}_{uid} exists
     ❓ سؤال اليوم            — when they're in a class; done when the answer doc classes/{cid}/dq/{day}_{uid} exists in ANY of their classes
   Fix Oct 26 12:55 PM (Abdullah: «سؤال اليوم» stayed ⬜ after answering): done comes from those real docs, re-read every time the
   sheet opens; classes.html also marks dq / cls:{cid} the moment the answer/result is saved or shown.
     📝 كويز ١٠ أسئلة         — only when none of the rows above is on the list
     ⏱️ جولة بومودورو وحدة    — every day; done when ≥1 pomodoro focus round finished today (nursin_study_v1 tp, assets/study.js)
     🎮 العب لعبة وحدة         — every day; done when ≥1 round of ANY game finished today (nursin_study_v1 tg) — one game, not all of them
     📖 درس جديد: …           — on top, on the day a lesson is added and the next day (assets/lessons.js «added»); done when read
                                (≈1 min on it / scrolled through it) or its lesson quiz finished (nursin_read_v1)
   Each row has a ✅ when done and goes straight to it. Badge "2/4". Done-state per Beirut day in localStorage (nursin_goals_v1).
   Signed out: the pill shows 🔒 and the sheet only offers Google sign-in (assets/gate.js state).
   🔔 Goal reminders (Abdullah, Oct 26 9:56 PM): the switch «🔔 ذكّرني بأهدافي (4–10:30 المسا)» at the bottom of the sheet turns on
   notifications (the same push subscription as chat, NursinPWA.enable) and sets goalPush on the student's own profile users/{uid}.
   While it's on, this file mirrors today's goals there (fields the v10 rules already allow on your own profile):
     goalsDay "YYYY-MM-DD", goalsList [{k, n, h}], goalsDone [k] — written only when they change (nursin_goals_mirror_v1).
   The Cloudflare worker (v4, Cron Trigger) reads them at 16:00, 16:45, 17:30, 18:30, 19:30, 20:30, 21:30, 22:30 Beirut and sends ONE
   push about the next unfinished goal (nothing once everything is done). */
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
  // the weak store itself remembers when a weak-points quiz was last finished (weak.js ran/ranAt)
  function dayOf(ts) { try { return new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" }); } catch (e) { return new Date(ts + 3 * 36e5).toISOString().slice(0, 10); } }
  function weakRanToday() { var t = 0; try { t = w.Weak && w.Weak.ranAt ? w.Weak.ranAt() : ((lsGet("nursin_weak_v1") || {}).ran || 0); } catch (e) {} return !!t && dayOf(t) === today(); }
  // ⏱️/🎮 today's counts from the record assets/study.js keeps (works on pages that don't load study.js too)
  function studyToday() { var o = lsGet("nursin_study_v1"); return o && o.td === today() ? { p: o.tp | 0, g: o.tg | 0 } : { p: 0, g: 0 }; }
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!N().me; }
  function todayExams() { var n = N(); try { return n.examsFor ? n.examsFor(today()) : []; } catch (e) { return []; } }

  /* the list itself: a pure function (tests run it) */
  function build(o) {
    var D = o.done || {}, g = [], st = o.st || {}, cl = (o.classes && o.classes.list) || [];
    var wdone = !!(D.weak || o.weakRan);
    if ((o.weak | 0) > 0 || wdone) g.push({ k: "weak", e: "🎯", n: "كويز نقاط ضعفك", s: o.weak ? o.weak + (o.weak === 1 ? " سؤال غلطت فيه" : " أسئلة غلطت فيها") : "خلصتو اليوم", href: "quiz.html?t=weak", done: wdone });
    (o.exams || []).forEach(function (ex) {
      var s = (st[ex.id] || {}).s;
      g.push({ k: "ex:" + ex.id, e: "📅", n: "امتحان اليوم: " + ex.n, s: ex.ar || "", href: "quiz.html?exam=" + encodeURIComponent(ex.id), done: !!(D["ex:" + ex.id] || s === "done" || s === "started") });
    });
    cl.forEach(function (c) {
      var ck = "cls:" + (c.cid || c.name || "");
      g.push({ k: ck, e: "🏫", n: "امتحان صفّك" + (c.name ? ": " + c.name : ""), s: c.mine ? "قدّمتو: " + c.mine.score + "/" + c.mine.total : (c.week && c.week.n ? c.week.n + " سؤال هالأسبوع" : "امتحان الأسبوع"), href: c.cid ? "classes.html?c=" + encodeURIComponent(c.cid) : "classes.html", done: !!(c.mine || D[ck]) });
    });
    var dq = cl.filter(function (c) { return c.dq && typeof c.dq === "object"; });
    // done = answered today in ANY of my classes (the real answer doc), or answered on this device today
    var dqMine = dq.filter(function (c) { return !!c.dq.mine; })[0], dqDone = !!(D.dq || dqMine), dqTo = dq.filter(function (c) { return !c.dq.mine && c.cid; })[0];
    if (dq.length || D.dq) g.push({ k: "dq", e: "❓", n: "سؤال اليوم", s: dqMine ? (dqMine.dq.mine === "ok" ? "✅ جاوبت صح اليوم" : "جاوبت اليوم") : D.dq ? "جاوبت اليوم" : "نفس السؤال لكل الصف", href: dqDone ? ((dqMine && dqMine.cid) ? "classes.html?c=" + encodeURIComponent(dqMine.cid) + "#cdq" : "classes.html#cdq") : (dqTo ? "classes.html?c=" + encodeURIComponent(dqTo.cid) + "#cdq" : "classes.html#cdq"), done: dqDone });
    if (!g.length) g.push({ k: "quiz10", e: "📝", n: "كويز ١٠ أسئلة", s: "أسئلة مخلوطة من كل الدروس", href: "quiz.html?t=all&n=10", done: !!D.quiz10 });
    // ⏱️ + 🎮 every day (Oct 26 7:41 PM + 7:42 PM): one pomodoro focus round and ONE game round (any of the games, not all of them),
    // both read from the real local record that study.js keeps (nursin_study_v1: tp = pomodoro rounds today, tg = game rounds today)
    var P = o.pomo | 0, G = o.game | 0;
    g.push({ k: "pomo", e: "⏱️", n: "جولة بومودورو وحدة (٢٥ دقيقة)", s: P ? "✅ خلصت " + P + (P === 1 ? " جولة" : " جولات") + " اليوم" : "٢٥ دقيقة تركيز، بعدها بريك", href: "index.html#study", done: P >= 1 });
    g.push({ k: "game", e: "🎮", n: "العب لعبة وحدة", s: G ? "✅ لعبت " + G + (G === 1 ? " جولة" : " جولات") + " اليوم" : "جولة وحدة من أي لعبة بتكفي", href: "games.html", done: G >= 1 });
    // 📖 new lessons (assets/lessons.js «added» date): on the day they're added and the next day, on top of the list
    return (o.newL || []).concat(g);
  }
  if (!d) { if (typeof module !== "undefined" && module.exports) module.exports = { build: build, gsMerge: gsMerge, gsApply: gsApply }; return; }   // node tests
  function goals() {
    var L = live && live.dk === today() ? live : {};
    var L2 = w.NursinLessons, nl = [], R = gsToday(), D = {}, st = studyToday(), k;
    try {   // 📅 today's small lessons from the class timetable + «📌 هالأسبوع» (assets/lessons.js todayPlan): another device's list for today wins, read → ✅
      if (L2 && L2.todayPlan) { var seen = (R.rows || []).filter(function (r) { return r && /^les:/.test(r.k); }).map(function (r) { return r.k.slice(4); }), rm = L2.readMap(); nl = L2.todayPlan(seen, R.done).map(function (x) { return L2.row(x, rm); }); }
    } catch (e) {}
    for (k in R.done) D[k] = R.done[k];
    var loc = state().done; for (k in loc) D[k] = loc[k];
    var list = build({ weak: weakCount(), weakRan: weakRanToday() || !!R.wr, exams: todayExams(), st: L.st, classes: L.classes, done: D, pomo: Math.max(st.p, R.p | 0), game: Math.max(st.g, R.g | 0), newL: nl });
    return gsApply(list, R);
  }

  /* ☁️ same account, same goals on every device (Abdullah, Oct 27 1:46 PM: iMac showed 5 done, phone 4).
     Signed in, today's goal state also lives in the student's own users/{uid} doc as goalsSync {d, done{k:ts}, p, g, wr, rows[], at}
     (rules v10 let the owner merge any field; points/name stay). Pulled on sign-in, page focus/visible and when the sheet opens;
     merged with this device (same day: union of done + max of every counter + union of rows; newer day wins) and written back
     (read → merge → write, debounced, only when this device has something new). Signed out / offline: localStorage as before. */
  var SK = "nursin_goals_sync_v1", SWK = "nursin_goals_sync_w_v1", gsAt = 0, gsT = 0;
  function gsMerge(a, b) {
    var ok = function (s) { return s && typeof s === "object" && typeof s.d === "string" && s.d; };
    if (!ok(a)) return ok(b) ? gsMerge(b, b) : null;
    if (!ok(b)) b = a;
    if (a.d !== b.d) return gsMerge(a.d > b.d ? a : b, a.d > b.d ? a : b);
    var o = { d: a.d, done: {}, p: Math.max(a.p | 0, b.p | 0), g: Math.max(a.g | 0, b.g | 0), wr: Math.max(+a.wr || 0, +b.wr || 0), rows: [] }, seen = {};
    [a, b].forEach(function (s) {
      var dn = s.done && typeof s.done === "object" ? s.done : {};
      for (var k in dn) { var v = +dn[k] || 1; o.done[k] = o.done[k] ? Math.min(o.done[k], v) : v; }
      (Array.isArray(s.rows) ? s.rows : []).forEach(function (r) { if (r && r.k && !seen[r.k]) { seen[r.k] = 1; o.rows.push({ k: cut(r.k, 80), e: cut(r.e, 8), n: cut(r.n, 80), s: cut(r.s, 80), h: cut(r.h, 160) }); } });
    });
    var dk = Object.keys(o.done).sort(), dd = {};
    dk.forEach(function (k) { dd[k] = o.done[k]; }); o.done = dd;          // one canonical order → equal states compare equal
    o.rows.sort(function (x, y) { return x.k < y.k ? -1 : x.k > y.k ? 1 : 0; }); o.rows = o.rows.slice(0, 20);
    return o;
  }
  // the merged remote state for today (only this account's)
  function gsToday() {
    var A = fbA(), x = lsGet(SK), e = { done: {}, rows: [], p: 0, g: 0, wr: 0 };
    if (!A || !x || x.u !== A.user.uid || !x.s || x.s.d !== today()) return e;
    return x.s;
  }
  // rows another device has (e.g. 🎯 weak points there) join this list, and anything done there is done here
  function gsApply(list, R) {
    var have = {};
    list.forEach(function (x) { have[x.k] = 1; if (R.done && R.done[x.k]) x.done = true; });
    var one = list.some(function (x) { return /^les:/.test(x.k); });
    (R.rows || []).forEach(function (r) { if (r && r.k && !have[r.k] && !(one && /^les:/.test(r.k)) && !/^new:/.test(r.k)) { have[r.k] = 1; list.push({ k: r.k, e: r.e || "✅", n: r.n || "", s: r.s || "", href: r.h || "index.html", done: !!(R.done && R.done[r.k]) }); } });
    return list;
  }
  function gsSnap() {
    var list = goals(), dn = {}, loc = state().done, st = studyToday(), R = gsToday(), now = Date.now(), k;
    for (k in R.done) dn[k] = R.done[k];
    for (k in loc) dn[k] = Math.min(dn[k] || loc[k], loc[k]);
    list.forEach(function (x) { if (x.done && !dn[x.k]) dn[x.k] = now; });
    return gsMerge({ d: today(), done: dn, p: Math.max(st.p, R.p | 0), g: Math.max(st.g, R.g | 0), wr: weakRanToday() ? (R.wr || now) : (R.wr || 0),
      rows: list.slice(0, 20).map(function (x) { return { k: x.k, e: x.e, n: x.n, s: x.s, h: x.href }; }) }, null);
  }
  function gsKeep(A, s) { lsSet(SK, { u: A.user.uid, s: s }); }
  function gsPull(force) {
    var A = fbA(); if (!A || (!force && Date.now() - gsAt < 15e3)) return;
    gsAt = Date.now();
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) {
      var r = s.exists() ? s.data().goalsSync : null, cur = lsGet(SK);
      var m = gsMerge(cur && cur.u === A.user.uid ? cur.s : null, r);
      if (m) gsKeep(A, m);
      paint(); fill(); gsPush();
    }, function () { gsAt = 0; });
  }
  function gsPush(now) {
    if (!fbA()) return;
    clearTimeout(gsT);
    gsT = setTimeout(function () {
      var A = fbA(); if (!A) return;
      var me = gsSnap(), j = JSON.stringify(me), last = lsGet(SWK);
      if (last && last.u === A.user.uid && last.j === j) return;              // nothing new on this device
      var ref = A.fs.doc(A.db, "users", A.user.uid);
      A.fs.getDoc(ref).then(function (s) {
        var r = s.exists() ? s.data().goalsSync : null, m = gsMerge(me, r);
        gsKeep(A, m);
        var same = r && JSON.stringify(gsMerge(r, null)) === JSON.stringify(m);
        var done = function () { lsSet(SWK, { u: A.user.uid, j: j }); };
        if (same) { done(); return; }
        m.at = Date.now();
        return A.fs.setDoc(ref, { goalsSync: m }, { merge: true }).then(done);
      }).then(function () { paint(); fill(); }, function () {});
    }, now ? 0 : 2500);
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
      A.mod("classes").then(function (m) { return m && m.goalsStatus ? m.goalsStatus(A) : m && m.tutorSummary ? m.tutorSummary(A) : null; }).catch(function () { return null; })
    ]).then(function (r) {
      busy = null; if (!A.user) return null;
      live = { uid: A.user.uid, dk: today(), at: Date.now(), st: r[0] || {}, classes: r[1] && r[1].list ? { list: r[1].list } : null };
      lsSet(LK, live, true); refresh(); return live;
    }, function () { busy = null; return null; });
    return busy;
  }


  /* ---- 🔔 goal reminders: switch + mirror of today's goals onto users/{uid} ---- */
  var PK = "nursin_goalpush_v1", MK = "nursin_goals_mirror_v1", WORKER = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev";
  var gpMsg = "", pst = null, mt = null, gpBusy = false;
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  function pushOn() { var A = fbA(), o = lsGet(PK); return !!(A && o && o.u === A.user.uid && o.on); }
  function setFlag(on) { var A = fbA(); if (A) lsSet(PK, { u: A.user.uid, on: !!on }); }
  function cut(s, n) { return Array.from(String(s == null ? "" : s)).slice(0, n).join(""); }
  function mirrorData(g) {
    return { goalsDay: today(), goalsList: g.slice(0, 20).map(function (x) { return { k: cut(x.k, 80), n: cut(x.n, 80), h: cut(x.href, 160) }; }),
      goalsDone: g.filter(function (x) { return x.done; }).slice(0, 20).map(function (x) { return cut(x.k, 80); }) };
  }
  function mirror(now) { if (!pushOn()) return; clearTimeout(mt); mt = setTimeout(doMirror, now ? 0 : 2500); }
  function doMirror(extra) {
    var A = fbA(); if (!A || (!pushOn() && !extra)) return Promise.resolve(false);
    var m = mirrorData(goals()), j = JSON.stringify(m), last = lsGet(MK);
    if (!extra && last && last.u === A.user.uid && last.j === j) return Promise.resolve(true);
    if (extra) for (var k in extra) m[k] = extra[k];
    return A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), m, { merge: true }).then(function () { lsSet(MK, { u: A.user.uid, j: j }); return true; }, function () { return false; });
  }
  // the switch's state comes from the profile (another device may have turned it on/off)
  var synced = "";
  function syncFlag() {
    var A = fbA(); if (!A || synced === A.user.uid) return; synced = A.user.uid;
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) { var v = s.exists() && s.data().goalPush === true; if (v !== pushOn()) { setFlag(v); fill(); } if (v) mirror(true); }, function () { synced = ""; });
  }
  function gpHtml() {
    var on = pushOn();
    return '<div class="gopush"><button class="gopsw" type="button" role="switch" aria-checked="' + on + '"' + (gpBusy ? " disabled" : "") + '><span class="gopk" aria-hidden="true"></span><span class="gopt">🔔 ذكّرني بأهدافي (4–10:30 المسا)</span></button>' +
      '<small class="gopm" aria-live="polite">' + esc(gpMsg || (on ? "✅ شغّال: كل ٤٥–٦٠ دقيقة إشعار بهدف واحد ما خلّصتو، وبيوقف لمّا تخلّص الكل." : "إشعار بهدف واحد بكل مرّة، بس عن يلّي ما خلّصتو اليوم.")) + "</small></div>";
  }
  function hello(A) {        // worker v4: one push right now so the student sees it works (an older worker just answers without «goals»)
    fetch(WORKER + "/push").then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.goals) return;
      return A.user.getIdToken().then(function (t) { return fetch(WORKER + "/goals/hello", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: t }) }); });
    }).catch(function () {});
  }
  function gpSay(m) { gpMsg = m; fill(); }
  function toggle() {
    var A = fbA(), P = w.NursinPWA; if (!A || gpBusy) return;
    if (pushOn()) {
      setFlag(false); gpBusy = true; gpSay("");
      doMirror({ goalPush: false }).then(function () { gpBusy = false; gpSay("🔕 وقّفنا تذكير الأهداف. (إشعارات الرسائل بتضل متل ما هي)"); });
      return;
    }
    var st = pst || (P && P.env ? (P.env().canPush ? "off" : (P.env().ios && !P.env().standalone ? "ios" : "none")) : "none");
    if (st === "ios") return gpSay("عالآيفون: زيد Nursin عالشاشة الرئيسية (⬆️ مشاركة ← «إضافة إلى الشاشة الرئيسية») وافتحو من الأيقونة، بعدين شغّل التذكير من هون.");
    if (st === "none" || !P) return gpSay("هالمتصفح ما بيدعم الإشعارات. جرّب Chrome عالأندرويد، أو Safari عالآيفون من الشاشة الرئيسية.");
    if (st === "denied") return gpSay("🔕 الإشعارات مسكّرة لـ Nursin. فتّحها من إعدادات التلفون/المتصفح (الإشعارات ← Nursin)، ورجاع شغّل التذكير.");
    gpBusy = true; gpSay("⏳ لحظة…");
    var go = st === "on" ? Promise.resolve("on") : P.enable(A);
    go.then(function (r) {
      if (r !== "on") { gpBusy = false; return gpSay("ما وافقت عالإشعارات. كبوس مرّة تانية لمّا تكون جاهز."); }
      pst = "on"; setFlag(true);
      return doMirror({ goalPush: true, goalPushAt: A.fs.serverTimestamp() }).then(function (ok) {
        gpBusy = false;
        if (!ok) { setFlag(false); return gpSay("ما قدرنا نحفظ التذكير هلّق، جرّب بعد شوي."); }
        gpSay("✅ تمام! من 4 لـ 10:30 المسا بيوصلك إشعار بهدف واحد كل شوي، لحد ما تخلّصن."); hello(A);
      });
    }, function () { gpBusy = false; gpSay("🔔 الإشعارات عم تتجهّز، جرّب بعد شوي."); });
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
      return '<div class="glk-card gocard"><p class="glk-h">🔒 أهدافك اليوم مقفولة — سجّل دخول بغوغل</p><p class="small">بعد ما تسجّل، كل يوم بتلاقي هون شو لازم تخلّص: نقاط ضعفك، امتحانات اليوم وصفّك، جولة ⏱️ بومودورو، 🎮 لعبة، و📖 الدروس الجديدة.</p>' +
        '<button class="gbtn glk-go" type="button">' + G + '<span>تسجيل الدخول بغوغل</span></button><p class="glk-err small" hidden></p></div>';
    }
    var c = count();
    return '<p class="small gonote">' + (c.n === c.g.length ? "🔥 خلصت كل أهدافك اليوم! برافو" : "خلصت " + c.n + " من " + c.g.length + " · كبسة على أي هدف بتاخدك عليه") + "</p>" +
      c.g.map(function (x) {
        return '<a class="gi goi' + (x.done ? " done" : "") + '" href="' + esc(x.href) + '" data-k="' + esc(x.k) + '"><span class="gie" aria-hidden="true">' + x.e + '</span><span class="git"><b>' + esc(x.n) + "</b>" + (x.s ? "<small>" + esc(x.s) + "</small>" : "") + '</span><span class="gotick" aria-label="' + (x.done ? "خلص" : "لسّا") + '">' + (x.done ? "✅" : "⬜") + "</span></a>";
      }).join("") + gpHtml();
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
    if (signed()) fetchLive(!live || Date.now() - live.at > 5e3);   // re-read the real answers every time the sheet opens
    gsPull();
    if (signed() && fbA()) { syncFlag(); if (w.NursinPWA && w.NursinPWA.state) w.NursinPWA.state(fbA()).then(function (s) { pst = s; }, function () {}); }
  }
  function fill() {
    if (!sheet) return;
    sheet.innerHTML = '<div class="gsh"><b>✅ أهدافك اليوم</b><button class="gx" type="button" aria-label="سكّر">✕</button></div><nav class="gil">' + sheetHtml() + "</nav>" + subjPick();
    sheet.querySelector(".gx").addEventListener("click", function () { close(); pill.focus(); });
  }
  function refresh() { paint(); fill(); mirror(); gsPush(); }
  function subjPick() {     // 📅 the class timetable the lesson goals follow (assets/lessons.js CLASSDAY) — information only
    var L2 = w.NursinLessons; if (!L2 || !L2.CLASSDAY) return "";
    var fr = !!(w.Lang && w.Lang.fr), S = L2.subjects, by = {}, s, out = [];
    for (s in L2.CLASSDAY) (by[L2.CLASSDAY[s]] = by[L2.CLASSDAY[s]] || []).push(S[s] ? esc(fr ? S[s].fr : S[s].ar) : s);
    [4, 5, 6].forEach(function (dd) { var n = L2.classDayOf(Object.keys(L2.CLASSDAY).filter(function (k) { return L2.CLASSDAY[k] === dd; })[0]); if (by[dd]) out.push("<b>" + (fr ? n[1] : n[0]) + "</b> " + by[dd].join("، ")); });
    var none = !Object.keys(L2.weekLes()).length;
    return '<p class="gosl" data-nofr>📅 ' + (fr ? "Les leçons du jour suivent l'emploi du temps : " : "دروس اليوم ماشية حسب برنامج الصف: ") + out.join(" · ") +
      "<br><small>" + (fr ? "🗓️ Matières du jeudi : samedi→mercredi • vendredi : dimanche→jeudi • samedi : dimanche→vendredi (jours de cours plus légers)" : "🗓️ مواد الخميس: سبت→أربعا • الجمعة: أحد→خميس • السبت: أحد→جمعة (أيام الصف أخفّ)") + "</small>" +
      (none ? "<br><small>" + (fr ? "📌 Pas encore de leçons choisies pour cette semaine." : "📌 لسّا ما في دروس محدّدة لهالأسبوع.") + "</small>" : "") + "</p>";
  }

  function goTo(e) {
    if (e.target.closest && e.target.closest(".gopsw")) { e.preventDefault(); toggle(); return; }
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
    if (x.exam) stale();
  });
  // classes.html: «سؤال اليوم» answered / class exam submitted (or opened already done)
  d.addEventListener("nursin:goal-done", function (e) { var k = e.detail && e.detail.k; if (k) { mark(k); stale(); } });
  d.addEventListener("visibilitychange", function () { if (d.visibilityState === "visible") gsPull(); if (d.visibilityState === "visible" && signed() && pill && (!live || Date.now() - live.at > 60e3)) fetchLive(true); });
  w.addEventListener("focus", function () { gsPull(); });
  d.addEventListener("nursin:gate", function () { refresh(); if (signed()) fetchLive(); });
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) { fetchLive(); setTimeout(syncFlag, 1500); setTimeout(function () { gsPull(true); }, 1200); } else { synced = ""; refresh(); } });
  d.addEventListener("nursin:me", paint);
  d.addEventListener("nursin:study", refresh);         // a ⏱️ round / 🎮 round just counted (study.js)
  d.addEventListener("nursin:lesson-read", refresh);   // a 📖 new lesson was read (lessons.js)
  d.addEventListener("nursin:weekles", refresh);       // 📌 Abdullah changed this week's lessons (lessons.js wkPull)
  w.addEventListener("storage", function (e) { if (e.key === K || e.key === "nursin_weak_v1" || e.key === "nursin_study_v1" || e.key === "nursin_read_v1") refresh(); });
  w.addEventListener("pageshow", function (e) { if (e.persisted) { refresh(); if (signed()) fetchLive(true); } });
  // the cached Firebase read is out of date → re-read now (keep the old one on screen until the new one lands)
  function stale() { if (live) { live.at = 0; lsSet(LK, live, true); } if (signed() && pill) fetchLive(true); }

  w.NursinGoals = { gsMerge: gsMerge, gsApply: gsApply, pull: gsPull, build: build, mark: mark, state: state, KEY: K, refresh: refresh, open: open, stale: stale, mirrorData: mirrorData, pushOn: pushOn, toggle: toggle };
  if (typeof module !== "undefined" && module.exports) module.exports = w.NursinGoals;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", mount); else mount();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
