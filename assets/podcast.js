/* 🎙️ «بودكاست التمريض» — مشغّل هجين مجاني ١٠٠٪:
   1. إذا الحلقة إلها ملف MP3 جاهز (ep.audio)، بيشغّله عبر <audio> مع تحكم بالسرعة، تقديم/ترجيع ١٥ث، وشاشة القفل.
   2. إذا ما إلها MP3 (أو فشل تحميله)، بيشغّلها فوراً بصوت الجهاز (Web Speech API) بالتناوب بين عثمان وسارة مع تظليل النص. */
(function (w, d) {
  "use strict";
  var PK = "nursin_pod_v1";
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
  function eps() { return Array.isArray(w.NPODCAST) ? w.NPODCAST : []; }
  function todayEp() {
    var list = eps(); if (!list.length) return null;
    var base = Date.parse("2026-11-19T12:00:00Z"), now = Date.parse(today() + "T12:00:00Z");
    var idx = Math.max(0, Math.round((now - base) / 864e5)) % list.length;
    return list[idx];
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

  /* ---------------- Home card (replaces dsCard under chips, right above the hospital/path) ---------------- */
  function homeHtml() {
    var ep = todayEp(); if (!ep) return "";
    var dn = !!(state().done || {})[ep.id];
    return '<a class="podcard" href="podcast.html"><span style="display:flex;align-items:center;gap:10px"><span style="font-size:1.5rem" aria-hidden="true">🎙️</span><span><b>' +
      (dn ? "✅ " : "") + 'بودكاست اليوم · ' + esc(ep.subj) + ' (' + esc(ep.dur) + ')</b><small>' + esc(ep.title) + '</small></span></span><span class="btn sm pri">' +
      (dn ? "اسمع تاني" : "▶ اسمع") + "</span></a>";
  }

  /* ---------------- Hybrid Player (MP3 + Web Speech fallback) ---------------- */
  var root = null, curEp = null, subFilter = "all";
  var playing = false, mode = "tts", rate = 1, lineIdx = 0, au = null, ttsTimer = 0, arVoice = null;

  function pickVoice() {
    if (!w.speechSynthesis || !w.speechSynthesis.getVoices) return null;
    var vs = w.speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) if (/^ar-LB/i.test(vs[i].lang)) return vs[i];
    for (var j = 0; j < vs.length; j++) if (/^ar/i.test(vs[j].lang)) return vs[j];
    return null;
  }
  function fmtSec(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60); s %= 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function stopAll() {
    playing = false;
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
    } else if (curEp && curEp.lines) {
      var n = curEp.lines.length;
      if (bar) bar.style.width = Math.min(100, (100 * (lineIdx + (playing ? 1 : 0)) / Math.max(1, n))).toFixed(1) + "%";
      if (tm) tm.textContent = (lineIdx + 1) + " / " + n;
      root.querySelectorAll(".podline").forEach(function (el, idx) {
        el.classList.toggle("on", idx === lineIdx);
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
    if (!curEp || !curEp.lines || idx >= curEp.lines.length) {
      playing = false;
      if (curEp) markDone(curEp.id);
      updateUI();
      return;
    }
    lineIdx = idx;
    updateUI();
    var lineEl = root && root.querySelector('.podline[data-idx="' + idx + '"]');
    if (lineEl && lineEl.scrollIntoView) try { lineEl.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
    if (!w.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;
    try { w.speechSynthesis.cancel(); } catch (e) {}
    var L = curEp.lines[idx], u = new SpeechSynthesisUtterance(L.tx);
    arVoice = arVoice || pickVoice();
    if (arVoice) u.voice = arVoice;
    u.lang = (arVoice && arVoice.lang) || "ar-LB";
    u.rate = rate;
    u.pitch = L.sp === "سارة" ? 1.12 : 0.94;
    u.onend = function () {
      if (!playing || mode !== "tts") return;
      ttsTimer = setTimeout(function () { speakLine(idx + 1); }, 250);
    };
    u.onerror = function () { playing = false; updateUI(); };
    w.speechSynthesis.speak(u);
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
    var list = eps();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      stopAll();
      curEp = list[i];
      lineIdx = 0;
      mode = curEp.audio ? "mp3" : "tts";
      render();
      try { root.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
      return;
    }
  }
  function render() {
    if (!root) return;
    var list = eps(), tdEp = todayEp();
    if (!curEp) curEp = tdEp || list[0];
    if (!curEp) { root.innerHTML = '<div class="podhero"><p>ما في حلقات متوفرة حالياً.</p></div>'; return; }
    mode = curEp.audio ? "mp3" : "tts";
    var st = state(), isDone = !!(st.done || {})[curEp.id], qAns = (st.q || {})[curEp.id];
    var isToday = tdEp && tdEp.id === curEp.id;

    var subMap = {};
    list.forEach(function (x) { subMap[x.subj] = x.e; });
    var filtered = subFilter === "all" ? list : list.filter(function (x) { return x.subj === subFilter; });

    var h = '<section class="podhero">' +
      '<div class="podtop">' +
      '<span class="podbadge">' + esc(curEp.e) + " " + (isToday ? "حلقة اليوم · " : "") + esc(curEp.subj) + " · " + esc(curEp.dur) + (isDone ? " ✅" : "") + '</span>' +
      '<span class="podmode">' + (mode === "mp3" ? "🎧 صوت طبيعي (MP3)" : "🗣️ صوت الجهاز + نص متزامن") + '</span></div>' +
      '<h1>' + esc(curEp.title) + '</h1>' +
      '<p class="podsub">حوار سريع بين الأستاذ عثمان وسارة · <a href="' + esc(curEp.href) + '">اقرا الدرس كامل ←</a></p>' +
      '<div class="podctrl">' +
      '<button type="button" class="btn pri podplay" data-podplay>' + (playing ? "⏸️ إيقاف مؤقت" : "▶️ استماع") + '</button>' +
      '<button type="button" class="btn sm" data-podprev title="السابق">' + (mode === "mp3" ? "⏪ ١٥ث" : "⏮️") + '</button>' +
      '<button type="button" class="btn sm" data-podnext title="التالي">' + (mode === "mp3" ? "١٥ث ⏩" : "⏭️") + '</button>' +
      '<div class="podprog"><div class="podbar" data-podbar><i></i></div><span class="podtm"></span></div>' +
      '<button type="button" class="btn sm" data-podrate>' + rate + 'x</button>' +
      '</div>' +
      '<div class="podlines">' + curEp.lines.map(function (L, idx) {
        return '<button type="button" class="podline' + (idx === lineIdx ? " on" : "") + '" data-idx="' + idx + '">' +
          '<span class="podsp' + (L.sp === "سارة" ? " sara" : "") + '">' + (L.sp === "سارة" ? "👩‍⚕️ " : "👨‍🏫 ") + esc(L.sp) + '</span>' +
          '<span class="podtx">' + esc(L.tx) + '</span></button>';
      }).join("") + '</div>';

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

    h += '<section class="podarch"><h2>🎧 كل الحلقات (' + list.length + ')</h2>' +
      '<div class="podchips"><button type="button" class="chip' + (subFilter === "all" ? " on" : "") + '" data-podsub="all">الكل</button>' +
      Object.keys(subMap).map(function (sb) {
        return '<button type="button" class="chip' + (subFilter === sb ? " on" : "") + '" data-podsub="' + esc(sb) + '">' + esc(subMap[sb]) + " " + esc(sb) + "</button>";
      }).join("") + '</div>' +
      '<ul class="podlist">' + filtered.map(function (ep) {
        var dn = !!(st.done || {})[ep.id], cur = ep.id === curEp.id, td = tdEp && tdEp.id === ep.id;
        return '<li><button type="button" class="poditem' + (cur ? " cur" : "") + '" data-podep="' + esc(ep.id) + '">' +
          '<div><small>' + esc(ep.e) + " " + esc(ep.subj) + " · " + esc(ep.dur) + (td ? " · 🌟 اليوم" : "") + (dn ? " · ✅" : "") + '</small><br><b>' + esc(ep.title) + '</b></div>' +
          '<span class="small">' + (ep.audio ? "🎧 MP3" : "🗣️ صوت تلقائي") + '</span></button></li>';
      }).join("") + '</ul></section>';

    root.innerHTML = h;
    updateUI();
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest("[data-podplay]"))) { togglePlay(); return; }
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
  }

  w.NursinPodcast = { todayEp: todayEp, homeHtml: homeHtml, state: state };
  if (d && d.addEventListener) {
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : this, typeof document !== "undefined" ? document : null);
