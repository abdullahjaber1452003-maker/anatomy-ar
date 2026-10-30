/* nursin accounts: level math, points, months, weekly exams, live-room math (all pure) + header badge + quiz points hook.
   Firebase itself (assets/fb.js) loads only on friends/live/exams/classes pages or for someone who signed in before,
   so signed-out visitors on every other page load nothing extra. */
(function(w){
  var STEP=15,MAXP=999999,ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var RIGHT=3,WRONG=5,BONUS=10,PU_PRICE=70,PU_MAX=50;           // +3 right, −5 wrong, winner +10, 50/50 costs 70 points (was 10; Abdullah, Oct 25 2026)
  function toInt(n){n=Math.floor(+n||0);return n<0?0:n>MAXP?MAXP:n;}
  function level(p){return Math.floor(Math.sqrt(toInt(p)/STEP))+1;}          // 0→1, 15→2, 60→3, 135→4, 240→5, 375→6 … 1215→10
  function levelStart(l){return STEP*(l-1)*(l-1);}
  function progress(p){p=toInt(p);var l=level(p),a=levelStart(l),b=levelStart(l+1);return {level:l,points:p,from:a,to:b,left:b-p,pct:Math.round(100*(p-a)/(b-a))};}
  function addPoints(prev,correct,wrong){return toInt(toInt(prev)+toInt(correct)*RIGHT-toInt(wrong)*WRONG);}   // never below 0
  function quizDelta(correct,wrong){return toInt(correct)*RIGHT-toInt(wrong)*WRONG;}
  function rng(seed){var t=seed>>>0;return function(){t=(t+0x6D2B79F5)>>>0;var r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;};}
  function hash(s){s=String(s);var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function pickQids(seed,ids,n){var a=ids.slice().sort(),r=rng(seed);for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a.slice(0,n||10);}
  function winner(a,b){return a==null||b==null?null:a>b?'from':b>a?'to':'tie';}
  function cleanName(n){n=String(n||'').replace(/\s+/g,' ').trim();if(!n)n='طالب';return Array.from(n).slice(0,39).join('');}
  function newCode(rnd){rnd=rnd||Math.random;var c='';for(var i=0;i<6;i++)c+=ALPH[Math.floor(rnd()*ALPH.length)];return c;}
  function normCode(c){return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* ---- days and months, always on Lebanon time so every student sees the same day ---- */
  var fmt=null;try{fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit'});}catch(e){}
  function dayKey(d){d=d||new Date();if(fmt){var p={};fmt.formatToParts(d).forEach(function(x){p[x.type]=x.value;});return p.year+'-'+p.month+'-'+p.day;}return new Date(d.getTime()+3*36e5).toISOString().slice(0,10);}
  function monthKey(d){return dayKey(d).slice(0,7);}
  function monthField(mk){return 'm'+String(mk).replace('-','');}                 // '2026-10' → 'm202610' (one field per month, so old months stay readable)
  function prevMonth(mk){var y=+mk.slice(0,4),m=+mk.slice(5,7)-1;if(m<1){m=12;y--;}return y+'-'+(m<10?'0':'')+m;}
  function addDays(dk,n){var t=new Date(dk+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);}
  function weekday(dk){return (new Date(dk+'T12:00:00Z').getUTCDay()+6)%7;}       // 0 = Monday … 6 = Sunday
  // month fields to write together with a new points total (resets when the month changes)
  function monthWrite(d,before,after,now){
    var mk=monthKey(now),cur=(d&&d.monthKey===mk)?toInt(d.monthPoints):0,mp=toInt(cur+(toInt(after)-toInt(before))),o={monthKey:mk,monthPoints:mp};
    o[monthField(mk)]=mp;return o;
  }
  // ⚔️ تحدّي الأسبوع: this week's points (week = Monday → Sunday, Beirut day); resets on the first points write of a new week
  function weekStart(dk){dk=dk||dayKey();return addDays(dk,-weekday(dk));}
  function weekWrite(d,before,after,dk){
    var wk=weekStart(dk),cur=(d&&d.weekKey===wk)?toInt(d.weekPoints):0;
    return {weekKey:wk,weekPoints:toInt(cur+(toInt(after)-toInt(before)))};
  }
  function weekPts(p,dk){return p&&p.weekKey===weekStart(dk)?toInt(p.weekPoints):0;}

  /* ---- weekly exams: Mon–Sat, 2 subjects a day, rotating; Sunday off ---- */
  var SUBJECTS=[
    {k:'coro',n:'Infarctus + Angor',ar:'الجلطة والذبحة',t:['infarctus','angor']},
    {k:'exneuro',n:'Examens neuro',ar:'الفحوصات العصبية',t:['examens']},
    {k:'ecg',n:'ECG + Arythmies',ar:'تخطيط القلب واضطراب النبض',t:['ecg','arythmies']},
    {k:'eval',n:'Évaluation + Glasgow + HTIC',ar:'التقييم العصبي',t:['evaluation','glasgow','htic']},
    {k:'ic',n:'Insuffisance cardiaque + Choc',ar:'قصور القلب والصدمة',t:['ic','choc']},
    {k:'hend',n:'Henderson',ar:'حاجات هندرسون',t:['henderson']},
    {k:'infl',n:'Péricarde + Endocardite',ar:'التهابات القلب',t:['pericarde','endomyo']},
    {k:'neurochir',n:'AVC + Chirurgie neuro',ar:'الجلطة الدماغية والعمليات',t:['avc','laminectomie','craniotomie']},
    {k:'chir',n:'Pacemaker + Chirurgie + Embolie',ar:'جراحة القلب والبطارية',t:['pacemaker','chirurgie','embolie']}
  ];
  var EPOCH='2026-10-19',DAYS=['الاتنين','التلاتا','الأربعا','الخميس','الجمعة','السبت','الأحد'];
  /* 📅 dynamic from 2026-10-27 (Abdullah, Oct 26 7:41 PM: "when new lessons are added, the weekly exams should update"):
     the units = the 9 above + one unit for every lesson the 9 don't cover, read from the lesson registry (assets/lessons.js,
     window.NLESSONS) — a subject with QLES lessons (law, mgmt, quality, pharma…) gets ONE exam over all its lessons, new topics of
     cardio/neuro go together in an «x<subject>» exam. A lesson joins the day AFTER its «added» day, so a day's exams (and their
     questions) never change once that day has started; days before 2026-10-27 keep the old 9-unit rotation. No registry on the page
     (tests) = the old 9. */
  var DYN_FROM='2026-10-27';
  function reg(){var R=(typeof window!=='undefined'&&window.NLESSONS)||null;return R&&R.list?R:null;}
  function lessonOn(x,dk){return !x.added||x.added<dk;}
  function examUnits(dk){
    var R=reg();if(!R||!dk||dk<DYN_FROM)return SUBJECTS;
    var cov={},out=SUBJECTS.slice(),by={};
    SUBJECTS.forEach(function(s){s.t.forEach(function(t){cov[t]=1;});});
    R.list.forEach(function(x){
      if(!lessonOn(x,dk)||cov[x.t])return;
      var k=x.l?x.s:'x'+x.s,S=R.subjects[x.s]||{},u=by[k];
      if(!u){u=by[k]={k:k,n:x.l?(S.fr||x.s):'',ar:x.l?(S.ar||x.s):'دروس '+(S.ar||x.s),t:[],ns:[]};out.push(u);}
      if(u.t.indexOf(x.t)<0){u.t.push(x.t);if(!x.l)u.ns.push(x.n);}
    });
    out.forEach(function(u){if(u.ns){if(!u.n)u.n=u.ns.join(' + ');delete u.ns;}});
    return out;
  }
  function examsFor(dk){
    var wd=weekday(dk);if(wd===6)return [];
    var U=examUnits(dk),days=Math.round((Date.parse(dk+'T12:00:00Z')-Date.parse(EPOCH+'T12:00:00Z'))/864e5),wk=Math.floor(days/7),out=[];
    for(var j=0;j<2;j++){var i=((wk*12+wd*2+j)%U.length+U.length)%U.length,s=U[i];out.push({id:dk+'-'+s.k,day:dk,k:s.k,n:s.n,ar:s.ar,t:s.t});}
    return out;
  }
  // every question of the exam's topics whose lesson was already live the day before (registry «added»); the exam picks 10 of these
  function examPool(ex,quiz){
    var R=reg(),on={};if(R)R.list.forEach(function(x){on[x.t+'|'+(x.l||'')]=lessonOn(x,ex.day||'9999');});
    return (quiz||[]).filter(function(q){if(ex.t.indexOf(q.t)<0)return false;var k=q.t+'|'+(q.l||'');return !(k in on)||on[k];}).map(function(q){return q.id;});
  }
  function weekOf(dk){var mon=addDays(dk,-weekday(dk)),out=[];for(var i=0;i<6;i++){var d=addDays(mon,i);out.push({day:d,name:DAYS[i],exams:examsFor(d)});}return out;}
  function examQids(ex,quiz){
    var own=examPool(ex,quiz),R=reg(),k=String(ex.k||'');
    if(own.length>=10||!R||k.charAt(0)!=='x')return pickQids(hash(ex.id),own,10);
    // an «x» exam of new topics with few questions: all of them + the rest from the same مادة (review)
    var s=k.slice(1),ts=R.list.filter(function(x){return x.s===s&&lessonOn(x,ex.day||'9999');}).map(function(x){return x.t;});
    var more=examPool({t:ts,day:ex.day},quiz).filter(function(id){return own.indexOf(id)<0;});
    return pickQids(hash(ex.id),own.concat(pickQids(hash(ex.id+':more'),more,10-own.length)),10);
  }
  function examById(id){var m=/^(\d{4}-\d{2}-\d{2})-([a-z]+)$/.exec(String(id||''));if(!m)return null;var l=examsFor(m[1]);for(var i=0;i<l.length;i++)if(l[i].id===id)return l[i];return null;}

  /* ---- live rooms ---- */
  var LIVE={Q_SEC:20,HB_MS:10000,STALE_MS:35000,REVEAL_MS:1800};
  function roomTally(qids,ans,quiz){                 // ans = {"0":choice,…} → right / wrong / unanswered
    var by={};(quiz||[]).forEach(function(q){by[q.id]=q;});var c=0,x=0;
    (qids||[]).forEach(function(id,i){var a=ans&&ans[i];if(a==null)return;if(by[id]&&+a===by[id].a)c++;else x++;});
    return {c:c,w:x,skip:(qids||[]).length-c-x};
  }
  function roomWinner(hostScore,guestScore,left,host,guest){
    if(left)return left===host?'guest':'host';
    return hostScore>guestScore?'host':guestScore>hostScore?'guest':'tie';
  }
  function roomPoints(prev,tally,won){var p=addPoints(prev,tally.c,tally.w);return won?toInt(p+BONUS):p;}

  /* ---- 50/50 power-up: 1 free a day + bought ones ---- */
  function puAvail(d,dk){d=d||{};var b=Math.max(0,Math.min(PU_MAX,Math.floor(+d.powerups||0)));return b+(d.puDay===(dk||dayKey())?0:1);}


  /* ---- 🔥 daily streak + 🏅 badges (stored on users/{uid}; the v4 rules already allow these fields) ---- */
  var STREAK_MIN=5,ECG_T=['ecg','arythmies'],ECG_MIN=15,ECG_PCT=80;   // a day counts at 5+ answers (quiz, exam, challenge, live, class exam, سؤال اليوم)
  var BADGES=[
    {id:'s7',e:'🔥',n:'٧ أيام ورا بعض',how:'ادرس ٧ أيام ورا بعض (٥ أسئلة بالنهار)'},
    {id:'q100',e:'💯',n:'١٠٠ سؤال',how:'جاوب على ١٠٠ سؤال'},
    {id:'ecg',e:'💓',n:'ملك الـ ECG',how:'جاوب '+ECG_MIN+' سؤال ECG واضطراب النبض، ٨٠٪ منهن صح'},
    {id:'champ',e:'👑',n:'بطل الأسبوع',how:'أعلى علامة بامتحان الصف بأسبوع'},
    {id:'up',e:'📈',n:'أكثر واحد تحسّن',how:'أكبر تحسّن بامتحان الصف عن المرّة يلي قبلها'},
    {id:'class1',e:'🏫',n:'أوّل امتحان صف',how:'قدّم أوّل امتحان صف'},
    {id:'live1',e:'⚡',n:'ربحت لايف',how:'اربح تحدّي لايف'},
    {id:'dq1',e:'🎯',n:'أسرع جواب',how:'كون أوّل واحد بيجاوب صح على «سؤال اليوم» بصفّك'},
    {id:'fq1',e:'📝',n:'أوّل كويز',how:'خلّص أوّل كويز'},
    {id:'s3',e:'🌱',n:'٣ أيام ورا بعض',how:'ادرس ٣ أيام ورا بعض (كويز، لعبة أو جولة بومودورو بالنهار)'},
    {id:'p100',e:'⭐',n:'١٠٠ نقطة',how:'جمّع ١٠٠ نقطة'},
    {id:'pomo1',e:'⏱️',n:'أوّل بومودورو',how:'خلّص أوّل جولة تركيز ٢٥ دقيقة'},
    {id:'gchamp',e:'🎮',n:'بطل الألعاب',how:'العب ١٠ جولات بصفحة الألعاب'}
  ];
  function badgeById(id){for(var i=0;i<BADGES.length;i++)if(BADGES[i].id===id)return BADGES[i];return null;}
  function streakNow(d,dk){d=d||{};dk=dk||dayKey();return (d.sDay&&(d.sDay===dk||d.sDay===addDays(dk,-1)))?toInt(d.streak):0;}   // a missed day → 0
  function dayLeft(d,dk){d=d||{};dk=dk||dayKey();return d.sDay===dk?0:Math.max(0,STREAK_MIN-(d.actDay===dk?toInt(d.actN):0));}
  function ecgCount(qs,picks){var n=0,ok=0;(qs||[]).forEach(function(q,i){if(q&&ECG_T.indexOf(q.t)>=0){n++;if(picks&&picks[i]===q.a)ok++;}});return n?[ok,n]:null;}
  // badges earned from the counters; event badges (champ, up, class1, live1, dq1) come in `extra`
  function badgesFor(d,extra,dk){
    d=d||{};var b={},had=d.badges&&typeof d.badges==='object'?d.badges:{},k;
    for(k in had)if(badgeById(k))b[k]=String(had[k]).slice(0,10);
    function give(id){if(badgeById(id)&&!b[id])b[id]=dk||dayKey();}
    if(toInt(d.qTotal)>=100)give('q100');
    if(Math.max(toInt(d.bestStreak),streakNow(d,dk))>=7)give('s7');
    if(Math.max(toInt(d.bestStreak),streakNow(d,dk))>=3)give('s3');
    if(toInt(d.points)>=100)give('p100');
    if(toInt(d.ecgN)>=ECG_MIN&&toInt(d.ecgOk)*100>=ECG_PCT*toInt(d.ecgN))give('ecg');
    (extra||[]).forEach(give);
    return b;
  }
  // fields to merge into users/{uid} after n more answers today (ecg = [right, total] on ECG questions)
  // force = the day counts even under 5 answers (a finished quiz, a game round or a pomodoro focus round — Abdullah, Oct 26 2026)
  function actWrite(d,n,ecg,extra,dk,force){
    d=d||{};dk=dk||dayKey();n=Math.min(toInt(n),200);
    var o={actDay:dk,actN:toInt((d.actDay===dk?toInt(d.actN):0)+n),qTotal:toInt(toInt(d.qTotal)+n)};
    if(ecg){o.ecgN=toInt(toInt(d.ecgN)+toInt(ecg[1]));o.ecgOk=Math.min(o.ecgN,toInt(toInt(d.ecgOk)+toInt(ecg[0])));}
    if((o.actN>=STREAK_MIN||force)&&d.sDay!==dk){o.streak=(d.sDay===addDays(dk,-1)?toInt(d.streak):0)+1;o.sDay=dk;}
    o.bestStreak=Math.max(toInt(d.bestStreak),o.streak||0,streakNow(d,dk));
    var all={},k;for(k in d)all[k]=d[k];for(k in o)all[k]=o[k];
    o.badges=badgesFor(all,extra,dk);
    return o;
  }
  function newBadges(before,after){var b=(before&&before.badges)||{},out=[];for(var k in (after||{}))if(!b[k]&&badgeById(k))out.push(k);return out;}
  function badgeRow(d,max){var b=(d&&d.badges)||{},h='',n=0;BADGES.forEach(function(x){if(b[x.id]&&n<(max||9)){h+='<i title="'+esc(x.n)+'">'+x.e+'</i>';n++;}});return h?'<span class="bdg" aria-label="أوسمة">'+h+'</span>':'';}
  function streakPill(d,dk){var s=streakNow(d,dk);return s?'<span class="stk" title="سلسلة أيام">🔥'+s+'</span>':'';}

  // one line under a result: the streak moved / how many answers are left today / new badges
  function actLine(before,w,dk){
    if(!w)return '';dk=dk||dayKey();var h='',nb=newBadges(before,w.badges);
    if(w.sDay===dk&&(before||{}).sDay!==dk)h+=w.streak>1?'🔥 سلسلتك صارت <b>'+w.streak+'</b> يوم ورا بعض!':'🔥 بلّشت سلسلة أيام! ارجع بكرا تا تكبر.';
    else if(w.sDay!==dk){var left=Math.max(0,STREAK_MIN-toInt(w.actN));if(left)h+='🔥 باقيلك <b>'+left+'</b> '+(left===1?'سؤال':'أسئلة')+' اليوم تا ينحسب النهار بسلسلتك.';}
    nb.forEach(function(id){var x=badgeById(id);h+=(h?'<br>':'')+'🏅 وسام جديد: <b>'+x.e+' '+esc(x.n)+'</b>';});
    if(nb.length)h+=' <a href="friends.html#badges">أوسمتي ←</a>';
    return h?'<span class="qch act">'+h+'</span>':'';
  }
  var N=w.Nursin=w.Nursin||{};
  N.RIGHT=RIGHT;N.WRONG=WRONG;N.BONUS=BONUS;N.PU_PRICE=PU_PRICE;N.PU_MAX=PU_MAX;N.LIVE=LIVE;N.SUBJECTS=SUBJECTS;N.DAYS=DAYS;
  N.quizDelta=quizDelta;N.pickQids=pickQids;N.winner=winner;N.level=level;N.levelStart=levelStart;N.progress=progress;N.addPoints=addPoints;N.cleanName=cleanName;N.newCode=newCode;N.normCode=normCode;N.esc=esc;N.MAXP=MAXP;N.hash=hash;
  N.dayKey=dayKey;N.monthKey=monthKey;N.monthField=monthField;N.prevMonth=prevMonth;N.addDays=addDays;N.weekday=weekday;N.monthWrite=monthWrite;
  N.weekStart=weekStart;N.weekWrite=weekWrite;N.weekPts=weekPts;N.examsFor=examsFor;N.weekOf=weekOf;N.examQids=examQids;N.examPool=examPool;N.examUnits=examUnits;N.examById=examById;N.roomTally=roomTally;N.roomWinner=roomWinner;N.roomPoints=roomPoints;N.puAvail=puAvail;
  N.STREAK_MIN=STREAK_MIN;N.ECG_T=ECG_T;N.BADGES=BADGES;N.badgeById=badgeById;N.streakNow=streakNow;N.dayLeft=dayLeft;N.ecgCount=ecgCount;N.badgesFor=badgesFor;N.actWrite=actWrite;N.newBadges=newBadges;N.badgeRow=badgeRow;N.streakPill=streakPill;N.actLine=actLine;
  if(typeof document==='undefined'||!document.querySelector)return;

  var KEY='nursin_me_v1';
  function readMe(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  N.me=readMe();
  N.queue=N.queue||[];
  N.setMe=function(me){N.me=me;try{if(me)localStorage.setItem(KEY,JSON.stringify({name:me.name,photo:me.photo||'',points:me.points|0,powerups:me.powerups|0,puDay:me.puDay||'',streak:me.streak|0,sDay:me.sDay||'',weekKey:me.weekKey||'',weekPoints:me.weekPoints|0}));else localStorage.removeItem(KEY);}catch(e){}N.badge();try{document.dispatchEvent(new CustomEvent('nursin:me'));}catch(e){}};
  N.avatar=function(photo,name,cls){return photo?'<img class="'+(cls||'av')+'" src="'+esc(photo)+'" alt="" referrerpolicy="no-referrer" loading="lazy">':'<span class="'+(cls||'av')+' avx" aria-hidden="true">'+esc(Array.from(name||'?')[0])+'</span>';};
  var slot=null;
  N.badge=function(){
    if(!slot)return;var me=N.me;
    if(!me){slot.className='acct out';slot.innerHTML='<svg class="uic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg><span>دخول</span>';slot.setAttribute('aria-label','تسجيل الدخول وأصحابي');return;}
    var g=progress(me.points);
    slot.className='acct in';
    slot.setAttribute('aria-label','ليفلك '+g.level+' · '+g.points+' نقطة'+(streakNow(me)?' · سلسلة '+streakNow(me)+' يوم':'')+' — أصحابي');
    var sk=streakNow(me);
    slot.innerHTML=N.avatar(me.photo,me.name,'av')+'<span class="lv"><b>Lv '+g.level+(sk?' <span class="stk">🔥'+sk+'</span>':'')+'</b><i class="lvbar"><i style="width:'+g.pct+'%"></i></i></span>';
  };
  var bar=document.querySelector('.topbar .bar');
  if(bar){slot=document.createElement('a');slot.href='friends.html';var mb=bar.querySelector('.menu-btn');bar.insertBefore(slot,mb||null);N.badge();}

  // quiz results → points (quiz.js fires this when a quiz ends)
  document.addEventListener('nursin:quiz-done',function(e){
    var d=e.detail||{},el=document.getElementById('qpts');
    if(!N.me){if(el)el.innerHTML='🏆 <a href="friends.html">سجّل دخول بغوغل</a> وكل جواب صح بيعطيك ٣ نقاط (والغلط −٥)، وبتطلع بالليفل وبتتسابق مع أصحابك.';return;}
    if(el)el.textContent='⏳ عم نحسبلك النقاط…';
    N.queue.push({score:toInt(d.score),wrong:toInt(d.wrong!=null?d.wrong:toInt(d.total)-toInt(d.score)),total:toInt(d.total),challenge:d.challenge||null,exam:d.exam||null,ecg:Array.isArray(d.ecg)?d.ecg:null});
    if(N.flush)N.flush();
  });

  // load Firebase only where it is needed
  var page=(location.pathname.split('/').pop()||'index.html');
  var me=document.currentScript&&document.currentScript.src,v=(me&&me.split('?')[1])||'',fbOn=false;
  N.loadFB=function(){if(fbOn)return;fbOn=true;var s=document.createElement('script');s.type='module';s.src='assets/fb.js'+(v?'?'+v:'');document.head.appendChild(s);};   // also used by the welcome card (assets/nav.js)
  if(N.me||page==='friends.html'||page==='live.html'||page==='exams.html'||page==='classes.html'||page==='admin.html'||page==='chat.html'||page==='notes.html')N.loadFB();   // 📒 notes.html: sign-in button + account notes
})(typeof window!=='undefined'?window:this);
