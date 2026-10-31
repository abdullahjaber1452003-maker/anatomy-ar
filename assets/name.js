/* ✏️ «غيّر اسمك» — Abdullah, Oct 31 2026 4:51 PM («بدي انه نخلي الطالب يكون قادر يغير اسمه»), plan OK'd 4:52 PM.
   A student picks the name the site shows: home greeting, «أنا», friends / ranking / classes / tournaments / live rooms, chat.
   ONE source of truth: users/{uid}.nick (his choice; "" = back to his Google name) → users/{uid}.name, which every reader already uses
   (assets/fb.js ensureProfile applies it on every visit, so his other devices pick it up). No rule change: users/{uid} already lets the
   owner write any extra field and name < 40 chars. Signed out: a nickname kept on this device only (localStorage nursin_name_v1),
   adopted by the account at the next sign-in when the account has no name of its own yet.
   Rules for a name: trimmed (inner spaces collapsed), 2–20 characters, Arabic / Latin letters, digits, space . _ - , at least one letter,
   no insult (BAD below: Arabic, Arabizi, French, English), not a reserved name. Loaded on every page before account.js / ui.js. */
(function (w, d) {
  var KEY = "nursin_name_v1", MIN = 2, MAX = 20;
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- 🚫 names we refuse (kept short on purpose; matching is folded: case, accents, Arabic hamza/ta marbuta, leet digits, repeats) ---------- */
  // SUB = refused anywhere inside the name; WORD = refused as a whole word (short words that hide inside real names: Hassan, Zubaida…)
  var BAD = {
    SUB: [
      // عربي
      "شرموط", "منيوك", "قحبه", "كسمك", "كسامك", "كسختك", "كساختك", "متناك", "ديوث", "عاهره", "لوطي", "ابنالكلب", "ابنكلب", "ابنالحرام", "يلعن", "عرصه", "زبالتك",
      // Arabizi
      "sharmout", "charmout", "sharmot", "manyok", "manyouk", "manyak", "kosomak", "kossomak", "kosomk", "kosekht", "qahba", "kahbe",
      // français
      "connard", "connasse", "salope", "encule", "enculer", "putain", "batard", "niquer", "niquetamere", "tamere", "filsdepute", "couille", "tafiole", "abruti", "debile", "cretin", "enfoire", "merdeux", "pouffiasse",
      // English
      "fuck", "bullshit", "shithead", "bitch", "cunt", "whore", "slut", "asshole", "bastard", "motherf", "dickhead", "nigg", "faggot", "retard", "wanker", "penis", "vagina", "porn", "boob", "hitler"
    ],
    WORD: [
      "كس", "كسك", "منيك", "طيز", "طيزك", "زب", "زبي", "زبك", "نيك", "ناك", "اير", "ايري", "ايرك", "كلب", "كلبه", "حمار", "حماره", "جحش", "بهيم", "حيوان", "غبي", "غبيه", "اهبل", "هبله",
      "خرا", "خره", "زباله", "وسخ", "واطي", "حقير", "حقيره", "شاذ", "قحاب", "عرص", "تافه", "ساقط", "ساقطه",
      "ayre", "ayri", "ayrak", "kess", "kos", "tiz", "teez", "tizak", "hmar", "kalb", "khara", "zeb", "zebb", "zebi", "ars", "arss", "ahbe",
      "nique", "pute", "putes", "con", "conne", "cons", "pd", "pede", "bite", "merde", "chienne", "gogol", "mongol", "ntm", "fdp", "salaud",
      "shit", "ass", "dick", "fag", "cock", "pussy", "stupid", "dumb", "sex", "sexy", "tits", "idiot", "loser", "nazi"
    ],
    // names that would pass for the site or its teacher
    RES: ["admin", "administrateur", "administrator", "moderator", "nursin", "support", "ادمن", "الادمن", "اداره", "نيرسن", "نرسن"],
    RESSUB: ["الاستاذعثمان", "استاذعثمان", "profosman", "professeurosman", "nursinofficial"]
  };
  var AR_FOLD = [[/[\u064B-\u065F\u0670\u0640]/g, ""], [/[أإآٱ]/g, "ا"], [/ة/g, "ه"], [/ى/g, "ي"], [/ؤ/g, "و"], [/ئ/g, "ي"]];
  function base(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    AR_FOLD.forEach(function (r) { s = s.replace(r[0], r[1]); });
    s = s.replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }).replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x6F0); });
    return s;
  }
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
  var ARABIZI = { "2": "a", "3": "a", "5": "kh", "7": "h", "8": "gh", "9": "q" };
  function mapDigits(s, m) { return s.replace(/[0-9@$!]/g, function (c) { return m[c] != null ? m[c] : c; }); }
  function squeeze(s) { return s.replace(/(.)\1+/g, "$1"); }                         // fuuuck → fuck (the lists are squeezed the same way)
  function forms(raw) {                                                              // every spelling we check: [compact, tokens]
    var b = base(raw), out = [];
    [b, mapDigits(b, LEET), mapDigits(b, ARABIZI)].forEach(function (v) {
      var toks = v.split(/[\s._\-]+/).filter(Boolean), compact = toks.join("");
      out.push({ c: compact, t: toks });
    });
    return out;
  }
  function hit(raw) {
    var F = forms(raw), i, j, k, f, w2, sq = function (x) { return squeeze(base(x)); };
    for (i = 0; i < F.length; i++) {
      f = F[i];
      var cs = squeeze(f.c);
      for (j = 0; j < BAD.SUB.length; j++) if (cs.indexOf(sq(BAD.SUB[j])) > -1) return "bad";
      for (j = 0; j < BAD.RESSUB.length; j++) if (cs.indexOf(sq(BAD.RESSUB[j])) > -1) return "res";
      var words = f.t.concat([f.c]);
      for (k = 0; k < words.length; k++) {
        w2 = words[k];
        for (j = 0; j < BAD.WORD.length; j++) { var bw = base(BAD.WORD[j]); if (w2 === bw || (sq(bw).length >= 3 && squeeze(w2) === sq(bw))) return "bad"; }
        for (j = 0; j < BAD.RES.length; j++) if (w2 === base(BAD.RES[j])) return "res";
      }
    }
    return "";
  }

  /* ---------- ✅ validation (pure; tests run it) ---------- */
  var OKCH = /^[\u0621-\u063A\u0641-\u064A\u064B-\u0652\u0660-\u0669\u0671-\u06D3\u06F0-\u06F9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F0-9 ._\-]+$/;
  var LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]/;
  var ERR = {
    empty: ["اكتب اسمك 🙂", "Écris ton nom 🙂"],
    short: ["الاسم لازم يكون حرفين عالأقل", "Le nom doit avoir au moins 2 caractères"],
    long: ["الاسم لازم يكون 20 حرف أو أقل", "Le nom doit avoir 20 caractères maximum"],
    chars: ["بس أحرف عربي أو لاتيني، أرقام، مسافة و . _ -", "Seulement des lettres (arabes ou latines), des chiffres, des espaces et . _ -"],
    letter: ["لازم يكون فيه حرف واحد عالأقل، مش بس أرقام ورموز", "Il faut au moins une lettre, pas seulement des chiffres ou des signes"],
    bad: ["هالاسم ما بيمشي 🙏 اختار اسم لطيف", "Ce nom n'est pas accepté 🙏 choisis un nom correct"],
    res: ["هالاسم محجوز، اختار اسم تاني", "Ce nom est réservé, choisis-en un autre"]
  };
  function clean(raw) {
    var s = String(raw == null ? "" : raw);
    try { s = s.normalize("NFC"); } catch (e) {}
    return s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").replace(/\s+/g, " ").trim();   // invisible / direction marks out, one space
  }
  function validate(raw) {
    var n = clean(raw), len = Array.from(n).length, code = "";
    if (!n) code = "empty";
    else if (len < MIN) code = "short";
    else if (len > MAX) code = "long";
    else if (!OKCH.test(n)) code = "chars";
    else if (!LETTER.test(n)) code = "letter";
    else code = hit(n);
    if (code) return { ok: false, code: code, name: n, ar: ERR[code][0], fr: ERR[code][1] };
    return { ok: true, name: n };
  }

  /* ---------- 💾 store ---------- */
  function lsGet() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && typeof o.n === "string" ? o : null; } catch (e) { return null; } }
  function lsSet(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) {} }
  function fb() { var A = w.NursinFB; return A && A.user ? A : null; }
  function N() { return w.Nursin || {}; }
  // the name the site shows for me right now + whether I chose it
  function current() {
    var A = fb(), loc = lsGet();
    if (A && A.profile) return { name: String(A.profile.name || ""), custom: !!A.profile.nick, signed: true };
    var me = N().me;
    if (me && me.name) {                                                         // signed in, account still loading: a change made here first
      if (loc && loc.p && validate(loc.n).ok) return { name: loc.n, custom: true, signed: true };
      return { name: String(me.name), custom: !!(loc && loc.n === me.name), signed: true };
    }
    if (loc && validate(loc.n).ok) return { name: loc.n, custom: true, signed: false };
    return { name: "", custom: false, signed: false };
  }
  // the home greeting: a chosen name whole, a Google name by its first word
  function greetName() { var c = current(); if (!c.name) return ""; return c.custom ? c.name : String(c.name).trim().split(/\s+/)[0].slice(0, 18); }
  function fire() { try { d.dispatchEvent(new CustomEvent("nursin:name")); } catch (e) {} }
  function timeout(p, ms) { return Promise.race([p, new Promise(function (res) { setTimeout(function () { res({ ok: false, why: "slow" }); }, ms); })]); }
  // save → {ok, name, synced} | {ok:false, ar, fr}. Device first (pending flag p until the account has it), then the account.
  function save(raw) {
    var v = validate(raw); if (!v.ok) return Promise.resolve(v);
    var A = fb(), uid = A ? A.user.uid : N().me ? "?" : null;                 // "?" = signed in, account not loaded yet: sent at the next sign-in check
    lsSet({ n: v.name, at: Date.now(), uid: uid, p: uid ? 1 : 0 });
    if (!A || !A.setNick) { fire(); return Promise.resolve({ ok: true, name: v.name, synced: false, local: true }); }
    return timeout(A.setNick(v.name), 9000).then(function (r) {
      if (r && r.ok) lsSet({ n: v.name, at: Date.now(), uid: uid, p: 0 });
      fire(); return { ok: true, name: v.name, synced: !!(r && r.ok), why: r && r.why };
    }, function () { fire(); return { ok: true, name: v.name, synced: false }; });
  }
  // back to the Google name (signed in) / no nickname (signed out)
  function reset() {
    var A = fb(); lsSet(null);
    if (!A || !A.setNick) { fire(); return Promise.resolve({ ok: true, synced: false }); }
    return timeout(A.setNick(""), 9000).then(function (r) { fire(); return { ok: true, synced: !!(r && r.ok) }; }, function () { fire(); return { ok: true, synced: false }; });
  }
  // assets/fb.js at sign-in: which nick the account should carry. d = users/{uid} data.
  // → {nick, write}: the account's own choice wins; a name chosen on this device (signed out, or not sent yet) fills an account without one
  function pick(d, uid) {
    var loc = lsGet(), has = d && typeof d.nick === "string", srv = has ? clean(d.nick) : null;
    if (srv && !validate(srv).ok) srv = "";
    if (loc && loc.p && (loc.uid === uid || loc.uid === "?") && validate(loc.n).ok && loc.n !== srv) return { nick: loc.n, write: true };   // changed here, never reached the account
    if (has) { if (srv) lsSet({ n: srv, at: Date.now(), uid: uid, p: 0 }); else if (loc) lsSet(null); return { nick: srv, write: false }; }
    if (loc && (!loc.uid || loc.uid === uid) && validate(loc.n).ok) { lsSet({ n: loc.n, at: Date.now(), uid: uid, p: 0 }); return { nick: loc.n, write: true }; }
    return { nick: "", write: false };
  }

  /* ---------- ✏️ the sheet (glass, assets/ui.js) ---------- */
  function avatar() { var U = w.NursinUI; return U && U.avHtml ? U.avHtml("hzpkav") : '<span class="hzpkav hzavx" aria-hidden="true">🙂</span>'; }
  function open(from) {
    var U = w.NursinUI; if (!U || !U.openSheet) { location.href = "me.html"; return null; }
    var c = current(), A = fb();
    var h = '<p class="hzpk-now">' + avatar() + "<span><b dir=\"auto\">" + (c.name ? esc(c.name) : T("لسّا ما في اسم", "Pas encore de nom")) + "</b><small>" +
      (c.custom ? T("اسم إنت اخترتو", "Un nom choisi par toi") : c.signed ? T("اسمك من حساب غوغل", "Ton nom du compte Google") : T("بلا اسم عهالجهاز", "Aucun nom sur cet appareil")) + "</small></span></p>" +
      '<form class="hznm" novalidate><label class="hznm-l" for="hznm-in">' + T("اسمك الجديد", "Ton nouveau nom") + "</label>" +
      '<input id="hznm-in" class="hznm-in" type="text" dir="auto" maxlength="40" autocomplete="nickname" autocapitalize="words" spellcheck="false" enterkeyhint="done" aria-describedby="hznm-hint" value="' + esc(c.name) + '">' +
      '<p class="hznm-msg" role="status" aria-live="polite"></p>' +
      '<p class="hznm-hint"><span id="hznm-hint">' + T("من 2 لـ 20 حرف: عربي أو لاتيني، أرقام، مسافة و . _ -", "De 2 à 20 caractères : lettres arabes ou latines, chiffres, espace et . _ -") + '</span><span class="hznm-c" dir="ltr" aria-hidden="true"></span></p>' +
      '<div class="hzpk-row"><button class="hzbtn pri" type="submit">💾 ' + T("حفظ", "Enregistrer") + "</button>" +
      (A && c.custom ? '<button class="hzbtn" type="button" data-nm-reset>↩️ ' + T("رجّع اسم غوغل", "Reprendre mon nom Google") + "</button>" : "") +
      (!A && c.custom ? '<button class="hzbtn" type="button" data-nm-reset>↩️ ' + T("بلا اسم", "Sans nom") + "</button>" : "") + "</div>" +
      '<p class="hzpk-note">' + (A ? T("بيبيّن بالترحيب، عند أصحابك، بالترتيب، بالصف والبطولة، وبرسايلك الجديدة بالشات. وبيتزامن مع كل أجهزتك.", "Il s'affiche dans l'accueil, chez tes amis, au classement, dans ta classe et le tournoi, et dans tes nouveaux messages. Synchronisé sur tous tes appareils.")
        : T("بيبيّن عهالجهاز بس. ", "Visible seulement sur cet appareil. ") + '<a href="friends.html">' + T("سجّل دخول", "Connecte-toi") + "</a>" + T(" تا يبيّن لأصحابك وعلى كل أجهزتك.", " pour que tes amis le voient, sur tous tes appareils.")) + "</p></form>";
    var s = U.openSheet("hzname", T("✏️ غيّر اسمك", "✏️ Changer ton nom"), h, from);
    var f = s.querySelector("form"), inp = s.querySelector(".hznm-in"), msg = s.querySelector(".hznm-msg"), cnt = s.querySelector(".hznm-c"), busy = false;
    function count() { var n = Array.from(clean(inp.value)).length; cnt.textContent = n + "/" + MAX; cnt.classList.toggle("over", n > MAX); }
    function say(t, ok) { msg.textContent = t; msg.classList.toggle("ok", !!ok); msg.classList.toggle("err", !ok && !!t); inp.setAttribute("aria-invalid", !ok && t ? "true" : "false"); }
    inp.addEventListener("input", function () { count(); if (msg.classList.contains("err")) say(""); });
    count();
    setTimeout(function () { try { inp.focus({ preventScroll: true }); inp.select(); } catch (e) {} }, 320);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); if (busy) return;
      var v = validate(inp.value);
      if (!v.ok) { say(T(v.ar, v.fr)); return; }
      if (v.name === c.name && c.custom) { U.close(); return; }
      busy = true; say("⏳ …", true);
      save(v.name).then(function (r) {
        busy = false;
        if (!r.ok) { say(T(r.ar, r.fr)); return; }
        inp.value = r.name; count();
        say(r.synced || !A ? T("✅ صار اسمك «" + r.name + "»", "✅ Tu t'appelles maintenant « " + r.name + " »")
          : T("✅ انحفظ «" + r.name + "» عهالجهاز. رح ينبعت لحسابك أوّل ما يرجع النت.", "✅ « " + r.name + " » est gardé sur cet appareil ; il partira vers ton compte dès que la connexion revient."), true);
        setTimeout(function () { if (w.NursinUI && w.NursinUI.isOpen && w.NursinUI.isOpen() && d.body.contains(s)) U.close(); }, r.synced || !A ? 900 : 2200);
      });
    });
    var rb = s.querySelector("[data-nm-reset]");
    if (rb) rb.addEventListener("click", function () {
      if (busy) return; busy = true; say("⏳ …", true);
      reset().then(function () { busy = false; var c2 = current(); inp.value = c2.name; count(); say(A ? T("✅ رجع اسم غوغل", "✅ Ton nom Google est revenu") : T("✅ انمحى الاسم", "✅ Nom effacé"), true); rb.remove();
        setTimeout(function () { if (d.body.contains(s)) U.close(); }, 900); });
    });
    return s;
  }
  // any element with data-nm-open opens the sheet (avatar sheet, «أنا»); links keep a fallback href
  if (d && d.addEventListener) d.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-nm-open]"); if (!b) return;
    e.preventDefault(); var U = w.NursinUI;
    if (U && U.isOpen && U.isOpen()) { U.close(); setTimeout(function () { open(b); }, 280); } else open(b);
  });
  w.NursinName = { KEY: KEY, MIN: MIN, MAX: MAX, BAD: BAD, validate: validate, clean: clean, current: current, greetName: greetName, save: save, reset: reset, pick: pick, open: open, local: lsGet };
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
