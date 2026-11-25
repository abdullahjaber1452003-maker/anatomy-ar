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

/* ---------- 📚 Live Study Buddy (Group Hall + 1-on-1) feed for Home Stories Bar + Site-Wide Toast ---------- */
let sbUnsub = null, sbGroupTimer = 0;
const sbDismissed = new Set();
const livePeers = { group: [], rooms: [], online: [] };
window.NursinLivePeers = livePeers;
function emitLivePeers() {
  try { document.dispatchEvent(new CustomEvent("nursin:live-peers", { detail: livePeers })); } catch (e) {}
}
function showStudyToast(item) {
  if (!item || sbDismissed.has(item.key)) return;
  let el = document.getElementById("sb-live-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "sb-live-toast";
    el.style.cssText = "position:fixed;bottom:76px;left:12px;right:12px;max-width:440px;margin:0 auto;z-index:9990;background:#0f172a;color:#f8fafc;border:1px solid rgba(16,185,129,.5);border-radius:16px;padding:12px 14px;box-shadow:0 12px 32px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13.5px;direction:rtl";
    document.body.appendChild(el);
  }
  const href = item.roomId ? ("study-buddy.html?room=" + encodeURIComponent(item.roomId)) : "study-buddy.html";
  const btnTxt = item.roomId ? "🤝 ذاكر معه" : "🏫 فوت عالقاعة";
  el.innerHTML = '<div><b>📚 ' + esc(item.name) + ' عم يدرس هلق!</b><div style="font-size:12px;opacity:.85">' + esc(item.topic || "مراجعة") + ' · معهد الزهراء — بدك تذاكر معه؟</div></div>' +
    '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0"><a class="btn pri sm" href="' + href + '" style="white-space:nowrap">' + btnTxt + '</a>' +
    '<button type="button" id="sb-toast-x" aria-label="إغلاق" style="background:transparent;border:0;color:#94a3b8;font-size:16px;cursor:pointer;padding:4px">✕</button></div>';
  el.hidden = false;
  const xb = document.getElementById("sb-toast-x");
  if (xb) xb.onclick = () => { sbDismissed.add(item.key); el.hidden = true; };
}
function pickToast() {
  if (page === "study-buddy.html") return;
  const cand = livePeers.rooms[0]
    ? { key: "r:" + livePeers.rooms[0].id, roomId: livePeers.rooms[0].id, name: livePeers.rooms[0].hostName, topic: livePeers.rooms[0].topic }
    : livePeers.group[0]
      ? { key: "g:" + livePeers.group[0].uid, roomId: "", name: livePeers.group[0].name, topic: livePeers.group[0].subj }
      : null;
  const el = document.getElementById("sb-live-toast");
  if (cand && !sbDismissed.has(cand.key)) showStudyToast(cand);
  else if (el) el.hidden = true;
}
async function pollGroupHall() {
  if (!A || !A.user) return;
  try {
    const now = Date.now();
    const gq = F.query(F.collection(A.db, "users"), F.where("sbMode", "==", "group"), F.limit(20));
    const snap = await F.getDocs(gq);
    const gl = [];
    snap.forEach(d => {
      const r = d.data() || {};
      if (!r.sbAt || now - r.sbAt > 25 * 60000) return;
      if (d.id === A.user.uid) return;
      gl.push({ uid: d.id, name: r.name || "طالب تمريض", photo: r.photo || "", subj: r.sbSubj || "مراجعة", at: r.sbAt });
    });
    gl.sort((a, b) => b.at - a.at);
    livePeers.group = gl;
    livePeers.online = online.slice();
    emitLivePeers();
    pickToast();
  } catch (e) {}
}
function watchStudyRooms() {
  if (sbUnsub || !A || !A.user) return;
  pollGroupHall();
  if (!sbGroupTimer) sbGroupTimer = setInterval(pollGroupHall, 30000);
  try {
    const q = F.query(F.collection(A.db, "rooms"), F.where("state", "==", "waiting"), F.where("guest", "==", null), F.where("invited", "==", null), F.limit(10));
    sbUnsub = F.onSnapshot(q, snap => {
      const now = Date.now(), list = [];
      snap.forEach(d => {
        const r = d.data() || {};
        if (!Array.isArray(r.qids) || r.qids[0] !== "sb_25") return;
        if (r.host === A.user.uid) return;
        if (r.hostSeen && now - r.hostSeen > 15 * 60000) return;
        list.push({ id: d.id, hostName: r.hostName || "طالب تمريض", topic: r.topic || "مراجعة", at: r.hostSeen || now });
      });
      livePeers.rooms = list;
      emitLivePeers();
      pickToast();
    }, () => {});
  } catch (e) {}
}

window.NursinOnline = { open: () => { if (A) openList(); }, count: () => online.length };   // the home tile opens the same list
export function start(api) {
  if (A) return;
  A = api; F = api.fs; page = location.pathname.split("/").pop() || "index.html";
  beat(true);
  watchStudyRooms();
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
