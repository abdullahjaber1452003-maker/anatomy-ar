/* ✍️ «اشرحلي بكلامك» — explain a lesson part in your own words (approved by Abdullah, Nov 6 2026; the last item of the «smarter teaching» queue).
   Where: a «✍️ اشرحلي بكلامك» button in the end row of EVERY lesson part (beside «📝 كويز هالجزء», assets/retain.js row()) and in every branch
   preview of 🗺️ mindmap.html. It opens a small inline box: «اشرح بكلامك: <section>», a textarea and «صحّحلي».
   Grading:
   • 👨‍🏫 Osman — the SAME worker endpoint the tutor / «علِّم عثمان» already call (POST {messages:[{role,text}], context: Osman.persona()} → {text}),
     signed-in only, sharing the 10-a-day «علِّم عثمان» count (nursin_teach_day_v1), 12 s timeout. He gets the section's own text from the page
     (or the map's preview) + its key terms + the answer, and must answer ✅ / ❌ / 💡 one tip from that text only.
   • 📋 Local (always runs; the only grade when signed out / offline / no answer in 12 s / quota used): the section's KEY TERMS are the 🗺️ mind
     map's own terms for that section (assets/mm-<subject>.js: branch leaves + its extra key terms, the same extraction), matched accent- and
     case-insensitively in Arabic and French (a «French (عربي)» term counts when either side is named). score = % of terms named →
     «✅ ذكرت: …», «❌ نسيت: …» (max 4), level «ممتاز ≥75 / منيح ≥50 / بدها مراجعة», «📖 ارجع للجزء». Nothing is written here.
   • The last score per section is kept (nursin_explain_v1); a score under 50% puts up to 3 of that part's questions (assets/partq-data.js,
     else the lesson's) into the spaced review (assets/srs.js NursinSRS.add) and marks the lesson weak (NursinRet.apply). No new Firestore
     traffic, no ad while a box is open (html.rton hides the page's ad units). ES2017-safe (iOS 12). */
