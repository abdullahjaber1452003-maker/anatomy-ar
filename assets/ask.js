/* 🙋 «اسأل عثمان» under every question (Abdullah, Nov 1 2026 11:03 PM voice, approved 11:05 PM: «بالكويز… بأي شي بيكون فيه اختبار…
   بدي يكون عندي خانة اسأل… بكتب سؤالي وبيرد علي الأستاذ عثمان»). Loaded on EVERY page right after assets/osman.js.
   • A small «🙋 اسأل عثمان» button under a question opens an inline glass box: a textarea «شو ما فهمت؟ اكتب سؤالك…», 3 quick chips and send.
     Osman answers INLINE under the question, through the SAME endpoint as the tutor page (assets/tutor.js: POST {messages:[{role,text}],
     context} → {text}; no worker change). A tiny thread per question (sessionStorage nursin_ask_v1, last 8 lines) allows follow-ups.
   • What he gets: the plain persona (no roast / proverb on this flow), the question, its options, the student's pick, the right answer +
     the site's explanation ONLY once the question is answered, the lesson's name and the most relevant part of the site's OWN lesson text.
   • 🔒 Anti-cheat: graded / timed surfaces (🎯 امتحان الفصل, 📅 exams, 📝 كويز الصف, ⚔️ تحدّي, البطولة, 🔴 لايف, ❓ سؤال اليوم بالصف, the weekly
     mixed exam) pass graded:true and the button only exists once that question is answered (or on the review list after the result).
     In free practice it is there before answering too, but then the answer is NOT sent and Osman is told to give a hint only.
   • Counts in the tutor's daily quota (nursin_tutor_day_v1: 15 a day + the ad unlocks on tutor.html), «باقي N سؤال اليوم» on the box.
   • Signed-in only (like the tutor). «💾 احفظ بملاحظاتي» puts the exchange in 📒 ملاحظاتي (assets/notes.js) on that question.
   Surfaces either call NursinAsk.mount(cardElement, ctx) or put NursinAsk.slot(ctx) in the HTML they draw. No ad anywhere near it. */
