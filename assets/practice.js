/* ✍️ «عبّي الفراغ» + 📝 «كويز متل الصف» (Oct 26). بيشتغلوا بأي عنصر:
   <div data-practice="blanks" data-t="law|all"></div>  ← من window.BLANKS
   <div data-practice="class" data-lesson="l1"></div>   ← من window.LAW.lessons[k].cq
   وأزرار [data-pm="blanks"|"class"] بتفتح المود بـ #pmode (صفحة الكويز). ما في إعلانات جوّا. */
(function (w, d) {
  var API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/", FIX_K = "nursin_fix_day_v1", FIX_MAX = 6;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* تطبيع عربي: بلا تشكيل/تطويل، أ إ آ ← ا، ة ← ه، ى ← ي، ؤ ئ ← و ي، أرقام هندية ← عادية، بلا «ال» بالأول، بلا مسافات وعلامات */
  function norm(s) {
    s = String(s || "").toLowerCase().trim()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); })
      .replace(/[^\u0621-\u064Aa-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    return s.split(" ").map(function (x) { return x.length > 3 && x.indexOf("ال") === 0 ? x.slice(2) : x; }).join("");
  }
  function lev(a, b) { var m = a.length, n = b.length, p = [], i, j; for (j = 0; j <= n; j++) p[j] = j; for (i = 1; i <= m; i++) { var prev = p[0]; p[0] = i; for (j = 1; j <= n; j++) { var t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return p[n]; }
  function okTyped(ans, item) {
    var u = norm(ans); if (!u) return false;
    return [item.a].concat(item.alts || []).some(function (x) { var v = norm(x); return u === v || (v.length >= 5 && lev(u, v) <= 1) || (v.length >= 8 && lev(u, v) <= 2); });
  }
  function blankHtml(s, fill) { return esc(s).replace("___", fill); }

  /* ---------- ✍️ عبّي الفراغ ---------- */
  function blanks(el, t) {
    var all = (w.BLANKS || []).filter(function (b) { return !t || t === "all" || b.t === t; });
    if (!all.length) { el.innerHTML = '<p class="small">ما في أسئلة «عبّي الفراغ» لهالمادة لهلّق.</p>'; return; }
    var st = { qs: shuffle(all), i: 0, ok: 0 };
    function draw() {
      if (st.i >= st.qs.length) {
        el.innerHTML = '<div class="qcard pcard"><p class="qq">✍️ خلصت! جبت <b>' + st.ok + '/' + st.qs.length + '</b></p><p><button class="btn pri" type="button" data-again>🔁 كمان مرّة</button></p></div>';
        el.querySelector("[data-again]").onclick = function () { blanks(el, t); }; return;
      }
      var q = st.qs[st.i], T = w.QTOP || {};
      var h = '<div class="qcard pcard"><span class="qtopic">✍️ عبّي الفراغ · ' + esc(T[q.t] || q.t) + ' · ' + (st.i + 1) + '/' + st.qs.length + '</span>';
      h += '<p class="qq pblank">' + blankHtml(q.s, '<span class="pgap">' + (q.o ? "؟" : "……") + '</span>') + '</p>';
      if (q.o) h += '<div class="opts">' + shuffle(q.o).map(function (o) { return '<button class="opt" type="button" data-o="' + esc(o) + '">' + esc(o) + '</button>'; }).join("") + '</div>';
      else h += '<form class="ptype"><input class="pin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="اكتب الكلمة الناقصة" aria-label="الكلمة الناقصة"><button class="btn pri" type="submit">تأكّد ✓</button></form>';
      h += '<div class="pfb" aria-live="polite"></div></div>';
      el.innerHTML = h;
      function done(ok, given) {
        if (ok) st.ok++;
        el.querySelectorAll(".opt").forEach(function (b) { b.disabled = true; if (b.getAttribute("data-o") === q.a) b.classList.add("ok"); else if (b.getAttribute("data-o") === given && !ok) b.classList.add("bad"); });
        var f = el.querySelector(".ptype"); if (f) { f.querySelector("input").disabled = true; f.querySelector("button").disabled = true; }
        el.querySelector(".pgap").textContent = q.a; el.querySelector(".pgap").classList.add(ok ? "pok" : "pbad");
        el.querySelector(".pfb").innerHTML = '<div class="expl">' + (ok ? "✅ صح!" : "❌ الجواب: <b>" + esc(q.a) + "</b>") + '</div><p><button class="btn pri" type="button" data-next>' + (st.i + 1 < st.qs.length ? "التالي ←" : "النتيجة ←") + '</button></p>';
        el.querySelector("[data-next]").onclick = function () { st.i++; draw(); };
      }
      el.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { var g = b.getAttribute("data-o"); done(g === q.a, g); }; });
      var f = el.querySelector(".ptype");
      if (f) f.onsubmit = function (e) { e.preventDefault(); var v = f.querySelector("input").value; if (!v.trim()) return; done(okTyped(v, q), v); };
    }
    draw();
  }

  /* ---------- 📝 كويز متل الصف ---------- */
  function fixesLeft() { var day = new Date().toISOString().slice(0, 10), o = {}; try { o = JSON.parse(localStorage.getItem(FIX_K) || "{}"); } catch (e) {} return o.d === day ? Math.max(0, FIX_MAX - (o.n || 0)) : FIX_MAX; }
  function useFix() { var day = new Date().toISOString().slice(0, 10), o = {}; try { o = JSON.parse(localStorage.getItem(FIX_K) || "{}"); } catch (e) {} o = o.d === day ? o : { d: day, n: 0 }; o.n++; try { localStorage.setItem(FIX_K, JSON.stringify(o)); } catch (e) {} }
  function aiFix(q, pts, ans) {
    var text = "صحّح جواب طالب تمريض على سؤال بالقانون التطبيقي. السؤال: «" + q + "». النقاط المطلوبة (من دفتر الصف): " + pts.join(" | ") + ". جواب الطالب: «" + ans + "». قلّو بالعربي اللبناني بـ ٣-٤ أسطر: شو صح، شو ناقص من النقاط، وعلامة من 10. ما تزيد معلومات من برّا النقاط.";
    var ctl = ("AbortController" in w) ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 40000);
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text: text }], context: "" }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { var t = j && j.text; if (!t) throw new Error("empty"); return String(t).replace(/\*\*?/g, ""); });
  }
  function classQuiz(el, k) {
    var L = ((w.LAW || {}).lessons || []).filter(function (x) { return x.k === k; })[0];
    if (!L || !(L.cq || []).length) { el.innerHTML = '<p class="small">ما في أسئلة لهالدرس لهلّق.</p>'; return; }
    var got = {}, tot = 0;
    var h = '<div class="pclass"><p class="small">متل امتحان الصف: اكتب جوابك، بعدين «شوف الجواب» وعلّم ✓ عالنقاط اللي ذكرتها.</p>';
    L.cq.forEach(function (c, i) {
      tot += c.pts.length;
      h += '<div class="qcard pcard" data-i="' + i + '"><span class="qtopic">📝 سؤال ' + (i + 1) + '/' + L.cq.length + '</span><p class="qq">' + esc(c.q) + '</p>'
        + '<textarea class="pta" rows="4" placeholder="اكتب جوابك هون…" aria-label="جوابك"></textarea>'
        + '<p class="pbtns"><button class="btn pri" type="button" data-show>👀 شوف الجواب</button> <button class="btn" type="button" data-fix>✨ صحّحلي</button></p>'
        + '<div class="pans" hidden><p class="small">علّم ✓ عاللي كتبتو:</p><ul class="pchk">' + c.pts.map(function (p, j) { return '<li><label><input type="checkbox" data-j="' + j + '"> ' + esc(p) + '</label></li>'; }).join("") + '</ul><p class="pscore small"></p></div>'
        + '<div class="pai" aria-live="polite"></div></div>';
    });
    h += '<div class="qcard ptotal" aria-live="polite"></div></div>';
    el.innerHTML = h;
    function total() {
      var n = 0; for (var x in got) n += got[x];
      var shown = el.querySelectorAll(".pans:not([hidden])").length;
      el.querySelector(".ptotal").innerHTML = shown ? '📊 مجموعك: <b>' + n + '/' + tot + '</b> نقطة (' + Math.round(n * 100 / tot) + '%)' + (shown < L.cq.length ? ' · بقيلك ' + (L.cq.length - shown) + ' سؤال' : '') : '';
    }
    el.querySelectorAll(".pcard").forEach(function (card) {
      var i = +card.getAttribute("data-i"), c = L.cq[i], ans = card.querySelector(".pans");
      card.querySelector("[data-show]").onclick = function () { ans.hidden = false; this.disabled = true; total(); };
      ans.addEventListener("change", function () { var n = ans.querySelectorAll("input:checked").length; got[i] = n; ans.querySelector(".pscore").textContent = n + "/" + c.pts.length; total(); });
      card.querySelector("[data-fix]").onclick = function () {
        var b = this, out = card.querySelector(".pai"), v = card.querySelector(".pta").value.trim();
        if (v.length < 5) { out.innerHTML = '<p class="small">✍️ اكتب جوابك أوّل.</p>'; return; }
        if (!fixesLeft()) { out.innerHTML = '<p class="small">خلصوا التصحيحات لليوم (' + FIX_MAX + '). استعمل «شوف الجواب» 👀</p>'; return; }
        b.disabled = true; out.innerHTML = '<p class="small">⏳ عم صحّح…</p>';
        aiFix(c.q, c.pts, v).then(function (t) { useFix(); out.innerHTML = '<div class="expl pfix">' + esc(t).replace(/\n/g, "<br>") + '</div>'; ans.hidden = false; card.querySelector("[data-show]").disabled = true; total(); },
          function () { out.innerHTML = '<p class="small">⚠️ ما قدرت صحّح هلّق، جرّب بعد شوي أو استعمل «شوف الجواب».</p>'; })
          .then(function () { b.disabled = false; });
      };
    });
  }

  function mount(root) {
    (root || d).querySelectorAll("[data-practice]").forEach(function (el) {
      if (el.getAttribute("data-practice") === "blanks") blanks(el, el.getAttribute("data-t") || "all");
      else classQuiz(el, el.getAttribute("data-lesson") || "l1");
    });
  }
  w.NursinPractice = { blanks: blanks, classQuiz: classQuiz, norm: norm, okTyped: okTyped, mount: mount };
  function init() {
    mount();
    var pm = d.getElementById("pmode");
    d.querySelectorAll("[data-pm]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!pm) return; pm.hidden = false; var qz = d.getElementById("quiz"); if (qz) qz.hidden = true;
        d.querySelectorAll("[data-pm]").forEach(function (x) { x.classList.toggle("on", x === b); });
        if (b.getAttribute("data-pm") === "blanks") blanks(pm, b.getAttribute("data-t") || "all"); else classQuiz(pm, b.getAttribute("data-lesson") || "l1");
        pm.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    });
    var hb = { "#blanks": "blanks", "#classquiz": "class" }[location.hash];   // quiz.html#blanks · quiz.html#classquiz
    if (pm && hb) { var hbtn = d.querySelector('[data-pm="' + hb + '"]'); if (hbtn) setTimeout(function () { hbtn.click(); }, 60); }
  }
  d.addEventListener("click", function (e) {            // a normal quiz chip closes the practice mode again
    var c = e.target.closest && e.target.closest("#qsets .chip, #weak button"); if (!c) return;
    var pm = d.getElementById("pmode"), qz = d.getElementById("quiz"); if (pm) pm.hidden = true; if (qz) qz.hidden = false;
    d.querySelectorAll("[data-pm]").forEach(function (x) { x.classList.remove("on"); });
  }, true);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(window, document);
