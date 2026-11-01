/* 🔗 «اربط» + 🧠 «حيلة حفظ» + 🌅 «سؤال الصبح» (Abdullah, Oct 31 2026 11:23 PM «بلش ب ١و٢و٣») — on every page, after ui.js.
   1) 🔗 اربط: questions that tie an OLD lesson to a NEW / related one (assets/link-data.js, window.LINKQ, each item tagged with both lesson ids
      in ls). On a lesson page the end-of-lesson bar (.lsk) gets «🔗 اربط مع درس قديم» when that lesson has some → a glass sheet, one question
      at a time, ✅/❌ + «🔗 الرابط» after each answer. quiz.html?t=link runs all of them (assets/quiz.js). Answers count like any quiz answer:
      نقاط ضعفك (weak.js), مراجعة اليوم (srs.js) and both lessons' memory (hifz.js «nursin:answer»).
   2) 🧠 حيلة حفظ: 1–3 short mnemonics per lesson (assets/tricks-data.js, window.TRICKS, built from that lesson's own lists), a folded card at the
      END of each lesson (inside the lesson text, so 🖍️ the highlighter works on it), and every trick listed on حفظي (hifzi.html#tricks).
   3) 🌅 سؤال الصبح: worker v10 sends one morning push whose link is /?mq=<question id> (also #mq=…) → this file opens that question in a
      sheet, answered in place (same counting as above). With worker v9 still deployed nothing sends such a link, so nothing changes.
   No ads here; every sheet adds html.rton (page ads hidden while it is open). French = the items' own fr copies (Lang.fr). */
