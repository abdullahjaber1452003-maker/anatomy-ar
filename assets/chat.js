// 💬 chats (v7 rules): 1:1 between friends + groups (≤ 15). Text only, ≤ 500 chars. Live (onSnapshot) only while a chat is open, last 50 messages.
// 🔔 after a send, NursinPWA.ping asks the worker's /push to notify the other members (rules v8 pushSubs). Loaded by fb.js on chat.html. Until rules v7 are published every read is permission-denied → a calm «عم يتجهّز» note, no errors.
const OWNER = "abdullahjaber1452003@gmail.com", MAXM = 15, SEEN = "nursin_chat_seen_v1";
let API, el, unsub = null, friendsP = null;
const $ = id => document.getElementById(id);
const ms = t => (t && t.toMillis ? t.toMillis() : 0);
const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || "{}"); } catch (e) { return {}; } };
const markSeen = (cid, t) => { const s = seen(); s[cid] = Math.max(s[cid] || 0, t || Date.now()); try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch (e) {} };
const isAdmin = () => { const u = API.user; return !!(u && u.email === OWNER && u.emailVerified); };
const myName = () => API.N.cleanName(API.profile && API.profile.name);
const friends = () => friendsP || (friendsP = API.loadFriends().catch(() => []));
function stop() { if (unsub) { unsub(); unsub = null; } }
function soon(e) {
  if (e && e.code !== "permission-denied") console.warn("nursin: chat", e && e.code);
  el.innerHTML = '<div class="qcard"><p class="fbig">💬 المحادثات عم تتجهّز…</p><p>رجاع بعد شوي 🙏</p><p><a class="btn" href="friends.html">🏆 أصحابي</a></p></div>';
}
// ✏️ Oct 31 2026 («غيّر اسمك»): a chat doc keeps the names it was opened with (only a group's creator may rewrite them), so names are
// shown from each person's profile (users/{uid}.name = his chosen name) when it can be read, else the stored copy.
const FRESH = {};
const nameOf = (uid, stored) => FRESH[uid] || stored || "";
async function freshNames(uids) {
  if (API.user) FRESH[API.user.uid] = myName();
  try { (await friends()).forEach(f => { if (f && f.uid && f.name) FRESH[f.uid] = API.N.cleanName(f.name); }); } catch (e) {}
  const { doc, getDoc } = API.fs, need = [...new Set(uids || [])].filter(u => u && !FRESH[u]).slice(0, 40);
  await Promise.all(need.map(u => getDoc(doc(API.db, "users", u)).then(s => { const n = s.exists() && s.data().name; if (n) FRESH[u] = API.N.cleanName(n); }).catch(() => {})));
}
function title(c) {
  if (c.type === "group") return "👥 " + c.name;
  if (c.type === "class") return "🏫 " + c.name;
  const o = c.members.find(m => m !== API.user.uid);
  return nameOf(o, c.names && c.names[o]) || "صاحب";
}
const go = q => { history.pushState(null, "", "chat.html" + q); route(); };

export function page(api) {
  API = api; el = $("chat-app"); if (!el) return;
  window.addEventListener("popstate", route);
  window.addEventListener("pagehide", stop);
  route();
}
async function route() {
  stop();
  if (!API.user) { el.innerHTML = '<div id="csign"></div>'; API.signInCard($("csign"), "<p>💬 سجّل دخول بغوغل تا تحكي مع أصحابك وتدرسو سوا.</p>"); return; }
  const p = new URLSearchParams(location.search);
  if (p.get("with")) return openDM(p.get("with"));
  if (p.get("c")) return openRoom(p.get("c"));
  if (p.get("class")) return openClassChat(p.get("class"));
  if (p.get("new") != null) return newGroup();
  return drawList();
}

