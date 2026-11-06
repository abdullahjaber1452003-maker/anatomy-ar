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
   deterioration, the end of each patient and of the case) is DERIVED from the case data + the shared doc live/{YYYYMMDD} { day, c, n, ev{1..n}, pts } + now,
   so every phone and the worker compute the same patients from the same timestamps, with or without the cron. */
var LiveCore = (function () {
  var H = 36e5, DAY = 864e5, C0 = 50, REC = 4, HARM = -15, DRIFT_FROM = 8, MAXEV = 600, SLOW = 0.5;   // SLOW: a neglected patient loses rate×0.5 health points an hour
  var PTS = { ok: 5, urg: 6, file: 3, end: 4, acc: 3, mon: 4, bad: -8, ord: -3, neu: -2, no: -3, mild: -1, call2: 1, hint: -1, scr: 2, scr1: 1 };
  // 28y (Abdullah, Nov 3 5:05 PM «في شغلات بحس لازم فيني أفقسها وما عم بقدر»): softer, clearer steps.
  // SAFE = harmless acts: as a step they may come any time after ① the accueil (no need to wait for the whole dossier); the treatments
  // (📞, drugs, fluids, blood, sonde, GDS…) still wait for ① + the vitals 📟 + the urgent gestures. HMAX = «💡 طرف خيط» paid hints per patient per student.
  var SAFE = { eval: 1, pouls: 1, swallow: 1, gly: 1, ecg: 1, mon: 1, bilan: 1, calm: 1, repos: 1, es: 1, jeun: 1, pos_semi: 1, pos_tete30: 1, pos_pls: 1,
    pos_trend: 1, leg_down: 1, vvp: 1, o2: 1, airway: 1, refroid: 1, isol: 1, stop: 1, stopdrug: 1, immob: 1, paravent: 1 };
  var INTIM = ["sonde", "ecg", "refroid", "cpr", "shock"], HMAX = 3;   // intimate gestures: 🩻 the curtain (paravent) comes before them
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
    mon: { ar: "Monitorage = تاخد العلامات الحيوية (TA، FC، FR، SpO₂، T°) وتراقبا — بلاها ما فيك تقيّم.", fr: "Monitorage = prendre et surveiller les constantes (TA, FC, FR, SpO₂, T°) — sans elles, pas d'évaluation." },
    safe: { ar: "ما بيضرّ، بس مش هيدا يلّي ناقصو هلّق — ما انحسبت ولا نقطة.", fr: "Sans danger, mais ce n'est pas ce qui manque maintenant — 0 point." },
    mild: { ar: "مش ضروري لهالمريض — ما في سبب بقصّتو أو بأرقامو.", fr: "Pas nécessaire pour ce patient — rien dans son histoire ni ses constantes." },
    inv: { ar: "إجراء غازي (invasif) بلا سبب عند هالمريض — كل إجراء إلو خطر (وجع، التهاب).", fr: "Geste invasif sans indication chez ce patient — tout geste a ses risques." },
    rx: { ar: "💊 مش بوصفة هالمريض — ما منعطي دوا ما وصفو الطبيب إلو.", fr: "💊 Pas sur la prescription de ce patient — jamais un médicament non prescrit." },
    pulse: { ar: "❌ عندو نبض وعم يتنفّس — تدليك القلب أو الصدمة الكهربا بيأذوه (بس للـ arrêt cardiaque).", fr: "❌ Il a un pouls et respire — massage ou choc électrique le blessent (seulement en arrêt cardiaque)." },
    awake: { ar: "❌ واعي (Glasgow ≥ 9) — Guedel أو Ambu بيعملولو استفراغ وبيأذوه.", fr: "❌ Conscient (Glasgow ≥ 9) — Guedel ou Ambu provoquent vomissements et lésions." },
    nonew: { ar: "📞 الطبيب: «ما في شي جديد تقلّي؟ اتصل بس يصير في جديد (أرقام، فحص، تغيير بحالتو)».", fr: "📞 Le médecin : « Rien de nouveau ? Rappelle quand il y a du nouveau (constantes, examen, changement). »" },
    scr: { ar: "🩻 احترام الخصوصية (pudeur) — سكّرت الستارة قبل الفحص/العناية الحميمة. برافو.", fr: "🩻 Respect de l'intimité (pudeur) — paravent tiré avant l'examen / les soins intimes. Bravo." },
    scr1: { ar: "🩻 منيح إنّك سكّرتا — بس الأحسن تسكّرا قبل الإجراء الحميم (ECG، sonde…).", fr: "🩻 Bien — mais le mieux est de tirer le paravent AVANT le geste intime (ECG, sonde…)." }
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
    // 28v: the patients only start to get worse once the case EXISTS — from 08:00, or from the moment the doc was created (at0, ms) when
    // that was later (a case first created at 7 PM — the day the worker was deployed — used to be counted as neglected since 08:00 and was
    // «lost» before anybody could see it). A doc without at0 (older days) keeps 08:00.
    var t0 = dayStart(key), t1 = dayStart(nextKey(key)), a0 = +doc.at0 || 0, tD = Math.max(t0 + DRIFT_FROM * H, a0 < t1 ? a0 : 0), tL = Math.min(now, t1);
    var P = cs.pts.map(function (p) { var L = steps(D, cs, p), by = {}; L.forEach(function (s) { by[s.id] = s; }); return { p: p, k: p.k, L: L, by: by, done: {}, c: C0, lost: null, fin: null, all: false, soins: false, bad: [], wrong: [], last: null, hints: [], calls: [], screen: null }; });
    var evs = evList(doc), end = null, tp = t0, used = [];
    function upd(x) {
      x.all = x.L.every(function (s) { return !!x.done[s.id]; });
      x.soins = x.L.every(function (s) { return s.ph > 3 || !!x.done[s.id]; });
    }
    // 28x (Abdullah, Nov 2 10:32 PM): each patient ends ON HIS OWN — ✅ stabilised (every step done) or 💔 lost — and the OTHER one keeps
    // going with his own clock; the case ends only when BOTH are finished (or at midnight). end = { w: ok|lost|mix|time, t, pk, ok:[k], lost:[k] }
    function adv(to) {                     // health between two moments; a patient reaching 0 is lost right there, the other one goes on
      while (to > tp) {
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
        if (who) { who.lost = first; who.c = 0; }
        tp = first;
      }
    }
    function out(x) { return x.lost != null || x.all; }
    function ends(w, t) {
      var ok = [], lost = [], pk = null, tl = -1;
      P.forEach(function (x) { if (x.lost != null) { lost.push(x.k); if (x.lost >= tl) { tl = x.lost; pk = x.k; } } else if (x.all) ok.push(x.k); });
      return { w: w || (!lost.length ? "ok" : !ok.length ? "lost" : "mix"), t: t, pk: pk, ok: ok, lost: lost };
    }
    function fin() {                       // both patients finished → the case is over, at the moment the second one finished
      if (end || !P.every(out)) return;
      var t = 0; P.forEach(function (x) { var tx = x.lost != null ? x.lost : x.fin; if (tx > t) t = tx; });
      end = ends(null, t);
    }
    for (var i = 0; i < evs.length && !end; i++) {
      var e = evs[i]; if (e.t > tL) break;
      adv(e.t); fin(); if (end) break;
      var x = P[e.p === "b" ? 1 : 0];
      if (out(x)) continue;                // a step on a patient who is already ✅ / 💔 changes nothing (he stays as he ended)
      used.push(e); x.last = e.t;
      if (/^z(fu|fx|hh|hx|ho|dc|fa|in|pk)\d?$/.test(e.a)) continue;          // 29e: a routine of the nurse (💵 paid) is not a step of the procedure
      // 28y: 💡 a paid hint and 🩻 the curtain are not steps of the procedure (no health change); a 📞 call with nothing new is not a mistake of the procedure
      if (e.a === "hint") { x.hints.push(e); continue; }
      if (e.a === "paravent") { if (e.k === "ok" && !x.screen) x.screen = { t: e.t, u: e.u, n: e.n, i: e.i }; continue; }
      if (e.k === "ok") { var s = x.by[e.a]; if (s && !x.done[s.id]) { x.done[s.id] = { t: e.t, u: e.u, n: e.n, i: e.i }; x.c = Math.max(0, Math.min(100, x.c + s.g)); upd(x); if (x.all) x.fin = e.t; } }
      else if (e.k === "bad") { x.bad.push(e); x.c = Math.max(0, x.c + HARM); if (x.c <= 0) { x.lost = e.t; x.c = 0; } }
      else if (!(e.a === "call" && e.k === "neu")) x.wrong.push(e);
      if (e.a === "call") x.calls.push({ t: e.t, u: e.u, n: e.n, k: e.k, sig: sig(x) });
      fin();
    }
    if (!end) { adv(tL); fin(); }
    if (!end && now >= t1) end = ends("time", t1);
    P.forEach(function (x) {
      upd(x); x.st = bucket(x); x.v = vitals(D, x.p, x.c);
      x.over = x.lost != null ? { w: "lost", t: x.lost } : x.all ? { w: "ok", t: x.fin } : null;   // 28x: this patient's own end
      x.n = x.L.filter(function (s) { return !!x.done[s.id]; }).length; x.tot = x.L.length;
      x.next = end || x.over ? [] : x.L.filter(function (s) { return avail(x, s); });
      x.ph = 6; x.L.forEach(function (s) { if (!x.done[s.id] && s.ph < x.ph) x.ph = s.ph; });   // 28y: the phase = the lowest one with a step still to do
      if (end || x.over) x.ph = x.next.length ? x.next[0].ph : 6;
    });
    return { key: key, id: docId(key), cs: cs, t0: t0, t1: t1, from: tD, end: end, P: P, ev: used, all: evs, pts: doc.pts || {}, n: doc.n | 0, now: now };
  }
  // 28y: what has to come before a step — softer than «the whole previous phase»: its own «after» steps; ① accueil before anything else;
  // a treatment (📞, drugs, fluids, sonde…) after ① + the vitals 📟 + the urgent gestures; ④ surveillance and ⑤ transmissions after everything before them
  function gate(x, s) {
    var m = [];
    s.after.forEach(function (a) { if (!x.done[a] && x.by[a]) m.push(x.by[a]); });
    if (s.ph > 1) x.L.forEach(function (q) {
      if (q === s || x.done[q.id] || m.indexOf(q) > -1) return;
      if (q.ph === 1 || (s.ph >= 4 && q.ph < s.ph) || (s.ph === 3 && !SAFE[s.a] && (q.id === "mon" || (q.urg && q.ph < 3)))) m.push(q);
    });
    return m;
  }
  function avail(x, s) { return !x.done[s.id] && !gate(x, s).length; }
  function missing(x, s) { return gate(x, s); }   // what still has to come before this step (for the «order» why)
  function sig(x) {                         // 📞 «something new» since the last call = a step done, a harmful act, or his state changed
    var n = 0; for (var k in x.done) n++;
    return n + ":" + x.bad.length + ":" + (x.lost != null ? "l" : x.c < 25 ? "c" : x.c < 55 ? "u" : "i");
  }
  // an act that is NOT one of this patient's steps: harmless (0, nothing saved) · not needed (−1) · invasive / not prescribed (−2) · harmful
  function extra(D, p, a) {
    var v = p.vit, A = D.A && D.A[a], I = A && A.need && D.I && D.I[A.need];
    if (I && I.rx) return { k: "neu", d: PTS.neu, why: WHY.rx };
    var arrest = v.fr < 6 || v.sys < 50;
    if ((a === "cpr" || a === "shock") && !arrest) return { k: "bad", d: PTS.bad, why: WHY.pulse };
    if ((a === "guedel" || a === "vent") && v.gcs >= 9) return { k: "bad", d: PTS.bad, why: WHY.awake };
    if ((p.xok || []).indexOf(a) > -1) return { k: "safe", why: WHY.safe };   // the bank's own «sensible here too» list (28y audit)
    var ok = { guedel: v.gcs <= 8, vent: v.gcs <= 8 && v.fr < 12, eval: 1, pouls: 1, mon: 1, gly: 1, ecg: 1, bilan: 1, calm: 1, repos: 1, es: 1, jeun: 1, pos_tete30: 1, vvp: 1, leg_down: 1, swallow: v.gcs >= 13,
      o2: v.spo2 < 95, airway: v.gcs <= 8, pos_pls: v.gcs <= 8, pos_semi: v.fr >= 22 || v.spo2 < 94, refroid: v.t >= 38, isol: v.t >= 38,
      gds: v.spo2 < 92 || v.fr >= 28, bio: v.t >= 38.5, sonde: v.sys < 90 };
    if (ok[a]) return { k: "safe", why: WHY.safe };
    if ({ sonde: 1, gds: 1, bio: 1, remp: 1, sang: 1, immob: 1, cpr: 1, shock: 1, vent: 1, guedel: 1 }[a]) return { k: "neu", d: PTS.neu, why: WHY.inv };
    return { k: "neu", d: PTS.mild, why: WHY.mild };
  }
  // 💡 «طرف خيط»: the next useful step of a patient — the urgent ones first, then the lowest phase, a gesture before a dossier field
  function clue(D, st, pk) {
    var x = st.P[pk === "b" ? 1 : 0]; if (!x || x.over || st.end || !x.next.length) return null;
    var n = x.next.slice().sort(function (a, b) { return ((b.urg ? 1 : 0) - (a.urg ? 1 : 0)) || (a.ph - b.ph) || ((a.kind === "file" ? 1 : 0) - (b.kind === "file" ? 1 : 0)) || (x.L.indexOf(a) - x.L.indexOf(b)); });
    return { s: n[0], ph: x.ph, todo: x.L.filter(function (s) { return !x.done[s.id]; }) };
  }
  // a student tries something on patient pk → { k: ok|bad|ord|neu|no|repeat|over|pover|wait, d: points, a: what is stored, o, s: step, why, miss }
  // 28y: + safe (harmless, 0, nothing saved) · early (harmless but before ① — nothing saved) · doc0 (📞 too early: the doctor asks for what is missing,
  // nothing saved) · a 📞 again = +1 when something is new, −1 «ما في جديد» · hint = 💡 −1 (≤ HMAX per patient per student: hmax) · paravent = 🩻 +2 before
  // the intimate gestures, +1 after
  function check(D, st, pk, a, opt, uid) {
    if (st.end) return { k: "over" };
    var x = st.P[pk === "b" ? 1 : 0], p = x.p, s, b, i, m;
    if (x.over) return { k: "pover", w: x.over.w, x: x };   // 28x: this patient is finished (✅ / 💔) — the other one is still waiting
    if (a === "hint") {
      if (!x.next.length) return { k: "nohint" };
      var hu = x.hints.filter(function (e) { return e.u === uid; }).length;
      return hu >= HMAX ? { k: "hmax", n: hu } : { k: "neu", d: PTS.hint, a: a, left: HMAX - hu - 1 };
    }
    if (a === "paravent") {
      if (x.screen) return { k: "repeat", s: { id: "paravent", a: a, kind: "act" }, scr: x.screen };
      var pre = !INTIM.some(function (id) { return x.by[id] && x.done[id]; });
      return { k: "ok", d: pre ? PTS.scr : PTS.scr1, a: a, s: { id: "paravent", a: a, kind: "act", ph: 0, after: [], why: pre ? WHY.scr : WHY.scr1 } };
    }
    if (a === "call") {
      s = x.by.call;
      if (s && !x.done.call) { m = gate(x, s); return m.length ? { k: "doc0", a: a, s: s, miss: m } : { k: "ok", d: s.pt, a: a, s: s, doc: 1 }; }
      var lc = x.calls.length ? x.calls[x.calls.length - 1] : null;
      if (!lc || lc.sig !== sig(x)) return { k: "ok", d: PTS.call2, a: a, s: s || { id: "call", a: a, kind: "act", ph: 3, after: [] }, doc: 2 };
      return { k: "neu", d: PTS.mild, a: a, why: WHY.nonew, doc: 3 };
    }
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
    if (!s) { var xr = extra(D, p, a); return xr.k === "safe" ? { k: "safe", a: a, why: xr.why } : { k: xr.k, d: xr.d, a: a, why: xr.why }; }
    if (x.done[s.id]) return { k: "repeat", s: s };
    m = gate(x, s);
    if (m.length) return SAFE[s.a] ? { k: "early", a: a, s: s, miss: m } : { k: "ord", d: PTS.ord, a: a, s: s, miss: m };
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
        return { k: x.k, st: x.st, over: x.over, steps: x.L.map(function (s) { return { id: s.id, ph: s.ph, done: x.done[s.id] || null }; }),
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
    state: state, avail: avail, out: function (x) { return !!(x && x.over); }, missing: missing, check: check, summary: summary, WHY: WHY,
    gate: gate, sig: sig, extra: extra, clue: clue, SAFE: SAFE, INTIM: INTIM, HMAX: HMAX };
})();
/* ==/live-core== */

