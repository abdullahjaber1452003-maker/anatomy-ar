// ⏱️ «وقت الدرس اليوم» (Abdullah, Oct 27 10:08 PM: every student sees how long each classmate studied on the site today, so they push
// each other). Loaded by assets/fb.js for every signed-in visitor.
//  • Counts ONLY active time on lesson / quiz pages (STUDY_PAGES): the tab is visible AND focused AND there was a tap / key / scroll in
//    the last 90 s. An idle open tab, the home page, games, chats, the tutor, live rooms and ads never count.
//  • One shared doc per student per Beirut day: studyTime/{day}_{uid} {uid, d, s (seconds), n, ph, t}. Low write: the first write
//    after 1 min of activity, then at most every 3 min (+ when the tab hides / closes). Rules v14: own doc only, s only grows and by at
//    most the real time since the last write (+30 s), so nobody can type in hours or write for someone else.
//  • The board (home #stboard, class page) shows friends + classmates, ranked, with the date and an honest label: it measures active
//    time on the site, not how much anyone learned. Before rules v14 are published it stays hidden and writes stop quietly.
export const STUDY_PAGES = ["cardio.html", "neuro.html", "henderson.html", "law.html", "mgmt.html", "quality.html", "pharma.html", "3d.html", "quiz.html", "exams.html"];
export const IDLE_MS = 90000, FIRST_S = 60, EVERY_MS = 180000, CREATE_MAX = 300, DAY_MAX = 57600;
/* ---------- pure helpers (tests import them) ---------- */
export function mayCount(page, visible, focused, sinceInput) { return STUDY_PAGES.includes(page) && !!visible && !!focused && sinceInput >= 0 && sinceInput < IDLE_MS; }
// seconds to add for one tick: real elapsed time, capped (a sleeping laptop / throttled timer never adds a burst)
export function tickSec(lastMs, nowMs) { return Math.max(0, Math.min(20, Math.floor((nowMs - lastMs) / 1000))); }
export function dueWrite(pending, lastWrite, now) { return pending >= FIRST_S && (!lastWrite || now - lastWrite >= EVERY_MS); }
// the value to write: old + this tab's measured seconds (create ≤ 5 min, a day ≤ 16 h)
export function nextS(old, add, exists) { const s = Math.min(DAY_MAX, Math.max(0, old | 0) + Math.max(0, add | 0)); return exists ? s : Math.min(s, CREATE_MAX); }
export function fmtTime(sec) { const m = Math.floor(Math.max(0, sec | 0) / 60); return m < 1 ? "أقل من دقيقة" : m < 60 ? m + " د" : Math.floor(m / 60) + " س " + (m % 60) + " د"; }
export function rankBoard(docs, scope, day) {
  const seen = new Set();
  return (docs || []).filter(x => x && x.uid && x.d === day && (x.s | 0) >= 60 && scope.has(x.uid) && !seen.has(x.uid) && seen.add(x.uid))
    .sort((a, b) => (b.s | 0) - (a.s | 0) || String(a.n).localeCompare(String(b.n))).slice(0, 50);
}
/* ---------- browser ---------- */
let A = null, F = null, day = "", pending = 0, last = 0, inputAt = 0, writeAt = 0, writing = false, denied = 0, boards = [];
const page = (typeof location !== "undefined" && location.pathname.split("/").pop()) || "index.html";
const esc = s => (A && A.esc ? A.esc(s) : String(s == null ? "" : s));
function tick() {
  if (!A || !A.user || denied > 1) return;
  const now = Date.now(), add = tickSec(last, now), today = A.N.dayKey(); last = now;
  if (today !== day) { pending = 0; writeAt = 0; day = today; return; }       // a new Beirut day starts at 0 (nothing carried over)
  if (add && mayCount(page, document.visibilityState === "visible", document.hasFocus(), now - inputAt)) pending += add;
  if (dueWrite(pending, writeAt, now)) flush();
}
async function flush() {
  if (writing || pending < 15 || !A || !A.user || denied > 1) return;
  writing = true; const add = pending, d = day; pending = 0;
  try {
    const ref = F.doc(A.db, "studyTime", d + "_" + A.user.uid), snap = await F.getDoc(ref), p = A.profile || {};
    const s = nextS(snap.exists() ? snap.data().s : 0, add, snap.exists());
    await F.setDoc(ref, { uid: A.user.uid, d, s, n: A.N.cleanName(p.name || A.user.displayName).slice(0, 39), ph: String(p.photo || "").slice(0, 500), t: F.serverTimestamp() });
    writeAt = Date.now(); denied = 0;
  } catch (e) { if (e && e.code === "permission-denied") denied++; else pending += add; }   // denied twice = rules v14 not published → stop
  writing = false;
}
function rowHtml(x, i, me) {
  const N = A.N, medal = ["🥇", "🥈", "🥉"][i] || (i + 1) + ".";
  return '<li class="strow' + (x.uid === me ? " me" : "") + '"><span class="strk">' + medal + "</span>" + N.avatar(x.ph, x.n, "av") +
    '<span class="nm"><bdi>' + esc(N.cleanName(x.n)) + "</bdi>" + (A.pdot ? A.pdot(x.uid) : "") + '</span><b class="stt">' + esc(fmtTime(x.s)) + "</b></li>";
}
async function drawBoard(el, scopeFn) {
  try {
    const today = A.N.dayKey();
    const [ids, snap] = await Promise.all([scopeFn(), F.getDocs(F.query(F.collection(A.db, "studyTime"), F.where("d", "==", today), F.limit(400)))]);
    const scope = new Set([A.user.uid, ...ids]);
    const list = rankBoard(snap.docs.map(x => x.data()), scope, today);
    el.hidden = false;
    el.innerHTML = '<h2>⏱️ وقت الدرس اليوم <small dir="ltr">' + esc(today) + "</small></h2>" +
      '<p class="small sthint">بيقيس الوقت النشط عالموقع بس (صفحات الدروس والكويز، والصفحة قدّامك وعم تستعملها)، مش قديش تعلّمت. الألعاب والمحادثات والأستاذ عثمان ما بينحسبوا.</p>' +
      (list.length ? '<ol class="lb stb">' + list.map((x, i) => rowHtml(x, i, A.user.uid)).join("") + "</ol>"
        : '<p class="small fempty">لسّا ما حدا من صفّك أو أصحابك درس دقيقة اليوم. افتح درس وكون الأوّل 💪</p>');
  } catch (e) { if (e && e.code === "permission-denied") el.hidden = true; else console.warn("nursin: study time", e && e.code); }
}
// class page: the same board limited to that class's members (classes.js calls it)
export function classBoard(api, el, memberIds) { if (!A) { A = api; F = api.fs; } if (el && api.user) drawBoard(el, async () => memberIds || []); }
export function start(api) {
  if (A && A.user) return;
  A = api; F = api.fs; day = api.N.dayKey(); last = Date.now();
  if (STUDY_PAGES.includes(page)) {
    const mark = e => { const t = e.target; if (t && t.closest && t.closest(".adx,.ad-slot,.gnav-ad")) return; inputAt = Date.now(); };
    ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(ev => document.addEventListener(ev, mark, { passive: true, capture: true }));
    inputAt = Date.now();                       // opening a lesson is an action
    setInterval(tick, 10000);
    document.addEventListener("visibilitychange", () => { tick(); if (document.visibilityState === "hidden") flush(); });
    addEventListener("pagehide", () => { tick(); flush(); });
  }
  const el = document.getElementById("stboard");
  if (el) {
    const go = () => { if (document.visibilityState === "visible") drawBoard(el, () => api.scopeIds()); };
    go(); setInterval(go, EVERY_MS);
  }
}
// tests / screenshots: draw a given board without Firebase
export function _mock(api, el, list) { A = api; el.hidden = false; el.innerHTML = '<h2>⏱️ وقت الدرس اليوم <small dir="ltr">' + esc(api.N.dayKey()) + '</small></h2><p class="small sthint">بيقيس الوقت النشط عالموقع بس (صفحات الدروس والكويز، والصفحة قدّامك وعم تستعملها)، مش قديش تعلّمت. الألعاب والمحادثات والأستاذ عثمان ما بينحسبوا.</p><ol class="lb stb">' + list.map((x, i) => rowHtml(x, i, api.user.uid)).join("") + "</ol>"; }
