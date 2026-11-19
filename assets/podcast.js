/* 🎙️ «بودكاست التمريض» — حلقات يومية تلقائية طويلة (١٥–٢٠ دقيقة) عبر الذكاء الاصطناعي (Worker الموقع) + أرشيف جاهز.
   • كل يوم بتوقيت بيروت بيختار درس جديد تلقائياً من كل دروس الموقع (NLESSONS.list)، مع أولوية لمواد الامتحان القريب.
   • بيولّد حوار بودكاست طويل وممتع بين «الأستاذ عثمان» و«سارة» على ٤ فصول متتالية (١٥–٢٠ دقيقة استماع):
     ١) المقدمة والأساسيات  ٢) التفاصيل السريرية  ٣) حالة مريض ودور التمريض  ٤) فخاخ الامتحان والملخّص + سؤال تثبيت.
   • أول ما يجهز الفصل الأول (خلال ثواني) بيقدر الطالب يبلّش يسمع فوراً، وباقي الفصول بتتجهّز بالخلفية وتنضاف تلقائياً.
   • بيحفظ مكان التوقّف بكل حلقة، وبيدعم ملفات MP3 (إذا وُجدت) أو صوت الجهاز العربي بتقطيع ذكي يمنع التوقف المفاجئ. */
(function (w, d) {
  "use strict";
  var API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/";
  var PK = "nursin_pod_v1", AIK = "nursin_pod_ai_v1", POSK = "nursin_pod_pos_v1";
  var CHAPTERS = [
    { id: 1, name: "١. المقدمة والأساسيات والمصطلحات", prompt: "ابدأوا حلقة بودكاست تمريضي طبيعي وممتع باللهجة اللبنانية المبسطة والمفهومة مع المصطلحات الفرنسية الطبية ومعناها بالعربي. هذا هو الفصل الأول (المقدمة والأساسيات): ترحيب سريع من سارة بالأستاذ عثمان، شرح الفكرة الأساسية للدرس بأسلوب قصصي واضح، وأهم المصطلحات الفرنسية ومعانيها. اكتب ١٤ إلى ١٦ تبادل حواري غني ومفصّل (كل مداخلة ٢ إلى ٤ جمل واضحة)." },
    { id: 2, name: "٢. التفاصيل السريرية والأعراض والأرقام", prompt: "كمّلوا نفس حلقة البودكاست — هذا الفصل الثاني (التفاصيل السريرية): ادخلوا بعمق بالأعراض، الأسباب، الآلية، الأرقام أو القيم الطبيعية، والفروقات الأساسية بالدرس مع أمثلة سهلة للتذكر. لا تعيدوا الترحيب. اكتب ١٤ إلى ١٦ تبادل حواري غني ومفصّل (كل مداخلة ٢ إلى ٤ جمل)." },
    { id: 3, name: "٣. حالة مريض واقعية والدور التمريضي", prompt: "كمّلوا نفس حلقة البودكاست — هذا الفصل الثالث (تطبيق سريري بالمستشفى): الأستاذ عثمان يطرح حالة مريض واقعية من الطوارئ أو القسم مرتبطة بهذا الدرس، وسارة تسأله خطوة بخطوة عن الدور التمريضي، المراقبة، الأولويات، والأدوية أو التدخلات اللازمة. اكتب ١٤ إلى ١٦ تبادل حواري غني ومفصّل (كل مداخلة ٢ إلى ٤ جمل)." },
    { id: 4, name: "٤. فخاخ الامتحان والملخّص الذهبي", prompt: "اختموا حلقة البودكاست — هذا الفصل الرابع والأخير (فخاخ الامتحان والملخّص): أشهر الأخطاء والأسئلة التي تأتي في امتحانات التمريض على هذا الدرس، طرق حفظ ذكية وسريعة، ملخّص من ٣ نقاط ذهبية، ووداع لطيف من عثمان وسارة. اكتب ١٢ إلى ١٤ تبادل حواري، ثم في آخر سطرين أضف سؤال اختيار من متعدد بصيغة JSON حرفياً هكذا: QUIZ:{\"q\":\"السؤال\",\"o\":[\"خيار 1\",\"خيار 2\",\"خيار 3\"],\"a\":0,\"x\":\"شرح قصير\"}" }
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() {
    try {
      var o = {};
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      if (o.year && o.month && o.day) return o.year + "-" + o.month + "-" + o.day;
    } catch (e) {}
    return new Date(Date.now() + 2 * 36e5).toISOString().slice(0, 10);
  }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; } return h >>> 0; }
  function subjInfo(s) {
    var S = (w.NLESSONS && w.NLESSONS.subjects) || {};
    var EMO = { cardio: "🫀", neuro: "🧠", henderson: "📋", medsurg: "🏥", rea: "🚑", pharma: "💊", law: "⚖️", mgmt: "🏢", quality: "✅", geri: "👴", comm: "🏘️", prev: "🛡️" };
    return { ar: (S[s] && S[s].ar) || s, e: EMO[s] || (S[s] && S[s].e) || "🎙️" };
  }
  function pickDailyLesson(day) {
    day = day || today();
    var L = (w.NLESSONS && w.NLESSONS.list) || [];
    if (!L.length) return null;
    var pool = L;
    try {
      var fx = w.NursinMid && w.NursinMid.focus ? w.NursinMid.focus(day) : null;
      if (fx && fx.subs && fx.subs.length && fx.subs[0] !== "*") {
        var fp = L.filter(function (l) {
          if (fx.subs.indexOf(l.s) < 0) return false;
          if (fx.lessons && fx.lessons[l.s] && fx.lessons[l.s].indexOf(l.l || l.t) < 0) return false;
          return true;
        });
        if (fp.length) pool = fp;
      }
    } catch (e) {}
    var idx = hash("nursin-pod-" + day) % pool.length;
    return pool[idx];
  }
  function aiStore() {
    var o = lsGet(AIK);
    return o && typeof o === "object" ? o : {};
  }
  function saveAiEp(ep) {
    var st = aiStore();
    st[ep.id] = ep;
    var keys = Object.keys(st).sort(function (a, b) { return (st[b].ts || 0) - (st[a].ts || 0); });
    if (keys.length > 12) keys.slice(12).forEach(function (k) { delete st[k]; });
    lsSet(AIK, st);
  }
  function staticEps() { return Array.isArray(w.NPODCAST) ? w.NPODCAST : []; }
  function allEps() {
    var st = aiStore(), out = [], seen = {};
    Object.keys(st).sort(function (a, b) { return (st[b].ts || 0) - (st[a].ts || 0); }).forEach(function (k) {
      if (st[k] && st[k].id) { out.push(st[k]); seen[st[k].id] = 1; }
    });
    staticEps().forEach(function (e) { if (!seen[e.id]) out.push(e); });
    return out;
  }
  function estMins(lines) {
    var words = 0;
    (lines || []).forEach(function (l) { words += String(l.tx || "").trim().split(/\s+/).filter(Boolean).length; });
    return Math.max(1, Math.round(words / 125));
  }
  function todayEp() {
    var dk = today(), st = aiStore(), id = "ai-" + dk;
    if (st[id]) return st[id];
    var les = pickDailyLesson(dk);
    if (les) {
      var si = subjInfo(les.s);
      return {
        id: id, ai: true, pending: true, day: dk, s: les.s, subj: si.ar, e: si.e,
        title: "بودكاست اليوم: " + les.n,
        lessonName: les.n, lessonT: les.t, lessonL: les.l || "",
        dur: "١٥–٢٠ د", href: les.href, audio: "", lines: [], chaptersDone: 0
      };
    }
    var list = staticEps(); if (!list.length) return null;
    var base = Date.parse("2026-11-19T12:00:00Z"), now = Date.parse(dk + "T12:00:00Z");
    return list[Math.max(0, Math.round((now - base) / 864e5)) % list.length];
  }
  function state() {
    var o = lsGet(PK);
    return o && typeof o === "object" ? o : { done: {}, q: {} };
  }
  function markDone(id) {
    var st = state(); st.done = st.done || {};
    if (!st.done[id]) { st.done[id] = Date.now(); lsSet(PK, st); }
    try { d.dispatchEvent(new CustomEvent("nursin:podcast", { detail: { id: id } })); } catch (e) {}
  }
  function getPos(id) { var o = lsGet(POSK) || {}; return o[id] | 0; }
  function setPos(id, idx) { var o = lsGet(POSK) || {}; o[id] = idx | 0; lsSet(POSK, o); }

  /* ---------------- Home card ---------------- */
  function homeHtml() {
    var ep = todayEp(); if (!ep) return "";
    var dn = !!(state().done || {})[ep.id];
    var dur = ep.lines && ep.lines.length ? "~" + estMins(ep.lines) + " د" : ep.dur;
    return '<a class="podcard" href="podcast.html"><span style="display:flex;align-items:center;gap:10px"><span style="font-size:1.5rem" aria-hidden="true">🎙️</span><span><b>' +
      (dn ? "✅ " : "") + 'بودكاست اليوم · ' + esc(ep.subj) + ' (' + esc(dur) + ')</b><small>' + esc(ep.title.replace(/^بودكاست اليوم:\s*/, "")) + '</small></span></span><span class="btn sm pri">' +
      (dn ? "اسمع تاني" : "▶ اسمع") + "</span></a>";
  }

  /* ---------------- AI Long-Form Podcast Generator (4 Chapters = 15–20 min) ---------------- */
  var genBusy = false, genStatus = "", genErr = "";
  function lessonFacts(ep) {
    var Q = w.QUIZ || [], pts = [];
    for (var i = 0; i < Q.length && pts.length < 14; i++) {
      var q = Q[i];
      if (q.t === ep.lessonT && (!ep.lessonL || q.l === ep.lessonL)) {
        pts.push("- " + q.q + " ← " + (q.o && q.o[q.a] ? q.o[q.a] : "") + (q.x ? " (" + q.x + ")" : ""));
      }
    }
    return pts.length ? "\nنقاط ومعلومات معتمدة من درس الموقع (التزم بها وتوسّع بشرحها بأسلوب حواري):\n" + pts.join("\n") : "";
  }
  function parseDialogue(raw) {
    var lines = [], quiz = null;
    var qm = /QUIZ\s*:\s*(\{[\s\S]*?\})/.exec(raw);
    if (qm) {
      try {
        var parsed = JSON.parse(qm[1]);
        if (parsed && parsed.q && Array.isArray(parsed.o) && parsed.o.length >= 2) quiz = parsed;
      } catch (e) {}
      raw = raw.replace(qm[0], "");
    }
    String(raw || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (row) {
      row = row.replace(/^\s*[-*•\d.)]+\s*/, "").replace(/\*\*/g, "").trim();
      if (!row || row.length < 6) return;
      var m = /^(سارة|الأستاذ\s*عثمان|عثمان)\s*[:：\-—]\s*(.+)$/.exec(row);
      if (m) {
        var sp = /سارة/.test(m[1]) ? "سارة" : "عثمان";
        var tx = m[2].trim();
        if (tx.length > 3) lines.push({ sp: sp, tx: tx });
      } else if (lines.length && !/^QUIZ|^الفصل|^#/.test(row)) {
        lines[lines.length - 1].tx += " " + row;
      }
    });
    return { lines: lines, quiz: quiz };
  }
  function callWorker(prompt, context) {
    var ctl = ("AbortController" in w) ? new w.AbortController() : null;
    var tm = setTimeout(function () { if (ctl) ctl.abort(); }, 55000);
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", text: prompt }], context: context }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(tm);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      var t = j && j.text;
      if (!t || typeof t !== "string" || /^\s*صار في مشكلة/.test(t)) throw new Error("busy");
      return t;
    }, function (e) { clearTimeout(tm); throw e; });
  }
  function generateEpisode(ep) {
    if (genBusy || !ep) return;
    genBusy = true; genErr = "";
    var startCh = ep.chaptersDone | 0;
    if (startCh >= CHAPTERS.length) { genBusy = false; return; }
    var facts = lessonFacts(ep);
    var sysCtx = "أنت كاتب سيناريو لبودكاست تمريضي تعليمي لطلاب التمريض في لبنان (nursin.store). " +
      "الحوار بين شخصيتين فقط: «سارة» (طالبة تمريض ذكية تسأل أسئلة عملية وتلخّص) و«عثمان» (الأستاذ عثمان، ممرض وأستاذ خبير يشرح بأسلوب دافئ وواضح وممتع). " +
      "قاعدة صارمة للتنسيق: اكتب كل مداخلة في سطر يبدأ بـ «سارة: » أو «عثمان: » فقط، بلا عناوين جانبية وبلا نجوم وبلا إيموجي وبلا مؤثرات صوتية بين أقواس.";

    function nextChapter(idx) {
      if (idx >= CHAPTERS.length) {
        ep.pending = false;
        ep.chaptersDone = CHAPTERS.length;
        ep.dur = "~" + estMins(ep.lines) + " د";
        ep.ts = Date.now();
        saveAiEp(ep);
        genBusy = false; genStatus = "";
        render();
        return;
      }
      var ch = CHAPTERS[idx];
      genStatus = "⏳ جاري تحضير " + ch.name + " (" + (idx + 1) + " من " + CHAPTERS.length + ")…";
      render();
      var prevTail = ep.lines.length ? "\nآخر مداخلتين من الفصل السابق للاستمرار بسلاسة:\n" + ep.lines.slice(-2).map(function (l) { return l.sp + ": " + l.tx; }).join("\n") : "";
      var userPrompt = "موضوع حلقة البودكاست: «" + ep.lessonName + "» (مادة: " + ep.subj + ")." + facts + prevTail + "\n\n" + ch.prompt;

      callWorker(userPrompt, sysCtx).then(function (raw) {
        var parsed = parseDialogue(raw);
        if (parsed.lines.length) {
          ep.lines.push({ sp: "عنوان", tx: "📌 " + ch.name, chapter: true });
          parsed.lines.forEach(function (l) { ep.lines.push(l); });
        }
        if (parsed.quiz) ep.quiz = parsed.quiz;
        ep.pending = false;
        ep.chaptersDone = idx + 1;
        ep.dur = "~" + estMins(ep.lines) + " د";
        ep.ts = Date.now();
        saveAiEp(ep);
        render();
        setTimeout(function () { nextChapter(idx + 1); }, 400);
      }, function () {
        genBusy = false; genStatus = "";
        if (!ep.lines.length) genErr = "تعذّر توليد الحلقة هلق (الأستاذ عثمان مشغول شوي أو ما في إنترنت). جرّب الزر تحت أو اسمع حلقات الأرشيف.";
        render();
      });
    }
    nextChapter(startCh);
  }

  /* ---------------- Hybrid Player (MP3 + Chunked Web Speech API) ---------------- */
  var root = null, curEp = null, subFilter = "all";
  var playing = false, mode = "tts", rate = 1, lineIdx = 0, au = null, ttsTimer = 0, arVoice = null, speakToken = 0;

  function pickVoice() {
    if (!w.speechSynthesis || !w.speechSynthesis.getVoices) return null;
    var vs = w.speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) if (/^ar-LB/i.test(vs[i].lang)) return vs[i];
    for (var j = 0; j < vs.length; j++) if (/^ar/i.test(vs[j].lang)) return vs[j];
    return null;
  }
  function chunkText(s, max) {
    max = max || 170;
    var out = [], clean = String(s || "").replace(/[*#`>_~]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) return out;
    clean.replace(/([.!؟?،:\n])\s*/g, "$1\u0001").split("\u0001").forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > max) {
        var cut = p.lastIndexOf(" ", max); if (cut < 40) cut = max;
        out.push(p.slice(0, cut)); p = p.slice(cut).trim();
      }
      if (out.length && out[out.length - 1].length + p.length < max) out[out.length - 1] += " " + p;
      else out.push(p);
    });
    return out;
  }
  function fmtSec(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60); s %= 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function stopAll() {
    playing = false;
    speakToken++;
    clearTimeout(ttsTimer);
    try { if (w.speechSynthesis) w.speechSynthesis.cancel(); } catch (e) {}
    if (au) { try { au.pause(); } catch (e) {} }
  }
  function updateUI() {
    if (!root) return;
    var pb = root.querySelector(".podplay"), bar = root.querySelector(".podbar > i"), tm = root.querySelector(".podtm");
    if (pb) pb.textContent = playing ? "⏸️ إيقاف مؤقت" : "▶️ استماع";
    if (mode === "mp3" && au && au.duration) {
      if (bar) bar.style.width = Math.min(100, (100 * au.currentTime / au.duration)).toFixed(1) + "%";
      if (tm) tm.textContent = fmtSec(au.currentTime) + " / " + fmtSec(au.duration);
    } else if (curEp && curEp.lines && curEp.lines.length) {
      var n = curEp.lines.length;
      if (bar) bar.style.width = Math.min(100, (100 * (lineIdx + (playing ? 1 : 0)) / Math.max(1, n))).toFixed(1) + "%";
      if (tm) tm.textContent = (lineIdx + 1) + " / " + n;
      root.querySelectorAll(".podline").forEach(function (el) {
        el.classList.toggle("on", +el.getAttribute("data-idx") === lineIdx);
      });
    }
  }
  function setupMediaSession(ep) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title,
        artist: "بودكاست التمريض · الأستاذ عثمان وسارة",
        album: ep.subj
      });
      navigator.mediaSession.setActionHandler("play", function () { togglePlay(); });
      navigator.mediaSession.setActionHandler("pause", function () { togglePlay(); });
    } catch (e) {}
  }
  function speakLine(idx) {
    if (!curEp || !curEp.lines || !curEp.lines.length) { playing = false; updateUI(); return; }
    while (idx < curEp.lines.length && curEp.lines[idx].chapter) idx++;
    if (idx >= curEp.lines.length) {
      if (genBusy) {
        ttsTimer = setTimeout(function () { if (playing) speakLine(idx); }, 1200);
        return;
      }
      playing = false;
      markDone(curEp.id);
      setPos(curEp.id, 0);
      updateUI();
      return;
    }
    lineIdx = idx;
    setPos(curEp.id, idx);
    updateUI();
    var lineEl = root && root.querySelector('.podline[data-idx="' + idx + '"]');
    if (lineEl && lineEl.scrollIntoView) try { lineEl.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
    if (!w.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;
    var tok = ++speakToken;
    try { w.speechSynthesis.cancel(); } catch (e) {}
    var L = curEp.lines[idx], parts = chunkText(L.tx, 170), pi = 0;
    if (!parts.length) { ttsTimer = setTimeout(function () { if (playing && tok === speakToken) speakLine(idx + 1); }, 150); return; }
    arVoice = arVoice || pickVoice();
    function sayNext() {
      if (!playing || mode !== "tts" || tok !== speakToken) return;
      if (pi >= parts.length) {
        ttsTimer = setTimeout(function () { if (playing && tok === speakToken) speakLine(idx + 1); }, 260);
        return;
      }
      var u = new SpeechSynthesisUtterance(parts[pi++]);
      if (arVoice) u.voice = arVoice;
      u.lang = (arVoice && arVoice.lang) || "ar-LB";
      u.rate = rate;
      u.pitch = L.sp === "سارة" ? 1.12 : 0.94;
      u.onend = function () { sayNext(); };
      u.onerror = function () { if (tok === speakToken) { playing = false; updateUI(); } };
      w.speechSynthesis.speak(u);
    }
    sayNext();
  }
  function startMP3(ep) {
    if (au) { try { au.pause(); } catch (e) {} }
    au = new Audio(ep.audio);
    au.playbackRate = rate;
    au.addEventListener("timeupdate", updateUI);
    au.addEventListener("ended", function () { playing = false; markDone(ep.id); updateUI(); });
    au.addEventListener("error", function () {
      mode = "tts";
      var md = root && root.querySelector(".podmode");
      if (md) md.textContent = "🗣️ صوت الجهاز التلقائي";
      if (playing) speakLine(lineIdx);
    });
    setupMediaSession(ep);
    au.play().catch(function () {
      mode = "tts";
      if (playing) speakLine(lineIdx);
    });
  }
  function togglePlay() {
    if (!curEp) return;
    if (curEp.ai && (!curEp.lines || !curEp.lines.length)) {
      generateEpisode(curEp);
      return;
    }
    if (playing) {
      stopAll();
      updateUI();
      return;
    }
    playing = true;
    if (mode === "mp3" && curEp.audio) {
      if (!au || au.src.indexOf(curEp.audio) < 0) startMP3(curEp);
      else { au.playbackRate = rate; au.play().catch(function () {}); }
    } else {
      speakLine(lineIdx);
    }
    updateUI();
  }
  function setRate(r) {
    rate = r;
    if (au) au.playbackRate = rate;
    if (playing && mode === "tts") speakLine(lineIdx);
    render();
  }
  function selectEp(id) {
    var list = allEps();
    var td = todayEp();
    if (td && td.id === id) {
      stopAll(); curEp = td; lineIdx = getPos(curEp.id); mode = curEp.audio ? "mp3" : "tts";
      render();
      if (curEp.ai && (curEp.chaptersDone | 0) < CHAPTERS.length && !genBusy) generateEpisode(curEp);
      return;
    }
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      stopAll();
      curEp = list[i];
      lineIdx = getPos(curEp.id);
      mode = curEp.audio ? "mp3" : "tts";
      render();
      try { root.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
      return;
    }
  }
  function createCustomEpisode(lesIdx) {
    var L = (w.NLESSONS && w.NLESSONS.list) || [], les = L[lesIdx];
    if (!les) return;
    stopAll();
    var si = subjInfo(les.s), id = "ai-custom-" + les.s + "-" + (les.l || les.t);
    var st = aiStore();
    if (st[id] && (st[id].chaptersDone | 0) >= CHAPTERS.length) {
      curEp = st[id]; lineIdx = getPos(curEp.id); render(); return;
    }
    curEp = st[id] || {
      id: id, ai: true, pending: true, day: today(), s: les.s, subj: si.ar, e: si.e,
      title: les.n, lessonName: les.n, lessonT: les.t, lessonL: les.l || "",
      dur: "١٥–٢٠ د", href: les.href, audio: "", lines: [], chaptersDone: 0, ts: Date.now()
    };
    lineIdx = 0;
    render();
    generateEpisode(curEp);
  }

  function render() {
    if (!root) return;
    var tdEp = todayEp(), list = allEps();
    if (!curEp) { curEp = tdEp || list[0]; lineIdx = curEp ? getPos(curEp.id) : 0; }
    if (!curEp) { root.innerHTML = '<div class="podhero"><p>ما في حلقات متوفرة حالياً.</p></div>'; return; }
    mode = curEp.audio ? "mp3" : "tts";
    var st = state(), isDone = !!(st.done || {})[curEp.id], qAns = (st.q || {})[curEp.id];
    var isToday = tdEp && tdEp.id === curEp.id;
    var durTxt = curEp.lines && curEp.lines.length ? "~" + estMins(curEp.lines) + " د" : curEp.dur;

    var subMap = {};
    list.forEach(function (x) { subMap[x.subj] = x.e; });
    var filtered = subFilter === "all" ? list : list.filter(function (x) { return x.subj === subFilter; });
    var allLessons = (w.NLESSONS && w.NLESSONS.list) || [];

    var h = '<section class="podhero">' +
      '<div class="podtop">' +
      '<span class="podbadge">' + esc(curEp.e) + " " + (isToday ? "حلقة اليوم · " : "") + esc(curEp.subj) + " · " + esc(durTxt) + (isDone ? " ✅" : "") + '</span>' +
      '<span class="podmode">' + (mode === "mp3" ? "🎧 صوت طبيعي (MP3)" : curEp.ai ? "✨ حلقة يومية تلقائية (١٥–٢٠ د)" : "🗣️ صوت الجهاز + نص متزامن") + '</span></div>' +
      '<h1>' + esc(curEp.title) + '</h1>' +
      '<p class="podsub">حوار معمّق بين الأستاذ عثمان وسارة · <a href="' + esc(curEp.href) + '">اقرا الدرس كامل ←</a></p>';

    if (genStatus) {
      h += '<p class="podgen">' + esc(genStatus) + (curEp.lines.length ? ' — فيك تكبس <b>استماع</b> هلّق والباقي بيكمّل لحاله 🎧' : '') + '</p>';
    }
    if (genErr) {
      h += '<p class="poderr">' + esc(genErr) + ' <button type="button" class="btn sm pri" data-podretry>🔄 جرّب مرّة تانية</button></p>';
    }

    h += '<div class="podctrl">' +
      '<button type="button" class="btn pri podplay" data-podplay' + (curEp.ai && !curEp.lines.length && genBusy ? ' disabled' : '') + '>' + (playing ? "⏸️ إيقاف مؤقت" : "▶️ استماع") + '</button>' +
      '<button type="button" class="btn sm" data-podprev title="السابق">' + (mode === "mp3" ? "⏪ ١٥ث" : "⏮️") + '</button>' +
      '<button type="button" class="btn sm" data-podnext title="التالي">' + (mode === "mp3" ? "١٥ث ⏩" : "⏭️") + '</button>' +
      '<div class="podprog"><div class="podbar" data-podbar><i></i></div><span class="podtm"></span></div>' +
      '<button type="button" class="btn sm" data-podrate>' + rate + 'x</button>' +
      '</div>';

    if (curEp.lines && curEp.lines.length) {
      h += '<div class="podlines">' + curEp.lines.map(function (L, idx) {
        if (L.chapter) return '<div class="podchap">' + esc(L.tx) + '</div>';
        return '<button type="button" class="podline' + (idx === lineIdx ? " on" : "") + '" data-idx="' + idx + '">' +
          '<span class="podsp' + (L.sp === "سارة" ? " sara" : "") + '">' + (L.sp === "سارة" ? "👩‍⚕️ " : "👨‍🏫 ") + esc(L.sp) + '</span>' +
          '<span class="podtx">' + esc(L.tx) + '</span></button>';
      }).join("") + '</div>';
    } else if (!genBusy) {
      h += '<p style="margin-top:12px"><button type="button" class="btn pri" data-podretry>✨ جهّز حلقة اليوم الآن (١٥–٢٠ دقيقة)</button></p>';
    }

    if (curEp.quiz) {
      var q = curEp.quiz;
      h += '<div class="podquiz"><h3>🎯 سؤال سريع لتثبيت الحلقة</h3><p>' + esc(q.q) + '</p><div class="podqopts">' +
        q.o.map(function (opt, k) {
          var cls = "podqopt";
          if (qAns != null) { if (k === q.a) cls += " ok"; else if (k === qAns) cls += " bad"; }
          return '<button type="button" class="' + cls + '" data-podq="' + k + '"' + (qAns != null ? " disabled" : "") + '>' + esc(opt) + '</button>';
        }).join("") + '</div>' +
        (qAns != null ? '<p class="small" style="margin-top:8px"><b>' + (qAns === q.a ? "✅ صح! " : "❌ ") + '</b>' + esc(q.x) + '</p>' : "") +
        '</div>';
    }
    h += '</section>';

    if (allLessons.length) {
      h += '<section class="podmake"><h2>✨ ولّد حلقة بودكاست (١٥–٢٠ د) عن أي درس</h2>' +
        '<div class="podmakerow"><select id="pod-les-sel" aria-label="اختار درس">' +
        allLessons.map(function (l, i) { var si = subjInfo(l.s); return '<option value="' + i + '">' + esc(si.e + " " + si.ar + " — " + l.n) + '</option>'; }).join("") +
        '</select><button type="button" class="btn pri" data-podmake' + (genBusy ? ' disabled' : '') + '>🎙️ ولّد الحلقة</button></div></section>';
    }

    h += '<section class="podarch"><h2>🎧 الأرشيف والحلقات (' + list.length + ')</h2>' +
      '<div class="podchips"><button type="button" class="chip' + (subFilter === "all" ? " on" : "") + '" data-podsub="all">الكل</button>' +
      Object.keys(subMap).map(function (sb) {
        return '<button type="button" class="chip' + (subFilter === sb ? " on" : "") + '" data-podsub="' + esc(sb) + '">' + esc(subMap[sb]) + " " + esc(sb) + "</button>";
      }).join("") + '</div>' +
      '<ul class="podlist">' + filtered.map(function (ep) {
        var dn = !!(st.done || {})[ep.id], cur = ep.id === curEp.id, td = tdEp && tdEp.id === ep.id;
        return '<li><button type="button" class="poditem' + (cur ? " cur" : "") + '" data-podep="' + esc(ep.id) + '">' +
          '<div><small>' + esc(ep.e) + " " + esc(ep.subj) + " · " + esc(ep.dur) + (td ? " · 🌟 اليوم" : "") + (dn ? " · ✅" : "") + '</small><br><b>' + esc(ep.title) + '</b></div>' +
          '<span class="small">' + (ep.audio ? "🎧 MP3" : ep.ai ? "✨ بودكاست طويل" : "🗣️ صوت تلقائي") + '</span></button></li>';
      }).join("") + '</ul></section>';

    root.innerHTML = h;
    updateUI();
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest("[data-podplay]"))) { togglePlay(); return; }
    if ((b = t.closest("[data-podretry]"))) { if (curEp && curEp.ai) generateEpisode(curEp); return; }
    if ((b = t.closest("[data-podmake]"))) {
      var sel = d.getElementById("pod-les-sel");
      if (sel) createCustomEpisode(+sel.value);
      return;
    }
    if ((b = t.closest("[data-podrate]"))) { var rs = [1, 1.25, 1.5], ni = (rs.indexOf(rate) + 1) % rs.length; setRate(rs[ni]); return; }
    if ((b = t.closest("[data-podprev]"))) {
      if (mode === "mp3" && au) au.currentTime = Math.max(0, au.currentTime - 15);
      else { lineIdx = Math.max(0, lineIdx - 1); if (playing) speakLine(lineIdx); else updateUI(); }
      return;
    }
    if ((b = t.closest("[data-podnext]"))) {
      if (mode === "mp3" && au && au.duration) au.currentTime = Math.min(au.duration, au.currentTime + 15);
      else if (curEp && curEp.lines) { lineIdx = Math.min(curEp.lines.length - 1, lineIdx + 1); if (playing) speakLine(lineIdx); else updateUI(); }
      return;
    }
    if ((b = t.closest("[data-idx]"))) {
      var idx = +b.getAttribute("data-idx");
      if (mode === "tts") { lineIdx = idx; playing = true; speakLine(idx); }
      return;
    }
    if ((b = t.closest("[data-podq]"))) {
      if (!curEp || !curEp.quiz) return;
      var k = +b.getAttribute("data-podq"), st = state();
      st.q = st.q || {}; st.q[curEp.id] = k; lsSet(PK, st);
      markDone(curEp.id);
      render();
      return;
    }
    if ((b = t.closest("[data-podsub]"))) { subFilter = b.getAttribute("data-podsub"); render(); return; }
    if ((b = t.closest("[data-podep]"))) { selectEp(b.getAttribute("data-podep")); return; }
  }

  function init() {
    root = d.getElementById("pod-app"); if (!root) return;
    if (w.speechSynthesis && w.speechSynthesis.onvoiceschanged !== undefined) {
      w.speechSynthesis.onvoiceschanged = function () { arVoice = pickVoice(); };
    }
    arVoice = pickVoice();
    render();
    root.addEventListener("click", onClick);
    w.addEventListener("pagehide", stopAll);
    if (curEp && curEp.ai && (curEp.chaptersDone | 0) < CHAPTERS.length && !(w.navigator && w.navigator.onLine === false)) {
      generateEpisode(curEp);
    }
  }

  w.NursinPodcast = { todayEp: todayEp, homeHtml: homeHtml, state: state, pickDailyLesson: pickDailyLesson };
  if (d && d.addEventListener) {
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
