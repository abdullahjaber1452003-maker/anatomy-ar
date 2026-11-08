/* 🎬 Reels (30s, Nov 8 2026 — Abdullah 1:33–1:46 PM: a reels tab instead of «المواد» in the bottom nav, approved mockup, «وينحط كمان شي عشوائي»).
   • reels.html: Instagram-style vertical feed (scroll-snap), one key point of HIS lessons per screen (assets/reels-data.js, taken from the
     lesson pages as drawn — nothing invented), typewriter lines, gradient per subject, progress bar; every 5th reel = an MCQ from the bank
     with ✅/❌ and «ليش غلط؟» (assets/wrongx.js NursinWX.why: the per-option reason → the explanation → the generic line).
   • ❤️ save (localStorage → «محفوظات»), 📖 the source lesson at that part, ↗️ share (navigator.share or copy the link reels.html#r=<id>).
   • filters: «🎯 امتحاني الجاي» (default: the next exam's subjects from assets/midterm.js), «🎲 عشوائي» (every subject, mixed evenly),
     each subject, «❤️ محفوظات». Shuffled; a reel seen is not shown again until every reel of that filter was seen (nursin_reels_v1).
   • 🔊 narration with speechSynthesis when the device has an Arabic voice (else the button is off); iPhone needs a tap first →
     «اكبس لتشغيل الصوت» on the first reel. Light: only the current reel ±1 is drawn, CSS animations only, no library, no ads.
   ES2017-safe (iOS 12): var/function only, no observer API needed. Everything lives inside this IIFE (only window.NursinReels). */
