/* 👥 «حالة لايف» — who is in the shared room right now (Abdullah, Nov 2 2026 3:03–3:15 PM: «إذا فات واحد تاني معي… بيعينو دغري
   شخصين؟» + «أنا بدي لو كانو شي تلاتة أربعة مثلاً فاتوا مع بعض»). Every signed-in student in games.html#live writes ONE small doc
   live/{YYYYMMDD}/presence/{uid} {n: first name, av: his cartoon avatar id, x, y: where he stands, tx, ty: where he is walking to,
   b: the bed he is working on ('' | 'a' | 'b'), at: server time} — on each tap (≥ 1 s apart), every ~1.2 s while he walks, every 12 s
   when he stands still; deleted when he leaves the room / hides the tab. The others read the collection and draw him walking (smoothly,
   along the same paths), fade him out when his doc is older than 30 s and ignore it after that (no cleanup job, no worker change).
   Rules v22 (the same file as the live case) let only the owner write his own doc with these bounded fields. Before they are
   published — or signed out — nothing is written or read: the room stays solo, no error, no badge. The home card shows «👥 N».
   This file: the pure core (tested in node) + the Firestore access. The drawing sits in assets/livecase-room.js. No ads. */
(function (w, d) {
/* ==pres-core== pure: no DOM, no Firestore */
var LivePres = (function () {
  var STALE = 30000, FADE = 20000, MOVE_MS = 1200, IDLE_MS = 12000, GAP = 1000, SNAP = 120, MAXP = 24, W = 360, H = 600, TOAST_GAP = 4000;
  var AVRE = /^a(0[1-9]|1[0-2])$/;
  function clampI(v, lo, hi) { v = Math.round(+v || 0); return v < lo ? lo : v > hi ? hi : v; }
  function first(n) { n = String(n || "").replace(/\s+/g, " ").trim(); return (n.split(" ")[0] || n).slice(0, 20); }
  // the doc I write (exactly the fields the rules accept, bounded) — at is added by the caller (serverTimestamp)
  function doc(me, pos, tgt, bed) {
    return { n: first(me && me.name) || "طالب", av: AVRE.test((me && me.av) || "") ? me.av : "",
      x: clampI(pos.x, 0, W), y: clampI(pos.y, 0, H), tx: clampI(tgt.x, 0, W), ty: clampI(tgt.y, 0, H), b: bed === "a" || bed === "b" ? bed : "" };
  }
  // should I write now? changed = where I go / my bed changed since the last write; moving = I am walking
  function due(last, now, moving, changed) {
    if (!last) return true;
    var g = now - last;
    if (g < GAP) return false;                       // never more than one write a second (the rules refuse < 0.5 s anyway)
    if (changed) return true;
    if (moving) return g >= MOVE_MS;
    return g >= IDLE_MS;                             // a heartbeat so the others know I am still here
  }
  // the docs of the room → the others I should draw: fresh (≤ 30 s, with my clock's offset to the server), not me, max 24, by name
  function fresh(list, now, meUid, skew) {
    skew = skew || 0;
    return (list || []).filter(function (p) { return p && p.uid && p.uid !== meUid && p.at && now + skew - p.at <= STALE && now + skew - p.at > -STALE; })
      .sort(function (a, b) { return String(a.n).localeCompare(String(b.n)) || (a.uid < b.uid ? -1 : 1); }).slice(0, MAXP);
  }
  // how visible an avatar is: full until 20 s without news, then fading to 0 at 30 s
  function alpha(age) { return age <= FADE ? 1 : age >= STALE ? 0 : 1 - (age - FADE) / (STALE - FADE); }
  // smooth motion on the others' screens: walk toward the target at the nurse's speed (faster when far behind), never overshoot,
  // jump when he is very far (he just came in, or the tab slept)
  function follow(cur, tgt, dt, speed) {
    var dx = tgt.x - cur.x, dy = tgt.y - cur.y, dd = Math.sqrt(dx * dx + dy * dy);
    if (dd > SNAP * 2.5) return { x: tgt.x, y: tgt.y, dir: cur.dir || 0, jump: true };
    if (dd < 0.01) return { x: tgt.x, y: tgt.y, dir: cur.dir || 0 };
    var v = (speed || 165) * Math.max(1, dd / 60) * dt, k = Math.min(1, v / dd);
    return { x: cur.x + dx * k, y: cur.y + dy * k, dir: Math.atan2(dy, dx) };
  }
  // who came in / went out between two looks (uids → names)
  function diff(prev, now) {
    var a = {}, b = {}, j = [], l = []; (prev || []).forEach(function (p) { a[p.uid] = p; }); (now || []).forEach(function (p) { b[p.uid] = p; });
    for (var k in b) if (!a[k]) j.push(b[k].n); for (var k2 in a) if (!b[k2]) l.push(a[k2].n);
    return { join: j, left: l };
  }
  // a toast at most every 4 s; names that arrive meanwhile wait and come together («👋 ريم وحسن فاتوا»)
  function toastOk(last, now) { return !last || now - last >= TOAST_GAP; }
  function names(list, fr) {
    if (list.length > 3) return list.slice(0, 3).join(fr ? ", " : "، ") + " +" + (list.length - 3);
    if (list.length < 2) return list[0] || ""; return list.slice(0, -1).join(fr ? ", " : "، ") + (fr ? " et " : " و") + list[list.length - 1];
  }
  function color(uid) { var h = 2166136261; uid = String(uid); for (var i = 0; i < uid.length; i++) { h ^= uid.charCodeAt(i); h = Math.imul(h, 16777619); } return "hsl(" + ((h >>> 0) % 360) + ",62%,46%)"; }
  return { STALE: STALE, FADE: FADE, MOVE_MS: MOVE_MS, IDLE_MS: IDLE_MS, GAP: GAP, SNAP: SNAP, MAXP: MAXP, TOAST_GAP: TOAST_GAP, AVRE: AVRE,
    first: first, doc: doc, due: due, fresh: fresh, alpha: alpha, follow: follow, diff: diff, toastOk: toastOk, names: names, color: color };
})();
/* ==/pres-core== */
  if (typeof window !== "undefined") window.LivePres = LivePres;
  if (!d || !d.addEventListener) return;
  var W = w;
  function fb() { var A = W.NursinFB; return A && A.user && A.fs ? A : null; }
  function dayId() { return W.LiveCore ? W.LiveCore.docId(W.LiveCore.dayKey(Date.now())) : ""; }
  function myAv() { var A = fb(), p = A && A.profile; var k = p && p.av; if (LivePres.AVRE.test(k || "")) return k; try { var a = JSON.parse(localStorage.getItem("nursin_avatar_v1") || "null"); if (a && LivePres.AVRE.test(a.k || "")) return a.k; } catch (e) {} return ""; }
  function ms(t) { return t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +t || 0; }
  /* ---- the room: one listener + my own doc ---- */
  var on = false, id = "", unsub = null, cb = null, list = [], last = 0, lastSig = "", sentAt = 0, skew = 0, dead = false, wr = false, hid = false, wasMv = false, extra = [];
  function ref(A, uid) { return A.fs.doc(A.db, "live", id, "presence", uid || A.user.uid); }
  function listen() {
    var A = fb(); if (!A || !id) return;
    try {
      unsub = A.fs.onSnapshot(A.fs.collection(A.db, "live", id, "presence"), function (q) {
        var out = [], me = A.user.uid;
        q.forEach(function (s) { var x = s.data({ serverTimestamps: "estimate" }) || {}; var p = { uid: s.id, n: String(x.n || "").slice(0, 20), av: x.av || "", x: +x.x || 0, y: +x.y || 0, tx: x.tx == null ? +x.x || 0 : +x.tx, ty: x.ty == null ? +x.y || 0 : +x.ty, b: x.b || "", at: ms(x.at) };
          if (p.uid === me && sentAt && !s.metadata.hasPendingWrites && p.at) skew = p.at - sentAt;   // my clock vs the server's (≈ the trip time)
          out.push(p); });
        list = out; if (cb) try { cb(); } catch (e) {}
      }, function (e) { quiet(e); });
    } catch (e) { quiet(e); }
  }
  function quiet(e) { dead = true; stopListen(); list = []; if (cb) try { cb(); } catch (x) {} if (!(e && e.code === "permission-denied")) console.warn("nursin presence", e && e.code); }
  function stopListen() { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } }
  // start when the room is open AND the live case is shared (signed in + rules v22); else nothing at all
  function start(onChange) {
    cb = onChange || cb; if (on) return; var A = fb(); if (!A || dead) return;
    on = true; id = dayId(); last = 0; lastSig = ""; listen();
  }
  function stop() {
    if (!on) return; on = false; stopListen(); list = [];
    var A = fb(); if (A && wr && id) { try { A.fs.deleteDoc(ref(A)).catch(function () {}); } catch (e) {} } wr = false;
  }
  // called every frame by the room: my position, where I walk to, the bed I work on (a write when I stop walking, too)
  function tick(pos, tgt, bed, moving) {
    if (!on || dead || hid) return; var A = fb(); if (!A) return;
    var now = Date.now(), nid = dayId();
    if (nid !== id) { stopListen(); id = nid; last = 0; lastSig = ""; listen(); }
    var dc = LivePres.doc({ name: (A.profile && A.profile.name) || A.user.displayName, av: myAv() }, pos, tgt, bed), sig = dc.tx + "," + dc.ty + "," + dc.b;
    var stopped = wasMv && !moving;                  // he just arrived → one write with where he really stands
    if (!LivePres.due(last, now, moving, sig !== lastSig || stopped)) { if (!stopped) wasMv = moving; return; }
    wasMv = moving; last = now; lastSig = sig; dc.at = A.fs.serverTimestamp(); sentAt = now;
    A.fs.setDoc(ref(A), dc).then(function () { wr = true; }, function (e) { if (e && e.code === "permission-denied" && !wr) quiet(e); });
  }
  function others() { var A = fb(); return on && !dead ? LivePres.fresh(extra.length ? list.concat(extra) : list, Date.now(), A ? A.user.uid : "me", skew) : []; }
  function count() { return on && !dead ? others().length + 1 : 0; }
  function skewMs() { return skew; }
  d.addEventListener("visibilitychange", function () {
    if (!on) return; var A = fb();
    if (d.hidden) { hid = true; if (A && wr) { try { A.fs.deleteDoc(ref(A)).catch(function () {}); } catch (e) {} wr = false; } }
    else { hid = false; last = 0; lastSig = ""; }
  });
  W.addEventListener("pagehide", function () { if (on) { var A = fb(); if (A && wr) try { A.fs.deleteDoc(ref(A)).catch(function () {}); } catch (e) {} } });
  /* ---- the home card: how many are in the room (one small read when the card draws, at most every 60 s, only when visible; not me —
     I am on the home page, my room doc is only waiting to go stale) ---- */
  var hN = -1, hAt = 0, hBusy = false;
  function homeCount(fn) {
    var A = fb(), now = Date.now(); if (!A || dead || d.hidden) return hN;
    if (!hBusy && now - hAt >= 60000) {
      hBusy = true; hAt = now; var hid2 = dayId(), F = A.fs;
      F.getDocs(F.query(F.collection(A.db, "live", hid2, "presence"), F.where("at", ">", new Date(now - LivePres.STALE - 15000)), F.limit(60))).then(function (q) {
        var l = []; q.forEach(function (s) { var x = s.data() || {}; l.push({ uid: s.id, n: x.n, at: ms(x.at) }); });
        hN = LivePres.fresh(l, Date.now(), A.user.uid, -15000).length; hBusy = false; if (fn) fn(hN);
      }, function (e) { hBusy = false; hN = -1; if (e && e.code === "permission-denied") dead = true; });
    }
    return hN;
  }
  W.LivePresRoom = { start: start, stop: stop, tick: tick, others: others, count: count, homeCount: homeCount, skew: skewMs, active: function () { return on && !dead; }, myAv: myAv,
    _list: function () { return list; }, _inject: function (l) { extra = l || []; on = true; dead = false; if (cb) cb(); } };   // test hook: extra students drawn beside the real ones
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
