// nursin friends + levels — Firebase (Google sign-in + Firestore). Loaded as a module by assets/account.js.
// Live rooms (assets/live.js), weekly exams (assets/exams.js) and classes (assets/classes.js) are loaded from here only where they are needed.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit, onSnapshot, runTransaction, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
    await setDoc(ref, { ...prof, updatedAt: serverTimestamp() }, { merge: true });
  profile = { uid: u.uid, ...prof, powerups: d.powerups | 0, puDay: d.puDay || "", monthKey: d.monthKey || "", monthPoints: d.monthPoints | 0, weekKey: d.weekKey || "", weekPoints: d.weekPoints | 0, ...actFields(d) };
  N.setMe(profile);
}

/* ---------- 🔥 streak + 🏅 badges: merged into users/{uid} (fields the v4 rules already accept) ---------- */
const ACT_KEYS = ["streak", "sDay", "bestStreak", "actDay", "actN", "qTotal", "ecgN", "ecgOk", "badges"];
function actFields(d) { const o = {}; ACT_KEYS.forEach(k => { if (d && d[k] != null) o[k] = d[k]; }); return o; }
// n more answers today (ecg = [right, total] on ECG questions; extra = event badges like "live1") → {before, w, html}
// force = the day counts even under 5 answers (finished quiz, game round, pomodoro round)
async function logActivity(n, ecg, extra, force) {
  if (!user || !profile) return null;
  const ref = doc(db, "users", user.uid), dk = N.dayKey();
  try {
    const r = await runTransaction(db, async tx => {
      const s = await tx.get(ref); const d = s.exists() ? s.data() : {};
      const w = N.actWrite({ ...d, points: d.points | 0 }, n, ecg, extra, dk, !!force);
      tx.set(ref, { ...w, updatedAt: serverTimestamp() }, MERGE);
      return { before: actFields(d), w };
    });
    Object.assign(profile, r.w); N.setMe(profile);
    r.html = N.actLine(r.before, r.w, dk);
    return r;
  } catch (e) { console.warn("nursin: streak", e && e.code); return null; }
}

/* ---------- quiz points: +3 per right answer, −5 per wrong, never below 0 ---------- */
// Every points write also carries this month's points (monthKey, monthPoints and m<YYYYMM>); the month resets on the first write of a new month.
// Written with merge, so friend code, power-ups and older months stay.
function profileWrite(d, points, before) {
  if (before == null) before = N.addPoints(d.points || 0, 0, 0);
  return { name: N.cleanName(d.name || profile.name), photo: d.photo || profile.photo || "", points, level: N.level(points), friendCode: d.friendCode || profile.friendCode,
    ...N.monthWrite(d, before, points, new Date()), ...N.weekWrite(d, before, points), updatedAt: serverTimestamp() };
}
const MERGE = { merge: true };
const denied = e => e && e.code === "permission-denied";
async function award(q) {
  const ref = doc(db, "users", user.uid);
  const eref = q.exam ? doc(db, "examResults", q.exam + "_" + user.uid) : null;
  return runTransaction(db, async tx => {
    const s = await tx.get(ref);
    if (eref) { const e = await tx.get(eref); if (e.exists()) throw { ar: "هالامتحان قدّمتو من قبل، بس أوّل محاولة بتنحسب.", dup: true }; }
    const d = s.exists() ? s.data() : {};
    const before = N.addPoints(d.points || 0, 0, 0);
    // ⏱️ pomodoro rounds and 🎮 game rounds bring a small positive bonus (q.bonus); quizzes keep +3 right / −5 wrong
    const points = q.bonus != null ? N.addPoints(before + Math.max(0, Math.min(50, q.bonus | 0)), 0, 0) : N.addPoints(before, q.score, q.wrong);
    const w = profileWrite(d, points, before);
    if (eref) tx.set(eref, { uid: user.uid, exam: q.exam, score: q.score, total: q.total, at: serverTimestamp() });
    tx.set(ref, w, MERGE);
    return { before, points, month: w.monthPoints, weekKey: w.weekKey, week: w.weekPoints };
  });
}

