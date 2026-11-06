/* 🔀 «السؤال ما بيرجع بنفس الشكل» (Abdullah, Nov 6 2026 11:01 PM: «يكون ذكي كمان بتغيير الاسألة ت ما جاوب من رؤية السؤال»).
   Whenever a question comes back (🔁 spaced review, 🚌 ride review, quizzes, 🔁 سؤال شبيه, Osman's path questions), NursinVar.vary(q)
   hands the surface a VARIANT of it — the same id, self-consistent (o / a / x), so the a/b/c labels, scoring, ❌ «ليش غلط؟»
   (assets/wrongx.js), 50/50, weak points and the spaced review keep working: the right answer is tracked by its VALUE.
     1) the options in a new order every time (never the order he saw last);
     2) when the same lesson's other questions have WRONG options of the same type (same script, digits or not, similar length),
        one distractor is swapped for one of them — never an option equal to / inside / around any right answer of that lesson,
        never on «كل ما سبق / aucune…» questions, so two options can never both be right;
     3) ≈ 1 repeat in 3, a short single-fact question flips to «أيّا منن مش صحيح؟» — 2 true statements = other questions of the SAME
        lesson with their own right answers (only when ≥ 3 such exist) + 1 false one = this stem with one of its own wrong options.
        Nothing is written here: every word comes from the bank (assets/quiz-data.js).
   The FIRST showing of a question stays exactly as written (seen count in nursin_qseen_v1; a question already in 🔁 / ⚠️ counts as seen).
   Surfaces that keep answers across reloads (🧭 path, 🚌) pass {keep: day}: the same variant all day. Local only. ES5 for iOS 12. */
