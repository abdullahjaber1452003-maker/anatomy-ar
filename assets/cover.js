/* 📚 «وين واصل» — every lesson covered, all year (Abdullah, Nov 7 2026 11:32–11:34 AM: «اهم شي لازم انه الطالب يحرق ع كل لدروس و بده
   مين يذكره ويقوي ب باقي لدروس» + «و حتى بعد الفصل كمان يبقى يذكر و يتابع»). Loaded on EVERY page right after assets/hifz.js.
   1) COVERAGE (pure parts exported for the tests): each lesson of window.NLESSONS.list gets one state, from data already on this device:
        ⚪ none    never opened (no read mark, no lesson memory)
        📖 read    read (nursin_read_v1 / lesson memory «read», assets/lessons.js + hifz.js) but no quiz answer yet
        📝 quiz    quiz answers on it, fewer than 3, or 50–79 %
        ✅ strong  ≥ 3 answers and ≥ 80 % right (the last 10 answers)          ⚠️ weak  ≥ 3 answers and < 50 % right
      Answers are counted here (localStorage nursin_cov_v1 {a:{lesson:"1011…"}, m:[last wrong answers {q,id,at}]}) from the same
      events the lesson memory hears (nursin:answer + answers written straight on NursinRet.apply: 📝 كويز هالجزء, 🔁 سؤال شبيه, 🚌, 👨‍🏫).
      Older parts quizzes (nursin_partq_v1) count once when a lesson has no answer of its own yet. No hard stop: nothing here reads the
      midterm date, so it keeps going after Nov 16 and for every lesson added later.
   2) hifzi.html#cover «📚 وين واصل»: X من Y دروس, a bar per مادة, the lessons with their state, «🎯 الجاي» (next 5) and Osman's memory line.
   3) 🧭 home path: steps(p) → at most 2 steps «📖 درس ما فتحته» / «💪 قوّي: …» (assets/home.js puts them in, ≤ 7 + «+N كمان»).
   4) 🔔 Osman's reminder: nudge() = «فوت ادرس: <lesson> 📖» (weak lesson or one never opened). In-site banner when he opens the site,
      at most once an hour, never in the quiet hours (22:00–08:00 Beirut; Thu/Fri/Sat 07:30–14:30 class) — the same text rides the study
      summary (NursinRet.studyState → stNext…) so the worker can push it (worker v16; v15 ignores the new fields).
   5) ☕ after ~25 minutes of active lesson time: Osman suggests a 5-minute break with a light game (games.html?g=…) or a small thing to
      do, then «يلا نرجع ↩️» brings him back to the same lesson part. Counts as a break for the 50-minute rest of assets/coach.js.
   No ad next to any of it, no Firestore traffic of its own. ES5 (iOS 12). */
