(function () {
  'use strict';

  var CITIES = [
    { id: 'nabatieh', name: 'النبطية', x: 162, y: 262, inst: 'معهد النبطية الفني' },
    { id: 'beirut',   name: 'بيروت',   x: 152, y: 174, inst: 'معهد بئر حسن الفني' },
    { id: 'tripoli',  name: 'طرابلس',  x: 184, y: 78,  inst: 'معهد طرابلس الفني' },
    { id: 'saida',    name: 'صيدا',    x: 146, y: 234, inst: 'معهد صيدا الفني' },
    { id: 'tyre',     name: 'صور',     x: 132, y: 292, inst: 'معهد صور الفني' },
    { id: 'zahle',    name: 'زحلة',    x: 208, y: 176, inst: 'معهد زحلة الفني' },
    { id: 'baalbek',  name: 'بعلبك',   x: 254, y: 112, inst: 'معهد بعلبك الفني' },
    { id: 'mount',    name: 'جبل لبنان', x: 176, y: 152, inst: 'معهد الدكوانة الفني' },
    { id: 'akkar',    name: 'عكار',    x: 214, y: 46,  inst: 'معهد حلبا الفني' },
    { id: 'abroad',   name: 'خارج لبنان', x: 56, y: 86, inst: 'جامعة / معهد بالخارج' }
  ];

  var SUBJECTS = [
    'أعصاب (Neurologie)',
    'قلب وأوعية (Cardiologie)',
    'أدوية (Pharmacologie)',
    'إنعاش (Réanimation)',
    'تنفس (Pneumologie)',
    'جراحة (Chirurgie)',
    'تشريح وفيزيولوجيا',
    'مراجعة شاملة للامتحان'
  ];

  var NUDGES = [
    '💪 يلا نركّز!',
    '🔥 ماشيين ممتاز!',
    '📖 كمّل بدون موبايل!',
    '👏 برافو عليك!'
  ];

  var FOCUS_MS = 25 * 60 * 1000;
  var ACTIVE_WINDOW_MS = 12 * 60 * 1000;
  var PREF_KEY = 'nursin_sb_pref_v1';

  var appEl = document.getElementById('sb-app');
  if (!appEl) return;

  var state = {
    fb: null,
    authReady: false,
    user: null,
    profile: null,
    city: 'nabatieh',
    inst: 'معهد النبطية الفني',
    subj: SUBJECTS[0],
    peers: [],
    mode: 'idle',
    roomId: null,
    room: null,
    partner: null,
    unsubRoom: null,
    tickTimer: null,
    hbTimer: null,
    peerTimer: null,
    lastNudgeTs: 0,
    nudgeText: '',
    copyMsg: '',
    statusMsg: ''
  };

  function cityById(id) {
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].id === id) return CITIES[i];
    }
    return CITIES[0];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.city) state.city = p.city;
        if (p && p.inst) state.inst = p.inst;
        if (p && p.subj) state.subj = p.subj;
      }
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        city: state.city,
        inst: state.inst,
        subj: state.subj
      }));
    } catch (e) {}
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

  function getUrlRoom() {
    try {
      var sp = new URLSearchParams(location.search);
      return sp.get('room') || '';
    } catch (e) {
      return '';
    }
  }

  function updatePresence() {
    if (!state.fb || !state.user) return Promise.resolve();
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'users', state.user.uid);
    return fs.setDoc(ref, {
      sbCity: state.city,
      sbInst: state.inst.slice(0, 60),
      sbSubj: state.subj.slice(0, 50),
      sbAt: Date.now()
    }, { merge: true }).catch(function () {});
  }

  function fetchPeers() {
    if (!state.fb || !state.user) return Promise.resolve();
    var fs = state.fb.fs;
    var cutoff = Date.now() - ACTIVE_WINDOW_MS;
    var q = fs.query(
      fs.collection(state.fb.db, 'users'),
      fs.where('sbAt', '>', cutoff),
      fs.limit(40)
    );
    return fs.getDocs(q).then(function (snap) {
      var list = [];
      snap.forEach(function (d) {
        var data = d.data() || {};
        list.push({
          uid: d.id,
          name: data.name || 'طالب تمريض',
          city: data.sbCity || 'beirut',
          inst: data.sbInst || '',
          subj: data.sbSubj || '',
          at: data.sbAt || 0
        });
      });
      state.peers = list;
      render();
    }).catch(function () {
      var q2 = fs.query(fs.collection(state.fb.db, 'users'), fs.limit(40));
      return fs.getDocs(q2).then(function (snap) {
        var list = [];
        snap.forEach(function (d) {
          var data = d.data() || {};
          if (data.sbAt && data.sbAt > cutoff) {
            list.push({
              uid: d.id,
              name: data.name || 'طالب تمريض',
              city: data.sbCity || 'beirut',
              inst: data.sbInst || '',
              subj: data.sbSubj || '',
              at: data.sbAt || 0
            });
          }
        });
        state.peers = list;
        render();
      }).catch(function () {});
    });
  }

  function loadPartnerInfo(uid) {
    if (!uid || !state.fb) return;
    if (state.partner && state.partner.uid === uid) return;
    for (var i = 0; i < state.peers.length; i++) {
      if (state.peers[i].uid === uid) {
        state.partner = state.peers[i];
        render();
        return;
      }
    }
    var fs = state.fb.fs;
    fs.getDoc(fs.doc(state.fb.db, 'users', uid)).then(function (d) {
      if (d.exists()) {
        var data = d.data() || {};
        state.partner = {
          uid: uid,
          name: data.name || 'طالب تمريض',
          city: data.sbCity || 'beirut',
          inst: data.sbInst || '',
          subj: data.sbSubj || ''
        };
        render();
      }
    }).catch(function () {});
  }

  function buildMapSvg() {
    var me = cityById(state.city);
    var partnerCity = state.partner ? cityById(state.partner.city) : null;
    var dots = '';
    var seenCities = {};

    for (var i = 0; i < state.peers.length; i++) {
      var p = state.peers[i];
      if (state.user && p.uid === state.user.uid) continue;
      var c = cityById(p.city);
      var off = (seenCities[c.id] || 0) * 6;
      seenCities[c.id] = (seenCities[c.id] || 0) + 1;
      dots += '<circle cx="' + (c.x + off) + '" cy="' + (c.y - off) + '" r="4.5" fill="#38bdf8" stroke="#082032" stroke-width="1.5"/>';
    }

    var labels = '';
    for (var j = 0; j < CITIES.length; j++) {
      var ct = CITIES[j];
      labels += '<circle cx="' + ct.x + '" cy="' + ct.y + '" r="2.2" fill="rgba(226,232,240,.5)"/>';
      labels += '<text x="' + (ct.x + 6) + '" y="' + (ct.y + 3) + '" fill="rgba(226,232,240,.85)" font-size="9.5" font-family="system-ui,sans-serif">' + esc(ct.name) + '</text>';
    }

    var radar = '';
    if (state.mode === 'searching') {
      radar =
        '<g class="sb-radar" style="transform-origin:' + me.x + 'px ' + me.y + 'px">' +
          '<path d="M' + me.x + ',' + me.y + ' L' + (me.x + 85) + ',' + (me.y - 30) + ' A90,90 0 0,1 ' + (me.x + 65) + ',' + (me.y + 62) + ' Z" fill="rgba(56,189,248,.22)"/>' +
        '</g>' +
        '<circle cx="' + me.x + '" cy="' + me.y + '" r="42" fill="none" stroke="rgba(56,189,248,.4)" stroke-width="1"/>' +
        '<circle cx="' + me.x + '" cy="' + me.y + '" r="82" fill="none" stroke="rgba(56,189,248,.22)" stroke-width="1"/>';
    }

    var arc = '';
    if (partnerCity && (state.mode === 'live' || state.mode === 'done')) {
      var mx = Math.round((me.x + partnerCity.x) / 2) - 24;
      var my = Math.round((me.y + partnerCity.y) / 2) - 28;
      arc =
        '<path class="sb-arc" d="M' + me.x + ',' + me.y + ' Q' + mx + ',' + my + ' ' + partnerCity.x + ',' + partnerCity.y + '" fill="none" stroke="#34d399" stroke-width="2.6"/>' +
        '<circle cx="' + partnerCity.x + '" cy="' + partnerCity.y + '" r="7" fill="#34d399" stroke="#ffffff" stroke-width="2"/>';
    }

    var lebanonPath = 'M212,26 L236,38 L266,76 L278,118 L244,158 L218,198 L194,254 L168,296 L124,308 L130,276 L142,238 L146,196 L146,166 L162,132 L172,96 L184,60 Z';

    return (
      '<svg viewBox="0 0 340 330" role="img" aria-label="خريطة طلاب التمريض في لبنان">' +
        '<rect x="0" y="0" width="340" height="330" fill="none"/>' +
        '<path d="' + lebanonPath + '" fill="rgba(14,165,233,.18)" stroke="rgba(56,189,248,.65)" stroke-width="2" stroke-linejoin="round"/>' +
        '<rect x="14" y="66" width="84" height="38" rx="10" fill="rgba(14,165,233,.12)" stroke="rgba(56,189,248,.35)" stroke-dasharray="4 3"/>' +
        labels +
        dots +
        radar +
        arc +
        '<circle cx="' + me.x + '" cy="' + me.y + '" r="7" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>' +
      '</svg>'
    );
  }

  function findOrCreateRoom() {
    if (!state.fb || !state.user) {
      if (state.fb && state.fb.signIn) {
        state.fb.signIn();
      } else {
        state.statusMsg = '⏳ عم نفعّل الاتصال بحسابك… جرّب تكبس كمان ثانية.';
        render();
      }
      return;
    }
    state.statusMsg = '';
    state.mode = 'searching';
    state.partner = null;
    render();

    updatePresence();
    var fs = state.fb.fs;
    var roomsCol = fs.collection(state.fb.db, 'rooms');
    var q = fs.query(
      roomsCol,
      fs.where('state', '==', 'waiting'),
      fs.where('guest', '==', null),
      fs.where('invited', '==', null),
      fs.limit(15)
    );

    fs.getDocs(q).then(function (snap) {
      var matchDoc = null;
      var now = Date.now();
      snap.forEach(function (d) {
        if (matchDoc) return;
        var r = d.data() || {};
        if (r.host === state.user.uid) return;
        if (!Array.isArray(r.qids) || r.qids[0] !== 'sb_25') return;
        if (r.hostSeen && now - r.hostSeen > 10 * 60 * 1000) return;
        matchDoc = { id: d.id, data: r };
      });

      if (matchDoc) {
        return joinRoomById(matchDoc.id);
      }
      return createWaitingRoom();
    }).catch(function () {
      return createWaitingRoom();
    });
  }

  function createWaitingRoom() {
    var fs = state.fb.fs;
    var myName = shortName((state.profile && state.profile.name) || state.user.displayName);
    var payload = {
      host: state.user.uid,
      hostName: myName,
      hostPhoto: state.user.photoURL || '',
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
      state: 'waiting',
      qids: ['sb_25'],
      idx: 0,
      qAt: Date.now(),
      startedAt: 0,
      winner: null,
      left: null,
      endedAt: 0
    };

    return fs.addDoc(fs.collection(state.fb.db, 'rooms'), payload).then(function (docRef) {
      state.roomId = docRef.id;
      listenRoom(docRef.id);
    }).catch(function () {
      state.mode = 'idle';
      state.statusMsg = 'تعذّر فتح غرفة الدراسة هلق. جرّب مرة تانية بعد شوي.';
      render();
    });
  }

  function joinRoomById(rid) {
    if (!state.fb || !state.user || !rid) return;
    var fs = state.fb.fs;
    var ref = fs.doc(state.fb.db, 'rooms', rid);
    var myName = shortName((state.profile && state.profile.name) || state.user.displayName);

    state.mode = 'searching';
    render();

    return fs.getDoc(ref).then(function (snap) {
      if (!snap.exists()) {
        state.mode = 'idle';
        state.statusMsg = 'رابط الغرفة انتهى أو ما عاد موجود. فيك تبحث عن شريك جديد.';
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
        state.statusMsg = 'هالغرفة صارت ممتلئة بطالبين. ابحث عن شريك تاني!';
        render();
        return;
      }
      return fs.updateDoc(ref, {
        guest: state.user.uid,
        guestName: myName,
        guestPhoto: state.user.photoURL || '',
        guestReady: true,
        guestSeen: Date.now()
      }).then(function () {
        state.roomId = rid;
        listenRoom(rid);
      });
    }).catch(function () {
      state.mode = 'idle';
      state.statusMsg = 'ما قدرنا نضمك للغرفة، جرّب البحث العادي.';
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
      var partnerUid = isHost ? r.guest : r.host;

      if (partnerUid) {
        loadPartnerInfo(partnerUid);
      }

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
        state.mode = 'searching';
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
      if (rem <= 0) {
        finishSession();
      }
    }, 1000);
  }

  function finishSession() {
    if (state.mode === 'done') return;
    state.mode = 'done';
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
    if (state.fb && state.user && state.roomId && state.room) {
      var fs = state.fb.fs;
      var isHost = state.room.host === state.user.uid;
      var paid = isHost ? state.room.hostPaid : state.room.guestPaid;
      if (!paid) {
        var upd = isHost ? { hostPaid: true, state: 'done', endedAt: Date.now() } : { guestPaid: true };
        fs.updateDoc(fs.doc(state.fb.db, 'rooms', state.roomId), upd).catch(function () {});
        fs.setDoc(fs.doc(state.fb.db, 'users', state.user.uid), {
          points: fs.increment(15)
        }, { merge: true }).catch(function () {});
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
    if (state.unsubRoom) {
      state.unsubRoom();
      state.unsubRoom = null;
    }
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
    state.roomId = null;
    state.room = null;
    state.partner = null;
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
        state.copyMsg = '✅ تم نسخ الرابط! ابعته لزميلك ليفوت معك مباشرة.';
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
    var onlineCount = state.peers.length || (state.user ? 1 : 0);
    var meCity = cityById(state.city);

    var html = '';
    html += '<div class="sb-map">';
    html += '<div class="sb-map-top">';
    html += '<span class="sb-live-pill"><span class="sb-live-dot"></span>' + (onlineCount ? onlineCount + ' طالب تمريض حقيقي أونلاين' : 'خريطة طلاب التمريض الحية') + '</span>';
    html += '<span>📍 موقعك: <b>' + esc(meCity.name) + '</b> — ' + esc(state.inst) + '</span>';
    html += '</div>';
    html += buildMapSvg();
    html += '</div>';

    if (state.statusMsg) {
      html += '<div class="sb-banner">' + esc(state.statusMsg) + '</div>';
    }

    if (state.authReady && !state.user) {
      html += '<div class="sb-card" style="text-align:center">';
      html += '<h2 style="margin:0 0 8px;font-size:18px">🔑 سجّل دخولك لتفعيل الرادار</h2>';
      html += '<p style="margin:0 0 14px;font-size:13.5px;opacity:.85">التسجيل بحساب Google بيخلي طلاب معهدك ومنطقتك يشوفوك حقيقي على الخريطة (بلا أي حسابات وهمية).</p>';
      html += '<button type="button" id="sb-login-btn" class="btn pri">تسجيل الدخول بحساب Google</button>';
      html += '</div>';
      appEl.innerHTML = html;
      var lb = document.getElementById('sb-login-btn');
      if (lb && state.fb) lb.addEventListener('click', function () { state.fb.signIn(); });
      return;
    }

    if (state.mode === 'idle') {
      var cityOpts = '';
      for (var i = 0; i < CITIES.length; i++) {
        var c = CITIES[i];
        cityOpts += '<option value="' + c.id + '"' + (c.id === state.city ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }
      var subjOpts = '';
      for (var j = 0; j < SUBJECTS.length; j++) {
        var s = SUBJECTS[j];
        subjOpts += '<option value="' + esc(s) + '"' + (s === state.subj ? ' selected' : '') + '>' + esc(s) + '</option>';
      }

      html += '<div class="sb-card">';
      html += '<h2 style="margin:0 0 6px;font-size:18px">🎯 اختار منطقتك ومعهدك وبلّش</h2>';
      html += '<p style="margin:0 0 12px;font-size:13.5px;opacity:.82">١٠٠٪ طلاب حقيقيين فقط من لبنان والخارج — بلا أي حسابات وهمية. بس يلقّي الموقع طالب تاني فاتح، بتبلّش جلسة تركيز ٢٥ دقيقة سوا (+١٥ نقطة).</p>';
      html += '<div class="sb-grid">';
      html += '<div class="sb-field"><label for="sb-city">📍 المنطقة / المدينة</label><select id="sb-city">' + cityOpts + '</select></div>';
      html += '<div class="sb-field"><label for="sb-inst">🏫 المعهد / الجامعة</label><input id="sb-inst" type="text" maxlength="60" value="' + esc(state.inst) + '" placeholder="مثلاً: معهد النبطية الفني"></div>';
      html += '</div>';
      html += '<div class="sb-field" style="margin-top:10px"><label for="sb-subj">📚 المادة يلي عم تدرسها هلق</label><select id="sb-subj">' + subjOpts + '</select></div>';
      html += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">';
      html += '<button type="button" id="sb-start-btn" class="btn pri" style="flex:1;min-width:200px">' + (state.user ? '🔍 ابحث عن شريك دراسة حقيقي' : '⏳ عم نربط حسابك…') + '</button>';
      html += '</div>';
      html += '</div>';

      if (state.peers.length > 1) {
        html += '<div class="sb-card">';
        html += '<b style="display:block;margin-bottom:8px;font-size:14.5px">🟢 طلاب موجودين حالياً على الخريطة</b>';
        for (var k = 0; k < state.peers.length; k++) {
          var pr = state.peers[k];
          if (state.user && pr.uid === state.user.uid) continue;
          var pc = cityById(pr.city);
          html += '<div style="padding:7px 0;border-top:1px solid rgba(127,127,127,.16);font-size:13.5px">';
          html += '<b>' + esc(pr.name) + '</b> · 📍 ' + esc(pc.name);
          if (pr.inst) html += ' (' + esc(pr.inst) + ')';
          if (pr.subj) html += '<div style="font-size:12px;opacity:.75">📚 ' + esc(pr.subj) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
    } else if (state.mode === 'searching') {
      html += '<div class="sb-card" style="text-align:center">';
      html += '<h2 style="margin:0 0 6px;font-size:18px">📡 عم نبحث عن طالب تمريض حقيقي…</h2>';
      html += '<p style="margin:0 0 12px;font-size:13.5px;opacity:.85">أول ما يفوت طالب تاني على الصفحة رح يوصلكم الرادار فوراً. أو فيك تنسخ رابط غرفتك وتبعته لزميلك من المعهد ليدرس معك!</p>';
      if (state.copyMsg) {
        html += '<div class="sb-nudge-toast">' + esc(state.copyMsg) + '</div>';
      }
      html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">';
      html += '<button type="button" id="sb-copy-btn" class="btn pri">📋 نسخ رابط الدعوة لزميلك</button>';
      html += '<button type="button" id="sb-cancel-btn" class="btn">إلغاء البحث</button>';
      html += '</div>';
      html += '</div>';
    } else if (state.mode === 'live' || state.mode === 'done') {
      var myName = shortName((state.profile && state.profile.name) || (state.user && state.user.displayName));
      var pName = (state.partner && state.partner.name) || (state.room && (state.room.host === state.user.uid ? state.room.guestName : state.room.hostName)) || 'شريك الدراسة';
      var pCity = state.partner ? cityById(state.partner.city).name : 'لبنان';
      var pInst = (state.partner && state.partner.inst) ? state.partner.inst : 'طالب تمريض حقيقي';
      var pSubj = (state.partner && state.partner.subj) ? state.partner.subj : '';
      var rem = (state.room && state.room.startedAt) ? (FOCUS_MS - (Date.now() - state.room.startedAt)) : FOCUS_MS;

      html += '<div class="sb-card">';
      if (state.mode === 'done') {
        html += '<div class="sb-banner"><b>🎉 بطل! خلّصتوا جلسة التركيز (٢٥ دقيقة) سوا — انضاف +١٥ نقطة لحسابك!</b></div>';
      } else {
        html += '<div class="sb-banner"><b>🤝 تم العثور على شريك حقيقي من ' + esc(pCity) + ' — ' + esc(pInst) + '</b></div>';
      }

      html += '<div class="sb-timer" id="sb-timer-val">' + fmtTime(rem) + '</div>';

      html += '<div class="sb-pair">';
      html += '<div class="sb-who"><span>🟡 أنت</span><b>' + esc(myName) + '</b><small>📍 ' + esc(meCity.name) + ' · ' + esc(state.inst) + '</small><small>📚 ' + esc(state.subj) + '</small></div>';
      html += '<div class="sb-who"><span>🟢 شريكك</span><b>' + esc(pName) + '</b><small>📍 ' + esc(pCity) + ' · ' + esc(pInst) + '</small>' + (pSubj ? '<small>📚 ' + esc(pSubj) + '</small>' : '') + '</div>';
      html += '</div>';

      if (state.nudgeText) {
        html += '<div class="sb-nudge-toast">' + esc(state.nudgeText) + '</div>';
      }

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
    var citySel = document.getElementById('sb-city');
    if (citySel) {
      citySel.addEventListener('change', function () {
        state.city = citySel.value;
        var c = cityById(state.city);
        state.inst = c.inst;
        savePrefs();
        updatePresence();
        render();
      });
    }
    var instInp = document.getElementById('sb-inst');
    if (instInp) {
      instInp.addEventListener('input', function () {
        state.inst = instInp.value;
        savePrefs();
      });
      instInp.addEventListener('blur', function () {
        updatePresence();
      });
    }
    var subjSel = document.getElementById('sb-subj');
    if (subjSel) {
      subjSel.addEventListener('change', function () {
        state.subj = subjSel.value;
        savePrefs();
        updatePresence();
      });
    }
    var startBtn = document.getElementById('sb-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', findOrCreateRoom);
    }
    var copyBtn = document.getElementById('sb-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyInviteLink);
    }
    var cancelBtn = document.getElementById('sb-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', leaveRoom);
    }
    var leaveBtn = document.getElementById('sb-leave-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', leaveRoom);
    }
    var nudges = appEl.querySelectorAll('.sb-nudge-btn');
    for (var i = 0; i < nudges.length; i++) {
      nudges[i].addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'), 10) || 0;
        sendNudge(idx);
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
      updatePresence();
      fetchPeers();
      if (!state.hbTimer) state.hbTimer = setInterval(updatePresence, 90 * 1000);
      if (!state.peerTimer) state.peerTimer = setInterval(fetchPeers, 25 * 1000);
      var urlRoom = getUrlRoom();
      if (urlRoom && !state.roomId) {
        joinRoomById(urlRoom);
        return true;
      }
    }
    render();
    return true;
  }

  // 1. Render the Lebanon map IMMEDIATELY in 0ms!
  loadPrefs();
  render();

  // 2. Listen to document nursin:auth (fired by assets/fb.js) + poll briefly until Firebase module settles
  document.addEventListener('nursin:auth', function () {
    syncFB();
  });
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