(function (w, d) {
  "use strict";
  var K = "nursin_qseen_v1", KD = "nursin_qvday_v1", MAXK = 1500;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function rng(seed) { var x = (seed >>> 0) || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function fold(s) {
    s = String(s == null ? "" : s).replace(/<[^>]*>/g, " ").toLowerCase();
    try { s = s.normalize("NFD"); } catch (e) {}
    return s.replace(/[\u0300-\u036f\u064b-\u0655\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^a-z0-9\u0621-\u064a\u0660-\u0669]+/g, " ").trim();
  }
  function plain(s) { return String(s == null ? "" : s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

  /* ---------------- pure ---------------- */
  // a new order of n options (index lists), never equal to `avoid` (the order shown last)
  function perm(n, seed, avoid) {
    var av = avoid ? String(avoid) : "", p, i, j, t, r;
    for (var k = 0; k < 8; k++) {
      r = rng(seed + k * 7919); p = []; for (i = 0; i < n; i++) p.push(i);
      for (i = n - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
      if (p.join("") !== av) return p;
    }
    p = []; for (i = 0; i < n; i++) p.push((i + 1) % n); return p;     // a rotation always differs
  }
  var REF = /كل ما سبق|كل ما ذكر|جميع ما|كل الأجوب|كل الاجوب|كلهن|كلن صح|ولا وحد|ولا واحد|لا شي|tous|toutes|aucun|aucune|all of|none of|les deux|(^|\s)[abcأبج]\s*(و|\+|et|&)\s*[abcأبج](\s|$)/i;
  var NEG = /(^|[\s«(])(ما|مش|لا|ليس|غير|بلا|مو)(?=[\s»)،,؟?]|$)|مش صحيح|غير صحيح|ليس|مش من|ما عدا|غلط|خاطئ|\bsauf\b|\bfaux\b|\bfausse\b|\bpas\b|\bnot\b|\bexcept/i;
  var CTX = /نفس المريض|نفس الحالة|هالمريض|هيدا المريض|هالحالة|المريض نفسو|même patient|ce patient|cette patiente|même cas/i;
  function lat(s) { var a = (String(s).match(/[A-Za-zÀ-ÿ]/g) || []).length, b = (String(s).match(/[\u0600-\u06ff]/g) || []).length; return a > b; }
  function num(s) { return /[0-9\u0660-\u0669]/.test(String(s)); }
  function sameType(a, b) { var la = plain(a).length, lb = plain(b).length; return lat(a) === lat(b) && num(a) === num(b) && la >= lb * 0.6 && la <= lb * 1.6; }
  function hasRef(q) { return (q.o || []).some(function (o) { return REF.test(plain(o)); }); }
  // swap candidates for q from its lesson's peers: WRONG options elsewhere, of the same type, never near any right answer of the lesson
  function swapCands(q, peers) {
    if (!q || !q.o || hasRef(q) || q.ls) return [];
    var own = q.o.map(fold), right = [], seen = {}, out = [], ca = fold(q.o[q.a]);
    (peers || []).concat([q]).forEach(function (p) { if (p && p.o && p.o[p.a] != null) right.push(fold(p.o[p.a])); });
    (peers || []).forEach(function (p) {
      if (!p || p.id === q.id || !p.o || hasRef(p)) return;
      p.o.forEach(function (o, j) {
        if (j === p.a) return; var f = fold(o);
        if (!f || f.length < 2 || seen[f] || own.indexOf(f) > -1 || REF.test(plain(o))) return;
        if (right.some(function (r) { return r && (r === f || r.indexOf(f) > -1 || f.indexOf(r) > -1); })) return;
        if (ca && (ca.indexOf(f) > -1 || f.indexOf(ca) > -1)) return;
        if (!sameType(o, q.o[q.a])) return;
        seen[f] = 1; out.push({ o: o, from: p.id });
      });
    });
    return out;
  }
  function stem(q) { return plain(q.q).replace(/[\s:：؟?]+$/, ""); }
  function isFact(q) { return !!(q && q.o && q.o.length >= 2 && q.o[q.a] != null && !q.ls && !hasRef(q) && stem(q).length >= 6 && stem(q).length <= 90 && plain(q.o[q.a]).length <= 45 && !NEG.test(stem(q)) && !CTX.test(stem(q))); }
  function fact(q, j) { return stem(q) + " ← " + plain(q.o[j == null ? q.a : j]); }
  // true statements of the lesson (other questions + their own right answers)
  function facts(q, peers) { var seen = {}, out = []; (peers || []).forEach(function (p) { if (!p || p.id === q.id || !isFact(p)) return; var f = fact(p), k = fold(f); if (seen[k]) return; seen[k] = 1; out.push(f); }); return out; }
  function notForm(q, peers, seed) {
    if (!isFact(q)) return null; var fs = facts(q, peers); if (fs.length < 3) return null;
    var wr = []; q.o.forEach(function (o, j) { if (j !== q.a && !REF.test(plain(o))) wr.push(j); }); if (!wr.length) return null;
    var r = rng(seed ^ 0x9e3779b9), wj = wr[Math.floor(r() * wr.length)], i1 = Math.floor(r() * fs.length), i2 = (i1 + 1 + Math.floor(r() * (fs.length - 1))) % fs.length;
    var bad = fact(q, wj), opts = [bad, fs[i1], fs[i2]];
    return { q: T("أيّا منن مش صحيح؟", "Laquelle est FAUSSE ? (أيّا منن مش صحيح)"), o: opts, a: 0,
      x: T("الغلط: «", "La fausse (الغلط) : « ") + bad + T("». الصح: «", " ». La bonne (الصح) : « ") + fact(q) + T("».", " »."), wj: wj };
  }
  // the variant: n = times shown before (0 → as written), prev = the order shown last
  function variant(q, peers, n, seed, prev) {
    if (!q || !q.o || q.o.length < 2 || q.a == null || !n) return q;
    var out = {}, k; for (k in q) if (Object.prototype.hasOwnProperty.call(q, k)) out[k] = q[k];
    out.vq = 1; out.vn = n;
    var nf = ((hash(q.id) + n) % 3 === 0) ? notForm(q, peers, seed) : null, opts, ai;
    if (nf) { out.q = nf.q; out.x = nf.x; opts = nf.o; ai = 0; out.vf = "not"; out.vw = nf.wj; }
    else {
      opts = q.o.slice(); ai = q.a;
      var cs = swapCands(q, peers);
      if (cs.length) {
        var r = rng(seed ^ 0x51ed27), c = cs[Math.floor(r() * cs.length)], wr = [];
        q.o.forEach(function (o, j) { if (j !== q.a && !REF.test(plain(o)) && sameType(o, c.o)) wr.push(j); });
        if (wr.length) { var wi = wr[Math.floor(r() * wr.length)]; out.vs = { i: wi, was: q.o[wi], from: c.from }; opts[wi] = c.o; }
      }
    }
    var p = perm(opts.length, seed, prev);
    out.o = p.map(function (i) { return opts[i]; }); out.a = p.indexOf(ai); out.vp = p.join("");
    return out;
  }

  /* ---------------- the bank by lesson ---------------- */
  var gN = -1, gMap = null;
  function keyOf(q) { var R = w.NursinRet; try { if (R && R.ofQ) { var id = R.ofQ(q); if (id) return id; } } catch (e) {} return (q.t || "") + ":" + (q.l || ""); }
  function peersOf(q) {
    var B = w.QUIZ || []; if (gN !== B.length) { gN = B.length; gMap = {}; B.forEach(function (y) { if (y && y.id && y.o) { var k = keyOf(y); (gMap[k] || (gMap[k] = [])).push(y); } }); }
    return (gMap && gMap[keyOf(q)]) || [];
  }
  function seenBefore(id) {
    try { var S = w.NursinSRS; if (S && S.has && S.has(id)) return true; } catch (e) {}
    var wk = lsGet("nursin_weak_v1"); return !!(wk && wk.items && wk.items[id]);
  }
  function orig(q) { if (!q || !q.vq) return q; var B = w.QUIZ || []; for (var i = 0; i < B.length; i++) if (B[i].id === q.id) return B[i]; return q; }
  function vary(q, opt) {
    if (!q || !q.id || !q.o || q.o.length < 2 || q.a == null || q.vq) return q;
    opt = opt || {};
    try {
      var keep = opt.keep ? String(opt.keep) : "", kd = keep ? lsGet(KD) : null, mk = keep + "|" + q.id, sp;
      if (keep) { if (!kd || typeof kd.m !== "object" || !kd.m) kd = { m: {} }; sp = kd.m[mk]; if (sp) return variant(q, peersOf(q), sp[0], sp[1], sp[2]); }
      var S = lsGet(K); if (!S || typeof S !== "object") S = {};
      var cur = S[q.id] || null, n = cur ? cur[0] | 0 : 0, prev = cur ? cur[1] : "";
      if (!n && seenBefore(q.id)) n = 1;
      var seed = hash(q.id + "|" + n + "|" + (keep || Date.now()));
      var v = variant(q, peersOf(q), n, seed, prev || null);
      S[q.id] = [n + 1, v.vp || "", Date.now()];
      var ks = Object.keys(S); if (ks.length > MAXK) ks.sort(function (a, b) { return (S[a][2] || 0) - (S[b][2] || 0); }).slice(0, ks.length - MAXK).forEach(function (z) { delete S[z]; });
      lsSet(K, S);
      if (keep) {
        kd.m[mk] = [n, seed, prev || null, Date.now()];
        var km = Object.keys(kd.m); if (km.length > 300) km.sort(function (a, b) { return (kd.m[a][3] || 0) - (kd.m[b][3] || 0); }).slice(0, km.length - 300).forEach(function (z) { delete kd.m[z]; });
        lsSet(KD, kd);
      }
      return v;
    } catch (e) { return q; }
  }
  function varyAll(qs, opt) { return (qs || []).map(function (q) { return vary(q, opt); }); }
  w.NursinVar = { vary: vary, varyAll: varyAll, variant: variant, perm: perm, swapCands: swapCands, facts: facts, notForm: notForm, isFact: isFact, sameType: sameType, fold: fold, orig: orig, peersOf: peersOf, key: K };
})(window, window.document);
