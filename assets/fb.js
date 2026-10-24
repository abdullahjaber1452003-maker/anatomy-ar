// nursin friends + levels — Firebase (Google sign-in + Firestore). Loaded as a module by assets/account.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, limit, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyARPvtXJ_STkWrP8dpZcE9BqwMxEOW1WQs",
  authDomain: "nursin-5aaa0.firebaseapp.com",
  projectId: "nursin-5aaa0",
  storageBucket: "nursin-5aaa0.firebasestorage.app",
  messagingSenderId: "101298859753",
  appId: "1:101298859753:web:71dcfb92154110f38d8a78"
};

const N = window.Nursin;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "ar";
const db = getFirestore(app);
const esc = N.esc;
let user = null, profile = null, ready = false;
const root = document.getElementById("friends-app");

/* ---------- sign in / out ---------- */
async function signIn() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, p);
  } catch (e) {
    const c = e && e.code;
    if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment" || c === "auth/web-storage-unsupported") {
      await signInWithRedirect(auth, p);           // phones that block popups
      return;
    }
    if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return;
    throw e;
  }
}
getRedirectResult(auth).catch(e => { console.warn("nursin: redirect sign-in", e && e.code); showErr(e); });

/* ---------- profile ---------- */
async function claimCode(uid) {
  for (let i = 0; i < 8; i++) {
    const c = N.newCode();
    try { await setDoc(doc(db, "friendCodes", c), { uid }); return c; }   // create-only: a taken code is refused
    catch (e) { if (!e || e.code !== "permission-denied") throw e; }
  }
  throw new Error("no free friend code");
}
async function ensureProfile(u) {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  const d = snap.exists() ? snap.data() : {};
  const code = d.friendCode || await claimCode(u.uid);
  const points = N.addPoints(d.points || 0, 0);
  const prof = { name: N.cleanName(u.displayName), photo: String(u.photoURL || "").slice(0, 500), points, level: N.level(points), friendCode: code };
  if (!snap.exists() || d.name !== prof.name || d.photo !== prof.photo || d.friendCode !== code || d.level !== prof.level || d.points !== points)
    await setDoc(ref, { ...prof, updatedAt: serverTimestamp() });
  profile = { uid: u.uid, ...prof };
  N.setMe(profile);
}

/* ---------- quiz points ---------- */
async function award(q) {
  const ref = doc(db, "users", user.uid);
  return runTransaction(db, async tx => {
    const s = await tx.get(ref);
    const d = s.exists() ? s.data() : {};
    const before = N.addPoints(d.points || 0, 0);
    const points = N.addPoints(before, q.score);
    tx.set(ref, { name: N.cleanName(d.name || profile.name), photo: d.photo || profile.photo || "", points, level: N.level(points), friendCode: d.friendCode || profile.friendCode, updatedAt: serverTimestamp() });
    return { before, points };
  });
}
N.flush = async function () {
  if (!ready) return;
  while (N.queue.length) {
    const q = N.queue.shift(), el = document.getElementById("qpts");
    if (!user) { if (el) el.innerHTML = '🏆 <a href="friends.html">سجّل دخول بغوغل</a> تا تنحسبلك النقاط.'; continue; }
    try {
      const r = await award(q);
      profile.points = r.points; profile.level = N.level(r.points); N.setMe(profile);
      const g = N.progress(r.points), up = N.level(r.points) > N.level(r.before);
      const got = r.points - r.before;
      if (el) el.innerHTML = (got ? "🎉 <b>+" + got + " نقطة!</b> صار معك " + r.points + " نقطة." : "💪 ما في نقاط هالمرّة، معك " + r.points + " نقطة. جرّب كمان!") +
        (up ? '<br>🆙 <b>طلعت عالليفل ' + g.level + '!</b>' : "<br>ليفل " + g.level + " · باقي " + g.left + " نقطة لليفل " + (g.level + 1) + ".") +
        ' <a href="friends.html">ترتيب أصحابي ←</a>';
    } catch (e) {
      console.warn("nursin: points", e && e.code);
      if (el) el.textContent = "⚠️ ما قدرنا نزيد النقاط هلّق (الإنترنت؟). جرّب كويز تاني بعد شوي.";
    }
  }
};

