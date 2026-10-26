/* 🎮 ألعاب (Abdullah, Oct 26 2026 6:04 PM): 3 light games built ONLY from the site's own content, each round pays a few points
   (signed in, via the existing points system; max 20 a round and 60 a day — assets/study.js) and counts the day 🔥. No ads in here.
   🧩 وصّل            — French/English term ↔ Arabic meaning: «Term (معنى)» answers in the quiz bank (assets/quiz-data.js) + the
                         [français, عربي] items of the drug cards (assets/pharma-data.js); a subject with few terms adds its short
                         question ↔ right-answer pairs from the same bank.
   ⚡ تحدّي ٦٠ ثانية   — true/false: a quiz question with its right option (صح) or one of its wrong options (غلط).
   ⌨️ عبّي بسرعة       — 60 s fill-in on the site's own «عبّي الفراغ» sentences (assets/blanks-data.js); added Oct 26 7:42 PM.
   🃏 لعبة الذاكرة      — flip cards to find pairs: drug ↔ what it's for (pharma), term ↔ meaning elsewhere. */
(function (w, d) {
  var BEST = "nursin_games_v1", ROUND_MAX = 20;
  var GN = { match: "🧩 وصّل", tf: "⚡ تحدّي ٦٠ ثانية", mem: "🃏 لعبة الذاكرة", fill: "⌨️ عبّي بسرعة" };
  /* 🎚️ سهل / وسط / صعب (Abdullah, Oct 26 7:42 PM: harder, more varied): وصّل 5/7/9 pairs · ٦٠ ثانية 60/45/30 s (صعب: −1 لكل غلط)
     · الذاكرة 6/8/10 pairs · عبّي بسرعة: سهل/وسط = اختيارات لما الجملة إلها اختيارات، صعب = كلّو كتابة. Points ×1 / ×1.5 / ×2
     (still ≤ ROUND_MAX a round and GAME_CAP a day). */
  var LV = [null, { n: "سهل", m: 1, match: 5, tf: 60, mem: 6 }, { n: "وسط", m: 1.5, match: 7, tf: 45, mem: 8 }, { n: "صعب", m: 2, match: 9, tf: 30, mem: 10 }], lv = 1;
  try { lv = Math.min(3, Math.max(1, +localStorage.getItem("nursin_games_lv") || 1)); } catch (e) {}
  function lvPts(n) { return Math.round(Math.max(0, n) * LV[lv].m); }
  function bk(g) { return lv > 1 ? g + lv : g; }   // best score per game and level (easy keeps the old key)
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
      out.push({ q: qq, o: strip(q.o[pick]), ok: ok, right: strip(q.o[q.a]), s: subjOf(q.t) });
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
  function enough(g, s) { return g === "tf" ? tf(s).length >= 6 : g === "fill" ? blanks(s).length >= 4 : (g === "mem" ? memPairs(s) : pairs(s)).length >= (g === "mem" ? 6 : 5); }

  /* ---- shared bits ---- */
  var sel = "all", area = null, timer = 0;
  function best() { try { return JSON.parse(localStorage.getItem(BEST) || "null") || {}; } catch (e) { return {}; } }
  function saveBest(g, n) { var b = best(); g = bk(g); var nw = (b[g] | 0) < n; if (nw) { b[g] = n; try { localStorage.setItem(BEST, JSON.stringify(b)); } catch (e) {} } return nw; }
  function txt(p, side) { var v = side ? p.b : p.a; return p.fr && !side ? '<span dir="ltr" lang="fr">' + esc(v) + "</span>" : esc(v); }
  function finish(g, score, extra) {
    clearInterval(timer);
    var pts = Math.min(ROUND_MAX, lvPts(score | 0)), nb = saveBest(g, score | 0);
    area.innerHTML = '<h2>' + GN[g] + ' — خلصت الجولة!</h2><p class="gres">' + extra + "</p>" +
      (nb && score ? '<p>🏆 <b>أحسن نتيجة إلك!</b></p>' : '<p class="small">أحسن نتيجة إلك: <b>' + (best()[bk(g)] | 0) + "</b> (" + LV[lv].n + ")</p>") +
      '<p class="small" id="gpts"></p><div class="sbtns"><button class="btn on" type="button" data-again="' + g + '">🔁 جولة جديدة</button><button class="btn" type="button" data-back="1">🎮 لعبة تانية</button></div>';
    var S = w.NursinStudy;
    if (S) { var o = S.activity("game", pts, GN[g].replace(/^\S+\s/, ""), d.getElementById("gpts")); if (o && o.paid < pts && w.Nursin && w.Nursin.me) d.getElementById("gpts").insertAdjacentHTML("afterend", '<p class="small">وصلت لحدّ نقاط الألعاب اليوم (' + S.GAME_CAP + ")، بس بتضل تلعب وتتمرّن 💪</p>"); }
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function head(g, sub) { return '<div class="ghead"><b>' + GN[g] + "</b> <span class=\"small\">" + (sel === "all" ? "كل المواد" : esc((w.QSUBJ || {})[sel] || sel)) + " · " + LV[lv].n + "</span>" + (sub || "") + '<button class="btn gx" type="button" data-back="1">✕</button></div>'; }

  /* ---- 🧩 وصّل: 5 pairs a round ---- */
  function match() {
    var P = shuffle(pairs(sel)).slice(0, LV[lv].match), L = shuffle(P.map(function (p, i) { return i; })), Rr = shuffle(P.map(function (p, i) { return i; }));
    var pick = null, done = 0, ok = 0, miss = {};
    area.innerHTML = head("match", ' <span class="gsc" id="gsc">0/' + P.length + '</span>') + '<p class="small">دوس عالمصطلح، بعدين عالمعنى تبعو.</p><div class="mgrid"><div class="mcol">' +
      L.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="a">' + txt(P[i], 0) + "</button>"; }).join("") + '</div><div class="mcol">' +
      Rr.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="b">' + txt(P[i], 1) + "</button>"; }).join("") + "</div></div>";
    area.querySelector(".mgrid").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".mt"); if (!b || b.disabled) return;
      if (!pick || pick.getAttribute("data-s") === b.getAttribute("data-s")) { if (pick) pick.classList.remove("sel"); pick = b; b.classList.add("sel"); return; }
      var ai = pick.getAttribute("data-s") === "a" ? pick : b, bi = ai === pick ? b : pick, i = ai.getAttribute("data-i");
      pick.classList.remove("sel"); pick = null;
      if (i === bi.getAttribute("data-i")) {
        ai.disabled = bi.disabled = true; ai.classList.add("ok"); bi.classList.add("ok"); done++; if (!miss[i]) ok++;
        d.getElementById("gsc").textContent = done + "/" + P.length;
        if (done === P.length) setTimeout(function () { finish("match", ok, "✅ <b>" + ok + "</b> من " + P.length + " صح من أوّل مرّة"); }, 500);
      } else { miss[i] = 1; [ai, bi].forEach(function (x) { x.classList.add("no"); setTimeout(function () { x.classList.remove("no"); }, 450); }); }
    });
  }

  /* ---- ⚡ ٦٠ ثانية صح ولا غلط ---- */
  function tfGame() {
    var T = LV[lv].tf, items = tf(sel), i = 0, ok = 0, bad = 0, end = Date.now() + T * 1e3, lock = false;
    area.innerHTML = head("tf", ' <span class="gsc" id="gt" dir="ltr">' + T + '</span>') + (lv === 3 ? '<p class="small">صعب: كل غلطة −١ 😬</p>' : "") + '<div class="tfq" id="tfq"></div><div class="sbtns tfb"><button class="btn tok" type="button" data-a="1">✅ صح</button><button class="btn tno" type="button" data-a="0">❌ غلط</button></div><p class="small">صح: <b id="tfok">0</b> · غلط: <b id="tfbad">0</b></p>';
    function show() { if (!d.getElementById("tfq")) return; if (i >= items.length) { items = items.concat(tf(sel)); } var it = items[i]; d.getElementById("tfq").innerHTML = '<p class="tfs">' + esc(it.q) + '</p><p class="tfo">الجواب: <b>' + esc(it.o) + "</b></p><p class=\"small\">صح ولا غلط؟</p>"; }
    show();
    area.querySelector(".tfb").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-a]"); if (!b || lock) return;
      var it = items[i], good = (b.getAttribute("data-a") === "1") === it.ok, box = d.getElementById("tfq");
      if (good) ok++; else bad++;
      d.getElementById("tfok").textContent = ok; d.getElementById("tfbad").textContent = bad;
      box.className = "tfq " + (good ? "ok" : "no");
      if (!good) box.insertAdjacentHTML("beforeend", '<p class="small">الجواب الصح: <b>' + esc(it.right) + "</b></p>");
      lock = true; setTimeout(function () { lock = false; if (!d.getElementById("tfq")) return; box.className = "tfq"; i++; show(); }, good ? 350 : 1300);
    });
    timer = setInterval(function () {
      var l = Math.max(0, Math.ceil((end - Date.now()) / 1000)), t = d.getElementById("gt"); if (t) t.textContent = l;
      if (l <= 0) { var sc = lv === 3 ? Math.max(0, ok - bad) : ok; finish("tf", sc, "⚡ جاوبت <b>" + ok + "</b> صح" + (bad ? " و" + bad + " غلط" : "") + " بـ " + T + " ثانية" + (lv === 3 && bad ? " → النتيجة <b>" + sc + "</b>" : "")); }
    }, 250);
  }

  /* ---- 🃏 الذاكرة: 6 pairs, 12 cards ---- */
  function mem() {
    var P = shuffle(memPairs(sel)).slice(0, LV[lv].mem), cards = [];
    P.forEach(function (p, i) { cards.push({ i: i, h: txt(p, 0) }); cards.push({ i: i, h: txt(p, 1) }); });
    cards = shuffle(cards);
    var open = [], found = 0, moves = 0, busy = false;
    area.innerHTML = head("mem", ' <span class="gsc" id="gmv">0 محاولة</span>') + '<p class="small">' + (P[0] && P[0].drug ? "لاقي كل دوا مع شو بيستعمل." : "لاقي كل مصطلح مع معناه.") + '</p><div class="memg' + (cards.length > 12 ? " m4" : "") + '">' +
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
      } else { busy = true; setTimeout(function () { x.classList.remove("up"); y.classList.remove("up"); busy = false; }, 900); }
    });
  }

  /* ---- ⌨️ عبّي بسرعة: 60 s, type the missing word (tap a choice on سهل/وسط when the sentence has choices) ---- */
  function fillGame() {
    var items = blanks(sel), i = 0, ok = 0, bad = 0, end = Date.now() + 60e3, lock = false;
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
      if (good) ok++; else bad++;
      d.getElementById("tfok").textContent = ok; d.getElementById("tfbad").textContent = bad;
      box.className = "tfq fq " + (good ? "ok" : "no");
      if (!good) box.insertAdjacentHTML("beforeend", '<p class="small">الجواب: <b>' + esc(b.a) + "</b></p>");
      lock = true; setTimeout(function () { lock = false; i++; show(); }, good ? 450 : 1500);
    }
    show();
    area.querySelector("#fq").addEventListener("click", function (e) {
      var o = e.target.closest && e.target.closest("[data-fo]"); if (o) return answer(o.getAttribute("data-fo"));
      if (e.target.closest && e.target.closest("[data-fskip]")) answer(null);
    });
    area.querySelector("#fq").addEventListener("submit", function (e) { e.preventDefault(); var inp = area.querySelector(".finp"); if (inp && inp.value.trim()) answer(inp.value); });
    timer = setInterval(function () {
      var l = Math.max(0, Math.ceil((end - Date.now()) / 1000)), t = d.getElementById("gt"); if (t) t.textContent = l;
      if (l <= 0) finish("fill", ok, "⌨️ عبّيت <b>" + ok + "</b> صح" + (bad ? " و" + bad + " غلط/تخطّي" : "") + " بـ ٦٠ ثانية");
    }, 250);
  }

  function start(g) {
    clearInterval(timer);
    if (!enough(g, sel)) { area.hidden = false; area.innerHTML = head(g) + "<p>ما في محتوى كافي لهاللعبة بهالمادة بعد. جرّب «🎲 كل المواد» أو مادة تانية.</p>"; return; }
    area.hidden = false; (g === "match" ? match : g === "tf" ? tfGame : g === "fill" ? fillGame : mem)();
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function init() {
    area = d.getElementById("garea"); var pk = d.getElementById("gpick"); if (!area || !pk) return;
    var S = w.QSUBJ || {}, h = '<button type="button" class="chip on" data-s="all">🎲 كل المواد</button>';
    for (var k in S) h += '<button type="button" class="chip" data-s="' + k + '">' + esc(S[k]) + "</button>";
    pk.innerHTML = h;
    pk.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-s]"); if (!b) return; sel = b.getAttribute("data-s"); [].forEach.call(pk.children, function (c) { c.classList.toggle("on", c === b); }); marks(); });
    function marks() { [].forEach.call(d.querySelectorAll("[data-g]"), function (c) { var ok = enough(c.getAttribute("data-g"), sel); c.classList.toggle("off", !ok); var bb = c.querySelector(".gbest"); if (bb) bb.textContent = "أحسن نتيجة (" + LV[lv].n + "): " + (best()[bk(c.getAttribute("data-g"))] | 0); }); }
    var lp = d.getElementById("glv");
    if (lp) {
      lp.innerHTML = LV.slice(1).map(function (x, k) { return '<button type="button" class="chip' + (k + 1 === lv ? " on" : "") + '" data-lv="' + (k + 1) + '">' + ["🟢", "🟡", "🔴"][k] + " " + x.n + "</button>"; }).join("");
      lp.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-lv]"); if (!b) return; lv = +b.getAttribute("data-lv"); try { localStorage.setItem("nursin_games_lv", lv); } catch (x) {} [].forEach.call(lp.children, function (c) { c.classList.toggle("on", c === b); }); marks(); });
    }
    marks();
    d.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-g],[data-again],[data-back]"); if (!t) return;
      if (t.hasAttribute("data-back")) { clearInterval(timer); area.hidden = true; area.innerHTML = ""; marks(); d.getElementById("gcards").scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      start(t.getAttribute("data-g") || t.getAttribute("data-again"));
    });
  }
  w.NursinGames = { terms: terms, qa: qa, pairs: pairs, memPairs: memPairs, tf: tf, enough: enough, blanks: blanks, fillOk: fillOk, LV: LV, ROUND_MAX: ROUND_MAX };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
