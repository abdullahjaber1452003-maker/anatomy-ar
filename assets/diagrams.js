/* 🖼️ رسومات الدروس — teaching diagrams inside the lessons (Abdullah approved Nov 1 2026 7:19 AM «اوكي» after the 12 previews).
   Each diagram is an SVG in assets/diagrams/ (Cairo subset embedded, so it looks the same inside an <img>), drawn by Tab from the
   lesson text already on the site; bilingual on the image itself (Arabic + French terms). The caption/alt follow the language switch.

   WHERE: every placement {p: page, k: lesson <details> id ("" = the page's .prose.tbody, henderson), c: the Arabic start of the anchor
   block, m: before | after | end (= after the anchor's whole section, i.e. before the next heading of the same level or the end of that
   part), n: the anchor's index among the lesson's own blocks (all its parts, ✂️ split or not, injected rows ignored) — language-proof,
   so «Français seulement» lands on the same spot}. Runs only after ✂️ splitPage (it cuts by child count), never before.
   The figure is data-nohl (🖍️ skips it, offsets unchanged) and data-nofr (the page translator leaves it; captions come from here).
   TAP = fullscreen viewer: pinch / double-tap / ➕➖ zoom, drag to move, ✕ or the phone's back button or Esc closes.

   ➕ HOW TO ADD ONE: drop the .svg in assets/diagrams/, add a line below (n = -1 is fine: the Arabic start "c" is then used). */
