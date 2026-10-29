/* 🏠 home tiles (Abdullah, Oct 28 6:32–6:36 AM): the big title banner «قلب وأعصاب — دروس تمريض» is gone; in its place small tiles, each ONLY
   an icon, a short name and a number («أونلاين ١»، «امتحانات الأسبوع ٢»). Nothing of the exam shows until the student taps a tile; the tap
   opens it and he solves it there.
     📅 امتحانات الأسبوع — today's two exams (assets/account.js examsFor), the number = still to do today → sheet with today's exams
     ⚔️ تحدي اليوم       — the daily class challenge (assets/duel.js), 1 = still to play today → the full challenge card in a sheet
     🏫 امتحان الصف      — this week's class exam + «❓ سؤال اليوم» of each class (the same data as «✅ أهدافك اليوم») → sheet with links
     🟢 أونلاين          — classmates + friends online now (assets/presence.js) → the existing «مين أونلاين» list
     📖 كمّل آخر درس     — the last lesson page / part opened (assets/nav.js nursin_last_v1); none yet = «ابدأ»
     🎮 الألعاب          — games.html straight away (no number)
     🔁 مراجعة اليوم     — (Oct 28 8:32 PM) wide tile: today's due spaced-repetition questions (assets/srs.js) → quiz.html?t=review
     🏫 also lists 📝 «كويز الصف (كل ٣ أيام)» of each class (assets/qstats.js) in its number and sheet
   Signed out: the numbers that need an account show 🔒 and the tap explains / goes to sign-in. The full cards (#duel, #onl chip, ▶️ continue)
   stay in the page, parked in a hidden holder, so they are not shown twice. No ad inside or next to the sheet. */
