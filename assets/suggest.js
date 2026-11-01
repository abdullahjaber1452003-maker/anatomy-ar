/* 🛠️ «شو بدك نضيف أو نعدّل؟» — the suggestion box (Abdullah, Oct 31 2026 11:39–11:41 PM: «صندوق اقتراحات … الطالب بس يقترح ما حدا غيرو
   هوي بيشوف وأنا» · «نسمي الاقتراحات بشي انه الطالب شو بده ينضاف وتعديل للموقع»; Nov 1 7:11 AM «صندوق الاقتراحات وين ما شفتو؟»).
   suggest.html: a signed-in student picks ➕ إضافة / ✏️ تعديل / 🐞 مشكلة, writes (≤ 1000 chars), optionally names the subject / part of
   the site, and sends → Firestore suggestions/{auto id} {uid, name, type, text, subj, status:'new', at}. «اقتراحاتي» lists ONLY his own
   entries (status chip جديد / عم نشتغل عليه / تم ✅ + the admin's reply). The admin (admin.html, «🛠️ الاقتراحات») reads all of them,
   sets the status, replies, deletes (assets/admin.js uses the helpers below). Rules v21: create for self only (fields whitelisted,
   status forced 'new', no reply), read own; admin read / update(status, reply, rAt) / delete. Until v21 is published every read / save
   is refused → a clear message (the draft stays on this device), no error. No ads on this page. */
