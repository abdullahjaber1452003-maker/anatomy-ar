(function (w, d) {
  "use strict";
  var K = "nursin_pro_v1", TK = "nursin_pro_trial_v1", PK = "nursin_pro_preview_v1";
  var UK = "nursin_pro_used_v1", NK = "nursin_pro_notif_v1", EVK = "nursin_eve_rem_v1", NDK = "nursin_pro_nudge_v1";
  var OWNER = "abdullahjaber1452003@gmail.com";
  var TRIAL_DAYS = 3, TRIAL_MS = TRIAL_DAYS * 864e5;
  var WHISH_NUM = "79 117 048", WHISH_RAW = "79117048", WA_NUM = "96179117048";

  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function emit() { try { d.dispatchEvent(new CustomEvent("nursin:pro")); } catch (e) {} }
  function todayB() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10); }
  }
  function hourB() {
    try { return +new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", hour12: false }).format(new Date()) % 24; }
    catch (e) { return new Date().getHours(); }
  }

  function isRealAdmin() {
    try {
      var u = w.NursinFB && w.NursinFB.user;
      if (u && u.email === OWNER) return true;
      var me = (w.Nursin && w.Nursin.me) || lsGet("nursin_me_v1");
      if (me && me.email === OWNER) return true;
    } catch (e) {}
    return false;
  }
  function previewMode() {
    if (!isRealAdmin()) return "";
    var v = lsGet(PK);
    return (v === "trial" || v === "expired") ? v : "";
  }
  function setPreview(mode) {
    if (!isRealAdmin()) return;
    lsSet(PK, (mode === "trial" || mode === "expired") ? mode : "");
    paint();
    emit();
  }
  function isAdmin() { return isRealAdmin() && !previewMode(); }

  function ensureTrial() {
    var t = lsGet(TK);
    if (!t || !t.start) {
      t = { start: Date.now() };
      lsSet(TK, t);
    }
    return t;
  }

  function status() {
    if (isAdmin()) return { ok: true, mode: "admin", daysLeft: 999, hoursLeft: 999, elapsedHours: 0 };
    var pm = previewMode();
    if (pm === "expired") return { ok: false, mode: "expired", daysLeft: 0, hoursLeft: 0, elapsedHours: 73 };
    if (pm === "trial") return { ok: true, mode: "trial", daysLeft: 1, hoursLeft: 9, elapsedHours: 63 };
    var p = lsGet(K);
    if (p && p.exp > Date.now()) {
      var dLeft = Math.max(1, Math.ceil((p.exp - Date.now()) / 864e5));
      return { ok: true, mode: "pro", daysLeft: dLeft, hoursLeft: dLeft * 24, elapsedHours: 0 };
    }
    var tr = ensureTrial();
    var left = (tr.start + TRIAL_MS) - Date.now();
    var elap = Math.max(0, Math.floor((Date.now() - tr.start) / 36e5));
    if (left > 0) {
      return {
        ok: true,
        mode: "trial",
        daysLeft: Math.max(1, Math.ceil(left / 864e5)),
        hoursLeft: Math.max(1, Math.ceil(left / 36e5)),
        elapsedHours: elap
      };
    }
    return { ok: false, mode: "expired", daysLeft: 0, hoursLeft: 0, elapsedHours: 73 };
  }

  function canUse() { return status().ok; }
  function isPro() { return canUse(); }

  function markUsed(key) {
    if (!key) return;
    var u = lsGet(UK) || {};
    u[key] = (u[key] | 0) + 1;
    lsSet(UK, u);
  }
  function usedStats() { return lsGet(UK) || {}; }

  function checkCode(c) {
    c = String(c || "").trim().toUpperCase();
    if (c === "NURSIN-PRO-2026" || /^NURSIN-\d{4}-[A-Z0-9]{4}$/.test(c)) {
      lsSet(K, { code: c, exp: Date.now() + 30 * 864e5 });
      paint();
      emit();
      return true;
    }
    return false;
  }

  function genCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", suf = "", num = String(Math.floor(1000 + Math.random() * 9000));
    for (var i = 0; i < 4; i++) suf += chars.charAt(Math.floor(Math.random() * chars.length));
    return "NURSIN-" + num + "-" + suf;
  }

  function guard(featureName, trackKey) {
    if (canUse()) {
      if (trackKey) markUsed(trackKey);
      return true;
    }
    open(featureName || "ميزة Pro");
    return false;
  }

  function css() {
    if (d.getElementById("procss")) return;
    var s = d.createElement("style"); s.id = "procss";
    s.textContent =
      ".prow{position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}" +
      ".prob{background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:18px;padding:18px;max-width:440px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 12px 34px rgba(0,0,0,.3);font-size:15px;line-height:1.6}" +
      ".prob h3{margin:0 0 8px;font-size:18px}.prob ul{margin:6px 0 12px;padding-inline-start:18px;font-size:14px}" +
      ".prob input{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid rgba(127,127,127,.4);font:inherit;margin:6px 0;text-align:center;text-transform:uppercase;background:transparent;color:inherit}" +
      ".prowhish{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:14px;padding:12px;margin:10px 0}" +
      ".prowhish .wnum{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(0,0,0,.05);padding:8px 12px;border-radius:10px;margin:6px 0;font-weight:800;font-size:16px}" +
      ".profeat{background:rgba(220,38,38,.09);border:1px solid rgba(220,38,38,.3);color:#b91c1c;border-radius:10px;padding:8px 10px;margin:0 0 10px;font-size:13px;font-weight:700}" +
      "html[data-theme=night] .profeat{color:#fca5a5}" +
      ".probar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;width:100%;box-sizing:border-box;margin:8px 0;padding:10px 13px;border-radius:14px;border:1px solid rgba(245,158,11,.45);background:linear-gradient(135deg,rgba(245,158,11,.16),rgba(217,119,6,.08));color:inherit;text-align:start;cursor:pointer;font:inherit}" +
      ".probar.adm{border-color:rgba(15,118,110,.45);background:linear-gradient(135deg,rgba(15,118,110,.16),rgba(13,148,136,.08))}" +
      ".probar.exp{border-color:rgba(220,38,38,.45);background:linear-gradient(135deg,rgba(220,38,38,.14),rgba(245,158,11,.1))}" +
      ".probar b{font-size:14px;display:block}.probar small{font-size:12px;opacity:.85;display:block}" +
      ".protag{display:inline-block;padding:2px 7px;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:11px;font-weight:800;vertical-align:middle;margin-inline-start:4px}" +
      ".protag.free{background:#0f766e}" +
      ".progrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}" +
      "@media(max-width:440px){.progrid{grid-template-columns:1fr}}" +
      ".procard{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;border:1px solid rgba(245,158,11,.38);background:var(--card,#fff);color:inherit;text-decoration:none;text-align:start;cursor:pointer;font:inherit;box-sizing:border-box}" +
      ".procard .pe{font-size:22px;line-height:1}.procard b{display:block;font-size:14px;line-height:1.3}.procard small{display:block;font-size:12px;opacity:.8;margin-top:2px}" +
      ".procard.lk{border-color:rgba(220,38,38,.35);opacity:.92}" +
      ".prolockbox{background:var(--card,#fff);border:1px solid rgba(245,158,11,.45);border-radius:16px;padding:18px;text-align:center;margin:12px 0}" +
      ".protoast{position:fixed;left:12px;right:12px;bottom:84px;z-index:96;max-width:440px;margin:0 auto;background:var(--card,#fff);color:var(--ink,#0f172a);border:1.5px solid rgba(245,158,11,.6);border-radius:16px;padding:12px 14px;box-shadow:0 10px 28px rgba(0,0,0,.22);font-size:14px;line-height:1.55;display:flex;flex-direction:column;gap:8px}" +
      ".protoast .ptx{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.protoast .ptc{border:0;background:none;font-size:18px;cursor:pointer;color:inherit;opacity:.7;padding:0 4px}" +
      ".protoast .pta{display:flex;flex-wrap:wrap;gap:6px}";
    (d.head || d.body).appendChild(s);
  }

  function showToast(title, body, ctaText, ctaFn) {
    css();
    var old = d.querySelector(".protoast"); if (old) old.remove();
    var t = d.createElement("div"); t.className = "protoast"; t.setAttribute("role", "status");
    t.innerHTML = "<div class='ptx'><div><b>" + esc(title) + "</b><div class='small' style='margin-top:2px'>" + esc(body) + "</div></div><button type='button' class='ptc' aria-label='سكّر'>✕</button></div>" +
      (ctaText ? "<div class='pta'><button type='button' class='btn sm pri ptgo'>" + esc(ctaText) + "</button><button type='button' class='btn sm ptno'>لاحقاً</button></div>" : "");
    d.body.appendChild(t);
    var kill = function () { if (t.parentNode) t.parentNode.removeChild(t); };
    t.querySelector(".ptc").onclick = kill;
    var no = t.querySelector(".ptno"); if (no) no.onclick = kill;
    var go = t.querySelector(".ptgo"); if (go) go.onclick = function () { kill(); if (ctaFn) ctaFn(); };
    setTimeout(kill, 14000);
  }

  function pushLocalNotif(title, body) {
    try {
      if (w.Notification && Notification.permission === "granted") {
        new Notification(title, { body: body, tag: "nursin-pro-trial", dir: "rtl", lang: "ar" });
      }
    } catch (e) {}
  }

  function masteredCount() {
    var n = 0;
    try { var pq = lsGet("nursin_partq_v1") || {}; n += Object.keys(pq).length; } catch (e) {}
    try { var rd = lsGet("nursin_read_v1") || {}; n = Math.max(n, Object.keys(rd).length); } catch (e) {}
    return n;
  }

  function barHtml() {
    css();
    var st = status(), rAdm = isRealAdmin(), pm = previewMode();
    if (st.mode === "admin") {
      return "<button type='button' class='probar adm' data-proopen><div><b>👑 أدمن · Pro مفعّل تلقائياً ✓</b><small>ولّد كود اشتراك لطالب أو جرّب معاينة الطالب</small></div><span class='protag free'>لوحة الأدمن</span></button>";
    }
    if (st.mode === "pro") {
      return "<button type='button' class='probar adm' data-proopen><div><b>⭐ اشتراكك Pro مفعّل ✓</b><small>باقي " + st.daysLeft + " يوم · كل الميزات مفتوحة إلك</small></div><span class='protag free'>PRO ✓</span></button>";
    }
    if (st.mode === "trial") {
      var urgent = st.hoursLeft <= 12;
      var tTxt = st.hoursLeft <= 24 ? ("⏳ باقي " + st.hoursLeft + (st.hoursLeft <= 10 ? " ساعات" : " ساعة") + " بس!") : ("باقي " + st.daysLeft + " أيام مجاناً");
      return "<button type='button' class='probar" + (urgent ? " exp" : "") + "' data-proopen><div><b>" + (urgent ? "🔥 آخر ساعات بالتجربة المجانية (" + tTxt + ")" : "🎁 تجربة Pro المجانية شغّالة (" + tTxt + ")") + "</b><small>" + (rAdm && pm ? "👁️ معاينة كطالب · " : "") + "جرّب وضع التعلّم، خطة عثمان اليومية، ومصحّح /20 قبل ما تقفل · بعدها $4/شهر</small></div><span class='protag'>فعّل Pro</span></button>";
    }
    return "<button type='button' class='probar exp' data-proopen><div><b>🔒 خلصت التجربة المجانية (٣ أيام)</b><small>" + (rAdm && pm ? "👁️ معاينة كطالب · " : "") + "فعّل Pro بـ $4/شهر عبر Whish Money لتكمل وضع التعلّم وخطة عثمان والمصحّح</small></div><span class='protag'>$4 / شهر</span></button>";
  }

  function nudge(msg) {
    var st = status();
    if (st.mode !== "trial") return;
    var dk = todayB();
    if (lsGet(NDK) === dk) return;
    lsSet(NDK, dk);
    var leftTxt = st.hoursLeft <= 24 ? ("باقي " + st.hoursLeft + " ساعة") : ("باقي " + st.daysLeft + " أيام");
    showToast("🔥 برافو! شفت قديش أسرع مع Pro؟", (msg || "عم تثبّت الدروس بسرعة") + " · " + leftTxt + " بالتجربة المجانية.", "⭐ شوف تفاصيل Pro", function () { open(); });
  }

  function checkNotifications() {
    var st = status(), dk = todayB();
    // 1) 3-stage Trial reminders (Day 1, Day 2, Last 12 hours)
    if (st.mode === "trial") {
      var seen = lsGet(NK) || {}, stage = "", title = "", body = "";
      if (st.hoursLeft <= 12 && !seen.s3) {
        stage = "s3";
        var mc = masteredCount();
        title = "⏳ باقي " + st.hoursLeft + " ساعات عانتهاء تجربة Pro!";
        body = (mc > 0 ? "أنجزت " + mc + " أجزاء لحد هلق 🔥 " : "") + "لا تخسر وضع التعلّم، خطة عثمان اليومية، ومصحّح الكتابي /20 ($4/شهر عبر Whish).";
      } else if (st.elapsedHours >= 24 && !seen.s2) {
        stage = "s2";
        var u = usedStats(), miss = [];
        if (!u.learn) miss.push("وضع التعلّم");
        if (!u.exam) miss.push("مصحّح الكتابي /20");
        if (!u.case) miss.push("محاكي المريض /10");
        title = "⏳ باقيلك أقل من يومين بتجربة Pro المجانية";
        body = miss.length ? ("في أشياء قوية بعد ما جرّبتها: " + miss.slice(0, 2).join(" و") + " — جرّبن قبل ما تقفل التجربة!") : "استغل باقي التجربة المجانية وخلّص أكبر عدد من الدروس!";
      } else if (!seen.s1) {
        stage = "s1";
        title = "🎁 انفتحتلك ٣ أيام Pro مجاناً!";
        body = "جرّب وضع التعلّم فقرة فقرة، خطة عثمان اليومية، ومصحّح الكتابي /20 — بعد ٣ أيام بتصير $4/شهر.";
      }
      if (stage) {
        seen[stage] = Date.now(); lsSet(NK, seen);
        setTimeout(function () {
          showToast(title, body, stage === "s3" ? "⭐ فعّل Pro ($4)" : "📖 جرّب وضع التعلّم", function () {
            if (stage === "s3") open(); else w.location.href = "learn.html";
          });
          pushLocalNotif(title, body);
        }, 2500);
        return;
      }
    }
    // 2) Evening Osman gentle study reminder (7 PM - 11:30 PM Beirut, if not studied yet today)
    var hr = hourB();
    if (hr >= 19 && hr <= 23 && lsGet(EVK) !== dk) {
      var stAct = lsGet("nursin_stact_v1"), studiedMins = stAct && stAct.d === dk ? Math.floor(Math.max(stAct.s | 0, stAct.r | 0) / 60) : 0;
      if (studiedMins < 5) {
        lsSet(EVK, dk);
        var wk = 0; try { wk = w.Weak && w.Weak.count ? w.Weak.count() : 0; } catch (e) {}
        var et = "👨‍🏫 الأستاذ عثمان عم يذكّرك قبل النوم";
        var eb = wk > 0 ? ("عندك " + wk + " غلطات ناطرينك — ٥ دقايق بس بتثبّتن وبتحافظ عسلسلتك 🔥") : "٥ دقايق دراسة خفيفة اليوم بتخليك سابق الصف وبتحافظ عسلسلتك 🔥";
        setTimeout(function () {
          showToast(et, eb, "⚡ تحدّي ٥ دقايق", function () { w.location.href = wk > 0 ? "quiz.html?t=weak&n=5" : "learn.html"; });
          pushLocalNotif(et, eb);
        }, 4500);
      }
    }
  }

  function open(featureName) {
    css();
    var old = d.querySelector(".prow"); if (old) old.remove();
    var rAdm = isRealAdmin(), pm = previewMode(), st = status();
    var waMsg = encodeURIComponent("مرحبا عبدالله، حوّلت $4 على Whish Money لاشتراك nursin.store Pro، هيدا الإيصال:");
    var waUrl = "https://wa.me/" + WA_NUM + "?text=" + waMsg;

    var admBox = rAdm
      ? "<div style='margin-bottom:12px;padding:10px;border-radius:12px;background:rgba(15,118,110,.09);border:1px solid rgba(15,118,110,.3)'>" +
        "<p style='margin:0 0 6px'><b>👑 أدوات الأدمن (Pro مفعّل إلك تلقائياً ✓)</b></p>" +
        "<p class='small' style='margin:0 0 4px'>🔑 توليد كود اشتراك جديد لطالب (30 يوم):</p>" +
        "<input id='progenout' readonly value='" + genCode() + "'>" +
        "<div style='display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px'><button type='button' class='btn sm pri' id='procopy'>📋 انسخ الكود</button><button type='button' class='btn sm' id='pronew'>🔄 كود تاني</button></div>" +
        "<p class='small' style='margin:0 0 6px'>👁️ <b>معاينة كطالب</b> (لتشوف كيف بتبين التجربة والقفل للطلاب):</p>" +
        "<div style='display:flex;flex-wrap:wrap;gap:6px'>" +
        "<button type='button' class='btn sm" + (!pm ? " pri" : "") + "' data-propm=''>👑 وضع الأدمن</button>" +
        "<button type='button' class='btn sm" + (pm === "trial" ? " pri" : "") + "' data-propm='trial'>🎁 طالب (آخر ساعات)</button>" +
        "<button type='button' class='btn sm" + (pm === "expired" ? " pri" : "") + "' data-propm='expired'>🔒 طالب (خلصت التجربة)</button>" +
        "</div></div>"
      : "";

    var featBanner = featureName
      ? "<div class='profeat'>🔒 ميزة «" + esc(featureName) + "» صارت لـ Pro فقط (خلصت فترة التجربة المجانية ٣ أيام)</div>"
      : "";

    var studentBody =
      featBanner +
      "<p class='small' style='margin:0 0 6px'>كل طالب بيقدر يجرّب ميزات Pro <b>٣ أيام مجاناً</b>، وبعدها الاشتراك <b>$4/شهر</b>:</p>" +
      "<ul>" +
      "<li>📖 <b>وضع التعلّم + 🔒 قفل الإتقان</b> فقرة فقرة لكل المواد</li>" +
      "<li>👨‍🏫 <b>خطة عثمان اليومية</b> بتقسملك كل المواد والدروس الجديدة يوم بيوم</li>" +
      "<li>🧑‍🏫 <b>بسّطلي هالفقرة</b> + 🩺 <b>محاكي المريض الحيّ (/10)</b></li>" +
      "<li>📅 <b>خطة ليلة الامتحان</b> + ✍️ <b>مصحّح الكتابي الرسمي (/20)</b></li>" +
      "</ul>" +
      (st.mode === "pro"
        ? "<p><b>✅ اشتراكك Pro مفعّل حالياً (باقي " + st.daysLeft + " يوم)!</b></p>"
        : "<div class='prowhish'>" +
          "<p style='margin:0 0 4px'><b>💳 الدفع عبر Whish Money ($4 / شهر):</b></p>" +
          "<p class='small' style='margin:0 0 6px'>1) حوّل <b>$4</b> على رقم الـ Whish:</p>" +
          "<div class='wnum'><span dir='ltr'>" + WHISH_NUM + "</span><button type='button' class='btn sm' id='prowcopy'>📋 انسخ الرقم</button></div>" +
          "<div style='display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'>" +
          "<a class='btn sm pri' href='https://whish.money' target='_blank' rel='noopener'>💸 افتح Whish Money</a>" +
          "<a class='btn sm' href='" + waUrl + "' target='_blank' rel='noopener'>💬 ابعت الإيصال واتساب</a>" +
          "</div>" +
          "<p class='small' style='margin:8px 0 0'>2) بيبعتلك الأدمن كود تفعيل، حطّو تحت:</p>" +
          "</div>" +
          "<input id='procode' placeholder='أدخل كود التفعيل (مثال: NURSIN-1234-ABCD)'>" +
          "<p id='proerr' class='small' style='color:#dc2626;margin:2px 0' hidden></p>" +
          "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px'><button type='button' class='btn pri' id='progo'>✅ فعّل الكود</button><button type='button' class='btn' id='prox'>سكّر</button></div>");

    var dv = d.createElement("div"); dv.className = "prow";
    dv.innerHTML = "<div class='prob'><h3>" + (rAdm && !pm ? "👑 اشتراك nursin.store Pro" : "⭐ اشتراك nursin.store Pro") + "</h3>" +
      admBox +
      (rAdm && !pm ? "<div style='display:flex;gap:8px;margin-top:8px'><button type='button' class='btn' id='prox'>سكّر</button></div>" : studentBody) +
      (st.mode === "pro" ? "<div style='display:flex;gap:8px;margin-top:8px'><button type='button' class='btn pri' id='prox'>تمام</button></div>" : "") +
      "</div>";

    d.body.appendChild(dv);
    dv.addEventListener("click", function (e) { if (e.target === dv) dv.remove(); });
    var px = d.getElementById("prox"); if (px) px.onclick = function () { dv.remove(); };

    if (rAdm) {
      var pn = d.getElementById("pronew"); if (pn) pn.onclick = function () { d.getElementById("progenout").value = genCode(); };
      var pc = d.getElementById("procopy"); if (pc) pc.onclick = function () {
        var inp = d.getElementById("progenout"); inp.select();
        try { navigator.clipboard.writeText(inp.value); } catch (e) { try { d.execCommand("copy"); } catch (e2) {} }
        this.textContent = "✅ اننسخ!";
      };
      [].forEach.call(dv.querySelectorAll("[data-propm]"), function (bt) {
        bt.onclick = function () { setPreview(bt.getAttribute("data-propm")); dv.remove(); };
      });
    }
    var wc = d.getElementById("prowcopy");
    if (wc) wc.onclick = function () {
      try { navigator.clipboard.writeText(WHISH_RAW); } catch (e) {}
      this.textContent = "✅ اننسخ الرقم!";
    };
    var pg = d.getElementById("progo");
    if (pg) pg.onclick = function () {
      var v = d.getElementById("procode").value;
      if (checkCode(v)) { dv.remove(); alert("🎉 تم تفعيل اشتراك Pro لمدة 30 يوم!"); }
      else { var er = d.getElementById("proerr"); er.textContent = "❌ الكود مش صحيح، تأكّد منو."; er.hidden = false; }
    };
  }

  function paint() {
    css();
    var old = d.getElementById("prohome");
    if (d.getElementById("hz") && old && old.parentNode) old.parentNode.removeChild(old);
  }

  d.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-proopen]") : null;
    if (b) { e.preventDefault(); open(); }
  });

  w.NursinPro = {
    isAdmin: isAdmin,
    isRealAdmin: isRealAdmin,
    isPro: isPro,
    canUse: canUse,
    status: status,
    guard: guard,
    markUsed: markUsed,
    nudge: nudge,
    open: open,
    barHtml: barHtml,
    checkCode: checkCode,
    genCode: genCode,
    setPreview: setPreview,
    WHISH_NUM: WHISH_NUM
  };

  ["nursin:auth", "nursin:me"].forEach(function (ev) {
    d.addEventListener(ev, function () { setTimeout(function () { paint(); emit(); }, 100); });
  });
  function boot() { paint(); checkNotifications(); }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
  setTimeout(function () { paint(); emit(); }, 1200);
})(window, document);
