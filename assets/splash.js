/* شاشة البداية: لوغو nursin (قلب + تخطيط قلب) بيبيّن مرّة وحدة بأوّل فتحة للموقع بكل جلسة (sessionStorage).
   ما بيخبّي المحتوى: الصفحة كلها تحت، والشاشة بتختفي لحالها بالـ CSS حتى لو وقف الـ JS. كبسة وحدة بتسكّرها. */
(function(){
  try{
    var K='nursin_splash_v1';
    if(window.sessionStorage.getItem(K))return;
    window.sessionStorage.setItem(K,'1');
  }catch(e){return;}
  var b=document.body;if(!b||!document.createElement)return;
  var reduce=false;try{reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  var H='M60 98C31 79 15 63 15 45C15 31 25.5 21 39 21C48 21 55 26 60 34C65 26 72 21 81 21C94.5 21 105 31 105 45C105 63 89 79 60 98Z',E='M4 61H37L43 49L51 78L60 33L68 71L73 61H116';
  var d=document.createElement('div');
  d.className='nsplash'+(reduce?' ns-static':'');
  d.setAttribute('aria-hidden','true');
  d.innerHTML='<div class="ns-in">'+
    '<svg class="ns-mark" viewBox="0 0 120 120" width="150" height="150" focusable="false">'+
      '<defs><clipPath id="ns-clip"><path d="'+H+'"/></clipPath></defs>'+
      '<circle class="ns-ring" cx="60" cy="60" r="50"/>'+
      '<path class="ns-ecg ns-d" d="'+E+'"/>'+
      '<g class="ns-heart">'+
        '<path class="ns-hf" d="'+H+'"/>'+
        '<path class="ns-ecg2 ns-d" d="'+E+'" clip-path="url(#ns-clip)"/>'+
        '<path class="ns-ho ns-d" d="'+H+'"/>'+
      '</g>'+
      '<g class="ns-cross"><circle cx="97" cy="27" r="13"/><path d="M97 20v14M90 27h14"/></g>'+
    '</svg>'+
    '<div class="ns-word" dir="ltr" lang="en">nursin</div>'+
    '<div class="ns-ar">تمريض بالعربي</div>'+
  '</div>';
  b.insertBefore(d,b.firstChild);
  try{var ps=d.querySelectorAll('.ns-d');for(var i=0;i<ps.length;i++){var L=Math.ceil(ps[i].getTotalLength())+2;ps[i].style.strokeDasharray=L;ps[i].style.setProperty('--L',L);}}catch(e){}
  var gone=false;
  function kill(){if(gone)return;gone=true;if(d.parentNode)d.parentNode.removeChild(d);}
  function skip(){if(gone)return;d.className+=' ns-skip';setTimeout(kill,320);}
  d.addEventListener('animationend',function(ev){if(ev.target===d)kill();});
  d.addEventListener('pointerdown',skip);d.addEventListener('click',skip);
  document.addEventListener('keydown',function k(){skip();document.removeEventListener('keydown',k);});
  setTimeout(kill,reduce?1400:2800);
})();
