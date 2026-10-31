/* 🖍️ «القلم» — highlight words in any lesson (Abdullah, Oct 31 2026 7:35 AM: «الطالب ب ايا درس بيكون عم يدرسه يقدر يعلم الكلمات ل بده ياها
   و يكون مخصص من قبل شو هوي اللون»; 7:37 AM: «ما بدي انه كل شوي الطالب يختار اللون»).
   • ONE tap: select text in a lesson → a small glass pill shows under (or over) the selection with a big 🖍️ that marks it right away in
     the student's CURRENT colour (sticky: the last one used, yellow the first time) + a colour dot (5 colours, remembered from then on)
     + 🧽 when the selection touches a highlight (erases just the selected bit).
   • «🖊️ وضع القلم» (header button on lesson pages + «الكل»): every selection is marked by itself, no pill at all.
   • Tap a highlight → colour / 🧽 remove / 📝 note (assets/notes.js, the note is about that highlight).
   • Anchoring: lesson part (its <details id>, e.g. cardio.html#infarctus-p2) + the exact text (head/tail when long) + 32 letters of
     context before/after + offsets as the last fallback — survives re-renders, the lesson split and FR ⇄ AR (each highlight belongs to
     the language it was made in and shows again when that language is back).
   • Saved on the device at once (localStorage nursin_hl_v1); signed in → users/{uid}/highlights/{id} (rules v19), merged across devices.
   • highlights.html «🖍️ تعليماتي» (drawn here when #hl-app exists): all of them by مادة → درس, colour filter, jump back, delete,
     🔁 review mode. No ads anywhere in this file. */
