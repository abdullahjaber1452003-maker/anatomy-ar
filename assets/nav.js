/* nursin 🧭 navigation + 👋 welcome (Oct 26 2026, Abdullah: "the site got crowded" + "ask first-time visitors to sign in with Google and turn on notifications").
   1) Five groups instead of eleven links: 🏠 الرئيسية · 📚 المواد · 📝 التمارين · 👥 أصحابي · 🤖 الأستاذ.
      Phones: a bottom tab bar; a group tab opens a small sheet with its pages. Desktop: the same row under the header, groups open a dropdown.
      ☰ opens «المزيد» (about, privacy, credits, 📲 install, 🔔 notifications, and the admin page for the owner only).
      The static <nav id="nav"> stays in every page's HTML (no-JS + search engines) and is only hidden once this script runs.
   2) «▶️ كمّل من وين وقفت» on the home page: the last lesson page / opened topic, kept in this browser only.
   3) The welcome card, after the splash, once per device: step 1 «سجّل دخول بغوغل», step 2 «🔔 فعّل الإشعارات»
      (iPhone outside the home-screen app: the «📲 زيد عالشاشة الرئيسية» steps first). Each step has «بعدين». A small card at the bottom,
      never a full-screen wall and never an ad inside it. Signed-out visitors are asked again at most every 4 days (6 times max);
      signed-in visitors without notifications every 7 days (4 times max); signed in with notifications on, denied or unsupported: never. */