/* ---------- list ---------- */
async function drawList() {
  const { collection, query, where, limit, getDocs } = API.fs, me = API.user.uid;
  el.innerHTML = "<p>⏳ …</p>";
  let docs;
  try { docs = (await getDocs(query(collection(API.db, "chats"), where("members", "array-contains", me), limit(50)))).docs; }
  catch (e) { return soon(e); }
  const s = seen(), list = docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt));
  el.innerHTML = '<p class="fbtns"><button class="btn pri" id="cnew" type="button">➕ مجموعة جديدة</button> <a class="btn" href="friends.html">🏆 أصحابي</a></p>' +
    (list.length ? '<ul class="clist">' + list.map(c => {
      const l = c.last, unread = l && l.by !== me && ms(l.at) > (s[c.id] || 0);
      const peer = c.type === "dm" ? (c.members || []).find(u => u !== me) : "";   // 🟢 online dot on a DM row
      return '<li><a class="crow" href="chat.html?c=' + encodeURIComponent(c.id) + '"><b><bdi data-ct="' + API.esc(c.id) + '">' + API.esc(title(c)) + "</bdi>" + (peer && API.pdot ? API.pdot(peer) : "") + "</b>" + (unread ? '<i class="cdot" aria-label="جديد"></i>' : "") +
        '<small>' + (l ? (c.type === "group" ? '<bdi data-cl="' + API.esc(c.id) + '">' + API.esc(nameOf(l.by, l.name)) + "</bdi>: " : "") + API.esc(l.text.slice(0, 70)) : "…") + "</small></a></li>";
    }).join("") + "</ul>" : '<p class="small">لسّا ما في محادثات. كبوس «💬 حكي» حدّ أي صاحب بصفحة أصحابي، أو اعمل مجموعة تدرسو فيها سوا.</p>') +
    '<div id="cpush"></div>';
  $("cnew").addEventListener("click", () => go("?new"));
  if (window.NursinPWA) window.NursinPWA.pushCard($("cpush"), API);   // 🔔 notifications opt-in (assets/pwa.js)
  // ✏️ then the current names (a friend who renamed himself shows his new name)
  freshNames(list.flatMap(c => c.type === "dm" ? (c.members || []).filter(u => u !== me) : c.type === "group" && c.last ? [c.last.by] : [])).then(() => {
    list.forEach(c => {
      el.querySelectorAll("[data-ct]").forEach(b => { if (b.getAttribute("data-ct") === c.id) b.textContent = title(c); });
      if (c.type === "group" && c.last) el.querySelectorAll("[data-cl]").forEach(b => { if (b.getAttribute("data-cl") === c.id) b.textContent = nameOf(c.last.by, c.last.name); });
    });
  });
}

/* ---------- DM ---------- */
async function openDM(fid) {
  const { doc, getDoc, setDoc, serverTimestamp } = API.fs, me = API.user.uid;
  const members = [me, fid].sort(), cid = members.join("_");
  el.innerHTML = "<p>⏳ …</p>";
  try {
    const s = await getDoc(doc(API.db, "chats", cid));
    if (!s.exists()) {
      const f = (await friends()).find(x => x.uid === fid) || (await getDoc(doc(API.db, "users", fid)).then(d => d.data()).catch(() => null));
      if (f && f.mate && !f.fr) await setDoc(doc(API.db, "users", me, "friends", fid), { since: serverTimestamp() });   // 🏫 classmate: the DM rule wants a friend link → made here, once
      await setDoc(doc(API.db, "chats", cid), { type: "dm", members, names: { [me]: myName(), [fid]: API.N.cleanName(f && f.name) }, updatedAt: serverTimestamp() });
    }
  } catch (e) {                                // rules up but refused = not friends (either one adding the other's code is enough)
    if (e && e.code === "permission-denied" && await rulesUp()) { el.innerHTML = '<div class="qcard"><p>💬 فيك تحكي بس مع أصحابك. زيدو بالكود بصفحة <a href="friends.html">أصحابي</a>.</p></div>'; return; }
    return soon(e);
  }
  history.replaceState(null, "", "chat.html?c=" + encodeURIComponent(cid));
  openRoom(cid);
}

