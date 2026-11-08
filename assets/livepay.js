/* 💵 «راتب الممرّض» + 💰 المحاسبة + ⬆️ الترقية + 👔 مسؤول الطابق (29d — Abdullah, Nov 4 2026 7:01 AM: «يتكافأ… ياخد مصاري… متل قسم
   المحاسبة… مسؤول بالطابق»). The salary is VIRTUAL money (ل.ن = ليرة نيرسين) and it is DERIVED: every phone reads the same shared day docs
   live/{YYYYMMDD} (rules v22, nothing new to publish) and turns each student's events into a payslip — ✅ a right step = its points × 10,
   🏷️ a right triage = +40, 🚑 an ambulance step = +50 % «بدل إسعاف», 🏅 each patient stabilised = +100 to everyone who did a right step on him
   (+150 an ambulance patient), 👔 the floor supervisor of the week = +50 a day he works; ⚠️ a harmful act, ❌ a wrong / early act, 🏷️ a wrong
   triage and 💡 a paid hint are deducted the same way. Ranks by everything earned since the hospital opened: 🎓 متدرّب → 🩺 ممرّض (1000) →
   ⭐ ممرّض أوّل (5000); the week's top earner is 👔 مسؤول الطابق the whole next week (Monday → Sunday, Beirut). Past days never change, so each
   is computed once and kept on the phone (nursin_pay_v1); his own day totals also ride in users/{uid}/srs/main as «py0» (rules v22 already
   allow it, a merge write next to the 🔁 keys). No ads. */
