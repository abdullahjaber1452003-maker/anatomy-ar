/* 🧠 Build 2 — «ترسيخ المعلومات» (Abdullah, Oct 30 2026 9:41–9:46 PM: «حابب انه نرسخ المعلومات اكتر» → he approved 1, 2, 3, A, B, C).
   One file for the lesson-side features + the pure helpers the quiz uses. Nothing here shows or sits next to an ad: every sheet below
   opens over the page and, while it is open, html.rton hides the page's ad units (CSS), so no ad is visible beside them.
   1) 🧑‍🏫 «علِّم عثمان» (teach-back) — a row at the END of every lesson part: the student explains the part in her own words (text).
      The part's KEY POINTS are taken from the lesson's own text on the page (headings → bold lines, short lists, boxes, small tables —
      the same pieces 📄 الخلاصة keeps), nothing written here. Osman's reply comes from the SAME endpoint the tutor/class corrector
      already call (assets/tutor.js, assets/practice.js: POST {messages:[{role,text}], context: Osman.persona()} → {text}); the prompt
      gives him only those key points and asks for ✅ what she got right / ❌ what she missed / 🔧 one correction. Signed-in only (like the
      tutor), 10 a day (nursin_teach_day_v1). The local checklist (keywords of each point, Arabic-folded + French terms) is ALWAYS shown
      under his reply, and stands alone (said so on screen) when he can't be reached / signed out / the day's 10 are used. No worker change.
   A) 📃 «الورقة البيضا» (blank-page recall) — same row: 2-minute timer, she types everything she remembers, then the key-point checklist
      shows ✅ covered / ❌ missed; missed points open as 🃏 cards (assets/cards.js openDeck) and «🔁 زيد لمراجعة بكرا» puts the lesson's
      questions into the spaced-repetition list (assets/srs.js). Last result per part in nursin_blank_v1.
   2) 🩺 «حالة مريض» — a button in the end-of-lesson bar (🃏 · 📄 · 🩺): a short case (age, history, symptoms, vitals) + 3–4 exam-style
      questions (diagnosis, the Henderson need BY NAME, nursing intervention, surveillance), static data in assets/cases-data.js (written
      from each lesson's own text; loaded only when opened). Answers reveal the explanation one by one. CASE_IDS = the lessons that have one.
   3) 📝 «الامتحان الأسبوعي المختلط» — runs in quiz.html?t=mixed (assets/quiz.js); this file picks its questions (pure weeklyPick) and
      draws the ONE home entry (#wexhome inside «📌 الأهمّيات») + the card on حفظي (#wexhifz), badge «جاهز» once a week (Monday–Sunday,
      Beirut). Results per week in nursin_wexam_v1.
   B) 🎯 «متأكد ولا محزّر؟» + C) ❓ «ليش؟» — drawn by assets/quiz.js; the why-questions are data (assets/why-data.js, written from each
      question's own explanation), loaded on quiz.html. Helpers: Retain.confOn(state), Retain.whyFor(q, guessed, rnd).
   4) 📝 «كويز هالجزء» (Nov 3 2026, 10:01 PM) — first button of the end row of EVERY part: that part's questions only (assets/partq-data.js),
      inline sheet, score + «🔁 عيد» + «➡️ الجزء الجاي», «كنت متأكد / حزرت», every answer → SRS v2; ✓ done marks (nursin_partq_v1).
   Everything works offline: localStorage only (no account sync for these — the reviews they feed already sync through srs.js). */
