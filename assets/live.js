// nursin «🔴 تحدّي لايف» — two students, same questions at the same moment. Loaded by assets/fb.js.
// rooms/{id} = {host, hostName, hostPhoto, guest, guestName, guestPhoto, invited, invitedName, topic, topicLabel, qids[], state: waiting|live|done|cancelled,
//   hostReady, guestReady, hostSeen, guestSeen (heartbeats), idx, qAt (server time the question opened), startedAt, hostAns{i:choice}, guestAns, hostScore, guestScore,
//   hostPaid, guestPaid (points + winner bonus added once), winner: host|guest|tie, left (uid of a player who dropped), endedAt, createdAt}
let A = null, N = null, F = null;
const LEAD = 3000;                       // 3-2-1 before the first question
const $ = (s, el) => (el || document).querySelector(s);
const other = r => (r === "host" ? "guest" : "host");
const ms = t => (t && typeof t.toMillis === "function" ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : 0);
const NOT_READY = "التحدّي اللايف بعدو عم يتجهّز 🛠️ جرّب كمان شوي، أو العب «⚔️ تحدّى» العادي من صفحة أصحابي.";
const denied = e => e && e.code === "permission-denied";
function init(api) { A = api; N = api.N; F = api.fs; }
function bank() { return window.QUIZ || []; }
function qById(id) { const b = bank(); for (let i = 0; i < b.length; i++) if (b[i].id === id) return b[i]; return null; }

