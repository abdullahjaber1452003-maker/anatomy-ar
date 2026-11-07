/* 🆕 «شو الجديد» (Abdullah, Nov 7 2026 1:31 PM: «فيك دايماً تبعت إنت لحالك إشعار عند تحديث بعض الميزات أو إضافة دروس»; 1:32 PM: «ويروح
   الإعلان من بعد ما يشوفو الطالب»). The list is assets/whatsnew-data.js (window.NURSIN_WHATSNEW, newest first).
   • On any page, when there are entries this student hasn't seen: ONE small card listing them (✕ / «تمام»). Seen = he closed it, tapped a
     link, or it stayed on screen 4 s — then it never comes back, on any phone (seen ids: localStorage nursin_onb_v1 .w + users/{uid}.onb.w,
     assets/tour.js keeps the store). Waits for the ❓ tour / the welcome card / an open sheet to finish first; never inside ?embed=1; no ads.
   • A brand-new student (no trace of an earlier visit on this phone or his account) starts with every existing entry seen — no flood.
   • «جديد» badge on a lesson (its links + its title on its page) for 7 days after its added: 'YYYY-MM-DD' in assets/lessons.js.
   • «🆕 شو الجديد» in the «الكل» menu (assets/ui.js) opens the latest entries again. */
(function (w, d) {
  "use strict";
  var MAXN = 6, NEWDAYS = 7, SHOWN_MS = 4000;
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function list() { var l = w.NURSIN_WHATSNEW; return l && l.length ? l : []; }
  function today() {
    var N = w.Nursin; if (N && N.dayKey) try { var k = N.dayKey(); if (/^\d{4}-\d\d-\d\d$/.test(k)) return k; } catch (e) {}
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10);
  }
  function diff(a, b) { return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5); }

  /* ---------------- pure (tested) ---------------- */
  function unseen(entries, seenMap) { seenMap = seenMap || {}; return (entries || []).filter(function (e) { return e && e.id && !seenMap[e.id]; }).slice(0, MAXN); }
  function isNew(added, day) { if (!added || !/^\d{4}-\d\d-\d\d$/.test(added)) return false; var n = diff(day || today(), added); return n >= 0 && n < NEWDAYS; }
  function newLessons(lessons, day) { return (lessons || []).filter(function (l) { return l && l.href && isNew(l.added, day); }); }
  // a trace of an earlier visit on this phone (read as this file loads, before today's page writes anything of its own)
  var TRACE = ["nursin_hl_v1", "nursin_read_v1", "nursin_ret_v1", "nursin_study_v1", "nursin_notes_v1", "nursin_weak_v1", "nursin_lastact_v1", "nursin_onboard_v1", "nursin_goals_v1", "nursin_srs_v1"];
  function returning(get, day) {
    for (var i = 0; i < TRACE.length; i++) if (get(TRACE[i]) != null) return true;
    var p = null; try { p = JSON.parse(get("nursin_path_v1") || "null"); } catch (e) {}
    return !!(p && p.d && p.d < day);
  }
  // "" = decided before on this phone; "new" = a brand-new student (mark every entry seen, show nothing); "old" = show what he hasn't seen
  function firstRun(st, here) { st = st || {}; if (st.fresh) return ""; return here || st.old || Object.keys(st.w || {}).length > 0 ? "old" : "new"; }
  var wasHere = false;
  try { wasHere = returning(function (k) { return w.localStorage.getItem(k); }, today()); } catch (e) {}

  /* ---------------- the card ---------------- */
  var card = null, shownT = 0;
  function Tour() { return w.NursinTour || null; }
  function markAll(entries) { var Tr = Tour(); if (!Tr) return; (entries || []).forEach(function (e) { Tr.mark(e.id, "w"); }); }
  function close(entries) { clearTimeout(shownT); if (entries) markAll(entries); if (card && card.parentNode) card.parentNode.removeChild(card); card = null; }
  function open(force) {
    if (card || !d || !d.body) return false;
    var Tr = Tour(), st = Tr ? Tr.state() : { w: {} }, items = force ? list().slice(0, MAXN) : unseen(list(), st.w);
    if (!items.length) return false;
    card = d.createElement("section"); card.className = "wncard"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "شو الجديد"); card.setAttribute("data-nofr", "");
    card.innerHTML = '<div class="wnh"><b>🆕 شو الجديد</b><button type="button" class="wnx" aria-label="سكّر">✕</button></div><ul class="wnl">' +
      items.map(function (e) { return "<li>" + esc(e.text) + (e.link ? ' <a href="' + esc(e.link) + '">شوف ←</a>' : "") + "</li>"; }).join("") +
      '</ul><button type="button" class="wnok">تمام 👍</button>';
    d.body.appendChild(card);
    card.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest && (t.closest(".wnx") || t.closest(".wnok"))) { e.preventDefault(); return close(items); }
      if (t.closest && t.closest("a")) { markAll(items); var a = t.closest("a"), h = a.getAttribute("href") || ""; if (/^index\.html#/.test(h) && /index\.html$|\/$/.test(w.location.pathname)) { e.preventDefault(); close(); w.location.hash = h.split("#")[1]; } }
    });
    shownT = setTimeout(function () { markAll(items); }, SHOWN_MS);   // «بس يشوفو» — on screen a few seconds = seen, it won't come back
    return true;
  }

  /* ---------------- «جديد» badges ---------------- */
  function page() { try { return (w.location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html"; } catch (e) { return "index.html"; } }
  function badge(el) {
    if (!el || el.querySelector(".wnnew") || (el.closest && el.closest("#path,.trov,.wncard,#nav,.hznav,.nzsh"))) return;
    var host = el.tagName === "SUMMARY" ? (el.querySelector("h2,h3,b,strong") || el) : el;
    var s = d.createElement("span"); s.className = "wnnew"; s.textContent = "جديد"; s.setAttribute("data-nohl", ""); host.appendChild(s);
  }
  function badges() {
    if (!d || !d.querySelectorAll) return 0;
    var L = newLessons((w.NLESSONS && w.NLESSONS.list) || [], today()), pg = page(), n = 0;
    L.forEach(function (l) {
      var href = l.href, i = href.indexOf("#"), lp = i > -1 ? href.slice(0, i) : href, an = i > -1 ? href.slice(i + 1) : "";
      var els = [].slice.call(d.querySelectorAll('a[href="' + href + '"]'));
      if (lp === pg && an) { els = els.concat([].slice.call(d.querySelectorAll('a[href="#' + an + '"]'))); var sec = d.getElementById(an); if (sec && sec.tagName === "DETAILS" && sec.querySelector("summary")) els.push(sec.querySelector("summary")); }
      els.forEach(function (e) { badge(e); n++; });
    });
    return n;
  }

  function boot() {
    var Tr = Tour(); if (!Tr || Tr.emb()) return;
    badges(); setTimeout(badges, 1500); setTimeout(badges, 4000);
    w.addEventListener("hashchange", function () { setTimeout(badges, 300); });
    Tr.whenFree(function wait() {
      if (Tr.pending() || Tr.active()) { setTimeout(function () { Tr.whenFree(wait); }, 1500); return; }
      var st = Tr.state();
      var fr = firstRun(st, wasHere);
      if (fr) {                                            // first time this phone runs 30i: new student → everything so far is already «seen»
        try { var s2 = Tr.state(); s2.fresh = fr; w.localStorage.setItem(Tr.KEY, JSON.stringify(s2)); } catch (e) {}
        if (fr === "new") { markAll(list()); return; }
      }
      open(false);
    });
  }
  w.NursinWN = { firstRun: firstRun, unseen: unseen, isNew: isNew, newLessons: newLessons, returning: returning, open: open, close: close, badges: badges, NEWDAYS: NEWDAYS };
  if (d && d.addEventListener && w.location) { if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 1500); }); else setTimeout(boot, 1500); }
})(window, typeof document !== "undefined" ? document : null);
