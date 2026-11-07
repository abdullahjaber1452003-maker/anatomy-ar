/* ❓ «كيف بستعمل» — the site shows each student HOW to use things, once (Abdullah, Nov 7 2026 1:29 PM: «بدي انه نزّل الطلاب على الأشياء
   لبعد ما فاتو عليها كيف يستخدموها، وبعد ما يعرفو ما في داعي يرجع يعلّمن تاني يوم»; 1:30 PM: «لأن أحد أهم الأشياء القلم»).
   • Home, first visit: a short coach-mark tour (spotlight + bubble, «التالي / فهمت / تخطّي»): مسار اليوم → a step opens in place → 🏥 المستشفى →
     🔍 دوّر → 👨‍🏫 عثمان → 🎯 الامتحانات → ☰ القائمة.
   • First time on a lesson page: the 🖍️ القلم tip (select → 🖍️, «🖊️ وضع القلم», colour / 🧽 erase, everything in «🖍️ تعليماتي»).
     Also one small tip the first time on: the inline path sheet (30g), حفظي (التكرار المتباعد), the mind maps, the 🏥 hospital, عثمان, تعليماتي.
   • Each one shows ONCE EVER: seen ids in localStorage nursin_onb_v1 {t:{id:time}} AND, signed in, users/{uid}.onb.t (a map on his own doc —
     rules v22 accept any extra field there, nothing to publish). «تخطّي», «فهمت» and the last step all mark it seen.
   • «❓ كيف بستعمل» in the menu (☰ / «الكل» sheet, assets/ui.js) replays it. Never inside ?embed=1 (the home path sheet), no ads, no loop
     animation, nothing locks scrolling once it's closed; iOS 12 safe (ES5, no scrollIntoView options). Shared with assets/whatsnew.js (onb.w). */
