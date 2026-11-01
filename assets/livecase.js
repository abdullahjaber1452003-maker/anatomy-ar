/* 🔴 «حالة لايف» — ONE shared live ER case for the whole site (Abdullah's own design, Nov 1 2026 11:17 PM → Nov 2 12:27 AM: «حالة تاخد
   معنا كل النهار وأي طالب بيقدر يفوت… إذا خربط بيخسر نقاط و إذا اشتغل صح بيكسب… محطوطة فوق المسار… وبيتم إرسال إشعار» + «يكونو مريضين…
   باسم لكل مريض… إجراء من الصفر تعبئة ملف»). A new case every day (00:00 Beirut), picked from the bank in assets/livecase-data.js;
   two named patients; the procedure from zero (accueil → dossier → soins → surveillance → transmissions); any signed-in student does the
   next step(s): right = + points, wrong = − points with a short why; everyone sees the same patients (Firestore live/{YYYYMMDD}, one
   transaction per step + an append-only log); the patients get worse on their own and better with care (computed from timestamps here,
   so it works even without the worker; the worker v11 cron rotates, records and sends the throttled pushes). Until rules v22 are
   published (or for a signed-out visitor) the same case runs as a preview on this device. This file: the engine + data access + the
   home card. The room itself: assets/livecase-room.js (games.html#live). The solo 🏥 room (assets/erroom.js) is untouched. No ads. */