(function (w, d) {
  var V = "20261030v", API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/";
  var TK = "nursin_teach_day_v1", TMAX = 10, BK = "nursin_blank_v1", WK = "nursin_wexam_v1", BLANK_SEC = 120, WN = 20, WMIN = 25;
  var CASE_IDS = ["cardio:infarctus", "cardio:angor", "cardio:pericarde", "cardio:endomyo", "cardio:pacemaker", "cardio:embolie", "cardio:choc", "cardio:ic", "cardio:arythmies", "cardio:chirurgie", "neuro:evaluation", "neuro:examens", "neuro:laminectomie", "neuro:craniotomie", "neuro:avc", "neuro:htic", "neuro:glasgow", "henderson:h1", "henderson:h2", "pharma:cardio", "pharma:coag", "pharma:atb", "pharma:pain", "pharma:resp", "pharma:dig", "pharma:cort", "pharma:diab", "pharma:other", "rea:r1", "geri:g1", "geri:g2", "geri:g3", "geri:g4", "geri:g5", "geri:g6", "geri:g7", "geri:g8", "geri:g9", "geri:g10", "comm:c3", "comm:c4", "comm:c5", "comm:c7", "comm:c8", "medsurg:iv", "rea:r2", "rea:r3", "rea:r4"];
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  if (!/\.html$/.test(page)) page = "index.html";

  /* ---------------- text tools (pure; tests run them in node) ---------------- */
  var STOP = {};
  ("من في على الى الي عن مع او أو و ثم هو هي هم هيدا هيدي هاد هاي هذا هذه ذلك تلك التي الذي اللي يلي لي له لها كل بعض اي أي اذا إذا لما ما لا لم لن قد كان كانت يكون تكون بين عند عنده فيه فيها منه منها حتى لكن بس كمان كتير شي يعني مثل متل مثلا مثلاً غير عشان لأن لان انو إنو انه أنه " +
   "les des une dans pour par avec sur qui que aux est sont pas plus son ses leur elle ils elles cette ces entre comme mais donc car tout tous très etre être avoir fait faire peut doit")
    .split(" ").forEach(function (x) { if (x) STOP[fold(x)] = 1; });
  function fold(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[àâäá]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/ç/g, "c")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); });
  }
  function norm(s) { return fold(s).replace(/[^a-z0-9\u0621-\u064A]+/g, " ").replace(/\s+/g, " ").trim(); }
  function stem(t) {                                    // Arabic: drop و/ب/ل/ك/ف + «ال», and a few endings; French: plural s/x
    if (/[\u0621-\u064A]/.test(t)) {
      t = t.replace(/^(وال|بال|لل|كال|فال|ال)(?=..)/, "");
      if (t.length > 4) t = t.replace(/(ات|ين|ون|يه|ها|هم)$/, "");
      return t;
    }
    return t.length > 4 ? t.replace(/(s|x)$/, "") : t;
  }
  function tokens(s) { var out = []; norm(s).split(" ").forEach(function (t) { if (t.length < 3 || STOP[t] || /^\d+$/.test(t)) return; t = stem(t); if (t.length >= 3 && !STOP[t]) out.push(t); }); return out; }
  function terms(point) {                              // the point's own words that carry it (longest first, max 8)
    var seen = {}, out = [];
    tokens(point).forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } });
    return out.sort(function (a, b) { return b.length - a.length; }).slice(0, 8);
  }
  function same(a, b) { if (a === b) return true; var n = Math.min(a.length, b.length); return n >= 5 && a.slice(0, 5) === b.slice(0, 5); }
  /* a point counts as covered when about a third of its words are in her text — or when she names its own French term
     (a Latin word of 6+ letters that only this point or one other of the part uses: «thrombus», «Athérosclérose»…) */
  function cover(point, text, df) {
    var ks = terms(point), got = tokens(text), hit = 0, key = false;
    ks.forEach(function (k) { for (var i = 0; i < got.length; i++) if (same(k, got[i])) { hit++; if (/^[a-z]{6,}$/.test(k) && (!df || (df[k] || 0) <= 2)) key = true; break; } });
    var need = ks.length <= 2 ? 1 : Math.max(2, Math.ceil(ks.length * 0.34));
    return { hit: hit, of: ks.length, ok: ks.length > 0 && (hit >= need || key) };
  }
  function check(points, text) {
    var df = {};
    points.forEach(function (p) { var seen = {}; terms(p.t).forEach(function (k) { if (/^[a-z]{6,}$/.test(k) && !seen[k]) { seen[k] = 1; df[k] = (df[k] || 0) + 1; } }); });
    return points.map(function (p) { var c = cover(p.t, text, df); return { t: p.t, h: p.h || "", lab: p.lab || "", ok: c.ok, hit: c.hit, of: c.of }; });
  }

  /* ---------------- 📃🧑‍🏫 the key points of one lesson part (from the page itself) ---------------- */
  function R() { return w.NLESSONS || {}; }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function pkey(x) { return base(x) + (x.p ? "#" + x.p : ""); }
  function here(x) { return x.href.split("#")[0] === page; }
  function plabel(x) { return x.n + (x.p ? T(" — الجزء ", " — Partie ") + x.p : ""); }
  function txt(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
  var SKIP = /(^|\s)(adx|lsk|lqz|ad-slot|nlrow|rtrow|nbtn)(\s|$)/;
  function partBlocks(x) {
    var a = x.href.split("#")[1];
    if (!a) { var C = w.NursinCards; return C && C.blocks ? C.blocks(x) : []; }   // Henderson: the cards' own walk
    var el = d.getElementById(a); if (!el) return [];                      // a split part's href already names its own <details> (#g1-p2)
    var b = el.tagName === "DETAILS" ? (el.querySelector(":scope > .tbody") || el) : el;
    return [].slice.call(b.children).filter(function (c) { return c.tagName !== "SUMMARY" && !SKIP.test(c.className || ""); });
  }
  function clip(s, n) { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
  function keyPoints(bl) {
    var out = [], seen = {}, head = "", all = [];
    function add(t, strong) { t = clip(t.replace(/^[•\-–·\s]+/, ""), 170); var k = norm(t); if (k.length < 6 || seen[k] || !terms(t).length) return; seen[k] = 1; out.push({ t: t, h: head, s: strong ? 1 : 0 }); }
    function walk(el) {
      if (!el || !el.tagName) return;
      var tg = el.tagName, t = txt(el), cls = el.className || "";
      if (!t || /^(SCRIPT|STYLE|BUTTON|FIGURE|IMG|SVG|MODEL-VIEWER)$/.test(tg) || SKIP.test(cls)) return;
      if (/^H[2-6]$/.test(tg)) { head = clip(t, 80); all.push({ t: head, h: "" }); return; }
      if (tg === "UL" || tg === "OL") {
        var li = [].slice.call(el.children).filter(function (c) { return c.tagName === "LI"; }), key = li.filter(function (c) { return c.querySelector("b,strong"); });
        (key.length ? key : li.filter(function (c) { return txt(c).length <= 170; }).slice(0, 8)).forEach(function (c) { add(txt(c), !!key.length); });
        return;
      }
      if (tg === "TABLE") { var rows = el.querySelectorAll("tr"); if (rows.length <= 12) [].forEach.call(rows, function (r) { if (r.querySelector("th") && !r.querySelector("td")) return; add([].map.call(r.children, txt).filter(Boolean).join(" — "), 1); }); return; }
      if (tg === "ARTICLE" && /(^|\s)drug(\s|$)/.test(cls)) {          // 💊 a drug card: one point per section (Indication, Contre-indication, Surveillance…)
        var nm = el.querySelector("h3"), name = nm ? clip(txt(nm).replace(/^💊\s*/, "").split("/")[0], 40) : "";
        [].forEach.call(el.querySelectorAll(".dsec"), function (sc) {
          var h4 = sc.querySelector("h4 span") || sc.querySelector("h4"), its = [].map.call(sc.querySelectorAll("li"), function (li) { return [].map.call(li.children.length ? li.children : [li], txt).filter(Boolean).join(" ("); }).map(function (t2) { return /\(/.test(t2) ? t2 + ")" : t2; });
          if (!its.length) return;
          var t3 = clip(its.join(" · "), 170), k3 = norm(name + t3); if (seen[k3] || !terms(t3).length) return; seen[k3] = 1;
          out.push({ t: t3, h: name, lab: name + " · " + (h4 ? txt(h4) : ""), s: 1 });
        });
        return;
      }
      if (tg === "DETAILS" || tg === "DIV" || tg === "SECTION" || tg === "BLOCKQUOTE" || tg === "ARTICLE") { [].forEach.call(el.children, function (c) { if (c.tagName !== "SUMMARY") walk(c); }); return; }
      if (tg === "P" || tg === "DD" || tg === "DT") { var bb = el.querySelector("b,strong"); if (bb || t.length <= 170) add(t, !!bb); else all.push({ t: clip(t, 170), h: head }); return; }
    }
    bl.forEach(walk);
    if (out.length < 3) all.forEach(function (p) { if (out.length < 6) add(p.t, 0); });
    if (out.length > 12) {                              // keep the bold ones first, then spread the rest across the part
      var st = out.filter(function (p) { return p.s; }), rest = out.filter(function (p) { return !p.s; }), pick = st.slice(0, 12);
      for (var i = 0; pick.length < 12 && i < rest.length; i += Math.max(1, Math.floor(rest.length / (12 - st.length || 1)))) pick.push(rest[i]);
      out = out.filter(function (p) { return pick.indexOf(p) > -1; });
    }
    return out;
  }
  function pointsOf(x) { return keyPoints(partBlocks(x)); }

  /* ---------------- the sheet (same look as 🃏/📄, ads hidden while open) ---------------- */
  var box = null, onClose = null;
  function close() {
    if (!box) return; var b = box; box = null; var oc = onClose; onClose = null; if (oc) try { oc(); } catch (e) {}
    d.documentElement.classList.remove("fcon", "rton");
    var A = w.NursinAnim; if (A && A.out) A.out(b, function () { b.remove(); }); else b.remove();
  }
  function shell(cls, title) {
    close();
    box = d.createElement("div"); box.className = "fcwrap rtw " + cls; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", title);
    box.innerHTML = '<div class="fcbox"><div class="fchd"><b>' + esc(title) + '</b><span class="fcn"></span><button class="fcx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></div><div class="fcbd"></div></div>';
    d.body.appendChild(box); d.documentElement.classList.add("fcon", "rton");
    box.addEventListener("click", function (e) { if (e.target === box || (e.target.closest && e.target.closest(".fcx"))) close(); });
    return box.querySelector(".fcbd");
  }
  function locked() { var h = d.documentElement.classList; return h.contains("gl-lock"); }
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !d.documentElement.classList.contains("gl-out"); }
  function ret(id, kind) { var RR = w.NursinRet; if (RR && RR.apply) try { RR.apply(id, kind); } catch (e) {} }
  function checklist(res) {
    return '<ul class="rtck">' + res.map(function (r) { return '<li class="' + (r.ok ? "ok" : "no") + '"><span aria-hidden="true">' + (r.ok ? "✅" : "❌") + "</span><span>" + (r.lab ? "<b>" + esc(r.lab) + ":</b> " : "") + esc(r.t) + "</span></li>"; }).join("") + "</ul>";
  }
  function missedDeck(res) {
    return res.filter(function (r) { return !r.ok; }).map(function (r) {
      return { k: "h", front: T("🧠 شو بتتذكّر عن: ", "🧠 Que retiens-tu de : ") + (r.h ? r.h + " — " : "") + clip(r.t, 38) + T("؟", " ?"), back: "<p>" + (r.lab ? "<b>" + esc(r.lab) + "</b><br>" : "") + esc(r.t) + "</p>" };
    });
  }
  function toReview(x, n) {                              // a few questions of this lesson into tomorrow's «🔁 مراجعة اليوم»
    var S = w.NursinSRS, RR = w.NursinRet; if (!S || !S.add) return Promise.resolve(0);
    return loadQuiz().then(function () {
      var id = base(x), qs = (w.QUIZ || []).filter(function (q) { return (RR && RR.ofQ ? RR.ofQ(q) === id : q.t === x.t && (!x.l || q.l === x.l)) && !S.has(q.id); }).slice(0, n || 3);
      if (qs.length) S.add(qs.map(function (q) { return q.id; }));
      return qs.length;
    });
  }
  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); });
  }
  function loadQuiz() { return loadScript("assets/quiz-data.js?v=" + V, function () { return !!w.QUIZ; }); }
  function loadCases() { return loadScript("assets/cases-data.js?v=" + V, function () { return !!w.CASES; }); }
  function loadWhy() { return loadScript("assets/why-data.js?v=" + V, function () { return !!w.WHY; }); }
  function endBtns(res, x) {
    var miss = res.filter(function (r) { return !r.ok; }).length;
    return '<div class="fcact rtact">' + (miss ? '<button class="btn pri rtcards" type="button">' + esc(T("🃏 اللي فاتك كبطاقات (" + miss + ")", "🃏 Ce que tu as oublié en cartes (" + miss + ")")) + "</button>" : "") +
      (miss ? '<button class="btn rtrev" type="button">' + esc(T("🔁 زيد لمراجعة بكرا", "🔁 Ajouter à la révision de demain")) + "</button>" : "") +
      '<button class="btn rtagain" type="button">' + esc(T("↺ جرّب مرّة تانية", "↺ Réessayer")) + '</button><button class="btn rtdone" type="button">' + esc(T("خلصت", "Terminé")) + "</button></div>";
  }
  function wireEnd(bd, res, x, again) {
    var c = bd.querySelector(".rtcards"), r = bd.querySelector(".rtrev");
    if (c) c.addEventListener("click", function () { var C = w.NursinCards, deck = missedDeck(res); close(); if (C && C.openDeck) C.openDeck(base(x), deck); });
    if (r) r.addEventListener("click", function () { r.disabled = true; toReview(x, 3).then(function (n) { r.textContent = n ? T("✅ انضاف " + n + " سؤال لمراجعة بكرا", "✅ " + n + " question(s) ajoutée(s) à demain") : T("✅ أسئلة هالدرس أصلاً بالمراجعة", "✅ Les questions de cette leçon sont déjà en révision"); }); });
    bd.querySelector(".rtagain").addEventListener("click", again);
    bd.querySelector(".rtdone").addEventListener("click", close);
  }
  function emptyPts(bd) { bd.innerHTML = '<p class="small">' + esc(T("ما لقينا نقاط أساسية كافية بهالجزء. جرّب جزء تاني.", "Pas assez de points clés dans cette partie. Essaie une autre partie.")) + "</p>"; }

  /* ---------------- 🧑‍🏫 علِّم عثمان ---------------- */
  function teachLeft() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; return o.d === day ? Math.max(0, TMAX - (o.n | 0)) : TMAX; }
  function teachUse() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; o = o.d === day ? o : { d: day, n: 0 }; o.n = (o.n | 0) + 1; lsSet(TK, o); }
  function teachPrompt(x, pts, said) {
    return T("الطالب عم يشرحلك جزء من درس «" + plabel(x) + "» بكلماته (علّم عثمان). النقاط الأساسية لهالجزء (من نص الدرس نفسو، ما تزيد شي من برّا):\n" +
      pts.map(function (p, i) { return (i + 1) + ") " + (p.lab ? p.lab + ": " : "") + p.t; }).join("\n") + "\n\nشرح الطالب: «" + said + "»\n\n" +
      "قارن شرحو بالنقاط بس: إذا ذكر شي مش بالنقاط ما تعتبرو غلط إلا إذا بيناقضها. جاوب بالعربي اللبناني، قصير، وبهالشكل بالظبط (بلا نجوم وبلا مقدمة):\n✅ صح: (شو ذكر صح، باختصار)\n❌ ناقصك: (كل نقطة ما ذكرها، كل وحدة بسطر يبدأ بـ - )\n🔧 تصحيح: (إذا قال شي غلط صحّحو بجملة وحدة من النقاط؛ إذا ما في غلط قول شو أهم نقطة يركّز عليها)\nكل مصطلح فرنسي خلّي معناه بالعربي حدّو.",
      "L'étudiant t'explique avec ses mots une partie de la leçon « " + plabel(x) + " » (enseigne à Osman). Les points clés de cette partie (tirés du texte de la leçon, n'ajoute rien d'extérieur) :\n" +
      pts.map(function (p, i) { return (i + 1) + ") " + (p.lab ? p.lab + ": " : "") + p.t; }).join("\n") + "\n\nExplication de l'étudiant : « " + said + " »\n\n" +
      "Compare uniquement avec ces points : ce qu'il dit en plus n'est faux que s'il les contredit. Réponds en français, court, exactement sous cette forme (sans astérisques, sans introduction) :\n✅ Juste : (ce qu'il a dit de correct)\n❌ Il te manque : (chaque point oublié sur une ligne commençant par - )\n🔧 Correction : (s'il a dit quelque chose de faux, corrige-le en une phrase tirée des points ; sinon, le point le plus important à retenir)");
  }
  function askOsman(text) {
    var ctl = ("AbortController" in w) ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 40000);
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text: text }], context: w.Osman && w.Osman.persona ? w.Osman.persona() : "" }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { var t = j && j.text; if (!t || /مشغول|busy|high demand|overloaded/i.test(t) && t.length < 120) throw new Error("busy"); return String(t).replace(/\*\*?/g, "").trim(); });
  }
  function fmtReply(t) {
    return esc(t).split(/\n+/).map(function (l) { l = l.trim(); if (!l) return ""; var c = /^✅/.test(l) ? "ok" : /^❌/.test(l) ? "no" : /^🔧/.test(l) ? "fx" : /^[-–•]/.test(l) ? "li" : ""; return '<p class="' + c + '">' + l + "</p>"; }).join("");
  }
  function localReply(res) {
    var ok = res.filter(function (r) { return r.ok; }), no = res.filter(function (r) { return !r.ok; });
    return '<p class="ok">' + esc(T("✅ صح: ", "✅ Juste : ")) + (ok.length ? esc(ok.slice(0, 4).map(function (r) { return clip(r.t, 60); }).join(" · ")) : esc(T("ما لقيت ولا نقطة من الدرس بشرحك بعد.", "Je n'ai encore trouvé aucun point de la leçon dans ton explication."))) + "</p>" +
      (no.length ? '<p class="no">' + esc(T("❌ ناقصك:", "❌ Il te manque :")) + "</p>" + no.map(function (r) { return '<p class="li">- ' + esc((r.lab ? r.lab + ": " : "") + r.t) + "</p>"; }).join("") : '<p class="no">' + esc(T("❌ ناقصك: ولا شي 🎉", "❌ Il te manque : rien 🎉")) + "</p>") +
      '<p class="fx">' + esc(T("🔧 تصحيح: ", "🔧 Correction : ") + (no.length ? T("ركّز على: ", "Concentre-toi sur : ") + no[0].t : T("شرحك غطّى كل النقاط، برافو!", "Ton explication couvre tous les points, bravo !"))) + "</p>";
  }
  function openTeach(x) {
    var bd = shell("rteach", "🧑‍🏫 " + T("علِّم عثمان: ", "Enseigne à Osman : ") + plabel(x)), pts = pointsOf(x), id = base(x);
    if (!pts.length) return emptyPts(bd);
    function form(prev) {
      bd.innerHTML = '<div class="rtosm"><span class="osa" aria-hidden="true">👨‍🏫</span><p>' + esc(T("اشرحلي هالجزء بكلماتك، كأنك عم تعلّمني ياه. اكتب كل شي فهمتو (٣ جمل وفوق)، وأنا بقلّك شو صح وشو ناقصك.", "Explique-moi cette partie avec tes mots, comme si tu me l'enseignais. Écris tout ce que tu as compris (3 phrases ou plus) et je te dis ce qui est juste et ce qui manque.")) + "</p></div>" +
        '<textarea class="rtta" rows="7" maxlength="2500" placeholder="' + esc(T("اكتب شرحك هون…", "Écris ton explication ici…")) + '">' + esc(prev || "") + "</textarea>" +
        '<p class="small rtnote">' + esc(signed() ? T("عثمان بيصحّح " + teachLeft() + " شرح كمان اليوم. بعدها بيصحّح من نقاط الدرس تلقائياً.", "Osman peut encore corriger " + teachLeft() + " explication(s) aujourd'hui, ensuite la correction se fait automatiquement avec les points de la leçon.") : T("🔒 عثمان بيصحّح بس إذا فاتح حساب. هلّق التصحيح من نقاط الدرس تلقائياً.", "🔒 Osman corrige seulement si tu es connecté(e). Pour l'instant la correction se fait automatiquement avec les points de la leçon.")) + "</p>" +
        '<div class="fcact"><button class="btn pri rtsend" type="button">' + esc(T("📤 بعتلو الشرح", "📤 Envoyer l'explication")) + "</button></div>";
      var ta = bd.querySelector(".rtta"), b = bd.querySelector(".rtsend");
      b.addEventListener("click", function () {
        var said = ta.value.trim();
        if (said.length < 30) { ta.focus(); ta.classList.add("rtshake"); setTimeout(function () { ta.classList.remove("rtshake"); }, 500); return; }
        result(said);
      });
      try { ta.focus({ preventScroll: true }); } catch (e) {}
    }
    function result(said) {
      var res = check(pts, said), got = res.filter(function (r) { return r.ok; }).length, useAI = signed() && teachLeft() > 0 && w.fetch && (navigator.onLine !== false);
      ret(id, got / res.length >= 0.6 ? "fok" : "fbad");
      bd.innerHTML = '<div class="rtsaid"><small>' + esc(T("شرحك", "Ton explication")) + "</small><p>" + esc(clip(said, 400)) + "</p></div>" +
        '<div class="rtosm rtrep"><span class="osa" aria-hidden="true">👨‍🏫</span><div class="rtrb">' + (useAI ? '<p class="small rtwait">' + esc(T("⏳ عثمان عم يقرا شرحك…", "⏳ Osman lit ton explication…")) + "</p>" : localReply(res) + '<p class="small rtauto">' + esc(T("(تصحيح تلقائي من نقاط الدرس)", "(correction automatique avec les points de la leçon)")) + "</p>") + "</div></div>" +
        '<details class="rtfold"' + (useAI ? "" : " open") + '><summary>' + esc(T("📋 نقاط الدرس: غطّيت " + got + " من " + res.length, "📋 Points de la leçon : " + got + " sur " + res.length + " couverts")) + "</summary>" + checklist(res) + "</details>" + endBtns(res, x);
      wireEnd(bd, res, x, function () { form(said); });
      if (!useAI) return;
      teachUse();
      var mine = box;
      askOsman(teachPrompt(x, pts, said)).then(function (t) {
        if (box !== mine) return; var rb = bd.querySelector(".rtrb"); if (rb) rb.innerHTML = fmtReply(t);
      }, function () {
        if (box !== mine) return; var rb = bd.querySelector(".rtrb"); if (rb) rb.innerHTML = localReply(res) + '<p class="small rtauto">' + esc(T("(عثمان مش متاح هلّق، فهيدا تصحيح تلقائي من نقاط الدرس)", "(Osman n'est pas disponible, voici une correction automatique avec les points de la leçon)")) + "</p>";
      });
    }
    form("");
  }

  /* ---------------- 📃 الورقة البيضا ---------------- */
  function openBlank(x) {
    var bd = shell("rblank", "📃 " + T("الورقة البيضا: ", "Page blanche : ") + plabel(x)), pts = pointsOf(x), id = base(x), tick = null;
    onClose = function () { clearInterval(tick); };
    if (!pts.length) return emptyPts(bd);
    var last = (lsGet(BK) || {})[pkey(x)];
    function intro() {
      clearInterval(tick);
      bd.innerHTML = '<div class="rtosm"><span class="osa" aria-hidden="true">📃</span><p>' + esc(T("عندك دقيقتين: اكتب كل شي متذكّرو من هالجزء بدون ما تتطلّع عالدرس. بعدين منقارن مع النقاط الأساسية (" + pts.length + " نقاط).", "Tu as 2 minutes : écris tout ce dont tu te souviens de cette partie sans regarder la leçon. Ensuite on compare avec les points clés (" + pts.length + " points).")) + "</p></div>" +
        (last ? '<p class="small">' + esc(T("آخر مرّة: " + last.n + " من " + last.of, "La dernière fois : " + last.n + " sur " + last.of)) + "</p>" : "") +
        '<div class="fcact"><button class="btn pri rtgo" type="button">' + esc(T("▶️ ابدأ (٢:٠٠)", "▶️ Commencer (2:00)")) + "</button></div>";
      bd.querySelector(".rtgo").addEventListener("click", run);
    }
    function run() {
      var end = Date.now() + BLANK_SEC * 1000, finished = false;
      bd.innerHTML = '<p class="rttime" aria-live="off"><span class="rtclk">2:00</span><i class="rtbar"><b style="width:100%"></b></i></p>' +
        '<textarea class="rtta" rows="9" maxlength="4000" placeholder="' + esc(T("اكتب كل شي متذكّرو…", "Écris tout ce dont tu te souviens…")) + '"></textarea>' +
        '<div class="fcact"><button class="btn pri rtfin" type="button">' + esc(T("✅ خلصت", "✅ J'ai fini")) + "</button></div>";
      var ta = bd.querySelector(".rtta"), clk = bd.querySelector(".rtclk"), bar = bd.querySelector(".rtbar b");
      function draw() {
        var left = Math.max(0, Math.round((end - Date.now()) / 1000));
        clk.textContent = Math.floor(left / 60) + ":" + ("0" + left % 60).slice(-2); bar.style.width = (100 * left / BLANK_SEC) + "%";
        if (left <= 15) clk.parentNode.classList.add("rtlow");
        if (left <= 0) fin();
      }
      function fin() { if (finished) return; finished = true; clearInterval(tick); result(ta.value.trim(), Math.round((BLANK_SEC * 1000 - Math.max(0, end - Date.now())) / 1000)); }
      tick = setInterval(draw, 500); draw();
      bd.querySelector(".rtfin").addEventListener("click", fin);
      try { ta.focus({ preventScroll: true }); } catch (e) {}
    }
    function result(said, secs) {
      var res = check(pts, said), got = res.filter(function (r) { return r.ok; }).length, all = lsGet(BK) || {};
      all[pkey(x)] = { n: got, of: res.length, t: Date.now() }; lsSet(BK, all); last = all[pkey(x)];
      ret(id, got / res.length >= 0.6 ? "fok" : "fbad");
      var pct = Math.round(100 * got / res.length);
      bd.innerHTML = '<div class="fcend rtscore"><p class="fcbig">' + (pct >= 80 ? "🔥" : pct >= 50 ? "👏" : "💪") + "</p><p><b>" + esc(T("غطّيت " + got + " من " + res.length + " نقاط", "Tu as couvert " + got + " points sur " + res.length)) + "</b></p>" +
        '<p class="small">' + esc(said ? "⏱️ " + Math.floor(secs / 60) + ":" + ("0" + secs % 60).slice(-2) : T("ما كتبت شي هالمرّة، هيدي كل النقاط لتراجعها.", "Tu n'as rien écrit cette fois : voici tous les points à revoir.")) + "</p></div>" +
        checklist(res) + '<p class="small rtauto">' + esc(T("المقارنة بالكلمات الأساسية لكل نقطة (عربي وفرنسي). إذا كتبتها بكلمات تانية ممكن ما تنحسب، ارجع للدرس وتأكّد.", "Comparaison par mots-clés de chaque point (arabe et français). Si tu l'as écrit autrement, il se peut qu'il ne soit pas compté : vérifie dans la leçon.")) + "</p>" + endBtns(res, x);
      wireEnd(bd, res, x, intro);
    }
    intro();
  }

  /* ---------------- 🩺 حالة مريض ---------------- */
  function caseOf(id) { var C = w.CASES || []; for (var i = 0; i < C.length; i++) if (C[i].id === id) return C[i]; return null; }
  function cq(q) { var f = FR() && q.fr ? q.fr : null; return { q: f ? f.q : q.q, o: f && f.o && f.o.length === q.o.length ? f.o : q.o, x: f ? f.x : q.x, a: q.a }; }
  function openCase(l) {
    var id = base(l), bd = shell("rcase", "🩺 " + T("حالة مريض: ", "Cas clinique : ") + l.n);
    bd.innerHTML = '<p class="small">⏳</p>';
    var mine = box;
    loadCases().then(function () {
      if (box !== mine) return; var c = caseOf(id);
      if (!c) { bd.innerHTML = '<p class="small">' + esc(T("ما في حالة لهالدرس بعد.", "Pas encore de cas pour cette leçon.")) + "</p>"; return; }
      var f = FR() && c.fr ? c.fr : c, ok = 0, done = 0, L = "abc";
      var h = '<div class="rcpt"><p><span aria-hidden="true">👤</span> ' + esc(f.pt) + '</p><p class="rcv"><span aria-hidden="true">📈</span> ' + esc(f.v) + "</p></div>";
      c.qs.forEach(function (q0, i) {
        var q = cq(q0);
        h += '<div class="rcq" data-i="' + i + '"><p class="rcqq"><b>' + (i + 1) + ".</b> " + esc(q.q) + "</p>" + q.o.map(function (o, k) { return '<button class="opt" type="button" data-k="' + k + '"><span class="l" dir="ltr">' + L[k] + "</span><span>" + esc(o) + "</span></button>"; }).join("") + '<div class="rcx" aria-live="polite"></div></div>';
      });
      h += '<div class="rcend" hidden></div>';
      bd.innerHTML = h;
      [].forEach.call(bd.querySelectorAll(".rcq"), function (el) {
        var i = +el.getAttribute("data-i"), q = cq(c.qs[i]);
        var askUp = function (k) { var X = w.NursinAsk; if (X) X.mount(el, { k: "case:" + id + ":" + i, q: f.pt + " — " + f.v + " — " + q.q, o: q.o, a: q.a, x: q.x, lid: id, answered: k != null, pick: k, surface: "case" }); };   // 🙋 «اسأل عثمان» (assets/ask.js), free practice
        askUp();
        el.addEventListener("click", function (e) {
          var b = e.target.closest && e.target.closest(".opt"); if (!b || b.disabled) return;
          var k = +b.getAttribute("data-k"), good = k === q.a; if (good) ok++; done++;
          [].forEach.call(el.querySelectorAll(".opt"), function (o) { var kk = +o.getAttribute("data-k"); o.disabled = true; if (kk === q.a) o.classList.add("ok"); else if (kk === k) o.classList.add("bad"); });
          el.querySelector(".rcx").innerHTML = '<div class="expl' + (good ? "" : " w") + '">' + (good ? T("✅ صح! ", "✅ Juste ! ") : T("❌ الجواب: ", "❌ Réponse : ") + L[q.a] + " — ") + esc(q.x) + "</div>" +
            (!good && w.NursinWX ? w.NursinWX.html(q, k, { lid: id }) : "");   // ❌ «ليش غلط؟» + 📖 + 🔁 (assets/wrongx.js)
          ret(id, good ? "ok" : "bad"); askUp(k);
          try {                                                // 🔁 التكرار المتباعد v2: every case answer enters (same id as the midterm mock), + «كنت متأكد / حزرت» after a right one
            var SR = w.NursinSRS, sq = { id: "cs-" + String(id).replace(":", "-") + "-" + i }, sr = SR && SR.answer ? SR.answer(sq, good) : null, rx = el.querySelector(".rcx");
            if (sr && rx) { rx.insertAdjacentHTML("beforeend", SR.tagHtml(sr)); var cr = good && SR.confRow ? SR.confRow(sq) : null; if (cr) rx.appendChild(cr); }
          } catch (e2) {}
          if (done === c.qs.length) end();
        });
      });
      function end() {
        var e = bd.querySelector(".rcend"), pct = Math.round(100 * ok / c.qs.length);
        e.hidden = false;
        e.innerHTML = '<div class="fcend"><p class="fcbig">' + (pct === 100 ? "🎉" : pct >= 50 ? "👏" : "💪") + "</p><p><b>" + esc(T("جاوبت صح " + ok + " من " + c.qs.length, "Tu as " + ok + " bonne(s) réponse(s) sur " + c.qs.length)) + "</b></p>" +
          '<div class="fcact"><a class="btn" href="quiz.html?t=' + esc(l.t) + (l.l ? "&l=" + esc(l.l) : "") + '">' + esc(T("📝 كويز على هالدرس", "📝 Quiz sur cette leçon")) + '</a><button class="btn pri rtdone" type="button">' + esc(T("خلصت", "Terminé")) + "</button></div></div>";
        e.querySelector(".rtdone").addEventListener("click", close);
        try { e.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (x) {}
      }
    });
  }


  /* ---------------- 📝 «كويز هالجزء» — a quiz at the end of EVERY lesson part (Abdullah, Nov 3 2026 10:01 PM: «بدي بكل جزء من الدرس
     ينعمل كويز عنه، إذا مقسّم لـ3 ينعمل بكل قسم كويز»). The button is the first one of the part's end row (.rtrow). The part's questions =
     assets/partq-data.js PARTQ.map[part key]: the lesson's bank questions matched to the part by the part's own words, plus questions
     written from that part's text (all of them live in assets/quiz-data.js with their own q### id). It opens over the page (ads hidden,
     html.rton), one question at a time; after a right answer «✅ كنت متأكد / 🤔 حزرت»; every answer → NursinSRS (same id) + NursinRet + Weak.
     End: score, «🔁 عيد», «➡️ الجزء الجاي». Done parts: localStorage nursin_partq_v1 {key: {s best, l last, n, t}} → ✓ on the button and on
     the part's title, «📝 2/5» (parts done / parts) on the lesson's first title. Reading the quiz to its end also marks the part read. */
  var PQK = "nursin_partq_v1", PQMAX = 6;
  function pqLoad() { return loadScript("assets/partq-data.js?v=" + V, function () { return !!w.PARTQ; }); }
  function pqDone() { var o = lsGet(PQK); return o && typeof o === "object" ? o : {}; }
  function pqSave(k, s, n) {
    var o = pqDone(), p = o[k]; o[k] = { s: Math.max(s, p ? p.s | 0 : 0), l: s, n: n, t: Date.now() }; lsSet(PQK, o);
    try { d.dispatchEvent(new CustomEvent("nursin:partq", { detail: { k: k, s: s, n: n } })); } catch (e) {}
  }
  function pqIds(k) { var P = w.PARTQ; return P && P.map && P.map[k] ? P.map[k].slice() : []; }
  function pqQs(k) { var b = {}; (w.QUIZ || []).forEach(function (q) { if (q && q.id) b[q.id] = q; }); return pqIds(k).map(function (id) { return b[id]; }).filter(Boolean); }
  function pageParts() { return (R().parts || R().list || []).filter(here); }
  function lessonParts(x) { return (R().parts || R().list || []).filter(function (y) { return base(y) === base(x); }); }
  function pqNext(x) { var P = pageParts(), k = pkey(x); for (var i = 0; i < P.length - 1; i++) if (pkey(P[i]) === k) return P[i + 1]; return null; }
  function goPart(y) {
    var a = y.href.split("#")[1], el = a ? d.getElementById(a) : null;
    if (!el) { var r0 = d.querySelector('.rtrow[data-k="' + pkey(y) + '"]'); el = r0 ? (r0.closest("details,section,article") || r0) : null; }
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    try { el.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) { el.scrollIntoView(); }
  }
  function pqMarks() {
    var dn = pqDone();
    [].forEach.call(d.querySelectorAll("button[data-pq]"), function (b) {
      var r = dn[b.getAttribute("data-pq")], want = r ? "✓ " + T("📝 كويز هالجزء", "📝 Quiz de cette partie") + " · " + r.s + "/" + r.n : T("📝 كويز هالجزء", "📝 Quiz de cette partie");
      if (b.textContent !== want) b.textContent = want;
      if (b.classList.contains("pqok") !== !!r) b.classList.toggle("pqok", !!r);
    });
    pageParts().forEach(function (x) {
      var a = x.href.split("#")[1], el = a ? d.getElementById(a) : null; if (!el || el.tagName !== "DETAILS") return;
      var sm = el.querySelector(":scope > summary"); if (!sm) return; var host = sm.querySelector(".t b") || sm;
      var mk = host.querySelector(".pqmk"), on = !!dn[pkey(x)];
      if (on && !mk) { mk = d.createElement("span"); mk.className = "pqmk"; mk.setAttribute("data-nofr", ""); mk.setAttribute("title", T("خلصت كويز هالجزء", "Quiz de cette partie fait")); mk.textContent = " ✓"; var pr0 = host.querySelector(".pqpr"); if (pr0) host.insertBefore(mk, pr0); else host.appendChild(mk); }
      else if (!on && mk) mk.remove();
      var ps = lessonParts(x), pr = host.querySelector(".pqpr");
      if (ps.length > 1 && x.p === 1) {
        var c = ps.filter(function (y) { return dn[pkey(y)]; }).length, t = " · 📝 " + c + "/" + ps.length + " " + T("أجزاء", "parties");
        if (!pr) { pr = d.createElement("span"); pr.className = "pqpr"; pr.setAttribute("data-nofr", ""); host.appendChild(pr); }
        if (pr.textContent !== t) pr.textContent = t;
        if (pr.classList.contains("all") !== (c === ps.length)) pr.classList.toggle("all", c === ps.length);
      } else if (pr) pr.remove();
    });
  }
  function openPart(x, again) {
    var k = pkey(x), id = base(x), bd = shell("rpq", "📝 " + T("كويز هالجزء", "Quiz de cette partie"));
    bd.innerHTML = '<p class="small">⏳</p>';
    var mine = box;
    Promise.all([loadQuiz(), pqLoad()]).then(function () {
      if (box !== mine) return;
      var qs = pqQs(k), n = qs.length, i = 0, ok = 0, L = "abc", miss = [];
      if (!n) { bd.innerHTML = '<p class="small">' + esc(T("ما في أسئلة لهالجزء بعد.", "Pas encore de questions pour cette partie.")) + "</p>"; return; }
      if (again) for (var j = n - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), tq = qs[j]; qs[j] = qs[r]; qs[r] = tq; }
      if (n > PQMAX) {                                   // a part with many bank questions: 6 a round, the ones he never answered first
        var SS = w.NursinSRS, has = function (q) { try { return !!(SS && SS.has && SS.has(q.id)); } catch (e) { return false; } };
        qs = qs.filter(function (q) { return !has(q); }).concat(qs.filter(has)).slice(0, PQMAX); n = qs.length;
      }
      if (w.NursinVar) qs = w.NursinVar.varyAll(qs);   // 🔀 29y: a question seen before comes back in another shape (assets/qvary.js)
      var hd = '<p class="rpqlab"><span aria-hidden="true">📖</span> ' + esc(plabel(x)) + "</p>";
      function draw() {
        var q = qs[i];
        bd.innerHTML = hd + '<div class="rpqbar" aria-hidden="true">' + qs.map(function (_, t) { return '<i class="' + (t < i ? "d" : t === i ? "c" : "") + '"></i>'; }).join("") + "</div>" +
          '<p class="small rpqn">' + esc(T("سؤال " + (i + 1) + " من " + n, "Question " + (i + 1) + " sur " + n)) + "</p>" +
          '<div class="rcq rpqq" data-qid="' + esc(q.id) + '"><p class="rcqq">' + esc(q.q) + "</p>" + q.o.map(function (o, kk) { return '<button class="opt" type="button" data-k="' + kk + '"><span class="l" dir="ltr">' + L[kk] + "</span><span>" + esc(o) + "</span></button>"; }).join("") +
          '<div class="rcx" aria-live="polite"></div></div><div class="fcact rpqgo" hidden><button class="btn pri" type="button" data-pqnext>' + esc(i < n - 1 ? T("السؤال الجاي ←", "Question suivante →") : T("النتيجة 🏁", "Résultat 🏁")) + "</button></div>";
        var el = bd.querySelector(".rpqq");
        el.addEventListener("click", function (e) {
          var b = e.target.closest && e.target.closest(".opt"); if (!b || b.disabled) return;
          var kk = +b.getAttribute("data-k"), good = kk === q.a; if (good) ok++; else miss.push(q);
          [].forEach.call(el.querySelectorAll(".opt"), function (o) { var k2 = +o.getAttribute("data-k"); o.disabled = true; if (k2 === q.a) o.classList.add("ok"); else if (k2 === kk) o.classList.add("bad"); });
          var rx = el.querySelector(".rcx");
          rx.innerHTML = '<div class="expl' + (good ? "" : " w") + '">' + (good ? T("✅ صح! ", "✅ Juste ! ") : T("❌ الجواب: ", "❌ Réponse : ") + L[q.a] + " — ") + esc(q.x) + "</div>" +
            (!good && w.NursinWX ? w.NursinWX.html(q, kk, { skip: qs.map(function (z) { return z.id; }) }) : "");   // ❌ «ليش غلط؟» + 📖 + 🔁 (assets/wrongx.js)
          ret(id, good ? "ok" : "bad");
          try { var W = w.Weak; if (W && W.record) W.record(q, good); } catch (e1) {}
          try {                                              // 🔁 every answer enters the spaced repetition (same q### id as everywhere)
            var SR = w.NursinSRS, sr = SR && SR.answer ? SR.answer(q, good) : null;
            if (sr) { rx.insertAdjacentHTML("beforeend", SR.tagHtml(sr)); var cr = good && SR.confRow ? SR.confRow(q) : null; if (cr) rx.appendChild(cr); }
          } catch (e2) {}
          var go = bd.querySelector(".rpqgo"); go.hidden = false;
          try { go.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e3) {}
        });
        bd.querySelector("[data-pqnext]").addEventListener("click", function () { i++; if (i < n) { draw(); try { box.querySelector(".fcbd").scrollTop = 0; } catch (e4) {} } else end(); });
      }
      function end() {
        pqSave(k, ok, n);
        try { var NL = w.NursinLessons; if (NL && NL.markRead) NL.markRead(x); } catch (e5) {}
        var pct = Math.round(100 * ok / n), nx = pqNext(x);
        bd.innerHTML = hd + '<div class="fcend rpqend"><p class="fcbig">' + (pct === 100 ? "🎉" : pct >= 50 ? "👏" : "💪") + '</p><p class="rpqsc"><b dir="ltr">' + ok + "/" + n + '</b></p><p class="rpqsc2">' + esc(T("جاوبت صح " + ok + " من " + n, "Tu as " + ok + " bonne(s) réponse(s) sur " + n)) + "</p><p>" +
          esc(pct === 100 ? T("كلّو صح! هالجزء صار بجيبتك ✓", "Tout juste ! Cette partie est acquise ✓") : pct >= 50 ? T("منيح! راجع يلّي غلطت فيه وعيد.", "Bien ! Revois tes erreurs et refais-le.") : T("رجاع اقرا هالجزء مرّة تانية، وبعدين عيد الكويز.", "Relis cette partie, puis refais le quiz.")) + "</p>" +
          (miss.length ? '<ul class="rpqmiss">' + miss.map(function (q) { return "<li>❌ " + esc(clip(q.q, 90)) + " <b>" + esc(T("الصح: ", "Juste : ")) + "</b>" + esc(q.o[q.a]) + "</li>"; }).join("") + "</ul>" : "") +
          '<p class="small">' + esc(T("🔁 كل أجوبتك انحطّت بالتكرار المتباعد، وانعلّم هالجزء ✓.", "🔁 Toutes tes réponses sont dans la révision espacée, et cette partie est cochée ✓.")) + "</p>" +
          '<div class="fcact"><button class="btn" type="button" data-pqagain>' + esc(T("🔁 عيد", "🔁 Refaire")) + "</button>" +
          (nx ? '<button class="btn pri" type="button" data-pqgo>' + esc(T("➡️ الجزء الجاي", "➡️ Partie suivante")) + "</button>" : '<button class="btn pri" type="button" data-pqfin>' + esc(T("✅ خلصت", "✅ Terminé")) + "</button>") + "</div>" +
          (nx ? '<p class="small rpqnx">➡️ ' + esc(plabel(nx)) + "</p>" : "") + "</div>";
        bd.querySelector("[data-pqagain]").addEventListener("click", function () { openPart(x, true); });
        var g = bd.querySelector("[data-pqgo]"); if (g) g.addEventListener("click", function () { close(); setTimeout(function () { goPart(nx); }, 60); });
        var f = bd.querySelector("[data-pqfin]"); if (f) f.addEventListener("click", close);
        try { box.querySelector(".fcbd").scrollTop = 0; } catch (e6) {}
      }
      draw();
    });
  }

  /* ---------------- the rows / buttons on lesson pages ---------------- */
  function mountParts() {
    var P = R().parts || R().list || [];
    P.forEach(function (x) {
      if (!here(x)) return;
      var a = x.href.split("#")[1], body = null;
      if (a) {
        var el = d.getElementById(a); if (!el) return;
        var top = d.getElementById(a.replace(/-p\d+$/, "")); if (x.p && (!top || !top.hasAttribute("data-split"))) return;     // wait until assets/lessons.js cut it into parts
        body = el.tagName === "DETAILS" ? (el.querySelector(":scope > .tbody") || el) : el;
      } else {                                           // Henderson: right before its end-of-lesson bar
        var q = d.querySelector('.lqz a[href*="l=' + x.l + '"]'), lq = q && q.closest(".lqz"); if (!lq) return;
        var prev = lq.previousElementSibling; if (prev && prev.classList.contains("lsk")) lq = prev;
        if (lq.previousElementSibling && lq.previousElementSibling.classList.contains("rtrow")) return;
        lq.parentNode.insertBefore(row(x), lq); return;
      }
      if (!body || body.querySelector(":scope > .rtrow")) return;
      body.appendChild(row(x));
    });
    [].forEach.call(d.querySelectorAll(".lsk[data-l]"), function (bar) {
      var id = bar.getAttribute("data-l"); if (CASE_IDS.indexOf(id) < 0 || bar.querySelector("[data-case]")) return;
      var b = d.createElement("button"); b.className = "btn sm"; b.type = "button"; b.setAttribute("data-case", id); b.textContent = T("🩺 حالة مريض", "🩺 Cas clinique");
      bar.appendChild(b);
    });
  }
  function row(x) {
    var p = d.createElement("p"); p.className = "rtrow"; p.setAttribute("data-k", pkey(x));
    p.innerHTML = '<button class="btn sm pqbtn" type="button" data-pq="' + esc(pkey(x)) + '">' + esc(T("📝 كويز هالجزء", "📝 Quiz de cette partie")) + '</button><button class="btn sm" type="button" data-ex="' + esc(pkey(x)) + '">' + esc(T("✍️ اشرحلي بكلامك", "✍️ Explique avec tes mots (اشرحلي بكلامك)")) + '</button><button class="btn sm" type="button" data-teach="' + esc(pkey(x)) + '">' + esc(T("🧑‍🏫 علِّم عثمان", "🧑‍🏫 Enseigne à Osman")) + '</button><button class="btn sm" type="button" data-blank="' + esc(pkey(x)) + '">' + esc(T("📃 الورقة البيضا", "📃 Page blanche")) + "</button>";
    return p;
  }
  function partByKey(k) { var P = R().parts || R().list || []; for (var i = 0; i < P.length; i++) if (pkey(P[i]) === k) return P[i]; return null; }
  function lessonById(id) { var L = R().list || []; for (var i = 0; i < L.length; i++) if (base(L[i]) === id) return L[i]; return null; }
  d.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-teach],[data-blank],[data-case],[data-pq]"); if (!b) return;
    if (locked()) return;
    if (b.hasAttribute("data-pq")) { var xp = partByKey(b.getAttribute("data-pq")); if (xp) openPart(xp); return; }
    if (b.hasAttribute("data-case")) { var l = lessonById(b.getAttribute("data-case")); if (l) openCase(l); return; }
    var x = partByKey(b.getAttribute("data-teach") || b.getAttribute("data-blank")); if (!x) return;
    if (b.hasAttribute("data-teach")) openTeach(x); else openBlank(x);
  });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && box) close(); });

  /* ---------------- 📝 the weekly mixed exam: picking (pure) + the home / حفظي entry ---------------- */
  function weekKey(day) {                              // Monday-start week of a Beirut day «YYYY-MM-DD» → «YYYY-MM-DD» of its Monday
    var t = new Date(day + "T12:00:00Z"), wd = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - wd); return t.toISOString().slice(0, 10);
  }
  function today() { var S = w.NursinSRS; if (S && S.today) try { return S.today(); } catch (e) {} return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  function rng(seed) { var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* ctx: { lessonOf(q) → lesson id, subjOf(id) → مادة key, score(id) → 0–100|null (null = never studied), weak{qid:1}, due{qid:1} }
     → up to n questions from the lessons she studied, weighted: lesson 🔴 ×4 · 🟡 ×2.5 · 🟢 ×1, a question in her mistakes ×3, due today ×2;
     every studied مادة gets at least one question when there is room. */
  function weeklyPick(Q, ctx, n, seed) {
    n = n || WN; var r = rng(seed || "x"), pool = [], subj = {};
    Q.forEach(function (q) {
      var id = ctx.lessonOf(q); if (!id) return; var s = ctx.score(id); if (s == null) return;
      var wt = (s < 40 ? 4 : s < 70 ? 2.5 : 1) * (ctx.weak[q.id] ? 3 : 1) * (ctx.due[q.id] ? 2 : 1), sj = ctx.subjOf(id);
      pool.push({ q: q, w: wt, s: sj }); subj[sj] = 1;
    });
    var out = [], used = {};
    function take(list) {
      var tot = 0; list.forEach(function (p) { tot += p.w; }); if (!tot) return null;
      var x = r() * tot; for (var i = 0; i < list.length; i++) { x -= list[i].w; if (x <= 0) return list[i]; } return list[list.length - 1];
    }
    Object.keys(subj).sort().forEach(function (sj) { if (out.length >= n) return; var p = take(pool.filter(function (y) { return y.s === sj; })); if (p) { out.push(p); used[p.q.id] = 1; } });
    while (out.length < n) { var rest = pool.filter(function (y) { return !used[y.q.id]; }); if (!rest.length) break; var p = take(rest); out.push(p); used[p.q.id] = 1; }
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t; }
    return out.map(function (p) { return p.q; });
  }
  function groupOf(s) { var NL = w.NursinLessons; return NL && NL.groupOf ? NL.groupOf(s) : s; }
  function subjName(k) { var N = R(), x = (N.groups || {})[k] || (N.subjects || {})[k]; return x ? (FR() && x.fr ? x.fr : x.ar) : k; }
  function ctxNow() {
    var RR = w.NursinRet, W = w.Weak, S = w.NursinSRS, weak = {}, due = {};
    if (W && W.items) Object.keys(W.items()).forEach(function (k) { weak[k] = 1; });
    if (S && S.questions) S.questions().forEach(function (q) { due[q.id] = 1; });
    return { lessonOf: function (q) { return RR && RR.ofQ ? RR.ofQ(q) : null; }, subjOf: function (id) { var l = lessonById(id); return l ? groupOf(l.s) : id.split(":")[0]; },
      score: function (id) { var s = RR && RR.score ? RR.score(id) : null; return s == null ? null : s; }, weak: weak, due: due };
  }
  function wstate() { var x = lsGet(WK); return x && typeof x === "object" ? x : { hist: [] }; }
  function weekly(n) { return weeklyPick(w.QUIZ || [], ctxNow(), n || WN, weekKey(today()) + ":" + ((wstate().tries | 0))); }
  function wstatus() {
    var st = wstate(), wk = weekKey(today()), done = st.wk === wk && st.res, avail = (w.QUIZ ? weekly(WN).length : 0);
    return { week: wk, done: !!done, res: done ? st.res : null, ready: !done && avail >= 8, avail: avail, last: (st.hist || [])[0] || null };
  }
  function wsave(res) {                                  // called by quiz.js when the mixed exam ends
    var st = wstate(), wk = weekKey(today()); res.wk = wk; res.t = Date.now();
    st.hist = [res].concat((st.hist || []).filter(function (h) { return h.wk !== wk; })).slice(0, 8); st.wk = wk; st.res = res; st.tries = (st.tries | 0) + 1; lsSet(WK, st);
    try { d.dispatchEvent(new CustomEvent("nursin:wexam", { detail: res })); } catch (e) {}
  }
  function nextMonday() { var t = new Date(weekKey(today()) + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 7); return t.toISOString().slice(0, 10); }
  function bySubjHtml(by) {
    return '<ul class="wxby">' + Object.keys(by || {}).map(function (k) { var v = by[k], p = v[1] ? Math.round(100 * v[0] / v[1]) : 0; return '<li><span>' + esc(subjName(k)) + '</span><i class="wxbar"><b class="' + (p >= 70 ? "g" : p >= 40 ? "y" : "r") + '" style="width:' + p + '%"></b></i><span class="wxn">' + v[0] + "/" + v[1] + "</span></li>"; }).join("") + "</ul>";
  }
  function homeEntry() {
    var el = d.getElementById("wexhome"); if (!el || !w.QUIZ) return;
    var s = wstatus(); el.hidden = !s.ready && !s.done;
    if (el.hidden) return;
    el.innerHTML = '<a class="prrev prwx' + (s.ready ? " hot" : "") + '" href="quiz.html?t=mixed"><span aria-hidden="true">📝</span><span><b>' + esc(T("الامتحان الأسبوعي المختلط", "L'examen mixte de la semaine")) + "</b><small>" +
      esc(s.ready ? T(Math.min(WN, s.avail) + " سؤال من كل اللي درستو، أكتر شي من الدروس الحمرا", Math.min(WN, s.avail) + " questions sur tout ce que tu as étudié, surtout les leçons en rouge") : T("✅ خلصتو هالأسبوع: " + s.res.score + "/" + s.res.total + " · الجاي يوم الاثنين", "✅ Fait cette semaine : " + s.res.score + "/" + s.res.total + " · le prochain lundi")) +
      '</small></span><span class="prn' + (s.ready ? " wxready" : "") + '">' + esc(s.ready ? T("جاهز", "Prêt") : Math.round(100 * s.res.score / s.res.total) + "%") + "</span></a>";
  }
  function hifzCard() {
    var el = d.getElementById("wexhifz"); if (!el || !w.QUIZ) return;
    var s = wstatus(), r = s.res || s.last;
    el.hidden = false;
    el.innerHTML = '<h2>📝 ' + esc(T("الامتحان الأسبوعي المختلط", "L'examen mixte de la semaine")) + (s.ready ? ' <span class="wxready">' + esc(T("جاهز", "Prêt")) + "</span>" : "") + "</h2>" +
      '<p class="small">' + esc(s.ready ? T("~" + Math.min(WN, s.avail) + " سؤال من كل المواد اللي درستها، أكتر شي من الدروس الحمرا وأخطاءك. الغلط بيرجع لمراجعة بكرا.", "~" + Math.min(WN, s.avail) + " questions de toutes les matières étudiées, surtout tes leçons en rouge et tes erreurs. Les erreurs reviennent en révision demain.") :
        s.done ? T("✅ خلصتو هالأسبوع. الامتحان الجاي بيجهز يوم الاثنين " + nextMonday() + ".", "✅ Fait cette semaine. Le prochain sera prêt lundi " + nextMonday() + ".") : T("بيجهز بس تدرس شوية دروس وتحلّ عليهن كويز (بدّو ٨ أسئلة عالأقل من اللي درستو).", "Il sera prêt dès que tu auras étudié quelques leçons avec leur quiz (au moins 8 questions de ce que tu as étudié).")) + "</p>" +
      (r ? '<p class="small"><b>' + esc(T("آخر نتيجة: ", "Dernier résultat : ") + r.score + "/" + r.total) + "</b></p>" + bySubjHtml(r.by) : "") +
      (s.ready ? '<p><a class="btn pri" href="quiz.html?t=mixed">' + esc(T("▶️ ابدأ الامتحان", "▶️ Commencer l'examen")) + "</a></p>" : "");
  }

  /* ---------------- B / C helpers for assets/quiz.js ---------------- */
  function confOn(s) { return !!(s && !s.exam && !s.challenge && !s.cq && !s.mid); }   // 🎯 + the midterm mock (quiz.html?t=mid)      // never in scored exams / challenges / tournament / class quiz
  function whyFor(q, guessed, rnd) {
    var y = q && w.WHY && w.WHY[q.id]; if (!y || !y.o || y.o.length < 2) return null;
    if (!guessed && (rnd == null ? Math.random() : rnd) >= 1 / 3) return null;
    var f = FR() && y.fr && y.fr.o && y.fr.o.length === y.o.length ? y.fr : null;
    return { q: f ? f.q : y.q, o: f ? f.o : y.o, a: y.a };
  }

  w.Retain = { V: V, norm: norm, fold: fold, tokens: tokens, terms: terms, cover: cover, check: check, keyPoints: keyPoints, pointsOf: pointsOf,
    weeklyPick: weeklyPick, weekKey: weekKey, weekly: weekly, wstatus: wstatus, wsave: wsave, subjName: subjName, groupOf: groupOf, bySubjHtml: bySubjHtml,
    confOn: confOn, whyFor: whyFor, loadWhy: loadWhy, loadQuiz: loadQuiz, CASE_IDS: CASE_IDS, BLANK_SEC: BLANK_SEC, TMAX: TMAX, WN: WN, WMIN: WMIN,
    openTeach: function (k) { var x = partByKey(k); if (x) openTeach(x); }, openBlank: function (k) { var x = partByKey(k); if (x) openBlank(x); },
    openCase: function (id) { var l = lessonById(id); if (l) openCase(l); }, close: close, T: T,
    openPart: function (k) { var x = partByKey(k); if (x) openPart(x); }, pqMarks: pqMarks, pqDone: pqDone, pqSave: pqSave, pqIds: pqIds, PQK: PQK };

  function init() {
    if (d.querySelector(".lqz") || d.querySelector("details.topic") || d.querySelector("[data-subject]") || /^(cardio|neuro|henderson|medsurg|geri|community|rea|pharma|law|mgmt|quality)\.html$/.test(page)) {
      var mT = 0, mount = function () { clearTimeout(mT); mT = setTimeout(function () { try { mountParts(); } catch (e) {} try { pqMarks(); } catch (e) {} }, 80); };
      mount(); setTimeout(mount, 1500);
      try { new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (box && box.contains(t)) continue; if (t.closest && t.closest(".rtrow,.fcwrap,.nwrap,.ntoast")) continue; mount(); return; } }).observe(d.body, { childList: true, subtree: true }); } catch (e) {}
    }
    homeEntry(); hifzCard();
    d.addEventListener("nursin:partq", function () { setTimeout(function () { try { pqMarks(); } catch (e) {} }, 30); });
    ["nursin:ret", "nursin:srs", "nursin:wexam", "nursin:gate"].forEach(function (ev) { d.addEventListener(ev, function () { setTimeout(function () { homeEntry(); hifzCard(); }, 40); }); });
    if (page === "quiz.html") setTimeout(loadWhy, 1200);
    var m = (location.search.match(/[?&](teach|blank|case|pq)=([\w%:#-]+)/) || []);
    if (m[1]) setTimeout(function () { var k = decodeURIComponent(m[2]); if (m[1] === "case") w.Retain.openCase(k); else if (m[1] === "pq") w.Retain.openPart(k); else if (m[1] === "teach") w.Retain.openTeach(k); else w.Retain.openBlank(k); }, 900);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
