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

  /* 30c (Abdullah, Nov 7 2026 11:05 AM «بدي انه يساعدني بالحالة لبكون فيها»): he helps with the patient I am WITH — 📊 my patient's vitals
     explained one by one, 🔤 the ABCDE priority among them, ❓ progressive hints that never say the answer, and no «روح عالحالة التانية» nagging
     (one gentle line only when the other patient is critical 🔴, at most once a minute). Pure — the room builds the words. */
  // 🌐 notion générale: standard adult normal ranges (the case bank only has one «normal» value per sign, D.vok)
  var VR = [
    { k: "sys", fr: "TA systolique", ar: "الضغط الفوقاني", u: "mmHg", lo: 90, hi: 139, L: "C" },
    { k: "dia", fr: "TA diastolique", ar: "الضغط التحتاني", u: "mmHg", lo: 60, hi: 89, L: "C" },
    { k: "fc", fr: "FC (fréquence cardiaque)", ar: "نبض القلب", u: "/min", lo: 60, hi: 100, L: "C" },
    { k: "fr", fr: "FR (fréquence respiratoire)", ar: "عدد الأنفاس بالدقيقة", u: "/min", lo: 12, hi: 20, L: "B" },
    { k: "spo2", fr: "SpO₂ (saturation)", ar: "نسبة الأكسجين بالدم", u: "%", lo: 95, hi: 100, L: "B" },
    { k: "t", fr: "T° (température)", ar: "الحرارة", u: "°C", lo: 36.5, hi: 37.5, L: "E", dp: 1 },
    { k: "gcs", fr: "Glasgow (GCS)", ar: "مقياس الوعي", u: "/15", lo: 15, hi: 15, L: "D" },
    { k: "eva", fr: "EVA (douleur)", ar: "مقياس الوجع", u: "/10", lo: 0, hi: 3, L: "E" }
  ];
  function rnd(n, dp) { var m = dp ? 10 : 1; return Math.round(n * m) / m; }
  // v = { sys, dia, fc, fr, spo2, t, gcs, eva? } → one row per sign that has a number: value, range, ok | hi | lo
  function vit(v) {
    var out = []; v = v || {};
    for (var i = 0; i < VR.length; i++) { var r = VR[i], n = +v[r.k]; if (v[r.k] == null || v[r.k] === "" || !isFinite(n)) continue; n = rnd(n, r.dp);
      out.push({ k: r.k, fr: r.fr, ar: r.ar, u: r.u, lo: r.lo, hi: r.hi, L: r.L, val: n, st: n < r.lo ? "lo" : n > r.hi ? "hi" : "ok" }); }
    return out;
  }
  // 🔤 ABCDE: the first abnormal sign in A → B → C → D → E order (B: SpO₂ before FR · C: TA before FC), or null when all are normal
  var ORD = ["spo2", "fr", "sys", "dia", "fc", "gcs", "t", "eva"];
  function abc(rows) {
    var best = null;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r.st === "ok") continue; if (!best || ORD.indexOf(r.k) < ORD.indexOf(best.k)) best = r; }
    return best;
  }
  // ❓ «علقت»: hint n (1 = vague … max) from the ladder, without any line that would say the answer (bans = the step / action / field answer)
  function norm(t) { return String(t || "").toLowerCase().replace(/[«»"'“”().,:;!?·—-]/g, " ").replace(/\s+/g, " ").trim(); }
  function leaks(t, bans) {
    var a = norm(t);
    for (var i = 0; i < (bans || []).length; i++) { var b = norm(bans[i]).replace(/^[^a-z0-9\u0600-\u06ff]+/, ""); if (b.length >= 3 && a.indexOf(b) > -1) return true; }
    return false;
  }
  function ladder(lines, n, bans) {
    var ok = []; for (var i = 0; i < lines.length; i++) if (lines[i] && !leaks(lines[i], bans)) ok.push(lines[i]);
    return ok.slice(0, Math.max(0, Math.min(n, ok.length)));
  }
  // the one gentle line about the OTHER patient: only when he is critical (🔴), never twice within a minute
  var NUDGE = 60000;
  function nudge(o, other, now) {
    if (!o || !other || other.over || other.ghost || other.st !== "crit") return false;
    if (o.t && now - o.t < NUDGE) return false;
    o.t = now; return true;
  }
  w.LiveAsst = { VR: VR, vit: vit, abc: abc, leaks: leaks, ladder: ladder, nudge: nudge, NUDGE: NUDGE,
    OX: OX, OY: OY, SPEED: SPEED, IDLE: IDLE, GAP: GAP, MISS: MISS, SHOW: SHOW, target: target, make: make, snap: snap, follow: follow, hit: hit,
    offerNew: offerNew, seen: seen, missed: missed, should: should, show: show, hide: hide, expired: expired };
})(window);
