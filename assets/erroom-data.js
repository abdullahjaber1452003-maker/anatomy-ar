/* 🏥 غرفة الطوارئ — امشِ لعند المريض (Abdullah, Nov 1 2026 9:58–9:59 PM: «نخلي الممرض يقدر يمشي لعند المريض» → «اوك بلش»).
   Data for assets/erroom.js: the room (furniture = stations, where the nurse picks things up), the items, the actions and the cases.
   CONTENT RULE: every case comes from his own lessons on the site and names its source (src):
     réa r1/r2 (gaz du sang), r4 (chocs: hypovolémique, obstructif, neurogène), cardio lesson 9 (choc cardiogénique),
     neuro (Glasgow, HTIC), pharma cards (Épinéphrine: «Choc anaphylactique, traitement d'urgence» + «Arrêt cardiovasculaire»;
     Rocéphine allergy test; Decadron anti-allergique). What is NOT in his notes is labelled gen (🌐 معلومات عامة): choc septique,
     arrêt cardiaque, PLS / Guedel lines.
   To add a case: push an object to cases (id, ic, t, src, gen, who, sx, vit, limit, drift, steps in the ideal order, bad, end).
     step = { a: action id (or [ids] = any of them), key: 1 = scored task (else optional +3), after: [ids that must come first],
              ow: why the order matters, eff: vital-sign changes (relative), set: absolute values, why: one line, q: optional question }
     bad  = { a, unless: optional action id that makes it harmless, eff, why }
   Every string is { ar, fr }; the Arabic one keeps the French term with its Arabic meaning beside it. */
