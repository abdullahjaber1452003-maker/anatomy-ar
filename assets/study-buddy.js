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
    '👏 برافو يا أبطال!'
  ];

  var INSTITUTE = 'معهد الزهراء';
  var FOCUS_MS = 25 * 60 * 1000;
  var GROUP_ACTIVE_MS = 25 * 60 * 1000;
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
    tab: 'group', // 'group' | 'duo'
    subj: SUBJECTS[0],
    online: [],
    groupPeers: [],
    openRooms: [],
    // Group study hall state
    inGroup: false,
    groupStart: 0,
    groupDone: false,
    groupPaid: false,
    // 1-on-1 duo state
    duoMode: 'idle', // 'idle' | 'waiting' | 'live' | 'done'
    roomId: null,
    room: null,
    unsubRoom: null,
    unsubOpen: null,
    tickTimer: null,
    hbTimer: null,
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

  function minsAgo(ts) {
    if (!ts) return 'الآن';
    var m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (m < 1) return 'الآن';
    if (m === 1) return 'من دقيقة';
    if (m === 2) return 'من دقيقتين';
    return 'من ' + m + ' د';
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

  function fetchOnlineAndGroup() {
    if (!state.fb || !state.user) return;
    var fs = state.fb.fs;
    var now = Date.now();

    // 1. Online presence
    var pq = fs.query(
      fs.collection(state.fb.db, 'presence'),
      fs.where('t', '>', new Date(now - ONLINE_MS)),
      fs.limit(60)
    );
    fs.getDocs(pq).then(function (snap) {
      var list = [], seen = {};
      snap.forEach(function (d) {
        var data = d.data() || {}, t = tsMs(data.t);
        if (t && now - t <= ONLINE_MS && !seen[d.id]) {
          seen[d.id] = 1;
          list.push({ uid: d.id, name: data.n || 'طالب تمريض', photo: data.ph || '' });
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

    // 2. Active Group Study Hall students (users with sbMode == 'group' & fresh sbAt)
    var gq = fs.query(
      fs.collection(state.fb.db, 'users'),
      fs.where('sbMode', '==', 'group'),
      fs.limit(40)
    );
    fs.getDocs(gq).then(function (snap) {
      var glist = [];
      var latestNudge = null;
      snap.forEach(function (d) {
        var data = d.data() || {};
        if (!data.sbAt || now - data.sbAt > GROUP_ACTIVE_MS) return;
        glist.push({
          uid: d.id,
          name: data.name || 'طالب تمريض',
          photo: data.photo || '',
          subj: data.sbSubj || 'مراجعة شاملة',
          start: data.sbStart || data.sbAt,
          at: data.sbAt
        });
        if (data.sbNudge && data.sbNudge.t && d.id !== state.user.uid && data.sbNudge.t > state.lastNudgeTs) {
          if (!latestNudge || data.sbNudge.t > latestNudge.t) {
            latestNudge = { t: data.sbNudge.t, msg: data.sbNudge.msg, by: data.name || 'زميلك' };
          }
        }
      });
      if (latestNudge) {
        state.lastNudgeTs = latestNudge.t;
        state.nudgeText = latestNudge.by + ': ' + (NUDGES[latestNudge.msg] || NUDGES[0]);
      }
      glist.sort(function (a, b) { return b.at - a.at; });
      state.groupPeers = glist;
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
      var list = [], now = Date.now();
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

  function updateGroupPresence(modeStr, extra) {
    if (!state.fb || !state.user) return Promise.resolve();
    var fs = state.fb.fs;
    var payload = {
      sbMode: modeStr,
      sbSubj: state.subj,
      sbAt: Date.now()
    };
    if (modeStr === 'group' && state.groupStart) payload.sbStart = state.groupStart;
    if (extra && extra.sbNudge) payload.sbNudge = extra.sbNudge;
    return fs.setDoc(fs.doc(state.fb.db, 'users', state.user.uid), payload, { merge: true }).catch(function () {});
  }

  function joinGroupHall() {
    if (!state.fb || !state.user) {
      if (state.fb && state.fb.signIn) state.fb.signIn();
      return;
    }
    state.statusMsg = '';
    state.inGroup = true;
    state.groupDone = false;
    state.groupPaid = false;
    state.groupStart = Date.now();
    updateGroupPresence('group').then(fetchOnlineAndGroup);
    startTick();
    if (!state.hbTimer) {
      state.hbTimer = setInterval(function () {
        if (state.inGroup) updateGroupPresence('group');
      }, 60 * 1000);
    }
    render();
  }

  function leaveGroupHall() {
    state.inGroup = false;
    state.groupDone = false;
    state.groupStart = 0;
    state.nudgeText = '';
    if (state.hbTimer) { clearInterval(state.hbTimer); state.hbTimer = null; }
    updateGroupPresence('').then(fetchOnlineAndGroup);
    render();
  }

  function sendGroupNudge(idx) {
    if (!state.inGroup) return;
    updateGroupPresence('group', { sbNudge: { t: Date.now(), msg: idx } });
    state.nudgeText = 'بعتت للقاعة: ' + NUDGES[idx];
    render();
  }

  function buildCampusSvg() {
    var peers = state.groupPeers.length ? state.groupPeers : (state.online.length ? state.online : [{ uid: 'me', name: 'أنت' }]);
    var cx = 170, cy = 104;
    var nodes = '';
    var maxShow = Math.min(peers.length, 12);

    for (var i = 0; i < maxShow; i++) {
      var p = peers[i];
      var isMe = state.user && p.uid === state.user.uid;
      var angle = (i / Math.max(1, maxShow)) * Math.PI * 2 - Math.PI / 2;
      var rad = i === 0 && isMe ? 0 : (i % 2 === 0 ? 56 : 86);
      var px = Math.round(cx + Math.cos(angle) * rad);
      var py = Math.round(cy + Math.sin(angle) * rad * 0.7);
      if (isMe && maxShow > 1) { px = cx; py = cy; }

      if (!isMe) {
        nodes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + px + '" y2="' + py + '" stroke="rgba(52,211,153,.35)" stroke-width="1.3" stroke-dasharray="3 3"/>';
      }
      nodes += '<circle cx="' + px + '" cy="' + py + '" r="' + (isMe ? 9 : 7.5) + '" fill="' + (isMe ? '#f59e0b' : '#10b981') + '" stroke="#ffffff" stroke-width="2"/>';
      var label = String(p.name || '').split(/\s+/)[0].slice(0, 12);
      nodes += '<text x="' + px + '" y="' + (py + 19) + '" text-anchor="middle" fill="#f1f5f9" font-size="10" font-weight="700" font-family="system-ui,sans-serif">' + esc(label) + '</text>';
    }

    var radar = '';
    if (state.inGroup || state.duoMode === 'waiting') {
      radar =
        '<g class="sb-radar" style="transform-origin:' + cx + 'px ' + cy + 'px">' +
          '<path d="M' + cx + ',' + cy + ' L' + (cx + 95) + ',' + (cy - 30) + ' A100,100 0 0,1 ' + (cx + 75) + ',' + (cy + 65) + ' Z" fill="rgba(56,189,248,.22)"/>' +
        '</g>';
    }

    return (
      '<svg viewBox="0 0 340 208" role="img" aria-label="قاعة معهد الزهراء الحية">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="none" stroke="rgba(56,189,248,.24)" stroke-width="1"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="86" fill="none" stroke="rgba(56,189,248,.16)" stroke-width="1"/>' +
        radar +
        nodes +
      '</svg>'
    );
  }

  /* -------- 1-on-1 Duo Rooms -------- */
  function startDuoRoom() {
    if (!state.fb || !state.user) {
      if (state.fb && state.fb.signIn) state.fb.signIn();
      return;
    }
    if (state.inGroup) leaveGroupHall();
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
    state.tab = 'duo';
    state.duoMode = 'waiting';
    render();

    fs.addDoc(fs.collection(state.fb.db, 'rooms'), payload).then(function (docRef) {
      state.roomId = docRef.id;
      listenRoom(docRef.id);
    }).catch(function () {
      state.duoMode = 'idle';
      state.statusMsg = 'تعذّر فتح الغرفة الثنائية هلق. جرّب مرة تانية.';
      render();
    });
  }

  function joinRoomById(rid) {
    if (!state.fb || !state.user || !rid) return;
    if (state.inGroup) leaveGroupHall();
    state.tab = 'duo';
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', rid);
    var myName = shortName((state.profile && state.profile.name) || state.user.displayName);

    state.statusMsg = '';
    fs.getDoc(ref).then(function (snap) {
      if (!snap.exists()) {
        state.duoMode = 'idle';
        state.statusMsg = 'هالغرفة تسكّرت. فيك تفوت على قاعة معهد الزهراء الجماعية أو تفتح غرفة جديدة.';
        render();
        return;
      }
      var r = snap.data() || {};
      if (r.host === state.user.uid) { state.roomId = rid; listenRoom(rid); return; }
      if (r.guest && r.guest !== state.user.uid) {
        state.duoMode = 'idle';
        state.statusMsg = 'هالغرفة الثنائية ممتلئة. فوت على القاعة الجماعية لتدرس مع الكل!';
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
      state.duoMode = 'idle';
      state.statusMsg = 'ما قدرنا نضمك للغرفة الثنائية.';
      render();
    });
  }

  function listenRoom(rid) {
    if (state.unsubRoom) { state.unsubRoom(); state.unsubRoom = null; }
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', rid);
    state.unsubRoom = fs.onSnapshot(ref, function (snap) {
      if (!snap.exists()) { cleanupDuo('تم إغلاق الغرفة الثنائية.'); return; }
      var r = snap.data() || {};
      state.room = r;
      var isHost = r.host === state.user.uid;
      if (r.left && r.left !== state.user.uid) { cleanupDuo('شريكك أنهى الجلسة وطلع من الغرفة.'); return; }
      if (isHost && r.state === 'waiting' && r.guest) {
        fs.updateDoc(ref, { state: 'live', startedAt: Date.now() }).catch(function () {});
      }
      if (r.state === 'live' && r.guest) { state.duoMode = 'live'; startTick(); }
      else if (r.state === 'waiting') { state.duoMode = 'waiting'; }

      var partnerAns = isHost ? r.guestAns : r.hostAns;
      if (partnerAns && partnerAns.t && partnerAns.t > state.lastNudgeTs) {
        state.lastNudgeTs = partnerAns.t;
        state.nudgeText = 'شريكك: ' + (NUDGES[partnerAns.msg] || NUDGES[0]);
      }
      render();
    });
  }

  function sendDuoNudge(idx) {
    if (!state.fb || !state.user || !state.roomId || !state.room) return;
    var fs = state.fb.fs;
    var isHost = state.room.host === state.user.uid;
    var obj = {};
    obj[isHost ? 'hostAns' : 'guestAns'] = { t: Date.now(), msg: idx };
    fs.updateDoc(fs.doc(state.fb.db, 'rooms', state.roomId), obj).catch(function () {});
    state.nudgeText = 'بعتت لشريكك: ' + NUDGES[idx];
    render();
  }

  function leaveDuoRoom() {
    if (!state.fb || !state.user || !state.roomId) { cleanupDuo(''); return; }
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', state.roomId);
    var isHost = state.room && state.room.host === state.user.uid;
    if (isHost && state.room && state.room.state === 'waiting') fs.deleteDoc(ref).catch(function () {});
    else fs.updateDoc(ref, { left: state.user.uid, endedAt: Date.now() }).catch(function () {});
    cleanupDuo('');
  }

  function cleanupDuo(msg) {
    if (state.unsubRoom) { state.unsubRoom(); state.unsubRoom = null; }
    state.roomId = null;
    state.room = null;
    state.duoMode = 'idle';
    state.nudgeText = '';
    if (msg) state.statusMsg = msg;
    render();
  }

  function startTick() {
    if (state.tickTimer) return;
    state.tickTimer = setInterval(function () {
      var timerEl = document.getElementById('sb-timer-val');
      if (state.inGroup && !state.groupDone && state.groupStart) {
        var remG = FOCUS_MS - (Date.now() - state.groupStart);
        if (timerEl) timerEl.textContent = fmtTime(remG);
        if (remG <= 0) {
          state.groupDone = true;
          if (!state.groupPaid && state.fb && state.user) {
            state.groupPaid = true;
            var fs = state.fb.fs;
            fs.setDoc(fs.doc(state.fb.db, 'users', state.user.uid), { points: fs.increment(15) }, { merge: true }).catch(function () {});
          }
          render();
        }
      } else if (state.duoMode === 'live' && state.room && state.room.startedAt) {
        var remD = FOCUS_MS - (Date.now() - state.room.startedAt);
        if (timerEl) timerEl.textContent = fmtTime(remD);
        if (remD <= 0) finishDuoSession();
      }
    }, 1000);
  }

  function finishDuoSession() {
    if (state.duoMode === 'done') return;
    state.duoMode = 'done';
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

  function copyInviteLink() {
    if (!state.roomId) return;
    var url = location.origin + location.pathname + '?room=' + encodeURIComponent(state.roomId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        state.copyMsg = '✅ تم نسخ رابط الغرفة الثنائية! ابعته لزميلك ليفوت معك مباشرة.';
        render();
      }).catch(function () { state.copyMsg = 'انسخ هالرابط: ' + url; render(); });
    } else { state.copyMsg = 'انسخ هالرابط: ' + url; render(); }
  }

  function subjChipsHtml() {
    var h = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">';
    for (var s = 0; s < SUBJECTS.length; s++) {
      var on = SUBJECTS[s] === state.subj;
      h += '<button type="button" class="btn sb-subj-btn" data-subj="' + esc(SUBJECTS[s]) + '" style="padding:6px 11px;font-size:13px;' + (on ? 'background:#0f766e;color:#fff;border-color:#0f766e' : '') + '">' + esc(SUBJECTS[s]) + '</button>';
    }
    return h + '</div>';
  }

  function render() {
    var groupCount = state.groupPeers.length;
    var onlineCount = state.online.length || (state.user ? 1 : 0);

    var html = '';
    html += '<div class="sb-map">';
    html += '<div class="sb-map-top">';
    html += '<span class="sb-live-pill"><span class="sb-live-dot"></span>' + (groupCount ? groupCount + ' عم يدرسوا بالقاعة هلق' : onlineCount + ' فاتحين الموقع هلق') + '</span>';
    html += '<span>🏫 <b>' + INSTITUTE + '</b> · لايف</span>';
    html += '</div>';
    html += buildCampusSvg();
    html += '</div>';

    if (state.statusMsg) html += '<div class="sb-banner">' + esc(state.statusMsg) + '</div>';

    if (state.authReady && !state.user) {
      html += '<div class="sb-card" style="text-align:center">';
      html += '<h2 style="margin:0 0 8px;font-size:18px">🔑 سجّل دخولك لتفوت على قاعة ' + INSTITUTE + '</h2>';
      html += '<p style="margin:0 0 14px;font-size:13.5px;opacity:.85">التسجيل بحساب Google بيدخّلك تدرس جماعياً مع طلاب المعهد الحقيقيين أو بغرفة ثنائية.</p>';
      html += '<button type="button" id="sb-login-btn" class="btn pri">تسجيل الدخول بحساب Google</button>';
      html += '</div>';
      appEl.innerHTML = html;
      var lb = document.getElementById('sb-login-btn');
      if (lb && state.fb) lb.addEventListener('click', function () { state.fb.signIn(); });
      return;
    }

    // 2-Tab switcher: Group Hall (Default) vs 1-on-1 Duo Room
    html += '<div style="display:flex;gap:6px;margin-bottom:12px">';
    html += '<button type="button" class="btn sb-tab-btn" data-tab="group" style="flex:1;' + (state.tab === 'group' ? 'background:#0f766e;color:#fff;border-color:#0f766e' : '') + '">🏫 قاعة المعهد (جماعي · ' + groupCount + ')</button>';
    html += '<button type="button" class="btn sb-tab-btn" data-tab="duo" style="flex:1;' + (state.tab === 'duo' ? 'background:#0f766e;color:#fff;border-color:#0f766e' : '') + '">🤝 ثنائي (٢ لحالكم · ' + state.openRooms.length + ')</button>';
    html += '</div>';

    if (state.tab === 'group') {
      if (state.inGroup) {
        var remG = state.groupDone ? 0 : Math.max(0, FOCUS_MS - (Date.now() - state.groupStart));
        html += '<div class="sb-card">';
        if (state.groupDone) {
          html += '<div class="sb-banner"><b>🎉 بطل! خلّصت جلسة ٢٥ دقيقة بقاعة ' + INSTITUTE + ' — انضاف +١٥ نقطة لحسابك!</b></div>';
        } else {
          html += '<div class="sb-banner"><b>🏫 أنت جوّا قاعة ' + INSTITUTE + ' الجماعية · 📚 ' + esc(state.subj) + '</b></div>';
        }
        html += '<div class="sb-timer" id="sb-timer-val">' + fmtTime(remG) + '</div>';
        if (state.nudgeText) html += '<div class="sb-nudge-toast">' + esc(state.nudgeText) + '</div>';
        if (!state.groupDone) {
          html += '<div class="sb-nudge-row">';
          for (var gn = 0; gn < NUDGES.length; gn++) {
            html += '<button type="button" class="btn sb-gnudge-btn" data-idx="' + gn + '">' + esc(NUDGES[gn]) + '</button>';
          }
          html += '</div>';
        }
        html += '<div style="text-align:center;margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
        if (state.groupDone) html += '<button type="button" id="sb-gagain-btn" class="btn pri">🔄 جولة ٢٥ دقيقة تانية</button>';
        html += '<button type="button" id="sb-gleave-btn" class="btn">خروج من القاعة</button>';
        html += '</div>';
        html += '</div>';
      } else {
        html += '<div class="sb-card">';
        html += '<h2 style="margin:0 0 6px;font-size:17.5px">🏫 قاعة ' + INSTITUTE + ' الجماعية</h2>';
        html += '<p style="margin:0 0 10px;font-size:13.5px;opacity:.82">ادرسوا كلّكم سوا بنفس القاعة بدون حد لعدد الطلاب — أول ما تفوت بيوصل إشعار لرفقاتك الفاتحين الموقع ليتحمّسوا ويفوتوا معك (+١٥ نقطة لكل ٢٥ دقيقة)!</p>';
        html += subjChipsHtml();
        html += '<button type="button" id="sb-gjoin-btn" class="btn pri" style="width:100%;padding:12px;font-size:15px">' + (state.user ? '🔔 فوت عالقاعة وبلّش «' + esc(state.subj) + '» (أرسل إشعار للكل)' : '⏳ عم نربط حسابك…') + '</button>';
        html += '</div>';
      }

      // Live list of everyone studying in Group Hall right now
      html += '<div class="sb-card">';
      html += '<b style="display:block;margin-bottom:6px;font-size:14.5px">🔥 طلاب عم يدرسوا بالقاعة هلق (' + groupCount + ')</b>';
      if (!groupCount) {
        html += '<p style="margin:4px 0 0;font-size:13px;opacity:.78">كون أوّل واحد يفوت عالقاعة وبيوصل إشعار فوري لباقي الطلاب!</p>';
      } else {
        for (var i = 0; i < state.groupPeers.length; i++) {
          var gp = state.groupPeers[i];
          var isMe = state.user && gp.uid === state.user.uid;
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(127,127,127,.16);font-size:13.5px">';
          html += '<span>🟢 <b>' + esc(gp.name) + '</b>' + (isMe ? ' <small style="opacity:.7">(أنت)</small>' : '') + '<div style="font-size:12px;opacity:.78">📚 ' + esc(gp.subj) + ' · ' + minsAgo(gp.start) + '</div></span>';
          html += '<span style="font-size:11.5px;padding:3px 9px;border-radius:999px;background:rgba(16,185,129,.14);color:#10b981;font-weight:700">عم يدرس</span>';
          html += '</div>';
        }
      }
      html += '</div>';
    } else {
      // DUO 1-on-1 TAB
      if (state.duoMode === 'idle') {
        if (state.openRooms.length) {
          html += '<div class="sb-card" style="border-color:rgba(16,185,129,.45);background:rgba(16,185,129,.06)">';
          html += '<h2 style="margin:0 0 8px;font-size:16px">🤝 غرف ثنائية مفتوحة هلق — فوت بكبسة</h2>';
          for (var r = 0; r < state.openRooms.length; r++) {
            var rm = state.openRooms[r];
            html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(127,127,127,.16);flex-wrap:wrap">';
            html += '<div><b>🟢 ' + esc(rm.hostName) + '</b><div style="font-size:12px;opacity:.82">📚 ' + esc(rm.topic) + ' · ' + INSTITUTE + '</div></div>';
            html += '<button type="button" class="btn pri sb-join-btn" data-rid="' + esc(rm.id) + '">🤝 فوت ذاكر معه</button>';
            html += '</div>';
          }
          html += '</div>';
        }
        html += '<div class="sb-card">';
        html += '<h2 style="margin:0 0 6px;font-size:17px">🤝 غرفة ثنائية (٢ لحالكم)</h2>';
        html += '<p style="margin:0 0 10px;font-size:13.5px;opacity:.82">إذا بدك تذاكر مع زميل واحد بس لحالكم — افتح غرفة وابعتله الرابط أو خلي طالب من الموقع يفوت معك.</p>';
        html += subjChipsHtml();
        html += '<button type="button" id="sb-duo-start" class="btn pri" style="width:100%;padding:12px;font-size:15px">🤝 افتح غرفة ثنائية لـ «' + esc(state.subj) + '»</button>';
        html += '</div>';
      } else if (state.duoMode === 'waiting') {
        html += '<div class="sb-card" style="text-align:center">';
        html += '<h2 style="margin:0 0 6px;font-size:17.5px">📡 الغرفة الثنائية مفتوحة ووصل إشعار للطلاب!</h2>';
        html += '<p style="margin:0 0 10px;font-size:13.5px;opacity:.85">ناطرين زميلك يفوت — أو انسخ الرابط وابعته لزميلك مباشرة.</p>';
        if (state.copyMsg) html += '<div class="sb-nudge-toast">' + esc(state.copyMsg) + '</div>';
        html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">';
        html += '<button type="button" id="sb-copy-btn" class="btn pri">📋 نسخ رابط الدعوة</button>';
        html += '<button type="button" id="sb-cancel-btn" class="btn">إلغاء الغرفة</button>';
        html += '</div></div>';
      } else {
        var myName = shortName((state.profile && state.profile.name) || (state.user && state.user.displayName));
        var pName = (state.room && (state.room.host === state.user.uid ? state.room.guestName : state.room.hostName)) || 'شريكك';
        var topic = (state.room && state.room.topic) || state.subj;
        var remD = (state.room && state.room.startedAt) ? (FOCUS_MS - (Date.now() - state.room.startedAt)) : FOCUS_MS;
        html += '<div class="sb-card">';
        html += state.duoMode === 'done'
          ? '<div class="sb-banner"><b>🎉 بطل! خلّصتوا جلسة ٢٥ دقيقة سوا — انضاف +١٥ نقطة!</b></div>'
          : '<div class="sb-banner"><b>🤝 جلسة ثنائية · 📚 ' + esc(topic) + '</b></div>';
        html += '<div class="sb-timer" id="sb-timer-val">' + fmtTime(remD) + '</div>';
        html += '<div class="sb-pair">';
        html += '<div class="sb-who"><span>🟡 أنت</span><b>' + esc(myName) + '</b><small>🏫 ' + INSTITUTE + '</small></div>';
        html += '<div class="sb-who"><span>🟢 شريكك</span><b>' + esc(pName) + '</b><small>🏫 ' + INSTITUTE + '</small></div>';
        html += '</div>';
        if (state.nudgeText) html += '<div class="sb-nudge-toast">' + esc(state.nudgeText) + '</div>';
        if (state.duoMode === 'live') {
          html += '<div class="sb-nudge-row">';
          for (var dn = 0; dn < NUDGES.length; dn++) {
            html += '<button type="button" class="btn sb-dnudge-btn" data-idx="' + dn + '">' + esc(NUDGES[dn]) + '</button>';
          }
          html += '</div>';
        }
        html += '<div style="text-align:center;margin-top:12px"><button type="button" id="sb-leave-btn" class="btn">' + (state.duoMode === 'done' ? '🔄 جلسة جديدة' : 'إنهاء الجلسة') + '</button></div>';
        html += '</div>';
      }
    }

    appEl.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    var tbtns = appEl.querySelectorAll('.sb-tab-btn');
    for (var t = 0; t < tbtns.length; t++) {
      tbtns[t].addEventListener('click', function () {
        state.tab = this.getAttribute('data-tab') || 'group';
        render();
      });
    }
    var sbtns = appEl.querySelectorAll('.sb-subj-btn');
    for (var i = 0; i < sbtns.length; i++) {
      sbtns[i].addEventListener('click', function () {
        state.subj = this.getAttribute('data-subj') || SUBJECTS[0];
        saveSubj();
        render();
      });
    }
    var gJoin = document.getElementById('sb-gjoin-btn');
    if (gJoin) gJoin.addEventListener('click', joinGroupHall);
    var gAgain = document.getElementById('sb-gagain-btn');
    if (gAgain) gAgain.addEventListener('click', joinGroupHall);
    var gLeave = document.getElementById('sb-gleave-btn');
    if (gLeave) gLeave.addEventListener('click', leaveGroupHall);
    var gnBtns = appEl.querySelectorAll('.sb-gnudge-btn');
    for (var g = 0; g < gnBtns.length; g++) {
      gnBtns[g].addEventListener('click', function () { sendGroupNudge(parseInt(this.getAttribute('data-idx'), 10) || 0); });
    }

    var jbtns = appEl.querySelectorAll('.sb-join-btn');
    for (var j = 0; j < jbtns.length; j++) {
      jbtns[j].addEventListener('click', function () {
        var rid = this.getAttribute('data-rid');
        if (rid) joinRoomById(rid);
      });
    }
    var duoStart = document.getElementById('sb-duo-start');
    if (duoStart) duoStart.addEventListener('click', startDuoRoom);
    var copyBtn = document.getElementById('sb-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyInviteLink);
    var cancelBtn = document.getElementById('sb-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', leaveDuoRoom);
    var leaveBtn = document.getElementById('sb-leave-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', leaveDuoRoom);
    var dnBtns = appEl.querySelectorAll('.sb-dnudge-btn');
    for (var d = 0; d < dnBtns.length; d++) {
      dnBtns[d].addEventListener('click', function () { sendDuoNudge(parseInt(this.getAttribute('data-idx'), 10) || 0); });
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
    if (!state.user) { syncedUid = ''; render(); return true; }

    if (syncedUid !== state.user.uid) {
      syncedUid = state.user.uid;
      fetchOnlineAndGroup();
      watchOpenRooms();
      if (!state.peerTimer) state.peerTimer = setInterval(fetchOnlineAndGroup, 20 * 1000);
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
  document.addEventListener('nursin:me', function () { if (window.NursinFB && window.NursinFB.user) syncFB(); });

  var tries = 0;
  var poll = setInterval(function () {
    tries++;
    if (window.NursinFB && window.NursinFB.db && (window.NursinFB.user || tries > 10)) {
      syncFB();
      if (window.NursinFB.user || tries > 35) clearInterval(poll);
    } else if (tries > 50) clearInterval(poll);
  }, 150);
})();