/* ---------- ✂️ 50/50 power-up: 1 free a day, extra ones cost 10 points (stored as powerups 0–50 on users/{uid}) ---------- */
async function use5050() {
  if (!user || !profile) return { ok: false, msg: "سجّل دخول أول" };
  const ref = doc(db, "users", user.uid), today = N.dayKey();
  try {
    const r = await runTransaction(db, async tx => {
      const s = await tx.get(ref); const d = s.exists() ? s.data() : {};
      const before = N.addPoints(d.points || 0, 0, 0);
      let pu = Math.max(0, Math.min(N.PU_MAX, Math.floor(+d.powerups || 0))), puDay = d.puDay || "", points = before;
      if (puDay !== today) puDay = today;                         // today's free one
      else if (pu > 0) pu--;                                     // a saved one
      else if (before >= N.PU_PRICE) points = before - N.PU_PRICE; // buy one now and use it
      else throw { ar: "ما عندك نقاط كفاية (بدّك " + N.PU_PRICE + ")" };
      tx.set(ref, { ...(points !== before ? profileWrite(d, points, before) : {}), powerups: pu, puDay, updatedAt: serverTimestamp() }, MERGE);
      return { points, pu, puDay };
    });
    profile.powerups = r.pu; profile.puDay = r.puDay; profileFromPoints(r.points);
    return { ok: true, left: N.puAvail(profile) };
  } catch (e) { if (!e || !e.ar) console.warn("nursin: 50/50", e && e.code); return { ok: false, msg: e && e.ar }; }
}
async function buy5050() {
  const ref = doc(db, "users", user.uid);
  const r = await runTransaction(db, async tx => {
    const s = await tx.get(ref); const d = s.exists() ? s.data() : {};
    const before = N.addPoints(d.points || 0, 0, 0), pu = Math.max(0, Math.floor(+d.powerups || 0));
    if (before < N.PU_PRICE) throw { ar: "ما عندك نقاط كفاية (بدّك " + N.PU_PRICE + ")." };
    if (pu >= N.PU_MAX) throw { ar: "معك " + N.PU_MAX + " (هيدا الحد الأقصى)." };
    const points = before - N.PU_PRICE;
    tx.set(ref, { ...profileWrite(d, points, before), powerups: pu + 1 }, MERGE);
    return { points, pu: pu + 1 };
  });
  profile.powerups = r.pu; profileFromPoints(r.points);
  return r;
}
N.use5050 = use5050;

