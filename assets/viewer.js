(function(){
  var me=document.currentScript,base=new URL('../vendor/',me.src).href,root=new URL('../',me.src).href;
  var M={"heart": {"src": "models/heart.glb", "orbit": "0deg 80deg 125%", "spin": true, "vcol": {"aorta": [0.9, 0.08, 0.08], "pulm_trunk": [0.42, 0.3, 0.9], "svc": [0.1, 0.2, 0.68], "pulm_veins": [0.95, 0.36, 0.52]}, "title": "القلب 3D", "fr": "Le cœur", "see": ["RA", "RV", "LA", "LV", "rest"], "hint": "حرّك بإصبع وحدة، كبّر بإصبعين. كبس «شوف جوّا» لتبيّن الصمامات.", "hs": [{"key": "RA", "ar": "الأذين الأيمن", "fr": "Oreillette droite", "pos": [-0.0517, -0.0161, 0.0327], "normal": [-0.849, 0.121, 0.515], "desc": "بيستقبل الدم بلا أوكسجين من الـ veines caves"}, {"key": "RV", "ar": "البطين الأيمن", "fr": "Ventricule droit", "pos": [-0.0147, -0.0297, 0.0589], "normal": [-0.406, 0.002, 0.914], "desc": "بيضخّ الدم عالرية بالـ artère pulmonaire"}, {"key": "LA", "ar": "الأذين الأيسر", "fr": "Oreillette gauche", "pos": [0.0235, 0.0035, -0.0283], "normal": [0.843, -0.072, -0.532], "desc": "بيستقبل الدم مع أوكسجين من الـ veines pulmonaires"}, {"key": "LV", "ar": "البطين الأيسر", "fr": "Ventricule gauche", "pos": [0.0516, -0.0427, 0.016], "normal": [0.976, 0.076, -0.206], "desc": "جدارو الأسمك — بيضخّ لكل الجسم بالـ aorte"}, {"key": "aorta", "ves": "#e11d1d", "lab": "الشريان الأبهر – Aorte", "ar": "الأبهر", "fr": "Aorte", "pos": [-0.0064, 0.0693, -0.0144], "normal": [-0.163, 0.981, -0.107], "desc": "أكبر شريان — بيطلع من البطين الأيسر"}, {"key": "pt", "ves": "#6d4fe0", "lab": "الشريان الرئوي – Tronc pulmonaire", "ar": "الشريان الرئوي", "fr": "Tronc pulmonaire", "pos": [0.0051, 0.028, 0.0393], "normal": [-0.098, 0.737, 0.668], "desc": "من البطين الأيمن للرية"}, {"key": "svc", "ves": "#1e3a9e", "lab": "الأجوف العلوي – Veine cave sup.", "ar": "الوريد الأجوف العلوي", "fr": "Veine cave supérieure", "pos": [-0.0481, 0.0518, 0.0066], "normal": [-0.994, 0.058, 0.093], "desc": "بيرجّع الدم من فوق (الراس والإيدين)"}, {"key": "ivc", "ves": "#1e3a9e", "lab": "الأجوف السفلي – Veine cave inf.", "ar": "الوريد الأجوف السفلي", "fr": "Veine cave inférieure", "pos": [-0.0458, -0.0632, 0.0126], "normal": [-0.699, -0.011, 0.715], "desc": "بيرجّع الدم من تحت (البطن والإجرين)"}, {"key": "pv", "ves": "#ec4f7a", "lab": "الأوردة الرئوية – Veines pulmonaires", "ar": "الأوردة الرئوية", "fr": "Veines pulmonaires", "pos": [0.0347, -0.0115, -0.0434], "normal": [0.45, 0.0, -0.89], "desc": "بترجّع الدم مع أوكسجين من الرية عالأذين الأيسر (من ورا)"}, {"key": "rca", "ar": "الشريان التاجي الأيمن", "fr": "Artère coronaire droite", "pos": [-0.0378, -0.0284, 0.0489], "normal": [-0.926, 0.166, 0.339], "desc": "بيغذّي القلب اليمين — انسدادو = infarctus"}, {"key": "lad", "ar": "الشريان التاجي الأمامي النازل", "fr": "Artère interventriculaire antérieure (IVA)", "pos": [0.038, -0.032, 0.0556], "normal": [-0.185, 0.086, 0.979], "desc": "فرع من التاجي الأيسر — انسدادو = جلطة كبيرة بالبطين الأيسر"}, {"key": "v_tri", "ar": "الصمام ثلاثي الشرف", "fr": "Valve tricuspide", "pos": [-0.0223, -0.0336, 0.0238], "normal": null, "desc": "بين الأذين والبطين الأيمن (جوّا — كبس «شوف جوّا»)"}, {"key": "v_mit", "ar": "الصمام التاجي", "fr": "Valve mitrale", "pos": [0.0087, -0.0278, -0.0009], "normal": null, "desc": "بين الأذين والبطين الأيسر (جوّا — كبس «شوف جوّا»)"}, {"key": "v_aor", "ar": "الصمام الأبهري", "fr": "Valve aortique", "pos": [-0.0012, -0.003, 0.0095], "normal": null, "desc": "بين البطين الأيسر والأبهر (جوّا — كبس «شوف جوّا»)"}, {"key": "v_pul", "ar": "الصمام الرئوي", "fr": "Valve pulmonaire", "pos": [0.004, 0.0062, 0.0329], "normal": null, "desc": "بين البطين الأيمن والشريان الرئوي (جوّا — كبس «شوف جوّا»)"}]}, "brain": {"src": "models/brain.glb", "orbit": "90deg 75deg 110%", "title": "الدماغ 3D", "fr": "Le cerveau", "see": [], "hint": "الألوان: جبهي برتقاني، جداري أزرق، صدغي أخضر، قذالي بنفسجي، المخيخ أصفر، جذع الدماغ بنّي.", "hs": [{"key": "frontal", "ar": "الفص الجبهي", "fr": "Lobe frontal", "pos": [0.0334, 0.0467, 0.0684], "normal": [0.758, 0.365, 0.541], "desc": "الحركة الإرادية، التفكير والشخصية، والكلام"}, {"key": "parietal", "ar": "الفص الجداري", "fr": "Lobe pariétal", "pos": [0.041, 0.057, -0.0502], "normal": [-0.032, 0.91, -0.413], "desc": "الإحساس (لمس، وجع، حرارة)"}, {"key": "temporal", "ar": "الفص الصدغي", "fr": "Lobe temporal", "pos": [0.0641, -0.0102, 0.0013], "normal": [0.708, -0.693, -0.135], "desc": "السمع والذاكرة"}, {"key": "occipital", "ar": "الفص القذالي", "fr": "Lobe occipital", "pos": [0.0244, -0.0043, -0.0866], "normal": [0.37, -0.065, -0.927], "desc": "النظر"}, {"key": "cerebellum", "ar": "المخيخ", "fr": "Cervelet", "pos": [0.022, -0.0482, -0.0593], "normal": [0.139, -0.86, -0.49], "desc": "التوازن والتنسيق — مشكلتو = ترنّح بالمشي"}, {"key": "midbrain", "ar": "الدماغ المتوسط", "fr": "Mésencéphale", "pos": [0.0048, -0.0033, 0.0155], "normal": [0.229, -0.166, 0.959], "desc": "جزء من جذع الدماغ"}, {"key": "pons", "ar": "الجسر", "fr": "Pont (protubérance)", "pos": [0.0008, -0.0282, 0.0127], "normal": [-0.394, -0.427, 0.814], "desc": "جزء من جذع الدماغ"}, {"key": "medulla", "ar": "البصلة", "fr": "Bulbe rachidien", "pos": [0.001, -0.0528, -0.0013], "normal": [-0.417, -0.59, 0.692], "desc": "مراكز التنفّس ودقات القلب — انحشار الدماغ عليها (HTIC) خطر موت"}]}, "spine": {"src": "models/spine.glb", "orbit": "150deg 80deg 105%", "title": "العمود القطني 3D", "fr": "La colonne lombaire", "see": [], "hint": "من T12 لـ Sacrum. الأقراص الزرقا = L3–L4 و L4–L5 (مكان البزل القطني).", "hs": [{"key": "L3L4", "ar": "بين L3 و L4", "fr": "Espace L3–L4", "pos": [0.0001, 0.0222, -0.0305], "normal": [0, 0, -1], "desc": "✅ مكان الـ ponction lombaire (البزل القطني) — تحت آخر النخاع الشوكي، فما في خطر نأذيه"}, {"key": "L4L5", "ar": "بين L4 و L5", "fr": "Espace L4–L5", "pos": [-0.0001, -0.0005, -0.036199999999999996], "normal": [0, 0, -1], "desc": "✅ كمان مكان للبزل القطني"}, {"key": "L1L2", "ar": "بين L1 و L2", "fr": "Espace L1–L2", "pos": [0.0005, 0.0717, -0.0266], "normal": [0, 0, -1], "desc": "⛔ هون تقريباً بيخلص النخاع الشوكي (moelle épinière) — ما منبزل فوق هون"}, {"key": "L1", "ar": "الفقرة القطنية الأولى L1", "fr": "Vertèbre lombaire L1", "pos": [0.0344, 0.1066, 0.0037], "normal": [0.801, -0.39, 0.453], "desc": "جسم الفقرة لقدّام، والشوكة لورا"}, {"key": "L3", "ar": "الفقرة القطنية التالتة L3", "fr": "Vertèbre lombaire L3", "pos": [0.039, 0.0519, 0.0119], "normal": [0.803, -0.481, 0.353], "desc": "جسم الفقرة لقدّام، والشوكة لورا"}, {"key": "L5", "ar": "الفقرة القطنية الخامسة L5", "fr": "Vertèbre lombaire L5", "pos": [0.0494, -0.0024, 0.0008], "normal": [0.855, -0.475, -0.21], "desc": "جسم الفقرة لقدّام، والشوكة لورا"}, {"key": "sacrum", "ar": "العجز", "fr": "Sacrum", "pos": [-0.0, -0.0819, -0.0601], "normal": [0.012, -0.135, -0.991], "desc": "تحت L5 — آخر العمود مع العصعص"}, {"key": "disc", "ar": "القرص بين الفقرات", "fr": "Disque intervertébral", "pos": [0.0074, 0.033, 0.0572], "normal": [-0.536, -0.601, 0.593], "desc": "بالأزرق: قرص L3–L4 و L4–L5. انزلاقو لورا = hernie discale ← عملية laminectomie"}]}};
  var loading=null;
  function loadMV(){
    if(loading)return loading;
    loading=(async function(){
      if(!customElements.get('model-viewer')){
        try{
          var r=await fetch(base+'model-viewer.min.js.bin');if(!r.ok)throw new Error('nobin');
          var buf=await r.arrayBuffer(),u8=new Uint8Array(buf),text;
          if(u8[0]===0x1f&&u8[1]===0x8b){if(!('DecompressionStream' in window))throw new Error('nods');text=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
          else text=new TextDecoder().decode(u8);
          var url=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
          await import(url);
        }catch(e){await import(base+'model-viewer.min.js');}
      }
      var MV=customElements.get('model-viewer');MV.meshoptDecoderLocation=base+'meshopt_decoder.js';
    })();
    return loading;
  }
  function el(t,a,h){var e=document.createElement(t);if(a)for(var k in a)e.setAttribute(k,a[k]);if(h!=null)e.innerHTML=h;return e;}
  function build(box){
    var key=box.dataset.model,c=M[key];if(!c)return;
    box.innerHTML='';
    var head=el('div',{'class':'vhead'},'<h2>🧊 '+c.title+' <span class="fr" lang="fr">'+c.fr+'</span></h2>');
    var stage=el('div',{'class':'stage'});
    var msg=el('div',{'class':'vload'},'⏳ عم يحمّل المجسّم…');
    stage.appendChild(msg);
    var info=el('div',{'class':'vinfo'},'<span class="small">👆 كبس على رقم أو على اسم تحت لتعرف شو هوّي.</span>');
    var tools=el('div',{'class':'vtools'});
    var bReset=el('button',{'class':'btn',type:'button'},'↺ رجّع الوضع');
    var bLab=el('button',{'class':'btn',type:'button','aria-pressed':'false'},'🏷️ كل الأسماء');
    var bRot=el('button',{'class':'btn',type:'button','aria-pressed':'false'},'⟳ لفّ لحالو');
    tools.appendChild(bReset);tools.appendChild(bLab);tools.appendChild(bRot);
    var hasVes=c.hs.some(function(h){return h.ves;}),bVes=null;
    if(hasVes){bVes=el('button',{'class':'btn on',type:'button','aria-pressed':'true'},'🏷️ الأسماء');tools.insertBefore(bVes,bLab);stage.classList.add('vlabels');}
    var bSee=null;if(c.see.length){bSee=el('button',{'class':'btn',type:'button','aria-pressed':'false'},'👁 شوف جوّا');tools.appendChild(bSee);}
    var leg=el('ol',{'class':'legend'});
    box.appendChild(head);box.appendChild(stage);box.appendChild(tools);box.appendChild(info);box.appendChild(leg);
    box.appendChild(el('p',{'class':'hint'},c.hint));
    loadMV().then(function(){
      var mv=el('model-viewer',{dir:'ltr',src:root+c.src,'camera-controls':'','touch-action':'pan-y','camera-orbit':c.orbit,'interaction-prompt':'auto','shadow-intensity':'0.6','exposure':'1.05','environment-image':'neutral','min-camera-orbit':'auto auto 40%','max-camera-orbit':'auto auto 250%',alt:c.title+' — مجسّم ثلاثي الأبعاد',loading:'lazy','interpolation-decay':'120'});
      var btns=[];
      c.hs.forEach(function(h,i){
        var a={'class':'hs',slot:'hotspot-'+h.key,'data-position':h.pos.map(function(v){return v+'m';}).join(' '),type:'button','aria-label':h.ar};
        if(h.normal)a['data-normal']=h.normal.join(' ');
        if(h.ves)a['class']+=' ves';
        var b=el('button',a,(i+1)+'<span class="lbl" dir="rtl">'+h.ar+'</span>'+(h.ves?'<span class="vlbl" dir="rtl" style="border-color:'+h.ves+'">'+(window.Lang&&Lang.fr?'':h.lab.split(' – ')[0]+' – ')+'<bdi dir="ltr" lang="fr">'+h.lab.split(' – ')[1]+'</bdi></span>':''));
        b.addEventListener('click',function(ev){ev.stopPropagation();pick(i,false);});
        mv.appendChild(b);btns.push(b);
        var li=el('li'),lb=el('button',{type:'button'},'<span class="num">'+(i+1)+'</span><span><b>'+h.ar+'</b><br><span class="fr" lang="fr">'+h.fr+'</span></span>');
        lb.addEventListener('click',function(){pick(i,true);});li.appendChild(lb);leg.appendChild(li);
      });
      function pick(i,move){
        var h=c.hs[i];
        btns.forEach(function(b,k){b.classList.toggle('on',k===i);});
        leg.querySelectorAll('button').forEach(function(b,k){b.classList.toggle('on',k===i);});
        info.innerHTML='<b>'+(i+1)+'. '+h.ar+'</b> <span class="fr" lang="fr">'+h.fr+'</span>'+(h.desc?'<br>'+h.desc:'');
        if(bSee&&!h.normal&&bSee.getAttribute('aria-pressed')!=='true')see(true);
        if(move){
          mv.cameraTarget=h.pos.map(function(v){return v+'m';}).join(' ');
          if(h.normal){var n=h.normal,th=Math.atan2(n[0],n[2]),ph=Math.acos(Math.max(-1,Math.min(1,n[1])));ph=Math.max(0.35,Math.min(2.8,ph));mv.cameraOrbit=th+'rad '+ph+'rad 70%';}
          else mv.cameraOrbit='auto auto 70%';
          stage.scrollIntoView({block:'nearest',behavior:'smooth'});
        }
      }
      function see(on){
        if(!mv.model)return;
        mv.model.materials.forEach(function(m){if(c.see.indexOf(m.name)<0)return;var f=m.pbrMetallicRoughness.baseColorFactor.slice();f[3]=on?0.22:1;m.pbrMetallicRoughness.setBaseColorFactor(f);m.setAlphaMode(on?'BLEND':'OPAQUE');});
        bSee.setAttribute('aria-pressed',on?'true':'false');bSee.classList.toggle('on',on);
      }
      if(bSee)bSee.addEventListener('click',function(){see(bSee.getAttribute('aria-pressed')!=='true');});
      if(key==='heart'&&window.nursinFlow)window.nursinFlow({mv:mv,stage:stage,tools:tools,bRot:bRot,bSee:bSee,bVes:bVes,see:see});   // 🩸 مسار الدم (assets/flow.js, 3d.html)
      bReset.addEventListener('click',function(){mv.cameraTarget='auto auto auto';mv.cameraOrbit=c.orbit;mv.fieldOfView='auto';if(bSee)see(false);});
      bLab.addEventListener('click',function(){var on=stage.classList.toggle('showlabels');bLab.classList.toggle('on',on);bLab.setAttribute('aria-pressed',on?'true':'false');});
      bRot.addEventListener('click',function(){var on=!mv.hasAttribute('auto-rotate');if(on)mv.setAttribute('auto-rotate','');else mv.removeAttribute('auto-rotate');bRot.classList.toggle('on',on);bRot.setAttribute('aria-pressed',on?'true':'false');});
      if(c.spin){mv.setAttribute('auto-rotate','');mv.setAttribute('auto-rotate-delay','3000');mv.setAttribute('rotation-per-second','12deg');bRot.classList.add('on');bRot.setAttribute('aria-pressed','true');}
      // a vessel label shows only while its side faces the camera (works on every model-viewer build)
      function faceVes(){var o=mv.getCameraOrbit(),st=Math.sin(o.phi),d=[Math.sin(o.theta)*st,Math.cos(o.phi),Math.cos(o.theta)*st];
        c.hs.forEach(function(h,i){if(!h.ves||!h.normal)return;var n=h.normal;btns[i].classList.toggle('back',n[0]*d[0]+n[1]*d[1]+n[2]*d[2]<-0.05);});}
      if(hasVes)mv.addEventListener('camera-change',faceVes);
      if(bVes)bVes.addEventListener('click',function(){var on=stage.classList.toggle('vlabels');bVes.classList.toggle('on',on);bVes.setAttribute('aria-pressed',on?'true':'false');});
      mv.addEventListener('load',function(){
        msg.remove();box.dataset.loaded='1';
        // whole model framed from the first frame (no zoomed-in start)
        mv.cameraTarget='auto auto auto';mv.cameraOrbit=c.orbit;if(mv.jumpCameraToGoal)mv.jumpCameraToGoal();
        // great vessels: own colours, a little brighter (3D heart, Oct 25)
        if(c.vcol&&mv.model)mv.model.materials.forEach(function(m){var col=c.vcol[m.name];if(!col)return;m.pbrMetallicRoughness.setBaseColorFactor([col[0],col[1],col[2],1]);if(m.setEmissiveFactor)m.setEmissiveFactor([col[0]*0.28,col[1]*0.28,col[2]*0.28]);});
      });
      mv.addEventListener('error',function(){msg.textContent='⚠️ ما قدر يحمّل المجسّم. جرّب تحدّث الصفحة.';});
      stage.appendChild(mv);
    }).catch(function(){msg.textContent='⚠️ المتصفح قديم وما بيدعم الـ 3D. حدّث المتصفح (Chrome أو Safari).';});
  }
  function go(){document.querySelectorAll('.viewer[data-model]').forEach(build);}
  if(window.nursin3dGate&&window.nursin3dGate.then)window.nursin3dGate.then(go);else go();   // 3d.html: after the short ad screen (assets/gate3d.js)
})();