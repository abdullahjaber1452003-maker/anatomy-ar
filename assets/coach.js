/* 👨‍🏫 الأستاذ عثمان بيتدخّل (Abdullah, Oct 29 2026 1:22 PM: «يقترح على الطالب شو يدرس، يسأله عن حاله، إذا لقاه تعبان يقلّو ارتاح شوي»).
   Rule-based only (no AI call): every line below is written here and filled from data the site already has on this device.
   - 🏠 home: a small card under the tiles: «👋 أهلا <name>، كيفك اليوم؟» (😊 منيح / 😐 عادي / 😴 تعبان — once a day, localStorage
     nursin_mood_v1), then ONE suggestion: ⚔️ tournament match pending → 🔁 due reviews → 📖 «درس اليوم» → 🎯 weak points → ⏱️ minutes so far.
   - 📖 lesson + 📝 quiz pages: one light bubble per page visit (max 4 a day), dismissable, gone after 14 s.
   - 🌿 «تعبان» or 50+ minutes of continuous activity (no 5-minute gap) → «ارتاح ١٠ دقايق 🌿» + a button that starts a pomodoro break
     (assets/study.js, synced to the other devices); once per 50-minute block.
   - after a quiz result (nursin:quizdone) or a tournament match (nursin:dueldone): one short comment.
   Never inside the quiz / challenge / games / timer / tutor / chat / admin screens, and no ad is placed next to it. */
