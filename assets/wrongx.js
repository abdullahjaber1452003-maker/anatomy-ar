/* ❌ «ليش غلط؟» — the wrong-answer box (Abdullah approved, Nov 6 2026, 29u). ONE shared piece for every quiz surface: 📝 quiz.html (every
   مادة, 🔁 مراجعة اليوم / spaced review, 🎯 امتحان الفصل plan quizzes, ⚠️ أخطائك), 📝 «كويز هالجزء» + 🩺 حالة مريض (retain.js), 🔗/🌅 sheets
   (extra.js) and the 🚌 ride review (commute.js). After a WRONG answer only (a right answer shows nothing new), under the options:
     ❌ ليش غلط؟  the sentence of the question's own explanation (x) that speaks about HIS option (its key words) at least as much as about
                  the right one; nothing found → no reason is made up, the line just points to the right one
     ✅ الصح:     the sentence of x that carries the right option's key words (x's first sentence when none does); no x → from the lesson text
     📖 ارجع للدرس  the exact lesson / part anchor (assets/lessons.js parts + assets/partq-data.js), same page (closes the sheet, opens it) or cross-page
     🔁 سؤال شبيه   one other question he hasn't met, same part → same lesson → same مادة, answered right here; it counts like any answer
                  (نقاط ضعفك Weak.record + 🔁 NursinSRS.answer + lesson memory NursinRet.apply) — no nursin:answer event, so no extra counters.
   Every reason line is clamped to 2 lines (tap = open). Local only: no network, no Firestore. ES5 for iOS 12. No ads here. */