(function (w, d) {
  var API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/";
  var CKEY = "nursin_tutor_day_v1", LIMIT = 15, BONUS = 5, MAX_UNLOCKS = 3, SKEY = "nursin_ask_v1", KEEP = 8, MAXK = 40, MAXQ = 500, TIMEOUT = 40000, SNIP = 2200;
  var V = "20261030v", L3 = "abcdef";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hash(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  /* html → plain text: block tags become line breaks, tags dropped, the common entities decoded */
  function strip(h) {
    return String(h == null ? "" : h)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(p|li|h[1-6]|tr|div|br|summary|details|section|ul|ol|table|thead|tbody|figure|figcaption|blockquote)\b[^>]*>/gi, "\n")
      .replace(/<\/?t[dh]\b[^>]*>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&")
      .replace(/[ \t\u00a0]+/g, " ").replace(/ *\n[\s|]*/g, "\n").replace(/\n{2,}/g, "\n").trim();
  }
  function txt(x) { return x == null ? "" : strip(x).replace(/\s+/g, " ").trim(); }
  /* escape first, then **bold** / bullets / line breaks (same as the tutor page) */
  function fmt(t) {
    var h = esc(String(t == null ? "" : t).replace(/\r\n?/g, "\n").replace(/`+/g, ""));
    h = h.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, "**$1**").replace(/^(\s*)[*\-]\s+/gm, "$1• ");
    h = h.replace(/\*\*([^*\n][^\n]*?)\*\*/g, "<b>$1</b>").replace(/\*\*/g, "").replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, "$1$2");
    return h.replace(/\n/g, "<br>");
  }

  /* ---------- the daily quota, shared with the tutor page (assets/tutor.js) ---------- */
  function ls() { try { return w.localStorage; } catch (e) { return null; } }
  function today() { var N = w.Nursin; if (N && N.dayKey) try { return N.dayKey(); } catch (e) {} var x = new Date(); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  function cRead(day) { try { var c = JSON.parse(ls().getItem(CKEY) || "null"); if (c && c.d === day) return { n: c.n | 0, u: Math.min(MAX_UNLOCKS, c.u | 0) }; } catch (e) {} return { n: 0, u: 0 }; }
  function cWrite(day, c) { try { ls().setItem(CKEY, JSON.stringify({ d: day, n: Math.max(0, c.n), u: c.u })); } catch (e) {} }
  function quota() { var day = today(), c = cRead(day), cap = LIMIT + BONUS * c.u; return { used: c.n, cap: cap, left: Math.max(0, cap - c.n), canUnlock: c.u < MAX_UNLOCKS }; }
  function use() { var day = today(), c = cRead(day); c.n++; cWrite(day, c); return quota(); }
  function refund() { var day = today(), c = cRead(day); if (c.n > 0) { c.n--; cWrite(day, c); } return quota(); }
  function leftText(q) { q = q || quota(); return q.left ? T("باقي " + q.left + " سؤال اليوم", "Il te reste " + q.left + " question" + (q.left > 1 ? "s" : "") + " aujourd’hui") : T("خلصو أسئلة اليوم", "Plus de questions aujourd’hui"); }
  function signedIn() { var G = w.NursinGate; return G ? !!G.signedIn : !!((w.Nursin || {}).me || (w.NursinFB && w.NursinFB.user)); }

  /* ---------- the question context ---------- */
  /* ctx in: {k?, qid?, q, o:[…], a?(index) | ans?(text), pick?(index | text | -1 = time out), x?, answered, graded, t?, l?, lid?, kind?, surface?}
     → a clean ctx; the right answer and the explanation are DROPPED while the question is not answered */
  function norm(c) {
    c = c || {};
    var o = (c.o || []).map(txt).filter(Boolean).slice(0, 6), answered = !!c.answered;
    var pick = c.pick; if (typeof pick === "number") pick = pick >= 0 ? (o[pick] != null ? L3.charAt(pick) + ") " + o[pick] : "") : T("⏰ ما لحق يجاوب (خلص الوقت)", "⏰ pas répondu (temps écoulé)");
    var ans = typeof c.a === "number" ? (o[c.a] != null ? L3.charAt(c.a) + ") " + o[c.a] : "") : c.ans;
    var q = txt(c.q).slice(0, 1200);
    return { k: String(c.k || c.qid || "h" + hash(q)).slice(0, 80), qid: c.qid || "", q: q, o: o, pick: txt(pick).slice(0, 600), ans: answered ? txt(ans).slice(0, 900) : "", x: answered ? txt(c.x).slice(0, 1200) : "",
      answered: answered, graded: !!c.graded, t: c.t || "", l: c.l || "", lid: c.lid || "", kind: c.kind || (o.length ? "mcq" : "open"), surface: c.surface || "" };
  }
  /* a quiz-bank question (assets/quiz-data.js / link-data / midterm) → ctx */
  function fromQ(q, extra) {
    q = q || {}; var c = { qid: q.id, q: q.q, o: q.o, a: q.a, x: q.x, t: q.t, l: q.l, lid: q._l || (q.ls && q.ls.length ? q.ls[q.ls.length - 1] : "") };
    for (var k in (extra || {})) if (extra.hasOwnProperty(k)) c[k] = extra[k];
    return c;
  }
  function visible(c) { return !(c && c.graded && !c.answered); }      // 🔒 graded: only after this question is answered

  /* ---------- the lesson behind the question: the site's own text, only its most relevant part ---------- */
  var DATA = { rea: ["REA", "rea-data.js"], geri: ["GERI", "geri-data.js"], comm: ["COMM", "comm-data.js"], quality: ["QUALITY", "quality-data.js"], mgmt: ["MGMT", "mgmt-data.js"], law: ["LAW", "law-data.js"], medsurg: ["MEDSURG", "medsurg-data.js"], pharma: ["PHARMA", "pharma-data.js"] };
  function lessonOf(c) {
    var L = (w.NLESSONS && w.NLESSONS.list) || [], i, m = [];
    if (c.lid) for (i = 0; i < L.length; i++) if (L[i].s + ":" + (L[i].l || L[i].t) === c.lid) return L[i];
    if (!c.t) return null;
    for (i = 0; i < L.length; i++) if (L[i].t === c.t) m.push(L[i]);
    if (c.l) for (i = 0; i < m.length; i++) if (m[i].l === c.l) return m[i];
    return m[0] || null;
  }
  function words(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    s = s.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[\u064B-\u0655\u0640]/g, "").replace(/[^\w\u0600-\u06FF]+/g, " ");
    return s.split(" ").filter(function (x) { return x.length > 2; }).map(function (x) { return x.length > 4 && x.indexOf("ال") === 0 ? x.slice(2) : x; });
  }
  var STOP = { "شو": 1, "اللي": 1, "يلي": 1, "هيدا": 1, "هيدي": 1, "على": 1, "من": 1, "عند": 1, "بعد": 1, "قبل": 1, "the": 1, "les": 1, "des": 1, "une": 1, "est": 1, "pour": 1, "dans": 1, "avec": 1 };
  /* the parts of a long lesson text that share the most words with the question + options, kept in their order, ≤ max chars */
  function pick(text, query, max) {
    text = String(text || ""); max = max || SNIP; if (text.length <= max) return text;
    var Q = {}; words(query).forEach(function (x) { if (!STOP[x]) Q[x] = 1; });
    var parts = [], buf = "";
    text.split(/\n/).forEach(function (line) { if (buf && buf.length + line.length > 260) { parts.push(buf); buf = ""; } buf += (buf ? "\n" : "") + line; });
    if (buf) parts.push(buf);
    var sc = parts.map(function (p, i) { var seen = {}, s = 0; words(p).forEach(function (x) { if (Q[x] && !seen[x]) { seen[x] = 1; s++; } }); return { i: i, s: s, p: p }; });
    var best = sc.slice().sort(function (a, b) { return b.s - a.s || a.i - b.i; }), keep = {}, n = 0;
    for (var j = 0; j < best.length && n < max; j++) { if (!best[j].s && j > 0) break; if (n + best[j].p.length > max && n) continue; keep[best[j].i] = 1; n += best[j].p.length + 5; }
    var out = [], last = -2;
    sc.forEach(function (x) { if (keep[x.i]) { if (last >= 0 && x.i !== last + 1) out.push("…"); out.push(x.p.slice(0, max)); last = x.i; } });
    return out.join("\n");
  }
  function loadScript(src, ok) {
    if (ok()) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); });
  }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  var lcache = {};
  function lessonText(c) {                                 // → Promise<{n, href, text} | null>, never rejects
    var x = lessonOf(c); if (!x) return Promise.resolve(null);
    var key = x.s + ":" + (x.l || x.t); if (lcache[key]) return lcache[key];
    var out = { n: x.n, href: x.href, text: "" }, D = DATA[x.s];
    var p;
    if (D) p = loadScript("assets/" + D[1] + "?v=" + V, function () { return !!w[D[0]]; }).then(function () {
      var V0 = w[D[0]] || {}, i, s = "";
      if (x.s === "pharma") (V0.drugs || []).forEach(function (g) {
        if (g.g !== x.l) return;
        var f = function (a) { return (a || []).map(function (y) { return y[0] + (y[1] ? " (" + y[1] + ")" : ""); }).join("، "); };
        s += "• " + (g.n || []).join(" / ") + ": " + [f(g.fam), "Action: " + f(g.act), "Indications: " + f(g.ind), "CI: " + f(g.ci), "Surveillance: " + f(g.surv), "Effets: " + f(g.eff)].join(" · ") + "\n";
      });
      else for (i = 0; i < (V0.lessons || []).length; i++) if (V0.lessons[i].k === x.l) s = strip(V0.lessons[i].html);
      out.text = s; return out;
    });
    else {
      var page = x.href.split("#")[0], a = x.href.split("#")[1] || "";
      var here = ((w.location && w.location.pathname) || "").split("/").pop() || "index.html";
      var el = page === here && a ? d.getElementById(a) : null;
      if (el) { out.text = strip(el.innerHTML); p = Promise.resolve(out); }
      else p = fetch(page, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (h) {
        if (!h) return out;
        var body = h;
        if (w.DOMParser) { var doc = new DOMParser().parseFromString(h, "text/html"), e = (a && doc.getElementById(a)) || doc.querySelector("main"); body = e ? e.innerHTML : ""; }
        out.text = strip(body); return out;
      });
    }
    lcache[key] = timeout(p.catch(function () { return out; }), 5000).then(function (r) { return r || out; });
    lcache[key].then(function (r) { if (!r || !r.text) delete lcache[key]; });
    return lcache[key];
  }

  /* ---------- what is sent ---------- */
  function persona() {
    var O = w.OSMAN, base = "[شخصيتك] إنت «الأستاذ عثمان»، أستاذ تمريض لبناني بمعهد بلبنان. بتحكي عربي لبناني، والمصطلحات بالفرنسي مع معناها بالعربي.";
    var p = O && O.personaPlain ? (FR() && O.personaPlain.fr ? O.personaPlain.fr : O.personaPlain.ar) || base : base;   // the plain persona: no roast, no proverb here
    return p + (FR() ? " [Langue] L'élève a choisi «Français seulement» : réponds uniquement en français (termes médicaux en français, sans traduction arabe)." : "");
  }
  var RULES = "[مهمّتك هلّق: «🙋 اسأل عثمان»] الطالب عم يحلّ سؤال على موقع nursin وكبس «اسأل عثمان» تحت السؤال. جاوب سؤالو عن هالسؤال بس:" +
    "\n- جواب قصير وبسيط (٣ لـ ٦ أسطر)، عربي لبناني سهل، بلا مقدّمات." +
    "\n- كل مصطلح فرنسي (أو إنكليزي) اكتب حدّو معناه بالعربي بين قوسين، مثلاً: Infarctus (جلطة قلبية)." +
    "\n- اعتمد على نص الدرس من الموقع تحت إذا موجود. إذا قلت شي مش موجود بالدرس، قول إنّو «معلومة عامة»." +
    "\n- بلا بهدلة، بلا مواعظ ولا حِكم ولا أمثال، بلا مزح عالطالب: شرح لطيف ومباشر بس.";
  var NOREVEAL = "\n[⚠️ مهم كتير] الطالب لسّا ما جاوب على هالسؤال. ممنوع تقلّو الجواب الصح، وممنوع تقلّو إذا خيار معيّن صح أو غلط، وممنوع تشطبلو خيارات أو تلمّح لحرف الجواب." +
    " عطيه تلميح بس: الفكرة أو القاعدة من الدرس، أو معنى كلمة، أو سؤال صغير بيخلّيه يوصل لحالو. إذا طلب الجواب، قلّو بلطف «جاوب إنت أوّل، وبعدين بشرحلك ليش» وعطيه تلميح.";
  var REVEAL = "\n[الطالب جاوب] فيك تحكي عن الجواب الصح: اشرحلو ليش هوّي الصح، وإذا جوابو غلط اشرحلو ليش خيارو غلط، وربطها بالدرس.";
  function contextText(c, snip) {
    var s = persona() + "\n" + RULES + (c.answered ? REVEAL : NOREVEAL);
    s += "\n\n[السؤال" + (c.kind === "blank" ? " (عبّي الفراغ: ___ = الكلمة الناقصة)" : c.kind === "tf" ? " (صح أو غلط)" : "") + "]\n" + c.q;
    if (c.o.length) s += "\n[الخيارات]\n" + c.o.map(function (o, i) { return L3.charAt(i) + ") " + o; }).join("\n");
    if (c.answered) {
      s += "\n[جواب الطالب] " + (c.pick || "—");
      if (c.ans) s += "\n[الجواب الصح] " + c.ans;
      if (c.x) s += "\n[شرح الموقع] " + c.x;
    } else if (c.pick) s += "\n[الطالب عم يميل لـ] " + c.pick + " (لسّا ما أكّد، ما تقلّو إذا صح أو غلط)";
    if (snip && snip.n) s += "\n\n[الدرس على الموقع: " + snip.n + "]" + (snip.text ? "\n" + snip.text : "");
    return s;
  }
  function payload(c, thread, snip) {
    c = c && c.o && c.k ? c : norm(c);
    var msgs = (thread || []).filter(function (m) { return m && m.t; }).slice(-KEEP).map(function (m) { return { role: m.r === "u" ? "user" : "assistant", text: String(m.t).slice(0, 2000) }; });
    if (snip && snip.text) snip = { n: snip.n, text: pick(snip.text, c.q + " " + c.o.join(" ") + " " + c.ans + " " + (msgs.length ? msgs[msgs.length - 1].text : ""), SNIP) };
    return { messages: msgs, context: contextText(c, snip) };
  }

  /* ---------- the thread per question (this tab) ---------- */
  function sGet() { try { var o = JSON.parse(w.sessionStorage.getItem(SKEY) || "null"); if (o && o.v === 1 && o.k) return o; } catch (e) {} return { v: 1, k: {} }; }
  function sSet(o) {
    var ks = Object.keys(o.k); if (ks.length > MAXK) ks.sort(function (a, b) { return (o.k[a].at || 0) - (o.k[b].at || 0); }).slice(0, ks.length - MAXK).forEach(function (k) { delete o.k[k]; });
    try { w.sessionStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) {}
  }
  function th(k) { var o = sGet(); return o.k[k] || { m: [], open: false, at: 0 }; }
  function thSet(k, t) { var o = sGet(); t.m = (t.m || []).slice(-KEEP); t.at = Date.now(); o.k[k] = t; sSet(o); }

  /* ---------- the widget ---------- */
  var busy = {}, drafts = {};
  function chips(c) {
    return [c.answered ? T("ليش هيدا الجواب الصح؟", "Pourquoi c'est la bonne réponse ?") : T("💡 عطيني تلميح", "💡 Donne-moi un indice"),
      T("اشرحلي الفكرة ببساطة", "Explique-moi l'idée simplement"), T("شو معنى الكلمة الفرنسية؟", "Que veulent dire les mots difficiles ?")];
  }
  function live(k) { return [].filter.call(d.querySelectorAll(".askw"), function (e) { return e._ask && e._ask.k === k; }); }
  function paint(el) {
    var c = el._ask, t = th(c.k), box = el.querySelector(".askbox"), b = el.querySelector(".askb");
    b.setAttribute("aria-expanded", t.open ? "true" : "false"); box.hidden = !t.open; el.classList.toggle("open", !!t.open);
    b.innerHTML = '<span aria-hidden="true">🙋</span> ' + esc(T("اسأل عثمان", "Demande à Osman")) + (t.m.length ? ' <small class="askn">(' + Math.ceil(t.m.length / 2) + ")</small>" : "");
    if (!t.open) return;
    el.querySelector(".askleft").textContent = signedIn() ? leftText() : "";
    var hint = el.querySelector(".askhint");
    hint.hidden = c.answered; hint.textContent = T("💡 لسّا ما جاوبت: عثمان بيعطيك تلميح بس، ما بيقلّك الجواب 😉", "💡 Tu n'as pas encore répondu : Osman te donne un indice, pas la réponse 😉");
    var h = "";
    t.m.forEach(function (m, i) {
      if (m.r === "u") h += '<div class="askm asku"><p>' + esc(m.t) + "</p></div>";
      else h += '<div class="askm asko' + (m.e ? " aske" : "") + '"><span class="aska" aria-hidden="true">👨‍🏫</span><div><p>' + fmt(m.t) + "</p>" +
        (m.e ? (m.rt && i === t.m.length - 1 && !busy[c.k] ? '<p class="askact"><button type="button" class="btn sm askretry">🔄 ' + esc(T("جرّب كمان مرّة", "Réessayer")) + "</button></p>" : "") : '<p class="askact"><button type="button" class="asksave" data-i="' + i + '"' + (m.sv ? " disabled" : "") + ">" + (m.sv ? esc(T("✅ انحفظ بملاحظاتي", "✅ Enregistré dans mes notes")) : "💾 " + esc(T("احفظ بملاحظاتي", "Enregistrer dans mes notes"))) + "</button>" + (m.sv ? ' <a href="notes.html">📒</a>' : "") + "</p>") + "</div></div>";
    });
    if (busy[c.k]) h += '<div class="askm asko askty"><span class="aska" aria-hidden="true">👨‍🏫</span><div><span class="tdots" aria-label="' + esc(T("عثمان عم يكتب", "Osman écrit")) + '"><i></i><i></i><i></i></span></div></div>';
    el.querySelector(".askth").innerHTML = h;
    var lock = el.querySelector(".asklock"), f = el.querySelector(".askf"), ch = el.querySelector(".askchips");
    if (!signedIn()) {
      lock.hidden = false; f.hidden = true; ch.hidden = true;
      lock.innerHTML = '<p class="small">🔒 ' + esc(T("عثمان بس للي عندن حساب. سجّل دخول بغوغل (ببلاش) وبيجاوبك هون.", "Osman répond aux élèves connectés. Connecte-toi avec Google (gratuit).")) + '</p><button class="btn glk-go askgo" type="button">' + esc(T("تسجيل الدخول بغوغل", "Se connecter avec Google")) + "</button>";
      return;
    }
    lock.hidden = true; f.hidden = false;
    ch.hidden = !!busy[c.k] || t.m.length > 4;
    ch.innerHTML = chips(c).map(function (x) { return '<button type="button" class="askchip">' + esc(x) + "</button>"; }).join("");
    f.querySelector("button").disabled = !!busy[c.k];
  }
  function build(c) {
    var el = d.createElement("div"); el.className = "askw"; el.setAttribute("data-nofr", ""); el._ask = c;
    el.innerHTML = '<button type="button" class="askb" aria-expanded="false"></button>' +
      '<div class="askbox" hidden role="region" aria-label="' + esc(T("اسأل عثمان", "Demande à Osman")) + '"><div class="askhd"><b>👨‍🏫 ' + esc(T("الأستاذ عثمان", "Professeur Osman")) + '</b><small class="askleft"></small><button type="button" class="askx" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></div>' +
      '<p class="askhint small"></p><div class="askth" aria-live="polite"></div><div class="asklock" hidden></div><div class="askchips"></div>' +
      '<form class="askf" autocomplete="off"><textarea rows="2" maxlength="' + MAXQ + '" placeholder="' + esc(T("شو ما فهمت؟ اكتب سؤالك…", "Qu'est-ce que tu n'as pas compris ? Écris ta question…")) + '" aria-label="' + esc(T("سؤالك لعثمان", "Ta question pour Osman")) + '"></textarea>' +
      '<button class="btn pri askgo2" type="submit">' + esc(T("ابعت", "Envoyer")) + " ➤</button></form></div>";
    el.querySelector(".askb").addEventListener("click", function () { var t = th(c.k); t.open = !t.open; thSet(el._ask.k, t); paint(el); if (t.open) { var ta = el.querySelector("textarea"); if (ta && !/Android|iPhone|iPad/i.test(navigator.userAgent)) try { ta.focus({ preventScroll: true }); } catch (e) {} } });
    el.querySelector(".askx").addEventListener("click", function () { var t = th(el._ask.k); t.open = false; thSet(el._ask.k, t); paint(el); });
    var f = el.querySelector(".askf"), ta = f.querySelector("textarea");
    ta.value = drafts[c.k] || ""; ta.addEventListener("input", function () { drafts[el._ask.k] = ta.value; });   // a page that redraws its card (home path, sheets) keeps what was being typed
    var go = function () { if (send(el, ta.value)) { ta.value = ""; drafts[el._ask.k] = ""; } };
    f.addEventListener("submit", function (e) { e.preventDefault(); go(); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); go(); } });
    el.addEventListener("click", function (e) {
      var x = e.target.closest && e.target.closest(".askchip"); if (x) { send(el, x.textContent); return; }
      var s = e.target.closest && e.target.closest(".asksave"); if (s) save(el, +s.getAttribute("data-i"));
      var r = e.target.closest && e.target.closest(".askretry"); if (r) retry(el);
    });
    return el;
  }
  /* host = the question card (or a .askslot); the widget goes at its end. Same call again = update (e.g. answered now). */
  function mount(host, ctx) {
    if (!host || !host.querySelector) return null;
    var c = norm(ctx), el = null, kids = host.children || [];
    for (var i = 0; i < kids.length; i++) if (kids[i].classList && kids[i].classList.contains("askw")) el = kids[i];
    if (!visible(c)) { if (el) el.remove(); return null; }
    if (!el) { el = build(c); host.appendChild(el); }
    el._ask = c; paint(el); return el;
  }
  function slot(ctx) {
    var c = norm(ctx); if (!visible(c)) return "";
    return '<div class="askslot" data-ask="' + esc(JSON.stringify(c)) + '"></div>';
  }
  function hydrate() {
    [].forEach.call(d.querySelectorAll(".askslot[data-ask]:not([data-on])"), function (s) {
      s.setAttribute("data-on", ""); var c = null; try { c = JSON.parse(s.getAttribute("data-ask")); } catch (e) {}
      if (c) mount(s, c);
    });
  }

  function post(c, t, snip) {
    var ctl = ("AbortController" in w) ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(c, t.m, snip)), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { clearTimeout(tm); var x = j && j.text; if (!x || typeof x !== "string" || /^\s*صار في مشكلة/.test(x)) throw new Error("busy"); return x.trim(); }, function (e) { clearTimeout(tm); throw e; });
  }
  function repaint(k) { live(k).forEach(paint); }
  function send(el, text) {
    var c = el._ask; text = String(text || "").trim().slice(0, MAXQ);
    if (!text || busy[c.k]) return false;
    if (!signedIn()) { paint(el); return false; }
    var t = th(c.k), q = quota();
    if (!q.left) {
      t.m.push({ r: "o", e: 1, t: T("خلصو أسئلة عثمان لليوم 🙏 (" + q.cap + " سؤال). بكرا منكمّل، أو افتح ٥ زيادة بإعلان قصير من صفحة **الأستاذ عثمان** 👨‍🏫", "Plus de questions pour Osman aujourd’hui 🙏 (" + q.cap + "). On continue demain, ou débloque 5 de plus avec une courte pub sur la page **Professeur Osman** 👨‍🏫") });
      thSet(c.k, t); repaint(c.k); return true;
    }
    use();
    t.m = t.m.filter(function (m) { return !m.e; }); t.m.push({ r: "u", t: text }); t.open = true; thSet(c.k, t);
    ask(c);
    return true;
  }
  function ask(c) {
    busy[c.k] = true; repaint(c.k);
    var go = function (snip) { return post(c, th(c.k), snip); };
    timeout(lessonText(c), 3500).then(function (snip) {
      return go(snip).catch(function () { return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return go(snip); }); });
    }).then(function (x) {
      busy[c.k] = false; var t = th(c.k); t.m.push({ r: "o", t: x }); thSet(c.k, t); repaint(c.k);
      try { d.dispatchEvent(new CustomEvent("nursin:ask", { detail: { k: c.k, qid: c.qid, answered: c.answered, surface: c.surface } })); } catch (e) {}
    }, function () {
      busy[c.k] = false; refund(); var t = th(c.k);
      t.m.push({ r: "o", e: 1, rt: 1, t: T("الأستاذ مشغول هلّق، جرّب كمان شوي 🙏 (ما انحسب عليك)", "Le professeur est occupé, réessaie dans un instant 🙏 (pas compté)") }); thSet(c.k, t); repaint(c.k);
    });
  }
  function retry(el) {
    var c = el._ask, t = th(c.k); if (busy[c.k]) return;
    t.m = t.m.filter(function (m) { return !m.e; }); var last = t.m.length && t.m[t.m.length - 1];
    if (!last || last.r !== "u") return;
    if (!quota().left) { t.m.pop(); thSet(c.k, t); send(el, last.t); return; }
    use(); thSet(c.k, t); ask(c);
  }
  /* 💾 → 📒 ملاحظاتي (assets/notes.js): the note of THIS question, the exchange added under what is already there */
  function save(el, i) {
    var c = el._ask, t = th(c.k), m = t.m[i], N = w.NursinNotes; if (!m || m.r !== "o") return;
    var qn = null; for (var j = i - 1; j >= 0; j--) if (t.m[j].r === "u") { qn = t.m[j]; break; }
    if (!N || !N.put || !N.state) { w.location.href = "notes.html"; return; }
    var bank = null; (w.QUIZ || []).concat(w.LINKQ || []).forEach(function (q) { if (q.id === c.qid) bank = q; });
    var where = bank && N.ofQ ? N.ofQ(bank) : { subject: "other", lesson: "" };
    var meta = { refType: "q", refId: bank ? bank.id : "h:" + hash(N.norm ? N.norm(c.q) : c.q), refText: c.q.slice(0, N.MAXR || 300), subject: where.subject, lesson: where.lesson };
    var st = N.state(), o = N.owner ? N.owner() : "", old = N.find(st, o, N.idFor(meta.refType, meta.refId));
    var add = "🙋 " + (qn ? qn.t : "") + "\n👨‍🏫 " + T("عثمان: ", "Osman : ") + String(m.t).replace(/\*\*/g, "");
    N.put(st, o, meta, (old && old.text ? old.text + "\n\n" : "") + add);
    try { w.localStorage.setItem(N.KEY, JSON.stringify(st)); } catch (e) {}
    try { if (N.flush) N.flush(); if (N.mount) N.mount(); } catch (e) {}
    m.sv = 1; thSet(c.k, t); repaint(c.k);
  }

  /* ---------- 📒 «🙋 اسأل عثمان» عن ملاحظة / تعليمة (28s — Abdullah, Nov 1 2026 11:35–11:37 PM: «لمن بحط ملاحظة عن شي ممكن كمان
     اني بكون كاتب شي بدي اعرفه بعدين ف بسأله عنه فرد مرة») ----------
     • While WRITING a note (the 📝 sheet of assets/notes.js, on every page), on every note card of 📒 notes.html and on every highlight
       card of 🖍️ highlights.html: «🙋 اسأل عثمان» + an optional field «شو بدك تعرف؟». Empty → Osman answers what the note asks /
       explains it (a highlight: explains the highlighted words).
     • Same endpoint, same plain persona (no roast / proverb), same daily quota and «باقي N سؤال اليوم» as the question box above.
     • The answer is SAVED IN THE NOTE ITSELF: appended to its text as «🙋 <question>\n🧑‍🏫 عثمان: <answer>» (NursinNotes.withOsman,
       ≤ 2000 characters) — the notes doc keeps exactly the 8 fields rules v17…v21 accept, so it syncs with NO rules change. A follow-up
       appends one more block. A highlight's answer goes into that highlight's own note (id l_<lesson>#<part>~h<id>, like its 📝).
     • 🔒 A note opened from a graded question that is not answered yet (no «🙋» box on that card) cannot ask: same anti-cheat as above;
       an unanswered practice question → hint only (NOREVEAL). */
  var NRULES = "[مهمّتك هلّق: «🙋 اسأل عثمان» عن ملاحظة] الطالب كتب ملاحظة بـ «📒 ملاحظاتي» على موقع nursin وكبس «اسأل عثمان». جوابك رح ينحفظ تحت ملاحظتو:" +
    "\n- إذا كتب سؤال، جاوبو عليه. إذا ما كتب سؤال: جاوب عن الشي اللي الملاحظة عم تسأل عنه أو بدّو يعرفو، وإذا الملاحظة مش سؤال اشرحها ببساطة وصحّحها إذا فيها غلط." +
    "\n- جواب قصير (٣ لـ ٥ أسطر، أقل من ٥٠٠ حرف)، عربي لبناني سهل، بلا عناوين. ابدأ دغري بالجواب: بلا «أهلاً» ولا «يا ابني» ولا «بخصوص سؤالك»." +
    "\n- كل مصطلح فرنسي (أو إنكليزي) اكتب حدّو معناه بالعربي بين قوسين، مثلاً: Infarctus (جلطة قلبية)." +
    "\n- اعتمد على نص الدرس من الموقع تحت إذا موجود. إذا قلت شي مش موجود بالدرس، قول إنّو «معلومة عامة»." +
    "\n- بلا بهدلة، بلا مواعظ ولا حِكم ولا أمثال، بلا مزح عالطالب: شرح لطيف ومباشر بس.";
  var HRULES = "\n[تعليمة] الملاحظة عن جملة علّمها الطالب (🖍️) بالدرس: إذا ما سأل شي، اشرحلو هالجملة ببساطة وشو أهمّيتها.";
  var NNOREVEAL = "\n[⚠️ مهم كتير] الملاحظة عن سؤال الطالب لسّا ما جاوب عليه. ممنوع تقلّو الجواب الصح أو إذا خيار معيّن صح أو غلط: عطيه تلميح بس، وإذا طلب الجواب قلّو بلطف «جاوب إنت أوّل، وبعدين بشرحلك ليش».";
  var NTYPE = { q: "سؤال", lesson: "درس", card: "بطاقة", summary: "خلاصة", free: "ملاحظة حرّة" };
  function isHl(m) { return !!(m && m.refType === "lesson" && /~h[A-Za-z0-9]+$/.test(m.refId || "")); }
  /* info = {meta, text (the note now), q (what they ask, may be empty), qc (a normalised question ctx | null)} */
  function noteContextText(info, snip) {
    var m = info.meta || {}, N = w.NursinNotes, qc = info.qc;
    var s = persona() + "\n" + NRULES + (isHl(m) ? HRULES : "") + (qc && !qc.answered ? NNOREVEAL : "");
    s += "\n\n[ملاحظة الطالب" + (/(🧑‍🏫|👨‍🏫)/.test(info.text || "") ? " (مع أجوبتك القديمة تحتها)" : "") + "]\n" + (String(info.text || "").trim() || "(لسّا فاضية)");
    if (m.refText) s += "\n[الملاحظة مكتوبة على " + (isHl(m) ? "جملة معلّمة بالدرس" : (NTYPE[m.refType] || "شي")) + "] " + txt(m.refText).replace(/^🖍️\s*/, "");
    if (N && N.subjName && m.subject && m.subject !== "other") s += "\n[المادة] " + N.subjName(m.subject) + (m.lesson && N.lessonName ? " › " + N.lessonName(m.lesson) : "");
    if (qc && qc.q) {
      s += "\n[السؤال]\n" + qc.q;
      if (qc.o && qc.o.length) s += "\n[الخيارات]\n" + qc.o.map(function (o, i) { return L3.charAt(i) + ") " + o; }).join("\n");
      if (qc.answered) { s += "\n[جواب الطالب] " + (qc.pick || "—"); if (qc.ans) s += "\n[الجواب الصح] " + qc.ans; if (qc.x) s += "\n[شرح الموقع] " + qc.x; }
    }
    if (snip && snip.n) s += "\n\n[الدرس على الموقع: " + snip.n + "]" + (snip.text ? "\n" + snip.text : "");
    return s;
  }
  function noteAskLine(info) {
    var q = String(info.q || "").trim();
    if (q) return q;
    return isHl(info.meta) ? T("اشرحلي هالجملة اللي علّمتها", "Explique-moi la phrase que j'ai surlignée") : T("جاوبني عن ملاحظتي (أو اشرحلي ياها)", "Réponds à ma note (ou explique-la-moi)");
  }
  function notePayload(info, snip) {
    var line = noteAskLine(info), qc = info.qc;
    if (snip && snip.text) snip = { n: snip.n, text: pick(snip.text, [info.text, (info.meta || {}).refText, line, qc ? qc.q : ""].join(" "), SNIP) };
    return { messages: [{ role: "user", text: line.slice(0, MAXQ) }], context: noteContextText(info, snip) };
  }
  function noteLesson(info) {
    var m = info.meta || {}, qc = info.qc;
    if (qc && (qc.lid || qc.t)) return { lid: qc.lid, t: qc.t, l: qc.l };
    var lk = m.lesson || ""; if (!lk && isHl(m)) lk = String(m.refId).replace(/#.*$|~h.*$/, "");
    return { lid: lk };
  }
  var NS = {};                                              // per note id (this page): {open, busy, draft, msg, err, last}
  function nst(id) { return NS[id] || (NS[id] = { open: false, busy: false, draft: "", msg: "", err: 0, last: "" }); }
  function noteChips(src) {
    var m = src.meta();
    return isHl(m) ? [T("اشرحلي هالجملة", "Explique cette phrase"), T("ليش هيدي مهمّة؟", "Pourquoi c'est important ?"), T("شو معنى الكلمة الفرنسية؟", "Que veulent dire les mots difficiles ?")]
      : [T("اشرحلي ملاحظتي", "Explique ma note"), T("زيدني معلومة مهمّة", "Ajoute une info importante"), T("شو معنى الكلمة الفرنسية؟", "Que veulent dire les mots difficiles ?")];
  }
  function npaint(el) {
    var src = el._nsrc, id = src.id, s = nst(id), b = el.querySelector(".askb"), box = el.querySelector(".askbox");
    b.setAttribute("aria-expanded", s.open ? "true" : "false"); box.hidden = !s.open; el.classList.toggle("open", !!s.open);
    b.innerHTML = '<span aria-hidden="true">🙋</span> ' + esc(T("اسأل عثمان", "Demande à Osman")) + (s.busy ? ' <small class="askn">…</small>' : "");
    if (!s.open) return;
    el.querySelector(".askleft").textContent = signedIn() && !src.lock ? leftText() : "";
    var hint = el.querySelector(".askhint");
    hint.hidden = false;
    hint.textContent = src.lock ? "" : isHl(src.meta()) ? T("👨‍🏫 عثمان بيشرحلك الجملة اللي علّمتها، وجوابو بينحفظ بملاحظتها 📒", "👨‍🏫 Osman t'explique ta phrase surlignée ; sa réponse est enregistrée dans sa note 📒")
      : T("👨‍🏫 عثمان بيقرا ملاحظتك وبيجاوب، وجوابو بينحفظ تحتها 📒", "👨‍🏫 Osman lit ta note et répond ; sa réponse est enregistrée dessous 📒");
    hint.hidden = !hint.textContent;
    var h = "";
    if (s.busy) h += '<div class="askm asko askty"><span class="aska" aria-hidden="true">👨‍🏫</span><div><span class="tdots" aria-label="' + esc(T("عثمان عم يكتب", "Osman écrit")) + '"><i></i><i></i><i></i></span></div></div>';
    else if (s.last && src.inline) h += '<div class="askm asko"><span class="aska" aria-hidden="true">👨‍🏫</span><div><p>' + fmt(s.last) + '</p><p class="askact nasaved">✅ ' + esc(T("انحفظ تحت ملاحظتك", "Enregistré sous ta note")) + "</p></div></div>";
    else if (s.last) h += '<p class="small nasaved">✅ ' + esc(T("انحفظ جواب عثمان تحت الملاحظة", "Réponse d'Osman enregistrée sous la note")) + "</p>";
    if (s.msg) h += '<div class="askm asko aske"><span class="aska" aria-hidden="true">👨‍🏫</span><div><p>' + fmt(s.msg) + "</p>" + (s.err === 2 && !s.busy ? '<p class="askact"><button type="button" class="btn sm askretry">🔄 ' + esc(T("جرّب كمان مرّة", "Réessayer")) + "</button></p>" : "") + "</div></div>";
    el.querySelector(".askth").innerHTML = h;
    var lock = el.querySelector(".asklock"), f = el.querySelector(".askf"), ch = el.querySelector(".askchips");
    if (src.lock) { lock.hidden = false; f.hidden = true; ch.hidden = true; lock.innerHTML = '<p class="small">🔒 ' + esc(src.lock) + "</p>"; return; }
    if (!signedIn()) {
      lock.hidden = false; f.hidden = true; ch.hidden = true;
      lock.innerHTML = '<p class="small">🔒 ' + esc(T("عثمان بس للي عندن حساب. سجّل دخول بغوغل (ببلاش) وبيجاوبك هون.", "Osman répond aux élèves connectés. Connecte-toi avec Google (gratuit).")) + '</p><button class="btn glk-go askgo" type="button">' + esc(T("تسجيل الدخول بغوغل", "Se connecter avec Google")) + "</button>";
      return;
    }
    lock.hidden = true; f.hidden = false; ch.hidden = !!s.busy;
    ch.innerHTML = noteChips(src).map(function (x) { return '<button type="button" class="askchip">' + esc(x) + "</button>"; }).join("");
    f.querySelector("button").disabled = !!s.busy;
  }
  function nlive(id) { return [].filter.call(d.querySelectorAll(".naskw"), function (e) { return e._nsrc && e._nsrc.id === id; }); }
  function nrepaint(id) { nlive(id).forEach(npaint); }
  function noteText(src) { var N = w.NursinNotes; if (src.text) return src.text(); var n = N && N.find && N.state ? N.find(N.state(), N.owner ? N.owner() : "", src.id) : null; return n ? n.text : ""; }
  /* → "" (ok to ask) or the reason in words */
  function noteBlock(src, q) {
    var N = w.NursinNotes, m = src.meta(), base = noteText(src);
    if (src.lock) return src.lock;
    if (!String(base).trim() && !String(q || "").trim() && !isHl(m) && !(m.refType === "q" || m.refType === "card")) return T("اكتب ملاحظتك أو سؤالك أوّل ✍️", "Écris d'abord ta note ou ta question ✍️");
    if (N && N.room && N.room(base) < 160) return T("الملاحظة قرّبت تتعبّى (٢٠٠٠ حرف) 📒 امحي شي منها أو اعمل ملاحظة حرّة جديدة وسأل عثمان فيها.", "La note est presque pleine (2000 caractères) 📒 Raccourcis-la ou crée une nouvelle note libre.");
    return "";
  }
  function noteSend(el, text) {
    var src = el._nsrc, id = src.id, s = nst(id), q = String(text || "").trim().slice(0, MAXQ);
    if (s.busy) return false;
    if (!signedIn()) { npaint(el); return false; }
    var why = noteBlock(src, q); s.msg = ""; s.err = 0;
    if (why) { s.msg = why; s.err = 1; s.open = true; nrepaint(id); return false; }
    var qa = quota();
    if (!qa.left) { s.msg = T("خلصو أسئلة عثمان لليوم 🙏 (" + qa.cap + " سؤال). بكرا منكمّل، أو افتح ٥ زيادة بإعلان قصير من صفحة **الأستاذ عثمان** 👨‍🏫", "Plus de questions pour Osman aujourd’hui 🙏 (" + qa.cap + "). On continue demain, ou débloque 5 de plus avec une courte pub sur la page **Professeur Osman** 👨‍🏫"); s.err = 1; s.open = true; nrepaint(id); return true; }
    if (src.before) try { src.before(); } catch (e) {}
    use(); s.q = q; s.open = true; s.last = ""; s.draft = "";
    noteAsk(src);
    return true;
  }
  function noteAsk(src) {
    var id = src.id, s = nst(id), q = s.q || "";
    s.busy = true; nrepaint(id);
    var info = function () { return { meta: src.meta(), text: noteText(src), q: q, qc: src.qc || null }; };
    var go = function (snip) {
      var ctl = ("AbortController" in w) ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
      return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notePayload(info(), snip)), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { clearTimeout(tm); var x = j && j.text; if (!x || typeof x !== "string" || /^\s*صار في مشكلة/.test(x)) throw new Error("busy"); return x.trim(); }, function (e) { clearTimeout(tm); throw e; });
    };
    timeout(lessonText(noteLesson(info())), 3500).then(function (snip) {
      return go(snip).catch(function () { return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return go(snip); }); });
    }).then(function (x) {
      s.busy = false;
      var N = w.NursinNotes, nt = N && N.withOsman ? N.withOsman(noteText(src), q, x, FR()) : null;
      if (nt == null) { refund(); s.msg = T("ما في محل بالملاحظة لجواب عثمان (٢٠٠٠ حرف) 📒", "Plus de place dans la note pour la réponse (2000 caractères) 📒"); s.err = 1; nrepaint(id); return; }
      N.put(N.state(), N.owner ? N.owner() : "", Object.assign({}, src.meta(), { id: id }), nt);
      if (N.commit) N.commit(); else { try { w.localStorage.setItem(N.KEY, JSON.stringify(N.state())); } catch (e) {} if (N.flush) N.flush(); }
      s.last = x; s.q = "";
      if (src.after) try { src.after(nt); } catch (e) {}
      nrepaint(id);
      try { d.dispatchEvent(new CustomEvent("nursin:ask", { detail: { k: "note:" + id, note: id, surface: src.surface || "note" } })); } catch (e) {}
    }, function () {
      s.busy = false; refund();
      s.msg = T("الأستاذ مشغول هلّق، جرّب كمان شوي 🙏 (ما انحسب عليك)", "Le professeur est occupé, réessaie dans un instant 🙏 (pas compté)"); s.err = 2; nrepaint(id);
    });
  }
  function nbuild(src) {
    var el = d.createElement("div"); el.className = "askw naskw"; el.setAttribute("data-nofr", ""); el._nsrc = src;
    el.innerHTML = '<button type="button" class="askb" aria-expanded="false"></button>' +
      '<div class="askbox" hidden role="region" aria-label="' + esc(T("اسأل عثمان", "Demande à Osman")) + '"><div class="askhd"><b>👨‍🏫 ' + esc(T("الأستاذ عثمان", "Professeur Osman")) + '</b><small class="askleft"></small><button type="button" class="askx" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></div>' +
      '<p class="askhint small"></p><div class="askth" aria-live="polite"></div><div class="asklock" hidden></div><div class="askchips"></div>' +
      '<form class="askf" autocomplete="off"><textarea rows="1" maxlength="' + MAXQ + '" placeholder="' + esc(T("شو بدك تعرف؟ (اختياري)", "Que veux-tu savoir ? (facultatif)")) + '" aria-label="' + esc(T("شو بدك تعرف؟", "Que veux-tu savoir ?")) + '"></textarea>' +
      '<button class="btn pri askgo2" type="submit">' + esc(T("اسأل", "Demander")) + " ➤</button></form></div>";
    var f = el.querySelector(".askf"), ta = f.querySelector("textarea");
    el.querySelector(".askb").addEventListener("click", function (e) { e.preventDefault(); var s = nst(el._nsrc.id); s.open = !s.open; if (!s.open) { s.msg = ""; } npaint(el); });
    el.querySelector(".askx").addEventListener("click", function (e) { e.preventDefault(); var s = nst(el._nsrc.id); s.open = false; s.msg = ""; npaint(el); });
    ta.value = nst(src.id).draft || ""; ta.addEventListener("input", function () { nst(el._nsrc.id).draft = ta.value; });
    var go = function () { if (noteSend(el, ta.value)) ta.value = ""; };
    f.addEventListener("submit", function (e) { e.preventDefault(); go(); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); go(); } });
    el.addEventListener("click", function (e) {
      var x = e.target.closest && e.target.closest(".askchip"); if (x) { noteSend(el, x.textContent); return; }
      var r = e.target.closest && e.target.closest(".askretry"); if (r) { var s = nst(el._nsrc.id); s.msg = ""; noteSend(el, s.q || ""); }
    });
    return el;
  }
  /* host gets the widget at its end; src = {id, meta() (refType/refId/refText/subject/lesson), text()?, before()?, after(newText)?, qc?, lock?, inline?, surface?} */
  function noteMount(host, src) {
    if (!host || !host.querySelector || !src || !src.id) return null;
    var el = null, kids = host.children || [];
    for (var i = 0; i < kids.length; i++) if (kids[i].classList && kids[i].classList.contains("naskw")) el = kids[i];
    if (!el) { el = nbuild(src); host.appendChild(el); }
    el._nsrc = src; npaint(el); return el;
  }
  /* <div class="naskslot" data-meta="{…note meta with id…}"> drawn by notes.html / highlights.html lists */
  function noteHydrate(root) {
    [].forEach.call((root || d).querySelectorAll(".naskslot[data-meta]"), function (sl) {
      if (sl.querySelector(".naskw")) return;
      var m = null; try { m = JSON.parse(sl.getAttribute("data-meta")); } catch (e) {} if (!m || !m.id) return;
      noteMount(sl, { id: m.id, meta: function () { return m; }, surface: sl.getAttribute("data-surface") || "notes" });
    });
  }
  function typing(root) { var a = d.activeElement; return !!(a && a.tagName === "TEXTAREA" && a.value && a.closest && a.closest(".naskw") && (!root || root.contains(a))); }   // a half-typed question survives a redraw

  w.NursinAsk = { API: API, LIMIT: LIMIT, CKEY: CKEY, SKEY: SKEY, norm: norm, fromQ: fromQ, visible: visible, slot: slot, mount: mount, hydrate: hydrate,
    payload: payload, contextText: contextText, persona: persona, strip: strip, pick: pick, lessonOf: lessonOf, lessonText: lessonText, quota: quota, use: use, refund: refund, leftText: leftText, chips: chips, signedIn: signedIn };
  w.NursinAsk.noteMount = noteMount; w.NursinAsk.noteHydrate = noteHydrate; w.NursinAsk.notePayload = notePayload; w.NursinAsk.noteContextText = noteContextText;
  w.NursinAsk.noteBlock = noteBlock; w.NursinAsk.noteState = nst; w.NursinAsk.typing = typing; w.NursinAsk.isHl = isHl; w.NursinAsk.noteLesson = noteLesson;
  if (!d || !d.addEventListener) return;
  var hT = 0;
  function init() {
    hydrate(); noteHydrate();
    try { new MutationObserver(function () { if (hT) return; hT = setTimeout(function () { hT = 0; hydrate(); noteHydrate(); }, 30); }).observe(d.body, { childList: true, subtree: true }); } catch (e) {}
    var all = function () { [].forEach.call(d.querySelectorAll(".askw"), function (el) { if (el._ask) paint(el); else if (el._nsrc) npaint(el); }); };
    d.addEventListener("nursin:gate", all); d.addEventListener("nursin:auth", all); d.addEventListener("nursin:me", all);
    w.addEventListener("storage", function (e) { if (e.key === CKEY) all(); });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
