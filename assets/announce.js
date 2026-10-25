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
