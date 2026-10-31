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
  var PK = "nursin_path_v1", AK = "nursin_avatar_v1", DAY = 864e5, V = 1;
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
  function fcHref(l) { return U().fcHref(l); }
  function lessonsNow() { return U().lessonsNow ? U().lessonsNow() : []; }
  function lastNow(L) { return U().lastNow ? U().lastNow(L) : null; }
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
  function draw() {
    if (!root) return;
    var p = refreshDone(plan());
    root.innerHTML = '<div class="hztop">' + headHtml() + chipsHtml() + "</div>" +
      '<section class="hzpath" aria-labelledby="hzpathh">' + pathHtml(p) + "</section>" + subsHtml();
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
    root.addEventListener("click", stepClick);          // the [data-hz] buttons (avatar, 🔔, search, chips, «الكل») are handled by assets/ui.js
    var t = 0, redraw = function () { clearTimeout(t); t = setTimeout(draw, 60); };
    ["nursin:ret", "nursin:srs", "nursin:me", "nursin:auth", "nursin:wexam", "nursin:theme", "nursin:avatar", "nursin:name"].forEach(function (ev) { d.addEventListener(ev, redraw); });
    d.addEventListener("visibilitychange", function () { if (!d.hidden) redraw(); });
    w.addEventListener("pageshow", redraw); w.addEventListener("focus", redraw);
    w.addEventListener("storage", function (e) { if (e.key === PK || e.key === AK || e.key === "nursin_ret_v1" || e.key === "nursin_srs_v1") redraw(); });
    setTimeout(redraw, 1500); setTimeout(redraw, 4000);       // the bell, the streak and the profile arrive a bit later
    if (location.hash === "#avatar") setTimeout(function () { if (U().picker) U().picker(null); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }, 700);
  }
  var UI = U();
  w.HomePath = { build: build, plan: plan, isDone: isDone, refreshDone: refreshDone, ALL: UI.ALL, SUBJ: SUBJ, KEY: PK, AKEY: AK, setAvatar: UI.setAvatar, avUrl: UI.avUrl, AVN: UI.AVN, shrink: UI.shrink, texts: texts, greet: greet, open: UI.open, picker: UI.picker, close: UI.close };
  if (!d || !d.getElementById) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); }); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
