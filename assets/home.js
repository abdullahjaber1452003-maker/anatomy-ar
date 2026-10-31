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
   The floating glass pill nav (الرئيسية · المواد · raised «عثمان» · حفظي · «الكل»), the sheets and the avatar picker are the site-wide shell
   since Oct 31 2026 6:45 AM («هيدا الشي يتم على الكل»): assets/ui.js + assets/ui.css, the same on every page. This file draws the home only.
   No ad markup anywhere in this file; the page's banner sits under «موادي» and the old cards (assets/style.css + index.html). */
(function (w, d) {
  var PK = "nursin_path_v1", AK = "nursin_avatar_v1", DAY = 864e5, V = 2;
  // the shared shell (assets/ui.js, every page): the floating nav, the sheets («الكل», «المواد»), the avatar picker, the lesson readers
  function U() { return w.NursinUI || {}; }
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

  /* ---------------- «مسار اليوم» = the whole day (Abdullah, Oct 31 2026 7:48–7:49 PM, voice: «بدي كمان ان الاستاذ عثمان يكون من ضمن
     مسار اليوم… ادرس درس من اللي عندي ضعف فيهن… الأهميات لازم تكون من مسار اليوم… من لما بفيق الصبح او من لما برجع من المعهد…
     حتى لو بدي اقترح عليه العب شي لعبة… هذا المستخدم يلو يومين ملعب شي او ما فتح هيدا الشي يفوت على يصير» + «اللي كان موجود
     بالصفحة الرئيسية حطوا دغري مع مسار اليوم»). The Osman card, «📌 الأهمّيات» (reviews, today's exams / class exam / question of the
     day / class quiz, the weekly exam, درس اليوم), the tournament and the weak points are no longer blocks of their own: they are
     steps of ONE path, 5–7 light steps, chosen once per Beirut day (deterministic: same data + same day → same steps):
       🧑‍🏫 osm   Osman asks 2 quick questions on the lesson of the moment, answered right here (✅ = both answered)
       🏫 cls   class day (Thu/Fri/Sat, institute 7:30–2:30) after 2:30 PM: «راجع درس اليوم» = the newest lesson(s) of that day's
                subjects — added to the morning's path when the student comes back (✅ = a part of it read)
       ⭐ imp / duel / rev / today / wex   the old «الأهمّيات»: today's exams + class exam + سؤال اليوم + class quiz, the tournament
                round, due reviews (✅ = count down), درس اليوم from the timetable (✅ = that part read), the weekly mixed exam
       💪 weak  ONE lesson from the student's own mistakes (nursin_weak_v1 grouped by lesson): «غلطت فيه X مرات» (✅ = part read or a
                quiz / cards on it after the path was made); no mistakes yet → the most faded lesson (fade, 🃏 cards)
       🎮 use   what wasn't used for 2+ days (games, cards, cases, quiz, highlights, notes — nursin_use_v1, assets/ui.js):
                «صرلك يومين ما لعبت 🎮» (✅ = really used again: a game round finished, a card answered…)
       quiz / case / game / cards / qall   only to reach 5 steps
     Kept in localStorage nursin_path_v1 {v, d, at, steps, done:{key:ts}, vis:{key:ts}, ans:{qid:pick}, cls}; signed in, a copy rides
     on the student's own profile users/{uid}.dayPath (the published rules already let the owner merge a field there), so the phone
     and the laptop share one path for the day. HomePath.build is pure (tests). */
  var CLASSDAY = { law: 4, mgmt: 4, rea: 4, cardio: 5, neuro: 5, henderson: 5, medsurg: 5, pharma: 6, quality: 6, geri: 6, comm: 6 };   // = assets/lessons.js
  var BACK = 14 * 60 + 30, MAXS = 7, MINS = 5;                     // back from the institute 2:30 PM (Beirut) · 5–7 steps
  var ORDER = { osm: 0, cls: 1, imp: 2, duel: 3, rev: 4, today: 5, cont: 5, "new": 5, quiz: 6, weak: 7, fade: 7, "case": 8, use: 9, wex: 10, game: 11, cards: 12, qall: 13, again: 14, hl: 15 };
  var FEATS = ["games", "cards", "cases", "quiz", "highlights", "notes"], NEVER = ["games", "cards", "cases", "quiz"];
  function skey(s) { return s.k + ":" + (s.id || s.ik || s.f || ""); }
  function dayOf(ts) { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)); } catch (e) { return new Date(ts + 2 * 36e5).toISOString().slice(0, 10); } }
  function dayDiff(a, b) { return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / DAY); }
  function dowOf(day) { return new Date(Date.parse(day + "T12:00:00Z")).getUTCDay(); }
  // class day afternoon? (Thu 4 · Fri 5 · Sat 6, after 2:30 PM Beirut)
  function afterClass(day, hm) { var w0 = dowOf(day); return w0 >= 4 && w0 <= 6 && (hm | 0) >= BACK; }
  // the newest lesson(s) of the subjects taught on that weekday: the latest «added» date among them, at most 2 (list order)
  function classNewest(L, wd) {
    var xs = L.filter(function (l) { return CLASSDAY[l.s] === wd; }); if (!xs.length) return [];
    var top = xs.reduce(function (m, l) { return (l.added || "") > m ? l.added || "" : m; }, "");
    var ys = top ? xs.filter(function (l) { return (l.added || "") === top; }) : xs.slice(-1);
    return ys.slice(0, 2);
  }
  // 💪 the lesson with the most mistakes (weak = [{id, miss, cnt}]); not the lessons already on the path when there is another
  function weakPick(weak, not) {
    var xs = (weak || []).filter(function (x) { return x && x.id && (x.miss | 0) > 0; }).sort(function (a, b) { return (b.miss | 0) - (a.miss | 0) || (b.cnt | 0) - (a.cnt | 0) || (a.id < b.id ? -1 : 1); });
    var ys = xs.filter(function (x) { return (not || []).indexOf(x.id) < 0; });
    return ys[0] || xs[0] || null;
  }
  // 🎮 what wasn't used for 2+ days (use = {f: ms}); never used at all counts only once the tracker is 2+ days old
  function usePick(use, since, day, h, have) {
    use = use || {}; have = have || {}; var real = [], never = [];
    FEATS.forEach(function (f) {
      if (have[f] === false) return;
      var t = +use[f] || 0;
      if (t) { var n = dayDiff(day, dayOf(t)); if (n >= 2) real.push({ f: f, days: n }); }
      else if (NEVER.indexOf(f) > -1 && since && dayDiff(day, dayOf(since)) >= 2) never.push({ f: f, days: 0, never: 1 });
    });
    real.sort(function (a, b) { return b.days - a.days || FEATS.indexOf(a.f) - FEATS.indexOf(b.f); });
    if (real.length) return real[0];
    return never.length ? never[h % never.length] : null;
  }
  function pick2(qs, h) {                                // 2 questions of a lesson, the same all day
    qs = (qs || []).slice(); if (qs.length <= 2) return qs;
    var i = h % qs.length, j = (i + 1 + (h >> 7) % (qs.length - 1)) % qs.length; if (j === i) j = (i + 1) % qs.length;
    return [qs[i], qs[j]];
  }
  /* x = { day, hm (Beirut minutes since midnight), due, last:{id,href,name,part}|null, lessons:[{id,s,t,l,n,href,score,read,q,added}],
           today:{id,pk,href,n,more}|null (درس اليوم from the timetable), recent:[lesson ids studied lately], qids:{lessonId:[qid]}, weak:[{id,miss,cnt}], use:{f:ms}, since,
           imp:[{ik,e,n,s,href}], tn:{op}|null, wex:{ready,done}, cases:[ids] } */
  function build(x) {
    var L = x.lessons || [], byId = {}, h = hash(x.day || ""), cand = [], qids = x.qids || {};
    L.forEach(function (l) { byId[l.id] = l; });
    function add(s, pr) { s.pr = pr; cand.push(s); }
    // 🏫 back from the institute: today's newest class lesson(s)
    var cls = afterClass(x.day, x.hm) ? classNewest(L, dowOf(x.day)) : [];
    if (cls.length) add({ k: "cls", e: "🏫", id: cls[0].id, n: cls[0].n, href: cls[0].href, id2: cls[1] ? cls[1].id : "", n2: cls[1] ? cls[1].n : "" }, 1);
    // ⭐ today's exams / class exam / سؤال اليوم / class quiz + the tournament round
    (x.imp || []).slice(0, 2).forEach(function (g) { if (g && g.ik) add({ k: "imp", e: g.e || "📅", ik: g.ik, n: g.n || "", s: g.s || "", href: g.href || "index.html" }, 2); });
    if (x.tn) add({ k: "duel", e: "⚔️", op: x.tn.op || "", href: "index.html#duel" }, 2);
    var due = x.due | 0;
    if (due > 0) add({ k: "rev", e: "🔁", base: due, n: Math.min(due, 10), href: "quiz.html?t=review" + (due > 10 ? "&n=10" : "") }, 3);
    // 📖 the lesson of the day: the timetable's «درس اليوم», else where he stopped, else the first unread
    var cur = null;
    if (x.today && x.today.id && (!cls.length || (x.today.id !== cls[0].id && x.today.id !== (cls[1] && cls[1].id)))) {
      cur = byId[x.today.id] || null;
      add({ k: "today", e: "📖", id: x.today.id, pk: x.today.pk || "", href: x.today.href, n: x.today.n || (cur ? cur.n : ""), more: x.today.more | 0 }, 4);
    } else if (x.last && x.last.href && !cls.length) {
      cur = x.last.id && byId[x.last.id] ? byId[x.last.id] : null;
      add({ k: "cont", e: "📖", id: cur ? cur.id : "", href: x.last.href, n: cur ? cur.n : x.last.name || "", part: x.last.part || "" }, 4);
    } else if (!cls.length) {
      var un = L.filter(function (l) { return !l.read && l.score == null; });
      cur = un.filter(function (l) { return (l.q | 0) >= 3; })[0] || un[0] || null;
      if (cur) add({ k: "new", e: "📖", id: cur.id, href: cur.href, n: cur.n }, 4);
    }
    if (!cur && cls.length) cur = byId[cls[0].id] || null;
    // 🧑‍🏫 Osman: 2 questions on the lesson of the moment (class lesson → the one he's on → the last one studied → any with questions)
    var oc = [cls[0] && cls[0].id, cls[1] && cls[1].id, x.last && x.last.id].concat(x.recent || [], [cur && cur.id]).filter(Boolean);
    L.filter(function (l) { return l.score != null; }).sort(function (a, b) { return a.score - b.score; }).forEach(function (l) { oc.push(l.id); });
    var oid = ""; for (var i = 0; i < oc.length && !oid; i++) if ((qids[oc[i]] || []).length >= 2) oid = oc[i];
    if (!oid) { var any = L.filter(function (l) { return (qids[l.id] || []).length >= 2; }); if (any.length) oid = any[h % any.length].id; }
    var ol = byId[oid] || cur;
    add({ k: "osm", e: "🧑‍🏫", id: ol ? ol.id : "", n: ol ? ol.n : "", qs: oid ? pick2(qids[oid], h) : [] }, 0);
    // 💪 one lesson from his own mistakes, else the most faded one
    var onPath = [cur && cur.id, cls[0] && cls[0].id, oid].filter(Boolean);
    var wk = weakPick(x.weak, onPath), wl = wk ? byId[wk.id] : null;
    if (wl) add({ k: "weak", e: "💪", id: wl.id, n: wl.n, href: wl.href, miss: wk.miss | 0, cnt: wk.cnt | 0 }, 5);
    else {
      var fd = L.filter(function (l) { return l.score != null && l.score < 70 && onPath.indexOf(l.id) < 0; }).sort(function (a, b) { return a.score - b.score || (a.id < b.id ? -1 : 1); })[0];
      if (fd) add({ k: "fade", e: fd.score < 40 ? "🔴" : "🟡", id: fd.id, n: fd.n, score: fd.score, href: fcHref(fd) }, 6);
    }
    // 🎮 not used for 2+ days
    var cs = {}; (x.cases || []).forEach(function (c) { cs[c] = 1; });
    var caseL = L.filter(function (l) { return cs[l.id] && (l.score != null || l.read || (cur && l.id === cur.id)); });
    var u = usePick(x.use, x.since, x.day, h, { cases: caseL.length > 0 });
    if (u) {
      var uh = u.f === "games" ? "games.html" : u.f === "cards" ? ((wl || cur) ? fcHref(wl || cur) : "hifzi.html") : u.f === "cases" ? caseL[h % caseL.length].href.split("#")[0] + "?case=" + encodeURIComponent(caseL[h % caseL.length].id) : u.f === "quiz" ? "quiz.html?n=10" : u.f + ".html";
      add({ k: "use", e: { games: "🎮", cards: "🃏", cases: "🩺", quiz: "⚡", highlights: "🖍️", notes: "📒" }[u.f], f: u.f, days: u.days, never: u.never ? 1 : 0, href: uh }, 5);
    }
    if (x.wex && x.wex.ready && !x.wex.done) add({ k: "wex", e: "🏁", bonus: 1, href: "quiz.html?t=mixed" }, 7);
    if (cur && (cur.q | 0) >= 3 && cur.id !== oid) add({ k: "quiz", e: "⚡", id: cur.id, n: cur.n, href: "quiz.html?t=" + encodeURIComponent(cur.t) + (cur.l ? "&l=" + encodeURIComponent(cur.l) : "") + "&n=10" }, 8);
    var cc = caseL.filter(function (l) { return (!wl || l.id !== wl.id) && onPath.indexOf(l.id) < 0; }); if (!cc.length) cc = caseL.filter(function (l) { return !wl || l.id !== wl.id; });
    if (cc.length && !(u && u.f === "cases")) { var c = cc[h % cc.length]; add({ k: "case", e: "🩺", id: c.id, n: c.n, href: c.href.split("#")[0] + "?case=" + encodeURIComponent(c.id) }, 9); }
    // keep the 7 that matter most, then fill up to 5 with light ones
    cand.sort(function (a, b) { return a.pr - b.pr; });
    var steps = cand.slice(0, MAXS), has = {}; steps.forEach(function (s) { has[s.k + (s.f || "")] = 1; });
    var fill = [{ k: "game", e: "🎮", href: "games.html", pr: 10, x: "usegames" }, { k: "cards", e: "🃏", href: cur ? fcHref(cur) : "hifzi.html", pr: 11, x: "usecards" }, { k: "qall", e: "⚡", href: "quiz.html?n=10", pr: 12, x: "quiz" }];
    var ag = L.filter(function (l) { return (l.read || l.score != null) && !steps.some(function (s) { return s.id === l.id; }); });   // 📖 a quick look back at an old lesson
    if (ag.length) fill.push({ k: "again", e: "📖", id: ag[h % ag.length].id, n: ag[h % ag.length].n, href: ag[h % ag.length].href, pr: 13, x: "again" });
    else fill.push({ k: "hl", e: "🖍️", href: "highlights.html", pr: 13, x: "usehighlights" });
    fill.forEach(function (f) { if (steps.length < MINS && !has[f.x] && !has[f.k]) { delete f.x; steps.push(f); } else delete f.x; });
    steps.sort(function (a, b) { return ORDER[a.k] - ORDER[b.k]; });
    return steps;
  }
  function fcHref(l) { return U().fcHref ? U().fcHref(l) : String(l.href).split("#")[0] + "?fc=" + encodeURIComponent(l.id); }
  function lessonsNow() { return U().lessonsNow ? U().lessonsNow() : []; }
  function lastNow(L) { return U().lastNow ? U().lastNow(L) : null; }
  function hmB() { try { var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date()), o = {}; p.forEach(function (x) { o[x.type] = +x.value; }); return (o.hour % 24) * 60 + (o.minute | 0); } catch (e) { var d0 = new Date(); return d0.getHours() * 60 + d0.getMinutes(); } }
  var cqItems = [];                                      // 📝 class quiz rows (assets/qstats.js «nursin:tile»)
  function impNow() {                                    // ⭐ today's exams / class exam / سؤال اليوم / class quiz (signed in; assets/goals.js)
    var G = w.NursinGoals, gl = []; try { gl = G && G.list ? G.list() || [] : []; } catch (e) {}
    return gl.filter(function (g) { return /^(ex:|cls:|dq$)/.test(String(g.k)); }).concat(cqItems).map(function (g) { return { ik: String(g.k || g.id || g.n), e: g.e || "📝", n: g.n || "", s: g.s || "", href: g.href || "", done: !!g.done }; });
  }
  function tnNow() { var tn = lsGet("nursin_tn_v1"); return tn && tn.d === today() ? tn : null; }
  function weakNow() {                                   // mistakes per lesson (assets/weak.js items × the quiz bank)
    var it = (w.Weak && w.Weak.items ? w.Weak.items() : (lsGet("nursin_weak_v1") || {}).items) || {}, R = w.NursinRet, by = {};
    (w.QUIZ || []).forEach(function (q) { var e = it[q.id]; if (!e) return; var id = R && R.ofQ ? R.ofQ(q) : null; if (!id) return; var b = by[id] || (by[id] = { id: id, miss: 0, cnt: 0 }); b.miss += e.miss | 0 || 1; b.cnt++; });
    return Object.keys(by).map(function (k) { return by[k]; });
  }
  function qidsNow() { var R = w.NursinRet, m = {}; (w.QUIZ || []).forEach(function (q) { var id = R && R.ofQ ? R.ofQ(q) : null; if (id && q.id) (m[id] || (m[id] = [])).push(q.id); }); return m; }
  function todayNow() {                                  // the timetable's lesson of the day (assets/lessons.js todayPlan), first part not read
    var LS = w.NursinLessons; if (!LS || !LS.todayPlan) return null; var ps = [];
    try { ps = LS.todayPlan() || []; } catch (e) { return null; }
    var m = LS.readMap ? LS.readMap() : {}, un = ps.filter(function (x) { return !LS.isRead(x, m); }); if (!un.length) return null;
    var x = un[0]; return { id: LS.base(x), pk: LS.key(x), href: x.href, n: LS.label ? LS.label(x) : x.n, more: un.length - 1 };
  }
  function recentNow() {                                 // lessons studied lately (read, quiz, cards), newest first
    var x = lsGet("nursin_ret_v1"), L = x && x.L ? x.L : {};
    return Object.keys(L).filter(function (k) { return L[k] && L[k].t; }).sort(function (a, b) { return L[b].t - L[a].t; }).slice(0, 5);
  }
  function ctxNow() {
    var L = lessonsNow(), S = w.NursinSRS, RT = w.Retain, wx = { ready: false, done: false }, us = U().usage ? U().usage() : (lsGet("nursin_use_v1") || { f: {} }), tn = tnNow();
    try { var st = RT && RT.wstatus ? RT.wstatus() : null; if (st) wx = { ready: !!st.ready, done: !!st.done }; } catch (e) {}
    return { day: today(), hm: hmB(), due: S && S.count ? S.count() : 0, last: lastNow(L), lessons: L, today: todayNow(), qids: qidsNow(), weak: weakNow(), use: us.f || {}, since: us.s || 0,
      recent: recentNow(), imp: impNow().filter(function (g) { return !g.done; }), tn: tn && tn.k === "todo" ? { op: tn.op || "" } : null, wex: wx, cases: (RT && RT.CASE_IDS) || [] };
  }
  function plan() {
    var p = lsGet(PK), dk = today();
    if (p && p.d === dk && p.v === V && p.steps && p.steps.length) return upgrade(p);
    var steps = build(ctxNow()), now = Date.now();
    p = { v: V, d: dk, at: now, steps: steps, done: {}, vis: {}, ans: {}, cls: afterClass(dk, hmB()) ? 1 : 0 };
    lsSet(PK, p); push(p); return p;
  }
  // what changed since the morning: back from the institute → «راجع درس اليوم» joins; a new exam / class quiz / tournament round joins
  function upgrade(p) {
    var ch = false, x = null, now = Date.now();
    function ins(s) {
      s.at = now; p.steps.push(s); p.steps.sort(function (a, b) { return ORDER[a.k] - ORDER[b.k]; }); ch = true;
      while (p.steps.length > MAXS) {           // drop the lightest step not done yet (never Osman / class / ⭐)
        var drop = -1; p.steps.forEach(function (t, i) { if (/^(osm|cls|imp|duel)$/.test(t.k) || (p.done || {})[skey(t)]) return; if (drop < 0 || (t.pr | 0) >= (p.steps[drop].pr | 0)) drop = i; });
        if (drop < 0) break; p.steps.splice(drop, 1);
      }
    }
    if (!p.cls && afterClass(p.d, hmB())) {
      p.cls = 1; ch = true; x = ctxNow();
      var c = build(x).filter(function (s) { return s.k === "cls"; })[0];
      if (c && !p.steps.some(function (s) { return s.k === "cls"; })) ins(c);
    }
    var keys = {}; p.steps.forEach(function (s) { keys[skey(s)] = 1; });
    impNow().forEach(function (g) { var s = { k: "imp", e: g.e, ik: g.ik, n: g.n, s: g.s, href: g.href, pr: 2 }; if (!g.done && !keys[skey(s)] && p.steps.filter(function (t) { return t.k === "imp"; }).length < 2) { ins(s); keys[skey(s)] = 1; } });
    var tn = tnNow(); if (tn && tn.k === "todo" && !keys["duel:"]) ins({ k: "duel", e: "⚔️", op: tn.op || "", href: "index.html#duel", pr: 2 });
    if (ch) { lsSet(PK, p); push(p); }
    return p;
  }
  function retRec(id) { var x = lsGet("nursin_ret_v1"); return x && x.L ? x.L[id] || null : null; }
  function readAfter(id, at) {                           // a part of lesson `id` read after `at` (assets/lessons.js nursin_read_v1)
    if (!id) return false; var m = lsGet("nursin_read_v1") || {}, k;
    for (k in m) if ((k === id || k.indexOf(id + "#") === 0) && +m[k] > at) return true;
    return false;
  }
  function useAt(f) { var o = lsGet("nursin_use_v1"); return o && o.f ? +o.f[f] || 0 : 0; }
  // is step i done now? (once done it stays done for the day)
  function isDone(p, i) {
    var s = p.steps[i], key = skey(s), at = s.at || p.at, vis = (p.vis || {})[key] || 0, r;
    if ((p.done || {})[key]) return true;
    switch (s.k) {
      case "osm": var A = p.ans || {}; return s.qs && s.qs.length ? s.qs.every(function (q) { return A[q] != null; }) : vis > 0 && back(vis);
      case "rev": var S = w.NursinSRS, c = S && S.count ? S.count() : 0; return c <= Math.max(0, (s.base | 0) - (s.n | 0));
      case "today": if (s.pk) { var m = lsGet("nursin_read_v1") || {}; if (m[s.pk] || (s.pk.indexOf("#") > 0 && m[s.pk.split("#")[0]])) return true; } r = retRec(s.id); return !!(r && (r.rd || 0) > at);
      case "cls": r = retRec(s.id); return readAfter(s.id, at) || !!(r && (r.rd || 0) > at) || (!!s.id2 && readAfter(s.id2, at));
      case "cont": case "new": r = s.id ? retRec(s.id) : null; if ((r && (r.rd || 0) > at) || readAfter(s.id, at)) return true; return !s.id && vis > 0 && back(vis);
      case "quiz": r = retRec(s.id); return !!(r && r.t > at && r.t !== r.rd);
      case "weak": r = retRec(s.id); return readAfter(s.id, at) || !!(r && r.t > at && r.t !== r.rd);
      case "fade": r = retRec(s.id); return !!(r && r.t > at && r.t !== r.rd) || (vis > 0 && back(vis) && !!(r && r.t > vis));
      case "wex": try { var st = w.Retain && w.Retain.wstatus ? w.Retain.wstatus() : null; return !!(st && st.done); } catch (e) { return false; }
      case "imp": var g = impNow().filter(function (y) { return y.ik === s.ik; })[0]; return !!(g && g.done);
      case "duel": var tn = tnNow(); return !!(tn && tn.k && tn.k !== "todo");
      case "use": if (s.f === "games") { var o = lsGet("nursin_study_v1"); if (o && o.td === p.d && (o.tg | 0) > 0) return true; } return useAt(s.f) > at;
      case "game": var o2 = lsGet("nursin_study_v1"); return !!(o2 && o2.td === p.d && (o2.tg | 0) > 0) || useAt("games") > at;
      case "cards": return useAt("cards") > at || (vis > 0 && back(vis));
      case "case": return useAt("cases") > at || (vis > 0 && back(vis));
      case "qall": return useAt("quiz") > at || (vis > 0 && back(vis));
      case "again": r = retRec(s.id); return readAfter(s.id, at) || !!(r && r.t > at);
      case "hl": return useAt("highlights") > at || (vis > 0 && back(vis));
      default: return vis > 0 && back(vis);
    }
  }
  function back(vis) { return Date.now() - vis > 20e3; }     // opened the step and came back (≥ 20 s later)
  function refreshDone(p) {
    var ch = false; p.done = p.done || {};
    for (var i = 0; i < p.steps.length; i++) { var k = skey(p.steps[i]); if (!p.done[k] && isDone(p, i)) { p.done[k] = Date.now(); ch = true; } }
    if (ch) { lsSet(PK, p); push(p); } return p;
  }
  /* ☁️ one path for all his devices: users/{uid}.dayPath {d, at, steps, done, ans} (no new rule: the owner may merge a field on his
     own profile — the same way lessonsRead / goalsList ride there). Same day: the plan made first wins, done ticks and answers merge. */
  var pushT = 0;
  function fbA() { var A = w.NursinFB; return A && A.user && A.fs && A.db ? A : null; }
  function push(p) {
    if (!fbA() || !p) return; clearTimeout(pushT);
    pushT = setTimeout(function () { var A = fbA(); if (!A) return; try { A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { dayPath: { d: p.d, at: p.at, v: p.v, steps: p.steps, done: p.done || {}, ans: p.ans || {}, cls: p.cls | 0 } }, { merge: true }).catch(function () {}); } catch (e) {} }, 2500);
  }
  function merge(p, r) {                                 // pure (tests): local plan p + the account's copy r → the day's plan
    if (!r || typeof r !== "object" || r.d !== (p && p.d) || r.v !== V || !Array.isArray(r.steps) || !r.steps.length) return { p: p, ch: false };
    var ch = false, out = p;
    if (!p || (+r.at || 0) < (+p.at || 0)) { out = { v: V, d: r.d, at: +r.at || Date.now(), steps: r.steps.slice(0, MAXS), done: {}, vis: (p && p.vis) || {}, ans: {}, cls: r.cls | 0 }; ch = true; var k; if (p) { for (k in p.done || {}) out.done[k] = p.done[k]; for (k in p.ans || {}) out.ans[k] = p.ans[k]; } }
    var keys = {}; out.steps.forEach(function (s) { keys[skey(s)] = 1; });
    var d2 = r.done || {}, a2 = r.ans || {}, j;
    out.done = out.done || {}; out.ans = out.ans || {};
    for (j in d2) if (keys[j] && !out.done[j]) { out.done[j] = +d2[j] || Date.now(); ch = true; }
    for (j in a2) if (out.ans[j] == null && /^q\d{3}$/.test(j)) { out.ans[j] = a2[j] | 0; ch = true; }
    if (r.cls && !out.cls) { out.cls = 1; ch = true; }
    return { p: out, ch: ch };
  }
  function pull() {
    var A = fbA(); if (!A) return;
    A.fs.getDoc(A.fs.doc(A.db, "users", A.user.uid)).then(function (snap) {
      var r = snap.exists() ? snap.data().dayPath : null, p = lsGet(PK); if (p && (p.d !== today() || p.v !== V)) p = null;
      var m = merge(p, r); if (m.ch) { lsSet(PK, m.p); draw(); }
      if (!r || r.d !== today() || (m.p && JSON.stringify(m.p.done) !== JSON.stringify(r.done || {}))) push(m.p || plan());
    }, function () {});
  }
  function curName(s, id, n) {             // the lesson's name in the language shown now (the list is patched in 🇫🇷 by assets/lang.js)
    var L = (w.NLESSONS && w.NLESSONS.list) || []; id = id || s.id;
    for (var i = 0; id && i < L.length; i++) if (L[i].s + ":" + (L[i].l || L[i].t) === id) return L[i].n;
    return lname(n || s.n || "");
  }
  function daysTxt(n) { return FR() ? n + " jours" : n === 2 ? "يومين" : n <= 10 ? n + " أيام" : n + " يوم"; }
  var USE = {
    games: ["🎮 صرلك % ما لعبت", "🎮 Ça fait % que tu n'as pas joué", "🎮 جرّب لعبة وحدة", "🎮 Essaie un jeu", "وصّل، صح ولا غلط، الذاكرة… دور واحد بيكفّي", "Relier, vrai ou faux, mémoire… une partie suffit"],
    cards: ["🃏 صرلك % ما فتحت البطاقات", "🃏 Ça fait % que tu n'as pas ouvert les cartes", "🃏 جرّب البطاقات السريعة", "🃏 Essaie les cartes rapides", "١٠ بطاقات بس، عرفتها ولا لأ", "Juste 10 cartes, sue ou pas"],
    cases: ["🩺 صرلك % ما حلّيت حالة مريض", "🩺 Ça fait % que tu n'as pas fait de cas clinique", "🩺 جرّب حالة مريض", "🩺 Essaie un cas clinique", "حالة واقعية و٣–٤ أسئلة متل الامتحان", "Un cas réel et 3–4 questions comme à l'examen"],
    quiz: ["⚡ صرلك % ما عملت كويز", "⚡ Ça fait % que tu n'as pas fait de quiz", "⚡ جرّب كويز ١٠ أسئلة", "⚡ Essaie un quiz de 10 questions", "١٠ أسئلة من كل المواد", "10 questions de toutes les matières"],
    highlights: ["🖍️ صرلك % ما راجعت تعليماتك", "🖍️ Ça fait % que tu n'as pas revu tes surlignages", "", "", "🔁 راجع تعليماتي، دقيقتين", "🔁 Revois tes surlignages, 2 minutes"],
    notes: ["📒 صرلك % ما فتحت ملاحظاتك", "📒 Ça fait % que tu n'as pas ouvert tes notes", "", "", "مرّ عليهن دقيقة، بيثبّتوا الدرس", "Une minute dessus, ça fixe la leçon"]
  };
  function texts(s) {
    var nm = esc(curName(s));
    switch (s.k) {
      case "osm": return { tag: T("الأستاذ عثمان", "Professeur Osman"), t: s.qs && s.qs.length ? T("🧑‍🏫 سؤالين سريعين عن «", "🧑‍🏫 Deux questions rapides sur « ") + nm + T("»", " »") : T("🧑‍🏫 اسأل الأستاذ عثمان", "🧑‍🏫 Demande au Professeur Osman"), sub: T("بتجاوب هون بلا ما تفتح شي", "Tu réponds ici, sans rien ouvrir"), min: 2 };
      case "cls": return { tag: T("🏫 رجعت من المعهد", "🏫 De retour de l'institut"), t: T("راجع درس اليوم: ", "Révise la leçon du jour : ") + nm, sub: s.id2 ? T("وكمان «", "Et aussi « ") + esc(curName(s, s.id2, s.n2)) + T("»", " »") : T("مرّ عليه وهوّي بعدو سخن", "Pendant que c'est encore frais"), min: 8 };
      case "imp": return { tag: T("⭐ مهم اليوم", "⭐ Important aujourd'hui"), t: esc(s.n), sub: esc(s.s || ""), min: 10 };
      case "duel": return { tag: T("⭐ البطولة", "⭐ Le tournoi"), t: T("⚔️ دورك اليوم بالبطولة", "⚔️ C'est ton tour au tournoi") + (s.op ? T(" ضد ", " contre ") + "<bdi>" + esc(s.op) + "</bdi>" : ""), sub: T("٥ أسئلة بـ٨ دقايق، الرابح بيطلع عالدور الجاي", "5 questions en 8 minutes, le gagnant passe au tour suivant"), min: 4 };
      case "rev": return { tag: T("⭐ مراجعة", "⭐ Révision"), t: T("🔁 " + s.n + " أسئلة مراجعة", "🔁 " + s.n + " questions à réviser"), sub: T("مستحقّين اليوم من حفظك", "Prévues aujourd'hui dans ta mémoire"), min: Math.max(3, Math.round(s.n * 0.6)) };
      case "today": return { tag: T("⭐ درس اليوم", "⭐ Leçon du jour"), t: "📖 " + nm, sub: s.more ? T("+" + s.more + " من دروس هالأسبوع", "+" + s.more + " des leçons de la semaine") : T("قراية قصيرة من جدول صفّك", "Une courte lecture du programme de ta classe"), min: 6 };
      case "cont": return { tag: T("درس", "Leçon"), t: T("كمّل: ", "Continue : ") + nm, sub: s.part ? esc(s.part) : T("من وين وقفت", "Là où tu t'es arrêté(e)"), min: 6 };
      case "new": return { tag: T("درس جديد", "Nouvelle leçon"), t: nm, sub: T("خمس دقايق قراءة بيكفّوا لنبلّش", "Cinq minutes de lecture pour commencer"), min: 5 };
      case "quiz": return { tag: T("كويز", "Quiz"), t: T("⚡ 10 أسئلة: ", "⚡ 10 questions : ") + nm, sub: T("بعد الدرس دغري، تا يثبت", "Juste après la leçon, pour fixer"), min: 5 };
      case "weak": return { tag: T("💪 من نقاط ضعفك", "💪 Tes points faibles"), t: T("ادرس «", "Étudie « ") + nm + T("»", " »"), sub: T("غلطت فيه " + s.miss + (s.miss === 1 ? " مرّة" : s.miss === 2 ? " مرّتين" : " مرّات") + " · اقراه وبعدين جرّب الكويز", "Tu t'es trompé(e) " + s.miss + " fois · lis-la puis refais le quiz"), min: 8 };
      case "fade": return { tag: T("عم يروح منّك", "S'efface"), t: T("رجّع «", "Récupère « ") + nm + T("»", " »"), sub: T("🃏 بطاقات سريعة · حفظك ", "🃏 Cartes rapides · mémoire ") + (s.score | 0) + "%", min: 4 };
      case "case": return { tag: T("حالة مريض", "Cas clinique"), t: "🩺 " + nm, sub: T("حالة واقعية و٣–٤ أسئلة متل الامتحان", "Un cas réel et 3–4 questions comme à l'examen"), min: 6 };
      case "use": var u = USE[s.f] || USE.games, nv = s.never && u[2];
        return { tag: T("اقتراح إلك", "Suggestion pour toi"), t: nv ? T(u[2], u[3]) : T(u[0], u[1]).replace("%", daysTxt(s.days | 0)), sub: T(u[4], u[5]), min: 3 };
      case "wex": return { tag: T("⭐ بونص هالأسبوع", "⭐ Bonus de la semaine"), t: T("📝 الامتحان الأسبوعي المختلط", "📝 L'examen hebdo mixte"), sub: T("جاهز ✨ ~٢٠ سؤال من كل المواد", "Prêt ✨ ~20 questions de toutes les matières"), min: 20 };
      case "game": return { tag: T("لعبة", "Jeu"), t: T("🎮 العب لعبة وحدة", "🎮 Joue une partie"), sub: T("وصّل، صح ولا غلط، الذاكرة", "Relier, vrai ou faux, mémoire"), min: 3 };
      case "again": return { tag: T("رجعة سريعة", "Petit retour"), t: T("📖 مرّ ٥ دقايق على «", "📖 5 minutes sur « ") + nm + T("»", " »"), sub: T("درس قديم، تا ما يروح منّك", "Une ancienne leçon, pour ne pas l'oublier"), min: 5 };
      case "hl": return { tag: T("تعليماتي", "Mes surlignages"), t: T("🖍️ راجع تعليماتك", "🖍️ Revois tes surlignages"), sub: "", min: 3 };
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
  // ⏰ the line under the title: the moment of the day
  function phase(day, hm) {
    var wd = dowOf(day), cd = wd >= 4 && wd <= 6;
    if (cd && hm >= BACK) return T("🏠 رجعت من المعهد؟ منراجع يلي أخدتو اليوم", "🏠 De retour de l'institut ? On révise ce que tu as eu aujourd'hui");
    if (cd && hm >= 5 * 60) return T("🏫 يوم دوام (٧:٣٠–٢:٣٠): خطوات خفاف، والباقي بس ترجع", "🏫 Jour de cours (7h30–14h30) : étapes légères, le reste à ton retour");
    if (hm >= 5 * 60 && hm < 12 * 60) return T("☀️ صباح الخير! هيدا يومك خطوة خطوة", "☀️ Bonjour ! Voici ta journée, étape par étape");
    if (hm >= 12 * 60 && hm < 18 * 60) return T("🌤️ يومك خطوة خطوة، كمّل من وين وصلت", "🌤️ Ta journée étape par étape, continue où tu en es");
    return T("🌙 خطوات خفاف قبل ما تنام", "🌙 Quelques étapes légères avant de dormir");
  }
  /* 🧑‍🏫 Osman inside the path: greeting + mood (once a day, the same nursin_mood_v1 assets/coach.js reads), then 2 questions of the
     quiz bank, answered here: ✅/❌ + the explanation, like a real quiz answer (weak points, reviews and the lesson's memory move). */
  var MK = "nursin_mood_v1", fbQ = "", openK = "";
  function moodNow() { var m = lsGet(MK); return m && m.d === today() ? m.m : ""; }
  function qById(id) { var Q = w.QUIZ || []; for (var i = 0; i < Q.length; i++) if (Q[i].id === id) return Q[i]; return null; }
  function osmPrompt(s) { var n = curName(s); return T("اشرحلي بالمختصر أهم نقاط درس «" + n + "»، وبعدين اسألني سؤال واحد عليه", "Explique-moi en bref les points clés de la leçon « " + n + " », puis pose-moi une question dessus"); }
  function osmHtml(p, s, st) {
    var A = p.ans || {}, qs = (s.qs || []).map(qById).filter(Boolean), m = moodNow(), C = w.NursinCoach, cp = null, nm = first();
    try { cp = C && C.pick && C.data ? C.pick(C.data()) : null; } catch (e) {}
    var h = '<div class="bx hzosm" data-step="' + esc(skey(s)) + '"><span class="k"><span>' + (st === "now" ? "▶ " + T("هلّق", "Maintenant") + " • " : "") + T("🧑‍🏫 الأستاذ عثمان", "🧑‍🏫 Professeur Osman") + '</span><span class="mini">' + (st === "done" ? T("✅ خلصت", "✅ Fait") : "~2" + T(" د", " min")) + "</span></span>";
    if (!m) h += '<p class="hzoq">' + T("👋 أهلا" + (nm ? " <bdi>" + esc(nm) + "</bdi>" : "") + "! كيفك اليوم؟", "👋 Salut" + (nm ? " <bdi>" + esc(nm) + "</bdi>" : "") + " ! Comment ça va aujourd'hui ?") + '</p><div class="hzmood">' +
      [["good", "😊 منيح", "😊 Bien"], ["ok", "😐 عادي", "😐 Normal"], ["tired", "😴 تعبان", "😴 Fatigué"]].map(function (x) { return '<button type="button" data-hzmood="' + x[0] + '">' + T(x[1], x[2]) + "</button>"; }).join("") + "</div>";
    if (cp && (cp.rest || cp.brk)) {                    // 🌿 تعبان / 50 min without a break → rest first (same rule as before)
      h += '<p class="hzoq">' + esc(cp.txt) + "</p>" + (cp.rest ? '<div class="hzoa"><button type="button" class="go" data-hzrest>' + T("☕ بلّش بريك ١٠ دقايق", "☕ Pause de 10 min") + '</button><button type="button" class="hzlk" data-hzskip>' + T("⏭️ مش هلّق", "⏭️ Pas maintenant") + "</button></div>" : "");
      return h + "</div>";
    }
    if (!qs.length) return h + '<p class="hzoq">' + T("عندك سؤال عن أي درس؟ اسألني وبشرحلك 😉", "Une question sur une leçon ? Demande-moi, je t'explique 😉") + '</p><div class="hzoa"><a class="go" href="tutor.html">' + T("💬 اسأل عثمان", "💬 Demander à Osman") + " " + CHEV + "</a></div></div>";
    var nA = qs.filter(function (q) { return A[q.id] != null; }).length, nOk = qs.filter(function (q) { return A[q.id] === q.a; }).length;
    var ack = m === "good" ? T("حلو! 😊 ", "Super ! 😊 ") : m === "ok" ? T("ماشي، منمشيها خفيفة 🙂 ", "D'accord, on y va doucement 🙂 ") : m === "tired" ? "🌿 " : "";
    var fq = fbQ ? qById(fbQ) : null;
    if (fq && A[fq.id] != null) {                       // the answer just given: ✅/❌ + why
      var ok = A[fq.id] === fq.a;
      h += '<div class="hzqf ' + (ok ? "ok" : "bad") + '"><b>' + (ok ? T("✅ صح! برافو", "✅ Correct ! Bravo") : T("❌ الجواب: ", "❌ La réponse : ") + esc(fq.o[fq.a])) + "</b>" + (fq.x ? "<p>" + esc(fq.x) + "</p>" : "") + "</div>";
      if (nA >= qs.length) h += '<p class="hzoq">' + (nOk === qs.length ? T("🔥 " + nOk + "/" + qs.length + "! الأستاذ عثمان فخور فيك", "🔥 " + nOk + "/" + qs.length + " ! Le Professeur Osman est fier de toi") : T("💪 " + nOk + "/" + qs.length + ". الغلطات رح ترجعلك بالمراجعة 🔁", "💪 " + nOk + "/" + qs.length + ". Tes erreurs reviendront en révision 🔁")) + "</p>";
      h += '<div class="hzoa">' + (nA < qs.length ? '<button type="button" class="go" data-hznext>' + T("السؤال التاني", "Question suivante") + " " + CHEV + "</button>" : '<button type="button" class="go" data-hznext>' + T("خلصنا", "Terminé") + " ✓</button>").replace("data-hznext>" + T("خلصنا", "Terminé"), "data-hznext data-end>" + T("خلصنا", "Terminé")) + "</div>";
    } else if (nA < qs.length) {                        // the next question
      var q = qs[nA];
      h += '<p class="hzoq">' + (nA ? T("👨‍🏫 السؤال التاني:", "👨‍🏫 Deuxième question :") : ack + T("خلّيني اسألك سؤالين سريعين عن «", "Laisse-moi te poser deux questions rapides sur « ") + esc(curName(s)) + T("»", " »")) + '</p><div class="hzqq"><small>' + (nA + 1) + "/" + qs.length + "</small><p>" + esc(q.q) + '</p><div class="hzqo">' +
        q.o.map(function (o, k) { return '<button type="button" data-hzq="' + esc(q.id) + '" data-k="' + k + '"><span>' + (FR() ? "abc" : "أبج").charAt(k) + "</span>" + esc(o) + "</button>"; }).join("") + "</div></div>";
    } else {                                            // both answered
      h += '<p class="hzoq">' + (nOk === qs.length ? T("🔥 " + nOk + "/" + qs.length + "! الأستاذ عثمان فخور فيك", "🔥 " + nOk + "/" + qs.length + " ! Le Professeur Osman est fier de toi") : T("💪 " + nOk + "/" + qs.length + ". الغلطات رح ترجعلك بالمراجعة 🔁", "💪 " + nOk + "/" + qs.length + ". Tes erreurs reviendront en révision 🔁")) + "</p>";
    }
    h += '<div class="hzoa hzoa2"><a class="hzlk" href="tutor.html?q=' + encodeURIComponent(osmPrompt(s)) + '">' + T("💬 اسأل عثمان عن هالدرس", "💬 Demande à Osman sur cette leçon") + "</a></div>";
    return h + "</div>";
  }
  function pathHtml(p) {
    var tot = p.steps.length, dn = 0, cur = -1, i, D = p.done || {};
    for (i = 0; i < tot; i++) { if (D[skey(p.steps[i])]) dn++; else if (cur < 0) cur = i; }
    var all = dn === tot, near = !all && dn > 0 && tot - dn <= 2, mn = 0;
    try { var sa = lsGet("nursin_stact_v1"); mn = sa && sa.d === today() ? Math.floor(Math.max(sa.s | 0, sa.r | 0) / 60) : 0; } catch (e) {}
    var line = all ? T("🎉 خلصت مسار اليوم! برافو عليك، بكرا منكمّل 💪", "🎉 Parcours du jour terminé ! Bravo, on continue demain 💪")
      : T("خلصت " + dn + " من " + tot, dn + " sur " + tot + " terminé(s)") + (near ? T(" • قرّبت تخلص 🔥", " • Presque fini 🔥") : dn === 0 ? T(" • يلا نبلّش 💪", " • On commence 💪") : T(" • كمّل هيك 👏", " • Continue comme ça 👏"));
    var h = '<div class="hzph' + (all ? " all" : "") + '"><div class="hzrg">' + ring(dn, tot, 50) + '<div class="c"><b>' + dn + "/" + tot + "</b></div></div>" +
      '<div class="tx"><h2 id="hzpathh">' + T("🧭 مسار اليوم", "🧭 Parcours du jour") + '</h2><small>' + line + "</small></div></div>" +
      '<p class="hztm"><span>' + phase(p.d, hmB()) + "</span>" + (mn ? '<span class="hzmn">⏱️ ' + mn + T(" د اليوم", " min aujourd'hui") + "</span>" : "") + "</p>";
    h += '<ol class="hztl">';
    for (i = 0; i < tot; i++) {
      var s = p.steps[i], x = texts(s), k = skey(s), st = D[k] ? "done" : i === cur ? "now" : "todo";
      if (s.bonus && st !== "done") st += " bonus";
      h += '<li class="hzst ' + st + (s.k === "osm" ? " hzosmst" : "") + '"><span class="nd" aria-hidden="true"><i>' + (D[k] ? "✓" : s.e) + "</i></span>";
      if (s.k === "osm" && ((st.indexOf("now") === 0) || openK === k || (fbQ && s.qs && s.qs.indexOf(fbQ) > -1))) { h += osmHtml(p, s, st.indexOf("now") === 0 ? "now" : D[k] ? "done" : "todo") + "</li>"; continue; }
      var duel = s.k === "duel";
      h += (duel ? '<button type="button" class="bx" data-hzduel data-step="' + esc(k) + '">' : '<a class="bx" href="' + esc(s.href) + '" data-step="' + esc(k) + '">') + '<span class="k"><span>' + (st.indexOf("now") === 0 ? "▶ " + T("هلّق", "Maintenant") + " • " : "") + x.tag + '</span><span class="mini">' +
        (D[k] ? T("✅ خلصت", "✅ Fait") : "~" + x.min + T(" د", " min")) + "</span></span>" +
        (st.indexOf("now") === 0 ? "<h3>" + x.t + "</h3>" + (x.sub ? "<p>" + x.sub + "</p>" : "") + '<span class="nowft"><small>' + T("الخطوة ", "Étape ") + (i + 1) + T(" من ", " sur ") + tot + '</small><span class="go">' + (dn ? T("كمّل", "Continuer") : T("ابدأ", "Commencer")) + " " + CHEV + "</span></span>"
          : "<b>" + x.t + "</b>" + (x.sub && s.k !== "osm" && (s.k === "weak" || s.k === "use" || s.k === "cls" || s.k === "imp") ? "<small>" + x.sub + "</small>" : "")) + (duel ? "</button>" : "</a>") + "</li>";
    }
    h += "</ol>";
    return h;
  }

  /* ---------------- the page ---------------- */
  function hourB() { try { return +new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", hour12: false }).format(new Date()) % 24; } catch (e) { return new Date().getHours(); } }
  function greet(hr) { return hr >= 5 && hr < 12 ? T("صباح الخير ☀️", "Bonjour ☀️") : hr >= 12 && hr < 17 ? T("نهارك سعيد 🌤️", "Bon après-midi 🌤️") : T("مسا الخير 🌙", "Bonsoir 🌙"); }
  function first() {
    if (w.NursinName) return w.NursinName.greetName();          // ✏️ a name he chose shows whole; a Google name by its first word (assets/name.js)
    var A = w.NursinFB, me = N().me, n = (A && A.profile && A.profile.name) || (me && me.name) || ""; return String(n).trim().split(/\s+/)[0].slice(0, 18); }
  function streak() {
    var n = N(), me = n.me, s = 0, St = w.NursinStudy;
    try { if (me && n.streakNow) s = n.streakNow(me) | 0; else if (me && me.sDay) { var dk = today(), y = new Date(dk + "T12:00:00Z"); y.setUTCDate(y.getUTCDate() - 1); s = (me.sDay === dk || me.sDay === y.toISOString().slice(0, 10)) ? me.streak | 0 : 0; } } catch (e) {}
    try { var o = lsGet("nursin_study_v1"); if (St && St.streakNow && o) s = Math.max(s, St.streakNow(o) | 0); } catch (e) {}
    return s;
  }
  var root = null;
  function headHtml() {
    var nm = first(), bell = d.querySelector(".topbar .annbell"), dot = !!(bell && bell.classList.contains("on"));       // assets/announce.js: «on» = unread
    return '<div class="hzhd"><button class="hzav" type="button" data-hz="avatar" aria-label="' + T("غيّر صورتك", "Changer d'avatar") + '">' + (U().avHtml ? U().avHtml("hzavi") : '<span class="hzavi hzavx" aria-hidden="true">🙂</span>') + '<span class="hzavp" aria-hidden="true">✎</span></button>' +
      '<div class="t"><small>' + greet(hourB()) + "</small><b>" + (nm ? "<bdi>" + esc(nm) + "</bdi> 👋" : T("يا بطل 👋", "champion 👋")) + "</b></div>" +
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
  function footHtml() {
    var R = w.NursinRet, c = null; try { c = R && R.counts ? R.counts() : null; } catch (e) {}
    var tn = tnNow();
    return '<button type="button" class="hzft" data-hzduel><span aria-hidden="true">⚔️</span><span><b>' + T("بطولة صفّك", "Le tournoi de ta classe") + "</b><small>" + esc(tn && tn.txt ? tn.txt : T("الجدول، الترتيب والجوائز", "Tableau, classement et prix")) + "</small></span></button>" +
      '<a class="hzft" href="hifzi.html"><span aria-hidden="true">🗺️</span><span><b>' + T("حفظي", "Ma mémoire") + "</b><small>" + (c ? '<i class="rdot r-green"></i>' + c.green + ' <i class="rdot r-yellow"></i>' + c.yellow + ' <i class="rdot r-red"></i>' + c.red : T("خريطة حفظك لكل الدروس", "La carte de ta mémoire")) + "</small></span></a>";
  }
  var parts = null;
  function draw() {
    if (!root) return;
    if (!parts) {                                        // built once: the tournament card (#duel, drawn by assets/duel.js) lives inside the path
      root.innerHTML = '<div class="hztop"></div><section class="hzpath" aria-labelledby="hzpathh"><div class="hzpin"></div>' +
        '<div class="hzfoot"></div><div class="hzduelbox" id="hzduelbox" hidden></div></section><div class="hzsubw"></div>';
      parts = { top: root.querySelector(".hztop"), pin: root.querySelector(".hzpin"), foot: root.querySelector(".hzfoot"), duel: root.querySelector(".hzduelbox"), subs: root.querySelector(".hzsubw") };
      var du = d.getElementById("duel"); if (du) parts.duel.appendChild(du);
    }
    var p = refreshDone(plan());
    parts.top.innerHTML = headHtml() + chipsHtml();
    parts.pin.innerHTML = pathHtml(p);
    parts.foot.innerHTML = footHtml();
    parts.subs.innerHTML = subsHtml();
  }
  function openDuel(scroll) {
    if (!parts) return; parts.duel.hidden = false;
    var du = d.getElementById("duel"), el = du || parts.duel;
    if (scroll !== false) setTimeout(function () { el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); el.classList.add("pulse"); setTimeout(function () { el.classList.remove("pulse"); }, 1200); }, 30);
  }
  function save(p) { lsSet(PK, p); push(p); }
  function stepClick(e) {
    var t = e.target.closest ? e.target : e.target.parentElement, p = lsGet(PK); if (!p || p.d !== today() || p.v !== V) return;
    var b;
    if ((b = t.closest("[data-hzmood]"))) { lsSet(MK, { d: today(), m: b.getAttribute("data-hzmood"), t: Date.now() }); draw(); return; }
    if ((b = t.closest("[data-hzrest]")) || t.closest("[data-hzskip]")) {
      var sk = !b; lsSet("nursin_brk_v1", sk ? { at: Date.now(), s: 1 } : { at: Date.now() });
      if (!sk && w.NursinStudy && w.NursinStudy.pomoBreak) w.NursinStudy.pomoBreak(10);
      try { d.dispatchEvent(new CustomEvent("nursin:rest")); } catch (x) {} draw(); return;
    }
    if ((b = t.closest("[data-hzq]"))) {                 // 🧑‍🏫 an answer to Osman's question
      var q = qById(b.getAttribute("data-hzq")), k = +b.getAttribute("data-k"); if (!q) return;
      p.ans = p.ans || {}; if (p.ans[q.id] != null) return;
      p.ans[q.id] = k; fbQ = q.id; save(p);
      var ok = k === q.a;
      try { if (w.Weak) w.Weak.record(q, ok); } catch (x) {}
      try { if (w.NursinSRS) w.NursinSRS.record(q, ok); } catch (x) {}
      try { var R = w.NursinRet, id = R && R.ofQ ? R.ofQ(q) : null; if (id && R.apply) R.apply(id, ok ? "ok" : "bad"); } catch (x) {}
      draw(); return;
    }
    if ((b = t.closest("[data-hznext]"))) { fbQ = ""; if (b.hasAttribute("data-end")) openK = ""; draw(); return; }
    if ((b = t.closest("[data-hzduel]"))) { var dk = b.getAttribute("data-step"); if (dk) { p.vis = p.vis || {}; p.vis[dk] = Date.now(); lsSet(PK, p); } else if (parts && !parts.duel.hidden) { parts.duel.hidden = true; return; } openDuel(); return; }
    var a = t.closest("a[data-step]"); if (!a) return;
    var key = a.getAttribute("data-step");
    if (/^osm:/.test(key)) { e.preventDefault(); openK = openK === key ? "" : key; draw(); return; }
    p.vis = p.vis || {}; p.vis[key] = Date.now(); lsSet(PK, p);
  }
  function init() {
    root = d.getElementById("hz"); if (!root) return;
    d.body.classList.add("hzon");
    draw();
    root.addEventListener("click", stepClick);          // the [data-hz] buttons (avatar, 🔔, search, chips, «الكل») are handled by assets/ui.js
    var t = 0, redraw = function () { clearTimeout(t); t = setTimeout(draw, 60); };
    ["nursin:ret", "nursin:srs", "nursin:me", "nursin:wexam", "nursin:theme", "nursin:avatar", "nursin:name", "nursin:goals", "nursin:tourney", "nursin:lesson-read", "nursin:weekles", "nursin:use", "nursin:study", "nursin:rest"].forEach(function (ev) { d.addEventListener(ev, redraw); });
    d.addEventListener("nursin:auth", function (e) { redraw(); if (e.detail && e.detail.signedIn) setTimeout(pull, 1200); });
    d.addEventListener("nursin:tile", function (e) { var x = e.detail || {}; if (x.k === "cq") { cqItems = (x.items || []).map(function (y) { return { k: "cq:" + (y.href || y.n), e: y.e || "📝", n: y.n, s: y.s, href: y.href, done: !!y.done }; }); redraw(); } });
    d.addEventListener("visibilitychange", function () { if (!d.hidden) redraw(); });
    w.addEventListener("pageshow", redraw); w.addEventListener("focus", redraw);
    w.addEventListener("storage", function (e) { if (e.key === PK || e.key === AK || e.key === "nursin_ret_v1" || e.key === "nursin_srs_v1" || e.key === "nursin_read_v1" || e.key === "nursin_use_v1") redraw(); });
    setTimeout(redraw, 1500); setTimeout(redraw, 4000);       // the bell, the streak and the profile arrive a bit later
    setInterval(function () { if (!d.hidden) redraw(); }, 5 * 60e3);   // ⏰ 2:30 PM on a class day: «راجع درس اليوم» joins by itself
    if (location.hash === "#avatar") setTimeout(function () { if (U().picker) U().picker(null); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }, 700);
    if (location.hash === "#duel") setTimeout(function () { openDuel(); }, 500);
  }
  var UI = U();
  w.HomePath = { build: build, plan: plan, isDone: isDone, refreshDone: refreshDone, merge: merge, skey: skey, usePick: usePick, weakPick: weakPick, classNewest: classNewest, afterClass: afterClass, openDuel: openDuel, V: V, MAXS: MAXS, MINS: MINS, ALL: UI.ALL, SUBJ: SUBJ, KEY: PK, AKEY: AK, setAvatar: UI.setAvatar, avUrl: UI.avUrl, AVN: UI.AVN, shrink: UI.shrink, texts: texts, greet: greet, open: UI.open, picker: UI.picker, close: UI.close };
  if (!d || !d.getElementById) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