(function (w, d) {
/* ==live-core== the shared engine of «🔴 حالة لايف» — the same text sits in assets/livecase.js and in the nursin worker v11
   (tests/site.test.js checks they are identical). Pure: no DOM, no Firestore. Everything (done steps, the file, health, vitals,
   deterioration, the end of the case) is DERIVED from the case data + the shared doc live/{YYYYMMDD} { day, c, n, ev{1..n}, pts } + now,
   so every phone and the worker compute the same patients from the same timestamps, with or without the cron. */
var LiveCore = (function () {
  var H = 36e5, DAY = 864e5, C0 = 50, REC = 4, HARM = -15, DRIFT_FROM = 8, MAXEV = 600, SLOW = 0.5;   // SLOW: a neglected patient loses rate×0.5 health points an hour
  var PTS = { ok: 5, urg: 6, file: 3, end: 4, acc: 3, mon: 4, bad: -8, ord: -3, neu: -2, no: -3 };
  var GAIN = { urg: 10, soin: 7, mon: 3, acc: 2, end: 2, file: 0 };
  var LIM = { sys: [30, 230], dia: [15, 140], fc: [25, 220], fr: [4, 50], spo2: [40, 100], t: [34, 41.5], gcs: [3, 15] };
  var FMT = null;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function bOff(ms) {                      // Asia/Beirut offset in minutes at that instant (summer and winter time alike)
    if (!FMT) FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Beirut", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    var p = {}; FMT.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute) - Math.floor(ms / 6e4) * 6e4) / 6e4);
  }
  function dayKey(ms) { var d = new Date(ms + bOff(ms) * 6e4); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function dayStart(key) { var p = String(key).split("-"), u = Date.UTC(+p[0], +p[1] - 1, +p[2]); return u - bOff(u - bOff(u) * 6e4) * 6e4; }
  function nextKey(key) { return dayKey(dayStart(key) + DAY + 3 * H); }
  function docId(key) { return String(key).replace(/-/g, ""); }
  function keyOf(id) { id = String(id || ""); return /^\d{8}$/.test(id) ? id.slice(0, 4) + "-" + id.slice(4, 6) + "-" + id.slice(6) : ""; }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // 🎲 today's case: a fresh random order of the whole bank every cycle (no case twice before all were played, never the same two days in a row)
  function order(D, cyc) {
    var ids = D.cases.map(function (c) { return c.id; }), o = shuffle(ids, rng(hash("lc-cycle-" + cyc)));
    if (cyc > 0 && o.length > 1) { var prev = order(D, cyc - 1); if (o[0] === prev[prev.length - 1]) { var x = o[0]; o[0] = o[1]; o[1] = x; } }
    return o;
  }
  function pick(D, key) {
    var n = D.cases.length, e = String(D.epoch || "2026-11-02").split("-"), k = String(key).split("-");
    var i = Math.round((Date.UTC(+k[0], +k[1] - 1, +k[2]) - Date.UTC(+e[0], +e[1] - 1, +e[2])) / DAY); if (i < 0) i = ((i % n) + n) % n;
    return order(D, Math.floor(i / n))[i % n];
  }
  function caseById(D, id) { for (var i = 0; i < D.cases.length; i++) if (D.cases[i].id === id) return D.cases[i]; return null; }
  var WHY = {
    acc: { ar: "الاستقبال أوّل شي: بتعرّف عن حالك، بتتأكّد من الهوية وبتحطّلو سوار، وبتركّزو منيح بالتخت.", fr: "L'accueil d'abord : se présenter, vérifier l'identité, poser le bracelet, installer le patient." },
    mon: { ar: "Monitorage = تاخد العلامات الحيوية (TA، FC، FR، SpO₂، T°) وتراقبا — بلاها ما فيك تقيّم.", fr: "Monitorage = prendre et surveiller les constantes (TA, FC, FR, SpO₂, T°) — sans elles, pas d'évaluation." }
  };
  // the ordered procedure of one patient: ① accueil ② évaluation + dossier (+ gestes urgents) ③ soins ④ surveillance ⑤ transmissions
  function steps(D, cs, p) {
    var L = [], u = p.urg0 ? 1 : 2, mon = null;
    p.soins.forEach(function (s) { if (s.a === "mon") mon = s; });
    function file(f, ph, after, g, pt) { L.push({ id: "f_" + f, f: f, kind: "file", ph: ph, after: after || [], g: g || 0, pt: pt || PTS.file }); }
    L.push({ id: "acc", a: "acc", kind: "act", ph: 1, after: [], g: GAIN.acc, pt: PTS.acc, why: WHY.acc });
    file("id", 1);
    L.push({ id: "mon", a: "mon", kind: "act", ph: mon && mon.urg ? u : 2, after: [], g: GAIN.mon, pt: PTS.mon, why: mon ? mon.why : WHY.mon });
    file("cst", 2, ["mon"]); file("gcs", 2); file("motif", 2); file("all", 2); file("ant", 2); file("tt", 2); file("hend", 2);
    p.soins.forEach(function (s) { if (s.a === "mon") return; L.push({ id: s.a, a: s.a, kind: "act", ph: s.urg ? u : 3, urg: !!s.urg, after: s.after || [], g: s.urg ? GAIN.urg : GAIN.soin, pt: s.urg ? PTS.urg : PTS.ok, why: s.why }); });
    file("surv", 4, [], GAIN.end, PTS.end); file("tr", 5, [], GAIN.end, PTS.end);
    return L;
  }
  function others(D, f, self) {             // the same field of every other patient of the bank (distractors)
    var out = [], seen = {};
    D.cases.forEach(function (c) { c.pts.forEach(function (q) { var v = q.file[f]; if (q === self || !v || !v.ar) return; var k = v.ar; if (seen[k]) return; seen[k] = 1; out.push(v); }); });
    return out;
  }
  function needSet(D, ns) { return ns.map(function (n) { var x = D.needs[n - 1]; return x.n + ". " + x.fr + " (" + x.ar + ")"; }).join(" + "); }
  // a field of the admission file as a 4-choice question (the same order on every phone): { o: [{ar, fr}], a: index of the right one }
  function opts(D, cs, p, f) {
    var r = rng(hash(cs.id + p.k + f)), ok, wrong = [], i;
    if (f === "id") {
      var sx = function (s) { return s === "m" ? { ar: "ذكر", fr: "M" } : { ar: "أنثى", fr: "F" }; };
      var mk = function (nm, age, s) { return { ar: nm.ar + " · " + age + " سنة · " + sx(s).ar, fr: nm.fr + " · " + age + " ans · " + sx(s).fr }; };
      var o2 = cs.pts[p.k === "a" ? 1 : 0];
      ok = mk(p.nm, p.age, p.sex);
      wrong = [mk(p.nm, p.age + (p.age > 40 ? -7 : 6), p.sex), mk(p.nm, p.age, p.sex === "m" ? "f" : "m"), mk(o2.nm, p.age, p.sex)];
    } else if (f === "gcs") {
      var g = p.vit.gcs, cand = [g - 3, g - 2, g + 2, g + 3, g - 1, g + 1].filter(function (x) { return x >= 3 && x <= 15 && x !== g; });
      ok = { ar: String(g), fr: String(g) }; wrong = shuffle(cand, r).slice(0, 3).map(function (x) { return { ar: String(x), fr: String(x) }; });
    } else if (f === "hend") {
      var key = p.file.hend.slice().sort(function (a, b) { return a - b; }), sets = {}, tries = 0;
      ok = { ar: needSet(D, key), fr: needSet(D, key) }; sets[key.join()] = 1;
      while (wrong.length < 3 && tries++ < 60) {
        var keep = key[Math.floor(r() * 3)], pool = [], j;
        for (j = 1; j <= 14; j++) if (key.indexOf(j) < 0) pool.push(j);
        pool = shuffle(pool, r); var s2 = [keep, pool[0], pool[1]].sort(function (a, b) { return a - b; });
        if (!sets[s2.join()]) { sets[s2.join()] = 1; var t = needSet(D, s2); wrong.push({ ar: t, fr: t }); }
      }
    } else {
      ok = p.file[f]; wrong = shuffle(others(D, f, p).filter(function (v) { return v.ar !== ok.ar && v.fr !== ok.fr; }), r).slice(0, 3);
    }
    var all = shuffle([ok].concat(wrong), r);
    for (i = 0; i < all.length; i++) if (all[i] === ok) break;
    return { o: all, a: i };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function vitals(D, p, c) {                // health 0..100 → the monitor: 50 = as on arrival, 100 = normal, 0 = the worst
    var ok = D.vok, v = {}, t = Math.max(0, Math.min(100, c));
    for (var k in LIM) {
      var a = p.vit[k], n = ok[k], bad = a + 1.5 * (a - n);
      bad = Math.max(LIM[k][0], Math.min(LIM[k][1], bad));
      v[k] = t >= 50 ? lerp(a, n, (t - 50) / 50) : lerp(bad, a, t / 50);
    }
    v.spo2 = Math.min(99, v.spo2); v.gcs = Math.round(v.gcs); return v;
  }
  function bucket(x) { return x.lost != null ? "lost" : x.all ? "ok" : x.c < 25 ? "crit" : x.c < 55 ? "unst" : "impr"; }
  function evList(doc) {
    var ev = (doc && doc.ev) || {}, out = [];
    for (var k in ev) { var e = ev[k]; if (!e) continue; out.push({ i: +k, t: +e.t || 0, u: e.u || "", n: e.n || "", p: e.p === "b" ? "b" : "a", a: String(e.a || ""), k: e.k || "", d: e.d | 0, o: e.o == null ? null : e.o | 0 }); }
    return out.sort(function (a, b) { return a.i - b.i; });
  }
  // the whole derived state at «now» → { key, id, cs, t0, t1, end, P:[patient a, b], ev, pts }
  function state(D, doc, now) {
    doc = doc || {};
    var key = keyOf(doc.day) || dayKey(now), cs = caseById(D, doc.c) || caseById(D, pick(D, key));
    var t0 = dayStart(key), t1 = dayStart(nextKey(key)), tD = t0 + DRIFT_FROM * H, tL = Math.min(now, t1);
    var P = cs.pts.map(function (p) { var L = steps(D, cs, p), by = {}; L.forEach(function (s) { by[s.id] = s; }); return { p: p, k: p.k, L: L, by: by, done: {}, c: C0, lost: null, all: false, soins: false, bad: [], wrong: [], last: null }; });
    var evs = evList(doc), end = null, tp = t0, used = [];
    function upd(x) {
      x.all = x.L.every(function (s) { return !!x.done[s.id]; });
      x.soins = x.L.every(function (s) { return s.ph > 3 || !!x.done[s.id]; });
    }
    function adv(to) {                     // health between two moments; the first patient reaching 0 ends the case right there
      if (to <= tp) return;
      var first = to, who = null;
      P.forEach(function (x) {
        if (x.lost != null || x.soins) return;
        var s = Math.max(tp, tD); if (to <= s) return;
        var tl = s + x.c / (x.p.rate * SLOW) * H; if (tl <= first) { first = tl; who = x; }
      });
      P.forEach(function (x) {
        if (x.lost != null) return;
        if (x.soins) { x.c = Math.min(100, x.c + REC * (first - tp) / H); return; }
        var s = Math.max(tp, tD); if (first > s) x.c = Math.max(0, x.c - x.p.rate * SLOW * (first - s) / H);
      });
      if (who) { who.lost = first; who.c = 0; end = { w: "lost", t: first, pk: who.k }; }
      tp = first;
    }
    for (var i = 0; i < evs.length && !end; i++) {
      var e = evs[i]; if (e.t > tL) break;
      adv(e.t); if (end) break;
      var x = P[e.p === "b" ? 1 : 0]; used.push(e); x.last = e.t;
      if (e.k === "ok") { var s = x.by[e.a]; if (s && !x.done[s.id]) { x.done[s.id] = { t: e.t, u: e.u, n: e.n, i: e.i }; x.c = Math.max(0, Math.min(100, x.c + s.g)); upd(x); } }
      else if (e.k === "bad") { x.bad.push(e); x.c = Math.max(0, x.c + HARM); if (x.c <= 0) { x.lost = e.t; end = { w: "lost", t: e.t, pk: x.k }; } }
      else x.wrong.push(e);
      if (P[0].all && P[1].all) end = { w: "ok", t: e.t };
    }
    if (!end) adv(tL);
    if (!end && now >= t1) end = { w: "time", t: t1 };
    P.forEach(function (x) {
      upd(x); x.st = bucket(x); x.v = vitals(D, x.p, x.c);
      x.n = x.L.filter(function (s) { return !!x.done[s.id]; }).length; x.tot = x.L.length;
      x.next = end ? [] : x.L.filter(function (s) { return avail(x, s); });
      x.ph = x.next.length ? x.next[0].ph : 6;
    });
    return { key: key, id: docId(key), cs: cs, t0: t0, t1: t1, end: end, P: P, ev: used, all: evs, pts: doc.pts || {}, n: doc.n | 0, now: now };
  }
  function avail(x, s) {
    if (x.done[s.id]) return false;
    for (var i = 0; i < s.after.length; i++) if (!x.done[s.after[i]]) return false;
    for (var j = 0; j < x.L.length; j++) if (x.L[j].ph < s.ph && !x.done[x.L[j].id]) return false;
    return true;
  }
  function missing(x, s) {                  // what still has to come before this step (for the «order» why)
    var m = [];
    s.after.forEach(function (a) { if (!x.done[a] && x.by[a]) m.push(x.by[a]); });
    x.L.forEach(function (q) { if (q.ph < s.ph && !x.done[q.id] && m.indexOf(q) < 0) m.push(q); });
    return m;
  }
  // a student tries something on patient pk → { k: ok|bad|ord|neu|no|repeat|over|wait, d: points, a: what is stored, o, s: step, why, miss }
  function check(D, st, pk, a, opt) {
    if (st.end) return { k: "over" };
    var x = st.P[pk === "b" ? 1 : 0], p = x.p, s, b, i;
    if (a.indexOf("f_") === 0) {
      s = x.by[a]; if (!s) return { k: "neu", d: PTS.neu, a: a };
      if (x.done[s.id]) return { k: "repeat", s: s };
      if (!avail(x, s)) return { k: "ord", d: PTS.ord, a: a, s: s, miss: missing(x, s) };
      var q = opts(D, st.cs, p, s.f);
      if ((opt | 0) === q.a) return { k: "ok", d: s.pt, a: a, o: opt | 0, s: s };
      return { k: "no", d: PTS.no, a: a, o: opt | 0, s: s, why: D.fields[s.f].x };
    }
    for (i = 0; i < p.bad.length; i++) { b = p.bad[i]; if (b.a === a) return { k: "bad", d: PTS.bad, a: a, why: b.why }; }
    s = x.by[a];
    if (!s) return { k: "neu", d: PTS.neu, a: a };
    if (x.done[s.id]) return { k: "repeat", s: s };
    if (!avail(x, s)) return { k: "ord", d: PTS.ord, a: a, s: s, miss: missing(x, s) };
    return { k: "ok", d: s.pt, a: a, s: s };
  }
  // the record kept in «📚 الحالات السابقة»: the right order with who did each step, the mistakes, who helped
  function summary(D, st) {
    var board = [];
    for (var u in st.pts) { var r = st.pts[u] || {}; board.push({ u: u, n: r.n || "", p: r.p | 0, ok: r.ok | 0, no: r.no | 0 }); }
    board.sort(function (a, b) { return b.p - a.p || b.ok - a.ok; });
    return {
      id: st.id, key: st.key, c: st.cs.id, end: st.end,
      P: st.P.map(function (x) {
        return { k: x.k, st: x.st, steps: x.L.map(function (s) { return { id: s.id, ph: s.ph, done: x.done[s.id] || null }; }),
          bad: x.bad, wrong: x.wrong };
      }),
      board: board
    };
  }

  /* ---- 🔔 pushes (worker v11 runs these; pure, so the site tests cover them) ---- */
  var RANK = { ok: 0, impr: 1, unst: 2, crit: 3, lost: 4 };
  // the buckets the worker saw last run (prev {a:"unst", b:"crit"}) vs now → [{ p, kind: "down" | "up" | "lost" }] — only real changes
  function changes(prev, st) {
    var out = []; st.P.forEach(function (x) { var p = prev && prev[x.k]; if (!p || p === x.st || RANK[p] == null) return;
      var dd = RANK[x.st] - RANK[p];
      if (x.st === "lost") out.push({ p: x.k, kind: "lost" }); else if (dd > 0 && RANK[x.st] >= 2) out.push({ p: x.k, kind: "down" }); else if (dd < 0 && RANK[x.st] <= 1) out.push({ p: x.k, kind: "up" }); });
    return out;
  }
  // may this student get this push now? his own switch first (users/{uid}.livePush === false → never); «🚨 حالة جديدة» once per case day
  // (not throttled); every other live push at most once an hour (users/{uid}.liveAt, ms)
  function pushOk(u, kind, now, day) { if (!u || u.livePush === false) return false; if (kind === "new") return u.liveDay !== day; return now - (+u.liveAt || 0) >= H; }
  return { RANK: RANK, changes: changes, pushOk: pushOk, H: H, DAY: DAY, PTS: PTS, GAIN: GAIN, C0: C0, MAXEV: MAXEV, DRIFT_FROM: DRIFT_FROM, bOff: bOff, dayKey: dayKey, dayStart: dayStart, nextKey: nextKey, docId: docId, keyOf: keyOf,
    hash: hash, rng: rng, order: order, pick: pick, caseById: caseById, steps: steps, opts: opts, vitals: vitals, bucket: bucket, evList: evList,
    state: state, avail: avail, missing: missing, check: check, summary: summary, WHY: WHY };
})();
/* ==/live-core== */

  if (typeof window !== "undefined") window.LiveCore = LiveCore;
  if (!d || !d.addEventListener) return;
  var V = "20261028t", PK = "nursin_live_prev_v1", HK = "nursin_live_hist_v1", CK = "nursin_live_cool_v1", W = w;
  var D = null, loading = null, doc = null, mode = "loading", unsub = null, subs = [], api = null, tick = 0, why = "";
  function FR() { return !!(W.Lang && W.Lang.fr); }
  function T(o) { return o == null ? "" : typeof o === "string" ? o : (FR() ? (o.fr || o.ar || "") : (o.ar || o.fr || "")); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load() {
    if (D) return Promise.resolve(D);
    if (loading) return loading;
    loading = new Promise(function (res) {
      function done() {
        var X = W.LIVECASE; if (!X) return res(null);
        var E = W.ERROOM || {}, A = {}, I = {}, k;
        for (k in (E.actions || {})) A[k] = E.actions[k]; for (k in X.acts) A[k] = X.acts[k];
        for (k in (E.items || {})) I[k] = E.items[k]; for (k in X.items) I[k] = X.items[k];
        X.A = A; X.I = I; X.S = E.stations || null; D = X; res(D);
      }
      if (W.LIVECASE) return done();
      var s = d.createElement("script"); s.src = "assets/livecase-data.js?v=" + V; s.onload = done; s.onerror = function () { res(null); }; d.head.appendChild(s);
    });
    return loading;
  }
  /* ---- the student (signed in = shared doc; else a preview on this device) ---- */
  function fb() { var A = W.NursinFB; return A && A.user ? A : null; }
  function me() {
    var A = fb(); if (A) { var p = A.profile || {}; return { uid: A.user.uid, name: String(p.name || A.user.displayName || "طالب").slice(0, 39) }; }
    var N = W.Nursin; if (N && N.me) return { uid: "me", name: String(N.me.name || "إنت").slice(0, 39) };
    return { uid: "me", name: FR() ? "Toi" : "إنت" };
  }
  function today() { return LiveCore.dayKey(Date.now()); }
  function prevDoc() {
    var id = LiveCore.docId(today()), p = lsGet(PK);
    if (p && p.day !== id) { var h = lsGet(HK) || []; if (p.n > 0 && !h.some(function (x) { return x.id === p.day; })) { h.unshift({ id: p.day, doc: p }); lsSet(HK, h.slice(0, 14)); } p = null; }
    if (!p) { p = { day: id, c: LiveCore.pick(D, today()), n: 0, ev: {}, pts: {} }; }
    return p;
  }
  function conv(snapData) {        // Firestore → plain numbers (timestamps in ms)
    var x = snapData || {}, o = { day: x.day, c: x.c, n: x.n | 0, ev: {}, pts: {} };
    var ms = function (t) { return t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +t || Date.now(); };
    for (var k in (x.ev || {})) { var e = x.ev[k]; if (e) o.ev[k] = { t: ms(e.t), u: e.u, n: e.n, p: e.p, a: e.a, k: e.k, d: e.d, o: e.o }; }
    for (var u in (x.pts || {})) { var r = x.pts[u] || {}; o.pts[u] = { n: r.n, p: r.p | 0, ok: r.ok | 0, no: r.no | 0, t: ms(r.t) }; }
    return o;
  }
  function emit() { var st = state(); subs.forEach(function (f) { try { f(st, mode); } catch (e) { console.warn("live", e); } }); }
  function state() { if (!D) return null; return LiveCore.state(D, doc || { day: LiveCore.docId(today()), c: LiveCore.pick(D, today()) }, Date.now()); }
  function setMode(m, wy) { mode = m; why = wy || ""; }
  function goPreview(wy) { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } setMode("preview", wy); doc = prevDoc(); emit(); }
  var authWait = 0;
  function connect() {
    if (!D) return;
    var A = fb();
    if (!A) {
      var N = W.Nursin, maybe = (N && N.me) || W.NursinFB;
      if (maybe && authWait < 1) { authWait++; setMode("loading"); doc = null; emit(); setTimeout(function () { if (!fb()) goPreview("out"); }, 6500); return; }
      return goPreview("out");
    }
    if (unsub && api === A) return;
    api = A; var id = LiveCore.docId(today()), fs = A.fs;
    try {
      if (unsub) unsub();
      unsub = fs.onSnapshot(fs.doc(A.db, "live", id), function (s) {
        if (s.exists()) doc = conv(s.data({ serverTimestamps: "estimate" })); else doc = { day: id, c: LiveCore.pick(D, today()), n: 0, ev: {}, pts: {} };
        setMode("shared"); emit();
      }, function (e) { console.warn("nursin live:", e && e.code); goPreview(e && e.code === "permission-denied" ? "rules" : "net"); });
    } catch (e) { goPreview("net"); }
  }
  function start(cb) {
    if (cb) subs.push(cb);
    return load().then(function (X) {
      if (!X) { setMode("error"); emit(); return null; }
      if (mode === "loading" || mode === "error") connect(); else emit();
      if (!tick) tick = setInterval(function () {
        if (doc && doc.day !== LiveCore.docId(today())) { if (mode === "shared") { if (unsub) { unsub(); unsub = null; } api = null; connect(); } else doc = prevDoc(); }
        emit();
      }, 30000);
      return X;
    });
  }
  function off(cb) { subs = subs.filter(function (f) { return f !== cb; }); }
  d.addEventListener("nursin:auth", function () { if (D && (mode === "preview" || mode === "loading")) { if (fb()) connect(); else if (mode === "loading") goPreview("out"); } });
  /* ---- 🧊 a student who got a field wrong waits 3 min before trying THAT field again (no brute force) ---- */
  function cool(pk, a) { var c = lsGet(CK) || {}, k = today() + pk + a, t = c[k] | 0; return t > Date.now() ? t : 0; }
  function setCool(pk, a) { var c = lsGet(CK) || {}, t = today(); for (var k in c) if (k.indexOf(t) !== 0) delete c[k]; c[t + pk + a] = Date.now() + 18e4; lsSet(CK, c); }
  var busy = false;
  // one step by this student on patient pk → { k, d, why, s, ... } (the transaction refuses a step someone else did a second earlier)
  function act(pk, a, opt, again) {
    if (!D || busy) return Promise.resolve({ k: "busy" });
    if (a.indexOf("f_") === 0) { var cl = cool(pk, a); if (cl) return Promise.resolve({ k: "wait", until: cl }); }
    var M = me(), WR = { ok: 1, bad: 1, ord: 1, neu: 1, no: 1 };
    function after(r) { busy = false; if (r.k === "no") setCool(pk, a); if (r.k === "ok" && mode === "shared" && W.NursinStudy && W.NursinStudy.activity) try { W.NursinStudy.activity("game", r.d, "🔴 حالة لايف"); } catch (e) {} return r; }
    busy = true;
    if (mode !== "shared") {
      var st = LiveCore.state(D, doc, Date.now()), r = LiveCore.check(D, st, pk, a, opt);
      if (WR[r.k]) {
        if (doc.n >= LiveCore.MAXEV) { busy = false; return Promise.resolve({ k: "full" }); }
        doc.n++; var e = { t: Date.now(), u: M.uid, n: M.name, p: pk, a: r.a, k: r.k, d: r.d }; if (r.o != null) e.o = r.o; doc.ev[doc.n] = e;
        var pr = doc.pts[M.uid] || { n: M.name, p: 0, ok: 0, no: 0 }; doc.pts[M.uid] = { n: M.name, p: pr.p + r.d, ok: pr.ok + (r.k === "ok" ? 1 : 0), no: pr.no + (r.k === "ok" ? 0 : 1), t: Date.now() };
        lsSet(PK, doc); emit();
      }
      return Promise.resolve(after(r));
    }
    var A = api, fs = A.fs, id = LiveCore.docId(today()), ref = fs.doc(A.db, "live", id), res = null;
    var mk = function () { return fs.setDoc(ref, { day: id, c: (doc && doc.c) || LiveCore.pick(D, today()), n: 0, ev: {}, pts: {}, at0: fs.serverTimestamp() }).catch(function () {}); };
    return (doc && doc.n ? Promise.resolve() : fs.getDoc(ref).then(function (s) { if (!s.exists()) return mk(); }, function () {})).then(function () {
      return fs.runTransaction(A.db, function (tx) {
        return tx.get(ref).then(function (s) {
          if (!s.exists()) { res = { k: "retry" }; return; }
          var cur = conv(s.data()), st = LiveCore.state(D, cur, Date.now()), r = LiveCore.check(D, st, pk, a, opt); res = r;
          if (!WR[r.k]) return;
          if (cur.n >= LiveCore.MAXEV) { res = { k: "full" }; return; }
          var prev = (s.data().pts || {})[M.uid];
          if (prev && prev.t && prev.t.toMillis && Date.now() - prev.t.toMillis() < 2500) { res = { k: "slow" }; return; }
          var n = cur.n + 1, e = { t: fs.serverTimestamp(), u: M.uid, n: M.name, p: pk, a: r.a, k: r.k, d: r.d }, pr = cur.pts[M.uid] || { p: 0, ok: 0, no: 0 }, up = { n: n };
          if (r.o != null) e.o = r.o;
          up["ev." + n] = e; up["pts." + M.uid] = { n: M.name, p: pr.p + r.d, ok: pr.ok + (r.k === "ok" ? 1 : 0), no: pr.no + (r.k === "ok" ? 0 : 1), t: fs.serverTimestamp() };
          tx.update(ref, up); tx.set(fs.doc(A.db, "live", id, "log", String(n)), e);
        });
      });
    }).then(function () { return after(res || { k: "err" }); }, function (e) {
      busy = false; console.warn("nursin live act", e && e.code);
      if (e && e.code === "permission-denied") {        // a lost race / the 2 s rule (the doc still reads) → once more on fresh data; rules not published → preview
        return fs.getDoc(ref).then(function () { return again ? { k: "slow" } : new Promise(function (r) { setTimeout(r, 2600); }).then(function () { return act(pk, a, opt, 1); }); },
          function () { goPreview("rules"); return { k: "rules" }; });
      }
      return { k: "err", code: e && e.code };
    });
  }
  /* ---- 🔔 the student's own switch for the live-case notifications (users/{uid}.livePush; the worker reads it) ---- */
  function pushOn() { var A = fb(); var p = A && A.profile; return !(p && p.livePush === false); }
  function setPush(on) { var A = fb(); if (!A) return Promise.resolve(false); try { if (A.profile) A.profile.livePush = !!on; } catch (e) {} return A.fs.updateDoc(A.fs.doc(A.db, "users", A.user.uid), { livePush: !!on }).then(function () { return true; }, function () { return false; }); }
  /* ---- 📚 the past cases (shared docs of the last days; on this device the preview days) ---- */
  function archive() {
    return load().then(function () {
      var tid = LiveCore.docId(today()), loc = (lsGet(HK) || []).filter(function (x) { return x.id < tid; });
      var A = fb(); if (!A || mode !== "shared") return { src: "local", list: loc };
      var fs = A.fs;
      return fs.getDocs(fs.query(fs.collection(A.db, "live"), fs.orderBy("day", "desc"), fs.limit(30))).then(function (q) {
        var out = []; q.forEach(function (s) { if (s.id < tid) out.push({ id: s.id, doc: conv(s.data()) }); });
        return { src: "shared", list: out };
      }, function () { return { src: "local", list: loc }; });
    });
  }
  /* ---- words ---- */
  var STS = { lost: { ic: "💔", ar: "خسرناه", fr: "Décédé" }, ok: { ic: "✅", ar: "مستقرّ", fr: "Stable" }, crit: { ic: "🔴", ar: "حرج", fr: "Critique" }, unst: { ic: "🟠", ar: "مش مستقرّ", fr: "Instable" }, impr: { ic: "🟡", ar: "عم يتحسّن", fr: "S'améliore" } };
  function stLabel(k) { var s = STS[k] || STS.unst; return s.ic + " " + T(s); }
  function left(ms) { ms = Math.max(0, ms); var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h ? (FR() ? h + " h " + (m < 10 ? "0" : "") + m : h + ":" + (m < 10 ? "0" : "") + m) : (FR() ? m + " min" : m + " د"); }
  function leftWords(ms) { var h = Math.floor(Math.max(0, ms) / 36e5); return h >= 1 ? (FR() ? "encore " + h + " h" : "باقي " + h + (h === 1 ? " ساعة" : h === 2 ? " ساعتين" : h <= 10 ? " ساعات" : " ساعة")) : (FR() ? "encore " + Math.ceil(ms / 6e4) + " min" : "باقي " + Math.ceil(ms / 6e4) + " د"); }
  function stepName(s) {
    if (!s) return "";
    if (s.kind === "file") { var F = D.fields[s.f]; return F.ic + " " + T(F); }
    var A = D.A[s.a]; return A ? A.ic + " " + T(A) : s.a;
  }
  function actName(a) { if (String(a).indexOf("f_") === 0) { var F = D.fields[a.slice(2)]; return F ? F.ic + " " + T(F) : a; } var A = D.A[a]; return A ? A.ic + " " + T(A) : a; }
  /* ---- 🏠 the home card «🔴 حالة لايف · باقي X ساعات», right ABOVE «🧭 مسار اليوم» (Abdullah's wish) ---- */
  function homeCard(st) {
    var box = d.querySelector("#hz .hzlivew"); if (!box || !st) return;
    var cs = st.cs, ended = st.end, nm = function (x) { return T(x.p.nm).split(" ")[0]; };
    var pills = st.P.map(function (x) { return '<span class="hzlvp ' + x.st + '"><b>🛏️ ' + esc(nm(x)) + "</b> " + esc(stLabel(x.st)) + "</span>"; }).join("");
    var top = ended ? (ended.w === "ok" ? (FR() ? "✅ Cas réussi — prochain cas demain" : "✅ نجحت الحالة — بكرا حالة جديدة") : ended.w === "lost" ? (FR() ? "💔 Cas terminé — revois les bonnes étapes" : "💔 خلصت الحالة — شوف الخطوات الصح") : (FR() ? "⏰ Temps écoulé" : "⏰ خلص الوقت"))
      : leftWords(st.t1 - Date.now());
    var soon = mode === "preview" && why === "rules" ? '<small class="hzlvs">' + (FR() ? "🔴 Le cas partagé arrive bientôt — essaie-le maintenant" : "🔴 الحالة اللايف رح تشتغل قريباً — جرّبها هلّق") + "</small>" : "";
    var h = '<a class="hzlive' + (ended ? " end" : "") + '" href="games.html#live" data-nofr>' +
      '<span class="hzlvh"><b>' + (FR() ? "🔴 Cas en direct" : "🔴 حالة لايف") + "</b><span class=\"hzlvt\"> · " + esc(top) + "</span></span>" +
      '<span class="hzlvc">' + esc(cs.ic + " " + T(cs.t)) + "</span>" + '<span class="hzlvps">' + pills + "</span>" + soon +
      '<span class="hzlvgo">' + (ended ? (FR() ? "📋 Voir les bonnes étapes ←" : "📋 شوف الخطوات الصح ←") : (FR() ? "🏥 Entre et soigne ←" : "🏥 فوت ساعد ←")) + "</span></a>";
    if (box.innerHTML !== h) box.innerHTML = h;
  }
  function homeInit() {
    var tries = 0;
    (function wait() {
      var box = d.querySelector("#hz .hzlivew");
      if (!box) { if (tries++ < 40) setTimeout(wait, 250); return; }
      var go = function () { start(function (st) { homeCard(st); }); };
      if (W.requestIdleCallback) W.requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 600);
    })();
  }
  W.LiveCase = { load: load, start: start, off: off, act: act, state: state, mode: function () { return mode; }, why: function () { return why; }, me: me, D: function () { return D; },
    archive: archive, pushOn: pushOn, setPush: setPush, stLabel: stLabel, left: left, leftWords: leftWords, stepName: stepName, actName: actName, T: T, esc: esc, FR: FR, homeCard: homeCard,
    cool: cool, PK: PK, HK: HK, preview: goPreview };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { if (d.getElementById("hz")) homeInit(); }); else if (d.getElementById("hz")) homeInit();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
