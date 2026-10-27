/* 🚑 ناوبة بالطوارئ v2 — «شكل لعبة حقيقية» (Abdullah, Oct 27 2026 10:17 AM, his two reference screenshots): realistic scenes +
   a game HUD over them. Scenes are 4 still images (assets/er-scene-*.webp, AI-generated for this game, no text in them, loaded only when
   a case starts); everything you read or tap is HTML on top: «المهمة الحالية» + bars, mini-map + «اليوم n», monitor (FC, TA, SpO2,
   T°, IV) with a live ECG line, action buttons. Flow: ① المدخل — the ambulance arrives (lights, optional siren, muted by default)
   → «استلم المريض» ② الممر — the paramedic hands over the case (the same arrival card data) ③ غرفة 3 — tap the patient / monitor /
   IV / medicine cart / lab / phone; the current step's spot glows (not on صعب) and opens the SAME 3-option step of games.js (same
   scoring, same «❌ إنت اخترت … ✅ الصح …», same 📋 أخطاءك) ④ «💬 احكي مع المريض» — pick questions; every answer is a line that
   is already in the case (sx / who / vit / lab), nothing new. Monitor numbers the case gives (TA, FC) start as given; the others are
   approximate game values (said on the monitor) that only drift better/worse with the patient bar. No ads in here. */
