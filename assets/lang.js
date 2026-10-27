/* 🇫🇷 Language switch (Abdullah, Oct 27 2026 10:49–10:50 AM: "a student who studies everything in French can flip the whole site to
   French; one who studies French + Arabic keeps both"). Two modes, chosen per student, saved in localStorage nursin_lang_v1
   (and on the signed-in profile as users/{uid}.lang — rules v10 allow the owner to merge a field):
     ar (default) = the site exactly as it is: French terms + Lebanese Arabic explanations, RTL.
     fr           = «Français seulement»: <html lang="fr" dir="ltr" class="fr">, and French text from committed dictionaries
                    (assets/fr/*.js, translated once from his own notes — no live machine translation):
       • data banks (quiz, blanks, pharma, law/mgmt/quality lessons, ER sim, osman, lesson list) are patched in place the moment each
         data file runs (Lang.fix), so every renderer (quiz, games, exams, weak points, classes…) already gets French;
       • the page's static lesson blocks are swapped before any site script runs (ui.js + <page>.js are deferred from <head>);
       • UI text drawn later by scripts is translated as it appears (text nodes + placeholder/title/aria-label).
     Anything without a confident translation keeps the bilingual text (fallback by design).
   Keys: FNV-1a of the whitespace-normalised string (blocks: of the element's innerHTML). */
