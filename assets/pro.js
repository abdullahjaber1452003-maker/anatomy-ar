(function (w, d) {
  "use strict";
  var K = "nursin_pro_v1", TK = "nursin_pro_trial_v1", PK = "nursin_pro_preview_v1";
  var OWNER = "abdullahjaber1452003@gmail.com";
  var TRIAL_DAYS = 3, TRIAL_MS = TRIAL_DAYS * 864e5;
  var WHISH_NUM = "79 117 048", WHISH_RAW = "79117048", WA_NUM = "96179117048";

  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function emit() { try { d.dispatchEvent(new CustomEvent("nursin:pro")); } catch (e) {} }

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
    if (isAdmin()) return { ok: true, mode: "admin", daysLeft: 999, hoursLeft: 999 };
    var pm = previewMode();
    if (pm === "expired") return { ok: false, mode: "expired", daysLeft: 0, hoursLeft: 0 };
    if (pm === "trial") return { ok: true, mode: "trial", daysLeft: 2, hoursLeft: 48 };
    var p = lsGet(K);
    if (p && p.exp > Date.now()) {
      var dLeft = Math.max(1, Math.ceil((p.exp - Date.now()) / 864e5));
      return { ok: true, mode: "pro", daysLeft: dLeft, hoursLeft: dLeft * 24 };
    }
    var tr = ensureTrial();
    var left = (tr.start + TRIAL_MS) - Date.now();
    if (left > 0) {
      return {
        ok: true,
        mode: "trial",
        daysLeft: Math.max(1, Math.ceil(left / 864e5)),
        hoursLeft: Math.max(1, Math.ceil(left / 36e5))
      };
    }
    return { ok: false, mode: "expired", daysLeft: 0, hoursLeft: 0 };
  }

  function canUse() { return status().ok; }
  function isPro() { return canUse(); }

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

  function guard(featureName) {
    if (canUse()) return true;
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
      ".probadge{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:13px;border:0;cursor:pointer;margin:6px 0}" +
      ".probadge.adm{background:linear-gradient(135deg,#0f766e,#0d9488)}";
    (d.head || d.body).appendChild(s);
  }

  function barHtml() {
    css();
    var st = status(), rAdm = isRealAdmin(), pm = previewMode();
    if (st.mode === "admin") {
      return "<button type='button' class='probar adm' data-proopen><div><b>👑 أدمن · Pro مفعّل تلقائياً ✓</b><small>ولّد كود اشتراك لطالب أو جرّب معاينة الطالب</small></div><span class='protag free'>لوحة الأدمن</span></button>";
    }
    if (st.mode === "pro") {
      return "<button type='button' class='probar adm' data-proopen><div><b>⭐ اشتراكك Pro مفعّل ✓</b><small>باقي " + st.daysLeft + " يوم · كل الميزات مفتوحة</small></div><span class='protag free'>PRO ✓</span></button>";
    }
    if (st.mode === "trial") {
      var dTxt = st.daysLeft === 1 ? "باقي أقل من يوم" : "باقي " + st.daysLeft + " أيام";
      return "<button type='button' class='probar' data-proopen><div><b>🎁 تجربة Pro المجانية شغّالة (" + dTxt + ")</b><small>" + (rAdm && pm ? "👁️ معاينة كطالب · " : "") + "جرّب وضع التعلّم والمصحّح ومحاكي المريض · بعدها $4/شهر عبر Whish</small></div><span class='protag'>فعّل Pro</span></button>";
    }
    return "<button type='button' class='probar exp' data-proopen><div><b>🔒 خلصت التجربة المجانية (٣ أيام)</b><small>" + (rAdm && pm ? "👁️ معاينة كطالب · " : "") + "فعّل Pro بـ $4/شهر عبر Whish Money لتكمل وضع التعلّم والمصحّح</small></div><span class='protag'>$4 / شهر</span></button>";
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
        "<button type='button' class='btn sm" + (pm === "trial" ? " pri" : "") + "' data-propm='trial'>🎁 طالب (تجربة)</button>" +
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
    // On index.html (#hz exists), home.js renders barHtml() cleanly inside #hz.
    // Remove any fallback #prohome if #hz exists.
    var old = d.getElementById("prohome");
    if (d.getElementById("hz")) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
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
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", paint); else paint();
  setTimeout(function () { paint(); emit(); }, 1200);
})(window, document);
