/* nursin app mode (Oct 25 2026): service worker (/sw.js, push only, no caching), «📲 زيد عالشاشة الرئيسية» (Android prompt / iPhone sheet),
   and 🔔 notifications (window.NursinPWA.pushCard / .ping, used by chat.js and the account page; .enable/.state/.env used by the welcome card in assets/nav.js). One subscription per device
   covers both chat messages (worker /push) and the owner's 📢 news broadcasts (worker /broadcast, sent from admin.html). */
(function (w, d) {
  var VAPID = "BKksGwxUoWgG0qt1_sqcByK659uqSu8G9KL-mZxjdvb_3l419B547XUStchY5b91fDnprBrg14R_Iki49kTpOpo";
  var WORKER = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev";
  var FLAG = "nursin_push_on_v1", DEV = "nursin_push_dev_v1", OFF = "nursin_push_srv_off";
  var ua = navigator.userAgent || "";
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var standalone = (w.matchMedia && w.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  var swOk = "serviceWorker" in navigator && w.isSecureContext;
  var canPush = swOk && "PushManager" in w && "Notification" in w;
  var bip = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  if (swOk) w.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function (e) { console.warn("nursin: sw", e && e.message); }); });

  /* ---------- 📲 «حمّل التطبيق» (Oct 25 + Abdullah Oct 27 3:35 PM: a visible install button in ☰ + a small card on the home page,
     gone once installed / opened from the icon). Chrome / Edge / Android / desktop: beforeinstallprompt → one tap, the browser's own
     install. iPhone / iPad Safari has no install API → a short step sheet (Share ⬆️ → «إضافة إلى الشاشة الرئيسية» → إضافة); iPhone in
     another browser or an app's in-app browser → «open in Safari first». Only the steps for this device; French in Français seulement. */
  var inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|WhatsApp|GSA\/|TikTok/.test(ua);
  var iosSafari = ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|Brave/.test(ua) && !inApp;
  var INSTX = "nursin_inst_card_x";
  w.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); bip = e; showInstall(); });
  w.addEventListener("appinstalled", function () { bip = null; standalone = true; showInstall(); });
  function installable() { return !standalone && (!!bip || ios || android); }
  function kind() { return ios ? (iosSafari ? "ios-safari" : "ios-other") : android ? "android" : "desktop"; }
  function frOn() { return !!(w.Lang && w.Lang.fr); }
  function instText(k, fr) {                              // pure (tests run it): the button + the steps for one kind of device
    var T = fr ? { btn: "📲 Installer l'app", sub: "Nursin comme une vraie app", card: "Installe Nursin sur ton téléphone : il s'ouvre comme une app, plus vite, avec les notifications.", h: "📲 Installer Nursin", ok: "OK", x: "Masquer" }
      : { btn: "📲 حمّل التطبيق", sub: "Nursin متل التطبيق عالتلفون", card: "حمّل Nursin عتلفونك: بيفتح متل التطبيق، أسرع، ومعو إشعارات.", h: "📲 حمّل تطبيق Nursin", ok: "تمام", x: "خبّي" };
    var S = {
      "ios-safari": fr ? ["Touche le bouton Partager <b>⬆️</b> (en bas, au milieu de l'écran).", "Choisis <b>« Sur l'écran d'accueil »</b> <span dir=\"ltr\">(Add to Home Screen)</span>.", "Touche <b>« Ajouter »</b> en haut à droite. ✅"]
        : ["كبوس زر المشاركة <b>⬆️</b> (تحت بنص الشاشة).", "اختار <b>«إضافة إلى الشاشة الرئيسية»</b> <span dir=\"ltr\">(Add to Home Screen)</span>.", "كبوس <b>«إضافة»</b> فوق عاليمين. ✅"],
      "ios-other": fr ? ["Sur iPhone, l'installation marche seulement depuis <b>Safari</b>.", "Copie le lien <b dir=\"ltr\">nursin.store</b> et ouvre-le dans <b>Safari</b> 🧭.", "Puis : Partager <b>⬆️</b> → <b>« Sur l'écran d'accueil »</b> → <b>« Ajouter »</b>."]
        : ["عالآيفون التثبيت بيزبط بس من <b>Safari</b>.", "انسخ الرابط <b dir=\"ltr\">nursin.store</b> وافتحو بـ <b>Safari</b> 🧭.", "وبعدين: المشاركة <b>⬆️</b> ← <b>«إضافة إلى الشاشة الرئيسية»</b> ← <b>«إضافة»</b>."],
      android: fr ? ["Touche <b>⋮</b> en haut (menu du navigateur).", "Choisis <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.", "Confirme avec <b>« Installer »</b>. ✅"]
        : ["كبوس <b>⋮</b> فوق (قائمة المتصفح).", "اختار <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.", "أكّد بـ <b>«تثبيت»</b>. ✅"],
      desktop: fr ? ["Dans Chrome ou Edge : clique l'icône <b>⊕ Installer</b> au bout de la barre d'adresse.", "Ou menu <b>⋮</b> → <b>« Installer Nursin »</b>."]
        : ["بـ Chrome أو Edge: كبوس أيقونة <b>⊕ تثبيت</b> بآخر خانة العنوان.", "أو القائمة <b>⋮</b> ← <b>«تثبيت Nursin»</b>."]
    };
    T.steps = '<ol class="pwasteps">' + S[k].map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>";
    if (k === "ios-safari") T.steps += '<p class="small">' + (fr ? "🔔 Sur iPhone, les notifications marchent seulement depuis l'icône (iOS 16.4 ou plus récent)." : "🔔 عالآيفون الإشعارات بتشتغل بس من الأيقونة عالشاشة الرئيسية (iOS 16.4 أو أحدث).") + "</p>";
    return T;
  }
  function showInstall() { var b = d.querySelectorAll(".pwainst"); for (var i = 0; i < b.length; i++) b[i].hidden = !installable(); homeCard(); }
  function installBtn() { var t = instText(kind(), frOn()); return '<button class="btn pwainst" type="button" data-nofr' + (installable() ? "" : " hidden") + ">" + t.btn + "</button>"; }
  function sheet(html, ok) {
    var o = d.createElement("div"); o.className = "pwasheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("data-nofr", "");
    o.innerHTML = '<div class="pwabox">' + html + '<p><button class="btn pri pwaok" type="button">' + (ok || "تمام") + "</button></p></div>";
    o.addEventListener("click", function (e) { if (e.target === o || e.target.closest(".pwaok")) o.remove(); });
    d.body.appendChild(o); var b = o.querySelector(".pwaok"); if (b) b.focus();
  }
  function install() {
    if (bip) { var p = bip; bip = null; p.prompt(); (p.userChoice || Promise.resolve()).then(function (c) { if (c && c.outcome === "accepted") standalone = true; showInstall(); }); return; }
    var t = instText(kind(), frOn());
    sheet("<h2>" + t.h + "</h2>" + t.steps, t.ok);
  }
  // 🏠 the small card on the home page (✕ = hidden for this visit; gone for good once installed)
  function homeCard() {
    var pg = location.pathname.split("/").pop() || "index.html", c = d.getElementById("pwahome");
    if (pg !== "index.html" || !installable()) { if (c) c.remove(); return; }
    try { if (sessionStorage.getItem(INSTX)) return; } catch (e) {}
    var main = d.querySelector("main"); if (c || !main) return;
    var t = instText(kind(), frOn()); c = d.createElement("div");
    c.id = "pwahome"; c.className = "qcard pwahome"; c.setAttribute("data-nofr", "");
    c.innerHTML = '<button class="pnx" type="button" aria-label="' + esc(t.x) + '">✕</button><p>' + t.card + '</p><p class="fbtns"><button class="btn pri pwainst" type="button">' + t.btn + "</button></p>";
    var after = main.querySelector(".crumbs") || main.querySelector(".adx-top");
    if (after && after.parentNode === main) main.insertBefore(c, after.nextSibling); else main.insertBefore(c, main.firstChild);
    c.querySelector(".pnx").addEventListener("click", function () { try { sessionStorage.setItem(INSTX, "1"); } catch (e) {} c.remove(); });
  }
  d.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".pwainst")) install(); });
  function footer() {
    homeCard();
    var f = d.querySelector(".foot .wrap"); if (!f || f.querySelector(".pwainst")) return;
    var p = d.createElement("p"); p.className = "pwafoot"; p.innerHTML = installBtn(); f.insertBefore(p, f.firstChild);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", footer); else footer();

  /* ---------- 🔔 notifications ---------- */
  function key() { var s = VAPID.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function dev() { var x = ls(DEV); if (!x) { x = Math.random().toString(36).slice(2, 12); ls(DEV, x); } return x; }
  function getSub() { return navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }); }
  async function saveDevice(API, sealed) {               // pushSubs/{uid} = { d: { device: sealed subscription (≤ 5 devices) }, updatedAt }
    var f = API.fs, ref = f.doc(API.db, "pushSubs", API.user.uid), cur = {};
    try { var s = await f.getDoc(ref); if (s.exists()) cur = s.data().d || {}; } catch (e) { if (e && e.code === "permission-denied") throw e; }
    var dd = {}, ks = Object.keys(cur).filter(function (k) { return k !== dev(); }).slice(-4);
    ks.forEach(function (k) { dd[k] = cur[k]; });
    if (sealed) dd[dev()] = sealed;
    await f.setDoc(ref, { d: dd, updatedAt: f.serverTimestamp() });
  }
  async function enable(API) {
    var perm = await Notification.requestPermission();
    if (perm !== "granted") return perm;
    var r = await navigator.serviceWorker.ready;
    var sub = await r.pushManager.getSubscription() || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() });
    var t = await API.user.getIdToken();
    var res = await fetch(WORKER + "/push/seal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: t, sub: sub.toJSON() }) });
    var j = await res.json().catch(function () { return {}; });
    if (!j || !j.ok || !j.s) throw { soon: 1 };
    await saveDevice(API, j.s);
    ls(FLAG, API.user.uid); ls(EVER, API.user.uid);
    try { sessionStorage.removeItem(OFF); } catch (e) {}
    return "on";
  }
  async function disable(API) {
    ls(FLAG, null);
    try { var s = await getSub(); if (s) await s.unsubscribe(); } catch (e) {}
    try { await saveDevice(API, null); } catch (e) { console.warn("nursin: push off", e && e.code); }
  }
  async function state(API) {
    if (!canPush) return ios && !standalone ? "ios" : "none";
    if (Notification.permission === "denied") return "denied";
    var s = null; try { s = await getSub(); } catch (e) {}
    return s && Notification.permission === "granted" && ls(FLAG) === API.user.uid ? "on" : "off";
  }
  async function pushCard(el, API) {
    if (!el || !API || !API.user) return;
    var st = await state(API), msg = arguments[2] || "", h = '<h2>🔔 الإشعارات: رسائل + أخبار</h2>';
    if (st === "ios") h += '<p>عالآيفون: زيد Nursin عالشاشة الرئيسية وافتحو من الأيقونة، بعدين بتقدر تفعّل الإشعارات هون.</p><p class="fbtns">' + installBtn().replace(" hidden", "") + "</p>";
    else if (st === "none") h += '<p class="small">هالمتصفح ما بيدعم الإشعارات. جرّب Chrome عالأندرويد، أو Safari عالآيفون (من الشاشة الرئيسية).</p>';
    else if (st === "denied") h += '<p>🔕 الإشعارات مسكّرة لـ Nursin. فتّحها من إعدادات التلفون/المتصفح (الإشعارات ← Nursin)، ورجاع لهون.</p>';
    else if (st === "on") h += '<p>✅ شغّالة على هالجهاز: بيطلعلك إشعار بس حدا يبعتلك رسالة، وبس ينزل درس جديد أو تحديث عالموقع، حتى لو الموقع مسكّر.</p><p class="fbtns"><button class="btn sm pushoff" type="button">🔕 وقّف الإشعارات</button></p>';
    else h += '<p>بيطلعلك إشعار عالتلفون بس حدا يبعتلك رسالة (لحالك أو بمجموعة)، وبس ينزل درس أو مادة جديدة عالموقع، حتى لو الموقع مسكّر.</p><p class="fbtns"><button class="btn pri pushon" type="button">🔔 فعّل الإشعارات</button>' + (installable() ? " " + installBtn() : "") + "</p>";
    el.innerHTML = '<div class="qcard pushcard">' + h + '<p class="small pushmsg" aria-live="polite">' + esc(msg) + "</p></div>";
    var on = el.querySelector(".pushon"), off = el.querySelector(".pushoff");
    if (on) on.addEventListener("click", async function () {
      on.disabled = true; var m = "";
      try { var r = await enable(API); if (r === "default") m = "ما وافقت عالإشعارات. كبوس مرّة تانية لمّا تكون جاهز."; }
      catch (e) { m = "🔔 الإشعارات عم تتجهّز، جرّب بعد شوي."; if (!(e && (e.soon || e.code === "permission-denied"))) console.warn("nursin: push on", e && (e.code || e.message)); }
      pushCard(el, API, m);
    });
    if (off) off.addEventListener("click", async function () { off.disabled = true; await disable(API); pushCard(el, API, "🔕 وقّفناها على هالجهاز."); });
  }
  function ping(API, cid) {                               // after sending a message: ask the worker to notify the others (fire and forget)
    try { if (sessionStorage.getItem(OFF) === "1") return; } catch (e) {}
    if (!API || !API.user) return;
    API.user.getIdToken().then(function (t) {
      return fetch(WORKER + "/push", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: t, c: cid }) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.ok === undefined) { try { sessionStorage.setItem(OFF, "1"); } catch (e) {} }   // the worker isn't updated yet
    }).catch(function () {});
  }
  /* The old one-line 🔔 strip on the home page (Oct 25) is gone: the welcome card in assets/nav.js asks once per device instead,
     using enable()/state() below, and «🔔 الإشعارات» lives in the ☰ menu. */

  /* 🔔 «فعّل الإشعارات» reminder (Abdullah, Oct 27 2:50 PM): a signed-in student without notifications on this device sees a small
     friendly card on each visit (never inside quizzes / games / chats; ✕ hides it for this visit only) until he turns them on — after
     that (permission granted + subscription saved) it never asks again. Permission «denied»: short how-to steps instead of a button
     that can't work; iPhone outside the home-screen app: "add to home screen first". */
  var NAGX = "nursin_pushnag_x", EVER = "nursin_push_ever_v1";
  var NAG_SKIP = { "quiz.html": 1, "games.html": 1, "chat.html": 1, "live.html": 1, "exams.html": 1, "admin.html": 1 };
  function nagText(st) {
    var fr = !!(w.Lang && w.Lang.fr);
    var T = fr ? { h: "🔔 Active les notifications", off: "Un message d'un ami, une nouvelle leçon ou ton objectif du jour : on te prévient, même site fermé.", btn: "🔔 Activer les notifications",
        den: "Les notifications sont bloquées pour Nursin. Pour les autoriser :", a: "Android / ordinateur : touche le cadenas 🔒 à côté de l'adresse → Notifications → Autoriser, puis recharge la page.", i: "iPhone : Réglages → Notifications → Nursin → Autoriser.",
        ios: "Sur iPhone : ajoute d'abord Nursin à l'écran d'accueil (bouton Partager ⬆️ → « Sur l'écran d'accueil »), ouvre-le depuis l'icône, puis active les notifications.", x: "Masquer pour cette visite", ok: "✅ Notifications activées !", later: "Tu n'as pas accepté. Réessaie quand tu veux.", soon: "🔔 Les notifications se préparent, réessaie dans un moment." }
      : { h: "🔔 فعّل الإشعارات", off: "رسالة من صاحبك، درس جديد، أو هدفك اليوم: منخبّرك حتى لو الموقع مسكّر.", btn: "🔔 فعّل الإشعارات",
        den: "الإشعارات مسكّرة لـ Nursin. تا تفتحها:", a: "أندرويد / كمبيوتر: كبوس عالقفل 🔒 حدّ العنوان ← الإشعارات (Notifications) ← سماح (Allow)، وبعدين حدّث الصفحة.", i: "آيفون: الإعدادات ← الإشعارات ← Nursin ← سماح.",
        ios: "عالآيفون: أوّل شي زيد Nursin عالشاشة الرئيسية (زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية»)، افتحو من الأيقونة، وبعدين فعّل الإشعارات.", x: "خبّي هلّق", ok: "✅ تفعّلت الإشعارات!", later: "ما وافقت. جرّب كمان مرّة لمّا تكون جاهز.", soon: "🔔 الإشعارات عم تتجهّز، جرّب بعد شوي." };
    if (st === "denied") return { T: T, body: "<p>" + T.den + "</p><ul class=\"pnsteps\"><li>" + T.a + "</li><li>" + T.i + "</li></ul>" };
    if (st === "ios") return { T: T, body: "<p>" + T.ios + "</p>" };
    return { T: T, body: "<p>" + T.off + '</p><p class="fbtns"><button class="btn pri pnon" type="button">' + T.btn + "</button></p>" };
  }
  async function nag(API) {
    var pg = location.pathname.split("/").pop() || "index.html";
    if (NAG_SKIP[pg] || !API || !API.user || d.getElementById("pushnag")) return;
    try { if (sessionStorage.getItem(NAGX)) return; } catch (e) {}
    if (ls(EVER) === API.user.uid) return;                              // he turned them on once → never nag again
    var st = await state(API);
    if (st === "on") { ls(EVER, API.user.uid); return; }
    if (st === "none") return;                                          // this browser can't do push at all
    var main = d.querySelector("main"); if (!main || d.getElementById("pushnag") || d.querySelector(".obx")) return;   // the 👋 welcome card asks first
    var t = nagText(st), box = d.createElement("div");
    box.id = "pushnag"; box.className = "qcard pushnag"; box.setAttribute("data-nofr", ""); box.setAttribute("role", "status");
    box.innerHTML = '<button class="pnx" type="button" aria-label="' + esc(t.T.x) + '" title="' + esc(t.T.x) + '">✕</button><b>' + t.T.h + "</b>" + t.body + '<p class="small pnmsg" aria-live="polite"></p>';
    var after = main.querySelector(".crumbs") || main.querySelector(".adx-top");
    if (after && after.parentNode === main) main.insertBefore(box, after.nextSibling); else main.insertBefore(box, main.firstChild);
    box.querySelector(".pnx").addEventListener("click", function () { try { sessionStorage.setItem(NAGX, "1"); } catch (e) {} box.remove(); });
    var on = box.querySelector(".pnon");
    if (on) on.addEventListener("click", async function () {
      on.disabled = true; var m = box.querySelector(".pnmsg");
      try { var r = await enable(API); if (r === "on") { ls(EVER, API.user.uid); box.innerHTML = "<b>" + t.T.ok + "</b>"; setTimeout(function () { box.remove(); }, 2500); return; } m.textContent = r === "denied" ? "" : t.T.later; if (r === "denied") { box.remove(); nag(API); return; } }
      catch (e) { m.textContent = t.T.soon; if (!(e && (e.soon || e.code === "permission-denied"))) console.warn("nursin: push on", e && (e.code || e.message)); }
      on.disabled = false;
    });
  }
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) setTimeout(function () { nag(w.NursinFB); }, 2500); });
  function env() { return { ios: ios, android: android, standalone: standalone, canPush: canPush, perm: canPush ? Notification.permission : "none", on: !!ls(FLAG) }; }
  w.NursinPWA = { nag: nag, nagText: nagText, instText: instText, kind: kind, pushCard: pushCard, ping: ping, install: install, installable: installable, enable: enable, state: state, env: env };
})(window, document);
