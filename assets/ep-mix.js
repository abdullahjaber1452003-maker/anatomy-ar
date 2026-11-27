/* Exam-prep quick normal questions + 2-tab mobile layout switcher
   (📝 أسئلة سريعة ومراجعة | 🩺 الخطة والحالة السريرية /20).
   Guarantees balanced round-robin coverage across EVERY single lesson selected for the exam.
   ES5 (iOS 12 safe). */
(function (w, d) {
  "use strict";
  var K = "nursin_ep_done_v1";
  var TAB_K = "nursin_ep_tab_v1";
  var BANK = [
    { s: "cardio", l: "infarctus", q: "شو الفرق الأساسي بين Angor stable و Infarctus (IDM)؟", o: ["الـ Angor بيروح بالراحة أو Trinitrine والـ IDM بيستمر >20 دقيقة مع ارتفاع Troponine", "الـ IDM بيروح بالراحة خلال دقيقتين", "الـ Angor فيه دائماً ارتفاع ST دائم"], a: 0, x: "الذبحة المستقرة بتخف بالراحة والنيتروغليسيرين، أما الجلطة فإقفار مستمر مع نخر خلوي وارتفاع تروبونين." },
    { s: "cardio", l: "oap", q: "شو أول علامة بتدلّ على OAP (وذمة رئوية حادة) عند مريض قصور قلب أيسر؟", o: ["زلة تنفسية حادة مع خراخر فقاعية (crépitants) وقشع زهري رغوي", "اصفرار بالجلد وألم أيمن بالبطن", "بطء نبض أقل من 40"], a: 0, x: "قصور القلب الأيسر يرفع الضغط الشعيري الرئوي فيسبب ارتشاحاً سنخياً وزلة حادة وقشعاً زهرياً." },
    { s: "neuro", l: "avc", q: "شو الفحص الأولي العاجل عند الاشتباه بـ AVC قبل إعطاء أي مميّع؟", o: ["Scanner cérébral بدون حقن (CT sans injection) لنفي النزيف", "بزل قطني فوري", "تخطيط قلب فقط"], a: 0, x: "لازم ننفي الـ AVC hémorragique بالـ Scanner قبل أي علاج حالّ للخثرة أو مضاد تخثر." },
    { s: "neuro", l: "coma", q: "توسّع حدقة واحد مع غياب التفاعل للضوء عند مريض غيبوبة بيدلّ غالباً على:", o: ["انضغاط العصب الثالث (انفتاق دماغي / Engagement)", "هبوط سكر بسيط", "التهاب بول"], a: 0, x: "توسّع حدقة أحادي غير متفاعل إنذار أحمر بارتفاع الضغط داخل القحف وانفتاق دماغي." },
    { s: "pharma", l: "antidote", q: "أي ترياق (Antidote) يُعطى عند التسمّم بالـ Morphine / Opioïdes؟", o: ["Naloxone (Narcan)", "Flumazenil", "Vitamine K"], a: 0, x: "النالوكسون يعاكس مستقبلات الأفيونات ويعيد التنفس سريعاً؛ الفلومازينيل للبنزوديازيبينات." },
    { s: "rea", l: "choc", q: "المعيار الأهم لتأكيد الصدمة الإنتانية (Choc septique) رغم الإنعاش بالسوائل هو:", o: ["الحاجة لـ Vasopresseurs (Noradrénaline) للحفاظ على PAM >= 65 mmHg مع Lactate > 2", "حرارة 37.5 فقط", "ضغط دم 130/80 بدون أدوية"], a: 0, x: "الصدمة الإنتانية تتطلب رافعات ضغط للحفاظ على PAM >= 65 وارتفاع اللاكتات رغم ملء الأوعية." }
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
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function lessonLabel(sk, lk) {
    var NL = w.NLESSONS || {}, list = (w.NursinLessons && w.NursinLessons.parts) || NL.list || [];
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (x.s === sk && (x.l === lk || x.t === lk)) return x.n;
    }
    var sb = (NL.subjects || {})[sk];
    return (sb && sb.ar) ? sb.ar : (lk || sk || "");
  }

  /* Picks a balanced set covering EVERY selected exam lesson (at least 1-2 Qs per lesson, round-robin) */
  function pick() {
    var ex = {}, M = w.NursinMid, earr = (M && M.EXAMS && M.EXAMS.length) ? M.EXAMS : [];
    try { ex = JSON.parse(w.localStorage.getItem("nursin_explan_v1") || "{}") || {}; } catch (e) {}
    if (!earr.length) {
      try { earr = (JSON.parse(w.localStorage.getItem("nursin_exams_cfg_v1") || "{}") || {}).list || []; } catch (e) {}
    }
    var td = new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10);
    var subjs = Array.isArray(ex.subjs) && ex.subjs.length ? ex.subjs : ["cardio", "neuro"];

    function aLes(sk) {
      var b = null;
      earr.forEach(function (e) {
        if (e && e.subs && e.subs.indexOf(sk) > -1) {
          if (!b || (e.d >= td && (b.d < td || e.d < b.d))) b = e;
        }
      });
      return (b && b.lessons && Array.isArray(b.lessons[sk]) && b.lessons[sk].length) ? b.lessons[sk] : null;
    }

    var Q = w.QUIZ || [], buckets = {}, order = [], totalExpectedLessons = 0;
    subjs.forEach(function (sk) {
      var al = aLes(sk);
      var m = Q.filter(function (q) {
        return q && q.t === sk && (!al || !q.l || al.indexOf(q.l) > -1);
      });
      if (!m.length && al) m = Q.filter(function (q) { return q && q.t === sk; });
      if (al && al.length) totalExpectedLessons += al.length;
      m.forEach(function (q) {
        var lk = q.l || q.t || sk;
        var bk = sk + ":" + lk;
        if (!buckets[bk]) {
          buckets[bk] = { sk: sk, lk: lk, name: lessonLabel(sk, lk), qs: [] };
          order.push(bk);
        }
        buckets[bk].qs.push(q);
      });
    });

    var picked = [];
    if (order.length) {
      order = shuffle(order);
      order.forEach(function (bk) { buckets[bk].qs = shuffle(buckets[bk].qs); });
      // Target: cover EVERY single lesson at least once, and 2 Qs/lesson when <= 10 lessons (cap at 24 Qs)
      var perLesson = order.length <= 8 ? 2 : 1;
      var maxTotal = Math.max(order.length, Math.min(24, order.length * perLesson));
      var r = 0;
      while (picked.length < maxTotal && r < 4) {
        var added = false;
        for (var i = 0; i < order.length && picked.length < maxTotal; i++) {
          var b = buckets[order[i]];
          if (b.qs[r]) {
            var q0 = b.qs[r];
            picked.push({
              q: q0.q, o: q0.o, a: q0.a, x: q0.x || "",
              _les: b.name, _bk: order[i]
            });
            added = true;
          }
        }
        if (!added) break;
        r++;
      }
      return { qs: picked, covered: order.length, expected: Math.max(order.length, totalExpectedLessons) };
    }

    var fb = BANK.filter(function (q) { return subjs.indexOf(q.s) > -1; });
    if (!fb.length) fb = BANK.slice();
    var sh = shuffle(fb).map(function (q) {
      return { q: q.q, o: q.o, a: q.a, x: q.x || "", _les: lessonLabel(q.s, q.l), _bk: q.s + ":" + q.l };
    });
    return { qs: sh, covered: sh.length, expected: sh.length };
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

  function remountMix() {
    var o = d.getElementById("ep-mix-card");
    if (o && o.parentNode) o.parentNode.removeChild(o);
    mountMix();
    var saved = "case";
    try { saved = w.sessionStorage.getItem(TAB_K) || "case"; } catch (e) {}
    applyTabs(saved);
  }
  d.addEventListener("nursin:explan", remountMix);

  function mountMix() {
    var app = d.getElementById("ep-app");
    if (!app || d.getElementById("ep-mix-card")) return;
    var res = pick(), qs = res.qs;
    var card = d.createElement("section");
    card.id = "ep-mix-card";
    card.className = "epcard";
    card.style.marginTop = "6px";

    var topRow = d.createElement("div");
    topRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px";
    var h = d.createElement("h3");
    h.textContent = "📝 أسئلة سريعة شاملة لدروس الامتحان";
    h.style.margin = "0";
    var rf = d.createElement("button");
    rf.type = "button";
    rf.className = "btn sm";
    rf.textContent = "🔄 دفعة أسئلة جديدة";
    rf.onclick = remountMix;
    topRow.appendChild(h);
    topRow.appendChild(rf);
    card.appendChild(topRow);

    var info = d.createElement("p");
    info.className = "small";
    info.style.cssText = "margin:0 0 10px;padding:7px 10px;border-radius:10px;background:rgba(15,118,110,.09);border:1px solid rgba(15,118,110,.25)";
    info.textContent = "📚 تغطية شاملة لكل الدروس المحدّدة للامتحان: " + res.covered + " درس · " + qs.length + " سؤال (بتقطع عكل الدروس)";
    card.appendChild(info);

    for (var i = 0; i < qs.length; i++) {
      (function (it, idx) {
        var bx = d.createElement("div");
        bx.style.padding = "10px 0";
        bx.style.borderTop = idx ? "1px dashed rgba(127,127,127,.25)" : "0";
        if (it._les) {
          var tag = d.createElement("span");
          tag.style.cssText = "display:inline-block;margin-bottom:5px;padding:2px 8px;border-radius:999px;background:rgba(15,118,110,.12);color:#0f766e;font-size:11.5px;font-weight:700";
          tag.textContent = "📖 " + it._les;
          bx.appendChild(tag);
        }
        var pq = d.createElement("p");
        pq.style.fontWeight = "700";
        pq.style.margin = "0 0 8px";
        pq.textContent = (idx + 1) + ") " + it.q;
        bx.appendChild(pq);
        var fb = d.createElement("div");
        fb.style.fontSize = "13px";
        fb.style.marginTop = "6px";
        fb.hidden = true;
        var okIdx = Array.isArray(it.a) ? it.a : [it.a];
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
              var isRight = okIdx.indexOf(oi) > -1;
              if (isRight) {
                b.style.background = "#16a34a";
                b.style.color = "#fff";
                fb.textContent = "✅ صح! " + it.x;
              } else {
                b.style.background = "#dc2626";
                b.style.color = "#fff";
                var rightTxt = okIdx.map(function (k) { return it.o[k]; }).join(" + ");
                fb.textContent = "❌ الصح: " + rightTxt + (it.x ? " — " + it.x : "");
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

    var bot = d.createElement("p");
    bot.style.cssText = "margin:10px 0 0;text-align:center";
    var rf2 = d.createElement("button");
    rf2.type = "button";
    rf2.className = "btn pri sm";
    rf2.textContent = "🔄 دفعة أسئلة جديدة على كل الدروس";
    rf2.onclick = remountMix;
    bot.appendChild(rf2);
    card.appendChild(bot);

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
