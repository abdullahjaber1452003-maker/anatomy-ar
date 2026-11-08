/* 🏆 «مين بدو يربح المليون؟» (Abdullah, Nov 8 2026 8:37 AM: «شو رأيك نعمل شي متل من سيربح المليون») — 20261030o.
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
     ("game", ≤ 15 points, same caps as the other games). Sound: see the 🔊 block above (30n, ON by default). No continuous animations. No ads in here. */
/* 🔊 30n — the show's sound, SYNTHESIZED with Web Audio (Abdullah, Nov 8 2026 8:57 AM: «بدي يطلع صوت اللي انه عم يخلص الوقت متل الحقيقية»).
   No audio files, no downloads: oscillators + gain envelopes only, scheduled ONE SECOND AT A TIME by the game's own timer (no audio loop).
   • Each question: a short «sting» when it appears, then a quiet continuous suspense bed (a low pad scheduled per second, overlapping)
     with a soft low heartbeat (sine ~60 Hz) once a second. Last 10 s: a clock tick every second, louder + higher each second,
     the heartbeat doubles. Last 5 s: two ticks a second, rising tone. Time out: a short descending buzzer.
   • lockin (rising chord ~1 s) · correct (major arpeggio) · wrong (low minor thud) · lifeline (shimmer) · safe (Q5/Q10 short fanfare) · fanfare (result ≥ safe level).
   • ON by default (key nursin_mil_snd: "0" = off), 🔊/🔇 in the game header. The AudioContext (webkitAudioContext on iOS 12) is created /
     resumed on the first tap. stop() cuts everything at once (answer, lifeline dialog, leaving, hidden tab). Without Web Audio: silent, no throw. */
