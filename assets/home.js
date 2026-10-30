/* 🏠 nursin home «G» (Abdullah, Oct 31 2026 12:29–12:45 AM: «خلينا نحافظ على فكرة المسار… في مين عم يقرر عنك شو لازم يخلص وإنك قربت
   تنهي» + «حبيتو ابدأ فيه مع اضافة انه الواحد فيو عند الصورة الشخصية يا بيحط صورة من عنده او شي من عندك» + Liquid Glass + gestures).
   index.html only. Draws, top to bottom, inside <section id="hz">:
     ① header: avatar (tap = picker) · greeting by Beirut time + first name · 🔥 streak · 🔔 (only when the announcements bell exists)
     ② 🔍 search pill → the site's own search (NursinSearch, assets/hifz.js) · subject chips → the real subject pages
     ③ «🧭 مسار اليوم» — 3–5 steps the site decides for today from data this device already has: due reviews (assets/srs.js), the lesson
        last opened (assets/nav.js), a quiz on it, the most faded lesson (assets/hifz.js), a patient case (assets/retain.js CASE_IDS),
        the weekly mixed exam when it is ready (Retain.wstatus). Built ONCE per Beirut day and kept in localStorage nursin_path_v1, so it
        never reshuffles; each step ticks ✅ by itself from the same data (review count down, lesson read, quiz answers / cards on that
        lesson, weekly exam done), the rest tick when the student opened the step and came back. Ring + «خلصت X من Y • قرّبت تخلص 🔥».
     ④ «موادي» — every مادة as a card with its average retention.
   + the floating glass pill nav (phones): الرئيسية · المواد · raised «عثمان» (tutor.html) · حفظي · «الكل» (sheet with EVERY page)
   + the avatar picker: «📷 صورتي» (cropped square 256 px, ≤ 40 KB, kept on this device; signed in → users/{uid}/avatar/main, rules v18)
     or one of 12 original cartoon avatars (assets/avatars/a01–a12.webp; signed in → users/{uid}.av + photo, so friends see it).
   No ad markup anywhere in this file; the page's banner sits under «موادي» and the old cards (assets/style.css + index.html). */