/* ---------- topics ---------- */
function topics() {
  const G = window.QGROUPS || {}, T = window.QTOP || {}, b = bank(), cnt = {};
  b.forEach(q => { cnt[q.t] = (cnt[q.t] || 0) + 1; });
  const main = [["all", "🔀 كل الدروس"], ["cardio", "❤️ القلب كلّو"], ["neuro", "🧠 الأعصاب كلّها"], ["henderson", "📋 Henderson"]].filter(t => t[0] === "all" || G[t[0]]);
  const sub = Object.keys(cnt).filter(k => cnt[k] >= 5 && k !== "henderson").map(k => [k, T[k] || k]);
  return { main, sub };
}
function topicLabel(k) { const t = topics(); for (const x of t.main.concat(t.sub)) if (x[0] === k) return x[1].replace(/^[^\wÀ-ɏ\u0600-\u06FF(]+/, ""); return k; }
function topicIds(k) {
  const G = window.QGROUPS || {};
  return bank().filter(q => k === "all" || (G[k] ? G[k].indexOf(q.t) >= 0 : q.t === k)).map(q => q.id);
}

/* ---------- page ---------- */
let unsub = null, timer = 0, hb = 0;
function stop() { if (unsub) unsub(); unsub = null; clearInterval(timer); clearInterval(hb); timer = hb = 0; }
export function page(api) {
  init(api); stop();
  const el = document.getElementById("live-app"); if (!el) return;
  const p = new URLSearchParams(location.search);
  if (!A.user) {
    A.signInCard(el, '<p class="fbig">🔴 تحدّي لايف: إنت وصاحبك، نفس السؤال بنفس اللحظة، و٢٠ ثانية لكل سؤال.</p><p>سجّل دخول بغوغل تا تفوت عالغرفة' + (p.get("room") ? " يلي انبعتتلك" : "") + ".</p>");
    return;
  }
  if (p.get("room")) return openRoom(el, p.get("room"));
  createScreen(el, p.get("with") || "", p.get("t") || "all");
}

async function createScreen(el, withUid, topic) {
  const t = topics();
  const opt = x => '<option value="' + N.esc(x[0]) + '"' + (x[0] === topic ? " selected" : "") + ">" + N.esc(x[1]) + "</option>";
  el.innerHTML = '<div class="qcard"><h2>🔴 غرفة لايف جديدة</h2>' +
    '<label class="lsel">📚 اختار الدرس<select id="ltopic"><optgroup label="كلّو">' + t.main.map(opt).join("") + '</optgroup><optgroup label="درس واحد">' + t.sub.map(opt).join("") + "</optgroup></select></label>" +
    '<p class="lwho">👥 مع مين؟</p><ul class="lfr" id="lfr"><li class="small">⏳ …</li></ul>' +
    '<p><button class="btn pri" id="lgo" type="button">🔴 يلا اعمل الغرفة</button></p><p id="lmsg" class="small" aria-live="polite"></p>' +
    '<p class="small">كل سؤال <b>٢٠ ثانية</b>. صح <b>+٣</b>، غلط <b>−٥</b>، والرابح <b>+' + N.BONUS + "</b> 🏆. الكويز بيبلّش بس تكونوا التنين أونلاين وجاهزين.</p></div>";
  let friends = [];
  try { friends = await A.loadFriends(); } catch (e) { console.warn("nursin: live friends", e && e.code); }
  const li = (v, html, on) => '<li><label><input type="radio" name="lwith" value="' + N.esc(v) + '"' + (on ? " checked" : "") + "> " + html + "</label></li>";
  $("#lfr", el).innerHTML = li("", "🔗 أي حدا معو الرابط (ببعتلو ياه)", !withUid || !friends.some(f => f.uid === withUid)) +
    friends.map(f => li(f.uid, N.avatar(f.photo, f.name, "av") + " <bdi>" + N.esc(N.cleanName(f.name)) + "</bdi> <small class=\"lvc\">Lv " + N.level(f.points) + "</small>", f.uid === withUid)).join("");
  $("#lgo", el).addEventListener("click", async e => {
    const b = e.currentTarget, w = (el.querySelector('input[name="lwith"]:checked') || {}).value || "", k = $("#ltopic", el).value;
    const f = friends.find(x => x.uid === w);
    b.disabled = true; $("#lmsg", el).textContent = "⏳ …";
    try { const id = await createRoom(k, f || null); history.replaceState(null, "", "live.html?room=" + encodeURIComponent(id)); openRoom(el, id); }
    catch (x) { if (!denied(x)) console.warn("nursin: create room", x && x.code); $("#lmsg", el).textContent = "⚠️ " + (denied(x) ? NOT_READY : "ما زبط هلّق، جرّب كمان مرّة."); b.disabled = false; }
  });
}
export async function createRoom(k, friend) {
  const ids = topicIds(k);
  if (!ids.length) throw new Error("no questions");
  const u = A.user, pr = A.profile, seed = Math.floor(Math.random() * 2147483647);
  const ref = await F.addDoc(F.collection(A.db, "rooms"), {
    host: u.uid, hostName: N.cleanName(pr.name), hostPhoto: pr.photo || "", guest: null, guestName: "", guestPhoto: "",
    invited: friend ? friend.uid : null, invitedName: friend ? N.cleanName(friend.name) : "",
    topic: k, topicLabel: topicLabel(k), qids: N.pickQids(seed, ids, Math.min(10, ids.length)),
    state: "waiting", hostReady: false, guestReady: false, hostSeen: F.serverTimestamp(), guestSeen: null,
    idx: -1, qAt: null, startedAt: null, hostAns: {}, guestAns: {}, hostScore: 0, guestScore: 0, hostPaid: false, guestPaid: false,
    winner: null, left: null, endedAt: null, createdAt: F.serverTimestamp()
  });
  return ref.id;
}

/* ---------- one room ---------- */
function openRoom(el, id) {
  stop();
  const ref = F.doc(A.db, "rooms", id), uid = A.user.uid;
  const S = { id, ref, el, r: null, role: null, offset: 0, sent: 0, lastSeen: 0, view: "", busy: {}, bothAt: {}, mine: {}, paid: null, joining: false };
  el.innerHTML = '<div class="qcard"><p>⏳ عم نفتح الغرفة…</p></div>';
  unsub = F.onSnapshot(ref, snap => {
    if (!snap.exists()) { stop(); el.innerHTML = '<div class="qcard"><p>⚠️ ما لقينا هالغرفة. يمكن الرابط ناقص.</p><p><a class="btn pri" href="live.html">🔴 اعمل غرفة جديدة</a></p></div>'; return; }
    const r = snap.data({ serverTimestamps: "estimate" }); S.r = r;
    S.role = r.host === uid ? "host" : r.guest === uid ? "guest" : null;
    if (S.role && !snap.metadata.hasPendingWrites) {        // learn the server clock from my own heartbeat echo
      const seen = ms(r[S.role + "Seen"]);
      if (seen && seen !== S.lastSeen) { S.lastSeen = seen; if (S.sent) S.offset = seen - (S.sent + Date.now()) / 2; }
    }
    if (!S.role) return join(S);
    if (!S.started) { S.started = true; beat(); }
    draw(S);
  }, e => {
    stop();
    if (!denied(e)) console.warn("nursin: room", e && e.code);
    el.innerHTML = '<div class="qcard"><p>⚠️ ' + (denied(e) ? "ما فيك تفوت عهالغرفة (يمكن مش إلك، أو التحدّي اللايف بعدو عم يتجهّز 🛠️)." : "ما قدرنا نفتح الغرفة. تأكّد من الإنترنت.") + '</p><p><a class="btn pri" href="live.html">🔴 اعمل غرفة جديدة</a></p></div>';
  });
  const beat = () => { if (!S.role || !S.r || (S.r.state !== "waiting" && S.r.state !== "live")) return; S.sent = Date.now(); F.updateDoc(ref, { [S.role + "Seen"]: F.serverTimestamp() }).catch(e => console.warn("nursin: heartbeat", e && e.code)); };
  hb = setInterval(beat, N.LIVE.HB_MS);
  timer = setInterval(() => tick(S), 250);
  S.beat = beat;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beat(); });
}
async function join(S) {
  const r = S.r, uid = A.user.uid;
  if (r.state !== "waiting" || r.guest) return msg(S, "🚫 هالغرفة مليانة أو خلصت.", true);
  if (r.invited && r.invited !== uid) return msg(S, "🚫 هالغرفة معمولة لصاحب تاني.", true);
  if (S.joining) return; S.joining = true;
  try {
    S.sent = Date.now();
    await F.updateDoc(S.ref, { guest: uid, guestName: N.cleanName(A.profile.name), guestPhoto: A.profile.photo || "", guestReady: false, guestSeen: F.serverTimestamp() });
  } catch (e) { if (!denied(e)) console.warn("nursin: join", e && e.code); msg(S, "⚠️ ما قدرنا نفوت عالغرفة. " + (denied(e) ? NOT_READY : "جرّب كمان مرّة."), true); }
  S.joining = false;
}
function msg(S, html, end) { if (end) stop(); S.el.innerHTML = '<div class="qcard"><p>' + html + '</p><p><a class="btn pri" href="live.html">🔴 اعمل غرفة جديدة</a> <a class="btn" href="friends.html">🏆 أصحابي</a></p></div>'; }
const now = S => Date.now() + S.offset;
const stale = (S, role) => { const t = ms(S.r[role + "Seen"]); return !t || now(S) - t > N.LIVE.STALE_MS; };
function qStart(S) { return ms(S.r.qAt) + (S.r.idx === 0 ? LEAD : 0); }
function deadline(S) { return qStart(S) + N.LIVE.Q_SEC * 1000; }

