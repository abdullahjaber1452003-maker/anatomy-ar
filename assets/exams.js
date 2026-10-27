// nursin «📅 امتحانات الأسبوع» + «الأوائل هالشهر». Loaded by assets/fb.js on exams.html and on quiz.html?exam=<id>.
// examStarts/{examId}_{uid} = {uid, exam, at}   — written when the student presses start (create-only: one attempt)
// examResults/{examId}_{uid} = {uid, exam, score, total, at} — written with the points when the exam ends (create-only, needs the start doc)
let A = null, N = null, F = null;
const MONTHS = ["كانون التاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تمّوز", "آب", "أيلول", "تشرين الأول", "تشرين التاني", "كانون الأول"];
const NOT_READY = "🛠️ الامتحانات بعدها عم تتجهّز، جرّب كمان شوي.";
const denied = e => e && e.code === "permission-denied";
const $ = (s, el) => (el || document).querySelector(s);
function init(api) { A = api; N = api.N; F = api.fs; }
const monthName = mk => MONTHS[+mk.slice(5, 7) - 1] + " " + mk.slice(0, 4);
const nice = dk => +dk.slice(8, 10) + " " + MONTHS[+dk.slice(5, 7) - 1];

async function status(ex) {
  if (!A.user) return { s: "out" };
  const key = ex.id + "_" + A.user.uid;
  try {
    const r = await F.getDoc(F.doc(A.db, "examResults", key));
    if (r.exists()) return { s: "done", score: r.data().score, total: r.data().total };
    const st = await F.getDoc(F.doc(A.db, "examStarts", key));
    return { s: st.exists() ? "started" : "open" };
  } catch (e) { if (!denied(e)) console.warn("nursin: exam status", e && e.code); return { s: denied(e) ? "notready" : "err" }; }
}
function examCard(ex, st, today) {
  const n = N.examQids(ex, window.QUIZ).length;
  let act;
  if (ex.day !== today) act = '<span class="small">بيفتح ' + (ex.day > today ? "نهار " + N.DAYS[N.weekday(ex.day)] : "") + "</span>";
  else if (st.s === "done") act = '<span class="exdone">✅ قدّمتو: <b dir="ltr">' + st.score + "/" + st.total + "</b></span>";
  else if (st.s === "started") act = '<span class="small">⛔ بلّشتو وما كمّلتو (المحاولة وحدة)</span>';
  else if (st.s === "load") act = '<span class="small">⏳ …</span>';
  else if (st.s === "out") act = '<span class="small">سجّل دخول فوق تا تقدّمو</span>';
  else if (st.s === "notready") act = '<span class="small">' + NOT_READY + "</span>";
  else if (st.s === "err") act = '<span class="small">⚠️ ما قدرنا نتأكّد، جرّب بعد شوي.</span>';
  else act = '<a class="btn pri" href="quiz.html?exam=' + encodeURIComponent(ex.id) + '">▶️ ابدأ الامتحان</a>';
  return '<div class="excard"><b lang="fr" dir="ltr">' + N.esc(ex.n) + '</b><small>' + N.esc(ex.ar) + " · " + n + " أسئلة</small>" + act + "</div>";
}

