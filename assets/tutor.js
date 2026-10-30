/* الأستاذ عثمان: محادثة مع ذكاء اصطناعي (Gemini عبر Cloudflare Worker تبع الموقع).
   المحادثة بتنحفظ بالـ sessionStorage (آخر 12 رسالة)، والعدّاد اليومي بالـ localStorage: 15 سؤال مجاناً بالنهار (يوم بيروت)،
   وبعدين «🎬 شوف إعلان وخود ٥ أسئلة»: شاشة إعلان Adsterra 300x250 (مش AdSense) مع عدّ 15 ثانية ثم «كمّل» = +5 أسئلة،
   أكتر شي 3 مرات بالنهار (30 سؤال بالمجموع) لحتى ما يخلص مفتاح Gemini المجاني المشترك. بلا إعلانات جوّا المحادثة.
   إذا الإعلان ما حمّل (adblock) الفتح بيصير بعد العدّ كمان (Abdullah، 25 تشرين الأول 2026).
   نص الموديل بيتنظّف (escape) قبل ما ينعرض، وبعدين بس الـ **bold** وفواصل الأسطر بيصيروا HTML. */
(function(w){
  var API='https://summer-forest-fd40.abdullahjaber1452003.workers.dev/';
  var HKEY='nursin_tutor_v1',CKEY='nursin_tutor_day_v1',KEEP=12,LIMIT=15,BONUS=5,MAX_UNLOCKS=3,AD_WAIT=15,AD_KEY='9892bba2f704f8ea66787de07f9f7be3',TIMEOUT=45000,RETRY_MS=3000;
  var BUSY='الأستاذ مشغول هلّق، جرّب كمان شوي 🙏';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  /* escape أول، بعدين **…** ← <b>، عناوين # وبنود * ← نص عادي، وسطر جديد ← <br> */
  function fmt(t){
    var h=esc(String(t==null?'':t).replace(/\r\n?/g,'\n'));
    h=h.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm,'**$1**').replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm,'');
    h=h.replace(/^(\s*)[*\-]\s+/gm,'$1• ');
    h=h.replace(/\*\*([^*\n][^\n]*?)\*\*/g,'<b>$1</b>');
    h=h.replace(/\*\*/g,'').replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g,'$1$2');
    return h.replace(/\n/g,'<br>');
  }
  /* نص للقراءة بالصوت: بلا ** ولا # ولا إيموجي */
  function speakable(t){
    var s=String(t==null?'':t).replace(/\*\*|__|[*#`>_~]/g,' ');
    try{s=s.replace(new RegExp('[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\uFE0F\\u200D\\u20E3]','gu'),' ');}catch(e){s=s.replace(/[\uD800-\uDFFF\u2600-\u27BF\uFE0F\u200D]/g,' ');}
    return s.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
  }
  /* قطع صغيرة لأن بعض المتصفّحات بتوقف بالنص الطويل */
  function chunks(s,max){
    max=max||180;var out=[];
    String(s).replace(/([.!؟?،:\n])\s*/g,'$1\u0001').split('\u0001').forEach(function(p){
      p=p.trim();if(!p)return;
      while(p.length>max){var cut=p.lastIndexOf(' ',max);if(cut<40)cut=max;out.push(p.slice(0,cut));p=p.slice(cut).trim();}
      if(out.length&&out[out.length-1].length+p.length<max)out[out.length-1]+=' '+p;else out.push(p);
    });
    return out;
  }
  function isBusy(t){return !t||typeof t!=='string'||/^\s*صار في مشكلة/.test(t);}
  function trim(h){return (h||[]).filter(function(m){return m&&(m.role==='user'||m.role==='assistant')&&typeof m.text==='string';}).slice(-KEEP);}
  function today(){var N=w.Nursin;if(N&&N.dayKey)return N.dayKey();var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
  /* العدّاد اليومي {d:يوم، n:أسئلة، u:كم مرّة فتح بإعلان}؛ بيرجع صفر كل يوم */
  function cRead(store,day){try{var c=JSON.parse(store.getItem(CKEY)||'null');if(c&&c.d===day)return {n:c.n|0,u:Math.min(MAX_UNLOCKS,c.u|0)};}catch(e){}return {n:0,u:0};}
  function cWrite(store,day,c){try{store.setItem(CKEY,JSON.stringify({d:day,n:c.n,u:c.u}));}catch(e){}}
  function countRead(store,day){return cRead(store,day).n;}
  function countAdd(store,day){var c=cRead(store,day);c.n++;cWrite(store,day,c);return c.n;}
  function quota(store,day){var c=cRead(store,day),cap=LIMIT+BONUS*c.u;return {used:c.n,unlocks:c.u,cap:cap,left:Math.max(0,cap-c.n),canUnlock:c.u<MAX_UNLOCKS};}
  function unlock(store,day){var c=cRead(store,day);if(c.u<MAX_UNLOCKS){c.u++;cWrite(store,day,c);}return quota(store,day);}

  /* شو منبعت للأستاذ عن الطالب والموقع: التاريخ، جدول الامتحانات (نفس exams.html)، صفوفو، حسابو، نقاط ضعفو، ودروس الموقع حسب الصفحة.
     o = {dk, days:[الاتنين…], topics, groups, exams:[{label, day, list:[{id,n,ar,t,q}]}], later:[{day,list}], st:{id:{s,score,total}}, past:[ex…],
          me, level, prof, badges:[{e,n}], weak, classes:{list}|{err}|null, signedIn} — كلّو نص قصير (< ~2500 حرف) */
  var PAGES={cardio:'cardio.html',neuro:'neuro.html',henderson:'henderson.html',law:'law.html',mgmt:'mgmt.html',quality:'quality.html',pharma:'pharma.html',rea:'rea.html',geri:'geri.html',comm:'community.html',medsurg:'medsurg.html'};
  var PAGE_AR={cardio:'القلب',neuro:'الأعصاب',henderson:'Henderson',law:'القانون التطبيقي',mgmt:'الإدارة',quality:'الجودة والاعتماد',pharma:'الأدوية (Pharmacologie TS2)',rea:'الإنعاش (Réanimation): غازات الدم ABG',geri:'الشيخوخة (Gériatrie)',comm:'صحة المجتمع',medsurg:'Med-Surg: التسريب الوريدي (Perfusion)'};
  function pageOf(t,G){for(var g in (G||{}))if((G[g]||[]).indexOf(t)>=0)return PAGES[g]||'';return '';}
  function dm(dk){return +String(dk).slice(8,10)+'/'+(+String(dk).slice(5,7));}
  function dayName(o,dk){var d=new Date(dk+'T12:00:00Z').getUTCDay();return (o.days||[])[(d+6)%7]||'';}
  function exLine(o,ex){
    var T=o.topics||{},pg=[];
    (ex.t||[]).forEach(function(t){var x=pageOf(t,o.groups);if(x&&pg.indexOf(x)<0)pg.push(x);});
    var st=(o.st||{})[ex.id],tail='';
    if(st&&st.s==='done')tail=' — قدّمو الطالب: '+st.score+'/'+st.total;
    else if(st&&st.s==='started')tail=' — بلّشو وما كمّلو (ما فيه يعيدو)';
    else if(st&&st.s==='open')tail=' — لسّا ما قدّمو';
    else if(st&&st.s==='missed')tail=' — ما قدّمو';
    return ex.n+' ('+ex.ar+'): الدروس '+(ex.t||[]).map(function(t){return T[t]||t;}).join('، ')+(pg.length?' — صفحة '+pg.join(' و'):'')+'، '+(ex.q||10)+' أسئلة'+tail;
  }
  function classLine(o,c){
    var T=o.topics||{},tn=function(t){return T[t]||t;},h='صف «'+c.name+'» ('+(c.members===1?'طالب واحد':c.members+' طلاب')+(c.owner?'، الطالب صاحب الصف':'')+'): ';
    if(c.week)h+='امتحان الصف هالأسبوع ('+(c.week.n||15)+' سؤال) على '+c.week.topics.map(tn).join('، ')+(c.week.intro?' — «'+c.week.intro+'»':'')+'. ';
    else h+='امتحان الصف هالأسبوع لسّا ما انعمل (بينعمل أوّل ما حدا يفتح الصف). ';
    if(c.mine)h+='الطالب قدّمو: '+c.mine.score+'/'+c.mine.total+' ('+c.mine.pct+'%)'+(c.mine.weak.length?'، غلط أكتر بـ '+c.mine.weak.map(tn).join('، '):'')+'. ';
    else if(c.week)h+='الطالب لسّا ما قدّمو (classes.html). ';
    var aw=function(a,lbl){if(!a||!a.n)return '';var x=lbl+': بطل الأسبوع '+a.champ.join(' و')+' '+a.top+'%';if(a.up.length)x+='، أكثر واحد تحسّن '+a.up.map(function(u){return u.name+' ('+u.from+'%→'+u.to+'%)';}).join(' و');return x+'. ';};
    h+=aw(c.now,'هالأسبوع لهلّق')+aw(c.last,'الأسبوع الماضي');
    if(c.dq==='notready')h+='سؤال اليوم بعدو عم يتجهّز.';
    else if(c.dq)h+='سؤال اليوم'+(c.dq.t?' (عن '+tn(c.dq.t)+')':'')+': الطالب '+(c.dq.mine==='ok'?'جاوب صح':c.dq.mine==='wrong'?'جاوب غلط':'لسّا ما جاوب')+(c.dq.first?'، أوّل واحد جاوب صح '+c.dq.first:'')+' ('+c.dq.right+' من '+c.dq.n+' صح).';
    return h.trim();
  }
  function buildContext(o){
    o=o||{};var T=o.topics||{},G=o.groups||{},parts=[];
    parts.push('[معلومات من موقع nursin.store عن الطالب، استعملها بجوابك] إذا الطالب طلب يدرس لامتحان، استعمل جدول الامتحانات تحت واشرح الدروس المطلوبة بالترتيب واعمل أسئلة تجريبية. «بكرا» و«اليوم» حسب التواريخ تحت. لما تبعتو على درس قلّو «روح على صفحة …» من القائمة تحت.');
    if(o.dk)parts.push('اليوم '+dayName(o,o.dk)+' '+dm(o.dk)+'/'+String(o.dk).slice(0,4)+' (توقيت بيروت).');
    if(o.exams&&o.exams.length){
      parts.push('جدول امتحانات الموقع (صفحة exams.html: امتحانين كل يوم من الاتنين للسبت، الأحد عطلة، كل امتحان مفتوح نهارو بس ومحاولة وحدة، صح +3 غلط −5):');
      o.exams.forEach(function(d){parts.push('- '+d.label+' ('+dayName(o,d.day)+' '+dm(d.day)+'): '+(d.list.length?d.list.map(function(ex,i){return (i+1)+') '+exLine(o,ex);}).join(' | '):'ما في امتحان (عطلة).'));});
      if(o.later&&o.later.length)parts.push('- الأيام الجاية: '+o.later.map(function(d){return dayName(o,d.day)+' '+dm(d.day)+': '+(d.list.length?d.list.map(function(x){return x.n;}).join(' | '):'عطلة');}).join('؛ ')+'.');
      var done=(o.past||[]).map(function(ex){var st=(o.st||{})[ex.id];return st&&st.s==='done'?dayName(o,ex.day)+' '+ex.n+' '+st.score+'/'+st.total:'';}).filter(Boolean);
      if(done.length)parts.push('نتائج امتحاناتو هالأسبوع: '+done.join('، ')+'.');
    }
    if(o.me){
      var p=o.prof||{},b=(o.badges||[]).map(function(x){return x.e+' '+x.n;});
      parts.push('الطالب مسجّل دخول'+(o.me.name?' واسمه '+String(o.me.name).slice(0,30):'')+'، ليفل '+(o.level||1)+' ('+(o.me.points|0)+' نقطة)'+(p.streak?'، سلسلة 🔥'+p.streak+' يوم':'')+(p.best?' (أحسن سلسلة '+p.best+')':'')+(p.qTotal?'، جاوب على '+p.qTotal+' سؤال':'')+(b.length?'، أوسمتو: '+b.join('، '):'، ما عندو أوسمة لهلّق')+'.');
      var cl=o.classes;
      if(cl&&cl.list)parts.push(cl.list.length?'صفوف الطالب (صفحة classes.html): '+cl.list.map(function(c){return classLine(o,c);}).join(' || '):'الطالب مش بأي صف (فيه يعمل صف أو يفوت بكود بصفحة classes.html).');
      else if(cl&&cl.err==='notready')parts.push('الصفوف بعدها عم تتجهّز.');
    }else parts.push('الطالب مش مسجّل دخول، فما منعرف نتايجو ولا صفوفو؛ إذا سجّل بغوغل (صفحة friends.html) بيقدّم الامتحانات وبتنحسبلو نقاط.');
    var wk=(o.weak||[]).slice(0,8).map(function(x){return (T[x.t]||x.t)+' ('+x.n+(x.n===1?' سؤال':' أسئلة')+')';});
    parts.push(wk.length?'نقاط ضعف الطالب (أسئلة غلط فيها بالكويز): '+wk.join('، ')+'.':'ما في نقاط ضعف مسجّلة للطالب لهلّق.');
    var gk=Object.keys(G);
    if(gk.length)parts.push('دروس الموقع حسب الصفحة: '+gk.map(function(g){return (PAGES[g]||g)+' ('+(PAGE_AR[g]||g)+'): '+G[g].map(function(t){return T[t]||t;}).join('، ');}).join('؛ ')+'.');
    else{var names=Object.keys(T).map(function(k){return T[k];});parts.push('دروس الموقع: '+(names.length?names.join('، '):'القلب، الأعصاب، حاجات Henderson')+'.');}
    parts.push('صفحات تانية: quiz.html كويز (وفيه كويز من أخطائك)، exams.html الامتحانات والأوائل، classes.html الصفوف، friends.html أصحابي والأوسمة، live.html تحدّي لايف، 3d.html تشريح 3D. لما تقترح شو يدرس، اقترح من دروس الموقع وركّز على الامتحان الجاي ونقاط ضعفه.');
    return parts.join('\n');
  }
  /* بيجمع كل شي بيعرفو الموقع بلا إنترنت (الجدول من account.js، نفس exams.html) */
  function gather(N,live){
    N=N||{};var dk=N.dayKey?N.dayKey():null,Q=w.QUIZ||[],o={dk:dk,days:N.DAYS||[],topics:w.QTOP||{},groups:w.QGROUPS||{},me:N.me||null,weak:[]};
    try{if(w.Weak)o.weak=w.Weak.topics();}catch(e){}
    if(dk&&N.examsFor){
      var mk=function(d){return N.examsFor(d).map(function(ex){var c={};for(var k in ex)c[k]=ex[k];c.q=N.examQids?N.examQids(ex,Q).length:10;return c;});};
      o.exams=[{label:'اليوم',day:dk,list:mk(dk)},{label:'بكرا',day:N.addDays(dk,1),list:mk(N.addDays(dk,1))}];
      o.later=[];for(var i=2;i<=6;i++){var d=N.addDays(dk,i);o.later.push({day:d,list:mk(d)});}
      o.past=[];var wd=N.weekday(dk);for(var j=wd;j>0;j--)o.past=o.past.concat(mk(N.addDays(dk,-j)));
    }
    if(o.me){o.level=N.level?N.level(o.me.points):1;var p=(live&&live.prof)||o.me;o.prof={streak:N.streakNow?N.streakNow(p,dk):(p.streak|0),best:p.bestStreak|0,qTotal:p.qTotal|0};
      o.badges=(N.BADGES||[]).filter(function(x){return p.badges&&p.badges[x.id];});}
    if(live){o.st=live.st||{};o.classes=live.classes||null;}
    return o;
  }

  var T={API:API,LIMIT:LIMIT,KEEP:KEEP,TIMEOUT:TIMEOUT,BUSY:BUSY,esc:esc,fmt:fmt,speakable:speakable,chunks:chunks,isBusy:isBusy,trim:trim,buildContext:buildContext,gather:gather,classLine:classLine,countRead:countRead,countAdd:countAdd,quota:quota,unlock:unlock,BONUS:BONUS,MAX_UNLOCKS:MAX_UNLOCKS,AD_WAIT:AD_WAIT,AD_KEY:AD_KEY};
  w.Tutor=T;
  if(typeof module!=='undefined'&&module.exports)module.exports=T;
  if(typeof document==='undefined'||!document.getElementById)return;

  function start(){
    var log=document.getElementById('tlog'),form=document.getElementById('tform'),inp=document.getElementById('tin'),
        sendBtn=document.getElementById('tsend'),chips=document.getElementById('tchips'),left=document.getElementById('tleft'),newBtn=document.getElementById('tnew');
    if(!log||!form)return;
    var chat=log.parentNode;
    var hist=[],busy=false,tts=('speechSynthesis' in w)&&typeof w.SpeechSynthesisUtterance==='function',speakingBtn=null;
    try{hist=trim(JSON.parse(sessionStorage.getItem(HKEY)||'[]'));}catch(e){hist=[];}
    function save(){hist=trim(hist);try{sessionStorage.setItem(HKEY,JSON.stringify(hist));}catch(e){}}
    function lsafe(){try{return w.localStorage;}catch(e){return {getItem:function(){return null;},setItem:function(){}};}}
    function showLeft(){
      var q=quota(lsafe(),today());left.textContent='· باقيلك '+q.left+' سؤال اليوم';
      if(!q.left&&q.canUnlock){var b=document.createElement('button');b.type='button';b.className='tlink tadbtn';b.textContent=AD_LABEL;b.addEventListener('click',function(){adScreen(null);});left.appendChild(document.createTextNode(' '));left.appendChild(b);}
    }
    /* شاشة الإعلان: نفس شكل شاشة صفحة الـ 3D (gate3d)، وحدة Adsterra 300x250 بـ iframe لحالها، عدّ 15 ثانية، «كمّل» = +5 */
    var AD_LABEL='🎬 شوف إعلان وخود ٥ أسئلة',adOpen=false;
    function adScreen(pending){
      if(adOpen||busy)return;var st=lsafe(),day=today();if(!quota(st,day).canUnlock)return;
      adOpen=true;
      var o=document.createElement('div');o.className='gate3d tadgate';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','إعلان قصير لأسئلة زيادة');
      o.innerHTML='<div class="g3card"><p class="g3t">🎬 إعلان قصير وبتاخد ٥ أسئلة</p><div class="g3ad"><small class="g3lab">إعلان</small><div class="g3slot"></div></div><p class="g3c" aria-live="polite"><span class="g3n">'+AD_WAIT+'</span></p><button type="button" class="btn pri g3go" hidden>كمّل</button><p><button type="button" class="tlink tadx">✖ رجوع بلا أسئلة</button></p></div>';
      document.body.appendChild(o);document.documentElement.classList.add('g3on');
      try{
        var f=document.createElement('iframe');f.width='300';f.height='250';f.setAttribute('scrolling','no');f.setAttribute('frameborder','0');f.title='إعلان';f.loading='eager';
        f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:"'+AD_KEY+'",format:"iframe",height:250,width:300,params:{}};<\/script><script src="https://bauval.org/22/'+AD_KEY+'" onerror="window.__adxErr=1"><\/script></body></html>';
        o.querySelector('.g3slot').appendChild(f);
      }catch(e){}
      var n=o.querySelector('.g3n'),go=o.querySelector('.g3go'),secs=AD_WAIT,timer=null;
      function close(){clearTimeout(timer);o.remove();document.documentElement.classList.remove('g3on');adOpen=false;}
      // العدّ بيكمّل حتى لو الإعلان ما حمّل (adblock): ما منعلّق الطالب
      (function tick(){if(secs>0){n.textContent=secs;secs--;timer=setTimeout(tick,1000);return;}o.querySelector('.g3c').hidden=true;go.hidden=false;try{go.focus({preventScroll:true});}catch(e){}})();
      o.querySelector('.tadx').addEventListener('click',close);
      go.addEventListener('click',function(){
        close();var q=unlock(lsafe(),today());
        log.querySelectorAll('.tlimit').forEach(function(x){x.remove();});
        var m=bubble('assistant','',{noVoice:true,cls:'tok'});m.querySelector('.tb').innerHTML=fmt('✅ زادولك **'+BONUS+' أسئلة**، باقيلك '+q.left+' سؤال اليوم');
        showLeft();if(pending)send(pending);else inp.focus();
      });
    }
    function scroll(){log.scrollTop=log.scrollHeight;}

    function stopSpeak(){if(!tts)return;try{w.speechSynthesis.cancel();}catch(e){}if(speakingBtn){speakingBtn.textContent='🔊 اسمع';speakingBtn.setAttribute('aria-pressed','false');}speakingBtn=null;}
    function arVoice(){var v=[];try{v=w.speechSynthesis.getVoices()||[];}catch(e){}
      return v.filter(function(x){return /^ar([-_]|$)/i.test(x.lang);}).sort(function(a,b){return (/SA/i.test(b.lang)?1:0)-(/SA/i.test(a.lang)?1:0);})[0]||null;}
    function speak(text,btn){
      if(speakingBtn===btn){stopSpeak();return;}
      stopSpeak();
      var parts=chunks(speakable(text)),voice=arVoice(),i=0;if(!parts.length)return;
      speakingBtn=btn;btn.textContent='⏹ وقّف';btn.setAttribute('aria-pressed','true');
      parts.forEach(function(p){
        var u=new SpeechSynthesisUtterance(p);u.lang=voice?voice.lang:'ar-SA';if(voice)u.voice=voice;u.rate=0.95;
        u.onend=u.onerror=function(){i++;if(i>=parts.length&&speakingBtn===btn)stopSpeak();};
        w.speechSynthesis.speak(u);
      });
    }

    function bubble(role,text,opts){
      opts=opts||{};
      var d=document.createElement('div');d.className='tmsg '+(role==='user'?'tme':'tbot')+(opts.cls?' '+opts.cls:'');
      var b=document.createElement('div');b.className='tb';
      if(role==='user')b.textContent=text;else b.innerHTML=fmt(text);   // fmt escapes first
      if(role!=='user'){var who=document.createElement('span');who.className='twho';who.setAttribute('aria-hidden','true');who.textContent='👨‍🏫';d.appendChild(who);}
      d.appendChild(b);
      if(role==='assistant'&&tts&&!opts.noVoice){
        var s=document.createElement('button');s.type='button';s.className='btn tspk';s.textContent='🔊 اسمع';s.setAttribute('aria-pressed','false');s.setAttribute('aria-label','اسمع الجواب بالصوت');
        s.addEventListener('click',function(){speak(text,s);});b.appendChild(s);
      }
      log.appendChild(d);if(opts.top)log.scrollTop=Math.max(0,d.offsetTop-8);else scroll();return d;
    }
    function renderAll(){
      stopSpeak();log.innerHTML='';
      bubble('assistant','أهلا! أنا **الأستاذ عثمان** 👨‍🏫\nاسألني عن أي درس (القلب، الأعصاب، Henderson…) وبشرحلك خطوة خطوة، أو قلّي «اعملّي كويز» 💪',{noVoice:true,cls:'twelcome'});
      hist.forEach(function(m){bubble(m.role,m.text);});
      chips.hidden=hist.length>0;chat.classList.toggle('tempty',!hist.length);newBtn.hidden=!hist.length;showLeft();
    }

    /* حساب الطالب الحيّ (نتايج الامتحانات + الصفوف) من Firebase إذا مسجّل دخول؛ بينحفظ ٣ دقايق، وما منستنّاه أكتر من ٥ ثواني */
    var live=null,liveAt=0;
    function fetchLive(){
      var api=w.NursinFB,N=w.Nursin||{};if(!api||!api.user||!N.dayKey)return Promise.resolve(null);
      if(live&&Date.now()-liveAt<180000)return live;
      var o=gather(N,null),exs=[];(o.exams||[]).forEach(function(d){exs=exs.concat(d.list);});exs=exs.concat(o.past||[]);
      liveAt=Date.now();
      live=Promise.all([
        api.mod('exams').then(function(m){return m&&m.tutorStatus?m.tutorStatus(api,exs):null;}).catch(function(){return null;}),
        api.mod('classes').then(function(m){return m&&m.tutorSummary?m.tutorSummary(api):null;}).catch(function(){return null;})
      ]).then(function(r){return {st:r[0]||{},classes:r[1],prof:api.profile};},function(){live=null;return null;});
      return live;
    }
    function liveInfo(){
      if(!(w.Nursin||{}).me)return Promise.resolve(null);
      var got=new Promise(function(res){
        if(w.NursinFB&&w.NursinFB.user)return fetchLive().then(res);
        document.addEventListener('nursin:me',function(){fetchLive().then(res);},{once:true});
      });
      return Promise.race([got,wait(5000).then(function(){return null;})]);
    }
    document.addEventListener('nursin:me',function(){if(w.NursinFB&&w.NursinFB.user)fetchLive();});
    function context(lv){return buildContext(gather(w.Nursin||{},lv));}
    /* 👨‍🏫 الأستاذ عثمان: his persona goes first in the context the worker appends to its system text (assets/osman.js; scolding part only with «تعليقات الأستاذ عثمان» on) */
    function persona(){var O=w.Osman;return O&&O.persona?O.persona()+'\n':'';}
    function call(){
      return liveInfo().catch(function(){return null;}).then(post);
    }
    function post(lv){
      if(!signedIn())return Promise.reject(new Error('signed-out'));   // 🔒 the endpoint is only called when signed in (Abdullah 12:28 PM)
      var ctl=('AbortController' in w)?new AbortController():null,timer=setTimeout(function(){if(ctl)ctl.abort();},TIMEOUT);
      return fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist.slice(-KEEP),context:persona()+context(lv)}),signal:ctl?ctl.signal:undefined})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
        .then(function(j){clearTimeout(timer);var t=j&&j.text;if(isBusy(t))throw new Error('busy');return t;},function(e){clearTimeout(timer);throw e;});
    }
    function signedIn(){var G=w.NursinGate;return G?!!G.signedIn:!!((w.Nursin||{}).me||(w.NursinFB&&w.NursinFB.user));}
    function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
    function setBusy(b){busy=b;sendBtn.disabled=b;inp.setAttribute('aria-busy',b?'true':'false');}

    function ask(){
      setBusy(true);
      var typing=bubble('assistant','',{noVoice:true,cls:'ttyping'});
      typing.querySelector('.tb').innerHTML='<span class="tdots" aria-label="الأستاذ عم يكتب"><i></i><i></i><i></i></span>';
      call().catch(function(){return wait(RETRY_MS).then(call);}).then(function(text){
        typing.remove();hist.push({role:'assistant',text:text});save();bubble('assistant',text,{top:true});setBusy(false);
      },function(){
        typing.remove();
        var d=bubble('assistant',BUSY,{noVoice:true,cls:'terr'});
        var r=document.createElement('button');r.type='button';r.className='btn pri tretry';r.textContent='🔄 جرّب كمان مرّة';
        r.addEventListener('click',function(){if(busy)return;d.remove();ask();});
        d.querySelector('.tb').appendChild(r);setBusy(false);
      });
    }
    function send(text){
      text=String(text||'').trim().slice(0,1000);if(!text||busy)return;
      if(!signedIn()){var lc=document.querySelector('#main .glk-card');if(lc)lc.scrollIntoView({block:'center'});return;}   // 🔒 tutor locked while signed out (assets/gate.js)
      var st=lsafe(),day=today();
      var q=quota(st,day);
      if(!q.left){
        log.querySelectorAll('.tlimit').forEach(function(x){x.remove();});
        var m=bubble('assistant','',{noVoice:true,cls:'terr tlimit'});
        if(q.canUnlock){
          m.querySelector('.tb').innerHTML=fmt(q.unlocks?'خلصو الأسئلة اللي فتحتن 🙏':'خلصو الـ **'+LIMIT+' سؤال** المجانيين لليوم 🙏');
          var ab=document.createElement('button');ab.type='button';ab.className='btn pri tadbtn';ab.textContent=AD_LABEL;
          ab.addEventListener('click',function(){adScreen(text);});m.querySelector('.tb').appendChild(ab);
        }else{
          m.querySelector('.tb').innerHTML=fmt('خلصت أسئلة اليوم، رجاع بكرا 🙏\nهلّق فيك تراجع الدروس أو تعمل ')+'<a href="quiz.html">كويز 📝</a>';
        }
        return;
      }
      countAdd(st,day);
      // last turn was an unanswered user question (failed earlier)? replace it
      if(hist.length&&hist[hist.length-1].role==='user')hist.pop();
      hist.push({role:'user',text:text});save();
      chips.hidden=true;chat.classList.remove('tempty');newBtn.hidden=false;bubble('user',text);inp.value='';grow();showLeft();ask();
    }
    function grow(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px';}

    form.addEventListener('submit',function(e){e.preventDefault();send(inp.value);});
    inp.addEventListener('input',grow);
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!/Android|iPhone|iPad/i.test(navigator.userAgent)){e.preventDefault();send(inp.value);}});
    chips.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b)send(b.textContent);});
    newBtn.addEventListener('click',function(){if(busy)return;hist=[];save();renderAll();inp.focus();});
    w.addEventListener('pagehide',stopSpeak);
    renderAll();
    // prefilled question from a link (classes «اسأل الأستاذ عن هالموضوع»): put it in the box, the student presses send
    try{var pq=new URLSearchParams(location.search).get('q');if(pq){inp.value=String(pq).slice(0,500);grow();}}catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})(typeof window!=='undefined'?window:this);
