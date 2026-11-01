// nursin 📢 admin: only the site owner (verified Google email) can post or clear the announcement everyone sees,
// and send a 🔔 phone notification to every device that turned notifications on (worker /broadcast; rules v9 let only him list pushSubs).
// Loaded by fb.js on admin.html.
// 🔔 «مين مفعّل الإشعارات» (Oct 27): every student (users/) with ✅/❌ from pushSubs/{uid}.d (≥1 device = on) — admin-only reads, no rules change.
const OWNER = "abdullahjaber1452003@gmail.com";
const WORKER = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev", CHUNK = 25;
const PAGES = [["/", "🏠 الرئيسية"], ["/cardio.html", "❤️ القلب"], ["/neuro.html", "🧠 الأعصاب"], ["/3d.html", "🧊 المجسّمات 3D"], ["/quiz.html", "📝 الكويز"], ["/henderson.html", "📋 Henderson"], ["/law.html", "⚖️ القانون"], ["/mgmt.html", "🏢 الإدارة"], ["/quality.html", "✅ الجودة والاعتماد"], ["/pharma.html", "💊 الأدوية"], ["/rea.html", "🚑 الإنعاش"], ["/medsurg.html", "🏥 Med-Surg"], ["/geri.html", "👴 الشيخوخة"], ["/community.html", "🏘️ صحة المجتمع"], ["/exams.html", "📅 الامتحانات"], ["/classes.html", "🏫 الصفوف"], ["/tutor.html", "👨‍🏫 الأستاذ عثمان"], ["/chat.html", "💬 المحادثات"]];
export function page(API) {
  const el = document.getElementById("admin-app"); if (!el) return;
  const u = API.user, { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, updateDoc } = API.fs;
  if (!(u && u.email === OWNER && u.emailVerified)) {
    el.innerHTML = '<div class="qcard"><p class="fbig">⛔ مش مسموح</p><p>هالصفحة لصاحب الموقع بس.</p><div id="asign"></div></div>';
    if (!u) API.signInCard(document.getElementById("asign"), "<p>إذا إنت صاحب الموقع، سجّل دخول بحسابك.</p>");
    return;
  }
  el.innerHTML = '<div class="qcard"><h2>📢 إعلان للكل</h2><p class="small">بيبين فوق بكل الصفحات لكل مين بيفوت عالموقع، مع نقطة حمرا عالجرس 🔔.</p>' +
    '<textarea id="atext" class="atext" maxlength="500" rows="5" placeholder="اكتب الإعلان هون…"></textarea><p class="small"><span id="acount">0</span>/500</p>' +
    '<p><label class="achk"><input type="checkbox" id="apush"> 🔔 ابعت كمان إشعار عالتلفونات</label></p>' +
    '<p class="fbtns"><button class="btn pri" id="asend" type="button">ابعت للكل</button> <button class="btn" id="adel" type="button">امحي الإعلان</button></p>' +
    '<p id="amsg" class="small" aria-live="polite"></p><p class="small">الإعلان هلّق: <span id="anow">⏳</span></p></div>' +
    '<div class="qcard"><h2>📢 إشعار للكل (عالتلفونات)</h2><p class="small">بيطلع إشعار عالتلفون لكل اللي مفعّلين الإشعارات، حتى لو الموقع مسكّر. بتكبس عليه بيفتح الصفحة.</p>' +
    '<p class="small">📱 مفعّلين: <span id="pcount">⏳</span></p>' +
    '<label class="alab" for="ptitle">العنوان</label><input id="ptitle" class="atext ain" maxlength="60" placeholder="مثلاً: نزل درس جديد 🫀">' +
    '<label class="alab" for="pbody">النص</label><textarea id="pbody" class="atext" maxlength="160" rows="3" placeholder="مثلاً: Endocardite مشروحة مع كويز. فوت شوف!"></textarea><p class="small"><span id="pcnt">0</span>/160</p>' +
    '<label class="alab" for="purl">بيفتح على</label><select id="purl" class="atext ain">' + PAGES.map(p => '<option value="' + p[0] + '">' + p[1] + '</option>').join("") + '<option value="?">رابط تاني…</option></select>' +
    '<input id="purl2" class="atext ain" dir="ltr" hidden placeholder="/cardio.html#infarctus">' +
    '<p class="fbtns"><button class="btn pri" id="psend" type="button">🔔 ابعت الإشعار</button></p><p id="pmsg" class="small" aria-live="polite"></p></div>';
  const ref = doc(API.db, "announcements", "current"), $ = id => document.getElementById(id);
  const t = $("atext"), msg = s => { $("amsg").textContent = s; };
  const err = e => msg(e && e.code === "permission-denied" ? "⚠️ القواعد الجديدة (v6) مش ملصوقة بفايربيس بعد." : "⚠️ ما زبط، جرّب كمان مرّة.");
  const show = async () => { try { const s = await getDoc(ref); $("anow").textContent = s.exists() ? s.data().text : "ما في"; } catch (e) { $("anow").textContent = "—"; } };
  t.addEventListener("input", () => { $("acount").textContent = t.value.length; });
  $("asend").addEventListener("click", async () => {
    const text = t.value.trim(); if (!text) return msg("اكتب شي أوّل.");
    try { await setDoc(ref, { text, createdAt: serverTimestamp(), by: u.email }); msg("✅ انبعت للكل."); t.value = ""; $("acount").textContent = 0; show(); window.NursinAnn && window.NursinAnn.refresh(); } catch (e) { return err(e); }
    if ($("apush").checked) { $("apush").checked = false; const short = Array.from(text.replace(/\s+/g, " ")).slice(0, 160).join(""); await sendPush("📢 إعلان جديد", short, "/", s => msg("✅ انبعت للكل. " + s)); }
  });

  /* ---------- 🔔 broadcast ---------- */
  const pmsg = s => { $("pmsg").textContent = s; };
  const loadSubs = async () => {                           // every device: { u: uid, k: device key, s: sealed subscription }
    const snap = await getDocs(collection(API.db, "pushSubs")), out = [], docs = {};
    snap.forEach(x => { const dd = (x.data() || {}).d || {}; docs[x.id] = dd; for (const k of Object.keys(dd)) if (typeof dd[k] === "string") out.push({ u: x.id, k, s: dd[k] }); });
    return { subs: out, docs, users: Object.keys(docs).filter(id => Object.keys(docs[id]).length).length };
  };
  const count = async () => {
    try { const r = await loadSubs(); $("pcount").textContent = r.subs.length + " جهاز (" + r.users + " مستخدم)"; }
    catch (e) { $("pcount").textContent = e && e.code === "permission-denied" ? "⚠️ لازم تلصق قوانين v9 بفايربيس" : "—"; }
  };
  async function sendPush(title, body, url, say) {
    let all;
    try { all = await loadSubs(); } catch (e) { return say(e && e.code === "permission-denied" ? "⚠️ الإشعار ما انبعت: قوانين v9 مش ملصوقة بفايربيس بعد." : "⚠️ الإشعار ما انبعت، جرّب كمان مرّة."); }
    if (!all.subs.length) return say("📱 ما في حدا مفعّل الإشعارات لهلّق.");
    const b = Array.from(crypto.getRandomValues(new Uint8Array(12)), x => (x % 36).toString(36)).join("");
    let sent = 0, failed = 0, gone = [], stop = "";
    for (let i = 0; i < all.subs.length && !stop; i += CHUNK) {
      const part = all.subs.slice(i, i + CHUNK);
      say("⏳ عم يبعت… " + Math.min(i + CHUNK, all.subs.length) + "/" + all.subs.length);
      try {
        const res = await fetch(WORKER + "/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: await u.getIdToken(), b, title, body, url, subs: part }) });
        const j = await res.json().catch(() => ({}));
        if (j && j.ok) { sent += j.sent | 0; failed += j.failed | 0; gone = gone.concat(j.gone || []); continue; }
        if (res.status === 429) stop = "⏳ بعتت كتير بهالساعة (5 بالساعة)، جرّب بعدين.";
        else if (res.status === 403) stop = "⛔ الـ worker رفض حسابك.";
        else if (j && j.ok === undefined || res.status === 404) stop = "⚠️ لازم تلصق كود الـ worker الجديد (v3) بـ Cloudflare.";
        else if (res.status === 503) stop = "⚠️ المفتاح السرّي مش بالـ worker.";
        else failed += part.length;
      } catch (e) { failed += part.length; }
    }
    let cleaned = 0;                                         // phones that unsubscribed or uninstalled: remove them from pushSubs
    const byUser = {}; for (const g of gone) (byUser[g.u] = byUser[g.u] || []).push(g.k);
    for (const id of Object.keys(byUser)) {
      const dd = { ...(all.docs[id] || {}) }; for (const k of byUser[id]) delete dd[k];
      try { await updateDoc(doc(API.db, "pushSubs", id), { d: dd }); cleaned += byUser[id].length; } catch (e) { console.warn("nursin: prune", e && e.code); }
    }
    say((stop ? stop + " " : "") + "✅ وصل لـ " + sent + " جهاز" + (failed ? " · ❌ ما وصل لـ " + failed : "") + (cleaned ? " · 🧹 انمحى " + cleaned + " اشتراك قديم" : ""));
    count();
  }
  $("pbody").addEventListener("input", () => { $("pcnt").textContent = $("pbody").value.length; });
  $("purl").addEventListener("change", () => { $("purl2").hidden = $("purl").value !== "?"; });
  $("psend").addEventListener("click", async () => {
    const title = $("ptitle").value.trim(), body = $("pbody").value.trim();
    if (!title && !body) return pmsg("اكتب عنوان أو نص أوّل.");
    let url = $("purl").value; if (url === "?") url = $("purl2").value.trim() || "/";
    if (!/^\/[^\s]*$/.test(url)) return pmsg("الرابط لازم يبلّش بـ / (صفحة من الموقع).");
    $("psend").disabled = true;
    await sendPush(title, body, url, pmsg);
    $("psend").disabled = false;
  });
  count();
  pushWho(API, el, loadSubs);
  $("adel").addEventListener("click", async () => {
    try { await deleteDoc(ref); msg("🗑️ انمحى الإعلان."); show(); window.NursinAnn && window.NursinAnn.refresh(); } catch (e) { err(e); }
  });
  show();
  if (window.NursinLessons) { hwAdmin(API, el); weekPicker(API, el); sugAdmin(API, el); } else window.addEventListener("load", () => { hwAdmin(API, el); weekPicker(API, el); sugAdmin(API, el); }, { once: true });
}

/* 🛠️ «الاقتراحات» (Abdullah, Oct 31 2026 11:39 PM: «صندوق اقتراحات … الطالب بس يقترح ما حدا غيرو هوي بيشوف وأنا»): every entry of
   suggest.html («شو بدك نضيف أو نعدّل؟»), newest first, with the student's name; filter by type / status; set the status
   (🆕 جديد / 🔧 عم نشتغل عليه / ✅ تم), write a reply the student sees under his own entry, delete. Badge = how many are still «جديد».
   Needs rules v21 (until then the read is refused and this card says so). Helpers + labels: window.NursinSug (assets/suggest.js). */
function sugAdmin(API, el) {
  const X = window.NursinSug; if (!X) return;
  const { doc, updateDoc, deleteDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } = API.fs, T = X.T, esc = X.esc;
  const box = document.createElement("div"); box.className = "qcard sgadm"; box.id = "sgadm";
  let all = null, f = { type: "", status: "" }, err = "";
  const chip = (k, v, label, n) => '<button type="button" class="chip sm' + (f[k] === v ? " on" : "") + '" data-sgf="' + k + '" data-v="' + v + '" aria-pressed="' + (f[k] === v) + '">' + label + (n != null ? " <small>" + n + "</small>" : "") + "</button>";
  function draw() {
    const c = X.counts(all || []), badge = c.new ? '<span class="sgbadge" title="' + esc(T("جديد", "Nouveau")) + '">' + c.new + "</span>" : "";
    let h = '<h2>🛠️ ' + esc(T("الاقتراحات", "Propositions")) + " " + badge + '</h2><p class="small">' + esc(T("كل شي بعتو الطلاب من «🛠️ شو بدك نضيف أو نعدّل؟». الطالب بيشوف بس اقتراحاتو هو، والحالة والرد يلي بتكتبو.", "Tout ce que les étudiants envoient depuis « 🛠️ Qu'est-ce qu'on ajoute ou modifie ? ». Chaque étudiant ne voit que ses propositions, avec le statut et ta réponse.")) + "</p>";
    if (err) return box.innerHTML = h + '<p class="small sgnote">' + esc(err) + '</p><p class="fbtns"><button class="btn sm" type="button" data-sgre>🔄 ' + esc(T("جرّب كمان مرّة", "Réessayer")) + "</button></p>";
    if (!all) return box.innerHTML = h + '<p class="small">⏳ …</p>';
    h += '<div class="sgfil">' + chip("type", "", T("الكل", "Tout"), c.all) + X.TYPES.map(t => chip("type", t.k, t.e + " " + esc(T(t.ar, t.fr)), c[t.k])).join("") + "</div>" +
      '<div class="sgfil">' + chip("status", "", T("كل الحالات", "Tous les statuts")) + Object.keys(X.STATUS).map(s => chip("status", s, X.STATUS[s].e + " " + esc(T(X.STATUS[s].ar, X.STATUS[s].fr)), c[s])).join("") + "</div>";
    const rows = X.filter(all, f);
    h += rows.length ? '<ul class="sglist">' + rows.map(x => '<li class="sgitem" data-sgid="' + esc(x.id) + '"><div class="sgrow">' + X.typeChip(x.type) + X.statusChip(x.status) + '<b class="sgwho" data-nofr dir="auto">👤 ' + esc(x.name || T("طالب", "Étudiant")) + "</b></div>" +
      '<p class="sgtx" data-nofr dir="auto">' + esc(x.text) + "</p>" +
      '<p class="small sgmeta">' + esc(X.when(x.at)) + (x.subj ? " · " + esc(X.areaName(x.subj)) : "") + "</p>" +
      '<div class="sgst" role="group" aria-label="' + esc(T("الحالة", "Statut")) + '">' + Object.keys(X.STATUS).map(s => '<button type="button" class="chip sm' + (x.status === s ? " on" : "") + '" data-sgset="' + s + '" aria-pressed="' + (x.status === s) + '">' + X.STATUS[s].e + " " + esc(T(X.STATUS[s].ar, X.STATUS[s].fr)) + "</button>").join("") + "</div>" +
      '<textarea class="sgin sgrep" rows="2" maxlength="' + X.MAX + '" placeholder="' + esc(T("ردّك عالطالب (بيشوفو تحت اقتراحو)…", "Ta réponse (l'étudiant la voit sous sa proposition)…")) + '">' + esc(x.reply) + "</textarea>" +
      '<p class="fbtns"><button class="btn sm pri" type="button" data-sgreply>💬 ' + esc(T("احفظ الرد", "Enregistrer la réponse")) + '</button> <button class="btn sm" type="button" data-sgdel>🗑️ ' + esc(T("امحي", "Supprimer")) + '</button></p><p class="small sgimsg" aria-live="polite"></p></li>').join("") + "</ul>"
      : '<p class="small sgempty">' + esc(all.length ? T("ما في شي بهالفلتر.", "Rien avec ce filtre.") : T("لسّا ما في اقتراحات. أوّل ما يبعت حدا بيبيّن هون.", "Aucune proposition pour l'instant.")) + "</p>";
    box.innerHTML = h;
  }
  async function load() {
    err = "";
    try {
      let s;
      try { s = await getDocs(query(collection(API.db, X.COLL), orderBy("at", "desc"), limit(300))); }
      catch (e) { if (X.denied(e)) throw e; s = await getDocs(collection(API.db, X.COLL)); }
      const out = []; s.forEach(d => { const c = X.clean(d.id, d.data()); if (c) out.push(c); });
      all = X.sortNew(out);
    } catch (e) { all = null; err = X.denied(e) ? X.rulesMsg(true) : T("⚠️ ما قدرنا نجيب الاقتراحات هلّق.", "⚠️ Impossible de charger les propositions."); }
    draw();
  }
  box.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-sgre")) { box.innerHTML = '<p class="small">⏳ …</p>'; return load(); }
    if (t.dataset.sgf) { f[t.dataset.sgf] = t.dataset.v; return draw(); }
    const li = t.closest("[data-sgid]"); if (!li) return;
    const id = li.dataset.sgid, x = (all || []).find(r => r.id === id); if (!x) return;
    const say = s => { const m = li.querySelector(".sgimsg"); if (m) m.textContent = s; };
    const ref = doc(API.db, X.COLL, id), fail = e2 => say(X.denied(e2) ? X.rulesMsg(true) : T("⚠️ ما زبط، جرّب كمان مرّة.", "⚠️ Échec, réessaie."));
    try {
      if (t.dataset.sgset) { if (x.status === t.dataset.sgset) return; await updateDoc(ref, { status: t.dataset.sgset }); x.status = t.dataset.sgset; draw(); return; }
      if (t.hasAttribute("data-sgreply")) {
        const r = Array.from(li.querySelector(".sgrep").value.trim()).slice(0, X.MAX).join("");
        const ch = { reply: r, rAt: serverTimestamp() }; if (r && x.status === "new") ch.status = "doing";
        t.disabled = true; await updateDoc(ref, ch); x.reply = r; x.rAt = Date.now(); if (ch.status) x.status = ch.status; draw();
        const li2 = box.querySelector('[data-sgid="' + CSS.escape(id) + '"] .sgimsg'); if (li2) li2.textContent = r ? T("✅ انحفظ الرد. الطالب بيشوفو هلّق.", "✅ Réponse enregistrée.") : T("✅ انمحى الرد.", "✅ Réponse effacée.");
        return;
      }
      if (t.hasAttribute("data-sgdel")) { if (!confirm(T("تمحي هالاقتراح؟", "Supprimer cette proposition ?"))) return; await deleteDoc(ref); all = all.filter(r => r.id !== id); draw(); }
    } catch (e2) { t.disabled = false; fail(e2); }
  });
  el.insertBefore(box, el.firstChild);
  load();
}

