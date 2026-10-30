/* 🗺️ nursin «حفظي» core — loaded on every page right after lessons.js (Abdullah, Oct 29 2026 11:36–11:45 PM: «شي ممكن نضيفه للموقع
   كرمال الدرس ما يروح من ذهنه للطالب» → retention map + quick search + transitions; «وإذا فيك اتضيف إيماءات عند الدخول والخروج من اي شي»).
   1) RETENTION: every lesson of every مادة (window.NLESSONS.list) gets a score 0–100 that fades with time (forgetting curve):
        score(now) = r · 2^(−days since t / h)      r = the score right after the last event, h = half-life in days
      events (all already on the site, this device only, localStorage nursin_ret_v1):
        📖 reading the lesson (first read from lessons.js, or 60 s with the lesson open)  → r = max(now, 75)
        📝 a quiz answer of that lesson (nursin:answer, quiz.js)       right → r += (100−r)·0.3   wrong → r ·= 0.65, h ·= 0.8
        🃏 a flashcard (nursin:flash, assets/cards.js)                  right → r += (100−r)·0.2   wrong → r ·= 0.75, h ·= 0.85
        a right answer/card ≥ 20 h after the last «successful review» = a new successful review → h ·= 1.8 (cards 1.5), max 60 days
      first half-life 2 days. Old data counts once (backfill): lessons already read (nursin_read_v1), spaced-repetition items
      (nursin_srs_v1), weak points (nursin_weak_v1). 🟢 ≥ 70 · 🟡 40–69 · 🔴 < 40 · ⚪ never studied.
      Shown on hifzi.html (by مادة), as a dot beside each lesson title on the subject pages, and red ones feed Osman (assets/coach.js).
      Nothing is sent anywhere except the small study summary goals.js already mirrors for 🔔 (NursinRet.studyState()).
   2) 🔎 quick search (header button on every page + the «📚 المواد» sheet): lesson names, مادة names, and the words of each lesson's
      own quiz questions and drug cards (loaded only when the search opens). Arabic + French, accents/hamza/ة folded.
   3) ✨ transitions: page enter/leave (View Transitions where the browser has them, else a 150 ms fade), sheets slide, details
      open/close, 150–300 ms, nothing at all with prefers-reduced-motion. BATCH 2 (teach Osman, say it in your words, patient case,
      weekly mixed exam, morning question) can plug into NursinRet.apply(id, kind) and NursinRet.weakest(). */
