/* 👨‍🏫 خطة عثمان اليومية (PRO) — تقسيم الدروس والمواد الجديدة يوم بيوم على مدار الأسبوع (بامتحان وغير امتحان)
   Automatically splits unread / newly added lessons from NLESSONS.parts across 7 days (اليوم · بكرا · بعد بكرا ...)
   so the student always knows exactly how much to study today without needing a notebook. ES5 (iOS 12). */
(function (w, d) {
  "use strict";
  var PACE_K = "nursin_plan_pace_v1";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function emit() { try { d.dispatchEvent(new CustomEvent("nursin:planner")); } catch (e) {} }

  function getPace() {
    var p = +lsGet(PACE_K) || 2;
    return p >= 1 && p <= 3 ? p : 2;
  }
  function setPace(p) {
    p = +p || 2;
    if (p < 1) p = 1;
    if (p > 3) p = 3;
    lsSet(PACE_K, p);
    emit();
  }

  function todayB() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function dayLabel(offset) {
    if (offset === 0) return T("🔥 اليوم", "🔥 Aujourd'hui");
    if (offset === 1) return T("📅 بكرا", "📅 Demain");
    if (offset === 2) return T("📅 بعد بكرا", "📅 Après-demain");
    var dt = new Date(Date.parse(todayB() + "T12:00:00Z") + offset * 864e5);
    var arD = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][dt.getUTCDay()];
    var frD = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."][dt.getUTCDay()];
    return "📅 " + T(arD, frD) + " " + dt.getUTCDate() + "/" + (dt.getUTCMonth() + 1);
  }

  function buildWeek() {
    var NL = w.NLESSONS || {}, parts = NL.parts || [], subjs = NL.subjects || {};
    var LS = w.NursinLessons, rm = LS && LS.readMap ? LS.readMap() : (lsGet("nursin_read_v1") || {});
    var pq = lsGet("nursin_partq_v1") || {};
    var pace = getPace();
    var todayStr = todayB();

    var doneToday = 0, totalDone = 0, totalParts = parts.length;
    var bySubj = {}, subjOrder = [];
    for (var i = 0; i < parts.length; i++) {
      var x = parts[i];
      var key = LS && LS.key ? LS.key(x) : (x.s + ":" + (x.l || x.t) + (x.p ? "#" + x.p : ""));
      var isDone = (LS && LS.isRead ? LS.isRead(x, rm) : !!rm[key]) || !!pq[key];
      if (isDone) {
        totalDone++;
        var ts = +rm[key] || (pq[key] && +pq[key].t) || 0;
        if (ts) {
          var dStr = "";
          try { dStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)); } catch (e) {}
          if (dStr === todayStr) doneToday++;
        }
        continue;
      }
      if (!bySubj[x.s]) {
        bySubj[x.s] = { s: x.s, newest: x.added || "", items: [] };
        subjOrder.push(x.s);
      }
      if (x.added && x.added > bySubj[x.s].newest) bySubj[x.s].newest = x.added;
      bySubj[x.s].items.push({
        x: x,
        key: key,
        n: LS && LS.label ? LS.label(x) : (x.n + (x.p ? " - الجزء " + x.p : "")),
        href: x.href,
        s: x.s,
        sb: subjs[x.s] || { e: "📘", ar: x.s, fr: x.s },
        added: x.added || ""
      });
    }

    // Prioritize subjects with newest added lessons first, then round-robin so the week feels varied and fresh
    subjOrder.sort(function (a, b) {
      var na = bySubj[a].newest || "", nb = bySubj[b].newest || "";
      if (na !== nb) return nb > na ? 1 : -1;
      return bySubj[a].items.length - bySubj[b].items.length;
    });

    var queue = [], still = true;
    while (still && queue.length < pace * 7) {
      still = false;
      for (var j = 0; j < subjOrder.length; j++) {
        var bucket = bySubj[subjOrder[j]].items;
        if (bucket.length) {
          queue.push(bucket.shift());
          still = true;
          if (queue.length >= pace * 7) break;
        }
      }
    }

    var days = [];
    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      var slice = queue.slice(dayIdx * pace, (dayIdx + 1) * pace);
      if (!slice.length && dayIdx > 0) break;
      days.push({ offset: dayIdx, label: dayLabel(dayIdx), items: slice });
    }

    return {
      pace: pace,
      days: days,
      doneToday: doneToday,
      totalDone: totalDone,
      totalParts: totalParts,
      remaining: Math.max(0, totalParts - totalDone),
      pct: totalParts ? Math.round(100 * totalDone / totalParts) : 0
    };
  }

  function css() {
    if (d.getElementById("plancss")) return;
    var s = d.createElement("style"); s.id = "plancss";
    s.textContent =
      ".osplan{margin:10px 0 12px;padding:13px 14px;border-radius:16px;border:1px solid rgba(15,118,110,.35);background:linear-gradient(150deg,rgba(15,118,110,.09),rgba(20,184,166,.04));font-size:14px;line-height:1.55}" +
      ".osplan-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px}" +
      ".osplan-hd h3{margin:0;font-size:15px;font-weight:800}" +
      ".osplan-pace{display:flex;gap:4px;flex-wrap:wrap}" +
      ".osplan-pace button{padding:3px 8px;border-radius:999px;border:1px solid rgba(15,118,110,.35);background:transparent;color:inherit;font-size:11px;font-weight:700;cursor:pointer}" +
      ".osplan-pace button.on{background:#0f766e;color:#fff;border-color:#0f766e}" +
      ".osplan-mot{margin:4px 0 8px;padding:7px 10px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.32);font-size:13px;font-weight:600}" +
      ".osplan-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}" +
      ".osplan-it{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:var(--card,#fff);border:1px solid rgba(127,127,127,.18)}" +
      ".osplan-it b{display:block;font-size:13.5px;line-height:1.35}.osplan-it small{display:block;font-size:11.5px;opacity:.8}" +
      ".osplan-wk{margin-top:8px}.osplan-wk summary{cursor:pointer;font-weight:700;font-size:13px;padding:4px 0}" +
      ".osplan-day{margin:6px 0;padding-top:6px;border-top:1px dashed rgba(127,127,127,.25)}" +
      ".osplan-day h4{margin:0 0 4px;font-size:13px;font-weight:700}" +
      ".osplan-lk{margin-top:8px;padding:10px;border-radius:12px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.28);text-align:center;font-size:13px}";
    (d.head || d.body).appendChild(s);
  }

  function motivation(pl) {
    var mins = pl.pace * 6;
    if (!pl.remaining) return T("🎉 بطل! خلّصت كل الدروس الموجودة حالياً — ركّز على المراجعة والكويزات!", "🎉 Bravo ! Toutes les leçons sont terminées !");
    if (pl.doneToday >= pl.pace) return T("🔥 يا بطل! خلّصت هدف اليوم كلّو (" + pl.doneToday + "/" + pl.pace + ") — فيك ترتاح أو تسبق بكرا بجزء إضافي!", "🔥 Objectif du jour atteint ! Tu peux te reposer ou prendre de l'avance.");
    if (pl.doneToday > 0) return T("👏 برافو! خلّصت " + pl.doneToday + " من " + pl.pace + " اليوم — باقيلك " + (pl.pace - pl.doneToday) + " بس وبتسكر هدفك!", "👏 " + pl.doneToday + "/" + pl.pace + " fait aujourd'hui — encore un petit effort !");
    return T("👨‍🏫 عثمان: «اليوم بدك بس ~" + mins + " دقيقة (" + pl.pace + (pl.pace === 1 ? " جزء" : " أجزاء") + ") — هيك بتمرق عكل المواد بدون دفتر وبلا ضغط!»", "👨‍🏫 Osman : « Juste ~" + mins + " min aujourd'hui pour garder le rythme sans stress ! »");
  }

  function homeHtml() {
    css();
    var pl = buildWeek();
    if (!pl.totalParts) return "";
    var proOk = !w.NursinPro || w.NursinPro.canUse();
    var st = w.NursinPro && w.NursinPro.status ? w.NursinPro.status() : { mode: "trial", daysLeft: 3 };
    var tag = st.mode === "trial" ? "<span class='protag'>PRO · تجربة</span>" : !proOk ? "<span class='protag'>🔒 PRO</span>" : "<span class='protag free'>PRO ✓</span>";

    var todayItems = (pl.days[0] && pl.days[0].items) || [];
    var showItems = proOk ? todayItems : todayItems.slice(0, 1);

    var todayHtml = showItems.length
      ? "<ul class='osplan-list'>" + showItems.map(function (it) {
          var lUrl = "learn.html?u=" + encodeURIComponent(it.href);
          return "<li class='osplan-it'><div><b>" + esc((it.sb.e || "📘") + " " + it.n) + "</b><small>" + esc(T(it.sb.ar || it.s, it.sb.fr || it.s)) + " · ~6 " + T("دقايق", "min") + (it.added ? " · 🆕" : "") + "</small></div>" +
            "<div style='display:flex;gap:4px;flex-shrink:0'><a class='btn sm pri' href='" + esc(lUrl) + "' data-osplango='1'>📖 " + T("ابدأ", "Go") + "</a><a class='btn sm' href='" + esc(it.href) + "' title='" + T("الدرس كامل", "Leçon complète") + "'>📄</a></div></li>";
        }).join("") + "</ul>"
      : "<p class='small' style='margin:4px 0'>🎉 " + T("ما في أجزاء باقية اليوم!", "Rien de prévu en plus aujourd'hui !") + "</p>";

    var weekHtml = "";
    if (proOk && pl.days.length > 1) {
      weekHtml = "<details class='osplan-wk'><summary>📆 " + T("شوف تقسيمة باقي الأسبوع (بكرا ← الأسبوع الجاي)", "Voir le reste de la semaine") + "</summary>" +
        pl.days.slice(1).map(function (dy) {
          return "<div class='osplan-day'><h4>" + esc(dy.label) + " (" + dy.items.length + ")</h4><ul class='osplan-list'>" +
            dy.items.map(function (it) {
              return "<li class='osplan-it'><div><b>" + esc((it.sb.e || "📘") + " " + it.n) + "</b><small>" + esc(T(it.sb.ar || it.s, it.sb.fr || it.s)) + "</small></div>" +
                "<a class='btn sm' href='learn.html?u=" + encodeURIComponent(it.href) + "' data-osplango='1'>📖</a></li>";
            }).join("") + "</ul></div>";
        }).join("") + "</details>";
    } else if (!proOk) {
      weekHtml = "<div class='osplan-lk'><b>🔒 باقي خطة اليوم والأسبوع مقفولة (PRO)</b><br><span class='small'>فعّل Pro بـ $4/شهر عبر Whish ليقسملك عثمان كل المواد الجديدة يوم بيوم</span><br><button type='button' class='btn sm pri' style='margin-top:6px' data-proopen>⭐ فعّل Pro</button></div>";
    }

    return "<div class='osplan' id='osplan'>" +
      "<div class='osplan-hd'><h3>👨‍🏫 " + T("خطة عثمان اليومية", "Plan quotidien d'Osman") + " " + tag + "</h3>" +
      "<div class='osplan-pace' role='group' aria-label='وتيرة الدراسة'>" +
      [1, 2, 3].map(function (n) {
        var lbl = n === 1 ? T("خفيف (1)", "Léger (1)") : n === 2 ? T("عادي (2)", "Normal (2)") : T("مكثّف (3)", "Intensif (3)");
        return "<button type='button' class='" + (pl.pace === n ? "on" : "") + "' data-osppace='" + n + "'>" + lbl + "</button>";
      }).join("") + "</div></div>" +
      "<div class='osplan-mot'>" + esc(motivation(pl)) + "</div>" +
      todayHtml + weekHtml + "</div>";
  }

  d.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var pb = t.closest("[data-osppace]");
    if (pb) { setPace(pb.getAttribute("data-osppace")); return; }
    var gl = t.closest("[data-osplango]");
    if (gl && w.NursinPro && !w.NursinPro.guard("خطة عثمان اليومية", "planner")) {
      e.preventDefault();
    }
  });

  w.NursinPlanner = { buildWeek: buildWeek, homeHtml: homeHtml, getPace: getPace, setPace: setPace };
})(window, document);
