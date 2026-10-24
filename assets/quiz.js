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
  function label(sel){return sel==='all'?'كل الأسئلة':sel==='weak'?'كويز من أخطائك 🎯':sel==='cardio'?'القلب كلّو':sel==='neuro'?'الأعصاب كلّها':(QTOP[sel]||sel);}
  function render(){
    var s=state,q=s.qs[s.i];
    var h='<div class="qbar"><span>'+label(s.sel)+'</span><span>سؤال '+(s.i+1)+' من '+s.qs.length+' · ✅ '+s.score+'</span></div><div class="prog"><i style="width:'+(100*s.i/s.qs.length)+'%"></i></div>';
    h+='<div class="qcard"><span class="qtopic">'+(QTOP[q.t]||q.t)+'</span><p class="qq">'+q.q+'</p>';
    q.o.forEach(function(o,k){h+='<button class="opt" data-k="'+k+'"><span class="l" dir="ltr">'+L[k]+'</span><span>'+o+'</span></button>';});
    h+='<div id="fb" aria-live="polite"></div><div class="qnav"><span></span><button class="btn pri" id="next" hidden>التالي ←</button></div></div>';
    root.innerHTML=h;
    root.querySelectorAll('.opt').forEach(function(b){b.addEventListener('click',function(){answer(+b.dataset.k);});});
    $('#next').addEventListener('click',function(){s.i++;if(s.i<s.qs.length)render();else done();});
  }
  function answer(k){
    var s=state,q=s.qs[s.i],ok=k===q.a;
    root.querySelectorAll('.opt').forEach(function(b){var kk=+b.dataset.k;b.disabled=true;if(kk===q.a)b.classList.add('ok');else if(kk===k)b.classList.add('bad');});
    if(ok)s.score++;else s.wrong.push(q);
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
    h+='<p><button class="btn pri" id="again">جرّب مرّة تانية</button>'+(W&&W.count()&&s.sel!=='weak'?' <button class="btn" id="toweak" type="button">🎯 كويز من أخطائك</button>':'')+'</p></div>';
    if(s.wrong.length){h+='<h2>راجع هودي:</h2>';s.wrong.forEach(function(q){var page=W?W.page(q.t):(QGROUPS.neuro.indexOf(q.t)>=0?'neuro.html':q.t==='henderson'?'henderson.html':'cardio.html');h+='<div class="qcard"><span class="qtopic">'+(QTOP[q.t]||q.t)+'</span><p class="qq">'+q.q+'</p><div class="expl">✅ <b>'+L[q.a]+') '+q.o[q.a]+'</b><br>'+q.x+'</div><p><a href="'+page+'#'+q.t+'">اقرا الدرس ←</a></p></div>';});}
    root.innerHTML=h;
    $('#again').addEventListener('click',function(){start(s.sel,s.sel==='weak'?0:s.qs.length,true);});
    var tw=$('#toweak');if(tw)tw.addEventListener('click',function(){start('weak',0,true);});
  }
  document.querySelectorAll('#qsets .chip').forEach(function(c){c.addEventListener('click',function(){start(c.dataset.set,c.dataset.set==='all'?20:0,true);});});
  refresh();
  var p=params();start(p.t||'all',p.n?+p.n:(p.t?0:20),!!p.t||location.hash==='#quiz');
})();