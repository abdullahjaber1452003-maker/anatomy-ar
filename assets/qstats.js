// ⚠️ «الأخطاء الشائعة» from ALL students + 📝 «كويز الصف (كل ٣ أيام)» + 🔁 a copy of the spaced-repetition list on the account.
// (Abdullah, Oct 28 2026 8:32–10:59 PM.) Loaded by assets/fb.js for signed-in students only. Everything here needs Firestore rules v15
// (files nursin-rules-v15.txt); under v14 every read/write is refused and the site quietly keeps the local/static versions.
//   Counters (anonymous: no uid, no name — just two numbers per question):
//     stats/{week}/qmiss/{qid}        {wrong, total}   site-wide, per Beirut week (Monday key) → the home card «⚠️ الأخطاء الشائعة» (top 5)
//     classes/{cid}/qmiss/{qid}       {wrong, total}   per class (members only) → the class quiz every 3 days
//     each answer adds exactly 1 to total (+1 to wrong when wrong) with FieldValue.increment; one count per question per student per day.
//   Class quiz: period P = floor(days since 2026-10-29 / 3) on the Beirut date. The first member who opens it freezes the question list in
//     classes/{cid}/cq/p{P} {p, qids, at} (create-once) so the whole class gets the same quiz; scores classes/{cid}/cq/p{P}_{uid}
//     {uid, p, s, n, name, t} (create-once, own uid) are visible to the class. Scores are computed in the browser: honest students only.
import { increment } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const EPOCH = "2026-10-29", QN = 8;
const W = typeof window !== "undefined" ? window : {}, D = typeof document !== "undefined" ? document : null;
let API = null, off = { stats: false, cls: false, srs: false }, myCls = null;

export function dayNum(day) { return Math.round((Date.parse(day + "T12:00:00Z") - Date.parse(EPOCH + "T12:00:00Z")) / 864e5); }
export function period(day) { return Math.floor(dayNum(day) / 3); }
export function periodDays(p) { const s = new Date(Date.parse(EPOCH + "T12:00:00Z") + p * 3 * 864e5); const e = new Date(s.getTime() + 2 * 864e5); return [s.toISOString().slice(0, 10), e.toISOString().slice(0, 10)]; }
function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// pure: the class quiz list — the class's most-missed first, then the site's, then a fixed draw from the bank (same for the whole class)
export function pickQids(clsRows, siteRows, bankIds, seed, n = QN) {
  const out = [], has = new Set(bankIds);
  const add = id => { if (out.length < n && has.has(id) && !out.includes(id)) out.push(id); };
  const rank = rows => (rows || []).filter(r => (r.wrong | 0) > 0).sort((a, b) => (b.wrong - a.wrong) || ((b.wrong / Math.max(1, b.total)) - (a.wrong / Math.max(1, a.total))) || (a.id < b.id ? -1 : 1));
  rank(clsRows).forEach(r => add(r.id)); rank(siteRows).forEach(r => add(r.id));
  const rnd = seeded(seed), rest = bankIds.slice().sort();
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  rest.forEach(add);
  return out;
}
const N = () => W.Nursin || {};
const today = () => (N().dayKey ? N().dayKey() : new Date().toISOString().slice(0, 10));
const week = () => (N().weekStart ? N().weekStart() : today());
const addDays = (day, n) => new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const bank = () => { const m = {}; (W.QUIZ || []).forEach(q => { m[q.id] = q; }); return m; };
const denied = e => e && (e.code === "permission-denied" || e.code === "failed-precondition");
const esc = s => (API && API.esc ? API.esc(s) : String(s == null ? "" : s));

async function classes() {
  if (myCls) return myCls;
  const { db, fs, user } = API; if (!user) return [];
  try { const s = await fs.getDocs(fs.collection(db, "users", user.uid, "myClasses")); myCls = s.docs.map(d => ({ id: d.id, name: (d.data().name || "").slice(0, 40) })); }
  catch (e) { myCls = []; }
  return myCls;
}

/* ---- 1 · counters: one +1 per answer (and per question per day) ---- */
function firstToday(qid) {
  const k = "nursin_qcnt_v1", day = today(); let x = null;
  try { x = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) {}
  if (!x || x.day !== day) x = { day, ids: [] };
  if (x.ids.includes(qid)) return false;
  x.ids.push(qid); try { localStorage.setItem(k, JSON.stringify(x)); } catch (e) {}
  return true;
}
async function count(qid, ok) {
  const { db, fs, user } = API; if (!user || !/^q\d{3}$/.test(qid) || !firstToday(qid)) return;
  const v = { wrong: increment(ok ? 0 : 1), total: increment(1) };
  if (!off.stats) fs.setDoc(fs.doc(db, "stats", week(), "qmiss", qid), v, { merge: true }).catch(e => { if (denied(e)) off.stats = true; });
  if (!off.cls) for (const c of await classes()) fs.setDoc(fs.doc(db, "classes", c.id, "qmiss", qid), v, { merge: true }).catch(e => { if (denied(e)) off.cls = true; });
}

