/* 💊 pharma.html: بطاقات الأدوية من window.PHARMA (assets/pharma-data.js) — مقسّمة بمجموعات، مع بحث (اسم تجاري، اسم علمي، عائلة، دواعي، عربي أو فرنسي). */
(function (w, d) {
  var P = w.PHARMA || {}, G = P.groups || [], D = P.drugs || [];
  var box = d.getElementById("pharmalist");
  if (!box || !D.length) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[\u064B-\u0652\u0640]/g, "").replace(/œ/g, "oe").replace(/[’']/g, " ");
  }
  var F = [["fam", "🏷️", "Famille / Nom générique", "الاسم العلمي والعائلي"], ["act", "⚙️", "Action", "فعالية الدواء"], ["ind", "✅", "Indication", "دواعي الاستعمال"], ["ci", "⛔", "Contre-indication", "موانع الاستعمال"], ["surv", "👩‍⚕️", "Surveillance et rôle infirmier", "المتابعة التمريضية"], ["eff", "⚠️", "Effet secondaire", "الآثار الجانبية"]];
  function li(it) { return "<li>" + (it[0] ? '<span class="dfr" lang="fr" dir="ltr">' + esc(it[0]) + "</span>" : "") + (it[1] ? '<span class="dar">' + esc(it[1]) + "</span>" : "") + "</li>"; }
  function card(x) {
    var head = x.fam && x.fam[0] ? x.fam[0] : null, act = x.act && x.act[0] ? x.act[0] : null;
    var sub = [head && head[0], act && act[0]].filter(Boolean).join(" · ");
    var txt = [x.n.join(" "), x.note]; F.forEach(function (f) { (x[f[0]] || []).forEach(function (it) { txt.push(it[0], it[1]); }); });
    return '<article class="drug" id="d' + x.p + '" data-s="' + esc(norm(txt.join(" "))) + '"><div class="dh"><h3 lang="fr" dir="ltr">💊 ' + esc(x.n.join(" / ")) + '</h3><p class="dsub" lang="fr" dir="ltr">' + esc(sub) + "</p></div>" +
      (x.note ? '<p class="dnote">' + esc(x.note) + "</p>" : "") +
      F.map(function (f) { var a = x[f[0]] || []; return a.length ? '<div class="dsec"><h4>' + f[1] + ' <span lang="fr" dir="ltr">' + f[2] + "</span> <small>" + f[3] + '</small></h4><ul class="dl">' + a.map(li).join("") + "</ul></div>" : ""; }).join("") +
      '<p class="dpg small">📄 صفحة ' + x.p + " بالملف</p></article>";
  }
  box.innerHTML = G.map(function (g, i) {
    var a = D.filter(function (x) { return x.g === g.k; });
    if (!a.length) return "";
    return '<details class="topic phg" id="g-' + g.k + '"' + (i === 0 ? " open" : "") + '><summary><span class="n">' + g.e + '</span><span class="t"><b>' + esc(g.n) + ' <span class="phn">(' + a.length + ')</span></b><span class="small" lang="fr" dir="ltr">' + esc(g.fr) + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody drugs">' + a.map(card).join("") + "</div></details>";
  }).join("");
  var q = d.getElementById("phq"), cnt = d.getElementById("phcount"), chips = d.getElementById("phchips"), cur = "";
  if (chips) chips.innerHTML = '<button class="chip on" type="button" data-g="">الكل (' + D.length + ")</button>" + G.map(function (g) { var n = D.filter(function (x) { return x.g === g.k; }).length; return n ? '<button class="chip" type="button" data-g="' + g.k + '">' + g.e + " " + esc(g.n) + " (" + n + ")</button>" : ""; }).join("");
  function run() {
    var t = norm(q ? q.value : "").trim(), words = t.split(/\s+/).filter(Boolean), shown = 0;
    [].forEach.call(box.querySelectorAll("details.phg"), function (g) {
      var k = g.id.slice(2), n = 0;
      [].forEach.call(g.querySelectorAll(".drug"), function (c) {
        var s = c.getAttribute("data-s"), ok = (!cur || cur === k) && words.every(function (w2) { return s.indexOf(w2) > -1; });
        c.hidden = !ok; if (ok) n++;
      });
      g.hidden = !n; shown += n;
      if ((words.length || cur) && n) g.open = true;
    });
    if (cnt) cnt.textContent = words.length || cur ? (shown ? "لقيت " + shown + " دوا" : "ما لقيت شي 🤔 جرّب اسم تاني (تجاري أو علمي)") : D.length + " دوا من الملف";
  }
  if (q) q.addEventListener("input", run);
  if (chips) chips.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-g]"); if (!b) return;
    cur = b.getAttribute("data-g"); [].forEach.call(chips.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); }); run();
  });
  run();
  if (location.hash) { var t = d.getElementById(location.hash.slice(1)); if (t) { var g = t.closest ? t.closest("details") : null; if (g) g.open = true; if (t.tagName === "DETAILS") t.open = true; } }
})(window, document);
