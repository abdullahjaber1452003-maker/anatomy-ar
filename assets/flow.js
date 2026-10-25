/* 🩸 Blood flow (Oct 25): a liquid stream follows the real path on the 3D heart + a whole-body figure beside it, blue → red at the lungs, Ar–Fr step captions, 🐢 speed. */
(function(){
  'use strict';
  var BLUE=[37,99,235],RED=[220,38,38],NS='http://www.w3.org/2000/svg',SK='nursin_flow_speed';
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
  function stepAt(t){for(var k=0;k<S.length;k++)if(t<ST[k])return k;return S.length-1;}
  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
  function sv(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
  function col(o){return 'rgb('+[0,1,2].map(function(j){return Math.round(BLUE[j]+(RED[j]-BLUE[j])*o);}).join(',')+')';}
  function f1(v){return Math.round(v*10)/10;}
  // oxygen per point of a 14-step route: blue until the lungs, red from the pulmonary veins to the aorta, blue again after the organs
  function oxy(steps,k,i){var n=steps[k].length;if(k<6)return 0;if(k===6)return Math.min(1,(i+1)/n*1.15);if(k<13)return 1;return Math.max(0,1-(i+1)/Math.max(1,n-1)*1.2);}
  function route(steps){var p=[steps[13][steps[13].length-1]],o=[0],g=[13];steps.forEach(function(w,k){w.forEach(function(q,i){p.push(q);o.push(oxy(steps,k,i));g.push(k);});});return {p:p,o:o,g:g,closed:1};}

  /* 💧 liquid renderer: translucent vessel glow + coloured core + white streaks that flow (dash offset) + a bright bolus at the current step */
  function Liquid(svg,dyn,W){ // svg = static vessels (painted once), dyn = moving streaks + bolus (its own layer, the only thing repainted per frame)
    var L={W:W,tr:[],gw:sv('g',{'class':'lw',fill:'none','stroke-linecap':'round','stroke-linejoin':'round','stroke-width':f1(W*2.3)},svg),gc:sv('g',{'class':'lc',fill:'none','stroke-linecap':'round','stroke-linejoin':'round','stroke-width':f1(W)},svg),
      gs:sv('g',{'class':'ls',fill:'none',stroke:'rgba(255,255,255,.6)','stroke-linecap':'round','stroke-dasharray':f1(W*.9)+' '+f1(W*2.2)},dyn),gb:sv('g',{'class':'lb',fill:'none','stroke-linecap':'round'},dyn),uid:0};
    L.add=function(t){ // t: {p:[[x,y]..], o:[..], g:[step..], closed, bolus}
      t.seg=[];for(var i=1;i<t.o.length;i++){var a=t.o[i-1],b=t.o[i],c=Math.abs(a-b)<0.02,gid=null;
        if(!c){gid='fg'+(++L.uid)+Math.random().toString(36).slice(2,6);var gr=sv('linearGradient',{id:gid,gradientUnits:'userSpaceOnUse'},svg);sv('stop',{offset:'0','stop-color':col(a)},gr);sv('stop',{offset:'1','stop-color':col(b)},gr);}
        var s=c?col(a):'url(#'+gid+')';t.seg.push({g:t.g[i],gr:gid?svg.querySelector('#'+gid):null,w:sv('path',{stroke:s},L.gw),c:sv('path',{stroke:s},L.gc)});}
      t.st=sv('path',{},L.gs);
      if(t.bolus){t.h=sv('path',{'stroke-width':f1(W*2.6),opacity:'0'},L.gb);t.b=sv('path',{stroke:'rgba(255,255,255,.9)','stroke-width':f1(W*.75),opacity:'0'},L.gb);}
      L.tr.push(t);if(!t.ix)L.geo(t,t.p);return t;};
    L.geo=function(t,P){ // Catmull-Rom → cubic Béziers, lengths for the bolus
      var n=P.length,full='',len=[0];
      function nb(i){if(t.closed){if(i<0)return P[n-2];if(i>=n)return P[1];}return P[Math.max(0,Math.min(n-1,i))];}
      for(var i=0;i<n-1;i++){var p0=nb(i-1),p1=P[i],p2=P[i+1],p3=nb(i+2),
        c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6],
        d='C'+f1(c1[0])+','+f1(c1[1])+' '+f1(c2[0])+','+f1(c2[1])+' '+f1(p2[0])+','+f1(p2[1]),m='M'+f1(p1[0])+','+f1(p1[1]),s=t.seg[i];
        s.w.setAttribute('d',m+d);s.c.setAttribute('d',m+d);full+=(i?'':m)+d;
        if(s.gr){s.gr.setAttribute('x1',f1(p1[0]));s.gr.setAttribute('y1',f1(p1[1]));s.gr.setAttribute('x2',f1(p2[0]));s.gr.setAttribute('y2',f1(p2[1]));}
        var l=0,q=p1;for(var j=1;j<=6;j++){var u=j/6,v=1-u,x=v*v*v*p1[0]+3*v*v*u*c1[0]+3*v*u*u*c2[0]+u*u*u*p2[0],y=v*v*v*p1[1]+3*v*v*u*c1[1]+3*v*u*u*c2[1]+u*u*u*p2[1];l+=Math.hypot(x-q[0],y-q[1]);q=[x,y];}
        len.push(len[i]+l);}
      t.len=len;t.st.setAttribute('d',full);if(t.b){t.b.setAttribute('d',full);t.h.setAttribute('d',full);}};
    L.hi=function(k){L.tr.forEach(function(t){t.seg.forEach(function(s){var on=s.g===k;s.w.classList.toggle('hi',on);s.c.classList.toggle('hi',on);});});};
    L.draw=function(k,u,r,off,p){ // step, fraction in step, route for the bolus, streak offset, heartbeat 0..1
      L.gs.setAttribute('stroke-width',f1(L.W*(.36+.3*p)));L.gs.setAttribute('stroke-dashoffset',f1(-off));
      L.tr.forEach(function(t){if(!t.b||!t.len)return;var show=t.r===r?'1':'0';
        if(t.b.getAttribute('opacity')!==show)t.b.setAttribute('opacity',show);t.h.setAttribute('opacity',show==='1'?f1(.3+.35*p):'0');
        if(show==='0')return;var a=-1,z=-1;t.seg.forEach(function(s,i){if(s.g===k){if(a<0)a=i;z=i;}});if(a<0)return;
        var s0=t.len[a],s1=t.len[z+1],pos=s0+(s1-s0)*u,B=L.W*4.5,tot=t.len[t.len.length-1],i=a;while(i<z&&t.len[i+1]<pos)i++;
        var f=(pos-t.len[i])/((t.len[i+1]-t.len[i])||1),c=col(t.o[i]+(t.o[i+1]-t.o[i])*f);
        [t.b,t.h].forEach(function(e){e.setAttribute('stroke-dasharray',f1(B)+' '+f1(tot+B));e.setAttribute('stroke-dashoffset',f1(B/2-pos));});
        if(t.hc!==c){t.hc=c;t.h.setAttribute('stroke',c);}});};
    return L;
  }

  /* 🧍 body figure (front view, 200×420): silhouette, lungs, heart, the same 14 steps on two routes (A: right lung + head, B: left lung + legs) */
  var H=[[[97,144]],[[99,152]],[[102,160],[106,156]],[[106,146]]];
  var BA=[[[93,104],[95,132]]].concat(H,[[[104,130],[96,120],[84,118]],[[74,118],[70,134],[78,146],[86,134]],[[98,130],[108,134]],[[112,138]],[[113,146]],[[114,158],[110,162]],[[103,142]],[[102,126],[101,108],[103,96],[104,78],[104,62]],[[106,50],[100,38],[94,50],[95,66],[94,84]]]);
  var BB=[[[95,190],[96,160]]].concat(H,[[[106,128],[114,118],[122,116]],[[128,118],[132,132],[126,144],[119,136]],[[120,132],[112,134]],[[112,138]],[[113,146]],[[114,158],[110,162]],[[103,142]],[[102,126],[101,108],[106,100],[110,110],[109,150],[108,200],[106,224],[112,240],[114,300],[116,350],[116,385]],[[119,398],[114,404],[110,394],[109,350],[108,300],[106,245],[96,226]]]);
  // other vessels (arms, the other leg): arteries are step 12, capillaries + veins step 13
  var EX=[[[101,100],[88,86],[70,90],[60,130],[52,180],[44,230]],[[44,230],[40,244],[46,250],[50,230],[57,180],[64,130],[74,104],[90,102],[94,106]],
    [[104,98],[118,86],[132,90],[142,130],[150,180],[158,230]],[[158,230],[160,244],[154,250],[150,230],[143,180],[136,130],[126,104],[110,101],[96,106]],
    [[106,224],[92,240],[86,300],[84,350],[84,385]],[[84,385],[81,398],[86,404],[90,394],[91,350],[92,300],[94,245],[96,226]]];
  var HALF=[[100,62],[108,63],[109,78],[132,84],[146,93],[152,122],[158,170],[164,214],[169,240],[163,258],[155,250],[153,230],[146,190],[140,142],[134,120],[132,160],[128,200],[134,232],[131,300],[125,332],[124,372],[121,396],[131,408],[108,411],[110,380],[107,330],[105,262],[100,252]];
  function smooth(P){var n=P.length,d='M'+P[0].join(',');for(var i=0;i<n;i++){var p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];
    d+='C'+f1(p1[0]+(p2[0]-p0[0])/6)+','+f1(p1[1]+(p2[1]-p0[1])/6)+' '+f1(p2[0]-(p3[0]-p1[0])/6)+','+f1(p2[1]-(p3[1]-p1[1])/6)+' '+p2.join(',');}return d+'Z';}
  // wider figure (Oct 25): x spreads from the midline (×1.15 near it so the heart stays heart-shaped, ×1.5 further out), arteries and veins pushed apart so each stream has its own lane
  function wx(x){var a=Math.abs(x-100),s=x<100?-1:1;return 100+s*(Math.min(a,14)*1.15+Math.max(a-14,0)*1.5);}
  function cl(v){return Math.max(0,Math.min(1,v));}
  function wide(t){t.p=t.p.map(function(q,i){var x=q[0],y=q[1],k=t.g[i],o=t.o[i],sd=x<100?-1:x>100?1:0,X=wx(x),Y=y;
      if(k===5)Y-=4;else if(k===7)Y+=4; // pulmonary artery above, pulmonary veins below
      else if(k===0||k>=12){var w=Math.max(cl((Math.abs(x-100)-16)/14),cl((y-205)/25));
        X+=sd*((1-w)*2.5+w*(2*o-1)*4.5+(y>215?4*cl((y-215)/20):0));} // trunk: aorta right, cavae left; limbs: artery outside, vein inside
      return [f1(X),Y];});return t;}
  function body(box){
    var vb='-6 14 212 402',w=el('div','fbw'),svg=sv('svg',{viewBox:vb,'class':'fbs',role:'img','aria-label':'جسم الإنسان: الدم من القلب للرئتين ولكل الجسم'},w),dyn=sv('svg',{viewBox:vb,'class':'fdyn','aria-hidden':'true'},null);
    var sil=HALF.concat(HALF.slice(1,-1).reverse().map(function(p){return [200-p[0],p[1]];})).map(function(p){return [f1(wx(p[0])),p[1]];});
    function ell(c,cx,cy,rx,ry,rot){var a={'class':c,cx:f1(wx(cx)),cy:cy,rx:f1((wx(cx+rx)-wx(cx-rx))/2),ry:ry};if(rot)a.transform='rotate('+rot+' '+a.cx+' '+cy+')';return sv('ellipse',a,svg);}
    ell('bsil',100,40,21,25);sv('path',{'class':'bsil',d:smooth(sil)},svg);
    ell('blung',77,134,15,27,7);ell('blung',125,133,13,26,-7);
    sv('path',{'class':'bheart',d:'M104 133C96 128 89 134 91 144C93 154 103 163 112 167C119 160 123 150 121 141C119 132 110 129 104 133Z'.replace(/(\d+) (\d+)/g,function(m,x,y){return f1(wx(+x))+' '+y;})},svg);
    [['RA',97,145,6.5,8],['RV',103,156,7,6.5],['LA',112,138,6.5,5.5],['LV',114,153,6,8.5]].forEach(function(c){ell('bch',c[1],c[2],c[3],c[4]).setAttribute('data-c',c[0]);});
    var L=Liquid(svg,dyn,3.8);
    [BA,BB].forEach(function(r,k){var t=wide(route(r));t.bolus=1;t.r=k;L.add(t);});
    EX.forEach(function(p,k){var art=k%2===0;L.add(wide({p:p,o:p.map(function(_,i){return art?1:(i<2?[0.65,0.3][i]:0);}),g:p.map(function(){return art?12:13;}),bolus:0}));});
    [['الراس',140,30],['الرئتين',172,96],['القلب',156,170],['الإيد',196,272],['الإجر',168,404]].forEach(function(l){var t=sv('text',{'class':'blab',x:l[1],y:l[2],'text-anchor':'middle'},svg);t.textContent=l[0];});
    w.appendChild(dyn);box.appendChild(w);L.svg=svg;return L;
  }

  window.nursinFlow=function(o){
    var mv=o.mv,stage=o.stage,on=false,play=true,T=0,goal=null,last=0,raf=0,cur=-1,orgs=[],orig=null,anc=[],HL=null,BL=null,ov=null,lap=0,off=0,beat=0,dirty=0,spd=0.5,fb=null;
    try{var sp=parseFloat(localStorage.getItem(SK));if(sp>=0.25&&sp<=1.5)spd=sp;}catch(e){}
    var bFlow=el('button','btn flowbtn','🩸 مسار الدم');bFlow.type='button';bFlow.setAttribute('aria-pressed','false');o.tools.appendChild(bFlow);
    var cap=el('div','fcap');cap.dir='rtl';cap.hidden=true;
    cap.innerHTML='<div class="ftag"></div><div class="fstep"><bdi class="fnum" dir="ltr"></bdi> <b></b> <span class="fr" lang="fr" dir="ltr"></span></div><div class="fnote"></div>'+
      '<div class="fctl"><button type="button" class="btn fplay">⏸ وقّف</button><button type="button" class="btn fnext">التالي ▶</button>'+
      '<label class="fspd">🐢 السرعة <input type="range" min="0.25" max="1.5" step="0.05" aria-label="السرعة"> <output dir="ltr"></output></label>'+
      '<span class="fleg"><span><i style="background:rgb('+BLUE+')"></i> بلا أوكسجين</span><span><i style="background:rgb('+RED+')"></i> فيه أوكسجين</span></span></div>';
    var box=stage.parentNode;
    var bPlay=cap.querySelector('.fplay'),bNext=cap.querySelector('.fnext'),rng=cap.querySelector('.fspd input'),out=cap.querySelector('.fspd output');
    rng.value=spd;out.textContent=spd+'×';
    rng.addEventListener('input',function(){spd=parseFloat(rng.value)||0.5;out.textContent=spd+'×';try{localStorage.setItem(SK,spd);}catch(e){}});
    function mats(k){
      if(!mv.model)return;var ms=mv.model.materials;
      if(!orig){orig={};ms.forEach(function(m){orig[m.name]={b:m.pbrMetallicRoughness.baseColorFactor.slice(),e:(m.emissiveFactor||[0,0,0]).slice()};});}
      var hi=k>=0?S[k].m:null;
      ms.forEach(function(m){var g=orig[m.name];if(!g)return;var b=g.b.slice(),e=g.e.slice(),ves=/aorta|pulm|svc/.test(m.name);
        if(k>=0){b[3]=m.name===hi?0.6:ves?0.42:0.22;}
        if(k>=0&&m.name===hi)e=[Math.min(1,b[0]*0.75+0.1),b[1]*0.6,b[2]*0.6];
        m.pbrMetallicRoughness.setBaseColorFactor(b);if(m.setEmissiveFactor)m.setEmissiveFactor(e);m.setAlphaMode(b[3]<1?'BLEND':'OPAQUE');});
    }
    var BCH={1:'RA',3:'RV',8:'LA',10:'LV'};
    function show(k){
      var s=S[k];cur=k;
      cap.querySelector('.ftag').innerHTML=TAG[s.c];cap.querySelector('.ftag').className='ftag '+s.c;
      cap.querySelector('.fnum').textContent=(k+1)+'/'+S.length;cap.querySelector('.fstep b').textContent=s.ar;cap.querySelector('.fstep .fr').textContent=s.fr;
      cap.querySelector('.fnote').textContent=s.n;
      orgs.forEach(function(x){x.e.classList.toggle('on',x.o===s.o);});
      if(HL)HL.hi(k);if(BL){BL.hi(k);BL.svg.setAttribute('class','fbs fb'+(s.o?' o-'+s.o:''));BL.svg.querySelectorAll('.bch').forEach(function(c){c.classList.toggle('hi',BCH[k]===c.getAttribute('data-c'));});}
      mats(k);
    }
    // project the 3D waypoints (static hotspot anchors) into the overlay; only when the camera moved
    function project(){
      if(!HL)return;var sr=stage.getBoundingClientRect();
      var pos=anc.map(function(a){var r=a.getBoundingClientRect();return [r.left+r.width/2-sr.left,r.top+r.height/2-sr.top];});
      ov.forEach(function(s){s.setAttribute('viewBox','0 0 '+Math.round(sr.width)+' '+Math.round(sr.height));});
      HL.tr.forEach(function(t){HL.geo(t,t.ix.map(function(i){return pos[i];}));});
    }
    function frame(now){
      raf=0;if(!on)return;var dt=last?Math.min(0.1,(now-last)/1000):0;last=now;
      var adv=dt*(goal!=null?Math.max(spd,0.6):play?spd:0);
      if(goal!=null){T+=adv;if(T>=goal){T=goal;goal=null;}}else if(play){T+=adv;if(T>=CYC){T-=CYC;lap++;}}
      beat=(beat+adv*1.2)%1;var p=beat<0.16?Math.sin(beat/0.16*Math.PI):0;off+=adv*(38+70*p);
      if(dirty>0){dirty--;project();}
      var k=stepAt(T),u=(T-S[k].t0)/(ST[k]-S[k].t0);if(k!==cur)show(k);
      if(HL)HL.draw(k,u,lap%2,off,p);if(BL)BL.draw(k,u,lap%2,off*0.62,p);
      if(play||goal!=null||dirty>0)raf=requestAnimationFrame(frame);
    }
    function kick(){last=0;if(!raf)raf=requestAnimationFrame(frame);}
    function moved(){dirty=3;kick();}
    function setPlay(p){play=p;goal=null;bPlay.textContent=p?'⏸ وقّف':'▶ كمّل';cap.setAttribute('aria-live',p?'off':'polite');kick();}
    function start(){
      on=true;bFlow.classList.add('on');bFlow.setAttribute('aria-pressed','true');cap.hidden=false;stage.classList.add('flowing');box.classList.add('flowon');
      if(mv.hasAttribute('auto-rotate')&&o.bRot)o.bRot.click();
      if(o.bVes&&stage.classList.contains('vlabels'))o.bVes.click();
      mv.interactionPrompt='none';mv.cameraTarget='0m 0m 0m';mv.cameraOrbit='0deg 82deg 138%';
      // liquid inside the heart: SVG stream over the see-through model, re-projected as you rotate
      ov=[sv('svg',{'class':'fov','aria-hidden':'true'},null),sv('svg',{'class':'fov fdyn','aria-hidden':'true'},null)];ov.forEach(function(s){stage.appendChild(s);});
      var W=Math.max(4,Math.min(6.5,stage.clientWidth/70));HL=Liquid(ov[0],ov[1],W);var key={};
      [PA,PB].forEach(function(P,r){var t=route(P);t.ix=t.p.map(function(q){var s=q.join(',');if(!(s in key)){key[s]=anc.length;var e=el('div','fanc');e.slot='hotspot-fa'+anc.length;e.setAttribute('data-position',q.map(function(v){return v+'m';}).join(' '));e.setAttribute('aria-hidden','true');mv.appendChild(e);anc.push(e);}return key[s];});
        t.bolus=1;t.r=r;HL.add(t);});
      ORG.forEach(function(g,i){var e=el('div','forg '+g[0],'<span>'+g[1]+'</span><small>'+g[2]+'</small>');e.slot='hotspot-fo'+i;e.setAttribute('data-position',g[3].map(function(v){return v+'m';}).join(' '));e.setAttribute('aria-hidden','true');mv.appendChild(e);orgs.push({e:e,o:g[0]});});
      stage.parentNode.insertBefore(cap,stage.nextSibling);
      fb=el('div','fbody','<div class="fbh">🧍 الدم بكل الجسم <span lang="fr" dir="ltr">Circulation</span></div>');cap.parentNode.insertBefore(fb,cap.nextSibling);BL=body(fb);
      mv.addEventListener('camera-change',moved);window.addEventListener('resize',moved);
      cur=-1;lap=0;setPlay(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches));dirty=8;
    }
    function stop(){
      on=false;if(raf)cancelAnimationFrame(raf);raf=0;goal=null;
      mv.removeEventListener('camera-change',moved);window.removeEventListener('resize',moved);
      anc.concat(orgs.map(function(d){return d.e;}),ov||[],[fb,cap]).forEach(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e);});anc=[];orgs=[];HL=BL=ov=fb=null;
      bFlow.classList.remove('on');bFlow.setAttribute('aria-pressed','false');cap.hidden=true;stage.classList.remove('flowing');box.classList.remove('flowon');
      mats(-1);if(o.bSee&&o.bSee.getAttribute('aria-pressed')==='true')o.see(true);
    }
    bFlow.addEventListener('click',function(){
      if(on)return stop();
      if(mv.model&&mv.loaded!==false)start();else mv.addEventListener('load',function(){if(!on)start();},{once:true});
    });
    bPlay.addEventListener('click',function(){setPlay(!play);});
    bNext.addEventListener('click',function(){
      if(play)setPlay(false);var k=stepAt(T);if(goal==null&&ST[k]-T<0.05)k=(k+1)%S.length;
      if(k===0&&T>ST[0]){T=0;lap++;}goal=ST[k]-0.02;kick();
    });
  };
})();