/* ---- 2 · 🔁 spaced repetition: a copy under the student's own users/{uid}/srs/main ---- */
let srsT = 0;
async function srsPull() {
  const S = W.NursinSRS, { db, fs, user } = API; if (!S || !user) return;
  try { const s = await fs.getDoc(fs.doc(db, "users", user.uid, "srs", "main")); const r = s.exists() ? (s.data().items || {}) : {};
    S.merge(r); const l = S.items(); if (Object.keys(l).some(k => !r[k] || (r[k].m | 0) < (l[k].m | 0))) srsPush(); }
  catch (e) { if (denied(e)) off.srs = true; }
}
function srsPush() {
  clearTimeout(srsT); if (off.srs) return;
  srsT = setTimeout(() => { const S = W.NursinSRS, { db, fs, user } = API; if (!S || !user) return;
    fs.setDoc(fs.doc(db, "users", user.uid, "srs", "main"), { items: S.items(), t: fs.serverTimestamp() }).catch(e => { if (denied(e)) off.srs = true; }); }, 4000);
}

/* ---- 3 · ⚠️ home card: the 5 questions students got wrong most this week (one read) ---- */
export function cardHtml(rows, b, last) {
  const L = "abcdef";
  const items = rows.map(r => ({ r, q: b[r.id] })).filter(x => x.q && (x.r.wrong | 0) > 0).slice(0, 5);
  if (!items.length) return "";
  return '<p class="small cmsub">' + (last ? "أكتر الأسئلة يلي غلطو فيها الطلاب الأسبوع الماضي (بلا أسامي)" : "أكتر الأسئلة يلي غلطو فيها الطلاب هالأسبوع (بلا أسامي)") + '</p><ol class="cmlist">' +
    items.map(({ r, q }) => '<li class="cmi"><p class="cmq">' + q.q + '</p><p class="cma">✅ <b>' + L[q.a] + ") " + q.o[q.a] + '</b></p><p class="cmx">' + String(q.x).split(/(?<=[.!؟?])\s/)[0] +
      '</p><p class="cmn small">❌ غلط فيه ' + (r.wrong | 0) + " من " + Math.max(r.wrong | 0, r.total | 0) + "</p></li>").join("") +
    '</ol><p><button class="btn sm" type="button" id="cmrev">🔁 حطّهن بمراجعتي</button></p>';
}
async function card() {
  const el = D.getElementById("cmlive"); if (!el) return;
  const { db, fs } = API, b = bank();
  const top = async wk => (await fs.getDocs(fs.query(fs.collection(db, "stats", wk, "qmiss"), fs.orderBy("wrong", "desc"), fs.limit(5)))).docs.map(d => ({ id: d.id, ...d.data() }));
  try {
    let rows = await top(week()), last = false;
    if (rows.filter(r => r.wrong > 0).length < 3) { const p = await top(addDays(week(), -7)); if (p.filter(r => r.wrong > 0).length > rows.filter(r => r.wrong > 0).length) { rows = p; last = true; } }
    const h = cardHtml(rows, b, last); if (!h) return;
    el.innerHTML = h; el.hidden = false; const c = D.getElementById("cmist"); if (c) { c.classList.add("live"); const st = c.querySelector("details.hmist"); if (st) st.open = false; }
    const cn = D.getElementById("cmcnt"); if (cn) cn.textContent = String((h.match(/<li class="cmi">/g) || []).length);   // the folded title's count = live questions
    const rb = D.getElementById("cmrev");
    if (rb) rb.addEventListener("click", () => { const n = W.NursinSRS ? W.NursinSRS.add(rows.map(r => r.id)) : 0; rb.outerHTML = '<span class="small">🔁 ' + (n ? "انضافو " + n + " لمراجعتك، بيطلعو بكرا" : "هودي أصلاً بمراجعتك") + "</span>"; });
  } catch (e) { /* v14: the hand-written list stays */ }
}

/* ---- 4 · 📝 class quiz every 3 days ---- */
const P = () => period(today());
function doneLocal(cid, p, set) { const k = "nursin_cq_v1"; let x = {}; try { x = JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) {}
  if (set) { x[cid + "_" + p] = set; Object.keys(x).forEach(key => { if (+key.split("_").pop() < p - 3) delete x[key]; }); try { localStorage.setItem(k, JSON.stringify(x)); } catch (e) {} }
  return x[cid + "_" + p] || null; }
