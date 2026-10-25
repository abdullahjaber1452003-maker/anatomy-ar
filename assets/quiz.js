(function(){
  var root=document.getElementById('quiz');if(!root||!window.QUIZ)return;
  var L='abc',state=null,W=window.Weak,panel=document.getElementById('weak');
  function refresh(){if(W&&panel)W.render(panel,{onStart:function(sel){start(sel,sel==='all'?20:0,true);}});}
  function $(s){return root.querySelector(s);}
  function params(){var p={};location.search.slice(1).split('&').forEach(function(kv){if(!kv)return;var a=kv.split('=');p[a[0]]=decodeURIComponent(a[1]||'');});return p;}
  function pool(sel){
    if(sel==='all')return QUIZ.slice();
    if(sel==='weak')return W?W.questions():[];
    if(QGROUPS[sel])return QUIZ.filter(function(q){return QGROUPS[sel].indexOf(q.t)>=0;});
    return QUIZ.filter(function(q){return q.t===sel;});
  }
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function chips(sel){document.querySelectorAll('#qsets .chip').forEach(function(c){c.classList.toggle('on',c.dataset.set===sel);});}
  function emptyWeak(scroll){
    state=null;chips('weak');
    root.innerHTML='<div class="qcard wemptycard"><p class="qq">🎯 ما عندك أخطاء لهلّق.</p><p><b>اعمل الكويز أول، وأخطاؤك بتطلع هون.</b> كل سؤال بتغلط فيه بينحفظ بنقاط ضعفك، وبعدين بتقدر تعمل كويز عليهن بس.</p><p><button class="btn pri" id="go20" type="button">🔀 ابدأ كويز ٢٠ سؤال</button></p></div>';
    $('#go20').addEventListener('click',function(){start('all',20,true);});
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function start(sel,n,scroll){
    var qs=pool(sel);
    if(!qs.length){if(sel==='weak')return emptyWeak(scroll);qs=QUIZ.slice();sel='all';}
    qs=shuffle(qs.slice());if(n&&n<qs.length)qs=qs.slice(0,n);
    state={sel:sel,qs:qs,i:0,score:0,wrong:[],grad:0};
    chips(sel);
    render();
    if(scroll)root.scrollIntoView({block:'start'});
  }
  function label(sel){return sel==='challenge'||sel==='exam'?(state&&state.clabel||'⚔️ تحدّي'):sel==='all'?'كل الأسئلة':sel==='weak'?'كويز من أخطائك 🎯':sel==='cardio'?'القلب كلّو':sel==='neuro'?'الأعصاب كلّها':(QTOP[sel]||sel);}
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
    if(s.exam||s.challenge)return '<p class="p50row"><button class="btn p50" type="button" disabled>✂️ 50/50</button> <small>مش مسموح '+(s.exam?'بالامتحان':'بالتحدّي')+'</small></p>';
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
    var rec=W?W.record(q,ok):null;if(rec==='graduated')s.grad++;refresh();
    $('#fb').innerHTML='<div class="expl'+(ok?'':' w')+'">'+(ok?'✅ <b>صح!</b> ':'❌ <b>الجواب الصح: '+L[q.a]+'</b> — ')+q.x+'</div>'+(rec==='added'?'<p class="small wtag">🎯 انضاف لنقاط ضعفك</p>':rec==='graduated'?'<p class="small wtag">🎉 طلع من نقاط ضعفك (صح مرّتين ورا بعض)</p>':'');
    var nx=$('#next');nx.hidden=false;nx.textContent=s.i+1<s.qs.length?'التالي ←':'شوف النتيجة 🏁';nx.focus();
  }
  function done(){
    var s=state,pct=Math.round(100*s.score/s.qs.length);
    var h='<div class="qcard score"><p>النتيجة: <b>'+s.score+' / '+s.qs.length+'</b> ('+pct+'%)</p><p>'+(pct>=85?'ممتاز 🔥':pct>=60?'منيح 👍 راجع الغلطات تحت':'لازم مراجعة 💪 اقرا الدرس وجرّب مرّة تانية')+'</p>';
    if(W){var left=W.count();
      if(s.sel==='weak')h+='<p>'+(s.grad?'🎉 طلع '+s.grad+' من نقاط ضعفك. ':'')+(left?'باقي '+left+' بنقاط ضعفك.':'خلصت كل نقاط ضعفك 🔥')+'</p>';
      else if(s.wrong.length)h+='<p>🎯 الأسئلة يلي غلطت فيها انحفظت بنقاط ضعفك.</p>';}
    h+='<p id="qpts" class="qpts" aria-live="polite"></p>';
    h+=s.exam?'<p><a class="btn pri" href="exams.html">📅 رجوع للامتحانات</a></p></div>':s.challenge?'<p><a class="btn pri" href="friends.html">⚔️ رجوع لتحدّياتي</a></p></div>':'<p><button class="btn pri" id="again">جرّب مرّة تانية</button>'+(W&&W.count()&&s.sel!=='weak'?' <button class="btn" id="toweak" type="button">🎯 كويز من أخطائك</button>':'')+'</p></div>';
    if(s.wrong.length){h+='<h2>راجع هودي:</h2>';s.wrong.forEach(function(q){var page=W?W.page(q.t):(QGROUPS.neuro.indexOf(q.t)>=0?'neuro.html':q.t==='henderson'?'henderson.html':'cardio.html');h+='<div class="qcard"><span class="qtopic">'+(QTOP[q.t]||q.t)+'</span><p class="qq">'+q.q+'</p><div class="expl">✅ <b>'+L[q.a]+') '+q.o[q.a]+'</b><br>'+q.x+'</div><p><a href="'+page+'#'+q.t+'">اقرا الدرس ←</a></p></div>';});}
    root.innerHTML=h;
    try{document.dispatchEvent(new CustomEvent('nursin:quiz-done',{detail:{score:s.score,total:s.qs.length,wrong:s.qs.length-s.score,set:s.sel,challenge:s.challenge||null,exam:s.exam||null,ecg:s.eN?[s.eOk|0,s.eN]:null}}));}catch(e){}
    var ag=$('#again');if(ag)ag.addEventListener('click',function(){start(s.sel,s.sel==='weak'?0:s.qs.length,true);});
    var tw=$('#toweak');if(tw)tw.addEventListener('click',function(){start('weak',0,true);});
  }
  document.querySelectorAll('#qsets .chip').forEach(function(c){c.addEventListener('click',function(){start(c.dataset.set,c.dataset.set==='all'?20:0,true);});});
  // friend challenge «تحدّي»: assets/fb.js loads the challenge and calls NursinQuiz.startChallenge
  window.NursinQuiz={
    startChallenge:function(c){
      var qs=(c.qids||[]).map(function(id){for(var i=0;i<QUIZ.length;i++)if(QUIZ[i].id===id)return QUIZ[i];return null;}).filter(Boolean);
      if(!qs.length)return this.message('⚠️ ما قدرنا نحمّل أسئلة التحدّي.');
      clearTimeout(chWait);state={sel:c.exam?'exam':'challenge',qs:qs,i:0,score:0,wrong:[],grad:0,challenge:c.exam?null:c.id,exam:c.exam||null,clabel:c.label};chips('');render();root.scrollIntoView({block:'start'});
    },
    refresh50:function(){if(state&&!state.exam&&!state.challenge&&!state.busy50&&!state.used50&&!root.querySelector('.opt[disabled]')){var r=root.querySelector('.p50row'),h=p50(state);if(r)r.outerHTML=h||'';else if(h){var f=root.querySelector('#fb');if(f){f.insertAdjacentHTML('beforebegin',h);}}var pb=$('#p50');if(pb)pb.addEventListener('click',use50);}},
    message:function(html){clearTimeout(chWait);state=null;chips('');root.innerHTML='<div class="qcard chmsg">'+html+'</div>';root.scrollIntoView({block:'start'});}
  };
  refresh();
  document.addEventListener('nursin:me',function(){window.NursinQuiz.refresh50();});
  var p=params(),chWait=0;
  if(p.exam){
    var NE=window.Nursin;
    if(!NE||!NE.me)window.NursinQuiz.message('<p class="qq">📅 امتحان الأسبوع</p><p><b><a href="exams.html">سجّل دخول بغوغل من صفحة الامتحانات</a></b> تا تقدّم الامتحان وتنحسبلك النقاط.</p>');
    else{root.innerHTML='<div class="qcard"><p>⏳ عم نحمّل الامتحان…</p></div>';chWait=setTimeout(function(){window.NursinQuiz.message('⚠️ ما قدرنا نحمّل الامتحان هلّق. تأكّد من الإنترنت وجرّب كمان مرّة، أو <a href="exams.html">روح للامتحانات</a>.');},20000);}
  }
  else if(p.challenge){
    var N=window.Nursin;
    if(!N||!N.me)window.NursinQuiz.message('<p class="qq">⚔️ صاحبك تحدّاك!</p><p><b><a href="friends.html">سجّل دخول بغوغل بصفحة أصحابي</a></b>، والتحدّي بيستنّاك هونيك تحت «تحدّيات إلك».</p>');
    else{root.innerHTML='<div class="qcard"><p>⏳ عم نحمّل التحدّي…</p></div>';chWait=setTimeout(function(){window.NursinQuiz.message('⚠️ ما قدرنا نحمّل التحدّي هلّق. تأكّد من الإنترنت وجرّب كمان مرّة، أو <a href="friends.html">روح لأصحابي</a>.');},20000);}
  }
  else start(p.t||'all',p.n?+p.n:(p.t?0:20),!!p.t||location.hash==='#quiz');
})();