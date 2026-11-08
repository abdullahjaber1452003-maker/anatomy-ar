/* 💬 «نقاش» — a daily study partner (Abdullah, Nov 8 2026 4:34–5:09 PM, voice notes: «بكون أنا وشي شخص وهمي… هو بيطرح علي سؤال وأجي أنا
   بحاول رد عليه ومنتناقش… كل يوم بيبعت لي إشعار إنه بدي ناقش معي بهذا الدرس» + «كل يوم اسم… حسين بدو يناقشك بهدا الدرس» + «الاتنين معاً»
   (typing AND 🎤) + «ممكن يزيدوا الأسئلة» + «بدي رد عليه بسؤال… يقلّي لأ هيدا غلط… هيدا بينتمي لدرس تاني»). Approved preview: 259da39b.
   NO server, NO AI: everything is from HIS lessons only —
     • the questions: the lesson's own lists (assets/discuss-data.js, generated from the lesson files: «الأسباب / العلامات / العلاج…» → the
       list items are the key points) + the lesson's MCQs (assets/quiz-data.js: stem → the right option = key points, wrong options + «ليش غلط؟»
       = what is WRONG for that question, x = the lesson's explanation).
     • his answer: tolerant key-point matching (Arabic alef/ya/ta-marbuta/diacritics, French accents/case, small synonym groups, «مش X»
       negation) → «✅ ذكرت / 💡 نسيت», «❌ مش صح» when he says a wrong option / a negated point, «👀 هيدا من درس…» when his words belong to
       another lesson much more than this one (🔀 switch / ↩️ stay), and a QUESTION from him (؟ / شو / ليش / pourquoi…) searches every
       lesson passage and answers with the best one + «📖 افتح الدرس», or «ما لقيتها بدروسك 🤔».
   • partner of the day by date (حسين، ريم، علي، سارة، كريم، نور، زينب — 2026-11-08 = حسين), girls → the female voice, boys → the male one
     (assets/discuss-audio/<line>-<f|m>.mp3 for the fixed lines; the rest by speechSynthesis when the device has an Arabic voice).
   • lesson of the day: the NEXT exam's subjects (assets/midterm.js NursinMid.next), his mistakes first (nursin_weak_v1), the least
     discussed next; fixed once chosen for the day (nursin_discuss_v1.pick).
   • 5 questions a round, «➕ كمّل» = 5 more of the same lesson (never-asked first), then the next lesson. Answers feed NursinSRS.record,
     Weak.record, the «nursin:answer» event (retention/coverage) and NursinStudy.activity("quiz") once a round.
   • the daily nudge: home card under the chips (assets/home.js), a once-a-day banner on the other pages outside 22:00–08:00 and class
     (Thu/Fri/Sat 07:30–14:30), and users/{uid}.disc {day,n,g,les,href} for a phone push by a future worker (none deployed).
   Plain ES5 (iOS 12). No ads on discuss.html. */