window.ERROOM = {
 W: 360, H: 600, R: 9, door: { x: 180, y: 560 },
 stations: {
  bed1:  { ic: "🛏️", ar: "التخت 1", fr: "Lit 1", x: 34, y: 64, w: 84, h: 150, spot: { x: 136, y: 150 }, bed: 1 },
  bed2:  { ic: "🛏️", ar: "التخت 2", fr: "Lit 2", x: 242, y: 64, w: 84, h: 150, spot: { x: 224, y: 150 }, bed: 2 },
  mon:   { ic: "🖥️", ar: "المونيتور", fr: "Moniteur", x: 128, y: 34, w: 38, h: 32, spot: { x: 147, y: 90 } },
  o2:    { ic: "🟢", ar: "الأكسجين O₂", fr: "Oxygène O₂", x: 182, y: 12, w: 34, h: 24, spot: { x: 199, y: 54 } },
  sink:  { ic: "🚰", ar: "المغسلة", fr: "Lavabo", x: 320, y: 262, w: 28, h: 50, spot: { x: 298, y: 287 } },
  cart:  { ic: "🛒", ar: "عربة الطوارئ", fr: "Chariot d'urgence", x: 148, y: 296, w: 66, h: 42, spot: { x: 181, y: 360 } },
  defib: { ic: "⚡", ar: "Défibrillateur", fr: "Défibrillateur", x: 12, y: 270, w: 32, h: 44, spot: { x: 62, y: 292 } },
  drugs: { ic: "💊", ar: "خزانة الأدوية", fr: "Armoire à pharmacie", x: 12, y: 412, w: 32, h: 96, spot: { x: 62, y: 460 } },
  phone: { ic: "📞", ar: "التلفون", fr: "Téléphone", x: 250, y: 528, w: 98, h: 34, spot: { x: 298, y: 506 } }
 },
 items: {
  o2mask: { st: "o2", ic: "😷", ar: "قناع أكسجين (Masque à O₂)", fr: "Masque à oxygène" },
  bavu:   { st: "o2", ic: "🫁", ar: "Ambu / BAVU (بالون تنفّس)", fr: "BAVU (Ambu)" },
  cables: { st: "mon", ic: "📟", ar: "كابلات المونيتور (électrodes + brassard + oxymètre)", fr: "Électrodes + brassard + oxymètre" },
  kit:    { st: "cart", ic: "💉", ar: "كيت VVP + soluté (كاتيتر + مصل)", fr: "Kit VVP + soluté" },
  gds:    { st: "cart", ic: "🧪", ar: "سيرنغ GDS مهبّرنة (Seringue héparinée)", fr: "Seringue héparinée (GDS)" },
  tubes:  { st: "cart", ic: "🧫", ar: "أنابيب تحاليل + Hémocultures (زرع دم)", fr: "Tubes + hémocultures" },
  guedel: { st: "cart", ic: "🌬️", ar: "Canule de Guedel + aspiration (أنبوب هوا + شفط)", fr: "Canule de Guedel + aspiration" },
  sonde:  { st: "cart", ic: "🚽", ar: "Sonde urinaire (بيب بول)", fr: "Sonde urinaire" },
  collar: { st: "cart", ic: "🦴", ar: "Minerve + plan dur (طوق رقبة + لوح)", fr: "Minerve + plan dur" },
  defib:  { st: "defib", ic: "⚡", ar: "Défibrillateur (جهاز الصدمة)", fr: "Défibrillateur", keep: 1 },
  adre:   { st: "drugs", ic: "💉", ar: "Adrénaline (Épinéphrine)", fr: "Adrénaline (épinéphrine)", rx: 1 },
  nora:   { st: "drugs", ic: "💉", ar: "Noradrénaline (نورأدرينالين)", fr: "Noradrénaline", rx: 1 },
  atro:   { st: "drugs", ic: "💉", ar: "Atropine (أتروبين)", fr: "Atropine", rx: 1 },
  dobu:   { st: "drugs", ic: "💉", ar: "Dobutamine (مقوّي للقلب — inotrope)", fr: "Dobutamine (inotrope)", rx: 1 },
  deca:   { st: "drugs", ic: "💊", ar: "Decadron (Dexaméthasone — كورتيزون ضد الحساسية)", fr: "Décadron (dexaméthasone)", rx: 1 },
  atb:    { st: "drugs", ic: "💊", ar: "Antibiotique (مضاد حيوي)", fr: "Antibiotique", rx: 1 },
  sang:   { st: "drugs", ic: "🩸", ar: "Poche de sang (كيس دم — نقل دم)", fr: "Poche de sang (transfusion)", rx: 1 }
 },
 actions: {
  wash:      { at: "sink",  ic: "🧼", ar: "اغسل إيديك (Lavage des mains)", fr: "Se laver les mains" },
  call:      { at: "phone", ic: "📞", ar: "اتصل بالطبيب (Appeler le médecin)", fr: "Appeler le médecin" },
  eval:      { at: "bed", g: "ev", ic: "🔎", ar: "قيّم الوعي (Glasgow) والتنفّس", fr: "Évaluer la conscience (Glasgow) et la respiration" },
  airway:    { at: "bed", g: "ev", ic: "🫁", ar: "حرّر مجرى الهوا (Libération des voies aériennes)", fr: "Libérer les voies aériennes" },
  pos_semi:  { at: "bed", g: "pos", ic: "🪑", ar: "نص جلوس — Demi-assis (semi-Fowler)", fr: "Position demi-assise (semi-Fowler)" },
  pos_trend: { at: "bed", g: "pos", ic: "🦵", ar: "رفع الإجرين — Trendelenburg", fr: "Jambes surélevées (Trendelenburg)" },
  pos_pls:   { at: "bed", g: "pos", ic: "↪️", ar: "وضعية جانبية آمنة — PLS", fr: "PLS (position latérale de sécurité)" },
  pos_tete30:{ at: "bed", g: "pos", ic: "⬆️", ar: "راس مرفوع ٣٠° (Tête surélevée 30°)", fr: "Tête surélevée à 30°" },
  stop:      { at: "bed", g: "tx", ic: "🩹", ar: "وقّف النزيف — ضغط عالجرح (Compression)", fr: "Arrêter le saignement (compression)" },
  stopdrug:  { at: "bed", g: "tx", ic: "⛔", ar: "وقّف الدوا المسبّب (Arrêter la perfusion)", fr: "Arrêter le médicament en cause" },
  cpr:       { at: "bed", g: "tx", ic: "🫀", ar: "تدليك القلب — Massage cardiaque 30:2", fr: "Massage cardiaque 30:2" },
  remp:      { at: "bed", g: "tx", ic: "💧", ar: "Remplissage — سوائل بالوريد بسرعة", fr: "Remplissage vasculaire rapide", needDone: "vvp" },
  drink:     { at: "bed", g: "tx", ic: "🥤", ar: "عطيه مي يشرب", fr: "Le faire boire" },
  o2:        { at: "bed", need: "o2mask", ic: "😷", ar: "حطّ الأكسجين (O₂)", fr: "Mettre l'oxygène (O₂)" },
  vent:      { at: "bed", need: "bavu", ic: "🫁", ar: "نفّس بالـ Ambu (Insufflations)", fr: "Insufflations au BAVU" },
  mon:       { at: "bed", need: "cables", ic: "📟", ar: "ركّب المونيتور (Monitorage)", fr: "Monitorage" },
  vvp:       { at: "bed", need: "kit", ic: "💉", ar: "حطّ VVP (خط وريدي) + soluté", fr: "Poser une VVP + soluté" },
  gds:       { at: "bed", need: "gds", ic: "🧪", ar: "اسحب غازات الدم — GDS (من الشريان)", fr: "Prélever les gaz du sang (artériel)" },
  bio:       { at: "bed", need: "tubes", ic: "🧫", ar: "اسحب Hémocultures + lactate (زرع دم + لاكتات)", fr: "Prélever hémocultures + lactates" },
  guedel:    { at: "bed", need: "guedel", ic: "🌬️", ar: "حطّ Guedel + شفط (Aspiration)", fr: "Canule de Guedel + aspiration" },
  sonde:     { at: "bed", need: "sonde", ic: "🚽", ar: "ركّب Sonde urinaire + راقب الـ diurèse (كمية البول)", fr: "Sonde urinaire + surveiller la diurèse" },
  immob:     { at: "bed", need: "collar", ic: "🦴", ar: "ثبّت العمود الفقري (Minerve + plan dur)", fr: "Immobiliser le rachis (minerve + plan dur)" },
  shock:     { at: "bed", need: "defib", ic: "⚡", ar: "صدمة كهربا — Défibrillation", fr: "Choc électrique (défibrillation)" },
  adre:      { at: "bed", need: "adre", ic: "💉", ar: "عطي Adrénaline (Épinéphrine)", fr: "Donner l'adrénaline" },
  nora:      { at: "bed", need: "nora", ic: "💉", ar: "عطي Noradrénaline", fr: "Donner la noradrénaline" },
  atro:      { at: "bed", need: "atro", ic: "💉", ar: "عطي Atropine", fr: "Donner l'atropine" },
  dobu:      { at: "bed", need: "dobu", ic: "💉", ar: "عطي Dobutamine (inotrope)", fr: "Donner la dobutamine" },
  deca:      { at: "bed", need: "deca", ic: "💊", ar: "عطي Decadron (كورتيزون)", fr: "Donner le Décadron" },
  atb:       { at: "bed", need: "atb", ic: "💊", ar: "عطي Antibiotique (مضاد حيوي)", fr: "Donner l'antibiotique" },
  sang:      { at: "bed", need: "sang", ic: "🩸", ar: "علّق كيس الدم — Transfusion (نقل دم)", fr: "Transfuser (poche de sang)" }
 },
 groups: { ev: { ar: "🔎 تقييم", fr: "🔎 Évaluer" }, pos: { ar: "🧍 الوضعية", fr: "🧍 Position" }, tx: { ar: "🩺 تدخّل", fr: "🩺 Agir" }, hand: { ar: "✋ يلّي بإيدك", fr: "✋ Ce que tu tiens" } },
 osman: {
  top: [{ ar: "شغل ممرّض حقيقي! 😎 المريض محظوظ فيك", fr: "Du vrai travail d'infirmier ! 😎 Le patient a de la chance" }, { ar: "بالترتيب وبسرعة… هيك بدّي ياك بالطوارئ 👏", fr: "Dans l'ordre et vite… c'est comme ça aux urgences 👏" }, { ar: "يا عيني! 🌟 لو كان الامتحان هلّق كنت جبت العلامة الكاملة", fr: "Bravo ! 🌟 Si l'examen était maintenant, tu aurais la note maximale" }],
  mid: [{ ar: "منيح، بس في كم خطوة ضيّعتها — شوف الترتيب تحت وجرّب كمان مرّة 💪", fr: "Bien, mais tu as raté quelques étapes — regarde l'ordre en bas et réessaie 💪" }, { ar: "قربت! الترتيب مهم بالطوارئ: ABC قبل كل شي 🧠", fr: "Presque ! L'ordre compte aux urgences : ABC avant tout 🧠" }],
  low: [{ ar: "يا حرام المريض 😅 ولا يهمّك، الطوارئ بتنتعلّم بالتجربة — راجع الخطوات وارجع", fr: "Pauvre patient 😅 Pas grave, les urgences s'apprennent en pratiquant — relis les étapes et reviens" }, { ar: "خود نفس 🧘 واقرا الدرس مرّة، بعدين ارجع عالتخت 1", fr: "Respire 🧘 relis le cours, puis reviens au lit 1" }]
 },
 cases: [
  { id: "hypo", ic: "🩸", t: { ar: "صدمة نقص الحجم — Choc hypovolémique", fr: "Choc hypovolémique" },
    src: { ar: "📘 من درسك: الإنعاش ← الصدمات (r4)", fr: "📘 Ton cours : réa → les chocs (r4)" }, href: "rea.html#r4", gen: 0,
    who: { ar: "شب، 28 سنة — حادث موتو. جرح عميق بفخدو عم ينزف كتير.", fr: "Homme, 28 ans — accident de moto. Plaie profonde de la cuisse qui saigne beaucoup." },
    sx: [{ ar: "جلد بارد وشاحب ومتعرّق", fr: "Peau froide, pâle, moite" }, { ar: "عطشان كتير", fr: "Très soif" }, { ar: "مشوّش شوي (اضطراب وعي)", fr: "Un peu confus" }, { ar: "قلّة البول", fr: "Oligurie" }],
    vit: { sys: 82, dia: 50, fc: 128, fr: 26, spo2: 93, t: 36.1, gcs: 14 },
    lab: { ar: "Acide lactique (حمض اللاكتيك) مرتفع ↑ = صدمة", fr: "Lactates ↑ = choc" },
    limit: 240, drift: { sys: -2, dia: -1.2, fc: 2, spo2: -0.4, gcs: -0.12 },
    steps: [
     { a: "stop", key: 1, eff: { sys: 4, fc: -3 }, why: { ar: "أوّل شي: «إيقاف سبب فقدان السوائل» (من درسك) — طالما الدم عم يروح، كل شي تاني ما بيفيد.", fr: "D'abord « arrêter la cause de la perte » (ton cours) : tant que ça saigne, le reste ne sert à rien." } },
     { a: "mon", key: 1, why: { ar: "«مراقبة العلامات الحيوية» — هلّق شايف الضغط والنبض لحظة بلحظة.", fr: "« Surveiller les signes vitaux » : TA et FC en continu." } },
     { a: "o2", key: 1, eff: { spo2: 5 }, why: { ar: "«إعطاء O₂ حسب طلب الطبيب» — الأعضاء ناقصها تروية.", fr: "« O₂ selon prescription » : les organes manquent de perfusion." } },
     { a: "vvp", key: 1, why: { ar: "خط وريدي (VVP) لتعطي السوائل والدم.", fr: "Une VVP pour donner solutés et sang." } },
     { a: "remp", key: 1, after: ["stop", "vvp"], ow: { ar: "عبّي بعد ما توقّف النزيف — وإلّا السوائل بتطلع من الجرح.", fr: "Remplir après avoir arrêté le saignement, sinon le soluté repart par la plaie." }, eff: { sys: 14, dia: 8, fc: -10, gcs: 0.5 }, why: { ar: "«إعطاء سوائل وريدية» — تعويض الحجم بيرفع الضغط وبيهدّي النبض.", fr: "« Solutés IV » : le remplissage remonte la TA et ralentit la FC." } },
     { a: "call", key: 1, after: ["mon"], ow: { ar: "قبل ما تتصل لازم يكون معك أرقام (ركّب المونيتور) لتخبّر الطبيب.", fr: "Avant d'appeler, il te faut des chiffres (monitorage) à transmettre." }, why: { ar: "الطبيب بيقرّر «تعويض الحجم حسب السبب (نقل الدم)».", fr: "Le médecin décide de « compenser selon la cause (transfusion) »." } },
     { a: "sang", key: 1, after: ["call", "vvp"], eff: { sys: 12, dia: 7, fc: -10, gcs: 0.6 }, why: { ar: "نزيف = نعوّض بالدم (نقل الدم) — من درسك.", fr: "Hémorragie = on compense par du sang (transfusion) — ton cours." } },
     { a: "sonde", key: 1, why: { ar: "«مراقبة الـ diurèse» والسوائل الداخلة والطالعة.", fr: "« Surveiller la diurèse » et les entrées/sorties." } },
     { a: "eval", key: 1, why: { ar: "«مراقبة الوعي» — بالصدمة الدماغ ناقصو دم.", fr: "« Surveiller la conscience » : le cerveau manque de sang." } }
    ],
    bad: [
     { a: "adre", eff: { fc: 14, sys: -4 }, why: { ar: "Adrénaline ممنوعة هون! «Choc hypovolémique» من موانعها (contre-indications) بدرس الأدوية. الحل: سوائل ودم.", fr: "Adrénaline contre-indiquée ! « Choc hypovolémique » est dans ses contre-indications (cours de pharmaco). Il faut solutés et sang." } },
     { a: "drink", eff: { spo2: -1 }, why: { ar: "مريض بصدمة ومشوّش: ما منشرّبو بالتمّ — خطر يشرق، وممكن يحتاج عملية (معلومات عامة).", fr: "Choqué et confus : rien par la bouche — risque de fausse route, il peut aller au bloc (notion générale)." } }
    ],
    neutral: { pos_trend: { ar: "مش مكتوبة بدرسك لهالصدمة — ركّز عالنزيف والسوائل والدم.", fr: "Pas dans ton cours pour ce choc — concentre-toi sur saignement, solutés, sang." } },
    doc: { ar: "الطبيب: «جايي. علّقلو كيس دم وكمّل سوائل، وراقبلي البول.»", fr: "Médecin : « J'arrive. Transfuse, continue le remplissage et surveille la diurèse. »" },
    end: { ok: { ar: "الضغط طلع والنبض هدي — المريض نزل عالعمليات مستقرّ 🎉", fr: "TA remontée, FC calmée — le patient part au bloc stable 🎉" }, lost: { ar: "الضغط نزل كتير — صدمة نزفية ما انعالجت بالوقت.", fr: "TA effondrée — choc hémorragique non traité à temps." } } },

  { id: "cardio", ic: "🫀", t: { ar: "الصدمة القلبية — Choc cardiogénique", fr: "Choc cardiogénique" },
    src: { ar: "📘 من درسك: القلب ← Choc cardiogénique (درس 9)", fr: "📘 Ton cours : cardio → choc cardiogénique (leçon 9)" }, href: "cardio.html", gen: 0,
    who: { ar: "رجّال، 62 سنة — Infarctus (جلطة قلبية) من يومين. هلّق ضيق نفس قوي وقلقان كتير.", fr: "Homme, 62 ans — infarctus il y a 2 jours. Dyspnée intense, très anxieux." },
    sx: [{ ar: "Peau froide et moite (جلد بارد ورطب)", fr: "Peau froide et moite" }, { ar: "Confusion (تشوّش) خفيف", fr: "Légère confusion" }, { ar: "Diurèse (البول) أقل من 30 ml بالساعة", fr: "Diurèse < 30 ml/h" }, { ar: "Tachypnée (تنفّس سريع)", fr: "Tachypnée" }],
    vit: { sys: 82, dia: 54, fc: 118, fr: 28, spo2: 88, t: 36.8, gcs: 14 },
    lab: { ar: "ECG: آثار Infarctus · Gaz du sang: hypoxie (نقص أوكسجين)", fr: "ECG : séquelle d'infarctus · GDS : hypoxie" },
    limit: 240, drift: { sys: -1.6, dia: -1, fc: 1.5, spo2: -0.6, fr: 0.4 },
    steps: [
     { a: "pos_semi", key: 1, eff: { spo2: 2, fr: -3 }, why: { ar: "وضعية semi-Fowler (نص جلوس) — من «دور الممرّض» بدرس Choc cardiogénique: بتريّح التنفّس.", fr: "Position semi-Fowler — rôle infirmier de ton cours : soulage la respiration." } },
     { a: "o2", key: 1, eff: { spo2: 6, fr: -2 }, why: { ar: "O₂ (أوكسجين) — أوّل علاج بالدرس، عندو hypoxie.", fr: "O₂ — premier traitement du cours, il est hypoxique." } },
     { a: "mon", key: 1, why: { ar: "نراقب ونسجّل: الضغط والنبض والتنفّس و SpO₂.", fr: "Surveiller : TA, FC, FR, SpO₂." } },
     { a: "vvp", key: 1, after: ["o2"], ow: { ar: "التنفّس (B) قبل الخط الوريدي (C): الأكسجين أوّل.", fr: "B avant C : l'oxygène d'abord." }, why: { ar: "خط وريدي للأدوية — والسوائل «حسب الوصفة» بس.", fr: "VVP pour les médicaments — solutés seulement sur prescription." } },
     { a: "call", key: 1, after: ["mon"], ow: { ar: "اتصل ومعك أرقام المونيتور.", fr: "Appelle avec les chiffres du moniteur." }, why: { ar: "الطبيب بيوصف الـ inotropes (مقوّيات القلب).", fr: "Le médecin prescrit les inotropes." } },
     { a: "dobu", key: 1, after: ["call", "vvp"], eff: { sys: 14, dia: 6, fc: -6, spo2: 2 }, why: { ar: "Inotropes (مقوّيات القلب): dopamine, dobutamine — بتقوّي الانقباض فبيطلع الضغط.", fr: "Inotropes (dopamine, dobutamine) : renforcent la contraction, la TA remonte." } },
     { a: "sonde", key: 1, why: { ar: "Sonde urinaire + مراقبة: البول أقل من 30 ml/h = علامة صدمة.", fr: "Sonde urinaire : diurèse < 30 ml/h = signe de choc." } }
    ],
    bad: [
     { a: "remp", eff: { spo2: -6, fr: 4 }, why: { ar: "مش remplissage سريع! بالـ choc cardiogénique السوائل «حسب الوصفة» بس — القلب ضعيف، وكتر المي بيرجع عالرية (OAP = وذمة رئوية).", fr: "Pas de remplissage rapide ! Dans le choc cardiogénique, solutés seulement sur prescription : le cœur est faible, l'excès donne un OAP." } },
     { a: "pos_trend", eff: { spo2: -4, fr: 3 }, why: { ar: "رفع الإجرين بيرجّع دم أكتر عالقلب الضعيف وبيزيد ضيق النفس — الدرس بيقول semi-Fowler.", fr: "Jambes surélevées = plus de sang vers un cœur faible, plus de dyspnée — le cours dit semi-Fowler." } },
     { a: "adre", eff: { fc: 16 }, why: { ar: "مش هيدا الدوا — الدرس بيقول inotropes متل dobutamine حسب الوصفة. Adrénaline ممنوعة مع Arythmie (من موانعها).", fr: "Pas ce médicament : le cours dit inotropes (dobutamine). Adrénaline contre-indiquée en cas d'arythmie." } }
    ],
    neutral: { drink: { ar: "الدرس بيقول تغذية بسوائل صافية… بس هلّق مش وقتها، عندو ضيق نفس.", fr: "Le cours parle de liquides clairs… mais pas maintenant, il est dyspnéique." } },
    doc: { ar: "الطبيب: «جايي. بلّش Dobutamine عالخط، وما تعطي سوائل كتير، وراقب البول.»", fr: "Médecin : « J'arrive. Dobutamine sur la VVP, pas trop de solutés, surveille la diurèse. »" },
    end: { ok: { ar: "الضغط طلع شوي والأوكسجين تحسّن — انتقل عالعناية القلبية 🎉", fr: "TA un peu remontée, oxygénation meilleure — transfert en soins intensifs cardio 🎉" }, lost: { ar: "القلب ما عاد قدر يضخّ — choc cardiogénique ما انعالج بالوقت.", fr: "Le cœur n'a plus pompé — choc cardiogénique non traité à temps." } } },

  { id: "ana", ic: "🐝", t: { ar: "صدمة الحساسية — Choc anaphylactique", fr: "Choc anaphylactique" },
    src: { ar: "📘 درس الأدوية (Épinéphrine، Rocéphine، Decadron) + 🌐 معلومات عامة", fr: "📘 Cours de pharmaco (épinéphrine, Rocéphine, Décadron) + 🌐 notions générales" }, href: "pharma.html", gen: 1,
    who: { ar: "صبية، 24 سنة — عم تاخد Rocéphine (مضاد حيوي) بالوريد لأوّل مرّة، وما انعملها Test d'allergie (اختبار تحسّس).", fr: "Femme, 24 ans — première Rocéphine IV, sans test d'allergie." },
    sx: [{ ar: "Urticaire (شرى) على كل جسمها", fr: "Urticaire généralisée" }, { ar: "Angio-œdème (وذمة) بالوجّ والشفاف", fr: "Angio-œdème du visage et des lèvres" }, { ar: "Bronchospasme (تشنّج قصبي): صفير وضيق نفس", fr: "Bronchospasme : sifflements, dyspnée" }, { ar: "دايخة كتير", fr: "Très étourdie" }],
    vit: { sys: 76, dia: 42, fc: 136, fr: 30, spo2: 89, t: 37, gcs: 14 }, pre: ["vvp"],
    lab: { ar: "عندها VVP من قبل (عليها الـ Rocéphine)", fr: "Elle a déjà une VVP (la Rocéphine coule dessus)" },
    limit: 180, drift: { sys: -2.4, dia: -1.4, fc: 2, spo2: -0.8, fr: 0.5 },
    steps: [
     { a: "stopdrug", key: 1, why: { ar: "أوّل شي وقّف السبب: الـ Rocéphine هيي يلّي عم تعمل الحساسية.", fr: "D'abord arrêter la cause : c'est la Rocéphine qui déclenche l'allergie." } },
     { a: "call", key: 1, why: { ar: "Choc anaphylactique = طارئ: بدّك الطبيب فوراً.", fr: "Choc anaphylactique = urgence : le médecin tout de suite." } },
     { a: "adre", key: 1, after: ["call"], eff: { sys: 22, dia: 12, fc: -8, spo2: 5, fr: -6 }, why: { ar: "Adrénaline (Épinéphrine): «Choc anaphylactique, traitement d'urgence» — من درس الأدوية: بترفع الضغط وبتوسّع القصبات (bronchodilatateur).", fr: "Épinéphrine : « choc anaphylactique, traitement d'urgence » (ton cours) : remonte la TA, bronchodilatateur." } },
     { a: "o2", key: 1, eff: { spo2: 5 }, why: { ar: "عندها bronchospasme والـ SpO₂ نازلة: أكسجين.", fr: "Bronchospasme et SpO₂ basse : oxygène." } },
     { a: "mon", key: 1, why: { ar: "مراقبة الضغط والنبض والتنفّس.", fr: "Surveiller TA, FC, FR." } },
     { a: "remp", key: 1, after: ["stopdrug"], ow: { ar: "وقّف الدوا المسبّب قبل ما تكمّل سوائل عنفس الخط.", fr: "Arrête le médicament avant de passer du soluté sur la même ligne." }, eff: { sys: 10, dia: 6, fc: -4 }, why: { ar: "سوائل بالوريد بتساعد الضغط (معلومات عامة).", fr: "Le remplissage aide la TA (notion générale)." } },
     { a: "deca", after: ["adre"], ow: { ar: "الكورتيزون بطيء: Adrénaline أوّل، بعدين Decadron.", fr: "La cortisone est lente : adrénaline d'abord, Décadron ensuite." }, why: { ar: "Decadron = «Anti-allergique» بدرس الأدوية — بعد الأدرينالين، مش بدالها.", fr: "Décadron = anti-allergique (ton cours) — après l'adrénaline, pas à sa place." } }
    ],
    bad: [
     { a: "atb", eff: { sys: -8, spo2: -4 }, why: { ar: "لا! «Allergie aux Céphalosporines» = contre-indication — ما منرجع منعطي نفس الدوا أو من عيلتو.", fr: "Non ! Allergie aux céphalosporines = contre-indication : on ne redonne pas ce médicament." } },
     { a: "drink", eff: { spo2: -3 }, why: { ar: "شفافها منفوخة ومعها صفير — ما منشرّبها شي.", fr: "Lèvres gonflées et sifflements : rien par la bouche." } }
    ],
    neutral: { pos_trend: { ar: "ممكن (معلومات عامة)، بس الأهم هلّق: وقّف الدوا، الطبيب والأدرينالين.", fr: "Possible (notion générale), mais l'essentiel : arrêter le médicament, médecin, adrénaline." } },
    doc: { ar: "الطبيب: «Choc anaphylactique! عطي Adrénaline هلّق، وكمّل سوائل وأكسجين.»", fr: "Médecin : « Choc anaphylactique ! Adrénaline maintenant, remplissage et oxygène. »" },
    end: { ok: { ar: "الصفير خفّ والضغط طلع — الحساسية انضبطت 🎉 (وسجّل بالملف: Allergie Céphalosporines)", fr: "Sifflements calmés, TA remontée — réaction contrôlée 🎉 (noter : allergie aux céphalosporines)" }, lost: { ar: "الحساسية سكّرت النفس ونزّلت الضغط — الأدرينالين تأخّرت.", fr: "L'allergie a fermé les voies aériennes et effondré la TA — adrénaline trop tardive." } } },

  { id: "sept", ic: "🦠", t: { ar: "الصدمة الإنتانية — Choc septique", fr: "Choc septique" },
    src: { ar: "🌐 معلومات عامة — مش بدروسك بعد (بس الـ lactate من درس الصدمات)", fr: "🌐 Notions générales — pas encore dans tes cours (lactates : cours des chocs)" }, href: "rea.html#r4", gen: 1,
    who: { ar: "ستّ، 70 سنة — Infection urinaire (التهاب بولي) من ٣ أيام. اليوم رجفة وتشوّش.", fr: "Femme, 70 ans — infection urinaire depuis 3 jours. Aujourd'hui frissons et confusion." },
    sx: [{ ar: "Fièvre (حرارة) 39.5 مع Frissons (رجفة)", fr: "Fièvre 39,5 avec frissons" }, { ar: "Confusion (تشوّش)", fr: "Confusion" }, { ar: "بول قليل وعكر", fr: "Urines rares et troubles" }],
    vit: { sys: 84, dia: 46, fc: 122, fr: 26, spo2: 92, t: 39.5, gcs: 13 },
    lab: { ar: "Acide lactique (حمض اللاكتيك) ↑ = علامة صدمة (من درسك)", fr: "Lactates ↑ = signe de choc (ton cours)" },
    limit: 240, drift: { sys: -1.8, dia: -1, fc: 1.5, spo2: -0.4, t: 0.05, gcs: -0.1 },
    steps: [
     { a: "mon", key: 1, why: { ar: "مراقبة العلامات الحيوية — الضغط واطي.", fr: "Surveiller les signes vitaux — TA basse." } },
     { a: "o2", key: 1, eff: { spo2: 4 }, why: { ar: "أكسجين لمريضة بصدمة.", fr: "Oxygène pour une patiente choquée." } },
     { a: "vvp", key: 1, why: { ar: "خط وريدي للسوائل والمضاد الحيوي.", fr: "VVP pour solutés et antibiotique." } },
     { a: "bio", key: 1, why: { ar: "Hémocultures (زرع دم) قبل أي مضاد حيوي + lactate: ارتفاعو بيدلّ على صدمة.", fr: "Hémocultures avant tout antibiotique + lactates : leur hausse signe le choc." } },
     { a: "remp", key: 1, after: ["vvp"], eff: { sys: 12, dia: 6, fc: -8 }, why: { ar: "سوائل وريدية (Cristalloïdes — المحاليل البلّورية) أوّل علاج للضغط الواطي.", fr: "Cristalloïdes : premier traitement de l'hypotension." } },
     { a: "call", key: 1, after: ["mon"], ow: { ar: "اتصل ومعك الأرقام.", fr: "Appelle avec les chiffres." }, why: { ar: "الطبيب بيوصف المضاد الحيوي والـ Noradrénaline.", fr: "Le médecin prescrit l'antibiotique et la noradrénaline." } },
     { a: "atb", key: 1, after: ["bio", "call"], ow: { ar: "Hémocultures أوّل، بعدين المضاد الحيوي — وإلّا الزرع بيطلع غلط (faux négatif).", fr: "Hémocultures d'abord, antibiotique ensuite — sinon faux négatif." }, eff: { t: -0.6, fc: -4 }, why: { ar: "Antibiotique (مضاد حيوي) بأسرع وقت — أوّل ساعة.", fr: "Antibiotique au plus vite — dans la première heure." } },
     { a: "nora", key: 1, after: ["remp", "call"], ow: { ar: "Noradrénaline بعد ما تعطي سوائل، مش قبل.", fr: "Noradrénaline après le remplissage, pas avant." }, eff: { sys: 14, dia: 8, fc: -4 }, why: { ar: "إذا الضغط بعدو واطي بعد السوائل: Noradrénaline (Vasopresseur — مقبّض أوعية).", fr: "TA encore basse après remplissage : noradrénaline (vasopresseur)." } },
     { a: "sonde", why: { ar: "مراقبة الـ diurèse (كمية البول).", fr: "Surveiller la diurèse." } }
    ],
    bad: [
     { a: "drink", eff: { spo2: -1 }, why: { ar: "مشوّشة: خطر تشرق (fausse route) — مش هلّق.", fr: "Confuse : risque de fausse route — pas maintenant." } }
    ],
    neutral: { pos_trend: { ar: "مش هيدا المهم هلّق — السوائل والمضاد الحيوي.", fr: "Pas l'essentiel — remplissage et antibiotique." } },
    doc: { ar: "الطبيب: «Sepsis! زرع دم وبعدين Antibiotique، كمّل سوائل، وإذا الضغط بعدو واطي Noradrénaline.»", fr: "Médecin : « Sepsis ! Hémocultures puis antibiotique, remplissage, et noradrénaline si la TA reste basse. »" },
    end: { ok: { ar: "الضغط ثبت والمضاد الحيوي ماشي — انتقلت عالعناية 🎉", fr: "TA stabilisée, antibiotique en cours — transfert en réanimation 🎉" }, lost: { ar: "الإنتان نزّل الضغط كتير — الصدمة ما انعالجت بالوقت.", fr: "Le sepsis a effondré la TA — choc non traité à temps." } } },

  { id: "neurog", ic: "🦴", t: { ar: "الصدمة العصبية — Choc neurogène", fr: "Choc neurogène" },
    src: { ar: "📘 من درسك: الإنعاش ← الصدمات (r4)", fr: "📘 Ton cours : réa → les chocs (r4)" }, href: "rea.html#r4", gen: 0,
    who: { ar: "شب، 22 سنة — وقع عن سطح البيت على ضهرو. بيقول ما عم يحسّ بإجريه، ووجعه برقبتو.", fr: "Homme, 22 ans — chute du toit sur le dos. Ne sent plus ses jambes, douleur au cou." },
    sx: [{ ar: "جلد جاف ودافي (مش بارد متل باقي الصدمات!)", fr: "Peau sèche et chaude (pas froide comme les autres chocs !)" }, { ar: "دايخ", fr: "Vertiges" }, { ar: "ما بيحرّك إجريه", fr: "Ne bouge pas les jambes" }, { ar: "Bradycardie (بطء القلب)", fr: "Bradycardie" }],
    vit: { sys: 78, dia: 44, fc: 46, fr: 18, spo2: 94, t: 36.6, gcs: 15 },
    lab: { ar: "إصابة النخاع الشوكي ← فقدان التنبيه الودّي (tonus sympathique)", fr: "Lésion médullaire → perte du tonus sympathique" },
    limit: 240, drift: { sys: -1.6, dia: -1, fc: -0.6, spo2: -0.2 },
    steps: [
     { a: "immob", key: 1, why: { ar: "«تثبيت العمود الفقري عند الاشتباه بإصابة نخاعية» (من درسك) — قبل أي حركة.", fr: "« Immobiliser le rachis en cas de suspicion de lésion médullaire » (ton cours) — avant tout mouvement." } },
     { a: "mon", key: 1, why: { ar: "«مراقبة العلامات الحيوية»: الضغط واطي والنبض بطيء.", fr: "« Surveiller les signes vitaux » : TA basse, FC lente." } },
     { a: "o2", eff: { spo2: 4 }, why: { ar: "أكسجين لمريض بصدمة (معلومات عامة).", fr: "Oxygène pour un patient choqué (notion générale)." } },
     { a: "vvp", key: 1, why: { ar: "خط وريدي للسوائل والأدوية.", fr: "VVP pour solutés et médicaments." } },
     { a: "remp", key: 1, after: ["vvp"], eff: { sys: 8, dia: 4 }, why: { ar: "«إعطاء السوائل الوريدية» — من دور الممرّض بالصدمة العصبية.", fr: "« Solutés IV » — rôle infirmier dans le choc neurogène." } },
     { a: "call", key: 1, after: ["mon"], ow: { ar: "اتصل ومعك الأرقام.", fr: "Appelle avec les chiffres." }, why: { ar: "الطبيب بيوصف Atropine و Noradrénaline.", fr: "Le médecin prescrit atropine et noradrénaline." } },
     { a: "atro", key: 1, after: ["call", "vvp"], eff: { fc: 28, sys: 6 }, why: { ar: "«إعطاء Atropine» — بتسرّع القلب البطيء (bradycardie). من درسك.", fr: "« Atropine » : accélère la bradycardie. Ton cours." } },
     { a: "nora", key: 1, after: ["call", "remp"], ow: { ar: "سوائل أوّل، بعدين Noradrénaline.", fr: "Solutés d'abord, puis noradrénaline." }, eff: { sys: 16, dia: 9 }, why: { ar: "«إعطاء Noradrénaline» — بترجّع توتّر الأوعية فبيطلع الضغط.", fr: "« Noradrénaline » : rétablit le tonus vasculaire, la TA remonte." } },
     { a: "sonde", key: 1, why: { ar: "«مراقبة البول» (diurèse).", fr: "« Surveiller la diurèse »." } }
    ],
    bad: [
     { a: ["pos_semi", "pos_pls", "pos_tete30", "pos_trend"], unless: "immob", eff: { sys: -3 }, why: { ar: "ممنوع تحرّكو قبل ما تثبّت العمود الفقري! ممكن تزيد إصابة النخاع.", fr: "Interdit de le mobiliser avant d'immobiliser le rachis ! Risque d'aggraver la lésion." } },
     { a: "adre", eff: { fc: 20 }, why: { ar: "مش هيدا يلّي بدرسك للصدمة العصبية — الدرس بيقول Atropine و Noradrénaline.", fr: "Pas ce que dit ton cours pour le choc neurogène : atropine et noradrénaline." } }
    ],
    neutral: { drink: { ar: "مش وقتها — ركّز عالعمود الفقري والضغط.", fr: "Pas le moment — rachis et TA d'abord." } },
    doc: { ar: "الطبيب: «ثبّتلي الرقبة منيح. عطي Atropine، وبعد السوائل بلّش Noradrénaline.»", fr: "Médecin : « Bien immobiliser. Atropine, puis noradrénaline après le remplissage. »" },
    end: { ok: { ar: "النبض طلع والضغط ثبت، والعمود الفقري مثبّت — نزل عالصورة والجراحة 🎉", fr: "FC et TA remontées, rachis immobilisé — il part à l'imagerie 🎉" }, lost: { ar: "الضغط والنبض نزلوا كتير — الصدمة العصبية ما انعالجت بالوقت.", fr: "TA et FC trop basses — choc neurogène non traité à temps." } } },

  { id: "resp", ic: "🫁", t: { ar: "ضيق نفس وحماض تنفّسي — Acidose respiratoire", fr: "Détresse respiratoire — acidose respiratoire" },
    src: { ar: "📘 من درسك: الإنعاش ← غازات الدم (r1 + r2)", fr: "📘 Ton cours : réa → gaz du sang (r1 + r2)" }, href: "rea.html#r1", gen: 0,
    who: { ar: "رجّال، 68 سنة — BPCO (COPD — مرض رئوي مزمن) بنوبة تفاقم: ضيق نفس من ٣ أيام، تعبان ونعسان.", fr: "Homme, 68 ans — BPCO en exacerbation : dyspnée depuis 3 jours, fatigué, somnolent." },
    sx: [{ ar: "Dyspnée (ضيق نفس) قوية — عم يتنفّس بعضلات رقبتو", fr: "Dyspnée intense — tirage des muscles du cou" }, { ar: "نعسان ومشوّش", fr: "Somnolent et confus" }, { ar: "سعلة مع بلغم", fr: "Toux grasse" }],
    vit: { sys: 150, dia: 90, fc: 110, fr: 30, spo2: 86, t: 37.4, gcs: 13 },
    lab: { ar: "GDS: بعدو ما انسحب — اسحبو وفسّرو", fr: "GDS : pas encore prélevés — prélève et interprète" },
    labGds: { ar: "pH 7.28 · PaCO₂ 58 mmHg · HCO₃⁻ 24 mEq/L · PaO₂ 65 mmHg", fr: "pH 7,28 · PaCO₂ 58 mmHg · HCO₃⁻ 24 mEq/L · PaO₂ 65 mmHg" },
    limit: 210, drift: { spo2: -0.8, fr: 0.5, fc: 1, gcs: -0.12 },
    steps: [
     { a: "pos_semi", key: 1, eff: { spo2: 2, fr: -3 }, why: { ar: "نص جلوس (demi-assis) بيريّح التنفّس — متل ما المريض بيرتاح لما يقعد (orthopnée).", fr: "La position demi-assise soulage la respiration — comme dans l'orthopnée." } },
     { a: "o2", key: 1, eff: { spo2: 6, fr: -2 }, why: { ar: "O₂ بحذر (débit faible) مع BPCO — وسجّل الـ FiO₂ (من الدور التمريضي بدرس الـ ABG).", fr: "O₂ prudent (bas débit) en BPCO — et noter la FiO₂ (rôle infirmier, cours ABG)." } },
     { a: "mon", key: 1, why: { ar: "SpO₂ وتنفّس ونبض عالمونيتور.", fr: "SpO₂, FR et FC au moniteur." } },
     { a: "gds", key: 1, why: { ar: "GDS من الشريان (artère): test d'Allen قبل، سيرنغ مهبّرنة، طلّع فقاعات الهوا، اضغط 5 دقايق، وابعتها فوراً عالتلج.", fr: "GDS artériel : test d'Allen, seringue héparinée, chasser les bulles, comprimer 5 min, envoyer vite dans la glace." },
       q: { ask: { ar: "النتيجة: pH 7.28 · PaCO₂ 58 · HCO₃⁻ 24 · PaO₂ 65 — شو هيي؟", fr: "Résultat : pH 7,28 · PaCO₂ 58 · HCO₃⁻ 24 · PaO₂ 65 — c'est quoi ?" },
            o: [{ ar: "Acidose respiratoire non compensée (حماض تنفّسي غير معوَّض) + نقص أكسجة", fr: "Acidose respiratoire non compensée + hypoxémie" }, { ar: "Acidose métabolique partiellement compensée (حماض أيضي معوَّض جزئياً)", fr: "Acidose métabolique partiellement compensée" }, { ar: "Alcalose respiratoire (قلاء تنفّسي)", fr: "Alcalose respiratoire" }], a: 0,
            x: { ar: "pH ↓ (حماض) + PaCO₂ ↑ (تنفّسي، عكس الـ pH — ROME) + HCO₃⁻ طبيعي = غير معوَّض. نفس «الحالة 1» بدرسك: مريض COPD بنوبة تفاقم.", fr: "pH ↓ + PaCO₂ ↑ (respiratoire, ROME) + HCO₃⁻ normal = non compensée. C'est le « cas 1 » de ton cours : BPCO en exacerbation." } } },
     { a: "call", key: 1, after: ["gds"], ow: { ar: "اتصل ومعك نتيجة الغازات — «إبلاغ الطبيب بالنتائج الحرجة» (من درسك).", fr: "Appelle avec le résultat des gaz — « informer le médecin des résultats critiques » (ton cours)." }, why: { ar: "«إبلاغ الطبيب بالنتائج الحرجة»: حماض تنفّسي = نقص تهوية.", fr: "« Informer le médecin des résultats critiques » : acidose respiratoire = hypoventilation." } },
     { a: "vvp", after: ["o2"], ow: { ar: "ABC: التنفّس قبل الخط الوريدي.", fr: "ABC : la respiration avant la VVP." }, why: { ar: "خط وريدي للأدوية يلّي رح يوصفها الطبيب.", fr: "VVP pour les traitements prescrits." } }
    ],
    bad: [
     { a: "pos_trend", eff: { spo2: -4, fr: 3 }, why: { ar: "إجريه لفوق وراسو لتحت بيضغط عالرية وبيزيد ضيق النفس.", fr: "Jambes en l'air, tête basse : ça comprime les poumons, plus de dyspnée." } },
     { a: "remp", eff: { spo2: -2 }, why: { ar: "ما في صدمة هون — المشكلة بالتهوية مش بالسوائل.", fr: "Pas de choc ici — le problème est ventilatoire, pas volémique." } }
    ],
    neutral: { drink: { ar: "مش وقتها — ضيق نفسو قوي.", fr: "Pas le moment — dyspnée intense." } },
    doc: { ar: "الطبيب: «حماض تنفّسي؟ جايي — خلّيه قاعد، كمّل الأكسجين بحذر وراقب الوعي.»", fr: "Médecin : « Acidose respiratoire ? J'arrive — garde-le assis, O₂ prudent, surveille la conscience. »" },
    end: { ok: { ar: "التنفّس ارتاح والـ SpO₂ طلعت — الطبيب كمّل العلاج 🎉", fr: "Respiration soulagée, SpO₂ remontée — le médecin poursuit 🎉" }, lost: { ar: "الـ CO₂ تجمّع وغاب عن الوعي — فشل تنفّسي.", fr: "Le CO₂ s'est accumulé, il a perdu connaissance — insuffisance respiratoire." } } },

  { id: "coma", ic: "🧠", t: { ar: "غيبوبة — Glasgow ≤ 8 (Coma)", fr: "Coma — Glasgow ≤ 8" },
    src: { ar: "📘 من درسك: الأعصاب ← Glasgow و HTIC · 🌐 PLS و Guedel معلومات عامة", fr: "📘 Ton cours : neuro → Glasgow et HTIC · 🌐 PLS et Guedel : notions générales" }, href: "neuro.html#glasgow", gen: 0,
    who: { ar: "رجّال، 55 سنة — لقيوه بالبيت مش عم يردّ. عندو HTA (ضغط) وما بياخد دواه.", fr: "Homme, 55 ans — trouvé chez lui, ne répond pas. HTA, ne prend pas son traitement." },
    sx: [{ ar: "Yeux (عيون): بيفتح عالوجع بس", fr: "Yeux : ouverture à la douleur seulement" }, { ar: "Verbal (كلام): أصوات بس", fr: "Verbal : sons incompréhensibles" }, { ar: "Moteur (حركة): بيسحب إيدو عالوجع", fr: "Moteur : retrait à la douleur" }, { ar: "شخير (ronflement) — عم يتنفّس بصعوبة", fr: "Ronflement — respiration difficile" }],
    vit: { sys: 178, dia: 96, fc: 58, fr: 10, spo2: 87, t: 37, gcs: 8 }, hideGcs: 1,
    lab: { ar: "قيس الـ Glasgow بنفسك (قيّم الوعي)", fr: "Calcule le Glasgow toi-même (évaluer)" },
    limit: 210, drift: { spo2: -0.9, fr: -0.2, gcs: -0.06 },
    steps: [
     { a: "eval", key: 1, why: { ar: "قيّم: عيون 2 + كلام 2 + حركة 4 = 8 → Coma (غيبوبة) ← خطر عالتنفّس (من درس Glasgow).", fr: "Évaluer : Y2 + V2 + M4 = 8 → coma → danger respiratoire (cours Glasgow)." },
       q: { ask: { ar: "عيون: عالوجع · كلام: أصوات · حركة: بيسحب إيدو — قدّيش الـ Glasgow؟", fr: "Yeux : à la douleur · Verbal : sons · Moteur : retrait — Glasgow = ?" },
            o: [{ ar: "8 = Coma (غيبوبة)", fr: "8 = coma" }, { ar: "10", fr: "10" }, { ar: "6", fr: "6" }], a: 0,
            x: { ar: "Yeux عالوجع = 2 · Verbal أصوات = 2 · Moteur بيسحب = 4 → 8. والـ 8 وما دون = coma (من درسك: نفس المثال!).", fr: "Yeux à la douleur = 2 · Verbal sons = 2 · Moteur retrait = 4 → 8. ≤ 8 = coma (exemple de ton cours)." } } },
     { a: "airway", key: 1, after: ["eval"], eff: { spo2: 3, fr: 2 }, why: { ar: "A = Airway: بغيبوبة اللسان بيسكّر الهوا (الشخير) — حرّر مجرى الهوا أوّل شي.", fr: "A = Airway : dans le coma la langue obstrue (ronflement) — libère d'abord." } },
     { a: "guedel", after: ["airway"], eff: { spo2: 3 }, why: { ar: "Canule de Guedel + aspiration: بتخلّي الهوا مفتوح وبتشيل الإفرازات (معلومات عامة).", fr: "Guedel + aspiration : garde les voies ouvertes, retire les sécrétions (notion générale)." } },
     { a: ["pos_pls", "pos_tete30"], key: 1, after: ["airway"], ow: { ar: "حرّر الهوا قبل ما تحرّكو.", fr: "Libère les voies aériennes avant de le mobiliser." }, eff: { spo2: 2 }, why: { ar: "PLS (وضعية جانبية آمنة) لمريض بغيبوبة عم يتنفّس (معلومات عامة) — أو راس مرفوع 30° إذا في HTIC (من درسك).", fr: "PLS pour un comateux qui respire (notion générale) — ou tête à 30° si HTIC (ton cours)." } },
     { a: "o2", key: 1, after: ["airway"], ow: { ar: "A قبل B: افتح مجرى الهوا قبل الأكسجين — الأكسجين ما بيفوت إذا الهوا مسكّر.", fr: "A avant B : ouvrir les voies aériennes avant l'O₂ — sinon il ne passe pas." }, eff: { spo2: 7 }, why: { ar: "B = Breathing: أكسجين، الـ SpO₂ واطية.", fr: "B = Breathing : oxygène, SpO₂ basse." } },
     { a: "mon", key: 1, why: { ar: "نراقب الوعي والعلامات الحيوية (من دور الممرّض بالـ HTIC).", fr: "Surveiller conscience et signes vitaux (rôle infirmier HTIC)." } },
     { a: "call", key: 1, after: ["eval"], ow: { ar: "قيّم الأوّل لتعرف شو تقول: «Glasgow 8».", fr: "Évalue d'abord pour transmettre « Glasgow 8 »." }, why: { ar: "Glasgow ≤ 8 = طارئ: الطبيب (وممكن intubation — تنبيب).", fr: "Glasgow ≤ 8 = urgence : médecin (intubation possible)." } },
     { a: "vvp", after: ["o2"], ow: { ar: "ABC: الهوا والتنفّس قبل الخط الوريدي.", fr: "ABC : voies aériennes et respiration avant la VVP." }, why: { ar: "C = Circulation: خط وريدي للأدوية (متل Mannitol حسب الوصفة).", fr: "C = Circulation : VVP pour les traitements (mannitol sur prescription)." } }
    ],
    bad: [
     { a: "drink", eff: { spo2: -8 }, why: { ar: "مريض بغيبوبة ما منعطيه شي بالتمّ — بيشرق (fausse route) وبيسكّر نفسو!", fr: "Rien par la bouche chez un comateux — fausse route, il s'étouffe !" } },
     { a: "pos_trend", eff: { gcs: -1, spo2: -2 }, why: { ar: "راسو لتحت بيزيد الضغط داخل الجمجمة (HTIC) — الدرس بيقول Tête surélevée 30°.", fr: "Tête basse = plus d'HTIC — le cours dit tête surélevée à 30°." } }
    ],
    neutral: { pos_semi: { ar: "مش أحسن شي لمريض بغيبوبة — PLS أو راس 30°.", fr: "Pas idéal chez un comateux — PLS ou tête à 30°." } },
    doc: { ar: "الطبيب: «Glasgow 8؟ جايي مع طبيب التخدير للـ intubation — خلّي الهوا مفتوح.»", fr: "Médecin : « Glasgow 8 ? J'arrive avec l'anesthésiste pour intuber — garde les voies ouvertes. »" },
    end: { ok: { ar: "الهوا مفتوح والـ SpO₂ طلعت — طبيب التخدير استلمو 🎉", fr: "Voies aériennes libres, SpO₂ remontée — l'anesthésiste prend le relais 🎉" }, lost: { ar: "الهوا تسكّر والأوكسجين نزل كتير — بغيبوبة الـ Airway أوّل شي.", fr: "Voies aériennes obstruées, désaturation — dans le coma, l'airway d'abord." } } },

  { id: "arret", ic: "⚡", t: { ar: "توقّف القلب — Arrêt cardiaque", fr: "Arrêt cardiaque" },
    src: { ar: "🌐 معلومات عامة — مش بدروسك بعد (Adrénaline: «Arrêt cardiovasculaire» من درس الأدوية)", fr: "🌐 Notions générales — pas encore dans tes cours (adrénaline : « arrêt cardiovasculaire », cours de pharmaco)" }, href: "homework.html", gen: 1,
    who: { ar: "ستّ، 80 سنة (متل الحالة 2 بوظيفتك) — كانت بالتخت 1 وفجأة ما عادت تردّ.", fr: "Femme, 80 ans (comme le cas 2 de ton devoir) — au lit 1, elle ne répond soudain plus." },
    sx: [{ ar: "ما بتردّ عالصوت ولا عالوجع", fr: "Ne répond ni à la voix ni à la douleur" }, { ar: "ما في تنفّس طبيعي", fr: "Pas de respiration normale" }, { ar: "ما في نبض (Pouls carotidien)", fr: "Pas de pouls carotidien" }],
    vit: { sys: 0, dia: 0, fc: 0, fr: 0, spo2: 0, t: 36.5, gcs: 3 }, rh: "fv", monOn: 1, cprBy: 45,
    lab: { ar: "عالمونيتور: FV (Fibrillation ventriculaire — رجفان بطيني)", fr: "Moniteur : FV (fibrillation ventriculaire)" },
    limit: 150, drift: {},
    steps: [
     { a: "eval", key: 1, why: { ar: "قيّم بأقل من 10 ثواني: بتردّ؟ عم تتنفّس؟ ← لا = Arrêt cardiaque (توقّف القلب).", fr: "Évaluer en moins de 10 s : répond ? respire ? → non = arrêt cardiaque." } },
     { a: "call", key: 1, after: ["eval"], ow: { ar: "تأكّد إنّو Arrêt (قيّم) بعدين اطلب المساعدة.", fr: "Confirme l'arrêt (évaluer), puis appelle à l'aide." }, why: { ar: "اطلب المساعدة والطبيب فوراً (Code bleu).", fr: "Appeler à l'aide et le médecin immédiatement." } },
     { a: "cpr", key: 1, after: ["eval"], set: { sys: 45, dia: 20, spo2: 60 }, why: { ar: "Massage cardiaque: 30 ضغطة / 2 نفس، 100–120 بالدقيقة، 5–6 سم بنص الصدر، والمريضة عشي صلب.", fr: "Massage : 30 compressions / 2 insufflations, 100–120/min, 5–6 cm, sur plan dur." } },
     { a: "vent", after: ["cpr"], ow: { ar: "الضغطات أوّل (30)، بعدين النفسين.", fr: "Compressions d'abord (30), puis 2 insufflations." }, eff: { spo2: 10 }, why: { ar: "2 insufflations بالـ Ambu بعد كل 30 ضغطة.", fr: "2 insufflations au BAVU toutes les 30 compressions." } },
     { a: "shock", key: 1, after: ["eval"], set: { rh: "sinus", fc: 88, sys: 92, dia: 58, spo2: 90, fr: 12, gcs: 6 }, why: { ar: "FV = rythme choquable (إيقاع بينصدم): صدمة وحدة، وبعدها رجّع عالـ massage فوراً.", fr: "FV = rythme choquable : un choc, puis reprendre le massage aussitôt." } },
     { a: "adre", key: 1, after: ["call", "cpr"], eff: { sys: 8 }, why: { ar: "Adrénaline (Épinéphrine) — «Arrêt cardiovasculaire» من استعمالاتها بدرس الأدوية.", fr: "Épinéphrine — indication « arrêt cardiovasculaire » (cours de pharmaco)." } }
    ],
    bad: [
     { a: ["pos_pls", "pos_semi", "pos_tete30", "pos_trend"], eff: {}, why: { ar: "مش وقت وضعيات — ما عم تتنفّس: Massage عشي صلب!", fr: "Pas le moment — elle ne respire pas : massage sur plan dur !" } },
     { a: "drink", eff: {}, why: { ar: "ما في وعي ولا تنفّس — ولا شي بالتمّ.", fr: "Inconsciente, ne respire pas — rien par la bouche." } }
    ],
    neutral: {},
    doc: { ar: "الطبيب: «Code bleu! كمّل Massage، صدمة عالـ FV، وعطي Adrénaline.»", fr: "Médecin : « Code bleu ! Continue le massage, choc sur la FV, adrénaline. »" },
    end: { ok: { ar: "رجع النبض (ROSC) 💓 — انتقلت عالعناية الفائقة 🎉", fr: "Retour du pouls (RACS) 💓 — transfert en réanimation 🎉" }, lost: { ar: "تأخّر الـ Massage — الدماغ ما بيتحمّل أكتر من دقايق بلا دم.", fr: "Massage trop tardif — le cerveau ne tient que quelques minutes sans sang." } } }
 ]
};
