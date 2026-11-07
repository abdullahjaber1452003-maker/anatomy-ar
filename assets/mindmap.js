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
  var HUE = ["#0f766e", "#7c3aed", "#c2410c", "#be123c", "#1d4ed8", "#4d7c0f", "#b45309", "#0e7490", "#a21caf", "#047857", "#4338ca", "#9f1239"];
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
        return '<a class="mmlesb" href="#l=' + esc(k) + '" data-mml="' + esc(k) + '"><span class="i">' + (i + 1) + "</span><b>" + bidi(esc(l.n)) + "</b><small>" + (nb ? "🌿 " + nb + T(" فروع", " branches (فروع)") : "📖 " + T("درس قصير", "leçon courte (درس قصير)")) + "</small></a>";
      }).join("") + "</div>";
  }
  // ---- ③ the drawn map (29w → 30a, Abdullah Nov 7 7:35–7:36 AM: «كخريطة… بتفحص عالشغلة بعدين بتفرع منها ٣–٤ شغلات»,
  //      «بكل فقسة مني بيطلعلي شي»): the lesson = a coloured circle in the centre; its sections = coloured pills on curved lines,
  //      alternating right/left; each one's key terms = smaller pills in its colour beyond it. Starts with the centre only:
  //      tap centre → branches grow out · tap a branch → its leaves (tap again = fold) · tap a leaf → bottom sheet (preview +
  //      «افتح بالدرس ←» + «✍️ اشرحلي بكلامك»). Pan (drag) + pinch / ＋ − buttons, fit to screen. SVG paths + absolutely placed
  //      HTML pills inside one CSS-transformed stage; touch + mouse events (no pointer events: iOS 12). No libraries, no loop.
  var BW = 138, LW = 152, G1 = 44, G2 = 38, VG = 10, BG = 18;
  // Latin parenthetical inside an Arabic title → one LTR isolate, so «(Coronarographie / Artériographie)» never breaks into «/)» … «(…»
  function bidi(s) { return String(s).replace(/\(([^()<>\u0600-\u06FF]*[A-Za-z\u00C0-\u024F][^()<>\u0600-\u06FF]*)\)/g, '<bdi dir="ltr" class="bdl">($1)</bdi>'); }
  function eb(s) { return bidi(esc(s)); }
  function cdia(m) { var n = String(m.n).length; return Math.round(Math.min(156, Math.max(112, 70 + n * 1.5))); }
  // rough height before the browser measures (13–14px text, ~0.55em a glyph)
  function est(t, wdt, fs, lh) { var cpl = Math.max(6, Math.floor((wdt - 24) / (fs * 0.55))), n = String(t).length; return Math.ceil(n / cpl) * lh + 16; }
  // lay(m, open, hgt) → {k: [x, y, w, h, shown]} for c, b<i>, l<i>_<j>: hidden nodes sit on their parent (they grow out of it)
  function lay(m, open, hgt) {
    var P = {}, D = cdia(m), on = !!open.c, sides = [[], []], si;
    var H = function (k, t, wdt, fs, lh) { return (hgt && hgt[k]) || est(t, wdt, fs, lh); };
    P.c = [0, 0, D, D, 1];
    m.b.forEach(function (b, i) { sides[i % 2].push(i); });
    for (si = 0; si < 2; si++) {
      var sg = si === 0 ? 1 : -1, ids = sides[si], blocks = [], tot = 0;
      ids.forEach(function (i) {
        var b = m.b[i], bh = H("b" + i, b.t, BW, 14, 20), lh = 0, lv = [];
        b.l.forEach(function (y, j) { var h = H("l" + i + "_" + j, y[0], LW, 13, 18); lv.push(h); lh += h + (j ? VG : 0); });
        var blk = open["b" + i] ? Math.max(bh, lh) : bh; blocks.push([i, bh, lv, lh, blk]); tot += blk;
      });
      tot += BG * Math.max(0, blocks.length - 1);
      var y0 = -tot / 2, bx = sg * (D / 2 + G1 + BW / 2), lx = sg * (D / 2 + G1 + BW + G2 + LW / 2);
      blocks.forEach(function (q) {
        var i = q[0], by = y0 + q[4] / 2, ly = by - q[3] / 2;
        P["b" + i] = on ? [bx, by, BW, q[1], 1] : [0, 0, BW, q[1], 0];
        q[2].forEach(function (h, j) {
          var shown = on && !!open["b" + i];
          P["l" + i + "_" + j] = shown ? [lx, ly + h / 2, LW, h, 1] : [P["b" + i][0], P["b" + i][1], LW, h, 0];
          ly += h + VG;
        });
        y0 += q[4] + BG;
      });
    }
    return P;
  }
  // a smooth S-curve from a parent's edge to a child's edge (same side)
  function curve(p, c, fromC) {
    var sg = c[0] >= p[0] ? 1 : -1, x1 = fromC ? p[0] + sg * p[2] * 0.3 : p[0] + sg * p[2] / 2, y1 = p[1], x2 = c[0] - sg * c[2] / 2, y2 = c[1], mx = (x1 + x2) / 2;
    return "M" + x1.toFixed(1) + " " + y1.toFixed(1) + "C" + mx.toFixed(1) + " " + y1.toFixed(1) + " " + mx.toFixed(1) + " " + y2.toFixed(1) + " " + x2.toFixed(1) + " " + y2.toFixed(1);
  }
  function sheet(m, i, j) {
    var b = m.b[i]; if (!b) return "";
    var leaf = j != null && b.l[j], t = leaf ? leaf[0] : b.t, href = leaf ? leaf[1] : b.h;
    return '<div class="mmshh"><b dir="auto">' + eb(t) + '</b><button type="button" class="mmx" data-mma="close" aria-label="' + T("سكّر", "Fermer (سكّر)") + '">✕</button></div>' +
      (leaf ? '<small class="mmshf" style="color:' + HUE[i % HUE.length] + '">🌿 ' + eb(b.t) + "</small>" : "") +
      '<p class="mmshp">' + esc(b.x) + '</p><p class="mmsha"><a class="mmgo" href="' + esc(href) + '" data-mmn="b">' + T("افتح بالدرس ←", "Ouvrir dans la leçon (افتح بالدرس) ←") + '</a> <button type="button" class="btn sm exbtn" data-exm="' + i + '">' + T("✍️ اشرحلي بكلامك", "✍️ Explique avec tes mots (اشرحلي بكلامك)") + "</button></p>";
  }
  function step3(id) {
    var m = map(id); if (!m) return step1();
    var pg = m.h.split("#")[0], first = (NL().list || []).filter(function (l) { return l.href.split("#")[0] === pg; })[0];
    var h = head("🗺️ " + T("خريطة الدرس", "Carte de la leçon (خريطة الدرس)"), ["#s=" + m.s, sname(m.s)], '<a class="mmpg" href="' + esc(m.h) + '">📖 ' + T("افتح الدرس", "Ouvrir la leçon (افتح الدرس)") + "</a>");
    var P = lay(m, {}, null), D = cdia(m);
    h += '<div class="mmap" data-mmid="' + esc(id) + '"' + (first && lid(first) !== id ? ' data-mmlock="1"' : "") + ">" +
      '<div class="mmbar"><button type="button" class="btn sm" data-mma="all">🌳 ' + T("افتح الكل", "Tout ouvrir (افتح الكل)") + '</button><button type="button" class="btn sm" data-mma="reset">↺ ' + T("من الأول", "Recommencer (من الأول)") + '</button>' +
      '<span class="mmz"><button type="button" class="btn sm" data-mma="in" aria-label="zoom +">＋</button><button type="button" class="btn sm" data-mma="out" aria-label="zoom −">－</button><button type="button" class="btn sm" data-mma="fit" aria-label="' + T("كل الخريطة عالشاشة", "Ajuster (كل الخريطة)") + '">⤢</button></span></div>' +
      '<div class="mmvp"><div class="mmst"><svg class="mmsv" width="1" height="1" aria-hidden="true">';
    m.b.forEach(function (b, i) {
      var c = HUE[i % HUE.length];
      h += '<path class="mmpb" data-p="b' + i + '" stroke="' + c + '" d="' + curve(P.c, P["b" + i], 1) + '"/>';
      b.l.forEach(function (y, j) { h += '<path class="mmpl" data-p="l' + i + "_" + j + '" stroke="' + c + '" d="' + curve(P["b" + i], P["l" + i + "_" + j]) + '"/>'; });
    });
    h += "</svg>";
    m.b.forEach(function (b, i) {
      var c = HUE[i % HUE.length];
      b.l.forEach(function (y, j) { h += '<button type="button" class="mmn mmlf" data-mmn="l" data-mmf="' + i + "_" + j + '" dir="auto" style="width:' + LW + "px;border-color:" + c + '" tabindex="-1">' + eb(y[0]) + "</button>"; });
      h += '<button type="button" class="mmn mmbt" data-mmn="b" data-mmb="' + i + '" aria-expanded="false" dir="auto" style="width:' + BW + "px;background:" + c + '" tabindex="-1">' + eb(b.t) + (b.l.length ? '<small class="mmct">+' + b.l.length + "</small>" : "") + "</button>";
    });
    if (!m.b.length) h += '<a class="mmn mmbt mmone" data-mmn="o" href="' + esc(m.h) + '" style="width:' + BW + 'px;background:' + HUE[0] + '">📖 ' + T("افتح الدرس", "Ouvrir la leçon (افتح الدرس)") + "</a>";
    h += '<button type="button" class="mmn mmc on" data-mmn="c" aria-expanded="false" style="width:' + D + "px;height:" + D + 'px"><span>' + eb(m.n) + '</span><small class="mmtap">' + T("اكبس 👆", "Touche 👆 (اكبس)") + "</small></button>";
    return h + '</div></div><div class="mmsh" role="dialog" aria-live="polite"></div></div>';
  }
  // ---- the live map: state, measured layout, short tween (≤ 260 ms, then nothing runs), pan / pinch / zoom, the sheet ----
  var V = null;   // { m, ap, vp, st, nodes, paths, open, hgt, pos, s, x, y }
  var raf = w.requestAnimationFrame ? function (f) { return w.requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };
  var DUR = 260;
  function tfOk(el) { var s = el && el.style; return !!s && ("transform" in s || "webkitTransform" in s); }
  function setTf(el, v) { el.style.webkitTransform = v; el.style.transform = v; }
  function wire(id) {
    var ap = root.querySelector(".mmap"), m = map(id); if (!ap || !m) return;
    V = { m: m, ap: ap, vp: ap.querySelector(".mmvp"), st: ap.querySelector(".mmst"), nodes: {}, paths: {}, open: {}, hgt: {}, pos: null, s: 1, x: 0, y: 0 };
    Array.prototype.forEach.call(ap.querySelectorAll(".mmn"), function (n) {
      var k = n.getAttribute("data-mmn") === "c" ? "c" : n.hasAttribute("data-mmb") ? "b" + n.getAttribute("data-mmb") : n.hasAttribute("data-mmf") ? "l" + n.getAttribute("data-mmf") : "o";
      V.nodes[k] = n; V.hgt[k] = n.offsetHeight || 0;
    });
    Array.prototype.forEach.call(ap.querySelectorAll("path[data-p]"), function (p) { V.paths[p.getAttribute("data-p")] = p; });
    if (!tfOk(V.st)) { ap.className += " mmstatic"; V.open = allOpen(); place(target(), 1); return staticFit(); }
    place(target(), 1); view(fitBox(["c"]), 0);
    // the map is the content: bring its toolbar under the site header so the centre is in sight above the bottom bar
    try { var r = ap.getBoundingClientRect(); if (r.top > 90) w.scrollTo(0, r.top + (w.pageYOffset || 0) - 64); } catch (e) {}
  }
  function allOpen() { var o = { c: 1 }; V.m.b.forEach(function (b, i) { o["b" + i] = 1; }); return o; }
  function target() {
    var P = lay(V.m, V.open, V.hgt), D = cdia(V.m);
    if (V.nodes.o) P.o = V.open.c ? [0, D / 2 + 44, BW, V.hgt.o || 44, 1] : [0, 0, BW, V.hgt.o || 44, 0];
    return P;
  }
  // draw positions P (no tween) + their curves
  function draw(P) {
    var k, n, p;
    for (k in V.nodes) { n = V.nodes[k]; p = P[k]; if (!p) continue; n.style.left = p[0].toFixed(1) + "px"; n.style.top = p[1].toFixed(1) + "px"; }
    for (k in V.paths) {
      var c = P[k], par = k.charAt(0) === "b" ? P.c : P["b" + k.slice(1).split("_")[0]];
      if (c && par) V.paths[k].setAttribute("d", curve(par, c, k.charAt(0) === "b"));
    }
  }
  // shown/hidden classes (CSS fades + grows them in ≤ 250 ms) and the tween of positions from where they are now
  function place(P, now) {
    var k;
    for (k in V.nodes) { var on = P[k] && P[k][4]; V.nodes[k].className = V.nodes[k].className.replace(/ on\b/g, "") + (on ? " on" : ""); V.nodes[k].setAttribute("tabindex", on ? "0" : "-1"); }
    for (k in V.paths) { var q = P[k] && P[k][4]; V.paths[k].setAttribute("class", V.paths[k].getAttribute("class").replace(/ on\b/g, "") + (q ? " on" : "")); }
    var from = V.pos; V.pos = P;
    if (now || !from) return draw(P);
    var t0 = Date.now(), ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    (function step() {
      var t = Math.min(1, (Date.now() - t0) / DUR), e = ease(t), I = {}, kk;
      for (kk in P) { var a = from[kk] || P[kk], b = P[kk]; I[kk] = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, b[2], b[3], b[4]]; }
      draw(I); if (t < 1 && V && V.pos === P) raf(step);
    })();
  }
  function fitBox(keys) {
    var P = V.pos || target(), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    keys.forEach(function (k) { var p = P[k]; if (!p) return; x0 = Math.min(x0, p[0] - p[2] / 2); x1 = Math.max(x1, p[0] + p[2] / 2); y0 = Math.min(y0, p[1] - p[3] / 2); y1 = Math.max(y1, p[1] + p[3] / 2); });
    return [x0, y0, x1, y1];
  }
  function shownKeys() { var o = [], k; for (k in V.pos) if (V.pos[k][4]) o.push(k); return o; }
  // fit a box into the viewport (scale ≤ 1.1, ≥ .3), animated by the stage's CSS transition
  function view(bx, anim) {
    var vw = V.vp.clientWidth || 360, vh = V.vp.clientHeight || 480, pad = 18;
    var s = Math.max(0.3, Math.min(1.1, (vw - pad * 2) / Math.max(1, bx[2] - bx[0]), (vh - pad * 2) / Math.max(1, bx[3] - bx[1])));
    apply(s, vw / 2 - ((bx[0] + bx[2]) / 2) * s, vh / 2 - ((bx[1] + bx[3]) / 2) * s, anim);
  }
  function apply(s, x, y, anim) {
    V.s = s; V.x = x; V.y = y;
    V.st.className = "mmst" + (anim ? " anim" : "");
    setTf(V.st, "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s.toFixed(3) + ")");
  }
  function zoomAt(f, cx, cy, anim) { var s = Math.max(0.3, Math.min(2.5, V.s * f)), r = s / V.s; apply(s, cx - (cx - V.x) * r, cy - (cy - V.y) * r, anim); }
  function staticFit() { var bx = fitBox(shownKeys()); V.st.style.left = (12 - bx[0]) + "px"; V.st.style.top = (12 - bx[1]) + "px"; V.st.style.width = (bx[2] - bx[0]) + "px"; V.st.style.height = (bx[3] - bx[1] + 24) + "px"; }
  // a branch (and its leaves) in view: the tapped one fills the screen, not the whole map
  function focus(i) {
    var ks = ["b" + i]; V.m.b[i].l.forEach(function (y, j) { ks.push("l" + i + "_" + j); });
    var bx = fitBox(ks), P = V.pos.c; bx[1] = Math.min(bx[1], P[1]); bx[3] = Math.max(bx[3], P[1]);
    view(bx, 1);
  }
  function setOpen(o, focusI) {
    V.open = o; place(target());
    if (V.ap.className.indexOf("mmstatic") > -1) return staticFit();
    if (focusI != null && o["b" + focusI]) focus(focusI); else view(fitBox(shownKeys()), 1);
    var c = V.nodes.c; c.setAttribute("aria-expanded", o.c ? "true" : "false"); if (o.c) c.className = c.className.replace(/ fresh\b/, "") + " used";
    V.m.b.forEach(function (b, i) { var n = V.nodes["b" + i], k = n && n.querySelector(".mmct"); if (!n) return; n.setAttribute("aria-expanded", o["b" + i] ? "true" : "false"); if (k) k.textContent = o["b" + i] ? "−" : "+" + b.l.length; });
  }
  function closeSheet() { var sh = V && V.ap.querySelector(".mmsh"); if (sh) { sh.className = "mmsh"; } }
  function openSheet(i, j) {
    var sh = V.ap.querySelector(".mmsh"); sh.innerHTML = sheet(V.m, i, j);
    // signed out (assets/gate.js «gl-lock»): a locked lesson's text stays behind its sign-in card — the sheet shows only the way in
    var lock = d.documentElement.className.indexOf("gl-lock") > -1 && V.ap.getAttribute("data-mmlock") === "1", p = sh.querySelector(".mmshp");
    if (p) p.hidden = lock;
    sh.className = "mmsh on"; sh.scrollTop = 0;
  }
  function act(a) {
    if (a === "close") return closeSheet();
    if (a === "all") return setOpen(allOpen());
    if (a === "reset") { closeSheet(); setOpen({}); return view(fitBox(["c"]), 1); }
    var vw = V.vp.clientWidth, vh = V.vp.clientHeight;
    if (a === "in") return zoomAt(1.3, vw / 2, vh / 2, 1);
    if (a === "out") return zoomAt(1 / 1.3, vw / 2, vh / 2, 1);
    if (a === "fit") return view(fitBox(shownKeys()), 1);
  }
  function tap(n) {
    var o = {}, k, kind = n.getAttribute("data-mmn"); for (k in V.open) o[k] = V.open[k];
    if (kind === "c") { if (o.c) { o = {}; closeSheet(); } else o.c = 1; return setOpen(o); }
    if (kind === "b") {
      var i = +n.getAttribute("data-mmb");
      if (!V.m.b[i].l.length) return openSheet(i, null);
      if (o["b" + i]) delete o["b" + i]; else o["b" + i] = 1;
      return setOpen(o, o["b" + i] ? i : null);
    }
    if (kind === "l") { var f = n.getAttribute("data-mmf").split("_"); return openSheet(+f[0], +f[1]); }
  }
  // drag = pan, two fingers = pinch, wheel = zoom; a drag never counts as a tap
  var drag = null, quiet = 0;
  function pt(e) { var r = V.vp.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function gestures() {
    var vp = V.vp, opt = { passive: false };
    vp.addEventListener("touchstart", function (e) {
      var t = e.touches;
      if (t.length === 1) drag = { a: pt(t[0]), x: V.x, y: V.y, mv: 0 };
      else if (t.length === 2) { var p = pt(t[0]), q = pt(t[1]); drag = { pin: 1, d: Math.max(1, Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2))), s: V.s, x: V.x, y: V.y, c: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], mv: 1 }; }
    }, opt);
    vp.addEventListener("touchmove", function (e) {
      if (!drag || !V) return; var t = e.touches;
      if (drag.pin && t.length === 2) {
        e.preventDefault();
        var p = pt(t[0]), q = pt(t[1]), dd = Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2)), s = Math.max(0.3, Math.min(2.5, drag.s * dd / drag.d)), r = s / drag.s, c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        return apply(s, c[0] - (drag.c[0] - drag.x) * r, c[1] - (drag.c[1] - drag.y) * r, 0);
      }
      if (t.length !== 1 || drag.pin) return;
      var a = pt(t[0]), dx = a[0] - drag.a[0], dy = a[1] - drag.a[1];
      if (!drag.mv && Math.abs(dx) + Math.abs(dy) < 8) return;
      drag.mv = 1; e.preventDefault(); apply(V.s, drag.x + dx, drag.y + dy, 0);
    }, opt);
    vp.addEventListener("touchend", function (e) { if (drag && drag.mv) quiet = Date.now(); if (!e.touches.length) drag = null; });
    vp.addEventListener("gesturestart", function (e) { e.preventDefault(); }, opt);   // iOS: pinch zooms the map, not the page
    vp.addEventListener("mousedown", function (e) { if (e.button) return; drag = { a: pt(e), x: V.x, y: V.y, mv: 0, mouse: 1 }; });
    vp.addEventListener("wheel", function (e) { if (!V) return; e.preventDefault(); var a = pt(e); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, a[0], a[1], 0); }, opt);
  }
  function winGestures() {   // once per page: a mouse drag may leave the map while held
    w.addEventListener("mousemove", function (e) {
      if (!drag || !drag.mouse || !V) return; var a = pt(e), dx = a[0] - drag.a[0], dy = a[1] - drag.a[1];
      if (!drag.mv && Math.abs(dx) + Math.abs(dy) < 6) return; drag.mv = 1; apply(V.s, drag.x + dx, drag.y + dy, 0);
    });
    w.addEventListener("mouseup", function () { if (drag && drag.mouse) { if (drag.mv) quiet = Date.now(); drag = null; } });
    w.addEventListener("resize", function () { if (V && V.pos && V.ap.className.indexOf("mmstatic") < 0) view(fitBox(shownKeys()), 0); });
  }
  function render() {
    if (!root) return;
    var s0 = st(), o = load();
    if (s0.l) { o.s = s0.s; o.l = s0.l; save(o); return need(s0.s, function () { root.innerHTML = step3(s0.l); top(); wire(s0.l); if (V) gestures(); }); }
    V = null;
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
      ".mmap{position:relative;padding:0 0 10px}.mmbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}.mmz{display:inline-flex;gap:4px;margin-inline-start:auto}.mmz .btn{min-width:38px}" +
      ".mmvp{position:relative;overflow:hidden;height:calc(100vh - 200px);min-height:340px;max-height:820px;border-radius:18px;background:rgba(127,127,127,.06);border:1px solid rgba(127,127,127,.18);touch-action:none;-webkit-user-select:none;user-select:none;cursor:grab}" +
      ".mmst{position:absolute;left:0;top:0;width:0;height:0;-webkit-transform-origin:0 0;transform-origin:0 0}.mmst.anim{-webkit-transition:-webkit-transform .26s ease-out;transition:transform .26s ease-out}" +
      ".mmsv{position:absolute;left:0;top:0;overflow:visible}.mmsv path{fill:none;stroke-linecap:round;opacity:0;-webkit-transition:opacity .25s;transition:opacity .25s}.mmpb{stroke-width:5}.mmpl{stroke-width:3}.mmsv path.on{opacity:.85}" +
      ".mmn{position:absolute;left:0;top:0;box-sizing:border-box;margin:0;font:inherit;text-align:center;cursor:pointer;opacity:0;visibility:hidden;pointer-events:none;-webkit-transform:translate(-50%,-50%) scale(.35);transform:translate(-50%,-50%) scale(.35);" +
      "-webkit-transition:opacity .22s,-webkit-transform .25s ease-out,visibility 0s .25s;transition:opacity .22s,transform .25s ease-out,visibility 0s .25s;white-space:normal;overflow-wrap:break-word;word-wrap:break-word}" +
      ".mmn.on{opacity:1;visibility:visible;pointer-events:auto;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);-webkit-transition:opacity .22s,-webkit-transform .25s ease-out;transition:opacity .22s,transform .25s ease-out}" +
      ".mmc{border-radius:50%;border:0;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#0f766e;background:radial-gradient(circle at 35% 30%,#14b8a6,#0f766e 70%);color:#fff;font-weight:900;font-size:14px;line-height:1.35;box-shadow:0 6px 18px rgba(15,118,110,.35);z-index:3}" +
      ".mmtap{font-size:12px;font-weight:800;background:rgba(255,255,255,.22);padding:2px 8px;border-radius:99px}.mmc.used .mmtap{display:none}" +
      ".mmbt{border:0;border-radius:22px;padding:8px 12px;color:#fff;font-weight:800;font-size:14px;line-height:1.4;box-shadow:0 3px 10px rgba(0,0,0,.18);z-index:2;text-decoration:none}.mmbt[aria-expanded=true]{box-shadow:0 0 0 3px rgba(255,255,255,.9),0 0 0 6px rgba(0,0,0,.18)}" +
      ".mmct{direction:ltr;unicode-bidi:-webkit-isolate;unicode-bidi:isolate;display:inline-block;margin-inline-start:6px;font-size:12px;font-weight:900;background:rgba(255,255,255,.25);border-radius:99px;padding:0 7px}" +
      ".mmlf{font-size:13px;line-height:1.38;padding:6px 10px;border-radius:16px;border:2px solid;background:var(--card,#fff);color:inherit;z-index:1;white-space:normal;overflow-wrap:break-word}" +
      ".mmsh{position:fixed;left:0;right:0;bottom:0;z-index:60;max-height:72vh;overflow:auto;-webkit-overflow-scrolling:touch;background:var(--card,#fff);color:inherit;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.25);padding:12px 16px 18px;-webkit-transform:translateY(105%);transform:translateY(105%);-webkit-transition:-webkit-transform .25s ease-out;transition:transform .25s ease-out;visibility:hidden}" +
      ".mmsh.on{-webkit-transform:none;transform:none;visibility:visible}.mmshh{display:flex;align-items:flex-start;gap:8px}.mmshh b{flex:1;font-size:16px;line-height:1.45}.mmx{border:0;background:rgba(127,127,127,.15);border-radius:50%;width:32px;height:32px;font-size:15px;cursor:pointer;color:inherit}" +
      ".mmshf{display:block;font-weight:800;font-size:12.5px;margin:2px 0 4px}.mmshp{margin:6px 0 8px;font-size:14.5px;line-height:1.65}.mmsha{margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mmgo{font-weight:800;color:#0f766e}" +
      ".mmstatic .mmvp{overflow:auto;touch-action:auto;cursor:auto}.mmstatic .mmst{position:relative}.mmstatic .mmz{display:none}" +
      "@media(min-width:760px){.mmvp{height:calc(100vh - 230px)}.mmsh{left:50%;right:auto;width:560px;margin-left:-280px}}" +
      "@media(min-width:1024px){.mmvp{height:calc(100vh - 190px);max-height:none}html[dir=rtl] .mmsh{margin-left:-396px}html[dir=ltr] .mmsh{margin-left:-164px}}";   // 30b 💻 the map takes the whole screen on a laptop (beside the side nav)
    var s = d.createElement("style"); s.id = "mmcss"; s.textContent = c; (d.head || d.documentElement).appendChild(s);
  }
  function boot() {
    root = d.getElementById("mm-app"); if (!root) return;
    style(); render();
    w.addEventListener("hashchange", render);
    winGestures();
    root.addEventListener("click", function (e) {
      if (!V) return;
      var t = e.target, n = t && t.closest ? t.closest("[data-mma],.mmn") : null; if (!n) return;
      if (Date.now() - quiet < 350 && n.className.indexOf("mmn") > -1) { e.preventDefault(); return; }   // the end of a drag, not a tap
      if (n.hasAttribute("data-mma")) { e.preventDefault(); return act(n.getAttribute("data-mma")); }
      if (n.getAttribute("data-mmn") === "o") return;   // a real link
      e.preventDefault(); tap(n);
    });
    d.addEventListener("keydown", function (e) { if (V && (e.key === "Escape" || e.keyCode === 27)) closeSheet(); });
  }
  w.NursinMM = { map: map, subjects: subjects, lessons: lessons, step1: step1, step2: step2, step3: step3, need: need, KEY: KEY, ORDER: ORDER, lay: lay, curve: curve, sheet: sheet, bidi: bidi, cdia: cdia, HUE: HUE, BW: BW, LW: LW };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
