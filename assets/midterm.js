/* 🎯 «امتحان الفصل 16/11» (Abdullah, Oct 31 2026 11:50–11:53 PM: «في عنا امتحان فصلي ب ١٦/١١ … من كل مادة يكون فيه الاستعداد ل امتحان
   الفصل وينعمل امتحان لكل المادة» — كل الدروس من كل المواد تقريباً; «ما يروح المسار، يكون موجود مع المسار»).
   • midterm.html: a live countdown to Monday Nov 16 2026 (08:00 Asia/Beirut), per subject a «امتحان كامل» (quiz.html?t=mid&s=<subject>),
     the best score per subject, «أضعف دروسك», and «خطة المراجعة» (Nov 1 → Nov 15, every subject twice, Nov 14–15 light review), ✅ per day.
   • build(s): a timed mock exam drawing from ALL the lessons of that subject, balanced per lesson: the quiz bank (QUIZ), the multiple-choice
     «عبّي الفراغ» items that belong to one lesson (BLANKS, cardio/neuro) and one question of the lesson's «حالة مريض» (CASES, when loaded).
     20–30 questions, 1 minute per question. Wrong answers go to نقاط ضعفك + مراجعة بكرا exactly like the quiz (assets/quiz.js answer()).
   • step(day): the ONE daily «🎯 تحضير امتحان الفصل» step of «مسار اليوم» (assets/home.js), only until Nov 15.
   Saved in localStorage nursin_mid_v1 {v, best:{s:{p,sc,n,at}}, last:{s:{p,at,d,byL}}, lw:{lessonId:pct}, plan:{day:ts}} and mirrored on the
   signed-in profile users/{uid}.midterm (the owner may merge a field there — same as dayPath; no rules change). No ads anywhere here. */
