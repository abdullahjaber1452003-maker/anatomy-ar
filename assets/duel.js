// ⚔️ «تحدي اليوم» (Abdullah, Oct 27 9:44–9:53 PM): every day the site draws random pairs inside each class, the list is visible to the
// whole class, both students of a pair take the SAME short quiz (questions from the site's own quiz bank, this week's 📌 lessons first)
// and the higher score wins. The winner stays qualified (🔥) for the next day and meets a new challenger; the loser is out and a
// classmate who was not qualified takes the place. Weekly board 🥇🥈🥉 with prize slots the admin fills in (config/duelPrizes) —
// nothing is promised until he writes it. Loaded by assets/fb.js on the home page (#duel) and by classes.js on a class page.
//
// How it stays the same for everyone without a server: the draw is a pure function of (class id, Beirut day, the class members who
// joined before that day, each member's 🔥 streak at the start of that day). Streaks come from this week's result docs, replayed day by
// day from Monday with the same draw. Every phone computes the same pairs; nobody writes the draw, so nobody can bias it.
// Result docs classes/{cid}/duel/{day}_{uid} (rules v14): created when a student STARTS (s = -1), then ONE update with the score within
// 8 min. A start that never finished counts as 0. Fair, explicit rules (also shown in the card):
//   both played → higher score wins (+1 win, 🔥 +1; loser 🔥 back to 0) · same score → 🤝 draw: no win, both keep their 🔥 ·
//   only one played → no winner (incomplete): the one who played keeps his 🔥, the absent one loses it · nobody played → no result,
//   both lose their 🔥 · odd number of students → one 😴 rest day, 🔥 kept · joined today → in tomorrow's draw.
// Week = Monday → Sunday (Beirut). Ranking: wins, then best 🔥 run, then correct answers. Only students with ≥ 1 win get a podium place.
// Limits (said plainly in the card): the score is counted on the student's own phone. Rules stop anyone writing for someone else,
// a second try, or a late score, but a determined student could still cheat on his own device. It is not cheat-proof.
export const NQ = 5, Q_SEC = 30, WINDOW_MIN = 8;

