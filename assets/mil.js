/* 🏆 «مين بدو يربح المليون؟» (Abdullah, Nov 8 2026 8:37 AM: «شو رأيك نعمل شي متل من سيربح المليون») — 20261030r.
   A show-style quiz built ONLY from the site's existing quiz bank (window.QUIZ, the same items the lesson quizzes use; no new content).
   • Start: pick a subject (every QSUBJ subject that has questions), «🎯 امتحاني الجاي» (the next exam date's subjects, read from
     NursinMid.EXAMS when assets/midterm.js is on the page, else the EXAMS mirror below — tests keep both equal; subjects without
     questions, like «prev» / «psych», are skipped) or «🔀 كل المواد».
   • 15 questions, never the same one twice in a game. Difficulty: the bank has no difficulty field, so the proxy is the LENGTH of the
     question + all its options (characters, tags stripped): the pool is sorted by it, cut into 15 equal bands, one random question per
     band → each question is at least as «long» as the one before. A subject with < 15 is filled from the subjects of the same exam date;
     still < 15 → «ما في أسئلة كفاية». Options are shuffled.
   • Ladder 100 … 1,000,000 points (show labels), safe levels at Q5 (1,000) and Q10 (32,000). Wrong / time-out → the last safe level;
     «🛑 انسحب واحفظ النقاط» → what is already won; all 15 → 1,000,000.
   • Lifelines, once each: ٥٠:٥٠ (leaves the right answer + 1 wrong) · 📞 اسأل عثمان (the lesson's title + the first sentence of the item's
     own explanation, never a letter; no explanation → the lesson name only) · 👥 رأي الجمهور (right answer 60–75 %, the rest random, sums 100).
   • 30 s a question, paused while a lifeline dialog is open. Lock-in: orange ~1 s, then green / red; a wrong answer shows the right one +
     the item's short explanation. Result: points, best (localStorage nursin_mil_v1), «العب مرة تانية», «📚 راجع الدروس اللي غلطت فيها».
   • Signals: every answered question → NursinSRS.record (the site's existing spaced-review entry point); the round → NursinStudy.activity
     ("game", ≤ 15 points, same caps as the other games). Sound: see the 🔊 block above (30p: real recordings in <audio>, ON by default). No continuous animations. No ads in here. */
/* 🔊 30p — REAL RECORDED sound (Abdullah, Nov 8 2026 9:15 AM on his iPhone: «ما سمعت صوت»; 9:27 AM: «حط الصوت الحقيقي ب من سيربح المليون»).
   The show's own music is copyrighted (public site with ads), so these are royalty-free RECORDINGS that sound like a TV quiz show,
   files in assets/sounds/ (source + license of each in assets/sounds/CREDITS.txt; mono mp3, ~-16 LUFS, ~450 KB in all).
   • Played with HTML <audio> elements (media playback), NOT Web Audio: on iPhone they play even with the ring/silent switch on, and the
     30n 55–70 Hz synthesized drone (inaudible on phone speakers) is gone. navigator.audioSession.type = "playback" where it exists.
   • iOS unlock: on the first tap every element is played muted + paused right away inside the gesture (then allowed to play later);
     unlock() runs on EVERY tap in the game (it only does work for elements not unlocked yet, and restarts the bed if iOS dropped it).
   • bed (mil-bed.mp3, a 28.8 s loop = 12 bars): starts from the top when a question appears, loops, pauses while a lifeline dialog is open
     (resumes where it was), stops with a ~150 ms fade on answer / time-out / leaving / result screen / hidden tab / 🔇.
   • Last 10 s: a recorded clock tick each second (pitch rising a little each second), two a second in the last 5 s — on top of the bed;
     the red timer flash stays (CSS). FX: lockin, correct, wrong, buzzer (time-out), safe (Q5/Q10), lifeline, fanfare (result ≥ safe level).
   • ON by default (key nursin_mil_snd: "0" = off), 🔊/🔇 in the game header. No Audio (old browser / tests): silent, no throw. */
