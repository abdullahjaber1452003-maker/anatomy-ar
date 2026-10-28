// nursin «🟢 مين أونلاين» (Abdullah, Oct 27 10:04 PM + 11:07 PM): a signed-in student writes presence/{uid} {t, n, ph} about every
// 60 s while the tab is VISIBLE (hidden tab = no writes); "online" = t within 2 min. Shown only to classmates + friends (classmates are
// auto-friends): a green dot next to names on friends / classes / chat, and on the home page a chip «🟢 N أونلاين هلّق» that opens the
// list with a one-tap «💬 حكي» (chat.html?with=uid). Nothing is shown in quizzes, games or the timer. Reads are ONE query per minute on
// the pages that show it (presence where t > now − 2 min). Rules v13 add presence; before he publishes them it stays silent.
// Loaded by assets/fb.js for every signed-in visitor. The pure helpers at the top have no browser/Firebase needs (tests import them).

export const BEAT_MS = 60000, ONLINE_MS = 120000, SCOPE_TTL = 600000;
export const SHOW_PAGES = ["index.html", "friends.html", "classes.html", "chat.html"];

/* ---------- pure helpers ---------- */
export function tsMs(t) { return !t ? 0 : typeof t.toMillis === "function" ? t.toMillis() : t.seconds != null ? t.seconds * 1000 : t.__ts != null ? +t.__ts : +t || 0; }
// online = last beat within 2 min (a clock a few minutes ahead still counts, a stale doc never does)
export function isOnline(t, now) { const m = tsMs(t); return m > 0 && now - m <= ONLINE_MS && m - now <= 5 * 60000; }
// presence docs → the people I may see who are online now: in my scope (friends + classmates), not me, sorted by name
export function pickOnline(docs, scope, me, now) {
  const seen = new Set();
  return (docs || []).filter(d => d && d.uid && d.uid !== me && scope && scope.has(d.uid) && isOnline(d.t, now) && !seen.has(d.uid) && seen.add(d.uid))
    .map(d => ({ uid: d.uid, name: String(d.n || ""), photo: String(d.ph || ""), t: tsMs(d.t) }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
export function chipText(n) { return n ? "🟢 " + n + " أونلاين هلّق" : "🟢 ما حدا أونلاين هلّق"; }
// write again? only when visible and the last beat is ~a minute old (a tab flipping back and forth costs nothing extra)
export function dueBeat(last, now, visible) { return !!visible && (!last || now - last >= BEAT_MS - 15000); }
export function showsHere(page) { return SHOW_PAGES.includes(page || "index.html"); }

/* ---------- browser ---------- */
let A = null, F = null, last = 0, off = false, readOff = false, online = [], scope = null, timer = 0, page = "index.html";
const esc = s => (A && A.esc ? A.esc(s) : String(s == null ? "" : s));

async function beat(force) {
  if (off || !A.user) return;
  const now = Date.now();
  if (!force && !dueBeat(last, now, document.visibilityState === "visible")) return;
  last = now;
  const p = A.profile || {};
  try {
    await F.setDoc(F.doc(A.db, "presence", A.user.uid), { t: F.serverTimestamp(), n: A.N.cleanName(p.name || A.user.displayName).slice(0, 39), ph: String(p.photo || "").slice(0, 500) });
  } catch (e) { if (e && e.code === "permission-denied") off = true; else last = 0; }   // rules v13 not published yet → stop quietly
}

const SKEY = "nursin_pscope_v1";
async function getScope() {
  if (scope) return scope;
  try { const c = JSON.parse(sessionStorage.getItem(SKEY) || "null"); if (c && c.u === A.user.uid && Date.now() - c.at < SCOPE_TTL) return (scope = new Set(c.ids)); } catch (e) {}
  let ids = [];
  try { ids = A.scopeIds ? await A.scopeIds() : (await A.loadFriends()).map(p => p.uid); } catch (e) { ids = []; }
  try { sessionStorage.setItem(SKEY, JSON.stringify({ u: A.user.uid, at: Date.now(), ids })); } catch (e) {}
  return (scope = new Set(ids));
}

async function refresh() {
  if (readOff || !A.user || document.visibilityState !== "visible") return;
  try {
    const sc = await getScope();
    if (!sc.size) { online = []; paint(); return; }
    const q = F.query(F.collection(A.db, "presence"), F.where("t", ">", new Date(Date.now() - ONLINE_MS)), F.limit(300));
    const docs = (await F.getDocs(q)).docs.map(d => ({ uid: d.id, ...d.data() }));
    online = pickOnline(docs, sc, A.user.uid, Date.now());
    paint();
  } catch (e) { if (e && e.code === "permission-denied") { readOff = true; const c = document.getElementById("onl"); if (c) c.hidden = true; } }
}

function markDots() {
  const set = new Set(online.map(p => p.uid));
  document.querySelectorAll(".pdot[data-puid]").forEach(i => {
    const on = set.has(i.dataset.puid);
    i.classList.toggle("on", on); i.hidden = !on;
    if (on) { i.title = "أونلاين هلّق"; i.setAttribute("aria-label", "أونلاين هلّق"); }
  });
}
function paint() {
  markDots();
  try { document.dispatchEvent(new CustomEvent("nursin:tile", { detail: { k: "onl", n: online.length } })); } catch (e) {}   // 🏠 home tile «🟢 أونلاين» (assets/tiles.js)
  const c = document.getElementById("onl");
  if (!c) return;
  c.hidden = false;
  c.innerHTML = '<button class="onlchip' + (online.length ? " on" : "") + '" id="onlbtn" type="button" aria-haspopup="dialog">' + esc(chipText(online.length)) + "</button>";
  document.getElementById("onlbtn").addEventListener("click", openList);
  const s = document.getElementById("onlsheet"); if (s && !s.hidden) fillList(s);
}
function fillList(s) {
  const N = A.N;
  s.querySelector(".onll").innerHTML = online.length ? online.map(p =>
    '<li class="onlr">' + N.avatar(p.photo, p.name, "av") + '<span class="nm"><b><bdi>' + esc(N.cleanName(p.name)) + '</bdi></b> <i class="pdot on" aria-label="أونلاين هلّق"></i></span>' +
    '<a class="btn pri sm" href="chat.html?with=' + encodeURIComponent(p.uid) + '">💬 حكي</a></li>').join("")
    : '<li class="small fempty">ما حدا من صفّك أو أصحابك أونلاين هلّق. ارجع بعد شوي 👀</li>';
}
function openList() {
  let s = document.getElementById("onlsheet");
  if (!s) {
    s = document.createElement("div"); s.id = "onlsheet"; s.className = "onlsheet"; s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true"); s.setAttribute("aria-label", "مين أونلاين هلّق");
    s.innerHTML = '<div class="onlbox"><div class="onlhd"><b>🟢 مين أونلاين هلّق</b><button class="btn sm" type="button" id="onlx" aria-label="سكّر">✖</button></div>' +
      '<p class="small">من صفّك وأصحابك. كبوس «💬 حكي» وابعتلو رسالة.</p><ul class="onll"></ul></div>';
    document.body.appendChild(s);
    s.addEventListener("click", e => { if (e.target === s || e.target.closest("#onlx")) s.hidden = true; });
    document.addEventListener("keydown", e => { if (e.key === "Escape") s.hidden = true; });
  }
  fillList(s); s.hidden = false;
}

window.NursinOnline = { open: () => { if (A) openList(); }, count: () => online.length };   // the home tile opens the same list
export function start(api) {
  if (A) return;
  A = api; F = api.fs; page = location.pathname.split("/").pop() || "index.html";
  beat(true);
  const shows = showsHere(page);
  if (shows) refresh();
  timer = setInterval(() => { beat(); if (shows) refresh(); }, BEAT_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { beat(); if (shows) refresh(); } });
  if (shows) {   // names drawn later (board, members, chat list) get their dot without another read
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(markDots, 150); }).observe(document.body, { childList: true, subtree: true });
  }
}
// tests / screenshots: draw a given state without Firebase
export function _mock(api, list) { A = api; online = list; paint(); }
