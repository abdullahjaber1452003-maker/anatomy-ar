/* 🚑 ناوبة بالطوارئ v3 — «الحالة قصّة عايشة» (Abdullah, Oct 27 2026 12:34–12:36 PM, voice): not 3 questions and out — inside each case
   you DO things (قيس النبض/الضغط، فحص، مختبر، ECG، مصل، دوا، اتصل بالدكتور…) in any order, many open at once; every action takes game
   time, is written in «📋 ملف المريض» and changes the patient: untreated he slowly gets worse, the right things make him better over the
   next game minutes (come back and re-measure to see it), wrong ones make him worse with the correction from the notes.
   CONTENT ONLY FROM HIS RÉA NOTEBOOK (/memory/abdullah_rea_notes.md, photos rea-1..16): every sign, direction of change, treatment and
   threshold below is written in his notes; items he marked [؟] are left out; hypokaliémie shows «منخفض», no number. Monitor numbers are
   approximate GAME values (the monitor says so) that only move in the directions his notes give (e.g. hypovolémie: TA ↓ FC ↑).
   This file = data (window.ERSTORY.cases, one per ERSIM case id) + a pure engine (no DOM, node-testable): create / act / tick / quiz.
   Text fields are plain strings (n = action name, r = result, x = explanation from the notes) so a French version can sit beside them.
   Action kinds: meas (reveals a vital), exam / ecg (text, by patient band), lab (result after dl game minutes), call (doctor), scope
   (monitor), talk, quiz (opens ERSIM steps), tx (right treatment / nursing act), bad (wrong: patient worse + ❌/✅ line), nop (only costs time).
   Bands: sev < 25 → [0] 🟢, < 65 → [1] 🟡, else [2] 🔴. */
