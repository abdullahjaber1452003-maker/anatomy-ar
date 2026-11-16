/* 📚 geri.html / community.html / medsurg.html (Oct 30 2026): one renderer for the new مواد, same drawing as rea.js / quality.js.
   <div class="sublessons" data-var="GERI" data-t="geri"> → the lessons of window.GERI (assets/geri-data.js), each a <details class="topic">
   with its «📝 كويز على هالدرس», then ✂️ splitPage (assets/lessons.js). medsurg.html also gets #msgroup: the lessons of القلب /
   الأعصاب / Henderson straight from NLESSONS, linking to their own pages and anchors (URLs, ids and progress unchanged). */
(function (w, d) {
  // 30a: a Latin parenthetical in an Arabic lesson title is one LTR isolate — «(Coronarographie / Artériographie)» never wraps as «/)» … «(…»
  function bidiT(s) { return String(s).replace(/\(([^()<>\u0600-\u06FF]*[A-Za-z\u00C0-\u024F][^()<>\u0600-\u06FF]*)\)/g, '<bdi dir="ltr" class="bdl">($1)</bdi>'); }
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lq(t, k) {
    var n = (w.QUIZ || []).filter(function (q) { return q.t === t && q.l === k; }).length;
    var c = n === 1 ? "سؤال واحد" : n === 2 ? "سؤالين" : n <= 10 ? n + " أسئلة" : n + " سؤال";
    return '<p class="lqz"><a href="quiz.html?t=' + t + '&amp;l=' + k + '">📝 كويز على هالدرس</a> <small>' + (n >= 3 ? c : n ? c + " · ما في أسئلة كافية بعد" : "ما في أسئلة كافية لهالدرس بعد") + '</small></p>';
  }
  [].slice.call(d.querySelectorAll(".sublessons[data-var]")).forEach(function (box) {
    var M = w[box.getAttribute("data-var")] || {}, L = M.lessons || [], t = box.getAttribute("data-t");
    if (!L.length) return;
    box.innerHTML = L.map(function (x, i) {
      return '<details class="topic" id="' + x.k + '"' + (i === 0 && L.length === 1 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + bidiT(x.n) + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '</div></details>' + lq(t, x.k);
    }).join("");
  });
  var g = d.getElementById("msgroup"), NL = w.NLESSONS, G = NL && NL.groups && NL.groups.medsurg;
  if (g && G) {
    g.innerHTML = G.subs.filter(function (s) { return s !== "medsurg"; }).map(function (s) {
      var S = NL.subjects[s] || {}, ls = NL.list.filter(function (x) { return x.s === s; });
      return '<details class="topic mssub"><summary><span class="n">' + esc(S.e || "📖") + '</span><span class="t"><b>' + esc(T(S.ar, S.fr)) + '</b><span class="small">' + esc(T(ls.length + " دروس", ls.length + " leçons")) + ' · <a href="' + esc(S.page) + '">' + esc(T("افتح الصفحة", "Ouvrir la page")) + ' ›</a></span></span><span class="chev" aria-hidden="true">▾</span></summary>' +
        '<ul class="mslist">' + ls.map(function (x) { return '<li><a href="' + esc(x.href) + '">' + esc(x.n) + "</a></li>"; }).join("") + "</ul></details>";
    }).join("");
  }
  if (w.NursinLessons && w.NursinLessons.splitPage) w.NursinLessons.splitPage();   // ✂️ long lessons → «الجزء 1 / 2 …» (assets/lessons.js)
  if (location.hash) { var el = d.getElementById(location.hash.slice(1)); if (el && el.tagName === "DETAILS") { el.open = true; } }

  /* 🌙 «مراجعة ليلة الامتحان» + ⚡ «خلاصة ٣٠ ثانية» — تلقائياً لكل مادة ودرس */
  function pageSubj() {
    var box = d.querySelector(".sublessons[data-t]");
    if (box) return box.getAttribute("data-t");
    var pg = (location.pathname.split("/").pop() || "").toLowerCase(), S = (w.NLESSONS && w.NLESSONS.subjects) || {};
    for (var k in S) if (S[k].page === pg) return k;
    return "";
  }
  function subjQ(t) {
    var G = (w.QGROUPS && w.QGROUPS[t]) || [t];
    return (w.QUIZ || []).filter(function (q) { return G.indexOf(q.t) >= 0; });
  }
  function cramOpen(t, from) {
    var U = w.NursinUI; if (!U || !U.openSheet) return;
    var NL = w.NLESSONS || {}, S = (NL.subjects && NL.subjects[t]) || {}, fr = FR();
    var allQ = subjQ(t), wkMap = (w.Weak && w.Weak.items) ? w.Weak.items() : {};
    var wkQs = allQ.filter(function (q) { return !!wkMap[q.id]; });
    var hls = (w.NursinHL && w.NursinHL.all) ? w.NursinHL.all().filter(function (x) { return x.sj === t || x.pg === (S.page || ""); }) : [];
    var TR = w.TRICKS || {}, tKeys = Object.keys(TR).filter(function (k) { return k.indexOf(t + ":") === 0; });
    var h = '<div class="cram">';
    h += '<p class="small">' + esc(T("كل ما تحتاجه لمراجعة سريعة قبل الامتحان:", "Tout ce qu'il faut pour réviser vite avant l'examen :")) + '</p>';
    h += '<div class="cram-acts" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px">';
    if (wkQs.length) h += '<a class="btn pri" href="quiz.html?t=weak">🎯 ' + esc(T("تدرّب عأخطائك (" + wkQs.length + ")", "Tes erreurs (" + wkQs.length + ")")) + '</a>';
    h += '<a class="btn' + (wkQs.length ? "" : " pri") + '" href="quiz.html?t=' + encodeURIComponent(t) + '">⚡ ' + esc(T("كويز شامل (" + allQ.length + " سؤال)", "Quiz complet (" + allQ.length + " q)")) + '</a>';
    h += '</div>';
    if (wkQs.length) {
      h += '<h3>🎯 ' + esc(T("نقاط ضعفك بهالمادة", "Tes points faibles")) + '</h3><ul>' + wkQs.slice(0, 6).map(function (q) { return '<li><b>' + esc(q.q) + '</b><br><small>✅ ' + esc(q.o[q.a]) + '</small></li>'; }).join("") + '</ul>';
    }
    if (hls.length) {
      h += '<h3>🖍️ ' + esc(T("تعليماتك بالقلم (" + hls.length + ")", "Tes surlignages (" + hls.length + ")")) + '</h3><ul>' + hls.slice(0, 8).map(function (x) { return '<li><mark class="hlm hl-' + esc(x.c || "y") + '">' + esc(x.q) + '</mark></li>'; }).join("") + '</ul>';
    }
    if (tKeys.length) {
      h += '<h3>🧠 ' + esc(T("حِيَل الحفظ السريعة", "Astuces mémo")) + '</h3>';
      tKeys.forEach(function (lk) { (TR[lk] || []).forEach(function (tr) { var s = fr && tr.fr ? tr.fr : tr; h += '<div class="qcard" style="margin:8px 0;padding:10px"><b>' + esc(s.t) + '</b><p class="small" style="margin:4px 0">' + esc(s.m) + '</p></div>'; }); });
    }
    if (!wkQs.length && !hls.length && !tKeys.length) {
      h += '<p class="small">' + esc(T("ابدأ بحلّ الكويز أو تعليم الكلمات المهمة بالقلم لتتجمع خلاصتك هنا تلقائياً.", "Commence par le quiz ou surligne des mots clés pour voir ton résumé ici.")) + '</p>';
    }
    h += '</div>';
    U.openSheet("cramsh", "🌙 " + T("مراجعة ليلة الامتحان", "Révision express") + " · " + T(S.ar || t, S.fr || t), h, from);
  }
  function addCramBtn() {
    var t = pageSubj(); if (!t) return;
    var tabs = d.querySelector(".lawtabs");
    if (tabs && !tabs.querySelector("[data-cram]")) {
      var b = d.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("data-cram", t);
      b.textContent = T("🌙 مراجعة ليلة الامتحان", "🌙 Révision express");
      b.addEventListener("click", function () { cramOpen(t, b); });
      tabs.appendChild(b);
    }
    // ⚡ خلاصة ٣٠ ثانية تلقائية بآخر كل درس (إذا توفرت حيل حفظ أو نقاط بارزة)
    var TR = w.TRICKS || {};
    [].slice.call(d.querySelectorAll("details.topic[id]")).forEach(function (det) {
      var bd = det.querySelector(".tbody"); if (!bd || bd.querySelector(".cram30")) return;
      var baseId = t + ":" + det.id.replace(/-p\d+$/, ""), ts = TR[baseId] || [];
      var pts = [];
      if (ts.length) ts.forEach(function (tr) { var s = FR() && tr.fr ? tr.fr : tr; pts.push("<b>" + esc(s.t) + ":</b> " + esc(s.m)); });
      else {
        [].slice.call(bd.querySelectorAll("li > b")).slice(0, 5).forEach(function (bEl) {
          var txt = (bEl.parentElement && bEl.parentElement.textContent || "").trim();
          if (txt.length > 8 && txt.length < 180) pts.push(esc(txt));
        });
      }
      if (!pts.length) return;
      var box = d.createElement("div"); box.className = "cram30 qcard"; box.style.marginTop = "12px";
      box.innerHTML = '<b>⚡ ' + esc(T("خلاصة ٣٠ ثانية", "Résumé en 30 sec")) + '</b><ul class="mlist" style="margin:6px 0 0">' + pts.slice(0, 5).map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>";
      bd.appendChild(box);
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(addCramBtn, 120); });
  else setTimeout(addCramBtn, 120);
})(window, document);
