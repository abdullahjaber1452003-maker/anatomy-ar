/* 📚 geri.html / community.html / medsurg.html (Oct 30 2026): one renderer for the new مواد, same drawing as rea.js / quality.js.
   <div class="sublessons" data-var="GERI" data-t="geri"> → the lessons of window.GERI (assets/geri-data.js), each a <details class="topic">
   with its «📝 كويز على هالدرس», then ✂️ splitPage (assets/lessons.js). medsurg.html also gets #msgroup: the lessons of القلب /
   الأعصاب / Henderson straight from NLESSONS, linking to their own pages and anchors (URLs, ids and progress unchanged). */
(function (w, d) {
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
      return '<details class="topic" id="' + x.k + '"' + (i === 0 && L.length === 1 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + x.n + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '</div></details>' + lq(t, x.k);
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
})(window, document);
