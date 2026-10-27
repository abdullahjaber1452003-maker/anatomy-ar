/* ✅ quality.html: بيرسم دروس «الجودة والاعتماد» من window.QUALITY (assets/quality-data.js). */
(function (w, d) {
  var M = w.QUALITY || {}, L = M.lessons || [], S = M.soon || [];
  // 📝 «كويز على هالدرس» تحت كل درس (مادة ← دروسها): أسئلة هالدرس بس (q.l)، وإذا أقل من ٣ الكويز بيقول «ما في أسئلة كافية» وبيعرض كويز المادة كلّها
  function lq(t, k) {
    var n = (w.QUIZ || []).filter(function (q) { return q.t === t && q.l === k; }).length;
    var c = n === 1 ? "سؤال واحد" : n === 2 ? "سؤالين" : n <= 10 ? n + " أسئلة" : n + " سؤال";
    return '<p class="lqz"><a href="quiz.html?t=' + t + '&amp;l=' + k + '">📝 كويز على هالدرس</a> <small>' + (n >= 3 ? c : n ? c + " · ما في أسئلة كافية بعد" : "ما في أسئلة كافية لهالدرس بعد") + '</small></p>';
  }
  var box = d.getElementById("qualitylessons");
  if (!box || !L.length) return;
  box.innerHTML = L.map(function (x, i) {
    return '<details class="topic" id="' + x.k + '"' + (i === 0 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + x.n + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '</div></details>' + lq("quality", x.k);
  }).join("") + S.map(function (s) { return '<div class="lsoon"><b>🔜 ' + s.n + ' — قريباً</b><p class="small">' + (s.d || "") + '</p></div>'; }).join("");
  if (w.NursinLessons && w.NursinLessons.splitPage) w.NursinLessons.splitPage();   // ✂️ long lessons → «الجزء 1 / 2 …» (assets/lessons.js)
  if (location.hash) { var t = d.getElementById(location.hash.slice(1)); if (t && t.tagName === "DETAILS") { t.open = true; } }
})(window, document);
