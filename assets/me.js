/* 👤 «أنا» (me.html) — Abdullah, Oct 29 2026 11:39 PM: the 5th tab of the bottom bar. Everything about the student himself in one page:
   his points + level (assets/account.js), 🔥 streak + ⏱️ pomodoro + weekly card (assets/study.js #study), study board (studytime #stboard),
   🔔 «إشعارات الأستاذ عثمان» + quiet hours (the same switch as the «درس اليوم» sheet, assets/goals.js), 🎨 theme, 🌐 language, 🎁 prizes,
   📲 install, about/privacy/credits and the owner's admin page. Signed out: a 🔒 sign-in card where an account is needed. No ads here. */
(function (w, d) {
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var OWNER = "abdullahjaber1452003@gmail.com";
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!(w.Nursin && w.Nursin.me); }
  function card() {
    var el = d.getElementById("mecard"); if (!el) return;
    var N = w.Nursin || {}, me = N.me;
    if (!me || !signed()) {
      el.innerHTML = '<h2>👤 ' + esc(T("أنا", "Moi")) + '</h2><p class="small">' + esc(T("🔒 سجّل دخول بغوغل (ببلاش) تا تنحفظ نقاطك وتطلع بالليفل، وتلعب بالبطولة مع صفّك.", "🔒 Connecte-toi avec Google (gratuit) pour garder tes points, monter de niveau et jouer au tournoi avec ta classe.")) + '</p><p><a class="btn pri" href="friends.html">' + esc(T("👤 سجّل دخول", "👤 Se connecter")) + "</a></p>";
      return;
    }
    var g = N.progress ? N.progress(me.points | 0) : { level: 1, points: me.points | 0, pct: 0, left: 0 };
    el.innerHTML = '<div class="meh">' + (N.avatar ? N.avatar(N.myPhoto ? N.myPhoto() : me.photo, me.name, "av meav") : "") + '<div><h2>' + esc(me.name || T("أنا", "Moi")) + '</h2><p class="small"><b>Lv ' + g.level + "</b> · " + esc(T(g.points + " نقطة", g.points + " points")) + (g.left ? " · " + esc(T("باقي " + g.left + " للّيفل الجاي", "encore " + g.left + " pour le niveau suivant")) : "") + "</p>" +
      '<i class="lvbar mebar"><i style="width:' + (g.pct | 0) + '%"></i></i></div></div><p><a class="btn" href="friends.html">' + esc(T("🏆 الليفل والترتيب", "🏆 Niveau et classement")) + '</a> <a class="btn" href="index.html#duel">' + esc(T("🎁 جوائز البطولة", "🎁 Prix du tournoi")) + '</a> <a class="btn" href="index.html#avatar">' + esc(T("🧑‍⚕️ غيّر صورتك", "🧑‍⚕️ Changer d'avatar")) + "</a></p>";
  }
  function push() {
    var el = d.getElementById("mepush"), G = w.NursinGoals; if (!el) return;
    if (!signed() || !G || !G.pushHtml) { el.innerHTML = '<h2>' + esc(T("🔔 إشعارات الأستاذ عثمان", "🔔 Notifications du Professeur Osman")) + '</h2><p class="small">' + esc(T("🔒 بدّها حساب. سجّل دخول وبيصير عثمان يذكّرك إيمتى لازم تدرس.", "🔒 Il faut un compte. Connecte-toi et Osman te rappellera quand étudier.")) + "</p>"; return; }
    el.innerHTML = '<h2>' + esc(T("🔔 إشعارات الأستاذ عثمان", "🔔 Notifications du Professeur Osman")) + "</h2>" + G.pushHtml();
  }
  function owner() { var A = w.NursinFB, u = A && A.user; return !!(u && u.email === OWNER && u.emailVerified); }
  function settings() {
    var el = d.getElementById("meset"); if (!el) return;
    var P = w.NursinPWA, r = function (href, e, n, s) { return '<a class="gi" href="' + href + '"><span class="gie" aria-hidden="true">' + e + '</span><span class="git"><b>' + esc(n) + "</b>" + (s ? "<small>" + esc(s) + "</small>" : "") + "</span></a>"; };
    var b = function (attr, e, n, s) { return '<button class="gi" type="button" ' + attr + '><span class="gie" aria-hidden="true">' + e + '</span><span class="git"><b>' + esc(n) + "</b>" + (s ? "<small>" + esc(s) + "</small>" : "") + "</span></button>"; };
    var h = b("data-theme-open", "🎨", T("المظهر", "Apparence"), T("كلاسيك، ليلي، وردي…", "Classique, nuit, rose…")) +
      b("data-me-lang", "🌐", T("لغة الدراسة", "Langue d'étude"), T("فرنسي وعربي، أو فرنسي بس", "Français + arabe, ou français seulement")) +
      r("friends.html#fpush", "📳", T("إشعارات هالجهاز", "Notifications de cet appareil"), T("رسائل أصحابك + الدروس الجديدة", "Messages de tes amis + nouvelles leçons")) +
      r("hifzi.html", "🗺️", T("حفظي", "Ma mémoire"), T("الحفظ، نقاط ضعفك والأخطاء الشائعة", "Mémoire, points faibles et erreurs fréquentes")) +
      r("notes.html", "📒", T("ملاحظاتي", "Mes notes"), T("كل ملاحظاتك مرتّبة حسب المادة والدرس", "Toutes tes notes, rangées par matière et leçon")) +
      r("highlights.html", "🖍️", T("تعليماتي", "Mes surlignages"), T("كل يلي علّمتو بالقلم بالدروس، مرتّب حسب المادة واللون", "Tout ce que tu as surligné dans les leçons, par matière et couleur"));
    if (P && P.installable && P.installable()) h += b("data-me-inst", "📲", T("حمّل التطبيق", "Installer l'appli"), T("Nursin متل التطبيق عالتلفون", "Nursin comme une appli sur ton téléphone"));
    h += r("about.html", "ℹ️", T("من نحن", "À propos"), "") + r("privacy.html", "🔒", T("سياسة الخصوصية", "Confidentialité"), "") + r("credits.html", "📚", T("المصادر والتراخيص", "Sources et licences"), "");
    if (owner()) h += r("admin.html", "⚙️", T("لوحة الأدمن", "Administration"), "");
    el.innerHTML = h;
  }
  d.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    if (t.closest("#mepush .gopsw")) { e.preventDefault(); if (w.NursinGoals && w.NursinGoals.toggle) w.NursinGoals.toggle(); return; }
    if (t.closest("[data-me-lang]")) { if (w.NursinNav && w.NursinNav.open) w.NursinNav.open("more"); return; }
    if (t.closest("[data-me-inst]")) { var P = w.NursinPWA; if (P && P.install) P.install(); else if (w.NursinNav) w.NursinNav.open("more"); }
  });
  function all() { card(); push(); settings(); }
  ["nursin:auth", "nursin:gate", "nursin:me", "nursin:gpush"].forEach(function (ev) { d.addEventListener(ev, function () { setTimeout(all, 30); }); });
  w.NursinMe = { draw: all };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", all); else all();
  setTimeout(all, 1500);
})(window, document);