function seat(S, role) {
  const r = S.r, name = r[role + "Name"], has = role === "host" || r.guest;
  if (!has) return '<div class="seat empty"><span class="av avx">?</span><b>' + (r.invitedName ? "<bdi>" + N.esc(r.invitedName) + "</bdi>" : "صاحبك") + '</b><small class="dots">ناطرينو يفوت</small></div>';
  const st = stale(S, role) ? '<small class="off">💤 مش أونلاين</small>' : r[role + "Ready"] ? '<small class="ok">✅ جاهز</small>' : '<small>⏳ مش جاهز بعد</small>';
  return '<div class="seat' + (role === S.role ? " me" : "") + '">' + N.avatar(r[role + "Photo"], name, "av avl") + "<b><bdi>" + N.esc(N.cleanName(name)) + "</bdi>" + (role === S.role ? " <small>(إنت)</small>" : "") + "</b>" + st + "</div>";
}
function link(S) { return "https://nursin.store/live.html?room=" + encodeURIComponent(S.id); }
function share(S) { return "https://wa.me/?text=" + encodeURIComponent("🔴 تعا نلعب تحدّي لايف على nursin! " + S.r.topicLabel + "، " + S.r.qids.length + " أسئلة، ٢٠ ثانية لكل سؤال. مين بيربح؟ 😏\n" + link(S)); }