/* ---------- friends ---------- */
async function loadBoard() {
  const fs = await getDocs(query(collection(db, "users", user.uid, "friends"), limit(200)));
  const docs = await Promise.all(fs.docs.map(f => getDoc(doc(db, "users", f.id)).catch(() => null)));
  const list = docs.filter(d => d && d.exists()).map(d => ({ uid: d.id, ...d.data() }));
  list.push({ ...profile, me: true });
  list.sort((a, b) => (b.points | 0) - (a.points | 0) || (a.me ? -1 : b.me ? 1 : 0));
  return list;
}
async function addFriend(raw) {
  const code = N.normCode(raw);
  if (code.length !== 6) throw { ar: "الكود لازم يكون ٦ أحرف وأرقام." };
  if (code === profile.friendCode) throw { ar: "هيدا كودك إنت 😅 حط كود صاحبك." };
  const c = await getDoc(doc(db, "friendCodes", code));
  if (!c.exists()) throw { ar: "ما لقينا حدا بهالكود. تأكّد منو وجرّب مرّة تانية." };
  const fid = c.data().uid;
  if (fid === user.uid) throw { ar: "هيدا كودك إنت 😅" };
  const f = await getDoc(doc(db, "users", fid));
  await setDoc(doc(db, "users", user.uid, "friends", fid), { since: serverTimestamp() });
  return f.exists() ? f.data().name : "";
}

/* ---------- friends.html UI ---------- */
const G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
const params = new URLSearchParams(location.search);
let pendingAdd = N.normCode(params.get("add") || "");

function showErr(e) {
  if (!root || !e) return;
  const c = e.code || "";
  let m = "⚠️ صار في مشكلة بتسجيل الدخول. جرّب مرّة تانية.";
  if (c === "auth/unauthorized-domain") m = "⚠️ تسجيل الدخول مش مفعّل لهالموقع بعد.";
  else if (c === "auth/network-request-failed") m = "⚠️ في مشكلة بالإنترنت. تأكّد من الاتصال وجرّب كمان مرّة.";
  else if (c === "auth/web-storage-unsupported" || c === "auth/operation-not-supported-in-this-environment") m = "⚠️ هالمتصفّح ما بيقبل تسجيل الدخول. افتح nursin.store بـ Chrome أو Safari.";
  let el = document.getElementById("ferr");
  if (!el) { el = document.createElement("p"); el.id = "ferr"; el.className = "ferr"; root.prepend(el); }
  el.textContent = m;
}

function renderOut() {
  root.innerHTML =
    '<div class="qcard fcard fout">' +
    '<p class="fbig">🏆 جمّع نقاط من الكويز، اطلع بالليفل، وتسابق مع رفقاتك.</p>' +
    '<ul class="fsteps"><li>✅ كل جواب صح = <b>١٠ نقاط</b></li><li>🆙 النقاط بتطلّعك بالليفل: ليفل 2 بـ 50 نقطة، ليفل 3 بـ 200، ليفل 4 بـ 450…</li><li>🤝 زيد أصحابك بالكود وشوفوا مين قدّام</li></ul>' +
    (pendingAdd ? '<p class="finv">👋 صاحبك بعتلك كودو <b dir="ltr">' + esc(pendingAdd) + '</b>. سجّل دخول وبينضاف لأصحابك.</p>' : "") +
    '<button class="gbtn" id="gsign" type="button">' + G + "<span>تسجيل الدخول بغوغل</span></button>" +
    '<p class="small">ما في داعي تسجّل لتستعمل الموقع، الدروس والكويز شغّالين متل ما هنّي. بس بتسجّل، منحفظ اسمك وصورتك ونقاطك تا يشوفوك أصحابك (<a href="privacy.html">الخصوصية</a>).</p>' +
    "</div>";
  const b = document.getElementById("gsign");
  b.addEventListener("click", async () => {
    b.disabled = true;
    try { await signIn(); } catch (e) { console.warn("nursin: sign-in", e && e.code); showErr(e); }
    finally { b.disabled = false; }
  });
}

function rowHtml(p, i) {
  const medal = ["🥇", "🥈", "🥉"][i] || String(i + 1);
  return '<li class="lbr' + (p.me ? " me" : "") + '"><span class="rk">' + medal + "</span>" + N.avatar(p.photo, p.name, "av") +
    '<span class="nm"><b>' + esc(N.cleanName(p.name)) + (p.me ? " <small>(إنت)</small>" : "") + '</b><small>' + (p.points | 0) + " نقطة</small></span>" +
    '<span class="lvc">Lv ' + N.level(p.points) + "</span>" +
    (p.me ? "" : '<button class="rm" type="button" data-uid="' + esc(p.uid) + '" aria-label="شيل ' + esc(N.cleanName(p.name)) + ' من أصحابي">✕</button>') + "</li>";
}