(function (w, d) {
  var OWNER = "abdullahjaber1452003@gmail.com";
  var LAST = "nursin_last_v1", OB = "nursin_onboard_v1", CC = "nursin_classcode_v1";
  var DAY = 864e5, OUT_GAP = 4 * DAY, OUT_MAX = 6, IN_GAP = 7 * DAY, IN_MAX = 4;
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!/\.html$/.test(page)) page = "index.html";
  var G = [
    { k: "home", e: "🏠", n: "الرئيسية", href: "index.html", pages: ["index.html"] },
    { k: "learn", e: "📚", n: "المواد", pages: ["cardio.html", "neuro.html", "henderson.html", "law.html", "mgmt.html", "quality.html", "pharma.html", "3d.html"], items: [
      ["cardio.html", "❤️", "القلب", "12 درس: الجلطة، ECG، القصور، الصدمة"],
      ["neuro.html", "🧠", "الأعصاب", "8 دروس: AVC، HTIC، Glasgow"],
      ["henderson.html", "📋", "Henderson", "الحاجات الـ ١٤ بالاسم مع NANDA"],
      ["law.html", "⚖️", "القانون التطبيقي", "الممرض المتخصص، الفني، المساعد + إذن المزاولة"],
      ["mgmt.html", "🏢", "الإدارة", "الدوافع، هرم Maslow، الهيكل التنظيمي للمستشفى"],
      ["quality.html", "✅", "الجودة والاعتماد", "9 دروس: مفاهيم الجودة، PDCA، المؤشرات، الاعتماد، الملف الطبي"],
      ["pharma.html", "💊", "الأدوية", "55 دوا (TS2): العائلة، الدواعي، الموانع، المتابعة + بحث"],
      ["3d.html", "🧊", "المجسّمات 3D + الدورة الدموية", "قلب، دماغ، عمود قطني، مسار الدم"]] },
    { k: "practice", e: "📝", n: "التمارين", pages: ["quiz.html", "exams.html", "live.html", "games.html"], items: [
      ["quiz.html", "📝", "الكويز", "244 سؤال بأسلوب الامتحان مع الشرح"],
      ["quiz.html#weak", "🎯", "نقاط ضعفك", "كويز من الأسئلة يلي غلطت فيها"],
      ["games.html", "🎮", "ألعاب", "وصّل، صح ولا غلط بـ ٦٠ ثانية، لعبة الذاكرة"],
      ["quiz.html#blanks", "✍️", "عبّي الفراغ", "كمّل الكلمة الناقصة بكل المواد: اختيار أو كتابة"],
      ["law.html#classquiz", "⚖️", "كويز متل الصف (القانون)", "سؤال مفتوح، بتكتب، وبتشوف النقاط"],
      ["exams.html", "📅", "امتحانات الأسبوع", "مادّتين كل يوم + أوائل الشهر"],
      ["classes.html#cdq", "❓", "سؤال اليوم بصفّك", "نفس السؤال لكل الصف"],
      ["live.html", "🔴", "تحدّي لايف", "إنت وصاحبك بنفس الوقت"]] },
    { k: "friends", e: "👥", n: "أصحابي", pages: ["friends.html", "chat.html", "classes.html"], items: [
      ["friends.html", "🏆", "أصحابي والليفل", "نقاطك، الترتيب، التحدّيات"],
      ["chat.html", "💬", "المحادثات", "رسائل لحالك أو بمجموعة"],
      ["classes.html", "🏫", "صفّي", "الصف، الترتيب، امتحان الصف"]] },
    { k: "tutor", e: "👨‍🏫", n: "أستاذ عثمان", href: "tutor.html", pages: ["tutor.html"] }
  ];
  var LESSON = { "cardio.html": "❤️ القلب", "neuro.html": "🧠 الأعصاب", "henderson.html": "📋 Henderson", "law.html": "⚖️ القانون", "mgmt.html": "🏢 الإدارة", "quality.html": "✅ الجودة والاعتماد", "pharma.html": "💊 الأدوية", "3d.html": "🧊 المجسّمات 3D" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function groupOf(p) { for (var i = 0; i < G.length; i++) if (G[i].pages.indexOf(p) > -1) return G[i]; return null; }
  function desk() { return w.matchMedia ? w.matchMedia("(min-width: 860px)").matches : false; }

  /* ---------------- 1) navigation ---------------- */
  var bar = null, sheet = null, scrim = null, openKey = null, opener = null;
  function closeSheet() {
    if (sheet) sheet.remove(); if (scrim) scrim.remove(); sheet = scrim = null;
    var o = d.querySelectorAll(".gt.open,.menu-btn.open"); for (var i = 0; i < o.length; i++) { o[i].classList.remove("open"); o[i].setAttribute("aria-expanded", "false"); }
    var back = opener; openKey = null; opener = null; return back;
  }
  function row(it) {
    var href = it[0], here = href.split("#")[0] === page && href.indexOf("#") < 0;
    return '<a class="gi" href="' + href + '"' + (here ? ' aria-current="page"' : "") + '><span class="gie" aria-hidden="true">' + it[1] + '</span><span class="git"><b>' + esc(it[2]) + "</b>" + (it[3] ? "<small>" + esc(it[3]) + "</small>" : "") + "</span></a>";
  }
  function owner() { var A = w.NursinFB, u = A && A.user; return !!(u && u.email === OWNER && u.emailVerified); }
  function moreItems() {
    var P = w.NursinPWA, a = [];
    if (P && P.installable && P.installable()) a.push('<button class="gi pwainst" type="button"><span class="gie" aria-hidden="true">📲</span><span class="git"><b>زيد عالشاشة الرئيسية</b><small>Nursin متل التطبيق</small></span></button>');
    a.push(row(["friends.html#fpush", "🔔", "الإشعارات", "رسائل أصحابك + الدروس الجديدة"]));
    a.push(langRow(), osmRow());
    a.push(row(["about.html", "ℹ️", "من نحن", ""]), row(["privacy.html", "🔒", "سياسة الخصوصية", ""]), row(["credits.html", "📚", "المصادر والتراخيص", ""]));
    if (owner()) a.push(row(["admin" + ".html", "🛠", "لوحة الإدارة", "إعلانات + إشعار للكل"]));
    return a.join("");
  }
  // 👨‍🏫 «تعليقات الأستاذ عثمان» switch (assets/osman.js, localStorage nursin_osman_v1, default on)
  function osmOn() { try { return localStorage.getItem("nursin_osman_v1") !== "0"; } catch (e) { return true; } }
  function osmRow() {
    var O = w.OSMAN || {}, t = function (o, f) { return (o && o.ar) || f; }, on = osmOn();
    return '<button class="gi osmsw" type="button" role="switch" aria-checked="' + on + '"><span class="gie" aria-hidden="true">👨‍🏫</span><span class="git"><b>' + esc(t(O.toggle, "تعليقات الأستاذ عثمان")) + "</b><small>" + esc(t(O.toggle && O.toggle.sub, "")) + '</small></span><span class="osk" aria-hidden="true">' + esc(on ? t(O.onTxt, "شغّالة") : t(O.offTxt, "موقّفة")) + "</span></button>";
  }
  // 🇫🇷 «اللغة / Langue»: how this student studies (assets/lang.js, localStorage nursin_lang_v1; reloads the page in the new mode).
  // Both labels stay as written in both modes (data-nofr) so a student can always find his way back.
  function langPick() {
    var fr = !!(w.Lang && w.Lang.fr);
    return '<div class="oblang" data-nofr role="radiogroup" aria-label="كيف بدك تدرس؟ · Comment veux-tu étudier ?"><small>' + (fr ? "Comment veux-tu étudier ?" : "كيف بدك تدرس؟") + '</small><span class="lgo"><button type="button" class="lgb" dir="auto" role="radio" data-lang="ar" aria-checked="' + !fr + '">🇫🇷+🇱🇧 فرنسي وعربي</button>' +
      '<button type="button" class="lgb" dir="ltr" role="radio" data-lang="fr" lang="fr" aria-checked="' + fr + '">🇫🇷 Français seulement</button></span></div>';
  }
  function langRow() {
    var fr = !!(w.Lang && w.Lang.fr);
    return '<div class="gi langsw" data-nofr role="radiogroup" aria-label="اللغة · Langue"><span class="gie" aria-hidden="true">🌐</span><span class="git"><b>' + (fr ? "Langue d'étude" : "لغة الدراسة") + "</b>" +
      '<span class="lgo"><button type="button" class="lgb" dir="auto" role="radio" data-lang="ar" aria-checked="' + !fr + '">🇫🇷+🇱🇧 فرنسي وعربي</button>' +
      '<button type="button" class="lgb" dir="ltr" role="radio" data-lang="fr" lang="fr" aria-checked="' + fr + '">🇫🇷 Français seulement</button></span></span></div>';
  }
  function osmFlip(b) {
    var on = !osmOn();
    if (w.Osman) w.Osman.set(on); else { try { localStorage.setItem("nursin_osman_v1", on ? "1" : "0"); } catch (e) {} }
    b.outerHTML = osmRow();
  }
  function openSheet(key, btn) {
    var again = openKey === key; closeSheet(); if (again) return;
    var g = null; for (var i = 0; i < G.length; i++) if (G[i].k === key) g = G[i];
    var title = g ? g.e + " " + g.n : "☰ المزيد", body = g ? g.items.map(row).join("") : moreItems();
    scrim = d.createElement("div"); scrim.className = "gscrim"; scrim.addEventListener("click", closeSheet);
    sheet = d.createElement("div"); sheet.className = "gsheet"; sheet.id = "gsheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", title.replace(/^\S+\s/, ""));
    sheet.innerHTML = '<div class="gsh"><b>' + esc(title) + '</b><button class="gx" type="button" aria-label="سكّر">✕</button></div><nav class="gil">' + body + "</nav>";
    sheet.querySelector(".gx").addEventListener("click", function () { var b = closeSheet(); if (b) b.focus(); });
    sheet.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a.gi"); if (a) closeSheet(); var o = e.target.closest && e.target.closest(".osmsw"); if (o) osmFlip(o); var lg = e.target.closest && e.target.closest(".lgb"); if (lg && w.Lang && lg.getAttribute("aria-checked") !== "true") w.Lang.set(lg.getAttribute("data-lang")); });
    d.body.appendChild(scrim); d.body.appendChild(sheet);
    if (desk() && btn) {                                   // dropdown under the clicked item (RTL: align its right edge)
      var r = btn.getBoundingClientRect(), wd = Math.min(360, innerWidth - 24);
      sheet.style.top = Math.round(r.bottom + 6) + "px";
      sheet.style.left = Math.round(Math.max(12, Math.min(innerWidth - wd - 12, r.right - wd))) + "px";
      sheet.style.width = wd + "px";
    }
    openKey = key; opener = btn || null;
    if (btn) { btn.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    var f = sheet.querySelector(".gi"); if (f && !desk()) { try { f.focus({ preventScroll: true }); } catch (e) {} } else if (f) f.focus();
  }
  function buildNav() {
    var top = d.querySelector(".topbar"); if (!top || d.querySelector(".gnav")) return;
    d.documentElement.classList.add("jsnav");
    var cur = groupOf(page), h = '<ul class="gul">';
    G.forEach(function (g) {
      var on = cur && cur.k === g.k ? ' aria-current="page"' : "";
      if (g.href) h += '<li><a class="gt" href="' + g.href + '"' + on + '><span class="ge" aria-hidden="true">' + g.e + '</span><span class="gn">' + g.n + "</span></a></li>";
      else h += '<li><button class="gt" type="button" data-g="' + g.k + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="gsheet"' + on + '><span class="ge" aria-hidden="true">' + g.e + '</span><span class="gn">' + g.n + '</span><span class="gcar" aria-hidden="true"></span></button></li>';
    });
    bar = d.createElement("nav"); bar.className = "gnav"; bar.setAttribute("aria-label", "الأقسام"); bar.innerHTML = h + "</ul>";
    top.appendChild(bar);
    bar.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("button.gt"); if (b) openSheet(b.getAttribute("data-g"), b); });
    var mb = d.querySelector(".topbar .menu-btn");
    if (mb) {                                              // ☰ = «المزيد» (drops app.js's old toggle of #nav)
      var nb = mb.cloneNode(true); nb.setAttribute("aria-controls", "gsheet"); nb.setAttribute("aria-haspopup", "dialog"); nb.setAttribute("aria-label", "المزيد"); nb.setAttribute("aria-expanded", "false");
      mb.parentNode.replaceChild(nb, mb);
      nb.addEventListener("click", function () { openSheet("more", nb); });
    }
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet) { var b = closeSheet(); if (b) b.focus(); } });
    w.addEventListener("resize", function () { if (sheet && desk()) closeSheet(); });
  }

  /* ---------------- 2) ▶️ continue where you stopped ---------------- */
  function remember() {
    if (!LESSON[page]) return;
    var prev = lsGet(LAST) || {};
    var keep = prev.p === page ? prev : {};
    lsSet(LAST, { p: page, h: keep.h || "", t: keep.t || "", at: Date.now() });
    d.addEventListener("toggle", function (e) {
      var el = e.target; if (!el || el.tagName !== "DETAILS" || !el.open || !el.id) return;
      var s = el.querySelector("summary"), s2 = s && (s.querySelector(".t b") || s.querySelector("b") || s), t = s2 ? s2.textContent.replace(/\s+/g, " ").replace(/▾/g, "").trim().slice(0, 70) : "";
      lsSet(LAST, { p: page, h: el.id, t: t, at: Date.now() });
    }, true);
  }
  function continueCard() {
    var box = d.getElementById("homecont"); if (!box) return;
    var l = lsGet(LAST); if (!l || !LESSON[l.p] || Date.now() - (l.at || 0) > 60 * DAY) return;
    var href = l.p + (l.h && /^[\w-]+$/.test(l.h) ? "#" + l.h : "");
    box.innerHTML = '<a class="hcont" href="' + href + '"><span class="hci" aria-hidden="true">▶️</span><span><small>كمّل من وين وقفت</small><b>' + esc(LESSON[l.p]) + (l.t ? " — " + esc(l.t) : "") + "</b></span></a>";
    box.hidden = false;
  }

  /* ---------------- 3) 👋 welcome card ---------------- */
  var OB_PAGES = ["index.html", "cardio.html", "neuro.html", "henderson.html", "law.html", "mgmt.html", "quality.html", "pharma.html", "3d.html", "quiz.html", "exams.html", "live.html", "classes.html", "tutor.html", "games.html"];
  var GSVG = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  var card = null;
  function signedIn() { var A = w.NursinFB; if (A && A.user !== undefined && w.__nursinAuthSeen) return !!A.user; return !!(w.Nursin && w.Nursin.me); }
  d.addEventListener("nursin:auth", function () { w.__nursinAuthSeen = true; });
  function pushNeed() {                                   // what step 2 would be on this device: "push" | "ios" | null
    var P = w.NursinPWA; if (!P || !P.env) return null;
    var e = P.env();
    if (e.ios && !e.standalone) return "ios";
    if (!e.canPush || e.perm === "denied") return null;
    if (e.perm === "granted" && e.on) return null;
    return "push";
  }
  function due() {
    var s = lsGet(OB) || {}, now = Date.now();
    if (s.p === 2 && signedIn() && pushNeed()) return 2;              // came back from the Google redirect
    if (!signedIn()) return (!s.t || (now - s.t > OUT_GAP && (s.n | 0) < OUT_MAX)) ? 1 : 0;
    if (!pushNeed()) return 0;
    return (!s.t || (now - (s.t2 || s.t) > IN_GAP && (s.n2 | 0) < IN_MAX)) ? 2 : 0;
  }
  function mark(step, extra) {
    var s = lsGet(OB) || {}, now = Date.now();
    if (step === 1) { s.t = now; s.n = (s.n | 0) + 1; } else { s.t = s.t || now; s.t2 = now; s.n2 = (s.n2 | 0) + 1; }
    delete s.p; if (extra) for (var k in extra) s[k] = extra[k];
    lsSet(OB, s);
  }
  function closeCard() { if (card) { card.classList.add("obout"); var c = card; card = null; setTimeout(function () { c.remove(); }, 250); } }
  function shell(step, total, html) {
    if (card) card.remove();
    card = d.createElement("div"); card.className = "obx"; card.setAttribute("role", "dialog"); card.setAttribute("aria-labelledby", "obt");
    card.innerHTML = (total > 1 ? '<p class="obstep" aria-label="خطوة ' + step + " من " + total + '"><i class="' + (step >= 1 ? "on" : "") + '"></i><i class="' + (step >= 2 ? "on" : "") + '"></i></p>' : "") + html + '<p class="obmsg small" aria-live="polite"></p>';
    d.body.appendChild(card);
    var later = card.querySelector(".oblater"); if (later) later.addEventListener("click", function () { mark(step); closeCard(); });
    return card;
  }
  function say(m) { var el = card && card.querySelector(".obmsg"); if (el) el.textContent = m; }
  function waitFB(ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() { if (w.NursinFB && w.NursinFB.signIn) return res(w.NursinFB); if (Date.now() - t0 > ms) return res(null); setTimeout(tick, 100); })();
    });
  }
  function waitUser(ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function tick() { var A = w.NursinFB; if (A && A.user) return res(A); if (Date.now() - t0 > ms) return res(null); setTimeout(tick, 150); })();
    });
  }
  function step1(total) {
    if (w.Nursin && w.Nursin.loadFB) w.Nursin.loadFB();               // Firebase starts loading now, so the tap opens Google's window right away
    var c = shell(1, total, '<h2 id="obt">👋 أهلا فيك بـ Nursin!</h2><p>سجّل دخول بغوغل تا تنحفظ نقاطك وتطلع بالليفل، وتحكي مع أصحابك وصفّك.</p>' +
      langPick() +
      '<div class="obbtns"><button class="gbtn obgo" type="button">' + GSVG + '<span>سجّل دخول بغوغل</span></button><button class="oblater" type="button">بعدين</button></div>' +
      '<p class="small obnote">الدروس كاملة والكويزات بتفتح بس تسجّل. <a href="privacy.html">الخصوصية</a></p>');
    c.addEventListener("click", function (e) { var lg = e.target.closest && e.target.closest(".lgb"); if (lg && w.Lang && lg.getAttribute("aria-checked") !== "true") w.Lang.set(lg.getAttribute("data-lang")); });
    var go = c.querySelector(".obgo");
    go.addEventListener("click", async function () {
      go.disabled = true; say("");
      var A = await waitFB(8000);
      if (!A) { say("⚠️ ما قدرنا نفتح تسجيل الدخول هلّق. جرّب بعد شوي، أو من صفحة أصحابي."); go.disabled = false; return; }
      var s = lsGet(OB) || {}; s.p = 2; lsSet(OB, s);                      // if the phone uses Google's redirect, step 2 shows after coming back
      try { await A.signIn(); }
      catch (e) { console.warn("nursin: sign-in", e && e.code); say(A.errText ? A.errText(e) : "⚠️ صار في مشكلة بتسجيل الدخول."); go.disabled = false; return; }
      var u = await waitUser(4000);
      if (!u) { go.disabled = false; return; }                             // closed Google's window: stay on step 1
      mark(1);
      var need = pushNeed();
      classStep(function () { if (need) step2(need, total); else done("✅ تمام! سجّلت دخول."); });
    });
  }
  function done(m) {
    if (!card) return;
    card.innerHTML = '<h2 id="obt">' + esc(m) + '</h2><p class="small">لقيت كل شي تحت: 📚 المواد · 📝 التمارين · 👥 أصحابي · 👨‍🏫 الأستاذ عثمان.</p>';
    setTimeout(closeCard, 3200);
  }
  function step2(need, total) {
    if (need === "ios") {
      shell(2, total, '<h2 id="obt">📲 زيد عالشاشة الرئيسية</h2><p>عالآيفون الإشعارات بتشتغل <b>بس من أيقونة Nursin</b> عالشاشة الرئيسية (iOS 16.4 أو أحدث):</p>' +
        '<ol class="obol"><li>بـ <b>Safari</b> كبوس زر المشاركة <b>⬆️</b>.</li><li>اختار <b>«إضافة إلى الشاشة الرئيسية»</b> وبعدين <b>«إضافة»</b>.</li><li>افتح Nursin من الأيقونة، وهونيك بنسألك عن 🔔 الإشعارات.</li></ol>' +
        '<div class="obbtns"><button class="btn pri obgo obok" type="button">تمام 👍</button><button class="oblater" type="button">بعدين</button></div>');
      card.querySelector(".obok").addEventListener("click", function () { mark(2); closeCard(); });
      return;
    }
    var c = shell(2, total, '<h2 id="obt">🔔 فعّل الإشعارات</h2><p>بيوصلك خبر لمّا ينزل درس جديد، ولمّا حدا من أصحابك يبعتلك رسالة، حتى لو الموقع مسكّر.</p>' +
      '<div class="obbtns"><button class="btn pri obgo" type="button">🔔 فعّل الإشعارات</button><button class="oblater" type="button">بعدين</button></div>' +
      '<p class="small obnote">فيك توقّفها بأي وقت من ☰ ← 🔔 الإشعارات.</p>');
    var go = c.querySelector(".obgo");
    go.addEventListener("click", async function () {
      go.disabled = true; say("");
      var A = await waitUser(6000), P = w.NursinPWA;
      if (!A || !P || !P.enable) { say("⚠️ لازم تسجّل دخول أوّل."); go.disabled = false; return; }
      try {
        var r = await P.enable(A);
        if (r === "on") { mark(2); return done("✅ تفعّلت الإشعارات!"); }
        mark(2);
        say(r === "default" ? "ما وافقت عالإشعارات. فيك تفعّلها بعدين من ☰ ← 🔔 الإشعارات." : "🔕 الإشعارات مسكّرة من إعدادات المتصفح. فيك تفتحها من الإعدادات بعدين.");
        setTimeout(closeCard, 4000);
      } catch (e) {
        say("🔔 الإشعارات عم تتجهّز، جرّب بعد شوي من ☰ ← 🔔 الإشعارات.");
        if (!(e && (e.soon || e.code === "permission-denied"))) console.warn("nursin: push on", e && (e.code || e.message));
        go.disabled = false;
      }
    });
  }
  /* 🏫 «عندك كود صف؟» — right after a new Google sign-in, or for any signed-in student in no class who hasn't said «ما عندي / بعدين».
     One card at a time (it takes the welcome card's place, then the 🔔 step follows). Joins with the class page's own join (classes.js joinWithCode), any class code. No ads. */
  function ccState() { return lsGet(CC) || {}; }
  function ccEligible() {                                // → Promise<bool>
    if (!(w.NursinFB && w.NursinFB.user) && signedIn()) {               // signed in, Firebase not loaded on this page yet
      if (w.Nursin && w.Nursin.loadFB) w.Nursin.loadFB();
      return waitUser(6000).then(function (A) { return A ? ccEligible() : false; });
    }
    var A = w.NursinFB, s = ccState();
    if (!A || !A.user || page === "classes.html" || /[?&](join|c)=/.test(location.search)) return Promise.resolve(false);
    if (s.off || s.has === A.user.uid) return Promise.resolve(false);
    return A.mod("classes").then(function (m) { return m && m.myClassCount ? m.myClassCount(A) : null; }).then(function (k) {
      if (k > 0) { var t = ccState(); t.has = A.user.uid; lsSet(CC, t); }
      return k === 0;
    }, function () { return false; });
  }
  function classCard(next) {
    var c = shell(1, 1, '<h2 id="obt">🏫 عندك كود صف؟</h2><p>إذا أستاذك أو رفيقك عطاك كود صفّك، حطّو هون وبتفوت عالصف دغري: امتحان الصف، سؤال اليوم، وعلامات رفقاتك.</p>' +
      '<form class="obcc" autocomplete="off"><input class="obccin" dir="ltr" maxlength="7" autocapitalize="characters" spellcheck="false" placeholder="مثلاً K7Q2MX" aria-label="كود الصف">' +
      '<div class="obbtns"><button class="btn pri obgo" type="submit">فوت عالصف</button><button class="obccno" type="button">ما عندي / بعدين</button></div></form>' +
      '<p class="small obnote">الدروس مفتوحة إلك بكل الأحوال. فيك تفوت على صف بعدين من 👥 أصحابي ← 🏫 صفّي.</p>');
    var f = c.querySelector(".obcc"), inp = c.querySelector(".obccin"), go = c.querySelector(".obgo");
    inp.addEventListener("input", function () { say(""); });
    c.querySelector(".obccno").addEventListener("click", function () { var s = ccState(); s.off = Date.now(); lsSet(CC, s); closeCard(); if (next) setTimeout(next, 300); });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var A = w.NursinFB; if (!A || !A.user) { say("⚠️ لازم تسجّل دخول أوّل."); return; }
      go.disabled = true; say("⏳ …");
      A.mod("classes").then(function (m) { return m && m.joinWithCode ? m.joinWithCode(A, inp.value) : { err: "⚠️ ما زبط، جرّب كمان مرّة." }; }).then(function (r) {
        if (r.err) { say(r.err); go.disabled = false; return; }
        var s = ccState(); s.has = A.user.uid; lsSet(CC, s);
        say("✅ " + (r.already ? "إنت أصلاً بصف «" : "فتت على صف «") + r.name + "»");
        setTimeout(function () { location.href = "classes.html?c=" + encodeURIComponent(r.cid); }, 700);
      }, function () { say("⚠️ ما زبط، تأكّد من الإنترنت وجرّب كمان مرّة."); go.disabled = false; });
    });
    setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (x) {} }, 350);
  }
  function classStep(next) {                             // show the class card if it applies, else go straight on
    ccEligible().then(function (ok) { if (ok) classCard(next); else if (next) next(); });
  }
  function startWelcome() {
    if (OB_PAGES.indexOf(page) < 0 || /[?&](challenge|exam|room)=/.test(location.search)) return;
    var step = due();
    if (step === 1) return step1(pushNeed() ? 2 : 1);
    if (!signedIn()) return;
    var fromSignIn = step === 2 && (lsGet(OB) || {}).p === 2;      // came back from Google's redirect: class card, then 🔔
    ccEligible().then(function (ok) {
      if (ok) return classCard(fromSignIn ? function () { step2(pushNeed(), 1); } : null);
      if (step === 2) step2(pushNeed(), 1);
    });
  }
  function whenQuiet(fn) {                                // after the splash and the 3D page's ad screen, never on top of them
    var t0 = Date.now();
    (function tick() {
      var busy = d.querySelector(".nsplash") || d.documentElement.classList.contains("g3on") || d.querySelector(".pwasheet,.gate3d");
      if (busy && Date.now() - t0 < 30000) return setTimeout(tick, 400);
      setTimeout(function () {
        if (w.Nursin && w.Nursin.me && !w.__nursinAuthSeen) {               // signed in before: let Firebase confirm first (max 6 s)
          var t1 = Date.now(); (function wait() { if (w.__nursinAuthSeen || Date.now() - t1 > 6000) return fn(); setTimeout(wait, 200); })();
        } else fn();
      }, 1200);
    })();
  }

  function init() {
    buildNav(); remember(); continueCard();
    whenQuiet(startWelcome);
  }
  w.NursinNav = { groups: G, due: due, open: openSheet, close: closeSheet, classCard: classCard };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
