/* 🚌 «مراجعة سريعة قبل الدوام» — 29n (Abdullah, Nov 6 2026 7:37 AM: «بدي ب أثناء ما أنا رايح عالدوام يكون في شي ب مسار اليوم… شغلات
   سريعة امرق عليها قبل الدوام… لهيدا اليوم»). Class-day mornings (Thu/Fri/Sat, 4:00 AM → 2:30 PM Beirut) «🧭 مسار اليوم» starts with this
   step (assets/home.js, k "bus"); one tap opens a 2–3 min flash review of TODAY's class subjects only:
     • up to 3 key points = the «🧠 حيلة حفظ» of those lessons (assets/tricks-data.js, written from the site's own lessons, AR + fr)
     • 4 quick questions from the same bank as the quizzes (window.QUIZ), one per lesson, lessons the student already opened first
   29o: the ride (~30 min) = ~30 questions in rounds of 5, each opened by key points; progress bar + «⏱️ ~30 د»; resumes where he stopped (plan kept per day); ✓ after TICK=10.
   Answers feed the same trackers as Osman's path questions (Weak, SRS, Retain). Done (✓ on the path) = every question answered.
   Kept per Beirut day in localStorage nursin_bus_v1 {d, ans:{qid:k}}. on / subjects / pick are pure (tests/site.test.js #261–#263). */
