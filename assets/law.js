/* ⚖️ law.html: بيرسم الدروس من window.LAW (assets/law-data.js) + اختيار الدرس لـ «كويز متل الصف». */
(function (w, d) {
  var L = (w.LAW || {}).lessons || [], S = (w.LAW || {}).soon || [];
  var box = d.getElementById("lawlessons");
  if (box && L.length) {
    box.innerHTML = L.map(function (x, i) {
      return '<details class="topic" id="' + x.k + '"' + (i === 0 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + x.n + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '</div></details>';
    }).join("") + S.map(function (x) { return '<div class="lsoon"><b>🔜 ' + x.n + ' — قريباً</b><p class="small">' + (x.d || "") + '</p></div>'; }).join("");
  }
  var pick = d.getElementById("cqpick"), cq = d.getElementById("cqbox");
  var withQ = L.filter(function (x) { return (x.cq || []).length; });
  if (pick && cq && withQ.length > 1) {
    pick.innerHTML = withQ.map(function (x, i) { return '<button class="chip' + (i === 0 ? " on" : "") + '" type="button" data-k="' + x.k + '">' + x.n + '</button>'; }).join("");
    pick.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-k]"); if (!b) return;
      pick.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      cq.setAttribute("data-lesson", b.getAttribute("data-k"));
      if (w.NursinPractice) w.NursinPractice.classQuiz(cq, b.getAttribute("data-k"));
    });
  }
})(window, document);
