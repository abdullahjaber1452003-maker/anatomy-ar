/* 📜 دورات شهادة الإجازة الفنية (LT) الرسمية — العناية التمريضية (PRO)
   ES5-safe (iOS 12+). Gated by window.NursinPro.canUse().
   Includes: ALL 174 exams (2009–2024, ZERO ZIP/RAR!) + Arabic-first reader + instant & Osman model solutions + 78 Interactive Official MCQs (2023+2024) & 6 Written Cases. */
(function (w, d) {
  "use strict";

  var YEARS = [2024, 2023, 2022, 2021, 2020, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
  var L4 = "abcd", SOL_K = "nursin_lt_sol_v1";
  var st = {
    tab: "archive",
    year: "2024",
    round: "all",
    search: "",
    view: "",
    viewTitle: "",
    docId: "",
    docLang: "ar",
    solId: "",
    solBusy: false,
    qYear: "2024",
    qKey: "2024_med",
    qi: 0,
    score: 0,
    ans: {},
    mPick: [],
    showCase: false
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function isMulti(q) { return !!(q && (Array.isArray(q.a) || q.multi)); }
  function ansArr(q) { return Array.isArray(q.a) ? q.a.slice().sort(function (a, b) { return a - b; }) : [q.a]; }
  function isOk(q, k) {
    if (!isMulti(q)) return k === q.a;
    if (!Array.isArray(k)) return false;
    var a = ansArr(q);
    if (k.length !== a.length) return false;
    var ks = k.slice().sort(function (x, y) { return x - y; });
    for (var i = 0; i < a.length; i++) if (ks[i] !== a[i]) return false;
    return true;
  }
  function ansLet(q) { return ansArr(q).map(function (i) { return L4.charAt(i); }).join(" + "); }

  function keysForYear(yr) {
    var Q = w.LT_EXAMS_QUIZ || {};
    return Object.keys(Q).filter(function (k) {
      if (yr === "all") return true;
      return k.indexOf(yr + "_") === 0;
    });
  }

  function totalQuizCount(yr) {
    var Q = w.LT_EXAMS_QUIZ || {}, n = 0;
    keysForYear(yr).forEach(function (k) { n += (Q[k].qs || []).length; });
    return n;
  }

  function getExamSet(key) {
    var Q = w.LT_EXAMS_QUIZ || {};
    if (key === "all_year") {
      var all = [], ks = keysForYear(st.qYear);
      ks.forEach(function (k) {
        (Q[k].qs || []).forEach(function (q) { all.push(q); });
      });
      var lbl = st.qYear === "all" ? "2023 + 2024" : "دورة " + st.qYear;
      return { title: "🏆 امتحان " + lbl + " الشامل (" + all.length + " سؤال)", qs: all, caseStudy: null };
    }
    return Q[key] || { title: "دورة رسمية", qs: [], caseStudy: null };
  }

  function matchBuiltInQuiz(item) {
    var Q = w.LT_EXAMS_QUIZ || {};
    if (!item || (item.y !== 2024 && item.y !== 2023) || item.r !== 1) return null;
    var t = String(item.t || "");
    var map = [
      ["الطبية", "med"], ["الطبيه", "med"],
      ["الجراحية", "surg"], ["الجراحيه", "surg"],
      ["الطارئة", "rea"], ["الطارئه", "rea"], ["المركزة", "rea"], ["المركّزة", "rea"],
      ["الجماعية", "comm"], ["الجماعيه", "comm"], ["الوقائية", "comm"],
      ["إدارة", "mgmt"], ["ادارة", "mgmt"], ["الجودة", "mgmt"],
      ["العقلية", "psych"], ["العقليه", "psych"],
      ["القانون", "law"],
      ["الشيخوخة", "geri"]
    ];
    for (var i = 0; i < map.length; i++) {
      if (t.indexOf(map[i][0]) > -1) {
        var k = item.y + "_" + map[i][1];
        if (Q[k]) return Q[k];
      }
    }
    return null;
  }

  function formatBuiltInSolution(ex) {
    var lines = ["🏆 الحل النموذجي الرسمي — " + ex.title, ""];
    lines.push("أولاً: إجابات الاختيار من متعدّد (MCQ):");
    (ex.qs || []).forEach(function (q, idx) {
      var ansTxt = ansArr(q).map(function (i) { return q.o[i]; }).join(" + ");
      lines.push((idx + 1) + ") " + q.q);
      lines.push("   ✅ الجواب الصح: " + ansTxt);
      if (q.x) lines.push("   💡 الشرح: " + q.x);
    });
    if (ex.caseStudy) {
      lines.push("");
      lines.push("ثانياً: حل دراسة الحالة الرسمية:");
      (ex.caseStudy.qs || []).forEach(function (it, idx) {
        lines.push((idx + 1) + ") " + it.q);
        lines.push("   ✅ " + it.a);
      });
    }
    return lines.join("\n");
  }

  function solveExam(root, item) {
    var cache = lsGet(SOL_K) || {}, key = item.file;
    st.solId = key;
    var built = matchBuiltInQuiz(item);
    if (built) {
      cache[key] = formatBuiltInSolution(built);
      lsSet(SOL_K, cache);
      st.solBusy = false;
      render(root);
      return;
    }
    if (cache[key]) { st.solBusy = false; render(root); return; }
    var ep = w.NursinAsk && w.NursinAsk.API ? w.NursinAsk.API : "";
    if (!ep) { st.solBusy = false; return; }
    var DOCS = w.LT_EXAMS_DOCS || {}, docObj = DOCS[key] || null;
    var examText = docObj ? (docObj.ar || docObj.full || "").slice(0, 6500) : "";
    st.solBusy = true;
    render(root);
    var prompt = examText
      ? "إنت الأستاذ عثمان، مدرّس تمريض LT بلبنان على موقع nursin.store. هي دورة شهادة LT رسمية (" + item.t + "). حلّ كل أسئلة هالدورة بشكل مرتّب وواضح بالعربي (مع المصطلحات الطبية الفرنسية/الإنكليزية بين قوسين) وبناءً على منهاج التمريض اللبناني ودروس الموقع. بلا نجوم (**)، استخدم أرقام واضحة وعلامة ✅ جنب كل جواب:\n\n" + examText
      : "إنت الأستاذ عثمان، مدرّس تمريض LT بلبنان على موقع nursin.store. الطالب فاتح دورة رسمية (" + item.t + "). اعطيه الحل النموذجي وأهم النقاط والمحاور والأجوبة المعتمدة بهالمادة بـ LT لبنان بناءً على دروس الموقع، مرتّبة بنقاط واضحة بالعربي مع المصطلحات الطبية الأساسية وبلا نجوم.";
    w.fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", text: prompt }], context: w.Osman && w.Osman.persona ? w.Osman.persona() : "" })
    })
      .then(function (r) { if (!r.ok) throw 1; return r.json(); })
      .then(function (j) {
        var txt = j && j.text ? String(j.text).replace(/\*\*?/g, "").trim() : "";
        if (!txt) throw 1;
        var c2 = lsGet(SOL_K) || {};
        c2[key] = txt;
        var ks = Object.keys(c2);
        if (ks.length > 40) delete c2[ks[0]];
        lsSet(SOL_K, c2);
        st.solBusy = false;
        render(root);
      })
      .catch(function () {
        st.solBusy = false;
        var c2 = lsGet(SOL_K) || {};
        c2[key] = "⚠️ تعذّر الاتصال مؤقتاً لجلب الحل — جرّب اكبس «🏆 الحل النموذجي» مرّة تانية.";
        lsSet(SOL_K, c2);
        render(root);
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
      ".ltchip{padding:6px 11px;border-radius:999px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit;cursor:pointer;font-size:12.5px;font-weight:600}" +
      ".ltchip.on{background:#0f766e;color:#fff;border-color:#0f766e}" +
      ".ltsearch{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;font-size:14px;margin:6px 0}" +
      ".ltsrc{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:10px 0}" +
      ".ltsrc a{display:block;padding:12px;border-radius:14px;border:1px solid rgba(15,118,110,.28);background:rgba(15,118,110,.07);text-decoration:none;color:inherit}" +
      ".ltsrc a b{display:block;font-size:14.5px;margin-bottom:3px;color:var(--pri,#0f766e)}" +
      ".ltsrc a small{display:block;font-size:12px;opacity:.82;line-height:1.5}" +
      ".ltitem{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.2);margin:6px 0}" +
      ".ltpdf{width:100%;height:70vh;border:1px solid rgba(127,127,127,.25);border-radius:12px;margin-top:8px}" +
      ".ltdocbody{white-space:pre-wrap;font-size:14.5px;line-height:1.8;padding:12px;border-radius:12px;background:rgba(127,127,127,.06);border:1px solid rgba(127,127,127,.18);max-height:60vh;overflow:auto;margin:8px 0}" +
      ".ltsolbox{white-space:pre-wrap;font-size:14px;line-height:1.8;padding:12px;border-radius:12px;background:rgba(22,163,74,.09);border:1px solid rgba(22,163,74,.32);margin-top:10px}" +
      ".ltopt{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:right;padding:11px 12px;margin:6px 0;border-radius:12px;border:1.5px solid rgba(127,127,127,.28);background:var(--card,#fff);color:inherit;font:inherit;font-size:14.5px;cursor:pointer}" +
      ".ltopt .l{flex:0 0 24px;height:24px;border-radius:50%;background:rgba(127,127,127,.14);display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12.5px}" +
      ".ltopt.msel{border-color:#0f766e;background:rgba(15,118,110,.14);box-shadow:0 0 0 2px rgba(15,118,110,.2)}" +
      ".ltopt.ok{border-color:#16a34a;background:rgba(22,163,74,.14)}" +
      ".ltopt.bad{border-color:#dc2626;background:rgba(220,38,38,.12)}" +
      ".ltfb{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.65;background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.3)}" +
      ".ltfb.w{background:rgba(220,38,38,.09);border-color:rgba(220,38,38,.3)}" +
      ".ltcase{padding:12px;border-radius:12px;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);margin:10px 0;font-size:14px;line-height:1.65}";
    (d.head || d.body).appendChild(s);
  }

  function renderQuizTab() {
    var Q = w.LT_EXAMS_QUIZ || {}, keys = keysForYear(st.qYear);
    if (st.qKey !== "all_year" && keys.indexOf(st.qKey) < 0) st.qKey = keys[0] || "all_year";
    var qYrChips =
      '<button type="button" class="ltchip' + (st.qYear === "2024" ? " on" : "") + '" data-ltqy="2024">🆕 دورة 2024 (' + totalQuizCount("2024") + ' سؤال)</button>' +
      '<button type="button" class="ltchip' + (st.qYear === "2023" ? " on" : "") + '" data-ltqy="2023">📜 دورة 2023 (' + totalQuizCount("2023") + ' سؤال)</button>' +
      '<button type="button" class="ltchip' + (st.qYear === "all" ? " on" : "") + '" data-ltqy="all">🏆 2023 + 2024 (' + totalQuizCount("all") + ' سؤال)</button>';
    var chips = '<button type="button" class="ltchip' + (st.qKey === "all_year" ? " on" : "") + '" data-ltqk="all_year">🏆 شامل (' + (st.qYear === "all" ? "كل السنوات" : st.qYear) + ')</button>' +
      keys.map(function (k) {
        return '<button type="button" class="ltchip' + (st.qKey === k ? " on" : "") + '" data-ltqk="' + esc(k) + '">' + esc(Q[k].title.split("—")[0].trim()) + '</button>';
      }).join("");

    var ex = getExamSet(st.qKey), qs = ex.qs || [];
    var okN = 0;
    qs.forEach(function (q, idx) { if (st.ans[idx] != null && isOk(q, st.ans[idx])) okN++; });
    var score20 = qs.length ? Math.round((20 * okN) / qs.length) : 0;

    var qHtml = "";
    if (!qs.length) {
      qHtml = '<p class="small">⏳ عم نحمّل أسئلة الدورة…</p>';
    } else if (st.qi >= qs.length) {
      qHtml =
        '<div style="text-align:center;padding:14px 6px">' +
        '<h3 style="margin:0 0 6px;font-size:22px">🏁 نتيجتك الرسمية: ' + score20 + '/20</h3>' +
        '<p class="small">جاوبت صح على <b>' + okN + '</b> من أصل <b>' + qs.length + '</b> سؤال من دورات LT الرسمية.</p>' +
        '<p style="margin-top:10px"><button type="button" class="btn pri" data-ltact="restart">🔄 أعد هالدورة</button></p>' +
        '</div>';
    } else {
      var q = qs[st.qi], picked = st.ans[st.qi], multi = isMulti(q), aa = ansArr(q);
      var pa = Array.isArray(picked) ? picked : (picked != null ? [picked] : []);
      var opts = q.o.map(function (o, k) {
        var c = picked == null ? (multi && st.mPick.indexOf(k) > -1 ? " msel" : "") : (aa.indexOf(k) > -1 ? " ok" : pa.indexOf(k) > -1 ? " bad" : "");
        return '<button type="button" class="ltopt' + c + '" data-ltopt="' + k + '"' + (picked != null ? " disabled" : "") + '><span class="l" dir="ltr">' + L4.charAt(k) + '</span><span>' + esc(o) + '</span></button>';
      }).join("");
      var subBtn = multi && picked == null ? '<p style="margin:8px 0 0"><button type="button" class="btn pri" data-ltact="msub"' + (st.mPick.length ? "" : " disabled") + '>✅ تأكيد الإجابة</button></p>' : "";
      var fb = "";
      if (picked != null) {
        var good = isOk(q, picked);
        var partial = !good && multi && pa.length && pa.every(function (x) { return aa.indexOf(x) > -1; });
        fb = '<div class="ltfb' + (good ? "" : " w") + '">' +
          (good ? (multi ? "✅ <b>صح! إجابة كاملة.</b> " : "✅ <b>صح!</b> ") : (partial ? "⚠️ <b>إجابتك ناقصة! الجواب الكامل الصح: " + ansLet(q) + "</b> — " : "❌ <b>الجواب الصح: " + ansLet(q) + "</b> — ")) +
          esc(q.x || "") + '</div>' +
          '<p style="margin:10px 0 0;text-align:left"><button type="button" class="btn pri" data-ltact="next">' + (st.qi + 1 < qs.length ? "السؤال التالي ←" : "شوف العلامة /20 🏁") + '</button></p>';
      }
      qHtml =
        '<p class="small" style="display:flex;justify-content:space-between;margin:6px 0"><span><b>' + esc(ex.title) + '</b></span><span>سؤال ' + (st.qi + 1) + '/' + qs.length + ' · ✅ ' + okN + '</span></p>' +
        (multi ? '<p style="display:inline-block;margin:0 0 6px;padding:3px 9px;border-radius:999px;background:rgba(15,118,110,.12);color:#0f766e;font-size:12px;font-weight:700">☑️ اختار كل الإجابات الصح (أكثر من خيار)</p>' : '') +
        '<p style="font-size:16px;font-weight:700;line-height:1.65;margin:4px 0 8px">' + esc(q.q) + '</p>' +
        opts + subBtn + fb;
    }

    var csHtml = "";
    if (ex.caseStudy) {
      var cs = ex.caseStudy;
      csHtml =
        '<div class="ltcard">' +
        '<h3 style="margin:0 0 6px;font-size:16.5px">🩺 دراسة الحالة الرسمية (' + esc(ex.title) + ')</h3>' +
        '<div class="ltcase"><p style="margin:0 0 6px"><b>👤 ' + esc(cs.pt) + '</b></p><p style="margin:0">📈 ' + esc(cs.v) + '</p></div>' +
        '<ol style="margin:8px 0;padding-inline-start:20px;line-height:1.7;font-size:14.5px">' +
        cs.qs.map(function (it) {
          return '<li style="margin:6px 0"><b>' + esc(it.q) + '</b>' + (st.showCase ? '<div style="margin-top:4px;padding:7px 10px;border-radius:10px;background:rgba(22,163,74,.1);font-size:13.5px">🏆 <b>الجواب النموذجي:</b> ' + esc(it.a) + '</div>' : '') + '</li>';
        }).join("") +
        '</ol>' +
        '<p style="margin:8px 0 0;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn pri sm" data-ltact="togcase">' + (st.showCase ? "🙈 إخفاء الأجوبة النموذجية" : "🏆 إظهار الأجوبة النموذجية الرسمية") + '</button>' +
        '<a class="btn sm" href="exam-prep.html">✍️ صحّح ورقتك (/20) مع عثمان</a>' +
        '</p></div>';
    }

    return '<div class="ltcard"><h2 class="lthd">🎯 أسئلة دورات LT الرسمية التفاعلية (2023 + 2024) <span class="ltprobadge">PRO</span></h2><p class="small" style="margin:0 0 6px">أسئلة حقيقية مستخرجة حرفياً من امتحانات 2023 و2024 الرسمية (مع اختيار متعدّد وعلامة /20):</p><div class="ltchips">' + qYrChips + '</div><div class="ltchips">' + chips + '</div><hr style="border:0;border-top:1px dashed rgba(127,127,127,.25);margin:10px 0">' + qHtml + '</div>' + csHtml;
  }

  function renderArchiveTab() {
    var allList = w.LT_EXAMS_PDF || [], byY = {};
    allList.forEach(function (x) { byY[x.y] = (byY[x.y] || 0) + 1; });

    var qTxt = String(st.search || "").trim().toLowerCase();
    var pdfs = allList.filter(function (x) {
      if (st.year !== "all" && String(x.y) !== String(st.year)) return false;
      if (st.round !== "all" && String(x.r) !== String(st.round)) return false;
      if (qTxt && String(x.t || "").toLowerCase().indexOf(qTxt) < 0) return false;
      return true;
    });

    var yearChips =
      '<button type="button" class="ltchip' + (st.year === "all" ? " on" : "") + '" data-lty="all">الكل (' + allList.length + ')</button>' +
      YEARS.map(function (y) {
        var cnt = byY[y] || 0;
        return '<button type="button" class="ltchip' + (String(st.year) === String(y) ? " on" : "") + '" data-lty="' + y + '">' + y + (cnt ? ' (' + cnt + ')' : '') + '</button>';
      }).join("");
    var roundChips =
      '<button type="button" class="ltchip' + (st.round === "all" ? " on" : "") + '" data-ltr="all">الدورتين</button>' +
      '<button type="button" class="ltchip' + (st.round === "1" ? " on" : "") + '" data-ltr="1">الدورة الأولى</button>' +
      '<button type="button" class="ltchip' + (st.round === "2" ? " on" : "") + '" data-ltr="2">الدورة الثانية</button>';

    var cache = lsGet(SOL_K) || {};
    var DOCS = w.LT_EXAMS_DOCS || {};

    var topCard = "";
    if (st.docId && DOCS[st.docId]) {
      var docObj = DOCS[st.docId];
      var showText = (st.docLang === "full" && docObj.full) ? docObj.full : (docObj.ar || docObj.full || "");
      var solTxt = st.solId === st.docId ? cache[st.docId] : "";
      topCard =
        '<div id="lt-viewer" class="ltcard" style="border-color:#0f766e">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
        '<b style="font-size:15.5px">📖 ' + esc(docObj.t) + '</b>' +
        '<button type="button" class="btn sm" data-ltclose="1">❌ إغلاق</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
        '<button type="button" class="ltchip' + (st.docLang === "ar" ? " on" : "") + '" data-ltlang="ar">🇱🇧 النسخة العربية</button>' +
        (docObj.full ? '<button type="button" class="ltchip' + (st.docLang === "full" ? " on" : "") + '" data-ltlang="full">🌐 النص الكامل</button>' : '') +
        '<button type="button" class="btn sm pri" data-ltsolve="' + esc(st.docId) + '">🏆 الحل النموذجي (بناءً على دروس الموقع)</button>' +
        '</div>' +
        '<div class="ltdocbody" dir="auto">' + esc(showText) + '</div>' +
        (st.solId === st.docId && st.solBusy ? '<div id="lt-solbox" class="ltsolbox">⏳ الأستاذ عثمان عم يحلّ هالدورة بناءً على دروس الموقع…</div>' : '') +
        (st.solId === st.docId && !st.solBusy && solTxt ? '<div id="lt-solbox" class="ltsolbox"><b>🏆 الحل النموذجي:</b>\n\n' + esc(solTxt) + '</div>' : '') +
        '</div>';
    } else if (st.view) {
      var solPdf = st.solId === st.view ? cache[st.view] : "";
      topCard =
        '<div id="lt-viewer" class="ltcard" style="border-color:#0f766e">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
        '<b style="font-size:15px">📄 ' + esc(st.viewTitle || "عرض الدورة") + '</b>' +
        '<button type="button" class="btn sm" data-ltclose="1">❌ إغلاق</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        '<a class="btn sm pri" href="' + esc(st.view) + '" target="_blank" rel="noopener">📱 فتح بملء الشاشة (الأفضل للآيفون)</a>' +
        '<button type="button" class="btn sm" data-ltsolve="' + esc(st.view) + '">🏆 الحل النموذجي</button>' +
        '</div>' +
        '<iframe class="ltpdf" src="' + esc(st.view) + '"></iframe>' +
        (st.solId === st.view && st.solBusy ? '<div id="lt-solbox" class="ltsolbox">⏳ الأستاذ عثمان عم يحضّرلك الحل النموذجي…</div>' : '') +
        (st.solId === st.view && !st.solBusy && solPdf ? '<div id="lt-solbox" class="ltsolbox"><b>🏆 الحل النموذجي:</b>\n\n' + esc(solPdf) + '</div>' : '') +
        '</div>';
    }

    var listHtml = pdfs.length
      ? pdfs.map(function (x) {
          var isPdf = x.kind === "pdf";
          var hasSol = !!matchBuiltInQuiz(x) || !!cache[x.file];
          var solLabel = hasSol ? "🏆 عرض الحل" : "🤖 حلّ الدورة";
          var btns = isPdf
            ? '<a class="btn sm pri" href="' + esc(x.file) + '" target="_blank" rel="noopener">👁️ فتح PDF</a>' +
              '<button type="button" class="btn sm" data-ltview="' + esc(x.file) + '" data-lttitle="' + esc(x.t) + '">🖥️ عرض هون</button>' +
              '<button type="button" class="btn sm" data-ltsolve="' + esc(x.file) + '">' + solLabel + '</button>'
            : '<button type="button" class="btn sm pri" data-ltdoc="' + esc(x.file) + '">📖 قراءة الدورة (عربي)</button>' +
              '<button type="button" class="btn sm" data-ltsolve="' + esc(x.file) + '">' + solLabel + '</button>';
          return '<div class="ltitem"><div><b>' + esc(x.t) + '</b><div class="small">سنة ' + esc(x.y) + ' · الدورة ' + (x.r === 2 ? 'الثانية' : 'الأولى') + (isPdf ? ' · PDF' : ' · نص عربي فوري') + '</div></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' + btns + '</div></div>';
        }).join("")
      : '<p class="small" style="margin:10px 0">ما في نتائج مطابقة — جرّب سنة تانية أو امسح البحث.</p>';

    var afakUrl = "https://alafak.me/oldexams/" + (st.year !== "all" ? "?year=" + encodeURIComponent(st.year) : "");
    return topCard +
      '<div class="ltcard"><h2 class="lthd">📂 كل الدورات الرسمية (٢٠٠٩–٢٠٢٤ · بدون ZIP) <span class="ltprobadge">PRO</span></h2>' +
      '<div class="ltchips">' + yearChips + '</div><div class="ltchips">' + roundChips + '</div>' +
      '<input type="search" class="ltsearch" id="ltsearch" placeholder="🔍 ابحث عن مادة (مثلاً: الجراحية، الطارئة، الشيخوخة، القانون)…" value="' + esc(st.search) + '">' +
      '<p class="small" style="margin:6px 0">المعروض: <b>' + pdfs.length + '</b> دورة جاهزة للفتح والحل</p>' +
      listHtml +
      '</div>' +
      '<div class="ltcard"><h3 style="margin:0 0 8px;font-size:15.5px">🔗 مصادر رسمية إضافية</h3>' +
      '<div class="ltsrc">' +
      '<a href="' + afakUrl + '" target="_blank" rel="noopener"><b>🏛️ أرشيف معاهد الآفاق ↗</b><small>أرشيف الدورات الرسمية.</small></a>' +
      '<a href="https://www.itotas.com/past-exams" target="_blank" rel="noopener"><b>🏫 معهد طرابلس الفني (ITOTAS) ↗</b><small>أرشيف 2009–2024.</small></a>' +
      '<a href="https://web.vte.gov.lb/%D8%AF%D9%88%D8%B1%D8%A7%D8%AA-%D8%A7%D9%84%D8%A7%D9%85%D8%AA%D8%AD%D8%A7%D9%86%D8%A7%D8%AA-%D9%84%D9%84%D8%B4%D9%87%D8%A7%D8%AF%D8%A7%D8%AA-%D8%A7%D9%84%D8%B1%D8%B3%D9%85%D9%8A%D8%A9-%D8%A7%D9%84/" target="_blank" rel="noopener"><b>🇱🇧 المديرية العامة للتعليم المهني (VTE) ↗</b><small>التعاميم والدورات.</small></a>' +
      '</div></div>';
  }

  function findByFile(f) {
    var list = w.LT_EXAMS_PDF || [];
    for (var i = 0; i < list.length; i++) if (list[i].file === f) return list[i];
    return null;
  }

  function render(root) {
    css();
    if (w.NursinPro && !w.NursinPro.canUse()) {
      root.innerHTML =
        '<div class="ltcard" style="text-align:center;padding:24px 16px">' +
        '<h2 class="lthd">🔒 دورات شهادة LT الرسمية (تمريض) <span class="ltprobadge">PRO</span></h2>' +
        '<p class="small" style="max-width:480px;margin:8px auto 14px;line-height:1.7">كل دورات شهادة الإجازة الفنية <b>LT — العناية التمريضية (2009–2024)</b> مع الحلول النموذجية والأسئلة التفاعلية متوفّرة حصراً ضمن باقة <b>Pro ($4 / شهر)</b> عبر Whish Money.</p>' +
        '<p style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"><button type="button" class="btn pri" id="ltprogo">⭐ فعّل Pro ($4/شهر)</button><a class="btn" href="index.html">🏠 رجوع للرئيسية</a></p></div>';
      var pg = d.getElementById("ltprogo");
      if (pg) pg.onclick = function () { w.NursinPro.open("دورات شهادة LT الرسمية (تمريض)"); };
      return;
    }

    var tabsHtml =
      '<div class="lttabs">' +
      '<button type="button" class="lttab' + (st.tab === "archive" ? " on" : "") + '" data-lttab="archive">📂 كل الدورات 2009–2024 (' + (w.LT_EXAMS_PDF || []).length + ')</button>' +
      '<button type="button" class="lttab' + (st.tab === "quiz" ? " on" : "") + '" data-lttab="quiz">🎯 كويز رسمي 2023+2024 (' + totalQuizCount("all") + ')</button>' +
      '</div>';

    root.innerHTML = tabsHtml + (st.tab === "quiz" ? renderQuizTab() : renderArchiveTab());

    [].forEach.call(root.querySelectorAll("[data-lttab]"), function (b) {
      b.onclick = function () { st.tab = b.getAttribute("data-lttab"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltqy]"), function (b) {
      b.onclick = function () {
        st.qYear = b.getAttribute("data-ltqy");
        var ks = keysForYear(st.qYear);
        st.qKey = st.qYear === "all" ? "all_year" : (ks[0] || "all_year");
        st.qi = 0; st.ans = {}; st.mPick = []; st.showCase = false; render(root);
      };
    });
    [].forEach.call(root.querySelectorAll("[data-ltqk]"), function (b) {
      b.onclick = function () { st.qKey = b.getAttribute("data-ltqk"); st.qi = 0; st.ans = {}; st.mPick = []; st.showCase = false; render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltopt]"), function (b) {
      b.onclick = function () {
        var ex = getExamSet(st.qKey), q = (ex.qs || [])[st.qi];
        if (!q || st.ans[st.qi] != null) return;
        var k = +b.getAttribute("data-ltopt");
        if (isMulti(q)) {
          var ix = st.mPick.indexOf(k);
          if (ix > -1) st.mPick.splice(ix, 1); else st.mPick.push(k);
          render(root);
        } else {
          st.ans[st.qi] = k;
          render(root);
        }
      };
    });
    [].forEach.call(root.querySelectorAll("[data-ltact]"), function (b) {
      b.onclick = function () {
        var act = b.getAttribute("data-ltact");
        if (act === "msub") { if (!st.mPick.length) return; st.ans[st.qi] = st.mPick.slice().sort(function (a, b) { return a - b; }); st.mPick = []; render(root); }
        else if (act === "next") { st.qi++; st.mPick = []; render(root); }
        else if (act === "restart") { st.qi = 0; st.ans = {}; st.mPick = []; render(root); }
        else if (act === "togcase") { st.showCase = !st.showCase; render(root); }
      };
    });
    [].forEach.call(root.querySelectorAll("[data-lty]"), function (b) {
      b.onclick = function () { st.year = b.getAttribute("data-lty"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltr]"), function (b) {
      b.onclick = function () { st.round = b.getAttribute("data-ltr"); render(root); };
    });
    var srch = d.getElementById("ltsearch");
    if (srch) {
      srch.oninput = function () {
        st.search = srch.value;
        var pos = srch.selectionStart;
        render(root);
        var s2 = d.getElementById("ltsearch");
        if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} }
      };
    }
    [].forEach.call(root.querySelectorAll("[data-ltview]"), function (b) {
      b.onclick = function () {
        st.docId = "";
        st.view = b.getAttribute("data-ltview");
        st.viewTitle = b.getAttribute("data-lttitle") || "";
        render(root);
        var v = d.getElementById("lt-viewer");
        if (v && v.scrollIntoView) v.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    [].forEach.call(root.querySelectorAll("[data-ltdoc]"), function (b) {
      b.onclick = function () {
        st.view = "";
        st.docId = b.getAttribute("data-ltdoc");
        st.docLang = "ar";
        render(root);
        var v = d.getElementById("lt-viewer");
        if (v && v.scrollIntoView) v.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    [].forEach.call(root.querySelectorAll("[data-ltlang]"), function (b) {
      b.onclick = function () { st.docLang = b.getAttribute("data-ltlang"); render(root); };
    });
    [].forEach.call(root.querySelectorAll("[data-ltsolve]"), function (b) {
      b.onclick = function () {
        var f = b.getAttribute("data-ltsolve"), item = findByFile(f);
        if (!item) return;
        if (item.kind === "doc") { st.view = ""; st.docId = f; st.docLang = "ar"; }
        else { st.docId = ""; st.view = f; st.viewTitle = item.t; }
        solveExam(root, item);
        var v = d.getElementById("lt-viewer");
        if (v && v.scrollIntoView) v.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    [].forEach.call(root.querySelectorAll("[data-ltclose]"), function (b) {
      b.onclick = function () { st.view = ""; st.docId = ""; st.solId = ""; st.solBusy = false; render(root); };
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
