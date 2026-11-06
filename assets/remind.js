/* 📌 «تذكيرات اليوم» — the reminder layer (Abdullah, Nov 6 2026 7:18 AM: «انت كل شي بتذكرني فيه ليه ما بتصير بتذكر هيك على الموقع و لكل
   المستخدمين» + voice note: the reminders stay written at the top until the student does them or taps «تمّ»). For EVERY student, signed in or not.
   index.html: a short pinned card at the very top of the home (assets/home.js puts html() between the greeting and the chips), above
   «🧭 مسار اليوم». It is NOT the path: max 4 lines, the rest behind «+N». Items (pure build(), tests):
     📌 hw   a homework (assets/homework.js, not handed in) from 2 days before its due date      → homework.html?id=…
     🎯 ex   امتحان الفصل (assets/midterm.js EXAM) from 2 days before                           → midterm.html
     🏫 cls  a class day (Thu/Fri/Sat) morning until 2:30 PM: quick recap of the newest lesson of today's subjects
     📸 ph   a class day after 2:30 PM: «صوّر دروس اليوم وحطّن عالموقع» (stays up to 2 days until done) → suggest.html (draft ready)
     📖 st   today's study suggestion (the timetable's «درس اليوم», assets/lessons.js)
     🔁 rv   one small review question (due spaced-repetition question, else a mistake of his, else any) → index.html?mq=<id> (assets/extra.js)
   Each item stays until he opens it (the tap marks it done) or taps «✅ تمّ». State: localStorage nursin_rem_v1 {done:{key:ms}, off:{st,hw,cls,ph}, offAt, q}
   mirrored on users/{uid}.remDone / remOff / remOffAt (the owner may merge a field — rules v22 unchanged; signed out = this device only).
   me.html («أنا»): #merem — a switch per kind; the same switches stop the matching phone notifications of worker v15 (users/{uid}.remOff).
   Plain ES5 (iOS 12). */
