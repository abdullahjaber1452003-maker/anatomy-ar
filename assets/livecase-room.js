/* 🔴 «حالة لايف» — the shared room (games.html#live). Two beds, two named patients, the walkable room of the 🏥 solo game
   (stations + paths from assets/erroom-data.js / erroom.js, which games.html loads first — nothing of the solo game is changed),
   hands (2 items), the bed menu (🩺 العناية · 📁 الملف · 📖 القصّة), the nurses' desk (📞 + 📁), a live activity feed «👤 فلان عمل: …»,
   the end record («📋 الخطوات الصح», mistakes, who helped) and «📚 الحالات السابقة». No help button, no ads. Engine: assets/livecase.js. */
(function (w, d) {
  var L = w.LiveCase, C = w.LiveCore; if (!L || !C || !d || !d.addEventListener) return;
  var E = w.ERROOM, R = w.ERRoom;
  var ov = null, D = null, st = null, mode = "loading", cv, cx, dpr = 1, scale = 1, G = null, bg = null, raf = 0, last = 0, nurse = null, mark = null;
  var hands = [], washed = false, sheet = null, panel = null, fbT = 0, endSeen = false, openQ = null, prevSt = {};
  // 👥 the other students in the room (assets/livepres.js): their drawn position, path, sprite; the join/leave toast queue
  var peers = {}, pList = [], pPrev = null, pQ = { join: [], left: [] }, pToastT = 0, pT = 0, avImg = {}, mySpr = null;
  var T = L.T, esc = L.esc, FR = L.FR;
  var U = {
    title: { ar: "🔴 حالة لايف", fr: "🔴 Cas en direct" }, close: { ar: "سكّر", fr: "Fermer" },
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
    ended: { ar: "🏁 انتهت الحالة", fr: "🏁 Cas terminé" }, nextIn: { ar: "⏳ الحالة الجاية بعد", fr: "⏳ Prochain cas dans" },
    endNobody: { ar: "🏁 الحالة خلصت — شوف 📋 الخطوات الصح", fr: "🏁 Cas terminé — vois 📋 les bonnes étapes" },
    seeSteps: { ar: "📋 الخطوات الصح", fr: "📋 Bonnes étapes" },
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
    gcsQ: { ar: "شو بيعمل المريض؟", fr: "Ce que fait le patient :" }, ageY: { ar: "سنة", fr: "ans" }
  };
  function u(k, r) { var s = T(U[k]); for (var x in (r || {})) s = s.split("{" + x + "}").join(r[x]); return s; }
  var GY = [null, { ar: "ما بيفتح عيونو أبداً", fr: "N'ouvre pas les yeux" }, { ar: "بيفتح عيونو بس عالوجع", fr: "Ouvre les yeux à la douleur" }, { ar: "بيفتح عيونو لمّا تحكيه", fr: "Ouvre les yeux à la demande" }, { ar: "عيونو مفتوحة لحالو", fr: "Yeux ouverts spontanément" }];
  var GV = [null, { ar: "ما بيطلع منو صوت", fr: "Aucune réponse verbale" }, { ar: "أصوات ما بتنفهم", fr: "Sons incompréhensibles" }, { ar: "كلمات مش بمحلّها", fr: "Mots inappropriés" }, { ar: "بيحكي بس مشوّش", fr: "Confus" }, { ar: "بيحكي طبيعي وعارف وين هوّي", fr: "Orienté" }];
  var GM = [null, { ar: "ما بيتحرّك أبداً", fr: "Aucune réponse motrice" }, { ar: "بيمدّ إيديه وإجريه عالوجع (extension)", fr: "Extension à la douleur" }, { ar: "بيطوي إيديه بشكل غريب (flexion anormale)", fr: "Flexion anormale" }, { ar: "بيسحب إيدو عالوجع (évitement)", fr: "Évitement à la douleur" }, { ar: "بيحدّد محلّ الوجع (localise)", fr: "Localise la douleur" }, { ar: "بينفّذ الأوامر", fr: "Obéit aux ordres" }];
  var GROUPS = [["eval", ["eval", "pouls", "swallow", "gly", "ecg", "mon", "bilan", "gds", "bio"]], ["pos", ["pos_semi", "pos_trend", "pos_pls", "pos_tete30", "leg_down", "repos"]],
    ["soin", ["acc", "airway", "o2", "vent", "guedel", "vvp", "remp", "stop", "stopdrug", "immob", "cpr", "shock", "sonde", "jeun", "es", "isol", "refroid", "calm", "drink"]],
    ["rx", ["adre", "nora", "atro", "dobu", "deca", "atb", "sang", "trinit", "aspi", "hep", "furo", "mann", "morph", "g30", "insu", "digi", "vitk", "digo", "aero", "para", "bicar"]]];
  function q(s) { return ov && ov.querySelector(s); }
  function pk(i) { return i ? "b" : "a"; }
  function X(k) { return st && st.P[k === "b" ? 1 : 0]; }
  function nm(x) { return T(x.p.nm); }
  function fmtT(t) { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)); } catch (e) { return ""; } }

  /* ---------------- the overlay ---------------- */
  function build() {
    ov = d.createElement("div"); ov.className = "lcr"; ov.hidden = true; ov.setAttribute("data-nofr", ""); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="lcr-top"><button type="button" class="lcr-x" data-lcx="1" aria-label="' + esc(u("close")) + '">✕</button>' +
      '<span class="lcr-tt"></span><span class="lcr-tm" dir="ltr"></span><span class="lcr-sc" dir="ltr"></span>' +
      '<button type="button" class="lcr-ib" data-lcarch="1" aria-label="' + esc(u("archive")) + '">📚</button><button type="button" class="lcr-ib" data-lcpush="1" aria-label="' + esc(u("push")) + '">🔔</button></div>' +
      '<div class="lcr-ban"></div><div class="lcr-pts"></div>' +
      '<div class="lcr-stage"><canvas class="lcr-cv"></canvas><div class="lcr-over" hidden></div><div class="lcr-fb" aria-live="polite"></div><div class="lcr-ptoast" aria-live="polite"></div></div>' +
      '<div class="lcr-bar"><span class="lcr-hl">' + esc(u("hands")) + '</span><button type="button" class="lcr-slot" data-lcslot="0"></button><button type="button" class="lcr-slot" data-lcslot="1"></button>' +
      '<button type="button" class="lcr-feedb" data-lcfeed="1"></button></div>' +
      '<div class="lcr-sheet" hidden><div class="lcr-shin"></div></div><div class="lcr-panel" hidden></div>';
    d.body.appendChild(ov);
    ov.addEventListener("click", onClick);
    var sh0 = q(".lcr-sheet");
    sh0.addEventListener("pointerdown", function () { sheetHold(true); });
    ["pointerup", "pointercancel"].forEach(function (ev) { sh0.addEventListener(ev, function () { setTimeout(function () { sheetHold(false); }, 0); }); });
    cv = q(".lcr-cv"); cx = cv.getContext("2d"); cv.addEventListener("pointerdown", onTap);
    w.addEventListener("resize", function () { if (!ov.hidden) size(); });
  }
  function open() {
    if (!ov) build();
    ov.hidden = false; d.documentElement.classList.add("lcr-open");
    if (location.hash !== "#live") try { history.pushState({ lc: 1 }, "", "#live"); } catch (e) { location.hash = "live"; }
    q(".lcr-tt").textContent = u("title");
    nurse = nurse || { x: 180, y: 560, dir: -Math.PI / 2, pts: [], goal: null, walkT: 0 };
    L.start(onState).then(function (X) { D = X; if (!X) return; G = G || (R && R.grid ? R.grid() : null); size(); slots(); go(); });
  }
  function close() {
    if (!ov || ov.hidden) return; ov.hidden = true; d.documentElement.classList.remove("lcr-open"); stop(); L.off(onState); sheetClose(); panelClose();
    if (w.LivePresRoom) w.LivePresRoom.stop(); peers = {}; pList = []; pPrev = null;
    if (location.hash === "#live") try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  function onState(s, m) {
    st = s; mode = m; if (!ov || ov.hidden || !s) return;
    // 28v: an ended case is shown as ended everywhere in the room (dimmed room + «🏁 انتهت الحالة» card + countdown to the next one)
    ov.classList.toggle("ended", !!s.end); if (!s.end) endSeen = false;
    var tm = q(".lcr-tm"); tm.textContent = s.end ? "⏭️ " + L.left(s.t1 - Date.now()) : "⏳ " + L.left(s.t1 - Date.now());
    overPaint();
    var M = L.me(), mine = (s.pts[M.uid] || {}).p | 0; q(".lcr-sc").textContent = "🏅 " + (mine > 0 ? "+" : "") + mine;
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
    st.P.forEach(function (x) { var p = prevSt[x.k]; if (p && p !== x.st) { var down = ["ok", "impr", "unst", "crit", "lost"].indexOf(x.st) > ["ok", "impr", "unst", "crit", "lost"].indexOf(p); say(down ? "bad" : "good", (down ? "📉 " : "📈 ") + nm(x) + ": " + L.stLabel(x.st)); } prevSt[x.k] = x.st; });
  }
  function cards() {
    var el = q(".lcr-pts"); if (!el || !st) return;
    if (st.end) {
      var lost = st.end.w === "lost" ? X(st.end.pk) : null;
      el.innerHTML = '<div class="lcr-end"><b>' + esc(u("ended") + " · " + endWhy()) + "</b><small>⏳ " + esc(L.nextWords(st.t1 - Date.now())) + " 🌙</small></div>";
      return;
    }
    el.innerHTML = st.P.map(function (x, i) {
      var v = x.v, mon = !!x.done.mon, pct = Math.round(x.n / x.tot * 100);
      var vit = mon ? '<span dir="ltr" class="lcr-v"><i class="' + lv("ta", v.sys) + '">' + Math.round(v.sys) + "/" + Math.round(v.dia) + '</i> <i class="' + lv("fc", v.fc) + '">♥' + Math.round(v.fc) + '</i> <i class="' + lv("spo2", v.spo2) + '">' + Math.round(v.spo2) + "%</i></span>" : '<span class="lcr-v off">📟 --</span>';
      return '<button type="button" class="lcr-pc ' + x.st + '" data-lcbed="' + pk(i) + '"><span class="lcr-pn"><b>🛏️' + (i + 1) + " " + esc(nm(x)) + '</b><small>' + x.p.age + " " + esc(u("ageY")) + " · " + (x.p.sex === "m" ? "♂" : "♀") + '</small></span><span class="lcr-ps">' + esc(L.stLabel(x.st)) + "</span>" + vit +
        '<span class="lcr-pg"><i style="width:' + pct + '%"></i></span><small class="lcr-pp">' + esc(T(U["ph" + x.ph])) + " · " + x.n + "/" + x.tot + "</small></button>";
    }).join("");
  }
  function endWhy() { var e = st && st.end; if (!e) return ""; var lost = e.w === "lost" ? X(e.pk) : null; return e.w === "ok" ? u("endOk") : lost ? u("endLost", { n: nm(lost) }) : u("endTime"); }
  // 28v: the «🏁 انتهت الحالة» card over the (dimmed) room — it also takes the taps, so the room never looks alive while it is closed
  var overKey = "", overT = 0;
  function overPaint() {
    var el = q(".lcr-over"); if (!el || !st) return;
    if (!st.end) { if (!el.hidden) { el.hidden = true; el.innerHTML = ""; overKey = ""; } return; }
    var k = st.id + st.end.w + (FR() ? "fr" : "ar");
    if (k !== overKey) {
      overKey = k; el.hidden = false;
      el.innerHTML = '<div class="lcr-ovc" role="status"><b class="lcr-ovt">' + esc(u("ended")) + '</b><p class="lcr-ovw">' + esc(endWhy()) + "</p>" +
        '<p class="lcr-ovn">' + esc(u("nextIn")) + ' <b class="lcr-ovcd" dir="ltr"></b></p><div class="lcr-ova">' +
        '<button type="button" class="lcr-btn on" data-lcend="1">' + esc(u("seeSteps")) + '</button><button type="button" class="lcr-btn" data-lcarch="1">' + esc(u("archive")) + "</button></div></div>";
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
    presFrame(dt);
    draw(ts / 1000);
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
  function room() {
    var P = pal(), o = d.createElement("canvas"); o.width = cv.width; o.height = cv.height; var c = o.getContext("2d"); c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.fillStyle = P.floor; c.fillRect(0, 0, E.W, E.H);
    c.strokeStyle = P.tile; c.lineWidth = 1; for (var gx = 12; gx < E.W; gx += 24) { c.beginPath(); c.moveTo(gx, 12); c.lineTo(gx, E.H - 12); c.stroke(); } for (var gy = 12; gy < E.H; gy += 24) { c.beginPath(); c.moveTo(12, gy); c.lineTo(E.W - 12, gy); c.stroke(); }
    c.fillStyle = P.wall; c.fillRect(0, 0, E.W, 12); c.fillRect(0, E.H - 12, E.W, 12); c.fillRect(0, 0, 12, E.H); c.fillRect(E.W - 12, 0, 12, E.H);
    c.fillStyle = P.floor; c.fillRect(146, E.H - 12, 68, 12);
    var S = E.stations; bed(c, P, S.bed1, P.b1); bed(c, P, S.bed2, P.b2);
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
    if (done.vvp) { var px = s.k === "b" ? s.x - 4 : s.x + s.w + 4, py = s.y + 54; cx.strokeStyle = "#94a3b8"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, py + 22); cx.stroke(); cx.fillStyle = done.sang ? "#dc2626" : "#bfe3f5"; rr(cx, px - 5, py - 12, 10, 13, 3); cx.fill(); }
    if (done.acc) { cx.fillStyle = "#fde68a"; rr(cx, cxp + 12, s.y + 96, 9, 5, 2); cx.fill(); }
    // status halo + name label
    var col = SC[x.st] || SC.unst, a = x.st === "crit" ? 0.35 + 0.3 * Math.sin(t * 6) : 0.5;
    cx.strokeStyle = col; cx.globalAlpha = a; cx.lineWidth = 3; rr(cx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 12); cx.stroke(); cx.globalAlpha = 1;
    label(cx, P, cxp, s.y + s.h + 12, "🛏️ " + T(x.p.nm).split(" ")[0] + " · " + L.stLabel(x.st).split(" ")[0], col);
  }
  function draw(t) {
    if (!cv || !cx || !cv.width || !E) return;
    if (!bg) bg = room();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.drawImage(bg, 0, 0); cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var P = pal(), S = E.stations;
    if (st) {
      var m = S.mon, on = st.P.filter(function (x) { return x.done.mon; });
      on.forEach(function (x, j) { cx.strokeStyle = j ? "#7dd3fc" : "#3df59a"; cx.lineWidth = 1; cx.beginPath(); for (var i = 0; i <= 30; i++) { var ph = (i / 30 * 2 + t * (x.v.fc || 0) / 60) % 1, yv = ph < 0.16 ? 0 : ph < 0.18 ? -1 : ph < 0.21 ? 6 : ph < 0.24 ? -2 : 0; cx[i ? "lineTo" : "moveTo"](m.x + 4 + i, m.y + 10 + j * 10 - yv); } cx.stroke(); });
      st.P.forEach(function (x, i) { var s = i ? S.bed2 : S.bed1; s.k = pk(i); patient(P, x, s, t); });
    }
    if (mark) { mark.t += 1 / 60; var r2 = 4 + (mark.t * 20) % 10; cx.strokeStyle = "rgba(15,118,110,.7)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(mark.x, mark.y, r2, 0, 7); cx.stroke(); }
    peersDraw(P, t);
    nurseDraw(P, t);
    if (pList.length) meTag();
  }
  function nurseDraw(P) {
    var x = nurse.x, y = nurse.y, a = nurse.dir, sw = nurse.pts.length ? Math.sin(nurse.walkT * 12) : 0;
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.ellipse(x + 2, y + 4, 14, 10, 0, 0, 7); cx.fill();
    cx.save(); cx.translate(x, y); cx.scale(1.3, 1.3); cx.rotate(a + Math.PI / 2);
    cx.fillStyle = "#b91c1c"; [[-8, sw * 4], [8, -sw * 4]].forEach(function (p) { cx.beginPath(); cx.arc(p[0], p[1] - 1, 3, 0, 7); cx.fill(); });
    cx.fillStyle = "#dc2626"; cx.beginPath(); cx.ellipse(0, 1, 9.5, 6.5, 0, 0, 7); cx.fill();
    cx.fillStyle = P.skin; cx.beginPath(); cx.arc(0, -1, 5.6, 0, 7); cx.fill(); cx.fillStyle = P.hair; cx.beginPath(); cx.arc(0, 0.5, 5.6, 0, Math.PI); cx.fill();
    cx.restore();
    if (hands.length) { cx.font = "9px " + EMO; cx.textAlign = "center"; cx.textBaseline = "middle"; hands.forEach(function (it, i) { var bx = x + (i ? 9 : -9) * (hands.length > 1 ? 1 : 0), by = y - 21; cx.fillStyle = "rgba(255,255,255,.92)"; cx.beginPath(); cx.arc(bx, by, 6.5, 0, 7); cx.fill(); cx.fillStyle = "#000"; cx.fillText((D.I[it] || {}).ic || "•", bx, by + 0.5); }); }
  }

  /* ---------------- 👥 the others in the room (assets/livepres.js) ---------------- */
  function presChange() { var PR = w.LivePresRoom; pList = PR ? PR.others() : []; presDiff(); pplPaint(); bedHint(); }
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
    var PR = w.LivePresRoom, LP = w.LivePres; if (!PR || !PR.active()) { if (pList.length) { pList = []; peers = {}; } return; }
    var tg = nurse.pts.length ? nurse.pts[nurse.pts.length - 1] : nurse;
    PR.tick(nurse, tg, sheet && sheet.kind === "bed" ? sheet.k : "", nurse.pts.length > 0);
    var now = Date.now(); if (now - pT > 1000) { pT = now; pList = PR.others(); presDiff(); pplPaint(); bedHint(); }
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
  function avI(k) {
    if (!k || !w.LivePres.AVRE.test(k)) return null; var im = avImg[k];
    if (!im) { im = avImg[k] = new Image(); im.onload = function () { im.ok = 1; }; im.src = "assets/avatars/" + k + ".webp"; }
    return im.ok ? im : null;
  }
  // the avatar disc + the first name above it, drawn once into a small canvas (redrawn when the zoom, theme or picture changes)
  function sprite(p, e) {
    var img = avI(p.av), key = (p.av || "") + "|" + p.n + "|" + night() + "|" + scale + "|" + (img ? 1 : 0);
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
    pList.forEach(function (p) {
      var e = peers[p.uid]; if (!e) return; var a = LP.alpha(now - p.at); if (a <= 0) return;
      cx.globalAlpha = a;
      peerBody(e.x, e.y, e.dir, e.mv ? Math.sin(e.walkT * 12) : 0, LP.color(p.uid), P);
      var s = sprite(p, e); cx.drawImage(s.c, e.x - s.w / 2, e.y - 5 - s.h, s.w, s.h);
      if (p.b && a > 0.6) { on[p.b].push(p.n); handIc(e.x + 12, e.y - 17); }
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
  }
  function toL(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
  function onTap(e) {
    if (st && st.end) { e.preventDefault(); return say("neutral", u("over"), L.nextWords(st.t1 - Date.now())); }   // 28v: never a dead tap
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
    var S = E.stations[k]; nurse.dir = Math.atan2((S.y + S.h / 2) - nurse.y, (S.x + S.w / 2) - nurse.x);
    if (k === "bed1" || k === "bed2") return bedSheet(k === "bed1" ? "a" : "b", "care");
    if (k === "sink") { washed = true; return say("good", u("washed")); }
    if (k === "phone") return deskSheet();
    stationSheet(k);
  }

  /* ---------------- sheets ---------------- */
  function sheetOpen(kind, k, tab) { sheet = { kind: kind, k: k, tab: tab || "care" }; openQ = null; q(".lcr-sheet").hidden = false; sheetPaint(); }
  function sheetClose() { sheet = null; openQ = null; var s = q(".lcr-sheet"); if (s) s.hidden = true; }
  function sheetPaint() {
    if (!sheet || !st) return; var el = q(".lcr-shin"), h = "";
    if (sheet.kind === "bed") h = bedHtml(sheet.k, sheet.tab); else if (sheet.kind === "desk") h = deskHtml(); else h = stationHtml(sheet.k);
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
    var h = head("🛏️" + i + " " + esc(nm(x)) + " · " + p.age + " " + esc(u("ageY")) + " · " + (p.sex === "m" ? "♂" : "♀"), esc(L.stLabel(x.st)) + " · " + esc(T(U["ph" + x.ph])) + " · ✅ " + x.n + "/" + x.tot);
    h += '<p class="lcr-pbed" hidden></p>';
    h += '<div class="lcr-tabs" role="tablist">' + ["care", "file", "story"].map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t === tab) + '" class="lcr-tab' + (t === tab ? " on" : "") + '" data-lctab="' + t + '">' + esc(u(t)) + "</button>"; }).join("") + "</div>";
    if (tab === "file") return h + fileHtml(x);
    if (tab === "story") return h + storyHtml(x);
    h += '<p class="lcr-who">' + esc(T(p.who)) + "</p>";
    var acc0 = x.by.acc && !x.done.acc;                         // 28w: «🤝 استقبال» was the last button of the sheet — while not done it comes first
    if (acc0) h += '<div class="lcr-grp lcr-first"><h4>' + esc(u("start")) + '</h4><div class="lcr-acts">' + nowBtn("acc") + "</div></div>";
    GROUPS.forEach(function (g) {
      var btns = g[1].filter(function (a) { return D.A[a] && D.A[a].at === "bed" && !(acc0 && a === "acc"); }).map(function (a) {
        var A = D.A[a], s = x.by[a], done = s && x.done[s.id], need = A.need, has = !need || hands.indexOf(need) > -1;
        return '<button type="button" class="lcr-act' + (done ? " done" : "") + (has ? "" : " need") + '" data-lcact="' + a + '">' + (done ? "✅ " : "") + A.ic + " " + esc(T(A).replace(/^(عطي |Donner : )/, "")) +
          (done ? '<small>' + esc(u("by") + " " + done.n) + "</small>" : !has ? "<small>" + esc((D.I[need] || {}).ic || "") + " ✋?</small>" : "") + "</button>";
      }).join("");
      h += '<div class="lcr-grp"><h4>' + esc(u(g[0])) + '</h4><div class="lcr-acts">' + btns + "</div></div>";
    });
    return h;
  }
  function storyHtml(x) {
    var p = x.p;
    return '<div class="lcr-story"><p class="lcr-who"><b>' + esc(T(p.who)) + "</b></p><p>🗣️ " + esc(T(p.story)) + "</p>" +
      "<h4>🩺 " + (FR() ? "Signes" : "العوارض") + "</h4><ul>" + p.sx.map(function (s) { return "<li>" + esc(T(s)) + "</li>"; }).join("") + "</ul>" +
      "<h4>🧪 " + (FR() ? "Examens" : "فحوصات") + "</h4><ul>" + p.lab.map(function (s) { return "<li>" + esc(T(s)) + "</li>"; }).join("") + "</ul>" +
      '<p class="small lcr-src">' + esc(T(st.cs.src)) + ' · <a href="' + st.cs.href + '">' + (FR() ? "📖 la leçon" : "📖 الدرس") + "</a></p></div>";
  }
  function fieldAnswer(x, f, cs) { var qd = C.opts(D, cs || st.cs, x.p, f); return qd.o[qd.a]; }
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
    if (ban.length && !st.end) {
      var go = ban.filter(function (q) { return q.kind === "act" && D.A[q.a] && D.A[q.a].at === "bed" && !D.A[q.a].need; });
      h += '<div class="lcr-lockb" role="note"><p><b>' + esc(u("lockF")) + "</b> " + esc(ban.slice(0, 3).map(L.stepName).join(" + ")) + "</p>" +
        '<div class="lcr-acts">' + go.map(function (q) { return nowBtn(q.a); }).join("") + (go.length < ban.length ? '<button type="button" class="lcr-act" data-lctab="care">' + esc(u("lockGo")) + "</button>" : "") + "</div></div>";
    }
    order.forEach(function (f) {
      var F = D.fields[f], s = x.by["f_" + f], dn = s && x.done[s.id], key = x.k + f, isOpen = openQ === key, lk = null;
      h += '<div class="lcr-fld' + (dn ? " done" : "") + '"><div class="lcr-fl"><b>' + F.ic + " " + esc(T(F)) + "</b>" + (FR() ? "" : ' <small dir="ltr">' + esc(F.fr) + "</small>") + "</div>";
      if (dn) h += '<div class="lcr-fv">' + esc(T(fieldAnswer(x, f))) + '<small> · ✍️ ' + esc(dn.n) + " " + fmtT(dn.t) + "</small></div>";
      else if (isOpen) {
        var qd = C.opts(D, st.cs, x.p, f), cl = L.cool(x.k, "f_" + f);
        h += '<div class="lcr-fq"><p>' + esc(T(F.q)) + "</p>";
        if (f === "gcs") { var g = x.p.gyvm; h += '<ul class="lcr-gcs"><li>👁️ ' + esc(T(GY[g[0]])) + "</li><li>🗣️ " + esc(T(GV[g[1]])) + "</li><li>✋ " + esc(T(GM[g[2]])) + "</li></ul>"; }
        if (f === "cst") h += x.done.mon ? '<p class="lcr-cst" dir="ltr">TA ' + Math.round(x.v.sys) + "/" + Math.round(x.v.dia) + " · FC " + Math.round(x.v.fc) + " · FR " + Math.round(x.v.fr) + " · SpO₂ " + Math.round(x.v.spo2) + "% · T° " + x.v.t.toFixed(1) + "</p>" : '<p class="small">' + esc(u("mon0")) + "</p>";
        if (cl) h += '<p class="lcr-cool">' + esc(u("wait", { t: L.left(cl - Date.now() + 59e3) })) + "</p>";
        h += '<div class="lcr-opts">' + qd.o.map(function (o, i) { return '<button type="button" class="lcr-opt" data-lcopt="' + i + '" data-lcf="' + f + '"' + (cl ? " disabled" : "") + ">" + esc(T(o)) + "</button>"; }).join("") + "</div></div>";
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
    h += '<p class="lcr-who">' + esc(u("callFor")) + '</p><div class="lcr-acts">' + st.P.map(function (x, i) { var s = x.by.call, dn = s && x.done.call; return '<button type="button" class="lcr-act' + (dn ? " done" : "") + '" data-lccall="' + pk(i) + '">' + (dn ? "✅ " : "") + "📞 🛏️" + (i + 1) + " " + esc(nm(x)) + (dn ? "<small>✍️ " + esc(dn.n) + "</small>" : "") + "</button>"; }).join("") + "</div>";
    h += '<p class="lcr-who">' + esc(u("fileOf")) + '</p><div class="lcr-acts">' + st.P.map(function (x, i) { return '<button type="button" class="lcr-act" data-lcfile="' + pk(i) + '">📁 🛏️' + (i + 1) + " " + esc(nm(x)) + "</button>"; }).join("") + "</div>";
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
  function doAct(k, a, opt) {
    if (!st) return say("ord", u("retry"));
    if (st.end) return say("neutral", u("over"), L.nextWords(st.t1 - Date.now()));
    var A = D.A[a], x = X(k);
    if (A && A.at === "bed" && !washed) return say("ord", u("wash"));
    if (A && A.need && hands.indexOf(A.need) < 0) { var I = D.I[A.need], S = E.stations[I.st]; return say("ord", u("needItem", { i: I.ic + " " + T(I), s: S.ic + " " + T(S) })); }
    if (A && A.needDone && !x.done[A.needDone]) return say("ord", u("needVvp"));
    if (A && A.need && D.I[A.need].rx && !x.done.call) return say("ord", u("needCall"));
    // 28w: steps queue one after the other (a quick 2nd answer used to bounce off the 2 s spacing); a step that takes a moment shows «⏳»
    var tw = setTimeout(function () { say("neutral", u("saving")); }, 600);
    actQ = actQ.then(function () { return L.act(k, a, opt); }).then(function (r) { clearTimeout(tw); result(k, a, r); }, function (e) { clearTimeout(tw); console.warn("nursin live", e); say("bad", u("err"), u("errWhy")); });
  }
  var actQ = Promise.resolve();
  function result(k, a, r) {
    var x = X(k), A = D.A[a], pts = r.d ? " " + (r.d > 0 ? "+" : "") + r.d : "";
    // 28w: close only THIS field's question — the answer of the field before (queued, saved a second later) used to close the one being answered
    function shut() { if (openQ === k + String(a).replace(/^f_/, "")) openQ = null; }
    if ((r.k === "ok" || r.k === "bad") && A && A.need) { var I = D.I[A.need], j = hands.indexOf(A.need); if (I && !I.keep && j > -1) { hands.splice(j, 1); slots(); } }
    if (r.k === "ok") { say("good", u("ok") + pts + " · " + L.stepName(r.s), T(r.s.why) || (r.s.kind === "file" ? T(fieldAnswer(x, r.s.f)) : "")); if (r.s.kind === "file") shut(); }
    else if (r.k === "bad") { say("bad", u("bad") + pts + " · " + L.actName(a), T(r.why)); if (w.Osman && w.Osman.wrong) try { w.Osman.wrong(); } catch (e) {} }
    else if (r.k === "ord") { var m = r.miss || [], sm = m.filter(function (s) { return s.ph === r.s.ph; }); say("ord", u("ord") + pts + " · " + L.stepName(r.s), sm.length ? u("before") + " " + sm.slice(0, 2).map(L.stepName).join(" + ") : u("finishPh", { p: T(U["ph" + (m[0] ? m[0].ph : r.s.ph)]) })); }
    else if (r.k === "neu") say("neutral", u("neu") + pts, u("neuWhy"));
    else if (r.k === "no") { say("bad", u("no") + pts, T(r.why)); shut(); }
    else if (r.k === "repeat") { var dn = r.s && x.done[r.s.id]; say("neutral", dn && dn.u !== L.me().uid ? u("repeat", { n: dn.n }) : u("repeat0")); shut(); }
    else if (r.k === "wait") say("ord", u("wait", { t: L.left(r.until - Date.now() + 59e3) }));
    else if (r.k === "slow" || r.k === "busy") say("neutral", u("slow"));
    else if (r.k === "over") say("neutral", u("over"));
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
    if (g("data-lcclose")) return sheetClose();
    if (g("data-lcback")) return panelClose();
    if (g("data-lcbed")) { var kb = g("data-lcbed"); sheetClose(); return goTo(kb === "a" ? "bed1" : "bed2"); }
    if (g("data-lctab")) { sheet.tab = g("data-lctab"); openQ = null; return sheetPaint(); }
    if (g("data-lcact")) return doAct(sheet.k, g("data-lcact"));
    if (g("data-lcq")) { openQ = sheet.k + g("data-lcq"); return sheetPaint(); }
    if (g("data-lcopt")) return doAct(sheet.k, "f_" + g("data-lcf"), +g("data-lcopt"));
    if (g("data-lccall")) { var kc = g("data-lccall"); if (st && st.end) return say("neutral", u("over"), L.nextWords(st.t1 - Date.now())); return L.act(kc, "call").then(function (r) { result(kc, "call", r); }).then(null, function () { say("bad", u("err"), u("errWhy")); }); }
    if (g("data-lcfile")) return bedSheet(g("data-lcfile"), "file");
    if (g("data-lctake")) { var it = g("data-lctake"), j = hands.indexOf(it); if (j > -1) hands.splice(j, 1); else if (hands.length >= 2) say("neutral", u("full")); else hands.push(it); slots(); return sheetPaint(); }
    if (g("data-lcslot") != null) { var s = +g("data-lcslot"); if (hands[s]) { hands.splice(s, 1); slots(); } return; }
    if (g("data-lcfeed")) return feedPanel();
    if (g("data-lcend")) return endPanel();
    if (g("data-lcarch")) return archPanel();
    if (g("data-lcday")) return archOne(g("data-lcday"));
    if (g("data-lcpush")) return pushPanel();
    if (g("data-lcpset")) { L.setPush(g("data-lcpset") === "1").then(function (ok) { if (!ok) say("bad", u("pushErr")); pushPanel(); }); return; }
  }

  /* ---------------- panels: feed, end record, archive, push ---------------- */
  function panelOpen(name, html) { panel = name; var p = q(".lcr-panel"); p.hidden = false; p.innerHTML = '<div class="lcr-pin"><button type="button" class="lcr-back" data-lcback="1">' + esc(u("back")) + "</button>" + html + "</div>"; p.scrollTop = 0; }
  function panelClose() { panel = null; var p = q(".lcr-panel"); if (p) { p.hidden = true; p.innerHTML = ""; } }
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
  function recordHtml(s) {
    var h = "<h2>" + esc(s.cs.ic + " " + T(s.cs.t)) + '</h2><p class="small">' + esc(s.key) + " · " + esc(s.end ? (s.end.w === "ok" ? u("endOk") : s.end.w === "lost" ? u("endLost", { n: nm(s.P[s.end.pk === "b" ? 1 : 0]) }) : u("endTime")) : "") + "</p>" +
      '<p class="small lcr-src' + (s.cs.gen ? " g" : "") + '">' + esc(T(s.cs.src)) + "</p>";
    s.P.forEach(function (x, i) {
      h += '<section class="lcr-rec"><h3>🛏️' + (i + 1) + " " + esc(nm(x)) + " · " + x.p.age + " · " + esc(L.stLabel(x.st)) + "</h3><h4>" + esc(u("steps")) + '</h4><ol class="lcr-steps">';
      x.L.forEach(function (sp) {
        var dn = x.done[sp.id], ans = sp.kind === "file" ? T(fieldAnswer(x, sp.f, s.cs)) : T(sp.why);
        h += '<li class="' + (dn ? "ok" : "miss") + '"><b>' + (dn ? "✅ " : "⬜ ") + esc(L.stepName(sp)) + '</b> <small class="lcr-ph">' + esc(T(U["ph" + sp.ph]).split(" ")[0]) + "</small><p class=\"small\">" + esc(ans) + "</p>" + '<small class="lcr-byw">' + (dn ? "✍️ " + esc(dn.n) + " · " + fmtT(dn.t) : esc(u("missed"))) + "</small></li>";
      });
      h += "</ol><h4>" + esc(u("wrongs")) + "</h4>";
      var wr = x.bad.concat(x.wrong).sort(function (a, b) { return a.t - b.t; });
      h += wr.length ? '<ul class="lcr-wr">' + wr.map(function (e) {
        var why = "";
        if (e.k === "bad") { x.p.bad.forEach(function (b) { if (b.a === e.a) why = T(b.why); }); }
        else if (e.k === "no") { var F = D.fields[String(e.a).slice(2)]; why = F ? T(F.x) : ""; var qd = F ? C.opts(D, s.cs, x.p, String(e.a).slice(2)) : null; if (qd && e.o != null && qd.o[e.o]) why = "«" + T(qd.o[e.o]) + "» ← " + why; }
        else if (e.k === "ord") why = FR() ? "Pas dans l'ordre" : "مش بالترتيب";
        else why = T(U.neuWhy);
        return '<li class="' + e.k + '"><b>' + (e.k === "bad" ? "❌ " : "⚠️ ") + esc(L.actName(e.a)) + " (" + e.d + ')</b> <small>👤 ' + esc(e.n) + " · " + fmtT(e.t) + '</small><p class="small">' + esc(why) + "</p></li>";
      }).join("") + "</ul>" : '<p class="small">' + esc(u("noWrong")) + "</p>";
      h += "</section>";
    });
    return h + "<h3>" + esc(u("helped")) + "</h3>" + boardHtml(s.pts);
  }
  function endPanel() { if (st) panelOpen("end", recordHtml(st)); }
  function archPanel() {
    panelOpen("arch", "<h2>" + esc(u("archive")) + '</h2><p class="small">…</p>');
    L.archive().then(function (a) {
      if (panel !== "arch") return;
      var list = a.list.map(function (r) { var s = C.state(D, r.doc, Math.max(Date.now(), C.dayStart(C.keyOf(r.id)) + C.DAY + 3600e3)); return { id: r.id, s: s }; });
      w.__lcArch = list;
      var h = "<h2>" + esc(u("archive")) + "</h2>" + (a.src === "local" && list.length ? '<p class="small">' + esc(u("archLocal")) + "</p>" : "");
      h += list.length ? '<div class="lcr-arch">' + list.map(function (r) {
        var s = r.s, ic = s.end && s.end.w === "ok" ? "✅" : s.end && s.end.w === "lost" ? "💔" : "⏰", n = Object.keys(s.pts).length;
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
    L.start(function (s) { if (!s) return; var b = c.querySelector(".gbest"); if (b) b.textContent = s.end ? u("ended") + " · " + L.nextWords(s.t1 - Date.now()) : L.leftWords(s.t1 - Date.now()) + " · " + s.P.map(function (x) { return T(x.p.nm).split(" ")[0] + " " + L.stLabel(x.st).split(" ")[0]; }).join(" · "); });
    if (FR()) { var t1 = c.querySelector("b"), t2 = c.querySelector("small"); if (t1) t1.textContent = "Cas en direct — tous ensemble"; if (t2) t2.textContent = "Un cas par jour pour tout le site : deux patients, chacun fait l'étape suivante, + ou − points"; }
  }
  function init() {
    card();
    d.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest("[data-live]"); if (c) { e.preventDefault(); open(); } });
    if (location.hash === "#live") setTimeout(open, 50);
    w.addEventListener("popstate", function () { if (location.hash !== "#live") close(); else if (!ov || ov.hidden) open(); });
    w.addEventListener("hashchange", function () { if (location.hash === "#live" && (!ov || ov.hidden)) open(); });
  }
  w.LiveRoom = { open: open, close: close, bedSheet: function (k, t) { bedSheet(k, t); }, arch: archPanel, end: endPanel, feed: feedPanel, wash: function () { washed = true; }, hold: function (i) { if (hands.indexOf(i) < 0 && hands.length < 2) hands.push(i); slots(); }, openQ: function (k, f) { openQ = k + f; sheetPaint(); }, st: function () { return st; } };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
