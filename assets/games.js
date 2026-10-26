/* 🎮 ألعاب (Abdullah, Oct 26 2026 6:04 PM): 3 light games built ONLY from the site's own content, each round pays a few points
   (signed in, via the existing points system; max 20 a round and 60 a day — assets/study.js) and counts the day 🔥. No ads in here.
   🧩 وصّل            — French/English term ↔ Arabic meaning: «Term (معنى)» answers in the quiz bank (assets/quiz-data.js) + the
                         [français, عربي] items of the drug cards (assets/pharma-data.js); a subject with few terms adds its short
                         question ↔ right-answer pairs from the same bank.
   ⚡ تحدّي ٦٠ ثانية   — true/false: a quiz question with its right option (صح) or one of its wrong options (غلط).
   🃏 لعبة الذاكرة      — flip cards to find pairs: drug ↔ what it's for (pharma), term ↔ meaning elsewhere. */
(function (w, d) {
  var BEST = "nursin_games_v1", ROUND_MAX = 20;
  var GN = { match: "🧩 وصّل", tf: "⚡ تحدّي ٦٠ ثانية", mem: "🃏 لعبة الذاكرة" };
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
  function enough(g, s) { return g === "tf" ? tf(s).length >= 6 : (g === "mem" ? memPairs(s) : pairs(s)).length >= (g === "mem" ? 6 : 5); }

  /* ---- shared bits ---- */
  var sel = "all", area = null, timer = 0;
  function best() { try { return JSON.parse(localStorage.getItem(BEST) || "null") || {}; } catch (e) { return {}; } }
  function saveBest(g, n) { var b = best(); var nw = (b[g] | 0) < n; if (nw) { b[g] = n; try { localStorage.setItem(BEST, JSON.stringify(b)); } catch (e) {} } return nw; }
  function txt(p, side) { var v = side ? p.b : p.a; return p.fr && !side ? '<span dir="ltr" lang="fr">' + esc(v) + "</span>" : esc(v); }
  function finish(g, score, extra) {
    clearInterval(timer);
    var pts = Math.min(ROUND_MAX, Math.max(0, score | 0)), nb = saveBest(g, score | 0);
    area.innerHTML = '<h2>' + GN[g] + ' — خلصت الجولة!</h2><p class="gres">' + extra + "</p>" +
      (nb && score ? '<p>🏆 <b>أحسن نتيجة إلك!</b></p>' : '<p class="small">أحسن نتيجة إلك: <b>' + (best()[g] | 0) + "</b></p>") +
      '<p class="small" id="gpts"></p><div class="sbtns"><button class="btn on" type="button" data-again="' + g + '">🔁 جولة جديدة</button><button class="btn" type="button" data-back="1">🎮 لعبة تانية</button></div>';
    var S = w.NursinStudy;
    if (S) { var o = S.activity("game", pts, GN[g].replace(/^\S+\s/, ""), d.getElementById("gpts")); if (o && o.paid < pts && w.Nursin && w.Nursin.me) d.getElementById("gpts").insertAdjacentHTML("afterend", '<p class="small">وصلت لحدّ نقاط الألعاب اليوم (' + S.GAME_CAP + ")، بس بتضل تلعب وتتمرّن 💪</p>"); }
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function head(g, sub) { return '<div class="ghead"><b>' + GN[g] + "</b> <span class=\"small\">" + (sel === "all" ? "كل المواد" : esc((w.QSUBJ || {})[sel] || sel)) + "</span>" + (sub || "") + '<button class="btn gx" type="button" data-back="1">✕</button></div>'; }

  /* ---- 🧩 وصّل: 5 pairs a round ---- */
  function match() {
    var P = shuffle(pairs(sel)).slice(0, 5), L = shuffle(P.map(function (p, i) { return i; })), Rr = shuffle(P.map(function (p, i) { return i; }));
    var pick = null, done = 0, ok = 0, miss = {};
    area.innerHTML = head("match", ' <span class="gsc" id="gsc">0/5</span>') + '<p class="small">دوس عالمصطلح، بعدين عالمعنى تبعو.</p><div class="mgrid"><div class="mcol">' +
      L.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="a">' + txt(P[i], 0) + "</button>"; }).join("") + '</div><div class="mcol">' +
      Rr.map(function (i) { return '<button type="button" class="mt" data-i="' + i + '" data-s="b">' + txt(P[i], 1) + "</button>"; }).join("") + "</div></div>";
    area.querySelector(".mgrid").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".mt"); if (!b || b.disabled) return;
      if (!pick || pick.getAttribute("data-s") === b.getAttribute("data-s")) { if (pick) pick.classList.remove("sel"); pick = b; b.classList.add("sel"); return; }
      var ai = pick.getAttribute("data-s") === "a" ? pick : b, bi = ai === pick ? b : pick, i = ai.getAttribute("data-i");
      pick.classList.remove("sel"); pick = null;
      if (i === bi.getAttribute("data-i")) {
        ai.disabled = bi.disabled = true; ai.classList.add("ok"); bi.classList.add("ok"); done++; if (!miss[i]) ok++;
        d.getElementById("gsc").textContent = done + "/5";
        if (done === P.length) setTimeout(function () { finish("match", ok, "✅ <b>" + ok + "</b> من " + P.length + " صح من أوّل مرّة"); }, 500);
      } else { miss[i] = 1; [ai, bi].forEach(function (x) { x.classList.add("no"); setTimeout(function () { x.classList.remove("no"); }, 450); }); }
    });
  }

  /* ---- ⚡ ٦٠ ثانية صح ولا غلط ---- */
  function tfGame() {
    var items = tf(sel), i = 0, ok = 0, bad = 0, end = Date.now() + 60e3, lock = false;
    area.innerHTML = head("tf", ' <span class="gsc" id="gt" dir="ltr">60</span>') + '<div class="tfq" id="tfq"></div><div class="sbtns tfb"><button class="btn tok" type="button" data-a="1">✅ صح</button><button class="btn tno" type="button" data-a="0">❌ غلط</button></div><p class="small">صح: <b id="tfok">0</b> · غلط: <b id="tfbad">0</b></p>';
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
      if (l <= 0) finish("tf", ok, "⚡ جاوبت <b>" + ok + "</b> صح" + (bad ? " و" + bad + " غلط" : "") + " بـ ٦٠ ثانية");
    }, 250);
  }

  /* ---- 🃏 الذاكرة: 6 pairs, 12 cards ---- */
  function mem() {
    var P = shuffle(memPairs(sel)).slice(0, 6), cards = [];
    P.forEach(function (p, i) { cards.push({ i: i, h: txt(p, 0) }); cards.push({ i: i, h: txt(p, 1) }); });
    cards = shuffle(cards);
    var open = [], found = 0, moves = 0, busy = false;
    area.innerHTML = head("mem", ' <span class="gsc" id="gmv">0 محاولة</span>') + '<p class="small">' + (P[0] && P[0].drug ? "لاقي كل دوا مع شو بيستعمل." : "لاقي كل مصطلح مع معناه.") + '</p><div class="memg">' +
      cards.map(function (c, k) { return '<button type="button" class="mc" data-k="' + k + '" aria-label="كرت"><span class="mf">❓</span><span class="mb">' + c.h + "</span></button>"; }).join("") + "</div>";
    area.querySelector(".memg").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".mc"); if (!b || busy || b.classList.contains("up") || b.classList.contains("ok")) return;
      b.classList.add("up"); open.push(b);
      if (open.length < 2) return;
      moves++; d.getElementById("gmv").textContent = moves + " محاولة";
      var x = open[0], y = open[1]; open = [];
      if (cards[x.getAttribute("data-k")].i === cards[y.getAttribute("data-k")].i) {
        x.classList.add("ok"); y.classList.add("ok"); found++;
        if (found === P.length) setTimeout(function () { var sc = P.length + (moves <= 10 ? 4 : moves <= 14 ? 2 : 0); finish("mem", sc, "🃏 لقيت الـ " + P.length + " أزواج بـ <b>" + moves + "</b> محاولة"); }, 600);
      } else { busy = true; setTimeout(function () { x.classList.remove("up"); y.classList.remove("up"); busy = false; }, 900); }
    });
  }

  function start(g) {
    clearInterval(timer);
    if (!enough(g, sel)) { area.hidden = false; area.innerHTML = head(g) + "<p>ما في محتوى كافي لهاللعبة بهالمادة بعد. جرّب «🎲 كل المواد» أو مادة تانية.</p>"; return; }
    area.hidden = false; (g === "match" ? match : g === "tf" ? tfGame : mem)();
    area.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function init() {
    area = d.getElementById("garea"); var pk = d.getElementById("gpick"); if (!area || !pk) return;
    var S = w.QSUBJ || {}, h = '<button type="button" class="chip on" data-s="all">🎲 كل المواد</button>';
    for (var k in S) h += '<button type="button" class="chip" data-s="' + k + '">' + esc(S[k]) + "</button>";
    pk.innerHTML = h;
    pk.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-s]"); if (!b) return; sel = b.getAttribute("data-s"); [].forEach.call(pk.children, function (c) { c.classList.toggle("on", c === b); }); marks(); });
    function marks() { [].forEach.call(d.querySelectorAll("[data-g]"), function (c) { var ok = enough(c.getAttribute("data-g"), sel); c.classList.toggle("off", !ok); var bb = c.querySelector(".gbest"); if (bb) bb.textContent = "أحسن نتيجة: " + (best()[c.getAttribute("data-g")] | 0); }); }
    marks();
    d.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-g],[data-again],[data-back]"); if (!t) return;
      if (t.hasAttribute("data-back")) { clearInterval(timer); area.hidden = true; area.innerHTML = ""; marks(); d.getElementById("gcards").scrollIntoView({ block: "start", behavior: "smooth" }); return; }
      start(t.getAttribute("data-g") || t.getAttribute("data-again"));
    });
  }
  w.NursinGames = { terms: terms, qa: qa, pairs: pairs, memPairs: memPairs, tf: tf, enough: enough, ROUND_MAX: ROUND_MAX };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
