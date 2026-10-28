/* 🔁 «التكرار المتباعد» — spaced repetition (Abdullah, Oct 28 2026 8:32 PM).
   Every question a student gets WRONG, or marks «😓 صعبة», comes back for review: after 1 day, then 3, then 7, then 14.
   A right answer on a due review moves it one step on (after the 14-day step it leaves the list); a wrong answer anywhere resets it
   to step 1 (tomorrow). Right answers before the due day change nothing. Only questions of the existing quiz bank (window.QUIZ ids).
   Saved per browser in localStorage nursin_srs_v1 {items:{qid:{s,d,m}}} (s = step 0–3, d = due Beirut day, m = last change ms);
   signed-in students also get a copy under their own users/{uid}/srs/main (assets/qstats.js, needs rules v15 — quietly skipped before).
   «🔁 مراجعة اليوم (N)» = the due items: a wide tile on the home page (assets/tiles.js) and a button on quiz.html (quiz.html?t=review). */
(function (w, d) {
  var K = "nursin_srs_v1", STEPS = [1, 3, 7, 14], MAX = 400;
  function today() {
    var N = w.Nursin; if (N && N.dayKey) try { return N.dayKey(); } catch (e) {}
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function addDays(day, n) { var t = new Date(day + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function load() { try { var x = JSON.parse(localStorage.getItem(K) || "null"); if (x && x.items && typeof x.items === "object") return x; } catch (e) {} return { items: {} }; }
  function save(x) {
    var ks = Object.keys(x.items);
    if (ks.length > MAX) ks.sort(function (a, b) { return x.items[a].m - x.items[b].m; }).slice(0, ks.length - MAX).forEach(function (k) { delete x.items[k]; });
    try { localStorage.setItem(K, JSON.stringify(x)); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:srs", { detail: { due: due(x).length } })); } catch (e) {}
  }
  // pure step: what happens to the store after an answer (tests call it through NursinSRS.step)
  function step(x, qid, ok, day, now, hard) {
    var it = x.items[qid];
    if (!ok || hard) { x.items[qid] = { s: 0, d: addDays(day, STEPS[0]), m: now }; return "again"; }
    if (!it) return "none";
    if (it.d > day) return "early";                       // not due yet: a right answer changes nothing
    if (it.s + 1 >= STEPS.length) { delete x.items[qid]; return "done"; }
    x.items[qid] = { s: it.s + 1, d: addDays(day, STEPS[it.s + 1]), m: now };
    return "next";
  }
  function due(x, day) { day = day || today(); return Object.keys(x.items).filter(function (k) { return x.items[k].d <= day; }); }
  function bank() { var m = {}; (w.QUIZ || []).forEach(function (q) { m[q.id] = q; }); return m; }
  function record(q, ok, hard) {
    if (!q || !q.id || !/^q\d{3}$/.test(q.id)) return "none";
    var x = load(), r = step(x, q.id, ok, today(), Date.now(), hard);
    if (r !== "none" && r !== "early") save(x);
    return r;
  }
  // merge a copy from the account: per question the newer change wins (deletions are not synced: a graduated item may come back once)
  function merge(remote) {
    var x = load(), ch = false;
    Object.keys(remote || {}).forEach(function (k) {
      var r = remote[k]; if (!/^q\d{3}$/.test(k) || !r || typeof r.d !== "string") return;
      var l = x.items[k]; if (!l || (r.m | 0) > (l.m | 0)) { x.items[k] = { s: Math.min(3, Math.max(0, r.s | 0)), d: r.d, m: r.m | 0 }; ch = true; }
    });
    if (ch) save(x);
    return ch;
  }
  w.NursinSRS = {
    STEPS: STEPS, key: K, step: step, addDays: addDays, today: today,
    record: function (q, ok) { return record(q, ok, false); },
    hard: function (q) { return record(q, false, true); },
    has: function (qid) { return !!load().items[qid]; },
    count: function () { var b = bank(), hasBank = !!w.QUIZ; return due(load()).filter(function (k) { return !hasBank || b[k]; }).length; },
    total: function () { return Object.keys(load().items).length; },
    questions: function () { var b = bank(); return due(load()).map(function (k) { return b[k]; }).filter(Boolean); },
    items: function () { return load().items; },
    merge: merge,
    add: function (qids) { var x = load(), day = today(), now = Date.now(), n = 0; (qids || []).forEach(function (k) { if (/^q\d{3}$/.test(k) && !x.items[k]) { x.items[k] = { s: 0, d: addDays(day, 1), m: now }; n++; } }); if (n) save(x); return n; }
  };
})(window, document);