(function (w, d) {
  var box = d.getElementById("htiles"); if (!box) return;
  var hold = d.getElementById("tilehold"), counts = { duel: null, onl: null, cq: null }, duelSt = "", cqItems = [];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!(w.Nursin && w.Nursin.me); }
  function today() { var N = w.Nursin; return N && N.dayKey ? N.dayKey() : new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  function goals() { try { return (w.NursinGoals && w.NursinGoals.list && w.NursinGoals.list()) || null; } catch (e) { return null; } }
  function examsToday() { try { return w.Nursin && w.Nursin.examsFor ? w.Nursin.examsFor(today()) : []; } catch (e) { return []; } }
  // pure: tile numbers from today's goal list (tests run it through window.NursinTiles.calc)
  function calc(list) {
    var ex = [], cl = [];
    (list || []).forEach(function (g) { if (/^ex:/.test(g.k)) ex.push(g); else if (/^cls:/.test(g.k) || g.k === "dq") cl.push(g); });
    return { exams: ex, examsLeft: ex.filter(function (g) { return !g.done; }).length, cls: cl, clsLeft: cl.filter(function (g) { return !g.done; }).length };
  }
  function setNum(k, v, cls) {
    var el = box.querySelector('[data-tc="' + k + '"]'); if (!el) return;
    el.textContent = v; el.className = "htc" + (cls ? " " + cls : "");
    var t = el.closest(".htile"); if (t) t.classList.toggle("hot", cls === "todo");
  }
  function paint() {
    var s = signed(), g = s ? goals() : null, c = calc(g);
    // 📅 today's exams: the number is what is still to do (signed out: how many there are today)
    if (s && g) { var ex = c.exams.length ? c.exams : examsToday(); setNum("exams", c.exams.length ? (c.examsLeft ? c.examsLeft : "✓") : ex.length || "0", c.examsLeft ? "todo" : c.exams.length ? "done" : ""); }
    else { var n = examsToday().length; setNum("exams", n || "0", n ? "todo" : ""); }
    // ⚔️ the challenge
    if (!s) setNum("duel", "🔒", "lock");
    else if (counts.duel == null) setNum("duel", "…", "");
    else setNum("duel", counts.duel ? counts.duel : duelSt === "done" ? "✓" : "0", counts.duel ? "todo" : duelSt === "done" ? "done" : "");
    // 🏫 class exam + question of the day
    if (!s) setNum("cls", "🔒", "lock");
    else if (!g && counts.cq == null) setNum("cls", "…", "");
    else { var cn = c.cls.length + cqItems.length, cl = c.clsLeft + (counts.cq | 0);   // + 📝 «كويز الصف (كل ٣ أيام)» (assets/qstats.js)
      setNum("cls", cn ? (cl ? cl : "✓") : "0", cl ? "todo" : cn ? "done" : ""); }
    // 🔁 today's spaced-repetition reviews (assets/srs.js) — works signed out too (saved in this browser)
    var S = w.NursinSRS; if (!s) setNum("review", "🔒", "lock"); else if (S) { var rn = S.count(); setNum("review", rn, rn ? "todo" : "done"); }
    // 🟢 online
    if (!s) setNum("onl", "🔒", "lock");
    else setNum("onl", counts.onl == null ? "…" : counts.onl, counts.onl ? "live" : "");
    // 📖 last lesson
    var L = w.NursinNav && w.NursinNav.lastLesson ? w.NursinNav.lastLesson() : null, a = box.querySelector('[data-tile="last"]');
    if (a) {
      if (L) { a.setAttribute("href", L.href); setNum("last", L.name, "sub"); a.setAttribute("aria-label", "كمّل آخر درس: " + L.name + (L.part ? " — " + L.part : "")); }
      else { a.setAttribute("href", "cardio.html"); setNum("last", "ابدأ", "sub"); a.removeAttribute("aria-label"); }
    }
  }

  /* ---- the sheet a tile opens ---- */
  var sheet = null, moved = null;
  function close() {
    if (!sheet) return;
    if (moved && hold) { hold.appendChild(moved); moved = null; }
    sheet.remove(); sheet = null; d.documentElement.classList.remove("tileon");
  }
  function open(title, body, node) {
    close();
    sheet = d.createElement("div"); sheet.className = "onlsheet tsheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", title);
    sheet.innerHTML = '<div class="onlbox tbox"><div class="onlhd"><b>' + esc(title) + '</b><button class="btn sm" type="button" data-tx aria-label="سكّر">✖</button></div><div class="tbody2">' + (body || "") + "</div></div>";
    if (node) { moved = node; sheet.querySelector(".tbody2").appendChild(node); }
    d.body.appendChild(sheet); d.documentElement.classList.add("tileon");
    sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.closest("[data-tx]")) close(); });
    var x = sheet.querySelector("[data-tx]"); if (x) x.focus();
  }
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && !d.querySelector(".duelq")) close(); });
  function rows(list) {
    return '<nav class="gil">' + list.map(function (g) {
      return '<a class="gi goi' + (g.done ? " done" : "") + '" href="' + esc(g.href) + '"><span class="gie" aria-hidden="true">' + (g.e || "📝") + '</span><span class="git"><b>' + esc(g.n) + "</b>" + (g.s ? "<small>" + esc(g.s) + "</small>" : "") + '</span><span class="gotick" aria-hidden="true">' + (g.done ? "✅" : "▶️") + "</span></a>";
    }).join("") + "</nav>";
  }
  var LOCK = function (what) { return '<p class="small">🔒 ' + what + ' بدّو حساب. سجّل دخول بغوغل (ببلاش) وبيفتحلك.</p><p><a class="btn pri" href="friends.html">👤 سجّل دخول</a></p>'; };
  function tap(k) {
    var s = signed(), g = s ? goals() : null, c = calc(g);
    if (k === "exams") {
      var list = c.exams.length ? c.exams : examsToday().map(function (x) { return { e: "📅", n: "امتحان اليوم: " + x.n, s: x.ar || "", href: "quiz.html?exam=" + encodeURIComponent(x.id), done: false }; });
      open("📅 امتحانات الأسبوع", (list.length ? '<p class="small">امتحانات اليوم (' + list.length + "). كبوس على الامتحان لتحلّو.</p>" + rows(list) : '<p class="small">ما في امتحانات اليوم 🎉</p>') +
        (s ? "" : '<p class="small">🔒 لازم تسجّل دخول تا تقدّم الامتحان وتنحسبلك النقاط.</p>') + '<p><a class="btn" href="exams.html">📅 كل امتحانات الأسبوع والأوائل</a></p>');
    } else if (k === "duel") {
      var el = d.getElementById("duel");
      open("⚔️ تحدي اليوم", "", el);
    } else if (k === "cls") {
      if (!s) { open("🏫 امتحان الصف", LOCK("امتحان الصف")); return; }
      var cll = c.cls.concat(cqItems);
      open("🏫 امتحان الصف", cll.length ? rows(cll) + '<p><a class="btn" href="classes.html">🏫 صفّي</a></p>' : (g ? '<p class="small">ما عندك صف بعد. فوت على صفّك بالكود اللي عطاك ياه الأستاذ.</p><p><a class="btn pri" href="classes.html">🏫 فوت على صفّك</a></p>' : '<p class="small">⏳ …</p><p><a class="btn" href="classes.html">🏫 صفّي</a></p>'));
      if (!g && w.NursinGoals && w.NursinGoals.fetch) w.NursinGoals.fetch().then(function () { if (sheet) tap("cls"); });
    } else if (k === "onl") {
      if (!s) { open("🟢 مين أونلاين", LOCK("تشوف مين أونلاين")); return; }
      if (w.NursinOnline && w.NursinOnline.open) w.NursinOnline.open();
      else open("🟢 مين أونلاين", '<p class="small">⏳ عم نجيب مين أونلاين… جرّب كمان شوي.</p>');
    }
  }
  box.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-tile]"); if (!t) return;
    var k = t.getAttribute("data-tile"); if (k === "last" || k === "games" || k === "review") return;   // plain links
    e.preventDefault(); tap(k);
  });
  d.addEventListener("nursin:tile", function (e) {
    var x = e.detail || {}; if (x.k === "duel") { counts.duel = x.n | 0; duelSt = x.st || ""; } else if (x.k === "onl") counts.onl = x.n | 0; else if (x.k === "cq") { counts.cq = x.n | 0; cqItems = x.items || []; } paint();
  });
  ["nursin:goals", "nursin:gate", "nursin:auth", "nursin:srs"].forEach(function (ev) { d.addEventListener(ev, function () { setTimeout(paint, 30); }); });
  /* ⚠️ «الأخطاء الشائعة» folds (Abdullah, Oct 29 6:14 AM: «تصغر وبس بدنا منكبرها ومنشوف»): closed by default, only the title + count + ▾;
     opened/closed is remembered on this device (localStorage nursin_cmist_v1 = 1 open / 0 closed) */
  (function () {
    var f = d.getElementById("cmfold"); if (!f) return;
    try { if (localStorage.getItem("nursin_cmist_v1") === "1") f.open = true; } catch (e) {}
    f.addEventListener("toggle", function () { try { localStorage.setItem("nursin_cmist_v1", f.open ? "1" : "0"); } catch (e) {} });
  })();
  w.NursinTiles = { calc: calc, paint: paint, open: tap, close: close };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", paint); else paint();
  setTimeout(paint, 1500);
})(window, document);