/* ---------- pure helpers (tests import them) ---------- */
export function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(a, seed) { const x = a.slice(), r = rng(seed); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
export function addDays(dk, n) { const t = new Date(dk + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
export function weekStart(dk) { return addDays(dk, -((new Date(dk + "T12:00:00Z").getUTCDay() + 6) % 7)); }
// who is in the draw on day dk: members whose join day is before dk (no join date = old member)
export function eligible(members, dk) { return members.filter(m => m && m.uid && (!m.jd || m.jd < dk)).map(m => m.uid).sort(); }
// the draw: qualified (🔥 > 0) students each meet a challenger who is not qualified; the rest pair up; odd one out rests
export function draw(cid, dk, uids, streak) {
  const seed = hash(cid + "|" + dk), q = shuffle(uids.filter(u => (streak[u] | 0) > 0).sort(), seed), o = shuffle(uids.filter(u => !((streak[u] | 0) > 0)).sort(), seed ^ 0x9e37);
  const pairs = [], n = Math.min(q.length, o.length);
  for (let i = 0; i < n; i++) pairs.push([q[i], o[i]]);
  const rest = q.length > n ? q.slice(n) : o.slice(n);
  for (let i = 0; i + 1 < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]]);
  return { pairs, bye: rest.length % 2 ? rest[rest.length - 1] : null };
}
// one pair's outcome from its two docs (null = did not play). final = the day is over (a start without score counts as 0)
export function outcome(da, db, final) {
  const sc = d => !d ? null : d.s >= 0 ? d.s | 0 : final ? 0 : -1;    // -1 = playing right now
  const a = sc(da), b = sc(db);
  if (a === -1 || b === -1) return { k: "live", a, b };
  if (a == null && b == null) return { k: "none", a, b };
  if (a == null || b == null) return { k: "half", a, b };
  return { k: a > b ? "a" : b > a ? "b" : "tie", a, b };
}
// replay the week up to today: streaks at the start of today, weekly stats, and each day's pairs
export function replay(cid, members, docs, today) {
  const by = {}; (docs || []).forEach(d => { if (d && d.d && d.uid) (by[d.d] = by[d.d] || {})[d.uid] = d; });
  const streak = {}, st = {}, days = [];
  const S = u => (st[u] = st[u] || { uid: u, wins: 0, ties: 0, losses: 0, played: 0, correct: 0, best: 0 });
  for (let dk = weekStart(today); dk <= today; dk = addDays(dk, 1)) {
    const uids = eligible(members, dk), dr = draw(cid, dk, uids, streak), day = by[dk] || {}, final = dk < today;
    days.push({ d: dk, pairs: dr.pairs, bye: dr.bye, streak: { ...streak } });
    if (!final) break;
    dr.pairs.forEach(([a, b]) => {
      const o = outcome(day[a], day[b], true);
      [[a, o.a], [b, o.b]].forEach(([u, s]) => { if (s != null) { S(u).played++; S(u).correct += s; } });
      if (o.k === "a" || o.k === "b") { const w = o.k === "a" ? a : b, l = o.k === "a" ? b : a; streak[w] = (streak[w] | 0) + 1; streak[l] = 0; S(w).wins++; S(l).losses++; }
      else if (o.k === "tie") { S(a).ties++; S(b).ties++; }
      else if (o.k === "half") { if (o.a == null) streak[a] = 0; if (o.b == null) streak[b] = 0; }
      else { streak[a] = 0; streak[b] = 0; }
      [a, b].forEach(u => { if ((streak[u] | 0) > S(u).best) S(u).best = streak[u]; });
    });
  }
  const board = Object.values(st).filter(x => x.wins > 0).sort((x, y) => y.wins - x.wins || y.best - x.best || y.correct - x.correct || (x.uid < y.uid ? -1 : 1));
  return { today: days[days.length - 1], days, streak, stats: st, board };
}
// the day's questions: the same for the whole class that day, from this week's pinned lessons' topics when there are enough
export function pickQuestions(quiz, cid, dk, topics) {
  const all = (quiz || []).filter(q => q && q.id && Array.isArray(q.o) && q.o.length >= 2 && q.a >= 0 && q.a < q.o.length);
  const tset = new Set(topics || []), pinned = all.filter(q => tset.has(q.t));
  const pool = pinned.length >= NQ * 2 ? pinned : all;
  return shuffle(pool.map(q => q.id).sort(), hash("q|" + cid + "|" + dk)).slice(0, NQ).map(id => all.find(q => q.id === id));
}
export function prizeText(p, i) { const t = p && String(p["p" + (i + 1)] || "").trim(); return t || ""; }

/* ---------- browser ---------- */
let A = null, F = null, N = null;
const esc = s => (A && A.esc ? A.esc(s) : String(s == null ? "" : s));
const LS = "nursin_duel_cls_v1", PS = "nursin_duel_play_v1";
function nm(m) { return N.cleanName(m && m.name); }
function person(m, st) { return N.avatar(m && m.photo, nm(m), "av") + '<bdi class="dn">' + esc(nm(m)) + "</bdi>" + (A.pdot ? A.pdot(m && m.uid) : "") + (st > 0 ? ' <span class="dfire" title="متأهّل">🔥' + st + "</span>" : ""); }
function weekTopics() {
  const L = window.NursinLessons; if (!L || !L.weekLes) return [];
  const w = L.weekLes() || {}, out = [];
  Object.keys(w).forEach(s => (w[s] || []).forEach(k => { const x = (L.list || []).find(x => L.base(x) === k); if (x && x.t) out.push(x.t); }));
  return out;
}
async function myClasses() {
  const s = await F.getDocs(F.collection(A.db, "users", A.user.uid, "myClasses"));
  return s.docs.map(d => ({ id: d.id, name: String(d.data().name || "") }));
}
async function load(cid) {
  const wk = weekStart(N.dayKey());
  const [ms, ds, pz] = await Promise.all([
    F.getDocs(F.collection(A.db, "classes", cid, "members")),
    F.getDocs(F.query(F.collection(A.db, "classes", cid, "duel"), F.where("wk", "==", wk), F.limit(500))),
    F.getDoc(F.doc(A.db, "config", "duelPrizes")).catch(() => null)
  ]);
  const members = ms.docs.map(d => { const x = d.data() || {}, j = x.joinedAt && x.joinedAt.toDate ? N.dayKey(x.joinedAt.toDate()) : ""; return { uid: d.id, name: x.name, photo: x.photo, jd: j }; });
  return { members, docs: ds.docs.map(d => d.data()), prizes: pz && pz.exists() ? pz.data() : {} };
}
const RULES = '<details class="drules"><summary>📜 القوانين</summary><ul>' +
  "<li>كل يوم قرعة جديدة بين طلاب الصف. الكل بيشوف اللائحة.</li>" +
  "<li>التنين بياخدوا نفس الأسئلة: " + NQ + " أسئلة من كويز الموقع (دروس 📌 هالأسبوع أوّل)، " + Q_SEC + " ثانية لكل سؤال، محاولة وحدة بس.</li>" +
  "<li>العلامة الأعلى بتربح: الرابح بيضل متأهّل 🔥 لبكرا وبيواجه حدا جديد، والخسران بيطلع ومحلّو بيفوت حدا تاني من الصف.</li>" +
  "<li>🤝 نفس العلامة = تعادل: ما في رابح، والتنين بيحتفظوا بالـ 🔥 تبعن.</li>" +
  "<li>إذا واحد بس لعب: ما في رابح (التحدي ما كمل). اللي لعب بيحتفظ بالـ 🔥، واللي ما لعب بيخسرها. إذا ولا واحد لعب: ما في نتيجة.</li>" +
  "<li>بلّشت وما كمّلت = صفر. عدد فردي = واحد بيرتاح 😴 وبيحتفظ بالـ 🔥. اللي فات عالصف اليوم بيدخل قرعة بكرا.</li>" +
  "<li>ترتيب الأسبوع (الاتنين → الأحد): عدد الربحات، بعدين أطول 🔥، بعدين مجموع الأجوبة الصح.</li>" +
  "<li>⚠️ العلامة بتنحسب على تلفونك. ما حدا بيقدر يبعت علامة عن غيره ولا يعيد ولا يبعت متأخّر، بس النظام مش مضمون ١٠٠٪ ضد الغش.</li></ul></details>";
function podium(R, mem, prizes) {
  const by = {}; mem.forEach(m => { by[m.uid] = m; });
  const rows = [0, 1, 2].map(i => {
    const x = R.board[i], p = prizeText(prizes, i);
    return '<li class="dpod"><span class="dmed">' + ["🥇", "🥈", "🥉"][i] + "</span>" + (x && by[x.uid] ? person(by[x.uid], 0) + ' <small class="dwk">' + x.wins + " ربح · أطول 🔥" + x.best + "</small>" : '<span class="small">لسّا فاضي</span>') +
      '<small class="dprize">🎁 ' + (p ? esc(p) : "الجائزة: لسّا ما تحدّدت") + "</small></li>";
  }).join("");
  return '<div class="dweek"><h3>🏆 ترتيب الأسبوع</h3><ol class="dpods">' + rows + "</ol>" + (isAdmin() ? '<button class="btn sm" type="button" data-dprize>✏️ حدّد الجوائز (أدمن)</button>' : "") + "</div>";
}
function isAdmin() { return !!(A.user && A.user.email === "abdullahjaber1452003@gmail.com" && A.user.emailVerified); }
export function tileNote(k, n, st) { try { document.dispatchEvent(new CustomEvent("nursin:tile", { detail: { k, n, st } })); } catch (e) {} }
function render(el, cid, cname, data, classes) {
  const today = N.dayKey(), R = replay(cid, data.members, data.docs, today), T = R.today, me = A.user.uid;
  const by = {}; data.members.forEach(m => { by[m.uid] = m; });
  const docs = {}; data.docs.filter(d => d.d === today).forEach(d => { docs[d.uid] = d; });
  const sk = T.streak, mine = T.pairs.find(p => p.includes(me));
  let top = "";
  const qs = pickQuestions(window.QUIZ, cid, today, weekTopics());
  if (!by[me]) top = '<p class="small">إنت مش بهالصف.</p>';
  else if (!eligible(data.members, today).includes(me)) top = '<p class="dme">🆕 فتت عالصف اليوم، بتدخل قرعة بكرا.</p>';
  else if (T.bye === me) top = '<p class="dme">😴 اليوم إلك استراحة (عدد الطلاب فردي). الـ 🔥 تبعك محفوظة.</p>';
  else if (mine) {
    const op = mine[0] === me ? mine[1] : mine[0], md = docs[me], od = docs[op], o = outcome(md, od, false);
    let act;
    if (!md) act = qs.length === NQ ? '<button class="btn pri dgo" type="button" data-dstart>⚔️ ابدأ التحدي</button><p class="small">' + NQ + " أسئلة · " + Q_SEC + " ثانية لكل سؤال · محاولة وحدة</p>" : '<p class="small">⚠️ ما في أسئلة كفاية هلّق.</p>';
    else if (md.s < 0) act = openPlay(cid) ? '<button class="btn pri dgo" type="button" data-dstart>▶️ كمّل التحدي</button>' : '<p class="small">⏱️ بلّشت وما كمّلت، فعلامتك صفر اليوم.</p>';
    else if (!od || od.s < 0) act = '<p class="dres">✅ علامتك ' + md.s + "/" + md.n + ". ناطرين <bdi>" + esc(nm(by[op])) + "</bdi> يلعب (علامتك مخبّاية عنو لحتى يخلّص).</p>";
    else act = '<p class="dres">' + (o.k === "tie" ? "🤝 تعادل " : o.k === "a" ? "🏆 ربحت! " : "😔 خسرت ") + '<b class="dsc"><span>' + md.s + "</span><i>–</i><span>" + od.s + "</span></b></p>";
    top = '<div class="dvs"><div class="dside">' + person(by[me], sk[me]) + '</div><b class="dx">⚔️</b><div class="dside">' + person(by[op], sk[op]) + "</div></div>" + act;
  }
  const list = T.pairs.map(([a, b]) => {
    const o = outcome(docs[a], docs[b], false), st = (u, s) => s == null ? "⏳" : s === -1 ? "✏️" : "✅";
    const res = o.k === "a" || o.k === "b" || o.k === "tie" ? '<b class="dsc"><span>' + o.a + "</span><i>–</i><span>" + o.b + "</span></b>" : '<span class="dst">' + st(a, o.a) + " " + st(b, o.b) + "</span>";
    const win = o.k === "a" ? a : o.k === "b" ? b : null;
    return '<li class="dpair' + (a === me || b === me ? " me" : "") + '"><span class="dp' + (win === a ? " dwin" : "") + '">' + person(by[a] || { uid: a }, sk[a]) + "</span>" + res +
      '<span class="dp' + (win === b ? " dwin" : "") + '">' + person(by[b] || { uid: b }, sk[b]) + "</span></li>";
  }).join("") + (T.bye && by[T.bye] ? '<li class="dpair dbye">😴 ' + person(by[T.bye], sk[T.bye]) + " <small>استراحة</small></li>" : "");
  const pick = classes && classes.length > 1 ? '<select class="dcls" aria-label="الصف">' + classes.map(c => '<option value="' + esc(c.id) + '"' + (c.id === cid ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select>" : "";
  el.innerHTML = '<div class="dhead"><h2>⚔️ تحدي اليوم <small dir="ltr">' + esc(today) + "</small></h2>" + pick + '</div><p class="small">صف <bdi>' + esc(cname) + "</bdi> · " + T.pairs.length + " تحدّي اليوم</p>" + top +
    (T.pairs.length ? '<h3 class="dlh">قرعة اليوم</h3><ol class="dlist">' + list + "</ol>" : '<p class="small">لازم يكون بالصف تنين أو أكتر (فاتوا قبل اليوم) تا تصير قرعة.</p>') +
    podium(R, data.members, data.prizes) + RULES;
  const s = el.querySelector("[data-dstart]"); if (s) s.addEventListener("click", () => play(el, cid, mine, qs, () => show(el, cid)));
  // 🏠 the home tile «⚔️ تحدي اليوم» (assets/tiles.js) shows how many challenges are still to play today (one per day; the design has no catch-up days)
  if (el.id === "duel") tileNote("duel", el.querySelector("[data-dstart]") ? 1 : 0, mine ? (docs[me] && docs[me].s >= 0 ? "done" : "todo") : "none");
  const c = el.querySelector(".dcls"); if (c) c.addEventListener("change", () => { try { localStorage.setItem(LS, c.value); } catch (e) {} show(el, c.value); });
  const pz = el.querySelector("[data-dprize]"); if (pz) pz.addEventListener("click", () => editPrizes(data.prizes, () => show(el, cid)));
}
function openPlay(cid) { try { const p = JSON.parse(localStorage.getItem(PS) || "null"); return p && p.cid === cid && p.d === N.dayKey() && p.u === A.user.uid && Date.now() - p.at < (WINDOW_MIN - 1) * 60000 ? p : null; } catch (e) { return null; } }
// ✏️ prizes (Abdullah, Oct 28 6:37 AM): no typing — he PICKS from ready options per rank (the same option may go to several ranks);
// «✍️ غير شي» stays as a last, optional free text. Display only: the chosen text is what students read under each rank.
export function prizePresets(i) {
  return ["👑 تاج جنب الاسم لمدة أسبوع", ["🏅 شارة ذهبية عالبروفايل", "🏅 شارة فضية عالبروفايل", "🏅 شارة برونزية عالبروفايل"][i] || "🏅 شارة عالبروفايل",
    ["⭐ +100 نقطة إضافية", "⭐ +50 نقطة إضافية", "⭐ +25 نقطة إضافية"][i] || "⭐ نقاط إضافية", "📌 الاسم بلوحة الشرف عالصفحة الرئيسية",
    "🎨 ثيم حصري يفتح للفائز", "💡 تلميح مجاني بتحدي الأسبوع الجاي", "🛡️ حماية سلسلة 🔥 ليوم واحد", "🎁 جائزة من الأستاذ (بالصف)"];
}
function editPrizes(cur, done) {
  const old = document.getElementById("dprizes"); if (old) old.remove();
  const box = document.createElement("div"); box.id = "dprizes"; box.className = "onlsheet dpzsheet"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "حدّد الجوائز");
  const row = i => {
    const P = prizePresets(i), v = prizeText(cur, i), isP = P.includes(v), custom = !!v && !isP;
    return '<label class="dpzr"><b>' + ["🥇 الأول", "🥈 التاني", "🥉 التالت"][i] + '</b><select data-pz="' + i + '"><option value="">— لسّا ما تحدّدت —</option>' +
      P.map(p => '<option' + (p === v ? " selected" : "") + ">" + esc(p) + "</option>").join("") + '<option value="*"' + (custom ? " selected" : "") + ">✍️ غير شي…</option></select>" +
      '<input type="text" maxlength="80" data-pzt="' + i + '" placeholder="اكتب الجائزة" value="' + (custom ? esc(v) : "") + '"' + (custom ? "" : " hidden") + "></label>";
  };
  box.innerHTML = '<div class="onlbox"><div class="onlhd"><b>✏️ جوائز الأسبوع</b><button class="btn sm" type="button" data-pzx aria-label="سكّر">✖</button></div>' +
    '<p class="small">اختار جائزة لكل مرتبة (فيك تعطي نفس الجائزة لأكتر من مرتبة). الطلاب بيشوفوا النص تحت كل مرتبة.</p>' + [0, 1, 2].map(row).join("") +
    '<p class="dpzmsg small" aria-live="polite"></p><button class="btn pri dpzsave" type="button">💾 احفظ الجوائز</button></div>';
  document.body.appendChild(box);
  box.addEventListener("change", e => { const s = e.target.closest("select[data-pz]"); if (!s) return; const t = box.querySelector('[data-pzt="' + s.dataset.pz + '"]'); t.hidden = s.value !== "*"; if (!t.hidden) t.focus(); });
  box.addEventListener("click", async e => {
    if (e.target === box || e.target.closest("[data-pzx]")) { box.remove(); return; }
    if (!e.target.closest(".dpzsave")) return;
    const v = [0, 1, 2].map(i => { const s = box.querySelector('[data-pz="' + i + '"]').value; return (s === "*" ? box.querySelector('[data-pzt="' + i + '"]').value : s).trim().slice(0, 80); });
    const msg = box.querySelector(".dpzmsg"); msg.textContent = "⏳ …";
    try { await F.setDoc(F.doc(A.db, "config", "duelPrizes"), { p1: v[0], p2: v[1], p3: v[2], at: F.serverTimestamp(), by: A.user.uid }); box.remove(); done(); }
    catch (er) { msg.textContent = er && er.code === "permission-denied" ? "⚠️ لازم تنشر قواعد Firestore v14 أوّل." : "⚠️ ما زبط الحفظ."; }
  });
}
// the quiz: a full-screen sheet (no ads inside), one question at a time, 30 s each, no answers shown until the end
async function play(el, cid, pair, qs, done) {
  const me = A.user.uid, op = pair[0] === me ? pair[1] : pair[0], today = N.dayKey(), key = today + "_" + me, ref = F.doc(A.db, "classes", cid, "duel", key);
  let st = openPlay(cid);
  if (!st) {
    try {
      const ex = await F.getDoc(ref);
      if (ex.exists()) { done(); return; }
      const p = A.profile || {};
      await F.setDoc(ref, { uid: me, d: today, wk: weekStart(today), vs: op, s: -1, n: NQ, name: N.cleanName(p.name || A.user.displayName).slice(0, 39), photo: String(p.photo || "").slice(0, 500), t: F.serverTimestamp() });
    } catch (e) {
      const m = el.querySelector(".dmsg") || el.appendChild(Object.assign(document.createElement("p"), { className: "small dmsg" }));
      m.textContent = e && e.code === "permission-denied" ? "⏳ التحدي بعدو مش جاهز (ناطرين تحديث صغير بإعدادات الموقع). جرّب بعد شوي 🙏" : "⚠️ تأكّد من الإنترنت وجرّب كمان مرّة.";
      return;
    }
    st = { cid, d: today, u: me, at: Date.now(), i: 0, picks: [], qa: Date.now() };
  }
  const save = () => { try { localStorage.setItem(PS, JSON.stringify(st)); } catch (e) {} };
  save();
  const sh = document.createElement("div"); sh.className = "duelq"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", "⚔️ تحدي اليوم");
  document.body.appendChild(sh); document.documentElement.classList.add("duelon");
  let timer = 0;
  const finish = async () => {
    clearInterval(timer);
    const score = qs.reduce((n, q, i) => n + (st.picks[i] === q.a ? 1 : 0), 0);
    sh.innerHTML = '<div class="dqbox"><h2>⚔️ خلص التحدي</h2><p class="dres">علامتك <b>' + score + "/" + NQ + '</b></p><p class="small" id="dsave">⏳ عم نحفظ…</p><ol class="dfix">' +
      qs.map((q, i) => '<li class="' + (st.picks[i] === q.a ? "ok" : "no") + '">' + esc(q.q) + "<br><b>✔ " + esc(q.o[q.a]) + "</b>" + (st.picks[i] !== q.a ? " <small>" + (st.picks[i] >= 0 ? "❌ <span>" + esc(q.o[st.picks[i]]) + "</span>" : "⏰ خلص الوقت") + "</small>" : "") + "</li>").join("") +
      '</ol><button class="btn pri" type="button" data-dclose>رجوع</button></div>';
    sh.querySelector("[data-dclose]").addEventListener("click", () => { sh.remove(); document.documentElement.classList.remove("duelon"); done(); });
    const msg = sh.querySelector("#dsave");
    try { await F.updateDoc(ref, { s: score, ft: F.serverTimestamp() }); msg.textContent = "✅ انحفظت علامتك. النتيجة بتبين أوّل ما يلعب خصمك."; try { localStorage.removeItem(PS); } catch (e) {} }
    catch (e) { msg.textContent = "⚠️ ما انحفظت العلامة (الإنترنت أو خلص الوقت). جرّب ترجع للصفحة خلال دقايق."; }
  };
  const showQ = () => {
    if (st.i >= qs.length) return finish();
    const q = qs[st.i]; let left = Math.max(1, Q_SEC - Math.floor((Date.now() - st.qa) / 1000));
    sh.innerHTML = '<div class="dqbox"><div class="dqtop"><b>⚔️ سؤال ' + (st.i + 1) + " من " + qs.length + '</b><span class="dqt" dir="ltr">' + left + "s</span></div><p class=\"dqq\">" + esc(q.q) + "</p>" +
      q.o.map((o, i) => '<button class="btn dqo" type="button" data-o="' + i + '">' + esc(o) + "</button>").join("") + "</div>";
    sh.querySelectorAll("[data-o]").forEach(b => b.addEventListener("click", () => next(+b.dataset.o)));
    clearInterval(timer);
    timer = setInterval(() => { left = Q_SEC - Math.floor((Date.now() - st.qa) / 1000); const t = sh.querySelector(".dqt"); if (t) t.textContent = Math.max(0, left) + "s"; if (left <= 0) next(-1); }, 500);
  };
  const next = pick => { clearInterval(timer); st.picks[st.i] = pick; st.i++; st.qa = Date.now(); save(); showQ(); };
  showQ();
}
async function show(el, cid) {
  try {
    const classes = await myClasses();
    if (!classes.length) { el.innerHTML = '<h2>⚔️ تحدي اليوم</h2><p>كل يوم قرعة بين طلاب صفّك: ' + NQ + ' أسئلة، العلامة الأعلى بتربح وبتتأهّل لبكرا.</p><p><a class="btn pri" href="classes.html">🏫 فوت على صفّك</a></p>'; if (el.id === "duel") tileNote("duel", 0, "noclass"); return; }
    let pick = cid; if (!pick) { try { pick = localStorage.getItem(LS); } catch (e) {} }
    const c = classes.find(x => x.id === pick) || classes[0];
    render(el, c.id, c.name, await load(c.id), classes);
  } catch (e) {
    if (e && e.code === "permission-denied") el.innerHTML = '<h2>⚔️ تحدي اليوم</h2><p class="small">⏳ التحدي بعدو مش جاهز (ناطرين تحديث صغير بإعدادات الموقع). قريباً 🙏</p>';
    else { console.warn("nursin: duel", e && e.code); el.innerHTML = '<h2>⚔️ تحدي اليوم</h2><p class="small">⚠️ ما قدرنا نجيب التحدي هلّق. جرّب بعد شوي.</p>'; }
  }
}
// home (#duel) for the signed-in student; a class page passes its own class
export function start(api) { A = api; F = api.fs; N = api.N; const el = document.getElementById("duel"); if (el && api.user) { show(el); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !document.querySelector(".duelq")) show(el); }); } }
export async function classCard(api, el, cid, cname) {
  A = api; F = api.fs; N = api.N; if (!el || !api.user) return;
  try { render(el, cid, cname || "", await load(cid), null); }
  catch (e) { el.innerHTML = '<h2>⚔️ تحدي اليوم</h2><p class="small">' + (e && e.code === "permission-denied" ? "⏳ التحدي بعدو مش جاهز (ناطرين تحديث صغير بإعدادات الموقع). قريباً 🙏" : "⚠️ ما قدرنا نجيب التحدي هلّق. جرّب بعد شوي.") + "</p>"; }
}
// tests / screenshots: draw a given state without Firebase
export function _mockPrizes(api, cur) { A = api; F = api.fs; N = api.N; editPrizes(cur || {}, () => {}); }
export function _mock(api, el, cid, cname, data, classes) { A = api; F = api.fs; N = api.N; render(el, cid, cname, data, classes); }