(function (w, d) {
  "use strict";
  var K = "nursin_discuss_v1", EPOCH = "2026-11-08", ROUND = 5;
  var NAMES = [
    { n: "حسين", fr: "Hussein", g: "m", e: "🧑‍⚕️" }, { n: "ريم", fr: "Rim", g: "f", e: "👩‍⚕️" }, { n: "علي", fr: "Ali", g: "m", e: "👨‍⚕️" },
    { n: "سارة", fr: "Sara", g: "f", e: "👩‍⚕️" }, { n: "كريم", fr: "Karim", g: "m", e: "🧑‍⚕️" }, { n: "نور", fr: "Nour", g: "f", e: "👩‍⚕️" },
    { n: "زينب", fr: "Zeinab", g: "f", e: "👩‍⚕️" }
  ];
  var VOICE = { f: "21m00Tcm4TlvDq8ikWAM", m: "pNInz6obpgDQGcFmaJgB" };
  /* the partner's fixed lines — the SAME words are in assets/discuss-audio/<key>-<f|m>.mp3 (greet-<i>.mp3 per partner) */
  var LINES = {
    ok: "برافو! جوابك صح 👏", part: "حلو! بس في شغلات نسيتها 💡", none: "مش هيك بالظبط 🤔 خلّيني فكّرك", wrong: "لا، هيدي مش صح ❌",
    other: "هيدا من درس تاني 👀", nf: "ما لقيتها بدروسك 🤔", found: "لقيتلك ياها بدروسك 📖", follow: "منكمّل عنفس الموضوع 🔁",
    next: "يلّا السؤال الجاي 👇", done: "برافو! خلصنا خمس أسئلة 👏 بدّك نكمّل؟", hint: "خود تلميح صغير 💡", skip: "ولا يهمّك، هيدا الجواب 👇",
    back: "منرجع لسؤالي 😉"
  };
  function GREET(p) { return "أهلين! أنا " + p.n + " 👋 يلّا نتناقش اليوم بدرس من دروسك"; }

  function FR() { return !!(w.Lang && w.Lang.fr); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today(now) {                                   // YYYY-MM-DD in Beirut (formatToParts: WebKit's en-CA format() gives «11/08/2026»)
    var t = now || new Date();
    if (!now) { var N = w.Nursin; if (N && N.dayKey) try { var k = N.dayKey(); if (/^\d{4}-\d\d-\d\d$/.test(k)) return k; } catch (e) {} }
    try { var o = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(t).forEach(function (x) { o[x.type] = x.value; }); if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day; } catch (e) {}
    return new Date(+t + 2 * 36e5).toISOString().slice(0, 10);
  }
  function minB(now) { try { var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now || new Date()), o = {}; p.forEach(function (x) { o[x.type] = +x.value; }); return (o.hour % 24) * 60 + (o.minute | 0); } catch (e) { var d0 = now || new Date(); return d0.getHours() * 60 + d0.getMinutes(); } }
  function dayNum(day) { return Math.round((Date.parse(day + "T12:00:00Z") - Date.parse(EPOCH + "T12:00:00Z")) / 864e5); }
  function addDays(day, n) { return new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function seeded(n) { var x = (n >>> 0) || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; }

  /* ---------------- 🧑‍⚕️ the partner of the day ---------------- */
  function partner(day) { var i = ((dayNum(day || today()) % 7) + 7) % 7, p = NAMES[i]; return { i: i, n: p.n, fr: p.fr, g: p.g, e: p.e, voice: VOICE[p.g] }; }
  /* quiet: 22:00 → 08:00 every day, and class Thu/Fri/Sat 07:30 → 14:30 (= worker v16 covQuiet) */
  function quiet(day, min) { var dow = new Date(Date.parse(day + "T12:00:00Z")).getUTCDay(); return min >= 22 * 60 || min < 8 * 60 || (dow >= 4 && dow <= 6 && min >= 7 * 60 + 30 && min < 14 * 60 + 30); }

  /* ---------------- 🔤 tolerant text ---------------- */
  var STOP = {};
  ("من في فيه فيها على علي عن الى الي او و مع هو هي هيي هوي هوه هيه شو ايش اذا ما لا لأ مش مو بس كل هيدا هيدي هيدول هاي يلي اللي يللي الي ان انو انه انها كان كانت بيكون بتكون عند عندو عندها " +
   "هون هونيك كمان كتير شي شوي يعني متل مثل مثلا لما لان لانو بين بعد قبل حتى حسب كيف كيفي ليش ليه متى امتى ايمتى وين مين قديش اديش شقد هل لحتى صار بصير " +
   "بيصير منعمل بنعمل عم رح منو منها الو الها اله لها له ده دي ذلك هذا هذه التي الذي الذين وهو وهي فهو تبع تبعو تبعها نفس غير بدون اي ايا اول تاني " +
   "de la le les des du un une et ou en a au aux the of to and or is are pour par avec dans sur est il elle qui que quoi quel quelle quels comment pourquoi quand ce cette ces son sa ses " +
   "what why how when which who where is does do pas non ne plus tres sont etre avoir on donne donner faire fait quoi c ال الـ اليوم هلق هلأ بدي بدك فيك قلي قلّي").split(" ").forEach(function (x) { STOP[x] = 1; });
  var NEG = { "مش": 1, "مو": 1, "ما": 1, "لا": 1, "بلا": 1, "بدون": 1, "غير": 1, "non": 1, "pas": 1, "sans": 1, "not": 1, "no": 1, "ni": 1 };
  /* small synonym groups (normalized forms) → one canonical token; the lessons write formal Arabic + French, he talks Lebanese */
  var SYN = [
    ["انخفاض", "منخفض", "واطي", "واطيه", "نازل", "هبوط", "بينزل", "ينزل", "نزول", "baisse"],
    ["ارتفاع", "مرتفع", "عالي", "عاليه", "طالع", "بيطلع", "يطلع", "زياده", "زيادة", "hausse", "eleve"],
    ["نقص", "قله", "قليل", "قليله", "ناقص", "نقصان", "deficit", "manque"],
    ["تسارع", "سريع", "سريعه", "تسرع", "متسارع", "tachycardie", "tachycarde"],
    ["بطء", "بطيء", "بطيئ", "بطي", "بطيي", "bradycardie", "bradycarde"],
    ["قلب", "قلبي", "cardiaque", "coeur"], ["نبض", "نبضات", "دقات", "pouls", "frequence"],
    ["ضغط", "tension", "ta", "pression"], ["بول", "بوله", "diurese", "urine", "urinaire"], ["وعي", "conscience"],
    ["اكسجين", "اوكسجين", "o2", "oxygene"], ["سوايل", "سوائل", "مصل", "محاليل", "solute", "solutes", "liquide", "liquides"],
    ["دم", "دمويه", "sang", "sanguin", "sanguine"], ["نزيف", "نزف", "hemorragie", "saignement"], ["جلد", "peau", "cutane", "cutanee"],
    ["بارد", "برد", "بروده", "froid", "froide"], ["دافي", "دافئ", "حار", "chaud", "chaude"], ["حروق", "حرق", "brulure", "brulures"],
    ["قيء", "قيئ", "استفراغ", "تقيؤ", "تقيء", "vomissement", "vomissements"], ["اسهال", "diarrhee"],
    ["مراقبه", "نراقب", "منراقب", "راقب", "مراقبتو", "surveillance", "surveiller"], ["اعطاء", "نعطي", "منعطي", "عطي", "نعطيه", "administrer", "administration"],
    ["وجع", "الم", "اوجاع", "douleur", "douleurs"], ["ضيق", "dyspnee"], ["سكري", "diabete"], ["تدخين", "دخان", "مدخن", "tabac", "tabagisme"],
    ["عطش", "soif"], ["دوخه", "دوخة", "vertige", "vertiges"], ["تعرق", "متعرق", "عرق", "sueur", "sueurs"], ["شاحب", "شحوب", "pale", "paleur"],
    ["جفاف", "deshydratation"], ["نخاع", "medulla", "medullaire"], ["عمود", "rachis"], ["تنفس", "respiration", "respiratoire", "نفس"],
    ["مريض", "مريضه", "patient", "patiente"], ["ممرض", "ممرضه", "infirmier", "infirmiere"], ["طبيب", "دكتور", "حكيم", "medecin"],
    ["حراره", "سخونه", "fievre", "temperature"], ["التهاب", "inflammation"], ["علاج", "traitement", "دوا", "دواء", "ادويه", "medicament"],
    ["عمليه", "جراحه", "جراحي", "chirurgie", "operation", "intervention"], ["noradrenaline", "نورادرينالين", "نورادرنالين", "نوراد"], ["adrenaline", "ادرينالين", "ادرنالين"], ["atropine", "اتروبين", "تروبين"], ["dopamine", "دوبامين"], ["mannitol", "مانيتول"],
    ["heparine", "هيبارين", "هبارين"], ["morphine", "مورفين"], ["troponine", "تروبونين"], ["digoxine", "ديجوكسين", "ديغوكسين"], ["aspirine", "اسبرين", "اسبيرين"], ["insuline", "انسولين"],
    ["furosemide", "lasix", "لازكس", "لازيكس"], ["intubation", "تنبيب"], ["ventilation", "تهويه"], ["glasgow", "غلاسكو", "جلاسكو"], ["ecg", "تخطيط"], ["sonde", "سوند"],
    ["سبب", "اسباب", "cause", "causes", "etiologie"], ["علامات", "عوارض", "اعراض", "signes", "symptomes"]
  ];
  var SYNMAP = null;
  function synMap() { if (SYNMAP) return SYNMAP; SYNMAP = {}; SYN.forEach(function (g) { var c = "§" + norm1(g[0]); g.forEach(function (x) { SYNMAP[norm1(x)] = c; }); }); return SYNMAP; }
  function norm1(s) {
    s = String(s == null ? "" : s).toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); })
      .replace(/œ/g, "oe").replace(/æ/g, "ae");
    return s;
  }
  function stem(t) {
    if (/^[a-z0-9]+$/.test(t)) { if (t.length > 6) t = t.slice(0, 7); return t; }
    var p = ["وبال", "فبال", "وال", "بال", "فال", "كال", "عال", "لل", "ال"];
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) === 0 && t.length - p[i].length >= 2) { t = t.slice(p[i].length); break; }
    if (t.length > 4 && t.charAt(0) === "و" && STOP[t.slice(1)] == null && /^و(ال|ب)/.test(t)) t = t.slice(1);
    return t;
  }
  /* → [{t: token, neg: bool}] content tokens only */
  function toks(s, keepNeg) {
    var raw = norm1(s).replace(/[^a-z0-9\u0621-\u064a]+/g, " ").split(" "), out = [], negLeft = 0, M = synMap();
    for (var i = 0; i < raw.length; i++) {
      var x = raw[i]; if (!x) continue;
      if (NEG[x] || (x.length > 2 && x.charAt(0) === "و" && NEG[x.slice(1)])) { negLeft = 2; continue; }
      if (STOP[x] || (x.length < 2 && !/[0-9]/.test(x))) { if (negLeft) negLeft--; continue; }
      var t = stem(x); if (STOP[t]) { if (negLeft) negLeft--; continue; }
      var c = M[t] || M[x] || (/^[وبلفك]/.test(t) && t.length >= 4 && M[stem(t.slice(1))]) || t;
      out.push({ t: c, neg: negLeft > 0 }); if (negLeft) negLeft--;
    }
    return keepNeg ? out : out.filter(function (o) { return !o.neg; }).map(function (o) { return o.t; });
  }
  function same(a, b) {
    if (a === b) return true;
    if (a.charAt(0) === "§" || b.charAt(0) === "§") return false;
    var la = /^[a-z]/.test(a), lb = /^[a-z]/.test(b); if (la !== lb) return false;
    if (la) return a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5);
    return a.length >= 4 && b.length >= 4 && Math.abs(a.length - b.length) <= 2 && a.slice(0, 4) === b.slice(0, 4);
  }
  function has(set, t) { if (set[t]) return true; for (var k in set) if (same(k, t)) return true; return false; }
  function setOf(arr) { var o = {}; arr.forEach(function (t) { o[t] = 1; }); return o; }
  function need(n) { return n <= 2 ? 1 : n <= 5 ? 2 : Math.ceil(n / 3); }

  /* a key point = its alternatives (the text without brackets, the part before «:», what is inside the brackets) */
  function kpOf(text, stemSet) {
    var t = String(text), alts = [], m, inside = [];
    var noPar = t.replace(/\(([^)]*)\)/g, function (_, x) { inside.push(x); return " "; });
    alts.push(noPar);
    if (/[:：]/.test(noPar)) { var cp = noPar.split(/[:：]/); alts.push(cp[0]); cp.slice(1).join(" ").split(/[،,؛;]| أو | ou /).forEach(function (x) { if (toks(x).length) alts.push(x); }); }
    inside.forEach(function (x) { if (toks(x).length) alts.push(x); });
    var neg = [];
    var A = alts.map(function (a) {
      var all = toks(a, true), pos = [];
      all.forEach(function (o) { if (o.neg) neg.push(o.t); else pos.push(o.t); });
      var f = pos.filter(function (x) { return !stemSet || !stemSet[x]; });
      return f.length ? f : pos;
    }).filter(function (a) { return a.length; });
    var seen = {}; A = A.filter(function (a) { var k = a.join(" "); if (seen[k]) return false; seen[k] = 1; return true; });
    return { text: t, alts: A, neg: neg };
  }
  function kpHit(ansSet, kp) {
    for (var i = 0; i < kp.alts.length; i++) {
      var a = kp.alts[i], n = 0;
      for (var j = 0; j < a.length; j++) if (has(ansSet, a[j])) n++;
      if (n >= need(a.length)) return true;
    }
    return false;
  }

  /* ---------------- 📚 lessons, questions ---------------- */
  function NL() { return w.NLESSONS || {}; }
  function lid(l) { return l.s + ":" + (l.l || l.t); }
  function lessons() { return (NL().list || []).map(function (l) { return { id: lid(l), s: l.s, t: l.t, l: l.l || "", n: l.n, href: l.href }; }); }
  function lessonInfo(id) { var L = lessons(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function bank() { return w.QUIZ || []; }
  var QLID = null;
  function qLesson(q) {                                   // the lesson a bank question belongs to (subjects with lessons: q.l; cardio/neuro: q.t)
    var L = NL().list || [];
    for (var i = 0; i < L.length; i++) { var l = L[i]; if (l.t === q.t && (!l.l || l.l === q.l)) return lid(l); }
    return "";
  }
  function qIndex() { if (QLID) return QLID; QLID = {}; bank().forEach(function (q) { var k = qLesson(q); if (k) (QLID[k] = QLID[k] || []).push(q); }); return QLID; }
  function dataOf(id) { var D = w.NDISC && w.NDISC.L; return (D && D[id]) || { h: [], b: [], q: [] }; }
  var NEGQ = /(مش|ما\s|غلط|خطأ|ليس|لا\s?يعتبر|ما\s?بيعتبر|non|pas|sauf|faux|incorrect|except)/i;
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); var a = s.split(""); return a.length > n ? a.slice(0, n - 1).join("") + "…" : s; }
  /* every question of a lesson: {key, kind:"l"|"m", g: group (follow-ups share it), q: text, kps: [kp], wrong: [{kp, why}], x, opts, a, src} */
  function script(id) {
    var D = dataOf(id), out = [];
    (D.q || []).forEach(function (r, i) {
      var head = D.h[r[0]] || "", lab = r[1], items = r[2] || [];
      var q = /[؟?]/.test(lab) ? (head ? head + " — " : "") + lab : (head ? head + " 👈 " : "") + "«" + lab + "»: شو بتتذكّر منها؟ عدّدلي 🧐";
      var st = setOf(toks(head + " " + lab));
      var kps = items.map(function (it) { return kpOf(it, st); });
      var wrong = []; kps.forEach(function (k, j) { if (k.neg.length) wrong.push({ kp: { text: k.neg.join(" "), alts: [k.neg] }, why: "بالدرس: " + items[j] }); });
      out.push({ key: "l" + i, kind: "l", g: "h" + r[0], q: q, kps: kps, wrong: wrong, x: "", items: items, head: head, lab: lab });
    });
    (qIndex()[id] || []).forEach(function (bq, i) {
      var V = w.NURSIN_QV && w.NURSIN_QV.pick ? null : null, stemTxt = bq.q, o = bq.o || [];
      var st = setOf(toks(stemTxt)), right = o[bq.a] || "";
      var negQ = NEGQ.test(stemTxt);
      var parts = String(right).split(/\s[+—–]\s|،\s|\s\+\s/).filter(function (p) { return toks(p).length; });
      var kps = (parts.length ? parts : [right]).map(function (p) { return kpOf(p, st); });
      var rs = setOf([].concat.apply([], kps.map(function (k) { return [].concat.apply([], k.alts); })));
      var wrong = [];
      o.forEach(function (op, j) {
        if (j === bq.a) return;
        var k = kpOf(op, st); k.alts = k.alts.map(function (a) { return a.filter(function (t) { return !has(rs, t); }); }).filter(function (a) { return a.length; });
        if (k.alts.length) wrong.push({ kp: k, why: (bq.why && bq.why[j]) || "", opt: op });
      });
      out.push({ key: bq.id, kind: "m", g: "t" + (bq.t || "") + Math.floor(i / 2), q: stemTxt + (negQ ? "\n(" + o.join(" · ") + ")" : ""), kps: kps, wrong: wrong, x: bq.x || "", opts: o, a: bq.a, src: bq, neg: negQ });
    });
    return out;
  }
  /* the order: groups (a list question with its follow-ups of the same heading; MCQs two by two), never-asked first, his mistakes first */
  function order(id, st, day) {
    var S = script(id), seen = (st.seen || {}), weak = weakSet(), rnd = seeded(hash(id + "|" + (day || today())));
    var groups = {}, gl = [];
    S.forEach(function (q) { if (!groups[q.g]) { groups[q.g] = []; gl.push(q.g); } groups[q.g].push(q); });
    var gs = gl.map(function (g) { var qs = groups[g]; return { g: g, qs: qs, w: qs.some(function (q) { return weak[q.key]; }) ? 1 : 0, s: Math.min.apply(null, qs.map(function (q) { return seen[id + "|" + q.key] | 0; })), r: rnd() }; });
    gs.sort(function (a, b) { return a.s - b.s || b.w - a.w || a.r - b.r; });
    var gl1 = gs.filter(function (g) { return g.qs[0].kind === "l"; }), gm = gs.filter(function (g) { return g.qs[0].kind !== "l"; }), mix = [];
    while (gl1.length || gm.length) { if (gl1.length) mix.push(gl1.shift()); if (gm.length) mix.push(gm.shift()); }   // the lesson's lists and its MCQs, one after the other
    if (gs.some(function (g) { return g.w; })) mix.sort(function (a, b) { return b.w - a.w; });                     // his mistakes first
    var out = [], by = [];
    mix.forEach(function (g) { g.qs.forEach(function (q) { out.push(q); }); });
    out.forEach(function (q, i) { by.push({ q: q, s: seen[id + "|" + q.key] | 0, i: i }); });
    by.sort(function (a, b) { return a.s - b.s || a.i - b.i; });            // never-asked first, the group order kept
    out = by.map(function (x) { return x.q; });
    out.forEach(function (q, i) { q.fu = i > 0 && out[i - 1].g === q.g; });
    return out;
  }
  function weakSet() { var x = lsGet("nursin_weak_v1"), o = {}; if (x && x.items) Object.keys(x.items).forEach(function (k) { o[k] = 1; }); return o; }

  /* ---------------- 📅 the lesson of the day ---------------- */
  function state() { var s = lsGet(K); if (!s || typeof s !== "object") s = {}; ["pick", "seen", "les", "days"].forEach(function (k) { if (!s[k] || typeof s[k] !== "object") s[k] = {}; }); return s; }
  function save(s) { var ks = Object.keys(s.pick).sort(); while (ks.length > 30) delete s.pick[ks.shift()]; lsSet(K, s); }
  function examSubs(day) {
    var M = w.NursinMid; if (!M || !M.next) return null;
    var E = M.next(day); if (!E) return null;
    var subs = E.subs.slice();
    if (subs.indexOf("*") > -1) {                         // «الباقي» = every subject that has no other exam date
      var other = {}; (M.EXAMS || []).forEach(function (x) { if (x !== E) x.subs.forEach(function (s) { other[s] = 1; }); });
      subs = Object.keys(NL().subjects || {}).filter(function (s) { return !other[s]; });
    }
    return subs;
  }
  function sizeOf(id) { return (dataOf(id).q || []).length + (qIndex()[id] || []).length; }
  function pickLesson(day, st, force) {
    day = day || today(); st = st || state();
    if (st.pick[day] && lessonInfo(st.pick[day]) && !force) return st.pick[day];
    if (!w.QUIZ && !force) return "";                     // decided where the bank is loaded (home / the page), so every page says the same lesson
    var L = lessons().filter(function (l) { return sizeOf(l.id) >= 3; });
    var subs = examSubs(day), cand = subs ? L.filter(function (l) { return subs.indexOf(l.s) > -1; }) : [];
    if (!cand.length) cand = L;
    var wk = weakSet(), Q = qIndex();
    var sc = cand.map(function (l) { var n = 0; (Q[l.id] || []).forEach(function (q) { if (wk[q.id]) n++; }); return { id: l.id, w: n, done: (st.les[l.id] || {}).n | 0, r: hash(day + l.id) }; });
    sc.sort(function (a, b) { return b.w - a.w || a.done - b.done || a.r - b.r; });
    var id = sc.length ? sc[0].id : "";
    if (id) { st.pick[day] = id; save(st); }
    return id;
  }
  function nextLesson(id) {                               // «📚 الدرس الجاي»: the next lesson of the same subject, else of the exam subjects
    var L = lessons().filter(function (l) { return sizeOf(l.id) >= 3; }), i = -1;
    for (var j = 0; j < L.length; j++) if (L[j].id === id) i = j;
    var cur = L[i]; if (!cur) return L[0] ? L[0].id : "";
    for (var k = 1; k <= L.length; k++) { var n = L[(i + k) % L.length]; if (n.s === cur.s) return n.id; }
    return L[(i + 1) % L.length].id;
  }

  /* ---------------- 🧠 judging his words ---------------- */
  var QW = /^(شو|ليش|ليه|كيف|كيفي|كيفو|متى|امتى|ايمتى|إيمتى|وين|مين|قديش|اديش|أديش|شقد|هل|يعني\s*شو|ما\s*هو|ما\s*هي|شو\s*يعني|what|why|how|when|where|which|who|pourquoi|comment|quand|quel|quelle|quels|quelles|qu['’]?est|est[- ]ce|c['’]?est\s*quoi|explique|اشرح|اشرحلي|فسّر|فسرلي|خبّرني|خبرني)(\s|$)/i;
  function isQuestion(s) { s = String(s || "").trim(); return /[؟?]\s*$/.test(s) || QW.test(s); }
  var DUNNO = /^(ما\s*ب?عرف|مش\s*عارف|ما\s*بتذكر|ما\s*بتزكر|نسيت|لا\s*اعرف|ما\s*عرفت|je\s*(ne\s*)?sais\s*pas|aucune\s*id[eé]e|pas\s*s[uû]r|idk)/i;
  function judge(Q, ans) {
    var T = toks(ans), A = setOf(T);
    var hit = [], miss = [];
    Q.kps.forEach(function (k) { (kpHit(A, k) ? hit : miss).push(k.text); });
    var bad = null, badN = 0;
    Q.wrong.forEach(function (w0) {
      var n = 0, a = w0.kp.alts[0] || []; a.forEach(function (t) { if (has(A, t)) n++; });
      var ok = w0.kp.alts.some(function (al) { var m = 0; al.forEach(function (t) { if (has(A, t)) m++; }); return m >= (al.length <= 3 ? 1 : 2); });
      if (ok && n >= badN) { bad = w0; badN = n; }
    });
    if (bad && Q.kind === "m" && hit.length >= Q.kps.length && Q.kps.length) bad = null;   // he said the right one (and maybe compared)
    var score = Q.kps.length ? hit.length / Q.kps.length : 0;
    return { hit: hit, miss: miss, wrong: bad, score: score, n: T.length, ok: !bad && (Q.kind === "m" ? hit.length >= Math.ceil(Q.kps.length / 2) : score >= 0.5) };
  }
  /* lesson vocabulary + idf (built once, on the first answer) */
  var VOC = null;
  function vocab() {
    if (VOC) return VOC;
    var L = lessons(), V = {}, df = {}, P = [], Q = qIndex();
    L.forEach(function (l) {
      var D = dataOf(l.id), set = {};
      function addTxt(s, pass) { var t = toks(s); t.forEach(function (x) { set[x] = 1; }); if (pass) P.push({ id: l.id, t: pass.t, h: pass.h, k: toks(pass.h + " " + pass.t) }); }
      addTxt(l.n);
      (D.b || []).forEach(function (b) { addTxt(b[1], b[1].length >= 40 ? { t: b[1], h: D.h[b[0]] || "" } : null); });
      (D.q || []).forEach(function (r) { addTxt((D.h[r[0]] || "") + " " + r[1] + " " + r[2].join(" ")); });
      (Q[l.id] || []).forEach(function (q) { addTxt(q.q + " " + (q.o || []).join(" ")); if (q.x) { var t = toks(q.q + " " + q.x); t.forEach(function (x) { set[x] = 1; }); P.push({ id: l.id, t: q.x, h: clip(q.q, 80), k: t, qx: 1 }); } });
      V[l.id] = set; Object.keys(set).forEach(function (x) { df[x] = (df[x] || 0) + 1; });
    });
    var n = L.length, idf = {}; Object.keys(df).forEach(function (x) { idf[x] = Math.log(1 + n / df[x]); });
    VOC = { V: V, idf: idf, P: P, n: n };
    return VOC;
  }
  var VERB = /^(من|بن|بي|بت|منت|بنت)[\u0621-\u064a]{3,}$/;          // Lebanese verb forms (منحسب، بيعمل…) weigh less than the lesson's nouns
  function idfOf(t) { var I = vocab().idf, v = I[t] || Math.log(1 + vocab().n); return VERB.test(t) ? v * 0.3 : v; }
  function lessonScores(T) {
    var V = vocab().V, out = {}, u = setOf(T);
    Object.keys(V).forEach(function (id) { var s = 0; Object.keys(u).forEach(function (t) { if (V[id][t]) s += idfOf(t); }); out[id] = s; });
    return out;
  }
  /* «his words belong to ANOTHER lesson much more than to this one» → that lesson's id, else "" */
  function otherLesson(cur, text) {
    var T = toks(text); if (T.length < 1) return "";
    var S = lessonScores(T), best = "", bs = 0;
    Object.keys(S).forEach(function (id) { if (S[id] > bs) { bs = S[id]; best = id; } });
    var cs = S[cur] || 0, V = vocab().V[best] || {}, m = 0, lat = 0;
    Object.keys(setOf(T)).forEach(function (t) { if (V[t]) { m++; if (/^[a-z§]/.test(t) && t.replace("§", "").length >= 5) lat++; } });
    if (!best || best === cur || bs < 3.2 || bs < cs * 1.8 + 0.6 || (m < 2 && !lat)) return "";
    return best;
  }
  /* a question from him → the best passage of his lessons (this lesson counts a bit more), or null */
  function search(cur, text, only) {
    var T = toks(text), u = Object.keys(setOf(T)); if (!u.length) return null;
    var tot = 0; u.forEach(function (t) { tot += idfOf(t); });
    var P = vocab().P, best = null, bs = 0;
    for (var i = 0; i < P.length; i++) {
      var p = P[i]; if (only && p.id !== only) continue;
      var ps = setOf(p.k), s = 0, m = 0;
      for (var j = 0; j < u.length; j++) if (ps[u[j]]) { s += idfOf(u[j]); m++; }
      if (!m) continue;
      s = s / Math.pow(Math.max(8, p.k.length) / 8, 0.25);
      if (p.id === cur) s *= 1.15;
      if (s > bs) { bs = s; best = { id: p.id, t: p.t, h: p.h, m: m, raw: 0 }; best.raw = s; }
    }
    if (!best) return null;
    var cover = 0; var ps0 = null;
    for (var k = 0; k < P.length; k++) if (P[k].t === best.t && P[k].id === best.id) { ps0 = setOf(P[k].k); break; }
    u.forEach(function (t) { if (ps0 && ps0[t]) cover += idfOf(t); });
    if (cover < tot * 0.5) return null;
    return best;
  }

  w.NursinDiscuss = { K: K, NAMES: NAMES, VOICE: VOICE, LINES: LINES, GREET: GREET, EPOCH: EPOCH, ROUND: ROUND, partner: partner, quiet: quiet, today: today, dayNum: dayNum, addDays: addDays,
    norm: norm1, toks: toks, same: same, kpOf: kpOf, kpHit: kpHit, setOf: setOf, script: script, order: order, pickLesson: pickLesson, nextLesson: nextLesson, lessonInfo: lessonInfo,
    judge: judge, isQuestion: isQuestion, otherLesson: otherLesson, search: search, state: state, save: save, qLesson: qLesson, examSubs: examSubs, homeHtml: homeHtml, nudgeHtml: nudgeHtml, audioOf: audioOf, sizeOf: sizeOf, _reset: function () { QLID = null; VOC = null; } };

  /* ---------------- 🔊 voice ---------------- */
  function audioOf(key, p) { return "assets/discuss-audio/" + (key === "greet" ? "greet-" + p.i : key + "-" + p.g) + ".mp3"; }
  var AU = null, tVoice = null;
  function arVoice() { if (tVoice) return tVoice; try { var vs = w.speechSynthesis ? w.speechSynthesis.getVoices() : []; for (var i = 0; i < vs.length; i++) if (/^ar/i.test(vs[i].lang || "")) { tVoice = vs[i]; break; } } catch (e) {} return tVoice; }
  function stopVoice() { try { if (AU) { AU.pause(); AU = null; } } catch (e) {} try { if (w.speechSynthesis) w.speechSynthesis.cancel(); } catch (e) {} }
  function sayTTS(txt) {
    try { var v = arVoice(); if (!w.speechSynthesis || !v || !txt) return; var u = new SpeechSynthesisUtterance(String(txt).replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, " ")); u.voice = v; u.lang = v.lang; u.rate = 1; w.speechSynthesis.speak(u); } catch (e) {}
  }
  function speak(key, p, rest) {                           // fixed line (recorded) → then the rest by speechSynthesis
    stopVoice();
    if (!key) { sayTTS(rest); return; }
    try {
      var a = new Audio(audioOf(key, p)); AU = a;
      a.onended = function () { if (AU === a) { AU = null; sayTTS(rest); } };
      a.onerror = function () { if (AU === a) { AU = null; sayTTS((key === "greet" ? GREET(p) : LINES[key] || "") + " " + (rest || "")); } };
      var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (AU === a) { AU = null; sayTTS(rest); } });
    } catch (e) { sayTTS(rest); }
  }

  /* ---------------- 🏠 home card + the daily nudge ---------------- */
  function homeHtml(day) {
    day = day || today(); var st = state(), p = partner(day), id = pickLesson(day, st), L = id ? lessonInfo(id) : null;
    var done = (st.days[day] || 0) | 0, ln = L ? clip(L.n, 46) : "";
    var title = done >= ROUND ? "✅ ناقشت " + p.n + " اليوم" : p.n + " بدو يناقشك اليوم 💬";
    var sub = L ? (done >= ROUND ? "كمّل بدرس" : "درس") + " <bdi>" + esc(ln) + "</bdi>" : "يلّا نتناقش بدرس من دروسك";
    return '<a class="hzdcard" href="discuss.html"><span class="av" aria-hidden="true">' + p.e + '</span><span class="tx"><b>' + esc(title) + "</b><span>" + sub + '</span></span><span class="go">' + (done >= ROUND ? "كمّل" : "يلّا") + "</span></a>";
  }
  /* the banner's own little style (kept here so the shared ui.css stays untouched) */
  var NUDGE_CSS = ".dsnudge{position:fixed;z-index:60;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));max-width:480px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:9px 10px 9px 12px;border-radius:20px;background:rgba(255,255,255,.97);border:1px solid #e2ecea;box-shadow:0 12px 30px rgba(16,40,48,.18);color:#0f1f22;text-decoration:none;font:700 14px/1.4 Cairo,system-ui,sans-serif;direction:rtl;transform:translateY(-140%);opacity:0;transition:transform .45s cubic-bezier(.32,1.25,.6,1),opacity .3s}.dsnudge.in{transform:none;opacity:1}.dsnudge .av{width:36px;height:36px;flex:0 0 36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:21px;background:linear-gradient(135deg,#ede9fe,#ccfbf1)}.dsnudge>span:nth-child(2){flex:1;min-width:0}.dsnudge b{flex:0 0 auto;color:#fff;background:linear-gradient(135deg,#7c3aed,#0f766e);border-radius:99px;padding:5px 12px;font-size:13px}.dsnudge button{flex:0 0 auto;border:0;background:none;color:#5a6e71;font-size:15px;padding:4px 6px;cursor:pointer}@media (prefers-reduced-motion:reduce){.dsnudge{transition:none}}";
  function nudgeHtml(day) {
    var st = state(), p = partner(day), id = st.pick[day], L = id ? lessonInfo(id) : null;
    return "💬 " + p.n + " بدو يناقشك اليوم" + (L ? " بدرس " + esc(clip(L.n, 40)) : "");
  }
  function page() { var p = (location.pathname || "").split("/").pop() || "index.html"; return p; }
  function nudge() {
    try {
      var pg = page(); if (pg === "discuss.html" || pg === "index.html" || pg === "" || pg === "admin.html" || pg === "reels.html") return;
      var day = today(), st = state(); if (quiet(day, minB())) return;
      if (st.nudge === day || (st.days[day] | 0) > 0 || !st.pick[day]) return;
      st.nudge = day; save(st);
      if (!d.getElementById("dsnudgecss")) { var sc = d.createElement("style"); sc.id = "dsnudgecss"; sc.textContent = NUDGE_CSS; (d.head || d.body).appendChild(sc); }
      var b = d.createElement("a"); b.className = "dsnudge"; b.href = "discuss.html"; b.setAttribute("role", "status");
      b.innerHTML = '<span class="av" aria-hidden="true">' + partner(day).e + "</span><span>" + nudgeHtml(day) + '</span><b>يلّا</b><button type="button" aria-label="سكّر">✕</button>';
      b.querySelector("button").onclick = function (e) { e.preventDefault(); e.stopPropagation(); b.parentNode && b.parentNode.removeChild(b); };
      d.body.appendChild(b); setTimeout(function () { b.className += " in"; }, 60); setTimeout(function () { if (b.parentNode) b.className = b.className.replace(" in", ""); }, 9000);
    } catch (e) {}
  }
  /* ☁️ users/{uid}.disc — what a phone push needs (owner merge on his own doc; rules unchanged). No worker reads it yet. */
  var pushed = "";
  function cloud() {
    try {
      var A = w.NursinFB; if (!A || !A.user || !A.fs || !A.db) return;
      var day = today(), st = state(), id = st.pick[day]; if (!id || pushed === day + id) return; pushed = day + id;
      var p = partner(day), L = lessonInfo(id) || {};
      A.fs.setDoc(A.fs.doc(A.db, "users", A.user.uid), { disc: { v: 1, day: day, n: p.n, g: p.g, les: String(L.n || "").slice(0, 80), href: "/discuss.html", txt: ("💬 " + p.n + " بدو يناقشك اليوم بدرس " + String(L.n || "")).slice(0, 120), done: (st.days[day] | 0) } }, { merge: true }).catch(function () {});
    } catch (e) {}
  }

  /* ---------------- 💬 the page ---------------- */
  var S = null;                                           // the running discussion
  function $(s, r) { return (r || d).querySelector(s); }
  function hm(now) { var m = minB(now); return String(Math.floor(m / 60)) + ":" + ("0" + (m % 60)).slice(-2); }
  function frWrap(s) { return esc(s).replace(/([A-Za-zÀ-ÿŒœ][A-Za-zÀ-ÿŒœ0-9'’₂⁻+\-\/ .]*[A-Za-zÀ-ÿ0-9₂⁻+])/g, "<bdi>$1</bdi>").replace(/\n/g, "<br>"); }
  function app() { return $("#ds-app"); }
  function chat() { return $("#dsch"); }
  function scroll() { var c = chat(); if (c) setTimeout(function () { c.scrollTop = c.scrollHeight; }, 30); }
  function add(html, cls) { var c = chat(), x = d.createElement("div"); x.className = cls; x.innerHTML = html; c.appendChild(x); scroll(); return x; }
  function pBubble(html, key, rest, extraCls) {
    var p = S.p, x = add('<div class="lb">' + esc(p.n) + ' <button type="button" class="pl" aria-label="اسمع">🔊</button></div>' + html, "m p" + (extraCls ? " " + extraCls : ""));
    x.querySelector(".pl").onclick = function () { S.unlocked = true; speak(key, p, rest); };
    if (S.snd && S.unlocked) speak(key, p, rest);
    return x;
  }
  function typing(ms, fn) { var t = add("<i></i><i></i><i></i>", "ty"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); fn(); }, ms); }
  function qr(list) {
    var old = chat().querySelectorAll(".qr"); for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var x = add("", "qr");
    list.forEach(function (b) { var e = d.createElement(b.href ? "a" : "button"); if (b.href) e.href = b.href; else e.type = "button"; e.innerHTML = b.t; if (b.f) e.onclick = function () { clearQr(); b.f(); }; x.appendChild(e); });
    scroll();
  }
  function clearQr() { var old = chat().querySelectorAll(".qr"); for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]); }
  function L() { return lessonInfo(S.id) || { n: "", href: "index.html" }; }
  function head() {
    var p = S.p, t = partner(addDays(S.day, 1)), Li = L();
    $("#dshd").innerHTML = '<div class="hr"><a class="bk" href="index.html" aria-label="رجوع">›</a><span class="av" aria-hidden="true">' + p.e + '</span><div class="who"><b>' + esc(p.n) + "</b><small>نقاش · " + frWrap(clip(Li.n, 48)) + '</small></div><button type="button" class="snd' + (S.snd ? " on" : "") + '" id="dssnd" aria-pressed="' + (S.snd ? "true" : "false") + '">' + (S.snd ? "🔊 صوت" : "🔇 صوت") + "</button></div>" +
      '<div class="strip"><span aria-hidden="true">' + p.e + "</span> شريك اليوم: " + esc(p.n) + " <i>· بكرا: " + esc(t.n) + ' <span aria-hidden="true">' + t.e + "</span></i></div>" + prog();
    $("#dssnd").onclick = function () { S.snd = !S.snd; S.unlocked = true; var st = state(); st.snd = S.snd ? 1 : 0; save(st); if (!S.snd) stopVoice(); head(); };
  }
  function prog() {
    var n = S.inRound, cells = "";
    for (var i = 0; i < ROUND; i++) cells += "<span" + (i < S.okIn.length ? (S.okIn[i] ? ' class="d"' : ' class="c"') : "") + "></span>";
    return '<div class="pg"><span>سؤال <em>' + Math.min(ROUND, n + 1) + "</em> من " + ROUND + (S.round > 1 ? " · جولة " + S.round : "") + '</span><div class="dsbar">' + cells + "</div></div>";
  }
  function start(id, greet) {
    var st = state(); S.id = id; S.list = order(id, st, S.day); S.pos = 0; S.inRound = 0; S.okIn = []; S.round = 1; S.cur = null;
    head();
    if (!S.list.length) { pBubble("هالدرس ما فيه أسئلة للنقاش بعد 🙏 خلّينا ناخد درس تاني", null, ""); qr([{ t: "📚 الدرس الجاي", f: function () { start(nextLesson(id), false); } }]); return; }
    var Li = L(), nm = esc(name());
    if (greet) pBubble("أهلين" + (nm ? " " + nm : "") + " 👋 أنا " + esc(S.p.n) + "، اليوم منتناقش بدرس <b>" + frWrap(Li.n) + "</b> 💬<br>جاوبني كتابة أو احكي 🎤، وفيك تسألني أي شي من دروسك.", "greet", Li.n);
    else pBubble("تمام! هلّق منتناقش بدرس <b>" + frWrap(Li.n) + "</b> 💬", null, Li.n);
    typing(700, ask);
  }
  function name() { try { return w.NursinName ? w.NursinName.greetName() : ""; } catch (e) { return ""; } }
  function ask() {
    if (S.pos >= S.list.length) { S.pos = 0; S.list = order(S.id, state(), S.day); }
    var Q = S.cur = S.list[S.pos], fu = Q.fu && S.inRound > 0;
    var html = (fu ? '<span class="tag">🔁 متابعة</span><br>' : "") + frWrap(Q.q);
    pBubble(html, fu ? "follow" : null, Q.q.replace(/\n.*/, ""), fu ? "fu" : "");
    S.hint = 0;
    qr([{ t: "💡 تلميح", f: hint }, { t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]);
    var inp = $("#dsin"); if (inp && !S.touch) try { inp.focus(); } catch (e) {}
  }
  function hint() {
    var Q = S.cur; if (!Q) return; S.hint++;
    var t;
    if (Q.kind === "m" && !Q.neg) t = "الجواب واحد من هول: " + Q.opts.map(function (o) { return "«" + o + "»"; }).join(" · ");
    else if (Q.kind === "m") t = "فكّر بيلّي ما بيخصّ هالموضوع 😉";
    else t = "في " + Q.items.length + " نقاط. أوّلها بيبلّش بـ «" + clip(Q.items[0], 18).split(" ").slice(0, 2).join(" ") + "…»";
    pBubble(frWrap(t), "hint", t);
    qr([{ t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]);
  }
  function answerList(Q) { return Q.kind === "m" ? [Q.opts[Q.a]] : Q.items; }
  function skip() {
    var Q = S.cur; if (!Q) return;
    pBubble('<div class="no"><b>💡 الجواب:</b><ul>' + answerList(Q).map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>" + (Q.x ? '<div class="xp">📖 ' + frWrap(Q.x) + "</div>" : ""), "skip", answerList(Q).join("، "), "fb");
    record(Q, false, true); after();
  }
  function record(Q, ok, skipped) {
    var st = state(); st.seen[S.id + "|" + Q.key] = (st.seen[S.id + "|" + Q.key] | 0) + 1;
    var Lr = st.les[S.id] = st.les[S.id] || { n: 0, ok: 0 }; Lr.n++; if (ok) Lr.ok++; Lr.at = Date.now();
    st.days[S.day] = (st.days[S.day] | 0) + 1;
    var dk = Object.keys(st.days).sort(); while (dk.length > 60) delete st.days[dk.shift()];
    var sk = Object.keys(st.seen); if (sk.length > 3000) st.seen = {};
    save(st); cloud();
    S.okIn.push(!!ok); S.inRound++; S.okAll += ok ? 1 : 0;
    if (Q.kind === "m" && Q.src) {
      try { if (w.NursinSRS && w.NursinSRS.record) w.NursinSRS.record(Q.src, !!ok); } catch (e) {}
      try { if (w.Weak && w.Weak.record) w.Weak.record(Q.src, !!ok); } catch (e) {}
      try { d.dispatchEvent(new CustomEvent("nursin:answer", { detail: { qid: Q.src.id, ok: !!ok, set: "discuss" } })); } catch (e) {}
    }
    head();
  }
  function after() {
    S.pos++;
    if (S.inRound >= ROUND) {
      var good = S.okIn.filter(Boolean).length;
      try { if (w.NursinStudy && w.NursinStudy.activity) w.NursinStudy.activity("quiz", Math.min(10, good * 2), "💬 نقاش مع " + S.p.n); } catch (e) {}
      typing(800, function () {
        pBubble("برافو! خلصنا خمس أسئلة 👏 جاوبت منيح على <b>" + good + " من " + ROUND + "</b>.<br>بدّك نكمّل؟", "done", "");
        var more = S.list.length - S.pos;
        var btns = [{ t: "➕ كمّل", f: function () { S.inRound = 0; S.okIn = []; S.round++; head(); typing(500, ask); } }];
        if (more <= 0 || S.round >= 2) btns.push({ t: "📚 الدرس الجاي", f: function () { start(nextLesson(S.id), false); } });
        btns.push({ t: "📖 افتح الدرس", href: L().href });
        qr(btns);
      });
      return;
    }
    if (S.pos >= S.list.length) {
      typing(700, function () {
        pBubble("خلصنا كل أسئلة هالدرس 🎉 منكمّل بالدرس الجاي؟", null, "");
        qr([{ t: "📚 الدرس الجاي", f: function () { start(nextLesson(S.id), false); } }, { t: "🔁 منعيد هالدرس", f: function () { S.pos = 0; S.list = order(S.id, state(), S.day); ask(); } }]);
      });
      return;
    }
    typing(900, ask);
  }
  function feedback(Q, r) {
    var ok = r.hit.length, all = Q.kps.length, h = "";
    var key = r.miss.length === 0 ? "ok" : ok ? "part" : "none";
    h += '<div class="lb2"><span class="sc">' + ok + " من " + all + " ⭐</span></div>";
    if (ok) h += '<div class="ok"><b>✅ ذكرت:</b><ul>' + r.hit.map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>";
    if (r.miss.length) h += '<div class="no"><b>💡 نسيت:</b><ul>' + r.miss.map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>";
    if (Q.kind === "m" && Q.x) h += '<div class="xp">📖 ' + frWrap(Q.x) + "</div>";
    pBubble((key === "ok" ? LINES.ok : key === "part" ? LINES.part : LINES.none) + h, key, r.miss.length ? "نسيت: " + r.miss.join("، ") : "", "fb");
    record(Q, r.ok);
    after();
  }
  function wrongReply(Q, r) {
    var why = r.wrong.why || "";
    var h = LINES.wrong + " — " + (why ? frWrap(why) : "") + '<div class="ok"><b>✔️ الصح من الدرس:</b><ul>' + answerList(Q).map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>" + (Q.kind === "m" && Q.x ? '<div class="xp">📖 ' + frWrap(Q.x) + "</div>" : "");
    pBubble(h, "wrong", why, "fb bad");
    record(Q, false); after();
  }
  function otherReply(Q, other, text, asked) {
    var Lo = lessonInfo(other), Lc = L();
    pBubble("هيدا من درس <b>" + frWrap(Lo.n) + "</b> مش من درس <b>" + frWrap(Lc.n) + "</b> 👀" + (asked ? '<div class="xp">📖 ' + frWrap(clip(asked.t, 320)) + "</div>" : ""), "other", "", "fb oth");
    qr([{ t: "🔀 خلّينا نناقش درس " + esc(clip(Lo.n, 26)), f: function () { start(other, false); } }, { t: "↩️ منكفّي بدرسنا", f: function () { pBubble(LINES.back + " 👇<br>" + frWrap(Q.q), "back", Q.q); qr([{ t: "💡 تلميح", f: hint }, { t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]); } }]);
  }
  function questionReply(text) {
    var Q = S.cur, o = otherLesson(S.id, text), best = (o && search(S.id, text, o)) || search(S.id, text);
    if (!best) {
      pBubble(LINES.nf + "<br><small>جرّب تسأل بكلمات من الدرس، أو افتح الدرس 📖</small>", "nf", "");
      qr([{ t: "📖 افتح الدرس", href: L().href }, { t: "↩️ منرجع لسؤالي", f: function () { pBubble(frWrap(Q.q), "back", Q.q); } }]);
      return;
    }
    if (best.id !== S.id && o === best.id) { otherReply(Q, best.id, text, best); return; }
    var Lb = lessonInfo(best.id) || L();
    pBubble(LINES.found + '<div class="xp">' + (best.h ? "<b>" + frWrap(clip(best.h, 70)) + "</b><br>" : "") + frWrap(clip(best.t, 360)) + '</div><a class="cite" href="' + esc(Lb.href) + '">📖 افتح الدرس: ' + frWrap(clip(Lb.n, 40)) + "</a>", "found", clip(best.t, 360), "fb");
    qr([{ t: "↩️ منرجع لسؤالي", f: function () { pBubble(LINES.back + " 👇<br>" + frWrap(Q.q), "back", Q.q); qr([{ t: "💡 تلميح", f: hint }, { t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]); } }, { t: "⏭️ السؤال الجاي", f: skip }]);
  }
  function send(text) {
    text = String(text || "").trim(); if (!text || !S || !S.cur) return;
    clearQr(); stopVoice();
    add(frWrap(text) + '<span class="t">' + hm() + " ✓✓</span>", "m u");
    var Q = S.cur;
    typing(650 + Math.min(900, text.length * 12), function () {
      if (DUNNO.test(text)) { skip(); return; }
      if (isQuestion(text)) { questionReply(text); return; }
      var r = judge(Q, text);
      if (r.wrong) { wrongReply(Q, r); return; }
      if (!r.hit.length) { var o = otherLesson(S.id, text); if (o) { otherReply(Q, o, text, null); return; } }
      feedback(Q, r);
    });
  }
  /* 🎤 the browser's speech-to-text (Chrome / Safari 14.5+); hidden where there is none (iOS 12) */
  function SR() { return w.SpeechRecognition || w.webkitSpeechRecognition || null; }
  function mic() {
    var C = SR(), b = $("#dsmic"), inp = $("#dsin"); if (!b) return;
    if (!C) { b.hidden = true; b.style.display = "none"; return; }
    var rec = null, on = false, langs = ["ar-LB", "fr-FR"], li = 0, base = "";
    function stop() { on = false; b.classList.remove("on"); try { rec && rec.stop(); } catch (e) {} }
    function go() {
      try { rec = new C(); } catch (e) { b.style.display = "none"; return; }
      rec.lang = langs[li]; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      base = inp.value ? inp.value + " " : "";
      rec.onresult = function (e) { var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; inp.value = base + t; };
      rec.onerror = function (e) { if (e && (e.error === "language-not-supported" || e.error === "bad-grammar") && li === 0) { li = 1; on = false; go(); return; } if (e && e.error === "not-allowed") { b.style.display = "none"; } stop(); };
      rec.onend = function () { var was = on; stop(); if (was && inp.value.trim()) { var v = inp.value; inp.value = ""; send(v); } };
      try { rec.start(); on = true; b.classList.add("on"); } catch (e) { stop(); }
    }
    b.onclick = function () { S.unlocked = true; stopVoice(); if (on) stop(); else go(); };
  }
  function boot() {
    var root = app(); if (!root) return;
    var day = today(), st = state();
    S = { day: day, p: partner(day), snd: st.snd === 1, unlocked: false, okAll: 0, touch: "ontouchstart" in w };
    var id = (location.hash.match(/l=([a-z]+:[a-z0-9]+)/) || [])[1];
    if (!id || !lessonInfo(id)) id = pickLesson(day, st, true);
    root.innerHTML = '<div class="dsapp"><div class="hd" id="dshd"></div><div class="ch" id="dsch" aria-live="polite"><div class="dv">اليوم · ' + hm() + '</div></div>' +
      '<form class="ib" id="dsform" autocomplete="off"><button type="button" class="mic" id="dsmic" aria-label="احكي">🎤</button><input class="in" id="dsin" type="text" dir="auto" placeholder="اكتب جوابك أو احكي 🎤…" aria-label="جوابك" enterkeyhint="send"><button class="go" type="submit" aria-label="ابعت">↑</button></form></div>';
    $("#dsform").onsubmit = function (e) { e.preventDefault(); S.unlocked = true; var i = $("#dsin"), v = i.value; i.value = ""; send(v); };
    mic();
    start(id, true);
    if (!st.visited) { st.visited = day; save(st); }
    cloud();
    d.addEventListener("nursin:auth", function () { setTimeout(cloud, 500); });
  }
  function init() {
    if (app()) boot();
    else { setTimeout(nudge, 1500); setTimeout(cloud, 4000); d.addEventListener("nursin:auth", function () { setTimeout(cloud, 800); }); }
  }
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
