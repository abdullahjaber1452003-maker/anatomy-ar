/* 👨‍🏫 خطة عثمان اليومية (PRO) — تغطية كاملة لكل المواد والدروس + توزيع مفرّق خلال النهار + تصعيد تلقائي إذا قصّر الطالب
   - Every pace (خفيف · عادي · مكثّف) covers ALL subjects & ALL unread lessons (round-robin across every subject + full ETA).
   - Splits today's parts into spaced mini-sessions across the day (e.g., Session 1 now, Session 2 after 3 hours, etc.) so studying feels light.
   - Auto-escalation: if the student falls short yesterday, خفيف → عادي and عادي → مكثّف automatically to catch up without piling up!
   ES5 (iOS 12 safe). */
(function (w, d) {
  "use strict";
  var PACE_K = "nursin_plan_pace_v1";
  var TRACK_K = "nursin_plan_track_v1";
  var REM_K = "nursin_plan_rem_v1";

  // Parts per day + spaced time slots for each pace (all 3 cover the entire curriculum!)
  var PACE_CFG = {
    1: { perDay: 2, lblAr: "خفيف (2 مفرّقين)", lblFr: "Léger (2)", slotsAr: ["هلّق (جلسة ١)", "بعد ٣ ساعات (جلسة ٢)"], slotsFr: ["Maintenant", "Dans 3 h"] },
    2: { perDay: 3, lblAr: "عادي (3/يوم)", lblFr: "Normal (3)", slotsAr: ["جلسة ١ (هلّق)", "جلسة ٢ (بعد ٣ ساعات)", "جلسة ٣ (المسا)"], slotsFr: ["Session 1", "Dans 3 h", "Soir"] },
    3: { perDay: 4, lblAr: "مكثّف (4/يوم)", lblFr: "Intensif (4)", slotsAr: ["جلسة ١ (هلّق)", "جلسة ٢ (بعد ساعتين)", "جلسة ٣ (بعد الظهر)", "جلسة ٤ (المسا)"], slotsFr: ["Session 1", "Dans 2 h", "Après-midi", "Soir"] }
  };

  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function emit() { try { d.dispatchEvent(new CustomEvent("nursin:planner")); } catch (e) {} }

  function todayB() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function dayDiff(a, b) {
    return Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5);
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

  function getPace() {
    var p = +lsGet(PACE_K) || 1;
    return p >= 1 && p <= 3 ? p : 1;
  }
  function setPace(p, isAuto, reason) {
    p = +p || 1;
    if (p < 1) p = 1;
    if (p > 3) p = 3;
    lsSet(PACE_K, p);
    var tr = lsGet(TRACK_K) || {};
    tr.d = todayB();
    tr.target = PACE_CFG[p].perDay;
    if (isAuto) {
      tr.autoUp = p;
      tr.reason = reason || "";
      tr.autoDay = todayB();
    } else {
      tr.autoUp = 0;
      tr.reason = "";
    }
    lsSet(TRACK_K, tr);
    emit();
  }

  function countDoneToday(parts, LS, rm, pq, todayStr) {
    var n = 0;
    for (var i = 0; i < parts.length; i++) {
      var x = parts[i];
      var key = LS && LS.key ? LS.key(x) : (x.s + ":" + (x.l || x.t) + (x.p ? "#" + x.p : ""));
      var ts = +rm[key] || (pq[key] && +pq[key].t) || 0;
      if (!ts) continue;
      var dStr = "";
      try { dStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)); } catch (e) {}
      if (dStr === todayStr) n++;
    }
    return n;
  }

  // Auto-escalate pace if student fell behind on previous day(s): خفيف(1) -> عادي(2) -> مكثّف(3)
  function checkAutoEscalation(doneToday) {
    var dk = todayB(), pace = getPace(), tr = lsGet(TRACK_K);
    if (!tr || !tr.d) {
      lsSet(TRACK_K, { d: dk, target: PACE_CFG[pace].perDay, done: doneToday, autoUp: 0, reason: "" });
      return { autoUp: 0, reason: "" };
    }
    if (tr.d === dk) {
      if ((tr.done | 0) !== doneToday || (tr.target | 0) !== PACE_CFG[pace].perDay) {
        tr.done = doneToday;
        tr.target = PACE_CFG[pace].perDay;
        lsSet(TRACK_K, tr);
      }
      return { autoUp: tr.autoDay === dk ? (tr.autoUp | 0) : 0, reason: tr.autoDay === dk ? (tr.reason || "") : "" };
    }
    // New day! Evaluate previous tracked day
    var gap = dayDiff(dk, tr.d);
    var fellShort = (tr.done | 0) < (tr.target | 0) || gap > 1;
    var nextPace = pace, reason = "";
    if (fellShort) {
      if (pace === 1) {
        nextPace = 2;
        reason = T("قصّرت بخطة «خفيف» مبارح (" + (tr.done | 0) + "/" + (tr.target | 0) + ")، فرفعتلك الوتيرة تلقائياً لـ «عادي» اليوم تا تعوّض وتضلّ مارق عكل المواد!", "Tu as pris un peu de retard hier, je passe ton plan en mode Normal aujourd'hui pour rattraper !");
      } else if (pace === 2) {
        nextPace = 3;
        reason = T("قصّرت بخطة «عادي» مبارح (" + (tr.done | 0) + "/" + (tr.target | 0) + ")، فرفعتلك الوتيرة تلقائياً لـ «مكثّف» اليوم تا تلحق كل الدروس وما يتراكم شي!", "Retard hier : je passe ton plan en mode Intensif aujourd'hui pour tout rattraper !");
      } else {
        reason = T("في أجزاء متراكمة من مبارح — خلّينا نخلّص جلسات «مكثّف» اليوم تا نرتاح!", "Quelques parties en retard d'hier : on les termine aujourd'hui !");
      }
      lsSet(PACE_K, nextPace);
    }
    var newTr = { d: dk, target: PACE_CFG[nextPace].perDay, done: doneToday, autoUp: fellShort ? nextPace : 0, reason: reason, autoDay: fellShort ? dk : "" };
    lsSet(TRACK_K, newTr);
    return { autoUp: newTr.autoUp, reason: newTr.reason };
  }

  function buildWeek() {
    var NL = w.NLESSONS || {}, parts = NL.parts || [], subjs = NL.subjects || {};
    var LS = w.NursinLessons, rm = LS && LS.readMap ? LS.readMap() : (lsGet("nursin_read_v1") || {});
    var pq = lsGet("nursin_partq_v1") || {};
    var todayStr = todayB();

    var doneToday = countDoneToday(parts, LS, rm, pq, todayStr);
    var escInfo = checkAutoEscalation(doneToday);
    var pace = getPace(), cfg = PACE_CFG[pace], perDay = cfg.perDay;

    var totalDone = 0, totalParts = parts.length;
    var bySubj = {}, subjOrder = [];
    for (var i = 0; i < parts.length; i++) {
      var x = parts[i];
      var key = LS && LS.key ? LS.key(x) : (x.s + ":" + (x.l || x.t) + (x.p ? "#" + x.p : ""));
      var isDone = (LS && LS.isRead ? LS.isRead(x, rm) : !!rm[key]) || !!pq[key];
      if (isDone) {
        totalDone++;
        continue;
      }
      if (!bySubj[x.s]) {
        bySubj[x.s] = { s: x.s, sb: subjs[x.s] || { e: "📘", ar: x.s, fr: x.s }, newest: x.added || "", items: [] };
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

    // Prioritize subjects with newest added lessons first, then round-robin across ALL remaining subjects so EVERY subject is guaranteed to be covered!
    subjOrder.sort(function (a, b) {
      var na = bySubj[a].newest || "", nb = bySubj[b].newest || "";
      if (na !== nb) return nb > na ? 1 : -1;
      return bySubj[a].items.length - bySubj[b].items.length;
    });

    var subjList = subjOrder.map(function (k) { return { s: k, sb: bySubj[k].sb, left: bySubj[k].items.length }; });

    var queue = [], still = true;
    while (still) {
      still = false;
      for (var j = 0; j < subjOrder.length; j++) {
        var bucket = bySubj[subjOrder[j]].items;
        if (bucket.length) {
          queue.push(bucket.shift());
          still = true;
        }
      }
    }

    var totalDaysToFinish = queue.length ? Math.ceil(queue.length / perDay) : 0;
    var days = [];
    for (var dayIdx = 0; dayIdx < 7; dayIdx++) {
      var slice = queue.slice(dayIdx * perDay, (dayIdx + 1) * perDay);
      if (!slice.length && dayIdx > 0) break;
      days.push({ offset: dayIdx, label: dayLabel(dayIdx), items: slice });
    }

    return {
      pace: pace,
      cfg: cfg,
      perDay: perDay,
      days: days,
      doneToday: doneToday,
      totalDone: totalDone,
      totalParts: totalParts,
      remaining: queue.length,
      totalDaysToFinish: totalDaysToFinish,
      subjList: subjList,
      autoUp: escInfo.autoUp,
      reason: escInfo.reason,
      pct: totalParts ? Math.round(100 * totalDone / totalParts) : 0
    };
  }

  function nextRemInfo() {
    var r = lsGet(REM_K);
    if (!r || !r.at) return null;
    if (r.at <= Date.now()) {
      lsSet(REM_K, null);
      try {
        if (w.Notification && Notification.permission === "granted") {
          new Notification("👨‍🏫 صار وقت الجلسة التانية!", { body: "مرق الوقت المحدد — ٥ دقايق بس لتكمّل خطة اليوم عـ nursin.store 🔥", dir: "rtl", lang: "ar" });
        }
      } catch (e) {}
      return null;
    }
    return r;
  }
  function setNextRem(hours) {
    hours = +hours || 3;
    try { if (w.Notification && Notification.permission === "default") Notification.requestPermission().catch(function () {}); } catch (e) {}
    var at = Date.now() + hours * 36e5;
    lsSet(REM_K, { at: at, h: hours });
    emit();
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
      ".osplan-auto{margin:6px 0;padding:8px 10px;border-radius:10px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.32);font-size:13px;font-weight:700}" +
      ".osplan-mot{margin:4px 0 8px;padding:7px 10px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.32);font-size:13px;font-weight:600}" +
      ".osplan-cov{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px;font-size:11.5px}" +
      ".osplan-cov span{padding:2px 7px;border-radius:999px;background:rgba(15,118,110,.12);border:1px solid rgba(15,118,110,.22);font-weight:600}" +
      ".osplan-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}" +
      ".osplan-it{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:var(--card,#fff);border:1px solid rgba(127,127,127,.18)}" +
      ".osplan-it b{display:block;font-size:13.5px;line-height:1.35}.osplan-it small{display:block;font-size:11.5px;opacity:.8}" +
      ".osplan-slot{display:inline-block;padding:1px 6px;border-radius:999px;background:rgba(245,158,11,.16);font-size:11px;font-weight:700;margin-inline-end:4px}" +
      ".osplan-rem{margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:7px 10px;border-radius:10px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);font-size:12.5px}" +
      ".osplan-wk{margin-top:8px}.osplan-wk summary{cursor:pointer;font-weight:700;font-size:13px;padding:4px 0}" +
      ".osplan-day{margin:6px 0;padding-top:6px;border-top:1px dashed rgba(127,127,127,.25)}" +
      ".osplan-day h4{margin:0 0 4px;font-size:13px;font-weight:700}" +
      ".osplan-lk{margin-top:8px;padding:10px;border-radius:12px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.28);text-align:center;font-size:13px}";
    (d.head || d.body).appendChild(s);
  }

  function motivation(pl) {
    if (!pl.remaining) return T("🎉 بطل! خلّصت كل الدروس الموجودة حالياً — ركّز على المراجعة والكويزات!", "🎉 Bravo ! Toutes les leçons sont terminées !");
    var covTxt = T(" · بتخلص كل الـ " + pl.subjList.length + " مواد بـ " + pl.totalDaysToFinish + " يوم", " · tout fini en " + pl.totalDaysToFinish + " j");
    if (pl.doneToday >= pl.perDay) return T("🔥 يا بطل! خلّصت هدف اليوم كلّو (" + pl.doneToday + "/" + pl.perDay + ") — فيك ترتاح أو تسبق بكرا!", "🔥 Objectif du jour atteint !");
    if (pl.doneToday > 0) return T("👏 برافو! خلّصت " + pl.doneToday + " من " + pl.perDay + " اليوم — ارتاح شوي وارجع بعد ساعتين–٣ للجلسة الجاية!", "👏 " + pl.doneToday + "/" + pl.perDay + " fait — repose-toi et reviens dans 2–3 h !");
    return T("👨‍🏫 عثمان: «قسّمتلك كل المواد على جلسات قصيرة مفرّقة بالنهار (٦ د كل جلسة)" + covTxt + " — إذا قصّرت اليوم بتعلى الخطة تلقائياً بكرا!»", "👨‍🏫 Osman : « Sessions courtes réparties sur la journée" + covTxt + " ! »");
  }

  function homeHtml() {
    css();
    var pl = buildWeek();
    if (!pl.totalParts) return "";
    var proOk = !w.NursinPro || w.NursinPro.canUse();
    var st = w.NursinPro && w.NursinPro.status ? w.NursinPro.status() : { mode: "trial", daysLeft: 3 };
    var tag = st.mode === "trial" ? "<span class='protag'>PRO · تجربة</span>" : !proOk ? "<span class='protag'>🔒 PRO</span>" : "<span class='protag free'>PRO ✓</span>";

    var autoBanner = pl.reason ? "<div class='osplan-auto'>⚡ " + esc(pl.reason) + "</div>" : "";
    var covHtml = pl.subjList.length
      ? "<div class='osplan-cov' title='كل المواد داخلة بالتقسيمة بالتناوب'>" +
        pl.subjList.slice(0, 6).map(function (x) { return "<span>" + esc((x.sb.e || "📘") + " " + T(x.sb.ar || x.s, x.sb.fr || x.s)) + " (" + x.left + ")</span>"; }).join("") +
        (pl.subjList.length > 6 ? "<span>+" + (pl.subjList.length - 6) + " مواد</span>" : "") + "</div>"
      : "";

    var todayItems = (pl.days[0] && pl.days[0].items) || [];
    var showItems = proOk ? todayItems : todayItems.slice(0, 1);
    var slots = FR() ? pl.cfg.slotsFr : pl.cfg.slotsAr;

    var todayHtml = showItems.length
      ? "<ul class='osplan-list'>" + showItems.map(function (it, idx) {
          var lUrl = "learn.html?u=" + encodeURIComponent(it.href);
          var sl = slots[idx] || T("جلسة " + (idx + 1), "Session " + (idx + 1));
          return "<li class='osplan-it'><div><b><span class='osplan-slot'>⏱️ " + esc(sl) + "</span>" + esc((it.sb.e || "📘") + " " + it.n) + "</b><small>" + esc(T(it.sb.ar || it.s, it.sb.fr || it.s)) + " · ~6 " + T("دقايق", "min") + (it.added ? " · 🆕" : "") + "</small></div>" +
            "<div style='display:flex;gap:4px;flex-shrink:0'><a class='btn sm pri' href='" + esc(lUrl) + "' data-osplango='1'>📖 " + T("ابدأ", "Go") + "</a><a class='btn sm' href='" + esc(it.href) + "' title='" + T("الدرس كامل", "Leçon complète") + "'>📄</a></div></li>";
        }).join("") + "</ul>"
      : "<p class='small' style='margin:4px 0'>🎉 " + T("ما في أجزاء باقية اليوم!", "Rien de prévu en plus aujourd'hui !") + "</p>";

    var rem = nextRemInfo();
    var remHtml = proOk && todayItems.length > 1
      ? "<div class='osplan-rem'><span>" + (rem ? "🔔 " + T("تذكير الجلسة الجاية مفعّل (بعد " + Math.max(1, Math.round((rem.at - Date.now()) / 6e4)) + " دقيقة)", "Rappel activé") : "⏰ " + T("خلصت أول جلسة؟ خلّيني ذكّرك ترجع بعد ٣ ساعات للتانية", "Rappel dans 3 h pour la session suivante")) + "</span>" +
        (rem ? "<button type='button' class='btn sm' data-osprem='0'>" + T("إلغاء", "Annuler") + "</button>" : "<button type='button' class='btn sm' data-osprem='3'>🔔 " + T("ذكّرني بعد ٣ ساعات", "Rappeler dans 3 h") + "</button>") + "</div>"
      : "";

    var weekHtml = "";
    if (proOk && pl.days.length > 1) {
      weekHtml = "<details class='osplan-wk'><summary>📆 " + T("شوف تقسيمة باقي الأسبوع (تغطية كل الـ " + pl.subjList.length + " مواد · " + pl.totalDaysToFinish + " يوم لتخلص كل المنهج)", "Voir le reste de la semaine") + "</summary>" +
        pl.days.slice(1).map(function (dy) {
          return "<div class='osplan-day'><h4>" + esc(dy.label) + " (" + dy.items.length + ")</h4><ul class='osplan-list'>" +
            dy.items.map(function (it) {
              return "<li class='osplan-it'><div><b>" + esc((it.sb.e || "📘") + " " + it.n) + "</b><small>" + esc(T(it.sb.ar || it.s, it.sb.fr || it.s)) + "</small></div>" +
                "<a class='btn sm' href='learn.html?u=" + encodeURIComponent(it.href) + "' data-osplango='1'>📖</a></li>";
            }).join("") + "</ul></div>";
        }).join("") + "</details>";
    } else if (!proOk) {
      weekHtml = "<div class='osplan-lk'><b>🔒 باقي جلسات اليوم والأسبوع مقفولة (PRO)</b><br><span class='small'>فعّل Pro بـ $4/شهر عبر Whish ليقسملك عثمان كل المواد يوم بيوم مع تصعيد تلقائي إذا قصّرت</span><br><button type='button' class='btn sm pri' style='margin-top:6px' data-proopen>⭐ فعّل Pro</button></div>";
    }

    return "<div class='osplan' id='osplan'>" +
      "<div class='osplan-hd'><h3>👨‍🏫 " + T("خطة عثمان اليومية", "Plan quotidien d'Osman") + " " + tag + "</h3>" +
      "<div class='osplan-pace' role='group' aria-label='وتيرة الدراسة'>" +
      [1, 2, 3].map(function (n) {
        return "<button type='button' class='" + (pl.pace === n ? "on" : "") + "' data-osppace='" + n + "'>" + esc(T(PACE_CFG[n].lblAr, PACE_CFG[n].lblFr)) + "</button>";
      }).join("") + "</div></div>" +
      autoBanner +
      "<div class='osplan-mot'>" + esc(motivation(pl)) + "</div>" +
      covHtml + todayHtml + remHtml + weekHtml + "</div>";
  }

  d.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var pb = t.closest("[data-osppace]");
    if (pb) { setPace(pb.getAttribute("data-osppace"), false); return; }
    var rb = t.closest("[data-osprem]");
    if (rb) {
      var h = +rb.getAttribute("data-osprem");
      if (h > 0) setNextRem(h); else { lsSet(REM_K, null); emit(); }
      return;
    }
    var gl = t.closest("[data-osplango]");
    if (gl && w.NursinPro && !w.NursinPro.guard("خطة عثمان اليومية", "planner")) {
      e.preventDefault();
    }
  });

  setInterval(function () { nextRemInfo(); }, 60000);
  w.NursinPlanner = { buildWeek: buildWeek, homeHtml: homeHtml, getPace: getPace, setPace: setPace };
})(window, document);