/* 📌 «زيد وظيفة» (Abdullah, Oct 31 2026 11:57 PM: «ذكّر الطلاب ضمن المسار بوظيفة المس / الـ devoir»): the admin adds a homework
   (what, subject, due date, optional note) → homework/{id} {title, subj, due, note, at, by}; every signed-in student sees a «📌 وظيفة»
   step in «مسار اليوم» until the due date passes (assets/homework.js + assets/home.js). List + delete here. Needs rules v20 (a refused
   save / read says so here; the students' path just shows nothing until then). */
function hwAdmin(API, el) {
  const { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } = API.fs, esc = API.esc || (s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  const L = window.NursinLessons, S = (L && L.subjects) || {};
  const box = document.createElement("div"); box.className = "qcard hwadm"; box.id = "hwadm";
  const td = (() => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } })();
  const opts = '<option value="">— ' + "كل المواد" + " —</option>" + Object.keys(S).map(k => '<option value="' + esc(k) + '">' + esc((S[k].e ? S[k].e + " " : "") + (S[k].ar || k)) + "</option>").join("");
  box.innerHTML = '<h2>📌 زيد وظيفة</h2><p class="small">بتطلع خطوة «📌 وظيفة» بمسار اليوم عند كل الطلاب لحدّ يوم التسليم، وكل طالب بيعلّم «سلّمتها ✅» لحالو.</p>' +
    '<label class="fl">شو الوظيفة؟ <input id="hwt" type="text" maxlength="120" placeholder="مثلاً: devoir Med-Surg — حالة مريض صفحة 12"></label>' +
    '<label class="fl">المادة <select id="hws">' + opts + "</select></label>" +
    '<label class="fl">يوم التسليم <input id="hwd" type="date" min="' + td + '"></label>' +
    '<label class="fl">ملاحظة (اختياري) <textarea id="hwn" rows="2" maxlength="300" placeholder="مثلاً: بخط اليد، ورقة A4"></textarea></label>' +
    '<p class="fbtns"><button class="btn pri" id="hwadd" type="button">📌 زيد الوظيفة</button></p><p class="small" id="hwmsg" aria-live="polite"></p><h3>الوظايف</h3><ul class="hwlist" id="hwlist"><li class="small">⏳ …</li></ul>';
  const $ = id => box.querySelector("#" + id), msg = t => { $("hwmsg").textContent = t; };
  const denied = e => e && e.code === "permission-denied";
  async function list() {
    const ul = $("hwlist");
    try {
      const s = await getDocs(collection(API.db, "homework")), rows = [];
      s.forEach(d => { const x = d.data() || {}; rows.push({ id: d.id, title: String(x.title || ""), subj: String(x.subj || ""), due: String(x.due || ""), note: String(x.note || "") }); });
      rows.sort((a, b) => (a.due < b.due ? 1 : a.due > b.due ? -1 : 0));
      ul.innerHTML = rows.length ? rows.map(r => '<li class="' + (r.due < td ? "past" : "") + '"><b>' + esc(r.title) + "</b><small> · " + esc(r.subj ? ((S[r.subj] || {}).ar || r.subj) : "كل المواد") + " · التسليم " + esc(r.due.split("-").reverse().slice(0, 2).map(Number).join("/")) + (r.due < td ? " (خلص)" : "") + (r.note ? " · " + esc(r.note) : "") + '</small> <button class="btn sm" type="button" data-hwdel="' + esc(r.id) + '">🗑️ امحي</button></li>').join("") : '<li class="small">ما في وظايف لهلّق.</li>';
    } catch (e) { ul.innerHTML = '<li class="small">' + (denied(e) ? "⏳ لازم تنشر قواعد Firestore v20 أوّل (الملف يلي بعتلك ياه)، وبعدين بتبيّن الوظايف هون." : "⚠️ ما قدرنا نجيب الوظايف.") + "</li>"; }
  }
  $("hwadd").addEventListener("click", async () => {
    const title = $("hwt").value.trim(), subj = $("hws").value, due = $("hwd").value, note = $("hwn").value.trim();
    if (!title) return msg("اكتب شو الوظيفة أوّل.");
    if (!/^\d{4}-\d\d-\d\d$/.test(due)) return msg("اختار يوم التسليم.");
    if (due < td) return msg("يوم التسليم لازم يكون اليوم أو بعدو.");
    msg("⏳ …"); $("hwadd").disabled = true;
    try {
      const id = "hw" + Date.now().toString(36);
      await setDoc(doc(API.db, "homework", id), { title: title.slice(0, 120), subj: subj.slice(0, 20), due, note: note.slice(0, 300), at: serverTimestamp(), by: API.user.uid });
      $("hwt").value = ""; $("hwn").value = ""; msg("✅ انضافت. الطلاب بيشوفوها بمسار اليوم."); list();
      if (window.NursinHW) window.NursinHW.fetch();
    } catch (e) { msg(denied(e) ? "⏳ لازم تنشر قواعد Firestore v20 أوّل (الملف يلي بعتلك ياه)، وبعدين بيزبط الحفظ." : "⚠️ ما انحفظت، جرّب كمان مرّة."); }
    $("hwadd").disabled = false;
  });
  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-hwdel]"); if (!b) return;
    if (!confirm("تمحي هالوظيفة؟")) return;
    try { await deleteDoc(doc(API.db, "homework", b.dataset.hwdel)); msg("🗑️ انمحت."); list(); if (window.NursinHW) window.NursinHW.fetch(); } catch (x) { msg(denied(x) ? "⏳ لازم تنشر قواعد v20 أوّل." : "⚠️ ما انمحت."); }
  });
  const first = el.querySelector(".qcard"); if (first && first.nextSibling) el.insertBefore(box, first.nextSibling); else el.appendChild(box);
  list();
}