/* ---------- a chat ---------- */
async function openRoom(cid) {
  const { doc, getDoc, collection, query, orderBy, limit, onSnapshot } = API.fs, me = API.user.uid;
  let c;
  try { const s = await getDoc(doc(API.db, "chats", cid)); if (!s.exists() || !s.data().members.includes(me)) throw { code: "gone" }; c = s.data(); }
  catch (e) { if (e && e.code === "permission-denied" && !(await rulesUp())) return soon(e); el.innerHTML = '<div class="qcard"><p>💬 هالمحادثة مش موجودة أو ما عدت فيها.</p><p><a class="btn" href="chat.html">← المحادثات</a></p></div>'; return; }
  const group = c.type === "group" || c.type === "class", owner = c.type === "group" && c.owner === me;
  el.innerHTML = '<div class="chead"><a class="btn sm" href="chat.html" id="cback">→</a><b><bdi id="ctitle">' + API.esc(title(c)) + "</bdi>" + (c.type === "dm" && API.pdot ? API.pdot((c.members || []).find(u => u !== me)) : "") + "</b>" +
    (group ? '<button class="btn sm" id="cmem" type="button">👥 ' + c.members.length + "</button>" : "") + "</div>" +
    '<div id="cpanel" hidden></div><ol class="cmsgs" id="cmsgs" aria-live="polite"><li class="small">⏳ …</li></ol>' +
    '<form class="cform" id="cform"><textarea id="ctext" maxlength="500" rows="1" placeholder="اكتب رسالة…" aria-label="رسالة"></textarea><button class="btn pri" type="submit">ابعت</button></form><p class="small" id="cmsg" aria-live="polite"></p>';
  $("cback").addEventListener("click", e => { e.preventDefault(); go(""); });
  if (group) $("cmem").addEventListener("click", () => { const p = $("cpanel"); p.hidden = !p.hidden; if (!p.hidden) drawMembers(cid, c, owner); });
  const box = $("cmsgs");
  let msgs = [];
  const paint = () => {
    const adm = isAdmin();
    box.innerHTML = msgs.length ? msgs.map(m => {
      const mine = m.uid === me;
      return '<li class="cb' + (mine ? " me" : "") + '">' + (group && !mine ? "<small><bdi>" + API.esc(nameOf(m.uid, m.name)) + "</bdi></small>" : "") +
        '<span class="ct">' + API.esc(m.text) + "</span>" + (mine || adm ? '<button class="cdel" type="button" data-id="' + API.esc(m.id) + '" aria-label="امحي">🗑</button>' : "") + "</li>";
    }).join("") : '<li class="small">ابدا الحديث 👋 مثلاً: «شو رأيك نبلّش بدرس كذا؟»</li>';
    box.scrollTop = box.scrollHeight;
  };
  unsub = onSnapshot(query(collection(API.db, "chats", cid, "messages"), orderBy("createdAt", "desc"), limit(50)), snap => {
    msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    paint();
    markSeen(cid, Math.max(Date.now(), ...msgs.map(m => ms(m.createdAt))));
  }, e => { stop(); soon(e); });
  freshNames(c.members).then(() => { const t = $("ctitle"); if (t) t.textContent = title(c); if (group) paint(); });   // ✏️ current names
  box.addEventListener("click", async e => {
    const b = e.target.closest(".cdel"); if (!b || !confirm("تمحي هالرسالة؟")) return;
    const last = box.lastElementChild && box.lastElementChild.querySelector(".cdel") === b;
    try {
      await API.fs.deleteDoc(doc(API.db, "chats", cid, "messages", b.dataset.id));
      if (last) await API.fs.updateDoc(doc(API.db, "chats", cid), { last: null }).catch(() => {});
    } catch (x) { console.warn("nursin: chat delete", x && x.code); }
  });
  const t = $("ctext"), form = $("cform");
  t.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = t.value.trim().slice(0, 500); if (!text) return;
    const { writeBatch, serverTimestamp, updateDoc } = API.fs, name = myName(), b = writeBatch(API.db);
    b.set(doc(collection(API.db, "chats", cid, "messages")), { text, uid: me, name, createdAt: serverTimestamp() });
    b.update(doc(API.db, "chats", cid), { last: { text: text.slice(0, 100), by: me, name, at: serverTimestamp() }, updatedAt: serverTimestamp() });
    t.value = ""; $("cmsg").textContent = "";
    try { await b.commit(); if (window.NursinPWA) window.NursinPWA.ping(API, cid); } catch (x) { t.value = text; $("cmsg").textContent = "⚠️ ما انبعتت، استنّى ثانية وجرّب كمان مرّة."; console.warn("nursin: chat send", x && x.code); }
  });
}
async function rulesUp() {                     // a permission error on a chat id: rules missing (→ «عم يتجهّز») or simply not a member
  try { await API.fs.getDocs(API.fs.query(API.fs.collection(API.db, "chats"), API.fs.where("members", "array-contains", API.user.uid), API.fs.limit(1))); return true; }
  catch (e) { return false; }
}