(function (w, d) {
  "use strict";
  var MAX = 1000, DRAFT = "nursin_sug_draft_v1", SEEN = "nursin_sug_seen_v1", COLL = "suggestions";
  var OWNER = "abdullahjaber1452003@gmail.com";
  var TYPES = [
    { k: "add", e: "➕", ar: "إضافة", fr: "Ajout", h: "شي جديد بدك ياه بالموقع", hf: "Quelque chose de nouveau sur le site" },
    { k: "edit", e: "✏️", ar: "تعديل", fr: "Modification", h: "شي موجود بدك نغيّرو أو نحسّنو", hf: "Quelque chose à changer ou améliorer" },
    { k: "bug", e: "🐞", ar: "مشكلة", fr: "Problème", h: "شي مش عم يزبط أو غلط", hf: "Quelque chose qui ne marche pas ou une erreur" }
  ];
  var STATUS = {
    "new": { e: "🆕", ar: "جديد", fr: "Nouveau" },
    doing: { e: "🔧", ar: "عم نشتغل عليه", fr: "En cours" },
    done: { e: "✅", ar: "تم", fr: "Fait" }
  };
  var AREAS = [                                              // the optional «عن شو؟» list: the site's parts (subjects come from NLESSONS)
    ["path", "🧭", "مسار اليوم", "Parcours du jour"], ["quiz", "⚡", "الكويز", "Quiz"], ["midterm", "🎯", "امتحان الفصل", "Examen de mi-semestre"],
    ["games", "🎮", "الألعاب", "Jeux"], ["tutor", "👨‍🏫", "الأستاذ عثمان", "Professeur Osman"], ["friends", "👥", "أصحابي والصفوف", "Amis et classes"],
    ["design", "🎨", "الشكل والتصميم", "Apparence et design"], ["other", "💭", "شي تاني", "Autre chose"]
  ];
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cut(s, n) { return Array.from(String(s == null ? "" : s)).slice(0, n).join(""); }
  function len(s) { return Array.from(String(s == null ? "" : s)).length; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function typeOf(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].k === k) return TYPES[i]; return null; }
  function subjects() { var S = (w.NLESSONS && w.NLESSONS.subjects) || {}; return Object.keys(S).map(function (k) { var x = S[k]; return [k, x.e || "📚", x.ar || k, x.fr || x.ar || k]; }); }
  function areas() { return subjects().concat(AREAS); }
  function areaName(v) { if (!v) return ""; var a = areas(); for (var i = 0; i < a.length; i++) if (a[i][0] === v) return a[i][1] + " " + T(a[i][2], a[i][3]); return v; }
  function ms(t) { if (!t) return 0; if (typeof t === "number") return t; if (t.toMillis) try { return t.toMillis(); } catch (e) {} if (t.seconds != null) return t.seconds * 1000; var n = +new Date(t); return isNaN(n) ? 0 : n; }

  /* pure (tests + admin.js): what a student may send — mirrors rules v21 exactly; returns {ok, doc} or {ok:false, why} */
  function payload(uid, name, type, text, subj) {
    text = String(text == null ? "" : text).trim();
    if (!uid) return { ok: false, why: "auth" };
    if (!typeOf(type)) return { ok: false, why: "type" };
    if (!text) return { ok: false, why: "empty" };
    if (len(text) > MAX) return { ok: false, why: "long" };
    subj = String(subj || ""); if (subj && !/^[a-z0-9_-]{1,30}$/.test(subj)) subj = "";
    return { ok: true, doc: { uid: String(uid), name: cut(String(name || "").trim(), 40), type: type, text: text, subj: subj, status: "new" } };
  }
  /* pure: a Firestore doc → an entry, or null */
  function clean(id, x) {
    if (!id || !x || typeof x !== "object") return null;
    var text = cut(String(x.text || "").trim(), MAX); if (!text || !typeOf(x.type)) return null;
    return { id: cut(id, 40), uid: String(x.uid || ""), name: cut(String(x.name || ""), 40), type: x.type, text: text, subj: cut(String(x.subj || ""), 30),
      status: STATUS[x.status] ? x.status : "new", reply: cut(String(x.reply || "").trim(), MAX), at: ms(x.at), rAt: ms(x.rAt) };
  }
  function sortNew(list) { return list.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }
  function filter(list, f) { f = f || {}; return list.filter(function (x) { return (!f.type || x.type === f.type) && (!f.status || x.status === f.status); }); }
  function counts(list) { var c = { all: list.length, "new": 0, doing: 0, done: 0, add: 0, edit: 0, bug: 0 }; list.forEach(function (x) { c[x.status] = (c[x.status] | 0) + 1; c[x.type] = (c[x.type] | 0) + 1; }); return c; }
  function when(t) {
    if (!t) return "";
    try { return new Intl.DateTimeFormat(FR() ? "fr-FR" : "ar-LB-u-nu-latn", { timeZone: "Asia/Beirut", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(0, 16).replace("T", " "); }
  }
  function typeChip(k) { var t = typeOf(k) || TYPES[0]; return '<span class="sgt sgt-' + t.k + '">' + t.e + " " + esc(T(t.ar, t.fr)) + "</span>"; }
  function statusChip(k) { var s = STATUS[k] || STATUS["new"]; return '<span class="sgs sgs-' + (STATUS[k] ? k : "new") + '">' + s.e + " " + esc(T(s.ar, s.fr)) + "</span>"; }
  function denied(e) { return !!(e && (e.code === "permission-denied" || /permission/i.test(String(e.code || e.message || "")))); }
  function isOwner(u) { return !!(u && u.email === OWNER && u.emailVerified); }
  function rulesMsg(owner) {
    return owner ? T("⏳ لازم تنشر قواعد v21 بـ Firebase أوّل (Firestore ← Rules ← الصق ملف v21 ← Publish)، وبعدين بيشتغل الصندوق.", "⏳ Il faut publier les règles v21 dans Firebase (Firestore ← Rules ← coller le fichier v21 ← Publish), ensuite la boîte marche.")
      : T("⏳ صندوق الاقتراحات عم يتجهّز. نصّك محفوظ عهالجهاز، جرّب بعد شوي.", "⏳ La boîte à idées se prépare. Ton texte est gardé sur cet appareil, réessaie un peu plus tard.");
  }

  /* ---------------- the student page (suggest.html) ---------------- */
  var app = null, st = { type: "", list: null, err: "", busy: false, last: 0, settled: false };
  function fb() { var A = w.NursinFB; return A && A.fs && A.db ? A : null; }
  function me() { var A = fb(); return A && A.user ? A.user : null; }
  function head() {
    return '<div class="qcard sghero"><h1>🛠️ ' + esc(T("شو بدك نضيف أو نعدّل؟", "Qu'est-ce qu'on ajoute ou modifie ?")) + "</h1>" +
      '<p class="small">' + esc(T("قلّنا شو ناقص بالموقع، شو بدك نغيّر، أو إذا في شي مش عم يزبط. اقتراحك بتشوفو إنت بس والإدارة، وبيوصلك الرد هون.", "Dis-nous ce qui manque, ce qu'on doit changer, ou ce qui ne marche pas. Seuls toi et l'administration voyez ta proposition ; la réponse arrive ici.")) + "</p></div>";
  }
  function form() {
    var dr = lsGet(DRAFT) || {}, ty = st.type || dr.type || "";
    var chips = TYPES.map(function (t) { return '<button type="button" class="sgchip' + (ty === t.k ? " on" : "") + '" data-sgtype="' + t.k + '" aria-pressed="' + (ty === t.k) + '"><span class="e">' + t.e + "</span><b>" + esc(T(t.ar, t.fr)) + "</b><small>" + esc(T(t.h, t.hf)) + "</small></button>"; }).join("");
    var opts = '<option value="">' + esc(T("— الموقع كلّو / عام —", "— Tout le site / général —")) + "</option>" +
      '<optgroup label="' + esc(T("المواد", "Matières")) + '">' + subjects().map(function (a) { return '<option value="' + esc(a[0]) + '"' + (dr.subj === a[0] ? " selected" : "") + ">" + esc(a[1] + " " + T(a[2], a[3])) + "</option>"; }).join("") + "</optgroup>" +
      '<optgroup label="' + esc(T("أقسام الموقع", "Parties du site")) + '">' + AREAS.map(function (a) { return '<option value="' + esc(a[0]) + '"' + (dr.subj === a[0] ? " selected" : "") + ">" + esc(a[1] + " " + T(a[2], a[3])) + "</option>"; }).join("") + "</optgroup>";
    return '<div class="qcard sgform" id="sgform"><h2>✍️ ' + esc(T("اقتراح جديد", "Nouvelle proposition")) + "</h2>" +
      '<p class="sglab">' + esc(T("شو نوعو؟", "C'est quoi ?")) + '</p><div class="sgchips" role="group">' + chips + "</div>" +
      '<label class="sglab" for="sgtext">' + esc(T("اكتب اقتراحك", "Écris ta proposition")) + ' <span class="sgreq">*</span></label>' +
      '<textarea id="sgtext" class="sgin" rows="5" maxlength="' + MAX + '" placeholder="' + esc(T("مثلاً: بدنا كويز لكل جزء من الدرس، أو الخط صغير بصفحة الأدوية…", "Ex. : un quiz pour chaque partie de la leçon, ou le texte est trop petit sur la page des médicaments…")) + '">' + esc(dr.text || "") + "</textarea>" +
      '<p class="small sgcnt"><span id="sgcount">' + len(dr.text || "") + "</span>/" + MAX + "</p>" +
      '<label class="sglab" for="sgsubj">' + esc(T("عن شو؟ (اختياري)", "À propos de quoi ? (facultatif)")) + '</label><select id="sgsubj" class="sgin">' + opts + "</select>" +
      '<p class="fbtns"><button class="btn pri sgsend" id="sgsend" type="button">📨 ' + esc(T("ابعت الاقتراح", "Envoyer")) + "</button></p>" +
      '<p class="small sgmsg" id="sgmsg" aria-live="polite"></p></div>';
  }
  function mine() {
    var h = '<div class="qcard sgmine" id="sgmine"><h2>📬 ' + esc(T("اقتراحاتي", "Mes propositions")) + "</h2>";
    if (st.err) return h + '<p class="small sgnote">' + esc(st.err) + "</p></div>";
    if (!st.list) return h + '<p class="small">⏳ …</p></div>';
    if (!st.list.length) return h + '<p class="small sgempty">' + esc(T("لسّا ما بعتت ولا اقتراح. أوّل فكرة إلك؟ 👆", "Tu n'as encore rien proposé. Ta première idée ? 👆")) + "</p></div>";
    var seen = +(lsGet(SEEN) || 0);
    return h + '<ul class="sglist">' + st.list.map(function (x) {
      var fresh = x.reply && x.rAt > seen;
      return '<li class="sgitem">' + '<div class="sgrow">' + typeChip(x.type) + statusChip(x.status) + (fresh ? '<span class="sgnew">' + esc(T("رد جديد", "Nouvelle réponse")) + "</span>" : "") + "</div>" +
        '<p class="sgtx" data-nofr dir="auto">' + esc(x.text) + "</p>" +
        '<p class="small sgmeta">' + esc(when(x.at)) + (x.subj ? " · " + esc(areaName(x.subj)) : "") + "</p>" +
        (x.reply ? '<div class="sgreply"><b>💬 ' + esc(T("الرد:", "Réponse :")) + '</b> <span data-nofr dir="auto">' + esc(x.reply) + "</span></div>" : "") + "</li>";
    }).join("") + "</ul></div>";
  }
  function draw() {
    if (!app) return;
    var A = fb(), u = me();
    if (!A || (!u && !st.settled)) { app.innerHTML = head() + '<div class="qcard"><p class="small" id="sgwait">⏳ ' + esc(T("عم نفتح حسابك…", "On ouvre ton compte…")) + "</p></div>"; return; }
    if (!u) {
      app.innerHTML = head() + '<div id="sgsign"></div>';
      if (A.signInCard) A.signInCard(d.getElementById("sgsign"), '<p class="fbig">🔐 ' + esc(T("سجّل دخول لتبعت اقتراح", "Connecte-toi pour envoyer une proposition")) + "</p><p>" + esc(T("هيك منعرف إنّو إلك، وبتشوف الرد عليه هون.", "Comme ça on sait qu'elle est à toi, et tu vois la réponse ici.")) + "</p>");
      return;
    }
    var keep = d.getElementById("sgtext"), txt = keep ? keep.value : null, sj = d.getElementById("sgsubj"), sv = sj ? sj.value : null;
    app.innerHTML = head() + form() + mine();
    if (txt != null) { d.getElementById("sgtext").value = txt; d.getElementById("sgcount").textContent = len(txt); }
    if (sv != null) d.getElementById("sgsubj").value = sv;
    if (st.list && st.list.length) { var mx = 0; st.list.forEach(function (x) { if (x.reply && x.rAt > mx) mx = x.rAt; }); if (mx > +(lsGet(SEEN) || 0)) lsSet(SEEN, mx); }
  }
  function saveDraft() {
    var t = d.getElementById("sgtext"), s = d.getElementById("sgsubj");
    var x = { type: st.type, text: t ? t.value : "", subj: s ? s.value : "" };
    if (!x.type && !x.text && !x.subj) lsSet(DRAFT, null); else lsSet(DRAFT, x);
  }
  function say(t, ok) { var m = d.getElementById("sgmsg"); if (m) { m.textContent = t; m.className = "small sgmsg" + (ok ? " ok" : ""); } }
  function load() {
    var A = fb(), u = me(); if (!A || !u) return Promise.resolve();
    var F = A.fs, q;
    try { q = F.query(F.collection(A.db, COLL), F.where("uid", "==", u.uid)); } catch (e) { return Promise.resolve(); }
    return F.getDocs(q).then(function (s) {
      var out = []; s.forEach(function (x) { var c = clean(x.id, x.data()); if (c) out.push(c); });
      st.list = sortNew(out); st.err = ""; draw();
    }, function (e) {
      st.list = []; st.err = denied(e) ? rulesMsg(isOwner(u)) : T("⚠️ ما قدرنا نجيب اقتراحاتك هلّق. جرّب بعد شوي.", "⚠️ Impossible de charger tes propositions pour l'instant. Réessaie plus tard."); draw();
    });
  }
  function send() {
    var A = fb(), u = me(); if (!A || !u || st.busy) return;
    var t = d.getElementById("sgtext"), s = d.getElementById("sgsubj");
    var name = (A.profile && A.profile.name) || u.displayName || "";
    var p = payload(u.uid, name, st.type, t ? t.value : "", s ? s.value : "");
    if (!p.ok) return say(p.why === "type" ? T("اختار النوع أوّل: ➕ إضافة، ✏️ تعديل أو 🐞 مشكلة.", "Choisis d'abord le type : ➕ Ajout, ✏️ Modification ou 🐞 Problème.") :
      p.why === "empty" ? T("اكتب اقتراحك أوّل ✍️", "Écris d'abord ta proposition ✍️") : p.why === "long" ? T("النص طويل كتير (الحدّ 1000 حرف).", "Texte trop long (1000 caractères max).") : "");
    if (Date.now() - st.last < 20000) return say(T("⏳ استنّى شوي قبل ما تبعت اقتراح تاني.", "⏳ Attends un peu avant d'en envoyer une autre."));
    var F = A.fs, docv = p.doc; docv.at = F.serverTimestamp();
    st.busy = true; say("⏳ …"); var b = d.getElementById("sgsend"); if (b) b.disabled = true;
    F.addDoc(F.collection(A.db, COLL), docv).then(function () {
      st.busy = false; st.last = Date.now(); st.type = ""; lsSet(DRAFT, null);
      if (t) t.value = ""; draw(); say(T("✅ وصل اقتراحك! شكراً 🙏 بتشوف الرد هون تحت.", "✅ Proposition envoyée ! Merci 🙏 La réponse s'affichera ci-dessous."), true);
      load().then(function () { say(T("✅ وصل اقتراحك! شكراً 🙏 بتشوف الرد هون تحت.", "✅ Proposition envoyée ! Merci 🙏 La réponse s'affichera ci-dessous."), true); });
    }, function (e) {
      st.busy = false; if (b) b.disabled = false; saveDraft();
      say(denied(e) ? rulesMsg(isOwner(u)) : T("⚠️ ما انبعت، تأكّد من الإنترنت وجرّب كمان مرّة. نصّك محفوظ.", "⚠️ Non envoyé : vérifie ta connexion et réessaie. Ton texte est gardé."));
    });
  }
  function wire() {
    app.addEventListener("click", function (e) {
      var c = e.target.closest && e.target.closest("[data-sgtype]");
      if (c) { st.type = c.getAttribute("data-sgtype"); app.querySelectorAll("[data-sgtype]").forEach(function (x) { var on = x === c; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); saveDraft(); say(""); return; }
      if (e.target.closest && e.target.closest("#sgsend")) send();
    });
    app.addEventListener("input", function (e) { if (e.target && e.target.id === "sgtext") { var n = d.getElementById("sgcount"); if (n) n.textContent = len(e.target.value); saveDraft(); } });
    app.addEventListener("change", function (e) { if (e.target && e.target.id === "sgsubj") saveDraft(); });
  }
  function start() {
    app = d.getElementById("sg-app"); if (!app) return;
    lsSet("nursin_sug_open_v1", Date.now());                // 🛠️ the home card's «جديد» badge goes away once the student has been here
    var dr = lsGet(DRAFT); if (dr && typeOf(dr.type)) st.type = dr.type;
    draw(); wire();
    d.addEventListener("nursin:auth", function (e) { st.settled = true; st.list = null; st.err = ""; draw(); if (e.detail && e.detail.signedIn) load(); });
    if (fb() && me()) { st.settled = true; draw(); load(); }
    setTimeout(function () { if (!st.settled && fb()) { st.settled = true; draw(); if (me()) load(); } }, 5000);   // auth settled before this file listened
    setTimeout(function () {                                  // Firebase never came (offline / blocked): say so instead of spinning
      if (st.settled) return; var x = d.getElementById("sgwait");
      if (x) x.textContent = T("⚠️ ما قدرنا نوصل لحسابك. تأكّد من الإنترنت وارجع جرّب.", "⚠️ Impossible de joindre ton compte. Vérifie ta connexion et réessaie.");
    }, 12000);
  }

  w.NursinSug = { MAX: MAX, COLL: COLL, TYPES: TYPES, STATUS: STATUS, AREAS: AREAS, payload: payload, clean: clean, sortNew: sortNew, filter: filter, counts: counts,
    typeOf: typeOf, typeChip: typeChip, statusChip: statusChip, areaName: areaName, when: when, denied: denied, rulesMsg: rulesMsg, T: T, esc: esc };
  if (!d || !d.addEventListener) return;
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start); else start();
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
