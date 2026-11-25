/* Exam-prep quick normal questions + 2-tab mobile layout switcher
   (📝 أسئلة سريعة ومراجعة | 🩺 الخطة والحالة السريرية /20). ES5 (iOS 12 safe). */
(function (w, d) {
  "use strict";
  var K = "nursin_ep_done_v1";
  var TAB_K = "nursin_ep_tab_v1";
  var BANK = [
    { s: "cardio", q: "شو الفرق الأساسي بين Angor stable و Infarctus (IDM)؟", o: ["الـ Angor بيروح بالراحة أو Trinitrine والـ IDM بيستمر >20 دقيقة مع ارتفاع Troponine", "الـ IDM بيروح بالراحة خلال دقيقتين", "الـ Angor فيه دائماً ارتفاع ST دائم"], a: 0, x: "الذبحة المستقرة بتخف بالراحة والنيتروغليسيرين، أما الجلطة فإقفار مستمر مع نخر خلوي وارتفاع تروبونين." },
    { s: "cardio", q: "شو أول علامة بتدلّ على OAP (وذمة رئوية حادة) عند مريض قصور قلب أيسر؟", o: ["زلة تنفسية حادة مع خراخر فقاعية (crépitants) وقشع زهري رغوي", "اصفرار بالجلد وألم أيمن بالبطن", "بطء نبض أقل من 40"], a: 0, x: "قصور القلب الأيسر يرفع الضغط الشعيري الرئوي فيسبب ارتشاحاً سنخياً وزلة حادة وقشعاً زهرياً." },
    { s: "neuro", q: "شو الفحص الأولي العاجل عند الاشتباه بـ AVC قبل إعطاء أي مميّع؟", o: ["Scanner cérébral بدون حقن (CT sans injection) لنفي النزيف", "بزل قطني فوري", "تخطيط قلب فقط"], a: 0, x: "لازم ننفي الـ AVC hémorragique بالـ Scanner قبل أي علاج حالّ للخثرة أو مضاد تخثر." },
    { s: "neuro", q: "توسّع حدقة واحد مع غياب التفاعل للضوء عند مريض غيبوبة بيدلّ غالباً على:", o: ["انضغاط العصب الثالث (انفتاق دماغي / Engagement)", "هبوط سكر بسيط", "التهاب بول"], a: 0, x: "توسّع حدقة أحادي غير متفاعل إنذار أحمر بارتفاع الضغط داخل القحف وانفتاق دماغي." },
    { s: "pharma", q: "أي ترياق (Antidote) يُعطى عند التسمّم بالـ Morphine / Opioïdes؟", o: ["Naloxone (Narcan)", "Flumazenil", "Vitamine K"], a: 0, x: "النالوكسون يعاكس مستقبلات الأفيونات ويعيد التنفس سريعاً؛ الفلومازينيل للبنزوديازيبينات." },
    { s: "rea", q: "المعيار الأهم لتأكيد الصدمة الإنتانية (Choc septique) رغم الإنعاش بالسوائل هو:", o: ["الحاجة لـ Vasopresseurs (Noradrénaline) للحفاظ على PAM >= 65 mmHg مع Lactate > 2", "حرارة 37.5 فقط", "ضغط دم 130/80 بدون أدوية"], a: 0, x: "الصدمة الإنتانية تتطلب رافعات ضغط للحفاظ على PAM >= 65 وارتفاع اللاكتات رغم ملء الأوعية." }
  ];

  function getEp() {
    try { return JSON.parse(w.localStorage.getItem(K) || "{}"); } catch (e) { return {}; }
  }
  function incEp() {
    var o = getEp();
    o.n = (+o.n || 0) + 1;
    o.t = Date.now();
    try { w.localStorage.setItem(K, JSON.stringify(o)); } catch (e) {}
  }
  function pick() {
    var res = [], i;
    for (i = 0; i < BANK.length && res.length < 3; i++) {
      res.push(BANK[(Math.floor(Date.now() / 60000) + i) % BANK.length]);
    }
    return res;
  }

  function applyTabs(active) {
    var app = d.getElementById("ep-app");
    if (!app) return;
    try { w.sessionStorage.setItem(TAB_K, active); } catch (e) {}
    var kids = app.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === "ep-tabbar") continue;
      var isQuick = (el.id === "ep-mix-card" || el.id === "ntemp-sec");
      el.style.display = (active === "quick") ? (isQuick ? "" : "none") : (isQuick ? "none" : "");
    }
    var b1 = d.getElementById("eptab-case"), b2 = d.getElementById("eptab-quick");
    if (b1 && b2) {
      b1.style.background = active === "case" ? "#0f766e" : "transparent";
      b1.style.color = active === "case" ? "#fff" : "inherit";
      b2.style.background = active === "quick" ? "#0f766e" : "transparent";
      b2.style.color = active === "quick" ? "#fff" : "inherit";
    }
  }

  function mountTabs() {
    var app = d.getElementById("ep-app");
    if (!app || d.getElementById("ep-tabbar")) return;
    var bar = d.createElement("div");
    bar.id = "ep-tabbar";
    bar.style.cssText = "display:flex;gap:6px;padding:5px;margin:0 0 12px;border-radius:14px;background:rgba(127,127,127,.12);position:sticky;top:6px;z-index:20;backdrop-filter:blur(8px)";

    var b1 = d.createElement("button");
    b1.id = "eptab-case";
    b1.type = "button";
    b1.style.cssText = "flex:1;padding:9px 10px;border:0;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer";
    b1.textContent = "🩺 الخطة والحالة /20";
    b1.onclick = function () { applyTabs("case"); };

    var b2 = d.createElement("button");
    b2.id = "eptab-quick";
    b2.type = "button";
    b2.style.cssText = "flex:1;padding:9px 10px;border:0;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer";
    b2.textContent = "📝 أسئلة سريعة ومراجعة";
    b2.onclick = function () { applyTabs("quick"); };

    bar.appendChild(b1);
    bar.appendChild(b2);
    app.insertBefore(bar, app.firstChild);
    var saved = "case";
    try { saved = w.sessionStorage.getItem(TAB_K) || "case"; } catch (e) {}
    applyTabs(saved);
  }

  function mountMix() {
    var app = d.getElementById("ep-app");
    if (!app || d.getElementById("ep-mix-card")) return;
    var qs = pick();
    var card = d.createElement("section");
    card.id = "ep-mix-card";
    card.className = "epcard";
    card.style.marginTop = "6px";

    var h = d.createElement("h3");
    h.textContent = "📝 أسئلة عادية سريعة";
    h.style.margin = "0 0 10px";
    card.appendChild(h);

    for (var i = 0; i < qs.length; i++) {
      (function (it, idx) {
        var bx = d.createElement("div");
        bx.style.padding = "10px 0";
        bx.style.borderTop = idx ? "1px dashed rgba(127,127,127,.25)" : "0";
        var pq = d.createElement("p");
        pq.style.fontWeight = "700";
        pq.style.margin = "0 0 8px";
        pq.textContent = (idx + 1) + ") " + it.q;
        bx.appendChild(pq);
        var fb = d.createElement("div");
        fb.style.fontSize = "13px";
        fb.style.marginTop = "6px";
        fb.hidden = true;
        for (var j = 0; j < it.o.length; j++) {
          (function (oj, oi) {
            var b = d.createElement("button");
            b.type = "button";
            b.className = "epchip";
            b.style.display = "block";
            b.style.width = "100%";
            b.style.textAlign = "right";
            b.style.marginBottom = "5px";
            b.textContent = oj;
            b.addEventListener("click", function () {
              if (fb.dataset.dn) return;
              fb.dataset.dn = "1";
              fb.hidden = false;
              if (oi === it.a) {
                b.style.background = "#16a34a";
                b.style.color = "#fff";
                fb.textContent = "✅ صح! " + it.x;
              } else {
                b.style.background = "#dc2626";
                b.style.color = "#fff";
                fb.textContent = "❌ الصح: " + it.o[it.a] + " — " + it.x;
              }
              incEp();
            });
            bx.appendChild(b);
          })(it.o[j], j);
        }
        bx.appendChild(fb);
        card.appendChild(bx);
      })(qs[i], i);
    }

    var nt = d.getElementById("ntemp-sec");
    if (nt && nt.parentNode === app) app.insertBefore(card, nt);
    else app.appendChild(card);
  }

  function sync() {
    mountMix();
    mountTabs();
    var saved = "case";
    try { saved = w.sessionStorage.getItem(TAB_K) || "case"; } catch (e) {}
    applyTabs(saved);
  }

  function boot() {
    setTimeout(sync, 350);
    setTimeout(sync, 900);
    if (w.MutationObserver) {
      var a = d.getElementById("ep-app");
      var busy = false;
      if (a) {
        new MutationObserver(function () {
          if (busy) return;
          busy = true;
          setTimeout(function () { sync(); busy = false; }, 120);
        }).observe(a, { childList: true });
      }
    }
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