function draw(S) {
  const r = S.r, el = S.el;
  if (r.state === "waiting") {
    const html = '<div class="qcard lroom"><h2>🔴 غرفة لايف · <bdi>' + N.esc(r.topicLabel) + "</bdi></h2>" +
      '<div class="seats">' + seat(S, "host") + '<span class="vs">VS</span>' + seat(S, "guest") + "</div>" +
      (S.role === "host" && !r.guest ? '<div class="lshare"><p class="small">ابعت الرابط ل' + (r.invitedName ? "<bdi>" + N.esc(r.invitedName) + "</bdi>" : "صاحبك") + ' 👇</p><p class="fbtns"><a class="btn wa" target="_blank" rel="noopener" href="' + share(S) + '">🟢 ابعتو عالواتساب</a> <button class="btn" type="button" id="lcopy">📋 نسخ الرابط</button></p></div>' : "") +
      '<p class="lready"><button class="btn ' + (r[S.role + "Ready"] ? "" : "pri ") + 'big" id="lrdy" type="button">' + (r[S.role + "Ready"] ? "✋ لحظة، مش جاهز" : "✅ أنا جاهز") + "</button></p>" +
      '<p class="small lnote" id="lnote">' + waitNote(S) + "</p>" +
      '<p class="small">' + r.qids.length + " أسئلة · ٢٠ ثانية لكل سؤال · صح <b>+٣</b> · غلط <b>−٥</b> · الرابح <b>+" + N.BONUS + "</b> 🏆 · ✂️ 50/50 مش مسموح باللايف</p>" +
      (S.role === "host" ? '<p><button class="rmlink" id="lcancel" type="button">✕ إلغي الغرفة</button></p>' : "") + "</div>";
    if (S.view !== "w:" + html) {
      S.view = "w:" + html; el.innerHTML = html;
      $("#lrdy", el).addEventListener("click", () => { S.sent = Date.now(); F.updateDoc(S.ref, { [S.role + "Ready"]: !S.r[S.role + "Ready"], [S.role + "Seen"]: F.serverTimestamp() }).catch(e => console.warn("nursin: ready", e && e.code)); });
      const c = $("#lcopy", el); if (c) c.addEventListener("click", async () => { try { await navigator.clipboard.writeText(link(S)); c.textContent = "✅ انتسخ"; } catch (x) { prompt("انسخ الرابط:", link(S)); } });
      const x = $("#lcancel", el); if (x) x.addEventListener("click", () => { if (confirm("أكيد بدّك تلغي الغرفة؟")) F.updateDoc(S.ref, { state: "cancelled", endedAt: F.serverTimestamp() }).catch(e => console.warn("nursin: cancel", e && e.code)); });
    }
    return;
  }
  if (r.state === "cancelled") { S.view = "c"; return msg(S, "🚫 الغرفة انلغت" + (r.left ? " (صاحبك طلع)" : "") + ".", true); }
  if (r.state === "live") return drawLive(S);
  if (r.state === "done") return drawDone(S);
}
function waitNote(S) {
  const r = S.r, o = other(S.role);
  if (!r.guest) return "⏳ ناطرين صاحبك يفوت عالغرفة…";
  if (stale(S, o)) return "💤 <bdi>" + N.esc(N.cleanName(r[o + "Name"])) + "</bdi> مش أونلاين هلّق (يمكن طلع عالواتساب). الكويز بيبلّش بس يرجع ويكون جاهز.";
  if (r.hostReady && r.guestReady) return "🚀 التنين جاهزين، عم نبلّش…";
  if (r[S.role + "Ready"]) return "⏳ ناطرين <bdi>" + N.esc(N.cleanName(r[o + "Name"])) + "</bdi> يكبس جاهز…";
  return "كبس «✅ أنا جاهز» بس تكون مستعد.";
}