(function (w, d) {
  "use strict";
  var V = "20261028q", MQK = "nursin_mq_v1";
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { var N = w.Nursin; if (N && N.dayKey) try { return N.dayKey(); } catch (e) {} try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); } }
  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); });
  }
  function loadLinks() { return loadScript("assets/link-data.js?v=" + V, function () { return !!w.LINKQ; }); }
  function loadTricks() { return loadScript("assets/tricks-data.js?v=" + V, function () { return !!w.TRICKS; }); }
  function loadQuiz() { return loadScript("assets/quiz-data.js?v=" + V, function () { return !!w.QUIZ; }); }

  /* ---------------- lessons ---------------- */
  function lessons() { return (w.NLESSONS && w.NLESSONS.list) || []; }
  function lid(l) { return l.s + ":" + (l.l || l.t); }
  function lessonById(id) { var L = lessons(); for (var i = 0; i < L.length; i++) if (lid(L[i]) === id) return L[i]; return null; }
  function lname(id) { var l = lessonById(id); return l ? l.n : id; }
  function subjOf(id) { var l = lessonById(id); return l ? l.s : String(id).split(":")[0]; }
  function lhref(id) { var l = lessonById(id); return l ? l.href : "index.html"; }
  var LAW = function (id) { return subjOf(id) === "law"; };     // ⚖️ law stays Arabic always (assets/lang.js)

  /* ---------------- answering one question (same bookkeeping as quiz.js) ---------------- */
  function bank(id) {
    var Q = (w.QUIZ || []).concat(w.LINKQ || []);
    for (var i = 0; i < Q.length; i++) if (Q[i].id === id) return Q[i];
    return null;
  }
  function weakRecord(q, ok) {                       // weak.js may not be on this page: the same rule on the same key
    if (w.Weak && w.Weak.record) return w.Weak.record(q, ok);
    var K = "nursin_weak_v1", x = lsGet(K); if (!x || typeof x.items !== "object" || !x.items) x = { v: 1, items: {} };
    var it = x.items[q.id], r = null;
    if (!ok) { if (!it) { it = x.items[q.id] = { t: q.t, miss: 0, streak: 0 }; r = "added"; } else r = "progress"; it.miss++; it.streak = 0; it.last = Date.now(); }
    else if (it) { it.streak++; it.last = Date.now(); if (it.streak >= 2) { delete x.items[q.id]; r = "graduated"; } else r = "progress"; }
    if (r) lsSet(K, x); return r;
  }
  function record(q, ok, set) {
    var rec = null;
    try { rec = weakRecord(q, ok); } catch (e) {}
    try { if (w.NursinSRS && w.NursinSRS.record) w.NursinSRS.record(q, ok); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:answer", { detail: { qid: q.id, ok: ok, set: set || "link" } })); } catch (e) {}   // hifz.js: lesson memory (both lessons of a 🔗)
    return rec;
  }
  function linkLine(q) {                              // «🔗 درس قديم ↔ درس جديد» with links to both lessons
    if (!q || !q.ls) return "";
    return '<p class="xlnk">🔗 ' + q.ls.map(function (id) { return '<a href="' + esc(lhref(id)) + '">' + esc(lname(id)) + "</a>"; }).join(' <span aria-hidden="true">↔</span> ') + "</p>";
  }

  /* ---------------- the question sheet (🔗 and 🌅) ---------------- */
  var cur = null;
  function U() { return w.NursinUI || null; }
  function body() { return d.querySelector(".hzsheet.xqs .hzshb"); }
  function openQs(o, from) {                                // o = {title, qs, set, intro, end(html), one(true = a single question)}
    var u = U(); if (!u || !u.openSheet || !o.qs.length) return false;
    cur = { o: o, i: 0, ok: 0, ans: null };
    d.documentElement.classList.add("rton");
    u.openSheet("xqs" + (o.cls ? " " + o.cls : ""), o.title, '<div class="xqbox"></div>', from);
    draw();
    var sh = d.querySelector(".hzsheet.xqs"); if (sh) new MutationObserver(function (m, ob) { if (!sh.isConnected || sh.classList.contains("out")) { ob.disconnect(); d.documentElement.classList.remove("rton"); } }).observe(sh, { attributes: true });
    return true;
  }
  function draw() {
    var b = body(); if (!b || !cur) return; var box = b.querySelector(".xqbox") || b, o = cur.o, q = o.qs[cur.i], n = o.qs.length, h = "";
    if (o.intro && cur.i === 0) h += '<p class="xqintro">' + o.intro + "</p>";
    h += '<div class="xq" data-qid="' + esc(q.id) + '">' + (n > 1 ? '<p class="xqn">' + T("سؤال ", "Question ") + (cur.i + 1) + T(" من ", " sur ") + n + (cur.ok ? " · ✅ " + cur.ok : "") + "</p>" : "") +
      (q.t === "link" ? linkLine(q) : "") + '<p class="qq">' + q.q + "</p>";
    q.o.forEach(function (op, k) {
      var cls = cur.ans == null ? "" : k === q.a ? " ok" : k === cur.ans ? " bad" : "";
      h += '<button class="opt' + cls + '" type="button" data-xk="' + k + '"' + (cur.ans != null ? " disabled" : "") + '><span class="l" dir="ltr">' + "abc".charAt(k) + "</span><span>" + op + "</span></button>";
    });
    if (cur.ans != null) {
      var ok = cur.ans === q.a;
      h += '<div class="expl' + (ok ? "" : " w") + '">' + (ok ? T("✅ <b>صح!</b> ", "✅ <b>Correct !</b> ") : T("❌ <b>الجواب الصح: ", "❌ <b>Bonne réponse : ") + "abc".charAt(q.a) + "</b> — ") +
        (q.t === "link" ? '<span class="xlx">' + T("🔗 الرابط: ", "🔗 Le lien : ") + "</span>" : "") + q.x + "</div>";
      if (cur.rec === "added") h += '<p class="small wtag">' + T("🎯 انضاف لنقاط ضعفك، وبيرجعلك بكرا بالمراجعة 🔁", "🎯 Ajoutée à tes points faibles, elle revient demain en révision 🔁") + "</p>";
      else if (cur.rec === "graduated") h += '<p class="small wtag">' + T("🎉 طلع من نقاط ضعفك", "🎉 Sortie de tes points faibles") + "</p>";
      h += '<div class="xqact">' + (cur.i + 1 < n ? '<button class="btn pri" type="button" data-xnext>' + T("التالي ←", "Suivante →") + "</button>" : (o.end ? o.end(cur) : "")) + "</div>";
    }
    if (w.NursinAsk) h += w.NursinAsk.slot(w.NursinAsk.fromQ(q, { answered: cur.ans != null, pick: cur.ans != null ? cur.ans : undefined, surface: "sheet:" + (o.set || "") }));   // 🙋 «اسأل عثمان» (assets/ask.js): free practice, a hint before answering
    h += "</div>";
    box.innerHTML = h;
  }
  d.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var b = t.closest(".hzsheet.xqs [data-xk]");
    if (b && cur && cur.ans == null) {
      var q = cur.o.qs[cur.i], k = +b.getAttribute("data-xk"), ok = k === q.a;
      cur.ans = k; if (ok) cur.ok++;
      cur.rec = record(q, ok, cur.o.set);
      if (cur.o.onAnswer) try { cur.o.onAnswer(q, k, ok); } catch (x) {}
      draw(); return;
    }
    if (t.closest(".hzsheet.xqs [data-xnext]") && cur) { cur.i++; cur.ans = null; cur.rec = null; draw(); var bb = body(); if (bb) bb.scrollTop = 0; return; }
    var lk = t.closest("[data-xlink]"); if (lk) { e.preventDefault(); openLinks(lk.getAttribute("data-xlink") || "", lk); return; }
    var tc = t.closest("[data-xtricks]"); if (tc) { e.preventDefault(); openTricks(tc.getAttribute("data-xtricks"), tc); }
  });

  /* ---------------- 🔗 اربط ---------------- */
  function linksFor(id) { return (w.LINKQ || []).filter(function (q) { return !id || q.ls.indexOf(id) > -1; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function openLinks(id, from) {
    return loadLinks().then(function () {
      var qs = shuffle(linksFor(id).slice()).slice(0, 8); if (!qs.length) return false;
      return openQs({ title: "🔗 " + T("اربط مع درس قديم", "Relie avec une ancienne leçon"), qs: qs, set: "link",
        intro: id ? T("كل سؤال بيجمع «" + esc(lname(id)) + "» مع درس تاني. فكّر شو الرابط بيناتهن 🧠", "Chaque question relie « " + esc(lname(id)) + " » à une autre leçon. Trouve le lien 🧠") : "",
        end: function (c) { return '<p class="xqend">' + T("خلصت: ", "Terminé : ") + c.ok + " / " + c.o.qs.length + '</p><a class="btn" href="quiz.html?t=link">' + T("🔗 كل أسئلة اربط", "🔗 Toutes les questions « Relier »") + "</a>"; } }, from);
    });
  }
  function mountLinks() {
    if (!w.LINKQ) return;
    [].forEach.call(d.querySelectorAll(".lsk[data-l]"), function (bar) {
      var id = bar.getAttribute("data-l"); if (bar.querySelector("[data-xlink]") || !linksFor(id).length) return;
      var b = d.createElement("button"); b.className = "btn sm"; b.type = "button"; b.setAttribute("data-xlink", id);
      b.textContent = T("🔗 اربط مع درس قديم", "🔗 Relier avec une ancienne leçon"); bar.appendChild(b);
    });
  }

  /* ---------------- 🧠 حيلة حفظ ---------------- */
  function tricksFor(id) { var x = w.TRICKS && w.TRICKS[id]; return Array.isArray(x) ? x : []; }
  function side(t, id) { return FR() && !LAW(id) && t.fr ? t.fr : t; }
  function trickHtml(t, id) {
    var s = side(t, id);
    return '<div class="xtk"><p class="xtt">' + esc(s.t) + '</p><p class="xtm">' + esc(s.m) + "</p>" + (s.d && s.d.length ? "<ul>" + s.d.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") + "</div>";
  }
  function cardHtml(id) {
    var ts = tricksFor(id), lw = LAW(id) && FR();
    return '<summary><span>🧠 ' + (lw ? "حيلة حفظ" : T("حيلة حفظ", "Astuce mémo")) + '</span> <small>' + ts.length + "</small></summary><div class=\"xtkb\">" + ts.map(function (t) { return trickHtml(t, id); }).join("") + "</div>";
  }
  function prevBody(el) {                            // the lesson text just above an end bar that sits outside it (henderson h2)
    for (var s = el.previousElementSibling; s; s = s.previousElementSibling) {
      if (s.classList && s.classList.contains("tbody")) return s.querySelector(".tbody") ? null : s;
      var all = s.querySelectorAll ? s.querySelectorAll(".tbody") : [];
      if (all.length) { var t = all[all.length - 1]; return t.querySelector(".tbody") ? null : t; }
    }
    return null;
  }
  function lastPartBody(id) {                         // a lesson without an end bar: the end of its last part
    var P = (w.NLESSONS && (w.NLESSONS.parts || w.NLESSONS.list)) || [], el = null;
    P.forEach(function (x) { if (lid(x) !== id || x.href.split("#")[0] !== page) return; var a = x.href.split("#")[1], e = a && d.getElementById(a); if (e) el = e; });
    if (!el) return null; return el.tagName === "DETAILS" ? (el.querySelector(":scope > .tbody") || el) : el;
  }
  var LPAGES = { "cardio.html": 1, "neuro.html": 1, "henderson.html": 1, "law.html": 1, "mgmt.html": 1, "quality.html": 1, "pharma.html": 1, "rea.html": 1, "geri.html": 1, "community.html": 1, "medsurg.html": 1 };
  function mountTricks(final) {
    if (!w.TRICKS || !LPAGES[page]) return;
    var done = {};
    [].forEach.call(d.querySelectorAll(".xtrk[data-l]"), function (c) { done[c.getAttribute("data-l")] = 1; });
    [].forEach.call(d.querySelectorAll(".lsk[data-l]"), function (bar) {
      var id = bar.getAttribute("data-l"); if (done[id] || !tricksFor(id).length) return;
      var top = bar.previousElementSibling && bar.previousElementSibling.classList.contains("rtrow") ? bar.previousElementSibling : bar, c = mk(id);
      // inside the lesson text (a .tbody) so 🖍️ works on it: before an end bar that sits in the text, else at the end of the lesson's last part
      var bd = bar.closest(".tbody") ? null : (lastPartBody(id) || prevBody(bar));
      if (bd && !(bd.classList && bd.classList.contains("tbody"))) bd = prevBody(bar);
      if (bd && bd.classList && bd.classList.contains("tbody") && !bd.querySelector(':scope > .xtrk[data-l="' + id + '"]')) bd.appendChild(c); else top.parentNode.insertBefore(c, top);
      done[id] = 1;
    });
    if (!final) return;
    lessons().forEach(function (l) {                  // a lesson with no end bar at all: the end of its last part
      var id = lid(l); if (done[id] || l.href.split("#")[0] !== page || !tricksFor(id).length) return;
      var bd = lastPartBody(id); if (!bd || bd.querySelector(":scope > .xtrk")) return;
      bd.appendChild(mk(id)); done[id] = 1;
    });
  }
  function mk(id) {
    var c = d.createElement("details"); c.className = "xtrk"; c.setAttribute("data-l", id);
    if (LAW(id)) c.setAttribute("dir", "rtl");
    c.innerHTML = cardHtml(id); return c;
  }
  function openTricks(id, from) {
    return loadTricks().then(function () {
      var u = U(), ts = tricksFor(id); if (!u || !u.openSheet || !ts.length) return false;
      u.openSheet("xtks", "🧠 " + T("حيلة حفظ", "Astuce mémo") + " · " + lname(id), '<div class="xtkb">' + ts.map(function (t) { return trickHtml(t, id); }).join("") + "</div>", from); return true;
    });
  }
  /* 🗺️ حفظي → «🧠 حِيَل الحفظ»: every trick, by مادة → درس */
  var SUBJ = [["cardio", "🫀"], ["neuro", "🧠"], ["henderson", "🧩"], ["medsurg", "🏥"], ["rea", "🚑"], ["pharma", "💊"], ["geri", "👴"], ["comm", "🏘️"], ["law", "⚖️"], ["mgmt", "🏢"], ["quality", "✅"]];
  var tsel = "";
  function subjName(s) { var S = (w.NLESSONS && w.NLESSONS.subjects) || {}, x = S[s]; return x ? T(x.ar, x.fr) : s; }
  function trickPage() {
    var root = d.getElementById("tricks"); if (!root || !w.TRICKS) return;
    var L = lessons().filter(function (l) { return tricksFor(lid(l)).length; }), n = 0;
    L.forEach(function (l) { n += tricksFor(lid(l)).length; });
    var have = {}; L.forEach(function (l) { have[l.s] = 1; });
    var h = '<h2>🧠 ' + T("حِيَل الحفظ", "Astuces mémo") + ' <small>· ' + n + T(" حيلة", " astuces") + "</small></h2><p class=\"small\">" + T("كلمة أو جملة صغيرة بتذكّرك بنقاط كل درس. مأخوذة من الدرس نفسو.", "Un mot ou une petite phrase pour retenir les points de chaque leçon, tirés de la leçon elle-même.") + "</p>";
    h += '<div class="chips xtchips"><button type="button" class="chip' + (tsel ? "" : " on") + '" data-xts="">' + T("الكل", "Tout") + "</button>" +
      SUBJ.filter(function (s) { return have[s[0]]; }).map(function (s) { return '<button type="button" class="chip' + (tsel === s[0] ? " on" : "") + '" data-xts="' + s[0] + '">' + s[1] + " " + esc(subjName(s[0])) + "</button>"; }).join("") + "</div>";
    L.filter(function (l) { return !tsel || l.s === tsel; }).forEach(function (l) {
      var id = lid(l); h += '<details class="xtrk" data-l="' + esc(id) + '"' + (LAW(id) ? ' dir="rtl"' : "") + '><summary><span>' + esc(l.n) + '</span> <small>' + tricksFor(id).length + '</small></summary><div class="xtkb">' +
        tricksFor(id).map(function (t) { return trickHtml(t, id); }).join("") + '<p class="small"><a href="' + esc(l.href) + '">' + T("📖 افتح الدرس", "📖 Ouvrir la leçon") + "</a></p></div></details>";
    });
    root.innerHTML = h;
  }
  d.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest("[data-xts]"); if (!c) return; tsel = c.getAttribute("data-xts") || ""; trickPage(); });

  /* ---------------- 🌅 سؤال الصبح (worker v10 push → /?mq=<id>) ---------------- */
  function mqParam() {
    var m = /[?&]mq=([\w-]{1,12})/.exec(location.search || "") || /[#&]mq=([\w-]{1,12})/.exec(location.hash || "");
    return m ? m[1] : "";
  }
  function morning(id) {
    return Promise.all([loadQuiz(), loadLinks()]).then(function () {
      var q = bank(id), dk = today(), st = lsGet(MQK);
      if (!q) { var Q = (w.QUIZ || []).filter(function (x) { return x.t !== "law"; }); if (!Q.length) return false; q = Q[Math.floor(Math.random() * Q.length)]; }
      var again = st && st.d === dk && st.id === q.id && st.k != null;
      var ok = openQs({ title: "🌅 " + T("سؤال الصبح", "La question du matin"), qs: [q], set: "morning", cls: "xmq",
        intro: T("☀️ صباح الخير! سؤال سريع من الأستاذ عثمان قبل ما يبلّش نهارك:", "☀️ Bonjour ! Une question rapide du Professeur Osman avant de commencer ta journée :"),
        onAnswer: function (qq, k, good) { lsSet(MQK, { d: dk, id: qq.id, k: k, ok: good ? 1 : 0, at: Date.now() }); },
        end: function () { return '<a class="btn pri" href="index.html">' + T("🧭 كمّل مسار اليوم", "🧭 Continuer le parcours du jour") + '</a> <a class="btn" href="quiz.html?n=10">' + T("⚡ كويز ١٠ أسئلة", "⚡ Quiz de 10 questions") + "</a>"; } });
      if (ok && again) { cur.ans = st.k; cur.ok = st.k === q.a ? 1 : 0; cur.rec = null; draw(); }
      return ok;
    });
  }
  function clearParam() {
    try { var u = new URL(location.href); u.searchParams.delete("mq"); if (/mq=/.test(u.hash)) u.hash = ""; history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) {}
  }

  /* ---------------- 🔔 the question ids the worker may pick from (assets/hifz.js studyState → users/{uid}.stMq) ---------------- */
  function mqPool(max) {
    max = max || 8; var out = [], seen = {}, dk = today();
    function add(id) { if (id && !seen[id] && out.length < max && /^[\w-]{1,12}$/.test(id)) { seen[id] = 1; out.push(id); } }
    var wk = (lsGet("nursin_weak_v1") || {}).items || {};
    Object.keys(wk).sort(function (a, b) { return ((wk[b].miss | 0) - (wk[a].miss | 0)) || ((+wk[b].last || 0) - (+wk[a].last || 0)); }).slice(0, 4).forEach(add);
    var sr = (lsGet("nursin_srs_v1") || {}).items || {};
    Object.keys(sr).filter(function (k) { return String(sr[k].d || "") <= dk; }).slice(0, 3).forEach(add);
    var st = lsGet(MQK); if (st && st.id) { var i = out.indexOf(st.id); if (i > -1 && out.length > 1) out.splice(i, 1); }   // not yesterday's again
    return out;
  }

  /* ---------------- start ---------------- */
  function init() {
    if (LPAGES[page]) {
      loadTricks().then(function () { mountTricks(); setTimeout(mountTricks, 1600); setTimeout(function () { mountTricks(true); }, 4200); });
      loadLinks().then(function () { mountLinks(); setTimeout(mountLinks, 1600); setTimeout(mountLinks, 4200); });
    }
    if (page === "hifzi.html") loadTricks().then(function () {
      trickPage();
      if (/^#tricks/.test(location.hash)) setTimeout(function () { var r = d.getElementById("tricks"); if (r) r.scrollIntoView({ block: "start" }); }, 300);
    });
    var id = mqParam();
    if (id) setTimeout(function () { morning(id).then(clearParam, clearParam); }, 700);
  }
  function hrefOf(q) { return q && q.ls ? lhref(q.ls[q.ls.length - 1]) : "quiz.html"; }
  w.NursinX = { linkLine: linkLine, hrefOf: hrefOf, linksFor: linksFor, tricksFor: tricksFor, openLinks: openLinks, openTricks: openTricks, morning: morning, mqParam: mqParam, mqPool: mqPool,
    mountTricks: mountTricks, mountLinks: mountLinks, trickPage: trickPage, bank: bank, record: record, MQK: MQK };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
