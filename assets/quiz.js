(function(){
  var root=document.getElementById('quiz');if(!root||!window.QUIZ)return;
  var L='abc',state=null,W=window.Weak,S=window.NursinSRS,panel=document.getElementById('weak');
  function refresh(){if(W&&panel)W.render(panel,{onStart:function(sel){start(sel,sel==='all'?20:0,true);}});rv();}
  // 🔁 «مراجعة اليوم (N)» (Oct 28 8:32 PM): only the questions due today in the spaced-repetition list (assets/srs.js)
  function rv(){var b=document.getElementById('qrev');if(!b||!S)return;var n=S.count();b.hidden=false;b.innerHTML='🔁 مراجعة اليوم <b class="rvn">('+n+')</b>';b.classList.toggle('hot',n>0);b.title=n?'':'ما في شي للمراجعة اليوم';}
  function $(s){return root.querySelector(s);}
  function params(){var p={};location.search.slice(1).split('&').forEach(function(kv){if(!kv)return;var a=kv.split('=');p[a[0]]=decodeURIComponent(a[1]||'');});return p;}
  function pool(sel,les){
    if(sel==='all')return QUIZ.slice();
    if(sel==='weak')return W?W.questions():[];
    if(sel==='review')return S?S.questions():[];
    if(QGROUPS[sel])return QUIZ.filter(function(q){return QGROUPS[sel].indexOf(q.t)>=0&&(!les||q.l===les);});
    return QUIZ.filter(function(q){return q.t===sel;});
  }
  // مادة ← دروسها: sel = مادة (QGROUPS) أو درس (q.t للقلب والأعصاب)، les = درس جوّا مادة (q.l)
  var QS=window.QSUBJ||{},QL=window.QLES||{};
  function subjOf(t){for(var k in QGROUPS)if(QGROUPS[k].indexOf(t)>=0&&QGROUPS[k].length>1)return k;return '';}
  function isLesson(sel,les){return !!les||(sel!=='all'&&sel!=='weak'&&!QGROUPS[sel]&&!!QTOP[sel]);}
  function lessonName(sel,les){return les?((QL[sel]||{})[les]||les):(QTOP[sel]||sel);}
  function subjHref(sel,les){var s=les?sel:subjOf(sel);return s?'quiz.html?t='+s:'quiz.html';}
  function subjName(sel,les){var s=les?sel:subjOf(sel);return QS[s]||'';}
  function few(sel,les,qs,scroll){   // درس ما عندو أسئلة كفاية (أقل من ٣)
    state=null;chips(les?'':sel);
    var sn=subjName(sel,les),h='<div class="qcard lqfew"><p class="qq">📝 '+lessonName(sel,les)+'</p><p>ما في أسئلة كافية لهالدرس بعد'+(qs.length?' (بس '+(qs.length===1?'سؤال واحد':'سؤالين')+')':'')+'.</p><p class="lqbtns">';
    if(qs.length)h+='<button class="btn" id="lqgo" type="button">جاوب '+(qs.length===1?'السؤال':'السؤالين')+'</button> ';
    h+='<a class="btn pri" href="'+subjHref(sel,les)+'">📝 كويز بكل مادة '+(sn||'هالمادة')+'</a></p></div>';
    root.innerHTML=h;
    var g=$('#lqgo');if(g)g.addEventListener('click',function(){start(sel,0,true,les,true);});
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function chips(sel){document.querySelectorAll('#qsets .chip').forEach(function(c){c.classList.toggle('on',c.dataset.set===sel);});qlab();}
  // 🧹 Oct 28: the «اختار نوع التمرين» box shows what is running and folds itself away once a kind is picked
  function qlab(){var cu=document.getElementById('qcur');if(!cu)return;var on=document.querySelector('#qpick .chip.on');cu.textContent=on?on.textContent:'';}
  document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('#qpick .chip');if(!c)return;setTimeout(function(){var pk=document.getElementById('qpick');if(pk)pk.open=false;qlab();},0);});
  (function(){var wk=document.getElementById('qweak');function oh(){if(wk&&location.hash==='#weak'){wk.open=true;setTimeout(function(){wk.scrollIntoView({block:'start'});},80);}}oh();window.addEventListener('hashchange',oh);})();
  function emptyWeak(scroll){
    state=null;chips('weak');
    root.innerHTML='<div class="qcard wemptycard"><p class="qq">🎯 ما عندك أخطاء لهلّق.</p><p><b>اعمل الكويز أول، وأخطاؤك بتطلع هون.</b> كل سؤال بتغلط فيه بينحفظ بنقاط ضعفك، وبعدين بتقدر تعمل كويز عليهن بس.</p><p><button class="btn pri" id="go20" type="button">🔀 ابدأ كويز ٢٠ سؤال</button></p></div>';
    $('#go20').addEventListener('click',function(){start('all',20,true);});
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function emptyReview(scroll){
    state=null;chips('');var t=S?S.total():0;
    root.innerHTML='<div class="qcard wemptycard"><p class="qq">🔁 ما في شي للمراجعة اليوم 🎉</p><p>كل سؤال بتغلط فيه أو بتعلّمه «😓 صعبة» بيرجعلك بعد يوم، بعدين ٣ أيام، بعدين ٧، بعدين ١٤.'+(t?' عندك '+t+' سؤال ناطرين يومن.':'')+'</p><p><button class="btn pri" id="go20" type="button">🔀 ابدأ كويز ٢٠ سؤال</button></p></div>';
    $('#go20').addEventListener('click',function(){start('all',20,true);});
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function start(sel,n,scroll,les,force){
    if(les&&!QGROUPS[sel])les='';
    var qs=pool(sel,les);
    if(qs.length<3&&isLesson(sel,les)&&!(force&&qs.length))return few(sel,les,qs,scroll);
    if(!qs.length){if(sel==='weak')return emptyWeak(scroll);if(sel==='review')return emptyReview(scroll);qs=QUIZ.slice();sel='all';les='';}
    qs=shuffle(qs.slice());if(n&&n<qs.length)qs=qs.slice(0,n);
    state={sel:sel,les:les||'',qs:qs,i:0,score:0,wrong:[],grad:0};
    chips(les?'':sel);
    render();
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function label(sel){var les=state&&state.les;return sel==='challenge'||sel==='exam'?(state&&state.clabel||'⚔️ تحدّي'):sel==='all'?'كل الأسئلة':sel==='weak'?'كويز من أخطائك 🎯':sel==='review'?'🔁 مراجعة اليوم':sel==='cq'?(state&&state.clabel||'📝 كويز الصف'):les?'درس: '+lessonName(sel,les):QGROUPS[sel]&&QS[sel]?'كل مادة '+QS[sel]:QTOP[sel]&&!QGROUPS[sel]?'درس: '+QTOP[sel]:(QTOP[sel]||sel);}
  function render(){
    var s=state,q=s.qs[s.i];
    var h='<div class="qbar"><span>'+label(s.sel)+'</span><span>سؤال '+(s.i+1)+' من '+s.qs.length+' · ✅ '+s.score+'</span></div><div class="prog"><i style="width:'+(100*s.i/s.qs.length)+'%"></i></div>';
    h+='<div class="qcard"><span class="qtopic">'+(QTOP[q.t]||q.t)+'</span><p class="qq">'+q.q+'</p>';
    q.o.forEach(function(o,k){h+='<button class="opt" data-k="'+k+'"><span class="l" dir="ltr">'+L[k]+'</span><span>'+o+'</span></button>';});
    h+=p50(s)+'<div id="fb" aria-live="polite"></div><div class="qnav"><span></span><button class="btn pri" id="next" hidden>التالي ←</button></div></div>';
    root.innerHTML=h;
    root.querySelectorAll('.opt').forEach(function(b){b.addEventListener('click',function(){answer(+b.dataset.k);});});
    var pb=$('#p50');if(pb)pb.addEventListener('click',use50);
    $('#next').addEventListener('click',function(){s.i++;if(s.i<s.qs.length)render();else done();});
  }
  // ✂️ 50/50 power-up (signed-in only, once per quiz; never in exams or challenges)
  function p50(s){
    var N=window.Nursin;if(!N||!N.me||!N.use5050)return '';
    if(s.exam||s.challenge||s.cq)return '<p class="p50row"><button class="btn p50" type="button" disabled>✂️ 50/50</button> <small>مش مسموح '+(s.exam?'بالامتحان':s.cq?'بكويز الصف':'بالتحدّي')+'</small></p>';
    if(s.used50)return '<p class="p50row"><button class="btn p50" type="button" disabled>✂️ 50/50</button> <small>استعملتو بهالكويز</small></p>';
    var n=N.puAvail(N.me);
    if(n>0)return '<p class="p50row"><button class="btn p50" id="p50" type="button">✂️ احذف جواب غلط <b>('+n+')</b></button></p>';
    return '<p class="p50row"><button class="btn p50" id="p50" type="button"'+((N.me.points|0)<N.PU_PRICE?' disabled':'')+'>✂️ اشتري 50/50 بـ '+N.PU_PRICE+' نقطة</button></p>';
  }
  function use50(){
    var s=state,N=window.Nursin,b=$('#p50');if(!s||s.used50||!b||!N||!N.use5050)return;
    if(!N.puAvail(N.me)&&!confirm('بدّك تشتري حذف جواب بـ '+N.PU_PRICE+' نقطة؟'))return;
    b.disabled=true;var i0=s.i;s.busy50=true;
    N.use5050().then(function(r){
      s.busy50=false;
      if(state!==s||s.i!==i0)return;
      var row=root.querySelector('.p50row');
      if(!r||!r.ok){if(row)row.innerHTML='<small>⚠️ '+((r&&r.msg)||'ما زبط، جرّب كمان مرّة')+'</small>';return;}
      s.used50=true;var q=s.qs[s.i],wr=[];q.o.forEach(function(o,k){if(k!==q.a)wr.push(k);});
      shuffle(wr);wr.slice(0,q.o.length>=4?2:1).forEach(function(k){var o=root.querySelector('.opt[data-k="'+k+'"]');if(o){o.disabled=true;o.classList.add('gone');}});
      if(row)row.innerHTML='<small>✂️ انحذف '+(q.o.length>=4?'جوابين غلط':'جواب غلط')+(r.left!=null?' · باقيلك '+r.left:'')+'</small>';
    });
  }
  function answer(k){
    var s=state,q=s.qs[s.i],ok=k===q.a;
    var pr=root.querySelector('.p50row');if(pr)pr.remove();
    root.querySelectorAll('.opt').forEach(function(b){var kk=+b.dataset.k;b.disabled=true;if(kk===q.a)b.classList.add('ok');else if(kk===k)b.classList.add('bad');});
    if(ok)s.score++;else s.wrong.push(q);
    if(q.t==='ecg'||q.t==='arythmies'){s.eN=(s.eN|0)+1;if(ok)s.eOk=(s.eOk|0)+1;}   // for the «ملك الـ ECG» badge
    var rec=W?W.record(q,ok):null;if(rec==='graduated')s.grad++;
    var sr=S?S.record(q,ok):'none';   // 🔁 spaced repetition: wrong = back tomorrow; right on a due review = next step
    try{document.dispatchEvent(new CustomEvent('nursin:answer',{detail:{qid:q.id,ok:ok,set:s.sel}}));}catch(e){}   // ⚠️ class + site counters (assets/qstats.js)
    refresh();
    var O=window.Osman,om=O?(ok?O.right():O.wrong()):'';   // 👨‍🏫 الأستاذ عثمان (assets/osman.js)
    $('#fb').innerHTML='<div class="expl'+(ok?'':' w')+'">'+(ok?'✅ <b>صح!</b> ':'❌ <b>الجواب الصح: '+L[q.a]+'</b> — ')+q.x+'</div>'+om+(rec==='added'?'<p class="small wtag">🎯 انضاف لنقاط ضعفك</p>':rec==='graduated'?'<p class="small wtag">🎉 طلع من نقاط ضعفك (صح مرّتين ورا بعض)</p>':'')+
      (!S?'':!ok?'<p class="small wtag">🔁 رح يرجعلك بكرا بمراجعة اليوم</p>':sr==='next'?'<p class="small wtag">🔁 برافو، بيرجع بعد '+S.STEPS[S.items()[q.id].s]+' أيام</p>':sr==='done'?'<p class="small wtag">🎉 خلص من المراجعة (حفظتو)</p>':'<p class="small srsh"><button class="btn sm" id="srhard" type="button">😓 صعبة، رجّعلي ياها</button></p>');
    var hb=$('#srhard');if(hb)hb.addEventListener('click',function(){S.hard(q);hb.parentNode.innerHTML='🔁 تمام، بترجعلك بكرا';refresh();});
    var nx=$('#next');nx.hidden=false;nx.textContent=s.i+1<s.qs.length?'التالي ←':'شوف النتيجة 🏁';nx.focus();
  }
  function done(){
    var s=state,pct=Math.round(100*s.score/s.qs.length);
    var h='<div class="qcard score"><p>النتيجة: <b>'+s.score+' / '+s.qs.length+'</b> ('+pct+'%)</p><p>'+(pct>=85?'ممتاز 🔥':pct>=60?'منيح 👍 راجع الغلطات تحت':'لازم مراجعة 💪 اقرا الدرس وجرّب مرّة تانية')+'</p>';
    if(W){var left=W.count();
      if(s.sel==='weak')h+='<p>'+(s.grad?'🎉 طلع '+s.grad+' من نقاط ضعفك. ':'')+(left?'باقي '+left+' بنقاط ضعفك.':'خلصت كل نقاط ضعفك 🔥')+'</p>';
      else if(s.wrong.length)h+='<p>🎯 الأسئلة يلي غلطت فيها انحفظت بنقاط ضعفك.</p>';}
    h+='<p id="qpts" class="qpts" aria-live="polite"></p>';
    if(s.sel==='review'&&S){var rl=S.count();h+='<p>🔁 '+(rl?'باقي '+rl+' للمراجعة اليوم.':'خلصت مراجعة اليوم 🔥')+'</p>';}
    h+=s.cq?'<div id="cqres" class="cqres" aria-live="polite"><p class="small">⏳ عم نحفظ علامتك ونجيب علامات الصف…</p></div><p><a class="btn pri" href="index.html">🏠 رجوع للرئيسية</a></p></div>':s.exam?'<p><a class="btn pri" href="exams.html">📅 رجوع للامتحانات</a></p></div>':s.challenge?'<p><a class="btn pri" href="friends.html">⚔️ رجوع لتحدّياتي</a></p></div>':'<p><button class="btn pri" id="again">جرّب مرّة تانية</button>'+(W&&W.count()&&s.sel!=='weak'?' <button class="btn" id="toweak" type="button">🎯 كويز من أخطائك</button>':'')+'</p></div>';
    if(!s.cq)h+='<div class="adx adx-box adx-keep adx-res" data-mobile="9892bba2f704f8ea66787de07f9f7be3" data-desktop="f0cd90c85278798fba5a155236050d61"></div>'; // result-screen banner (below the score card, never during questions)
    if(s.wrong.length){h+='<h2>راجع هودي:</h2>';s.wrong.forEach(function(q){var page=W?W.page(q.t):(QGROUPS.neuro.indexOf(q.t)>=0?'neuro.html':q.t==='henderson'?'henderson.html':q.t==='law'?'law.html':q.t==='mgmt'?'mgmt.html':q.t==='quality'?'quality.html':q.t==='pharma'?'pharma.html':'cardio.html');h+='<div class="qcard"><span class="qtopic">'+(QTOP[q.t]||q.t)+'</span><p class="qq">'+q.q+'</p><div class="expl">✅ <b>'+L[q.a]+') '+q.o[q.a]+'</b><br>'+q.x+'</div><p><a href="'+page+'#'+q.t+'">اقرا الدرس ←</a></p></div>';});}
    root.innerHTML=h;
    try{if(s.sel==='weak'&&W&&W.ran)W.ran();}catch(e){}
    try{document.dispatchEvent(new CustomEvent('nursin:quiz-done',{detail:{score:s.score,total:s.qs.length,wrong:s.qs.length-s.score,set:s.sel,les:s.les||null,challenge:s.challenge||null,exam:s.exam||null,cq:s.cq||null,ecg:s.eN?[s.eOk|0,s.eN]:null}}));}catch(e){}
    var ag=$('#again');if(ag)ag.addEventListener('click',function(){start(s.sel,s.sel==='weak'?0:s.qs.length,true,s.les,true);});
    var tw=$('#toweak');if(tw)tw.addEventListener('click',function(){start('weak',0,true);});
  }
  document.querySelectorAll('#qsets .chip').forEach(function(c){c.addEventListener('click',function(){start(c.dataset.set,c.dataset.set==='all'?20:0,true);});});
  // friend challenge «تحدّي»: assets/fb.js loads the challenge and calls NursinQuiz.startChallenge
  window.NursinQuiz={
    start:function(sel,n){start(sel,n||0,true);},   // used by «✅ أهدافك اليوم» (assets/goals.js) when already on quiz.html
    startChallenge:function(c){
      var qs=(c.qids||[]).map(function(id){for(var i=0;i<QUIZ.length;i++)if(QUIZ[i].id===id)return QUIZ[i];return null;}).filter(Boolean);
      if(!qs.length)return this.message('⚠️ ما قدرنا نحمّل أسئلة التحدّي.');
      clearTimeout(chWait);state={sel:c.cq?'cq':c.exam?'exam':'challenge',qs:qs,i:0,score:0,wrong:[],grad:0,challenge:c.exam||c.cq?null:c.id,exam:c.exam||null,cq:c.cq||null,clabel:c.label};chips('');render();root.scrollIntoView({block:'start'});
    },
    refresh50:function(){if(state&&!state.exam&&!state.challenge&&!state.cq&&!state.busy50&&!state.used50&&!root.querySelector('.opt[disabled]')){var r=root.querySelector('.p50row'),h=p50(state);if(r)r.outerHTML=h||'';else if(h){var f=root.querySelector('#fb');if(f){f.insertAdjacentHTML('beforebegin',h);}}var pb=$('#p50');if(pb)pb.addEventListener('click',use50);}},
    message:function(html){clearTimeout(chWait);state=null;chips('');root.innerHTML='<div class="qcard chmsg">'+html+'</div>';root.scrollIntoView({block:'start'});}
  };
  (function(){var b=document.getElementById('qrev');if(b)b.addEventListener('click',function(){start('review',0,true);});document.addEventListener('nursin:srs',rv);})();
  refresh();
  document.addEventListener('nursin:me',function(){window.NursinQuiz.refresh50();});
  var p=params(),chWait=0;
  if(p.exam){
    var NE=window.Nursin;
    if(!NE||!NE.me)window.NursinQuiz.message('<p class="qq">📅 امتحان الأسبوع</p><p><b><a href="exams.html">سجّل دخول بغوغل من صفحة الامتحانات</a></b> تا تقدّم الامتحان وتنحسبلك النقاط.</p>');
    else{root.innerHTML='<div class="qcard"><p>⏳ عم نحمّل الامتحان…</p></div>';chWait=setTimeout(function(){window.NursinQuiz.message('⚠️ ما قدرنا نحمّل الامتحان هلّق. تأكّد من الإنترنت وجرّب كمان مرّة، أو <a href="exams.html">روح للامتحانات</a>.');},20000);}
  }
  else if(p.cq){   // 📝 «كويز الصف (كل ٣ أيام)»: assets/qstats.js loads it for a signed-in member
    var NC=window.Nursin;
    if(!NC||!NC.me)window.NursinQuiz.message('<p class="qq">📝 كويز الصف</p><p><b><a href="classes.html">سجّل دخول وفوت على صفّك</a></b> تا تحلّ كويز الصف.</p>');
    else{root.innerHTML='<div class="qcard"><p>⏳ عم نحمّل كويز الصف…</p></div>';chWait=setTimeout(function(){window.NursinQuiz.message('⚠️ ما قدرنا نحمّل كويز الصف هلّق. تأكّد من الإنترنت وجرّب كمان مرّة.');},20000);}
  }
  else if(p.challenge){
    var N=window.Nursin;
    if(!N||!N.me)window.NursinQuiz.message('<p class="qq">⚔️ صاحبك تحدّاك!</p><p><b><a href="friends.html">سجّل دخول بغوغل بصفحة أصحابي</a></b>، والتحدّي بيستنّاك هونيك تحت «تحدّيات إلك».</p>');
    else{root.innerHTML='<div class="qcard"><p>⏳ عم نحمّل التحدّي…</p></div>';chWait=setTimeout(function(){window.NursinQuiz.message('⚠️ ما قدرنا نحمّل التحدّي هلّق. تأكّد من الإنترنت وجرّب كمان مرّة، أو <a href="friends.html">روح لأصحابي</a>.');},20000);}
  }
  else start(p.t||'all',p.n?+p.n:(p.t?0:20),!!p.t||location.hash==='#quiz',p.l||'');
})();