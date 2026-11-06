/* 📒 «سجل حالاتي» — 29b (Abdullah, Nov 3 2026 9:54 PM: «بدي إنه كل حالة منحلّها بالمشفى، بس تخلص، تنحط الخطوات الصحيحة بسجل عند كل
   مستخدم جرّب حل»). Every patient of the 🏥 hospital (🚑 الطوارئ · 🫀 القلب · 🧠 الأعصاب · 🛏️ every ambulance) whose own case finished
   (✅ stabilised · 💔 lost · ⏰ the day / the bay ran out) becomes an entry in the log of EACH student who really acted on him (a 💡 hint
   alone does not count): the story, the ordered «📋 الخطوات الصح» with the why of each, and his own steps beside them (✅ / ❌ / ⚠️ / ⏭️).
   Built from the shared day doc live/{YYYYMMDD} itself (rules v22, nothing new is written there), so a student who was away when his
   patient finished gets the entry on his next visit (the last 10 days are caught up). Stored on the phone (nursin_caselog_v1) and, signed
   in, copied to his own users/{uid}/srs/main as packed «lg0…lg3» keys next to the 🔁 «z0…» keys (rules v22: ≤ 400 keys, values free). */
(function (w, d) {
/* ==log-core== pure (node-tested): the entries a day doc gives one student */
var LogCore = (function () {
  var MAXE = 400, SYNC = 120, PER = 30, KEYS = 4, DAYS = 10;
  function deps(LD, key, now) {                // every bed group of the day that existed at «now»: ER, 🫀, 🧠, then each arrived ambulance
    var out = [{ dk: "er", ai: 0 }, { dk: "k", ai: 0 }, { dk: "n", ai: 0 }], T = LD.ambTimes(key);
    for (var i = 0; i < T.length; i++) if (T[i] <= now) out.push({ dk: "x", ai: i + 1 });
    return out;
  }
  function gid(dk, ai) { return dk === "x" ? "x" + ai : dk; }
  // raw = the whole shared doc of one day (every department's events); uids = this student's ids (signed in: his uid; preview: "me")
  function build(LC, LD, D, raw, uids, now) {
    var key = LC.keyOf(raw && raw.day); if (!key || !D) return [];
    var out = [], id0 = LC.docId(key), mine = function (u) { return uids.indexOf(u) > -1; };
    deps(LD, key, now).forEach(function (g) {
      var st = null; try { st = LD.state(D, raw, g.dk, now, g.ai || undefined); } catch (e) { st = null; }
      if (!st) return;
      st.P.forEach(function (x) {
        if (!x || x.ghost) return;
        var my = st.ev.filter(function (e) { return e.p === x.k && mine(e.u); });
        if (!my.some(function (e) { return e.a !== "hint"; })) return;          // only the students who ACTED on this patient
        var o = x.over ? x.over.w : st.end ? "time" : null; if (!o) return;     // his own case is not over yet
        var t = x.over ? (x.over.t || (st.end && st.end.t) || now) : st.end.t;
        var s1 = [], s2 = {};
        x.L.forEach(function (s) { var dn = x.done[s.id]; if (!dn) return; if (mine(dn.u)) s1.push(s.id); else s2[s.id] = String(dn.n || "").split(" ")[0].slice(0, 20); });
        var pts = 0; my.forEach(function (e) { pts += e.d | 0; });
        out.push({ v: 1, id: id0 + "." + gid(g.dk, g.ai) + "." + x.k, day: key, dk: g.dk, ai: g.ai | 0, c: st.cs.id, erc: raw.c || "", pk: x.k, o: o, t: +t || now,
          pts: pts, s1: s1, s2: s2, my: my.map(function (e) { return [e.a, e.k, e.d | 0, e.o == null ? null : e.o | 0, e.t]; }), u: my[0].u, at: now });
      });
    });
    return out;
  }
  // the case + patient + ordered steps of an entry, rebuilt from the bank (DK = the bank that department plays with, for the dossier answers)
  function ctx(LC, LD, D, en) {
    var cs = null, DK = D;
    if (en.dk === "er") cs = LC.caseById(D, en.c);
    else if (en.dk === "x") { cs = LD.ambCase(D, en.day, en.ai, en.erc || LC.pick(D, en.day)); DK = LD.bankFor(D, cs); }
    else { LD.cases(D, en.dk).forEach(function (c) { if (c.id === en.c) cs = c; }); if (cs) DK = LD.bankFor(D, cs); }
    if (!cs) return null;
    var p = cs.pts[en.pk === "b" ? 1 : 0]; if (!p) return null;
    return { cs: cs, p: p, DK: DK, L: LC.steps(DK, cs, p) };
  }
  // his steps against the right ones: each right step ✅ (he did it) · 👥 (a classmate did it) · ⏭️ (nobody); his own acts ✅ / ❌ (harmful,
  // wrong answer) / ⚠️ (not now, not needed) / 💡 (a paid hint)
  function compare(L, en) {
    var s1 = {}, n = { ok: 0, bad: 0, warn: 0, miss: 0, team: 0, hint: 0 };
    (en.s1 || []).forEach(function (k) { s1[k] = 1; });
    var steps = L.map(function (s) { var m = s1[s.id] ? "me" : (en.s2 && en.s2[s.id] != null) ? "team" : "miss"; n[m === "me" ? "ok" : m]++; return { s: s, m: m, by: m === "team" ? en.s2[s.id] : "" }; });
    var acts = (en.my || []).map(function (e) {
      var k = e[1], m = e[0] === "hint" ? "hint" : k === "ok" ? "ok" : (k === "bad" || k === "no") ? "bad" : "warn";
      if (m !== "ok") n[m]++;
      return { a: e[0], k: k, d: e[2] | 0, o: e[3], t: e[4], m: m };
    });
    return { steps: steps, acts: acts, n: n };
  }
  function filter(list, f) {
    f = f || {};
    return list.filter(function (e) { return (!f.dk || f.dk === "all" || e.dk === f.dk) && (!f.o || f.o === "all" || e.o === f.o); })
      .sort(function (a, b) { return (b.t || 0) - (a.t || 0) || (a.id < b.id ? 1 : -1); });
  }
  function merge(store, list) {               // → the ids that are new; an entry that changed (e.g. a later catch-up) is refreshed, his 🔁 mark kept
    var added = [];
    list.forEach(function (e) {
      var o = store[e.id];
      if (!o) { store[e.id] = e; added.push(e.id); return; }
      if (o.my && e.my && o.my.length === e.my.length && o.o === e.o && (o.s1 || []).length === (e.s1 || []).length) return;
      e.srs = o.srs; e.at = o.at || e.at; store[e.id] = e;
    });
    var ks = Object.keys(store);
    if (ks.length > MAXE) ks.sort(function (a, b) { return (store[a].t || 0) - (store[b].t || 0); }).slice(0, ks.length - MAXE).forEach(function (k) { delete store[k]; });
    return added;
  }
  /* ☁️ the account copy: «lg0…lg3» strings next to the 🔁 «z…» keys of users/{uid}/srs/main — one entry a line:
     id|case|ercase|outcome|t36|pts|mine.steps|team.steps|a~k~d~o~t36,…  (names of the classmates stay on the phone) */
  function pack(store) {
    var list = filter(Object.keys(store).map(function (k) { return store[k]; })).slice(0, SYNC), out = {};
    for (var i = 0; i < KEYS; i++) out["lg" + i] = list.slice(i * PER, (i + 1) * PER).map(function (e) {
      return [e.id, e.c, e.erc || "", e.o, Math.round(e.t || 0).toString(36), e.pts | 0, (e.s1 || []).join("."), Object.keys(e.s2 || {}).join("."),
        (e.my || []).map(function (m) { return [m[0], m[1], m[2] | 0, m[3] == null ? "" : m[3], Math.round(+m[4] || 0).toString(36)].join("~"); }).join(",")].join("|");
    }).join("\n");
    return out;
  }
  function unpack(items) {
    var out = [];
    Object.keys(items || {}).forEach(function (k) {
      if (!/^lg\d+$/.test(k) || typeof items[k] !== "string" || !items[k]) return;
      items[k].split("\n").forEach(function (row) {
        var a = row.split("|"), m = /^(\d{8})\.(er|k|n|x([1-3]))\.([ab])$/.exec(a[0] || ""); if (!m || a.length < 9) return;
        var day = m[1].slice(0, 4) + "-" + m[1].slice(4, 6) + "-" + m[1].slice(6), s2 = {};
        (a[7] ? a[7].split(".") : []).forEach(function (s) { s2[s] = ""; });
        out.push({ v: 1, id: a[0], day: day, dk: m[3] ? "x" : m[2], ai: m[3] ? +m[3] : 0, c: a[1], erc: a[2], pk: m[4], o: /^(ok|lost|time)$/.test(a[3]) ? a[3] : "time",
          t: parseInt(a[4], 36) || 0, pts: a[5] | 0, s1: a[6] ? a[6].split(".") : [], s2: s2,
          my: (a[8] ? a[8].split(",") : []).map(function (x) { var y = x.split("~"); return [y[0], y[1], y[2] | 0, y[3] === "" || y[3] == null ? null : +y[3], parseInt(y[4], 36) || 0]; }), u: "", at: 0, cloud: 1 });
      });
    });
    return out;
  }
  // 🔁 «زيد للتكرار المتباعد»: the quiz questions of the lessons this patient is about (topic words of his story / dossier / source)
  var TOPICS = [[/infarctus|SCA\b|STEMI|sus-décalage|troponine|syndrome coronarien/i, ["infarctus"]], [/angor/i, ["angor"]], [/arythmi|fibrillation|tachycardie ventric|bradycard|QRS|torsade/i, ["arythmies", "ecg"]],
    [/\bAVC\b|hémipl|aphasie|accident vasculaire/i, ["avc"]], [/HTIC|papillaire|hypertension intracr/i, ["htic"]], [/glasgow|coma\b/i, ["glasgow"]], [/\bchoc\b/i, ["choc"]],
    [/embolie/i, ["embolie"]], [/endocardite|myocardite|hémocultures/i, ["endomyo"]], [/insuffisance cardiaque|\bOAP\b|œdème aigu/i, ["ic"]], [/péricard|tamponnade/i, ["pericarde"]],
    [/pacemaker|stimulateur/i, ["pacemaker"]], [/tumeur|craniotomie|crâni/i, ["craniotomie", "brain"]], [/épilep|convuls|crise/i, ["brain"]], [/laminectomie|hernie discale/i, ["laminectomie"]],
    [/arrêt cardiaque|réanimation|ACR\b/i, ["rea"]]];
  function topics(cs, p) {
    var txt = [p.who && p.who.fr, p.story && p.story.fr, p.file && p.file.motif && p.file.motif.fr, p.file && p.file.cst && p.file.cst.fr, cs.src && cs.src.fr].join(" "), out = [];
    TOPICS.forEach(function (r) { if (r[0].test(txt)) r[1].forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); }); });
    if (!out.length) out = /neuro/.test(cs.href || "") ? ["brain"] : /cardio/.test(cs.href || "") ? ["heart"] : ["rea"];
    return out;
  }
  function keyQs(LC, Q, cs, p, id, has, n) {
    var tp = topics(cs, p), pool = (Q || []).filter(function (q) { return q && /^q\d{3,4}$/.test(q.id) && tp.indexOf(q.t) > -1; });
    pool.sort(function (a, b) { return ((has && has(a.id) ? 1 : 0) - (has && has(b.id) ? 1 : 0)) || (LC.hash(id + a.id) - LC.hash(id + b.id)); });
    return { topics: tp, ids: pool.slice(0, n || 5).map(function (q) { return q.id; }) };
  }
  return { MAXE: MAXE, SYNC: SYNC, PER: PER, KEYS: KEYS, DAYS: DAYS, deps: deps, build: build, ctx: ctx, compare: compare, filter: filter, merge: merge, pack: pack, unpack: unpack, topics: topics, keyQs: keyQs };
})();
/* ==/log-core== */
  if (typeof window !== "undefined") window.NursinLogCore = LogCore;
  if (!d || !d.addEventListener) return;

  var V = "20261029t", SK = "nursin_caselog_v1", W = w;
  function FR() { return !!(W.Lang && W.Lang.fr); }
  function T(o) { return o == null ? "" : typeof o === "string" ? o : (FR() ? (o.fr || o.ar || "") : (o.ar || o.fr || "")); }
  function TT(ar, fr) { return FR() ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function db() { var s = lsGet(SK); if (!s || s.v !== 1 || !s.e) s = { v: 1, e: {}, fin: {} }; s.fin = s.fin || {}; return s; }
  function list() { var s = db(); return Object.keys(s.e).map(function (k) { return s.e[k]; }); }
  function fb() { var A = W.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  function myIds() { var A = fb(); return A ? [A.user.uid] : ["me"]; }
  // signed in: his own entries + the ones played on this phone without an account; another account's entries stay hidden
  function shown() { var A = fb(), u = A ? A.user.uid : ""; return list().filter(function (e) { return !u || !e.u || e.u === "me" || e.u === u; }); }

  /* ---- loading the bank (the hospital page has it; حفظي / the home load it when needed) ---- */
  var ready = null;
  function script(src) { return new Promise(function (res) { var s = d.createElement("script"); s.src = src + "?v=" + V; s.onload = function () { res(true); }; s.onerror = function () { res(false); }; d.head.appendChild(s); }); }
  function ensure() {
    if (ready) return ready;
    ready = Promise.resolve()
      .then(function () { return W.ERROOM ? 1 : script("assets/erroom-data.js"); })
      .then(function () { return W.LiveCase ? 1 : script("assets/livecase.js"); })
      .then(function () { return W.LiveCase ? W.LiveCase.load() : null; })
      .then(function (D) { if (!D) { ready = null; return null; } return D; });
    return ready;
  }
  function names(D) {
    if (D.__lgA) return D.__lgA;
    var A = {}, k, E = W.ERROOM || {}; for (k in (E.actions || {})) A[k] = E.actions[k]; for (k in (D.acts || {})) A[k] = D.acts[k]; for (k in (D.A || {})) if (!A[k]) A[k] = D.A[k];
    return (D.__lgA = A);
  }

  /* ---- building: today's doc (while the page has it), the days he missed (shared docs), the days played on this phone (preview) ---- */
  var lastN = -1, lastRun = 0, busyScan = false, scanned = false, again = false;
  function save(s) { lsSet(SK, s); }
  function add(entries) {
    if (!entries.length) return [];
    var s = db(), added = LogCore.merge(s.e, entries); save(s);
    if (added.length) { try { d.dispatchEvent(new CustomEvent("nursin:caselog", { detail: { added: added } })); } catch (e) {} push(); paintCards(); }
    return added;
  }
  function fromLive(force) {
    var L = W.LiveCase; if (!L || !L.raw || !L.D || !L.D()) return [];
    var raw = L.raw(); if (!raw) return [];
    var m = L.mode && L.mode(); if (m !== "shared" && m !== "preview") return [];
    if (!force && raw.n === lastN && Date.now() - lastRun < 60000) return [];
    lastN = raw.n; lastRun = Date.now();
    return add(LogCore.build(W.LiveCore, W.LiveDept, L.D(), raw, m === "shared" ? myIds() : ["me"], Date.now()));
  }
  function ms(t) { return t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +t || 0; }
  function conv(x) { var o = { day: x.day, c: x.c, n: x.n | 0, ev: {}, pts: {} }; if (x.at0) o.at0 = ms(x.at0); for (var k in (x.ev || {})) { var e = x.ev[k]; if (e) o.ev[k] = { t: ms(e.t), u: e.u, n: e.n, p: e.p, a: e.a, k: e.k, d: e.d, o: e.o }; } return o; }
  function catchUp() {                         // a student who was away when his patient finished gets the entry now (last 10 days)
    if (busyScan) { again = true; return Promise.resolve(0); }
    return ensure().then(function (D) {
      if (!D) return 0; busyScan = true;
      var C = W.LiveCore, s = db(), now = Date.now(), today = C.dayKey(now), got = [];
      // the days played on this phone without an account (🔴 preview): nursin_live_hist_v1 + an older nursin_live_prev_v1
      var HK = (W.LiveCase && W.LiveCase.HK) || "nursin_live_hist_v1", PKk = (W.LiveCase && W.LiveCase.PK) || "nursin_live_prev_v1";
      var loc = (lsGet(HK) || []).map(function (x) { return x && x.doc; }), pv = lsGet(PKk); if (pv) loc.push(pv);
      loc.forEach(function (raw) { if (!raw || !raw.day || s.fin["p" + raw.day]) return; got = got.concat(LogCore.build(C, W.LiveDept, D, raw, ["me"], now)); if (raw.day < C.docId(today)) s.fin["p" + raw.day] = 1; });
      save(s); var n0 = add(got).length;
      var A = fb(); if (!A) { busyScan = false; if (again) { again = false; setTimeout(catchUp, 0); } return n0; }
      var days = [], k = today;
      for (var i = 0; i <= LogCore.DAYS; i++) { var id = C.docId(k); if (!s.fin[id] && !(i === 0 && W.LiveCase && W.LiveCase.mode && W.LiveCase.mode() === "shared")) days.push({ id: id, key: k, past: i > 0 }); k = C.dayKey(C.dayStart(k) - 3 * 36e5); }
      return days.reduce(function (p, x) {
        return p.then(function (n) {
          return A.fs.getDoc(A.fs.doc(A.db, "live", x.id)).then(function (sn) {
            var add1 = sn.exists() ? add(LogCore.build(C, W.LiveDept, D, conv(sn.data()), [A.user.uid], Date.now())).length : 0;
            if (x.past) { var s2 = db(); s2.fin[x.id] = 1; save(s2); }
            return n + add1;
          }, function () { return n; });
        });
      }, Promise.resolve(n0)).then(function (n) { busyScan = false; scanned = true; if (again) { again = false; setTimeout(catchUp, 0); } return n; });
    }).then(null, function (e) { busyScan = false; console.warn("nursin caselog", e); return 0; });
  }

  /* ---- ☁️ the account copy (users/{uid}/srs/main, keys lg0…lg3 — the 🔁 keys z… are never touched: a merge write) ---- */
  var pulled = "", pushT = 0, remoteIds = null;
  function pull() {
    var A = fb(); if (!A || pulled === A.user.uid) return Promise.resolve(0);
    pulled = A.user.uid;
    return A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid, "srs", "main")).then(function (sn) {
      var items = sn.exists() ? (sn.data().items || {}) : {}, r = LogCore.unpack(items); remoteIds = {};
      r.forEach(function (e) { remoteIds[e.id] = 1; e.u = A.user.uid; });
      var s = db(), n = 0; r.forEach(function (e) { if (!s.e[e.id]) { s.e[e.id] = e; n++; } }); if (n) { save(s); paintCards(); }
      push(); return n;
    }, function () { remoteIds = null; return 0; });
  }
  function push() {
    var A = fb(); if (!A || remoteIds == null) return;
    clearTimeout(pushT);
    pushT = setTimeout(function () {
      var s = db(), P = LogCore.pack(s.e), need = false;
      LogCore.filter(Object.keys(s.e).map(function (k) { return s.e[k]; })).slice(0, LogCore.SYNC).forEach(function (e) { if (!remoteIds[e.id]) need = true; });
      if (!need) return;
      A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid, "srs", "main"), { items: P, t: A.fs.serverTimestamp() }, { merge: true }).then(function () {
        LogCore.unpack(P).forEach(function (e) { remoteIds[e.id] = 1; });
      }, function (e) { console.warn("nursin caselog sync", e && e.code); });
    }, 2500);
  }

  /* ---- words ---- */
  var DEP = { er: ["🚑", "الطوارئ", "Urgences"], k: ["🫀", "قسم القلب", "Cardiologie"], n: ["🧠", "قسم الأعصاب", "Neurologie"], x: ["🛏️", "سرير الإسعاف", "Lit de l'ambulance"] };
  function depName(dk) { var x = DEP[dk] || DEP.er; return x[0] + " " + TT(x[1], x[2]); }
  function outW(o, sex) {
    if (o === "ok") return "✅ " + TT(sex === "f" ? "استقرّت" : "استقرّ", sex === "f" ? "Stabilisée" : "Stabilisé");
    if (o === "lost") return "💔 " + TT(sex === "f" ? "خسرناها" : "خسرناه", sex === "f" ? "Décédée" : "Décédé");
    return "⏰ " + TT("خلص الوقت قبل ما تخلص حالتو", "Temps écoulé avant la fin");
  }
  var PH = { 1: ["① الاستقبال", "① Accueil"], 2: ["② التقييم والملف", "② Évaluation + dossier"], 3: ["③ العناية", "③ Soins"], 4: ["④ المراقبة", "④ Surveillance"], 5: ["⑤ التسليم", "⑤ Transmissions"] };
  function dayW(key) { try { var p = key.split("-"); return new Intl.DateTimeFormat(FR() ? "fr-FR" : "ar-LB-u-nu-latn", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12))); } catch (e) { return key; } }
  function hm(t) { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)); } catch (e) { return ""; } }
  function actName(D, a) {
    if (a === "hint") return TT("💡 طرف خيط (🎯 دلّني)", "💡 Indice (🎯 montre-moi)");
    if (String(a).indexOf("f_") === 0) { var F = D.fields[a.slice(2)]; return F ? F.ic + " " + T(F) : a; }
    var A = names(D)[a]; return A ? A.ic + " " + T(A) : a;
  }
  function stepName(D, s) { return s.kind === "file" ? actName(D, "f_" + s.f) : actName(D, s.a); }
  function stepWhy(C, c, s) {
    if (s.kind === "file") { var q = C.opts(c.DK, c.cs, c.p, s.f), ok = q.o[q.a], F = c.DK.fields[s.f]; return "= " + T(ok) + (F && F.x ? " — " + T(F.x) : ""); }
    return T(s.why);
  }
  function actWhy(C, c, e) {
    if (e.m === "ok" || e.m === "hint") return e.a === "paravent" ? T(C.WHY.scr) : "";
    if (e.k === "bad") { var w0 = ""; (c.p.bad || []).forEach(function (b) { if (b.a === e.a) w0 = T(b.why); }); return w0 || T(C.extra(c.DK, c.p, e.a).why); }
    if (e.k === "no") { var f = String(e.a).slice(2), F = c.DK.fields[f], q = F ? C.opts(c.DK, c.cs, c.p, f) : null; return (q && e.o != null && q.o[e.o] ? "«" + T(q.o[e.o]) + "» ← " : "") + (F ? T(F.x) : ""); }
    if (e.k === "ord") { var s = null; c.L.forEach(function (x) { if (x.id === e.a) s = x; }); return TT("⚠️ مش بوقتها — ", "⚠️ Pas encore — ") + (s ? T({ ar: PH[s.ph][0], fr: PH[s.ph][1] }) : "") + TT(": قبلها في خطوات لازم يخلصو", " : d'autres étapes d'abord"); }
    if (e.a === "call") return T(C.WHY.nonew);
    var xr = C.extra(c.DK, c.p, e.a); return xr.k === "safe" ? TT("ما كان هيدا يلّي ناقصو هلّق", "Ce n'était pas ce qui manquait") : T(xr.why);
  }

  /* ---- the screen (its own full-screen glass layer: above the hospital room, no ads) ---- */
  var ov = null, F0 = { dk: "all", o: "all" }, cur = null, from = "";
  function q(s) { return ov && ov.querySelector(s); }
  function build() {
    ov = d.createElement("div"); ov.className = "clg"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("data-nofr", "");
    ov.innerHTML = '<div class="clg-top"><button type="button" class="clg-x" data-lgx="1" aria-label="' + esc(TT("سكّر", "Fermer")) + '">✕</button><b class="clg-tt"></b><span class="clg-n"></span></div><div class="clg-body"></div>';
    d.body.appendChild(ov);
    ov.addEventListener("click", onClick);
  }
  function open(src) {
    if (!ov) build(); from = src || "";
    ov.hidden = false; d.documentElement.classList.add("clg-open"); cur = null;
    q(".clg-tt").textContent = TT("📒 سجل حالاتي", "📒 Mon carnet de cas");
    q(".clg-body").innerHTML = '<p class="clg-wait">…</p>';
    ensure().then(function (D) {
      paint();
      return Promise.all([catchUp(), fromLive(true), pull()]);
    }).then(function () { if (!ov.hidden) paint(); });
  }
  function close() {
    if (!ov || ov.hidden) return; ov.hidden = true; d.documentElement.classList.remove("clg-open"); cur = null;
    if (location.hash === "#caselog") try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  function chips(name, opts, val) {
    return '<div class="clg-ch" role="group">' + opts.map(function (o) { return '<button type="button" class="' + (o[0] === val ? "on" : "") + '" data-lgf="' + name + ":" + o[0] + '">' + esc(o[1]) + "</button>"; }).join("") + "</div>";
  }
  function paint() {
    if (!ov || ov.hidden) return;
    if (cur) return paintOne(cur);
    var D = W.LiveCase && W.LiveCase.D && W.LiveCase.D(), all = shown(), L0 = LogCore.filter(all, F0), signed = !!fb();
    q(".clg-n").textContent = all.length ? String(all.length) : "";
    var h = '<p class="clg-lead">' + esc(TT("كل مريض بتشارك فيه بالمستشفى، بس تخلص حالتو، بينحفظ هون: القصّة، الخطوات الصح بالترتيب مع ليش، وخطواتك إنت حدّها.", "Chaque patient que tu as soigné à l'hôpital arrive ici quand son cas est terminé : l'histoire, les bonnes étapes dans l'ordre avec le pourquoi, et tes étapes à côté.")) + "</p>";
    h += '<p class="clg-leg">' + esc(TT("✅ صح · ❌ غلط/مضرّ · ⚠️ مش بوقتها · ⏭️ فاتت · 👥 عملها غيرك", "✅ juste · ❌ faux/dangereux · ⚠️ pas au bon moment · ⏭️ oublié · 👥 fait par un autre")) + "</p>";
    h += chips("dk", [["all", TT("الكل", "Tout")], ["er", "🚑 " + TT("طوارئ", "Urgences")], ["k", "🫀 " + TT("قلب", "Cardio")], ["n", "🧠 " + TT("أعصاب", "Neuro")], ["x", "🛏️ " + TT("إسعاف", "Ambulance")]], F0.dk);
    h += chips("o", [["all", TT("كل النتايج", "Tous")], ["ok", "✅ " + TT("استقرّ", "Stabilisé")], ["lost", "💔 " + TT("خسرناه", "Décédé")], ["time", "⏰ " + TT("خلص الوقت", "Temps écoulé")]], F0.o);
    if (!all.length) h += '<div class="clg-empty"><p>🏥</p><p>' + esc(TT("لسّا ما في حالات بسجلّك. فوت عالمستشفى ساعد بمريض، وبس تخلص حالتو بتلاقيها هون.", "Aucun cas pour l'instant. Va aider un patient à l'hôpital : quand son cas se termine, il arrive ici.")) + '</p><a class="clg-btn on" href="games.html#live" data-lghosp="1">' + esc(TT("🏥 روح عالمستشفى", "🏥 Aller à l'hôpital")) + "</a></div>";
    else if (!L0.length) h += '<p class="clg-empty">' + esc(TT("ما في حالات بهالفلتر.", "Aucun cas avec ce filtre.")) + "</p>";
    else h += '<div class="clg-list">' + L0.map(function (e) { return row(D, e); }).join("") + "</div>";
    if (!signed) h += '<p class="clg-note">' + esc(TT("📱 محفوظ عهالتلفون بس. سجّل دخول لينحفظ بحسابك ويبين عكل أجهزتك.", "📱 Gardé sur ce téléphone seulement. Connecte-toi pour l'avoir sur ton compte.")) + ' <a href="friends.html">' + esc(TT("دخول", "Connexion")) + "</a></p>";
    q(".clg-body").innerHTML = h; q(".clg-body").scrollTop = 0;
  }
  function row(D, e) {
    var C = W.LiveCore, c = D ? LogCore.ctx(C, W.LiveDept, D, e) : null, p = c && c.p, cmp = c ? LogCore.compare(c.L, e) : null;
    var nm = p ? T(p.nm) : "?", sub = c ? T(c.cs.t) : e.c;
    return '<button type="button" class="clg-row ' + e.o + '" data-lgid="' + esc(e.id) + '"><span class="clg-ric">' + (DEP[e.dk] || DEP.er)[0] + '</span><span class="clg-rt"><b>' + esc(nm) + (p ? " · " + p.age : "") + '</b><small>' + esc(sub) + "</small><small>" + esc(dayW(e.day)) + " · " + esc(outW(e.o, p && p.sex)) + "</small></span>" +
      '<span class="clg-rs">' + (cmp ? '<i>✅ ' + cmp.n.ok + "</i><i>❌ " + cmp.n.bad + "</i><i>⏭️ " + cmp.n.miss + "</i>" : "") + '<b dir="ltr">' + (e.pts > 0 ? "+" : "") + (e.pts | 0) + "</b></span></button>";
  }
  function paintOne(id) {
    var s = db(), e = s.e[id], D = W.LiveCase && W.LiveCase.D && W.LiveCase.D(); if (!e || !D) { cur = null; return paint(); }
    var C = W.LiveCore, c = LogCore.ctx(C, W.LiveDept, D, e);
    if (!c) { q(".clg-body").innerHTML = '<button type="button" class="clg-back" data-lgback="1">' + esc(TT("→ رجوع", "← Retour")) + '</button><p class="clg-empty">' + esc(TT("هالحالة ما عادت بالبنك.", "Ce cas n'est plus dans la banque.")) + "</p>"; return; }
    var p = c.p, cmp = LogCore.compare(c.L, e), n = cmp.n;
    var h = '<button type="button" class="clg-back" data-lgback="1">' + esc(TT("→ كل الحالات", "← Tous les cas")) + "</button>";
    h += '<div class="clg-hd"><small>' + esc(depName(e.dk)) + " · " + esc(dayW(e.day)) + " · " + esc(hm(e.t)) + "</small><h2>" + esc(c.cs.ic + " " + T(c.cs.t)) + "</h2>" +
      '<p class="clg-pt">🛏️ <b>' + esc(T(p.nm)) + "</b> · " + p.age + " " + esc(TT("سنة", "ans")) + " · " + (p.sex === "f" ? "♀" : "♂") + ' <span class="clg-out ' + e.o + '">' + esc(outW(e.o, p.sex)) + "</span></p>" +
      '<p class="clg-who"><b>' + esc(T(p.who)) + '</b></p><p class="clg-story">' + esc(T(p.story)) + "</p>" +
      '<p class="clg-src' + (c.cs.gen ? " g" : "") + '">' + esc(T(c.cs.src)) + "</p></div>";
    h += '<div class="clg-sum"><span>✅ ' + n.ok + '</span><span>❌ ' + n.bad + '</span><span>⚠️ ' + n.warn + '</span><span>⏭️ ' + n.miss + '</span><span>👥 ' + n.team + "</span>" + (n.hint ? "<span>💡 " + n.hint + "</span>" : "") + '<span class="pts" dir="ltr">🏅 ' + (e.pts > 0 ? "+" : "") + (e.pts | 0) + "</span></div>";
    h += "<h3>" + esc(TT("📋 الخطوات الصح (بالترتيب)", "📋 Les bonnes étapes (dans l'ordre)")) + '</h3><ol class="clg-steps">';
    var ph = 0;
    cmp.steps.forEach(function (x) {
      if (x.s.ph !== ph) { ph = x.s.ph; h += '<li class="clg-ph">' + esc(T({ ar: PH[ph][0], fr: PH[ph][1] })) + "</li>"; }
      var mk = x.m === "me" ? "✅" : x.m === "team" ? "👥" : "⏭️", who = x.m === "me" ? TT("إنت عملتها", "faite par toi") : x.m === "team" ? (x.by ? TT("عملها ", "faite par ") + x.by : TT("عملها غيرك", "faite par un autre")) : TT("فاتت — ما حدا عملها", "oubliée — personne ne l'a faite");
      h += '<li class="clg-st ' + x.m + '"><b>' + mk + " " + esc(stepName(D, x.s)) + '</b><small class="clg-by">' + esc(who) + '</small><p>' + esc(stepWhy(C, c, x.s)) + "</p></li>";
    });
    h += "</ol><h3>" + esc(TT("✍️ خطواتك إنت (بالترتيب يلّي عملتها)", "✍️ Tes étapes (dans l'ordre où tu les as faites)")) + '</h3><ol class="clg-mine">';
    h += cmp.acts.map(function (a) {
      var mk = a.m === "ok" ? "✅" : a.m === "bad" ? "❌" : a.m === "hint" ? "💡" : "⚠️", wy = actWhy(C, c, a);
      return '<li class="' + a.m + '"><b>' + mk + " " + esc(actName(D, a.a)) + ' <i dir="ltr">' + (a.d > 0 ? "+" : "") + a.d + '</i></b><small dir="ltr">' + esc(hm(a.t)) + "</small>" + (wy ? "<p>" + esc(wy) + "</p>" : "") + "</li>";
    }).join("") + "</ol>";
    h += '<div class="clg-acts">' + (e.srs ? '<span class="clg-done">' + esc(TT("🔁 انزادت أسئلتها للتكرار المتباعد", "🔁 Ses questions sont dans la révision espacée")) + "</span>" : '<button type="button" class="clg-btn on" data-lgsrs="' + esc(e.id) + '">' + esc(TT("🔁 زيد للتكرار المتباعد", "🔁 Ajouter à la révision espacée")) + "</button>") +
      (c.cs.href ? '<a class="clg-btn" href="' + esc(c.cs.href) + '">' + esc(TT("📖 الدرس", "📖 La leçon")) + "</a>" : "") + "</div>";
    q(".clg-body").innerHTML = h; q(".clg-body").scrollTop = 0;
  }
  function toSrs(id) {
    var s = db(), e = s.e[id], D = W.LiveCase && W.LiveCase.D && W.LiveCase.D(), S = W.NursinSRS; if (!e || !D) return;
    var c = LogCore.ctx(W.LiveCore, W.LiveDept, D, e); if (!c) return;
    var go = function () {
      S = W.NursinSRS; if (!S || !S.add) return say(TT("🔁 التكرار المتباعد مش جاهز بهالصفحة", "🔁 Révision espacée indisponible ici"));
      var items = S.items ? S.items() : {}, has = function (k) { return !!(items[k] && !items[k].n); };
      var r = LogCore.keyQs(W.LiveCore, W.QUIZ, c.cs, c.p, id, has, 5), n = S.add(r.ids);
      var s2 = db(); if (s2.e[id]) { s2.e[id].srs = Date.now(); save(s2); }
      try { d.dispatchEvent(new CustomEvent("nursin:srs")); } catch (x) {}
      say(n ? TT("🔁 " + (n === 1 ? "انزاد سؤال واحد" : n === 2 ? "انزادو سؤالين" : "انزادو " + n + " أسئلة") + " عن هالحالة — بيطلعولك بكرا", "🔁 " + n + " question(s) de ce cas ajoutée(s) — dès demain") : TT("✅ أسئلة هالحالة أصلاً بالتكرار المتباعد", "✅ Les questions de ce cas y sont déjà"));
      paintOne(id);
    };
    if (W.QUIZ && W.NursinSRS) go(); else script("assets/quiz-data.js").then(function () { return W.NursinSRS ? 1 : script("assets/srs.js"); }).then(go);
  }
  var sayT = 0;
  function say(t) {
    if (!ov) return; var b = q(".clg-toast"); if (!b) { b = d.createElement("div"); b.className = "clg-toast"; b.setAttribute("aria-live", "polite"); ov.appendChild(b); }
    b.textContent = t; b.classList.add("on"); clearTimeout(sayT); sayT = setTimeout(function () { b.classList.remove("on"); }, 3200);
  }
  function onClick(e) {
    var t = e.target.closest && e.target.closest("button,a"); if (!t) return;
    var g = function (k) { return t.getAttribute(k); };
    if (g("data-lgx")) return close();
    if (g("data-lgback")) { cur = null; return paint(); }
    if (g("data-lgid")) { cur = g("data-lgid"); return paintOne(cur); }
    if (g("data-lgf")) { var f = g("data-lgf").split(":"); F0[f[0]] = f[1]; return paint(); }
    if (g("data-lgsrs")) return toSrs(g("data-lgsrs"));
    if (g("data-lghosp") && W.LiveRoom && W.LiveRoom.open) { e.preventDefault(); close(); W.LiveRoom.open(); }
  }
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov && !ov.hidden) close(); });

  /* ---- حفظي: a card under «🔁 التكرار المتباعد»; the home only builds (the 🏥 card is the way in) ---- */
  function paintCards() {
    var box = d.getElementById("clgcard"); if (!box) return;
    var all = shown(), ok = all.filter(function (e) { return e.o === "ok"; }).length, lost = all.filter(function (e) { return e.o === "lost"; }).length;
    box.innerHTML = '<p class="srsct"><b>' + esc(TT("📒 سجل حالاتي", "📒 Mon carnet de cas")) + "</b> · " + esc(all.length ? TT(all.length === 1 ? "مريض واحد" : all.length === 2 ? "مريضين" : all.length <= 10 ? all.length + " مرضى" : all.length + " مريض", all.length + " patient(s)") + " (✅ " + ok + " · 💔 " + lost + ")" : TT("لسّا فاضي", "vide pour l'instant")) + "</p>" +
      '<p class="small">' + esc(TT("كل مريض بتساعد فيه بالمستشفى، بس تخلص حالتو، بتنحفظ خطواتو الصح هون مع خطواتك.", "Chaque patient soigné à l'hôpital : ses bonnes étapes et les tiennes, ici.")) + "</p>" +
      '<p class="srsbt"><button class="btn sm pri" type="button" data-clgopen="1">' + esc(TT("📒 افتح السجل", "📒 Ouvrir")) + '</button> <a class="btn sm" href="games.html#live">' + esc(TT("🏥 المستشفى", "🏥 L'hôpital")) + "</a></p>";
  }
  function hifziCard() {
    var map = d.getElementById("rmap"); if (!map) return;
    var el = d.getElementById("clgcard"); if (!el) { el = d.createElement("div"); el.id = "clgcard"; el.className = "srscard clgcard"; map.parentNode.insertBefore(el, map); }
    paintCards();
  }
  d.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-clgopen]"); if (b) { e.preventDefault(); open("btn"); } });
  function route() { if (location.hash === "#caselog") open("hash"); }
  var started = false;
  function startLive() {                        // the hospital page and the home: keep the log built while the day's doc is on screen
    if (started || !W.LiveCase || !W.LiveCase.start) return; started = true;
    W.LiveCase.start(function () { setTimeout(function () { try { fromLive(false); } catch (e) { console.warn("nursin caselog", e); } }, 0); });
  }
  // the hospital page and the home have the day doc anyway; حفظي catches up at most every 3 h (the bank is ~340 KB) — opening the log always does
  function autoCatch() { var s0 = db(), sg = fb() ? 1 : 0; if (!W.LiveCase && Date.now() - (s0.last || 0) < 3 * 36e5 && (s0.lastSg | 0) >= sg) return; s0.last = Date.now(); s0.lastSg = sg; save(s0); catchUp(); }
  function init() {
    hifziCard(); route();
    w.addEventListener("hashchange", route);
    var go = function () {
      if (W.LiveCase) startLive();
      setTimeout(autoCatch, 1500);
    };
    if (W.requestIdleCallback) W.requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1200);
    d.addEventListener("nursin:auth", function () { paintCards(); if (ov && !ov.hidden) paint(); if (fb()) { pull(); autoCatch(); } });
    if (fb()) pull();
  }
  function nameOf(id) { var e = db().e[id], D = W.LiveCase && W.LiveCase.D && W.LiveCase.D(); if (!e || !D) return ""; var c = LogCore.ctx(W.LiveCore, W.LiveDept, D, e); return c ? T(c.p.nm).split(" ")[0] : ""; }
  W.NursinLog = { nameOf: nameOf, packed: function () { return LogCore.pack(db().e); }, open: open, close: close, list: shown, build: fromLive, catchUp: catchUp, pull: pull, push: push, key: SK, core: LogCore, paintCards: paintCards };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
