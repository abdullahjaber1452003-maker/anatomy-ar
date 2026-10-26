/* 📚 سجلّ الدروس — lesson registry (Abdullah, Oct 26 2026 7:41 PM: "when new lessons are added, the weekly exams should update by
   themselves, and on the day it's added (or the next day) the site should ask the student to go over it and read it").
   Loaded on EVERY page, right before assets/account.js, so the weekly exams (account.js examsFor) and ✅ أهدافك اليوم (goals.js)
   see the same list everywhere — including pages that don't load the question bank.

   ➕ HOW TO ADD A NEW LESSON (any مادة):
     1. Write the lesson on its page and its questions in assets/quiz-data.js as usual (QTOP / QGROUPS / QLES; questions carry
        "t" = topic and, on subjects with QLES, "l" = lesson key).
     2. Add ONE line to NLESSONS.list below, with added: 'YYYY-MM-DD' = the day it goes live (Beirut day), e.g.
          { s: "law", t: "law", l: "l3", n: "اسم الدرس", href: "law.html#l3", added: "2026-11-02" },
        s = مادة key (QGROUPS key), t = the questions' "t", l = the questions' "l" (only on subjects with QLES), href = the lesson's
        anchor on its page (cardio/neuro: #<topic>; law/mgmt/quality: #<lesson>; pharma: #g-<group>).
     3. That's all:
        • ✅ أهدافك اليوم shows «📖 درس جديد: <name> — مرّ عليه واقرأه» on that day and the next (2 days). It ticks ✅ when the student
          reads it (about a minute on the open lesson, or scrolling through it to the end) or finishes its lesson quiz.
        • 📅 the weekly exams pick it up by themselves from the NEXT day (a lesson in a new topic gets into the rotation; a lesson of
          a subject that already has its exam adds its questions to that exam). Today's exams never change mid-day.
     Older lessons have no "added" (or an old date), so they never show as new. tests/site.test.js checks that every topic in
     QGROUPS and every lesson in QLES has a line here — a lesson missing from this list fails the tests. */