(function (w, d) {
  var MK = "nursin_mood_v1", CK = "nursin_cont_v1", SK = "nursin_osmday_v1";
  var page = (w.location && w.location.pathname || "/index.html").split("/").pop() || "index.html";
  var LESSON = /^(cardio|neuro|henderson|law|mgmt|quality|pharma|rea|3d)\.html$/, QUIZ = page === "quiz.html", HOME = page === "index.html" || page === "";
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function get(k, ss) { try { return JSON.parse((ss ? sessionStorage : localStorage).getItem(k) || "null"); } catch (e) { return null; } }
  function put(k, v, ss) { try { (ss ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { var N = w.Nursin; if (N && N.dayKey) try { return N.dayKey(); } catch (e) {} try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function name() { var A = w.NursinFB, p = A && A.profile, n = (p && p.name) || (A && A.user && A.user.displayName) || ""; n = String(n).trim().split(/\s+/)[0] || ""; return n.slice(0, 20); }
  function mood() { var m = get(MK); return m && m.d === today() ? m.m : ""; }
  // ⏱️ continuous activity: a gap of 5+ minutes starts a new block (shared by all tabs of this browser)
  function contMin(now) { var c = get(CK); return c && now - c.l < 5 * 60e3 ? Math.floor((c.l - c.s) / 60e3) : 0; }
  function touch() { var now = Date.now(), c = get(CK); if (!c || now - c.l >= 5 * 60e3) c = { s: now, l: now, r: 0 }; else c.l = now; put(CK, c); }
  // pure: what Osman says now, from the data (tests call NursinCoach.pick)
  function pick(x) {
    var out = [];
    if (x.mood === "tired" || x.cont >= 50) return { rest: true, txt: x.mood === "tired" ? T("ولا يهمّك 🌿 ارتاح ١٠ دقايق، اشرب مي، وبعدين منكمّل سوا.", "Pas de souci 🌿 repose-toi 10 minutes, bois de l'eau, puis on continue.") : T("صرلك " + x.cont + " دقيقة عم تدرس بلا وقفة 💪 ارتاح ١٠ دقايق 🌿", "Ça fait " + x.cont + " minutes que tu étudies sans pause 💪 repose-toi 10 minutes 🌿") };
    if (x.tn && x.tn.k === "todo") out.push({ txt: T("⚔️ دورك اليوم بالبطولة" + (x.tn.op ? " ضد " + x.tn.op : "") + ". يلا وريني شطارتك!", "⚔️ C'est ton tour au tournoi aujourd'hui" + (x.tn.op ? " contre " + x.tn.op : "") + ". Montre-moi ce que tu vaux !"), href: "index.html#duel", btn: T("⚔️ العب", "⚔️ Jouer") });
    if (x.due > 0) out.push({ txt: T("🔁 عندك " + x.due + " سؤال مراجعة مستحق اليوم. شو رأيك نراجع ١٠ دقايق؟", "🔁 Tu as " + x.due + " question(s) à réviser aujourd'hui. On révise 10 minutes ?"), href: "quiz.html?t=review", btn: T("🔁 راجع", "🔁 Réviser") });
    if (x.les) out.push({ txt: T("📖 درس اليوم: " + x.les.n + ". خمس دقايق قراءة بيكفّوا لنبلّش.", "📖 Leçon du jour : " + x.les.n + ". Cinq minutes de lecture suffisent pour commencer."), href: x.les.href || "index.html#wkles", btn: T("📖 اقرا", "📖 Lire") });
    if (x.weak > 0) out.push({ txt: T("🎯 عندك " + x.weak + " سؤال بنقاط ضعفك. صلّحهن قبل ما يصيروا عادة 😉", "🎯 Tu as " + x.weak + " question(s) dans tes points faibles. Corrige-les avant qu'elles deviennent une habitude 😉"), href: "quiz.html#weak", btn: T("🎯 كويز أخطائي", "🎯 Quiz de mes erreurs") });
    // 🗺️ Oct 29 11:43 PM (Abdullah: «بيضل بيذكره بشو يدرس بالدرس لضعيف فيه»): the most faded lesson, until it is green again
    if (x.red) out.push({ txt: T("🔴 «" + x.red.n + "» عم يروح منّك (" + x.red.score + "%). راجعو هلّق بالبطاقات 🃏", "🔴 « " + x.red.n + " » s'efface (" + x.red.score + " %). Révise-la maintenant avec les cartes 🃏"), href: fcHref(x.red), btn: T("🃏 راجعو", "🃏 Réviser") });
    var first = out[0] || { txt: x.min > 0 ? T("⏱️ درست اليوم " + x.min + " دقيقة. كمّل هيك 👏", "⏱️ Tu as étudié " + x.min + " min aujourd'hui. Continue comme ça 👏") : T("يلا نبلّش بشي خفيف: كويز ١٠ أسئلة 📝", "On commence léger : un quiz de 10 questions 📝"), href: x.min > 0 ? "" : "quiz.html", btn: x.min > 0 ? "" : T("📝 كويز", "📝 Quiz") };
    if (out.length && x.min > 0) first.sub = T("⏱️ درست اليوم " + x.min + " د", "⏱️ " + x.min + " min aujourd'hui");
    return first;
  }
  function data() {
    var G = w.NursinGoals, list = (G && G.list && G.list()) || [], les = null;
    for (var i = 0; i < list.length; i++) if (!list[i].done && /^(les|new):/.test(String(list[i].k))) { les = { n: String(list[i].n || "").replace(/^درس اليوم:\s*/, "").split(" — ")[0], href: list[i].href }; break; }
    var S = w.NursinSRS, due = S && S.count ? S.count() : 0, wk = get("nursin_weak_v1"), weak = wk && wk.items ? Object.keys(wk.items).length : 0;
    var tn = get("nursin_tn_v1"); if (!tn || tn.d !== today()) tn = null;
    var st = get("nursin_stact_v1"), min = st && st.d === today() ? Math.floor(Math.max(st.s || 0, st.r || 0) / 60) : 0;
    var m = mood();
    var R = w.NursinRet, wk1 = R && R.weakest ? R.weakest(1)[0] : null;
    return { mood: m, cont: contMin(Date.now()), tn: tn, due: due, les: les, weak: weak, min: min, red: wk1 && wk1.score < 40 ? wk1 : null };
  }
  // a lesson's page with its 🃏 cards opening at once (assets/cards.js ?fc=)
  function fcHref(l) { var p = String(l.href).split("#"); return p[0] + "?fc=" + encodeURIComponent(l.id) + (p[1] ? "#" + p[1] : ""); }
  // 🗺️ 1–2 reminders under the suggestion: the lessons fading the most (assets/hifz.js), red first; they stay until the lesson is green
  function reminders(skip) {
    var R = w.NursinRet; if (!R || !R.weakest) return "";
    var L = R.weakest(3).filter(function (l) { return !skip || l.id !== skip; }).slice(0, 2); if (!L.length) return "";
    return '<ul class="osmrem">' + L.map(function (l) {
      var red = l.score < 40, t = red ? T("«" + l.n + "» عم يروح منّك — راجعو", "« " + l.n + " » s'efface — révise-la") : T("«" + l.n + "» صار بدّو مراجعة", "« " + l.n + " » a besoin d'une révision");
      return '<li><a href="' + esc(fcHref(l)) + '">' + (R.dotHtml ? R.dotHtml(l.score) : "") + '<span>' + esc(t) + '</span><b dir="ltr">' + l.score + "%</b></a></li>";
    }).join("") + "</ul>";
  }
  var restShown = get("nursin_rest_v1", true) || 0;
  function restBtn() { return '<button class="btn sm on" type="button" data-osm-rest>' + T("☕ بلّش بريك ١٠ دقايق", "☕ Pause de 10 min") + "</button>"; }
  function bodyHtml(s, big) {
    var b = big ? "btn pri osmgo" : "btn sm on", lbl = function (x) { return big ? T("▶️ ابدأ", "▶️ Commencer") : x; };
    return '<p class="osmtx">' + (big ? '<small class="osmnow">' + esc(T("👉 هلّق اعمل هيدا:", "👉 Maintenant, fais ça :")) + "</small>" : "") + esc(s.txt) + (s.sub ? ' <small>' + esc(s.sub) + "</small>" : "") + "</p>" +
      (s.rest ? restBtn() : s.href === "index.html#duel" && HOME ? '<button class="' + b + '" type="button" data-osm-duel>' + esc(lbl(s.btn)) + "</button>" : s.href && s.btn ? '<a class="' + b + '" href="' + esc(s.href === "index.html#duel" ? "index.html" : s.href) + '">' + esc(lbl(s.btn)) + "</a>" : "");
  }
  function wire(el) {
    el.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target : e.target.parentElement;
      var m = t.closest("[data-mood]");
      if (m) { put(MK, { d: today(), m: m.getAttribute("data-mood") }); draw(); return; }
      if (t.closest("[data-osm-rest]")) { if (w.NursinStudy && w.NursinStudy.pomoBreak) w.NursinStudy.pomoBreak(10); el.querySelector(".osmbd").innerHTML = '<p class="osmtx">' + esc(T("⏱️ بلّش البريك. ارجعلي بعد ١٠ دقايق 😉", "⏱️ La pause a commencé. Reviens dans 10 minutes 😉")) + "</p>"; return; }
      if (t.closest("[data-osm-duel]")) { var du = d.getElementById("duel"); if (du) { du.scrollIntoView({ behavior: w.NursinAnim && w.NursinAnim.reduced() ? "auto" : "smooth", block: "start" }); du.classList.add("pulse"); setTimeout(function () { du.classList.remove("pulse"); }, 1200); } return; }
      if (t.closest("[data-osm-x]")) { el.remove(); if (HOME) put(SK, { d: today(), x: 1 }); }
    });
  }
  var card = null;
  function draw() {
    if (!card) return;
    var nm = name(), m = mood(), x = data(), s = pick(x);
    var hi = T("👋 أهلا" + (nm ? " " + nm : "") + "! كيفك اليوم؟", "👋 Salut" + (nm ? " " + nm : "") + " ! Comment ça va aujourd'hui ?");
    var moods = m ? "" : '<div class="osmmood">' + [["good", "😊 منيح", "😊 Bien"], ["ok", "😐 عادي", "😐 Normal"], ["tired", "😴 تعبان", "😴 Fatigué"]].map(function (x) { return '<button class="chip" type="button" data-mood="' + x[0] + '">' + T(x[1], x[2]) + "</button>"; }).join("") + "</div>";
    var ack = m === "good" ? T("حلو! 😊 ", "Super ! 😊 ") : m === "ok" ? T("ماشي، منمشيها خفيفة 🙂 ", "D'accord, on y va doucement 🙂 ") : "";
    // 🏠 Oct 29 11:43 PM: Osman is the FIRST thing on the home page — one clear «هلّق اعمل هيدا» + a big «ابدأ», then 1–2 fading lessons
    card.innerHTML = '<div class="osmhd"><span class="osa" aria-hidden="true">👨‍🏫</span><b>' + esc(T("الأستاذ عثمان", "Professeur Osman")) + "</b>" + (m ? '<span class="osmack">' + esc(ack || (m === "tired" ? "🌿" : "")) + "</span>" : "") + "</div>" +
      (m ? "" : '<p class="osmtx osmhi"><b>' + esc(hi) + "</b></p>" + moods) + '<div class="osmbd">' + bodyHtml(s, true) + "</div>" + (s.rest ? "" : reminders(x.red && s.href === fcHref(x.red) ? x.red.id : ""));
  }
  function homeCard() {
    var host = d.getElementById("osmhome"); if (!host) return;
    card = d.createElement("div"); card.className = "osmcard"; card.id = "osmcard"; card.setAttribute("data-nofr", "");
    host.appendChild(card); wire(card); draw();
    ["nursin:goals", "nursin:srs", "nursin:tourney", "nursin:auth", "nursin:study", "nursin:ret"].forEach(function (ev) { d.addEventListener(ev, function () { if (card && card.isConnected && !card.querySelector("[data-osm-rest]") ) draw(); }); });
  }
  // a light bubble (lesson / quiz pages, comments after a quiz or a match)
  var bub = null, bubT = 0;
  function bubble(html, ms) {
    if (bub) bub.remove();
    bub = d.createElement("div"); bub.className = "osmbub"; bub.setAttribute("role", "status"); bub.setAttribute("data-nofr", "");
    bub.innerHTML = '<span class="osa" aria-hidden="true">👨‍🏫</span><div class="osmbd">' + html + '</div><button class="osmx" type="button" data-osm-x aria-label="' + esc(T("سكّر", "Fermer")) + '">✕</button>';
    d.body.appendChild(bub); wire(bub); clearTimeout(bubT); var b = bub; bubT = setTimeout(function () { if (b.isConnected && !b.querySelector("[data-osm-rest]")) b.remove(); }, ms || 14000);
  }
  function pageBubble() {
    var k = "osm:" + page; if (get(k, true)) return; put(k, 1, true);       // once per page visit (per tab session)
    var c = get("nursin_osmc_v1"); if (!c || c.d !== today()) c = { d: today(), n: 0 }; if (c.n >= 4) return; c.n++; put("nursin_osmc_v1", c);
    var R = w.NursinRet, here = R && R.weakest ? R.weakest(8).filter(function (l) { return l.score < 40 && String(l.href).split("#")[0] === page; })[0] : null;
    if (here) return bubble('<p class="osmtx">' + esc(T("🔴 «" + here.n + "» عم يروح منّك (" + here.score + "%). بآخر الدرس في 🃏 بطاقات، جرّبهن.", "🔴 « " + here.n + " » s'efface (" + here.score + " %). À la fin de la leçon il y a 🃏 des cartes, essaie-les.")) + '</p><a class="btn sm on" href="' + esc(fcHref(here)) + '">' + esc(T("🃏 البطاقات", "🃏 Les cartes")) + "</a>");
    var s = pick(data()); if (s.href && s.href.split("#")[0] === page && !s.rest) return;   // already where he would send you
    bubble(bodyHtml(s));
  }
  function restCheck() {
    var m = contMin(Date.now()), blk = Math.floor(m / 50);
    if (m >= 50 && blk > restShown && !d.querySelector(".duelq") && !d.documentElement.classList.contains("duelon")) { restShown = blk; put("nursin_rest_v1", blk, true); bubble(bodyHtml(pick({ cont: m })), 60000); }
  }
  // pure: the comment after a result (tests call NursinCoach.after)
  function after(kind, score, total) {
    var p = total ? Math.round(100 * score / total) : 0;
    if (kind === "duel") return p >= 80 ? T("⚔️ " + score + "/" + total + "! هيك بتربح البطولة 🔥", "⚔️ " + score + "/" + total + " ! C'est comme ça qu'on gagne le tournoi 🔥") : p >= 60 ? T("⚔️ " + score + "/" + total + "، منيح! خلّينا نشوف خصمك 😏", "⚔️ " + score + "/" + total + ", pas mal ! Voyons ton adversaire 😏") : T("⚔️ " + score + "/" + total + "… ولا يهمّك، راجع الأجوبة تحت وبكرا أحسن 💪", "⚔️ " + score + "/" + total + "… pas grave, revois les réponses et demain ça ira mieux 💪");
    return p >= 85 ? T("🔥 " + p + "%! برافو، الأستاذ عثمان فخور فيك", "🔥 " + p + " % ! Bravo, le professeur Osman est fier de toi") : p >= 60 ? T("👍 " + p + "%. منيح! راجع الغلطات تحت، وهني رح يرجعولك بالمراجعة 🔁", "👍 " + p + " %. Bien ! Revois les erreurs, elles reviendront en révision 🔁") : T("💪 " + p + "%. مش مشكلة، اقرا الدرس شي ١٠ دقايق وجرّب كمان مرّة", "💪 " + p + " %. Pas grave, relis le cours 10 minutes et réessaie");
  }
  w.NursinCoach = { reminders: reminders, fcHref: fcHref, pick: pick, after: after, contMin: contMin };
  if (!d || !d.addEventListener || !d.body) return;
  ["scroll", "touchstart", "click", "keydown"].forEach(function (ev) { w.addEventListener(ev, function () { touch(); }, { passive: true }); });
  touch();
  d.addEventListener("nursin:quizdone", function (e) { var x = e.detail || {}; setTimeout(function () { bubble('<p class="osmtx">' + esc(after("quiz", x.score | 0, x.total | 0)) + "</p>", 9000); }, 600); });
  d.addEventListener("nursin:dueldone", function (e) { var x = e.detail || {}; setTimeout(function () { var o = d.querySelector(".duelq .dqbox"); if (o) { var p = d.createElement("p"); p.className = "osmline"; p.setAttribute("data-nofr", ""); p.textContent = "👨‍🏫 " + after("duel", x.score | 0, x.n | 0); o.insertBefore(p, o.children[2] || null); } }, 50); });
  function go() {
    if (HOME) homeCard();
    else if (LESSON.test(page) || QUIZ) setTimeout(pageBubble, 6000);
    setInterval(restCheck, 60000);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(go, 400); }); else setTimeout(go, 400);
})(window, document);
