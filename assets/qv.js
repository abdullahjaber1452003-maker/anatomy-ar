/* 🔄 30w «كل يوم صيغة جديدة» (Abdullah, Nov 8 2026 2:43 PM: «كل شي في أسئلة موجودة لحاله يغير من صيغتها، من طريقة كتابتها»).
   A bank question (window.QUIZ) may carry v:[{q, o?}, …] = other wordings of the SAME question, written from its own text / explanation:
   same fact, same right answer at the same index, options (when reworded) in the same order, so «ليش غلط؟» (q.why, by index), x, scoring,
   🔁 spaced review, ⚠️ weak points and stats all keep using q.id + q.a and are unaffected.
   NURSIN_QV.pick(qid, baseQ[, date]) → the wording of that day: index (dayNumber + hash(qid)) % (variants + 1), 0 = as written, local date
   via new Date(y, m-1, d) → the same day = the same wording everywhere, the next day another one. applyAll(arr) sets it in place on the
   bank (keeping the original in q0 / o0), so every surface that draws from window.QUIZ (subject quizzes, 🎯 midterm, 🔁 حفظي, 🏆 المليون,
   🧭 Osman, 🚌…) shows today's wording; Reels (own copy in assets/reels-data.js) calls pick(). 🇫🇷 Français seulement keeps the original
   (its dictionary is keyed by the original Arabic). Variants so far: Réa (71/71). Other subjects: add v to their questions, nothing else. ES5. */
(function (w) {
  "use strict";
  if (w.NURSIN_QV) return;
  var EPOCH = new Date(2026, 0, 1);
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function dayNumber(dt) {
    dt = dt instanceof Date && !isNaN(dt.getTime()) ? dt : new Date();
    var d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    return Math.round((d0.getTime() - EPOCH.getTime()) / 86400000);   // round: a 23 h / 25 h DST day still counts as one
  }
  function fr() { try { return !!(w.Lang && w.Lang.fr); } catch (e) { return false; } }
  function varsOf(q) { var v = q && q.v; return v && v.length ? v : null; }
  function index(qid, n, dt) { if (!n) return 0; var k = (dayNumber(dt) + hash(qid)) % (n + 1); return k < 0 ? k + n + 1 : k; }
  function pick(qid, baseQ, dt) {
    var q = baseQ; if (!q) return q;
    var v = varsOf(q), q0 = q.q0 != null ? q.q0 : q.q, o0 = q.o0 || q.o;
    if (!v || fr()) { if (q.q0 == null) return q; var c0 = {}, k0; for (k0 in q) if (Object.prototype.hasOwnProperty.call(q, k0)) c0[k0] = q[k0]; c0.q = q0; c0.o = o0; c0.qvi = 0; return c0; }
    var i = index(qid || q.id, v.length, dt), e = i ? v[i - 1] : null, out = {}, k;
    for (k in q) if (Object.prototype.hasOwnProperty.call(q, k)) out[k] = q[k];
    out.q = e && e.q ? e.q : q0;
    out.o = e && e.o && e.o.length === o0.length ? e.o.slice() : o0;
    out.qvi = i;
    return out;
  }
  function apply(q, dt) {
    if (!q || !varsOf(q)) return q;
    if (q.q0 == null) { q.q0 = q.q; q.o0 = q.o; }
    var p = pick(q.id, q, dt); q.q = p.q; q.o = p.o; q.qvi = p.qvi; return q;
  }
  function applyAll(arr, dt) { (arr || []).forEach(function (q) { apply(q, dt); }); return arr; }
  function count(arr) { var by = {}; (arr || []).forEach(function (q) { var t = (q && q.t) || "?"; var b = by[t] || (by[t] = { all: 0, v: 0 }); b.all++; if (varsOf(q)) b.v++; }); return by; }
  w.NURSIN_QV = { pick: pick, apply: apply, applyAll: applyAll, index: index, dayNumber: dayNumber, hash: hash, count: count };
  if (w.QUIZ) applyAll(w.QUIZ);
})(window);
