/* 3D page: a short ad screen before the models load (asked by Abdullah, Oct 24 2026).
   Once per session. The 300x250 Adsterra unit (same srcdoc-iframe pattern as assets/ads.js), labelled «إعلان»,
   a 5-second countdown, then a «كمّل ←» button. No reward, no auto-redirect, the site header and the browser back
   button stay usable. viewer.js waits for window.nursin3dGate before loading any model. */
(function(){
  var KEY='nursin_3dgate_v1',BOX='9892bba2f704f8ea66787de07f9f7be3',WAIT=5;
  var seen=false;try{seen=sessionStorage.getItem(KEY)==='1';}catch(e){}
  if(seen||!document.querySelector('.viewer[data-model]')){window.nursin3dGate=Promise.resolve();return;}
  var done;window.nursin3dGate=new Promise(function(r){done=r;});
  var o=document.createElement('div');o.className='gate3d';o.setAttribute('role','dialog');o.setAttribute('aria-modal','false');o.setAttribute('aria-label','الصفحة عم تحضّر');
  o.innerHTML='<div class="g3card"><p class="g3t">🧊 الصفحة عم تحضّر…</p><div class="g3ad"><small class="g3lab">إعلان</small><div class="g3slot"></div></div><p class="g3c" aria-live="polite"><span class="g3n">'+WAIT+'</span></p><button type="button" class="btn pri g3go" hidden>كمّل ←</button></div>';
  document.body.appendChild(o);document.documentElement.classList.add('g3on');
  // the ad: its own iframe with its own atOptions (exactly like assets/ads.js)
  try{
    var f=document.createElement('iframe');f.width='300';f.height='250';f.setAttribute('scrolling','no');f.setAttribute('frameborder','0');f.title='إعلان';f.loading='eager';
    f.srcdoc='<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:"'+BOX+'",format:"iframe",height:250,width:300,params:{}};<\/script><script src="https://bauval.org/22/'+BOX+'/invoke.js"><\/script></body></html>';
    o.querySelector('.g3slot').appendChild(f);
  }catch(e){}
  function splashUp(){var s=document.querySelector('.nsplash');if(!s)return false;var c=getComputedStyle(s);return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05;}
  var left=WAIT,n=o.querySelector('.g3n'),go=o.querySelector('.g3go'),t0=Date.now();
  function step(){
    if(splashUp()&&Date.now()-t0<12000)return setTimeout(step,250);      // the opening splash plays first
    if(left>0){n.textContent=left;left--;return setTimeout(step,1000);}
    o.querySelector('.g3c').hidden=true;go.hidden=false;try{go.focus({preventScroll:true});}catch(e){}
  }
  step();
  go.addEventListener('click',function(){
    try{sessionStorage.setItem(KEY,'1');}catch(e){}
    o.remove();document.documentElement.classList.remove('g3on');done();
  });
})();
