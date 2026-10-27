/* 🚑 ناوبة بالطوارئ v2 — «شكل لعبة حقيقية» (Abdullah, Oct 27 2026 10:17 AM, his two reference screenshots): realistic scenes +
   a game HUD over them. Scenes are 4 still images (assets/er-scene-*.webp, AI-generated for this game, no text in them, loaded only when
   a case starts); everything you read or tap is HTML on top: «المهمة الحالية» + bars, mini-map + «اليوم n», monitor (FC, TA, SpO2,
   T°, IV) with a live ECG line, action buttons. Flow: ① المدخل — the ambulance arrives (lights, optional siren, muted by default)
   → «استلم المريض» ② الممر — the paramedic hands over the case (the same arrival card data) ③ غرفة 3 — tap the patient / monitor /
   IV / medicine cart / lab / phone; the current step's spot glows (not on صعب) and opens the SAME 3-option step of games.js (same
   scoring, same «❌ إنت اخترت … ✅ الصح …», same 📋 أخطاءك) ④ «💬 احكي مع المريض» — pick questions; every answer is a line that
   is already in the case (sx / who / vit / lab), nothing new. Monitor numbers the case gives (TA, FC) start as given; the others are
   approximate game values (said on the monitor) that only drift better/worse with the patient bar. No ads in here. */
/* v3 (Oct 27, 12:36 PM, «بدي عيشها كقصة»): with o.sim the room runs the living case of assets/ersim-story.js — a game clock (⏸ pausable),
   «📋 المهام» always open at the bottom (every action at once, any order), the room spots open their group (💧 المصل، 💊 الدوا، 📞…),
   the monitor shows only what you measured (and how long ago), every action goes into «📋 ملف المريض», 🔴 = alarm (+ 💡 on سهل/وسط). */
