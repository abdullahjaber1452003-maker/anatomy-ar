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
  // 28z 🏥: the department he is in (dk) and the one he walks to (tdk) ride in the 2 low bits of x / tx (er 0 · k 1 · n 2 · x 3) —
  // the same 8 fields, the same bounds, so rules v22 accept it; an older phone draws him ≤ 3 px off, nothing else
  var DEPS = ["er", "k", "n", "x"];
  // 29d 🛗: twelve rooms now (LiveDept.ALL: + 🩺 r · 🔪 s · 👴 g · 🪑 wt · 💰 acc · 🧪 lab · 🩻 rad · 💊 ph). A room past the first four also
  // rides at the END of the first name as an invisible tag (U+2063 + 4 zero-width digits: room, target room) — still ≤ 20 characters, so
  // rules v22 accept it; x keeps the room's 2 low bits; an older phone shows the plain name.
  // 29e: + 15 rooms (🛎️ 🧑‍⚕️×4 🔪 🛏️ 🩸 🧺 🗄️ 🧠 👶 🤰 🧹 ☕) — a code past 15 rides a longer tag (U+2064 + 3 + 3 zero-width base-4 digits); the
  // name is cut to 13 so it stays ≤ 20 characters (rules v22); the short U+2063 tag of 29d still reads the same.
  var ALLD = ["er", "k", "n", "x", "r", "s", "g", "wt", "acc", "lab", "rad", "ph", "adm", "ns0", "ns1", "ns2", "ns3", "or", "sspi", "bb", "ster", "arch", "psy", "p", "m", "cln", "stf"], ZW = ["\u200b", "\u200c", "\u200d", "\u2060"], MARK = "\u2063", MARK2 = "\u2064";
  function enc(v, dk) { var c = ALLD.indexOf(dk); v = clampI(v, 0, W - 4); return (v & ~3) | (c < 0 ? 0 : c & 3); }
  function dec(v) { v = Math.round(+v || 0); return { v: v & ~3, dep: DEPS[v & 3] }; }
  function tag(c, tc) { if (c > 15 || tc > 15) return MARK2 + ZW[(c >> 4) & 3] + ZW[(c >> 2) & 3] + ZW[c & 3] + ZW[(tc >> 4) & 3] + ZW[(tc >> 2) & 3] + ZW[tc & 3];
    return MARK + ZW[c >> 2] + ZW[c & 3] + ZW[tc >> 2] + ZW[tc & 3]; }
  function untag(n) { n = String(n || ""); var j = n.indexOf(MARK2);
    if (j > -1) { var y = n.slice(j + 1, j + 7).split("").map(function (ch) { return ZW.indexOf(ch); });
      if (y.length < 6 || y.some(function (k) { return k < 0; })) return { n: n.slice(0, j), c: -1, tc: -1 };
      return { n: n.slice(0, j), c: y[0] * 16 + y[1] * 4 + y[2], tc: y[3] * 16 + y[4] * 4 + y[5] }; }
    var i = n.indexOf(MARK); if (i < 0) return { n: n, c: -1, tc: -1 };
    var z = n.slice(i + 1, i + 5).split("").map(function (ch) { return ZW.indexOf(ch); });
    if (z.length < 4 || z.some(function (k) { return k < 0; })) return { n: n.slice(0, i), c: -1, tc: -1 };
    return { n: n.slice(0, i), c: z[0] * 4 + z[1], tc: z[2] * 4 + z[3] }; }
  function doc(me, pos, tgt, bed, dk, tdk) {
    var c = ALLD.indexOf(dk || "er"), tc = ALLD.indexOf(tdk || dk || "er"), nm = first(me && me.name) || "طالب";
    if (c > 3 || tc > 3) nm = nm.slice(0, (c > 15 || tc > 15) ? 13 : 14) + tag(c < 0 ? 0 : c, tc < 0 ? 0 : tc);
    return { n: nm, av: AVRE.test((me && me.av) || "") ? me.av : "",
      x: enc(pos.x, dk || "er"), y: clampI(pos.y, 0, H), tx: enc(tgt.x, tdk || dk || "er"), ty: clampI(tgt.y, 0, H), b: bed === "a" || bed === "b" ? bed : "" };
  }
  // a read doc → where he is: { dep, tdep, x, tx } (walking between two departments when dep ≠ tdep)
  function place(p) { var a = dec(p.x), b = dec(p.tx == null ? p.x : p.tx), g = untag(p.n); p.dep = a.dep; p.tdep = b.dep; p.x = a.v; p.tx = b.v;
    if (g.c >= 0) { p.n = g.n; p.dep = ALLD[g.c] || p.dep; p.tdep = ALLD[g.tc] || p.dep; } return p; }
  // 29d (Abdullah, Nov 4 7:20 AM «بكون عالتخت اليمين بس الشخصيات يكونوا فوق بعض»): people standing at the same spot each get a slot
  // around it (rows of 3, a row lower when more) and no two name tags overlap — items [{ id, x, y, w, h (the tag box), fix (stays), mv (walking: left alone) }]
  // → { id: { x, y } }. The tag box of an item is x − w/2 … x + w/2, y − 5 − h … y − 5.
  function spread(items, R) {
    R = R || 18; var out = {}, used = {}, L = (items || []).filter(function (it) { return it && !it.mv; });
    (items || []).forEach(function (it) { if (it) out[it.id] = { x: it.x, y: it.y }; });
    function box(id, it) { var p = out[id]; return { l: p.x - it.w / 2, r: p.x + it.w / 2, t: p.y - 5 - it.h, b: p.y - 5 }; }
    for (var i = 0; i < L.length; i++) {
      if (used[L[i].id]) continue; var cl = [L[i]]; used[L[i].id] = 1;
      for (var g = 0; g < cl.length; g++) for (var j = 0; j < L.length; j++) { var b = L[j]; if (used[b.id]) continue; if (Math.abs(b.x - cl[g].x) + Math.abs(b.y - cl[g].y) < R) { cl.push(b); used[b.id] = 1; } }
      if (cl.length < 2) continue;
      cl.sort(function (a, b) { return (b.fix ? 1 : 0) - (a.fix ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
      var a0 = cl[0], cw = 0, ch = 0; cl.forEach(function (it) { cw = Math.max(cw, it.w + 4); ch = Math.max(ch, it.h + 8); });
      var SL = [[0, 0], [-1, 0], [1, 0], [-0.5, 1], [0.5, 1], [-1.5, 1], [1.5, 1], [0, 2], [-1, 2], [1, 2], [-2, 2], [2, 2]];
      cl.forEach(function (it, n) { var s = SL[n] || [((n % 5) - 2), 3 + Math.floor((n - 12) / 5)]; out[it.id] = { x: a0.x + s[0] * cw, y: a0.y + s[1] * ch }; });
    }
    // anything still overlapping (two groups side by side, a wall clamp): push the later one down until it is free
    var all = (items || []).filter(function (it) { return it && !it.mv; });
    for (var pass = 0; pass < 12; pass++) {
      var moved = false;
      for (var x = 0; x < all.length; x++) for (var y = x + 1; y < all.length; y++) {
        var A = box(all[x].id, all[x]), B = box(all[y].id, all[y]);
        if (A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) { var mv = all[y].fix ? all[x] : all[y], other = mv === all[y] ? A : B, mb = box(mv.id, mv); out[mv.id].y += (other.b - mb.t) + 2; moved = true; }
      }
      if (!moved) break;
    }
    return out;
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
    DEPS: DEPS, ALLD: ALLD, untag: untag, spread: spread, enc: enc, dec: dec, place: place, first: first, doc: doc, due: due, fresh: fresh, alpha: alpha, follow: follow, diff: diff, toastOk: toastOk, names: names, color: color };
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
        q.forEach(function (s) { var x = s.data({ serverTimestamps: "estimate" }) || {}; var p = { uid: s.id, n: String(x.n || "").slice(0, 20), av: x.av || "", x: +x.x || 0, y: +x.y || 0, tx: x.tx == null ? +x.x || 0 : +x.tx, ty: x.ty == null ? +x.y || 0 : +x.ty, b: x.b || "", at: ms(x.at) }; LivePres.place(p);
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
  function tick(pos, tgt, bed, moving, dk, tdk) {
    if (!on || dead || hid) return; var A = fb(); if (!A) return;
    var now = Date.now(), nid = dayId();
    if (nid !== id) { stopListen(); id = nid; last = 0; lastSig = ""; listen(); }
    var dc = LivePres.doc({ name: (A.profile && A.profile.name) || A.user.displayName, av: myAv() }, pos, tgt, bed, dk, tdk), sig = dc.x % 4 + ":" + dc.tx + "," + dc.ty + "," + dc.b;
    var stopped = wasMv && !moving;                  // he just arrived → one write with where he really stands
    if (!LivePres.due(last, now, moving, sig !== lastSig || stopped)) { if (!stopped) wasMv = moving; return; }
    wasMv = moving; last = now; lastSig = sig; dc.at = A.fs.serverTimestamp(); sentAt = now;
    A.fs.setDoc(ref(A), dc).then(function () { wr = true; }, function (e) { if (e && e.code === "permission-denied" && !wr) quiet(e); });
  }
  function others() { var A = fb(); return on && !dead ? LivePres.fresh(extra.length ? list.concat(extra) : list, Date.now(), A ? A.user.uid : "me", skew) : []; }
  function count() { return on && !dead ? others().length + 1 : 0; }
  function byDep(myDk) { var o = { er: 0, k: 0, n: 0, x: 0, r: 0, s: 0, g: 0, wt: 0, acc: 0, lab: 0, rad: 0, ph: 0 }; others().forEach(function (p) { o[p.dep] = (o[p.dep] || 0) + 1; }); if (on && !dead && myDk) o[myDk]++; return o; }
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
  W.LivePresRoom = { start: start, stop: stop, tick: tick, others: others, count: count, byDep: byDep, homeCount: homeCount, skew: skewMs, active: function () { return on && !dead; }, myAv: myAv,
    _list: function () { return list; }, _inject: function (l) { extra = (l || []).map(function (p) { return p.dep ? p : LivePres.place(Object.assign({}, p)); }); on = true; dead = false; if (cb) cb(); } };   // test hook: extra students drawn beside the real ones
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
