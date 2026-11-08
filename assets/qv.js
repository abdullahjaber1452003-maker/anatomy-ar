/* 🔄 «السؤال بيرجع بصيغة تانية» — 30w (Abdullah, Nov 8 2026 2:43 PM: «كل شي في أسئلة موجودة لحاله يغير من صيغتها، من طريقة كتابتها»)
   + 30x, practice-based (3:33 PM: «كل الأسئلة بالموقع… بس يكون اتدرّب على هالسؤال، تاني يوم بيقلبله صيغة تانية. الأسئلة اللي بيغلط فيها
   يقلبله صيغتها بطريقة تانية»).
   A bank question (window.QUIZ, any subject) may carry v:[{q, o?}, …] = other wordings of the SAME question, written from its own text /
   explanation: same fact, same right answer at the same index, options (when reworded) in the same order, so «ليش غلط؟» (q.why, by index),
   x, scoring, 🔁 spaced review, ⚠️ weak points and stats keep using q.id + q.a and are unaffected. No v → the question as written.
   The rule, per question id (localStorage nursin_qvp_v1 {id: [i shown, day answered or -1, wrong 0/1]}, local only):
     • never practised → as written (i = 0);
     • answered WRONG → the next time it is drawn, the next wording (never the one he failed);
     • answered (right) on an EARLIER day → the next wording;  • otherwise → the same wording as last time (same day = same everywhere).
   Wordings cycle as written → v1 → v2 → as written…  Answers are heard from every surface: the nursin:answer event (quizzes, 🔗, Osman),
   Weak.record (quiz, review, سؤال شبيه, 🚌…) and NursinSRS.record / answer (🏆 المليون, games, حفظي…).
   applyAll(arr) sets the drawn wording in place on the bank (original kept in q0 / o0) when the bank loads, so every surface that draws from
   window.QUIZ (subject quizzes, 🎯 midterm, 🔁 حفظي, 🏆, 🧭 Osman, 🚌…) shows it; Reels (own copy, assets/reels-data.js) calls pick().
   🇫🇷 Français seulement keeps the original (its dictionary is keyed by the original Arabic). ES5 for iOS 12. */
(function (w) {
  "use strict";
  if (w.NURSIN_QV) return;
  var K = "nursin_qvp_v1", MAXK = 4000, EPOCH = new Date(2026, 0, 1), mem = null, hold = 0, dirty = 0;
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function dayNumber(dt) {
    dt = dt instanceof Date && !isNaN(dt.getTime()) ? dt : new Date();
    var d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    return Math.round((d0.getTime() - EPOCH.getTime()) / 86400000);   // round: a 23 h / 25 h DST day still counts as one
  }
  function fr() { try { return !!(w.Lang && w.Lang.fr); } catch (e) { return false; } }
  function varsOf(q) { var v = q && q.v; return v && v.length ? v : null; }
  function load() { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) { mem = null; } if (!mem || typeof mem !== "object") mem = {}; return mem; }
  function save() {
    if (hold) { dirty = 1; return; }
    var S = load(), ks = Object.keys(S);
    if (ks.length > MAXK) ks.sort(function (a, b) { return (S[a][3] || 0) - (S[b][3] || 0); }).slice(0, ks.length - MAXK).forEach(function (z) { delete S[z]; });
    try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {}
  }
  /* pure: which wording to draw. rec = [i shown, day answered (-1 = not since shown), wrong], n = variants, today = dayNumber.
     → [index, the record to keep] */
  function next(rec, n, today) {
    if (!n) return [0, rec || null];
    if (!rec) return [0, null];
    var i = (rec[0] | 0) % (n + 1), dA = rec[1] == null ? -1 : rec[1] | 0;
    if (rec[2] || (dA > -1 && dA < today)) { i = (i + 1) % (n + 1); return [i, [i, -1, 0, today]]; }
    return [i, rec];
  }
  function draw(id, n, dt, keep) {
    var S = load(), r = next(S[id] || null, n, dayNumber(dt));
    if (keep !== false && r[1] && r[1] !== S[id]) { S[id] = r[1]; save(); }
    return r[0];
  }
  function copy(q) { var c = {}, k; for (k in q) if (Object.prototype.hasOwnProperty.call(q, k)) c[k] = q[k]; return c; }
  function pick(qid, baseQ, dt) {
    var q = baseQ; if (!q) return q; patch();
    var v = varsOf(q), q0 = q.q0 != null ? q.q0 : q.q, o0 = q.o0 || q.o, out;
    if (!v || fr()) { if (q.q0 == null) return q; out = copy(q); out.q = q0; out.o = o0; out.qvi = 0; return out; }
    var i = draw(qid || q.id, v.length, dt), e = i ? v[i - 1] : null;
    out = copy(q); out.q = e && e.q ? e.q : q0; out.o = e && e.o && e.o.length === o0.length ? e.o.slice() : o0; out.qvi = i;
    return out;
  }
  function apply(q, dt) {
    if (!q || !varsOf(q)) return q;
    if (q.q0 == null) { q.q0 = q.q; q.o0 = q.o; }
    var p = pick(q.id, q, dt); q.q = p.q; q.o = p.o; q.qvi = p.qvi; return q;
  }
  function applyAll(arr, dt) { hold++; try { (arr || []).forEach(function (q) { apply(q, dt); }); } finally { hold--; } if (!hold && dirty) { dirty = 0; save(); } return arr; }
  /* an answer: which wording he answered (the one drawn last), the day, right / wrong */
  function mark(id, ok, dt) {
    if (!id) return; id = String(id);
    var S = load(), r = S[id], t = dayNumber(dt), i = r ? r[0] | 0 : 0;
    if (!r && !hasVars(id)) return;
    S[id] = [i, t, ok ? (r && r[1] === t && r[2] ? 1 : 0) : 1, t]; save();   // a wrong answer today stays «wrong» even if a later retry is right
  }
  var byId = null, byN = -1;
  function hasVars(id) { var B = w.QUIZ || []; if (byN !== B.length) { byN = B.length; byId = {}; B.forEach(function (y) { if (y && y.id && varsOf(y)) byId[y.id] = 1; }); } if (byId[id]) return true; try { var R = w.NREELS && w.NREELS.q, s; if (R) for (s in R) if (Object.prototype.hasOwnProperty.call(R, s) && R[s].some(function (y) { return y.id === id && varsOf(y); })) return true; } catch (e) {} return false; }
  function idOf(q) { return q && typeof q === "object" ? (q.id || (q.src && q.src.id)) : q; }
  function wrap(o, name) {
    if (!o || typeof o[name] !== "function" || o[name].__qv) return;
    var f = o[name], g = function (q, ok) { try { mark(idOf(q), !!ok); } catch (e) {} return f.apply(this, arguments); };
    g.__qv = 1; o[name] = g;
  }
  function patch() { try { wrap(w.Weak, "record"); wrap(w.NursinSRS, "record"); wrap(w.NursinSRS, "answer"); } catch (e) {} }
  var dd = w.document;
  if (dd && dd.addEventListener) {
    dd.addEventListener("nursin:answer", function (e) { var x = e && e.detail || {}; patch(); if (x.qid) mark(x.qid, !!x.ok); });
    dd.addEventListener("DOMContentLoaded", patch);
    if (w.addEventListener) w.addEventListener("load", patch);
  }
  w.NURSIN_QV = { pick: pick, apply: apply, applyAll: applyAll, next: next, mark: mark, patch: patch, dayNumber: dayNumber, hash: hash, key: K, _reset: function () { mem = null; } };
  if (w.QUIZ) applyAll(w.QUIZ);
})(window);
