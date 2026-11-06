/* 🚌 «مراجعة سريعة قبل الدوام» — 29n (Abdullah, Nov 6 2026 7:37 AM: «بدي ب أثناء ما أنا رايح عالدوام يكون في شي ب مسار اليوم… شغلات
   سريعة امرق عليها قبل الدوام… لهيدا اليوم»). Class-day mornings (Thu/Fri/Sat, 4:00 AM → 2:30 PM Beirut) «🧭 مسار اليوم» starts with this
   step (assets/home.js, k "bus"); one tap opens a 2–3 min flash review of TODAY's class subjects only:
     • up to 3 key points = the «🧠 حيلة حفظ» of those lessons (assets/tricks-data.js, written from the site's own lessons, AR + fr)
     • 4 quick questions from the same bank as the quizzes (window.QUIZ), one per lesson, lessons the student already opened first
   Answers feed the same trackers as Osman's path questions (Weak, SRS, Retain). Done (✓ on the path) = every question answered.
   Kept per Beirut day in localStorage nursin_bus_v1 {d, ans:{qid:k}}. on / subjects / pick are pure (tests/site.test.js #261–#263). */
(function (w, d) {
  var K = "nursin_bus_v1", FROM = 4 * 60, BACK = 14 * 60 + 30, NQ = 4, NP = 3;
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
  /* the day's review — pure: L = lessons [{id, s, t, l, n, href, read, score, added}], Q = window.QUIZ, tricks = window.TRICKS (may be null)
     → { subs, ls:[{id, n, href}], qs:[qid] (4), pts:[{id, n, t, m, fr}] (≤ 3) } — the same all day */
  function pick(day, L, Q, tricks) {
    var subs = subjects(day), h = hash("bus" + day), of = lessonOf(L || []), byL = {};
    (Q || []).forEach(function (q) { var id = q && q.id ? of(q) : null; if (id) (byL[id] || (byL[id] = [])).push(q.id); });
    var xs = (L || []).filter(function (l) { return subs.indexOf(l.s) > -1 && byL[l.id] && byL[l.id].length; });
    function rot(a) { if (!a.length) return a; var k = h % a.length; return a.slice(k).concat(a.slice(0, k)); }
    var seen = xs.filter(function (l) { return l.read || l.score != null; }), rest = xs.filter(function (l) { return !(l.read || l.score != null); });
    var newest = rest.reduce(function (m, l) { return (l.added || "") > m ? l.added || "" : m; }, "");
    var fresh = newest ? rest.filter(function (l) { return (l.added || "") === newest; }) : [];
    var order = rot(seen).concat(fresh, rot(rest.filter(function (l) { return fresh.indexOf(l) < 0; })));
    var ls = [], used = {};                              // one lesson per subject first, then fill
    order.forEach(function (l) { if (ls.length < NQ && !used[l.s]) { used[l.s] = 1; ls.push(l); } });
    order.forEach(function (l) { if (ls.length < NQ && ls.indexOf(l) < 0) ls.push(l); });
    var qs = [], i = 0, guard = 0;
    while (qs.length < NQ && ls.length && guard++ < 40) {
      var a = byL[ls[i % ls.length].id], k = (h >>> (i % 8)) + Math.floor(i / ls.length);
      var id = a[k % a.length]; if (qs.indexOf(id) < 0) qs.push(id); else { for (var j = 0; j < a.length; j++) if (qs.indexOf(a[j]) < 0) { qs.push(a[j]); break; } }
      i++;
    }
    var pts = [];
    ls.forEach(function (l) { var tr = tricks && tricks[l.id]; if (pts.length < NP && tr && tr.length) { var x = tr[h % tr.length]; pts.push({ id: l.id, n: l.n, t: x.t, m: x.m, fr: x.fr || null }); } });
    return { subs: subs, ls: ls.map(function (l) { return { id: l.id, n: l.n, href: l.href }; }), qs: qs.slice(0, NQ), pts: pts };
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function state(day) { var s = lsGet(K); return s && s.d === (day || today()) ? s : { d: day || today(), ans: {} }; }
  function isDone(day) { var s = state(day); return !!s.done; }
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
  function sheet() {
    var st = state(cur.day), A = st.ans || {}, qs = cur.r.qs.map(qById).filter(Boolean), nA = qs.filter(function (q) { return A[q.id] != null; }).length;
    var nOk = qs.filter(function (q) { return A[q.id] === q.a; }).length, CH = FR() ? " ›" : " ‹";
    var h = '<div class="buscard" role="dialog" aria-modal="true" aria-labelledby="bush"><div class="bushd"><b id="bush">' + T("🚌 مراجعة سريعة قبل الدوام", "🚌 Révision rapide avant les cours") + '</b><button type="button" class="busx" data-busx aria-label="' + T("سكّر", "Fermer") + '">✕</button></div>' +
      '<p class="bussub">' + T("مواد اليوم: ", "Cours du jour : ") + esc(cur.r.subs.map(subName).join(" · ")) + T(" — دقيقتين بالطريق", " — 2 min sur le trajet") + "</p>";
    if (!qs.length) return h + '<p class="hzoq">' + T("ما في أسئلة لمواد اليوم بعد", "Pas encore de questions pour les cours du jour") + "</p></div>";
    if (stage === 0 && !nA) {                           // 🧠 the key points first
      if (cur.r.pts.length) h += '<p class="busst">' + T("🧠 ٣ نقاط تمرق عليهن", "🧠 Les points clés") + "</p>" + cur.r.pts.map(function (p) { var f = FR() && p.fr ? p.fr : null; return '<div class="buspt"' + (f ? " data-nofr" : "") + "><small>" + esc(lname(p.n)) + "</small><b>" + esc(f ? f.t : p.t) + "</b><p>" + esc(f ? f.m : p.m) + "</p></div>"; }).join("");
      else h += '<p class="busst">' + T("📚 دروس اليوم: ", "📚 Leçons du jour : ") + esc(cur.r.ls.map(function (l) { return lname(l.n); }).join(" · ")) + "</p>";
      return h + '<div class="hzoa"><button type="button" class="go" data-busgo>' + T("يلا " + qs.length + " أسئلة سريعة", qs.length + " questions rapides") + CH + "</button></div></div>";
    }
    var fq = fb ? qById(fb) : null;
    if (fq && A[fq.id] != null) {
      var ok = A[fq.id] === fq.a;
      h += '<div class="hzqf ' + (ok ? "ok" : "bad") + '"><b>' + (ok ? T("✅ صح!", "✅ Correct !") : T("❌ الجواب: ", "❌ La réponse : ") + esc(fq.o[fq.a])) + "</b>" + (fq.x ? "<p>" + esc(fq.x) + "</p>" : "") + "</div>";
      if (nA < qs.length) return h + '<div class="hzoa"><button type="button" class="go" data-busnext>' + T("السؤال الجاي", "Question suivante") + CH + "</button></div></div>";
    }
    if (nA >= qs.length) return h + '<p class="hzoq">' + (nOk === qs.length ? T("🔥 " + nOk + "/" + qs.length + "! جاهز للدوام", "🔥 " + nOk + "/" + qs.length + " ! Prêt(e) pour les cours") : T("💪 " + nOk + "/" + qs.length + ". الغلطات رح ترجعلك بالمراجعة 🔁", "💪 " + nOk + "/" + qs.length + ". Tes erreurs reviendront en révision 🔁")) + '</p><div class="hzoa"><button type="button" class="go" data-busx>' + T("✅ خلصت، بالتوفيق اليوم", "✅ Fini, bonne journée") + "</button></div></div>";
    var q = qs[nA];
    return h + '<div class="hzqq"><small>' + (nA + 1) + "/" + qs.length + "</small><p>" + esc(q.q) + '</p><div class="hzqo">' +
      q.o.map(function (o, k) { return '<button type="button" data-busq="' + esc(q.id) + '" data-k="' + k + '"><span>' + (FR() ? "abc" : "أبج").charAt(k) + "</span>" + esc(o) + "</button>"; }).join("") + "</div></div></div>";
  }
  function paint() { if (ov) ov.innerHTML = sheet(); }
  function answer(q, k) {
    var st = state(cur.day); st.ans = st.ans || {}; if (st.ans[q.id] != null) return;
    st.ans[q.id] = k; fb = q.id; var ok = k === q.a;
    if (cur.r.qs.every(function (id) { return st.ans[id] != null; })) { st.done = Date.now(); }
    lsSet(K, st);
    try { if (w.Weak) w.Weak.record(q, ok); } catch (x) {}
    try { if (w.NursinSRS) { if (w.NursinSRS.answer) w.NursinSRS.answer(q, ok); else if (w.NursinSRS.record) w.NursinSRS.record(q, ok); } } catch (x) {}
    try { var R = w.NursinRet, id = R && R.ofQ ? R.ofQ(q) : null; if (id && R.apply) R.apply(id, ok ? "ok" : "bad"); } catch (x) {}
    if (st.done) try { d.dispatchEvent(new CustomEvent("nursin:bus")); } catch (x) {}
  }
  function close() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); ov = null; try { d.body.classList.remove("busopen"); } catch (e) {} try { d.dispatchEvent(new CustomEvent("nursin:bus")); } catch (x) {} }
  function click(e) {
    var t = e.target, b;
    if (t === ov || (t.closest && t.closest("[data-busx]"))) { close(); return; }
    if (!t.closest) return;
    if (t.closest("[data-busgo]")) { stage = 1; paint(); return; }
    if (t.closest("[data-busnext]")) { fb = null; paint(); return; }
    if ((b = t.closest("[data-busq]"))) { var q = qById(b.getAttribute("data-busq")); if (q) { answer(q, +b.getAttribute("data-k")); paint(); } }
  }
  function open(day) {
    day = day || today();
    var go = function () {
      cur = { day: day, r: pick(day, lessonsNow(), w.QUIZ || [], w.TRICKS || null) };
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
  // the sheet's HTML for a day without the DOM (tests): stage 0 = key points, 1 = the questions
  function render(day, stg) { cur = { day: day || today(), r: pick(day || today(), lessonsNow(), w.QUIZ || [], w.TRICKS || null) }; stage = stg | 0; fb = null; return { html: sheet(), r: cur.r }; }
  if (d && d.addEventListener) d.addEventListener("keydown", function (e) { if (ov && e.key === "Escape") close(); });
  w.NursinBus = { KEY: K, DAYS: DAYS, FROM: FROM, BACK: BACK, NQ: NQ, on: on, nowOn: nowOn, subjects: subjects, pick: pick, isDone: isDone, state: state, open: open, close: close, today: today, render: render };
})(window, typeof document !== "undefined" ? document : null);
