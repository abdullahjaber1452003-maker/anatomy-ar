/* نقاط ضعفك: كل زائر إلو أخطاؤه هوّي، محفوظة بمتصفّحو بس (localStorage). ما في server ولا تسجيل.
   غلط بسؤال ← بينحفظ. جاوبو صح مرّتين ورا بعض ← بيطلع من نقاط الضعف. */
(function(){
  var KEY='nursin_weak_v1',GRAD=2,mem=null;
  function load(){
    try{var s=window.localStorage.getItem(KEY);if(s){var d=JSON.parse(s);if(d&&typeof d.items==='object'&&d.items)return d;}}catch(e){if(mem)return mem;}
    return mem||{v:1,items:{}};
  }
  function save(d){mem=d;try{window.localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
  function qid(q){return q.id||('h'+String(q.q).split('').reduce(function(h,c){return((h<<5)-h+c.charCodeAt(0))|0;},0));}
  var Weak={
    GRAD:GRAD,
    id:qid,
    /* ok=false: بينحفظ أو بيزيد عدد الغلطات. ok=true: إذا محفوظ، بيعدّ صح ورا بعض؛ مرّتين ← بيطلع. بيرجّع 'added' | 'graduated' | 'progress' | null */
    record:function(q,ok){
      var d=load(),k=qid(q),it=d.items[k],r=null;
      if(!ok){if(!it){it=d.items[k]={t:q.t,miss:0,streak:0};r='added';}else r='progress';it.miss++;it.streak=0;it.last=Date.now();}
      else if(it){it.streak++;it.last=Date.now();if(it.streak>=GRAD){delete d.items[k];r='graduated';}else r='progress';}
      if(r)save(d);return r;
    },
    items:function(){return load().items;},
    count:function(){return Object.keys(load().items).length;},
    has:function(q){return !!load().items[qid(q)];},
    questions:function(){var it=load().items;return(window.QUIZ||[]).filter(function(q){return !!it[qid(q)];});},
    topics:function(){
      var it=load().items,by={};
      (window.QUIZ||[]).forEach(function(q){var e=it[qid(q)];if(!e)return;var t=by[q.t]||(by[q.t]={t:q.t,n:0,miss:0});t.n++;t.miss+=e.miss;});
      return Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return b.n-a.n||b.miss-a.miss;});
    },
    reset:function(){save({v:1,items:{}});},
    page:function(t){var G=window.QGROUPS||{};return (G.neuro||[]).indexOf(t)>=0?'neuro.html':t==='henderson'?'henderson.html':t==='law'?'law.html':'cardio.html';},
    /* بيرسم قسم "نقاط ضعفك" جوّا el. opts.onStart(sel): شو يصير لما يكبس زر البدء (إذا ما في، الزر لينك عـ quiz.html) */
    render:function(el,opts){
      if(!el)return;opts=opts||{};
      var T=window.QTOP||{},tops=Weak.topics(),n=0;tops.forEach(function(t){n+=t.n;});
      var h='<h2>🎯 نقاط ضعفك <small>· كويز من أخطائك</small></h2>';
      if(!n){
        h+='<p class="wempty">✨ ما في أخطاء لهلّق. <b>اعمل الكويز أول، وأخطاؤك بتطلع هون.</b></p><p class="small wnote">كل سؤال بتغلط فيه بينحفظ هون (بمتصفّحك بس). بس تجاوبو صح مرّتين ورا بعض، بيطلع من القائمة.</p>';
        h+='<div class="wact"><a class="btn pri" href="quiz.html" data-start="all">🔀 ابدأ كويز ٢٠ سؤال</a></div>';
      }else{
        h+='<p class="small wnote">هيدي الأسئلة يلي غلطت فيها، مجمّعة حسب الدرس. جاوب كل سؤال صح مرّتين ورا بعض وبيطلع من هون.</p><ul class="wlist">';
        tops.forEach(function(t){h+='<li><a href="'+Weak.page(t.t)+'#'+t.t+'">'+(T[t.t]||t.t)+'</a><span class="wcount">'+t.n+(t.n===1?' سؤال':' أسئلة')+'</span></li>';});
        h+='</ul><div class="wact"><a class="btn pri" href="quiz.html?t=weak" data-start="weak">🎯 كويز من أخطائك ('+n+')</a><button class="btn" type="button" data-reset>🗑 امحي نقاط ضعفي</button></div>';
      }
      el.innerHTML=h;
      var b=el.querySelector('[data-start]');
      if(b&&opts.onStart)b.addEventListener('click',function(e){e.preventDefault();opts.onStart(b.getAttribute('data-start'));});
      var r=el.querySelector('[data-reset]');
      if(r)r.addEventListener('click',function(){if(window.confirm('أكيد بدّك تمحي كل نقاط ضعفك؟')){Weak.reset();Weak.render(el,opts);if(opts.onReset)opts.onReset();}});
    }
  };
  window.Weak=Weak;
  if(typeof module!=='undefined'&&module.exports)module.exports=Weak;
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',function(){
    var el=document.getElementById('weak');if(el&&!el.hasAttribute('data-manual'))Weak.render(el);
  });
})();