(function (w, d) {
  "use strict";
  var KEY = "nursin_hl_v1", PKEY = "nursin_hl_pref_v1", MAXQ = 600, HEAD = 280, CTX = 32, MAXLEN = 20000;
  var COLORS = [["y", "أصفر", "Jaune"], ["g", "أخضر", "Vert"], ["p", "زهر", "Rose"], ["b", "أزرق", "Bleu"], ["o", "برتقالي", "Orange"]];
  var CK = COLORS.map(function (c) { return c[0]; });
  var LPAGES = { "cardio.html": 1, "neuro.html": 1, "henderson.html": 1, "law.html": 1, "mgmt.html": 1, "quality.html": 1, "pharma.html": 1, "rea.html": 1,
    "geri.html": 1, "community.html": 1, "medsurg.html": 1, "3d.html": 1 };
  /* inside a lesson body, never these (buttons, the 📝 row, quiz links, the pill itself, third-party frames) */
  var EXCL = "button,input,select,textarea,script,style,noscript,svg,iframe,canvas,.nlrow,.nbtn,.hlpill,.lqz,.glk-card,[data-nohl],[contenteditable]";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function lang() { return FR() ? "fr" : "ar"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cut(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n) : s; }
  function int(v, mx) { v = Math.floor(+v || 0); return v < 0 ? 0 : v > mx ? mx : v; }
  function newId() { return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------------- anchoring (pure, tests run it) ---------------- */
  // the anchor of [s, e) in the text t of a lesson part: exact text (head + tail when long), context before / after, offsets
  function quote(t, s, e) {
    var x = t.slice(s, e), n = x.length;
    return { q: n > MAXQ ? x.slice(0, HEAD) : x, q2: n > MAXQ ? x.slice(n - HEAD) : "", n: n, pre: t.slice(Math.max(0, s - CTX), s), suf: t.slice(e, e + CTX), s: s, e: e };
  }
  function tailMatch(a, b) { var i = 0; while (i < a.length && i < b.length && a.charAt(a.length - 1 - i) === b.charAt(b.length - 1 - i)) i++; return i; }
  function headMatch(a, b) { var i = 0; while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i++; return i; }
  function collapse(s) {                                    // whitespace runs → one space, with the way back to the original index
    var c = "", map = [], sp = false;
    for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); if (/\s/.test(ch)) { if (!sp) { c += " "; map.push(i); } sp = true; } else { c += ch; map.push(i); sp = false; } }
    map.push(s.length); return { c: c, map: map };
  }
  function bigrams(s) { var o = {}, n = 0; s = s.replace(/\s+/g, " "); for (var i = 0; i < s.length - 1; i++) { var k = s.substr(i, 2); o[k] = (o[k] || 0) + 1; n++; } return { o: o, n: n }; }
  function dice(a, b) {
    var A = bigrams(a), B = bigrams(b), m = 0, k; if (!A.n || !B.n) return a === b ? 1 : 0;
    for (k in A.o) if (B.o[k]) m += Math.min(A.o[k], B.o[k]);
    return 2 * m / (A.n + B.n);
  }
  // where the anchor sits in t now → [s, e] or null. 1) exact text, best context / nearest offset 2) same, whitespace-insensitive
  // 3) the old offsets when the text there is still close (a lesson edited a little)
  function locate(t, a) {
    if (!a || !a.q || !t) return null;
    var n = a.q2 ? a.n : a.q.length, best = null, bs = -1, i = t.indexOf(a.q);
    while (i >= 0) {
      if (!a.q2 || t.substr(i + n - a.q2.length, a.q2.length) === a.q2) {
        var sc = tailMatch(t.slice(Math.max(0, i - CTX), i), a.pre || "") * 4 + headMatch(t.slice(i + n, i + n + CTX), a.suf || "") * 4 - Math.min(Math.abs(i - (a.s | 0)), 9999) / 10000;
        if (sc > bs) { bs = sc; best = [i, i + n]; }
      }
      i = t.indexOf(a.q, i + 1);
    }
    if (best) return best;
    var C = collapse(t), Q = collapse(a.q).c.trim(), Q2 = a.q2 ? collapse(a.q2).c.trim() : "";
    if (Q) {
      var j = C.c.indexOf(Q), cand = null, cd = 1e9;
      while (j >= 0) {
        var endC = j + Q.length;
        if (Q2) { var k = C.c.indexOf(Q2, endC - Math.min(Q.length, Q2.length)); endC = k >= 0 ? k + Q2.length : -1; }
        if (endC > j) { var s0 = C.map[j], e0 = C.map[endC - 1] + 1, dd = Math.abs(s0 - (a.s | 0)); if (dd < cd) { cd = dd; cand = [s0, e0]; } }
        j = C.c.indexOf(Q, j + 1);
      }
      if (cand) return cand;
    }
    if (a.e > a.s && a.e <= t.length) { var was = a.q2 ? a.q + a.q2 : a.q, now = a.q2 ? t.slice(a.s, a.s + HEAD) + t.slice(a.e - HEAD, a.e) : t.slice(a.s, a.e); if (dice(was, now) >= 0.6) return [a.s, a.e]; }
    return null;
  }

  /* ---------------- store (pure on a state object, like assets/notes.js) ----------------
     st = { v: 1, h: { "<owner>|<id>": item + {id, o, d (to send), y (on the account)} }, x: { "<owner>|<id>": time } (deletes to send) } */
  var FIELDS = ["pg", "k", "lg", "q", "q2", "n", "pre", "suf", "s", "e", "c", "sj", "lk", "pt", "t", "u"];
  function clean(h) {                                       // exactly the fields rules v19 accept, sizes clamped
    var t0 = int(h.t, 9e15) || Date.now(), u = Math.max(int(h.u, 9e15), t0);
    return { pg: cut(h.pg, 40), k: cut(h.k, 80), lg: h.lg === "fr" ? "fr" : "ar", q: cut(h.q, MAXQ), q2: cut(h.q2 || "", HEAD), n: int(h.n, 1e6), pre: cut(h.pre || "", CTX * 2), suf: cut(h.suf || "", CTX * 2),
      s: int(h.s, 1e7), e: int(h.e, 1e7), c: CK.indexOf(h.c) >= 0 ? h.c : "y", sj: cut(h.sj || "", 40), lk: cut(h.lk || "", 80), pt: int(h.pt, 99), t: t0, u: u };
  }
  function blank() { return { v: 1, h: {}, x: {} }; }
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v === 1 && o.h && o.x) return o; } catch (e) {} return blank(); }
  function persist(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
  function list(st, o) { var out = [], k; for (k in st.h) if (st.h[k].o === (o || "")) out.push(st.h[k]); return out; }
  function find(st, o, id) { return st.h[(o || "") + "|" + id] || null; }
  function put(st, o, h, at) {
    o = o || ""; at = at || Date.now();
    var id = h.id || newId(), key = o + "|" + id, old = st.h[key];
    var n = clean(Object.assign({}, old || {}, h, { t: old ? old.t : (h.t || at), u: Math.max(at, old ? old.u + 1 : 0) }));
    n.id = id; n.o = o; n.d = 1; n.y = old ? old.y | 0 : 0;
    st.h[key] = n; delete st.x[key]; return n;
  }
  function remove(st, o, id, at) { var key = (o || "") + "|" + id, old = st.h[key]; if (!old) return false; delete st.h[key]; if (o && old.y) st.x[key] = at || Date.now(); return true; }
  function pending(st, o) {
    var put_ = [], del = [], k; o = o || "";
    for (k in st.h) if (st.h[k].o === o && o && st.h[k].d) put_.push(st.h[k]);
    for (k in st.x) if (k.indexOf(o + "|") === 0 && o) del.push(k.slice(o.length + 1));
    return { put: put_, del: del };
  }
  // the account's docs → this device (full = a real server answer, so a synced highlight missing there was removed on another device)
  function applyRemote(st, o, docs, full) {
    var k, id, ch = false;
    for (id in docs) {
      k = o + "|" + id; if (st.x[k]) continue;
      var loc = st.h[k], r = clean(docs[id]);
      if (!loc || (!loc.d && r.u >= loc.u) || (loc.d && r.u > loc.u)) { r.id = id; r.o = o; r.d = 0; r.y = 1; st.h[k] = r; ch = true; }
      else if (loc && !loc.y) { loc.y = 1; ch = true; }
    }
    if (full) for (k in st.h) { var h = st.h[k]; if (h.o === o && h.y && !h.d && !docs[h.id]) { delete st.h[k]; ch = true; } }
    return ch;
  }
  function mergeGuest(st, o) {                               // highlights made signed out move to the account at sign-in
    var k, ch = false;
    for (k in st.h) { var h = st.h[k]; if (h.o === "") { delete st.h[k]; var n = Object.assign({}, h, { o: o, d: 1, y: 0 }); st.h[o + "|" + h.id] = n; ch = true; } }
    return ch;
  }
  // overlap of a new [s, e) with highlights in the same part: [{id, s, e}] → what to remove / recolour, the merged span
  function overlaps(spans, s, e) { return spans.filter(function (x) { return x.s < e && s < x.e; }); }

  /* ---------------- lessons registry (assets/lessons.js) ---------------- */
  function R() { return w.NLESSONS || { subjects: {}, list: [], parts: [] }; }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function partByHref(href) { var P = R().parts || R().list || []; for (var i = 0; i < P.length; i++) if (P[i].href === href) return P[i]; return null; }
  function lessonOf(k) { var L = R().list || []; for (var i = 0; i < L.length; i++) if (base(L[i]) === k) return L[i]; return null; }
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  function pageSubject(pg) { var s = R().subjects || {}, k; for (k in s) if (s[k].page === (pg || page)) return k; return (pg || page) === "3d.html" ? "anatomy" : "other"; }
  function link(h) { return h.pg + "?hl=" + encodeURIComponent(h.id) + (/^b\d+$/.test(h.k) ? "" : "#" + h.k); }

  var API = w.NursinHL = { KEY: KEY, PKEY: PKEY, COLORS: COLORS, MAXQ: MAXQ, quote: quote, locate: locate, collapse: collapse, dice: dice, clean: clean, FIELDS: FIELDS,
    blank: blank, load: load, list: list, find: find, put: put, remove: remove, pending: pending, applyRemote: applyRemote, mergeGuest: mergeGuest, overlaps: overlaps,
    link: link, lessonPage: !!LPAGES[page], LPAGES: LPAGES };
  if (!d || !d.addEventListener || !d.createElement) return;

  /* ---------------- preferences: the sticky colour + pen mode ---------------- */
  function pref() { try { var p = JSON.parse(localStorage.getItem(PKEY) || "null"); if (p && typeof p === "object") return p; } catch (e) {} return {}; }
  function setPref(k, v) { var p = pref(); p[k] = v; try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  function color() { var c = pref().c; return CK.indexOf(c) >= 0 ? c : "y"; }
  function pen() { return !!pref().pen; }
  function cname(c) { for (var i = 0; i < COLORS.length; i++) if (COLORS[i][0] === c) return T(COLORS[i][1], COLORS[i][2]); return ""; }
  function cdef(c) { for (var i = 0; i < COLORS.length; i++) if (COLORS[i][0] === c) return T("ال" + COLORS[i][1], COLORS[i][2].toLowerCase()); return ""; }   // «بالأصفر» / «en jaune»

  /* ---------------- live state + sync (users/{uid}/highlights, rules v19) ---------------- */
  var st = load(), owner = "", unsub = null, sync = { err: "", busy: false, timer: 0 };
  function fb() { var A = w.NursinFB; return A && A.user && A.fs && A.db && A.fs.collection ? A : null; }
  function mine() { return list(st, owner); }
  function save() { persist(st); }
  function status() {
    if (!owner) return "local";
    var p = pending(st, owner); if (!p.put.length && !p.del.length) return "ok";
    return sync.err === "permission-denied" ? "wait" : "pending";
  }
  function schedule(ms) { clearTimeout(sync.timer); sync.timer = setTimeout(flush, ms); }
  function flush() {
    var A = fb(); if (!A || !owner || A.user.uid !== owner || sync.busy) return;
    var p = pending(st, owner); if (!p.put.length && !p.del.length) return;
    if (w.navigator && w.navigator.onLine === false) { sync.err = "offline"; return; }
    sync.busy = true; var uid = owner, left = p.put.length + p.del.length, failed = null;
    var guard = setTimeout(function () { sync.busy = false; }, 20000);
    function one(e) {
      if (e) failed = e; if (--left > 0) return;
      clearTimeout(guard); sync.busy = false; sync.err = failed ? (failed.code || "error") : "";
      persist(st); pageRepaint();
      if (failed) schedule(failed.code === "permission-denied" ? 300000 : 60000); else if (pending(st, uid).put.length) schedule(1500);
    }
    p.put.forEach(function (h) {
      var ver = h.u;
      A.fs.setDoc(A.fs.doc(A.db, "users", uid, "highlights", h.id), clean(h)).then(function () { var c = st.h[uid + "|" + h.id]; if (c && c.u === ver) { c.d = 0; c.y = 1; } one(); }, one);
    });
    p.del.forEach(function (id) { A.fs.deleteDoc(A.fs.doc(A.db, "users", uid, "highlights", id)).then(function () { delete st.x[uid + "|" + id]; one(); }, one); });
  }
  function listen() {
    var A = fb(); if (!A || unsub) return; var uid = A.user.uid;
    try {
      unsub = A.fs.onSnapshot(A.fs.collection(A.db, "users", uid, "highlights"), function (snap) {
        if (owner !== uid) return;
        var docs = {}; snap.forEach(function (s) { docs[s.id] = s.data(); });
        if (applyRemote(st, uid, docs, !(snap.metadata && snap.metadata.fromCache))) { save(); refresh(); }
        if (sync.err === "permission-denied") sync.err = "";
        flush(); pageRepaint();
      }, function (e) {
        unsub = null; sync.err = (e && e.code) || "error"; pageRepaint();
        if (sync.err !== "permission-denied") console.warn("nursin: highlights sync", sync.err);    // denied = rules v19 not published yet
        setTimeout(function () { if (owner === uid) listen(); }, sync.err === "permission-denied" ? 300000 : 60000);
      });
    } catch (e) { unsub = null; }
  }
  function stopListen() { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } }
  function onAuth() {
    var A = w.NursinFB, u = A && A.user, o = u ? u.uid : "";
    if (o === owner && (unsub || !o)) return;
    stopListen(); owner = o; st = load();
    if (!o) { var k, gone = 0; for (k in st.h) if (st.h[k].o && !st.h[k].d) { delete st.h[k]; gone++; } if (gone) persist(st); }   // signed out: the account's synced highlights leave this device
    if (o) { if (mergeGuest(st, o)) persist(st); listen(); flush(); }
    refresh(); pageRepaint();
  }
  d.addEventListener("nursin:auth", function () { setTimeout(onAuth, 0); });
  w.addEventListener("online", function () { sync.err = ""; listen(); flush(); });
  d.addEventListener("visibilitychange", function () { if (d.visibilityState === "visible" && owner) { listen(); flush(); } });
  setInterval(function () { if (owner && status() === "pending") flush(); }, 60000);
  w.addEventListener("storage", function (e) { if (e.key === KEY) { st = load(); refresh(); pageRepaint(); } if (e.key === PKEY) penPaint(); });

  /* ---------------- the lesson text: parts, text index, marks ---------------- */
  function roots() {
    if (!LPAGES[page]) return [];
    var main = d.querySelector("main") || d.body;
    return [].slice.call(main.querySelectorAll(".tbody")).filter(function (r) { return !r.querySelector(".tbody") && !r.closest("#qsets,.psec,.hmist,.fcwrap,.gsheet,.hzsheet"); });
  }
  function keyOf(r, all) {
    var dt = r.parentElement && r.parentElement.closest("details.topic[id]");
    if (dt && dt.querySelector(":scope > .tbody") === r) return dt.id;
    var free = (all || roots()).filter(function (x) { var p = x.parentElement && x.parentElement.closest("details.topic[id]"); return !(p && p.querySelector(":scope > .tbody") === x); });
    return "b" + Math.max(0, free.indexOf(r));
  }
  function rootByKey(k) { var all = roots(); for (var i = 0; i < all.length; i++) if (keyOf(all[i], all) === k) return all[i]; return null; }
  function rootOf(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement); if (!el || !el.closest) return null;
    var r = el.closest(".tbody"); if (!r || roots().indexOf(r) < 0) return null; return r;
  }
  function skipped(n, root) { var p = n.parentElement; var x = p && p.closest(EXCL); return !!(x && root.contains(x)); }
  function index(root) {                                    // the lesson part's text + where each text node starts in it
    var tw = d.createTreeWalker(root, 4, null), n, nodes = [], t = "";
    while ((n = tw.nextNode())) { if (skipped(n, root)) continue; nodes.push({ n: n, a: t.length }); t += n.data; }
    return { t: t, nodes: nodes };
  }
  function offsets(root, range) {                           // a DOM range → [s, e) in the part's text (clamped to the part)
    var ix = index(root), s = null, e = null, i, x, L;
    for (i = 0; i < ix.nodes.length; i++) {
      x = ix.nodes[i]; L = x.n.data.length;
      if (s === null) { var c1; try { c1 = range.comparePoint(x.n, L); } catch (er) { c1 = 0; } if (c1 >= 0) s = x.n === range.startContainer ? x.a + range.startOffset : x.a; }
      var c2; try { c2 = range.comparePoint(x.n, 0); } catch (er) { c2 = 1; }
      if (c2 <= 0) e = x.n === range.endContainer ? x.a + Math.min(range.endOffset, L) : x.a + L;
    }
    if (s === null || e === null || e <= s) return null;
    while (s < e && /\s/.test(ix.t.charAt(s))) s++;            // no spaces at the edges
    while (e > s && /\s/.test(ix.t.charAt(e - 1))) e--;
    return e > s ? [s, e, ix.t] : null;
  }
  function spansIn(root) {                                  // the highlights drawn in a part: [{id, s, e}]
    var ix = index(root), m = {};
    ix.nodes.forEach(function (x) { var mk = x.n.parentElement && x.n.parentElement.closest("mark.hlm"); if (!mk || !root.contains(mk)) return; var id = mk.getAttribute("data-hl"), o = m[id]; var a = x.a, b = x.a + x.n.data.length; if (!o) m[id] = { id: id, s: a, e: b }; else { o.s = Math.min(o.s, a); o.e = Math.max(o.e, b); } });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  /* our own DOM changes: the French translator (assets/lang.js) and our observer must not react to them */
  var mo = null, quietDepth = 0;
  function quiet(fn) {
    quietDepth++;
    try { if (w.Lang && w.Lang.hush) w.Lang.hush(fn); else fn(); }
    finally { quietDepth--; if (mo) mo.takeRecords(); }
  }
  function wrap(root, s, e, id, c) {
    var ix = index(root), made = 0;
    quiet(function () {
      ix.nodes.forEach(function (x) {
        var L = x.n.data.length, os = Math.max(s, x.a), oe = Math.min(e, x.a + L); if (os >= oe) return;
        if (!x.n.data.slice(os - x.a, oe - x.a).trim()) return;
        var tg = x.n; if (os - x.a > 0) tg = tg.splitText(os - x.a); if (oe - os < tg.data.length) tg.splitText(oe - os);
        var mk = d.createElement("mark"); mk.className = "hlm hl-" + c; mk.setAttribute("data-hl", id); mk.setAttribute("data-nofr", "");
        tg.parentNode.insertBefore(mk, tg); mk.appendChild(tg); made++;
      });
    });
    return made;
  }
  function unwrap(id, scope) {
    var ms = (scope || d).querySelectorAll('mark.hlm[data-hl="' + id + '"]'); if (!ms.length) return;
    quiet(function () { [].forEach.call(ms, function (mk) { var p = mk.parentNode; while (mk.firstChild) p.insertBefore(mk.firstChild, mk); p.removeChild(mk); p.normalize(); }); });
  }
  function recolorDom(id, c) { [].forEach.call(d.querySelectorAll('mark.hlm[data-hl="' + id + '"]'), function (mk) { mk.className = "hlm hl-" + c; }); }

  /* draw every highlight of this page + language that is not on screen yet (again after re-renders) */
  var tried = {};
  function visible() { var lg = lang(); return mine().filter(function (h) { return h.pg === page && h.lg === lg; }); }
  function apply() {
    if (!LPAGES[page]) return;
    var want = {}, rs = null;
    visible().forEach(function (h) {
      want[h.id] = 1;
      var on = d.querySelector('mark.hlm[data-hl="' + h.id + '"]');
      if (on) { if (!on.classList.contains("hl-" + h.c)) recolorDom(h.id, h.c); return; }
      var r = rootByKey(h.k); if (!r) return;
      var ix = index(r), memo = h.id + "|" + ix.t.length; if (tried[memo]) return;
      var pos = locate(ix.t, h); if (!pos) { tried[memo] = 1; return; }
      rs = rs || {}; if (overlaps(spansIn(r), pos[0], pos[1]).length) { tried[memo] = 1; return; }
      wrap(r, pos[0], pos[1], h.id, h.c);
    });
    [].forEach.call(d.querySelectorAll("mark.hlm[data-hl]"), function (mk) { if (!want[mk.getAttribute("data-hl")]) unwrap(mk.getAttribute("data-hl")); });
  }
  var aT = 0;                                               // throttled, never debounced: busy pages (timers, Osman cards) mutate all the time
  function run() { aT = 0; apply(); jump(); }
  function refresh(ms) { if (!aT) aT = setTimeout(run, typeof ms === "number" ? ms : 60); }

  /* ---------------- making / changing highlights ---------------- */
  function partInfo(root, s) {                              // the lesson part a selection belongs to → {k, sj, lk, pt}
    var k = keyOf(root), x = /^b\d+$/.test(k) ? null : partByHref(page + "#" + k), sj = pageSubject(), lk = "", pt = 0;
    if (x) { sj = x.s; lk = base(x); pt = x.p || 0; }
    else {                                                  // Henderson: one body, two lessons — the one whose «📝 كويز» link comes after the text
      var P = (R().parts || R().list || []).filter(function (y) { return y.href.split("#")[0] === page && y.l; });
      if (P.length) {
        var ix = index(root), at = null; for (var i = 0; i < ix.nodes.length; i++) if (ix.nodes[i].a + ix.nodes[i].n.data.length > s) { at = ix.nodes[i].n; break; }
        var pick = P[P.length - 1];
        for (var j = 0; j < P.length && at; j++) { var q = d.querySelector('.lqz a[href*="l=' + P[j].l + '"]'); if (q && (at.compareDocumentPosition(q) & 4)) { pick = P[j]; break; } }
        sj = pick.s; lk = base(pick); pt = pick.p || 0;
      }
    }
    return { k: k, sj: sj, lk: lk, pt: pt };
  }
  function create(root, s, e, c, t) {
    var a = quote(t, s, e), pi = partInfo(root, s);
    var h = put(st, owner, Object.assign(a, { pg: page, k: pi.k, lg: lang(), c: c, sj: pi.sj, lk: pi.lk, pt: pi.pt }));
    wrap(root, s, e, h.id, c); return h;
  }
  function drop(id) { unwrap(id); remove(st, owner, id); }
  function done(msg) { save(); flush(); if (msg) toast(msg); try { if (w.navigator.vibrate) w.navigator.vibrate(8); } catch (e) {} }
  // mark [s, e) of a part in colour c: inside one highlight → recolour it; touching others → one merged highlight
  function mark(sel, c) {
    var r = sel.root; if (!r || !r.isConnected) { r = rootByKey(sel.k); if (!r) return; }
    var ov = overlaps(spansIn(r), sel.s, sel.e), s = sel.s, e = sel.e;
    if (ov.length === 1 && ov[0].s <= s && ov[0].e >= e) { var h0 = find(st, owner, ov[0].id); if (h0) { put(st, owner, { id: h0.id, c: c }); recolorDom(h0.id, c); done(); return; } }
    ov.forEach(function (x) { s = Math.min(s, x.s); e = Math.max(e, x.e); drop(x.id); });
    if (e - s > MAXLEN) { toast(T("✋ التحديد طويل كتير، علّم جزء أصغر", "✋ Sélection trop longue, surligne un passage plus court")); return; }
    create(r, s, e, c, index(r).t); done();
  }
  // 🧽 erase just the selected bit: what is outside the selection stays highlighted
  function erase(sel) {
    var r = sel.root && sel.root.isConnected ? sel.root : rootByKey(sel.k); if (!r) return;
    var ov = overlaps(spansIn(r), sel.s, sel.e); if (!ov.length) return;
    var keep = [];
    ov.forEach(function (x) { var h = find(st, owner, x.id), c = h ? h.c : color(); if (x.s < sel.s) keep.push([x.s, sel.s, c]); if (sel.e < x.e) keep.push([sel.e, x.e, c]); drop(x.id); });
    var t = index(r).t;
    keep.forEach(function (k) { var a = k[0], b = k[1]; while (a < b && /\s/.test(t.charAt(a))) a++; while (b > a && /\s/.test(t.charAt(b - 1))) b--; if (b > a) create(r, a, b, k[2], t); });
    done(T("🧽 انمحى التعليم", "🧽 Surlignage effacé"));
  }

  /* ---------------- the pill ---------------- */
  var pill = null, mode = "", cur = null, curMark = null, palOpen = false, touchAt = 0, lastSel = null;
  function swatch(c, on) { return '<i class="hlsw hl-' + c + (on ? " on" : "") + '" aria-hidden="true"></i>'; }
  function palHtml(active) {
    return '<div class="hlpal" role="group" aria-label="' + esc(T("الألوان", "Couleurs")) + '">' + COLORS.map(function (x) {
      return '<button type="button" class="hlc" data-c="' + x[0] + '" aria-pressed="' + (x[0] === active) + '" aria-label="' + esc(T(x[1], x[2])) + '">' + swatch(x[0], x[0] === active) + "</button>";
    }).join("") + "</div>";
  }
  function pillHtml() {
    var c = color();
    if (mode === "sel") {
      var onHl = cur && cur.root && overlaps(spansIn(cur.root), cur.s, cur.e).length;
      return '<button type="button" class="hlgo" data-a="go" aria-label="' + esc(T("علّم ب", "Surligner en ") + cdef(c)) + '"><span class="hlpen hl-' + c + '" aria-hidden="true">🖍️</span><b>' + esc(T("علّم", "Surligner")) + "</b></button>" +
        '<button type="button" class="hldot" data-a="pal" aria-expanded="' + palOpen + '" aria-label="' + esc(T("غيّر اللون (هلّق: ", "Changer la couleur (actuelle : ") + cname(c) + ")") + '">' + swatch(c, true) + "</button>" +
        (onHl ? '<button type="button" class="hlrm" data-a="rm" aria-label="' + esc(T("امحي التعليم", "Effacer le surlignage")) + '">🧽</button>' : "") +
        (palOpen ? palHtml(c) : "");
    }
    var h = curMark && find(st, owner, curMark);
    return palHtml(h ? h.c : c) + '<span class="hlsep" aria-hidden="true"></span>' +
      '<button type="button" class="hlrm" data-a="del" aria-label="' + esc(T("امحي التعليم", "Effacer le surlignage")) + '">🧽</button>' +
      (w.NursinNotes && w.NursinNotes.open ? '<button type="button" class="hlnote" data-a="note">📝 <b>' + esc(T("ملاحظة", "Note")) + "</b></button>" : "");
  }
  function ensurePill() {
    if (pill) return pill;
    pill = d.createElement("div"); pill.className = "hlpill"; pill.setAttribute("role", "toolbar"); pill.setAttribute("aria-label", T("🖍️ القلم", "🖍️ Surligneur")); pill.setAttribute("data-nofr", ""); pill.hidden = true;
    d.body.appendChild(pill);
    // keep the selection while the pill is touched (the cached range is used anyway)
    ["pointerdown", "mousedown"].forEach(function (ev) { pill.addEventListener(ev, function (e) { touchAt = Date.now(); if (e.type === "mousedown" || e.pointerType === "mouse") e.preventDefault(); }); });
    pill.addEventListener("touchstart", function () { touchAt = Date.now(); }, { passive: true });
    pill.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button"); if (!b) return; e.preventDefault(); e.stopPropagation(); touchAt = Date.now();
      var a = b.getAttribute("data-a"), c = b.getAttribute("data-c");
      if (mode === "sel") {
        if (a === "go" && cur) { mark(cur, color()); endSel(); hide(); return; }
        if (a === "pal") { palOpen = !palOpen; draw(); return; }
        if (c && cur) { setPref("c", c); penPaint(); mark(cur, c); endSel(); hide(); toast(T("🖍️ صار لونك: ", "🖍️ Ta couleur : ") + cname(c)); return; }
        if (a === "rm" && cur) { erase(cur); endSel(); hide(); return; }
      } else if (mode === "mark" && curMark) {
        if (c) { setPref("c", c); put(st, owner, { id: curMark, c: c }); recolorDom(curMark, c); done(); hide(); return; }
        if (a === "del") { drop(curMark); done(T("🧽 انمحى التعليم", "🧽 Surlignage effacé")); hide(); return; }
        if (a === "note") { var h = find(st, owner, curMark); hide(); if (h) noteFor(h, b); return; }
      }
    });
    return pill;
  }
  function draw() { ensurePill().innerHTML = pillHtml(); pill.classList.toggle("hlpm", mode === "mark"); place(); }
  function rectNow() {
    if (mode === "mark") { var ms = d.querySelectorAll('mark.hlm[data-hl="' + curMark + '"]'); if (!ms.length) return null; var a = ms[0].getBoundingClientRect(), b = ms[ms.length - 1].getBoundingClientRect(); return { top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom), left: Math.min(a.left, b.left), right: Math.max(a.right, b.right) }; }
    var s = w.getSelection && w.getSelection(); if (s && s.rangeCount && !s.isCollapsed) { var r = s.getRangeAt(0).getBoundingClientRect(); if (r && (r.width || r.height)) return r; }
    return cur && cur.rect;
  }
  var coarse = false; try { coarse = w.matchMedia("(pointer:coarse)").matches; } catch (e) {}
  function place() {
    if (!pill || pill.hidden) return;
    var r = rectNow(); if (!r) { hide(); return; }
    var vw = w.innerWidth, vh = w.innerHeight, pw = pill.offsetWidth, ph = pill.offsetHeight, gap = coarse ? 34 : 12;   // under the selection handles; the phone's own menu sits above
    var top = r.bottom + gap, nav = 96;
    if (top + ph > vh - nav) top = r.top - ph - (coarse ? 56 : 12);                 // no room under it: over it (above the phone's menu)
    top = Math.max(64, Math.min(top, vh - ph - 12));
    var left = (r.left + r.right) / 2 - pw / 2; left = Math.max(8, Math.min(left, vw - pw - 8));
    pill.style.top = Math.round(top) + "px"; pill.style.left = Math.round(left) + "px";
  }
  function show(m) { mode = m; ensurePill(); pill.hidden = false; draw(); pill.classList.remove("hlin"); void pill.offsetWidth; pill.classList.add("hlin"); }
  function hide() { if (!pill || pill.hidden) return; pill.hidden = true; mode = ""; cur = null; curMark = null; palOpen = false; }
  function endSel() { try { var s = w.getSelection(); if (s) s.removeAllRanges(); } catch (e) {} lastSel = null; }
  w.addEventListener("scroll", function () { if (pill && !pill.hidden) w.requestAnimationFrame(place); }, { passive: true });
  w.addEventListener("resize", function () { if (pill && !pill.hidden) place(); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && pill && !pill.hidden) hide(); });

  /* ---------------- selections (long-press on phones, drag on desktop) ---------------- */
  var down = false, sT = 0;
  function readSel() {
    var s = w.getSelection && w.getSelection(); if (!s || !s.rangeCount || s.isCollapsed) return null;
    var rg = s.getRangeAt(0), root = rootOf(rg.startContainer) || rootOf(rg.endContainer);
    if (!root) return null;
    var a = d.activeElement; if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return null;
    var o = offsets(root, rg); if (!o) return null;
    var rect = rg.getBoundingClientRect();
    return { root: root, k: keyOf(root), s: o[0], e: o[1], rect: rect };
  }
  function onSel() {
    clearTimeout(sT);
    sT = setTimeout(function () {
      var x = readSel();
      if (!x) { if (mode === "sel" && Date.now() - touchAt > 700) hide(); return; }
      lastSel = x;
      if (pen()) { if (down) return; mark(x, color()); endSel(); hide(); return; }     // 🖊️ pen mode: marked by itself, no pill
      cur = x; palOpen = false; show("sel");
    }, pen() ? 650 : 260);
  }
  if (LPAGES[page]) {
    d.addEventListener("selectionchange", onSel);
    d.addEventListener("pointerdown", function (e) { if (!pill || !pill.contains(e.target)) down = true; }, true);
    var up = function () { if (!down) return; down = false; if (pen() || mode !== "mark") onSel(); };
    d.addEventListener("pointerup", up, true); d.addEventListener("pointercancel", function () { down = false; }, true);
    d.addEventListener("touchend", up, true);
    d.addEventListener("click", function (e) {
      if (pill && pill.contains(e.target)) return;
      var mk = e.target.closest && e.target.closest("mark.hlm[data-hl]");
      var s = w.getSelection && w.getSelection();
      if (mk && (!s || s.isCollapsed) && !e.target.closest("a,button")) { curMark = mk.getAttribute("data-hl"); show("mark"); return; }
      if (mode === "mark" || (mode === "sel" && (!s || s.isCollapsed))) hide();
    });
  }

  /* ---------------- 📝 a note on a highlight (assets/notes.js) ---------------- */
  function noteFor(h, from) {
    var N = w.NursinNotes; if (!N || !N.open) return;
    var txt = h.q2 ? h.q + " … " + h.q2 : h.q;
    N.open({ refType: "lesson", refId: (h.lk || h.pg) + (h.pt ? "#" + h.pt : "") + "~h" + h.id, refText: "🖍️ " + cut(txt.replace(/\s+/g, " "), 280), subject: h.sj || pageSubject(h.pg), lesson: h.lk || "" }, from);
  }

  /* ---------------- 🖊️ pen mode switch (header button on lesson pages, «الكل» item) ---------------- */
  var penBtns = [];
  function penPaint() {
    var on = pen(), c = color();
    penBtns.forEach(function (b) {
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", on ? T("🖊️ وضع القلم شغّال — كبوس لتوقّفو", "🖊️ Mode stylo activé — touche pour l'arrêter") : T("🖊️ وضع القلم: كل نص بتحدّدو بيتعلّم لحالو", "🖊️ Mode stylo : tout texte sélectionné est surligné"));
      var i = b.querySelector(".hlsw"); if (i) i.className = "hlsw hl-" + c + (on ? " on" : "");
    });
    d.documentElement.classList.toggle("hlpenon", on && !!LPAGES[page]);
  }
  function togglePen() {
    var on = !pen(); setPref("pen", on); penPaint();
    toast(on ? T("🖊️ وضع القلم شغّال: حدّد أي نص وبيتعلّم لحالو ب", "🖊️ Mode stylo activé : sélectionne un texte, il est surligné en ") + cdef(color()) : T("وقّفنا وضع القلم — بتحدّد وبتكبس 🖍️", "Mode stylo arrêté — sélectionne puis touche 🖍️"));
    return on;
  }
  function headerBtn() {
    if (!LPAGES[page]) return null;
    var b = d.createElement("button"); b.type = "button"; b.className = "uipen"; b.setAttribute("data-nofr", "");
    b.innerHTML = '<span aria-hidden="true">🖊️</span><i class="hlsw" aria-hidden="true"></i>';
    b.addEventListener("click", function (e) { e.preventDefault(); togglePen(); });
    penBtns.push(b); penPaint(); return b;
  }

  /* ---------------- toast (sits above the floating nav) ---------------- */
  var tT = 0;
  function toast(t) {
    var el = d.querySelector(".hltoast"); if (!el) { el = d.createElement("div"); el.className = "hltoast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); el.setAttribute("data-nofr", ""); d.body.appendChild(el); }
    el.textContent = t; el.hidden = false; el.classList.remove("hlout"); clearTimeout(tT);
    tT = setTimeout(function () { el.classList.add("hlout"); setTimeout(function () { el.hidden = true; }, 220); }, 2200);
  }

  /* ---------------- ?hl=<id>: open the lesson at that highlight and flash it ---------------- */
  var want = (/[?&]hl=([A-Za-z0-9_-]+)/.exec((w.location && w.location.search) || "") || [])[1] || "", jumpTries = 0, jumped = false;
  function jump() {
    if (!want || jumped) return;
    var mk = d.querySelector('mark.hlm[data-hl="' + want + '"]');
    if (!mk) {
      if (++jumpTries < 12) { setTimeout(jump, 400); return; }
      jumped = true; var h = find(st, owner, want);
      if (h && h.lg !== lang()) toast(h.lg === "fr" ? T("🇫🇷 هالتعليم انعمل بالفرنسي — بدّل لغة الدراسة لتشوفو", "🇫🇷 Surligné en français — passe en français pour le voir") : T("هالتعليم انعمل بالعربي — رجّع اللغة للعربي لتشوفو", "Surligné en arabe — repasse en arabe pour le voir"));
      else if (h) toast(T("ما لقينا هالتعليم بالدرس (يمكن الدرس تغيّر)", "Surlignage introuvable dans la leçon (elle a peut-être changé)"));
      return;
    }
    jumped = true;
    for (var p = mk.parentElement; p; p = p.parentElement) if (p.tagName === "DETAILS" && !p.open) p.open = true;
    setTimeout(function () {
      var red = false; try { red = w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
      mk.scrollIntoView({ behavior: red ? "auto" : "smooth", block: "center" });
      var all = d.querySelectorAll('mark.hlm[data-hl="' + want + '"]');
      [].forEach.call(all, function (m) { m.classList.add("hlflash"); });
      setTimeout(function () { [].forEach.call(all, function (m) { m.classList.remove("hlflash"); }); }, 2600);
    }, 250);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    owner = (w.NursinFB && w.NursinFB.user && w.NursinFB.user.uid) || "";
    if (LPAGES[page]) {
      refresh();
      try {
        mo = new MutationObserver(function (ms) {                 // only changes in / around lesson text (not timers or cards elsewhere)
          if (quietDepth) return;
          for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t.nodeType === 1 && (t.closest(".tbody") || (t.querySelector && t.querySelector(".tbody")))) { refresh(250); return; } }
        });
        mo.observe(d.querySelector("main") || d.body, { childList: true, subtree: true });
      } catch (e) {}
      d.addEventListener("nursin:lesson-read", function () { refresh(); });
      w.addEventListener("load", function () { refresh(); }); setTimeout(refresh, 1500); setTimeout(refresh, 4000);     // late renderers / slow phones
      var p = pref();
      if (!p.hint) setTimeout(function () { if (pref().hint) return; setPref("hint", 1); toast(T("🖍️ جديد: حدّد أي كلمة بالدرس وعلّمها بكبسة وحدة", "🖍️ Nouveau : sélectionne un mot de la leçon et surligne-le d'une touche")); }, 2500);
    }
    if (d.getElementById("hl-app")) pageInit();
    penPaint();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();

  /* ================= highlights.html «🖍️ تعليماتي» ================= */
  var filt = "", pageOn = false;
  function subjName(k) { var N = w.NursinNotes; if (N && N.subjName) return N.subjName(k); var s = (R().subjects || {})[k]; return s ? T(s.ar, s.fr) : T("عام", "Général"); }
  function lessonName(h) {
    var N = w.NursinNotes, n = h.lk ? (N && N.lessonName ? N.lessonName(h.lk) : ((lessonOf(h.lk) || {}).n || h.lk)) : (R().subjects[h.sj] ? T(R().subjects[h.sj].ar, R().subjects[h.sj].fr) : h.pg);
    return n;
  }
  function textOf(h) { return h.q2 ? h.q + " … " + h.q2 : h.q; }
  function when(t) { try { return new Date(t).toLocaleDateString(FR() ? "fr-FR" : "ar-LB", { day: "numeric", month: "short" }); } catch (e) { return ""; } }
  function syncLine() {
    var s = status();
    if (s === "local") return "🔒 " + esc(T("محفوظة عهالجهاز. سجّل دخول لتضل على كل أجهزتك", "Enregistrés sur cet appareil. Connecte-toi pour les retrouver partout"));
    if (s === "ok") return "☁️ " + esc(T("محفوظة بحسابك، بتبين على كل أجهزتك", "Enregistrés sur ton compte, sur tous tes appareils"));
    if (s === "wait") return "📱 " + esc(T("محفوظة عهالجهاز، وبتنبعت لحسابك قريباً", "Enregistrés sur cet appareil, envoyés à ton compte bientôt"));
    return "⏳ " + esc(T("محفوظة عهالجهاز، بتنبعت لحسابك أول ما يرجع الإنترنت", "Enregistrés sur cet appareil, envoyés dès le retour d'Internet"));
  }
  function emptyHtml() {
    return '<div class="hlempty"><div class="hlbig" aria-hidden="true">🖍️</div><h2>' + esc(T("لسّا ما علّمت ولا كلمة", "Aucun surlignage pour l'instant")) + "</h2>" +
      "<ol><li>" + esc(T("افتح أي درس", "Ouvre une leçon")) + "</li><li>" + esc(T("حدّد كلمة أو جملة (كبسة مطوّلة عالتلفون)", "Sélectionne un mot ou une phrase (appui long sur le téléphone)")) + "</li><li>" +
      esc(T("كبوس 🖍️ علّم — وبيتذكّر لونك للمرّة الجاية", "Touche 🖍️ Surligner — ta couleur est gardée pour la prochaine fois")) + "</li></ol>" +
      "<p class=\"small\">" + esc(T("🖊️ وضع القلم (فوق بالدرس أو بـ«الكل»): بس تحدّد بيتعلّم لحالو.", "🖊️ Mode stylo (en haut de la leçon ou dans « Tout ») : la sélection est surlignée toute seule.")) + "</p>" +
      '<button type="button" class="btn pri" data-hz="learn">📚 ' + esc(T("روح عالدروس", "Aller aux leçons")) + "</button></div>";
  }
  function pageInit() {
    pageOn = true; var app = d.getElementById("hl-app");
    app.addEventListener("click", function (e) {
      var t = e.target, f = t.closest && t.closest("[data-f]");
      if (f) { filt = f.getAttribute("data-f"); pageDraw(); return; }
      var del = t.closest && t.closest(".hldel");
      if (del) { var id = del.getAttribute("data-id"); if (!w.confirm(T("أكيد بدّك تمحي هالتعليم؟", "Supprimer ce surlignage ?"))) return; remove(st, owner, id); save(); flush(); pageDraw(); toast(T("🗑️ انمحى", "🗑️ Supprimé")); return; }
      if (t.closest && t.closest(".hlrev")) { review(); return; }
      if (t.closest && t.closest(".hlsign")) { var A = w.NursinFB; if (A && A.signIn) A.signIn(); else location.href = "friends.html"; return; }
    });
    pageDraw();
  }
  function pageRepaint() { if (pageOn) pageDraw(); }
  function sorted(all) {
    return all.slice().sort(function (a, b) { return (a.sj > b.sj ? 1 : a.sj < b.sj ? -1 : 0) || (a.lk > b.lk ? 1 : a.lk < b.lk ? -1 : 0) || (a.pt - b.pt) || (a.k > b.k ? 1 : a.k < b.k ? -1 : 0) || (a.s - b.s); });
  }
  function pageDraw() {
    var app = d.getElementById("hl-app"); if (!app) return;
    var all = mine(), cnt = {}; all.forEach(function (h) { cnt[h.c] = (cnt[h.c] || 0) + 1; });
    var shown = sorted(all.filter(function (h) { return !filt || h.c === filt; }));
    var h = '<div class="hlhead"><h1>🖍️ ' + esc(T("تعليماتي", "Mes surlignages")) + ' <span class="hlcount">' + all.length + "</span></h1>" +
      '<p class="hlsync">' + syncLine() + (owner ? "" : ' <button type="button" class="btn sm hlsign">' + esc(T("سجّل دخول", "Se connecter")) + "</button>") + "</p></div>";
    if (!all.length) { app.innerHTML = h + emptyHtml(); return; }
    h += '<div class="hlbar"><div class="hlfil" role="group" aria-label="' + esc(T("فلتر حسب اللون", "Filtrer par couleur")) + '">' +
      '<button type="button" class="chip' + (filt ? "" : " on") + '" data-f="" aria-pressed="' + !filt + '">' + esc(T("الكل", "Tout")) + " " + all.length + "</button>" +
      COLORS.filter(function (c) { return cnt[c[0]]; }).map(function (c) { return '<button type="button" class="chip hlfc' + (filt === c[0] ? " on" : "") + '" data-f="' + c[0] + '" aria-pressed="' + (filt === c[0]) + '" aria-label="' + esc(T(c[1], c[2])) + '">' + swatch(c[0], true) + " " + cnt[c[0]] + "</button>"; }).join("") +
      '</div><button type="button" class="btn hlrev">🔁 ' + esc(T("راجع تعليماتي", "Réviser")) + "</button></div>";
    var gs = {}, order = [];
    shown.forEach(function (x) { var s = x.sj || "other"; if (!gs[s]) { gs[s] = {}; order.push(s); } var lk = x.lk || ("~" + x.pg); (gs[s][lk] = gs[s][lk] || []).push(x); });
    order.forEach(function (s) {
      h += '<section class="hlgrp"><h2>' + esc(subjName(s)) + "</h2>";
      Object.keys(gs[s]).forEach(function (lk) {
        var L = gs[s][lk]; h += '<h3 class="hlles">' + esc(lessonName(L[0])) + "</h3><ul class=\"hllist\">";
        L.forEach(function (x) {
          h += '<li class="hlitem hlc-' + x.c + '"><a class="hlgoto" href="' + esc(link(x)) + '"><span class="hlq" dir="auto"><mark class="hlm hl-' + x.c + '">' + esc(textOf(x)) + "</mark></span>" +
            '<span class="hlmeta">' + (x.pt ? esc(T("الجزء ", "Partie ") + x.pt) + " · " : "") + (x.lg === "fr" ? '<span class="hlfr">FR</span> · ' : "") + esc(when(x.t)) + " · " + esc(T("افتح بالدرس ←", "Ouvrir dans la leçon →")) + "</span></a>" +
            '<button type="button" class="hldel" data-id="' + esc(x.id) + '" aria-label="' + esc(T("امحي", "Supprimer")) + '">🗑️</button></li>';
        });
        h += "</ul>";
      });
      h += "</section>";
    });
    app.innerHTML = h;
  }
  /* 🔁 review: one highlight at a time, big, in the shared glass sheet (swipe sideways / buttons) */
  function review() {
    var U = w.NursinUI, L = sorted(mine().filter(function (h) { return !filt || h.c === filt; })); if (!L.length || !U || !U.openSheet) return;
    for (var i = L.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = L[i]; L[i] = L[j]; L[j] = tmp; }
    var at = 0, sh = U.openSheet("hlrevs", T("🔁 راجع تعليماتي", "🔁 Réviser mes surlignages"), '<div class="hlcard" aria-live="polite"></div>', null);
    var box = sh.querySelector(".hlcard");
    function one() {
      var x = L[at];
      box.innerHTML = '<p class="hlwhere">' + esc(subjName(x.sj || "other")) + " › " + esc(lessonName(x)) + "</p>" +
        '<p class="hlbigq" dir="auto"><mark class="hlm hl-' + x.c + '">' + esc(textOf(x)) + "</mark></p>" +
        '<p class="hlnum">' + (at + 1) + " / " + L.length + "</p>" +
        '<div class="hlnav"><button type="button" class="btn" data-r="prev"' + (at ? "" : " disabled") + ">" + esc(T("→ السابق", "← Précédent")) + '</button><a class="btn" href="' + esc(link(x)) + '">' + esc(T("افتح بالدرس", "Ouvrir")) + '</a><button type="button" class="btn pri" data-r="next">' + esc(at < L.length - 1 ? T("التالي ←", "Suivant →") : T("✅ خلصت", "✅ Fini")) + "</button></div>";
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-r]"); if (!b) return;
      if (b.getAttribute("data-r") === "prev" && at > 0) at--; else if (b.getAttribute("data-r") === "next") { if (at >= L.length - 1) { U.close(); return; } at++; }
      one();
    });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 50) return; var fwd = FR() ? dx < 0 : dx > 0; if (fwd && at < L.length - 1) at++; else if (!fwd && at > 0) at--; one(); }, { passive: true });
    one();
  }

  Object.assign(API, { pen: pen, togglePen: togglePen, color: color, headerBtn: headerBtn, apply: apply, all: mine, status: status, flush: flush,
    _mark: mark, _readSel: readSel, _index: index, _offsets: offsets, _rootByKey: rootByKey, _tried: tried, _sel: function () { return lastSel; } });
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
