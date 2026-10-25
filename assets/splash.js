/* شاشة البداية (~6 ثواني): لوغو nursin — قلب بينرسم، خط تخطيط القلب، شاشة مونيتور حيّة مع دقّات القلب، صليب التمريض، الاسم والشعار.
   بتبيّن مرّة وحدة بأوّل فتحة للموقع بكل جلسة (sessionStorage). ما بتخبّي المحتوى: الصفحة كلها تحت،
   والشاشة بتختفي لحالها بالـ CSS (~6 ث) حتى لو وقف الـ JS. كبسة وحدة أو زر «تخطّي» بيسكّرها. */
(function(){
  try{
    var K='nursin_splash_v2';
    if(window.sessionStorage.getItem(K))return;
    window.sessionStorage.setItem(K,'1');
  }catch(e){return;}
  var b=document.body;if(!b||!document.createElement)return;
  var reduce=false;try{reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  var H='M60 98C31 79 15 63 15 45C15 31 25.5 21 39 21C48 21 55 26 60 34C65 26 72 21 81 21C94.5 21 105 31 105 45C105 63 89 79 60 98Z',E='M4 61H37L43 49L51 78L60 33L68 71L73 61H116';
  /* خط المونيتور: 3 دقّات بكل مرور (72 دقّة/دقيقة)، عرض 250 */
  var M='M0 30',c,s;
  for(var j=0;j<3;j++){c=41.7+j*83.33;
    s=function(dx,y){return 'L'+(c+dx).toFixed(1)+' '+y;};
    M+=s(-32,30)+'Q'+(c-26).toFixed(1)+' 23 '+(c-20).toFixed(1)+' 30'+s(-6,30)+s(-3,34)+s(0,5)+s(4,42)+s(7,30)+s(16,30)+'Q'+(c+25).toFixed(1)+' 19 '+(c+34).toFixed(1)+' 30';}
  M+='L250 30';
  var d=document.createElement('div');
  d.className='nsplash'+(reduce?' ns-static':'');
  d.setAttribute('aria-hidden','true');
  d.innerHTML='<button type="button" class="ns-skipbtn" tabindex="-1">تخطّي ←</button>'+
  '<div class="ns-in">'+
    '<svg class="ns-mark" viewBox="0 0 120 120" width="150" height="150" focusable="false">'+
      '<defs><clipPath id="ns-clip"><path d="'+H+'"/></clipPath></defs>'+
      '<circle class="ns-ring ns-r1" cx="60" cy="60" r="50"/>'+
      '<circle class="ns-ring ns-r2" cx="60" cy="60" r="50"/>'+
      '<circle class="ns-ring ns-r3" cx="60" cy="60" r="50"/>'+
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
    '<div class="ns-mon" dir="ltr">'+
      '<span class="ns-bpm"><i>♥</i> 72</span>'+
      '<svg class="ns-old" viewBox="0 0 250 50" preserveAspectRatio="none" focusable="false"><path d="'+M+'"/></svg>'+
      '<div class="ns-live"><svg viewBox="0 0 250 50" preserveAspectRatio="none" focusable="false"><path d="'+M+'"/></svg></div>'+
      '<div class="ns-scan"><b></b></div>'+
    '</div>'+
    '<div class="ns-tag">دروس · كويز · تشريح 3D</div>'+
  '</div>'+
  '<div class="ns-bar"><i></i></div>';
  b.insertBefore(d,b.firstChild);
  try{var ps=d.querySelectorAll('.ns-d');for(var i=0;i<ps.length;i++){var L=Math.ceil(ps[i].getTotalLength())+2;ps[i].style.strokeDasharray=L;ps[i].style.setProperty('--L',L);}}catch(e){}
  var gone=false;
  function kill(){if(gone)return;gone=true;if(d.parentNode)d.parentNode.removeChild(d);}
  function skip(){if(gone)return;d.className+=' ns-skip';setTimeout(kill,320);}
  d.addEventListener('animationend',function(ev){if(ev.target===d)kill();});
  d.addEventListener('pointerdown',skip);d.addEventListener('click',skip);
  document.addEventListener('keydown',function k(){skip();document.removeEventListener('keydown',k);});
  setTimeout(kill,reduce?1800:6500);
})();
