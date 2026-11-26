/* 📜 دورات شهادة الإجازة الفنية (LT) الرسمية — العناية التمريضية (PRO)
   ES5-safe (iOS 12+). Gated by window.NursinPro.canUse(). */
(function (w, d) {
  "use strict";

  var YEARS = [2024, 2023, 2022, 2021, 2020, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
  var SUBJS = [
    { k: "all", e: "📚", ar: "كل المواد" },
    { k: "cardio", e: "❤️", ar: "القلب" },
    { k: "neuro", e: "🧠", ar: "الأعصاب" },
    { k: "rea", e: "🚑", ar: "الإنعاش (Réa)" },
    { k: "pharma", e: "💊", ar: "الأدوية" },
    { k: "comm", e: "🏘️", ar: "صحة المجتمع" },
    { k: "henderson", e: "🧩", ar: "Henderson" },
    { k: "mgmt", e: "🏢", ar: "الإدارة" },
    { k: "quality", e: "✅", ar: "الجودة" },
    { k: "law", e: "⚖️", ar: "القانون" },
    { k: "geri", e: "👴", ar: "الشيخوخة" }
  ];

  var st = { tab: "archive", year: "all", round: "all", subj: "all", view: "" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function css() {
    if (d.getElementById("ltcss")) return;
    var s = d.createElement("style");
    s.id = "ltcss";
    s.textContent =
      ".ltcard{background:var(--card,#fff);border:1px solid rgba(127,127,127,.22);border-radius:16px;padding:15px;margin-bottom:14px}" +
      ".lthd{margin:0 0 6px;font-size:19px;font-weight:800}" +
      ".ltprobadge{display:inline-block;padding:2px 9px;border-radius:999px;background:linear-gradient(135deg,#0f766e,#16a34a);color:#fff;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle}" +
      ".lttabs{display:flex;gap:6px;padding:5px;margin:0 0 12px;border-radius:14px;background:rgba(127,127,127,.12)}" +
      ".lttab{flex:1;padding:9px 10px;border:0;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;background:transparent;color:inherit}" +
      ".lttab.on{background:#0f766e;color:#fff}" +
      ".ltchips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}" +
      ".ltchip{padding:5px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit;cursor:pointer;font-size:12.5px;font-weight:600}" +
      ".ltchip.on{background:#0f766e;color:#fff;border-color:#0f766e}" +
      ".ltsrc{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:10px 0}" +
      ".ltsrc a{display:block;padding:12px;border-radius:14px;border:1px solid rgba(15,118,110,.28);background:rgba(15,118,110,.07);text-decoration:none;color:inherit}" +
      ".ltsrc a b{display:block;font-size:14.5px;margin-bottom:3px;color:var(--pri,#0f766e)}" +
      ".ltsrc a small{display:block;font-size:12px;opacity:.82;line-height:1.5}" +
      ".ltgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}" +
      ".ltbtn{display:flex;flex-direction:column;gap:3px;padding:11px;border-radius:13px;border:1px solid rgba(127,127,127,.22);background:var(--card,#fff);text-decoration:none;color:inherit}" +
      ".ltbtn b{font-size:14px}.ltbtn small{font-size:11.5px;opacity:.78}" +
      ".ltitem{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.2);margin:6px 0}" +
      ".ltpdf{width:100%;height:70vh;border:1px solid rgba(127,127,127,.25);border-radius:12px;margin-top:10px}";
    (d.head || d.body).appendChild(s);
  }

  function render(root) {
    css();
    if (w.NursinPro && !w.NursinPro.canUse()) {
      root.innerHTML =
        '<div class="ltcard" style="text-align:center;padding:24px 16px">' +
        '<h2 class="lthd">🔒 دورات شهادة LT الرسمية (تمريض) <span class="ltprobadge">PRO</span></h2>' +
        '<p class="small" style="max-width:480px;margin:8px auto 14px;line-height:1.7">أرشيف دورات الامتحانات الرسمية لشهادة الإجازة الفنية <b>LT — العناية التمريضية</b> (٢٠٠٩ → ٢٠٢٤، الدورتين الأولى والثانية) + محاكي الامتحان الرسمي (/20) متوفّر حصراً ضمن باقة <b>Pro ($4 / شهر)</b> عبر Whish Money.</p>' +
        '<p style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
        '<button type="button" class="btn pri" id="ltprogo">⭐ فعّل Pro ($4/شهر)</button>' +
        '<a class="btn" href="index.html">🏠 رجوع للرئيسية</a>' +
        '</p></div>';
      var pg = d.getElementById("ltprogo");
      if (pg) pg.onclick = function () { w.NursinPro.open("دورات شهادة LT الرسمية (تمريض)"); };
      return;
    }

    var pdfs = (w.LT_EXAMS_PDF || []).filter(function (x) {
      if (st.year !== "all" && String(x.y) !== String(st.year)) return false;
      if (st.round !== "all" && String(x.r) !== String(st.round)) return false;
      if (st.subj !== "all" && x.s !== st.subj) return false;
      return true;
    });

    var tabsHtml =
      '<div class="lttabs">' +
      '<button type="button" class="lttab' + (st.tab === "archive" ? " on" : "") + '" data-lttab="archive">📂 دورات LT الرسمية (٢٠٠٩–٢٠٢٤)</button>' +
      '<button type="button" class="lttab' + (st.tab === "sim" ? " on" : "") + '" data-lttab="sim">🎯 محاكي امتحان LT الرسمي</button>' +
      '</div>';

    var bodyHtml = "";
    if (st.tab === "archive") {
      var yearChips =
        '<button type="button" class="ltchip' + (st.year === "all" ? " on" : "") + '" data-lty="all">كل السنوات</button>' +
        YEARS.map(function (y) {
          return '<button type="button" class="ltchip' + (String(st.year) === String(y) ? " on" : "") + '" data-lty="' + y + '">' + y + '</button>';
        }).join("");

      var roundChips =
        '<button type="button" class="ltchip' + (st.round === "all" ? " on" : "") + '" data-ltr="all">الدورتين</button>' +
        '<button type="button" class="ltchip' + (st.round === "1" ? " on" : "") + '" data-ltr="1">الدورة الأولى</button>' +
        '<button type="button" class="ltchip' + (st.round === "2" ? " on" : "") + '" data-ltr="2">الدورة الثانية</button>';

      var localHtml = "";
      if (pdfs.length) {
        localHtml =
          '<div class="ltcard"><h3 style="margin:0 0 8px;font-size:16px">📄 ملفات الدورات المرفوعة مباشرة بالموقع (' + pdfs.length + ')</h3>' +
          pdfs.map(function (x) {
            return '<div class="ltitem"><div><b>' + esc(x.t) + '</b><div class="small">سنة ' + esc(x.y) + ' · الدورة ' + (x.r === 2 ? 'الثانية' : 'الأولى') + '</div></div>' +
              '<div style="display:flex;gap:6px">' +
              '<button type="button" class="btn sm pri" data-ltview="' + esc(x.file) + '">👁️ عرض</button>' +
              '<a class="btn sm" href="' + esc(x.file) + '" target="_blank" rel="noopener">⬇️ PDF</a>' +
              '</div></div>';
          }).join("") +
          (st.view ? '<iframe class="ltpdf" src="' + esc(st.view) + '"></iframe>' : "") +
          '</div>';
      }

      var afakUrl = "https://alafak.me/oldexams/" + (st.year !== "all" ? "?year=" + encodeURIComponent(st.year) : "");
      bodyHtml =
        '<div class="ltcard">' +
        '<h2 class="lthd">📜 أرشيف دورات شهادة LT — العناية التمريضية <span class="ltprobadge">PRO</span></h2>' +
        '<p class="small" style="margin:0 0 10px">اختار السنة والدورة لتفتح دورات الامتحانات الرسمية فوراً (معتمد من أرشيف <b>معاهد الآفاق الجامعية</b> والمديرية العامة للتعليم المهني والتقني).</p>' +
        '<div class="ltchips">' + yearChips + '</div>' +
        '<div class="ltchips">' + roundChips + '</div>' +
        '<div class="ltsrc">' +
        '<a href="' + afakUrl + '" target="_blank" rel="noopener">' +
        '<b>🏛️ أرشيف معاهد الآفاق (' + (st.year === "all" ? "٢٠٠٩–٢٠٢٤" : "دورة " + st.year) + ') ↗</b>' +
        '<small>اختار: العام <b>' + (st.year === "all" ? "المطلوب" : st.year) + '</b> ← المستوى: <b>الإجازة الفنية LT</b> ← الاختصاص: <b>العناية التمريضية</b> ← المرحلة: <b>' + (st.round === "2" ? "الثانية" : st.round === "1" ? "الأولى" : "الأولى / الثانية") + '</b>.</small>' +
        '</a>' +
        '<a href="https://www.itotas.com/past-exams" target="_blank" rel="noopener">' +
        '<b>🏫 أرشيف معهد طرابلس الفني (ITOTAS) ↗</b>' +
        '<small>اختار: المستوى <b>الاجازة الفنية (LT)</b> ← الاختصاص: <b>العناية التمريضية (أ17 / أ71)</b> — دورات ٢٠٠٩ حتى ٢٠٢٤.</small>' +
        '</a>' +
        '<a href="https://web.vte.gov.lb/%D8%AF%D9%88%D8%B1%D8%A7%D8%AA-%D8%A7%D9%84%D8%A7%D9%85%D8%AA%D8%AD%D8%A7%D9%86%D8%A7%D8%AA-%D9%84%D9%84%D8%B4%D9%87%D8%A7%D8%AF%D8%A7%D8%AA-%D8%A7%D9%84%D8%B1%D8%B3%D9%85%D9%8A%D8%A9-%D8%A7%D9%84/" target="_blank" rel="noopener">' +
        '<b>🇱🇧 المديرية العامة للتعليم المهني (VTE) ↗</b>' +
        '<small>صفحة الدورات السابقة والتعاميم الرسمية وتحديد مواد الامتحانات الرسمية للـ LT.</small>' +
        '</a>' +
        '</div></div>' +
        localHtml;
    } else {
      bodyHtml =
        '<div class="ltcard">' +
        '<h2 class="lthd">🎯 محاكي امتحان شهادة LT الرسمي <span class="ltprobadge">PRO</span></h2>' +
        '<p class="small" style="margin:0 0 10px">تدرّب بنظام الامتحان الرسمي (أسئلة اختيار متعدّد + حالات سريرية + تصحيح كتابي من ٢٠ مع الأستاذ عثمان):</p>' +
        '<p style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px">' +
        '<a class="btn pri" href="exam-prep.html">✍️ مصحّح الامتحان الكتابي الرسمي (/20)</a>' +
        '<a class="btn" href="quiz.html?t=all&amp;n=25">📝 امتحان LT شامل (٢٥ سؤال + اختيار متعدّد)</a>' +
        '</p>' +
        '<div class="ltgrid">' +
        SUBJS.filter(function (x) { return x.k !== "all"; }).map(function (x) {
          return '<a class="ltbtn" href="quiz.html?t=mid&amp;s=' + esc(x.k) + '">' +
            '<b>' + x.e + ' ' + esc(x.ar) + '</b>' +
            '<small>امتحان كامل بالمادة ←</small>' +
            '</a>';
        }).join("") +
        '</div></div>';
    }

    root.innerHTML = tabsHtml + bodyHtml;

    [].forEach.call(root.querySelectorAll("[data-lttab]"), function (b) {
      b.onclick = function () { st.tab = b.getAttribute("data-lttab"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-lty]"), function (b) {
      b.onclick = function () { st.year = b.getAttribute("data-lty"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltr]"), function (b) {
      b.onclick = function () { st.round = b.getAttribute("data-ltr"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltview]"), function (b) {
      b.onclick = function () { st.view = b.getAttribute("data-ltview"); render(root); };
    });
  }

  function boot() {
    var r = d.getElementById("lt-app");
    if (!r) return;
    d.addEventListener("nursin:pro", function () { render(r); });
    render(r);
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
