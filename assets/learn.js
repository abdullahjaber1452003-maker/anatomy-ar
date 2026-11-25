/* 📖 «وضع التعلّم» — the lesson part paragraph by paragraph, a question after each one, then «🏁 كويز شامل» — 31f (Abdullah, Nov 8 2026
   7:31 + 7:34 PM: «بالمسار محطوط كمّل درس الجودة، بس ما بدي فوت عالدرس. بدي يطلع فقرة فقرة من الجزء وكل فقرة كويز عليها متل ما منحل كويز،
   وبالآخر كويز شامل، بدل ما اضطر فوت عالدرس وقاعد اقرأه»).
   learn.html?u=<the part's href, e.g. quality.html#q2-p3> — opened by «🧭 مسار اليوم» (assets/home.js inlineHref) in the path sheet.
   • The text is the lesson's OWN text, verbatim: the lesson page is loaded in a hidden same-origin frame (?embed=1: no ads, no tours, no
     popups), its ✂️ part is read once drawn (assets/lessons.js splitPage) and cut into paragraphs at its own blocks (headings and labels stay
     with the block they introduce; nothing is rewritten). Pure: blocks() / chunk() (tests).
   • One question per paragraph: the part's bank questions (assets/partq-data.js PARTQ.map, else the lesson's) matched to the paragraph whose
     words they share most (rare words / French terms weigh more) — today's wording (NURSIN_QV). A paragraph no bank question fits gets a
     grounded one built from ITS text only: a French term to fill in, an item of its list, or one of its own words (distractors only from the
     same part, the right answer never the longest, its position spread a/b/c). Pure: mapQs() / gen() / plan() (tests).
   • Wrong → the paragraph comes back with the words highlighted + the explanation (+ «ليش غلط؟» for a bank question); every question comes back
     in «🏁 كويز شامل» (another wording when the question has one). Answers feed NursinSRS / Weak / NURSIN_QV / «nursin:answer» like the quiz;
     a generated question that was missed sends the bank question nearest to its paragraph to 🔁. The end: NursinStudy.activity("quiz"),
     the part marked read (the path step ticks ✅ — «nursin:goal-done» goes up to home), and «كمّل من وين وقفت» moves to the next part.
   • Where he stopped: localStorage nursin_learn_v1 {href: {i, ph, ans, fin, ts}} (≤ 30 parts). No ads on learn.html. ES5 (iOS 12). */