(function (w, d) {
  var KEY = "nursin_mil_snd", BASE = "assets/sounds/", VER = "20261030r", FADE_MS = 150;
  var FILES = { bed: "mil-bed.mp3", tick: "mil-tick.mp3", lockin: "mil-lock.mp3", correct: "mil-correct.mp3", wrong: "mil-wrong.mp3",
    buzzer: "mil-timeout.mp3", safe: "mil-safe.mp3", lifeline: "mil-lifeline.mp3", fanfare: "mil-win.mp3" };
  var VOL = { bed: 0.85, tick: 1 }, el = {}, ok = {}, fading = 0, st = { running: false, paused: false, last: -1 };
  function on() { try { return w.localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
  function set(v) { try { w.localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} if (!v) { stop(); hush(); } return on(); }
  function hidden() { return !!(d && d.hidden); }
  function quiet(p) { if (p && p.then) p.then(null, function () {}); return p; }   // play() promises: a refusal is not an error here
  function mk(k) {   // one <audio> per sound, made once
    if (el[k]) return el[k];
    var A = w.Audio; if (!A || !FILES[k]) return null;
    try {
      var a = new A(); a.preload = "auto"; if (a.setAttribute) { a.setAttribute("playsinline", ""); a.setAttribute("webkit-playsinline", ""); }
      a.src = BASE + FILES[k] + "?v=" + VER; if (k === "bed") a.loop = true; a.volume = VOL[k] || 1; el[k] = a;
    } catch (e) { return null; }
    return el[k];
  }
  function session() { try { var s = w.navigator && w.navigator.audioSession; if (s && s.type !== "playback") s.type = "playback"; } catch (e) {} }
  function unlock() {   // from a user tap: make + unlock every element (muted play → pause inside the gesture), once each
    if (!on()) return false; session();
    var n = 0;
    for (var k in FILES) {
      var a = mk(k); if (!a) continue; n++;
      if (ok[k]) continue; ok[k] = 1;
      if (k === "bed" && st.running && !st.paused) continue;   // about to really play
      try { a.muted = true; quiet(a.play()); a.pause(); a.currentTime = 0; } catch (e) {} a.muted = false;
    }
    if (st.running && !st.paused && el.bed && el.bed.paused && !fading) bed(false);   // iOS dropped it (call, other app) → back on the tap
    return n > 0;
  }
  function bed(fromTop) {   // the question bed on (fromTop: a new question)
    if (!st.running || st.paused || !on() || hidden()) return false;
    var a = mk("bed"); if (!a) return false;
    clearTimeout(fading); fading = 0;
    try { a.muted = false; a.volume = VOL.bed; if (fromTop) a.currentTime = 0; quiet(a.play()); } catch (e) { return false; }
    return true;
  }
  function bedOff(reset) {   // ~150 ms fade, then pause (iOS ignores .volume, so there it is a clean stop after 150 ms)
    var a = el.bed; if (!a) return; clearTimeout(fading); fading = 0;
    if (a.paused) { if (reset) try { a.currentTime = 0; } catch (e) {} return; }
    var steps = 5, i = 0;
    (function step() {
      i++; try { a.volume = Math.max(0, VOL.bed * (1 - i / steps)); } catch (e) {}
      if (i < steps) { fading = setTimeout(step, FADE_MS / steps); return; }
      fading = 0; try { a.pause(); if (reset) a.currentTime = 0; a.volume = VOL.bed; } catch (e) {}
    })();
  }
  function hush(keep) {   // cut the short sounds now (keep: one name to leave ringing)
    for (var k in el) { if (k === "bed" || k === keep) continue; try { if (!el[k].paused) el[k].pause(); el[k].currentTime = 0; } catch (e) {} }
  }
  function stop() { st.running = false; st.paused = false; st.last = -1; bedOff(true); hush(); }   // everything off
  /* the per-second plan: pure, so it is unit-tested without audio. The bed is the recording; the plan is the clock ticks on top */
  function plan(s) {
    var L = [];
    if (s <= 0 || s > 10) return L;
    var r = Math.round((1 + 0.03 * (10 - s)) * 100) / 100;   // a little higher each second: 1.00 at 10 s → 1.27 at 1 s
    L.push({ k: "tick", at: 0, rate: r });
    if (s <= 5) L.push({ k: "tick", at: 0.5, rate: r });
    return L;
  }
  function tick(rate) {
    if (!st.running || st.paused || !on() || hidden()) return;
    var a = mk("tick"); if (!a) return;
    try { a.preservesPitch = a.mozPreservesPitch = a.webkitPreservesPitch = false; a.playbackRate = rate; a.currentTime = 0; quiet(a.play()); } catch (e) {}
  }
  function start() { stop(); st.running = true; bed(true); }   // a new question: the bed from the top
  function pause(p) {   // lifeline dialog: the bed pauses where it is (and resumes there); a ringing tick stops
    if (!st.running) return; st.paused = !!p; st.last = -1;
    if (p) { clearTimeout(fading); fading = 0; if (el.bed) try { el.bed.pause(); } catch (e) {} if (el.tick) try { el.tick.pause(); } catch (e) {} }
    else bed(false);
  }
  function second(s) {   // the game's timer calls this on every change of the whole second shown
    if (!st.running || st.paused || s === st.last) return [];
    st.last = s; if (!on() || hidden()) return [];
    var L = plan(s);
    L.forEach(function (x) { if (x.at) setTimeout(function () { if (st.last === s) tick(x.rate); }, x.at * 1000); else tick(x.rate); });
    return L;
  }
  function fx(name) {   // one short recorded clip; returns its name when it was started
    if (!on() || hidden() || name === "bed" || name === "tick") return "";
    var a = mk(name); if (!a) return "";
    try { a.currentTime = 0; quiet(a.play()); } catch (e) { return ""; }
    return name;
  }
  if (d && d.addEventListener) d.addEventListener("visibilitychange", function () {
    if (d.hidden) { st.last = -1; bedOff(false); hush(); }
    else if (st.running && !st.paused) bed(false);
  });
  w.NursinMilSnd = { KEY: KEY, FILES: FILES, BASE: BASE, on: on, set: set, unlock: unlock, start: start, pause: pause, stop: stop, second: second, plan: plan, fx: fx,
    state: function () { var b = el.bed; return { running: st.running, paused: st.paused, last: st.last, made: Object.keys(el).length, unlocked: Object.keys(ok).length, bed: !!(b && !b.paused), fading: !!fading }; } };
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);

(function (w, d) {
  var K = "nursin_mil_v1", N = 15, SECS = 30, LOCK_MS = 1000;
  var LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000], SAFE = [5, 10];
  var EXAMS = [   // mirror of assets/midterm.js EXAMS (date → subjects; "*" = every subject not listed elsewhere) — tests keep it equal
    { d: "2026-11-14", subs: ["prev", "rea"] }, { d: "2026-11-16", subs: ["*"] },
    { d: "2026-11-21", subs: ["psych", "geri", "quality"] }, { d: "2026-11-28", subs: ["comm", "pharma"] }
  ];
  var PAGE = { cardio: "cardio.html", neuro: "neuro.html", henderson: "henderson.html", law: "law.html", mgmt: "mgmt.html", quality: "quality.html", pharma: "pharma.html", rea: "rea.html", geri: "geri.html", comm: "community.html", medsurg: "medsurg.html" };
  var AR = ["أ", "ب", "ج", "د", "هـ"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function strip(h) { return String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); }
  function fr(s) { var G = w.NursinGames; return G && G.fr ? G.fr(strip(s)) : esc(strip(s)); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function shuffle(a, rnd) { rnd = rnd || Math.random; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var M = w.NursinMid; if (M && M.today) try { return M.today(); } catch (e) {} var t = new Date(); return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()); }

  /* ---- data (pure; tests call these) ---- */
  function bank() { return w.QUIZ || []; }
  function subjects() { return w.QSUBJ || {}; }
  function subjOf(t) { var g = w.QGROUPS || {}; for (var k in g) if (g[k].indexOf(t) >= 0) return k; return ""; }
  function usable(q) { return q && q.id && q.q && q.o && q.o.length >= 2 && q.o.length <= 5 && q.a >= 0 && q.a < q.o.length && !/^نفس /.test(strip(q.q)); }
  function qsOf(s) { return bank().filter(function (q) { return usable(q) && (s === "all" || subjOf(q.t) === s); }); }
  function exams() { var M = w.NursinMid; return M && M.EXAMS ? M.EXAMS : EXAMS; }
  function examOf(s) { var E = exams(); for (var i = 0; i < E.length; i++) if (E[i].subs.indexOf(s) > -1) return E[i].d; for (i = 0; i < E.length; i++) if (E[i].subs.indexOf("*") > -1) return E[i].d; return ""; }
  function subsAt(day) {   // the subjects (with questions on the site) of one exam date
    var S = subjects(), out = [];
    for (var k in S) if (examOf(k) === day && qsOf(k).length) out.push(k);
    return out;
  }
  function nextExam(day) {   // the next exam date that has subjects with questions (today's exam counts until the day ends)
    day = day || today(); var E = exams();
    for (var i = 0; i < E.length; i++) if (E[i].d >= day && subsAt(E[i].d).length) return { d: E[i].d, subs: subsAt(E[i].d) };
    return null;
  }
  function diff(q) { var n = strip(q.q).length; for (var i = 0; i < q.o.length; i++) n += strip(q.o[i]).length; return n; }
  function poolFor(sel, day) {   // sel: a subject key, "all", or "exam"
    var list, subs;
    if (sel === "all") return qsOf("all");
    if (sel === "exam") { var x = nextExam(day); subs = x ? x.subs : []; }
    else subs = [sel];
    list = []; subs.forEach(function (s) { list = list.concat(qsOf(s)); });
    if (list.length < N && subs.length) {   // too few → the other subjects of the same exam date
      var dd = examOf(subs[0]); subsAt(dd).forEach(function (s) { if (subs.indexOf(s) < 0) list = list.concat(qsOf(s)); });
    }
    return list;
  }
  function pick(sel, n, rnd, day) {   // n unique questions, increasing difficulty; [] + .short when the pool is too small
    n = n || N; rnd = rnd || Math.random;
    var seen = {}, pool = poolFor(sel, day).filter(function (q) { var k = strip(q.q); if (seen[q.id] || seen[k]) return false; seen[q.id] = seen[k] = 1; return true; });
    if (pool.length < n) { var e = []; e.short = true; e.have = pool.length; return e; }
    pool = shuffle(pool, rnd).sort(function (a, b) { return diff(a) - diff(b); });
    var out = [];
    for (var i = 0; i < n; i++) { var lo = Math.floor(i * pool.length / n), hi = Math.floor((i + 1) * pool.length / n); out.push(pool[lo + Math.floor(rnd() * (hi - lo))]); }
    return out;
  }
  function shuffled(q, rnd) {   // a copy with its options shuffled; .a follows the right one
    var ord = shuffle(q.o.map(function (_, i) { return i; }), rnd);
    return { id: q.id, t: q.t, l: q.l, q: q.q, x: q.x, src: q, o: ord.map(function (i) { return q.o[i]; }), a: ord.indexOf(q.a) };
  }
  function fifty(n, a, rnd) {   // the indexes to remove: every wrong option but one random wrong
    var wr = []; for (var i = 0; i < n; i++) if (i !== a) wr.push(i);
    wr = shuffle(wr, rnd); return wr.slice(1).sort();
  }
  function audience(n, a, removed, rnd) {   // percents: right 60–75 (max), the rest random among the options still in play; sums 100
    rnd = rnd || Math.random; removed = removed || [];
    var p = [], i, live = []; for (i = 0; i < n; i++) { p.push(0); if (i !== a && removed.indexOf(i) < 0) live.push(i); }
    if (!live.length) { p[a] = 100; return p; }
    var c = 60 + Math.floor(rnd() * 16), rest = 100 - c, wt = live.map(function () { return 0.2 + rnd(); }), sum = 0;
    wt.forEach(function (x) { sum += x; });
    var given = 0; live.forEach(function (k, j) { p[k] = Math.floor(rest * wt[j] / sum); given += p[k]; });
    p[live[0]] += rest - given; p[a] = c;
    return p;
  }
  function safeAt(k) { var s = 0; SAFE.forEach(function (x) { if (k >= x) s = LADDER[x - 1]; }); return s; }
  function payout(k, how) {   // k = questions answered right; how: "win" | "walk" | "wrong"
    if (how === "win" || k >= N) return LADDER[N - 1];
    if (how === "walk") return k > 0 ? LADDER[k - 1] : 0;
    return safeAt(k);
  }
  function osman(q) {   // 📞 the lesson name + the first sentence of the item's own explanation (never a letter)
    var t = lessonName(q), x = strip(q.x || ""), s = x.split(/[.!؟?\n]\s|[.!؟?]$/)[0] || "";
    if (q.o && q.a >= 0) {   // a hint, not the answer: the right option's own words (or its part before «(») are blanked
      var r = strip(q.o[q.a]), r0 = r.split(" (")[0];
      [r, r0].forEach(function (z) { if (z.length >= 4) s = s.split(z).join("…"); });
    }
    if (s.length > 160) s = s.slice(0, 157) + "…";
    return { les: t, hint: s.trim() };
  }
  function whyLine(q, k) {   // 30q: ❓ «ليش غلط؟» for HIS option (assets/wrongx.js: the bank's per-option .why, else x, else the generic line)
    if (k == null || k < 0 || k === q.a || !q.o[k]) return "";
    var X = w.NursinWX, y = null, t = "";
    try { if (X && X.why) y = X.why(q, k, []); } catch (e) {}
    t = (y && y.w) || (X && X.fallback ? X.fallback(q) : "هيدا الخيار ما بينطبق هون — الصح هو: " + strip(q.o[q.a]));
    return '<p class="mlwhy">❓ <b>ليش غلط؟</b> (' + AR[k] + ") " + fr(t) + "</p>";
  }
  function lessonName(q) { var s = subjOf(q.t), L = (w.QLES || {})[s], T = w.QTOP || {}; return strip((L && q.l && L[q.l]) || T[q.t] || (subjects()[s] || "")); }
  function lessonHref(q) {
    var X = w.NursinWX, h = "";
    try { if (X && X.hrefOf) h = X.hrefOf(q.src || q); } catch (e) {}
    if (h) return h;
    var s = subjOf(q.t), p = PAGE[s] || "quiz.html";
    return p + (s === "cardio" || s === "neuro" ? "#" + q.t : "");
  }

  /* ---- storage ---- */
  function load() { try { return JSON.parse(localStorage.getItem(K) || "null") || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} }

  /* ---- sound: window.NursinMilSnd (above) ---- */
  function SND() { return w.NursinMilSnd || { on: function () { return false; }, set: function () { return false; }, unlock: function () {}, start: function () {}, pause: function () {}, stop: function () {}, second: function () { return []; }, fx: function () { return []; } }; }
  function sndOn() { return SND().on(); }

  /* ---- UI ---- */
  var ov = null, st = null, tick = 0, sel = "exam";
  function $(s) { return ov.querySelector(s); }
  function build() {
    if (ov) return;
    ov = d.createElement("div"); ov.className = "mil"; ov.id = "mil"; ov.hidden = true; ov.setAttribute("dir", "rtl"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "مين بدو يربح المليون؟");
    ov.innerHTML = '<div class="mltop"><button type="button" class="mlx" data-mlx="1" aria-label="سكّر">✕</button><b class="mltt">🏆 مين بدو يربح المليون؟</b><button type="button" class="mlsnd" data-mlsnd="1" aria-label="الصوت"></button></div><div class="mlbody" id="mlbody"></div>';
    d.body.appendChild(ov);
    ov.addEventListener("click", onClick);
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov && !ov.hidden) { if ($(".mldlg")) closeDlg(); else close(); } });
    w.addEventListener("popstate", function () { if (ov && !ov.hidden && location.hash !== "#mil") close(true); });
  }
  function paintSnd() { var b = $(".mlsnd"); if (b) { b.textContent = sndOn() ? "🔊" : "🔇"; b.setAttribute("aria-pressed", sndOn() ? "true" : "false"); } }
  function open() {
    build(); ov.hidden = false; d.documentElement.classList.add("mil-open"); paintSnd();
    if (location.hash !== "#mil") { try { history.pushState({ mil: 1 }, "", "#mil"); } catch (e) {} }
    startScreen();
  }
  function close(fromPop) {
    stopT(); SND().stop(); if (!ov) return; ov.hidden = true; d.documentElement.classList.remove("mil-open"); st = null;
    if (!fromPop && location.hash === "#mil") { try { if (history.state && history.state.mil) history.back(); else history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  }
  function body(h) { var b = $("#mlbody"); b.innerHTML = h; b.scrollTop = 0; }

  function examLabel(x) { if (!x) return ""; var p = x.d.split("-"), S = subjects(); return " · " + (+p[2]) + "/" + (+p[1]) + ": " + x.subs.map(function (s) { return S[s]; }).join(" + "); }
  function startScreen() {
    stopT(); SND().stop(); st = null;
    var S = subjects(), x = nextExam(), b = load(), h = "";
    if (sel === "exam" && !x) sel = "all";
    h += '<p class="mlintro">١٥ سؤال من دروسك، كل ما تطلع بيصعب 📈 · ٣ مساعدات · ٣٠ ثانية للسؤال · 🔒 نقاط أمان عند السؤال ٥ و١٠</p>';
    h += '<p class="mlh">اختار:</p><div class="mlpick" id="mlpick">';
    if (x) h += '<button type="button" class="mlch' + (sel === "exam" ? " on" : "") + '" data-mls="exam">🎯 امتحاني الجاي<small>' + esc(examLabel(x)) + "</small></button>";
    h += '<button type="button" class="mlch' + (sel === "all" ? " on" : "") + '" data-mls="all">🔀 كل المواد</button>';
    for (var k in S) if (qsOf(k).length) h += '<button type="button" class="mlch' + (sel === k ? " on" : "") + '" data-mls="' + esc(k) + '">' + esc(S[k]) + "</button>";
    h += "</div>";
    h += '<button type="button" class="mlgo" data-mlgo="1">▶️ يلّا نبلّش</button>';
    h += '<p class="mlbest">🏅 أحسن نتيجة إلك: <b>' + num(b.best | 0) + "</b> نقطة" + (b.n ? " · لعبت " + b.n + (b.n === 1 ? " مرة" : " مرات") : "") + "</p>";
    h += missList(b.miss || [], 0);
    body(h);
  }
  function begin() {
    SND().unlock();   // the start tap = the gesture iOS needs for audio
    var qs = pick(sel);
    if (qs.short) { body('<p class="mlintro">😕 ما في أسئلة كفاية بهالمادة بعد (' + qs.have + " من " + N + ').</p><p class="small">جرّب «🔀 كل المواد» أو مادة تانية.</p><button type="button" class="mlgo" data-mlhome="1">رجوع</button>'); return; }
    st = { qs: qs.map(function (q) { return shuffled(q); }), i: 0, k: 0, used: {}, rm: [], left: SECS * 1000, at: 0, busy: false, miss: [], done: false };
    ask();
  }
  function ladder() {
    var h = '<ol class="mlladder" aria-label="سلّم النقاط">';
    for (var i = 0; i < N; i++) {
      var c = i === st.i ? " cur" : i < st.k ? " won" : "", s = SAFE.indexOf(i + 1) > -1 ? " safe" : "";
      h += '<li class="mlst' + c + s + '"><i>' + (i + 1) + "</i><b>" + (SAFE.indexOf(i + 1) > -1 ? "🔒 " : "") + num(LADDER[i]) + "</b></li>";
    }
    return h + "</ol>";
  }
  function ask() {
    var q = st.qs[st.i]; st.rm = []; st.busy = false; st.left = SECS * 1000; st.ls = -1; SND().start();
    var h = '<div class="mlplay">' + ladder() +
      '<div class="mlbar"><span class="mlqn">سؤال ' + (st.i + 1) + " / " + N + ' · <b>' + num(LADDER[st.i]) + '</b></span><span class="mltm" id="mltm" aria-live="off">' + SECS + "</span></div>" +
      '<div class="mlll">' + ll("ff", "٥٠:٥٠") + ll("ph", "📞 اسأل عثمان") + ll("au", "👥 رأي الجمهور") + "</div>" +
      '<div class="mlq" dir="rtl">' + fr(q.q) + "</div>" +
      '<div class="mlopts" id="mlopts">' + q.o.map(function (o, i) { return '<button type="button" class="mlo" data-mlo="' + i + '"><i>' + AR[i] + "</i><span>" + fr(o) + "</span></button>"; }).join("") + "</div>" +
      '<div class="mlfb" id="mlfb" role="status"></div>' +
      '<button type="button" class="mlwalk" data-mlwalk="1">🛑 انسحب واحفظ النقاط (' + num(payout(st.k, "walk")) + ")</button></div>";
    body(h);
    var cur = $(".mlst.cur"); if (cur && cur.scrollIntoView) try { cur.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    runT();
  }
  function ll(k, t) { return '<button type="button" class="mlll1' + (st.used[k] ? " used" : "") + '" data-mlll="' + k + '"' + (st.used[k] ? " disabled" : "") + ">" + t + "</button>"; }

  /* timer: wall clock, paused while a dialog is open */
  function runT() { stopT(); st.at = Date.now(); tick = setInterval(function () { if (!st || st.busy || st.paused) return; var now = Date.now(); st.left -= now - st.at; st.at = now; paintT(); if (st.left <= 0) { stopT(); answer(-1); } }, 250); paintT(); }
  function stopT() { clearInterval(tick); tick = 0; }
  function paintT() {
    var e = ov && $("#mltm"); if (!e || !st) return; var s = Math.max(0, Math.ceil(st.left / 1000));
    e.textContent = s; e.className = "mltm" + (s <= 10 ? " low" : "") + (s <= 5 ? " vlow" : "");
    if (s !== st.ls) {   // a new whole second: its sound + (last 10 s) one red flash, faded by a CSS transition — no animation loop
      st.ls = s; if (!st.busy && !st.paused) SND().second(s);
      if (s <= 10 && s > 0) { e.classList.add("fl"); setTimeout(function () { e.classList.remove("fl"); }, s <= 5 ? 220 : 320); }
    }
  }
  function pause(on) { if (!st) return; if (!on) { st.at = Date.now(); st.ls = -1; } st.paused = on; SND().pause(on); }

  function answer(k) {
    if (!st || st.busy) return; st.busy = true; stopT(); SND().stop(); SND().fx(k >= 0 ? "lockin" : "buzzer");
    var q = st.qs[st.i], B = ov.querySelectorAll("[data-mlo]");
    [].forEach.call(ov.querySelectorAll("[data-mlll],[data-mlwalk]"), function (b) { b.disabled = true; });
    [].forEach.call(B, function (b) { b.disabled = true; });
    if (k >= 0 && B[k]) B[k].classList.add("lock");
    $("#mlfb").innerHTML = k >= 0 ? '<p class="mlwait">🔒 جواب نهائي؟ …</p>' : "";
    setTimeout(function () { reveal(q, k, B); }, k >= 0 ? LOCK_MS : 50);
  }
  function reveal(q, k, B) {
    if (!st || st.qs[st.i] !== q) return;
    var good = k === q.a;
    if (k >= 0 && B[k]) B[k].classList.remove("lock");
    if (B[q.a]) B[q.a].classList.add("ok"); if (!good && k >= 0 && B[k]) B[k].classList.add("bad");
    try { if (w.NursinSRS && w.NursinSRS.record) w.NursinSRS.record(q.src, good); } catch (e) {}
    if (k >= 0) SND().stop();   // cuts the lock-in chord (a time-out keeps its buzzer)
    if (good) {
      st.k++; var lvl = st.k; SND().fx(SAFE.indexOf(lvl) > -1 ? "safe" : "correct");
      if (lvl >= N) { $("#mlfb").innerHTML = '<p class="mlok">✅ صح!</p>'; return setTimeout(function () { end("win"); }, 1200); }
      var sf = SAFE.indexOf(lvl) > -1;
      $("#mlfb").innerHTML = '<p class="mlok">✅ صح! معك ' + num(LADDER[lvl - 1]) + (sf ? " · 🔒 ضمنتهن!" : "") + '</p><button type="button" class="mlnext" data-mlnext="1">السؤال الجاي ⬅️</button>';
      return;
    }
    st.miss.push(q); if (k >= 0) SND().fx("wrong");
    $("#mlfb").innerHTML = '<p class="mlbad">' + (k < 0 ? "⏰ خلص الوقت! " : "❌ غلط. ") + "الصح: <b>" + AR[q.a] + "</b> " + fr(q.o[q.a]) + "</p>" + whyLine(q, k) + (q.x ? '<p class="mlx2">💡 ' + fr(q.x) + "</p>" : "") +
      '<button type="button" class="mlnext" data-mlend="1">شوف النتيجة ⬅️</button>';
    var f = $("#mlfb"); if (f && f.scrollIntoView) try { f.scrollIntoView({ block: "nearest" }); } catch (e) {}
  }
  function next() { if (!st) return; st.i++; ask(); }

  function lifeline(k) {
    if (!st || st.busy || st.used[k]) return;
    var q = st.qs[st.i]; st.used[k] = 1;
    var b = ov.querySelector('[data-mlll="' + k + '"]'); if (b) { b.classList.add("used"); b.disabled = true; }
    SND().fx("lifeline");
    if (k === "ff") {
      st.rm = fifty(q.o.length, q.a);
      st.rm.forEach(function (i) { var o = ov.querySelector('[data-mlo="' + i + '"]'); if (o) { o.classList.add("gone"); o.disabled = true; } });
      return;
    }
    var h;
    if (k === "ph") {
      var o = osman(q);
      h = '<p class="mldt">📞 الأستاذ عثمان عالخط:</p><p>«هيدا من درس <b>' + fr(o.les) + "</b>" + (o.hint ? ". تذكّر: " + fr(o.hint) : ". ارجع لهالدرس بالذاكرة…") + '»</p><p class="small">ما بقلّك الحرف، بس هيدي الفكرة 😉</p>';
    } else {
      var p = audience(q.o.length, q.a, st.rm);
      h = '<p class="mldt">👥 رأي الجمهور:</p><div class="mlaud">' + p.map(function (v, i) { return '<div class="mlab' + (st.rm.indexOf(i) > -1 ? " gone" : "") + '"><span class="mlabv">' + v + '%</span><span class="mlabb"><i style="height:' + v + '%"></i></span><b>' + AR[i] + "</b></div>"; }).join("") + "</div>";
    }
    pause(true);
    var dl = d.createElement("div"); dl.className = "mldlg"; dl.innerHTML = '<div class="mldbox" role="dialog">' + h + '<button type="button" class="mlnext" data-mldc="1">رجوع للسؤال</button></div>';
    ov.appendChild(dl);
  }
  function closeDlg() { var x = $(".mldlg"); if (x) x.parentNode.removeChild(x); pause(false); }

  function end(how) {
    stopT(); SND().stop(); if (!st || st.done) return; st.done = true;
    var pts = payout(st.k, how), b = load(), nb = pts > (b.best | 0);
    if (pts >= LADDER[SAFE[0] - 1]) setTimeout(function () { if (ov && !ov.hidden && st && st.done) SND().fx("fanfare"); }, 150);
    b.n = (b.n | 0) + 1; if (nb) b.best = pts;
    var mm = st.miss.map(function (q) { return { id: q.id, t: q.t, l: q.l || "" }; }).concat(b.miss || []), seen = {};
    b.miss = mm.filter(function (m) { var kk = m.t + ":" + m.l; if (seen[kk]) return false; seen[kk] = 1; return true; }).slice(0, 8);
    save(b);
    var title = how === "win" ? "🎉🏆 ربحت المليون!" : how === "walk" ? "🛑 انسحبت بذكاء" : st.k >= 5 ? "🔒 رجعت عنقطة الأمان" : "😅 هالمرة ما زبطت";
    var h = '<div class="mlres"><p class="mlrt">' + title + '</p><p class="mlpts"><b>' + num(pts) + '</b> نقطة</p><p class="small">جاوبت صح ' + st.k + " من " + N + "</p>" +
      (nb && pts ? "<p>🏅 <b>أحسن نتيجة إلك!</b></p>" : '<p class="small">أحسن نتيجة إلك: <b>' + num(b.best | 0) + "</b></p>") + '<p class="small" id="mlgp"></p>' +
      missList(b.miss, st.miss.length) +
      '<div class="mlbtns"><button type="button" class="mlgo" data-mlgo="1">🔁 العب مرة تانية</button><button type="button" class="mlnext" data-mlhome="1">غيّر المادة</button></div></div>';
    body(h);
    var S = w.NursinStudy; if (S && S.activity) try { S.activity("game", Math.min(15, st.k), "مين بدو يربح المليون؟", d.getElementById("mlgp")); } catch (e) {}
  }
  function missList(list, fresh) {
    if (!list || !list.length) return "";
    var h = '<div class="mlmiss"><p class="mlh">📚 راجع الدروس اللي غلطت فيها:</p><ul>', seen = {};
    list.forEach(function (m, i) {
      var q = null; bank().some(function (x) { if (x.id === m.id) { q = x; return true; } return false; }); q = q || m;
      var nm = lessonName(q); if (!nm || seen[nm]) return; seen[nm] = 1;
      h += '<li><a href="' + esc(lessonHref(q)) + '">' + (i < fresh ? "🆕 " : "📖 ") + fr(nm) + "</a></li>";
    });
    return h + "</ul></div>";
  }

  function onClick(e) {
    var t = e.target.closest && e.target.closest("button,a"); if (!t || !ov.contains(t)) return;
    SND().unlock();   // every tap in the game: iOS lets <audio> play only after a play() inside a gesture (30p)
    if (t.hasAttribute("data-mlx")) { if (st && !st.done && st.i > 0 && !w.confirm("تطلع من اللعبة؟ (النقاط ما بتنحفظ)")) return; close(); return; }
    if (t.hasAttribute("data-mlsnd")) { var on = SND().set(!sndOn()); paintSnd(); if (on) { SND().unlock(); SND().fx("lifeline"); if (st && !st.busy && !st.done) { SND().start(); if (st.paused) SND().pause(true); } } return; }
    if (t.hasAttribute("data-mls")) { sel = t.getAttribute("data-mls"); [].forEach.call(ov.querySelectorAll("[data-mls]"), function (c) { c.classList.toggle("on", c === t); }); return; }
    if (t.hasAttribute("data-mlgo")) { begin(); return; }
    if (t.hasAttribute("data-mlhome")) { startScreen(); return; }
    if (t.hasAttribute("data-mlo")) { answer(+t.getAttribute("data-mlo")); return; }
    if (t.hasAttribute("data-mlll")) { lifeline(t.getAttribute("data-mlll")); return; }
    if (t.hasAttribute("data-mldc")) { closeDlg(); return; }
    if (t.hasAttribute("data-mlnext")) { next(); return; }
    if (t.hasAttribute("data-mlend")) { end("wrong"); return; }
    if (t.hasAttribute("data-mlwalk")) { if (st && !st.busy && w.confirm("تنسحب وتاخد " + num(payout(st.k, "walk")) + " نقطة؟")) end("walk"); return; }
    if (t.tagName === "A") close(true);
  }

  w.NursinMil = { whyLine: whyLine, N: N, SECS: SECS, LADDER: LADDER, SAFE: SAFE, EXAMS: EXAMS, pick: pick, poolFor: poolFor, qsOf: qsOf, nextExam: nextExam, subsAt: subsAt, examOf: examOf, diff: diff, shuffled: shuffled, fifty: fifty, audience: audience, payout: payout, safeAt: safeAt, osman: osman, lessonName: lessonName, lessonHref: lessonHref, open: open, close: close };
  if (!d || !d.addEventListener) return;
  function boot() {
    var c = d.querySelector("[data-mil]"); if (c) { c.addEventListener("click", function (e) { e.preventDefault(); open(); }); var bb = c.querySelector(".gbest"); if (bb && load().best) bb.textContent = "أحسن نتيجة: " + num(load().best) + " نقطة"; }
    if (location.hash === "#mil" && d.getElementById("gcards")) open();
    w.addEventListener("hashchange", function () { if (location.hash === "#mil" && (!ov || ov.hidden) && d.getElementById("gcards")) open(); });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
