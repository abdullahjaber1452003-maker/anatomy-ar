/* 🔁 «التكرار المتباعد» v2 — spaced repetition (Abdullah, Oct 28 2026 8:32 PM; v2 Nov 3 2026 7:02 PM: «حتى لو ما غلطت، الشي يلّي بعملو
   ينحط بالتكرار المتباعد … إذا قلت إني كنت متأكد بيرجع بعد فترة أطول … من هون لآخر السنة» + «كل يوم بالمسار، عن كل شي بالدروس»).
   • EVERY answered item enters, right or wrong, from every place (quiz + lesson quizzes, Osman, 🌅/🔗 sheets, 🎯 midterm mocks, cards, 🩺 cases,
     ✍️ blanks, games, duels, class quizzes). Ids: bank q001…, 🔗 k01…, ✍️ b01…, 🩺 cs-<subject>-<lesson>-<i> (same ids as the midterm mock).
   • Steps (days): 1 → 3 → 7 → 14 → 30 → 60 → 120, and 120 again until the end of the year (nothing leaves).
       wrong / «😓 صعبة» → tomorrow (step 1) · right, first time → 3 days · right on a due review → one step on
       «✅ كنت متأكد» → one EXTRA step (first time: 7 days) · «🤔 حزرت» → one step back (first time: tomorrow) · no tap = a normal right answer.
       A right answer before the due day changes nothing (a «حزرت» may bring it closer).
   • A day = at most CAP (20) items: the most overdue first (overflow rolls to the next days), plus up to NEWD (5) NEW items a day from lessons he
     already reached (read or quizzed) but never answered — today's midterm-plan subjects first — so every lesson's questions get into the cycle.
     The day's list is fixed once (plan) and shows as «🔁 التكرار المتباعد · N سؤال اليوم» (pinned step of «مسار اليوم», assets/home.js).
   • Saved per browser in localStorage nursin_srs_v2 {v:2, items:{id:{s,d,m,n?}}, plan:{d,ids,nw}} (s = step 0–6, d = due Beirut day,
     m = last change ms, n = a new item not answered yet). v1 (nursin_srs_v1, steps 1/3/7/14) is migrated item by item and left in place.
     Signed-in students keep a copy under users/{uid}/srs/main (assets/qstats.js; rules v15+ allow ≤ 400 keys in `items`, so the copy is
     packed in chunks «z0», «z1»… of up to 250 items each — no rules change). */
