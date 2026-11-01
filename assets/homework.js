/* 📌 «وظيفة» — homework reminder (Abdullah, Oct 31 2026 11:57 PM: «ذكّر الطلاب ضمن المسار بوظيفة المس / الـ devoir»).
   The admin adds a homework on admin.html («📌 زيد وظيفة»: what, subject, due date, optional note) → Firestore homework/{id}
   {title, subj, due 'YYYY-MM-DD', note, at, by} — read by any signed-in student, written only by the admin (rules v20). Every student sees
   ONE step per homework in «مسار اليوم» (assets/home.js) — «📌 وظيفة: … (التسليم <date>)» — until the due date has passed, with a
   «سلّمتها ✅» tick of his own (localStorage nursin_hwdone_v1, mirrored on users/{uid}.hwDone — the owner may merge a field, no rule).
   Until rules v20 are published the read is refused → an empty list → no step, no error.
   Nov 1 2026 (20261028m): + built-in homework (assets/homework-static.js) for everyone, merged + deduped with the admin's; homework.html
   («📌 الوظائف») = the list / one homework with its questions + the teacher's photo (drawn here when #hw-app exists). */
(function (w, d) {
  "use strict";
  var K = "nursin_hw_v1", DK = "nursin_hwdone_v1", MAXT = 120, MAXN = 300;
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); } }
  function cut(s, n) { return Array.from(String(s == null ? "" : s)).slice(0, n).join(""); }
  function clean(id, x) {                                  // pure (tests): a Firestore doc → a homework, or null
    if (!id || !x || typeof x !== "object") return null;
    var t = cut(String(x.title || "").trim(), MAXT), due = String(x.due || "");
    if (!t || !/^\d{4}-\d\d-\d\d$/.test(due)) return null;
    return { id: cut(id, 40), title: t, subj: cut(String(x.subj || ""), 20), due: due, note: cut(String(x.note || "").trim(), MAXN) };
  }
  function fsList() { var x = lsGet(K); return x && Array.isArray(x.list) ? x.list : []; }
  /* Nov 1 2026 (20261028m): built-in homework (assets/homework-static.js, window.NURSIN_HW_STATIC) shows for EVERY student, no Firestore
     needed. Merged with the admin's list: a Firestore one with the same id, or the same due date and a title that is the same / holds one
     of the built-in's `match` words, is the SAME homework → only the built-in shows (it has the questions) and either tick counts (ids). */
  function nt(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\u0600-\u06ff]+/g, " ").trim(); }
  function statics() {
    var S = w.NURSIN_HW_STATIC; if (!Array.isArray(S)) return [];
    var out = []; S.forEach(function (x) { var c = x && clean(x.id, x); if (!c) return;
      c.st = 1; c.ids = [c.id]; c.match = (Array.isArray(x.match) ? x.match : []).map(nt).filter(Boolean); out.push(c); });
    return out;
  }
  function same(s, f) {                                    // pure (tests): is Firestore homework f the built-in s?
    if (!s || !f) return false; if (s.id === f.id) return true; if (s.due !== f.due) return false;
    var a = nt(s.title), b = nt(f.title); if (a && a === b) return true;
    return (s.match || []).some(function (m) { return m && b.indexOf(m) > -1; });
  }
  function merge(st, fl) {                                 // pure (tests): built-ins first, then the admin's that are not duplicates
    var out = st.map(function (s) { return Object.assign({}, s, { ids: (s.ids || [s.id]).slice() }); });
    (fl || []).forEach(function (f) { if (!f || !f.id) return; var hit = null;
      out.forEach(function (s) { if (!hit && s.st && same(s, f)) hit = s; });
      if (hit) { if (hit.ids.indexOf(f.id) < 0) hit.ids.push(f.id); } else out.push(f); });
    return out;
  }
  function list() { return merge(statics(), fsList()); }
  function get(id) { var L = list(); for (var i = 0; i < L.length; i++) if (L[i].id === id || (L[i].ids || []).indexOf(id) > -1) return L[i]; return null; }
  function raw(id) { var S = w.NURSIN_HW_STATIC; if (Array.isArray(S)) for (var i = 0; i < S.length; i++) if (S[i] && S[i].id === id) return S[i]; return null; }
  function doneMap() { var x = lsGet(DK); return x && typeof x === "object" ? x : {}; }
  function isDone(id) { var dn = doneMap(); if (dn[id]) return true; var h = get(id); return !!(h && (h.ids || []).some(function (k) { return dn[k]; })); }
  function open(day, all) {                                // homework not past its due date (and not handed in, unless all)
    day = day || today(); var dn = doneMap();
    return list().filter(function (h) { return h && h.id && h.due >= day && (all || !(h.ids || [h.id]).some(function (k) { return dn[k]; })); }).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
  }
  function fire() { try { d.dispatchEvent(new CustomEvent("nursin:hw")); } catch (e) {} }
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() { clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { hwDone: doneMap() }, { merge: true }).catch(function () {}); } catch (e) {} }, 2000); }
  function tick(id, on) { var x = doneMap(), h = get(id); if (on) x[id] = Date.now(); else { delete x[id]; if (h) (h.ids || []).forEach(function (k) { delete x[k]; }); } lsSet(DK, x); push(); fire(); }
  function fetch() {
    var A = fbA(); if (!A) return Promise.resolve(list());
    var p;
    try { p = A.fs.getDocs(A.fs.collection(A.db, "homework")); } catch (e) { return Promise.resolve(list()); }
    return p.then(function (s) {
      var out = []; s.forEach(function (doc) { var c = clean(doc.id, doc.data()); if (c) out.push(c); });
      lsSet(K, { at: Date.now(), list: out.slice(0, 30) }); fire(); return out;
    }, function (e) { lsSet(K, { at: Date.now(), list: [], err: String((e && e.code) || "err") }); fire(); return []; });   // rules v20 not published yet: nothing shows
  }
  function pull() {
    var A = fbA(); if (!A) return;
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) {
      var r = s.exists() ? s.data().hwDone : null, x = doneMap(), ch = false, k;
      if (r && typeof r === "object") for (k in r) if (!x[k] && /^[\w-]{1,40}$/.test(k)) { x[k] = +r[k] || Date.now(); ch = true; }
      if (ch) { lsSet(DK, x); fire(); }
    }, function () {});
  }

  /* 📌 homework.html («📌 الوظائف», Nov 1 2026): the list of current homework (built-in + the admin's) and, with ?id=, one homework with
     its questions typed out + the teacher's photo (tap → the diagram zoom viewer). Arabic + French chrome; the case text stays as written. */
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(a, f) { return FR() && f ? f : a; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dueTxt(day) {                                   // «الجمعة 6/11» / «ven. 6/11»
    if (!/^\d{4}-\d\d-\d\d$/.test(day || "")) return String(day || ""); var dt = new Date(day + "T12:00:00Z");
    return T(["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][dt.getUTCDay()], ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][dt.getUTCDay()]) + " " + dt.getUTCDate() + "/" + (dt.getUTCMonth() + 1);
  }
  function daysLeft(day, now) { return Math.round((Date.parse(day + "T12:00:00Z") - Date.parse((now || today()) + "T12:00:00Z")) / 864e5); }
  function leftTxt(n) { return n < 0 ? T("⏰ خلص التسليم", "⏰ Date dépassée") : n === 0 ? T("🔥 التسليم اليوم", "🔥 À rendre aujourd'hui") : n === 1 ? T("⏳ التسليم بكرا", "⏳ À rendre demain") : T("⏳ باقي " + n + " أيام", "⏳ Encore " + n + " jours"); }
  function subjName(k) { var S = ((w.NLESSONS || {}).subjects || {})[k]; var E = { rea: "🚑", medsurg: "🏥", cardio: "🫀", neuro: "🧠", geri: "👴", comm: "🏘️", pharma: "💊", law: "⚖️", mgmt: "🏢", quality: "✅", henderson: "🧩" }[k] || "📚";
    return S ? E + " " + T(S.ar, S.fr || S.ar) : k ? "📚 " + k : ""; }
  function ttl(t) { return "<bdi>" + esc(t).replace(/\([^()]{1,40}\)/g, function (m) { return '<span class="hwnw">' + m + "</span>"; }) + "</bdi>"; }   // mixed fr/ar title: isolated, «(…)» never split across lines
  function tickBtn(h) { var on = isDone(h.id);
    return '<button type="button" class="btn sm hwok' + (on ? " on" : "") + '" data-hwtick="' + esc(h.id) + '" aria-pressed="' + on + '">' + (on ? T("✅ سلّمتها", "✅ Rendu") : T("سلّمتها ✅", "Je l'ai rendu ✅")) + "</button>"; }
  /* 🧑‍🏫 Nov 1 2026 (28m, Abdullah 5:29 PM): Osman explains the homework + its lesson, the student tries, Osman corrects (tutor.html?hw=<id>) */
  function osmBtn(h, big) { return '<a class="btn sm hwosm' + (big ? " big" : "") + '" href="tutor.html?hw=' + encodeURIComponent(h.id) + '">' + T("🧑‍🏫 اشرحلي مع عثمان", "🧑‍🏫 Explique-moi avec Osman") + "</a>"; }
  function meta(h) { var n = daysLeft(h.due);
    return '<p class="hwmeta"><span class="hwdue">📅 ' + esc(T("التسليم ", "À rendre ") + dueTxt(h.due)) + '</span><span class="hwleft' + (n <= 1 ? " soon" : "") + '">' + esc(leftTxt(n)) + "</span>" + (h.subj ? '<span class="hwsub">' + esc(subjName(h.subj)) + "</span>" : "") + "</p>"; }
  function noteOf(h, R) { var t = R && FR() && R.notefr ? R.notefr : h.note; return t ? '<p class="hwnote">' + esc(t) + "</p>" : ""; }
  function card(h) {
    var R = raw(h.id), q = R && R.cases ? R.cases.reduce(function (a, c) { return a + (c.q || []).length; }, 0) : 0;
    return '<li class="qcard hwcard' + (isDone(h.id) ? " done" : "") + '"><a class="hwopen" href="homework.html?id=' + encodeURIComponent(h.id) + '"><b class="hwt">📌 ' + ttl(h.title) + "</b>" + meta(h) + noteOf(h, R) +
      (R && R.cases ? '<span class="hwmore">📄 ' + esc(T("افتح الأسئلة", "Voir les questions")) + (R.img ? " + 📷 " + esc(T("صورة الورقة", "la feuille")) : "") + "</span>" : "") + "</a>" + '<span class="hwbtns">' + osmBtn(h) + tickBtn(h) + "</span></li>";
  }
  function listView(app) {
    var L = open(today(), true);
    app.innerHTML = '<div class="qcard hwhero"><h1>📌 ' + esc(T("الوظائف", "Les devoirs")) + "</h1><p class=\"small\">" + esc(T("وظايف الصف يلي لازم تتسلّم، مع الأسئلة وصورة الورقة. علّم «سلّمتها ✅» بس تخلص.", "Les devoirs de la classe à rendre, avec les questions et la photo de la feuille. Coche « Je l'ai rendu ✅ » quand c'est fait.")) + "</p></div>" +
      (L.length ? '<ul class="hwlist">' + L.map(card).join("") + "</ul>" : '<div class="qcard"><p class="hwempty">' + esc(T("ما في وظايف هلّق 🎉", "Aucun devoir pour l'instant 🎉")) + "</p></div>");
  }
  function oneView(app, h) {
    var R = raw(h.id), body = "";
    if (R && R.cases) {
      body += (R.head ? '<h2 class="hwhead" dir="ltr" lang="fr">' + esc(R.head) + "</h2>" : "") + R.cases.map(function (c) {
        return '<section class="hwcase" dir="rtl" lang="ar"><h3>🩺 ' + esc(c.n) + (FR() && c.nfr ? ' <small dir="ltr">' + esc(c.nfr) + "</small>" : "") + "</h3>" +
          '<div class="hwlines">' + (c.lines || []).map(function (l) { return '<p dir="' + (/[\u0600-\u06ff]/.test(l) ? "rtl" : "ltr") + '">' + esc(l).replace(/\(؟\)/g, '<span class="hwq" title="' + esc(T("كلمة مش واضحة بالورقة", "Mot pas clair sur la feuille")) + '">(؟)</span>') + "</p>"; }).join("") + "</div>" +
          '<div class="hwqs"><b>❓ ' + esc(T("السؤال", "Question")) + "</b>" + (c.q || []).map(function (q) { return '<p dir="rtl">' + esc(q) + "</p>"; }).join("") + "</div></section>";
      }).join("");
      if (/\(؟\)/.test(JSON.stringify(R.cases))) body += '<p class="small hwqnote">' + esc(T("(؟) = كلمة مش واضحة منيح بالصورة، شيكها عالورقة.", "(؟) = mot pas bien lisible sur la photo, vérifie sur la feuille.")) + "</p>";
    } else body += '<p class="small">' + esc(T("الأستاذ ما حطّ الأسئلة هون، شوف ورقة الصف.", "Les questions ne sont pas ici : regarde la feuille de la classe.")) + "</p>";
    var im = R && R.img;
    app.innerHTML = '<p class="hwback"><a class="btn sm" href="homework.html">' + esc(T("→ كل الوظائف", "← Tous les devoirs")) + "</a></p>" +
      '<article class="qcard hwone"><h1 class="hwt">📌 ' + ttl(h.title) + "</h1>" + meta(h) + noteOf(h, R) + '<div class="hwact">' + osmBtn(h, 1) + tickBtn(h) + (im ? '<a class="btn sm hwph" href="#hwphoto">📷 ' + esc(T("صورة الورقة", "La feuille")) + "</a>" : "") + "</div>" + body + "</article>" +
      (im ? '<figure class="qcard hwfig" id="hwphoto"><button type="button" class="hwimg" data-hwzoom aria-label="' + esc(T("كبّر الصورة: ", "Agrandir la photo : ") + T(im.ar, im.fr)) + '"><img src="' + esc(im.src) + '" alt="' + esc(T(im.alt || im.ar, im.altfr || im.fr)) + '" width="' + (im.w | 0) + '" height="' + (im.h | 0) + '" decoding="async"><span class="hwzb" aria-hidden="true">🔍</span></button><figcaption>📷 ' + esc(T(im.ar, im.fr)) + " · " + esc(T("اكبس عالصورة لتكبّرها", "Touche la photo pour l'agrandir")) + "</figcaption></figure>" : "");
  }
  function param(n) { var m = (location.search || "").match(new RegExp("[?&]" + n + "=([^&]+)")); try { return m ? decodeURIComponent(m[1]) : ""; } catch (e) { return ""; } }
  function pageDraw() {
    var app = d.getElementById("hw-app"); if (!app) return;
    app.setAttribute("data-nofr", ""); app.setAttribute("dir", FR() ? "ltr" : "rtl");
    var id = param("id") || (location.hash || "").slice(1), h = id ? get(id) : null;
    if (h) oneView(app, h); else listView(app);
    [].forEach.call(app.children, function (c) { c.setAttribute("data-nofr", ""); });   // before lang.js's observer runs: our own T() French, the case text stays as written
  }
  function pageBoot() {
    var app = d.getElementById("hw-app"); if (!app) return;
    pageDraw();
    app.addEventListener("click", function (e) {
      var t = e.target, b;
      if (t.closest && (b = t.closest("[data-hwtick]"))) { e.preventDefault(); var id = b.getAttribute("data-hwtick"); tick(id, !isDone(id)); return; }
      if (t.closest && (b = t.closest("[data-hwzoom]"))) {
        var h = get(param("id") || (location.hash || "").slice(1)), R = h && raw(h.id), im = R && R.img; if (!im) return;
        var DGV = w.NursinDiagrams;
        if (DGV && DGV.open) DGV.open({ id: "hw-" + R.id, url: im.src, w: im.w, h: im.h, ar: im.ar, fr: im.fr, alt: im.alt || im.ar, altfr: im.altfr || im.fr }, b);
        else w.open(im.src, "_blank");
      }
    });
    d.addEventListener("nursin:hw", pageDraw);
  }
  w.NursinHW = { KEY: K, DKEY: DK, clean: clean, list: list, open: open, isDone: isDone, tick: tick, fetch: fetch, pull: pull, get: get, raw: raw, statics: statics, same: same, merge: merge, fsList: fsList, page: pageDraw };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", pageBoot); else setTimeout(pageBoot, 0);
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) { fetch(); setTimeout(pull, 1500); } else { lsSet(K, { at: Date.now(), list: [] }); fire(); } });
  setTimeout(function () { if (fbA()) { fetch(); pull(); } }, 2500);          // Firebase was already up before this file ran
  setInterval(function () { if (!d.hidden) fetch(); }, 30 * 60e3);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