/* ---------- groups ---------- */
function pickHtml(list, taken) {
  const l = list.filter(f => !taken.includes(f.uid));
  return l.length ? '<ul class="cpick">' + l.map(f => '<li><label><input type="checkbox" value="' + API.esc(f.uid) + '"> <bdi>' + API.esc(API.N.cleanName(f.name)) + "</bdi></label></li>").join("") + "</ul>"
    : '<p class="small">ما في أصحاب تزيدن. زيد أصحاب بالكود بصفحة <a href="friends.html">أصحابي</a>.</p>';
}
async function newGroup() {
  el.innerHTML = '<div class="qcard"><h2>➕ مجموعة جديدة</h2><p><input id="gname" class="finp" maxlength="40" placeholder="اسم المجموعة (مثلاً: دراسة القلب)"></p>' +
    '<p class="small">زيد أصحابك (لغاية ' + (MAXM - 1) + "):</p><div id=\"gpick\">⏳ …</div>" +
    '<p class="fbtns"><button class="btn pri" id="gmake" type="button">اعمل المجموعة</button> <a class="btn" href="chat.html">رجوع</a></p><p class="small" id="gmsg" aria-live="polite"></p></div>';
  const list = await friends(); $("gpick").innerHTML = pickHtml(list, []);
  $("gmake").addEventListener("click", async () => {
    const name = $("gname").value.replace(/\s+/g, " ").trim().slice(0, 40), ids = [...el.querySelectorAll(".cpick input:checked")].map(i => i.value);
    const msg = s => { $("gmsg").textContent = s; };
    if (!name) return msg("اكتب اسم للمجموعة.");
    if (ids.length > MAXM - 1) return msg("الحد " + MAXM + " أشخاص مع إلك.");
    const me = API.user.uid, names = { [me]: myName() };
    ids.forEach(id => { const f = list.find(x => x.uid === id); names[id] = API.N.cleanName(f && f.name); });
    const { doc, collection, setDoc, serverTimestamp } = API.fs, ref = doc(collection(API.db, "chats"));
    try { await setDoc(ref, { type: "group", name, owner: me, members: [me, ...ids], names, updatedAt: serverTimestamp() }); go("?c=" + ref.id); }
    catch (e) { if (e && e.code === "permission-denied") return soon(e); msg("⚠️ ما زبط هلّق، جرّب بعد شوي."); }
  });
}
async function drawMembers(cid, c, owner) {
  const p = $("cpanel"), me = API.user.uid, { doc, updateDoc } = API.fs;
  const save = async (members, names) => {
    try { await updateDoc(doc(API.db, "chats", cid), { members, names }); c.members = members; c.names = names; $("cmem").textContent = "👥 " + members.length; drawMembers(cid, c, owner); }
    catch (e) { console.warn("nursin: chat members", e && e.code); alert("ما زبط هلّق، جرّب بعد شوي."); }
  };
  p.innerHTML = '<div class="qcard"><ul class="cmemb">' + c.members.map(u => "<li><bdi>" + API.esc(nameOf(u, c.names && c.names[u]) || "طالب") + "</bdi>" + (u === c.owner ? " <small>(عامل المجموعة)</small>" : "") +
    (owner && u !== me ? ' <button class="rm" type="button" data-uid="' + API.esc(u) + '" aria-label="شيل">✕</button>' : "") + "</li>").join("") + "</ul>" +
    (owner ? (c.members.length < MAXM ? '<p class="small">زيد أصحاب:</p><div id="gpick">⏳ …</div><button class="btn sm" id="gadd" type="button">➕ زيد</button>' : '<p class="small">وصلتو للحد (' + MAXM + ").</p>")
      : c.type === "class" ? '<p class="small">🏫 كل طلاب الصف بيفوتو هون لحالهن، وبيطلعو لمّا يطلعو من الصف.</p>' : '<button class="btn sm" id="gleave" type="button">🚪 اطلع من المجموعة</button>') + "</div>";
  p.querySelectorAll(".rm").forEach(b => b.addEventListener("click", () => {
    if (!confirm("تشيلو من المجموعة؟")) return;
    const names = { ...c.names }; delete names[b.dataset.uid];
    save(c.members.filter(u => u !== b.dataset.uid), names);
  }));
  if ($("gleave")) $("gleave").addEventListener("click", async () => {
    if (!confirm("أكيد بدّك تطلع من المجموعة؟")) return;
    const names = { ...c.names }; delete names[me];
    try { stop(); await updateDoc(doc(API.db, "chats", cid), { members: c.members.filter(u => u !== me), names }); go(""); } catch (e) { console.warn("nursin: chat leave", e && e.code); }
  });
  if ($("gpick")) {
    const list = await friends(); $("gpick").innerHTML = pickHtml(list, c.members);
    $("gadd").addEventListener("click", () => {
      const ids = [...p.querySelectorAll(".cpick input:checked")].map(i => i.value); if (!ids.length) return;
      if (c.members.length + ids.length > MAXM) return alert("الحد " + MAXM + " أشخاص.");
      const names = { ...c.names }; ids.forEach(id => { const f = list.find(x => x.uid === id); names[id] = API.N.cleanName(f && f.name); });
      save([...c.members, ...ids], names);
    });
  }
}