(function (w, d) {
  "use strict";
  var KEY = "nursin_onb_v1";
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------------- the seen store (pure parts are tested) ---------------- */
  function state() { var s = lsGet(KEY); if (!s || typeof s !== "object") s = {}; if (!s.t || typeof s.t !== "object") s.t = {}; if (!s.w || typeof s.w !== "object") s.w = {}; return s; }
  // this device + the account's copy → one (union; the earliest time wins, so «seen» never goes back)
  function merge(loc, rem) {
    var out = { t: {}, w: {} }; loc = loc || {}; rem = rem || {};
    ["t", "w"].forEach(function (k) { [loc[k] || {}, rem[k] || {}].forEach(function (m) { Object.keys(m).forEach(function (id) { var v = +m[id] || 1; if (!out[k][id] || v < out[k][id]) out[k][id] = v; }); }); });
    ["at", "fresh"].forEach(function (k) { if (loc[k] != null) out[k] = loc[k]; });
    return out;
  }
  function seen(id, kind) { return !!state()[kind || "t"][id]; }
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() {
    clearTimeout(pt);
    pt = setTimeout(function () { var A = fbA(); if (!A) return; var s = state();
      try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { onb: { t: s.t, w: s.w } }, { merge: true }).catch(function () {}); } catch (e) {} }, 1200);
  }
  function mark(id, kind) { var s = state(), k = kind || "t"; if (!s[k][id]) { s[k][id] = Date.now(); lsSet(KEY, s); push(); } }
  var pulled = false, pulling = null;
  function pull() {
    var A = fbA(); if (!A) return Promise.resolve(false);
    if (pulling) return pulling;
    pulling = new Promise(function (res) {
      try {
        A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (snap) {
          var r = snap && snap.exists && snap.exists() ? snap.data() : null, s = state();
          if (r) { var m = merge(s, r.onb || {}); s.t = m.t; s.w = m.w; if (!r.onb && (+r.points || 0) > 0) s.old = 1; lsSet(KEY, s); if (r.onb && JSON.stringify(r.onb.t || {}) !== JSON.stringify(s.t)) push(); }
          pulled = true; res(true);
        }, function () { pulled = true; res(false); });
      } catch (e) { pulled = true; res(false); }
    });
    return pulling;
  }
  var authSeen = false;
  if (d && d.addEventListener) d.addEventListener("nursin:auth", function (e) { authSeen = true; if (e.detail && e.detail.signedIn) { pulling = null; pull(); } });

  /* ---------------- where am I ---------------- */
  function emb() { try { if (!w.location) return false; return /[?&]embed=1(&|$)/.test(w.location.search) || (w.name === "nzsheet" && w.parent && w.parent !== w) || String(d.documentElement.className).indexOf("nzemb") > -1; } catch (e) { return false; } }
  function page() { try { var p = (w.location.pathname.split("/").pop() || "index.html").toLowerCase(); return p === "" ? "index.html" : p; } catch (e) { return "index.html"; } }
  var LPAGES = { "cardio.html": 1, "neuro.html": 1, "henderson.html": 1, "law.html": 1, "mgmt.html": 1, "quality.html": 1, "pharma.html": 1, "rea.html": 1, "geri.html": 1, "community.html": 1, "medsurg.html": 1 };

  /* ---------------- the tours (Lebanese Arabic, short) ---------------- */
  var TOURS = {
    home: [
      { sel: "#path .hzph", t: "🧭 مسار اليوم", b: "هون كل شي لازم تعملو اليوم، بالترتيب. يلّي بتخلصو بينزل لتحت ✅" },
      { sel: "#path li.hzst", t: "👆 كبسة على خطوة", b: "بتفتح مكانك: الكويز، الامتحانات، سؤال اليوم والتكرار المتباعد بتحلّن هون من غير ما تطلع من المسار" },
      { sel: ".hzlivew", t: "🏥 المستشفى", b: "مرضى ناطرينك هلّق — فوت ساعدن وتعلّم عالحالات" },
      { sel: ".hzsrch", t: "🔍 دوّر", b: "أي درس، سؤال أو دوا — اكتب كلمة وبتلاقيه" },
      { sel: ".hznav .hzmid, a[href=\"tutor.html\"]", t: "👨‍🏫 الأستاذ عثمان", b: "اسألو أي شي عن دروسك، بيشرحلك وبيعطيك أسئلة تتمرّن" },
      { sel: ".hzfoot .hzmidft, .hzfoot", t: "🎯 الامتحانات", b: "امتحان الفصل، بطولة صفّك وحفظي هون — وكويزات اليوم بتطلعلك جوّا المسار" },
      { sel: ".hznav [data-hz=\"all\"], .dkft [data-hz=\"all\"], .menu-btn", t: "☰ القائمة", b: "كل شي بالموقع هون: 🖍️ تعليماتي، 📒 ملاحظاتي… وإذا نسيت، «❓ كيف بستعمل» بيرجّعلك هالشرح" }
    ],
    pen: [
      { sel: ".uipen", t: "🖍️ القلم — أهم شي!", b: "حدّد أي كلمة أو جملة بالدرس، بيطلعلك 🖍️ صغير: كبسة عليه وبتتعلّم باللون تبعك" },
      { sel: ".uipen", t: "🖊️ وضع القلم", b: "كبسة على هالزر: كل شي بتحدّدو بيتعلّم لحالو، بلا ما تكبس 🖍️. كبسة تانية بتوقّفو" },
      { sel: "", t: "🎨 اللون والممحاة", b: "النقطة الملوّنة حدّ 🖍️ بتغيّر اللون (بيضل محفوظ). كبسة على كلمة معلّمة ← 🧽 بتمحيها، أو 📝 بتزيد ملاحظة" },
      { sel: "", t: "📒 وين بلاقيهن؟", b: "كل يلّي علّمتو محفوظ بـ«🖍️ تعليماتي» بالقائمة، مرتّب حسب المادة والدرس، وفيك تراجعن من هونيك", link: ["highlights.html", "🖍️ افتح تعليماتي"] }
    ],
    sheet: [{ sel: ".nzsh .nzshx", t: "⚡ بتحلّ مكانك", b: "بس تخلص بيتعلّم ✅ بالمسار. ✕ أو «رجوع» بيرجّعك عالمسار بنفس المحل", z: 1 }],
    hifzi: [{ sel: "#due, .hfdue, main h1, main h2", t: "🔁 حفظي", b: "هون بتشوف شو حافظ وشو بدّو مراجعة. «لازم تراجع اليوم» = التكرار المتباعد: كل درس برجعلك بوقتو (١ ← ٣ ← ٧ ← ١٤ ← ٣٠ يوم) تا ما تنساه" }],
    mindmap: [{ sel: "", t: "🗺️ الخريطة الذهنية", b: "الدرس بالنص وأفكارو حواليه. كبسة على أي فرع بتطلعلك شرحو" }],
    hosp: [{ sel: "", t: "🏥 المستشفى", b: "مرضى بيوصلو والدور عليك: افحص، قرّر شو تعمل، وكل غلطة بتتعلّم منها — ما حدا بيتأذّى 😉" }],
    osman: [{ sel: "textarea, main input[type=\"text\"]", t: "👨‍🏫 الأستاذ عثمان", b: "اكتب سؤالك (أو احكي 🎤) — بيشرحلك من دروسك وبيسألك تتمرّن" }],
    highlights: [{ sel: "", t: "🖍️ تعليماتي", b: "كل يلّي علّمتو بالقلم هون، حسب المادة والدرس. فلتر باللون، كبسة بترجعك عالدرس، و🔁 للمراجعة" }]
  };
  function tourFor(pg, hash) {
    if (pg === "index.html") return "home";
    if (LPAGES[pg]) return "pen";
    if (pg === "hifzi.html") return "hifzi";
    if (pg === "mindmap.html") return "mindmap";
    if (pg === "games.html" && /^#(live|room)/.test(hash || "")) return "hosp";
    if (pg === "tutor.html") return "osman";
    if (pg === "highlights.html") return "highlights";
    return "";
  }

  // pure-ish (tested): the tour / tip this page shows now — "" when already seen (any day, any phone once synced) or inside the path sheet
  function due(pg, hash, isEmb) { if (isEmb === undefined ? emb() : isEmb) return ""; var id = tourFor(pg, hash); return id && !seen(id) ? id : ""; }
  function replayId(pg, hash) { var id = tourFor(pg, hash); return id && id !== "home" ? id : "home"; }

  /* ---------------- the coach mark ---------------- */
  var root = null, cur = null, idx = 0, onEnd = null, tgt = null;
  function vis(el) { if (!el || !el.getBoundingClientRect) return false; var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; var cs = w.getComputedStyle ? w.getComputedStyle(el) : null; return !cs || (cs.visibility !== "hidden" && cs.display !== "none"); }
  function find(sel) {
    if (!sel) return null;
    var parts = sel.split(/,\s*/);
    for (var i = 0; i < parts.length; i++) { var l = d.querySelectorAll(parts[i]); for (var j = 0; j < l.length; j++) if (vis(l[j])) return l[j]; }
    return null;
  }
  function fixedish(el) { for (var e = el; e && e !== d.body; e = e.parentElement) { var cs = w.getComputedStyle(e); if (cs && (cs.position === "fixed" || cs.position === "sticky")) return true; } return false; }
  function place() {
    if (!root) return;
    var hole = root.querySelector(".trhole"), bub = root.querySelector(".trbub"), vh = w.innerHeight, vw = w.innerWidth;
    var bw = Math.min(340, vw - 24); bub.style.width = bw + "px"; bub.style.left = Math.round((vw - bw) / 2) + "px";
    if (!tgt) { hole.style.display = "none"; root.classList.add("trdim"); bub.style.top = Math.max(12, Math.round((vh - bub.offsetHeight) / 2)) + "px"; return; }
    root.classList.remove("trdim");
    var r = tgt.getBoundingClientRect(), pad = 6, top = r.top - pad, hgt = Math.min(r.height + pad * 2, vh * 0.6);
    hole.style.display = ""; hole.style.top = Math.round(top) + "px"; hole.style.left = Math.round(Math.max(4, r.left - pad)) + "px";
    hole.style.width = Math.round(Math.min(vw - 8, r.width + pad * 2)) + "px"; hole.style.height = Math.round(hgt) + "px";
    var bh = bub.offsetHeight, below = top + hgt + 12, above = top - bh - 12;
    bub.style.top = Math.round(below + bh < vh - 8 ? below : above > 8 ? above : Math.max(8, vh - bh - 90)) + "px";
  }
  function scrollTo(el) {
    if (!el || fixedish(el)) return;
    var r = el.getBoundingClientRect(), vh = w.innerHeight;
    if (r.top > 70 && r.bottom < vh * 0.62) return;
    var y = (w.pageYOffset || d.documentElement.scrollTop || 0) + r.top - Math.round(vh * 0.22);
    try { w.scrollTo(0, Math.max(0, y)); } catch (e) {}
  }
  function show(i) {
    var steps = TOURS[cur]; idx = i;
    // skip steps whose target isn't on this page / screen (a centred bubble when the step has no target at all)
    while (idx < steps.length && steps[idx].sel && !find(steps[idx].sel)) idx++;
    if (idx >= steps.length) return end(true);
    var s = steps[idx], n = steps.length, last = idx === n - 1 || !steps.slice(idx + 1).some(function (x) { return !x.sel || find(x.sel); });
    tgt = find(s.sel); scrollTo(tgt);
    var bub = root.querySelector(".trbub");
    bub.innerHTML = '<p class="trt">' + esc(s.t) + (n > 1 ? '<small class="trn">' + (idx + 1) + "/" + n + "</small>" : "") + '</p><p class="trb">' + esc(s.b) + "</p>" +
      (s.link && page() !== s.link[0] ? '<p class="trl"><a href="' + esc(s.link[0]) + '">' + esc(s.link[1]) + "</a></p>" : "") +
      '<div class="trbtns">' + (last ? "" : '<button type="button" class="trskip">تخطّي</button>') +
      '<button type="button" class="trnext">' + (last ? "فهمت ✅" : "التالي ←") + "</button></div>";
    root.classList.toggle("trz", !!s.z);
    place(); setTimeout(place, 60); setTimeout(place, 450);
    var nx = bub.querySelector(".trnext"); try { nx.focus({ preventScroll: true }); } catch (e) {}
  }
  function onKey(e) { if (e.key === "Escape") end(true); }
  function start(id, cb, force) {
    if (!d || !d.body || emb() || !TOURS[id] || root) { if (cb) cb(false); return false; }
    if (!force && seen(id)) { if (cb) cb(false); return false; }
    cur = id; onEnd = cb || null;
    root = d.createElement("div"); root.className = "trov"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "كيف بستعمل"); root.setAttribute("data-nofr", "");
    root.innerHTML = '<div class="trhole" aria-hidden="true"></div><div class="trbub" aria-live="polite"></div>';
    d.body.appendChild(root); d.documentElement.classList.add("tron");
    root.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest && t.closest(".trskip")) { e.preventDefault(); return end(true); }
      if (t.closest && (t.closest(".trnext") || t.closest(".trhole"))) { e.preventDefault(); return show(idx + 1); }
      if (t.closest && t.closest(".trl a")) { end(true); return; }
    });
    w.addEventListener("resize", place); w.addEventListener("scroll", place, { passive: true } ); d.addEventListener("keydown", onKey);
    mark(id);                                        // seen the moment it shows: a reload, the next day or another phone never repeats it
    show(0); return true;
  }
  function end(done) {
    if (!root) return; var id = cur, cb = onEnd;
    w.removeEventListener("resize", place); w.removeEventListener("scroll", place, { passive: true }); d.removeEventListener("keydown", onKey);
    if (root.parentNode) root.parentNode.removeChild(root);
    root = null; cur = null; tgt = null; onEnd = null; d.documentElement.classList.remove("tron");
    if (id) mark(id);
    try { d.dispatchEvent(new CustomEvent("nursin:tour-end", { detail: { id: id } })); } catch (e) {}
    if (cb) cb(!!done);
  }
  function busy() { return !!d.querySelector(".obx,.gsheet,.srchbox,.thsheet,.hzsheet,.nzsh,.wncard,dialog[open]"); }

  /* ---------------- when: after sign-in settled (so another phone's «seen» counts), never over the welcome card ---------------- */
  function settled() { return pulled || (authSeen && !fbA()) || (w.NursinFB && w.NursinFB.user === null); }
  function whenFree(cb, maxMs) {
    var t0 = Date.now(), lim = maxMs || 300000;
    (function tick() {
      var el = Date.now() - t0;
      if (el > lim) return;
      if ((settled() || el > 3500) && !busy()) { if (fbA() && !pulled && el < 6000) { pull(); return setTimeout(tick, 400); } return cb(); }
      setTimeout(tick, el < 6000 ? 400 : 1500);
    })();
  }
  var pending = "";
  function boot() {
    if (emb()) return;
    addMenu();
    var pg = page(), hash = w.location.hash || "";
    if (pg === "index.html" && /^#tour$/.test(hash)) { try { history.replaceState(null, "", "index.html"); } catch (e) {} setTimeout(function () { replay(); }, 900); return; }
    var id = due(pg, hash);
    if (id) { pending = id; setTimeout(function () { whenFree(function () { pending = ""; start(id); }); }, 1200); }
    if (pg === "index.html" && !seen("sheet")) watchSheet();
  }
  // the 30g inline sheet: its tip the first time it opens (a one-off observer on <html>'s class, dropped once the tip showed)
  function watchSheet() {
    if (!w.MutationObserver) return;
    var mo = new MutationObserver(function () {
      if (d.documentElement.classList.contains("nzshon") && !root) { mo.disconnect(); setTimeout(function () { if (d.querySelector(".nzsh")) start("sheet"); }, 700); }
    });
    mo.observe(d.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
  function replay() {
    var pg = page(), id = replayId(pg, w.location.hash || "");
    if (root) end(false);
    if (id === "home" && pg !== "index.html") { w.location.href = "index.html#tour"; return; }
    start(id, null, true);                         // force: «❓ كيف بستعمل» shows it again even though it's seen
  }
  // «❓ كيف بستعمل» on the old ☰ menu too (desktop pages that still carry #nav); the «الكل» sheet has it in assets/ui.js
  function addMenu() {
    var ul = d.querySelector("#nav ul"); if (!ul || ul.querySelector(".trmenu")) return;
    var li = d.createElement("li"); li.className = "trmenu";
    li.innerHTML = '<a href="#howto" data-tour="replay"><span aria-hidden="true">❓</span> <bdi>كيف بستعمل</bdi> <small lang="fr" dir="ltr">Aide</small></a>';
    li.firstChild.addEventListener("click", function (e) { e.preventDefault(); replay(); });
    ul.appendChild(li);
  }

  w.NursinTour = { KEY: KEY, due: due, replayId: replayId, TOURS: TOURS, tourFor: tourFor, merge: merge, seen: seen, mark: mark, start: start, end: end, replay: replay, pull: pull, state: state,
    pending: function () { return pending || (root ? cur : ""); }, active: function () { return !!root; }, whenFree: whenFree, emb: emb, push: push };
  if (d && d.addEventListener && w.location) { if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot(); }
})(window, typeof document !== "undefined" ? document : null);