/* ---------- live ---------- */
function board(S) {
  const r = S.r, o = other(S.role), i = r.idx;
  const pill = (role) => '<span class="lp' + (role === S.role ? " me" : "") + '">' + N.avatar(r[role + "Photo"], r[role + "Name"], "av") + '<b class="sc">' + (r[role + "Score"] | 0) + "</b>" +
    (r[role + "Ans"] && r[role + "Ans"][i] != null ? '<small class="ok">✓ جاوب</small>' : stale(S, role) ? '<small class="off">💤</small>' : '<small class="dots">…</small>') + "</span>";
  return pill(S.role) + '<span class="lqn">سؤال ' + (i + 1) + "/" + r.qids.length + "</span>" + pill(o);
}
function drawLive(S) {
  const r = S.r, el = S.el, i = r.idx, q = qById(r.qids[i]);
  if (!q) return msg(S, "⚠️ ما قدرنا نحمّل السؤال. حدّث الصفحة.", false);
  const key = "l:" + i;
  if (S.view !== key) {
    S.view = key;
    let h = '<div class="lboard" id="lboard">' + board(S) + '</div><div class="ltime"><i id="lbar"></i><span id="lsec"></span></div>';
    h += '<div class="qcard" id="lq"><span class="qtopic">' + N.esc((window.QTOP || {})[q.t] || q.t) + '</span><div id="lcount" class="lcount" hidden></div><div id="lbody"><p class="qq">' + q.q + "</p>";
    q.o.forEach((o, k) => { h += '<button class="opt" data-k="' + k + '"><span class="l" dir="ltr">' + "abcd"[k] + "</span><span>" + o + "</span></button>"; });
    h += '<p class="p50row"><button class="btn p50" type="button" disabled>✂️ 50/50</button> <small>مش مسموح باللايف</small></p><div id="lfb" aria-live="polite"></div></div></div>';
    el.innerHTML = h;
    el.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => answer(S, +b.dataset.k)));
  } else $("#lboard", el).innerHTML = board(S);
  mark(S);
  tick(S);
}
function mark(S) {
  const r = S.r, i = r.idx, q = qById(r.qids[i]), mine = r[S.role + "Ans"] && r[S.role + "Ans"][i] != null ? +r[S.role + "Ans"][i] : S.mine[i];
  const theirs = r[other(S.role) + "Ans"] && r[other(S.role) + "Ans"][i];
  const over = theirs != null && mine != null || now(S) > deadline(S);
  if (mine == null && !over) return;
  S.el.querySelectorAll(".opt").forEach(b => {
    const k = +b.dataset.k; b.disabled = true;
    if (k === mine) b.classList.add(k === q.a ? "ok" : "bad");
    if (over && k === q.a) b.classList.add("ok");
  });
  const fb = $("#lfb", S.el); if (!fb) return;
  const oname = "<bdi>" + N.esc(N.cleanName(r[other(S.role) + "Name"])) + "</bdi>";
  let h;
  if (mine == null) h = '<div class="expl w">⏰ <b>خلص الوقت!</b> الجواب الصح: ' + "abcd"[q.a] + "</div>";
  else if (!over) h = '<div class="expl' + (mine === q.a ? "" : " w") + '">' + (mine === q.a ? "✅ <b>صح!</b>" : "❌ <b>غلط</b>") + " · ناطرين " + oname + "…</div>";
  else h = '<div class="expl' + (mine === q.a ? "" : " w") + '">' + (mine === q.a ? "✅ <b>صح!</b> " : "❌ <b>الجواب الصح: " + "abcd"[q.a] + "</b> — ") + q.x + "</div>";
  if (fb.dataset.h !== h) { fb.dataset.h = h; fb.innerHTML = h; }
}
async function answer(S, k) {
  const r = S.r, i = r.idx;
  if (r.state !== "live" || S.mine[i] != null || (r[S.role + "Ans"] && r[S.role + "Ans"][i] != null)) return;
  if (now(S) < qStart(S) || now(S) > deadline(S)) return;
  S.mine[i] = k;
  const q = qById(r.qids[i]), sc = (r[S.role + "Score"] | 0) + (k === q.a ? 1 : 0);
  mark(S);
  try { await F.updateDoc(S.ref, { [S.role + "Ans." + i]: k, [S.role + "Score"]: sc }); }
  catch (e) { console.warn("nursin: answer", e && e.code); }
}
function tick(S) {
  const r = S.r; if (!r || !S.role) return;
  if (r.state === "waiting") {
    const n = $("#lnote", S.el); if (n) { const t = waitNote(S); if (n.innerHTML !== t) n.innerHTML = t; }
    if (S.role === "host" && r.guest && r.hostReady && r.guestReady && !stale(S, "guest") && !S.busy.start) {   // the host's page drives the room (one writer, no clashing transactions)
      S.busy.start = true;
      F.runTransaction(A.db, async tx => {
        const s = await tx.get(S.ref), d = s.data();
        if (d.state !== "waiting" || !d.hostReady || !d.guestReady || !d.guest) return;
        tx.update(S.ref, { state: "live", idx: 0, qAt: F.serverTimestamp(), startedAt: F.serverTimestamp() });
      }).catch(e => console.warn("nursin: start", e && e.code)).finally(() => { setTimeout(() => { S.busy.start = false; }, 1500); });
    }
    return;
  }
  if (r.state !== "live" || !r.qAt) return;
  const t = now(S), st = qStart(S), dl = deadline(S), i = r.idx;
  const cnt = $("#lcount", S.el), body = $("#lbody", S.el);
  if (cnt && body) {
    const pre = t < st;
    if (pre) { const s = Math.ceil((st - t) / 1000); cnt.hidden = false; body.hidden = true; const h = '<b>' + (s > 0 ? s : "يلا!") + "</b><small>جاهز؟ أوّل سؤال جايي</small>"; if (cnt.innerHTML !== h) cnt.innerHTML = h; }
    else if (!cnt.hidden) { cnt.hidden = true; body.hidden = false; }
  }
  const bar = $("#lbar", S.el), sec = $("#lsec", S.el);
  if (bar) { const left = Math.max(0, Math.min(N.LIVE.Q_SEC * 1000, dl - Math.max(t, st))); bar.style.width = (100 * left / (N.LIVE.Q_SEC * 1000)) + "%"; bar.className = left < 5000 ? "low" : ""; sec.textContent = Math.ceil(left / 1000) + " ث"; }
  if (t > dl) mark(S);
  const both = r.hostAns && r.hostAns[i] != null && r.guestAns && r.guestAns[i] != null;
  if (both && !S.bothAt[i]) { S.bothAt[i] = Date.now(); mark(S); }
  const o = other(S.role);
  if (stale(S, o) && !S.busy.left) {                    // the other player dropped → I win
    S.busy.left = true;
    F.runTransaction(A.db, async tx => {
      const s = await tx.get(S.ref), d = s.data();
      if (d.state !== "live") return;
      tx.update(S.ref, { state: "done", left: d[o], winner: S.role, endedAt: F.serverTimestamp() });
    }).catch(e => console.warn("nursin: leave", e && e.code)).finally(() => { S.busy.left = false; });
    return;
  }
  if (S.role === "host" && ((both && Date.now() - S.bothAt[i] > N.LIVE.REVEAL_MS) || t > dl + 1500) && !S.busy["a" + i]) {
    S.busy["a" + i] = true;
    F.runTransaction(A.db, async tx => {
      const s = await tx.get(S.ref), d = s.data();
      if (d.state !== "live" || d.idx !== i) return;
      if (i + 1 >= d.qids.length) tx.update(S.ref, { state: "done", winner: N.roomWinner(d.hostScore | 0, d.guestScore | 0, null, d.host, d.guest), endedAt: F.serverTimestamp() });
      else tx.update(S.ref, { idx: i + 1, qAt: F.serverTimestamp() });
    }).catch(e => { console.warn("nursin: next", e && e.code); setTimeout(() => { S.busy["a" + i] = false; }, 2000); });
  }
}