async function renderIn() {
  const g = N.progress(profile.points);
  const share = "زيدني صاحب على nursin 🏆 وخلّينا نتسابق بالكويز! كودي: " + profile.friendCode + "\nhttps://nursin.store/friends.html?add=" + profile.friendCode;
  root.innerHTML =
    '<div class="qcard fme">' + N.avatar(profile.photo, profile.name, "av avl") +
    '<div class="fmei"><b>' + esc(profile.name) + '</b><span class="lvc big">Lv ' + g.level + "</span>" +
    '<div class="prog"><i style="width:' + g.pct + '%"></i></div>' +
    '<p class="small">' + g.points + " نقطة · باقي <b>" + g.left + "</b> نقطة لليفل " + (g.level + 1) + '</p></div></div>' +
    '<div class="qcard"><h2>🔑 كود الصداقة تبعك</h2><p class="fcode" dir="ltr">' + esc(profile.friendCode) + "</p>" +
    '<p class="fbtns"><button class="btn" id="fcopy" type="button">📋 نسخ الكود</button> <a class="btn wa" id="fwa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">🟢 ابعتو عالواتساب</a></p></div>' +
    '<div class="qcard"><h2>➕ زيد صاحب</h2><form id="fadd" class="fadd" autocomplete="off"><input id="fcodein" dir="ltr" maxlength="7" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="مثلاً K7Q2MX" aria-label="كود صاحبك"><button class="btn pri" type="submit">زيد</button></form><p id="faddmsg" class="small" aria-live="polite"></p></div>' +
    '<div class="qcard"><h2>🏅 ترتيب أصحابي</h2><ol id="fboard" class="lb"><li class="small">⏳ …</li></ol></div>' +
    '<p class="fout2"><a class="quizlink" href="quiz.html">📝 اعمل كويز وجمّع نقاط</a> <button class="btn" id="fout" type="button">تسجيل الخروج</button></p>';
  document.getElementById("fcopy").addEventListener("click", async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(profile.friendCode); } catch (x) {
      const t = document.createElement("textarea"); t.value = profile.friendCode; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (y) {} t.remove();
    }
    b.textContent = "✅ انتسخ"; setTimeout(() => { b.textContent = "📋 نسخ الكود"; }, 1800);
  });
  document.getElementById("fout").addEventListener("click", () => signOut(auth));
  const inp = document.getElementById("fcodein"), msg = document.getElementById("faddmsg");
  inp.addEventListener("input", () => { const v = N.normCode(inp.value); if (v !== inp.value) inp.value = v; });
  const doAdd = async code => {
    msg.textContent = "⏳ …";
    try { const name = await addFriend(code); inp.value = ""; msg.textContent = "✅ " + (name ? N.cleanName(name) + " صار" : "صار") + " من أصحابك. خلّيه يزيد كودك كمان تا يشوفك عندو."; await drawBoard(); }
    catch (e) { if (!e.ar) console.warn("nursin: add friend", e && e.code); msg.textContent = "⚠️ " + (e.ar || "ما زبط هلّق، جرّب بعد شوي."); }
  };
  document.getElementById("fadd").addEventListener("submit", e => { e.preventDefault(); doAdd(inp.value); });
  document.getElementById("fboard").addEventListener("click", async e => {
    const b = e.target.closest(".rm"); if (!b) return;
    if (!confirm("أكيد بدّك تشيلو من أصحابك؟")) return;
    try { await deleteDoc(doc(db, "users", user.uid, "friends", b.dataset.uid)); await drawBoard(); } catch (x) { console.warn("nursin: remove friend", x && x.code); }
  });
  await drawBoard();
  if (pendingAdd) {
    const c = pendingAdd; pendingAdd = "";
    history.replaceState(null, "", location.pathname);
    if (c !== profile.friendCode) { inp.value = c; await doAdd(c); }
  }
}
async function drawBoard() {
  const ol = document.getElementById("fboard"); if (!ol) return;
  try {
    const list = await loadBoard();
    ol.innerHTML = list.map(rowHtml).join("") + (list.length < 2 ? '<li class="small fempty">لسّا ما زدت حدا. ابعت كودك لرفقاتك 👆 أو زيد كودن.</li>' : "");
  } catch (e) { console.warn("nursin: board", e && e.code); ol.innerHTML = '<li class="small">⚠️ ما قدرنا نجيب الترتيب هلّق. جرّب بعد شوي.</li>'; }
}

/* ---------- wiring ---------- */
onAuthStateChanged(auth, async u => {
  user = u;
  if (!u) {
    profile = null; N.setMe(null); ready = true;
    if (root) renderOut();
    N.flush();
    return;
  }
  try {
    await ensureProfile(u);
  } catch (e) {
    console.warn("nursin: profile", e && e.code);
    profile = { uid: u.uid, name: N.cleanName(u.displayName), photo: u.photoURL || "", points: (N.me && N.me.points) | 0, friendCode: "" };
    if (root) { root.innerHTML = '<div class="qcard"><p>⚠️ ما قدرنا نجيب حسابك هلّق. تأكّد من الإنترنت وجرّب بعد شوي.</p><button class="btn" id="fout" type="button">تسجيل الخروج</button></div>'; document.getElementById("fout").addEventListener("click", () => signOut(auth)); }
    ready = true; return;
  }
  ready = true;
  if (root) await renderIn();
  N.flush();
});
