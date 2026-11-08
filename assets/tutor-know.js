/* 🧑‍🏫 الأستاذ عثمان بيعرف كل شي بالموقع عن الطالب + 📌 «اشرحلي الوظيفة» (Abdullah, Nov 1 2026 5:29 PM voice: «الأستاذ عثمان لازم يكون عنده معرفة على
   كل شي موجود بالموقع: شو عنا وظيفة، شو عنا امتحانات، وشو مساره اليومي … بيقترح عليه: بدّك اشرحلك الوظيفة ونفهم الدرس تبعها وبعدين بتجرّب
   تحلّ … وبعدين بيصحّحلو وبيقلّو لا لازم تكتب هيك»).
   • block(gather()) = a compact text the tutor page adds to EVERY request's context (no worker change: worker v4→v10 appends `context` to its system
     text): 📌 current homework with its full typed questions (assets/homework-static.js + the admin's Firestore ones via NursinHW), 🎯 the midterm
     (countdown, today's plan, best mock scores, weakest lessons — assets/midterm.js), 🧭 today's «مسار اليوم» (steps done / left, localStorage
     nursin_path_v1 written by the home page), and the student's own mistakes. Kept short (< ~5 000 characters).
   • The homework flow (tutor.html?hw=<id>): offer → teach (the lessons behind it, from the site's own text in assets/tutor-lessons.js, short parts
     ending «قلّي كمّل») → try (the student writes his answer per case) → correct (what's right, what's missing, «لازم تكتب هيك» + a model answer in
     the teacher's format; the grading points are sent ONLY at this step) → done. Saved per homework in localStorage nursin_tutor_hw_v1 so he resumes. */
