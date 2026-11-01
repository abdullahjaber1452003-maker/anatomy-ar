/* 🏥 غرفة الطوارئ — امشِ لعند المريض (Abdullah, Nov 1 2026 9:58 PM: «برأيك قادرين شوي نطور من لعبة الانعاش مثلا إذا فينا نخلي الممرض
   يقدر يمشي لعند المريض» → 9:59 PM «اوك بلش»). A walkable top-down emergency room on one <canvas> (vanilla JS, no library, no image files:
   everything is drawn with canvas shapes): tap anywhere → the nurse walks there around the furniture (grid A* + line-of-sight smoothing);
   tap a piece of furniture → she walks to it and its menu opens: pick 1–2 items (🛒 عربة الطوارئ, 🟢 O₂, 🖥️ المونيتور, ⚡ défibrillateur,
   💊 خزانة الأدوية), 🚰 wash hands, 📞 call the doctor; at the patient's bed a short menu of actions (positions, evaluate, airway, CPR, and
   whatever she is holding). The ORDER counts (each step's «after»), harmful actions cost points with a one-line why, the monitor reacts live.
   Cases + content: assets/erroom-data.js (only his lessons; anything else labelled 🌐 معلومات عامة).
   End screen: score /100, time, ⭐⭐⭐, the ideal order with ✅ / ⚠️ / ❌, the mistakes with their why, a line from الأستاذ عثمان,
   points through the shared NursinStudy.activity("game") (≤ 20 a round, the day's game cap, counts the 🎮 goal), best per case in
   localStorage nursin_erroom_v1 and on the signed-in profile users/{uid}.erRoom (merge of one field, like hwDone — no rules change).
   The old 🚑 «ناوبة بالطوارئ» modes stay on games.html. No ads anywhere in here. window.ERRoom = pure engine (tested in node) + open(). */