(function (w, d) {
  var R = w.NLESSONS = {
    subjects: {
      cardio: { ar: "القلب", fr: "Cardiologie", page: "cardio.html" },
      neuro: { ar: "الأعصاب", fr: "Neurologie", page: "neuro.html" },
      henderson: { ar: "Henderson", fr: "Henderson", page: "henderson.html" },
      law: { ar: "القانون", fr: "L\u00e9gislation", page: "law.html" },
      mgmt: { ar: "الإدارة", fr: "Management", page: "mgmt.html" },
      quality: { ar: "الجودة والاعتماد", fr: "Qualit\u00e9 & accr\u00e9ditation", page: "quality.html" },
      pharma: { ar: "الأدوية", fr: "Pharmacologie", page: "pharma.html" }
    },
    list: [
    { s: "cardio", t: "heart", n: "القلب: التشريح", href: "cardio.html#heart" },
    { s: "cardio", t: "infarctus", n: "Infarctus (جلطة قلبية)", href: "cardio.html#infarctus" },
    { s: "cardio", t: "angor", n: "Angor (ذبحة)", href: "cardio.html#angor" },
    { s: "cardio", t: "ecg", n: "ECG (تخطيط القلب)", href: "cardio.html#ecg" },
    { s: "cardio", t: "pericarde", n: "Péricarde / Tamponnade", href: "cardio.html#pericarde" },
    { s: "cardio", t: "endomyo", n: "Endocardite / Myocardite", href: "cardio.html#endomyo" },
    { s: "cardio", t: "pacemaker", n: "Pacemaker / ICD", href: "cardio.html#pacemaker" },
    { s: "cardio", t: "embolie", n: "Embolie artérielle", href: "cardio.html#embolie" },
    { s: "cardio", t: "choc", n: "Choc cardiogénique", href: "cardio.html#choc" },
    { s: "cardio", t: "ic", n: "Insuffisance cardiaque", href: "cardio.html#ic" },
    { s: "cardio", t: "arythmies", n: "Arythmies", href: "cardio.html#arythmies" },
    { s: "cardio", t: "chirurgie", n: "Chirurgie cardiaque", href: "cardio.html#chirurgie" },
    { s: "neuro", t: "brain", n: "الدماغ والعمود", href: "neuro.html#brain" },
    { s: "neuro", t: "evaluation", n: "Évaluation (التقييم)", href: "neuro.html#evaluation" },
    { s: "neuro", t: "examens", n: "الفحوصات العصبية", href: "neuro.html#examens" },
    { s: "neuro", t: "laminectomie", n: "Laminectomie", href: "neuro.html#laminectomie" },
    { s: "neuro", t: "craniotomie", n: "Craniotomie", href: "neuro.html#craniotomie" },
    { s: "neuro", t: "avc", n: "AVC (جلطة دماغية)", href: "neuro.html#avc" },
    { s: "neuro", t: "htic", n: "HTIC", href: "neuro.html#htic" },
    { s: "neuro", t: "glasgow", n: "Glasgow", href: "neuro.html#glasgow" },
    { s: "henderson", t: "henderson", l: "h1", n: "الحاجات ١–٧", href: "henderson.html" },
    { s: "henderson", t: "henderson", l: "h2", n: "الحاجات ٨–١٤", href: "henderson.html" },
    { s: "law", t: "law", l: "l1", n: "القانون التطبيقي: تصنيفات التمريض", href: "law.html#l1" },
    { s: "law", t: "law", l: "l2", n: "أنواع الشهادات التمريضية المهنية في لبنان", href: "law.html#l2", added: "2026-10-26" },
    { s: "mgmt", t: "mgmt", l: "m1", n: "الدوافع وهرم Maslow", href: "mgmt.html#m1", added: "2026-10-26" },
    { s: "mgmt", t: "mgmt", l: "m2", n: "الهيكل التنظيمي للمستشفى", href: "mgmt.html#m2", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q1", n: "مفاهيم الجودة", href: "quality.html#q1", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q2", n: "الأساليب والأدوات لتحسين الجودة", href: "quality.html#q2", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q3", n: "خطة تحسين الجودة", href: "quality.html#q3", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q4", n: "مؤشرات الأداء بهدف تحسين الجودة", href: "quality.html#q4", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q5", n: "السياسات والإجراءات في المؤسسات الصحية", href: "quality.html#q5", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q6", n: "الوصف الوظيفي والمسؤوليات", href: "quality.html#q6", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q7", n: "إدارة المخاطر وسلامة المريض", href: "quality.html#q7", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q8", n: "الاعتماد ومعاييره", href: "quality.html#q8", added: "2026-10-26" },
    { s: "quality", t: "quality", l: "q9", n: "الملف الطبي", href: "quality.html#q9", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "cardio", n: "القلب والضغط", href: "pharma.html#g-cardio", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "coag", n: "مضادات التخثر ومذيبات الجلطات", href: "pharma.html#g-coag", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "atb", n: "المضادات الحيوية", href: "pharma.html#g-atb", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "pain", n: "المسكنات ومضادات الالتهاب", href: "pharma.html#g-pain", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "resp", n: "الجهاز التنفسي", href: "pharma.html#g-resp", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "dig", n: "الجهاز الهضمي", href: "pharma.html#g-dig", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "cort", n: "الكورتيزون", href: "pharma.html#g-cort", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "diab", n: "السكري", href: "pharma.html#g-diab", added: "2026-10-26" },
    { s: "pharma", t: "pharma", l: "other", n: "غيرها", href: "pharma.html#g-other", added: "2026-10-26" }
    ]
  };
  var RK = "nursin_read_v1";
  function dk() { var n = w.Nursin; return n && n.dayKey ? n.dayKey() : new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10); }
  function addDays(k, n) { var t = new Date(k + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function key(x) { return x.s + ":" + (x.l || x.t); }
  // lessons that count as new on day `day`: added that day or the day before
  function fresh(day) { day = day || dk(); var y = addDays(day, -1); return R.list.filter(function (x) { return x.added && (x.added === day || x.added === y); }); }
  function readMap() { try { var o = JSON.parse(localStorage.getItem(RK) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function isRead(x, m) { return !!(m || readMap())[key(x)]; }
  function markRead(x) {
    var m = readMap(), k = key(x); if (m[k]) return; m[k] = Date.now();
    try { localStorage.setItem(RK, JSON.stringify(m)); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:lesson-read", { detail: { k: k } })); } catch (e) {}
  }
  /* the 📖 goal rows (pure — tests run it): one row per new lesson; several lessons of one مادة added the same day = one row
     with a «قريت X من N» count that links to the next one to read, ✅ when all are read */
  function goals(day, m) {
    day = day || dk(); m = m || {}; var by = {}, order = [], out = [];
    fresh(day).forEach(function (x) { var g = x.s + "|" + x.added; if (!by[g]) { by[g] = []; order.push(g); } by[g].push(x); });
    order.forEach(function (g) {
      var a = by[g], S = R.subjects[a[0].s] || {}, when = a[0].added === day ? "انضاف اليوم" : "انضاف مبارح", rd = a.filter(function (x) { return !!m[key(x)]; });
      if (a.length === 1) return out.push({ k: "new:" + key(a[0]), e: "📖", n: "درس جديد: " + a[0].n + " — مرّ عليه واقرأه", s: (S.ar ? S.ar + " · " : "") + when, href: a[0].href, done: rd.length === 1 });
      var next = a.filter(function (x) { return !m[key(x)]; })[0];
      out.push({ k: "new:" + a[0].s + ":" + a[0].added, e: "📖", n: "دروس جديدة: " + (S.ar || a[0].s) + " (" + a.length + ") — مرّ عليهن واقرأهن", s: "قريت " + rd.length + " من " + a.length + (next ? " · الجاي: " + next.n : "") + " · " + when, href: next ? next.href : a[0].href, done: !next });
    });
    return out;
  }
  w.NursinLessons = { list: R.list, subjects: R.subjects, fresh: fresh, goals: goals, key: key, isRead: isRead, markRead: markRead, readMap: readMap, KEY: RK };
  if (!d || !d.addEventListener) return;

  /* 📖 reading tracker: only on a page that has a new lesson today/yesterday. Read = ~60 s with the (open) lesson on screen,
     or its top and its end both seen with ≥15 s on it. */
  function here(x) { var p = x.href.split("#")[0], path = location.pathname.split("/").pop() || "index.html"; return p === path; }
  function track() {
    var mine = fresh().filter(function (x) { return here(x) && x.href.indexOf("#") > 0 && !isRead(x); }); if (!mine.length) return;
    var st = mine.map(function () { return { sec: 0, top: false, end: false }; }), t = setInterval(function () {
      if (d.visibilityState && d.visibilityState !== "visible") return;
      var left = 0, H = w.innerHeight || 700;
      mine.forEach(function (x, i) {
        if (isRead(x)) return; left++;
        var el = d.getElementById(x.href.split("#")[1]); if (!el || (el.tagName === "DETAILS" && !el.open)) return;
        var r = el.getBoundingClientRect(); if (!(r.bottom > 60 && r.top < H - 60) || r.height < 40) return;
        var s = st[i]; s.sec++; if (r.top > -120 && r.top < H) s.top = true; if (r.bottom > 0 && r.bottom <= H) s.end = true;
        if (s.sec >= 60 || (s.top && s.end && s.sec >= 15)) markRead(x);
      });
      if (!left) clearInterval(t);
    }, 1000);
  }
  // finishing the lesson's own quiz counts as read too (quiz.js sends set = topic / subject and les = lesson)
  d.addEventListener("nursin:quiz-done", function (e) {
    var x = e.detail || {}; if (!x.set || x.exam || x.challenge) return;
    R.list.forEach(function (l) { if (l.l ? (l.t === x.set && l.l === x.les) : (l.t === x.set && !x.les)) markRead(l); });
  });
  // a goal link like law.html#l2: the law / mgmt / quality / pharma lessons are drawn by script after app.js looked at the hash,
  // so open + scroll to the lesson once it exists (tries for ~4 s)
  function openHash() {
    var id = decodeURIComponent((location.hash || "").slice(1)); if (!id) return; var n = 0;
    (function go() { var el = d.getElementById(id); if (el) { if (el.tagName === "DETAILS" && !el.open) { el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 60); } return; } if (++n < 20) setTimeout(go, 200); })();
  }
  function boot() { openHash(); track(); }
  w.addEventListener("hashchange", openHash);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
