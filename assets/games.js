/* 🎮 ألعاب (Abdullah, Oct 26 2026 6:04 PM): 3 light games built ONLY from the site's own content, each round pays a few points
   (signed in, via the existing points system; max 20 a round and 60 a day — assets/study.js) and counts the day 🔥. No ads in here.
   🧩 وصّل            — French/English term ↔ Arabic meaning: «Term (معنى)» answers in the quiz bank (assets/quiz-data.js) + the
                         [français, عربي] items of the drug cards (assets/pharma-data.js); a subject with few terms adds its short
                         question ↔ right-answer pairs from the same bank.
   ⚡ تحدّي ٦٠ ثانية   — true/false: a quiz question with its right option (صح) or one of its wrong options (غلط).
   ⌨️ عبّي بسرعة       — 60 s fill-in on the site's own «عبّي الفراغ» sentences (assets/blanks-data.js); added Oct 26 7:42 PM.
   🃏 لعبة الذاكرة      — flip cards to find pairs: drug ↔ what it's for (pharma), term ↔ meaning elsewhere.
   🪜 سلّم المراحل      — added Oct 26 7:44 PM (Abdullah: several stages back to back, not one round): levels 1→5 in a row, each =
                         4 multiple-choice questions from the quiz bank of the chosen subject, time per question 20/17/14/11/8 s,
                         3 ❤️ for the whole run (wrong or timeout = −1), «🎉 المرحلة X خلصت!» between levels, game over at 0 ❤️,
                         win after level 5. Pays 4 points per level cleared (≤ ROUND_MAX, ≤ GAME_CAP a day), counts as a game round
                         for the daily 🎮 goal, best = most levels cleared (localStorage nursin_games_v1 «stage»). Own difficulty
                         (the timer), so the سهل/وسط/صعب picker doesn't change it.
   ❌/✅ تصحيح فوري + 📋 أخطاءك — added Oct 26 9:05 PM (Abdullah: «بس أغلط دغري يكون مبيّن الحل»): in every game a wrong answer
                         shows right away «❌ إنت اخترت: X — ✅ الصح: Y» (+ the quiz item's own explanation when it has one), the
                         player's pick in red and the right one in green; ٦٠ ثانية / عبّي بسرعة / سلّم المراحل pause their clock
                         while it shows (≈2 s, 3.5 s with an explanation, or tap «كمّل»); وصّل / الذاكرة flash the right partner of
                         the wrong match. Each round ends with «📋 أخطاءك» (question/term → your answer → right answer) and
                         «🎯 راجع أخطاءك», which replays only those items: untimed, no points, no best score, not a game round.
   🚑 ناوبة بالطوارئ   — added Oct 27 2026 (Abdullah): ER nursing sim from his réa notes (assets/ersim-data.js), see erGame below. */