(function (w, d) {
  "use strict";
  var V = "20261031d";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function page() { try { return (w.location.pathname || "").split("/").pop() || "index.html"; } catch (e) { return "index.html"; } }
  var L = "abc", simv = {};

  /* ---------------- text tools (pure; the tests run them in node) ---------------- */
  var STOP = {};
  ("على عند عن من مع او أو في هو هي هوي هيي ما لا بس كل يلي اللي الي شي هيدا هيدي هيك لما اذا إذا مش كان كانت بعد قبل لأن لان يعني منو منها فيه فيها " +
   "the and for with des les une pour avec dans par sur est pas plus sans que qui aux ses son leur").split(" ").forEach(function (t) { STOP[t] = 1; });
  function fold(s) {
    s = String(s == null ? "" : s).replace(/<[^>]*>/g, " ").toLowerCase();
    try { s = s.normalize("NFD"); } catch (e) {}
    return s.replace(/[\u0300-\u036f\u064b-\u0655\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  }
  function toks(s) {
    var out = [], seen = {};
    fold(s).split(/[^a-z0-9\u0621-\u064a\u0660-\u0669]+/).forEach(function (t) {
      if (/^[\u0621-\u064a]+$/.test(t)) t = t.replace(/^(و|ب|ل|ف|ك)?ال(?=[\u0621-\u064a]{3})/, "");
      if (t.length < 3 || STOP[t] || seen[t]) return; seen[t] = 1; out.push(t);
    });
    return out;
  }
  function sents(x) {
    var s = String(x == null ? "" : x).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    var out = [];
    s.replace(/([.!?؟؛\n]+)(\s+|$)/g, "$1\u0001").split(/\u0001|\n/).forEach(function (p) { p = p.replace(/\s+/g, " ").trim(); if (p.length > 2) out.push(p); });
    return out;
  }
  function hit(st, t) {                        // st = the folded tokens of a sentence (object); t = one option token
    if (st[t]) return true;
    if (t.length >= 5) { var p = t.slice(0, 5); for (var k in st) if (k.length >= 5 && k.slice(0, 5) === p) return true; }
    return false;
  }
  function score(s, ts) { var st = {}; toks(s).forEach(function (t) { st[t] = 1; }); var n = 0; ts.forEach(function (t) { if (hit(st, t)) n++; }); return n; }
  function best(list, ts, avoid) {             // the sentence carrying the most of these key words (≥1), not `avoid` when there is another
    var b = null, bs = 0;
    list.forEach(function (s) { var n = score(s, ts); if (n > bs || (n === bs && n > 0 && b === avoid && s !== avoid)) { b = s; bs = n; } });
    return bs > 0 ? b : null;
  }
  function only(a, b) { var o = {}; b.forEach(function (t) { o[t] = 1; }); var r = a.filter(function (t) { return !o[t]; }); return r.length ? r : a; }
  function clip(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  // why(q, k, lessonSentences) → { w: why HIS option is wrong (or null), r: why the right one is right (or null), src: "x" | "lesson" | "none" }
  // ❌ only ever comes from the question's own explanation, from a sentence that speaks of HIS option at least as much as of the right one
  // (a lesson sentence that merely names his option is not a reason, so the lesson text only feeds ✅ when there is no x)
  /* 30q: a per-option reason written into the bank — QUIZ item .why = ["…","","…"] aligned to .o ("" at the right answer), written ONLY from
     the site's own lesson text / the question's x. Options get shuffled (🏆 game, NursinVar) or swapped in from a peer question, so the
     reason is found by the option's VALUE in the original bank item; an option that is not in it has no reason (→ the generic line). */
  function origQ(q) {
    if (!q) return q;
    if (q.src && q.src.o) return q.src;
    try { var V0 = w.NursinVar; if (q.vq && V0 && V0.orig) { var o0 = V0.orig(q); if (o0 && o0 !== q) return o0; } } catch (e) {}
    if (q.why && !q.vq) return q;
    var B = w.QUIZ || [];
    for (var i = 0; i < B.length; i++) if (B[i] && B[i].id === q.id) return B[i];
    return q;
  }
  function optWhy(q, k) {
    var o = origQ(q), v = q && q.o ? q.o[k] : null;
    if (!o || !o.why || !o.o || v == null) return "";
    var i = o.o.indexOf(v); if (i < 0 || i === o.a) return "";
    var r = o.why[i]; return typeof r === "string" ? r.replace(/^\s+|\s+$/g, "") : "";
  }
  function fallback(q) { return "هيدا الخيار ما بينطبق هون — الصح هو: " + clip(q.o[q.a], 60); }
  function why(q, k, les) {
    var right = toks(q.o[q.a]), mine = toks(q.o[k]), stem = toks(q.q), dm = only(only(mine, right), stem), dr = only(only(right, mine), stem);
    var xs = sents(q.x), ls = les || [], wl = null, rl = null, src = "none";
    if (xs.length) {
      src = "x";
      rl = best(xs, dr) || best(xs, right) || xs[0];
      wl = best(xs.filter(function (s) { return score(s, dm) >= score(s, dr); }), dm, rl);
      if (wl && wl === rl) rl = best(xs.filter(function (s) { return s !== wl; }), dr);   // one sentence speaks of both: it is the ❌ line, ✅ keeps the option
    } else if (ls.length) {
      var lr = best(ls, dr); if (lr && score(lr, dr) >= Math.min(2, dr.length)) { rl = lr; src = "lesson"; }
    }
    var pw = optWhy(q, k), ws = pw ? "why" : (wl ? src : "none");
    if (pw) wl = pw;
    return { w: wl, r: rl, src: src, ws: ws };
  }

  /* ---------------- where a question lives ---------------- */
  function lessons() { return (w.NLESSONS && w.NLESSONS.list) || []; }
  function parts() { return (w.NursinLessons && w.NursinLessons.parts) || lessons(); }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function lessonOf(q, lid) {                 // the NLESSONS entry of a question (🔗 questions: their first lesson; 🩺: the lesson passed in)
    var L0 = lessons(), id = lid || (q && q.ls && q.ls[0]) || null, i;
    if (id) { for (i = 0; i < L0.length; i++) if (base(L0[i]) === id) return L0[i]; return null; }
    if (!q) return null;
    for (i = 0; i < L0.length; i++) { var x = L0[i]; if (x.t === q.t && (!x.l || x.l === q.l)) return x; }
    return null;
  }
  function partKey(q) {                       // «subject:lesson#n» from assets/partq-data.js when loaded
    var P = w.PARTQ, m = P && P.map; if (!m || !q) return null;
    for (var k in m) if (m[k].indexOf(q.id) > -1) return k;
    return null;
  }
  function hrefOf(q, lid) {                   // the exact lesson part anchor (cardio.html#infarctus-p2), else the lesson's own anchor
    var x = lessonOf(q, lid); if (!x) return "";
    var pk = lid ? null : partKey(q);
    if (pk && pk.indexOf("#") > 0) { var P = parts(); for (var i = 0; i < P.length; i++) if (base(P[i]) + (P[i].p ? "#" + P[i].p : "") === pk) return P[i].href; }
    return x.href;
  }
  function lessonText(href) {                 // the lesson's sentences, when its text is on THIS page
    if (!href || !d.getElementById) return [];
    var bits = href.split("#"); if (bits[0] !== page() || !bits[1]) return [];
    var el = d.getElementById(bits[1]); if (!el) return [];
    var out = [], nn = el.querySelectorAll("p,li,td,dd,h3,h4,blockquote");
    for (var i = 0; i < nn.length && out.length < 400; i++) sents(nn[i].textContent).forEach(function (s) { out.push(s); });
    return out;
  }

  /* ---------------- 🔁 a similar question (pure with a bank; rnd for the tests) ---------------- */
  var seen = {};
  function inSrs(id) { try { var S = w.NursinSRS; return !!(S && S.has && S.has(id)); } catch (e) { return false; } }
  function similar(q, o) {
    o = o || {}; var bank = o.bank || w.QUIZ || [], rnd = o.rnd || Math.random, skip = {}, lid = o.lid || null;
    skip[q.id] = 1; (o.skip || []).forEach(function (id) { skip[id] = 1; }); for (var s0 in seen) skip[s0] = 1;
    var x = lessonOf(q, lid), lk = x ? base(x) : null, pk = lid ? null : partKey(q), P = w.PARTQ && w.PARTQ.map;
    var ok = function (c) { return c && c.id && !skip[c.id] && c.o && c.o.length > 1 && c.a != null && /^q\d+$/.test(c.id); };
    var tiers = [], names = [];
    if (pk && P && P[pk]) { var ids = {}; P[pk].forEach(function (id) { ids[id] = 1; }); tiers.push(bank.filter(function (c) { return ids[c.id] && ok(c); })); names.push("part"); }
    if (lk) { tiers.push(bank.filter(function (c) { if (!ok(c)) return false; var y = lessonOf(c); return !!y && base(y) === lk; })); names.push("lesson"); }
    var subj = x ? x.s : null;
    if (subj) { tiers.push(bank.filter(function (c) { if (!ok(c)) return false; var y = lessonOf(c); return !!y && y.s === subj; })); names.push("subject"); }
    else if (q.t) { tiers.push(bank.filter(function (c) { return ok(c) && c.t === q.t; })); names.push("subject"); }
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i]; if (!t.length) continue;
      var fresh = t.filter(function (c) { return !inSrs(c.id); }), pool = fresh.length ? fresh : t;
      var AD = o.ad || w.NursinAD; if (AD && AD.level) { var lq = AD.level(q), ez = pool.filter(function (c) { return AD.level(c) <= lq; }); if (ez.length) pool = ez; }   // 🎚️ 29v: after a wrong one, easier or the same level
      return { q: pool[Math.floor(rnd() * pool.length) % pool.length], tier: names[i] };
    }
    return null;
  }

  /* ---------------- the box ---------------- */
  var reg = {}, nreg = 0;
  function html(q, k, o) {
    if (!q || !q.o || k == null || k === q.a || !q.o[k]) return "";
    o = o || {}; var href = hrefOf(q, o.lid), y = why(q, k, lessonText(href)), id = "wx" + (++nreg);
    reg[id] = { q: q, k: k, o: o }; seen[q.id] = 1; style(); needPart(id);
    if (typeof setTimeout === "function") setTimeout(function () { hideOld(d); }, 0);   // 29v: the box replaces the old «❌ الجواب: …» box once it is in the page
    var h = '<div class="wxb" data-wx="' + id + '" data-wxq="' + esc(q.id) + '" data-nofr>';
    h += '<p class="wxl wxw" data-wxl>❌ <b>' + T("ليش غلط؟", "Pourquoi faux ? (ليش غلط؟)") + '</b> <span dir="rtl">(' + L.charAt(k) + ") " +
      esc(y.w || fallback(q)) + "</span></p>";
    h += '<p class="wxl wxr" data-wxl>✅ <b>' + T("الصح:", "La bonne (الصح) :") + '</b> <span dir="rtl">(' + L.charAt(q.a) + ") " + esc(clip(q.o[q.a], 60)) + (y.r ? " — " + esc(y.r) : "") + "</span></p>";
    h += '<p class="wxa">' + (href ? '<a class="wxlk" href="' + esc(href) + '">📖 ' + T("ارجع للدرس", "Revoir la leçon (ارجع للدرس)") + "</a>" : "") +
      '<button type="button" class="wxsim" data-wxsim>🔁 ' + T("سؤال شبيه", "Question similaire (سؤال شبيه)") + "</button></p>";
    return h + '<div class="wxs" aria-live="polite"></div></div>';
  }
  function mount(el, q, k, o) {
    if (!el) return null; var h = html(q, k, o); if (!h) return null;
    el.insertAdjacentHTML("beforeend", h); hideOld(el); return el.lastElementChild;
  }
  /* 29v: after a wrong answer the old orange box («❌ الجواب: …» = .expl.w in quiz / retain / sheets, .hzqf.bad in 🚌 and Osman's question) said
     the same thing as this box → hidden when this box sits right after it. A right answer (no box) keeps the old one as it was. */
  function hasC(e, c) { return (" " + (e && e.className || "") + " ").indexOf(" " + c + " ") > -1; }
  function isOld(e) { return !!e && ((hasC(e, "expl") && hasC(e, "w")) || (hasC(e, "hzqf") && hasC(e, "bad"))); }
  function hideOld(root) {
    if (!root || !root.querySelectorAll) return 0; var n = 0, bs = root.querySelectorAll(".wxb");
    for (var i = 0; i < bs.length; i++) { var p = bs[i].previousElementSibling; if (isOld(p) && !hasC(p, "wxold")) { p.className += " wxold"; n++; } }
    return n;
  }
  function loadScript(src, have) {
    return new Promise(function (res) {
      if (have()) return res(true);
      var s = d.createElement("script"); s.src = src + "?v=" + V; s.onload = function () { res(have()); }; s.onerror = function () { res(false); }; d.head.appendChild(s);
      setTimeout(function () { res(have()); }, 6000);
    });
  }
  var partP = null;
  function needPart(id) {                    // the part map makes the 📖 link and 🔁 exact: load it once, then sharpen the link
    if (!d.createElement || typeof Promise === "undefined") return;
    if (!partP) partP = loadScript("assets/partq-data.js", function () { return !!w.PARTQ; });
    partP.then(function () { setTimeout(function () { var b = d.querySelector('.wxb[data-wx="' + id + '"]'), r = reg[id], a = b && b.querySelector(".wxlk"); if (r && a) { var hf = hrefOf(r.q, r.o.lid); if (hf) a.setAttribute("href", hf); } }, 0); });
  }
  function record(q, ok, lid) {
    var r = null;
    try { var W = w.Weak; if (W && W.record) r = W.record(q, ok); else r = weakLocal(q, ok); } catch (e) {}
    try { var S = w.NursinSRS; if (S && S.answer) S.answer(q, ok); else if (S && S.record) S.record(q, ok); } catch (e) {}
    try { var R = w.NursinRet, x = lessonOf(q); if (R && R.apply && x) R.apply(base(x), ok ? "ok" : "bad"); } catch (e) {}
    return r;
  }
  function weakLocal(q, ok) {                // weak.js isn't on every page: the same rule on the same key (as assets/extra.js)
    var K = "nursin_weak_v1", x = null; try { x = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) {}
    if (!x || typeof x.items !== "object" || !x.items) x = { v: 1, items: {} };
    var it = x.items[q.id], r = null;
    if (!ok) { if (!it) { it = x.items[q.id] = { t: q.t, miss: 0, streak: 0 }; r = "added"; } else r = "progress"; it.miss++; it.streak = 0; it.last = Date.now(); }
    else if (it) { it.streak++; it.last = Date.now(); if (it.streak >= 2) { delete x.items[q.id]; r = "graduated"; } else r = "progress"; }
    if (r) try { localStorage.setItem(K, JSON.stringify(x)); } catch (e) {}
    return r;
  }
  function bankReady() { return (w.QUIZ && w.QUIZ.length) ? Promise.resolve(true) : loadScript("assets/quiz-data.js", function () { return !!(w.QUIZ && w.QUIZ.length); }); }
  function serve(b) {
    var r = reg[b.getAttribute("data-wx")], box = b.querySelector(".wxs"), btn = b.querySelector("[data-wxsim]"); if (!r || !box) return;
    if (btn) btn.disabled = true; box.innerHTML = '<p class="small">⏳</p>';
    Promise.all([bankReady(), partP || (partP = loadScript("assets/partq-data.js", function () { return !!w.PARTQ; }))]).then(function () {
      var m = similar(r.q, r.o);
      if (!m) { box.innerHTML = '<p class="small">' + esc(T("ما في سؤال شبيه جديد هلّق 👌", "Pas d'autre question similaire pour l'instant (ما في سؤال شبيه) 👌")) + "</p>"; return; }
      var s = m.q; if (w.NursinVar) s = w.NursinVar.vary(s); simv[s.id] = s; seen[s.id] = 1; b.setAttribute("data-wxs", s.id);   // 🔀 29y: in another shape when seen before
      box.innerHTML = '<div class="wxsq" data-qid="' + esc(s.id) + '"><p class="wxsqq">🔁 ' + esc(s.q) + "</p>" + s.o.map(function (o, j) {
        return '<button type="button" class="wxo" data-wxo="' + j + '"><span class="l" dir="ltr">' + L.charAt(j) + "</span> " + esc(o) + "</button>"; }).join("") + '<p class="wxsr"></p></div>';
    });
  }
  function pick(btn) {
    var b = btn.closest(".wxb"), r = b && reg[b.getAttribute("data-wx")], sid = b && b.getAttribute("data-wxs"), s = null, i;
    if (!r || !sid) return; var bank = w.QUIZ || []; s = simv[sid] || null; for (i = 0; !s && i < bank.length; i++) if (bank[i].id === sid) { s = bank[i]; break; }
    if (!s) return;
    var j = +btn.getAttribute("data-wxo"), ok = j === s.a, all = b.querySelectorAll(".wxo");
    if (all[0] && all[0].disabled) return;
    for (i = 0; i < all.length; i++) { var jj = +all[i].getAttribute("data-wxo"); all[i].disabled = true; if (jj === s.a) all[i].classList.add("ok"); else if (jj === j) all[i].classList.add("bad"); }
    var rec = record(s, ok), out = b.querySelector(".wxsr"), xs = sents(s.x), y = ok ? null : why(s, j, []);
    if (out) out.innerHTML = ok ? "✅ <b>" + esc(T("صح! 👏", "Juste ! (صح) 👏")) + "</b>" + (xs[0] ? " " + esc(xs[0]) : "")
      : "❌ <b>" + esc(T("الصح:", "La bonne (الصح) :")) + "</b> (" + L.charAt(s.a) + ") " + esc((y && y.r) || xs[0] || s.o[s.a]) + (rec === "added" ? ' <span class="small">🎯 ' + esc(T("انضاف لنقاط ضعفك", "Ajoutée à tes points faibles (نقاط ضعفك)")) + "</span>" : "");
  }
  function sameGo(a, e) {                    // 📖 on this very page: close the quiz sheet, open + scroll to the part
    var hf = a.getAttribute("href") || "", bits = hf.split("#"); if (bits[0] !== page() || !bits[1]) return;
    e.preventDefault();
    var x1 = a.closest(".fcwrap"), b1 = x1 && x1.querySelector(".fcx"), x2 = a.closest(".hzsheet"), b2 = x2 && x2.querySelector(".hzx");
    if (b1) b1.click(); if (b2) b2.click();
    try { if (history.replaceState) history.replaceState(null, "", "#" + bits[1]); } catch (e1) {}
    var n = 0; (function go() { var el = d.getElementById(bits[1]); if (el) { if (el.tagName === "DETAILS") el.open = true; setTimeout(function () { try { el.scrollIntoView({ block: "start" }); } catch (e2) {} }, 80); return; } if (++n < 20) setTimeout(go, 200); })();
  }
  if (d && d.addEventListener) d.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var s = t.closest(".wxb [data-wxsim]"); if (s) { serve(s.closest(".wxb")); return; }
    var o = t.closest(".wxb [data-wxo]"); if (o) { pick(o); return; }
    var a = t.closest(".wxb a.wxlk"); if (a) { sameGo(a, e); return; }
    var l = t.closest(".wxb [data-wxl]"); if (l) l.classList.toggle("open");
  });
  var styled = false;
  function style() {
    if (styled || !d.createElement) return; styled = true;
    var c = ".wxold{display:none!important}.wxb{margin-top:8px;padding:8px 10px;border-radius:12px;border:1px dashed #fb923c;background:#fffaf3;font-size:.93em;line-height:1.5;text-align:start}" +
      ".wxl{margin:0 0 3px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;cursor:pointer}.wxl.open{display:block}" +
      ".wxa{margin:5px 0 0;display:flex;flex-wrap:wrap;gap:6px}.wxa a,.wxa button{font:inherit;font-size:.92em;padding:5px 11px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:inherit;text-decoration:none;cursor:pointer}" +
      ".wxa button[disabled]{opacity:.55}.wxsq{margin-top:6px}.wxsqq{margin:4px 0;font-weight:600}.wxo{display:block;width:100%;text-align:start;margin:4px 0;padding:7px 10px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:inherit;font:inherit}" +
      ".wxo.ok{background:#dcfce7;border-color:#22c55e}.wxo.bad{background:#fee2e2;border-color:#ef4444}.wxo .l{font-weight:700;margin-inline-end:4px}.wxsr{margin:4px 0 0}" +
      "html[data-theme=night] .wxb{background:#241d14;border-color:#7c5a2e}html[data-theme=night] .wxa a,html[data-theme=night] .wxa button,html[data-theme=night] .wxo{background:#1b232b;border-color:#3a4a58}" +
      "html[data-theme=night] .wxo.ok{background:#14361f}html[data-theme=night] .wxo.bad{background:#3a1a1a}";
    var s = d.createElement("style"); s.id = "wxcss"; s.textContent = c; (d.head || d.documentElement).appendChild(s);
  }
  if (d && d.addEventListener) d.addEventListener("nursin:answer", function (e) { var x = e.detail || {}; if (x.qid) seen[x.qid] = 1; });
  w.NursinWX = { html: html, mount: mount, why: why, optWhy: optWhy, fallback: fallback, origQ: origQ, sents: sents, toks: toks, similar: similar, lessonOf: lessonOf, hrefOf: hrefOf, partKey: partKey, seen: seen, style: style, hideOld: hideOld, isOld: isOld };
})(window, document);
