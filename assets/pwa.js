/* nursin app mode (Oct 25 2026): service worker (/sw.js, push only, no caching), «📲 زيد عالشاشة الرئيسية» (Android prompt / iPhone sheet),
   and 🔔 chat notifications (window.NursinPWA.pushCard / .ping, used by chat.js and the account page). Sending goes through the tutor worker's /push. */
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

  /* ---------- 📲 add to home screen ---------- */
  w.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); bip = e; showInstall(); });
  w.addEventListener("appinstalled", function () { bip = null; standalone = true; showInstall(); });
  function installable() { return !standalone && (!!bip || ios || android); }
  function showInstall() { var b = d.querySelectorAll(".pwainst"); for (var i = 0; i < b.length; i++) b[i].hidden = !installable(); }
  function installBtn() { return '<button class="btn pwainst" type="button"' + (installable() ? "" : " hidden") + ">📲 زيد عالشاشة الرئيسية</button>"; }
  function sheet(html) {
    var o = d.createElement("div"); o.className = "pwasheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    o.innerHTML = '<div class="pwabox">' + html + '<p><button class="btn pri pwaok" type="button">تمام</button></p></div>';
    o.addEventListener("click", function (e) { if (e.target === o || e.target.closest(".pwaok")) o.remove(); });
    d.body.appendChild(o); var b = o.querySelector(".pwaok"); if (b) b.focus();
  }
  function install() {
    if (bip) { var p = bip; bip = null; p.prompt(); (p.userChoice || Promise.resolve()).then(function () { showInstall(); }); return; }
    if (ios) return sheet('<h2>📲 زيد Nursin عالشاشة الرئيسية</h2><ol><li>افتح الموقع بـ <b>Safari</b>.</li><li>كبوس زر المشاركة <b>⬆️</b> (تحت بنص الشاشة).</li><li>اختار <b>«إضافة إلى الشاشة الرئيسية»</b> <span dir="ltr">(Add to Home Screen)</span>، وبعدين <b>«إضافة»</b>.</li></ol>' +
      '<p class="small">🔔 عالآيفون الإشعارات بتشتغل <b>بس من الأيقونة</b> عالشاشة الرئيسية، وبدّها iOS 16.4 أو أحدث. افتح Nursin من الأيقونة، فوت عالمحادثات وكبوس «🔔 فعّل الإشعارات».</p>');
    sheet('<h2>📲 زيد Nursin عالشاشة الرئيسية</h2><ol><li>كبوس <b>⋮</b> فوق (قائمة المتصفح).</li><li>اختار <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.</li></ol>');
  }
  d.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".pwainst")) install(); });
  function footer() {
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
    ls(FLAG, API.user.uid);
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
    var st = await state(API), msg = arguments[2] || "", h = '<h2>🔔 إشعارات الرسائل</h2>';
    if (st === "ios") h += '<p>عالآيفون: زيد Nursin عالشاشة الرئيسية وافتحو من الأيقونة، بعدين بتقدر تفعّل الإشعارات هون.</p><p class="fbtns">' + installBtn().replace(" hidden", "") + "</p>";
    else if (st === "none") h += '<p class="small">هالمتصفح ما بيدعم الإشعارات. جرّب Chrome عالأندرويد، أو Safari عالآيفون (من الشاشة الرئيسية).</p>';
    else if (st === "denied") h += '<p>🔕 الإشعارات مسكّرة لـ Nursin. فتّحها من إعدادات التلفون/المتصفح (الإشعارات ← Nursin)، ورجاع لهون.</p>';
    else if (st === "on") h += '<p>✅ شغّالة على هالجهاز: بس حدا يبعتلك رسالة بيطلعلك إشعار، حتى لو الموقع مسكّر.</p><p class="fbtns"><button class="btn sm pushoff" type="button">🔕 وقّف الإشعارات</button></p>';
    else h += '<p>بس حدا يبعتلك رسالة (لحالك أو بمجموعة) بيطلعلك إشعار عالتلفون، حتى لو الموقع مسكّر.</p><p class="fbtns"><button class="btn pri pushon" type="button">🔔 فعّل الإشعارات</button>' + (installable() ? " " + installBtn() : "") + "</p>";
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
  w.NursinPWA = { pushCard: pushCard, ping: ping, install: install, installable: installable };
})(window, document);
