// nursin 📢 admin: only the site owner (verified Google email) can post or clear the announcement everyone sees,
// and send a 🔔 phone notification to every device that turned notifications on (worker /broadcast; rules v9 let only him list pushSubs).
// Loaded by fb.js on admin.html.
const OWNER = "abdullahjaber1452003@gmail.com";
const WORKER = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev", CHUNK = 25;
const PAGES = [["/", "🏠 الرئيسية"], ["/cardio.html", "❤️ القلب"], ["/neuro.html", "🧠 الأعصاب"], ["/3d.html", "🧊 المجسّمات 3D"], ["/quiz.html", "📝 الكويز"], ["/henderson.html", "📋 Henderson"], ["/law.html", "⚖️ القانون"], ["/mgmt.html", "🏢 الإدارة"], ["/quality.html", "✅ الجودة والاعتماد"], ["/pharma.html", "💊 الأدوية"], ["/exams.html", "📅 الامتحانات"], ["/classes.html", "🏫 الصفوف"], ["/tutor.html", "🧑‍🏫 الأستاذ المساعد"], ["/chat.html", "💬 المحادثات"]];
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
  $("adel").addEventListener("click", async () => {
    try { await deleteDoc(ref); msg("🗑️ انمحى الإعلان."); show(); window.NursinAnn && window.NursinAnn.refresh(); } catch (e) { err(e); }
  });
  show();
}