(function (w, d) {
  var V = "20261030q", API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/";
  var KEY = "nursin_explain_v1", TK = "nursin_teach_day_v1", TMAX = 10, TIMEOUT = 12000, SNIP = 2200, MAXK = 10, LOW = 50;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { var S = w.NursinSRS; if (S && S.today) try { return S.today(); } catch (e) {} return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }

  /* ---------------- matching (pure; tests run it in node) ---------------- */
  var STOP = {};
  ("من في على الى الي إلى عن مع او أو و ثم هو هي هم هيدا هيدي هاد هاي هذا هذه ذلك تلك التي الذي اللي يلي لي له لها كل بعض اي أي اذا إذا لما ما لا لم لن قد كان كانت يكون تكون بين عند فيه فيها منه منها حتى لكن بس كمان كتير شي يعني " +
   "les des une dans pour par avec sur qui que aux est sont pas plus son ses leur elle ils elles cette ces entre comme mais donc car tout tous tres etre avoir fait faire peut doit the and")
    .split(" ").forEach(function (x) { if (x) STOP[fold(x)] = 1; });
  function fold(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[àâäá]/g, "a").replace(/[éèêë]/g, "e").replace(/[îïí]/g, "i").replace(/[ôöó]/g, "o").replace(/[ùûüú]/g, "u").replace(/ç/g, "c")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); });
  }
  function norm(s) { return fold(s).replace(/[^a-z0-9\u0621-\u064A]+/g, " ").replace(/\s+/g, " ").trim(); }
  function stem(t) {
    if (/[\u0621-\u064A]/.test(t)) { t = t.replace(/^(وال|بال|لل|كال|فال|ال)(?=..)/, ""); if (t.length > 4) t = t.replace(/(ات|ين|ون|يه|ها|هم)$/, ""); return t; }
    return t.length > 4 ? t.replace(/(s|x)$/, "") : t;
  }
  function tokens(s) { var out = [], seen = {}; norm(s).split(" ").forEach(function (t) { if (t.length < 3 || STOP[t] || /^\d+$/.test(t)) return; t = stem(t); if (t.length >= 3 && !STOP[t] && !seen[t]) { seen[t] = 1; out.push(t); } }); return out; }
  function same(a, b) { if (a === b) return true; var n = Math.min(a.length, b.length); return n >= 5 && a.slice(0, 5) === b.slice(0, 5); }
  /* a term's sides: the whole, the part outside (…), the part inside (…) and each side of « — » / « = » */
  function sides(term) {
    var t = String(term || "").replace(/^[^\wÀ-ÿ\u0600-\u06FF(]+/, ""), out = [t], m = /^(.*?)\(([^()]*)\)\s*$/.exec(t);
    if (m) { out.push(m[1]); out.push(m[2]); }
    t.split(/\s+[—–=]\s+|\s*[:：]\s+/).forEach(function (p) { if (p !== t) out.push(p); });
    return out.filter(function (s) { return tokens(s).length; });
  }
  function named(term, got) {
    return sides(term).some(function (s) {
      var ks = tokens(s), hit = 0, key = false;
      ks.forEach(function (k) { for (var i = 0; i < got.length; i++) if (same(k, got[i])) { hit++; if (/^[a-z]{6,}$/.test(k)) key = true; break; } });
      return hit >= (ks.length <= 2 ? ks.length : Math.ceil(ks.length * 0.5)) || key;
    });
  }
  function level(score) {
    return score >= 75 ? { k: "top", t: T("ممتاز", "Excellent (ممتاز)"), e: "🌟" } : score >= LOW ? { k: "ok", t: T("منيح", "Bien (منيح)"), e: "👍" } : { k: "low", t: T("بدها مراجعة", "À revoir (بدها مراجعة)"), e: "📖" };
  }
  /* grade(keyTerms, answer) → { score 0–100, got: [terms named], miss: [terms not named], n, level } */
  function grade(keys, text) {
    var seen = {}, K = [], got = tokens(text);
    (keys || []).forEach(function (k) { k = String(k || "").trim(); var f = norm(k); if (!f || seen[f] || !tokens(k).length) return; seen[f] = 1; K.push(k); });
    var ok = [], no = [];
    K.forEach(function (k) { (named(k, got) ? ok : no).push(k); });
    var score = K.length ? Math.round(100 * ok.length / K.length) : 0;
    return { score: score, got: ok, miss: no, n: K.length, level: level(score) };
  }

  /* ---------------- sections ---------------- */
  function NL() { return w.NLESSONS || {}; }
  function base(x) { return x.s + ":" + (x.l || x.t); }
  function pkey(x) { return base(x) + (x.p ? "#" + x.p : ""); }
  function partByKey(k) { var P = NL().parts || NL().list || []; for (var i = 0; i < P.length; i++) if (pkey(P[i]) === k) return P[i]; return null; }
  function partByHref(h) { var P = NL().parts || []; for (var i = 0; i < P.length; i++) if (P[i].href === h) return P[i]; return null; }
  function mmFile(s, cb) {
    var M = w.NMM || {}; if (M[s] || !d || !d.createElement) return cb();
    if (w.NursinMM && w.NursinMM.need) return w.NursinMM.need(s, cb);
    var sc = d.createElement("script"), done = false, fin = function () { if (!done) { done = true; cb(); } };
    sc.src = "assets/mm-" + s + ".js?v=" + V; sc.onload = fin; sc.onerror = fin; setTimeout(fin, 6000); (d.head || d.body).appendChild(sc);
  }
  /* a term that is one side of the section title's «عربي (Français)» pair gets the other side beside it (so the Arabic meaning shows and counts) */
  function pair(keys, title) {
    var m = /^[^\wÀ-ÿ\u0600-\u06FF]*(.*?)\s*\(([^()]*)\)\s*$/.exec(String(title || "").replace(/^.*?—\s*/, "")); if (!m) return keys;
    return keys.map(function (k) { var f = norm(k); return f && f === norm(m[2]) ? m[2] + " (" + m[1] + ")" : f && f === norm(m[1]) ? m[1] + " (" + m[2] + ")" : k; });
  }
  function branchTerms(b) { return (b[3] || []).map(function (y) { return y[0]; }).concat(b[4] || []); }
  /* the mind map's own terms for a lesson part (branches whose anchor is that part; a whole lesson = all its branches), max MAXK, spread across branches */
  function termsFor(x) {
    var raw = (((w.NMM || {})[x.s] || {})[base(x)] || []), mine = raw.filter(function (b) { return !x.p || b[1] === x.href; });
    var lists = mine.map(branchTerms), out = [], seen = {};
    for (var r = 0; out.length < MAXK && r < 12; r++) lists.forEach(function (L) { var t = L[r]; if (t && out.length < MAXK && !seen[t]) { seen[t] = 1; out.push(t); } });
    return out;
  }
  function domTerms(el) {                                          // a part the map has nothing for: its own bold terms / small headings
    var out = [], seen = {};
    if (el && el.querySelectorAll) [].forEach.call(el.querySelectorAll("h3,h4,h5,b,strong"), function (b) { var t = (b.textContent || "").replace(/\s+/g, " ").trim(); if (t.length >= 3 && t.length <= 70 && !seen[t] && out.length < MAXK) { seen[t] = 1; out.push(t); } });
    return out;
  }
  function textOf(el) {
    if (!el) return "";
    var c = el.cloneNode(true); [].forEach.call(c.querySelectorAll("button,script,style,.rtrow,.exbox,.askw,.lsk,.lqz,ins,.adsbygoogle"), function (n) { n.remove(); });
    return (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, SNIP);
  }

  /* ---------------- saving + spaced review ---------------- */
  function saved() { var o = lsGet(KEY); return o && typeof o === "object" ? o : {}; }
  function last(k) { return saved()[k] || null; }
  function save(k, score) {
    var o = saved(), p = o[k] || { n: 0 }; o[k] = { s: score, d: today(), n: (p.n | 0) + 1, b: Math.max(p.b | 0, score) };
    var ks = Object.keys(o); if (ks.length > 400) ks.sort(function (a, b) { return String(o[a].d).localeCompare(String(o[b].d)); }).slice(0, ks.length - 400).forEach(function (z) { delete o[z]; });
    lsSet(KEY, o); return o[k];
  }
  function loadScript(src, test) {
    return new Promise(function (ok) { if (test() || !d || !d.createElement) return ok(); var s = d.createElement("script"); s.src = src; s.onload = s.onerror = function () { ok(); }; setTimeout(ok, 8000); (d.head || d.body).appendChild(s); });
  }
  /* a low score → up to 3 questions of that part (else that lesson) into tomorrow's 🔁 review; resolves to how many went in */
  function toReview(sec) {
    var S = w.NursinSRS, RR = w.NursinRet;
    if (RR && RR.apply) try { RR.apply(sec.lid, "fbad"); } catch (e) {}
    if (!S || !S.add) return Promise.resolve(0);
    return loadScript("assets/partq-data.js?v=" + V, function () { return !!w.PARTQ; }).then(function () {
      var ids = (w.PARTQ && w.PARTQ.map && (w.PARTQ.map[sec.k] || w.PARTQ.map[sec.lid])) || [];
      if (ids.length) return ids;
      return loadScript("assets/quiz-data.js?v=" + V, function () { return !!w.QUIZ; }).then(function () {
        return (w.QUIZ || []).filter(function (q) { return RR && RR.ofQ ? RR.ofQ(q) === sec.lid : false; }).map(function (q) { return q.id; });
      });
    }).then(function (ids) {
      var pick = ids.filter(function (id) { return !(S.has && S.has(id)); }).slice(0, 3);
      return pick.length ? (S.add(pick) || pick.length) : 0;
    }, function () { return 0; });
  }

  /* ---------------- Osman ---------------- */
  function signed() { var G = w.NursinGate; return G ? !!G.signedIn : !!(d && d.documentElement && !d.documentElement.classList.contains("gl-out")); }
  function left() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; return o.d === day ? Math.max(0, TMAX - (o.n | 0)) : TMAX; }
  function use() { var day = new Date().toISOString().slice(0, 10), o = lsGet(TK) || {}; o = o.d === day ? o : { d: day, n: 0 }; o.n = (o.n | 0) + 1; lsSet(TK, o); }
  function canOsman() { return signed() && left() > 0 && !!w.fetch && !(w.navigator && w.navigator.onLine === false); }
  function prompt(sec, said) {
    return T("الطالب شرح بكلامو جزء «" + sec.title + "» من درس «" + sec.lesson + "» (اشرحلي بكلامك).\nنص الجزء من الموقع (قارن معو بس، وما تزيد ولا معلومة من برّا):\n" + sec.text +
      "\nالكلمات الأساسية: " + sec.keys.join(" · ") + "\n\nشرح الطالب: «" + said + "»\n\n" +
      "جاوب بالعربي اللبناني، قصير كتير (٣ أسطر)، بهالشكل بالظبط، بلا نجوم وبلا مقدمة:\n✅ صح: (شو ذكر صح)\n❌ ناقصك: (أهم شي ما ذكرو من النص)\n💡 نصيحة: (نصيحة وحدة)\nكل مصطلح فرنسي حط معناه بالعربي حدّو.",
      "L'étudiant explique avec ses mots la partie « " + sec.title + " » de la leçon « " + sec.lesson + " ».\nTexte de la partie (compare uniquement avec lui, n'ajoute rien d'extérieur) :\n" + sec.text +
      "\nTermes clés : " + sec.keys.join(" · ") + "\n\nExplication de l'étudiant : « " + said + " »\n\n" +
      "Réponds en français, très court (3 lignes), exactement ainsi, sans astérisques ni introduction :\n✅ Juste : (ce qu'il a dit de correct)\n❌ Il te manque : (le plus important qu'il n'a pas dit)\n💡 Conseil : (un seul conseil)\nMets le sens arabe à côté de chaque terme français.");
  }
  function osman(text) {
    var ctl = ("AbortController" in w) ? new w.AbortController() : null, timer = null;
    var cut = new Promise(function (_, no) { timer = setTimeout(function () { if (ctl) ctl.abort(); no(new Error("timeout")); }, TIMEOUT); });
    var call = w.fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text: text }], context: w.Osman && w.Osman.persona ? w.Osman.persona() : "" }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { var t = j && j.text; if (!t || typeof t !== "string" || /^\s*صار في مشكلة/.test(t) || (/مشغول|busy|high demand|overloaded/i.test(t) && t.length < 120)) throw new Error("busy"); return t.replace(/\*\*?/g, "").trim(); });
    return Promise.race([call, cut]).then(function (t) { clearTimeout(timer); return t; }, function (e) { clearTimeout(timer); throw e; });
  }
  /* judge(section, answer) → Promise<{ mode: "osman" | "local", osman: text|null, res, rev }> — local grade always, Osman on top when he answers */
  function judge(sec, said) {
    var res = grade(sec.keys, said), rec = save(sec.k, res.score);
    try { if (d && d.dispatchEvent && sec.lid) d.dispatchEvent(new CustomEvent("nursin:explain", { detail: { lid: sec.lid, score: res.score } })); } catch (e) {}   // 📅 29y: a ✍️ counts as the lesson's review (assets/revsched.js)
    var rev = res.n && res.score < LOW ? toReview(sec) : Promise.resolve(0);
    var ai = canOsman() ? (use(), osman(prompt(sec, said)).then(function (t) { return t; }, function () { return null; })) : Promise.resolve(null);
    return Promise.all([ai, rev]).then(function (a) { return { mode: a[0] ? "osman" : "local", osman: a[0], res: res, rev: a[1], rec: rec }; });
  }

  /* ---------------- the box ---------------- */
  function chips(list) { return list.map(function (t) { return esc(t); }).join(" · "); }
  function localHtml(res) {
    return '<p class="exok">' + esc(T("✅ ذكرت: ", "✅ Tu as cité (ذكرت) : ")) + (res.got.length ? chips(res.got.slice(0, 4)) + (res.got.length > 4 ? " +" + (res.got.length - 4) : "") : esc(T("ولا كلمة أساسية بعد", "aucun terme clé encore (ولا كلمة أساسية)"))) + "</p>" +
      (res.miss.length ? '<p class="exno">' + esc(T("❌ نسيت: ", "❌ Tu as oublié (نسيت) : ")) + chips(res.miss.slice(0, 4)) + (res.miss.length > 4 ? " +" + (res.miss.length - 4) : "") + "</p>" : "");
  }
  function osmanHtml(t) {
    return esc(t).split(/\n+/).map(function (l) { l = l.trim(); return l ? '<p class="' + (/^✅/.test(l) ? "exok" : /^❌/.test(l) ? "exno" : /^💡/.test(l) ? "extip" : "") + '">' + l + "</p>" : ""; }).join("");
  }
  function style() {
    if (!d || d.getElementById("excss")) return;
    var s = d.createElement("style"); s.id = "excss";
    s.textContent = ".exbox{margin:8px 0 4px;padding:10px 12px;border-radius:14px;border:1px solid rgba(15,118,110,.35);background:rgba(15,118,110,.06);font-size:14px;line-height:1.6;max-width:100%;box-sizing:border-box}" +
      ".exbox h4{margin:0 0 6px;font-size:15px;line-height:1.45}.exbox textarea{width:100%;box-sizing:border-box;min-height:84px;font:inherit;font-size:16px;padding:8px 10px;border-radius:10px;border:1px solid rgba(127,127,127,.4);background:var(--card,#fff);color:inherit}" +
      ".exrow{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px}.exrow small{opacity:.75;font-size:12px}.exres p{margin:4px 0}.exsc{font-weight:800}.exsc.low{color:#b91c1c}.exsc.ok{color:#b45309}.exsc.top{color:#15803d}" +
      ".exbar{height:5px;border-radius:9px;background:rgba(127,127,127,.2);overflow:hidden;margin:2px 0 6px}.exbar i{display:block;height:100%;background:currentColor}.exsm{font-size:12px;opacity:.7}" +
      ".exgo{font-weight:800;color:#0f766e;text-decoration:none}.exbtn{margin-top:6px}.exshake{border-color:#dc2626!important}" +
      ".exmic{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin-top:6px}.exmicb{min-width:44px;font-size:18px;line-height:1}.exmicb.rec{border-color:#dc2626;color:#b91c1c}" +
      ".exmicb .exdot{display:none;width:9px;height:9px;border-radius:50%;background:#dc2626;margin-inline-start:6px;vertical-align:middle;-webkit-animation:expulse 1s infinite;animation:expulse 1s infinite}.exmicb.rec .exdot{display:inline-block}" +
      ".exlang{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer}.exlang span{opacity:.5}.exlang span.on{opacity:1;font-weight:800;color:#0f766e}" +
      ".exmst{font-size:12px;opacity:.8}.exmhint{margin:6px 0 0;font-size:12px;opacity:.75}" +
      "@-webkit-keyframes expulse{0%,100%{opacity:1}50%{opacity:.2}}@keyframes expulse{0%,100%{opacity:1}50%{opacity:.2}}";
    (d.head || d.documentElement).appendChild(s);
  }
  /* 🎤 voice in «✍️ اشرحلي بكلامك» (Abdullah, Nov 7 2026 10:06 AM: «اشرحلي بكلامك فيو يكون فويس»). Where the browser has SpeechRecognition /
     webkitSpeechRecognition (iOS Safari 14.5+, Chrome) a 🎤 button records and writes the words live into the textarea (continuous, interim
     results; tap again to stop; red pulsing dot while recording); a chip «عربي / Français» picks the language (ar-LB, falling back to ar).
     He edits and presses «صحّحلي» as before — the grader is unchanged. Elsewhere (old iOS 12 phone…) one hint line: the keyboard's own
     🎤 dictation works in any textarea. No audio is uploaded or kept by the site; no new network call from here. */
  var MICK = "nursin_exmic_lang_v1";
  function SR() { return w.SpeechRecognition || w.webkitSpeechRecognition || null; }
  function micLang() { var v = null; try { v = w.localStorage && w.localStorage.getItem(MICK); } catch (e) {} return v === "fr" ? "fr" : "ar"; }
  function micCodes(l) { return l === "fr" ? ["fr-FR", "fr"] : ["ar-LB", "ar"]; }
  function micHtml() {
    if (!SR()) return '<p class="exmhint">' + esc(T("🎤 اكبس على المايك بالكيبورد وحكي", "🎤 Appuie sur le micro du clavier et parle (اكبس على المايك بالكيبورد وحكي)")) + "</p>";
    var l = micLang();
    return '<div class="exmic"><button class="btn sm exmicb" type="button" aria-pressed="false" aria-label="' + esc(T("سجّل بصوتك", "Dicter (سجّل بصوتك)")) + '">🎤<i class="exdot"></i></button>' +
      '<button class="exlang" type="button" aria-label="' + esc(T("لغة التسجيل", "Langue de la dictée (لغة التسجيل)")) + '"><span data-l="ar"' + (l === "ar" ? ' class="on"' : "") + '>عربي</span> / <span data-l="fr"' + (l === "fr" ? ' class="on"' : "") + ">Français</span></button>" +
      '<small class="exmst" aria-live="polite">' + esc(T("🎤 احكي وبيتكتب لحالو", "🎤 Parle, ça s’écrit tout seul (احكي وبيتكتب لحالو)")) + "</small></div>";
  }
  function micWire(box, ta) {
    var C = SR(), mb = box.querySelector(".exmicb"); if (!C || !mb) return null;
    var chip = box.querySelector(".exlang"), st = box.querySelector(".exmst"), lang = micLang(), rec = null, on = false, codes = [], ci = 0, base = "", got = false;
    function say(s) { if (st) st.textContent = s; }
    function ui(r) { on = r; mb.classList[r ? "add" : "remove"]("rec"); mb.setAttribute("aria-pressed", r ? "true" : "false"); }
    function paint() { [].forEach.call(chip.querySelectorAll("span"), function (s) { s.className = s.getAttribute("data-l") === lang ? "on" : ""; }); }
    function stop() { if (!on) return; ui(false); try { if (rec) rec.stop(); } catch (e) {} say(T("✋ وقّفت. صحّح الكتابة إذا بدك، وبعدين «صحّحلي»", "✋ Arrêté. Corrige le texte si besoin, puis «Corrige-moi»")); }
    function begin() {
      try { rec = new C(); } catch (e) { rec = null; }
      if (!rec) { say(T("🎤 اكبس على المايك بالكيبورد وحكي", "🎤 Appuie sur le micro du clavier et parle")); return; }
      rec.lang = codes[ci]; rec.continuous = true; rec.interimResults = true;
      try { rec.maxAlternatives = 1; } catch (e) {}
      rec.onresult = function (e) {
        var fin = "", tmp = "", R = e.results || [];
        for (var i = 0; i < R.length; i++) { var r = R[i], t = r && r[0] ? r[0].transcript : ""; if (r && r.isFinal) fin += t; else tmp += t; }
        got = true; ta.value = (base + fin + tmp).slice(0, 1500);
      };
      rec.onerror = function (e) {
        var c = e && e.error;
        if (c === "language-not-supported" && ci + 1 < codes.length) { ci++; try { rec.onend = null; rec.abort(); } catch (x) {} begin(); return; }
        ui(false);
        if (c === "not-allowed" || c === "service-not-allowed") say(T("🚫 ما في إذن للمايك. اسمحلو من إعدادات المتصفح، أو استعمل مايك الكيبورد", "🚫 Micro non autorisé. Autorise-le dans les réglages du navigateur, ou utilise le micro du clavier"));
        else if (c === "no-speech") say(T("🤫 ما سمعت شي، جرّب مرة تانية", "🤫 Je n’ai rien entendu, réessaie"));
        else if (c !== "aborted") say(T("⚠️ وقف التسجيل. جرّب مرة تانية أو مايك الكيبورد", "⚠️ La dictée s’est arrêtée. Réessaie ou utilise le micro du clavier"));
      };
      rec.onend = function () { if (on) { ui(false); say(got ? T("✋ وقّفت. صحّح الكتابة إذا بدك، وبعدين «صحّحلي»", "✋ Arrêté. Corrige le texte si besoin, puis «Corrige-moi»") : T("🎤 اكبس 🎤 وحكي", "🎤 Appuie sur 🎤 et parle")); } };
      try { rec.start(); ui(true); say(T("🔴 عم سجّل… اكبس 🎤 لتوقّف", "🔴 J’enregistre… appuie sur 🎤 pour arrêter")); }
      catch (e) { ui(false); say(T("⚠️ ما قدرت بلّش التسجيل. جرّب مايك الكيبورد", "⚠️ Impossible de démarrer. Utilise le micro du clavier")); }
    }
    mb.addEventListener("click", function () {
      if (on) return stop();
      codes = micCodes(lang); ci = 0; got = false;
      base = ta.value ? ta.value.replace(/\s+$/, "") + " " : "";
      begin();
    });
    chip.addEventListener("click", function () {
      lang = lang === "ar" ? "fr" : "ar"; try { w.localStorage.setItem(MICK, lang); } catch (e) {} paint();
      if (on) { stop(); }
    });
    [].forEach.call(box.querySelectorAll(".exsend,.exx"), function (b) { b.addEventListener("click", stop); });
    return { stop: stop, isOn: function () { return on; } };
  }
  function busy() { var n = d.querySelectorAll(".exbox").length; d.documentElement.classList[n ? "add" : "remove"]("rton"); }
  function open(host, sec, after) {
    style();
    var old = null, kids = host.children || [];
    for (var i = 0; i < kids.length; i++) if (kids[i].className === "exbox" && kids[i].getAttribute("data-k") === sec.k) old = kids[i];
    if (old) { old.remove(); busy(); return null; }
    var box = d.createElement("div"), L = last(sec.k);
    box.className = "exbox"; box.setAttribute("data-k", sec.k);
    box.innerHTML = "<h4>✍️ " + esc(T("اشرح بكلامك: ", "Explique avec tes mots (اشرح بكلامك) : ")) + esc(sec.title) + "</h4>" +
      '<textarea rows="4" maxlength="1500" placeholder="' + esc(T("اكتب شو فهمت من هالجزء…", "Écris ce que tu as compris (اكتب شو فهمت)…")) + '"></textarea>' +
      micHtml() +
      '<div class="exrow"><button class="btn sm pri exsend" type="button">' + esc(T("صحّحلي", "Corrige-moi (صحّحلي)")) + "</button>" +
      (L ? "<small>" + esc(T("آخر مرة: ", "Dernière fois (آخر مرة) : ")) + L.s + "%</small>" : "") + '<button class="btn sm exx" type="button" aria-label="✕">✕</button></div><div class="exres" aria-live="polite"></div>';
    if (after && after.parentNode) after.parentNode.insertBefore(box, after.nextSibling); else host.appendChild(box);
    busy();
    var ta = box.querySelector("textarea"), out = box.querySelector(".exres"), btn = box.querySelector(".exsend");
    box.querySelector(".exx").addEventListener("click", function () { box.remove(); busy(); });
    micWire(box, ta);
    btn.addEventListener("click", function () {
      var said = ta.value.trim();
      if (said.length < 8) { ta.classList.add("exshake"); setTimeout(function () { ta.classList.remove("exshake"); }, 600); try { ta.focus(); } catch (e) {} return; }
      if (!sec.keys.length) { out.innerHTML = '<p class="exsm">' + esc(T("ما في كلمات أساسية لهالجزء بعد.", "Pas encore de termes clés pour cette partie (ما في كلمات أساسية).")) + "</p>"; return; }
      btn.disabled = true; out.innerHTML = '<p class="exsm">' + esc(canOsman() ? T("⏳ عثمان عم يصحّح…", "⏳ Osman corrige (عثمان عم يصحّح)…") : T("⏳ عم صحّح…", "⏳ Correction (عم صحّح)…")) + "</p>";
      judge(sec, said).then(function (r) {
        btn.disabled = false;
        var lv = r.res.level;
        out.innerHTML = '<p class="exsc ' + lv.k + '">' + lv.e + " " + r.res.score + "% · " + esc(lv.t) + '</p><div class="exbar ' + lv.k + '" style="color:inherit"><i style="width:' + r.res.score + '%"></i></div>' +
          (r.osman ? osmanHtml(r.osman) + '<p class="exsm">' + esc(T("👨‍🏫 تصحيح عثمان", "👨‍🏫 Correction d’Osman (تصحيح عثمان)")) + "</p>" : localHtml(r.res) + '<p class="exsm">' + esc(T("📋 تصحيح تلقائي من كلمات الجزء الأساسية", "📋 Correction automatique avec les termes clés (تصحيح تلقائي)")) + "</p>") +
          (r.rev ? '<p class="exsm">' + esc(T("🔁 زدت " + r.rev + " أسئلة من هالجزء لمراجعة بكرا", "🔁 " + r.rev + " question(s) ajoutée(s) à la révision de demain (مراجعة بكرا)")) + "</p>" : "") +
          '<div class="exrow"><a class="exgo" href="' + esc(sec.href) + '">' + esc(T("📖 ارجع للجزء", "📖 Revoir la partie (ارجع للجزء)")) + "</a></div>";
        var bar = out.querySelector(".exbar"); if (bar) bar.style.color = lv.k === "top" ? "#15803d" : lv.k === "ok" ? "#b45309" : "#b91c1c";
      }, function () { btn.disabled = false; });
    });
    try { ta.focus({ preventScroll: true }); } catch (e) {}
    return box;
  }
  /* sections: a lesson part (by its «كويز هالجزء» key) and a 🗺️ map branch */
  function partSection(k, cb) {
    var x = partByKey(k); if (!x) return cb(null);
    mmFile(x.s, function () {
      var a = x.href.split("#")[1], el = a && d.getElementById(a), keys = termsFor(x);
      if (!keys.length) keys = domTerms(el);
      keys = pair(keys, x.n);
      cb({ k: k, lid: base(x), title: (x.p ? T("الجزء ", "Partie ") + x.p + " — " : "") + x.n, lesson: x.n, href: x.href, keys: keys, text: textOf(el) || keys.join(" · ") });
    });
  }
  function branchSection(id, i) {
    var M = w.NursinMM, m = M && M.map ? M.map(id) : null, b = m && m.b[i]; if (!b) return null;
    var raw = ((((w.NMM || {})[m.s] || {})[id]) || [])[i] || [], x = partByHref(b.h), keys = pair(branchTerms(raw).slice(0, MAXK), m.n);
    return { k: (x ? pkey(x) : id) + "~" + i, lid: id, title: b.t, lesson: m.n, href: b.h, keys: keys, text: (b.x + "\n" + keys.join(" · ")).slice(0, SNIP) };
  }
  function boot() {
    d.addEventListener("click", function (e) {
      var t = e.target, a = t && t.closest ? t.closest("[data-ex],[data-exm]") : null; if (!a) return;
      e.preventDefault();
      if (a.hasAttribute("data-ex")) {
        var row = a.closest(".rtrow") || a.parentNode;
        partSection(a.getAttribute("data-ex"), function (sec) { if (sec) open(row.parentNode, sec, row); });
      } else {
        var mp = a.closest(".mmap"), sec = mp && branchSection(mp.getAttribute("data-mmid"), +a.getAttribute("data-exm"));
        if (sec) open(a.parentNode, sec, a);
      }
    });
  }
  w.NursinEx = { V: V, KEY: KEY, LOW: LOW, TIMEOUT: TIMEOUT, fold: fold, tokens: tokens, sides: sides, named: named, grade: grade, level: level, pair: pair, termsFor: termsFor,
    save: save, last: last, toReview: toReview, judge: judge, prompt: prompt, osman: osman, canOsman: canOsman, localHtml: localHtml, partSection: partSection, branchSection: branchSection, open: open, SR: SR, micHtml: micHtml, micWire: micWire, micCodes: micCodes, MICK: MICK };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, typeof document !== "undefined" ? document : null);
