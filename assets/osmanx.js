/* 👨‍🏫 الأستاذ عثمان جوّا الدرس (Abdullah, Nov 7 2026 11:29–11:32 AM: «كيف فينا نخلي الاستاذ عثمان اكتر تفاعل مع الطلاب بالدرس» → «كلن حطن»).
   On every lesson page (loaded after assets/explain.js), inside each lesson part:
   1) ❓ mid-lesson check — under the part's end row (.rtrow, assets/retain.js) Osman asks ONE short question of that part (its own «كويز هالجزء»
      questions, assets/partq-data.js, else the lesson's) and reacts: a short praise, or a short «ليش» from the question's own explanation
      (assets/wrongx.js why()). The answer counts like any answer (nursin:answer → lesson memory, review dates, 📚 coverage; نقاط ضعفك).
   2) 🧑‍🏫 «بسّطلي» — tap any sentence / list item of an open lesson → a small «🧑‍🏫 بسّطلي» chip → Osman explains it simpler (the SAME worker
      endpoint and 10-a-day «علِّم عثمان» count as ✍️ اشرحلي بكلامك, signed in only, text of the part only). Offline / signed out / count used /
      no answer in 12 s → the part's own summary: its key terms (the 🗺️ mind map's terms of that part) + its first lines.
   3) 🩺 «حالة صغيرة» — a button in the part's end row: a short patient from the part's own patient-style question, «شو بتعمل؟», a free answer
      graded by Osman (signed in) or locally by key terms (assets/explain.js grade), then the expected answer from the lesson.
   4) 🧠 mistake memory — the first lesson he opens on the page starts with «مبارح غلطت بـ … خلينا نرجعلها» from his real wrong answers
      (assets/cover.js mem: the answers recorded since 30d, else نقاط ضعفك) + «🔁 جرّبها هلّق».
   5) 🔊 «اسمع» on Osman's words — speechSynthesis only (no outside voice service): an Arabic voice when the device has one (French terms
      in a French voice), else only the French terms; feature-detected, no button at all where there is none (old iOS / webviews).
   No ad near any of it, nothing new sent to Firestore. ES5 (iOS 12). */
