/* 📚 geri.html / community.html / medsurg.html (Oct 30 2026): one renderer for the new مواد, same drawing as rea.js / quality.js.
   <div class="sublessons" data-var="GERI" data-t="geri"> → the lessons of window.GERI (assets/geri-data.js), each a <details class="topic">
   with its «📝 كويز على هالدرس», then ✂️ splitPage (assets/lessons.js). medsurg.html also gets #msgroup: the lessons of القلب /
   الأعصاب / Henderson straight from NLESSONS, linking to their own pages and anchors (URLs, ids and progress unchanged). */
(function (w, d) {
  // 30a: a Latin parenthetical in an Arabic lesson title is one LTR isolate — «(Coronarographie / Artériographie)» never wraps as «/)» … «(…»
  function bidiT(s) { return String(s).replace(/\(([^()<>\u0600-\u06FF]*[A-Za-z\u00C0-\u024F][^()<>\u0600-\u06FF]*)\)/g, '<bdi dir="ltr" class="bdl">($1)</bdi>'); }
  function FR() { return !!(w.Lang && w.Lang.fr); }
  function T(ar, fr) { return FR() && fr ? fr : ar; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lq(t, k) {
    var n = (w.QUIZ || []).filter(function (q) { return q.t === t && q.l === k; }).length;
    var c = n === 1 ? "سؤال واحد" : n === 2 ? "سؤالين" : n <= 10 ? n + " أسئلة" : n + " سؤال";
    return '<p class="lqz"><a href="quiz.html?t=' + t + '&amp;l=' + k + '">📝 كويز على هالدرس</a> <small>' + (n >= 3 ? c : n ? c + " · ما في أسئلة كافية بعد" : "ما في أسئلة كافية لهالدرس بعد") + '</small></p>';
  }
  [].slice.call(d.querySelectorAll(".sublessons[data-var]")).forEach(function (box) {
    var M = w[box.getAttribute("data-var")] || {}, L = M.lessons || [], t = box.getAttribute("data-t");
    if (!L.length) return;
    box.innerHTML = L.map(function (x, i) {
      return '<details class="topic" id="' + x.k + '"' + (i === 0 && L.length === 1 ? " open" : "") + '><summary><span class="n">' + (i + 1) + '</span><span class="t"><b>' + bidiT(x.n) + '</b><span class="small">' + (x.fr ? '<span lang="fr">' + x.fr + '</span> — ' : "") + (x.d || "") + '</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="tbody prose">' + x.html + '</div></details>' + lq(t, x.k);
    }).join("");
  });
  var g = d.getElementById("msgroup"), NL = w.NLESSONS, G = NL && NL.groups && NL.groups.medsurg;
  if (g && G) {
    g.innerHTML = G.subs.filter(function (s) { return s !== "medsurg"; }).map(function (s) {
      var S = NL.subjects[s] || {}, ls = NL.list.filter(function (x) { return x.s === s; });
      return '<details class="topic mssub"><summary><span class="n">' + esc(S.e || "📖") + '</span><span class="t"><b>' + esc(T(S.ar, S.fr)) + '</b><span class="small">' + esc(T(ls.length + " دروس", ls.length + " leçons")) + ' · <a href="' + esc(S.page) + '">' + esc(T("افتح الصفحة", "Ouvrir la page")) + ' ›</a></span></span><span class="chev" aria-hidden="true">▾</span></summary>' +
        '<ul class="mslist">' + ls.map(function (x) { return '<li><a href="' + esc(x.href) + '">' + esc(x.n) + "</a></li>"; }).join("") + "</ul></details>";
    }).join("");
  }
  if (w.NursinLessons && w.NursinLessons.splitPage) w.NursinLessons.splitPage();   // ✂️ long lessons → «الجزء 1 / 2 …» (assets/lessons.js)
  if (location.hash) { var el = d.getElementById(location.hash.slice(1)); if (el && el.tagName === "DETAILS") { el.open = true; } }

  /* 🌙 «مراجعة ليلة الامتحان» + ⚡ «خلاصة ٣٠ ثانية» — تلقائياً لكل مادة ودرس */
  function pageSubj() {
    var box = d.querySelector(".sublessons[data-t]");
    if (box) return box.getAttribute("data-t");
    var pg = (location.pathname.split("/").pop() || "").toLowerCase(), S = (w.NLESSONS && w.NLESSONS.subjects) || {};
    for (var k in S) if (S[k].page === pg) return k;
    return "";
  }
  function subjQ(t) {
    var G = (w.QGROUPS && w.QGROUPS[t]) || [t];
    return (w.QUIZ || []).filter(function (q) { return G.indexOf(q.t) >= 0; });
  }
  function cramOpen(t, from) {
    var U = w.NursinUI; if (!U || !U.openSheet) return;
    var NL = w.NLESSONS || {}, S = (NL.subjects && NL.subjects[t]) || {}, fr = FR();
    var allQ = subjQ(t), wkMap = (w.Weak && w.Weak.items) ? w.Weak.items() : {};
    var wkQs = allQ.filter(function (q) { return !!wkMap[q.id]; });
    var hls = (w.NursinHL && w.NursinHL.all) ? w.NursinHL.all().filter(function (x) { return x.sj === t || x.pg === (S.page || ""); }) : [];
    var TR = w.TRICKS || {}, tKeys = Object.keys(TR).filter(function (k) { return k.indexOf(t + ":") === 0; });
    var h = '<div class="cram">';
    h += '<p class="small">' + esc(T("كل ما تحتاجه لمراجعة سريعة قبل الامتحان:", "Tout ce qu'il faut pour réviser vite avant l'examen :")) + '</p>';
    h += '<div class="cram-acts" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px">';
    if (wkQs.length) h += '<a class="btn pri" href="quiz.html?t=weak">🎯 ' + esc(T("تدرّب عأخطائك (" + wkQs.length + ")", "Tes erreurs (" + wkQs.length + ")")) + '</a>';
    h += '<a class="btn' + (wkQs.length ? "" : " pri") + '" href="quiz.html?t=' + encodeURIComponent(t) + '">⚡ ' + esc(T("كويز شامل (" + allQ.length + " سؤال)", "Quiz complet (" + allQ.length + " q)")) + '</a>';
    h += '</div>';
    if (wkQs.length) {
      h += '<h3>🎯 ' + esc(T("نقاط ضعفك بهالمادة", "Tes points faibles")) + '</h3><ul>' + wkQs.slice(0, 6).map(function (q) { return '<li><b>' + esc(q.q) + '</b><br><small>✅ ' + esc(q.o[q.a]) + '</small></li>'; }).join("") + '</ul>';
    }
    if (hls.length) {
      h += '<h3>🖍️ ' + esc(T("تعليماتك بالقلم (" + hls.length + ")", "Tes surlignages (" + hls.length + ")")) + '</h3><ul>' + hls.slice(0, 8).map(function (x) { return '<li><mark class="hlm hl-' + esc(x.c || "y") + '">' + esc(x.q) + '</mark></li>'; }).join("") + '</ul>';
    }
    if (tKeys.length) {
      h += '<h3>🧠 ' + esc(T("حِيَل الحفظ السريعة", "Astuces mémo")) + '</h3>';
      tKeys.forEach(function (lk) { (TR[lk] || []).forEach(function (tr) { var s = fr && tr.fr ? tr.fr : tr; h += '<div class="qcard" style="margin:8px 0;padding:10px"><b>' + esc(s.t) + '</b><p class="small" style="margin:4px 0">' + esc(s.m) + '</p></div>'; }); });
    }
    if (!wkQs.length && !hls.length && !tKeys.length) {
      h += '<p class="small">' + esc(T("ابدأ بحلّ الكويز أو تعليم الكلمات المهمة بالقلم لتتجمع خلاصتك هنا تلقائياً.", "Commence par le quiz ou surligne des mots clés pour voir ton résumé ici.")) + '</p>';
    }
    h += '</div>';
    U.openSheet("cramsh", "🌙 " + T("مراجعة ليلة الامتحان", "Révision express") + " · " + T(S.ar || t, S.fr || t), h, from);
  }
  function addSubBoost(){var t=pageSubj();if(!t||d.getElementById('sub-mast'))return;var LS=w.NursinLessons,P=(LS&&LS.parts&&LS.parts.length)?LS.parts:((w.NLESSONS&&w.NLESSONS.parts)||[]),mine=P.filter(function(x){return x.s===t;});if(!mine.length)return;function lg(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}var rm=LS&&LS.readMap?LS.readMap():(lg('nursin_read_v1')||{}),pq=lg('nursin_partq_v1')||{},ln=lg('nursin_learn_v1')||{},rt=(lg('nursin_ret_v1')||{}).L||{},ok=0,pt=0,todo=0,wk=null;mine.forEach(function(x){var pk=LS&&LS.key?LS.key(x):(x.s+':'+(x.l||x.t)+(x.p?'#'+x.p:'')),b=x.s+':'+(x.l||x.t),rOk=LS&&LS.isRead?LS.isRead(x,rm):!!rm[pk],o=ln[x.href]||null,lf=!!(o&&(o.fd||o.m===1||o.ph==='done'||(o.pct!=null&&o.pct>=80))),lp=!!(o&&((o.i|0)>0||(o.ans&&Object.keys(o.ans).length>0))),rs=(rt[b]&&rt[b].s!=null)?rt[b].s:null;if(rOk||pq[pk]||pq[b]||lf||(rs!=null&&rs>=75))ok++;else if(lp||(rs!=null&&rs>=35)){pt++;if(!wk)wk=x;}else{todo++;if(!wk)wk=x;}});var pct=Math.round(100*(ok+pt*0.5)/mine.length),box=d.createElement('div');box.id='sub-mast';box.className='qcard';box.style.margin='10px 0';box.innerHTML='<div style=\x22display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap\x22><b>\uD83C\uDFC6 إتقان المادة: '+ok+'/'+mine.length+' جزء ('+pct+'\x25)</b><span class=\x22small\x22>\uD83D\uDFE2 '+ok+' · \uD83D\uDFE1 '+pt+' · \uD83D\uDD12 '+todo+'</span></div><div style=\x22height:8px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden;margin:8px 0\x22><i style=\x22display:block;height:100\x25;width:'+Math.max(2,pct)+'\x25;background:linear-gradient(90deg,#0f766e,#16a34a)\x22></i></div><div style=\x22display:flex;gap:8px;flex-wrap:wrap\x22>'+(wk?'<a class=\x22btn sm pri\x22 href=\x22learn.html?u='+encodeURIComponent(wk.href)+'\x22>\uD83C\uDFAF كمّل أضعف جزء بالمادة</a>':'<span class=\x22small\x22>\uD83C\uDFC6 كل أجزاء المادة متقَنة!</span>')+(t==='rea'?'<button type=\x22button\x22 class=\x22btn sm\x22 id=\x22reashockbtn\x22>\uD83D\uDE91 طوارئ بلمحة (الصدمات الـ ٤)</button>':t==='pharma'?'<button type=\x22button\x22 class=\x22btn sm\x22 id=\x22phcheatbtn\x22>\uD83D\uDC8A الترياقات والمراقبة بلمحة</button>':t==='comm'?'<button type=\x22button\x22 class=\x22btn sm\x22 id=\x22cmcheatbtn\x22>\uD83C\uDFD8\uFE0F الوقاية الـ ٣ بلمحة</button>':'')+'</div>';var anc=d.querySelector('.sublessons')||d.querySelector('details.topic');if(anc&&anc.parentNode)anc.parentNode.insertBefore(box,anc);var rb=d.getElementById('reashockbtn');if(rb&&w.NursinUI&&w.NursinUI.openSheet)rb.onclick=function(){var h='<div style=\x22overflow-x:auto\x22><table style=\x22width:100\x25;border-collapse:collapse;font-size:13px\x22><thead><tr><th>النوع</th><th>العلامة</th><th>أوّل خطوة</th><th>Henderson</th></tr></thead><tbody><tr><td><b>Hypovolémique</b></td><td>نزيف/جفاف، نبض خيطي، برد</td><td>رفع الرجلين + خطّين وريد + سوائل</td><td>الدورة والأكسجة</td></tr><tr><td><b>Cardiogénique</b></td><td>احتقان الرقبة + خراخر OAP</td><td><b>ممنوع سوائل!</b> Demi-assis + O2 + ECG</td><td>التنفّس بفعالية</td></tr><tr><td><b>Anaphylactique</b></td><td>دواء/بنسلين، صفير، وذمة حنجرة</td><td><b>وقّف الدوا + Adrénaline</b> + مجرى هوا</td><td>التنفّس والمخاطر</td></tr><tr><td><b>Septique</b></td><td>حرارة >38.5 أو <36 + هبوط ضغط</td><td><b>Hémocultures قبل ATB</b> + سوائل + Diurèse</td><td>الحرارة والإطراح</td></tr></tbody></table></div>';w.NursinUI.openSheet('reashock','\uD83D\uDE91 طوارئ بلمحة · مقارنة الصدمات الـ ٤',h,rb);};
  var pb=d.getElementById('phcheatbtn');
  if(pb&&w.NursinUI&&w.NursinUI.openSheet)pb.onclick=function(){
    var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th>الدواء / العائلة</th><th>الترياق (Antidote)</th><th>المراقبة الأساسية</th></tr></thead><tbody>'
      +'<tr><td><b>Morphine / Opioïdes</b></td><td>Naloxone (Narcan)</td><td>التنفّس (FR) + الوعي + الإمساك</td></tr>'
      +'<tr><td><b>Héparine (HNF)</b></td><td>Sulfate de protamine</td><td>TCA + الصفائح (Plaquettes) + نزيف</td></tr>'
      +'<tr><td><b>AVK (Sintrom/Warfarine)</b></td><td>Vitamine K</td><td>INR (الهدف 2–3) + منع الخضار الورقية بكثرة</td></tr>'
      +'<tr><td><b>Benzodiazépines</b></td><td>Flumazénil (Anexate)</td><td>الوعي + التنفّس + خطر السقوط</td></tr>'
      +'<tr><td><b>Paracétamol</b></td><td>N-acétylcystéine</td><td>إنزيمات الكبد (Transaminases)</td></tr>'
      +'<tr><td><b>Diurétiques (Lasilix)</b></td><td>تعويض البوتاسيوم (K+)</td><td>Kaliémie + ضغط الدم + Diurèse + الوزن</td></tr>'
      +'</tbody></table></div>';
    w.NursinUI.openSheet('phcheat','\uD83D\uDC8A الترياقات والمراقبة بلمحة',h,pb);
  };
  var cb=d.getElementById('cmcheatbtn');
  if(cb&&w.NursinUI&&w.NursinUI.openSheet)cb.onclick=function(){
    var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th>المستوى</th><th>متى؟</th><th>الهدف</th><th>أمثلة امتحانية</th></tr></thead><tbody>'
      +'<tr><td><b>Primaire (أولية)</b></td><td>قبل المرض</td><td>تخفيض Incidence</td><td>اللقاحات، التثقيف الصحي، غسل اليدين، منع التدخين</td></tr>'
      +'<tr><td><b>Secondaire (ثانوية)</b></td><td>بداية المرض (مخبّى)</td><td>كشف مبكر (Dépistage)</td><td>ماموغرافي، فحص سكري/ضغط لشخص بلا عوارض</td></tr>'
      +'<tr><td><b>Tertiaire (ثالثية)</b></td><td>بعد حدوث المرض</td><td>منع المضاعفات والتأهيل</td><td>علاج فيزيائي بعد AVC، فحص HbA1c لمريض سكري معروف</td></tr>'
      +'</tbody></table><p class="small" style="margin-top:8px"><b>⚠️ فخ الامتحان:</b> فحص السكري لشخص سليم = <b>ثانوية</b>، أما فحص HbA1c لمريض سكري معروف = <b>ثالثية</b>!</p></div>';
    w.NursinUI.openSheet('cmcheat','\uD83C\uDFD8\uFE0F مستويات الوقاية الثلاثة بلمحة',h,cb);
  };}function addCramBtn() {
    var t = pageSubj(); if (!t) return;
    var tabs = d.querySelector(".lawtabs");
    if (tabs && !tabs.querySelector("[data-cram]")) {
      var b = d.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("data-cram", t);
      b.textContent = T("🌙 مراجعة ليلة الامتحان", "🌙 Révision express");
      b.addEventListener("click", function () { cramOpen(t, b); });
      tabs.appendChild(b);
    }
    // ⚡ خلاصة ٣٠ ثانية تلقائية بآخر كل درس (إذا توفرت حيل حفظ أو نقاط بارزة)
    var TR = w.TRICKS || {};
    [].slice.call(d.querySelectorAll("details.topic[id]")).forEach(function (det) {
      var bd = det.querySelector(".tbody"); if (!bd || bd.querySelector(".cram30")) return;
      var baseId = t + ":" + det.id.replace(/-p\d+$/, ""), ts = TR[baseId] || [];
      var pts = [];
      if (ts.length) ts.forEach(function (tr) { var s = FR() && tr.fr ? tr.fr : tr; pts.push("<b>" + esc(s.t) + ":</b> " + esc(s.m)); });
      else {
        [].slice.call(bd.querySelectorAll("li > b")).slice(0, 5).forEach(function (bEl) {
          var txt = (bEl.parentElement && bEl.parentElement.textContent || "").trim();
          if (txt.length > 8 && txt.length < 180) pts.push(esc(txt));
        });
      }
      if (!pts.length) return;
      var box = d.createElement("div"); box.className = "cram30 qcard"; box.style.marginTop = "12px";
      box.innerHTML = '<b>⚡ ' + esc(T("خلاصة ٣٠ ثانية", "Résumé en 30 sec")) + '</b><ul class="mlist" style="margin:6px 0 0">' + pts.slice(0, 5).map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul>";
      bd.appendChild(box);
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(function(){addCramBtn();addSubBoost();},120); });
  else setTimeout(function(){addCramBtn();addSubBoost();},120);
})(window, document);