/* ---------- 🏫 «💬 مجموعة الصف» (Abdullah, Oct 27 1:56 PM): one group chat per class, every class member in it ----------
   chats/cls-<classId> {type:"class", cls, name, members, names, updatedAt}. Rules v11: any member of classes/<classId> may create it
   with himself in it, add or remove HIMSELF; the class owner / site admin may remove anyone; messages = same rules as every chat
   (text only, ≤ 500, admin silent delete). Joining happens by itself when a member opens his class (classes.js → classJoin) or this
   chat; leaving the class takes him out (classLeave). Until rules v11 are published every write is refused → a calm note. */
export const classChatId = classId => "cls-" + classId;
export async function classJoin(api, classId, className) {
  const { doc, runTransaction, serverTimestamp } = api.fs, me = api.user.uid, ref = doc(api.db, "chats", classChatId(classId)), name = api.N.cleanName(api.profile && api.profile.name);
  await runTransaction(api.db, async tx => {
    const s = await tx.get(ref);
    if (!s.exists()) { tx.set(ref, { type: "class", cls: classId, name: String(className || "").slice(0, 40) || "الصف", members: [me], names: { [me]: name }, updatedAt: serverTimestamp() }); return; }
    const c = s.data(); if ((c.members || []).includes(me)) return;
    tx.update(ref, { members: [...c.members, me], names: { ...(c.names || {}), [me]: name } });
  });
  return classChatId(classId);
}
export async function classLeave(api, classId, uid) {
  const { doc, runTransaction } = api.fs, ref = doc(api.db, "chats", classChatId(classId));
  await runTransaction(api.db, async tx => {
    const s = await tx.get(ref); if (!s.exists()) return;
    const c = s.data(); if (!(c.members || []).includes(uid)) return;
    const names = { ...(c.names || {}) }; delete names[uid];
    tx.update(ref, { members: c.members.filter(u => u !== uid), names });
  });
}
async function openClassChat(classId) {
  const { doc, getDoc } = API.fs, me = API.user.uid;
  el.innerHTML = "<p>⏳ …</p>";
  let cls;
  try {
    const s = await getDoc(doc(API.db, "classes", classId)); if (!s.exists()) throw { code: "gone" }; cls = s.data();
    const m = await getDoc(doc(API.db, "classes", classId, "members", me)); if (!m.exists()) throw { code: "gone" };
  } catch (e) { el.innerHTML = '<div class="qcard"><p>🏫 لازم تكون بالصف تا تفوت على مجموعتو.</p><p><a class="btn" href="classes.html">🏫 صفوفي</a></p></div>'; return; }
  try { await classJoin(API, classId, cls.name); }
  catch (e) {
    if (e && e.code !== "permission-denied") console.warn("nursin: class chat", e && e.code);
    el.innerHTML = '<div class="qcard"><p class="fbig">💬 مجموعة الصف عم تتجهّز…</p><p>ناطرين تحديث صغير بإعدادات الموقع. رجاع بعد شوي 🙏</p><p><a class="btn" href="classes.html?c=' + encodeURIComponent(classId) + '">← الصف</a></p></div>';
    return;
  }
  history.replaceState(null, "", "chat.html?c=" + encodeURIComponent(classChatId(classId)));
  openRoom(classChatId(classId));
}
