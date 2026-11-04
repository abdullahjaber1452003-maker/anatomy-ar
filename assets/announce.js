/* nursin 📢 announcements: the owner's message on every page — a dismissible banner at the top + a 🔔 in the header with a dot when unread.
   One small public read of announcements/current over Firestore REST (no Firebase SDK), cached 5 min per tab; silent when the doc or the rules are missing. */
(function () {
  var P = "projects/nursin-5aaa0/databases/(default)/documents";
  var API = "https://firestore.googleapis.com/v1/" + P + ":batchGet?key=AIzaSyARPvtXJ_STkWrP8dpZcE9BqwMxEOW1WQs";
  var SEEN = "nursin_ann_seen_v1", CACHE = "nursin_ann_v1", TTL = 5 * 60e3, FAIL_TTL = 30 * 60e3;
  var ann = null, bell = null;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function unread() { return !!(ann && ann.at > (+ls(SEEN) || 0)); }
  function mark() { if (bell) bell.classList.toggle("on", unread()); }
  function draw(force) {
    var old = document.getElementById("annbar"); if (old) old.remove();
    mark();
    var main = document.getElementById("main") || document.querySelector("main");
    if (!main || (!force && !unread())) return;
    var b = document.createElement("div"); b.id = "annbar"; b.className = "annbar"; b.setAttribute("role", "status");
    var t = document.createElement("p"), x = document.createElement("button");
    t.textContent = ann ? "📢 " + ann.text : "🔔 ما في إعلانات هلّق.";
    x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", "سكّر الإعلان");
    x.addEventListener("click", function () { if (ann) ls(SEEN, String(ann.at)); b.remove(); mark(); });
    b.appendChild(t); b.appendChild(x); main.prepend(b);
  }
  function got(a) { ann = a && a.text ? a : null; draw(false); }
  function load(fresh) {
    var c = null; try { c = JSON.parse(sessionStorage.getItem(CACHE) || "null"); } catch (e) {}
    if (!fresh && c && Date.now() - c.t < (c.fail ? FAIL_TTL : TTL)) return got(c.a);
    var save = function (a, fail) { try { sessionStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), a: a, fail: !!fail })); } catch (e) {} got(a); };
    if (!window.fetch) return;
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documents: [P + "/announcements/current"] }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        var f = j && j[0] && j[0].found && j[0].found.fields, a = null;
        if (f && f.text && f.text.stringValue) a = { text: String(f.text.stringValue).slice(0, 500), at: Date.parse((f.createdAt || {}).timestampValue) || 1 };
        save(a);
      })
      .catch(function () { save(null, true); });
  }
  function init() {
    var bar = document.querySelector(".topbar .bar");
    if (bar && !document.querySelector(".annbell")) {
      bell = document.createElement("button"); bell.type = "button"; bell.className = "annbell"; bell.setAttribute("aria-label", "الإعلانات");
      bell.innerHTML = '<span aria-hidden="true">🔔</span><span class="dot"></span>';
      bell.addEventListener("click", function () { var o = document.getElementById("annbar"); if (o) { o.remove(); return; } draw(true); window.scrollTo(0, 0); });
      bar.insertBefore(bell, bar.querySelector(".menu-btn"));
    }
    load(false);
  }
  window.NursinAnn = { refresh: function () { load(true); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

/* 🚑 29d (Abdullah, Nov 4 2026 7:18 AM «ويتم إرسال إشعار إنه مثلاً إجت سيارة إسعاف»): on ANY page of the site, the moment an ambulance reaches
   the hospital (the same deterministic schedule as the hospital itself — assets/livecase.js LiveDept.ambTimes, copied between the markers;
   a test keeps both identical) a toast «🚑 وصلت سيارة إسعاف!» with «🏃 روح استقبلو» → games.html#live; once per ambulance per phone, only in
   the first 15 min, never while the hospital room is open (it has its own siren). + ⏰ a reassessment of his that is due (assets/livecare.js,
   nursin_care_v1) → «🔔 حان وقت تقييم المريض X». Nothing is read from the network for this. */
(function () {
  /* ==amb-core== */
  var NursinAmb = (function () {
    var AMB_FROM = 10 * 60, AMB_TO = 23 * 60, AMB_GAP = 90, MIN = 6e4, FMT = null;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function bOff(ms) {
      if (!FMT) FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Beirut", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      var p = {}; FMT.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute) - Math.floor(ms / 6e4) * 6e4) / 6e4);
    }
    function dayKey(ms) { var d = new Date(ms + bOff(ms) * 6e4); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
    function dayStart(key) { var p = String(key).split("-"), u = Date.UTC(+p[0], +p[1] - 1, +p[2]); return u - bOff(u - bOff(u) * 6e4) * 6e4; }
    function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function ambTimes(key) {
      var r = rng(hash("amb-" + key)), c = r() < 0.5 ? 2 : 3, slack = AMB_TO - AMB_FROM - AMB_GAP * (c - 1), offs = [], t0 = dayStart(key);
      for (var i = 0; i < c; i++) offs.push(Math.floor(r() * (slack + 1)));
      offs.sort(function (a, b) { return a - b; });
      return offs.map(function (o, i) { return t0 + (AMB_FROM + o + AMB_GAP * i) * MIN; });
    }
    // the ambulance to announce at «now» (arrived ≤ 15 min ago) → { id: "YYYY-MM-DD#i", t } or null
    function fresh(now, win) { var key = dayKey(now), T = ambTimes(key), o = null; win = win || 15 * MIN;
      for (var i = 0; i < T.length; i++) if (T[i] <= now && now - T[i] <= win) o = { id: key + "#" + (i + 1), t: T[i], i: i + 1 }; return o; }
    return { ambTimes: ambTimes, dayKey: dayKey, dayStart: dayStart, fresh: fresh };
  })();
  /* ==/amb-core== */
  window.NursinAmb = NursinAmb;
  var SEENK = "nursin_ambtoast_v1", CAREK = "nursin_care_v1", CTK = "nursin_caretoast_v1";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function fr() { return !!(window.Lang && window.Lang.fr) || ls("nursin_lang_v1") === "fr"; }
  function roomOpen() { return document.documentElement.classList.contains("lcr-open"); }
  var CSS = ".nhtoast{position:fixed;left:10px;right:10px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9990;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px; background:rgba(255,255,255,.97);border:1px solid rgba(220,38,38,.35);box-shadow:0 10px 30px rgba(15,23,42,.22); color:#0f172a;transform:translateY(140%);opacity:0;transition:transform .35s ease,opacity .35s ease;max-width:520px;margin:0 auto} .nhtoast.on{transform:none;opacity:1} .nhti{font-size:26px;line-height:1;animation:nhtB 1s ease-in-out infinite} .nhtt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px} .nhtt b{font-size:14px}.nhtt small{font-size:12px;opacity:.8} .nhtgo{flex:0 0 auto;padding:7px 11px;border-radius:12px;background:#dc2626;color:#fff !important;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap} .nhtx{flex:0 0 auto;border:0;background:transparent;font-size:16px;color:inherit;opacity:.6;cursor:pointer;padding:4px} #nhfu{border-color:rgba(14,165,233,.45)}#nhfu .nhtgo{background:#0284c7} html[data-theme=\"night\"] .nhtoast{background:rgba(15,23,42,.88);color:#e2e8f0} @keyframes nhtB{0%,100%{transform:none}50%{transform:translateX(-3px)}} @media (prefers-reduced-motion:reduce){.nhti{animation:none}.nhtoast{transition:none}}";
  function style() { if (document.getElementById("nhtcss")) return; var s = document.createElement("style"); s.id = "nhtcss"; s.textContent = CSS; document.head.appendChild(s); }
  function toast(id, ic, title, sub, go) {
    if (document.getElementById(id)) return; style();
    var el = document.createElement("div"); el.id = id; el.className = "nhtoast"; el.setAttribute("role", "status"); el.setAttribute("data-nofr", "");
    el.innerHTML = '<span class="nhti" aria-hidden="true">' + ic + '</span><span class="nhtt"><b></b><small></small></span><a class="nhtgo" href="games.html#live"></a><button type="button" class="nhtx" aria-label="✕">✕</button>';
    el.querySelector("b").textContent = title; el.querySelector("small").textContent = sub; el.querySelector(".nhtgo").textContent = go;
    el.querySelector(".nhtx").addEventListener("click", function () { el.remove(); });
    el.querySelector(".nhtgo").addEventListener("click", function () { el.remove(); if (/games\.html/.test(location.pathname) && window.LiveRoom) { try { window.LiveRoom.open(); } catch (e) {} } });
    document.body.appendChild(el); setTimeout(function () { el.classList.add("on"); }, 30);
    setTimeout(function () { el.classList.remove("on"); setTimeout(function () { el.remove(); }, 400); }, 20000);
    if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate([120, 80, 120]); } catch (e) {}
  }
  function check() {
    if (document.hidden || roomOpen()) return; var now = Date.now(), F = fr();
    var a = NursinAmb.fresh(now);
    if (a && ls(SEENK) !== a.id) { ls(SEENK, a.id);
      toast("nhamb", "🚑", F ? "🚑 Une ambulance arrive à l'hôpital !" : "🚑 وصلت سيارة إسعاف عالمستشفى!", F ? "Un nouveau patient attend à l'entrée des urgences — le premier infirmier le reçoit" : "مريض جديد ناطر عباب الطوارئ — أوّل ممرّض بيستقبلو", F ? "🏃 Le recevoir" : "🏃 روح استقبلو"); return; }
    var S = null; try { S = JSON.parse(ls(CAREK) || "null"); } catch (e) { S = null; } if (!S || !S.fu) return;
    var done = {}; try { done = JSON.parse(ls(CTK) || "{}") || {}; } catch (e) { done = {}; }
    var f = S.fu.filter(function (x) { return x && x.s !== "ok" && x.s !== "miss" && now >= x.due - 5 * 6e4 && now <= x.due + 15 * 6e4 && !done[x.id]; })[0];
    if (f) { done[f.id] = now; for (var k in done) if (now - done[k] > 2 * 864e5) delete done[k]; ls(CTK, JSON.stringify(done));
      var n = String(f.nm || "").split(" ")[0];
      toast("nhfu", "🔔", F ? "🔔 C'est l'heure de réévaluer " + n : "🔔 حان وقت تقييم المريض " + n, F ? "Traitement donné il y a " + Math.round((now - f.at) / 6e4) + " min — TA, pouls, effet" : "أخد دواه من " + Math.round((now - f.at) / 6e4) + " دقيقة — الضغط والنبض ومفعول الدوا", F ? "🏃 Y aller" : "🏃 روح عندو"); }
  }
  function start() { setTimeout(check, 2500); setInterval(check, 30000); document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(check, 800); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
