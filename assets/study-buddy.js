(function () {
  'use strict';

  var SUBJECTS = [
    'أعصاب',
    'قلب وأوعية',
    'أدوية',
    'إنعاش',
    'جراحة',
    'تشريح',
    'مراجعة شاملة'
  ];

  var NUDGES = [
    '💪 يلا نركّز!',
    '🔥 ماشيين ممتاز!',
    '📖 كمّل بدون موبايل!',
    '👏 برافو عليك!'
  ];

  var INSTITUTE = 'معهد الزهراء';
  var FOCUS_MS = 25 * 60 * 1000;
  var ONLINE_MS = 3 * 60 * 1000;
  var ROOM_STALE_MS = 15 * 60 * 1000;
  var PREF_KEY = 'nursin_sb_subj_v2';

  var appEl = document.getElementById('sb-app');
  if (!appEl) return;

  var state = {
    fb: null,
    authReady: false,
    user: null,
    profile: null,
    subj: SUBJECTS[0],
    online: [],
    openRooms: [],
    mode: 'idle',
    roomId: null,
    room: null,
    unsubRoom: null,
    unsubOpen: null,
    tickTimer: null,
    peerTimer: null,
    lastNudgeTs: 0,
    nudgeText: '',
    copyMsg: '',
    statusMsg: ''
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadSubj() {
    try {
      var s = localStorage.getItem(PREF_KEY);
      if (s && SUBJECTS.indexOf(s) > -1) state.subj = s;
    } catch (e) {}
  }

  function saveSubj() {
    try { localStorage.setItem(PREF_KEY, state.subj); } catch (e) {}
  }

  function shortName(raw) {
    var n = String(raw || 'طالب تمريض').trim();
    if (n.length > 35) n = n.slice(0, 35);
    return n || 'طالب تمريض';
  }

  function fmtTime(ms) {
    var sec = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function tsMs(t) {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (t.seconds != null) return t.seconds * 1000;
    return +t || 0;
  }

  function getUrlRoom() {
    try {
      var sp = new URLSearchParams(location.search);
      return sp.get('room') || '';
    } catch (e) {
      return '';
    }
  }

  function fetchOnline() {
    if (!state.fb || !state.user) return;
    var fs = state.fb.fs;
    var now = Date.now();
    var q = fs.query(
      fs.collection(state.fb.db, 'presence'),
      fs.where('t', '>', new Date(now - ONLINE_MS)),
      fs.limit(60)
    );
    fs.getDocs(q).then(function (snap) {
      var list = [];
      var seen = {};
      snap.forEach(function (d) {
        var data = d.data() || {};
        var t = tsMs(data.t);
        if (t && now - t <= ONLINE_MS && !seen[d.id]) {
          seen[d.id] = 1;
          list.push({
            uid: d.id,
            name: data.n || 'طالب تمريض',
            photo: data.ph || ''
          });
        }
      });
      if (!seen[state.user.uid]) {
        list.unshift({
          uid: state.user.uid,
          name: shortName((state.profile && state.profile.name) || state.user.displayName),
          photo: (state.profile && state.profile.photo) || state.user.photoURL || ''
        });
      }
      state.online = list;
      render();
    }).catch(function () {});
  }

  function watchOpenRooms() {
    if (!state.fb || !state.user || state.unsubOpen) return;
    var fs = state.fb.fs;
    var q = fs.query(
      fs.collection(state.fb.db, 'rooms'),
      fs.where('state', '==', 'waiting'),
      fs.where('guest', '==', null),
      fs.where('invited', '==', null),
      fs.limit(20)
    );
    state.unsubOpen = fs.onSnapshot(q, function (snap) {
      var list = [];
      var now = Date.now();
      snap.forEach(function (d) {
        var r = d.data() || {};
        if (!Array.isArray(r.qids) || r.qids[0] !== 'sb_25') return;
        if (r.hostSeen && now - r.hostSeen > ROOM_STALE_MS) return;
        if (r.host === state.user.uid) return;
        list.push({
          id: d.id,
          hostName: r.hostName || 'طالب تمريض',
          topic: r.topic || 'مراجعة عامة',
          at: r.hostSeen || r.qAt || now
        });
      });
      list.sort(function (a, b) { return b.at - a.at; });
      state.openRooms = list;
      render();
    }, function () {});
  }

  function buildCampusSvg() {
    var peers = state.online.length ? state.online : [{ uid: 'me', name: 'أنت' }];
    var cx = 170, cy = 110;
    var nodes = '';
    var maxShow = Math.min(peers.length, 12);

    for (var i = 0; i < maxShow; i++) {
      var p = peers[i];
      var isMe = state.user && p.uid === state.user.uid;
      var angle = (i / Math.max(1, maxShow)) * Math.PI * 2 - Math.PI / 2;
      var rad = i === 0 && isMe ? 0 : (i % 2 === 0 ? 58 : 88);
      var px = Math.round(cx + Math.cos(angle) * rad);
      var py = Math.round(cy + Math.sin(angle) * rad * 0.72);
      if (isMe && maxShow > 1) { px = cx; py = cy; }

      if (!isMe) {
        nodes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + px + '" y2="' + py + '" stroke="rgba(56,189,248,.28)" stroke-width="1.2" stroke-dasharray="3 3"/>';
      }
      nodes += '<circle cx="' + px + '" cy="' + py + '" r="' + (isMe ? 9 : 7) + '" fill="' + (isMe ? '#f59e0b' : '#34d399') + '" stroke="#ffffff" stroke-width="2"/>';
      var label = String(p.name || '').split(/\s+/)[0].slice(0, 12);
      nodes += '<text x="' + px + '" y="' + (py + 19) + '" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui,sans-serif">' + esc(label) + '</text>';
    }

    var radar = '';
    if (state.mode === 'waiting') {
      radar =
        '<g class="sb-radar" style="transform-origin:' + cx + 'px ' + cy + 'px">' +
          '<path d="M' + cx + ',' + cy + ' L' + (cx + 95) + ',' + (cy - 30) + ' A100,100 0 0,1 ' + (cx + 75) + ',' + (cy + 65) + ' Z" fill="rgba(56,189,248,.22)"/>' +
        '</g>';
    }

    return (
      '<svg viewBox="0 0 340 220" role="img" aria-label="طلاب معهد الزهراء الفاتحين الموقع">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="46" fill="none" stroke="rgba(56,189,248,.24)" stroke-width="1"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="88" fill="none" stroke="rgba(56,189,248,.16)" stroke-width="1"/>' +
        radar +
        nodes +
      '</svg>'
    );
  }

  function startStudyAndNotify() {
    if (!state.fb || !state.user) {
      if (state.fb && state.fb.signIn) state.fb.signIn();
      return;
    }
    state.statusMsg = '';
    state.copyMsg = '';
    var fs = state.fb.fs;
    var myName = shortName((state.profile && state.profile.name) || state.user.displayName);
    var payload = {
      host: state.user.uid,
      hostName: myName,
      hostPhoto: (state.profile && state.profile.photo) || state.user.photoURL || '',
      hostReady: true,
      hostSeen: Date.now(),
      hostAns: null,
      hostScore: 0,
      hostPaid: false,
      guest: null,
      guestName: '',
      guestPhoto: '',
      guestReady: false,
      guestSeen: 0,
      guestAns: null,
      guestScore: 0,
      guestPaid: false,
      invited: null,
      topic: state.subj,
      state: 'waiting',
      qids: ['sb_25'],
      idx: 0,
      qAt: Date.now(),
      startedAt: 0,
      winner: null,
      left: null,
      endedAt: 0
    };

    state.mode = 'waiting';
    render();

    fs.addDoc(fs.collection(state.fb.db, 'rooms'), payload).then(function (docRef) {
      state.roomId = docRef.id;
      listenRoom(docRef.id);
    }).catch(function () {
      state.mode = 'idle';
      state.statusMsg = 'تعذّر فتح غرفة الدراسة هلق. جرّب مرة تانية.';
      render();
    });
  }

  function joinRoomById(rid) {
    if (!state.fb || !state.user || !rid) return;
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', rid);
    var myName = shortName((state.profile && state.profile.name) || state.user.displayName);

    state.statusMsg = '';
    fs.getDoc(ref).then(function (snap) {
      if (!snap.exists()) {
        state.mode = 'idle';
        state.statusMsg = 'هالغرفة تسكّرت. فيك تفتح غرفة جديدة وبيوصل إشعار للطلاب فوراً.';
        render();
        return;
      }
      var r = snap.data() || {};
      if (r.host === state.user.uid) {
        state.roomId = rid;
        listenRoom(rid);
        return;
      }
      if (r.guest && r.guest !== state.user.uid) {
        state.mode = 'idle';
        state.statusMsg = 'هالغرفة صار فيها طالبين عم يدرسوا سوا. افتح غرفة جديدة!';
        render();
        return;
      }
      return fs.updateDoc(ref, {
        guest: state.user.uid,
        guestName: myName,
        guestPhoto: (state.profile && state.profile.photo) || state.user.photoURL || '',
        guestReady: true,
        guestSeen: Date.now()
      }).then(function () {
        state.roomId = rid;
        listenRoom(rid);
      });
    }).catch(function () {
      state.mode = 'idle';
      state.statusMsg = 'ما قدرنا نضمك للغرفة، جرّب تفتح غرفة جديدة.';
      render();
    });
  }

  function listenRoom(rid) {
    if (state.unsubRoom) {
      state.unsubRoom();
      state.unsubRoom = null;
    }
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', rid);

    state.unsubRoom = fs.onSnapshot(ref, function (snap) {
      if (!snap.exists()) {
        cleanupRoom('تم إغلاق غرفة الدراسة.');
        return;
      }
      var r = snap.data() || {};
      state.room = r;

      var isHost = r.host === state.user.uid;
      if (r.left && r.left !== state.user.uid) {
        cleanupRoom('شريكك أنهى الجلسة وطلع من الغرفة.');
        return;
      }

      if (isHost && r.state === 'waiting' && r.guest) {
        fs.updateDoc(ref, {
          state: 'live',
          startedAt: Date.now()
        }).catch(function () {});
      }

      if (r.state === 'live' && r.guest) {
        state.mode = 'live';
        startTick();
      } else if (r.state === 'waiting') {
        state.mode = 'waiting';
      }

      var partnerAns = isHost ? r.guestAns : r.hostAns;
      if (partnerAns && partnerAns.t && partnerAns.t > state.lastNudgeTs) {
        state.lastNudgeTs = partnerAns.t;
        var msg = NUDGES[partnerAns.msg] || NUDGES[0];
        state.nudgeText = 'رسالة من شريكك: ' + msg;
      }

      render();
    });
  }

  function startTick() {
    if (state.tickTimer) return;
    state.tickTimer = setInterval(function () {
      if (state.mode !== 'live' || !state.room || !state.room.startedAt) return;
      var rem = FOCUS_MS - (Date.now() - state.room.startedAt);
      var timerEl = document.getElementById('sb-timer-val');
      if (timerEl) timerEl.textContent = fmtTime(rem);
      if (rem <= 0) finishSession();
    }, 1000);
  }

  function finishSession() {
    if (state.mode === 'done') return;
    state.mode = 'done';
    if (state.tickTimer) { clearInterval(state.tickTimer); state.tickTimer = null; }
    if (state.fb && state.user && state.roomId && state.room) {
      var fs = state.fb.fs;
      var isHost = state.room.host === state.user.uid;
      var paid = isHost ? state.room.hostPaid : state.room.guestPaid;
      if (!paid) {
        var upd = isHost ? { hostPaid: true, state: 'done', endedAt: Date.now() } : { guestPaid: true };
        fs.updateDoc(fs.doc(state.fb.db, 'rooms', state.roomId), upd).catch(function () {});
        fs.setDoc(fs.doc(state.fb.db, 'users', state.user.uid), { points: fs.increment(15) }, { merge: true }).catch(function () {});
      }
    }
    render();
  }

  function sendNudge(idx) {
    if (!state.fb || !state.user || !state.roomId || !state.room) return;
    var fs = state.fb.fs;
    var isHost = state.room.host === state.user.uid;
    var field = isHost ? 'hostAns' : 'guestAns';
    var obj = {};
    obj[field] = { t: Date.now(), msg: idx };
    fs.updateDoc(fs.doc(state.fb.db, 'rooms', state.roomId), obj).catch(function () {});
    state.nudgeText = 'بعتت لشريكك: ' + NUDGES[idx];
    render();
  }

  function leaveRoom() {
    if (!state.fb || !state.user || !state.roomId) {
      cleanupRoom('');
      return;
    }
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', state.roomId);
    var isHost = state.room && state.room.host === state.user.uid;
    if (isHost && state.room && state.room.state === 'waiting') {
      fs.deleteDoc(ref).catch(function () {});
    } else {
      fs.updateDoc(ref, { left: state.user.uid, endedAt: Date.now() }).catch(function () {});
    }
    cleanupRoom('');
  }

  function cleanupRoom(msg) {
    if (state.unsubRoom) { state.unsubRoom(); state.unsubRoom = null; }
    if (state.tickTimer) { clearInterval(state.tickTimer); state.tickTimer = null; }
    state.roomId = null;
    state.room = null;
    state.mode = 'idle';
    state.nudgeText = '';
    if (msg) state.statusMsg = msg;
    render();
  }

  function copyInviteLink() {
    if (!state.roomId) return;
    var url = location.origin + location.pathname + '?room=' + encodeURIComponent(state.roomId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        state.copyMsg = '✅ تم نسخ الرابط! ابعته بقروب معهد الزهراء ليفوتوا معك فوراً.';
        render();
      }).catch(function () {
        state.copyMsg = 'انسخ هالرابط وابعته لزميلك: ' + url;
        render();
      });
    } else {
      state.copyMsg = 'انسخ هالرابط وابعته لزميلك: ' + url;
      render();
    }
  }

  function render() {
    var onlineCount = state.online.length || (state.user ? 1 : 0);

    var html = '';
    html += '<div class="sb-map">';
    html += '<div class="sb-map-top">';
    html += '<span class="sb-live-pill"><span class="sb-live-dot"></span>' + onlineCount + ' طالب فاتح الموقع هلق</span>';
    html += '<span>🏫 <b>' + INSTITUTE + '</b> · طلاب حقيقيين</span>';
    html += '</div>';
    html += buildCampusSvg();
    html += '</div>';

    if (state.statusMsg) {
      html += '<div class="sb-banner">' + esc(state.statusMsg) + '</div>';
    }

    if (state.authReady && !state.user) {
      html += '<div class="sb-card" style="text-align:center">';
      html += '<h2 style="margin:0 0 8px;font-size:18px">🔑 سجّل دخولك لتشوف طلاب ' + INSTITUTE + '</h2>';
      html += '<p style="margin:0 0 14px;font-size:13.5px;opacity:.85">بس تسجّل دخول بحساب Google، بيبين عندك مين فاتح الموقع هلق وبيوصلك إشعار أول ما حدا يبلّش دراسة.</p>';
      html += '<button type="button" id="sb-login-btn" class="btn pri">تسجيل الدخول بحساب Google</button>';
      html += '</div>';
      appEl.innerHTML = html;
      var lb = document.getElementById('sb-login-btn');
      if (lb && state.fb) lb.addEventListener('click', function () { state.fb.signIn(); });
      return;
    }

    if (state.mode === 'idle') {
      // 1. Active open study rooms right now — 1 tap to join!
      if (state.openRooms.length) {
        html += '<div class="sb-card" style="border-color:rgba(16,185,129,.45);background:rgba(16,185,129,.06)">';
        html += '<h2 style="margin:0 0 8px;font-size:16.5px">🔥 طلاب عم يدرسوا هلق — فوت ذاكر معهم فوراً</h2>';
        for (var r = 0; r < state.openRooms.length; r++) {
          var rm = state.openRooms[r];
          html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(127,127,127,.16);flex-wrap:wrap">';
          html += '<div><b>🟢 ' + esc(rm.hostName) + '</b><div style="font-size:12.5px;opacity:.82">📚 عم يدرس: ' + esc(rm.topic) + ' · ' + INSTITUTE + '</div></div>';
          html += '<button type="button" class="btn pri sb-join-btn" data-rid="' + esc(rm.id) + '">🤝 فوت ذاكر معه</button>';
          html += '</div>';
        }
        html += '</div>';
      }

      // 2. One-tap start studying & notify everyone on site
      html += '<div class="sb-card">';
      html += '<h2 style="margin:0 0 6px;font-size:17.5px">🔔 بلّش دراسة وأرسل إشعار لطلاب ' + INSTITUTE + '</h2>';
      html += '<p style="margin:0 0 10px;font-size:13.5px;opacity:.82">بكبسّة وحدة بيوصل إشعار لكل طالب فاتح الموقع هلق إنك عم تدرس — أي حدا حابب يذاكر معك بيفوت دغري!</p>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
      for (var s = 0; s < SUBJECTS.length; s++) {
        var on = SUBJECTS[s] === state.subj;
        html += '<button type="button" class="btn sb-subj-btn" data-subj="' + esc(SUBJECTS[s]) + '" style="padding:6px 11px;font-size:13px;' + (on ? 'background:#0f766e;color:#fff;border-color:#0f766e' : '') + '">' + esc(SUBJECTS[s]) + '</button>';
      }
      html += '</div>';
      html += '<button type="button" id="sb-start-btn" class="btn pri" style="width:100%;padding:12px;font-size:15px">' + (state.user ? '🔔 أنا عم بدرس «' + esc(state.subj) + '» — أرسل إشعار للطلاب' : '⏳ عم نربط حسابك…') + '</button>';
      html += '</div>';

      // 3. Who is currently online on nursin.store
      html += '<div class="sb-card">';
      html += '<b style="display:block;margin-bottom:6px;font-size:14.5px">🟢 مين فاتح الموقع هلق؟ (' + onlineCount + ')</b>';
      if (state.online.length <= 1) {
        html += '<p style="margin:4px 0 0;font-size:13px;opacity:.78">أنت فاتح الموقع هلق. أول ما يفوت أي طالب تاني من ' + INSTITUTE + ' بيبين هون فوراً.</p>';
      } else {
        for (var k = 0; k < state.online.length; k++) {
          var pr = state.online[k];
          var isMe = state.user && pr.uid === state.user.uid;
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-top:1px solid rgba(127,127,127,.16);font-size:13.5px">';
          html += '<span>🟢 <b>' + esc(pr.name) + '</b>' + (isMe ? ' <small style="opacity:.7">(أنت)</small>' : '') + '</span>';
          html += '<small style="opacity:.75">🏫 ' + INSTITUTE + '</small>';
          html += '</div>';
        }
      }
      html += '</div>';
    } else if (state.mode === 'waiting') {
      html += '<div class="sb-card" style="text-align:center">';
      html += '<h2 style="margin:0 0 6px;font-size:18px">🔔 تم إرسال الإشعار لطلاب الموقع!</h2>';
      html += '<p style="margin:0 0 10px;font-size:13.5px;opacity:.85">كل طالب فاتح nursin.store هلق عم يشوف إنك عم تدرس <b>«' + esc(state.subj) + '»</b> — أول ما حدا يكبس «فوت ذاكر معه» بتبلّش الجلسة (٢٥ دقيقة) فوراً.</p>';
      if (state.copyMsg) html += '<div class="sb-nudge-toast">' + esc(state.copyMsg) + '</div>';
      html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">';
      html += '<button type="button" id="sb-copy-btn" class="btn pri">📋 نسخ رابط الدعوة لقروب المعهد</button>';
      html += '<button type="button" id="sb-cancel-btn" class="btn">إلغاء الغرفة</button>';
      html += '</div>';
      html += '</div>';
    } else if (state.mode === 'live' || state.mode === 'done') {
      var myName = shortName((state.profile && state.profile.name) || (state.user && state.user.displayName));
      var pName = (state.room && (state.room.host === state.user.uid ? state.room.guestName : state.room.hostName)) || 'زميلك بالمعهد';
      var topic = (state.room && state.room.topic) || state.subj;
      var rem = (state.room && state.room.startedAt) ? (FOCUS_MS - (Date.now() - state.room.startedAt)) : FOCUS_MS;

      html += '<div class="sb-card">';
      if (state.mode === 'done') {
        html += '<div class="sb-banner"><b>🎉 بطل! خلّصتوا جلسة التركيز (٢٥ دقيقة) سوا — انضاف +١٥ نقطة لحسابك!</b></div>';
      } else {
        html += '<div class="sb-banner"><b>🤝 عم تذاكروا سوا هلق · 📚 ' + esc(topic) + '</b></div>';
      }
      html += '<div class="sb-timer" id="sb-timer-val">' + fmtTime(rem) + '</div>';
      html += '<div class="sb-pair">';
      html += '<div class="sb-who"><span>🟡 أنت</span><b>' + esc(myName) + '</b><small>🏫 ' + INSTITUTE + '</small></div>';
      html += '<div class="sb-who"><span>🟢 شريكك</span><b>' + esc(pName) + '</b><small>🏫 ' + INSTITUTE + '</small></div>';
      html += '</div>';
      if (state.nudgeText) html += '<div class="sb-nudge-toast">' + esc(state.nudgeText) + '</div>';
      if (state.mode === 'live') {
        html += '<div class="sb-nudge-row">';
        for (var n = 0; n < NUDGES.length; n++) {
          html += '<button type="button" class="btn sb-nudge-btn" data-idx="' + n + '">' + esc(NUDGES[n]) + '</button>';
        }
        html += '</div>';
      }
      html += '<div style="text-align:center;margin-top:12px">';
      html += '<button type="button" id="sb-leave-btn" class="btn">' + (state.mode === 'done' ? '🔄 جلسة جديدة' : 'إنهاء الجلسة') + '</button>';
      html += '</div>';
      html += '</div>';
    }

    appEl.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    var sbtns = appEl.querySelectorAll('.sb-subj-btn');
    for (var i = 0; i < sbtns.length; i++) {
      sbtns[i].addEventListener('click', function () {
        state.subj = this.getAttribute('data-subj') || SUBJECTS[0];
        saveSubj();
        render();
      });
    }
    var jbtns = appEl.querySelectorAll('.sb-join-btn');
    for (var j = 0; j < jbtns.length; j++) {
      jbtns[j].addEventListener('click', function () {
        var rid = this.getAttribute('data-rid');
        if (rid) joinRoomById(rid);
      });
    }
    var startBtn = document.getElementById('sb-start-btn');
    if (startBtn) startBtn.addEventListener('click', startStudyAndNotify);
    var copyBtn = document.getElementById('sb-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyInviteLink);
    var cancelBtn = document.getElementById('sb-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', leaveRoom);
    var leaveBtn = document.getElementById('sb-leave-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', leaveRoom);
    var nudges = appEl.querySelectorAll('.sb-nudge-btn');
    for (var n = 0; n < nudges.length; n++) {
      nudges[n].addEventListener('click', function () {
        sendNudge(parseInt(this.getAttribute('data-idx'), 10) || 0);
      });
    }
  }

  var syncedUid = '';
  function syncFB() {
    var fb = window.NursinFB;
    if (!fb || !fb.db) return false;
    state.fb = fb;
    state.authReady = true;
    state.user = fb.user || null;
    state.profile = fb.profile || {};

    if (!state.user) {
      syncedUid = '';
      render();
      return true;
    }

    if (syncedUid !== state.user.uid) {
      syncedUid = state.user.uid;
      fetchOnline();
      watchOpenRooms();
      if (!state.peerTimer) state.peerTimer = setInterval(fetchOnline, 25 * 1000);
      var urlRoom = getUrlRoom();
      if (urlRoom && !state.roomId) {
        joinRoomById(urlRoom);
        return true;
      }
    }
    render();
    return true;
  }

  loadSubj();
  render();

  document.addEventListener('nursin:auth', syncFB);
  document.addEventListener('nursin:me', function () {
    if (window.NursinFB && window.NursinFB.user) syncFB();
  });

  var tries = 0;
  var poll = setInterval(function () {
    tries++;
    if (window.NursinFB && window.NursinFB.db && (window.NursinFB.user || tries > 10)) {
      syncFB();
      if (window.NursinFB.user || tries > 35) clearInterval(poll);
    } else if (tries > 50) {
      clearInterval(poll);
    }
  }, 150);
})();
