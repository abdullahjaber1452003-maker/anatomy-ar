/* 🃏 بطاقات + 📄 الخلاصة بصفحة — at the end of every lesson (Abdullah, Oct 29 2026 11:34–11:45 PM).
   Two buttons right above each lesson's «📝 كويز على هالدرس»:
   🃏 بطاقات: ~10 cards of THAT lesson, built only from what is already on the site — its own quiz questions (front = the question,
      back = the right answer + the bank's explanation) and, when it has fewer than 10, its own headings / «خطأ شائع» boxes (front =
      «🧠 شو بتتذكّر عن: <heading>», back = the lesson's own text under it). Tap = flip; «عرفتها ✅ / ما عرفتها ❌».
      ❌ on a question card → back in «🔁 مراجعة اليوم» tomorrow (assets/srs.js); ❌ on a heading card → one question of the lesson joins
      the reviews. Every answer moves the lesson's retention (nursin:flash → assets/hifz.js).
   📄 الخلاصة بصفحة: the lesson's headings, its bold key lines, short lists, tip/warning boxes and small tables — nothing written
      here, only kept or left out — in one compact sheet with 🖨️ print.
   hifzi.html links here with ?fc=<lesson id> to open the cards at once. No ad inside or next to either sheet. */
(function (w, d) {
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var R = function () { return w.NursinRet; };
  var page = (location.pathname.split("/").pop() || "index.html");
  function lessons() { return ((w.NLESSONS && w.NLESSONS.list) || []).filter(function (l) { return l.href.split("#")[0] === page; }); }
  function lid(l) { return l.s + ":" + (l.l || l.t); }
  function byId(id) { var L = lessons(); for (var i = 0; i < L.length; i++) if (lid(L[i]) === id) return L[i]; return null; }
  function ofLqz(a) {                                   // «quiz.html?t=infarctus» / «quiz.html?t=law&l=l1» → the lesson
    var h = a.getAttribute("href") || "", t = (h.match(/[?&]t=([\w-]+)/) || [])[1], l = (h.match(/[?&](?:amp;)?l=([\w-]+)/) || [])[1];
    var L = lessons(); for (var i = 0; i < L.length; i++) { var x = L[i]; if (x.t === t && (l ? x.l === l : !x.l)) return x; }
    return null;
  }
  function loadQuiz() {
    if (w.QUIZ) return Promise.resolve();
    return new Promise(function (res) { var s = d.createElement("script"); s.src = "assets/quiz-data.js?v=20261027y"; s.onload = s.onerror = function () { res(); }; d.head.appendChild(s); });
  }
  // the lesson's own blocks on this page (all its parts), in order
  function blocks(l) {
    var a = l.href.split("#")[1], out = [];
    if (a) {
      var parts = [].slice.call(d.querySelectorAll("details[id]")).filter(function (el) { return el.id === a || el.id.indexOf(a + "-p") === 0; });
      parts.forEach(function (p) { var b = p.querySelector(".tbody") || p; [].slice.call(b.children).forEach(function (c) { if (c.tagName !== "SUMMARY") out.push(c); }); });
    } else if (l.l) {                                     // Henderson: from the <h3> before its quiz link down to the link
      var q = d.querySelector('.lqz a[href*="l=' + l.l + '"]'), end = q && q.closest(".lqz"), p = end;
      var tmp = [], skip = function (x) { return x.classList && (x.classList.contains("lsk") || x.classList.contains("adx")); };
      // Oct 30 (Abdullah: «بطاقات/خلاصة الحاجات ٨–١٤ عم يجيبو الدرس الأول»): lesson 2's quiz link sits right after the <div class="prose">
      // that holds BOTH lessons, so walking up the siblings swallowed lesson 1 too. A sibling that contains an <h3> is now walked
      // from its end, child by child, down to this lesson's own <h3> (or the previous lesson's quiz link).
      outer: while (p && (p = p.previousElementSibling)) {
        if (skip(p)) continue;
        if (p.tagName !== "H3" && p.querySelector && p.querySelector("h3")) {
          var kids = [].slice.call(p.children);
          for (var k = kids.length - 1; k >= 0; k--) { var c = kids[k]; if (skip(c)) continue; if (c.classList && c.classList.contains("lqz")) break outer; tmp.unshift(c); if (c.tagName === "H3") break outer; }
          break;
        }
        tmp.unshift(p); if (p.tagName === "H3") break;
      }
      out = tmp;
    }
    return out.filter(function (el) { return !(el.classList && (el.classList.contains("adx") || el.classList.contains("lsk") || el.classList.contains("lqz") || el.classList.contains("ad-slot") || el.classList.contains("nlrow") || el.classList.contains("rtrow"))); });   // nlrow = 📝 (assets/notes.js), rtrow = 🧑‍🏫/📃 (assets/retain.js)
  }
  function clean(el) {                                  // a copy without media, scripts, buttons, ads or nested answers
    var c = el.cloneNode(true);
    [].slice.call(c.querySelectorAll("img,picture,svg,video,iframe,script,style,button,model-viewer,canvas,.adx,.rdot,.lsk,.lqz,input,select,textarea")).forEach(function (x) { x.remove(); });
    [].slice.call(c.querySelectorAll("[id]")).forEach(function (x) { x.removeAttribute("id"); });
    if (c.removeAttribute) c.removeAttribute("id");
    return c;
  }
  function txt(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
  function isHead(el) { return /^H[2-5]$/.test(el.tagName); }

  /* ---------------- 🃏 cards ---------------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function headCards(l) {
    var bl = blocks(l), out = [];
    for (var i = 0; i < bl.length; i++) {
      var el = bl[i];
      if (isHead(el) && txt(el).length > 2) {
        var back = [], n = 0;
        for (var j = i + 1; j < bl.length && n < 2; j++) { if (isHead(bl[j])) break; if (/^(DETAILS)$/.test(bl[j].tagName)) continue; var t = txt(bl[j]); if (!t) continue; back.push(clean(bl[j]).outerHTML); n++; }
        if (back.length) out.push({ k: "h", front: T("🧠 شو بتتذكّر عن: ", "🧠 Que retiens-tu de : ") + txt(el).replace(/[📌🫁🍽️🚽🚶😴👕🌡️🧼⚠️🗣🙌💼🎉📚]+/gu, "").replace(/[\uD800-\uDFFF]/g, "").trim() + T("؟", " ?"), back: back.join("") });
      } else if (el.classList && el.classList.contains("box") && el.classList.contains("warn") && txt(el).length > 10) {
        out.push({ k: "h", front: T("⚠️ خطأ شائع بهالدرس: شو لازم تنتبه؟", "⚠️ Erreur fréquente dans cette leçon : à quoi faire attention ?"), back: clean(el).innerHTML });
      }
    }
    return out;
  }
  function build(l) {
    var id = lid(l), RR = R(), qs = (w.QUIZ || []).filter(function (q) { return RR ? RR.ofQ(q) === id : (q.t === l.t && (!l.l || q.l === l.l)); });
    var hc = headCards(l), nq = Math.min(qs.length, hc.length >= 3 ? 7 : 10), cards = shuffle(qs).slice(0, nq).map(function (q) {
      return { k: "q", q: q, front: q.q, back: "<p><b>✅ " + esc(q.o[q.a]) + "</b></p>" + (q.x ? "<p>" + esc(q.x) + "</p>" : "") };
    });
    hc = hc.slice(0, Math.max(0, 10 - cards.length));
    var all = []; while (cards.length || hc.length) { if (cards.length) all.push(cards.shift()); if (cards.length) all.push(cards.shift()); if (hc.length) all.push(hc.shift()); }
    return all;
  }
  var box = null, cur = null;                          // cur = what is on screen, for «📝 ملاحظة» in the header (assets/notes.js)
  function close() { if (!box) return; var b = box; box = null; d.documentElement.classList.remove("fcon"); var A = w.NursinAnim; if (A) A.out(b, function () { b.remove(); }); else b.remove(); }
  function shell(cls, title) {
    close();
    box = d.createElement("div"); box.className = "fcwrap " + cls; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", title);
    box.innerHTML = '<div class="fcbox"><div class="fchd"><b>' + esc(title) + '</b><span class="fcn"></span><button class="fcx" type="button" aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button></div><div class="fcbd"></div></div>';
    d.body.appendChild(box); d.documentElement.classList.add("fcon");
    box.addEventListener("click", function (e) { if (e.target === box || (e.target.closest && e.target.closest(".fcx"))) close(); });
    return box.querySelector(".fcbd");
  }
  function openCards(l, only) {
    loadQuiz().then(function () {
      var deck = only || build(l), i = 0, ok = 0, wrong = [], id = lid(l);
      var bd = shell("fcards", "🃏 " + T("بطاقات: ", "Cartes : ") + l.n), n = box.querySelector(".fcn"); cur = { kind: "cards", l: l, card: null };
      if (!deck.length) { bd.innerHTML = '<p class="small">' + esc(T("ما في محتوى كافي لبطاقات بهالدرس بعد.", "Pas encore assez de contenu pour des cartes dans cette leçon.")) + "</p>"; return; }
      function show(dir) {
        var c = deck[i]; n.textContent = (i + 1) + " / " + deck.length; cur = { kind: "cards", l: l, card: c };
        bd.innerHTML = '<div class="fcbar" aria-hidden="true"><i style="width:' + Math.round(100 * i / deck.length) + '%"></i></div>' +
          '<button class="fc' + (dir ? " fcin" : "") + '" type="button" aria-label="' + esc(T("اقلب البطاقة", "Retourner la carte")) + '"><span class="fci"><span class="fcf fcfront"><small>' + esc(T("سؤال", "Question")) + '</small><span class="fct">' + esc(c.front) + '</span><em>' + esc(T("👆 كبوس لتقلبها", "👆 Touche pour retourner")) + '</em></span><span class="fcf fcback"><small>' + esc(T("الجواب", "Réponse")) + '</small><span class="fct">' + c.back + "</span></span></span></button>" +
          '<div class="fcact" hidden><button class="btn fcno" type="button">' + esc(T("ما عرفتها ❌", "Je ne savais pas ❌")) + '</button><button class="btn pri fcok" type="button">' + esc(T("عرفتها ✅", "Je savais ✅")) + "</button></div>";
        var card = bd.querySelector(".fc"), act = bd.querySelector(".fcact");
        card.addEventListener("click", function () { card.classList.toggle("flip"); act.hidden = false; });
        act.addEventListener("click", function (e) {
          var b = e.target.closest("button"); if (!b) return; var good = b.classList.contains("fcok");
          answer(c, good, id, l); if (good) ok++; else wrong.push(c);
          i++; if (i < deck.length) show(1); else end();
        });
        try { card.focus({ preventScroll: true }); } catch (x) {}
      }
      function end() {
        var RR = R(), s = RR ? RR.score(id) : null; cur = { kind: "cards", l: l, card: null };
        n.textContent = "";
        bd.innerHTML = '<div class="fcend"><p class="fcbig">' + (ok === deck.length ? "🎉" : ok >= deck.length / 2 ? "👏" : "💪") + "</p><p><b>" + esc(T("عرفت " + ok + " من " + deck.length, "Tu savais " + ok + " sur " + deck.length)) + "</b></p>" +
          (s != null ? '<p class="small">' + (RR.dotHtml ? RR.dotHtml(s) : "") + " " + esc(T("حفظك لهالدرس هلّق: ", "Ta mémoire de cette leçon : ") + Math.round(s) + "%") + "</p>" : "") +
          (wrong.length ? '<p class="small">' + esc(T("اللي ما عرفتها رجعت لـ «🔁 مراجعة اليوم» بكرا.", "Celles que tu ne savais pas reviennent dans « 🔁 Révision du jour » demain.")) + "</p>" : "") +
          '<div class="fcact">' + (wrong.length ? '<button class="btn pri fcagain" type="button">' + esc(T("🔁 عيد اللي ما عرفتها (" + wrong.length + ")", "🔁 Revoir celles ratées (" + wrong.length + ")")) + "</button>" : "") +
          '<a class="btn" href="quiz.html?t=' + esc(l.t) + (l.l ? "&l=" + esc(l.l) : "") + '">' + esc(T("📝 كويز على هالدرس", "📝 Quiz sur cette leçon")) + '</a><button class="btn fcdone" type="button">' + esc(T("خلصت", "Terminé")) + "</button></div></div>";
        var ag = bd.querySelector(".fcagain"); if (ag) ag.addEventListener("click", function () { openCards(l, wrong.slice()); });
        bd.querySelector(".fcdone").addEventListener("click", close);
      }
      show(0);
    });
  }
  function answer(c, good, id, l) {
    try { d.dispatchEvent(new CustomEvent("nursin:flash", { detail: { id: id, ok: good, kind: c.k } })); } catch (e) {}
    var S = w.NursinSRS; if (!S) return;
    if (c.k === "q") S.record(c.q, good);
    else if (!good) {                                    // a heading card missed: one question of this lesson joins the reviews
      var RR = R(), q = (w.QUIZ || []).filter(function (x) { return (RR ? RR.ofQ(x) === id : x.t === l.t) && !S.has(x.id); })[0];
      if (q) S.add([q.id]);
    }
  }

  /* ---------------- 📄 one-page summary ---------------- */
  function summary(l) {
    var bl = blocks(l), out = [], sec = null;
    function push(html) { if (!sec) { sec = { h: "", items: [] }; out.push(sec); } sec.items.push(html); }
    bl.forEach(function (el) {
      var t = txt(el); if (!t) return;
      if (isHead(el)) { sec = { h: t, items: [] }; out.push(sec); return; }
      if (el.tagName === "DETAILS" || el.tagName === "FIGURE") return;
      if (el.classList && el.classList.contains("box")) { push('<div class="sbx">' + clean(el).innerHTML + "</div>"); return; }
      if (el.tagName === "UL" || el.tagName === "OL") {
        var li = [].slice.call(el.children).filter(function (x) { return x.tagName === "LI"; }), keyLi = li.filter(function (x) { return x.querySelector("b,strong"); });
        var keep = keyLi.length ? keyLi : li.filter(function (x) { return txt(x).length <= 140; }).slice(0, 8);
        if (keep.length) push("<ul>" + keep.map(function (x) { return "<li>" + clean(x).innerHTML + "</li>"; }).join("") + "</ul>");
        return;
      }
      if (el.tagName === "TABLE" || (el.querySelector && el.querySelector("table") && el.querySelectorAll("tr").length <= 10)) { if (el.querySelectorAll("tr").length <= 10) push('<div class="stbl">' + clean(el).outerHTML + "</div>"); return; }
      if (el.tagName === "P" && el.querySelector("b,strong") && t.length <= 280) { push("<p>" + clean(el).innerHTML + "</p>"); return; }
      if (el.tagName === "DIV" && !el.querySelector("details")) { var bs = [].slice.call(el.querySelectorAll("p,li")).filter(function (x) { return x.querySelector("b,strong") && txt(x).length <= 280; }).slice(0, 6); if (bs.length) push("<ul>" + bs.map(function (x) { return "<li>" + clean(x).innerHTML + "</li>"; }).join("") + "</ul>"); }
    });
    return out.filter(function (s) { return s.items.length; });
  }
  function openSummary(l) {
    var bd = shell("fsum", "📄 " + T("الخلاصة بصفحة: ", "Résumé en une page : ") + l.n), secs = summary(l); cur = { kind: "sum", l: l };
    box.querySelector(".fcn").innerHTML = '<button class="btn sm fcprint" type="button">' + esc(T("🖨️ اطبع", "🖨️ Imprimer")) + "</button>";
    bd.innerHTML = secs.length ? '<div class="sumdoc"><h2>' + esc(l.n) + "</h2>" + secs.map(function (s) { return (s.h ? "<h3>" + esc(s.h) + "</h3>" : "") + s.items.join(""); }).join("") +
      '<p class="small sumnote">' + esc(T("الخلاصة مأخوذة من نص الدرس نفسو. للتفاصيل ارجع عالدرس.", "Résumé tiré du texte de la leçon. Pour les détails, retourne à la leçon.")) + "</p></div>"
      : '<p class="small">' + esc(T("ما في نقاط أساسية كافية بهالدرس لخلاصة.", "Pas assez de points clés dans cette leçon pour un résumé.")) + "</p>";
    box.querySelector(".fcprint").addEventListener("click", function () {
      d.documentElement.classList.add("printsum");
      var done = function () { d.documentElement.classList.remove("printsum"); w.removeEventListener("afterprint", done); };
      w.addEventListener("afterprint", done); try { w.print(); } catch (e) {} setTimeout(done, 60000);
    });
  }

  /* ---------------- the two buttons under each lesson ---------------- */
  function mount() {
    [].slice.call(d.querySelectorAll(".lqz a[href*='quiz.html?t=']")).forEach(function (a) {
      var p = a.closest(".lqz"), l = ofLqz(a); if (!p || !l || (p.previousElementSibling && p.previousElementSibling.classList.contains("lsk"))) return;
      var id = lid(l), bar = d.createElement("p"); bar.className = "lsk"; bar.setAttribute("data-l", id);
      bar.innerHTML = '<button class="btn sm" type="button" data-fc="' + esc(id) + '">' + esc(T("🃏 بطاقات", "🃏 Cartes")) + '</button><button class="btn sm" type="button" data-sum="' + esc(id) + '">' + esc(T("📄 الخلاصة بصفحة", "📄 Résumé en une page")) + "</button>";
      p.parentNode.insertBefore(bar, p);
    });
  }
  d.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-fc],[data-sum]"); if (!b || !b.closest(".lsk")) return;
    var l = byId(b.getAttribute("data-fc") || b.getAttribute("data-sum")); if (!l) return;
    if (b.hasAttribute("data-fc")) openCards(l); else openSummary(l);
  });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && box) close(); });
  w.NursinCards = { build: build, summary: summary, openCards: function (id) { var l = byId(id); if (l) openCards(l); }, openSummary: function (id) { var l = byId(id); if (l) openSummary(l); }, mount: mount, current: function () { return box ? cur : null; },
    blocks: blocks, openDeck: function (id, deck) { var l = byId(id); if (l && deck && deck.length) openCards(l, deck); } };   // assets/retain.js: Henderson's key points + 📃/🧑‍🏫 missed points as cards
  function init() {
    mount(); setTimeout(mount, 1500);
    var m = (location.search.match(/[?&]fc=([\w%:-]+)/) || [])[1];
    if (m) setTimeout(function () { var l = byId(decodeURIComponent(m)); if (l) openCards(l); }, 700);
    var sm = (location.search.match(/[?&]sum=([\w%:-]+)/) || [])[1];      // 📒 a note on a summary links back with ?sum=<lesson id>
    if (sm) setTimeout(function () { var l = byId(decodeURIComponent(sm)); if (l) openSummary(l); }, 700);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
