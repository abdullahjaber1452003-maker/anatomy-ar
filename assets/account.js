/* nursin accounts: level math (pure) + header badge + quiz points hook.
   Firebase itself (assets/fb.js) loads only on friends.html or for someone who signed in before,
   so signed-out visitors on every other page load nothing extra. */
(function(w){
  var STEP=50,MAXP=999999,ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function toInt(n){n=Math.floor(+n||0);return n<0?0:n>MAXP?MAXP:n;}
  function level(p){return Math.floor(Math.sqrt(toInt(p)/STEP))+1;}          // 0→1, 50→2, 200→3, 450→4, 800→5 …
  function levelStart(l){return STEP*(l-1)*(l-1);}
  function progress(p){p=toInt(p);var l=level(p),a=levelStart(l),b=levelStart(l+1);return {level:l,points:p,from:a,to:b,left:b-p,pct:Math.round(100*(p-a)/(b-a))};}
  function addPoints(prev,correct,wrong){return toInt(toInt(prev)+toInt(correct)*10-toInt(wrong)*5);}   // +10 per right answer, −5 per wrong, never below 0
  function quizDelta(correct,wrong){return toInt(correct)*10-toInt(wrong)*5;}
  function rng(seed){var t=seed>>>0;return function(){t=(t+0x6D2B79F5)>>>0;var r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;};}
  function pickQids(seed,ids,n){var a=ids.slice().sort(),r=rng(seed);for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a.slice(0,n||10);}
  function winner(a,b){return a==null||b==null?null:a>b?'from':b>a?'to':'tie';}
  function cleanName(n){n=String(n||'').replace(/\s+/g,' ').trim();if(!n)n='طالب';return Array.from(n).slice(0,39).join('');}
  function newCode(rnd){rnd=rnd||Math.random;var c='';for(var i=0;i<6;i++)c+=ALPH[Math.floor(rnd()*ALPH.length)];return c;}
  function normCode(c){return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var N=w.Nursin=w.Nursin||{};
  N.quizDelta=quizDelta;N.pickQids=pickQids;N.winner=winner;N.level=level;N.levelStart=levelStart;N.progress=progress;N.addPoints=addPoints;N.cleanName=cleanName;N.newCode=newCode;N.normCode=normCode;N.esc=esc;N.MAXP=MAXP;
  if(typeof document==='undefined'||!document.querySelector)return;

  var KEY='nursin_me_v1';
  function readMe(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  N.me=readMe();
  N.queue=N.queue||[];
  N.setMe=function(me){N.me=me;try{if(me)localStorage.setItem(KEY,JSON.stringify({name:me.name,photo:me.photo||'',points:me.points|0}));else localStorage.removeItem(KEY);}catch(e){}N.badge();};
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
    if(!N.me){if(el)el.innerHTML='🏆 <a href="friends.html">سجّل دخول بغوغل</a> وكل جواب صح بيعطيك ١٠ نقاط (والغلط −٥)، وبتطلع بالليفل وبتتسابق مع أصحابك.';return;}
    if(el)el.textContent='⏳ عم نحسبلك النقاط…';
    N.queue.push({score:toInt(d.score),wrong:toInt(d.wrong!=null?d.wrong:toInt(d.total)-toInt(d.score)),total:toInt(d.total),challenge:d.challenge||null});
    if(N.flush)N.flush();
  });

  // load Firebase only where it is needed
  var page=(location.pathname.split('/').pop()||'index.html');
  if(N.me||page==='friends.html'){
    var me=document.currentScript&&document.currentScript.src,v=(me&&me.split('?')[1])||'';
    var s=document.createElement('script');s.type='module';s.src='assets/fb.js'+(v?'?'+v:'');document.head.appendChild(s);
  }
})(typeof window!=='undefined'?window:this);
