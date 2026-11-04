/* ⏳ «كل شي ياخد وقتو» + ⏰ «ارجع قيّم المريض» (29d — Abdullah, Nov 4 2026 7:21–7:25 AM «كل شي يأخذ وقته… تقريباً عشر ثواني» + 7:37 AM
   «عطيناه دواه ينكتب شي إنه خلص… لازم بعد شي ساعة ارجع للمريض»). Pure: no DOM, no Firestore.
   (1) Every nursing act takes time like real life: a quick check 3–5 s, a normal act ~10 s, an IV line / a sonde / blood 12–15 s. The ring
       fills over his avatar, the result (points, salary) lands when it is done, «✖ إلغاء» stops it, and he can't start a 2nd act on the SAME
       patient before the first ends (other students — and his other patient — go on in parallel). ?actx=0.1 (or localStorage nursin_actx)
       shortens every act for tests.
   (2) After a drug (or a fluid / O₂ / blood) the dossier reads «✅ أُعطي … الساعة HH:MM» and a ⏰ reassessment is due in 60 min (30 min
       for the urgent ones: furosemide, insulin, glucose 30 %, morphine, the catecholamines…). On time (5 min before → 15 min after) = +30 ل.ن,
       missed = −20 ل.ن. Kept on the phone (nursin_care_v1); the bonus/deduction show on HIS payslip (the class ranking counts shared steps only). */