(function (w, d) {
  var K = "nursin_bus_v1", FROM = 4 * 60, BACK = 14 * 60 + 30, NQ = 30, RQ = 5, NP0 = 3, NP = 2, CAPSEEN = 18, CAPX = 8, TICK = 10;   // 29o: ~30 min ride
  // the timetable (= assets/home.js CLASSDAY): Thu réa (الإنعاش) · law (القانون) · management (الإدارة) | Fri Med-Surg = medsurg, Henderson,
  // cardio (القلب), neuro (الأعصاب) | Sat community (صحة المجتمع) · pharma (الأدوية) · geri (الشيخوخة) · quality (الجودة)
  var DAYS = { 4: ["rea", "law", "mgmt"], 5: ["medsurg", "henderson", "cardio", "neuro"], 6: ["comm", "pharma", "geri", "quality"] };
  var V = ""; try { var cs = d && d.currentScript, mv = cs && /[?&]v=([\w.-]+)/.exec(cs.src || ""); if (mv) V = mv[1]; } catch (e) {}
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function dow(day) { return new Date(Date.parse(day + "T12:00:00Z")).getUTCDay(); }
  function subjects(day) { return (DAYS[dow(day)] || []).slice(); }
  function on(day, hm) { return subjects(day).length > 0 && (hm | 0) >= FROM && (hm | 0) < BACK; }
  function today() {
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10);
  }
  function hmB() { try { var o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date()).forEach(function (x) { o[x.type] = +x.value; }); return (o.hour % 24) * 60 + (o.minute | 0); } catch (e) { var d0 = new Date(); return d0.getHours() * 60 + d0.getMinutes(); } }
  function nowOn() { return on(today(), hmB()); }
  // lesson of a question: same rule as assets/ui.js lessonsNow (t, and l when the lesson has parts)
  function lessonOf(L) { var m = {}; L.forEach(function (l) { m[l.t + "|" + (l.l || "")] = l.id; }); return function (q) { return m[q.t + "|" + (q.l || "")] || m[q.t + "|"] || null; }; }
  /* the ride's session — pure: L = lessons [{id, s, t, l, n, href, read, score, added}], Q = window.QUIZ, tricks = window.TRICKS (may be null),
     x = { weak:[qid], due:[qid] } (optional: the student's mistakes + spaced-review due questions)
     → { subs, ls:[{id, n, href}], qs:[qid] (≤ NQ, no repeats), pts:[{id, n, t, m, fr}], rounds:[{p:[pt index], q:[qid]}] }
     29o (Abdullah, Nov 6 2026 2:19 PM: the ride takes ~30 min → «تعبّي وقت الطريق»): ~30 questions in rounds of RQ, each round opened by
     1–3 key points («حيلة حفظ», AR + fr); lessons he opened first, then (woven in) his mistakes + due reviews, then the rest of today's lessons */
  function pick(day, L, Q, tricks, x) {
    var subs = subjects(day), h = hash("bus" + day), of = lessonOf(L || []), byL = {}, lOfQ = {};
    (Q || []).forEach(function (q) { var id = q && q.id ? of(q) : null; if (id && !lOfQ[q.id]) { (byL[id] || (byL[id] = [])).push(q.id); lOfQ[q.id] = id; } });
    var xs = (L || []).filter(function (l) { return subs.indexOf(l.s) > -1 && byL[l.id] && byL[l.id].length; });
    function rot(a, k0) { if (!a.length) return a; var k = (k0 == null ? h : k0) % a.length; return a.slice(k).concat(a.slice(0, k)); }
    var seen = xs.filter(function (l) { return l.read || l.score != null; }), rest = xs.filter(function (l) { return !(l.read || l.score != null); });
    var newest = rest.reduce(function (m, l) { return (l.added || "") > m ? l.added || "" : m; }, "");
    var fresh = newest ? rest.filter(function (l) { return (l.added || "") === newest; }) : [];
    var others = rot(rest.filter(function (l) { return fresh.indexOf(l) < 0; }));
    // spread subjects: order lessons so consecutive ones alternate subjects
    function mix(a) { var by = {}, ks = []; a.forEach(function (l) { if (!by[l.s]) { by[l.s] = []; ks.push(l.s); } by[l.s].push(l); }); var o = [], more = true; while (more) { more = false; ks.forEach(function (k) { if (by[k].length) { o.push(by[k].shift()); more = true; } }); } return o; }
    var seenO = mix(rot(seen)), order = seenO.concat(fresh, mix(others));
    var taken = {}, ptr = {};
    function nextOf(l) { var a = byL[l.id], base = hash(l.id + day); for (var t = 0; t < a.length; t++) { var i = (ptr[l.id] | 0); ptr[l.id] = i + 1; if (i >= a.length) return null; var id = a[(base + i) % a.length]; if (!taken[id]) return id; } return null; }
    function rr(ls0, cap, out) { var dry = 0; while (out.length < cap && ls0.length && dry < ls0.length) { dry = 0; for (var i = 0; i < ls0.length && out.length < cap; i++) { var id = nextOf(ls0[i]); if (id) { taken[id] = 1; out.push(id); } else dry++; } } return out; }
    var main = rr(seenO, CAPSEEN, []);
    var inDay = {}; xs.forEach(function (l) { byL[l.id].forEach(function (id) { inDay[id] = 1; }); });
    var extra = [], xw = (x && x.weak) || [], xd = (x && x.due) || [];
    xw.concat(xd).forEach(function (id) { if (extra.length < CAPX && inDay[id] && !taken[id]) { taken[id] = 1; extra.push(id); } });
    rr(order, NQ - extra.length, main);
    var qs = [];                                         // weave: 2 of every round of RQ are mistakes / due reviews while there are some
    while (qs.length < NQ && (main.length || extra.length)) { var p = qs.length % RQ; qs.push((p === 2 || p === 4) && extra.length ? extra.shift() : main.length ? main.shift() : extra.shift()); }
    var pts = [], rounds = [], pc = {}, usedL = [];
    function trickOf(lid) { var tr = tricks && tricks[lid]; if (!tr || !tr.length) return -1; var i = pc[lid] | 0; if (i >= tr.length) return -1; pc[lid] = i + 1; var t = tr[(hash(lid + day) + i) % tr.length], l0 = null; (L || []).forEach(function (l) { if (l.id === lid) l0 = l; }); pts.push({ id: lid, n: l0 ? l0.n : "", t: t.t, m: t.m, fr: t.fr || null }); return pts.length - 1; }
    for (var r = 0; r * RQ < qs.length; r++) {
      var rq = qs.slice(r * RQ, r * RQ + RQ), want = r ? NP : NP0, rp = [], lids = [];
      rq.forEach(function (id) { var lid = lOfQ[id]; if (lid && lids.indexOf(lid) < 0) lids.push(lid); if (lid && usedL.indexOf(lid) < 0) usedL.push(lid); });
      for (var g = 0; g < 2 && rp.length < want; g++) lids.forEach(function (lid) { if (rp.length < want) { var k = trickOf(lid); if (k > -1) rp.push(k); } });
      rounds.push({ p: rp, q: rq });
    }
    var ls = usedL.map(function (lid) { var o = null; xs.forEach(function (l) { if (l.id === lid) o = l; }); return o; }).filter(Boolean);
    return { subs: subs, ls: ls.map(function (l) { return { id: l.id, n: l.n, href: l.href }; }), qs: qs, pts: pts, rounds: rounds };
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function state(day) { var s = lsGet(K); return s && s.d === (day || today()) ? s : { d: day || today(), ans: {} }; }
  function nAns(s) { var A = (s && s.ans) || {}, P = s && s.plan; return P && P.qs ? P.qs.filter(function (id) { return A[id] != null; }).length : Object.keys(A).length; }
  // ✓ on the path after a meaningful chunk (TICK answered, or the whole session when the bank is smaller)
  function isDone(day) { var s = state(day); if (s.done) return true; var P = s.plan, n = nAns(s); return n >= TICK || !!(P && P.qs && P.qs.length && n >= P.qs.length); }
  function prog(day) { var s = state(day), P = s.plan; return { n: nAns(s), of: P && P.qs ? P.qs.length : 0, tick: TICK }; }
  function qById(id) { var Q = w.QUIZ || []; for (var i = 0; i < Q.length; i++) if (Q[i].id === id) return Q[i]; return null; }
  function lessonsNow() { var U = w.NursinUI; try { if (U && U.lessonsNow) return U.lessonsNow() || []; } catch (e) {} var src = (w.NLESSONS && w.NLESSONS.list) || []; return src.map(function (l) { return { id: l.s + ":" + (l.l || l.t), s: l.s, t: l.t, l: l.l || "", n: l.n, href: l.href, read: false, score: null, added: l.added || "" }; }); }
  function subName(s) { var S = (w.NLESSONS && w.NLESSONS.subjects) || {}, x = S[s]; return x ? T(x.ar, x.fr) : s; }
  function lname(n) { return String(n || ""); }

  /* ---------------- the sheet ---------------- */
  var ov = null, stage = 0, fb = null, cur = null;
  function loadTricks(cb) {
    if (w.TRICKS) return cb();
    var done = false, fin = function () { if (!done) { done = true; cb(); } };
    try { var s = d.createElement("script"); s.src = "assets/tricks-data.js" + (V ? "?v=" + V : ""); s.onload = fin; s.onerror = fin; d.head.appendChild(s); } catch (e) { fin(); }
    setTimeout(fin, 3500);
  }
  function bar(n, of) { var pc = of ? Math.round(100 * n / of) : 0; return '<div class="busrow"><span>⏱️ ~30 ' + T("د", "min") + "</span><span>" + n + "/" + of + (n >= Math.min(TICK, of || TICK) ? " ✓" : "") + '</span></div><div class="busbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + of + '" aria-valuenow="' + n + '"><i style="width:' + pc + '%"></i></div>'; }
  function ptHtml(p) { var f = FR() && p.fr ? p.fr : null; return '<div class="buspt"' + (f ? " data-nofr" : "") + "><small>" + esc(lname(p.n)) + "</small><b>" + esc(f ? f.t : p.t) + "</b><p>" + esc(f ? f.m || p.m : p.m) + "</p></div>"; }
  function sheet() {
    var st = state(cur.day), A = st.ans || {}, R = cur.r, qs = R.qs.map(qById).filter(Boolean), nA = qs.filter(function (q) { return A[q.id] != null; }).length;
    var nOk = qs.filter(function (q) { return A[q.id] === q.a; }).length, CH = FR() ? " ›" : " ‹", rounds = R.rounds || [{ p: R.pts.map(function (p, i) { return i; }), q: R.qs }];
    var h = '<div class="buscard" role="dialog" aria-modal="true" aria-labelledby="bush"><div class="bushd"><b id="bush">' + T("🚌 مراجعة الطريق (~30 د)", "🚌 Révision du trajet (~30 min)") + '</b><button type="button" class="busx" data-busx aria-label="' + T("سكّر", "Fermer") + '">✕</button></div>' +
      '<p class="bussub">' + T("مواد اليوم: ", "Cours du jour : ") + esc(R.subs.map(subName).join(" · ")) + "</p>";
    if (!qs.length) return h + '<p class="hzoq">' + T("ما في أسئلة لمواد اليوم بعد", "Pas encore de questions pour les cours du jour") + "</p></div>";
    h += bar(nA, qs.length);
    if (cur.resumed && nA && nA < qs.length && !fb) h += '<p class="busnote">' + T("▶️ كمّلنا من مطرح ما وقفت", "▶️ On reprend là où tu t'es arrêté(e)") + "</p>";
    var fq = fb ? qById(fb) : null, stop = '<button type="button" class="busstop" data-busx>' + T("⏸️ وقّف هون، بكمّل بعدين", "⏸️ Pause, je continue plus tard") + "</button>";
    if (fq && A[fq.id] != null) {
      var ok = A[fq.id] === fq.a;
      h += '<div class="hzqf ' + (ok ? "ok" : "bad") + '"><b>' + (ok ? T("✅ صح!", "✅ Correct !") : T("❌ الجواب: ", "❌ La réponse : ") + esc(fq.o[fq.a])) + "</b>" + (fq.x ? "<p>" + esc(fq.x) + "</p>" : "") + "</div>";
      if (nA === Math.min(TICK, qs.length) && nA < qs.length) h += '<p class="busnote">' + T("✓ انحسبت بمسار اليوم! كمّل إذا بعدك بالطريق", "✓ Validé dans ton parcours du jour ! Continue si tu es encore en route") + "</p>";
      if (nA < qs.length) return h + '<div class="hzoa"><button type="button" class="go" data-busnext>' + T("السؤال الجاي", "Question suivante") + CH + "</button>" + stop + "</div></div>";
    }
    if (nA >= qs.length) return h + '<p class="hzoq">' + (nOk === qs.length ? T("🔥 " + nOk + "/" + qs.length + "! جاهز للدوام", "🔥 " + nOk + "/" + qs.length + " ! Prêt(e) pour les cours") : T("💪 " + nOk + "/" + qs.length + ". الغلطات رح ترجعلك بالمراجعة 🔁", "💪 " + nOk + "/" + qs.length + ". Tes erreurs reviendront en révision 🔁")) + '</p><div class="hzoa"><button type="button" class="go" data-busx>' + T("✅ خلصت، بالتوفيق اليوم", "✅ Fini, bonne journée") + "</button></div></div>";
    var q = null, qi = 0; for (var i = 0; i < qs.length; i++) if (A[qs[i].id] == null) { q = qs[i]; break; }
    for (var j = 0; j < R.qs.length; j++) if (R.qs[j] === q.id) qi = j;
    var ri = Math.floor(qi / RQ), rd = rounds[ri] || { p: [] }, NR = rounds.length;
    if ((st.pr | 0) <= ri && stage <= ri && qi % RQ === 0) {        // 🧠 each round opens with its key points
      h += '<p class="busst">' + T("🧠 الجولة " + (ri + 1) + "/" + NR + ": نقاط تمرق عليها", "🧠 Tour " + (ri + 1) + "/" + NR + " : les points clés") + "</p>";
      h += rd.p.length ? rd.p.map(function (k) { return R.pts[k]; }).filter(Boolean).map(ptHtml).join("") : '<p class="bussub">' + T("📚 ", "📚 ") + esc(R.ls.map(function (l) { return lname(l.n); }).join(" · ")) + "</p>";
      var nq = Math.min(RQ, R.qs.length - qi);
      return h + '<div class="hzoa"><button type="button" class="go" data-busgo="' + (ri + 1) + '">' + T("يلا " + nq + " أسئلة", nq + " questions") + CH + "</button>" + (nA ? stop : "") + "</div></div>";
    }
    return h + '<div class="hzqq"><small>' + (nA + 1) + "/" + qs.length + " · " + T("الجولة ", "Tour ") + (ri + 1) + "/" + NR + "</small><p>" + esc(q.q) + '</p><div class="hzqo">' +
      q.o.map(function (o, k) { return '<button type="button" data-busq="' + esc(q.id) + '" data-k="' + k + '"><span>' + (FR() ? "abc" : "أبج").charAt(k) + "</span>" + esc(o) + "</button>"; }).join("") + "</div></div>" + (nA ? '<div class="hzoa">' + stop + "</div>" : "") + "</div>";
  }
  function paint() { if (ov) ov.innerHTML = sheet(); }
  function answer(q, k) {
    var st = state(cur.day); st.ans = st.ans || {}; if (st.ans[q.id] != null) return;
    if (!st.plan) st.plan = cur.r;
    st.ans[q.id] = k; fb = q.id; var ok = k === q.a, was = !!st.done;
    if (!st.done && isDoneS(st)) st.done = Date.now();
    lsSet(K, st);
    try { if (w.Weak) w.Weak.record(q, ok); } catch (x) {}
    try { if (w.NursinSRS) { if (w.NursinSRS.answer) w.NursinSRS.answer(q, ok); else if (w.NursinSRS.record) w.NursinSRS.record(q, ok); } } catch (x) {}
    try { var R = w.NursinRet, id = R && R.ofQ ? R.ofQ(q) : null; if (id && R.apply) R.apply(id, ok ? "ok" : "bad"); } catch (x) {}
    if (st.done && !was) try { d.dispatchEvent(new CustomEvent("nursin:bus")); } catch (x) {}
  }
  function isDoneS(s) { var n = nAns(s), P = s.plan; return n >= TICK || !!(P && P.qs && P.qs.length && n >= P.qs.length); }
  function close() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); ov = null; try { d.body.classList.remove("busopen"); } catch (e) {} try { d.dispatchEvent(new CustomEvent("nursin:bus")); } catch (x) {} }
  function click(e) {
    var t = e.target, b;
    if (t === ov || (t.closest && t.closest("[data-busx]"))) { close(); return; }
    if (!t.closest) return;
    if ((b = t.closest("[data-busgo]"))) { var g = +b.getAttribute("data-busgo") || 1, s0 = state(cur.day); stage = Math.max(stage, g); if (!s0.plan) s0.plan = cur.r; s0.pr = Math.max(s0.pr | 0, g); lsSet(K, s0); paint(); return; }
    if (t.closest("[data-busnext]")) { fb = null; paint(); return; }
    if ((b = t.closest("[data-busq]"))) { var q = qById(b.getAttribute("data-busq")); if (q) { answer(q, +b.getAttribute("data-k")); paint(); } }
  }
  function extraNow() { var x = { weak: [], due: [] }; try { if (w.Weak && w.Weak.items) x.weak = Object.keys(w.Weak.items() || {}); } catch (e) {} try { if (w.NursinSRS && w.NursinSRS.questions) x.due = (w.NursinSRS.questions() || []).map(function (q) { return q && q.id; }).filter(Boolean); } catch (e) {} return x; }
  // the session is planned once per day and kept (nursin_bus_v1.plan), so closing and reopening resumes exactly where he stopped
  function plan(day) { var s = state(day), P = s.plan; if (P && P.qs && P.qs.length && P.rounds) return P; P = pick(day, lessonsNow(), w.QUIZ || [], w.TRICKS || null, extraNow()); if (P.qs.length) { s.plan = P; lsSet(K, s); } return P; }
  function open(day) {
    day = day || today();
    var go = function () {
      var r = plan(day); cur = { day: day, r: r, resumed: nAns(state(day)) > 0 };
      if (!ov) {
        ov = d.createElement("div"); ov.className = "busov"; ov.addEventListener("click", click);
        (d.getElementById("hz") || d.body).appendChild(ov); try { d.body.classList.add("busopen"); } catch (e) {}
      }
      paint();
    };
    stage = 0; fb = null;
    loadTricks(go);
    return true;
  }
  // the sheet's HTML for a day without the DOM (tests): stage 0 = the round's key points, 1 = past the first round's points
  function render(day, stg) { day = day || today(); cur = { day: day, r: plan(day), resumed: nAns(state(day)) > 0 }; stage = stg | 0; fb = null; return { html: sheet(), r: cur.r }; }
  // tests: answer the current question with option k
  function tap(k) { var st = state(cur.day), A = st.ans || {}, id = null; cur.r.qs.forEach(function (x) { if (!id && A[x] == null) id = x; }); var q = id ? qById(id) : null; if (q) answer(q, k | 0); fb = null; return q; }
  if (d && d.addEventListener) d.addEventListener("keydown", function (e) { if (ov && e.key === "Escape") close(); });
  w.NursinBus = { KEY: K, DAYS: DAYS, FROM: FROM, BACK: BACK, NQ: NQ, on: on, nowOn: nowOn, subjects: subjects, pick: pick, isDone: isDone, prog: prog, plan: plan, tap: tap, TICK: TICK, RQ: RQ, state: state, open: open, close: close, today: today, render: render };
})(window, typeof document !== "undefined" ? document : null);