(function (w, d) {
  var E = w.ERROOM; if (!E) return;
  var KEY = "nursin_erroom_v1", ROUND_MAX = 20, SPEED = 165;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(o) { return o == null ? "" : typeof o === "string" ? o : (FR() ? (o.fr || o.ar || "") : (o.ar || o.fr || "")); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function caseById(id) { for (var i = 0; i < E.cases.length; i++) if (E.cases[i].id === id) return E.cases[i]; return null; }
  function ids(s) { return [].concat(s.a); }
  function sid(s) { return ids(s)[0]; }
  function stepOf(c, a) { for (var i = 0; i < c.steps.length; i++) if (ids(c.steps[i]).indexOf(a) > -1) return c.steps[i]; return null; }
  function badOf(c, a) { for (var i = 0; i < (c.bad || []).length; i++) if ([].concat(c.bad[i].a).indexOf(a) > -1) return c.bad[i]; return null; }
  function keys(c) { return c.steps.filter(function (s) { return s.key; }); }
  var LIM = { sys: [0, 230], dia: [0, 140], fc: [0, 220], fr: [0, 50], spo2: [0, 100], t: [34, 42], gcs: [3, 15] };
  function clampV(o) { for (var k in LIM) if (o[k] != null) o[k] = Math.max(LIM[k][0], Math.min(LIM[k][1], o[k])); if (o.spo2 > 99) o.spo2 = 99; return o; }

  /* ---- the case engine (pure) ---- */
  function create(id) {
    var c = caseById(id); if (!c) return null;
    var st = { id: id, c: c, t: 0, v: copy(c.vit), tg: copy(c.vit), done: {}, seq: [], late: {}, inv: [], log: [], pen: [], bonus: [], hints: 0,
      end: null, lowFor: 0, rh: c.rh || "sinus", mon: !!c.monOn, washed: false, touched: false, q: {} };
    (c.pre || []).forEach(function (a) { st.done[a] = -1; });
    return st;
  }
  function eff(st, e) { if (!e) return; for (var k in e) if (k !== "rh" && st.tg[k] != null) st.tg[k] += e[k]; clampV(st.tg); }
  function set(st, e) { if (!e) return; for (var k in e) { if (k === "rh") st.rh = e[k]; else st.tg[k] = e[k]; } clampV(st.tg); }
  function use(st, item) { var it = item && E.items[item], i = st.inv.indexOf(item); if (it && !it.keep && i > -1) st.inv.splice(i, 1); }
  function lg(st, k, a, why, p) { st.log.push({ t: st.t, k: k, a: a, why: why || null, p: p || 0 }); }
  var MSG = {
    need: { ar: "بدّك تجيب {i} أوّل — من {s}", fr: "Il te faut d'abord {i} — à prendre : {s}" },
    needDone: { ar: "حطّ VVP (خط وريدي) أوّل 💉", fr: "Pose d'abord une VVP 💉" },
    rx: { ar: "هيدا دوا بدّو وصفة: اتصل بالطبيب أوّل 📞", fr: "Médicament sur prescription : appelle d'abord le médecin 📞" },
    repeat: { ar: "عملتها من قبل ✔️", fr: "Déjà fait ✔️" },
    neutral: { ar: "مش هيدا يلّي بيحتاجو هلّق — فكّر بالـ ABC.", fr: "Ce n'est pas ce dont il a besoin maintenant — pense ABC." },
    order: { ar: "الترتيب: قبلها كان لازم {p}.", fr: "L'ordre : avant, il fallait {p}." },
    washOk: { ar: "🧼 إيدين نضاف قبل ما تلمس المريض — برافو (+5)", fr: "🧼 Mains propres avant de toucher le patient — bravo (+5)" },
    washLate: { ar: "🧼 منيح، بس الأحسن تغسل قبل ما تلمس المريض.", fr: "🧼 Bien, mais mieux avant de toucher le patient." }
  };
  function fill(o, r) { var s = T(o); for (var k in r) s = s.split("{" + k + "}").join(r[k]); return s; }
  function aName(a) { var A = E.actions[a]; return A ? A.ic + " " + T(A) : a; }
  function act(st, a) {
    if (!st || st.end) return { kind: "over" };
    var A = E.actions[a], c = st.c; if (!A) return { kind: "none" };
    if (A.need && st.inv.indexOf(A.need) < 0) { var I = E.items[A.need], S = E.stations[I.st]; return { kind: "blocked", why: fill(MSG.need, { i: I.ic + " " + T(I), s: S.ic + " " + T(S) }) }; }
    if (A.needDone && st.done[A.needDone] == null) return { kind: "blocked", why: T(MSG.needDone) };
    var it = A.need && E.items[A.need];
    if (it && it.rx && st.done.call == null && !badOf(c, a)) return { kind: "blocked", why: T(MSG.rx) };
    if (a === "wash") {
      if (st.washed) return { kind: "repeat", why: T(MSG.repeat) };
      st.washed = true;
      if (!st.touched) { st.bonus.push({ k: "wash", p: 5 }); lg(st, "good", a, MSG.washOk, 5); return { kind: "good", why: T(MSG.washOk), pts: 5 }; }
      lg(st, "neutral", a, MSG.washLate); return { kind: "neutral", why: T(MSG.washLate) };
    }
    if (A.at === "bed") st.touched = true;
    var b = badOf(c, a); if (b && b.unless && st.done[b.unless] != null) b = null;
    if (b) { use(st, A.need); eff(st, b.eff); st.pen.push({ k: "bad", a: a, why: b.why, p: 10 }); lg(st, "bad", a, b.why, -10); return { kind: "bad", why: T(b.why), pts: -10 }; }
    var s = stepOf(c, a);
    if (s) {
      var id = sid(s);
      if (st.done[id] != null) return { kind: "repeat", why: T(MSG.repeat) };
      var miss = (s.after || []).filter(function (p) { return st.done[p] == null; });
      st.done[id] = st.t; st.seq.push(id); use(st, A.need); eff(st, s.eff); set(st, s.set);
      if (a === "mon") st.mon = true;
      var r = { kind: "good", why: T(s.why), step: id, key: !!s.key };
      if (miss.length) { st.late[id] = 1; var ow = s.ow ? T(s.ow) : fill(MSG.order, { p: miss.map(aName).join(" + ") }); st.pen.push({ k: "order", a: a, why: s.ow || { ar: ow, fr: ow }, p: 5 }); r.kind = "order"; r.ow = ow; r.pts = -5; lg(st, "order", a, s.ow, -5); }
      else lg(st, "good", a, s.why, 0);
      if (a === "call" && c.doc) r.doc = T(c.doc);
      if (s.q && st.q[id] == null) r.q = s.q;
      if (allKeys(st)) st.end = "ok";
      return r;
    }
    var nw = (c.neutral || {})[a] || MSG.neutral; lg(st, "neutral", a, nw);
    return { kind: "neutral", why: T(nw) };
  }
  function allKeys(st) { return keys(st.c).every(function (s) { return st.done[sid(s)] != null; }); }
  function answer(st, id, i) {
    var s = stepOf(st.c, id); if (!s || !s.q || st.q[id] != null) return null;
    st.q[id] = i; var ok = i === s.q.a;
    if (ok) st.bonus.push({ k: "q", a: id, p: 5 }); else st.pen.push({ k: "q", a: id, why: s.q.x, p: 5 });
    return { ok: ok, x: T(s.q.x), pts: ok ? 5 : -5 };
  }
  function tick(st, dt) {
    if (!st || st.end) return st;
    var c = st.c, K = keys(c), dn = K.filter(function (s) { return st.done[sid(s)] != null; }).length, m = Math.max(0, 1 - 1.2 * dn / K.length);
    st.t += dt;
    for (var k in (c.drift || {})) if (st.tg[k] != null) st.tg[k] += c.drift[k] * dt / 10 * m;
    clampV(st.tg);
    var f = Math.min(1, dt * 1.3);
    for (var j in st.v) if (st.tg[j] != null) st.v[j] += (st.tg[j] - st.v[j]) * f;
    if (c.cprBy) { if (st.done.cpr == null && st.t > c.cprBy) st.end = "lost"; }
    else { if (st.v.sys <= 50 || st.v.spo2 <= 70) st.lowFor += dt; else st.lowFor = 0; if (st.lowFor >= 4) st.end = "lost"; }
    if (!st.end && st.t >= c.limit) st.end = "timeout";
    return st;
  }
  function score(st) {
    var c = st.c, K = keys(c), kd = K.filter(function (s) { return st.done[sid(s)] != null; }).length;
    var opt = c.steps.filter(function (s) { return !s.key && st.done[sid(s)] != null && st.done[sid(s)] >= 0; }).length * 3;
    var bon = st.bonus.reduce(function (n, b) { return n + b.p; }, 0), pen = st.pen.reduce(function (n, p) { return n + p.p; }, 0);
    var tb = st.end === "ok" ? 25 * Math.max(0, 1 - st.t / c.limit) : 0;
    return Math.max(0, Math.min(100, Math.round(70 * kd / K.length + opt + bon - pen + tb)));
  }
  function stars(st) {
    var s = score(st);
    if (st.end === "ok") return s >= 85 && !st.pen.some(function (p) { return p.k === "bad"; }) ? 3 : s >= 65 ? 2 : 1;   // ⭐⭐⭐ = no harmful action
    if (st.end === "timeout") return s >= 55 ? 2 : s >= 25 ? 1 : 0;
    return s >= 40 ? 1 : 0;
  }
  // the ideal order with what happened to each step: ok (done, in order) · late (done, order broken) · miss
  function summary(st) {
    return st.c.steps.map(function (s) { var id = sid(s), dn = st.done[id] != null; return { a: id, alts: ids(s), key: !!s.key, st: !dn ? "miss" : st.late[id] ? "late" : "ok", pre: st.done[id] === -1, why: s.why, ow: s.ow }; });
  }
  function hint(st) {
    var c = st.c, cand = null;
    for (var i = 0; i < c.steps.length && !cand; i++) { var s = c.steps[i], id = sid(s); if (st.done[id] != null || !s.key) continue; if ((s.after || []).every(function (p) { return st.done[p] != null; })) cand = s; }
    if (!cand) return null;
    st.hints++; st.pen.push({ k: "hint", a: sid(cand), p: 3 });
    var A = E.actions[sid(cand)], I = A.need ? E.items[A.need] : null;
    return { a: sid(cand), item: A.need || null, st: I ? I.st : A.at === "bed" ? "bed1" : A.at, rx: !!(I && I.rx && st.done.call == null) };
  }
  function pick(st, item) { if (st.inv.indexOf(item) > -1) return "have"; if (st.inv.length >= 2) return "full"; st.inv.push(item); return "ok"; }
  function drop(st, item) { var i = st.inv.indexOf(item); if (i > -1) st.inv.splice(i, 1); }
  function points(sc) { return Math.min(ROUND_MAX, Math.round((sc | 0) / 5)); }

  /* ---- walking: a grid over the room (cell 8 units), furniture inflated by the nurse's radius, A* + line-of-sight smoothing ---- */
  function grid(cell) {
    cell = cell || 8; var W = E.W, H = E.H, R = E.R, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), b = new Uint8Array(cols * rows), m = 12 + R;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var x = (i + 0.5) * cell, y = (j + 0.5) * cell, bl = x < m || x > W - m || y < m || y > H - m;
      for (var k in E.stations) { if (bl) break; var s = E.stations[k]; if (x > s.x - R - 1 && x < s.x + s.w + R + 1 && y > s.y - R - 1 && y < s.y + s.h + R + 1) bl = true; }
      b[j * cols + i] = bl ? 1 : 0;
    }
    return { cell: cell, cols: cols, rows: rows, b: b };
  }
  function freeAt(G, x, y) { var i = Math.floor(x / G.cell), j = Math.floor(y / G.cell); return i >= 0 && j >= 0 && i < G.cols && j < G.rows && !G.b[j * G.cols + i]; }
  function los(G, a, b) { var dx = b.x - a.x, dy = b.y - a.y, n = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 3); for (var k = 0; k <= n; k++) { var t = n ? k / n : 0; if (!freeAt(G, a.x + dx * t, a.y + dy * t)) return false; } return true; }
  function nearestFree(G, x, y) {
    if (freeAt(G, x, y)) return { x: x, y: y };
    var ci = Math.floor(x / G.cell), cj = Math.floor(y / G.cell);
    for (var r = 1; r < 40; r++) { var best = null, bd = 1e9;
      for (var j = cj - r; j <= cj + r; j++) for (var i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || i < 0 || j < 0 || i >= G.cols || j >= G.rows || G.b[j * G.cols + i]) continue;
        var px = (i + 0.5) * G.cell, py = (j + 0.5) * G.cell, dd = (px - x) * (px - x) + (py - y) * (py - y); if (dd < bd) { bd = dd; best = { x: px, y: py }; } }
      if (best) return best; }
    return { x: x, y: y };
  }
  function path(G, from, to) {
    to = nearestFree(G, to.x, to.y); from = nearestFree(G, from.x, from.y);
    if (los(G, from, to)) return [to];
    var C = G.cols, N = C * G.rows, s = Math.floor(from.y / G.cell) * C + Math.floor(from.x / G.cell), e = Math.floor(to.y / G.cell) * C + Math.floor(to.x / G.cell);
    var g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
    function h(n) { var dx = Math.abs(n % C - e % C), dy = Math.abs(Math.floor(n / C) - Math.floor(e / C)); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); }
    function push(n, f) { heap.push([f, n]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; }
    g[s] = 0; push(s, h(s));
    var NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]], found = false;
    while (heap.length) {
      var cur = pop()[1]; if (closed[cur]) continue; closed[cur] = 1; if (cur === e) { found = true; break; }
      var ci = cur % C, cj = Math.floor(cur / C);
      for (var k = 0; k < 8; k++) {
        var ni = ci + NB[k][0], nj = cj + NB[k][1]; if (ni < 0 || nj < 0 || ni >= C || nj >= G.rows) continue;
        var n = nj * C + ni; if (G.b[n] || closed[n]) continue;
        if (NB[k][0] && NB[k][1] && (G.b[cj * C + ni] || G.b[nj * C + ci])) continue;   // no corner cutting
        var ng = g[cur] + NB[k][2]; if (ng < g[n]) { g[n] = ng; came[n] = cur; push(n, ng + h(n)); }
      }
    }
    if (!found) return [];
    var cells = []; for (var c = e; c !== -1 && c !== s; c = came[c]) cells.push({ x: (c % C + 0.5) * G.cell, y: (Math.floor(c / C) + 0.5) * G.cell });
    cells.reverse(); cells[cells.length - 1] = to;
    var out = [], anchor = from, i2 = 0;
    while (i2 < cells.length) { var far = i2; for (var q = cells.length - 1; q > i2; q--) if (los(G, anchor, cells[q])) { far = q; break; } out.push(cells[far]); anchor = cells[far]; i2 = far + 1; }
    return out;
  }
  function walk(pos, pts, dt, speed) {
    var rem = (speed || SPEED) * dt, x = pos.x, y = pos.y, dir = pos.dir || 0;
    while (rem > 0 && pts.length) { var p = pts[0], dx = p.x - x, dy = p.y - y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > 0.01) dir = Math.atan2(dy, dx);
      if (dd <= rem) { x = p.x; y = p.y; rem -= dd; pts.shift(); } else { x += dx / dd * rem; y += dy / dd * rem; rem = 0; } }
    return { x: x, y: y, dir: dir, done: !pts.length };
  }
  function hitStation(x, y, pad) { pad = pad == null ? 8 : pad; var best = null; for (var k in E.stations) { var s = E.stations[k]; if (x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad) best = k; } return best; }

  /* ---- best per case: this device + the signed-in profile (users/{uid}.erRoom, one merged field) ---- */
  function store() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && typeof o === "object" && o.best ? o : { best: {} }; } catch (e) { return { best: {} }; } }
  function saveStore(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function bestOf(id) { var b = store().best[id]; return b ? b : null; }
  function record(id, sc, st3, t) { var o = store(), b = o.best[id], nw = !b || sc > (b.s | 0); if (nw) { o.best[id] = { s: sc, st: st3, t: Math.round(t), at: Date.now() }; saveStore(o); push(); } return nw; }
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() { clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; var m = {}, b = store().best; for (var k in b) m[k] = b[k].s | 0; try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { erRoom: m }, { merge: true }).catch(function () {}); } catch (e) {} }, 1500); }
  function mergeRemote(r) { if (!r || typeof r !== "object") return false; var o = store(), ch = false; for (var k in r) { if (!caseById(k)) continue; var v = +r[k] | 0; if (v > 0 && v <= 100 && (!o.best[k] || (o.best[k].s | 0) < v)) { o.best[k] = { s: v, st: 0, t: 0, at: Date.now(), cloud: 1 }; ch = true; } } if (ch) saveStore(o); return ch; }
  function pull() { var A = fbA(); if (!A) return; try { A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) { if (s.exists() && mergeRemote(s.data().erRoom)) paintCards(); }, function () {}); } catch (e) {} }

  var core = { create: create, act: act, tick: tick, answer: answer, score: score, stars: stars, summary: summary, hint: hint, pick: pick, drop: drop, points: points,
    grid: grid, path: path, walk: walk, freeAt: freeAt, nearestFree: nearestFree, hitStation: hitStation, keys: keys, stepOf: stepOf, caseById: caseById,
    store: store, record: record, bestOf: bestOf, mergeRemote: mergeRemote, KEY: KEY, SPEED: SPEED, T: T };
  w.ERRoom = core;
  function paintCards() { if (w.ERRoom.paint) w.ERRoom.paint(); }
  if (!d || !d.addEventListener) return;

  /* ======================= UI ======================= */
  var U = {
    title: { ar: "🏥 غرفة الطوارئ", fr: "🏥 Salle d'urgence" },
    pickH: { ar: "اختار الحالة 🚑", fr: "Choisis le cas 🚑" },
    pickP: { ar: "إنت الممرّض/ة. كبّس بأي محل والممرّض بيمشي لهونيك. كبّس عالعربة أو الخزانة لتاخد غرض (بتقدر تحمل ٢)، وارجع عالتخت 1 لتعمل الخطوة. الترتيب مهم: A (مجرى الهوا) ← B (التنفّس) ← C (الدورة الدموية).", fr: "Tu es l'infirmier·e. Touche n'importe où, il marche jusque-là. Touche le chariot ou l'armoire pour prendre un objet (2 max), puis reviens au lit 1 pour agir. L'ordre compte : A (voies aériennes) → B (respiration) → C (circulation)." },
    best: { ar: "أحسن نتيجة", fr: "Meilleur score" }, none: { ar: "لسّا ما لعبتها", fr: "Pas encore joué" },
    gen: { ar: "🌐 معلومات عامة", fr: "🌐 Notions générales" }, mine: { ar: "📘 من دروسك", fr: "📘 De tes cours" },
    old: { ar: "🚑 الأوضاع القديمة: «الحالة قصّة» و«⚡ أسئلة سريعة» ←", fr: "🚑 Anciens modes : « cas-histoire » et « ⚡ questions rapides » →" },
    go: { ar: "🚑 يلّا! بلّش", fr: "🚑 C'est parti !" }, card: { ar: "📋 الحالة", fr: "📋 Le cas" }, hint: { ar: "💡 مساعدة (−3)", fr: "💡 Aide (−3)" },
    who: { ar: "👤 المريض", fr: "👤 Patient" }, sx: { ar: "🩺 العوارض", fr: "🩺 Signes" }, vit: { ar: "📟 العلامات الحيوية عالوصول", fr: "📟 Constantes à l'arrivée" }, lab: { ar: "🧪 تحاليل", fr: "🧪 Examens" },
    time: { ar: "⏱ عندك", fr: "⏱ Tu as" }, min: { ar: "دقايق", fr: "min" },
    inv: { ar: "✋ إيديك", fr: "✋ Mains" }, empty: { ar: "فاضي", fr: "vide" }, drop: { ar: "رجّعتو", fr: "Reposé" },
    take: { ar: "خود", fr: "Prendre" }, have: { ar: "✋ معك", fr: "✋ En main" }, full: { ar: "إيديك مليانين (٢) — كبّس على غرض تحت لترجّعو", fr: "Mains pleines (2) — touche un objet en bas pour le reposer" },
    close: { ar: "سكّر", fr: "Fermer" }, bed2: { ar: "😴 هيدا مريض مستقرّ ونايم. مريضك بالتخت 1.", fr: "😴 Patient stable qui dort. Ton patient est au lit 1." },
    noItems: { ar: "بدّك غرض؟ جيبو: 🛒 عربة الطوارئ · 🟢 الأكسجين · 🖥️ المونيتور · ⚡ Défibrillateur · 💊 خزانة الأدوية", fr: "Besoin d'un objet ? 🛒 chariot · 🟢 O₂ · 🖥️ moniteur · ⚡ défibrillateur · 💊 armoire" },
    mon0: { ar: "🔌 ركّب المونيتور لتشوف الأرقام", fr: "🔌 Branche le moniteur pour voir les valeurs" },
    tasks: { ar: "مهام", fr: "tâches" }, next: { ar: "💡 الجاية:", fr: "💡 Prochaine étape :" }, from: { ar: "جيبها من", fr: "à prendre :" }, callFirst: { ar: "(بدّها وصفة: 📞 اتصل أوّل)", fr: "(sur prescription : 📞 appelle d'abord)" }, atBed: { ar: "عند التخت 1", fr: "au lit 1" },
    qH: { ar: "🧠 سؤال سريع", fr: "🧠 Question rapide" }, right: { ar: "✅ صح! (+5)", fr: "✅ Juste ! (+5)" }, wrongQ: { ar: "❌ لأ (−5)", fr: "❌ Non (−5)" }, cont: { ar: "كمّل ⬅️", fr: "Continuer ➡️" },
    endOk: { ar: "🎉 المريض استقرّ!", fr: "🎉 Patient stabilisé !" }, endLost: { ar: "🔴 المريض تدهور", fr: "🔴 Le patient s'est dégradé" }, endTime: { ar: "⏰ خلص الوقت — الطبيب استلم الحالة", fr: "⏰ Temps écoulé — le médecin prend le relais" },
    score: { ar: "النتيجة", fr: "Score" }, tm: { ar: "الوقت", fr: "Temps" }, newBest: { ar: "🏆 أحسن نتيجة إلك بهالحالة!", fr: "🏆 Ton meilleur score sur ce cas !" },
    order: { ar: "✅ الترتيب الصح (وشو عملت)", fr: "✅ Le bon ordre (et ce que tu as fait)" }, opt: { ar: "اختياري", fr: "optionnel" }, pre: { ar: "كانت معمولة", fr: "déjà en place" },
    mist: { ar: "❌ أخطاءك", fr: "❌ Tes erreurs" }, noMist: { ar: "👌 ولا غلطة!", fr: "👌 Aucune erreur !" },
    again: { ar: "🔁 جرّب كمان مرّة", fr: "🔁 Rejouer" }, other: { ar: "🏥 حالة تانية", fr: "🏥 Autre cas" }, lesson: { ar: "📖 راجع الدرس", fr: "📖 Revoir le cours" },
    pts0: { ar: "سجّل دخول بغوغل تا تنحسبلك النقاط", fr: "Connecte-toi avec Google pour gagner les points" },
    rhFv: { ar: "FV — رجفان بطيني", fr: "FV — fibrillation ventriculaire" }, hintNone: { ar: "كمّل — قرّبت تخلص 👌", fr: "Continue — presque fini 👌" }
  };
  function u(k) { return T(U[k]); }
  var ov = null, body = null, cv = null, cx = null, ecg = null, ex = null, G = null, bg = null, raf = 0, last = 0, st = null, phase = "", paused = false;
  var nurse = { x: E.door.x, y: E.door.y, dir: -Math.PI / 2, pts: [], goal: null, walkT: 0 }, mark = null, glow = null, fbT = 0, monT = 0, scale = 1, dpr = 1, rightRun = 0;
  var ecgX = 0, ecgPh = 0, ecgLastY = null;
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function night() { return d.documentElement.getAttribute("data-theme") === "night"; }
  function q(sel) { return ov ? ov.querySelector(sel) : null; }

  function build() {
    if (ov) return;
    ov = d.createElement("div"); ov.className = "err"; ov.id = "erroom"; ov.setAttribute("data-nofr", ""); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="err-top"><button type="button" class="err-x" aria-label="✕">✕</button><b class="err-tt"></b><span class="err-tm" dir="ltr"></span><span class="err-sc" dir="ltr"></span></div><div class="err-body"></div>';
    d.body.appendChild(ov); body = q(".err-body");
    ov.addEventListener("click", onClick);
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov && !ov.hidden) { if (sheetOpen()) closeSheet(); else close(); } });
    w.addEventListener("resize", function () { if (phase === "play") size(); });
    w.addEventListener("popstate", function () { if (ov && !ov.hidden && location.hash !== "#room") close(true); });
    d.addEventListener("nursin:theme", function () { bg = null; });
  }
  function open(id) {
    build(); ov.hidden = false; ov.setAttribute("dir", FR() ? "ltr" : "rtl"); ov.setAttribute("aria-label", u("title"));
    d.documentElement.classList.add("err-open");
    if (location.hash !== "#room") { try { history.pushState({ err: 1 }, "", "#room"); } catch (e) {} }
    if (id && caseById(id)) brief(id); else picker();
  }
  function close(fromPop) {
    stop(); if (!ov) return; ov.hidden = true; d.documentElement.classList.remove("err-open"); phase = ""; st = null; paint();
    if (!fromPop && location.hash === "#room") { try { if (history.state && history.state.err) history.back(); else history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  }
  function top(tm, sc) { q(".err-tt").textContent = u("title"); q(".err-tm").textContent = tm || ""; q(".err-sc").textContent = sc == null ? "" : "⭐ " + sc; }

  /* ---- case picker ---- */
  function picker() {
    stop(); phase = "pick"; top("", null);
    body.innerHTML = '<div class="err-pick"><h2>' + u("pickH") + "</h2><p class=\"small\">" + esc(u("pickP")) + "</p>" +
      E.cases.map(function (c) { var b = bestOf(c.id); return '<button type="button" class="err-case" data-case="' + c.id + '"><span class="err-ic">' + c.ic + "</span><span class=\"err-cn\"><b>" + esc(T(c.t)) + "</b><small>" + esc(T(c.src)) + '</small></span><span class="err-cb" dir="ltr">' + (b ? "⭐".repeat(b.st || 0) + " " + b.s + "/100" : "—") + "</span></button>"; }).join("") +
      '<button type="button" class="err-old" data-old="1">' + esc(u("old")) + "</button></div>";
  }
  /* ---- arrival card (time starts on «يلّا») ---- */
  function cardHtml(c, s) {
    var v = c.vit, L = function (k, x, lv) { return '<span class="' + lv + '"><small>' + k + "</small><b dir=\"ltr\">" + x + "</b></span>"; };
    var vit = c.rh === "fv" ? '<p class="err-rh">⚡ ' + esc(u("rhFv")) + "</p>" : '<div class="err-vits">' + L("TA", v.sys + "/" + v.dia, lvl("ta", v.sys)) + L("FC", v.fc, lvl("fc", v.fc)) + L("FR", v.fr, lvl("fr", v.fr)) + L("SpO₂", v.spo2 + "%", lvl("spo2", v.spo2)) + L("T°", v.t, lvl("t", v.t)) + L("GCS", c.hideGcs ? "?" : v.gcs, c.hideGcs ? "" : lvl("gcs", v.gcs)) + "</div>";
    return '<p class="err-src' + (c.gen ? " g" : "") + '">' + esc(T(c.src)) + "</p><h3>" + c.ic + " " + esc(T(c.t)) + "</h3>" +
      "<p><b>" + u("who") + ":</b> " + esc(T(c.who)) + "</p><p><b>" + u("sx") + ":</b></p><ul>" + c.sx.map(function (x) { return "<li>" + esc(T(x)) + "</li>"; }).join("") + "</ul>" +
      "<p><b>" + u("vit") + ":</b></p>" + vit + (c.lab ? "<p><b>" + u("lab") + ":</b> " + esc(T(c.lab)) + "</p>" : "") + (s && c.labGds && s.done.gds != null ? '<p class="err-gds" dir="ltr">🧪 ' + esc(T(c.labGds)) + "</p>" : "");
  }
  function brief(id) {
    st = create(id); phase = "brief"; nurse = { x: E.door.x, y: E.door.y, dir: -Math.PI / 2, pts: [], goal: null, walkT: 0 }; mark = glow = null; rightRun = 0;
    playLayout(); paused = true;
    openSheet('<div class="err-brief">' + cardHtml(st.c) + '<p class="small">' + u("time") + " <b>" + Math.round(st.c.limit / 60 * 10) / 10 + "</b> " + u("min") + '</p><button type="button" class="btn on err-go" data-go="1">' + u("go") + "</button></div>", true);
    start();
  }
  function playLayout() {
    phase = phase || "play";
    body.innerHTML = '<div class="err-mon" dir="ltr"><div class="err-vals">' +
      [["fc", "FC", "نبض"], ["ta", "TA", "ضغط"], ["spo2", "SpO₂", "أكسجين"], ["fr", "FR", "تنفّس"], ["t", "T°", "حرارة"], ["gcs", "GCS", "وعي"]].map(function (x) {
        return '<div class="mv" data-v="' + x[0] + '"><small>' + x[1] + (FR() ? "" : ' <i dir="rtl">' + x[2] + "</i>") + "</small><b>--</b></div>"; }).join("") +
      '</div><canvas class="err-ecg" aria-hidden="true"></canvas><p class="err-mon0">' + esc(u("mon0")) + "</p></div>" +
      '<div class="err-stage"><canvas class="err-cv" aria-label="' + esc(u("title")) + '"></canvas><div class="err-fb" aria-live="polite"></div><div class="err-task"></div></div>' +
      '<div class="err-bar"><span class="err-invl">' + u("inv") + '</span><button type="button" class="err-slot" data-slot="0"></button><button type="button" class="err-slot" data-slot="1"></button>' +
      '<button type="button" class="err-btn" data-cardbtn="1">' + u("card") + '</button><button type="button" class="err-btn" data-hint="1">' + u("hint") + "</button></div>" +
      '<div class="err-sheet" hidden><div class="err-shin"></div></div>';
    cv = q(".err-cv"); cx = cv.getContext("2d"); ecg = q(".err-ecg"); ex = ecg.getContext("2d"); G = G || grid(); bg = null;
    cv.addEventListener("pointerdown", onTap);
    size(); inv(); monitor(true); task();
  }
  function size() {
    if (!cv) return; var stg = q(".err-stage"), wv = stg.clientWidth, hv = stg.clientHeight; if (!wv || !hv) return;
    scale = Math.min(wv / E.W, hv / E.H); dpr = Math.min(2, w.devicePixelRatio || 1);
    cv.style.width = Math.round(E.W * scale) + "px"; cv.style.height = Math.round(E.H * scale) + "px";
    cv.width = Math.round(E.W * scale * dpr); cv.height = Math.round(E.H * scale * dpr); bg = null;
    var ew = ecg.clientWidth || 300, eh = ecg.clientHeight || 36; ecg.width = Math.round(ew * dpr); ecg.height = Math.round(eh * dpr); ecgX = 0; ecgLastY = null;
  }
  function start() { stop(); last = 0; raf = w.requestAnimationFrame(loop); }
  function stop() { if (raf) w.cancelAnimationFrame(raf); raf = 0; }

  /* ---- the frame loop: walk, tick the case (not while the arrival card / a question is open), draw ---- */
  function loop(ts) {
    raf = w.requestAnimationFrame(loop);
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (nurse.pts.length) {
      var r = walk(nurse, nurse.pts, dt); nurse.x = r.x; nurse.y = r.y; nurse.dir = r.dir; nurse.walkT += dt;
      if (r.done) { nurse.walkT = 0; mark = null; if (nurse.goal) { var g = nurse.goal; nurse.goal = null; arrive(g); } }
    }
    if (st && phase === "play" && !paused) {
      tick(st, dt);
      if (st.end) { phase = "ending"; setTimeout(endScreen, 900); }
    }
    monT += dt; if (monT > 0.25) { monT = 0; monitor(); }
    draw(ts / 1000); drawEcg(dt);
  }
  function toL(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function onTap(e) {
    if (phase !== "play" || sheetOpen()) return; e.preventDefault();
    var p = toL(e), k = hitStation(p.x, p.y, 6);
    if (k) return goTo(k);
    nurse.goal = null; nurse.pts = path(G, nurse, p); mark = { x: p.x, y: p.y, t: 0 };
  }
  function goTo(k) {
    var s = E.stations[k].spot, dx = s.x - nurse.x, dy = s.y - nurse.y;
    if (dx * dx + dy * dy < 25) { nurse.pts = []; return arrive(k); }
    nurse.goal = k; nurse.pts = path(G, nurse, s); mark = { x: s.x, y: s.y, t: 0 };
    if (!nurse.pts.length) { nurse.goal = null; arrive(k); }
  }
  function arrive(k) {
    var S = E.stations[k];
    nurse.dir = Math.atan2((S.y + S.h / 2) - nurse.y, (S.x + S.w / 2) - nurse.x);
    if (glow === k) glow = null;
    if (k === "bed1") return bedMenu();
    if (k === "bed2") return say("neutral", "🛏️ " + T(S), u("bed2"));
    if (k === "sink" || k === "phone") { var a = k === "sink" ? "wash" : "call", A = E.actions[a];
      return openSheet(sheetHead(S) + '<div class="err-acts"><button type="button" class="err-act" data-act="' + a + '">' + A.ic + " " + esc(T(A)) + "</button></div>"); }
    stationMenu(k);
  }
  function sheetHead(S) { return '<div class="err-shh"><b>' + S.ic + " " + esc(T(S)) + '</b><button type="button" class="err-shx" data-shx="1" aria-label="' + esc(u("close")) + '">✕</button></div>'; }
  function stationMenu(k, msg) {
    var S = E.stations[k], its = Object.keys(E.items).filter(function (i) { return E.items[i].st === k; });
    openSheet(sheetHead(S) + (msg ? '<p class="err-shm">' + esc(msg) + "</p>" : "") + '<div class="err-items">' + its.map(function (i) {
      var I = E.items[i], h = st.inv.indexOf(i) > -1;
      return '<button type="button" class="err-item' + (h ? " on" : "") + '" data-take="' + i + '" data-st="' + k + '"><span>' + I.ic + "</span><b>" + esc(T(I)) + "</b><i>" + (h ? u("have") : u("take")) + "</i></button>"; }).join("") + "</div>");
  }
  function bedMenu() {
    var groups = { ev: [], pos: [], tx: [], hand: [] };
    for (var a in E.actions) { var A = E.actions[a]; if (A.at !== "bed") continue; if (A.need) { if (st.inv.indexOf(A.need) > -1) groups.hand.push(a); } else groups[A.g || "tx"].push(a); }
    var h = sheetHead(E.stations.bed1) + '<p class="err-shm">' + st.c.ic + " " + esc(T(st.c.who)) + "</p>";
    ["hand", "ev", "pos", "tx"].forEach(function (g) {
      if (!groups[g].length) { if (g === "hand") h += '<p class="small err-noit">' + esc(u("noItems")) + "</p>"; return; }
      h += '<p class="err-gh">' + esc(T(E.groups[g])) + '</p><div class="err-acts">' + groups[g].map(function (a) { var A = E.actions[a], dn = isDone(a);
        return '<button type="button" class="err-act' + (g === "hand" ? " hand" : "") + (dn ? " dn" : "") + '" data-act="' + a + '">' + A.ic + " " + esc(T(A)) + (dn ? " ✔️" : "") + "</button>"; }).join("") + "</div>";
    });
    openSheet(h);
  }
  function isDone(a) { var s = stepOf(st.c, a); return !!(s && st.done[[].concat(s.a)[0]] != null); }
  function sheetOpen() { var s = q(".err-sheet"); return !!(s && !s.hidden); }
  function openSheet(html, modal) { var s = q(".err-sheet"); if (!s) return; s.querySelector(".err-shin").innerHTML = html; s.hidden = false; s.classList.toggle("modal", !!modal); s.scrollTop = 0; s.querySelector(".err-shin").scrollTop = 0; }
  function closeSheet() { var s = q(".err-sheet"); if (s) { s.hidden = true; s.classList.remove("modal"); } }

  /* ---- clicks inside the overlay ---- */
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("button") : null; if (!t || !ov.contains(t)) return;
    if (t.classList.contains("err-x")) return close();
    if (t.hasAttribute("data-case")) return brief(t.getAttribute("data-case"));
    if (t.hasAttribute("data-old")) { close(); var er = d.querySelector('[data-g="er"]'); if (er) setTimeout(function () { er.click(); }, 60); return; }
    if (t.hasAttribute("data-go")) { closeSheet(); paused = false; phase = "play"; task(); return; }
    if (t.hasAttribute("data-shx")) return closeSheet();
    if (t.hasAttribute("data-cardbtn")) { if (st) openSheet(sheetHead({ ic: "📋", ar: T(st.c.t), fr: T(st.c.t) }) + '<div class="err-brief">' + cardHtml(st.c, st) + "</div>"); return; }
    if (t.hasAttribute("data-hint")) return doHint();
    if (t.hasAttribute("data-slot")) { var it = st && st.inv[+t.getAttribute("data-slot")]; if (it) { drop(st, it); inv(); say("neutral", E.items[it].ic + " " + T(E.items[it]), u("drop")); } return; }
    if (t.hasAttribute("data-take")) { var i = t.getAttribute("data-take"), k = t.getAttribute("data-st"), r = pick(st, i); if (r === "full") return stationMenu(k, u("full")); if (r === "have") { drop(st, i); } inv(); return stationMenu(k); }
    if (t.hasAttribute("data-act")) { closeSheet(); return doAct(t.getAttribute("data-act")); }
    if (t.hasAttribute("data-qa")) return qAnswer(t);
    if (t.hasAttribute("data-eragain")) return brief(t.getAttribute("data-eragain"));
    if (t.hasAttribute("data-erother")) return picker();
  }
  function doAct(a) {
    var r = act(st, a), A = E.actions[a], nm = A.ic + " " + T(A);
    inv(); task();
    if (r.kind === "good") { rightRun++; say("good", nm + (r.pts ? " (+" + r.pts + ")" : ""), r.why, r.doc); if (w.Osman && rightRun % 4 === 0) w.Osman.toast(w.Osman.bubble(w.Osman.pick("praise"), "osp")); }
    else if (r.kind === "order") { rightRun = 0; say("order", nm + " ⚠️ (−5)", r.ow, r.why); }
    else if (r.kind === "bad") { rightRun = 0; say("bad", nm + " ❌ (−10)", r.why, null, w.Osman ? w.Osman.wrong() : ""); }
    else say(r.kind === "blocked" ? "blocked" : "neutral", nm, r.why);
    if (r.q) setTimeout(function () { if (st && !st.end) question(r.step, r.q); }, 250);
    monitor(true);
  }
  function question(id, Q) {
    paused = true;
    openSheet('<div class="err-q"><p class="err-gh">' + u("qH") + "</p><p><b>" + esc(T(Q.ask)) + '</b></p><div class="err-acts">' + Q.o.map(function (o, i) { return '<button type="button" class="err-act" data-qa="' + i + '" data-qid="' + id + '">' + esc(T(o)) + "</button>"; }).join("") + "</div></div>", true);
  }
  function qAnswer(b) {
    var id = b.getAttribute("data-qid"), i = +b.getAttribute("data-qa"), r = answer(st, id, i); if (!r) return;
    var s = stepOf(st.c, id);
    [].forEach.call(ov.querySelectorAll("[data-qa]"), function (x) { var k = +x.getAttribute("data-qa"); x.disabled = true; if (k === s.q.a) x.classList.add("ok"); else if (k === i) x.classList.add("bad"); });
    b.parentNode.insertAdjacentHTML("afterend", '<p class="err-qr ' + (r.ok ? "ok" : "bad") + '"><b>' + (r.ok ? u("right") : u("wrongQ")) + "</b> " + esc(r.x) + '</p><button type="button" class="btn on err-go" data-go="1">' + u("cont") + "</button>");
    task();
  }
  function doHint() {
    if (!st || phase !== "play") return; var h = hint(st);
    if (!h) return say("neutral", "💡", u("hintNone"));
    var A = E.actions[h.a], where = h.item ? u("from") + " " + E.stations[h.st].ic + " " + T(E.stations[h.st]) + (h.rx ? " " + u("callFirst") : "") : h.st === "bed1" ? u("atBed") : E.stations[h.st].ic + " " + T(E.stations[h.st]);
    glow = h.rx ? "phone" : h.item && st.inv.indexOf(h.item) > -1 ? "bed1" : h.st;
    say("hint", u("next") + " " + A.ic + " " + T(A) + " (−3)", where); task();
  }
  var fbMs = { good: 3200, order: 5200, bad: 6000, neutral: 3000, blocked: 3200, hint: 4500 };
  function say(kind, title, why, extra, osm) {
    var f = q(".err-fb"); if (!f) return;
    f.className = "err-fb on " + kind;
    f.innerHTML = "<p><b>" + esc(title) + "</b></p>" + (why ? '<p class="small">' + esc(why) + "</p>" : "") + (extra ? '<p class="small err-doc">' + esc(extra) + "</p>" : "") + (osm || "");
    clearTimeout(fbT); fbT = setTimeout(function () { f.classList.remove("on"); }, fbMs[kind] || 3500);
  }
  function inv() {
    if (!st) return; [0, 1].forEach(function (i) { var b = q('[data-slot="' + i + '"]'), it = st.inv[i]; if (!b) return; b.innerHTML = it ? E.items[it].ic + " <small>" + esc(T(E.items[it]).replace(/\s*\(.*$/, "").slice(0, 22)) + "</small>" : '<small class="e">' + u("empty") + "</small>"; b.classList.toggle("on", !!it); });
  }
  function task() {
    var el = q(".err-task"); if (!el || !st) return;
    var K = keys(st.c), dn = K.filter(function (s) { return st.done[[].concat(s.a)[0]] != null; }).length;
    el.textContent = "🎯 " + T(E.stations.bed1) + " · ✅ " + dn + "/" + K.length + " " + u("tasks");
    top("⏱ " + mmss(st.c.limit - st.t), score(st));
  }
  /* ---- the monitor strip (DOM, 4× a second, fixed widths = no layout shift) ---- */
  function lvl(k, v) {
    if (k === "fc") return v < 50 || v > 120 ? "r" : v < 60 || v > 100 ? "o" : "g";
    if (k === "ta") return v < 90 ? "r" : v < 100 || v > 160 ? "o" : "g";
    if (k === "spo2") return v < 90 ? "r" : v < 95 ? "o" : "g";
    if (k === "fr") return v < 10 || v > 25 ? "r" : v > 20 || v < 12 ? "o" : "g";
    if (k === "t") return v >= 38.5 || v < 35.5 ? "r" : v >= 37.6 ? "o" : "g";
    if (k === "gcs") return v <= 8 ? "r" : v < 14 ? "o" : "g";
    return "g";
  }
  var prevV = {};
  function monitor(force) {
    if (!st || !ov) return; var m = q(".err-mon"); if (!m) return;
    var on = st.mon, v = st.v, fv = st.rh === "fv";
    m.classList.toggle("off", !on);
    var vals = { fc: fv ? "FV" : Math.round(v.fc), ta: fv ? "--" : Math.round(v.sys) + "/" + Math.round(v.dia), spo2: fv ? "--" : Math.round(v.spo2) + "%", fr: fv ? "0" : Math.round(v.fr), t: v.t.toFixed(1), gcs: Math.round(v.gcs) };
    var raw = { fc: v.fc, ta: v.sys, spo2: v.spo2, fr: v.fr, t: v.t, gcs: v.gcs };
    for (var k in vals) {
      var el = m.querySelector('[data-v="' + k + '"]'); if (!el) continue; var b = el.querySelector("b"), shown = (on || k === "t" || k === "gcs") && !(k === "gcs" && st.c.hideGcs && st.done.eval == null) ? String(vals[k]) : "--";
      if (b.textContent !== shown) { b.textContent = shown; if (on && prevV[k] != null && !force) { var up = raw[k] > prevV[k]; el.classList.remove("up", "dn"); void el.offsetWidth; el.classList.add(up ? "up" : "dn"); } }
      el.className = el.className.replace(/\b(g|o|r)\b/g, "").trim() + " " + (on ? (fv && (k === "fc" || k === "ta" || k === "spo2" || k === "fr") ? "r" : lvl(k, raw[k])) : "");
      prevV[k] = raw[k];
    }
    task();
  }
  function ecgY(ph) {   // one beat, ph 0..1 → −1..1
    if (ph < 0.1) return 0.12 * Math.sin(ph / 0.1 * Math.PI);
    if (ph < 0.16) return 0; if (ph < 0.18) return -0.15; if (ph < 0.21) return 1; if (ph < 0.24) return -0.35; if (ph < 0.4) return 0;
    if (ph < 0.56) return 0.25 * Math.sin((ph - 0.4) / 0.16 * Math.PI); return 0;
  }
  function drawEcg(dt) {
    if (!ex || !st) return; var W2 = ecg.width, H2 = ecg.height; if (!W2) return;
    var on = st.mon, sp = 70 * dpr, x0 = ecgX, x1 = ecgX + sp * dt, mid = H2 * 0.55, amp = H2 * 0.38;
    ex.lineWidth = 1.6 * dpr; ex.strokeStyle = on ? "#3df59a" : "#3a5248"; ex.lineJoin = "round";
    var fc = st.rh === "fv" ? 0 : Math.max(0, st.v.fc), y;
    ex.clearRect(Math.floor(x0), 0, Math.ceil(x1 - x0) + 10 * dpr, H2);
    ex.beginPath(); ex.moveTo(x0, ecgLastY == null ? mid : ecgLastY);
    for (var x = x0; x <= x1; x += 1.5) {
      ecgPh += (fc / 60) * (1.5 / sp);
      if (!on) y = mid;
      else if (st.rh === "fv") { ecgPh += 1.5 / sp; y = mid - amp * 0.5 * (Math.sin(ecgPh * 31) * 0.6 + Math.sin(ecgPh * 47 + 1) * 0.4 + Math.sin(ecgPh * 13) * 0.3); }
      else if (fc < 1) y = mid;
      else y = mid - amp * ecgY(ecgPh % 1);
      ex.lineTo(x, y); ecgLastY = y;
    }
    ex.stroke();
    ecgX = x1; if (ecgX > W2) { ecgX = 0; ecgLastY = null; }
  }

  /* ---- drawing (canvas shapes only; the static room is cached once per size/theme) ---- */
  function pal() {
    return night() ? { floor: "#17232a", tile: "#1e2d35", wall: "#3b5560", wallIn: "#2a3e46", frame: "#5d6f79", matt: "#cdd7dc", b1: "#2f8f83", b2: "#3d6f99", pil: "#e3e9ec", lb: "rgba(9,18,23,.82)", ink: "#dff3ee", skin: "#e5b893", hair: "#2a1c14" }
      : { floor: "#e9f1ef", tile: "#d7e4e1", wall: "#8fb3ad", wallIn: "#b9d3ce", frame: "#7d8c96", matt: "#ffffff", b1: "#7fc8bd", b2: "#9cc3e6", pil: "#f4f7f8", lb: "rgba(255,255,255,.88)", ink: "#17323a", skin: "#f1c7a5", hair: "#3b2a1e" };
  }
  function rr(c, x, y, wd, ht, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + wd, y, x + wd, y + ht, r); c.arcTo(x + wd, y + ht, x, y + ht, r); c.arcTo(x, y + ht, x, y, r); c.arcTo(x, y, x + wd, y, r); c.closePath(); }
  var EMO = "system-ui,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  function label(c, P, x, y, txt) {
    c.font = "700 8px " + EMO; var tw = c.measureText(txt).width + 10;
    c.fillStyle = P.lb; rr(c, x - tw / 2, y - 7, tw, 14, 7); c.fill();
    c.fillStyle = P.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillText(txt, x, y + 0.5);
  }
  var LBL = { bed1: [76, 226], bed2: [284, 226], mon: [147, 76], o2: [199, 45], sink: [316, 326], cart: [181, 287], defib: [44, 325], drugs: [44, 520], phone: [299, 518] };
  function bed(c, P, s, bl) {
    c.fillStyle = "rgba(0,0,0,.10)"; rr(c, s.x + 3, s.y + 4, s.w, s.h, 10); c.fill();
    c.fillStyle = P.frame; rr(c, s.x, s.y, s.w, s.h, 10); c.fill();
    c.fillStyle = P.matt; rr(c, s.x + 5, s.y + 5, s.w - 10, s.h - 10, 7); c.fill();
    c.fillStyle = P.pil; rr(c, s.x + 14, s.y + 9, s.w - 28, 22, 8); c.fill(); c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 1; c.stroke();
    c.fillStyle = bl; rr(c, s.x + 7, s.y + 44, s.w - 14, s.h - 51, 6); c.fill();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x + 9, s.y + 52); c.lineTo(s.x + s.w - 9, s.y + 52); c.stroke();
  }
  function room() {
    var P = pal(), o = d.createElement("canvas"); o.width = cv.width; o.height = cv.height; var c = o.getContext("2d"); c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.fillStyle = P.floor; c.fillRect(0, 0, E.W, E.H);
    c.strokeStyle = P.tile; c.lineWidth = 1; for (var gx = 12; gx < E.W; gx += 24) { c.beginPath(); c.moveTo(gx, 12); c.lineTo(gx, E.H - 12); c.stroke(); } for (var gy = 12; gy < E.H; gy += 24) { c.beginPath(); c.moveTo(12, gy); c.lineTo(E.W - 12, gy); c.stroke(); }
    c.fillStyle = P.wall; c.fillRect(0, 0, E.W, 12); c.fillRect(0, E.H - 12, E.W, 12); c.fillRect(0, 0, 12, E.H); c.fillRect(E.W - 12, 0, 12, E.H);
    c.fillStyle = P.wallIn; c.fillRect(12, 12, E.W - 24, 3);
    // door (bottom middle)
    c.fillStyle = P.floor; c.fillRect(146, E.H - 12, 68, 12); c.fillStyle = night() ? "#5b8fa8" : "#a8d4e6"; c.fillRect(146, E.H - 9, 30, 6); c.fillRect(184, E.H - 9, 30, 6);
    var S = E.stations;
    bed(c, P, S.bed1, P.b1); bed(c, P, S.bed2, P.b2);
    // bed 2: a stable patient asleep
    c.fillStyle = "rgba(0,0,0,.12)"; rr(c, S.bed2.x + 22, S.bed2.y + 56, 40, 80, 16); c.fill();
    c.fillStyle = P.skin; c.beginPath(); c.arc(S.bed2.x + 42, S.bed2.y + 22, 10, 0, 7); c.fill(); c.fillStyle = "#7a5a3a"; c.beginPath(); c.arc(S.bed2.x + 42, S.bed2.y + 18, 10, Math.PI, 0); c.fill();
    c.fillStyle = P.ink; c.font = "700 9px " + EMO; c.textAlign = "center"; c.fillText("z z", S.bed2.x + 62, S.bed2.y + 12);
    // monitor
    var m = S.mon; c.fillStyle = "#26343c"; rr(c, m.x, m.y, m.w, m.h, 5); c.fill(); c.fillStyle = "#0b1418"; rr(c, m.x + 3, m.y + 3, m.w - 6, m.h - 9, 3); c.fill(); c.fillStyle = "#4b5d66"; c.fillRect(m.x + 6, m.y + m.h - 5, 4, 3); c.fillRect(m.x + 12, m.y + m.h - 5, 4, 3);
    // O2 wall panel + bottle
    var x2 = S.o2; c.fillStyle = "#2fa86a"; rr(c, x2.x, x2.y, 20, x2.h, 4); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(x2.x + 10, x2.y + 10, 5.5, 0, 7); c.fill(); c.fillStyle = "#2fa86a"; c.font = "800 6px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("O₂", x2.x + 10, x2.y + 10.5);
    c.fillStyle = "#1f8a55"; rr(c, x2.x + 23, x2.y + 2, 10, x2.h - 2, 5); c.fill(); c.fillStyle = "#e6e6e6"; c.fillRect(x2.x + 25, x2.y, 6, 4);
    // sink
    var sk = S.sink; c.fillStyle = night() ? "#cfdade" : "#f6fafb"; rr(c, sk.x, sk.y, sk.w, sk.h, 8); c.fill(); c.strokeStyle = "#9fb5bd"; c.lineWidth = 1; c.stroke(); c.fillStyle = "#cde3ea"; c.beginPath(); c.ellipse(sk.x + 13, sk.y + 25, 8, 15, 0, 0, 7); c.fill(); c.strokeStyle = "#8a9aa1"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sk.x + sk.w - 2, sk.y + 25); c.lineTo(sk.x + 16, sk.y + 25); c.stroke();
    // cart (red, drawers, wheels)
    var ca = S.cart; c.fillStyle = "#333"; [[ca.x + 4, ca.y + 4], [ca.x + ca.w - 4, ca.y + 4], [ca.x + 4, ca.y + ca.h - 4], [ca.x + ca.w - 4, ca.y + ca.h - 4]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 3.5, 0, 7); c.fill(); });
    c.fillStyle = "#d64545"; rr(c, ca.x + 2, ca.y + 2, ca.w - 4, ca.h - 4, 6); c.fill(); c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.2; for (var k2 = 1; k2 < 4; k2++) { c.beginPath(); c.moveTo(ca.x + 6, ca.y + 2 + k2 * (ca.h - 4) / 4); c.lineTo(ca.x + ca.w - 6, ca.y + 2 + k2 * (ca.h - 4) / 4); c.stroke(); }
    c.fillStyle = "#fff"; c.fillRect(ca.x + ca.w / 2 - 2, ca.y + 8, 4, 12); c.fillRect(ca.x + ca.w / 2 - 6, ca.y + 12, 12, 4);
    // defibrillator
    var df = S.defib; c.fillStyle = "#f59e0b"; rr(c, df.x, df.y, df.w, df.h, 6); c.fill(); c.fillStyle = "#111"; rr(c, df.x + 6, df.y + 6, df.w - 12, 12, 2); c.fill();
    c.fillStyle = "#fff59d"; c.beginPath(); c.moveTo(df.x + 18, df.y + 21); c.lineTo(df.x + 11, df.y + 32); c.lineTo(df.x + 16, df.y + 32); c.lineTo(df.x + 13, df.y + 41); c.lineTo(df.x + 22, df.y + 29); c.lineTo(df.x + 17, df.y + 29); c.closePath(); c.fill();
    // drug cabinet
    var dg = S.drugs; c.fillStyle = night() ? "#2c4b5c" : "#d4ecf7"; rr(c, dg.x, dg.y, dg.w, dg.h, 5); c.fill(); c.strokeStyle = "#5a9bbd"; c.lineWidth = 1.5; c.stroke();
    var pills = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
    for (var sh = 0; sh < 4; sh++) { var yy = dg.y + 8 + sh * 22; c.strokeStyle = "#5a9bbd"; c.beginPath(); c.moveTo(dg.x + 3, yy + 14); c.lineTo(dg.x + dg.w - 3, yy + 14); c.stroke(); for (var pp = 0; pp < 3; pp++) { c.fillStyle = pills[(sh + pp) % 6]; rr(c, dg.x + 5 + pp * 8, yy + 4, 6, 9, 2); c.fill(); } }
    // nurse desk + phone + computer
    var ph = S.phone; c.fillStyle = night() ? "#6b5338" : "#c89f6b"; rr(c, ph.x, ph.y, ph.w, ph.h, 6); c.fill();
    c.fillStyle = "#1f2a30"; rr(c, ph.x + 46, ph.y + 4, 34, 18, 3); c.fill(); c.fillStyle = "#5fd6c6"; c.fillRect(ph.x + 49, ph.y + 7, 28, 12); c.fillStyle = "#cfd8dc"; c.fillRect(ph.x + 48, ph.y + 25, 30, 6);
    c.fillStyle = "#c0392b"; rr(c, ph.x + 10, ph.y + 9, 22, 14, 5); c.fill(); c.fillStyle = "#fff"; c.font = "8px " + EMO; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("☎", ph.x + 21, ph.y + 16.5);
    for (var k in LBL) { var st2 = S[k]; label(c, P, LBL[k][0], LBL[k][1], st2.ic + " " + T(st2)); }
    return o;
  }
  function draw(t) {
    if (!cv || !cx || !cv.width) return;
    if (!bg) bg = room();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(bg, 0, 0); cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var P = pal(), S = E.stations, m = S.mon;
    // monitor screen
    if (st && st.mon) {
      cx.strokeStyle = st.rh === "fv" ? "#ff6b6b" : "#3df59a"; cx.lineWidth = 1; cx.beginPath();
      for (var x = 0; x <= 30; x++) { var ph = (x / 30 * 2 + t * (st.v.fc || 0) / 60) % 1, yv = st.rh === "fv" ? Math.sin(x * 1.3 + t * 9) * 4 : ecgY(ph) * 6; cx[x ? "lineTo" : "moveTo"](m.x + 4 + x, m.y + 15 - yv); }
      cx.stroke(); cx.fillStyle = "#3df59a"; cx.font = "700 6px sans-serif"; cx.textAlign = "right"; cx.textBaseline = "alphabetic"; cx.fillText(st.rh === "fv" ? "FV" : String(Math.round(st.v.fc)), m.x + m.w - 4, m.y + 21);
    }
    if (st) patient(P, t);
    if (glow && S[glow]) { var g = S[glow], a = 0.45 + 0.35 * Math.sin(t * 6); cx.strokeStyle = "rgba(250,204,21," + a + ")"; cx.lineWidth = 3; rr(cx, g.x - 4, g.y - 4, g.w + 8, g.h + 8, 10); cx.stroke(); }
    if (mark) { mark.t += 1 / 60; var rr2 = 4 + (mark.t * 20) % 10; cx.strokeStyle = "rgba(15,118,110,.7)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(mark.x, mark.y, rr2, 0, 7); cx.stroke(); }
    nurseDraw(P, t);
  }
  function patient(P, t) {
    var b = E.stations.bed1, cxp = b.x + b.w / 2, done = st.done, v = st.v, br = st.rh === "fv" && !done.shock ? 0 : Math.sin(t * Math.PI * 2 * Math.max(6, v.fr) / 60) * 1.4;
    if (done.immob != null) { cx.strokeStyle = "#a0703f"; cx.lineWidth = 2; rr(cx, b.x + 12, b.y + 8, b.w - 24, b.h - 16, 6); cx.stroke(); }
    cx.fillStyle = "rgba(0,0,0,.13)"; rr(cx, cxp - 20 - br / 2, b.y + 50, 40 + br, 86, 16); cx.fill();
    // skin colour: pale/bluish when SpO2 is low, flushed with fever / allergy
    var sk = P.skin; if (v.spo2 < 88 || st.rh === "fv") sk = "#c4d2d8"; else if (v.sys < 85) sk = "#ead8c8"; else if (v.t >= 38.5 || st.id === "ana" && done.adre == null) sk = "#f0a98f";
    var hx = cxp, hy = b.y + 22;
    cx.fillStyle = sk; cx.beginPath(); cx.arc(hx, hy, 11, 0, 7); cx.fill();
    cx.fillStyle = P.hair; cx.beginPath(); cx.arc(hx, hy - 4, 11, Math.PI * 1.05, Math.PI * 1.95); cx.fill();
    cx.strokeStyle = "#5a3a2a"; cx.lineWidth = 1.1; var closed = v.gcs <= 9 || st.rh === "fv";
    cx.beginPath(); if (closed) { cx.moveTo(hx - 6, hy + 1); cx.lineTo(hx - 2, hy + 1); cx.moveTo(hx + 2, hy + 1); cx.lineTo(hx + 6, hy + 1); } else { cx.arc(hx - 4, hy + 1, 1.2, 0, 7); cx.moveTo(hx + 5.2, hy + 1); cx.arc(hx + 4, hy + 1, 1.2, 0, 7); } cx.stroke();
    if (st.id === "ana" && done.adre == null) { cx.fillStyle = "rgba(220,38,38,.55)"; [[-14, 64], [10, 72], [-6, 90], [14, 100], [-12, 112]].forEach(function (p) { cx.beginPath(); cx.arc(cxp + p[0], b.y + p[1], 2.2, 0, 7); cx.fill(); }); }
    if (done.immob != null) { cx.fillStyle = "#f8fafc"; rr(cx, hx - 9, hy + 9, 18, 6, 3); cx.fill(); cx.strokeStyle = "#94a3b8"; cx.lineWidth = 0.8; cx.stroke(); }
    if (done.o2 != null) { cx.fillStyle = "rgba(52,211,153,.55)"; cx.beginPath(); cx.ellipse(hx, hy + 5, 6, 4.5, 0, 0, 7); cx.fill(); cx.strokeStyle = "rgba(52,211,153,.8)"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(hx + 5, hy + 6); cx.quadraticCurveTo(hx + 60, hy + 20, E.stations.o2.x + 10, E.stations.o2.y + E.stations.o2.h); cx.stroke(); }
    if (st.mon) { cx.strokeStyle = "rgba(37,99,235,.55)"; cx.lineWidth = 0.9; [-6, 0, 6].forEach(function (o) { cx.beginPath(); cx.moveTo(cxp + o, b.y + 70); cx.quadraticCurveTo(cxp + 30, b.y + 30, E.stations.mon.x + 8, E.stations.mon.y + E.stations.mon.h); cx.stroke(); }); }
    if (done.vvp != null) { var px = b.x + b.w + 4, py = b.y + 54; cx.strokeStyle = "#94a3b8"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, py + 22); cx.stroke(); cx.fillStyle = done.sang != null ? "#dc2626" : "#bfe3f5"; rr(cx, px - 5, py - 12, 10, 13, 3); cx.fill(); cx.strokeStyle = "rgba(100,116,139,.8)"; cx.lineWidth = 0.8; cx.beginPath(); cx.moveTo(px, py + 1); cx.quadraticCurveTo(px - 10, py + 30, cxp + 18, b.y + 88); cx.stroke(); }
    if (st.id === "hypo") { if (done.stop == null) { var pu = 6 + Math.sin(t * 5) * 1.5; cx.fillStyle = "rgba(220,38,38,.75)"; cx.beginPath(); cx.ellipse(cxp + 9, b.y + 120, pu, pu * 0.7, 0, 0, 7); cx.fill(); } else { cx.fillStyle = "#fff"; rr(cx, cxp + 2, b.y + 115, 15, 9, 2); cx.fill(); cx.fillStyle = "rgba(220,38,38,.5)"; cx.fillRect(cxp + 7, b.y + 117, 5, 5); } }
    if (done.sonde != null) { cx.fillStyle = "#fde68a"; rr(cx, b.x + b.w - 4, b.y + b.h - 26, 10, 14, 3); cx.fill(); }
    if (done.cpr != null && st.rh === "fv") { var k = (t * 1.8) % 1; cx.strokeStyle = "rgba(239,68,68," + (1 - k) + ")"; cx.lineWidth = 2; cx.beginPath(); cx.arc(cxp, b.y + 70, 6 + k * 12, 0, 7); cx.stroke(); }
    var pos = ["pos_semi", "pos_pls", "pos_tete30"].filter(function (a) { return done[a] != null; })[0];
    if (pos) { cx.font = "10px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(E.actions[pos].ic, b.x + 8, b.y + 8); }
  }
  function nurseDraw(P, t) {
    var x = nurse.x, y = nurse.y, a = nurse.dir, mv = nurse.pts.length > 0, sw = mv ? Math.sin(nurse.walkT * 12) : 0;
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 14, 10, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.scale(1.3, 1.3); cx.rotate(a + Math.PI / 2);
    cx.fillStyle = "#0f766e"; [[-8, sw * 4], [8, -sw * 4]].forEach(function (p) { cx.beginPath(); cx.arc(p[0], p[1] - 1, 3, 0, 7); cx.fill(); });
    cx.fillStyle = "#14a394"; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill();
    cx.fillStyle = P.skin; cx.beginPath(); cx.arc(0, -1, 5.6, 0, 7); cx.fill();
    cx.fillStyle = P.hair; cx.beginPath(); cx.arc(0, 0.5, 5.6, 0, Math.PI); cx.fill();
    cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(0, -1.5, 3.6, 0, 7); cx.fill(); cx.fillStyle = "#e11d48"; cx.fillRect(-0.8, -3.6, 1.6, 4.2); cx.fillRect(-2.1, -2.3, 4.2, 1.6);
    cx.restore();
    if (st && st.inv.length) { cx.font = "9px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; st.inv.forEach(function (it, i) { var bx = x + (i ? 9 : -9) * (st.inv.length > 1 ? 1 : 0), by = y - 21; cx.fillStyle = "rgba(255,255,255,.92)"; cx.beginPath(); cx.arc(bx, by, 6.5, 0, 7); cx.fill(); cx.fillStyle = "#000"; cx.fillText(E.items[it].ic, bx, by + 0.5); }); }
  }

  /* ---- end screen ---- */
  function endScreen() {
    if (!st || !ov || ov.hidden) return;
    stop(); phase = "end";
    var c = st.c, sc = score(st), s3 = stars(st), tm = Math.min(st.t, c.limit), nb = record(c.id, sc, s3, tm), sum = summary(st);
    var head = st.end === "ok" ? u("endOk") : st.end === "lost" ? u("endLost") : u("endTime"), out = st.end === "timeout" ? "" : T(c.end[st.end === "ok" ? "ok" : "lost"]);
    var pool = s3 >= 3 ? E.osman.top : s3 === 2 ? E.osman.mid : E.osman.low, line = T(pool[Math.floor(Math.random() * pool.length)]);
    var osm = w.Osman && w.Osman.bubble ? w.Osman.bubble(line) : '<p class="err-osm">👨‍🏫 ' + esc(line) + "</p>";
    var mist = st.pen.filter(function (p) { return p.k === "bad" || p.k === "q" || p.k === "order"; });
    top("⏱ " + mmss(tm), sc);
    body.innerHTML = '<div class="err-end"><h2>' + esc(head) + "</h2>" + (out ? "<p>" + esc(out) + "</p>" : "") +
      '<div class="err-stars" aria-label="' + s3 + '/3">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= s3 ? "on" : "") + '">★</span>'; }).join("") + "</div>" +
      '<div class="err-res"><span><small>' + u("score") + '</small><b dir="ltr">' + sc + '/100</b></span><span><small>' + u("tm") + '</small><b dir="ltr">' + mmss(tm) + "</b></span></div>" +
      (nb && sc ? '<p class="err-nb">' + u("newBest") + "</p>" : "") + osm + '<p class="small" id="errpts"></p>' +
      '<h3>' + u("order") + '</h3><ol class="err-sum">' + sum.map(function (x) {
        var A = E.actions[x.a], nm = x.alts.map(function (a) { return E.actions[a].ic + " " + T(E.actions[a]); }).join(FR() ? " ou " : " أو ");
        var ic = x.pre ? "☑️" : x.st === "ok" ? "✅" : x.st === "late" ? "⚠️" : x.key ? "❌" : "➖";
        return '<li class="' + x.st + '"><b>' + ic + " " + esc(nm) + "</b>" + (x.key ? "" : ' <small class="err-opt">' + u("opt") + "</small>") + (x.pre ? ' <small class="err-opt">' + u("pre") + "</small>" : "") +
          '<p class="small">' + esc(T(x.why)) + "</p>" + (x.st === "late" && x.ow ? '<p class="small err-ow">⚠️ ' + esc(T(x.ow)) + "</p>" : "") + "</li>"; }).join("") + "</ol>" +
      "<h3>" + u("mist") + "</h3>" + (mist.length ? '<ul class="err-mist">' + mist.map(function (p) { var A = E.actions[p.a]; return "<li><b>" + (p.k === "q" ? "🧠 " : p.k === "order" ? "⚠️ " : "❌ ") + esc(A ? A.ic + " " + T(A) : "") + " (−" + p.p + ")</b><p class=\"small\">" + esc(T(p.why)) + "</p></li>"; }).join("") + "</ul>" : '<p class="small">' + u("noMist") + "</p>") +
      '<p class="err-src' + (c.gen ? " g" : "") + '">' + esc(T(c.src)) + ' · <a href="' + c.href + '">' + u("lesson") + "</a></p>" +
      '<div class="err-btns"><button type="button" class="btn on" data-eragain="' + c.id + '">' + u("again") + '</button><button type="button" class="btn" data-erother="1">' + u("other") + "</button></div></div>";
    var pts = points(sc), S = w.NursinStudy, el = d.getElementById("errpts");
    if (S && S.activity) { var o = S.activity("game", pts, "غرفة الطوارئ", el); if (o && o.paid < pts && w.Nursin && w.Nursin.me && el) el.insertAdjacentHTML("afterend", '<p class="small">🎮 ' + (FR() ? "Plafond de points des jeux atteint aujourd'hui (" + S.GAME_CAP + ")" : "وصلت لحدّ نقاط الألعاب اليوم (" + S.GAME_CAP + ")") + "</p>"); }
    else if (el) el.textContent = "+" + pts + " · " + u("pts0");
    try { d.dispatchEvent(new CustomEvent("nursin:er-room", { detail: { id: c.id, score: sc, stars: s3, end: st.end } })); } catch (e) {}
    body.scrollTop = 0; paint();
  }

  /* ---- the games.html card («🏥 غرفة الطوارئ — امشِ لعند المريض») and #room links ---- */
  function paint() {
    var cards = d.querySelectorAll("[data-room]"); if (!cards.length) return;
    var b = store().best, n = 0, s = 0; for (var k in b) { n++; s += b[k].st | 0; }
    [].forEach.call(cards, function (c) {
      var bb = c.querySelector(".gbest"); if (bb) bb.textContent = n ? (FR() ? "Cas réussis : " + n + "/" + E.cases.length + " · ⭐ " + s : "حالات لعبتها: " + n + "/" + E.cases.length + " · ⭐ " + s) : (FR() ? E.cases.length + " cas · tes cours" : E.cases.length + " حالات من دروسك");
      if (FR()) { var t1 = c.querySelector("b"), t2 = c.querySelector("small"), t3 = c.querySelector(".gnew"); if (t3) t3.textContent = "Nouveau"; if (t1) t1.textContent = "Salle d'urgence — marche jusqu'au patient"; if (t2) t2.textContent = "Tu es l'infirmier·e : prends le bon matériel, soigne dans le bon ordre, le moniteur réagit"; }
    });
  }
  core.open = open; core.close = close; core.paint = paint; core.U = U;
  function init() {
    paint();
    d.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest("[data-room]"); if (c) { e.preventDefault(); open(c.getAttribute("data-room-case") || ""); } });
    if (location.hash === "#room" && d.getElementById("gcards")) open();
    d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) setTimeout(pull, 1800); });
    setTimeout(pull, 3000);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