(function (w, d) {
  var K = "nursin_srs_v2", K1 = "nursin_srs_v1", STEPS = [1, 3, 7, 14, 30, 60, 120], TOP = STEPS.length - 1, CAP = 20, NEWD = 5, MAX = 3000, CH = 250;
  var ID = /^(?:q\d{3,4}|k\d{2,3}|b\d{2,3}|cs-[a-z]+-[a-z0-9_]+-\d{1,2})$/, DAYRE = /^\d{4}-\d\d-\d\d$/;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() {
    var N = w.Nursin; if (N && N.dayKey) try { return N.dayKey(); } catch (e) {}
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function addDays(day, n) { var t = new Date(day + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function dayDiff(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function okId(id) { return typeof id === "string" && ID.test(id); }
  function clampS(s) { return Math.max(0, Math.min(TOP, s | 0)); }
  function num(m) { m = +m; return isFinite(m) && m > 0 ? Math.round(m) : 0; }   // ms timestamps are past 2^31: never `| 0` them

  /* ---------------- store + migration v1 → v2 ---------------- */
  function blank() { return { v: 2, items: {}, plan: null }; }
  // pure (tests): copy v1 items into a v2 store; per item the newer change wins; returns true when something changed
  function migrate(v1, x) {
    var ch = false, it = v1 && v1.items && typeof v1.items === "object" ? v1.items : {};
    Object.keys(it).forEach(function (k) {
      var r = it[k]; if (!okId(k) || !r || typeof r.d !== "string" || !DAYRE.test(r.d)) return;
      var l = x.items[k]; if (l && num(l.m) >= num(r.m)) return;
      x.items[k] = { s: Math.min(3, clampS(r.s)), d: r.d, m: num(r.m) }; ch = true;
    });
    return ch;
  }
  var v1Seen = false;
  function load() {
    var x = lsGet(K), ch = false;
    if (!x || typeof x !== "object" || !x.items || typeof x.items !== "object") { x = blank(); ch = migrate(lsGet(K1), x) || !!lsGet(K1); if (ch) x.mig = Date.now(); v1Seen = true; }
    else if (!v1Seen) { v1Seen = true; ch = migrate(lsGet(K1), x); }                 // an old tab may still have written v1 since
    x.v = 2;
    if (ch) write(x);
    return x;
  }
  function write(x) {
    var ks = Object.keys(x.items);
    if (ks.length > MAX) ks.sort(function (a, b) { return num(x.items[a].m) - num(x.items[b].m); }).slice(0, ks.length - MAX).forEach(function (k) { delete x.items[k]; });
    try { localStorage.setItem(K, JSON.stringify(x)); } catch (e) {}
  }
  function save(x) {
    write(x);
    try { d.dispatchEvent(new CustomEvent("nursin:srs", { detail: { due: left(x, today()).length } })); } catch (e) {}
  }

  /* ---------------- grading (pure; tests call NursinSRS.grade) ----------------
     g: "wrong" | "hard" | "ok" | "sure" | "guess"  →  {r: again|new|next|guess|early, s, days} */
  function put(x, id, s, day, now) { x.items[id] = { s: s, d: addDays(day, STEPS[s]), m: now }; return STEPS[s]; }
  function grade(x, id, g, day, now) {
    var it = x.items[id], fresh = !it || !!it.n;
    if (g === "wrong" || g === "hard") return { r: "again", s: 0, days: put(x, id, 0, day, now) };
    if (fresh) { var s0 = g === "guess" ? 0 : g === "sure" ? 2 : 1; return { r: "new", s: s0, days: put(x, id, s0, day, now) }; }
    var s = clampS(it.s);
    if (it.d > day) {                                      // not due yet: a right answer changes nothing, «حزرت» may bring it closer
      if (g === "guess") { var sg = Math.max(0, s - 1), dg = addDays(day, STEPS[sg]); if (dg < it.d) { x.items[id] = { s: sg, d: dg, m: now }; return { r: "guess", s: sg, days: STEPS[sg] }; } }
      return { r: "early", s: s, days: dayDiff(day, it.d) };
    }
    var ns = g === "sure" ? Math.min(TOP, s + 2) : g === "guess" ? Math.max(0, s - 1) : Math.min(TOP, s + 1);
    return { r: g === "guess" ? "guess" : "next", s: ns, days: put(x, id, ns, day, now) };
  }
  // v1-style wrapper kept for old callers: ok/hard → the same words as before where they still apply
  function step(x, qid, ok, day, now, hard) { return grade(x, qid, hard ? "hard" : ok ? "ok" : "wrong", day, now).r; }

  /* ---------------- answering ---------------- */
  var last = null;                                          // the latest answer (so a «✅ كنت متأكد / 🤔 حزرت» tap can re-grade it)
  function rec(q, g) {
    var id = q && q.id; if (!okId(id)) return null;
    var x = load(), day = today(), prev = x.items[id] ? JSON.parse(JSON.stringify(x.items[id])) : null;
    var r = grade(x, id, g, day, Date.now());
    last = { id: id, prev: prev, day: day, r: r };
    if (r.r !== "early") save(x);
    return r;
  }
  function regrade(q, g) {
    var id = q && q.id; if (!okId(id)) return null;
    if (!last || last.id !== id) return rec(q, g);
    var x = load(), prev = last.prev;
    if (prev) x.items[id] = prev; else delete x.items[id];
    var r = grade(x, id, g, last.day, Date.now());
    last.r = r; save(x); return r;
  }

  /* ---------------- the question bank (quiz + 🔗 + ✍️ + 🩺 when loaded) ---------------- */
  function blankItem(b, all) {
    if (!b || !b.id || !b.s || !b.a) return null;
    var x = b.x || String(b.s).replace("___", "«" + b.a + "»");
    if (b.o && b.o.length >= 2) { var k = b.o.indexOf(b.a); if (k < 0) return null; return { id: b.id, t: b.t, l: b.l, q: "✍️ " + b.s, o: b.o.slice(), a: k, x: x, _k: "b" }; }
    var pool = all.filter(function (o) { return o && o.id !== b.id && o.a && o.a !== b.a && o.t === b.t; });   // a typed blank → 3 choices (answers of the same topic)
    if (pool.length < 2) pool = all.filter(function (o) { return o && o.id !== b.id && o.a && o.a !== b.a; });
    if (pool.length < 2) return null;
    var h = hash(b.id), o1 = pool[h % pool.length].a, o2 = pool[(h >>> 4) % pool.length].a;
    if (o2 === o1) o2 = pool[((h >>> 4) + 1) % pool.length].a;
    var o = [o1, o2], a = h % 3; o.splice(a, 0, b.a);
    return { id: b.id, t: b.t, l: b.l, q: "✍️ " + b.s, o: o, a: a, x: x, _k: "b" };
  }
  function caseItems(c) {
    var fr = FR() && c.fr ? c.fr : null, out = [];
    (c.qs || []).forEach(function (y, i) {
      if (!y || !y.o || y.o.length < 2) return;
      var yf = fr && fr.qs && fr.qs[i] ? fr.qs[i] : (fr && y.fr ? y.fr : null), pt = (fr ? fr.pt : c.pt) || "", v = (fr ? fr.v : c.v) || "";
      out.push({ id: "cs-" + String(c.id).replace(":", "-") + "-" + i, t: "", q: "🩺 " + pt + (v ? " (" + v + ")" : "") + "<br>" + (yf && yf.q ? yf.q : y.q), o: yf && yf.o ? yf.o : y.o, a: y.a, x: yf && yf.x ? yf.x : y.x, _k: "c", _l: c.id });
    });
    return out;
  }
  function bank() {
    var m = {};
    (w.QUIZ || []).concat(w.LINKQ || []).forEach(function (q) { if (q && q.id) m[q.id] = q; });   // + 🔗 «اربط» (assets/link-data.js)
    var B = w.BLANKS || []; B.forEach(function (b) { var it = blankItem(b, B); if (it) m[it.id] = it; });
    (w.CASES || []).forEach(function (c) { caseItems(c).forEach(function (it) { m[it.id] = it; }); });
    return m;
  }
  function known(id, b) {                                   // can this page tell whether the id still exists?
    if (/^cs-/.test(id)) return w.CASES ? !!b[id] : true;
    if (/^b/.test(id)) return w.BLANKS ? !!b[id] : true;
    return w.QUIZ ? !!b[id] : true;
  }

  /* ---------------- the day's list (≤ CAP, most overdue first, + new items) ---------------- */
  function dueOld(x, day) {
    return Object.keys(x.items).filter(function (k) { var it = x.items[k]; return it && !it.n && it.d <= day; })
      .sort(function (a, b) { var A = x.items[a], B = x.items[b]; return A.d < B.d ? -1 : A.d > B.d ? 1 : (A.s - B.s) || (num(A.m) - num(B.m)) || (a < b ? -1 : 1); });
  }
  function isLeft(x, k, day) { var it = x.items[k]; return !!it && (it.n ? true : it.d <= day); }
  function left(x, day) { var p = x.plan; return p && p.d === day && p.ids ? p.ids.filter(function (k) { return isLeft(x, k, day); }) : []; }
  function midSubs(day) {                                   // today's + the next 2 days' midterm-plan subjects (assets/midterm.js) until Nov 16
    var M = w.NursinMid, out = {}; if (!M || !M.active || !M.planDay) return out;
    try {
      if (!M.active(day)) return out;
      for (var i = 0; i < 3; i++) { var p = M.planDay(addDays(day, i)); (p && p.subs || []).forEach(function (s) { if (s === "msall") ["cardio", "neuro", "henderson", "medsurg"].forEach(function (y) { out[y] = 1; }); else if (s !== "weak") out[s] = 1; }); }
    } catch (e) {}
    return out;
  }
  function reachedFn() {
    var R = w.NursinRet, rd = lsGet("nursin_read_v1") || {}, seen = {};
    Object.keys(rd).forEach(function (k) { if (+rd[k] > 0) seen[k.split("#")[0]] = 1; });
    return function (id) { if (!id) return false; if (seen[id]) return true; try { return !!(R && R.score && R.score(id) != null); } catch (e) { return false; } };
  }
  // pure-ish (tests): up to n new ids from lessons already reached, never answered; priority subjects first, the faded lessons first, one per lesson per round
  function pickNew(x, n, day, o) {
    o = o || {}; var R = w.NursinRet, reached = o.reached || reachedFn(), pri = o.pri || midSubs(day), byL = {}, out = [];
    if (n <= 0) return out;
    var ofQ = o.ofQ || function (q) { return R && R.ofQ ? R.ofQ(q) : null; };
    var B = w.BLANKS || [], pool = (w.QUIZ || []).concat(w.LINKQ || []).concat(B.map(function (b) { return blankItem(b, B); }).filter(Boolean));
    pool.forEach(function (q) {
      if (!q || !okId(q.id) || x.items[q.id]) return;
      var ls = q.ls && q.ls.length ? q.ls : [ofQ(q)]; if (!ls.every(reached)) return;
      var lid = ls[ls.length - 1]; (byL[lid] || (byL[lid] = [])).push(q.id);
    });
    var score = function (id) { try { var s = R && R.score ? R.score(id) : null; return s == null ? 50 : s; } catch (e) { return 50; } };
    var L = Object.keys(byL).sort(function (a, b) {
      var pa = pri[a.split(":")[0]] ? 0 : 1, pb = pri[b.split(":")[0]] ? 0 : 1;
      return (pa - pb) || (score(a) - score(b)) || (hash(day + a) - hash(day + b));
    });
    L.forEach(function (l) { byL[l].sort(function (a, b) { return hash(day + a) - hash(day + b); }); });
    for (var round = 0; out.length < n; round++) {
      var got = false;
      for (var i = 0; i < L.length && out.length < n; i++) { var id = byL[L[i]][round]; if (id) { out.push(id); got = true; } }
      if (!got) break;
    }
    return out;
  }
  function bankReady() { return !!(w.QUIZ && w.NursinRet); }
  // build / top up today's list; returns true when the store changed (pure on x apart from reading the banks)
  function ensure(x, day, now) {
    var p = x.plan, ch = false;
    if (!p || p.d !== day || !Array.isArray(p.ids)) { p = x.plan = { d: day, ids: dueOld(x, day).slice(0, CAP), nw: 0 }; ch = true; }
    else if (p.ids.length < CAP) {                          // something came due since (another device): top up, never past CAP
      var inP = {}; p.ids.forEach(function (k) { inP[k] = 1; });
      dueOld(x, day).forEach(function (k) { if (!inP[k] && p.ids.length < CAP) { p.ids.push(k); ch = true; } });
    }
    if (!p.nw && bankReady()) {                             // ✨ new items, once a day, only when there is room
      var room = Math.min(NEWD, CAP - p.ids.length), inP2 = {}; p.ids.forEach(function (k) { inP2[k] = 1; });
      var pend = Object.keys(x.items).filter(function (k) { return x.items[k].n && !inP2[k]; }).sort(function (a, b) { return x.items[a].d < x.items[b].d ? -1 : x.items[a].d > x.items[b].d ? 1 : 0; });
      var add = pend.slice(0, Math.max(0, room));
      if (add.length < room) pickNew(x, room - add.length, day).forEach(function (k) { x.items[k] = { s: 0, d: day, m: now || Date.now(), n: 1 }; add.push(k); });
      add.forEach(function (k) { p.ids.push(k); });
      p.nw = 1; p.nn = add.length; ch = true;
    }
    return ch;
  }
  function cur() { var x = load(), day = today(); if (ensure(x, day, Date.now())) write(x); return { x: x, day: day }; }

  /* ---------------- what is coming (CAP a day, overflow rolls on) ---------------- */
  function forecastOf(x, day, n) {
    var inLeft = {}; left(x, day).forEach(function (k) { inLeft[k] = 1; });
    var by = {}, back = 0;
    Object.keys(x.items).forEach(function (k) { var it = x.items[k]; if (!it || it.n || inLeft[k]) return; if (it.d <= day) back++; else by[it.d] = (by[it.d] | 0) + 1; });
    var out = [];
    for (var i = 1; i <= n; i++) { back += by[addDays(day, i)] | 0; var c = Math.min(CAP, back); out.push(c); back -= c; }
    return out;
  }
  function daysTxt(n) {
    if (n <= 0) return T("اليوم", "aujourd'hui");
    if (n === 1) return T("بكرا", "demain");
    if (n === 7) return T("أسبوع", "1 semaine");
    if (n === 14) return T("أسبوعين", "2 semaines");
    if (n === 30) return T("شهر", "1 mois");
    if (n === 60) return T("شهرين", "2 mois");
    if (n === 120) return T("٤ أشهر", "4 mois");
    return FR() ? n + " jours" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم";
  }
  function inTxt(n) { return n === 1 ? T("بكرا", "demain") : T("بعد ", "dans ") + daysTxt(n); }

  /* ---------------- small UI pieces (quiz, cases, sheets, home, حفظي) ---------------- */
  function tagHtml(r) {                                     // one line under an answer
    if (!r) return "";
    var t = r.r === "again" ? T("🔁 رح يرجعلك بكرا بالتكرار المتباعد", "🔁 Elle revient demain en révision espacée")
      : r.r === "early" ? T("🔁 بالتكرار المتباعد · موعدو ", "🔁 En révision espacée · prévue ") + inTxt(r.days)
      : r.r === "new" ? T("🔁 انحطّ بالتكرار المتباعد · بيرجع ", "🔁 Ajoutée à la révision espacée · revient ") + inTxt(r.days)
      : T("🔁 بيرجع ", "🔁 Revient ") + inTxt(r.days);
    return '<p class="small wtag srtag">' + esc(t) + "</p>";
  }
  // «✅ كنت متأكد / 🤔 حزرت» after a RIGHT answer (no tap = a normal right answer). opt.onPick(kind, r) after a tap.
  function confRow(q, opt) {
    opt = opt || {}; if (!d || !d.createElement || !q || !okId(q.id)) return null;
    var row = d.createElement("div"); row.className = "cfrow srcf";
    row.innerHTML = "<span>" + esc(T("🎯 كيف كان جوابك؟", "🎯 Ta réponse, c'était…")) + '</span><button class="btn sm cfs" type="button" data-srcf="sure">' + esc(T("✅ كنت متأكد", "✅ J'étais sûr(e)")) +
      '</button><button class="btn sm cfg" type="button" data-srcf="guess">' + esc(T("🤔 حزرت", "🤔 J'ai deviné")) + "</button>";
    row.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-srcf]"); if (!b) return;
      var kind = b.getAttribute("data-srcf"), r = regrade(q, kind);
      row.className = "small wtag srcfok";
      row.textContent = (kind === "sure" ? T("✅ تمام، ما رح يرجع قبل ", "✅ Parfait, elle ne revient pas avant ") + daysTxt(r ? r.days : 7)
        : T("🤔 ولا يهمّك، بيرجعلك ", "🤔 Pas grave, elle revient ") + inTxt(r ? r.days : 1));
      var tg = opt.tag || (row.parentNode && row.parentNode.querySelector(".srtag")); if (tg && tg.parentNode) tg.parentNode.removeChild(tg);
      if (opt.onPick) try { opt.onPick(kind, r); } catch (x) {}
    });
    return row;
  }
  function whatHtml() {
    return '<div class="srwhat"><p>1️⃣ ' + esc(T("كل سؤال بتحلّو، صح أو غلط، بينحطّ بالتكرار المتباعد — من الكويزات، الدروس، عثمان، الحالات والألعاب.", "Chaque question à laquelle tu réponds, juste ou fausse, entre dans la révision espacée — quiz, leçons, Osman, cas et jeux.")) + "</p>" +
      "<p>2️⃣ " + esc(T("بيرجعلك بعد ١ ← ٣ ← ٧ ← ١٤ ← ٣٠ ← ٦٠ ← ١٢٠ يوم، لآخر السنة: الغلط بيرجع بكرا، «✅ كنت متأكد» بيطوّل، «🤔 حزرت» بيقرّب.", "Elle revient après 1 → 3 → 7 → 14 → 30 → 60 → 120 jours, jusqu'à la fin de l'année : une erreur revient demain, « ✅ J'étais sûr(e) » allonge, « 🤔 J'ai deviné » rapproche.")) + "</p>" +
      "<p>3️⃣ " + esc(T("كل يوم بالكتير " + CAP + " سؤال بخطوة «🔁 التكرار المتباعد» بمسار اليوم، ومعهن شي " + NEWD + " جداد من الدروس يلّي قريتها، لحتى يفوت كل شي بالدروس.", "Chaque jour, " + CAP + " questions au plus dans l'étape « 🔁 Révision espacée » du parcours, avec environ " + NEWD + " nouvelles des leçons que tu as lues, pour que tout y passe.")) + "</p></div>";
  }
  function what(from) {
    var U = w.NursinUI, h = whatHtml() + '<p><a class="btn pri" href="quiz.html?t=review">' + esc(T("🔁 راجع هلّق", "🔁 Réviser maintenant")) + "</a></p>";
    if (U && U.openSheet) { U.openSheet("srsheet", T("🔁 شو هوّي التكرار المتباعد؟", "🔁 C'est quoi la révision espacée ?"), h, from || null); return true; }
    return false;
  }
  function nextLine() {
    var c = cur(), f = forecastOf(c.x, c.day, 7), wk = 0; f.forEach(function (n) { wk += n; });
    return T("📅 الجاية: بكرا " + f[0] + " · هالأسبوع " + wk, "📅 À venir : demain " + f[0] + " · cette semaine " + wk);
  }
  function status() {                                       // for the home step / حفظي card
    var c = cur(), x = c.x, p = x.plan || {}, l = left(x, c.day), b = bank(), hasB = !!w.QUIZ;
    l = l.filter(function (k) { return !hasB || known(k, b); });
    var nNew = l.filter(function (k) { return x.items[k] && x.items[k].n; }).length;
    return { n: l.length, nNew: nNew, nOld: l.length - nNew, planned: (p.ids || []).length, total: Object.keys(x.items).filter(function (k) { return !x.items[k].n; }).length };
  }
  // ☁️ users/{uid}/srs/main copy: {z0: "id,s,d,m36[,n];…", z1: …} (≤ 400 keys allowed by rules v15+, values are free)
  function pack(items) {
    var ks = Object.keys(items || {}).filter(okId).sort(), out = {};
    for (var i = 0; i < ks.length; i += CH) out["z" + (i / CH)] = ks.slice(i, i + CH).map(function (k) { var it = items[k]; return [k, clampS(it.s), it.d, num(it.m).toString(36)].concat(it.n ? [1] : []).join(","); }).join(";");
    return out;
  }
  function unpack(remote) {
    var out = {};
    Object.keys(remote || {}).forEach(function (key) {
      var v = remote[key];
      if (/^z\d+$/.test(key) && typeof v === "string") v.split(";").forEach(function (row) { var a = row.split(","); if (okId(a[0]) && DAYRE.test(a[2] || "")) out[a[0]] = { s: clampS(+a[1]), d: a[2], m: parseInt(a[3], 36) || 0, n: a[4] === "1" ? 1 : 0 }; });
      else if (okId(key) && v && typeof v.d === "string" && DAYRE.test(v.d)) out[key] = { s: Math.min(3, clampS(v.s)), d: v.d, m: num(v.m), n: 0 };   // an old v1 copy
    });
    return out;
  }
  function merge(remote) {                                  // per item the newer change wins
    var r = unpack(remote), x = load(), ch = false;
    Object.keys(r).forEach(function (k) { var l = x.items[k], v = r[k]; if (!l || v.m > num(l.m)) { x.items[k] = v.n ? { s: v.s, d: v.d, m: v.m, n: 1 } : { s: v.s, d: v.d, m: v.m }; ch = true; } });
    if (ch) save(x);
    return ch;
  }
  function behind(remote) {                                 // does the account copy miss anything this phone has?
    var r = unpack(remote), l = load().items;
    return Object.keys(remote || {}).some(function (k) { return !/^(z|lg)\d+$/.test(k); }) || Object.keys(l).some(function (k) { return okId(k) && (!r[k] || num(r[k].m) < num(l[k].m)); });
  }

  w.NursinSRS = {
    V: 2, STEPS: STEPS, CAP: CAP, NEWD: NEWD, key: K, key1: K1, ID: ID, step: step, grade: grade, migrate: migrate, ensure: ensure, pickNew: pickNew, forecastOf: forecastOf,
    addDays: addDays, today: today, daysTxt: daysTxt, inTxt: inTxt, okId: okId, pack: pack, unpack: unpack, merge: merge, behind: behind, blankItem: blankItem, caseItems: caseItems,
    record: function (q, ok) { var r = rec(q, ok ? "ok" : "wrong"); return r ? r.r : "none"; },
    answer: function (q, ok) { return rec(q, ok ? "ok" : "wrong"); },        // the whole result {r, s, days}
    hard: function (q) { var r = rec(q, "hard"); return r ? r.r : "none"; },
    regrade: regrade,
    has: function (qid) { var it = load().items[qid]; return !!it && !it.n; },
    count: function () { return status().n; },
    status: status,
    total: function () { return status().total; },
    questions: function (o) {
      var c = cur(), b = bank(), ids = o && o.more ? dueOld(c.x, c.day).filter(function (k) { return left(c.x, c.day).indexOf(k) < 0; }).slice(0, CAP) : left(c.x, c.day);
      return ids.map(function (k) { return b[k]; }).filter(Boolean);
    },
    more: function () { var c = cur(), l = left(c.x, c.day); return dueOld(c.x, c.day).filter(function (k) { return l.indexOf(k) < 0; }).length; },
    needsCases: function () { var c = cur(); return !w.CASES && left(c.x, c.day).concat(dueOld(c.x, c.day)).some(function (k) { return /^cs-/.test(k); }); },
    forecast: function (n) { var c = cur(); return forecastOf(c.x, c.day, n || 7); },
    dueByDay: function (n) { var c = cur(), f = forecastOf(c.x, c.day, (n || 14) - 1), out = {}, st = status(); if (st.n) out[c.day] = st.n; f.forEach(function (v, i) { if (v) out[addDays(c.day, i + 1)] = v; }); return out; },
    nextLine: nextLine, tagHtml: tagHtml, confRow: confRow, what: what, whatHtml: whatHtml,
    items: function () { return load().items; },
    remote: function () { return pack(load().items); },
    add: function (qids) { var x = load(), day = today(), now = Date.now(), n = 0; (qids || []).forEach(function (k) { if (okId(k) && (!x.items[k] || x.items[k].n)) { x.items[k] = { s: 0, d: addDays(day, 1), m: now }; n++; } }); if (n) save(x); return n; }
  };
  if (d && d.addEventListener) d.addEventListener("click", function (e) {      // «شو هيدا؟» anywhere
    var b = e.target && e.target.closest && e.target.closest("[data-srswhat]"); if (!b) return; e.preventDefault(); what(b);
  });
})(window, document);
