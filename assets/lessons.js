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
  /* ✂️ smaller lessons (Abdullah, Oct 27 2:39 PM: "long lessons with many sections put too much pressure on the student — split them,
     same content, more lessons is fine"). A long lesson is shown as parts «… — الجزء 1 / 2 / 3», each about one short reading
     (~1,500 letters). Nothing is added or removed: the page draws the lesson as before, then NursinLessons.splitPage() cuts its
     body into consecutive <details> at the child indices below (same structure in 🇫🇷, checked by the tests). Part 1 keeps the old
     anchor (cardio.html#infarctus), the next parts are #infarctus-p2, #infarctus-p3… The lesson quiz stays after the last part.
     SPLIT key = subject:lesson → index of the first child (of the lesson body; pharma: of its drug cards) of parts 2, 3, … */
  var SPLIT = {"cardio:heart": [7], "cardio:infarctus": [11], "cardio:endomyo": [12], "cardio:ic": [7], "neuro:evaluation": [6], "neuro:examens": [10, 17], "neuro:avc": [13], "quality:q1": [39], "quality:q2": [23, 60, 86, 119, 135], "quality:q3": [33, 70, 83, 100], "quality:q4": [34], "quality:q5": [24, 67], "quality:q6": [12, 32, 70], "quality:q7": [21, 37], "quality:q8": [23, 43, 58, 71, 88], "quality:q9": [23], "law:l1": [8, 24], "pharma:cardio": [4, 8], "pharma:atb": [4, 8], "pharma:pain": [4], "pharma:resp": [2], "pharma:dig": [4]};
  var RK = "nursin_read_v1", PK = "nursin_daylesson_v1";
  function dk() { var n = w.Nursin; return n && n.dayKey ? n.dayKey() : new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10); }
  function addDays(k, n) { var t = new Date(k + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function key(x) { return base(x) + (x.p ? "#" + x.p : ""); }
  function anchor(x) { return x.href.split("#")[1] || ""; }
  // the reading units: every lesson, a split one as its parts (R.list itself stays whole — the weekly exams read it)
  var P = R.parts = [];
  R.list.forEach(function (x) {
    var st = SPLIT[base(x)], a = anchor(x);
    if (!st || !a) return P.push(x);
    for (var i = 0; i <= st.length; i++) {
      var y = {}, k; for (k in x) y[k] = x[k];
      y.p = i + 1; y.of = st.length + 1; y.href = x.href.split("#")[0] + "#" + a + (i ? "-p" + (i + 1) : ""); P.push(y);
    }
  });
  function frOn(x) { return !!(w.Lang && w.Lang.fr && (!x || x.s !== "law")); }      // ⚖️ law stays Arabic
  function partWord(x) { return frOn(x) ? "Partie" : "الجزء"; }
  function label(x) { return x.n + (x.p ? " — " + partWord(x) + " " + x.p : ""); }
  // lessons that count as new on day `day`: added that day or the day before
  function fresh(day) { day = day || dk(); var y = addDays(day, -1); return R.list.filter(function (x) { return x.added && (x.added === day || x.added === y); }); }
  function readMap() { try { var o = JSON.parse(localStorage.getItem(RK) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  // a part is read when it was read itself, or when the whole lesson was read before it was split (old ✅ keep counting)
  function isRead(x, m) { m = m || readMap(); return !!(m[key(x)] || (x.p && m[base(x)])); }
  function markRead(x) {
    var m = readMap(), k = key(x); if (isRead(x, m)) return; m[k] = Date.now();
    try { localStorage.setItem(RK, JSON.stringify(m)); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:lesson-read", { detail: { k: k } })); } catch (e) {}
    rdPush();
  }
  /* 🎯 ONE small lesson a day in «أهداف اليوم» (Oct 27 2:38–2:42 PM: not all the new lessons at once). Today's lesson = the next
     unread part of a subject: the subject the student picked in the sheet («📖 درس اليوم من»), else the subjects in turn (one
     subject per day, skipping a subject with nothing left). It is fixed for the day once chosen (read → ✅, no second lesson), and
     the same on every device (synced goal rows: the done / smallest key wins). Pure part (tests run it): pick(day, readMap, subj). */
  function subjOrder() { return Object.keys(R.subjects); }
  function nextIn(s, m) { for (var i = 0; i < P.length; i++) if (P[i].s === s && !isRead(P[i], m)) return P[i]; return null; }
  function pick(day, m, subj) {
    day = day || dk(); m = m || {};
    if (subj && subj !== "all" && R.subjects[subj]) { var y = nextIn(subj, m); if (y) return y; }
    var S = subjOrder(), n = S.length, at = Math.floor(Date.parse(day + "T12:00:00Z") / 864e5) % n;
    for (var i = 0; i < n; i++) { var z = nextIn(S[(at + i) % n], m); if (z) return z; }
    return null;
  }
  function byKey(k) { for (var i = 0; i < P.length; i++) if (key(P[i]) === k) return P[i]; return null; }
  function prefs() { try { var o = JSON.parse(localStorage.getItem(PK) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function savePrefs(o) { try { localStorage.setItem(PK, JSON.stringify(o)); } catch (e) {} }
  function subject(s) { if (s === undefined) return prefs().subj || "all"; var o = prefs(); o.subj = s; if (o.d === dk() && o.k) { var x = byKey(o.k); if (x && !isRead(x) && s !== "all" && x.s !== s) delete o.k; } savePrefs(o); }
  // today's lesson; `seen` = lesson keys already on the synced goal list (another device chose one) and which of them are done
  function today(seen, doneMap) {
    var day = dk(), o = prefs(), m = readMap(), c = [], k;
    if (o.d === day && o.k && byKey(o.k)) c.push(o.k);
    (seen || []).forEach(function (s) { if (byKey(s) && c.indexOf(s) < 0) c.push(s); });
    if (!c.length) { var x = pick(day, m, o.subj); if (!x) return null; c.push(key(x)); }
    var dn = c.filter(function (s) { return (doneMap && doneMap["les:" + s]) || isRead(byKey(s), m); });
    k = (dn.length ? dn : c).sort()[0];
    if (o.d !== day || o.k !== k) { o.d = day; o.k = k; savePrefs(o); }
    return byKey(k);
  }
  function row(x, m) {
    if (!x) return null; var S = R.subjects[x.s] || {}, fr = frOn(x);
    return { k: "les:" + key(x), e: "📖", n: (fr ? "Leçon du jour : " : "درس اليوم: ") + label(x), s: (fr ? (S.fr || x.s) : (S.ar || x.s)) + (x.p ? " · " + (fr ? "partie " + x.p + " sur " + x.of : "جزء " + x.p + " من " + x.of) : "") + (CLASSDAY[x.s] ? (fr ? " · avant le cours du " + DAYN[CLASSDAY[x.s]][1] : " · قبل حصّة " + DAYN[CLASSDAY[x.s]][0]) : (fr ? " · une courte lecture" : " · قراية قصيرة")), href: x.href, done: isRead(x, m) };
  }
  /* the 📖 goal row (pure — tests run it): ONE row, today's small lesson */
  function goals(day, m, subj) { m = m || {}; var x = pick(day, m, subj); return x ? [row(x, m)] : []; }

  /* 📅 the class timetable decides the lesson goals (Abdullah, Oct 27 3:35 PM — replaces the one-lesson rotation).
     Class days: Thursday = réa, ⚖️ law, 🏢 management · Friday = case study, cardio / neuro / henderson, surgical ·
     Saturday = community health, 💊 pharma, gerontology, psych, ✅ quality. Only the lessons Abdullah pins as «📌 هالأسبوع»
     on admin.html count (Firestore config/weekLessons {subj:{s:[lesson keys]}}, public read, admin write — rules v11); a subject
     with nothing pinned gives no lesson goal. How they are spread: the 🗓️ study windows below. */
  var CLASSDAY = { law: 4, mgmt: 4, cardio: 5, neuro: 5, henderson: 5, pharma: 6, quality: 6 };       // Thu 4 · Fri 5 · Sat 6
  var DAYN = { 4: ["الخميس", "jeudi"], 5: ["الجمعة", "vendredi"], 6: ["السبت", "samedi"] }, WK = "nursin_weekles_v1";
  function dow(day) { return new Date(Date.parse(day + "T12:00:00Z")).getUTCDay(); }
  function cleanAsg(a) {                                      // {s:[keys]} → only known subjects + real lesson keys
    var o = {}, s; a = a && typeof a === "object" ? a : {};
    for (s in CLASSDAY) if (Array.isArray(a[s])) { var ks = a[s].filter(function (k) { return R.list.some(function (x) { return base(x) === k; }); }); if (ks.length) o[s] = ks; }
    return o;
  }
  function weekLes(v) {                                       // the cached «📌 هالأسبوع» list (set = from Firestore)
    if (v !== undefined) { try { localStorage.setItem(WK, JSON.stringify({ subj: cleanAsg(v), t: Date.now() })); } catch (e) {} return; }
    try { var o = JSON.parse(localStorage.getItem(WK) || "null"); return cleanAsg(o && o.subj); } catch (e) { return {}; }
  }
  /* 🗓️ fixed study windows (Abdullah, Oct 27 5:28 PM): Thursday subjects are read Saturday→Wednesday, Friday subjects
     Sunday→Thursday, Saturday subjects Sunday→Friday; each window restarts after the class. Class days (Thu/Fri/Sat, at the
     institute 7:30–2:30) weigh half a free day, so they carry the least. Pinned unread parts of a class day's subjects are
     spread evenly over what is left of its window (taken in turn from each subject).
     ⚖️ light days (Abdullah, Oct 27 6:24 PM — «أهدافك اليوم 4/17», pins saved on a Tuesday crammed the whole week in): ONE cap for
     the whole day across all subjects — at most TOT[free] = 3 parts on a free day, TOT[class] = 2 on Thu/Fri/Sat — nearest class
     day first; no «last day gets everything» dump. What doesn't fit is never forced in: it shows as one optional row
     «📚 إضافي (إذا عندك وقت)» outside the count (extra()), and simply rolls on to the next days / the next window. */
  var WIN = { 4: [6, 0, 1, 2, 3], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] }, CAP = 3, TOT = { free: 3, cls: 2 }, MAXG = 6, PV = 2;
  function dayW(wd) { return wd >= 4 ? 0.5 : 1; }             // Thu 4, Fri 5, Sat 6 = class days
  function dayCap(day) { return dow(day || dk()) >= 4 ? TOT.cls : TOT.free; }
  // every class day whose window holds today, nearest class first: [{cd, un: unread pinned parts (in turn from each subject), share}]
  function groups(day, m, asg) {
    var wd = dow(day), gs = [];
    [4, 5, 6].forEach(function (cd) {
      var win = WIN[cd], at = win.indexOf(wd); if (at < 0) return;                     // outside this class day's window
      var lists = [], s;
      for (s in CLASSDAY) if (CLASSDAY[s] === cd && asg[s]) (function (ks, s) { var un = P.filter(function (x) { return x.s === s && ks.indexOf(base(x)) >= 0 && !isRead(x, m); }); if (un.length) lists.push(un); })(asg[s], s);
      var un = [], i; for (i = 0; lists.some(function (l) { return i < l.length; }); i++) lists.forEach(function (l) { if (i < l.length) un.push(l[i]); });
      if (!un.length) return;
      var sum = win.slice(at).reduce(function (a, d) { return a + dayW(d); }, 0);
      gs.push({ cd: cd, dist: (cd - wd + 7) % 7, un: un, share: Math.min(CAP, Math.ceil(un.length * dayW(wd) / sum - 1e-9)) });
    });
    return gs.sort(function (a, b) { return a.dist - b.dist; });
  }
  function plan(day, m, asg) {                                // pure (tests run it): today's counted parts, all subjects, ≤ dayCap
    day = day || dk(); m = m || {}; asg = cleanAsg(asg); var out = [], cap = dayCap(day);
    groups(day, m, asg).forEach(function (g) { out = out.concat(g.un.slice(0, g.share)); });
    return out.slice(0, cap);
  }
  function extra(day, m, asg, not) {                          // pure: the optional rest («📚 إضافي»), nearest class first, never counted
    day = day || dk(); m = m || {}; asg = cleanAsg(asg); not = not || []; var out = [];
    groups(day, m, asg).forEach(function (g) { g.un.forEach(function (x) { if (not.indexOf(key(x)) < 0) out.push(x); }); });
    return out;
  }
  function windowOf(s) { var c = CLASSDAY[s]; return c ? WIN[c].slice() : null; }
  function hashAsg(a) { return JSON.stringify(cleanAsg(a)); }
  /* today's list, kept for the whole day (reading ahead doesn't pull more in). `seen` = lesson keys another device put on today's
     synced list, `doneMap` = today's synced done map, `room` = how many lesson parts fit today (goals.js: total ≈ MAXG goals).
     Parts already finished today (on this device's list or another device's) always stay on it and count as ✅, even past the cap. */
  function todayPlan(seen, doneMap, room) {
    var day = dk(), o = prefs(), asg = weekLes(), h = hashAsg(asg), m = readMap(), ks;
    function dn(k) { var x = byKey(k); return !!x && (!!(doneMap && doneMap["les:" + k]) || isRead(x, m)); }
    var prev = (o.d === day && Array.isArray(o.ks) ? o.ks : []).concat(seen || []).filter(function (k, i, a) { return a.indexOf(k) === i && dn(k); });
    if (o.v === PV && o.d === day && o.h === h && Array.isArray(o.ks)) ks = o.ks.filter(byKey);
    else ks = plan(day, m, asg).map(key);
    prev.forEach(function (k) { if (ks.indexOf(k) < 0) ks.unshift(k); });
    if (o.v !== PV || o.d !== day || o.h !== h || JSON.stringify(o.ks) !== JSON.stringify(ks)) { o.v = PV; o.d = day; o.h = h; o.ks = ks; delete o.k; savePrefs(o); }
    var r = room == null ? dayCap(day) : Math.min(room, dayCap(day)), left = Math.max(0, r - ks.filter(dn).length);
    return ks.filter(function (k) { return dn(k) || left-- > 0; }).map(byKey).filter(Boolean);
  }
  // the optional row: the rest of the pinned parts that don't fit today (null when nothing is left)
  function extraRow(not) {
    var fr = frOn({}), x = extra(dk(), readMap(), weekLes(), not || []); if (!x.length) return null;
    return { k: "xtra", e: "📚", opt: true, n: fr ? "En plus (si tu as le temps)" : "إضافي (إذا عندك وقت)", s: (fr ? x.length + " partie" + (x.length > 1 ? "s" : "") + " · " : x.length + (x.length === 1 ? " جزء" : x.length === 2 ? " جزئين" : " أجزاء") + " · ") + label(x[0]) + (fr ? " · pas compté" : " · مش محسوب"), href: x[0].href, done: false };
  }
  function classDayOf(s) { var c = CLASSDAY[s]; return c ? DAYN[c] : null; }
  w.NursinLessons = { list: R.list, parts: P, subjects: R.subjects, SPLIT: SPLIT, fresh: fresh, goals: goals, pick: pick, today: today, row: row, label: label, key: key, base: base,
    isRead: isRead, markRead: markRead, readMap: readMap, subject: subject, splitPage: splitPage, KEY: RK, PKEY: PK,
    CLASSDAY: CLASSDAY, WIN: WIN, CAP: CAP, TOT: TOT, MAXG: MAXG, dayCap: dayCap, windowOf: windowOf, plan: plan, extra: extra, extraRow: extraRow, todayPlan: todayPlan, weekLes: weekLes, classDayOf: classDayOf, WKEY: WK };
  if (!d || !d.addEventListener) return;

  /* ✂️ cut a drawn lesson into its parts (idempotent). el = the lesson's <details>; its body = .tbody */
  function splitOne(x0) {
    var st = SPLIT[base(x0)], el = d.getElementById(anchor(x0));
    if (!st || !el || el.tagName !== "DETAILS" || el.getAttribute("data-split")) return;
    var body = el.querySelector(".tbody"), sum = el.querySelector("summary"); if (!body || !sum) return;
    var kids = [].slice.call(body.children); if (kids.length <= st[st.length - 1]) return;     // not the expected lesson: leave it whole
    var cuts = [0].concat(st, [kids.length]), prev = el, fr = frOn(x0);
    el.setAttribute("data-split", "1");
    var tag = function (det, n) { var b = det.querySelector("summary .t b") || det.querySelector("summary"); var s = d.createElement("span"); s.className = "lpart"; s.setAttribute("data-nofr", ""); s.textContent = " — " + (fr ? "Partie " : "الجزء ") + n + "/" + (cuts.length - 1); b.appendChild(s); };
    for (var i = 1; i < cuts.length - 1; i++) {
      var det = d.createElement("details"); det.className = el.className; det.id = el.id + "-p" + (i + 1); det.setAttribute("data-split", "1");
      det.appendChild(sum.cloneNode(true)); var nb = d.createElement("div"); nb.className = body.className; det.appendChild(nb);
      kids.slice(cuts[i], cuts[i + 1]).forEach(function (k) { nb.appendChild(k); });
      tag(det, i + 1); prev.parentNode.insertBefore(det, prev.nextSibling); prev = det;
    }
    tag(el, 1);
  }
  function splitPage() { R.list.forEach(function (x) { if (here(x)) splitOne(x); }); }

  /* 📖 reading tracker: every part on this page. Read = ~60 s with the (open) part on screen, or its top and end both seen with ≥15 s */
  function here(x) { var p = x.href.split("#")[0], path = location.pathname.split("/").pop() || "index.html"; return p === path; }
  function track() {
    var mine = P.filter(function (x) { return here(x) && x.href.indexOf("#") > 0 && !isRead(x); }); if (!mine.length) return;
    var st = mine.map(function () { return { sec: 0, top: false, end: false }; }), t = setInterval(function () {
      if (d.visibilityState && d.visibilityState !== "visible") return;
      var left = 0, H = w.innerHeight || 700;
      mine.forEach(function (x, i) {
        if (isRead(x)) return; left++;
        var el = d.getElementById(anchor(x)); if (!el || (el.tagName === "DETAILS" && !el.open)) return;
        var r = el.getBoundingClientRect(); if (!(r.bottom > 60 && r.top < H - 60) || r.height < 40) return;
        var s = st[i]; s.sec++; if (r.top > -120 && r.top < H) s.top = true; if (r.bottom > 0 && r.bottom <= H) s.end = true;
        if (s.sec >= 60 || (s.top && s.end && s.sec >= 15)) markRead(x);
      });
      if (!left) clearInterval(t);
    }, 1000);
  }
  /* ☁️ read lessons follow the account too (users/{uid}.lessonsRead {key: ts}, merged both ways on sign-in; rules v10 allow the owner
     to merge a field), so «درس اليوم» doesn't hand the phone a lesson already read on the iMac */
  var rdT = 0;
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  function rdPush() {
    if (!fbA()) return; clearTimeout(rdT);
    rdT = setTimeout(function () { var A = fbA(); if (!A) return; A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { lessonsRead: readMap() }, { merge: true }).catch(function () {}); }, 2000);
  }
  d.addEventListener("nursin:auth", function (e) {
    if (!(e.detail && e.detail.signedIn)) return;
    setTimeout(function () {
      var A = fbA(); if (!A) return;
      A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (s) {
        var r = (s.exists() && s.data().lessonsRead) || {}, m = readMap(), add = false, more = false, k;
        for (k in r) if (!m[k] && typeof k === "string" && k.length < 60) { m[k] = +r[k] || Date.now(); add = true; }
        for (k in m) if (!r[k]) more = true;
        if (add) { try { localStorage.setItem(RK, JSON.stringify(m)); } catch (x) {} try { d.dispatchEvent(new CustomEvent("nursin:lesson-read", { detail: { sync: 1 } })); } catch (x) {} }
        if (more) rdPush();
      }, function () {});
    }, 1500);
  });
  // 📌 this week's pinned lessons (config/weekLessons, public read) — fetched on every page after auth settles, at most every 10 min
  var wkAt = 0;
  function wkPull(force) {
    var A = w.NursinFB; if (!A || !A.fs || !A.db) return;
    if (!force && Date.now() - wkAt < 6e5) return; wkAt = Date.now();
    A.fs.getDoc(A.fs.doc(A.db, "config", "weekLessons")).then(function (s) {
      var before = JSON.stringify(weekLes()); weekLes(s.exists() ? (s.data().subj || {}) : {});
      if (JSON.stringify(weekLes()) !== before) try { d.dispatchEvent(new CustomEvent("nursin:weekles")); } catch (x) {}
    }, function (e) { if (!(e && e.code === "permission-denied")) console.warn("nursin: week lessons", e && e.code); });   // denied = rules v11 not published yet
  }
  d.addEventListener("nursin:auth", function () { setTimeout(function () { wkPull(); }, 900); });
  w.addEventListener && w.addEventListener("focus", function () { wkPull(); });
  w.NursinLessons.wkPull = wkPull;
  // finishing the lesson's own quiz counts as read too (quiz.js sends set = topic / subject and les = lesson)
  d.addEventListener("nursin:quiz-done", function (e) {
    var x = e.detail || {}; if (!x.set || x.exam || x.challenge) return;
    P.forEach(function (l) { if (l.l ? (l.t === x.set && l.l === x.les) : (l.t === x.set && !x.les)) markRead(l); });
  });
  // a goal link like law.html#l2: the law / mgmt / quality / pharma lessons are drawn by script after app.js looked at the hash,
  // so open + scroll to the lesson once it exists (tries for ~4 s)
  function openHash() {
    var id = decodeURIComponent((location.hash || "").slice(1)); if (!id) return; var n = 0;
    (function go() { var el = d.getElementById(id); if (el) { if (el.tagName === "DETAILS" && !el.open) { el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 60); } return; } if (++n < 20) setTimeout(go, 200); })();
  }
  function boot() { splitPage(); openHash(); track(); }
  w.addEventListener("hashchange", openHash);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
if (typeof window !== "undefined" && window.Lang) { Lang.fix("NLESSONS"); }   // 🇫🇷 Français seulement (assets/lang.js)