(function (w, d) {
  "use strict";
  var IMG = { a: "assets/er-scene-a.webp", b: "assets/er-scene-b.webp", c: "assets/er-scene-c.webp", d: "assets/er-scene-d.webp" }, V = "20261026z";
  // v3: the room with a patient who looks like the case (same room, same spots; edits of er-scene-c)
  var ROOM = {};
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
    var SIM = o.sim || null, fr = o.fr || esc, el = d.createElement("div"), base = monBase(c), hp = o.hp0 || 55, iv = "—", sc = "a", raf = 0, day = dayN(), stepIx = 0, target = "pt", sheetOpen = false;
    el.className = "ers"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "ناوبة بالطوارئ"); el.dir = "rtl";
    el.innerHTML =
      '<div class="ers-bg"><img alt="" decoding="async" id="ersimg"></div><div class="ers-fx"></div><div class="ers-spots"></div>' +
      '<div class="ers-top"><div class="ers-task glass"><div class="ers-tl">المهمة الحالية:</div><div class="ers-tm" id="erstm">🚑 سيارة الإسعاف واصلة…</div>' +
        '<div class="ers-bars"><div class="ers-bar hp"><span>❤️</span><div><i id="ershp"></i></div></div><div class="ers-bar pr"><span>⭐</span><div><i id="erspr"></i></div><b id="erssc" dir="ltr">0/' + o.steps.length + '</b></div></div><div id="ersst"></div></div>' +
        '<div class="ers-tbtn"><button type="button" class="ers-x glass" data-ers="x" aria-label="سكّر">✕</button><button type="button" class="ers-snd glass" data-ers="snd" aria-label="صوت الإسعاف">🔇</button></div></div>' +
      '<div class="ers-mon glass" hidden><div class="ers-mh"><b>📟 Monitor</b><span class="ers-dot"></span></div><canvas width="240" height="54" id="ersecg"></canvas>' +
        '<div class="ers-vs"><div><small>FC ♥</small><b id="ersfc">--</b></div><div><small>TA</small><b id="ersta" dir="ltr">--</b></div><div><small>SpO2</small><b id="ersspo">--</b></div><div><small>T°</small><b id="erst2">--</b></div></div>' +
        '<div class="ers-ecgt"></div><div class="ers-iv"><small>💧 IV:</small> <span id="ersiv">—</span></div><div class="ers-mn">* أرقام الـ monitor تقريبية للعبة؛ المرجع كرت المريض</div></div>' +
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
      if (SIM) return refresh();
      var hpEl = $("#ershp"); hpEl.style.width = hp + "%"; hpEl.className = hp >= 70 ? "ok" : hp >= 40 ? "mid" : "bad";
      $("#erspr").style.width = (100 * stepIx / o.steps.length) + "%";
    }
    function scene(k) {
      sc = k; el.setAttribute("data-scene", k); img.src = (k === "c" && o.sim && ROOM[c.id] ? ROOM[c.id] : IMG[k]) + "?v=" + V; img.onload = place;
      spotsEl.innerHTML = ""; cta.innerHTML = ""; pop.hidden = true; $(".ers-toast").hidden = true;
      if (k !== "a" && k !== "b") sirenStop(); else if (snd.on) sirenStart();
      $(".ers-snd").hidden = !(k === "a" || k === "b" || (k === "c" && o.sim));
      $(".ers-mon").hidden = k !== "c";
    }
    // spots sit on the image even though it is cropped to fill the screen (object-fit: cover)
    function place() {
      var W = el.clientWidth, H = el.clientHeight, s = Math.max(W / IW, H / IH), ox = (W - IW * s) * (POSX[sc] == null ? 0.5 : POSX[sc]), oy = (H - IH * s) / 2;
      [].forEach.call(el.querySelectorAll(".ers-fx i[data-x]"), function (b) { b.style.left = (ox + IW * s * b.getAttribute("data-x") / 100) + "px"; b.style.top = (oy + IH * s * b.getAttribute("data-y") / 100) + "px"; });
      [].forEach.call(spotsEl.children, function (b) { var p = SPOTS[b.getAttribute("data-spot")]; var lx = Math.max(30, Math.min(W - 30, ox + IW * s * p.x / 100)); b.style.left = lx + "px"; b.classList.toggle("el", lx < 75); b.classList.toggle("er", lx > W - 75); b.style.top = Math.max(SIM ? 290 : 150, Math.min(H - (SIM ? simBottom() : 90), oy + IH * s * p.y / 100)) + "px"; });
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
      var fc = SIM ? (st.scope ? E.vit(st, "fc") : 0) : monAt(base, hp).fc; ph += dt * fc / 60; pts.push(fc ? ecgY(ph % 1) : 0); while (pts.length > 240) pts.shift();
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
        (SIM ? '<p class="small">📟 العلامات الحيوية والتحاليل: إنت بتقيسن وبتطلبن بغرفة 3.</p>' :
        (c.vit && c.vit.length ? '<p><b><bdi dir="ltr" lang="fr">Constantes</bdi>:</b> ' + c.vit.map(fr).join("، ") + "</p>" : "") +
        (c.lab ? '<p class="ers-lab">🧪 ' + fr(c.lab) + "</p>" : "")) + '</div><button type="button" class="ers-go" data-ers="room">✅ استلمت ← غرفة 3</button>';
    }
    function sceneC() {
      scene("c"); mapTo("r"); vitals(0); ecgGo();
      spotsEl.innerHTML = Object.keys(SPOTS).map(function (k) { var p = SPOTS[k]; return '<button type="button" class="ers-spot" data-spot="' + k + '" aria-label="' + esc(p.n) + '"><span>' + p.ic + "</span><em>" + fr(p.n) + "</em></button>"; }).join("");
      place(); if (SIM) simRoom(); else mission();
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
      if (SIM) return simGroup(k);
      if (sheetOpen) return;
      if (k === target) return openStep();
      var p = SPOTS[k];
      toast(k === "phone" ? "📞 الدكتور: «كمّل المهمة، وخبّرني إذا تغيّر شي»" : p.ic + " " + fr(p.n) + " — مش هلّق. المهمة: <b>" + SPOTS[target].m + "</b>");
    }
    function sceneD() {
      scene("d"); var L = dlg(c).filter(function (x) { return !SIM || x.by === "pt"; }), asked = {};   // v3: vitals / labs are measured, not told
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
      if (SIM && simClick(a, t)) return;
      if (a === "x") return close(true);
      if (a === "snd") { snd.on = !snd.on; t.textContent = snd.on ? "🔊" : "🔇"; if (snd.on && sc !== "c") sirenStart(); else sirenStop(); return; }
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
      sirenStop(); if (raf) w.cancelAnimationFrame(raf); raf = 0; w.removeEventListener("resize", place); if (loop) { clearInterval(loop); loop = 0; }
      if (el.parentNode) el.parentNode.removeChild(el); d.documentElement.classList.remove("ers-on");
      if (exit && o.onExit) o.onExit();
    }

    /* ---- v3: the living case (o.sim) ---- */
    var E = w.ERSTORY, st = SIM && SIM.st, loop = 0, paused = false, lastSave = 0, simIv = "", GL = { iv: "💧 المصل", cart: "💊 الدوا", tx: "🩹 تدخّل" };
    function simBottom() { var p = $(".ers-tasks"); return p && p.offsetHeight ? p.offsetHeight + 34 : 330; }
    function clock(t) { t = Math.round(t); return (t / 60 | 0) + ":" + ("0" + t % 60).slice(-2); }
    function hsh(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
    function grpOf(a) { return (a.k === "tx" || a.k === "bad") ? (a.g === "iv" || a.g === "cart" ? a.g : "tx") : ""; }
    function list(k) {   // a spot / group → its actions (treatment lists in a fixed mixed order, so the right one is not always first)
      var L = E.actions(c.id).filter(function (a) { return GL[k] ? grpOf(a) === k : a.g === k; });
      return L.sort(function (x, y) { var gx = grpOf(x) ? 1 : 0, gy = grpOf(y) ? 1 : 0; return gx - gy || (gx ? hsh(c.id + x.id) - hsh(c.id + y.id) : 0); });
    }
    function btnA(a, big) {
      var dn = st.done[a.id] && (a.k === "tx" || a.k === "bad") ? " done" : "", pend = st.pend.some(function (p) { return p.id === a.id; }) ? " pend" : "";
      return big ? '<button type="button" class="ers-opt glass' + dn + pend + '" data-sa="' + a.id + '"><span>' + a.ic + "</span><b>" + fr(a.n) + '</b><small dir="rtl">⏱ ' + a.m + " د" + (dn ? " · ✅" : "") + (pend ? " · ⏳" : "") + "</small></button>"
        : '<button type="button" class="ers-ta' + pend + '" data-sa="' + a.id + '"><span>' + a.ic + "</span>" + fr(a.s || a.n) + "</button>";
    }
    function grid() {
      var L = E.actions(c.id), h = "", seen = {}, order = ["meas", "exam", "ecg", "lab", "G", "scope", "call", "talk", "quiz", "wait"];
      order.forEach(function (k) {
        if (k === "G") { ["iv", "cart", "tx"].forEach(function (g) { if (L.some(function (a) { return grpOf(a) === g; })) h += '<button type="button" class="ers-ta grp" data-sg="' + g + '"><span>' + GL[g].split(" ")[0] + "</span>" + GL[g].split(" ").slice(1).join(" ") + "</button>"; }); return; }
        L.forEach(function (a) { if (a.k === k && !grpOf(a) && !seen[a.id]) { seen[a.id] = 1; h += btnA(a); } });
      });
      return h;
    }
    function simRoom() {
      el.classList.add("sim");
      if (!$(".ers-tasks")) {
        el.insertAdjacentHTML("beforeend", '<div class="ers-tasks glass" id="erstasks"><div class="ers-th"><b>📋 المهام</b><span class="small">كلّا مفتوحة، بأي ترتيب</span><button type="button" data-ers="file">📋 الملف</button><button type="button" data-ers="hand">🤝 سلّم</button></div>' +
          '<button type="button" class="ers-log" id="erslog" data-ers="file" aria-live="polite"></button><div class="ers-grid" id="ersgrid"></div></div>');
        $(".ers-tbtn").insertAdjacentHTML("beforeend", '<button type="button" class="ers-pz glass" data-ers="pause" aria-label="وقّف الوقت">⏸</button>');
        if (!st.log.length) logLine({ ic: "🛏️", txt: "المريض بغرفة 3. قيس، افحص، وعالج بالترتيب يلّي بتشوفو صح.", t: 0 });
        else logLine(st.log[st.log.length - 1]);
      }
      $("#ersgrid").innerHTML = grid(); place(); refresh(); if (!loop) loop = setInterval(step, 250);
    }
    function logLine(e) { var x = $("#erslog"); if (x) x.innerHTML = '<i dir="ltr">' + clock(e.t || 0) + "</i> " + e.ic + " " + fr(e.txt) + (e.fast ? " ⚡" : ""); }
    function val(k) { var s = st.seen[k]; if (k === "fc" && st.scope) return { v: E.vit(st, "fc"), live: 1 }; return s ? { v: s.val, age: Math.round(st.t - s.t) } : null; }
    function refresh() {
      if (!st) return; var S = E.status(st), hn = E.hint(st), red = S.b === 2;
      hp = [85, 55, 20][S.b];
      var txt = st.lv === 1 || (st.lv === 2 && red) ? (hn ? "💡 الجاية: " + hn.ic + " " + fr(hn.n) : "📈 قيس مرّة تانية وتأكّد") : "🩺 قيّم وعالج المريض";
      setTask('<span class="ers-clk" dir="ltr">🕒 ' + clock(st.t) + "</span>" + (paused ? " ⏸" : "") + " " + txt);
      var hpEl = $("#ershp"); hpEl.style.width = S.hp + "%"; hpEl.className = S.c;
      var ks = E.keys(c.id), kd = ks.filter(function (k) { return st.done[k]; }).length;
      $("#erspr").style.width = (100 * kd / ks.length) + "%"; $("#erssc").textContent = kd + "/" + ks.length;
      $("#ersst").innerHTML = '<div class="ers-stl ' + S.c + '">' + S.ic + " المريض: <b>" + S.n + "</b></div>";
      var any = false;
      [["fc", "#ersfc", ""], ["ta", "#ersta", ""], ["spo", "#ersspo", "%"], ["t", "#erst2", ""]].forEach(function (x) {
        var v = val(x[0]), b = $(x[1]); if (v) any = true;
        b.innerHTML = v ? esc(v.v) + x[2] + (v.live ? "" : '<i class="ers-age">' + (v.age ? v.age + "د" : "هلّق") + "</i>") : "--";
      });
      $("#ersiv").innerHTML = simIv || "—";
      var m = $(".ers-mon"), keep = /\b(up|dn|alarm)\b/.exec(m.className);
      m.className = "ers-mon glass " + (any ? S.c : "") + (keep ? " " + keep[1] : "") + (st.scope ? " live" : "");
      var ec = $(".ers-ecgt"); if (ec) ec.innerHTML = st.ecgTxt ? fr(st.ecgTxt) : (st.scope ? "" : "📟 الـ monitor مش موصول: ركّبو لتشوف النبض والـ ECG عطول");
      el.classList.toggle("ers-red", red);
    }
    function save(force) { var n = Date.now(); if (force || n - lastSave > 2000) { lastSave = n; if (SIM.save) SIM.save(st); } }
    function step() {
      if (!st || st.end) return;
      var modal = sc !== "c" || sheetOpen || !pop.hidden;
      if (paused || (modal && st.lv < 3) || d.hidden) return;
      handle(E.tick(st, 0.25 / E.K.sec[st.lv])); refresh(); save();
    }
    function beep() {
      if (!snd.on) return;
      try { if (!snd.ac) snd.ac = new (w.AudioContext || w.webkitAudioContext)(); var ac = snd.ac, t = ac.currentTime;
        [0, 0.25, 0.5].forEach(function (k) { var o2 = ac.createOscillator(), g2 = ac.createGain(); o2.frequency.value = 880; g2.gain.value = 0.06; o2.connect(g2); g2.connect(ac.destination); o2.start(t + k); o2.stop(t + k + 0.14); }); } catch (e) {}
    }
    function handle(es) {
      (es || []).forEach(function (e) {
        logLine(e);
        if (e.kind === "alarm") {
          var m = $(".ers-mon"); m.classList.add("alarm"); setTimeout(function () { m.classList.remove("alarm"); }, 3500); beep();
          var hn = E.hint(st); toast("<b>" + fr(e.txt) + "</b>" + (st.lv < 3 && hn ? "<br>💡 جرّب: " + hn.ic + " " + fr(hn.n) : ""));
        } else if (e.kind === "res") { toast("🧪 طلعت النتيجة: " + fr(e.txt)); refreshGrid(); }
        else if (e.kind === "info") toast(fr(e.txt));
      });
      if (st.end) simEnd();
    }
    function refreshGrid() { var g = $("#ersgrid"); if (g) g.innerHTML = grid(); if (sheetOpen && sheet.getAttribute("data-g")) simGroup(sheet.getAttribute("data-g"), 1); }
    function closeSheet() { sheetOpen = false; sheet.hidden = true; sheet.innerHTML = ""; sheet.removeAttribute("data-g"); el.classList.remove("sheet-on"); place(); }
    function simGroup(k, keep) {
      if (st.end) return; var L = list(k), nm = GL[k] || (SPOTS[k] ? SPOTS[k].ic + " " + SPOTS[k].n : "");
      sheet.setAttribute("data-g", k); sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on");
      sheet.innerHTML = '<div class="ers-shh"><b>' + fr(nm) + '</b> <span dir="ltr">🕒 ' + clock(st.t) + "</span></div>" + (L.length ? '<div class="ers-opts">' + L.map(function (a) { return btnA(a, 1); }).join("") + "</div>" : '<p class="small">ما في شي هون لهالحالة.</p>') +
        '<div class="sbtns"><button type="button" class="btn" data-ers="shx">⬅️ رجوع</button></div>';
      if (!keep) sheet.scrollTop = 0;
    }
    function doIt(aid) {
      if (!st || st.end) return; var a = E.act(c.id, aid);
      if (a && a.k === "talk") { var r0 = E.doAct(st, aid); if (r0.blocked) return toast(r0.blocked); handle(r0.entries); closeSheet(); save(1); if (!st.end) sceneD(); return; }
      var r = E.doAct(st, aid);
      if (r.blocked != null && !r.a) { if (r.blocked) toast(r.blocked); return; }
      handle(r.entries.filter(function (e) { return e.a !== aid; })); var me = r.entries.filter(function (e) { return e.a === aid; })[0];
      if (me) logLine(me);
      save(1); refresh(); refreshGrid();
      if (st.end) return;
      if (r.quiz) {
        sheet.removeAttribute("data-g"); sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on");
        return SIM.onQuiz(r.quiz, sheet, function (okN, n) { handle(E.quiz(st, aid, okN, n, r.qk)); save(1); refresh(); refreshGrid(); closeSheet(); });
      }
      var gk = grpOf(a), m = $(".ers-mon");
      if (r.good === false && me && me.r) {   // wrong treatment: ❌ / ✅ + the line from the notes, patient worse
        m.classList.add("dn"); setTimeout(function () { m.classList.remove("dn"); }, 900);
        if (SIM.onMiss) SIM.onMiss(a, me);
        sheet.removeAttribute("data-g"); sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on");
        sheet.innerHTML = '<p class="small sfb">📉 حالة المريض تدهورت</p>' + SIM.fb(fr(a.n), fr(me.r), fr(a.x)) + '<div class="sbtns"><button type="button" class="btn on" data-ers="shx">كمّل ⬅️</button></div>';
        return;
      }
      if (gk && r.good) {
        if (a.g === "iv") simIv = fr(a.n.length > 30 ? a.n.slice(0, 30) + "…" : a.n);
        m.classList.add("up"); setTimeout(function () { m.classList.remove("up"); }, 900); refresh();
        sheet.removeAttribute("data-g"); sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on");
        sheet.innerHTML = '<div class="gfb erok" role="status"><p>✅ ' + fr(a.n) + (me.fast ? " ⚡ (بالوقت!)" : "") + "</p><p>📈 المريض رح يتحسّن شوي شوي بالدقايق الجاية — ارجع قيس لتشوف.</p><p class=\"small\">💡 " + fr(a.x) + '</p></div><div class="sbtns"><button type="button" class="btn on" data-ers="shx">كمّل ⬅️</button></div>';
        return;
      }
      if (me) toast(me.ic + " " + fr(me.txt) + (me.x && r.good === false ? '<br><span class="small">💡 ' + fr(me.x) + "</span>" : ""));
      if (sheetOpen && sheet.getAttribute("data-g")) simGroup(sheet.getAttribute("data-g"), 1);
    }
    function fileHtml() {
      return "<h3>📋 ملف المريض / سجلّ التمريض</h3><p>" + fr(c.who) + "</p>" + (c.sx && c.sx.length ? "<p><b>الأعراض عالوصول:</b> " + c.sx.map(fr).join("، ") + "</p>" : "") +
        '<ol class="ers-file">' + st.log.map(function (e) { return '<li><i dir="ltr">' + clock(e.t) + "</i> " + e.ic + " " + fr(e.txt) + (e.fast ? " ⚡" : "") + (e.x && e.kind !== "meas" ? '<br><span class="small">💡 ' + fr(e.x) + "</span>" : "") + "</li>"; }).join("") + "</ol>";
    }
    function simEnd() {
      if (loop) { clearInterval(loop); loop = 0; } refresh(); if (SIM.save) SIM.save(st);
      var S = E.status(st), t = st.end === "ok" ? "🎉 برافو!" : st.end === "lost" ? "🔴 المريض تدهور" : "🤝 سلّمت الحالة";
      var last = st.log.filter(function (e) { return e.a === "end"; }).pop();
      sheet.removeAttribute("data-g"); sheetOpen = true; sheet.hidden = false; el.classList.add("sheet-on");
      sheet.innerHTML = '<div class="gfb ' + (st.end === "ok" ? "erok" : "") + '" role="status"><p><b>' + t + "</b></p><p>" + (last && st.end !== "hand" ? fr(last.txt) : "") + '</p><p class="small">🕒 ' + clock(st.t) + " · " + S.ic + " " + S.n + "</p></div>" +
        '<div class="sbtns"><button type="button" class="btn on" data-ers="simdone">📊 شوف النتيجة والترتيب الصح</button></div>';
    }
    function simClick(a, t) {
      if (a === "pause") { paused = !paused; t.textContent = paused ? "▶️" : "⏸"; refresh(); return true; }
      if (a === "file") { popup(fileHtml()); return true; }
      if (a === "hand") { if (st.end) return true; popup("<h3>🤝 سلّم الحالة؟</h3><p>بتخلص الجولة هلّق وبتشوف النتيجة.</p>" + '<div class="sbtns"><button type="button" class="btn on" data-ers="handok">إيه، سلّم</button></div>'); return true; }
      if (a === "handok") { pop.hidden = true; E.handover(st); simEnd(); return true; }
      if (a === "shx") { closeSheet(); refresh(); return true; }
      if (a === "simdone") { close(false); if (SIM.onEnd) SIM.onEnd(st); return true; }
      if (a === "x") { if (loop) clearInterval(loop); loop = 0; if (!st.end && SIM.save) SIM.save(st); return false; }
      if (a === "act" || a === "med" || a === "inv" || a === "menu") return false;
      return false;
    }
    if (SIM) el.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-sa],[data-sg]") : null; if (!t) return;
      if (t.hasAttribute("data-sg")) return simGroup(t.getAttribute("data-sg"));
      doIt(t.getAttribute("data-sa"));
    });

    if (SIM && SIM.resume) { sceneC(); } else { sceneA(); bars(); }
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
