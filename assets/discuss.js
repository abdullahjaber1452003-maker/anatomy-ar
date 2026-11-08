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
     (assets/discuss-audio/: the fixed lines, and 31d each question + its answer for Réa, Law, Management, Med-Surg; the rest is text only).
   • lesson of the day: the NEXT exam's subjects (assets/midterm.js NursinMid.next), his mistakes first (nursin_weak_v1), the least
     discussed next; fixed once chosen for the day (nursin_discuss_v1.pick).
   • 31d: his 🎤 answer is a voice bubble (his recording), the recognised words stay hidden and only feed the matching.
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
    ["سبب", "اسباب", "cause", "causes", "etiologie"], ["علامات", "عوارض", "اعراض", "signes", "symptomes"],
    /* 31g: more of his Lebanese / French mixes */
    ["كلي", "كليه", "كليتين", "الكلي", "rein", "reins", "renal", "renale"], ["رئه", "ريه", "رئتين", "رئتان", "رييه", "poumon", "poumons", "pulmonaire"],
    ["حماض", "حموضه", "acidose"], ["قلاء", "قلويه", "alcalose"], ["سعال", "سعله", "كحه", "قحه", "toux", "tousser"], ["عميق", "عميقه", "بعمق", "profond", "profonde"],
    ["وضعيه", "position", "installation"], ["مجري", "مجاري", "voie", "voies"], ["تعويض", "يعوض", "بيعوض", "بتعوض", "compensation", "compense"]
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
    if (la) return a.length >= 5 && b.length >= 5 && (a.slice(0, 5) === b.slice(0, 5) || lev(a, b, 2) <= 2);   // 31g: a typo / a voice slip (≤2 letters) still counts
    if (a.length >= 4 && b.length >= 4 && Math.abs(a.length - b.length) <= 2 && a.slice(0, 4) === b.slice(0, 4)) return true;
    var mx = Math.min(a.length, b.length) >= 7 ? 2 : 1;
    return a.length >= 5 && b.length >= 5 && lev(a, b, mx) <= mx;
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
  var NEGQ = /(^|[\s(«،])(مش|ما|غلط|خطأ|ليس|ليست|مو|non|pas|sauf|faux|incorrect|except)([\s؟?:،»)]|$)/i;
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


  /* ---------------- 🤝 31e «كأنه أنا ورفيقي عم نحكي عن الدرس» (Abdullah, Nov 8 2026 6:02–6:29 PM) ----------------
     Every question of the script becomes a TURN of a chat between two friends, never the same kind twice in a row, least-used first:
       😮 wow   the partner shares a lesson fact surprised → he confirms / explains → «إي والله! وكمان…»
       🤔 oops  the partner says a WRONG version (an MCQ wrong option) → he must correct it → «آه صح! كنت ملخبط 😅» / «لا استنّى… بالدرس…»
       💭 opin  his opinion on a list of the lesson → the partner's take = the lesson's list
       🩺 case / 🎭 role  a patient case of the bank («أنا المريض…»)   ⚡ tf  «صح ولا غلط؟»   🧩 fill  «كمّل الجملة»   ❓ ask  sometimes
     Phrases rotate (PH, each recorded in both voices: assets/discuss-audio/p-<kind><i>-<g>.mp3), MCQ stems rotate through the bank's own
     wordings (q0 + v, NURSIN_QV data), light jokes now and then (never about the facts). Everything said is the lesson's own text. */
  var PH = {"wow": ["شفت؟ ما كنت بعرف هالشي! 😮", "يا زلمة! قريت شي اليوم خلّاني إنصدم 😮", "والله؟ اسمع شو لقيت بالدرس 😮", "معقول؟ هيدي ما كنت مركّز عليها أبداً 😮", "قلّي إذا مظبوط، لأنّي انصدمت 😮"], "oops": ["سمعت شي ومش متأكّد منّو 🤔", "استنّى، أنا هيك فاهمها… صح؟ 🤔", "رفيقي قلّي هيك، شو رأيك؟ 🤔", "أنا عم بتلخبط بهيدي 😅 صحّحلي إذا غلطان"], "opin": ["شو رأيك إنت؟ 💭", "بدّي رأيك بهيدي 💭", "قلّي شو بتفكّر 💭"], "case": ["تخيّل معي هالحالة 🩺", "عندي حالة بدّي رأيك فيها 🩺", "يلّا حالة صغيرة، متل بالمستشفى 🩺"], "role": ["خلّينا نلعب: أنا المريض وإنت الممرّض 🎭", "هلّق أنا المريض 🤒 شو بتعمللي؟"], "tf": ["سؤال سريع: صح ولا غلط؟ ⚡", "بسرعة بلا ما تفكّر كتير ⚡"], "fill": ["كمّل الجملة 🧩", "يلّا كمّلّي يلّي ناقص 🧩"], "ask": ["عندي سؤال إلك 👇", "خلّيني إسألك 👇", "هيدي بدّي ياها منك 👇"], "yes": ["إي والله! 😄", "حلو هيك 👌", "بالظبط! 👏", "يا عيني عليك 😄", "مظبوط مية بالمية ✅"], "fix": ["آه صح! أنا كنت ملخبط 😅", "معك حق، شكراً إنك صحّحتلي 🙏", "إيه هيك! أنا اللي غلطت 😅"], "nope": ["لا استنّى… بالدرس مكتوب غير هيك", "لا لا مش هيك 😅", "أوف، مش هيك بالظبط"], "part": ["حلو! بس في كم شغلة ناقصين 💡", "قريب كتير! بس نسيت شي 💡", "منيح، خلّيني زيدلك 💡"], "joke": ["شو نسيتها؟ 😂 حتى أنا نسيتها مبارح", "ولا يهمّك، حتى الدكتور بيتلخبط فيها 😂", "لا تخاف، ما رح قول للأستاذ 😂", "هيدي بدها قهوة تانية ☕😂", "عادي، دماغنا كمان بدو perfusion 😂"], "more": ["وكمان بالدرس 👇", "وزيد عليها 👇"]};
  var KINDS = ["wow", "oops", "opin", "case", "role", "tf", "fill", "ask"];
  var KEMO = { wow: "😮", oops: "🤔", opin: "💭", case: "🩺", role: "🎭", tf: "⚡", fill: "🧩", ask: "❓" };
  var CASE = /(مريض|مريضة|شاب|صبية|رجل|امرأة|مسن|مسنّ|ختيار|طفل|سنة|عمرو|عمرها|patient)/;
  function kindsFor(Q) {
    var k = ["ask"];
    if (Q.kind === "l") { if (Q.items.length >= 2) k.push("wow", "opin"); if (Q.items.length >= 3) k.push("fill"); }
    else {
      if (!Q.neg) { k.push("tf"); if (Q.wrong.length && (Q.src && Q.src.why || Q.x)) k.push("oops"); if (Q.x && Q.x.length > 25) k.push("wow"); }
      if (CASE.test(Q.src ? (Q.src.q0 || Q.src.q) : Q.q)) k.push("case", "role");
    }
    return k;
  }
  function least(st, list, key, avoid) {                  // the least-used of list (never «avoid»), counts kept in st[key]
    var C = st[key] = st[key] || {}, best = null, bn = 1e9;
    list.forEach(function (x, i) { if (x === avoid && list.length > 1) return; var n = (C[x] | 0) * 10 + ((hash(x + (st.rot | 0)) % 7)); if (n < bn) { bn = n; best = x; } });
    if (best != null) C[best] = (C[best] | 0) + 1;
    return best;
  }
  function phrase(kind, st) {                              // {t, i} — the least-used phrase of that kind
    var L = PH[kind] || [""], C = (st.ph = st.ph || {}), k2 = kind, used = C[k2] = C[k2] || [], i, bi = 0, bn = 1e9;
    for (i = 0; i < L.length; i++) { var n = (used[i] | 0) * 10 + (hash(kind + i + (st.rot | 0)) % 5); if (n < bn) { bn = n; bi = i; } }
    used[bi] = (used[bi] | 0) + 1; return { t: L[bi], i: bi, k: kind };
  }
  function phSrc(ph, p) { return ph ? "assets/discuss-audio/p-" + ph.k + ph.i + "-" + p.g + ".mp3" : ""; }
  function stems(Q) { if (Q.kind !== "m" || !Q.src) return [Q.q]; var b = Q.src, a = [b.q0 != null ? b.q0 : b.q]; (b.v || []).forEach(function (x) { if (x && x.q) a.push(x.q); }); return a; }
  /* the turn: {kind, ph, text (html), voice: [mp3…], exp} — exp = what his reply is checked against */
  function turnOf(id, Q, st, prev, p) {
    p = p || partner();
    var kind = least(st, kindsFor(Q), "tt", prev), ph = phrase(kind, st), seen = (st.seen || {})[id + "|" + Q.key] | 0;
    var ws = stems(Q), wi = (seen + dayNum(today())) % ws.length, stem = ws[wi].replace(/\n.*/, "");
    var T = { kind: kind, ph: ph, wi: wi, voice: [phSrc(ph, p)], text: "" };
    var it = Q.items || [], right = Q.kind === "m" ? Q.opts[Q.a] : "";
    if (kind === "wow") {
      if (Q.kind === "l") { T.text = "«" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + " فيها: ⟦" + it[0] + "⟧! 😮 معقول؟ شو بتعرف كمان عنها؟"; T.kps = Q.kps.slice(1); T.give = it.slice(1); }
      else { T.text = "⟦" + clip(Q.x, 230) + "⟧ — كنت بتعرف هالشي؟"; T.kps = Q.kps; T.give = [right]; }
    } else if (kind === "oops") {
      var wr = Q.wrong[hash(Q.key + seen) % Q.wrong.length];
      T.text = "«" + stem + "» — أنا فكّرت الجواب ⟦" + (wr.opt || wr.kp.text) + "⟧… مظبوط؟"; T.bad = wr;
    } else if (kind === "opin") {
      T.text = "برأيك شو أهم شي ب«" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + "؟ وليش؟";
    } else if (kind === "case") {
      T.text = stem + (/[؟?:]\s*$/.test(stem) ? "" : "؟") + " شو رأيك؟";
      T.voice.push(wi === 0 ? qAudio(id, Q, "q", p) : "");
    } else if (kind === "role") {
      T.text = "تخيّل إنّي أنا هالمريض 🤒: " + stem;
      T.voice.push(wi === 0 ? qAudio(id, Q, "q", p) : "");
    } else if (kind === "tf") {
      var useRight = hash(Q.key + seen + "tf") % 2 === 0 || !Q.wrong.length, op = useRight ? right : (Q.wrong[hash(Q.key + seen) % Q.wrong.length].opt || right);
      if (!op) { op = right; useRight = true; }
      T.text = "«" + stem + "» ← ⟦" + op + "⟧"; T.truth = useRight; T.op = op;
    } else if (kind === "fill") {
      var n = Math.min(2, it.length - 1);
      T.text = "«" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + ": " + it.slice(0, n).join("، ") + "، و… ؟"; T.kps = Q.kps.slice(n); T.give = it.slice(n);
    } else {
      T.text = Q.kind === "m" ? Q.q.replace(/^[^\n]*/, stem) : Q.q;
      T.voice.push(Q.kind === "l" || wi === 0 ? qAudio(id, Q, "q", p) : "");
    }
    return T;
  }
  var YES = /^\s*(اي|إي|ايه|إيه|ايوه|اه|آه|أه|مظبوط|مزبوط|صح|صحيح|اكيد|أكيد|طبعا|طبعاً|بالظبط|نعم|yes|oui|vrai|exact|true|✅)/i;
  var NO = /(^\s*(لا|لأ|كلا|non|no|faux|false|❌)(\s|$|[!.،,])|مش\s*(صح|مظبوط|هيك)|غلط|خطأ|ما\s*بظن|مش\s*متل|incorrect)/i;
  function yesNo(t) { t = String(t || ""); return NO.test(t) ? "no" : YES.test(t) ? "yes" : ""; }

  /* ---------------- 🧠 judging his words ---------------- */
  var QW = /^(شو|ليش|ليه|كيف|كيفي|كيفو|متى|امتى|ايمتى|إيمتى|وين|مين|قديش|اديش|أديش|شقد|هل|يعني\s*شو|ما\s*هو|ما\s*هي|شو\s*يعني|what|why|how|when|where|which|who|pourquoi|comment|quand|quel|quelle|quels|quelles|qu['’]?est|est[- ]ce|c['’]?est\s*quoi|explique|اشرح|اشرحلي|فسّر|فسرلي|خبّرني|خبرني)(\s|$)/i;
  function isQuestion(s) { s = String(s || "").trim(); return /[؟?]\s*$/.test(s) || QW.test(s); }
  /* 31g (Abdullah 9:11 PM: «قلتلو ماني عارف، معقول هيك؟ إنت عندك شي فكرة؟ قام قلّي هاي من درس تاني»): «I don't know / you tell me /
     really?» is never graded and never «another lesson» — the partner answers its OWN question, friendly, then checks back */
  var UNSURE = /(ما\s*ب?عرف|ماني\s*عارف|مانا\s*عارف|ماني\s*متاكد|مش\s*عارف|مش\s*متاكد|مش\s*اكيد|مدري|مندري|ما\s*بدري|ما\s*بتذكر|ما\s*بتزكر|ما\s*عرفت|نسيت|ما\s*عندي\s*(شي\s*|اي\s*)?فكر|عندك\s*(شي\s*|اي\s*)?فكر|شو\s*رايك|شو\s*بتقول\s*انت|شو\s*بتعرف\s*انت|قلي\s*انت|قلي\s*الجواب|خبرني\s*انت|قول\s*انت|جاوب\s*انت|انت\s*جاوب|لا\s*اعرف|je\s*(ne\s*)?sais\s*pas|j['’]?\s*sais\s*pas|chais\s*pas|aucune\s*id[eé]e|pas\s*s[uû]re?|j['’]?en\s*sais\s*rien|et\s*toi\s*[?؟]|t['’]?en\s*penses\s*quoi|idk|no\s*idea|i\s*don['’]?t\s*know)/i;
  var REALLY = /(^|[\s،,.])معقول\s*(هيك|هالشي|هيدا|هيدي|يعني)?\s*([?؟!.…]|$)/;
  function soft(t) { return String(t || "").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ").toLowerCase(); }
  function unsure(t) { t = soft(t); return UNSURE.test(t) || (REALLY.test(t) && toks(t.replace(/معقول|هيك|هالشي|يعني|انت|عندك|فكره|شي/g, " ")).length <= 2); }
  var DUNNO = { test: unsure };
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
  /* «his words belong to ANOTHER lesson» → that lesson's id, else "".  31g: only a real statement (never a question, never «ما بعرف»),
     ≥4 content words once the words every lesson shares are left out, ≥2 words that are distinctive of the other lesson (rare across his
     lessons), and ~nothing in common with this lesson or with what the partner just said (ctx) */
  var COMMON = null;
  function common() {
    if (COMMON) return COMMON; COMMON = {};
    toks("مريض ممرضه ممرض علاج دم قلب ضغط تنفس نفس حاله جسم مستشفي طبيب دكتور دوا وجع عمل اعمل بعمل منعمل لازم كتير مهم شغله شغلات حدا ناس وقت مرض امراض نبض حراره سوايل اكسجين مراقبه اعطاء نقص ارتفاع انخفاض " +
      "patient malade infirmier infirmiere soin soins traitement sang coeur tension respiration prise charge cas maladie important surveillance douleur risque normal normale signe signes").forEach(function (t) { COMMON[t] = 1; });
    return COMMON;
  }
  function otherLesson(cur, text, ctx) {
    if (isQuestion(text) || unsure(text) || confused(text)) return "";
    var C = common(), u = Object.keys(setOf(toks(text))).filter(function (t) { return !C[t]; });
    if (u.length < 4) return "";
    var VV = vocab().V, Vc = VV[cur] || {}, X = ctx ? setOf(toks(ctx)) : {}, curHit = 0;
    u.forEach(function (t) { if (Vc[t] || has(X, t)) curHit++; });
    if (curHit > (u.length >= 8 ? 1 : 0)) return "";
    var best = "", bs = 0, bn = 0, n = vocab().n, rare = Math.log(1 + n / Math.max(2, n / 12));
    Object.keys(VV).forEach(function (id) {
      if (id === cur) return; var V = VV[id], sc = 0, k = 0;
      u.forEach(function (t) { if (V[t]) { var f = idfOf(t); sc += f; if (f >= rare) k++; } });
      if (k >= 2 && sc > bs) { bs = sc; best = id; bn = k; }
    });
    return best && bs >= 4 ? best : "";
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
    judge: judge, confused: confused, terms: terms, picks: picks, soloMic: soloMic, turnOf: turnOf, kindsFor: kindsFor, yesNo: yesNo, PH: PH, KINDS: KINDS, stems: stems, fix: fix, bestAlt: bestAlt, lev: lev, qFile: qFile, hasQA: hasQA, qAudio: qAudio, isQuestion: isQuestion, otherLesson: otherLesson, search: search, unsure: unsure, route: route, idkText: idkText, discussLine: discussLine, langsFor: langsFor, dbg: dbg, related: related, state: state, save: save, qLesson: qLesson, examSubs: examSubs, homeHtml: homeHtml, nudgeHtml: nudgeHtml, audioOf: audioOf, sizeOf: sizeOf, _reset: function () { QLID = null; VOC = null; } };

  /* ---------------- 🔊 voice: ONLY recorded mp3s in the reels voices (Abdullah 5:42 PM «بنفس صوت الreels») — no device TTS for the partner ----------------
     fixed lines: assets/discuss-audio/<key>-<f|m>.mp3 · greetings greet-<i>.mp3 · per question (Réa, Law, Management, Med-Surg first):
     <qid>-q-<g>.mp3 (the question, original wording only) + <qid>-a-<g>.mp3 (the right answer + the lesson's explanation); list questions
     l-<subject>-<lesson>-<i>-q/a-<g>.mp3. NDISC.au lists the questions that have them; anything else stays a text bubble. */
  function audioOf(key, p) { return "assets/discuss-audio/" + (key === "greet" ? "greet-" + p.i : key + "-" + p.g) + ".mp3"; }
  function qFile(id, Q) { return Q.kind === "m" ? Q.key : "l-" + id.replace(":", "-") + "-" + Q.key.slice(1); }
  function hasQA(id, Q) { var A = w.NDISC && w.NDISC.au; return !!(A && A.indexOf(qFile(id, Q)) > -1); }
  function qAudio(id, Q, part, p) {                       // "" when there is no recording (or the question is shown in a reworded form today)
    if (!hasQA(id, Q)) return "";
    if (part === "q" && Q.kind === "m" && Q.src && Q.src.qvi) return "";
    return "assets/discuss-audio/" + qFile(id, Q) + "-" + part + "-" + p.g + ".mp3";
  }
  var AU = null, PLAYQ = [], PLAYBTN = null;
  function stopVoice() { PLAYQ = []; try { if (AU) { AU.pause(); AU.onended = null; } } catch (e) {} AU = null; if (PLAYBTN) { PLAYBTN.classList.remove("on"); PLAYBTN.innerHTML = "▶️"; PLAYBTN = null; } }
  function playList(srcs, btn) {
    stopVoice(); PLAYQ = (srcs || []).filter(Boolean).slice(); if (!PLAYQ.length) return;
    PLAYBTN = btn || null; if (btn) { btn.classList.add("on"); btn.innerHTML = "⏸️"; }
    (function nx() {
      var src = PLAYQ.shift(); if (!src) { stopVoice(); return; }
      try { var a = new Audio(src); AU = a; a.onended = function () { if (AU === a) nx(); }; a.onerror = function () { if (AU === a) nx(); };
        var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (AU === a) stopVoice(); }); } catch (e) { stopVoice(); }
    })();
  }
  function bars(seed, n) { var r = seeded(hash(seed)), h = ""; for (var i = 0; i < n; i++) h += '<i style="height:' + (5 + Math.round(r() * 15)) + 'px"></i>'; return h; }
  function fmt(sec) { sec = Math.max(1, Math.round(sec || 0)); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
  /* a WhatsApp-like voice row: ▶️ + waveform + duration (read from the files' metadata) */
  function voiceRow(srcs, seed) {
    return '<div class="vrow"><button type="button" class="vb" aria-label="اسمع">▶️</button><span class="vw" aria-hidden="true">' + bars(seed || srcs.join(), 26) + '</span><span class="vd" data-src="' + esc(srcs.join("|")) + '">0:0…</span></div>';
  }
  function wireVoice(el, srcs) {
    var b = el.querySelector(".vb"), dEl = el.querySelector(".vd"); if (!b) return;
    b.onclick = function () { if (S) S.unlocked = true; if (PLAYBTN === b) { stopVoice(); return; } playList(srcs, b); };
    var tot = 0, left = srcs.length;
    srcs.forEach(function (src) { try { var a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = function () { tot += isFinite(a.duration) ? a.duration : 0; if (--left === 0 && dEl) dEl.textContent = fmt(tot); }; a.onerror = function () { if (--left === 0 && dEl) dEl.textContent = tot ? fmt(tot) : "🔊"; }; a.src = src; } catch (e) {} });
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
      var pg = page(); if (pg === "discuss.html" || pg === "index.html" || pg === "" || pg === "admin.html" || pg === "reels.html" || pg === "learn.html") return;
      if (String(d.documentElement.className).indexOf("nzemb") > -1) return;   // 31f: never inside the path sheet / the hidden lesson frame of 📖 وضع التعلّم (it would spend the day's nudge unseen)
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
  function pBubble(html, srcs, extraCls) {               // srcs: recorded mp3s (fixed line, question, answer); none → a text bubble only
    var p = S.p; srcs = (srcs || []).filter(Boolean);
    var x = add('<div class="lb">' + esc(p.n) + "</div>" + (srcs.length ? voiceRow(srcs, html) : "") + '<div class="tx">' + html + "</div>", "m p" + (srcs.length ? " hv" : "") + (extraCls ? " " + extraCls : ""));
    if (srcs.length) { wireVoice(x, srcs); if (S.snd && S.unlocked) playList(srcs, x.querySelector(".vb")); }
    return x;
  }
  function F(key) { return audioOf(key, S.p); }
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
    $("#dshd").innerHTML = '<div class="hr"><a class="bk" href="index.html" aria-label="رجوع">›</a><span class="av av2 md-' + (S.md || "talk") + '" id="dsav" aria-hidden="true">' + (w.NursinToons ? w.NursinToons.svg("nurse") : p.e) + "<i></i></span>" + '<span class="vh">' + p.e + '</span><div class="who"><b>' + esc(p.n) + "</b><small>نقاش · " + frWrap(clip(Li.n, 48)) + '</small></div><button type="button" class="snd' + (S.snd ? " on" : "") + '" id="dssnd" aria-pressed="' + (S.snd ? "true" : "false") + '">' + (S.snd ? "🔊 صوت" : "🔇 صوت") + "</button></div>" +
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
    if (!S.list.length) { pBubble("هالدرس ما فيه أسئلة للنقاش بعد 🙏 خلّينا ناخد درس تاني", null); qr([{ t: "📚 الدرس الجاي", f: function () { start(nextLesson(id), false); } }]); return; }
    var Li = L(), nm = esc(name());
    if (greet) pBubble("أهلين" + (nm ? " " + nm : "") + " 👋 أنا " + esc(S.p.n) + "، اليوم منتناقش بدرس <b>" + frWrap(Li.n) + "</b> 💬<br>جاوبني كتابة أو احكي 🎤، وفيك تسألني أي شي من دروسك.", [audioOf("greet", S.p)]);
    else pBubble("تمام! هلّق منتناقش بدرس <b>" + frWrap(Li.n) + "</b> 💬", null);
    typing(700, ask);
  }
  function name() { try { return w.NursinName ? w.NursinName.greetName() : ""; } catch (e) { return ""; } }
  function ask() {
    if (S.pos >= S.list.length) { S.pos = 0; S.list = order(S.id, state(), S.day); }
    S.back = null; var Q = S.cur = S.list[S.pos], st = state();
    var T = S.turn = turnOf(S.id, Q, st, S.lastKind, S.p); S.lastKind = T.kind; st.rot = (st.rot | 0) + 1; save(st);
    var html = '<span class="tag k-' + T.kind + '">' + KEMO[T.kind] + " " + esc(T.ph.t.replace(/[\s\uD800-\uDFFF\u2600-\u27BF\uFE0F\u200d]+$/, "")) + "</span>" + scene(Q, T) + '<div class="say">' + frWrap(T.text).replace(/⟦/g, "<b>").replace(/⟧/g, "</b>") + "</div>";
    pBubble(html, T.voice, "turn k-" + T.kind);
    mood(T.kind === "wow" ? "wow" : T.kind === "oops" ? "think" : "talk");
    S.hint = 0;
    var qb = [{ t: "💡 تلميح", f: hint }, { t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ الجاي", f: skip }];
    if (T.kind === "tf") qb = [{ t: "✅ صح", f: function () { send("صح ✅"); } }, { t: "❌ غلط", f: function () { send("غلط ❌"); } }].concat(qb.slice(1));
    if (T.kind === "oops") qb = [{ t: "👍 مظبوط", f: function () { send("إي مظبوط"); } }, { t: "🙅 لا، غلط", f: function () { send("لا، غلط"); } }].concat(qb.slice(1));
    qr(qb);
    var inp = $("#dsin"); if (inp && !S.touch) try { inp.focus(); } catch (e) {}
  }
  /* 🎨 the partner is a cartoon: a small animated scene of the topic (assets/reels-toons.js, the reels' own drawings) + the avatar's mood */
  function scene(Q, T) {
    var Tn = w.NursinToons; if (!Tn || !/wow|case|role|oops|opin/.test(T.kind)) return "";
    var id = Tn.pick({ ti: (Q.head || "") + " " + (Q.lab || "") + " " + (Q.q || ""), fr: "", ls: "", s: (S.id || "").split(":")[0], id: Q.key });
    if (T.kind === "role" || T.kind === "case") id = /مسن|ختيار|عجوز|geri/.test(Q.q + S.id) ? "grandpa" : id;
    return '<div class="scn" aria-hidden="true">' + Tn.svg(id) + "</div>";
  }
  function mood(m) { S.md = m; var a = $("#dsav"); if (a) a.className = "av av2 md-" + m; clearTimeout(S.mt); S.mt = setTimeout(function () { S.md = "talk"; var b = $("#dsav"); if (b) b.className = "av av2 md-talk"; }, 2600); }
  function hint() {
    var Q = S.cur; if (!Q) return; S.hint++;
    var t;
    if (Q.kind === "m" && !Q.neg) t = "الجواب واحد من هول: " + Q.opts.map(function (o) { return "«" + o + "»"; }).join(" · ");
    else if (Q.kind === "m") t = "فكّر بيلّي ما بيخصّ هالموضوع 😉";
    else t = "في " + Q.items.length + " نقاط. أوّلها بيبلّش بـ «" + clip(Q.items[0], 18).split(" ").slice(0, 2).join(" ") + "…»";
    pBubble(frWrap(t), [F("hint")]);
    qr([{ t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]);
  }
  function answerList(Q) { return Q.kind === "m" ? [Q.opts[Q.a]] : Q.items; }
  function skip() {
    var Q = S.cur; if (!Q) return;
    pBubble('<div class="no"><b>💡 الجواب:</b><ul>' + answerList(Q).map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>" + (Q.x ? '<div class="xp">📖 ' + frWrap(Q.x) + "</div>" : ""), [F("skip"), qAudio(S.id, Q, "a", S.p)], "fb");
    record(Q, false, true); after();
  }
  function record(Q, ok, skipped) {
    var st = state(); st.seen[S.id + "|" + Q.key] = (st.seen[S.id + "|" + Q.key] | 0) + 1;
    var Lr = st.les[S.id] = st.les[S.id] || { n: 0, ok: 0 }; Lr.n++; if (ok) Lr.ok++; Lr.at = Date.now();
    st.days[S.day] = (st.days[S.day] | 0) + 1;
    var dk = Object.keys(st.days).sort(); while (dk.length > 60) delete st.days[dk.shift()];
    var sk = Object.keys(st.seen); if (sk.length > 3000) st.seen = {};
    save(st); cloud();
    S.qMoved = 0; S.okIn.push(!!ok); S.inRound++; S.okAll += ok ? 1 : 0;
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
        pBubble("برافو! خلصنا خمس أسئلة 👏 جاوبت منيح على <b>" + good + " من " + ROUND + "</b>.<br>بدّك نكمّل؟", [F("done")]);
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
        pBubble("خلصنا كل أسئلة هالدرس 🎉 منكمّل بالدرس الجاي؟", null);
        qr([{ t: "📚 الدرس الجاي", f: function () { start(nextLesson(S.id), false); } }, { t: "🔁 منعيد هالدرس", f: function () { S.pos = 0; S.list = order(S.id, state(), S.day); ask(); } }]);
      });
      return;
    }
    typing(900, ask);
  }
  function pick(arr) { var st = state(), ph = phrase(arr, st); save(st); return ph; }
  function lineOf(list) { return '<ul class="mini">' + list.slice(0, 3).map(function (x) { return "<li>" + frWrap(clip(x, 70)) + "</li>"; }).join("") + (list.length > 3 ? "<li>+" + (list.length - 3) + "</li>" : "") + "</ul>"; }
  function feedback(Q, r) {
    var ok = r.hit.length, key = r.miss.length === 0 ? "yes" : ok ? "part" : "nope", ph = pick(key), h = "";
    if (ok) h += '<div class="ok"><b>✅</b> ' + lineOf(r.hit) + "</div>";
    if (r.miss.length) h += '<div class="no"><b>💡 ' + (ok ? "ونسيت:" : "بالدرس:") + "</b> " + lineOf(r.miss) + "</div>";
    if (Q.kind === "m" && Q.x && r.miss.length) h += '<div class="xp">📖 ' + frWrap(clip(Q.x, 150)) + "</div>";
    var jk = r.miss.length && (state().rot % 3 === 0) ? pick("joke") : null;
    pBubble(esc(ph.t) + h + (jk ? '<div class="jk">' + esc(jk.t) + "</div>" : ""), [phSrc(ph, S.p), r.miss.length ? qAudio(S.id, Q, "a", S.p) : "", jk ? phSrc(jk, S.p) : ""], "fb");
    mood(ok && !r.miss.length ? "yay" : ok ? "talk" : "sad");
    record(Q, r.ok);
    if (ok && r.miss.length) { discuss(Q, r); return; }
    after();
  }
  /* 31g «ناقش معي الفكرة»: a partial answer → what he got is quoted ✅ (above), the missing key point in one simple line, then
     «ليش برأيك…؟ / طب إذا…؟» — his answer to that is talked about (never graded) before the next question */
  function discussLine(Q, r, i) {
    var m = clip(r.miss[0], 70), why = Q.kind === "m" && Q.x ? clip(Q.x, 160) : "";
    var fq = i % 2 ? "طب إذا نسينا «" + m + "»، شو بيصير برأيك؟ 🤔" : "ليش برأيك «" + m + "» مهمّة هون؟ 🤔";
    return { line: why ? "" : "💡 أهم شي ناقص: «" + m + "»", q: fq };
  }
  function discuss(Q, r) {
    var st = state(), x = discussLine(Q, r, st.rot | 0);
    S.back = { kind: "why", kp: r.miss[0], q: x.q, btns: [{ t: "⏭️ منكمّل", f: nextFromBack }, { t: "📖 افتح الدرس", href: L().href }] };
    typing(1000, function () { pBubble((x.line ? frWrap(x.line) + "<br>" : "") + esc(x.q), null); mood("think"); qr(S.back.btns); });
  }
  /* the friend-chat replies: what his words mean depends on the turn */
  function turnReply(Q, T, text) {
    var yn = yesNo(text), r = judge(Q, text), right = Q.kind === "m" ? Q.opts[Q.a] : "";
    if (T.kind === "oops") {
      var saidWrong = T.bad && T.bad.kp.alts.some(function (al) { var A = setOf(toks(text)), m = 0; al.forEach(function (t) { if (A[t]) m++; }); return m >= Math.max(1, Math.ceil(al.length / 2)); });
      if ((yn === "no" || r.hit.length) && !(yn === "yes" && !r.hit.length)) { var ph = pick("fix"); pBubble(esc(ph.t) + " يعني <b>" + frWrap(right) + "</b>" + (T.bad.why ? '<div class="xp">📖 ' + frWrap(T.bad.why) + "</div>" : ""), [phSrc(ph, S.p), qAudio(S.id, Q, "a", S.p)], "fb"); mood("yay"); record(Q, true); after(); return true; }
      if (yn === "yes" || saidWrong) { var p2 = pick("nope"); pBubble(esc(p2.t) + ': <b>' + frWrap(right) + "</b>" + (T.bad.why ? '<div class="xp">📖 ' + frWrap(T.bad.why) + "</div>" : ""), [phSrc(p2, S.p), qAudio(S.id, Q, "a", S.p)], "fb bad"); mood("think"); record(Q, false); after(); return true; }
      return false;
    }
    if (T.kind === "tf" && yn) {
      var good = (yn === "yes") === !!T.truth, p3 = pick(good ? "yes" : "nope");
      pBubble(esc(p3.t) + (T.truth ? " «" + frWrap(T.op) + "» صح ✅" : " الصح: <b>" + frWrap(right) + "</b>") + (Q.x ? '<div class="xp">📖 ' + frWrap(clip(Q.x, 150)) + "</div>" : ""), [phSrc(p3, S.p), good ? "" : qAudio(S.id, Q, "a", S.p)], good ? "fb" : "fb bad");
      mood(good ? "yay" : "sad"); record(Q, good); after(); return true;
    }
    if ((T.kind === "wow" || T.kind === "fill") && T.kps) {
      var A = setOf(toks(text)), hit = [], miss = [];
      T.kps.forEach(function (k, i) { (kpHit(A, k) ? hit : miss).push(T.give[i] || k.text); });
      if (!hit.length && yn !== "yes") return false;
      var p4 = pick(hit.length ? "yes" : "yes"), more = miss.length ? pick("more") : null;
      pBubble(esc(p4.t) + (hit.length ? '<div class="ok"><b>✅</b> ' + lineOf(hit) + "</div>" : "") + (miss.length ? '<div class="no"><b>' + esc(more.t) + "</b> " + lineOf(miss) + "</div>" : ""), [phSrc(p4, S.p), more ? phSrc(more, S.p) : "", miss.length ? qAudio(S.id, Q, "a", S.p) : ""], "fb");
      mood("yay"); record(Q, hit.length > 0 || yn === "yes"); after(); return true;
    }
    if (T.kind === "opin") {
      var p5 = pick(r.hit.length ? "yes" : "part");
      pBubble(esc(p5.t) + (r.hit.length ? " أنا كمان بشوف <b>" + frWrap(clip(r.hit[0], 60)) + "</b> مهم." : "") + '<div class="no"><b>💭 بالدرس:</b> ' + lineOf(Q.items) + "</div>", [phSrc(p5, S.p), qAudio(S.id, Q, "a", S.p)], "fb");
      mood("talk"); record(Q, r.hit.length > 0); after(); return true;
    }
    return false;
  }
  function wrongReply(Q, r) {
    var why = r.wrong.why || "";
    var h = LINES.wrong + " — " + (why ? frWrap(why) : "") + '<div class="ok"><b>✔️ الصح من الدرس:</b><ul>' + answerList(Q).map(function (x) { return "<li>" + frWrap(x) + "</li>"; }).join("") + "</ul></div>" + (Q.kind === "m" && Q.x ? '<div class="xp">📖 ' + frWrap(Q.x) + "</div>" : "");
    pBubble(h, [F("wrong"), qAudio(S.id, Q, "a", S.p)], "fb bad"); mood("think");
    record(Q, false); after();
  }
  function bq(T, Q) { return frWrap((T && T.text) || Q.q).replace(/⟦/g, "<b>").replace(/⟧/g, "</b>"); }
  function backBtns() { return [{ t: "💡 تلميح", f: hint }, { t: "📖 افتح الدرس", href: L().href }, { t: "⏭️ السؤال الجاي", f: skip }]; }
  function backToMine(lead) {
    var Q = S.cur; if (!Q) return;
    if (S.back) { pBubble((lead || LINES.back) + " 👇<br>" + esc(S.back.q), [F("back")]); qr(S.back.btns); return; }
    pBubble((lead || LINES.back) + " 👇<br>" + bq(S.turn, Q), [F("back")]); qr(backBtns());
  }
  /* 31g: «it is from another lesson» — FIRST his point is discussed (what HIS lessons say about it), then only a soft
     «(بالمناسبة هيدي أكتر من درس X، بدك ننتقل؟)» with 🔀 / ↩️ */
  function otherReply(Q, other, text, asked) {
    var Lo = lessonInfo(other), Lc = L(); asked = asked || search(S.id, text, other);
    pBubble("فهمت عليك 👌 هيدا اللي بتحكي عنّو، بدروسك مكتوب:" + (asked ? '<div class="xp">' + (asked.h ? "<b>" + frWrap(clip(asked.h, 70)) + "</b><br>" : "") + frWrap(clip(asked.t, 300)) + "</div>" : "") +
      '<div class="soft">(بالمناسبة هيدي أكتر من درس <b>' + frWrap(Lo.n) + "</b>، مش من درس <b>" + frWrap(Lc.n) + "</b>، بدّك ننتقل؟)</div>", [F("found")], "fb oth");
    qr([{ t: "🔀 خلّينا نناقش درس " + esc(clip(Lo.n, 26)), f: function () { start(other, false); } }, { t: "↩️ منكفّي بدرسنا", f: function () { backToMine(); } }]);
  }
  /* 31g: his question is ALWAYS answered first (all his lessons, this one counts a bit more), never graded, then a related follow-up */
  function questionReply(text) {
    var Q = S.cur, best = search(S.id, text);
    if (!best) {
      pBubble(LINES.nf + "<br><small>جرّب تسأل بكلمات من الدرس، أو افتح الدرس 📖</small>", [F("nf")]);
      typing(900, function () { backToMine(); });
      return;
    }
    var Lb = lessonInfo(best.id) || L();
    pBubble(LINES.found + '<div class="xp">' + (best.h ? "<b>" + frWrap(clip(best.h, 70)) + "</b><br>" : "") + frWrap(clip(best.t, 360)) + '</div><a class="cite" href="' + esc(Lb.href) + '">📖 افتح الدرس: ' + frWrap(clip(Lb.n, 40)) + "</a>", [F("found")], "fb");
    typing(1100, function () { followUp(best); });
  }
  /* after his question: a question of this lesson about the same thing (moved to now), else back to mine */
  function followUp(best) {
    var Q = S.cur; if (!Q) return;
    if (S.back) { backToMine("طب منرجع لسؤالي 😉"); return; }
    var j = related(S.list, S.pos, best);
    if (j > S.pos && !S.qMoved) {
      var Qn = S.list.splice(j, 1)[0]; S.list.splice(S.pos, 0, Qn); S.qMoved = 1;
      pBubble("طب بما إنّك سألت عن هالشي، خلّيني إسألك عليه 😉", null); typing(700, ask); return;
    }
    backToMine("طب منرجع لفكرتي 😉");
  }
  function related(list, pos, best) {
    var C = common(), B = setOf(toks((best.h || "") + " " + best.t).filter(function (t) { return !C[t]; })), bj = -1, bn = 1;
    function ov(Q) { var n = 0; Object.keys(setOf(toks(Q.q + " " + (Q.x || "") + " " + (Q.items || []).join(" ") + " " + (Q.kind === "m" ? Q.opts[Q.a] : "")))).forEach(function (t) { if (B[t] && !C[t]) n++; }); return n; }
    if (list[pos] && ov(list[pos]) >= 2) return pos;
    for (var i = pos + 1; i < list.length; i++) { var n = ov(list[i]); if (n > bn) { bn = n; bj = i; } }
    return bn >= 2 ? bj : -1;
  }
  /* 31g: «ما بعرف / إنت عندك فكرة؟ / معقول؟» → the partner answers its OWN question from the lesson + why, then a simple check-back */
  function idkText(Q, T) {
    var right = Q.kind === "m" ? Q.opts[Q.a] : "", k = T ? T.kind : "ask", key, why = "", chk;
    if (k === "oops" && T.bad) { key = "لا، مش متل ما قلت أنا 😅 الصح: ⟦" + right + "⟧"; why = T.bad.why || Q.x || ""; }
    else if (k === "tf" && T.op) { key = T.truth ? "إيه، صح: ⟦" + T.op + "⟧ ✅" : "لا، مش صح. الصح: ⟦" + right + "⟧"; why = Q.x || ""; }
    else if (Q.kind === "l") { key = "«" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + ": ⟦" + Q.items.slice(0, 3).join(" · ") + "⟧" + (Q.items.length > 3 ? " …" : ""); }
    else { key = "⟦" + right + "⟧"; why = Q.x || ""; }
    if (why && why.indexOf(right) === 0 && why.length - right.length < 15) why = "";
    if (Q.kind === "l") chk = "سهلة هلّق 😉 قلّي وحدة منهن بكلماتك؟";
    else { var st0 = (stems(Q)[0] || Q.q).replace(/\n[\s\S]*/, ""); chk = "يعني إذا حدا سألك هلّق «" + clip(st0, 110) + "»، شو بتقلّو؟ 😉"; }
    return { open: "ولا يهمّك، خلّيني قلّك 😄", key: key, why: why ? "ليش؟ " + clip(why, 230) : "", check: chk };
  }
  function idkReply(Q, T) {
    var x = idkText(Q, T);
    pBubble(esc(x.open) + '<div class="ok">' + frWrap(x.key).replace(/⟦/g, "<b>").replace(/⟧/g, "</b>") + "</div>" + (x.why ? '<div class="xp">📖 ' + frWrap(x.why) + "</div>" : ""), [qAudio(S.id, Q, "a", S.p)], "fb");
    mood("talk"); record(Q, false, true);
    S.back = { kind: "check", q: x.check, btns: [{ t: "👍 فهمت، الجاي", f: nextFromBack }, { t: "📖 افتح الدرس", href: L().href }] };
    typing(1000, function () { pBubble(esc(x.check), null); qr(S.back.btns); });
  }
  function nextFromBack() { clearQr(); S.back = null; after(); }
  /* the answer to a check-back / «ليش برأيك…؟»: never graded — agreed with, completed, then on */
  function backReply(Q, text) {
    var B = S.back; S.back = null;
    var r = judge(Q, text), A = setOf(toks(text)), xs = setOf(toks((Q.x || "") + " " + (B.kp || ""))), n = 0;
    Object.keys(A).forEach(function (t) { if (has(xs, t)) n++; });
    var good = r.hit.length > 0 || n >= 2 || (B.kind === "check" && yesNo(text) === "yes" && Q.kind !== "l");
    var ph = pick(good ? "yes" : "part"), add2 = "";
    if (unsure(text)) add2 = '<div class="xp">📖 ' + frWrap(clip(Q.x || B.kp || answerList(Q).join(" · "), 220)) + "</div>";
    else if (!good) add2 = '<div class="xp">💡 ' + (B.kind === "check" ? "الجواب: <b>" + frWrap(clip(answerList(Q).join(" · "), 160)) + "</b>" : "فكرتك حلوة 👌 وبالدرس: " + frWrap(clip(Q.x || B.kp, 200))) + "</div>";
    pBubble(esc(unsure(text) ? "ولا يهمّك 😄" : ph.t) + add2, [unsure(text) ? "" : phSrc(ph, S.p)], "fb");
    mood(good ? "yay" : "talk"); after();
  }
  function send(text) {
    text = String(text || "").trim(); if (!text || !S || !S.cur) return;
    clearQr(); stopVoice();
    add(frWrap(text) + '<span class="t">' + hm() + " ✓✓</span>", "m u");
    judgeAndReply(text, 650 + Math.min(900, text.length * 12));
  }
  function route(text, Q, T, cur, back) {                  // what his words are, before anything is graded
    if (confused(text)) return "confused";
    if (unsure(text) && !(Q && judge(Q, text).hit.length)) return back ? "back" : "idk";
    if (isQuestion(text)) return "question";
    if (back) return "back";
    return "answer";
  }
  function judgeAndReply(text, ms) {
    var Q = S.cur;
    typing(ms, function () {
      var k = route(text, Q, S.turn, S.id, !!S.back);
      if (k === "confused") { if (S.back) { pBubble("أوكي ببساطة 😄 " + esc(S.back.q), null); qr(S.back.btns); return; } clarify(Q, S.turn); return; }
      S.conf = 0;
      if (k === "back") { backReply(Q, text); return; }
      if (k === "idk") { idkReply(Q, S.turn); return; }
      if (k === "question") { questionReply(text); return; }
      if (S.turn && turnReply(Q, S.turn, text)) return;
      var r = judge(Q, text);
      if (r.wrong) { wrongReply(Q, r); return; }
      if (!r.hit.length) { var o = otherLesson(S.id, text, (S.turn ? S.turn.text : "") + " " + Q.q + " " + (Q.x || "") + " " + answerList(Q).join(" ")); if (o) { otherReply(Q, o, text, null); return; } }
      feedback(Q, r);
    });
  }
  /* 🎤 31d (Abdullah 5:40 PM «ما في داعي إنه الشي اللي بحكيه بالصوت ينكتب كتابة»): tap 🎤 → he talks → tap again (or he stops talking) →
     his answer lands in the chat as a VOICE bubble (▶️ + waveform + duration, his own recording via MediaRecorder where the browser has it,
     else «🎤 رسالة صوتية»). The words are NOT shown (only behind the tiny «شو سمعت؟»): the browser's speech-to-text runs silently
     (ar-LB, fr-FR when Arabic is not offered; 3 alternatives → the one that fits this question best; words close to the lesson's
     keywords are corrected to them) and only feeds the matching. Hidden where there is no speech-to-text (iOS 12). */
  function SR() { return w.SpeechRecognition || w.webkitSpeechRecognition || null; }
  function lev(a, b, max) {                              // edit distance, stops early past max
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) { cur = [i]; var lo = cur[0]; for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)); if (cur[j] < lo) lo = cur[j]; } if (lo > max) return max + 1; prev = cur; }
    return prev[b.length];
  }
  function pool(id, Q) {                                  // stem → [the word to write, weight]: this question's key points + wrong options, the lesson, the synonym list
    var P = {}, V = vocab().V[id] || {};
    function put(t, wd, wt) { if (t && t.charAt(0) !== "§" && (!P[t] || P[t][1] < wt)) P[t] = [wd, wt]; }
    if (Q) { Q.kps.forEach(function (k) { k.alts.forEach(function (a) { a.forEach(function (t) { put(t, t, 3); }); }); }); Q.wrong.forEach(function (w0) { w0.kp.alts.forEach(function (a) { a.forEach(function (t) { put(t, t, 3); }); }); }); }
    Object.keys(V).forEach(function (t) { put(t, t, 2); });
    Object.keys(synMap()).forEach(function (k) { put(stem(k), k, 1); });
    return P;
  }
  /* «fuzzy-correct near lesson keywords»: a heard word that is not a lesson word but is 1–2 letters away from one becomes that word */
  function fix(text, id, Q) {
    var P = pool(id, Q), M = synMap(), ks = Object.keys(P);
    return norm1(text).replace(/[^a-z0-9\u0621-\u064a]+/g, " ").split(" ").map(function (x) {
      if (!x || STOP[x] || NEG[x] || x.length < 4) return x;
      var t = stem(x); if (P[t] || M[t] || M[x]) return x;
      var max = t.length >= 7 ? 2 : 1, best = "", bd = max + 1, bw = 0;
      for (var i = 0; i < ks.length; i++) { var k = ks[i]; if (k.length < 4) continue; var dd = lev(t, k, max); if (dd < bd || (dd === bd && P[k][1] > bw)) { bd = dd; best = k; bw = P[k][1]; } }
      return best && bd <= max ? P[best][0] : x;
    }).join(" ");
  }
  /* of the recogniser's alternatives, the one that fits this question best (more key points heard, lesson words), never a «wrong» by noise */
  function bestAlt(alts, id, Q) {
    var V = vocab().V[id] || {}, best = alts[0] || "", bs = -1;
    alts.forEach(function (a, i) {
      if (!a) return; var r = Q ? judge(Q, a) : { hit: [], wrong: null }, n = 0; toks(a).forEach(function (t) { if (V[t]) n++; });
      var sc = r.hit.length * 3 + n * 0.5 - (r.wrong ? 0.5 : 0) - i * 0.1;
      if (sc > bs) { bs = sc; best = a; }
    });
    return best;
  }
  /* iOS Safari: the mic has ONE consumer — when MediaRecorder took it, webkitSpeechRecognition heard nothing (Abdullah 6:41 PM, two
     «ما سمعتك منيح» after 9 s and 4 s answers). So on Safari / iOS only the recogniser runs (continuous + interim, every result kept
     until ⏹️, restarted when it ends by itself while he is still talking, ar-LB → ar-SA → fr-FR when a session hears nothing) and his
     bubble is a drawn waveform + duration; the recording to replay is only taken where both can run (Chrome / Android / desktop). */
  /* 31g (Abdullah 9:04 PM «مرات بقلّي ما سمعت منيح»): on iPhone / Safari ar-LB is often not offered (silent failure) → ar-SA first, then fr-FR */
  function langsFor(ua, solo) {
    ua = String(ua || "");
    return solo || /iPhone|iPad|iPod/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua)) ? ["ar-SA", "fr-FR"] : ["ar-LB", "ar-SA", "fr-FR"];
  }
  /* the last 20 voice outcomes (language, how much was heard, the error) — no UI, to ask him about later */
  function dbg(o) {
    var a = lsGet("nursin_discuss_dbg"); if (!a || !a.push) a = [];
    o.at = new Date().toISOString().slice(0, 16); a.push(o); while (a.length > 20) a.shift(); lsSet("nursin_discuss_dbg", a);
  }
  function soloMic() {
    var ua = navigator.userAgent || "";
    return !w.SpeechRecognition || /iPhone|iPad|iPod/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua)) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function mic() {
    var C = SR(), b = $("#dsmic"), inp = $("#dsin"); if (!b) return;
    if (!C) { b.hidden = true; b.style.display = "none"; return; }
    var rec = null, mr = null, chunks = [], stream = null, on = false, t0 = 0, langs = langsFor(navigator.userAgent || "", soloMic()), li = 0, prev = [], cur = [], tick = 0, done = false, ph = inp.placeholder, heardAny = false, sess = 0, empties = 0, lastErr = "", stopping = false;
    function ui(x) { on = x; b.classList.toggle("on", x); b.innerHTML = x ? "⏹️" : "🎤"; inp.disabled = x; inp.placeholder = x ? "🔴 عم سجّل… كبوس ⏹️ لمّا تخلص" : ph; clearInterval(tick); if (x) tick = setInterval(function () { inp.placeholder = "🔴 عم سجّل " + fmt((Date.now() - t0) / 1000) + " … كبوس ⏹️ لمّا تخلص"; }, 500); }
    function alts() {                                    // alternative j of everything heard (earlier sessions + this one)
      var A = [], n = Math.max(prev.length, cur.length, 1), j;
      for (j = 0; j < n; j++) A.push(((prev[j] || prev[0] || "") + " " + (cur[j] || cur[0] || "")).replace(/\s+/g, " ").trim());
      return A.filter(function (x, i) { return x && A.indexOf(x) === i; });
    }
    function finish() {
      if (done) return; done = true; ui(false);
      try { if (rec) { rec.onend = null; rec.abort ? rec.abort() : rec.stop(); } } catch (e) {}
      var dur = (Date.now() - t0) / 1000, Q = S.cur, A = alts();
      function go(url) {
        try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null;
        var raw = A.length ? bestAlt(A, S.id, Q) : "", heard = raw ? fix(raw, S.id, Q).replace(/\s+/g, " ").trim() : "";
        if (!heard && raw) heard = raw.trim();                    // 31g: ANY non-empty result counts (interim, low confidence)
        dbg({ lang: langs[li], len: heard.length, err: lastErr, s: sess, d: Math.round(dur) });
        sendVoice({ url: url, dur: dur, heard: heard, raw: A[0] || "" });
      }
      if (mr && mr.state !== "inactive") { mr.onstop = function () { var url = ""; try { url = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/mp4" })) : ""; } catch (e) {} go(url); }; try { mr.stop(); } catch (e) { go(""); } }
      else go("");
    }
    function startRec() {
      try { rec = new C(); } catch (e) { b.style.display = "none"; return; }
      var my = ++sess, got = false;
      rec.lang = langs[li]; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 3;
      rec.onresult = function (e) {
        if (my !== sess) return;
        var n = 1, i, j, A = []; for (i = 0; i < e.results.length; i++) n = Math.max(n, e.results[i].length);
        for (j = 0; j < n; j++) { var t = ""; for (i = 0; i < e.results.length; i++) { var r0 = e.results[i]; t += ((r0[Math.min(j, r0.length - 1)] || {}).transcript || "") + " "; } A.push(t.trim()); }
        cur = A; if (A[0]) { got = true; heardAny = true; }
      };
      rec.onerror = function (e) {
        var er = e && e.error; lastErr = er || "";
        if (er === "language-not-supported" || er === "bad-grammar") { if (li < langs.length - 1) { li++; } }
        if (er === "not-allowed" || er === "service-not-allowed") { b.style.display = "none"; on = false; finish(); }
      };
      rec.onend = function () {
        if (my !== sess) return;
        if (!on) { finish(); return; }
        if (cur.length) { prev = alts(); cur = []; }   // keep what this session heard, then listen on
        if (!got) empties++; else empties = 0;
        if (!got && !heardAny && empties >= 2 && li < langs.length - 1) { li++; empties = 0; }   // 31g: a language is dropped only after 2 silent sessions
        setTimeout(function () { if (on && !done) startRec(); }, 120);
      };
      try { rec.start(); } catch (e) { if (on) setTimeout(function () { if (on && !done) startRec(); }, 300); }
    }
    function begin() {
      stopVoice(); done = false; stopping = false; prev = []; cur = []; chunks = []; mr = null; heardAny = false; empties = 0; lastErr = ""; t0 = Date.now(); ui(true); startRec();
      if (soloMic()) return;
      try {                                               // his own voice, to replay in the bubble (Chrome / Android / desktop)
        if (w.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
          if (done) { st.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = st; try { mr = new MediaRecorder(st); mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); }; mr.start(); } catch (e) { mr = null; }
        }).catch(function () {});
      } catch (e) {}
    }
    S.micGo = function () { if (!on) begin(); };
    /* 31g: ⏹️ keeps listening ~1.2 s (the end of his sentence, the recogniser's last words), then stops and waits for its last result */
    b.onclick = function () {
      S.unlocked = true;
      if (stopping) return;
      if (on) { stopping = true; b.innerHTML = "⏳"; setTimeout(function () { on = false; try { rec && rec.stop(); } catch (e) {} setTimeout(finish, 1500); stopping = false; }, 1200); }
      else begin();
    };
  }
  /* nothing heard: the first time «جرّب كمان مرّة»; the second time no loop — 🔁 عيد / ✍️ اكتب + 3 answers to pick from */
  function deaf() {
    S.deaf = (S.deaf | 0) + 1;
    if (S.deaf < 2) { pBubble("ما سمعتك منيح 🙉 جرّب كمان مرّة (قرّب التلفون شوي) أو اكتبلي ✍️", null); return; }
    pBubble("الظاهر الصوت مش عم يوصلني منيح اليوم 🙉 ولا يهمّك — اختار جواب أو اكتبلي:", null);
    var Q = S.cur, ch = [{ t: "🔁 عيد", f: function () { clearQr(); S.micGo && S.micGo(); } }, { t: "✍️ اكتب", f: function () { clearQr(); var i = $("#dsin"); if (i) try { i.focus(); } catch (e) {} } }];
    picks(Q).forEach(function (o) { ch.push({ t: clip(o, 48), f: function () { send(o); } }); });
    qr(ch);
  }
  function picks(Q) {                                      // 3 answers to tap: the right one + 2 of the bank's wrong ones, mixed
    if (!Q) return [];
    if (Q.kind === "m") { var o = [Q.opts[Q.a]]; Q.opts.forEach(function (x, i) { if (i !== Q.a && o.length < 3) o.push(x); }); return o.sort(function (x, y) { return hash(x + Q.key) % 7 - hash(y + Q.key) % 7; }); }
    return ["ما بعرف 🤷"];
  }
  /* «ما فهمت» (Abdullah 6:44 PM: «ايه شو لبدك ياه ما فهمت» was graded wrong): never graded — the partner explains the question again,
     simpler, with what to look at (the numbers / terms of the question itself, never the answer), then waits again; the 2nd time + chips */
  var CONF = /(ما\s*(ب?)فهم(ت|تو|تها|ت السؤال)?|مش\s*فا?هم|مو\s*فاهم|ما\s*فهمتش|شو\s*(ل)?قصدك|شو\s*(ل|لـ)?بد+ك|شو\s*بدّك|وض(ّ)?ح(لي|ي|ها|و)?(\s|$|[!?؟.])|كيف\s*يعني|مش\s*واضح|pardon|comprends\s*pas|compris\s*pas|j'ai\s*pas\s*compris|explique|^\s*[?؟]+\s*$|^\s*(شو|ايش|إيش|شو يعني)\s*[?؟]*\s*$)/i;
  function confused(t) { t = String(t || ""); return CONF.test(t) || /شو\s*(يعني|قصدك)\s*[?؟!.]*\s*$/.test(t); }
  function terms(txt) {                                    // what to look at: numbers with their names, French/English terms of the question
    var out = [], m, re = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ₀-₉0-9'’.\-]*(?:\s*[=:]?\s*\d+[.,]?\d*\s*(?:%|mmHg|mEq\/L|mg|ml|kg|°C?)?)?|\d+[.,]?\d*\s*(?:%|mmHg|mEq\/L|mg|ml|kg|°C?|سنة|سنين|ساعة|ساعات|يوم|أيام)?)/g;
    while ((m = re.exec(txt))) { var x = m[1].trim(); if (x.length > 1 && out.indexOf(x) < 0 && !/^(et|de|la|le|les|du|des|un|une)$/i.test(x)) out.push(x); if (out.length >= 4) break; }
    return out;
  }
  function clarify(Q, T) {
    S.conf = (S.conf | 0) + 1;
    var stem = (T && T.kind !== "ask" ? stems(Q)[T.wi || 0] : Q.q).replace(/\n[\s\S]*/, ""), tm = terms(stem), h, k = T ? T.kind : "ask";
    var open0 = ["أوكي خلّيني وضّحلك 😄", "ولا يهمّك، بقولها بطريقة تانية 😄", "معك حق، سؤالي كان ملخبط شوي 😅"][S.conf % 3];
    if (Q.kind === "l") {
      var n = Q.items.length, f0 = Q.items[0] || "";
      if (k === "fill") h = "بدّي ياك تكمّل الليستة: شو ناقص من «" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + "؟ بقيان " + (n - Math.min(2, n - 1)) + " أشياء.";
      else if (k === "wow") h = "قلتلك شي عرفته عن «" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + " — إنت شو بتعرف كمان عنها؟ قلّي ولو شغلة وحدة.";
      else if (k === "opin") h = "بس بدّي رأيك: من «" + Q.lab + "» تبع " + (Q.head || "الدرس") + "، شو أهم شغلة لازم الممرّض ما ينساها؟";
      else h = "يعني عدّدلي «" + Q.lab + "»" + (Q.head ? " تبع " + Q.head : "") + " — بالدرس في " + n + " أشياء، قلّي يلّي بتتذكّرهن ولو مش كلّن.";
      h += " تلميح: أوّل وحدة بتبلّش بـ «" + clip(f0.replace(/[()«»]/g, ""), 3).replace("…", "") + "…» 😉";
    } else {
      if (k === "oops") h = "أنا قلت إنّو جواب «" + clip(stem, 140) + "» هو «" + ((T.bad && (T.bad.opt || T.bad.kp.text)) || "") + "». إنت شو بتقول: معي حق ولا لأ؟ وإذا لأ، شو الصح؟";
      else if (k === "tf") h = "يعني: هل «" + T.op + "» هو الجواب الصح لهالسؤال؟ كبوس ✅ صح أو ❌ غلط.";
      else h = "خبرني بالمختصر: " + clip(stem, 170);
      if (tm.length) h += " — ركّز على: " + tm.join("، ") + " 👀";
    }
    pBubble(esc(open0) + '<div class="say">' + frWrap(h) + "</div>", null, "cl");
    mood("think");
    var ch = [{ t: "💡 تلميح", f: hint }];
    if (T && T.kind === "tf") ch = [{ t: "✅ صح", f: function () { send("صح ✅"); } }, { t: "❌ غلط", f: function () { send("غلط ❌"); } }];
    else if (Q.kind === "m" && (S.conf >= 2 || !tm.length || k === "oops")) picks(Q).forEach(function (o) { ch.push({ t: clip(o, 48), f: function () { send(o); } }); });
    ch.push({ t: "⏭️ الجاي", f: skip });
    qr(ch);
  }
  function sendVoice(v) {
    if (!S || !S.cur) return; clearQr(); stopVoice();
    var x = add('<div class="vrow"><button type="button" class="vb"' + (v.url ? "" : " disabled") + ' aria-label="اسمع">' + (v.url ? "▶️" : "🎤") + '</button><span class="vw" aria-hidden="true">' + bars(String(v.dur) + v.raw, 24) + '</span><span class="vd">' + fmt(v.dur) + "</span></div>" +
      (v.url ? "" : '<small class="vn">🎤 رسالة صوتية</small>') + '<button type="button" class="heardb">شو سمعت؟</button><div class="heard" hidden>' + esc(v.raw || "—") + '</div><span class="t">' + hm() + " ✓✓</span>", "m u hv");
    var vb = x.querySelector(".vb"); if (v.url) vb.onclick = function () { if (PLAYBTN === vb) { stopVoice(); return; } playList([v.url], vb); };
    x.querySelector(".heardb").onclick = function () { var h = x.querySelector(".heard"); h.hidden = !h.hidden; };
    if (!v.heard) { typing(600, deaf); return; }
    S.deaf = 0;
    judgeAndReply(v.heard, 650);
  }
  function boot() {
    var root = app(); if (!root) return;
    var day = today(), st = state();
    S = { day: day, p: partner(day), snd: st.snd !== 0, unlocked: false, okAll: 0, touch: "ontouchstart" in w };
    var id = (location.hash.match(/l=([a-z]+:[a-z0-9]+)/) || [])[1];
    if (!id || !lessonInfo(id)) id = pickLesson(day, st, true);
    root.innerHTML = '<div class="dsapp"><div class="hd" id="dshd"></div><div class="ch" id="dsch" aria-live="polite"><div class="dv">اليوم · ' + hm() + '</div></div>' +
      '<form class="ib" id="dsform" autocomplete="off"><button type="button" class="mic" id="dsmic" aria-label="احكي">🎤</button><input class="in" id="dsin" type="text" dir="auto" placeholder="اكتب جوابك أو احكي 🎤…" aria-label="جوابك" enterkeyhint="send"><button class="go" type="submit" aria-label="ابعت">↑</button></form></div>';
    $("#dsform").onsubmit = function (e) { e.preventDefault(); S.unlocked = true; var i = $("#dsin"), v = i.value; i.value = ""; send(v); };
    mic();
    var un = function () { S.unlocked = true; }; d.addEventListener("touchend", un, true); d.addEventListener("click", un, true); d.addEventListener("keydown", un, true);
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
