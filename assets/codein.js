/* 🔑 «رمز دخول» — Abdullah, Nov 5 2026 4:43 PM: his old iPhone 6 Plus (iOS 12, old Safari) cannot sign in with Google.
   1) a signed-in device: «أنا» (me.html #mecode) → «📲 افتح على جهاز تاني» → worker v14 POST /code/new with the Firebase ID token →
      a 6-digit code, 5 minutes, single use (Firestore loginCodes/{code}, written by the worker's service account — rules v22 unchanged:
      no client can read or write loginCodes) → shown big with a countdown.
   2) any sign-in screen: «🔑 عندي رمز دخول» beside every Google button (.gbtn) + on me.html signed out → 6 digits → worker POST /code/use
      (wrong codes limited: 5 per IP + 300 site-wide per 10 min) → a Firebase custom token for that uid → NursinFB.signInWithToken → same account.
   Before worker v14 is deployed (GET /code is not {code:true}) both say «حدّث ملف Cloudflare» and nothing breaks.
   Plain ES5 on purpose: it must run on iOS 12 Safari (no ?. / ?? / class fields here). */
(function (w, d) {
  var W = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev";
  var TTL = 300;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fb() { return w.NursinFB || null; }
  function user() { var A = fb(); return A && A.user ? A.user : null; }
  var OLD = T("⚠️ هالميزة بدّها تحديث: حدّث ملف Cloudflare (worker v14) وجرّب كمان مرّة.", "⚠️ Mise à jour nécessaire : mets à jour le fichier Cloudflare (worker v14), puis réessaie.");
  function NET() { return T("⚠️ في مشكلة بالإنترنت. تأكّد من الاتصال وجرّب كمان مرّة.", "⚠️ Problème de connexion. Vérifie Internet et réessaie."); }

  function req(path, body) {
    var o = { method: body ? "POST" : "GET" }, ac = null, tm = null;
    if (body) { o.headers = { "Content-Type": "application/json" }; o.body = JSON.stringify(body); }
    if (w.AbortController) { ac = new AbortController(); o.signal = ac.signal; tm = setTimeout(function () { ac.abort(); }, 20000); }
    return w.fetch(W + path, o).then(function (r) {
      if (tm) clearTimeout(tm);
      return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} return { st: r.status, j: j }; });
    });
  }
  // worker v14+ answers GET /code with {code:true}; v13 answers "ok" (text) → the «حدّث ملف Cloudflare» note, no POST at all
  var ready = null;
  function check() {
    if (!ready) ready = req("/code").then(function (x) { if (!(x.j && x.j.code === true)) { ready = null; return false; } return true; }, function (e) { ready = null; throw e; });
    return ready;
  }
  function waitFB(ms) {
    return new Promise(function (ok, no) {
      var N = w.Nursin, t0 = Date.now();
      if (!fb() && N && N.loadFB) N.loadFB();
      (function tick() {
        var A = fb();
        if (A && A.signInWithToken) return ok(A);
        if (Date.now() - t0 > ms) return no(new Error("fb"));
        setTimeout(tick, 200);
      })();
    });
  }

  /* ---- 2) «🔑 عندي رمز دخول»: the code entry sheet ---- */
  var box = null;
  function close() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }
  function open() {
    close();
    box = d.createElement("div"); box.className = "cdx"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div class="cdx-box"><button class="cdx-x" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button>' +
      '<h2>🔑 ' + esc(T("عندي رمز دخول", "J'ai un code de connexion")) + "</h2>" +
      '<p class="small">' + esc(T("على جهازك يلي مسجّل فيه: «👤 أنا» ← «📲 افتح على جهاز تاني». بيطلعلك رمز ٦ أرقام، اكتبو هون.", "Sur ton appareil déjà connecté : « 👤 Moi » → « 📲 Ouvrir sur un autre appareil ». Un code à 6 chiffres s'affiche : écris-le ici.")) + "</p>" +
      '<form class="cdx-f"><input class="cdx-in" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" dir="ltr" placeholder="••••••" aria-label="' + esc(T("الرمز", "Code")) + '">' +
      '<button class="btn pri cdx-go" type="submit">' + esc(T("فوت", "Entrer")) + "</button></form>" +
      '<p class="cdx-msg small" aria-live="polite"></p></div>';
    d.body.appendChild(box);
    var inp = box.querySelector(".cdx-in");
    try { inp.focus(); } catch (e) {}
    inp.addEventListener("input", function () { var v = inp.value.replace(/\D/g, "").slice(0, 6); if (v !== inp.value) inp.value = v; });
    box.querySelector(".cdx-f").addEventListener("submit", function (e) { e.preventDefault(); use(inp.value); });
    box.addEventListener("click", function (e) { if (e.target === box || (e.target.closest && e.target.closest(".cdx-x"))) close(); });
    return box;
  }
  function say(m, ok) { var el = box && box.querySelector(".cdx-msg"); if (el) { el.textContent = m; el.className = "cdx-msg small" + (ok ? " cdx-ok" : ""); } }
  var busy = false;
  function use(raw) {
    var c = String(raw || "").replace(/\D/g, "");
    if (c.length !== 6) { say(T("✍️ اكتب الـ ٦ أرقام.", "✍️ Écris les 6 chiffres.")); return Promise.resolve(false); }
    if (busy) return Promise.resolve(false);
    busy = true; say(T("⏳ عم نتأكّد…", "⏳ Vérification…"));
    var btn = box && box.querySelector(".cdx-go"); if (btn) btn.disabled = true;
    var done = function (v) { busy = false; if (btn) btn.disabled = false; return v; };
    return check().then(function (ok) {
      if (!ok) { say(OLD); return false; }
      return req("/code/use", { c: c }).then(function (x) {
        var j = x.j || {};
        if (x.st === 429) { say(T("⛔ جرّبت كتير. استنّى ١٠ دقايق وجرّب كمان مرّة.", "⛔ Trop d'essais. Attends 10 minutes puis réessaie.")); return false; }
        if (!j.token) { say(T("❌ الرمز غلط أو خلص وقتو. اعمل رمز جديد على جهازك التاني.", "❌ Code faux ou expiré. Crée un nouveau code sur ton autre appareil.") + (j.left >= 0 && j.left < 5 ? " " + T("(باقيلك " + j.left + " محاولات)", "(" + j.left + " essais restants)") : "")); return false; }
        say(T("⏳ عم نفوّتك…", "⏳ Connexion…"));
        return waitFB(25000).then(function (A) { return A.signInWithToken(j.token); }).then(function () {
          say(T("✅ فتت على حسابك!", "✅ Tu es connecté !"), true);
          setTimeout(close, 1200);
          return true;
        }, function (e) {
          say(e && e.message === "fb" ? T("⚠️ هالمتصفّح ما قدر يحمّل تسجيل الدخول. حدّث الصفحة وجرّب كمان مرّة.", "⚠️ Ce navigateur n'a pas pu charger la connexion. Recharge la page et réessaie.") : T("⚠️ ما زبط الدخول. اعمل رمز جديد وجرّب كمان مرّة.", "⚠️ La connexion a échoué. Crée un nouveau code et réessaie."));
          return false;
        });
      });
    }).then(done, function () { say(NET()); return done(false); });
  }

  /* ---- 1) «📲 افتح على جهاز تاني» (me.html #mecode) ---- */
  var timer = null, shown = null;
  function stop() { if (timer) clearInterval(timer); timer = null; }
  function mm(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function gen() {
    var el = d.getElementById("mecode"), u = user(); if (!el || !u) return Promise.resolve(false);
    var msg = el.querySelector(".cdx-gmsg"), btn = el.querySelector(".cdx-new");
    var put = function (m) { if (msg) msg.textContent = m; };
    if (btn) btn.disabled = true; put(T("⏳ عم نعمل رمز…", "⏳ Création du code…"));
    return check().then(function (ok) {
      if (!ok) { put(OLD); return false; }
      return u.getIdToken().then(function (t) { return req("/code/new", { t: t }); }).then(function (x) {
        var j = x.j || {};
        if (!/^\d{6}$/.test(String(j.code || ""))) { put(x.st === 429 ? T("⛔ عملت رموز كتير. استنّى شوي.", "⛔ Trop de codes. Attends un peu.") : T("⚠️ ما قدرنا نعمل رمز هلّق. جرّب بعد شوي.", "⚠️ Impossible de créer un code. Réessaie plus tard.")); return false; }
        shown = { code: String(j.code), end: Date.now() + (j.ttl > 0 ? j.ttl : TTL) * 1000 };
        paintCode(); stop(); timer = setInterval(paintCode, 1000);
        return true;
      });
    }).then(function (v) { if (btn) btn.disabled = false; return v; }, function () { if (btn) btn.disabled = false; put(NET()); return false; });
  }
  function paintCode() {
    var el = d.getElementById("mecode"), out = el && el.querySelector(".cdx-show"); if (!out || !shown) { stop(); return; }
    var left = Math.round((shown.end - Date.now()) / 1000);
    if (left <= 0) { stop(); shown = null; out.innerHTML = '<p class="small">' + esc(T("⌛ خلص وقت الرمز. اعمل واحد جديد.", "⌛ Le code a expiré. Crée-en un nouveau.")) + "</p>"; var m0 = el.querySelector(".cdx-gmsg"); if (m0) m0.textContent = ""; return; }
    out.innerHTML = '<p class="cdx-code" dir="ltr" aria-label="' + esc(shown.code.split("").join(" ")) + '">' + esc(shown.code.slice(0, 3)) + "<span></span>" + esc(shown.code.slice(3)) + "</p>" +
      '<p class="cdx-left small">⏳ ' + esc(T("باقي " + mm(left) + " · بيشتغل مرّة وحدة بس", "encore " + mm(left) + " · valable une seule fois")) + "</p>";
    var m = el.querySelector(".cdx-gmsg"); if (m) m.textContent = T("عالجهاز التاني: «🔑 عندي رمز دخول» واكتب هالرمز.", "Sur l'autre appareil : « 🔑 J'ai un code de connexion » et écris ce code.");
  }
  function panel() {
    var el = d.getElementById("mecode"); if (!el) return;
    var u = user(), k = u ? "in:" + u.uid : "out";
    if (el.getAttribute("data-k") === k && el.getAttribute("data-l") === String(FR())) return;
    el.setAttribute("data-k", k); el.setAttribute("data-l", String(FR()));
    if (u) {
      el.innerHTML = "<h2>📲 " + esc(T("افتح حسابك على جهاز تاني", "Ouvrir ton compte sur un autre appareil")) + "</h2>" +
        '<p class="small">' + esc(T("للتلفونات القديمة يلي ما بتقبل غوغل: بتاخد رمز ٦ أرقام (٥ دقايق، مرّة وحدة) وبتكتبو عالجهاز التاني ← بيفتح نفس حسابك.", "Pour les vieux téléphones où Google ne marche pas : un code à 6 chiffres (5 minutes, une seule fois) à écrire sur l'autre appareil → il ouvre ton compte.")) + "</p>" +
        '<p><button class="btn pri cdx-new" type="button">📲 ' + esc(T("افتح على جهاز تاني", "Ouvrir sur un autre appareil")) + "</button></p>" +
        '<div class="cdx-show"></div><p class="cdx-gmsg small" aria-live="polite"></p>';
      if (shown) { paintCode(); stop(); timer = setInterval(paintCode, 1000); }
    } else {
      stop();
      el.innerHTML = "<h2>🔑 " + esc(T("رمز دخول", "Code de connexion")) + "</h2>" +
        '<p class="small">' + esc(T("غوغل ما بيشتغل على هالتلفون؟ خود رمز من جهازك التاني يلي مسجّل فيه («👤 أنا» ← «📲 افتح على جهاز تاني»).", "Google ne marche pas sur ce téléphone ? Prends un code sur ton autre appareil connecté (« 👤 Moi » → « 📲 Ouvrir sur un autre appareil »).")) + "</p>" +
        '<p><button class="btn cdx-open" type="button" data-cdx>🔑 ' + esc(T("عندي رمز دخول", "J'ai un code de connexion")) + "</button></p>";
    }
  }
  /* beside every Google sign-in button (fb.js cards, gate.js locks, goals.js, nav.js welcome) */
  function inject() {
    var g = d.querySelectorAll(".gbtn:not([data-cdx])");
    for (var i = 0; i < g.length; i++) {
      g[i].setAttribute("data-cdx", "1");
      var b = d.createElement("button"); b.type = "button"; b.className = "btn cdx-open cdx-side"; b.setAttribute("data-cdx", "1");
      b.textContent = "🔑 " + T("عندي رمز دخول", "J'ai un code de connexion");
      g[i].parentNode.insertBefore(b, g[i].nextSibling);
    }
  }
  var q = null;
  function soon() { if (q) return; q = setTimeout(function () { q = null; inject(); panel(); }, 60); }
  d.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest(".cdx-open")) { e.preventDefault(); open(); }
    else if (t && t.closest && t.closest(".cdx-new")) { e.preventDefault(); gen(); }
  });
  ["nursin:auth", "nursin:me", "nursin:gate", "nursin:lang"].forEach(function (ev) { d.addEventListener(ev, soon); });
  function boot() {
    soon();
    if (w.MutationObserver && d.body) new MutationObserver(soon).observe(d.body, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
  w.NursinCode = { W: W, open: open, use: use, gen: gen, inject: inject, panel: panel, check: check, _reset: function () { ready = null; shown = null; stop(); close(); } };
})(window, document);
