/* 29p 🧑‍⚕️🚶 «الممرض المساعد» as a drawn character (Abdullah, Nov 6 2026 2:25 PM: «بدي ياه يكون بيمشي بنفس الغرفة ل بكون فيها» +
   «ويسألني بشكل عشوائي بدك ساعدك» + «أكيد يكون مساعد الكل»). Every student gets his OWN assistant: he stands beside the student's nurse and
   follows him around the room he is in (a simple follow with an offset: he walks while the nurse walks, stands still otherwise).
   Local only — nothing here touches Firestore, presence, storage or the network; the room's existing loop (29l idle throttle) moves him.
   Now and then he offers help with a small bubble «بدّك ساعدك؟» (ايه / لأ): after ~60 s with no progress/movement or right after a
   wrong action — at most once every 3 min, never while the nurse walks or travels. Pure logic here (assets/livecase-room.js draws him). */
(function (w) {
  "use strict";
  var OX = -22, OY = 14, SPEED = 180, GO = 8, SNAP = 140, PAD = 14;
  var IDLE = 60000, GAP = 180000, MISS = 30000, SHOW = 15000;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function target(n, W, H) {                                   // beside / a step behind the nurse; flipped to the other side near a wall
    var x = n.x + OX, y = n.y + OY;
    if (x < PAD) x = n.x - OX; if (y > H - PAD) y = n.y - OY;
    return { x: clamp(x, PAD, W - PAD), y: clamp(y, PAD, H - PAD) };
  }
  function make(n, W, H) { var t = target(n, W || 360, H || 640); return { x: t.x, y: t.y, dir: n.dir || -Math.PI / 2, walkT: 0, mv: false }; }
  function snap(a, n, W, H) { var t = target(n, W, H); a.x = t.x; a.y = t.y; a.mv = false; a.walkT = 0; a.dir = n.dir || a.dir; return a; }
  // one frame: walk toward the spot beside the nurse; standing still once there (so the room can drop back to its idle frame rate)
  function follow(a, n, dt, W, H) {
    var t = target(n, W, H), dx = t.x - a.x, dy = t.y - a.y, dd = Math.sqrt(dx * dx + dy * dy);
    if (dd > SNAP) return snap(a, n, W, H);                    // a new room / a jump: he is just there
    if (!a.mv && dd < GO) return a;                            // close enough: idle
    if (dd <= 0.5) { a.x = t.x; a.y = t.y; a.mv = false; a.walkT = 0; if (n.dir != null) a.dir = n.dir; return a; }   // there: he stands
    var st = SPEED * (dt || 0); if (st <= 0) return a;
    a.dir = Math.atan2(dy, dx);
    if (dd <= st) { a.x = t.x; a.y = t.y; } else { a.x += dx / dd * st; a.y += dy / dd * st; }
    a.mv = true; a.walkT += dt; return a;                      // he stepped this frame (legs swing; the room draws at full rate)
  }
  function hit(a, p) { var dx = p.x - a.x, dy = p.y - a.y; return dx * dx + dy * dy <= 15 * 15; }
  // «بدّك ساعدك؟» — o = { act: last progress/movement, miss: last wrong action, last: last offer, shown: when the bubble opened (0 = closed) }
  function offerNew(now) { return { act: now, miss: 0, last: -1e12, shown: 0 }; }
  function seen(o, now) { o.act = now; }
  function missed(o, now) { o.miss = now; o.act = now; }
  function should(o, now, walking) {
    if (!o || walking || o.shown) return "";
    if (now - o.last < GAP) return "";
    if (o.miss && now - o.miss <= MISS) return "miss";
    if (now - o.act >= IDLE) return "idle";
    return "";
  }
  function show(o, now) { o.shown = now; o.last = now; o.miss = 0; }
  function hide(o, now) { o.shown = 0; o.miss = 0; o.act = now; }
  function expired(o, now) { return !!o.shown && now - o.shown > SHOW; }
  w.LiveAsst = { OX: OX, OY: OY, SPEED: SPEED, IDLE: IDLE, GAP: GAP, MISS: MISS, SHOW: SHOW, target: target, make: make, snap: snap, follow: follow, hit: hit,
    offerNew: offerNew, seen: seen, missed: missed, should: should, show: show, hide: hide, expired: expired };
})(window);