/* ---------- result ---------- */
async function pay(S) {
  const uref = F.doc(A.db, "users", A.user.uid), role = S.role;
  return F.runTransaction(A.db, async tx => {
    const rs = await tx.get(S.ref), us = await tx.get(uref);
    const r = rs.data(), d = us.exists() ? us.data() : {};
    const tally = N.roomTally(r.qids, r[role + "Ans"], bank()), won = r.winner === role;
    if (r[role + "Paid"]) return { tally, won, already: true };
    const before = N.addPoints(d.points || 0, 0, 0), points = N.roomPoints(before, tally, won);
    tx.update(S.ref, { [role + "Paid"]: true });
    tx.set(uref, A.profileWrite(d, points, before), A.MERGE);
    return { tally, won, before, points };
  });
}
function drawDone(S) {
  const r = S.r, o = other(S.role), el = S.el;
  clearInterval(hb); hb = 0;
  if (S.paid === null) {
    S.paid = "busy";
    new Promise(r => setTimeout(r, S.role === "guest" ? 1500 : 0)).then(() => pay(S)).then(p => { S.paid = p; if (p.points != null) A.profileFromPoints(p.points); drawDone(S); })
      .catch(e => { console.warn("nursin: live points", e && e.code); S.paid = { err: true }; drawDone(S); });
  }
  const mine = r[S.role + "Score"] | 0, theirs = r[o + "Score"] | 0, oname = "<bdi>" + N.esc(N.cleanName(r[o + "Name"])) + "</bdi>";
  const w = r.winner, head = w === "tie" ? "🤝 تعادل!" : w === S.role ? "🏆 ربحت!" : "😅 خسرت هالمرّة";
  let pts = "⏳ عم نحسبلك النقاط…";
  const p = S.paid;
  if (p && p.err) pts = "⚠️ ما قدرنا نزيد النقاط هلّق. حدّث الصفحة بعد شوي.";
  else if (p && p.tally) {
    const t = p.tally, net = t.c * N.RIGHT - t.w * N.WRONG;
    pts = '<span class="qnet">✅ ' + t.c + " صح <b>+" + t.c * N.RIGHT + "</b> · ❌ " + t.w + ' غلط <b dir="ltr">−' + t.w * N.WRONG + "</b>" + (t.skip ? " · ⏰ " + t.skip + " بلا جواب" : "") + (p.won ? ' · 🏆 <b dir="ltr">+' + N.BONUS + "</b> بونص" : "") + "</span>" +
      (p.already ? "<br><small>النقاط انحسبت.</small>" : "<br>صار معك <b>" + p.points + "</b> نقطة · Lv " + N.level(p.points) + (net < 0 && p.points === 0 ? " <small>(النقاط ما بتنزل تحت الصفر)</small>" : ""));
  }
  const html = '<div class="qcard score lres"><p class="lhead">' + head + "</p>" +
    '<div class="seats">' + '<div class="seat me">' + N.avatar(r[S.role + "Photo"], r[S.role + "Name"], "av avl") + "<b>إنت</b><span class=\"big\">" + mine + "</span></div>" +
    '<span class="vs">–</span><div class="seat">' + N.avatar(r[o + "Photo"], r[o + "Name"], "av avl") + "<b>" + oname + '</b><span class="big">' + theirs + "</span></div></div>" +
    (r.left ? '<p class="small">' + (r.left === A.user.uid ? "💤 طلعت من الغرفة قبل ما تخلص." : "💤 " + oname + " طلع من الغرفة، فالربح إلك.") + "</p>" : "") +
    '<p class="qpts">' + pts + "</p>" +
    '<p><button class="btn pri" id="lagain" type="button">🔁 جولة تانية</button> <a class="btn" href="friends.html">🏆 أصحابي</a> <a class="btn" href="exams.html">📅 الأوائل</a></p><p id="lmsg" class="small"></p></div>';
  if (S.view !== html) {
    S.view = html; el.innerHTML = html;
    $("#lagain", el).addEventListener("click", async e => {
      const b = e.currentTarget; b.disabled = true;
      try { const id = await createRoom(r.topic, { uid: r[o], name: r[o + "Name"] }); location.href = "live.html?room=" + encodeURIComponent(id); }
      catch (x) { console.warn("nursin: rematch", x && x.code); $("#lmsg", el).textContent = "⚠️ ما زبط هلّق."; b.disabled = false; }
    });
  }
}