export async function page(api) {
  init(api);
  const el = document.getElementById("exams-app"); if (!el) return;
  const today = N.dayKey(), week = N.weekOf(today), todays = N.examsFor(today), mk = N.monthKey(), pk = N.prevMonth(mk);
  el.innerHTML =
    (A.user ? "" : '<div id="exsign"></div>') +
    '<section class="qcard" id="extoday"><h2>📅 امتحانات اليوم <small>' + N.DAYS[N.weekday(today)] + " " + nice(today) + "</small></h2>" +
    (todays.length ? '<div class="excards" id="excards">' + todays.map(x => examCard(x, { s: A.user ? "load" : "out" }, today)).join("") + "</div>" +
      '<p class="small">كل امتحان مفتوح <b>اليوم بس</b>، و<b>محاولة وحدة</b>. صح <b>+٣</b>، غلط <b>−٥</b>، والنقاط بتنحسب بترتيب الشهر. ✂️ 50/50 مش مسموح.</p>'
      : '<p>😌 اليوم الأحد، ما في امتحان. ارجع بكرا عندك <b>' + N.examsFor(N.addDays(today, 1)).map(x => N.esc(x.n)).join("</b> و<b>") + "</b>.</p>") + "</section>" +
    '<section class="qcard"><h2>🗓️ برنامج هالأسبوع</h2><div class="exweek">' +
    week.map(d => '<div class="exday' + (d.day === today ? " today" : d.day < today ? " past" : "") + '"><b>' + d.name + "<small>" + +d.day.slice(8, 10) + "/" + +d.day.slice(5, 7) + (d.day === today ? " · اليوم" : "") + '</small></b><span class="exchips">' + d.exams.map(x => '<i lang="fr" dir="ltr">' + N.esc(x.n) + "</i>").join("") + "</span></div>").join("") +
    '<div class="exday' + (N.weekday(today) === 6 ? " today" : "") + '"><b>الأحد</b><span class="exchips"><i>عطلة 😴</i></span></div></div></section>' +
    '<section class="qcard" id="top"><h2>🏆 الأوائل هالشهر <small>' + monthName(mk) + '</small></h2><ol class="lb" id="exboard"><li class="small">' + (A.user ? "⏳ …" : "سجّل دخول تا تشوف الترتيب.") + "</li></ol>" +
    '<p class="small">الترتيب لكل الطلاب المسجّلين، حسب النقاط يلي جمّعوها هالشهر (كويز، امتحانات، تحدّيات). بيرجع من الصفر أوّل كل شهر.</p></section>' +
    '<section class="qcard" id="exprev" hidden><h2>🥇 أبطال ' + monthName(pk) + '</h2><div class="podium" id="expod"></div></section>';
  if (!A.user) { A.signInCard($("#exsign", el), '<p class="fbig">📅 امتحان كل يوم، و🏆 مين الأوّل على الكل آخر الشهر.</p><p>سجّل دخول بغوغل تا تقدّم الامتحانات وتطلع بالترتيب.</p>'); return; }
  if (todays.length) Promise.all(todays.map(status)).then(sts => { const c = $("#excards", el); if (c) c.innerHTML = todays.map((x, i) => examCard(x, sts[i], today)).join(""); });
  board(el, mk, pk);
}
async function board(el, mk, pk) {
  const ol = $("#exboard", el), me = A.user.uid, f = N.monthField(mk), pf = N.monthField(pk);
  try {
    const s = await F.getDocs(F.query(F.collection(A.db, "users"), F.orderBy(f, "desc"), F.limit(50)));
    const list = s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(p => (p[f] | 0) > 0);
    const row = (p, i) => '<li class="lbr' + (p.uid === me ? " me" : "") + '"><span class="rk">' + (["🥇", "🥈", "🥉"][i] || i + 1) + "</span>" + N.avatar(p.photo, p.name, "av") +
      '<span class="nm"><b><bdi>' + N.esc(N.cleanName(p.name)) + "</bdi>" + (p.uid === me ? " <small>(إنت)</small>" : "") + '</b><small><span class="lvc">Lv ' + N.level(p.points) + "</span> " + (p[f] | 0) + " نقطة هالشهر</small></span></li>";
    let h = list.map(row).join("");
    if (!list.some(p => p.uid === me)) {
      const mine = A.profile && A.profile.monthKey === mk ? A.profile.monthPoints | 0 : 0;
      h += '<li class="lbr me"><span class="rk">—</span>' + N.avatar(A.profile.photo, A.profile.name, "av") + '<span class="nm"><b><bdi>' + N.esc(A.profile.name) + "</bdi> <small>(إنت)</small></b><small>" + mine + " نقطة هالشهر" + (mine ? "" : " · اعمل كويز أو امتحان تا تطلع بالترتيب") + "</small></span></li>";
    }
    ol.innerHTML = h || '<li class="small fempty">لسّا ما حدا جمّع نقاط هالشهر. كون إنت الأوّل!</li>';
  } catch (e) { console.warn("nursin: month board", e && e.code); ol.innerHTML = '<li class="small">⚠️ ما قدرنا نجيب الترتيب هلّق. جرّب بعد شوي.</li>'; }
  try {
    const s = await F.getDocs(F.query(F.collection(A.db, "users"), F.orderBy(pf, "desc"), F.limit(3)));
    const top = s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(p => (p[pf] | 0) > 0);
    if (top.length) {
      $("#expod", el).innerHTML = top.map((p, i) => '<div class="pod p' + (i + 1) + '"><span class="md">' + ["🥇", "🥈", "🥉"][i] + "</span>" + N.avatar(p.photo, p.name, "av avl") + "<b><bdi>" + N.esc(N.cleanName(p.name)) + "</bdi></b><small>" + (p[pf] | 0) + " نقطة</small></div>").join("");
      $("#exprev", el).hidden = false;
    }
  } catch (e) { console.warn("nursin: last month", e && e.code); }
}

