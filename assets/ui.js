/* 🫧 nursin UI shell — the «Liquid Glass» design on EVERY page (Abdullah, Oct 31 2026 6:45 AM: «المفروض هيدا الشي يتم على الكل… بس افقس
   على الاستاذ عثمان بترجع بيطلعلي الشكل القديم… بدنا هالشي يتم كل النظام»). Loaded on all pages (before home.js on the home page).
     ① the floating glass pill nav: الرئيسية · المواد · raised «عثمان» · حفظي · «الكل», with the sliding glass bubble on the CURRENT page's tab
        (lesson pages → المواد, the tutor → the raised button, everything else → «الكل»). It hides while scrolling down and comes back on the
        way up, and stays away during an active quiz / game / live round, flashcards, a patient case, the search and while typing.
     ② the compact glass header on inner pages: back (RTL ›) · page title · the page's own buttons (🔎, ✅ goals, 🔔, دخول) · the avatar,
        which opens the same picker as the home. The old ☰ «المزيد» items live in «الكل» (theme, language, notifications, install, admin).
     ③ the sheets (glass, swipe down / backdrop / Esc to close): «الكل» with EVERY page, «المواد», the avatar picker (+ account rows).
     ④ the avatar: 12 original cartoon avatars (assets/avatars/a01–a12.webp) or an own photo (square 256 px, ≤ 40 KB, on this device;
        signed in → users/{uid}/avatar/main, rules v18); the cartoon id + its URL go on the profile so friends see it.
   No ad markup anywhere in this file. Styles: assets/ui.css. The home page keeps its own header / «مسار اليوم» in assets/home.js. */
