/* 🔴 «حالة لايف» — the shared room (games.html#live). Two beds, two named patients, the walkable room of the 🏥 solo game
   (stations + paths from assets/erroom-data.js / erroom.js, which games.html loads first — nothing of the solo game is changed),
   hands (2 items), the bed menu (🩺 العناية · 📁 الملف · 📖 القصّة), the nurses' desk (📞 + 📁), a live activity feed «👤 فلان عمل: …»,
   the end record («📋 الخطوات الصح», mistakes, who helped) and «📚 الحالات السابقة». No help button, no ads. Engine: assets/livecase.js. */
(function (w, d) {
  var L = w.LiveCase, C = w.LiveCore; if (!L || !C || !d || !d.addEventListener) return;
  var E = w.ERROOM, R = w.ERRoom, AS = w.LiveAsst;
  var asst = null, offer = null, asBtn = null;   // 29p 🧑‍⚕️🚶 my own assistant (local only) · his «بدّك ساعدك؟» clock · the bubble's ايه / لأ
  var lastRank = "", ov = null, D = null, st = null, mode = "loading", cv, cx, dpr = 1, scale = 1, G = null, bg = null, raf = 0, last = 0, nurse = null, mark = null;
  var hands = [], washed = false, sheet = null, panel = null, fbT = 0, endSeen = false, openQ = null, prevSt = {};
  // 28y: 💡 open hint box (bed k) · the step a paid hint pointed at · the 📤 checklist · each bed has its own IV set (soluté + cathéter + tubulure) at the bed
  var hintOpen = null, hl = null, handOpen = null, BEDSIDE = { kit: 1 };
  var helpOpen = false, helpAsk = null, helpTxt = "", talkOpen = null;   // 29m 🧑‍⚕️ the helper bubble · the 📞/💡 it asked for · 💬 the question asked at a bed
  // 👥 the other students in the room (assets/livepres.js): their drawn position, path, sprite; the join/leave toast queue
  // 28z 🏥 the floor strip (all departments small, mine big above): its canvas, my walk between departments (trv), the ambulance, the sound
  var fcv = null, fcx = null, fsc = 1, fdpr = 1, trv = null, lastDep = "er", ambSeen = 0, ambAnim = null, snd = false, SNDK = "nursin_live_snd_v1", actx = null, pAll = [];
  var peers = {}, pList = [], pPrev = null, pQ = { join: [], left: [] }, pToastT = 0, pT = 0, avImg = {}, mySpr = null;
  var T = L.T, esc = L.esc, FR = L.FR;
  var U = {
    // 29e 🧼 🔄 🚪 👨‍👩‍👦 ⚠️ 🧪 the routines + the services
    rubBtn: { ar: "فرك اليدين (SHA)", fr: "Friction hydro-alcoolique" }, rubOn: { ar: "إيديك نضاف ✓", fr: "mains propres ✓" }, rubOff: { ar: "إيديك مش نضاف", fr: "mains à désinfecter" },
    rubGo: { ar: "🧴 عم تفرك إيديك بالـ SHA… (٢٠–٣٠ ثانية بالحقيقة)", fr: "🧴 Friction hydro-alcoolique… (20–30 s en vrai)" }, rubSink: { ar: "🚰 عم تغسل إيديك…", fr: "🚰 Lavage des mains…" },
    rubW: { ar: "كل الإيد: الكفّ، بين الأصابع، الإبهام، الأظافر والمعصم", fr: "Toute la main : paumes, entre les doigts, pouces, ongles, poignets" },
    rubBefore: { ar: "هلّق فيك تلمس المريض (قبل التماس ✓)", fr: "Tu peux toucher le patient (avant le contact ✓)" }, rubBeforeOk: { ar: "🧼 فركت إيديك قبل ما تلمس المريض", fr: "🧼 Mains désinfectées avant le contact" },
    rubAfter: { ar: "🧼 فركت إيديك بعد ما خلصت مع {n}", fr: "🧼 Mains désinfectées après {n}" }, rubWhy: { ar: "نظافة الإيدين قبل وبعد كل مريض = أهم شي ضدّ العدوى بالمستشفى", fr: "Hygiène des mains avant et après chaque patient = la 1re barrière contre les infections nosocomiales" },
    rubOther: { ar: "🧼 لمست {n} — افرك إيديك قبل ما تلمس {m}", fr: "🧼 Tu as touché {n} — désinfecte tes mains avant {m}" }, rubHow: { ar: "🧴 «فرك اليدين» بورقة التخت، أو 🚰 المغسلة", fr: "🧴 «Friction» dans la fiche du lit, ou 🚰 le lavabo" },
    routT: { ar: "🧼 روتين التمريض", fr: "🧼 Routines infirmières" },
    pkReady: { ar: "🧾 بـ {s}: الطلب تبع {n} قيد التحضير", fr: "🧾 {s} : la demande pour {n} est en cours" }, pkReadyW: { ar: "روح جيبو بإيدك (+20 ل.ن) — أو بيطلع لعندك بعد شوي", fr: "Va la chercher (+20 L.N) — sinon elle montera d'elle-même" },
    pkAuto: { ar: "🛵 وصل الطلب تبع {n} من {s} لعالقسم", fr: "🛵 La demande de {n} est arrivée de {s}" }, pkWait: { ar: "⏳ بعد {s} ث", fr: "⏳ encore {s} s" }, pkWaitW: { ar: "لسّا عم يحضّروه", fr: "En préparation" },
    pkGot: { ar: "📥 جبت الطلب تبع {n}", fr: "📥 Tu as récupéré la demande de {n}" }, pkGotW: { ar: "انحطّ بملفّو (🧾 بورقة التخت)", fr: "Ajouté à son dossier (🧾 dans la fiche du lit)" },
    pkTake: { ar: "جاهز — خدو", fr: "Prêt — récupérer" }, pkAt: { ar: "جاهز بـ {s} — روح جيبو", fr: "prêt à {s} — va le chercher" }, pkN: { ar: "🧾 {n} طلب جاهز", fr: "🧾 {n} demande(s) prête(s)" }, pkN0: { ar: "🧾 ما في طلبات هلّق", fr: "🧾 Aucune demande" },
    pkRule: { ar: "كل فحص أو صورة أو وصفة أو كيس دم بتطلبو عند التخت بيجهز هون: إذا جبتو بإيدك +20 ل.ن، وإذا ما إجيت بيطلع لعالقسم لحالو بعد ٣ دقايق.", fr: "Chaque examen, image, ordonnance ou poche demandée au lit est préparée ici : la chercher = +20 L.N ; sinon elle monte seule au bout de 3 min." },
    pkNone_lab: { ar: "ما في عيّنات منك هلّق — اسحب دم (🧪 Bilan / GDS) عند التخت", fr: "Aucun prélèvement de toi — fais un bilan / GDS au lit" }, pkNone_rad: { ar: "ما في صور مطلوبة منك هلّق", fr: "Aucune image demandée" },
    pkNone_ph: { ar: "ما في وصفات هلّق — بعد ما تتصل بالطبيب 📞 الوصفة بتجهز هون", fr: "Aucune ordonnance — après l'appel 📞 elle se prépare ici" }, pkNone_bb: { ar: "ما في أكياس دم مطلوبة — لما الطبيب يطلب نقل دم بيجهز هون", fr: "Aucune poche demandée" },
    radDone: { ar: "الصورة انعملت والطبيب عم يقراها", fr: "Cliché fait, lu par le médecin" }, bbDone: { ar: "كيس الدم جاهز بعد فحص التطابق (groupe + compatibilité) ✓", fr: "Poche prête après contrôle de compatibilité ✓" }, phDone: { ar: "أدوية الوصفة جاهزة ✓", fr: "Médicaments de l'ordonnance prêts ✓" },
    svcSub_lab: { ar: "🧪 هون بتجهز نتائج الفحوصات", fr: "🧪 Les résultats d'analyses se récupèrent ici" }, svcSub_rad: { ar: "🩻 هون بتنعمل الصور وبتجهز", fr: "🩻 Les images se font et se récupèrent ici" },
    svcSub_ph: { ar: "💊 هون بتجهز أدوية الوصفات", fr: "💊 Les ordonnances se préparent ici" }, svcSub_bb: { ar: "🩸 أكياس الدم بالبرّاد على +٤°", fr: "🩸 Poches de sang conservées à +4 °C" },
    svcSub_adm: { ar: "🛎️ كل مريض فات اليوم ووين صار", fr: "🛎️ Chaque patient admis aujourd'hui et où il en est" }, svcSub_ns: { ar: "🔄 التسليم بين الشفتات + ⏰ مواعيدك", fr: "🔄 Relève entre équipes + ⏰ tes rendez-vous" },
    svcSub_or: { ar: "🔪 غرفة العمليات — بتجي حالاتها قريباً 🔜", fr: "🔪 Bloc opératoire — ses cas arrivent bientôt 🔜" }, svcSub_sspi: { ar: "🛏️ الإنعاش بعد العملية (SSPI) — 🔜", fr: "🛏️ Salle de réveil (SSPI) — 🔜" },
    svcSub_psy: { ar: "🧠 الطب النفسي — بتجي حالاتو لما يصير في درس عنو 🔜", fr: "🧠 Psychiatrie — ses cas viendront avec une leçon 🔜" }, svcSub_ster: { ar: "🧺 التعقيم: العدّة بتتغسل، بتتعقّم بالـ Autoclave وبتتغلّف قبل ما ترجع عالأقسام", fr: "🧺 Stérilisation : lavage, autoclave, emballage avant retour dans les services" },
    svcSub_cln: { ar: "🧹 التنظيف: الشراشف النضاف والوسخين ما بيختلطو أبداً", fr: "🧹 Entretien : linge propre et sale ne se croisent jamais" }, svcSub_arch: { ar: "🗄️ ملفّات المرضى", fr: "🗄️ Dossiers des patients" }, svcSub_stf: { ar: "☕ لوح الإعلانات والرواتب", fr: "☕ Tableau d'affichage et salaires" },
    admWait: { ar: "ناطر", fr: "en attente" }, admNone: { ar: "لسّا ما فات حدا اليوم", fr: "Personne d'admis aujourd'hui" },
    hoWhat: { ar: "🔄 التسليم (Transmissions): قبل ما تفلّ، خبّر الشفت الجاية عن مرضى الطابق — ٣ أسئلة، مرّة بكل شفت", fr: "🔄 Relève : avant de partir, transmets les patients de l'étage — 3 questions, une fois par équipe" },
    hoNone: { ar: "ما في مرضى بالتخوت بهالطابق هلّق — فوّت مرضى من 🪑 الانتظار أوّل", fr: "Aucun patient dans les lits de cet étage — fais entrer des patients d'abord" },
    hoQ_motif: { ar: "شو مشكلة {n} ({d})؟", fr: "Quel est le problème de {n} ({d}) ?" }, hoQ_surv: { ar: "شو لازم الشفت الجاية تراقب عند {n}؟", fr: "Que doit surveiller l'équipe suivante chez {n} ?" }, hoQ_st: { ar: "كيف وضع {n} هلّق؟", fr: "Comment va {n} maintenant ?" },
    hoSend: { ar: "📤 سلّم الشفت ({n}/3)", fr: "📤 Faire la relève ({n}/3)" }, hoOk: { ar: "🔄 سلّمت الشفت: {n}/3 صح", fr: "🔄 Relève faite : {n}/3 juste" }, hoWhy: { ar: "تسليم واضح = استمرارية العناية وسلامة المريض", fr: "Une relève claire = continuité des soins et sécurité" },
    hoDone: { ar: "✅ سلّمت هالشفت ({n}/3)", fr: "✅ Relève faite pour cette équipe ({n}/3)" }, hoNext: { ar: "الشفتات: ٧ الصبح · ٣ الضهر · ١١ بالليل", fr: "Équipes : 7 h · 15 h · 23 h" }, hoBoard: { ar: "📋 {n} مريض بتخوت هالطابق", fr: "📋 {n} patient(s) dans les lits" },
    dcBtn: { ar: "خروج + تثقيف (Sortie)", fr: "Sortie + éducation" }, dcT: { ar: "خروج {n}", fr: "Sortie de {n}" }, dcHow: { ar: "اختار شو بتقلّو قبل ما يروح عالبيت (التثقيف) — الصح بس", fr: "Choisis ce que tu lui dis avant le retour à domicile — seulement le juste" },
    dcGo: { ar: "🚪 خلّص الخروج", fr: "🚪 Valider la sortie" }, dcNone: { ar: "اختار شي تقلّو قبل ما يطلع", fr: "Choisis d'abord quoi lui dire" }, dcOk: { ar: "🚪 {n} طلع عالبيت — التخت فضي", fr: "🚪 {n} rentre chez lui — lit libéré" },
    dcMiss: { ar: "نقص: {m} · غلط: {b}", fr: "Manquait : {m} · erreurs : {b}" }, dcAll: { ar: "تثقيف كامل 👏", fr: "Éducation complète 👏" }, dcDone: { ar: "✅ {n} طلع عالبيت", fr: "✅ {n} est sorti" },
    dcGone: { ar: "🛏️ تخت نضيف وفاضي", fr: "🛏️ Lit propre et libre" }, dcHome: { ar: "طلع", fr: "sorti" }, dcGoneT: { ar: "🚪 {n} طلع عالبيت", fr: "🚪 {n} est rentré chez lui" }, dcGoneW: { ar: "التخت فاضي لمريض جديد", fr: "Lit libre pour un nouveau patient" },
    genInfo: { ar: "معلومات عامة — مش من دروسك", fr: "Notions générales — pas dans tes cours" },
    famBtn: { ar: "زيارة العيلة: عندن سؤال", fr: "Visite de la famille : une question" }, famOf: { ar: "تبع {n}", fr: "de {n}" }, famOk: { ar: "👨‍👩‍👦 جاوبت العيلة صح", fr: "👨‍👩‍👦 Bonne réponse à la famille" }, famNo: { ar: "👨‍👩‍👦 مش هيك…", fr: "👨‍👩‍👦 Pas tout à fait…" },
    incBtn: { ar: "عبّي تقرير الحادث (Fiche d'événement indésirable)", fr: "Remplir la fiche d'événement indésirable" }, incT: { ar: "تقرير حادث — Fiche d'événement indésirable", fr: "Fiche d'événement indésirable" },
    incWhat: { ar: "صار غلط ضرّ المريض. التبليغ مش عقاب: هو لنتعلّم ونحسّن الجودة وسلامة المريض.", fr: "Une erreur a nui au patient. Déclarer n'est pas une punition : c'est pour apprendre et améliorer la qualité et la sécurité." },
    incFact: { ar: "شو صار + الساعة", fr: "Ce qui s'est passé + l'heure" }, incSend: { ar: "📤 بعت التقرير", fr: "📤 Envoyer la fiche" }, incRetry: { ar: "🔁 عيد الأسئلة", fr: "🔁 Recommencer" }, incAgain: { ar: "لازم ٢ من ٣ صح — جرّب كمان مرّة", fr: "Il faut 2 sur 3 — réessaie" },
    incOk: { ar: "⚠️ بعتت تقرير الحادث", fr: "⚠️ Fiche envoyée" }, incWhy: { ar: "التبليغ عن الحادث = إدارة المخاطر وسلامة المريض (درس الجودة)", fr: "Déclarer = gestion des risques et sécurité du patient (cours qualité)" }, incDone: { ar: "✅ التقرير انبعت", fr: "✅ Fiche envoyée" },
    incSrc: { ar: "من دروسك: الجودة (إدارة المخاطر وسلامة المريض، الملف الطبي) + القانون", fr: "Tes cours : qualité (gestion des risques, dossier médical) + législation" },
    incAsk: { ar: "⚠️ صار أذى للمريض — عبّي تقرير الحادث بورقة التخت (+30 ل.ن)", fr: "⚠️ Acte dangereux — remplis la fiche d'événement indésirable (+30 L.N)" }, incAskW: { ar: "الزر ⚠️ تحت «🧼 روتين التمريض»", fr: "Le bouton ⚠️ sous «🧼 Routines»" },
    title: { ar: "🔴 حالة لايف", fr: "🔴 Cas en direct" }, close: { ar: "سكّر", fr: "Fermer" },
    // 28z 🏥 the hospital floor
    hosp: { ar: "🏥 المستشفى", fr: "🏥 L'hôpital" }, here: { ar: "📍 إنت هون", fr: "📍 Tu es ici" }, corr: { ar: "الممرّ", fr: "Couloir" },
    entr: { ar: "🚪 مدخل الطوارئ", fr: "🚪 Entrée des urgences" }, bayEmpty: { ar: "🛏️ سرير الإسعاف فاضي", fr: "🛏️ Lit d'ambulance libre" },
    noAmb: { ar: "🚑 ما في إسعاف هلّق", fr: "🚑 Pas d'ambulance pour l'instant" }, noAmb2: { ar: "الإسعاف بتوصل فجأة بأي وقت بالنهار — بتسمع الصفّارة 🚨", fr: "Elles arrivent à l'improviste dans la journée — tu entendras la sirène 🚨" },
    walk: { ar: "🚶 رايح عَ {d}…", fr: "🚶 Vers {d}…" }, inDep: { ar: "إنت بـ {d}", fr: "Tu es en {d}" },
    sirenT: { ar: "🚑 وصلت إسعاف! مريض جديد بالطوارئ", fr: "🚑 Une ambulance arrive ! Nouveau patient aux urgences" }, sirenGo: { ar: "🏃 روح استقبلو", fr: "🏃 J'y vais" },
    ambDone: { ar: "🚑 خلصت حالة الإسعاف — الجاية بتوصل فجأة", fr: "🚑 Cas de l'ambulance terminé — la prochaine arrive à l'improviste" },
    bed2Empty: { ar: "🛏️ هالتخت فاضي — مريض الإسعاف عالتخت ①", fr: "🛏️ Lit vide — le patient de l'ambulance est au lit ①" },
    sndOn: { ar: "🔊 صوت القسم", fr: "🔊 Son du service" }, sndOff: { ar: "🔇 بلا صوت", fr: "🔇 Sans son" },
    welcome: { ar: "أهلا وسهلا بـ{d}", fr: "Bienvenue en {d}" },
    preview: { ar: "👀 تجربة على جهازك — سجّل دخول لتشتغل مع كل الطلاب", fr: "👀 Essai sur ton appareil — connecte-toi pour jouer avec tout le monde" },
    soon: { ar: "🔴 الحالة اللايف رح تشتغل قريباً — هلّق عم تجرّبها لحالك (ما بتنحفظ للكل)", fr: "🔴 Le cas partagé arrive bientôt — tu l'essaies seul pour l'instant" },
    net: { ar: "📶 ما في اتصال — عم تشتغل على جهازك", fr: "📶 Hors ligne — sur ton appareil" },
    shared: { ar: "🟢 مباشر مع كل الطلاب", fr: "🟢 En direct avec tous les étudiants" },
    hands: { ar: "✋ إيديك", fr: "✋ Mains" }, empty: { ar: "فاضي", fr: "vide" },
    care: { ar: "🩺 العناية", fr: "🩺 Soins" }, file: { ar: "📁 الملف", fr: "📁 Dossier" }, story: { ar: "📖 القصّة", fr: "📖 Histoire" },
    phase: { ar: "المرحلة هلّق", fr: "Étape en cours" },
    ph1: { ar: "① الاستقبال (Accueil)", fr: "① Accueil" }, ph2: { ar: "② التقييم وملف الدخول (Évaluation + dossier)", fr: "② Évaluation + dossier d'admission" },
    ph3: { ar: "③ العناية (Soins)", fr: "③ Soins" }, ph4: { ar: "④ المراقبة (Surveillance)", fr: "④ Surveillance" }, ph5: { ar: "⑤ التسليم (Transmissions)", fr: "⑤ Transmissions" }, ph6: { ar: "✅ خلص كل شي", fr: "✅ Tout est fait" },
    eval: { ar: "🔎 تقييم", fr: "🔎 Évaluer" }, pos: { ar: "🧍 وضعية", fr: "🧍 Position" }, soin: { ar: "🩺 عناية", fr: "🩺 Soins" }, rx: { ar: "💊 أدوية (بوصفة)", fr: "💊 Médicaments (prescription)" },
    take: { ar: "خود", fr: "Prendre" }, have: { ar: "✋ معك", fr: "✋ En main" }, full: { ar: "إيديك مليانين (٢) — كبّس على غرض تحت لترجّعو", fr: "Mains pleines (2) — touche un objet en bas pour le reposer" },
    needItem: { ar: "بدّك تجيب {i} أوّل — من {s}", fr: "Il te faut d'abord {i} — à prendre : {s}" },
    needCall: { ar: "دوا بوصفة: اتصل بالطبيب عن هالمريض أوّل 📞", fr: "Sur prescription : appelle d'abord le médecin pour ce patient 📞" },
    needVvp: { ar: "حطّ VVP (خط وريدي) أوّل 💉", fr: "Pose d'abord une VVP 💉" },
    wash: { ar: "🧼 اغسل إيديك أوّل قبل ما تلمس المريض (المغسلة 🚰)", fr: "🧼 Lave-toi d'abord les mains (lavabo 🚰)" },
    washed: { ar: "🧼 إيدين نضاف — يلّا عالمريض", fr: "🧼 Mains propres — au patient" },
    callFor: { ar: "📞 اتصل بالطبيب عن:", fr: "📞 Appeler le médecin pour :" }, fileOf: { ar: "📁 ملف المريض:", fr: "📁 Dossier de :" },
    fill: { ar: "✍️ عبّي", fr: "✍️ Remplir" }, by: { ar: "✍️", fr: "✍️" }, notYet: { ar: "لسّا ما انعبّت", fr: "Pas encore rempli" },
    ok: { ar: "✅ صح!", fr: "✅ Juste !" }, bad: { ar: "❌ غلط وخطر!", fr: "❌ Faux et dangereux !" }, ord: { ar: "⚠️ مش هلّق", fr: "⚠️ Pas maintenant" },
    neu: { ar: "🤔 مش لازم لهالمريض هلّق", fr: "🤔 Pas utile pour ce patient maintenant" }, no: { ar: "❌ مش هيدا", fr: "❌ Ce n'est pas ça" },
    neuWhy: { ar: "فكّر شو بيحتاج هالمريض هلّق — اقرا القصّة والملف.", fr: "Réfléchis à ce dont CE patient a besoin — relis l'histoire et le dossier." },
    repeat: { ar: "⚡ {n} سبقك وعملها!", fr: "⚡ {n} l'a déjà fait !" }, repeat0: { ar: "✔️ معمولة من قبل", fr: "✔️ Déjà fait" },
    ppl: { ar: "👥 {n} بالغرفة هلّق", fr: "👥 {n} dans la salle" }, ppl1: { ar: "👥 إنت لحالك بالغرفة هلّق", fr: "👥 Tu es seul·e dans la salle" },
    pin: { ar: "👋 {n} فات", fr: "👋 {n} est entré·e" }, pinN: { ar: "👋 {n} فاتوا", fr: "👋 {n} sont entrés" },
    pout: { ar: "🚪 {n} طلع", fr: "🚪 {n} est sorti·e" }, poutN: { ar: "🚪 {n} طلعوا", fr: "🚪 {n} sont sortis" },
    pbed: { ar: "✋ {n} عم يشتغل عهالتخت هلّق — شوف شو بقي قبل ما تكبس", fr: "✋ {n} s'occupe de ce lit — vérifie ce qui reste avant d'agir" },
    pme: { ar: "إنت", fr: "Toi" },
    wait: { ar: "⏳ استنّى {t} قبل ما تجرّب هالخانة مرّة تانية", fr: "⏳ Attends {t} avant de réessayer ce champ" },
    slow: { ar: "شوي شوي 🙂 جرّب كمان ثانية", fr: "Doucement 🙂 réessaie dans une seconde" },
    saving: { ar: "⏳ عم تنحفظ…", fr: "⏳ Enregistrement…" },
    lockF: { ar: "🔒 الملف بيفتح بعد:", fr: "🔒 Le dossier s'ouvre après :" }, lockOne: { ar: "🔒 بعد:", fr: "🔒 Après :" },
    lockGo: { ar: "🩺 روح عالعناية", fr: "🩺 Aller aux soins" }, start: { ar: "① ابدأ هون", fr: "① Commence ici" }, over: { ar: "الحالة خلصت", fr: "Le cas est terminé" },
    err: { ar: "📶 ما انحفظت — جرّب كمان مرّة", fr: "📶 Pas enregistré — réessaie" }, full2: { ar: "الحالة تعبّت خطوات", fr: "Trop d'actions aujourd'hui" },
    before: { ar: "قبلها لازم:", fr: "Avant, il faut :" }, finishPh: { ar: "خلّصو {p} أوّل", fr: "Terminez d'abord {p}" },
    feed: { ar: "👥 شو صار", fr: "👥 Activité" }, did: { ar: "عمل", fr: "a fait" }, nobody: { ar: "لسّا ما حدا بلّش — كون الأوّل! 💪", fr: "Personne n'a commencé — sois le premier ! 💪" },
    board: { ar: "🏆 نقاط هالحالة", fr: "🏆 Points de ce cas" }, mine: { ar: "نقاطك", fr: "Tes points" },
    endOk: { ar: "✅ برافو للفريق! المريضين صارو مستقرّين", fr: "✅ Bravo l'équipe ! Les deux patients sont stables" },
    endLost: { ar: "💔 خسرنا {n}", fr: "💔 Nous avons perdu {n}" },
    ended: { ar: "🏁 انتهت الحالة", fr: "🏁 Cas terminé" },
    openGo: { ar: "🏥 المستشفى مفتوح · 🪑 مرضى جداد ({n})", fr: "🏥 L'hôpital reste ouvert · 🪑 nouveaux patients ({n})" },
    // 28x: each patient ends on his own; the other one keeps going
    pOk: { ar: "✅ {n} استقرّ — برافو للفريق 👏", fr: "✅ {n} est stabilisé·e — bravo l'équipe 👏" }, pLost: { ar: "💔 خسرنا {n}", fr: "💔 Nous avons perdu {n}" },
    pGoOn: { ar: "🛏️ {n} بعدو بحاجة إلكن — كمّلو معو هلّق", fr: "🛏️ {n} a encore besoin de vous — continuez avec lui/elle" },
    pDone: { ar: "🏁 خلصت حالتو", fr: "🏁 Terminé" }, pOkF: { ar: "✅ {n} استقرّت — برافو للفريق 👏", fr: "✅ {n} est stabilisée — bravo l'équipe 👏" },
    pGoOnF: { ar: "🛏️ {n} بعدا بحاجة إلكن — كمّلو معا هلّق", fr: "🛏️ {n} a encore besoin de vous — continuez avec elle" }, pDoneF: { ar: "🏁 خلصت حالتا", fr: "🏁 Terminé" },
    pOverF: { ar: "🏁 {n} خلصت حالتا — ما في شي ينعمل هون", fr: "🏁 {n} : terminé — plus rien à faire ici" }, pGo: { ar: "🛏️ روح عند {n}", fr: "🛏️ Aller voir {n}" },
    pOver: { ar: "🏁 {n} خلصت حالتو — ما في شي ينعمل هون", fr: "🏁 {n} : terminé — plus rien à faire ici" },
    pRec: { ar: "📋 الخطوات الصح لـ {n}", fr: "📋 Les bonnes étapes de {n}" },
    endMix: { ar: "✅ {a} صار مستقرّ · 💔 خسرنا {b}", fr: "✅ {a} stabilisé·e · 💔 nous avons perdu {b}" }, endMixF: { ar: "✅ {a} صارت مستقرّة · 💔 خسرنا {b}", fr: "✅ {a} stabilisée · 💔 nous avons perdu {b}" },
    endLost2: { ar: "💔 خسرنا {a} و{b}", fr: "💔 Nous avons perdu {a} et {b}" }, nextIn: { ar: "⏳ الحالة الجاية بعد", fr: "⏳ Prochain cas dans" },
    endNobody: { ar: "🏁 الحالة خلصت — شوف 📋 الخطوات الصح", fr: "🏁 Cas terminé — vois 📋 les bonnes étapes" },
    seeSteps: { ar: "📋 الخطوات الصح", fr: "📋 Bonnes étapes" },
    myLog: { ar: "📒 سجل حالاتي", fr: "📒 Mon carnet de cas" }, logged: { ar: "📒 {n} انحفظ بسجلّك", fr: "📒 {n} : ajouté à ton carnet" }, loggedW: { ar: "الخطوات الصح وخطواتك إنت — كبّس 📒 فوق", fr: "Les bonnes étapes et les tiennes — touche 📒 en haut" },
    retry: { ar: "⏳ الحالة عم تتحضّر — جرّب كمان شوي", fr: "⏳ Le cas se prépare — réessaie dans un instant" },
    denied: { ar: "🔒 ما انحفظت خطوتك — السيرفر رفضها", fr: "🔒 Action refusée par le serveur" },
    deniedWhy: { ar: "جرّب كمان شوي. إذا ضلّت هيك سكّر الغرفة وارجع فوت.", fr: "Réessaie dans un moment ; sinon ferme la salle et reviens." },
    offline: { ar: "📶 ما في إنترنت — ما انحفظت خطوتك", fr: "📶 Pas de connexion — action non enregistrée" },
    errWhy: { ar: "تأكّد من الإنترنت وجرّب كمان مرّة.", fr: "Vérifie ta connexion et réessaie." },
    pushErr: { ar: "⚠️ ما قدرت غيّر الإشعارات — جرّب كمان مرّة", fr: "⚠️ Impossible de changer les alertes — réessaie" }, endTime: { ar: "⏰ خلص وقت الحالة", fr: "⏰ Le temps du cas est écoulé" },
    nextCase: { ar: "حالة جديدة بكرا الساعة 12 بالليل 🌙", fr: "Nouveau cas demain à minuit 🌙" },
    steps: { ar: "📋 الخطوات الصح بالترتيب", fr: "📋 Les bonnes étapes, dans l'ordre" }, wrongs: { ar: "❌ شو انعمل غلط", fr: "❌ Ce qui a été fait de travers" },
    helped: { ar: "🏆 مين ساهم", fr: "🏆 Qui a aidé" }, noWrong: { ar: "ولا غلطة 👏", fr: "Aucune erreur 👏" }, missed: { ar: "ما انعملت", fr: "Non fait" },
    archive: { ar: "📚 الحالات السابقة", fr: "📚 Cas précédents" }, noArch: { ar: "لسّا ما في حالات سابقة — أوّل وحدة بتنحفظ بكرا", fr: "Pas encore de cas précédent — le premier sera enregistré demain" },
    archLocal: { ar: "(يلّي جرّبتا على هالجهاز)", fr: "(ceux joués sur cet appareil)" },
    back: { ar: "→ رجوع", fr: "← Retour" }, seeEnd: { ar: "📋 شوف الخطوات الصح", fr: "📋 Voir les bonnes étapes" },
    push: { ar: "🔔 إشعارات الحالة", fr: "🔔 Alertes du cas" }, pushOn: { ar: "🔔 الإشعارات شغّالة (حالة جديدة + تدهور/تحسّن، مش أكتر من مرّة بالساعة)", fr: "🔔 Alertes actives (nouveau cas + aggravation/amélioration, max 1 par heure)" },
    pushOff: { ar: "🔕 الإشعارات موقّفة", fr: "🔕 Alertes coupées" }, sign: { ar: "سجّل دخول بغوغل لتشارك ✨", fr: "Connecte-toi avec Google pour participer ✨" },
    gen: { ar: "🌐 معلومات عامة", fr: "🌐 Notions générales" }, mon0: { ar: "📟 ركّبو المونيتور لتبيّن الأرقام", fr: "📟 Posez le monitorage pour voir les chiffres" },
    gcsQ: { ar: "شو بيعمل المريض؟", fr: "Ce que fait le patient :" }, ageY: { ar: "سنة", fr: "ans" },
    // 28y (Abdullah, Nov 3 5:05 PM): every closed button says why · 📞 again · each bed its own IV · 🩻 the curtain · 💡 «طرف خيط» · 📤 what is still missing
    must: { ar: "✋ لازم أوّل:", fr: "✋ D'abord :" }, after1: { ar: "🔒 بعد:", fr: "🔒 Après :" },
    mWash: { ar: "🧼 تغسل إيديك (🚰 المغسلة)", fr: "🧼 te laver les mains (🚰 lavabo)" },
    mItem: { ar: "تجيب {i} — من {s}", fr: "prendre {i} — {s}" }, mCall: { ar: "📞 تتصل بالطبيب عن هالمريض (التلفون عند المكتب)", fr: "📞 appeler le médecin pour ce patient (téléphone du bureau)" },
    mVvp: { ar: "💉 تحطّ VVP (خط وريدي)", fr: "💉 poser une VVP" },
    phNow: { ar: "هلّق وقت {p}", fr: "Maintenant : {p}" }, hintTip: { ar: "💡 إذا علقت: «طرف خيط» فوق بالتخت", fr: "💡 Bloqué ? « Indice » en haut de la fiche du lit" },
    safe: { ar: "👍 ما بيضرّ — بس مش هيدا يلّي ناقص هلّق (0)", fr: "👍 Sans danger — mais ce n'est pas ce qui manque (0)" },
    early: { ar: "👍 منطقي — بس بلّش بـ ① 🤝 الاستقبال (0)", fr: "👍 Logique — mais commence par ① 🤝 l'accueil (0)" },
    leg: { ar: "✋🛒 = جيب الغرض أوّل من محلّو · 📞? = بدّو وصفة الطبيب · 🧴 = عند التخت · كل زر بيقلّك ليش إذا مسكّر", fr: "✋🛒 = prends l'objet d'abord · 📞? = prescription du médecin d'abord · 🧴 = au lit · chaque bouton dit pourquoi s'il est fermé" },
    bedKit: { ar: "🧴 مصل التخت", fr: "🧴 au lit" }, callQ: { ar: "📞?", fr: "📞?" },
    privacy: { ar: "🛡️ الخصوصية", fr: "🛡️ Intimité" }, scrOn: { ar: "🩻 الستارة مسكّرة", fr: "🩻 Paravent tiré" },
    scrTip: { ar: "💡 الأحسن تسكّر الستارة 🩻 قبل هيك إجراء (pudeur)", fr: "💡 Mieux : tirer le paravent 🩻 avant ce geste (pudeur)" },
    hint: { ar: "💡 طرف خيط", fr: "💡 Indice" }, hintH: { ar: "💡 طرف خيط — {n}", fr: "💡 Indice — {n}" },
    hintMore: { ar: "🎯 دلّني عالخطوة بالزبط (−1) · باقيلك {l}/{m}", fr: "🎯 Montre-moi l'étape exacte (−1) · reste {l}/{m}" },
    hintNo: { ar: "🎯 خلصو تلميحاتك الـ {m} لهالمريض — طرف الخيط فوق بعدو مجاني", fr: "🎯 Tes {m} indices pour ce patient sont utilisés — l'indice du haut reste gratuit" },
    hintNone: { ar: "ما في شي ناقص هلّق 👌", fr: "Rien ne manque maintenant 👌" },
    hintGot: { ar: "🎯 الخطوة:", fr: "🎯 L'étape :" }, hintGo: { ar: "📞 روح عالتلفون", fr: "📞 Aller au téléphone" },
    left0: { ar: "📋 لسّا ناقص:", fr: "📋 Il manque encore :" },
    cAcc: { ar: "🤝 في شي بينعمل أوّل ما يوصل أي مريض", fr: "🤝 Il y a une chose à faire dès qu'un patient arrive" },
    cFile: { ar: "📁 في خانة بملف الدخول لسّا فاضية — القصّة فيها الجواب", fr: "📁 Un champ du dossier est encore vide — l'histoire contient la réponse" },
    cMon: { ar: "📟 بدّك تعرف أرقامو (الضغط، النبض…) قبل ما تقرّر", fr: "📟 Il te faut ses chiffres (TA, pouls…) avant de décider" },
    cEval: { ar: "🔎 في شي لازم تقيسو أو تفحصو عند {n}", fr: "🔎 Il y a quelque chose à mesurer ou examiner chez {n}" },
    cPos: { ar: "🧍 فكّر بوضعيّتو بالتخت — شو بيريّحو أو بيحميه؟", fr: "🧍 Pense à sa position au lit — qu'est-ce qui le soulage ou le protège ?" },
    cSoin: { ar: "🩺 في عناية أو إجراء لسّا ناقص لـ {n}", fr: "🩺 Un soin ou un geste manque encore pour {n}" },
    cRx: { ar: "💊 في دوا بوصفة لازم ياخدو", fr: "💊 Un médicament prescrit doit être donné" },
    cCall: { ar: "📞 في حدا لازم يعرف عن حالتو هلّق", fr: "📞 Quelqu'un doit être mis au courant maintenant" },
    wEval: { ar: "📖 تذكّر سوابقو: {t}", fr: "📖 Rappelle-toi ses antécédents : {t}" }, wPos: { ar: "🫁 شوف تنفّسو ووعيو (FR، SpO₂، Glasgow)", fr: "🫁 Regarde sa respiration et sa conscience (FR, SpO₂, Glasgow)" },
    wSoin: { ar: "📖 شو مشكلتو الأساسية؟ شو الخطر عليه؟", fr: "📖 Quel est son problème principal ? Quel est le risque ?" },
    wRx: { ar: "📞 الوصفة بتجي من الطبيب", fr: "📞 La prescription vient du médecin" }, wCall: { ar: "☎️ التلفون عند مكتب الممرّضين", fr: "☎️ Le téléphone est au bureau infirmier" },
    wItem: { ar: "🛒 بدّك غرض من: {s}", fr: "🛒 Il te faut un objet : {s}" },
    gFile: { ar: "📁 الملف", fr: "📁 Dossier" }, nF: { ar: "{c} خانات", fr: "{c} champs" }, nF1: { ar: "خانة وحدة", fr: "1 champ" },
    gMon: { ar: "📟 الأرقام", fr: "📟 Constantes" }, gCare: { ar: "🩺 العناية: {c}", fr: "🩺 Soins : {c}" }, gCall: { ar: "📞 الطبيب", fr: "📞 Médecin" },
    hand: { ar: "📤 سلّم (Transmissions)", fr: "📤 Transmettre (transmissions)" },
    handNo: { ar: "📤 قبل ما تسلّم {n}، لسّا ناقص:", fr: "📤 Avant de transmettre {n}, il manque :" },
    doc: { ar: "👨‍⚕️ الطبيب:", fr: "👨‍⚕️ Le médecin :" }, docRx: { ar: "📝 الوصفة: {r}", fr: "📝 Prescription : {r}" },
    docOk: { ar: "«ميرسي عالمعلومات. كمّلو العناية وراقبوه، وخبّروني إذا تغيّر شي.»", fr: "« Merci. Continuez les soins, surveillez, et rappelez-moi si ça change. »" },
    docNew: { ar: "«ميرسي عالجديد ({w}).»", fr: "« Merci pour la nouvelle ({w}). »" }, docCrit: { ar: "«🚨 جايي هلّق — ضلّو حدّو.»", fr: "« 🚨 J'arrive — restez près de lui. »" },
    docNeed: { ar: "«قبل ما قلّك شو تعطو، بدّي: {m}»", fr: "« Avant de prescrire, il me faut : {m} »" },
    // 29m 🧑‍⚕️ the helper nurse · 💬 talk to the patient · 📞 an unstable patient's doctor gives an order
    docGo: { ar: "«🚨 مش وقت ننطر — هلّق: {o}، وخبّرني دغري بالأرقام.»", fr: "« 🚨 On n'attend pas — tout de suite : {o}, et rappelle-moi avec les constantes. »" },
    asNm: { ar: "مساعد", fr: "Aide" }, asQ: { ar: "بدّك ساعدك؟", fr: "Je t'aide ?" }, asY: { ar: "ايه", fr: "Oui" }, asN: { ar: "لأ", fr: "Non" },   // 29p
    hlp: { ar: "🧑‍⚕️ الممرض المساعد", fr: "🧑‍⚕️ L'infirmier aide" }, hlpAsk: { ar: "❓ شو بعمل؟", fr: "❓ Je fais quoi ?" },
    hlpIntro: { ar: "اسألني «شو بعمل؟» وبقلّك الخطوة الجاية — خطوة وحدة كل مرّة (−1 نقطة، {m} لكل مريض).", fr: "Demande-moi « Je fais quoi ? » : je te dis l'étape suivante, une à la fois (−1 point, {m} par patient)." },
    hlpCost: { ar: "−1 · باقي {l}/{m} لـ{n}", fr: "−1 · reste {l}/{m} pour {n}" },
    hlpItem: { ar: "روح جيب {i} من {s}، وبعدين {a} لـ{n}.", fr: "Va chercher {i} ({s}), puis {a} pour {n}." },
    hlpCall: { ar: "📞 اتصل بالدكتور عن {n} (من {s}) — {w}", fr: "📞 Appelle le médecin pour {n} ({s}) — {w}" },
    hlpCallW: { ar: "خبّرو بالأرقام وخود الوصفة", fr: "donne les constantes et prends la prescription" },
    hlpFile: { ar: "📝 عبّي «{f}» بملف {n}.", fr: "📝 Remplis « {f} » au dossier de {n}." },
    hlpAct: { ar: "👉 {a} لـ{n}.", fr: "👉 {a} pour {n}." },
    hlpWait: { ar: "🪑 {n} بعدو بالانتظار — روح عـ 🪑 الانتظار والفرز وفوّتو عالتخت.", fr: "🪑 {n} est encore en salle d'attente — va au 🪑 tri et fais-le entrer." },
    hlpNone: { ar: "✅ كلّو ماشي مع {n} — راقبو وناطر الجديد.", fr: "✅ Tout est fait pour {n} — surveille-le." },
    hlpMax: { ar: "خلصو مساعداتي لـ{n} ({m}/{m}) — جرّب لحالك 💪 أو «💬 احكي مع المريض».", fr: "Plus d'aide pour {n} ({m}/{m}) — essaie seul 💪 ou « 💬 Parler au patient »." },
    hlpFree: { ar: "🏥 ما في مريض مفتوح هون هلّق.", fr: "🏥 Aucun patient en cours ici." },
    hlpSvc: { ar: "هون ما في مرضى. روح لعند مريضك بالقسم واسألني هونيك.", fr: "Pas de patient ici. Va voir ton patient dans le service et redemande-moi là-bas." },
    talk: { ar: "💬 احكي مع المريض", fr: "💬 Parler au patient" },
    tq_pain: { ar: "وين الوجع؟", fr: "Où avez-vous mal ?" }, tq_since: { ar: "من إيمتى؟", fr: "Depuis quand ?" }, tq_meds: { ar: "شو أدويتك؟", fr: "Vos médicaments ?" },
    tq_all: { ar: "عندك حساسية؟", fr: "Des allergies ?" }, tq_ant: { ar: "سوابق مرضية؟", fr: "Des antécédents ?" },
    tUnk: { ar: "ما بعرف بالزبط… شوف الملف أو اسأل العيلة", fr: "Je ne sais pas trop… voyez le dossier ou la famille" },
    tFam: { ar: "😶 ما عم يردّ (GCS = مقياس الوعي: {g}) — العيلة بتجاوب:", fr: "😶 Il ne répond pas (GCS {g}) — la famille répond :" },
    docAgain: { ar: "📞 اتصل كمان", fr: "📞 Rappeler" }, called: { ar: "📞 {c}×", fr: "📞 {c}×" },
    calls0: { ar: "كل مرّة في شي جديد (أرقام، فحص، تغيير) اتصل كمان — بلا جديد: −1", fr: "Rappelle à chaque nouveauté (constantes, examen, changement) — sans nouveauté : −1" },
    // 29d 🛗 floors + 🪑 the waiting room / 🏷️ triage + 💵 salary (Abdullah, Nov 4 7:01–7:20 AM)
    elev: { ar: "🛗 المصعد", fr: "🛗 Ascenseur" }, elevW: { ar: "كبّس عغرفة بهالطابق لتروح عليها — الممرّض بيطلع بالمصعد", fr: "Touche une salle de cet étage pour y aller — l'infirmier prend l'ascenseur" },
    ride: { ar: "🛗 بالمصعد لـ {f}…", fr: "🛗 Ascenseur vers {f}…" },
    soonT: { ar: "🚧 قريباً", fr: "🚧 Bientôt" }, soonD: { ar: "🚧 {d} عم يتجهّز", fr: "🚧 {d} : en préparation" },
    soonW: { ar: "حالاتو جايين بالتحديث الجاي — هلّق في: 🚑 الطوارئ · 🫀 القلب · 🧠 الأعصاب · 🪑 الانتظار · 💰 المحاسبة", fr: "Ses cas arrivent à la prochaine mise à jour — ouverts : 🚑 urgences · 🫀 cardio · 🧠 neuro · 🪑 accueil · 💰 comptabilité" },
    waitN: { ar: "🪑 {n} ناطرين بالانتظار", fr: "🪑 {n} en salle d'attente" }, waitBed: { ar: "🪑 بالانتظار", fr: "🪑 En attente" },
    waitBedT: { ar: "🪑 {n} لسّا بغرفة الانتظار", fr: "🪑 {n} est encore en salle d'attente" },
    waitBedW: { ar: "التخت فاضي: المرضى ما بيفوتو لحالهن. روح عـ 🪑 الانتظار والفرز (الطابق الأرضي)، قيّمو وفوّتو عالقسم الصح — وهوّي ناطر حالتو عم تتراجع.", fr: "Lit vide : les patients n'entrent pas seuls. Va en 🪑 accueil et tri (rez-de-chaussée), évalue-le et fais-le entrer dans le bon service — en attendant, son état se dégrade." },
    goWait: { ar: "🚶 روح عالانتظار", fr: "🚶 Aller à l'accueil" },
    triT: { ar: "🏷️ فرز (Triage)", fr: "🏷️ Tri (triage)" }, triQ1: { ar: "1️⃣ شو الأولوية؟", fr: "1️⃣ Quelle priorité ?" }, triQ2: { ar: "2️⃣ لأي قسم؟", fr: "2️⃣ Quel service ?" },
    triGo: { ar: "✅ فرز وفوّتو", fr: "✅ Trier et faire entrer" }, triPick: { ar: "اختار الأولوية والقسم أوّل", fr: "Choisis d'abord la priorité et le service" },
    triVit: { ar: "📋 علامات سريعة", fr: "📋 Constantes rapides" }, pain: { ar: "وجع", fr: "Douleur" },
    triOk: { ar: "✅ فرز صح!", fr: "✅ Tri juste !" }, triOkP: { ar: "✅ القسم صح · ⚠️ الأولوية مش هيك", fr: "✅ Bon service · ⚠️ priorité inexacte" }, triNo: { ar: "❌ مش هالقسم — بعدو ناطر", fr: "❌ Pas ce service — il attend encore" },
    triIn: { ar: "🛏️ {n} صار بـ {d}", fr: "🛏️ {n} est en {d}" }, triInW: { ar: "الحالة بلّشت هون: أوّل شي 🤝 الاستقبال (Accueil) عند تختو", fr: "Le cas commence ici : d'abord 🤝 l'accueil à son lit" },
    triWalk: { ar: "🛏️ {n} راح عـ {d}", fr: "🛏️ {n} part en {d}" }, triBy: { ar: "⚡ {n} سبقك وفوّتو", fr: "⚡ {n} l'a déjà fait entrer" },
    triMax: { ar: "جرّبت 3 مرّات لهالمريض — خلّي رفيقك يجرّب", fr: "3 essais pour ce patient — laisse un camarade essayer" }, triGone: { ar: "🚶 راح — ما حدا فرزو بالوقت", fr: "🚶 Parti — personne ne l'a trié à temps" },
    triWant: { ar: "الأولوية الصح: {p}", fr: "La bonne priorité : {p}" }, triOver: { ar: "(درجة أعلى من اللازم مقبولة — الحذر أحسن)", fr: "(un cran plus urgent est accepté — prudence)" },
    triDep: { ar: "مكانو: {d}", fr: "Sa place : {d}" }, triSig: { ar: "العلامات: {s}", fr: "Signes : {s}" },
    triRule: { ar: "🌐 سلّم الفرز (4 درجات) معلومات عامة؛ العلامات الخطرة من دروسك", fr: "🌐 L'échelle de tri à 4 niveaux = notion générale ; les signes d'alerte viennent de tes cours" },
    amb: { ar: "🚑 عالنقّالة حدّ الباب", fr: "🚑 Sur le brancard à l'entrée" }, walkin: { ar: "🚶 إجا لحالو", fr: "🚶 Venu seul" },
    waitHint: { ar: "🪑 في مرضى ناطرين — كبّس على حدا لتقيّمو وتفوّتو", fr: "🪑 Des patients attendent — touche-en un pour l'évaluer et le faire entrer" },
    waitNone: { ar: "🪑 ما حدا ناطر هلّق — المرضى الجداد بيقعدو هون أوّل ما يوصلو", fr: "🪑 Personne n'attend — les nouveaux patients s'assoient ici en arrivant" },
    desk: { ar: "🏷️ مكتب الفرز", fr: "🏷️ Bureau de tri" }, entr2: { ar: "🚪 من الإسعاف", fr: "🚪 Côté ambulances" }, exitC: { ar: "🚪 عالممرّ", fr: "🚪 Couloir" },
    accW: { ar: "💰 كبّس عالشبّاك لتشوف كشف راتبك", fr: "💰 Touche le guichet pour voir ton bulletin" }, accDesk: { ar: "💰 شبّاك المحاسبة", fr: "💰 Guichet de la comptabilité" },
    accBoard: { ar: "📋 رواتب الأسبوع", fr: "📋 Salaires de la semaine" }, accSafe: { ar: "🔐 الخزنة", fr: "🔐 Coffre" },
    supFree: { ar: "👔 ببلاش — ميزة مسؤول الطابق", fr: "👔 gratuit — avantage du chef d'étage" }, rankUp: { ar: "⬆️ ترقية! صرت {r}", fr: "⬆️ Promotion ! Tu es {r}" }
  };
  // 29d ⏳ every act takes its time + ⏰ reassessment follow-ups (assets/livecare.js)
  Object.assign(U, {
    wkDo: { ar: "⏳ عم تعمل: {a}", fr: "⏳ En cours : {a}" }, wkFor: { ar: "لـ {n}", fr: "pour {n}" }, wkX: { ar: "✖ إلغاء", fr: "✖ Annuler" },
    wkBusy: { ar: "⏳ لسّا عم تعمل «{a}» لهالمريض — باقي {s} ث", fr: "⏳ Tu fais encore « {a} » pour ce patient — encore {s} s" },
    wkBusyW: { ar: "بالحقيقة ما فيك تعمل شغلتين بنفس الوقت عنفس المريض. استنّى يخلص أو كبّس ✖ إلغاء. (رفقاتك فيهن يشتغلو بنفس الوقت)", fr: "En vrai, pas deux gestes à la fois sur le même patient. Attends la fin ou touche ✖ Annuler. (Tes collègues peuvent travailler en même temps)" },
    wkCancel: { ar: "✖ لغيت «{a}»", fr: "✖ « {a} » annulé" }, wkGone: { ar: "✖ وقّفت «{a}» — تركت المريض", fr: "✖ « {a} » arrêté — tu as quitté le patient" },
    fuSet: { ar: "⏰ ارجع قيّم {n} الساعة {h} (بعد {m} دقيقة)", fr: "⏰ Reviens réévaluer {n} à {h} (dans {m} min)" },
    fuSetW: { ar: "انكتب بالملف «✅ أُعطي {a} الساعة {g}». لما يجي الوقت: الضغط والنبض والـ SpO₂ + مفعول الدوا + الأعراض الجانبية.", fr: "Noté au dossier « ✅ {a} donné à {g} ». À l'heure : TA, pouls, SpO₂ + effet du traitement + effets indésirables." },
    fuGiven: { ar: "✅ أُعطي {a} الساعة {h}", fr: "✅ {a} donné à {h}" }, fuAt: { ar: "⏰ تقييم الساعة {h}", fr: "⏰ Réévaluation à {h}" },
    fuLeft: { ar: "باقي", fr: "dans" }, fuNow: { ar: "🔔 هلّق!", fr: "🔔 Maintenant !" }, fuOkL: { ar: "✅ قيّمتو بوقتو", fr: "✅ Réévalué à l'heure" }, fuMissL: { ar: "⚠️ فات الموعد", fr: "⚠️ Manqué" },
    reev: { ar: "⏰ أعد التقييم (Réévaluation)", fr: "⏰ Réévaluer (constantes + effet)" },
    fuDue: { ar: "🔔 حان وقت تقييم المريض {n}", fr: "🔔 C'est l'heure de réévaluer {n}" }, fuDueW: { ar: "{a} من {m} دقيقة — روح شوف الضغط والنبض ومفعول الدوا", fr: "{a} il y a {m} min — va voir TA, pouls et effet du traitement" },
    fuOk: { ar: "✅ رجعت قيّمت {n} بوقتو · +{p} ل.ن", fr: "✅ {n} réévalué à l'heure · +{p} NS" }, fuEarly: { ar: "⏳ لسّا بكير — موعد {n} الساعة {h}", fr: "⏳ Trop tôt — réévaluation de {n} à {h}" },
    fuNone: { ar: "ما في موعد تقييم لهالمريض هلّق", fr: "Pas de réévaluation prévue pour ce patient" },
    fuMiss: { ar: "⚠️ فات موعد تقييم {n} · {p} ل.ن", fr: "⚠️ Réévaluation de {n} manquée · {p} NS" }, fuMissW: { ar: "ما رجعت تشوفو بعد الدوا — ممكن حالتو تسوء وما حدا انتبه. الممرّض بيرجع دايماً يقيّم بعد كل دوا.", fr: "Personne n'a vérifié après le traitement — il peut s'aggraver sans qu'on le voie. On réévalue toujours après un traitement." },
    fuVit: { ar: "هلّق: ", fr: "Maintenant : " }, myFu: { ar: "⏰ مواعيدي", fr: "⏰ Mes rappels" }, fuEmpty: { ar: "ما عندك مواعيد هلّق. بس تعطي دوا لمريض، بينحطّ هون موعد ترجع تقيّمو.", fr: "Aucun rappel. Quand tu donnes un traitement, la réévaluation s'affiche ici." },
    fuGo: { ar: "🚶 روح عندو", fr: "🚶 Y aller" }, fuHow: { ar: "⏰ بوقتها (من 5 د قبل لـ 15 د بعد) = +30 ل.ن · فات = −20 ل.ن", fr: "⏰ À l'heure (5 min avant → 15 min après) = +30 NS · manquée = −20 NS" }
  });
  function ug(k, x, r) { return u(x && x.p && x.p.sex === "f" && U[k + "F"] ? k + "F" : k, r); }   // 28x: the patient's gender (ليا استقرّت, بعدا…)
  function u(k, r) { var s = T(U[k]); for (var x in (r || {})) s = s.split("{" + x + "}").join(r[x]); return s; }
  var GY = [null, { ar: "ما بيفتح عيونو أبداً", fr: "N'ouvre pas les yeux" }, { ar: "بيفتح عيونو بس عالوجع", fr: "Ouvre les yeux à la douleur" }, { ar: "بيفتح عيونو لمّا تحكيه", fr: "Ouvre les yeux à la demande" }, { ar: "عيونو مفتوحة لحالو", fr: "Yeux ouverts spontanément" }];
  var GV = [null, { ar: "ما بيطلع منو صوت", fr: "Aucune réponse verbale" }, { ar: "أصوات ما بتنفهم", fr: "Sons incompréhensibles" }, { ar: "كلمات مش بمحلّها", fr: "Mots inappropriés" }, { ar: "بيحكي بس مشوّش", fr: "Confus" }, { ar: "بيحكي طبيعي وعارف وين هوّي", fr: "Orienté" }];
  var GM = [null, { ar: "ما بيتحرّك أبداً", fr: "Aucune réponse motrice" }, { ar: "بيمدّ إيديه وإجريه عالوجع (extension)", fr: "Extension à la douleur" }, { ar: "بيطوي إيديه بشكل غريب (flexion anormale)", fr: "Flexion anormale" }, { ar: "بيسحب إيدو عالوجع (évitement)", fr: "Évitement à la douleur" }, { ar: "بيحدّد محلّ الوجع (localise)", fr: "Localise la douleur" }, { ar: "بينفّذ الأوامر", fr: "Obéit aux ordres" }];
  var GROUPS = [["eval", ["eval", "pouls", "swallow", "gly", "ecg", "mon", "bilan", "gds", "bio"]], ["pos", ["pos_semi", "pos_trend", "pos_pls", "pos_tete30", "leg_down", "repos"]],
    ["soin", ["acc", "airway", "o2", "vent", "guedel", "vvp", "remp", "stop", "stopdrug", "immob", "cpr", "shock", "sonde", "jeun", "es", "isol", "refroid", "calm", "drink"]],
    ["rx", ["adre", "nora", "atro", "dobu", "deca", "atb", "sang", "trinit", "aspi", "hep", "furo", "mann", "morph", "g30", "insu", "digi", "vitk", "digo", "aero", "para", "bicar", "phen"]]];
  // 29e: the gestures added to the bank (D.acts with g + dk) join their group once, after the old ones
  function grpAdd() { if (!D || grpAdd.done) return; grpAdd.done = 1; var GI = { ev: 0, pos: 1, soin: 2, rx: 3 }; Object.keys(D.acts || {}).forEach(function (a) { var A = D.acts[a], gi = GI[A.g]; if (gi == null) return; if (GROUPS[gi][1].indexOf(a) < 0) GROUPS[gi][1].push(a); }); }
  function q(s) { return ov && ov.querySelector(s); }
  function pk(i) { return i ? "b" : "a"; }
  function X(k) { return st && st.P[k === "b" ? 1 : 0]; }
  function DK() { return (st && st.DK) || D; }                                        // 28z: the bank of the department the nurse is in
  function ckey(k) { var dk = L.dep ? L.dep() : "er"; return (dk === "er" ? "" : dk) + k; }
  function nm(x) { return T(x.p.nm); }
  function fmtT(t) { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)); } catch (e) { return ""; } }

  /* ---------------- the overlay ---------------- */
  function build() {
    ov = d.createElement("div"); ov.className = "lcr"; ov.hidden = true; ov.setAttribute("data-nofr", ""); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="lcr-top"><button type="button" class="lcr-x" data-lcx="1" aria-label="' + esc(u("close")) + '">✕</button>' +
      '<span class="lcr-tt"></span><span class="lcr-tm" dir="ltr"></span><span class="lcr-sc" dir="ltr"></span>' +
      '<button type="button" class="lcr-ib lcr-hlpb" data-lchelp="1" aria-label="' + esc(u("hlp")) + '">🧑‍⚕️</button><button type="button" class="lcr-ib" data-lcarch="1" aria-label="' + esc(u("archive")) + '">📚</button><button type="button" class="lcr-ib" data-lclog="1" aria-label="' + esc(u("myLog")) + '">📒</button><button type="button" class="lcr-ib lcr-fub" data-lcfu="1" aria-label="' + esc(u("myFu")) + '">⏰<i hidden></i></button><button type="button" class="lcr-ib" data-lcpush="1" aria-label="' + esc(u("push")) + '">🔔</button><button type="button" class="lcr-ib lcr-snd" data-lcsnd="1" aria-label="' + esc(u("sndOn")) + '">🔇</button></div>' +
      '<div class="lcr-ban"></div><div class="lcr-pts"></div>' +
      '<div class="lcr-stage"><canvas class="lcr-cv"></canvas><div class="lcr-over" hidden></div><div class="lcr-fb" aria-live="polite"></div><div class="lcr-help" hidden aria-live="polite"></div><div class="lcr-ptoast" aria-live="polite"></div><div class="lcr-siren" hidden></div><div class="lcr-work" hidden></div></div>' +
      '<div class="lcr-floor"><canvas class="lcr-fcv" aria-label="' + esc(u("hosp")) + '"></canvas><div class="lcr-flt" role="tablist" aria-label="' + esc(u("elev")) + '"></div></div>' +
      '<div class="lcr-bar"><span class="lcr-hl">' + esc(u("hands")) + '</span><button type="button" class="lcr-slot" data-lcslot="0"></button><button type="button" class="lcr-slot" data-lcslot="1"></button>' +
      '<button type="button" class="lcr-feedb" data-lcfeed="1"></button></div>' +
      '<div class="lcr-sheet" hidden><div class="lcr-shin"></div></div><div class="lcr-panel" hidden></div>';
    d.body.appendChild(ov);
    ov.addEventListener("click", onClick);
    var sh0 = q(".lcr-sheet");
    sh0.addEventListener("pointerdown", function () { sheetHold(true); });
    ["pointerup", "pointercancel"].forEach(function (ev) { sh0.addEventListener(ev, function () { setTimeout(function () { sheetHold(false); }, 0); }); });
    cv = q(".lcr-cv"); cx = cv.getContext("2d"); cv.addEventListener("pointerdown", onTap);
    fcv = q(".lcr-fcv"); fcx = fcv.getContext("2d"); fcv.addEventListener("pointerdown", onFloorTap); sndPaint();
    w.addEventListener("resize", function () { if (!ov.hidden) size(); });
  }
  function open() {
    if (!ov) build();
    ov.hidden = false; d.documentElement.classList.add("lcr-open");
    if (location.hash !== "#live") try { history.pushState({ lc: 1 }, "", "#live"); } catch (e) { location.hash = "live"; }
    q(".lcr-tt").textContent = depTitle();
    nurse = nurse || { x: 180, y: 560, dir: -Math.PI / 2, pts: [], goal: null, walkT: 0 };
    if (AS && E) { asst = asst || AS.make(nurse, E.W, E.H); offer = offer || AS.offerNew(nowMs()); }   // 29p 🧑‍⚕️🚶
    L.start(onState).then(function (X) { D = X; if (!X) return; grpAdd(); G = screenGrid(G || (R && R.grid ? R.grid() : null)); stWatch(); size(); slots(); go(); flTabs();
      if (w.NursinPay) setTimeout(function () { w.NursinPay.sync(); }, 1500); });   // 29d 💵 the past days of the payroll (once each)
    if (LCa && !careIv) { careIv = setInterval(careTick, 1000); setTimeout(careTick, 1200); }   // 29d ⏰
  }
  function close() {
    if (!ov || ov.hidden) return; ov.hidden = true; paused = false; d.documentElement.classList.remove("lcr-open"); stop(); L.off(onState); sheetClose(); panelClose();
    if (w.LivePresRoom) w.LivePresRoom.stop(); peers = {}; pList = []; pPrev = null;
    if (careIv) { clearInterval(careIv); careIv = 0; } if (Object.keys(work).length) workAll("wkGone");   // 29d
    if (location.hash === "#live") try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  // 29l 🔥: hidden page / pagehide → the loop, the ⏰ timer and the live listeners stop; back → they start again
  var paused = false;
  function pauseAll() {
    if (paused || !ov || ov.hidden) return; paused = true; stop();
    if (careIv) { clearInterval(careIv); careIv = 0; }
    if (w.LivePresRoom) w.LivePresRoom.stop(); if (L.pause) L.pause();
  }
  function resumeAll() {
    if (!paused) return; paused = false; if (!ov || ov.hidden) return;
    if (L.resume) L.resume(); if (LCa && !careIv) { careIv = setInterval(careTick, 1000); setTimeout(careTick, 300); }
    if (D) go();
    if (mode === "shared" && w.LivePresRoom) w.LivePresRoom.start(presChange);
  }
  d.addEventListener("visibilitychange", function () { if (d.hidden) pauseAll(); else resumeAll(); });
  w.addEventListener("pagehide", pauseAll);
  w.addEventListener("pageshow", function () { if (!d.hidden) resumeAll(); });
  w.LiveRoomLoop = { busy: function () { return busy(nowMs()); }, idleMs: IDLE_MS, running: function () { return !!raf; }, paused: function () { return paused; } };
  function onState(s, m) {
    kick();
    st = s; mode = m; admAt = 0; hCache = null; if (!ov || ov.hidden || !s) return;   // 29d: who is in / waiting changes with every step
    if ((s.dep || "er") !== lastDep) { lastDep = s.dep || "er"; bg = null; prevSt = {}; endSeen = !!s.end; q(".lcr-tt").textContent = depTitle(); }
    ambCheck();
    // 28v: an ended case is shown as ended everywhere in the room (dimmed room + «🏁 انتهت الحالة» card + countdown to the next one)
    ov.classList.toggle("ended", !!s.end); if (!s.end) endSeen = false;
    var tm = q(".lcr-tm"); tm.textContent = s.end ? "⏭️ " + L.left(s.t1 - Date.now()) : "⏳ " + L.left(s.t1 - Date.now());
    overPaint();
    var M = L.me(), mine = (s.pts[M.uid] || {}).p | 0; q(".lcr-sc").textContent = "🏅 " + (mine > 0 ? "+" : "") + mine + (w.NursinPay ? " · 💵 " + w.NursinPay.money(w.NursinPay.mine()) : "");
    if (w.NursinPay) { w.NursinPay.reset(); var rk0 = w.NursinPay.tagOf(M.uid), rkk = rk0.sup ? "sup" : rk0.r.k; if (lastRank && lastRank !== rkk && rkk !== "tr") say("good", u("rankUp", { r: (rk0.sup ? w.NursinPay.core.SUP : rk0.r).ic + " " + T(rk0.sup ? w.NursinPay.core.SUP : rk0.r) })); lastRank = rkk; }
    var ban = q(".lcr-ban"), why = L.why();
    ban.className = "lcr-ban " + (m === "shared" ? "sh" : "pv");
    ban.innerHTML = '<span>' + esc(m === "shared" ? u("shared") : m === "loading" ? "…" : why === "rules" ? u("soon") : why === "net" ? u("net") : u("preview")) + "</span>" +
      (m === "preview" && why === "out" ? ' <a href="friends.html">' + esc(u("sign")) + "</a>" : "") +
      '<span class="lcr-ppl" hidden></span>' +
      '<b class="lcr-case">' + esc(s.cs.ic + " " + T(s.cs.t)) + (s.cs.gen ? ' <small class="lcr-gen">' + esc(u("gen")) + "</small>" : "") + "</b>";
    var PR = w.LivePresRoom; if (PR) { if (m === "shared") PR.start(presChange); else { PR.stop(); pList = []; } }
    pplPaint();
    cards(); feedLine();
    if (sheet) sheetPaint();
    if (panel === "feed") feedPanel();
    events();
    if (s.end && !endSeen) { endSeen = true; sheetClose(); nurse.pts = []; nurse.goal = null; setTimeout(function () { if (!panel) endPanel(); }, 900); }
  }
  // a patient changed bucket since we last looked → one line (📉 / 📈) like the push the worker sends
  function events() {
    st.P.forEach(function (x) { var p = prevSt[x.k];
      if (p && p !== x.st && x.over && !st.end) {                  // 28x: this one just finished, the other is still waiting
        finSay(x); prevSt[x.k] = x.st; return;
      }
      if (p && p !== x.st) { var down = ["ok", "impr", "unst", "crit", "lost"].indexOf(x.st) > ["ok", "impr", "unst", "crit", "lost"].indexOf(p); say(down ? "bad" : "good", (down ? "📉 " : "📈 ") + nm(x) + ": " + L.stLabel(x.st)); } prevSt[x.k] = x.st; });
  }
  function finSay(x) {
    if (!st || st.end || !x || !x.over || x.ghost) return; var o = st.P[x.k === "a" ? 1 : 0]; if (!o || o.ghost) return say(x.over.w === "ok" ? "good" : "bad", x.over.w === "ok" ? ug("pOk", x, { n: nm(x) }) : u("pLost", { n: nm(x) }));
    say(x.over.w === "ok" ? "good" : "bad", x.over.w === "ok" ? ug("pOk", x, { n: nm(x) }) : u("pLost", { n: nm(x) }), o.over ? "" : ug("pGoOn", o, { n: nm(o) }));
  }
  function cards() {
    var el = q(".lcr-pts"); if (!el || !st) return;
    if (st.end) {
      var lost = st.end.w === "lost" ? X(st.end.pk) : null;
      // 29h 🏥 (Abdullah, Nov 4 9:38 PM): only a small note — the next daily case time + «the hospital stays open» (walk-ins keep coming to 🪑)
      var wn = waitList().length;
      el.innerHTML = '<div class="lcr-end lcr-endn"><span class="lcr-endt"><b>' + esc(u("ended")) + "</b> <small>" + esc(st.dep === "x" ? u("ambDone") : "⏳ " + L.nextWords(st.t1 - Date.now())) + "</small> <i>· " + esc(endWhy()) + "</i></span>" +
        '<button type="button" class="lcr-endgo" data-lcgo="wt">' + esc(u("openGo", { n: wn })) + "</button></div>";
      return;
    }
    el.innerHTML = st.P.map(function (x, i) {
      if (x.ghost) return '<div class="lcr-pc lcr-ghost"><b>🛏️2</b><small>' + esc(u("bayEmpty")) + "</small></div>";
      if (!svcRoom() && !inBed(x)) return '<button type="button" class="lcr-pc lcr-wtc" data-lcgo="wt"><b>🛏️' + (i + 1) + " " + esc(nm(x)) + "</b><small>" + esc(u("waitBed")) + " · " + esc(u("goWait")) + "</small></button>";   // 29d: still outside
      var v = x.v, mon = !!x.done.mon, pct = Math.round(x.n / x.tot * 100);
      var vit = mon ? '<span dir="ltr" class="lcr-v"><i class="' + lv("ta", v.sys) + '">' + Math.round(v.sys) + "/" + Math.round(v.dia) + '</i> <i class="' + lv("fc", v.fc) + '">♥' + Math.round(v.fc) + '</i> <i class="' + lv("spo2", v.spo2) + '">' + Math.round(v.spo2) + "%</i></span>" : '<span class="lcr-v off">📟 --</span>';
      var fin = x.over ? '<small class="lcr-pp lcr-pfin">' + esc(ug("pDone", x)) + " · " + esc(u("seeSteps")) + "</small>" : "";   // 28x: a finished bed stays, greyed
      return '<button type="button" class="lcr-pc ' + x.st + (x.over ? " fin" : "") + '" data-lcbed="' + pk(i) + '"><span class="lcr-pn"><b>🛏️' + (i + 1) + " " + esc(nm(x)) + '</b><small>' + x.p.age + " " + esc(u("ageY")) + " · " + (x.p.sex === "m" ? "♂" : "♀") + '</small></span><span class="lcr-ps">' + esc(L.stLabel(x.st, x.p.sex)) + "</span>" + vit +
        '<span class="lcr-pg"><i style="width:' + pct + '%"></i></span>' + (fin || '<small class="lcr-pp">' + esc(T(U["ph" + x.ph])) + " · " + x.n + "/" + x.tot + "</small>") + "</button>";
    }).join("");
  }
  function endWhy(s) {                                         // 28x: ok (both stabilised) · lost (one or both) · mix (one ✅, one 💔) · time
    s = s || st; var e = s && s.end; if (!e) return "";
    var K = function (k) { return nm(s.P[k === "b" ? 1 : 0]); }, lo = e.lost || (e.pk ? [e.pk] : []), ok = e.ok || [];
    if (e.w === "ok") return u("endOk");
    if (e.w === "mix") return ug("endMix", s.P[ok[0] === "b" ? 1 : 0], { a: K(ok[0]), b: K(lo[0]) });
    if (e.w === "lost") return lo.length > 1 ? u("endLost2", { a: K(lo[0]), b: K(lo[1]) }) : u("endLost", { n: K(lo[0] || "a") });
    return u("endTime");
  }
  // 28v: the «🏁 انتهت الحالة» card over the (dimmed) room — it also takes the taps, so the room never looks alive while it is closed
  var overKey = "", overT = 0;
  function overPaint() {
    var el = q(".lcr-over"); if (!el || !st) return;
    // 29h 🏥: no «🏁 انتهت الحالة» card over the room any more (it took every tap = the whole hospital looked locked) — the next case time is
    // a small note in the cards strip (cards()) and new 🚶 walk-ins keep arriving in 🪑 the waiting room
    if (!el.hidden) { el.hidden = true; el.innerHTML = ""; overKey = ""; }
  }
  function overTick() {
    if (!st || !st.end) return; var cd = q(".lcr-ovcd"); if (!cd) return;
    var ms = Math.max(0, st.t1 - Date.now()), s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sc = s % 60;
    var t = h + ":" + (m < 10 ? "0" : "") + m + ":" + (sc < 10 ? "0" : "") + sc; if (cd.textContent !== t) cd.textContent = t;
  }
  function lv(k, v) {
    if (k === "fc") return v < 50 || v > 120 ? "r" : v < 60 || v > 100 ? "o" : "g";
    if (k === "ta") return v < 90 ? "r" : v < 100 || v > 160 ? "o" : "g";
    if (k === "spo2") return v < 90 ? "r" : v < 95 ? "o" : "g";
    return "g";
  }
  function evText(e) {
    var x = X(e.p), ic = e.k === "ok" ? "✅" : e.k === "bad" ? "❌" : "⚠️";
    return "👤 " + e.n + " " + u("did") + ": " + L.actName(e.a) + " → " + (x ? T(x.p.nm).split(" ")[0] : "") + " " + ic + " " + (e.d > 0 ? "+" : "") + e.d;
  }
  function feedLine() {
    var b = q(".lcr-feedb"); if (!b || !st) return;
    var e = st.ev[st.ev.length - 1]; b.textContent = e ? evText(e) : st.end ? u("endNobody") : u("nobody");
  }

  /* ---------------- canvas room ---------------- */
  function size() {
    fsize();
    if (!cv || !E) return; var stg = q(".lcr-stage"), wv = stg.clientWidth, hv = stg.clientHeight; if (!wv || !hv) return;
    // 29g 🛏️: the room is re-fitted whenever the stage changes size (a ResizeObserver, not only window resize).
    // 29h 📱 (Abdullah, Nov 4 5:28 PM «لازم تبيّن بدون الزوم»): the WHOLE room is always on the screen — no scrolling camera, no crop.
    // On a phone the room gets the space first (fsize() keeps the floor map small enough, the banner and the cards are compact).
    var fit = Math.min(wv / E.W, hv / E.H); scale = fit; dpr = Math.min(2, w.devicePixelRatio || 1);
    var cw = Math.round(E.W * scale), ch = Math.round(E.H * scale);
    cv.style.width = cw + "px"; cv.style.height = ch + "px"; cv.style.transform = "";
    cv.width = Math.round(E.W * scale * dpr); cv.height = Math.round(E.H * scale * dpr); bg = null;
  }
  var stRO = null, ROOM_MIN = 0.55;
  function stWatch() { if (stRO || !w.ResizeObserver) return; var stg = q(".lcr-stage"); if (!stg) return; var lw = 0, lh = 0;
    stRO = new w.ResizeObserver(function () { var a = stg.clientWidth, b = stg.clientHeight; if (a === lw && b === lh) return; lw = a; lh = b; if (ov && !ov.hidden) w.requestAnimationFrame(function () { if (ov && !ov.hidden) size(); }); }); stRO.observe(stg); }   // 29h: size() on the next frame (it moves the floor map → no ResizeObserver loop)
  w.LiveRoomCam = function () { var stg = q(".lcr-stage"); return { scale: scale, h: Math.round(E.H * scale), vh: stg ? stg.clientHeight : 0, off: 0 }; };
  // 29l 🔥 (Abdullah, Nov 6 «لعبة المستشفى عم تحمّي الجهاز»): full frame rate only while something moves (the nurse walks, a trip,
  // a peer walks, ~1.5 s after a tap or a state change); otherwise the room is drawn ~12 times a second. Nothing runs while the page is hidden.
  var IDLE_MS = 80, hotTo = 0, lastDraw = 0;
  function nowMs() { return w.performance && w.performance.now ? w.performance.now() : Date.now(); }
  function kick(ms) { var t = nowMs() + (ms || 1500); if (t > hotTo) hotTo = t; }
  function peersMoving() { for (var k in peers) if (peers[k] && peers[k].pts && peers[k].pts.length) return true; return false; }
  function busy(ts) { return !!(nurse && nurse.pts && nurse.pts.length) || !!trv || ts < hotTo || peersMoving() || !!(asst && asst.mv); }   // 29p: + my assistant catching up
  function go() { stop(); if (d.hidden) return; last = 0; lastDraw = 0; kick(); if (offer) AS.seen(offer, nowMs()); raf = w.requestAnimationFrame(loop); }
  function stop() { if (raf) w.cancelAnimationFrame(raf); raf = 0; }
  function loop(ts) {
    raf = w.requestAnimationFrame(loop);
    if (d.hidden) { stop(); return; }
    if (lastDraw && ts - lastDraw < IDLE_MS && !busy(ts)) return;   // 29l: idle throttle
    lastDraw = ts;
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (nurse.pts.length && R) {
      var r = R.walk(nurse, nurse.pts, dt); nurse.x = r.x; nurse.y = r.y; nurse.dir = r.dir; nurse.walkT += dt;
      if (r.done) { nurse.walkT = 0; mark = null; if (nurse.goal) { var g = nurse.goal; nurse.goal = null; arrive(g); } }
    }
    if (st && st.end && ts - overT > 500) { overT = ts; overTick(); }
    travelTick(dt);
    asstTick(ts, dt);                                             // 29p 🧑‍⚕️🚶 (no loop of his own)
    presFrame(dt);
    draw(ts / 1000);
    floorDraw(ts / 1000, dt);
  }
  function night() { return d.documentElement.getAttribute("data-theme") === "night"; }
  function pal() {
    return night() ? { floor: "#17232a", tile: "#1e2d35", wall: "#3b5560", wallIn: "#2a3e46", frame: "#5d6f79", matt: "#cdd7dc", b1: "#2f8f83", b2: "#3d6f99", pil: "#e3e9ec", lb: "rgba(9,18,23,.86)", ink: "#dff3ee", skin: "#e5b893", hair: "#2a1c14" }
      : { floor: "#e9f1ef", tile: "#d7e4e1", wall: "#8fb3ad", wallIn: "#b9d3ce", frame: "#7d8c96", matt: "#ffffff", b1: "#7fc8bd", b2: "#9cc3e6", pil: "#f4f7f8", lb: "rgba(255,255,255,.9)", ink: "#17323a", skin: "#f1c7a5", hair: "#3b2a1e" };
  }
  function rr(c, x, y, wd, ht, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + wd, y, x + wd, y + ht, r); c.arcTo(x + wd, y + ht, x, y + ht, r); c.arcTo(x, y + ht, x, y, r); c.arcTo(x, y, x + wd, y, r); c.closePath(); }
  var EMO = "system-ui,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  function label(c, P, x, y, txt, col) {
    c.font = "700 8px " + EMO; var tw = c.measureText(txt).width + 10;
    c.fillStyle = col || P.lb; rr(c, x - tw / 2, y - 7, tw, 14, 7); c.fill();
    c.fillStyle = col ? "#fff" : P.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillText(txt, x, y + 0.5);
  }
  var LBL = { mon: [147, 76], o2: [199, 45], sink: [316, 326], cart: [181, 287], defib: [44, 325], drugs: [44, 520], phone: [299, 518] };
  /* 29e 🎨 «المنظر الجديد» (Abdullah, Nov 4 7:13 AM «ممكن تغيّر المنظر لأحسن إذا بيصير أحسن»): a drawn, game-like top-down hospital — vinyl floor
     tiles tinted by the ward, thick walls with a baseboard and a framed sliding door, real beds (headboard, footboard + chart, side rails,
     wheels, mattress, pillow, folded blanket), a bedside monitor per bed with a moving ECG, IV poles with a drip, curtains on ceiling rails,
     soft ceiling-light pools. Everything is vector, drawn ONCE into the cached background (only the monitors, the patients and the nurses move). */
  function tint(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
  function shell(c, P, dk, opt) {
    opt = opt || {}; var nt = night(), W0 = E.W, H0 = E.H, col = DCOL[dk] || "#0f766e";
    c.fillStyle = opt.floor || P.floor; c.fillRect(0, 0, W0, H0);
    var tA = opt.tileA || (nt ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.55)"), tB = opt.tileB || (nt ? "rgba(0,0,0,.18)" : "rgba(15,60,70,.045)"), sz = opt.tile || 24;
    for (var gy = 12, row = 0; gy < H0 - 12; gy += sz, row++) for (var gx = 12, cl = 0; gx < W0 - 12; gx += sz, cl++) {
      c.fillStyle = (row + cl) % 2 ? tB : tA; c.fillRect(gx, gy, sz, sz);
      c.fillStyle = nt ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.7)"; c.fillRect(gx + 1, gy + 1, sz - 2, 1);           // the tile's lit edge
    }
    c.strokeStyle = P.tile; c.lineWidth = 0.6; c.beginPath(); for (var lx = 12; lx < W0 - 11; lx += sz) { c.moveTo(lx, 12); c.lineTo(lx, H0 - 12); } for (var ly = 12; ly < H0 - 11; ly += sz) { c.moveTo(12, ly); c.lineTo(W0 - 12, ly); } c.stroke();
    if (dk && dk !== "er") { c.fillStyle = tint(col, nt ? 0.07 : 0.06); c.fillRect(12, 12, W0 - 24, H0 - 24); }
    // soft pools of ceiling light
    (opt.lights || [[90, 150], [270, 150], [180, 400]]).forEach(function (L0) { var g = c.createRadialGradient(L0[0], L0[1], 4, L0[0], L0[1], 120); g.addColorStop(0, nt ? "rgba(253,230,138,.07)" : "rgba(255,255,240,.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, W0, H0); });
    // walls: a thick top band (seen slightly from above), a baseboard, a darker outer line
    var wt = 12, wl = nt ? "#2b424b" : "#7fa8a1", wf = nt ? "#3b5560" : "#a9c9c3", bb = nt ? "#1a2a30" : "#5f8a83";
    c.fillStyle = wl; c.fillRect(0, 0, W0, wt); c.fillRect(0, H0 - wt, W0, wt); c.fillRect(0, 0, wt, H0); c.fillRect(W0 - wt, 0, wt, H0);
    c.fillStyle = wf; c.fillRect(wt, wt - 4, W0 - 2 * wt, 4); c.fillStyle = tint(col, 0.55); c.fillRect(wt, wt - 1.5, W0 - 2 * wt, 1.5);    // the ward's colour stripe
    c.fillStyle = bb; c.fillRect(wt, wt, W0 - 2 * wt, 1.2); c.fillRect(wt, H0 - wt - 1.2, W0 - 2 * wt, 1.2); c.fillRect(wt, wt, 1.2, H0 - 2 * wt); c.fillRect(W0 - wt - 1.2, wt, 1.2, H0 - 2 * wt);
    c.strokeStyle = nt ? "#0d171b" : "#3f6660"; c.lineWidth = 1; c.strokeRect(0.5, 0.5, W0 - 1, H0 - 1);
    // the door at the bottom: frame posts, two sliding leaves (half open), a floor mat
    c.fillStyle = opt.floor || P.floor; c.fillRect(146, H0 - wt, 68, wt);
    c.fillStyle = nt ? "#64748b" : "#475569"; c.fillRect(142, H0 - wt - 2, 5, wt + 2); c.fillRect(213, H0 - wt - 2, 5, wt + 2);
    c.fillStyle = nt ? "rgba(148,197,232,.35)" : "rgba(186,230,253,.85)"; c.fillRect(147, H0 - 7, 18, 4); c.fillRect(195, H0 - 7, 18, 4);
    c.strokeStyle = nt ? "#94a3b8" : "#64748b"; c.lineWidth = 0.8; c.strokeRect(147, H0 - 7, 18, 4); c.strokeRect(195, H0 - 7, 18, 4);
    c.fillStyle = nt ? "#1e293b" : "#94a3b8"; rr(c, 156, H0 - wt - 16, 48, 12, 3); c.fill(); c.fillStyle = nt ? "#334155" : "#cbd5e1"; for (var mi = 0; mi < 5; mi++) c.fillRect(160 + mi * 9, H0 - wt - 14, 5, 8);
    (opt.windows || []).forEach(function (wx) { c.fillStyle = nt ? "#1e3a5f" : "#bfe3f5"; c.fillRect(wx, 2, 40, 7); c.fillStyle = nt ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.75)"; c.fillRect(wx + 3, 3, 12, 2); c.strokeStyle = nt ? "#64748b" : "#5f8a83"; c.lineWidth = 1; c.strokeRect(wx, 2, 40, 7); c.beginPath(); c.moveTo(wx + 20, 2); c.lineTo(wx + 20, 9); c.stroke(); });
  }
  function bed(c, P, s, bl) {
    var nt = night(), x = s.x, y = s.y, W0 = s.w, H0 = s.h;
    c.fillStyle = "rgba(0,0,0,.16)"; rr(c, x + 4, y + 6, W0, H0, 9); c.fill();                                               // shadow
    c.fillStyle = "#1f2937"; [[x + 6, y + 8], [x + W0 - 6, y + 8], [x + 6, y + H0 - 6], [x + W0 - 6, y + H0 - 6]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 3.2, 0, 7); c.fill(); });   // wheels
    c.fillStyle = nt ? "#64748b" : "#94a3b8"; rr(c, x + 2, y + 6, W0 - 4, H0 - 10, 8); c.fill();                                // the frame
    c.fillStyle = P.matt; rr(c, x + 6, y + 12, W0 - 12, H0 - 22, 7); c.fill();                                                 // mattress
    c.fillStyle = nt ? "rgba(0,0,0,.12)" : "rgba(15,23,42,.06)"; rr(c, x + 6, y + H0 - 26, W0 - 12, 16, 6); c.fill();
    var hg = c.createLinearGradient(x, y, x, y + 12); hg.addColorStop(0, nt ? "#94a3b8" : "#e2e8f0"); hg.addColorStop(1, nt ? "#475569" : "#94a3b8");
    c.fillStyle = hg; rr(c, x - 1, y, W0 + 2, 11, 5); c.fill(); c.strokeStyle = nt ? "#1e293b" : "#64748b"; c.lineWidth = 0.8; c.stroke();     // headboard
    c.fillStyle = tint(bl, 0.9); rr(c, x + 6, y + 2.5, W0 - 12, 4, 2); c.fill();
    c.fillStyle = nt ? "#475569" : "#cbd5e1"; rr(c, x - 1, y + H0 - 9, W0 + 2, 9, 4); c.fill(); c.strokeStyle = nt ? "#1e293b" : "#64748b"; c.stroke();   // footboard
    c.fillStyle = nt ? "#e2e8f0" : "#fffdf5"; rr(c, x + W0 / 2 - 9, y + H0 - 16, 18, 11, 1.5); c.fill(); c.fillStyle = "#64748b"; c.fillRect(x + W0 / 2 - 4, y + H0 - 17, 8, 2.5);   // the chart clipboard
    c.fillStyle = "#94a3b8"; for (var cl = 0; cl < 3; cl++) c.fillRect(x + W0 / 2 - 6, y + H0 - 13 + cl * 2.6, 12, 0.8);
    c.fillStyle = P.pil; rr(c, x + 14, y + 13, W0 - 28, 22, 9); c.fill(); c.strokeStyle = nt ? "rgba(0,0,0,.25)" : "rgba(15,23,42,.10)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 20, y + 24); c.quadraticCurveTo(x + W0 / 2, y + 28, x + W0 - 20, y + 24); c.stroke();
    // the blanket with its folded top band and quilt lines
    c.fillStyle = bl; rr(c, x + 7, y + 44, W0 - 14, H0 - 58, 6); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; rr(c, x + 7, y + 44, W0 - 14, 9, 5); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 0.8; c.beginPath(); for (var q2 = y + 66; q2 < y + H0 - 18; q2 += 16) { c.moveTo(x + 9, q2); c.lineTo(x + W0 - 9, q2); } c.stroke();
    // side rails (half length, posts) on both sides
    c.strokeStyle = nt ? "#cbd5e1" : "#64748b"; c.lineWidth = 2; [x + 2.5, x + W0 - 2.5].forEach(function (rx) { c.beginPath(); c.moveTo(rx, y + 30); c.lineTo(rx, y + 84); c.stroke(); });
    c.fillStyle = nt ? "#e2e8f0" : "#475569"; [x + 2.5, x + W0 - 2.5].forEach(function (rx) { [30, 57, 84].forEach(function (py) { c.beginPath(); c.arc(rx, y + py, 1.6, 0, 7); c.fill(); }); });
  }
  // the IV pole of a bed: a 5-wheel base, the pole, a hook, the bag (fluid level), the drip chamber
  function ivPole(c, px, py, nt, bag) {
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(px + 1.5, py + 32, 8, 3.5, 0, 0, 7); c.fill();
    c.strokeStyle = nt ? "#94a3b8" : "#64748b"; c.lineWidth = 1.1; for (var k = 0; k < 5; k++) { var an = k * 1.2566; c.beginPath(); c.moveTo(px, py + 31); c.lineTo(px + Math.cos(an) * 7, py + 31 + Math.sin(an) * 3); c.stroke(); }
    c.lineWidth = 1.8; c.beginPath(); c.moveTo(px, py + 31); c.lineTo(px, py - 24); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.moveTo(px - 6, py - 24); c.lineTo(px + 6, py - 24); c.stroke();
    c.fillStyle = nt ? "rgba(186,230,253,.55)" : "rgba(224,242,254,.95)"; rr(c, px - 5.5, py - 23, 11, 15, 3.5); c.fill(); c.strokeStyle = nt ? "#7dd3fc" : "#7aa7bf"; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = bag || (nt ? "#38bdf8" : "#7cc4ef"); rr(c, px - 4.5, py - 17, 9, 8, 2.5); c.fill();
    c.fillStyle = nt ? "#e0f2fe" : "#ffffff"; rr(c, px - 1.5, py - 7, 3, 5, 1); c.fill();
  }
  // the bedside monitor (screen only; the trace is drawn live in draw())
  function monBox(c, mx, my, nt) {
    c.fillStyle = "rgba(0,0,0,.2)"; rr(c, mx + 1.5, my + 2, 22, 17, 3); c.fill();
    c.fillStyle = nt ? "#334155" : "#1f2937"; rr(c, mx, my, 22, 17, 3); c.fill(); c.fillStyle = "#020617"; rr(c, mx + 2, my + 2, 18, 11, 1.5); c.fill();
    c.fillStyle = "#64748b"; c.fillRect(mx + 4, my + 14.5, 3, 1.2); c.fillRect(mx + 9, my + 14.5, 3, 1.2); c.fillStyle = "#22c55e"; c.beginPath(); c.arc(mx + 17.5, my + 15, 0.9, 0, 7); c.fill();
  }
  // a curtain seen from above: a ceiling rail with soft folds
  function curtain(c, x0, y0, x1, y1, nt, col) {
    var n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6)), dx = (x1 - x0) / n, dy = (y1 - y0) / n, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = nt ? "#1e3a4c" : "#6b8fa3"; c.lineWidth = 6.5; c.beginPath();
    for (var i = 0; i <= n; i++) { var o = (i % 2 ? 2.4 : -2.4); c[i ? "lineTo" : "moveTo"](x0 + dx * i + nx * o, y0 + dy * i + ny * o); } c.stroke();
    c.strokeStyle = col || (nt ? "#4f7d99" : "#bfe1f2"); c.lineWidth = 4.4; c.stroke();
    c.strokeStyle = nt ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.75)"; c.lineWidth = 1; c.stroke();
    c.lineCap = "butt"; c.lineJoin = "miter";
  }
  var MONP = { a: { x: 13, y: 70 }, b: { x: 326, y: 70 } };          // 29e: where each bed's monitor stands (by its head, against the wall)
  var SCR = { x0: 174, x1: 186, y0: 84, y1: 198 };              // 28y: the paravent between the beds (an obstacle on the walking grid too)
  function zig(c) { var n = 6, hgt = (SCR.y1 - SCR.y0) / n; c.beginPath(); for (var i = 0; i <= n; i++) c[i ? "lineTo" : "moveTo"](i % 2 ? SCR.x1 : SCR.x0, SCR.y0 + i * hgt); c.stroke(); }
  function screenGrid(G) {
    if (!G || G.scr) return G; var r = (E.R || 9) + 1;
    for (var j = 0; j < G.rows; j++) for (var i = 0; i < G.cols; i++) { var x = (i + 0.5) * G.cell, y = (j + 0.5) * G.cell; if (x > SCR.x0 - r && x < SCR.x1 + r && y > SCR.y0 - r && y < SCR.y1 + r) G.b[j * G.cols + i] = 1; }
    G.scr = 1; return G;
  }
  function room() {
    var P = pal(), nt = night(), dk = L.dep(), o = d.createElement("canvas"); o.width = cv.width; o.height = cv.height; var c = o.getContext("2d"); c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    shell(c, P, dk, { lights: [[76, 140], [284, 140], [180, 330], [180, 520]], windows: [36, 284] });
    var S = E.stations;
    // the curtain rails around each bed (ceiling, dashed) with the curtain bunched at the head
    [S.bed1, S.bed2].forEach(function (s) { c.strokeStyle = nt ? "rgba(148,163,184,.35)" : "rgba(100,116,139,.35)"; c.setLineDash([3, 3]); c.lineWidth = 1; c.strokeRect(s.x - 7, s.y - 4, s.w + 14, s.h + 10); c.setLineDash([]);
      curtain(c, s.x - 7, s.y - 4, s.x - 7, s.y + 22, nt); curtain(c, s.x + s.w + 7, s.y - 4, s.x + s.w + 7, s.y + 22, nt); });
    bed(c, P, S.bed1, P.b1); bed(c, P, S.bed2, P.b2);
    // 28y 🧴 each bed has its own IV pole with its own soluté — 29e drawn as a real pole
    [S.bed1, S.bed2].forEach(function (s, i) { var px = i ? s.x - 4 : s.x + s.w + 4, py = s.y + 54; ivPole(c, px, py, nt); });
    // 29e 📟 a monitor by each bed's head (the trace moves when he is wired: «📟 Monitorage» done)
    monBox(c, MONP.a.x, MONP.a.y, nt); monBox(c, MONP.b.x, MONP.b.y, nt);
    // 28y 🩻 the paravent between the beds — 29e a curtain on its rail
    curtain(c, (SCR.x0 + SCR.x1) / 2, SCR.y0, (SCR.x0 + SCR.x1) / 2, SCR.y1, nt);
    c.fillStyle = nt ? "#94a3b8" : "#64748b"; c.beginPath(); c.arc((SCR.x0 + SCR.x1) / 2, SCR.y0, 2, 0, 7); c.arc((SCR.x0 + SCR.x1) / 2, SCR.y1, 2, 0, 7); c.fill();
    label(c, P, (SCR.x0 + SCR.x1) / 2, SCR.y1 + 12, "🩻 " + (FR() ? "Paravent" : "ستارة"));
    // the central monitor cart
    var m = S.mon; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, m.x + 2, m.y + 3, m.w, m.h, 5); c.fill();
    var mg = c.createLinearGradient(0, m.y, 0, m.y + m.h); mg.addColorStop(0, "#3b4a54"); mg.addColorStop(1, "#1f2a31"); c.fillStyle = mg; rr(c, m.x, m.y, m.w, m.h, 5); c.fill();
    c.fillStyle = "#020617"; rr(c, m.x + 3, m.y + 3, m.w - 6, m.h - 9, 3); c.fill(); c.fillStyle = "rgba(61,245,154,.08)"; rr(c, m.x + 3, m.y + 3, m.w - 6, m.h - 9, 3); c.fill();
    // O₂ wall outlet + cylinder
    var x2 = S.o2; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, x2.x + 2, x2.y + 2, 20, x2.h, 4); c.fill();
    var og = c.createLinearGradient(x2.x, 0, x2.x + 20, 0); og.addColorStop(0, "#1f8a55"); og.addColorStop(0.5, "#34d399"); og.addColorStop(1, "#15803d"); c.fillStyle = og; rr(c, x2.x, x2.y, 20, x2.h, 4); c.fill();
    c.fillStyle = "#f8fafc"; c.beginPath(); c.arc(x2.x + 10, x2.y + 6, 3, 0, 7); c.fill(); c.fillStyle = "#1f8a55"; rr(c, x2.x + 23, x2.y + 2, 10, x2.h - 2, 5); c.fill(); c.fillStyle = "#e2e8f0"; c.beginPath(); c.arc(x2.x + 28, x2.y + 6, 2.2, 0, 7); c.fill();
    // the sink + the 🧴 hand-rub dispenser (29e 🧼 hygiène des mains)
    var sk = S.sink; c.fillStyle = "rgba(0,0,0,.16)"; rr(c, sk.x + 2, sk.y + 3, sk.w, sk.h, 8); c.fill(); c.fillStyle = nt ? "#cfdade" : "#f8fbfc"; rr(c, sk.x, sk.y, sk.w, sk.h, 8); c.fill(); c.strokeStyle = nt ? "#94a3b8" : "#cbd5e1"; c.lineWidth = 1; c.stroke();
    var sg = c.createRadialGradient(sk.x + 13, sk.y + 25, 2, sk.x + 13, sk.y + 25, 15); sg.addColorStop(0, "#e0f2fe"); sg.addColorStop(1, "#9cc9d9"); c.fillStyle = sg; c.beginPath(); c.ellipse(sk.x + 13, sk.y + 25, 8, 15, 0, 0, 7); c.fill();
    c.fillStyle = "#94a3b8"; c.fillRect(sk.x + 20, sk.y + 22, 7, 3); c.beginPath(); c.arc(sk.x + 13, sk.y + 25, 1.6, 0, 7); c.fillStyle = "#64748b"; c.fill();
    c.fillStyle = "#e2e8f0"; rr(c, sk.x + 6, sk.y - 14, 14, 11, 3); c.fill(); c.fillStyle = "#38bdf8"; rr(c, sk.x + 8, sk.y - 12, 10, 5, 2); c.fill(); c.fillStyle = "#475569"; c.fillRect(sk.x + 11, sk.y - 3, 4, 2);
    // the emergency cart (drawers, handle), the defibrillator, the drug cabinet (glass, boxes), the desk (computer, phone, files)
    var ca = S.cart; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, ca.x + 4, ca.y + 5, ca.w - 4, ca.h - 4, 6); c.fill();
    var cg = c.createLinearGradient(0, ca.y, 0, ca.y + ca.h); cg.addColorStop(0, "#ef4444"); cg.addColorStop(1, "#b91c1c"); c.fillStyle = cg; rr(c, ca.x + 2, ca.y + 2, ca.w - 4, ca.h - 4, 6); c.fill();
    c.fillStyle = "rgba(255,255,255,.22)"; for (var dr = 0; dr < 3; dr++) rr(c, ca.x + 7, ca.y + 6 + dr * 11, ca.w - 14, 8, 2), c.fill();
    c.fillStyle = "#fff"; c.fillRect(ca.x + ca.w / 2 - 2, ca.y + 9, 4, 12); c.fillRect(ca.x + ca.w / 2 - 6, ca.y + 13, 12, 4); c.fillStyle = "#e5e7eb"; c.fillRect(ca.x + 4, ca.y - 1, ca.w - 8, 3);
    var df = S.defib; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, df.x + 2, df.y + 3, df.w, df.h, 6); c.fill(); var dg2 = c.createLinearGradient(0, df.y, 0, df.y + df.h); dg2.addColorStop(0, "#fbbf24"); dg2.addColorStop(1, "#d97706"); c.fillStyle = dg2; rr(c, df.x, df.y, df.w, df.h, 6); c.fill();
    c.fillStyle = "#111827"; rr(c, df.x + 5, df.y + 5, df.w - 10, 13, 2); c.fill(); c.strokeStyle = "#22c55e"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(df.x + 7, df.y + 12); c.lineTo(df.x + 12, df.y + 12); c.lineTo(df.x + 14, df.y + 8); c.lineTo(df.x + 16, df.y + 15); c.lineTo(df.x + 18, df.y + 12); c.lineTo(df.x + df.w - 7, df.y + 12); c.stroke();
    c.fillStyle = "#1f2937"; c.beginPath(); c.arc(df.x + 10, df.y + 31, 4.5, 0, 7); c.arc(df.x + df.w - 10, df.y + 31, 4.5, 0, 7); c.fill();
    var dg = S.drugs; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, dg.x + 2, dg.y + 3, dg.w, dg.h, 5); c.fill(); c.fillStyle = nt ? "#2c4b5c" : "#e6f4fa"; rr(c, dg.x, dg.y, dg.w, dg.h, 5); c.fill(); c.strokeStyle = nt ? "#5b8aa3" : "#94b9cc"; c.lineWidth = 1; c.stroke();
    var pills = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
    for (var sh = 0; sh < 4; sh++) { c.fillStyle = nt ? "#1c3442" : "#c9e3ef"; c.fillRect(dg.x + 3, dg.y + 21 + sh * 22, dg.w - 6, 1.5); for (var pp = 0; pp < 3; pp++) { c.fillStyle = pills[(sh + pp) % 6]; rr(c, dg.x + 5 + pp * 8, dg.y + 11 + sh * 22, 6, 9, 1.5); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(dg.x + 6 + pp * 8, dg.y + 13 + sh * 22, 4, 2); } }
    c.fillStyle = nt ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.35)"; c.fillRect(dg.x + 2, dg.y + 2, 6, dg.h - 4);
    var ph = S.phone; c.fillStyle = "rgba(0,0,0,.18)"; rr(c, ph.x + 2, ph.y + 3, ph.w, ph.h, 6); c.fill(); var wg = c.createLinearGradient(0, ph.y, 0, ph.y + ph.h); wg.addColorStop(0, nt ? "#7a5f40" : "#d7b07c"); wg.addColorStop(1, nt ? "#5b4530" : "#b98b55"); c.fillStyle = wg; rr(c, ph.x, ph.y, ph.w, ph.h, 6); c.fill();
    c.fillStyle = "#1f2a30"; rr(c, ph.x + 46, ph.y + 4, 34, 18, 3); c.fill(); c.fillStyle = "#5fd6c6"; c.fillRect(ph.x + 49, ph.y + 7, 28, 12); c.fillStyle = "#334155"; c.fillRect(ph.x + 60, ph.y + 22, 6, 4);
    c.fillStyle = "#c0392b"; rr(c, ph.x + 10, ph.y + 9, 22, 14, 5); c.fill(); c.fillStyle = "#fef3c7"; rr(c, ph.x + 84, ph.y + 6, 10, 13, 1.5); c.fill();
    for (var k in LBL) { var s2 = S[k]; label(c, P, LBL[k][0], LBL[k][1], s2.ic + " " + T(s2) + (k === "phone" ? " · 📁" : "")); }
    return o;
  }
  var SC = { ok: "#16a34a", impr: "#ca8a04", unst: "#ea580c", crit: "#dc2626", lost: "#475569" };
  function patient(P, x, s, t) {
    var cxp = s.x + s.w / 2, v = x.v, br = x.st === "lost" ? 0 : Math.sin(t * Math.PI * 2 * Math.max(6, v.fr) / 60) * 1.4, done = x.done;
    // 29e 🎨 his body under the blanket (it rises with his breathing) and his arms on top of it
    var blc = s === E.stations.bed2 ? P.b2 : P.b1;
    cx.fillStyle = "rgba(0,0,0,.10)"; rr(cx, cxp - 19 - br / 2, s.y + 52, 38 + br, 88, 16); cx.fill();
    cx.fillStyle = blc; rr(cx, cxp - 18 - br / 2, s.y + 48, 36 + br, 86, 16); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.28)"; rr(cx, cxp - 13 - br / 2, s.y + 52, 14 + br / 2, 74, 8); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.5)"; rr(cx, cxp - 20 - br / 2, s.y + 46, 40 + br, 8, 4); cx.fill();
    var lk = look(x.p), sk0 = x.st === "lost" ? "#b8c2c8" : lk.skin; cx.fillStyle = sk0; rr(cx, cxp - 22 - br / 2, s.y + 56, 6, 26, 3); cx.fill(); rr(cx, cxp + 16 + br / 2, s.y + 56, 6, 26, 3); cx.fill();
    // 29g 👕 his own clothes (hospital gown in his colour) between the pillow and the blanket — the same look() as in the waiting room
    cx.fillStyle = "rgba(0,0,0,.12)"; rr(cx, cxp - 17, s.y + 31, 34, 20, 8); cx.fill();
    cx.fillStyle = lk.clo; rr(cx, cxp - 16, s.y + 30, 32, 20, 8); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.55)"; cx.beginPath(); cx.moveTo(cxp - 6, s.y + 30); cx.lineTo(cxp, s.y + 37); cx.lineTo(cxp + 6, s.y + 30); cx.closePath(); cx.fill();   // the collar
    var sk = lk.skin; if (x.st === "lost") sk = "#b8c2c8"; else if (v.spo2 < 88) sk = "#c4d2d8"; else if (v.sys < 85) sk = "#ead8c8"; else if (v.t >= 38.5) sk = "#f0a98f";
    var hx = cxp, hy = s.y + 23;
    if (lk.hij) { cx.fillStyle = lk.clo; cx.beginPath(); cx.arc(hx, hy, 14.5, 0, 7); cx.fill(); cx.strokeStyle = "rgba(0,0,0,.25)"; cx.lineWidth = 1; cx.stroke(); }
    else if (x.p.sex === "f") { cx.fillStyle = lk.hair; cx.beginPath(); cx.ellipse(hx, hy - 1, 15, 14, 0, 0, 7); cx.fill(); }   // her hair spread on the pillow
    cx.fillStyle = sk; cx.beginPath(); cx.arc(hx, hy, 11.5, 0, 7); cx.fill(); cx.strokeStyle = "rgba(60,35,20,.45)"; cx.lineWidth = 1; cx.stroke();
    if (!lk.hij) { cx.fillStyle = lk.hair; cx.beginPath(); cx.arc(hx, hy - 3.5, 12, Math.PI * 1.02, Math.PI * 1.98); cx.fill(); }
    if (lk.old && !lk.hij) { cx.strokeStyle = "rgba(90,58,42,.45)"; cx.lineWidth = 0.7; cx.beginPath(); cx.moveTo(hx - 5, hy - 4.5); cx.lineTo(hx - 2, hy - 4.5); cx.moveTo(hx + 2, hy - 4.5); cx.lineTo(hx + 5, hy - 4.5); cx.stroke(); }   // the old man's lined forehead
    var pn = painOf(x.p); cx.strokeStyle = "#7a3b2a"; cx.lineWidth = 1; cx.beginPath();          // his mouth: a frown when it hurts
    if (pn >= 6 && x.st !== "lost") { cx.arc(hx, hy + 8.5, 3, Math.PI * 1.15, Math.PI * 1.85); } else { cx.moveTo(hx - 2.5, hy + 6); cx.quadraticCurveTo(hx, hy + 7.5, hx + 2.5, hy + 6); } cx.stroke();
    if (pn >= 6 && x.st !== "lost" && v.gcs > 9) { cx.strokeStyle = "#5a3a2a"; cx.beginPath(); cx.moveTo(hx - 6, hy - 3); cx.lineTo(hx - 2.5, hy - 1.8); cx.moveTo(hx + 6, hy - 3); cx.lineTo(hx + 2.5, hy - 1.8); cx.stroke(); }
    cx.strokeStyle = "#5a3a2a"; cx.lineWidth = 1.1; cx.beginPath(); if (v.gcs <= 9 || x.st === "lost") { cx.moveTo(hx - 6, hy + 1); cx.lineTo(hx - 2, hy + 1); cx.moveTo(hx + 2, hy + 1); cx.lineTo(hx + 6, hy + 1); } else { cx.arc(hx - 4, hy + 1, 1.2, 0, 7); cx.moveTo(hx + 5.2, hy + 1); cx.arc(hx + 4, hy + 1, 1.2, 0, 7); } cx.stroke();
    if (done.o2) { cx.fillStyle = "rgba(52,211,153,.55)"; cx.beginPath(); cx.ellipse(hx, hy + 5, 6, 4.5, 0, 0, 7); cx.fill(); }
    if (done.mon) { cx.strokeStyle = "rgba(37,99,235,.55)"; cx.lineWidth = 0.9; cx.beginPath(); cx.moveTo(cxp, s.y + 70); cx.quadraticCurveTo((cxp + E.stations.mon.x) / 2, s.y + 20, E.stations.mon.x + 19, E.stations.mon.y + E.stations.mon.h); cx.stroke(); }
    if (done.vvp) { var px = s.k === "b" ? s.x - 4 : s.x + s.w + 4, py = s.y + 54; cx.strokeStyle = "#60a5fa"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(px, py - 8); cx.quadraticCurveTo(px, py + 18, cxp + (s.k === "b" ? -16 : 16), s.y + 78); cx.stroke(); cx.fillStyle = done.sang ? "#dc2626" : "#7cc4ef"; rr(cx, px - 5, py - 21, 10, 13, 3); cx.fill(); }
    if (x.screen && !x.over) {                                  // 28y 🩻 his curtain is closed: the space between his bed and the paravent is screened
      var sx0 = s.k === "b" ? SCR.x1 + 3 : s.x + s.w + 9, sx1 = s.k === "b" ? s.x - 9 : SCR.x0 - 3;
      cx.fillStyle = night() ? "rgba(93,134,163,.22)" : "rgba(147,197,232,.28)"; rr(cx, sx0, s.y - 2, sx1 - sx0, s.h + 4, 6); cx.fill();
      cx.strokeStyle = night() ? "rgba(93,134,163,.7)" : "rgba(96,165,214,.75)"; cx.lineWidth = 1.2; cx.setLineDash([4, 3]); cx.beginPath(); cx.moveTo(sx0, s.y - 2); cx.lineTo(sx1, s.y - 2); cx.moveTo(sx0, s.y + s.h + 2); cx.lineTo(sx1, s.y + s.h + 2); cx.stroke(); cx.setLineDash([]);
    }
    if (done.acc) { cx.fillStyle = "#fde68a"; rr(cx, cxp + 12, s.y + 96, 9, 5, 2); cx.fill(); }
    // status halo + name label
    var col = SC[x.st] || SC.unst, a = x.st === "crit" ? 0.35 + 0.3 * Math.sin(t * 6) : 0.5;
    cx.strokeStyle = col; cx.globalAlpha = a; cx.lineWidth = 3; rr(cx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 12); cx.stroke(); cx.globalAlpha = 1;
    label(cx, P, cxp, s.y + s.h + 12, "🛏️ " + T(x.p.nm).split(" ")[0] + " · " + L.stLabel(x.st).split(" ")[0], col);
    if (x.over && !(st && st.end)) {                             // 28x: a finished bed is greyed with its result on it; the other bed stays alive
      cx.fillStyle = night() ? "rgba(15,23,42,.5)" : "rgba(226,232,240,.6)"; rr(cx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 12); cx.fill();
      label(cx, P, cxp, s.y + s.h / 2 + 4, x.over.w === "ok" ? "✅ " + (FR() ? "Stabilisé" : x.p.sex === "f" ? "استقرّت" : "استقرّ") : "💔 " + (FR() ? "Décédé" : "خسرناه"), col);
    }
  }
  // 29d: is this bed's patient inside (brought in by a nurse)? — read from the shared doc, cached a second
  var admC = {}, admAt = 0;
  function inBed(x) { if (!x || x.ghost) return false; if (x.over) return true; var dk = L.dep(), now = Date.now(); if (now - admAt > 1000) { admC = {}; admAt = now; }
    var key = dk + x.k; if (!(key in admC)) admC[key] = !!L.admOf(dk, x.k, st && st.amb && st.amb.i); return admC[key]; }
  // 29e 📟 a bedside monitor: his heart rate + a moving ECG when he is wired («📟 Monitorage» done), a dim standby line otherwise
  function monTrace(mp, x, t) {
    if (!mp) return; var X0 = mp.x + 2, Y0 = mp.y + 2, Wd = 18, on = !!(x && x.done && x.done.mon && x.v);
    cx.lineWidth = 0.9; cx.strokeStyle = on ? (x.st === "crit" ? "#f87171" : "#4ade80") : "rgba(74,222,128,.25)"; cx.beginPath();
    for (var i = 0; i <= Wd; i++) { var yv = 0; if (on) { var ph = (i / Wd * 1.6 + t * Math.max(30, x.v.fc || 60) / 60) % 1; yv = ph < 0.16 ? 0 : ph < 0.19 ? -0.8 : ph < 0.23 ? 4.2 : ph < 0.27 ? -1.6 : ph > 0.45 && ph < 0.55 ? 0.9 : 0; } cx[i ? "lineTo" : "moveTo"](X0 + i, Y0 + 7 - yv); }
    cx.stroke();
    if (on) { cx.font = "700 4.6px " + EMO; cx.fillStyle = "#4ade80"; cx.textAlign = "right"; cx.textBaseline = "top"; cx.direction = "ltr"; cx.fillText(String(Math.round(x.v.fc || 0)), X0 + Wd, Y0 + 0.2);
      if (Math.sin(t * Math.PI * 2 * (x.v.fc || 60) / 60) > 0.85) { cx.fillStyle = "#f87171"; cx.beginPath(); cx.arc(X0 + 2, Y0 + 2, 1, 0, 7); cx.fill(); } }
  }
  function draw(t) {
    if (!cv || !cx || !cv.width || !E) return;
    var svc = svcRoom();
    if (!bg) bg = svc ? svcBg(L.dep()) : room();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(bg, 0, 0); cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var P = pal(), S = E.stations, dk0 = L.dep();
    if (svc) { svcDraw(P, dk0, t); }
    else {
    if (dk0 !== "er") label(cx, P, E.W / 2, 7, depName(dk0), DCOL[dk0]);
    if (st) {
      var m = S.mon, on = st.P.filter(function (x) { return x.done.mon && inBed(x); });
      on.forEach(function (x, j) { cx.strokeStyle = j ? "#7dd3fc" : "#3df59a"; cx.lineWidth = 1; cx.beginPath(); for (var i = 0; i <= 30; i++) { var ph = (i / 30 * 2 + t * (x.v.fc || 0) / 60) % 1, yv = ph < 0.16 ? 0 : ph < 0.18 ? -1 : ph < 0.21 ? 6 : ph < 0.24 ? -2 : 0; cx[i ? "lineTo" : "moveTo"](m.x + 4 + i, m.y + 10 + j * 10 - yv); } cx.stroke(); });
      st.P.forEach(function (x, i) { if (x.ghost) return; var s = i ? S.bed2 : S.bed1; s.k = pk(i);
        var gone = isHome(x); monTrace(MONP[pk(i)], !gone && inBed(x) ? x : null, t);                          // 29e 📟 the bedside monitor
        if (gone) { label(cx, P, s.x + s.w / 2, s.y + s.h / 2 + 6, u("dcGone"), "#0f766e"); label(cx, P, s.x + s.w / 2, s.y + s.h + 12, "🚪 " + T(x.p.nm).split(" ")[0] + " · " + u("dcHome"), "#64748b"); return; }
        if (inBed(x)) { patient(P, x, s, t); if (LCa) fuBadge(P, x, s, t); routMarks(P, x, s, t); }
        else { cx.fillStyle = night() ? "rgba(15,23,42,.35)" : "rgba(255,255,255,.55)"; rr(cx, s.x + 5, s.y + 40, s.w - 10, s.h - 46, 7); cx.fill();
          label(cx, P, s.x + s.w / 2, s.y + s.h / 2 + 6, u("waitBed"), "#0d9488"); label(cx, P, s.x + s.w / 2, s.y + s.h + 12, "🛏️ " + T(x.p.nm).split(" ")[0] + " · 🪑", "#64748b"); }
      });
    }
    }
    if (mark) { mark.t += 1 / 60; var r2 = 4 + (mark.t * 20) % 10; cx.strokeStyle = "rgba(15,118,110,.7)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(mark.x, mark.y, r2, 0, 7); cx.stroke(); }
    asstDraw(P);                                                  // 29p 🧑‍⚕️ under the nurses
    peersDraw(P, t);
    nurseDraw(P, t);
    meTag();
    asstBubble(P);
  }
  /* 29p 🧑‍⚕️🚶 my own assistant nurse, drawn in the room beside me (assets/liveasst.js = his follow + «بدّك ساعدك؟» logic). Local only:
     not in presence, not in the shared doc. He moves inside the existing loop; standing still he costs nothing extra (idle 12 fps). */
  function asstTick(ts, dt) {
    if (!asst || !AS || !E) return;
    if (!(trv && trv.ph === 2)) AS.follow(asst, nurse, dt, E.W, E.H);
    if (!offer) return; var now = nowMs(), walking = !!(nurse.pts.length || trv || asst.mv);
    if (walking) AS.seen(offer, now);                            // moving = activity
    if (offer.shown) { if (AS.expired(offer, now) || helpOpen) AS.hide(offer, now); return; }
    if (sheet || panel || helpOpen || !st) return;
    if (AS.should(offer, now, walking)) { AS.show(offer, now); kick(); }
  }
  function asstDraw(P) {
    if (!asst || (trv && trv.ph === 2)) return;
    var sw = asst.mv ? Math.sin(asst.walkT * 12) : 0;
    cx.fillStyle = "rgba(0,0,0,.15)"; cx.beginPath(); cx.ellipse(asst.x + 1.5, asst.y + 3.5, 11, 8, 0, 0, 7); cx.fill();
    scrubs(asst.x, asst.y, asst.dir, sw, null, 1.15, P, "#16a34a", "#f8fafc", "#22c55e");      // green scrubs + a white cap = the assistant
    if (!(offer && offer.shown)) label(cx, P, asst.x, asst.y - 15, "🧑‍⚕️ " + u("asNm"), "#16a34a");
  }
  function asstBubble(P) {
    asBtn = null; if (!asst || !offer || !offer.shown || (trv && trv.ph === 2)) return;
    var bw = 112, bh = 42, bx = Math.max(4, Math.min(E.W - bw - 4, asst.x - bw / 2)), by = Math.max(4, asst.y - 20 - bh);
    cx.fillStyle = "rgba(0,0,0,.12)"; rr(cx, bx + 1, by + 2, bw, bh, 9); cx.fill();
    cx.fillStyle = "#ffffff"; rr(cx, bx, by, bw, bh, 9); cx.fill(); cx.strokeStyle = "#16a34a"; cx.lineWidth = 1.3; cx.stroke();
    cx.beginPath(); cx.moveTo(asst.x - 5, by + bh); cx.lineTo(asst.x, by + bh + 6); cx.lineTo(asst.x + 5, by + bh); cx.closePath(); cx.fillStyle = "#ffffff"; cx.fill();
    cx.font = "700 9px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.direction = FR() ? "ltr" : "rtl"; cx.fillStyle = "#14532d";
    cx.fillText("🧑‍⚕️ " + u("asQ"), bx + bw / 2, by + 11);
    var y0 = by + 21, Y = { x: bx + 8, y: y0, w: 46, h: 16 }, N = { x: bx + bw - 54, y: y0, w: 46, h: 16 };
    if (!FR()) { var tmp = Y; Y = N; N = tmp; }                 // RTL: «ايه» on the right
    cx.fillStyle = "#16a34a"; rr(cx, Y.x, Y.y, Y.w, Y.h, 8); cx.fill(); cx.fillStyle = "#e2e8f0"; rr(cx, N.x, N.y, N.w, N.h, 8); cx.fill();
    cx.font = "700 9px " + EMO; cx.fillStyle = "#fff"; cx.fillText(u("asY"), Y.x + Y.w / 2, Y.y + Y.h / 2 + 0.5); cx.fillStyle = "#334155"; cx.fillText(u("asN"), N.x + N.w / 2, N.y + N.h / 2 + 0.5);
    asBtn = { y: Y, n: N, box: { x: bx, y: by, w: bw, h: bh } };
  }
  function inR(p, b, pad) { pad = pad || 3; return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad; }
  function asstHelp() { helpOpen = true; helpTxt = ""; helpPaint(); }   // the same box as the top-bar 🧑‍⚕️ (−1 · 3 per patient on «شو بعمل؟»)
  function asstTap(p) {
    if (!asst || !AS) return false; var now = nowMs();
    if (offer && offer.shown && asBtn) {
      if (inR(p, asBtn.y)) { AS.hide(offer, now); asstHelp(); return true; }
      if (inR(p, asBtn.n)) { AS.hide(offer, now); return true; }
      if (inR(p, asBtn.box, 0)) return true;
    }
    if (AS.hit(asst, p)) { if (offer && offer.shown) AS.hide(offer, now); if (helpOpen) { helpOpen = false; helpTxt = ""; helpPaint(); } else asstHelp(); return true; }
    return false;
  }
  function nurseDraw(P) {
    var x = nurse.x, y = nurse.y, a = nurse.dir, sw = nurse.pts.length ? Math.sin(nurse.walkT * 12) : LCa && workMine().length ? Math.sin(Date.now() / 90) * 0.8 : 0;   // 29d: his hands work
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 14, 10, 0, 0, 7); cx.fill();
    scrubs(x, y, a, sw, L.me().uid, 1.3, P, "#dc2626");                                     // 29d/29e: scrubs in the colour of his rank (👔 purple), a red ring = me
    if (hands.length) { cx.font = "9px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; hands.forEach(function (it, i) { var bx = x + (i ? 9 : -9) * (hands.length > 1 ? 1 : 0), by = y - 21; cx.fillStyle = "rgba(255,255,255,.92)"; cx.beginPath(); cx.arc(bx, by, 6.5, 0, 7); cx.fill(); cx.fillStyle = "#000"; cx.fillText((D.I[it] || {}).ic || "•", bx, by + 0.5); }); }
  }

  /* ---------------- 👥 the others in the room (assets/livepres.js) ---------------- */
  // 28z: everyone in the hospital (pAll, drawn on the floor strip); pList = only those standing in MY department (drawn in the room)
  function mine(l) { var dk = L.dep(); return l.filter(function (p) { return (p.dep || "er") === dk && (p.tdep || p.dep || "er") === dk; }); }
  function presChange() { var PR = w.LivePresRoom; pAll = PR ? PR.others() : []; pList = mine(pAll); presDiff(); pplPaint(); bedHint(); }
  function presDiff() {
    var LP = w.LivePres; if (!LP) return;
    if (pPrev) {
      var df = LP.diff(pPrev, pList);
      df.join.forEach(function (n) { pQ.left = pQ.left.filter(function (x) { return x !== n; }); if (pQ.join.indexOf(n) < 0) pQ.join.push(n); });
      df.left.forEach(function (n) { pQ.join = pQ.join.filter(function (x) { return x !== n; }); if (pQ.left.indexOf(n) < 0) pQ.left.push(n); });
    }
    pPrev = pList.slice(); presToast(Date.now());
  }
  // «👋 ريم فات» / «🚪 ريم طلع» — at most one every 4 s; names that come meanwhile wait and arrive together
  function presToast(now) {
    var LP = w.LivePres, el = q(".lcr-ptoast"); if (!el || (!pQ.join.length && !pQ.left.length) || !LP.toastOk(pToastT, now)) return;
    var j = pQ.join.length, t = j ? u(j > 1 ? "pinN" : "pin", { n: LP.names(pQ.join, FR()) }) : u(pQ.left.length > 1 ? "poutN" : "pout", { n: LP.names(pQ.left, FR()) });
    if (j) pQ.join = []; else pQ.left = [];
    el.textContent = t; el.classList.add("on"); pToastT = now; clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("on"); }, 2600);
  }
  function pplPaint() {
    var el = q(".lcr-ppl"), PR = w.LivePresRoom; if (!el) return;
    var on = !!(PR && PR.active()); el.hidden = !on; if (!on) return;
    var n = pList.length + 1, t = n > 1 ? u("ppl", { n: n }) : u("ppl1");
    if (el.textContent !== t) el.textContent = t; el.classList.toggle("many", n > 1);
  }
  function bedHint() {
    var el = q(".lcr-pbed"); if (!el || !sheet || sheet.kind !== "bed") return;
    var sk = w.LivePresRoom ? w.LivePresRoom.skew() : 0, ns = pList.filter(function (p) { return p.b === sheet.k && Date.now() + sk - p.at < 20000; }).map(function (p) { return p.n; });
    el.hidden = !ns.length; if (ns.length) el.textContent = u("pbed", { n: w.LivePres.names(ns, FR()) });
  }
  // every frame: send my place (throttled inside), age the list once a second, move each other student smoothly along his path
  function presFrame(dt) {
    var PR = w.LivePresRoom, LP = w.LivePres; if (!PR || !PR.active()) { if (pList.length || pAll.length) { pList = []; pAll = []; peers = {}; } return; }
    var tg = nurse.pts.length ? nurse.pts[nurse.pts.length - 1] : nurse;
    PR.tick(nurse, tg, sheet && sheet.kind === "bed" ? sheet.k : "", nurse.pts.length > 0 || !!trv, L.dep(), trv ? trv.to : L.dep());
    var now = Date.now(); if (now - pT > 1000) { pT = now; pAll = PR.others(); pList = mine(pAll); presDiff(); pplPaint(); bedHint(); }
    var seen = {};
    pList.forEach(function (p) {
      seen[p.uid] = 1; var e = peers[p.uid];
      if (!e) e = peers[p.uid] = { x: p.x, y: p.y, dir: -Math.PI / 2, pts: [], walkT: 0, key: "" };
      if (e.tx !== p.tx || e.ty !== p.ty || e.rx !== p.x || e.ry !== p.y) {          // news from him → walk from where I show him to where he goes
        e.rx = p.x; e.ry = p.y; e.tx = p.tx; e.ty = p.ty;
        var far = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) > LP.SNAP * 2.5; if (far) { e.x = p.x; e.y = p.y; }
        e.pts = G && Math.abs(p.tx - e.x) + Math.abs(p.ty - e.y) > 3 ? R.path(G, e, { x: p.tx, y: p.ty }) : [];
      }
      var mv = false;
      if (e.pts.length) { var r = R.walk(e, e.pts, dt); e.x = r.x; e.y = r.y; e.dir = r.dir; mv = true; }
      else if (Math.abs(e.tx - e.x) + Math.abs(e.ty - e.y) > 0.5) { var f = LP.follow(e, { x: e.tx, y: e.ty }, dt); e.x = f.x; e.y = f.y; e.dir = f.dir; mv = !f.jump; }
      e.walkT = mv ? e.walkT + dt : 0; e.mv = mv;
    });
    for (var k in peers) if (!seen[k]) delete peers[k];
  }
  // 29d 👔 the supervisor's free 🎯 (one per patient a day, kept on this phone)
  function supFree(k) {
    if (!w.NursinPay || !w.NursinPay.isSup()) return false;
    var key = C.dayKey(Date.now()) + "." + L.dep() + "." + k, m; try { m = JSON.parse(localStorage.getItem("nursin_sup_free_v1") || "{}"); } catch (e) { m = {}; }
    if (m[key]) return false; for (var x in m) if (x.indexOf(C.dayKey(Date.now())) !== 0) delete m[x]; m[key] = 1; try { localStorage.setItem("nursin_sup_free_v1", JSON.stringify(m)); } catch (e) {} return true;
  }
  function tagOf(uid) { return w.NursinPay ? w.NursinPay.tagOf(uid) : null; }
  function rankIc(uid) { var t = tagOf(uid); return t ? (t.sup ? w.NursinPay.core.SUP.ic : t.r.ic) : ""; }
  function rankCol(uid, dflt) { var t = tagOf(uid); return t ? (t.sup ? w.NursinPay.core.SUP.col : t.r.col) : dflt; }
  function avI(k) {
    if (!k || !w.LivePres.AVRE.test(k)) return null; var im = avImg[k];
    if (!im) { im = avImg[k] = new Image(); im.onload = function () { im.ok = 1; }; im.src = "assets/avatars/" + k + ".webp"; }
    return im.ok ? im : null;
  }
  // the avatar disc + the first name above it, drawn once into a small canvas (redrawn when the zoom, theme or picture changes)
  function sprite(p, e) {
    var img = avI(p.av), rk = rankIc(p.uid), key = (p.av || "") + "|" + p.n + "|" + rk + "|" + night() + "|" + scale + "|" + (img ? 1 : 0);
    if (rk) p = { uid: p.uid, av: p.av, n: p.n + " · " + rk };                                    // 29d ⬆️ the rank on the name tag (👔 the floor supervisor)
    if (e.key === key && e.spr) return e.spr;
    var k = scale * dpr, c = d.createElement("canvas"), g = c.getContext("2d"), P = pal();
    g.font = "700 8px " + EMO; var tw = Math.ceil(g.measureText(p.n).width) + 10, wd = Math.max(26, tw), ht = 38;
    c.width = Math.ceil(wd * k); c.height = Math.ceil(ht * k); g = c.getContext("2d"); g.setTransform(k, 0, 0, k, 0, 0);
    var col = w.LivePres.color(p.uid), cxp = wd / 2, cy = 26;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cxp, cy, 11, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(cxp, cy, 9.5, 0, 7); g.clip();
    if (img) g.drawImage(img, cxp - 9.5, cy - 9.5, 19, 19);
    else { g.fillStyle = col; g.fillRect(cxp - 10, cy - 10, 20, 20); g.fillStyle = "#fff"; g.font = "800 10px " + EMO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(Array.from(p.n || "?")[0] || "?", cxp, cy + 0.5); }
    g.restore(); g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.arc(cxp, cy, 10.6, 0, 7); g.stroke();
    g.font = "700 8px " + EMO; g.fillStyle = P.lb; rr(g, cxp - tw / 2, 0, tw, 13, 6.5); g.fill();
    g.fillStyle = P.ink; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = FR() ? "ltr" : "rtl"; g.fillText(p.n, cxp, 7);
    e.key = key; e.spr = { c: c, w: wd, h: ht }; return e.spr;
  }
  function peerBody(x, y, a, sw, col, P, uid) {
    cx.fillStyle = "rgba(0,0,0,.16)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 13, 9, 0, 0, 7); cx.fill();
    scrubs(x, y, a, sw, uid, 1.2, P, null, col);
  }
  // 29e 🎨 a nurse seen from above: scrubs top + sleeves in the colour of the RANK (🎓 sky · 🩺 teal · ⭐ navy · 👔 purple), arms swinging,
  // a scrub cap (his own colour), a stethoscope from 🩺 ممرّض up, the 👔 supervisor's white collar
  var SCRUB = { tr: "#5aa9d6", nu: "#14b8a6", sr: "#1e3a8a", sup: "#7c3aed" };
  function scrubsCol(uid) { var t = tagOf(uid); return !t ? SCRUB.tr : t.sup ? SCRUB.sup : SCRUB[t.r.k] || SCRUB.tr; }
  function scrubs(x, y, a, sw, uid, k, P, ring, cap, colX) {
    var col = colX || scrubsCol(uid), t = (uid && tagOf(uid)) || {}, rk = t.sup ? "sup" : (t.r && t.r.k) || "tr";
    cx.save(); cx.translate(x, y); cx.scale(k, k); cx.rotate(a + Math.PI / 2);
    cx.fillStyle = P.skin; [[-9, sw * 4], [9, -sw * 4]].forEach(function (p) { cx.beginPath(); cx.arc(p[0], p[1] + 1.5, 2.3, 0, 7); cx.fill(); });            // hands
    cx.fillStyle = col; [[-8.5, sw * 4], [8.5, -sw * 4]].forEach(function (p) { rr(cx, p[0] - 2.6, p[1] - 4, 5.2, 6, 2.2); cx.fill(); });                 // sleeves
    cx.fillStyle = col; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.18)"; cx.beginPath(); cx.ellipse(-2, -0.5, 6, 3.5, 0, 0, 7); cx.fill();
    cx.strokeStyle = "rgba(0,0,0,.25)"; cx.lineWidth = 0.7; cx.beginPath(); cx.moveTo(-3, -5); cx.lineTo(0, -1.5); cx.lineTo(3, -5); cx.stroke();          // V neck
    if (rk === "sup") { cx.fillStyle = "#f8fafc"; cx.beginPath(); cx.moveTo(-4, -5.2); cx.lineTo(0, -2.2); cx.lineTo(4, -5.2); cx.lineTo(2.5, -6); cx.lineTo(0, -4); cx.lineTo(-2.5, -6); cx.fill(); }
    if (rk !== "tr") { cx.strokeStyle = "#111827"; cx.lineWidth = 0.9; cx.beginPath(); cx.arc(0, -2.5, 5.2, 0.15 * Math.PI, 0.85 * Math.PI); cx.stroke(); cx.fillStyle = "#94a3b8"; cx.beginPath(); cx.arc(3.8, 3, 1.3, 0, 7); cx.fill(); }
    cx.fillStyle = "#f8fafc"; rr(cx, 4, 0.5, 3, 2.2, 0.6); cx.fill();                                                                                      // ID badge
    if (ring) { cx.strokeStyle = ring; cx.lineWidth = 1.4; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.stroke(); }
    cx.fillStyle = P.skin; cx.beginPath(); cx.arc(0, -1, 5.6, 0, 7); cx.fill();
    cx.fillStyle = cap || col; cx.beginPath(); cx.arc(0, -0.2, 5.8, Math.PI * 0.05, Math.PI * 0.95, false); cx.fill();                                      // scrub cap
    cx.fillStyle = "rgba(255,255,255,.3)"; cx.beginPath(); cx.arc(0, 1.2, 3.2, Math.PI * 0.2, Math.PI * 0.8); cx.fill();
    cx.restore();
  }
  function handIc(x, y) { cx.fillStyle = "#7c3aed"; cx.beginPath(); cx.arc(x, y, 7, 0, 7); cx.fill(); cx.font = "8px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillStyle = "#fff"; cx.fillText("✋", x, y + 0.5); }
  function peersDraw(P) {
    if (!pList.length) return;
    var LP = w.LivePres, now = Date.now() + (w.LivePresRoom ? w.LivePresRoom.skew() : 0), on = { a: [], b: [] };
    // 29d (Abdullah 7:20 AM «الشخصيات يكونوا فوق بعض»): everybody standing at the same spot gets his own slot around it and no name tag covers another
    var items = [], M0 = L.me();
    pList.forEach(function (p) { var e = peers[p.uid]; if (!e || LP.alpha(now - p.at) <= 0) return; var s0 = sprite(p, e); items.push({ id: p.uid, x: e.x, y: e.y, w: s0.w, h: s0.h, mv: e.mv }); });
    if (items.length) items.push({ id: "__me", x: nurse.x, y: nurse.y, w: 44, h: 38, fix: 1, mv: nurse.pts.length > 0 });
    var at = LP.spread ? LP.spread(items) : {};
    pList.forEach(function (p) {
      var e = peers[p.uid]; if (!e) return; var a = LP.alpha(now - p.at); if (a <= 0) return;
      var ps = at[p.uid] || e; cx.globalAlpha = a;
      peerBody(ps.x, ps.y, e.dir, e.mv ? Math.sin(e.walkT * 12) : 0, LP.color(p.uid), P, p.uid);
      var s = sprite(p, e); cx.drawImage(s.c, ps.x - s.w / 2, ps.y - 5 - s.h, s.w, s.h);
      if (p.b && a > 0.6) { on[p.b].push(p.n); handIc(ps.x + 12, ps.y - 17); }
      cx.globalAlpha = 1;
    });
    ["a", "b"].forEach(function (k) { if (!on[k].length) return; var s = E.stations[k === "a" ? "bed1" : "bed2"]; label(cx, P, s.x + s.w / 2, s.y - 7, "✋ " + LP.names(on[k], FR()), "#7c3aed"); });
  }
  // my own disc + «إنت» above my nurse, once someone else is in the room (so everybody looks the same on every phone)
  function meTag() {
    mySpr = mySpr || { key: "" };
    var M = L.me(), s = sprite({ uid: M.uid, n: u("pme"), av: w.LivePresRoom ? w.LivePresRoom.myAv() : "" }, mySpr);
    cx.drawImage(s.c, nurse.x - s.w / 2, nurse.y - 7 - s.h, s.w, s.h);
    if (sheet && sheet.kind === "bed") handIc(nurse.x + 12, nurse.y - 19);
    if (LCa) workRing(nurse.x, nurse.y - 7 - s.h - 12);           // 29d ⏳ the ring above his name tag
  }
  function toL(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function onTap(e) { kick(); if (offer) AS.seen(offer, nowMs());
    if (trv) { e.preventDefault(); return; }
    if (!sheet && !panel && asstTap(toL(e))) { e.preventDefault(); return; }   // 29p 🧑‍⚕️ tap him / his ايه · لأ
    // 29h 🏥 (Abdullah, Nov 4 9:38 PM): the hospital never locks — after the daily case the room stays walkable (doors, 🛗, 🪑, beds = their steps)
    if (svcRoom()) { if (sheet || panel) return; e.preventDefault(); return svcTap(toL(e)); }
    if (sheet || panel || !G) return; e.preventDefault();
    var p = toL(e), k = R.hitStation(p.x, p.y, 6);
    if (k) return goTo(k);
    nurse.goal = null; nurse.pts = R.path(G, nurse, p); mark = { x: p.x, y: p.y, t: 0 };
  }
  function goTo(k) {
    if (!G) return arrive(k);
    var s = E.stations[k].spot, dx = s.x - nurse.x, dy = s.y - nurse.y;
    if (dx * dx + dy * dy < 25) { nurse.pts = []; return arrive(k); }
    nurse.goal = k; nurse.pts = R.path(G, nurse, s); mark = { x: s.x, y: s.y, t: 0 };
    if (!nurse.pts.length) { nurse.goal = null; arrive(k); }
  }
  function arrive(k) {
    if (typeof k === "object" && k) return svcArrive(k);                 // 29d: a spot of a service room (a chair, the desk, the counter)
    var S = E.stations[k]; nurse.dir = Math.atan2((S.y + S.h / 2) - nurse.y, (S.x + S.w / 2) - nurse.x);
    if ((k === "bed1" || k === "bed2") && st && !st.end) { var xw = X(k === "bed1" ? "a" : "b"); if (xw && !xw.ghost && isHome(xw)) return say("neutral", u("dcGoneT", { n: nm(xw).split(" ")[0] }), u("dcGoneW")); if (xw && !xw.ghost && !inBed(xw)) return waitSheet(xw); }
    if (k === "bed2" && X("b") && X("b").ghost) return say("neutral", u("bed2Empty"));
    if (k === "bed1" || k === "bed2") return bedSheet(k === "bed1" ? "a" : "b", "care");
    if (k === "sink") return rub(true);                                                     // 29e 🧼 the sink: wash + its moment (before / after)
    if (k === "phone") return deskSheet();
    stationSheet(k);
  }



  /* ---------------- 29d 🪑 the waiting room + 🏷️ triage · 💰 المحاسبة ----------------
     Every bed starts empty (Abdullah, Nov 4 7:17 AM «الممرّض هو يلّي بفوّتن لجوّا»): the patients sit in the waiting room on the ground
     floor (the ambulance patient on his stretcher by the ER door), each a little drawn character with his own face, clothes, age and
     what he says; a student walks to one, reads his quick signs and chooses 1️⃣ the priority and 2️⃣ the ward — the right ward brings him
     in (his case starts there and the student wheels him over), a wrong ward leaves him waiting. 💰 المحاسبة = the payslip (assets/livepay.js). */
  var SEATS = [], SEAT_X = [52, 127, 202], SEAT_Y = [200, 305, 410, 515], STRET = { x: 298, y: 330 }, PS = 1.4, DESK = { x: 110, y: 40, w: 140, h: 50 };
  SEAT_Y.forEach(function (y) { SEAT_X.forEach(function (x) { SEATS.push({ x: x, y: y }); }); });
  var SKIN = ["#f1c7a5", "#e3b089", "#c98f66", "#8d5a3b"], CLO = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2", "#be123c", "#4b5563"], HAIR = ["#3b2a1e", "#1f1a17", "#6b4423", "#a16207"];
  function wkey(x) { return x.dk + "." + (x.ai | 0) + "." + x.pk; }
  function seated() {                         // the waiting list on its chairs (the stretcher for the ambulance patient)
    var L0 = waitList().slice().sort(function (a, b) { return a.since - b.since || (wkey(a) < wkey(b) ? -1 : 1); }), out = [], si = 0;
    L0.forEach(function (x) { if (x.kind === "amb") out.push({ x: x, at: { x: STRET.x, y: STRET.y, str: 1 }, spot: { x: STRET.x - 52, y: STRET.y } }); else if (si < SEATS.length) { var s = SEATS[si++]; out.push({ x: x, at: s, spot: { x: s.x + 34, y: s.y + 30 } }); } });
    return out;
  }
  function look(p) { var h = C.hash(T(p.nm) + p.age), old = (p.age | 0) >= 65; return { skin: SKIN[h % 4], clo: CLO[(h >> 3) % 8], hair: old ? (h % 2 ? "#d1d5db" : "#e5e7eb") : HAIR[(h >> 5) % 4], hij: p.sex === "f" && (h >> 7) % 3 === 0, old: old }; }
  function painOf(p) { if (p.eva != null) return p.eva | 0; var t = (p.who && (p.who.ar + " " + p.who.fr)) || ""; return /وجع|douleur/i.test(t) ? 7 : /نزيف|hémorragie|saign/i.test(t) ? 6 : 2; }
  function sayOf(p) { return T(p.say || p.who) || ""; }
  // one seated character (front view): chair, legs, body, arms, head with face (pain → frown + sweat; drowsy → closed eyes), hair / hijab
  function person(c, x, y, p, t, sel) {
    var lk = look(p), v = p.vit || {}, pain = painOf(p), drowsy = (v.gcs | 0) && v.gcs <= 12, br = Math.sin(t * 2 + x) * 0.6;
    c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(x, y + 30, 22, 6, 0, 0, 7); c.fill();
    c.fillStyle = night() ? "#475569" : "#94a3b8"; rr(c, x - 19, y - 18, 38, 26, 6); c.fill();               // chair back
    c.fillStyle = night() ? "#64748b" : "#cbd5e1"; rr(c, x - 21, y + 6, 42, 12, 5); c.fill();                 // seat
    c.fillStyle = "#334155"; c.fillRect(x - 18, y + 17, 3, 12); c.fillRect(x + 15, y + 17, 3, 12);
    c.fillStyle = "#1e293b"; rr(c, x - 10, y + 12, 8, 17, 3); c.fill(); rr(c, x + 2, y + 12, 8, 17, 3); c.fill();  // legs
    c.fillStyle = "#111827"; rr(c, x - 11, y + 27, 10, 4, 2); c.fill(); rr(c, x + 1, y + 27, 10, 4, 2); c.fill();
    c.fillStyle = lk.clo; rr(c, x - 12, y - 12 + br, 24, 26, 8); c.fill();                                     // body
    c.fillStyle = "rgba(255,255,255,.18)"; rr(c, x - 12, y - 12 + br, 24, 9, 8); c.fill();
    c.fillStyle = lk.clo; rr(c, x - 17, y - 8 + br, 6, 18, 3); c.fill(); rr(c, x + 11, y - 8 + br, 6, 18, 3); c.fill();   // arms
    c.fillStyle = lk.skin; c.beginPath(); c.arc(x - 14, y + 11 + br, 3, 0, 7); c.arc(x + 14, y + 11 + br, 3, 0, 7); c.fill();
    var hy = y - 22 + br;
    if (lk.hij) { c.fillStyle = lk.clo === "#4b5563" ? "#7c3aed" : "#475569"; c.beginPath(); c.arc(x, hy, 12.5, 0, 7); c.fill(); rr(c, x - 11, hy, 22, 14, 6); c.fill(); }
    c.fillStyle = lk.skin; c.beginPath(); c.arc(x, hy, 9.5, 0, 7); c.fill();
    if (!lk.hij) { c.fillStyle = lk.hair; c.beginPath(); c.arc(x, hy - 2, 10, Math.PI * 1.05, Math.PI * 1.95); c.fill(); if (p.sex === "f") { c.fillRect(x - 10, hy - 3, 3.5, 12); c.fillRect(x + 6.5, hy - 3, 3.5, 12); } if (lk.old && p.sex !== "f") { c.fillStyle = night() ? "#94a3b8" : "#9ca3af"; c.fillRect(x - 5, hy + 5, 10, 1.4); } }
    c.strokeStyle = "#3f2a1d"; c.fillStyle = "#3f2a1d"; c.lineWidth = 1.1;
    if (drowsy) { c.beginPath(); c.moveTo(x - 5, hy - 1); c.lineTo(x - 2, hy - 1); c.moveTo(x + 2, hy - 1); c.lineTo(x + 5, hy - 1); c.stroke(); }
    else { c.beginPath(); c.arc(x - 3.4, hy - 1, 1.2, 0, 7); c.arc(x + 3.4, hy - 1, 1.2, 0, 7); c.fill(); if (pain >= 6) { c.beginPath(); c.moveTo(x - 5.5, hy - 4.5); c.lineTo(x - 2, hy - 3.4); c.moveTo(x + 5.5, hy - 4.5); c.lineTo(x + 2, hy - 3.4); c.stroke(); } }
    c.beginPath(); if (pain >= 6) c.arc(x, hy + 6, 3, Math.PI * 1.15, Math.PI * 1.85); else if (pain >= 3) { c.moveTo(x - 2.5, hy + 4.5); c.lineTo(x + 2.5, hy + 4.5); } else c.arc(x, hy + 3, 2.6, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    if (pain >= 6) { c.fillStyle = "#60a5fa"; c.beginPath(); c.moveTo(x + 9, hy - 6); c.quadraticCurveTo(x + 12, hy - 1, x + 9, hy); c.quadraticCurveTo(x + 6, hy - 1, x + 9, hy - 6); c.fill(); }
    // name · age and a small pain bar (EVA) under the chair
    c.font = "700 7.5px " + EMO; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillStyle = night() ? "#e2e8f0" : "#1e293b";
    c.fillText(T(p.nm).split(" ")[0] + "، " + p.age, x, y + 40);
    c.fillStyle = night() ? "#334155" : "#e2e8f0"; rr(c, x - 16, y + 46, 32, 4, 2); c.fill(); c.fillStyle = pain >= 7 ? "#dc2626" : pain >= 4 ? "#f59e0b" : "#16a34a"; rr(c, x - 16, y + 46, 32 * Math.min(10, pain) / 10, 4, 2); c.fill();
    if (sel) { c.strokeStyle = "#0d9488"; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.ellipse(x, y + 4, 28, 40, 0, 0, 7); c.stroke(); c.setLineDash([]); }
  }
  function stretcher(c, x, y, p, t) {           // the ambulance patient lying on his stretcher by the door
    var lk = look(p);
    c.fillStyle = "rgba(0,0,0,.14)"; rr(c, x - 22, y - 44, 48, 96, 10); c.fill();
    c.fillStyle = "#94a3b8"; rr(c, x - 24, y - 46, 48, 94, 9); c.fill(); c.fillStyle = "#f8fafc"; rr(c, x - 20, y - 42, 40, 86, 7); c.fill();
    c.fillStyle = "#fb923c"; rr(c, x - 19, y - 6, 38, 46, 6); c.fill(); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x - 19, y + 4, 38, 3);
    c.fillStyle = lk.skin; c.beginPath(); c.arc(x, y - 26, 9.5, 0, 7); c.fill(); c.fillStyle = lk.hair; c.beginPath(); c.arc(x, y - 29, 10, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.strokeStyle = "#3f2a1d"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - 5, y - 26); c.lineTo(x - 2, y - 26); c.moveTo(x + 2, y - 26); c.lineTo(x + 5, y - 26); c.stroke();
    c.fillStyle = "rgba(52,211,153,.5)"; c.beginPath(); c.ellipse(x, y - 21, 5, 3.6, 0, 0, 7); c.fill();
    c.fillStyle = "#1f2937"; [[-18, -40], [18, -40], [-18, 42], [18, 42]].forEach(function (q2) { c.beginPath(); c.arc(x + q2[0], y + q2[1] + 6, 3, 0, 7); c.fill(); });
    c.font = "700 7.5px " + EMO; c.textAlign = "center"; c.fillStyle = night() ? "#fed7aa" : "#9a3412"; c.fillText("🚑 " + T(p.nm).split(" ")[0] + "، " + p.age, x, y + 60);
    if (Math.sin(t * 5) > 0) { c.fillStyle = "#ef4444"; c.beginPath(); c.arc(x + 22, y - 50, 3, 0, 7); c.fill(); }
  }
  function bubble(c, P, x, y, txt) {
    txt = String(txt || ""); if (Array.from(txt).length > 30) txt = Array.from(txt).slice(0, 29).join("") + "…";
    c.font = "600 8.5px " + EMO; var tw = Math.min(200, c.measureText(txt).width + 14), bx = Math.max(16, Math.min(E.W - 16 - tw, x - tw / 2)), by = y - 22;
    c.fillStyle = night() ? "rgba(30,41,59,.95)" : "rgba(255,255,255,.97)"; rr(c, bx, by, tw, 18, 9); c.fill(); c.strokeStyle = night() ? "#475569" : "#cbd5e1"; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(x - 4, by + 18); c.lineTo(x, by + 24); c.lineTo(x + 4, by + 18); c.fill();
    c.fillStyle = P.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillText(txt, bx + tw / 2, by + 9.5);
  }
  // the room behind (drawn once): the floor, the walls, the doors, the furniture
  function svcBg(dk) {
    var P = pal(), nt = night(), o = d.createElement("canvas"); o.width = cv.width; o.height = cv.height; var c = o.getContext("2d"); c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var fl = dk === "acc" || dk === "arch" || dk === "stf" || dk === "adm" ? (nt ? "#2a2118" : "#f3e8d6") : (nt ? "#14262a" : "#e6f2ef");
    if (dk === "acc" || dk === "arch" || dk === "stf" || dk === "adm") { shell(c, P, dk, { floor: fl, tile: 22, tileA: nt ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.35)", tileB: nt ? "rgba(0,0,0,.2)" : "rgba(120,80,30,.06)", windows: [40, 280] });
      c.strokeStyle = nt ? "rgba(0,0,0,.25)" : "rgba(120,80,30,.12)"; c.lineWidth = 0.6; for (var py = 34; py < E.H - 12; py += 22) for (var px = ((py / 22) % 2) * 40 + 12; px < E.W - 12; px += 80) { c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 22); c.stroke(); } }
    else shell(c, P, dk, { floor: fl, windows: dk === "wt" ? [] : [40, 280] });
    if (dk !== "wt" && dk !== "acc") { svcArt(c, P, dk, nt); return o; }                     // 29e 🏥 every other room of the hospital
    if (dk === "wt") {
      c.fillStyle = fl; c.fillRect(E.W - 12, 282, 12, 96);                                  // the ER door (ambulances), by the stretcher
      c.fillStyle = nt ? "#6b5338" : "#c89f6b"; rr(c, DESK.x, DESK.y, DESK.w, DESK.h, 8); c.fill(); c.fillStyle = nt ? "#8a6b48" : "#dcb98a"; rr(c, DESK.x + 4, DESK.y + 4, DESK.w - 8, 16, 5); c.fill();
      c.fillStyle = "#1f2a30"; rr(c, DESK.x + 20, DESK.y + 24, 30, 18, 3); c.fill(); c.fillStyle = "#5fd6c6"; c.fillRect(DESK.x + 23, DESK.y + 27, 24, 12);
      c.fillStyle = "#f8fafc"; rr(c, DESK.x + 92, DESK.y + 26, 26, 16, 2); c.fill();
      c.fillStyle = nt ? "#14532d" : "#16a34a"; c.beginPath(); c.arc(30, 40, 12, 0, 7); c.arc(330, 40, 12, 0, 7); c.fill(); c.fillStyle = "#92400e"; rr(c, 24, 46, 12, 10, 2); c.fill(); rr(c, 324, 46, 12, 10, 2); c.fill();
      c.fillStyle = nt ? "#0f172a" : "#ffffff"; rr(c, 22, 92, 70, 40, 6); c.fill(); c.strokeStyle = "#94a3b8"; c.lineWidth = 1; c.stroke();
      c.font = "700 7px " + EMO; c.fillStyle = P.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl";
      [["🔴", 1], ["🟠", 2], ["🟡", 3], ["🟢", 4]].forEach(function (r, i) { c.fillText(r[0] + " " + T(L.PRN[r[1]]), 57, 100 + i * 9); });
      label(c, P, DESK.x + DESK.w / 2, DESK.y - 1, u("desk")); label(c, P, 57, 86, "🏷️ " + (FR() ? "Priorités" : "الأولويات"));
      label(c, P, E.W - 46, 252, u("entr2")); label(c, P, 180, E.H - 22, u("exitC"));
      label(c, P, 180, 150, depName("wt"), "#0d9488");
    } else {
      // 💰 the accountant's counter, the notice board, the safe, a plant
      c.fillStyle = nt ? "#57412a" : "#b78a54"; rr(c, 70, 60, 220, 56, 8); c.fill(); c.fillStyle = nt ? "#6d5333" : "#d2a774"; rr(c, 74, 64, 212, 14, 5); c.fill();
      c.fillStyle = "#1f2a30"; rr(c, 104, 82, 34, 22, 3); c.fill(); c.fillStyle = "#86efac"; c.fillRect(107, 85, 28, 16);
      c.fillStyle = "#e5e7eb"; rr(c, 222, 84, 40, 20, 3); c.fill(); c.fillStyle = "#9ca3af"; for (var bi = 0; bi < 8; bi++) c.fillRect(226 + (bi % 4) * 9, 87 + Math.floor(bi / 4) * 8, 6, 5);
      c.fillStyle = "#f1c7a5"; c.beginPath(); c.arc(180, 44, 11, 0, 7); c.fill(); c.fillStyle = "#3b2a1e"; c.beginPath(); c.arc(180, 41, 11.5, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      c.fillStyle = "#0f766e"; rr(c, 166, 52, 28, 14, 6); c.fill(); c.strokeStyle = "#3f2a1d"; c.lineWidth = 1; c.beginPath(); c.arc(176, 42, 1.1, 0, 7); c.arc(184, 42, 1.1, 0, 7); c.stroke(); c.beginPath(); c.arc(180, 46, 3, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
      c.fillStyle = nt ? "#3b2f22" : "#a47148"; rr(c, 24, 180, 130, 170, 6); c.fill(); c.fillStyle = nt ? "#2a2118" : "#e9d5b5"; rr(c, 30, 186, 118, 158, 4); c.fill();
      c.fillStyle = "#475569"; rr(c, 262, 200, 70, 80, 6); c.fill(); c.fillStyle = "#334155"; c.beginPath(); c.arc(297, 240, 14, 0, 7); c.fill(); c.strokeStyle = "#cbd5e1"; c.lineWidth = 2; c.beginPath(); c.moveTo(297, 228); c.lineTo(297, 252); c.moveTo(285, 240); c.lineTo(309, 240); c.stroke();
      c.fillStyle = nt ? "#14532d" : "#16a34a"; c.beginPath(); c.arc(320, 500, 16, 0, 7); c.fill(); c.fillStyle = "#92400e"; rr(c, 312, 508, 16, 14, 3); c.fill();
      label(c, P, 180, 128, u("accDesk")); label(c, P, 89, 172, u("accBoard")); label(c, P, 297, 290, u("accSafe")); label(c, P, 180, E.H - 22, u("exitC"));
    }
    return o;
  }

  /* 29e 🏥 the other rooms of the hospital, drawn (static, cached): the counter or desk you walk to (SPOT) opens what the room does */
  var SPOT = {
    lab: { x: 70, y: 60, w: 220, h: 54, at: { x: 180, y: 140 } }, rad: { x: 70, y: 60, w: 220, h: 54, at: { x: 180, y: 140 } }, ph: { x: 70, y: 60, w: 220, h: 54, at: { x: 180, y: 140 } },
    bb: { x: 70, y: 60, w: 220, h: 54, at: { x: 180, y: 140 } }, adm: { x: 80, y: 70, w: 200, h: 50, at: { x: 180, y: 150 } },
    ns0: { x: 90, y: 200, w: 180, h: 80, at: { x: 180, y: 310 } }, ns1: { x: 90, y: 200, w: 180, h: 80, at: { x: 180, y: 310 } }, ns2: { x: 90, y: 200, w: 180, h: 80, at: { x: 180, y: 310 } }, ns3: { x: 90, y: 200, w: 180, h: 80, at: { x: 180, y: 310 } },
    arch: { x: 30, y: 60, w: 300, h: 300, at: { x: 180, y: 400 } }, stf: { x: 24, y: 40, w: 120, h: 120, at: { x: 90, y: 190 } },
    or: { x: 120, y: 160, w: 120, h: 200, at: { x: 180, y: 400 } }, sspi: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } }, ster: { x: 30, y: 40, w: 300, h: 120, at: { x: 180, y: 200 } },
    psy: { x: 60, y: 120, w: 240, h: 200, at: { x: 180, y: 360 } }, cln: { x: 40, y: 60, w: 280, h: 160, at: { x: 180, y: 260 } }, p: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } }, m: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } },
    r: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } }, s: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } }, g: { x: 30, y: 60, w: 300, h: 200, at: { x: 180, y: 300 } } };
  function sh0(c, x, y, wd, ht, r) { c.fillStyle = "rgba(0,0,0,.16)"; rr(c, x + 2.5, y + 3.5, wd, ht, r); c.fill(); }
  function wood(c, x, y, wd, ht, nt) { sh0(c, x, y, wd, ht, 7); var g = c.createLinearGradient(0, y, 0, y + ht); g.addColorStop(0, nt ? "#7a5f40" : "#dcb98a"); g.addColorStop(1, nt ? "#56412b" : "#b98b55"); c.fillStyle = g; rr(c, x, y, wd, ht, 7); c.fill(); c.fillStyle = nt ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.35)"; rr(c, x + 3, y + 3, wd - 6, 5, 3); c.fill(); }
  function steel(c, x, y, wd, ht, nt) { sh0(c, x, y, wd, ht, 5); var g = c.createLinearGradient(x, 0, x + wd, 0); g.addColorStop(0, nt ? "#475569" : "#cbd5e1"); g.addColorStop(0.5, nt ? "#64748b" : "#f1f5f9"); g.addColorStop(1, nt ? "#475569" : "#cbd5e1"); c.fillStyle = g; rr(c, x, y, wd, ht, 5); c.fill(); c.strokeStyle = nt ? "#334155" : "#94a3b8"; c.lineWidth = 0.8; c.stroke(); }
  function screenAt(c, x, y, col) { c.fillStyle = "#1f2a30"; rr(c, x, y, 26, 17, 3); c.fill(); c.fillStyle = col || "#5fd6c6"; c.fillRect(x + 2.5, y + 2.5, 21, 11); c.fillStyle = "#334155"; c.fillRect(x + 10, y + 17, 6, 3); }
  function staff(c, x, y, col, P) { c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(x + 1.5, y + 3, 11, 8, 0, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 2, 10, 6.5, 0, 0, 7); c.fill(); c.fillStyle = P.skin; c.beginPath(); c.arc(x, y, 5.5, 0, 7); c.fill(); c.fillStyle = P.hair; c.beginPath(); c.arc(x, y - 0.5, 5.7, Math.PI, 2 * Math.PI); c.fill(); }
  function plant(c, x, y, nt) { c.fillStyle = "#92400e"; rr(c, x - 7, y + 4, 14, 11, 3); c.fill(); c.fillStyle = nt ? "#166534" : "#16a34a"; [[0, -4, 9], [-6, 1, 6], [6, 1, 6], [0, 3, 6]].forEach(function (q) { c.beginPath(); c.arc(x + q[0], y + q[1], q[2], 0, 7); c.fill(); }); c.fillStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.arc(x - 2, y - 6, 3, 0, 7); c.fill(); }
  function shelfRow(c, x, y, wd, cols, nt, seed) { steel(c, x, y, wd, 22, nt); for (var i = 0; i < Math.floor((wd - 6) / 9); i++) { c.fillStyle = cols[(i * 7 + seed) % cols.length]; rr(c, x + 4 + i * 9, y + 4, 7, 14, 1.5); c.fill(); c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(x + 5 + i * 9, y + 6, 5, 2); } }
  function minibed(c, P, x, y, nt, col) { bed(c, P, { x: x, y: y, w: 70, h: 120 }, col || P.b1); }
  function svcArt(c, P, dk, nt) {
    var I = w.LiveDept.INFO[dk] || { ic: "🏥", t: { ar: "", fr: "" } }, col = DCOL[dk] || "#0f766e", soon = !!w.LiveDept.SOON[dk], SP = SPOT[dk], TT0 = function (a, f) { return FR() ? f : a; };
    var base = dk.replace(/\d$/, "");
    if (base === "lab" || base === "rad" || base === "ph" || base === "bb") {
      // the service counter with its window, the staff behind it, the room's own machines
      c.fillStyle = nt ? "rgba(148,197,232,.10)" : "rgba(186,230,253,.45)"; rr(c, 60, 20, 240, 36, 6); c.fill();
      wood(c, 70, 60, 220, 30, nt); c.fillStyle = nt ? "#e2e8f0" : "#fffdf5"; rr(c, 150, 66, 60, 16, 3); c.fill(); c.fillStyle = col; c.font = "700 7px " + EMO; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillText(TT0("🧾 استلام", "🧾 Retrait"), 180, 74.5);
      staff(c, 180, 40, base === "ph" ? "#16a34a" : base === "bb" ? "#b91c1c" : base === "rad" ? "#475569" : "#2563eb", P); screenAt(c, 100, 64); screenAt(c, 236, 64);
      if (base === "lab") { steel(c, 24, 160, 90, 26, nt); [0, 1, 2, 3, 4, 5, 6].forEach(function (i) { c.fillStyle = ["#ef4444", "#a855f7", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#64748b"][i]; rr(c, 30 + i * 11, 165, 6, 16, 2); c.fill(); });
        steel(c, 250, 160, 86, 60, nt); c.fillStyle = nt ? "#1e293b" : "#e2e8f0"; c.beginPath(); c.arc(293, 190, 20, 0, 7); c.fill(); c.strokeStyle = "#64748b"; c.lineWidth = 2; c.stroke(); c.fillStyle = "#475569"; c.beginPath(); c.arc(293, 190, 5, 0, 7); c.fill();
        steel(c, 24, 260, 70, 110, nt); c.fillStyle = nt ? "#0f172a" : "#dbeafe"; rr(c, 30, 266, 58, 98, 4); c.fill(); for (var lr = 0; lr < 4; lr++) for (var lc = 0; lc < 4; lc++) { c.fillStyle = ["#fde68a", "#fca5a5", "#bfdbfe", "#bbf7d0"][(lr + lc) % 4]; rr(c, 34 + lc * 13, 272 + lr * 23, 9, 16, 2); c.fill(); }
        label(c, P, 69, 200, TT0("🧪 أنابيب", "🧪 Tubes")); label(c, P, 293, 228, TT0("🌀 Centrifugeuse", "🌀 Centrifugeuse")); label(c, P, 59, 382, TT0("❄️ برّاد العيّنات", "❄️ Frigo"));
        c.fillStyle = nt ? "#334155" : "#e5e7eb"; rr(c, 250, 290, 86, 60, 6); c.fill(); c.fillStyle = "#111827"; c.beginPath(); c.arc(285, 312, 8, 0, 7); c.fill(); c.fillStyle = "#475569"; c.fillRect(280, 320, 10, 24); c.fillRect(270, 342, 30, 5); label(c, P, 293, 362, TT0("🔬 Microscope", "🔬 Microscope")); }
      if (base === "rad") { c.fillStyle = nt ? "#1e293b" : "#f1f5f9"; rr(c, 110, 200, 140, 230, 10); c.fill(); c.strokeStyle = nt ? "#475569" : "#94a3b8"; c.lineWidth = 1.2; c.stroke();
        steel(c, 150, 230, 60, 170, nt); c.fillStyle = nt ? "#334155" : "#cbd5e1"; c.beginPath(); c.arc(180, 300, 26, 0, 7); c.fill(); c.fillStyle = "#facc15"; c.beginPath(); c.arc(180, 300, 6, 0, 7); c.fill(); c.strokeStyle = "#111827"; c.lineWidth = 1.4; for (var ri = 0; ri < 3; ri++) { c.beginPath(); c.arc(180, 300, 10, ri * 2.094, ri * 2.094 + 1.05); c.stroke(); }
        c.fillStyle = "#0f172a"; rr(c, 266, 170, 64, 84, 5); c.fill(); c.strokeStyle = "#e2e8f0"; c.lineWidth = 1; c.beginPath(); c.moveTo(298, 182); c.lineTo(298, 242); for (var rb = 0; rb < 6; rb++) { c.moveTo(298, 190 + rb * 9); c.quadraticCurveTo(278, 196 + rb * 9, 276, 206 + rb * 9); c.moveTo(298, 190 + rb * 9); c.quadraticCurveTo(318, 196 + rb * 9, 320, 206 + rb * 9); } c.stroke();
        c.fillStyle = nt ? "#7c2d12" : "#fde68a"; rr(c, 24, 170, 70, 120, 6); c.fill(); c.fillStyle = "#facc15"; c.beginPath(); c.arc(59, 200, 10, 0, 7); c.fill(); c.fillStyle = "#111827"; c.font = "11px " + EMO; c.fillText("☢️", 59, 201);
        label(c, P, 180, 444, TT0("🩻 طاولة الأشعة", "🩻 Table de radio")); label(c, P, 298, 266, TT0("🖼️ صورة صدر", "🖼️ Cliché thorax")); label(c, P, 59, 302, TT0("🛡️ غرفة التحكّم", "🛡️ Poste protégé")); }
      if (base === "ph") { var bx = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#ec4899", "#f8fafc", "#0ea5e9"]; for (var sr = 0; sr < 6; sr++) { shelfRow(c, 24, 140 + sr * 44, 140, bx, nt, sr * 3); shelfRow(c, 196, 140 + sr * 44, 140, bx, nt, sr * 5 + 1); }
        label(c, P, 94, 410, TT0("💊 رفوف الأدوية", "💊 Étagères")); label(c, P, 266, 410, TT0("💉 الحقن", "💉 Injectables")); }
      if (base === "bb") { for (var fr0 = 0; fr0 < 3; fr0++) { var fx = 24 + fr0 * 108; steel(c, fx, 150, 96, 150, nt); c.fillStyle = nt ? "rgba(148,197,232,.15)" : "rgba(224,242,254,.9)"; rr(c, fx + 6, 156, 84, 138, 4); c.fill();
          for (var br0 = 0; br0 < 4; br0++) for (var bc = 0; bc < 4; bc++) { c.fillStyle = (br0 + bc + fr0) % 5 ? "#b91c1c" : "#f59e0b"; rr(c, fx + 11 + bc * 19, 162 + br0 * 32, 13, 24, 4); c.fill(); c.fillStyle = "#f8fafc"; c.fillRect(fx + 13 + bc * 19, 166 + br0 * 32, 9, 5); } }
        label(c, P, 180, 314, TT0("🩸 برّادات أكياس الدم (+4°C)", "🩸 Réfrigérateurs à sang (+4 °C)")); }
    } else if (base === "adm") {
      wood(c, 80, 70, 200, 34, nt); screenAt(c, 110, 76); screenAt(c, 224, 76); staff(c, 150, 52, "#0e7490", P); staff(c, 210, 52, "#0e7490", P);
      c.strokeStyle = "#b45309"; c.lineWidth = 2; [[100, 170, 100, 330], [260, 170, 260, 330]].forEach(function (L0) { c.beginPath(); c.moveTo(L0[0], L0[1]); c.lineTo(L0[2], L0[3]); c.stroke(); });
      c.fillStyle = "#facc15"; [170, 250, 330].forEach(function (yy) { c.beginPath(); c.arc(100, yy, 3.5, 0, 7); c.arc(260, yy, 3.5, 0, 7); c.fill(); });
      for (var ch = 0; ch < 4; ch++) { c.fillStyle = nt ? "#475569" : "#94a3b8"; rr(c, 30 + ch * 0, 380 + ch * 40, 40, 28, 6); c.fill(); rr(c, 290, 380 + ch * 40, 40, 28, 6); c.fill(); }
      plant(c, 30, 40, nt); plant(c, 330, 40, nt); label(c, P, 180, 120, TT0("🛎️ مكتب الاستقبال والدخول", "🛎️ Bureau des admissions"));
    } else if (base === "ns") {
      // the U-shaped nurse station, the whiteboard of the floor's patients, the medication trolley, the chart rack
      wood(c, 90, 200, 180, 26, nt); wood(c, 90, 200, 26, 90, nt); wood(c, 244, 200, 26, 90, nt); screenAt(c, 130, 204); screenAt(c, 200, 204, "#93c5fd");
      c.fillStyle = "#f8fafc"; rr(c, 60, 30, 240, 90, 6); c.fill(); c.strokeStyle = "#94a3b8"; c.lineWidth = 2; c.stroke(); c.fillStyle = "#64748b"; c.fillRect(60, 120, 240, 4);
      c.fillStyle = "#2563eb"; c.font = "700 8px " + EMO; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.fillText(TT0("📋 لوح المرضى", "📋 Tableau des patients"), 180, 42);
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; for (var wl = 0; wl < 5; wl++) { c.beginPath(); c.moveTo(70, 56 + wl * 13); c.lineTo(290, 56 + wl * 13); c.stroke(); }
      steel(c, 30, 330, 70, 44, nt); [0, 1, 2].forEach(function (i) { c.fillStyle = ["#ef4444", "#3b82f6", "#10b981"][i]; rr(c, 36 + i * 21, 336, 16, 32, 3); c.fill(); });
      steel(c, 270, 320, 60, 70, nt); for (var cr = 0; cr < 5; cr++) { c.fillStyle = ["#fde68a", "#bfdbfe", "#fecaca", "#bbf7d0", "#e9d5ff"][cr]; rr(c, 276, 326 + cr * 12, 48, 9, 2); c.fill(); }
      c.fillStyle = "#e2e8f0"; rr(c, 300, 230, 14, 12, 3); c.fill(); c.fillStyle = "#38bdf8"; rr(c, 302, 232, 10, 5, 2); c.fill();
      label(c, P, 180, 300, TT0("🧑‍⚕️ محطة التمريض — 🔄 التسليم هون", "🧑‍⚕️ Poste de soins — 🔄 relève ici")); label(c, P, 65, 386, TT0("💊 عربة الأدوية", "💊 Chariot")); label(c, P, 300, 402, TT0("📁 الملفّات", "📁 Dossiers")); label(c, P, 307, 252, "🧴");
    } else if (base === "arch") {
      for (var ar0 = 0; ar0 < 5; ar0++) { steel(c, 30, 60 + ar0 * 60, 300, 30, nt); for (var fi = 0; fi < 26; fi++) { c.fillStyle = ["#fde68a", "#fca5a5", "#bfdbfe", "#bbf7d0", "#e9d5ff", "#fed7aa"][(fi + ar0) % 6]; rr(c, 35 + fi * 11.3, 64 + ar0 * 60, 9, 22, 1); c.fill(); } }
      label(c, P, 180, 380, TT0("🗄️ ملفّات المرضى — 📒 سجل حالاتك و📚 الحالات السابقة", "🗄️ Dossiers — 📒 ton carnet et 📚 les cas passés"));
    } else if (base === "stf") {
      c.fillStyle = nt ? "#3b2f22" : "#a47148"; rr(c, 24, 40, 120, 120, 6); c.fill(); c.fillStyle = nt ? "#2a2118" : "#e9d5b5"; rr(c, 30, 46, 108, 108, 4); c.fill();
      c.fillStyle = "#fef3c7"; rr(c, 38, 54, 44, 34, 2); c.fill(); c.fillStyle = "#dbeafe"; rr(c, 88, 58, 42, 30, 2); c.fill(); c.fillStyle = "#fce7f3"; rr(c, 44, 96, 80, 50, 2); c.fill(); c.fillStyle = "#ef4444"; [[60, 54], [109, 58], [84, 96]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 7); c.fill(); });
      wood(c, 170, 230, 120, 70, nt); for (var cp = 0; cp < 4; cp++) { c.fillStyle = "#f8fafc"; c.beginPath(); c.arc(190 + cp * 27, 252, 5, 0, 7); c.fill(); c.fillStyle = "#78350f"; c.beginPath(); c.arc(190 + cp * 27, 252, 3, 0, 7); c.fill(); }
      steel(c, 290, 40, 46, 60, nt); c.fillStyle = "#111827"; rr(c, 298, 50, 30, 18, 3); c.fill(); c.fillStyle = "#f97316"; c.beginPath(); c.arc(313, 82, 4, 0, 7); c.fill();
      c.fillStyle = nt ? "#4c1d95" : "#7c3aed"; rr(c, 30, 420, 130, 40, 12); c.fill(); rr(c, 30, 410, 130, 14, 7); c.fill();
      for (var lk = 0; lk < 6; lk++) { steel(c, 200 + (lk % 3) * 44, 400 + Math.floor(lk / 3) * 62, 40, 58, nt); c.fillStyle = "#94a3b8"; c.fillRect(232 + (lk % 3) * 44, 425 + Math.floor(lk / 3) * 62, 2, 8); }
      label(c, P, 84, 170, TT0("📌 لوح الإعلانات — 💰 الرواتب", "📌 Tableau — 💰 salaires")); label(c, P, 313, 112, "☕ Café"); label(c, P, 95, 476, TT0("🛋️ كنباية", "🛋️ Canapé")); label(c, P, 266, 532, TT0("🔐 خزانات", "🔐 Casiers"));
    } else if (base === "or") {
      c.fillStyle = nt ? "#0f2a2a" : "#ccfbf1"; rr(c, 60, 120, 240, 300, 16); c.fill();
      [[180, 230, 46], [120, 300, 30], [240, 300, 30]].forEach(function (L0) { var g = c.createRadialGradient(L0[0], L0[1], 4, L0[0], L0[1], L0[2]); g.addColorStop(0, "#fffbeb"); g.addColorStop(0.6, nt ? "#94a3b8" : "#e2e8f0"); g.addColorStop(1, "#64748b"); c.fillStyle = g; c.beginPath(); c.arc(L0[0], L0[1], L0[2], 0, 7); c.fill(); });
      steel(c, 150, 180, 60, 180, nt); c.fillStyle = "#0d9488"; rr(c, 154, 200, 52, 140, 6); c.fill();
      steel(c, 250, 380, 70, 40, nt); c.fillStyle = "#cbd5e1"; for (var ins = 0; ins < 6; ins++) c.fillRect(256 + ins * 10, 386, 3, 26);
      steel(c, 34, 160, 50, 90, nt); screenAt(c, 46, 168, "#4ade80");
      label(c, P, 180, 440, TT0("🔪 طاولة العمليات", "🔪 Table d'opération")); label(c, P, 59, 262, TT0("😴 Anesthésie", "😴 Anesthésie"));
    } else if (base === "sspi" || base === "r" || base === "s" || base === "g" || base === "p" || base === "m" || base === "psy") {
      if (base === "psy") { c.fillStyle = nt ? "#312e81" : "#e0e7ff"; rr(c, 60, 120, 240, 200, 20); c.fill(); c.fillStyle = nt ? "#4338ca" : "#a5b4fc"; rr(c, 80, 140, 200, 40, 14); c.fill(); rr(c, 80, 270, 90, 36, 12); c.fill(); rr(c, 190, 270, 90, 36, 12); c.fill(); plant(c, 300, 140, nt); plant(c, 60, 360, nt); }
      else { var nb = base === "sspi" ? 3 : 2; for (var bi = 0; bi < nb; bi++) { var bx0 = nb === 3 ? 30 + bi * 108 : 50 + bi * 190; minibed(c, P, bx0, 70, nt, base === "p" ? "#fcd34d" : base === "m" ? "#f9a8d4" : P.b1); monBox(c, bx0 + 24, 44, nt); } }
    } else if (base === "ster") {
      for (var av = 0; av < 3; av++) { steel(c, 30 + av * 104, 40, 92, 90, nt); c.fillStyle = nt ? "#1e293b" : "#e2e8f0"; c.beginPath(); c.arc(76 + av * 104, 85, 30, 0, 7); c.fill(); c.strokeStyle = "#64748b"; c.lineWidth = 3; c.stroke(); c.fillStyle = "#22c55e"; c.beginPath(); c.arc(110 + av * 104, 50, 3, 0, 7); c.fill(); }
      for (var sp = 0; sp < 3; sp++) { steel(c, 30, 230 + sp * 50, 300, 30, nt); for (var pk0 = 0; pk0 < 12; pk0++) { c.fillStyle = (pk0 + sp) % 3 ? "#bfdbfe" : "#a7f3d0"; rr(c, 36 + pk0 * 24, 234 + sp * 50, 20, 22, 2); c.fill(); c.strokeStyle = "#60a5fa"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(36 + pk0 * 24, 245 + sp * 50); c.lineTo(56 + pk0 * 24, 245 + sp * 50); c.stroke(); } }
      label(c, P, 180, 142, TT0("♨️ Autoclaves (تعقيم بالبخار)", "♨️ Autoclaves")); label(c, P, 180, 392, TT0("🧺 عُدّة معقّمة جاهزة", "🧺 Matériel stérile prêt"));
    } else if (base === "cln") {
      c.fillStyle = "#fde047"; rr(c, 50, 80, 70, 100, 8); c.fill(); c.fillStyle = "#2563eb"; rr(c, 60, 90, 50, 30, 6); c.fill(); c.strokeStyle = "#94a3b8"; c.lineWidth = 3; c.beginPath(); c.moveTo(85, 130); c.lineTo(85, 60); c.stroke();
      for (var lc0 = 0; lc0 < 2; lc0++) { steel(c, 160 + lc0 * 90, 70, 80, 120, nt); c.fillStyle = lc0 ? "#fecaca" : "#f8fafc"; for (var ln = 0; ln < 4; ln++) { rr(c, 166 + lc0 * 90, 78 + ln * 27, 68, 20, 4); c.fill(); } }
      c.fillStyle = "#facc15"; c.beginPath(); c.moveTo(180, 300); c.lineTo(196, 330); c.lineTo(164, 330); c.closePath(); c.fill(); c.fillStyle = "#111827"; c.font = "700 12px " + EMO; c.fillText("!", 180, 322);
      label(c, P, 85, 196, TT0("🧹 عربة التنظيف", "🧹 Chariot de ménage")); label(c, P, 245, 206, TT0("🧺 الشراشف (نضيف / وسخ)", "🧺 Linge propre / sale")); label(c, P, 180, 346, TT0("⚠️ أرض مبلولة", "⚠️ Sol mouillé"));
    }
    label(c, P, 180, E.H - 22, u("exitC"));
    label(c, P, 180, base === "ns" ? 140 : 150, I.ic + " " + T(I.t), col);
    if (soon) { c.fillStyle = nt ? "rgba(15,23,42,.55)" : "rgba(255,255,255,.65)"; rr(c, 60, 470, 240, 40, 10); c.fill(); label(c, P, 180, 490, u("soonT") + " · " + (FR() ? "pas encore de cas" : "لسّا ما في حالات"), "#b45309"); }
  }
  var triSel = null, svcSay = 0;
  function svcDraw(P, dk, t) {
    if (dk === "wt") {
      var L0 = seated(); if (!L0.length) label(cx, P, 180, 300, u("waitNone"));
      L0.forEach(function (o) { var sel = triSel && triSel === wkey(o.x); cx.save(); cx.translate(o.at.x, o.at.y); cx.scale(PS, PS); if (o.at.str) stretcher(cx, 0, 0, o.x.p, t); else person(cx, 0, 0, o.x.p, t, sel); cx.restore(); });
      var sp = L0.filter(function (o) { return !o.at.str; }); if (sp.length) { var k = Math.floor(t / 4) % sp.length, o2 = sp[k];
        var sel2 = triSel && L0.filter(function (o) { return wkey(o.x) === triSel; })[0]; if (sel2) o2 = sel2; bubble(cx, P, o2.at.x, o2.at.y - (o2.at.str ? 72 : 52), sayOf(o2.x.p)); }
      var WL = waitList(); if (WL.length) label(cx, P, 180, 166, u("waitN", { n: WL.length }), "#0d9488");
    } else if (SPOT[dk] && /^(lab|rad|ph|bb)$/.test(dk)) {                                    // 29e 🧾 how many results / drugs wait at this counter
      var n9 = pkOpen(dk).length; label(cx, P, 180, 104, n9 ? u("pkN", { n: n9 }) : u("pkN0"), n9 ? "#16a34a" : null);
      if (n9 && Math.sin(t * 4) > 0) { cx.strokeStyle = "#16a34a"; cx.lineWidth = 2; rr(cx, 148, 64, 64, 20, 4); cx.stroke(); }
    } else if (/^ns\d$/.test(dk)) { var hp = hoPatients(FLR(dk)).length; label(cx, P, 180, 160, u("hoBoard", { n: hp }), "#0f766e");
      hoPatients(FLR(dk)).slice(0, 5).forEach(function (o, i) { cx.font = "700 7px " + EMO; cx.fillStyle = "#1e3a8a"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.direction = FR() ? "ltr" : "rtl"; cx.fillText(T(o.x.p.nm).split(" ")[0] + " · " + w.LiveDept.INFO[o.dk].ic + " · " + L.stLabel(o.x.st, o.x.p.sex).split(" ")[0], 180, 56 + i * 13); });
    } else if (dk === "acc") {
      var pay = w.NursinPay; if (!pay) return;
      var B = pay.weekBoard(pay.core.monday(C.dayKey(Date.now()))).slice(0, 5);
      cx.font = "700 8px " + EMO; cx.textBaseline = "middle"; cx.direction = FR() ? "ltr" : "rtl"; cx.fillStyle = night() ? "#fde68a" : "#422006";
      if (!B.length) { cx.textAlign = "center"; cx.fillText("—", 89, 260); }
      B.forEach(function (r, i) { cx.textAlign = FR() ? "left" : "right"; cx.fillText((["🥇", "🥈", "🥉", "4.", "5."][i]) + " " + String(r.n || "?").split(" ")[0], FR() ? 36 : 142, 200 + i * 26); cx.textAlign = FR() ? "right" : "left"; cx.fillText(pay.money(r.net), FR() ? 142 : 36, 212 + i * 26); });
      label(cx, P, 180, 150, "💵 " + (FR() ? "Aujourd'hui : " : "اليوم: ") + pay.money(pay.mine()), "#ca8a04");
    }
  }
  function svcTap(p) {
    var dk = L.dep();
    if (dk === "wt") {
      var L0 = seated();
      for (var i = 0; i < L0.length; i++) { var o = L0[i]; if (Math.abs(p.x - o.at.x) < 34 && p.y > o.at.y - (o.at.str ? 70 : 52) && p.y < o.at.y + (o.at.str ? 90 : 74)) { triSel = wkey(o.x); return svcGo(o.spot, { k: "tri", id: wkey(o.x) }); } }
      if (p.x > DESK.x - 6 && p.x < DESK.x + DESK.w + 6 && p.y > DESK.y - 6 && p.y < DESK.y + DESK.h + 30) return svcGo({ x: 180, y: DESK.y + DESK.h + 28 }, { k: "desk" });
    } else if (dk === "acc") {
      if (p.y < 150 || (p.x < 160 && p.y > 170 && p.y < 360)) return svcGo(p.y < 150 ? { x: 180, y: 140 } : { x: 90, y: 370 }, { k: "acc" });
    } else if (SPOT[dk]) {                                                                     // 29e: every other room's counter / desk / board
      var sp = SPOT[dk]; if (p.x > sp.x - 8 && p.x < sp.x + sp.w + 8 && p.y > sp.y - 8 && p.y < sp.y + sp.h + 30) return svcGo(sp.at, { k: "svc", dk: dk });
    }
    nurse.goal = null; nurse.pts = [{ x: Math.max(24, Math.min(E.W - 24, p.x)), y: Math.max(24, Math.min(E.H - 24, p.y)) }]; mark = { x: p.x, y: p.y, t: 0 };
  }
  function svcGo(spot, goal) { nurse.goal = goal; nurse.pts = [spot]; mark = { x: spot.x, y: spot.y, t: 0 }; }
  function svcArrive(g) {
    if (g.k === "acc") return accPanel();
    if (g.k === "svc") { var b0 = g.dk.replace(/\d$/, "");
      if (b0 === "arch") { if (w.NursinLog) w.NursinLog.open("room"); else archPanel(); return; }
      if (b0 === "stf") return accPanel("week");
      if (w.LiveDept.SOON[g.dk] || b0 === "or" || b0 === "sspi" || b0 === "psy" || b0 === "ster" || b0 === "cln") return say("neutral", depName(g.dk), u("svcSub_" + b0) || u("soonW"));
      return sheetOpen("svc", g.dk); }
    if (g.k === "desk") return waitListSheet();
    if (g.k === "tri") { var o = waitList().filter(function (x) { return wkey(x) === g.id; })[0]; if (!o) { triSel = null; return say("neutral", u("triBy", { n: "…" })); } triPick = { pr: 0, dc: "" }; return sheetOpen("tri", g.id); }
  }
  /* 🔤 29r (Abdullah, Nov 6 2026 5:15 PM «على اي اساس بدي افوت كل مريض»): one reason line per waiting patient, from HIS vitals, in ABCDE
     order (🌐 notion générale), + «❓ كيف بفرز؟» (a <details>, no script, no animation). The list is sorted the way the lines read. */
  var ABCN = { A: ["مجرى الهوا", "Voies aériennes"], B: ["تنفّس", "Respiration"], C: ["دوران الدم", "Circulation"], D: ["وعي", "Conscience"], E: ["الباقي", "Autres signes"] };
  var ABCAR = { A: "مجرى الهوا", B: "التنفّس", C: "الدورة الدموية", D: "الوعي", E: "حرارة، وجع…" };
  function triSort(list) {
    return list.map(function (o, i) { return { o: o, i: i, r: w.LiveDept.triReason(o.p).rank }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; }).map(function (x) { return x.o; });
  }
  function triLine(p) {
    var R = w.LiveDept.triReason(p), P0 = L.PRN[R.pr] || L.PRN[4], F = FR(), N = ABCN[R.L];
    if (R.pr === 4) return F ? "🟢 Aucun signe d'alerte → peut attendre (Non urgent = مش مستعجل)" : "🟢 ما في علامة خطر → بينطر (Non urgent = مش مستعجل)";
    var val = R.val || { air: F ? "voies aériennes menacées (مجرى الهوا بخطر)" : "مجرى الهوا بخطر", bleed: F ? "saignement (نزيف)" : "نزيف", rate: F ? "histoire inquiétante (قصّة خطرة)" : "قصّتو خطرة" }[R.k] || "";
    return P0.ic + (F ? (R.pr <= 2 ? " Pourquoi en haut ? " : " Pourquoi ici ? ") : (R.pr <= 2 ? " ليش فوق؟ " : " ليش هون؟ ")) + val + " → " + R.L + " " +
      (F ? N[1] + " (" + ABCAR[R.L] + ")" : N[0] + " (" + N[1] + " = " + ABCAR[R.L] + ")");
  }
  function triHelp() {
    var F = FR(), rows = F ? [
      "A — Airway / Voies aériennes (مجرى الهوا) : obstruée, étouffement = en premier",
      "B — Respiration (التنفّس) : SpO₂ (أكسجين الدم) < 94 % ou FR (عدد الأنفاس) élevée",
      "C — Circulation (الدورة الدموية) : TA (الضغط) basse, FC (النبض) rapide, saignement (نزيف)",
      "D — Conscience (الوعي) : Glasgow (مقياس الوعي) ≤ 13",
      "E — Le reste : T° (الحرارة), EVA (الوجع). Rien ? Il peut attendre 🟢"
    ] : [
      "A — Airway (مجرى الهوا): مسدود أو اختناق = أوّل واحد",
      "B — Respiration (التنفّس): SpO₂ (أكسجين الدم) أقل من 94% أو FR (عدد الأنفاس) عالي",
      "C — Circulation (الدورة الدموية): TA (الضغط) واطي، FC (النبض) سريع، نزيف",
      "D — Conscience (الوعي): Glasgow (مقياس الوعي) 13 أو أقل",
      "E — الباقي: T° (الحرارة)، EVA (مقياس الوجع). ما في شي؟ بينطر 🟢"
    ];
    return '<details class="lcr-how"><summary>' + esc(F ? "❓ Comment je trie ? (كيف بفرز؟) · le plus grave d'abord, ordre ABCDE" : "❓ كيف بفرز؟ · الأخطر أوّل بالترتيب ABCDE") + "</summary><ol>" +
      rows.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></details>";
  }
  function waitListSheet() { sheetOpen("wait", "list"); }
  function waitSheet(x) { sheetOpen("wait", x.k); }
  function waitHtml(k) {
    if (k === "list") {
      var L0 = triSort(waitList());                         // 🔤 29r: sorted by priority, then ABCDE — the order the reason lines say
      return head(depName("wt"), u("waitN", { n: L0.length })) + (L0.length ? triHelp() + '<div class="lcr-acts lcr-wl">' + L0.map(function (o) {
        var pr = w.LiveDept.prio(o.p).pr; return '<button type="button" class="lcr-act" data-lcseat="' + esc(wkey(o)) + '">' + (o.kind === "amb" ? "🚑 " : pr === 1 ? "❗ " : "🪑 ") + esc(T(o.p.nm).split(" ")[0] + "، " + o.p.age) + " <small>" + esc(sayOf(o.p).slice(0, 34)) + "</small>" +
          '<small class="lcr-why" data-lcabc="' + w.LiveDept.triReason(o.p).L + '">' + esc(triLine(o.p)) + "</small></button>"; }).join("") + "</div>"
        : '<p class="small">' + esc(u("waitNone")) + "</p>") + '<p class="small">' + esc(u("triRule")) + "</p>";
    }
    var x = X(k); if (!x) return "";
    return head("🛏️ " + esc(nm(x)), esc(depName(L.dep()))) + '<div class="lcr-wait"><p><b>' + esc(ug("waitBedT", x, { n: nm(x).split(" ")[0] })) + "</b></p><p class=\"small\">" + esc(u("waitBedW")) + "</p>" +
      '<div class="lcr-acts"><button type="button" class="lcr-act lcr-hit" data-lcgo="wt">' + esc(u("goWait")) + "</button></div></div>";
  }
  var triPick = { pr: 0, dc: "" };
  function vitRow(p) {
    var v = p.vit || {}, e = painOf(p), a = function (lbl, val, bad) { return '<span class="lcr-tv' + (bad ? " bad" : "") + '"><small>' + lbl + "</small><b dir=\"ltr\">" + val + "</b></span>"; };
    return '<div class="lcr-tvs">' + a("TA", v.sys + "/" + v.dia, v.sys < 90 || v.sys >= 180) + a("FC", v.fc, v.fc >= 110 || v.fc < 55) + a("FR", v.fr, v.fr >= 24 || v.fr < 10) + a("SpO₂", v.spo2 + "%", v.spo2 < 94) +
      a("T°", v.t, v.t >= 38) + a("Glasgow", v.gcs, v.gcs <= 13) + a(esc(u("pain")) + " (EVA)", e + "/10", e >= 7) + "</div>";
  }
  function triHtml(id) {
    var o = waitList().filter(function (x) { return wkey(x) === id; })[0];
    if (!o) return head(u("triT")) + '<p class="small">' + esc(u("waitNone")) + "</p>";
    var p = o.p, who = o.kind === "amb" ? u("amb") : o.kind === "walk" ? u("walkin") : "🪑 " + depName("wt");
    var h = head(u("triT") + " · " + esc(T(p.nm)), esc(p.age + (FR() ? " ans · " : " سنة · ") + (p.sex === "f" ? "♀" : "♂") + " · " + who));
    h += '<div class="lcr-tri"><p class="lcr-say">💬 «' + esc(sayOf(p)) + '»</p>';
    if (o.kind === "walk" && p.lab) h += '<p class="small">🧪 ' + p.lab.map(function (s) { return esc(T(s)); }).join(" · ") + "</p>";
    h += "<h4>" + esc(u("triVit")) + "</h4>" + vitRow(p);
    h += triHelp();                                       // 🔤 29r: how to decide, without giving his answer away
    h += "<h4>" + esc(u("triQ1")) + '</h4><div class="lcr-acts lcr-pr">' + [1, 2, 3, 4].map(function (n) { var P0 = L.PRN[n]; return '<button type="button" class="lcr-act' + (triPick.pr === n ? " lcr-hit" : "") + '" data-lctripr="' + n + '">' + P0.ic + " " + esc(T(P0)) + "</button>"; }).join("") + "</div>";
    h += "<h4>" + esc(u("triQ2")) + '</h4><div class="lcr-acts lcr-dc">' + w.LiveDept.TRIK.map(function (c) { var I = w.LiveDept.INFO[w.LiveDept.wardOf(c)]; return '<button type="button" class="lcr-act' + (triPick.dc === c ? " lcr-hit" : "") + '" data-lctridc="' + c + '">' + I.ic + " " + esc(T(I.t)) + "</button>"; }).join("") + "</div>";
    h += '<div class="lcr-acts"><button type="button" class="lcr-btn on lcr-trigo" data-lctrigo="' + esc(id) + '"' + (triPick.pr && triPick.dc ? "" : ' aria-disabled="true"') + ">" + esc(u("triGo")) + "</button></div>";
    return h + '<p class="small lcr-src">' + esc(u("triRule")) + (o.kind === "walk" ? " · " + esc(T(p.src)) : o.cs ? " · " + esc(T(o.cs.src)) : "") + "</p></div>";
  }
  function triGo(id) {
    if (!triPick.pr || !triPick.dc) return say("ord", u("triPick"));
    var o = waitList().filter(function (x) { return wkey(x) === id; })[0]; if (!o) { sheetClose(); return say("neutral", u("triBy", { n: "…" })); }
    var a = "tg" + triPick.pr + triPick.dc, dk = o.dk;
    if (LCa && LCa.dur(a) && LCa.canStart(work, pidOf(o.pk, dk), Date.now()).ok) sheetClose();   // 29d: he is seen working (ring + bar) in the waiting room
    workRun(o.pk, a, dk, function () {                           // 29d ⏳ the triage takes a few seconds too (vitals, a look, the decision)
      var tw = setTimeout(function () { say("neutral", u("saving")); }, 600);
      actQ = actQ.then(function () { return L.act(o.pk, a, undefined, undefined, dk); }).then(function (r) { clearTimeout(tw); triResult(o, r); }, function () { clearTimeout(tw); say("bad", u("err"), u("errWhy")); });
    });
  }
  function triWhy(o, t) {
    var P0 = L.PRN[t.want], v = o.p.vit || {}, S = { gcs: "Glasgow " + v.gcs, sys: "TA " + v.sys + "/" + v.dia, spo2: "SpO₂ " + v.spo2 + "%", fr: "FR " + v.fr, fc: "FC " + v.fc, t: "T° " + v.t, rate: u("sStory") + ": " + T(o.p.who || o.p.say) };
    var bits = [];
    if (o.kind === "walk") bits.push(T(o.p.why));
    else { bits.push(u("triWant", { p: P0.ic + " " + T(P0) }) + (t.sig.length ? " — " + u("triSig", { s: t.sig.map(function (k) { return S[k]; }).join(" · ") }) : "")); bits.push(u("triDep", { d: depName(w.LiveDept.wardOf(t.right)) }) + " (" + T(o.cs && o.cs.t) + ")"); }
    return bits.join(" · ");
  }
  function triResult(o, r) {
    var pts = r.d ? " " + (r.d > 0 ? "+" : "") + r.d + " · " + payTxt(r.d * 10) : "";
    if (r.k === "adm") { sheetClose(); triSel = null; return say("neutral", u("triBy", { n: String((r.by && r.by.n) || "").split(" ")[0] })); }
    if (r.k === "trimax") return say("neutral", u("triMax"));
    if (r.k === "gone") { sheetClose(); return say("neutral", u("triGone")); }
    if (r.k !== "ok" && r.k !== "neu") return result(o.pk, "tg", r);
    var t = r.tri || {}, nmx = T(o.p.nm).split(" ")[0], ward = w.LiveDept.wardOf(t.right);
    if (!t.okD) { triPick.dc = ""; say("bad", u("triNo") + pts, triWhy(o, t)); if (sheet) sheetPaint(); return srsWrong(o); }
    sheetClose(); triSel = null; hCache = null;
    say(t.okP ? "good" : "ord", (t.okP ? u("triOk") : u("triOkP")) + pts, (t.over ? u("triOver") + " " : "") + triWhy(o, t));
    if (!t.okP) srsWrong(o);
    if (o.kind === "walk" || !w.LiveDept.isOpen(ward)) { setTimeout(function () { say("good", u("triWalk", { n: nmx, d: depName(ward) })); }, 2600); return; }
    var target = o.dk === "x" ? "x" : o.dk;
    setTimeout(function () { walkTo(target, nmx); }, 1400);                      // I wheel him to his bed (the case starts there)
  }
  // a wrong triage: two questions of his topic join the 🔁 spaced repetition (the same pool as «📒 سجل حالاتي»)
  function srsWrong(o) {
    try { var S = w.NursinSRS, LC0 = w.NursinLogCore; if (!S || !S.add || !LC0 || !w.QUIZ) return;
      var cs = o.cs || { src: o.p.src, href: "" }, items = S.items ? S.items() : {}, r = LC0.keyQs(C, w.QUIZ, cs, o.p, "tri" + wkey(o), function (k) { return !!(items[k] && !items[k].n); }, 2); if (r.ids.length) S.add(r.ids); } catch (e) {}
  }
  function payTxt(m) { return w.NursinPay ? "💵 " + w.NursinPay.money(m, true) : ""; }
  function accPanel(tab) { if (!w.NursinPay) return; accTab = tab || accTab || "day"; panelOpen("acc", w.NursinPay.panelHtml(accTab)); w.NursinPay.sync().then(function () { if (panel === "acc") panelOpen("acc", w.NursinPay.panelHtml(accTab)); }); }
  var accTab = "day";
  function chimeEl() { var a = ac(); if (!a) return; tone(a, 660, 0, 0.25, 0.08); tone(a, 880, 0.18, 0.35, 0.07); }

  /* ---------------- 28z 🏥 the hospital floor ----------------
     ONE continuous floor: the department the nurse stands in is the big room above (everything as before); below, the whole floor small —
     🧠 الأعصاب · 🫀 القلب · 🚑 الطوارئ along one corridor, the ER entrance with «🛏️ سرير الإسعاف» where the ambulances stop. Each small
     room shows its two beds (status colours), the students in it (👥 N) and me (📍). A tap on another room → my nurse walks to the door of
     the big room, the big room shrinks into the floor, the nurse walks along the corridor, and the new department grows into the big room. */
  // 29e: four floors; each has a row of rooms above the corridor and a row below it (the 🛗 always bottom-left)
  var FW = 360, FH = 156, ROOMS = { n: { x: 6, y: 4, w: 108, h: 60, f: 1 }, k: { x: 126, y: 4, w: 108, h: 60, f: 1 }, er: { x: 246, y: 4, w: 108, h: 60, f: 0 }, x: { x: 246, y: 96, w: 108, h: 28, f: 0 },
    r: { x: 246, y: 4, w: 108, h: 60, f: 1 }, s: { x: 6, y: 4, w: 100, h: 60, f: 2 }, g: { x: 258, y: 4, w: 96, h: 60, f: 2 },
    acc: { x: 6, y: 4, w: 46, h: 60, f: 0 }, lab: { x: 56, y: 4, w: 46, h: 60, f: 0 }, rad: { x: 106, y: 4, w: 46, h: 60, f: 0 }, ph: { x: 156, y: 4, w: 42, h: 60, f: 0 }, bb: { x: 202, y: 4, w: 40, h: 60, f: 0 },
    wt: { x: 46, y: 96, w: 100, h: 30, f: 0 }, adm: { x: 150, y: 96, w: 48, h: 30, f: 0 }, ns0: { x: 202, y: 96, w: 40, h: 30, f: 0 },
    ns1: { x: 46, y: 96, w: 80, h: 30, f: 1 }, or: { x: 110, y: 4, w: 70, h: 60, f: 2 }, sspi: { x: 184, y: 4, w: 70, h: 60, f: 2 }, ns2: { x: 46, y: 96, w: 70, h: 30, f: 2 }, ster: { x: 120, y: 96, w: 70, h: 30, f: 2 },
    p: { x: 6, y: 4, w: 110, h: 60, f: 3 }, m: { x: 120, y: 4, w: 110, h: 60, f: 3 }, psy: { x: 234, y: 4, w: 120, h: 60, f: 3 },
    ns3: { x: 46, y: 96, w: 60, h: 30, f: 3 }, stf: { x: 110, y: 96, w: 70, h: 30, f: 3 }, cln: { x: 184, y: 96, w: 56, h: 30, f: 3 }, arch: { x: 244, y: 96, w: 60, h: 30, f: 3 },
    el: { x: 6, y: 96, w: 34, h: 30, f: -1 } };
  var DCOL = { er: "#dc2626", k: "#e11d48", n: "#7c3aed", x: "#ea580c", r: "#0891b2", s: "#475569", g: "#a16207", wt: "#0d9488", acc: "#ca8a04", lab: "#2563eb", rad: "#64748b", ph: "#16a34a",
    adm: "#0e7490", ns0: "#0f766e", ns1: "#0f766e", ns2: "#0f766e", ns3: "#0f766e", or: "#334155", sspi: "#0369a1", bb: "#b91c1c", ster: "#6d28d9", arch: "#78716c", psy: "#4f46e5", p: "#f59e0b", m: "#db2777", cln: "#65a30d", stf: "#92400e" },
    SCOL = { ok: "#16a34a", impr: "#eab308", unst: "#f97316", crit: "#dc2626", lost: "#64748b" };
  var SHORT = { ns: { ar: "التمريض", fr: "Soins" }, adm: { ar: "استقبال", fr: "Accueil" }, sspi: { ar: "إنعاش", fr: "SSPI" }, or: { ar: "عمليات", fr: "Bloc" }, ster: { ar: "تعقيم", fr: "Stéril." },
    arch: { ar: "أرشيف", fr: "Archives" }, cln: { ar: "تنظيف", fr: "Entretien" }, stf: { ar: "استراحة", fr: "Pause" }, bb: { ar: "بنك الدم", fr: "Sang" }, lab: { ar: "مختبر", fr: "Labo" },
    rad: { ar: "أشعة", fr: "Radio" }, ph: { ar: "صيدلية", fr: "Pharma" }, acc: { ar: "محاسبة", fr: "Compta" }, psy: { ar: "النفسي", fr: "Psychiatrie" } };
  var FLS = [{ ar: "الأرضي", fr: "RDC" }, { ar: "الأوّل", fr: "1er" }, { ar: "التاني", fr: "2e" }, { ar: "التالت", fr: "3e" }];   // 29e: short tab names (4 tabs at 390 px)
  var CORR_Y = 80, vf = 0, vfAt = 0, elT = 0;                      // 29d 🛗: vf = the floor drawn on the strip (mine, or one I peek at with the tabs)
  function FLR(dk) { return w.LiveDept.floorOf(dk); }
  function depName(dk) { var I = w.LiveDept.INFO[dk || L.dep()]; return I.ic + " " + T(I.t); }
  function depTitle() { var dk = L.dep(); return dk === "er" ? u("title") + " · " + depName("er") : depName(dk); }
  function svcRoom() { return w.LiveDept.isSvc(L.dep()); }
  function fsize() {
    if (!fcv) return; var box = fcv.parentNode, wv = box.clientWidth - 12; if (wv <= 0) return;
    fsc = Math.min(wv / FW, 1.9); fdpr = Math.min(2, w.devicePixelRatio || 1);
    if (ov) {                                               // 29h 📱 the room first (phone + laptop): it keeps ≥ ROOM_MIN scale, the floor map takes what is left (≥ 84 px)
      var used = 0; [".lcr-top", ".lcr-ban", ".lcr-pts", ".lcr-bar", ".lcr-flt"].forEach(function (s0) { var e0 = q(s0); if (e0) used += e0.offsetHeight; });
      var free = ov.clientHeight - used - 14, mapH = Math.max(84, free - Math.round(E.H * Math.min(ROOM_MIN, (box.clientWidth || 360) / E.W)));
      if (ov.clientHeight > 0 && free > 0) fsc = Math.min(fsc, mapH / FH);
    }
    fcv.style.width = Math.round(FW * fsc) + "px"; fcv.style.height = Math.round(FH * fsc) + "px";
    fcv.width = Math.round(FW * fsc * fdpr); fcv.height = Math.round(FH * fsc * fdpr);
  }
  function door(dk) { var r = ROOMS[dk]; return dk === "x" ? { x: r.x + 26, y: r.y } : r.y >= 90 ? { x: r.x + r.w / 2, y: r.y } : { x: r.x + r.w / 2, y: r.y + r.h }; }
  // where a student (room coordinates 360×600) stands on the small room
  function mini(dk, x, y) { var r = ROOMS[dk] || ROOMS.er; return r.h < 40 ? { x: r.x + 6 + (x / 360) * (r.w - 12), y: r.y + 6 + (y / 600) * (r.h - 10) } : { x: r.x + 5 + (x / 360) * (r.w - 10), y: r.y + 16 + (y / 600) * (r.h - 20) }; }
  // the corridor walk from one door to another: down to the corridor, along it, up into the other room (t 0…1)
  function cwalk(a, b, t) {
    var A = door(a), B = door(b), P = [A, { x: A.x, y: CORR_Y }, { x: B.x, y: CORR_Y }, B], L2 = [], tot = 0, i;
    for (i = 1; i < P.length; i++) { var l = Math.abs(P[i].x - P[i - 1].x) + Math.abs(P[i].y - P[i - 1].y); L2.push(l); tot += l; }
    var dd = Math.max(0, Math.min(1, t)) * tot;
    for (i = 1; i < P.length; i++) { if (dd <= L2[i - 1] || i === P.length - 1) { var k = L2[i - 1] ? Math.min(1, dd / L2[i - 1]) : 1; return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * k, y: P[i - 1].y + (P[i].y - P[i - 1].y) * k, dir: Math.atan2(P[i].y - P[i - 1].y, P[i].x - P[i - 1].x) }; } dd -= L2[i - 1]; }
    return B;
  }
  // 29d: the legs of a walk — the same floor = one corridor walk; another floor = to the 🛗, the ride, from the 🛗
  function legs(a, b) { var fa = FLR(a), fb = FLR(b); return fa === fb ? [{ a: a, b: b, f: fa, d: 1.6 }] : [{ a: a, b: "el", f: fa, d: 1.1 }, { ride: 1, f0: fa, f1: fb, d: 1.6 }, { a: "el", b: b, f: fb, d: 1.1 }]; }
  // where a walker is on floor f at phase t (0…1 over all his legs) — or null when he is on another floor / in the 🛗
  function legPos(a, b, t, f) {
    var Ls = legs(a, b), tot = 0, i; Ls.forEach(function (x) { tot += x.d; }); var dd = Math.max(0, Math.min(1, t)) * tot;
    for (i = 0; i < Ls.length; i++) { var x = Ls[i]; if (dd <= x.d || i === Ls.length - 1) { var k = Math.min(1, dd / x.d); if (x.ride) return null; return x.f === f ? (Ls.length === 1 ? cwalk(p0(x), p1(x), k) : cwalk(x.a, x.b, k)) : null; } dd -= x.d; }
    return null;
    function p0(x) { return x.a; } function p1(x) { return x.b; }
  }
  function hosp() { return L.hospital ? L.hospital() : null; }
  var hCache = null, hAt = 0;
  function hNow() { var n = Date.now(); if (!hCache || n - hAt > 1500) { hCache = hosp(); hAt = n; } return hCache; }
  function waitList() { var H0 = hNow(); return (H0 && H0.wait) || []; }
  function myFloor() { return trv ? (trv.leg && trv.leg.f != null ? trv.leg.f : FLR(trv.from)) : FLR(L.dep()); }
  function viewF() { if (trv) return trv.leg && trv.leg.ride ? (trv.lt < 0.5 ? trv.leg.f0 : trv.leg.f1) : myFloor(); return vfAt && Date.now() - vfAt < 45000 ? vf : FLR(L.dep()); }
  function flTabs() {
    var el = q(".lcr-flt"); if (!el) return; var f0 = viewF(), mf = myFloor(), W0 = waitList().length;
    el.innerHTML = '<span class="lcr-fll">🛗</span>' + [3, 2, 1, 0].map(function (f) {
      var cnt = pAll.filter(function (p) { return FLR(p.dep) === f; }).length + (mf === f ? 1 : 0);
      return '<button type="button" role="tab" class="lcr-flb' + (f === f0 ? " on" : "") + (f === mf ? " me" : "") + '" data-lcfl="' + f + '" aria-selected="' + (f === f0) + '">' + esc(T(FLS[f])) +
        (cnt && w.LivePresRoom && w.LivePresRoom.active() ? " <small>👥" + cnt + "</small>" : "") + (f === 0 && W0 ? ' <small class="w">🪑' + W0 + "</small>" : "") + "</button>";
    }).join("");
  }
  function roomBox(c, k, r, on, col, nt) {
    c.fillStyle = "rgba(0,0,0,.10)"; rr(c, r.x + 2, r.y + 3, r.w, r.h, 9); c.fill();
    c.fillStyle = nt ? "#17232a" : "#ffffff"; rr(c, r.x, r.y, r.w, r.h, 9); c.fill();
    c.fillStyle = col; c.globalAlpha = on ? 0.18 : 0.08; rr(c, r.x, r.y, r.w, r.h, 9); c.fill(); c.globalAlpha = 1;
    c.lineWidth = on ? 2.4 : 1; c.strokeStyle = on ? col : (nt ? "#33474f" : "#b8cbc7"); rr(c, r.x, r.y, r.w, r.h, 9); c.stroke();
    var dr = door(k); c.fillStyle = nt ? "#1c2b32" : "#f6faf9"; c.fillRect(dr.x - 8, dr.y - 2, 16, 4);
  }
  function floorDraw(t, dt) {
    if (!fcx || !fcv.width) return; var c = fcx, P = pal(), H0 = hNow(), dk = L.dep(), nt = night(), f = viewF(), WL = (H0 && H0.wait) || [];
    c.setTransform(fsc * fdpr, 0, 0, fsc * fdpr, 0, 0); c.clearRect(0, 0, FW, FH);
    c.fillStyle = nt ? "#0f1a1f" : "#dfe9e7"; c.fillRect(0, 0, FW, FH);
    c.fillStyle = nt ? "#1c2b32" : "#f6faf9"; rr(c, 2, CORR_Y - 10, FW - 4, 20, 8); c.fill();
    c.strokeStyle = nt ? "#2b3f47" : "#c9d9d6"; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(44, CORR_Y); c.lineTo(FW - 8, CORR_Y); c.stroke(); c.setLineDash([]);
    if (f === 0) { c.fillStyle = nt ? "#232f35" : "#9aa7ad"; rr(c, 0, 132, 240, 20, 4); c.fill(); c.strokeStyle = "rgba(255,255,255,.55)"; c.setLineDash([8, 7]); c.beginPath(); c.moveTo(4, 142); c.lineTo(236, 142); c.stroke(); c.setLineDash([]); }
    label(c, P, 200, CORR_Y, "🚶 " + u("corr") + " · " + T(w.LiveDept.FLN[f]));
    // 🛗 the elevator (same place on every floor): doors close, the number changes, doors open
    var E0 = ROOMS.el, ride = trv && trv.leg && trv.leg.ride, gap = ride ? Math.abs(Math.sin(Math.min(1, trv.lt) * Math.PI)) : 0;
    c.fillStyle = nt ? "#334155" : "#94a3b8"; rr(c, E0.x, E0.y, E0.w, E0.h, 5); c.fill();
    c.fillStyle = nt ? "#cbd5e1" : "#e2e8f0"; var hw = (E0.w - 6) / 2 * (0.35 + 0.65 * gap); c.fillRect(E0.x + 3, E0.y + 8, hw, E0.h - 11); c.fillRect(E0.x + E0.w - 3 - hw, E0.y + 8, hw, E0.h - 11);
    c.fillStyle = "#0f172a"; c.fillRect(E0.x + 9, E0.y + 1, 16, 7); c.fillStyle = "#fbbf24"; c.font = "700 6.5px " + EMO; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(ride ? (trv.lt < 0.5 ? trv.leg.f0 : trv.leg.f1) : f), E0.x + 17, E0.y + 4.8);
    c.font = "9px " + EMO; c.fillText("🛗", E0.x + 17, E0.y + E0.h - 7);
    // the rooms of this floor
    Object.keys(ROOMS).forEach(function (k) {
      var r = ROOMS[k]; if (r.f !== f) return; var S = H0 && H0[k], on = k === dk && !trv, col = DCOL[k], soon = !!w.LiveDept.SOON[k];
      roomBox(c, k, r, on, col, nt);
      c.font = "700 " + (r.w < 70 ? 7 : 8.5) + "px " + EMO; c.textBaseline = "middle"; c.direction = FR() ? "ltr" : "rtl"; c.textAlign = "center"; c.fillStyle = nt ? "#dff3ee" : "#17323a";
      var I = w.LiveDept.INFO[k];
      if (k !== "x" && k !== "wt") { var sn = T(SHORT[k] || SHORT[k.replace(/\d$/, "")] || I.t);
        if (r.h < 40) { c.font = "9px " + EMO; c.fillText(I.ic, r.x + r.w / 2, r.y + 9); c.font = "700 " + (r.w < 50 ? 5.6 : 6.4) + "px " + EMO; c.fillText(sn, r.x + r.w / 2, r.y + 21); }
        else if (r.w < 70) { c.font = "11px " + EMO; c.fillText(I.ic, r.x + r.w / 2, r.y + 13); c.font = "700 " + (r.w < 46 ? 6 : 6.6) + "px " + EMO; c.fillText(sn, r.x + r.w / 2, r.y + 26); }
        else c.fillText(r.w < 100 ? I.ic + " " + sn : depName(k), r.x + r.w / 2, r.y + 9); }
      if (soon) { c.save(); c.globalAlpha = 0.5; c.strokeStyle = nt ? "#475569" : "#cbd5e1"; c.lineWidth = 1; for (var hx = r.x - r.h; hx < r.x + r.w; hx += 8) { c.beginPath(); c.moveTo(Math.max(r.x, hx), r.y + Math.max(0, r.x - hx)); c.lineTo(Math.min(r.x + r.w, hx + r.h), r.y + Math.min(r.h, r.x + r.w - hx)); c.stroke(); } c.restore();
        c.font = "700 " + (r.w < 70 ? 6.4 : 8) + "px " + EMO; c.fillStyle = nt ? "#fde68a" : "#92400e"; c.fillText(u("soonT"), r.x + r.w / 2, r.y + r.h - (r.w < 70 ? 14 : 18)); }
      if (k === "acc") { var pay = w.NursinPay; c.font = "700 6.4px " + EMO; c.fillStyle = nt ? "#fde68a" : "#854d0e"; c.fillText(pay ? pay.money(pay.mine()) : "💵", r.x + r.w / 2, r.y + 42); }
      if (k === "wt") {                                          // 🪑 the chairs; each waiting patient a small seated dot (red pulse = 🔴 by his signs)
        c.font = "700 7.5px " + EMO; c.fillStyle = nt ? "#99f6e4" : "#115e59"; c.textAlign = FR() ? "left" : "right"; c.fillText(depName("wt"), FR() ? r.x + 6 : r.x + r.w - 6, r.y + 8); c.textAlign = "center";
        var seats = WL.filter(function (x) { return x.kind !== "amb"; });
        var nseat = Math.max(3, Math.floor((r.w - 8) / 15)); for (var si = 0; si < nseat; si++) { var sx = r.x + 10 + si * 15, sy = r.y + 20; c.fillStyle = nt ? "#334155" : "#cbd5e1"; rr(c, sx - 5, sy - 3, 10, 8, 2); c.fill();
          var wv = seats[si]; if (wv) { var pr = w.LiveDept.prio(wv.p).pr; c.fillStyle = pr === 1 ? "#dc2626" : "#0f766e"; if (pr === 1) c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 6); c.beginPath(); c.arc(sx, sy - 2, 3.4, 0, 7); c.fill(); c.globalAlpha = 1; } }
        if (seats.length > nseat) label(c, P, r.x + r.w - 14, r.y + 8, "+" + (seats.length - nseat));
      }
      if (S && S.P && k !== "wt") {                              // the beds (empty while the patient waits outside)
        var beds = k === "x" ? [{ x: r.x + r.w - 40, y: r.y + 5, w: 34, h: 18 }] : [{ x: r.x + 8, y: r.y + 18, w: 40, h: 26 }, { x: r.x + r.w - 48, y: r.y + 18, w: 40, h: 26 }];
        beds.forEach(function (b, i) {
          var x = S.P[i], gone = !x || x.ghost, inn = x && !gone && L.admOf(k, x.k, S.amb && S.amb.i);
          c.fillStyle = nt ? "#5d6f79" : "#7d8c96"; rr(c, b.x, b.y, b.w, b.h, 5); c.fill(); c.fillStyle = nt ? "#cdd7dc" : "#fff"; rr(c, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 4); c.fill();
          if (!gone && (inn || x.over)) {
            var sc = x.over ? "#94a3b8" : SCOL[x.st] || "#f97316"; c.fillStyle = sc; rr(c, b.x + 3, b.y + b.h * 0.45, b.w - 6, b.h * 0.5, 3); c.fill();
            if (!x.over && (x.st === "crit")) { c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 6); c.strokeStyle = "#dc2626"; c.lineWidth = 2; rr(c, b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3, 6); c.stroke(); c.globalAlpha = 1; }
            c.font = "7px " + EMO; c.fillStyle = "#0f172a"; c.textAlign = "center"; c.fillText(x.over ? (x.over.w === "ok" ? "✅" : "💔") : "🛌", b.x + b.w / 2, b.y + 7);
          } else if (!gone) { c.font = "8px " + EMO; c.textAlign = "center"; c.fillText("🪑", b.x + b.w / 2, b.y + b.h / 2 + 1); }
        });
      }
      if (k === "x") { c.font = "700 8px " + EMO; c.fillStyle = nt ? "#fed7aa" : "#9a3412"; c.textAlign = "center"; var tx2 = S && S.P && S.P[0] && !S.end ? "🛏️ " + T(w.LiveDept.INFO.x.t) : u("entr"); c.fillText(tx2, r.x + 34, r.y + 15); }
      // 👥 how many in it
      var cnt = pAll.filter(function (p) { return p.dep === k && (p.tdep || p.dep) === k; }).length + (on ? 1 : 0);
      if (cnt > 0 && w.LivePresRoom && w.LivePresRoom.active()) { label(c, P, k === "x" ? r.x + 12 : r.x + r.w - 14, k === "x" ? r.y + 24 : r.y + r.h - 7, "👥 " + cnt, col); }
      if (on) label(c, P, k === "x" ? r.x + 30 : r.x + Math.min(22, r.w / 2), k === "x" ? r.y - 6 : r.y + r.h - 7, r.w < 70 ? "📍" : u("here"), "#0f766e");
    });
    // the others: in their room on this floor, or walking (the corridor, the 🛗)
    var LP = w.LivePres, now = Date.now() + (w.LivePresRoom ? w.LivePresRoom.skew() : 0);
    pAll.forEach(function (p, i) {
      var a = LP ? LP.alpha(now - p.at) : 1; if (a <= 0) return; var pos = null;
      if (p.dep !== p.tdep) { var ph = ((t * 0.25 + (LP.color(p.uid).length % 7) / 7) % 1); pos = FLR(p.dep) === FLR(p.tdep) ? (FLR(p.dep) === f ? cwalk(p.dep, p.tdep, ph) : null) : legPos(p.dep, p.tdep, ph, f); }
      else if (FLR(p.dep) === f && ROOMS[p.dep]) pos = mini(p.dep, p.x, p.y);
      if (!pos) return;
      c.globalAlpha = a; c.fillStyle = LP ? LP.color(p.uid) : "#2563eb"; c.beginPath(); c.arc(pos.x, pos.y, 3.6, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    });
    // me (+ the patient I am bringing in, in his wheelchair)
    var me = null;
    if (trv && trv.ph === 2) { var lg = trv.leg; if (lg && !lg.ride && lg.f === f) me = cwalk(lg.a, lg.b, trv.lt); }
    else if (!trv && FLR(dk) === f) me = nurse ? mini(dk, nurse.x, nurse.y) : null;
    else if (trv && trv.ph !== 2 && FLR(trv.from) === f) me = nurse ? mini(trv.from, nurse.x, nurse.y) : null;
    if (me) { var bob = trv && trv.ph === 2 ? Math.sin(t * 18) * 0.8 : 0; c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(me.x + 1, me.y + 2.5, 5, 3, 0, 0, 7); c.fill(); c.fillStyle = "#dc2626"; c.beginPath(); c.arc(me.x, me.y + bob, 4.6, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.4; c.stroke(); c.fillStyle = P.skin; c.beginPath(); c.arc(me.x, me.y + bob - 0.5, 2, 0, 7); c.fill();
      if (trv && trv.esc && trv.ph === 2) { c.font = "8px " + EMO; c.textAlign = "center"; c.fillText("🧑‍🦽", me.x - 9, me.y + 1); } }
    // 🚑 the ambulance (ground floor): drives up the road to the ER entrance, lights flashing, then waits there a few minutes
    var A = H0 && H0.amb, cur = A && A.cur, since = cur ? Date.now() - cur.t : 1e12;
    if (f === 0 && cur && since < 12 * 6e4) {
      if (!ambAnim || ambAnim.i !== cur.i) ambAnim = { i: cur.i, t0: since < 30000 ? t : t - 9 };
      var k2 = Math.min(1, (t - ambAnim.t0) / 3.2), e2 = 1 - Math.pow(1 - k2, 3), ax = -50 + e2 * 236;
      ambDraw(c, ax, 134, t, k2 < 1 || since < 5 * 6e4);
      if (k2 >= 1 && WL.some(function (x) { return x.kind === "amb"; })) { c.font = "11px " + EMO; c.textAlign = "center"; c.fillText("🛏️", 232, 128); }
    }
    if (trv && trv.ph === 2) label(c, P, 200, FH - 4, trv.leg && trv.leg.ride ? u("ride", { f: T(w.LiveDept.FLN[trv.leg.f1]) }) : u("walk", { d: depName(trv.to) }), "#0f766e");
    if (Math.floor(t * 2) !== elT) { elT = Math.floor(t * 2); flTabs(); }
  }
  function ambDraw(c, x, y, t, lights) {
    c.fillStyle = "rgba(0,0,0,.18)"; rr(c, x + 2, y + 3, 46, 16, 4); c.fill();
    c.fillStyle = "#ffffff"; rr(c, x, y, 46, 16, 4); c.fill(); c.strokeStyle = "#94a3b8"; c.lineWidth = 1; rr(c, x, y, 46, 16, 4); c.stroke();
    c.fillStyle = "#fb923c"; c.fillRect(x + 2, y + 9, 34, 3); c.fillStyle = "#93c5fd"; rr(c, x + 36, y + 2, 9, 7, 2); c.fill();
    c.fillStyle = "#dc2626"; c.fillRect(x + 15, y + 2.5, 8, 2.5); c.fillRect(x + 17.75, y + 0, 2.5, 7.5);
    if (lights) { var on = Math.sin(t * 14) > 0; c.fillStyle = on ? "#ef4444" : "#3b82f6"; c.beginPath(); c.arc(x + 30, y - 1, 3, 0, 7); c.fill(); c.globalAlpha = 0.25; c.beginPath(); c.arc(x + 30, y - 1, 9, 0, 7); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = "#1f2937"; c.beginPath(); c.arc(x + 9, y + 16, 3, 0, 7); c.arc(x + 37, y + 16, 3, 0, 7); c.fill();
  }
  function onFloorTap(e) { kick();
    e.preventDefault(); if (trv) return;
    var r = fcv.getBoundingClientRect(), x = (e.clientX - r.left) / fsc, y = (e.clientY - r.top) / fsc, f = viewF();
    var o0 = ROOMS.el; if (x >= o0.x - 4 && x <= o0.x + o0.w + 4 && y >= o0.y - 4 && y <= o0.y + o0.h + 4) { vf = (f + 1) % w.LiveDept.FLN.length; vfAt = Date.now(); flTabs(); return say("neutral", u("elev") + " · " + T(w.LiveDept.FLN[vf]), u("elevW")); }
    for (var k in ROOMS) { var o = ROOMS[k]; if (o.f !== f) continue; if (x >= o.x - 4 && x <= o.x + o.w + 4 && y >= o.y - 4 && y <= o.y + o.h + 4) return walkTo(k); }
    if (f === 0 && y > 128 && x < 244) { var H0 = hNow(); if (H0 && H0.amb && H0.amb.cur) return walkTo(L.admOf("x", "a", H0.amb.cur.i) ? "x" : "wt"); return say("neutral", u("noAmb"), u("noAmb2")); }
  }
  // the walk: ① to the door of the big room ② the big room shrinks, the nurse walks the corridor (+ the 🛗 to another floor) ③ the new room grows, he walks in
  function walkTo(dk) {
    var esc0 = arguments[1];                                    // 29d: the patient I wheel in (his first name), if any
    if (trv) return; var cur = L.dep();
    if (dk === cur) return say("neutral", u("inDep", { d: depName(dk) }));
    if (Object.keys(work).length) workAll("wkGone");             // 29d ⏳ leaving the room stops what his hands were doing
    if (dk === "x") { var H0 = hosp(); if (!H0 || !H0.amb || !H0.amb.cur) return say("neutral", u("noAmb"), u("noAmb2")); }
    sheetClose(); panelClose(); hintOpen = null; handOpen = null; helpOpen = false; helpTxt = ""; helpAsk = null; talkOpen = null; helpPaint();
    if (offer && offer.shown) AS.hide(offer, nowMs());
    var dr = { x: 180, y: E.H - 16 };
    trv = { from: cur, to: dk, ph: 1, t: 0, esc: esc0 || null };
    nurse.goal = null; nurse.pts = G && !svcRoom() ? R.path(G, nurse, dr) : [dr]; mark = null;
    if (!nurse.pts.length) travelNext();
  }
  function travelNext() {
    if (!trv) return;
    if (trv.ph === 1) { trv.ph = 2; trv.t = 0; trv.Ls = legs(trv.from, trv.to); trv.li = 0; trv.leg = trv.Ls[0]; trv.lt = 0; cv.classList.remove("zin"); cv.classList.add("zout"); return; }
    if (trv.ph === 2) {
      trv.ph = 3; var to = trv.to, esc0 = trv.esc; L.setDep(to); st = L.state() || st; bg = null;
      nurse.x = 180; nurse.y = E.H - 18; nurse.dir = -Math.PI / 2; nurse.pts = G && !svcRoom() ? R.path(G, nurse, { x: 180, y: E.H - 92 }) : [{ x: 180, y: E.H - 92 }];
      if (asst) AS.snap(asst, nurse, E.W, E.H);                   // 29p: he comes in with me
      cv.classList.remove("zout"); cv.classList.add("zin0"); void cv.offsetWidth; cv.classList.remove("zin0"); cv.classList.add("zin");
      trv = null; vfAt = 0; chime(); announce(to); pList = mine(pAll); peers = {}; flTabs();
      if (esc0) say("good", u("triIn", { n: esc0, d: depName(to) }), u("triInW"));
      else say("good", depName(to), to === "wt" ? (waitList().length ? u("waitHint") : u("waitNone")) : to === "acc" ? u("accW") : st && st.cs ? st.cs.ic + " " + T(st.cs.t) : "");
      if (to === "acc") setTimeout(function () { if (L.dep() === "acc" && !panel) accPanel(); }, 900);
    }
  }
  function travelTick(dt) {
    if (!trv) return;
    if (trv.ph === 1 && !nurse.pts.length) return travelNext();
    if (trv.ph === 2) {
      if (trv.Ls.length === 1) { trv.t += dt / 1.6; trv.lt = trv.t; if (trv.t >= 1) travelNext(); return; }
      trv.lt += dt / trv.leg.d; if (trv.lt >= 1) { trv.li++; if (trv.li >= trv.Ls.length) return travelNext(); trv.leg = trv.Ls[trv.li]; trv.lt = 0; if (trv.leg.ride) chimeEl(); }
    }
  }
  // 🔊 «صوت القسم»: a soft two-note chime + the department's name said out loud when you walk in; 🚨 a siren when an ambulance arrives.
  // Off until the student turns it on (🔇 → 🔊 in the top bar; phones block sound before a tap anyway)
  function sndPaint() { try { snd = localStorage.getItem(SNDK) === "1"; } catch (e) {} var b = q(".lcr-snd"); if (b) { b.textContent = snd ? "🔊" : "🔇"; b.setAttribute("aria-label", u(snd ? "sndOn" : "sndOff")); b.title = u(snd ? "sndOn" : "sndOff"); } }
  function ac() { if (!snd) return null; try { actx = actx || new (w.AudioContext || w.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; } catch (e) { return null; } }
  function tone(a, f, t0, dur, vol, type) { var o = a.createOscillator(), g = a.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, a.currentTime + t0); g.gain.setValueAtTime(0.0001, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur); o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05); return o; }
  function chime() { var a = ac(); if (!a) return; tone(a, 784, 0, 0.5, 0.12); tone(a, 587, 0.28, 0.7, 0.1); }
  function announce(dk) { if (!snd || !w.speechSynthesis || !w.SpeechSynthesisUtterance) return; try { var I = w.LiveDept.INFO[dk], m = new SpeechSynthesisUtterance(u("welcome", { d: T(I.t) })); m.lang = FR() ? "fr-FR" : "ar-SA"; m.rate = 1; m.volume = 0.8; w.speechSynthesis.cancel(); setTimeout(function () { w.speechSynthesis.speak(m); }, 650); } catch (e) {} }
  function siren() { var a = ac(); if (!a) return; for (var i = 0; i < 3; i++) { var o = tone(a, 660, i * 0.9, 0.85, 0.08, "triangle"); o.frequency.linearRampToValueAtTime(960, a.currentTime + i * 0.9 + 0.45); o.frequency.linearRampToValueAtTime(660, a.currentTime + i * 0.9 + 0.85); } }
  // 🚨 a new ambulance (the same moment on every phone): the siren banner (once per ambulance per phone), the siren sound if on
  function ambCheck() {
    var H0 = hosp(), A = H0 && H0.amb, cur = A && A.cur; if (!cur) return;
    var key = "nursin_live_amb_v1", seen = ""; try { seen = localStorage.getItem(key) || ""; } catch (e) {}
    var id = C.docId(C.dayKey(cur.t)) + "-" + cur.i; if (ambSeen === id) return; ambSeen = id;
    if (seen === id || Date.now() - cur.t > 15 * 6e4) return;
    try { localStorage.setItem(key, id); } catch (e) {}
    sirenShow(); siren(); if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate([120, 80, 120]); } catch (e) {}
  }
  function sirenShow() {
    var el = q(".lcr-siren"); if (!el) return; var H0 = hosp(), X0 = H0 && H0.x, p = X0 && X0.P[0];
    el.innerHTML = '<b>' + esc(u("sirenT")) + "</b>" + (p ? "<small>" + esc(T(p.p.nm) + " · " + p.p.age + " " + u("ageY") + " — " + T(p.p.who)) + "</small>" : "") +
      '<span><button type="button" class="lcr-sirb" data-lcamb="1">' + esc(u("sirenGo")) + '</button><button type="button" class="lcr-sirb x" data-lcsirx="1" aria-label="' + esc(u("close")) + '">✕</button></span>';
    el.hidden = false; clearTimeout(el._t); el._t = setTimeout(sirenHide, 20000);
  }
  function sirenHide() { var el = q(".lcr-siren"); if (el) el.hidden = true; }

  /* ---------------- sheets ---------------- */
  function sheetOpen(kind, k, tab) { sheet = { kind: kind, k: k, tab: tab || "care" }; openQ = null; q(".lcr-sheet").hidden = false; sheetPaint(); }
  function sheetClose() { sheet = null; openQ = null; var s = q(".lcr-sheet"); if (s) s.hidden = true; if (Object.keys(work).length) workPaint(); }
  function sheetPaint() {
    if (!sheet || !st) return; var el = q(".lcr-shin"), h = "";
    if (sheet.kind === "bed") h = bedHtml(sheet.k, sheet.tab); else if (sheet.kind === "desk") h = deskHtml(); else if (sheet.kind === "tri") h = triHtml(sheet.k); else if (sheet.kind === "wait") h = waitHtml(sheet.k); else if (sheet.kind === "fu") h = fuListHtml(); else if (sheet.kind === "svc") h = svcHtml(sheet.k); else if (sheet.kind === "dc") h = dcHtml(sheet.k);
    else if (sheet.kind === "fam") h = famHtml(sheet.k); else if (sheet.kind === "inc") h = incHtml(sheet.k); else h = stationHtml(sheet.k);
    // 28w: a repaint never lands under a finger (a snapshot arriving between touchstart and touchend swallowed the tap on iPhone) and an unchanged sheet is not rebuilt
    if (sheetTouch) { sheetLate = true; return; }
    if (h !== el.__h) { var sc = el.scrollTop; el.innerHTML = h; el.__h = h; el.scrollTop = sc; }
    bedHint();
  }
  var sheetTouch = false, sheetLate = false;
  function sheetHold(on) { sheetTouch = on; if (!on && sheetLate) { sheetLate = false; setTimeout(function () { if (!sheetTouch) sheetPaint(); }, 380); } }
  function head(t, sub) { return '<div class="lcr-sh"><b>' + t + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + '<button type="button" class="lcr-shx" data-lcclose="1" aria-label="' + esc(u("close")) + '">✕</button></div>'; }
  function bedSheet(k, tab) { sheetOpen("bed", k, tab); }
  function bedHtml(k, tab) {
    var x = X(k), p = x.p, i = k === "b" ? 2 : 1;
    var h = head("🛏️" + i + " " + esc(nm(x)) + " · " + p.age + " " + esc(u("ageY")) + " · " + (p.sex === "m" ? "♂" : "♀"), esc(L.stLabel(x.st, x.p.sex)) + " · " + esc(x.over ? ug("pDone", x) : T(U["ph" + x.ph])) + " · ✅ " + x.n + "/" + x.tot);
    h += '<p class="lcr-pbed" hidden></p>';
    if (LCa) { var wb = work[pidOf(k)]; if (wb) h += '<div class="lcr-wkin">' + workHtml(wb, Date.now()).replace(/<b dir="ltr">\d+s<\/b>/, "") + "</div>"; h += fuHtml(k); }   // 29d ⏳ + ⏰
    h += '<div class="lcr-tabs" role="tablist">' + ["care", "file", "story"].map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t === tab) + '" class="lcr-tab' + (t === tab ? " on" : "") + '" data-lctab="' + t + '">' + esc(u(t)) + "</button>"; }).join("") + "</div>";
    if (!x.over && !st.end) h += hintHtml(x);
    if (!x.over && !st.end) h += talkHtml(x);                     // 29m 💬
    if (tab === "care" && !st.end && (!x.over || x.over.w === "ok")) h += routBtns(x);           // 29e 🧼 🚪 👨‍👩‍👦 ⚠️ 🧾
    if (x.over && !st.end) {                                     // 28x: his case is finished — his steps stay, the other bed is one tap away
      var o = st.P[k === "b" ? 0 : 1];
      h += '<div class="lcr-pover ' + x.over.w + '" role="status"><b>' + esc(x.over.w === "ok" ? ug("pOk", x, { n: nm(x) }) : u("pLost", { n: nm(x) })) + "</b>" +
        (o.over ? "" : "<small>" + esc(ug("pGoOn", o, { n: nm(o) })) + "</small>") + '<div class="lcr-acts"><button type="button" class="lcr-btn on" data-lcrec="' + k + '">' + esc(u("pRec", { n: nm(x) })) + "</button>" +
        (o.over ? "" : '<button type="button" class="lcr-btn" data-lcbed="' + o.k + '">' + esc(u("pGo", { n: nm(o) })) + "</button>") + "</div></div>";
    }
    if (tab === "file") return h + fileHtml(x);
    if (tab === "story") return h + storyHtml(x);
    if (x.over) return h + '<ol class="lcr-steps lcr-psteps">' + x.L.map(function (sp) { var dn = x.done[sp.id]; return '<li class="' + (dn ? "ok" : "miss") + '"><b>' + (dn ? "✅ " : "⬜ ") + esc(L.stepName(sp)) + '</b> <small class="lcr-byw">' + (dn ? "✍️ " + esc(dn.n) + " · " + fmtT(dn.t) : esc(u("missed"))) + "</small></li>"; }).join("") + "</ol>";
    h += '<p class="lcr-who">' + esc(T(p.who)) + "</p>";
    h += '<p class="lcr-leg">' + esc(u("leg")) + "</p>";       // 28y: what the marks on the buttons mean
    var acc0 = x.by.acc && !x.done.acc;                         // 28w: «🤝 استقبال» was the last button of the sheet — while not done it comes first
    if (acc0) h += '<div class="lcr-grp lcr-first"><h4>' + esc(u("start")) + '</h4><div class="lcr-acts">' + nowBtn("acc") + "</div></div>";
    // 28y 🩻 the curtain between the two beds (paravent): before an exam / an intimate gesture
    h += '<div class="lcr-grp lcr-priv"><h4>' + esc(u("privacy")) + '</h4><div class="lcr-acts"><button type="button" class="lcr-act' + (x.screen ? " done" : "") + '" data-lcact="paravent">' +
      (x.screen ? "✅ " + esc(u("scrOn")) + "<small>" + esc(u("by") + " " + x.screen.n) + "</small>" : "🩻 " + esc(T(D.A.paravent || {}))) + "</button></div></div>";
    GROUPS.forEach(function (g) {
      // 29e: a ward's own gestures (A.dk) show in that ward — and always when they are one of HIS steps
      var dk9 = L.dep(); var btns = g[1].filter(function (a) { var A9 = D.A[a]; return A9 && A9.at === "bed" && !(acc0 && a === "acc") && (!A9.dk || A9.dk.indexOf(dk9) > -1 || x.by[a]); }).map(function (a) {
        var A = D.A[a], s = x.by[a], done = s && x.done[s.id], need = A.need, bk = need && BEDSIDE[need], has = !need || bk || hands.indexOf(need) > -1,
          I = need && D.I[need], rxq = I && I.rx && !x.done.call, St = I && E.stations[I.st], hit = hl && hl.k === x.k && hl.id === a && !done;
        // 28y: a mark says why a button is not ready yet (and the tap says it in words): ✋ + where the thing is · 📞? the doctor first · 🧴 at this bed
        var tag = done ? esc(u("by") + " " + done.n) : !has ? esc((I || {}).ic || "") + " ✋" + esc(St ? St.ic : "") : rxq ? esc(u("callQ")) : bk ? esc(u("bedKit")) : "";
        return '<button type="button" class="lcr-act' + (done ? " done" : "") + (has ? "" : " need") + (rxq && !done ? " rxq" : "") + (hit ? " lcr-hit" : "") + '" data-lcact="' + a + '">' + (done ? "✅ " : "") + A.ic + " " + esc(T(A).replace(/^(عطي |Donner : )/, "")) +
          (tag ? "<small>" + tag + "</small>" : "") + "</button>";
      }).join("");
      h += '<div class="lcr-grp"><h4>' + esc(u(g[0])) + '</h4><div class="lcr-acts">' + btns + "</div></div>";
    });
    // 28y 📤 hand over: the transmissions — or what is still missing first (as a hint, not the exact buttons)
    h += '<div class="lcr-grp lcr-handg"><div class="lcr-acts"><button type="button" class="lcr-act lcr-hand' + (x.done.f_tr ? " done" : "") + '" data-lchand="' + x.k + '">' + (x.done.f_tr ? "✅ " : "") + esc(u("hand")) + "</button></div>" +
      (handOpen === x.k && !x.done.f_tr && !C.avail(x, x.by.f_tr) ? leftBox(x, u("handNo", { n: nm(x) })) : "") + "</div>";
    return h;
  }
  // 28y: what is still to do for a patient, grouped like a hint (counts and kinds, never the exact buttons)
  function leftList(x) {
    var o = [], ph = function (n) { return T(U["ph" + n]).split(" ")[0]; }, care = [], kinds = [], files = 0, mon = false, acc = false;
    x.L.forEach(function (s) {
      if (x.done[s.id]) return;
      if (s.ph === 1 && (s.id === "acc" || s.kind === "file")) { acc = true; return; }
      if (s.kind === "file" && s.ph === 2) { files++; return; }
      if (s.id === "mon") { mon = true; return; }
      if (s.kind === "act") { care.push(s); var g = grpOf(s.a), lb = g === "call" ? u("gCall") : u(g); if (kinds.indexOf(lb) < 0) kinds.push(lb); }
    });
    if (acc) o.push(T(U.ph1));
    if (files || mon) o.push(ph(2) + " " + [files ? u("gFile") + ": " + (files === 1 ? u("nF1") : u("nF", { c: files })) : "", mon ? u("gMon") : ""].filter(Boolean).join(" · "));
    if (care.length) o.push(ph(3) + " " + u("gCare", { c: care.length }) + " (" + kinds.join(" · ") + ")");
    if (x.by.f_surv && !x.done.f_surv) o.push(T(U.ph4));
    if (x.by.f_tr && !x.done.f_tr) o.push(T(U.ph5));
    return o;
  }
  function leftBox(x, title) { return '<div class="lcr-left" role="note"><b>' + esc(title) + '</b><ul>' + leftList(x).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + '</ul><small>' + esc(u("hintTip")) + "</small></div>"; }
  function grpOf(a) { if (a === "call") return "call"; for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].indexOf(a) > -1) return GROUPS[i][0]; return "soin"; }
  function phNow(x) { return u("phNow", { p: T(U["ph" + Math.min(5, x.ph)]) }); }
  function myHints(x) { var me = L.me().uid; return x.hints.filter(function (e) { return e.u === me; }).length; }
  // 28y 💡 «طرف خيط» — level 1 (free, on this phone): the phase + what KIND of step comes next + where to look; level 2 (−1, ≤ 3 per patient): the exact step
  function hintHtml(x) {
    var op = hintOpen === x.k, h = '<div class="lcr-hint' + (op ? " on" : "") + '"><button type="button" class="lcr-hintb" data-lchint="' + x.k + '" aria-expanded="' + op + '">' + esc(u("hint")) + "</button>";
    if (!op) return h + "</div>";
    var c = C.clue(DK(), st, x.k);
    if (!c) return h + '<p class="small">' + esc(u("hintNone")) + "</p></div>";
    var s = c.s, g = s.kind === "file" ? "file" : s.id === "acc" ? "acc" : s.id === "mon" ? "mon" : grpOf(s.a), n = nm(x).split(" ")[0];
    var cat = { acc: u("cAcc"), file: u("cFile"), mon: u("cMon"), eval: u("cEval", { n: n }), pos: u("cPos"), soin: u("cSoin", { n: n }), rx: u("cRx"), call: u("cCall") }[g];
    var A = s.kind === "act" && D.A[s.a], I = A && A.need && !BEDSIDE[A.need] && D.I[A.need], Si = I && E.stations[I.st];
    var wh = { eval: u("wEval", { t: T(x.p.file.ant) }), pos: u("wPos"), soin: u("wSoin"), rx: u("wRx"), call: u("wCall") }[g] || "";
    h += '<p class="lcr-hph"><b>' + esc(phNow(x)) + "</b></p><p>" + esc(cat) + "</p>" + (wh ? '<p class="small">' + esc(wh) + "</p>" : "") + (Si && g !== "rx" ? '<p class="small">' + esc(u("wItem", { s: Si.ic + " " + T(Si) })) + "</p>" : "") +
      '<p class="small lcr-hleft">' + esc(u("left0") + " " + leftList(x).join(" · ")) + "</p>";
    var left = C.HMAX - myHints(x);
    h += '<button type="button" class="lcr-btn' + (left > 0 ? " on" : "") + '" data-lchint2="' + x.k + '">' + esc(left > 0 ? u("hintMore", { l: left, m: C.HMAX }) : u("hintNo", { m: C.HMAX })) + "</button>";
    if (hl && hl.k === x.k && x.by[hl.id] && !x.done[hl.id]) h += '<p class="lcr-hgot"><b>' + esc(u("hintGot") + " " + L.stepName(hl.s)) + "</b>" + (hl.s.why ? "<small>" + esc(T(hl.s.why)) + "</small>" : "") + "</p>" +
      (hl.id === "call" ? '<div class="lcr-acts"><button type="button" class="lcr-act lcr-hit" data-lcgodesk="1">' + esc(u("hintGo")) + "</button></div>" : "");
    return h + "</div>";
  }
  function storyHtml(x) {
    var p = x.p;
    return '<div class="lcr-story"><p class="lcr-who"><b>' + esc(T(p.who)) + "</b></p><p>🗣️ " + esc(T(p.story)) + "</p>" +
      "<h4>🩺 " + (FR() ? "Signes" : "العوارض") + "</h4><ul>" + p.sx.map(function (s) { return "<li>" + esc(T(s)) + "</li>"; }).join("") + "</ul>" +
      "<h4>🧪 " + (FR() ? "Examens" : "فحوصات") + "</h4><ul>" + p.lab.map(function (s) { return "<li>" + esc(T(s)) + "</li>"; }).join("") + "</ul>" +
      '<p class="small lcr-src">' + esc(T(st.cs.src)) + ' · <a href="' + st.cs.href + '">' + (FR() ? "📖 la leçon" : "📖 الدرس") + "</a></p></div>";
  }
  function fieldAnswer(x, f, cs) { var qd = C.opts(cs ? D : DK(), cs || st.cs, x.p, f); return qd.o[qd.a]; }
  function nowBtn(a) { var A = D.A[a]; return A ? '<button type="button" class="lcr-act lcr-now" data-lcact="' + a + '">' + A.ic + " " + esc(T(A).replace(/^(عطي |Donner : )/, "")) + "</button>" : ""; }
  // 28w: which steps still lock this field (null = it can be filled now)
  function fieldLock(x, s) {
    if (!s || x.done[s.id] || C.avail(x, s)) return null;
    var m = C.missing(x, s), aft = m.filter(function (q) { return s.after.indexOf(q.id) > -1; }), ph = m.filter(function (q) { return q.ph < s.ph; });
    return { m: m, aft: aft, ph: ph, low: ph.length ? Math.min.apply(null, ph.map(function (q) { return q.ph; })) : 0 };
  }
  function fileHtml(x) {
    var order = ["id", "motif", "all", "ant", "tt", "cst", "gcs", "hend", "surv", "tr"], h = '<div class="lcr-file"><p class="lcr-fh">📁 ' + (FR() ? "Dossier de soins — fiche d'admission" : "Dossier de soins — ملف الدخول (ملف التمريض)") + "</p>";
    var ban = [];                                                 // the steps that keep the admission fields closed (usually ① 🤝 Accueil)
    order.forEach(function (f) { var s = x.by["f_" + f], lk = s && s.ph <= 2 && fieldLock(x, s); if (lk) lk.ph.forEach(function (q) { if (ban.indexOf(q) < 0) ban.push(q); }); });
    if (ban.length && !st.end && !x.over) {
      var go = ban.filter(function (q) { return q.kind === "act" && D.A[q.a] && D.A[q.a].at === "bed" && !D.A[q.a].need; });
      h += '<div class="lcr-lockb" role="note"><p><b>' + esc(u("lockF")) + "</b> " + esc(ban.slice(0, 3).map(L.stepName).join(" + ")) + "</p>" +
        '<div class="lcr-acts">' + go.map(function (q) { return nowBtn(q.a); }).join("") + (go.length < ban.length ? '<button type="button" class="lcr-act" data-lctab="care">' + esc(u("lockGo")) + "</button>" : "") + "</div></div>";
    }
    order.forEach(function (f) {
      var F = D.fields[f], s = x.by["f_" + f], dn = s && x.done[s.id], key = x.k + f, isOpen = openQ === key, lk = null;
      h += '<div class="lcr-fld' + (dn ? " done" : "") + (hl && hl.k === x.k && hl.id === "f_" + f && !dn ? " lcr-hit" : "") + '"><div class="lcr-fl"><b>' + F.ic + " " + esc(T(F)) + "</b>" + (FR() ? "" : ' <small dir="ltr">' + esc(F.fr) + "</small>") + "</div>";
      if (dn) h += '<div class="lcr-fv">' + esc(T(fieldAnswer(x, f))) + '<small> · ✍️ ' + esc(dn.n) + " " + fmtT(dn.t) + "</small></div>";
      else if (isOpen) {
        var qd = C.opts(DK(), st.cs, x.p, f), cl = L.cool(ckey(x.k), "f_" + f);
        h += '<div class="lcr-fq"><p>' + esc(T(F.q)) + "</p>";
        if (f === "gcs") { var g = x.p.gyvm; h += '<ul class="lcr-gcs"><li>👁️ ' + esc(T(GY[g[0]])) + "</li><li>🗣️ " + esc(T(GV[g[1]])) + "</li><li>✋ " + esc(T(GM[g[2]])) + "</li></ul>"; }
        if (f === "cst") h += x.done.mon ? '<p class="lcr-cst" dir="ltr">TA ' + Math.round(x.v.sys) + "/" + Math.round(x.v.dia) + " · FC " + Math.round(x.v.fc) + " · FR " + Math.round(x.v.fr) + " · SpO₂ " + Math.round(x.v.spo2) + "% · T° " + x.v.t.toFixed(1) + "</p>" : '<p class="small">' + esc(u("mon0")) + "</p>";
        if (cl) h += '<p class="lcr-cool">' + esc(u("wait", { t: L.left(cl - Date.now() + 59e3) })) + "</p>";
        h += '<div class="lcr-opts">' + qd.o.map(function (o, i) { return '<button type="button" class="lcr-opt" data-lcopt="' + i + '" data-lcf="' + f + '"' + (cl ? " disabled" : "") + ">" + esc(T(o)) + "</button>"; }).join("") + "</div></div>";
      } else if (x.over || st.end) {
        h += '<div class="lcr-fv off">⬜ ' + esc(u("missed")) + "</div>";   // 28x: a finished patient's file is read-only
      } else if (f === "tr" && fieldLock(x, s) && !st.end) {
        h += leftBox(x, u("handNo", { n: nm(x) }));                  // 28y: before 📤 the transmissions — what is still missing, as a hint
      } else if ((lk = fieldLock(x, s)) && !st.end) {
        var why = lk.aft.length ? lk.aft.slice(0, 2).map(L.stepName).join(" + ") : lk.low ? T(U["ph" + lk.low]) : lk.m.slice(0, 2).map(L.stepName).join(" + ");
        h += '<p class="lcr-lock"><span>' + esc(u("lockOne")) + "</span> " + esc(why) + "</p>" + (lk.aft.length && lk.aft[0].kind === "act" && D.A[lk.aft[0].a] && !D.A[lk.aft[0].a].need ? '<div class="lcr-acts">' + nowBtn(lk.aft[0].a) + "</div>" : "");
      } else h += '<button type="button" class="lcr-fill" data-lcq="' + f + '"><span>' + esc(u("notYet")) + "</span> " + esc(u("fill")) + "</button>";
      h += "</div>";
    });
    return h + "</div>";
  }
  function stationHtml(k) {
    var S = E.stations[k], h = head(S.ic + " " + esc(T(S))), its = Object.keys(D.I).filter(function (i) { return D.I[i].st === k; });
    h += '<div class="lcr-items">' + its.map(function (i) { var I = D.I[i], hv = hands.indexOf(i) > -1; return '<button type="button" class="lcr-item' + (hv ? " on" : "") + '" data-lctake="' + i + '">' + I.ic + " " + esc(T(I)) + "<small>" + esc(hv ? u("have") : u("take")) + "</small></button>"; }).join("") + "</div>";
    return h;
  }
  function stationSheet(k) { sheetOpen("station", k); }          // the cart / drugs / O₂ / monitor / defib: take things in your hands (28u: was missing)
  function deskSheet() { sheetOpen("desk", "phone"); }
  function deskHtml() {
    var S = E.stations.phone, h = head(S.ic + " " + esc(T(S)) + " · 📁");
    // 28y: the doctor can be called again and again — each call with something new answers (+1), a call with nothing new costs −1
    h += '<p class="lcr-who">' + esc(u("callFor")) + '</p><div class="lcr-acts">' + st.P.map(function (x, i) { if (x.ghost) return ""; var s = x.by.call, dn = s && x.done.call, hit = hl && hl.k === x.k && hl.id === "call" && !dn;
      return '<button type="button" class="lcr-act' + (dn ? " done" : "") + (x.over ? " off" : "") + (hit ? " lcr-hit" : "") + '" data-lccall="' + pk(i) + '">' + (dn ? "✅ " : "") + "📞 🛏️" + (i + 1) + " " + esc(nm(x)) +
        (dn ? "<small>✍️ " + esc(dn.n) + " · " + esc(u("called", { c: x.calls.length })) + " · " + esc(u("docAgain")) + "</small>" : "") + "</button>"; }).join("") + '</div><p class="small lcr-callh">' + esc(u("calls0")) + "</p>";
    h += '<p class="lcr-who">' + esc(u("fileOf")) + '</p><div class="lcr-acts">' + st.P.map(function (x, i) { if (x.ghost) return ""; return '<button type="button" class="lcr-act" data-lcfile="' + pk(i) + '">📁 🛏️' + (i + 1) + " " + esc(nm(x)) + "</button>"; }).join("") + "</div>";
    return h;
  }
  function slots() {
    [0, 1].forEach(function (i) { var b = q('[data-lcslot="' + i + '"]'), it = hands[i]; if (!b) return; b.innerHTML = it ? (D.I[it] || {}).ic + " <small>" + esc(T(D.I[it]).replace(/\s*\(.*$/, "").slice(0, 20)) + "</small>" : '<small class="e">' + esc(u("empty")) + "</small>"; b.classList.toggle("on", !!it); });
  }

  /* ---------------- doing things ---------------- */
  function say(kind, title, why) {
    if (kind === "bad" && offer) AS.missed(offer, nowMs());     // 29p: a wrong action → he may offer help
    var f = q(".lcr-fb"); if (!f) return;
    f.className = "lcr-fb on " + kind; f.innerHTML = "<p><b>" + esc(title) + "</b></p>" + (why ? '<p class="small">' + esc(why) + "</p>" : "");
    clearTimeout(fbT); fbT = setTimeout(function () { f.classList.remove("on"); }, kind === "bad" || kind === "ord" ? 6000 : 3800);
  }
  // 29b 📒 a patient this student helped just finished → his entry is in «سجل حالاتي» (one line, the room's own feedback box)
  d.addEventListener("nursin:caselog", function (e) {
    var ids = (e && e.detail && e.detail.added) || []; if (!ov || ov.hidden || !ids.length || !w.NursinLog) return;
    var n = ids.map(function (id) { return w.NursinLog.nameOf(id); }).filter(Boolean).join(" · ");
    setTimeout(function () { say("good", u("logged", { n: n || "🛏️" }), u("loggedW")); }, 1600);
  });
  function doAct(k, a, opt) {
    if (!st) return say("ord", u("retry"));
    if (st.end) return say("neutral", u("over"), L.nextWords(st.t1 - Date.now()));
    var A = D.A[a], x = X(k);
    if (x && x.over) return overSay(x);                         // 28x: nothing more to do on a finished patient — the other one is waiting
    // 28y: every closed button says WHY on the tap — «✋ لازم أوّل: …» (the dashed «✋» buttons: the thing is not in your hands yet)
    if (A && A.at === "bed" && !washed && a !== "paravent") return say("ord", u("must") + " " + u("mWash"), u("rubHow"));
    if (A && A.at === "bed" && a !== "paravent" && !hygOk(k)) return;                                  // 29e 🧼 another patient = clean hands again
    if (A && A.need && !BEDSIDE[A.need] && hands.indexOf(A.need) < 0) { var I = D.I[A.need], S = E.stations[I.st]; return say("ord", u("must") + " " + u("mItem", { i: I.ic + " " + T(I), s: S.ic + " " + T(S) }), u("leg")); }
    if (A && A.needDone && !x.done[A.needDone]) return say("ord", u("must") + " " + u("mVvp"));
    if (A && A.need && D.I[A.need].rx && !x.done.call) return say("ord", u("must") + " " + u("mCall"));
    // 28w: steps queue one after the other (a quick 2nd answer used to bounce off the 2 s spacing); a step that takes a moment shows «⏳»
    // 29d ⏳ the act takes its time first (ring over the nurse, ✖ to cancel); the step is saved — and paid — when it is done
    workRun(k, a, null, function () {
      var tw = setTimeout(function () { say("neutral", u("saving")); }, 600);
      actQ = actQ.then(function () { return L.act(k, a, opt); }).then(function (r) { clearTimeout(tw); result(k, a, r); }, function (e) { clearTimeout(tw); console.warn("nursin live", e); say("bad", u("err"), u("errWhy")); });
    });
  }
  /* ---- 29d ⏳ «كل شي ياخد وقتو» (Abdullah 7:21/7:25 AM: ~10 s) + ⏰ «ارجع قيّم المريض» (7:37 AM) — the pure rules are assets/livecare.js ---- */
  var LCa = w.LiveCare, work = {}, workIv = 0, careS = null, careIv = 0, ACTX = 1;
  try { ACTX = LCa ? LCa.mult(location.search, localStorage.getItem("nursin_actx")) : 1; } catch (e) { ACTX = 1; }
  function dayId() { return C.docId(C.dayKey(Date.now())); }
  function curAi(dk) { if (dk !== "x") return 0; var h = hNow(); return h && h.amb && h.amb.cur ? h.amb.cur.i : 0; }
  function pidOf(k, dk) { dk = dk || L.dep(); return LCa.pid(dayId(), dk, curAi(dk), k); }
  function workName(a) { var A = D && D.A[a]; return A ? A.ic + " " + T(A).replace(/\s*[(—].*$/, "") : L.actName(a); }
  function workRun(k, a, dk, run) {
    var ms = LCa && D ? LCa.dur(a, D.A[a], ACTX) : 0; if (!ms) return run();
    var id = pidOf(k, dk), now = Date.now(), c = LCa.canStart(work, id, now);
    if (!c.ok) return say("ord", u("wkBusy", { a: workName(c.a), s: Math.ceil(c.left / 1000) }), u("wkBusyW"));
    LCa.start(work, id, a, now, ms); var b = work[id], x = X(k); b.k = k; b.dk = dk || L.dep(); b.nm = x && x.p ? nm(x).split(" ")[0] : "";
    b.tm = setTimeout(function () { if (work[id] !== b) return; delete work[id]; workPaint(); run(); }, ms);
    workPaint(); if (sheet && sheet.kind === "bed") sheetPaint();
  }
  function workStop(id, why) { var b = work[id]; if (!b) return; clearTimeout(b.tm); delete work[id]; workPaint(); say("neutral", u(why || "wkCancel", { a: workName(b.a) })); if (sheet && sheet.kind === "bed") sheetPaint(); }
  function workAll(why) { Object.keys(work).forEach(function (id) { workStop(id, why); }); }
  function workMine() { var dk = L.dep(), now = Date.now(); return Object.keys(work).map(function (id) { return work[id]; }).filter(function (b) { return b && b.dk === dk && b.end > now - 50; }); }
  function workHtml(b, now) {
    var pr = LCa.prog(b, now), id = LCa.pid(dayId(), b.dk, curAi(b.dk), b.k);
    return '<div class="lcr-wk"><span class="lcr-wkr" style="--p:' + Math.round(pr * 100) + '"></span><span class="lcr-wkt">' + esc(u("wkDo", { a: workName(b.a) })) + (b.nm ? " " + esc(u("wkFor", { n: b.nm })) : "") +
      ' <b dir="ltr">' + Math.max(0, Math.ceil((b.end - now) / 1000)) + 's</b></span><button type="button" class="lcr-wkx" data-lcwkx="' + esc(id) + '">' + esc(u("wkX")) + "</button></div>";
  }
  function workPaint() {
    var el = q(".lcr-work"); if (!el) return; var L0 = Object.keys(work).map(function (id) { return work[id]; }), now = Date.now();
    el.hidden = !L0.length || !!sheet; el.innerHTML = L0.map(function (b) { return workHtml(b, now); }).join("");   // an open sheet shows its own line
    var wi = q(".lcr-wkin .lcr-wkr"), wb = sheet && sheet.kind === "bed" ? work[pidOf(sheet.k)] : null; if (wi && wb) wi.style.setProperty("--p", Math.round(LCa.prog(wb, now) * 100));
    if (L0.length && !workIv) workIv = setInterval(function () { if (!Object.keys(work).length || !ov || ov.hidden) { clearInterval(workIv); workIv = 0; } if (!d.hidden) workPaint(); }, 250);
  }
  // the ring over his avatar while he works (+ the act's icon); his hands move
  function workRing(x, y) {
    var B = workMine(); if (!B.length) return; var b = B[0], pr = LCa.prog(b, Date.now()), A = D.A[b.a] || {};
    var bob = Math.sin(Date.now() / 160) * 1.2;
    cx.save(); cx.fillStyle = "rgba(255,255,255,.96)"; cx.beginPath(); cx.arc(x, y, 11.5, 0, 7); cx.fill();
    cx.lineWidth = 3.2; cx.strokeStyle = "rgba(15,23,42,.18)"; cx.beginPath(); cx.arc(x, y, 10, 0, 7); cx.stroke();
    cx.strokeStyle = "#0ea5e9"; cx.lineCap = "round"; cx.beginPath(); cx.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.max(0.02, pr) * Math.PI * 2); cx.stroke();
    cx.font = "10px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillStyle = "#000"; cx.fillText(A.ic || "⏳", x, y + 0.5 + bob); cx.restore();
  }
  function careLoad() { if (!careS) { var s0 = null; try { s0 = localStorage.getItem(LCa.KEY); } catch (e) {} careS = LCa.load(s0); careS.rung = careS.rung || {}; careS.fu = LCa.prune(careS.fu, Date.now()); } return careS; }
  function careSave() { try { localStorage.setItem(LCa.KEY, JSON.stringify(careS)); } catch (e) {} if (w.NursinPay && w.NursinPay.reset) w.NursinPay.reset(); try { d.dispatchEvent(new CustomEvent("nursin:care")); } catch (e) {} }
  function fuName(f) { var A = D && D.A[f.a]; return A ? A.ic + " " + T(A).replace(/^عطي\s+|^Donner\s*:?\s*/, "").replace(/\s*[(—].*$/, "") : f.a; }
  function fuOf(k) { if (!LCa) return []; var id = pidOf(k); return careLoad().fu.filter(function (f) { return f.pid === id; }); }
  function fuOpen(k) { var now = Date.now(); return fuOf(k).filter(function (f) { var s0 = LCa.status(f, now); return s0 !== "ok" && s0 !== "miss"; }); }
  // after the step was saved: a drug → ✅ given at HH:MM + ⏰ the follow-up; a check of his signs → the follow-up is done (on time = +30)
  function careAfter(k, a, r) {
    if (!LCa || !r || !D) return; var now = Date.now(), S = careLoad(), x = X(k), id = pidOf(k), ch = false;
    if (r.k === "ok" && LCa.follow(a)) { var f = LCa.give(S.fu, { pid: id, dk: L.dep(), ai: curAi(L.dep()), pk: k, nm: x ? nm(x) : "", a: a }, now);
      if (f) { ch = true; setTimeout(function () { say("good", u("fuSet", { n: f.nm.split(" ")[0], h: fmtT(f.due), m: f.m }), u("fuSetW", { a: fuName(f), g: fmtT(f.at) })); }, 2600); } }
    if (r.k !== "bad" && LCa.REV[LCa.base(a)]) { var rs = LCa.reassess(S.fu, id, a, now); if (rs.ok.length) { ch = true; reevSay(rs.ok, x); rs.ok.forEach(function (f) { fuPay(f, "fu"); }); } }
    if (ch) { careSave(); if (sheet) sheetPaint(); }
  }
  function vitLine(x) { var v = (x && x.v) || {}; var R0 = function (n, k) { n = +n; return isFinite(n) ? (k ? n.toFixed(1) : Math.round(n)) : "?"; };
    return u("fuVit") + "TA " + R0(v.sys) + "/" + R0(v.dia) + " · FC " + R0(v.fc) + " · SpO₂ " + R0(v.spo2) + "% · T° " + R0(v.t, 1); }
  // 29e ⏰ the follow-up is paid in the shared doc (z fu on time +30 / z fx missed −20 — and a missed one makes his patient a bit worse): the phone
  // stops counting it itself (f.z) once the event is written
  function fuPay(f, code) { if (!f || f.z || !f.pk) return; if (String(f.pid || "").indexOf(dayId()) !== 0) return; bz(f.pk, code, f.dk, function (r) { if (r.k === "ok" || r.k === "neu" || r.k === "bzmax") { f.z = 1; careSave(); } }); }
  function reevSay(ok, x) { setTimeout(function () { say("good", u("fuOk", { n: ok[0].nm.split(" ")[0], p: ok.length * LCa.REAS }), vitLine(x)); }, 1400); }
  // ⏰ the button «أعد التقييم»: 5 s at the bed, local only (nothing shared changes), settles his follow-ups
  function reev(k) {
    var x = X(k); if (!x || !LCa) return; var open0 = fuOpen(k);
    if (!open0.length) return say("neutral", u("fuNone"), vitLine(x));
    workRun(k, "reev", null, function () {
      var now = Date.now(), S = careLoad(), rs = LCa.reassess(S.fu, pidOf(k), "reev", now);
      if (rs.ok.length) { rs.ok.forEach(function (f) { fuPay(f, "fu"); }); careSave(); say("good", u("fuOk", { n: nm(x).split(" ")[0], p: rs.ok.length * LCa.REAS }), vitLine(X(k))); }
      else if (rs.early.length) say("neutral", u("fuEarly", { n: nm(x).split(" ")[0], h: fmtT(rs.early[0].due) }), vitLine(X(k)));
      else say("neutral", u("fuNone"), vitLine(X(k)));
      if (sheet) sheetPaint();
    });
  }
  function fuRow(f, now, go) {
    var s0 = LCa.status(f, now), cls = s0 === "soon" || s0 === "due" ? " due" : s0 === "ok" ? " ok" : s0 === "miss" ? " miss" : "";
    return '<li class="lcr-fu' + cls + '"><span>' + esc(u("fuGiven", { a: fuName(f), h: fmtT(f.at) })) + (go ? " · <b>" + esc(f.nm.split(" ")[0]) + "</b>" : "") + "</span><small>" +
      (s0 === "ok" ? esc(u("fuOkL")) : s0 === "miss" ? esc(u("fuMissL")) : esc(u("fuAt", { h: fmtT(f.due) })) + ' · <b class="lcr-fucd" dir="ltr" data-due="' + f.due + '">' + (s0 === "w" ? esc(u("fuLeft")) + " " + LCa.left(f.due - now) : esc(u("fuNow"))) + "</b>") +
      (go && s0 !== "ok" && s0 !== "miss" ? ' <button type="button" class="lcr-btn" data-lcgo="' + esc(f.dk) + '">' + esc(u("fuGo")) + "</button>" : "") + "</small></li>";
  }
  function fuHtml(k) {
    var L0 = fuOf(k); if (!L0.length) return ""; var now = Date.now(), op = fuOpen(k).length;
    return '<ul class="lcr-fus">' + L0.map(function (f) { return fuRow(f, now, false); }).join("") + "</ul>" +
      (op ? '<div class="lcr-acts"><button type="button" class="lcr-btn on lcr-reev" data-lcreev="' + k + '">' + esc(u("reev")) + "</button></div>" : "");
  }
  function fuListHtml() {
    var now = Date.now(), L0 = LCa ? careLoad().fu.filter(function (f) { return f.pid.indexOf(dayId()) === 0 || (LCa.status(f, now) !== "ok" && LCa.status(f, now) !== "miss"); }) : [];
    L0 = L0.slice().sort(function (a, b) { return a.due - b.due; });
    return '<div class="lcr-sv">' + head(esc(u("myFu")), esc(u("fuHow"))) + (L0.length ? '<ul class="lcr-fus">' + L0.map(function (f) { return fuRow(f, now, true); }).join("") + "</ul>" : '<p class="small">' + esc(u("fuEmpty")) + "</p>") + "</div>";
  }
  function fuBadge(P, x, s, t) {
    var L0 = fuOpen(x.k); if (!L0.length) return; var f = L0.sort(function (a, b) { return a.due - b.due; })[0], now = Date.now(), s0 = LCa.status(f, now), due = s0 === "soon" || s0 === "due";
    var txt = "⏰ " + (due ? "🔔" : LCa.left(f.due - now)), bx = s.x + s.w - 2, by = s.y + 6;
    cx.save(); cx.font = "bold 10px system-ui, sans-serif"; var wd = cx.measureText(txt).width + 12; cx.globalAlpha = due ? 0.65 + 0.35 * Math.sin(t * 6) : 0.95;
    cx.fillStyle = due ? "#dc2626" : night() ? "#1e293b" : "#fff"; rr(cx, bx - wd, by - 9, wd, 18, 9); cx.fill(); cx.strokeStyle = due ? "#fff" : "#0ea5e9"; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = due ? "#fff" : night() ? "#e2e8f0" : "#0f172a"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(txt, bx - wd / 2, by + 0.5); cx.restore();
  }
  // every second while the room is open: 🔔 a follow-up that became due (once), ⚠️ one that went past (−20), the ⏰ counters
  function careTick() {
    if (!LCa || !ov || ov.hidden) return; var S = careLoad(), now = Date.now(), ch = false;
    LCa.ringing(S.fu, now, S.rung).forEach(function (f) { S.rung[f.id] = 1; ch = true; say("ord", u("fuDue", { n: f.nm.split(" ")[0] }), u("fuDueW", { a: fuName(f), m: Math.round((now - f.at) / 6e4) })); if (snd) chime(); });
    var miss = LCa.sweep(S.fu, now); if (miss.length) { ch = true; say("bad", u("fuMiss", { n: miss[0].nm.split(" ")[0], p: miss.length * LCa.LATE }), u("fuMissW")); miss.forEach(function (f) { fuPay(f, "fx"); }); }
    try { pkTick(now); } catch (e) {}
    if (ch) { careSave(); if (sheet) sheetPaint(); }
    var nb = S.fu.filter(function (f) { var s0 = LCa.status(f, now); return s0 === "soon" || s0 === "due"; }).length, op = S.fu.filter(function (f) { var s0 = LCa.status(f, now); return s0 !== "ok" && s0 !== "miss"; }).length;
    var bi = q(".lcr-fub i"); if (bi) { bi.hidden = !op; bi.textContent = op; bi.className = nb ? "due" : ""; }
    Array.prototype.forEach.call(ov.querySelectorAll(".lcr-fucd"), function (el) { var du = +el.getAttribute("data-due"), t0 = du - now > LCa.EARLY ? u("fuLeft") + " " + LCa.left(du - now) : u("fuNow"); if (el.textContent !== t0) el.textContent = t0; });
  }
  var actQ = Promise.resolve();
  // 28y: 📞 and 💡 go through the same queue as every step (2 s rule → «⏳», never a silent nothing)
  function queue(k, a) {
    if (!st) return say("ord", u("retry"));
    if (st.end) return say("neutral", u("over"), L.nextWords(st.t1 - Date.now()));
    var x = X(k); if (x && x.over) return overSay(x);
    var tw = setTimeout(function () { say("neutral", u("saving")); }, 600);
    actQ = actQ.then(function () { return L.act(k, a); }).then(function (r) { clearTimeout(tw); result(k, a, r); }, function () { clearTimeout(tw); say("bad", u("err"), u("errWhy")); });
  }
  function docSay(k, r, pts) {                                   // 28y: what the doctor answers — his orders still to give, or «carry on and call me if it changes»
    var x = X(k), orders = x.L.filter(function (s) { return s.kind === "act" && s.after.indexOf("call") > -1 && !x.done[s.id]; }).map(function (s) { return L.stepName(s).replace(/^(\S+) (عطي |Donner : )?/, "$1 "); });
    var dO = orders.length ? null : C.docOrder(DK(), st, k);       // 29m: unstable/critical and nothing left to prescribe → still a concrete order
    var t = (x.st === "crit" ? u("docCrit") + " " : "") + (r.doc === 2 ? u("docNew", { w: L.stLabel(x.st, x.p.sex) }) + " " : r.s && r.s.why ? T(r.s.why) + " " : "") + (orders.length ? u("docRx", { r: orders.join(" + ") }) : dO ? docGo(x, dO.s) : u("docOk"));
    say("good", u("ok") + pts + " · 📞 " + nm(x), u("doc") + " " + t);
  }
  function hintShow(k, pts) {                                   // 28y 🎯 the paid hint: the exact step, highlighted where it is
    var c = C.clue(DK(), st, k); if (!c) return say("neutral", u("hintNone"));
    hl = { k: k, id: c.s.id, s: c.s }; hintOpen = k;
    if (sheet && sheet.kind === "bed" && sheet.k === k) { sheet.tab = c.s.kind === "file" ? "file" : "care"; openQ = null; }
    say("neutral", u("hintGot") + " " + L.stepName(c.s) + pts, T(c.s.why) || "");
    if (sheet) sheetPaint();
    setTimeout(function () { var b = q(".lcr-sheet .lcr-hit"); if (b && b.scrollIntoView) try { b.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { b.scrollIntoView(); } }, 80);
  }
  // 29m 🧑‍⚕️ «الممرض المساعد» (Abdullah's idea, Nov 4 2026): in every room, «شو بعمل؟» = ONE next step as an errand (fetch it from X · 📞 the doctor ·
  // write it in the file · do it). It IS the paid 💡 (−1, ≤ HMAX per patient per student, the same shared-doc record) — just said like a colleague.
  // A plain box: no animation, no loop; it paints only when tapped.
  function helpPaint() {
    var b = q(".lcr-help"); if (!b) return; b.hidden = !helpOpen; if (!helpOpen) return;
    b.innerHTML = '<div class="lcr-hlph"><b>' + esc(u("hlp")) + '</b><button type="button" class="lcr-shx" data-lchelp="1" aria-label="' + esc(u("close")) + '">✕</button></div>' +
      '<p class="lcr-hlpt">' + esc(helpTxt || u("hlpIntro", { m: C.HMAX })) + "</p>" +
      '<button type="button" class="lcr-btn on lcr-hlpq" data-lchelpq="1">' + esc(u("hlpAsk")) + "</button>";
  }
  function helpSet(t) { helpTxt = t; helpOpen = true; helpPaint(); }
  function helpWords(h) {                                      // the step told as an errand, in the student's language
    var x = h.x, n = nm(x).split(" ")[0], s = h.s, A, I, Si;
    if (h.how === "call") { Si = E.stations.phone; return u("hlpCall", { n: n, s: Si ? Si.ic + " " + T(Si) : "📞", w: u("hlpCallW") }); }
    if (h.how === "file") return u("hlpFile", { f: L.stepName(s), n: n });
    if (h.how === "item") { A = D.A[s.a]; I = D.I[h.need]; Si = I && E.stations[I.st];
      return u("hlpItem", { i: I.ic + " " + T(I).replace(/\s*\(.*$/, ""), s: Si ? Si.ic + " " + T(Si) : "🧰", a: L.stepName(s), n: n }); }
    return u("hlpAct", { a: L.stepName(s), n: n });
  }
  function helpGo() {
    kick();
    if (!st || st.end) return helpSet(u("hlpFree"));
    if (st.svc || svcRoom()) return helpSet(u("hlpSvc"));
    var h = C.helpStep(DK(), st, null, hands);
    if (!h) return helpSet(u("hlpFree"));
    var n = nm(h.x).split(" ")[0];
    if (!inBed(h.x)) return helpSet(u("hlpWait", { n: n }));              // still in the waiting room: free — bringing him in is the step
    if (h.how === "none") return helpSet(u("hlpNone", { n: n }));
    if (myHints(h.x) >= C.HMAX) return helpSet(u("hlpMax", { n: n, m: C.HMAX }));
    var ask = helpAsk = { k: h.x.k, h: h }; helpSet("⏳"); queue(h.x.k, "hint");
    setTimeout(function () { if (helpAsk === ask) { helpAsk = null; helpSet(u("retry")); } }, 9000);   // a step that never came back (offline, 2 s rule…) never leaves «⏳»
  }
  function helpShow(k, pts) {                                  // the paid hint went through → the helper says the step (and the bed highlights it)
    var a = helpAsk; helpAsk = null; var x = X(k); if (!x) return;
    var h = C.helpStep(DK(), st, k, hands) || (a && a.h); if (!h || !h.s) return helpSet(u("hlpNone", { n: nm(x).split(" ")[0] }));
    hl = { k: k, id: h.s.id, s: h.s };
    helpSet(helpWords(h) + "  (" + u("hlpCost", { l: Math.max(0, C.HMAX - myHints(x)), m: C.HMAX, n: nm(x).split(" ")[0] }) + ")");
    if (sheet) sheetPaint();
  }
  // 29m 💬 «احكي مع المريض»: the nurse's questions at the bed, answered from this case's own story + file (never invented) — free, nothing saved
  function talkHtml(x) {
    if (!inBed(x)) return "";
    var op = talkOpen && talkOpen.k === x.k, h = '<div class="lcr-talk"><button type="button" class="lcr-talkb" data-lctalk="' + x.k + '" aria-expanded="' + !!op + '">' + esc(u("talk")) + "</button>";
    if (!op) return h + "</div>";
    h += '<div class="lcr-tq">' + C.TQ.map(function (qq) { return '<button type="button" class="lcr-tqb' + (talkOpen.q === qq ? " on" : "") + '" data-lctq="' + x.k + ":" + qq + '">' + esc(u("tq_" + qq)) + "</button>"; }).join("") + "</div>";
    if (talkOpen.q) { var a = C.talk(x.p, x.v, talkOpen.q), t = a && T(a);
      if (a) h += '<p class="lcr-tans">' + (a.who === "fam" ? esc(u("tFam", { g: Math.round(x.v.gcs) })) + " " : "🗣️ ") + "«" + esc(t || u("tUnk")) + "»</p>"; }
    return h + "</div>";
  }
  // 29m 📞 an unstable / critical patient: the doctor never answers «wait» — his concrete order (the case's own next gesture)
  function docGo(x, s) { var o = s ? L.stepName(s) : L.actName("mon"); return u("docGo", { o: o }); }
  function overSay(x) { var o = st.P[x.k === "a" ? 1 : 0]; say("neutral", ug("pOver", x, { n: nm(x) }), o.over ? "" : ug("pGoOn", o, { n: nm(o) })); if (sheet) sheetPaint(); }
  function result(k, a, r) {
    try { careAfter(k, a, r); } catch (e) { console.warn("nursin care", e); }
    try {                                                                                      // 29e 🧪 🩻 🩸 💊 the services · ⚠️ the report
      if (r && r.k === "ok" && svcOf(a)) pkAdd(k, a, svcOf(a));
      if (r && r.k === "ok" && a === "call") { var xr = X(k); if (xr && xr.L.some(function (s) { return s.kind === "act" && s.after.indexOf("call") > -1 && D.A[s.a] && D.A[s.a].g === "rx" && !xr.done[s.id]; })) pkAdd(k, "call", "ph"); }
      if (r && (r.k === "bad" || r.k === "no") && a.indexOf("f_") !== 0 && (D.inc || []).length) setTimeout(function () { say("ord", u("incAsk"), u("incAskW")); }, 4200);
    } catch (e) { console.warn("nursin rout", e); }
    var x = X(k), A = D.A[a], pts = r.d ? " " + (r.d > 0 ? "+" : "") + r.d + (w.NursinPay ? " · " + payTxt(r.d * 10) : "") : "";   // 29d 💵 every point = 10 ل.ن
    // 28w: close only THIS field's question — the answer of the field before (queued, saved a second later) used to close the one being answered
    function shut() { if (openQ === k + String(a).replace(/^f_/, "")) openQ = null; }
    if ((r.k === "ok" || r.k === "bad") && A && A.need && !BEDSIDE[A.need]) { var I = D.I[A.need], j = hands.indexOf(A.need); if (I && !I.keep && j > -1) { hands.splice(j, 1); slots(); } }
    if (r.k === "ok" && a === "call") { docSay(k, r, pts); setTimeout(function () { var y = X(k); if (y && y.over && !st.end) finSay(y); }, 1800); }
    else if (r.k === "ok") { var wy = T(r.s.why) || (r.s.kind === "file" ? T(fieldAnswer(x, r.s.f)) : "");
      if (C.INTIM.indexOf(a) > -1 && x && !x.screen) wy = (wy ? wy + " " : "") + u("scrTip");   // 28y: an intimate gesture without the curtain → the tip
      say("good", u("ok") + pts + " · " + L.stepName(r.s), wy); if (r.s.kind === "file") shut();
      setTimeout(function () { var y = X(k); if (y && y.over && !st.end) finSay(y); }, 1800); }   // 28x: that step finished him → say so after the step's own line
    else if (r.k === "bad") { say("bad", u("bad") + pts + " · " + L.actName(a), T(r.why)); if (w.Osman && w.Osman.wrong) try { w.Osman.wrong(); } catch (e) {} }
    else if (r.k === "ord") { var m = r.miss || []; say("ord", u("ord") + pts + " · " + L.stepName(r.s), u("after1") + " " + m.slice(0, 2).map(L.stepName).join(" + ") + (m.length > 2 ? " …" : "") + " · " + phNow(x)); }
    else if (r.k === "neu" && a === "hint") { if (helpAsk && helpAsk.k === k) helpShow(k, pts); else hintShow(k, pts); return; }   // 29m 🧑‍⚕️ or 💡
    else if (r.k === "neu" && a === "call") { var dN = C.docOrder(DK(), st, k); say("ord", "📞 " + nm(x) + pts, dN ? u("doc") + " " + docGo(x, dN.s) : T(r.why)); }   // 29m
    else if (r.k === "neu") say("neutral", u("neu") + pts, T(r.why) + " · " + phNow(x) + ". " + u("hintTip"));   // 28y: names the phase + where help is
    else if (r.k === "safe") say("neutral", u("safe") + " · " + L.actName(a), phNow(x) + ". " + u("hintTip"));
    else if (r.k === "early") say("neutral", u("early") + " · " + L.stepName(r.s), u("after1") + " " + (r.miss || []).slice(0, 2).map(L.stepName).join(" + "));
    else if (r.k === "doc0") say("ord", "📞 " + nm(x), u("doc") + " " + (C.RANK[x.st] >= 2 && r.miss && r.miss.length ? docGo(x, r.miss[0]) : u("docNeed", { m: (r.miss || []).slice(0, 3).map(L.stepName).join(" + ") })));   // 29m
    else if (r.k === "hmax") { if (helpAsk) { helpAsk = null; helpSet(u("hlpMax", { n: nm(x).split(" ")[0], m: C.HMAX })); } else say("neutral", u("hintNo", { m: C.HMAX })); }
    else if (r.k === "nohint") { if (helpAsk) { helpAsk = null; helpSet(u("hlpNone", { n: nm(x).split(" ")[0] })); } else say("neutral", u("hintNone")); }
    else if (r.k === "no") { say("bad", u("no") + pts, T(r.why)); shut(); }
    else if (r.k === "repeat") { var dn = r.s && x.done[r.s.id]; say("neutral", dn && dn.u !== L.me().uid ? u("repeat", { n: dn.n }) : u("repeat0")); shut(); }
    else if (r.k === "wait") say("ord", u("wait", { t: L.left(r.until - Date.now() + 59e3) }));
    else if (r.k === "slow" || r.k === "busy") say("neutral", u("slow"));
    else if (r.k === "over") say("neutral", u("over"));
    else if (r.k === "pover") { overSay(X(k)); return; }
    else if (r.k === "full") say("neutral", u("full2"));
    else if (r.k === "rules") say("neutral", u("soon"));
    else if (r.k === "retry") say("ord", u("retry"), r.code ? u("errWhy") + " (" + r.code + ")" : "");
    else if (r.k === "denied") say("bad", u("denied"), u("deniedWhy"));
    else if (r.code === "offline" || r.code === "unavailable") say("bad", u("offline"), u("errWhy"));
    else say("bad", u("err"), u("errWhy") + (r.code ? " (" + r.code + ")" : ""));   // 28v: every failed write is said out loud
    if (sheet) sheetPaint();
  }

  /* ---------------- 29e 🧼 🔄 🚪 👨‍👩‍👦 ⚠️ the nurse's routines + 🧪 🩻 💊 🩸 the services ----------------
     (Abdullah, Nov 4 7:19–7:20 AM: «ضيفن كلّن»: handover, hand hygiene, discharge + education, family visits, incident report — each one
     affects the salary.) Every routine done right is ONE event on its patient in the shared day doc (LiveDept.bonus: «z<code>»), so it is
     paid in the class salary + ranking under rules v22; what it shows on the phone (the results fetched, the answered questions) is kept in
     nursin_rout_v1. */
  var RK = "nursin_rout_v1", rout = null;
  function routLoad() { if (rout) return rout; try { rout = JSON.parse(localStorage.getItem(RK) || "null"); } catch (e) { rout = null; } if (!rout || rout.v !== 1) rout = { v: 1, pk: [], fa: {}, inc: {}, ho: {}, hh: { t: null, pend: 0 } }; return rout; }
  function routSave() { try { var R0 = routLoad(), now = Date.now(); R0.pk = R0.pk.filter(function (x) { return now - x.t < 2 * 864e5; }); localStorage.setItem(RK, JSON.stringify(R0)); } catch (e) {} }
  function rawNow() { return (L.raw && L.raw()) || null; }
  function rOf(x, dk) { dk = dk || L.dep(); var raw = rawNow(); if (!raw || !x) return LDp().routines(null, dk, "a", 0, ""); return LDp().routines(raw, dk, x.k, curAi(dk), L.me().uid); }
  function LDp() { return w.LiveDept; }
  function isHome(x) { if (!x || x.ghost || !x.over || x.over.w !== "ok") return false; return !!rOf(x).dc; }
  // one routine event, queued behind the steps (2 s rule); onDone(r) when it is written
  function bz(k, code, dk, onDone) {
    var tw = setTimeout(function () { say("neutral", u("saving")); }, 900);
    actQ = actQ.then(function () { return L.act(k, "z" + code, undefined, 0, dk || L.dep()); }).then(function (r) { clearTimeout(tw); r = r || {}; if (r.k === "busy") return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return L.act(k, "z" + code, undefined, 0, dk || L.dep()); }).then(function (r2) { if (onDone) onDone(r2 || {}); }); if (onDone) onDone(r); }, function () { clearTimeout(tw); });
  }
  function bzPay(r) { return r && r.d ? " " + (r.d > 0 ? "+" : "") + r.d + (w.NursinPay ? " · " + payTxt(r.d * 10) : "") : ""; }

  // 🧼 hand hygiene (friction hydro-alcoolique): BEFORE touching a patient and AFTER — the 🧴 next to every bed or the 🚰 sink.
  // Touching another patient with the same hands is refused («🧼 لمست X …»); each rub at the right moment pays (≤ 2 per patient)
  function rub(fromSink) {
    var R0 = routLoad(), H = R0.hh; if (rubbing) return;
    rubbing = 1; say("neutral", u(fromSink ? "rubSink" : "rubGo"), u("rubW"));
    setTimeout(function () { rubbing = 0; washed = true; var was = H.t; H.t = null; H.pend = 1; routSave();
      if (was) { var p0 = String(was).split("|"); if (p0[0] === dayId()) { bz(p0[3], "hh", p0[1], function (r) { if (r.k === "ok") say("good", u("rubAfter", { n: p0[4] || "" }) + bzPay(r), u("rubWhy")); else say("good", u("washed")); }); return; } }
      say("good", u("washed"), u("rubBefore"));
      if (sheet) sheetPaint(); }, Math.max(600, 4000 * ACTX));
  }
  var rubbing = 0;
  // called by doAct before a gesture on patient k: true = go on
  function hygOk(k) {
    var R0 = routLoad(), H = R0.hh, x = X(k), id = [dayId(), L.dep(), curAi(L.dep()), k, x ? nm(x).split(" ")[0] : ""].join("|");
    if (H.t && H.t.split("|").slice(0, 4).join("|") !== id.split("|").slice(0, 4).join("|")) { washed = false; say("ord", u("rubOther", { n: H.t.split("|")[4] || "", m: x ? nm(x).split(" ")[0] : "" }), u("rubHow")); if (sheet) sheetPaint(); return false; }
    if (!H.t && H.pend) { H.pend = 0; bz(k, "hh", null, function (r) { if (r.k === "ok") setTimeout(function () { say("good", u("rubBeforeOk") + bzPay(r), u("rubWhy")); }, 2400); }); }
    H.t = id; routSave(); return true;
  }

  // 🧪 🩻 💊 🩸 the services: a test / an image / a prescription / a blood bag ordered at the bed is READY at its service after a short
  // while — walk there and fetch it (+20 ل.ن, the result goes into his dossier); if nobody goes, it comes up to the ward by itself after 3 min
  var SVCA = { bilan: "lab", gds: "lab", bio: "lab", gly: null, radio: "rad", echo: "rad", sang: "bb" }, PK_READY = 15000, PK_AUTO = 180000;
  function svcOf(a) { if (SVCA[a]) return SVCA[a]; var A = D && D.A[a]; return A && A.svc ? A.svc : null; }
  function pkAdd(k, a, svc) {
    var R0 = routLoad(), x = X(k), now = Date.now(), dk = L.dep(), id = [dayId(), dk, curAi(dk), k, svc, a].join("|");
    if (R0.pk.some(function (p) { return p.id === id; })) return;
    R0.pk.push({ id: id, svc: svc, dk: dk, ai: curAi(dk), k: k, a: a, nm: x ? nm(x) : "", t: now, rd: now + PK_READY * ACTX, got: 0, auto: 0 }); routSave();
    setTimeout(function () { say("neutral", u("pkReady", { s: depName(svc), n: x ? nm(x).split(" ")[0] : "" }), u("pkReadyW")); }, 2600);
  }
  function pkTick(now) { var R0 = routLoad(), ch = false; R0.pk.forEach(function (p) { if (!p.got && !p.auto && now > p.t + PK_AUTO * ACTX) { p.auto = now; ch = true; if (ov && !ov.hidden) say("neutral", u("pkAuto", { n: p.nm.split(" ")[0], s: depName(p.svc) })); } }); if (ch) routSave(); }
  function pkOpen(svc) { var R0 = routLoad(), dd = dayId(); return R0.pk.filter(function (p) { return p.svc === svc && !p.got && !p.auto && p.id.indexOf(dd) === 0; }); }
  function pkOfBed(k) { var R0 = routLoad(), dk = L.dep(), dd = dayId(); return R0.pk.filter(function (p) { return p.k === k && p.dk === dk && p.id.indexOf(dd) === 0; }); }
  function pkGet(id) {
    var R0 = routLoad(), p = R0.pk.filter(function (z) { return z.id === id; })[0]; if (!p || p.got || p.auto) return;
    if (Date.now() < p.rd) return say("neutral", u("pkWait", { s: Math.ceil((p.rd - Date.now()) / 1000) }), u("pkWaitW"));
    p.got = Date.now(); routSave(); sheetPaint();
    bz(p.k, "pk", p.dk, function (r) { say("good", u("pkGot", { n: p.nm.split(" ")[0] }) + (r.k === "ok" ? bzPay(r) : ""), u("pkGotW")); });
  }
  function pkLine(p) {
    var x0 = null; try { var S0 = L.stateOf(p.dk); x0 = S0 && S0.P[p.k === "b" ? 1 : 0]; } catch (e) {} var pp = x0 && x0.p, A = D.A[p.a];
    var res = p.svc === "lab" ? ((pp && pp.lab) || []).map(function (s) { return T(s); }).join(" · ") : p.svc === "rad" ? (pp && pp.img ? T(pp.img) : u("radDone")) : p.svc === "bb" ? u("bbDone") : u("phDone");
    return { t: (A ? A.ic + " " + T(A).replace(/\s*[(—].*$/, "") : p.a), r: res || "—" };
  }
  function svcHtml(dk) {
    var base = dk.replace(/\d$/, ""), I = w.LiveDept.INFO[dk], h = head(I.ic + " " + esc(T(I.t)), esc(u("svcSub_" + base) || ""));
    if (base === "lab" || base === "rad" || base === "bb" || base === "ph") {
      var L0 = pkOpen(dk), now = Date.now();
      h += L0.length ? '<div class="lcr-acts lcr-wl">' + L0.map(function (p) { var ln = pkLine(p), rdy = now >= p.rd;
        return '<button type="button" class="lcr-act' + (rdy ? " lcr-hit" : "") + '" data-lcpk="' + esc(p.id) + '">' + (rdy ? "📥 " : "⏳ ") + esc(ln.t) + " · " + esc(p.nm.split(" ")[0]) + "<small>" + esc(rdy ? u("pkTake") : u("pkWait", { s: Math.ceil((p.rd - now) / 1000) })) + "</small></button>"; }).join("") + "</div>"
        : '<p class="small">' + esc(u("pkNone_" + base)) + "</p>";
      return h + '<p class="small">' + esc(u("pkRule")) + "</p>";
    }
    if (base === "adm") return h + admHtml();
    if (base === "ns") return h + hoHtml(dk);
    return h + '<p class="small">' + esc(u("svcSub_" + base) || "") + "</p>";
  }
  // 🛎️ the admissions desk: who came in today, where they are now (🪑 waiting · 🛏️ in a bed · ✅ · 💔 · 🚪 home)
  function admHtml() {
    var H0 = hNow(), rows = []; if (!H0) return "";
    w.LiveDept.WARDS.forEach(function (dk) { var S = H0[dk]; if (!S || !S.P) return; S.P.forEach(function (x) { if (x.ghost) return;
      var inn = L.admOf(dk, x.k, 0), home = false; try { home = !!w.LiveDept.routines(rawNow(), dk, x.k, 0, "").dc; } catch (e) {}
      var stt = home ? "🚪 " + u("dcHome") : x.over ? (x.over.w === "ok" ? "✅" : "💔") : inn ? "🛏️ " + L.stLabel(x.st, x.p.sex).split(" ")[0] : "🪑 " + u("admWait");
      rows.push("<li><b>" + esc(T(x.p.nm)) + "</b> · " + x.p.age + " <small>" + esc(depName(dk)) + " · " + esc(stt) + "</small></li>"); }); });
    return rows.length ? '<ul class="lcr-adm">' + rows.join("") + "</ul>" : '<p class="small">' + esc(u("admNone")) + "</p>";
  }
  // 🔄 the shift handover at the floor's nurse station: 3 questions about the patients in the beds of this floor (once per shift)
  var hoQ = null;
  function shiftId(now) { var hh = +new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", hourCycle: "h23" }).format(new Date(now)); return dayId() + (hh < 7 ? "n" : hh < 15 ? "m" : hh < 23 ? "e" : "n2"); }
  function hoPatients(f) { var H0 = hNow(), out = []; if (!H0) return out; w.LiveDept.WARDS.forEach(function (dk) { if (FLR(dk) !== f) return; var S = H0[dk]; if (!S || !S.P) return;
      S.P.forEach(function (x) { if (x.ghost || (x.over && x.over.w !== "ok") || !L.admOf(dk, x.k, 0)) return; var hm = false; try { hm = !!w.LiveDept.routines(rawNow(), dk, x.k, 0, "").dc; } catch (e) {} if (!hm) out.push({ dk: dk, x: x, S: S }); }); });
    if (f === 0 && H0.x && H0.x.P && H0.x.P[0] && !H0.x.P[0].over && H0.amb && H0.amb.cur && L.admOf("x", "a", H0.amb.cur.i)) out.push({ dk: "x", x: H0.x.P[0], S: H0.x });
    return out; }
  function hoBuild(f) {
    var Ps = hoPatients(f); if (!Ps.length) return null; var r = C.rng(C.hash(shiftId(Date.now()) + "-ho-" + f)), Q = [];
    for (var i = 0; i < 3; i++) { var o = Ps[Math.floor(r() * Ps.length)], kind = ["motif", "surv", "st"][i], q0;
      if (kind === "st") { var right = o.x.st === "lost" ? "crit" : o.x.st; var opts = ["ok", "impr", "unst", "crit"]; q0 = { o: o, kind: kind, opts: opts.map(function (k0) { return { k: k0, t: L.stLabel(k0, o.x.p.sex) }; }), a: opts.indexOf(right === "ok" ? "ok" : right) }; }
      else { var qd = C.opts(o.S.DK || D, o.S.cs, o.x.p, kind); q0 = { o: o, kind: kind, opts: qd.o.map(function (z) { return { t: T(z) }; }), a: qd.a }; }
      Q.push(q0); }
    return { f: f, Q: Q, ans: [], sid: shiftId(Date.now()) };
  }
  function hoHtml(dk) {
    var f = FLR(dk), R0 = routLoad(), sid = shiftId(Date.now()), done = R0.ho[sid + f];
    var h = '<p class="small">' + esc(u("hoWhat")) + "</p>";
    if (done) return h + '<div class="lcr-pover ok"><b>' + esc(u("hoDone", { n: done.n })) + "</b><small>" + esc(u("hoNext")) + "</small></div>" + '<div class="lcr-acts"><button type="button" class="lcr-btn" data-lcfu="1">⏰ ' + esc(u("myFu")) + "</button></div>";
    if (!hoQ || hoQ.f !== f || hoQ.sid !== sid) hoQ = hoBuild(f);
    if (!hoQ) return h + '<p class="small">' + esc(u("hoNone")) + '</p><div class="lcr-acts"><button type="button" class="lcr-btn" data-lcfu="1">⏰ ' + esc(u("myFu")) + "</button></div>";
    hoQ.Q.forEach(function (q0, i) { var nmx = T(q0.o.x.p.nm).split(" ")[0], an = hoQ.ans[i];
      h += '<div class="lcr-fld' + (an != null ? " done" : "") + '"><div class="lcr-fl"><b>' + (i + 1) + ". " + esc(u("hoQ_" + q0.kind, { n: nmx, d: depName(q0.o.dk) })) + "</b></div><div class=\"lcr-acts\">" +
        q0.opts.map(function (op, j) { var cls = an == null ? "" : j === q0.a ? " done" : j === an ? " bad" : " off"; return '<button type="button" class="lcr-act' + cls + '" data-lcho="' + i + "." + j + '"' + (an != null ? " disabled" : "") + ">" + esc(op.t) + "</button>"; }).join("") + "</div></div>"; });
    if (hoQ.ans.filter(function (z) { return z != null; }).length === 3) { var n = hoQ.Q.filter(function (q0, i) { return hoQ.ans[i] === q0.a; }).length;
      h += '<div class="lcr-acts"><button type="button" class="lcr-btn on lcr-hit" data-lchogo="1">' + esc(u("hoSend", { n: n })) + "</button></div>"; }
    return h;
  }
  function hoAns(v) { if (!hoQ) return; var p = v.split("."), i = +p[0], j = +p[1]; if (hoQ.ans[i] != null) return; hoQ.ans[i] = j; sheetPaint(); }
  function hoGo() {
    if (!hoQ) return; var n = hoQ.Q.filter(function (q0, i) { return hoQ.ans[i] === q0.a; }).length, d = n === 3 ? 5 : n + 1, o = hoQ.Q[0].o, R0 = routLoad(), key = hoQ.sid + hoQ.f;
    R0.ho[key] = { n: n, t: Date.now() }; routSave();
    bz(o.x.k, "ho" + d, o.dk, function (r) { say(n >= 2 ? "good" : "neutral", u("hoOk", { n: n }) + (r.k === "ok" ? bzPay(r) : ""), u("hoWhy")); sheetPaint(); });
  }

  // 🚪 discharge with education: a stabilised patient goes home once a nurse tells him the right things (from his lesson) — frees his bed
  var dcSel = {};
  function eduOf(x) { var p = x.p, e = p.edu || (D.edu && D.edu[p.rid]) || null, g = D.eduGen || { ok: [], no: [] };
    if (!e || !e.ok || !e.ok.length) { var r0 = C.rng(C.hash(T(p.nm) + "edu")); e = { ok: [g.ok[Math.floor(r0() * g.ok.length)], g.ok[Math.floor(r0() * g.ok.length)], { ar: "انتبه لـ: " + T(p.file.surv), fr: "Surveiller : " + T(p.file.surv) }].filter(Boolean), no: g.no.slice(0, 2), gen: 1 }; }
    var L0 = e.ok.slice(0, 3).map(function (z) { return { z: z, ok: 1 }; }).concat((e.no || []).slice(0, 3).map(function (z) { return { z: z, ok: 0 }; })), r = C.rng(C.hash(T(p.nm) + "dc"));
    for (var i = L0.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t0 = L0[i]; L0[i] = L0[j]; L0[j] = t0; } return { L: L0, gen: e.gen }; }
  function dcHtml(k) {
    var x = X(k); if (!x) return ""; if (!x.p.rid && st.cs && st.cs.id) x.p.rid = st.cs.id + k; var E0 = eduOf(x), s = dcSel[k] || (dcSel[k] = {});
    var h = head("🚪 " + esc(u("dcT", { n: nm(x) })), esc(depName(L.dep()))) + '<p class="small">' + esc(u("dcHow")) + "</p>";
    if (rOf(x).dc) return h + '<div class="lcr-pover ok"><b>' + esc(u("dcDone", { n: nm(x).split(" ")[0] })) + "</b></div>";
    h += '<div class="lcr-acts lcr-wl">' + E0.L.map(function (it, i) { return '<button type="button" class="lcr-act' + (s[i] ? " lcr-hit" : "") + '" data-lcdcpick="' + k + "." + i + '">' + (s[i] ? "☑️ " : "⬜ ") + esc(T(it.z)) + "</button>"; }).join("") + "</div>";
    if (E0.gen) h += '<p class="small">🌐 ' + esc(u("genInfo")) + "</p>";
    return h + '<div class="lcr-acts"><button type="button" class="lcr-btn on" data-lcdcgo="' + k + '">' + esc(u("dcGo")) + "</button></div>";
  }
  function dcGo(k) {
    var x = X(k); if (!x) return; if (!x.p.rid && st.cs && st.cs.id) x.p.rid = st.cs.id + k; var E0 = eduOf(x), s = dcSel[k] || {}, ok = 0, bad = 0, miss = [];
    E0.L.forEach(function (it, i) { if (s[i] && it.ok) ok++; else if (s[i] && !it.ok) bad++; else if (!s[i] && it.ok) miss.push(T(it.z)); });
    if (!ok) return say("ord", u("dcNone"));
    var d = Math.max(1, Math.min(4, ok + (ok === 3 && !bad ? 1 : 0) - bad));
    bz(k, "dc" + d, null, function (r) { if (r.k === "ok") { say("good", u("dcOk", { n: nm(x).split(" ")[0] }) + bzPay(r), bad || miss.length ? u("dcMiss", { m: miss.join(" · ") || "—", b: bad }) : u("dcAll")); sheetClose(); bg = null; }
      else if (r.k === "bzmax") say("neutral", u("dcDone", { n: nm(x).split(" ")[0] })); else say("ord", u("retry")); });
  }

  // 👨‍👩‍👦 family visits: a relative comes to the bed of an admitted patient and asks a question (from his lessons) — answer it right: +20
  function famOf(x, dk) { var B = D.fam || []; if (!B.length || !x || x.ghost || isHome(x) || (x.over && x.over.w !== "ok")) return null;
    var inn = L.admOf(dk, x.k, curAi(dk)); if (!inn || Date.now() - inn.t < 6 * 6e4 * Math.max(ACTX, 0.05)) return null;
    var L0 = B.filter(function (q0) { return (q0.dk || []).indexOf(dk === "x" ? "er" : dk) > -1; }); if (!L0.length) L0 = B;
    var q0 = L0[C.hash(dayId() + dk + x.k + T(x.p.nm)) % L0.length]; return q0; }
  function famDue(x, dk) { var q0 = famOf(x, dk); if (!q0) return null; var R0 = routLoad(), key = dayId() + dk + x.k; if (R0.fa[key] || rOf(x, dk).fa) return null; return q0; }
  function famHtml(k) {
    var x = X(k), dk = L.dep(), q0 = famOf(x, dk); if (!q0) return head("👨‍👩‍👦"); var R0 = routLoad(), key = dayId() + dk + k, an = R0.fa[key];
    var h = head("👨‍👩‍👦 " + esc(T(q0.who) + " " + u("famOf", { n: nm(x).split(" ")[0] })), esc(depName(dk))) + '<p class="lcr-say">💬 «' + esc(T(q0.q)) + '»</p><div class="lcr-acts lcr-wl">';
    h += q0.o.map(function (op, j) { var cls = an == null ? "" : j === q0.a ? " done" : j === an.j ? " bad" : " off"; return '<button type="button" class="lcr-act' + cls + '" data-lcfam="' + k + "." + j + '"' + (an != null ? " disabled" : "") + ">" + esc(T(op)) + "</button>"; }).join("") + "</div>";
    if (an != null) h += '<p class="small">' + (an.j === q0.a ? "✅ " : "💡 ") + esc(T(q0.why)) + "</p>";
    return h + '<p class="small lcr-src">' + (q0.gen ? "🌐 " : "📘 ") + esc(T(q0.src)) + (q0.href ? ' · <a href="' + esc(q0.href) + '">' + (FR() ? "📖 la leçon" : "📖 الدرس") + "</a>" : "") + "</p>";
  }
  function famAns(v) { var p = v.split("."), k = p[0], j = +p[1], x = X(k), dk = L.dep(), q0 = famOf(x, dk); if (!q0) return; var R0 = routLoad(), key = dayId() + dk + k; if (R0.fa[key]) return;
    R0.fa[key] = { j: j, t: Date.now() }; routSave(); sheetPaint();
    if (j === q0.a) bz(k, "fa", dk, function (r) { say("good", u("famOk") + (r.k === "ok" ? bzPay(r) : ""), T(q0.why)); }); else say("neutral", u("famNo"), T(q0.why)); }

  // ⚠️ the incident report (fiche d'événement indésirable) after HIS harmful act on a patient — from the quality + law lessons: +30 when filled right
  var incSel = {};
  function incDue(x, dk) { if (!x) return false; var raw = rawNow(), me = L.me().uid; if (!raw) return false;
    var evs = w.LiveDept.evOf(raw, dk, curAi(dk), x.k); if (!evs.some(function (e) { return e.u === me && (e.k === "bad" || e.k === "no") && !w.LiveDept.BZ_RE.test(e.a); })) return false;
    return !rOf(x, dk).inc; }
  function incQs(k) { var B = D.inc || []; if (!B.length) return []; var r = C.rng(C.hash(dayId() + "inc" + k + L.dep())), ids = B.map(function (z, i) { return i; });
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t0 = ids[i]; ids[i] = ids[j]; ids[j] = t0; } return ids.slice(0, 3).map(function (i) { return B[i]; }); }
  function incHtml(k) {
    var x = X(k), dk = L.dep(); if (!x) return ""; var raw = rawNow(), me = L.me().uid, ev = raw ? w.LiveDept.evOf(raw, dk, curAi(dk), k).filter(function (e) { return e.u === me && (e.k === "bad" || e.k === "no") && !w.LiveDept.BZ_RE.test(e.a); }) : [];
    var e0 = ev[ev.length - 1], s = incSel[k] || (incSel[k] = {}), Q = incQs(k);
    var h = head("⚠️ " + esc(u("incT")), esc(nm(x) + " · " + depName(dk))) + '<p class="small">' + esc(u("incWhat")) + "</p>";
    if (e0) h += '<div class="lcr-pover lost"><b>' + esc(L.actName(e0.a)) + " · " + fmtT(e0.t) + "</b><small>" + esc(u("incFact")) + "</small></div>";
    if (rOf(x, dk).inc) return h + '<div class="lcr-pover ok"><b>' + esc(u("incDone")) + "</b></div>";
    Q.forEach(function (q0, i) { var an = s[i]; h += '<div class="lcr-fld' + (an != null ? " done" : "") + '"><div class="lcr-fl"><b>' + (i + 1) + ". " + esc(T(q0.q)) + '</b></div><div class="lcr-acts">' +
      q0.o.map(function (op, j) { var cls = an == null ? "" : j === q0.a ? " done" : j === an ? " bad" : " off"; return '<button type="button" class="lcr-act' + cls + '" data-lcinc="' + k + "." + i + "." + j + '"' + (an != null ? " disabled" : "") + ">" + esc(T(op)) + "</button>"; }).join("") + "</div>" +
      (an != null ? '<p class="small">' + esc(T(q0.why)) + ' <a href="' + esc(q0.href || "quality.html") + '">📖</a></p>' : "") + "</div>"; });
    if (Q.length && Q.every(function (q0, i) { return s[i] != null; })) { var n = Q.filter(function (q0, i) { return s[i] === q0.a; }).length;
      h += '<div class="lcr-acts"><button type="button" class="lcr-btn on lcr-hit" data-lcincgo="' + k + '">' + esc(n >= 2 ? u("incSend") : u("incRetry")) + "</button></div>"; }
    return h + '<p class="small lcr-src">📘 ' + esc(u("incSrc")) + ' · <a href="quality.html">' + (FR() ? "Qualité" : "الجودة") + '</a> · <a href="law.html">' + (FR() ? "Législation" : "القانون") + "</a></p>";
  }
  function incAns(v) { var p = v.split("."), k = p[0], s = incSel[k] || (incSel[k] = {}); if (s[+p[1]] != null) return; s[+p[1]] = +p[2]; sheetPaint(); }
  function incGo(k) { var Q = incQs(k), s = incSel[k] || {}, n = Q.filter(function (q0, i) { return s[i] === q0.a; }).length;
    if (n < 2) { incSel[k] = {}; sheetPaint(); return say("neutral", u("incAgain")); }
    bz(k, "in", null, function (r) { if (r.k === "ok") say("good", u("incOk") + bzPay(r), u("incWhy")); else say("ord", u("retry")); sheetPaint(); }); }

  // the small signs on a bed: 👨‍👩‍👦 a visitor waiting with a question, 🧾 a result ready at a service, ⚠️ a report to fill, 🚪 ready to go home
  function routMarks(P, x, s, t) {
    var dk = L.dep(), cxp = s.x + s.w / 2, k = x.k, sideX = k === "b" ? s.x + s.w + 16 : s.x - 16;
    if (famDue(x, dk)) { visitor(cx, sideX, s.y + 150, t, P); label(cx, P, sideX, s.y + 128, "💬", "#7c3aed"); }
    var marks = [];
    if (pkOfBed(k).some(function (p) { return !p.got && !p.auto && Date.now() >= p.rd; })) marks.push("🧾");
    if (incDue(x, dk)) marks.push("⚠️");
    if (x.over && x.over.w === "ok" && !isHome(x)) marks.push("🚪");
    if (marks.length) label(cx, P, cxp, s.y - 6, marks.join(" "), marks[0] === "⚠️" ? "#b45309" : "#0f766e");
  }
  function visitor(c, x, y, t, P) { var br = Math.sin(t * 2) * 0.6; c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(x + 1, y + 4, 10, 7, 0, 0, 7); c.fill();
    c.fillStyle = "#a855f7"; c.beginPath(); c.ellipse(x, y + 2 + br, 9, 6, 0, 0, 7); c.fill(); c.fillStyle = "#e3b089"; c.beginPath(); c.arc(x, y - 1 + br, 5, 0, 7); c.fill(); c.fillStyle = "#6b4423"; c.beginPath(); c.arc(x, y - 1.5 + br, 5.2, Math.PI, 2 * Math.PI); c.fill(); }
  // the routine buttons of a bed sheet (care tab)
  function routBtns(x) {
    var dk = L.dep(), b = [], R0 = routLoad();
    b.push('<button type="button" class="lcr-act' + (washed && !R0.hh.t ? " done" : "") + '" data-lcrub="1">🧴 ' + esc(u("rubBtn")) + "<small>" + esc(washed ? u("rubOn") : u("rubOff")) + "</small></button>");
    if (famDue(x, dk)) b.push('<button type="button" class="lcr-act lcr-hit" data-lcfamo="' + x.k + '">👨‍👩‍👦 ' + esc(u("famBtn")) + "</button>");
    if (incDue(x, dk) && (D.inc || []).length) b.push('<button type="button" class="lcr-act lcr-hit" data-lcinco="' + x.k + '">⚠️ ' + esc(u("incBtn")) + "</button>");
    if (x.over && x.over.w === "ok" && !isHome(x)) b.push('<button type="button" class="lcr-act lcr-hit" data-lcdco="' + x.k + '">🚪 ' + esc(u("dcBtn")) + "</button>");
    var pks = pkOfBed(x.k); if (pks.length) b.push('<div class="lcr-pks">' + pks.map(function (p) { var ln = pkLine(p), got = p.got || p.auto; return '<p class="small">' + (got ? "🧾 " : "⏳ ") + "<b>" + esc(ln.t) + "</b> · " + esc(got ? ln.r : u("pkAt", { s: depName(p.svc) })) + "</p>"; }).join("") + "</div>");
    return '<div class="lcr-grp lcr-rout"><h4>' + esc(u("routT")) + '</h4><div class="lcr-acts">' + b.join("") + "</div></div>";
  }

  function onClick(e) {
    sheetTouch = false;                                          // the click ends the gesture: what it changes paints at once
    var t = e.target.closest ? e.target.closest("button,a") : null; if (!t) return;
    var g = function (k) { return t.getAttribute(k); };
    if (g("data-lcx")) return close();
    if (g("data-lcwkx")) return workStop(g("data-lcwkx"));                                   // 29d ⏳ ✖
    // 29e 🧼 🔄 🚪 👨‍👩‍👦 ⚠️ 🧪 the routines + the services
    if (g("data-lcrub")) return rub(false);
    if (g("data-lcpk")) return pkGet(g("data-lcpk"));
    if (g("data-lcho")) return hoAns(g("data-lcho"));
    if (g("data-lchogo")) return hoGo();
    if (g("data-lcdco")) return sheetOpen("dc", g("data-lcdco"));
    if (g("data-lcdcpick")) { var dp = g("data-lcdcpick").split("."), ds = dcSel[dp[0]] || (dcSel[dp[0]] = {}); ds[+dp[1]] = !ds[+dp[1]]; return sheetPaint(); }
    if (g("data-lcdcgo")) return dcGo(g("data-lcdcgo"));
    if (g("data-lcfamo")) return sheetOpen("fam", g("data-lcfamo"));
    if (g("data-lcfam")) return famAns(g("data-lcfam"));
    if (g("data-lcinco")) return sheetOpen("inc", g("data-lcinco"));
    if (g("data-lcinc")) return incAns(g("data-lcinc"));
    if (g("data-lcincgo")) return incGo(g("data-lcincgo"));
    if (g("data-lcreev")) return reev(g("data-lcreev"));                                     // 29d ⏰
    if (g("data-lchelp")) { helpOpen = !helpOpen; if (!helpOpen) helpTxt = ""; helpPaint(); return; }   // 29m 🧑‍⚕️
    if (g("data-lchelpq")) return helpGo();
    if (g("data-lcfu")) { sheet = { kind: "fu", k: "", tab: "" }; openQ = null; q(".lcr-sheet").hidden = false; return sheetPaint(); }
    if (g("data-lcsnd")) { snd = !snd; try { localStorage.setItem(SNDK, snd ? "1" : "0"); } catch (x) {} sndPaint(); if (snd) chime(); return; }
    if (g("data-lcamb")) { sirenHide(); var A0 = hNow() && hNow().amb; return A0 && A0.cur && !L.admOf("x", "a", A0.cur.i) ? walkTo("wt") : walkTo("x"); }   // 29d: he waits at the door until a nurse receives him
    if (g("data-lcfl") != null) { vf = +g("data-lcfl"); vfAt = Date.now(); flTabs(); return; }
    if (g("data-lcgo")) { sheetClose(); return walkTo(g("data-lcgo")); }
    if (g("data-lcseat")) { var sid = g("data-lcseat"), so = seated().filter(function (o) { return wkey(o.x) === sid; })[0]; sheetClose(); if (so) { triSel = sid; svcGo(so.spot, { k: "tri", id: sid }); } return; }
    if (g("data-lctripr")) { triPick.pr = +g("data-lctripr"); return sheetPaint(); }
    if (g("data-lctridc")) { triPick.dc = g("data-lctridc"); return sheetPaint(); }
    if (g("data-lctrigo")) return triGo(g("data-lctrigo"));
    if (g("data-paytab")) return accPanel(g("data-paytab"));
    if (g("data-lcsirx")) return sirenHide();
    if (g("data-lcclose")) return sheetClose();
    if (g("data-lcback")) return panelClose();
    if (g("data-lcbed")) { var kb = g("data-lcbed"); sheetClose(); return goTo(kb === "a" ? "bed1" : "bed2"); }
    if (g("data-lctab")) { sheet.tab = g("data-lctab"); openQ = null; return sheetPaint(); }
    if (g("data-lcact")) return doAct(sheet.k, g("data-lcact"));
    if (g("data-lcq")) { openQ = sheet.k + g("data-lcq"); return sheetPaint(); }
    if (g("data-lcopt")) return doAct(sheet.k, "f_" + g("data-lcf"), +g("data-lcopt"));
    if (g("data-lccall")) return queue(g("data-lccall"), "call");
    if (g("data-lctalk")) { var kt = g("data-lctalk"); talkOpen = talkOpen && talkOpen.k === kt ? null : { k: kt, q: null }; return sheetPaint(); }   // 29m 💬
    if (g("data-lctq")) { var tq = g("data-lctq").split(":"); talkOpen = { k: tq[0], q: tq[1] }; return sheetPaint(); }
    if (g("data-lchint")) { var kh = g("data-lchint"); hintOpen = hintOpen === kh ? null : kh; return sheetPaint(); }
    if (g("data-lchint2")) { var k2 = g("data-lchint2"), x2 = X(k2);
      if (x2 && !x2.over && supFree(k2)) return hintShow(k2, " · " + u("supFree"));                     // 29d 👔 the floor supervisor: one free 🎯 per patient
      if (x2 && myHints(x2) >= C.HMAX) return say("neutral", u("hintNo", { m: C.HMAX })); return queue(k2, "hint"); }
    if (g("data-lchand")) { var kd = g("data-lchand"), xd = X(kd); if (!xd || xd.done.f_tr) return; if (C.avail(xd, xd.by.f_tr)) { handOpen = null; sheet.tab = "file"; openQ = kd + "tr"; return sheetPaint(); }
      handOpen = handOpen === kd ? null : kd; sheetPaint(); setTimeout(function () { var b = q(".lcr-left"); if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest" }); }, 60); return; }
    if (g("data-lcgodesk")) { sheetClose(); return goTo("phone"); }
    if (g("data-lcfile")) return bedSheet(g("data-lcfile"), "file");
    if (g("data-lctake")) { var it = g("data-lctake"), j = hands.indexOf(it); if (j > -1) hands.splice(j, 1); else if (hands.length >= 2) say("neutral", u("full")); else hands.push(it); slots(); return sheetPaint(); }
    if (g("data-lcslot") != null) { var s = +g("data-lcslot"); if (hands[s]) { hands.splice(s, 1); slots(); } return; }
    if (g("data-lcfeed")) return feedPanel();
    if (g("data-lcend")) return endPanel();
    if (g("data-lcrec")) { var kr = g("data-lcrec"); sheetClose(); return st && panelOpen("end", recordHtml(st, kr)); }
    if (g("data-lcarch")) return archPanel();
    if (g("data-lcday")) return archOne(g("data-lcday"));
    if (g("data-lcpush")) return pushPanel();
    if (g("data-lclog")) { if (w.NursinLog) w.NursinLog.open("room"); return; }      // 29b 📒 «سجل حالاتي» (assets/caselog.js, its own layer above the room)
    if (g("data-lcpset")) { L.setPush(g("data-lcpset") === "1").then(function (ok) { if (!ok) say("bad", u("pushErr")); pushPanel(); }); return; }
  }

  /* ---------------- panels: feed, end record, archive, push ---------------- */
  function panelOpen(name, html) { panel = name; var p = q(".lcr-panel"); p.hidden = false; ov.classList.add("lcr-pon"); /* 29d: no room toast over a panel */ p.innerHTML = '<div class="lcr-pin"><button type="button" class="lcr-back" data-lcback="1">' + esc(u("back")) + "</button>" + html + "</div>"; p.scrollTop = 0; }
  function panelClose() { panel = null; var p = q(".lcr-panel"); if (p) { p.hidden = true; p.innerHTML = ""; } if (ov) ov.classList.remove("lcr-pon"); }
  function boardHtml(pts) {
    var b = []; for (var k in pts) { var r = pts[k] || {}; b.push({ u: k, n: r.n || "", p: r.p | 0, ok: r.ok | 0, no: r.no | 0 }); }
    b.sort(function (a, c) { return c.p - a.p || c.ok - a.ok; }); var M = L.me().uid;
    return b.length ? '<ol class="lcr-board">' + b.slice(0, 30).map(function (r, i) { return '<li class="' + (r.u === M ? "me" : "") + '"><span>' + (i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1) + "</span><b>" + esc(r.n) + '</b><small>✅ ' + r.ok + " · ❌ " + r.no + '</small><i dir="ltr">' + (r.p > 0 ? "+" : "") + r.p + "</i></li>"; }).join("") + "</ol>" : '<p class="small">' + esc(u("nobody")) + "</p>";
  }
  function feedPanel() {
    if (!st) return;
    var list = st.ev.slice().reverse().slice(0, 60);
    panelOpen("feed", "<h2>" + esc(u("feed")) + '</h2><ul class="lcr-feed">' + (list.length ? list.map(function (e) { return '<li class="' + e.k + '"><small dir="ltr">' + fmtT(e.t) + "</small> " + esc(evText(e)) + "</li>"; }).join("") : "<li>" + esc(u("nobody")) + "</li>") + "</ul><h3>" + esc(u("board")) + "</h3>" + boardHtml(st.pts));
  }
  // the record of a case (today's when it ended, or one from «📚 الحالات السابقة»)
  function recordHtml(s, only) {                                 // 28x: only = one patient (his case finished while the other one goes on)
    var h = "<h2>" + esc(s.cs.ic + " " + T(s.cs.t)) + '</h2><p class="small">' + esc(s.key) + " · " + esc(s.end ? endWhy(s) : only ? L.stLabel(s.P[only === "b" ? 1 : 0].st) : "") + "</p>" +
      '<p class="small lcr-src' + (s.cs.gen ? " g" : "") + '">' + esc(T(s.cs.src)) + "</p>";
    s.P.forEach(function (x, i) {
      if (x.ghost) return;
      if (only && x.k !== only) return;
      h += '<section class="lcr-rec"><h3>🛏️' + (i + 1) + " " + esc(nm(x)) + " · " + x.p.age + " · " + esc(L.stLabel(x.st, x.p.sex)) + "</h3><h4>" + esc(u("steps")) + '</h4><ol class="lcr-steps">';
      x.L.forEach(function (sp) {
        var dn = x.done[sp.id], ans = sp.kind === "file" ? T(fieldAnswer(x, sp.f, s.cs)) : T(sp.why);
        h += '<li class="' + (dn ? "ok" : "miss") + '"><b>' + (dn ? "✅ " : "⬜ ") + esc(L.stepName(sp)) + '</b> <small class="lcr-ph">' + esc(T(U["ph" + sp.ph]).split(" ")[0]) + "</small><p class=\"small\">" + esc(ans) + "</p>" + '<small class="lcr-byw">' + (dn ? "✍️ " + esc(dn.n) + " · " + fmtT(dn.t) : esc(u("missed"))) + "</small></li>";
      });
      h += "</ol><h4>" + esc(u("wrongs")) + "</h4>";
      var wr = x.bad.concat(x.wrong).sort(function (a, b) { return a.t - b.t; });
      h += wr.length ? '<ul class="lcr-wr">' + wr.map(function (e) {
        var why = "";
        if (e.k === "bad") { x.p.bad.forEach(function (b) { if (b.a === e.a) why = T(b.why); }); if (!why) why = T(C.extra(D, x.p, e.a).why); }
        else if (e.k === "no") { var F = D.fields[String(e.a).slice(2)]; why = F ? T(F.x) : ""; var qd = F ? C.opts(s.DK || D, s.cs, x.p, String(e.a).slice(2)) : null; if (qd && e.o != null && qd.o[e.o]) why = "«" + T(qd.o[e.o]) + "» ← " + why; }
        else if (e.k === "ord") why = FR() ? "Pas dans l'ordre" : "مش بالترتيب";
        else { var xr = C.extra(D, x.p, e.a); why = xr.k === "safe" ? T(U.neuWhy) : T(xr.why); }
        return '<li class="' + e.k + '"><b>' + (e.k === "bad" ? "❌ " : "⚠️ ") + esc(L.actName(e.a)) + " (" + e.d + ')</b> <small>👤 ' + esc(e.n) + " · " + fmtT(e.t) + '</small><p class="small">' + esc(why) + "</p></li>";
      }).join("") + "</ul>" : '<p class="small">' + esc(u("noWrong")) + "</p>";
      h += "</section>";
    });
    return h + (only ? "" : "<h3>" + esc(u("helped")) + "</h3>" + boardHtml(s.pts));
  }
  function endPanel() { if (st) panelOpen("end", recordHtml(st)); }
  function archPanel() {
    panelOpen("arch", "<h2>" + esc(u("archive")) + '</h2><p class="small">…</p>');
    L.archive().then(function (a) {
      if (panel !== "arch") return;
      var list = a.list.map(function (r) { var s = LiveDept.state(D, r.doc, "er", Math.max(Date.now(), C.dayStart(C.keyOf(r.id)) + C.DAY + 3600e3)); return { id: r.id, s: s }; });
      w.__lcArch = list;
      var h = "<h2>" + esc(u("archive")) + "</h2>" + (a.src === "local" && list.length ? '<p class="small">' + esc(u("archLocal")) + "</p>" : "");
      h += list.length ? '<div class="lcr-arch">' + list.map(function (r) {
        var s = r.s, ic = s.end && s.end.w === "ok" ? "✅" : s.end && s.end.w === "lost" ? "💔" : s.end && s.end.w === "mix" ? "✅💔" : "⏰", n = Object.keys(s.pts).length;
        return '<button type="button" class="lcr-day" data-lcday="' + r.id + '"><span class="lcr-dic">' + s.cs.ic + '</span><span class="lcr-dt"><b>' + esc(T(s.cs.t)) + "</b><small>" + esc(s.key) + " · " + s.P.map(function (x) { return esc(T(x.p.nm).split(" ")[0]) + " " + L.stLabel(x.st).split(" ")[0]; }).join(" · ") + " · 👥 " + n + '</small></span><span class="lcr-dr">' + ic + "</span></button>";
      }).join("") + "</div>" : '<p class="lcr-none">' + esc(u("noArch")) + "</p>";
      panelOpen("arch", h);
    });
  }
  function archOne(id) { var r = (w.__lcArch || []).filter(function (x) { return x.id === id; })[0]; if (r) { panelOpen("archone", recordHtml(r.s)); var b = q(".lcr-back"); if (b) b.setAttribute("data-lcback", "1"); } }
  function pushPanel() {
    var signed = !!(w.NursinFB && w.NursinFB.user), on = L.pushOn();
    panelOpen("push", "<h2>" + esc(u("push")) + '</h2><p>' + esc(on ? u("pushOn") : u("pushOff")) + "</p>" + (signed ? '<div class="lcr-acts"><button type="button" class="lcr-btn' + (on ? "" : " on") + '" data-lcpset="' + (on ? "0" : "1") + '">' + esc(on ? "🔕 " + (FR() ? "Couper" : "وقّفها") : "🔔 " + (FR() ? "Activer" : "شغّلها")) + "</button></div>" +
      '<p class="small">' + esc(FR() ? "Il faut aussi les notifications du site activées sur ce téléphone (page Chats / Mon compte)." : "لازم كمان تكون إشعارات الموقع مشغّلة عهالتلفون (صفحة المحادثات / حسابي).") + "</p>" : '<p><a href="friends.html">' + esc(u("sign")) + "</a></p>"));
  }

  /* ---------------- the games.html card + #live ---------------- */
  function card() {
    var c = d.querySelector("[data-live]"); if (!c) return;
    L.start(function (s) { if (!s) return; if (L.stateOf && s.dep && s.dep !== "er") s = L.stateOf("er") || s; var b = c.querySelector(".gbest"); if (b) b.textContent = (s.end ? u("ended") + " · " + L.nextWords(s.t1 - Date.now()) : L.leftWords(s.t1 - Date.now()) + " · " + s.P.map(function (x) { return T(x.p.nm).split(" ")[0] + " " + L.stLabel(x.st).split(" ")[0]; }).join(" · ")) + hospLine(); });
    if (FR()) { var t1 = c.querySelector("b"), t2 = c.querySelector("small"); if (t1) t1.textContent = "🏥 L'hôpital en direct — tous ensemble"; if (t2) t2.textContent = "🚑 Urgences · 🫀 Cardio · 🧠 Neuro : deux patients par service, des ambulances à l'improviste. Marche d'un service à l'autre, + ou − points"; }
  }
  // 28z: the games card also names the two departments upstairs (each patient's colour) — «🫀 … · 🧠 …»
  function hospLine() {
    var H0 = L.hospital ? L.hospital() : null; if (!H0) return "";
    return ["k", "n"].map(function (k) { var S = H0[k]; return S ? " · " + w.LiveDept.INFO[k].ic + " " + (S.end ? "🏁" : S.P.map(function (x) { return L.stLabel(x.st).split(" ")[0]; }).join("")) : ""; }).join("") + (H0.amb && H0.amb.cur && H0.x && !H0.x.end ? " · 🚑" + L.stLabel(H0.x.P[0].st).split(" ")[0] : "") +
      (H0.wait && H0.wait.length ? " · " + u("waitN", { n: H0.wait.length }) : "");          // 29d 🪑 who is waiting to be brought in
  }
  function init() {
    card();
    d.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest("[data-live]"); if (c) { e.preventDefault(); open(); } });
    if (location.hash === "#live") setTimeout(open, 50);
    w.addEventListener("popstate", function () { if (location.hash !== "#live") close(); else if (!ov || ov.hidden) open(); });
    w.addEventListener("hashchange", function () { if (location.hash === "#live" && (!ov || ov.hidden)) open(); });
  }
  w.LiveRoom = { open: open, close: close, sheet: function (kind, k) { sheetOpen(kind, k); }, rout: function () { return routLoad(); }, pkAdd: function (k, a, s) { pkAdd(k, a, s); }, bedSheet: function (k, t) { bedSheet(k, t); }, arch: archPanel, end: endPanel, feed: feedPanel, wash: function () { washed = true; }, hold: function (i) { if (hands.indexOf(i) < 0 && hands.length < 2) hands.push(i); slots(); }, openQ: function (k, f) { openQ = k + f; sheetPaint(); }, st: function () { return st; },
    walkTo: function (dk) { walkTo(dk); }, travel: function () { return trv; }, acc: function (t) { accPanel(t); }, seated: function () { return seated().map(function (o) { return { id: wkey(o.x), at: o.at, spot: o.spot, kind: o.x.kind }; }); },
    tri: function (id) { var o = seated().filter(function (x) { return wkey(x.x) === id; })[0]; if (o) { triSel = id; triPick = { pr: 0, dc: '' }; sheetOpen('tri', id); } }, view: function (f) { vf = f; vfAt = Date.now(); flTabs(); },
    asst: function () { return asst ? { x: asst.x, y: asst.y, mv: asst.mv, offer: offer ? { shown: offer.shown, last: offer.last, act: offer.act } : null, gate: { sheet: !!sheet, panel: !!panel, help: helpOpen, st: !!st, trv: !!trv } } : null; }, asstOffer: function () { if (offer) { offer.last = -1e12; offer.act = -1e12; } },   // 29p
    act: function (k, a, opt) { doAct(k, a, opt); }, go: function (k) { goTo(k); }, nurse: function () { return { x: nurse.x, y: nurse.y, moving: nurse.pts.length }; }, work: function () { return Object.keys(work).map(function (id) { var b = work[id]; return { id: id, a: b.a, k: b.k, dk: b.dk, end: b.end, t0: b.t0 }; }); },
    care: function () { return LCa ? careLoad() : null; }, careTick: function () { careTick(); }, reev: function (k) { reev(k); }, fuList: function () { sheet = { kind: "fu", k: "", tab: "" }; q(".lcr-sheet").hidden = false; sheetPaint(); }, actx: function () { return ACTX; } };   // 29d test hooks
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
