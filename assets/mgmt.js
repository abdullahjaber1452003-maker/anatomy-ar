/* 🏢 mgmt.html: بيرسم دروس الإدارة من window.MGMT (assets/mgmt-data.js). */
(function (w, d) {
  var M = w.MGMT || {}, L = M.lessons || [], S = M.soon || [];
  var box = d.getElementById("mgmtlessons");
  if (!box || !L.length) return;
  box.innerHTML = L.map(function (x, i) {
    return '<details class="topic" id="' + x.k + '"' + (i === 0 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + x.n + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '<p><a class="quizlink" href="quiz.html?t=mgmt">📝 كويز الإدارة</a></p></div></details>';
  }).join("") + S.map(function (s) { return '<div class="lsoon"><b>🔜 ' + s.n + ' — قريباً</b><p class="small">' + (s.d || "") + '</p></div>'; }).join("");
  if (location.hash) { var t = d.getElementById(location.hash.slice(1)); if (t && t.tagName === "DETAILS") { t.open = true; } }
})(window, document);