(function (w, d) {
  var AK = "nursin_avatar_v1", AVN = 12, AVRE = /^a(0[1-9]|1[0-2])$/;
  var OWNER = "abdullahjaber1452003@gmail.com";
  var page = "index.html";
  try { page = (location.pathname.split("/").pop() || "index.html").toLowerCase(); if (!/\.html$/.test(page)) page = "index.html"; } catch (e) {}
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function N() { return w.Nursin || {}; }
  function reduced() { try { return w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  /* ---------------- every page: its title, its nav tab (0 home · 1 subjects · 2 Osman · 3 حفظي · 4 «الكل»), where «back» goes ---------------- */
  var PAGES = {
    "index.html": ["🏠", "الرئيسية", "Accueil", 0], "medsurg.html": ["🏥", "Med-Surg", "Med-Surg", 1], "cardio.html": ["🫀", "القلب", "Cardiologie", 1, "medsurg.html"],
    "neuro.html": ["🧠", "الأعصاب", "Neurologie", 1, "medsurg.html"], "henderson.html": ["🧩", "Henderson", "Henderson", 1, "medsurg.html"], "rea.html": ["🚑", "الإنعاش", "Réanimation", 1],
    "pharma.html": ["💊", "الأدوية", "Pharmacologie", 1], "law.html": ["⚖️", "القانون", "Législation", 1], "mgmt.html": ["🏢", "الإدارة", "Management", 1],
    "quality.html": ["✅", "الجودة", "Qualité", 1], "geri.html": ["👴", "الشيخوخة", "Gériatrie", 1], "community.html": ["🏘️", "صحة المجتمع", "Santé communautaire", 1],
    "3d.html": ["🧊", "التشريح 3D", "Anatomie 3D", 1], "tutor.html": ["👨‍🏫", "الأستاذ عثمان", "Professeur Osman", 2], "hifzi.html": ["🗺️", "حفظي", "Ma mémoire", 3],
    "quiz.html": ["⚡", "الكويز", "Quiz", 4], "exams.html": ["📅", "الامتحانات", "Examens", 4], "games.html": ["🎮", "الألعاب", "Jeux", 4], "live.html": ["🔴", "تحدّي لايف", "Défi live", 4],
    "friends.html": ["👥", "أصحابي", "Amis", 4], "chat.html": ["💬", "المحادثات", "Messages", 4], "classes.html": ["🏫", "صفّي", "Ma classe", 4], "notes.html": ["📒", "ملاحظاتي", "Mes notes", 4],
    "me.html": ["👤", "أنا", "Moi", 4], "about.html": ["ℹ️", "من نحن", "À propos", 4], "privacy.html": ["🔒", "الخصوصية", "Confidentialité", 4], "credits.html": ["📜", "المصادر", "Sources", 4],
    "admin.html": ["⚙️", "لوحة الأدمن", "Admin", 4], "404.html": ["🧭", "الصفحة مش موجودة", "Page introuvable", 4]
  };
  function info(p) { var x = PAGES[p || page] || ["📄", "nursin", "nursin", 4]; return { e: x[0], ar: x[1], fr: x[2], tab: x[3], up: x[4] || "index.html" }; }

  /* ---------------- «الكل»: every page of the site (tests check none is missing) — [href, emoji, ar, fr, badge-key] ---------------- */
  var ALL = [
    { k: "learn", e: "📚", ar: "الدروس", fr: "Les leçons", items: [
      ["medsurg.html", "🏥", "Med-Surg", "Med-Surg"], ["cardio.html", "🫀", "القلب", "Cardio"], ["neuro.html", "🧠", "الأعصاب", "Neuro"],
      ["henderson.html", "🧩", "Henderson", "Henderson"], ["medsurg.html#iv", "💉", "التسريب", "Perfusion"], ["rea.html", "🚑", "الإنعاش", "Réa"],
      ["pharma.html", "💊", "الأدوية", "Pharmaco"], ["law.html", "⚖️", "القانون", "Législation"], ["mgmt.html", "🏢", "الإدارة", "Management"],
      ["quality.html", "✅", "الجودة", "Qualité"], ["geri.html", "👴", "الشيخوخة", "Gériatrie"], ["community.html", "🏘️", "صحة المجتمع", "Santé comm."],
      ["3d.html", "🧊", "التشريح 3D", "Anatomie 3D"]] },
    { k: "train", e: "🧠", ar: "التدريب والمراجعة", fr: "Entraînement et révision", items: [
      ["quiz.html", "⚡", "كويز", "Quiz"], ["quiz.html?t=review", "🔁", "مراجعة اليوم", "Révision", "due"], ["quiz.html?t=mixed", "🗓️", "الأسبوعي", "Hebdo", "wex"],
      ["#case", "🩺", "حالة مريض", "Cas clinique"], ["quiz.html#weak", "🎯", "نقاط ضعفك", "Points faibles"], ["hifzi.html", "🗺️", "حفظي", "Ma mémoire"],
      ["#cards", "🃏", "البطاقات", "Cartes"], ["#blank", "📃", "الورقة البيضا", "Page blanche"], ["#teach", "🧑‍🏫", "علِّم عثمان", "Enseigne à Osman"],
      ["quiz.html#blanks", "✍️", "عبّي الفراغ", "Trous"], ["exams.html", "📅", "الامتحانات", "Examens"], ["law.html#classquiz", "📝", "كويز الصف", "Quiz de classe"]] },
    { k: "friends", e: "👥", ar: "مع رفقاتك", fr: "Avec tes amis", items: [
      ["index.html#duel", "🏆", "البطولة", "Tournoi"], ["live.html", "🔴", "تحدّي لايف", "Défi live"], ["games.html", "🎮", "الألعاب", "Jeux"],
      ["friends.html", "👥", "أصحابي", "Amis"], ["chat.html", "💬", "المحادثات", "Messages"], ["classes.html", "🏫", "صفّي", "Ma classe"],
      ["classes.html#cdq", "❓", "سؤال اليوم", "Question du jour"], ["#online", "🟢", "مين أونلاين", "En ligne"]] },
    { k: "tools", e: "⚙️", ar: "أدواتي", fr: "Mes outils", items: [
      ["tutor.html", "👨‍🏫", "الأستاذ عثمان", "Prof. Osman"], ["notes.html", "📒", "ملاحظاتي", "Mes notes"], ["#goals", "✅", "أهداف اليوم", "Objectifs"],
      ["#search", "🔎", "دوّر", "Chercher"], ["#avatar", "🧑‍⚕️", "صورتي", "Mon avatar"], ["#theme", "🎨", "المظهر", "Apparence"],
      ["#lang", "🇫🇷", "Français / عربي", "عربي / Français"], ["friends.html#fpush", "🔔", "الإشعارات", "Notifications"], ["#install", "📲", "حمّل التطبيق", "Installer l'app"],
      ["me.html", "👤", "أنا والإعدادات", "Moi et réglages"], ["about.html", "ℹ️", "من نحن", "À propos"],
      ["privacy.html", "🔒", "الخصوصية", "Confidentialité"], ["credits.html", "📜", "المصادر", "Sources"]] }
  ];
  var ADMIN = ["admin" + ".html", "🛠️", "لوحة الأدمن", "Admin"];     // shown to the owner only (assets/nav.js did the same in ☰)
  function owner() { var A = w.NursinFB, u = A && A.user; return !!(u && u.email === OWNER && u.emailVerified); }

  /* ---------------- the device's lessons (for «البطاقات», «حالة مريض», «الورقة البيضا», «علِّم عثمان» from any page) ---------------- */
  function fcHref(l) { var p = String(l.href).split("#"); return p[0] + "?fc=" + encodeURIComponent(l.id) + (p[1] ? "#" + p[1] : ""); }
  function lessonsNow() {
    var R = w.NursinRet, list = R && R.list ? R.list() : [], src = (w.NLESSONS && w.NLESSONS.list) || [], LS = w.NursinLessons, rm = {};
    try { rm = LS && LS.readMap ? LS.readMap() || {} : {}; } catch (e) {}
    var qc = {}; (w.QUIZ || []).forEach(function (q) { var k = q.t + "|" + (q.l || ""); qc[k] = (qc[k] | 0) + 1; });
    var byT = {}; (w.QUIZ || []).forEach(function (q) { byT[q.t] = (byT[q.t] | 0) + 1; });
    return src.map(function (l, i) {
      var id = l.s + ":" + (l.l || l.t), r = list[i] && list[i].id === id ? list[i] : null;
      var read = false; try { read = LS && LS.isRead ? !!LS.isRead(l, rm) : false; } catch (e) {}
      return { id: id, s: l.s, t: l.t, l: l.l || "", n: l.n, href: l.href, score: r ? r.score : null, read: read, q: l.l ? (qc[l.t + "|" + l.l] | 0) : (byT[l.t] | 0) };
    });
  }
  function lastNow(L) {
    var NN = w.NursinNav, x = NN && NN.lastLesson ? NN.lastLesson() : null; if (!x) return null;
    var id = "", base = x.href.split("#")[0], h = x.href.split("#")[1] || "";
    L.forEach(function (l) { if (!id && l.href.split("#")[0] === base && (l.href.split("#")[1] || "") === h.replace(/-p\d+$/, "")) id = l.id; });
    return { id: id, href: x.href, name: String(x.name || "").replace(/^\S+\s/, ""), part: x.part || "" };
  }
  function lastLes() { var L = lessonsNow(), l = lastNow(L), c = null; if (l && l.id) L.forEach(function (x) { if (x.id === l.id) c = x; }); if (!c) c = L.filter(function (x) { return x.score != null; })[0] || L.filter(function (x) { return x.q >= 3; })[0]; return c; }
  function partKey(l) { var P = (w.NLESSONS && w.NLESSONS.parts) || [], k = l.id; for (var i = 0; i < P.length; i++) { var x = P[i]; if (x.s + ":" + (x.l || x.t) === l.id) { k = l.id + (x.p ? "#" + x.p : ""); break; } } return k; }
  function caseLes() {
    var L = lessonsNow(), cs = {}; ((w.Retain && w.Retain.CASE_IDS) || []).forEach(function (c) { cs[c] = 1; });
    var l = lastNow(L); if (l && cs[l.id]) return L.filter(function (x) { return x.id === l.id; })[0];
    return L.filter(function (x) { return cs[x.id] && x.score != null; }).sort(function (a, b) { return a.score - b.score; })[0] || L.filter(function (x) { return cs[x.id]; })[0] || null;
  }

  /* ---------------- avatar ---------------- */
  function avId(k) { return AVRE.test(k || "") ? k : ""; }
  function avUrl(k) { return "assets/avatars/" + k + ".webp"; }
  function myAvatar() {
    var n = N(); if (n.myPhoto) try { return n.myPhoto(); } catch (e) {}
    var a = lsGet(AK); if (a && avId(a.k)) return avUrl(a.k); if (a && a.k === "up" && /^data:image\//.test(a.img || "")) return a.img;
    return (n.me && n.me.photo) || "";
  }
  function avHtml(cls) {
    var p = myAvatar(), me = N().me;
    if (p) return '<img class="' + cls + '" src="' + esc(p) + '" alt="" referrerpolicy="no-referrer">';
    return '<span class="' + cls + ' hzavx" aria-hidden="true">' + (me && me.name ? esc(Array.from(me.name)[0]) : "🙂") + "</span>";
  }
  // square crop + resize to 256 px, webp (jpeg where the browser can't encode webp), ≤ 40 KB
  function shrink(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type || "")) return rej(new Error("type"));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
          var cv = d.createElement("canvas"); cv.width = cv.height = 256; var g = cv.getContext("2d");
          g.imageSmoothingQuality = "high"; g.drawImage(img, sx, sy, s, s, 0, 0, 256, 256); URL.revokeObjectURL(url);
          var out = "", q;
          for (q = 0.86; q >= 0.4; q -= 0.08) { out = cv.toDataURL("image/webp", q); if (out.indexOf("data:image/webp") !== 0) break; if (out.length <= 40000) return res(out); }
          for (q = 0.86; q >= 0.3; q -= 0.08) { out = cv.toDataURL("image/jpeg", q); if (out.length <= 40000) return res(out); }
          rej(new Error("big"));
        } catch (e) { rej(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("read")); };
      img.src = url;
    });
  }
  function setAvatar(a) {           // a = {k:"a01".."a12"} | {k:"up", img} | null
    if (a && !(avId(a.k) || (a.k === "up" && /^data:image\/(webp|jpeg|png);base64,/.test(a.img || "") && a.img.length <= 45000))) return false;
    if (a) { a.at = Date.now(); if (!lsSet(AK, a)) return false; } else try { localStorage.removeItem(AK); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:avatar")); } catch (e) {}
    var n = N(); if (n.badge) try { n.badge(); } catch (e) {}
    sync(a); return true;
  }
  // signed in: the cartoon id + its URL go on the profile (friends, ranking and classes then show it); an own photo goes to the
  // owner-only doc users/{uid}/avatar/main (rules v18 — until they are published it simply stays on this device)
  function sync(a) {
    var A = w.NursinFB; if (!A || !A.user || !A.fs) return;
    var F = A.fs, uid = A.user.uid, ref = F.doc(A.db, "users", uid), gp = String(A.user.photoURL || "").slice(0, 500);
    var k = a ? (avId(a.k) || "up") : "";
    var ph = avId(k) ? "https://nursin.store/" + avUrl(k) : gp;
    F.setDoc(ref, { av: k, photo: ph }, { merge: true }).then(function () { if (A.profile) { A.profile.av = k; A.profile.photo = ph; } }, function (e) { console.warn("nursin: avatar", e && e.code); });
    if (k === "up") F.setDoc(F.doc(A.db, "users", uid, "avatar", "main"), { img: a.img, at: Date.now() }).catch(function (e) { if (!(e && e.code === "permission-denied")) console.warn("nursin: avatar img", e && e.code); });
  }
  // another device chose an avatar: take it here too (cartoon from the profile; own photo from the owner-only doc)
  function pull() {
    var A = w.NursinFB, pr = A && A.profile; if (!A || !A.user || !pr) return;
    var loc = lsGet(AK), k = pr.av || "";
    if (avId(k) && (!loc || loc.k !== k)) { lsSet(AK, { k: k, at: Date.now() }); avChanged(); }
    else if (k === "up" && (!loc || loc.k !== "up") && A.fs) {
      A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid, "avatar", "main")).then(function (s) {
        var x = s.exists() ? s.data() : null; if (x && /^data:image\//.test(x.img || "")) { lsSet(AK, { k: "up", img: x.img, at: Date.now() }); avChanged(); var n = N(); if (n.badge) n.badge(); }
      }, function () {});
    }
  }
  function avChanged() { try { d.dispatchEvent(new CustomEvent("nursin:avatar")); } catch (e) {} }

  /* ---------------- sheets (glass, drag down to close, backdrop / Esc close) ---------------- */
  var sh = null, scr = null, opener = null;
  function closeSheet() {
    var s = sh, c = scr; sh = scr = null; d.documentElement.classList.remove("hzsheeton");
    if (s) { s.classList.add("out"); setTimeout(function () { s.remove(); }, reduced() ? 0 : 260); }
    if (c) { c.classList.add("out"); setTimeout(function () { c.remove(); }, reduced() ? 0 : 260); }
    navCur(); focusMode();
    var o = opener; opener = null; if (o && o.focus) try { o.focus({ preventScroll: true }); } catch (e) {}
  }
  function openSheet(cls, label, html, from) {
    if (sh) closeSheet();
    try { if (w.NursinNav && w.NursinNav.close) w.NursinNav.close(); } catch (e) {}
    opener = from || null;
    scr = d.createElement("div"); scr.className = "hzscrim"; scr.addEventListener("click", closeSheet);
    sh = d.createElement("div"); sh.className = "hzsheet " + cls; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label);
    sh.innerHTML = '<div class="hzgrab" aria-hidden="true"><i></i></div><div class="hzshd"><h2>' + esc(label) + '</h2><button class="hzx" type="button" aria-label="' + T("سكّر", "Fermer") + '">✕</button></div><div class="hzshb">' + html + "</div>";
    d.body.appendChild(scr); d.body.appendChild(sh); d.documentElement.classList.add("hzsheeton");
    sh.querySelector(".hzx").addEventListener("click", closeSheet);
    drag(sh);
    setTimeout(function () { var f = sh && sh.querySelector(".hzx"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    return sh;
  }
  // swipe down to close — any sheet-like element (onClose decides how it closes); the body list must be scrolled to the top first
  function drag(el, onClose, bodySel) {
    var y0 = 0, dy = 0, on = false, t0 = 0, body = el.querySelector(bodySel || ".hzshb");
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      var inHead = e.target.closest && e.target.closest(".hzgrab,.hzshd,.gsh,.uigrab");
      if (!inHead && body && body.scrollTop > 0) return;
      if (!inHead && el.scrollTop > 0) return;
      if (!inHead && e.target.closest && e.target.closest("input,textarea,select,canvas,.hzchips,.hzsubs,[data-noswipe]")) return;
      on = true; y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); el.style.transition = "none";
    }, { passive: true });
    el.addEventListener("touchmove", function (e) {
      if (!on) return; dy = e.touches[0].clientY - y0;
      if (dy < 0) { dy = 0; } el.style.transform = dy ? "translateY(" + dy + "px)" : "";
    }, { passive: true });
    function end() {
      if (!on) return; on = false; el.style.transition = "";
      var fast = dy > 40 && Date.now() - t0 < 250;
      if (dy > 110 || fast) { if (onClose) { el.style.transform = ""; onClose(el); } else closeSheet(); } else el.style.transform = "";
    }
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
  }
  function badges() {
    var S = w.NursinSRS, due = S && S.count ? S.count() : 0, wx = false;
    try { var st = w.Retain && w.Retain.wstatus ? w.Retain.wstatus() : null; wx = !!(st && st.ready && !st.done); } catch (e) {}
    return { due: due > 0 ? String(due) : "", wex: wx ? T("جاهز", "Prêt") : "" };
  }
  function installable() { var P = w.NursinPWA; try { return !!(P && P.installable && P.installable()); } catch (e) { return false; } }
  function allHtml(only) {
    var b = badges();
    return '<button class="hzsrch hzsrch-s" type="button" data-hz="search"><span class="e" aria-hidden="true">🔍</span><span class="ph">' + T("دوّر على درس، سؤال، دوا…", "Cherche une leçon, une question, un médicament…") + "</span></button>" +
      ALL.filter(function (g) { return !only || g.k === only; }).map(function (g) {
        var items = g.items.filter(function (it) { return it[0] !== "#install" || installable(); });
        if (g.k === "tools" && owner()) items = items.concat([ADMIN]);
        return '<section class="hzgrp"><h3>' + g.e + " " + T(g.ar, g.fr) + (g.k === "learn" ? "<small>" + T("13 مادة", "13 matières") + "</small>" : "") + '</h3><div class="hzgr">' + items.map(function (it) {
          var bd = it[4] ? b[it[4]] : "", isBtn = it[0].charAt(0) === "#", here = !isBtn && it[0] === page;
          var inner = '<span class="ie" aria-hidden="true">' + it[1] + (bd ? "<em>" + esc(bd) + "</em>" : "") + "</span><b>" + esc(T(it[2], it[3])) + "</b>";
          return isBtn ? '<button type="button" class="it' + (bd ? " hl" : "") + '" data-hz="' + it[0].slice(1) + '">' + inner + "</button>"
            : '<a class="it' + (bd ? " hl" : "") + (here ? " here" : "") + '" href="' + esc(it[0]) + '"' + (here ? ' aria-current="page"' : "") + ">" + inner + "</a>";
        }).join("") + "</div></section>";
      }).join("");
  }
  // the hash-items of «الكل»: buttons that reuse what the site already has
  function act(k, from) {
    var l;
    switch (k) {
      case "search": closeSheet(); if (w.NursinSearch) setTimeout(function () { w.NursinSearch.open(); }, 60); else location.href = "hifzi.html"; return;
      case "avatar": closeSheet(); setTimeout(function () { picker(from); }, 280); return;
      case "theme": closeSheet(); if (w.NursinTheme) setTimeout(function () { w.NursinTheme.open(); }, 280); else location.href = "me.html"; return;
      case "lang": if (w.Lang && w.Lang.set) w.Lang.set(FR() ? "ar" : "fr"); return;
      case "goals": closeSheet(); var gp = d.querySelector(".gopill"); if (gp) setTimeout(function () { gp.click(); }, 280); else location.href = "me.html"; return;
      case "online": closeSheet(); if (N().me && w.NursinOnline) w.NursinOnline.open(); else location.href = "friends.html"; return;
      case "install": closeSheet(); if (w.NursinPWA && w.NursinPWA.install) w.NursinPWA.install(); return;
      case "bell": closeSheet(); var bl = d.querySelector(".topbar .annbell"); if (bl) bl.click(); return;
      case "cards": l = lastLes(); location.href = l ? fcHref(l) : "hifzi.html"; return;
      case "case":
        if (!w.Retain) { location.href = "index.html#ui-case"; return; }           // the case list lives in assets/retain.js (home + lesson pages)
        l = caseLes(); location.href = l ? l.href.split("#")[0] + "?case=" + encodeURIComponent(l.id) : "medsurg.html"; return;
      case "blank": case "teach": l = lastLes(); location.href = l ? l.href.split("#")[0] + "?" + k + "=" + encodeURIComponent(partKey(l)) : "medsurg.html"; return;
    }
  }
  function openAll(only, from) {
    var s = openSheet("hzall", only ? T("📚 المواد", "📚 Les matières") : T("كل شي بالموقع", "Tout le site"), allHtml(only), from);
    s.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-hz]"); if (b) { e.preventDefault(); act(b.getAttribute("data-hz"), from); return; }
      var a = e.target.closest && e.target.closest("a.it"); if (!a) return;
      var hr = a.getAttribute("href");
      if (hr === "index.html#duel" && page === "index.html") { e.preventDefault(); closeSheet(); var du = d.getElementById("duel"); if (du) du.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); return; }
      if (hr.split("#")[0] === page && hr.indexOf("#") > 0) closeSheet();                 // same page, another section: just close
    });
    return s;
  }
  // the account rows under the picker: sign in (signed out) or level + friends, and «أنا والإعدادات»
  function accountHtml() {
    var me = N().me, h = '<div class="uiacc">';
    if (!me) h += '<a class="uirow pri" href="friends.html"><span class="ie" aria-hidden="true">🔐</span><span><b>' + T("سجّل دخول بغوغل", "Connexion avec Google") + "</b><small>" + T("نقاطك، أصحابك وصورتك على كل أجهزتك", "Tes points, tes amis et ton avatar sur tous tes appareils") + "</small></span></a>";
    else {
      var lv = "", P = N().progress; try { if (P) { var g = P(me.points); lv = "Lv " + g.level + " · " + g.points + T(" نقطة", " pts"); } } catch (e) {}
      h += '<a class="uirow" href="friends.html"><span class="ie" aria-hidden="true">🏆</span><span><b>' + T("أصحابي والليفل", "Amis et niveau") + "</b><small dir=\"auto\">" + esc(lv || T("نقاطك والترتيب", "Tes points et le classement")) + "</small></span></a>";
    }
    h += '<a class="uirow" href="me.html"><span class="ie" aria-hidden="true">👤</span><span><b>' + T("أنا والإعدادات", "Moi et réglages") + "</b><small>" + T("السلسلة، البومودورو، المظهر، الإشعارات", "Série, pomodoro, apparence, notifications") + "</small></span></a>";
    return h + "</div>";
  }
  function picker(from) {
    var cur = lsGet(AK) || {}, me = N().me;
    var h = '<p class="hzpk-now">' + avHtml("hzpkav") + '<span><b>' + (me && me.name ? esc(me.name) : T("صورتك", "Ton avatar")) + "</b><small>" +
      T("اختار صورة من عندك أو شخصية كرتونية", "Choisis ta photo ou un personnage") + "</small></span></p>" +
      '<div class="hzpk-row"><label class="hzbtn pri"><input type="file" accept="image/*" class="hzfile" hidden>📷 ' + T("صورتي", "Ma photo") + "</label>" +
      '<button class="hzbtn" type="button" data-av="">↩️ ' + T("بلا", "Aucun") + "</button></div>" +
      '<p class="hzpk-msg" role="status"></p><div class="hzavgrid">';
    for (var i = 1; i <= AVN; i++) { var k = "a" + (i < 10 ? "0" : "") + i; h += '<button type="button" class="hzavb' + (cur.k === k ? " on" : "") + '" data-av="' + k + '" aria-pressed="' + (cur.k === k) + '" aria-label="' + T("شخصية ", "Personnage ") + i + '"><img src="' + avUrl(k) + '" alt="" loading="lazy" width="72" height="72"></button>'; }
    h += "</div>" + (me ? '<p class="hzpk-note">' + T("الشخصية الكرتونية بتبيّن لأصحابك وصفّك كمان. صورتك من عندك بتضل إلك.", "Le personnage est aussi visible par tes amis et ta classe. Ta photo reste à toi.") + "</p>"
      : '<p class="hzpk-note">' + T("محفوظة على هالجهاز. ", "Gardé sur cet appareil. ") + '<a href="friends.html">' + T("سجّل دخول", "Connecte-toi") + "</a>" + T(" تا تبيّن على كل أجهزتك.", " pour la voir sur tous tes appareils.") + "</p>") + accountHtml();
    var s = openSheet("hzpick", T("🧑‍⚕️ صورتك", "🧑‍⚕️ Ton avatar"), h, from);
    var msg = s.querySelector(".hzpk-msg");
    function after() { var n = s.querySelector(".hzpk-now"); if (n) { var old = n.querySelector(".hzpkav"); if (old) old.outerHTML = avHtml("hzpkav"); } avChanged(); [].forEach.call(s.querySelectorAll(".hzavb"), function (b) { var on = (lsGet(AK) || {}).k === b.getAttribute("data-av"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
    s.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-av]"); if (!b) return;
      var k = b.getAttribute("data-av"); setAvatar(k ? { k: k } : null); msg.textContent = k ? T("✅ تمام!", "✅ C'est fait !") : ""; after();
      if (k) setTimeout(function () { if (sh === s) closeSheet(); }, 550);
    });
    s.querySelector(".hzfile").addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return; msg.textContent = "⏳ …";
      shrink(f).then(function (img) { if (setAvatar({ k: "up", img: img })) { msg.textContent = T("✅ حطّينا صورتك", "✅ Ta photo est en place"); after(); setTimeout(function () { if (sh === s) closeSheet(); }, 650); } else msg.textContent = T("⚠️ ما في محل عالجهاز", "⚠️ Plus de place sur l'appareil"); },
        function () { msg.textContent = T("⚠️ ما قدرنا نقرا هالصورة، جرّب وحدة تانية", "⚠️ Impossible de lire cette image, essaie une autre"); });
    });
    return s;
  }

  /* ---------------- ① the floating glass nav ---------------- */
  var GRID = '<svg width="21" height="21" viewBox="0 0 22 22" fill="currentColor"><rect x="1" y="1" width="8.5" height="8.5" rx="3"/><rect x="12.5" y="1" width="8.5" height="8.5" rx="4.25"/><rect x="1" y="12.5" width="8.5" height="8.5" rx="3"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="3"/></svg>';
  function navHtml() {
    var tab = info().tab, cur = function (i) { return tab === i ? ' aria-current="page"' : ""; };
    return '<nav class="hznav" aria-label="' + T("التنقّل", "Navigation") + '"><span class="hzblob" aria-hidden="true"></span>' +
      '<a class="hzt" href="index.html" data-t="0"' + cur(0) + '><span class="g" aria-hidden="true">🏠</span><span>' + T("الرئيسية", "Accueil") + "</span></a>" +
      '<button class="hzt" type="button" data-hz="learn" data-t="1"' + cur(1) + '><span class="g" aria-hidden="true">📚</span><span>' + T("المواد", "Matières") + "</span></button>" +
      '<a class="hzmid' + (tab === 2 ? " on" : "") + '" href="tutor.html" aria-label="' + T("الأستاذ عثمان", "Professeur Osman") + '"' + cur(2) + '><span class="g" aria-hidden="true">👨‍🏫</span><span>' + T("عثمان", "Osman") + "</span></a>" +
      '<a class="hzt" href="hifzi.html" data-t="3"' + cur(3) + '><span class="g" aria-hidden="true">🔁</span><span>' + T("حفظي", "Mémoire") + "</span></a>" +
      '<button class="hzt" type="button" data-hz="all" data-t="4"' + cur(4) + '><span class="g" aria-hidden="true">' + GRID + "</span><span>" + T("الكل", "Tout") + "</span></button></nav>";
  }
  var nav = null;
  function blobTo(t) {
    if (!nav) return; var b = nav.querySelector(".hzblob"); if (!b) return;
    if (!t) { b.style.opacity = "0"; [].forEach.call(nav.querySelectorAll(".hzt"), function (x) { x.classList.remove("on"); }); return; }
    var nr = nav.getBoundingClientRect(), r = t.getBoundingClientRect();
    b.style.opacity = ""; b.style.width = r.width + "px"; b.style.transform = "translateX(" + (r.left - nr.left) + "px)";
    [].forEach.call(nav.querySelectorAll(".hzt"), function (x) { x.classList.toggle("on", x === t); });
  }
  function navCur() { if (nav) { var tab = info().tab; blobTo(tab === 2 ? null : nav.querySelector('[data-t="' + tab + '"]')); } }
  function navHome() { navCur(); }

  /* nav visibility: away while scrolling down, back on the way up / at the top / at the end; away in «focus» moments */
  var lastY = 0, hidden = false, ticking = false;
  function setHidden(on) { if (!nav || on === hidden) return; hidden = on; d.documentElement.classList.toggle("uinavaway", on); }
  function onScroll() {
    if (ticking) return; ticking = true;
    (w.requestAnimationFrame || setTimeout)(function () {
      ticking = false;
      var y = w.scrollY || w.pageYOffset || 0, dy = y - lastY, end = y + w.innerHeight >= d.documentElement.scrollHeight - 40;
      if (y < 80 || end) setHidden(false); else if (dy > 10) setHidden(true); else if (dy < -10) setHidden(false);
      if (Math.abs(dy) > 10 || y < 80) lastY = y;
    });
  }
  function typing() { var a = d.activeElement; if (!a || a === d.body) return false; if (a.isContentEditable) return true; if (a.tagName === "TEXTAREA" || a.tagName === "SELECT") return true; return a.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|file|color|reset)$/i.test(a.type || "text"); }
  function vis(el) { return !!(el && el.getClientRects().length && !el.closest("[hidden]")); }
  // a round, an exam, a full-screen moment: the nav steps aside (consistent on every page)
  function busyRound() {
    var h = d.documentElement, q;
    if (/(^| )(fcon|rton|ers-on|duelon|srchon|g3on)( |$)/.test(h.className)) return true;
    if (page === "quiz.html") {                     // from the first answer of a quiz until its score (the quiz page always shows a quiz ready)
      q = d.getElementById("quiz");
      if (!q || !vis(q) || q.querySelector(".score") || !q.querySelector(".opt")) quizOn = false;
      else if (q.querySelector(".opt.picked,.opt.ok,.opt.bad,.opt.pick,.opt:disabled,.wxclk")) quizOn = true;
      if (quizOn) return true;
      q = d.getElementById("pmode"); if (q && !q.hidden && q.querySelector("input,textarea,.opt")) return true;
    }
    if (page === "games.html") { q = d.getElementById("garea"); if (q && !q.hidden && q.children.length && !q.querySelector("[data-again]")) return true; }
    if (page === "live.html" && d.getElementById("lboard")) return true;
    if (d.querySelector(".srchbox,.fcwrap,.ers,.pwasheet")) { var o = d.querySelector(".srchbox,.fcwrap,.ers,.pwasheet"); if (vis(o)) return true; }
    return false;
  }
  var fT = 0, quizOn = false;
  function focusMode() {                          // throttled, not debounced: busy pages (timers, live boards) mutate the DOM all the time
    if (fT) return;
    fT = setTimeout(function () {
      fT = 0;
      var on = !!nav && (busyRound() || (typing() && w.innerWidth < 860));
      d.documentElement.classList.toggle("uifocus", on);
    }, 40);
  }

  /* ---------------- ② the compact glass header (inner pages) ---------------- */
  var CHEV = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function goBack() {
    var same = false; try { same = !!d.referrer && new URL(d.referrer).origin === location.origin && d.referrer !== location.href; } catch (e) {}
    if (same && w.history.length > 1) w.history.back(); else location.href = info().up;
  }
  var hav = null;
  function drawAv() { if (hav) hav.innerHTML = avHtml("uiavi"); }
  function header() {
    var bar = d.querySelector(".topbar .bar"); if (!bar || page === "index.html" || bar.querySelector(".uiav")) return;
    var I = info(), b = bar.querySelector(".uiback"), t = bar.querySelector(".uititle");
    if (!b) { b = d.createElement("a"); b.className = "uiback"; b.href = I.up; b.innerHTML = CHEV; bar.insertBefore(b, bar.firstChild); }
    if (!t) { t = d.createElement("div"); t.className = "uititle"; bar.insertBefore(t, b.nextSibling); }
    b.setAttribute("aria-label", T("رجوع", "Retour"));
    t.innerHTML = '<span class="e" aria-hidden="true">' + I.e + "</span><b>" + esc(T(I.ar, I.fr)) + "</b>";      // the page's title (French in 🇫🇷 mode)
    b.addEventListener("click", function (e) { e.preventDefault(); goBack(); });
    hav = d.createElement("button"); hav.type = "button"; hav.className = "uiav"; hav.setAttribute("data-hz", "avatar"); hav.setAttribute("aria-label", T("صورتك وحسابك", "Ton avatar et ton compte"));
    bar.appendChild(hav); drawAv();
  }

  /* ---------------- clicks anywhere on [data-hz] (nav, header avatar, the home's header / chips / cards) ---------------- */
  function hzClick(e) {
    var b = e.target.closest && e.target.closest("[data-hz]"); if (!b || (sh && sh.contains(b))) return;
    var k = b.getAttribute("data-hz"); e.preventDefault();
    if (b.classList.contains("hzt")) blobTo(b);
    if (k === "all") openAll("", b); else if (k === "learn") openAll("learn", b); else if (k === "avatar") picker(b);
    else act(k, b);
  }
  function init() {
    if (!d.body || !d.body.classList.contains("ui")) return;              // only pages that load the shell (body.ui)
    d.documentElement.classList.add("uion");
    header();
    var h1 = page !== "index.html" && d.querySelector("main h1");
    if (h1 && w.IntersectionObserver) {
      d.documentElement.classList.add("uih1");
      new IntersectionObserver(function (es) { es.forEach(function (x) { d.documentElement.classList.toggle("uitl", !x.isIntersecting && x.boundingClientRect.top < 70); }); }, { rootMargin: "-60px 0px 0px 0px" }).observe(h1);
    }
    var tmp = d.createElement("div"); tmp.innerHTML = navHtml(); nav = tmp.firstChild; d.body.appendChild(nav);
    nav.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a.hzt"); if (a) blobTo(a); });
    d.addEventListener("click", hzClick);
    setTimeout(navCur, 30); w.addEventListener("resize", function () { if (!sh) navCur(); });
    lastY = w.scrollY || 0; w.addEventListener("scroll", onScroll, { passive: true });
    d.addEventListener("focusin", focusMode); d.addEventListener("focusout", focusMode);
    try { new MutationObserver(focusMode).observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }); } catch (e) {}
    try { new MutationObserver(focusMode).observe(d.documentElement, { attributes: true, attributeFilter: ["class"] }); } catch (e) {}
    focusMode();
    ["nursin:avatar", "nursin:auth", "nursin:me"].forEach(function (ev) { d.addEventListener(ev, drawAv); });
    d.addEventListener("nursin:auth", function () { setTimeout(pull, 1500); });
    setTimeout(drawAv, 1500); setTimeout(drawAv, 4000); setTimeout(pull, 5000);
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sh) closeSheet(); });
    // the old sheets (goals, theme, nav) and the note / card overlays also close with a swipe down
    try {
      new MutationObserver(function (ms) {
        ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1 || n.__uidrag) return;
          if (n.classList.contains("gsheet")) { n.__uidrag = 1; drag(n, function () { var x = n.querySelector(".gx,.gox,[aria-label='سكّر']"); if (x) x.click(); else { n.remove(); var s = d.querySelector(".gscrim"); if (s) s.remove(); } }, ".gil"); }
        }); });
      }).observe(d.body, { childList: true });
    } catch (e) {}
    // links from other pages: index.html#ui-case etc. run the action here
    var m = /^#ui-(case|cards|blank|teach|search|avatar|goals|theme)$/.exec(location.hash || "");
    if (m) setTimeout(function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} if (m[1] === "avatar") picker(null); else act(m[1], null); }, 900);
  }
  w.NursinUI = { ALL: ALL, PAGES: PAGES, info: info, open: openAll, openSheet: openSheet, close: closeSheet, drag: drag, picker: picker, act: act,
    setAvatar: setAvatar, avUrl: avUrl, avHtml: avHtml, myAvatar: myAvatar, AKEY: AK, AVN: AVN, shrink: shrink, pull: pull, fcHref: fcHref,
    lessonsNow: lessonsNow, lastNow: lastNow, lastLes: lastLes, caseLes: caseLes, blobTo: blobTo, navCur: navCur, navHome: navHome, focusMode: focusMode,
    busyRound: busyRound, isOpen: function () { return !!sh; }, page: page };
  if (!d || !d.getElementById) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
