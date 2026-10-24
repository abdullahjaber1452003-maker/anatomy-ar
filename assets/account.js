/* nursin accounts: level math, points, months, weekly exams, live-room math (all pure) + header badge + quiz points hook.
   Firebase itself (assets/fb.js) loads only on friends/live/exams/classes pages or for someone who signed in before,
   so signed-out visitors on every other page load nothing extra. */
(function(w){
  var STEP=15,MAXP=999999,ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var RIGHT=3,WRONG=5,BONUS=10,PU_PRICE=10,PU_MAX=50;           // +3 right, −5 wrong, winner +10, 50/50 costs 10 points
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
  function examsFor(dk){
    var wd=weekday(dk);if(wd===6)return [];
    var days=Math.round((Date.parse(dk+'T12:00:00Z')-Date.parse(EPOCH+'T12:00:00Z'))/864e5),wk=Math.floor(days/7),out=[];
    for(var j=0;j<2;j++){var i=((wk*12+wd*2+j)%SUBJECTS.length+SUBJECTS.length)%SUBJECTS.length,s=SUBJECTS[i];out.push({id:dk+'-'+s.k,day:dk,k:s.k,n:s.n,ar:s.ar,t:s.t});}
    return out;
  }
  function weekOf(dk){var mon=addDays(dk,-weekday(dk)),out=[];for(var i=0;i<6;i++){var d=addDays(mon,i);out.push({day:d,name:DAYS[i],exams:examsFor(d)});}return out;}
  function examQids(ex,quiz){var ids=(quiz||[]).filter(function(q){return ex.t.indexOf(q.t)>=0;}).map(function(q){return q.id;});return pickQids(hash(ex.id),ids,10);}
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

  var N=w.Nursin=w.Nursin||{};
  N.RIGHT=RIGHT;N.WRONG=WRONG;N.BONUS=BONUS;N.PU_PRICE=PU_PRICE;N.PU_MAX=PU_MAX;N.LIVE=LIVE;N.SUBJECTS=SUBJECTS;N.DAYS=DAYS;
  N.quizDelta=quizDelta;N.pickQids=pickQids;N.winner=winner;N.level=level;N.levelStart=levelStart;N.progress=progress;N.addPoints=addPoints;N.cleanName=cleanName;N.newCode=newCode;N.normCode=normCode;N.esc=esc;N.MAXP=MAXP;N.hash=hash;
  N.dayKey=dayKey;N.monthKey=monthKey;N.monthField=monthField;N.prevMonth=prevMonth;N.addDays=addDays;N.weekday=weekday;N.monthWrite=monthWrite;
  N.examsFor=examsFor;N.weekOf=weekOf;N.examQids=examQids;N.examById=examById;N.roomTally=roomTally;N.roomWinner=roomWinner;N.roomPoints=roomPoints;N.puAvail=puAvail;
  if(typeof document==='undefined'||!document.querySelector)return;

  var KEY='nursin_me_v1';
  function readMe(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  N.me=readMe();
  N.queue=N.queue||[];
  N.setMe=function(me){N.me=me;try{if(me)localStorage.setItem(KEY,JSON.stringify({name:me.name,photo:me.photo||'',points:me.points|0,powerups:me.powerups|0,puDay:me.puDay||''}));else localStorage.removeItem(KEY);}catch(e){}N.badge();try{document.dispatchEvent(new CustomEvent('nursin:me'));}catch(e){}};
  N.avatar=function(photo,name,cls){return photo?'<img class="'+(cls||'av')+'" src="'+esc(photo)+'" alt="" referrerpolicy="no-referrer" loading="lazy">':'<span class="'+(cls||'av')+' avx" aria-hidden="true">'+esc(Array.from(name||'?')[0])+'</span>';};
  var slot=null;
  N.badge=function(){
    if(!slot)return;var me=N.me;
    if(!me){slot.className='acct out';slot.innerHTML='<svg class="uic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg><span>دخول</span>';slot.setAttribute('aria-label','تسجيل الدخول وأصحابي');return;}
    var g=progress(me.points);
    slot.className='acct in';
    slot.setAttribute('aria-label','ليفلك '+g.level+' · '+g.points+' نقطة — أصحابي');
    slot.innerHTML=N.avatar(me.photo,me.name,'av')+'<span class="lv"><b>Lv '+g.level+'</b><i class="lvbar"><i style="width:'+g.pct+'%"></i></i></span>';
  };
  var bar=document.querySelector('.topbar .bar');
  if(bar){slot=document.createElement('a');slot.href='friends.html';var mb=bar.querySelector('.menu-btn');bar.insertBefore(slot,mb||null);N.badge();}

  // quiz results → points (quiz.js fires this when a quiz ends)
  document.addEventListener('nursin:quiz-done',function(e){
    var d=e.detail||{},el=document.getElementById('qpts');
    if(!N.me){if(el)el.innerHTML='🏆 <a href="friends.html">سجّل دخول بغوغل</a> وكل جواب صح بيعطيك ٣ نقاط (والغلط −٥)، وبتطلع بالليفل وبتتسابق مع أصحابك.';return;}
    if(el)el.textContent='⏳ عم نحسبلك النقاط…';
    N.queue.push({score:toInt(d.score),wrong:toInt(d.wrong!=null?d.wrong:toInt(d.total)-toInt(d.score)),total:toInt(d.total),challenge:d.challenge||null,exam:d.exam||null});
    if(N.flush)N.flush();
  });

  // load Firebase only where it is needed
  var page=(location.pathname.split('/').pop()||'index.html');
  if(N.me||page==='friends.html'||page==='live.html'||page==='exams.html'||page==='classes.html'){
    var me=document.currentScript&&document.currentScript.src,v=(me&&me.split('?')[1])||'';
    var s=document.createElement('script');s.type='module';s.src='assets/fb.js'+(v?'?'+v:'');document.head.appendChild(s);
  }
})(typeof window!=='undefined'?window:this);
