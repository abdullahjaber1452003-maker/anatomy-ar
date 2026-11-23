(function (w, d) {
  "use strict";
  var K = "nursin_pro_v1", OWNER = "abdullahjaber1452003@gmail.com";
  function lsGet(k) { try { return JSON.parse(w.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function isAdmin() {
    try {
      var u = w.NursinFB && w.NursinFB.user;
      if (u && u.email === OWNER) return true;
      var me = (w.Nursin && w.Nursin.me) || lsGet("nursin_me_v1");
      if (me && me.email === OWNER) return true;
    } catch (e) {}
    return false;
  }
  function isPro() {
    if (isAdmin()) return true;
    var p = lsGet(K);
    return !!(p && p.exp > Date.now());
  }
  function checkCode(c) {
    c = String(c || "").trim().toUpperCase();
    if (c === "NURSIN-PRO-2026" || /^NURSIN-\d{4}-[A-Z0-9]{4}$/.test(c)) {
      lsSet(K, { code: c, exp: Date.now() + 30 * 864e5 });
      return true;
    }
    return false;
  }
  function genCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", suf = "", num = String(Math.floor(1000 + Math.random() * 9000));
    for (var i = 0; i < 4; i++) suf += chars.charAt(Math.floor(Math.random() * chars.length));
    return "NURSIN-" + num + "-" + suf;
  }
  function css() {
    if (d.getElementById("procss")) return;
    var s = d.createElement("style"); s.id = "procss";
    s.textContent = ".prow{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".prob{background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:18px;padding:18px;max-width:420px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:15px;line-height:1.6}" +
      ".prob h3{margin:0 0 8px;font-size:18px}.prob ul{margin:6px 0 12px;padding-inline-start:18px}" +
      ".prob input{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid rgba(127,127,127,.4);font:inherit;margin:6px 0;text-align:center;text-transform:uppercase}" +
      ".probadge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:13px;border:0;cursor:pointer;margin:6px 0}" +
      ".probadge.adm{background:linear-gradient(135deg,#0f766e,#0d9488)}";
    (d.head || d.body).appendChild(s);
  }
  function open() {
    css();
    var old = d.querySelector(".prow"); if (old) old.remove();
    var adm = isAdmin(), pro = isPro();
    var dv = d.createElement("div"); dv.className = "prow";
    dv.innerHTML = "<div class='prob'><h3>" + (adm ? "👑 لوحة اشتراك Pro (أدمن)" : "⭐ اشتراك nursin.store Pro") + "</h3>" +
      (adm
        ? "<p class='small'>حسابك أدمن فـ <b>Pro مفعّل تلقائياً</b> إلك بكل الموقع ✓</p><p><b>🔑 توليد كود اشتراك جديد لطالب (30 يوم):</b></p><input id='progenout' readonly value='" + genCode() + "'><div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px'><button type='button' class='btn pri' id='procopy'>📋 انسخ الكود</button><button type='button' class='btn' id='pronew'>🔄 كود تاني</button><button type='button' class='btn' id='prox'>سكّر</button></div>"
        : "<p class='small'>ادرس بذكاء واطلع جاهز للامتحان الرسمي:</p><ul><li>📖 <b>وضع التعلّم + 🔒 قفل الإتقان</b> مفتوح لكل المواد</li><li>👨‍🏫 <b>الأستاذ عثمان بلا حدود</b> (بسّطلي + محاكي المريض /10 + مصحّح الكتابي /20)</li><li>📅 <b>خطة ليلة الامتحان</b> + 🎬 <b>الريلز بالصوت اللبناني</b></li></ul>" +
          (pro ? "<p><b>✅ اشتراكك Pro مفعّل حالياً!</b></p><div style='display:flex;gap:8px;margin-top:8px'><button type='button' class='btn pri' id='prox'>تمام</button></div>"
            : "<p><b>💳 الاشتراك: $4 / شهر عبر Whish Money</b></p><input id='procode' placeholder='أدخل كود التفعيل (مثال: NURSIN-PRO-2026)'><p id='proerr' class='small' style='color:#dc2626' hidden></p><div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px'><button type='button' class='btn pri' id='progo'>✅ فعّل الكود</button><button type='button' class='btn' id='prox'>سكّر</button></div>")) +
      "</div>";
    d.body.appendChild(dv);
    d.getElementById("prox").onclick = function () { dv.remove(); };
    if (adm) {
      d.getElementById("pronew").onclick = function () { d.getElementById("progenout").value = genCode(); };
      d.getElementById("procopy").onclick = function () {
        var inp = d.getElementById("progenout"); inp.select();
        try { navigator.clipboard.writeText(inp.value); } catch (e) { try { d.execCommand("copy"); } catch (e2) {} }
        this.textContent = "✅ اننسخ!";
      };
    } else if (!pro) {
      d.getElementById("progo").onclick = function () {
        var v = d.getElementById("procode").value;
        if (checkCode(v)) { dv.remove(); paint(); alert("🎉 تم تفعيل اشتراك Pro لمدة 30 يوم!"); }
        else { var er = d.getElementById("proerr"); er.textContent = "❌ الكود مش صحيح، تأكّد منو."; er.hidden = false; }
      };
    }
  }
  function paint() {
    css();
    var adm = isAdmin(), pro = isPro();
    var b = d.getElementById("prohome");
    if (!b) {
      var h = d.getElementById("osmhome") || d.getElementById("wkles") || d.querySelector("main");
      if (!h) return;
      b = d.createElement("button"); b.type = "button"; b.id = "prohome"; b.onclick = open;
      if (h.tagName === "MAIN") h.insertBefore(b, h.firstChild); else h.parentNode.insertBefore(b, h);
    }
    b.className = "probadge" + (adm ? " adm" : "");
    b.textContent = adm ? "👑 أدمن · Pro مفعّل ✓ (ولّد كود)" : pro ? "⭐ حسابك Pro مفعّل ✓" : "⭐ فعّل اشتراك Pro ($4/شهر)";
  }
  w.NursinPro = { isAdmin: isAdmin, isPro: isPro, open: open, checkCode: checkCode, genCode: genCode };
  ["nursin:auth", "nursin:me"].forEach(function (ev) { d.addEventListener(ev, function () { setTimeout(paint, 80); }); });
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", paint); else paint();
  setTimeout(paint, 1200);
})(window, document);
