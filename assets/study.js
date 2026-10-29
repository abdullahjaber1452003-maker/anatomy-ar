/* 🔥 سلسلة أيام + 🏅 أوسمة + ⏱️ بومودورو + 🏆 تحدّي الأسبوع + 🎯 «جرّب حالك قبل ما تقرا» + 🍫 مكافأة (Abdullah, Oct 26 2026 6:04 PM).
   - A day counts when you finish a quiz, a game round or a pomodoro focus round. Kept in this browser (localStorage nursin_study_v1);
     signed in, the same day + badges also go to the existing users/{uid} streak/badges fields (no new Firestore rules).
   - ⏱️ 25 min focus / 5 min break, long break 15 min after 4 rounds. +5 points per focus round, max 8 rounds a day with points.
     Full card on the home page (#study), a small ⏱️ button on subject pages. State in localStorage nursin_pomo_v1, so it keeps
     running while you move between pages; the end is caught even if the page was closed.
   - 🏆 تحدّي الأسبوع: friends ranked by this week's points (weekKey/weekPoints on users/{uid}, Monday → Sunday, Beirut day).
   - No ads anywhere in here. */
(function (w, d) {
  var K = "nursin_study_v1", PK = "nursin_pomo_v1", MIN = 60e3;
  var DUR = { f: 25 * MIN, s: 5 * MIN, l: 15 * MIN }, POMO_PTS = 5, POMO_CAP = 8, SET = 4;
  var MODE = { f: "⏱️ وقت الدرس", s: "☕ بريك قصير", l: "🌴 بريك طويل" };
  function N() { return w.Nursin || {}; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dk() { var n = N(); return n.dayKey ? n.dayKey() : new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10); }
  function addDays(k, n) { var t = new Date(k + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (k === K && d && d.dispatchEvent) try { d.dispatchEvent(new CustomEvent("nursin:study")); } catch (e) {} }   // ✅ goals.js re-counts ⏱️/🎮

  /* ---- the local record (pure helpers, tests run them) ---- */
  function fresh(o) { o = o && typeof o === "object" ? o : {}; o.badges = o.badges && typeof o.badges === "object" ? o.badges : {}; o.streak = o.streak | 0; o.best = o.best | 0; o.games = o.games | 0; o.quizzes = o.quizzes | 0; o.pomos = o.pomos | 0; return o; }
  function streakNow(o, day) { day = day || dk(); return o && o.sDay && (o.sDay === day || o.sDay === addDays(day, -1)) ? o.streak | 0 : 0; }
  // kind: "quiz" | "game" | "pomo" → the record after it; returns the new badge ids in o._new
  function hit(o, kind, day) {
    o = fresh(o); day = day || dk(); var nb = [];
    if (o.sDay !== day) { o.streak = (o.sDay === addDays(day, -1) ? o.streak : 0) + 1; o.sDay = day; }
    o.best = Math.max(o.best, o.streak);
    if (o.td !== day) { o.td = day; o.tq = 0; o.tp = 0; o.tg = 0; o.gp = 0; }
    if (kind === "quiz") { o.quizzes++; o.tq++; }
    if (kind === "game") { o.games++; o.tg++; }
    if (kind === "pomo") { o.pomos++; o.tp++; }
    function give(id) { if (!o.badges[id]) { o.badges[id] = day; nb.push(id); } }
    if (o.quizzes >= 1) give("fq1");
    if (o.best >= 3) give("s3");
    if (o.best >= 7) give("s7");
    if (o.pomos >= 1) give("pomo1");
    if (o.games >= 10) give("gchamp");
    o._new = nb; return o;
  }
  function today(o, day) { o = fresh(o); day = day || dk(); return o.td === day ? { q: o.tq | 0, p: o.tp | 0, g: o.tg | 0, gp: o.gp | 0 } : { q: 0, p: 0, g: 0, gp: 0 }; }

  function rec() { return fresh(get(K)); }
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!N().me; }
  function pts(n) { var me = N().me; return me ? me.points | 0 : 0; }
  function badgeName(id) { var b = N().badgeById && N().badgeById(id); return b ? b.e + " " + b.n : id; }

  /* ---- 🍫 toast ---- */
  var toastT = 0;
  function toast(html, ms) {
    var t = d.getElementById("stoast");
    if (!t) { t = d.createElement("div"); t.id = "stoast"; t.className = "stoast"; t.setAttribute("role", "status"); d.body.appendChild(t); t.addEventListener("click", function () { t.classList.remove("on"); }); }
    t.innerHTML = html; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, ms || 7000);
  }
  var REWARD = "<b>برافو! خود بريك وكافئ حالك 🍫</b>";

  // something counted → local record, badges line, and (signed in) the same day + badges on the profile
  var GAME_CAP = 60;                                                 // 🎮 game points per day, so it can't be farmed
  function activity(kind, bonus, why, el) {
    var o = hit(rec(), kind), nb = o._new; delete o._new;
    bonus = Math.max(0, bonus | 0);
    if (kind === "game") { bonus = Math.min(bonus, Math.max(0, GAME_CAP - (o.gp | 0))); if (signed()) o.gp = (o.gp | 0) + bonus; }
    var me = N().me; if (me && (me.points | 0) >= 100 && !o.badges.p100) { o.badges.p100 = dk(); nb.push("p100"); }
    put(K, o);
    var line = nb.map(function (id) { return "🏅 وسام جديد: <b>" + esc(badgeName(id)) + "</b>"; }).join("<br>");
    if (signed() && N().queue) {
      N().queue.push({ bonus: bonus | 0, why: why || "", badges: nb, el: el || null, n: 0 });
      if (N().flush) N().flush();
    } else if (el && bonus) el.innerHTML = '🏆 <a href="friends.html">سجّل دخول بغوغل</a> تا تنحسبلك النقاط (+' + bonus + ').';
    if (line) toast(line + ' <a href="friends.html#badges">أوسمتي ←</a>', 6000);
    render();
    o.paid = bonus; return o;
  }

  /* ---- quizzes (quiz.js fires nursin:quiz-done; fb.js itself pays the quiz points and logs the day) ---- */
  if (d && d.addEventListener) d.addEventListener("nursin:quiz-done", function () {
    var o = hit(rec(), "quiz"), nb = o._new; delete o._new; put(K, o);
    var t = today(o);
    setTimeout(function () {
      var h = t.q % 2 === 0 ? REWARD + "<br><small>خلّصت " + t.q + " كويزات اليوم 💪</small>" : "";
      nb.forEach(function (id) { h += (h ? "<br>" : "") + "🏅 وسام جديد: <b>" + esc(badgeName(id)) + "</b>"; });
      if (h) toast(h, 8000);
    }, 1200);
  });

  /* ---- ⏱️ pomodoro ---- */
  function pstate() { var p = get(PK); if (!p || !DUR[p.m]) p = { m: "f", run: false, left: DUR.f, r: 0 }; return p; }
  function left(p) { return Math.max(0, p.run ? p.end - Date.now() : (p.left == null ? DUR[p.m] : p.left)); }
  function mmss(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s %= 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function beep() {
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) {}
    try {
      var C = w.AudioContext || w.webkitAudioContext; if (!C) return; var c = new C();
      [660, 880].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + i * 0.35; o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.34); });
      setTimeout(function () { try { c.close(); } catch (e) {} }, 1200);
    } catch (e) {}
  }
  function pstart() { var p = pstate(); if (p.run) return; p.end = Date.now() + left(p); p.run = true; put(PK, p); pushTimer(p); render(); }
  function ppause() { var p = pstate(); if (!p.run) return; p.left = left(p); p.run = false; put(PK, p); pushTimer(p); render(); }
  function preset() { var p = { m: "f", run: false, left: DUR.f, r: 0 }; put(PK, p); pushTimer(p); render(); }
  function pdone() {
    var p = pstate(); if (!p.run || Date.now() < p.end) return;
    var was = p.m, own = !syncOn || !p.dev || p.dev === DEV; beep();   // 🔄 another device's run: show the change, its owner gives the points
    if (!own) { if (was === "f") { p.r = (p.r | 0) + 1; p.m = p.r >= SET ? "l" : "s"; if (p.r >= SET) p.r = 0; p.end = p.end + DUR[p.m]; } else { p.m = "f"; p.run = false; p.left = DUR.f; } put(PK, p); render(); return; }
    if (was === "f") {
      p.r = (p.r | 0) + 1;
      var o = rec(), t = today(o), paid = t.p < POMO_CAP;
      var setDone = p.r >= SET; p.m = setDone ? "l" : "s"; if (setDone) p.r = 0;
      p.run = true; p.end = Date.now() + DUR[p.m]; put(PK, p); pushTimer(p);
      activity("pomo", paid ? POMO_PTS : 0, "جولة بومودورو", d.getElementById("pomopts"));
      toast(setDone ? REWARD + "<br><small>خلّصت ٤ جولات! بريك طويل ١٥ دقيقة 🌴</small>" : "✅ <b>خلصت جولة تركيز!</b> " + (paid ? "+" + POMO_PTS + " نقاط · " : "") + "هلّق بريك ٥ دقايق ☕", 9000);
    } else {
      p.m = "f"; p.run = false; p.left = DUR.f; put(PK, p); pushTimer(p);
      toast("⏰ <b>خلص البريك!</b> يلا جولة جديدة ▶️", 8000);
    }
    render();
  }

  /* ---- 🔄 one timer on every device of the same account (Abdullah, Oct 29 2026 1:12 PM: «إذا شغلته على الابتوب ما بيكون متزامن على تليفوني»).
     Signed in: the state also lives in users/{uid}/timer/current {m, run, end, left, r, dev, at, t} (rules v16) and every open page listens
     to it (onSnapshot), so start / pause / reset on one device shows on the others within a second or two. The remaining time is always
     end − now (end = epoch ms), so it keeps counting with the screen locked or the tab closed. Only the device that started a run gives
     the round's points (no double points). Before rules v16 are published (permission-denied) or signed out: local timer, as before. */
  var DEV = (function () { try { var x = localStorage.getItem("nursin_dev_v1"); if (!x) { x = Math.random().toString(36).slice(2, 10); localStorage.setItem("nursin_dev_v1", x); } return x; } catch (e) { return "dev"; } })();
  var syncOn = false, syncUid = "", unsub = null;
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db && A.fs.onSnapshot ? A : null; }
  function tref(A) { return A.fs.doc(A.db, "users", A.user.uid, "timer", "current"); }
  function timerDoc(p, now) { return { m: p.m, run: !!p.run, end: p.run ? Math.round(p.end) : 0, left: p.run ? 0 : Math.round(left(p)), r: p.r | 0, dev: DEV, at: now }; }
  // pure: a remote doc → the local state it means (tests call NursinStudy.fromDoc)
  function fromDoc(x) {
    var m = DUR[x && x.m] ? x.m : "f", q = { m: m, run: !!(x && x.run), r: (x && x.r) | 0, at: +(x && x.at) || 0, dev: String((x && x.dev) || "") };
    if (q.run && +x.end > 0) q.end = +x.end; else { q.run = false; q.left = Math.max(0, Math.min(DUR[m], x && x.left != null ? +x.left : DUR[m])); }
    return q;
  }
  function pushTimer(p) {
    var A = fbA(); if (!A || !syncOn) return;
    var now = Date.now(); p.at = now; p.dev = DEV; try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {}
    var o = timerDoc(p, now); o.t = A.fs.serverTimestamp();
    A.fs.setDoc(tref(A), o).catch(function (e) { if (e && e.code === "permission-denied") syncOn = false; });
  }
  function startSync() {
    var A = fbA(); if (!A || syncUid === A.user.uid) return;
    syncUid = A.user.uid; syncOn = true; if (unsub) try { unsub(); } catch (e) {}
    unsub = A.fs.onSnapshot(tref(A), function (s) {
      var p = pstate();
      if (!s.exists()) { if (p.run || left(p) < DUR[p.m]) pushTimer(p); return; }   // first device of this account: share what is running here
      if (s.metadata && s.metadata.hasPendingWrites) return;
      var x = s.data() || {};
      if ((+x.at || 0) <= (p.at || 0)) { if ((p.at || 0) > (+x.at || 0) && p.dev === DEV) pushTimer(p); return; }   // ours is newer (changed offline)
      var q = fromDoc(x); try { localStorage.setItem(PK, JSON.stringify(q)); } catch (e) {} render();
    }, function () { syncOn = false; });
  }
  function pomoBreak(min) { var p = pstate(); p.m = "s"; p.run = true; p.end = Date.now() + (min || 5) * MIN; put(PK, p); pushTimer(p); render(); }
  function pomoHtml(mini) {
    var p = pstate(), t = today(rec()), dots = "";
    for (var i = 0; i < SET; i++) dots += '<i class="' + (i < (p.r | 0) ? "on" : "") + '"></i>';
    return (mini ? "" : '<h2>⏱️ بومودورو <small>٢٥ دقيقة درس + ٥ بريك</small></h2>') +
      '<div class="pmode">' + MODE[p.m] + ' <span class="pdots" aria-label="جولات المجموعة">' + dots + '</span></div>' +
      '<div class="ptime" dir="ltr" aria-live="off">' + mmss(left(p)) + '</div>' +
      '<div class="sbtns">' + (p.run ? '<button class="btn" type="button" data-p="pause">⏸ وقّف</button>' : '<button class="btn on" type="button" data-p="start">▶️ ' + (left(p) < DUR[p.m] ? "كمّل" : "ابدأ") + '</button>') +
      '<button class="btn" type="button" data-p="reset">↺ من الأول</button></div>' +
      (syncOn ? '<p class="small psync">🔄 نفس المؤقّت على كل أجهزتك (اللابتوب والتلفون)</p>' : '') + '<p class="small pinfo">جولات اليوم: <b>' + t.p + '</b> · +' + POMO_PTS + ' نقاط لكل جولة (لحدّ ' + POMO_CAP + ' جولات بالنهار)</p><p class="small" id="pomopts"></p>';
  }
  function wire(el) {
    el.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-p]"); if (!b) return; var a = b.getAttribute("data-p"); if (a === "start") pstart(); else if (a === "pause") ppause(); else preset(); });
  }

  /* ---- 🏆 weekly challenge ---- */
  var wkList = null, wkAt = 0, wkBusy = false, wkFail = false;
  function daysLeft() { var n = N(); var k = dk(), wd = n.weekday ? n.weekday(k) : 0; return 7 - wd; }
  function wkHtml() {
    var h = '<h2>🏆 تحدّي الأسبوع <small>مين بيجمع نقاط أكتر من الاثنين للأحد؟</small></h2>';
    if (!signed() && !N().me) return h + '<p>سجّل دخول بغوغل وزيد أصحابك بالكود، وكل نقطة بتجيبها هالأسبوع (كويز، ألعاب، بومودورو) بتطلّعك بالترتيب.</p><a class="btn on" href="friends.html">🏆 سجّل دخول وزيد أصحابك</a>';
    if (!wkList) return h + (wkFail ? '<p class="small">ما قدرنا نجيب ترتيب أصحابك هلّق. <a href="friends.html">شوف أصحابي ←</a></p>' : '<p class="small">⏳ عم نجيب ترتيب أصحابك…</p>');
    var n = N(), list = wkList.map(function (p) { return { name: p.name || "؟", me: !!p.me, w: n.weekPts ? n.weekPts(p) : 0, photo: p.photo }; });
    list.sort(function (a, b) { return b.w - a.w || (a.me ? -1 : b.me ? 1 : 0); });
    var rows = list.slice(0, 10).map(function (p, i) { return '<li class="' + (p.me ? "me" : "") + '"><span class="wr">' + (["🥇", "🥈", "🥉"][i] || (i + 1)) + "</span>" + (n.avatar ? n.avatar(p.photo, p.name, "av") : "") + '<span class="wn">' + esc(p.name) + (p.me ? " (إنت)" : "") + '</span><b class="wp">' + p.w + "</b></li>"; }).join("");
    var mine = 0; for (var i = 0; i < list.length; i++) if (list[i].me) mine = i + 1;
    return h + '<ol class="wklist">' + rows + "</ol>" +
      (list.length < 2 ? '<p class="small">لسّا ما عندك أصحاب هون. <a href="friends.html">زيد صاحبك بالكود ←</a></p>' : '<p class="small">ترتيبك: <b>' + mine + "</b> من " + list.length + "</p>") +
      '<p class="small">بيرجع من الصفر كل اثنين · باقي <b>' + daysLeft() + "</b> " + (daysLeft() === 1 ? "يوم" : "أيام") + ". النقاط الأسبوعية بلّشنا نعدّها من الاثنين ٢٦ تشرين الأول.</p>";
  }
  function loadWeek(force) {
    var A = w.NursinFB; if (!A || !A.profile || !A.board || wkBusy) return;
    if (!force && wkList && Date.now() - wkAt < 30e3) return;
    wkBusy = true;
    A.board().then(function (l) { wkList = l; wkAt = Date.now(); wkBusy = false; render(); }).catch(function (e) { wkBusy = false; wkFail = true; render(); try { console.warn("nursin: week", e && e.code); } catch (x) {} });
  }

  /* ---- 🎯 «جرّب حالك قبل ما تقرا» at the start of each lesson (the lesson's own quiz button already exists under it) ---- */
  function nudges() {
    var ls = d.querySelectorAll(".lqz");
    for (var i = 0; i < ls.length; i++) {
      var q = ls[i], a = q.querySelector("a"), det = q.previousElementSibling, at = null;
      if (!a || q.getAttribute("data-prq")) continue;
      if (det && det.tagName === "DETAILS") at = det.querySelector("summary");
      else {                                                           // Henderson: lessons are <h3> headings, the button follows the lesson
        var hs = d.querySelectorAll("main h3"); for (var j = 0; j < hs.length; j++) if (hs[j].compareDocumentPosition(q) & 4) at = hs[j];
      }
      if (!at || at.getAttribute("data-prq")) continue;
      var x = d.createElement("a"); x.className = "prq"; x.href = a.getAttribute("href");
      x.innerHTML = '🎯 <b>جرّب حالك قبل ما تقرا</b> <small>كويز قصير على هالدرس، بتعرف شو ناقصك</small> ←';
      at.insertAdjacentElement("afterend", x); at.setAttribute("data-prq", "1"); q.setAttribute("data-prq", "1");
    }
  }

  /* ---- render ---- */
  var home = null, fab = null, mini = null;
  function streakLine() {
    var o = rec(), s = streakNow(o), me = N().me, fs = me && N().streakNow ? N().streakNow(me) : 0, n = Math.max(s, fs), t = today(o), did = o.sDay === dk() || (me && me.sDay === dk());
    var bs = (N().BADGES || []).filter(function (b) { return o.badges[b.id]; });
    return '<div class="stkbig">🔥 <b>' + n + "</b> " + (n === 1 ? "يوم" : "أيام") + ' <small>' + (n ? "ورا بعض" : "") + "</small></div>" +
      '<p class="small">' + (did ? "✅ اليوم انحسب! ارجع بكرا تا تكبر السلسلة." : "خلّص كويز، لعبة أو جولة بومودورو اليوم تا ينحسب النهار 🔥") + "</p>" +
      (bs.length ? '<div class="sbdg">' + bs.map(function (b) { return '<span title="' + esc(b.n) + '">' + b.e + " " + esc(b.n) + "</span>"; }).join("") + "</div>" : '<p class="small">🏅 أوّل وسام: خلّص أوّل كويز!</p>') +
      '<p class="small"><a href="friends.html#badges">كل الأوسمة ←</a></p>';
  }
  function render() {
    if (home) {
      var s = home.querySelector("#stk"); if (s) s.innerHTML = streakLine();
      var p = home.querySelector("#pomo"); if (p) { var keep = (d.getElementById("pomopts") || {}).innerHTML || ""; p.innerHTML = pomoHtml(false); if (keep) d.getElementById("pomopts").innerHTML = keep; }
      var k = d.getElementById("wkch"); if (k) k.innerHTML = wkHtml();
    } else { var k2 = d.getElementById("wkch"); if (k2) k2.innerHTML = wkHtml(); }
    if (fab) { var pp = pstate(); fab.innerHTML = "⏱️" + (pp.run || left(pp) < DUR[pp.m] ? ' <span dir="ltr">' + mmss(left(pp)) + "</span>" : ""); fab.classList.toggle("run", !!pp.run); if (mini && !mini.hidden) { var keep2 = (d.getElementById("pomopts") || {}).innerHTML || ""; mini.querySelector(".pmb").innerHTML = pomoHtml(true); if (keep2) d.getElementById("pomopts").innerHTML = keep2; } }
  }
  function tick() {
    var p = pstate();
    if (p.run && Date.now() >= p.end) pdone();
    if (p.run) {                                                       // only the clock text, every second
      var t = mmss(left(p)), els = d.querySelectorAll(".ptime"); for (var i = 0; i < els.length; i++) els[i].textContent = t;
      if (fab) { var sp = fab.querySelector("span"); if (sp) sp.textContent = t; else render(); }
    }
  }
  var SUBJ = /^(cardio|neuro|henderson|law|mgmt|quality|pharma|rea)\.html$/;
  function init() {
    var page = location.pathname.split("/").pop() || "index.html";
    home = d.getElementById("study");
    if (home) {
      home.innerHTML = '<div class="card stu" id="stk"></div><div class="card stu pomo" id="pomo"></div><div class="card stu wk" id="wkch"></div>' +
        '<a class="card stu gml" href="games.html"><b>🎮 ألعاب</b> <span>🧩 وصّل · ⚡ تحدّي ٦٠ ثانية · 🃏 الذاكرة</span><small>من نفس الدروس، بنقاط وترتيب مع أصحابك ←</small></a>';
      wire(home.querySelector("#pomo"));
    }
    if (SUBJ.test(page)) {
      fab = d.createElement("button"); fab.type = "button"; fab.className = "pomofab"; fab.setAttribute("aria-label", "مؤقّت بومودورو");
      mini = d.createElement("div"); mini.className = "pomomini"; mini.hidden = true; mini.innerHTML = '<button class="pmx" type="button" aria-label="سكّر">✕</button><div class="pmb"></div>';
      d.body.appendChild(mini); d.body.appendChild(fab); wire(mini);
      fab.addEventListener("click", function () { mini.hidden = !mini.hidden; render(); });
      mini.querySelector(".pmx").addEventListener("click", function () { mini.hidden = true; });
      nudges(); setTimeout(nudges, 1500); w.addEventListener("load", function () { nudges(); setTimeout(nudges, 800); });
    }
    render(); tick(); setInterval(tick, 1000);
    if (d.getElementById("wkch")) {
      var tries = 0, iv = setInterval(function () { tries++; if (w.NursinFB && w.NursinFB.profile) { clearInterval(iv); loadWeek(true); } else if (tries > 50) { clearInterval(iv); wkFail = true; render(); } }, 500);
      d.addEventListener("nursin:points", function () { setTimeout(function () { loadWeek(true); }, 600); });
      d.addEventListener("nursin:me", function () { if (!wkList) loadWeek(); render(); });
    }
    w.addEventListener("storage", function (e) { if (e.key === PK || e.key === K) render(); });
    var sv = 0, siv = setInterval(function () { sv++; if (fbA()) { clearInterval(siv); startSync(); } else if (sv > 60) clearInterval(siv); }, 1000);
    d.addEventListener("nursin:auth", function () { setTimeout(startSync, 300); });
  }
  w.NursinStudy = { pomoBreak: pomoBreak, fromDoc: fromDoc, timerDoc: timerDoc, hit: hit, today: today, streakNow: streakNow, activity: activity, toast: toast, REWARD: REWARD, POMO_PTS: POMO_PTS, POMO_CAP: POMO_CAP, GAME_CAP: GAME_CAP, DUR: DUR, rec: rec, render: render };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