(function (w, d) {
  "use strict";
  var SK = "nursin_tutor_hw_v1", PK = "nursin_path_v1", HMAX = 30, AMAX = 1500;
  var STAGES = ["offer", "teach", "try", "correct", "done"];
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today(now) {
    var M = w.NursinMid; if (M && M.today) return M.today(now);
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function dayDiff(a, b) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5); }
  var DN = ["الأحد", "الاتنين", "التلاتا", "الأربعا", "الخميس", "الجمعة", "السبت"];
  function dayName(day) { return DN[new Date(day + "T12:00:00Z").getUTCDay()] || ""; }
  function dm(day) { return (+String(day).slice(8, 10)) + "/" + (+String(day).slice(5, 7)); }
  function cut(s, n) { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function NL() { return w.NLESSONS || {}; }
  function subjName(k) { var S = (NL().subjects || {})[k]; return S ? S.ar : k || ""; }
  function lessonName(id) {
    var L = NL().list || []; for (var i = 0; i < L.length; i++) { var l = L[i]; if (l.s + ":" + (l.l || l.t) === id) return l.n; }
    var X = w.NURSIN_TUTOR_LESSONS || {}; return X[id] ? X[id].n : id || "";
  }

  /* ---------------- 📌 homework ---------------- */
  function hwRaw(h) {                                      // the built-in entry (typed questions) of a homework, also when the admin's copy is merged into it
    var H = w.NursinHW, ids = [h.id].concat(h.ids || []), S = w.NURSIN_HW_STATIC || [];
    for (var i = 0; i < ids.length; i++) { var r = H && H.raw ? H.raw(ids[i]) : null; if (!r) for (var j = 0; j < S.length; j++) if (S[j].id === ids[i]) r = S[j]; if (r) return r; }
    return null;
  }
  function hwList(day) {                                   // every homework not past its due date (handed in or not), soonest first
    day = day || today(); var H = w.NursinHW, L;
    if (H && H.open) L = H.open(day, true);
    else L = (w.NURSIN_HW_STATIC || []).filter(function (h) { return h && h.due >= day; });
    return L.map(function (h) { return { id: h.id, ids: h.ids || [h.id], title: h.title, subj: h.subj, due: h.due, note: h.note || "", done: !!(H && H.isDone && H.isDone(h.id)), raw: hwRaw(h) }; });
  }
  function hwGet(id, day) { var L = hwList(day); for (var i = 0; i < L.length; i++) if (L[i].id === id || L[i].ids.indexOf(id) > -1) return L[i]; return null; }
  function questions(hw) {                                 // [{n, q}] one answer box per case
    var R = hw && hw.raw;
    if (R && R.cases && R.cases.length) return R.cases.map(function (c, i) { return { n: c.n || ("الحالة " + (i + 1)), nfr: c.nfr || ("Cas " + (i + 1)), q: (c.q || []).join(" ") }; });
    return [{ n: "الوظيفة", nfr: "Le devoir", q: hw ? hw.title : "" }];
  }
  function hwText(hw, day) {                               // the full homework as the tutor reads it
    day = day || today(); var n = dayDiff(day, hw.due), R = hw.raw, out = [];
    out.push("📌 «" + hw.title + "» — المادة: " + subjName(hw.subj) + " — التسليم " + dayName(hw.due) + " " + dm(hw.due) + (n === 0 ? " (اليوم!)" : n === 1 ? " (بكرا)" : " (باقي " + n + " أيام)") +
      " — " + (hw.done ? "الطالب علّم إنو سلّمها ✅" : "الطالب لسّا ما سلّمها") + ". صفحتها: homework.html?id=" + hw.id);
    if (hw.note) out.push("ملاحظة الأستاذ: " + hw.note);
    if (R && R.cases) R.cases.forEach(function (c) { out.push(c.n + ": " + (c.lines || []).join(" ") + " — السؤال: " + (c.q || []).join(" ")); });
    if (R && /\(؟\)/.test(JSON.stringify(R.cases || []))) out.push("(؟) = كلمة مش واضحة بصورة الورقة.");
    return out.join("\n");
  }

  /* ---------------- 🎯 midterm ---------------- */
  function midInfo(day) {
    var M = w.NursinMid; if (!M || !M.daysLeft) return null;
    day = day || today();
    var o = { exam: M.EXAM, left: M.daysLeft(day), active: M.active(day), today: null, best: [], last: [], weak: [], exams: [] };
    try {                                                  // 📅 20261030u: the midterm is split over 4 dates — each with its subjects and days left
      (M.EXAMS || []).forEach(function (E) {
        var n = Math.round((Date.UTC(+E.d.slice(0, 4), +E.d.slice(5, 7) - 1, +E.d.slice(8, 10)) - Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10))) / 864e5);
        o.exams.push({ d: E.d, ar: E.ar, left: n, subs: E.subs.filter(function (s) { return s !== "*"; }).map(function (s) { return M.subjName(s); }) });
      });
      var nx = M.next ? M.next(day) : null; if (nx) o.exam = nx.d;
    } catch (e) {}
    try { var pd = M.planDay(day); if (pd) o.today = { subs: (pd.subs || []).map(function (s) { return M.subjName(s); }), light: pd.k === "light", done: !!M.planDone(day) }; } catch (e) {}
    try {
      var x = M.load();
      Object.keys(x.best || {}).forEach(function (s) { var b = x.best[s]; if (b) o.best.push({ s: M.subjName(s), p: b.p | 0, sc: b.sc | 0, n: b.n | 0 }); });
      Object.keys(x.last || {}).forEach(function (s) { var l = x.last[s]; if (l) o.last.push({ s: M.subjName(s), p: l.p | 0, d: l.d || "", at: +l.at || 0 }); });
      o.last.sort(function (a, b) { return b.at - a.at; }); o.last = o.last.slice(0, 4);
      var wl = M.weakLessons ? M.weakLessons(5) : [];
      o.weak = (wl || []).map(function (id) { id = typeof id === "string" ? id : id && id.id; var p = x.lw && x.lw[id]; return { id: id, n: lessonName(id), p: p == null ? null : p | 0 }; }).filter(function (r) { return r.id; });
    } catch (e) {}
    return o;
  }

  /* ---------------- 🧭 today's path (the home page writes it) ---------------- */
  function skey(s) { return s.k + ":" + (s.id || s.ik || s.f || ""); }
  function stepLabel(s) {
    var nm = s.n || (s.id ? lessonName(s.id) : "");
    switch (s.k) {
      case "osm": return "🧑‍🏫 سؤالين سريعين مع الأستاذ عثمان" + (s.id ? " عن «" + lessonName(s.id) + "»" : "");
      case "cls": return "🏫 مراجعة درس اليوم بالمعهد: " + nm;
      case "hw": return "📌 وظيفة: " + (s.n || "") + (s.due ? " (التسليم " + dm(s.due) + ")" : "");
      case "imp": return "⭐ مهم اليوم: " + nm;
      case "mid": return "🎯 تحضير امتحان الفصل: " + (s.light || s.s === "weak" ? "مراجعة خفيفة + ١٠ أسئلة" : "امتحان كامل " + subjName(s.s));
      case "duel": return "⚔️ دورو بالبطولة";
      case "rev": return "🔁 " + (s.n | 0) + " أسئلة مراجعة";
      case "today": return "📖 درس اليوم: " + nm;
      case "cont": return "📖 يكمّل: " + nm;
      case "new": return "📖 درس جديد: " + nm;
      case "quiz": return "⚡ كويز: " + nm;
      case "weak": return "💪 من نقاط ضعفو: " + nm + (s.miss ? " (غلط فيه " + s.miss + " مرّات)" : "");
      case "fade": return "🃏 يرجّع «" + nm + "» (عم يروح منّو)";
      case "case": return "🩺 حالة مريض: " + nm;
      case "use": return "🎮 يجرّب شي ما استعملو من فترة";
      case "wex": return "📝 الامتحان الأسبوعي المختلط";
      case "game": return "🎮 لعبة وحدة";
      case "cards": return "🃏 بطاقات سريعة";
      case "qall": return "⚡ كويز ١٠ أسئلة من كل المواد";
      case "again": return "📖 رجعة سريعة على «" + nm + "»";
      case "hl": return "🖍️ يراجع تعليماتو";
      default: return nm || s.k || "";
    }
  }
  function pathInfo(day) {
    day = day || today(); var p = lsGet(PK);
    if (!p || p.d !== day || !Array.isArray(p.steps) || !p.steps.length) return { none: true };
    var D = p.done || {}, steps = p.steps.concat(p.more || []).filter(function (s) { return s && s.k; }).map(function (s) { return { k: s.k, t: stepLabel(s), done: !!D[skey(s)] }; });   // 30f: every step is on the path (no «+N كمان»)
    return { none: false, steps: steps, done: steps.filter(function (s) { return s.done; }).length, total: steps.length };
  }

  /* ---------------- the context block ---------------- */
  function gather(day) {
    day = day || today(); var wk = [];
    try { if (w.Weak && w.Weak.topics) wk = w.Weak.topics().slice(0, 6); } catch (e) {}
    var hm = ""; try { hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); } catch (e) {}
    return { day: day, hm: hm, hw: hwList(day), mid: midInfo(day), path: pathInfo(day), weak: wk, topics: w.QTOP || {} };
  }
  function block(o) {
    o = o || gather(); var out = [];
    if (o.hm) out.push("الساعة هلّق " + o.hm + " بتوقيت بيروت (" + dayName(o.day) + " " + dm(o.day) + ").");
    out.push("[ملخّص الموقع عن هالطالب اليوم — جاوب منّو بالأرقام والأسماء لما يسأل «شو عندي وظيفة؟» أو «امتى الامتحان؟» أو «شو باقي من مساري؟» أو «شو أضعف دروسي؟»، وبلا ما تخترع شي مش مكتوب هون]");
    var hw = o.hw || [];
    if (hw.length) {
      out.push("📌 الوظائف (صفحة homework.html):");
      hw.slice(0, 4).forEach(function (h) { var x = hwText(h, o.day); out.push(x.length > 1600 ? x.slice(0, 1599) + "…" : x); });
      var open = hw.filter(function (h) { return !h.done; });
      if (open.length) out.push("إذا الطالب فاضي أو سأل شو يعمل، اقترح عليه تشتغلوا عالوظيفة سوا: «بدّك اشرحلك الوظيفة ونفهم الدرس تبعها، وبعدين بتجرّب تحلّ؟» — وقلّو يكبس زر «🧑‍🏫 اشرحلي مع عثمان» فوق المحادثة. ما تحلّلو الوظيفة كاملة بالمحادثة العادية: الشرح أوّل، بعدين هوّي بيجرّب، بعدين بتصحّح.");
    } else out.push("📌 ما في وظايف مفتوحة هلّق.");
    var m = o.mid;
    if (m && m.active) {
      var s = m.exams && m.exams.length
        ? "🎯 امتحانات الفصل (Midterm، صفحة midterm.html) صارت على ٤ تواريخ، كل واحد الساعة ٨ الصبح (هيك محطوط بالموقع): " + m.exams.map(function (e) { return dm(e.d) + " " + e.ar + (e.left < 0 ? " (صار ✅)" : e.left === 0 ? " (اليوم!)" : " (باقي " + e.left + " يوم)"); }).join(" · ") +
          ". الـ١٦/١١ = كل المواد اللي ما انذكرت بتاريخ تاني (Law، Management، Med-Surg: القلب والأعصاب وHenderson والتسريب الوريدي…). الرعاية الوقائية والعقلية ما إلهن دروس بالموقع. الامتحان الجاي: " + dm(m.exam) + " — باقي " + m.left + " يوم."
        : "🎯 امتحان الفصل (Midterm، صفحة midterm.html): الاتنين " + dm(m.exam) + " الساعة ٨ الصبح (هيك محطوط بالموقع) — باقي " + m.left + (m.left === 1 ? " يوم" : " يوم") + ". من كل الدروس تقريباً بكل المواد.";
      if (m.today) s += " خطة المراجعة لليوم: " + (m.today.light ? "مراجعة خفيفة لأضعف الدروس (١٠ أسئلة)" : "امتحان تجريبي كامل لـ " + m.today.subs.join(" + ")) + (m.today.done ? " — ✅ عملها" : " — لسّا ما عملها") + ".";
      out.push(s);
      if (m.best.length) out.push("أحسن علامات الطالب بالامتحانات التجريبية: " + m.best.map(function (b) { return b.s + " " + b.p + "% (" + b.sc + "/" + b.n + ")"; }).join("، ") + ".");
      else out.push("الطالب لسّا ما عمل ولا امتحان تجريبي لامتحان الفصل.");
      if (m.last.length) out.push("آخر امتحانات تجريبية: " + m.last.map(function (l) { return l.s + " " + l.p + "%" + (l.d ? " (" + dm(l.d) + ")" : ""); }).join("، ") + ".");
      if (m.weak.length) out.push("أضعف دروسو (من الامتحانات التجريبية وأغلاطو): " + m.weak.map(function (r) { return r.n + (r.p != null ? " " + r.p + "%" : ""); }).join("، ") + ".");
      out.push("إذا سأل «امتى الامتحان؟» بلا ما يحدّد، قصدو امتحانات الفصل هودي: قلّو الجاي أول، وكل مادة بتاريخها.");
    } else if (m) out.push("🎯 امتحانات الفصل (آخرها " + dm(m.exams && m.exams.length ? m.exams[m.exams.length - 1].d : m.exam) + ") خلصت.");
    var p = o.path;
    if (p && !p.none) {
      out.push("🧭 مسار اليوم (الصفحة الرئيسية): خلّص " + p.done + " من " + p.total + " خطوات.");
      out.push(p.steps.map(function (x) { return (x.done ? "✅ " : "⬜ ") + x.t; }).join(" | "));
    } else out.push("🧭 مسار اليوم: الطالب لسّا ما فتح الصفحة الرئيسية اليوم، فالمسار بعدو ما انعمل (بينعمل لما يفتحها).");
    var T0 = o.topics || {}, wk = (o.weak || []).map(function (x) { return (T0[x.t] || x.t) + " (" + x.n + ")"; });
    if (wk.length) out.push("المواضيع يلي غلط فيها أكتر بالكويز: " + wk.join("، ") + ".");
    return out.join("\n");
  }

  /* ---------------- 📌 the homework flow ---------------- */
  function store() { var x = lsGet(SK); if (!x || typeof x !== "object" || !x.s) x = { v: 1, s: {} }; return x; }
  function fresh(id) { return { id: id, stage: "offer", ans: {}, hist: [], tp: 0, at: Date.now() }; }
  function load(id) { var x = store(), s = x.s[id]; if (!s || typeof s !== "object") return fresh(id); s.id = id; if (STAGES.indexOf(s.stage) < 0) s.stage = "offer"; s.ans = s.ans || {}; s.hist = Array.isArray(s.hist) ? s.hist : []; s.tp = s.tp | 0; return s; }
  function save(s) {
    var x = store(); s.at = Date.now(); s.hist = (s.hist || []).filter(function (m) { return m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"; }).slice(-HMAX);
    Object.keys(s.ans || {}).forEach(function (k) { s.ans[k] = String(s.ans[k] || "").slice(0, AMAX); });
    x.s[s.id] = s;
    var ks = Object.keys(x.s).sort(function (a, b) { return (+x.s[b].at || 0) - (+x.s[a].at || 0); }); ks.slice(6).forEach(function (k) { delete x.s[k]; });   // keep the 6 newest
    lsSet(SK, x); return s;
  }
  function reset(id) { var x = store(); delete x.s[id]; lsSet(SK, x); return fresh(id); }
  function has(id) { var x = store(), s = x.s[id]; return !!(s && (s.stage !== "offer" || (s.hist || []).length)); }
  function setStage(s, st) { if (STAGES.indexOf(st) > -1) { if (st === "teach" && s.stage !== "teach") s.tp = 0; s.stage = st; } return s; }

  function teachOf(hw) { var X = w.NURSIN_HW_TEACH || {}, ids = hw ? [hw.id].concat(hw.ids || []) : []; for (var i = 0; i < ids.length; i++) if (X[ids[i]]) return X[ids[i]]; return null; }
  function lessonsText(hw) {
    var t = teachOf(hw), L = w.NURSIN_TUTOR_LESSONS || {}, E = w.NURSIN_TUTOR_EXTRA || {}, out = [];
    if (t) {
      out.push("[نص الدروس من الموقع — هيدا يلي بيدرسو الطالب، اشرح منّو أوّل شي ودلّو عالصفحة]");
      (t.lessons || []).forEach(function (id) { var x = L[id]; if (x) out.push("📖 " + x.n + " (صفحة " + x.href + "):\n" + x.t); });
      if (t.extra && E[t.extra]) out.push("[معلومات زيادة]\n" + E[t.extra]);
    } else if (hw) {
      var ls = (NL().list || []).filter(function (l) { return l.s === hw.subj; }).map(function (l) { return l.n + " (" + l.href + ")"; });
      out.push("[دروس مادة " + subjName(hw.subj) + " بالموقع: " + (ls.length ? ls.join("، ") : "—") + "] — اشرح من هالدروس، وإذا استعملت معلومة مش منّن قول «(معلومة عامة)».");
    }
    return out.join("\n");
  }
  function flowContext(s, hw) {
    if (!s || !hw) return "";
    var t = teachOf(hw), qs = questions(hw), out = [];
    out.push("[وضع الوظيفة: إنت والطالب عم تشتغلوا سوا على هالوظيفة]\n" + hwText(hw));
    out.push("الطريقة: ١) بتشرحلو الدرس يلي ورا الوظيفة ٢) هوّي بيجرّب يحلّ ٣) إنت بتصحّحلو. بالعربي اللبناني البسيط، وكل كلمة فرنسية معها معناها بالعربي بين قوسين، ونصّ مرتّب بنقاط قصيرة.");
    if (s.stage === "teach" || s.stage === "offer") {
      var plan = t && t.plan ? t.plan : ["شو بتطلب الوظيفة", "الدرس الأساسي يلي وراها", "الأشياء يلي لازم ينتبهلها بالجواب", "كيف بيكتب الجواب (بلا ما تعبّيه)"], n = Math.min((s.tp | 0) + 1, plan.length);
      out.push("[المرحلة: الشرح] هلّق بس شرح، جزء واحد بكل رسالة (١٠٠–١٧٠ كلمة)، بالترتيب:\n" + plan.map(function (p, i) { return (i + 1) + ") " + p; }).join("\n") +
        "\nهيدا الجزء رقم " + n + " من " + plan.length + " (إذا الطالب سأل سؤال، جاوبو قبل). خلّص كل جزء بسطر لحالو: «قلّي كمّل 👇»." +
        (n >= plan.length ? " وبهالجزء الأخير خلّص بدل «قلّي كمّل» بـ: «هلّق جرّب انت حلّ ✍️»." : "") +
        " ممنوع تحلّ الوظيفة أو تكتب الجواب الكامل لأي حالة هلّق — بس الفهم والطريقة. إذا طلب الجواب، قلّو بلطف «جرّب انت أوّل وأنا بصحّحلك»." +
        " بالشرح ما في بهدلة ولا موعظة (الطالب ما غلط بشي): ادخل دغري بالجزء بعد كلمة ترحيب قصيرة بالأكتر، ودلّو عالصفحة يلي فيها الدرس.");
    } else if (s.stage === "try") {
      out.push("[المرحلة: الطالب عم يجرّب يحلّ لحالو] ما تعطيه الجواب. إذا سأل، عطيه تلميح صغير أو سؤال بيوجّهو (سطرين)، وذكّرو يكتب جوابو بالخانات ويكبس «📨 صحّحلي».");
    } else if (s.stage === "correct" || s.stage === "done") {
      out.push("[المرحلة: التصحيح] الطالب بعت جوابو. اقرا جوابو منيح وما تقول عنو ناسي شي هوّي كاتبو. لكل حالة لحالها، بهالشكل بالظبط:\n🩺 الحالة …\n✅ صح: شو كتب صح (قصير، ابدأ فيه دايماً)\n❌ ناقص أو غلط: شو ناقص أو غلط وليش (من الدروس)\n📝 لازم تكتب هيك:   ← هالسطر اكتبو حرفياً هيك (مش «الجواب النموذجي»)\nجواب نموذجي مختصر ومرتّب بنقاط حسب شكل الأستاذ تحت، وكل حاجة Henderson باسمها بالفرنسي + معناها بالعربي (مش بس الرقم).\n⭐ العلامة: x/10\nإذا الطالب ما كتب شي لحالة، قلّو بلطف وعطيه الجواب النموذجي تبعها. وبالآخر جملة تشجيع وحدة، وذكّرو ينقل الجواب عالورقة ويسلّمها " + dm(hw.due) + ".");
      if (t && t.key) out.push(t.key);
    }
    if (t && t.format) out.push(t.format);
    out.push("أسئلة الوظيفة: " + qs.map(function (q) { return q.n + ": " + q.q; }).join(" | "));
    var lt = lessonsText(hw); if (lt) out.push(lt);
    out.push("بوضع الوظيفة خلّيك بالوظيفة: ما تقترح دروس أو امتحانات تانية بآخر الرسالة.");
    if (FR()) out.push("[Langue] L'élève est en mode français : réponds en français (sans traduction arabe). Termine chaque partie de l'explication par « Dis-moi : continue 👇 », la dernière par « À toi d'essayer ✍️ », et dans la correction écris « 📝 Tu dois écrire comme ça : ».");
    return out.join("\n");
  }
  function answersMsg(hw, ans) {                           // the student's answer, case by case, as one message
    var qs = questions(hw), parts = [T("✍️ هيدا جوابي، صحّحلي:", "✍️ Voici ma réponse, corrige-moi :")];
    qs.forEach(function (q, i) { var a = String((ans || {})[i] || "").trim(); parts.push("🩺 " + T(q.n, q.nfr) + " — " + q.q + "\n" + (a || T("(ما كتبت شي)", "(je n'ai rien écrit)"))); });
    return parts.join("\n\n");
  }
  function offerText(hw) {
    var n = dayDiff(today(), hw.due);
    return T("📌 عندك وظيفة: **" + hw.title + "** (التسليم " + dayName(hw.due) + " " + dm(hw.due) + (n >= 0 ? "، باقي " + n + " أيام" : "") + ")\n\nبدّك اشرحلك الوظيفة ونفهم الدرس تبعها، وبعدين بتجرّب تحلّ؟ 🩺",
      "📌 Tu as un devoir : **" + hw.title + "** (à rendre le " + dm(hw.due) + ")\n\nTu veux que je t'explique le devoir et la leçon qui va avec, puis tu essaies de le résoudre ? 🩺");
  }

  var K = { SK: SK, STAGES: STAGES, HMAX: HMAX, AMAX: AMAX, today: today, gather: gather, block: block, hwList: hwList, hwGet: hwGet, hwText: hwText, hwRaw: hwRaw, questions: questions,
    midInfo: midInfo, pathInfo: pathInfo, stepLabel: stepLabel, load: load, save: save, reset: reset, has: has, setStage: setStage, teachOf: teachOf, lessonsText: lessonsText,
    flowContext: flowContext, answersMsg: answersMsg, offerText: offerText };
  w.TutorKnow = K;
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