window.NURSIN_DIAGRAMS = [
  {"id": "rea-chocs", "f": "rea-chocs.svg", "s": "rea", "l": "rea:r4", "w": 360, "h": 1255, "ar": "الصدمات: نقص الحجم، الانسدادية، العصبية", "fr": "Les chocs : hypovolémique, obstructif, neurogène", "alt": "رسمة للصدمات الثلاث: الآلية خطوة خطوة، شو بيصير بالقلب والأوعية والجلد، العلامات والعلاج. العصبية: بطء القلب وجلد جاف ودافي.", "altfr": "Schéma des 3 chocs : mécanisme, cœur/vaisseaux/peau, signes et traitement. Neurogène : bradycardie, peau sèche et chaude.", "at": [{"l": "rea:r4", "p": "rea.html", "k": "r4", "c": "🩸 أ) صدمة نقص الحجم", "m": "before", "n": 2}]},
  {"id": "rea-abg", "f": "rea-abg.svg", "s": "rea", "l": "rea:r1", "w": 360, "h": 960, "ar": "غازات الدم: القيم الطبيعية والاضطرابات الأربعة والتعويض", "fr": "Gaz du sang : valeurs normales, 4 troubles, compensation", "alt": "جدول قراءة غازات الدم: القيم الطبيعية لـ pH وPaCO₂ وHCO₃⁻، قاعدة ROME، الحماض والقلاء التنفسي والأيضي مع التعويض.", "altfr": "Tableau de lecture des gaz du sang : normes pH, PaCO₂, HCO₃⁻, règle ROME, acidoses/alcaloses respiratoires et métaboliques et compensation.", "at": [{"l": "rea:r1", "p": "rea.html", "k": "r1", "c": "📊 ملخّص الاضطرابات", "m": "end", "n": 46}, {"l": "rea:r2", "p": "rea.html", "k": "r2", "c": "⚖️ الجانب التنفّسي والجانب الأيضي", "m": "end", "n": 8}]},
  {"id": "rea-solutes", "f": "rea-solutes.svg", "s": "rea", "l": "rea:r3", "w": 360, "h": 924, "ar": "المحاليل الوريدية وشو بيصير بالخلية", "fr": "Solutés de perfusion : hyper, iso, hypotonique", "alt": "ثلاث خلايا: بالمحلول مرتفع التوتّر بتصغر، بالمتساوي بتضل متل ما هي، بالمنخفض بتنفخ، مع الأمثلة والدواعي والموانع.", "altfr": "Trois cellules : hypertonique = la cellule rétrécit, isotonique = inchangée, hypotonique = elle gonfle ; exemples, indications, contre-indications.", "at": [{"l": "rea:r3", "p": "rea.html", "k": "r3", "c": "💧 ١. Cristalloïdes", "m": "end", "n": 2}, {"l": "medsurg:iv", "p": "medsurg.html", "k": "iv", "c": "💧 Osmolarité", "m": "end", "n": 22}]},
  {"id": "perf-catheters", "f": "perf-catheters.svg", "s": "medsurg", "l": "medsurg:iv", "w": 360, "h": 627, "ar": "قياسات الكانيولا وألوانها", "fr": "Intranulle : Gauge et couleur", "alt": "خمس كانيولات: 16 رمادي، 18 أخضر، 20 زهري، 22 أزرق، 24 أصفر برتقالي. كل ما كبر الرقم صغر قطر الإبرة.", "altfr": "Cinq cathéters : 16 gris, 18 vert, 20 rose, 22 bleu, 24 jaune orangé. Plus le chiffre est grand, plus l’aiguille est fine.", "at": [{"l": "medsurg:iv", "p": "medsurg.html", "k": "iv", "c": "1- Infiltration", "m": "end", "n": 4}]},
  {"id": "geri-escarres", "f": "geri-escarres.svg", "s": "geri", "l": "geri:g6", "w": 360, "h": 989, "ar": "قرحة الفراش: المناطق والمراحل", "fr": "Escarre : zones et stades", "alt": "جسم من الضهر عليه المناطق الأكثر عرضة (الكتفين، المرفقان، الوركين، العجزية، الكعبين) والمراحل الأربعة كمقطع بالجلد.", "altfr": "Silhouette de dos avec les zones à risque (épaules, coudes, hanches, sacrum, talons) et les 4 stades en coupe de peau.", "at": [{"l": "geri:g6", "p": "geri.html", "k": "g6", "c": "المرحلة : 4", "m": "end", "n": 44}]},
  {"id": "comm-vaccins", "f": "comm-vaccins.svg", "s": "comm", "l": "comm:c8", "w": 360, "h": 978, "ar": "رزنامة اللقاحات بلبنان", "fr": "Calendrier vaccinal national — Liban", "alt": "خط زمني للبرنامج الوطني للقاحات: الولادة، شهرين، 4 و6 أشهر، 9 و12 و18 شهر، ثم التكرار بعمر 4–5 و10–12 و16–18 سنة.", "altfr": "Frise du calendrier vaccinal libanais : naissance, 2-4-6 mois, 9, 12, 18 mois, puis rappels à 4–5, 10–12 et 16–18 ans.", "at": [{"l": "comm:c8", "p": "community.html", "k": "c8", "c": "البرنامج الوطني للقاحات في لبنان", "m": "end", "n": 87}]},
  {"id": "cardio-6p", "f": "cardio-6p.svg", "s": "cardio", "l": "cardio:embolie", "w": 360, "h": 864, "ar": "الجلطة الشريانية: علامات الـ 6P ووضعية الإجر", "fr": "Embolie artérielle : les 6P et position de la jambe", "alt": "الـ 6P (وجع مفاجئ، شحوب، ما في نبض، تنميل، شلل، برودة) ومقارنة: جلطة الوريد منرفع الإجر، جلطة الشريان ما منرفعها.", "altfr": "Les 6P (douleur brutale, pâleur, pouls absent, paresthésie, paralysie, froideur) et comparaison : TVP on surélève, embolie artérielle on ne surélève pas.", "at": [{"l": "cardio:embolie", "p": "cardio.html", "k": "embolie", "c": "Douleur brutale", "m": "after", "n": 3}]},
  {"id": "cardio-ecg-qrs", "f": "cardio-ecg-qrs.svg", "s": "cardio", "l": "cardio:arythmies", "w": 360, "h": 827, "ar": "الـ QRS: ضيّق ولّا عريض؟", "fr": "QRS fin ou large", "alt": "تخطيطين على ورق المربّعات: QRS ضيّق (أقل من 3 مربعات) = فوق بطيني، QRS عريض (3 مربعات أو أكتر) = بطيني وخطير.", "altfr": "Deux tracés : QRS fin (< 3 petits carreaux, < 0,12 s) = supraventriculaire ; QRS large (≥ 3 carreaux) = ventriculaire, dangereux.", "at": [{"l": "cardio:arythmies", "p": "cardio.html", "k": "arythmies", "c": "كيف منصنّف الاضطراب", "m": "end", "n": 3}]},
  {"id": "comm-prevention", "f": "comm-prevention.svg", "s": "comm", "l": "comm:c2", "w": 360, "h": 988, "ar": "مستويات الوقاية الثلاثة", "fr": "Les 3 niveaux de prévention", "alt": "الوقاية الأولية قبل حدوث المرض، الثانوية للكشف المبكر، الثالثة بعد التشخيص، مع التعريف والهدف والأنشطة من الدرس.", "altfr": "Prévention primaire (avant la maladie), secondaire (dépistage précoce), tertiaire (après le diagnostic) : définition, objectif, activités.", "at": [{"l": "comm:c2", "p": "community.html", "k": "c2", "c": "مستويات الوقاية:", "m": "end", "n": 12}]},
  {"id": "henderson-14", "f": "henderson-14.svg", "s": "henderson", "l": "henderson:h1", "w": 360, "h": 688, "ar": "حاجات Henderson الـ ١٤ بالاسم", "fr": "Les 14 besoins fondamentaux de Henderson", "alt": "شبكة الحاجات الـ 14 لـ Virginia Henderson، كل حاجة باسمها الفرنسي ومعناها بالعربي.", "altfr": "Grille des 14 besoins de Virginia Henderson, chaque besoin par son nom français et sa traduction arabe.", "at": [{"l": "henderson:h1", "p": "henderson.html", "k": "", "c": "💡الفكرة", "m": "after", "n": 1}]},
  {"id": "comm-depistage", "f": "comm-depistage.svg", "s": "comm", "l": "comm:c7", "w": 360, "h": 711, "ar": "الكشف المبكر عن السرطان: إيمتى؟", "fr": "Dépistage précoce des cancers", "alt": "إيمتى الفحص: الثدي (ذاتي كل شهر، سريري كل سنة، ماموغرافيا من 40)، عنق الرحم (Frottis كل 3 سنين من 25)، القولون (دم خفي سنوياً، تنظير من 50)، الجلد.", "altfr": "Quand dépister : sein (autopalpation mensuelle, examen annuel, mammographie dès 40 ans), col (frottis /3 ans dès 25 ans), côlon (sang occulte annuel, coloscopie dès 50 ans), peau.", "at": [{"l": "comm:c7", "p": "community.html", "k": "c7", "c": "سرطان القولون والمستقيم", "m": "end", "n": 138}]},
  {"id": "geri-deshydratation", "f": "geri-deshydratation.svg", "s": "geri", "l": "geri:g3", "w": 360, "h": 748, "ar": "أنواع الجفاف عند المسن", "fr": "Déshydratation du sujet âgé : 3 types", "alt": "ثلاث أنواع جفاف: متساوي التوتر (ماء وأملاح بالتساوي)، ناقص التوتر (أملاح أكتر)، زائد التوتر (ماء أكتر، الأكثر شيوعاً عند المسنين).", "altfr": "Trois déshydratations : isotonique (eau et sels à parts égales), hypotonique (plus de sels), hypertonique (plus d’eau, la plus fréquente chez le sujet âgé).", "at": [{"l": "geri:g3", "p": "geri.html", "k": "g3", "c": "3. جفاف زائد التوتر", "m": "end", "n": 50}]}
];

