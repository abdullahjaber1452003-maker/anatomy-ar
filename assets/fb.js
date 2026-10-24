// nursin friends + levels — Firebase (Google sign-in + Firestore). Loaded as a module by assets/account.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, collection, getDocs, query, where, limit, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

/* ---------- quiz points: +10 per right answer, −5 per wrong, never below 0 ---------- */
function profileWrite(d, points) {
  return { name: N.cleanName(d.name || profile.name), photo: d.photo || profile.photo || "", points, level: N.level(points), friendCode: d.friendCode || profile.friendCode, updatedAt: serverTimestamp() };
}
async function award(q) {
  const ref = doc(db, "users", user.uid);
  return runTransaction(db, async tx => {
    const s = await tx.get(ref);
    const d = s.exists() ? s.data() : {};
    const before = N.addPoints(d.points || 0, 0, 0);
    const points = N.addPoints(before, q.score, q.wrong);
    tx.set(ref, profileWrite(d, points));
    return { before, points };
  });
}

/* ---------- challenges «تحدّي» ---------- */
// challenges/{id} = {from, to, fromName, toName, seed, qids[10], fromScore, toScore, fromBonus, toBonus, createdAt}
const roleOf = c => (c.from === user.uid ? "from" : "to");
const other = r => (r === "from" ? "to" : "from");
// Save my score once (if given) and, when both have played and I won, add my +20 bonus once.
async function settleChallenge(id, myScore) {
  const cref = doc(db, "challenges", id), uref = doc(db, "users", user.uid);
  return runTransaction(db, async tx => {
    const cs = await tx.get(cref);
    if (!cs.exists()) throw { ar: "هالتحدّي مش موجود." };
    const c = cs.data(), me = roleOf(c), op = other(me);
    const us = await tx.get(uref);
    const ud = us.exists() ? us.data() : {};
    const upd = {};
    let saved = false;
    let mine = c[me + "Score"];
    if (myScore != null && mine == null) { mine = upd[me + "Score"] = myScore; saved = true; }
    const theirs = c[op + "Score"];
    const w = N.winner(me === "from" ? mine : theirs, me === "from" ? theirs : mine);
    let bonus = 0, points = N.addPoints(ud.points || 0, 0, 0);
    if (w === me && !c[me + "Bonus"]) { upd[me + "Bonus"] = true; bonus = 20; points = N.addPoints(points + 20, 0, 0); tx.set(uref, profileWrite(ud, points)); }
    if (Object.keys(upd).length) tx.update(cref, upd);
    return { c: { ...c, ...upd, id }, me, saved, mine, theirs, w, bonus, points };
  });
}
function chalShare(id, fromName) {
  return "https://wa.me/?text=" + encodeURIComponent("⚔️ تحدّيتك على nursin! ١٠ أسئلة تمريض، شوف إذا بتغلبني 😏\nhttps://nursin.store/quiz.html?challenge=" + id);
}
function resultLine(r, names) {
  const oname = "<bdi>" + esc(N.cleanName(names)) + "</bdi>";
  if (r.w == null) return "⏳ ناطرين <b>" + oname + "</b> يلعب" + (r.mine != null ? " (إنت جبت " + r.mine + "/10)" : "");
  const score = '<span class="chsc" dir="ltr">' + r.mine + " – " + r.theirs + "</span>";
  if (r.w === "tie") return "🤝 تعادل " + score + " مع <b>" + oname + "</b>";
  if (r.w === r.me) return "🏆 <b>ربحت</b> " + score + " على <b>" + oname + "</b>" + (r.bonus ? " · <b><bdi dir=\"ltr\">+20</bdi> نقطة بونص</b> 🎉" : "");
  return "😅 خسرت " + score + " قدّام <b>" + oname + "</b>. المرّة الجاية!";
}
async function openChallengeOnQuiz(id) {
  const Q = window.NursinQuiz; if (!Q) return;
  try {
    const s = await getDoc(doc(db, "challenges", id));
    if (!s.exists()) return Q.message("⚠️ ما لقينا هالتحدّي. يمكن الرابط ناقص.");
    const c = s.data(), me = roleOf(c), op = other(me);
    if (c[me + "Score"] != null) {
      const r = await settleChallenge(id, null);
      profileFromPoints(r.points);
      return Q.message('<p class="qq">⚔️ لعبت هالتحدّي من قبل.</p><p>' + resultLine(r, c[op + "Name"]) + '</p><p><a class="btn pri" href="friends.html">⚔️ تحدّياتي</a></p>');
    }
    Q.startChallenge({ id, qids: c.qids, label: "⚔️ تحدّي " + (me === "from" ? "لـ " + N.cleanName(c.toName) : "من " + N.cleanName(c.fromName)) });
  } catch (e) {
    console.warn("nursin: challenge", e && e.code);
    Q.message(e && e.code === "permission-denied" ? "⚠️ هالتحدّي مش إلك. اطلب من صاحبك يتحدّاك من صفحة أصحابي." : "⚠️ ما قدرنا نحمّل التحدّي هلّق. جرّب كمان شوي.");
  }
}
function profileFromPoints(p) { if (profile && p != null) { profile.points = p; profile.level = N.level(p); N.setMe(profile); } }

