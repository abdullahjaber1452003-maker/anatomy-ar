/* 📒 ملاحظاتي — personal notes (Abdullah, Oct 30 2026 11:29–11:32 AM: «بدي عن كل سؤال خيار إضافة إلى ملاحظاتي، ووينما كان، هذا الدرس
   بدي أضيف عنه ملاحظة … ويكون في قسم الملاحظات»; 11:32 AM: «أكيد على أي جهاز تكون موجودة»).
   • «📝 ملاحظة» next to every quiz question (quiz.html in every mode: subject / lesson / weak / review / exams / class quiz / challenge,
     the class page, live rooms, the ⚔️ tournament, «كويز متل الصف», «عبّي الفراغ», and the review list after a result), at the top of
     every lesson part (cardio, neuro, henderson, law, mgmt, quality, pharma, rea, 🧊 3d), and in the header of 🃏 cards and 📄 the summary.
     Tapping opens a small sheet over the page: nothing in the quiz moves (no timer stop, no answer, no navigation).
   • 📒 notes.html: every note grouped by مادة → درس, with its source and a link back, created / edited time, edit, delete, search.
   • Storage: localStorage first (nursin_notes_v1), then — signed in — Firestore users/{uid}/notes/{noteId} {text, subject, lesson,
     refType, refId, refText, createdAt, updatedAt} with a live listener, so a note written on the phone shows on the laptop.
     Until rules v17 are published (or offline) the notes stay on the device and are sent again later (online / focus / every minute).
     Signed out: this device only + «سجّل دخول لتضل ملاحظاتك على كل أجهزتك»; at sign-in the device's notes join the account
     (same item = one note, both texts kept).
   One note per item: the id is made from the item (q_<question id>, l_<lesson part>, c_<card>, s_<summary>), free notes f_<random>.
   No ad inside the sheet, on notes.html, or next to a note button. */