(function (w, d) {
  "use strict";
  var V = "20261030e", K = "nursin_mid_v1";
  var EXAM = "2026-11-16", START = "2026-11-01", EXAM_TS = Date.parse("2026-11-16T08:00:00+02:00");   // Lebanon = UTC+2 in November
  var MINQ = 20, MAXQ = 30;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today(now) {                                   // YYYY-MM-DD in Beirut (29q: formatToParts — WebKit/iOS en-CA format() gives «11/07/2026»)
    var t = now || new Date();
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(t).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    try { var f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(t); if (/^\d{4}-\d\d-\d\d$/.test(f)) return f; } catch (e) {}
    return new Date(+t + 2 * 36e5).toISOString().slice(0, 10);
  }
  function addDays(day, n) { return new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10); }
  function dayDiff(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }
  function daysLeft(day) { return Math.max(0, dayDiff(day || today(), EXAM)); }
  function active(day) { return (day || today()) < EXAM; }
  function countdown(now) {                                // {d,h,m,s,over} until 08:00 Beirut on Nov 16
    var ms = EXAM_TS - (now == null ? Date.now() : +now); if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    var t = Math.floor(ms / 1000); return { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60, over: false };
  }
  function shuffle(a, rnd) { rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function seeded(n) { var x = (n >>> 0) || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; }

  /* ---------------- subjects and lessons ---------------- */
  function NL() { return w.NLESSONS || {}; }
  function lid(l) { return l.s + ":" + (l.l || l.t); }
  function lessonsOf(s) {
    var L = NL().list || [], subs = s === "msall" ? ((NL().groups || {}).medsurg || {}).subs || ["cardio", "neuro", "henderson", "medsurg"] : [s];
    return L.filter(function (l) { return subs.indexOf(l.s) > -1; }).map(function (l) { return { id: lid(l), s: l.s, t: l.t, l: l.l || "", n: l.n, href: l.href }; });
  }
  function subjList() {                                    // every subject that has lessons on the site, in the site's order
    var S = NL().subjects || {}, out = [];
    Object.keys(S).forEach(function (k) { if (lessonsOf(k).length) out.push(k); });
    return out;
  }
  function subjName(s) {
    if (s === "msall") return T("Med-Surg كلّو", "Med-Surg complet");
    if (s === "weak") return T("أضعف دروسك", "Tes leçons faibles");
    if (s === "medsurg") { var ml = lessonsOf("medsurg"); if (ml.length === 1) return T("التسريب الوريدي", "Perfusion IV"); }
    var x = (NL().subjects || {})[s] || {}; return T(x.ar || s, x.fr || x.ar || s);
  }
  var EMO = { cardio: "🫀", neuro: "🧠", henderson: "🧩", medsurg: "💉", rea: "🚑", pharma: "💊", law: "⚖️", mgmt: "🏢", quality: "✅", geri: "👴", comm: "🏘️", msall: "🏥", weak: "💪" };
  function size(nLes) { var per = Math.max(1, Math.ceil(MINQ / Math.max(1, nLes))); return Math.min(MAXQ, Math.max(MINQ, per * nLes)); }
  function sizeOf(s) { return s === "weak" ? 10 : size(lessonsOf(s).length); }

  /* ---------------- the question pool of one lesson ---------------- */
  function ofQ(q, L) { for (var i = 0; i < L.length; i++) { var x = L[i]; if (x.t === q.t && (!x.l || x.l === q.l)) return x.id; } return null; }
  function caseItems(c) {                                  // one «حالة مريض» → its questions, each carrying the patient text
    var fr = FR() && c.fr ? c.fr : null, out = [];
    (c.qs || []).forEach(function (y, i) {
      if (!y || !y.o || y.o.length !== 3) return;
      var yf = fr && y.fr ? y.fr : null, pt = (fr ? fr.pt : c.pt) || "", v = (fr ? fr.v : c.v) || "";
      out.push({ id: "cs-" + c.id.replace(":", "-") + "-" + i, t: "", q: "🩺 " + pt + (v ? " (" + v + ")" : "") + "<br>" + (yf ? yf.q : y.q), o: yf && yf.o ? yf.o : y.o, a: y.a, x: yf ? yf.x : y.x, _k: "c" });
    });
    return out;
  }
  function pools(s, banks) {                               // {lessonId: [items]} for subject s
    banks = banks || {}; var L = lessonsOf(s), P = {}, i;
    L.forEach(function (l) { P[l.id] = []; });
    (banks.quiz || w.QUIZ || []).forEach(function (q) { var id = ofQ(q, L); if (id) P[id].push(q); });
    (banks.blanks || w.BLANKS || []).forEach(function (b) {   // «عبّي الفراغ» with 3 choices that belong to ONE lesson (cardio / neuro topics)
      if (!b || !b.o || b.o.length !== 3 || b.alts) return; var id = ofQ({ t: b.t, l: b.l }, L), k = b.o.indexOf(b.a); if (!id || k < 0) return;
      P[id].push({ id: b.id, t: b.t, q: "✍️ " + b.s, o: b.o, a: k, x: b.x || (b.s.replace("___", "«" + b.a + "»")), _k: "b" });
    });
    var C = banks.cases || w.CASES || [];
    for (i = 0; i < C.length; i++) if (P[C[i].id]) { var it = caseItems(C[i]); if (it.length) P[C[i].id].push({ _case: it }); }
    return P;
  }
  /* build(s, {rnd, n, banks}) → the exam: balanced per lesson (quota = n / lessons, the rest filled from the lessons with questions left),
     at most ONE case question per lesson, every item tagged _l = its lesson id. */
  function build(s, o) {
    o = o || {}; var rnd = o.rnd || Math.random;
    if (s === "weak") return buildWeak(o);
    var P = pools(s, o.banks), ids = Object.keys(P), n = o.n || size(ids.length), out = [], left = {}, quota = Math.ceil(n / Math.max(1, ids.length));
    ids.forEach(function (id) {
      var a = [], cs = [];
      P[id].forEach(function (q) { if (q._case) cs = cs.concat(q._case); else a.push(q); });
      shuffle(a, rnd); shuffle(cs, rnd);
      if (cs.length) a.splice(Math.floor(rnd() * Math.min(3, a.length + 1)), 0, cs.shift());   // one case question, early-ish
      while (a.length < quota && cs.length) a.push(cs.shift());                                  // a short lesson: more of its case
      left[id] = a;
    });
    var order = shuffle(ids.slice(), rnd), got = true;
    while (out.length < n && got) {                        // round-robin: one question per lesson per turn → balanced
      got = false;
      for (var i = 0; i < order.length && out.length < n; i++) { var q = left[order[i]].shift(); if (q) { got = true; out.push(tag(q, order[i])); } }
    }
    return shuffle(out, rnd);
  }
  function tag(q, id) { var c = {}, k; for (k in q) c[k] = q[k]; c._l = id; if (!c._k) c._k = "q"; return c; }
  function buildWeak(o) {                                  // ⚡ 10 questions from his weakest lessons (mock results, then mistakes), else from all
    var rnd = o.rnd || Math.random, n = o.n || 10, W = weakLessons(6), all = [], seen = {};
    subjList().forEach(function (s) { var P = pools(s, o.banks); Object.keys(P).forEach(function (id) { P[id].forEach(function (q) { if (!q._case && !seen[q.id]) { seen[q.id] = 1; all.push(tag(q, id)); } }); }); });
    var pick = W.length ? all.filter(function (q) { return W.indexOf(q._l) > -1; }) : [];
    shuffle(pick, rnd); shuffle(all, rnd);
    var out = pick.slice(0, n), have = {}; out.forEach(function (q) { have[q.id] = 1; });
    for (var i = 0; i < all.length && out.length < n; i++) if (!have[all[i].id]) { have[all[i].id] = 1; out.push(all[i]); }
    return out;
  }

  /* ---------------- results ---------------- */
  function load() { var x = lsGet(K); if (!x || typeof x !== "object") x = {}; x.v = 1; x.best = x.best || {}; x.last = x.last || {}; x.lw = x.lw || {}; x.plan = x.plan || {}; return x; }
  function save(x) { lsSet(K, x); push(); try { d.dispatchEvent(new CustomEvent("nursin:mid")); } catch (e) {} }
  function result(s, score, total, byL, now) {             // → {pct, best (bool new best), weak:[{id,p}]}
    var x = load(), at = now || Date.now(), pct = total ? Math.round(100 * score / total) : 0, b = x.best[s], nb = (!b || pct > (b.p | 0)) && (s === "weak" || total >= sizeOf(s));   // 29q: a 10-question plan quiz never becomes the «أحسن علامة»
    if (nb) x.best[s] = { p: pct, sc: score, n: total, at: at };
    var bl = {}; Object.keys(byL || {}).forEach(function (id) { var v = byL[id]; if (v && v[1]) { bl[id] = [v[0] | 0, v[1] | 0]; x.lw[id] = Math.round(100 * v[0] / v[1]); } });
    x.last[s] = { p: pct, at: at, d: today(new Date(at)), byL: bl };
    if (total >= 5) { x.h = x.h || {}; var hd = x.h[s] = x.h[s] || [], dy = today(new Date(at)); if (hd.indexOf(dy) < 0) { hd.push(dy); if (hd.length > 40) hd.shift(); } }   // 🎯 29q: the plan's task ticks ✓
    save(x);
    return { pct: pct, best: nb, prev: b ? b.p | 0 : null, weak: weakOf(bl) };
  }
  function weakOf(bl) {                                    // the lessons of this exam under 70 %, weakest first
    return Object.keys(bl || {}).map(function (id) { return { id: id, ok: bl[id][0], n: bl[id][1], p: Math.round(100 * bl[id][0] / bl[id][1]) }; })
      .filter(function (r) { return r.p < 70; }).sort(function (a, b) { return a.p - b.p || b.n - a.n; });
  }
  function weakLessons(max) {                              // his weakest lessons overall: last mock per lesson (< 70 %), then his mistakes (assets/weak.js)
    var x = load(), ids = Object.keys(x.lw).filter(function (id) { return x.lw[id] < 70; }).sort(function (a, b) { return x.lw[a] - x.lw[b]; });
    try {
      var it = (w.Weak && w.Weak.items ? w.Weak.items() : (lsGet("nursin_weak_v1") || {}).items) || {}, R = w.NursinRet, by = {};
      (w.QUIZ || []).forEach(function (q) { var e = it[q.id], id = e && R && R.ofQ ? R.ofQ(q) : null; if (id) by[id] = (by[id] || 0) + (e.miss | 0 || 1); });
      Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    } catch (e) {}
    return ids.slice(0, max || 5);
  }
  function lessonInfo(id) { var L = NL().list || []; for (var i = 0; i < L.length; i++) if (lid(L[i]) === id) return L[i]; return null; }

  /* ---------------- «خطة المراجعة»: Nov 1 → Nov 13 every subject twice (a big one with a small one), Nov 14–15 light review ---------------- */
  /* ---------------- 🎯 «خطة امتحان 16» (29q, Abdullah Nov 6 2:20 PM: «خطة لامتحان 16: بيعرف شو ضعيف عندك وبيقسم المواد عالأيام الباقية»)
     All local. readiness(s) per subject from what the site already keeps: accuracy = his 🧠 حفظ score per lesson (assets/hifz.js
     NursinRet.score), his mock results per lesson (lw) and best mock score; coverage = lessons opened (nursin_read_v1); recent mistakes
     (nursin_weak_v1, last 14 days). plan(day) = from `day` to Nov 15: every subject twice before Nov 14 (weakest first, a 1st pass
     = 10 questions + its weakest lesson, a 2nd pass = the full mock), class days (Thu/Fri/Sat) lighter, Nov 14–15 light review of
     weak points only. Today's tasks are fixed once shown (x.fix[day]); a task ticks ✓ by itself when that subject's quiz / mock is
     finished that day (x.h), or by hand (x.tk). Re-plans by itself: what was not done comes back from today on. */
  var LIGHT = addDays(EXAM, -2);                           // Nov 14
  function msSubs() { return ((NL().groups || {}).medsurg || {}).subs || ["cardio", "neuro", "henderson", "medsurg"]; }
  function isCls(day) { var g = new Date(day + "T12:00:00Z").getUTCDay(); return g === 4 || g === 5 || g === 6; }
  function readMap(o) { return (o && o.read) || lsGet("nursin_read_v1") || {}; }
  function weakItems(o) { if (o && o.weak) return o.weak; var x = lsGet("nursin_weak_v1"); return x && x.items || {}; }
  function retScore(o, id) { if (o && o.ret) return o.ret(id); var R = w.NursinRet; try { return R && R.score ? R.score(id) : null; } catch (e) { return null; } }
  function opened(id, m) { if (m[id]) return true; for (var k in m) if (k.indexOf(id + "#") === 0) return true; return false; }
  function readiness(s, o) {                               // → {r 0–100, acc|null, cov 0–1, miss, weakL: lesson id to read first}
    o = o || {}; var x = o.x || load(), L = lessonsOf(s), m = readMap(o), acc = [], op = 0, tp = {}, worst = null, wv = 101, firstNew = null, now = o.now || Date.now(), due = 0;
    L.forEach(function (l) {
      var v = [], r = retScore(o, l.id); if (r != null) v.push(+r); if (x.lw[l.id] != null) v.push(+x.lw[l.id]);
      if (v.length) { var a = v.reduce(function (p, c) { return p + c; }, 0) / v.length; acc.push(a); if (a < wv) { wv = a; worst = l.id; } if (r != null && +r < 40) due++; }   // 29v: a studied lesson faded under 40 = its spaced review is overdue
      if (opened(l.id, m)) op++; else if (!firstNew) firstNew = l.id;
      tp[l.t] = 1;
    });
    if (x.best[s] && x.best[s].p != null) acc.push(+x.best[s].p);
    var it = weakItems(o), miss = 0; for (var k in it) { var e = it[k]; if (e && tp[e.t] && (!e.last || now - e.last < 14 * 864e5)) miss++; }
    var a = acc.length ? acc.reduce(function (p, c) { return p + c; }, 0) / acc.length : null, cov = L.length ? op / L.length : 0;
    var r = Math.round((a == null ? 25 : a) * 0.6 + cov * 40 - Math.min(20, miss * 4) - Math.min(10, due * 2));
    return { r: Math.max(0, Math.min(100, r)), acc: a == null ? null : Math.round(a), cov: cov, miss: miss, due: due, weakL: (wv < 70 ? worst : null) || firstNew || worst || (L[0] && L[0].id) || "" };
  }
  function credits(x, d0) {                                // {subject: {day:1}} — the sessions done (quiz / mock finished, ticked, or the day marked)
    var c = {}, ms = msSubs();
    function add(s, day) { if (d0 && day >= d0) return; if (s === "msall") { ms.forEach(function (y) { add(y, day); }); return; } (c[s] = c[s] || {})[day] = 1; }
    Object.keys(x.h || {}).forEach(function (s) { (x.h[s] || []).forEach(function (day) { add(s, day); }); });
    Object.keys(x.tk || {}).forEach(function (day) { Object.keys(x.tk[day] || {}).forEach(function (s) { add(s, day); }); });
    Object.keys(x.plan || {}).forEach(function (day) { ((x.fix || {})[day] || []).forEach(function (t) { add(t.s, day); }); });
    return c;
  }
  function nDone(c, s) { return Object.keys(c[s] || {}).length; }
  function taskHref(t) { return t.s === "weak" ? "quiz.html?t=mid&s=weak&n=10" : "quiz.html?t=mid&s=" + t.s + (t.k === "quiz" ? "&n=10" : ""); }
  function mkTask(u, k, R) { var rd = R[u.s] || {}; return { s: u.s, k: k, les: u.s === "weak" ? "" : (rd.weakL || "") }; }
  function smart(day, o) {                                 // pure when o.x is given → [{d, k: main|light, cls, tasks:[{s,k,les}], subs, fixed}]
    o = o || {}; day = day || today(); if (day >= EXAM) return [];
    var x = o.x || load(), subs = subjList(), ms = msSubs(), R = {}, out = [], c = credits(x, day), fx = (x.fix || {})[day] && !o.fresh ? x.fix[day] : null;
    subs.forEach(function (s) { R[s] = readiness(s, o); });
    var inFx = {}; (fx || []).forEach(function (t) { if (t.s === "msall") ms.forEach(function (y) { inFx[y] = 1; }); else inFx[t.s] = 1; });
    var need = {}; subs.forEach(function (s) { need[s] = Math.max(0, 2 - nDone(c, s) - (inFx[s] ? 1 : 0)); });
    var d0 = fx ? addDays(day, 1) : day, main = [], dd;
    for (dd = d0; dd < LIGHT; dd = addDays(dd, 1)) main.push(dd);
    function capOf(dy, hard) { return isCls(dy) ? (hard ? 3 : 2) : 3; }
    var capT = 0, capH = 0; main.forEach(function (dy) { capT += capOf(dy); capH += capOf(dy, 1); });
    var reqSep = 0; subs.forEach(function (s) { reqSep += need[s]; });
    var merge = reqSep > capT, units = [];                 // not enough room: the 4 Med-Surg subjects go as ONE «Med-Surg كلّو» mock
    subs.forEach(function (s) { if (!(merge && ms.indexOf(s) > -1)) units.push({ s: s, r: R[s].r, need: need[s], n: lessonsOf(s).length }); });
    if (merge) { var mn = 0, mr = 0, k = 0; ms.forEach(function (s) { if (R[s]) { mn = Math.max(mn, need[s]); mr += R[s].r; k++; } }); if (k) { R.msall = { r: Math.round(mr / k), weakL: R[ms[0]].weakL }; units.push({ s: "msall", r: R.msall.r, need: mn, n: 99 }); } }
    units.sort(function (a, b) { return a.r - b.r || b.n - a.n || (a.s < b.s ? -1 : 1); });   // weakest first
    var Lq = [];
    units.forEach(function (u) { if (u.need >= 1) Lq.push({ u: u, k: u.need >= 2 && u.r < 60 ? "quiz" : "mock" }); });
    units.forEach(function (u) { if (u.need >= 2) Lq.push({ u: u, k: "mock" }); });
    var hard = Lq.length > capT; if (hard && Lq.length > capH) Lq = Lq.slice(0, capH);
    if (fx) out.push({ d: day, k: day >= LIGHT ? "light" : "main", cls: isCls(day), tasks: fx, fixed: true });
    var wRem = 0; main.forEach(function (dy) { wRem += isCls(dy) ? 2 : 3; });
    main.forEach(function (dy) {
      var w0 = isCls(dy) ? 2 : 3, cap = capOf(dy, hard), want = Lq.length ? Math.min(cap, Math.max(1, Math.ceil(Lq.length * w0 / wRem))) : 0, ts = [], seen = {};
      wRem -= w0;
      for (var i = 0; i < Lq.length && ts.length < want;) { var q = Lq[i]; if (seen[q.u.s]) { i++; continue; } seen[q.u.s] = 1; ts.push(mkTask(q.u, q.k, R)); Lq.splice(i, 1); }
      if (!ts.length && units.length) ts.push(mkTask(units[0], "quiz", R));   // everything covered: a short quiz on the weakest subject
      out.push({ d: dy, k: "main", cls: isCls(dy), tasks: ts });
    });
    for (dd = fx && day >= LIGHT ? addDays(day, 1) : (d0 > LIGHT ? d0 : LIGHT); dd < EXAM; dd = addDays(dd, 1)) {   // Nov 14–15: weak points only
      var lt = [{ s: "weak", k: "weak", les: "" }];
      if (!isCls(dd) && units.length) lt.push({ s: units[0].s, k: "les", les: R[units[0].s].weakL || "" });
      out.push({ d: dd, k: "light", cls: isCls(dd), tasks: lt });
    }
    out.forEach(function (p) { p.subs = p.tasks.map(function (t) { return t.s; }); });
    return out;
  }
  function plan(day) {                                     // the plan from `day` (default today); today's tasks fixed once shown
    day = day || today(); var x = load(), P = smart(day, { x: x });
    if (day === today() && P[0] && P[0].d === day && !P[0].fixed) { x.fix = x.fix || {}; x.fix[day] = P[0].tasks; Object.keys(x.fix).forEach(function (k) { if (k < addDays(day, -20)) delete x.fix[k]; }); lsSet(K, x); P[0].fixed = true; }
    return P;
  }
  function planDay(day) {
    day = day || today(); var td = today(), x = load();
    if (day < td) { var f = (x.fix || {})[day]; return f ? { d: day, k: day >= LIGHT ? "light" : "main", cls: isCls(day), tasks: f, subs: f.map(function (t) { return t.s; }), past: true } : null; }
    var P = smart(td, { x: x }); for (var i = 0; i < P.length; i++) if (P[i].d === day) return P[i];
    P = day < EXAM ? smart(day, { x: x }) : []; return P[0] && P[0].d === day ? P[0] : null;
  }
  function taskDone(day, t, x) {
    x = x || load(); if (x.plan[day]) return true; if ((x.tk || {})[day] && x.tk[day][t.s]) return true;
    var h = x.h || {}; if ((h[t.s] || []).indexOf(day) > -1) return true;
    if (t.s !== "weak" && t.s !== "msall" && msSubs().indexOf(t.s) > -1 && (h.msall || []).indexOf(day) > -1) return true;
    if (t.k === "les" && t.les) { var m = readMap(); for (var k in m) if ((k === t.les || k.indexOf(t.les + "#") === 0) && today(new Date(+m[k] || 0)) === day) return true; }
    return false;
  }
  function tick(day, s, on) { var x = load(); x.tk = x.tk || {}; var t = x.tk[day] = x.tk[day] || {}; if (on) t[s] = Date.now(); else delete t[s]; if (!Object.keys(t).length) delete x.tk[day]; save(x); }
  function credit(s, day) { var x = load(); x.h = x.h || {}; var a = x.h[s] = x.h[s] || []; if (a.indexOf(day) < 0) { a.push(day); if (a.length > 40) a.shift(); save(x); } }
  function planMark(day, on) { var x = load(); if (on) x.plan[day] = Date.now(); else delete x.plan[day]; save(x); }
  function planDone(day) { var p = planDay(day); if (!p) return !!load().plan[day]; var x = load(); return p.tasks.every(function (t) { return taskDone(day, t, x); }); }
  function missed(day) {                                   // yesterday's plan left undone → the plan was re-made from today
    day = day || today(); var y = addDays(day, -1), f = (load().fix || {})[y], x = load(); if (!f || x.plan[y]) return 0;
    return f.filter(function (t) { return !taskDone(y, t, x); }).length;
  }

  /* ---------------- the path step (assets/home.js) ---------------- */
  function step(day) {
    day = day || today(); if (!active(day) || day < addDays(START, -7)) return null;
    var p = day === today() ? plan(day)[0] : planDay(day), left = daysLeft(day), x = load();
    var ts = p && p.d === day ? p.tasks : [{ s: "weak", k: "weak", les: "" }], dn = ts.filter(function (t) { return taskDone(day, t, x); }).length;
    var t = ts.filter(function (t) { return !taskDone(day, t, x); })[0] || ts[0], s2 = ts.filter(function (y) { return y !== t; }).map(function (y) { return y.s; })[0] || "";
    return { k: "mid", e: "🎯", id: day, s: t.s, s2: s2, light: p && p.k === "light" ? 1 : 0, left: left, n: ts.length, dn: dn, tk: t.k, href: t.k === "les" && t.les && lessonInfo(t.les) ? lessonInfo(t.les).href : taskHref(t) };
  }
  function stepDone(day) { return planDone(day); }

  /* ---------------- ☁️ sync: users/{uid}.midterm {best, lw, plan} (owner merge, no new rule) ---------------- */
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() {
    clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; var x = load();
      try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { midterm: { v: 1, best: x.best, lw: x.lw, plan: x.plan, h: x.h || {}, tk: x.tk || {}, at: Date.now() } }, { merge: true }).catch(function () {}); } catch (e) {} }, 2500);
  }
  function merge(x, r) {                                   // pure: best = the higher score, plan = union, lw = local first
    var ch = false, k; if (!r || typeof r !== "object") return { x: x, ch: false };
    for (k in r.best || {}) { var b = r.best[k]; if (b && typeof b.p === "number" && (!x.best[k] || b.p > (x.best[k].p | 0))) { x.best[k] = { p: b.p | 0, sc: b.sc | 0, n: b.n | 0, at: +b.at || 0 }; ch = true; } }
    for (k in r.plan || {}) if (/^\d{4}-\d\d-\d\d$/.test(k) && !x.plan[k]) { x.plan[k] = +r.plan[k] || 1; ch = true; }
    for (k in r.lw || {}) if (x.lw[k] == null && typeof r.lw[k] === "number") { x.lw[k] = r.lw[k]; ch = true; }
    var D = /^\d{4}-\d\d-\d\d$/;                         // 🎯 29q: the plan's done sessions + ticks, union
    for (k in r.h || {}) if (Array.isArray(r.h[k])) r.h[k].forEach(function (dy) { if (!D.test(dy)) return; x.h = x.h || {}; var a = x.h[k] = x.h[k] || []; if (a.indexOf(dy) < 0) { a.push(dy); ch = true; } });
    for (k in r.tk || {}) if (D.test(k) && r.tk[k] && typeof r.tk[k] === "object") Object.keys(r.tk[k]).forEach(function (s) { x.tk = x.tk || {}; var t = x.tk[k] = x.tk[k] || {}; if (!t[s]) { t[s] = +r.tk[k][s] || 1; ch = true; } });
    return { x: x, ch: ch };
  }
  function pull() {
    var A = fbA(); if (!A) return;
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) { var m = merge(load(), s.exists() ? s.data().midterm : null); if (m.ch) save(m.x); }, function () {});
  }

  /* ---------------- midterm.html ---------------- */
  var root = null, tk = 0;
  function pctCls(p) { return p >= 85 ? "g" : p >= 60 ? "y" : "r"; }
  function cdHtml() {
    var c = countdown();
    if (c.over) return '<p class="midover">🍀 ' + T("اليوم الامتحان! بالتوفيق، إنت جاهز 💪", "C'est le jour de l'examen ! Bonne chance, tu es prêt(e) 💪") + "</p>";
    function u(n, ar, fr) { return '<span class="midu"><b>' + n + "</b><small>" + T(ar, fr) + "</small></span>"; }
    return '<div class="midcd" role="timer" aria-live="off">' + u(c.d, "يوم", "jours") + u(c.h, "ساعة", "heures") + u(c.m, "دقيقة", "min") + u(("0" + c.s).slice(-2), "ثانية", "s") + "</div>";
  }
  function dayLabel(day) {
    var dt = new Date(day + "T12:00:00Z"), wd = dt.getUTCDay();
    var A = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"], F = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
    return T(A[wd], F[wd]) + " " + dt.getUTCDate() + "/" + (dt.getUTCMonth() + 1);
  }
  function subjBtn(s) {
    var x = load(), b = x.best[s], n = sizeOf(s), nl = lessonsOf(s).length;
    return '<li class="midsub"><span class="e" aria-hidden="true">' + (EMO[s] || "📘") + '</span><span class="tx"><b>' + esc(subjName(s)) + "</b><small>" +
      T(n + " سؤال · " + n + " د · " + nl + (nl === 1 ? " درس" : " دروس"), n + " questions · " + n + " min · " + nl + " leçon" + (nl > 1 ? "s" : "")) + " " +
      (b ? '<span class="midbest ' + pctCls(b.p) + '" title="' + T("أحسن علامة", "Meilleur score") + '">🏅 ' + b.p + "%</span>" : '<span class="midbest none">' + T("ما جرّبت", "Pas encore") + "</span>") + "</small></span>" +
      '<a class="btn pri sm" href="quiz.html?t=mid&amp;s=' + s + '">' + T("امتحان كامل ⏱️", "Examen complet ⏱️") + "</a></li>";
  }
  function kindName(t) {
    return t.k === "weak" ? T("١٠ أسئلة من نقاط ضعفك", "10 questions sur tes points faibles") : t.k === "les" ? T("📖 راجع أضعف درس", "📖 Relis ta leçon la plus faible")
      : t.k === "quiz" ? T("١٠ أسئلة + الدرس الأضعف", "10 questions + la leçon la plus faible") : T("امتحان كامل ⏱️", "Examen complet ⏱️");
  }
  function taskName(t) { return t.s === "weak" ? T("💪 نقاط ضعفك", "💪 Tes points faibles") : (EMO[t.s] || "📘") + " " + esc(subjName(t.s)); }
  function lesLink(t) { var l = t.les ? lessonInfo(t.les) : null; return l ? '<a class="midles" href="' + esc(l.href) + '">📖 ' + esc(l.n) + "</a>" : ""; }
  function taskRow(day, t, x, live) {
    var dn = taskDone(day, t, x), go = t.k === "les" && t.les && lessonInfo(t.les) ? lessonInfo(t.les).href : taskHref(t);
    return '<li class="midtask' + (dn ? " dn" : "") + '">' + (live ? '<label class="tkb"><input type="checkbox" data-midtk="' + day + "|" + t.s + '"' + (dn ? " checked" : "") + ' aria-label="✓"></label>' : '<span class="tkb">' + (dn ? "✅" : "⬜") + "</span>") +
      '<span class="tx"><b>' + taskName(t) + "</b><small>" + kindName(t) + "</small>" + (t.k !== "les" ? lesLink(t) : "") + "</span>" +
      '<a class="btn ' + (dn ? "" : "pri ") + 'sm" href="' + esc(go) + '">' + (dn ? T("✓ تمام", "✓ Fait") : T("يلا", "Go")) + "</a></li>";
  }
  function planHtml() {
    var td = today(); if (!active(td)) return "";
    var P = plan(td), x = load(), left = daysLeft(td), mi = missed(td), p0 = P[0], rest = P.slice(1);
    var h = '<section class="qcard midplan" id="plan"><h2>🎯 ' + T("خطة امتحان 16", "Plan examen du 16") + ' <small>⏳ ' + T("باقي " + left + " يوم", "J-" + left) + "</small></h2>" +
      '<p class="small">' + T("مبنية على علاماتك ودروسك اللي فتحتها وغلطاتك: الأضعف أول، كل مادة مرّتين قبل ١٤/١١، أيام الدوام (خميس/جمعة/سبت) أخف، و١٤–١٥ نقاط ضعفك بس. بيتعلّم ✓ لحالو لما تخلص الامتحان أو الأسئلة.",
        "Basé sur tes scores, les leçons ouvertes et tes erreurs : la plus faible d'abord, chaque matière deux fois avant le 14/11, jours de cours (jeu./ven./sam.) plus légers, et les 14–15 seulement tes points faibles. Coché ✓ tout seul quand tu finis.") + "</p>" +
      (mi ? '<p class="midre">🔄 ' + T("فاتك شي مبارح؟ ولا يهمّك، رتّبتلك الخطة من جديد.", "Raté hier ? Pas grave, le plan est refait.") + "</p>" : "");
    if (p0 && p0.d === td) {
      var nd = p0.tasks.filter(function (t) { return taskDone(td, t, x); }).length;
      h += '<h3 class="midgh">📌 ' + T("اليوم", "Aujourd'hui") + " · " + dayLabel(td) + (p0.cls && p0.k === "main" ? ' <small class="dp">🏫 ' + T("يوم دوام: خفيف", "jour de cours : léger") + "</small>" : p0.k === "light" ? ' <small class="dp">' + T("مراجعة خفيفة", "révision légère") + "</small>" : "") +
        " <small>" + nd + "/" + p0.tasks.length + "</small></h3><ol class=\"midtasks\">" + p0.tasks.map(function (t) { return taskRow(td, t, x, true); }).join("") + "</ol>" +
        (nd === p0.tasks.length ? '<p class="midok">✅ ' + T("خلصت خطة اليوم. برافو!", "Plan du jour terminé. Bravo !") + "</p>" : "");
    }
    if (rest.length) h += '<details class="midall"' + (rest.length <= 3 ? " open" : "") + "><summary>📅 " + T("الأيام الجاية", "Les jours suivants") + " (" + rest.length + ")</summary><ol class=\"middays\">" + rest.map(function (p) {
      return '<li class="midday"><span class="dl">' + dayLabel(p.d) + (p.cls && p.k === "main" ? ' <small class="dp">🏫 ' + T("دوام", "cours") + "</small>" : p.k === "light" ? ' <small class="dp">' + T("مراجعة خفيفة", "révision légère") + "</small>" : "") + '</span><span class="dgo">' +
        p.tasks.map(function (t) { return '<a class="btn sm" href="' + esc(t.k === "les" && lessonInfo(t.les) ? lessonInfo(t.les).href : taskHref(t)) + '">' + taskName(t) + " · " + kindName(t) + "</a>"; }).join("") + "</span></li>";
    }).join("") + "</ol></details>";
    var subs = subjList().map(function (s) { return { s: s, r: readiness(s) }; }).sort(function (a, b) { return a.r.r - b.r.r; });
    h += '<details class="midrd"><summary>📊 ' + T("جاهزيتك بكل مادة", "Ta préparation par matière") + "</summary><ul>" + subs.map(function (y) {
      var c = load(), cr = credits(c)[y.s];
      return '<li><span>' + (EMO[y.s] || "📘") + " " + esc(subjName(y.s)) + '</span><span class="midbar"><i class="' + pctCls(y.r.r) + '" style="width:' + y.r.r + '%"></i></span><b>' + y.r.r + "%</b><small>" +
        T("📖 " + Math.round(y.r.cov * 100) + "% دروس · " + (y.r.acc == null ? "ما في علامات" : "صح " + y.r.acc + "%") + (y.r.miss ? " · ❌ " + y.r.miss : "") + " · " + Object.keys(cr || {}).length + "/2",
          "📖 " + Math.round(y.r.cov * 100) + "% leçons · " + (y.r.acc == null ? "pas de score" : "juste " + y.r.acc + "%") + (y.r.miss ? " · ❌ " + y.r.miss : "") + " · " + Object.keys(cr || {}).length + "/2") + "</small></li>";
    }).join("") + "</ul></details></section>";
    return h;
  }
  function weakHtml() {
    var W = weakLessons(5); if (!W.length) return "";
    var x = load();
    return '<section class="qcard midweak"><h2>💪 ' + T("أضعف دروسك", "Tes leçons les plus faibles") + '</h2><ul class="midwl">' + W.map(function (id) { var l = lessonInfo(id); if (!l) return "";
      return '<li><a href="' + esc(l.href) + '">📖 ' + esc(l.n) + "</a>" + (x.lw[id] != null ? ' <span class="midbest ' + pctCls(x.lw[id]) + '">' + x.lw[id] + "%</span>" : "") + "</li>"; }).join("") +
      '</ul><p><a class="btn pri" href="quiz.html?t=mid&amp;s=weak&amp;n=10">⚡ ' + T("امتحان قصير ١٠ أسئلة من أضعف دروسك", "Mini-examen de 10 questions sur tes leçons faibles") + "</a></p></section>";
  }
  function hub() {
    var subs = subjList(), ms = ((NL().groups || {}).medsurg || {}).subs || [], tried = subs.filter(function (s) { return load().best[s]; }).length;
    var td = today(), p = active(td) ? plan(td)[0] : null;
    var h = '<section class="qcard midhero"><p class="midk">🎯 ' + T("امتحان الفصل", "Examen de mi-semestre") + '</p><h1>' + T("الإثنين ١٦ تشرين الثاني ٢٠٢٦", "Lundi 16 novembre 2026") + "</h1>" + cdHtml() +
      '<p class="small">' + T("كل الدروس من كل المواد. جرّبت " + tried + " من " + subs.length + " مواد.", "Toutes les leçons de toutes les matières. Tu as essayé " + tried + " matière(s) sur " + subs.length + ".") + "</p>" +
      (active(td) ? '<p class="midtoday">⏳ ' + T("باقي " + daysLeft(td) + " يوم", "J-" + daysLeft(td)) + (p && p.tasks ? " · 📌 " + T("خطة اليوم: ", "Plan du jour : ") + p.tasks.map(function (t) { return t.s === "weak" ? T("نقاط ضعفك", "points faibles") : esc(subjName(t.s)); }).join(" + ") : "") + ' <a href="#plan">' + T("🎯 الخطة", "🎯 Le plan") + "</a></p>" : "") + "</section>" + planHtml();
    h += '<section class="qcard midsubs"><h2>📚 ' + T("امتحان كامل لكل مادة", "Un examen complet par matière") + '</h2><p class="small">' +
      T("أسئلة من كل دروس المادة بالتساوي، دقيقة لكل سؤال. بالآخر: علامتك، نتيجتك بكل درس وأضعف دروسك. الغلط بيرجعلك بمراجعة بكرا.", "Des questions de toutes les leçons de la matière, à parts égales, une minute par question. À la fin : ton score, ton résultat par leçon et tes leçons faibles. Les erreurs reviennent demain en révision.") + "</p>";
    var g = (NL().groups || {}).medsurg;
    if (g && ms.length) h += '<h3 class="midgh">' + esc(g.e || "🏥") + " " + esc(T(g.ar, g.fr)) + '</h3><ul class="midlist">' + subjBtn("msall") + ms.filter(function (s) { return subs.indexOf(s) > -1; }).map(subjBtn).join("") + "</ul>" +
      '<h3 class="midgh">📘 ' + T("باقي المواد", "Les autres matières") + "</h3>";
    h += '<ul class="midlist">' + subs.filter(function (s) { return ms.indexOf(s) < 0; }).map(subjBtn).join("") + "</ul>";
    h += "</section>" + weakHtml();
    return h;
  }
  function draw() { if (!root) return; root.innerHTML = hub(); }
  function initPage() {
    root = d.getElementById("mid-app"); if (!root) return;
    d.documentElement.classList.add("rton");             // no ads on this page at all
    draw();
    clearInterval(tk); tk = setInterval(function () { var c = root.querySelector(".midcd"); if (!c) return; var t = d.createElement("div"); t.innerHTML = cdHtml(); c.parentNode.replaceChild(t.firstChild, c); }, 1000);
    root.addEventListener("change", function (e) { var b = e.target.closest && e.target.closest("[data-midtk]"); if (!b) return; var v = b.getAttribute("data-midtk").split("|"); tick(v[0], v[1], b.checked); draw(); });
    if (location.hash === "#plan") setTimeout(function () { var p = d.getElementById("plan"); if (p) p.scrollIntoView({ block: "start" }); }, 200);
  }
  /* cases are loaded only for the exam itself (quiz.html?t=mid) */
  function loadCases() {
    if (w.CASES) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = "assets/cases-data.js?v=" + V; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); setTimeout(res, 6000); });
  }

  w.NursinMid = { V: V, EXAM: EXAM, START: START, EXAM_TS: EXAM_TS, MINQ: MINQ, MAXQ: MAXQ, today: today, daysLeft: daysLeft, active: active, countdown: countdown,
    subjects: subjList, lessonsOf: lessonsOf, subjName: subjName, size: size, sizeOf: sizeOf, pools: pools, build: build, seeded: seeded, result: result, weakOf: weakOf,
    weakLessons: weakLessons, lessonInfo: lessonInfo, plan: plan, planDay: planDay, planMark: planMark, planDone: planDone, step: step, stepDone: stepDone, smart: smart, readiness: readiness, credits: credits, taskDone: taskDone, tick: tick, credit: credit, missed: missed, isCls: isCls, LIGHT: LIGHT,
    merge: merge, pull: pull, load: load, loadCases: loadCases, EMO: EMO, KEY: K };
  if (!d || !d.addEventListener) return;
  /* 📊 29v: midterm.js also rides the subject pages (only for readiness(), assets/ready.js) — no profile read there: no new Firestore traffic */
  function pullOK() { var p = ""; try { p = (w.location.pathname || "").split("/").pop() || "index.html"; } catch (e) {} var S = NL().subjects || {}; for (var k in S) if (S[k] && S[k].page === p) return false; return true; }
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn && pullOK()) setTimeout(pull, 1500); });
  setTimeout(function () { if (pullOK() && fbA()) pull(); }, 3000);
  d.addEventListener("nursin:quizdone", function (e) { var v = e.detail || {}; if (pullOK() && v.sel && v.sel !== "mid" && subjList().indexOf(v.sel) > -1 && (v.total | 0) >= 5) credit(v.sel, today()); });   // 🎯 29q: a subject quiz ticks its plan task
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initPage); else initPage();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