/* 📌 «دروس هالأسبوع» (Abdullah, Oct 27 3:35 PM): per subject, which lessons count this week. The students' daily lesson goals
   spread exactly these (unread small parts) over the days before each subject's class day (assets/lessons.js plan). Saved to
   config/weekLessons {subj:{s:[lesson keys]}, at, by} — public read, only the admin writes (rules v11; until he publishes them the
   save is refused and this card says so). Nothing ticked for a subject = no lesson goal for it. */
function weekPicker(API, el) {
  const L = window.NursinLessons; if (!L || !L.CLASSDAY) return;
  const { doc, getDoc, setDoc, serverTimestamp } = API.fs, ref = doc(API.db, "config", "weekLessons"), esc = API.esc;
  const box = document.createElement("div"); box.className = "qcard wkpick"; box.id = "wkpick";
  const subs = Object.keys(L.CLASSDAY), units = [];
  subs.forEach(s => { const g = L.groupOf ? L.groupOf(s) : s, G = g !== s && L.groups ? L.groups[g] : null, u = G && units.find(x => x.k === g); if (u) u.subs.push(s); else units.push({ k: G ? g : s, g: G, subs: [s] }); });
  const draw = cur => {
    box.innerHTML = '<h2>📌 دروس هالأسبوع</h2><p class="small">علّم الدروس يلي لازم يكونو الطلاب خالصينها قبل حصّة كل مادة. «درس اليوم» عندن بيوزّع الأجزاء غير المقروءة بالتساوي على أيام الدرس، وأيام الصف (خميس، جمعة، سبت) أخفّ. مادة ما فيها شي معلّم = ما في شي إلها بدرس اليوم.</p><p class="small wkwin">🗓️ مواد الخميس: سبت→أربعا • الجمعة: أحد→خميس • السبت: أحد→جمعة</p>' +
      // 🏥 Oct 30: القلب / الأعصاب / Henderson / التسريب sit under ONE «Med-Surg» box (NursinLessons.groupOf); each tick still saves
      // under its own subject key, so config/weekLessons keeps the same shape.
      units.map(u => { const G = u.g, ss = u.subs, nOn = ss.reduce((a, s) => a + (cur[s] || []).length, 0), nAll = ss.reduce((a, s) => a + L.list.filter(x => x.s === s).length, 0), dn = L.classDayOf(ss[0]);
        return '<details class="wks"' + (nOn ? " open" : "") + '><summary><b>' + esc(G ? G.e + " " + G.ar : (L.subjects[ss[0]] || {}).ar || ss[0]) + "</b> <small>· حصّة " + dn[0] + " · " + nOn + "/" + nAll + "</small></summary>" + ss.map(s => { const S = L.subjects[s] || {}, ls = L.list.filter(x => x.s === s);
          return (G ? '<p class="small"><b>' + esc((S.e ? S.e + " " : "") + (S.ar || s)) + "</b></p>" : "") + "<ul class=\"cpick\">" +
          ls.map(x => { const k = L.base(x), n = L.parts.filter(p => L.base(p) === k).length; return '<li><label><input type="checkbox" data-s="' + esc(s) + '" value="' + esc(k) + '"' + ((cur[s] || []).includes(k) ? " checked" : "") + "> <bdi>" + esc(x.n) + "</bdi>" + (n > 1 ? " <small>(" + n + " أجزاء)</small>" : "") + "</label></li>"; }).join("") + "</ul>"; }).join("") + "</details>"; }).join("") +
      '<p class="fbtns"><button class="btn pri" id="wksave" type="button">💾 احفظ دروس هالأسبوع</button></p><p class="small" id="wkmsg" aria-live="polite"></p>';
    box.querySelector("#wksave").addEventListener("click", async () => {
      const subj = {}; box.querySelectorAll("input[type=checkbox]:checked").forEach(i => { (subj[i.dataset.s] = subj[i.dataset.s] || []).push(i.value); });
      const m = box.querySelector("#wkmsg"); m.textContent = "⏳ …";
      try { await setDoc(ref, { subj, at: serverTimestamp(), by: API.user.uid }); L.weekLes(subj); document.dispatchEvent(new CustomEvent("nursin:weekles")); m.textContent = "✅ انحفظ. الطلاب بيشوفوها بأهدافن بأوّل مرّة بيفتحو الموقع."; draw(subj); box.querySelector("#wkmsg").textContent = "✅ انحفظ. الطلاب بيشوفوها بأهدافن بأوّل مرّة بيفتحو الموقع."; }
      catch (e) { m.textContent = e && e.code === "permission-denied" ? "⏳ لازم تنشر قواعد Firestore v11 أوّل (الملف يلي بعتلك ياه)، وبعدين بيزبط الحفظ." : "⚠️ ما انحفظ، جرّب كمان مرّة."; }
    });
  };
  el.appendChild(box); draw(L.weekLes());
  getDoc(ref).then(s => { if (s.exists()) { const v = s.data().subj || {}; L.weekLes(v); draw(L.weekLes()); } }, () => {});
}