(function (w, d) {
  "use strict";
  var K = "nursin_cov_v1", NK = "nursin_osnudge_v1", BK = "nursin_osbrk_v1", RK = "nursin_osret_v1", HOUR = 36e5, DAY = 864e5;
  var BRK_AT = 25 * 60, BRK_MIN = 5, IDLE = 90000, TICK = 15000;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function cut(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------------- Beirut clock (pure) ---------------- */
  function bt(ms) {                                     // {day 'YYYY-MM-DD', hm minutes, dow 0=Sun}
    var o = null;
    try {
      var f = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
      var p = {}; f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      var day = p.year + "-" + p.month + "-" + p.day, h = (+p.hour) % 24;
      o = { day: day, hm: h * 60 + (+p.minute), dow: new Date(Date.parse(day + "T12:00:00Z")).getUTCDay() };
    } catch (e) {}
    if (!o || isNaN(o.hm)) { var z = new Date(ms + 2 * HOUR); o = { day: z.toISOString().slice(0, 10), hm: z.getUTCHours() * 60 + z.getUTCMinutes(), dow: z.getUTCDay() }; }
    return o;
  }
  // quiet: night 22:00 → 08:00, and class Thu/Fri/Sat 07:30 → 14:30 (Beirut)
  function quiet(ms) { var b = bt(ms); return b.hm >= 22 * 60 || b.hm < 8 * 60 || (b.dow >= 4 && b.dow <= 6 && b.hm >= 7 * 60 + 30 && b.hm < 14 * 60 + 30); }
  function dayDiff(a, b) { return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / DAY); }
  // Osman may nudge now? not in the quiet hours, and ≥ 1 hour since the last nudge
  function canNudge(now, last) { return !quiet(now) && (!last || now - last >= HOUR); }

  /* ---------------- coverage (pure) ---------------- */
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function lessons() { var R = w.NLESSONS; return ((R && R.list) || []).map(function (x) { return { id: base(x), s: x.s, n: x.n, href: x.href }; }); }
  function subjName(s) { var S = (w.NLESSONS && w.NLESSONS.subjects) || {}, o = S[s] || {}; return (o.e ? o.e + " " : "") + (T(o.ar || s, o.fr)); }
  function store() { var o = lsGet(K); if (!o || typeof o !== "object") o = {}; if (!o.a || typeof o.a !== "object") o.a = {}; if (!Array.isArray(o.m)) o.m = []; return o; }
  function data() { var r = lsGet("nursin_ret_v1"); return { cov: store(), read: lsGet("nursin_read_v1") || {}, ret: (r && r.L) || {}, pq: lsGet("nursin_partq_v1") || {} }; }
  function wasRead(id, D) {
    var rd = D.read || {}, k; if (rd[id]) return true;
    for (k in rd) if (k.indexOf(id + "#") === 0) return true;
    var r = (D.ret || {})[id]; return !!r;
  }
  // state(id, D) → {k: none|read|quiz|strong|weak, n answers, pct}
  function state(id, D) {
    D = D || data();
    var a = String(((D.cov || {}).a || {})[id] || ""), n = a.length, ok = 0, i, k;
    for (i = 0; i < n; i++) if (a.charAt(i) === "1") ok++;
    if (!n) { var pq = D.pq || {}; for (k in pq) if ((k === id || k.indexOf(id + "#") === 0) && pq[k] && (pq[k].n | 0) > 0) { n += pq[k].n | 0; ok += Math.min(pq[k].n | 0, pq[k].l == null ? pq[k].s | 0 : pq[k].l | 0); } }
    if (n) { var pct = Math.round(ok * 100 / n); return { k: n >= 3 && pct >= 80 ? "strong" : n >= 3 && pct < 50 ? "weak" : "quiz", n: n, pct: pct }; }
    return { k: wasRead(id, D) ? "read" : "none", n: 0, pct: -1 };
  }
  function all(D) { D = D || data(); return lessons().map(function (l) { var s = state(l.id, D); l.k = s.k; l.n0 = s.n; l.pct = s.pct; return l; }); }
  function summary(L) {
    L = L || all(); var by = {}, order = [], tot = { n: 0, done: 0, strong: 0, weak: 0, none: 0 };
    L.forEach(function (l) {
      var g = by[l.s]; if (!g) { g = by[l.s] = { s: l.s, name: subjName(l.s), n: 0, done: 0, strong: 0, weak: 0, quiz: 0, read: 0, none: 0, L: [] }; order.push(g); }
      g.n++; g[l.k]++; g.L.push(l); if (l.k !== "none") g.done++;
      tot.n++; if (l.k !== "none") tot.done++; if (l.k === "strong") tot.strong++; if (l.k === "weak") tot.weak++; if (l.k === "none") tot.none++;
    });
    return { subj: order, tot: tot };
  }
  // the next lessons to do: never opened (the مادة least covered first, list order inside), weak ones woven in (weakest first)
  function next(k, L, not) {
    L = L || all(); not = not || []; var S = summary(L), cov = {};
    S.subj.forEach(function (g) { cov[g.s] = g.n ? g.done / g.n : 1; });
    var free = L.filter(function (l) { return not.indexOf(l.id) < 0; });
    var un = free.filter(function (l) { return l.k === "none"; }).map(function (l, i) { return { l: l, i: i }; })
      .sort(function (a, b) { return cov[a.l.s] - cov[b.l.s] || a.i - b.i; }).map(function (x) { return x.l; });
    var wk = free.filter(function (l) { return l.k === "weak"; }).sort(function (a, b) { return a.pct - b.pct; });
    var out = [], i = 0;
    while (out.length < (k || 5) && (i < un.length || i < wk.length)) { if (i < wk.length) out.push(wk[i]); if (i < un.length && out.length < (k || 5)) out.push(un[i]); i++; }
    if (out.length < (k || 5)) free.filter(function (l) { return l.k === "read"; }).forEach(function (l) { if (out.length < (k || 5)) out.push(l); });
    return out;
  }
  // 🧭 ≤ 2 path steps (assets/home.js upgrade): «📖 درس ما فتحته» + «💪 قوّي: …», none for a lesson already on the path
  function steps(p, L) {
    L = L || all(); var on = []; ((p && p.steps) || []).concat((p && p.more) || []).forEach(function (s) { if (s && s.id) on.push(s.id); });
    var free = L.filter(function (l) { return on.indexOf(l.id) < 0; }), out = [], S = summary(L);
    var nx = next(8, L, on), un = nx.filter(function (l) { return l.k === "none"; })[0], wk = free.filter(function (l) { return l.k === "weak"; }).sort(function (a, b) { return a.pct - b.pct; })[0];
    if (un) out.push({ k: "cvn", e: "📖", id: un.id, n: un.n, href: un.href, c: S.tot.done, of: S.tot.n, pr: 3 });
    if (wk) out.push({ k: "cvw", e: "💪", id: wk.id, n: wk.n, href: wk.href, pct: wk.pct, pr: 3 });
    return out.slice(0, 2);
  }
  // 🔔 Osman's one reminder: the weakest lesson, else one never opened → {id, n, href, why: weak|new, t: «فوت ادرس: … 📖»}
  function nudge(L) {
    var x = next(2, L)[0]; if (!x) return null;
    var why = x.k === "weak" ? "weak" : x.k === "none" ? "new" : "read";
    return { id: x.id, n: x.n, href: x.href, why: why, pct: x.pct, t: T("فوت ادرس: ", "Va étudier : ") + x.n + " 📖", sub: why === "weak" ? T("علامتك فيه " + x.pct + "٪، خلّينا نقوّيه 💪", "Ton score : " + x.pct + " %, on le renforce 💪") : why === "new" ? T("بعدك ما فتحتو، لازم نمرق على كل الدروس", "Pas encore ouverte : on doit passer sur toutes les leçons") : T("قريتو، جرّب كويز هالجزء", "Lue, essaie le quiz") };
  }

  /* ---------------- answers + mistakes (recorded here) ---------------- */
  function record(id, ok, qid, now) {
    if (!id) return; now = now || Date.now();
    var o = store(), a = String(o.a[id] || "") + (ok ? "1" : "0"); o.a[id] = a.slice(-10);
    if (!ok) { o.m.push({ q: qid || "", id: id, at: now }); if (o.m.length > 12) o.m = o.m.slice(-12); }
    lsSet(K, o);
  }
  function lessonById(id) { var L = lessons(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function dayWord(at, now) {
    var n = dayDiff(bt(now).day, bt(at).day);
    return n <= 0 ? T("اليوم", "Aujourd'hui") : n === 1 ? T("مبارح", "Hier") : T("من " + n + " أيام", "Il y a " + n + " jours");
  }
  // 🧠 «مبارح غلطت بـ … خلينا نرجعلها»: the newest wrong answer of the last 7 days (here, else نقاط ضعفك nursin_weak_v1)
  function mem(now, qById) {
    now = now || Date.now(); var o = store(), best = null, i;
    for (i = o.m.length - 1; i >= 0 && !best; i--) { var m = o.m[i]; if (m && m.at && now - m.at < 7 * DAY && lessonById(m.id)) best = { q: m.q, id: m.id, at: m.at }; }
    if (!best) {
      var wk = lsGet("nursin_weak_v1"), it = (wk && wk.items) || {}, k, top = null;
      for (k in it) if (it[k] && it[k].last && now - it[k].last < 7 * DAY && (!top || it[k].last > top.at)) top = { q: k, t: it[k].t, at: it[k].last };
      if (top) {
        var q = qById ? qById(top.q) : null, R = w.NursinRet, id = q && R && R.ofQ ? R.ofQ(q) : "";
        if (!id) { var L = lessons().filter(function (l) { return l.id.split(":")[1] === top.t || l.id === top.t; }); id = L.length ? L[0].id : ""; }
        if (id && lessonById(id)) best = { q: top.q, id: id, at: top.at };
      }
    }
    if (!best) return null;
    var l = lessonById(best.id), q2 = qById && best.q ? qById(best.q) : null, dw = dayWord(best.at, now);
    return { q: best.q, id: best.id, at: best.at, n: l.n, href: l.href, qt: q2 ? cut(q2.q, 70) : "",
      t: dw + T(" غلطت بـ «", " tu t'es trompé(e) sur « ") + cut(l.n, 40) + T("» — خلينا نرجعلها 💪", " » — on y revient 💪") };
  }

  /* ---------------- ☕ the 25-minute break (pure tick) ---------------- */
  // S = {a: active seconds since the last break, t: last tick ms, asked, b: last break ms}; active = a tap/scroll in the last 90 s
  function brkTick(S, now, active, sec, lastBreak) {
    S = S || {}; sec = sec || TICK / 1000;
    if (!S.t || now - S.t > 30 * 6e4 || (lastBreak && lastBreak > (S.b || 0))) { S = { a: 0, t: now, asked: 0, b: Math.max(lastBreak || 0, S.b || 0) }; }
    if (active) S.a = (S.a || 0) + sec;
    S.t = now;
    var ask = !S.asked && S.a >= BRK_AT;
    if (ask) S.asked = 1;
    return { S: S, ask: ask };
  }
  var GAMES = [["tf", "⚡", "تحدّي ٦٠ ثانية: صح ولا غلط", "Défi 60 s : vrai ou faux"], ["match", "🧩", "وصّل: المصطلح بالفرنسي ↔ معناه", "Relier : terme ↔ sens"], ["mem", "🃏", "لعبة الذاكرة: قلّب الكروت", "Memory : retourne les cartes"]];
  var FUN = [["🚶", "قوم مشّي شوي واشرب كاسة مي", "Lève-toi, marche un peu et bois un verre d'eau"], ["🧘", "سكّر عيونك ٥ دقايق وخود نفس عميق", "Ferme les yeux 5 minutes et respire profondément"], ["🎵", "اسمع غنية بتحبها", "Écoute une chanson que tu aimes"], ["🤸", "مطّ إيديك وضهرك شوي", "Étire tes bras et ton dos"]];

  /* ---------------- 📚 the view (hifzi.html#cover) ---------------- */
  var ST = { none: ["⚪", "ما فتحتو", "Pas ouverte"], read: ["📖", "قريتو", "Lue"], quiz: ["📝", "عملت كويز", "Quiz fait"], strong: ["✅", "قوي", "Solide"], weak: ["⚠️", "ضعيف", "Faible"] };
  function stTxt(l) { var s = ST[l.k] || ST.none; return s[0] + " " + T(s[1], s[2]) + (l.pct >= 0 && l.k !== "read" && l.k !== "none" ? " · " + l.pct + "٪" : ""); }
  function viewHtml() {
    var L = all(), S = summary(L), nx = next(5, L), m = mem(Date.now(), qById), pct = S.tot.n ? Math.round(S.tot.done * 100 / S.tot.n) : 0;
    return "<h2>📚 " + esc(T("وين واصل", "Où j'en suis")) + "</h2>" +
      '<p class="cvtot"><b>' + S.tot.done + " " + esc(T("من", "sur")) + " " + S.tot.n + " " + esc(T("دروس", "leçons")) + "</b> " + esc(T("مرقت عليهن", "parcourues")) + " · ✅ " + S.tot.strong + " · ⚠️ " + S.tot.weak + "</p>" +
      '<div class="cvbar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      (m ? '<p class="cvosm">👨‍🏫 <b>' + esc(T("الأستاذ عثمان", "Professeur Osman")) + ":</b> " + esc(m.t) + ' <a href="' + esc(m.href) + '">' + esc(T("📖 الدرس", "📖 La leçon")) + "</a></p>" : "") +
      (nx.length ? '<div class="cvnext"><b>🎯 ' + esc(T("الجاي:", "Ensuite :")) + "</b><ol>" + nx.map(function (l) { return '<li><a href="' + esc(l.href) + '">' + esc(l.n) + "</a> <small>" + esc(stTxt(l)) + "</small></li>"; }).join("") + "</ol></div>"
        : '<p class="cvnext">🎉 ' + esc(T("مرقت على كل الدروس! كمّل قوّي اللي مش ✅", "Toutes les leçons parcourues ! Renforce celles qui ne sont pas ✅")) + "</p>") +
      S.subj.map(function (g) {
        var p = g.n ? Math.round(g.done * 100 / g.n) : 0;
        return '<details class="cvsub"><summary>' + esc(g.name) + " <small>· " + g.done + " " + esc(T("من", "sur")) + " " + g.n + " " + esc(T("دروس", "leçons")) + (g.weak ? " · ⚠️ " + g.weak : "") + (g.strong ? " · ✅ " + g.strong : "") + '</small><span class="cvbar cvbar2"><i style="width:' + p + '%"></i></span></summary>' +
          '<ul class="cvls">' + g.L.map(function (l) { return '<li><span class="cvst">' + (ST[l.k] || ST.none)[0] + '</span> <a href="' + esc(l.href) + '">' + esc(l.n) + "</a> <small>" + esc(stTxt(l).replace(/^\S+ /, "")) + "</small></li>"; }).join("") + "</ul></details>";
      }).join("") +
      '<p class="cvleg">⚪ ' + esc(T("ما فتحتو", "pas ouverte")) + " · 📖 " + esc(T("قريتو", "lue")) + " · 📝 " + esc(T("عملت كويز", "quiz fait")) + " · ✅ " + esc(T("قوي (٨٠٪ وفوق)", "solide (≥ 80 %)")) + " · ⚠️ " + esc(T("ضعيف (تحت ٥٠٪)", "faible (< 50 %)")) + "</p>";
  }
  function qById(id) { var Q = w.QUIZ || []; for (var i = 0; i < Q.length; i++) if (Q[i] && Q[i].id === id) return Q[i]; return null; }
  /* ======================== on the page ======================== */
  if (!d || !d.addEventListener) { w.NursinCov = api(); return; }
  var page = ((w.location && w.location.pathname) || "/index.html").split("/").pop() || "index.html";
  if (!/\.html$/.test(page)) page = "index.html";
  var LESSON = /^(cardio|neuro|henderson|law|mgmt|quality|pharma|rea|geri|community|medsurg)\.html$/.test(page);
  var NOBAN = /^(quiz|games|tutor|chat|admin|live|exams|3d|midterm|mindmap|404)\.html$/.test(page);

  function style() {
    if (d.getElementById("cvcss")) return;
    var s = d.createElement("style"); s.id = "cvcss";
    s.textContent = ".cvnud,.cvbrk,.cvret{position:fixed;left:10px;right:10px;bottom:calc(74px + env(safe-area-inset-bottom,0px));z-index:60;max-width:520px;margin:0 auto;padding:10px 12px;border-radius:16px;background:#fff;color:#0f172a;border:1px solid rgba(15,118,110,.4);box-shadow:0 6px 22px rgba(0,0,0,.18);font-size:14px;line-height:1.55}" +
      "html[data-theme=night] .cvnud,html[data-theme=night] .cvbrk,html[data-theme=night] .cvret{background:#0f1f1d;color:#e2e8f0}" +
      ".cvnud p,.cvbrk p{margin:0 0 6px}.cvnud .cvact,.cvbrk .cvact{display:flex;flex-wrap:wrap;gap:6px}.cvx{position:absolute;top:4px;left:6px;border:0;background:none;font-size:18px;cursor:pointer;color:inherit}" +
      ".cvret{right:auto;left:10px;bottom:calc(74px + env(safe-area-inset-bottom,0px));padding:8px 12px;border-radius:999px;max-width:300px;cursor:pointer;font-weight:700}" +
      ".cvsec h2{margin:.2em 0}.cvtot{font-size:15px;margin:4px 0 8px}.cvbar{height:9px;border-radius:9px;background:rgba(15,118,110,.15);overflow:hidden;margin:3px 0}.cvbar i{display:block;height:100%;background:#0f766e;border-radius:9px}" +
      ".cvsub{margin:6px 0;border:1px solid rgba(15,118,110,.25);border-radius:12px;padding:6px 10px}.cvsub summary{cursor:pointer;font-weight:700;list-style:none;display:block}.cvsub summary::-webkit-details-marker{display:none}.cvsub summary::marker{content:''}.cvsub summary::before{content:'▸ ';opacity:.7}.cvsub[open] summary::before{content:'▾ '}.cvsub .cvbar2{display:block;width:100%;min-width:60px;margin-top:5px}.cvsub summary small{font-weight:400;opacity:.8}" +
      ".cvls{list-style:none!important;padding:0!important;margin:6px 0}.cvls li{list-style:none!important;padding:3px 0;font-size:14px}.cvls li::before,.cvls li::marker{content:none!important}.cvls a{text-decoration:none}.cvst{display:inline-block;min-width:1.4em}" +
      ".cvnext{margin:8px 0;padding:8px 10px;border-radius:12px;background:rgba(15,118,110,.07)}.cvnext ol{margin:4px 0;padding-inline-start:20px}.cvleg{font-size:12.5px;opacity:.85}.cvosm{margin:6px 0;padding:8px 10px;border-radius:12px;background:rgba(124,58,237,.07);font-size:14px}" +
      "@media (min-width:1024px){.cvnud,.cvbrk{bottom:20px}.cvret{bottom:20px}}";
    (d.head || d.body).appendChild(s);
  }
  // 30e: the view's own styles were only injected with a nudge / break / return pill — without them the folded rows showed list bullets
  // and an empty bar. paintView() now injects them itself.
  function paintView() { var el = d.getElementById("cover"); if (el) { style(); el.className = "cvsec card"; el.innerHTML = viewHtml(); } }

  /* ---- events: answers → coverage + mistakes ---- */
  function ofQid(qid) { var R = w.NursinRet, q = qById(qid); if (!q) { var LQ = w.LINKQ || []; for (var i = 0; i < LQ.length; i++) if (LQ[i].id === qid) q = LQ[i]; } if (!q) return []; if (q.ls) return q.ls.slice(); var id = R && R.ofQ ? R.ofQ(q) : null; return id ? [id] : []; }
  d.addEventListener("nursin:answer", function (e) { var x = e.detail || {}; if (x.qid) ofQid(x.qid).forEach(function (id) { record(id, !!x.ok, x.qid); }); });
  function wrap() {
    var R = w.NursinRet; if (!R || !R.apply || R.apply.cv) return;
    var f = R.apply, g = function (id, kind) { var out = f.apply(R, arguments); try { if (kind === "ok" || kind === "bad") record(id, kind === "ok"); } catch (e) {} return out; };
    g.cv = 1; if (f.rv) g.rv = 1; R.apply = g;
  }

  /* ---- 🔔 the in-site nudge (≤ 1 an hour, quiet hours) ---- */
  function banner() {
    if (NOBAN || d.querySelector(".cvnud,.cvbrk")) return;
    var now = Date.now(), st = lsGet(NK) || {}; if (!canNudge(now, st.at)) return;
    var n = nudge(); if (!n || n.href.split("#")[0] === page) return;
    var m = mem(now, qById);
    lsSet(NK, { at: now, id: n.id });
    style();
    var b = d.createElement("div"); b.className = "cvnud"; b.setAttribute("role", "status");
    b.innerHTML = '<button class="cvx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">×</button><p><b>👨‍🏫 ' + esc(T("الأستاذ عثمان", "Professeur Osman")) + ":</b> " + esc(n.t) + "<br><small>" + esc(n.sub) + "</small>" + (m ? "<br><small>🧠 " + esc(m.t) + "</small>" : "") + "</p>" +
      '<div class="cvact"><a class="btn sm pri" href="' + esc(n.href) + '">' + esc(T("يلا 📖", "Allez 📖")) + '</a><a class="btn sm" href="hifzi.html#cover">' + esc(T("📚 وين واصل", "📚 Où j'en suis")) + '</a><button class="btn sm cvlater" type="button">' + esc(T("بعدين", "Plus tard")) + "</button></div>";
    d.body.appendChild(b);
    var gone = function () { if (b.parentNode) b.parentNode.removeChild(b); };
    b.querySelector(".cvx").addEventListener("click", gone); b.querySelector(".cvlater").addEventListener("click", gone);
    setTimeout(gone, 20000);
  }

  /* ---- ☕ break after 25 min of active lesson time, «يلا نرجع» back to the same part ---- */
  var lastAct = 0;
  function here() {
    var h = page, op = null;                            // the open lesson part nearest the top of the screen
    try { [].forEach.call(d.querySelectorAll("details[open][id]"), function (el) { var r = el.getBoundingClientRect(); if (r.bottom > 60 && (!op || r.top < op.r)) op = { id: el.id, r: r.top }; }); } catch (e) {}
    return h + (op ? "#" + op.id : (w.location.hash || ""));
  }
  function brkCard() {
    if (d.querySelector(".cvbrk")) return;
    style();
    var h = Math.floor(Date.now() / 6e4), g = GAMES[h % GAMES.length], f = FUN[h % FUN.length];
    var b = d.createElement("div"); b.className = "cvbrk"; b.setAttribute("role", "status");
    b.innerHTML = '<button class="cvx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">×</button><p><b>👨‍🏫 ' + esc(T("الأستاذ عثمان", "Professeur Osman")) + ":</b> " + esc(T("صرلك ٢٥ دقيقة عم تدرس، برافو! 👏 خود ٥ دقايق استراحة ☕", "25 minutes d'étude, bravo ! 👏 Prends 5 minutes de pause ☕")) + "</p>" +
      '<div class="cvact"><a class="btn sm pri" data-brk="g" href="games.html?g=' + g[0] + '">' + g[1] + " " + esc(T(g[2], g[3])) + '</a><button class="btn sm" type="button" data-brk="f">' + f[0] + " " + esc(T(f[1], f[2])) + '</button><button class="btn sm" type="button" data-brk="no">' + esc(T("⏭️ مش هلّق", "⏭️ Pas maintenant")) + "</button></div>";
    d.body.appendChild(b);
    function start() { var now = Date.now(); lsSet(RK, { href: here(), at: now, end: now + BRK_MIN * 6e4 }); lsSet("nursin_brk_v1", { at: now }); }
    b.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-brk],.cvx") : null; if (!t) return;
      var k = t.getAttribute("data-brk");
      if (k === "g") { start(); return; }                 // the link goes on to the game
      if (k === "f") { start(); b.parentNode.removeChild(b); retPill(); return; }
      if (k === "no" || t.classList.contains("cvx")) { var S = lsGet(BK) || {}; S.a = BRK_AT - 10 * 60; S.asked = 0; lsSet(BK, S); b.parentNode.removeChild(b); }
    });
  }
  function brkLoop() {
    ["scroll", "touchstart", "click", "keydown"].forEach(function (ev) { w.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true, capture: true }); });
    setInterval(function () {
      if (d.hidden) return;
      var now = Date.now(), br = lsGet("nursin_brk_v1"), r = brkTick(lsGet(BK), now, now - lastAct < IDLE, TICK / 1000, br && br.at ? +br.at : 0);
      lsSet(BK, r.S); if (r.ask) brkCard();
    }, TICK);
  }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); s = s % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  var pillTm = 0;
  function retPill() {
    var R = lsGet(RK); clearTimeout(pillTm);
    var old = d.querySelector(".cvret");
    if (!R || !R.href || Date.now() - R.at > 2 * HOUR) { if (R) lsSet(RK, null); if (old) old.parentNode.removeChild(old); return; }
    var tg = String(R.href).split("#"), samePage = tg[0] === page;
    if (samePage && R.at && Date.now() - R.at < 3000) samePage = false;  // just started from here
    style();
    var b = old || d.createElement("div"); b.className = "cvret"; b.setAttribute("role", "button"); b.setAttribute("tabindex", "0");
    var left = R.end - Date.now();
    b.textContent = left > 0 ? "☕ " + mmss(left) + " · " + T("يلا نرجع ↩️", "On y retourne ↩️") : T("🙂 خلصت الاستراحة، يلا نرجع ↩️", "🙂 Pause finie, on y retourne ↩️");
    if (!old) {
      b.addEventListener("click", function () {
        var r0 = lsGet(RK); lsSet(RK, null); if (b.parentNode) b.parentNode.removeChild(b); if (!r0) return;
        var p = String(r0.href).split("#");
        if (p[0] === page) { var el = p[1] ? d.getElementById(p[1]) : null; if (el) { if (el.tagName === "DETAILS") el.open = true; try { el.scrollIntoView({ block: "start" }); } catch (e) { el.scrollIntoView(); } } }
        else w.location.href = r0.href;
      });
      d.body.appendChild(b);
    }
    pillTm = setTimeout(retPill, left > 0 ? 15000 : 60000);
  }
  // games.html?g=tf → open that game (the break's light game)
  function openGame() {
    if (page !== "games.html") return; var m = /[?&]g=([a-z]+)/.exec(w.location.search || ""); if (!m) return;
    var n = 0; (function go() { var b = d.querySelector('.gcard[data-g="' + m[1] + '"]'); if (b) b.click(); else if (++n < 20) setTimeout(go, 250); })();
  }

  function api() {
    return { K: K, BRK_AT: BRK_AT, bt: bt, quiet: quiet, canNudge: canNudge, lessons: lessons, state: state, all: all, summary: summary, next: next, steps: steps, nudge: nudge,
      record: record, mem: mem, dayWord: dayWord, brkTick: brkTick, GAMES: GAMES, viewHtml: typeof viewHtml === "function" ? viewHtml : null, paint: typeof paintView === "function" ? paintView : null };
  }
  w.NursinCov = api();
  function boot() {
    wrap(); setTimeout(wrap, 1500);
    paintView();
    d.addEventListener("nursin:partq", function () { setTimeout(paintView, 50); });
    w.addEventListener("pageshow", function (e) { if (e.persisted) { paintView(); retPill(); } });
    setTimeout(banner, 2500);
    retPill(); openGame();
    if (LESSON) brkLoop();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