/* ==dept-core== 28z «🏥 المستشفى» (Abdullah, Nov 3 2026 5:50–5:52 PM: «بدي تكون كأنها مستشفى، يكون في كذا قسم، كذا حالة… مفاجأة تجي سيارة
   إسعاف» + «الممرّض يلّي عم يمشي يبيّن كيف عم يفوت من قسم لقسم… المحل يلّي هو موجود فيه بتكون الغرفة واسعة»). Pure (node-tested).
   ONE shared doc a day stays the whole hospital (rules v22 accept only live/{YYYYMMDD}): the 🚑 ER events keep their action ids
   (worker v11 + old phones unchanged); 🫀 قسم القلب writes «k_<step>», 🧠 قسم الأعصاب «n_<step>», the i-th 🚑 ambulance «x<i>_<step>».
   A harmful act in a department is stored as k «no» (rules-valid, and an older ER engine only lists it, it never hurts the ER patients);
   the department view turns it back into «bad». Each department's case (two patients) and every ambulance (time + patient) come from
   the date alone, so every phone sees the same hospital without any new doc, rule or worker. */
var LiveDept = (function (C) {
  var KEYS = ["er", "k", "n", "x"], CODE = { er: 0, k: 1, n: 2, x: 3 }, PRE_RE = /^(k|n|r|s|g|p|m|x[1-3]|w\d\d)_/;
  // 29d «🛗 الطوابق» (Abdullah, Nov 4 2026 7:01 AM «كل شي اسمو مستشفى حطّو فيه»): three floors joined by the 🛗 elevator. ALL = every room a nurse
  // can stand in (its index = the presence code); r/s/g/lab/rad/ph are drawn on the map but open in part 2 (SOON). wt = 🪑 the waiting room + 🏷️ triage,
  // acc = 💰 المحاسبة (the payslip). x (🛏️ the ambulance bay) belongs to the ER on the ground floor.
  // 29e «🏥 كل شي اسمو بالمستشفى» (Abdullah, Nov 4 7:23 AM): + 🛎️ الاستقبال · 🧑‍⚕️ محطة التمريض بكل طابق · 🔪 غرفة العمليات + 🛏️ الإنعاش بعدها ·
  // 🩸 بنك الدم · 🧺 التعقيم · 🗄️ الأرشيف · 🧠 النفسي · 👶 الأطفال (p) · 🤰 التوليد (m) · 🧹 التنظيف · ☕ استراحة الموظفين — and a 3rd floor.
  // ALL keeps its old order (the index is the presence code); the new rooms are appended. Every room is walkable; SOON = drawn with «🔜» (no cases yet).
  var ALL = ["er", "k", "n", "x", "r", "s", "g", "wt", "acc", "lab", "rad", "ph", "adm", "ns0", "ns1", "ns2", "ns3", "or", "sspi", "bb", "ster", "arch", "psy", "p", "m", "cln", "stf"];
  var FLOORS = [["er", "wt", "adm", "acc", "lab", "rad", "ph", "bb", "ns0"], ["k", "n", "r", "ns1"], ["s", "or", "sspi", "g", "ster", "ns2"], ["p", "m", "psy", "stf", "cln", "arch", "ns3"]],
    SOON = { psy: 1, or: 1, sspi: 1 }, SVC = { wt: 1, acc: 1, lab: 1, rad: 1, ph: 1, adm: 1, ns0: 1, ns1: 1, ns2: 1, ns3: 1, or: 1, sspi: 1, bb: 1, ster: 1, arch: 1, psy: 1, cln: 1, stf: 1 },
    WARDS = ["er", "k", "n", "r", "s", "g", "p", "m"];
  // 29e: the new wards' two patients do not all sit in the waiting room at 08:00 — each ward's pair arrives at its own time of the day (the same on
  // every phone, from the date), so the 12 chairs never overflow; their clock (the engine's drift) starts at that arrival
  var ARR = { r: [9 * 60, 11 * 60], s: [9 * 60 + 30, 12 * 60], g: [10 * 60, 13 * 60], p: [11 * 60, 15 * 60], m: [12 * 60, 16 * 60] };
  var AMB_FROM = 10 * 60, AMB_TO = 23 * 60, AMB_GAP = 90, MIN = 6e4, H = 36e5;
  var INFO = {
    er: { ic: "🚑", t: { ar: "الطوارئ", fr: "Urgences" } },
    k: { ic: "🫀", t: { ar: "قسم القلب", fr: "Cardiologie" } },
    n: { ic: "🧠", t: { ar: "قسم الأعصاب", fr: "Neurologie" } },
    x: { ic: "🛏️", t: { ar: "سرير الإسعاف", fr: "Lit de l'ambulance" } },
    r: { ic: "🩺", t: { ar: "العناية الفائقة", fr: "Réanimation" } },
    s: { ic: "🔪", t: { ar: "الجراحة", fr: "Chirurgie" } },
    g: { ic: "👴", t: { ar: "الشيخوخة", fr: "Gériatrie" } },
    wt: { ic: "🪑", t: { ar: "الانتظار والفرز", fr: "Accueil et tri" } },
    acc: { ic: "💰", t: { ar: "المحاسبة", fr: "Comptabilité" } },
    lab: { ic: "🧪", t: { ar: "المختبر", fr: "Laboratoire" } },
    rad: { ic: "🩻", t: { ar: "الأشعة", fr: "Radiologie" } },
    ph: { ic: "💊", t: { ar: "الصيدلية", fr: "Pharmacie" } },
    adm: { ic: "🛎️", t: { ar: "الاستقبال", fr: "Admissions" } },
    ns0: { ic: "🧑‍⚕️", t: { ar: "محطة التمريض", fr: "Poste de soins" } },
    ns1: { ic: "🧑‍⚕️", t: { ar: "محطة التمريض", fr: "Poste de soins" } },
    ns2: { ic: "🧑‍⚕️", t: { ar: "محطة التمريض", fr: "Poste de soins" } },
    ns3: { ic: "🧑‍⚕️", t: { ar: "محطة التمريض", fr: "Poste de soins" } },
    or: { ic: "🔪", t: { ar: "غرفة العمليات", fr: "Bloc opératoire" } },
    sspi: { ic: "🛏️", t: { ar: "الإنعاش بعد العملية", fr: "Salle de réveil (SSPI)" } },
    bb: { ic: "🩸", t: { ar: "بنك الدم", fr: "Banque du sang" } },
    ster: { ic: "🧺", t: { ar: "التعقيم", fr: "Stérilisation" } },
    arch: { ic: "🗄️", t: { ar: "الأرشيف", fr: "Archives" } },
    psy: { ic: "🧠", t: { ar: "الطب النفسي", fr: "Psychiatrie" } },
    p: { ic: "👶", t: { ar: "الأطفال", fr: "Pédiatrie" } },
    m: { ic: "🤰", t: { ar: "التوليد", fr: "Maternité" } },
    cln: { ic: "🧹", t: { ar: "التنظيف", fr: "Entretien" } },
    stf: { ic: "☕", t: { ar: "استراحة الموظفين", fr: "Salle du personnel" } }
  };
  var FLN = [{ ar: "الطابق الأرضي", fr: "Rez-de-chaussée" }, { ar: "الطابق الأوّل", fr: "1er étage" }, { ar: "الطابق التاني", fr: "2e étage" }, { ar: "الطابق التالت", fr: "3e étage" }];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dayIdx(D, key) { var e = String(D.epoch || "2026-11-02").split("-"), k = String(key).split("-"); return Math.round((Date.UTC(+k[0], +k[1] - 1, +k[2]) - Date.UTC(+e[0], +e[1] - 1, +e[2])) / 864e5); }
  // a bank patient by reference: "lc01a" = case lc01, patient a; "nx1" = one of the new department patients
  function ref(D, r) {
    if (D.xpts && D.xpts[r]) { D.xpts[r].rid = r; return { p: D.xpts[r], c: null }; }                     // 29e: rid → his 🚪 discharge education (D.edu)
    var m = /^(lc\d\d)([ab])$/.exec(r); if (!m) return null; var c = C.caseById(D, m[1]); if (!c) return null;
    var p0 = c.pts[m[2] === "b" ? 1 : 0]; if (p0) p0.rid = r; return { p: p0, c: c };
  }
  function pat(src, k) { var p = clone(src); p.k = k; p.bed = k === "a" ? "bed1" : "bed2"; return p; }
  // the department cases as full cases (two patients each), built once per bank
  function cases(D, dk) {
    D.__dc = D.__dc || {}; if (D.__dc[dk]) return D.__dc[dk];
    var out = ((D.dept || {})[dk] || []).map(function (x) {
      var a = ref(D, x.p[0]), b = ref(D, x.p[1]);
      return { id: x.id, ic: x.ic, t: x.t, src: x.src, href: x.href, gen: x.gen, dept: dk, from: [a && a.c ? a.c.id : x.p[0], b && b.c ? b.c.id : x.p[1]], pts: [pat(a.p, "a"), pat(b.p, "b")] };
    });
    return (D.__dc[dk] = out);
  }
  // today's case of a department: the same cycle rule as the ER (every case once before any comes back; never twice in a row)
  function order(list, dk, cyc) {
    var o = shuffle(list, C.rng(C.hash("lc-" + dk + "-cycle-" + cyc)));
    if (cyc > 0 && o.length > 1) { var prev = order(list, dk, cyc - 1); if (o[0] === prev[prev.length - 1]) { var t = o[0]; o[0] = o[1]; o[1] = t; } }
    return o;
  }
  // never a patient of today's 🚑 ER case upstairs too (the same name in two departments): then the next case of the cycle
  function pick(D, dk, key) {
    var L0 = cases(D, dk), list = L0.map(function (c) { return c.id; }), n = list.length; if (!n) return null;
    var i = dayIdx(D, key); if (i < 0) i = ((i % n) + n) % n;
    var o = order(list, dk, Math.floor(i / n)), er = C.caseById(D, C.pick(D, key)), er0 = er ? er.id : "";
    for (var j = 0; j < n; j++) { var id = o[(i + j) % n], c = L0[list.indexOf(id)]; if (c.from.indexOf(er0) < 0) return id; }
    return o[i % n];
  }
  function deptCase(D, dk, key) { var id = pick(D, dk, key), L = cases(D, dk); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  // 🚨 the ambulances of a day: 2 or 3, between 10:00 and 23:00 Beirut, at least 90 min apart, the same on every phone
  function ambTimes(key) {
    var r = C.rng(C.hash("amb-" + key)), c = r() < 0.5 ? 2 : 3, slack = AMB_TO - AMB_FROM - AMB_GAP * (c - 1), offs = [], t0 = C.dayStart(key);
    for (var i = 0; i < c; i++) offs.push(Math.floor(r() * (slack + 1)));
    offs.sort(function (a, b) { return a - b; });
    return offs.map(function (o, i) { return t0 + (AMB_FROM + o + AMB_GAP * i) * MIN; });
  }
  // the one ambulance that holds «🛏️ سرير الإسعاف» at «now» (the newest that arrived) → { i (1…3), t (arrival), next (next arrival or 0), all }
  function ambNow(key, now) {
    var T = ambTimes(key), cur = null, nx = 0;
    for (var i = 0; i < T.length; i++) { if (T[i] <= now) cur = { i: i + 1, t: T[i] }; else if (!nx) nx = T[i]; }
    return { cur: cur, next: nx, all: T };
  }
  // the patient an ambulance brings: an unstable patient of the ER bank (not one of today's patients upstairs, not an earlier ambulance)
  function ambCase(D, key, i, erId) {
    var used = {}, pool = [];
    [erId || C.pick(D, key)].forEach(function (id) { var c = C.caseById(D, id); if (c) c.pts.forEach(function (p) { used[c.id + p.k] = 1; }); });
    ["k", "n"].forEach(function (dk) { var c = deptCase(D, dk, key); if (c) c.from.forEach(function (f, j) { used[f + c.pts[j].k] = 1; }); });
    D.cases.forEach(function (c) { c.pts.forEach(function (p) { if ((p.rate | 0) >= 7) pool.push({ c: c, p: p }); }); });
    var ch = null;
    for (var j = 1; j <= i; j++) {
      var free = pool.filter(function (x) { return !used[x.c.id + x.p.k]; }); if (!free.length) free = pool;
      ch = free[Math.floor(C.rng(C.hash("amb-" + key + "-" + j))() * free.length)]; used[ch.c.id + ch.p.k] = 1;
    }
    var o = ch.c.pts[ch.p.k === "a" ? 1 : 0], A = pat(ch.p, "a"), B = pat(o, "b");
    A.rate = Math.round(A.rate * 1.5); A.amb = i;
    return { id: "x" + i, ic: "🚑", amb: i, dept: "x", from: [ch.c.id, ch.c.id], src: ch.c.src, href: ch.c.href, gen: ch.c.gen,
      t: { ar: "إسعاف: " + ch.p.who.ar, fr: "Ambulance : " + ch.p.who.fr }, pts: [A, B] };
  }
  function pre(dk, i) { return dk === "er" ? "" : dk === "x" ? "x" + (i | 0) + "_" : dk + "_"; }   // 29d: a walk-in «w07» → «w07_»
  function ns(a) { var m = PRE_RE.exec(String(a || "")); return m ? m[1] : ""; }
  // one step of the department, as it is stored in the shared doc (fits rules v22: action ≤ 20 chars, «bad» → «no» with d < 0)
  function enc(dk, i, r) {
    var a = pre(dk, i) + r.a, k = r.k;
    if (dk !== "er" && k === "bad") k = "no";
    return { a: a, k: k };
  }
  // the bank a department plays with: its case first, then the ER bank without the cases its patients come from (no twin answers)
  function bankFor(D, cs) {
    var skip = {}; (cs.from || []).forEach(function (f) { skip[f] = 1; });
    var X = {}; for (var k in D) if (k !== "cases" && k.indexOf("__") !== 0) X[k] = D[k];
    X.cases = [cs].concat(D.cases.filter(function (c) { return !skip[c.id]; })); return X;
  }
  // 29e: when a ward's two patients of the day arrive (ms) — 0 for the 🚑/🫀/🧠 (08:00 as before)
  function arrival(key, dk) {
    var R = ARR[dk]; if (!R) return 0; var r = C.rng(C.hash("arr-" + dk + "-" + key))();
    return C.dayStart(key) + (R[0] + Math.floor(r * (R[1] - R[0] + 1))) * MIN;
  }
  // the shared doc as ONE department sees it → { D, doc, cs, amb } (amb = the ambulance shown, or null)
  function view(D, doc, dk, now, ai) {
    doc = doc || {}; var key = C.keyOf(doc.day) || C.dayKey(now), cs = null, at0 = doc.at0, p = "", amb = null;
    if (dk === "er") {
      var ev = {}; for (var n in (doc.ev || {})) { var e = doc.ev[n]; if (e && !ns(e.a)) ev[n] = e; }
      return { D: D, doc: { day: doc.day, c: doc.c, n: doc.n, ev: ev, pts: doc.pts || {}, at0: doc.at0 }, cs: C.caseById(D, doc.c) || C.caseById(D, C.pick(D, key)), amb: null, key: key };
    }
    if (dk === "x") {
      var A = ambNow(key, now), i = ai || (A.cur && A.cur.i); if (!i) return null;
      amb = { i: i, t: A.all[i - 1], next: A.all[i] || 0 }; cs = ambCase(D, key, i, doc.c); at0 = amb.t; p = "x" + i + "_";
    } else { cs = deptCase(D, dk, key); p = dk + "_"; var ar = arrival(key, dk); if (ar > (+at0 || 0)) at0 = ar; }
    if (!cs) return null;
    var ev2 = {};
    for (var m in (doc.ev || {})) {
      var x = doc.ev[m]; if (!x || String(x.a).indexOf(p) !== 0) continue;
      var a = String(x.a).slice(p.length), y = {}; for (var f in x) y[f] = x[f];
      y.a = a; if (y.k === "no" && a.indexOf("f_") !== 0) y.k = "bad";
      ev2[m] = y;
    }
    return { D: bankFor(D, cs), doc: { day: doc.day, c: cs.id, n: doc.n, ev: ev2, pts: doc.pts || {}, at0: at0 }, cs: cs, amb: amb, key: key };
  }
  // the derived state of a department (the same engine), with st.dep / st.amb; an ambulance has ONE patient: it ends with him
  function state(D, doc, dk, now, ai) {
    var v = view(D, doc, dk, now, ai); if (!v) return null;
    var st = C.state(v.D, v.doc, now); st.dep = dk; st.amb = v.amb; st.DK = v.D;
    // 29e ⏰ a missed re-assessment (z fx, written by the nurse's phone when the window closed) makes his patient a bit worse: −6 health each
    var fx = {}; for (var q in v.doc.ev) { var e9 = v.doc.ev[q]; if (e9 && e9.a === "zfx") fx[e9.p] = (fx[e9.p] | 0) + 1; }
    st.P.forEach(function (x) { var nf = fx[x.k] | 0; if (!nf || x.over || x.lost != null) return; x.c = Math.max(1, x.c - 6 * nf); x.fx = nf; x.st = C.bucket(x); x.v = C.vitals(v.D, x.p, x.c); });
    if (dk === "x") {
      var x = st.P[0], g = st.P[1], gh = {}; for (var f in g) gh[f] = g[f];
      gh.ghost = true; gh.over = { w: "ok", t: 0 }; gh.st = "ok"; gh.next = []; st.P = [x, gh];   // bed ② of the bay stays empty (never drawn, never tapped)
      if (x.over) st.end = { w: x.over.w === "ok" ? "ok" : "lost", t: x.lost != null ? x.lost : x.fin, pk: x.lost != null ? "a" : null, ok: x.lost != null ? [] : ["a"], lost: x.lost != null ? ["a"] : [] };
      else if (v.amb.next && now >= v.amb.next) st.end = { w: "time", t: v.amb.next, pk: null, ok: [], lost: [] };
      else st.end = st.end && st.end.w === "time" ? st.end : null;
    }
    return st;
  }
  function check(D, doc, dk, pk, a, opt, uid, now, ai) {
    if (WK_RE.test(dk)) return { st: { amb: null, walk: 1 }, r: walkCheck(D, doc, dk, a, uid, now) };              // 29d 🪑 a walk-in: triage only
    if (ARR[dk] && now < arrival(C.keyOf(doc && doc.day) || C.dayKey(now), dk)) return { st: null, r: { k: "noamb" } };   // 29e: not arrived yet
    var st = state(D, doc, dk, now, ai); if (!st) return { st: null, r: { k: "noamb" } };
    if (BZ_RE.test(a)) return { st: st, r: bonus(st, doc, dk, pk, a, uid) };                          // 29e 💵 a routine / follow-up of the nurse
    if (TRI_RE.test(a)) {                                                                            // 29d 🏷️ the nurse triages / brings him in
      var tx = st.P[pk === "b" ? 1 : 0]; if (!tx || tx.ghost || st.end) return { st: st, r: { k: "over" } }; if (tx.over) return { st: st, r: { k: "pover", w: tx.over.w, x: tx } };
      return { st: st, r: triage(tx.p, triDk(dk), a, evOf(doc, dk, st.amb && st.amb.i, pk), uid) };
    }
    var r = C.check(st.DK, st, pk, a, opt, uid); return { st: st, r: r };
  }

  /* ---- 29e 💵 the nurse's routines and follow-ups, PAID IN THE SHARED DOC (so they count in the class salary + ranking, rules v22 unchanged):
     one ordinary event on the patient it is about, action «z<code>[digit]» (with the ward prefix like every step), never a step of the
     procedure (the engine ignores an unknown «ok» action; a «neu» one is listed as a mistake) —
     fu ⏰ re-assessed on time +3 · fx ⏰ missed re-assessment −2 (the patient also gets a bit worse: −6 health, see state()) ·
     hh 🧼 hand hygiene at the right moment +1 · hx 🧼 care with unwashed hands −1 · ho🔢 🔄 shift handover scored 1–5 ·
     dc🔢 🚪 discharge with education 1–4 (frees the bed) · fa 👨‍👩‍👦 family question answered +2 · in ⚠️ incident report after his own harm +3 ·
     pk 🧪🩻💊🩸 result / drug / blood fetched from the service +2. Bounded per patient and student (once for most). */
  var BZ_RE = /^z(fu|fx|hh|hx|ho|dc|fa|in|pk)([0-5])?$/, BZ = { fu: 3, fx: -2, hh: 1, hx: -1, fa: 2, "in": 3, pk: 2 }, BZMAX = { fu: 3, fx: 3, hh: 2, hx: 1, ho: 1, dc: 1, fa: 1, "in": 1, pk: 3 };
  function bonus(st, raw, dk, pk, a, uid) {
    var m = BZ_RE.exec(a); if (!m) return { k: "nope" };
    var code = m[1], dg = m[2] == null ? -1 : +m[2], x = st.P[pk === "b" ? 1 : 0];
    if (!x || x.ghost) return { k: "over" };
    if (st.end && st.end.w === "time") return { k: "over" };
    var evs = evOf(raw, dk, st.amb && st.amb.i, pk), same = evs.filter(function (e) { var q = BZ_RE.exec(e.a); return q && q[1] === code && (code === "dc" || e.u === uid); });
    if (same.length >= BZMAX[code]) return { k: "bzmax", code: code };
    var d = BZ[code];
    if (code === "ho" || code === "dc") { if (dg < 1 || dg > (code === "ho" ? 5 : 4)) return { k: "nope" }; d = dg; }
    if (code === "dc" && !(x.over && x.over.w === "ok")) return { k: "nope" };                              // only a stabilised patient goes home
    if (code === "in" && !evs.some(function (e) { return e.u === uid && (e.k === "bad" || e.k === "no") && !BZ_RE.test(e.a); })) return { k: "nope" };
    return { k: d > 0 ? "ok" : "neu", d: d, a: a, bz: code };
  }
  // the routines of one patient as the room shows them → { dc: event|null, fu: n, fx: n, hh: n, fa: bool, inc: bool, pk: n }
  function routines(raw, dk, pk, ai, uid) {
    var o = { dc: null, fu: 0, fx: 0, hh: 0, hx: 0, fa: false, inc: false, pk: 0, ho: 0 };
    evOf(raw, dk, ai, pk).forEach(function (e) { var q = BZ_RE.exec(e.a); if (!q) return; var c = q[1];
      if (c === "dc") { if (!o.dc) o.dc = e; return; } if (c === "fx") { o.fx++; return; } if (uid && e.u !== uid) return;
      if (c === "fa") o.fa = true; else if (c === "in") o.inc = true; else o[c] = (o[c] | 0) + 1; });
    return o;
  }

  /* ---- 29d 🪑 the waiting room + 🏷️ triage (Abdullah, Nov 4 7:15–7:17 AM «يكون المرضى قاعدين أو ناطرين لبين ما ييجي الممرّض… ويدخّلهم
     للقسم المناسب» + «مش دغري… بقلب الأقسام… الممرّض هو يلّي بفوّتن لجوّا»): every bed starts EMPTY. The two patients of each department
     case sit in the waiting room from the moment their case starts; an ambulance patient waits at the ER entrance on his stretcher; a few
     walk-ins a day come for triage only. A student brings one in with ONE event on that patient: «tg<priority 1–4><ward e|k|n|r|s|g>»
     (stored with the department prefix like every step — rules v22: ≤ 20 chars). The right ward = he is IN (whatever the priority);
     right ward + right priority (or one step more urgent) = ok +4; right ward, wrong priority = −1 (he goes in anyway); wrong ward = −2 and he
     keeps waiting. Nobody moves a patient by himself; a waiting patient keeps getting worse by the same engine (live-core unchanged). */
  var TRI_RE = /^tg([1-4])([eknrsgpm])$/, WK_RE = /^w\d\d$/, TRIK = ["e", "k", "n", "r", "s", "g", "p", "m"], WK_FROM = 9 * 60, WK_TO = 22 * 60, WK_GAP = 40, WSTAY = 45 * MIN, TMAX = 3;
  function triDk(dk) { return dk === "er" || dk === "x" ? "e" : dk; }
  function wardOf(c) { return c === "e" ? "er" : c; }
  // the priority a patient should get, from his arrival signs (🌐 the usual 4-level triage; each sign is one of his lessons' red flags)
  function prio(p) {
    if (p && p.pr) return { pr: p.pr, sig: [] };
    var v = (p && p.vit) || {}, r = (p && p.rate) | 0, sig = [];
    function f(c, k) { if (c && sig.indexOf(k) < 0) sig.push(k); return !!c; }
    var a1 = [f(v.gcs <= 8, "gcs"), f(v.sys < 90, "sys"), f(v.spo2 < 90, "spo2"), f(v.fr >= 30 || v.fr < 8, "fr"), f(v.fc >= 130 || v.fc < 45, "fc"), f(v.t >= 40, "t")].some(Boolean);
    if (a1 || r >= 8) return { pr: 1, sig: sig.length ? sig : ["rate"] };
    var a2 = [f(v.gcs <= 13, "gcs"), f(v.spo2 < 94, "spo2"), f(v.sys >= 180, "sys"), f(v.fc >= 110 || v.fc < 55, "fc"), f(v.fr >= 24, "fr"), f(v.t >= 39, "t")].some(Boolean);
    if (a2 || r >= 6) return { pr: 2, sig: sig.length ? sig : ["rate"] };
    var a3 = [f(v.t >= 38, "t"), f(v.fc > 100, "fc"), f(v.sys >= 160, "sys"), f(v.spo2 < 95, "spo2")].some(Boolean);
    if (a3 || r >= 4) return { pr: 3, sig: sig.length ? sig : ["rate"] };
    return { pr: 4, sig: [] };
  }
  // the events of ONE patient of one bed group, without the department prefix, oldest first
  function evOf(raw, dk, ai, pk) {
    var p = pre(dk, ai), out = [], ev = (raw && raw.ev) || {};
    for (var n in ev) { var e = ev[n]; if (!e || e.p !== pk) continue; var a = String(e.a || "");
      if (dk === "er") { if (ns(a)) continue; } else { if (a.indexOf(p) !== 0) continue; a = a.slice(p.length); }
      out.push({ t: +e.t || 0, u: e.u, n: e.n, a: a, k: e.k, d: e.d | 0, i: +n }); }
    return out.sort(function (x, y) { return x.t - y.t || x.i - y.i; });
  }
  // who brought him in (the first triage to the right ward) → { t, u, n, pr } or null (still waiting)
  function admitted(evs, right) {
    for (var i = 0; i < evs.length; i++) { var m = TRI_RE.exec(evs[i].a); if (m && m[2] === right && (evs[i].k === "ok" || evs[i].k === "neu")) return { t: evs[i].t, u: evs[i].u, n: evs[i].n, pr: +m[1] }; }
    return null;
  }
  function adm(raw, dk, pk, ai) { return admitted(evOf(raw, dk, ai, pk), triDk(dk)); }
  function triage(p, right, a, evs, uid) {
    var m = TRI_RE.exec(a); if (!m) return { k: "nope" };
    var inn = admitted(evs, right); if (inn) return { k: "adm", by: inn };
    var mine = evs.filter(function (e) { return e.u === uid && TRI_RE.test(e.a); }).length;
    if (mine >= TMAX) return { k: "trimax", n: mine };
    var pc = +m[1], dc = m[2], P = prio(p), want = P.pr, okD = dc === right, okP = pc === want || pc === want - 1;
    var t = { okD: okD, okP: okP, want: want, sig: P.sig, right: right, pc: pc, dc: dc, over: okP && pc < want };
    if (!okD) return { k: "neu", d: -2, a: a, tri: t };
    if (!okP) return { k: "neu", d: -1, a: a, tri: t, inn: 1 };
    return { k: "ok", d: 4, a: a, tri: t, inn: 1 };
  }
  // 🚶 the walk-ins of a day: 4–6 between 09:00 and 22:00 Beirut, ≥ 40 min apart, each waits ≤ 45 min, the same on every phone
  function pad2(i) { return (i < 10 ? "0" : "") + i; }
  function walkIns(D, key) {
    var B = (D && D.walk) || []; if (!B.length) return [];
    var r = C.rng(C.hash("wk-" + key)), c = 4 + Math.floor(r() * 3), slack = WK_TO - WK_FROM - WK_GAP * (c - 1), offs = [], t0 = C.dayStart(key);
    for (var i = 0; i < c; i++) offs.push(Math.floor(r() * (slack + 1)));
    offs.sort(function (a, b) { return a - b; });
    var ids = shuffle(B.map(function (b, j) { return j; }), C.rng(C.hash("wkp-" + key)));
    var out = offs.map(function (o, j) { var t = t0 + (WK_FROM + o + WK_GAP * j) * MIN; return { i: j + 1, dk: "w" + pad2(j + 1), t: t, until: t + WSTAY, b: B[ids[j % ids.length]] }; });
    // 29h 🏥 (Abdullah, Nov 4 9:38 PM «خلصت الحالة عم يتقفل كل شي»): the hospital never closes — once today's 🚑 ER case is over, a walk-in
    // comes every AFT_GAP min (08:00–24:00 slots, the same on every phone: «w11»… «w58», still «w\d\d_tg…» = rules v22 unchanged);
    // a slot only shows (and can only be triaged) while the ER case of the day is finished (erDone)
    var r2 = C.rng(C.hash("wkx-" + key)), ids2 = shuffle(B.map(function (b, j) { return j; }), C.rng(C.hash("wkxp-" + key)));
    for (var s = 0; s < AFT_N; s++) { var tx = t0 + (AFT_FROM + s * AFT_GAP + Math.floor(r2() * 6)) * MIN; out.push({ i: AFT_I0 + s, dk: "w" + pad2(AFT_I0 + s), t: tx, until: tx + WSTAY, b: B[ids2[s % ids2.length]], aft: 1 }); }
    return out;
  }
  var AFT_FROM = 8 * 60, AFT_GAP = 20, AFT_N = 48, AFT_I0 = 11;
  function walkAt(L, dk) { for (var i = 0; i < L.length; i++) if (L[i].dk === dk) return L[i]; return null; }
  function erDone(D, raw, now) { var s = null; try { s = state(D, raw, "er", now); } catch (e) { s = null; } return !!(s && s.end); }
  function walkCheck(D, doc, dk, a, uid, now) {
    var key = C.keyOf(doc && doc.day) || C.dayKey(now), L = walkIns(D, key), x = walkAt(L, dk);
    if (!x || now < x.t) return { k: "noamb" };
    if (x.aft && !erDone(D, doc, now) && !admitted(evOf(doc, dk, 0, "a"), x.b.dk)) return { k: "noamb" };
    var evs = evOf(doc, dk, 0, "a"), inn = admitted(evs, x.b.dk); if (inn) return { k: "adm", by: inn };
    if (now > x.until) return { k: "gone" };
    return triage(x.b, x.b.dk, a, evs, uid);
  }
  // everybody waiting at «now»: the patients of each department case (in the chairs) + the ambulance patient (at the door) + the walk-ins
  // → [{ dk, ai, pk, p, since, kind: "case" | "amb" | "walk", st (his bed state) }] — a finished or lost one is not waiting any more
  function waiting(D, raw, now, keys) {
    var key = C.keyOf(raw && raw.day) || C.dayKey(now), out = [];
    (keys || WARDS).forEach(function (dk) {
      if (dk !== "er" && !cases(D, dk).length) return; if (now < arrival(key, dk)) return;          // 29e: a ward's pair arrives at its own hour
      var st = null; try { st = state(D, raw, dk, now); } catch (e) { st = null; } if (!st || st.end) return;
      st.P.forEach(function (x) { if (x.ghost || x.over || adm(raw, dk, x.k)) return; out.push({ dk: dk, ai: 0, pk: x.k, p: x.p, x: x, since: st.from, kind: "case", cs: st.cs }); });
    });
    var A = ambNow(key, now);
    if (A.cur) { var sx = null; try { sx = state(D, raw, "x", now); } catch (e) { sx = null; }
      if (sx && !sx.end) { var xa = sx.P[0]; if (!xa.over && !adm(raw, "x", "a", A.cur.i)) out.push({ dk: "x", ai: A.cur.i, pk: "a", p: xa.p, x: xa, since: A.cur.t, kind: "amb", cs: sx.cs }); } }
    var done = null;
    walkIns(D, key).forEach(function (w) {
      if (now < w.t || now > w.until) return; if (w.aft && !(done = done == null ? erDone(D, raw, now) : done)) return; if (admitted(evOf(raw, w.dk, 0, "a"), w.b.dk)) return;
      out.push({ dk: w.dk, ai: 0, pk: "a", p: w.b, x: null, since: w.t, kind: "walk", w: w });
    });
    return out;
  }
  function floorOf(dk) { if (dk === "x" || WK_RE.test(dk)) return 0; for (var f = 0; f < FLOORS.length; f++) if (FLOORS[f].indexOf(dk) > -1) return f; return 0; }
  function isSvc(dk) { return !!SVC[dk]; }
  function isOpen(dk) { return ALL.indexOf(dk) > -1; }          // 29e: every room is walkable (a «🔜» room is drawn, labelled, empty)
  // 29e: a ward whose bank is empty becomes a «🔜» room (drawn, walkable, no case) — called once the bank is loaded
  function prep(D) { ["r", "s", "g", "p", "m"].forEach(function (dk) { if (!cases(D, dk).length) { SOON[dk] = 1; SVC[dk] = 1; } else { delete SOON[dk]; delete SVC[dk]; } }); return SOON; }
  // 👥 presence: the department rides in the 2 low bits of x (where he stands) and tx (where he walks to) — rules v22 fields unchanged
  function penc(v, dk) { v = Math.max(0, Math.min(356, Math.round(+v || 0))); return (v & ~3) | (CODE[dk] | 0); }
  function pdec(v) { v = Math.round(+v || 0); return { v: v & ~3, dep: KEYS[v & 3] }; }
  return { KEYS: KEYS, CODE: CODE, INFO: INFO, PRE_RE: PRE_RE, AMB_FROM: AMB_FROM, AMB_TO: AMB_TO, AMB_GAP: AMB_GAP,
    ref: ref, cases: cases, pick: pick, deptCase: deptCase, ambTimes: ambTimes, ambNow: ambNow, ambCase: ambCase, pre: pre, ns: ns, enc: enc,
    bankFor: bankFor, view: view, state: state, check: check, penc: penc, pdec: pdec,
    ALL: ALL, FLOORS: FLOORS, FLN: FLN, SOON: SOON, SVC: SVC, TRI_RE: TRI_RE, WK_RE: WK_RE, TRIK: TRIK, WSTAY: WSTAY, TMAX: TMAX, triDk: triDk, wardOf: wardOf, prio: prio,
    evOf: evOf, admitted: admitted, adm: adm, triage: triage, walkIns: walkIns, walkCheck: walkCheck, waiting: waiting, floorOf: floorOf, isSvc: isSvc, isOpen: isOpen,
    WARDS: WARDS, ARR: ARR, prep: prep, arrival: arrival, BZ_RE: BZ_RE, BZ: BZ, BZMAX: BZMAX, bonus: bonus, routines: routines };
})(LiveCore);
/* ==/dept-core== */

  if (typeof window !== "undefined") { window.LiveCore = LiveCore; window.LiveDept = LiveDept; }
  if (!d || !d.addEventListener) return;
  var V = "20261029l", PK = "nursin_live_prev_v1", HK = "nursin_live_hist_v1", CK = "nursin_live_cool_v1", W = w;
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
        X.A = A; X.I = I; X.S = E.stations || null; D = X; try { LiveDept.prep(D); } catch (e) {} res(D);
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
    if (!p) { p = { day: id, c: LiveCore.pick(D, today()), n: 0, ev: {}, pts: {}, at0: Date.now() }; lsSet(PK, p); }
    else if (!p.at0) {                      // 28v: a preview from before at0 existed → its clock starts when it was first played (or now)
      var t = 0; for (var k in (p.ev || {})) { var et = +(p.ev[k] || {}).t || 0; if (et && (!t || et < t)) t = et; }
      p.at0 = t || Date.now(); lsSet(PK, p);
    }
    return p;
  }
  function conv(snapData) {        // Firestore → plain numbers (timestamps in ms)
    var x = snapData || {}, o = { day: x.day, c: x.c, n: x.n | 0, ev: {}, pts: {} };
    var ms = function (t) { return t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +t || Date.now(); };
    if (x.at0) o.at0 = ms(x.at0);          // 28v: when the case was created (worker v11 / the first student) — the patients' clock starts there
    for (var k in (x.ev || {})) { var e = x.ev[k]; if (e) o.ev[k] = { t: ms(e.t), u: e.u, n: e.n, p: e.p, a: e.a, k: e.k, d: e.d, o: e.o }; }
    for (var u in (x.pts || {})) { var r = x.pts[u] || {}; o.pts[u] = { n: r.n, p: r.p | 0, ok: r.ok | 0, no: r.no | 0, t: ms(r.t) }; }
    return o;
  }
  function emit() { var st = state(); subs.forEach(function (f) { try { f(st, mode); } catch (e) { console.warn("live", e); } }); }
  var born = {};                            // 28v: a case nobody created yet has not started — its clock starts when we first saw it missing
  function bornAt(id) { return born[id] || (born[id] = Date.now()); }
  // 28z 🏥: the student stands in ONE department (dep: er | k | n | x = 🛏️ سرير الإسعاف); state() is that department's case,
  // stateOf(dk) any department's, hospital() all of them + the ambulances (the floor strip, the home card)
  var dep = "er";
  function rawDoc() { var id = LiveCore.docId(today()); return doc || { day: id, c: LiveCore.pick(D, today()), n: 0, ev: {}, pts: {}, at0: bornAt(id) }; }
  function stateOf(dk) { if (!D) return null; try { return LiveDept.state(D, rawDoc(), dk || "er", Date.now()); } catch (e) { console.warn("live dept", dk, e); return null; } }
  // 29d: in a service room (🪑 الانتظار · 💰 المحاسبة) there is no case of its own — the room still gets the ER state (so every card keeps working), tagged with where he stands
  function state() { if (!D) return null; if (LiveDept.isSvc(dep)) { var s0 = stateOf("er"); if (s0) { s0.dep = dep; s0.svc = 1; } return s0; } return stateOf(dep) || stateOf("er"); }
  function hospital() {
    if (!D) return null; var now = Date.now(), A = LiveDept.ambNow(today(), now), o = { er: stateOf("er"), k: stateOf("k"), n: stateOf("n"), x: A.cur ? stateOf("x") : null, amb: A, now: now };
    ["r", "s", "g", "p", "m"].forEach(function (k) { o[k] = LiveDept.SVC[k] ? null : stateOf(k); });      // 29e 🩺 🔪 👴 👶 🤰
    try { o.wait = LiveDept.waiting(D, rawDoc(), now); } catch (e) { o.wait = []; }      // 29d 🪑 who is waiting to be brought in
    return o;
  }
  function setDep(dk) { if (LiveDept.ALL.indexOf(dk) < 0 || !LiveDept.isOpen(dk)) dk = "er"; if (dk === "x" && !LiveDept.ambNow(today(), Date.now()).cur) dk = "er"; dep = dk; emit(); return dep; }
  function admOf(dk, pk, ai) { if (!D) return null; return LiveDept.adm(rawDoc(), dk, pk, ai); }
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
        if (s.exists()) doc = conv(s.data({ serverTimestamps: "estimate" })); else doc = { day: id, c: LiveCore.pick(D, today()), n: 0, ev: {}, pts: {}, at0: bornAt(id) };
        setMode("shared"); emit();
      }, function (e) { console.warn("nursin live:", e && e.code); goPreview(e && e.code === "permission-denied" ? "rules" : "net"); });
    } catch (e) { goPreview("net"); }
  }
  function start(cb) {
    if (cb && subs.indexOf(cb) < 0) subs.push(cb);   // 29l: never twice
    return load().then(function (X) {
      if (!X) { setMode("error"); emit(); return null; }
      if (mode === "loading" || mode === "error") connect(); else emit();
      tickOn();
      return X;
    });
  }
  function off(cb) { subs = subs.filter(function (f) { return f !== cb; }); }
  // 29l 🔥: the room asks for a pause while the page is hidden (no live listener, no 30 s timer) and a resume when it is back
  var paused = false;
  function tickOn() { if (!tick) tick = setInterval(function () {
        if (doc && doc.day !== LiveCore.docId(today())) { if (mode === "shared") { if (unsub) { unsub(); unsub = null; } api = null; connect(); } else doc = prevDoc(); }
        emit();
      }, 30000); }
  function pause() { if (tick) { clearInterval(tick); tick = 0; } if (unsub) { try { unsub(); } catch (e) {} unsub = null; paused = true; } }
  function resume() { if (paused) { paused = false; api = null; connect(); } if (subs.length) tickOn(); }
  d.addEventListener("nursin:auth", function () { if (D && (mode === "preview" || mode === "loading")) { if (fb()) connect(); else if (mode === "loading") goPreview("out"); } });
  /* ---- 🧊 a student who got a field wrong waits 3 min before trying THAT field again (no brute force) ---- */
  function cool(pk, a) { var c = lsGet(CK) || {}, k = today() + pk + a, t = c[k] | 0; return t > Date.now() ? t : 0; }
  function setCool(pk, a) { var c = lsGet(CK) || {}, t = today(); for (var k in c) if (k.indexOf(t) !== 0) delete c[k]; c[t + pk + a] = Date.now() + 18e4; lsSet(CK, c); }
  var busy = false;
  // one step by this student on patient pk → { k, d, why, s, ... } (the transaction refuses a step someone else did a second earlier)
  function act(pk, a, opt, again, dk0) {
    if (!D || busy) return Promise.resolve({ k: "busy" });
    var dk = dk0 || dep, ck = (dk === "er" ? "" : dk) + pk;      // 28z: the step belongs to the department the student stands in
    if (a.indexOf("f_") === 0) { var cl = cool(ck, a); if (cl) return Promise.resolve({ k: "wait", until: cl }); }
    var M = me(), WR = { ok: 1, bad: 1, ord: 1, neu: 1, no: 1 };
    function after(r) { busy = false; if (r.k === "no") setCool(ck, a); if (r.k === "ok" && mode === "shared" && W.NursinStudy && W.NursinStudy.activity) try { W.NursinStudy.activity("game", r.d, "🔴 حالة لايف"); } catch (e) {} return r; }
    busy = true;
    if (mode !== "shared") {
      var cr = LiveDept.check(D, doc, dk, pk, a, opt, M.uid, Date.now()), r = cr.r;
      if (WR[r.k]) {
        if (doc.n >= LiveCore.MAXEV) { busy = false; return Promise.resolve({ k: "full" }); }
        var en = LiveDept.enc(dk, cr.st.amb && cr.st.amb.i, r);
        doc.n++; var e = { t: Date.now(), u: M.uid, n: M.name, p: pk, a: en.a, k: en.k, d: r.d }; if (r.o != null) e.o = r.o; doc.ev[doc.n] = e;
        var pr = doc.pts[M.uid] || { n: M.name, p: 0, ok: 0, no: 0 }; doc.pts[M.uid] = { n: M.name, p: pr.p + r.d, ok: pr.ok + (r.k === "ok" ? 1 : 0), no: pr.no + (r.k === "ok" ? 0 : 1), t: Date.now() };
        lsSet(PK, doc); emit();
      }
      return Promise.resolve(after(r));
    }
    var A = api, fs = A.fs, id = LiveCore.docId(today()), ref = fs.doc(A.db, "live", id), res = null;
    var mkErr = "";                          // 28v: a failed creation is no longer swallowed — the student hears why (see the room's result())
    var mk = function () { return fs.setDoc(ref, { day: id, c: (doc && doc.c) || LiveCore.pick(D, today()), n: 0, ev: {}, pts: {}, at0: fs.serverTimestamp() }).catch(function (e) { mkErr = (e && e.code) || "err"; console.warn("nursin live create", mkErr); }); };
    return (doc && doc.n ? Promise.resolve() : fs.getDoc(ref).then(function (s) { if (!s.exists()) return mk(); }, function () {})).then(function () {
      return fs.runTransaction(A.db, function (tx) {
        return tx.get(ref).then(function (s) {
          if (!s.exists()) { res = { k: "retry", code: mkErr }; return; }
          var cur = conv(s.data()), cr = LiveDept.check(D, cur, dk, pk, a, opt, M.uid, Date.now()), r = cr.r; res = r;
          if (!WR[r.k]) return;
          if (cur.n >= LiveCore.MAXEV) { res = { k: "full" }; return; }
          var prev = (s.data().pts || {})[M.uid];
          if (prev && prev.t && prev.t.toMillis && Date.now() - prev.t.toMillis() < 2500) { res = { k: "slow", ms: 2600 - (Date.now() - prev.t.toMillis()) }; return; }
          var en = LiveDept.enc(dk, cr.st.amb && cr.st.amb.i, r), n = cur.n + 1, e = { t: fs.serverTimestamp(), u: M.uid, n: M.name, p: pk, a: en.a, k: en.k, d: r.d }, pr = cur.pts[M.uid] || { p: 0, ok: 0, no: 0 }, up = { n: n };
          if (r.o != null) e.o = r.o;
          up["ev." + n] = e; up["pts." + M.uid] = { n: M.name, p: pr.p + r.d, ok: pr.ok + (r.k === "ok" ? 1 : 0), no: pr.no + (r.k === "ok" ? 0 : 1), t: fs.serverTimestamp() };
          tx.update(ref, up); tx.set(fs.doc(A.db, "live", id, "log", String(n)), e);
        });
      });
    }).then(function () {
      // 28w: the rules keep 2 s between two steps of one student — a quick 2nd answer waits its turn (the room shows «⏳») instead of failing
      if (res && res.k === "slow" && !again) return new Promise(function (r) { setTimeout(r, Math.max(300, Math.min(2600, res.ms | 0))); }).then(function () { busy = false; return act(pk, a, opt, 1, dk); });
      return after(res || { k: "err" });
    }, function (e) {
      busy = false; console.warn("nursin live act", e && e.code);
      if (e && e.code === "permission-denied") {        // a lost race / the 2 s rule (the doc still reads) → once more on fresh data; rules not published → preview
        return fs.getDoc(ref).then(function () { return again ? { k: "denied", code: e.code } : new Promise(function (r) { setTimeout(r, 2600); }).then(function () { return act(pk, a, opt, 1, dk); }); },
          function () { goPreview("rules"); return { k: "rules" }; });
      }
      return { k: "err", code: (typeof navigator !== "undefined" && navigator.onLine === false) ? "offline" : (e && e.code) || "err" };
    });
  }
  function actSafe(pk, a, opt, again, dk0) {  // 28v: never a silent nothing — whatever happens, the room gets an answer to show (29d: + the department, for 🏷️ triage)
    try { return act(pk, a, opt, again, dk0).then(null, function (e) { busy = false; console.warn("nursin live act", e); return { k: "err", code: (e && e.code) || "err" }; }); }
    catch (e) { busy = false; console.warn("nursin live act", e); return Promise.resolve({ k: "err", code: "js" }); }
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
  var STS = { lost: { ic: "💔", ar: "خسرناه", fr: "Décédé" }, ok: { ic: "✅", ar: "استقرّ", fr: "Stabilisé" }, crit: { ic: "🔴", ar: "حرج", fr: "Critique" }, unst: { ic: "🟠", ar: "مش مستقرّ", fr: "Instable" }, impr: { ic: "🟡", ar: "عم يتحسّن", fr: "S'améliore" } };
  function stLabel(k, sex) { var s = STS[k] || STS.unst; return s.ic + " " + (k === "ok" && sex === "f" ? (FR() ? "Stabilisée" : "استقرّت") : T(s)); }
  function left(ms) { ms = Math.max(0, ms); var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h ? (FR() ? h + " h " + (m < 10 ? "0" : "") + m : h + ":" + (m < 10 ? "0" : "") + m) : (FR() ? m + " min" : m + " د"); }
  function leftWords(ms) { var h = Math.floor(Math.max(0, ms) / 36e5); return h >= 1 ? (FR() ? "encore " + h + " h" : "باقي " + h + (h === 1 ? " ساعة" : h === 2 ? " ساعتين" : h <= 10 ? " ساعات" : " ساعة")) : (FR() ? "encore " + Math.ceil(ms / 6e4) + " min" : "باقي " + Math.ceil(ms / 6e4) + " د"); }
  function nextWords(ms) { var tm = Math.max(1, Math.ceil(Math.max(0, ms) / 6e4)), h = Math.floor(tm / 60), m = tm % 60;
    return FR() ? "prochain dans " + (h ? h + " h " + (m < 10 ? "0" : "") + m : m + " min") : "الجاية بعد " + (h ? h + ":" + (m < 10 ? "0" : "") + m : m + " د"); }
  function stepName(s) {
    if (!s) return "";
    if (s.kind === "file") { var F = D.fields[s.f]; return F.ic + " " + T(F); }
    var A = D.A[s.a]; return A ? A.ic + " " + T(A) : s.a;
  }
  var PRN = [null, { ic: "🔴", ar: "فوري", fr: "Immédiat" }, { ic: "🟠", ar: "مستعجل", fr: "Urgent" }, { ic: "🟡", ar: "بيقدر ينطر", fr: "Peut attendre" }, { ic: "🟢", ar: "مش مستعجل", fr: "Non urgent" }];
  function triName(a) { var m = LiveDept.TRI_RE.exec(String(a || "")); if (!m) return ""; var P = PRN[+m[1]], I = LiveDept.INFO[LiveDept.wardOf(m[2])]; return "🏷️ " + (FR() ? "Tri : " : "فرز: ") + P.ic + " " + T(P) + " → " + I.ic + " " + T(I.t); }
  var BZN = { fu: ["⏰ إعادة تقييم بوقتها", "⏰ Réévaluation à l'heure"], fx: ["⏰ إعادة تقييم فاتت", "⏰ Réévaluation manquée"], hh: ["🧼 نظافة الإيدين", "🧼 Hygiène des mains"], hx: ["🧼 نسي نظافة الإيدين", "🧼 Hygiène oubliée"],
    ho: ["🔄 تسليم الشفت", "🔄 Relève"], dc: ["🚪 خروج + تثقيف", "🚪 Sortie + éducation"], fa: ["👨‍👩‍👦 جاوب العيلة", "👨‍👩‍👦 Réponse à la famille"], "in": ["⚠️ تقرير حادث", "⚠️ Fiche d'événement"], pk: ["🧾 جاب الطلب من الخدمة", "🧾 Demande récupérée"] };
  function actName(a) { if (a === "hint") return FR() ? "💡 Indice" : "💡 طرف خيط"; var zb = LiveDept.BZ_RE.exec(String(a)); if (zb) return BZN[zb[1]][FR() ? 1 : 0]; if (LiveDept.TRI_RE.test(String(a))) return triName(a); if (String(a).indexOf("f_") === 0) { var F = D.fields[a.slice(2)]; return F ? F.ic + " " + T(F) : a; } var A = D.A[a]; return A ? A.ic + " " + T(A) : a; }
  /* ---- 🏠 the home card «🔴 حالة لايف · باقي X ساعات», right ABOVE «🧭 مسار اليوم» (Abdullah's wish) ---- */
  function homeCard(st) {
    var box = d.querySelector("#hz .hzlivew"); if (!box || !st) return;
    var Hh = hospital() || {}; st = Hh.er || st; var E0 = st, cs = st.cs, ended = st.end, nm = function (x) { return T(x.p.nm).split(" ")[0]; };
    function pills(S) { var ended = S && S.end; return S ? S.P.map(function (x) { if (x.ghost) return "";
      if (!x.over && !ended && !LiveDept.adm(rawDoc(), S.dep || "er", x.k, S.amb && S.amb.i)) return '<span class="hzlvp wait"><b>🛏️ ' + esc(nm(x)) + "</b> " + (FR() ? "🪑 attend" : "🪑 ناطر") + "</span>";   // 29d: still in the waiting room
      return '<span class="hzlvp ' + x.st + (x.over && !ended ? " fin" : "") + '"><b>🛏️ ' + esc(nm(x)) + "</b> " + esc(stLabel(x.st, x.p.sex)) + "</span>"; }).join("") : ""; }
    // 28v: an ended case says so plainly — «🏁 انتهت الحالة» + when the next one starts (never a card that still looks running)
    var top = ended ? (FR() ? "🏁 Cas terminé" : "🏁 انتهت الحالة") + " · " + nextWords(st.t1 - Date.now()) : leftWords(st.t1 - Date.now());
    // 👥 how many students are in the hospital right now (assets/livepres.js; only when the case is shared — before rules v22 nothing shows)
    var PR = W.LivePresRoom, ppl = mode === "shared" && PR ? PR.homeCount(function () { homeCard(state()); }) : -1;
    if (ppl > 0) top += " · 👥 " + ppl;
    var soon = mode === "preview" && why === "rules" ? '<small class="hzlvs">' + (FR() ? "🔴 Le cas partagé arrive bientôt — essaie-le maintenant" : "🔴 الحالة اللايف رح تشتغل قريباً — جرّبها هلّق") + "</small>" : "";
    // 28z 🏥 every department in one line each (its case + its two patients), then the ambulances (the last one; never the exact next time)
    var I = LiveDept.INFO, rows = ["er", "k", "n"].map(function (k) { var S = k === "er" ? E0 : Hh[k]; if (!S) return "";
      return '<span class="hzlvd"><b>' + I[k].ic + " " + esc(T(I[k].t)) + '</b><span class="hzlvc">' + esc(S.cs.ic + " " + T(S.cs.t)) + '</span><span class="hzlvps">' + (S.end ? '<span class="hzlvp ok fin">🏁 ' + (FR() ? "Terminé" : "خلصت") + "</span>" : pills(S)) + "</span></span>"; }).join("");
    // 29e: the new wards in ONE line (only the ones whose patients have arrived today): «🩺 2 · 🔪 1 · 👴 ✅»
    var nw = ["r", "s", "g", "p", "m"].map(function (k) { var S = Hh[k]; if (!S || !S.P || Date.now() < LiveDept.arrival(today(), k)) return ""; var left = S.P.filter(function (x) { return !x.ghost && !x.over; }).length;
      return I[k].ic + " " + (S.end || !left ? "✅" : left); }).filter(Boolean);
    if (nw.length) rows += '<span class="hzlvd"><b>' + (FR() ? "🏥 Autres services" : "🏥 باقي الأقسام") + '</b><span class="hzlvc">' + esc(nw.join(" · ")) + "</span></span>";
    var A = Hh.amb, amb = "";
    if (A) {
      var X = Hh.x, last = A.cur ? (FR() ? "🚑 Dernière ambulance : " : "🚑 آخر إسعاف: ") + fmtHM(A.cur.t) + (X && X.P[0] ? " · " + nm(X.P[0]) + " " + stLabel(X.P[0].st, X.P[0].p.sex) : "") : "";
      var nx = A.next ? (A.next - Date.now() < 45 * 6e4 ? (FR() ? "🚨 Une ambulance arrive bientôt !" : "🚨 في إسعاف جاية قريباً!") : (FR() ? "🚨 D'autres ambulances arrivent aujourd'hui, à l'improviste" : "🚨 في إسعافات جاية اليوم بوقت مش معروف")) : "";
      amb = '<span class="hzlva">' + esc([last, nx].filter(Boolean).join(" · ") || (FR() ? "🚑 Pas d'ambulance pour l'instant" : "🚑 ما إجت إسعاف بعد")) + "</span>";
    }
    var h = '<a class="hzlive hzhosp' + (ended ? " end" : "") + '" href="games.html#live" data-nofr>' +
      '<span class="hzlvh"><b>' + (FR() ? "🏥 L'hôpital · 🔴 Cas en direct" : "🏥 المستشفى · 🔴 حالة لايف") + "</b><span class=\"hzlvt\"> · " + esc(top) + "</span></span>" +
      rows + amb + soon + (Hh.wait && Hh.wait.length && !ended ? '<span class="hzlvw">' + esc(FR() ? "🪑 " + Hh.wait.length + " patient(s) attendent en salle d'attente — entre les faire entrer" : "🪑 في " + Hh.wait.length + (Hh.wait.length === 1 ? " مريض ناطر" : Hh.wait.length === 2 ? " مريضين ناطرين" : " مرضى ناطرين") + " بالانتظار — فوت فوّتن") + "</span>" : "") +
      '<span class="hzlvgo">' + (ended ? (FR() ? "📋 Voir les bonnes étapes ←" : "📋 شوف الخطوات الصح ←") : (FR() ? "🏥 Entre et soigne ←" : "🏥 فوت ساعد ←")) + "</span></a>";
    if (box.innerHTML !== h) box.innerHTML = h;
  }
  function fmtHM(t) { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)); } catch (e) { return ""; } }
  function homeInit() {
    var tries = 0;
    (function wait() {
      var box = d.querySelector("#hz .hzlivew");
      if (!box) { if (tries++ < 40) setTimeout(wait, 250); return; }
      var go = function () { start(function (st) { homeCard(st); }); };
      if (W.requestIdleCallback) W.requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 600);
    })();
  }
  W.LiveCase = { dep: function () { return dep; }, setDep: setDep, stateOf: stateOf, hospital: hospital, admOf: admOf, triName: triName, PRN: PRN, load: load, start: start, off: off, pause: pause, resume: resume, act: actSafe, actRaw: act, nextWords: nextWords, state: state, mode: function () { return mode; }, why: function () { return why; }, me: me, D: function () { return D; },
    archive: archive, pushOn: pushOn, setPush: setPush, stLabel: stLabel, left: left, leftWords: leftWords, stepName: stepName, actName: actName, T: T, esc: esc, FR: FR, homeCard: homeCard,
    cool: cool, PK: PK, HK: HK, preview: goPreview,
    raw: function () { return D ? rawDoc() : null; } };   // 29b 📒 the whole day doc (every department) — assets/caselog.js builds each student's «سجل حالاتي» from it
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { if (d.getElementById("hz")) homeInit(); }); else if (d.getElementById("hz")) homeInit();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