(function (w, d) {
  var K = "nursin_ret_v1", DAY = 864e5, H0 = 2, HMAX = 60, GAP = 20 * 36e5;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function reduced() { try { return w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  if (!/\.html$/.test(page)) page = "index.html";

  /* 🇫🇷 the new UI pieces drawn as plain text by other scripts (nav labels, static text of hifzi.html / me.html) */
  if (w.Lang && w.Lang.fr && w.Lang.add) w.Lang.add({
    "صفّي": "Ma classe", "أنا": "Moi", "تمارين": "Exercices", "🗺️ حفظي": "🗺️ Ma mémoire", "حفظي": "Ma mémoire", "🔎 دوّر على درس": "🔎 Chercher une leçon",
    "خريطة حفظك لكل الدروس": "La carte de ta mémoire pour toutes les leçons", "🏆 البطولة": "🏆 Le tournoi", "🟢 مين أونلاين": "🟢 Qui est en ligne",
    "👤 أنا": "👤 Moi", "⚔️ صفّي": "⚔️ Ma classe", "📝 تمارين": "📝 Exercices", "🔁 مراجعة اليوم": "🔁 Révision du jour",
    "👨‍🏫 اسأل الأستاذ عثمان": "👨‍🏫 Demande au Professeur Osman", "بيشرحلك أي شي من الدروس": "Il t'explique n'importe quoi des leçons",
    "نقاطك، المظهر، الإشعارات، البومودورو والإعدادات": "Tes points, l'apparence, les notifications, le pomodoro et les réglages",
    "الأسئلة المستحقة اليوم": "Les questions à réviser aujourd'hui", "الحفظ، نقاط ضعفك والأخطاء الشائعة": "Mémoire, points faibles et erreurs fréquentes",
    "بطولة الأسبوع بصفّك": "Le tournoi de la semaine de ta classe", "مين من صفّك وأصحابك هلّق": "Qui de ta classe et de tes amis est là maintenant",
    "🗺️ حفظي": "🗺️ Ma mémoire", "حفظي": "Ma mémoire", "👤 أنا": "👤 Moi", "البطولة": "Le tournoi", "مين أونلاين": "Qui est en ligne", "دوّر على درس": "Chercher une leçon", "اكتب أي كلمة بالعربي أو بالفرنسي": "Tape n'importe quel mot, en arabe ou en français",
    "اسأل الأستاذ عثمان": "Demande au Professeur Osman", "مراجعة اليوم": "Révision du jour", "🗂️ جدول البطولة، الترتيب والجوائز": "🗂️ Tableau du tournoi, classement et prix",
    "📌 الأهمّيات": "📌 L'essentiel", "الأهمّيات": "L'essentiel", "خريطة حفظك لكل الدروس": "La carte de ta mémoire pour toutes les leçons", "⚙️ الإعدادات": "⚙️ Réglages",
    "🔔 إشعارات الأستاذ عثمان": "🔔 Notifications du Professeur Osman", "🌙 ما في إشعارات من": "🌙 Pas de notifications de", "لـ": "à",
    "✅ شغّال: الأستاذ عثمان بيقرّر لحالو إيمتى لازم تدرس وبيبعتلك (٣ بالنهار بالكتير، ومش بساعات الهدوء).": "✅ Activé : le Professeur Osman décide lui-même quand tu dois étudier et t'envoie un message (3 par jour au maximum, jamais pendant les heures calmes).",
    "الأستاذ عثمان بيعرف إيمتى ما درست، أو إذا درس عم يروح منّك، أو عندك مراجعات أو دور بالبطولة، وبيبعتلك إشعار.": "Le Professeur Osman voit quand tu n'as pas étudié, quand une leçon s'efface, quand tu as des révisions ou un match au tournoi, et t'envoie une notification.",
    "✅ تمام! الأستاذ عثمان رح يقرّر لحالو إيمتى يذكّرك تدرس، وما بيزعجك بساعات الهدوء.": "✅ Parfait ! Le Professeur Osman décidera lui-même quand te rappeler d'étudier, sans te déranger pendant les heures calmes.",
    "🔕 وقّفنا إشعارات الأستاذ عثمان. (إشعارات الرسائل بتضل متل ما هي)": "🔕 Notifications du Professeur Osman arrêtées. (Les notifications de messages restent comme avant)"
  }, true);

  /* ---------------- lessons ---------------- */
  function lessons() { return (w.NLESSONS && w.NLESSONS.list) || []; }
  function lid(x) { return x.s + ":" + (x.l || x.t); }
  function find(id) { var L = lessons(); for (var i = 0; i < L.length; i++) if (lid(L[i]) === id) return L[i]; return null; }
  function ofQ(q) {                                     // the lesson a quiz question belongs to (cardio/neuro: its topic; others: its lesson key)
    if (!q) return null; var L = lessons();
    for (var i = 0; i < L.length; i++) { var x = L[i]; if (x.t === q.t && (!x.l || x.l === q.l)) return lid(x); }
    return null;
  }
  function subjects() { return (w.NLESSONS && w.NLESSONS.subjects) || {}; }
  function lname(x) { return x ? x.n : ""; }

  /* ---------------- the forgetting curve (pure; tests call NursinRet.at / NursinRet.step) ---------------- */
  function at(rec, now) { if (!rec) return null; var dt = Math.max(0, now - rec.t) / DAY; return Math.max(0, Math.min(100, rec.r * Math.pow(2, -dt / (rec.h || H0)))); }
  function step(rec, kind, now) {
    var cur = rec ? at(rec, now) : 0, h = rec ? rec.h || H0 : H0, g = rec ? rec.g || 0 : 0, n = rec ? rec.n | 0 : 0, r = cur;
    var good = kind === "ok" || kind === "fok", review = good && rec && now - g >= GAP && cur >= 25;
    if (kind === "read") { r = Math.max(cur, 75); if (rec && now - (rec.rd || 0) >= GAP) h = Math.min(HMAX, h * 1.3); }
    else if (kind === "ok") r = rec ? cur + (100 - cur) * 0.3 : 50;
    else if (kind === "fok") r = rec ? cur + (100 - cur) * 0.2 : 45;
    else if (kind === "bad") { r = rec ? cur * 0.65 : 25; h = Math.max(0.75, h * 0.8); }
    else if (kind === "fbad") { r = rec ? cur * 0.75 : 25; h = Math.max(0.75, h * 0.85); }
    else return rec;
    if (review) { h = Math.min(HMAX, h * (kind === "ok" ? 1.8 : 1.5)); g = now; n++; }
    else if (good && !rec) g = now;
    var out = { r: Math.round(Math.min(100, r) * 10) / 10, t: now, h: Math.round(h * 100) / 100, g: g, n: n };
    if (kind === "read") out.rd = now; else if (rec && rec.rd) out.rd = rec.rd;
    return out;
  }
  function color(s) { return s == null ? "grey" : s >= 70 ? "green" : s >= 40 ? "yellow" : "red"; }

  /* ---------------- store ---------------- */
  function load() { var x = lsGet(K); return x && x.L && typeof x.L === "object" ? x : { v: 1, L: {} }; }
  var tSave = 0;
  function save(x) { lsSet(K, x); clearTimeout(tSave); tSave = setTimeout(function () { try { d.dispatchEvent(new CustomEvent("nursin:ret")); } catch (e) {} }, 60); }
  function apply(id, kind, now) {
    if (!id || !find(id)) return null;
    var x = load(); now = now || Date.now();
    x.L[id] = step(x.L[id], kind, now); save(x); return x.L[id];
  }
  function score(id, now) { return at(load().L[id], now || Date.now()); }
  // the old data counts once (lessons read, spaced-repetition items, weak points), oldest first
  function backfill() {
    var x = load(); if (x.b || !w.QUIZ) return;          // runs once, on a page that has the question bank (home, quiz, hifzi…)
    var ev = [], bank = {};
    w.QUIZ.forEach(function (q) { bank[q.id] = q; });
    var rd = lsGet("nursin_read_v1") || {};
    Object.keys(rd).forEach(function (k) { var id = k.split("#")[0]; if (find(id) && +rd[k] > 0) ev.push([+rd[k], id, "read"]); });
    var srs = (lsGet("nursin_srs_v1") || {}).items || {};
    Object.keys(srs).forEach(function (k) { var it = srs[k], id = ofQ(bank[k]); if (!id || !it) return; ev.push([+it.m || Date.now(), id, it.s > 0 ? "ok" : "bad"]); });
    var wk = (lsGet("nursin_weak_v1") || {}).items || {};
    Object.keys(wk).forEach(function (k) { var it = wk[k], id = ofQ(bank[k]); if (!id || !it) return; ev.push([+it.last || Date.now() - DAY, id, "bad"]); });
    ev.sort(function (a, b) { return a[0] - b[0]; });
    ev.forEach(function (e) { if (!x.L[e[1]] || x.L[e[1]].t <= e[0]) x.L[e[1]] = step(x.L[e[1]], e[2], Math.min(e[0], Date.now())); });
    x.b = 1; save(x);
  }
  function list(now) {
    now = now || Date.now(); var x = load();
    return lessons().map(function (l) { var id = lid(l), s = at(x.L[id], now); return { id: id, s: l.s, n: l.n, href: l.href, score: s == null ? null : Math.round(s), color: color(s) }; });
  }
  // the lessons that are fading the most (studied, under 70), weakest first — Osman's reminders and the worker's «weakest lesson»
  function weakest(k, now) { return list(now).filter(function (l) { return l.score != null && l.score < 70; }).sort(function (a, b) { return a.score - b.score; }).slice(0, k || 2); }
  function counts(now) { var c = { green: 0, yellow: 0, red: 0, grey: 0 }; list(now).forEach(function (l) { c[l.color]++; }); return c; }
  function tnPending() { var tn = lsGet("nursin_tn_v1"), N = w.Nursin, day = N && N.dayKey ? N.dayKey() : ""; return !!(tn && tn.k === "todo" && (!day || tn.d === day)); }
  // 🔔 the small study summary the site mirrors on the student's own profile (goals.js) so worker v9 can judge when Osman nudges
  function studyState(now) {
    now = now || Date.now();
    var N = w.Nursin, day = N && N.dayKey ? N.dayKey() : new Date(now + 2 * 36e5).toISOString().slice(0, 10);
    var st = lsGet("nursin_stact_v1"), ct = lsGet("nursin_cont_v1"), min = st && st.d === day ? Math.floor(Math.max(st.s || 0, st.r || 0) / 60) : 0;
    var last = Math.max(ct && ct.l || 0, lsGet("nursin_lastact_v1") || 0), S = w.NursinSRS, wk = weakest(1, now)[0] || null, c = counts(now);
    return { stAt: last | 0 ? Math.floor(last) : 0, stDay: day, stMin: Math.min(1440, min | 0), stDue: S && S.count ? Math.min(400, S.count() | 0) : 0, stRed: c.red,
      stWeak: wk ? String(wk.n).slice(0, 80) : "", stWeakId: wk ? wk.id : "", stWeakHref: wk ? String(wk.href).slice(0, 120) : "", stWeakPct: wk ? wk.score : -1, stTn: tnPending() };
  }

  /* ---------------- events ---------------- */
  d.addEventListener("nursin:answer", function (e) {
    var x = e.detail || {}; if (!x.qid) return;
    var q = null; (w.QUIZ || []).some(function (y) { if (y.id === x.qid) { q = y; return true; } return false; });
    apply(ofQ(q), x.ok ? "ok" : "bad"); lsSet("nursin_lastact_v1", Date.now());
  });
  d.addEventListener("nursin:flash", function (e) { var x = e.detail || {}; apply(x.id, x.ok ? "fok" : "fbad"); lsSet("nursin_lastact_v1", Date.now()); });
  d.addEventListener("nursin:lesson-read", function (e) { var x = e.detail || {}; if (x.k) apply(String(x.k).split("#")[0], "read"); });

  /* ---------------- 📖 reading on a subject page: 60 s with a lesson open = a read (once per 20 h per lesson) ---------------- */
  function pageLessons() { return lessons().filter(function (l) { return l.href.split("#")[0] === page; }); }
  function lessonOfEl(el) {                             // a <details> of this page → its lesson (anchor, anchor-p2…)
    var id = el && el.id; if (!id) return null; var L = pageLessons();
    for (var i = 0; i < L.length; i++) { var a = L[i].href.split("#")[1]; if (a && (id === a || id.indexOf(a + "-p") === 0)) return L[i]; }
    return null;
  }
  var readT = null;
  function watchRead() {
    if (!pageLessons().length) return;
    function tick() {
      if (d.hidden) return;
      var open = d.querySelectorAll("details[open]"), seen = {};
      for (var i = 0; i < open.length; i++) { var l = lessonOfEl(open[i]); if (!l) continue; var r = open[i].getBoundingClientRect(); if (r.bottom < 0 || r.top > (w.innerHeight || 800)) continue; seen[lid(l)] = 1; }
      if (page === "henderson.html") pageLessons().forEach(function (l) { seen[lid(l)] = 1; });
      var m = lsGet("nursin_retread_v1") || {}, now = Date.now(), ch = false;
      Object.keys(seen).forEach(function (id) { var c = m[id] || { s: 0, at: 0 }; if (now - c.at < GAP) return; c.s += 15; if (c.s >= 60) { c = { s: 0, at: now }; apply(id, "read"); } m[id] = c; ch = true; });
      if (ch) lsSet("nursin_retread_v1", m);
      lsSet("nursin_lastact_v1", now);
    }
    readT = setInterval(tick, 15000);
  }

  /* ---------------- dots beside each lesson title on its subject page ---------------- */
  function dotHtml(s) {
    var c = color(s), lbl = s == null ? T("ما درستو بعد", "Pas encore étudiée") : T("حفظك: ", "Mémoire : ") + Math.round(s) + "%";
    return '<span class="rdot r-' + c + '" role="img" aria-label="' + esc(lbl) + '" title="' + esc(lbl) + '"></span>';
  }
  function paintDots() {
    var now = Date.now();
    pageLessons().forEach(function (l) {
      var a = l.href.split("#")[1], host = null;
      if (a) { var el = d.getElementById(a); if (el) host = el.querySelector("summary .t b") || el.querySelector("summary b") || el.querySelector("summary") || el.querySelector("h2,h3"); }
      else if (l.l) {                                     // Henderson: the <h3> before its «📝 كويز على هالدرس»
        var q = d.querySelector('.lqz a[href*="l=' + l.l + '"]'), p = q && q.closest(".lqz");
        while (p && (p = p.previousElementSibling)) if (p.tagName === "H3") { host = p; break; }
      }
      if (!host) return;
      var old = host.querySelector(".rdot"); if (old) old.remove();
      host.insertAdjacentHTML("afterbegin", dotHtml(score(lid(l), now)));
    });
  }

  /* ---------------- 🔎 quick search ---------------- */
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[\u064B-\u0655\u0640]/g, "").replace(/œ/g, "oe").replace(/[’'`´]/g, " ").replace(/[^\w\u0600-\u06FF]+/g, " ").trim();
  }
  function words(q) { return norm(q).split(" ").filter(function (x) { return x.length > 1; }).map(function (x) { return x.length > 3 && /^ال/.test(x) ? x.slice(2) : x; }); }
  function loadScript(src) { return new Promise(function (res) { var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); }); }
  var extra = null;
  function more() {                                       // the question bank + drug cards, once, only when the search opens
    if (extra) return extra;
    var v = "?v=20261027z", jobs = [];
    if (!w.QUIZ) jobs.push(loadScript("assets/quiz-data.js" + v));
    if (!w.PHARMA) jobs.push(loadScript("assets/pharma-data.js" + v));
    extra = Promise.all(jobs).then(function () { idx = null; });
    return extra;
  }
  var idx = null;
  function index() {
    if (idx) return idx;
    var S = subjects(), by = {};
    idx = lessons().map(function (l) { var s = S[l.s] || {}, g = (w.NLESSONS.groups || {}), gk = Object.keys(g).filter(function (k) { return g[k].subs.indexOf(l.s) > -1; })[0], gs = gk ? g[gk].ar + " " + g[gk].fr + " " + gk : "", e = { id: lid(l), l: l, name: norm(l.n), subj: norm((s.ar || "") + " " + (s.fr || "") + " " + l.s + " " + gs), body: "", qs: [] }; by[e.id] = e; return e; });
    (w.QUIZ || []).forEach(function (q) { var e = by[ofQ(q)]; if (e) { e.body += " " + norm(q.q + " " + (q.o || []).join(" ")); e.qs.push(q.q); } });
    ((w.PHARMA && w.PHARMA.drugs) || []).forEach(function (x) { var e = by["pharma:" + x.g]; if (e) { var t = (x.n || []).join(" "); e.body += " " + norm(t); e.qs.push("💊 " + t); } });
    return idx;
  }
  function search(q) {
    var ws = words(q); if (!ws.length) return [];
    return index().map(function (e) {
      var sc = 0, hit = "";
      ws.forEach(function (x) {
        if (e.name.indexOf(x) > -1) sc += 6; else if (e.subj.indexOf(x) > -1) sc += 3;
        else if (e.body.indexOf(x) > -1) { sc += 1; if (!hit) for (var i = 0; i < e.qs.length; i++) if (norm(e.qs[i]).indexOf(x) > -1) { hit = e.qs[i]; break; } }
        else sc -= 2;
      });
      return { e: e, sc: sc, hit: hit };
    }).filter(function (r) { return r.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 12);
  }
  var sbox = null;
  function closeSearch() { if (!sbox) return; var b = sbox; sbox = null; d.documentElement.classList.remove("srchon"); out(b, function () { b.remove(); }); }
  function openSearch(q0) {
    if (sbox) return;
    sbox = d.createElement("div"); sbox.className = "srch"; sbox.setAttribute("role", "dialog"); sbox.setAttribute("aria-modal", "true"); sbox.setAttribute("aria-label", T("دوّر على درس", "Chercher une leçon")); sbox.setAttribute("data-nofr", "");
    sbox.innerHTML = '<div class="srchbox"><form class="srchf" role="search"><span aria-hidden="true">🔎</span><input type="search" class="srchin" enterkeyhint="search" autocomplete="off" placeholder="' + esc(T("دوّر على درس: ECG، Glasgow، القيادة…", "Chercher : ECG, Glasgow, leadership…")) + '" aria-label="' + esc(T("دوّر على درس", "Chercher une leçon")) + '"><button type="button" class="srchx" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></form><div class="srchr" aria-live="polite"></div></div>';
    d.body.appendChild(sbox); d.documentElement.classList.add("srchon");
    var inp = sbox.querySelector(".srchin"), res = sbox.querySelector(".srchr");
    function draw() {
      var q = inp.value, r = search(q), S = subjects();
      if (!words(q).length) { res.innerHTML = '<p class="small srchh">' + esc(T("اكتب اسم درس أو كلمة (عربي أو فرنسي)، وكبوس عالنتيجة.", "Tape le nom d'une leçon ou un mot (arabe ou français), puis touche le résultat.")) + "</p>"; return; }
      if (!r.length) { res.innerHTML = '<p class="small srchh">' + esc(T("ما لقينا درس بهالكلمة. جرّب كلمة تانية.", "Aucune leçon avec ce mot. Essaie un autre mot.")) + "</p>"; return; }
      var now = Date.now();
      res.innerHTML = '<nav class="gil">' + r.map(function (x) {
        var l = x.e.l, s = S[l.s] || {};
        return '<a class="gi srchi" href="' + esc(l.href) + '">' + dotHtml(score(x.e.id, now)) + '<span class="git"><b>' + esc(l.n) + "</b><small>" + esc(T("مادة ", "") + (FR() ? s.fr || s.ar : s.ar || "")) + (x.hit ? " · " + esc(String(x.hit).slice(0, 70)) + (String(x.hit).length > 70 ? "…" : "") : "") + "</small></span></a>";
      }).join("") + "</nav>";
    }
    inp.addEventListener("input", draw);
    sbox.querySelector(".srchf").addEventListener("submit", function (e) { e.preventDefault(); var a = res.querySelector("a.srchi"); if (a) { closeSearch(); location.href = a.getAttribute("href"); } });
    sbox.addEventListener("click", function (e) { if (e.target === sbox || (e.target.closest && e.target.closest(".srchx"))) closeSearch(); else if (e.target.closest && e.target.closest("a.srchi")) { closeSearch(); } });
    if (q0) inp.value = q0;
    draw(); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
    more().then(function () { if (sbox) draw(); });
  }
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && sbox) closeSearch(); });
  function headerButton() {
    var bar = d.querySelector(".topbar .bar"); if (!bar || bar.querySelector(".srchbtn")) return;
    var b = d.createElement("button"); b.type = "button"; b.className = "srchbtn"; b.setAttribute("aria-label", T("دوّر على درس", "Chercher une leçon")); b.textContent = "🔎";
    var mb = bar.querySelector(".menu-btn"); bar.insertBefore(b, mb || null);
    b.addEventListener("click", function () { openSearch(); });
  }
  d.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-search-open]"); if (t) { e.preventDefault(); openSearch(); } });

  /* ---------------- ✨ transitions ---------------- */
  // leave animation for a sheet/card that a script removes: fade + slide, then fn() (at once with reduced motion)
  function out(el, fn) { if (!el || reduced()) return fn && fn(); el.classList.add("anout"); setTimeout(function () { if (fn) fn(); }, 170); }
  // page leave: browsers with cross-document View Transitions animate by themselves (CSS @view-transition); others get a 140 ms fade
  var VT = "CSSViewTransitionRule" in w;
  function leave(e) {
    if (VT || reduced() || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
    var href = a.getAttribute("href"); if (!href || href.charAt(0) === "#" || /^(mailto|tel|sms|javascript):/i.test(href)) return;
    var u; try { u = new URL(href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
    e.preventDefault(); d.documentElement.classList.add("pgout");
    setTimeout(function () { location.href = u.href; }, 140);
  }
  w.addEventListener("pageshow", function () { d.documentElement.classList.remove("pgout"); });
  // details close smoothly too (opening is CSS): the body slides up, then the details closes
  function detailsClose(e) {
    if (reduced() || e.defaultPrevented) return;
    var s = e.target.closest && e.target.closest("summary"); if (!s) return;
    var dt = s.parentElement; if (!dt || dt.tagName !== "DETAILS" || !dt.open || dt.hasAttribute("data-noanim") || dt.classList.contains("dclosing")) return;
    e.preventDefault(); dt.classList.add("dclosing");
    setTimeout(function () { dt.classList.remove("dclosing"); dt.open = false; }, 160);
  }


  /* ---------------- 🏠 home «📌 الأهمّيات»: 🔁 due reviews + 🗺️ the map's counts (درس اليوم itself = lessons.js #wkles) ---------------- */
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!(w.Nursin && w.Nursin.me); }
  var cqItems = [];
  d.addEventListener("nursin:tile", function (e) { var x = e.detail || {}; if (x.k === "cq") { cqItems = x.items || []; homePrio(); } });   // 📝 class quiz (assets/qstats.js)
  function homePrio() {
    var box = d.getElementById("priorev"), cnt = d.getElementById("prcnt"); if (!box) return;
    var S = w.NursinSRS, n = S && S.count ? S.count() : 0, s = signed();
    var h = '<a class="prrev' + (n && s ? " hot" : "") + '" href="quiz.html?t=review"><span aria-hidden="true">🔁</span><span><b>' + esc(T("مراجعة اليوم", "Révision du jour")) + "</b><small>" +
      esc(!s ? T("🔒 سجّل دخول لتنحفظ مراجعاتك", "🔒 Connecte-toi pour garder tes révisions") : n ? T(n + " سؤال مستحق اليوم", n + " question(s) à réviser aujourd'hui") : T("ما في شي مستحق اليوم ✅", "Rien à réviser aujourd'hui ✅")) +
      '</small></span><span class="prn">' + (s ? n : "🔒") + "</span></a>";
    // today's exams + class exam / «سؤال اليوم» / class quiz still to do (they were home tiles before; now here, still one tap)
    var G = w.NursinGoals, gl = s && G && G.list ? G.list() || [] : [], todo = gl.filter(function (g) { return !g.done && /^(ex:|cls:|dq$)/.test(String(g.k)); }).concat(s ? cqItems.filter(function (x) { return !x.done; }) : []);
    todo.slice(0, 3).forEach(function (g) { h += '<a class="prrev prcls" href="' + esc(g.href) + '"><span aria-hidden="true">' + (g.e || "📝") + "</span><span><b>" + esc(g.n) + "</b>" + (g.s ? "<small>" + esc(g.s) + "</small>" : "") + '</span><span class="prn">▶️</span></a>'; });
    box.innerHTML = h;
    if (cnt) { var c = counts(); cnt.innerHTML = '<i class="rdot r-green"></i>' + c.green + ' <i class="rdot r-yellow"></i>' + c.yellow + ' <i class="rdot r-red"></i>' + c.red; }
  }

  /* ---------------- 🗺️ hifzi.html: the retention map by مادة ---------------- */
  function mapPage() {
    var box = d.getElementById("rmap"); if (!box) return;
    var all = list(), S = subjects(), c = counts(), by = {}, order = [];
    var NLx = w.NursinLessons, GR = (NLx && NLx.groups) || {}, gof = function (s) { return NLx && NLx.groupOf ? NLx.groupOf(s) : s; };
    all.forEach(function (l) { var k = gof(l.s); if (!by[k]) { by[k] = []; order.push(k); } by[k].push(l); });   // 🏥 Med-Surg = القلب + الأعصاب + Henderson + التسريب (ids unchanged)
    if (FR()) {                                           // 🇫🇷 the page's own lines (the static Arabic stays for the bilingual mode)
      var ld = d.getElementById("rlead"), lg = d.getElementById("rleg"), h1 = d.querySelector("main h1");
      if (h1) { h1.setAttribute("data-nofr", ""); h1.textContent = "🗺️ Ma mémoire"; }
      if (ld) { ld.setAttribute("data-nofr", ""); ld.textContent = "Chaque leçon a un pourcentage de mémoire qui baisse avec le temps si tu ne la révises pas. La lecture, le quiz et les cartes 🃏 la remettent au vert."; }
      if (lg) { lg.setAttribute("data-nofr", ""); lg.innerHTML = '<span><span class="rdot r-green"></span>Solide (70 % et +)</span><span><span class="rdot r-yellow"></span>À revoir (40–69 %)</span><span><span class="rdot r-red"></span>S\'efface (moins de 40 %)</span><span><span class="rdot r-grey"></span>Pas étudiée</span>'; }
    }
    var sumEl = d.getElementById("rsum");
    if (sumEl) sumEl.innerHTML = '<span class="rchip r-green">🟢 ' + esc(T("ثابت", "Solide")) + " <b>" + c.green + '</b></span><span class="rchip r-yellow">🟡 ' + esc(T("بدّو مراجعة", "À revoir")) + " <b>" + c.yellow + '</b></span><span class="rchip r-red">🔴 ' + esc(T("عم يروح", "S'efface")) + " <b>" + c.red + '</b></span><span class="rchip r-grey">⚪ ' + esc(T("ما درستو", "Pas étudiée")) + " <b>" + c.grey + "</b></span>";
    var wk = weakest(1)[0], osm = d.getElementById("rosm");
    if (osm) osm.innerHTML = '<span class="osa" aria-hidden="true">👨‍🏫</span><p>' + esc(wk ? (wk.score < 40 ? T("«" + wk.n + "» عم يروح منّك. ابدأ فيه هلّق، ١٠ بطاقات بس 🃏", "« " + wk.n + " » s'efface. Commence par elle, juste 10 cartes 🃏") : T("«" + wk.n + "» بدّو مراجعة صغيرة قبل ما يصير أحمر.", "« " + wk.n + " » a besoin d'une petite révision avant de devenir rouge.")) : c.green ? T("كل اللي درستو ثابت 💪 كمّل هيك!", "Tout ce que tu as étudié est solide 💪 Continue !") : T("بلّش بأي درس: كل ما تقرا أو تحلّ كويز أو بطاقات، بتتعبّى الخريطة.", "Commence par n'importe quelle leçon : lecture, quiz ou cartes remplissent la carte.")) + "</p>" + (wk ? '<a class="btn sm on" href="' + esc(fcLink(wk)) + '">' + esc(T("🃏 راجعو", "🃏 Réviser")) + "</a>" : "");
    box.innerHTML = order.map(function (k) {
      var s = GR[k] || S[k] || {}, L = by[k], st = L.filter(function (l) { return l.score != null; }), avg = st.length ? Math.round(st.reduce(function (a, l) { return a + l.score; }, 0) / st.length) : null;
      return '<details class="rsub"' + (L.some(function (l) { return l.color === "red"; }) ? " open" : "") + '><summary><span class="rsn"><b>' + esc(FR() ? s.fr || s.ar : s.ar || k) + "</b><small>" + esc(T(L.length + " دروس", L.length + " leçons")) + "</small></span>" +
        '<span class="rbar" aria-hidden="true">' + L.map(function (l) { return '<i class="r-' + l.color + '"></i>'; }).join("") + "</span>" + (avg != null ? '<b class="ravg r-' + color(avg) + '" dir="ltr">' + avg + "%</b>" : '<b class="ravg r-grey">—</b>') + "</summary>" +
        '<ul class="rlist">' + L.map(function (l) {
          return '<li class="r-' + l.color + '"><a class="rl" href="' + esc(l.href) + '">' + dotHtml(l.score) + "<span>" + (GR[k] && S[l.s] && S[l.s].e && l.s !== k ? S[l.s].e + " " : "") + esc(l.n) + '</span><b dir="ltr">' + (l.score == null ? "—" : l.score + "%") + "</b></a>" +
            '<a class="rfc" href="' + esc(fcLink(l)) + '" aria-label="' + esc(T("🃏 بطاقات: ", "🃏 Cartes : ") + l.n) + '">🃏</a></li>';
        }).join("") + "</ul></details>";
    }).join("");
  }
  function fcLink(l) { var p = String(l.href).split("#"); return p[0] + "?fc=" + encodeURIComponent(l.id) + (p[1] ? "#" + p[1] : ""); }

  w.NursinRet = { key: K, at: at, step: step, color: color, apply: apply, score: score, list: list, weakest: weakest, counts: counts, ofQ: ofQ, lid: lid, find: find,
    studyState: studyState, dotHtml: dotHtml, paintDots: paintDots, backfill: backfill, fcLink: fcLink };
  w.NursinSearch = { open: openSearch, close: closeSearch, search: search, norm: norm };
  w.NursinAnim = { out: out, reduced: reduced };

  /* 👆 Oct 31 2026 (Abdullah 12:45 AM: «إيماءات التنقل» like iOS): on inner pages a swipe from the RIGHT edge (RTL «back»; the left edge in
     🇫🇷 LTR) goes back — history.back() when the last page was this site, else the home page. Starts only within 22 px of the edge,
     needs a mostly horizontal 80 px move, never over a sideways-scrolling box, an open sheet / flashcards / 3D, and not on the home,
     3D, games or live pages (their own touch and swipes). Nothing changes for vertical scrolling. */
  var EDGE_SKIP = /^(index|3d|games|live)\.html$/;
  function edgeBack() {
    if (EDGE_SKIP.test(page) || !("ontouchstart" in w)) return;
    var s = null, ind = null;
    function busy(t) {
      var h = d.documentElement;
      if (h.classList.contains("fcon") || h.classList.contains("rton") || h.classList.contains("g3on") || d.querySelector(".gsheet,.srchbox,.obx,.thsheet,.hzsheet,dialog[open]")) return true;
      for (var el = t; el && el !== d.body && el.nodeType === 1; el = el.parentElement) {
        if (el.scrollWidth > el.clientWidth + 2) { var ox = getComputedStyle(el).overflowX; if (ox === "auto" || ox === "scroll") return true; }
        if (/^(INPUT|TEXTAREA|SELECT|MODEL-VIEWER|CANVAS)$/.test(el.tagName)) return true;
      }
      return false;
    }
    d.addEventListener("touchstart", function (e) {
      s = null; if (e.touches.length !== 1) return;
      var t = e.touches[0], rtl = (d.documentElement.getAttribute("dir") || "rtl") !== "ltr", W = w.innerWidth;
      if (rtl ? t.clientX < W - 22 : t.clientX > 22) return;
      if (busy(e.target)) return;
      s = { x: t.clientX, y: t.clientY, t: Date.now(), rtl: rtl, dx: 0 };
    }, { passive: true });
    d.addEventListener("touchmove", function (e) {
      if (!s) return; var t = e.touches[0], dx = (t.clientX - s.x) * (s.rtl ? -1 : 1), dy = t.clientY - s.y;
      if (Math.abs(dy) > 40 && Math.abs(dy) > dx) { s = null; if (ind) ind.style.opacity = "0"; return; }
      s.dx = dx;
      if (dx > 12 && !reduced()) {
        if (!ind) { ind = d.createElement("div"); ind.className = "edgeback"; ind.setAttribute("aria-hidden", "true"); ind.textContent = s.rtl ? "›" : "‹"; d.body.appendChild(ind); }
        ind.classList.toggle("ltr", !s.rtl); ind.style.opacity = String(Math.min(1, dx / 80)); ind.style.transform = "translateY(-50%) translateX(" + (s.rtl ? -1 : 1) * Math.min(dx, 90) * 0.5 + "px)"; ind.style.top = s.y + "px";
      }
    }, { passive: true });
    d.addEventListener("touchend", function () {
      if (ind) ind.style.opacity = "0";
      if (!s) return; var ok = s.dx >= 80 && Date.now() - s.t < 1500; s = null; if (!ok) return;
      var same = false; try { same = !!d.referrer && new URL(d.referrer).origin === location.origin; } catch (e) {}
      if (same && w.history.length > 1) w.history.back(); else location.href = "index.html";
    }, { passive: true });
    d.addEventListener("touchcancel", function () { s = null; if (ind) ind.style.opacity = "0"; }, { passive: true });
  }
  function init() {
    try { backfill(); } catch (e) {}
    try { edgeBack(); } catch (e) {}
    headerButton(); paintDots(); watchRead();
    w.addEventListener("click", leave); d.addEventListener("click", detailsClose);   // window: after every page script had its say
    d.addEventListener("nursin:ret", function () { paintDots(); homePrio(); mapPage(); });
    ["nursin:srs", "nursin:gate", "nursin:auth", "nursin:goals"].forEach(function (ev) { d.addEventListener(ev, function () { setTimeout(homePrio, 30); }); });
    homePrio(); mapPage();
    /* ⚠️ «الأخطاء الشائعة» on hifzi.html stays folded until tapped, open/closed remembered (same key as the old home card, nursin_cmist_v1) */
    var f = d.getElementById("cmfold");
    if (f) { try { if (localStorage.getItem("nursin_cmist_v1") === "1") f.open = true; } catch (e) {} f.addEventListener("toggle", function () { try { localStorage.setItem("nursin_cmist_v1", f.open ? "1" : "0"); } catch (e) {} }); }
    setTimeout(paintDots, 1200);                          // lessons drawn late (split parts, French swap)
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
