/* 🩸 Blood flow on the 3D heart (Oct 25): particles follow the real path, blue → red at the lungs, Ar–Fr step captions. */
(function(){
  'use strict';
  var BLUE=[37,99,235],RED=[220,38,38],N=12;
  var S=[
    {ar:'الأوردة الجوفاء',fr:'Veines caves',m:'svc',c:'big',n:'الدم راجع من الجسم بلا أوكسجين'},
    {ar:'الأذين الأيمن',fr:'Oreillette droite',m:'RA',c:'big',n:'هون بتخلص الدورة الكبرى'},
    {ar:'الصمام ثلاثي الشرف',fr:'Valve tricuspide',m:'valve_tri',c:'mid',n:'من الأذين الأيمن للبطين الأيمن'},
    {ar:'البطين الأيمن',fr:'Ventricule droit',m:'RV',c:'small',n:'بيدفش الدم عالرئتين'},
    {ar:'الصمام الرئوي',fr:'Valve pulmonaire',m:'valve_tri',c:'small',n:'بيفتح لما البطين الأيمن يتقلّص'},
    {ar:'الشريان الرئوي',fr:'Artère pulmonaire',m:'pulm_trunk',c:'small',n:'شريان بس دمّو بلا أوكسجين'},
    {ar:'الرئتين',fr:'Poumons',c:'small',d:2.8,o:'lung',n:'يتأكسج الدم 🫁 بيترك CO₂ وبياخد O₂'},
    {ar:'الأوردة الرئوية',fr:'Veines pulmonaires',m:'pulm_veins',c:'small',n:'أوردة بس دمّها فيه أوكسجين'},
    {ar:'الأذين الأيسر',fr:'Oreillette gauche',m:'LA',c:'small',n:'هون بتخلص الدورة الصغرى'},
    {ar:'الصمام التاجي',fr:'Valve mitrale',m:'valve_tri',c:'mid',n:'من الأذين الأيسر للبطين الأيسر'},
    {ar:'البطين الأيسر',fr:'Ventricule gauche',m:'LV',c:'big',n:'أقوى بطين: بيدفش الدم لكل الجسم'},
    {ar:'الصمام الأبهري',fr:'Valve aortique',m:'valve_tri',c:'big',n:'بيفتح لما البطين الأيسر يتقلّص'},
    {ar:'الأبهر',fr:'Aorte',m:'aorta',c:'big',n:'أكبر شريان، بيوزّع الدم الأحمر'},
    {ar:'الجسم',fr:'Organes',c:'big',d:2.8,o:'body',n:'الأعضاء بياخدو O₂ والدم بيرجع أزرق'}
  ];
  var TAG={big:'🔴 الدورة الكبرى (الجهازية) <span lang="fr" dir="ltr">Grande circulation</span>',small:'🫁 الدورة الصغرى (الرئوية) <span lang="fr" dir="ltr">Petite circulation</span>',mid:'↔️ جوّا القلب: من الأذين للبطين'};
  // waypoints (model metres) reached during each step; A = right lung + upper body (SVC), B = left lung + lower body (IVC)
  var heart=[[[-0.04,-0.012,0.016]],[[-0.021,-0.033,0.024]],[[-0.008,-0.046,0.04],[0,-0.016,0.036]],[[0.004,0.007,0.033]],[[0.006,0.027,0.023],[0.004,0.042,0.014]]];
  var left=[[[0,-0.008,-0.014]],[[0.011,-0.028,-0.002]],[[0.022,-0.043,0.016],[0.006,-0.018,0.014]],[[-0.004,-0.004,0.012]]];
  var asc=[[-0.018,0.022,0.017],[-0.015,0.046,0.01],[-0.008,0.064,0.002]];
  var PA=[[[-0.038,0.066,0.005],[-0.038,0.03,0.006]]].concat(heart,[[[-0.05,0.04,0],[-0.105,0.025,-0.01],[-0.11,0,-0.01]],[[-0.06,-0.016,-0.014],[-0.035,-0.014,-0.022]]],left,[asc.concat([[-0.012,0.088,0]]),[[-0.02,0.118,0],[-0.038,0.1,0.005]]]);
  var PB=[[[-0.038,-0.084,0.005],[-0.038,-0.058,0.005]]].concat(heart,[[[0.05,0.04,0],[0.105,0.025,-0.01],[0.11,0,-0.01]],[[0.058,-0.006,-0.008],[0.035,-0.006,-0.02]]],left,[asc.concat([[0.001,0.064,-0.02],[0,0.052,-0.041],[-0.003,0,-0.049],[-0.006,-0.057,-0.04],[-0.008,-0.08,-0.036]]),[[-0.015,-0.12,-0.02],[-0.035,-0.115,0],[-0.038,-0.1,0.005]]]);
  var ORG=[['lung','🫁','الرئة',[-0.118,0.012,-0.01]],['lung','🫁','الرئة',[0.118,0.012,-0.01]],['body','🧠','الراس والإيدين',[-0.022,0.128,0]],['body','🦵','باقي الجسم',[-0.022,-0.13,-0.008]]];
  var ST=[],CYC=0;S.forEach(function(s){s.t0=CYC;CYC+=s.d||1.5;ST.push(CYC);});
  function prep(P){return P.map(function(w,k){var prev=P[(k+P.length-1)%P.length],pts=[prev[prev.length-1]].concat(w),L=[0];
    for(var i=1;i<pts.length;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]));return {p:pts,L:L};});}
  var R=[prep(PA),prep(PB)];
  function stepAt(t){for(var k=0;k<S.length;k++)if(t<ST[k])return k;return S.length-1;}
  function sm(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
  function at(v,t){var k=stepAt(t),u=(t-S[k].t0)/(ST[k]-S[k].t0),g=R[v][k],d=u*g.L[g.L.length-1],i=1;
    while(i<g.L.length-1&&g.L[i]<d)i++;var a=g.p[i-1],b=g.p[i],f=(d-g.L[i-1])/((g.L[i]-g.L[i-1])||1);f=Math.max(0,Math.min(1,f));
    var ox=k<6?0:k===6?sm((u-0.45)/0.5):k<13?1:1-sm((u-0.35)/0.55);
    return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,z:a[2]+(b[2]-a[2])*f,o:ox,k:k};}
  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}

  window.nursinFlow=function(o){
    var mv=o.mv,stage=o.stage,on=false,play=true,T=0,goal=null,last=0,raf=0,cur=-1,dots=[],orgs=[],orig=null;
    var bFlow=el('button','btn flowbtn','🩸 مسار الدم');bFlow.type='button';bFlow.setAttribute('aria-pressed','false');o.tools.appendChild(bFlow);
    var cap=el('div','fcap');cap.dir='rtl';cap.hidden=true;
    cap.innerHTML='<div class="ftag"></div><div class="fstep"><bdi class="fnum" dir="ltr"></bdi> <b></b> <span class="fr" lang="fr" dir="ltr"></span></div><div class="fnote"></div>'+
      '<div class="fctl"><button type="button" class="btn fplay">⏸ وقّف</button><button type="button" class="btn fnext">التالي ▶</button><span class="fleg"><span><i style="background:rgb('+BLUE+')"></i> بلا أوكسجين</span><span><i style="background:rgb('+RED+')"></i> فيه أوكسجين</span></span></div>';
    stage.parentNode.insertBefore(cap,stage.nextSibling);
    var bPlay=cap.querySelector('.fplay'),bNext=cap.querySelector('.fnext');
    function mats(k){
      if(!mv.model)return;var ms=mv.model.materials;
      if(!orig){orig={};ms.forEach(function(m){orig[m.name]={b:m.pbrMetallicRoughness.baseColorFactor.slice(),e:(m.emissiveFactor||[0,0,0]).slice()};});}
      var hi=k>=0?S[k].m:null;
      ms.forEach(function(m){var g=orig[m.name];if(!g)return;var b=g.b.slice(),e=g.e.slice(),ves=/aorta|pulm|svc/.test(m.name);
        if(k>=0&&!ves){b[3]=m.name===hi?0.62:0.25;}
        if(k>=0&&m.name===hi)e=[Math.min(1,b[0]*0.75+0.1),b[1]*0.6,b[2]*0.6];
        m.pbrMetallicRoughness.setBaseColorFactor(b);if(m.setEmissiveFactor)m.setEmissiveFactor(e);m.setAlphaMode(b[3]<1?'BLEND':'OPAQUE');});
    }
    function show(k){
      var s=S[k];cur=k;
      cap.querySelector('.ftag').innerHTML=TAG[s.c];cap.querySelector('.ftag').className='ftag '+s.c;
      cap.querySelector('.fnum').textContent=(k+1)+'/'+S.length;cap.querySelector('.fstep b').textContent=s.ar;cap.querySelector('.fstep .fr').textContent=s.fr;
      cap.querySelector('.fnote').textContent=s.n;
      orgs.forEach(function(x){x.e.classList.toggle('on',x.o===s.o);});
      mats(k);
    }
    function frame(now){
      raf=0;if(!on)return;var dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
      if(goal!=null){T+=dt;if(T>=goal){T=goal;goal=null;}}else if(play)T=(T+dt)%CYC;
      for(var i=0;i<N;i++){var q=at(i%2,((T-i*CYC/N)%CYC+CYC)%CYC),d=dots[i];
        mv.updateHotspot({name:d.n,position:q.x+'m '+q.y+'m '+q.z+'m'});
        var c=[0,1,2].map(function(j){return Math.round(BLUE[j]+(RED[j]-BLUE[j])*q.o);}).join(',');
        if(c!==d.c){d.c=c;d.e.style.background='rgb('+c+')';}
        if(i===0&&q.k!==cur)show(q.k);}
      if(play||goal!=null)raf=requestAnimationFrame(frame);
    }
    function kick(){last=0;if(!raf)raf=requestAnimationFrame(frame);}
    function setPlay(p){play=p;goal=null;bPlay.textContent=p?'⏸ وقّف':'▶ كمّل';cap.setAttribute('aria-live',p?'off':'polite');kick();}
    function start(){
      on=true;bFlow.classList.add('on');bFlow.setAttribute('aria-pressed','true');cap.hidden=false;stage.classList.add('flowing');
      if(mv.hasAttribute('auto-rotate')&&o.bRot)o.bRot.click();
      if(o.bVes&&stage.classList.contains('vlabels'))o.bVes.click();
      mv.interactionPrompt='none';mv.cameraTarget='0m 0m 0m';mv.cameraOrbit='0deg 82deg 138%';
      for(var i=0;i<N;i++){var e=el('div','fdot'+(i?'':' guide'));e.slot='hotspot-fd'+i;e.setAttribute('data-position','0m 0m 0m');e.setAttribute('aria-hidden','true');mv.appendChild(e);dots.push({e:e,n:'hotspot-fd'+i,c:''});}
      ORG.forEach(function(g,i){var e=el('div','forg '+g[0],'<span>'+g[1]+'</span><small>'+g[2]+'</small>');e.slot='hotspot-fo'+i;e.setAttribute('data-position',g[3].map(function(v){return v+'m';}).join(' '));e.setAttribute('aria-hidden','true');mv.appendChild(e);orgs.push({e:e,o:g[0]});});
      cur=-1;setPlay(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches));if(!play)show(stepAt(T));
    }
    function stop(){
      on=false;if(raf)cancelAnimationFrame(raf);raf=0;goal=null;
      dots.concat(orgs).forEach(function(d){d.e.remove();});dots=[];orgs=[];
      bFlow.classList.remove('on');bFlow.setAttribute('aria-pressed','false');cap.hidden=true;stage.classList.remove('flowing');
      mats(-1);if(o.bSee&&o.bSee.getAttribute('aria-pressed')==='true')o.see(true);
    }
    bFlow.addEventListener('click',function(){
      if(on)return stop();
      if(mv.model&&mv.loaded!==false)start();else mv.addEventListener('load',function(){if(!on)start();},{once:true});
    });
    bPlay.addEventListener('click',function(){setPlay(!play);});
    bNext.addEventListener('click',function(){
      if(play)setPlay(false);var k=stepAt(T);if(goal==null&&ST[k]-T<0.05)k=(k+1)%S.length;
      if(k===0&&T>ST[0])T=0;goal=ST[k]-0.02;kick();
    });
  };
})();