(function (w) {
/* ==care-core== */
var LiveCare = (function () {
  var MIN = 6e4, EARLY = 5 * MIN, GRACE = 15 * MIN, REAS = 30, LATE = -20, KEEP = 3 * 864e5, KEY = "nursin_care_v1";
  // seconds per act (the base: real life shortened; the test multiplier scales them)
  var SEC = { wash: 4, eval: 4, pouls: 5, gly: 4, calm: 3, paravent: 3, acc: 4, jeun: 3, repos: 3, pos_semi: 4, pos_trend: 4, pos_pls: 5, pos_tete30: 4,
    leg_down: 3, drink: 3, es: 4, isol: 4, swallow: 5, refroid: 5, reev: 5, stop: 6, stopdrug: 4, shock: 5, airway: 6,
    ecg: 8, bilan: 8, gds: 8, bio: 8, vvp: 15, sonde: 15, sang: 14, remp: 12, nora: 12, dobu: 12, immob: 12, cpr: 12, vent: 10, guedel: 10 };
  var NORMAL = 10, TRI = 5, QUICK = 5;
  // ⏰ the acts that need a follow-up, and the urgent ones (30 min)
  var FOLLOW = { o2: 60, remp: 30, sang: 30, refroid: 60, aero: 30, trinit: 30, aspi: 60, hep: 60, furo: 30, mann: 30, morph: 30, g30: 30, insu: 30,
    digi: 30, vitk: 60, digo: 60, para: 60, bicar: 30, phen: 30, adre: 30, nora: 30, atro: 30, dobu: 30, deca: 60, atb: 60 };
  // what counts as «I came back and reassessed him»: the ⏰ button itself or a check of his signs
  var REV = { reev: 1, eval: 1, pouls: 1, gly: 1, mon: 1, ecg: 1 };
  function base(a) { a = String(a || "").replace(/^(k|n|r|s|g|x\d)_/, ""); return a; }
  // the multiplier: ?actx=0.1 / localStorage nursin_actx — clamped 0.02…1 (never longer than real)
  function mult(search, stored) {
    var m = /[?&]actx=([0-9.]+)/.exec(String(search || "")), v = m ? +m[1] : stored != null && stored !== "" ? +stored : 1;
    return isFinite(v) && v > 0 ? Math.max(0.02, Math.min(1, v)) : 1;
  }
  // how long an act takes, in ms (0 = instant: a dossier answer, 📞 the call, 💡 a hint)
  function dur(a, A, x) {
    var b = base(a);
    if (!b || b === "hint" || b === "call" || b.indexOf("f_") === 0) return 0;
    if (/^tg[1-4][eknrsg]$/.test(b)) return TRI * 1000 * (x == null ? 1 : x);
    var s = SEC[b] != null ? SEC[b] : A && A.at === "bed" ? (A.g === "ev" || A.g === "pos" || A.g === "soin" ? QUICK : NORMAL) : A ? QUICK : 0;
    return Math.round(s * 1000 * (x == null ? 1 : x));
  }
  function kind(ms) { return ms <= 5500 ? "quick" : ms <= 10500 ? "normal" : "long"; }
  // the work in progress, one per patient: busy = { pid: { a, t0, end } }
  function canStart(busy, pid, now) { var b = busy && busy[pid]; return b && b.end > now ? { ok: false, left: b.end - now, a: b.a } : { ok: true }; }
  function start(busy, pid, a, now, ms) { var c = canStart(busy, pid, now); if (!c.ok) return c; busy[pid] = { a: a, t0: now, end: now + ms }; return { ok: true, end: now + ms }; }
  function prog(b, now) { if (!b) return 0; var s = b.end - b.t0; return s <= 0 ? 1 : Math.max(0, Math.min(1, (now - b.t0) / s)); }
  // the patient's id across the day: YYYYMMDD|dept|ambulance|bed
  function pid(day, dk, ai, pk) { return String(day) + "|" + (dk || "er") + "|" + (ai | 0) + "|" + (pk === "b" ? "b" : "a"); }
  function follow(a) { return FOLLOW[base(a)] || 0; }
  // a drug given (ok) → the follow-up (one per patient + act; the same act again re-arms it)
  function give(list, o, now) {
    var mins = follow(o.a); if (!mins) return null;
    var f = { id: o.pid + "#" + base(o.a), pid: o.pid, dk: o.dk, ai: o.ai | 0, pk: o.pk, nm: o.nm || "", a: base(o.a), at: now, due: now + mins * MIN, m: mins, s: "w" };
    for (var i = list.length - 1; i >= 0; i--) if (list[i].id === f.id && list[i].s !== "ok" && list[i].s !== "miss") list.splice(i, 1);
    list.push(f); return f;
  }
  // w = waiting · soon (5 min before) · due (until 15 min after) · miss · ok
  function status(f, now) { if (f.s === "ok" || f.s === "miss") return f.s; if (now < f.due - EARLY) return "w"; if (now < f.due) return "soon"; if (now <= f.due + GRACE) return "due"; return "late"; }
  // he reassessed patient pid at now → the follow-ups it settles (+30 each), the ones still too early
  function reassess(list, p, a, now) {
    var ok = [], early = []; if (!REV[base(a)]) return { ok: ok, early: early };
    list.forEach(function (f) { if (f.pid !== p) return; var s = status(f, now);
      if (s === "soon" || s === "due") { f.s = "ok"; f.done = now; ok.push(f); } else if (s === "w") early.push(f); });
    return { ok: ok, early: early };
  }
  // the follow-ups that went past their window → missed (−20 each), returned once
  function sweep(list, now) { var out = []; list.forEach(function (f) { if (status(f, now) === "late") { f.s = "miss"; f.done = f.due + GRACE; out.push(f); } }); return out; }
  // the ones that just became due (to ring 🔔 once each)
  function ringing(list, now, rung) { return list.filter(function (f) { var s = status(f, now); return (s === "soon" || s === "due") && !(rung && rung[f.id]); }); }
  function prune(list, now) { return list.filter(function (f) { return now - f.at < KEEP; }); }
  // the payslip lines of each day (the day of the due time): { YYYYMMDD: { reas, late } }
  function extras(list, dayOf) {
    var o = {}; list.forEach(function (f) { if (f.s !== "ok" && f.s !== "miss") return; if (f.z) return;   // 29e: f.z = paid in the shared doc (z fu / z fx)
      var k = dayOf(f.due), r = o[k] || (o[k] = { reas: 0, late: 0 });
      if (f.s === "ok") r.reas += REAS; else r.late += LATE; }); return o;
  }
  function left(ms) { ms = Math.max(0, ms); var s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") + m : m) + ":" + (x < 10 ? "0" : "") + x; }
  function load(s) { try { var o = JSON.parse(s || "null"); return o && Array.isArray(o.fu) ? o : { fu: [], rung: {} }; } catch (e) { return { fu: [], rung: {} }; } }
  return { MIN: MIN, EARLY: EARLY, GRACE: GRACE, REAS: REAS, LATE: LATE, KEY: KEY, SEC: SEC, NORMAL: NORMAL, FOLLOW: FOLLOW, REV: REV,
    base: base, mult: mult, dur: dur, kind: kind, canStart: canStart, start: start, prog: prog, pid: pid, follow: follow, give: give, status: status,
    reassess: reassess, sweep: sweep, ringing: ringing, prune: prune, extras: extras, left: left, load: load };
})();
/* ==/care-core== */
if (w) w.LiveCare = LiveCare;
})(typeof window !== "undefined" ? window : null);
