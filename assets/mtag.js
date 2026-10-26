/* nursin 💸 Monetag In-Page Push, light (Oct 26 2026, Abdullah: "more revenue, but light annoyance").
   Injects Monetag's own tag (zone 12128353, nap5k.com/tag.min.js — exactly as his dashboard gave it) only when ALL hold:
   - a content page (index, cardio, neuro, henderson, law, mgmt, quality, pharma, 3d, about, credits, friends) —
     never quiz / exams / live / tutor / chat / classes / admin / privacy / 404;
   - 20 s after the page loaded, and no welcome / class-code card (.obx), sign-in lock card (.glk-card) or ad gate on screen;
   - at most once every 4 minutes and 6 times a day per browser (localStorage).
   No popunder, no onclick, no multitag, no push notifications, no service worker. */
(function (w, d) {
  "use strict";
  var PAGES = ["index", "cardio", "neuro", "henderson", "law", "mgmt", "quality", "pharma", "3d", "about", "credits", "friends"];
  var KEY = "nursin_mtag_v1", DELAY = 20000, GAP = 4 * 60 * 1000, DAY_MAX = 6;
  var BLOCK = ".obx, .glk-card, .glk-adgate, .gate3d";

  function pageName(path) {
    var p = String(path || "").split("?")[0].split("#")[0].replace(/\/+$/, "/");
    var f = p.slice(p.lastIndexOf("/") + 1).replace(/\.html?$/i, "");
    return f || "index";
  }
  function pageOk(path) { return PAGES.indexOf(pageName(path)) > -1; }
  function dayOf(t) { var x = new Date(t); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  function capOk(s, now) {
    s = s || {};
    if (s.last && now - s.last < GAP && now >= s.last) return false;
    if (s.day === dayOf(now) && (s.n | 0) >= DAY_MAX) return false;
    return true;
  }
  function capMark(s, now) {
    s = s || {}; var day = dayOf(now);
    return { last: now, day: day, n: (s.day === day ? (s.n | 0) : 0) + 1 };
  }
  function read() { try { return JSON.parse(w.localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function write(s) { try { w.localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function cardOnScreen() {
    var els = d.querySelectorAll(BLOCK), vh = w.innerHeight || 0, vw = w.innerWidth || 0;
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect ? els[i].getBoundingClientRect() : null;
      if (!r || r.width <= 0 || r.height <= 0) continue;
      if (r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw) return true;
    }
    return false;
  }
  function inject() {
    /* Monetag's tag, verbatim from his dashboard (zone 12128353) */
    (function(s){s.dataset.zone='12128353',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
  }
  function fire() {
    if (d.hidden) { d.addEventListener("visibilitychange", function on() { if (!d.hidden) { d.removeEventListener("visibilitychange", on); fire(); } }); return; }
    if (cardOnScreen()) return;                                  // a card is up: skip this page view
    var now = Date.now(), s = read();
    if (!capOk(s, now)) return;
    if (!write(capMark(s, now))) return;                          // no storage = no cap = no ad
    inject();
  }
  function start() {
    if (!pageOk(w.location && w.location.pathname)) return;
    var go = function () { setTimeout(fire, DELAY); };
    if (d.readyState === "complete") go(); else w.addEventListener("load", go, { once: true });
  }
  w.NursinMtag = { pageOk: pageOk, pageName: pageName, capOk: capOk, capMark: capMark, KEY: KEY, GAP: GAP, DAY_MAX: DAY_MAX, DELAY: DELAY };
  try { start(); } catch (e) {}
})(window, document);