(function (w, d) {
  "use strict";
  var K = "nursin_learn_v1", MIN = 200, MAX = 720, BIG = 900, L3 = "abc";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }

  /* ---------------- text ---------------- */
  var ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&#160;": " " };
  function textOf(h) { return String(h || "").replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div)[^>]*>/gi, " $& ").replace(/<[^>]+>/g, " ").replace(/&[#a-z0-9]+;/gi, function (m) { return ENT[m] || " "; }).replace(/\s+/g, " ").trim(); }
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  }
  var STOP = {};
  ("في من على الى عن مع او و ثم ان انه انها هو هي هم هذا هذه ذلك تلك التي الذي الذين ما لا لم لن قد كل بعض اي غير بين عند حتى اذا كان كانت يكون تكون " +
   "بس شو هيدا هيدي هول يلي اللي فيه فيها منه منها عليه عليها لها له بها به هناك هنا ايضا كما مثل خلال حسب نحو ضمن دون الا وهو وهي " +
   "le la les de des du un une et ou en au aux par pour sur dans avec est sont qui que ce ces se sa son ses il elle ils on pas plus the of and to in is").split(" ").forEach(function (x) { STOP[x] = 1; });
  function toks(s) {
    var out = [], a = norm(textOf(s)).split(/[^a-z0-9\u0621-\u064A]+/);
    for (var i = 0; i < a.length; i++) {
      var t = a[i]; if (!t || STOP[t]) continue;
      if (/^[\u0621-\u064A]/.test(t)) { if (t.length > 4 && /^(ال|وال|بال|لل|كال|فال)/.test(t)) t = t.replace(/^(وال|بال|كال|فال|ال|لل)/, ""); if (t.length > 4 && /(ات|ين|ون)$/.test(t)) t = t.slice(0, -2); if (t.length > 4 && /ه$/.test(t)) t = t.slice(0, -1); }
      else if (t.length > 4 && /s$/.test(t)) t = t.slice(0, -1);
      if (t.length < 3 || STOP[t]) continue;
      out.push(t);
    }
    return out;
  }
  function isLat(t) { return /^[a-z]/.test(t); }

  /* ---------------- blocks: the top-level elements of a lesson body (string, so the tests run without a DOM) ---------------- */
  var VOID = { br: 1, img: 1, hr: 1, input: 1, source: 1, wbr: 1, meta: 1, link: 1, col: 1, area: 1, embed: 1, track: 1 };
  function blocks(html) {
    var out = [], s = String(html || ""), re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>|<!--[\s\S]*?-->/g, m, depth = 0, start = 0, tag = "", open = "", last = 0;
    function textBlock(a, b) { var t = s.slice(a, b); if (textOf(t)) out.push({ tag: "#text", open: "", html: t, text: textOf(t) }); }
    while ((m = re.exec(s))) {
      if (m[0].indexOf("<!--") === 0) continue;
      var close = m[1] === "/", nm = m[2].toLowerCase(), self = m[3] === "/" || VOID[nm];
      if (depth === 0) {
        if (close) continue;
        textBlock(last, m.index);
        if (self) { out.push({ tag: nm, open: m[0], html: m[0], text: "" }); last = re.lastIndex; continue; }
        depth = 1; start = m.index; tag = nm; open = m[0]; continue;
      }
      if (self) continue;
      if (!close) { depth++; continue; }
      depth--;
      if (depth === 0) { var h = s.slice(start, re.lastIndex); out.push({ tag: tag, open: open, html: h, text: textOf(h) }); last = re.lastIndex; }
    }
    if (depth === 0) textBlock(last, s.length); else { var h2 = s.slice(start); out.push({ tag: tag, open: open, html: h2, text: textOf(h2) }); }
    return out;
  }
  function inner(b) { var h = b.html, i = h.indexOf(">"), j = h.lastIndexOf("</"); return i > -1 && j > i ? h.slice(i + 1, j) : ""; }
  // not lesson text: the quiz links / buttons / widgets the page adds around a lesson
  function junk(b) {
    if (/^(script|style|button|summary|noscript|iframe|svg|form|input|select|textarea|nav|template)$/.test(b.tag)) return true;
    if (/class="[^"]*\b(lqz|pqz|partq|adx|ad-slot|glk-card|glk-ad|glk-or|nlrow|rtrow|oxq|wxb|askslot|nbtn|hlbar|ntbar|rvbar|lsum|lnav|lmore|tbtn|cvbar|ptool|lfoot)\b/.test(b.open)) return true;
    if (/\bhidden\b|aria-hidden="true"|data-learnskip/.test(b.open)) return true;
    if (!b.text && !/^(img|table|figure|svg)$/.test(b.tag) && !/<img\b/i.test(b.html)) return true;
    return false;
  }
  function isLead(b) {   // a heading / a label: it goes WITH the block after it
    if (/^h[1-6]$/.test(b.tag)) return true;
    if (/class="[^"]*\bqlab\b/.test(b.open)) return true;
    return b.tag !== "ul" && b.tag !== "ol" && b.tag !== "table" && b.text.length <= 70 && /[:：]\s*$/.test(b.text);
  }
  function flat(bl) {   // a big wrapper (a card, a section) is read as its own blocks
    var out = [];
    bl.forEach(function (b) {
      if (junk(b)) return;
      if (/^(div|section|article|details|blockquote|main|aside|figure)$/.test(b.tag) && b.text.length > BIG) {
        var kids = blocks(inner(b)); if (kids.filter(function (k) { return !junk(k); }).length >= 2) { flat(kids).forEach(function (k) { out.push(k); }); return; }
      }
      out.push(b);
    });
    return out;
  }
  /* paragraphs: consecutive blocks, ≈ MIN–MAX letters each; a heading / label opens a new paragraph when the current one is long enough */
  function chunk(bl) {
    var B = flat(bl), out = [], cur = null, lead = [];
    function close() { if (cur && cur.text) out.push(cur); cur = null; }
    function add(b) {
      if (!cur) cur = { html: "", text: "", head: "", bt: [] };
      cur.html += b.html; cur.text = (cur.text + " " + b.text).trim(); cur.bt.push(b.text);
      if (/^h[1-6]$/.test(b.tag) || /qlab/.test(b.open)) cur.head = cur.head || b.text;
    }
    B.forEach(function (b) {
      if (isLead(b)) {
        if (cur && cur.text.length >= MIN * 0.6 && !lead.length) close();
        lead.push(b); return;
      }
      if (cur && cur.text.length >= MIN && cur.text.length + b.text.length > MAX) close();
      if (cur && cur.text.length >= MIN && lead.length) close();
      lead.forEach(add); lead = []; add(b);
      if (cur.text.length >= MAX) close();
    });
    if (lead.length) { lead.forEach(add); lead = []; }
    close();
    // a tiny last paragraph joins the one before
    if (out.length > 1 && out[out.length - 1].text.length < MIN / 3) { var z = out.pop(), y = out[out.length - 1]; y.html += z.html; y.text += " " + z.text; y.bt = y.bt.concat(z.bt); }
    out.forEach(function (p, i) { p.i = i; });
    return out;
  }

  /* ---------------- questions ---------------- */
  function idf(paras) {
    var df = {}, n = paras.length;
    paras.forEach(function (p) { var seen = {}; (p.tk || (p.tk = toks(p.html))).forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    return function (t) { return df[t] ? Math.log(1 + n / df[t]) * (isLat(t) ? 1.6 : 1) : 0; };
  }
  function qText(q) { return [q.q0 || q.q, (q.o0 || q.o || [])[q.a], q.x || ""].join(" "); }
  function score(q, p, W) {
    var set = {}, s = 0, n = 0; (p.tk || (p.tk = toks(p.html))).forEach(function (t) { set[t] = 1; });
    var seen = {}; toks(qText(q)).forEach(function (t) { if (seen[t]) return; seen[t] = 1; n++; if (set[t]) s += W(t); });
    return n ? s / Math.sqrt(n) : 0;
  }
  // each paragraph → the bank question that fits it best (each question used once; below TH = none)
  function mapQs(paras, bank, TH) {
    TH = TH == null ? 0.9 : TH;
    var W = idf(paras), pairs = [], out = paras.map(function () { return null; }), used = {};
    (bank || []).forEach(function (q, qi) { if (!q || !q.o || q.a == null) return; paras.forEach(function (p, pi) { var sc = score(q, p, W); if (sc >= TH) pairs.push([sc, qi, pi]); }); });
    pairs.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    pairs.forEach(function (x) { if (out[x[2]] || used[x[1]]) return; out[x[2]] = bank[x[1]]; used[x[1]] = 1; });
    return out;
  }
  function sentences(text) { if (text && text.bt) return [].concat.apply([], text.bt.map(sentences)); return String(text).split(/(?:[.!؟?؛;]\s+|\s[•·]\s|\n)/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length >= 20 && s.length <= 240; }); }
  var LATRE = /[A-Za-zÀ-ÖØ-öø-ÿŒœ][A-Za-zÀ-ÖØ-öø-ÿŒœ'’\-]{2,}(?:\s+(?:de|du|des|d'|la|le|à|et|en|l')?\s*[A-Za-zÀ-ÖØ-öø-ÿŒœ][A-Za-zÀ-ÖØ-öø-ÿŒœ'’\-]{2,}){0,2}/g;
  var LSTOP = /^(le|la|les|des|une|est|sont|pour|avec|dans|par|qui|que|the|and|ou|et)$/i;
  function latTerms(text) { var m = String(text).match(LATRE) || [], out = [], seen = {}; m.forEach(function (t) { t = t.replace(/[\-']+$/, "").trim(); if (t.length < 4 || LSTOP.test(t) || seen[t.toLowerCase()]) return; seen[t.toLowerCase()] = 1; out.push(t); }); return out; }
  function items(html) { var m = String(html).match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || []; return m.map(textOf).filter(function (t) { return t.length >= 3 && t.length <= 70; }); }
  function arWords(text) { var m = String(text).match(/[\u0621-\u064A]{5,}/g) || [], out = [], seen = {}; m.forEach(function (t) { if (seen[t] || STOP[norm(t)] || /^(وال|بال|ال)?(هذه|التي|الذي|يجب|يمكن|حيث|عندما|وذلك|كذلك)$/.test(t)) return; seen[t] = 1; out.push(t); }); return out; }
  function has(text, t) { return norm(text).indexOf(norm(t)) > -1; }
  // the right answer never the longest, distractors of a near length, all different, none present in the paragraph
  function pickD(ans, pool, ptext, seed) {
    var c = [], seen = {}; seen[norm(ans)] = 1;
    pool.forEach(function (x) { var k = norm(x); if (seen[k] || has(ptext, x) || k.indexOf(norm(ans)) > -1 || norm(ans).indexOf(k) > -1) return; seen[k] = 1; c.push(x); });
    if (c.length < 2) return null;
    c.sort(function (a, b) { return Math.abs(a.length - ans.length) - Math.abs(b.length - ans.length) || (hash(a + seed) - hash(b + seed)); });
    var longer = c.filter(function (x) { return x.length > ans.length; });
    if (!longer.length) return null;
    var d1 = longer[0], n1 = norm(d1), d2 = c.filter(function (x) { var k = norm(x); return x !== d1 && k.indexOf(n1) < 0 && n1.indexOf(k) < 0; })[0];
    return d2 ? [d1, d2] : null;
  }
  function place(ans, ds, pos) { var o = ds.slice(0, 2); o.splice(pos, 0, ans); return { o: o, a: pos }; }
  function cut(s, t) { var i = norm(s).indexOf(norm(t)); if (i < 0) return null; return s.slice(0, i) + "____" + s.slice(i + t.length); }
  /* a question from THIS paragraph's text only. paras = the part's paragraphs (distractor pool), k = which form to try first (0, 1, 2…) */
  function gen(paras, pi, pos, k, key) {
    var p = paras[pi], text = p.text, others = paras.filter(function (x, j) { return j !== pi; }), seed = (key || "") + pi + ":" + (k | 0), tries = [];
    var S = sentences(p);
    // ① a French term of the paragraph
    tries.push(function () {
      var pool = [], ts = latTerms(text); others.forEach(function (o) { latTerms(o.text).forEach(function (t) { pool.push(t); }); });
      for (var i = 0; i < ts.length; i++) {
        var t = ts[(i + (k | 0)) % ts.length], s = S.filter(function (x) { return has(x, t) && x.length > t.length + 12; })[0]; if (!s) continue;
        var ds = pickD(t, pool, text, seed); if (!ds) continue; var q = cut(s, t); if (!q) continue;
        var pl = place(t, ds, pos); return { q: T("كمّل الفراغ من الفقرة: «", "Complète à partir du paragraphe (كمّل الفراغ) : « ") + q + T("»", " »"), o: pl.o, a: pl.a, src: s, hit: [t], form: "term" };
      }
      return null;
    });
    // ② an item of its list
    tries.push(function () {
      var mine = items(p.html), pool = []; if (mine.length < 2) return null;
      others.forEach(function (o) { items(o.html).forEach(function (t) { pool.push(t); }); });
      for (var i = 0; i < mine.length; i++) {
        var t = mine[(i + (k | 0) + hash(seed)) % mine.length], ds = pickD(t, pool.filter(function (x) { return mine.indexOf(x) < 0; }), text, seed); if (!ds) continue;
        var pl = place(t, ds, pos), hd = p.head && p.head.length >= 6 && !/[:：]\s*$/.test(p.head) ? p.head : "", sib = mine.filter(function (y) { return y !== t; })[(hash(seed) >>> 3) % (mine.length - 1)];
        var qq = hd ? T("حسب «" + hd + "»، شو من هول مذكور؟", "D'après « " + hd + " », lequel est cité ? (شو مذكور؟)") : T("بنفس القائمة مع «" + sib + "»، شو كمان مذكور؟", "Dans la même liste que « " + sib + " », lequel est aussi cité ? (شو كمان مذكور؟)");
        return { q: qq, o: pl.o, a: pl.a, src: t, hit: [t], form: "item" };
      }
      return null;
    });
    // ③ one of its own words
    tries.push(function () {
      var pool = [], mine = arWords(text).filter(function (t) { return !others.some(function (o) { return has(o.text, t); }); });
      others.forEach(function (o) { arWords(o.text).forEach(function (t) { if (!has(text, t)) pool.push(t); }); });
      for (var i = 0; i < mine.length; i++) {
        var t = mine[(i + (k | 0) + hash(seed)) % mine.length], s = S.filter(function (x) { return x.indexOf(t) > -1; })[0]; if (!s) continue;
        var ds = pickD(t, pool, text, seed); if (!ds) continue;
        var pl = place(t, ds, pos); return { q: T("كمّل الفراغ من الفقرة: «", "Complète à partir du paragraphe (كمّل الفراغ) : « ") + s.replace(t, "____") + T("»", " »"), o: pl.o, a: pl.a, src: s, hit: [t], form: "word" };
      }
      return null;
    });
    var order = [0, 1, 2]; for (var r = 0; r < (k | 0) % 3; r++) order.push(order.shift());
    for (var j = 0; j < order.length; j++) { var g = tries[order[j]](); if (g) { g.id = "lg-" + (key || "x") + "-" + pi + "-" + (k | 0); g.gen = 1; g.x = T("بالفقرة: «", "Dans le paragraphe : « ") + g.src + T("»", " »"); return g; } }
    // ④ the last resort: true / false on one of its sentences (always true: it is the lesson's own sentence)
    var s0 = S[0] || text.slice(0, 200);
    return { id: "lg-" + (key || "x") + "-" + pi + "-tf", gen: 1, form: "tf", q: T("صح ولا غلط؟ «", "Vrai ou faux ? (صح ولا غلط؟) « ") + s0 + T("»", " »"), o: [T("✅ صح", "✅ Vrai"), T("❌ غلط", "❌ Faux")], a: 0, src: s0, hit: [], x: T("هيدي الجملة نفسها من الفقرة.", "C'est la phrase même du paragraphe.") };
  }
  // positions a/b/c spread over the part: a different spot each paragraph, rotated by the part
  function posOf(key, i) { return (hash(key) + i) % 3; }
  /* the whole plan of a part: one question per paragraph (bank first, else generated) */
  function plan(paras, bank, key) {
    var m = mapQs(paras, bank);
    return paras.map(function (p, i) { return m[i] ? m[i] : gen(paras, i, posOf(key, i), 0, key); });
  }
  // «🏁 كويز شامل»: every paragraph's question again, in another wording where there is one, order mixed (seeded)
  function variant(q, paras, pi, key) {
    if (q.gen) { var g = gen(paras, pi, (posOf(key, pi) + 1) % 3, 1, key); return g.form === "tf" && q.form !== "tf" ? reshuffle(q, key) : g; }
    var Q = w.NURSIN_QV, ws = [{ q: q.q0 != null ? q.q0 : q.q, o: q.o0 || q.o }].concat((q.v || []).map(function (v) { return { q: v.q, o: v.o && v.o.length === (q.o0 || q.o).length ? v.o : (q.o0 || q.o) }; }));
    var cur = q.qvi | 0, j = ws.length > 1 ? (cur + 1) % ws.length : 0;
    if (FR() && Q) j = 0;
    var c = {}, k; for (k in q) if (Object.prototype.hasOwnProperty.call(q, k)) c[k] = q[k];
    c.q = ws[j].q; c.o = ws[j].o.slice(); c.vw = j !== cur ? 1 : 0; return c;
  }
  function reshuffle(q, key) { var c = {}, k; for (k in q) c[k] = q[k]; if (!q.o || q.o.length < 3) return c; var pos = (q.a + 1 + (hash(key) % 2)) % q.o.length, ans = q.o[q.a], ds = q.o.filter(function (x, i) { return i !== q.a; }); var pl = place(ans, ds, pos); c.o = pl.o; c.a = pl.a; return c; }
  function finalSet(qs, paras, key) {
    var out = qs.map(function (q, i) { var v = variant(q, paras, i, key); v._p = i; return v; });
    out.sort(function (a, b) { return hash(key + a._p) - hash(key + b._p); });
    return out;
  }

  function mapQsMulti(paras,bank,TH){TH=TH==null?0.9:TH;var W=idf(paras),out=paras.map(function(){return[];});(bank||[]).forEach(function(q){if(!q||!q.o||q.a==null)return;var bi=-1,bs=0;paras.forEach(function(p,pi){var sc=score(q,p,W);if(sc>bs){bs=sc;bi=pi;}});if(bi>=0&&bs>=TH&&out[bi].length<5)out[bi].push(q);});return out;}function planMulti(paras,bank,key){var m=mapQsMulti(paras,bank);return paras.map(function(p,i){var list=m[i].slice(),tg=Math.min(4,Math.max(2,Math.ceil((p.text||"").length/180))),seen={};list.forEach(function(q){seen[norm(q.q)]=1;if(q.o&&q.o[q.a])seen[norm(q.o[q.a])]=1;});for(var k=0;list.length<tg&&k<12;k++){var g=gen(paras,i,(posOf(key,i)+list.length)%3,k,key);if(!g)break;if(g.form==="tf"&&list.length>0)continue;var ak=norm(g.o[g.a]||""),qk=norm(g.q||"");if(seen[qk]||(ak&&seen[ak]))continue;seen[qk]=1;if(ak)seen[ak]=1;list.push(g);}if(!list.length)list.push(gen(paras,i,posOf(key,i),0,key));return list;});}function finalSetMulti(qSets,paras,key){var out=[],r,i,mx=Math.max(paras.length,12);for(r=0;out.length<mx&&r<4;r++){for(i=0;i<qSets.length&&out.length<mx;i++){if(qSets[i][r]){var v=variant(qSets[i][r],paras,i,key+":"+r);v._p=i;v._qi=r;out.push(v);}}}out.sort(function(a,b){return hash(key+a._p+":"+a._qi)-hash(key+b._p+":"+b._qi);});return out;} /* ---------------- where he stopped ---------------- */
  function st(u, all) { all = all || lsGet(K) || {}; var s = all[u]; return s && typeof s === "object" ? s : { i: 0, ph: "p", ans: {}, fin: {}, ts: 0 }; }
  function put(u, s, all) {
    all = all || lsGet(K) || {}; s.ts = Date.now(); all[u] = s;
    var ks = Object.keys(all); if (ks.length > 30) ks.sort(function (a, b) { return (all[a].ts || 0) - (all[b].ts || 0); }).slice(0, ks.length - 30).forEach(function (z) { delete all[z]; });
    lsSet(K, all); return all;
  }
  /* resume: the first paragraph not answered yet (or the final quiz / the end) */
  function resumeAt(s, n) {
    if (!s) return { i: 0, ph: "p" };
    if (s.ph === "done") return { i: n, ph: "done" };
    if (s.ph === "fin" || s.ph === "fq") return { i: n, ph: "fin", f: Object.keys(s.fin || {}).length };
    var i = Math.max(0, Math.min(n - 1, s.i | 0)); return { i: i, ph: (s.ans || {})[i] != null ? "a" : s.ph === "q" ? "q" : "p" };
  }

  var api = w.NursinLearn = { K: K, MIN: MIN, MAX: MAX, textOf: textOf, norm: norm, toks: toks, blocks: blocks, chunk: chunk, mapQs: mapQs, gen: gen, plan: plan, variant: variant, finalSet: finalSet, posOf: posOf, latTerms: latTerms, items: items, st: st, put: put, resumeAt: resumeAt, partOf: partOf, bankOf: bankOf, href: hrefFor };

  /* ---------------- the registry ---------------- */
  function NL() { return w.NursinLessons || null; }
  function partOf(u) {
    var N = NL(), P = N && N.parts ? N.parts : [], i, a = String(u || "").replace(/^\.?\//, ""), pg = a.split("#")[0].split("?")[0], an = a.split("#")[1] || "";
    for (i = 0; i < P.length; i++) if (P[i].href === pg + (an ? "#" + an : "")) return P[i];
    if (an) for (i = 0; i < P.length; i++) if (P[i].href === pg + "#" + an.replace(/-p\d+$/, "")) return P[i];   // an anchor the registry does not split → its lesson
    for (i = 0; i < P.length; i++) if (P[i].href.split("#")[0] === pg && !an) return P[i];
    return null;
  }
  function pkey(x) { var N = NL(); return N && N.key ? N.key(x) : x.s + ":" + (x.l || x.t) + (x.p ? "#" + x.p : ""); }
  function bankOf(x, Q, PQ) {
    Q = Q || w.QUIZ || []; PQ = PQ === undefined ? w.PARTQ : PQ; if (!x) return [];
    var by = {}; Q.forEach(function (q) { by[q.id] = q; });
    var ids = PQ && PQ.map ? (PQ.map[pkey(x)] || (!x.p ? PQ.map[x.s + ":" + (x.l || x.t)] : null)) : null;
    if (ids && ids.length) return ids.map(function (id) { return by[id]; }).filter(function (q) { return q && q.o && q.a != null; });
    return Q.filter(function (q) { return q && q.o && q.a != null && q.t === x.t && (!x.l || q.l === x.l); });
  }
  function hrefFor(u) { return "learn.html?u=" + encodeURIComponent(u); }

  if (!d || !d.getElementById) return;
  var root = null, S = null, U = "", X = null, paras = [], qs = [], qSets = [], fin = [], ctxKey = "";

  /* ---------------- the lesson text: the page itself, in a hidden frame ---------------- */
  function loadPart(x, cb) {
    var pg = x.href.split("#")[0], an = x.href.split("#")[1] || "", f = d.createElement("iframe"), t0 = Date.now(), done = false;
    f.setAttribute("aria-hidden", "true"); f.setAttribute("tabindex", "-1"); f.title = "lesson";
    f.style.cssText = "position:absolute;width:1px;height:1px;left:-9999px;top:0;border:0;opacity:0;pointer-events:none";
    f.src = pg + "?embed=1&learn=1" + (an ? "#" + an : "");
    function fin2(html) { if (done) return; done = true; clearInterval(tm); cb(html); setTimeout(function () { try { f.parentNode.removeChild(f); } catch (e) {} }, 50); }
    var last = -1, same = 0, tm = setInterval(function () {
      var D2 = null; try { D2 = f.contentDocument; } catch (e) {}
      if (!D2) { if (Date.now() - t0 > 25000) fin2(""); return; }
      var el = an ? D2.getElementById(an) : (D2.querySelector("main") || D2.body), wait = Date.now() - t0;
      if (el && (!an || el.tagName !== "DETAILS" || el.getAttribute("data-split") || wait > 2500 || !splitWanted(x))) {
        var b = el.querySelector(".tbody") || el, h = b.innerHTML || "";
        if (h.length && h.length === last) same++; else same = 0; last = h.length;
        if (h.length > 40 && same >= 2) fin2(h);
      }
      if (wait > 25000) fin2(el ? ((el.querySelector(".tbody") || el).innerHTML || "") : "");
    }, 200);
    (d.body || d.documentElement).appendChild(f);
  }
  function splitWanted(x) { var N = NL(); return !!(N && N.SPLIT && N.SPLIT[x.s + ":" + (x.l || x.t)]); }

  /* ---------------- the screen ---------------- */
  function snd(ok) {
    try {
      var C = w.AudioContext || w.webkitAudioContext; if (!C) return; var c = snd.c || (snd.c = new C()); if (c.state === "suspended" && c.resume) c.resume();
      (ok ? [660, 990] : [300, 220]).forEach(function (fq, i) { var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + i * 0.11; o.type = ok ? "sine" : "triangle"; o.frequency.value = fq; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.25); });
    } catch (e) {}
    try { if (!ok && navigator.vibrate) navigator.vibrate(60); } catch (e) {}
  }
  function title() { var N = NL(); try { return N && N.label ? N.label(X) : X.n; } catch (e) { return X.n; } }
  function subjName() { var N = NL(), sb = N && N.subjects ? N.subjects[X.s] : null; return sb ? T(sb.ar, sb.fr) : ""; }
  function head() {
    var n = paras.length, i = Math.min(S.i, n), fpc = S.ph === "fin" || S.ph === "done";
    var pct = fpc ? 100 : Math.round(((i + ((S.ans || {})[S.i] != null ? 1 : 0)) / Math.max(1, n)) * 100);
    return '<div class="lnhd"><div class="lnt"><small>📖 ' + T("وضع التعلّم", "Mode apprentissage (وضع التعلّم)") + " · " + esc(subjName()) + "</small><b>" + esc(title()) + "</b></div>" +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><a class="lnfull" href="learn.html">📚 ' + T("قائمة الدروس", "Liste") + '</a><a class="lnfull" href="' + esc(X.href) + '" target="_top">📄 ' + T("الدرس كامل", "Leçon complète") + "</a></div></div>" +
      '<div class="lnpg"><span class="lnbar"><i style="width:' + pct + '%"></i></span><span class="lnpn">' +
      (fpc ? "🏁 " + T("كويز شامل", "Quiz final (كويز شامل)") : T("فقرة " + (i + 1) + " من " + n, "Paragraphe " + (i + 1) + " sur " + n + " (فقرة)")) + "</span></div>";
  }
  function paraHtml(p, hit) {
    return '<article class="lnpara" dir="auto">' + (p.head && p.html.indexOf(p.head) < 0 ? "<h4>" + esc(p.head) + "</h4>" : "") + p.html + "</article>";
  }
  function optsHtml(q, picked) {
    return q.o.map(function (o, k) {
      var c = picked == null ? "" : k === q.a ? " ok" : k === picked ? " bad" : "";
      return '<button class="opt' + c + '" type="button" data-lk="' + k + '"' + (picked != null ? " disabled" : "") + '><span class="l" dir="ltr">' + L3.charAt(k) + "</span><span>" + o + "</span></button>";
    }).join("");
  }
  function fbHtml(q, k, inFinal) {
    var ok = k === q.a, h = (!ok && !inFinal ? '<p class="lnlock">🔒 ' + T("قفل الإتقان: لازم تعيد هالسؤال وتجاوبو صح لتفتح الفقرة الجاية.", "Verrou de maîtrise : il faudra réussir cette question pour continuer.") + '</p>' : '') + '<div class="expl' + (ok ? "" : " w") + '">' + (ok ? "✅ <b>" + T("صح!", "Juste ! (صح)") + "</b> " : "❌ <b>" + T("الجواب الصح: ", "La bonne réponse : ") + L3.charAt(q.a) + "</b> — ") + (q.x || "") + "</div>";
    if (!ok && !q.gen && w.NursinWX) { try { h += w.NursinWX.html(q, k, { skip: qs.map(function (z) { return z.id; }) }); } catch (e) {} }
    if (!ok && !inFinal) h += '<p class="small lnlater">🔁 ' + T("رح يرجعلك هالسؤال بالكويز الشامل، وانضاف عالمراجعة", "Il revient dans le quiz final et dans tes révisions") + "</p>";
    return h;
  }
  function record(q, ok, pi) {
    var bq = q.gen ? nearestBank(pi) : q;
    try { if (w.Weak && bq) { if (!q.gen || !ok) w.Weak.record(bq, ok); } } catch (e) {}
    try { if (w.NursinSRS && bq && (!q.gen || !ok)) w.NursinSRS.record(bq, ok); } catch (e) {}
    try { if (!q.gen) d.dispatchEvent(new CustomEvent("nursin:answer", { detail: { qid: q.id, ok: ok, set: "learn" } })); } catch (e) {}
  }
  var near = null;
  function nearestBank(pi) {
    if (!near) { var all = bankOf(X), W = idf(paras); near = paras.map(function (p) { var b = null, bs = 0; all.forEach(function (q) { var s = score(q, p, W); if (s > bs) { bs = s; b = q; } }); return bs > 0.3 ? b : null; }); }
    return near[pi] || null;
  }
  function mark(el, words) {   // the paragraph's own words that the question is about, highlighted (text nodes only, nothing rewritten)
    if (!el || !words || !words.length) return;
    var re; try { re = new RegExp("(" + words.filter(Boolean).map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "g"); } catch (e) { return; }
    var tw = d.createTreeWalker(el, 4, null, false), ns = [], n; while ((n = tw.nextNode())) ns.push(n);
    ns.forEach(function (t) {
      var s = t.nodeValue; re.lastIndex = 0; if (!re.test(s)) return; re.lastIndex = 0;
      var f = d.createDocumentFragment(), at = 0, m; while ((m = re.exec(s))) { if (m.index > at) f.appendChild(d.createTextNode(s.slice(at, m.index))); var mk = d.createElement("mark"); mk.className = "lnmk"; mk.textContent = m[0]; f.appendChild(mk); at = m.index + m[0].length; if (!m[0].length) re.lastIndex++; }
      if (at < s.length) f.appendChild(d.createTextNode(s.slice(at))); t.parentNode.replaceChild(f, t);
    });
  }
  function hitWords(q, p) {
    if (q.gen) return q.hit && q.hit.length ? q.hit : [];
    var qt = {}, W = idf(paras); toks(qText(q)).forEach(function (t) { qt[t] = 1; });
    var raw = String(p.text).split(/[\s،,.;:()«»"'\/]+/), out = [];
    raw.forEach(function (r) { if (r.length < 3) return; var t = toks(r)[0]; if (t && qt[t] && W(t) > 0.5 && out.indexOf(r) < 0) out.push(r); });
    return out.slice(0, 8);
  }
  function save() { put(U, S); progress(); }
  function progress() {   // «كمّل من وين وقفت» follows the learn mode too
    var R = w.NursinResume; if (!R || !R.make || !X) return;
    try {
      var n = paras.length, done = S.ph === "done" || !!S.fd, pct = done ? 1 : Math.min(0.94, (S.i | 0) / Math.max(1, n)), p = paras[Math.min(S.i | 0, n - 1)];
      var r = R.make(X, { h: p ? p.head || "" : "", hi: -1, off: 0, y: 0, pct: pct }); r.lm = 1;
      w.localStorage.setItem(R.KEY, JSON.stringify(r));
      if (done) { var xk = lsGet(R.XKEY); if (xk && xk === r.u) w.localStorage.removeItem(R.XKEY); }
    } catch (e) {}
  }
  function lnSpeak(txt,btn){try{if(!w.speechSynthesis||!w.SpeechSynthesisUtterance)return;if(lnSpeak.b===btn){w.speechSynthesis.cancel();btn.textContent="🔊 اسمع";lnSpeak.b=null;return;}w.speechSynthesis.cancel();var cl=String(txt||"").replace(/[\u2600-\u27BF\uFE0F\u200D]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g," ").replace(/\s+/g," ").trim(),re=/[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F0-9\-]*(?:[ ,/]+[A-Za-z\u00C0-\u024F0-9\-]+)*/g,m,at=0,ps=[];while((m=re.exec(cl))){var a=cl.slice(at,m.index).trim();if(a)ps.push({fr:0,t:a});ps.push({fr:1,t:m[0]});at=m.index+m[0].length;}var z=cl.slice(at).trim();if(z)ps.push({fr:0,t:z});if(!ps.length)return;lnSpeak.b=btn;btn.textContent="⏹️ وقّف";ps.forEach(function(x,i){var ut=new w.SpeechSynthesisUtterance(x.t);ut.lang=x.fr?"fr-FR":"ar-SA";ut.rate=x.fr?0.9:0.95;if(i===ps.length-1)ut.onend=ut.onerror=function(){if(lnSpeak.b===btn){btn.textContent="🔊 اسمع";lnSpeak.b=null;}};w.speechSynthesis.speak(ut);});}catch(e){}}function lnSimp(p,el){if(!el)return;el.hidden=false;el.innerHTML="<p class='small'>⏳ الأستاذ عثمان عم يبسّطلك هالفقرة…</p>";var sb=(w.speechSynthesis&&w.SpeechSynthesisUtterance)?"<button type='button' class='btn sm' data-ln='say'>🔊 اسمع</button>":"";function show(ht,raw){el.innerHTML="<p class='lnsmph'>👨‍🏫 عثمان بيبسّطلك هالفقرة</p>"+ht+(sb?"<p>"+sb+"</p>":"");el.setAttribute("data-say",raw||"");}function loc(why){var ts=latTerms(p.text).slice(0,6),ss=sentences(p).slice(0,2).join(" ");show("<p class='small'>"+esc(why)+"</p>"+(ts.length?"<p><b>🔑 مصطلحات: </b>"+esc(ts.join(" · "))+"</p>":"")+(ss?"<p>"+esc(ss)+"</p>":""),ts.join(", ")+" "+ss);}if((w.navigator&&w.navigator.onLine===false)||!w.fetch)return loc("📌 خلاصة سريعة للفقرة:");var pr="بسّط هالفقرة للطالب بالعربي اللبناني (٣ لـ ٤ نقاط قصار، بلا نجوم وبلا مقدمة). كل مصطلح فرنسي حط معناه بالعربي بين قوسين، وبآخر سطر حط «💡 سرّ للحفظ:» بجملة وحدة. اعتمد فقط على هالنص:\n"+String(p.text||"").slice(0,1800);w.fetch("https://summer-forest-fd40.abdullahjaber1452003.workers.dev/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",text:pr}],context:w.Osman&&w.Osman.persona?w.Osman.persona():""})}).then(function(r){if(!r.ok)throw 1;return r.json();}).then(function(j){var t=j&&j.text?String(j.text).replace(/\*\*?/g,"").trim():"";if(!t||t.length<15)throw 1;show(t.split(/\n+/).map(function(l){l=l.trim();return l?"<p>"+esc(l)+"</p>":"";}).join(""),t);}).catch(function(){loc("📌 خلاصة سريعة من الفقرة:");});} function lnCss(){if(d.getElementById("lndotcss"))return;var st0=d.createElement("style");st0.id="lndotcss";st0.textContent=".lnqdots{display:flex;gap:4px;margin:0 0 10px}.lnqdots i{flex:1;height:4px;border-radius:99px;background:rgba(0,0,0,.1);display:block}.lnqdots i.cur{background:#0f766e}.lnqdots i.ok{background:#16a34a}.lnqdots i.bad{background:#dc2626}.lnsimp{margin:10px 0;padding:12px;border-radius:14px;border:1px solid rgba(124,58,237,.35);background:rgba(124,58,237,.06);font-size:14px;line-height:1.65}.lnsmph{margin:0 0 6px;font-weight:700}.lnsimp p{margin:4px 0}.lnlock{margin:0 0 8px;padding:7px 10px;border-radius:10px;background:rgba(220,38,38,.09);border:1px solid rgba(220,38,38,.3);font-size:13px;font-weight:700}";(d.head||d.documentElement).appendChild(st0);}function draw(){if(!root)return;lnCss();var n=paras.length,h=head();if(S.ph==="fin")h+=finHtml();else if(S.ph==="done")h+=endHtml();else{var p=paras[S.i],qL=qSets[S.i]||[qs[S.i]];if(S.ph==="p"){h+=paraHtml(p)+"<div class='lnnav'><button type='button' class='btn pri' data-ln='toq'>"+(qL.length>1?"✅ قريتها · أسئلة الفقرة ("+qL.length+") ←":"✅ قريتها · سؤال ←")+"</button> <button type='button' class='btn' data-ln='simp'>🧑‍🏫 بسّطلي هالفقرة</button></div><div class='lnsimp' id='lnsimp' hidden></div>";}else if(S.ph==="rq"||S.ph==="ra"){var rq=S.rq||[],ri=Math.max(0,Math.min(rq.length-1,S.ri|0)),oi=rq[ri],q=variant(qL[oi],paras,S.i,ctxKey+":r"+(S.rc|0)+":"+oi),k=(S.rans||{})[ri];var nb=ri+1<rq.length?"<button type='button' class='btn pri' data-ln='rnext'>السؤال الجاي بالإعادة ←</button>":"<button type='button' class='btn pri' data-ln='next'>🔓 "+(S.i+1<n?"أتقنت الفقرة · الجاية ←":"🏁 الكويز الشامل ←")+"</button>";h+="<details class='lnpeek'"+(k!=null&&k!==q.a?" open":"")+"><summary>👀 الفقرة</summary>"+paraHtml(p)+"</details><div class='qcard lnq' data-qid='"+esc(q.id)+"'><p class='lnlock'>🔒 قفل الإتقان: جاوب الغلط صح لتفتح الفقرة الجاية ("+(ri+1)+"/"+rq.length+")</p><p class='qq'>"+q.q+"</p>"+optsHtml(q,k)+"<div class='lnfb' aria-live='polite'>"+(k!=null?fbHtml(q,k):"")+"</div><div class='qnav'><span></span>"+(k!=null?nb:"")+"</div></div>";}else{var qi=Math.max(0,Math.min(qL.length-1,S.qi|0)),q=qL[qi],ak=S.i+":"+qi,k=(S.ans||{})[ak];var dots=qL.length>1?"<div class='lnqdots' aria-hidden='true'>"+qL.map(function(qq,t){var av=(S.ans||{})[S.i+":"+t],c=av!=null?(av===qq.a?"ok":"bad"):(t===qi?"cur":"");return "<i class='"+c+"'></i>";}).join("")+"</div>":"";var qLab=qL.length>1?"سؤال "+(qi+1)+" من "+qL.length+" عالفقرة "+(S.i+1):"سؤال عالفقرة "+(S.i+1);var miss=[];qL.forEach(function(qq,t){var av=(S.ans||{})[S.i+":"+t];if(av!=null&&av!==qq.a)miss.push(t);});var nb=qi+1<qL.length?"<button type='button' class='btn pri' data-ln='qnext'>السؤال الجاي ("+(qi+2)+"/"+qL.length+") ←</button>":(miss.length?"<button type='button' class='btn pri' data-ln='retry'>🔒 أعد الغلط لتفتح الفقرة ("+miss.length+") ←</button>":"<button type='button' class='btn pri' data-ln='next'>✅ "+(S.i+1<n?"أتقنت الفقرة · الجاية ←":"🏁 الكويز الشامل ←")+"</button>");h+="<details class='lnpeek'"+(k!=null&&k!==q.a?" open":"")+"><summary>👀 الفقرة</summary>"+paraHtml(p)+"</details><div class='qcard lnq' data-qid='"+esc(q.id)+"'><p class='qnum'>❓ "+qLab+"</p>"+dots+"<p class='qq'>"+q.q+"</p>"+optsHtml(q,k)+"<div class='lnfb' aria-live='polite'>"+(k!=null?fbHtml(q,k):"")+"</div><div class='qnav'><span></span>"+(k!=null?nb:"")+"</div></div>";}}root.innerHTML=h;if(S.ph==="a"||S.ph==="q"){var qL2=qSets[S.i]||[qs[S.i]],qi2=Math.max(0,Math.min(qL2.length-1,S.qi|0)),q2=qL2[qi2],k2=(S.ans||{})[S.i+":"+qi2];if(k2!=null&&k2!==q2.a){var pe=root.querySelector(".lnpeek .lnpara");mark(pe,hitWords(q2,paras[S.i]));}}} function finHtml() {
    var at = Math.min(S.fj | 0, fin.length - 1), q = fin[at], k = (S.fin || {})[at];
    return '<div class="lnfint">🏁 ' + T("كويز شامل على كل الفقرات", "Quiz final sur tous les paragraphes") + " · " + (at + 1) + " / " + fin.length + "</div>" +
      '<div class="qcard lnq" data-qid="' + esc(q.id) + '"><p class="qq">' + q.q + "</p>" + optsHtml(q, k) + '<div class="lnfb" aria-live="polite">' + (k != null ? fbHtml(q, k, 1) : "") + "</div>" +
      '<div class="qnav"><span></span>' + (k != null ? '<button type="button" class="btn pri" data-ln="fnext">' + (at + 1 < fin.length ? T("التالي ←", "Suivant ←") : T("🏁 النتيجة", "🏁 Résultat")) + "</button>" : "") + "</div></div>";
  }
  function endHtml() {
    var sc = 0, wr = []; fin.forEach(function (q, i) { var k = (S.fin || {})[i]; if (k === q.a) sc++; else wr.push(i); });
    var R = w.NursinResume, nx = R && R.nextOf ? R.nextOf(X.href) : null, pct = fin.length ? Math.round(sc / fin.length * 100) : 0;
    var h = '<div class="lnend"><p class="lnsc">' + (pct >= 80 ? "🎉" : pct >= 50 ? "👏" : "💪") + " <b>" + sc + " / " + fin.length + "</b></p><p>" +
      (pct >= 80 ? T("برافو! خلصت هالجزء بلا ما تقرأ الدرس كلّو", "Bravo ! Partie terminée") : pct >= 50 ? T("منيح! الغلطات انضافوا عالمراجعة 🔁", "Bien ! Tes erreurs vont dans tes révisions 🔁") : T("ولا يهمّك، الغلطات انضافوا عالمراجعة 🔁 وبترجعلك", "Pas grave : tes erreurs reviennent dans tes révisions 🔁")) + "</p>";
    if (wr.length) h += '<ul class="lnwr">' + wr.map(function (i) { var q = fin[i]; return "<li>❌ " + q.q + "<br><small>✅ " + q.o[q.a] + "</small></li>"; }).join("") + "</ul>";
    h += '<p class="lnact">' + (nx ? '<a class="btn pri" href="' + esc(hrefFor(nx.u)) + '">➡️ ' + T("الجزء الجاي: ", "Partie suivante : ") + esc(nx.t) + "</a> " : "") +
      '<a class="btn" href="index.html">🧭 ' + T("رجوع للمسار", "Retour au parcours (رجوع للمسار)") + "</a> " +
      '<button type="button" class="btn" data-ln="again">🔁 ' + T("عيد هالجزء", "Refaire cette partie") + "</button></p></div>";
    return h;
  }
  function finish(keep) {   // keep = the last answer of the final quiz: everything counts now, the result screen comes on «🏁 النتيجة»
    if (!keep) S.ph = "done";
    if (S.fd) { save(); return; }
    S.fd = 1; save();
    try { var N = NL(); if (N && N.markRead) N.markRead(X); } catch (e) {}
    try { if (w.NursinStudy && w.NursinStudy.activity) w.NursinStudy.activity("quiz"); } catch (e) {}
    progress();
    try { d.dispatchEvent(new CustomEvent("nursin:goal-done", { detail: { k: "learn", u: U } })); } catch (e) {}
    try { if (w.NursinPro && w.NursinPro.nudge) { w.NursinPro.markUsed("learn"); w.NursinPro.nudge("خلّصت هالجزء بوضع التعلّم + قفل الإتقان!"); } } catch (e) {}
  }
  function onClick(e){var t=e.target&&e.target.closest?e.target:null;if(!t)return;var b=t.closest("[data-ln]"),o=t.closest(".opt[data-lk]");if(o&&!o.disabled){var k=+o.getAttribute("data-lk");if(S.ph==="fin"){var at=S.fj|0,fq=fin[at];if((S.fin||{})[at]!=null)return;S.fin=S.fin||{};S.fin[at]=k;var ok2=k===fq.a;snd(ok2);record(fq,ok2,fq._p);save();if(Object.keys(S.fin).length>=fin.length)finish(1);draw();return;}if(S.ph==="rq"||S.ph==="ra"){var rq=S.rq||[],ri=Math.max(0,Math.min(rq.length-1,S.ri|0)),oi=rq[ri],qL0=qSets[S.i]||[qs[S.i]],qr=variant(qL0[oi],paras,S.i,ctxKey+":r"+(S.rc|0)+":"+oi);S.rans=S.rans||{};if(S.rans[ri]!=null)return;S.rans[ri]=k;S.ph="ra";var okr=k===qr.a;snd(okr);if(!okr&&rq.length<10)S.rq.push(oi);save();draw();return;}var qL=qSets[S.i]||[qs[S.i]],qi=Math.max(0,Math.min(qL.length-1,S.qi|0)),q=qL[qi],ak=S.i+":"+qi;S.ans=S.ans||{};if(S.ans[ak]!=null)return;S.ans[ak]=k;S.ph="a";var ok=k===q.a;snd(ok);if(!ok){S.wr=S.wr||[];if(S.wr.indexOf(ak)<0)S.wr.push(ak);}if(ok&&!q.gen)record(q,ok,S.i);else if(!ok)record(q,ok,S.i);try{if(!q.gen&&w.NURSIN_QV&&w.NURSIN_QV.mark&&!w.NursinSRS)w.NURSIN_QV.mark(q.id,ok);}catch(x){}save();draw();return;}if(!b)return;var a=b.getAttribute("data-ln");if(a==="simp"){if(w.NursinPro&&!w.NursinPro.guard("بسّطلي هالفقرة"))return;lnSimp(paras[S.i],d.getElementById("lnsimp"));return;}if(a==="say"){var sp=d.getElementById("lnsimp");if(sp)lnSpeak(sp.getAttribute("data-say"),b);return;}if(a==="toq"){S.ph="q";S.qi=0;S.rq=null;S.ri=0;save();draw();top();return;}if(a==="qnext"){S.qi=(S.qi|0)+1;S.ph="q";save();draw();top();return;}if(a==="retry"){var qL3=qSets[S.i]||[qs[S.i]],ms=[];qL3.forEach(function(qq,ix){var av=(S.ans||{})[S.i+":"+ix];if(av!=null&&av!==qq.a)ms.push(ix);});S.rq=ms;S.ri=0;S.rc=(S.rc|0)+1;S.rans={};S.ph="rq";save();draw();top();return;}if(a==="rnext"){S.ri=(S.ri|0)+1;S.rc=(S.rc|0)+1;S.ph="rq";save();draw();top();return;}if(a==="next"){if(S.i+1<paras.length){S.i++;S.qi=0;S.rq=null;S.ri=0;S.ph="p";}else{S.ph="fin";S.fj=0;S.fin={};}save();draw();top();return;}if(a==="fnext"){if((S.fj|0)+1<fin.length){S.fj=(S.fj|0)+1;save();}else finish();draw();top();return;}if(a==="again"){S={i:0,qi:0,rq:null,ri:0,ph:"p",ans:{},fin:{},ts:0,fd:1};save();draw();top();return;}} function top() { try { root.scrollIntoView({ block: "start" }); w.scrollTo(0, 0); } catch (e) {} }
  function locked() { var c = String(d.documentElement.className); if (c.indexOf("gl-out") < 0) return false; try { var m = JSON.parse(w.sessionStorage.getItem("nursin_adunlock_v1") || "{}") || {}; return !(+m[X.href.split("#")[0]] > Date.now()); } catch (e) { return true; } }
  function lockHtml() { return head() + '<div class="lnend"><p>🔒 ' + T("وضع التعلّم بس للي عندن حساب — سجّل دخول بغوغل (ببلاش) وبيفتحلك.", "Le mode apprentissage demande un compte (gratuit).") + '</p><p><a class="btn pri" href="' + esc(X.href) + '" target="_top">📄 ' + T("افتح الدرس", "Ouvrir la leçon") + "</a></p></div>"; }
  /* learn.html with no lesson: organized smart Learn Hub (Osman's plan, weak lessons, in-progress, all subjects) */
  var hubTab = "plan";
  function hubCss() {
    if (d.getElementById("lnhubcss")) return;
    var s = d.createElement("style"); s.id = "lnhubcss";
    s.textContent = ".lnhub-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px}.lnhub-tab{padding:8px 12px;border-radius:999px;border:1px solid rgba(127,127,127,.28);background:var(--card,#fff);color:inherit;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.lnhub-tab.on{background:#0f766e;color:#fff;border-color:#0f766e}.lnhub-list{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}.lnhub-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(127,127,127,.22);background:var(--card,#fff);text-decoration:none;color:inherit}.lnhub-item b{display:block;font-size:14.5px}.lnhub-item small{display:block;font-size:12px;opacity:.78;margin-top:2px}.lnhub-pill{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;background:rgba(15,118,110,.12);color:#0f766e}.lnhub-pill.bad{background:rgba(220,38,38,.12);color:#dc2626}.lnhub-pill.ok{background:rgba(22,163,74,.14);color:#16a34a}.lnhub-empty{padding:16px;border-radius:14px;border:1px dashed rgba(127,127,127,.35);text-align:center;font-size:13.5px;opacity:.82}";
    (d.head || d.documentElement).appendChild(s);
  }
  function hubData() {
    var N = NL(), P = (N && N.parts) || [], SB = (N && N.subjects) || {};
    var lnAll = lsGet(K) || {}, rm = (N && N.readMap) ? N.readMap() : (lsGet("nursin_read_v1") || {});
    var lab = function (x) { try { return N.label(x); } catch (e) { return x.n; } };
    var sbTxt = function (s) { var o = SB[s] || {}; return (o.e || "📚") + " " + T(o.ar || s, o.fr || o.ar || s); };
    var byBase = {};
    P.forEach(function (x) {
      var b = x.s + ":" + (x.l || x.t);
      if (!byBase[b]) byBase[b] = [];
      byBase[b].push(x);
    });
    function firstUnreadOf(baseId) {
      var arr = byBase[baseId] || [];
      for (var i = 0; i < arr.length; i++) {
        if (!(N && N.isRead ? N.isRead(arr[i], rm) : rm[pkey(arr[i])])) return arr[i];
      }
      return arr[0] || null;
    }
    var planItems = [], seenPlan = {};
    function pushPlan(x, tag) {
      if (!x || seenPlan[x.href]) return;
      seenPlan[x.href] = 1;
      planItems.push({ x: x, tag: tag, done: !!(N && N.isRead ? N.isRead(x, rm) : rm[pkey(x)]) });
    }
    var pathObj = lsGet("nursin_path_v1");
    if (pathObj && Array.isArray(pathObj.steps)) {
      pathObj.steps.concat(pathObj.more || []).forEach(function (st0) {
        if (!st0) return;
        var px = st0.href ? partOf(st0.href) : null;
        if (!px && st0.id) px = firstUnreadOf(st0.id);
        if (!px) return;
        var tag = st0.k === "cls" ? "🏫 درس اليوم بالمعهد" : st0.k === "weak" || st0.k === "cvw" ? "💪 من نقاط ضعفك" : st0.k === "today" ? "⭐ درس اليوم (مخطط عثمان)" : st0.k === "mid" ? "🎯 خطة الامتحان" : "🧭 مسار اليوم";
        pushPlan(px, tag);
      });
    }
    if (N && N.todayPlan) {
      try { (N.todayPlan() || []).forEach(function (tp) { pushPlan(tp, "📅 جدول الصف اليوم"); }); } catch (e) {}
    }
    var weakItems = [], weakByBase = {};
    var wkRaw = (w.Weak && w.Weak.items ? w.Weak.items() : (lsGet("nursin_weak_v1") || {}).items) || {};
    var Ret = w.NursinRet;
    (w.QUIZ || []).forEach(function (q) {
      var e = wkRaw[q.id]; if (!e) return;
      var bid = Ret && Ret.ofQ ? Ret.ofQ(q) : null; if (!bid) return;
      var rec = weakByBase[bid] || (weakByBase[bid] = { id: bid, miss: 0, cnt: 0, score: null });
      rec.miss += (e.miss | 0) || 1; rec.cnt++;
    });
    var retLs = (lsGet("nursin_ret_v1") || {}).L || {};
    Object.keys(retLs).forEach(function (bid) {
      var sc = retLs[bid] && retLs[bid].s;
      if (sc != null && sc < 70) {
        var rec = weakByBase[bid] || (weakByBase[bid] = { id: bid, miss: 0, cnt: 0, score: sc });
        rec.score = sc;
      }
    });
    Object.keys(weakByBase).sort(function (a, b) {
      return (weakByBase[b].miss - weakByBase[a].miss) || ((weakByBase[a].score == null ? 99 : weakByBase[a].score) - (weakByBase[b].score == null ? 99 : weakByBase[b].score));
    }).forEach(function (bid) {
      var x = firstUnreadOf(bid); if (!x) return;
      var w0 = weakByBase[bid];
      var why = w0.miss ? ("غلطت فيه " + w0.miss + (w0.miss === 1 ? " مرّة" : w0.miss === 2 ? " مرّتين" : " مرّات")) : ("حفظك " + Math.round(w0.score) + "٪");
      weakItems.push({ x: x, why: why });
    });
    var progItems = [];
    Object.keys(lnAll).sort(function (a, b) { return (lnAll[b].ts || 0) - (lnAll[a].ts || 0); }).forEach(function (u0) {
      var o = lnAll[u0], px = partOf(u0);
      if (!px || !o || o.ph === "done" || o.fd) return;
      var ansN = o.ans ? Object.keys(o.ans).length : 0;
      if (ansN > 0 || (o.i | 0) > 0) progItems.push({ x: px, step: (o.i | 0) + 1, ansN: ansN });
    });
    var by = {}, ord = [];
    P.forEach(function (x) { if (!by[x.s]) { by[x.s] = []; ord.push(x.s); } by[x.s].push(x); });
    return { N: N, SB: SB, rm: rm, lnAll: lnAll, lab: lab, sbTxt: sbTxt, plan: planItems, weak: weakItems, prog: progItems, by: by, ord: ord };
  }
  function pickHtml() {
    hubCss();
    var D = hubData(), R = w.NursinResume, r = null;
    try { r = R && R.get ? R.get() : null; } catch (e) {}
    if (hubTab === "plan" && !D.plan.length && D.weak.length) hubTab = "weak";
    else if (hubTab === "plan" && !D.plan.length && !D.weak.length) hubTab = "all";
    var h = '<div class="lnhd"><div class="lnt"><small>📖 ' + T("وضع التعلّم · PRO", "Mode apprentissage") + "</small><b>" + T("اختار الدرس يلي بدك تدرسه فقرة فقرة", "Choisis la leçon à étudier") + "</b></div></div>";
    if (r && r.u) {
      var go = r.done && r.nx ? r.nx.u : r.u, gx = partOf(go);
      if (gx) h += '<a class="lnhub-item" href="' + esc(hrefFor(gx.href)) + '" style="margin-bottom:10px;border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.07)"><span><b>▶ ' + T("كمّل من وين وقفت: ", "Continuer : ") + esc(D.lab(gx)) + '</b><small>' + esc(D.sbTxt(gx.s)) + '</small></span><span class="lnhub-pill">كمّل ←</span></a>';
    }
    var tabs = [
      { id: "plan", label: "🎯 خطة عثمان (" + D.plan.length + ")" },
      { id: "weak", label: "💪 نقاط ضعفي (" + D.weak.length + ")" },
      { id: "prog", label: "⏳ مبلّش فيها (" + D.prog.length + ")" },
      { id: "all",  label: "📚 كل المواد (" + D.ord.length + ")" }
    ];
    h += '<div class="lnhub-tabs" role="tablist">';
    tabs.forEach(function (tb) { h += '<button type="button" class="lnhub-tab' + (hubTab === tb.id ? ' on' : '') + '" data-hubtab="' + tb.id + '">' + esc(tb.label) + '</button>'; });
    h += '</div>';
    if (hubTab === "plan") {
      if (D.plan.length) {
        h += '<div class="lnhub-list">';
        D.plan.forEach(function (it) { h += '<a class="lnhub-item" href="' + esc(hrefFor(it.x.href)) + '"><span><b>' + esc(D.lab(it.x)) + '</b><small>' + esc(it.tag) + ' · ' + esc(D.sbTxt(it.x.s)) + '</small></span><span class="lnhub-pill' + (it.done ? ' ok' : '') + '">' + (it.done ? '✅ منجز' : 'ابدأ ←') + '</span></a>'; });
        h += '</div>';
      } else h += '<div class="lnhub-empty">ما في دروس محددة بخطة اليوم بعد — اختار أي درس من <b>📚 كل المواد</b> أو <b>💪 نقاط ضعفي</b>.</div>';
    } else if (hubTab === "weak") {
      if (D.weak.length) {
        h += '<div class="lnhub-list">';
        D.weak.forEach(function (it) { h += '<a class="lnhub-item" href="' + esc(hrefFor(it.x.href)) + '"><span><b>' + esc(D.lab(it.x)) + '</b><small>' + esc(D.sbTxt(it.x.s)) + '</small></span><span class="lnhub-pill bad">' + esc(it.why) + '</span></a>'; });
        h += '</div>';
      } else h += '<div class="lnhub-empty">🎉 ما عندك دروس ضعيفة مسجّلة لهلق! كل ما تحل كويزات، الدروس يلي بتغلط فيها بتتصفّى هون تلقائياً لتقوّيها.</div>';
    } else if (hubTab === "prog") {
      if (D.prog.length) {
        h += '<div class="lnhub-list">';
        D.prog.forEach(function (it) { h += '<a class="lnhub-item" href="' + esc(hrefFor(it.x.href)) + '"><span><b>' + esc(D.lab(it.x)) + '</b><small>' + esc(D.sbTxt(it.x.s)) + ' · واصل عالفقرة ' + it.step + '</small></span><span class="lnhub-pill">كمّل ←</span></a>'; });
        h += '</div>';
      } else h += '<div class="lnhub-empty">ما في دروس نصّها مخلّص حالياً. أي درس بتبلّش فيه وما بتكمّله بيطلعلك هون دغري.</div>';
    } else {
      D.ord.forEach(function (k) {
        var sb = D.SB[k] || {};
        var doneC = D.by[k].filter(function (x) { return !!(D.N && D.N.isRead ? D.N.isRead(x, D.rm) : D.rm[pkey(x)]); }).length;
        h += '<details class="lnpeek lnpick"><summary>' + esc((sb.e || "📚") + " " + T(sb.ar || k, sb.fr || sb.ar || k)) + " · " + doneC + "/" + D.by[k].length + "</summary><ul>" +
          D.by[k].map(function (x) {
            var ok = !!(D.N && D.N.isRead ? D.N.isRead(x, D.rm) : D.rm[pkey(x)]);
            var st0 = D.lnAll[x.href];
            var badge = ok ? " ✅" : (st0 && !st0.fd && (st0.i > 0 || (st0.ans && Object.keys(st0.ans).length)) ? " ⏳" : "");
            return '<li><a href="' + esc(hrefFor(x.href)) + '">' + esc(D.lab(x)) + badge + "</a></li>";
          }).join("") + "</ul></details>";
      });
    }
    return h;
  }
  function drawHub() {
    if (!root) return;
    root.innerHTML = pickHtml();
    var btns = root.querySelectorAll("[data-hubtab]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        hubTab = this.getAttribute("data-hubtab") || "plan";
        drawHub();
      });
    }
  }
  function proLockHtml(x) {
    return '<div class="prolockbox"><h3>🔒 وضع التعلّم (PRO)</h3><p class="small">خلصت فترة التجربة المجانية (٣ أيام). فعّل اشتراك Pro بـ <b>$4 / شهر</b> عبر Whish Money لتكمل دراسة الدروس فقرة فقرة مع 🔒 قفل الإتقان و🧑‍🏫 بسّطلي.</p><p style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px"><button type="button" class="btn pri" id="lnprogo">⭐ فعّل Pro ($4/شهر)</button>' + (x ? '<a class="btn" href="' + esc(x.href) + '" target="_top">📄 افتح الدرس العادي (مجاني)</a>' : '<a class="btn" href="index.html" target="_top">🏠 رجوع للرئيسية</a>') + '</p></div>';
  }
  function boot(){try{
    root = d.getElementById("ln-app"); if (!root) return;
    var m = /[?&]u=([^&#]+)/.exec(w.location.search); U = m ? decodeURIComponent(m[1]) : "";
    X = U ? partOf(U) : null;
    if (w.NursinPro && !w.NursinPro.canUse()) {
      root.innerHTML = proLockHtml(X);
      var pb = d.getElementById("lnprogo"); if (pb) pb.onclick = function () { w.NursinPro.open("وضع التعلّم"); };
      d.addEventListener("nursin:pro", function () { if (w.NursinPro.canUse()) w.location.reload(); });
      return;
    }
    if (!U) { drawHub(); return; }
    if (!X) { root.innerHTML = '<p class="lnerr">' + T("ما لقيت هالدرس 🤔", "Leçon introuvable") + ' — <a href="index.html">🧭 ' + T("رجوع للمسار", "Retour") + "</a></p>"; return; }
    U = X.href; ctxKey = pkey(X);
    S = st(U); paras = []; root.innerHTML = head().replace(/فقرة 1 من 0|Paragraphe 1 sur 0 \(فقرة\)/, "…") + '<p class="lnload">⏳ ' + T("عم حضّرلك الدرس فقرة فقرة…", "Je prépare la leçon paragraphe par paragraphe…") + "</p>";
    root.addEventListener("click", onClick);
    if (locked()) { root.innerHTML = lockHtml(); d.addEventListener("nursin:auth", function (e) { if (e.detail && e.detail.signedIn) w.location.reload(); }); return; }
    loadPart(X, function (html) {
      paras = chunk(blocks(String(html || "").replace(/\s?\bglk-(x|tz)\b/g, "")));   // the sign-in blur classes of the lesson page, not the text
      if (!paras.length) { root.innerHTML = head() + '<p class="lnerr">' + T("ما قدرت حمّل الدرس هلّق 😕", "Impossible de charger la leçon") + ' — <a href="' + esc(X.href) + '" target="_top">📄 ' + T("افتح الدرس كامل", "Leçon complète") + "</a></p>"; return; }
      qSets = planMulti(paras, bankOf(X), ctxKey); qs = qSets.map(function(a){return a[0];}); fin = finalSetMulti(qSets, paras, ctxKey);
      var r = resumeAt(S, paras.length); S.i = Math.min(r.i, paras.length - 1); if (r.ph === "done") { S.ph = "done"; S.i = paras.length - 1; } else if (r.ph === "fin") S.ph = "fin"; else{S.ph=r.ph;var ql0=qSets[S.i]||[];S.qi=Math.max(0,Math.min(ql0.length-1,S.qi|0));if((S.ans||{})[S.i+":"+S.qi]!=null)S.ph="a";}
      if (S.ph === "fin" && (S.fj | 0) >= fin.length) S.fj = 0;
      if (S.ph === "fin" && (S.fin || {})[S.fj | 0] == null) { /* resume on the unanswered one */ }
      put(U, S); progress(); draw();
      try { d.documentElement.classList.add("lnready"); } catch (e) {}
    });
  }catch(err){if(root)root.innerHTML='<p class=lnerr>⚠️ '+err.message+'</p>';}}
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
