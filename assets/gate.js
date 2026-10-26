/* 🔒 Sign-in gate (asked by Abdullah, Oct 26 2026 12:06 PM): visitors without an account see the lessons LOCKED and can't do quizzes
   until they sign in with Google. Client-side, on the existing Firebase auth state (assets/fb.js → «nursin:auth», assets/account.js → «nursin:me»).
   - Lesson pages (cardio, neuro, henderson, law, mgmt, quality, pharma, 3d): the title, intro and the start of the first lesson stay readable as a PREVIEW
     (real content for Google/AdSense); the rest is hidden/blurred behind the lock card. Nothing is removed from the HTML.
   - Quizzes (quiz.html normal + «عبّي الفراغ» + «كويز متل الصف», exams/challenges via quiz.html, law practice sections): fully hidden, lock card only.
     exams / live / classes («سؤال اليوم») already ask for sign-in in their own code.
   - Nav sheets + home cards: a small 🔒 on locked items (CSS on html.gl-out).
   - Sign in → everything unlocks at once, no reload. Signed-in visitors see no change. Ads are never touched.
   - ADD-ON (Abdullah 12:12 PM): «📺 شوف إعلان وافتح» on the lock card — a signed-out visitor can open THIS page for 1 hour (sessionStorage)
     by viewing an Adsterra 300x250 unit (never AdSense) in a box labelled «إعلان» with a 15 s countdown, same as the tutor's ad unlock.
     Only viewing + the timer count, never a click; if the ad doesn't load the button still comes after the timer. Sign-in stays the main button.
   - TUTOR LOCK (Abdullah 12:28 PM): tutor.html «الأستاذ المساعد» is locked for signed-out visitors too: no chat box, no questions, a lock card
     «🔒 الأستاذ المساعد مقفول — سجّل دخول بغوغل لتحكي معه» with the Google button ONLY (no ad unlock: every answer costs). assets/tutor.js
     also refuses to call its endpoint while signed out. The 🤖 bottom-bar tab and the home card show 🔒 (CSS on html.gl-out).
   html.gl-out = signed out (nav 🔒); html.gl-lock = this page's content locked (signed out and no ad unlock).
   Loaded synchronously in <head> so the locked state is there before the first paint. */
