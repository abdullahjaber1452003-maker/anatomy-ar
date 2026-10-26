// nursin «🏫 الصفوف» — classes with a weekly class exam chosen by the AI tutor, a class board and per-student advice.
// Loaded by assets/fb.js on classes.html only. The pure helpers at the top have no browser/Firebase needs (tests import them).

export const N_Q = 15, AI_TIMEOUT = 25000, AI_RETRY_MS = 2000;
export const TUTOR_API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/";

/* ---------- pure helpers ---------- */
function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffled(a, seed) { a = a.slice(); const r = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ISO week of a Beirut day key 'YYYY-MM-DD' → '2026-W43' (weeks start Monday)
export function isoWeek(dk) {
  const d = new Date(dk + "T12:00:00Z"), wd = (d.getUTCDay() + 6) % 7;
  const thu = new Date(d.getTime() + (3 - wd) * 864e5), y = thu.getUTCFullYear();
  const n = 1 + Math.floor((thu - new Date(Date.UTC(y, 0, 1, 12))) / 864e5 / 7);
  return y + "-W" + (n < 10 ? "0" : "") + n;
}
// topics that have enough questions for an exam
export function examTopics(quiz) { const c = {}; (quiz || []).forEach(q => { c[q.t] = (c[q.t] || 0) + 1; }); return Object.keys(c).filter(t => c[t] >= 3).sort(); }
// class weak points from all past results: topic → wrong answers, sorted (most wrong first)
export function classWeak(results, quiz) {
  const by = {}; (quiz || []).forEach(q => { by[q.id] = q.t; });
  const w = {}; (results || []).forEach(r => (r.wrongQ || []).forEach(id => { const t = by[id]; if (t) w[t] = (w[t] || 0) + 1; }));
  return Object.keys(w).map(t => ({ t, n: w[t] })).sort((a, b) => b.n - a.n || (a.t < b.t ? -1 : 1));
}
// deterministic topics: the class's 3 weakest + rotating ones, 4–5 topics in all
export function autoTopics(wk, weak, quiz) {
  const all = examTopics(quiz), out = (weak || []).map(x => x.t).filter(t => all.includes(t)).slice(0, 3);
  const n = +String(wk).slice(-2) || 0, want = out.length ? 5 : 4;
  for (let i = 0; out.length < want && i < all.length; i++) { const t = all[(n * 3 + i * 7) % all.length]; if (!out.includes(t)) out.push(t); }
  for (let i = 0; out.length < want && i < all.length; i++) { const t = all[(n * 3 + i) % all.length]; if (!out.includes(t)) out.push(t); } // step 7 repeats when the topic count is a multiple of 7
  return out;
}
// questions for the class exam: round-robin across the chosen topics, same for everyone (seeded by class + week)
export function buildExam(seed, topics, quiz, n = N_Q) {
  const pools = topics.map(t => shuffled((quiz || []).filter(q => q.t === t).map(q => q.id).sort(), hash(seed + ":" + t)));
  const out = [];
  for (let round = 0; out.length < n && pools.some(p => p.length > round); round++) pools.forEach(p => { if (out.length < n && p[round]) out.push(p[round]); });
  if (out.length < n) shuffled((quiz || []).map(q => q.id).filter(id => !out.includes(id)).sort(), hash(seed + ":fill")).slice(0, n - out.length).forEach(id => out.push(id));
  return shuffled(out, hash(seed + ":order"));
}
// the tutor's answer → {topics, intro} (JSON somewhere in the text) or null
export function parsePlan(text, quiz) {
  const s = String(text || ""), a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (/^\s*صار في مشكلة/.test(s) || a < 0 || b <= a) return null;
  let j; try { j = JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
  const ok = examTopics(quiz), topics = [];
  (Array.isArray(j.topics) ? j.topics : []).forEach(t => { t = String(t).trim().toLowerCase(); if (ok.includes(t) && !topics.includes(t) && topics.length < 6) topics.push(t); });
  let intro = String(j.intro || "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  if (intro.length > 240) { const cut = intro.slice(0, 240), k = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("؟")); intro = k > 60 ? cut.slice(0, k + 1) : cut.replace(/\s+\S*$/, "") + " …"; }
  return topics.length >= 2 ? { topics, intro } : null;
}
export function planPrompt(name, members, topics, weak, names) {
  const T = names || {};
  return "انت الأستاذ المساعد لصف «" + name + "» (" + members + " طلاب). لازم تختار مواضيع امتحان هالأسبوع (" + N_Q + " سؤال).\n" +
    "المواضيع الموجودة (key: الاسم):\n" + topics.map(t => t + ": " + (T[t] || t)).join("\n") + "\n" +
    (weak && weak.length ? "أكتر مواضيع غلط فيها الصف بالامتحانات يلي فاتت (key: عدد الغلطات): " + weak.slice(0, 6).map(w => w.t + ": " + w.n).join("، ") + "\n" : "هيدا أوّل امتحان للصف، ما في نتايج قبل.\n") +
    "اختار من ٣ لـ ٥ مواضيع: ركّز على نقاط ضعف الصف وزيد موضوع أو اتنين للمراجعة من دروس تانية.\n" +
    'جاوب بس JSON بلا أي كلمة تانية، هيك: {"topics":["key1","key2","key3"],"intro":"جملتين قصار للصف كلّو (أقل من ٣٠ كلمة) بالعربي اللبناني: ليش اخترت هالمواضيع + تشجيع"}';
}
// per-student advice: topics of the wrong answers, most first
export function advice(wrongQ, quiz) {
  const by = {}; (quiz || []).forEach(q => { by[q.id] = q.t; });
  const c = {}; (wrongQ || []).forEach(id => { const t = by[id]; if (t) c[t] = (c[t] || 0) + 1; });
  return Object.keys(c).map(t => ({ t, n: c[t] })).sort((a, b) => b.n - a.n || (a.t < b.t ? -1 : 1));
}
// class ranking over all weeks: total right answers / total questions, then weeks taken
export function ranking(results, memberIds) {
  const by = {};
  (results || []).forEach(r => { if (memberIds && !memberIds.includes(r.uid)) return; const e = by[r.uid] || (by[r.uid] = { uid: r.uid, name: r.name, photo: r.photo, score: 0, total: 0, weeks: 0 }); e.score += r.score | 0; e.total += r.total | 0; e.weeks++; });
  return Object.values(by).map(e => ({ ...e, pct: e.total ? Math.round(100 * e.score / e.total) : 0 })).sort((a, b) => b.pct - a.pct || b.weeks - a.weeks || b.score - a.score);
}
export const pct = (s, t) => t ? Math.round(100 * s / t) : 0;
const addDays = (dk, n) => { const t = new Date(dk + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export function prevWeek(dk) { return isoWeek(addDays(dk, -7)); }
// 👑 بطل الأسبوع (top % that week; ties share it) and 📈 أكثر واحد تحسّن (biggest rise vs the student's previous class exam)
export function weekAwards(results, wk, memberIds) {
  const all = (results || []).filter(r => !memberIds || memberIds.includes(r.uid)), cur = all.filter(r => r.wk === wk);
  const out = { wk, n: cur.length, top: 0, champ: [], gain: 0, up: [] };
  if (!cur.length) return out;
  out.top = Math.max(...cur.map(r => pct(r.score, r.total)));
  out.champ = cur.filter(r => pct(r.score, r.total) === out.top).map(r => r.uid).sort();
  cur.forEach(r => {
    const prev = all.filter(x => x.uid === r.uid && x.wk < wk).sort((a, b) => (a.wk < b.wk ? 1 : -1))[0];
    if (!prev) return;
    const from = pct(prev.score, prev.total), to = pct(r.score, r.total), g = to - from;
    if (g <= 0 || g < out.gain) return;
    if (g > out.gain) { out.gain = g; out.up = []; }
    out.up.push({ uid: r.uid, from, to });
  });
  out.up.sort((a, b) => (a.uid < b.uid ? -1 : 1));
  return out;
}
// badges a student has earned from a class's past (finished) weeks: champ needs 2+ students that week
export function classBadges(results, uid, curWk) {
  const out = [], mine = (results || []).filter(r => r.uid === uid);
  if (mine.length) out.push("class1");
  const weeks = [...new Set(mine.map(r => r.wk))].filter(w => w < curWk);
  weeks.forEach(w => { const a = weekAwards(results, w); if (a.n >= 2 && a.champ.includes(uid) && !out.includes("champ")) out.push("champ"); if (a.up.some(u => u.uid === uid) && !out.includes("up")) out.push("up"); });
  return out;
}
// ❓ سؤال اليوم: the same question for the whole class all day (Beirut day), never the same as yesterday's
export function dailyQid(cid, dk, quiz) {
  const ids = (quiz || []).map(q => q.id).sort(); if (!ids.length) return null;
  const at = d => hash(cid + ":dq:" + d) % ids.length;
  let i = at(dk); if (ids.length > 1 && i === at(addDays(dk, -1))) i = (i + 1) % ids.length;
  return ids[i];
}
// answers of the day → first right answer (by server time), how many right, how many answered
export function dqSummary(answers) {
  const ms = a => (a.at && typeof a.at.toMillis === "function" ? a.at.toMillis() : typeof a.at === "number" ? a.at : Infinity);
  const right = (answers || []).filter(a => a.ok).sort((a, b) => ms(a) - ms(b) || (a.uid < b.uid ? -1 : 1));
  return { first: right[0] || null, right: right.length, n: (answers || []).length };
}

/* ---------- page ---------- */
let A, F, N, esc, $;
const NOT_READY = "🏫 الصفوف بعدها عم تتجهّز (ناطرين تحديث صغير بإعدادات الموقع). جرّب كمان شوي 🙏";
const denied = e => e && e.code === "permission-denied";
// 🗑️ deleting a class: the site admin (verified Gmail, same check as admin page / chat) can delete ANY class; the owner his own
export const ADMIN_EMAIL = "abdullahjaber1452003@gmail.com";
export const isAdminUser = u => !!(u && u.email === ADMIN_EMAIL && u.emailVerified);
export const canDeleteClass = (u, cls) => !!(u && cls && (isAdminUser(u) || cls.owner === u.uid));
export const DEL_CONFIRM = "متأكد؟ رح ينحذف الصف لكل الأعضاء";
export const RULES_MSG = "⚠️ لازم تنشر القواعد الجديدة (v10) بـ Firebase تا يزبط الحذف.";
export const DEL_SUBS = ["weeks", "starts", "results", "dq", "members"];   // members last
// split refs into batches (Firestore allows 500 writes per batch; we stay well under)
export function chunks(a, n = 200) { const out = []; for (let i = 0; i < (a || []).length; i += n) out.push(a.slice(i, i + n)); return out; }
const L = "abc";
function topicName(t) { return (window.QTOP || {})[t] || t; }
function lessonPage(t) { const G = window.QGROUPS || {}; return (G.neuro || []).includes(t) ? "neuro.html" : t === "henderson" ? "henderson.html" : t === "law" ? "law.html" : t === "mgmt" ? "mgmt.html" : "cardio.html"; }
function qById(id) { return (window.QUIZ || []).find(q => q.id === id); }
function params() { return new URLSearchParams(location.search); }
function failMsg(e) { return denied(e) ? NOT_READY : "⚠️ ما زبط، تأكّد من الإنترنت وجرّب كمان مرّة."; }

export function page(api) {
  A = api; F = api.fs; N = api.N; esc = api.esc; $ = s => document.querySelector(s);
  const el = document.getElementById("classes-app"); if (!el) return;
  if (!A.user) {
    A.signInCard(el, '<p class="fbig">🏫 صفّك كلّو بمكان واحد</p><p>امتحان كل أسبوع بيختارو الأستاذ المساعد، علامات الكل مبيّنة، وكل واحد بيعرف شو لازم يشدّ حالو فيه. سجّل دخول بغوغل تا تعمل صف أو تفوت على صفّك.</p>');
    return;
  }
  const cid = params().get("c");
  if (cid) openClass(el, cid); else home(el);
}

/* ---- my classes + create + join ---- */
async function home(el, note) {
  const join = N.normCode(params().get("join") || "");
  el.innerHTML = (note ? '<p class="finv">' + note + "</p>" : "") +
    '<section class="qcard" id="cmine"><h2>📚 صفوفي</h2><div id="clist"><p class="small">⏳ …</p></div><p id="clmsg" class="small" aria-live="polite"></p></section>' +
    '<section class="qcard"><h2>🔑 فوت على صف بالكود</h2><form id="cjoin" class="fadd" autocomplete="off"><input id="cjcode" dir="ltr" maxlength="7" autocapitalize="characters" spellcheck="false" placeholder="مثلاً K7Q2MX" aria-label="كود الصف" value="' + esc(join) + '"><button class="btn pri" type="submit">فوت</button></form><p id="cjmsg" class="small" aria-live="polite"></p></section>' +
    '<section class="qcard"><h2>➕ اعمل صف جديد</h2><form id="cnew" class="fadd" autocomplete="off"><input id="cname" maxlength="40" placeholder="مثلاً LT2" aria-label="اسم الصف"><button class="btn pri" type="submit">اعمل</button></form><p class="small">بتاخد كود من ٦ حروف، بتبعتو لرفقاتك بالصف وبيفوتو فيه.</p><p id="cnmsg" class="small" aria-live="polite"></p></section>';
  $("#cjoin").addEventListener("submit", e => { e.preventDefault(); joinByCode($("#cjcode").value); });
  $("#cnew").addEventListener("submit", e => { e.preventDefault(); createClass($("#cname").value); });
  try {
    const s = await F.getDocs(F.collection(A.db, "users", A.user.uid, "myClasses"));
    let list = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    // a class that was deleted (or I was removed from) leaves my list quietly — only on a clear "gone"/"not allowed", never on a network error
    const gone = await Promise.all(list.map(c => F.getDoc(F.doc(A.db, "classes", c.id)).then(x => !x.exists(), e => denied(e))));
    list = list.filter((c, i) => { if (!gone[i]) return true; F.deleteDoc(F.doc(A.db, "users", A.user.uid, "myClasses", c.id)).catch(() => {}); return false; });
    $("#clist").innerHTML = list.length ? '<div class="excards">' + list.map(c => '<div class="ccw"><a class="excard ccard" href="classes.html?c=' + encodeURIComponent(c.id) + '"><b><bdi>🏫 ' + esc(c.name) + "</bdi></b><small>" + (c.owner ? "إنت صاحب الصف" : "طالب بالصف") + '</small><span class="btn pri">فوت ←</span></a>' +
      (c.owner || isAdminUser(A.user) ? '<button class="cdelx" type="button" data-cid="' + esc(c.id) + '" aria-label="احذف الصف ' + esc(c.name) + '" title="🗑️ احذف الصف">🗑️</button>' : "") + "</div>").join("") + "</div>"
      : '<p class="small fempty">لسّا مش بأي صف. فوت بكود من رفيقك أو اعمل صف جديد 👇</p>';
    $("#clist").querySelectorAll(".cdelx").forEach(b => b.addEventListener("click", () => { const c = list.find(x => x.id === b.dataset.cid); askDelete(c.id, null, c.name, $("#cmine")); }));
  } catch (e) { if (!denied(e)) console.warn("nursin: classes list", e && e.code); $("#clist").innerHTML = '<p class="small">' + failMsg(e) + "</p>"; }
  if (isAdminUser(A.user)) adminList();
  if (join) joinByCode(join, true);
}
// 🛡️ admin only: every class on the site, each with «🗑️ احذف الصف»
async function adminList() {
  const sec = document.createElement("section"); sec.className = "qcard cadm"; sec.id = "cadm";
  sec.innerHTML = '<h2>🛡️ كل الصفوف <small>(أدمن)</small></h2><div id="cadml"><p class="small">⏳ …</p></div><p id="cadmmsg" class="small" aria-live="polite"></p>';
  const host = document.getElementById("classes-app"); if (!host) return; host.appendChild(sec);
  const box = sec.querySelector("#cadml");
  try {
    const s = await F.getDocs(F.query(F.collection(A.db, "classes"), F.limit(300)));
    const all = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    box.innerHTML = all.length ? '<ol class="lb cadmlist">' + all.map(c => '<li class="cadmrow"><a href="classes.html?c=' + encodeURIComponent(c.id) + '"><b><bdi>🏫 ' + esc(c.name) + '</bdi></b> <small>· <bdi>' + esc(N.cleanName(c.ownerName)) + '</bdi> · <span dir="ltr">' + esc(c.code || "") + '</span></small></a> <button class="btn clsdel" type="button" data-cid="' + esc(c.id) + '">🗑️ احذف الصف</button></li>').join("") + "</ol>"
      : '<p class="small">ما في ولا صف عالموقع.</p>';
    box.querySelectorAll(".clsdel").forEach(b => b.addEventListener("click", () => { const c = all.find(x => x.id === b.dataset.cid); askDelete(c.id, c, c.name, sec); }));
  } catch (e) {
    if (!denied(e)) console.warn("nursin: admin classes", e && e.code);
    box.innerHTML = '<p class="small">' + (denied(e) ? RULES_MSG + " (هلّق بتقدر تحذف بس الصفوف يلي إنت صاحبها.)" : "⚠️ ما قدرنا نجيب الصفوف. جرّب كمان شوي.") + "</p>";
  }
}
// confirm → delete → the class disappears for everyone
async function askDelete(cid, cls, name, scope) {
  if (!confirm(DEL_CONFIRM + "\n«" + (name || "") + "»")) return;
  const msgEl = (scope && scope.querySelector("[aria-live]")) || null, say = t => { if (msgEl) msgEl.textContent = t; };
  scope && scope.querySelectorAll(".clsdel,.cdelx").forEach(b => { b.disabled = true; });
  say("⏳ عم ينحذف الصف…");
  try {
    if (!cls) { const x = await F.getDoc(F.doc(A.db, "classes", cid)); if (!x.exists()) throw { code: "not-found" }; cls = x.data(); }
    await deleteClass(cid, cls);
    try { sessionStorage.removeItem("nursin_goals_live_v1"); } catch (e) {}
    history.replaceState(null, "", "classes.html");
    home(document.getElementById("classes-app"), "🗑️ انحذف الصف «" + esc(name || cls.name || "") + "» لكل الأعضاء.");
  } catch (e) {
    scope && scope.querySelectorAll(".clsdel,.cdelx").forEach(b => { b.disabled = false; });
    if (e && e.code === "not-found") { F.deleteDoc(F.doc(A.db, "users", A.user.uid, "myClasses", cid)).catch(() => {}); history.replaceState(null, "", "classes.html"); return home(document.getElementById("classes-app"), "🗑️ هالصف منحذف من قبل."); }
    if (!denied(e)) console.warn("nursin: class delete", e && e.code);
    say(denied(e) ? (isAdminUser(A.user) ? RULES_MSG : "🗑️ الحذف بعدو مش جاهز (ناطرين تحديث صغير بإعدادات الموقع). جرّب بعد شوي 🙏") : "⚠️ ما زبط الحذف، تأكّد من الإنترنت وجرّب كمان مرّة.");
  }
}
// deletes everything the client can reach: weeks, starts, results, dq answers, members, the class code, the class doc and my own list entry.
// Other members' users/{uid}/myClasses entries are theirs to write; their pages drop the missing class by themselves (home(), goalsStatus, tutorSummary).
export async function deleteClass(cid, cls, api) {
  const a = api || A, F3 = a.fs, db = a.db, me = a.user.uid;
  const refs = [];
  for (const s of DEL_SUBS) (await F3.getDocs(F3.collection(db, "classes", cid, s))).docs.forEach(d => refs.push(d.ref));
  refs.sort((x, y) => (x.parent.id === "members") - (y.parent.id === "members") || (x.id === me) - (y.id === me));   // members last, my own member doc very last
  for (const part of chunks(refs)) { const b = F3.writeBatch(db); part.forEach(r => b.delete(r)); await b.commit(); }
  const b = F3.writeBatch(db);
  if (cls && cls.code) {
    const cd = await F3.getDoc(F3.doc(db, "classCodes", cls.code)).catch(() => null);
    if (cd && cd.exists() && (cd.data() || {}).cid === cid) b.delete(F3.doc(db, "classCodes", cls.code));
  }
  b.delete(F3.doc(db, "classes", cid));
  await b.commit();
  await F3.deleteDoc(F3.doc(db, "users", me, "myClasses", cid)).catch(() => {});
  return refs.length;
}
function bitsOf(api) { const p = api.profile || {}; return { name: api.N.cleanName(p.name || api.user.displayName), photo: String(p.photo || "").slice(0, 500), level: Math.max(1, Math.min(1000, api.N.level(p.points))) }; }
function profileBits() { return bitsOf(A); }
async function createClass(raw) {
  const name = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 40), msg = $("#cnmsg");
  if (!name) { msg.textContent = "اكتب اسم الصف (مثلاً LT2)."; return; }
  const btn = $("#cnew button"); btn.disabled = true; msg.textContent = "⏳ …";
  const ref = F.doc(F.collection(A.db, "classes")), me = A.user.uid, pb = profileBits();
  for (let i = 0; i < 4; i++) {
    const code = N.newCode();
    try {
      await F.runTransaction(A.db, async tx => {
        const c = await tx.get(F.doc(A.db, "classCodes", code));
        if (c.exists()) throw { taken: true };
        tx.set(F.doc(A.db, "classCodes", code), { cid: ref.id, name });
        tx.set(ref, { name, owner: me, ownerName: pb.name, code, createdAt: F.serverTimestamp() });
        tx.set(F.doc(A.db, "classes", ref.id, "members", me), { ...pb, code, joinedAt: F.serverTimestamp() });
        tx.set(F.doc(A.db, "users", me, "myClasses", ref.id), { name, owner: true, at: F.serverTimestamp() });
      });
      location.href = "classes.html?c=" + encodeURIComponent(ref.id); return;
    } catch (e) { if (e && e.taken) continue; if (!denied(e)) console.warn("nursin: class create", e && e.code); msg.textContent = failMsg(e); btn.disabled = false; return; }
  }
  msg.textContent = "⚠️ ما زبط، جرّب كمان مرّة."; btn.disabled = false;
}
// join by code — shared by «🔑 فوت على صف بالكود» here and the «🏫 عندك كود صف؟» card after sign-in (assets/nav.js). Works for any class code.
// → { cid, name } joined · { cid, name, already: true } · { cancel: true } · { err: "words" }
export async function joinWithCode(api, raw, ask) {
  const F2 = api.fs, db = api.db, code = api.N.normCode(raw || "");
  if (!api.user) return { err: "لازم تسجّل دخول أوّل." };
  if (code.length !== 6) return { err: "الكود ٦ حروف/أرقام." };
  try {
    const c = await F2.getDoc(F2.doc(db, "classCodes", code));
    if (!c.exists()) return { err: "❌ ما في صف بهالكود. تأكّد منو (يمكن صاحب الصف غيّرو)." };
    const { cid, name } = c.data(), me = api.user.uid;
    const mine = await F2.getDoc(F2.doc(db, "users", me, "myClasses", cid));
    if (mine.exists()) return { cid, name, already: true };
    if (ask && !ask(name)) return { cancel: true };
    await F2.runTransaction(db, async tx => {
      tx.set(F2.doc(db, "classes", cid, "members", me), { ...bitsOf(api), code, joinedAt: F2.serverTimestamp() });
      tx.set(F2.doc(db, "users", me, "myClasses", cid), { name, owner: false, at: F2.serverTimestamp() });
    });
    return { cid, name };
  } catch (e) { if (!denied(e)) console.warn("nursin: class join", e && e.code); return { err: failMsg(e) }; }
}
// how many classes am I in (the «عندك كود صف؟» card shows only at 0); null = couldn't tell
export async function myClassCount(api) {
  if (!api.user) return null;
  try { return ((await api.fs.getDocs(api.fs.collection(api.db, "users", api.user.uid, "myClasses"))).docs || []).length; } catch (e) { return null; }
}
async function joinByCode(raw, fromLink) {
  const msg = $("#cjmsg");
  msg.textContent = "⏳ …";
  const r = await joinWithCode(A, raw, fromLink ? name => confirm("بدّك تفوت على صف «" + name + "»؟") : null);
  if (r.err) { msg.textContent = r.err; return; }
  if (r.cancel) { msg.textContent = ""; return; }
  location.href = "classes.html?c=" + encodeURIComponent(r.cid);
}

/* ---- one class ---- */
let C = null;   // {cid, cls, members, results, wk, week, mine, started}
async function openClass(el, cid) {
  el.innerHTML = '<p>⏳ …</p>';
  const me = A.user.uid, wk = isoWeek(N.dayKey());
  let cls, members, results;
  try {
    const [c, m, r] = await Promise.all([F.getDoc(F.doc(A.db, "classes", cid)), F.getDocs(F.collection(A.db, "classes", cid, "members")), F.getDocs(F.collection(A.db, "classes", cid, "results"))]);
    if (!c.exists()) throw { code: "not-found" };
    cls = c.data(); members = m.docs.map(d => ({ uid: d.id, ...d.data() })); results = r.docs.map(d => d.data());
  } catch (e) {
    if (denied(e) || (e && e.code === "not-found")) {
      // not a member (removed, or the class is gone) — tidy my list
      try { if ((await F.getDoc(F.doc(A.db, "users", me, "myClasses", cid))).exists()) { await F.deleteDoc(F.doc(A.db, "users", me, "myClasses", cid)); return home(el, "🚪 ما عدت بهالصف (يمكن انحذف، أو صاحب الصف طلّعك). فيك تفوت من جديد بكود."); } } catch (x) {}
      if (!isAdminUser(A.user)) { history.replaceState(null, "", "classes.html"); return home(el, "❌ هالصف مش موجود (يمكن انحذف) أو إنت مش فيه. فيك تفوت على صف بالكود."); }
    }
    if (!denied(e)) console.warn("nursin: class open", e && e.code);
    el.innerHTML = '<div class="qcard"><p>' + (denied(e) ? (isAdminUser(A.user) ? RULES_MSG : NOT_READY) : "⚠️ ما قدرنا نفتح الصف. تأكّد من الإنترنت وجرّب بعد شوي.") + '</p><p><a href="classes.html">← صفوفي</a></p></div>'; return;
  }
  C = { cid, cls, members, results, wk, owner: cls.owner === me, member: members.some(x => x.uid === me), canDel: canDeleteClass(A.user, cls) };
  C.mine = results.find(r => r.uid === me && r.wk === wk) || null;
  // keep my name/level fresh on the member list
  const pb = profileBits(), m0 = members.find(x => x.uid === me);
  if (m0 && (m0.level !== pb.level || m0.name !== pb.name || m0.photo !== pb.photo)) { F.updateDoc(F.doc(A.db, "classes", cid, "members", me), pb).catch(() => {}); Object.assign(m0, pb); }
  el.innerHTML = '<nav class="small"><a href="classes.html">← صفوفي</a></nav>' +
    '<section class="qcard chead"><h2>🏫 <bdi>' + esc(cls.name) + '</bdi></h2><p class="small">' + members.length + (members.length === 1 ? ' طالب' : ' طلاب') + ' · صاحب الصف: <bdi>' + esc(N.cleanName(cls.ownerName)) + '</bdi></p><div id="ccode"></div></section>' +
    '<section class="qcard cdq" id="cdq"><h2>❓ سؤال اليوم</h2><div id="cdqb"><p class="small">⏳ …</p></div></section>' +
    '<section class="qcard" id="cweek"><h2>📝 امتحان هالأسبوع</h2><div id="cexam"><p class="small">⏳ …</p></div></section>' +
    '<section class="qcard"><h2>👑 أبطال الصف</h2><div id="cawards"></div></section>' +
    '<section class="qcard"><h2>📊 علامات هالأسبوع</h2><ol class="lb" id="cboard"></ol></section>' +
    '<section class="qcard"><h2>🏆 ترتيب الصف <small>(كل الأسابيع)</small></h2><ol class="lb" id="crank"></ol></section>' +
    '<section class="qcard"><h2>👥 الطلاب</h2><ol class="lb" id="cmem"></ol><p id="cmmsg" class="small" aria-live="polite"></p></section>' +
    (C.canDel ? '<section class="qcard cdanger" id="cdelsec"><h2>🗑️ حذف الصف</h2><p class="small">' + (C.owner ? "إنت صاحب الصف." : "🛡️ إنت أدمن الموقع.") + ' الحذف بيشيل الصف وعلاماتو وأسئلتو لكل الأعضاء، وما بيرجع.</p><p><button class="btn clsdel" id="cdel" type="button">🗑️ احذف الصف</button></p><p id="cdelmsg" class="small" aria-live="polite"></p></section>' : "");
  C.prof = {};
  drawCode(); drawBoard(); drawAwards(); drawRank(); drawMembers();
  if (C.canDel) $("#cdel").addEventListener("click", () => askDelete(cid, cls, cls.name, $("#cdelsec")));
  if (!C.member) {   // the admin looking at a class he isn't in: read-only, nothing gets written in his name
    const ro = '<p class="small">👀 إنت فاتح هالصف كأدمن (مش عضو فيه).</p>';
    $("#cdqb").innerHTML = ro; $("#cexam").innerHTML = ro; loadProfiles(); return;
  }
  dqCard(); weekCard(); loadProfiles(); myClassBadges();
}
// 🔥 + 🏅 of every member (users/{uid} is readable by any signed-in student)
async function loadProfiles() {
  const ids = C.members.map(m => m.uid);
  const snaps = await Promise.all(ids.map(id => F.getDoc(F.doc(A.db, "users", id)).catch(() => null)));
  snaps.forEach((s, i) => { if (s && s.exists()) C.prof[ids[i]] = s.data(); });
  if (A.profile) C.prof[A.user.uid] = A.profile;
  drawMembers();
}
// 🏫 first class exam, 👑 champion and 📈 most improved of past weeks → my badges
async function myClassBadges() {
  const have = (A.profile && A.profile.badges) || {}, want = classBadges(C.results, A.user.uid, C.wk).filter(b => !have[b]);
  if (!want.length || !A.logActivity) return;
  const r = await A.logActivity(0, null, want);
  if (r && r.html) { const m = document.createElement("div"); m.className = "finv cbnew"; m.innerHTML = r.html; const h = document.querySelector(".chead"); if (h) h.append(m); }
  if (r) { C.prof[A.user.uid] = A.profile; drawMembers(); }
}
function nameOf(uid, fallback) { const m = C.members.find(x => x.uid === uid) || C.results.find(x => x.uid === uid) || { name: fallback }; return '<bdi>' + esc(N.cleanName(m.name)) + "</bdi>" + (uid === A.user.uid ? " <small>(إنت)</small>" : ""); }
function drawAwards() {
  const ids = C.members.map(m => m.uid), weeks = [[C.wk, "هالأسبوع <small>(لهلّق)</small>"], [prevWeek(N.dayKey()), "الأسبوع الماضي"]];
  $("#cawards").innerHTML = weeks.map(([wk, label]) => {
    const a = weekAwards(C.results, wk, ids);
    return '<div class="caw"><p class="cawh">' + label + "</p>" +
      (a.n ? '<p>👑 <b>بطل الأسبوع:</b> ' + a.champ.map(nameOf).join("، ") + ' <b dir="ltr">' + a.top + "%</b></p>" : '<p class="small">👑 لسّا ما حدا قدّم امتحان ' + (wk === C.wk ? "هالأسبوع" : "هيداك الأسبوع") + ".</p>") +
      (a.up.length ? '<p>📈 <b>أكثر واحد تحسّن:</b> ' + a.up.map(u => nameOf(u.uid) + ' <span dir="ltr" class="cup">' + u.from + "% → " + u.to + "% (+" + (u.to - u.from) + ")</span>").join("، ") + "</p>"
        : a.n ? '<p class="small">📈 «أكثر واحد تحسّن» بيطلع لما حدا يجيب أحسن من امتحانو يلي قبل.</p>' : "") + "</div>";
  }).join("");
}

/* ---- ❓ سؤال اليوم: one question for the whole class per Beirut day; each student answers once ---- */
const DQ_NOT_READY = "❓ سؤال اليوم بعدها عم يتجهّز (ناطرين تحديث صغير بإعدادات الموقع). جرّب كمان شوي 🙏";
async function dqLoad(dk) {
  const s = await F.getDocs(F.query(F.collection(A.db, "classes", C.cid, "dq"), F.where("day", "==", dk)));
  return s.docs.map(d => d.data());
}
async function dqCard() {
  const box = $("#cdqb"), dk = N.dayKey(), q = qById(dailyQid(C.cid, dk, window.QUIZ)), me = A.user.uid;
  if (!q) { box.innerHTML = ""; return; }
  let ans;
  try { ans = await dqLoad(dk); }
  catch (e) { if (!denied(e)) console.warn("nursin: daily question", e && e.code); box.innerHTML = '<p class="small">' + (denied(e) ? DQ_NOT_READY : "⚠️ ما قدرنا نجيب سؤال اليوم هلّق.") + "</p>"; return; }
  dqDraw(box, q, ans, dk);
  const mine = ans.find(a => a.uid === me), sum = dqSummary(ans);
  if (mine && sum.first && sum.first.uid === me && !((A.profile && A.profile.badges) || {}).dq1 && A.logActivity) A.logActivity(0, null, ["dq1"]).then(() => { C.prof[me] = A.profile; drawMembers(); });
}
function dqDraw(box, q, ans, dk, note) {
  const me = A.user.uid, mine = ans.find(a => a.uid === me), sum = dqSummary(ans);
  const info = (sum.first ? '<p class="dqfirst">🥇 أول واحد جاوب صح: <b>' + nameOf(sum.first.uid, sum.first.name) + "</b></p>" : sum.n ? '<p class="small">لسّا ما حدا جاوب صح… كون إنت الأوّل 💪</p>' : '<p class="small">لسّا ما حدا جاوب. كون إنت الأوّل 💪</p>') +
    '<p class="small">✅ <b>' + sum.right + "</b> جاوبو صح من أصل <b>" + sum.n + "</b></p>";
  let h = '<span class="qtopic">' + esc(topicName(q.t)) + '</span><p class="qq">' + q.q + "</p>";
  if (mine) {
    goalDone("dq");
    h += q.o.map((o, k) => '<div class="opt' + (k === q.a ? " ok" : k === mine.pick ? " bad" : "") + '"><span class="l" dir="ltr">' + L[k] + "</span><span>" + o + "</span></div>").join("") +
      '<div class="expl' + (mine.ok ? "" : " w") + '">' + (mine.ok ? "✅ <b>صح!</b> " : "❌ <b>الجواب الصح: " + L[q.a] + "</b> — ") + q.x + "</div>" + (note || "") + info + '<p class="small">سؤال جديد بكرا ⏰</p>';
  } else {
    h += q.o.map((o, k) => '<button class="opt" type="button" data-k="' + k + '"><span class="l" dir="ltr">' + L[k] + "</span><span>" + o + "</span></button>").join("") + '<p class="small">جواب واحد بس، فكّر منيح 🤔</p><p id="dqmsg" class="small" aria-live="polite"></p>' + info;
  }
  box.innerHTML = h;
  box.querySelectorAll("button.opt").forEach(b => b.addEventListener("click", () => dqAnswer(box, q, +b.dataset.k, dk)));
}
async function dqAnswer(box, q, k, dk) {
  const me = A.user.uid, pb = profileBits(), ok = k === q.a, msg = $("#dqmsg");
  box.querySelectorAll("button.opt").forEach(b => { b.disabled = true; });
  if (msg) msg.textContent = "⏳ …";
  try { await F.setDoc(F.doc(A.db, "classes", C.cid, "dq", dk + "_" + me), { uid: me, day: dk, qid: q.id, name: pb.name, photo: pb.photo, pick: k, ok, at: F.serverTimestamp() }); }
  catch (e) {
    let ans = null; try { ans = await dqLoad(dk); } catch (x) {}
    if (ans && ans.some(a => a.uid === me)) return dqDraw(box, q, ans, dk);        // already answered (another tab)
    if (!denied(e)) console.warn("nursin: daily answer", e && e.code);
    if (msg) msg.textContent = denied(e) ? DQ_NOT_READY : "⚠️ ما زبط، تأكّد من الإنترنت وجرّب كمان مرّة.";
    box.querySelectorAll("button.opt").forEach(b => { b.disabled = false; }); return;
  }
  try { if (window.Weak) window.Weak.record(q, ok); } catch (e) {}
  let ans = []; try { ans = await dqLoad(dk); } catch (e) {}
  const first = dqSummary(ans).first, iWon = !!(ok && first && first.uid === me);
  const act = A.logActivity ? await A.logActivity(1, N.ecgCount([q], [k]), iWon ? ["dq1"] : []) : null;
  if (act) { C.prof[me] = A.profile; drawMembers(); }
  dqDraw(box, q, ans.length ? ans : [{ uid: me, pick: k, ok, at: Date.now() }], dk, (iWon ? '<p class="finv">🎯 إنت أوّل واحد جاوب صح اليوم!</p>' : "") + (act ? act.html : ""));
}
function drawCode() {
  const code = C.cls.code, link = "https://nursin.store/classes.html?join=" + code;
  const share = "https://wa.me/?text=" + encodeURIComponent("فوت على صفّنا «" + C.cls.name + "» على nursin 🏫\nالكود: " + code + "\n" + link);
  $("#ccode").innerHTML = '<p class="finv">🔑 كود الصف: <b dir="ltr" class="ccodev">' + esc(code) + '</b></p><p class="fbtns"><a class="btn pri" href="' + esc(share) + '" target="_blank" rel="noopener">📲 ابعت الكود عالواتساب</a>' +
    (C.owner ? ' <button class="btn" id="cregen" type="button">🔄 كود جديد</button>' : C.member === false ? "" : ' <button class="btn" id="cleave" type="button">🚪 اطلع من الصف</button>') + '</p><p id="ccmsg" class="small" aria-live="polite"></p>';
  const rg = $("#cregen"); if (rg) rg.addEventListener("click", regenCode);
  const lv = $("#cleave"); if (lv) lv.addEventListener("click", leave);
}
async function regenCode() {
  if (!confirm("الكود القديم ما عاد يشتغل. أكيد؟")) return;
  const msg = $("#ccmsg"), old = C.cls.code; msg.textContent = "⏳ …";
  for (let i = 0; i < 4; i++) {
    const code = N.newCode();
    try {
      await F.runTransaction(A.db, async tx => {
        const c = await tx.get(F.doc(A.db, "classCodes", code)); if (c.exists()) throw { taken: true };
        tx.set(F.doc(A.db, "classCodes", code), { cid: C.cid, name: C.cls.name });
        tx.update(F.doc(A.db, "classes", C.cid), { code });
        tx.delete(F.doc(A.db, "classCodes", old));
      });
      C.cls.code = code; drawCode(); $("#ccmsg").textContent = "✅ صار في كود جديد."; return;
    } catch (e) { if (e && e.taken) continue; if (!denied(e)) console.warn("nursin: regen", e && e.code); msg.textContent = failMsg(e); return; }
  }
}
async function leave() {
  if (!confirm("أكيد بدّك تطلع من «" + C.cls.name + "»؟")) return;
  try { await F.deleteDoc(F.doc(A.db, "classes", C.cid, "members", A.user.uid)); await F.deleteDoc(F.doc(A.db, "users", A.user.uid, "myClasses", C.cid)); location.href = "classes.html"; }
  catch (e) { $("#ccmsg").textContent = failMsg(e); }
}
function row(rk, p, sub, me, extra) {
  return '<li class="lbr' + (me ? " me" : "") + '"><span class="rk">' + rk + "</span>" + N.avatar(p.photo, p.name, "av") + '<span class="nm"><b><bdi>' + esc(N.cleanName(p.name)) + "</bdi>" + (me ? " <small>(إنت)</small>" : "") + "</b><small>" + sub + "</small></span>" + (extra || "") + "</li>";
}
function drawBoard() {
  const me = A.user.uid, wkr = C.results.filter(r => r.wk === C.wk), done = {};
  wkr.forEach(r => { done[r.uid] = r; });
  const rows = C.members.map(m => ({ m, r: done[m.uid] })).sort((a, b) => (b.r ? pct(b.r.score, b.r.total) + 1 : 0) - (a.r ? pct(a.r.score, a.r.total) + 1 : 0));
  let i = 0;
  $("#cboard").innerHTML = rows.map(x => {
    if (!x.r) return row("—", x.m, "لسّا ما قدّم", x.m.uid === me);
    const rk = ["🥇", "🥈", "🥉"][i] || i + 1; i++;
    return row(rk, x.m, '<b dir="ltr">' + pct(x.r.score, x.r.total) + "%</b> · " + x.r.score + "/" + x.r.total + " صح", x.m.uid === me);
  }).join("") || '<li class="small">ما في طلاب.</li>';
}
function drawRank() {
  const r = ranking(C.results, C.members.map(m => m.uid)), me = A.user.uid, byUid = {};
  C.members.forEach(m => { byUid[m.uid] = m; });
  $("#crank").innerHTML = r.length ? r.map((e, i) => row(["🥇", "🥈", "🥉"][i] || i + 1, byUid[e.uid] || e, '<b dir="ltr">' + e.pct + "%</b> معدّل · " + e.weeks + (e.weeks === 1 ? " امتحان" : " امتحانات"), e.uid === me)).join("")
    : '<li class="small fempty">الترتيب بيطلع بعد أوّل امتحان.</li>';
}
function drawMembers() {
  const me = A.user.uid;
  $("#cmem").innerHTML = C.members.slice().sort((a, b) => (b.uid === C.cls.owner) - (a.uid === C.cls.owner) || (b.level | 0) - (a.level | 0)).map(m =>
    row(m.uid === C.cls.owner ? "👑" : "🎓", m, '<span class="lvc">Lv ' + (m.level | 0 || 1) + "</span> " + N.streakPill(C.prof[m.uid]) + N.badgeRow(C.prof[m.uid]), m.uid === me,
      C.owner && m.uid !== me ? '<button class="rm" type="button" data-uid="' + esc(m.uid) + '" aria-label="طلّع ' + esc(N.cleanName(m.name)) + ' من الصف">✖</button>' : "")).join("");
  document.querySelectorAll("#cmem .rm").forEach(b => b.addEventListener("click", async () => {
    const m = C.members.find(x => x.uid === b.dataset.uid); if (!m || !confirm("تطلّع " + N.cleanName(m.name) + " من الصف؟")) return;
    try { await F.deleteDoc(F.doc(A.db, "classes", C.cid, "members", m.uid)); C.members = C.members.filter(x => x !== m); drawMembers(); drawBoard(); drawAwards(); drawRank(); $("#cmmsg").textContent = "✅ طلع من الصف. إذا ما بدّك يرجع، اعمل 🔄 كود جديد."; }
    catch (e) { $("#cmmsg").textContent = failMsg(e); }
  }));
}

/* ---- the week's exam: created once per class per ISO week; the tutor picks the topics ---- */
async function askTutor(prompt) {
  const once = async () => {
    const ctl = "AbortController" in window ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), AI_TIMEOUT);
    try {
      const r = await fetch(TUTOR_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", text: prompt }], context: "جاوب بس JSON." }), signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(), plan = parsePlan(j && j.text, window.QUIZ);
      if (!plan) throw new Error("no plan");
      return plan;
    } finally { clearTimeout(t); }
  };
  try { return await once(); } catch (e) { await new Promise(r => setTimeout(r, AI_RETRY_MS)); try { return await once(); } catch (x) { return null; } }
}
async function ensureWeek() {
  const ref = F.doc(A.db, "classes", C.cid, "weeks", C.wk);
  const s = await F.getDoc(ref); if (s.exists()) return s.data();
  $("#cexam").innerHTML = '<p>🧑‍🏫 الأستاذ المساعد عم يحضّر امتحان هالأسبوع حسب نقاط ضعف الصف… <span class="ctdots" aria-hidden="true"><i></i><i></i><i></i></span></p><p class="small">أوّل واحد بيفتح الصف كل أسبوع بيستنّى شوي، الباقي لا.</p>';
  const quiz = window.QUIZ || [], weak = classWeak(C.results, quiz), all = examTopics(quiz);
  const plan = await askTutor(planPrompt(C.cls.name, C.members.length, all, weak, window.QTOP));
  const topics = plan ? plan.topics : autoTopics(C.wk, weak, quiz);
  const intro = (plan && plan.intro) || (weak.length ? "امتحان هالأسبوع ركّز على المواضيع يلي الصف غلط فيها أكتر، مع شوية مراجعة. يلا نشدّ حالنا 💪" : "أوّل امتحان للصف! منشوف وين منيحين ووين لازم نشدّ 💪");
  const data = { wk: C.wk, qids: buildExam(C.cid + ":" + C.wk, topics, quiz), topics, intro, src: plan ? "ai" : "auto", by: A.user.uid, createdAt: F.serverTimestamp() };
  return F.runTransaction(A.db, async tx => { const g = await tx.get(ref); if (g.exists()) return g.data(); tx.set(ref, data); return data; });
}
const PKEY = () => "nursin_class_" + C.cid + "_" + C.wk;
function progRead() { try { return JSON.parse(localStorage.getItem(PKEY()) || "null"); } catch (e) { return null; } }
function progSave(p) { try { if (p) localStorage.setItem(PKEY(), JSON.stringify(p)); else localStorage.removeItem(PKEY()); } catch (e) {} }
async function weekCard() {
  const box = $("#cexam");
  try { C.week = await ensureWeek(); }
  catch (e) { if (!denied(e)) console.warn("nursin: class week", e && e.code); box.innerHTML = "<p>" + failMsg(e) + "</p>"; return; }
  const w = C.week, chips = '<p class="exchips cchips">' + w.topics.map(t => '<i lang="fr" dir="ltr">' + esc(topicName(t)) + "</i>").join("") + "</p>";
  const intro = '<p class="cintro">🧑‍🏫 ' + esc(w.intro) + "</p>" + chips;
  if (C.mine) { goalDone("cls:" + C.cid); box.innerHTML = intro + resultHtml(C.mine); return; }
  let started = false;
  try { started = (await F.getDoc(F.doc(A.db, "classes", C.cid, "starts", C.wk + "_" + A.user.uid))).exists(); } catch (e) {}
  const prog = progRead();
  if (started && !prog) { box.innerHTML = intro + '<p class="qq">⛔ بلّشت امتحان هالأسبوع من جهاز تاني أو مسحت الصفحة وما كمّلت.</p><p class="small">المحاولة وحدة بس. الأسبوع الجاي في امتحان جديد 💪</p>'; return; }
  box.innerHTML = intro + '<ul class="fsteps"><li>📝 ' + w.qids.length + ' سؤال · محاولة وحدة بس</li><li>✅ النتيجة بتطلع لكل الصف، ومعها شو لازم تشدّ حالك فيه</li></ul><p><button class="btn pri big" id="cgo" type="button">' + (prog ? "▶️ كمّل الامتحان" : "▶️ بلّش امتحان الأسبوع") + '</button></p><p id="cgmsg" class="small" aria-live="polite"></p>';
  $("#cgo").addEventListener("click", async () => {
    const b = $("#cgo"); b.disabled = true;
    if (!started) {
      try { await F.setDoc(F.doc(A.db, "classes", C.cid, "starts", C.wk + "_" + A.user.uid), { uid: A.user.uid, wk: C.wk, at: F.serverTimestamp() }); }
      catch (e) { if (!denied(e)) console.warn("nursin: class start", e && e.code); $("#cgmsg").textContent = failMsg(e); b.disabled = false; return; }
    }
    runExam(prog || { i: 0, ans: [] });
  });
}
function runExam(p) {
  const box = $("#cexam"), qs = C.week.qids.map(qById).filter(Boolean);
  progSave(p);
  const draw = () => {
    const q = qs[p.i], a = p.ans[p.i];
    box.innerHTML = '<div class="qbar"><span>📝 امتحان الصف</span><span>سؤال ' + (p.i + 1) + " من " + qs.length + '</span></div><div class="prog"><i style="width:' + (100 * p.i / qs.length) + '%"></i></div>' +
      '<div class="cq"><span class="qtopic">' + esc(topicName(q.t)) + '</span><p class="qq">' + q.q + "</p>" +
      q.o.map((o, k) => '<button class="opt' + (a === k ? " pick" : "") + '" type="button" data-k="' + k + '" aria-pressed="' + (a === k) + '"><span class="l" dir="ltr">' + L[k] + "</span><span>" + o + "</span></button>").join("") +
      '<div class="qnav">' + (p.i ? '<button class="btn" id="cprev" type="button">→ رجوع</button>' : "<span></span>") +
      '<button class="btn pri" id="cnext" type="button"' + (a == null ? " disabled" : "") + ">" + (p.i + 1 < qs.length ? "التالي ←" : "سلّم الامتحان ✅") + "</button></div></div>";
    box.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => { p.ans[p.i] = +b.dataset.k; progSave(p); draw(); }));
    const pv = $("#cprev"); if (pv) pv.addEventListener("click", () => { p.i--; progSave(p); draw(); });
    $("#cnext").addEventListener("click", () => { if (p.i + 1 < qs.length) { p.i++; progSave(p); draw(); } else submit(qs, p); });
    $("#cweek").scrollIntoView({ block: "start" });
  };
  draw();
}
async function submit(qs, p) {
  const b = $("#cnext"); b.disabled = true; b.textContent = "⏳ …";
  const wrongQ = [], wrongT = []; let score = 0;
  qs.forEach((q, i) => { if (p.ans[i] === q.a) score++; else { wrongQ.push(q.id); wrongT.push(q.t); } });
  const pb = profileBits(), r = { uid: A.user.uid, wk: C.wk, name: pb.name, photo: pb.photo, score, total: qs.length, wrongQ, wrongT, at: F.serverTimestamp() };
  try { await F.setDoc(F.doc(A.db, "classes", C.cid, "results", C.wk + "_" + A.user.uid), r); }
  catch (e) {
    if (denied(e)) { try { const ex = await F.getDoc(F.doc(A.db, "classes", C.cid, "results", C.wk + "_" + A.user.uid)); if (ex.exists()) { progSave(null); C.mine = ex.data(); return openClass(document.getElementById("classes-app"), C.cid); } } catch (x) {} }
    if (!denied(e)) console.warn("nursin: class result", e && e.code);
    b.disabled = false; b.textContent = "سلّم الامتحان ✅"; const m = document.createElement("p"); m.className = "small"; m.textContent = failMsg(e); b.parentNode.after(m); return;
  }
  progSave(null);
  try { if (window.Weak) qs.forEach((q, i) => window.Weak.record(q, p.ans[i] === q.a)); } catch (e) {}
  C.mine = r; C.results.push(r);
  goalDone("cls:" + C.cid);
  $("#cexam").innerHTML = '<p class="cintro">🧑‍🏫 ' + esc(C.week.intro) + "</p>" + resultHtml(r, p, qs) + '<p id="cact"></p>';
  drawBoard(); drawAwards(); drawRank(); $("#cweek").scrollIntoView({ block: "start" });
  if (A.logActivity) A.logActivity(qs.length, N.ecgCount(qs, p.ans), ["class1"]).then(a => { if (!a) return; const el = $("#cact"); if (el) el.innerHTML = a.html; C.prof[A.user.uid] = A.profile; drawMembers(); });
}
function resultHtml(r, p, qs) {
  const P = pct(r.score, r.total), adv = advice(r.wrongQ, window.QUIZ);
  let h = '<div class="score cres"><p>نتيجتك: <b dir="ltr">' + P + "%</b> · " + r.score + " من " + r.total + " صح</p><p>" + (P >= 85 ? "ممتاز 🔥" : P >= 60 ? "منيح 👍" : "بدّها شدّة 💪") + "</p></div>";
  h += '<div class="adx adx-box adx-keep adx-res" data-mobile="9892bba2f704f8ea66787de07f9f7be3" data-desktop="f0cd90c85278798fba5a155236050d61"></div>'; // result-screen banner (after the exam, never during it)
  if (adv.length) {
    const top = adv.slice(0, 3), q = "غلطت بامتحان الصف بـ " + top.map(a => topicName(a.t)).join(" و ") + ". اشرحلي أهم الأفكار يلي لازم إعرفها، خطوة خطوة.";
    h += '<div class="cadv"><p class="qq">💪 شدّ حالك بـ:</p><ul>' + top.map(a => '<li><a href="' + lessonPage(a.t) + "#" + esc(a.t) + '"><b lang="fr" dir="ltr">' + esc(topicName(a.t)) + "</b></a> <small>(" + a.n + (a.n === 1 ? " غلطة" : " غلطات") + ")</small></li>").join("") + "</ul>" +
      '<p><a class="btn pri" href="tutor.html?q=' + encodeURIComponent(q) + '">🧑‍🏫 اسأل الأستاذ عن هالموضوع</a></p></div>';
  } else h += '<p class="cadv">🔥 ولا غلطة! كفّي هيك.</p>';
  if (p && qs) {
    const wrong = qs.map((q, i) => ({ q, a: p.ans[i] })).filter(x => x.a !== x.q.a);
    if (wrong.length) h += "<h3>راجع غلطاتك:</h3>" + wrong.map(x => '<div class="qcard"><span class="qtopic">' + esc(topicName(x.q.t)) + '</span><p class="qq">' + x.q.q + '</p><div class="expl w">❌ جاوبت: ' + L[x.a] + ") " + x.q.o[x.a] + '</div><div class="expl">✅ <b>' + L[x.q.a] + ") " + x.q.o[x.q.a] + "</b><br>" + x.q.x + "</div></div>").join("");
  }
  return h;
}



/* ---- ✅ أهدافك اليوم: the goals sheet reads the REAL answers (Oct 26 fix: «سؤال اليوم» stayed un-ticked after answering) ---- */
// tell goals.js a goal is done right now (event + a direct write of the same per-day mark, in case goals.js isn't there)
function goalDone(k) {
  try { if (window.NursinGoals && window.NursinGoals.mark) { window.NursinGoals.mark(k); window.NursinGoals.stale && window.NursinGoals.stale(); return; } } catch (e) {}
  try {
    const K = "nursin_goals_v1", dk = N.dayKey(); let o = JSON.parse(localStorage.getItem(K) || "null");
    if (!o || o.d !== dk || !o.done || typeof o.done !== "object") o = { d: dk, done: {} };
    if (!o.done[k]) { o.done[k] = Date.now(); localStorage.setItem(K, JSON.stringify(o)); }
    sessionStorage.removeItem("nursin_goals_live_v1");
  } catch (e) {}
}
// my classes → for each: did I answer today's «سؤال اليوم» (classes/{cid}/dq/{day}_{uid}) and submit this week's exam (results/{wk}_{uid})
export async function goalsStatus(api, max = 8) {
  const { db, fs: F2, user } = api; if (!user) return null;
  const uid = user.uid, dk = api.N.dayKey(), wk = isoWeek(dk);
  let list;
  try { list = (await F2.getDocs(F2.collection(db, "users", uid, "myClasses"))).docs.map(d => ({ cid: d.id, name: String((d.data() || {}).name || "").slice(0, 30) })).slice(0, max); }
  catch (e) { return { err: denied(e) ? "notready" : "err" }; }
  const one = async c => {
    const [dq, r, w] = await Promise.all([
      F2.getDoc(F2.doc(db, "classes", c.cid, "dq", dk + "_" + uid)).then(x => x.exists() ? x.data() : null, e => (denied(e) ? "x" : "err")),
      F2.getDoc(F2.doc(db, "classes", c.cid, "results", wk + "_" + uid)).then(x => x.exists() ? x.data() : null, e => (denied(e) ? "x" : "err")),
      F2.getDoc(F2.doc(db, "classes", c.cid, "weeks", wk)).then(x => x.exists() ? x.data() : null, () => null)
    ]);
    if (dq === "x" && r === "x") return null;                     // not a member any more
    const mine = r && typeof r === "object" ? { score: r.score, total: r.total } : null;
    return { cid: c.cid, name: c.name, mine, week: w && w.qids ? { n: w.qids.length } : null, dq: dq === "err" || dq === "x" ? null : { mine: dq ? (dq.ok ? "ok" : "wrong") : null } };
  };
  return { list: (await Promise.all(list.map(one))).filter(Boolean) };
}

/* ---- 🧑‍🏫 for the tutor: a short, plain summary of my classes (reads only what the class page already reads) ---- */
// one class → plain data the tutor context turns into words (pure, tested)
export function classInfo(cls, members, results, week, dqAns, uid, dk, quiz) {
  const wk = isoWeek(dk), pw = prevWeek(dk), ids = (members || []).map(m => m.uid), nm = u => { const r = (members || []).find(m => m.uid === u) || (results || []).find(x => x.uid === u); return r ? String(r.name || "طالب").slice(0, 30) : "طالب"; };
  const aw = w => { const a = weekAwards(results, w, ids.length ? ids : null); return { n: a.n, top: a.top, champ: a.champ.map(nm), up: a.up.map(u => ({ name: nm(u.uid), from: u.from, to: u.to })) }; };
  const mine = (results || []).find(r => r.uid === uid && r.wk === wk) || null;
  const out = { name: String(cls.name || "").slice(0, 30), owner: cls.owner === uid, members: ids.length, week: week ? { topics: (week.topics || []).slice(0, 6), intro: String(week.intro || "").slice(0, 160), n: (week.qids || []).length } : null,
    mine: mine ? { score: mine.score, total: mine.total, pct: pct(mine.score, mine.total), weak: advice(mine.wrongQ, quiz).slice(0, 3).map(a => a.t) } : null, now: aw(wk), last: aw(pw), dq: null };
  if (dqAns === "notready") out.dq = "notready";
  else if (Array.isArray(dqAns)) {
    const q = (quiz || []).find(x => x.id === dailyQid(cls.id || "", dk, quiz)), me = dqAns.find(a => a.uid === uid), s = dqSummary(dqAns);
    out.dq = { t: q ? q.t : "", mine: me ? (me.ok ? "ok" : "wrong") : null, first: s.first ? String(s.first.name || "طالب").slice(0, 30) : "", right: s.right, n: s.n };
  }
  return out;
}
export async function tutorSummary(api, max = 3) {
  const { db, fs: F2, user } = api; if (!user) return null;
  const uid = user.uid, dk = api.N.dayKey(), wk = isoWeek(dk), quiz = window.QUIZ || [];
  let list;
  try { list = (await F2.getDocs(F2.collection(db, "users", uid, "myClasses"))).docs.map(d => d.id).slice(0, max); }
  catch (e) { return { err: denied(e) ? "notready" : "err" }; }
  const one = async cid => {
    try {
      const [c, m, r, w] = await Promise.all([F2.getDoc(F2.doc(db, "classes", cid)), F2.getDocs(F2.collection(db, "classes", cid, "members")), F2.getDocs(F2.collection(db, "classes", cid, "results")), F2.getDoc(F2.doc(db, "classes", cid, "weeks", wk))]);
      if (!c.exists()) return null;
      let dq = null;
      try { dq = (await F2.getDocs(F2.query(F2.collection(db, "classes", cid, "dq"), F2.where("day", "==", dk)))).docs.map(d => d.data()); } catch (e) { dq = denied(e) ? "notready" : null; }
      return classInfo({ id: cid, ...c.data() }, m.docs.map(d => ({ uid: d.id, ...d.data() })), r.docs.map(d => d.data()), w.exists() ? w.data() : null, dq, uid, dk, quiz);
    } catch (e) { return null; }
  };
  return { list: (await Promise.all(list.map(one))).filter(Boolean) };
}