async function myScore(cid, p) {
  const l = doneLocal(cid, p); if (l) return l;
  const { db, fs, user } = API;
  try { const s = await fs.getDoc(fs.doc(db, "classes", cid, "cq", "p" + p + "_" + user.uid)); if (s.exists()) { const d = s.data(); return doneLocal(cid, p, { s: d.s | 0, n: d.n | 0 }); } } catch (e) {}
  return null;
}
async function tile() {
  const cl = await classes(), p = P(), end = periodDays(p)[1].split("-"), items = [];
  for (const c of cl) { const sc = await myScore(c.id, p);
    items.push({ e: "📝", n: "كويز الصف (كل ٣ أيام)", s: c.name + (sc ? " · ✅ " + sc.s + "/" + sc.n : " · لحد " + (+end[2]) + "/" + (+end[1])), href: "quiz.html?cq=" + encodeURIComponent(c.id), done: !!sc }); }
  try { D.dispatchEvent(new CustomEvent("nursin:tile", { detail: { k: "cq", n: items.filter(x => !x.done).length, items } })); } catch (e) {}
}
async function quizFor(cid, p, name) {
  const { db, fs } = API, ref = fs.doc(db, "classes", cid, "cq", "p" + p), b = bank(), ids = Object.keys(b);
  try { const s = await fs.getDoc(ref); if (s.exists()) return { qids: s.data().qids || [], shared: true }; } catch (e) { if (denied(e)) return { qids: pickQids([], [], ids, cid + ":" + p), shared: false }; }
  const rows = async c => { try { return (await fs.getDocs(fs.query(c, fs.orderBy("wrong", "desc"), fs.limit(30)))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { return []; } };
  const qids = pickQids(await rows(fs.collection(db, "classes", cid, "qmiss")), await rows(fs.collection(db, "stats", week(), "qmiss")), ids, cid + ":" + p);
  try { await fs.setDoc(ref, { p, qids, at: fs.serverTimestamp() }); return { qids, shared: true }; }
  catch (e) { try { const s = await fs.getDoc(ref); if (s.exists()) return { qids: s.data().qids || [], shared: true }; } catch (x) {} return { qids, shared: false }; }
}
async function board(cid, p) {
  const { db, fs } = API;
  const s = await fs.getDocs(fs.query(fs.collection(db, "classes", cid, "cq"), fs.where("p", "==", p)));
  return s.docs.map(d => d.data()).filter(d => d.uid).sort((a, b) => (b.s / b.n) - (a.s / a.n) || b.s - a.s);
}
function boardHtml(rows, me) {
  if (!rows.length) return "";
  return '<h3 class="cqh">🏫 علامات الصف بهالكويز</h3><ol class="cqb">' + rows.map(r => '<li' + (r.uid === me ? ' class="me"' : "") + '><span>' + esc(r.name) + '</span><b dir="ltr">' + (r.s | 0) + "/" + (r.n | 0) + "</b></li>").join("") + "</ol>";
}
export async function openCq(api, cid) {
  API = api; const Q = W.NursinQuiz; if (!Q) return;
  const c = (await classes()).find(x => x.id === cid);
  if (!c) return Q.message('<p class="qq">📝 كويز الصف</p><p>إنت مش بهالصف. <a href="classes.html">فوت على صفّك</a> أوّل.</p>');
  const p = P(), [s0, e0] = periodDays(p), sc = await myScore(cid, p);
  if (sc) {
    let h = ""; try { h = boardHtml(await board(cid, p), API.user.uid); } catch (e) {}
    return Q.message('<p class="qq">📝 كويز الصف — ' + esc(c.name) + '</p><p>✅ حلّيتو: <b dir="ltr">' + sc.s + "/" + sc.n + "</b>. الكويز الجاي بيطلع بعد " + e0.slice(8).replace(/^0/, "") + "/" + (+e0.slice(5, 7)) + ".</p>" + h + '<p><a class="btn pri" href="index.html">🏠 رجوع للرئيسية</a></p>');
  }
  const qz = await quizFor(cid, p, c.name);
  run = { cid, p, name: c.name, shared: qz.shared };
  Q.startChallenge({ id: "cq", cq: cid, qids: qz.qids, label: "📝 كويز الصف · " + c.name });
}
let run = null;
async function saveCq(d) {
  if (!run || d.cq !== run.cid) return; const r = run; run = null;
  const box = () => D.getElementById("cqres"), { db, fs, user } = API, me = API.profile || {};
  doneLocal(r.cid, r.p, { s: d.score | 0, n: d.total | 0 });
  let saved = false;
  if (r.shared) try { await fs.setDoc(fs.doc(db, "classes", r.cid, "cq", "p" + r.p + "_" + user.uid), { uid: user.uid, p: r.p, s: d.score | 0, n: d.total | 0, name: String(me.name || "طالب").slice(0, 40), t: fs.serverTimestamp() }); saved = true; } catch (e) {}
  let h = ""; if (saved) try { h = boardHtml(await board(r.cid, r.p), user.uid); } catch (e) {}
  const b = box(); if (b) b.innerHTML = saved ? '<p>✅ انحفظت علامتك بكويز الصف.</p>' + h : '<p>✅ خلّصت كويز الصف.</p>';   // before rules v15: nothing is saved, nothing is claimed
}

export function start(api) {
  API = api;
  D.addEventListener("nursin:answer", e => { const x = e.detail || {}; count(String(x.qid || ""), !!x.ok); });
  D.addEventListener("nursin:srs", srsPush);
  D.addEventListener("nursin:quiz-done", e => saveCq(e.detail || {}));
  srsPull();
  card();
  if (D.getElementById("htiles")) tile();
}