(function (w) {
  "use strict";
  var K = { stab: 20, red: 65, green: 25, sec: [0, 8, 6, 4], drift: [0, 0.7, 1, 1.3], dt: 0.25, rec: 0.8 };   // sec = real seconds per game minute (سهل/وسط/صعب)
  // vitals every case can measure (values per case below; one number = does not move in this case)
  var MEAS = [
    { id: "m_fc", ic: "💓", n: "قيس النبض (FC)", s: "النبض", v: "fc", m: 1 },
    { id: "m_ta", ic: "🩺", n: "قيس الضغط (TA)", s: "الضغط", v: "ta", m: 2 },
    { id: "m_spo", ic: "🫧", n: "قيس الـ SpO2", s: "SpO2", v: "spo", m: 1 },
    { id: "m_t", ic: "🌡️", n: "قيس الحرارة (T°)", s: "الحرارة", v: "t", m: 1 }
  ];
  var MX = "دور الممرّض: مراقبة العلامات الحيوية (constantes). قيس مرّة تانية بعد العلاج لتشوف إذا تحسّن.";
  var CASES = {
    hypovol: {
      sev0: 50, d0: 1.0, by: 15,
      vit: { fc: [100, 125, 150], sys: [110, 85, 60], dia: [70, 50, 35], spo: 97, t: 36.8 },
      mx: { fc: "بنوطاتك: hypovolémie = نبض سريع (FC ↑).", ta: "بنوطاتك: hypovolémie = ضغط واطي (TA ↓)." },
      doc: "«بلّش sérum IV دغري، حضّر transfusion sanguine (نقل دم)، ولازم نوقّف النزيف (علاج السبب).»",
      lost: "النزيف ونقص السوايل ما انعالجو بالوقت: الضغط نزل كتير والنبض صار سريع كتير (hypovolémie).",
      alarm: "🚨 الضغط عم ينزل والنبض عم يسرع!",
      acts: [
        { id: "skin", k: "exam", g: "pt", ic: "🔎", n: "فحص الجلد والأطراف", s: "الجلد", m: 1, r: ["الجلد عم يدفى ولونو عم يرجع", "جلد بارد وشاحب (pâleur)، أطراف باردة، تم وعيون ناشفين", "شحوب شديد وأطراف باردة كتير"], x: "بنوطاتك: علامات hypovolémie: أطراف باردة، شحوب، تم وعيون وجلد ناشفين." },
        { id: "io", k: "exam", g: "pt", ic: "🚽", n: "Bilan entrées/sorties (البول)", s: "البول", m: 3, r: ["البول عم يزيد ✅", "بول قليل (diurèse ↓)", "بول قليل كتير"], x: "بنوطاتك: قلّة البول من علامات hypovolémie." },
        { id: "iv", k: "tx", g: "iv", ic: "💧", n: "Sérum IV (تعويض السوايل بالوريد)", m: 3, key: 1, pri: 1, d: -28, dur: 18, dr: 0.5, x: "بنوطاتك: العلاج = تعويض السوايل بالوريد." },
        { id: "bleed", k: "tx", g: "pt", ic: "🩹", n: "علاج السبب: وقف النزيف (مع الدكتور)", m: 3, key: 1, pri: 1, d: -10, dur: 9, dr: 0.3, x: "دايماً بنوطاتك: علاج السبب، وهون السبب هو النزيف." },
        { id: "transf", k: "tx", g: "iv", ic: "🩸", n: "Transfusion sanguine (نقل دم)", m: 5, ord: 1, key: 1, pri: 2, d: -28, dur: 22, dr: 0.5, x: "بنوطاتك: نقل دم إذا في نزيف." },
        { id: "b_diur", k: "bad", g: "cart", ic: "💊", n: "Diurétiques (مدرّات البول)", m: 2, ord: 1, d: 18, right: "Sérum IV (تعويض السوايل)", x: "المدرّات علاج hypervolémie؛ بالـ hypovolémie بيضيّعو سوايل أكتر وبيزيدو الوضع سوء." },
        { id: "b_restr", k: "bad", g: "iv", ic: "🚱", n: "تحديد السوايل والملح", m: 1, d: 14, right: "Sérum IV (تعويض السوايل)", x: "تحديد السوايل والملح علاج hypervolémie؛ هون الجسم ناقصو سوايل." },
        { id: "b_kay", k: "bad", g: "cart", ic: "💊", n: "Kayexalate", m: 2, ord: 1, d: 10, right: "Transfusion sanguine + sérum IV", x: "Kayexalate بيشيل الـ K عن طريق الأمعاء (علاج hyperkaliémie)، ما إلو علاقة بالنزيف." }
      ],
      ideal: ["m_ta", "m_fc", "skin", "iv", "bleed", "call", "transf", "io", "m_ta"]
    },
    hyperk: {
      sev0: 55, d0: 0.9, by: 15,
      vit: { fc: 88, sys: 130, dia: 80, spo: 97, t: 37 },
      ecg: ["ECG عم يتحسّن: الـ T أقل تدبيب", "Ondes T hautes et pointues (عالية ومدبّبة) + QRS élargi (عريض)", "T pointues + QRS élargi + PR allongé + P aplatie/absente ← خطر fibrillation ventriculaire"],
      doc: "«حضّر insuline + glucose، و bicarbonate IV إذا الغازات بيّنت acidose métabolique، و Kayexalate. وإذا لزم منحضّر dialyse.»",
      lost: "بنوطاتك: hyperkaliémie الشديدة بتوصّل لـ fibrillation ventriculaire (رجفان بطيني) و arrêt cardiaque (توقّف القلب).",
      alarm: "🚨 الـ ECG عم يسوء! (خطر رجفان بطيني)",
      acts: [
        { id: "musc", k: "exam", g: "pt", ic: "💪", n: "فحص قوّة العضلات والإحساس", s: "العضلات", m: 1, r: ["القوة عم ترجع، التنميل خفّ", "ضعف بالعضلات + تنميل بالأطراف", "الضعف عم يزيد ← خطر paralysie (شلل)"], x: "بنوطاتك: hyperkaliémie = ضعف عضلات ممكن يوصل لشلل، وتنميل بالأطراف." },
        { id: "ecg", k: "ecg", g: "mon", ic: "📈", n: "اعمل ECG", s: "ECG", m: 3, x: "بنوطاتك: ECG الـ hyperkaliémie: T عالية مدبّبة، QRS عريض، PR طويل، P مسطّحة أو غايبة؛ بالشديد رجفان بطيني." },
        { id: "labk", k: "lab", g: "lab", ic: "🧪", n: "اطلب K+ (البوتاسيوم)", s: "K+", m: 2, dl: 8, r: ["K+ نزل تحت 5.5 mEq/L ✅", "K+ = 6.8 mEq/L (فوق 5.5)", "K+ عم يطلع أكتر (فوق 6.8)"], x: "بنوطاتك: hyperkaliémie = K+ أكتر من 5.5 mEq/L." },
        { id: "gas", k: "lab", g: "lab", ic: "🫁", n: "اطلب غازات الدم (gaz du sang)", s: "الغازات", m: 2, dl: 10, r: "Gaz du sang: acidose métabolique (حماض أيضي)", x: "بنوطاتك: الـ acidose métabolique بتطلّع الـ K من الخلايا، وبتفيد فيها bicarbonate IV." },
        { id: "ins", k: "tx", g: "cart", ic: "💉", n: "Insuline + glucose", m: 3, ord: 1, key: 1, pri: 1, d: -20, dur: 15, dr: 0.4, x: "بنوطاتك: الأنسولين مع الغلوكوز بيدخّلو الـ K عالخلايا." },
        { id: "bicar", k: "tx", g: "iv", ic: "💧", n: "Bicarbonate IV", m: 3, ord: 1, need: "gas", nm: "🧪 استنّى نتيجة غازات الدم أوّل: الـ bicarbonate بنوطاتك بالـ acidose métabolique.", key: 1, pri: 2, d: -12, dur: 15, dr: 0.7, x: "بنوطاتك: bicarbonate IV بالـ acidose métabolique بيرجّع الـ K عالخلايا." },
        { id: "kay", k: "tx", g: "cart", ic: "💊", n: "Kayexalate", m: 2, ord: 1, key: 1, pri: 2, d: -22, dur: 30, dr: 0.3, x: "بنوطاتك: Kayexalate بيطلّع الـ K عن طريق الأمعاء." },
        { id: "dial", k: "tx", g: "phone", ic: "🏥", n: "تحضير dialyse (غسيل كلى) إذا لزم", m: 3, ord: 1, d: -8, dur: 20, x: "بنوطاتك: الـ dialyse أحياناً بتشيل الـ K." },
        { id: "b_kcl", k: "bad", g: "iv", ic: "💧", n: "KCl IV (بوتاسيوم بالوريد)", m: 2, ord: 1, d: 25, right: "Insuline + glucose", x: "إعطاء بوتاسيوم بيزيد الـ hyperkaliémie أكتر. الأنسولين مع الغلوكوز بيدخّلو الـ K عالخلايا." },
        { id: "b_spar", k: "bad", g: "cart", ic: "💊", n: "Diurétique épargneur de potassium", m: 2, ord: 1, d: 18, right: "Kayexalate", x: "بنوطاتك: المدرّات يلّي بتحافظ عالبوتاسيوم من أسباب hyperkaliémie." },
        { id: "b_ca", k: "bad", g: "cart", ic: "💊", n: "Calcium oral + vitamine D", m: 2, ord: 1, d: 8, right: "Insuline + glucose", x: "الكالسيوم بالتم + vitamine D علاج hypocalcémie بنوطاتك، مش علاج hyperkaliémie." }
      ],
      ideal: ["scope", "ecg", "labk", "gas", "call", "ins", "kay", "bicar", "ecg", "labk"]
    },
    hypok: {
      sev0: 50, d0: 0.9, by: 18,
      vit: { fc: 92, sys: 115, dia: 70, spo: 98, t: 37 },
      ecg: ["الـ T عم ترجع طبيعية والـ U أخف", "Onde T aplatie (مسطّحة) + onde U", "T aplatie/inversée + onde U bien visible + ST sous-décalé ← arythmie"],
      doc: "«عطيها potassium (بالتم أو بالوريد)، عالجو الاستفراغ، وتجنّبي الأدوية يلّي بتضيّع K متل بعض المدرّات.»",
      lost: "الضعف زاد والـ arythmie صارت خطيرة: hypokaliémie بتعمل arythmies بنوطاتك.",
      alarm: "🚨 الـ ECG عم يسوء (arythmie)!",
      acts: [
        { id: "musc", k: "exam", g: "pt", ic: "💪", n: "فحص العضلات", s: "العضلات", m: 1, r: ["التشنّجات خفّت والقوّة عم ترجع", "Crampes (تشنّجات) + ضعف بالعضلات", "الضعف عم يزيد كتير"], x: "بنوطاتك: hypokaliémie = ضعف عضلات وتشنّجات (crampes)." },
        { id: "ecg", k: "ecg", g: "mon", ic: "📈", n: "اعمل ECG", s: "ECG", m: 3, x: "بنوطاتك: ECG الـ hypokaliémie: T مسطّحة أو مقلوبة، onde U بارزة، ST نازل." },
        { id: "labk", k: "lab", g: "lab", ic: "🧪", n: "اطلب K+ (البوتاسيوم)", s: "K+", m: 2, dl: 8, r: ["K+ رجع طبيعي ✅", "K+ منخفض", "K+ منخفض أكتر"], x: "hypokaliémie = نقص البوتاسيوم بالدم." },
        { id: "kpo", k: "tx", g: "cart", ic: "💊", n: "Potassium oral ou IV", m: 3, ord: 1, key: 1, pri: 1, d: -28, dur: 21, dr: 0.3, x: "بنوطاتك: علاج hypokaliémie = K بالتم أو بالوريد." },
        { id: "cause", k: "tx", g: "phone", ic: "🤢", n: "علاج السبب: الاستفراغ (مع الدكتور)", m: 2, ord: 1, key: 1, pri: 2, d: -8, dur: 15, dr: 0.5, x: "بنوطاتك: أوّل شي علاج السبب (الاستفراغ ضيّعلها K)." },
        { id: "stop", k: "tx", g: "cart", ic: "🛑", n: "تجنّب الأدوية يلّي بتضيّع K (بعض المدرّات متل Lasix) — خبّر الدكتور", m: 1, key: 1, pri: 2, d: -6, dur: 12, dr: 0.5, x: "بنوطاتك: تجنّب الأدوية يلّي بتزيد خسارة البوتاسيوم، متل بعض مدرّات البول." },
        { id: "b_kay", k: "bad", g: "cart", ic: "💊", n: "Kayexalate", m: 2, ord: 1, d: 20, right: "Potassium oral ou IV", x: "Kayexalate بيطلّع الـ K من الجسم (علاج hyperkaliémie) — هون بينزّلو أكتر." },
        { id: "b_ins", k: "bad", g: "cart", ic: "💉", n: "Insuline + glucose", m: 2, ord: 1, d: 18, right: "Potassium oral ou IV", x: "الأنسولين مع الغلوكوز بيدخّلو الـ K عالخلايا فبينزل بالدم أكتر — علاج hyperkaliémie." },
        { id: "b_lasix", k: "bad", g: "cart", ic: "💊", n: "زيد جرعة الـ Lasix", m: 1, ord: 1, d: 16, right: "تجنّب الأدوية يلّي بتضيّع K", x: "بنوطاتك: الـ Lasix (diurétique) من أسباب hypokaliémie." }
      ],
      ideal: ["scope", "musc", "ecg", "labk", "call", "kpo", "cause", "stop", "ecg", "labk"]
    },
    hypona: {
      sev0: 50, d0: 0.9, by: 15,
      vit: { fc: 84, sys: 125, dia: 80, spo: 97, t: 37 },
      mx: { fc: "بنوطاتك: دور الممرّض بالـ hyponatrémie: مراقبة العلامات الحيوية.", ta: "بنوطاتك: دور الممرّض بالـ hyponatrémie: مراقبة العلامات الحيوية." },
      doc: "«عطيه sérum IV ببطء، راقب الوعي والـ constantes، واعمل bilan entrées/sorties وراقب البول.»",
      lost: "الميّ فاتت عالخلايا ← œdème cérébral (وذمة دماغية): الوعي خفّ كتير وصار في convulsions (اختلاجات).",
      alarm: "🚨 الوعي عم يخفّ! (خطر œdème cérébral)",
      acts: [
        { id: "cons", k: "exam", g: "pt", ic: "🧠", n: "قيّم مستوى الوعي", s: "الوعي", m: 1, key: 1, pri: 1, r: ["واعي أكتر وعم يجاوب منيح", "Confusion (تشوّش) + somnolence (نعسان كتير) + صداع", "الوعي عم يخفّ كتير ← خطر convulsions (اختلاجات)"], x: "بنوطاتك: دور الممرّض: مراقبة مستوى الوعي (خطر وذمة دماغية لأنو الميّ عم تفوت عالخلايا)." },
        { id: "labna", k: "lab", g: "lab", ic: "🧪", n: "اطلب Na+ (الصوديوم)", s: "Na+", m: 2, dl: 8, r: ["Na+ عم يطلع وقرّب من 135 ✅", "Na+ = 125 mEq/L (تحت 135)", "Na+ عم ينزل أكتر"], x: "بنوطاتك: hyponatrémie = Na+ أقل من 135 mEq/L (أكتر من 145 = hypernatrémie)." },
        { id: "slow", k: "tx", g: "iv", ic: "💧", n: "Sérum IV ببطء", m: 3, ord: 1, key: 1, pri: 1, d: -34, dur: 33, dr: 0.3, x: "بنوطاتك: إعطاء السوايل الوريدية ببطء." },
        { id: "io", k: "tx", g: "pt", ic: "🚽", n: "Bilan entrées/sorties + مراقبة البول", m: 3, key: 1, pri: 2, d: -6, dur: 9, dr: 0.8, x: "بنوطاتك: دور الممرّض: مراقبة السوايل الداخلة والطالعة (in/out) ومراقبة البول." },
        { id: "b_fast", k: "bad", g: "iv", ic: "💧", n: "Sérum IV بسرعة، دفعة وحدة", m: 2, ord: 1, d: 22, right: "Sérum IV ببطء", x: "بنوطاتك: السوايل الوريدية بالـ hyponatrémie بتنعطى ببطء." },
        { id: "b_sleep", k: "bad", g: "pt", ic: "😴", n: "خلّيه ينام وما تزعجو", m: 4, d: 12, right: "قيّم مستوى الوعي", x: "النعاس هو العلامة يلّي جابوه عليها: لازم تراقب الوعي (خطر وذمة دماغية)." },
        { id: "b_diur", k: "bad", g: "cart", ic: "💊", n: "زيد الـ diurétiques", m: 1, ord: 1, d: 16, right: "Sérum IV ببطء", x: "بنوطاتك: كترة المدرّات من أسباب hyponatrémie." },
        { id: "b_kay", k: "bad", g: "cart", ic: "💊", n: "Kayexalate", m: 2, ord: 1, d: 8, right: "Sérum IV ببطء", x: "Kayexalate بيشيل الـ K (علاج hyperkaliémie)، ما إلو علاقة بالصوديوم." }
      ],
      ideal: ["cons", "m_ta", "m_fc", "labna", "call", "slow", "io", "cons", "labna"]
    },
    hypoca: {
      sev0: 50, d0: 0.9, by: 15,
      vit: { fc: 90, sys: 120, dia: 75, spo: 98, t: 37 },
      ecg: ["الـ QT عم يقصر ✅", "QT allongé (QT طويل)", "QT allongé (QT طويل)"],
      doc: "«عطيها calcium IV (أو بالتم)، و vitamine D، ومنعالج السبب.»",
      lost: "صار laryngospasme (تشنّج بالحنجرة) وصعوبة بالتنفس — من علامات hypocalcémie بنوطاتك.",
      alarm: "🚨 صعوبة بالتنفس! (خطر laryngospasme)",
      acts: [
        { id: "chv", k: "exam", g: "pt", ic: "👆", n: "دقّ عالخد (Chvostek)", s: "Chvostek", m: 1, r: ["ما عاد في رجفة بالوجّ ✅", "Chvostek positif: رجفة بعضلات الوجّ", "Chvostek positif: رجفة قوية بعضلات الوجّ"], x: "بنوطاتك: Chvostek = رجفة بعضلات الوجّ؛ من علامات hypocalcémie." },
        { id: "trs", k: "exam", g: "pt", ic: "✋", n: "نفّخ جهاز الضغط عالإيد (Trousseau)", s: "Trousseau", m: 2, r: ["ما عاد في تشنّج باليد ✅", "Trousseau positif: تشنّج باليد", "Trousseau positif: تشنّج قوي باليد"], x: "بنوطاتك: Trousseau = تشنّج اليد لمّا ننفخ جهاز الضغط عالإيد." },
        { id: "resp", k: "exam", g: "pt", ic: "🫁", n: "راقب التنفّس والحنجرة", s: "التنفّس", m: 1, r: ["تنفّس مرتاح", "التنفّس منيح هلّق — كمّل راقب الحنجرة", "صعوبة بالتنفس ← خطر laryngospasme"], x: "بنوطاتك: hypocalcémie ممكن تعمل laryngospasme (تشنّج الحنجرة) وصعوبة تنفس." },
        { id: "ecg", k: "ecg", g: "mon", ic: "📈", n: "اعمل ECG", s: "ECG", m: 3, x: "بنوطاتك: hypocalcémie = QT allongé على الـ ECG." },
        { id: "labca", k: "lab", g: "lab", ic: "🧪", n: "اطلب Ca (الكالسيوم)", s: "Ca", m: 2, dl: 8, r: ["Ca طلع فوق 8 mg/dL ✅", "Ca = 7.2 mg/dL (تحت 8)", "Ca عم ينزل أكتر"], x: "بنوطاتك: hypocalcémie = Ca أقل من 8 mg/dL (أكتر من 11 = hypercalcémie)." },
        { id: "caiv", k: "tx", g: "iv", ic: "💧", n: "Calcium IV (أو oral)", m: 3, ord: 1, key: 1, pri: 1, d: -30, dur: 18, dr: 0.3, x: "بنوطاتك: علاج hypocalcémie = calcium بالتم أو بالوريد." },
        { id: "vitd", k: "tx", g: "cart", ic: "💊", n: "Vitamine D", m: 1, ord: 1, key: 1, pri: 2, d: -6, dur: 22, dr: 0.6, x: "بنوطاتك: vitamine D من علاج hypocalcémie." },
        { id: "cause", k: "tx", g: "phone", ic: "🔍", n: "علاج السبب (مع الدكتور)", m: 2, ord: 1, key: 1, pri: 2, d: -6, dur: 15, dr: 0.6, x: "بنوطاتك: علاج hypocalcémie = calcium + vitamine D + علاج السبب." },
        { id: "b_ctn", k: "bad", g: "cart", ic: "💊", n: "Calcitonine", m: 2, ord: 1, d: 20, right: "Calcium IV (أو oral)", x: "بنوطاتك: الـ calcitonine بتنزّل الكالسيوم بسرعة — علاج hypercalcémie، هون بتسوّء الحالة." },
        { id: "b_diur", k: "bad", g: "iv", ic: "💧", n: "Diurétiques + sérum IV", m: 2, ord: 1, d: 14, right: "Calcium IV (أو oral)", x: "المدرّات والسوايل علاج hypercalcémie بنوطاتك، مش hypocalcémie." },
        { id: "b_kay", k: "bad", g: "cart", ic: "💊", n: "Kayexalate", m: 2, ord: 1, d: 8, right: "Calcium IV (أو oral)", x: "Kayexalate بيشيل الـ K (علاج hyperkaliémie)، ما بيعالج نقص الكالسيوم." }
      ],
      ideal: ["chv", "trs", "resp", "labca", "call", "caiv", "vitd", "cause", "resp", "chv"]
    },
    hypermg: {
      sev0: 55, d0: 0.9, by: 12,
      vit: { fc: [70, 48, 36], sys: [110, 90, 70], dia: [70, 55, 42], spo: [97, 93, 85], t: 36.8 },
      mx: { fc: "بنوطاتك: hypermagnésémie = bradycardie (قلب بطيء).", ta: "بنوطاتك: hypermagnésémie = ضغط واطي.", spo: "بالحالات الشديدة بتضعف عضلات التنفس — راقب التنفس." },
      ecg: ["النبض عم يرجع أسرع، الـ QRS أحسن", "Bradycardie + PR allongé + QRS élargi", "Bradycardie أشد + PR allongé + QRS élargi"],
      doc: "«وقّف أي دوا فيه مغنيزيوم، حضّر Calcium gluconate IV، راقب التنفس والوعي، وإذا لزم منحضّر dialyse.»",
      lost: "بنوطاتك: بالحالات الشديدة hypermagnésémie بتعمل فشل بعضلات التنفس.",
      alarm: "🚨 التنفّس عم يضعف! (خطر فشل عضلات التنفس)",
      acts: [
        { id: "resp", k: "exam", g: "pt", ic: "🫁", n: "راقب التنفّس", s: "التنفّس", m: 1, key: 1, pri: 1, r: ["التنفّس أقوى ومنتظم", "تنفّس ضعيف", "تنفّس ضعيف كتير ← خطر فشل عضلات التنفس"], x: "بنوطاتك: دور الممرّض بالـ hypermagnésémie: مراقبة التنفس أوّل شي (خطر فشل عضلات التنفس)." },
        { id: "cons", k: "exam", g: "pt", ic: "🧠", n: "قيّم الوعي", s: "الوعي", m: 1, r: ["صاحي أكتر", "Somnolence (نعسان طول الوقت)", "نعسان كتير وبالكاد عم يردّ"], x: "بنوطاتك: hypermagnésémie = نعاس مستمر؛ دور الممرّض مراقبة الوعي." },
        { id: "ecg", k: "ecg", g: "mon", ic: "📈", n: "اعمل ECG", s: "ECG", m: 3, x: "بنوطاتك: ECG الـ hypermagnésémie: bradycardie، PR allongé، QRS élargi." },
        { id: "labmg", k: "lab", g: "lab", ic: "🧪", n: "اطلب Mg (المغنيزيوم)", s: "Mg", m: 2, dl: 8, r: ["Mg عم ينزل وقرّب من 2.1 ✅", "Mg = 3 mEq/L (فوق 2.1)", "Mg عم يطلع أكتر"], x: "بنوطاتك: hypermagnésémie = Mg أكتر من 2.1 mEq/L." },
        { id: "stop", k: "tx", g: "cart", ic: "🛑", n: "وقّف الـ antiacides يلّي فيهن مغنيزيوم", m: 1, key: 1, pri: 1, d: -6, dur: 15, dr: 0.4, x: "الـ antiacides يلّي فيهن Mg من أسباب hypermagnésémie: منوقّف أي دوا فيه مغنيزيوم." },
        { id: "cagl", k: "tx", g: "iv", ic: "💧", n: "Calcium gluconate IV (الترياق)", m: 3, ord: 1, key: 1, pri: 1, d: -32, dur: 15, dr: 0.4, x: "بنوطاتك: ترياق (antidote) hypermagnésémie = Calcium gluconate بالوريد." },
        { id: "dial", k: "tx", g: "phone", ic: "🏥", n: "تحضير dialyse (غسيل كلى) إذا لزم", m: 3, ord: 1, d: -12, dur: 20, x: "بنوطاتك: التحضير لغسيل الكلى إذا لزم (عندو فشل كلوي)." },
        { id: "b_mg", k: "bad", g: "iv", ic: "💧", n: "Magnésium IV", m: 2, ord: 1, d: 25, right: "Calcium gluconate IV", x: "عندو Mg عالي أصلاً؛ الترياق بنوطاتك Calcium gluconate IV." },
        { id: "b_ant", k: "bad", g: "cart", ic: "💊", n: "كمّل الـ antiacides (عندو حموضة)", m: 1, d: 15, right: "وقّف الـ antiacides يلّي فيهن مغنيزيوم", x: "الـ antiacides يلّي فيهن Mg من أسباب hypermagnésémie: لازم ينوقّفو." },
        { id: "b_kcl", k: "bad", g: "iv", ic: "💧", n: "KCl IV (بوتاسيوم بالوريد)", m: 2, ord: 1, d: 12, right: "Calcium gluconate IV", x: "البوتاسيوم علاج hypokaliémie؛ مش علاج hypermagnésémie، وعندو فشل كلوي." },
        { id: "b_ins", k: "bad", g: "cart", ic: "💉", n: "Insuline + glucose", m: 2, ord: 1, d: 8, right: "Calcium gluconate IV", x: "الأنسولين مع الغلوكوز علاج hyperkaliémie (بيدخّلو الـ K عالخلايا)." }
      ],
      ideal: ["resp", "m_fc", "m_ta", "stop", "call", "cagl", "cons", "labmg", "dial", "resp", "m_fc"]
    },
    gds: {
      sev0: 50, d0: 0.85, by: 15,
      vit: { fc: [88, 100, 118], sys: 120, dia: 75, spo: 97, t: 37 },
      mx: { fc: "النبض سريع شوي؛ قيس وقارن بعد العلاج." },
      doc: "«إذا الغازات بيّنت acidose métabolique: bicarbonate de sodium + علاج السبب، وبالفشل الكلوي منحضّر dialyse.»",
      lost: "الـ acidose métabolique ما انعالجت بالوقت والـ pH ضلّ ينزل.",
      alarm: "🚨 الـ pH عم ينزل أكتر!",
      acts: [
        { id: "fr", k: "exam", g: "pt", ic: "🫁", n: "راقب التنفّس (FR)", s: "التنفّس", m: 1, r: ["التنفّس عم يرجع أهدى", "تنفّس سريع (الجسم عم يعوّض)", "تنفّس سريع كتير وتعب شديد"], x: "بنوطاتك: بالـ acidose métabolique التنفّس السريع هو تعويض: الرئة بتطلّع CO2 لترفع الـ pH." },
        { id: "gas", k: "lab", g: "lab", ic: "🫁", n: "اطلب غازات الدم (gaz du sang)", s: "الغازات", m: 2, dl: 10, key: 1, pri: 1, r: ["pH 7.37 · HCO3- ↓ · PaCO2 30 ↓", "pH 7.25 · PaCO2 40 mmHg · HCO3- ↓ (منخفض)", "pH تحت 7.25 · PaCO2 40 · HCO3- ↓ أكتر"], x: "الطبيعي بنوطاتك: pH 7.35–7.45 · PaCO2 35–45 mmHg." },
        { id: "read", k: "quiz", g: "lab", ic: "📖", n: "اقرا الغازات", s: "اقرا الغازات", m: 2, need: "gas", nm: "🧪 اطلب غازات الدم واستنّى النتيجة أوّل.", key: 1, pri: 1, q: [0, 1, 2], q2: [3], x: "بجدولك: acidose métabolique non compensée = pH ↓ HCO3- ↓ PaCO2 طبيعي؛ compensée = pH طبيعي HCO3- ↓ PaCO2 ↓." },
        { id: "bica", k: "tx", g: "iv", ic: "💧", n: "Bicarbonate de sodium", m: 3, ord: 1, need: "read", nm: "📖 اقرا الغازات أوّل وحدّد شو النوع.", key: 1, pri: 1, d: -26, dur: 21, dr: 0.4, x: "بنوطاتك: علاج acidose métabolique: إعطاء bicarbonate de sodium." },
        { id: "cause", k: "tx", g: "phone", ic: "🏥", n: "علاج السبب + تحضير dialyse (فشل كلوي)", m: 3, ord: 1, key: 1, pri: 2, d: -14, dur: 30, dr: 0.3, x: "بنوطاتك: علاج السبب، وغسيل الكلى إذا في فشل كلوي." },
        { id: "b_slow", k: "bad", g: "pt", ic: "😮‍💨", n: "خلّيه يتنفّس أبطأ وهدّيه", m: 2, d: 16, right: "Bicarbonate de sodium + علاج السبب", x: "التحكّم بالتنفّس والتهدئة علاج alcalose respiratoire بنوطاتك؛ هون التنفّس السريع تعويض للـ acidose métabolique." },
        { id: "b_ca", k: "bad", g: "iv", ic: "💧", n: "Calcium gluconate IV", m: 2, ord: 1, d: 10, right: "Bicarbonate de sodium", x: "Calcium gluconate IV ترياق hypermagnésémie بنوطاتك، مش علاج acidose." }
      ],
      ideal: ["fr", "m_fc", "gas", "call", "read", "bica", "cause", "gas", "read"]
    }
  };
  // common actions every case has (added to each case by actions())
  var COMMON = [
    { id: "scope", k: "scope", g: "mon", ic: "📟", n: "ركّب الـ monitor (scope)", s: "Monitor", m: 1, x: "بعد ما تركّبو بتشوف النبض والـ ECG عطول عالشاشة." },
    { id: "talk", k: "talk", g: "pt", ic: "💬", n: "احكي مع المريض", s: "احكي", m: 2, x: "بتعرف قصّتو وأعراضو منّو." },
    { id: "call", k: "call", g: "phone", ic: "📞", n: "اتصل بالدكتور", s: "الدكتور", m: 2, key: 1, pri: 1, x: "خبّر الدكتور بالـ constantes ونتايج الفحص، وهو بيوصف العلاج." },
    { id: "wait", k: "wait", g: "mon", ic: "⏳", n: "استنّى 5 دقايق وارجع شوفو", s: "استنّى 5د", m: 5, x: "العلاج الصح بيحسّن المريض شوي شوي: ارجع قيس بعد شوي لتشوف الفرق." },
    { id: "diag", k: "quiz", g: "pt", ic: "🧠", n: "شو التشخيص؟", s: "التشخيص", m: 1, q: [0], x: "شوف علامات المريض والفحوص وقارنها بنوطاتك." }
  ];
  function story(id) { return CASES[id] || null; }
  function actions(id) {
    var S = CASES[id]; if (!S) return [];
    var out = MEAS.map(function (a) { var b = {}; for (var k in a) b[k] = a[k]; b.k = "meas"; b.g = a.v === "t" ? "pt" : a.v === "spo" ? "mon" : "pt"; b.x = (S.mx && S.mx[a.v]) || MX; return b; });
    COMMON.forEach(function (a) { if (id === "gds" && a.id === "diag") return; out.push(a); });
    return out.concat(S.acts);
  }
  function act(id, aid) { var L = actions(id); for (var i = 0; i < L.length; i++) if (L[i].id === aid) return L[i]; return null; }
  function keys(id) { return actions(id).filter(function (a) { return a.key; }).map(function (a) { return a.id; }); }
  function band(sev) { return sev < K.green ? 0 : sev < K.red ? 1 : 2; }
  function pick(sev, r) { return typeof r === "string" ? r : r[band(sev)]; }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function vit(st, k) {
    var S = CASES[st.cid], v = S.vit, s = st.sev, f = function (x) { if (typeof x === "number") return x; return s <= S.sev0 ? lerp(x[0], x[1], s / S.sev0) : lerp(x[1], x[2], (s - S.sev0) / (100 - S.sev0)); };
    if (k === "ta") return Math.round(f(v.sys)) + "/" + Math.round(f(v.dia));
    if (k === "t") return f(v.t).toFixed(1);
    return Math.round(f(v[k]));
  }
  function moves(id, k) { var v = CASES[id].vit; return k === "ta" ? typeof v.sys !== "number" : typeof v[k] !== "number"; }
  function create(cid, lv) {
    var S = CASES[cid]; if (!S) return null;
    return { v: 3, cid: cid, lv: lv || 1, t: 0, sev: S.sev0, fx: [], done: {}, res: {}, pend: [], log: [], pts: 0, miss: [], end: "", called: false, scope: false, seen: {}, order: [], red: false, quizOk: 0, quizN: 0 };
  }
  function drift(st) {
    var S = CASES[st.cid], ks = keys(st.cid), m = K.drift[st.lv] || 1, all = true;
    ks.forEach(function (k) { var a = act(st.cid, k); if (st.done[k]) { if (a.dr) m *= a.dr; } else all = false; });
    return all ? -K.rec : S.d0 * m;   // every key done → he keeps getting better on his own
  }
  function logp(st, e) { e.t = Math.round(st.t); st.log.push(e); return e; }
  function tick(st, dm) {
    var out = [];
    if (st.end) return out;
    var S = CASES[st.cid];
    while (dm > 1e-9 && !st.end) {
      var h = Math.min(K.dt, dm), t0 = st.t, t1 = t0 + h, ds = drift(st) * h;
      st.fx.forEach(function (f) { var a = Math.max(t0, f.t0), b = Math.min(t1, f.t0 + f.dur); if (b > a) ds += f.d * (b - a) / f.dur; });
      st.sev = Math.max(0, Math.min(100, st.sev + ds)); st.t = t1; dm -= h;
      st.fx = st.fx.filter(function (f) { return f.t0 + f.dur > st.t; });
      for (var i = 0; i < st.pend.length; i++) {
        var p = st.pend[i]; if (p.due > st.t) continue;
        var a = act(st.cid, p.id); st.res[p.id] = (st.res[p.id] | 0) + 1; st.pend.splice(i--, 1);
        if (keys(st.cid).every(function (k) { return st.done[k]; })) st.verified = true;
        out.push(logp(st, { a: p.id, ic: "🧪", txt: a.n.replace(/^اطلب /, "") + ": " + pick(st.sev, a.r), x: a.x, kind: "res", b: band(st.sev) }));
      }
      if (band(st.sev) === 2 && !st.red) { st.red = true; out.push(logp(st, { a: "alarm", ic: "🚨", txt: S.alarm, kind: "alarm" })); }
      if (band(st.sev) < 2) st.red = false;
      check(st, out);
    }
    return out;
  }
  function check(st, out) {
    if (st.end) return;
    if (st.sev >= 100) { st.end = "lost"; out.push(logp(st, { a: "end", ic: "🔴", txt: "المريض تدهور: " + CASES[st.cid].lost, kind: "lost" })); return; }
    var ks = keys(st.cid), all = ks.every(function (k) { return st.done[k]; });
    if (all && st.sev <= K.stab && !st.verified) { if (!st.okHint) { st.okHint = 1; out.push(logp(st, { a: "better", ic: "📈", txt: "المريض عم يتحسّن 🟢 — قيس العلامات الحيوية مرّة تانية لتتأكّد، وبعدها بتسلّم الحالة.", kind: "info" })); } return; }
    if (all && st.sev <= K.stab) { st.end = "ok"; st.pts += 20; out.push(logp(st, { a: "end", ic: "🎉", txt: "المريض استقرّ! العلامات الحيوية تحسّنت وانتقل عالقسم.", kind: "ok" })); }
  }
  // do one action. → { blocked } (nothing happened, no time) or { a, entries, good: true|false|null, quiz }
  function doAct(st, aid) {
    var a = act(st.cid, aid); if (!a || st.end) return { blocked: "" };
    if (a.ord && !st.called) return { blocked: "📞 هيدا بدّو وصفة: اتصل بالدكتور أوّل." };
    if (a.need && !(st.res[a.need] || (st.done[a.need] && act(st.cid, a.need).k !== "lab"))) return { blocked: a.nm || "لازم تعمل شي قبلها." };
    if ((a.k === "tx" || a.k === "bad") && st.done[aid]) return { blocked: "✅ عملتها من قبل (" + a.n + ")" };
    var qk = aid;
    if (a.k === "quiz") { st.qd = st.qd || {}; if (aid === "read" && st.qd.read && a.q2) { if (!(st.res.gas > 1)) return { blocked: "🧪 اطلب غازات الدم مرّة تانية بعد العلاج لتقرا التغيير." }; qk = "read2"; } if (st.qd[qk]) return { blocked: "✅ جاوبت هالسؤال من قبل" }; }
    if (a.k === "lab" && st.pend.some(function (p) { return p.id === aid; })) return { blocked: "⏳ النتيجة بعدها ما طلعت" };
    var out = tick(st, a.m); if (st.end) return { a: a, entries: out, good: null };
    var first = !st.done[aid], e = { a: aid, ic: a.ic, kind: a.k }, good = null;
    st.done[aid] = (st.done[aid] | 0) + 1; st.order.push({ id: aid, t: Math.round(st.t) });
    if (a.k === "meas") { var val = vit(st, a.v); st.seen[a.v] = { val: val, t: st.t }; e.txt = a.n.replace(/^قيس /, "") + ": " + val + ({ fc: "/min", spo: "%", t: "°C", ta: "" })[a.v]; e.x = a.x; if (first) st.pts += 2; good = true; }
    else if (a.k === "exam") { e.txt = a.n + ": " + pick(st.sev, a.r); e.x = a.x; e.b = band(st.sev); if (first) st.pts += 2; good = true; if (a.key && first) bonus(st, a, e); }
    else if (a.k === "ecg") { e.txt = "ECG: " + pick(st.sev, CASES[st.cid].ecg); e.x = a.x; e.b = band(st.sev); st.ecgTxt = e.txt; if (first) st.pts += 2; good = true; }
    else if (a.k === "lab") { st.pend.push({ id: aid, due: st.t + a.dl }); e.txt = a.n.replace(/^اطلب /, "طلبت ") + " — النتيجة بعد " + a.dl + " د"; if (first) st.pts += 2; if (a.key && first) bonus(st, a, e); good = true; }
    else if (a.k === "scope") { st.scope = true; e.txt = "ركّبت الـ monitor: النبض والـ ECG عطول عالشاشة"; e.x = a.x; if (first) st.pts += 2; good = true; }
    else if (a.k === "wait") { e.txt = "استنّيت 5 دقايق"; e.x = a.x; good = null; }
    else if (a.k === "talk") { e.txt = "حكيت مع المريض"; e.x = a.x; if (first) st.pts += 1; good = true; }
    else if (a.k === "call") {
      var looked = MEAS.some(function (m) { return st.done[m.id]; }) || Object.keys(st.res).length || st.done.ecg || st.done.cons || st.done.resp || st.done.fr;
      if (!looked) { e.txt = "الدكتور: «شو الـ constantes؟ قيس وفحوص المريض وخبّرني.»"; e.x = "قبل ما تتصل: قيس العلامات الحيوية وافحص المريض لتخبّر الدكتور شو في."; st.done[aid] = 0; st.order.pop(); good = false; }
      else { st.called = true; e.txt = "الدكتور: " + (st.lv === 1 ? CASES[st.cid].doc : "«تمام، عندك الإذن: عالج حسب البروتوكول وخبّرني.»"); e.x = a.x; if (first) bonus(st, a, e); good = true; }
    }
    else if (a.k === "quiz") { e.txt = a.n; good = null; st.done[aid]--; st.order.pop(); /* counts as done once answered, in quiz() */ return { a: a, entries: out.concat([logp(st, e)]), good: null, quiz: qk === "read2" ? a.q2 : a.q, qk: qk }; }
    else if (a.k === "tx") { st.fx.push({ t0: st.t, dur: a.dur, d: a.d }); e.txt = "✅ " + a.n; e.x = a.x; good = true; if (a.key) bonus(st, a, e); else st.pts += 4; }
    else if (a.k === "bad") { st.fx.push({ t0: st.t, dur: 3, d: a.d }); st.pts = Math.max(0, st.pts - 8); e.txt = "❌ " + a.n; e.y = a.n; e.r = a.right; e.x = a.x; good = false; st.miss.push(aid); }
    else { e.txt = a.n; e.x = a.x; }
    if (/^(meas|exam|ecg)$/.test(a.k) && keys(st.cid).every(function (k) { return st.done[k]; })) st.verified = true;
    out.push(logp(st, e)); check(st, out);
    return { a: a, entries: out, good: good };
  }
  function bonus(st, a, e) { st.pts += 10; if (a.pri === 1 && st.t <= (CASES[st.cid].by || 15)) { st.pts += 5; e.fast = 1; } }
  // a quiz action answered (each step: right → +5, wrong → mistake). Quiz keys count once all its steps were answered.
  function quiz(st, aid, okN, n, qk) {
    var a = act(st.cid, aid); st.qd = st.qd || {}; st.qd[qk || aid] = 1; st.done[aid] = (st.done[aid] | 0) + 1; st.order.push({ id: aid, t: Math.round(st.t) }); st.quizOk += okN; st.quizN += n; st.pts += okN * 5;
    if (a.key && !st.qdone) { st.qdone = 1; bonus(st, a, {}); }
    var out = []; check(st, out); return out;
  }
  function handover(st) { if (!st.end) { st.end = "hand"; logp(st, { a: "end", ic: "🤝", txt: "سلّمت الحالة", kind: "hand" }); } }
  function maxPts(id) {
    var L = actions(id), m = 20;
    L.forEach(function (a) { if (a.key) m += 15; else if (a.k === "tx") m += 4; else if (a.k === "meas" || a.k === "exam" || a.k === "ecg" || a.k === "lab" || a.k === "scope") m += 2; if (a.k === "quiz") m += 5 * (a.q.length + (a.q2 ? a.q2.length : 0)); });
    return m;
  }
  function stars(st) { var r = st.pts / maxPts(st.cid); if (st.end === "lost") r *= 0.5; return Math.max(0, Math.min(10, Math.round(r * 10 + (st.end === "ok" ? 1 : 0)))); }
  function status(st) { var b = band(st.sev); return { b: b, ic: ["🟢", "🟡", "🔴"][b], n: ["مستقر، عم يتحسّن", "مش مستقر", "عم يتدهور"][b], c: ["ok", "mid", "bad"][b], hp: Math.round(100 - st.sev) }; }
  function hint(st) { var S = CASES[st.cid]; if (st.okHint && !st.end) return act(st.cid, "m_fc"); for (var i = 0; i < S.ideal.length; i++) { var id = S.ideal[i]; if (!st.done[id] && (id !== "read" || st.res.gas)) return act(st.cid, id); } var ks = keys(st.cid).filter(function (k) { return !st.done[k]; }); return ks.length ? act(st.cid, ks[0]) : null; }
  w.ERSTORY = { K: K, cases: CASES, MEAS: MEAS, COMMON: COMMON, story: story, actions: actions, act: act, keys: keys, band: band, vit: vit, moves: moves,
    create: create, tick: tick, doAct: doAct, quiz: quiz, handover: handover, stars: stars, status: status, hint: hint, maxPts: maxPts, drift: drift };
})(typeof window !== "undefined" ? window : this);
if (typeof window !== "undefined" && window.Lang) { Lang.fix("ERSTORY"); }   // 🇫🇷 Français seulement (assets/lang.js)
