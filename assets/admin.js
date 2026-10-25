// nursin 📢 admin: only the site owner (verified Google email) can post or clear the announcement everyone sees. Loaded by fb.js on admin.html.
const OWNER = "abdullahjaber1452003@gmail.com";
export function page(API) {
  const el = document.getElementById("admin-app"); if (!el) return;
  const u = API.user, { doc, getDoc, setDoc, deleteDoc, serverTimestamp } = API.fs;
  if (!(u && u.email === OWNER && u.emailVerified)) {
    el.innerHTML = '<div class="qcard"><p class="fbig">⛔ مش مسموح</p><p>هالصفحة لصاحب الموقع بس.</p><div id="asign"></div></div>';
    if (!u) API.signInCard(document.getElementById("asign"), "<p>إذا إنت صاحب الموقع، سجّل دخول بحسابك.</p>");
    return;
  }
  el.innerHTML = '<div class="qcard"><h2>📢 إعلان للكل</h2><p class="small">بيبين فوق بكل الصفحات لكل مين بيفوت عالموقع، مع نقطة حمرا عالجرس 🔔.</p>' +
    '<textarea id="atext" class="atext" maxlength="500" rows="5" placeholder="اكتب الإعلان هون…"></textarea><p class="small"><span id="acount">0</span>/500</p>' +
    '<p class="fbtns"><button class="btn pri" id="asend" type="button">ابعت للكل</button> <button class="btn" id="adel" type="button">امحي الإعلان</button></p>' +
    '<p id="amsg" class="small" aria-live="polite"></p><p class="small">الإعلان هلّق: <span id="anow">⏳</span></p></div>';
  const ref = doc(API.db, "announcements", "current"), $ = id => document.getElementById(id);
  const t = $("atext"), msg = s => { $("amsg").textContent = s; };
  const err = e => msg(e && e.code === "permission-denied" ? "⚠️ القواعد الجديدة (v6) مش ملصوقة بفايربيس بعد." : "⚠️ ما زبط، جرّب كمان مرّة.");
  const show = async () => { try { const s = await getDoc(ref); $("anow").textContent = s.exists() ? s.data().text : "ما في"; } catch (e) { $("anow").textContent = "—"; } };
  t.addEventListener("input", () => { $("acount").textContent = t.value.length; });
  $("asend").addEventListener("click", async () => {
    const text = t.value.trim(); if (!text) return msg("اكتب شي أوّل.");
    try { await setDoc(ref, { text, createdAt: serverTimestamp(), by: u.email }); msg("✅ انبعت للكل."); t.value = ""; $("acount").textContent = 0; show(); window.NursinAnn && window.NursinAnn.refresh(); } catch (e) { err(e); }
  });
  $("adel").addEventListener("click", async () => {
    try { await deleteDoc(ref); msg("🗑️ انمحى الإعلان."); show(); window.NursinAnn && window.NursinAnn.refresh(); } catch (e) { err(e); }
  });
  show();
}