(function (w, d) {
  var PK = "nursin_path_v1", AK = "nursin_avatar_v1", DAY = 864e5, V = 1;
  var AVN = 12, AVRE = /^a(0[1-9]|1[0-2])$/;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function N() { return w.Nursin || {}; }
  function today() {
    var n = N(); if (n.dayKey) try { return n.dayKey(); } catch (e) {}
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function lname(n) { if (FR() && w.Lang && w.Lang.look) { try { var y = w.Lang.look(n); if (y) return y; } catch (e) {} } return n; }
  function reduced() { try { return w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  /* ---------------- the pages: «الكل» lists every page of the site (tests check none is missing) ---------------- */
  // [href, emoji, ar, fr, badge-key]
  var ALL = [
    { k: "learn", e: "📚", ar: "الدروس", fr: "Les leçons", items: [
      ["medsurg.html", "🏥", "Med-Surg", "Med-Surg"], ["cardio.html", "🫀", "القلب", "Cardio"], ["neuro.html", "🧠", "الأعصاب", "Neuro"],
      ["henderson.html", "🧩", "Henderson", "Henderson"], ["medsurg.html#iv", "💉", "التسريب", "Perfusion"], ["rea.html", "🚑", "الإنعاش", "Réa"],
      ["pharma.html", "💊", "الأدوية", "Pharmaco"], ["law.html", "⚖️", "القانون", "Législation"], ["mgmt.html", "🏢", "الإدارة", "Management"],
      ["quality.html", "✅", "الجودة", "Qualité"], ["geri.html", "👴", "الشيخوخة", "Gériatrie"], ["community.html", "🏘️", "صحة المجتمع", "Santé comm."],
      ["3d.html", "🧊", "التشريح 3D", "Anatomie 3D"]] },
    { k: "train", e: "🧠", ar: "التدريب والمراجعة", fr: "Entraînement et révision", items: [
      ["quiz.html", "⚡", "كويز", "Quiz"], ["quiz.html?t=review", "🔁", "مراجعة اليوم", "Révision", "due"], ["quiz.html?t=mixed", "🗓️", "الأسبوعي", "Hebdo", "wex"],
      ["#case", "🩺", "حالة مريض", "Cas clinique"], ["quiz.html#weak", "🎯", "نقاط ضعفك", "Points faibles"], ["hifzi.html", "🗺️", "حفظي", "Ma mémoire"],
      ["#cards", "🃏", "البطاقات", "Cartes"], ["#blank", "📃", "الورقة البيضا", "Page blanche"], ["#teach", "🧑‍🏫", "علِّم عثمان", "Enseigne à Osman"],
      ["quiz.html#blanks", "✍️", "عبّي الفراغ", "Trous"], ["exams.html", "📅", "الامتحانات", "Examens"], ["law.html#classquiz", "📝", "كويز الصف", "Quiz de classe"]] },
    { k: "friends", e: "👥", ar: "مع رفقاتك", fr: "Avec tes amis", items: [
      ["index.html#duel", "🏆", "البطولة", "Tournoi"], ["live.html", "🔴", "تحدّي لايف", "Défi live"], ["games.html", "🎮", "الألعاب", "Jeux"],
      ["friends.html", "👥", "أصحابي", "Amis"], ["chat.html", "💬", "المحادثات", "Messages"], ["classes.html", "🏫", "صفّي", "Ma classe"],
      ["classes.html#cdq", "❓", "سؤال اليوم", "Question du jour"], ["#online", "🟢", "مين أونلاين", "En ligne"]] },
    { k: "tools", e: "⚙️", ar: "أدواتي", fr: "Mes outils", items: [
      ["tutor.html", "👨‍🏫", "الأستاذ عثمان", "Prof. Osman"], ["notes.html", "📒", "ملاحظاتي", "Mes notes"], ["#goals", "✅", "أهداف اليوم", "Objectifs"],
      ["#search", "🔎", "دوّر", "Chercher"], ["#avatar", "🧑‍⚕️", "صورتي", "Mon avatar"], ["#theme", "🎨", "المظهر", "Apparence"],
      ["#lang", "🇫🇷", "Français / عربي", "عربي / Français"], ["me.html", "👤", "أنا والإعدادات", "Moi et réglages"], ["about.html", "ℹ️", "من نحن", "À propos"],
      ["privacy.html", "🔒", "الخصوصية", "Confidentialité"], ["credits.html", "📜", "المصادر", "Sources"]] }
  ];
  // the subject chips + «موادي» cards (pages of the subject list)
  var SUBJ = [
    { k: "medsurg", p: "medsurg.html", e: "🏥", ar: "Med-Surg", fr: "Med-Surg", s: ["cardio", "neuro", "henderson", "medsurg"], g: "linear-gradient(160deg,#2dd4bf,#0f766e)" },
    { k: "cardio", p: "cardio.html", e: "🫀", ar: "القلب", fr: "Cardio", s: ["cardio"], g: "linear-gradient(160deg,#fb7185,#9f1239)" },
    { k: "neuro", p: "neuro.html", e: "🧠", ar: "الأعصاب", fr: "Neuro", s: ["neuro"], g: "linear-gradient(160deg,#818cf8,#3730a3)" },
    { k: "pharma", p: "pharma.html", e: "💊", ar: "الأدوية", fr: "Pharmaco", s: ["pharma"], g: "linear-gradient(160deg,#fcd34d,#b45309)" },
    { k: "rea", p: "rea.html", e: "🚑", ar: "الإنعاش", fr: "Réa", s: ["rea"], g: "linear-gradient(160deg,#f87171,#991b1b)" },
    { k: "geri", p: "geri.html", e: "👴", ar: "الشيخوخة", fr: "Gériatrie", s: ["geri"], g: "linear-gradient(160deg,#a3e635,#3f6212)" },
    { k: "comm", p: "community.html", e: "🏘️", ar: "صحة المجتمع", fr: "Santé comm.", s: ["comm"], g: "linear-gradient(160deg,#38bdf8,#075985)" },
    { k: "law", p: "law.html", e: "⚖️", ar: "القانون", fr: "Législation", s: ["law"], g: "linear-gradient(160deg,#c4b5fd,#5b21b6)" },
    { k: "mgmt", p: "mgmt.html", e: "🏢", ar: "الإدارة", fr: "Management", s: ["mgmt"], g: "linear-gradient(160deg,#fdba74,#c2410c)" },
    { k: "quality", p: "quality.html", e: "✅", ar: "الجودة", fr: "Qualité", s: ["quality"], g: "linear-gradient(160deg,#6ee7b7,#047857)" },
    { k: "3d", p: "3d.html", e: "🧊", ar: "التشريح 3D", fr: "Anatomie 3D", s: [], g: "linear-gradient(160deg,#94a3b8,#334155)" }
  ];

  /* ---------------- «مسار اليوم»: the pure builder (tests call HomePath.build with the same x → the same steps) ----------------
     x = { day, due, last: {id, href, name, part} | null, lessons: [{id, s, t, l, n, href, score, read, q}], wex: {ready, done}, cases: [ids] } */
  function build(x) {
    var L = x.lessons || [], byId = {}, steps = [], h = hash(x.day || "");
    L.forEach(function (l) { byId[l.id] = l; });
    var due = x.due | 0;
    if (due > 0) steps.push({ k: "rev", e: "🔁", base: due, n: Math.min(due, 10), href: "quiz.html?t=review" + (due > 10 ? "&n=10" : "") });
    var cur = null;
    if (x.last && x.last.href) {
      cur = x.last.id && byId[x.last.id] ? byId[x.last.id] : null;
      steps.push({ k: "cont", e: "📖", id: cur ? cur.id : "", href: x.last.href, n: cur ? cur.n : x.last.name || "", part: x.last.part || "" });
    } else {
      // brand new (or nothing opened lately): the first lesson not read yet that has its own quiz, else the first unread one
      var un = L.filter(function (l) { return !l.read && l.score == null; });
      cur = un.filter(function (l) { return (l.q | 0) >= 3; })[0] || un[0] || null;
      if (cur) steps.push({ k: "new", e: "📖", id: cur.id, href: cur.href, n: cur.n });
    }
    if (cur && (cur.q | 0) >= 3) steps.push({ k: "quiz", e: "⚡", id: cur.id, n: cur.n, href: "quiz.html?t=" + encodeURIComponent(cur.t) + (cur.l ? "&l=" + encodeURIComponent(cur.l) : "") + "&n=10" });
    var weak = L.filter(function (l) { return l.score != null && l.score < 70 && (!cur || l.id !== cur.id); }).sort(function (a, b) { return a.score - b.score || (a.id < b.id ? -1 : 1); })[0];
    if (weak) steps.push({ k: "weak", e: weak.score < 40 ? "🔴" : "🟡", id: weak.id, n: weak.n, score: weak.score, href: fcHref(weak) });
    var cs = {}; (x.cases || []).forEach(function (c) { cs[c] = 1; });
    var cand = L.filter(function (l) { return cs[l.id] && (l.score != null || l.read || (cur && l.id === cur.id)) && (!weak || l.id !== weak.id); });
    if (cand.length) { var c = cand[h % cand.length]; steps.push({ k: "case", e: "🩺", id: c.id, n: c.n, href: c.href.split("#")[0] + "?case=" + encodeURIComponent(c.id) }); }
    steps = steps.slice(0, 4);
    if (x.wex && x.wex.ready && !x.wex.done) steps.push({ k: "wex", e: "🏁", bonus: 1, href: "quiz.html?t=mixed" });
    if (steps.length < 3) steps.push({ k: "game", e: "🎮", href: "games.html" });
    if (steps.length < 3) steps.push({ k: "qall", e: "⚡", href: "quiz.html?n=10" });
    if (steps.length < 3) steps.push({ k: "cards", e: "🃏", href: cur ? fcHref(cur) : "hifzi.html" });
    return steps.slice(0, 5);
  }
  function fcHref(l) { var p = String(l.href).split("#"); return p[0] + "?fc=" + encodeURIComponent(l.id) + (p[1] ? "#" + p[1] : ""); }

  /* ---------------- reading the device's data ---------------- */
  function lessonsNow() {
    var R = w.NursinRet, list = R && R.list ? R.list() : [], src = (w.NLESSONS && w.NLESSONS.list) || [], LS = w.NursinLessons, rm = {};
    try { rm = LS && LS.readMap ? LS.readMap() || {} : {}; } catch (e) {}
    var qc = {}; (w.QUIZ || []).forEach(function (q) { var k = q.t + "|" + (q.l || ""); qc[k] = (qc[k] | 0) + 1; });
    var byT = {}; (w.QUIZ || []).forEach(function (q) { byT[q.t] = (byT[q.t] | 0) + 1; });
    return src.map(function (l, i) {
      var id = l.s + ":" + (l.l || l.t), r = list[i] && list[i].id === id ? list[i] : null;
      var read = false; try { read = LS && LS.isRead ? !!LS.isRead(l, rm) : false; } catch (e) {}
      return { id: id, s: l.s, t: l.t, l: l.l || "", n: l.n, href: l.href, score: r ? r.score : null, read: read, q: l.l ? (qc[l.t + "|" + l.l] | 0) : (byT[l.t] | 0) };
    });
  }
  function lastNow(L) {
    var NN = w.NursinNav, x = NN && NN.lastLesson ? NN.lastLesson() : null; if (!x) return null;
    var id = "", base = x.href.split("#")[0], h = x.href.split("#")[1] || "";
    L.forEach(function (l) { if (!id && l.href.split("#")[0] === base && (l.href.split("#")[1] || "") === h.replace(/-p\d+$/, "")) id = l.id; });
    return { id: id, href: x.href, name: String(x.name || "").replace(/^\S+\s/, ""), part: x.part || "" };
  }
  function ctxNow() {
    var L = lessonsNow(), S = w.NursinSRS, RT = w.Retain, wx = { ready: false, done: false };
    try { var st = RT && RT.wstatus ? RT.wstatus() : null; if (st) wx = { ready: !!st.ready, done: !!st.done }; } catch (e) {}
    return { day: today(), due: S && S.count ? S.count() : 0, last: lastNow(L), lessons: L, wex: wx, cases: (RT && RT.CASE_IDS) || [] };
  }
  function plan() {
    var p = lsGet(PK), dk = today();
    if (p && p.d === dk && p.v === V && p.steps && p.steps.length) return p;
    var steps = build(ctxNow()), now = Date.now();
    p = { v: V, d: dk, at: now, steps: steps, done: {}, vis: {} };
    lsSet(PK, p); return p;
  }
  function retRec(id) { var x = lsGet("nursin_ret_v1"); return x && x.L ? x.L[id] || null : null; }
  // is step i done now? (once done it stays done for the day)
  function isDone(p, i) {
    var s = p.steps[i], at = p.at, vis = (p.vis || {})[i] || 0, r;
    if ((p.done || {})[i]) return true;
    switch (s.k) {
      case "rev": var S = w.NursinSRS, c = S && S.count ? S.count() : 0; return c <= Math.max(0, (s.base | 0) - (s.n | 0));
      case "cont": case "new": r = s.id ? retRec(s.id) : null; if (r && (r.rd || 0) > at) return true; return !s.id && vis > 0 && back(vis);
      case "quiz": r = retRec(s.id); return !!(r && r.t > at && r.t !== r.rd);
      case "weak": r = retRec(s.id); return !!(r && r.t > at && r.t !== r.rd) || (vis > 0 && back(vis) && !!(r && r.t > vis));
      case "wex": try { var st = w.Retain && w.Retain.wstatus ? w.Retain.wstatus() : null; return !!(st && st.done); } catch (e) { return false; }
      case "game": var o = lsGet("nursin_study_v1"); return !!(o && o.td === p.d && (o.tg | 0) > 0) || (vis > 0 && back(vis));
      default: return vis > 0 && back(vis);
    }
  }
  function back(vis) { return Date.now() - vis > 20e3; }     // opened the step and came back (≥ 20 s later)
  function refreshDone(p) {
    var ch = false; p.done = p.done || {};
    for (var i = 0; i < p.steps.length; i++) if (!p.done[i] && isDone(p, i)) { p.done[i] = Date.now(); ch = true; }
    if (ch) lsSet(PK, p); return p;
  }
  function curName(s) {                 // the lesson's name in the language shown now (the list is patched in 🇫🇷 by assets/lang.js)
    var L = (w.NLESSONS && w.NLESSONS.list) || [];
    for (var i = 0; s.id && i < L.length; i++) if (L[i].s + ":" + (L[i].l || L[i].t) === s.id) return L[i].n;
    return lname(s.n || "");
  }
  function texts(s) {
    var nm = esc(curName(s));
    switch (s.k) {
      case "rev": return { tag: T("مراجعة", "Révision"), t: T("🔁 " + s.n + " أسئلة مراجعة", "🔁 " + s.n + " questions à réviser"), sub: T("مستحقّين اليوم من حفظك", "Prévues aujourd'hui dans ta mémoire"), min: Math.max(3, Math.round(s.n * 0.6)) };
      case "cont": return { tag: T("درس", "Leçon"), t: T("كمّل: ", "Continue : ") + nm, sub: s.part ? esc(s.part) : T("من وين وقفت", "Là où tu t'es arrêté(e)"), min: 6 };
      case "new": return { tag: T("درس جديد", "Nouvelle leçon"), t: nm, sub: T("خمس دقايق قراءة بيكفّوا لنبلّش", "Cinq minutes de lecture pour commencer"), min: 5 };
      case "quiz": return { tag: T("كويز", "Quiz"), t: T("⚡ 10 أسئلة: ", "⚡ 10 questions : ") + nm, sub: T("بعد الدرس دغري، تا يثبت", "Juste après la leçon, pour fixer"), min: 5 };
      case "weak": return { tag: T("عم يروح منّك", "S'efface"), t: T("رجّع «", "Récupère « ") + nm + T("»", " »"), sub: T("🃏 بطاقات سريعة · حفظك ", "🃏 Cartes rapides · mémoire ") + (s.score | 0) + "%", min: 4 };
      case "case": return { tag: T("حالة مريض", "Cas clinique"), t: "🩺 " + nm, sub: T("حالة واقعية و٣–٤ أسئلة متل الامتحان", "Un cas réel et 3–4 questions comme à l'examen"), min: 6 };
      case "wex": return { tag: T("بونص هالأسبوع", "Bonus de la semaine"), t: T("📝 الامتحان الأسبوعي المختلط", "📝 L'examen hebdo mixte"), sub: T("جاهز ✨ ~٢٠ سؤال من كل المواد", "Prêt ✨ ~20 questions de toutes les matières"), min: 20 };
      case "game": return { tag: T("لعبة", "Jeu"), t: T("🎮 العب لعبة وحدة", "🎮 Joue une partie"), sub: T("وصّل، صح ولا غلط، الذاكرة", "Relier, vrai ou faux, mémoire"), min: 3 };
      case "qall": return { tag: T("كويز", "Quiz"), t: T("⚡ كويز 10 أسئلة", "⚡ Quiz de 10 questions"), sub: T("من كل المواد", "Toutes les matières"), min: 5 };
      default: return { tag: T("بطاقات", "Cartes"), t: T("🃏 بطاقات سريعة", "🃏 Cartes rapides"), sub: "", min: 3 };
    }
  }
  function ring(done, tot, size) {
    size = size || 50; var r = size / 2 - 3, c = 2 * Math.PI * r, f = tot ? done / tot : 0;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" aria-hidden="true"><defs><linearGradient id="hzrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#99f6e4"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--hztrack)" stroke-width="5"/>' +
      '<circle class="hzrgf" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#hzrg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/></svg>';
  }
  var CHEV = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9 2 4 7l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pathHtml(p) {
    var tot = p.steps.length, dn = 0, cur = -1, i;
    for (i = 0; i < tot; i++) { if (p.done[i]) dn++; else if (cur < 0) cur = i; }
    var all = dn === tot, near = !all && dn > 0 && tot - dn <= 2;
    var line = all ? T("🎉 خلصت مسار اليوم! برافو عليك، بكرا منكمّل 💪", "🎉 Parcours du jour terminé ! Bravo, on continue demain 💪")
      : T("خلصت " + dn + " من " + tot, dn + " sur " + tot + " terminé(s)") + (near ? T(" • قرّبت تخلص 🔥", " • Presque fini 🔥") : dn === 0 ? T(" • يلا نبلّش 💪", " • On commence 💪") : T(" • كمّل هيك 👏", " • Continue comme ça 👏"));
    var h = '<div class="hzph' + (all ? " all" : "") + '"><div class="hzrg">' + ring(dn, tot, 50) + '<div class="c"><b>' + dn + "/" + tot + "</b></div></div>" +
      '<div class="tx"><h2 id="hzpathh">' + T("🧭 مسار اليوم", "🧭 Parcours du jour") + '</h2><small>' + line + "</small></div></div>";
    h += '<ol class="hztl">';
    for (i = 0; i < tot; i++) {
      var s = p.steps[i], x = texts(s), st = p.done[i] ? "done" : i === cur ? "now" : "todo";
      if (s.bonus && st !== "done") st += " bonus";
      h += '<li class="hzst ' + st + '"><span class="nd" aria-hidden="true"><i>' + (p.done[i] ? "✓" : s.e) + "</i></span>" +
        '<a class="bx" href="' + esc(s.href) + '" data-step="' + i + '"><span class="k"><span>' + (st.indexOf("now") === 0 ? "▶ " + T("هلّق", "Maintenant") + " • " : "") + x.tag + '</span><span class="mini">' +
        (p.done[i] ? T("✅ خلصت", "✅ Fait") : "~" + x.min + T(" د", " min")) + "</span></span>" +
        (st.indexOf("now") === 0 ? "<h3>" + x.t + "</h3>" + (x.sub ? "<p>" + x.sub + "</p>" : "") + '<span class="nowft"><small>' + T("الخطوة ", "Étape ") + (i + 1) + T(" من ", " sur ") + tot + '</small><span class="go">' + (dn ? T("كمّل", "Continuer") : T("ابدأ", "Commencer")) + " " + CHEV + "</span></span>"
          : "<b>" + x.t + "</b>") + "</a></li>";
    }
    h += "</ol>";
    return h;
  }

  /* ---------------- avatar ---------------- */
  function avId(k) { return AVRE.test(k || "") ? k : ""; }
  function avUrl(k) { return "assets/avatars/" + k + ".webp"; }
  function myAvatar() {
    var n = N(); if (n.myPhoto) try { return n.myPhoto(); } catch (e) {}
    var a = lsGet(AK); if (a && avId(a.k)) return avUrl(a.k); if (a && a.k === "up" && /^data:image\//.test(a.img || "")) return a.img;
    return (n.me && n.me.photo) || "";
  }
  function avHtml(cls) {
    var p = myAvatar(), me = N().me;
    if (p) return '<img class="' + cls + '" src="' + esc(p) + '" alt="" referrerpolicy="no-referrer">';
    return '<span class="' + cls + ' hzavx" aria-hidden="true">' + (me && me.name ? esc(Array.from(me.name)[0]) : "🙂") + "</span>";
  }
  // square crop + resize to 256 px, webp (jpeg where the browser can't encode webp), ≤ 40 KB
  function shrink(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type || "")) return rej(new Error("type"));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
          var cv = d.createElement("canvas"); cv.width = cv.height = 256; var g = cv.getContext("2d");
          g.imageSmoothingQuality = "high"; g.drawImage(img, sx, sy, s, s, 0, 0, 256, 256); URL.revokeObjectURL(url);
          var out = "", q;
          for (q = 0.86; q >= 0.4; q -= 0.08) { out = cv.toDataURL("image/webp", q); if (out.indexOf("data:image/webp") !== 0) break; if (out.length <= 40000) return res(out); }
          for (q = 0.86; q >= 0.3; q -= 0.08) { out = cv.toDataURL("image/jpeg", q); if (out.length <= 40000) return res(out); }
          rej(new Error("big"));
        } catch (e) { rej(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("read")); };
      img.src = url;
    });
  }
  function setAvatar(a) {           // a = {k:"a01".."a12"} | {k:"up", img} | null
    if (a && !(avId(a.k) || (a.k === "up" && /^data:image\/(webp|jpeg|png);base64,/.test(a.img || "") && a.img.length <= 45000))) return false;
    if (a) { a.at = Date.now(); if (!lsSet(AK, a)) return false; } else try { localStorage.removeItem(AK); } catch (e) {}
    try { d.dispatchEvent(new CustomEvent("nursin:avatar")); } catch (e) {}
    var n = N(); if (n.badge) try { n.badge(); } catch (e) {}
    sync(a); return true;
  }
  // signed in: the cartoon id + its URL go on the profile (friends, ranking and classes then show it); an own photo goes to the
  // owner-only doc users/{uid}/avatar/main (rules v18 — until they are published it simply stays on this device)
  function sync(a) {
    var A = w.NursinFB; if (!A || !A.user || !A.fs) return;
    var F = A.fs, uid = A.user.uid, ref = F.doc(A.db, "users", uid), gp = String(A.user.photoURL || "").slice(0, 500);
    var k = a ? (avId(a.k) || "up") : "";
    var ph = avId(k) ? "https://nursin.store/" + avUrl(k) : gp;
    F.setDoc(ref, { av: k, photo: ph }, { merge: true }).then(function () { if (A.profile) { A.profile.av = k; A.profile.photo = ph; } }, function (e) { console.warn("nursin: avatar", e && e.code); });
    if (k === "up") F.setDoc(F.doc(A.db, "users", uid, "avatar", "main"), { img: a.img, at: Date.now() }).catch(function (e) { if (!(e && e.code === "permission-denied")) console.warn("nursin: avatar img", e && e.code); });
  }
  // another device chose an avatar: take it here too (cartoon from the profile; own photo from the owner-only doc)
  function pull() {
    var A = w.NursinFB, pr = A && A.profile; if (!A || !A.user || !pr) return;
    var loc = lsGet(AK), k = pr.av || "";
    if (avId(k) && (!loc || loc.k !== k)) { lsSet(AK, { k: k, at: Date.now() }); draw(); }
    else if (k === "up" && (!loc || loc.k !== "up") && A.fs) {
      A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid, "avatar", "main")).then(function (s) {
        var x = s.exists() ? s.data() : null; if (x && /^data:image\//.test(x.img || "")) { lsSet(AK, { k: "up", img: x.img, at: Date.now() }); draw(); var n = N(); if (n.badge) n.badge(); }
      }, function () {});
    }
  }

  /* ---------------- sheets (glass, drag down to close, backdrop closes) ---------------- */
  var sh = null, scr = null, opener = null;
  function closeSheet() {
    var s = sh, c = scr; sh = scr = null; d.documentElement.classList.remove("hzsheeton");
    if (s) { s.classList.add("out"); setTimeout(function () { s.remove(); }, reduced() ? 0 : 260); }
    if (c) { c.classList.add("out"); setTimeout(function () { c.remove(); }, reduced() ? 0 : 260); }
    navHome(); var o = opener; opener = null; if (o && o.focus) try { o.focus({ preventScroll: true }); } catch (e) {}
  }
  function openSheet(cls, label, html, from) {
    if (sh) closeSheet();
    opener = from || null;
    scr = d.createElement("div"); scr.className = "hzscrim"; scr.addEventListener("click", closeSheet);
    sh = d.createElement("div"); sh.className = "hzsheet " + cls; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label);
    sh.innerHTML = '<div class="hzgrab" aria-hidden="true"><i></i></div><div class="hzshd"><h2>' + esc(label) + '</h2><button class="hzx" type="button" aria-label="' + T("سكّر", "Fermer") + '">✕</button></div><div class="hzshb">' + html + "</div>";
    d.body.appendChild(scr); d.body.appendChild(sh); d.documentElement.classList.add("hzsheeton");
    sh.querySelector(".hzx").addEventListener("click", closeSheet);
    drag(sh);
    setTimeout(function () { var f = sh && sh.querySelector(".hzx"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    return sh;
  }
  function drag(el) {
    var y0 = 0, dy = 0, on = false, t0 = 0, body = el.querySelector(".hzshb");
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      var inHead = e.target.closest && e.target.closest(".hzgrab,.hzshd");
      if (!inHead && body && body.scrollTop > 0) return;
      on = true; y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); el.style.transition = "none";
    }, { passive: true });
    el.addEventListener("touchmove", function (e) {
      if (!on) return; dy = e.touches[0].clientY - y0;
      if (dy < 0) { dy = 0; } el.style.transform = dy ? "translateY(" + dy + "px)" : "";
    }, { passive: true });
    function end() {
      if (!on) return; on = false; el.style.transition = "";
      var fast = dy > 40 && Date.now() - t0 < 250;
      if (dy > 110 || fast) closeSheet(); else el.style.transform = "";
    }
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
  }
  function badges() {
    var S = w.NursinSRS, due = S && S.count ? S.count() : 0, wx = false;
    try { var st = w.Retain && w.Retain.wstatus ? w.Retain.wstatus() : null; wx = !!(st && st.ready && !st.done); } catch (e) {}
    return { due: due > 0 ? String(due) : "", wex: wx ? T("جاهز", "Prêt") : "" };
  }
  function allHtml(only) {
    var b = badges();
    return '<button class="hzsrch hzsrch-s" type="button" data-hz="search"><span class="e" aria-hidden="true">🔍</span><span class="ph">' + T("دوّر على درس، سؤال، دوا…", "Cherche une leçon, une question, un médicament…") + "</span></button>" +
      ALL.filter(function (g) { return !only || g.k === only; }).map(function (g) {
        return '<section class="hzgrp"><h3>' + g.e + " " + T(g.ar, g.fr) + (g.k === "learn" ? "<small>" + T("13 مادة", "13 matières") + "</small>" : "") + '</h3><div class="hzgr">' + g.items.map(function (it) {
          var bd = it[4] ? b[it[4]] : "", isBtn = it[0].charAt(0) === "#";
          var inner = '<span class="ie" aria-hidden="true">' + it[1] + (bd ? "<em>" + esc(bd) + "</em>" : "") + "</span><b>" + esc(T(it[2], it[3])) + "</b>";
          return isBtn ? '<button type="button" class="it' + (bd ? " hl" : "") + '" data-hz="' + it[0].slice(1) + '">' + inner + "</button>"
            : '<a class="it' + (bd ? " hl" : "") + '" href="' + esc(it[0]) + '">' + inner + "</a>";
        }).join("") + "</div></section>";
      }).join("");
  }
  // the hash-items of the sheet: buttons that reuse what the site already has
  function lastLes() { var L = lessonsNow(), l = lastNow(L), c = null; if (l && l.id) L.forEach(function (x) { if (x.id === l.id) c = x; }); if (!c) c = L.filter(function (x) { return x.score != null; })[0] || L.filter(function (x) { return x.q >= 3; })[0]; return c; }
  function partKey(l) { var P = (w.NLESSONS && w.NLESSONS.parts) || [], k = l.id; for (var i = 0; i < P.length; i++) { var x = P[i]; if (x.s + ":" + (x.l || x.t) === l.id) { k = l.id + (x.p ? "#" + x.p : ""); break; } } return k; }
  function act(k, from) {
    var l;
    switch (k) {
      case "search": closeSheet(); if (w.NursinSearch) w.NursinSearch.open(); else location.href = "hifzi.html"; return;
      case "avatar": closeSheet(); setTimeout(function () { picker(from); }, 280); return;
      case "theme": closeSheet(); if (w.NursinTheme) setTimeout(function () { w.NursinTheme.open(); }, 280); else location.href = "me.html"; return;
      case "lang": if (w.Lang && w.Lang.set) w.Lang.set(FR() ? "ar" : "fr"); return;
      case "goals": closeSheet(); var gp = d.querySelector(".gopill"); if (gp) setTimeout(function () { gp.click(); }, 280); else location.href = "me.html"; return;
      case "online": closeSheet(); if (N().me && w.NursinOnline) w.NursinOnline.open(); else location.href = "friends.html"; return;
      case "cards": l = lastLes(); location.href = l ? fcHref(l) : "hifzi.html"; return;
      case "case": l = caseLes(); location.href = l ? l.href.split("#")[0] + "?case=" + encodeURIComponent(l.id) : "medsurg.html"; return;
      case "blank": case "teach": l = lastLes(); location.href = l ? l.href.split("#")[0] + "?" + k + "=" + encodeURIComponent(partKey(l)) : "medsurg.html"; return;
    }
  }
  function caseLes() {
    var L = lessonsNow(), cs = {}; ((w.Retain && w.Retain.CASE_IDS) || []).forEach(function (c) { cs[c] = 1; });
    var l = lastNow(L); if (l && cs[l.id]) return L.filter(function (x) { return x.id === l.id; })[0];
    return L.filter(function (x) { return cs[x.id] && x.score != null; }).sort(function (a, b) { return a.score - b.score; })[0] || L.filter(function (x) { return cs[x.id]; })[0] || null;
  }
  function openAll(only, from) {
    var s = openSheet("hzall", only ? T("📚 المواد", "📚 Les matières") : T("كل شي بالموقع", "Tout le site"), allHtml(only), from);
    s.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-hz]"); if (b) { e.preventDefault(); act(b.getAttribute("data-hz"), from); return; }
      var a = e.target.closest && e.target.closest("a.it"); if (a && a.getAttribute("href") === "index.html#duel") { e.preventDefault(); closeSheet(); var du = d.getElementById("duel"); if (du) du.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }
    });
  }
  function picker(from) {
    var cur = lsGet(AK) || {}, me = N().me;
    var h = '<p class="hzpk-now">' + avHtml("hzpkav") + '<span><b>' + (me && me.name ? esc(me.name) : T("صورتك", "Ton avatar")) + "</b><small>" +
      T("اختار صورة من عندك أو شخصية كرتونية", "Choisis ta photo ou un personnage") + "</small></span></p>" +
      '<div class="hzpk-row"><label class="hzbtn pri"><input type="file" accept="image/*" class="hzfile" hidden>📷 ' + T("صورتي", "Ma photo") + "</label>" +
      '<button class="hzbtn" type="button" data-av="">↩️ ' + T("بلا", "Aucun") + "</button></div>" +
      '<p class="hzpk-msg" role="status"></p><div class="hzavgrid">';
    for (var i = 1; i <= AVN; i++) { var k = "a" + (i < 10 ? "0" : "") + i; h += '<button type="button" class="hzavb' + (cur.k === k ? " on" : "") + '" data-av="' + k + '" aria-pressed="' + (cur.k === k) + '" aria-label="' + T("شخصية ", "Personnage ") + i + '"><img src="' + avUrl(k) + '" alt="" loading="lazy" width="72" height="72"></button>'; }
    h += "</div>" + (me ? '<p class="hzpk-note">' + T("الشخصية الكرتونية بتبيّن لأصحابك وصفّك كمان. صورتك من عندك بتضل إلك.", "Le personnage est aussi visible par tes amis et ta classe. Ta photo reste à toi.") + "</p>"
      : '<p class="hzpk-note">' + T("محفوظة على هالجهاز. ", "Gardé sur cet appareil. ") + '<a href="friends.html">' + T("سجّل دخول", "Connecte-toi") + "</a>" + T(" تا تبيّن على كل أجهزتك.", " pour la voir sur tous tes appareils.") + "</p>");
    var s = openSheet("hzpick", T("🧑‍⚕️ صورتك", "🧑‍⚕️ Ton avatar"), h, from);
    var msg = s.querySelector(".hzpk-msg");
    function after() { var n = s.querySelector(".hzpk-now"); if (n) { var old = n.querySelector(".hzpkav"); if (old) old.outerHTML = avHtml("hzpkav"); } draw(); [].forEach.call(s.querySelectorAll(".hzavb"), function (b) { var on = (lsGet(AK) || {}).k === b.getAttribute("data-av"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
    s.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-av]"); if (!b) return;
      var k = b.getAttribute("data-av"); setAvatar(k ? { k: k } : null); msg.textContent = k ? T("✅ تمام!", "✅ C'est fait !") : ""; after();
      if (k) setTimeout(function () { if (sh === s) closeSheet(); }, 550);
    });
    s.querySelector(".hzfile").addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return; msg.textContent = "⏳ …";
      shrink(f).then(function (img) { if (setAvatar({ k: "up", img: img })) { msg.textContent = T("✅ حطّينا صورتك", "✅ Ta photo est en place"); after(); setTimeout(function () { if (sh === s) closeSheet(); }, 650); } else msg.textContent = T("⚠️ ما في محل عالجهاز", "⚠️ Plus de place sur l'appareil"); },
        function () { msg.textContent = T("⚠️ ما قدرنا نقرا هالصورة، جرّب وحدة تانية", "⚠️ Impossible de lire cette image, essaie une autre"); });
    });
  }

  /* ---------------- the page ---------------- */
  function hourB() { try { return +new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", hour12: false }).format(new Date()) % 24; } catch (e) { return new Date().getHours(); } }
  function greet(hr) { return hr >= 5 && hr < 12 ? T("صباح الخير ☀️", "Bonjour ☀️") : hr >= 12 && hr < 17 ? T("نهارك سعيد 🌤️", "Bon après-midi 🌤️") : T("مسا الخير 🌙", "Bonsoir 🌙"); }
  function first() { var A = w.NursinFB, me = N().me, n = (A && A.profile && A.profile.name) || (me && me.name) || ""; return String(n).trim().split(/\s+/)[0].slice(0, 18); }
  function streak() {
    var n = N(), me = n.me, s = 0, St = w.NursinStudy;
    try { if (me && n.streakNow) s = n.streakNow(me) | 0; else if (me && me.sDay) { var dk = today(), y = new Date(dk + "T12:00:00Z"); y.setUTCDate(y.getUTCDate() - 1); s = (me.sDay === dk || me.sDay === y.toISOString().slice(0, 10)) ? me.streak | 0 : 0; } } catch (e) {}
    try { var o = lsGet("nursin_study_v1"); if (St && St.streakNow && o) s = Math.max(s, St.streakNow(o) | 0); } catch (e) {}
    return s;
  }
  var root = null;
  function headHtml() {
    var nm = first(), bell = d.querySelector(".topbar .annbell"), dot = bell && bell.querySelector(".dot") && getComputedStyle(bell.querySelector(".dot")).display !== "none";
    return '<div class="hzhd"><button class="hzav" type="button" data-hz="avatar" aria-label="' + T("غيّر صورتك", "Changer d'avatar") + '">' + avHtml("hzavi") + '<span class="hzavp" aria-hidden="true">✎</span></button>' +
      '<div class="t"><small>' + greet(hourB()) + "</small><b>" + (nm ? esc(nm) + " 👋" : T("يا بطل 👋", "champion 👋")) + "</b></div>" +
      '<a class="hzpill glass" href="me.html" aria-label="' + T("السلسلة: ", "Série : ") + streak() + T(" يوم", " jour(s)") + '"><span aria-hidden="true">🔥</span>' + streak() + "</a>" +
      (bell ? '<button class="hzcb glass" type="button" data-hz="bell" aria-label="' + T("الإعلانات", "Annonces") + '"><span aria-hidden="true">🔔</span>' + (dot ? '<span class="dot"></span>' : "") + "</button>" : "") + "</div>" +
      '<button class="hzsrch glass" type="button" data-hz="search"><span class="e" aria-hidden="true">🔍</span><span class="ph">' + T("دوّر على درس، سؤال، دوا…", "Cherche une leçon, une question, un médicament…") + "</span></button>";
  }
  function chipsHtml() {
    return '<nav class="hzchips" aria-label="' + T("المواد", "Matières") + '"><button type="button" class="on" data-hz="all">✨ ' + T("الكل", "Tout") + "</button>" +
      SUBJ.map(function (s) { return '<a href="' + s.p + '">' + s.e + " " + esc(T(s.ar, s.fr)) + "</a>"; }).join("") + "</nav>";
  }
  function subsHtml() {
    var L = []; try { L = (w.NursinRet && w.NursinRet.list) ? w.NursinRet.list() : []; } catch (e) {}
    return '<div class="hzsh"><h2>' + T("📚 موادي", "📚 Mes matières") + '</h2><button type="button" data-hz="learn">' + T("الكل", "Tout") + " (" + (SUBJ.length - 1) + ")</button></div><div class=\"hzsubs\">" +
      SUBJ.map(function (s) {
        var xs = L.filter(function (l) { return s.s.indexOf(l.s) > -1 && l.score != null; }), pc = xs.length ? Math.round(xs.reduce(function (a, l) { return a + l.score; }, 0) / xs.length) : null;
        return '<a class="hzsc" href="' + s.p + '" style="background:' + s.g + '"><span class="art" aria-hidden="true"><i></i><i></i><span>' + s.e + "</span></span><b>" + esc(T(s.ar, s.fr)) + "</b><small>" +
          (pc == null ? T("ابدأ ◀", "Commencer ▶") : T("حفظك ", "Mémoire ") + pc + "%") + "</small></a>";
      }).join("") + "</div>";
  }
  function draw() {
    if (!root) return;
    var p = refreshDone(plan());
    root.innerHTML = '<div class="hztop">' + headHtml() + chipsHtml() + "</div>" +
      '<section class="hzpath" aria-labelledby="hzpathh">' + pathHtml(p) + "</section>" + subsHtml();
  }
  function navHtml() {
    return '<nav class="hznav" aria-label="' + T("التنقّل", "Navigation") + '"><span class="hzblob" aria-hidden="true"></span>' +
      '<a class="hzt on" href="index.html" aria-current="page" data-t="0"><span class="g" aria-hidden="true">🏠</span><span>' + T("الرئيسية", "Accueil") + "</span></a>" +
      '<button class="hzt" type="button" data-hz="learn" data-t="1"><span class="g" aria-hidden="true">📚</span><span>' + T("المواد", "Matières") + "</span></button>" +
      '<a class="hzmid" href="tutor.html" aria-label="' + T("الأستاذ عثمان", "Professeur Osman") + '"><span class="g" aria-hidden="true">👨‍🏫</span><span>' + T("عثمان", "Osman") + "</span></a>" +
      '<a class="hzt" href="hifzi.html" data-t="3"><span class="g" aria-hidden="true">🔁</span><span>' + T("حفظي", "Mémoire") + "</span></a>" +
      '<button class="hzt" type="button" data-hz="all" data-t="4"><span class="g" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 22 22" fill="currentColor"><rect x="1" y="1" width="8.5" height="8.5" rx="3"/><rect x="12.5" y="1" width="8.5" height="8.5" rx="4.25"/><rect x="1" y="12.5" width="8.5" height="8.5" rx="3"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="3"/></svg></span><span>' + T("الكل", "Tout") + "</span></button></nav>";
  }
  var nav = null;
  function blobTo(t) {
    if (!nav) return; var b = nav.querySelector(".hzblob"); if (!b || !t) return;
    var nr = nav.getBoundingClientRect(), r = t.getBoundingClientRect();
    b.style.width = r.width + "px"; b.style.transform = "translateX(" + (r.left - nr.left) + "px)";
    [].forEach.call(nav.querySelectorAll(".hzt"), function (x) { x.classList.toggle("on", x === t); });
  }
  function navHome() { if (nav) blobTo(nav.querySelector('[data-t="0"]')); }
  function hzClick(e) {
    var b = e.target.closest && e.target.closest("[data-hz]"); if (!b || (sh && sh.contains(b))) return;
    var k = b.getAttribute("data-hz"); e.preventDefault();
    if (b.classList.contains("hzt")) blobTo(b);
    if (k === "all") openAll("", b); else if (k === "learn") openAll("learn", b); else if (k === "avatar") picker(b);
    else if (k === "bell") { var bl = d.querySelector(".topbar .annbell"); if (bl) bl.click(); }
    else act(k, b);
  }
  function stepClick(e) {
    var a = e.target.closest && e.target.closest("a[data-step]"); if (!a) return;
    var p = lsGet(PK); if (!p || p.d !== today()) return; var i = +a.getAttribute("data-step");
    p.vis = p.vis || {}; p.vis[i] = Date.now(); lsSet(PK, p);
  }
  function init() {
    root = d.getElementById("hz"); if (!root) return;
    d.body.classList.add("hzon");
    draw();
    root.addEventListener("click", stepClick);
    d.addEventListener("click", hzClick);
    var tmp = d.createElement("div"); tmp.innerHTML = navHtml(); nav = tmp.firstChild; d.body.appendChild(nav);
    nav.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a.hzt,a.hzmid"); if (a && !a.classList.contains("hzmid")) blobTo(a); });
    setTimeout(navHome, 30); w.addEventListener("resize", function () { if (!sh) navHome(); });
    var t = 0, redraw = function () { clearTimeout(t); t = setTimeout(draw, 60); };
    ["nursin:ret", "nursin:srs", "nursin:me", "nursin:auth", "nursin:wexam", "nursin:theme", "nursin:avatar"].forEach(function (ev) { d.addEventListener(ev, redraw); });
    d.addEventListener("nursin:auth", function () { setTimeout(pull, 1500); });
    d.addEventListener("visibilitychange", function () { if (!d.hidden) redraw(); });
    w.addEventListener("pageshow", redraw); w.addEventListener("focus", redraw);
    w.addEventListener("storage", function (e) { if (e.key === PK || e.key === AK || e.key === "nursin_ret_v1" || e.key === "nursin_srs_v1") redraw(); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sh) closeSheet(); });
    setTimeout(redraw, 1500); setTimeout(redraw, 4000);       // the bell, the streak and the profile arrive a bit later
    setTimeout(pull, 5000);
    if (location.hash === "#avatar") setTimeout(function () { picker(null); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }, 700);
  }
  w.HomePath = { build: build, plan: plan, isDone: isDone, refreshDone: refreshDone, ALL: ALL, SUBJ: SUBJ, KEY: PK, AKEY: AK, setAvatar: setAvatar, avUrl: avUrl, AVN: AVN, shrink: shrink, texts: texts, greet: greet, open: openAll, picker: picker, close: closeSheet };
  if (!d || !d.getElementById) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
