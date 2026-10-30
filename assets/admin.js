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
  if (window.NursinLessons) weekPicker(API, el); else window.addEventListener("load", () => weekPicker(API, el), { once: true });
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