(function (w, d) {
  "use strict";
  var K = "nursin_reels_v1", MCQ_EVERY = 5, WIN = 1;
  var MS = ["medsurg", "cardio", "neuro", "henderson"];
  var FILTERS = [
    ["next", "🎯", "امتحاني الجاي", "Mon prochain examen"], ["rand", "🎲", "عشوائي", "Aléatoire"],
    ["rea", "🚑", "Réa", "Réa"], ["law", "⚖️", "القانون", "Législation"], ["mgmt", "🏢", "الإدارة", "Management"], ["ms", "🏥", "Med-Surg", "Med-Surg"],
    ["cardio", "🫀", "القلب", "Cardio"], ["neuro", "🧠", "الأعصاب", "Neuro"], ["henderson", "🧩", "Henderson", "Henderson"],
    ["quality", "✅", "الجودة", "Qualité"], ["geri", "👴", "الشيخوخة", "Gériatrie"], ["pharma", "💊", "الأدوية", "Pharmaco"], ["comm", "🏘️", "صحة المجتمع", "Santé comm."],
    ["saved", "❤️", "محفوظات", "Sauvegardés"]
  ];
  function D() { return w.NREELS || { subj: {}, r: [], q: {} }; }
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function TN() { return w.NursinToons || null; }       // 🎨 30v cartoons + daily look (assets/reels-toons.js); the emoji stays as the fallback
  var look = null;
  function bdx(s, br) {                        // 30v: Latin runs (and a bracketed Latin part like «(Les chocs)») isolated so RTL keeps the brackets in place; br = brackets only
    s = String(s == null ? "" : s); var out = "", last = 0, m, re = br ? /\([^()\u0600-\u06FF]*[A-Za-z\u00C0-\u024F][^()\u0600-\u06FF]*\)/g : /\([^()\u0600-\u06FF]*[A-Za-z\u00C0-\u024F][^()\u0600-\u06FF]*\)|[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9\u00B2\u00B3\u2070-\u209F'\u2019.\-\/&+ ]*[A-Za-z\u00C0-\u024F0-9\u00B2\u00B3\u2070-\u209F.)]|[A-Za-z\u00C0-\u024F]/g;
    while ((m = re.exec(s))) { out += esc(s.slice(last, m.index)) + '<bdi dir="ltr">' + esc(m[0]) + "</bdi>"; last = re.lastIndex; }
    return out + esc(s.slice(last));
  }
  function bgOf(it) { var t = TN(); if (t && look) return t.grad(look, it.k === "q" ? "q" : it.r.s); return it.k === "q" ? "linear-gradient(160deg,#1e1b4b 0%,#4338ca 55%,#7c3aed 100%)" : S(it.r.s)[4]; }
  function toonHtml(r, s) { var t = TN(); return t ? '<span class="rlico rltoon" aria-hidden="true" data-toon="' + t.pick(r) + '">' + t.svg(t.pick(r)) + "</span>" : '<span class="rlico" aria-hidden="true">' + esc(r.e || s[0]) + "</span>"; }
  function mascotHtml() { var t = TN(); return t ? '<span class="rlmas" aria-hidden="true">' + t.svg("nurse") + '<span class="rlmb"></span></span>' : ""; }
  function load() { var o = null; try { o = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) {} o = o && typeof o === "object" ? o : {}; o.seen = o.seen && typeof o.seen === "object" ? o.seen : {}; o.saved = o.saved instanceof Array ? o.saved : []; return o; }
  function save(o) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} }
  function shuffle(a, rnd) { rnd = rnd || Math.random; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- which subjects a filter covers ---------- */
  function allSubs() { var S = D().subj || {}, out = []; for (var k in S) out.push(k); return out; }
  function nextSubs(day) {                     // the next exam's subjects (assets/midterm.js); «*» = every subject not dated elsewhere
    var M = w.NursinMid, E = null, all = allSubs();
    try { E = M && M.next ? M.next(day) : null; } catch (e) { E = null; }
    if (!E || !E.subs) return all;
    var listed = {}; (M.EXAMS || []).forEach(function (x) { (x.subs || []).forEach(function (s) { listed[s] = 1; }); });
    var out = [];
    E.subs.forEach(function (s) {
      if (s === "*") all.forEach(function (k) { if (!listed[k] && out.indexOf(k) < 0) out.push(k); });
      else if (all.indexOf(s) > -1 && out.indexOf(s) < 0) out.push(s);
    });
    return out.length ? out : all;
  }
  function subsOf(f, day) {
    if (f === "next") return nextSubs(day);
    if (f === "rand" || f === "saved") return allSubs();
    if (f === "ms") return MS.slice();
    return allSubs().indexOf(f) > -1 ? [f] : allSubs();
  }
  function poolOf(f, st, day) {
    var R = D().r || [], subs = subsOf(f, day);
    if (f === "saved") { var sv = (st || load()).saved; return R.filter(function (r) { return sv.indexOf(r.id) > -1; }); }
    return R.filter(function (r) { return subs.indexOf(r.s) > -1; });
  }
  /* ---------- the order: unseen first (shuffled), every subject mixed evenly for 🎲; all seen → start over ---------- */
  function order(f, st, rnd, day) {
    st = st || load(); var pool = poolOf(f, st, day);
    if (f !== "saved") {
      var unseen = pool.filter(function (r) { return !st.seen[r.id]; });
      if (!unseen.length && pool.length) { pool.forEach(function (r) { delete st.seen[r.id]; }); unseen = pool; save(st); }
      pool = unseen;
    }
    if (f === "rand" || f === "next" || f === "ms") {              // round-robin over the subjects, each shuffled
      var by = {}, keys = [];
      shuffle(pool, rnd).forEach(function (r) { if (!by[r.s]) { by[r.s] = []; keys.push(r.s); } by[r.s].push(r); });
      keys = shuffle(keys, rnd); var out = [], more = true;
      while (more) { more = false; keys.forEach(function (k) { if (by[k].length) { out.push(by[k].shift()); more = true; } }); }
      return out;
    }
    return shuffle(pool, rnd);
  }
  function qPool(f, day) { var Q = D().q || {}, out = []; subsOf(f, day).forEach(function (s) { (Q[s] || []).forEach(function (q) { out.push({ s: s, q: q }); }); }); return out; }
  /* the feed: 4 reels, then an MCQ (every 5th item), … */
  function feed(f, st, rnd, day) {
    var rs = order(f, st, rnd, day), qs = shuffle(qPool(f === "saved" ? "rand" : f, day), rnd), out = [], qi = 0;
    rs.forEach(function (r) {
      out.push({ k: "r", r: r });
      if (out.length % MCQ_EVERY === MCQ_EVERY - 1 && qs.length) { out.push({ k: "q", q: qs[qi % qs.length].q, s: qs[qi % qs.length].s }); qi++; }
    });
    return out;
  }
  function whyOf(q, k) {                      // the bank's own «ليش غلط؟»: per-option reason → explanation sentence → the generic line
    var X = w.NursinWX, y = null;
    try { y = X && X.why ? X.why(q, k, []) : null; } catch (e) { y = null; }
    if (y && y.w) return y.w;
    var r = q.why && q.why[k]; if (r) return r;
    return X && X.fallback ? X.fallback(q) : "هيدا الخيار ما بينطبق هون — الصح هو: " + q.o[q.a];
  }
  var API = { order: order, feed: feed, subsOf: subsOf, nextSubs: nextSubs, poolOf: poolOf, whyOf: whyOf, FILTERS: FILTERS, MCQ_EVERY: MCQ_EVERY, KEY: K, load: load };
  w.NursinReels = API;
  if (!d || !d.getElementById) return;

  /* ---------------- the page ---------------- */
  var app, fd, items = [], cur = -1, st, filter = "next", timers = [], tStart = 0, sndOn = false, unlocked = false, voice = null, scrollT = 0;
  function S(s) { return (D().subj || {})[s] || ["📚", s, s, "index.html", "linear-gradient(160deg,#1e1b4b,#4338ca 55%,#7c3aed)"]; }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function pickVoice() {
    try { var vs = w.speechSynthesis ? w.speechSynthesis.getVoices() : []; voice = null; for (var i = 0; i < vs.length; i++) if (/^ar/i.test(vs[i].lang || "")) { voice = vs[i]; break; } } catch (e) { voice = null; }
    if (app && voice && !unlocked && cur === 0 && fd && sec(0) && !app.querySelector(".rltap") && items[0] && items[0].k === "r") { var tp = d.createElement("button"); tp.type = "button"; tp.className = "rltap"; tp.setAttribute("data-rs", "1"); tp.textContent = "🔊 " + T("اكبس لتشغيل الصوت", "Touche pour activer le son"); sec(0).appendChild(tp); }
    var b = app && app.querySelector(".rlsnd"); if (b) { b.disabled = !voice; b.textContent = voice && sndOn ? "🔊" : "🔇"; b.setAttribute("aria-label", voice ? T("الصوت", "Son") : T("ما في صوت عربي عهالجهاز", "Pas de voix arabe sur cet appareil")); }
  }
  function speak(txt) {
    try { if (!w.speechSynthesis) return; w.speechSynthesis.cancel(); if (!sndOn || !voice || !unlocked || !txt) return;
      var u = new w.SpeechSynthesisUtterance(String(txt).replace(/[\u2190-\u21FF\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\u200D•·|]/g, " ").replace(/\s+/g, " "));
      u.voice = voice; u.lang = voice.lang || "ar"; u.rate = 1; w.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { try { if (w.speechSynthesis) w.speechSynthesis.cancel(); } catch (e) {} }
  function pillsHtml() {
    return FILTERS.map(function (f) { return '<button type="button" class="rlpill' + (f[0] === filter ? " on" : "") + '" data-rf="' + f[0] + '">' + f[1] + " " + esc(T(f[2], f[3])) + "</button>"; }).join("");
  }
  function reelHtml(it, i) {
    var top = '<div class="rlpgw"><div class="rlprog"><i></i></div></div>';
    if (it.k === "q") {
      var q = it.q, m = S(it.s);
      return top + '<div class="rlbody rlo' + q.o.length + '">' + mascotHtml() + '<span class="rltag">❓ ' + T("سؤال سريع", "Question rapide") + " · " + bdx(T(m[1], m[2])) + "</span>" +
        '<div class="rlq">' + bdx(q.q, 1) + "</div>" +
        q.o.map(function (o, k) { return '<button type="button" class="rlopt" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + '<div class="rlqout"></div></div>';
    }
    var r = it.r, s = S(r.s), on = st.saved.indexOf(r.id) > -1;
    return top + (i === 0 && !unlocked && voice ? '<button type="button" class="rltap" data-rs="1">🔊 ' + T("اكبس لتشغيل الصوت", "Touche pour activer le son") + "</button>" : "") +
      '<div class="rlbody"><span class="rltag">' + s[0] + " " + bdx(T(s[1], s[2])) + (r.ls ? " · " + bdx(r.ls) : "") + "</span>" +
      toonHtml(r, s) +
      "<h2>" + bdx(r.ti) + "</h2>" +
      (r.fr ? '<div class="rlfr"><span lang="fr">' + esc(r.fr) + "</span> = <bdi>" + esc(r.ar) + "</bdi></div>" : "") +
      r.ln.map(function (l) { return '<div class="rlln wait" data-t="' + esc(l) + '"></div>'; }).join("") + "</div>" +
      '<a class="rlsrc" href="' + esc(r.h) + '">📖 ' + T("من درس: ", "Leçon : ") + "<u>" + bdx(r.ls || s[1]) + "</u></a>" +
      '<div class="rlside"><button type="button" data-ra="save"' + (on ? ' class="on"' : "") + ' aria-pressed="' + on + '"><span class="c">' + (on ? "❤️" : "🤍") + "</span>" + T("حفظ", "Sauver") + "</button>" +
      '<a href="' + esc(r.h) + '" data-ra="open"><span class="c">📖</span>' + T("الدرس", "Leçon") + "</a>" +
      '<button type="button" data-ra="share"><span class="c">↗️</span>' + T("شارك", "Partager") + "</button></div>" +
      (i === 0 ? '<div class="rlhint">⌃ ' + T("قلّب لفوق", "Glisse vers le haut") + "</div>" : "");
  }
  function sec(i) { return fd.children[i]; }
  function draw(i) { var el = sec(i); if (!el || el.getAttribute("data-on") === "1") return; el.innerHTML = reelHtml(items[i], i); el.setAttribute("data-on", "1"); fit(el); }
  function fit(el) {                           // 🎨 30v phone: a long reel moves its cartoon beside the title (then smaller) so nothing is cut — measured on a hidden copy with every line written
    var b = el && el.querySelector(".rlbody"), tn = b && b.querySelector(".rltoon"); if (!tn || wide() || !el.clientHeight) return;
    el.classList.remove("rlsm", "rlxs", "rltight");
    var c = b.cloneNode(true), cs = w.getComputedStyle ? w.getComputedStyle(el) : null, lv = ["rlsm", "rlxs", "rltight"];
    [].forEach.call(c.querySelectorAll(".rlln"), function (x) { x.textContent = x.getAttribute("data-t") || ""; x.className = "rlln"; x.removeAttribute("style"); });
    c.setAttribute("aria-hidden", "true"); c.style.position = "absolute"; c.style.visibility = "hidden"; c.style.top = "0"; c.style.width = b.offsetWidth + "px"; el.appendChild(c);
    var room = el.clientHeight - (cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 270) - 4;
    for (var k = 0; k < lv.length && c.offsetHeight > room; k++) el.classList.add(lv[k]);
    el.removeChild(c);
  }

  function undraw(i) { var el = sec(i); if (!el || el.getAttribute("data-on") !== "1") return; el.innerHTML = ""; el.setAttribute("data-on", "0"); }
  function typeIn(el, it) {
    var ls = el.querySelectorAll(".rlln"), n = 0, total = 0;
    [].forEach.call(ls, function (x) { total += (x.getAttribute("data-t") || "").length; });
    var dur = Math.max(6, Math.min(20, 2.5 + total * 0.05)), pg = el.querySelector(".rlprog");
    if (pg) { pg.classList.remove("run"); void pg.offsetWidth; var bar = pg.querySelector("i"); if (bar) { bar.style.webkitAnimationDuration = dur + "s"; bar.style.animationDuration = dur + "s"; } pg.classList.add("run"); }
    if (it.k === "q") { speak(it.q.q); return; }
    speak(it.r.ti + ". " + it.r.ln.join(". "));
    if (look && look.anim !== "type") {        // 🎨 30v: today's look brings the lines in with a fade-up or a slide instead of the typewriter
      [].forEach.call(ls, function (x, k) { x.textContent = x.getAttribute("data-t") || ""; x.classList.remove("wait"); x.style.webkitAnimationDelay = x.style.animationDelay = (0.25 + k * 0.45) + "s"; x.classList.add("rlin"); });
      return;
    }
    function line() {
      if (n >= ls.length) return; var x = ls[n], txt = x.getAttribute("data-t") || "", c = 0, step = Math.max(1, Math.round(txt.length / 60));
      x.classList.remove("wait"); x.classList.add("rlcur");
      var iv = setInterval(function () { c = Math.min(txt.length, c + step); x.textContent = txt.slice(0, c); if (c >= txt.length) { clearInterval(iv); x.classList.remove("rlcur"); n++; timers.push(setTimeout(line, 260)); } }, 26);
      timers.push(iv);
    }
    timers.push(setTimeout(line, 350));
  }
  function finishTyping(el) { [].forEach.call(el.querySelectorAll(".rlln"), function (x) { x.classList.remove("wait", "rlcur", "rlin"); x.textContent = x.getAttribute("data-t") || ""; }); }
  function activate(i) {
    if (i === cur || i < 0 || i >= items.length) return;
    if (cur > -1 && sec(cur)) finishTyping(sec(cur));
    clearTimers(); hush(); cur = i;
    for (var j = 0; j < items.length; j++) { if (Math.abs(j - i) <= WIN) draw(j); else undraw(j); }
    fit(sec(i)); typeIn(sec(i), items[i]); tStart = Date.now();
    var it = items[i];
    if (it.k === "r") timers.push(setTimeout(function () { if (cur === i) { st.seen[it.r.id] = 1; save(st); } }, 1500));
    if (i >= items.length - 3 && items.length) more();
    try { if (history.replaceState && it.k === "r") history.replaceState(null, "", "#r=" + it.r.id); } catch (e) {}
  }
  function more() {                             // keep the feed going: append the next round (already-seen reels come back only after all were seen)
    if (filter === "saved") return;
    var have = {}; items.forEach(function (it) { if (it.k === "r") have[it.r.id] = 1; });
    var add = feed(filter, st).filter(function (it) { return it.k === "q" || !have[it.r.id]; });
    if (!add.filter(function (it) { return it.k === "r"; }).length) add = feed(filter, { seen: {}, saved: st.saved });   // every reel is already in the feed: a fresh round
    if (!add.length) return;
    add.forEach(function (it) { items.push(it); var s = d.createElement("section"); s.className = "rlv"; s.setAttribute("data-on", "0"); s.className = it.k === "q" ? "rlv rlvq" : "rlv"; s.style.background = bgOf(it); fd.appendChild(s); });
  }
  function build(first) {
    clearTimers(); hush(); cur = -1; fd.innerHTML = ""; fd.scrollTop = 0;
    items = feed(filter, st);
    if (first) { var at = -1; for (var x = 0; x < items.length; x++) if (items[x].k === "r" && items[x].r.id === first) { at = x; break; }
      if (at < 0) { var R = D().r || []; for (var y = 0; y < R.length; y++) if (R[y].id === first) { items.unshift({ k: "r", r: R[y] }); break; } } else if (at > 0) items.unshift(items.splice(at, 1)[0]); }
    if (!items.length) {
      fd.innerHTML = '<section class="rlv rlempty"><span style="font-size:48px">' + (filter === "saved" ? "🤍" : "🎬") + "</span><b>" +
        (filter === "saved" ? T("لسّا ما حفظت ولا ريل", "Aucun reel sauvegardé") : T("ما في ريلز هون بعد", "Pas encore de reels ici")) + "</b><p>" +
        (filter === "saved" ? T("كبوس ❤️ على أي ريل بيعجبك وبيطلع هون", "Touche ❤️ sur un reel pour le garder ici") : "") + "</p></section>";
      return;
    }
    items.forEach(function (it) { var s = d.createElement("section"); s.className = "rlv"; s.setAttribute("data-on", "0"); s.className = it.k === "q" ? "rlv rlvq" : "rlv"; s.style.background = bgOf(it); fd.appendChild(s); });
    activate(0);
  }
  function onScroll() {
    if (scrollT) return;
    scrollT = (w.requestAnimationFrame || setTimeout)(function () { scrollT = 0; var h = fd.clientHeight || 1; activate(Math.round(fd.scrollTop / h)); });
  }
  function toast(m) { var t = d.createElement("div"); t.className = "rltoast"; t.textContent = m; app.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1800); }
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { if (w.speechSynthesis && voice) { var u = new w.SpeechSynthesisUtterance(" "); u.volume = 0; w.speechSynthesis.speak(u); } } catch (e) {}
    var tp = app.querySelector(".rltap"); if (tp && tp.parentNode) tp.parentNode.removeChild(tp);
  }
  function answer(b) {
    var el = b.closest(".rlv"), i = [].indexOf.call(fd.children, el), it = items[i]; if (!it || it.k !== "q" || it.done) return;
    var q = it.q, k = +b.getAttribute("data-k"), ok = k === q.a; it.done = true;
    [].forEach.call(el.querySelectorAll(".rlopt"), function (o) { var kk = +o.getAttribute("data-k"); o.disabled = true; if (kk === q.a) { o.classList.add("good"); o.textContent = "✅ " + o.textContent; } else if (kk === k) { o.classList.add("bad"); o.textContent = "❌ " + o.textContent; } });
    var out = "";
    if (!ok) { var why = d.createElement("div"); why.className = "rlwhy"; why.innerHTML = "<b>" + T("❓ ليش غلط؟", "❓ Pourquoi c'est faux ?") + "</b> " + esc(whyOf(q, k)); b.parentNode.insertBefore(why, b.nextSibling); }
    if (q.x) out = '<div class="rlwhy ok"><b>✅ ' + (ok ? T("صح!", "Juste !") : T("الصح:", "La bonne :")) + "</b> " + esc(String(q.x).length > 170 ? String(q.x).slice(0, 168) + "…" : q.x) + "</div>";
    var o2 = el.querySelector(".rlqout"); if (o2) o2.innerHTML = out;
    var ms = el.querySelector(".rlmas"); if (ms) { ms.classList.add(ok ? "yay" : "sad"); var mb = ms.querySelector(".rlmb"); if (mb) mb.textContent = ok ? "✅" : "❌"; }   // 🎨 30v mascot
    speak(ok ? "صح" : whyOf(q, k));
  }
  function share(r) {
    var url = location.origin + location.pathname.replace(/[^/]*$/, "") + "reels.html#r=" + r.id, txt = "🎬 " + r.ti + " — nursin";
    try { if (navigator.share) { navigator.share({ title: r.ti, text: txt, url: url }).catch(function () {}); return; } } catch (e) {}
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { toast(T("✅ انسخ الرابط", "✅ Lien copié")); }, function () { toast(url); }); return; } } catch (e) {}
    toast(url);
  }
  function click(e) {
    var t = e.target; if (!t.closest) return;
    var p = t.closest("[data-rf]");
    if (p) { filter = p.getAttribute("data-rf"); [].forEach.call(app.querySelectorAll(".rlpill"), function (x) { x.classList.toggle("on", x === p); }); unlock(); build(); return; }
    if (t.closest(".rlsnd")) { unlock(); sndOn = !sndOn; st.snd = sndOn ? 1 : 0; save(st); pickVoice(); if (sndOn && cur > -1) { var it0 = items[cur]; speak(it0.k === "q" ? it0.q.q : it0.r.ti + ". " + it0.r.ln.join(". ")); } else hush(); return; }
    if (t.closest("[data-rs]")) { unlock(); sndOn = true; st.snd = 1; save(st); pickVoice(); var it1 = items[cur]; if (it1) speak(it1.k === "q" ? it1.q.q : it1.r.ti + ". " + it1.r.ln.join(". ")); return; }
    var o = t.closest(".rlopt"); if (o) { unlock(); answer(o); return; }
    var a = t.closest("[data-ra]");
    if (a) {
      var el = a.closest(".rlv"), it = items[[].indexOf.call(fd.children, el)]; if (!it || it.k !== "r") return;
      var act = a.getAttribute("data-ra");
      if (act === "save") { e.preventDefault(); var ix = st.saved.indexOf(it.r.id), on = ix < 0; if (on) st.saved.push(it.r.id); else st.saved.splice(ix, 1); save(st); a.classList.toggle("on", on); a.setAttribute("aria-pressed", String(on)); a.querySelector(".c").textContent = on ? "❤️" : "🤍"; toast(on ? T("❤️ انحفظ بالمحفوظات", "❤️ Sauvegardé") : T("انشال من المحفوظات", "Retiré")); }
      else if (act === "share") { e.preventDefault(); share(it.r); }
      return;
    }
    unlock();
  }
  /* 💻 30t desktop only (≥1024 px, Abdullah Nov 8 2026 2:27 PM «ليش ما موجود كمان لل pc لل mac؟»): one wheel / trackpad swipe = one reel
     (a trackpad's long glide no longer skips several, and Chrome's small wheel steps no longer snap back); the wheel over the filter pills
     slides them sideways; ↑/↓ glide smoothly. Phones keep native scroll-snap untouched. */
  var wAcc = 0, wLast = 0, wMove = 0, wPrev = 0;
  function wide() { try { return !!(w.matchMedia && w.matchMedia("(min-width:1024px)").matches); } catch (e) { return false; } }
  function step(n) {
    var h = fd.clientHeight || 1, max = fd.children.length - 1, base = Math.round(fd.scrollTop / h), to = Math.max(0, Math.min(max, base + n));
    if (to === base) return;
    try { fd.scrollTo({ top: to * h, behavior: "smooth" }); } catch (e) { fd.scrollTop = to * h; }
  }
  function wheel(e) {
    if (!fd || !wide()) return;
    var t = e.target, dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY, dx = e.deltaX || 0, now = Date.now();
    var pl = t && t.closest && t.closest(".rlpills");
    if (pl) { if (Math.abs(dy) > Math.abs(dx)) { e.preventDefault(); pl.scrollLeft -= dy; } return; }
    var qv = t && t.closest && t.closest(".rlvq");
    if (qv && qv.scrollHeight > qv.clientHeight + 4 && ((dy > 0 && qv.scrollTop + qv.clientHeight < qv.scrollHeight - 2) || (dy < 0 && qv.scrollTop > 0))) return;
    e.preventDefault();
    var ady = Math.abs(dy);
    if (wMove) {
      if (now - wMove < 380 || (now - wLast < 220 && ady <= wPrev * 1.3 + 2)) { wPrev = ady; wLast = now; return; }
      wMove = 0; wAcc = 0;
    }
    if (now - wLast > 250) wAcc = 0;
    wLast = now; wPrev = ady; wAcc += dy;
    if (Math.abs(wAcc) < 30) return;
    step(wAcc > 0 ? 1 : -1); wAcc = 0; wMove = now;
  }
  function keys(e) {
    if (!fd || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) return;
    var h = fd.clientHeight;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") { e.preventDefault(); if (wide()) step(1); else fd.scrollTop = (cur + 1) * h; }
    else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") { e.preventDefault(); if (wide()) step(-1); else fd.scrollTop = Math.max(0, cur - 1) * h; }
  }
  function boot() {
    var host = d.getElementById("reels"); if (!host || app) return;
    st = load(); filter = "next"; sndOn = st.snd !== 0;
    var m = /[#&]r=([\w-]+)/.exec(location.hash || ""), first = m ? m[1] : null;
    app = d.createElement("div"); app.className = "rlapp"; app.setAttribute("data-noswipe", "1");
    app.innerHTML = '<div class="rlfeed" role="feed" aria-label="Reels"></div>' +
      '<div class="rlchrome"><div class="rlbar"><a class="rlback" href="index.html" aria-label="' + T("رجوع", "Retour") + '">→</a><div class="rlpills" role="tablist">' + pillsHtml() + '</div><button type="button" class="rlsnd" aria-label="' + T("الصوت", "Son") + '">🔇</button></div></div>';
    host.appendChild(app); fd = app.querySelector(".rlfeed");
    var tn = TN(); look = tn ? tn.themeFor(new Date()) : null;      // 🎨 30v: today's look (by the local date — same for everyone today, new tomorrow)
    if (look) {
      app.className += " lk-" + look.card + " pt-" + look.pat + " ft-" + look.font + " an-" + look.anim + " th-" + look.id + " rllooking";
      app.style.setProperty("--rlacc", look.acc);
      var chip = d.createElement("div"); chip.className = "rllook"; chip.setAttribute("role", "status");
      chip.textContent = "🎨 " + T("لوك اليوم: ", "Look du jour : ") + look.e + " " + T(look.ar, look.fr); app.appendChild(chip);
      setTimeout(function () { if (chip.parentNode) chip.parentNode.removeChild(chip); app.classList.remove("rllooking"); }, 2100);
    }
    fd.addEventListener("scroll", onScroll, { passive: true });
    app.addEventListener("click", click);
    app.addEventListener("wheel", wheel, { passive: false });
    d.addEventListener("keydown", keys);
    d.addEventListener("visibilitychange", function () { if (d.hidden) hush(); });
    w.addEventListener("pagehide", hush);
    pickVoice(); try { if (w.speechSynthesis && "onvoiceschanged" in w.speechSynthesis) w.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
    build(first);
    try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { [].forEach.call(fd.children, function (s) { if (s.getAttribute("data-on") === "1") fit(s); }); }); } catch (e) {}
  }
  API.boot = boot; API.cur = function () { return cur; }; API.items = function () { return items; }; API.filter = function () { return filter; }; API.look = function () { return look; };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, typeof document !== "undefined" ? document : null);
