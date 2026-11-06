/* 🗺️ الخرائط الذهنية — mind maps (Abdullah, Nov 6 2026 9:56 PM: «الخريطة… تنحط من فوق حد المواد… بس فوت على الخرائط الذهنية
   بضغط على كلمة المادة وبعدين الدرس وبينفتح عنه المحتوى الخاص فيه»).
   mindmap.html: ① the subjects → ② that subject's lessons (assets/lessons.js registry) → ③ the lesson's map: the lesson in the
   centre, its sections as branches, 2–5 key terms under each — all taken from the lesson as drawn on its page (assets/mm-<subject>.js,
   loaded only when that subject is opened). Tap a branch = a short preview of that section + «افتح بالدرس ←»; tap a key term = the
   lesson opens at that part (the same anchors as «📖 ارجع للدرس»). A lesson with no sections = its title + one «افتح الدرس» node.
   Local only: no Firestore, no ads, no animation. Remembers the last subject (localStorage nursin_mm_v1). ES2017-safe (iOS 12). */
(function (w, d) {
  var KEY = "nursin_mm_v1";
  var EMO = { cardio: "🫀", neuro: "🧠", henderson: "🧩", medsurg: "💉", rea: "🚑", pharma: "💊", law: "⚖️", mgmt: "🏢", quality: "✅", geri: "👴", comm: "🏘️" };
  var ORDER = ["cardio", "neuro", "henderson", "medsurg", "pharma", "rea", "geri", "comm", "law", "mgmt", "quality"];
  var MS = ["cardio", "neuro", "henderson", "medsurg"];                 // 🏥 Med-Surg (القلب، الأعصاب، Henderson، التسريب + دروس 6/11)
  var HUE = ["#0f766e", "#7c3aed", "#c2410c", "#be123c", "#1d4ed8", "#4d7c0f"];
  var TAG = (function () { var s = d && d.currentScript && d.currentScript.src, m = s && /[?&]v=([\w-]+)/.exec(s); return m ? m[1] : ""; })();
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(a, f) { return FR() ? f : a; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function NL() { return w.NLESSONS || {}; }
  function lid(l) { return l.s + ":" + (l.l || l.t); }
  function lessons(s) { return (NL().list || []).filter(function (l) { return l.s === s; }); }
  function subjects() { var S = NL().subjects || {}, o = ORDER.filter(function (k) { return S[k] && lessons(k).length; }); Object.keys(S).forEach(function (k) { if (o.indexOf(k) < 0 && lessons(k).length) o.push(k); }); return o; }
  function sname(s) {
    var x = (NL().subjects || {})[s] || {};
    if (s === "medsurg") return T("Med-Surg: التسريب + دروس جديدة", "Med-Surg (التسريب) : perfusion + nouvelles leçons");
    return x.ar && x.fr && x.ar.indexOf(x.fr) < 0 ? x.ar + " (" + x.fr + ")" : (x.ar || s);
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  // ---- data (one small file per subject, loaded on demand) ----
  var asked = {};
  function need(s, cb) {
    var M = w.NMM || {}; if (M[s]) return cb();
    var sc = d.createElement("script"); sc.src = "assets/mm-" + s + ".js" + (TAG ? "?v=" + TAG : "");
    var done = false, fin = function () { if (!done) { done = true; cb(); } };
    sc.onload = fin; sc.onerror = fin; setTimeout(fin, 6000); asked[s] = 1; (d.head || d.body).appendChild(sc);
  }
  // map(lessonId) → { n, h, b: [{t, h, x, l: [[term, href]]}] } — every href is the lesson's own anchor or one of its parts
  function map(id) {
    var L = NL().list || [], x = null, i;
    for (i = 0; i < L.length; i++) if (lid(L[i]) === id) x = L[i];
    if (!x) return null;
    var raw = ((w.NMM || {})[x.s] || {})[id] || [];
    return { n: x.n, s: x.s, h: x.href, b: raw.map(function (b) { return { t: b[0], h: b[1] || x.href, x: b[2] || "", l: (b[3] || []).map(function (y) { return [y[0], y[1] || b[1] || x.href]; }) }; }) };
  }
  // ---- state from the hash: #s=law · #l=law:l1 ----
  function st() { var h = decodeURIComponent((location.hash || "").slice(1)), m = /(?:^|&)l=([\w-]+:[\w-]+)/.exec(h), n = /(?:^|&)s=([\w-]+)/.exec(h); return { l: m ? m[1] : "", s: n ? n[1] : (m ? m[1].split(":")[0] : "") }; }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  var root;
  function head(title, back, extra) {
    return '<div class="mmhd">' + (back ? '<a class="mmbk" href="' + back[0] + '">→ ' + esc(back[1]) + "</a>" : "") + "<h1>" + title + "</h1>" + (extra || "") + "</div>";
  }
  function step1() {
    var last = load().s, S = subjects();
    var btn = function (s) { var n = lessons(s).length; return '<a class="mmsub' + (s === last ? " last" : "") + '" href="#s=' + s + '" data-mms="' + s + '"><span class="e" aria-hidden="true">' + (EMO[s] || "📘") + "</span><b>" + esc(sname(s)) + "</b><small>" + n + T(" دروس", " leçons (دروس)") + (s === last ? T(" · 📌 آخر مرة", " · 📌 dernière fois (آخر مرة)") : "") + "</small></a>"; };
    var ms = S.filter(function (s) { return MS.indexOf(s) > -1; }), rest = S.filter(function (s) { return MS.indexOf(s) < 0; });
    return head("🗺️ " + T("الخرائط الذهنية", "Cartes mentales (الخرائط الذهنية)"), null, '<p class="mmhint">' + T("① اختار المادة ← ② الدرس ← ③ خريطتو. كبوس أي فرع بتشوف شو فيه.", "① Matière ← ② leçon ← ③ sa carte. Touche une branche pour voir son contenu.") + "</p>") +
      (ms.length ? '<h2 class="mmgh">🏥 Med-Surg</h2><div class="mmgrid">' + ms.map(btn).join("") + "</div>" : "") +
      '<h2 class="mmgh">📚 ' + T("باقي المواد", "Autres matières (باقي المواد)") + '</h2><div class="mmgrid">' + rest.map(btn).join("") + "</div>";
  }
  function step2(s) {
    var L = lessons(s), M = (w.NMM || {})[s] || {}, S = (NL().subjects || {})[s] || {};
    return head((EMO[s] || "📘") + " " + esc(sname(s)), ["#", T("المواد", "Matières (المواد)")], S.page ? '<a class="mmpg" href="' + esc(S.page) + '">📖 ' + T("صفحة المادة", "Page de la matière (صفحة المادة)") + "</a>" : "") +
      '<p class="mmhint">' + T("② اختار الدرس:", "② Choisis la leçon (اختار الدرس) :") + '</p><div class="mmles">' + L.map(function (l, i) {
        var k = lid(l), nb = (M[k] || []).length;
        return '<a class="mmlesb" href="#l=' + esc(k) + '" data-mml="' + esc(k) + '"><span class="i">' + (i + 1) + "</span><b>" + esc(l.n) + "</b><small>" + (nb ? "🌿 " + nb + T(" فروع", " branches (فروع)") : "📖 " + T("درس قصير", "leçon courte (درس قصير)")) + "</small></a>";
      }).join("") + "</div>";
  }
  function step3(id) {
    var m = map(id); if (!m) return step1();
    var h = head("🗺️ " + T("خريطة الدرس", "Carte de la leçon (خريطة الدرس)"), ["#s=" + m.s, sname(m.s)]), pg = m.h.split("#")[0];
    var first = (NL().list || []).filter(function (l) { return l.href.split("#")[0] === pg; })[0];
    h += '<div class="mmap"' + (first && lid(first) !== id ? ' data-mmlock="1"' : "") + '><a class="mmc" href="' + esc(m.h) + '" data-mmn="c">' + esc(m.n) + "</a>";
    if (!m.b.length) h += '<ul class="mmtree"><li class="mmbr" style="--mmh:' + HUE[0] + '"><a class="mmbt mmone" href="' + esc(m.h) + '" data-mmn="o">📖 ' + T("افتح الدرس", "Ouvrir la leçon (افتح الدرس)") + "</a></li></ul>";
    else h += '<ul class="mmtree">' + m.b.map(function (b, i) {
      return '<li class="mmbr" style="--mmh:' + HUE[i % HUE.length] + '"><button type="button" class="mmbt" data-mmb="' + i + '" aria-expanded="false">' + esc(b.t) + "</button>" +
        (b.l.length ? '<div class="mmlv">' + b.l.map(function (y) { return '<a class="mmlf" href="' + esc(y[1]) + '" data-mmn="l">' + esc(y[0]) + "</a>"; }).join("") + "</div>" : "") +
        '<div class="mmpv" hidden><p>' + esc(b.x) + '</p><a class="mmgo" href="' + esc(b.h) + '" data-mmn="b">' + T("افتح بالدرس ←", "Ouvrir dans la leçon (افتح بالدرس) ←") + "</a></div></li>";
    }).join("") + "</ul>";
    return h + "</div>";
  }
  function render() {
    if (!root) return;
    var s0 = st(), o = load();
    if (s0.l) { o.s = s0.s; o.l = s0.l; save(o); return need(s0.s, function () { root.innerHTML = step3(s0.l); top(); }); }
    if (s0.s && lessons(s0.s).length) { o.s = s0.s; save(o); return need(s0.s, function () { root.innerHTML = step2(s0.s); top(); }); }
    root.innerHTML = step1(); top();
  }
  function top() { try { w.scrollTo(0, 0); } catch (e) {} }
  function style() {
    if (d.getElementById("mmcss")) return;
    var c = ".mmhd{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:4px 0 10px}.mmhd h1{flex:1 1 100%;margin:2px 0;font-size:21px}" +
      ".mmbk,.mmpg{font-weight:800;font-size:14px;text-decoration:none;padding:6px 12px;border-radius:99px;background:rgba(15,118,110,.1);color:#0f766e}" +
      ".mmhint{margin:0 0 8px;font-size:14px;opacity:.8}.mmgh{font-size:16px;margin:14px 2px 6px;border:0;padding:0}" +
      ".mmgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}" +
      ".mmsub,.mmlesb{display:flex;flex-direction:column;gap:2px;padding:11px 12px;border-radius:14px;border:1px solid rgba(127,127,127,.25);background:var(--card,#fff);color:inherit;text-decoration:none}" +
      ".mmsub .e{font-size:22px}.mmsub b,.mmlesb b{font-size:15px;line-height:1.35}.mmsub small,.mmlesb small{font-size:12px;opacity:.7}.mmsub.last{border-color:#0f766e;box-shadow:0 0 0 2px rgba(15,118,110,.25)}" +
      ".mmles{display:flex;flex-direction:column;gap:8px}.mmlesb{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 10px}.mmlesb .i{flex:0 0 26px;height:26px;border-radius:50%;background:#0f766e;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}.mmlesb b{flex:1 1 60%}" +
      ".mmap{padding:2px 0 18px}.mmc{display:block;text-align:center;font-weight:900;font-size:17px;padding:12px 14px;border-radius:18px;background:#0f766e;color:#fff;text-decoration:none;line-height:1.4}" +
      ".mmtree{list-style:none;margin:0 14px 0 0;padding:6px 0 0;border-right:3px solid rgba(15,118,110,.35)}" +
      ".mmbr{position:relative;margin:10px 0 0;padding-right:16px}.mmbr:before{content:'';position:absolute;right:0;top:20px;width:13px;border-top:3px solid var(--mmh)}" +
      ".mmbt{display:block;width:100%;text-align:start;font:inherit;font-weight:800;font-size:15px;line-height:1.4;padding:9px 12px;border-radius:12px;border:2px solid var(--mmh);background:var(--card,#fff);color:var(--mmh);cursor:pointer;text-decoration:none}" +
      ".mmbt[aria-expanded=true]{background:var(--mmh);color:#fff}.mmone{text-align:center}" +
      ".mmlv{display:flex;flex-wrap:wrap;gap:6px;margin:6px 10px 0 0}.mmlf{font-size:13px;line-height:1.35;padding:5px 10px;border-radius:99px;border:1px solid var(--mmh);color:inherit;text-decoration:none;background:rgba(127,127,127,.06)}" +
      ".mmpv{margin:6px 10px 0 0;padding:9px 11px;border-radius:12px;background:rgba(127,127,127,.08);font-size:14px;line-height:1.6}.mmpv p{margin:0 0 6px}.mmgo{font-weight:800;color:var(--mmh)}" +
      "@media(min-width:760px){.mmtree{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;border:0;margin:0}.mmbr:before{display:none}.mmbr{padding:0}}";
    var s = d.createElement("style"); s.id = "mmcss"; s.textContent = c; (d.head || d.documentElement).appendChild(s);
  }
  function boot() {
    root = d.getElementById("mm-app"); if (!root) return;
    style(); render();
    w.addEventListener("hashchange", render);
    root.addEventListener("click", function (e) {
      var t = e.target, b = t && t.closest ? t.closest("[data-mmb]") : null; if (!b) return;
      var pv = b.parentNode.querySelector(".mmpv"), open = b.getAttribute("aria-expanded") === "true";
      // signed out (assets/gate.js «gl-lock»): a locked lesson's text stays behind its sign-in card — the map shows only the way in
      var lock = d.documentElement.className.indexOf("gl-lock") > -1 && b.closest(".mmap").getAttribute("data-mmlock") === "1", p = pv && pv.querySelector("p");
      if (p) p.hidden = lock;
      b.setAttribute("aria-expanded", open ? "false" : "true"); if (pv) pv.hidden = open;
    });
  }
  w.NursinMM = { map: map, subjects: subjects, lessons: lessons, step1: step1, step2: step2, step3: step3, need: need, KEY: KEY, ORDER: ORDER };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