(function (w, d) {
  "use strict";
  var IMG = { a: "assets/er-scene-a.webp", b: "assets/er-scene-b.webp", c: "assets/er-scene-c.webp", d: "assets/er-scene-d.webp" }, V = "20261026y";
  var IW = 1024, IH = 1536;   // every scene image is 2:3 portrait
  // tap spots on the room image (x, y = centre in % of the image)
  var SPOTS = {
    pt:    { x: 34, y: 58, ic: "🧓", n: "المريض", m: "قيّم المريض" },
    mon:   { x: 40, y: 43, ic: "📟", n: "الـ monitor", m: "شوف الـ monitor" },
    iv:    { x: 27.5, y: 38, ic: "💧", n: "المصل (sérum)", m: "جهّز المصل" },
    cart:  { x: 84, y: 73, ic: "💊", n: "عرباية الدوا", m: "حضّر الدوا" },
    lab:   { x: 76.5, y: 54, ic: "🧪", n: "المختبر", m: "اقرا التحاليل" },
    phone: { x: 89, y: 45, ic: "📞", n: "تلفون الدكتور", m: "اتصل بالدكتور" }
  };
  var POSX = { a: 0.5, b: 0.5, c: 0.65, d: 0.5 };   // horizontal crop (matches the CSS object-position) so the phone + cart stay on a 390px screen

  // which spot a step happens at — read from the step's own words (question + right answer); no content added
  function spot(st) {
    var q = String(st.q || ""), r = String((st.o || [])[st.a] || ""), qr = q + " " + r;
    if (/pH|HCO3|PaCO2|غازات|compensée/i.test(q)) return "lab";
    if (/ECG/.test(q)) return "mon";
    if (/sérum|Transfusion|سوايل|بتعطيه/i.test(qr) && !/علاج السبب|Traiter/i.test(r)) return "iv";
    if (/ما تحسّن/.test(q)) return "phone";
    if (/علاج|بتحضّر|بيشيل|بيفيد|antiacides|antidote/i.test(q)) return "cart";
    if (/تراقب|الخطر|الخطيرة/.test(q)) return "mon";
    return "pt";
  }
  // «💬 احكي مع المريض»: questions → answers taken word for word from the case
  function dlg(c) {
    var L = [];
    if (c.sx && c.sx.length) L.push({ k: "sx", q: "شو بتحس؟ شو عم يوجعك؟", by: "pt", a: "عندي: " + c.sx.join("، ") + "." });
    if (c.who) L.push({ k: "who", q: "خبّرني عن حالك، شو عندك أمراض أو أدوية؟", by: "pt", a: "خود، هيدا ملفّي 📄: " + c.who });
    if (c.vit && c.vit.length) L.push({ k: "vit", q: "خلّيني قيسلك العلامات الحيوية (constantes)", by: "me", a: "📟 " + c.vit.join(" · ") });
    if (c.lab) L.push({ k: "lab", q: "طلعت نتايج الفحوص؟", by: "me", a: "🧪 " + c.lab });
    L.push({ k: "calm", q: "ما تخاف، نحنا حدّك 🤝", by: "pt", a: "الله يخلّيك 🙏" });
    return L;
  }
  // monitor: values the case gives (TA / FC numbers) start as given; the rest are approximate game values
  var NORM = { fc: 80, sys: 120, dia: 75, spo: 98, t: 37 };
  var BASE = { hypovol: { spo: 96, t: 36.8 }, hyperk: { fc: 88, sys: 130, dia: 80 }, hypok: { fc: 92, sys: 115, dia: 70 },
    hypona: { fc: 84, sys: 125, dia: 80, spo: 96 }, hypoca: { fc: 90 }, hypermg: { sys: 90, dia: 55, spo: 93, t: 36.8 }, gds: { fc: 100 } };
  function monBase(c) {
    var b = {}, k, v = (c.vit || []).join(" "), m;
    for (k in NORM) b[k] = NORM[k];
    var x = BASE[c.id] || {}; for (k in x) b[k] = x[k];
    if ((m = v.match(/FC\s*(\d+)/))) b.fc = +m[1];
    if ((m = v.match(/TA\s*(\d+)\s*\/\s*(\d+)/))) { b.sys = +m[1]; b.dia = +m[2]; }
    return b;
  }
  function monAt(b, hp) {
    var f = Math.max(0.15, Math.min(1.8, (100 - hp) / 45)), o = {}, n = { fc: b.fc < 60 ? 70 : NORM.fc, sys: NORM.sys, dia: NORM.dia, spo: NORM.spo, t: NORM.t };
    for (var k in n) o[k] = n[k] + (b[k] - n[k]) * f;
    o.spo = Math.min(100, o.spo); return o;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function dayN() {
    var k = "nursin_er_day_v1", t = (w.Nursin && w.Nursin.dayKey) ? w.Nursin.dayKey() : new Date().toISOString().slice(0, 10), o = {};
    try { o = JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) {}
    if (o.d !== t) { o = { d: t, n: (o.n | 0) + 1 }; try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
    return o.n || 1;
  }
  var RM = function () { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); };

  /* ---- siren (WebAudio, only after the player turns it on) ---- */
  var snd = { on: false, ac: null, o: null, g: null };
  function sirenStart() {
    try {
      if (!snd.ac) snd.ac = new (w.AudioContext || w.webkitAudioContext)();
      if (snd.o) return; var ac = snd.ac, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
      o.type = "triangle"; o.frequency.value = 760; lfo.type = "sine"; lfo.frequency.value = 0.55; lg.gain.value = 210;
      lfo.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(ac.destination); o.start(); lfo.start();
      snd.o = o; snd.l = lfo; snd.g = g; if (ac.resume) ac.resume();
    } catch (e) {}
  }
  function sirenStop() { try { if (snd.o) { snd.o.stop(); snd.l.stop(); } } catch (e) {} snd.o = null; }

  /* ---- the overlay ---- */
  function open(c, o) {
    // o = { steps, lv, fr, onStep(si) → renders the step into sheet, onExit() }
    var fr = o.fr || esc, el = d.createElement("div"), base = monBase(c), hp = o.hp0 || 55, iv = "—", sc = "a", raf = 0, day = dayN(), stepIx = 0, target = "pt", sheetOpen = false;
    el.className = "ers"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "ناوبة بالطوارئ"); el.dir = "rtl";
    el.innerHTML =
      '<div class="ers-bg"><img alt="" decoding="async" id="ersimg"></div><div class="ers-fx"></div><div class="ers-spots"></div>' +
      '<div class="ers-top"><div class="ers-task glass"><div class="ers-tl">المهمة الحالية:</div><div class="ers-tm" id="erstm">🚑 سيارة الإسعاف واصلة…</div>' +
        '<div class="ers-bars"><div class="ers-bar hp"><span>❤️</span><div><i id="ershp"></i></div></div><div class="ers-bar pr"><span>⭐</span><div><i id="erspr"></i></div><b id="erssc" dir="ltr">0/' + o.steps.length + '</b></div></div><div id="ersst"></div></div>' +
        '<div class="ers-tbtn"><button type="button" class="ers-x glass" data-ers="x" aria-label="سكّر">✕</button><button type="button" class="ers-snd glass" data-ers="snd" aria-label="صوت الإسعاف">🔇</button></div></div>' +
      '<div class="ers-mon glass" hidden><div class="ers-mh"><b>📟 Monitor</b><span class="ers-dot"></span></div><canvas width="240" height="54" id="ersecg"></canvas>' +
        '<div class="ers-vs"><div><small>FC ♥</small><b id="ersfc">--</b></div><div><small>TA</small><b id="ersta" dir="ltr">--</b></div><div><small>SpO2</small><b id="ersspo">--</b></div><div><small>T°</small><b id="erst2">--</b></div></div>' +
        '<div class="ers-iv"><small>💧 IV:</small> <span id="ersiv">—</span></div><div class="ers-mn">* أرقام الـ monitor تقريبية للعبة؛ المرجع كرت المريض</div></div>' +
      '<div class="ers-map glass"><svg viewBox="0 0 100 92" aria-hidden="true"><rect x="4" y="4" width="92" height="26" rx="4" class="r3"/><rect x="38" y="30" width="24" height="34" class="rc"/><rect x="4" y="64" width="92" height="24" rx="4" class="re"/>' +
        '<text x="38" y="20">غرفة 3</text><text x="50" y="42" class="sm">الممر</text><text x="38" y="80">المدخل</text><g id="ersme" class="me" style="transform:translate(78px,76px)"><circle r="5"/></g></svg><div class="ers-day">📅 اليوم <b>' + day + '</b></div></div>' +
      '<div class="ers-act"><button type="button" class="glass" data-ers="act"><span>👆</span>تفاعل</button><button type="button" class="glass" data-ers="talk"><span>💬</span>احكي</button><button type="button" class="glass" data-ers="med"><span>💊</span>الدواء</button><button type="button" class="glass" data-ers="inv"><span>🎒</span>المخزون</button><button type="button" class="glass" data-ers="menu"><span>☰</span>القائمة</button></div>' +
      '<div class="ers-cta"></div><div class="ers-sheet glass" id="erssheet" hidden></div><div class="ers-pop glass" hidden></div><div class="ers-toast" hidden></div>';
    d.body.appendChild(el); d.documentElement.classList.add("ers-on");
    var $ = function (s) { return el.querySelector(s); }, img = $("#ersimg"), sheet = $("#erssheet"), pop = $(".ers-pop"), cta = $(".ers-cta"), spotsEl = $(".ers-spots");

    function toast(t) { var x = $(".ers-toast"); x.innerHTML = t; x.hidden = false; clearTimeout(x._t); x._t = setTimeout(function () { x.hidden = true; }, 2600); }
    function setTask(t) { $("#erstm").innerHTML = t; }
    function mapTo(where) { var p = { e: [78, 76], c: [50, 54], r: [78, 17] }[where]; $("#ersme").style.transform = "translate(" + p[0] + "px," + p[1] + "px)"; }
    function bars() {
      var hpEl = $("#ershp"); hpEl.style.width = hp + "%"; hpEl.className = hp >= 70 ? "ok" : hp >= 40 ? "mid" : "bad";
      $("#erspr").style.width = (100 * stepIx / o.steps.length) + "%";
    }
    function scene(k) {
      sc = k; el.setAttribute("data-scene", k); img.src = IMG[k] + "?v=" + V; img.onload = place;
      spotsEl.innerHTML = ""; cta.innerHTML = ""; pop.hidden = true; $(".ers-toast").hidden = true;
      if (k !== "a" && k !== "b") sirenStop(); else if (snd.on) sirenStart();
      $(".ers-snd").hidden = !(k === "a" || k === "b");
      $(".ers-mon").hidden = k !== "c";
    }
    // spots sit on the image even though it is cropped to fill the screen (object-fit: cover)
    function place() {
      var W = el.clientWidth, H = el.clientHeight, s = Math.max(W / IW, H / IH), ox = (W - IW * s) * (POSX[sc] == null ? 0.5 : POSX[sc]), oy = (H - IH * s) / 2;
      [].forEach.call(el.querySelectorAll(".ers-fx i[data-x]"), function (b) { b.style.left = (ox + IW * s * b.getAttribute("data-x") / 100) + "px"; b.style.top = (oy + IH * s * b.getAttribute("data-y") / 100) + "px"; });
      [].forEach.call(spotsEl.children, function (b) { var p = SPOTS[b.getAttribute("data-spot")]; var lx = Math.max(30, Math.min(W - 30, ox + IW * s * p.x / 100)); b.style.left = lx + "px"; b.classList.toggle("el", lx < 75); b.classList.toggle("er", lx > W - 75); b.style.top = Math.max(150, Math.min(H - 90, oy + IH * s * p.y / 100)) + "px"; });
    }
    w.addEventListener("resize", place);

    /* monitor */
    function vitals(flash) {
      var v = monAt(base, hp);
      $("#ersfc").textContent = Math.round(v.fc); $("#ersta").textContent = Math.round(v.sys) + "/" + Math.round(v.dia);
      $("#ersspo").textContent = Math.round(v.spo) + "%"; $("#erst2").textContent = v.t.toFixed(1); $("#ersiv").innerHTML = iv;
      var m = $(".ers-mon"); m.className = "ers-mon glass " + (hp >= 70 ? "ok" : hp >= 40 ? "mid" : "bad") + (flash ? (flash > 0 ? " up" : " dn") : "");
      if (flash) setTimeout(function () { m.classList.remove("up", "dn"); }, 900);
    }
    var cv = $("#ersecg"), cx = cv.getContext && cv.getContext("2d"), ph = 0, last = 0, pts = [];
    function ecgY(t) {   // one beat shape, t in 0..1
      if (t < 0.1) return Math.sin(t / 0.1 * Math.PI) * -4; if (t < 0.16) return 0; if (t < 0.18) return 4; if (t < 0.21) return -22; if (t < 0.24) return 9;
      if (t < 0.4) return 0; if (t < 0.55) return Math.sin((t - 0.4) / 0.15 * Math.PI) * -6; return 0;
    }
    function draw(ts) {
      if (!cx) return; var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      var fc = monAt(base, hp).fc; ph += dt * fc / 60; pts.push(ecgY(ph % 1)); while (pts.length > 240) pts.shift();
      cx.clearRect(0, 0, 240, 54); cx.lineWidth = 2; cx.strokeStyle = hp >= 70 ? "#4ade80" : hp >= 40 ? "#facc15" : "#f87171"; cx.beginPath();
      for (var i = 0; i < pts.length; i++) { var x = 240 - pts.length + i; if (i) cx.lineTo(x, 30 + pts[i]); else cx.moveTo(x, 30 + pts[i]); }
      cx.stroke(); raf = w.requestAnimationFrame(draw);
    }
    function ecgStatic() { if (!cx) return; pts = []; for (var i = 0; i < 240; i++) pts.push(ecgY((i / 80) % 1)); cx.clearRect(0, 0, 240, 54); cx.lineWidth = 2; cx.strokeStyle = "#4ade80"; cx.beginPath(); pts.forEach(function (y, i) { if (i) cx.lineTo(i, 30 + y); else cx.moveTo(i, 30 + y); }); cx.stroke(); }
    function ecgGo() { if (raf) return; if (RM()) ecgStatic(); else raf = w.requestAnimationFrame(draw); }

    /* scenes */
    function sceneA() {
      scene("a"); mapTo("e"); setTask("🚑 سيارة إسعاف وصلت عالمدخل! روح استلم المريض");
      $(".ers-fx").innerHTML = '<i class="l1" data-x="70" data-y="53"></i><i class="l2" data-x="86" data-y="53"></i>'; place();
      cta.innerHTML = '<div class="ers-banner glass">🚨 حالة طارئة واصلة: <b>' + fr(c.t) + '</b></div><button type="button" class="ers-go" data-ers="take">🚑 استلم المريض</button>';
    }
    function sceneB() {
      scene("b"); mapTo("c"); $(".ers-fx").innerHTML = ""; setTask("📋 اسمع تسليم المسعف وخود المريض عغرفة 3");
      cta.innerHTML = '<div class="ers-say glass"><div class="ers-who">🧑‍🚒 المسعف:</div><p>' + fr(c.who) + "</p>" +
        (c.sx && c.sx.length ? '<p><b>الأعراض:</b> ' + c.sx.map(fr).join("، ") + "</p>" : "") +
        (c.vit && c.vit.length ? '<p><b><bdi dir="ltr" lang="fr">Constantes</bdi>:</b> ' + c.vit.map(fr).join("، ") + "</p>" : "") +
        (c.lab ? '<p class="ers-lab">🧪 ' + fr(c.lab) + "</p>" : "") + '</div><button type="button" class="ers-go" data-ers="room">✅ استلمت ← غرفة 3</button>';
    }
    function sceneC() {
      scene("c"); mapTo("r"); vitals(0); ecgGo();
      spotsEl.innerHTML = Object.keys(SPOTS).map(function (k) { var p = SPOTS[k]; return '<button type="button" class="ers-spot" data-spot="' + k + '" aria-label="' + esc(p.n) + '"><span>' + p.ic + "</span><em>" + fr(p.n) + "</em></button>"; }).join("");
      place(); mission();
    }
    function mission() {
      if (stepIx >= o.steps.length) return;
      var st = o.steps[stepIx]; target = spot(st); var p = SPOTS[target];
      setTask(p.ic + " " + p.m + ' <span class="ers-tq">(' + (stepIx + 1) + "/" + o.steps.length + ")</span>");
      [].forEach.call(el.querySelectorAll(".ers-fx i[data-x]"), function (b) { b.style.left = (ox + IW * s * b.getAttribute("data-x") / 100) + "px"; b.style.top = (oy + IH * s * b.getAttribute("data-y") / 100) + "px"; });
      [].forEach.call(spotsEl.children, function (b) { b.classList.toggle("glow", o.lv < 3 && b.getAttribute("data-spot") === target); });
      bars();
    }
    function openStep() {
      sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on"); o.onStep(stepIx, sheet);
      sheet.scrollTop = 0;
    }
    function tapSpot(k) {
      if (sheetOpen) return;
      if (k === target) return openStep();
      var p = SPOTS[k];
      toast(k === "phone" ? "📞 الدكتور: «كمّل المهمة، وخبّرني إذا تغيّر شي»" : p.ic + " " + fr(p.n) + " — مش هلّق. المهمة: <b>" + SPOTS[target].m + "</b>");
    }
    function sceneD() {
      scene("d"); var L = dlg(c), asked = {};
      cta.innerHTML = '<div class="ers-chat glass" id="erschat"><div class="ers-b pt">🧓 أهلا يا حكيم… 😟</div></div><div class="ers-qs" id="ersqs"></div><button type="button" class="ers-go sm" data-ers="back">⬅️ رجوع عالغرفة</button>';
      setTask("💬 احكي مع المريض: اختار سؤال");
      function qs() { $("#ersqs").innerHTML = L.filter(function (x) { return !asked[x.k]; }).map(function (x) { return '<button type="button" class="glass" data-q="' + x.k + '">' + fr(x.q) + "</button>"; }).join(""); }
      $("#ersqs").addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-q]"); if (!b) return; var k = b.getAttribute("data-q"), x = L.filter(function (y) { return y.k === k; })[0]; asked[k] = 1;
        var ch = $("#erschat"); ch.insertAdjacentHTML("beforeend", '<div class="ers-b me">👨‍⚕️ ' + fr(x.q) + '</div><div class="ers-b ' + (x.by === "pt" ? "pt" : "inf") + '">' + (x.by === "pt" ? "🧓 " : "") + fr(x.a) + "</div>");
        ch.scrollTop = ch.scrollHeight; qs();
      });
      qs();
    }
    function popup(h) { pop.innerHTML = h + '<div class="sbtns"><button type="button" class="btn on" data-ers="popx">تمام</button></div>'; pop.hidden = false; }
    function card() {
      return '<h3>🎒 المخزون: ملف المريض</h3><p>' + fr(c.who) + "</p>" + (c.sx && c.sx.length ? "<p><b>الأعراض:</b> " + c.sx.map(fr).join("، ") + "</p>" : "") +
        (c.vit && c.vit.length ? '<p><b><bdi dir="ltr" lang="fr">Constantes</bdi>:</b> ' + c.vit.map(fr).join("، ") + "</p>" : "") + (c.lab ? "<p>🧪 " + fr(c.lab) + "</p>" : "");
    }
    el.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-ers],[data-spot]") : null; if (!t) return;
      if (t.hasAttribute("data-spot")) return tapSpot(t.getAttribute("data-spot"));
      var a = t.getAttribute("data-ers");
      if (a === "x") return close(true);
      if (a === "snd") { snd.on = !snd.on; t.textContent = snd.on ? "🔊" : "🔇"; if (snd.on) sirenStart(); else sirenStop(); return; }
      if (a === "take") return sceneB();
      if (a === "room") return sceneC();
      if (a === "back") { sceneC(); return; }
      if (a === "popx") { pop.hidden = true; return; }
      if (sc !== "c" && sc !== "d") { if (a === "inv") popup(card()); else if (a === "menu") popup(menu()); else toast("استلم المريض أوّل 🚑"); return; }
      if (a === "act") { if (sc === "d") sceneC(); if (!sheetOpen) openStep(); return; }
      if (a === "talk") { if (!sheetOpen) sceneD(); return; }
      if (a === "med") { if (sc === "d") sceneC(); tapSpot("cart"); return; }
      if (a === "inv") return popup(card());
      if (a === "menu") return popup(menu());
    });
    function menu() { return '<h3>☰ القائمة</h3><p class="small">' + fr(c.ic + " " + c.t) + '</p><p class="small">👆 كبوس عالشي يلّي عم يلمع بالغرفة لتعمل المهمة. 💬 احكي مع المريض لتعرف أكتر. 🎒 فيه ملف المريض.</p><div class="sbtns"><button type="button" class="btn" data-ers="x">🚪 اطلع من الحالة</button></div>'; }

    function close(exit) {
      sirenStop(); if (raf) w.cancelAnimationFrame(raf); raf = 0; w.removeEventListener("resize", place);
      if (el.parentNode) el.parentNode.removeChild(el); d.documentElement.classList.remove("ers-on");
      if (exit && o.onExit) o.onExit();
    }
    sceneA(); bars();
    // the next scenes load only now, after the first one (the game page itself never loads them)
    setTimeout(function () { [IMG.b, IMG.c, IMG.d].forEach(function (u) { var i = new Image(); i.decoding = "async"; i.src = u + "?v=" + V; }); }, 300);
    return {
      el: el, sheet: sheet,
      // games.js tells the scene what happened; the scene only shows it
      result: function (good, newHp, st, ok) {
        hp = newHp; $("#erssc").textContent = (ok | 0) + "/" + o.steps.length; var r = String((st.o || [])[st.a] || "");
        if (good && /IV|sérum|Transfusion/i.test(r)) iv = fr(r.length > 34 ? r.slice(0, 34) + "…" : r);
        vitals(good ? 1 : -1); bars();
      },
      next: function () { stepIx++; sheetOpen = false; sheet.hidden = true; sheet.innerHTML = ""; el.classList.remove("sheet-on"); if (sc !== "c") sceneC(); else mission(); bars(); },
      close: close
    };
  }
  w.ERSCENE = { open: open, spot: spot, dlg: dlg, SPOTS: SPOTS, IMG: IMG, monBase: monBase, monAt: monAt };
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