(function (w, d) {
  var K = "nursin_lang_v1", V = "20261027k", AR = /[\u0600-\u06FF]/;
  var mode = "ar"; try { mode = localStorage.getItem(K) === "fr" ? "fr" : "ar"; } catch (e) {}
  var page = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "") || "index";
  /* ⚖️ القانون stays Arabic ALWAYS (Abdullah, Oct 27 2:47 PM): the law page and a law-only quiz are drawn exactly as before (bilingual,
     RTL) even in «Français seulement»; elsewhere law items (quiz / blanks / lesson list) are never patched and LAWSET keeps the
     page translator off their text. */
  var LAWPAGE = page === "law" || (page === "quiz" && /(?:^|[?&])t=law(?:&|$)/.test(location.search || ""));
  var FR = mode === "fr" && !LAWPAGE, html = d.documentElement, LAWSET = {};
  // which data dictionaries each page needs (same order as its data scripts)
  var DATA = { index: ["quiz"], quiz: ["quiz", "blanks"], exams: ["quiz"], live: ["quiz"], classes: ["quiz"], friends: ["quiz"], tutor: ["quiz"],
    law: [], mgmt: ["quiz", "mgmt", "blanks"], quality: ["quiz", "quality", "blanks"], pharma: ["quiz", "pharma", "blanks"],
    games: ["quiz", "pharma", "blanks", "ersim"] };
  var PAGES = { index: 1, cardio: 1, neuro: 1, henderson: 1, quiz: 1, "3d": 1, about: 1, privacy: 1, credits: 1, "404": 1, friends: 1, exams: 1, live: 1, tutor: 1, classes: 1, law: 1, mgmt: 1, quality: 1, pharma: 1, games: 1, chat: 1, admin: 1 };
  var H = {}, U = {}, fre = null, on = false, miss = [];
  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function hash(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + "." + s.length.toString(36); }
  function digits(s) { return s.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }); }
  function look(s) {
    var n = norm(s), x; if (!n || LAWSET[n]) return null;
    if (U[n] != null) return U[n];
    if ((x = H[hash(n)]) != null) return x;
    if (/[0-9٠-٩]/.test(n)) {                    // same sentence with other numbers ("3 أسئلة" → "3 questions")
      var nums = [], t = n.replace(/[0-9٠-٩]+(?:[.,][0-9٠-٩]+)?/g, function (m) { nums.push(digits(m)); return "#"; });
      var y = U[t] != null ? U[t] : H[hash(t)];
      if (y != null && (y.match(/#/g) || []).length === nums.length) { var i = 0; return y.replace(/#/g, function () { return nums[i++]; }); }
    }
    return null;
  }
  // a text node still in Arabic after the exact lookup: swap the UI pieces it is built from (longest first)
  function frag(s) {
    if (!fre) { var ks = Object.keys(U).filter(function (k) { return k.length > 2 && AR.test(k) && k.indexOf("#") < 0 && !/^(ال|الـ|و|ب|ل|ع)$/.test(k); }).sort(function (a, b) { return b.length - a.length; });
      fre = ks.length ? new RegExp("(^|[^\u0600-\u06FF])(" + ks.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?![\u0600-\u06FF])", "g") : /$^/; }
    return s.replace(fre, function (m, a, k) { return a + U[k]; });
  }
  // little sentence rules for numbers glued by code: "3 من 10" → "3 sur 10", "20ث" → "20 s"
  function rules(s) { return s.replace(/(^|[\s\d)])من\s+([0-9٠-٩]+)/g, "$1sur $2").replace(/([0-9]+)\s?ث(?![\u0600-\u06FF])/g, "$1 s").replace(/([0-9]+)\s?د(?![\u0600-\u06FF])/g, "$1 min"); }
  function setText(t) {
    var v = t.nodeValue; if (!v || !AR.test(v) || LAWSET[norm(v)]) return;
    var x = look(v);
    if (x == null) { x = rules(frag(norm(v))); if (AR.test(x) && miss.length < 300 && miss.indexOf(norm(v)) < 0) miss.push(norm(v)); if (x === norm(v)) return; }
    var lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
    t.nodeValue = lead + x + tail;
  }
  var INL = { B: 1, I: 1, EM: 1, STRONG: 1, SPAN: 1, SMALL: 1, BDI: 1, BDO: 1, A: 1, BR: 1, SUP: 1, SUB: 1, CODE: 1, U: 1, MARK: 1, ABBR: 1, IMG: 1, KBD: 1, Q: 1, S: 1, WBR: 1, TIME: 1 };
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, TEMPLATE: 1, IFRAME: 1, CANVAS: 1, svg: 1, SVG: 1, INPUT: 1, SELECT: 1, OPTION: 0 };
  function inlineOnly(el) { for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (!INL[c.tagName] || !inlineOnly(c)) return false; return true; }
  function skip(el) { return SKIP[el.tagName] || (el.hasAttribute && el.hasAttribute("data-nofr")) || el.isContentEditable; }
  // the units both the build and the page use: top-most inline-only elements with Arabic in them, and loose Arabic text nodes
  function units(root, out) {
    out = out || { segs: [], texts: [] };
    if (root.nodeType === 3) { if (AR.test(root.nodeValue)) out.texts.push(root); return out; }
    if (root.nodeType !== 1 || skip(root) || !AR.test(root.textContent)) return out;
    if (inlineOnly(root) && root.firstChild) { out.segs.push(root); return out; }
    for (var c = root.firstChild; c; c = c.nextSibling) units(c, out);
    return out;
  }
  var ATTR = ["placeholder", "title", "aria-label", "alt"];
  function attrs(root) {
    if (root.nodeType !== 1) return;
    var list = root.querySelectorAll ? [root].concat([].slice.call(root.querySelectorAll("[placeholder],[title],[aria-label],[alt]"))) : [root];
    list.forEach(function (el) { ATTR.forEach(function (a) { var v = el.getAttribute && el.getAttribute(a); if (v && AR.test(v)) { var x = look(v); if (x == null) { x = rules(frag(norm(v))); if (x === norm(v)) return; } el.setAttribute(a, x); } }); });
  }
  function ltr(el) { if (el.getAttribute("dir") === "rtl" && !AR.test(el.textContent)) el.setAttribute("dir", "ltr"); }
  // safe = the static page before any site script ran (no listeners to lose); later only blocks without links/buttons are swapped whole
  function pass(root, safe) {
    var u = units(root);
    u.segs.forEach(function (el) {
      if (LAWSET[norm(el.textContent)]) return;           // a law question/option drawn by a renderer: stays Arabic
      var x = H[hash(norm(el.innerHTML))];
      if (x != null && (safe || !el.querySelector("a,button,input"))) { el.innerHTML = x; ltr(el); return; }
      var y = look(el.textContent);                       // a label built in code from one UI string ("الشريان الأبهر – Aorte")
      if (y != null && !el.querySelector("a,button,input,img")) { el.textContent = y; ltr(el); return; }
      var t = d.createTreeWalker(el, 4, null), n, ts = []; while ((n = t.nextNode())) ts.push(n);
      ts.forEach(setText); ltr(el);
    });
    u.texts.forEach(setText);
    attrs(root);
  }
  function start() {
    if (on || !FR) return; on = true;
    if (d.title && AR.test(d.title)) { var tt = look(d.title); if (tt) d.title = tt; }
    pass(d.body, true);
    var q = [], busy = false;
    function flush() { busy = false; var a = q; q = []; a.forEach(function (n) { if (n.isConnected) { if (n.nodeType === 3) { if (n.parentElement) pass(n.parentElement, false); } else pass(n, false); } }); }
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === "characterData") q.push(m.target);
        else if (m.type === "attributes") q.push(m.target);
        else for (var i = 0; i < m.addedNodes.length; i++) q.push(m.addedNodes[i]);
      });
      if (!busy && q.length) { busy = true; (w.queueMicrotask || setTimeout)(flush); }
    }).observe(d.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  // patch a data bank in place (strings only, by their hash); called at the end of each data file
  function lawKeep(o) {                                   // remember a law item's strings (≥ 12 chars, so short UI words stay free)
    (function walk(v) { if (typeof v === "string") { var n = norm(v); if (n.length >= 12 && AR.test(n)) LAWSET[n] = 1; } else if (v && typeof v === "object") for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) walk(v[k]); })(o);
  }
  function isLaw(o, k) { return k === "law" || (o && typeof o === "object" && !Array.isArray(o) && (o.t === "law" || o.s === "law")); }
  function fix(name) {
    if (!FR) return;
    var root = w[name]; if (!root) return;
    if (name === "LAW") { lawKeep(root); return; }
    (function walk(o) {
      if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) { if (isLaw(o[i])) { lawKeep(o[i]); continue; } if (typeof o[i] === "string") { var x = o[i] && AR.test(o[i]) ? H[hash(norm(o[i]))] : null; if (x != null) o[i] = x; } else if (o[i] && typeof o[i] === "object") walk(o[i]); } }
      else for (var k in o) { if (!Object.prototype.hasOwnProperty.call(o, k)) continue; var v = o[k]; if (isLaw(v, k)) { lawKeep(v); continue; } if (typeof v === "string") { var y = v && AR.test(v) ? H[hash(norm(v))] : null; if (y != null) o[k] = y; } else if (v && typeof v === "object") walk(v); }
    })(root);
  }
  function set(m, noReload) {
    m = m === "fr" ? "fr" : "ar";
    try { localStorage.setItem(K, m); } catch (e) {}
    var A = w.NursinFB; if (A && A.user && A.fs && A.db) { try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { lang: m }, { merge: true }).catch(function () {}); } catch (e) {} }
    if (!noReload && m !== mode) location.reload();
  }
  var L = w.Lang = { mode: mode, fr: FR, lawPage: LAWPAGE, isLawText: function (s) { return !!LAWSET[norm(s)]; }, KEY: K, page: page, hash: hash, norm: norm, units: units, look: look,
    add: function (o, ui) { var k; if (ui) { for (k in o) U[k] = o[k]; fre = null; } else for (k in o) H[k] = o[k]; },
    has: function (s) { return look(s) != null; },
    t: function (ar, fr) { return FR && fr ? fr : ar; },
    fix: fix, set: set, start: start, pass: pass, miss: miss, size: function () { return [Object.keys(H).length, Object.keys(U).length]; } };
  // a student who chose on another device (signed in) gets the same mode here, unless he picked on this device
  d.addEventListener("nursin:auth", function (e) {
    var A = w.NursinFB, mine = null; try { mine = localStorage.getItem(K); } catch (x) {}
    if (mine || !(e.detail && e.detail.signedIn) || !A || !A.fs || !A.user) return;
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) { var v = s.exists() && s.data().lang; if (v === "fr" || v === "ar") set(v); }, function () {});
  });
  if (FR) {
    html.setAttribute("lang", "fr"); html.setAttribute("dir", "ltr"); html.classList.add("fr");
    var src = function (f) { return '<script src="assets/fr/' + f + '.js?v=' + V + '" defer><\/script>'; };
    var list = ["ui"].concat(DATA[page] || []);
    if (PAGES[page]) list.push("p-" + page);
    if (!d.body) list.forEach(function (f) { d.write(src(f)); });
    d.addEventListener("DOMContentLoaded", start);    // fallback; p-<page>.js starts it before the site's own scripts
  }
})(window, document);