(function (w, d) {
  var KEY = "nursin_notes_v1", MAXT = 2000, MAXR = 300, TYPES = ["q", "lesson", "card", "summary", "free"], PRE = { q: "q_", lesson: "l_", card: "c_", summary: "s_", free: "f_" };
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hash(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  /* the lesson search's folding (assets/hifz.js): no tashkeel, أ إ آ ٱ → ا, ة → ه, ى → ي, ؤ → و, ئ → ي, é → e, œ → oe */
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[\u064B-\u0655\u0640]/g, "").replace(/œ/g, "oe").replace(/[’'`´]/g, " ").replace(/[^\w\u0600-\u06FF]+/g, " ").trim();
  }
  function words(q) { return norm(q).split(" ").filter(function (x) { return x.length > 0; }).map(function (x) { return x.length > 3 && /^ال/.test(x) ? x.slice(2) : x; }); }
  function enc(s) {                                        // a Firestore-safe doc id piece: [A-Za-z0-9_.-], ≤ 100
    s = String(s == null ? "" : s);
    var o = s.replace(/[^A-Za-z0-9_.]/g, function (c) { return "-" + c.charCodeAt(0).toString(36); });
    return o.length > 100 ? o.slice(0, 80) + "~" + hash(s) : o;
  }
  function idFor(refType, refId) { return refType === "free" ? "f_" + (refId ? enc(refId) : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8))) : (PRE[refType] || "x_") + enc(refId); }
  function cut(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) : s; }
  function oneLine(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  /* exactly the fields rules v17 accept, sizes clamped */
  function clean(n) {
    var c = +n.createdAt || Date.now(), u = +n.updatedAt || c;
    return { text: cut(n.text, MAXT), subject: cut(n.subject || "", 40), lesson: cut(n.lesson || "", 80), refType: TYPES.indexOf(n.refType) >= 0 ? n.refType : "free",
      refId: cut(n.refId || "", 200), refText: cut(oneLine(n.refText), MAXR), createdAt: Math.floor(c), updatedAt: Math.floor(Math.max(u, c)) };
  }

  /* ---------------- store (pure functions on a state object; tests run them) ----------------
     st = { v: 1, n: { "<owner>|<id>": note + {id, o, d (to send), s (on the account)} }, x: { "<owner>|<id>": time } (deletes to send) }
     owner "" = this device signed out, otherwise the uid. */
  function blank() { return { v: 1, n: {}, x: {} }; }
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v === 1 && o.n && o.x) return o; } catch (e) {} return blank(); }
  function persist(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
  function list(st, o) { var out = [], k; for (k in st.n) if (st.n[k].o === (o || "")) out.push(st.n[k]); return out.sort(function (a, b) { return b.updatedAt - a.updatedAt; }); }
  function find(st, o, id) { return st.n[(o || "") + "|" + id] || null; }
  function put(st, o, meta, text, at) {
    o = o || ""; at = at || Date.now(); text = cut(String(text == null ? "" : text).replace(/\s+$/, ""), MAXT);
    var id = meta.id || idFor(meta.refType, meta.refId), k = o + "|" + id, old = st.n[k];
    if (!text.trim()) { remove(st, o, id, at); return null; }
    var n = clean({ text: text, subject: meta.subject, lesson: meta.lesson, refType: meta.refType, refId: meta.refId, refText: meta.refText, createdAt: old ? old.createdAt : at, updatedAt: Math.max(at, old ? old.updatedAt + 1 : 0) });
    n.id = id; n.o = o; n.d = 1; n.s = old ? old.s | 0 : 0;
    st.n[k] = n; delete st.x[k];
    return n;
  }
  function remove(st, o, id, at) {
    var k = (o || "") + "|" + id, n = st.n[k];
    delete st.n[k];
    if (o && (!n || n.s)) st.x[k] = at || Date.now();             // was on the account (or might be): delete it there too
    return !!n;
  }
  /* sign-in: this device's signed-out notes join the account; the same item noted on both sides keeps both texts (no duplicate) */
  function mergeGuest(st, uid, at) {
    var moved = 0, k; at = at || Date.now();
    for (k in st.n) {
      var g = st.n[k]; if (g.o !== "") continue;
      var tk = uid + "|" + g.id, t = st.n[tk];
      if (t) {
        var a = t.text.trim(), b = g.text.trim();
        if (a !== b && a.indexOf(b) < 0) { t.text = b.indexOf(a) >= 0 ? cut(b, MAXT) : cut(a + "\n\n" + b, MAXT); t.updatedAt = Math.max(at, t.updatedAt + 1, g.updatedAt + 1); t.createdAt = Math.min(t.createdAt, g.createdAt); t.d = 1; }
      } else {
        var n = clean(g); n.id = g.id; n.o = uid; n.d = 1; n.s = 0; n.g = 1; st.n[tk] = n; delete st.x[tk];   // g: not compared with the account yet
      }
      delete st.n[k]; moved++;
    }
    for (k in st.x) if (k.charAt(0) === "|") delete st.x[k];
    return moved;
  }
  /* a snapshot of users/{uid}/notes: docs = {id: data}; complete = from the server (not the empty first cache) */
  function applyRemote(st, uid, docs, complete) {
    var ch = 0, id, k;
    for (id in docs) {
      var r = docs[id]; if (!r || typeof r.text !== "string") continue;
      k = uid + "|" + id; var l = st.n[k], x = st.x[k], ru = +r.updatedAt || 0;
      if (x && x >= ru) continue;                                   // deleted here after that version: the delete wins (and is sent)
      if (l && l.g) {                                               // a signed-out note meeting the account's note on the same item: keep both texts
        var a = r.text.trim(), b = l.text.trim();
        if (a !== b && a.indexOf(b) < 0) { l.text = b.indexOf(a) >= 0 ? cut(b, MAXT) : cut(a + "\n\n" + b, MAXT); l.createdAt = Math.min(l.createdAt, +r.createdAt || l.createdAt); l.updatedAt = Math.max(l.updatedAt, ru + 1); l.d = 1; }
        else { l.text = r.text; l.updatedAt = ru; l.createdAt = +r.createdAt || l.createdAt; l.d = 0; l.s = 1; }
        delete l.g; ch++; continue;
      }
      if (l && l.d && l.updatedAt >= ru) continue;                  // edited here, newer: ours is sent
      if (l && !l.d && l.updatedAt === ru && l.text === r.text) { l.s = 1; continue; }
      var n = clean(r); n.id = id; n.o = uid; n.d = 0; n.s = 1; st.n[k] = n; delete st.x[k]; ch++;
    }
    if (complete) for (k in st.n) {
      var m = st.n[k]; if (m.o !== uid || docs[m.id]) continue;
      if (m.g) { delete m.g; continue; }                            // new to the account: sent as it is
      if (m.s && !m.d) { delete st.n[k]; ch++; }                    // deleted on another device
    }
    if (complete) for (k in st.x) if (k.indexOf(uid + "|") === 0 && !docs[k.slice(uid.length + 1)]) delete st.x[k];   // already gone there
    return ch;
  }
  function pending(st, uid) {
    var out = { put: [], del: [] }, k;
    for (k in st.n) if (st.n[k].o === uid && st.n[k].d && !st.n[k].g) out.put.push(st.n[k]);   // g: waits for the account's copy first
    for (k in st.x) if (k.indexOf(uid + "|") === 0) out.del.push(k.slice(uid.length + 1));
    return out;
  }
  /* search: every word must appear in the note, its source, its lesson or its subject (folded like the lesson search) */
  function matches(n, q, extra) {
    var ws = words(q); if (!ws.length) return true;
    var hay = " " + norm([n.text, n.refText, extra || ""].join(" ")) + " ";
    return ws.every(function (x) { return hay.indexOf(x) >= 0; });
  }

  /* ---------------- where a note belongs (مادة / درس) ---------------- */
  var EXTRA = { anatomy: { ar: "المجسّمات 3D", fr: "Modèles 3D", page: "3d.html", e: "🧊" }, other: { ar: "عام", fr: "Général", page: "notes.html", e: "🗒️" } };
  var EMO = { cardio: "❤️", neuro: "🧠", henderson: "📋", law: "⚖️", mgmt: "🏢", quality: "✅", pharma: "💊", rea: "🚑" };
  var MODELS = { heart: ["القلب", "Cœur", "cardio"], brain: ["الدماغ", "Cerveau", "neuro"], spine: ["العمود القطني", "Colonne lombaire", "neuro"] };
  function R() { return w.NLESSONS || { subjects: {}, list: [], parts: [] }; }
  function subjects() { var o = {}, s = R().subjects, k; for (k in s) o[k] = { ar: s[k].ar, fr: s[k].fr, page: s[k].page, e: EMO[k] || "📘" }; for (k in EXTRA) o[k] = EXTRA[k]; return o; }
  function subjName(k) { var s = subjects()[k] || EXTRA.other; return s.e + " " + T(s.ar, s.fr); }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function pkey(x) { return base(x) + (x.p ? "#" + x.p : ""); }
  function lesson(k) { var L = R().list; for (var i = 0; i < L.length; i++) if (base(L[i]) === k) return L[i]; return null; }
  function part(k) { var P = R().parts || R().list; for (var i = 0; i < P.length; i++) if (pkey(P[i]) === k) return P[i]; return null; }
  function lessonName(k) {
    if (!k) return T("عام (بلا درس)", "Général (sans leçon)");
    var m = /^3d:(\w+)$/.exec(k); if (m && MODELS[m[1]]) return "🧊 " + T(MODELS[m[1]][0], MODELS[m[1]][1]);
    var x = lesson(k); return x ? x.n : k;
  }
  function lessonsOf(s) { if (s === "anatomy") return Object.keys(MODELS).map(function (m) { return { k: "3d:" + m, n: lessonName("3d:" + m) }; }); return R().list.filter(function (x) { return x.s === s; }).map(function (x) { return { k: base(x), n: x.n }; }); }
  function ofQ(q) {                                          // a bank question → {subject, lesson}
    var L = R().list.filter(function (x) { return x.t === q.t; }), x = null, i;
    if (L.length) { if (L.some(function (y) { return y.l; })) { for (i = 0; i < L.length; i++) if (L[i].l === q.l) x = L[i]; } else x = L[0]; }
    if (x) return { subject: x.s, lesson: base(x) };
    var G = w.QGROUPS || {}, k; for (k in G) if (G[k].indexOf(q.t) >= 0) return { subject: k, lesson: "" };
    return { subject: "other", lesson: "" };
  }
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  function here(x) { return x.href.split("#")[0] === page; }
  function pageSubject() { var s = R().subjects, k; for (k in s) if (s[k].page === page) return k; return page === "3d.html" ? "anatomy" : "other"; }
  function ctxOf(el) {                                       // a question that is not in the bank: the lesson around it, or the page's مادة
    var dt = el.closest && el.closest("details[id]"), P = R().parts || [], i;
    if (dt) for (i = 0; i < P.length; i++) if (here(P[i]) && P[i].href.split("#")[1] === dt.id) return { subject: P[i].s, lesson: base(P[i]) };
    var dl = el.closest && el.closest("[data-lesson]"), s = pageSubject();
    if (dl && lesson(s + ":" + dl.getAttribute("data-lesson"))) return { subject: s, lesson: s + ":" + dl.getAttribute("data-lesson") };
    return { subject: s, lesson: "" };
  }
  function link(n) {                                         // the way back to what the note is about
    var x;
    if (n.refType === "q" && n.refId && n.refId.indexOf("h:") !== 0) return "quiz.html?qid=" + encodeURIComponent(n.refId);   // a bank question opens alone
    if (n.refType === "lesson") { if (/^3d:/.test(n.refId)) return "3d.html"; x = part(n.refId); if (x) return x.href; }
    if (n.refType === "card" || n.refType === "summary") { x = lesson(n.lesson); if (x) return x.href.split("#")[0] + "?" + (n.refType === "card" ? "fc=" : "sum=") + encodeURIComponent(base(x)); }
    x = lesson(n.lesson); if (x) return x.href;
    var s = subjects()[n.subject]; return s && s.page !== "notes.html" ? s.page : "";
  }

  var API = w.NursinNotes = { KEY: KEY, MAXT: MAXT, MAXR: MAXR, norm: norm, enc: enc, idFor: idFor, clean: clean, blank: blank, load: load, list: list, find: find, put: put, remove: remove,
    mergeGuest: mergeGuest, applyRemote: applyRemote, pending: pending, matches: matches, ofQ: ofQ, link: link, lessonName: lessonName, subjName: subjName };
  if (!d || !d.addEventListener || !d.createElement) return;

  /* ---------------- live state + sync ---------------- */
  var st = load(), owner = "", authKnown = false, unsub = null, sync = { err: "", busy: false, timer: 0, online: true };
  function fb() { var A = w.NursinFB; return A && A.user && A.fs && A.db && A.fs.collection ? A : null; }
  function save() { persist(st); repaint(); }
  function status() {
    if (!owner) return "local";
    var p = pending(st, owner), g = list(st, owner).some(function (n) { return n.g; });
    if (!p.put.length && !p.del.length && !g) return "ok";
    if (sync.err === "permission-denied") return "wait";
    return "pending";
  }
  function schedule(ms) { clearTimeout(sync.timer); sync.timer = setTimeout(flush, ms); }
  function flush() {
    var A = fb(); if (!A || !owner || A.user.uid !== owner || sync.busy) return;
    var p = pending(st, owner); if (!p.put.length && !p.del.length) return;
    if (w.navigator && w.navigator.onLine === false) { sync.err = "offline"; repaint(); return; }
    sync.busy = true; var uid = owner, left = p.put.length + p.del.length, failed = null;
    var guard = setTimeout(function () { sync.busy = false; }, 20000);          // an offline write that never answers: try again later
    function one(e) {
      if (e) failed = e;
      if (--left > 0) return;
      clearTimeout(guard); sync.busy = false; sync.err = failed ? (failed.code || "error") : "";
      persist(st); repaint();
      if (failed) schedule(failed.code === "permission-denied" ? 300000 : 60000);
      else if (pending(st, uid).put.length) schedule(1500);
    }
    p.put.forEach(function (n) {
      var ver = n.updatedAt;
      A.fs.setDoc(A.fs.doc(A.db, "users", uid, "notes", n.id), clean(n)).then(function () {
        var c = st.n[uid + "|" + n.id]; if (c && c.updatedAt === ver) { c.d = 0; c.s = 1; } one();
      }, one);
    });
    p.del.forEach(function (id) {
      A.fs.deleteDoc(A.fs.doc(A.db, "users", uid, "notes", id)).then(function () { delete st.x[uid + "|" + id]; one(); }, one);
    });
  }
  function listen() {
    var A = fb(); if (!A || unsub) return; var uid = A.user.uid;
    try {
      unsub = A.fs.onSnapshot(A.fs.collection(A.db, "users", uid, "notes"), function (snap) {
        if (owner !== uid) return;
        var docs = {}; snap.forEach(function (s) { docs[s.id] = s.data(); });
        var fromCache = !!(snap.metadata && snap.metadata.fromCache);
        applyRemote(st, uid, docs, !fromCache); if (sync.err === "permission-denied") sync.err = ""; save();
        flush();
      }, function (e) {
        unsub = null; sync.err = (e && e.code) || "error"; repaint();
        if (sync.err !== "permission-denied") console.warn("nursin: notes sync", sync.err);     // denied = rules v17 not published yet
        setTimeout(function () { if (owner === uid) listen(); }, sync.err === "permission-denied" ? 300000 : 60000);
      });
    } catch (e) { unsub = null; }
  }
  function stop() { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } }
  function onAuth() {
    var A = w.NursinFB, u = A && A.user; authKnown = true;
    var o = u ? u.uid : "";
    if (o === owner && (unsub || !o)) { repaint(); return; }
    stop(); owner = o; st = load();
    if (!o) { var k, gone = 0; for (k in st.n) if (st.n[k].o && !st.n[k].d && !st.n[k].g) { delete st.n[k]; gone++; } if (gone) persist(st); }   // signed out: the account's synced notes leave this device (they stay on the account)
    if (o) { if (mergeGuest(st, o)) persist(st); listen(); flush(); }
    repaint();
  }
  d.addEventListener("nursin:auth", function () { setTimeout(onAuth, 0); });
  w.addEventListener("online", function () { sync.err = ""; listen(); flush(); });
  w.addEventListener("offline", function () { repaint(); });
  d.addEventListener("visibilitychange", function () { if (d.visibilityState === "visible" && owner) { listen(); flush(); } });
  setInterval(function () { if (owner && status() === "pending") flush(); }, 60000);
  w.addEventListener("storage", function (e) { if (e.key === KEY) { st = load(); repaint(); } });

  /* ---------------- the 📝 button ---------------- */
  function btn(meta, cls, label) {
    var b = d.createElement("button"); b.type = "button"; b.className = "nbtn " + (cls || "");
    b._nm = typeof meta === "function" ? meta : function () { return meta; };
    b.innerHTML = '<span aria-hidden="true">📝</span>' + (label ? '<span class="nbl">' + esc(label) + "</span>" : "") + '<i class="ndot" aria-hidden="true"></i>';
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); var m = b._nm(); if (m) open(m, b); });
    paintOne(b); return b;
  }
  function paintOne(b) {
    var m = b._nm && b._nm(); b.hidden = !m; if (!m) return;
    var has = !!find(st, owner, m.id || idFor(m.refType, m.refId));
    b.classList.toggle("has", has);
    b.setAttribute("aria-label", has ? T("📝 ملاحظتك (في ملاحظة، كبوس لتعدّلها)", "📝 Ta note (déjà écrite, touche pour la modifier)") : T("📝 زيد ملاحظة", "📝 Ajouter une note"));
    b.title = has ? T("في ملاحظة", "Note écrite") : T("زيد ملاحظة", "Ajouter une note");
  }
  function repaint() {
    [].forEach.call(d.querySelectorAll(".nbtn"), paintOne);
    if (d.getElementById("notes-app")) pageDraw();
    var s = box && box.querySelector(".nsync"); if (s) s.innerHTML = syncLine();
  }

  /* quiz questions: .qq / .dqq inside a card that has answers, a textarea or a shown answer (never a plain message card) */
  var qIndex = null;
  function bankByText(t) {
    if (!w.QUIZ) return null;
    if (!qIndex || qIndex.n !== w.QUIZ.length) { qIndex = { n: w.QUIZ.length, m: {} }; w.QUIZ.forEach(function (q) { var dv = d.createElement("div"); dv.innerHTML = q.q; qIndex.m[norm(dv.textContent)] = q; }); }
    return qIndex.m[norm(t)] || null;
  }
  function bankById(id) { var Q = w.QUIZ || []; for (var i = 0; i < Q.length; i++) if (Q[i].id === id) return Q[i]; return null; }
  function qMeta(card, qq) {
    var text = oneLine(qq.textContent), hold = card.closest && card.closest("[data-qid]"), id = card.getAttribute("data-qid") || (hold && hold.getAttribute("data-qid"));
    var q = (id && bankById(id)) || bankByText(text), where = q ? ofQ(q) : ctxOf(card);
    var rid = q ? q.id : "h:" + hash(norm(text));            // not in the bank (e.g. «كويز متل الصف»): its folded text
    return { refType: "q", refId: rid, refText: cut(text, MAXR), subject: where.subject, lesson: where.lesson };
  }
  function mountQuiz() {
    [].forEach.call(d.querySelectorAll(".qq, .dqq"), function (qq) {
      var card = qq.closest(".qcard, .cq, .dqbox") || qq.parentElement; if (!card || card.closest(".nwrap, .bpick, .cadv") || qq.closest(".cadv")) return;
      if (![].some.call(card.querySelectorAll(".opt, textarea, input, .expl, .pgap"), function (a) { return (a.closest(".qcard, .cq, .dqbox") || card) === card; })) return;
      var prev = qq.previousElementSibling;
      if (prev && prev.classList.contains("nbtn")) { var m = qMeta(card, qq); if (prev._key !== m.refId) { prev._key = m.refId; prev._nm = function () { return m; }; paintOne(prev); } return; }
      var meta = qMeta(card, qq), b = btn(meta, "nb-q", T("ملاحظة", "Note")); b._key = meta.refId;
      qq.parentNode.insertBefore(b, qq);
    });
  }
  /* lessons: one row at the top of every part (split parts once they exist), Henderson under its <h3>, 🧊 above each model */
  function row(meta, label) { var p = d.createElement("p"); p.className = "nlrow"; p.appendChild(btn(meta, "nb-l", label)); return p; }
  function lmeta(x) { var pk = pkey(x); return { refType: "lesson", refId: pk, refText: cut(x.n + (x.p ? T(" — الجزء ", " — Partie ") + x.p + "/" + x.of : ""), MAXR), subject: x.s, lesson: base(x) }; }
  function mountLessons() {
    var P = R().parts || R().list, lab = T("ملاحظة على هالدرس", "Note sur cette leçon");
    P.forEach(function (x) {
      if (!here(x)) return;
      var a = x.href.split("#")[1];
      if (a) {
        var el = d.getElementById(a); if (!el) return;
        if (el.tagName === "DETAILS" && x.p && !el.hasAttribute("data-split")) return;       // wait until assets/lessons.js cut it into parts
        var body = el.tagName === "DETAILS" ? (el.querySelector(":scope > .tbody") || el) : el;
        var first = body.firstElementChild;
        if (first && first.tagName === "SUMMARY") first = first.nextElementSibling;
        if ((first && first.classList.contains("nlrow")) || el.querySelector(":scope .nlrow[data-k='" + pkey(x).replace(/'/g, "") + "']")) return;
        var r = row(lmeta(x), lab); r.setAttribute("data-k", pkey(x));
        if (first) body.insertBefore(r, first); else body.appendChild(r);
      } else if (x.l) {                                       // Henderson: the <h3> before «📝 كويز على هالدرس»
        var q = d.querySelector('.lqz a[href*="l=' + x.l + '"]'), p = q && q.closest(".lqz"), h = null;
        while (!h && p && (p = p.previousElementSibling)) { if (p.tagName === "H3") h = p; else if (p.querySelectorAll) { var hs = p.querySelectorAll("h3"); if (hs.length) h = hs[hs.length - 1]; } }
        p = h;                                                 // (the 2nd lesson's quiz link sits after the lesson box closes)
        if (!p || (p.nextElementSibling && p.nextElementSibling.classList.contains("nlrow"))) return;
        p.parentNode.insertBefore(row(lmeta(x), lab), p.nextSibling);
      }
    });
    if (page === "3d.html") [].forEach.call(d.querySelectorAll(".viewer[data-model]"), function (v) {
      var m = v.getAttribute("data-model"), M = MODELS[m]; if (!M) return;
      if (v.previousElementSibling && v.previousElementSibling.classList.contains("nlrow")) return;
      var meta = { refType: "lesson", refId: "3d:" + m, refText: "🧊 " + T("مجسّم " + M[0] + " 3D", "Modèle 3D : " + M[1]), subject: "anatomy", lesson: "3d:" + m };
      v.parentNode.insertBefore(row(meta, T("ملاحظة على مجسّم " + M[0], "Note sur le modèle : " + M[1])), v);
    });
  }
  /* 🃏 cards / 📄 summary sheets (assets/cards.js): one button in the sheet's header, about the card on screen / the summary */
  function cardMeta() {
    var C = w.NursinCards, c = C && C.current && C.current(); if (!c || !c.l) return null;
    var l = c.l, lk = base(l);
    if (c.kind === "sum") return { refType: "summary", refId: lk, refText: cut(T("الخلاصة: ", "Résumé : ") + l.n, MAXR), subject: l.s, lesson: lk };
    var k = c.card; if (!k) return null;
    var front = oneLine(k.front);
    return { refType: "card", refId: k.k === "q" && k.q ? k.q.id : lk + "~" + hash(norm(front)), refText: cut(front, MAXR), subject: l.s, lesson: lk };
  }
  function mountCards() {
    [].forEach.call(d.querySelectorAll(".fcwrap.fcards .fchd, .fcwrap.fsum .fchd"), function (h) {
      var b = h.querySelector(".nbtn");
      if (!b) { b = btn(cardMeta, "nb-c", T("ملاحظة", "Note")); var x = h.querySelector(".fcx"); h.insertBefore(b, x || null); }
      else paintOne(b);
    });
  }
  var mT = 0;
  function mount() { clearTimeout(mT); mT = setTimeout(function () { try { mountQuiz(); mountLessons(); mountCards(); } catch (e) { console.warn("nursin: notes mount", e && e.message); } }, 60); }

  /* ---------------- the sheet ---------------- */
  var box = null, back = null;
  function syncLine() {
    var s = status();
    if (s === "local") return "";
    if (s === "ok") return "☁️ " + esc(T("محفوظة بحسابك، بتبين على كل أجهزتك", "Enregistrée sur ton compte, visible sur tous tes appareils"));
    if (s === "wait") return "📱 " + esc(T("محفوظة عهالجهاز، وبتنبعت لحسابك قريباً", "Enregistrée sur cet appareil, envoyée à ton compte bientôt"));
    return "⏳ " + esc(T("محفوظة عهالجهاز، بتنبعت لحسابك أول ما يرجع الإنترنت", "Enregistrée sur cet appareil, envoyée à ton compte dès le retour d'Internet"));
  }
  function outBanner() {
    return owner ? "" : '<p class="nout">🔒 ' + esc(T("سجّل دخول لتضل ملاحظاتك على كل أجهزتك", "Connecte-toi pour garder tes notes sur tous tes appareils")) + ' <button class="btn sm nsign" type="button">' + esc(T("سجّل دخول", "Se connecter")) + "</button></p>";
  }
  function close(keep) {
    if (!box) return; var b = box, f = back; box = null; back = null;
    var A = w.NursinAnim; if (A) A.out(b, function () { b.remove(); }); else b.remove();
    if (f && f.isConnected && !keep) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function open(meta, from, free) {
    close(true); back = from || d.activeElement;
    var id = meta.id || idFor(meta.refType, meta.refId), cur = find(st, owner, id);
    if (free && !meta.id) meta = Object.assign({}, meta, { id: id });
    box = d.createElement("div"); box.className = "fcwrap nwrap"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", T("📝 ملاحظتي", "📝 Ma note"));
    var src = meta.refType === "free" ? "" : '<p class="nsrc"><span class="nwhere">' + esc(subjName(meta.subject) + (meta.lesson ? " › " + lessonName(meta.lesson) : "")) + "</span>" + (meta.refText ? "<span class=\"nref\">" + esc(meta.refText) + "</span>" : "") + "</p>";
    var pick = "";
    if (free) {
      var S = subjects(), opts = Object.keys(S).map(function (k) { return '<option value="' + esc(k) + '"' + (k === (meta.subject || "other") ? " selected" : "") + ">" + esc(subjName(k)) + "</option>"; }).join("");
      pick = '<div class="npick"><label>' + esc(T("المادة", "Matière")) + '<select class="nsubj">' + opts + '</select></label><label>' + esc(T("الدرس", "Leçon")) + '<select class="nles"></select></label></div>';
    }
    box.innerHTML = '<div class="fcbox nbox"><div class="fchd"><b>' + esc(cur ? T("📝 ملاحظتك", "📝 Ta note") : free ? T("➕ ملاحظة حرّة", "➕ Note libre") : T("📝 ملاحظة جديدة", "📝 Nouvelle note")) + '</b><button class="fcx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></div>' +
      src + pick + '<textarea class="nta" rows="6" maxlength="' + MAXT + '" placeholder="' + esc(T("اكتب شو بدّك تتذكّر عن هالشي…", "Écris ce que tu veux retenir…")) + '" aria-label="' + esc(T("نص الملاحظة", "Texte de la note")) + '"></textarea>' +
      '<p class="nmeta"><span class="ncnt" dir="ltr"></span><span class="nsync">' + syncLine() + "</span></p>" + outBanner() +
      '<div class="fcact nact">' + (cur ? '<button class="btn ndel" type="button">' + esc(T("🗑️ امحي", "🗑️ Supprimer")) + "</button>" : "") + '<button class="btn ncancel" type="button">' + esc(T("إلغاء", "Annuler")) + '</button><button class="btn pri nsave" type="button">' + esc(T("💾 حفظ", "💾 Enregistrer")) + "</button></div></div>";
    d.body.appendChild(box);
    var ta = box.querySelector(".nta"), cnt = box.querySelector(".ncnt");
    ta.value = cur ? cur.text : "";
    function count() { cnt.textContent = ta.value.length + " / " + MAXT; cnt.classList.toggle("nfull", ta.value.length >= MAXT); }
    ta.addEventListener("input", count); count();
    if (free) {
      var ss = box.querySelector(".nsubj"), ls = box.querySelector(".nles");
      var fill = function () { var L = lessonsOf(ss.value); ls.innerHTML = '<option value="">' + esc(T("عام (بلا درس)", "Général (sans leçon)")) + "</option>" + L.map(function (x) { return '<option value="' + esc(x.k) + '"' + (x.k === meta.lesson ? " selected" : "") + ">" + esc(x.n) + "</option>"; }).join(""); ls.disabled = !L.length; };
      ss.addEventListener("change", function () { meta.lesson = ""; fill(); }); fill();
    }
    box.addEventListener("click", function (e) {
      var t = e.target;
      if (t === box || t.closest(".fcx") || t.closest(".ncancel")) return close();
      if (t.closest(".nsign")) { var A = w.NursinFB; if (A && A.signIn) A.signIn(); else location.href = "friends.html"; return; }
      if (t.closest(".ndel")) { if (!w.confirm(T("أكيد بدّك تمحي هالملاحظة؟", "Supprimer cette note ?"))) return; remove(st, owner, id); save(); flush(); close(); toast(T("🗑️ انمحت الملاحظة", "🗑️ Note supprimée")); return; }
      if (t.closest(".nsave")) {
        var m = meta;
        if (free) { var sv = box.querySelector(".nsubj").value, lv = box.querySelector(".nles").value; m = Object.assign({}, meta, { subject: sv, lesson: lv, refText: lv ? lessonName(lv) : "" }); }
        var had = !!cur, n = put(st, owner, m, ta.value);
        save(); flush(); close();
        toast(n ? (had ? T("✅ تعدّلت الملاحظة", "✅ Note modifiée") : T("✅ انحفظت بملاحظاتك", "✅ Enregistrée dans tes notes")) : T("🗑️ انمحت الملاحظة", "🗑️ Note supprimée"));
      }
    });
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  w.addEventListener("keydown", function (e) { if (box && e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } }, true);
  var tT = 0;
  function toast(t) {
    var el = d.querySelector(".ntoast"); if (!el) { el = d.createElement("div"); el.className = "ntoast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); d.body.appendChild(el); }
    el.textContent = t; el.classList.remove("nhide"); el.hidden = false; clearTimeout(tT);
    tT = setTimeout(function () { el.classList.add("nhide"); setTimeout(function () { el.hidden = true; }, 200); }, 1800);
  }

  /* ---------------- 📒 notes.html ---------------- */
  var qv = "", drawnOnce = false;
  function fmt(t) { var x = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(x.getDate()) + "/" + p(x.getMonth() + 1) + "/" + x.getFullYear() + " " + p(x.getHours()) + ":" + p(x.getMinutes()); }
  var TYPEN = { q: ["❓ سؤال", "❓ Question"], lesson: ["📖 درس", "📖 Leçon"], card: ["🃏 بطاقة", "🃏 Carte"], summary: ["📄 خلاصة", "📄 Résumé"], free: ["🗒️ ملاحظة حرّة", "🗒️ Note libre"] };
  function pageDraw() {
    var el = d.getElementById("notes-app"); if (!el) return;
    if (!authKnown && !drawnOnce) { el.innerHTML = '<p class="small nload">⏳ ' + esc(T("عم نجيب ملاحظاتك…", "Chargement de tes notes…")) + "</p>"; return; }
    var all = list(st, owner), S = subjects(), order = Object.keys(S), groups = {};
    var head = el.querySelector(".nhead");
    if (!head) {
      el.innerHTML = '<div class="nhead"><h1>📒 ' + esc(T("ملاحظاتي", "Mes notes")) + '</h1><p class="lead">' + esc(T("كل اللي كتبتو حد الأسئلة والدروس والبطاقات، مرتّب حسب المادة والدرس.", "Tout ce que tu as écrit à côté des questions, leçons et cartes, rangé par matière et leçon.")) + '</p>' +
        '<div class="ntools"><label class="nsearch"><span class="vh">' + esc(T("دوّر بملاحظاتك", "Chercher dans tes notes")) + '</span><input type="search" class="nq" placeholder="' + esc(T("🔎 دوّر بملاحظاتك (عربي أو فرنسي)", "🔎 Chercher dans tes notes")) + '" autocomplete="off"></label>' +
        '<button class="btn pri nfree" type="button">' + esc(T("➕ ملاحظة حرّة", "➕ Note libre")) + '</button></div><div class="nbanner"></div><p class="small nstat" aria-live="polite"></p></div><div class="nlist"></div>';
      head = el.querySelector(".nhead");
      var qi = el.querySelector(".nq"); qi.value = qv;
      qi.addEventListener("input", function () { qv = qi.value; pageDraw(); });
      el.addEventListener("click", function (e) {
        var t = e.target, it = t.closest && t.closest(".nitem"); if (t.closest(".nfree")) return open({ refType: "free", refId: "", refText: "", subject: "other", lesson: "" }, t.closest(".nfree"), true);
        if (t.closest(".nsign")) { var A = w.NursinFB; if (A && A.signIn) A.signIn(); else location.href = "friends.html"; return; }
        if (!it) return; var n = find(st, owner, it.getAttribute("data-id")); if (!n) return;
        if (t.closest(".nedit")) open({ id: n.id, refType: n.refType, refId: n.refId, refText: n.refText, subject: n.subject, lesson: n.lesson }, t.closest(".nedit"), n.refType === "free");
        else if (t.closest(".ndel2")) {
          if (!w.confirm(T("أكيد بدّك تمحي هالملاحظة؟", "Supprimer cette note ?"))) return;
          var go = function () { remove(st, owner, n.id); save(); flush(); toast(T("🗑️ انمحت الملاحظة", "🗑️ Note supprimée")); };
          var Ani = w.NursinAnim; if (Ani) Ani.out(it, go); else go();
        }
      });
    }
    drawnOnce = true;
    el.querySelector(".nbanner").innerHTML = owner ? "" : '<p class="nout">🔒 ' + esc(T("سجّل دخول لتضل ملاحظاتك على كل أجهزتك", "Connecte-toi pour garder tes notes sur tous tes appareils")) + ' <button class="btn sm nsign" type="button">' + esc(T("سجّل دخول", "Se connecter")) + "</button></p>";
    var shown = all.filter(function (n) { return matches(n, qv, lessonName(n.lesson) + " " + subjName(n.subject)); });
    shown.forEach(function (n) { var s = S[n.subject] ? n.subject : "other"; (groups[s] = groups[s] || {}); (groups[s][n.lesson || ""] = groups[s][n.lesson || ""] || []).push(n); });
    var stt = el.querySelector(".nstat"), sl = syncLine();
    stt.innerHTML = all.length ? esc(T(all.length + (all.length >= 3 && all.length <= 10 ? " ملاحظات" : " ملاحظة"), all.length + (all.length > 1 ? " notes" : " note"))) + (qv.trim() ? " · " + esc(T("لقينا " + shown.length, shown.length + " trouvée(s)")) : "") + (sl ? " · " + sl : "") : "";
    var L = el.querySelector(".nlist");
    if (!all.length) { L.innerHTML = '<div class="qcard nempty"><p class="nbig" aria-hidden="true">📝</p><p><b>' + esc(T("لسّا ما عندك ملاحظات", "Pas encore de notes")) + "</b></p><p class=\"small\">" + esc(T("بأي كويز أو درس أو بطاقة، كبوس «📝 ملاحظة» واكتب شو بدّك تتذكّر. الملاحظة بتنحفظ بدون ما تطلع من الكويز، وبتلاقيها هون مرتّبة حسب المادة والدرس.", "Dans un quiz, une leçon ou une carte, touche « 📝 Note » et écris ce que tu veux retenir. Elle s'enregistre sans quitter le quiz, et tu la retrouves ici, rangée par matière et leçon.")) + '</p><p><a class="btn" href="quiz.html">' + esc(T("📝 روح عالكويز", "📝 Aller au quiz")) + "</a></p></div>"; return; }
    if (!shown.length) { L.innerHTML = '<p class="small nnone">' + esc(T("ما لقينا شي بهالكلمة. جرّب كلمة تانية.", "Rien trouvé avec ce mot. Essaie un autre.")) + "</p>"; return; }
    var h = "";
    order.forEach(function (s) {
      if (!groups[s]) return; var g = groups[s], n0 = 0, k; for (k in g) n0 += g[k].length;
      var lks = Object.keys(g).sort(function (a, b) { if (!a) return 1; if (!b) return -1; var L2 = R().list, ia = -1, ib = -1; for (var i = 0; i < L2.length; i++) { if (base(L2[i]) === a) ia = i; if (base(L2[i]) === b) ib = i; } return ia - ib; });
      h += '<section class="ngrp"><h2>' + esc(subjName(s)) + ' <small>(' + n0 + ")</small></h2>";
      lks.forEach(function (lk) {
        h += '<h3 class="nles3">' + esc(lessonName(lk)) + "</h3>";
        g[lk].forEach(function (n) {
          var href = link(n), ty = TYPEN[n.refType] || TYPEN.free;
          h += '<article class="nitem" data-id="' + esc(n.id) + '">' +
            (n.refType !== "free" && n.refText ? '<p class="nsrc"><span class="ntype">' + esc(T(ty[0], ty[1])) + "</span> " + (href ? '<a href="' + esc(href) + '">' + esc(n.refText) + " ←</a>" : esc(n.refText)) + "</p>" : '<p class="nsrc"><span class="ntype">' + esc(T(ty[0], ty[1])) + "</span>" + (href ? ' <a href="' + esc(href) + '">' + esc(lessonName(n.lesson)) + " ←</a>" : "") + "</p>") +
            '<p class="ntext">' + esc(n.text) + "</p>" +
            '<p class="small nwhen">🕒 ' + esc(T("انكتبت ", "Créée le ")) + '<span dir="ltr">' + fmt(n.createdAt) + "</span>" + (n.updatedAt - n.createdAt > 60000 ? " · ✏️ " + esc(T("تعدّلت ", "modifiée le ")) + '<span dir="ltr">' + fmt(n.updatedAt) + "</span>" : "") + (owner && n.d ? " · ⏳" : "") + "</p>" +
            '<p class="nact2"><button class="btn sm nedit" type="button">' + esc(T("✏️ عدّل", "✏️ Modifier")) + '</button><button class="btn sm ndel2" type="button">' + esc(T("🗑️ امحي", "🗑️ Supprimer")) + "</button></p></article>";
        });
      });
      h += "</section>";
    });
    L.innerHTML = h;
  }

  /* ---------------- wiring ---------------- */
  function init() {
    if (w.NursinFB && w.NursinFB.user) onAuth();                 // auth already settled (signed in) before this script ran
    if (d.getElementById("notes-app")) { pageDraw(); setTimeout(function () { if (!authKnown) { authKnown = true; pageDraw(); } }, w.Nursin && w.Nursin.me ? 8000 : 2500); }
    mount();
    try { new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (box && box.contains(t)) continue; if (t.closest && t.closest(".ntoast,.nlist")) continue; mount(); return; } }).observe(d.body, { childList: true, subtree: true }); } catch (e) {}
    d.addEventListener("nursin:lesson-read", mount);
  }
  API.open = function (meta) { open(meta, null, meta.refType === "free"); };
  API.status = status; API.state = function () { return st; }; API.owner = function () { return owner; }; API.flush = flush; API.mount = mount;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
