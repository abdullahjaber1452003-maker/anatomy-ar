/* 🎨 «المظهر» (Abdullah, Oct 28 6:28 AM + 6:36 AM: «يختار اللون… يغير الشكل»، «ما تكون بس ألوان… كأنه متل theme»): every student picks a
   whole THEME — background, cards, corners, header and type, not only an accent. Saved on this device (localStorage nursin_theme_v1 {t}),
   applied here in <head> before the first paint (<html data-theme="…">, no flash); every colour is a CSS variable in assets/style.css
   (html[data-theme=…] blocks; the dark one also re-maps the fixed light colours). The picker opens from «🎨 المظهر» in the ☰ menu on
   every page (assets/nav.js «المزيد»). It never touches the ads. */
(function (w, d) {
  var K = "nursin_theme_v1", html = d.documentElement;
  var THEMES = [
    { id: "classic", e: "🩺", n: "كلاسيك", s: "الأخضر الأساسي تبع الموقع", hd: "#0f766e", bg: "#f6f8fa", card: "#ffffff", ink: "#1d2a33", pri: "#0f766e" },
    { id: "night", e: "🌙", n: "ليلي", s: "غامق ومريح للعيون بالليل", hd: "#0f1d24", bg: "#0d1318", card: "#161f26", ink: "#e4ebf0", pri: "#5fd6c6" },
    { id: "rose", e: "🌸", n: "وردي", s: "زهري ناعم وزوايا مدوّرة", hd: "#be185d", bg: "#fff5f8", card: "#ffffff", ink: "#3b1d2a", pri: "#be185d" },
    { id: "nature", e: "🌿", n: "طبيعة", s: "أخضر هادي وخلفية فاتحة", hd: "#3f7d3a", bg: "#f3f7f0", card: "#fbfdf9", ink: "#1f2d1f", pri: "#3f7d3a" },
    { id: "violet", e: "✨", n: "بنفسجي", s: "بنفسجي مع هيدر متدرّج", hd: "#7c3aed", bg: "#f7f5ff", card: "#ffffff", ink: "#241b3a", pri: "#6d28d9" },
    { id: "minimal", e: "⚪", n: "بسيط", s: "أبيض وأسود، واضح كتير", hd: "#111111", bg: "#ffffff", card: "#ffffff", ink: "#0a0a0a", pri: "#18181b" }
  ];
  var IDS = THEMES.map(function (t) { return t.id; });
  function valid(t) { return IDS.indexOf(t) >= 0; }
  function get() { try { var o = JSON.parse(localStorage.getItem(K) || "null"); if (o && valid(o.t)) return o.t; } catch (e) {} return "classic"; }
  function byId(t) { return THEMES[Math.max(0, IDS.indexOf(t))]; }
  function apply(t) {
    if (!valid(t)) t = "classic";
    if (t === "classic") html.removeAttribute("data-theme"); else html.setAttribute("data-theme", t);
    var m = d.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", byId(t).hd);
  }
  function set(t) { if (!valid(t)) return; try { localStorage.setItem(K, JSON.stringify({ t: t, at: Date.now() })); } catch (e) {} apply(t); fill(); try { d.dispatchEvent(new CustomEvent("nursin:theme", { detail: { t: t } })); } catch (e) {} }
  apply(get());   // ← before the first paint (this file is loaded synchronously in <head>)
  w.addEventListener("storage", function (e) { if (e.key === K) apply(get()); });   // another tab changed it

  /* ---- the picker ---- */
  var sheet = null, scrim = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function card(t, cur) {
    return '<button type="button" class="thc' + (t.id === cur ? " on" : "") + '" data-theme-pick="' + t.id + '" aria-pressed="' + (t.id === cur) + '">' +
      '<span class="thp" data-prev="' + t.id + '" aria-hidden="true"><i class="thph"></i><i class="thpc"><i></i><i></i><b></b></i></span>' +
      '<span class="thn"><b>' + t.e + " " + esc(t.n) + "</b><small>" + esc(t.s) + "</small></span>" + (t.id === cur ? '<span class="thok" aria-hidden="true">✓</span>' : "") + "</button>";
  }
  function fill() {
    if (!sheet) return; var cur = get();
    sheet.querySelector(".thgrid").innerHTML = THEMES.map(function (t) { return card(t, cur); }).join("");
  }
  function close() { if (sheet) sheet.remove(); if (scrim) scrim.remove(); sheet = scrim = null; }
  function open() {
    if (sheet) { close(); return; }
    try { if (w.NursinNav && w.NursinNav.close) w.NursinNav.close(); } catch (e) {}
    scrim = d.createElement("div"); scrim.className = "gscrim"; scrim.addEventListener("click", close);
    sheet = d.createElement("div"); sheet.className = "gsheet thsheet"; sheet.id = "thsheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", "المظهر");
    sheet.innerHTML = '<div class="gsh"><b>🎨 المظهر</b><button class="gx" type="button" aria-label="سكّر">✕</button></div>' +
      '<p class="small thnote">اختار الشكل اللي بيريحك. بيضل محفوظ على هالجهاز وبيتطبّق على كل الصفحات.</p><div class="thgrid"></div>';
    d.body.appendChild(scrim); d.body.appendChild(sheet); fill();
    sheet.querySelector(".gx").addEventListener("click", close);
    sheet.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-theme-pick]"); if (b) set(b.getAttribute("data-theme-pick")); });
    var f = sheet.querySelector(".thc.on") || sheet.querySelector(".thc"); if (f) f.focus();
  }
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet) close(); });
  d.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-theme-open]"); if (b) { e.preventDefault(); open(); } });
  w.NursinTheme = { THEMES: THEMES, get: get, set: set, apply: apply, open: open, close: close, KEY: K };
})(window, document);