(function (w, d) {
  var KEY = "nursin_me_v1", html = d.documentElement;
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!/\.html$/.test(page)) page = "index.html";
  var LESSON = { "cardio.html": 1, "neuro.html": 1, "henderson.html": 1, "law.html": 1, "mgmt.html": 1, "quality.html": 1, "pharma.html": 1, "3d.html": 1 };
  var QUIZ = { "quiz.html": 1 };
  var TUTOR = { "tutor.html": 1 };
  var G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  var hint = false; try { hint = !!JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  var authKnown = false, signed = hint, built = false;
  var AKEY = "nursin_adunlock_v1", AD_KEY = "9892bba2f704f8ea66787de07f9f7be3", AD_WAIT = 15, AD_HOURS = 1, adTimer = null, adOpen = false;
  function adMap() { try { return JSON.parse(sessionStorage.getItem(AKEY) || "{}") || {}; } catch (e) { return {}; } }
  function adUntil() { var t = +adMap()[page] || 0; return t > Date.now() ? t : 0; }

  function card(kind) {
    var c = d.createElement("div");
    if (kind === "t") {                     // tutor: Google only, no ad unlock
      c.className = "glk-card glk-tut"; c.setAttribute("role", "region"); c.setAttribute("aria-label", "مقفول");
      c.innerHTML = '<p class="glk-h">🔒 الأستاذ المساعد مقفول — سجّل دخول بغوغل لتحكي معه</p>' +
        '<p class="small">الأستاذ المساعد بس للي عندن حساب. سجّل دخول بغوغل (ببلاش، بثانية) وبيفتحلك الأستاذ وكل الدروس والكويزات.</p>' +
        '<button class="gbtn glk-go" type="button">' + G + '<span>تسجيل الدخول بغوغل</span></button><p class="glk-err small" hidden></p>';
      return c;
    }
    c.className = "glk-card" + (kind === "q" ? " glk-q" : "");
    c.setAttribute("role", "region"); c.setAttribute("aria-label", "مقفول");
    c.innerHTML = '<p class="glk-h">' + (kind === "q" ? "🔒 الكويز مقفول — سجّل دخول بغوغل لتكمّل" : "🔒 الدرس مقفول — سجّل دخول بغوغل لتكمّل") + "</p>" +
      '<p class="small">' + (kind === "q" ? "الكويزات والتمارين بس للي عندن حساب. سجّل دخول بغوغل بثانية، ببلاش، وبيفتحلك كل شي." : "شفت أوّل الدرس. سجّل دخول بغوغل (ببلاش، بثانية) وبيفتحلك كل الدروس والكويزات.") + "</p>" +
      '<button class="gbtn glk-go" type="button">' + G + "<span>تسجيل الدخول بغوغل</span></button>" +
      '<p class="glk-or small">أو</p><button class="btn glk-ad" type="button">📺 شوف إعلان وافتح</button>' +
      '<p class="small glk-adn">إعلان قصير (١٥ ثانية) بيفتحلك ' + (kind === "q" ? "الكويز بهالصفحة" : "هالدرس") + ' لساعة. التسجيل بيفتح كل شي عطول.</p>' +
      '<p class="glk-err small" hidden></p>';
    return c;
  }
  function fbReady(ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() { if (w.NursinFB && w.NursinFB.signIn) return res(w.NursinFB); if (Date.now() - t0 > ms) return res(null); setTimeout(tick, 100); })();
    });
  }
  d.addEventListener("click", async function (e) {
    var b = e.target.closest && e.target.closest(".glk-go"); if (!b) return;
    var box = b.closest(".glk-card"), er = box && box.querySelector(".glk-err");
    if (w.Nursin && w.Nursin.loadFB) w.Nursin.loadFB();
    b.disabled = true; if (er) er.hidden = true;
    try {
      var A = w.NursinFB && w.NursinFB.signIn ? w.NursinFB : await fbReady(8000);
      if (!A) throw { code: "net" };
      await A.signIn();
    } catch (x) {
      console.warn("nursin: gate sign-in", x && x.code);
      if (er) { er.textContent = (w.NursinFB && w.NursinFB.errText) ? w.NursinFB.errText(x) : "⚠️ ما زبط تسجيل الدخول. تأكّد من الإنترنت وجرّب كمان مرّة."; er.hidden = false; }
    } finally { b.disabled = false; }
  });


  /* «📺 شوف إعلان وافتح»: the same ad screen as the 3D page / tutor (Adsterra 300x250 in its own iframe), 15 s, then «افتح ←» */
  function adScreen() {
    if (adOpen) return; adOpen = true;
    var o = d.createElement("div"); o.className = "gate3d glk-adgate"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "إعلان قصير لفتح الصفحة");
    o.innerHTML = '<div class="g3card"><p class="g3t">📺 إعلان قصير وبتفتح الصفحة</p><div class="g3ad"><small class="g3lab">إعلان</small><div class="g3slot"></div></div><p class="g3c" aria-live="polite"><span class="g3n">' + AD_WAIT + '</span></p><button type="button" class="btn pri g3go" hidden>افتح ←</button><p><button type="button" class="tlink glk-adx">✖ رجوع</button></p></div>';
    d.body.appendChild(o); html.classList.add("g3on");
    try {
      var f = d.createElement("iframe"); f.width = "300"; f.height = "250"; f.setAttribute("scrolling", "no"); f.setAttribute("frameborder", "0"); f.title = "إعلان"; f.loading = "eager";
      f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:"' + AD_KEY + '",format:"iframe",height:250,width:300,params:{}};<\/script><script src="https://bauval.org/22/' + AD_KEY + '" onerror="window.__adxErr=1"><\/script></body></html>';
      o.querySelector(".g3slot").appendChild(f);
    } catch (e) {}
    var n = o.querySelector(".g3n"), go = o.querySelector(".g3go"), secs = AD_WAIT, timer = null;
    function close() { clearTimeout(timer); o.remove(); html.classList.remove("g3on"); adOpen = false; }
    // the countdown runs even when the ad is blocked: nobody gets trapped
    (function tick() { if (secs > 0) { n.textContent = secs; secs--; timer = setTimeout(tick, 1000); return; } o.querySelector(".g3c").hidden = true; go.hidden = false; try { go.focus({ preventScroll: true }); } catch (e) {} })();
    o.querySelector(".glk-adx").addEventListener("click", close);
    go.addEventListener("click", function () {
      close();
      var m = adMap(), now = Date.now(); for (var k in m) if (!(+m[k] > now)) delete m[k];
      m[page] = now + AD_HOURS * 36e5;
      try { sessionStorage.setItem(AKEY, JSON.stringify(m)); } catch (e) {}
      apply();
    });
  }
  d.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".glk-ad"); if (b) adScreen(); });

  /* ---- lesson pages: preview + lock ---- */
  function markRest(kids, from) {            // kids[from] = blurred teaser, after it hidden
    for (var i = from; i < kids.length; i++) {
      var k = kids[i];
      if (k.matches && k.matches(".adx,.ad-slot,.glk-card,script,noscript")) continue;
      k.classList.add(i === from ? "glk-tz" : "glk-x");
    }
  }
  function previewCut(kids) {                // keep the opening: up to ~2 headings / 4 blocks
    var heads = 0;
    for (var i = 0; i < kids.length; i++) {
      if (/^H[2-4]$/.test(kids[i].tagName) && ++heads >= 2 && i >= 2) return i;
      if (i >= 4) return i;
    }
    return Math.min(kids.length, 4);
  }
  function buildLesson() {
    var main = d.getElementById("main"); if (!main) return;
    var topics = [].slice.call(main.querySelectorAll("details.topic")).filter(function (t) { return !t.closest("#qsets,.psec,.hmist"); });
    if (topics.length) {
      var first = topics[0], body = first.querySelector(".tbody") || first;
      var kids = [].slice.call(body.children), cut = Math.min(previewCut(kids), Math.max(2, kids.length - 1));
      if (kids.length > 2) markRest(kids, cut);
      first.classList.add("glk-pv"); first.open = true;
      body.appendChild(card("l"));
      topics.slice(1).forEach(function (t) { t.classList.add("glk-t"); });
    } else if (page === "3d.html") {
      var vs = main.querySelectorAll(".viewer");
      for (var j = 1; j < vs.length; j++) vs[j].classList.add("glk-v");
      if (vs[0]) vs[0].insertAdjacentElement("afterend", card("l"));
    } else {
      var prose = main.querySelector(".prose");
      if (!prose) return;
      var pk = [].slice.call(prose.children);
      markRest(pk, previewCut(pk));
      prose.appendChild(card("l"));
      var sib = prose.nextElementSibling;          // anything after the lesson text (not ads) is part of the lesson
      while (sib) { if (!sib.matches(".adx,.ad-slot,script,noscript")) sib.classList.add("glk-x"); sib = sib.nextElementSibling; }
    }
    if (page === "law.html" || page === "mgmt.html" || page === "quality.html" || page === "pharma.html") (page === "law.html" ? ["classquiz", "blanks"] : ["blanks"]).forEach(function (id) {
      var s = d.getElementById(id); if (s && !s.querySelector(".glk-card")) { var h = s.querySelector("h2"); (h || s).insertAdjacentElement(h ? "afterend" : "afterbegin", card("q")); }
    });
  }
  function buildTutor() {
    var main = d.getElementById("main"); if (!main) return;
    var lead = main.querySelector(".lead") || main.querySelector("h1");
    if (lead) lead.insertAdjacentElement("afterend", card("t"));
  }
  function buildQuiz() {
    var main = d.getElementById("main"); if (!main) return;
    var lead = main.querySelector(".lead") || main.querySelector("h1");
    if (lead) lead.insertAdjacentElement("afterend", card("q"));
  }
  // a locked topic can't be opened: it closes again and the lock card comes into view
  d.addEventListener("toggle", function (e) {
    var t = e.target;
    if (!html.classList.contains("gl-lock") || !t.classList || !t.classList.contains("glk-t") || !t.open) return;
    t.open = false;
    var c = d.querySelector("#main .glk-card");
    if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.remove("glk-ping"); void c.offsetWidth; c.classList.add("glk-ping"); }
  }, true);
  // the 🩸 blood-flow button and locked 3D models
  d.addEventListener("click", function (e) {
    if (!html.classList.contains("gl-lock") || !e.target.closest) return;
    if (e.target.closest(".flowbtn,.glk-v")) {
      e.preventDefault(); e.stopPropagation();
      var c = d.querySelector("#main .glk-card"); if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.remove("glk-ping"); void c.offsetWidth; c.classList.add("glk-ping"); }
    }
  }, true);

  function build() {
    if (built) return; built = true;
    try { if (LESSON[page]) buildLesson(); else if (QUIZ[page]) buildQuiz(); else if (TUTOR[page]) buildTutor(); } catch (x) { console.warn("nursin: gate", x && x.message); }
  }
  function apply() {
    var gated = !!(LESSON[page] || QUIZ[page] || TUTOR[page]), until = !signed && gated && !TUTOR[page] ? adUntil() : 0;   // the tutor has no ad unlock
    html.classList.toggle("gl-out", !signed);
    html.classList.toggle("gl-lock", !signed && gated && !until);
    clearTimeout(adTimer);
    if (until) adTimer = setTimeout(apply, Math.min(until - Date.now() + 500, 36e5 + 1000));   // the hour is up → locked again
    if (!signed && gated) {
      if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", build, { once: true }); else build();
    }
    if (signed !== lastSent) { lastSent = signed; try { d.dispatchEvent(new CustomEvent("nursin:gate", { detail: { signedIn: signed } })); } catch (x) {} }   // assets/tutor.js + goals.js listen
  }
  var lastSent = null;
  d.addEventListener("nursin:auth", function (e) { authKnown = true; signed = !!(e.detail && e.detail.signedIn); apply(); });
  d.addEventListener("nursin:me", function () { var me = w.Nursin && w.Nursin.me; if (me) signed = true; else if (!authKnown) signed = false; apply(); });
  apply();
  // signed-out on a locked page: load Firebase so the sign-in button is ready (and a stale local hint gets checked)
  if (!signed && (LESSON[page] || QUIZ[page] || TUTOR[page])) {
    var go = function () { if (w.Nursin && w.Nursin.loadFB) w.Nursin.loadFB(); };
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", go, { once: true }); else go();
  }
  w.NursinGate = { get signedIn() { return signed; }, get adUntil() { return adUntil(); }, LESSON: LESSON, QUIZ: QUIZ, TUTOR: TUTOR, previewCut: previewCut, AD_WAIT: AD_WAIT, AD_HOURS: AD_HOURS };
})(window, document);