export async function openOnQuiz(api, id) {
  init(api);
  const Q = window.NursinQuiz; if (!Q) return;
  const ex = N.examById(id), today = N.dayKey();
  if (!ex) return Q.message('⚠️ هالامتحان مش موجود. <a href="exams.html">شوف برنامج الامتحانات</a>.');
  if (ex.day !== today) return Q.message("⏰ هالامتحان كان مفتوح نهار " + N.DAYS[N.weekday(ex.day)] + " " + nice(ex.day) + ' بس. <a href="exams.html">شوف امتحانات اليوم ←</a>');
  const st = await status(ex);
  if (st.s === "done") return Q.message('<p class="qq">✅ قدّمت هالامتحان: <b dir="ltr">' + st.score + "/" + st.total + '</b></p><p>بس محاولة وحدة لكل امتحان. <a class="btn pri" href="exams.html">📅 الامتحانات والأوائل</a></p>');
  if (st.s === "started") return Q.message('<p class="qq">⛔ بلّشت هالامتحان من قبل وما كمّلتو.</p><p>المحاولة وحدة بس. بكرا في امتحانين جداد 💪 <a href="exams.html">البرنامج ←</a></p>');
  if (st.s === "notready" || st.s === "err") return Q.message("<p>" + (st.s === "notready" ? NOT_READY : "⚠️ ما قدرنا نحمّل الامتحان. تأكّد من الإنترنت.") + '</p><p><a href="exams.html">رجوع للامتحانات</a></p>');
  const qids = N.examQids(ex, window.QUIZ);
  Q.message('<p class="qq">📅 امتحان اليوم: <b lang="fr" dir="ltr">' + N.esc(ex.n) + "</b></p><ul class=\"fsteps\"><li>📝 " + qids.length + " أسئلة · " + N.esc(ex.ar) + "</li><li>☝️ <b>محاولة وحدة بس</b>. إذا طلعت من الصفحة بالنص ما فيك ترجع تبلّش.</li><li>✅ صح <b>+٣</b> · ❌ غلط <b>−٥</b> · ✂️ 50/50 مش مسموح</li></ul>" +
    '<p><button class="btn pri big" id="exgo" type="button">▶️ بلّش الامتحان</button></p><p id="exmsg" class="small" aria-live="polite"></p>');
  const b = document.getElementById("exgo");
  b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      await F.setDoc(F.doc(A.db, "examStarts", ex.id + "_" + A.user.uid), { uid: A.user.uid, exam: ex.id, at: F.serverTimestamp() });
      Q.startChallenge({ exam: ex.id, qids, label: "📅 امتحان: " + ex.n });
    } catch (e) {
      if (!denied(e)) console.warn("nursin: exam start", e && e.code);
      const again = denied(e) && (await status(ex)).s;
      document.getElementById("exmsg").textContent = again === "started" || again === "done" ? "⛔ هالامتحان بلّشتو من قبل." : denied(e) ? NOT_READY : "⚠️ ما زبط، تأكّد من الإنترنت وجرّب كمان مرّة.";
      b.disabled = false;
    }
  });
}


// 👨‍🏫 for the tutor: did I take these exams? (today: start + result; earlier days: result only)
export async function tutorStatus(api, exs) {
  init(api); if (!A.user) return null;
  const today = N.dayKey(), out = {};
  await Promise.all((exs || []).map(async ex => {
    if (ex.day === today) { out[ex.id] = await status(ex); return; }
    if (ex.day > today) return;                                   // not open yet
    try { const r = await F.getDoc(F.doc(A.db, "examResults", ex.id + "_" + A.user.uid)); out[ex.id] = r.exists() ? { s: "done", score: r.data().score, total: r.data().total } : { s: "missed" }; }
    catch (e) { out[ex.id] = { s: denied(e) ? "notready" : "err" }; }
  }));
  return out;
}
