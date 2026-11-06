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
  var V = "20261029p", K = "nursin_mid_v1";
  var EXAM = "2026-11-16", START = "2026-11-01", EXAM_TS = Date.parse("2026-11-16T08:00:00+02:00");   // Lebanon = UTC+2 in November
  var MINQ = 20, MAXQ = 30;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today(now) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date()); } catch (e) { return new Date((now ? +now : Date.now()) + 2 * 36e5).toISOString().slice(0, 10); } }
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
    var x = load(), at = now || Date.now(), pct = total ? Math.round(100 * score / total) : 0, b = x.best[s], nb = !b || pct > (b.p | 0);
    if (nb) x.best[s] = { p: pct, sc: score, n: total, at: at };
    var bl = {}; Object.keys(byL || {}).forEach(function (id) { var v = byL[id]; if (v && v[1]) { bl[id] = [v[0] | 0, v[1] | 0]; x.lw[id] = Math.round(100 * v[0] / v[1]); } });
    x.last[s] = { p: pct, at: at, d: today(new Date(at)), byL: bl };
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
  function plan() {
    var subs = subjList().slice().sort(function (a, b) { return lessonsOf(b).length - lessonsOf(a).length || (a < b ? -1 : 1); });
    var days = [], half = Math.ceil(subs.length / 2), pairs = [], i;
    for (i = 0; i < half; i++) { var p = [subs[i]], j = subs.length - 1 - i; if (j > i) p.push(subs[j]); pairs.push(p); }
    var last = dayDiff(START, EXAM) - 3, di = 0;           // pairs twice over the days up to Nov 13
    for (var pass = 0; pass < 2; pass++) for (i = 0; i < pairs.length; i++) { days.push({ d: addDays(START, di), subs: pass ? pairs[(i + 1) % pairs.length] : pairs[i], k: "subj", pass: pass + 1 }); di++; }
    while (di <= last) { days.push({ d: addDays(START, di), subs: ["msall"], k: "mix" }); di++; }   // spare days: the whole Med-Surg (the biggest group)
    days.push({ d: addDays(EXAM, -2), subs: ["weak"], k: "light" }, { d: addDays(EXAM, -1), subs: ["weak"], k: "light" });
    return days;
  }
  function planDay(day) { var P = plan(); for (var i = 0; i < P.length; i++) if (P[i].d === day) return P[i]; return null; }
  function planMark(day, on) { var x = load(); if (on) x.plan[day] = Date.now(); else delete x.plan[day]; save(x); }
  function planDone(day) { var x = load(); if (x.plan[day]) return true; var p = planDay(day); if (!p) return false;
    return p.subs.every(function (s) { var l = x.last[s]; return !!(l && l.d === day); }); }

  /* ---------------- the path step (assets/home.js) ---------------- */
  function step(day) {
    day = day || today(); if (!active(day) || day < addDays(START, -7)) return null;
    var p = planDay(day), s = p ? p.subs[0] : "weak", left = daysLeft(day);
    return { k: "mid", e: "🎯", id: day, s: s, s2: p && p.subs[1] ? p.subs[1] : "", light: p && p.k === "light" ? 1 : 0, left: left, href: "quiz.html?t=mid&s=" + s + (s === "weak" ? "&n=10" : "") };
  }
  function stepDone(day, at) { var x = load(); if (x.plan[day]) return true; var t = 0; Object.keys(x.last).forEach(function (s) { var l = x.last[s]; if (l && l.d === day && (+l.at || 0) > t) t = +l.at; }); return t > (at || 0); }

  /* ---------------- ☁️ sync: users/{uid}.midterm {best, lw, plan} (owner merge, no new rule) ---------------- */
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() {
    clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; var x = load();
      try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { midterm: { v: 1, best: x.best, lw: x.lw, plan: x.plan, at: Date.now() } }, { merge: true }).catch(function () {}); } catch (e) {} }, 2500);
  }
  function merge(x, r) {                                   // pure: best = the higher score, plan = union, lw = local first
    var ch = false, k; if (!r || typeof r !== "object") return { x: x, ch: false };
    for (k in r.best || {}) { var b = r.best[k]; if (b && typeof b.p === "number" && (!x.best[k] || b.p > (x.best[k].p | 0))) { x.best[k] = { p: b.p | 0, sc: b.sc | 0, n: b.n | 0, at: +b.at || 0 }; ch = true; } }
    for (k in r.plan || {}) if (/^\d{4}-\d\d-\d\d$/.test(k) && !x.plan[k]) { x.plan[k] = +r.plan[k] || 1; ch = true; }
    for (k in r.lw || {}) if (x.lw[k] == null && typeof r.lw[k] === "number") { x.lw[k] = r.lw[k]; ch = true; }
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
  function planHtml() {
    var P = plan(), td = today(), top = "", rest = "";
    P.forEach(function (p) {
      var dn = planDone(p.d), cur = p.d === td, past = p.d < td, soon = p.d >= td && dayDiff(td, p.d) <= 2;
      var row = '<li class="midday' + (cur ? " cur" : "") + (dn ? " dn" : "") + (past && !dn ? " miss" : "") + '"><label><input type="checkbox" data-midday="' + p.d + '"' + (dn ? " checked" : "") + '> <span class="dl">' + dayLabel(p.d) + (cur ? " · " + T("اليوم", "aujourd'hui") : "") + "</span>" +
        (p.k === "subj" && p.pass === 2 ? ' <small class="dp">' + T("مرّة تانية", "2e passage") + "</small>" : p.k === "light" ? ' <small class="dp">' + T("مراجعة خفيفة", "révision légère") + "</small>" : p.k === "mix" ? ' <small class="dp">' + T("كل Med-Surg", "tout Med-Surg") + "</small>" : "") + "</label>" +
        '<span class="dgo">' + p.subs.map(function (s) { return '<a class="btn sm" href="quiz.html?t=mid&amp;s=' + s + (s === "weak" ? "&amp;n=10" : "") + '">' + (EMO[s] || "⏱️") + " " + esc(s === "weak" ? T("١٠ أسئلة من أضعف دروسك", "10 questions sur tes leçons faibles") : subjName(s)) + "</a>"; }).join("") + "</span></li>";
      if (soon) top += row; else rest += row;
    });
    var nd = P.filter(function (p) { return planDone(p.d); }).length;
    return '<section class="qcard midplan" id="plan"><h2>📅 ' + T("خطة المراجعة", "Plan de révision") + ' <small>' + nd + "/" + P.length + "</small></h2><p class=\"small\">" +
      T("كل مادة بتمرق عليها مرّتين لحدّ ١٣/١١، و١٤–١٥ مراجعة خفيفة لأضعف دروسك. بيتعلّم ✅ لحالو لما تعمل امتحان اليوم، أو علّمو إنت.", "Chaque matière passe deux fois jusqu'au 13/11, et les 14–15 : révision légère de tes leçons faibles. Coché ✅ tout seul quand tu fais l'examen du jour, ou coche-le toi-même.") +
      "</p>" + (top ? '<ol class="middays">' + top + "</ol>" : "") + (rest ? '<details class="midall"><summary>' + T("📅 كل الأيام", "📅 Tous les jours") + " (" + P.length + ")</summary><ol class=\"middays\">" + rest + "</ol></details>" : "") + "</section>";
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
    var td = today(), p = planDay(td);
    var h = '<section class="qcard midhero"><p class="midk">🎯 ' + T("امتحان الفصل", "Examen de mi-semestre") + '</p><h1>' + T("الإثنين ١٦ تشرين الثاني ٢٠٢٦", "Lundi 16 novembre 2026") + "</h1>" + cdHtml() +
      '<p class="small">' + T("كل الدروس من كل المواد. جرّبت " + tried + " من " + subs.length + " مواد.", "Toutes les leçons de toutes les matières. Tu as essayé " + tried + " matière(s) sur " + subs.length + ".") + "</p>" +
      (p && active(td) ? '<p class="midtoday">📌 ' + T("خطة اليوم: ", "Plan du jour : ") + (p.k === "light" ? T("مراجعة خفيفة + ١٠ أسئلة", "révision légère + 10 questions") : p.subs.map(function (s) { return esc(subjName(s)); }).join(" + ")) + ' <a href="#plan">' + T("الخطة كلّها", "Tout le plan") + "</a></p>" : "") + "</section>";
    h += '<section class="qcard midsubs"><h2>📚 ' + T("امتحان كامل لكل مادة", "Un examen complet par matière") + '</h2><p class="small">' +
      T("أسئلة من كل دروس المادة بالتساوي، دقيقة لكل سؤال. بالآخر: علامتك، نتيجتك بكل درس وأضعف دروسك. الغلط بيرجعلك بمراجعة بكرا.", "Des questions de toutes les leçons de la matière, à parts égales, une minute par question. À la fin : ton score, ton résultat par leçon et tes leçons faibles. Les erreurs reviennent demain en révision.") + "</p>";
    var g = (NL().groups || {}).medsurg;
    if (g && ms.length) h += '<h3 class="midgh">' + esc(g.e || "🏥") + " " + esc(T(g.ar, g.fr)) + '</h3><ul class="midlist">' + subjBtn("msall") + ms.filter(function (s) { return subs.indexOf(s) > -1; }).map(subjBtn).join("") + "</ul>" +
      '<h3 class="midgh">📘 ' + T("باقي المواد", "Les autres matières") + "</h3>";
    h += '<ul class="midlist">' + subs.filter(function (s) { return ms.indexOf(s) < 0; }).map(subjBtn).join("") + "</ul>";
    h += "</section>" + weakHtml() + planHtml();
    return h;
  }
  function draw() { if (!root) return; root.innerHTML = hub(); }
  function initPage() {
    root = d.getElementById("mid-app"); if (!root) return;
    d.documentElement.classList.add("rton");             // no ads on this page at all
    draw();
    clearInterval(tk); tk = setInterval(function () { var c = root.querySelector(".midcd"); if (!c) return; var t = d.createElement("div"); t.innerHTML = cdHtml(); c.parentNode.replaceChild(t.firstChild, c); }, 1000);
    root.addEventListener("change", function (e) { var b = e.target.closest && e.target.closest("[data-midday]"); if (!b) return; planMark(b.getAttribute("data-midday"), b.checked); draw(); });
    if (location.hash === "#plan") setTimeout(function () { var p = d.getElementById("plan"); if (p) p.scrollIntoView({ block: "start" }); }, 200);
  }
  /* cases are loaded only for the exam itself (quiz.html?t=mid) */
  function loadCases() {
    if (w.CASES) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = "assets/cases-data.js?v=" + V; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); setTimeout(res, 6000); });
  }

  w.NursinMid = { V: V, EXAM: EXAM, START: START, EXAM_TS: EXAM_TS, MINQ: MINQ, MAXQ: MAXQ, today: today, daysLeft: daysLeft, active: active, countdown: countdown,
    subjects: subjList, lessonsOf: lessonsOf, subjName: subjName, size: size, sizeOf: sizeOf, pools: pools, build: build, seeded: seeded, result: result, weakOf: weakOf,
    weakLessons: weakLessons, lessonInfo: lessonInfo, plan: plan, planDay: planDay, planMark: planMark, planDone: planDone, step: step, stepDone: stepDone,
    merge: merge, pull: pull, load: load, loadCases: loadCases, EMO: EMO, KEY: K };
  if (!d || !d.addEventListener) return;
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) setTimeout(pull, 1500); });
  setTimeout(function () { if (fbA()) pull(); }, 3000);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initPage); else initPage();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
