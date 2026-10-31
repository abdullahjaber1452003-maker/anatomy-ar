/* 📌 «وظيفة» — homework reminder (Abdullah, Oct 31 2026 11:57 PM: «ذكّر الطلاب ضمن المسار بوظيفة المس / الـ devoir»).
   The admin adds a homework on admin.html («📌 زيد وظيفة»: what, subject, due date, optional note) → Firestore homework/{id}
   {title, subj, due 'YYYY-MM-DD', note, at, by} — read by any signed-in student, written only by the admin (rules v20). Every student sees
   ONE step per homework in «مسار اليوم» (assets/home.js) — «📌 وظيفة: … (التسليم <date>)» — until the due date has passed, with a
   «سلّمتها ✅» tick of his own (localStorage nursin_hwdone_v1, mirrored on users/{uid}.hwDone — the owner may merge a field, no rule).
   Until rules v20 are published the read is refused → an empty list → no step, no error. */
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
  function list() { var x = lsGet(K); return x && Array.isArray(x.list) ? x.list : []; }
  function doneMap() { var x = lsGet(DK); return x && typeof x === "object" ? x : {}; }
  function isDone(id) { return !!doneMap()[id]; }
  function open(day, all) {                                // homework not past its due date (and not handed in, unless all)
    day = day || today(); var dn = doneMap();
    return list().filter(function (h) { return h && h.id && h.due >= day && (all || !dn[h.id]); }).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
  }
  function fire() { try { d.dispatchEvent(new CustomEvent("nursin:hw")); } catch (e) {} }
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  var pt = 0;
  function push() { clearTimeout(pt); pt = setTimeout(function () { var A = fbA(); if (!A) return; try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { hwDone: doneMap() }, { merge: true }).catch(function () {}); } catch (e) {} }, 2000); }
  function tick(id, on) { var x = doneMap(); if (on) x[id] = Date.now(); else delete x[id]; lsSet(DK, x); push(); fire(); }
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
  w.NursinHW = { KEY: K, DKEY: DK, clean: clean, list: list, open: open, isDone: isDone, tick: tick, fetch: fetch, pull: pull };
  if (!d || !d.addEventListener) return;
  d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) { fetch(); setTimeout(pull, 1500); } else { lsSet(K, { at: Date.now(), list: [] }); fire(); } });
  setTimeout(function () { if (fbA()) { fetch(); pull(); } }, 2500);          // Firebase was already up before this file ran
  setInterval(function () { if (!d.hidden) fetch(); }, 30 * 60e3);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