N.flush = async function () {
  if (!ready) return;
  while (N.queue.length) {
    const q = N.queue.shift(), el = document.getElementById("qpts");
    if (!user) { if (el) el.innerHTML = '🏆 <a href="friends.html">سجّل دخول بغوغل</a> تا تنحسبلك النقاط.'; continue; }
    let html = "";
    try {
      const r = await award(q);
      profileFromPoints(r.points);
      const g = N.progress(r.points), up = N.level(r.points) > N.level(r.before), net = r.points - r.before;
      html = '<span class="qnet">✅ ' + q.score + " صح <b>+" + q.score * 10 + "</b> · ❌ " + q.wrong + ' غلط <b dir="ltr">−' + q.wrong * 5 + "</b> = <b class=\"" + (net < 0 ? "neg" : "pos") + '" dir="ltr">' + (net > 0 ? "+" : net < 0 ? "−" : "") + Math.abs(net) + "</b> نقطة</span>" +
        (r.points === 0 && net === 0 && q.wrong ? ' <small>(النقاط ما بتنزل تحت الصفر)</small>' : "") + "<br>صار معك <b>" + r.points + "</b> نقطة · " + (up ? "🆙 <b>طلعت عالليفل " + g.level + "!</b>" : "ليفل " + g.level + " · باقي " + g.left + " لليفل " + (g.level + 1));
    } catch (e) {
      console.warn("nursin: points", e && e.code);
      html = "⚠️ ما قدرنا نزيد النقاط هلّق (الإنترنت؟). جرّب كويز تاني بعد شوي.";
    }
    if (q.challenge) {
      try {
        const r = await settleChallenge(q.challenge, q.score);
        profileFromPoints(r.points);
        const oname = r.c[other(r.me) + "Name"];
        html += '<span class="qch">' + (r.saved || r.w ? resultLine(r, oname) : "⚔️ هالتحدّي كنت لعبتو من قبل، نتيجتك الأولى هيي المحسوبة.") +
          (r.w == null && r.me === "from" ? '<br><a class="btn wa" target="_blank" rel="noopener" href="' + chalShare(r.c.id) + '">🟢 قلّو عالواتساب</a>' : "") + "</span>";
      } catch (e) { console.warn("nursin: challenge score", e && e.code); html += '<span class="qch">⚠️ ما قدرنا نسجّل نتيجة التحدّي. جرّب تفتح صفحة أصحابي.</span>'; }
    }
    if (el) el.innerHTML = html + ' <a href="friends.html">ترتيب أصحابي ←</a>';
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
    '<ul class="fsteps"><li>✅ كل جواب صح = <b>١٠ نقاط</b></li><li>🆙 النقاط بتطلّعك بالليفل: ليفل 2 بـ 50 نقطة، ليفل 3 بـ 200، ليفل 4 بـ 450…</li><li>❌ كل جواب غلط = <b>−٥</b> (النقاط ما بتنزل تحت الصفر)</li><li>🤝 زيد أصحابك بالكود وشوفوا مين قدّام، وتحدّوا بعض ⚔️</li></ul>' +
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
    '<span class="nm"><b><bdi>' + esc(N.cleanName(p.name)) + "</bdi>" + (p.me ? " <small>(إنت)</small>" : "") + '</b><small><span class="lvc">Lv ' + N.level(p.points) + "</span> " + (p.points | 0) + " نقطة</small></span>" +
    (p.me ? "" : '<button class="btn chal" type="button" data-uid="' + esc(p.uid) + '">⚔️ تحدّى</button><button class="rm" type="button" data-uid="' + esc(p.uid) + '" aria-label="شيل ' + esc(N.cleanName(p.name)) + ' من أصحابي">✕</button>') + "</li>";
}

function drawMe() {
  const el = document.getElementById("fmecard"); if (!el) return;
  const g = N.progress(profile.points);
  el.innerHTML = N.avatar(profile.photo, profile.name, "av avl") +
    '<div class="fmei"><b><bdi>' + esc(profile.name) + '</bdi></b><span class="lvc big">Lv ' + g.level + "</span>" +
    '<div class="prog"><i style="width:' + g.pct + '%"></i></div>' +
    '<p class="small">' + g.points + " نقطة · باقي <b>" + g.left + "</b> نقطة لليفل " + (g.level + 1) + "</p></div>";
}
async function renderIn() {
  const share = "زيدني صاحب على nursin 🏆 وخلّينا نتسابق بالكويز! كودي: " + profile.friendCode + "\nhttps://nursin.store/friends.html?add=" + profile.friendCode;
  root.innerHTML =
    '<div class="qcard fme" id="fmecard"></div>' +
    '<div class="qcard"><h2>🔑 كود الصداقة تبعك</h2><p class="fcode" dir="ltr">' + esc(profile.friendCode) + "</p>" +
    '<p class="fbtns"><button class="btn" id="fcopy" type="button">📋 نسخ الكود</button> <a class="btn wa" id="fwa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">🟢 ابعتو عالواتساب</a></p></div>' +
    '<div class="qcard"><h2>➕ زيد صاحب</h2><form id="fadd" class="fadd" autocomplete="off"><input id="fcodein" dir="ltr" maxlength="7" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="مثلاً K7Q2MX" aria-label="كود صاحبك"><button class="btn pri" type="submit">زيد</button></form><p id="faddmsg" class="small" aria-live="polite"></p></div>' +
    '<div class="qcard"><h2>🏅 ترتيب أصحابي</h2><ol id="fboard" class="lb"><li class="small">⏳ …</li></ol></div>' +
    '<div class="qcard" id="chin"><h2>⚔️ تحدّيات إلك</h2><ul class="chl" id="chinl"><li class="small">⏳ …</li></ul></div>' +
    '<div class="qcard" id="chout"><h2>🎯 تحدّياتي</h2><ul class="chl" id="choutl"><li class="small">⏳ …</li></ul><p class="small">كبس «⚔️ تحدّى» حد أي صاحب بالترتيب: بتلعبو نفس الـ ١٠ أسئلة، ويلي بيجيب أكتر بياخد <b>+20 نقطة</b>.</p></div>' +
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
    const ch = e.target.closest(".chal");
    if (ch) {
      const f = lastBoard.find(p => p.uid === ch.dataset.uid); if (!f) return;
      ch.disabled = true; ch.textContent = "⏳ …";
      try { const id = await createChallenge(f); location.href = "quiz.html?challenge=" + encodeURIComponent(id); }
      catch (x) { console.warn("nursin: create challenge", x && x.code); ch.disabled = false; ch.textContent = "⚔️ تحدّى"; alert("ما زبط التحدّي هلّق، جرّب بعد شوي."); }
      return;
    }
    const b = e.target.closest(".rm"); if (!b) return;
    if (!confirm("أكيد بدّك تشيلو من أصحابك؟")) return;
    try { await deleteDoc(doc(db, "users", user.uid, "friends", b.dataset.uid)); await drawBoard(); } catch (x) { console.warn("nursin: remove friend", x && x.code); }
  });
  drawMe();
  const [, gotBonus] = await Promise.all([drawBoard(), drawChallenges()]);
  if (gotBonus) { drawMe(); await drawBoard(); }
  if (pendingAdd) {
    const c = pendingAdd; pendingAdd = "";
    history.replaceState(null, "", location.pathname);
    if (c !== profile.friendCode) { inp.value = c; await doAdd(c); }
  }
}
let lastBoard = [];
async function createChallenge(f) {
  const ids = (window.QUIZ || []).map(q => q.id);
  if (ids.length < 10) throw new Error("quiz bank not loaded");
  const seed = Math.floor(Math.random() * 2147483647);
  const ref = await addDoc(collection(db, "challenges"), {
    from: user.uid, to: f.uid, fromName: profile.name, toName: N.cleanName(f.name), seed, qids: N.pickQids(seed, ids, 10),
    fromScore: null, toScore: null, fromBonus: false, toBonus: false, createdAt: serverTimestamp()
  });
  return ref.id;
}
async function drawChallenges() {
  const inl = document.getElementById("chinl"), outl = document.getElementById("choutl"); if (!inl) return false;
  let gotBonus = false;
  try {
    const [a, b] = await Promise.all([
      getDocs(query(collection(db, "challenges"), where("to", "==", user.uid), limit(30))),
      getDocs(query(collection(db, "challenges"), where("from", "==", user.uid), limit(30)))
    ]);
    const ts = c => (c.createdAt && (c.createdAt.seconds || c.createdAt.__ts / 1000)) || 0;
    const rows = async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => ts(y) - ts(x)).slice(0, 12);
      const out = [];
      for (const c of list) {
        const me = roleOf(c), op = other(me);
        let r = { me, mine: c[me + "Score"], theirs: c[op + "Score"], w: N.winner(c.fromScore, c.toScore), bonus: 0 };
        if (r.w === me && !c[me + "Bonus"]) { try { const s = await settleChallenge(c.id, null); profileFromPoints(s.points); r = s; if (s.bonus) gotBonus = true; } catch (e) { console.warn("nursin: bonus", e && e.code); } }
        let line;
        if (r.mine == null) line = (me === "to" ? "⚔️ <b><bdi>" + esc(N.cleanName(c.fromName)) + "</bdi></b> تحدّاك" + (r.theirs != null ? " وجاب " + r.theirs + "/10" : "") : "⚔️ تحدّيت <b><bdi>" + esc(N.cleanName(c.toName)) + "</bdi></b> بس لسّا ما لعبت") +
          ' <a class="btn pri" href="quiz.html?challenge=' + encodeURIComponent(c.id) + '">' + (me === "to" ? "▶️ العب هلّق" : "▶️ كمّل") + "</a>";
        else line = resultLine(r, c[op + "Name"]) + (r.w == null && me === "from" ? ' <a class="btn wa" target="_blank" rel="noopener" href="' + chalShare(c.id) + '">🟢 ذكّرو</a>' : "");
        out.push('<li class="chr' + (r.w ? (r.w === me ? " won" : r.w === "tie" ? "" : " lost") : "") + '">' + line + "</li>");
      }
      return out.join("");
    };
    inl.innerHTML = (await rows(a)) || '<li class="small fempty">ما في تحدّيات لهلّق. بس حدا من أصحابك يتحدّاك بتطلع هون.</li>';
    outl.innerHTML = (await rows(b)) || '<li class="small fempty">لسّا ما تحدّيت حدا.</li>';
  } catch (e) {
    console.warn("nursin: challenges", e && e.code);
    const m = '<li class="small">⚠️ ما قدرنا نجيب التحدّيات هلّق. جرّب بعد شوي.</li>';
    inl.innerHTML = m; outl.innerHTML = m;
  }
  return gotBonus;
}
async function drawBoard() {
  const ol = document.getElementById("fboard"); if (!ol) return;
  try {
    const list = await loadBoard();
    lastBoard = list;
    ol.innerHTML = list.map(rowHtml).join("") + (list.length < 2 ? '<li class="small fempty">لسّا ما زدت حدا. ابعت كودك لرفقاتك 👆 أو زيد كودن.</li>' : "");
  } catch (e) { console.warn("nursin: board", e && e.code); ol.innerHTML = '<li class="small">⚠️ ما قدرنا نجيب الترتيب هلّق. جرّب بعد شوي.</li>'; }
}

/* ---------- wiring ---------- */
onAuthStateChanged(auth, async u => {
  user = u;
  if (!u) {
    profile = null; N.setMe(null); ready = true;
    if (root) renderOut();
    if (params.get("challenge") && window.NursinQuiz) window.NursinQuiz.message('<p class="qq">⚔️ صاحبك تحدّاك!</p><p><b><a href="friends.html">سجّل دخول بغوغل بصفحة أصحابي</a></b>، والتحدّي بيستنّاك هونيك تحت «تحدّيات إلك».</p>');
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
  const chId = params.get("challenge");
  if (chId && window.NursinQuiz) await openChallengeOnQuiz(chId);
  N.flush();
});