/* ---------- invitations: a toast on every page + a list on friends.html ---------- */
function watchInvites(cb, onErr) {
  const q = F.query(F.collection(A.db, "rooms"), F.where("invited", "==", A.user.uid), F.where("state", "==", "waiting"), F.limit(20));
  return F.onSnapshot(q, snap => {
    const t = Date.now(), list = [];
    snap.docs.forEach(d => {
      const r = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) }, seen = ms(r.hostSeen);
      if (r.guest) return;
      if (seen && t - seen > 30 * 60000) { F.updateDoc(d.ref, { state: "cancelled", endedAt: F.serverTimestamp() }).catch(() => {}); return; }   // the host left long ago
      list.push(r);
    });
    list.sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
    cb(list);
  }, e => { if (onErr) onErr(e); });
}
const invLine = r => "🔴 <b><bdi>" + N.esc(N.cleanName(r.hostName)) + "</bdi></b> عازمك على تحدّي لايف · <bdi>" + N.esc(r.topicLabel) + "</bdi>";
export function friendsInvites(ul, api) {
  if (api) init(api);
  if (!ul || !A) return;
  watchInvites(list => {
    ul.innerHTML = list.length ? list.map(r => '<li class="chr">' + invLine(r) + ' <a class="btn pri" href="live.html?room=' + encodeURIComponent(r.id) + '">▶️ فوت</a></li>').join("") : '<li class="small fempty">ما في دعوات هلّق. بس حدا يعزمك بتطلع هون، وبتطلعلك كمان بأي صفحة.</li>';
  }, e => { ul.innerHTML = '<li class="small">' + (denied(e) ? NOT_READY : "⚠️ ما قدرنا نجيب الدعوات هلّق.") + "</li>"; if (!denied(e)) console.warn("nursin: invites", e && e.code); });
}
export function toast(api) {
  init(api);
  if (!A.user || document.getElementById("ltoast")) return;
  const box = document.createElement("div"); box.id = "ltoast"; box.className = "ltoast"; box.hidden = true; box.setAttribute("role", "status");
  document.body.appendChild(box);
  let dis = []; try { dis = JSON.parse(sessionStorage.getItem("nursin_inv_x") || "[]"); } catch (e) {}
  const cur = new URLSearchParams(location.search).get("room");
  watchInvites(list => {
    const r = list.find(x => x.id !== cur && dis.indexOf(x.id) < 0);
    if (!r) { box.hidden = true; return; }
    box.innerHTML = '<span>' + invLine(r) + '</span><a class="btn pri" href="live.html?room=' + encodeURIComponent(r.id) + '">▶️ فوت</a><button type="button" class="tx" aria-label="سكّر">✕</button>';
    box.hidden = false;
    box.querySelector(".tx").onclick = () => { dis.push(r.id); try { sessionStorage.setItem("nursin_inv_x", JSON.stringify(dis.slice(-30))); } catch (e) {} box.hidden = true; };
  }, () => {});
}