/* 🔔 «مين مفعّل الإشعارات» (Abdullah, Oct 27 5:20 PM): which students turned phone notifications on.
   users/ (signed-in read, rules v1+) × pushSubs/{uid}.d (only the admin may list it, rules v9); a doc with ≥1 device = on.
   pushRows is pure (tested): enabled first, then by name; a subscriber with no profile still shows. */
export function pushRows(users, docs) {
  const rows = [], seen = {};
  for (const x of users || []) { if (!x || !x.id || seen[x.id]) continue; seen[x.id] = 1; const d = (docs || {})[x.id] || {}; const n = Object.keys(d).filter(k => typeof d[k] === "string").length; rows.push({ id: x.id, name: String(x.name || "").trim() || "؟", code: x.code || "", n, on: n > 0 }); }
  for (const id of Object.keys(docs || {})) { if (seen[id]) continue; const d = docs[id] || {}; const n = Object.keys(d).filter(k => typeof d[k] === "string").length; if (n) rows.push({ id, name: "؟", code: "", n, on: true }); }
  rows.sort((p, q) => (q.on - p.on) || p.name.localeCompare(q.name, "ar"));
  return { rows, on: rows.filter(r => r.on).length, total: rows.length };
}
export const devTxt = n => n === 1 ? "(جهاز واحد)" : n === 2 ? "(جهازين)" : "(" + n + " أجهزة)";
async function pushWho(API, el, loadSubs) {
  const { collection, getDocs, query, limit } = API.fs, esc = API.esc || (s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";"));
  const box = document.createElement("div"); box.className = "qcard pwho"; box.id = "pwho";
  box.innerHTML = '<h2>🔔 مين مفعّل الإشعارات</h2><p id="pwsum" class="fbig">⏳ …</p>' +
    '<p class="fbtns pwf"><button class="btn pri" type="button" data-f="all">الكل</button> <button class="btn" type="button" data-f="on">✅ مفعّل</button> <button class="btn" type="button" data-f="off">❌ مش مفعّل</button></p>' +
    '<input id="pwq" class="atext ain" type="search" placeholder="🔍 دوّر على اسم…" aria-label="دوّر على اسم"><ul id="pwl" class="cmemb pwl"></ul>';
  const cards = el.querySelectorAll(":scope > .qcard"); if (cards.length > 1) cards[1].after(box); else el.appendChild(box);
  const $ = s => box.querySelector(s); let all = { rows: [] }, f = "all";
  const draw = () => {
    const q = $("#pwq").value.trim().toLowerCase();
    const list = all.rows.filter(r => (f === "all" || (f === "on") === r.on) && (!q || r.name.toLowerCase().includes(q) || String(r.code).toLowerCase().includes(q)));
    $("#pwl").innerHTML = list.length ? list.map(r => '<li><bdi>' + esc(r.name) + '</bdi>' + (r.code ? ' <small dir="ltr">' + esc(r.code) + '</small>' : "") + ' — <span class="' + (r.on ? "pwon" : "pwoff") + '">' + (r.on ? "✅ مفعّل " + devTxt(r.n) : "❌ مش مفعّل") + '</span></li>').join("") : '<li class="small">ما في حدا.</li>';
  };
  box.querySelectorAll(".pwf button").forEach(b => b.addEventListener("click", () => { f = b.dataset.f; box.querySelectorAll(".pwf button").forEach(x => x.classList.toggle("pri", x === b)); draw(); }));
  $("#pwq").addEventListener("input", draw);
  try {
    const [us, subs] = await Promise.all([getDocs(query(collection(API.db, "users"), limit(2000))), loadSubs()]);
    const users = []; us.forEach(d => { const v = d.data() || {}; users.push({ id: d.id, name: v.name, code: v.friendCode }); });
    all = pushRows(users, subs.docs);
    $("#pwsum").textContent = "✅ " + all.on + " من " + all.total + " مفعّلين";
    draw();
  } catch (e) { $("#pwsum").textContent = e && e.code === "permission-denied" ? "⚠️ ما قدرنا نقرا اللائحة (قوانين Firestore)." : "⚠️ ما زبط، اعمل refresh وجرّب كمان مرّة."; }
}
