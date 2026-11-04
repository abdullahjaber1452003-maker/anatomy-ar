/* 🔴 «حالة لايف» — the shared room (games.html#live). Two beds, two named patients, the walkable room of the 🏥 solo game
   (stations + paths from assets/erroom-data.js / erroom.js, which games.html loads first — nothing of the solo game is changed),
   hands (2 items), the bed menu (🩺 العناية · 📁 الملف · 📖 القصّة), the nurses' desk (📞 + 📁), a live activity feed «👤 فلان عمل: …»,
   the end record («📋 الخطوات الصح», mistakes, who helped) and «📚 الحالات السابقة». No help button, no ads. Engine: assets/livecase.js. */
(function (w, d) {
  var L = w.LiveCase, C = w.LiveCore; if (!L || !C || !d || !d.addEventListener) return;
  var E = w.ERROOM, R = w.ERRoom;
  var lastRank = "", ov = null, D = null, st = null, mode = "loading", cv, cx, dpr = 1, scale = 1, G = null, bg = null, raf = 0, last = 0, nurse = null, mark = null;
  var hands = [], washed = false, sheet = null, panel = null, fbT = 0, endSeen = false, openQ = null, prevSt = {};
  // 28y: 💡 open hint box (bed k) · the step a paid hint pointed at · the 📤 checklist · each bed has its own IV set (soluté + cathéter + tubulure) at the bed
  var hintOpen = null, hl = null, handOpen = null, BEDSIDE = { kit: 1 };
  // 👥 the other students in the room (assets/livepres.js): their drawn position, path, sprite; the join/leave toast queue
  // 28z 🏥 the floor strip (all departments small, mine big above): its canvas, my walk between departments (trv), the ambulance, the sound
  var fcv = null, fcx = null, fsc = 1, fdpr = 1, trv = null, lastDep = "er", ambSeen = 0, ambAnim = null, snd = false, SNDK = "nursin_live_snd_v1", actx = null, pAll = [];
  var peers = {}, pList = [], pPrev = null, pQ = { join: [], left: [] }, pToastT = 0, pT = 0, avImg = {}, mySpr = null;
  var T = L.T, esc = L.esc, FR = L.FR;
  var U = {
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
      '<button type="button" class="lcr-ib" data-lcarch="1" aria-label="' + esc(u("archive")) + '">📚</button><button type="button" class="lcr-ib" data-lclog="1" aria-label="' + esc(u("myLog")) + '">📒</button><button type="button" class="lcr-ib lcr-fub" data-lcfu="1" aria-label="' + esc(u("myFu")) + '">⏰<i hidden></i></button><button type="button" class="lcr-ib" data-lcpush="1" aria-label="' + esc(u("push")) + '">🔔</button><button type="button" class="lcr-ib lcr-snd" data-lcsnd="1" aria-label="' + esc(u("sndOn")) + '">🔇</button></div>' +
      '<div class="lcr-ban"></div><div class="lcr-pts"></div>' +
      '<div class="lcr-stage"><canvas class="lcr-cv"></canvas><div class="lcr-over" hidden></div><div class="lcr-fb" aria-live="polite"></div><div class="lcr-ptoast" aria-live="polite"></div><div class="lcr-siren" hidden></div><div class="lcr-work" hidden></div></div>' +
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
    L.start(onState).then(function (X) { D = X; if (!X) return; G = screenGrid(G || (R && R.grid ? R.grid() : null)); size(); slots(); go(); flTabs();
      if (w.NursinPay) setTimeout(function () { w.NursinPay.sync(); }, 1500); });   // 29d 💵 the past days of the payroll (once each)
    if (LCa && !careIv) { careIv = setInterval(careTick, 1000); setTimeout(careTick, 1200); }   // 29d ⏰
  }
  function close() {
    if (!ov || ov.hidden) return; ov.hidden = true; d.documentElement.classList.remove("lcr-open"); stop(); L.off(onState); sheetClose(); panelClose();
    if (w.LivePresRoom) w.LivePresRoom.stop(); peers = {}; pList = []; pPrev = null;
    if (careIv) { clearInterval(careIv); careIv = 0; } if (Object.keys(work).length) workAll("wkGone");   // 29d
    if (location.hash === "#live") try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  function onState(s, m) {
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
      el.innerHTML = '<div class="lcr-end"><b>' + esc(u("ended") + " · " + endWhy()) + "</b><small>⏳ " + esc(L.nextWords(st.t1 - Date.now())) + " 🌙</small></div>";
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
    if (!st.end) { if (!el.hidden) { el.hidden = true; el.innerHTML = ""; overKey = ""; } return; }
    var k = (st.dep || "") + st.id + st.end.w + (st.end.pk || "") + (FR() ? "fr" : "ar");
    if (k !== overKey) {
      overKey = k; el.hidden = false;
      el.innerHTML = '<div class="lcr-ovc" role="status"><b class="lcr-ovt">' + esc(u("ended")) + '</b><p class="lcr-ovw">' + esc(endWhy()) + "</p>" +
        (st.dep === "x" ? '<p class="lcr-ovn">' + esc(u("ambDone")) + "</p>" : '<p class="lcr-ovn">' + esc(u("nextIn")) + ' <b class="lcr-ovcd" dir="ltr"></b></p>') + '<div class="lcr-ova">' +
        '<button type="button" class="lcr-btn on" data-lcend="1">' + esc(u("seeSteps")) + '</button><button type="button" class="lcr-btn" data-lcarch="1">' + esc(u("archive")) + '</button><button type="button" class="lcr-btn" data-lclog="1">' + esc(u("myLog")) + "</button></div></div>";
    }
    overTick();
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
    scale = Math.min(wv / E.W, hv / E.H); dpr = Math.min(2, w.devicePixelRatio || 1);
    cv.style.width = Math.round(E.W * scale) + "px"; cv.style.height = Math.round(E.H * scale) + "px";
    cv.width = Math.round(E.W * scale * dpr); cv.height = Math.round(E.H * scale * dpr); bg = null;
  }
  function go() { stop(); last = 0; raf = w.requestAnimationFrame(loop); }
  function stop() { if (raf) w.cancelAnimationFrame(raf); raf = 0; }
  function loop(ts) {
    raf = w.requestAnimationFrame(loop);
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    if (nurse.pts.length && R) {
      var r = R.walk(nurse, nurse.pts, dt); nurse.x = r.x; nurse.y = r.y; nurse.dir = r.dir; nurse.walkT += dt;
      if (r.done) { nurse.walkT = 0; mark = null; if (nurse.goal) { var g = nurse.goal; nurse.goal = null; arrive(g); } }
    }
    if (st && st.end && ts - overT > 500) { overT = ts; overTick(); }
    travelTick(dt);
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
  function bed(c, P, s, bl) {
    c.fillStyle = "rgba(0,0,0,.10)"; rr(c, s.x + 3, s.y + 4, s.w, s.h, 10); c.fill();
    c.fillStyle = P.frame; rr(c, s.x, s.y, s.w, s.h, 10); c.fill();
    c.fillStyle = P.matt; rr(c, s.x + 5, s.y + 5, s.w - 10, s.h - 10, 7); c.fill();
    c.fillStyle = P.pil; rr(c, s.x + 14, s.y + 9, s.w - 28, 22, 8); c.fill();
    c.fillStyle = bl; rr(c, s.x + 7, s.y + 44, s.w - 14, s.h - 51, 6); c.fill();
  }
  var SCR = { x0: 174, x1: 186, y0: 84, y1: 198 };              // 28y: the paravent between the beds (an obstacle on the walking grid too)
  function zig(c) { var n = 6, hgt = (SCR.y1 - SCR.y0) / n; c.beginPath(); for (var i = 0; i <= n; i++) c[i ? "lineTo" : "moveTo"](i % 2 ? SCR.x1 : SCR.x0, SCR.y0 + i * hgt); c.stroke(); }
  function screenGrid(G) {
    if (!G || G.scr) return G; var r = (E.R || 9) + 1;
    for (var j = 0; j < G.rows; j++) for (var i = 0; i < G.cols; i++) { var x = (i + 0.5) * G.cell, y = (j + 0.5) * G.cell; if (x > SCR.x0 - r && x < SCR.x1 + r && y > SCR.y0 - r && y < SCR.y1 + r) G.b[j * G.cols + i] = 1; }
    G.scr = 1; return G;
  }
  function room() {
    var P = pal(), o = d.createElement("canvas"); o.width = cv.width; o.height = cv.height; var c = o.getContext("2d"); c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.fillStyle = P.floor; c.fillRect(0, 0, E.W, E.H);
    c.strokeStyle = P.tile; c.lineWidth = 1; for (var gx = 12; gx < E.W; gx += 24) { c.beginPath(); c.moveTo(gx, 12); c.lineTo(gx, E.H - 12); c.stroke(); } for (var gy = 12; gy < E.H; gy += 24) { c.beginPath(); c.moveTo(12, gy); c.lineTo(E.W - 12, gy); c.stroke(); }
    c.fillStyle = P.wall; c.fillRect(0, 0, E.W, 12); c.fillRect(0, E.H - 12, E.W, 12); c.fillRect(0, 0, 12, E.H); c.fillRect(E.W - 12, 0, 12, E.H);
    c.fillStyle = P.floor; c.fillRect(146, E.H - 12, 68, 12);
    var S = E.stations; bed(c, P, S.bed1, P.b1); bed(c, P, S.bed2, P.b2);
    // 28y 🧴 each bed has its own IV pole with its own soluté (pied à perfusion) — taking the IV for one bed takes nothing from the other
    [S.bed1, S.bed2].forEach(function (s, i) { var px = i ? s.x - 4 : s.x + s.w + 4, py = s.y + 54;
      c.strokeStyle = "#94a3b8"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(px, py - 22); c.lineTo(px, py + 30); c.stroke(); c.beginPath(); c.moveTo(px - 4, py + 30); c.lineTo(px + 4, py + 30); c.stroke();
      c.fillStyle = night() ? "#9cc7dd" : "#dbeef8"; rr(c, px - 5, py - 21, 10, 13, 3); c.fill(); c.strokeStyle = "#7aa7bf"; c.lineWidth = 0.8; c.stroke(); });
    // 28y 🩻 the curtain between the two beds (paravent, Abdullah: «شادر بالنص») — seen from above: a folding screen; everybody walks around it
    c.lineCap = "round"; c.strokeStyle = night() ? "#3a5566" : "#7d8c96"; c.lineWidth = 5.5; zig(c); c.strokeStyle = night() ? "#5d86a3" : "#bcdcf0"; c.lineWidth = 3.6; zig(c); c.lineCap = "butt";
    label(c, P, (SCR.x0 + SCR.x1) / 2, SCR.y1 + 12, "🩻 " + (FR() ? "Paravent" : "ستارة"));
    var m = S.mon; c.fillStyle = "#26343c"; rr(c, m.x, m.y, m.w, m.h, 5); c.fill(); c.fillStyle = "#0b1418"; rr(c, m.x + 3, m.y + 3, m.w - 6, m.h - 9, 3); c.fill();
    var x2 = S.o2; c.fillStyle = "#2fa86a"; rr(c, x2.x, x2.y, 20, x2.h, 4); c.fill(); c.fillStyle = "#1f8a55"; rr(c, x2.x + 23, x2.y + 2, 10, x2.h - 2, 5); c.fill();
    var sk = S.sink; c.fillStyle = night() ? "#cfdade" : "#f6fafb"; rr(c, sk.x, sk.y, sk.w, sk.h, 8); c.fill(); c.fillStyle = "#cde3ea"; c.beginPath(); c.ellipse(sk.x + 13, sk.y + 25, 8, 15, 0, 0, 7); c.fill();
    var ca = S.cart; c.fillStyle = "#d64545"; rr(c, ca.x + 2, ca.y + 2, ca.w - 4, ca.h - 4, 6); c.fill(); c.fillStyle = "#fff"; c.fillRect(ca.x + ca.w / 2 - 2, ca.y + 8, 4, 12); c.fillRect(ca.x + ca.w / 2 - 6, ca.y + 12, 12, 4);
    var df = S.defib; c.fillStyle = "#f59e0b"; rr(c, df.x, df.y, df.w, df.h, 6); c.fill(); c.fillStyle = "#111"; rr(c, df.x + 6, df.y + 6, df.w - 12, 12, 2); c.fill();
    var dg = S.drugs; c.fillStyle = night() ? "#2c4b5c" : "#d4ecf7"; rr(c, dg.x, dg.y, dg.w, dg.h, 5); c.fill(); var pills = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
    for (var sh = 0; sh < 4; sh++) for (var pp = 0; pp < 3; pp++) { c.fillStyle = pills[(sh + pp) % 6]; rr(c, dg.x + 5 + pp * 8, dg.y + 12 + sh * 22, 6, 9, 2); c.fill(); }
    var ph = S.phone; c.fillStyle = night() ? "#6b5338" : "#c89f6b"; rr(c, ph.x, ph.y, ph.w, ph.h, 6); c.fill(); c.fillStyle = "#1f2a30"; rr(c, ph.x + 46, ph.y + 4, 34, 18, 3); c.fill(); c.fillStyle = "#5fd6c6"; c.fillRect(ph.x + 49, ph.y + 7, 28, 12);
    c.fillStyle = "#c0392b"; rr(c, ph.x + 10, ph.y + 9, 22, 14, 5); c.fill();
    for (var k in LBL) { var s2 = S[k]; label(c, P, LBL[k][0], LBL[k][1], s2.ic + " " + T(s2) + (k === "phone" ? " · 📁" : "")); }
    return o;
  }
  var SC = { ok: "#16a34a", impr: "#ca8a04", unst: "#ea580c", crit: "#dc2626", lost: "#475569" };
  function patient(P, x, s, t) {
    var cxp = s.x + s.w / 2, v = x.v, br = x.st === "lost" ? 0 : Math.sin(t * Math.PI * 2 * Math.max(6, v.fr) / 60) * 1.4, done = x.done;
    cx.fillStyle = "rgba(0,0,0,.13)"; rr(cx, cxp - 20 - br / 2, s.y + 50, 40 + br, 86, 16); cx.fill();
    var sk = P.skin; if (x.st === "lost") sk = "#b8c2c8"; else if (v.spo2 < 88) sk = "#c4d2d8"; else if (v.sys < 85) sk = "#ead8c8"; else if (v.t >= 38.5) sk = "#f0a98f";
    var hx = cxp, hy = s.y + 22; cx.fillStyle = sk; cx.beginPath(); cx.arc(hx, hy, 11, 0, 7); cx.fill();
    cx.fillStyle = x.p.sex === "f" ? "#5b3a26" : P.hair; cx.beginPath(); cx.arc(hx, hy - 4, x.p.sex === "f" ? 12.5 : 11, Math.PI * 1.02, Math.PI * 1.98); cx.fill();
    if (x.p.sex === "f") { cx.fillRect(hx - 12, hy - 4, 4, 13); cx.fillRect(hx + 8, hy - 4, 4, 13); }
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
  function draw(t) {
    if (!cv || !cx || !cv.width || !E) return;
    var svc = svcRoom();
    if (!bg) bg = svc ? svcBg(L.dep()) : room();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(bg, 0, 0); cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var P = pal(), S = E.stations, dk0 = L.dep();
    if (svc) { svcDraw(P, dk0, t); }
    else {
    if (dk0 !== "er") { cx.fillStyle = DCOL[dk0]; cx.globalAlpha = 0.07; cx.fillRect(0, 0, E.W, E.H); cx.globalAlpha = 1; label(cx, P, E.W / 2, 7, depName(dk0), DCOL[dk0]); }
    if (st) {
      var m = S.mon, on = st.P.filter(function (x) { return x.done.mon && inBed(x); });
      on.forEach(function (x, j) { cx.strokeStyle = j ? "#7dd3fc" : "#3df59a"; cx.lineWidth = 1; cx.beginPath(); for (var i = 0; i <= 30; i++) { var ph = (i / 30 * 2 + t * (x.v.fc || 0) / 60) % 1, yv = ph < 0.16 ? 0 : ph < 0.18 ? -1 : ph < 0.21 ? 6 : ph < 0.24 ? -2 : 0; cx[i ? "lineTo" : "moveTo"](m.x + 4 + i, m.y + 10 + j * 10 - yv); } cx.stroke(); });
      st.P.forEach(function (x, i) { if (x.ghost) return; var s = i ? S.bed2 : S.bed1; s.k = pk(i);
        if (inBed(x)) { patient(P, x, s, t); if (LCa) fuBadge(P, x, s, t); }
        else { cx.fillStyle = night() ? "rgba(15,23,42,.35)" : "rgba(255,255,255,.55)"; rr(cx, s.x + 5, s.y + 40, s.w - 10, s.h - 46, 7); cx.fill();
          label(cx, P, s.x + s.w / 2, s.y + s.h / 2 + 6, u("waitBed"), "#0d9488"); label(cx, P, s.x + s.w / 2, s.y + s.h + 12, "🛏️ " + T(x.p.nm).split(" ")[0] + " · 🪑", "#64748b"); }
      });
    }
    }
    if (mark) { mark.t += 1 / 60; var r2 = 4 + (mark.t * 20) % 10; cx.strokeStyle = "rgba(15,118,110,.7)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(mark.x, mark.y, r2, 0, 7); cx.stroke(); }
    peersDraw(P, t);
    nurseDraw(P, t);
    meTag();
  }
  function nurseDraw(P) {
    var x = nurse.x, y = nurse.y, a = nurse.dir, sw = nurse.pts.length ? Math.sin(nurse.walkT * 12) : LCa && workMine().length ? Math.sin(Date.now() / 90) * 0.8 : 0;   // 29d: his hands work
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 14, 10, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.scale(1.3, 1.3); cx.rotate(a + Math.PI / 2);
    var sc = rankCol(L.me().uid, "#dc2626");                                                 // 29d: the scrubs take the colour of his rank (👔 purple)
    cx.fillStyle = sc; [[-8, sw * 4], [8, -sw * 4]].forEach(function (p) { cx.beginPath(); cx.arc(p[0], p[1] - 1, 3, 0, 7); cx.fill(); });
    cx.fillStyle = sc; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill(); cx.strokeStyle = "#dc2626"; cx.lineWidth = 1.4; cx.stroke();
    cx.fillStyle = P.skin; cx.beginPath(); cx.arc(0, -1, 5.6, 0, 7); cx.fill(); cx.fillStyle = P.hair; cx.beginPath(); cx.arc(0, 0.5, 5.6, 0, Math.PI); cx.fill();
    cx.restore();
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
  function peerBody(x, y, a, sw, col, P) {
    cx.fillStyle = "rgba(0,0,0,.16)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 13, 9, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.scale(1.2, 1.2); cx.rotate(a + Math.PI / 2);
    cx.fillStyle = col; [[-8, sw * 4], [8, -sw * 4]].forEach(function (q2) { cx.beginPath(); cx.arc(q2[0], q2[1] - 1, 3, 0, 7); cx.fill(); });
    cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill(); cx.fillStyle = "rgba(255,255,255,.25)"; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill();
    cx.fillStyle = P.skin; cx.beginPath(); cx.arc(0, -1, 5.6, 0, 7); cx.fill(); cx.fillStyle = P.hair; cx.beginPath(); cx.arc(0, 0.5, 5.6, 0, Math.PI); cx.fill();
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
      peerBody(ps.x, ps.y, e.dir, e.mv ? Math.sin(e.walkT * 12) : 0, rankCol(p.uid, LP.color(p.uid)), P);
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
  function onTap(e) {
    if (trv) { e.preventDefault(); return; }
    if (st && st.end) { e.preventDefault(); return say("neutral", u("over"), L.nextWords(st.t1 - Date.now())); }   // 28v: never a dead tap
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
    if ((k === "bed1" || k === "bed2") && st && !st.end) { var xw = X(k === "bed1" ? "a" : "b"); if (xw && !xw.ghost && !inBed(xw)) return waitSheet(xw); }
    if (k === "bed2" && X("b") && X("b").ghost) return say("neutral", u("bed2Empty"));
    if (k === "bed1" || k === "bed2") return bedSheet(k === "bed1" ? "a" : "b", "care");
    if (k === "sink") { washed = true; return say("good", u("washed")); }
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
    var fl = dk === "acc" ? (nt ? "#2a2118" : "#f3e8d6") : (nt ? "#14262a" : "#e6f2ef"), tl = dk === "acc" ? (nt ? "#33291e" : "#e8d8bf") : (nt ? "#1b3036" : "#d3e6e1");
    c.fillStyle = fl; c.fillRect(0, 0, E.W, E.H);
    if (dk === "acc") { c.strokeStyle = tl; c.lineWidth = 1; for (var py = 18; py < E.H; py += 22) { c.beginPath(); c.moveTo(12, py); c.lineTo(E.W - 12, py); c.stroke(); for (var px = (py / 22 % 2) * 40 + 12; px < E.W; px += 80) { c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 22); c.stroke(); } } }
    else for (var gx = 12; gx < E.W; gx += 24) for (var gy = 12; gy < E.H; gy += 24) { if (((gx + gy) / 24) % 2) { c.fillStyle = tl; c.fillRect(gx, gy, 24, 24); } }
    c.fillStyle = P.wall; c.fillRect(0, 0, E.W, 12); c.fillRect(0, E.H - 12, E.W, 12); c.fillRect(0, 0, 12, E.H); c.fillRect(E.W - 12, 0, 12, E.H);
    c.fillStyle = fl; c.fillRect(146, E.H - 12, 68, 12);
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
  var triSel = null, svcSay = 0;
  function svcDraw(P, dk, t) {
    if (dk === "wt") {
      var L0 = seated(); if (!L0.length) label(cx, P, 180, 300, u("waitNone"));
      L0.forEach(function (o) { var sel = triSel && triSel === wkey(o.x); cx.save(); cx.translate(o.at.x, o.at.y); cx.scale(PS, PS); if (o.at.str) stretcher(cx, 0, 0, o.x.p, t); else person(cx, 0, 0, o.x.p, t, sel); cx.restore(); });
      var sp = L0.filter(function (o) { return !o.at.str; }); if (sp.length) { var k = Math.floor(t / 4) % sp.length, o2 = sp[k];
        var sel2 = triSel && L0.filter(function (o) { return wkey(o.x) === triSel; })[0]; if (sel2) o2 = sel2; bubble(cx, P, o2.at.x, o2.at.y - (o2.at.str ? 72 : 52), sayOf(o2.x.p)); }
      var WL = waitList(); if (WL.length) label(cx, P, 180, 166, u("waitN", { n: WL.length }), "#0d9488");
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
    }
    nurse.goal = null; nurse.pts = [{ x: Math.max(24, Math.min(E.W - 24, p.x)), y: Math.max(24, Math.min(E.H - 24, p.y)) }]; mark = { x: p.x, y: p.y, t: 0 };
  }
  function svcGo(spot, goal) { nurse.goal = goal; nurse.pts = [spot]; mark = { x: spot.x, y: spot.y, t: 0 }; }
  function svcArrive(g) {
    if (g.k === "acc") return accPanel();
    if (g.k === "desk") return waitListSheet();
    if (g.k === "tri") { var o = waitList().filter(function (x) { return wkey(x) === g.id; })[0]; if (!o) { triSel = null; return say("neutral", u("triBy", { n: "…" })); } triPick = { pr: 0, dc: "" }; return sheetOpen("tri", g.id); }
  }
  function waitListSheet() { sheetOpen("wait", "list"); }
  function waitSheet(x) { sheetOpen("wait", x.k); }
  function waitHtml(k) {
    if (k === "list") {
      var L0 = waitList();
      return head(depName("wt"), u("waitN", { n: L0.length })) + (L0.length ? '<div class="lcr-acts lcr-wl">' + L0.map(function (o) {
        var pr = w.LiveDept.prio(o.p).pr; return '<button type="button" class="lcr-act" data-lcseat="' + esc(wkey(o)) + '">' + (o.kind === "amb" ? "🚑 " : pr === 1 ? "❗ " : "🪑 ") + esc(T(o.p.nm).split(" ")[0] + "، " + o.p.age) + " <small>" + esc(sayOf(o.p).slice(0, 34)) + "</small></button>"; }).join("") + "</div>"
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
  var FW = 360, FH = 156, ROOMS = { n: { x: 6, y: 4, w: 108, h: 60, f: 1 }, k: { x: 126, y: 4, w: 108, h: 60, f: 1 }, er: { x: 246, y: 4, w: 108, h: 60, f: 0 }, x: { x: 246, y: 96, w: 108, h: 28, f: 0 },
    r: { x: 246, y: 4, w: 108, h: 60, f: 1 }, s: { x: 6, y: 4, w: 170, h: 60, f: 2 }, g: { x: 184, y: 4, w: 170, h: 60, f: 2 },
    acc: { x: 6, y: 4, w: 64, h: 60, f: 0 }, lab: { x: 74, y: 4, w: 54, h: 60, f: 0 }, rad: { x: 132, y: 4, w: 54, h: 60, f: 0 }, ph: { x: 190, y: 4, w: 52, h: 60, f: 0 },
    wt: { x: 46, y: 96, w: 194, h: 30, f: 0 }, el: { x: 6, y: 96, w: 34, h: 30, f: -1 } };
  var DCOL = { er: "#dc2626", k: "#e11d48", n: "#7c3aed", x: "#ea580c", r: "#0891b2", s: "#475569", g: "#a16207", wt: "#0d9488", acc: "#ca8a04", lab: "#2563eb", rad: "#64748b", ph: "#16a34a" },
    SCOL = { ok: "#16a34a", impr: "#eab308", unst: "#f97316", crit: "#dc2626", lost: "#64748b" };
  var CORR_Y = 80, vf = 0, vfAt = 0, elT = 0;                      // 29d 🛗: vf = the floor drawn on the strip (mine, or one I peek at with the tabs)
  function FLR(dk) { return w.LiveDept.floorOf(dk); }
  function depName(dk) { var I = w.LiveDept.INFO[dk || L.dep()]; return I.ic + " " + T(I.t); }
  function depTitle() { var dk = L.dep(); return dk === "er" ? u("title") + " · " + depName("er") : depName(dk); }
  function svcRoom() { return w.LiveDept.isSvc(L.dep()); }
  function fsize() {
    if (!fcv) return; var box = fcv.parentNode, wv = box.clientWidth - 12; if (wv <= 0) return;
    fsc = Math.min(wv / FW, 1.9); fdpr = Math.min(2, w.devicePixelRatio || 1);
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
    el.innerHTML = '<span class="lcr-fll">🛗</span>' + [2, 1, 0].map(function (f) {
      var cnt = pAll.filter(function (p) { return FLR(p.dep) === f; }).length + (mf === f ? 1 : 0);
      return '<button type="button" role="tab" class="lcr-flb' + (f === f0 ? " on" : "") + (f === mf ? " me" : "") + '" data-lcfl="' + f + '" aria-selected="' + (f === f0) + '">' + esc(T(w.LiveDept.FLN[f])) +
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
      if (k !== "x" && k !== "wt") { if (r.w < 70) { c.font = "11px " + EMO; c.fillText(I.ic, r.x + r.w / 2, r.y + 13); c.font = "700 6.6px " + EMO; c.fillText(T(I.t), r.x + r.w / 2, r.y + 26); } else c.fillText(depName(k), r.x + r.w / 2, r.y + 9); }
      if (soon) { c.save(); c.globalAlpha = 0.5; c.strokeStyle = nt ? "#475569" : "#cbd5e1"; c.lineWidth = 1; for (var hx = r.x - r.h; hx < r.x + r.w; hx += 8) { c.beginPath(); c.moveTo(Math.max(r.x, hx), r.y + Math.max(0, r.x - hx)); c.lineTo(Math.min(r.x + r.w, hx + r.h), r.y + Math.min(r.h, r.x + r.w - hx)); c.stroke(); } c.restore();
        c.font = "700 " + (r.w < 70 ? 6.4 : 8) + "px " + EMO; c.fillStyle = nt ? "#fde68a" : "#92400e"; c.fillText(u("soonT"), r.x + r.w / 2, r.y + r.h - (r.w < 70 ? 14 : 18)); }
      if (k === "acc") { var pay = w.NursinPay; c.font = "700 6.4px " + EMO; c.fillStyle = nt ? "#fde68a" : "#854d0e"; c.fillText(pay ? pay.money(pay.mine()) : "💵", r.x + r.w / 2, r.y + 42); }
      if (k === "wt") {                                          // 🪑 the chairs; each waiting patient a small seated dot (red pulse = 🔴 by his signs)
        c.font = "700 7.5px " + EMO; c.fillStyle = nt ? "#99f6e4" : "#115e59"; c.textAlign = FR() ? "left" : "right"; c.fillText(depName("wt"), FR() ? r.x + 6 : r.x + r.w - 6, r.y + 8); c.textAlign = "center";
        var seats = WL.filter(function (x) { return x.kind !== "amb"; });
        for (var si = 0; si < 10; si++) { var sx = r.x + 10 + si * 18, sy = r.y + 20; c.fillStyle = nt ? "#334155" : "#cbd5e1"; rr(c, sx - 5, sy - 3, 10, 8, 2); c.fill();
          var wv = seats[si]; if (wv) { var pr = w.LiveDept.prio(wv.p).pr; c.fillStyle = pr === 1 ? "#dc2626" : "#0f766e"; if (pr === 1) c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 6); c.beginPath(); c.arc(sx, sy - 2, 3.4, 0, 7); c.fill(); c.globalAlpha = 1; } }
        if (seats.length > 10) label(c, P, r.x + r.w - 14, r.y + 8, "+" + (seats.length - 10));
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
  function onFloorTap(e) {
    e.preventDefault(); if (trv) return;
    var r = fcv.getBoundingClientRect(), x = (e.clientX - r.left) / fsc, y = (e.clientY - r.top) / fsc, f = viewF();
    var o0 = ROOMS.el; if (x >= o0.x - 4 && x <= o0.x + o0.w + 4 && y >= o0.y - 4 && y <= o0.y + o0.h + 4) { vf = (f + 1) % 3; vfAt = Date.now(); flTabs(); return say("neutral", u("elev") + " · " + T(w.LiveDept.FLN[vf]), u("elevW")); }
    for (var k in ROOMS) { var o = ROOMS[k]; if (o.f !== f) continue; if (x >= o.x - 4 && x <= o.x + o.w + 4 && y >= o.y - 4 && y <= o.y + o.h + 4) return walkTo(k); }
    if (f === 0 && y > 128 && x < 244) { var H0 = hNow(); if (H0 && H0.amb && H0.amb.cur) return walkTo(L.admOf("x", "a", H0.amb.cur.i) ? "x" : "wt"); return say("neutral", u("noAmb"), u("noAmb2")); }
  }
  // the walk: ① to the door of the big room ② the big room shrinks, the nurse walks the corridor (+ the 🛗 to another floor) ③ the new room grows, he walks in
  function walkTo(dk) {
    var esc0 = arguments[1];                                    // 29d: the patient I wheel in (his first name), if any
    if (trv) return; var cur = L.dep();
    if (dk === cur) return say("neutral", u("inDep", { d: depName(dk) }));
    if (w.LiveDept.SOON[dk]) return say("neutral", u("soonD", { d: depName(dk) }), u("soonW"));
    if (Object.keys(work).length) workAll("wkGone");             // 29d ⏳ leaving the room stops what his hands were doing
    if (dk === "x") { var H0 = hosp(); if (!H0 || !H0.amb || !H0.amb.cur) return say("neutral", u("noAmb"), u("noAmb2")); }
    sheetClose(); panelClose(); hintOpen = null; handOpen = null;
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
    if (sheet.kind === "bed") h = bedHtml(sheet.k, sheet.tab); else if (sheet.kind === "desk") h = deskHtml(); else if (sheet.kind === "tri") h = triHtml(sheet.k); else if (sheet.kind === "wait") h = waitHtml(sheet.k); else if (sheet.kind === "fu") h = fuListHtml(); else h = stationHtml(sheet.k);
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
      var btns = g[1].filter(function (a) { return D.A[a] && D.A[a].at === "bed" && !(acc0 && a === "acc"); }).map(function (a) {
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
    if (A && A.at === "bed" && !washed && a !== "paravent") return say("ord", u("must") + " " + u("mWash"));
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
    if (L0.length && !workIv) workIv = setInterval(function () { if (!Object.keys(work).length || !ov || ov.hidden) { clearInterval(workIv); workIv = 0; } workPaint(); }, 250);
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
    if (r.k !== "bad" && LCa.REV[LCa.base(a)]) { var rs = LCa.reassess(S.fu, id, a, now); if (rs.ok.length) { ch = true; reevSay(rs.ok, x); } }
    if (ch) { careSave(); if (sheet) sheetPaint(); }
  }
  function vitLine(x) { var v = (x && x.v) || {}; var R0 = function (n, k) { n = +n; return isFinite(n) ? (k ? n.toFixed(1) : Math.round(n)) : "?"; };
    return u("fuVit") + "TA " + R0(v.sys) + "/" + R0(v.dia) + " · FC " + R0(v.fc) + " · SpO₂ " + R0(v.spo2) + "% · T° " + R0(v.t, 1); }
  function reevSay(ok, x) { setTimeout(function () { say("good", u("fuOk", { n: ok[0].nm.split(" ")[0], p: ok.length * LCa.REAS }), vitLine(x)); }, 1400); }
  // ⏰ the button «أعد التقييم»: 5 s at the bed, local only (nothing shared changes), settles his follow-ups
  function reev(k) {
    var x = X(k); if (!x || !LCa) return; var open0 = fuOpen(k);
    if (!open0.length) return say("neutral", u("fuNone"), vitLine(x));
    workRun(k, "reev", null, function () {
      var now = Date.now(), S = careLoad(), rs = LCa.reassess(S.fu, pidOf(k), "reev", now);
      if (rs.ok.length) { careSave(); say("good", u("fuOk", { n: nm(x).split(" ")[0], p: rs.ok.length * LCa.REAS }), vitLine(X(k))); }
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
    var miss = LCa.sweep(S.fu, now); if (miss.length) { ch = true; say("bad", u("fuMiss", { n: miss[0].nm.split(" ")[0], p: miss.length * LCa.LATE }), u("fuMissW")); }
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
    var t = (x.st === "crit" ? u("docCrit") + " " : "") + (r.doc === 2 ? u("docNew", { w: L.stLabel(x.st, x.p.sex) }) + " " : r.s && r.s.why ? T(r.s.why) + " " : "") + (orders.length ? u("docRx", { r: orders.join(" + ") }) : u("docOk"));
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
  function overSay(x) { var o = st.P[x.k === "a" ? 1 : 0]; say("neutral", ug("pOver", x, { n: nm(x) }), o.over ? "" : ug("pGoOn", o, { n: nm(o) })); if (sheet) sheetPaint(); }
  function result(k, a, r) {
    try { careAfter(k, a, r); } catch (e) { console.warn("nursin care", e); }
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
    else if (r.k === "neu" && a === "hint") { hintShow(k, pts); return; }
    else if (r.k === "neu" && a === "call") say("ord", "📞 " + nm(x) + pts, T(r.why));
    else if (r.k === "neu") say("neutral", u("neu") + pts, T(r.why) + " · " + phNow(x) + ". " + u("hintTip"));   // 28y: names the phase + where help is
    else if (r.k === "safe") say("neutral", u("safe") + " · " + L.actName(a), phNow(x) + ". " + u("hintTip"));
    else if (r.k === "early") say("neutral", u("early") + " · " + L.stepName(r.s), u("after1") + " " + (r.miss || []).slice(0, 2).map(L.stepName).join(" + "));
    else if (r.k === "doc0") say("ord", "📞 " + nm(x), u("doc") + " " + u("docNeed", { m: (r.miss || []).slice(0, 3).map(L.stepName).join(" + ") }));
    else if (r.k === "hmax") say("neutral", u("hintNo", { m: C.HMAX }));
    else if (r.k === "nohint") say("neutral", u("hintNone"));
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
  function onClick(e) {
    sheetTouch = false;                                          // the click ends the gesture: what it changes paints at once
    var t = e.target.closest ? e.target.closest("button,a") : null; if (!t) return;
    var g = function (k) { return t.getAttribute(k); };
    if (g("data-lcx")) return close();
    if (g("data-lcwkx")) return workStop(g("data-lcwkx"));                                   // 29d ⏳ ✖
    if (g("data-lcreev")) return reev(g("data-lcreev"));                                     // 29d ⏰
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
  w.LiveRoom = { open: open, close: close, bedSheet: function (k, t) { bedSheet(k, t); }, arch: archPanel, end: endPanel, feed: feedPanel, wash: function () { washed = true; }, hold: function (i) { if (hands.indexOf(i) < 0 && hands.length < 2) hands.push(i); slots(); }, openQ: function (k, f) { openQ = k + f; sheetPaint(); }, st: function () { return st; },
    walkTo: function (dk) { walkTo(dk); }, travel: function () { return trv; }, acc: function (t) { accPanel(t); }, seated: function () { return seated().map(function (o) { return { id: wkey(o.x), at: o.at, spot: o.spot, kind: o.x.kind }; }); },
    tri: function (id) { var o = seated().filter(function (x) { return wkey(x.x) === id; })[0]; if (o) { triSel = id; triPick = { pr: 0, dc: '' }; sheetOpen('tri', id); } }, view: function (f) { vf = f; vfAt = Date.now(); flTabs(); },
    act: function (k, a, opt) { doAct(k, a, opt); }, go: function (k) { goTo(k); }, nurse: function () { return { x: nurse.x, y: nurse.y, moving: nurse.pts.length }; }, work: function () { return Object.keys(work).map(function (id) { var b = work[id]; return { id: id, a: b.a, k: b.k, dk: b.dk, end: b.end, t0: b.t0 }; }); },
    care: function () { return LCa ? careLoad() : null; }, careTick: function () { careTick(); }, reev: function (k) { reev(k); }, fuList: function () { sheet = { kind: "fu", k: "", tab: "" }; q(".lcr-sheet").hidden = false; sheetPaint(); }, actx: function () { return ACTX; } };   // 29d test hooks
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
