/* 🎬 Reels (30s, Nov 8 2026 — Abdullah 1:33–1:46 PM: a reels tab instead of «المواد» in the bottom nav, approved mockup, «وينحط كمان شي عشوائي»).
   • reels.html: Instagram-style vertical feed (scroll-snap), one key point of HIS lessons per screen (assets/reels-data.js, taken from the
     lesson pages as drawn — nothing invented), typewriter lines, gradient per subject, progress bar; every 5th reel = an MCQ from the bank
     with ✅/❌ and «ليش غلط؟» (assets/wrongx.js NursinWX.why: the per-option reason → the explanation → the generic line).
   • ❤️ save (localStorage → «محفوظات»), 📖 the source lesson at that part, ↗️ share (navigator.share or copy the link reels.html#r=<id>).
   • filters: «🎯 امتحاني الجاي» (default: the next exam's subjects from assets/midterm.js), «🎲 عشوائي» (every subject, mixed evenly),
     each subject, «❤️ محفوظات». Shuffled; a reel seen is not shown again until every reel of that filter was seen (nursin_reels_v1).
   • 🎙️ 30z (Abdullah 3:34–3:36 PM: «صوت مثل جيميني… قريب للطبيعي», «حطهم لتنين… من فيديو لفيديو يتغير الصوت»): each reel (and each MCQ
     stem in its original wording) has a natural-voice mp3 in assets/reels-audio/<id>.mp3 — voice A (female) for even reels, B (male) for
     odd ones (index in NREELS.r / in the flat NREELS.q list), and the feed is arranged so the voice alternates reel to reel. One reused
     HTMLAudio element (unlocked by the first tap on iPhone), only the current + next file are loaded, stopped on swipe; a missing/failed
     file or a reworded MCQ (NURSIN_QV) falls back to the speechSynthesis narration below.
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
      while (more) {                           // 🎙️ 30z: inside each round (one reel per subject) the voices take turns
        var left = keys.filter(function (k) { return by[k].length; }); more = left.length > 0;
        while (left.length) {
          var want = slotV(out.length), at = -1, ls = out.length ? out[out.length - 1].s : null, hasW = function (k) { return by[k].some(function (r) { return voiceOf({ k: "r", r: r }) === want; }); };
          for (var x = 0; x < left.length && at < 0; x++) if (left[x] !== ls && hasW(left[x])) at = x;    // the other voice, and never the same subject twice in a row
          for (x = 0; x < left.length && at < 0; x++) if (left[x] !== ls) at = x;
          if (at < 0) at = 0;
          var r0 = takeV(by[left[at]], want); out.push(r0); left.splice(at, 1);
        }
      }
      return out;
    }
    var sh = shuffle(pool, rnd), o2 = [];
    while (sh.length) o2.push(takeV(sh, slotV(o2.length)));
    return o2;
  }
  function qvToday(q) { var X = w.NURSIN_QV; try { return X && q && q.id ? X.pick(q.id, q) : q; } catch (e) { return q; } }   // 🔄 30w: the day's wording (assets/qv.js)
  function qPool(f, day) { var Q = D().q || {}, out = []; subsOf(f, day).forEach(function (s) { (Q[s] || []).forEach(function (q) { out.push({ s: s, q: q }); }); }); return out; }
  /* the feed: 4 reels, then an MCQ (every 5th item), … */
  function feed(f, st, rnd, day) {
    var rs = order(f, st, rnd, day), qs = shuffle(qPool(f === "saved" ? "rand" : f, day), rnd), out = [], qi = 0;
    rs.forEach(function (r) {
      out.push({ k: "r", r: r });
      if (out.length % MCQ_EVERY === MCQ_EVERY - 1 && qs.length) {
        var wq = (out.length % 2) ? "b" : "a";   // 🎙️ 30z: the question takes the voice of its slot
        for (var z = qi; z < qs.length && z < qi + 6; z++) if (voiceOf({ k: "q", q: qs[z].q }) === wq) { var tq = qs[qi]; qs[qi] = qs[z]; qs[z] = tq; break; }
        out.push({ k: "q", q: qvToday(qs[qi % qs.length].q), b: qs[qi % qs.length].q, s: qs[qi % qs.length].s }); qi++; }
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
  /* ---------- 🎙️ 30z: which voice / which file ---------- */
  var AUD = "assets/reels-audio/", vMap = null;
  function vIndex() {
    var R = D().r || [], Q = D().q || {};
    if (vMap && vMap.d === D()) return vMap;
    var m = { d: D(), r: {}, q: {} }, j = 0;
    R.forEach(function (r, i) { m.r[r.id] = i % 2 ? "b" : "a"; });
    for (var s in Q) if (Object.prototype.hasOwnProperty.call(Q, s)) (Q[s] || []).forEach(function (q) { m.q[q.id] = j % 2 ? "b" : "a"; j++; });
    vMap = m; return m;
  }
  function voiceOf(it) { var m = vIndex(); if (!it) return "a"; return (it.k === "q" ? m.q[it.q && it.q.id] : m.r[it.r && it.r.id]) || "a"; }
  function isOrigQ(it) { var b = it.b || it.q; return !!(b && it.q && !(it.q.qvi > 0) && it.q.q === (b.q0 != null ? b.q0 : b.q)); }
  function audioOf(it) {                       // the reel's mp3, or "" (a reworded MCQ stem has no recording → speechSynthesis)
    if (!it) return "";
    if (it.k === "q") return it.q && it.q.id && isOrigQ(it) ? AUD + it.q.id + ".mp3" : "";
    return it.r && it.r.id ? AUD + it.r.id + ".mp3" : "";
  }
  function alt(list, prev, keep0) {             // voices take turns: swap a text reel with a near one of the other voice (MCQ slots stay put;
    for (var i = 0; i < list.length; i++) {      //  the reel moved in never repeats the subject of the 2 reels before it, so 🎲 stays mixed)
      var want = prev === "a" ? "b" : "a";
      if (!(keep0 && i === 0) && list[i].k === "r" && voiceOf(list[i]) !== want) {
        var rec = [], c = i - 1; while (c >= 0 && rec.length < 2) { if (list[c].k === "r") rec.push(list[c].r.s); c--; }
        for (var j = i + 1; j < list.length && j <= i + 4; j++) if (list[j].k === "r" && voiceOf(list[j]) === want && (list[j].r.s === list[i].r.s || rec.indexOf(list[j].r.s) < 0)) { var t = list[i]; list[i] = list[j]; list[j] = t; break; }
      }
      prev = voiceOf(list[i]);
    }
    return list;
  }
  function slotV(n) { var pos = n + Math.floor(n / (MCQ_EVERY - 1)); return pos % 2 ? "b" : "a"; }   // the n-th reel's place in the feed (an MCQ after every 4) → its voice
  function takeV(arr, want) { for (var i = 0; i < arr.length; i++) if (voiceOf({ k: "r", r: arr[i] }) === want) return arr.splice(i, 1)[0]; return arr.shift(); }
  function narrTxt(it) { return it ? (it.k === "q" ? it.q.q : it.r.ti + ". " + it.r.ln.join(". ")) : ""; }
  var API = { voiceOf: voiceOf, audioOf: audioOf, alt: alt, AUD: AUD, order: order, feed: feed, subsOf: subsOf, nextSubs: nextSubs, poolOf: poolOf, whyOf: whyOf, FILTERS: FILTERS, MCQ_EVERY: MCQ_EVERY, KEY: K, load: load };
  w.NursinReels = API;
  if (!d || !d.getElementById) return;

  /* ---------------- the page ---------------- */
  var app, fd, items = [], cur = -1, st, filter = "next", timers = [], tStart = 0, sndOn = false, unlocked = false, voice = null, scrollT = 0, canAud = false;
  function S(s) { return (D().subj || {})[s] || ["📚", s, s, "index.html", "linear-gradient(160deg,#1e1b4b,#4338ca 55%,#7c3aed)"]; }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
  function pickVoice() {
    canAud = !!w.Audio;
    try { var vs = w.speechSynthesis ? w.speechSynthesis.getVoices() : []; voice = null; for (var i = 0; i < vs.length; i++) if (/^ar/i.test(vs[i].lang || "")) { voice = vs[i]; break; } } catch (e) { voice = null; }
    if (app && (voice || canAud) && !unlocked && cur === 0 && fd && sec(0) && !app.querySelector(".rltap") && items[0] && items[0].k === "r") { var tp = d.createElement("button"); tp.type = "button"; tp.className = "rltap"; tp.setAttribute("data-rs", "1"); tp.textContent = "🔊 " + T("اكبس لتشغيل الصوت", "Touche pour activer le son"); sec(0).appendChild(tp); }
    var b = app && app.querySelector(".rlsnd"); if (b) { b.disabled = !(voice || canAud); b.textContent = (voice || canAud) && sndOn ? "🔊" : "🔇"; b.setAttribute("aria-label", voice || canAud ? T("الصوت", "Son") : T("ما في صوت عربي عهالجهاز", "Pas de voix arabe sur cet appareil")); }
  }
  function speak(txt) {
    try { if (!w.speechSynthesis) return; w.speechSynthesis.cancel(); if (!sndOn || !voice || !unlocked || !txt) return;
      var u = new w.SpeechSynthesisUtterance(String(txt).replace(/[\u2190-\u21FF\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\u200D•·|]/g, " ").replace(/\s+/g, " "));
      u.voice = voice; u.lang = voice.lang || "ar"; u.rate = 1; w.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function hush() { try { if (w.speechSynthesis) w.speechSynthesis.cancel(); } catch (e) {} }
  /* 🎙️ 30z player: one element for every reel (iPhone unlocks an element once, on a tap), a second one only pre-fetches the next file */
  var aud = null, preA = null, audFor = -1, audBad = {};
  function player() { if (!aud && w.Audio) { try { aud = new w.Audio(); aud.preload = "auto"; aud.setAttribute("playsinline", ""); } catch (e) { aud = null; } } return aud; }
  function stopAud() { audFor = -1; try { if (aud) aud.pause(); } catch (e) {} }
  function preload(i) {
    var src = audioOf(items[i]); if (!src || audBad[src] || !w.Audio || !sndOn) return;
    try { if (!preA) { preA = new w.Audio(); preA.preload = "auto"; } if (preA.getAttribute("data-src") !== src) { preA.setAttribute("data-src", src); preA.src = src; if (preA.load) preA.load(); } } catch (e) {}
  }
  function narrate(i) {                        // the reel's own recording; else (no file / failed / reworded MCQ) the device voice
    var it = items[i]; hush(); stopAud(); if (!it || !sndOn || !unlocked) return;
    var src = audioOf(it), a = src && !audBad[src] ? player() : null;
    if (!a) { speak(narrTxt(it)); preload(i + 1); return; }
    audFor = i;
    var fb = function () { if (audFor === i && cur === i) { audBad[src] = 1; audFor = -1; speak(narrTxt(it)); } };
    try {
      a.onerror = fb; a.setAttribute("data-voice", voiceOf(it));
      if (a.getAttribute("data-src") !== src) { a.setAttribute("data-src", src); a.src = src; } else { try { a.currentTime = 0; } catch (e1) {} }
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function (e) { var n = e && e.name; if (n !== "NotAllowedError" && n !== "AbortError") fb(); });
    } catch (e) { fb(); }
    preload(i + 1);
  }
  function pillsHtml() {
    return FILTERS.map(function (f) { return '<button type="button" class="rlpill' + (f[0] === filter ? " on" : "") + '" data-rf="' + f[0] + '">' + f[1] + " " + esc(T(f[2], f[3])) + "</button>"; }).join("");
  }
  function reelHtml(it, i) {
    var top = '<div class="rlpgw"><div class="rlprog"><i></i></div></div>';
    if (it.k === "q") {
      var q = it.q, m = S(it.s);
      return top + '<div class="rlbody rlo' + q.o.length + '"><div class="rlqhd"><span class="rltag">❓ ' + T("سؤال سريع", "Question rapide") + " · " + bdx(T(m[1], m[2])) + "</span>" + mascotHtml() + "</div>" +
        '<div class="rlq">' + bdx(q.q, 1) + "</div>" +
        q.o.map(function (o, k) { return '<button type="button" class="rlopt" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + '<div class="rlqout"></div></div>';
    }
    var r = it.r, s = S(r.s), on = st.saved.indexOf(r.id) > -1;
    return top + (i === 0 && !unlocked && (voice || canAud) ? '<button type="button" class="rltap" data-rs="1">🔊 ' + T("اكبس لتشغيل الصوت", "Touche pour activer le son") + "</button>" : "") +
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
    narrate(cur);
    if (it.k === "q") return;
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
    clearTimers(); hush(); stopAud(); cur = i;
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
    alt(add, voiceOf(items[items.length - 1]));
    add.forEach(function (it) { items.push(it); var s = d.createElement("section"); s.className = "rlv"; s.setAttribute("data-on", "0"); s.className = it.k === "q" ? "rlv rlvq" : "rlv"; s.style.background = bgOf(it); fd.appendChild(s); });
  }
  function build(first) {
    clearTimers(); hush(); stopAud(); cur = -1; fd.innerHTML = ""; fd.scrollTop = 0;
    items = feed(filter, st);
    if (first) { var at = -1; for (var x = 0; x < items.length; x++) if (items[x].k === "r" && items[x].r.id === first) { at = x; break; }
      if (at < 0) { var R = D().r || []; for (var y = 0; y < R.length; y++) if (R[y].id === first) { items.unshift({ k: "r", r: R[y] }); break; } } else if (at > 0) items.unshift(items.splice(at, 1)[0]); alt(items, undefined, true); }
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
    if (sndOn && cur > -1) narrate(cur);        // 🎙️ 30z: the first tap starts this reel's voice (and unlocks the player on iPhone)
  }
  function answer(b) {
    var el = b.closest(".rlv"), i = [].indexOf.call(fd.children, el), it = items[i]; if (!it || it.k !== "q" || it.done) return;
    var q = it.q, k = +b.getAttribute("data-k"), ok = k === q.a; it.done = true;
    try { var QV = w.NURSIN_QV; if (QV && QV.mark) QV.mark(q.id, ok); } catch (e0) {}   // 🔄 30x: practised here too → next time another wording
    [].forEach.call(el.querySelectorAll(".rlopt"), function (o) { var kk = +o.getAttribute("data-k"); o.disabled = true; if (kk === q.a) { o.classList.add("good"); o.textContent = "✅ " + o.textContent; } else if (kk === k) { o.classList.add("bad"); o.textContent = "❌ " + o.textContent; } });
    var out = "";
    if (!ok) { var why = d.createElement("div"); why.className = "rlwhy"; why.innerHTML = "<b>" + T("❓ ليش غلط؟", "❓ Pourquoi c'est faux ?") + "</b> " + esc(whyOf(q, k)); b.parentNode.insertBefore(why, b.nextSibling); }
    if (q.x) out = '<div class="rlwhy ok"><b>✅ ' + (ok ? T("صح!", "Juste !") : T("الصح:", "La bonne :")) + "</b> " + esc(String(q.x).length > 170 ? String(q.x).slice(0, 168) + "…" : q.x) + "</div>";
    var o2 = el.querySelector(".rlqout"); if (o2) o2.innerHTML = out;
    var ms = el.querySelector(".rlmas"); if (ms) { ms.classList.add(ok ? "yay" : "sad"); var mb = ms.querySelector(".rlmb"); if (mb) mb.textContent = ok ? "✅" : "❌"; }   // 🎨 30v mascot
    stopAud(); speak(ok ? "صح" : whyOf(q, k));
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
    if (t.closest(".rlsnd")) { unlock(); sndOn = !sndOn; st.snd = sndOn ? 1 : 0; save(st); pickVoice(); if (sndOn && cur > -1) narrate(cur); else { hush(); stopAud(); } return; }
    if (t.closest("[data-rs]")) { unlock(); sndOn = true; st.snd = 1; save(st); pickVoice(); if (cur > -1) narrate(cur); return; }
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
    d.addEventListener("visibilitychange", function () { if (d.hidden) { hush(); stopAud(); } });
    w.addEventListener("pagehide", function () { hush(); stopAud(); });
    pickVoice(); try { if (w.speechSynthesis && "onvoiceschanged" in w.speechSynthesis) w.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
    build(first);
    try { if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { [].forEach.call(fd.children, function (s) { if (s.getAttribute("data-on") === "1") fit(s); }); }); } catch (e) {}
  }
  API.boot = boot; API.cur = function () { return cur; }; API.items = function () { return items; }; API.filter = function () { return filter; }; API.look = function () { return look; }; API.audio = function () { return aud; };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, typeof document !== "undefined" ? document : null);