(function (w, d) {
  var V = "20261029a", DG = w.NURSIN_DIAGRAMS || [];
  var page = (location.pathname.split("/").pop() || "index.html");
  var INJ = ".nlrow,.rtrow,.xtrk,.glk-card,.lqz,.lsk,.prq,.ndg,[class*='adx'],ins,script,style";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(a, f) { return FR() ? f : a; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function src(x) { return x.url ? x.url : "assets/diagrams/" + x.f + "?v=" + V; }   // x.url: another picture in the same viewer (📌 homework.html: the teacher's photo)
  function title(x) { return FR() ? x.fr : x.ar; }
  function alt(x) { return FR() ? x.altfr : x.alt; }

  /* the lesson's text bodies, in order: its <details> and its ✂️ parts (id-p2, id-p3 …); "" = the page's main .prose.tbody */
  function bodies(k) {
    if (!k) { var r = d.querySelector("main .prose.tbody") || d.querySelector(".prose.tbody"); return r ? [r] : []; }
    var out = [], el = d.getElementById(k), i = 2;
    while (el) { var b = el.tagName === "DETAILS" ? el.querySelector(":scope > .tbody") : el; if (b) out.push(b); el = d.getElementById(k + "-p" + i++); }
    return out;
  }
  function own(c) { return c && c.nodeType === 1 && !c.matches(INJ); }
  function blocks(k) { var a = []; bodies(k).forEach(function (b) { [].forEach.call(b.children, function (c) { if (own(c)) a.push(c); }); }); return a; }
  function level(el) { var m = /^H([1-6])$/.exec(el.tagName); if (m) return +m[1]; return el.classList && el.classList.contains("qlab") ? 6 : 9; }
  function starts(el, c) { return norm(el.textContent).indexOf(norm(c)) === 0; }
  function anchor(a) {
    var bl = blocks(a.k), x = a.n >= 0 ? bl[a.n] : null;
    if (x && (FR() || !a.c || starts(x, a.c))) return x;
    if (!FR() && a.c) for (var i = 0; i < bl.length; i++) if (starts(bl[i], a.c)) return bl[i];
    return x || null;                                   // FR without a valid index: give up rather than guess
  }
  function ready(a) {                                   // ✂️ wait for splitPage (it cuts the lesson by its child count)
    var NL = w.NursinLessons, st = NL && NL.SPLIT && NL.SPLIT[a.l];
    if (!a.k || !st) return true;
    var el = d.getElementById(a.k); return !!(el && el.getAttribute("data-split"));
  }
  function fig(x, a) {
    var f = d.createElement("figure");
    f.className = "ndg"; f.setAttribute("data-nohl", ""); f.setAttribute("data-nofr", ""); f.setAttribute("data-ndg", x.id); f.setAttribute("data-ndgl", a.l);
    f.setAttribute("dir", FR() ? "ltr" : "rtl");
    f.innerHTML = '<button class="ndgb" type="button" aria-label="' + esc(T("كبّر الرسمة: ", "Agrandir le schéma : ") + title(x)) + '">' +
      '<img src="' + src(x) + '" alt="' + esc(alt(x)) + '" width="' + x.w + '" height="' + x.h + '" loading="lazy" decoding="async">' +
      '<span class="ndgz" aria-hidden="true">🔍</span></button>' +
      '<figcaption><b>🖼️ ' + esc(title(x)) + '</b><small>' + esc(T("اكبس عالرسمة لتكبّرها", "Touche le schéma pour l’agrandir")) + "</small></figcaption>";
    f.querySelector(".ndgb").addEventListener("click", function () { open(x, f.querySelector(".ndgb")); });
    return f;
  }
  function place(x, a) {
    if (d.querySelector('figure.ndg[data-ndg="' + x.id + '"][data-ndgl="' + a.l + '"]')) return true;
    var el = anchor(a); if (!el) return false;
    var f = fig(x, a);
    if (a.m === "before") el.parentNode.insertBefore(f, el);
    else if (a.m === "after") el.parentNode.insertBefore(f, el.nextSibling);
    else {                                              // end of the anchor's section (inside the same part)
      var lv = level(el), last = el;
      for (var s = el.nextElementSibling; s; s = s.nextElementSibling) { if (!own(s) || level(s) <= lv) break; last = s; }
      last.parentNode.insertBefore(f, last.nextSibling);
    }
    // 🔒 signed-out gate (assets/gate.js): a figure that lands inside the locked part of a lesson is locked with it
    var pv = f.previousElementSibling, nx = f.nextElementSibling;
    if ((pv && pv.classList.contains("glk-x")) || (nx && (nx.classList.contains("glk-x") || nx.classList.contains("glk-tz")))) f.classList.add("glk-x");
    return true;
  }
  var tries = 0;
  function mount() {
    var left = 0;
    DG.forEach(function (x) { (x.at || []).forEach(function (a) { if (a.p !== page) return; if (!ready(a) && tries < 40) { left++; return; } if (!place(x, a)) left++; }); });
    if (left && tries++ < 40) setTimeout(mount, 250);
  }

  /* ---------------- 🔍 fullscreen viewer ---------------- */
  var V0 = null;
  function open(x, from) {
    if (V0) close(true);
    var o = d.createElement("div"); o.className = "ndgv"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", title(x));
    o.setAttribute("data-nohl", ""); o.setAttribute("data-nofr", ""); o.setAttribute("dir", FR() ? "ltr" : "rtl");
    o.innerHTML = '<div class="ndgvh"><b>' + esc(title(x)) + '</b><span class="ndgvt"><button type="button" class="ndgvo" aria-label="' + T("صغّر", "Réduire") + '">−</button><button type="button" class="ndgvi" aria-label="' + T("كبّر", "Agrandir") + '">+</button><button type="button" class="ndgvx" aria-label="' + T("سكّر", "Fermer") + '">✕</button></span></div>' +
      '<div class="ndgvs"><img src="' + src(x) + '" alt="' + esc(alt(x)) + '" width="' + x.w + '" height="' + x.h + '" draggable="false"></div>' +
      '<p class="ndgvhint">' + esc(T("👆 كبسة مرتين أو قرّب بإصبعين لتكبّر · اسحب لتتنقّل", "👆 Double-touche ou pince pour zoomer · glisse pour te déplacer")) + "</p>";
    d.body.appendChild(o); d.documentElement.classList.add("ndgon");
    var st = o.querySelector(".ndgvs"), im = st.querySelector("img"), z = 1, ratio = x.h / x.w;
    V0 = { o: o, from: from, pushed: false };
    function fitW() { var W = st.clientWidth, H = st.clientHeight; return Math.min(W, Math.max(H / ratio, 640)); }   // phone: full width; desktop: ≥640px or the whole height
    function setZ(nz, cx, cy) {                         // zoom around a point of the stage (cx, cy = stage coords)
      nz = Math.max(1, Math.min(5, nz)); var r = st.getBoundingClientRect();
      if (cx == null) { cx = r.width / 2; cy = r.height / 2; }
      var ox = (st.scrollLeft + cx) / (im.offsetWidth || 1), oy = (st.scrollTop + cy) / (im.offsetHeight || 1);
      z = nz; im.style.width = Math.round(fitW() * z) + "px";
      st.scrollLeft = ox * im.offsetWidth - cx; st.scrollTop = oy * im.offsetHeight - cy;
      o.classList.toggle("zoomed", z > 1.01);
    }
    im.style.width = Math.round(fitW()) + "px"; st.scrollTop = 0; st.scrollLeft = 0;
    o.querySelector(".ndgvx").addEventListener("click", function () { close(); });
    o.querySelector(".ndgvi").addEventListener("click", function () { setZ(z * 1.5); });
    o.querySelector(".ndgvo").addEventListener("click", function () { setZ(z / 1.5); });
    // pinch (2 fingers) — native scroll does the panning
    var p0 = 0, z0 = 1, mid = null, lastTap = 0;
    function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    function rel(cx, cy) { var r = st.getBoundingClientRect(); return [cx - r.left, cy - r.top]; }
    st.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) { p0 = dist(e.touches); z0 = z; mid = rel((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2); e.preventDefault(); }
      else if (e.touches.length === 1) {
        var now = Date.now(), t = e.touches[0];
        if (now - lastTap < 300) { var q = rel(t.clientX, t.clientY); setZ(z > 1.01 ? 1 : 2.5, q[0], q[1]); e.preventDefault(); lastTap = 0; } else lastTap = now;
      }
    }, { passive: false });
    st.addEventListener("touchmove", function (e) { if (e.touches.length === 2 && p0) { e.preventDefault(); setZ(z0 * dist(e.touches) / p0, mid[0], mid[1]); } }, { passive: false });
    st.addEventListener("touchend", function (e) { if (e.touches.length < 2) p0 = 0; });
    st.addEventListener("dblclick", function (e) { var q = rel(e.clientX, e.clientY); setZ(z > 1.01 ? 1 : 2.5, q[0], q[1]); });
    st.addEventListener("wheel", function (e) { if (!e.ctrlKey) return; e.preventDefault(); var q = rel(e.clientX, e.clientY); setZ(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), q[0], q[1]); }, { passive: false });
    // mouse drag to pan (desktop)
    var drag = null;
    st.addEventListener("mousedown", function (e) { if (e.button) return; drag = [e.clientX, e.clientY, st.scrollLeft, st.scrollTop]; st.classList.add("grab"); e.preventDefault(); });
    w.addEventListener("mousemove", mm); w.addEventListener("mouseup", mu);
    function mm(e) { if (!drag) return; st.scrollLeft = drag[2] - (e.clientX - drag[0]); st.scrollTop = drag[3] - (e.clientY - drag[1]); }
    function mu() { drag = null; st.classList.remove("grab"); }
    V0.off = function () { w.removeEventListener("mousemove", mm); w.removeEventListener("mouseup", mu); w.removeEventListener("resize", rs); };
    function rs() { setZ(z); }
    w.addEventListener("resize", rs);
    // 📱 back button closes the viewer (not the page)
    try { history.pushState({ ndg: x.id }, ""); V0.pushed = true; } catch (e) {}
    setTimeout(function () { var b = o.querySelector(".ndgvx"); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 50);
  }
  function close(silent) {
    var v = V0; if (!v) return; V0 = null;
    if (v.off) v.off();
    v.o.remove(); d.documentElement.classList.remove("ndgon");
    if (v.pushed && !silent && history.state && history.state.ndg) { try { history.back(); } catch (e) {} }
    if (v.from && v.from.focus) try { v.from.focus({ preventScroll: true }); } catch (e) {}
  }
  w.addEventListener("popstate", function () { if (V0) { V0.pushed = false; close(true); } });
  d.addEventListener("keydown", function (e) { if (V0 && (e.key === "Escape" || e.key === "Esc")) close(); });

  /* 🖼️ «رسومات الدروس» on حفظي (hifzi.html #ndggal): every diagram as a card — tap = the viewer, «📖 الدرس» = its lesson */
  var SUBJ = { rea: ["🚑", "الإنعاش", "Réa"], medsurg: ["💉", "Med-Surg", "Med-Surg"], geri: ["👵", "طب الشيخوخة", "Gériatrie"], comm: ["🏘️", "صحة المجتمع", "Santé communautaire"], cardio: ["❤️", "القلب", "Cardio"], henderson: ["🧩", "Henderson", "Henderson"] };
  function lessonHref(a) { return a.p + (a.k ? "#" + a.k : ""); }
  function gallery() {
    var g = d.getElementById("ndggal"); if (!g || g.getAttribute("data-on")) return;
    g.setAttribute("data-on", "1"); g.setAttribute("data-nofr", ""); g.setAttribute("data-nohl", "");
    g.innerHTML = '<h2>🖼️ ' + esc(T("رسومات الدروس", "Schémas des leçons")) + ' <small>' + DG.length + '</small></h2><p class="small">' +
      esc(T("كل الرسمات يلي بالدروس بمحل واحد: اكبس عالرسمة لتكبّرها، أو روح عالدرس.", "Tous les schémas des leçons au même endroit : touche pour agrandir, ou va à la leçon.")) + '</p><div class="ndggrid">' +
      DG.map(function (x, i) { var s = SUBJ[x.s] || ["📚", x.s, x.s], a = x.at[0];
        return '<div class="ndgcard"><button type="button" class="ndgth" data-i="' + i + '" aria-label="' + esc(T("كبّر الرسمة: ", "Agrandir le schéma : ") + title(x)) + '"><img src="' + src(x) + '" alt="' + esc(alt(x)) + '" width="' + x.w + '" height="' + x.h + '" loading="lazy" decoding="async"></button>' +
          '<p class="ndgct"><b>' + esc(title(x)) + '</b><small>' + s[0] + " " + esc(FR() ? s[2] : s[1]) + '</small></p><a class="btn sm" href="' + esc(lessonHref(a)) + '">📖 ' + esc(T("الدرس", "La leçon")) + "</a></div>"; }).join("") + "</div>";
    [].forEach.call(g.querySelectorAll(".ndgth"), function (b) { b.addEventListener("click", function () {
      if (d.documentElement.classList.contains("gl-out")) { var a = b.parentNode.querySelector("a"); if (a) location.href = a.href; return; }   // 🔒 signed out: lessons are locked (gate.js) → its lesson asks to sign in
      open(DG[+b.getAttribute("data-i")], b); }); });
    var nl = d.querySelector(".nlink");
    if (nl && !nl.querySelector("[data-ndgl]")) { var l = d.createElement("a"); l.className = "btn sm"; l.href = "#ndggal"; l.setAttribute("data-ndgl", ""); l.setAttribute("data-nofr", ""); l.textContent = T("🖼️ رسومات", "🖼️ Schémas"); nl.appendChild(d.createTextNode(" ")); nl.appendChild(l); }
  }

  w.NursinDiagrams = { list: DG, mount: mount, open: open, close: close, blocks: blocks, anchor: anchor, src: src, gallery: gallery, forLesson: function (l) { return DG.filter(function (x) { return (x.at || []).some(function (a) { return a.l === l; }); }); } };
  function boot() { gallery(); mount(); }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); }); else setTimeout(boot, 0);
  w.addEventListener("load", function () { tries = Math.min(tries, 30); mount(); });
})(window, document);