(function (w, d) {
  "use strict";
  var V = "20261030d", QK = "nursin_oxq_v1", MK = "nursin_oxmem_v1", TK = "nursin_teach_day_v1", TMAX = 10;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function cut(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
  function today() { var S = w.NursinSRS; if (S && S.today) try { return S.today(); } catch (e) {} return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function name() { return T("الأستاذ عثمان", "Professeur Osman"); }

  /* ---------------- 🔊 voice (pure parts tested in node) ---------------- */
  function canSpeak() { try { return !!(w.speechSynthesis && w.SpeechSynthesisUtterance && typeof w.speechSynthesis.speak === "function"); } catch (e) { return false; } }
  function voices() { try { return (w.speechSynthesis && w.speechSynthesis.getVoices && w.speechSynthesis.getVoices()) || []; } catch (e) { return []; } }
  function voiceFor(pre, V0) { V0 = V0 || voices(); for (var i = 0; i < V0.length; i++) if (String(V0[i].lang || "").toLowerCase().replace("_", "-").indexOf(pre) === 0) return V0[i]; return null; }
  function clean(t) { return String(t || "").replace(/[\u2600-\u27BF\uFE0F\u200D]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, " ").replace(/[«»"*_#]/g, " ").replace(/\s+/g, " ").trim(); }
  // segs(text) → [{fr: true|false, t}] — runs of Latin words (French terms) apart from the Arabic around them
  function segs(text) {
    var s = clean(text), out = [], re = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9'’\-]*(?:[ ,/]+[A-Za-z\u00C0-\u024F0-9][A-Za-z\u00C0-\u024F0-9'’\-]*)*/g, m, at = 0;
    while ((m = re.exec(s))) { var a = s.slice(at, m.index).trim(); if (a) out.push({ fr: false, t: a }); out.push({ fr: true, t: m[0] }); at = m.index + m[0].length; }
    var z = s.slice(at).trim(); if (z) out.push({ fr: false, t: z });
    return out.filter(function (x) { return /[A-Za-z\u00C0-\u024F\u0621-\u064A0-9]/.test(x.t); });
  }
  // plan(text, V) → [{lang, t, voice}] : Arabic voice there → everything; none → only the French terms (fr, else en)
  function plan(text, V0) {
    V0 = V0 || voices(); var ar = voiceFor("ar", V0), fr = voiceFor("fr", V0), en = voiceFor("en", V0), any = !V0.length;
    return segs(text).filter(function (x) { return x.fr || ar || any; }).map(function (x) {
      return x.fr ? { lang: fr || any ? "fr-FR" : "en-US", t: x.t, voice: fr || en || null } : { lang: ar ? ar.lang : "ar-SA", t: x.t, voice: ar || null };
    });
  }
  var talking = null;
  function stop() { try { if (canSpeak()) w.speechSynthesis.cancel(); } catch (e) {} if (talking) { talking.textContent = T("🔊 اسمع", "🔊 Écouter"); talking = null; } }
  function speak(text, btn) {
    if (!canSpeak()) return false;
    if (talking && talking === btn) { stop(); return false; }
    stop(); var P = plan(text); if (!P.length) return false;
    try {
      P.forEach(function (x, i) {
        var u = new w.SpeechSynthesisUtterance(x.t); u.lang = x.lang; if (x.voice) u.voice = x.voice; u.rate = x.lang.indexOf("ar") === 0 ? 0.95 : 0.9;
        if (i === P.length - 1) u.onend = u.onerror = function () { if (talking === btn) stop(); };
        w.speechSynthesis.speak(u);
      });
    } catch (e) { return false; }
    if (btn) { talking = btn; btn.textContent = T("⏹️ وقّف", "⏹️ Stop"); }
    return true;
  }
  function sayBtn() { return canSpeak() ? '<button class="btn sm oxsay" type="button" data-oxsay="1">' + esc(T("🔊 اسمع", "🔊 Écouter")) + "</button>" : ""; }

  /* ---------------- questions of a part (pure) ---------------- */
  function bank() { var b = {}; (w.QUIZ || []).forEach(function (q) { if (q && q.id) b[q.id] = q; }); return b; }
  function base(k) { return String(k || "").split("#")[0]; }
  function partQs(k, Q, PQ) {
    Q = Q || w.QUIZ || []; PQ = PQ || (w.PARTQ && w.PARTQ.map) || {};
    var by = {}; Q.forEach(function (q) { if (q && q.id) by[q.id] = q; });
    var ids = PQ[k] || [], out = ids.map(function (id) { return by[id]; }).filter(Boolean);
    if (!out.length) { var R = w.NursinRet, b = base(k); out = Q.filter(function (q) { return q && q.o && R && R.ofQ && R.ofQ(q) === b; }); }
    return out.filter(function (q) { return q && q.o && q.o.length >= 2 && q.a != null; });
  }
  // the question Osman asks under a part: rotates every time it is asked (nursin_oxq_v1 {k: n})
  function pickQ(k, qs, st) { if (!qs.length) return null; st = st || {}; var n = (st[k] | 0) + hash(k + today()); return qs[n % qs.length]; }
  var PAT = /مريض|مريضة|patient|سنة|عمر|ans\b|حالة|وصل|بيشكي|بتشكي/i;
  function caseQ(qs, n) { var c = qs.filter(function (q) { return PAT.test(q.q); }); var L = c.length ? c : qs; return L.length ? L[(n | 0) % L.length] : null; }
  function chunks(s) { return String(s || "").split(/\s*[،,؛;/+]\s*|\s+و\s+|\s+et\s+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 3; }); }
  // the local grade of a 🩺 answer: the right option's parts + up to 3 part terms its explanation names
  function caseKeys(q, terms) {
    var ks = chunks(q.o[q.a]), E = w.NursinEx, x = String(q.x || "");
    (terms || []).forEach(function (t) { if (ks.length >= 6) return; var tk = E && E.tokens ? E.tokens(t) : [], xt = E && E.tokens ? E.tokens(x) : []; if (tk.some(function (a) { return xt.indexOf(a) > -1; })) ks.push(t); });
    return ks;
  }
  function caseGrade(q, said, terms) { var E = w.NursinEx; if (!E || !E.grade) return null; return E.grade(caseKeys(q, terms), said); }
  function sents(x) { return String(x || "").replace(/([.!؟?:])\s+/g, "$1\n").split("\n"); }   // no look-behind (iOS 12)
  function firstSent(x) { return cut(sents(x)[0], 180); }

  /* ---------------- Osman online (same endpoint + count as ✍️) ---------------- */
  function teachLeft() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; return o.d === day ? Math.max(0, TMAX - (o.n | 0)) : TMAX; }
  function teachUse() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; o = o.d === day ? o : { d: day, n: 0 }; o.n = (o.n | 0) + 1; lsSet(TK, o); }
  function online() { var E = w.NursinEx; return !!(E && E.canOsman && E.osman && E.canOsman()); }
  function ask(text) { var E = w.NursinEx; teachUse(); return E.osman(text); }
  function simpPrompt(sent, lesson, partText) {
    return "الطالب ما فهم هالجملة من درس «" + lesson + "» (بسّطلي):\n«" + sent + "»\n\nنص الجزء من الموقع (اشرح منو بس، وما تزيد ولا معلومة من برّا):\n" + String(partText || "").slice(0, 1600) +
      "\n\nاشرحلو ياها بكلام أبسط بالعربي اللبناني، ٣ أسطر قصار بالكتير، كل مصطلح فرنسي حدّو معناه بالعربي بين قوسين، ومثال صغير من نفس النص إذا بيساعد. بلا نجوم وبلا مقدمة.";
  }
  function casePrompt(q, said) {
    return "حالة صغيرة من الدرس (🩺): «" + q.q + "»\nالجواب الصح من الموقع: «" + q.o[q.a] + "»\nالشرح من الموقع: " + String(q.x || "") + "\n\nجواب الطالب (شو بيعمل): «" + said + "»\n\n" +
      "قارن بس مع الجواب والشرح (ولا معلومة من برّا). جاوب بالعربي اللبناني، قصير كتير (٣ أسطر)، بهالشكل بالظبط، بلا نجوم:\n✅ صح: …\n❌ ناقصك: …\n💡 نصيحة: …";
  }
  function oText(t) { return esc(t).split(/\n+/).map(function (l) { l = l.trim(); return l ? "<p>" + l + "</p>" : ""; }).join(""); }

  /* ---------------- the part text / summary (fallback of «بسّطلي») ---------------- */
  function partOf(el) {                                 // the <details> part around el → {k, x, el}
    var det = el && el.closest ? el.closest("details[id]") : null; if (!det) return null;
    var P = (w.NLESSONS && (w.NLESSONS.parts || w.NLESSONS.list)) || [], id = det.id, i;
    for (i = 0; i < P.length; i++) { var a = (P[i].href || "").split("#")[1]; if (a === id) return { k: P[i].s + ":" + (P[i].l || P[i].t) + (P[i].p ? "#" + P[i].p : ""), x: P[i], el: det }; }
    return null;
  }
  function partText(det) { if (!det) return ""; var b = det.querySelector(":scope > .tbody") || det, c = b.cloneNode(true); [].forEach.call(c.querySelectorAll("summary,button,script,style,small,.small,.prq,.lsk,.lqz,.nwrap,.rtrow,.exbox,.oxq,.oxcase,.oxmem,.oxs,.oxsimp,ins,.adx,.ad-slot"), function (n) { n.parentNode.removeChild(n); }); return (c.textContent || "").replace(/\s+/g, " ").trim(); }
  function summaryHtml(keys, txt) {
    var s = sents(txt).filter(function (x) { return x.length > 12 && !/📸|🎯|📝/.test(x); }).slice(0, 2).join(" ");
    return '<p class="oxsm"><b>📌 ' + esc(T("خلاصة هالجزء من الدرس:", "Résumé de cette partie (de la leçon) :")) + "</b></p>" + (keys && keys.length ? '<p class="oxtxt">' + keys.slice(0, 8).map(esc).join(" · ") + "</p>" : "") + (s ? '<p class="oxtxt">' + esc(cut(s, 320)) + "</p>" : "");
  }
  // simplify(sentence, part) → Promise<{mode: osman|local, html}> — Osman online, else the part's own summary
  function simplify(sent, P, keys) {
    var txt = P ? partText(P.el) : "", fall = function (why) { return { mode: "local", why: why, html: '<p class="small oxwhy">' + esc(why) + "</p>" + summaryHtml(keys, txt) }; };
    var offl = w.navigator && w.navigator.onLine === false;
    if (!online()) return Promise.resolve(fall(offl ? T("📴 مش متصل هلّق، هيدي خلاصة الجزء:", "📴 Hors ligne : voici le résumé de la partie :") : teachLeft() <= 0 ? T("خلص عدد اليوم (١٠) مع عثمان، هيدي خلاصة الجزء:", "Limite du jour (10) atteinte : voici le résumé :") : T("سجّل دخول لحتى يشرحلك عثمان، هلّق هيدي خلاصة الجزء:", "Connecte-toi pour qu'Osman explique ; voici le résumé :")));
    return ask(simpPrompt(sent, P && P.x ? P.x.n : "", txt)).then(function (t) { return { mode: "osman", html: '<div class="oxtxt">' + oText(t) + "</div>" }; }, function () { return fall(T("عثمان مشغول هلّق، هيدي خلاصة الجزء:", "Osman est occupé : voici le résumé :")); });
  }

  /* ======================== the page ======================== */
  if (!d || !d.addEventListener) { w.NursinOX = api(); return; }
  var page = ((w.location && w.location.pathname) || "").split("/").pop() || "index.html";
  if (!/^(cardio|neuro|henderson|law|mgmt|quality|pharma|rea|geri|community|medsurg)\.html$/.test(page)) { w.NursinOX = api(); return; }
  function style() {
    if (d.getElementById("oxcss")) return;
    var s = d.createElement("style"); s.id = "oxcss";
    s.textContent = ".oxq,.oxcase,.oxmem{margin:8px 0 6px;padding:10px 12px;border-radius:14px;border:1px solid rgba(124,58,237,.3);background:rgba(124,58,237,.05);font-size:14px;line-height:1.6;box-sizing:border-box;max-width:100%}" +
      ".oxh{margin:0 0 6px;font-weight:700}.oxq .oxopts{display:flex;flex-direction:column;gap:6px;margin:6px 0}.oxq .oxopts button{text-align:start;white-space:normal;line-height:1.45}" +
      ".oxopts button.ok{border-color:#16a34a;background:rgba(22,163,74,.12)}.oxopts button.no{border-color:#dc2626;background:rgba(220,38,38,.1)}" +
      ".oxre p,.oxcase p{margin:4px 0}.oxact{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.oxcase textarea{width:100%;min-height:70px;box-sizing:border-box;font:inherit;border-radius:10px;padding:8px;border:1px solid rgba(0,0,0,.2);background:transparent;color:inherit}" +
      ".oxsimp{display:inline-block;margin:0 6px;padding:2px 10px;border-radius:999px;border:1px solid rgba(124,58,237,.5);background:#7c3aed;color:#fff;font-size:13px;line-height:1.6;cursor:pointer;vertical-align:middle}" +
      ".oxs{position:fixed;left:0;right:0;bottom:0;z-index:70;max-height:70vh;overflow:auto;background:#fff;color:#0f172a;border-radius:18px 18px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.2);padding:14px 14px calc(14px + env(safe-area-inset-bottom,0px));font-size:15px;line-height:1.65;max-width:720px;margin:0 auto}" +
      "html[data-theme=night] .oxs{background:#17122a;color:#e2e8f0}.oxs blockquote{margin:6px 0;padding:6px 10px;border-inline-start:3px solid #7c3aed;opacity:.85;font-size:14px}.oxs .oxx{float:left;border:0;background:none;font-size:22px;cursor:pointer;color:inherit}" +
      ".oxwhy{opacity:.8}";
    (d.head || d.body).appendChild(s);
  }
  function loadScript(src, test) {
    return new Promise(function (ok) { if (test()) return ok(); var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { ok(); }; setTimeout(ok, 9000); (d.head || d.body).appendChild(s); });
  }
  var dataP = null;
  function needData() { if (!dataP) dataP = loadScript("assets/partq-data.js?v=" + V, function () { return !!w.PARTQ; }).then(function () { return loadScript("assets/quiz-data.js?v=" + V, function () { return !!w.QUIZ; }); }); return dataP; }
  function answered(q, ok) {
    try { if (w.Weak && w.Weak.record) w.Weak.record(q, ok); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:answer", { detail: { qid: q.id, ok: ok, set: "osm" } })); } catch (e) {}
  }
  var PRAISE = [["برافو! 👏 فهمت هالجزء", "Bravo ! 👏 Tu as compris cette partie"], ["هيك بدّي ياك 💪 كمّل عالجزء الجاي", "C'est ça 💪 passe à la suite"], ["صح! 🎯 الجزء ثبت براسك", "Juste ! 🎯 c'est retenu"], ["عفاك! 👌 قراية منيحة", "Bien joué ! 👌 bonne lecture"]];
  // one MCQ widget: Osman asks, reacts (praise / ليش from the explanation), 🔊
  function mcq(box, q, head, onNext) {
    style();
    var opts = q.o.map(function (o, i) { return '<button class="btn sm" type="button" data-oxo="' + i + '">' + "abc".charAt(i) + ") " + esc(o) + "</button>"; }).join("");
    box.innerHTML = '<p class="oxh">👨‍🏫 ' + esc(name()) + ": " + esc(head) + "</p><p>" + esc(q.q) + '</p><div class="oxopts">' + opts + '</div><div class="oxre" aria-live="polite"></div>';
    box.querySelector(".oxopts").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-oxo]") : null; if (!b || box.getAttribute("data-done")) return;
      var k = +b.getAttribute("data-oxo"), ok = k === q.a; box.setAttribute("data-done", "1");
      [].forEach.call(box.querySelectorAll("[data-oxo]"), function (x) { x.disabled = true; var i = +x.getAttribute("data-oxo"); if (i === q.a) x.classList.add("ok"); else if (i === k) x.classList.add("no"); });
      answered(q, ok);
      var re = box.querySelector(".oxre"), W = w.NursinWX, y = !ok && W && W.why ? W.why(q, k) : null, said;
      if (ok) { var p = PRAISE[hash(q.id + Date.now()) % PRAISE.length]; said = T(p[0], p[1]); re.innerHTML = '<p class="oxtxt">✅ ' + esc(said) + "</p>"; }
      else {
        var scold = w.Osman && w.Osman.pick ? w.Osman.pick("wrong") : T("مش هيك يا بطل 😅", "Pas tout à fait 😅");
        said = scold + " " + T("الصح: ", "La bonne : ") + q.o[q.a] + ". " + (y && y.r ? y.r : firstSent(q.x));
        re.innerHTML = '<p class="oxtxt">❌ ' + esc(scold) + '</p><p class="oxtxt">✅ ' + esc(T("الصح: ", "La bonne réponse : ")) + esc(q.o[q.a]) + "</p>" + ((y && y.r) || q.x ? '<p class="oxtxt">💡 ' + esc(T("ليش: ", "Pourquoi : ")) + esc(cut((y && y.r) || firstSent(q.x), 200)) + "</p>" : "") +
          (y && y.w ? '<p class="oxtxt small">❓ ' + esc(T("ليش جوابك غلط: ", "Pourquoi ta réponse est fausse : ")) + esc(cut(y.w, 160)) + "</p>" : "");
      }
      re.insertAdjacentHTML("beforeend", '<div class="oxact">' + sayBtn() + (onNext ? '<button class="btn sm" type="button" data-oxnext="1">' + esc(T("🔁 سؤال تاني", "🔁 Une autre")) + "</button>" : "") + "</div>");
      re.setAttribute("data-say", said);
      var nx = re.querySelector("[data-oxnext]"); if (nx) nx.addEventListener("click", function () { box.removeAttribute("data-done"); onNext(); });
    });
  }
  /* 1) ❓ under each part */
  function midCard(row) {
    var k = row.getAttribute("data-k"); if (!k || (row.nextElementSibling && row.nextElementSibling.classList.contains("oxq"))) return;
    var box = d.createElement("div"); box.className = "oxq"; box.setAttribute("data-k", k);
    box.innerHTML = '<p class="oxh">👨‍🏫 ' + esc(name()) + ": " + esc(T("خلصت هالجزء؟ سؤال سريع 👇", "Partie finie ? Une question rapide 👇")) + "</p>";
    row.parentNode.insertBefore(box, row.nextSibling);
    var drawn = false;
    function draw() {
      if (drawn) return; drawn = true;
      needData().then(function () {
        var qs = partQs(k); if (!qs.length) { box.parentNode && box.parentNode.removeChild(box); return; }
        var st = lsGet(QK) || {};
        (function one() { var q = pickQ(k, qs, st); st[k] = (st[k] | 0) + 1; lsSet(QK, st); mcq(box, q, T("سؤال سريع عهالجزء 👇", "Question rapide sur cette partie 👇"), qs.length > 1 ? one : null); })();
      });
    }
    if ("IntersectionObserver" in w) { var io = new w.IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); draw(); } }, { rootMargin: "200px" }); io.observe(box); }
    else draw();
  }
  /* 3) 🩺 «حالة صغيرة» */
  function caseBtn(row) {
    if (row.querySelector("[data-oxcase]")) return;
    var b = d.createElement("button"); b.className = "btn sm"; b.type = "button"; b.setAttribute("data-oxcase", row.getAttribute("data-k")); b.textContent = T("🩺 حالة صغيرة", "🩺 Mini-cas");
    row.appendChild(b);
  }
  function openCase(row, k) {
    var nx = row.nextElementSibling, old = null;
    while (nx && /(^|\s)(oxq|oxcase|exbox)(\s|$)/.test(nx.className || "")) { if (/(^|\s)oxcase(\s|$)/.test(nx.className)) old = nx; nx = nx.nextElementSibling; }
    if (old) { old.parentNode.removeChild(old); return; }
    style();
    var box = d.createElement("div"); box.className = "oxcase"; box.innerHTML = "<p>⏳ …</p>"; row.parentNode.insertBefore(box, row.nextSibling);
    needData().then(function () {
      var qs = partQs(k), st = lsGet(QK) || {}, q = caseQ(qs, (st["c:" + k] | 0) + hash(k)); st["c:" + k] = (st["c:" + k] | 0) + 1; lsSet(QK, st);
      if (!q) { box.innerHTML = "<p>" + esc(T("ما في حالة لهالجزء بعد.", "Pas encore de cas pour cette partie.")) + "</p>"; return; }
      box.innerHTML = '<p class="oxh">🩺 ' + esc(T("حالة صغيرة", "Mini-cas")) + " · 👨‍🏫 " + esc(name()) + '</p><p class="oxtxt">' + esc(q.q.replace(/[؟?]\s*$/, "")) + '</p><p><b>' + esc(T("شو بتعمل؟", "Que fais-tu ?")) + "</b></p>" +
        '<textarea rows="3" placeholder="' + esc(T("اكتب شو بتعمل بكلامك…", "Écris ce que tu fais…")) + '"></textarea><div class="oxact"><button class="btn sm pri" type="button" data-oxgr="1">' + esc(T("صحّحلي", "Corrige-moi")) + '</button></div><div class="oxre" aria-live="polite"></div>';
      box.querySelector("[data-oxgr]").addEventListener("click", function () {
        var said = box.querySelector("textarea").value.trim(), re = box.querySelector(".oxre"); if (said.length < 3) { re.innerHTML = "<p>✍️ " + esc(T("اكتب جوابك أوّل", "Écris d'abord ta réponse")) + "</p>"; return; }
        this.disabled = true; re.innerHTML = "<p>⏳ " + esc(T("عثمان عم يقرا…", "Osman lit…")) + "</p>";
        var E = w.NursinEx, got = function (keys) {
          var res = caseGrade(q, said, keys), C = w.NursinCov; if (res && C && C.record) C.record(base(k), res.score >= 50);
          var tail = '<p class="oxtxt">✅ ' + esc(T("الجواب من الدرس: ", "La réponse de la leçon : ")) + esc(q.o[q.a]) + "</p>" + (q.x ? '<p class="oxtxt small">📖 ' + esc(firstSent(q.x)) + "</p>" : "");
          var loc = res ? '<p class="oxtxt">' + (res.score >= 75 ? "🌟 " : res.score >= 50 ? "👍 " : "📖 ") + esc(T("علامتك: ", "Score : ")) + res.score + "٪" + (res.got.length ? " · ✅ " + res.got.slice(0, 3).map(esc).join(" · ") : "") + (res.miss.length ? " · ❌ " + esc(T("نسيت: ", "oublié : ")) + res.miss.slice(0, 3).map(esc).join(" · ") : "") + "</p>" : "";
          var fin = function (os) { re.innerHTML = (os ? '<div class="oxtxt">' + oText(os) + "</div>" : loc) + tail + '<div class="oxact">' + sayBtn() + "</div>"; re.setAttribute("data-say", (os || "") + " " + q.o[q.a]); };
          if (online()) ask(casePrompt(q, said)).then(fin, function () { fin(null); }); else fin(null);
        };
        if (E && E.partSection) E.partSection(k, function (sec) { got(sec ? sec.keys : []); }); else got([]);
      });
    });
  }
  /* 2) 🧑‍🏫 «بسّطلي» */
  var chip = null, chipTm = 0;
  function dropChip() { clearTimeout(chipTm); if (chip && chip.parentNode) chip.parentNode.removeChild(chip); chip = null; }
  function sheet(html) {
    var old = d.querySelector(".oxs"); if (old) old.parentNode.removeChild(old);
    var s = d.createElement("div"); s.className = "oxs"; s.setAttribute("role", "dialog"); s.innerHTML = '<button class="oxx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">×</button>' + html; d.body.appendChild(s);
    d.documentElement.classList.add("rton");
    s.querySelector(".oxx").addEventListener("click", function () { stop(); s.parentNode.removeChild(s); d.documentElement.classList.remove("rton"); });
    return s;
  }
  function openSimp(el) {
    style(); var sent = (el.textContent || "").replace(/🧑‍🏫\s*بسّطلي|🧑‍🏫\s*Simplifie/g, "").replace(/\s+/g, " ").trim(), P = partOf(el);
    var s = sheet('<p class="oxh">🧑‍🏫 ' + esc(name()) + " " + esc(T("بيبسّطلك", "simplifie")) + "</p><blockquote>" + esc(cut(sent, 260)) + '</blockquote><div class="oxbd" aria-live="polite"><p>⏳ ' + esc(T("عثمان عم يفكّر…", "Osman réfléchit…")) + "</p></div>");
    var go = function (keys) { simplify(sent, P, keys).then(function (r) { var bd = s.querySelector(".oxbd"); if (!bd) return; bd.innerHTML = r.html + '<div class="oxact">' + sayBtn() + "</div>"; bd.setAttribute("data-say", (r.mode === "osman" ? "" : "") + bd.textContent.replace(/🔊.*$/, "")); }); };
    var E = w.NursinEx; if (P && E && E.partSection) E.partSection(P.k, function (sec) { go(sec ? sec.keys : []); }); else go([]);
  }
  var TXT = "p,li,td,dd,blockquote";
  function onTap(e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest(".oxsimp")) { e.preventDefault(); e.stopPropagation(); var host = chip && chip.parentNode; dropChip(); if (host) openSimp(host); return; }
    var say = t.closest("[data-oxsay]"); if (say) { var c = say.closest("[data-say]") || say.parentNode.parentNode; speak(c.getAttribute("data-say") || c.textContent, say); return; }
    var cs = t.closest("[data-oxcase]"); if (cs) { openCase(cs.closest(".rtrow"), cs.getAttribute("data-oxcase")); return; }
    if (t.closest("a,button,input,textarea,select,label,summary,mark,.rtrow,.oxq,.oxcase,.oxmem,.exbox,.oxs,.lsk,.lqz,.osm")) { if (!t.closest(".oxs")) dropChip(); return; }
    var el = t.closest(TXT); if (!el || !el.closest("details[open]")) { dropChip(); return; }
    try { var sel = w.getSelection && w.getSelection(); if (sel && String(sel).length) return; } catch (e2) {}
    var txt = (el.textContent || "").replace(/\s+/g, " ").trim(); if (txt.length < 20) { dropChip(); return; }
    if (chip && chip.parentNode === el) return;
    dropChip(); style();
    chip = d.createElement("button"); chip.type = "button"; chip.className = "oxsimp"; chip.textContent = T("🧑‍🏫 بسّطلي", "🧑‍🏫 Simplifie"); el.appendChild(chip);
    chipTm = setTimeout(dropChip, 6000);
  }
  /* 4) 🧠 «مبارح غلطت بـ …» at the top of the first lesson he opens */
  var memShown = false;
  function memCard(det) {
    if (memShown) return; var C = w.NursinCov; if (!C || !C.mem) return;
    var day = today(), st = lsGet(MK) || {};
    needData().then(function () {
      if (memShown) return;
      var by = bank(), m = C.mem(Date.now(), function (id) { return by[id] || null; }); if (!m || (st.d === day && st.q === (m.q || m.id))) return;
      memShown = true; lsSet(MK, { d: day, q: m.q || m.id }); style();
      var body = det.querySelector(":scope > .tbody") || det, box = d.createElement("div"); box.className = "oxmem";
      box.innerHTML = '<p class="oxh">👨‍🏫 ' + esc(name()) + ": " + esc(m.t) + "</p>" + (m.qt ? '<p class="small">«' + esc(m.qt) + "»</p>" : "") + '<div class="oxact">' + (by[m.q] ? '<button class="btn sm pri" type="button" data-oxmq="1">' + esc(T("🔁 جرّبها هلّق", "🔁 Réessaie maintenant")) + "</button>" : "") + '<a class="btn sm" href="' + esc(m.href) + '">' + esc(T("📖 الدرس", "📖 La leçon")) + '</a><button class="btn sm" type="button" data-oxmx="1">' + esc(T("بعدين", "Plus tard")) + "</button></div>";
      var sm = body.querySelector(":scope > summary"); body.insertBefore(box, sm ? sm.nextSibling : body.firstChild);
      box.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-oxmq],[data-oxmx]") : null; if (!t) return;
        if (t.hasAttribute("data-oxmx")) { box.parentNode.removeChild(box); return; }
        mcq(box, by[m.q], T("يلا نشوف هلّق 💪", "Voyons maintenant 💪"), null);
      });
    });
  }
  function mount(root) {
    [].forEach.call((root || d).querySelectorAll(".rtrow[data-k]"), function (row) { caseBtn(row); midCard(row); });
  }
  function boot() {
    d.addEventListener("click", onTap, true);
    d.addEventListener("toggle", function (e) { var el = e.target; if (el && el.tagName === "DETAILS" && el.open && el.id) { setTimeout(function () { mount(el); }, 400); memCard(el); } }, true);
    setTimeout(function () { mount(); var o = d.querySelector("details[open][id]"); if (o) memCard(o); }, 1800);
    setTimeout(mount, 5000);
    w.addEventListener("pagehide", stop);
  }
  function api() { return { V: V, canSpeak: canSpeak, speak: speak, stop: stop, segs: segs, plan: plan, voiceFor: voiceFor, partQs: partQs, pickQ: pickQ, caseQ: caseQ, caseKeys: caseKeys, caseGrade: caseGrade, chunks: chunks, simplify: simplify, simpPrompt: simpPrompt, casePrompt: casePrompt, summaryHtml: summaryHtml, online: online, teachLeft: teachLeft, sayBtn: sayBtn, firstSent: firstSent }; }
  w.NursinOX = api();
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