(function (w, d) {
  var BEST = "nursin_games_v1", ROUND_MAX = 20;
  var GN = { match: "🧩 وصّل", tf: "⚡ تحدّي ٦٠ ثانية", mem: "🃏 لعبة الذاكرة", fill: "⌨️ عبّي بسرعة", stage: "🪜 سلّم المراحل", er: "🚑 ناوبة بالطوارئ" };
  /* 🎚️ سهل / وسط / صعب (Abdullah, Oct 26 7:42 PM: harder, more varied): وصّل 5/7/9 pairs · ٦٠ ثانية 60/45/30 s (صعب: −1 لكل غلط)
     · الذاكرة 6/8/10 pairs · عبّي بسرعة: سهل/وسط = اختيارات لما الجملة إلها اختيارات، صعب = كلّو كتابة. Points ×1 / ×1.5 / ×2
     (still ≤ ROUND_MAX a round and GAME_CAP a day). */
  var LV = [null, { n: "سهل", m: 1, match: 5, tf: 60, mem: 6 }, { n: "وسط", m: 1.5, match: 7, tf: 45, mem: 8 }, { n: "صعب", m: 2, match: 9, tf: 30, mem: 10 }], lv = 1;
  try { lv = Math.min(3, Math.max(1, +localStorage.getItem("nursin_games_lv") || 1)); } catch (e) {}
  function lvPts(n) { return Math.round(Math.max(0, n) * LV[lv].m); }
  function bk(g) { return lv > 1 && g !== "stage" ? g + lv : g; }   // best score per game and level (easy keeps the old key; 🪜 has one)
  var STAGE = { levels: 5, per: 4, lives: 3, secs: [20, 17, 14, 11, 8], pts: 4 };   // 🪜 سلّم المراحل
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function strip(h) { return String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var AR = /^[\u0600-\u06FF]/, LAT = /^[A-Za-zÀ-ÿ0-9]/, BAD = /^(أو |يعني|بس |مش |مع |لأن|إذا)/;
  var PAIR = /^([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 '’\-\/\.,+]{1,40}?) \(([\u0600-\u06FF][^()]{1,40})\)$/;

  function quiz() { return w.QUIZ || []; }
  function groups() { return w.QGROUPS || {}; }
  function subjOf(t) { var g = groups(); for (var k in g) if (g[k].indexOf(t) >= 0) return k; return ""; }
  function inS(q, s) { return s === "all" || subjOf(q.t) === s; }
  function dedupe(list) { var A = {}, B = {}, out = []; list.forEach(function (p) { var a = p.a.toLowerCase(), b = p.b; if (A[a] || B[b] || a === b.toLowerCase()) return; A[a] = B[b] = 1; out.push(p); }); return out; }

  // term ↔ meaning pairs for a subject ("all" = every subject)
  function terms(s) {
    var out = [];
    quiz().forEach(function (q) {
      if (!inS(q, s)) return;
      (q.o || []).forEach(function (o) { var m = PAIR.exec(strip(o)); if (m && !BAD.test(m[2].trim()) && m[2].trim().length <= 35) out.push({ a: m[1].trim(), b: m[2].trim(), fr: 1, s: subjOf(q.t) }); });
    });
    var P = w.PHARMA;
    if (P && (s === "all" || s === "pharma")) P.drugs.forEach(function (dr) {
      ["fam", "act", "ind"].forEach(function (k) { (dr[k] || []).forEach(function (x) { if (x && x[0] && x[1] && LAT.test(x[0]) && AR.test(x[1]) && x[0].length <= 40 && x[1].length <= 35) out.push({ a: x[0], b: x[1], fr: 1, s: "pharma" }); }); });
    });
    return dedupe(out);
  }
  // short question ↔ right answer pairs (for subjects written only in Arabic: law, management, quality)
  function qa(s) {
    var out = [];
    quiz().forEach(function (q) { if (!inS(q, s)) return; var a = strip(q.q), b = strip((q.o || [])[q.a]); if (a.length <= 90 && b.length <= 45 && !/^نفس /.test(a)) out.push({ a: a, b: b, fr: 0, s: subjOf(q.t) }); });
    return dedupe(out);
  }
  function pairs(s) { var t = terms(s); return t.length >= 8 ? t : dedupe(t.concat(qa(s))); }
  // memory cards: drug ↔ what it's for on the pharma subject, else term ↔ meaning
  function memPairs(s) {
    var P = w.PHARMA, out = [];
    if (P && s === "pharma") P.drugs.forEach(function (dr) { var i = dr.ind && dr.ind[0]; if (i && i[1] && i[1].length <= 30 && dr.n && dr.n[0]) out.push({ a: dr.n[0], b: i[1], fr: 1, s: "pharma", drug: 1 }); });
    out = dedupe(out);
    return out.length >= 6 ? out : pairs(s);
  }
  // true / false statements: the question + its right option (true) or a wrong option (false)
  function tf(s) {
    var out = [];
    quiz().forEach(function (q) {
      if (!inS(q, s) || !q.o || q.o.length < 2) return; var qq = strip(q.q); if (/^نفس /.test(qq) || qq.length > 220) return;
      var ok = Math.random() < 0.5, wrong = q.o.map(function (o, i) { return i; }).filter(function (i) { return i !== q.a; });
      var pick = ok ? q.a : wrong[Math.floor(Math.random() * wrong.length)];
      out.push({ q: qq, o: strip(q.o[pick]), ok: ok, right: strip(q.o[q.a]), s: subjOf(q.t), src: q });
    });
    return shuffle(out);
  }
  // ⌨️ fill-in items: the site's own «عبّي الفراغ» sentences (assets/blanks-data.js)
  function blanks(s) { return shuffle((w.BLANKS || []).filter(function (b) { return b && b.s && b.a && (s === "all" || subjOf(b.t) === s); })); }
  // what counts as the right word: the answer, its accepted spellings, the answer without its (…) part, the (…) part, and «X أو Y»
  function fnorm(x) {
    return String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[٠-٩]/g, function (c) { return "٠١٢٣٤٥٦٧٨٩".indexOf(c); })
      .replace(/[–—]/g, "-").replace(/[^a-z0-9\u0621-\u064A-]+/g, "").replace(/^ال(?=..)/, "");
  }
  function accepts(b) {
    var c = [b.a].concat(b.alts || []), out = {};
    c.slice().forEach(function (x) { var m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(x); if (m) { c.push(m[1]); c.push(m[2]); } String(x).split(" أو ").forEach(function (y) { c.push(y); }); });
    c.forEach(function (x) { var n = fnorm(x); if (n) out[n] = 1; }); return out;
  }
  function fillOk(b, typed) { var n = fnorm(typed); return !!n && !!accepts(b)[n]; }
  // 🪜 multiple-choice questions of a subject (skip «نفس …» ones that lean on the question before)
  function mcq(s) { return quiz().filter(function (q) { return inS(q, s) && q.o && q.o.length >= 2 && q.a >= 0 && q.a < q.o.length && !/^نفس /.test(strip(q.q)); }); }
  function enough(g, s) { return g === "er" ? erCases().length > 0 : g === "stage" ? mcq(s).length >= 8 : g === "tf" ? tf(s).length >= 6 : g === "fill" ? blanks(s).length >= 4 : (g === "mem" ? memPairs(s) : pairs(s)).length >= (g === "mem" ? 6 : 5); }

  /* ---- shared bits ---- */
  var sel = "all", area = null, timer = 0;
  function best() { try { return JSON.parse(localStorage.getItem(BEST) || "null") || {}; } catch (e) { return {}; } }
  function saveBest(g, n) { var b = best(); g = bk(g); var nw = (b[g] | 0) < n; if (nw) { b[g] = n; try { localStorage.setItem(BEST, JSON.stringify(b)); } catch (e) {} } return nw; }
  function txt(p, side) { var v = side ? p.b : p.a; return p.fr && !side ? '<span dir="ltr" lang="fr">' + esc(v) + "</span>" : esc(v); }
  function finish(g, score, extra) {
    clearInterval(timer);
    var pts = Math.min(ROUND_MAX, g === "stage" ? (score | 0) * STAGE.pts : lvPts(score | 0)), nb = saveBest(g, score | 0);
    area.innerHTML = '<h2>' + GN[g] + ' — خلصت الجولة!</h2><p class="gres">' + extra + "</p>" +
      (nb && score ? '<p>🏆 <b>أحسن نتيجة إلك!</b></p>' : (g === "stage" ? '<p class="small">أحسن نتيجة إلك: <b>' + (best().stage | 0) + "/" + STAGE.levels + "</b> مراحل</p>" : '<p class="small">أحسن نتيجة إلك: <b>' + (best()[bk(g)] | 0) + "</b> (" + LV[lv].n + ")</p>")) +
      '<p class="small" id="gpts"></p>' + missHtml(lastMiss = miss.slice()) + '<div class="sbtns"><button class="btn on" type="button" data-again="' + g + '">🔁 جولة جديدة</button><button class="btn" type="button" data-back="1">🎮 لعبة تانية</button></div>';
    var S = w.NursinStudy;
    if (S) { var o = S.activity("game", pts, GN[g].replace(/^\S+\s/, ""), d.getElementById("gpts")); if (o && o.paid < pts && w.Nursin && w.Nursin.me) d.getElementById("gpts").insertAdjacentHTML("afterend", '<p class="small">وصلت لحدّ نقاط الألعاب اليوم (' + S.GAME_CAP + ")، بس بتضل تلعب وتتمرّن 💪</p>"); }
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function head(g, sub) { return '<div class="ghead"><b>' + GN[g] + "</b> <span class=\"small\">" + (g === "er" ? "حالات من درس الـ réa" : sel === "all" ? "كل المواد" : esc((w.QSUBJ || {})[sel] || sel)) + " · " + (g === "stage" ? STAGE.levels + " مراحل" : g === "er" ? LV[lv].n + " · " + (w.ERSTORY ? "حالة قصّة" : (lv + 2) + " خطوات") : LV[lv].n) + "</span>" + (sub || "") + '<button class="btn gx" type="button" data-back="1">✕</button></div>'; }

  /* ---- ❌/✅ instant correction + 📋 this round's mistakes + 🎯 replay (no points) ---- */
  var miss = [], lastMiss = [], lastG = "", replaying = false, FB_MS = 2000, FB_X_MS = 3500;
  function fbLine(yours, right, x, btn) {
    return '<div class="gfb" role="status"><p>❌ إنت اخترت: <b class="gy">' + yours + '</b> — ✅ الصح: <b class="gr">' + right + "</b></p>" +
      (x ? '<p class="small">💡 ' + x + "</p>" : "") + osm() + (btn ? '<div class="sbtns"><button class="btn on gkm" type="button">كمّل ⬅️</button></div>' : "") + "</div>";
  }
  // 👨‍🏫 الأستاذ عثمان (assets/osman.js): a line inside every correction card; a short praise toast every 5 right in a row
  function osm() { return w.Osman ? w.Osman.wrong() : ""; }
  function osmOk() { if (w.Osman) w.Osman.toast(w.Osman.right()); }
  // wait on the feedback: «كمّل» goes on at once, else after ms (0 = only on tap)
  function hold(ms, go, root) {
    var done = false, t = 0, bs = (root || area).querySelectorAll(".gkm"), b = bs[bs.length - 1];
    function fire() { if (done) return; done = true; clearTimeout(t); go(); }
    if (b) b.addEventListener("click", fire);
    if (ms) t = setTimeout(fire, ms);
  }
  function addMiss(m) { if (replaying) return; for (var j = 0; j < miss.length; j++) if (miss[j].k === m.k) { miss[j].y = m.y; return; } miss.push(m); }
  function missHtml(list, again) {
    if (!list.length) return '<p class="small gmok">👌 ولا غلطة بهالجولة!</p>';
    return '<div class="gmiss"><h3>📋 أخطاءك (' + list.length + ")</h3><ol>" + list.map(function (m) {
      return '<li><div class="gmq">' + m.q + '</div><div class="small">❌ إنت: <span class="gy">' + m.y + '</span> ← ✅ الصح: <b class="gr">' + m.r + "</b></div></li>"; }).join("") +
      '</ol><div class="sbtns"><button class="btn on" type="button" data-review="1">🎯 ' + (again ? "راجعن مرّة تانية" : "راجع أخطاءك") + '</button></div><p class="small">المراجعة بلا وقت وبلا نقاط.</p></div>';
  }
  // replay only the mistakes: multiple choice (quiz questions, terms) or the fill-in sentence again
  function review(list, g) {
    replaying = true; clearInterval(timer);
    var i = 0, ok = 0, again = [];
    function ask() {
      if (i >= list.length) return done();
      var m = list[i], rv = m.rv, typed = rv.t === "fill" && !(rv.b.o && rv.b.o.length);
      area.innerHTML = head(g, ' <span class="gsc">🎯 ' + (i + 1) + "/" + list.length + "</span>") + '<p class="small">🎯 مراجعة أخطاءك — بلا وقت وبلا نقاط.</p><div id="rvq"></div>';
      var box = d.getElementById("rvq");
      if (typed) {
        box.innerHTML = '<p class="sq">' + esc(rv.b.s).replace("___", '<span class="fgap">____</span>') + '</p><form class="fform" autocomplete="off"><input class="finp" type="text" aria-label="الكلمة الناقصة" placeholder="اكتب الكلمة الناقصة"><button class="btn tok" type="submit">✔️</button></form><div class="sbtns"><button class="btn" type="button" data-rskip="1">⏭️ ما بعرف</button></div>';
        var lockT = false, sub = function (v) { if (lockT) return; lockT = true; var good = v != null && fillOk(rv.b, v), inp = box.querySelector(".finp"); inp.disabled = true; box.querySelector("form button").disabled = true;
          if (good) { ok++; inp.classList.add("gok"); return setTimeout(function () { i++; ask(); }, 700); }
          again.push(m); inp.classList.add("gbad"); box.insertAdjacentHTML("beforeend", fbLine(v == null ? "⏭️ ما جاوبت" : esc(v), esc(rv.b.a), "", 1)); hold(0, function () { i++; ask(); }); };
        box.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); var v = box.querySelector(".finp").value; if (v.trim()) sub(v); });
        box.querySelector("[data-rskip]").addEventListener("click", function () { sub(null); });
        return;
      }
      var o = rv.t === "fill" ? rv.b.o : rv.o, a = rv.t === "fill" ? rv.b.o.indexOf(rv.b.a) : rv.a, q = rv.t === "fill" ? esc(rv.b.s).replace("___", '<span class="fgap">____</span>') : rv.q;
      var order = shuffle(o.map(function (x, k) { return k; }));
      box.innerHTML = '<p class="sq">' + q + '</p><div id="ropts">' + order.map(function (k, j) { return '<button class="opt" type="button" data-ro="' + k + '"><span class="l" dir="ltr">' + "abcd"[j] + "</span><span>" + (rv.t === "fill" ? esc(o[k]) : o[k]) + "</span></button>"; }).join("") + "</div>";
      var lk = false;
      box.querySelector("#ropts").addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-ro]"); if (!b || lk) return; lk = true;
        var k = +b.getAttribute("data-ro"), good = k === a;
        [].forEach.call(box.querySelectorAll("[data-ro]"), function (x) { var kk = +x.getAttribute("data-ro"); x.disabled = true; if (kk === a) x.classList.add("ok"); else if (kk === k) x.classList.add("bad"); });
        if (good) { ok++; return setTimeout(function () { i++; ask(); }, 700); }
        again.push(m); box.insertAdjacentHTML("beforeend", fbLine(esc(strip(o[k])), esc(strip(o[a])), rv.x || "", 1)); hold(0, function () { i++; ask(); });
      });
    }
    function done() {
      replaying = false; lastMiss = again;
      area.innerHTML = "<h2>🎯 خلصت المراجعة</h2><p class=\"gres\">✅ صحّحت <b>" + ok + "</b> من " + list.length + (ok === list.length ? " 💪" : "") + '</p><p class="small">المراجعة ما إلها نقاط 🙂</p>' +
        (again.length ? missHtml(again, 1) : "") + '<div class="sbtns"><button class="btn on" type="button" data-again="' + g + '">🔁 جولة جديدة</button><button class="btn" type="button" data-back="1">🎮 لعبة تانية</button></div>';
      area.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    ask();
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* ---- 🧩 وصّل: 5 pairs a round ---- */
  function match() {
    var P = shuffle(pairs(sel)).slice(0, LV[lv].match), L = shuffle(P.map(function (p, i) { return i; })), Rr = shuffle(P.map(function (p, i) { return i; }));
    var pick = null, done = 0, ok = 0, miss = {};
    area.innerHTML = head("match", ' <span class="gsc" id="gsc">0/' + P.length + '</span>') + '<p class="small">دوس عالمصطلح، بعدين عالمعنى تبعو.</p><div id="gfbm"></div><div class="mgrid"><div class="mcol">' +
      L.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="a">' + txt(P[i], 0) + "</button>"; }).join("") + '</div><div class="mcol">' +
      Rr.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="b">' + txt(P[i], 1) + "</button>"; }).join("") + "</div></div>";
    area.querySelector(".mgrid").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".mt"); if (!b || b.disabled) return;
      if (!pick || pick.getAttribute("data-s") === b.getAttribute("data-s")) { if (pick) pick.classList.remove("sel"); pick = b; b.classList.add("sel"); return; }
      var first = pick, ai = pick.getAttribute("data-s") === "a" ? pick : b, bi = ai === pick ? b : pick, i = ai.getAttribute("data-i");
      pick.classList.remove("sel"); pick = null;
      if (i === bi.getAttribute("data-i")) {
        ai.disabled = bi.disabled = true; ai.classList.add("ok"); bi.classList.add("ok"); done++; if (!miss[i]) { ok++; osmOk(); }
        d.getElementById("gsc").textContent = done + "/" + P.length;
        if (done === P.length) setTimeout(function () { finish("match", ok, "✅ <b>" + ok + "</b> من " + P.length + " صح من أوّل مرّة"); }, 500);
        var fb0 = d.getElementById("gfbm"); if (fb0) fb0.innerHTML = "";
      } else {
        // ❌ wrong match: the first tap is the question; show its right partner in green for a moment
        miss[i] = 1;
        var side = first.getAttribute("data-s") === "a" ? 0 : 1, qi = +first.getAttribute("data-i"), wi = +(first === ai ? bi : ai).getAttribute("data-i");
        var rb = area.querySelector('.mt[data-s="' + (side ? "a" : "b") + '"][data-i="' + qi + '"]');
        [ai, bi].forEach(function (x) { x.classList.add("no"); }); if (rb) rb.classList.add("hint");
        var others = shuffle(P.filter(function (p, k) { return k !== qi; })).slice(0, 2).map(function (p) { return txt(p, 1 - side); });
        addMiss({ k: "m:" + P[qi].a + "|" + P[qi].b, q: txt(P[qi], side), y: txt(P[wi], 1 - side), r: txt(P[qi], 1 - side), rv: { t: "mcq", q: txt(P[qi], side), o: [txt(P[qi], 1 - side)].concat(others), a: 0 } });
        var fb = d.getElementById("gfbm"); if (fb) fb.innerHTML = fbLine(txt(P[qi], side) + " ↔ " + txt(P[wi], 1 - side), txt(P[qi], side) + " ↔ " + txt(P[qi], 1 - side));
        setTimeout(function () { [ai, bi].forEach(function (x) { x.classList.remove("no"); }); if (rb) rb.classList.remove("hint"); }, 1800);
      }
    });
  }

  /* ---- ⚡ ٦٠ ثانية صح ولا غلط ---- */
  function tfGame() {
    var T = LV[lv].tf, items = tf(sel), i = 0, ok = 0, bad = 0, end = Date.now() + T * 1e3, lock = false, pz = 0;
    area.innerHTML = head("tf", ' <span class="gsc" id="gt" dir="ltr">' + T + '</span>') + (lv === 3 ? '<p class="small">صعب: كل غلطة −١ 😬</p>' : "") + '<div class="tfq" id="tfq"></div><div class="sbtns tfb"><button class="btn tok" type="button" data-a="1">✅ صح</button><button class="btn tno" type="button" data-a="0">❌ غلط</button></div><p class="small">صح: <b id="tfok">0</b> · غلط: <b id="tfbad">0</b></p>';
    function show() { if (!d.getElementById("tfq")) return; if (i >= items.length) { items = items.concat(tf(sel)); } var it = items[i]; d.getElementById("tfq").innerHTML = '<p class="tfs">' + esc(it.q) + '</p><p class="tfo">الجواب: <b>' + esc(it.o) + "</b></p><p class=\"small\">صح ولا غلط؟</p>"; }
    show();
    area.querySelector(".tfb").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-a]"); if (!b || lock) return;
      var it = items[i], good = (b.getAttribute("data-a") === "1") === it.ok, box = d.getElementById("tfq");
      if (good) { ok++; osmOk(); } else bad++;
      d.getElementById("tfok").textContent = ok; d.getElementById("tfbad").textContent = bad;
      box.className = "tfq " + (good ? "ok" : "no");
      lock = true;
      function nx() { lock = false; if (!d.getElementById("tfq")) return; [].forEach.call(area.querySelectorAll(".tfb [data-a]"), function (x) { x.classList.remove("gok", "gbad"); }); box.className = "tfq"; i++; show(); }
      if (good) return setTimeout(nx, 350);
      // ❌ pause the clock, red on the pick, green on the right button, the line + the question's right answer + its explanation
      pz = Date.now();
      var said = b.getAttribute("data-a") === "1", rb = area.querySelector('.tfb [data-a="' + (said ? "0" : "1") + '"]'), q0 = it.src || {};
      b.classList.add("gbad"); if (rb) rb.classList.add("gok");
      box.insertAdjacentHTML("beforeend", '<p class="small">الجواب الصح للسؤال: <b>' + esc(it.right) + "</b></p>" + fbLine(said ? "صح" : "غلط", said ? "غلط" : "صح", q0.x || "", 1));
      addMiss({ k: "t:" + (q0.id || it.q) + "|" + it.o, q: esc(it.q) + '<br><span class="small">الجواب المعروض: ' + esc(it.o) + "</span>", y: said ? "صح" : "غلط", r: (said ? "غلط" : "صح") + " — الجواب: " + esc(it.right),
        rv: q0.o ? { t: "mcq", q: q0.q, o: q0.o, a: q0.a, x: q0.x } : { t: "mcq", q: esc(it.q) + "<br>" + esc(it.o), o: ["صح", "غلط"], a: it.ok ? 0 : 1 } });
      hold(q0.x ? FB_X_MS : FB_MS, function () { end += Date.now() - pz; pz = 0; nx(); });
    });
    timer = setInterval(function () {
      if (pz) return;   // ⏸️ paused while a correction shows
      var l = Math.max(0, Math.ceil((end - Date.now()) / 1000)), t = d.getElementById("gt"); if (t) t.textContent = l;
      if (l <= 0) { var sc = lv === 3 ? Math.max(0, ok - bad) : ok; finish("tf", sc, "⚡ جاوبت <b>" + ok + "</b> صح" + (bad ? " و" + bad + " غلط" : "") + " بـ " + T + " ثانية" + (lv === 3 && bad ? " → النتيجة <b>" + sc + "</b>" : "")); }
    }, 250);
  }

  /* ---- 🃏 الذاكرة: 6 pairs, 12 cards ---- */
  function mem() {
    var P = shuffle(memPairs(sel)).slice(0, LV[lv].mem), cards = [];
    P.forEach(function (p, i) { cards.push({ i: i, s: 0, h: txt(p, 0) }); cards.push({ i: i, s: 1, h: txt(p, 1) }); });
    cards = shuffle(cards);
    var open = [], found = 0, moves = 0, busy = false;
    area.innerHTML = head("mem", ' <span class="gsc" id="gmv">0 محاولة</span>') + '<p class="small">' + (P[0] && P[0].drug ? "لاقي كل دوا مع شو بيستعمل." : "لاقي كل مصطلح مع معناه.") + '</p><div id="gfbm"></div><div class="memg' + (cards.length > 12 ? " m4" : "") + '">' +
      cards.map(function (c, k) { return '<button type="button" class="mc" data-k="' + k + '" aria-label="كرت"><span class="mf">❓</span><span class="mb">' + c.h + "</span></button>"; }).join("") + "</div>";
    area.querySelector(".memg").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".mc"); if (!b || busy || b.classList.contains("up") || b.classList.contains("ok")) return;
      b.classList.add("up"); open.push(b);
      if (open.length < 2) return;
      moves++; d.getElementById("gmv").textContent = moves + " محاولة";
      var x = open[0], y = open[1]; open = [];
      if (cards[x.getAttribute("data-k")].i === cards[y.getAttribute("data-k")].i) {
        x.classList.add("ok"); y.classList.add("ok"); found++;
        if (found === P.length) setTimeout(function () { var sc = P.length + (moves <= P.length + 4 ? 4 : moves <= P.length + 8 ? 2 : 0); finish("mem", sc, "🃏 لقيت الـ " + P.length + " أزواج بـ <b>" + moves + "</b> محاولة"); }, 600);
        var fb0 = d.getElementById("gfbm"); if (fb0) fb0.innerHTML = "";
      } else {
        // ❌ not a pair: red on both, flip the first card's real partner up in green for a moment
        busy = true;
        var cx = cards[x.getAttribute("data-k")], cy = cards[y.getAttribute("data-k")], z = null;
        [].forEach.call(area.querySelectorAll(".mc"), function (c) { var cc = cards[c.getAttribute("data-k")]; if (c !== x && cc.i === cx.i) z = c; });
        x.classList.add("no"); y.classList.add("no"); if (z) z.classList.add("up", "hint");
        var pz = P[cx.i], others = shuffle(P.filter(function (p, k) { return k !== cx.i; })).slice(0, 2).map(function (p) { return txt(p, 1 - cx.s); });
        addMiss({ k: "c:" + pz.a + "|" + pz.b, q: cx.h, y: cy.h, r: txt(pz, 1 - cx.s), rv: { t: "mcq", q: cx.h, o: [txt(pz, 1 - cx.s)].concat(others), a: 0 } });
        var fb = d.getElementById("gfbm"); if (fb) fb.innerHTML = fbLine(cx.h + " + " + cy.h, cx.h + " + " + txt(pz, 1 - cx.s));
        setTimeout(function () { x.classList.remove("up", "no"); y.classList.remove("up", "no"); if (z) z.classList.remove("up", "hint"); busy = false; }, 1700);
      }
    });
  }

  /* ---- ⌨️ عبّي بسرعة: 60 s, type the missing word (tap a choice on سهل/وسط when the sentence has choices) ---- */
  function fillGame() {
    var items = blanks(sel), i = 0, ok = 0, bad = 0, end = Date.now() + 60e3, lock = false, pz = 0;
    area.innerHTML = head("fill", ' <span class="gsc" id="gt" dir="ltr">60</span>') + '<div class="tfq fq" id="fq"></div><p class="small">صح: <b id="tfok">0</b> · غلط/تخطّي: <b id="tfbad">0</b></p>';
    function show() {
      var box = d.getElementById("fq"); if (!box) return; if (i >= items.length) { items = items.concat(blanks(sel)); }
      var b = items[i], opts = b.o && lv < 3;
      box.className = "tfq fq";
      box.innerHTML = '<p class="tfs">' + esc(b.s).replace("___", '<span class="fgap">____</span>') + "</p>" +
        (opts ? '<div class="sbtns fopts">' + shuffle(b.o).map(function (o) { return '<button class="btn" type="button" data-fo="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + "</div>"
          : '<form class="fform" autocomplete="off"><input class="finp" type="text" inputmode="text" enterkeyhint="done" aria-label="الكلمة الناقصة" placeholder="اكتب الكلمة الناقصة"><button class="btn tok" type="submit">✔️</button></form>') +
        '<div class="sbtns"><button class="btn" type="button" data-fskip="1">⏭️ تخطّي</button></div>';
      var inp = box.querySelector(".finp"); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) {}
    }
    function answer(typed) {
      if (lock || !d.getElementById("fq")) return; var b = items[i], good = typed != null && fillOk(b, typed), box = d.getElementById("fq");
      if (good) { ok++; osmOk(); } else bad++;
      d.getElementById("tfok").textContent = ok; d.getElementById("tfbad").textContent = bad;
      box.className = "tfq fq " + (good ? "ok" : "no");
      lock = true;
      if (good) return setTimeout(function () { lock = false; i++; show(); }, 450);
      // ❌ pause the clock; the pick in red, the right word in green, the line
      pz = Date.now();
      [].forEach.call(box.querySelectorAll("[data-fo]"), function (x) { x.disabled = true; var v = x.getAttribute("data-fo"); if (v === b.a) x.classList.add("gok"); else if (v === typed) x.classList.add("gbad"); });
      var inp = box.querySelector(".finp"); if (inp) { inp.disabled = true; if (typed != null) inp.classList.add("gbad"); }
      box.insertAdjacentHTML("beforeend", fbLine(typed == null ? "⏭️ تخطّيت" : esc(typed), esc(b.a), "", 1));
      addMiss({ k: "f:" + (b.id || b.s), q: esc(b.s).replace("___", '<span class="fgap">____</span>'), y: typed == null ? "⏭️ تخطّيت" : esc(typed), r: esc(b.a), rv: { t: "fill", b: b } });
      hold(FB_MS, function () { end += Date.now() - pz; pz = 0; lock = false; i++; show(); });
    }
    show();
    area.querySelector("#fq").addEventListener("click", function (e) {
      var o = e.target.closest && e.target.closest("[data-fo]"); if (o) return answer(o.getAttribute("data-fo"));
      if (e.target.closest && e.target.closest("[data-fskip]")) answer(null);
    });
    area.querySelector("#fq").addEventListener("submit", function (e) { e.preventDefault(); var inp = area.querySelector(".finp"); if (inp && inp.value.trim()) answer(inp.value); });
    timer = setInterval(function () {
      if (pz) return;   // ⏸️ paused while a correction shows
      var l = Math.max(0, Math.ceil((end - Date.now()) / 1000)), t = d.getElementById("gt"); if (t) t.textContent = l;
      if (l <= 0) finish("fill", ok, "⌨️ عبّيت <b>" + ok + "</b> صح" + (bad ? " و" + bad + " غلط/تخطّي" : "") + " بـ ٦٠ ثانية");
    }, 250);
  }

  /* ---- 🪜 سلّم المراحل: 5 levels × 4 questions, 3 ❤️ for the whole run ---- */
  function stageGame() {
    var bag = [], lvl = 1, qi = 0, lives = STAGE.lives, cleared = 0, lock = false, cur = null, end = 0;
    function next() { if (!bag.length) bag = shuffle(mcq(sel)); return bag.pop(); }
    function ladder() {
      var h = '<ol class="sladder" aria-label="المراحل">';
      for (var k = 1; k <= STAGE.levels; k++) h += '<li class="' + (k <= cleared ? "done" : k === lvl ? "now" : "") + '"><b>' + (k <= cleared ? "✅" : k) + "</b><small>" + STAGE.secs[k - 1] + "ث</small></li>";
      return h + "</ol>";
    }
    function hearts() { var h = ""; for (var k = 0; k < STAGE.lives; k++) h += k < lives ? "❤️" : "🤍"; return h; }
    function frame(body) { area.innerHTML = head("stage", ' <span class="gsc shp" id="shp" aria-label="قلوب">' + hearts() + "</span>") + ladder() + body; }
    function ask() {
      cur = next(); var T = STAGE.secs[lvl - 1], order = shuffle(cur.o.map(function (o, k) { return k; }));
      end = Date.now() + T * 1e3; lock = false;
      frame('<p class="small sinfo">المرحلة <b>' + lvl + "</b> · سؤال <b>" + (qi + 1) + "/" + STAGE.per + '</b> · <b id="gt" dir="ltr">' + T + '</b> ثانية</p><div class="stbar"><i id="stbar"></i></div>' +
        '<p class="sq">' + cur.q + '</p><div id="sopts">' + order.map(function (k, j) { return '<button class="opt" type="button" data-so="' + k + '"><span class="l" dir="ltr">' + "abcd"[j] + "</span><span>" + cur.o[k] + "</span></button>"; }).join("") + "</div>");
      area.querySelector("#sopts").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-so]"); if (b) answer(+b.getAttribute("data-so")); });
      clearInterval(timer);
      timer = setInterval(function () {
        var ms = Math.max(0, end - Date.now()), t = d.getElementById("gt"), bar = d.getElementById("stbar");
        if (t) t.textContent = Math.ceil(ms / 1000); if (bar) bar.style.width = (100 * ms / (T * 1e3)) + "%";
        if (ms <= 0) answer(-1);
      }, 200);
    }
    function answer(k) {
      if (lock || !d.getElementById("sopts")) return; lock = true; clearInterval(timer);
      var good = k === cur.a;
      [].forEach.call(area.querySelectorAll("[data-so]"), function (b) { var kk = +b.getAttribute("data-so"); b.disabled = true; if (kk === cur.a) b.classList.add("ok"); else if (kk === k) b.classList.add("bad"); });
      var after = function () {
        if (!d.getElementById("sopts")) return;
        if (lives <= 0) return finish("stage", cleared, "💔 خلصو القلوب بالمرحلة <b>" + lvl + "</b> — خلّصت <b>" + cleared + "</b> من " + STAGE.levels + " مراحل");
        qi++;
        if (qi < STAGE.per) return ask();
        cleared = lvl; qi = 0;
        if (cleared >= STAGE.levels) return finish("stage", cleared, "🏆 <b>طلعت السلّم كلّو!</b> خلّصت الـ " + STAGE.levels + " مراحل وبقيلك " + hearts());
        lvl++;
        frame('<div class="sbreak"><h2>🎉 المرحلة ' + cleared + " خلصت!</h2><p>بقيلك " + hearts() + "</p><p>المرحلة <b>" + lvl + "</b>: " + STAGE.per + " أسئلة، <b>" + STAGE.secs[lvl - 1] + '</b> ثانية لكل سؤال ⏱️</p><div class="sbtns"><button class="btn on" type="button" data-snext="1">يلّا عالمرحلة ' + lvl + " ⬅️</button></div></div>");
        area.querySelector("[data-snext]").addEventListener("click", ask);
        area.scrollIntoView({ block: "start", behavior: "smooth" });
      };
      if (good) { osmOk(); return setTimeout(after, 700); }
      // ❌ / ⏰ −1 ❤️, the clock is already stopped: the line + the question's own explanation, then on (or «كمّل»)
      lives--; var hp = d.getElementById("shp"); if (hp) { hp.textContent = hearts(); hp.classList.add("shit"); }
      var yours = k < 0 ? "⏰ ما جاوبت (خلص الوقت)" : esc(strip(cur.o[k])), right = esc(strip(cur.o[cur.a]));
      area.querySelector("#sopts").insertAdjacentHTML("afterend", '<p class="small sfb">' + (k < 0 ? "⏰ خلص الوقت! " : "❌ ") + "−١ ❤️</p>" + fbLine(yours, right, cur.x || "", 1));
      addMiss({ k: "s:" + (cur.id || cur.q), q: cur.q, y: yours, r: right, rv: { t: "mcq", q: cur.q, o: cur.o, a: cur.a, x: cur.x } });
      hold(cur.x ? FB_X_MS : FB_MS, after);
    }
    ask();
  }

  function start(g) {
    clearInterval(timer);
    if (!enough(g, sel)) { area.hidden = false; area.innerHTML = head(g) + "<p>ما في محتوى كافي لهاللعبة بهالمادة بعد. جرّب «🎲 كل المواد» أو مادة تانية.</p>"; return; }
    miss = []; replaying = false; lastG = g;
    area.hidden = false; (g === "match" ? match : g === "tf" ? tfGame : g === "fill" ? fillGame : g === "stage" ? stageGame : g === "er" ? erGame : mem)();
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function init() {
    area = d.getElementById("garea"); var pk = d.getElementById("gpick"); if (!area || !pk) return;
    var S = w.QSUBJ || {}, h = '<button type="button" class="chip on" data-s="all">🎲 كل المواد</button>';
    for (var k in S) h += '<button type="button" class="chip" data-s="' + k + '">' + esc(S[k]) + "</button>";
    pk.innerHTML = h;
    pk.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-s]"); if (!b) return; sel = b.getAttribute("data-s"); [].forEach.call(pk.children, function (c) { c.classList.toggle("on", c === b); }); marks(); });
    function marks() { [].forEach.call(d.querySelectorAll("[data-g]"), function (c) { var ok = enough(c.getAttribute("data-g"), sel); c.classList.toggle("off", !ok); var bb = c.querySelector(".gbest"); if (bb) bb.textContent = c.getAttribute("data-g") === "stage" ? "أحسن نتيجة: " + (best().stage | 0) + "/" + STAGE.levels + " مراحل" : "أحسن نتيجة (" + LV[lv].n + "): " + (best()[bk(c.getAttribute("data-g"))] | 0); }); }
    var lp = d.getElementById("glv");
    if (lp) {
      lp.innerHTML = LV.slice(1).map(function (x, k) { return '<button type="button" class="chip' + (k + 1 === lv ? " on" : "") + '" data-lv="' + (k + 1) + '">' + ["🟢", "🟡", "🔴"][k] + " " + x.n + "</button>"; }).join("");
      lp.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lv]"); if (!b) return; lv = +b.getAttribute("data-lv"); try { localStorage.setItem("nursin_games_lv", lv); } catch (x) {} [].forEach.call(lp.children, function (c) { c.classList.toggle("on", c === b); }); marks(); });
    }
    marks();
    d.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-g],[data-again],[data-back],[data-review]"); if (!t) return;
      if (t.hasAttribute("data-review")) { clearInterval(timer); if (lastMiss.length) review(lastMiss.slice(), lastG); return; }
      if (t.hasAttribute("data-back")) { clearInterval(timer); replaying = false; area.hidden = true; area.innerHTML = ""; marks(); d.getElementById("gcards").scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      start(t.getAttribute("data-g") || t.getAttribute("data-again"));
    });
  }

  /* ---- 🚑 ناوبة بالطوارئ (Abdullah, Oct 27 2026 12:25 AM; cases from his réa notebook — assets/ersim-data.js): the player is the
     nurse; an ambulance brings a patient (arrival card: age/history, symptoms, constantes, labs/ECG) → 3/4/5 decision steps
     (سهل/وسط/صعب), each 3 options with one best. A patient status bar reacts to every choice (📈/📉); a wrong pick shows the usual
     «❌ إنت اخترت … ✅ الصح …» + the note's one-line explanation (tap «كمّل»). سهل = 💡 hint, no clock · وسط = 40 s a step · صعب = 25 s.
     Score = steps right; points ×1/×1.5/×2 through the shared finish() (≤ ROUND_MAX a round, GAME_CAP a day, counts the 🎮 goal);
     end = «📋 أخطاءك» + «🎯 راجع أخطاءك». No ads in here. ---- */
  var ER = { secs: [0, 0, 40, 25], hp0: 55, up: 15, down: 20 };
  function erCases() { return w.ERSIM || []; }
  function erSteps(c, l) { return (c.steps || []).filter(function (s) { return (s.lv || 1) <= (l || lv); }); }
  function fr(s) {   // escape, and keep French/medical runs left-to-right inside the Arabic line
    return String(s == null ? "" : s).split(/([A-Za-zÀ-ÿŒœ][A-Za-zÀ-ÿŒœ0-9+\-'’ .\/]*[A-Za-zÀ-ÿŒœ0-9+\-]|[A-Za-zÀ-ÿŒœ])/).map(function (p, k) { return k % 2 ? '<bdi dir="ltr" lang="fr">' + esc(p) + "</bdi>" : esc(p); }).join("");
  }
  function erv(s) { return '<span class="erv" dir="auto">' + esc(s) + "</span>"; }
  function erState(hp) { return hp >= 70 ? ["🟢", "مستقر، عم يتحسّن", "ok"] : hp >= 40 ? ["🟡", "مش مستقر", "mid"] : ["🔴", "عم يتدهور", "bad"]; }
  function erGame() {
    var cs = erCases(), sv = er3Load(), E3 = w.ERSTORY;
    // v3 (Oct 27, 12:36 PM): a case = a living story (assets/ersim-story.js); the old 3–5 quick questions stay as «⚡ أسئلة سريعة»
    area.innerHTML = head("er") + '<div class="erwrap"><p class="small">🚑 وصلت سيارة إسعاف! اختار الحالة. إنت الممرّض: قيس، افحص، اطلب تحاليل، عطي العلاج… كل شي بينسجّل والمريض بيتغيّر مع الوقت.</p>' +
      (sv ? '<button type="button" class="btn on erc errs" data-er3r="1">▶️ كمّل الحالة: ' + fr(sv.c.ic + " " + sv.c.t) + ' <small dir="ltr">🕒 ' + Math.floor(sv.st.t / 60) + ":" + ("0" + Math.round(sv.st.t % 60)).slice(-2) + "</small></button>" : "") +
      '<div class="erpick">' +
      cs.map(function (c, i) { return '<button type="button" class="btn erc" data-erc="' + i + '"><span>' + c.ic + "</span> " + fr(c.t) + "</button>"; }).join("") +
      '<button type="button" class="btn on erc" data-erc="-1">🎲 حالة عشوائية</button></div>' +
      '<label class="erq small"><input type="checkbox" id="erquick"> ⚡ أسئلة سريعة بدل القصّة (3–5 أسئلة)</label></div>';
    area.querySelector(".erwrap").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-erc],[data-er3r]"); if (!b) return;
      if (b.hasAttribute("data-er3r")) return erStory(sv.c, sv.st);
      var i = +b.getAttribute("data-erc"), c = cs[i >= 0 ? i : Math.floor(Math.random() * cs.length)], q = d.getElementById("erquick");
      if ((q && q.checked) || !E3 || !E3.story(c.id) || !w.ERSCENE) erCase(c); else erStory(c);
    });
  }
  /* ---- 🚑 v3 «الحالة قصّة» (Abdullah, Oct 27 12:34–12:36 PM): free actions, many at once, a game clock, the patient gets worse untreated and
     better (slowly) with the right care; every action in «📋 ملف المريض». Engine + data: assets/ersim-story.js; room UI: ERSCENE.open(c, {sim}).
     Wrong treatment = «❌ إنت اخترت … ✅ الصح …» + the line from the notes, into 📋 أخطاءك / 🎯 راجع أخطاءك; end → finish("er", stars). ---- */
  var ER3 = "nursin_er3_v1";
  function er3Load() {
    try { var o = JSON.parse(localStorage.getItem(ER3) || "null"), E3 = w.ERSTORY; if (!o || !o.st || o.st.v !== 3 || o.st.end || !E3 || !E3.story(o.st.cid)) return null;
      var c = erCases().filter(function (x) { return x.id === o.st.cid; })[0]; return c ? { c: c, st: o.st } : null; } catch (e) { return null; }
  }
  function er3Save(st) { try { if (st.end) localStorage.removeItem(ER3); else localStorage.setItem(ER3, JSON.stringify({ st: st, at: Date.now() })); } catch (e) {} }
  function erStory(c, saved) {
    var E3 = w.ERSTORY, st = saved || E3.create(c.id, lv);
    if (saved) { lv = st.lv; try { localStorage.setItem("nursin_games_lv", lv); } catch (e) {} } else miss = [];
    er3Save(st);
    var L3 = E3.actions(c.id);
    function other(a, right) { var o = L3.filter(function (x) { return x.k === "bad" && x.id !== a.id && x.n !== right; })[0]; return o ? o.n : ""; }
    function rvq(q, right, wrong, third, x) { var o = [fr(right), fr(wrong)]; if (third && third !== wrong && third !== right) o.push(fr(third)); return { t: "mcq", q: c.ic + " " + fr(c.who) + "<br>" + q, o: o, a: 0, x: fr(x) }; }
    function quizRun(idxs, box, done) {
      var qi = 0, okN = 0, lock = false;
      function show() {
        var s0 = c.steps[idxs[qi]], ord = shuffle(s0.o.map(function (o, k) { return k; })); lock = false;
        box.innerHTML = '<div class="ers-shh"><b>' + (idxs.length > 1 ? "📖 " + (qi + 1) + "/" + idxs.length : "🧠") + '</b></div><p class="sq">' + fr(s0.q) + "</p>" + (lv === 1 && s0.h ? '<p class="small erh">💡 ' + fr(s0.h) + "</p>" : "") +
          '<div id="eopts">' + ord.map(function (k, j) { return '<button class="opt" type="button" data-eo="' + k + '"><span class="l" dir="ltr">' + "abc"[j] + "</span><span>" + fr(s0.o[k]) + "</span></button>"; }).join("") + "</div>";
        box.scrollTop = 0;
        box.querySelector("#eopts").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-eo]"); if (b) ans(+b.getAttribute("data-eo"), s0, idxs[qi]); });
      }
      function ans(k, s0, si) {
        if (lock) return; lock = true; var good = k === s0.a, right = fr(s0.o[s0.a]), bx = box.querySelector("#eopts");
        [].forEach.call(box.querySelectorAll("[data-eo]"), function (b) { var kk = +b.getAttribute("data-eo"); b.disabled = true; if (kk === s0.a) b.classList.add("ok"); else if (kk === k) b.classList.add("bad"); });
        if (good) { okN++; bx.insertAdjacentHTML("afterend", '<div class="gfb erok" role="status"><p>✅ صح!</p><p class="small">💡 ' + fr(s0.x) + '</p><div class="sbtns"><button class="btn on gkm" type="button">كمّل ⬅️</button></div></div>'); }
        else {
          bx.insertAdjacentHTML("afterend", fbLine(fr(s0.o[k]), right, fr(s0.x), 1));
          addMiss({ k: "er:" + c.id + ":" + si, q: c.ic + " " + fr(c.t) + " — " + fr(s0.q), y: fr(s0.o[k]), r: right, rv: { t: "mcq", q: c.ic + " " + fr(c.who) + "<br>" + fr(s0.q), o: s0.o.map(fr), a: s0.a, x: fr(s0.x) } });
        }
        hold(0, function () { qi++; if (qi < idxs.length) show(); else done(okN, idxs.length); }, box);
      }
      show();
    }
    var S = w.ERSCENE.open(c, { steps: E3.keys(c.id), lv: lv, fr: fr, onExit: function () { erGame(); },
      sim: { st: st, resume: !!saved, save: er3Save,
        fb: function (y, r, x) { return fbLine(y, r, x, 0); },
        onMiss: function (a, e) { addMiss({ k: "er3:" + c.id + ":" + a.id, q: c.ic + " " + fr(c.t) + " — شو الصح تعمل؟", y: fr(a.n), r: fr(e.r), rv: rvq("شو الصح تعمل؟", e.r, a.n, other(a, e.r), a.x) }); },
        onQuiz: quizRun,
        onEnd: function (st2) { erDebrief(c, st2); } } });
    return S;
  }
  function erDebrief(c, st) {
    var E3 = w.ERSTORY, L3 = E3.actions(c.id), ks = E3.keys(c.id), stars = E3.stars(st), S = E3.status(st), kd = ks.filter(function (k) { return st.done[k]; });
    ks.forEach(function (k) {
      if (st.done[k]) return; var a = E3.act(c.id, k), bad = L3.filter(function (x) { return x.k === "bad"; });
      addMiss({ k: "er3m:" + c.id + ":" + k, q: c.ic + " " + fr(c.t) + " — ما عملت: " + fr(a.n), y: "— ما عملتها", r: fr(a.n),
        rv: { t: "mcq", q: c.ic + " " + fr(c.who) + "<br>شو كان لازم تعمل كمان؟", o: [fr(a.n)].concat(bad.slice(0, 2).map(function (b) { return fr(b.n); })), a: 0, x: fr(a.x) } });
    });
    var tm = Math.floor(st.t / 60) + ":" + ("0" + Math.round(st.t % 60)).slice(-2), seen = {}, ideal = E3.cases[c.id].ideal.filter(function (id) { if (seen[id]) return false; seen[id] = 1; return true; });
    var once = {}, did = st.log.filter(function (e) { var a = E3.act(c.id, e.a); if (!a || once[e.a + e.kind] || !(e.kind === "tx" || (a.key && /^(exam|lab|call|res|quiz)$/.test(e.kind)))) return false; if (e.kind === "call" && /constantes؟/.test(e.txt)) return false; if (e.kind === "quiz" && !(st.qd && st.qd[e.a])) return false; once[e.a + e.kind] = 1; return true; });
    var out = st.end === "ok" ? "🎉 المريض استقرّ وانتقل عالقسم. شغل نظيف!" : st.end === "lost" ? "🔴 المريض تدهور: " + fr(E3.cases[c.id].lost) : "🤝 سلّمت الحالة والمريض " + S.ic + " " + S.n + ".";
    finish("er", stars, c.ic + " " + fr(c.t) + "<br>⭐ <b>" + stars + "</b>/10 · 🕒 " + tm + " · ✅ " + kd.length + "/" + ks.length + " مهام أساسية<br>" + out +
      '<div class="erdb"><p><b>✅ شو عملت صح (بالترتيب):</b></p><ol>' + (did.length ? did.map(function (e) { var a = E3.act(c.id, e.a); return '<li><i dir="ltr">' + Math.floor(e.t / 60) + ":" + ("0" + e.t % 60).slice(-2) + "</i> " + e.ic + " " + fr(e.kind === "res" ? e.txt : a.n) + (e.fast ? " ⚡" : "") + "</li>"; }).join("") : "<li>—</li>") + "</ol>" +
      "<p><b>📘 الترتيب الصح حسب نوطاتك:</b></p><ol>" + ideal.map(function (id) { var a = E3.act(c.id, id); return "<li>" + a.ic + " " + fr(a.n) + "</li>"; }).join("") + "</ol></div>");
  }
  function erCase(c) {
    var steps = erSteps(c), si = 0, ok = 0, hp = ER.hp0, lock = false, end = 0, T = ER.secs[lv] || 0, order = [];
    // v2 (Oct 27, 10:17 AM): the case plays inside the realistic scene + game HUD (assets/ersim-scene.js); same steps, scoring and
    // feedback — the scene only decides where the step opens (tap the glowing spot) and shows the patient/monitor reacting.
    var S = d && d.body && w.ERSCENE ? w.ERSCENE.open(c, { steps: steps, lv: lv, fr: fr, hp0: ER.hp0, onStep: function (i, box) { openS(box); }, onExit: function () { clearInterval(timer); erGame(); } }) : null;
    var R = S ? S.sheet : area;
    function card() {
      return '<div class="ercard"><p class="erwho">🚑 ' + fr(c.who) + "</p>" +
        (c.sx && c.sx.length ? '<p><b>الأعراض:</b> ' + c.sx.map(erv).join(" ") + "</p>" : "") +
        (c.vit && c.vit.length ? '<p><b><bdi dir="ltr" lang="fr">Constantes</bdi> (العلامات الحيوية):</b> ' + c.vit.map(erv).join(" ") + "</p>" : "") +
        (c.lab ? '<div class="erlab">' + c.lab.split(" · ").map(function (x) { return '<div dir="auto">' + esc(x) + "</div>"; }).join("") + "</div>" : "") + "</div>";
    }
    function bar(delta) {
      var s = erState(hp);
      return '<div class="erst ' + s[2] + (delta ? (delta > 0 ? " up" : " dn") : "") + '" id="erst"><span>❤️ المريض: <b>' + s[0] + " " + s[1] + "</b>" + (delta ? (delta > 0 ? " 📈" : " 📉") : "") + '</span><div class="erbar"><i style="width:' + hp + '%"></i></div></div>';
    }
    function paintBar(delta) { var el = d.getElementById("erst"); if (el) el.outerHTML = bar(delta); }
    function stepHtml(st) {
      return (T ? '<p class="small sinfo"><b id="gt" dir="ltr">' + T + '</b> ثانية</p><div class="stbar"><i id="stbar"></i></div>' : "") +
        '<p class="sq">' + fr(st.q) + "</p>" + (lv === 1 && st.h ? '<p class="small erh">💡 ' + fr(st.h) + "</p>" : "") +
        '<div id="eopts">' + order.map(function (k, j) { return '<button class="opt" type="button" data-eo="' + k + '"><span class="l" dir="ltr">' + "abc"[j] + "</span><span>" + fr(st.o[k]) + "</span></button>"; }).join("") + "</div>";
    }
    function wire(root) {
      root.querySelector("#eopts").addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-eo]"); if (b) answer(+b.getAttribute("data-eo")); });
      clearInterval(timer);
      if (T) { end = Date.now() + T * 1e3; timer = setInterval(function () {
        var ms = Math.max(0, end - Date.now()), t = d.getElementById("gt"), br = d.getElementById("stbar");
        if (t) t.textContent = Math.ceil(ms / 1000); if (br) br.style.width = (100 * ms / (T * 1e3)) + "%";
        if (ms <= 0) answer(-1);
      }, 200); }
    }
    function ask() {
      var st = steps[si]; order = shuffle(st.o.map(function (o, k) { return k; })); lock = false;
      if (S) return;   // the scene shows the mission; the step opens when the player taps its spot (openS)
      area.innerHTML = head("er", ' <span class="gsc">' + (si + 1) + "/" + steps.length + "</span>") + bar(0) + card() + stepHtml(st);
      wire(area);
    }
    function openS(box) {
      var st = steps[si]; lock = false;
      box.innerHTML = '<div class="ers-shh"><span class="gsc">' + (si + 1) + "/" + steps.length + "</span></div>" + stepHtml(st);
      wire(box);
    }
    function answer(k) {
      if (lock || !d.getElementById("eopts")) return; lock = true; clearInterval(timer);
      var st = steps[si], good = k === st.a, right = fr(st.o[st.a]);
      [].forEach.call(R.querySelectorAll("[data-eo]"), function (b) { var kk = +b.getAttribute("data-eo"); b.disabled = true; if (kk === st.a) b.classList.add("ok"); else if (kk === k) b.classList.add("bad"); });
      var next = function () { if (!d.getElementById("eopts")) return; si++; if (si < steps.length) { if (S) S.next(); return ask(); } done(); };
      var box = R.querySelector("#eopts");
      if (good) {
        ok++; osmOk(); hp = Math.min(100, hp + ER.up); paintBar(1); if (S) S.result(true, hp, st, ok);
        box.insertAdjacentHTML("afterend", '<div class="gfb erok" role="status"><p>✅ صح! المريض تحسّن 📈</p><p class="small">💡 ' + fr(st.x) + '</p><div class="sbtns"><button class="btn on gkm" type="button">كمّل ⬅️</button></div></div>');
        erSee(); return hold(FB_X_MS, next, R);
      }
      hp = Math.max(0, hp - ER.down); paintBar(-1); if (S) S.result(false, hp, st, ok);
      var yours = k < 0 ? "⏰ ما جاوبت (خلص الوقت)" : fr(st.o[k]);
      box.insertAdjacentHTML("afterend", '<p class="small sfb">' + (k < 0 ? "⏰ خلص الوقت! " : "") + "📉 حالة المريض تدهورت</p>" + fbLine(yours, right, fr(st.x), 1));
      addMiss({ k: "er:" + c.id + ":" + si, q: c.ic + " " + fr(c.t) + " — " + fr(st.q), y: yours, r: right, rv: { t: "mcq", q: c.ic + " " + fr(c.who) + (c.lab ? "<br>🧪 " + fr(c.lab) : "") + "<br>" + fr(st.q), o: st.o.map(fr), a: st.a, x: fr(st.x) } });
      erSee(); hold(0, next, R);
    }
    function erSee() { var f = R.querySelectorAll(".gfb"); f = f[f.length - 1]; if (f && f.scrollIntoView) f.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    function done() {
      var s = erState(hp), out = hp >= 70 ? "🎉 المريض استقرّ وانتقل عالقسم. شغل نظيف!" : hp >= 40 ? "🟡 المريض بعدو مش مستقر، الدكتور كمّل معو." : "🔴 المريض تدهور. راجع أخطاءك تحت 👇";
      if (S) S.close(false);
      finish("er", ok, c.ic + " " + fr(c.t) + "<br>✅ <b>" + ok + "</b> من " + steps.length + " خطوات صح · ❤️ " + s[0] + " " + s[1] + "<br>" + out);
      if (S) area.scrollIntoView({ block: "start" });
    }
    ask();
    if (!S) area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  w.NursinGames = { terms: terms, qa: qa, pairs: pairs, memPairs: memPairs, tf: tf, enough: enough, blanks: blanks, fillOk: fillOk, mcq: mcq, fbLine: fbLine, missHtml: missHtml, STAGE: STAGE, LV: LV, ROUND_MAX: ROUND_MAX, ER: ER, erCases: erCases, erSteps: erSteps, fr: fr, erCase: erCase };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