(function (w, d) {
/* ==pay-core== pure: no DOM, no Firestore */
var LivePay = (function () {
  var RATE = 10, TRI = 10, STAB = 100, AMB_STAB = 150, AMB_X = 0.5, SUP_DAY = 50, EPOCH = "2026-11-02";
  var RANKS = [{ k: "tr", min: 0, ic: "🎓", ar: "متدرّب", fr: "Stagiaire", col: "#64748b" },
    { k: "nu", min: 1000, ic: "🩺", ar: "ممرّض", fr: "Infirmier", col: "#0284c7" },
    { k: "sr", min: 5000, ic: "⭐", ar: "ممرّض أوّل", fr: "Infirmier principal", col: "#16a34a" }];
  var SUP = { k: "sup", ic: "👔", ar: "مسؤول الطابق", fr: "Chef d'étage", col: "#7c3aed" };
  // 29e: reas/late now ride the shared doc too (z fu / z fx events) + rout (🧼 🔄 🚪 👨‍👩‍👦 ⚠️ the nurse's routines), svc (🧪 🩻 💊 🩸 fetched from
  // the service), hyg (🧼 care with unwashed hands) — so they count in the class ranking; an older ⏰ kept only on the phone still adds to HIS lines
  var LINES = ["steps", "tri", "amb", "stab", "sup", "reas", "rout", "svc", "harm", "err", "trineg", "hint", "late", "hyg"], EARN = { steps: 1, tri: 1, amb: 1, stab: 1, sup: 1, reas: 1, rout: 1, svc: 1 },
    BZL = { fu: "reas", fx: "late", hh: "rout", ho: "rout", dc: "rout", fa: "rout", "in": "rout", pk: "svc", hx: "hyg" };   // reas/late = ⏰ his own follow-ups (assets/livecare.js, on his phone)
  function zero() { var o = {}; LINES.forEach(function (k) { o[k] = 0; }); return o; }
  function tot(o) { var e = 0, x = 0; LINES.forEach(function (k) { if (EARN[k]) e += o.L[k] | 0; else x += o.L[k] | 0; }); o.earn = e; o.ded = x; o.net = e + x; return o; }
  // the bed groups of a day that existed by «now»: the departments with a case + each ambulance that had arrived
  function groups(LD, D, key, now) {
    var out = [];
    ["er", "k", "n", "r", "s", "g", "p", "m"].forEach(function (dk) { if (dk === "er" || LD.cases(D, dk).length) out.push({ dk: dk, ai: 0 }); });
    LD.ambTimes(key).forEach(function (t, i) { if (t <= now) out.push({ dk: "x", ai: i + 1 }); });
    return out;
  }
  // ONE day doc → { uid: { n, L: { steps, tri, amb, stab, sup, harm, err, trineg, hint }, earn, ded, net, ok } } (amounts in ل.ن)
  function day(LC, LD, D, raw, now, supUid) {
    var key = LC.keyOf(raw && raw.day), out = {}; if (!key || !D) return out;
    var end = LC.dayStart(LC.nextKey(key)); if (now > end) now = end;
    function U(u, n) { var o = out[u] || (out[u] = { n: "", L: zero(), ok: 0 }); if (n) o.n = String(n); return o; }
    function add(e, amb) {
      if (!e || !e.u) return; if (LD.BZ_RE && LD.BZ_RE.test(String(e.a || ""))) return;              // 29e: the routines are read from the raw doc below
      var o = U(e.u, e.n), dd = e.d | 0, L = o.L;
      if (LD.TRI_RE.test(e.a)) { if (e.k === "ok") { L.tri += dd * TRI; o.ok++; } else L.trineg += dd * TRI; return; }
      if (e.a === "hint") { L.hint += dd * RATE; return; }
      if (e.k === "ok") { L.steps += dd * RATE; if (amb) L.amb += Math.round(dd * RATE * AMB_X); o.ok++; return; }
      if (e.k === "bad") { L.harm += dd * RATE; return; }
      L.err += dd * RATE;
    }
    groups(LD, D, key, now).forEach(function (g) {
      var st = null; try { st = LD.state(D, raw, g.dk, now, g.ai || undefined); } catch (e) { st = null; } if (!st) return;
      st.ev.forEach(function (e) { add(e, g.dk === "x"); });
      st.P.forEach(function (x) {
        if (!x || x.ghost || !x.over || x.over.w !== "ok") return;
        var us = {}; st.ev.forEach(function (e) { if (e.p === x.k && e.k === "ok" && e.a !== "hint" && !LD.TRI_RE.test(e.a)) us[e.u] = e.n; });
        for (var u in us) U(u, us[u]).L.stab += g.dk === "x" ? AMB_STAB : STAB;
      });
    });
    LD.walkIns(D, key).forEach(function (wk) { if (wk.t <= now) LD.evOf(raw, wk.dk, 0, "a").forEach(function (e) { add(e, false); }); });
    // 29e 💵 every routine / follow-up event of the day (on any patient, even one already home): its line, ×10
    if (LD.BZ_RE) for (var q in (raw.ev || {})) { var e = raw.ev[q]; if (!e || !e.u || (+e.t || 0) > now) continue; var a0 = String(e.a || ""), ns0 = LD.ns(a0), a1 = ns0 ? a0.slice(a0.indexOf("_") + 1) : a0, m0 = LD.BZ_RE.exec(a1); if (!m0) continue;
      var o0 = U(e.u, e.n); o0.L[BZL[m0[1]]] += (e.d | 0) * RATE; if (e.k === "ok") o0.ok++; }
    if (supUid && out[supUid] && out[supUid].ok > 0) out[supUid].L.sup = SUP_DAY;
    for (var u in out) tot(out[u]);
    return out;
  }
  // a day map packed small for the phone cache: { uid: [name, earn, ded, net, ok] }
  function pack(m) { var o = {}; for (var u in m) o[u] = [m[u].n, m[u].earn, m[u].ded, m[u].net, m[u].ok]; return o; }
  // the Monday (Beirut date key) of the week of «key», and its seven days
  function monday(key) { var t = new Date(key + "T12:00:00Z"), wd = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - wd); return t.toISOString().slice(0, 10); }
  function addDays(key, n) { var t = new Date(key + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function weekDays(mon) { var o = []; for (var i = 0; i < 7; i++) o.push(addDays(mon, i)); return o; }
  // packed day maps → the week's totals per student, best first (ties: more earned, then more right steps, then name)
  function week(maps) {
    var acc = {};
    maps.forEach(function (m) { for (var u in (m || {})) { var r = m[u], a = acc[u] || (acc[u] = { u: u, n: "", earn: 0, ded: 0, net: 0, ok: 0 }); if (r[0]) a.n = r[0]; a.earn += r[1] | 0; a.ded += r[2] | 0; a.net += r[3] | 0; a.ok += r[4] | 0; } });
    return Object.keys(acc).map(function (u) { return acc[u]; }).sort(function (a, b) { return b.net - a.net || b.earn - a.earn || b.ok - a.ok || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0); });
  }
  // 👔 the supervisor of a week = the top earner of the week BEFORE it (with something earned), or null
  function supOf(prevBoard) { var t = prevBoard && prevBoard[0]; return t && t.net > 0 && t.ok > 0 ? { u: t.u, n: t.n, net: t.net } : null; }
  function rank(total) { var r = RANKS[0]; RANKS.forEach(function (x) { if ((total | 0) >= x.min) r = x; }); return r; }
  function nextRank(total) { for (var i = 0; i < RANKS.length; i++) if ((total | 0) < RANKS[i].min) return { r: RANKS[i], left: RANKS[i].min - (total | 0) }; return null; }
  // his own day totals for the account copy: «20261104,1240;20261103,560» (the newest 120 days)
  function packMine(days) { return Object.keys(days || {}).sort().reverse().slice(0, 120).map(function (k) { return k + "," + (days[k] | 0); }).join(";"); }
  function unpackMine(s) { var o = {}; String(s || "").split(";").forEach(function (x) { var m = /^(\d{8}),(-?\d+)$/.exec(x); if (m) o[m[1]] = +m[2]; }); return o; }
  return { RATE: RATE, TRI: TRI, STAB: STAB, AMB_STAB: AMB_STAB, AMB_X: AMB_X, SUP_DAY: SUP_DAY, EPOCH: EPOCH, RANKS: RANKS, SUP: SUP, LINES: LINES, EARN: EARN,
    BZL: BZL, groups: groups, day: day, pack: pack, monday: monday, addDays: addDays, weekDays: weekDays, week: week, supOf: supOf, rank: rank, nextRank: nextRank, packMine: packMine, unpackMine: unpackMine };
})();
/* ==/pay-core== */
if (typeof window !== "undefined") window.LivePay = LivePay;
if (!d || !d.addEventListener) return;
var V = "20261030z", CK = "nursin_pay_v1", P = LivePay;
function L() { return w.LiveCase; }
function LC() { return w.LiveCore; }
function LD() { return w.LiveDept; }
function FR() { return !!(w.Lang && w.Lang.fr); }
function TT(a, f) { return FR() ? f : a; }
function T(o) { return o == null ? "" : typeof o === "string" ? o : (FR() ? (o.fr || o.ar || "") : (o.ar || o.fr || "")); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function cur() { return FR() ? "NS" : "ل.ن"; }
function money(n, sign) { n = Math.round(+n || 0); var s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); return (n < 0 ? "−" : sign && n > 0 ? "+" : "") + s + " " + cur(); }
function db() { var c = lsGet(CK); if (!c || c.v !== 1) c = { v: 1, days: {}, mine: {}, cloud: {} }; c.days = c.days || {}; c.mine = c.mine || {}; c.cloud = c.cloud || {}; return c; }
function fb() { var A = w.NursinFB; return A && A.user ? A : null; }
function meUid() { var x = L() && L().me ? L().me() : null; return x ? x.uid : "me"; }
function todayKey() { return LC().dayKey(Date.now()); }
function conv(x) {           // a Firestore day doc → plain numbers (timestamps in ms), the same shape LiveCase uses
  x = x || {}; var o = { day: x.day, c: x.c, n: x.n | 0, ev: {}, pts: {} }, ms = function (t) { return t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +t || 0; };
  if (x.at0) o.at0 = ms(x.at0);
  for (var k in (x.ev || {})) { var e = x.ev[k]; if (e) o.ev[k] = { t: ms(e.t), u: e.u, n: e.n, p: e.p, a: e.a, k: e.k, d: e.d, o: e.o }; }
  return o;
}
/* ---- the days: past ones once (cache), today live ---- */
var busy = null, wk = null, subs = [];
function supFor(mon, c) {           // the supervisor of the week starting «mon», from the cached week before
  var prev = P.weekDays(P.addDays(mon, -7)).map(function (k) { return c.days[k.replace(/-/g, "")]; });
  if (P.addDays(mon, -1) < P.EPOCH) return null;
  return P.supOf(P.week(prev.filter(Boolean)));
}
function localDoc(id) {             // a preview day on this phone (signed out): today = nursin_live_prev_v1, older = nursin_live_hist_v1
  var x = L(); if (!x) return null; var p = lsGet(x.PK); if (p && p.day === id) return p;
  var h = lsGet(x.HK) || []; for (var i = 0; i < h.length; i++) if (h[i].id === id) return h[i].doc; return null;
}
function fetchDay(id) {
  var A = fb(), x = L();
  if (!A || !x || x.mode() !== "shared") return Promise.resolve(localDoc(id));
  return A.fs.getDoc(A.fs.doc(A.db, "live", id)).then(function (s) { return s.exists() ? conv(s.data()) : null; }, function () { return undefined; });
}
// load every past day since the hospital opened that is not cached yet (oldest first, so each week's 👔 is known before the next one)
function sync() {
  if (busy) return busy;
  var x = L(); if (!x || !x.D || !x.D()) return Promise.resolve(null);
  var D = x.D(), c = db(), tk = todayKey(), need = [];
  for (var k = P.EPOCH; k < tk; k = P.addDays(k, 1)) if (!c.days[k.replace(/-/g, "")]) need.push(k);
  var shared = x.mode() === "shared";
  busy = need.reduce(function (pr, k) {
    return pr.then(function () {
      var id = k.replace(/-/g, "");
      return fetchDay(id).then(function (raw) {
        if (raw === undefined) return;                                // a read that failed: try again next time
        var c2 = db(), sup = supFor(P.monday(k), c2), m = raw ? P.day(LC(), LD(), D, raw, LC().dayStart(LC().nextKey(k)), sup && sup.u) : {};
        if (!shared && !raw) return;                                  // a preview day we do not have: nothing to keep
        c2.days[id] = P.pack(m); var mu = meUid(); if (m[mu]) c2.mine[id] = m[mu].L; lsSet(CK, c2);
      });
    });
  }, Promise.resolve()).then(function () { busy = null; return cloud(); }).then(function () { emit(); return db(); }, function () { busy = null; return db(); });
  return busy;
}
// ☁️ his own day nets next to the 🔁 keys of users/{uid}/srs/main («py0»): read once, merged, written back when it grew
var cloudDone = false;
function cloud() {
  var A = fb(); if (!A || cloudDone) return Promise.resolve();
  var ref = A.fs.doc(A.db, "users", A.user.uid, "srs", "main");
  return A.fs.getDoc(ref).then(function (s) {
    cloudDone = true; var it = (s.exists() && s.data().items) || {}, have = P.unpackMine(it.py0), c = db(), mu = A.user.uid, mine = {}, changed = false;
    for (var id in c.days) { var r = c.days[id][mu]; if (r) mine[id] = r[3] | 0; }
    for (var k in have) if (mine[k] == null) { c.cloud[k] = have[k]; } else if (have[k] !== mine[k]) changed = true;
    for (var j in mine) if (have[j] == null) changed = true;
    lsSet(CK, c);
    if (changed) { var all = {}; for (var a in have) all[a] = have[a]; for (var b in mine) all[b] = mine[b];
      return A.fs.setDoc(ref, { items: { py0: P.packMine(all) }, t: A.fs.serverTimestamp() }, { merge: true }).catch(function () {}); }
  }, function () {});
}
function emit() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }
/* ---- what the room and المحاسبة ask ---- */
function todayMap() {
  var x = L(); if (!x || !x.D || !x.D()) return {};
  var raw = x.raw(); if (!raw) return {};
  var sup = supFor(P.monday(todayKey()), db());
  return P.day(LC(), LD(), x.D(), raw, Date.now(), sup && sup.u);
}
function weekBoard(mon) {
  var c = db(), tk = todayKey(), maps = P.weekDays(mon).map(function (k) { return k === tk ? P.pack(todayMap()) : c.days[k.replace(/-/g, "")]; });
  return P.week(maps.filter(Boolean));
}
function totalOf(uid) {
  var c = db(), t = 0; for (var id in c.days) { var r = c.days[id][uid]; if (r) t += r[3] | 0; }
  if (uid === meUid()) for (var k in c.cloud) if (!(c.days[k] && c.days[k][uid])) t += c.cloud[k] | 0;
  var m = todayMap()[uid]; if (m) t += m.net;
  if (uid === meUid()) { var cd = careDays(); for (var q in cd) t += careNet(q, cd); }
  return Math.max(0, t);
}
var tagC = null, tagAt = 0;
function tags() {                     // uid → { r: rank, sup: bool } for every student we know (cached 20 s: the room draws this every frame)
  var now = Date.now(); if (tagC && now - tagAt < 20000) return tagC;
  var c = db(), tot = {}, tm = todayMap(), mu = meUid();
  for (var id in c.days) for (var u in c.days[id]) tot[u] = (tot[u] || 0) + (c.days[id][u][3] | 0);
  for (var k in c.cloud) if (!(c.days[k] && c.days[k][mu])) tot[mu] = (tot[mu] || 0) + (c.cloud[k] | 0);
  for (var u2 in tm) tot[u2] = (tot[u2] || 0) + tm[u2].net;
  var cdx = careDays(); for (var q2 in cdx) tot[mu] = (tot[mu] || 0) + careNet(q2, cdx);
  var s = supFor(P.monday(todayKey()), c), o = {};
  for (var u3 in tot) o[u3] = { r: P.rank(Math.max(0, tot[u3])), sup: !!(s && s.u === u3), tot: Math.max(0, tot[u3]) };
  if (!o[mu]) o[mu] = { r: P.rank(0), sup: !!(s && s.u === mu), tot: 0 };
  tagC = o; tagAt = now; return o;
}
function tagOf(uid) { var t = tags()[uid]; return t || { r: P.RANKS[0], sup: false, tot: 0 }; }
function isSup(uid) { return tagOf(uid || meUid()).sup; }
function supNow() { return supFor(P.monday(todayKey()), db()); }
/* ---- 💰 المحاسبة: كشف راتب (today / this week) + 🏆 the class ranking of the week ---- */
var LN = { steps: ["✅", "خطوات صح", "Gestes justes"], tri: ["🏷️", "فرز صح", "Tri juste"], amb: ["🚑", "بدل إسعاف (+50%)", "Prime ambulance (+50 %)"], stab: ["🏅", "مكافأة استقرار مريض", "Prime patient stabilisé"],
  sup: ["👔", "بدل مسؤول الطابق", "Prime chef d'étage"], harm: ["⚠️", "أذى للمريض", "Acte dangereux"], err: ["❌", "غلط أو بغير وقت", "Erreur ou trop tôt"], trineg: ["🏷️", "فرز غلط", "Tri erroné"], hint: ["💡", "تلميحات مدفوعة", "Indices payés"],
  reas: ["⏰", "إعادة تقييم بوقتها", "Réévaluation à l'heure"], late: ["⏰", "موعد تقييم فات", "Réévaluation manquée"],
  rout: ["🧼", "روتين التمريض (غسل إيدين، تسليم، خروج، عيلة، تقرير)", "Routines (mains, relève, sortie, famille, déclaration)"], svc: ["🧪", "جبت النتيجة / الدوا بإيدك", "Résultat / médicament récupéré"],
  hyg: ["🧼", "شغل بلا غسل إيدين", "Soin sans hygiène des mains"] };
// 29d ⏰ his reassessments (on time +30 / missed −20) of a day, read from the phone (assets/livecare.js) → added to HIS payslip lines
function careDays() { var C0 = w.LiveCare, x = LC(); if (!C0 || !x) return {}; var S = null; try { S = C0.load(localStorage.getItem(C0.KEY)); } catch (e) { return {}; }
  return C0.extras(S.fu, function (t) { return x.docId(x.dayKey(t)); }); }
function withCare(L0, id, cd) { var o = {}; P.LINES.forEach(function (k) { o[k] = (L0 && L0[k]) | 0; }); var e = (cd || careDays())[id]; if (e) { o.reas += e.reas | 0; o.late += e.late | 0; } return o; }
function careNet(id, cd) { var e = (cd || careDays())[id]; return e ? (e.reas | 0) + (e.late | 0) : 0; }
function lines(L0, earn) {
  return P.LINES.filter(function (k) { return !!P.EARN[k] === earn; }).map(function (k) {
    var v = L0[k] | 0, n = LN[k]; return '<li class="pay-l' + (v ? "" : " z") + '"><span>' + n[0] + " " + esc(TT(n[1], n[2])) + '</span><b dir="ltr">' + esc(money(v, earn)) + "</b></li>"; }).join("");
}
function slip(L0, title, sub) {
  var e = 0, x = 0; P.LINES.forEach(function (k) { if (P.EARN[k]) e += L0[k] | 0; else x += L0[k] | 0; });
  return '<div class="pay-slip"><div class="pay-hd"><b>' + esc(title) + "</b><small>" + esc(sub) + "</small></div>" +
    '<p class="pay-sec">' + esc(TT("💵 الأرباح", "💵 Gains")) + '</p><ul class="pay-ls">' + lines(L0, true) + '</ul><p class="pay-sum"><span>' + esc(TT("مجموع الأرباح", "Total des gains")) + '</span><b dir="ltr">' + esc(money(e, true)) + "</b></p>" +
    '<p class="pay-sec">' + esc(TT("➖ الاقتطاعات", "➖ Retenues")) + '</p><ul class="pay-ls">' + lines(L0, false) + '</ul><p class="pay-sum"><span>' + esc(TT("مجموع الاقتطاعات", "Total des retenues")) + '</span><b dir="ltr">' + esc(money(x)) + "</b></p>" +
    '<p class="pay-net"><span>' + esc(TT("💰 الصافي", "💰 Net à payer")) + '</span><b dir="ltr">' + esc(money(e + x)) + "</b></p></div>";
}
function sumL(list) { var o = {}; P.LINES.forEach(function (k) { o[k] = 0; }); list.forEach(function (L0) { if (L0) P.LINES.forEach(function (k) { o[k] += L0[k] | 0; }); }); return o; }
function fmtD(k) { var p = k.split("-"); return (+p[2]) + "/" + (+p[1]); }
function rankBadge(t) { var r = t.sup ? P.SUP : t.r; return '<span class="pay-rk" style="--rk:' + r.col + '">' + r.ic + " " + esc(T(r)) + "</span>"; }
function panelHtml(tab) {
  var x = L(), mu = meUid(), me = x ? x.me() : { name: "" }, tk = todayKey(), mon = P.monday(tk), c = db(), tm = todayMap(), mt = tm[mu];
  var t = tagOf(mu), nx = P.nextRank(t.tot), sv = supNow(), shared = x && x.mode() === "shared";
  var h = '<div class="pay" data-nofr>';
  h += '<div class="pay-me"><b>' + esc(me.name) + "</b> " + rankBadge(t) + '<small dir="ltr">' + esc(TT("كل يلّي ربحتو: ", "Total gagné : ") + money(t.tot)) + "</small>" +
    (nx ? '<small>' + esc(TT("باقي " + money(nx.left) + " لتصير " + nx.r.ic + " " + nx.r.ar, "Encore " + money(nx.left) + " pour " + nx.r.ic + " " + nx.r.fr)) + "</small>" : '<small>' + esc(TT("⭐ وصلت لأعلى رتبة", "⭐ Rang maximum")) + "</small>") + "</div>";
  h += '<p class="pay-sv">' + (sv ? "👔 " + esc(TT("مسؤول الطابق هالأسبوع: ", "Chef d'étage cette semaine : ")) + "<b>" + esc(String(sv.n || "").split(" ")[0]) + "</b>" + (sv.u === mu ? " — " + esc(TT("إنت! 🎁 🎯 دلّني ببلاش مرّة لكل مريض + 50 ل.ن بدل كل يوم بتشتغل", "toi ! 🎁 un 🎯 gratuit par patient + 50 NS par jour travaillé")) : "")
    : "👔 " + esc(TT("مسؤول الطابق: بيتعيّن يوم الاثنين — يلّي بيربح أكتر هالأسبوع بيصير مسؤول الأسبوع الجاي (🎁 🎯 دلّني ببلاش + بدل)", "Chef d'étage : désigné lundi — le meilleur salaire de la semaine l'est la semaine suivante (🎁 🎯 gratuit + prime)"))) + "</p>";
  h += '<div class="pay-tabs" role="tablist">' + [["day", TT("📄 اليوم", "📄 Aujourd'hui")], ["week", TT("🗓️ هالأسبوع", "🗓️ Semaine")], ["board", TT("🏆 ترتيب الصف", "🏆 Classement")]].map(function (b) {
    return '<button type="button" role="tab" class="pay-tab' + (b[0] === tab ? " on" : "") + '" data-paytab="' + b[0] + '" aria-selected="' + (b[0] === tab) + '">' + esc(b[1]) + "</button>"; }).join("") + "</div>";
  var cd = careDays(), tid = tk.replace(/-/g, "");
  if (tab === "day") h += slip(withCare(mt ? mt.L : null, tid, cd), TT("كشف راتب اليوم", "Bulletin du jour"), fmtD(tk));
  else if (tab === "week") {
    var days = P.weekDays(mon), Ls = days.map(function (k) { var id = k.replace(/-/g, ""); return withCare(k === tk ? (mt && mt.L) : c.mine[id], id, cd); });
    h += slip(sumL(Ls), TT("كشف راتب الأسبوع", "Bulletin de la semaine"), fmtD(days[0]) + " → " + fmtD(days[6]));
    h += '<ul class="pay-days">' + days.map(function (k, i) { var r = (k === tk ? (mt ? mt.net : 0) : ((c.days[k.replace(/-/g, "")] || {})[mu] || [0, 0, 0, 0])[3]) + careNet(k.replace(/-/g, ""), cd); return k > tk ? "" : '<li><span>' + esc(fmtD(k)) + '</span><b dir="ltr">' + esc(money(r | 0)) + "</b></li>"; }).join("") + "</ul>";
  } else {
    var B = weekBoard(mon), tg = tags();
    h += '<p class="pay-bh">' + esc(TT("🏆 رواتب الصف هالأسبوع (" + fmtD(mon) + " →)", "🏆 Salaires de la semaine (" + fmtD(mon) + " →)")) + "</p>";
    h += B.length ? '<ol class="pay-bd">' + B.slice(0, 15).map(function (r, i) { var tt = tg[r.u] || { r: P.RANKS[0] };
      return '<li class="' + (r.u === mu ? "me" : "") + '"><span>' + (i < 3 ? ["🥇", "🥈", "🥉"][i] : (i + 1) + ".") + " " + esc(String(r.n || "?").split(" ")[0]) + " " + rankBadge(tt) + '</span><b dir="ltr">' + esc(money(r.net)) + "</b></li>"; }).join("") + "</ol>"
      : '<p class="pay-empty">' + esc(TT("لسّا ما حدا اشتغل هالأسبوع — كون إنت الأوّل!", "Personne n'a encore travaillé cette semaine — sois le premier !")) + "</p>";
    if (!shared) h += '<p class="pay-note">' + esc(TT("📴 مش مسجّل دخول: الترتيب بيبيّن بس شغلك عهالتلفون.", "📴 Hors connexion : seul ton travail sur ce téléphone apparaît.")) + "</p>";
  }
  h += '<p class="pay-how">' + esc(TT("ℹ️ ل.ن = ليرة نيرسين (فلوس افتراضية): كل نقطة بخطوة صح = 10 ل.ن · فرز صح +40 · مريض استقرّ +100 لكل مين ساعد (إسعاف +150) · ⏰ إعادة تقييم بوقتها +30 · موعد فات −20 · الغلط والأذى والتلميحات بينخصمو. الرتبة حسب كل يلّي ربحتو: 🩺 ممرّض من 1,000 · ⭐ ممرّض أوّل من 5,000.",
    "ℹ️ NS = nursins (monnaie virtuelle) : chaque point d'un geste juste = 10 NS · tri juste +40 · patient stabilisé +100 pour chaque aidant (ambulance +150) · ⏰ réévaluation à l'heure +30 · manquée −20 · erreurs, actes dangereux et indices sont retenus. Rang selon le total : 🩺 infirmier dès 1 000 · ⭐ principal dès 5 000.")) + "</p>";
  return h + "</div>";
}
function on(f) { subs.push(f); }
w.NursinPay = { V: V, core: P, sync: sync, todayMap: todayMap, weekBoard: weekBoard, totalOf: totalOf, tags: tags, tagOf: tagOf, isSup: isSup, supNow: supNow, panelHtml: panelHtml, money: money, on: on,
  mine: function () { var m = todayMap()[meUid()]; return m ? m.net : 0; }, reset: function () { tagC = null; } };
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