(function (w, d) {
  var KEY = "nursin_mil_snd", ac = null, live = [], st = { running: false, paused: false, last: -1 };
  function on() { try { return w.localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
  function set(v) { try { w.localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} if (!v) stop(); return on(); }
  function hidden() { return !!(d && d.hidden); }
  function ctx() {
    if (ac) return ac;
    var C = w.AudioContext || w.webkitAudioContext; if (!C) return null;
    try { ac = new C(); } catch (e) { ac = null; } return ac;
  }
  function unlock() {   // call from a user tap (iOS needs the context made / resumed inside a gesture)
    if (!on()) return false;
    var c = ctx(); if (!c) return false;
    try { if (c.state === "suspended" && c.resume) c.resume(); var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start ? s.start(0) : s.noteOn(0); } catch (e) {}
    return true;
  }
  function forget(n) { var i = live.indexOf(n); if (i > -1) live.splice(i, 1); }
  function tone(f, at, dur, vol, type, f2, tag, pad) {   // one enveloped oscillator, `at` seconds from now (pad: slow in/out so seconds overlap)
    var c = ac; if (!c || !on() || hidden()) return;
    try {
      var t = c.currentTime + Math.max(0, at), o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      if (pad) { g.gain.linearRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + dur - 0.25); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
      else { g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
      var n = { o: o, g: g, tag: tag || "" }; live.push(n); o.onended = function () { forget(n); try { g.disconnect(); } catch (e) {} };
    } catch (e) {}
  }
  function play(list, tag) {
    if (ac && ac.state === "suspended" && ac.resume) try { ac.resume(); } catch (e) {}
    (list || []).forEach(function (x) { tone(x.f, x.at, x.dur, x.g, x.type, x.f2, tag, x.k === "bed"); }); return list; }
  function kill(only) {   // cut ringing / scheduled sounds now (only = "sus": just the suspense ones)
    live.slice().forEach(function (n) {
      if (only && n.tag !== only) return; forget(n);
      try { n.g.gain.cancelScheduledValues(0); n.g.gain.value = 0; n.o.stop(0); } catch (e) {} try { n.g.disconnect(); } catch (e) {}
    });
  }
  function stop() { st.running = false; st.paused = false; st.last = -1; kill(); }   // everything off
  /* the per-second plan: pure, so it is unit-tested without audio */
  function plan(s) {
    var L = [];
    if (s <= 0) return L;
    // the suspense bed: a low two-note pad, 1.3 s long each second (so it overlaps into one continuous drone), a semitone wobble
    // every other second; it only exists while the question runs and is cut with everything else on the answer
    var lo = s % 2 ? 110 : 116.5, bg = s > 10 ? 0.035 : 0.035 + 0.003 * (10 - s);
    L.push({ k: "bed", f: lo, at: 0, dur: 1.3, g: bg, type: "triangle" }, { k: "bed", f: lo * 1.5, at: 0, dur: 1.3, g: bg * 0.6, type: "triangle" });
    if (s > 10) { L.push({ k: "beat", f: 62, at: 0, dur: 0.22, g: 0.18 }); return L; }
    var u = (10 - s) / 9;   // 0 at 10 s → 1 at 1 s
    L.push({ k: "beat", f: 64, at: 0, dur: 0.18, g: 0.2 + 0.1 * u }, { k: "beat", f: 58, at: 0.26, dur: 0.18, g: 0.16 + 0.1 * u });
    var tf = 1400 + Math.round(600 * u), tg = 0.05 + 0.13 * u;
    L.push({ k: "tick", f: tf, at: 0, dur: 0.05, g: tg, type: "square" });
    if (s <= 5) L.push({ k: "tick", f: tf + 200, at: 0.5, dur: 0.05, g: tg, type: "square" }, { k: "rise", f: 330 + 40 * (5 - s), f2: 380 + 40 * (5 - s), at: 0, dur: 0.9, g: 0.04 + 0.02 * (5 - s), type: "triangle" });
    return L;
  }
  function start() { stop(); st.running = true; }
  function pause(p) { if (!st.running) return; st.paused = !!p; st.last = -1; if (p) kill("sus"); }   // lifeline dialog: suspense off, its shimmer stays
  function second(s) {   // the game's timer calls this on every change of the whole second shown
    if (!st.running || st.paused || s === st.last) return [];
    st.last = s; if (!on() || hidden()) return [];
    return play(plan(s), "sus");
  }
  var FX = {
    sting: [{ f: 110, f2: 55, at: 0, dur: 0.6, g: 0.25 }, { f: 440, f2: 880, at: 0, dur: 0.35, g: 0.05, type: "triangle" }, { f: 659, at: 0.08, dur: 0.5, g: 0.05, type: "triangle" }, { f: 988, at: 0.16, dur: 0.6, g: 0.04, type: "triangle" }],
    buzzer: [{ f: 220, f2: 90, at: 0, dur: 0.7, g: 0.22, type: "sawtooth" }, { f: 165, f2: 70, at: 0, dur: 0.7, g: 0.12, type: "square" }],
    lockin: [{ f: 220, f2: 440, at: 0, dur: 1, g: 0.08, type: "triangle" }, { f: 277, f2: 554, at: 0, dur: 1, g: 0.06, type: "triangle" }, { f: 330, f2: 659, at: 0, dur: 1, g: 0.06, type: "triangle" }],
    correct: [{ f: 523, at: 0, dur: 0.25, g: 0.16, type: "triangle" }, { f: 659, at: 0.1, dur: 0.25, g: 0.16, type: "triangle" }, { f: 784, at: 0.2, dur: 0.3, g: 0.16, type: "triangle" }, { f: 1047, at: 0.3, dur: 0.45, g: 0.14, type: "triangle" }],
    wrong: [{ f: 110, f2: 70, at: 0, dur: 0.6, g: 0.28 }, { f: 131, at: 0, dur: 0.5, g: 0.08, type: "triangle" }, { f: 156, at: 0, dur: 0.5, g: 0.06, type: "triangle" }],
    lifeline: [{ f: 1568, at: 0, dur: 0.18, g: 0.06 }, { f: 1976, at: 0.06, dur: 0.18, g: 0.06 }, { f: 2349, at: 0.12, dur: 0.22, g: 0.05 }, { f: 2637, at: 0.18, dur: 0.3, g: 0.04 }],
    safe: [{ f: 523, at: 0, dur: 0.15, g: 0.14, type: "triangle" }, { f: 523, at: 0.16, dur: 0.15, g: 0.14, type: "triangle" }, { f: 784, at: 0.32, dur: 0.5, g: 0.16, type: "triangle" }],
    fanfare: [{ f: 392, at: 0, dur: 0.2, g: 0.14, type: "triangle" }, { f: 523, at: 0.2, dur: 0.2, g: 0.14, type: "triangle" }, { f: 659, at: 0.4, dur: 0.2, g: 0.14, type: "triangle" }, { f: 784, at: 0.6, dur: 0.7, g: 0.16, type: "triangle" }, { f: 1047, at: 0.6, dur: 0.7, g: 0.08, type: "triangle" }]
  };
  function fx(name) { if (!on() || hidden()) return []; ctx(); return play(FX[name]); }
  if (d && d.addEventListener) d.addEventListener("visibilitychange", function () {
    if (d.hidden) { kill(); st.last = -1; if (ac && ac.suspend) try { ac.suspend(); } catch (e) {} }
    else if (ac && ac.resume && st.running) try { ac.resume(); } catch (e) {}
  });
  w.NursinMilSnd = { KEY: KEY, on: on, set: set, unlock: unlock, start: start, pause: pause, stop: stop, second: second, plan: plan, fx: fx, FX: FX,
    state: function () { return { running: st.running, paused: st.paused, last: st.last, live: live.length, ctx: !!ac }; } };
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
    var q = st.qs[st.i]; st.rm = []; st.busy = false; st.left = SECS * 1000; st.ls = -1; SND().start(); SND().fx("sting");
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
    $("#mlfb").innerHTML = '<p class="mlbad">' + (k < 0 ? "⏰ خلص الوقت! " : "❌ غلط. ") + "الصح: <b>" + AR[q.a] + "</b> " + fr(q.o[q.a]) + "</p>" + (q.x ? '<p class="mlx2">💡 ' + fr(q.x) + "</p>" : "") +
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
    if (t.hasAttribute("data-mlx")) { if (st && !st.done && st.i > 0 && !w.confirm("تطلع من اللعبة؟ (النقاط ما بتنحفظ)")) return; close(); return; }
    if (t.hasAttribute("data-mlsnd")) { var on = SND().set(!sndOn()); paintSnd(); if (on) { SND().unlock(); SND().fx("lifeline"); if (st && !st.busy && !st.done) { SND().start(); if (st.paused) SND().pause(true); } } return; }
    if (t.hasAttribute("data-mls")) SND().unlock();
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

  w.NursinMil = { N: N, SECS: SECS, LADDER: LADDER, SAFE: SAFE, EXAMS: EXAMS, pick: pick, poolFor: poolFor, qsOf: qsOf, nextExam: nextExam, subsAt: subsAt, examOf: examOf, diff: diff, shuffled: shuffled, fifty: fifty, audience: audience, payout: payout, safeAt: safeAt, osman: osman, lessonName: lessonName, lessonHref: lessonHref, open: open, close: close };
  if (!d || !d.addEventListener) return;
  function boot() {
    var c = d.querySelector("[data-mil]"); if (c) { c.addEventListener("click", function (e) { e.preventDefault(); open(); }); var bb = c.querySelector(".gbest"); if (bb && load().best) bb.textContent = "أحسن نتيجة: " + num(load().best) + " نقطة"; }
    if (location.hash === "#mil" && d.getElementById("gcards")) open();
    w.addEventListener("hashchange", function () { if (location.hash === "#mil" && (!ov || ov.hidden) && d.getElementById("gcards")) open(); });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