/* ---------- challenges «تحدّي» ---------- */
// challenges/{id} = {from, to, fromName, toName, seed, qids[10], fromScore, toScore, fromBonus, toBonus, createdAt}
const roleOf = c => (c.from === user.uid ? "from" : "to");
const other = r => (r === "from" ? "to" : "from");
// Save my score once (if given) and, when both have played and I won, add my winner bonus (+10) once.
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
    if (w === me && !c[me + "Bonus"]) { upd[me + "Bonus"] = true; bonus = N.BONUS; const before = points; points = N.addPoints(points + N.BONUS, 0, 0); tx.set(uref, profileWrite(ud, points, before), MERGE); }
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
  if (r.w === r.me) return "🏆 <b>ربحت</b> " + score + " على <b>" + oname + "</b>" + (r.bonus ? " · <b><bdi dir=\"ltr\">+" + r.bonus + "</bdi> نقطة بونص</b> 🎉" : "");
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
    if (!user) { const o = q.el || el; if (o) o.innerHTML = '🏆 <a href="friends.html">سجّل دخول بغوغل</a> تا تنحسبلك النقاط.'; continue; }
    let html = "";
    if (q.bonus != null) {                                          // ⏱️ / 🎮 bonus points (assets/study.js, assets/games.js)
      const out = q.el || el;
      try {
        const r = await award(q);
        profileFromPoints(r.points); if (profile) { profile.weekKey = r.weekKey; profile.weekPoints = r.week; N.setMe(profile); }
        const g = N.progress(r.points), up = N.level(r.points) > N.level(r.before);
        html = '<span class="qnet">⭐ <b>+' + (r.points - r.before) + "</b> نقطة" + (q.why ? " (" + esc(q.why) + ")" : "") + "</span><br>صار معك <b>" + r.points + "</b> نقطة · هالأسبوع <b>" + (r.week | 0) + "</b>" + (up ? " · 🆙 <b>طلعت عالليفل " + g.level + "!</b>" : "");
      } catch (e) { console.warn("nursin: bonus", e && e.code); html = "⚠️ ما قدرنا نزيد النقاط هلّق (الإنترنت؟)."; }
      const act = await logActivity(q.n | 0, null, q.badges || [], true);
      if (act) html += act.html;
      if (out) out.innerHTML = html;
      try { document.dispatchEvent(new CustomEvent("nursin:points", { detail: { html } })); } catch (x) {}
      continue;
    }
    try {
      const r = await award(q);
      profileFromPoints(r.points); if (profile) { profile.weekKey = r.weekKey; profile.weekPoints = r.week; }
      const g = N.progress(r.points), up = N.level(r.points) > N.level(r.before), net = r.points - r.before;
      html = '<span class="qnet">✅ ' + q.score + " صح <b>+" + q.score * N.RIGHT + "</b> · ❌ " + q.wrong + ' غلط <b dir="ltr">−' + q.wrong * N.WRONG + "</b> = <b class=\"" + (net < 0 ? "neg" : "pos") + '" dir="ltr">' + (net > 0 ? "+" : net < 0 ? "−" : "") + Math.abs(net) + "</b> نقطة</span>" +
        (r.points === 0 && net === 0 && q.wrong ? ' <small>(النقاط ما بتنزل تحت الصفر)</small>' : "") + "<br>صار معك <b>" + r.points + "</b> نقطة · " + (up ? "🆙 <b>طلعت عالليفل " + g.level + "!</b>" : "ليفل " + g.level + " · باقي " + g.left + " لليفل " + (g.level + 1));
      if (q.exam) html += '<span class="qch">📅 انحفظت نتيجة الامتحان: <b dir="ltr">' + q.score + "/" + q.total + "</b> · هالشهر صار معك <b>" + (r.month | 0) + '</b> نقطة. <a href="exams.html#top">الأوائل ←</a></span>';
    } catch (e) {
      if (!e || !e.ar) console.warn("nursin: points", e && e.code);
      if (q.exam && !(e && e.ar) && !denied(e)) { try { localStorage.setItem("nursin_exam_retry", JSON.stringify({ ...q, day: N.dayKey() })); } catch (x) {} }
      html = e && e.ar ? "⚠️ " + e.ar : q.exam && e && e.code === "permission-denied" ? "⚠️ ما قدرنا نسجّل الامتحان هلّق (الامتحانات بعدها عم تتجهّز 🛠️)، فالنقاط ما انحسبت." : "⚠️ ما قدرنا نزيد النقاط هلّق (الإنترنت؟). جرّب كويز تاني بعد شوي.";
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
    const act = await logActivity((q.score | 0) + (q.wrong | 0), q.ecg, ["fq1"], true);   // a finished quiz counts the day (Oct 26)
    if (act) html += act.html;
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

function errText(e) {
  const c = (e && e.code) || "";
  let m = "⚠️ صار في مشكلة بتسجيل الدخول. جرّب مرّة تانية.";
  if (c === "auth/unauthorized-domain") m = "⚠️ تسجيل الدخول مش مفعّل لهالموقع بعد.";
  else if (c === "auth/network-request-failed") m = "⚠️ في مشكلة بالإنترنت. تأكّد من الاتصال وجرّب كمان مرّة.";
  else if (c === "auth/web-storage-unsupported" || c === "auth/operation-not-supported-in-this-environment") m = "⚠️ هالمتصفّح ما بيقبل تسجيل الدخول. افتح nursin.store بـ Chrome أو Safari.";
  return m;
}
function showErr(e) {
  const root = rootOverride || document.getElementById("friends-app") || document.getElementById("live-app") || document.getElementById("exams-app") || document.getElementById("classes-app");
  if (!root || !e) return;
  const m = errText(e);
  let el = document.getElementById("ferr");
  if (!el) { el = document.createElement("p"); el.id = "ferr"; el.className = "ferr"; root.prepend(el); }
  el.textContent = m;
}

function signInCard(el, intro) {
  el.innerHTML = '<div class="qcard fcard fout">' + intro + '<button class="gbtn" type="button">' + G + "<span>تسجيل الدخول بغوغل</span></button>" +
    '<p class="small">بتسجّل بغوغل بيفتحلك كل الدروس والكويزات، ومنحفظ اسمك وصورتك ونقاطك (<a href="privacy.html">الخصوصية</a>).</p></div>';
  const b = el.querySelector(".gbtn");
  b.addEventListener("click", async () => {
    b.disabled = true;
    try { await signIn(); } catch (e) { console.warn("nursin: sign-in", e && e.code); showErrIn(el, e); }
    finally { b.disabled = false; }
  });
}
function showErrIn(el, e) {
  try { rootOverride = el; showErr(e); } finally { rootOverride = null; }
}
let rootOverride = null;
function renderOut() {
  root.innerHTML =
    '<div class="qcard fcard fout">' +
    '<p class="fbig">🏆 جمّع نقاط من الكويز، اطلع بالليفل، وتسابق مع رفقاتك.</p>' +
    '<ul class="fsteps"><li>✅ كل جواب صح = <b>+٣ نقاط</b></li><li>❌ كل جواب غلط = <b>−٥</b> (النقاط ما بتنزل تحت الصفر)</li><li>🆙 النقاط بتطلّعك بالليفل: ليفل 2 بـ 15 نقطة، ليفل 3 بـ 60، ليفل 4 بـ 135…</li><li>🤝 زيد أصحابك بالكود وتحدّوا بعض ⚔️ أو لايف 🔴</li><li>📅 امتحان كل يوم والأوائل كل شهر 🏆</li></ul>' +
    (pendingAdd ? '<p class="finv">👋 صاحبك بعتلك كودو <b dir="ltr">' + esc(pendingAdd) + '</b>. سجّل دخول وبينضاف لأصحابك.</p>' : "") +
    '<button class="gbtn" id="gsign" type="button">' + G + "<span>تسجيل الدخول بغوغل</span></button>" +
    '<p class="small">بتسجّل بغوغل بيفتحلك كل الدروس والكويزات، ومنحفظ اسمك وصورتك ونقاطك تا يشوفوك أصحابك (<a href="privacy.html">الخصوصية</a>).</p>' +
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
    '<span class="nm"><b><bdi>' + esc(N.cleanName(p.name)) + "</bdi>" + (p.me ? " <small>(إنت)</small>" : "") + '</b><small><span class="lvc">Lv ' + N.level(p.points) + "</span> " + N.streakPill(p) + " " + (p.points | 0) + " نقطة" + N.badgeRow(p) + "</small></span>" +
    (p.me ? "" : '<a class="btn chat" href="chat.html?with=' + encodeURIComponent(p.uid) + '" aria-label="حكي مع ' + esc(N.cleanName(p.name)) + '">💬 حكي</a><a class="btn live" href="live.html?with=' + encodeURIComponent(p.uid) + '" aria-label="تحدّي لايف مع ' + esc(N.cleanName(p.name)) + '">🔴 لايف</a><button class="btn chal" type="button" data-uid="' + esc(p.uid) + '">⚔️ تحدّى</button><button class="rm" type="button" data-uid="' + esc(p.uid) + '" aria-label="شيل ' + esc(N.cleanName(p.name)) + ' من أصحابي">✕</button>') + "</li>";
}

function streakHtml() {
  const s = N.streakNow(profile), best = Math.max(profile.bestStreak | 0, s), left = N.dayLeft(profile);
  return '<p class="fstk"><span class="stkbig">🔥 <b>' + s + "</b> " + (s === 1 ? "يوم" : "أيام") + "</span> <small>ورا بعض · أطول سلسلة: <b>" + best + "</b></small><br><small>" +
    (left ? "جاوب <b>" + left + "</b> " + (left === 1 ? "سؤال" : "أسئلة") + " كمان اليوم تا ينحسب النهار" + (s ? " وتكبر النار" : " وتبلّش سلسلة") + " 🔥" : "✅ اليوم انحسب! ارجع بكرا تا ما ترجع النار لصفر.") + "</small></p>";
}
function drawBadges() {
  const el = document.getElementById("badges"); if (!el) return;
  const b = profile.badges || {}, n = N.BADGES.filter(x => b[x.id]).length;
  el.innerHTML = '<h2>🏅 أوسمتي <small>(' + n + " من " + N.BADGES.length + ')</small></h2><ul class="bgrid">' + N.BADGES.map(x => {
    const on = !!b[x.id];
    return '<li class="bdgc' + (on ? " on" : "") + '"><span class="be" aria-hidden="true">' + (on ? x.e : "🔒") + "</span><b>" + esc(x.n) + "</b><small>" + (on ? "✅ " + esc(b[x.id]) : esc(x.how)) + "</small></li>";
  }).join("") + "</ul>";
}
function drawMe() {
  const el = document.getElementById("fmecard"); if (!el) return;
  const g = N.progress(profile.points);
  el.innerHTML = N.avatar(profile.photo, profile.name, "av avl") +
    '<div class="fmei"><b><bdi>' + esc(profile.name) + '</bdi></b><span class="lvc big">Lv ' + g.level + "</span>" +
    '<div class="prog"><i style="width:' + g.pct + '%"></i></div>' +
    '<p class="small">' + g.points + " نقطة · باقي <b>" + g.left + "</b> نقطة لليفل " + (g.level + 1) + "</p>" +
    streakHtml() +
    '<p class="small pu">✂️ حذف جواب غلط: معك <b>' + N.puAvail(profile) + '</b> <small>(واحد ببلاش كل يوم)</small> <button class="btn sm" id="pubuy" type="button"' + ((profile.points | 0) < N.PU_PRICE ? " disabled" : "") + ">اشتري واحد بـ " + N.PU_PRICE + ' نقطة</button><span id="pumsg" aria-live="polite"></span></p></div>';
  drawBadges();
  const b = document.getElementById("pubuy");
  if (b) b.addEventListener("click", async () => {
    b.disabled = true; const m = document.getElementById("pumsg");
    try { await buy5050(); drawMe(); } catch (e) { if (!e || !e.ar) console.warn("nursin: buy 50/50", e && e.code); if (m) m.textContent = " ⚠️ " + (e && e.ar || "ما زبط هلّق."); b.disabled = false; }
  });
}
async function renderIn() {
  const share = "زيدني صاحب على nursin 🏆 وخلّينا نتسابق بالكويز! كودي: " + profile.friendCode + "\nhttps://nursin.store/friends.html?add=" + profile.friendCode;
  root.innerHTML =
    '<div class="qcard fme" id="fmecard"></div>' +
    '<div class="qcard" id="badges"></div>' +
    '<div class="qcard"><h2>🔑 كود الصداقة تبعك</h2><p class="fcode" dir="ltr">' + esc(profile.friendCode) + "</p>" +
    '<p class="fbtns"><button class="btn" id="fcopy" type="button">📋 نسخ الكود</button> <a class="btn wa" id="fwa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">🟢 ابعتو عالواتساب</a></p></div>' +
    '<div class="qcard"><h2>➕ زيد صاحب</h2><form id="fadd" class="fadd" autocomplete="off"><input id="fcodein" dir="ltr" maxlength="7" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="مثلاً K7Q2MX" aria-label="كود صاحبك"><button class="btn pri" type="submit">زيد</button></form><p id="faddmsg" class="small" aria-live="polite"></p></div>' +
    '<p class="fbtns"><a class="btn pri" href="chat.html">💬 المحادثات</a> <a class="btn" href="chat.html?new">➕ مجموعة جديدة</a></p>' +
    '<div id="fpush"></div>' +
    '<div class="qcard"><h2>🏅 ترتيب أصحابي</h2><ol id="fboard" class="lb"><li class="small">⏳ …</li></ol></div>' +
    '<div class="qcard" id="livein"><h2>🔴 تحدّي لايف</h2><ul class="chl" id="liveinl"><li class="small">⏳ …</li></ul><p class="small">كبس «🔴 لايف» حد صاحبك، أو <a href="live.html">اعمل غرفة وابعت الرابط</a>. الكويز بيبلّش بس تكونوا التنين أونلاين وجاهزين.</p></div>' +
    '<div class="qcard" id="chin"><h2>⚔️ تحدّيات إلك</h2><ul class="chl" id="chinl"><li class="small">⏳ …</li></ul></div>' +
    '<div class="qcard" id="chout"><h2>🎯 تحدّياتي</h2><ul class="chl" id="choutl"><li class="small">⏳ …</li></ul><p class="small">كبس «⚔️ تحدّى» حد أي صاحب بالترتيب: بتلعبو نفس الـ ١٠ أسئلة كل واحد بوقتو، ويلي بيجيب أكتر بياخد <b>+10 نقاط</b>.</p></div>' +
    '<p class="fout2"><a class="quizlink" href="quiz.html">📝 اعمل كويز وجمّع نقاط</a> <button class="btn" id="fout" type="button">تسجيل الخروج</button>' + (user && user.email === "abdullahjaber1452003@gmail.com" && user.emailVerified ? ' <a class="btn" href="admin.html">📢 إعلان للكل</a>' : "") + '</p>';
  if (window.NursinPWA) window.NursinPWA.pushCard(document.getElementById("fpush"), API);   // 🔔 chat notifications opt-in
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
  mod("live").then(m => m && m.friendsInvites(document.getElementById("liveinl"), API));
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

/* ---------- shared with assets/live.js and assets/exams.js ---------- */
const ver = new URL(import.meta.url).search;
const mods = {};
function mod(name) {
  return mods[name] || (mods[name] = import("./" + name + ".js" + ver).catch(e => { console.warn("nursin: load " + name, e && e.message); return null; }));
}
const page = location.pathname.split("/").pop() || "index.html";
const API = {
  db, auth, N, esc, MERGE,
  fs: { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit, onSnapshot, runTransaction, serverTimestamp, writeBatch },
  get user() { return user; }, get profile() { return profile; },
  signIn, errText, signInCard, profileWrite, profileFromPoints, logActivity, loadFriends: async () => (await loadBoard()).filter(p => !p.me), board: () => loadBoard(), mod
};
window.NursinFB = API;

/* ---------- wiring ---------- */
onAuthStateChanged(auth, async u => {
  user = u;
  try { document.dispatchEvent(new CustomEvent("nursin:auth", { detail: { signedIn: !!u } })); } catch (x) {}   // the welcome card (assets/nav.js) listens
  if (!u) {
    profile = null; N.setMe(null); ready = true;
    if (root) renderOut();
    if (params.get("challenge") && window.NursinQuiz) window.NursinQuiz.message('<p class="qq">⚔️ صاحبك تحدّاك!</p><p><b><a href="friends.html">سجّل دخول بغوغل بصفحة أصحابي</a></b>، والتحدّي بيستنّاك هونيك تحت «تحدّيات إلك».</p>');
    if (page === "live.html") { const m = await mod("live"); if (m) m.page(API); }
    if (page === "exams.html") { const m = await mod("exams"); if (m) m.page(API); }
    if (page === "classes.html") { const m = await mod("classes"); if (m) m.page(API); }
    if (page === "admin.html") { const m = await mod("admin"); if (m) m.page(API); }
    if (page === "chat.html") { const m = await mod("chat"); if (m) m.page(API); }
    N.flush();
    return;
  }
  try {
    await ensureProfile(u);
  } catch (e) {
    console.warn("nursin: profile", e && e.code);
    profile = { uid: u.uid, name: N.cleanName(u.displayName), photo: u.photoURL || "", points: (N.me && N.me.points) | 0, friendCode: "" };
    const box = root || document.getElementById("chat-app") || document.getElementById("live-app") || document.getElementById("exams-app") || document.getElementById("classes-app");
    if (box) { box.innerHTML = '<div class="qcard"><p>⚠️ ما قدرنا نجيب حسابك هلّق. تأكّد من الإنترنت وجرّب بعد شوي.</p><button class="btn" id="fout" type="button">تسجيل الخروج</button></div>'; document.getElementById("fout").addEventListener("click", () => signOut(auth)); }
    ready = true; return;
  }
  ready = true;
  if (root) await renderIn();
  if (page === "admin.html") { const m = await mod("admin"); if (m) m.page(API); }
  if (page === "chat.html") { const m = await mod("chat"); if (m) m.page(API); }
  const chId = params.get("challenge");
  if (chId && window.NursinQuiz) await openChallengeOnQuiz(chId);
  try {                                                            // an exam whose result could not be saved (network) is sent again, same day only
    const rq = JSON.parse(localStorage.getItem("nursin_exam_retry") || "null");
    localStorage.removeItem("nursin_exam_retry");
    if (rq && rq.exam && rq.day === N.dayKey()) N.queue.push({ score: rq.score | 0, wrong: rq.wrong | 0, total: rq.total | 0, exam: rq.exam, challenge: null });
  } catch (x) {}
  const exId = params.get("exam");
  if (exId && window.NursinQuiz) { const m = await mod("exams"); if (m) await m.openOnQuiz(API, exId); }
  if (page === "exams.html") { const m = await mod("exams"); if (m) m.page(API); }
  if (page === "classes.html") { const m = await mod("classes"); if (m) m.page(API); }
  const lm = await mod("live");
  if (lm) { if (page === "live.html") lm.page(API); lm.toast(API); }
  N.flush();
});