(function (w, d) {
  "use strict";
  var K = "nursin_rem_v1", DAY = 864e5, BACK = 14 * 60 + 30, MAXL = 4, KEEP = 21;
  var KINDS = ["st", "hw", "cls", "ph"];               // the switches: st = 📖+🔁 (8 PM push), hw = 📌+🎯 (push 2 days before), cls = 🏫 (7 AM push), ph = 📸
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() {                                     // YYYY-MM-DD in Beirut (formatToParts: WebKit's en-CA format() gives «11/06/2026»)
    var N = w.Nursin; if (N && N.dayKey) try { var k = N.dayKey(); if (/^\d{4}-\d\d-\d\d$/.test(k)) return k; } catch (e) {}
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10);
  }
  function hmB() { try { var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date()), o = {}; p.forEach(function (x) { o[x.type] = +x.value; }); return (o.hour % 24) * 60 + (o.minute | 0); } catch (e) { var d0 = new Date(); return d0.getHours() * 60 + d0.getMinutes(); } }
  function addDays(day, n) { var t = new Date(Date.parse(day + "T12:00:00Z") + n * DAY); return t.toISOString().slice(0, 10); }
  function diff(a, b) { return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / DAY); }
  function dow(day) { return new Date(Date.parse(day + "T12:00:00Z")).getUTCDay(); }
  function classDay(day) { var x = dow(day); return x >= 4 && x <= 6; }       // Thu · Fri · Sat (= assets/home.js CLASSDAY)
  function cut(s, n) { s = String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); var a = s.split(""); return a.length > n ? a.slice(0, n - 1).join("") + "…" : s; }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }

  /* ---------- state ---------- */
  function state() { var s = lsGet(K); if (!s || typeof s !== "object") s = {}; if (!s.done || typeof s.done !== "object") s.done = {}; if (!s.off || typeof s.off !== "object") s.off = {}; return s; }
  function prune(done, now) { var out = {}, ks = Object.keys(done || {}).filter(function (k) { return now - (+done[k] || 0) < KEEP * DAY; }).sort(function (a, b) { return done[b] - done[a]; }).slice(0, 60); ks.forEach(function (k) { out[k] = +done[k]; }); return out; }
  function save(s) { s.done = prune(s.done, Date.now()); lsSet(K, s); push(s); fire(); }
  function fire() { try { d.dispatchEvent(new CustomEvent("nursin:rem")); } catch (e) {} }
  function markDone(key) { if (!key) return; var s = state(); s.done[key] = Date.now(); save(s); }
  function isOff(k) { return !!state().off[k]; }
  function setOff(k, off) { if (KINDS.indexOf(k) < 0) return; var s = state(); if (off) s.off[k] = true; else delete s.off[k]; s.offAt = Date.now(); save(s); }
  // pure (tests): this device's state + the account's copy → one state (done = union; the switches = the newer side)
  function merge(loc, rem) {
    loc = loc || {}; rem = rem || {}; var out = { done: {}, off: {}, offAt: +loc.offAt || 0, q: loc.q };
    [loc.done || {}, rem.remDone || {}].forEach(function (m) { Object.keys(m).forEach(function (k) { var v = +m[k] || 0; if (v > (out.done[k] || 0)) out.done[k] = v; }); });
    var useRem = rem.remOff && typeof rem.remOff === "object" && (+rem.remOffAt || 0) > (+loc.offAt || 0), src = useRem ? rem.remOff : (loc.off || {});
    KINDS.forEach(function (k) { if (src[k]) out.off[k] = true; }); if (useRem) out.offAt = +rem.remOffAt;
    return out;
  }
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push(s) { clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { remDone: s.done, remOff: s.off, remOffAt: +s.offAt || 0 }, { merge: true }).catch(function () {}); } catch (e) {} }, 1500); }
  function pull() {
    var A = fbA(); if (!A) return;
    try { A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (snap) { var r = snap && snap.exists && snap.exists() ? snap.data() : null; if (!r) return;
      var s = state(), m = merge(s, r); m.done = prune(m.done, Date.now()); if (JSON.stringify([m.done, m.off]) !== JSON.stringify([s.done, s.off])) { s.done = m.done; s.off = m.off; s.offAt = m.offAt; lsSet(K, s); fire(); paintMe(); } }, function () {}); } catch (e) {}
  }

  /* ---------- what to remind (pure) ----------
     x = { day, hm, hw:[{id,title,due}], exam:'YYYY-MM-DD'|'', today:{n,href}|null, q:{id,q}|null, cls:{n,href}|null }   st = state()
     → [{k: kind, key, e, t (text), href}] in order: urgent (hw/ex) → class → study → review */
  function build(x, st) {
    st = st || {}; var done = st.done || {}, off = st.off || {}, day = x.day, hm = x.hm | 0, out = [];
    function add(it) { if (!done[it.key]) out.push(it); }
    function left(n) { return n <= 0 ? T("اليوم", "aujourd'hui") : n === 1 ? T("بكرا", "demain") : T("بعد يومين", "dans 2 jours"); }
    if (!off.hw) {
      (x.hw || []).forEach(function (h) { if (!h || !h.id || !h.due) return; var n = diff(h.due, day); if (n < 0 || n > 2) return;
        add({ k: "hw", key: "hw:" + h.id, e: "📌", t: T("وظيفة: ", "Devoir : ") + cut(h.title, 44) + " · " + T("التسليم ", "à rendre ") + left(n), href: "homework.html?id=" + encodeURIComponent(h.id) }); });
      if (x.exam) { var n = diff(x.exam, day); if (n >= 0 && n <= 2) add({ k: "hw", key: "ex:" + x.exam, e: "🎯", t: T("امتحان الفصل ", "Examen de mi-semestre ") + left(n) + T(" — راجع موادك", " — révise tes matières"), href: "midterm.html" }); }
    }
    if (!off.cls && classDay(day) && hm >= 5 * 60 && hm < BACK)
      add({ k: "cls", key: "cl:" + day, e: "🏫", t: x.cls ? T("اليوم دوام: راجع بسرعة «", "Cours aujourd'hui : révise vite « ") + cut(x.cls.n, 40) + T("»", " »") : T("اليوم دوام: مراجعة سريعة ٥ دقايق قبل الصف", "Cours aujourd'hui : 5 min de révision avant"), href: x.cls ? x.cls.href : "hifzi.html" });
    if (!off.ph) {
      for (var i = 0; i <= 2; i++) { var dd = addDays(day, -i); if (!classDay(dd) || (i === 0 && hm < BACK)) continue;
        if (!done["ph:" + dd]) out.push({ k: "ph", key: "ph:" + dd, e: "📸", t: i === 0 ? T("صوّر دروس اليوم وحطّن عالموقع", "Prends en photo les cours d'aujourd'hui et mets-les sur le site") : T("صوّر دروس ", "Prends en photo les cours de ") + (FR() ? dd.slice(8) + "/" + +dd.slice(5, 7) : +dd.slice(8) + "/" + +dd.slice(5, 7)) + T(" وحطّن عالموقع", " et mets-les sur le site"), href: "suggest.html" });
        break; }                                          // only the newest class day: once it is done, the older ones go too
    }
    if (!off.st) {
      if (x.today && x.today.n) add({ k: "st", key: "st:" + day, e: "📖", t: T("ادرس اليوم: ", "À étudier aujourd'hui : ") + cut(x.today.n, 48), href: x.today.href || "index.html" });
      if (x.q && x.q.id) add({ k: "st", key: "rv:" + day, e: "🔁", t: T("سؤال مراجعة: ", "Question de révision : ") + cut(x.q.q, 52), href: "index.html?mq=" + encodeURIComponent(x.q.id) });
    }
    return out;
  }
  function html(items, open) {
    if (!items || !items.length) return "";
    var shown = open ? items : items.slice(0, MAXL), more = items.length - shown.length;
    return '<section class="hzrem" aria-label="' + esc(T("تذكيرات اليوم", "Rappels du jour")) + '"><div class="hzremh"><b>📌 ' + esc(T("تذكيرات اليوم", "Rappels du jour")) + "</b>" +
      (more > 0 ? '<button type="button" class="hzremx" data-remmore="1">+' + more + "</button>" : open && items.length > MAXL ? '<button type="button" class="hzremx" data-remmore="0">−</button>' : "") + "</div><ul>" +
      shown.map(function (it) { return '<li class="hzremi" data-k="' + it.k + '"><a href="' + esc(it.href) + '" data-rem="' + esc(it.key) + '"><span aria-hidden="true">' + it.e + "</span> <bdi>" + esc(it.t) + '</bdi></a><button type="button" class="hzremok" data-remok="' + esc(it.key) + '">' + esc(T("✅ تمّ", "✅ Fait")) + "</button></li>"; }).join("") +
      "</ul></section>";
  }

  /* ---------- the live data on this device ---------- */
  function pickQ(st, day) {                     // the day's review question: kept all day once picked
    if (st.q && st.q.d === day && st.q.id) { var q0 = qById(st.q.id); if (q0) return q0; }
    var Q = w.QUIZ || [], by = {}, c = []; Q.forEach(function (q) { if (q && q.id && q.q) by[q.id] = q; });
    try { var S = w.NursinSRS; if (S && S.questions) S.questions().forEach(function (q) { if (q && by[q.id]) c.push(by[q.id]); }); } catch (e) {}
    if (!c.length) try { var it = (w.Weak && w.Weak.items ? w.Weak.items() : (lsGet("nursin_weak_v1") || {}).items) || {}; Object.keys(it).forEach(function (k) { if (by[k]) c.push(by[k]); }); } catch (e) {}
    if (!c.length) c = Q.filter(function (q) { return q && q.id && q.q && q.o; });
    if (!c.length) return null;
    var q = c[hash(day) % c.length]; st.q = { d: day, id: q.id }; lsSet(K, st); return q;
  }
  function qById(id) { var Q = w.QUIZ || []; for (var i = 0; i < Q.length; i++) if (Q[i] && Q[i].id === id) return Q[i]; return null; }
  function ctx() {
    var day = today(), hm = hmB(), H = w.HomePath || {}, x = { day: day, hm: hm, hw: [], exam: "", today: null, q: null, cls: null };
    try { var HW = w.NursinHW; x.hw = HW && HW.open ? HW.open(day) : []; } catch (e) {}
    try { var M = w.NursinMid; x.exam = M && M.EXAM ? M.EXAM : ""; } catch (e) {}
    try { var td = H.todayNow ? H.todayNow() : null; if (td) x.today = { n: td.n, href: td.href }; } catch (e) {}
    try { if (H.classNewest && H.lessonsNow && classDay(day)) { var cl = H.classNewest(H.lessonsNow() || [], dow(day))[0]; if (cl) x.cls = { n: cl.n, href: cl.href }; } } catch (e) {}
    var st = state(), q = st.off.st ? null : pickQ(st, day); if (q) x.q = { id: q.id, q: FR() && q.fr && q.fr.q ? q.fr.q : q.q };
    return x;
  }
  var open = false;
  function homeHtml() { return html(build(ctx(), state()), open); }
  function photoDraft() {                       // 📸 → suggest.html with a ready «➕ إضافة» draft (only if he has no draft of his own)
    var k = "nursin_sug_draft_v1", dr = lsGet(k);
    if (!dr || !dr.text) lsSet(k, { type: "add", text: T("📸 دروس اليوم (" + today() + "): ", "📸 Cours du jour (" + today() + ") : ") });
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var ok = t.closest("[data-remok]"), a = t.closest("[data-rem]"), mo = t.closest("[data-remmore]");
    if (mo) { e.preventDefault(); open = mo.getAttribute("data-remmore") === "1"; fire(); return; }
    if (ok) { e.preventDefault(); markDone(ok.getAttribute("data-remok")); return; }
    if (a) { var key = a.getAttribute("data-rem"); if (/^ph:/.test(key)) photoDraft(); markDone(key); }      // opening it = done; the link goes on
  }

  /* ---------- «أنا»: the switches ---------- */
  var LABELS = {
    st: ["📚 ٨ المسا: شو تدرس اليوم + سؤال مراجعة", "📚 20 h : quoi étudier + une question de révision"],
    hw: ["📌 الوظايف والامتحانات (من قبل بيومين)", "📌 Devoirs et examens (2 jours avant)"],
    cls: ["🏫 صبح يوم الدوام (٧ الصبح): مراجعة سريعة", "🏫 Matin de cours (7 h) : révision rapide"],
    ph: ["📸 بعد الدوام: صوّر دروس اليوم", "📸 Après les cours : photo des cours du jour"]
  };
  function meHtml(st) {
    st = st || state();
    return "<h2>📌 " + esc(T("التذكيرات", "Rappels")) + '</h2><p class="small">' + esc(T("بتضلّ مكتوبة فوق بالرئيسية لحتى تعملها أو تكبس «✅ تمّ». والإشعارات عالتلفون بتوصل إذا 🔔 الإشعارات مفعّلة.", "Ils restent en haut de l'accueil jusqu'à ce que tu les fasses ou touches « ✅ Fait ». Les notifications arrivent si 🔔 les notifications sont activées.")) + "</p>" +
      KINDS.map(function (k) { return '<label class="remsw"><input type="checkbox" data-remsw="' + k + '"' + (st.off[k] ? "" : " checked") + "> <span>" + esc(T(LABELS[k][0], LABELS[k][1])) + "</span></label>"; }).join("");
  }
  function paintMe() { var el = d.getElementById("merem"); if (el) el.innerHTML = meHtml(); }
  function onChange(e) { var t = e.target; if (!t || !t.getAttribute) return; var k = t.getAttribute("data-remsw"); if (!k) return; setOff(k, !t.checked); }

  w.NursinRem = { KEY: K, KINDS: KINDS, MAXL: MAXL, BACK: BACK, build: build, html: html, homeHtml: homeHtml, ctx: ctx, state: state, merge: merge, prune: prune, markDone: markDone, isOff: isOff, setOff: setOff, meHtml: meHtml, paintMe: paintMe, pull: pull, classDay: classDay };
  if (!d || !d.addEventListener) return;
  d.addEventListener("click", onClick);
  d.addEventListener("change", onChange);
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) setTimeout(pull, 1500); });
  function boot() { paintMe(); if (fbA()) pull(); }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); }); else setTimeout(boot, 0);
  setTimeout(function () { if (fbA()) pull(); }, 3000);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
