/* 👨‍🏫 الأستاذ عثمان (Abdullah, Oct 27 2026 1:30 PM: rename the assistant teacher to «الأستاذ عثمان»; «بس يغلط الطالب بالصف وغير الصف يعطي مواعظ ويبهدل عالخفيف»).
   Every string of his lives in this one file (ar now; the coming language switch adds fr beside each ar).
   - window.OSMAN: the data (name, avatar, toggle label, persona for the AI tutor, pools: wrong / hard (3+ wrong in a row) / praise (every 5 right in a row)).
   - window.Osman: wrong() → bubble HTML for a correction card ('' when the toggle is off) · right() → praise bubble every 5 in a row, else ''
     · toast(html) floating bubble that never blocks play · on() / set(bool) toggle «👨‍🏫 تعليقات الأستاذ عثمان» (localStorage nursin_osman_v1, default ON)
     · persona() → the line the tutor page adds to its request context.
   Pre-written lines only (no live AI call), kind and playful, never insulting, no medical facts. No ads near the bubble. */
(function (w, d) {
  var KEY = "nursin_osman_v1";
  var O = w.OSMAN = {
    name: { ar: "الأستاذ عثمان" },
    avatar: "👨‍🏫",
    toggle: { ar: "تعليقات الأستاذ عثمان", sub: { ar: "موعظة وبهدلة عالخفيف بس تغلط" } },
    onTxt: { ar: "شغّالة" }, offTxt: { ar: "موقّفة" },
    calm: { ar: "خود نفس وارجع ركّز 🧘" },
    persona: { ar: "[شخصيتك] إنت «الأستاذ عثمان»، أستاذ تمريض لبناني بمعهد بلبنان. بتحكي عربي لبناني، والمصطلحات بالفرنسي مع معناها بالعربي. إذا جواب الطالب أو فهمو غلط: أوّل شي بهدلو عالخفيف وبلطف ومزح (سطر واحد، بلا إهانة ولا مسبّة، وأبداً ما تحكي عن عيلتو أو دينو أو شكلو)، بعدين عطيه موعظة أو حكمة قصيرة عن الدراسة أو التمريض (سطر واحد)، وبعدين اشرحلو الصح بوضوح. إذا جاوب صح امدحو بكلمة وحدة وكمّل." },
    personaPlain: { ar: "[شخصيتك] إنت «الأستاذ عثمان»، أستاذ تمريض لبناني بمعهد بلبنان. بتحكي عربي لبناني، والمصطلحات بالفرنسي مع معناها بالعربي. إذا جواب الطالب غلط، صحّحلو بلطف واشرحلو الصح." },
    wrong: [
    { ar: "لا لا يا بطل، المريض ما بيستنّاك تتذكّر! راجع وارجعلي 😤📚" },
    { ar: "شو هيدا؟ الممرّض الشاطر بيقرا مرتين قبل ما يجاوب مرة 😏" },
    { ar: "الغلط مش عيب، العيب تعيدو. اكتبها بدفترك هلّق ✍️" },
    { ar: "يا حبيبي، السرعة منيحة بس مش بالامتحان! اقرا السؤال للآخر 🧐" },
    { ar: "ولو! أنا شارحها وإنت قاعد؟ 😅 ارجع عالدرس شي دقيقتين" },
    { ar: "مش مشكلة، كل ممرّض كبير غلط قبلك. بس الكبير بيتعلّم من غلطتو 💪" },
    { ar: "آخ يا قلبي… هيدي بدها مراجعة الليلة قبل النوم 📖" },
    { ar: "ركّز معي شوي! الجواب بيجي من الدرس مش من الحظ 🎯" },
    { ar: "يعني جاوبت بالـ pifomètre (عالحزر)؟ 😂 الحزر ما بيداوي حدا" },
    { ar: "تعا لهون… الدفتر مش زينة عالرف، افتحو 📚" },
    { ar: "غلطة صغيرة اليوم، بس بالمستشفى ما في «بس اليوم». فتّح عيونك 👀" },
    { ar: "شو يا بطل، نعسان؟ ☕ اشرب مي وارجع ركّز" },
    { ar: "ما تزعل، بس ما تكرّرها! الغلطة اللي بتراجعها بتعلق براسك أكتر 🧠" },
    { ar: "يا عيب الشوم 😤… مزح مزح، بس راجعها هلّق" },
    { ar: "الممرّض الشاطر ما بيستحي يرجع عالكتاب، بيستحي يغلط مع المريض 🩺" },
    { ar: "على مهلك، كل جواب بدو تفكير مش كبسة سريعة ⏸️" },
    { ar: "هيك بيصير لما ندرس ليلة الامتحان بس 😏 شوي كل يوم أحسن" },
    { ar: "قول معي: «ما بجاوب قبل ما إقرا كل الخيارات» 🙌" },
    { ar: "لا يا شيخ! كنت قريب… بس «قريب» ما بتكفي بالتمريض 😉" },
    { ar: "الغلطة هون أرخص بكتير من الغلطة عالـ garde (المناوبة). منيح إنها صارت هون 😌" },
    { ar: "أنا مش معصّب… أنا بس زعلان شوي 😒 اقرا الشرح" },
    { ar: "اللي بيتعب عالدرس بيرتاح بالامتحان. يلّا شمّر عن إيديك 💪" },
    { ar: "شو قلنا بالصف؟ 🤨 اقرا الشرح مرّتين" },
    { ar: "مش هيك يا بطل! بس ولا يهمّك، الشطارة بالمحاولة الجاية 🔁" },
    { ar: "كل غلطة بتعلّمك شي، إذا وقفت عندها دقيقة. وقفت؟ 🤔" },
    { ar: "يا ريت لو قريت السؤال على رواق… الهدوء نص الشطارة 🧘" },
    { ar: "اكتب الصح ٣ مرّات بالدفتر، وما رح تنساه بحياتك ✍️" },
    { ar: "ما تخلّي العجلة تسبقك، المريض بدّو ممرّض رايق 🙂" },
    { ar: "يا زلمة! 😂 مش هالمرّة، بس المرّة الجاية بدّي إسمع الصح" },
    { ar: "الحفظ بلا فهم متل البيت بلا أساس. افهمها منيح 🧱" },
    { ar: "لو معي طبشورة كنت كتبتلك ياها عاللوح 😤 اقرا الصح" },
    { ar: "ولا يهمّك، بس اعرف إنو الأستاذ عثمان عم يراقب 👀😄" }
  ],
    hard: [
    { ar: "لا، هيك ما بيمشي الحال! تلات غلطات ورا بعض؟ 😤" },
    { ar: "وقّف وقّف! صرنا نجاوب عالعمياني؟ 🙈" },
    { ar: "يا بطل، شكلك عم تكبس بلا ما تقرا… هيدا مش لعب 😠" },
    { ar: "أوف! شكلو بدنا نرجع عالدرس من الأوّل 📚😤" },
    { ar: "تلاتة ورا بعض؟ لو كنا بالمستشفى كنت بعتّك ترتاح 😬" },
    { ar: "أنا صبري طويل، بس مش لهالدرجة يا بطل 😤" },
    { ar: "لو كنّا بالصف هلّق كنت طلّعتك عاللوح 😅" },
    { ar: "لا لا لا… التمريض مش حزّورة، بدّو قراية 😤" }
  ],
    praise: [
    { ar: "برافو عليك! 👏 هيك بدّي ياك" },
    { ar: "خمسة ورا بعض! 🔥 الأستاذ عثمان فخور فيك" },
    { ar: "يا عيني عليك! 😎 كمّل هيك" },
    { ar: "هيك الممرّض الشاطر! 💪 بس ما تشوف حالك كتير 😏" },
    { ar: "ولك عفاك! 👌 الدراسة عم تعطي نتيجة" },
    { ar: "يا سلام! 🌟 كمّل وما توقّف" },
    { ar: "عشرة على عشرة لهلّق 😄 بس ما ترتاح كتير" },
    { ar: "هيك بتفرّحني! 🎉 المرضى بإيدين أمينة" }
  ]
  };
  var ws = 0, rs = 0, used = {};
  function lang() { var N = w.Nursin; return (N && N.lang && N.lang() === "fr") ? "fr" : "ar"; }
  function t(o) { return o ? (o[lang()] || o.ar || "") : ""; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function on() { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
  function set(b) { try { localStorage.setItem(KEY, b ? "1" : "0"); } catch (e) {} try { d.dispatchEvent(new CustomEvent("nursin:osman", { detail: !!b })); } catch (e) {} }
  // a random line, never one of the last few of the same pool
  function pick(k) {
    var pool = O[k], last = used[k] || (used[k] = []), i, n = 0;
    do { i = Math.floor(Math.random() * pool.length); n++; } while (last.indexOf(i) > -1 && n < 30);
    last.push(i); if (last.length > Math.min(8, pool.length - 1)) last.shift();
    return t(pool[i]);
  }
  function bubble(txt, cls) {
    return '<div class="osm' + (cls ? " " + cls : "") + '" role="note"><span class="osa" aria-hidden="true">' + O.avatar + '</span><p><b>' + esc(t(O.name)) + ":</b> " + esc(txt) + "</p></div>";
  }
  function wrong() {
    ws++; rs = 0; if (!on()) return "";
    return ws >= 3 ? bubble(pick("hard") + " " + t(O.calm), "osh") : bubble(pick("wrong"));
  }
  function right() {
    rs++; ws = 0; if (!on() || rs % 5) return "";
    return bubble(pick("praise"), "osp");
  }
  var tEl = null, tTm = 0;
  function toast(html) {
    if (!html || !d.body) return;
    if (!tEl) { tEl = d.createElement("div"); tEl.className = "osmt"; tEl.setAttribute("aria-live", "polite"); d.body.appendChild(tEl); }
    tEl.innerHTML = html; tEl.classList.add("on"); clearTimeout(tTm);
    tTm = setTimeout(function () { tEl.classList.remove("on"); }, 2600);
  }
  function persona() { return t(on() ? O.persona : O.personaPlain); }
  w.Osman = { on: on, set: set, wrong: wrong, right: right, toast: toast, bubble: bubble, persona: persona, pick: pick, name: function () { return t(O.name); }, _reset: function () { ws = rs = 0; } };
})(window, document);
