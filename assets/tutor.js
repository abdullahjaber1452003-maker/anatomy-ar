/* الأستاذ المساعد: محادثة مع ذكاء اصطناعي (Gemini عبر Cloudflare Worker تبع الموقع).
   المحادثة بتنحفظ بالـ sessionStorage (آخر 12 رسالة)، والعدّاد اليومي بالـ localStorage (30 سؤال بالنهار).
   نص الموديل بيتنظّف (escape) قبل ما ينعرض، وبعدين بس الـ **bold** وفواصل الأسطر بيصيروا HTML. */
(function(w){
  var API='https://summer-forest-fd40.abdullahjaber1452003.workers.dev/';
  var HKEY='nursin_tutor_v1',CKEY='nursin_tutor_day_v1',KEEP=12,LIMIT=30,TIMEOUT=45000,RETRY_MS=3000;
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
  function countRead(store,day){try{var c=JSON.parse(store.getItem(CKEY)||'null');if(c&&c.d===day)return c.n|0;}catch(e){}return 0;}
  function countAdd(store,day){var n=countRead(store,day)+1;try{store.setItem(CKEY,JSON.stringify({d:day,n:n}));}catch(e){}return n;}

  /* شو منبعت للأستاذ عن الطالب والموقع */
  function buildContext(o){
    o=o||{};var T=o.topics||{},parts=[];
    var names=Object.keys(T).map(function(k){return T[k];});
    parts.push('الطالب على موقع nursin.store اللي فيه دروس: '+(names.length?names.join('، '):'القلب، الأعصاب، حاجات Henderson')+'.');
    if(o.me){parts.push('الطالب مسجّل دخول'+(o.me.name?' واسمه '+String(o.me.name).slice(0,30):'')+'، ليفل '+(o.level||1)+' ('+(o.me.points|0)+' نقطة).');}
    var wk=(o.weak||[]).slice(0,8).map(function(x){return (T[x.t]||x.t)+' ('+x.n+(x.n===1?' سؤال':' أسئلة')+')';});
    parts.push(wk.length?'نقاط ضعف الطالب (أسئلة غلط فيها بالكويز): '+wk.join('، ')+'.':'ما في نقاط ضعف مسجّلة للطالب لهلّق.');
    parts.push('لما تقترح شو يدرس، اقترح من دروس الموقع وركّز على نقاط ضعفه.');
    return parts.join(' ');
  }

  var T={API:API,LIMIT:LIMIT,KEEP:KEEP,TIMEOUT:TIMEOUT,BUSY:BUSY,esc:esc,fmt:fmt,speakable:speakable,chunks:chunks,isBusy:isBusy,trim:trim,buildContext:buildContext,countRead:countRead,countAdd:countAdd};
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
    function showLeft(){var n=LIMIT-countRead(lsafe(),today());left.textContent=n<LIMIT?'· باقيلك '+Math.max(0,n)+' سؤال اليوم':'';}
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
      if(role!=='user'){var who=document.createElement('span');who.className='twho';who.setAttribute('aria-hidden','true');who.textContent='🧑‍🏫';d.appendChild(who);}
      d.appendChild(b);
      if(role==='assistant'&&tts&&!opts.noVoice){
        var s=document.createElement('button');s.type='button';s.className='btn tspk';s.textContent='🔊 اسمع';s.setAttribute('aria-pressed','false');s.setAttribute('aria-label','اسمع الجواب بالصوت');
        s.addEventListener('click',function(){speak(text,s);});b.appendChild(s);
      }
      log.appendChild(d);if(opts.top)log.scrollTop=Math.max(0,d.offsetTop-8);else scroll();return d;
    }
    function renderAll(){
      stopSpeak();log.innerHTML='';
      bubble('assistant','أهلا! أنا **الأستاذ المساعد** 🧑‍🏫\nاسألني عن أي درس (القلب، الأعصاب، Henderson…) وبشرحلك خطوة خطوة، أو قلّي «اعملّي كويز» 💪',{noVoice:true,cls:'twelcome'});
      hist.forEach(function(m){bubble(m.role,m.text);});
      chips.hidden=hist.length>0;chat.classList.toggle('tempty',!hist.length);newBtn.hidden=!hist.length;showLeft();
    }

    function context(){
      var N=w.Nursin||{},me=N.me||null,wk=[];
      try{if(w.Weak)wk=w.Weak.topics();}catch(e){}
      return buildContext({topics:w.QTOP||{},me:me,level:me&&N.level?N.level(me.points):1,weak:wk});
    }
    function call(){
      var ctl=('AbortController' in w)?new AbortController():null,timer=setTimeout(function(){if(ctl)ctl.abort();},TIMEOUT);
      return fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist.slice(-KEEP),context:context()}),signal:ctl?ctl.signal:undefined})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
        .then(function(j){clearTimeout(timer);var t=j&&j.text;if(isBusy(t))throw new Error('busy');return t;},function(e){clearTimeout(timer);throw e;});
    }
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
      var st=lsafe(),day=today();
      if(countRead(st,day)>=LIMIT){
        var m=bubble('assistant','',{noVoice:true,cls:'terr'});
        m.querySelector('.tb').innerHTML=fmt('وصلت لـ **'+LIMIT+' سؤال** اليوم 🙏 الأستاذ بيرتاح لبكرا.\nهلّق فيك تراجع الدروس أو تعمل ')+'<a href="quiz.html">كويز 📝</a>';
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
