/* Temporary Neuro lessons & 54-question review (Nabatieh Technical Institute syllabus).
   MODULAR DESIGN: To retire any temporary lesson once its official PDF is added to neuro.html,
   simply add its `id` to REPLACED below (e.g. "meningite": 1) or delete its entry from RAW.
   ES5 (iOS 12 safe). */
(function (w, d) {
  "use strict";

  // Add any lesson id here when replaced by the official PDF lesson:
  var REPLACED = {};

  var SK = "nursin_ntemp_v1";

  var RAW = [
    {
      id: "plan_soins",
      t: "الخطة التمريضية العصبية",
      fr: "Plan de soins neurologique",
      def: "تقييم ممنهج للوعي (Glasgow)، الحدقات، القوة الحركية، والإحساس والعلامات الحيوية لوضع تشخيص تمريضي ومنع التدهور.",
      sx: "تبدّل وعي، تفاوت حدقات (Anisocorie)، ضعف أو خدر بأحد الأطراف، صداع أو اضطراب نطق وتوازن.",
      comp: "تدهور وعي صامت، انسداد مجرى الهواء، ذات رئة استنشاقية، قرحات فراش (Escarres)، وتيبّس مفاصل.",
      care: "تأمين ABC أولاً، فحص Glasgow والحدقات كل ساعة بالحالات الحادة، تقليب كل ساعتين، وحماية العينين والمفاصل.",
      tip: "أي تغيّر مفاجئ بدرجة غلاسكو (انخفاض >= 2) أو اتساع حدقة أحادي يستدعي تبليغ الطبيب فوراً.",
      qs: [
        { q: "أول أولوية بالخطة التمريضية لمريض عصبي غير مستقر؟", o: ["تأمين مجرى الهواء والتنفس (ABC) ثم التقييم العصبي", "فحص المنعكسات الوترية أولاً", "إعطاء مسكّن قوي فوراً"], a: 0 },
        { q: "انخفاض مقياس غلاسكو بمقدار نقطتين أو أكثر يعني:", o: ["تدهور عصبي حاد يستدعي إبلاغ الطبيب فوراً", "تحسّن طبيعي", "لا يحتاج أي مراقبة"], a: 0 },
        { q: "من أهم إجراءات منع مضاعفات الجمود عند المريض العصبي:", o: ["التقليب كل ساعتين والتمارين السلبية", "تثبيت المريض على ظهره أسبوعاً", "منع السوائل تماماً"], a: 0 }
      ]
    },
    {
      id: "coma",
      t: "الغيبوبة",
      fr: "Le Coma",
      def: "فقدان وعي عميق ومستمر لا يستجيب فيه المريض للمنبّهات الخارجية أو الداخلية، ويُعرَّف عملياً بـ Glasgow <= 8.",
      sx: "غياب فتح العين، عدم تنفيذ الأوامر، غياب الكلام المفهوم، وقد تترافق مع تنفس غير منتظم أو غياب منعكسات البلع والسعال.",
      comp: "انسداد مجرى الهواء والاختناق، ذات رئة استنشاقية، تقرّح وجفاف القرنية، قرحات فراش، وخثار وريدي عميق (DVT).",
      care: "وضعية الأمان الجانبية (PLS) أو التنبيب إذا Glasgow <= 8، فحص السكر فوراً، ترطيب العينين بدموع اصطناعية وإغلاق الجفون، تقليب كل ساعتين، ومراقبة البول.",
      tip: "أول فحص دم روتيني عند أي مريض غيبوبة مجهولة السبب هو السكر (Glycémie capillaire).",
      qs: [
        { q: "أي درجة غلاسكو تُعدّ غيبوبة وتستدعي حماية مجرى الهواء بالتنبيب؟", o: ["8 أو أقل", "12 إلى 13", "15"], a: 0 },
        { q: "أول فحص مخبري سريع نعمله لأي مريض داخل بغيبوبة مفاجئة؟", o: ["قياس سكر الدم الشعري", "قياس الكولسترول", "فحص وظائف الكلى فقط"], a: 0 },
        { q: "لماذا نرطّب عيني مريض الغيبوبة ونغلقهما؟", o: ["لمنع جفاف وتقرّح القرنية", "لتسريع الاستيقاظ", "لخفض ضغط الدم"], a: 0 }
      ]
    },
    {
      id: "seizure",
      t: "الصرع والاختلاجات",
      fr: "Seizure Disorder / Épilepsie",
      def: "نشاط كهربائي مفاجئ ومفرط في خلايا الدماغ يسبب نوبات حركية (معمّمة أو بؤرية) أو غياب وعي.",
      sx: "مرحلة توتّرية (تيبّس وسقوط)، ثم رمعية (ارتعاشات منتظمة)، ازرقاق، عضّ لسان، تبوّل لا إرادي، تليها مرحلة نعاس وتشوش بعد النوبة.",
      comp: "الحالة الصرعية المستمرة (État de mal > 5 دقائق)، نقص أكسجة دماغية، استنشاق رئوي، عضّ لسان، ورضوض وكسور.",
      care: "أثناء النوبة: حماية الرأس، إبعاد الأشياء الصلبة، فك الياقة، ممنوع وضع أي شيء بالفم أو تقييد الأطراف؛ بعد النوبة: وضعية الأمان، أكسجين، ومراقبة الوقت والالتزام بالدواء.",
      tip: "توقف مضاد الصرع فجأة هو السبب الأشهر لـ État de mal épileptique.",
      qs: [
        { q: "التصرف التمريضي الصحيح أثناء نوبة الصرع؟", o: ["حماية الرأس وحساب مدة النوبة دون وضع شيء بالفم", "إدخال خافض لسان بين الأسنان", "تثبيت الأطراف بقوة"], a: 0 },
        { q: "متى تُعتبر نوبة الصرع حالة طارئة مهدّدة للحياة (État de mal)؟", o: ["إذا استمرت أكثر من 5 دقائق أو تكررت دون استعادة الوعي", "إذا دامت 20 ثانية فقط", "إذا شعر المريض بنعاس بعدها"], a: 0 },
        { q: "السبب الأكثر شيوعاً لحدوث الحالة الصرعية عند مريض صرع معروف:", o: ["التوقف المفاجئ عن دواء الصرع", "شرب كوب ماء", "النوم 8 ساعات"], a: 0 }
      ]
    },
    {
      id: "meningite",
      t: "التهاب السحايا",
      fr: "Méningite",
      def: "التهاب حاد بالأغشية المحيطة بالدماغ والنخاع الشوكي (جرثومي خطير أو فيروسي أخف).",
      sx: "الثالوث الكلاسيكي: حرارة عالية + صداع شديد + تيبّس الرقبة، مع رهاب الضوء (Photophobie)، إقياء، وعلامتي Kernig وBrudzinski؛ وقد تظهر فرفرية نزفية (Purpura fulminans).",
      comp: "HTIC، صدمة إنتانية، استسقاء دماغي، صمم دائم، اختلاجات، أو وفاة إذا تأخر العلاج الجرثومي.",
      care: "عزل تنفسي (Isolement gouttelettes) لأول 24 ساعة، أخذ زرع دم وبزل قطني، إعطاء المضادات الحيوية بالوريد فوراً دون تأخير، وغرفة هادئة مظلمة.",
      tip: "البزل القطني (Ponction lombaire) يؤكد التشخيص؛ والصداع بعده يخف بالاستلقاء والترطيب.",
      qs: [
        { q: "ما هو الثالوث السريري الكلاسيكي لالتهاب السحايا؟", o: ["حرارة عالية + صداع شديد + تيبّس الرقبة", "سعال + ألم صدر + تعرّق", "يرقان + ألم بطن + إسهال"], a: 0 },
        { q: "أي إجراء تمريضي ضروري فوراً عند الاشتباه بالتهاب سحايا جرثومي؟", o: ["عزل تنفسي وتحضير المضاد الحيوي الوريدي بأسرع وقت", "منع السوائل الوريدية", "إضاءة الغرفة بقوة"], a: 0 },
        { q: "ما هي العلامة الجلدية الإنذارية الخطيرة بالتهاب السحايا بالمكورات السحائية؟", o: ["فرفرية نزفية لا تزول بالضغط (Purpura)", "جفاف خفيف باليدين", "احمرار بسيط بالوجنتين"], a: 0 }
      ]
    },
    {
      id: "ait",
      t: "الحادث الوعائي العابر",
      fr: "AIT (Accident Ischémique Transitoire)",
      def: "نقص تروية دماغية موضّع ومؤقت تزول أعراضه كلياً خلال أقل من 24 ساعة (غالباً 10-60 دقيقة) دون نخر دماغي.",
      sx: "ضعف مفاجئ بنصف الوجه أو الذراع، تلعثم بالكلام، أو عمى عابر بعين واحدة (Amaurose fugace) ثم عودة كاملة للطبيعي.",
      comp: "خطر مرتفع جداً لحدوث جلطة دماغية كاملة (AVC ischémique) خلال الأيام والأسابيع التالية.",
      care: "التقييم العاجل، مراقبة الضغط والنبض (نفي الرجفان الأذيني FA)، متابعة Scanner/Doppler، وتثقيف المريض على مضادات الصفيحات وضبط الضغط والسكري.",
      tip: "الـ AIT حالة طارئة رغم زوال الأعراض لأنها فرصة ذهبية لمنع الـ AVC.",
      qs: [
        { q: "ما الذي يميّز الـ AIT عن الـ AVC؟", o: ["أعراض الـ AIT تزول كلياً خلال <24 ساعة دون أذية دائمة", "الـ AIT يسبب نزيفاً دائماً", "الـ AIT لا يحتاج أي فحوصات"], a: 0 },
        { q: "ليش منعتبر الـ AIT حالة طارئة رغم تحسّن المريض؟", o: ["لأنه ينذر بجلطة دماغية كاملة قريبة", "لأنه يسبب التهاب سحايا", "لأنه يؤدي لفتق قرصي"], a: 0 },
        { q: "أي اضطراب نظم قلبي شائع لازم نفتّش عنه بعد الـ AIT؟", o: ["الرجفان الأذيني (Fibrillation auriculaire)", "بطء نبض رياضي بسيط", "نفخة بريئة فقط"], a: 0 }
      ]
    },
    {
      id: "hydrocephalie",
      t: "الاستسقاء الدماغي",
      fr: "Hydrocéphalie",
      def: "تراكم مفرط للسائل الدماغي الشوكي (LCR) داخل بطينات الدماغ نتيجة زيادة الإنتاج أو انسداد أو ضعف الامتصاص.",
      sx: "عند الرضيع: كبر محيط الرأس، توتّر اليافوخ، وعلامة غروب الشمس؛ عند الكبار: صداع، إقياء، تشوش رؤية، واضطراب مشي ووعي (HTIC).",
      comp: "انفتاق دماغي وتأخر عصبي/بصري، وبعد عملية التحويلة (Shunt VP): انسداد التحويلة، التهابها، أو نزيف بسبب إفراط التصريف.",
      care: "قبل العملية: قياس محيط الرأس يومياً ومراقبة HTIC. بعد Shunt VP: مراقبة الجرح والحرارة، عدم النوم على جهة الصمام، ورفع الرأس تدريجياً حسب أمر الطبيب.",
      tip: "ارتفاع الحرارة + احمرار على مسار الأنبوب بعد Shunt = التهاب بالتحويلة.",
      qs: [
        { q: "أي علامة مميزة للاستسقاء الدماغي عند الرضيع؟", o: ["زيادة سريعة بمحيط الرأس وتوتّر اليافوخ", "انخفاض الحرارة فقط", "صغر حجم البطن"], a: 0 },
        { q: "ما هي المراقبة الأساسية بعد تركيب تحويلة بطينية صفاقية (Shunt VP)؟", o: ["مراقبة الحرارة وعلامات الالتهاب وعمل التحويلة وعلامات HTIC", "منع السوائل أسبوعاً", "الضغط القوي على الصمام باستمرار"], a: 0 },
        { q: "إذا ظهرت حرارة واحمرار على مسار أنبوب التحويلة بعد العملية فهذا يدل غالباً على:", o: ["التهاب بالتحويلة يستوجب إبلاغ الجراح فوراً", "شفاء تام", "هبوط سكر"], a: 0 }
      ]
    },
    {
      id: "sep",
      t: "التصلب اللويحي المتعدد",
      fr: "Sclérose en plaques (SEP)",
      def: "مرض مناعي ذاتي مزمن يصيب غلاف الميالين في الدماغ والنخاع الشوكي، يظهر غالباً بشكل هجمات وهدآت عند الشباب.",
      sx: "تشوش رؤية أو التهاب عصب بصري، تنميل وخدر، ضعف أطراف، إرهاق شديد، واضطرابات توازن ومثانة.",
      comp: "إعاقة حركية متدرجة، تشنجات عضلية مؤلمة (Spasticité)، التهابات بولية متكررة، واكتئاب مزمن.",
      care: "تجنّب الحرارة العالية والساونا والإجهاد (تزيد الأعراض - ظاهرة Uhthoff)، علاج فيزيائي، تمارين إطالة، وتنظيم تفريغ المثانة.",
      tip: "الحرارة المرتفعة تفاقم أعراض التصلب اللويحي مؤقتاً؛ الاستحمام بماء فاتر أفضل.",
      qs: [
        { q: "ما العامل الذي يفاقم أعراض التصلب اللويحي ويجب تجنّبه؟", o: ["الحرارة العالية والإجهاد الشديد", "شرب الماء البارد", "الراحة المعتدلة"], a: 0 },
        { q: "ما أكثر عرض بصري مبكر شائع بالتصلب اللويحي؟", o: ["التهاب العصب البصري (ضبابية أو فقدان رؤية جزئي)", "عمى ألوان خلقي", "دمع زائد فقط"], a: 0 },
        { q: "العناية التمريضية للمثانة العصبية عند مريض SEP تشمل:", o: ["تنظيم التبول ومراقبة علامات الالتهاب البولي", "منع المريض من الشرب نهائياً", "إعطاء كورتيزون موضعي بالعين"], a: 0 }
      ]
    },
    {
      id: "paralysie",
      t: "الشلل",
      fr: "Paralysie (Hémi/Para/Tétraplégie)",
      def: "فقدان كلي أو جزئي للحركة الإرادية: شلل نصفي (Hémiplégie) غالباً بـ AVC، سفلي (Paraplégie)، أو رباعي (Tétraplégie) بإصابات الرقبة.",
      sx: "غياب أو ضعف القوة العضلية، تغيّر التوتر العضلي (رخو ثم تشنجي)، واضطراب الإحساس أو التحكم بالبول والبراز.",
      comp: "قرحات فراش (Escarres)، خثار وريدي عميق وصمة رئوية (DVT/EP)، تيبّس وتشوه مفاصل، والتهابات بولية ورئوية.",
      care: "تقليب كل ساعتين، تمارين حركية سلبية يومياً، جوارب ضاغطة ومضادات تخثر، عناية بالجلد، ومراقبة التبول والإمساك.",
      tip: "لا تحقن أو تقس الضغط بالطرف المشلول أو المصاب بوذمة إذا أمكن، وحمِ الكاحل والورك بوسائد.",
      qs: [
        { q: "كل كم ساعة يجب تقليب المريض المشلول لمنع قرحات الفراش؟", o: ["كل ساعتين", "مرة كل 24 ساعة", "كل 10 ساعات"], a: 0 },
        { q: "كيف نمنع الجلطات الوريدية العميقة (DVT) عند المريض المشلول؟", o: ["جوارب ضاغطة وتمارين سلبية ومضادات تخثر حسب الوصفة", "تثبيت الساقين بلا حركة أسبوعاً", "تقليل الأكسجين"], a: 0 },
        { q: "الشلل النصفي (Hémiplégie) يصيب عادة:", o: ["نصف الجسم الأيمن أو الأيسر (وغالباً بعد AVC)", "الساقين فقط دائماً", "الوجه فقط"], a: 0 }
      ]
    },
    {
      id: "trauma_cranien",
      t: "رضوض الرأس",
      fr: "Traumatisme crânien",
      def: "إصابة دماغية رضّية قد تكون ارتجاجاً بسيطاً أو كسراً بالجمجمة أو نزيفاً فوق/تحت الجافية.",
      sx: "صداع، دوخة، إقياء، فقدان وعي، سيلان دم أو LCR من الأنف/الأذن، أو فترة صحو يليها تدهور سريع.",
      comp: "نزيف داخل القحف متأخر، وذمة دماغية وHTIC، انفتاق دماغي، تسرب LCR والتهاب سحايا، وصرع ما بعد الرضّ.",
      care: "تثبيت الرقبة حتى نفي كسر فقري، رفع الرأس 30 درجة إذا الضغط مستقر، مراقبة Glasgow والحدقات كل 15-30 د، ومنع إدخال أنبوب أنفي معدي عند الاشتباه بكسر قاعدة الجمجمة.",
      tip: "فترة صحو ثم غيبوبة (Intervalle libre) = نزيف فوق الجافية (Hématome extra-dural).",
      qs: [
        { q: "فترة صحو ثم تدهور مفاجئ بالوعي بعد رضّ رأس تدل غالباً على:", o: ["نزيف فوق الجافية (Hématome extra-dural)", "التهاب بول", "فتق قرصي"], a: 0 },
        { q: "لماذا نمنع وضع أنبوب أنفي معدي عند علامات كسر قاعدة الجمجمة (سيلان LCR من الأنف)؟", o: ["لتجنّب دخوله إلى داخل الجمجمة عبر الكسر", "لأنه يسبب جوعاً", "لأنه يخفض الحرارة"], a: 0 },
        { q: "المراقبة الأدق والأهم خلال الساعات الأولى بعد رضّ الرأس هي:", o: ["مقياس غلاسكو والحدقات والعلامات الحيوية بشكل متكرر", "فحص السمع فقط", "قياس الطول والوزن"], a: 0 }
      ]
    },
    {
      id: "trauma_medullaire",
      t: "رضوض النخاع الشوكي",
      fr: "Traumatisme médullaire",
      def: "أذية بالحبل الشوكي ناجمة عن كسر أو خلع بالعمود الفقري تسبب فقدان الحركة والإحساس تحت مستوى الإصابة.",
      sx: "ألم موضعي بالعمود، ضعف أو شلل سفلي/رباعي، فقدان إحساس، احتباس بولي، أو ضيق تنفس بالإصابات الرقبية.",
      comp: "فشل تنفسي حاد (C3-C5)، صدمة عصبية (Choc neurogénique)، خثار وريدي، قرحات فراش، وفرط انعكاس ذاتي (Hyperréflexie autonome) فوق T6.",
      care: "تثبيت كامل المحور (طوق رقبي ولوح صلب)، نقل بطريقة Log-roll (قطعة واحدة)، مراقبة التنفس والضغط، وقسطرة بولية.",
      tip: "إصابة فوق C4 تصيب العصب الحجابي وتهدد التنفس مباشرة.",
      qs: [
        { q: "كيف نحرّك مصاباً مشتبهاً عنده رضّ بالنخاع الشوكي؟", o: ["تثبيت الرأس والرقبة والجذع كقطعة واحدة (Log-roll)", "ثني الظهر وإجلاسه فوراً", "سحبه من ذراعيه"], a: 0 },
        { q: "أي مستوى إصابة نخاعية يهدد التنفس بشلل الحجاب الحاجز؟", o: ["الإصابة الرقبية العالية (C3-C5)", "الإصابة القطنية (L4-L5)", "العصعص"], a: 0 },
        { q: "من المضاعفات الحادة الخطيرة لإصابة النخاع الرقبية أو الصدرية العالية:", o: ["الصدمة العصبية والفشل التنفسي", "التهاب اللوزتين", "قصر النظر"], a: 0 }
      ]
    },
    {
      id: "hernie_discale",
      t: "الفتق القرصي وجراحته",
      fr: "Hernie discale (pré/post-op)",
      def: "انزلاق نواة القرص بين الفقرات وضغطها على الجذور العصبية (غالباً قطنية L4-L5 أو L5-S1 مسببة عرق النسا).",
      sx: "ألم أسفل الظهر يمتد للساق (Sciatique) ويزداد بالسعال والانحناء، تنميل، وضعف بالقدم.",
      comp: "متلازمة ذيل الفرس (Queue de cheval)، شلل دائم بالقدم (Pied tombant)، وبعد الجراحة: نزيف، التهاب، أو تسرب LCR.",
      care: "قبل العملية: راحة على فراش ثابت، مسكنات، تقييم حسي حركي، وتعليم ميكانيك الجسم. بعد العملية: فحص الحركة والإحساس بالطرفين، منع الانحناء والالتواء وحمل الأثقال، تقليب Log-roll أولاً، ومشي مبكر بحذر.",
      tip: "احتباس البول أو فقدان التحكم بالبراز + خدر منطقة السرج = ذيل الفرس (جراحة إسعافية).",
      qs: [
        { q: "العلامة الطارئة بالفتق القرصي التي تستدعي جراحة عاجلة؟", o: ["فقدان التحكم بالبول/البراز وخدر السرج (ذيل الفرس)", "ألم خفيف يزول بالراحة", "تنميل عابر يختفي"], a: 0 },
        { q: "بعد جراحة الفتق القرصي، ما الحركة الممنوعة على المريض؟", o: ["الانحناء للأمام، التواء الجذع، ورفع الأثقال", "المشي الخفيف المراقب", "تحريك أصابع القدم"], a: 0 },
        { q: "أي فحص تمريضي أساسي فور استيقاظ المريض من جراحة الفتق القرصي؟", o: ["فحص حركة وإحساس الطرفين السفليين ومراقبة الضماد والـ LCR", "فحص النظر بالألوان", "إجراء تمرين ركض"], a: 0 }
      ]
    },
    {
      id: "parkinson",
      t: "داء باركنسون",
      fr: "Maladie de Parkinson",
      def: "اضطراب تنكّسي مزمن ناتج عن نقص الدوبامين في المادة السوداء بالدماغ.",
      sx: "الثالوث: رعاش وقت الراحة (Tremblement de repos)، بطء الحركة (Bradykinésie)، وتيبّس عضلي (Rigidité) مع مشية بخطوات قصيرة وانحناء.",
      comp: "سقوط متكرر وكسور، عسر بلع وذات رئة استنشاقية، إمساك شديد، وخرف أو اكتئاب بالمراحل المتقدمة.",
      care: "إعطاء L-Dopa بمواعيدها الدقيقة دون تأخير، إزالة العوائق لمنع السقوط، طعام مهروس ومراقبة البلع، وألياف وسوائل للإمساك.",
      tip: "تأخير جرعة L-Dopa يسبب تيبّساً وتجمّداً مفاجئاً (Phénomène On-Off).",
      qs: [
        { q: "ينتج داء باركنسون بشكل رئيسي عن نقص أي ناقل عصبي؟", o: ["الدوبامين (Dopamine)", "الأنسولين", "الأدرينالين"], a: 0 },
        { q: "ما أهم قاعدة تمريضية عند إعطاء دواء Levodopa (L-Dopa)؟", o: ["إعطاؤه بموعده الدقيق يومياً لتجنّب تيبّس المريض", "إعطاؤه فقط عند الصداع", "إيقافه كل عطلة أسبوع"], a: 0 },
        { q: "من أخطر مضاعفات المراحل المتقدمة لباركنسون على الجهاز التنفسي:", o: ["عسر البلع وذات الرئة الاستنشاقية", "الربو التحسسي", "انحراف الوتيرة"], a: 0 }
      ]
    },
    {
      id: "alzheimer",
      t: "ألزهايمر",
      fr: "Maladie d'Alzheimer",
      def: "خرف تنكّسي تدريجي وغير عكوس يبدأ بفقدان الذاكرة الحديثة ثم يتقدّم ليشمل الإدراك واللغة.",
      sx: "نسيان الأحداث القريبة، تيهان بأماكن مألوفة، صعوبة إيجاد الكلمات، تقلّب مزاج، ثم عدم القدرة على الرعاية الذاتية.",
      comp: "الضياع خارج المنزل، سقوط وكسور، سوء تغذية وجفاف، التهابات بولية ورئوية، وإرهاق مقدمي الرعاية.",
      care: "روتين يومي ثابت، جمل قصيرة وهادئة، بيئة آمنة بأقفال ولافتات، عدم مجادلة المريض، ودعم العائلة.",
      tip: "لا تصحّح أو تجادل مريض ألزهايمر؛ استخدم التهدئة وإعادة التوجيه بلطف.",
      qs: [
        { q: "أي نوع من الذاكرة يتأثر أولاً بمرض ألزهايمر؟", o: ["الذاكرة الحديثة (الأحداث القريبة)", "ذاكرة الطفولة البعيدة", "الذاكرة العضلية"], a: 0 },
        { q: "أفضل أسلوب تواصل تمريضي مع مريض ألزهايمر المرتبك؟", o: ["جمل قصيرة هادئة مع روتين ثابت وإعادة توجيه لطيفة", "مجادلته وإثبات خطئه بصوت عالٍ", "تغيير غرفته يومياً"], a: 0 },
        { q: "أهم هدف بيئي بغرفة مريض ألزهايمر:", o: ["تأمين السلامة ومنع السقوط والتيهان", "إطفاء كل الإضاءة ليلاً ونهاراً", "وضع سجاد متحرك كثير"], a: 0 }
      ]
    },
    {
      id: "anevrisme",
      t: "تمدد الأوعية الدماغية",
      fr: "Anévrisme cérébral",
      def: "انتفاخ موضّع بجدار شريان دماغي قد يتمزق ويسبب نزيفاً تحت العنكبوتية (HSA) قاتلاً.",
      sx: "قبل التمزق قد يكون صامتاً أو يضغط على عصب عيني؛ عند التمزق: صداع مفاجئ «كضربة رعد» هو الأشد بالحياة، إقياء، تيبّس رقبة، وفقدان وعي.",
      comp: "تمزق ونزيف دماغي حاد، تشنج أوعية (Vasospasme) يسبب جلطة ثانوية، استسقاء دماغي، وإعادة نزيف.",
      care: "قبل القسطرة/الجراحة: راحة تامة بالسرير، غرفة هادئة، ضبط صارم للضغط، ومنع الإجهاد والسعال والإمساك (Valsalva). بعد العملية: مراقبة الوعي وعلامات Vasospasme وإعطاء Nimodipine.",
      tip: "صداع مفاجئ أشد من أي صداع سابق + تيبّس رقبة = نزيف تحت العنكبوتية حتى يثبت العكس.",
      qs: [
        { q: "أهم إجراء تمريضي قبل عملية تمدد الأوعية لمنع تمزقها؟", o: ["راحة تامة بالسرير وضبط الضغط ومنع الإجهاد والإمساك", "تمارين رياضية قاسية", "رفع ضغط الدم عمداً"], a: 0 },
        { q: "العرض الكلاسيكي لتمزق أم الدم الدماغية (Hémorragie méningée)؟", o: ["صداع مفاجئ حاد جداً كضربة رعد مع تيبّس رقبة", "ألم خفيف بالركبة", "حكة جلدية"], a: 0 },
        { q: "أحد أخطر المضاعفات في الأيام التالية لتمزق أم الدم:", o: ["تشنج الأوعية الدماغية (Vasospasme) ونقص التروية", "انخفاض الوزن البسيط", "زيادة الشهية"], a: 0 }
      ]
    },
    {
      id: "guillain_barre",
      t: "متلازمة غيلان باريه",
      fr: "Syndrome de Guillain-Barré",
      def: "اعتلال أعصاب محيطي مناعي حاد يلي غالباً التهاباً فيروسياً أو معوياً، يهاجم الميالين ويسبب شللاً صاعداً.",
      sx: "تنميل وضعف متناظر يبدأ بالقدمين ويصعد للأعلى (Paralysie ascendante)، غياب المنعكسات الوترية، وقد يصل لعضلات البلع والتنفس.",
      comp: "فشل تنفسي حاد يستدعي التنبيب، عسر بلع واختناق، خلل ذاتي (تذبذب ضغط ونظم قلب)، وDVT.",
      care: "مراقبة السعة الحيوية للتنفس والبلع باستمرار، تجهيز أدوات التنبيب، مراقبة القلب والضغط، وتمارين سلبية ومنع الجمود.",
      tip: "ضعف صاعد من الساقين + غياب منعكسات بعد إنفلونزا أو إسهال = غيلان باريه.",
      qs: [
        { q: "أخطر مضاعف يجب مراقبته بمتلازمة غيلان باريه؟", o: ["فشل التنفس نتيجة صعود الشلل لعضلات التنفس", "ارتفاع سكر خفيف", "تساقط شعر"], a: 0 },
        { q: "كيف يتطوّر الضعف العضلي عادة في غيلان باريه؟", o: ["بشكل صاعد ومتناظر من القدمين نحو الأعلى", "من اليد اليمنى فقط", "يبدأ بالوجه وينزل دائماً"], a: 0 },
        { q: "الفحص السريري للمنعكسات الوترية عند مريض غيلان باريه يُظهر:", o: ["ضعفاً أو غياباً بالمنعكسات (Aréflexie)", "اشتداداً شديداً بالمنعكسات", "لا يتأثر نهائياً"], a: 0 }
      ]
    },
    {
      id: "tumeurs_cerebrales",
      t: "أورام الدماغ",
      fr: "Tumeurs cérébrales",
      def: "نمو غير طبيعي لخلايا داخل القحف (أولية أو نقائل) يضغط على النسيج الدماغي ويرفع الضغط داخل الجمجمة.",
      sx: "صداع صباحي يزداد بالسعال، إقياء قذفي بدون غثيان، تشوش رؤية، نوبات صرع جديدة، أو ضعف/اضطراب نطق حسب موضع الورم.",
      comp: "HTIC شديد، انفتاق دماغي (Engagement)، نوبات صرع مستمرة، وعجز عصبي دائم.",
      care: "مراقبة الوعي وHTIC، الوقاية من السقوط والصرع، إعطاء الكورتيكوستيرويدات بانتظام لتخفيف الوذمة، ودعم نفسي للمريض والأهل.",
      tip: "صداع صباحي + إقياء قذفي بدون غثيان = علامة كلاسيكية لـ HTIC.",
      qs: [
        { q: "لماذا تُعطى الكورتيكوستيرويدات لمرضى أورام الدماغ؟", o: ["لتخفيف الوذمة الدماغية والضغط حول الورم", "لزيادة الضغط داخل القحف", "لعلاج فقر الدم"], a: 0 },
        { q: "المواصفات الكلاسيكية للصداع والإقياء في أورام الدماغ (HTIC):", o: ["صداع صباحي وإقياء قذفي بدون غثيان", "ألم بعد الأكل فقط مع حرقة", "صداع يزول عند الاستلقاء تماماً"], a: 0 },
        { q: "حدوث نوبة صرع أولى عند شخص بالغ فوق 40 سنة يستدعي استبعاد:", o: ["آفة أو ورم دماغي", "نقص فيتامين C", "التهاب لوزتين"], a: 0 }
      ]
    },
    {
      id: "craniotomie_temp",
      t: "جراحة فتح القحف (Craniotomie)",
      fr: "Craniotomie (pré/post-op)",
      def: "فتح جراحي في عظم الجمجمة للوصول للدماغ وإزالة ورم أو تفريغ ورم دموي أو معالجة أم دم.",
      sx: "بعد العملية: وذمة بالوجه والعينين، صداع جراحي، مع ضرورة مراقبة علامات النزيف أو تسرب السائل الشوكي.",
      comp: "نزيف وورم دموي بعد العملية، وذمة دماغية وHTIC، تسرب LCR من الجرح/الأنف، التهاب سحايا أو جرح، واختلاجات.",
      care: "قبل العملية: صيام، موافقة، إزالة المعادن، وتقييم عصبي مرجعي. بعد العملية: رفع الرأس 30 درجة (إلا إذا أمر الجراح بغير ذلك)، مراقبة الوعي والحدقات كل ساعة، فحص الضماد لتسرب LCR، ومنع الكحة والإجهاد.",
      tip: "ظهور هالة صفراء حول بقعة دم على الضماد أو سائل شفاف = اشتباه تسرب LCR (بلّغ فوراً).",
      qs: [
        { q: "الوضعية المعتادة لرأس المريض بعد عملية Craniotomie؟", o: ["مرفوع 30 درجة لتسهيل العود الوريدي وتخفيف الضغط", "أخفض من مستوى الجسم", "منحني للأمام بقوة"], a: 0 },
        { q: "ما دلالة وجود سائل شفاف أو هالة صفراء على الضماد بعد Craniotomie؟", o: ["احتمال تسرب السائل الدماغي الشوكي (LCR) ويجب إبلاغ الجراح فوراً", "أمر طبيعي لا يحتاج تبليغاً", "نقص سكر الدم"], a: 0 },
        { q: "لماذا نُجري تقييماً عصبياً كاملاً قبل العملية مباشرة؟", o: ["ليكون خط أساس نقارن به أي تدهور بعد العملية", "لتخدير المريض أسرع", "لإلغاء الحاجة للمراقبة بعد الجراحة"], a: 0 }
      ]
    },
    {
      id: "tumeurs_choc",
      t: "أورام النخاع والصدمة العصبية",
      fr: "Tumeurs médullaires & Choc neurogénique",
      def: "أورام تضغط على الحبل الشوكي (ألم ظهري ليلي وضعف وتنميل)؛ والصدمة العصبية هبوط حاد بالضغط مع بطء نبض بسبب فقدان التوتر الودي بإصابة شوكية فوق T6.",
      sx: "الأورام: ألم موضعي يزداد ليلاً، ضعف أطراف، واضطراب مصرات؛ الصدمة العصبية: هبوط ضغط، بطء نبض (Bradycardie)، وجلد دافئ وجاف.",
      comp: "انضغاط نخاعي حاد وشلل دائم، نقص تروية الأعضاء الحيوية، اضطراب تنظيم الحرارة، واحتباس بولي.",
      care: "تثبيت العمود الفقري، سوائل وريدية ورافعات ضغط (وAtropine لبطء النبض)، مراقبة الحرارة (تتأثر بحرارة الغرفة)، ومراقبة البول والحس الحركي.",
      tip: "الصدمة العصبية = هبوط ضغط + بطء نبض + جلد دافئ (عكس النزفية: تسرّع نبض + جلد بارد).",
      qs: [
        { q: "ما الذي يميّز الصدمة العصبية عن الصدمة النزفية؟", o: ["هبوط ضغط مع بطء نبض (Bradycardie) وجلد دافئ", "تسرّع نبض شديد مع جلد بارد ومتعرّق", "ارتفاع ضغط دم حاد"], a: 0 },
        { q: "العلامة الإنذارية التي تستدعي تدخلاً عاجلاً في أورام النخاع الشوكي؟", o: ["ظهور ضعف حركي متسارع أو احتباس بولي/برازي", "ألم خفيف بالكتف يزول فوراً", "عطاس متكرر"], a: 0 },
        { q: "لماذا يجب مراقبة حرارة مريض الصدمة العصبية بدقة؟", o: ["لفقدان التنظيم الحراري (Poïkilothermie) تحت مستوى الإصابة", "لأنه يشرب ماءً بارداً", "بسبب ارتفاع السكر فقط"], a: 0 }
      ]
    }
  ];

  var L = [];
  for (var ri = 0; ri < RAW.length; ri++) {
    if (!REPLACED[RAW[ri].id]) L.push(RAW[ri]);
  }

  function loadState() {
    try {
      var o = JSON.parse(w.localStorage.getItem(SK) || "{}");
      if (!o || typeof o !== "object") o = {};
      o.done = o.done || {};
      o.wrong = o.wrong || {};
      return o;
    } catch (e) {
      return { done: {}, wrong: {} };
    }
  }

  function saveState(o) {
    o.ts = Date.now();
    try { w.localStorage.setItem(SK, JSON.stringify(o)); } catch (e) {}
  }

  function qKey(it, qi) { return it.id + "_" + qi; }

  function shuffleIdx(len) {
    var arr = [], i, j, tmp;
    for (i = 0; i < len; i++) arr.push(i);
    for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* =========================================================
     1) LEARN MODE BRIDGE: learn.html?ntemp=<lesson_id>
     Works seamlessly with assets/part-ask.js (اسأل عثمان)
     ========================================================= */
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(w.location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function findById(id) {
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  }

  function runLearnMode(it) {
    var app = d.getElementById("ln-app");
    if (!app) return;
    var paras = [
      { h: "📌 التعريف", tx: it.def },
      { h: "🔎 الأعراض والعلامات", tx: it.sx },
      { h: "⚠️ المضاعفات المهمّة", tx: it.comp },
      { h: "🩺 الدور التمريضي ونصيحة الامتحان", tx: it.care + "\n\n💡 نصيحة الامتحان: " + it.tip }
    ];
    var step = 0; // 0..3 = paragraphs, 4..6 = questions, 7 = done
    var qScores = 0;

    function render() {
      var total = paras.length + it.qs.length;
      var pct = Math.min(100, Math.round(100 * step / total));
      app.innerHTML = "";

      var top = d.createElement("div");
      top.style.cssText = "margin-bottom:12px";
      top.innerHTML =
        "<div style='display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px'>" +
          "<div><span style='display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(245,158,11,.16);color:#b45309;font-size:12px;font-weight:700;margin-left:6px'>درس مؤقت قابل للاستبدال</span><b>" + it.t + "</b> <small dir='ltr'>(" + it.fr + ")</small></div>" +
          "<a class='btn sm' href='neuro.html#ntemp-sec'>↩ كل دروس الأعصاب</a>" +
        "</div>" +
        "<div style='height:8px;border-radius:99px;background:rgba(127,127,127,.2);overflow:hidden'><i style='display:block;height:100%;width:" + Math.max(6, pct) + "%;background:linear-gradient(90deg,#0f766e,#16a34a)'></i></div>";
      app.appendChild(top);

      if (step < paras.length) {
        var p = paras[step];
        var art = d.createElement("article");
        art.className = "lnpara";
        art.style.cssText = "padding:16px;border-radius:16px;border:1px solid rgba(127,127,127,.22);background:var(--card,#fff);margin-bottom:12px";
        art.innerHTML =
          "<h2 style='margin:0 0 8px;font-size:17px'>" + p.h + " <small style='font-weight:400;opacity:.7'>(" + (step + 1) + " / " + paras.length + ")</small></h2>" +
          "<p style='margin:0;font-size:15.5px;line-height:1.75;white-space:pre-line'>" + p.tx + "</p>";
        app.appendChild(art);

        var nav = d.createElement("div");
        nav.className = "lnnav";
        nav.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px";
        if (step > 0) {
          var prev = d.createElement("button");
          prev.type = "button";
          prev.className = "btn";
          prev.textContent = "→ الفقرة السابقة";
          prev.onclick = function () { step--; render(); };
          nav.appendChild(prev);
        }
        var next = d.createElement("button");
        next.type = "button";
        next.className = "btn pri";
        next.textContent = (step === paras.length - 1) ? "ابدأ أسئلة الفهم ←" : "الفقرة التالية ←";
        next.onclick = function () { step++; render(); };
        nav.appendChild(next);
        app.appendChild(nav);
        return;
      }

      var qi = step - paras.length;
      if (qi < it.qs.length) {
        var qobj = it.qs[qi];
        var qc = d.createElement("div");
        qc.className = "qcard lnq";
        qc.setAttribute("data-qid", "ntemp_" + qKey(it, qi));

        var qq = d.createElement("p");
        qq.className = "qq";
        qq.textContent = "سؤال " + (qi + 1) + " / " + it.qs.length + ": " + qobj.q;
        qc.appendChild(qq);

        var fb = d.createElement("div");
        fb.className = "lnfb";
        fb.style.cssText = "margin-top:10px";

        var qnav = d.createElement("div");
        qnav.className = "qnav";
        qnav.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:12px";
        qnav.hidden = true;

        var order = shuffleIdx(qobj.o.length);
        var letters = ["a", "b", "c", "d"];
        var locked = false;

        order.forEach(function (origIdx, pos) {
          var b = d.createElement("button");
          b.type = "button";
          b.className = "opt";
          b.innerHTML = "<span class='l' dir='ltr'>" + letters[pos] + "</span><span>" + qobj.o[origIdx] + "</span>";
          b.onclick = function () {
            if (locked) return;
            var st = loadState();
            var k = qKey(it, qi);
            if (origIdx === qobj.a) {
              locked = true;
              qScores++;
              b.style.borderColor = "#16a34a";
              b.style.background = "rgba(22,163,74,.12)";
              st.done[k] = 1;
              delete st.wrong[k];
              saveState(st);
              fb.innerHTML = "<div class='expl' style='padding:10px;border-radius:10px;background:rgba(22,163,74,.1);border:1px solid #16a34a'>✅ <b>صح!</b> " + it.tip + "</div>";
              qnav.hidden = false;
            } else {
              b.style.borderColor = "#dc2626";
              b.style.background = "rgba(220,38,38,.1)";
              st.wrong[k] = 1;
              saveState(st);
              fb.innerHTML = "<div class='expl' style='padding:10px;border-radius:10px;background:rgba(220,38,38,.09);border:1px solid #dc2626'>🔒 <b>قفل الإتقان:</b> الجواب مش دقيق — راجع الفكرة وجرّب تختار الجواب الصح لتنتقل للسؤال التالي.<br><small>💡 تلميح: " + it.tip + "</small></div>";
            }
          };
          qc.appendChild(b);
        });

        var nb = d.createElement("button");
        nb.type = "button";
        nb.className = "btn pri";
        nb.textContent = (qi === it.qs.length - 1) ? "إنهاء الدرس ←" : "التالي ←";
        nb.onclick = function () { step++; render(); };
        qnav.appendChild(d.createElement("span"));
        qnav.appendChild(nb);

        qc.appendChild(fb);
        qc.appendChild(qnav);
        app.appendChild(qc);
        return;
      }

      // Finished screen
      var fin = d.createElement("div");
      fin.className = "qcard";
      fin.style.cssText = "text-align:center;padding:22px 16px";
      var curIdx = L.indexOf(it);
      var nxt = (curIdx >= 0 && curIdx + 1 < L.length) ? L[curIdx + 1] : null;
      fin.innerHTML =
        "<h2 style='margin:0 0 8px'>🎉 برافو! خلّصت درس «" + it.t + "»</h2>" +
        "<p style='margin:0 0 14px;opacity:.85'>انحسب تقدّمك تلقائياً بنسبة <b>جاهزيتك للامتحان</b>.</p>" +
        "<div style='display:flex;gap:8px;justify-content:center;flex-wrap:wrap'>" +
          (nxt ? "<a class='btn pri' href='learn.html?ntemp=" + encodeURIComponent(nxt.id) + "'>الدرس التالي: " + nxt.t + " ←</a>" : "") +
          "<a class='btn' href='neuro.html#ntemp-sec'>↩ كل دروس الأعصاب</a>" +
          "<a class='btn' href='index.html'>🏠 الرئيسية</a>" +
        "</div>";
      app.appendChild(fin);
    }

    render();
  }

  /* =========================================================
     2) REVIEW SECTION ON neuro.html / midterm.html / exam-prep.html
     Includes "Retry Wrong Questions Only" + "Study in Learn Mode"
     ========================================================= */
  function buildReviewSection() {
    var s = d.createElement("section");
    s.id = "ntemp-sec";
    s.style.cssText = "margin:18px 0;padding:14px;border-radius:16px;border:1.5px solid #f59e0b;background:rgba(245,158,11,.07);direction:rtl;text-align:right";

    var onlyWrong = false;
    var totQ = 0;
    L.forEach(function (x) { totQ += x.qs.length; });

    function countStats() {
      var st = loadState();
      var dn = 0, wr = 0;
      L.forEach(function (it) {
        it.qs.forEach(function (_, qi) {
          var k = qKey(it, qi);
          if (st.done[k]) dn++;
          if (st.wrong[k]) wr++;
        });
      });
      return { dn: dn, wr: wr, st: st };
    }

    function renderSection() {
      var stats = countStats();
      s.innerHTML = "";

      var hd = d.createElement("div");
      hd.innerHTML =
        "<h2 style='margin:0;color:#b45309;font-size:18px'>⚠️ دروس أعصاب مؤقتة للمراجعة (" + L.length + " درس · " + totQ + " سؤال)</h2>" +
        "<p style='margin:8px 0 10px;padding:9px;border-radius:10px;background:rgba(245,158,11,.13);font-size:13px;line-height:1.55'>تنبيه: هالدروس والمضاعفات والأسئلة مضافة مؤقتاً لحين وصول الـ PDF الرسمي من المعهد — وكل درس مستقل ومنستبدله بالدرس الأساسي أول ما يوصل.</p>";
      s.appendChild(hd);

      var bar = d.createElement("div");
      bar.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:12px;padding:8px 10px;border-radius:12px;background:var(--card,#fff);border:1px solid rgba(127,127,127,.2)";

      var sc = d.createElement("div");
      sc.style.cssText = "font-weight:700;font-size:13.5px;color:#0369a1";
      sc.textContent = "المُتقَن: " + stats.dn + " / " + totQ + (stats.wr ? (" · أخطاء للمراجعة: " + stats.wr) : "");
      bar.appendChild(sc);

      var btns = d.createElement("div");
      btns.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";

      var wBtn = d.createElement("button");
      wBtn.type = "button";
      wBtn.style.cssText = "padding:6px 11px;border-radius:999px;border:1.5px solid " + (onlyWrong ? "#0f766e" : "#dc2626") + ";background:" + (onlyWrong ? "#0f766e" : "rgba(220,38,38,.09)") + ";color:" + (onlyWrong ? "#fff" : "#b91c1c") + ";font:inherit;font-size:12.5px;font-weight:700;cursor:pointer";
      wBtn.textContent = onlyWrong ? "👁️ عرض كل الدروس" : ("🔄 أعد الأسئلة يلي غلطت فيها فقط (" + stats.wr + ")");
      wBtn.onclick = function () {
        if (!onlyWrong && stats.wr === 0) {
          alert("برافو! ما عندك حالياً ولا سؤال غلط لتعيده.");
          return;
        }
        onlyWrong = !onlyWrong;
        renderSection();
      };
      btns.appendChild(wBtn);

      if (stats.dn > 0 || stats.wr > 0) {
        var rBtn = d.createElement("button");
        rBtn.type = "button";
        rBtn.style.cssText = "padding:6px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer";
        rBtn.textContent = "♻️ تصفير";
        rBtn.onclick = function () {
          if (!confirm("تصفير إجابات الدروس المؤقتة لإعادة التدريب؟")) return;
          saveState({ done: {}, wrong: {} });
          onlyWrong = false;
          renderSection();
        };
        btns.appendChild(rBtn);
      }

      bar.appendChild(btns);
      s.appendChild(bar);

      var shown = 0;
      L.forEach(function (it, i) {
        var wrongQs = [];
        it.qs.forEach(function (qobj, qi) {
          if (!onlyWrong || stats.st.wrong[qKey(it, qi)]) wrongQs.push({ qobj: qobj, qi: qi });
        });
        if (onlyWrong && !wrongQs.length) return;
        shown++;

        var dt = d.createElement("details");
        if (onlyWrong) dt.open = true;
        dt.style.cssText = "margin-bottom:8px;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,127,127,.22);background:var(--card,#fff)";

        var doneInLesson = 0;
        it.qs.forEach(function (_, qi) { if (stats.st.done[qKey(it, qi)]) doneInLesson++; });
        var badge = doneInLesson === it.qs.length ? " ✅" : (doneInLesson > 0 ? (" (" + doneInLesson + "/" + it.qs.length + ")") : "");

        dt.innerHTML =
          "<summary style='cursor:pointer;font-weight:700;font-size:14px'>" + (i + 1) + ". " + it.t + " (" + it.fr + ")" + badge + "</summary>" +
          "<div style='margin-top:8px;font-size:13.5px;line-height:1.6'>" +
            "<div style='margin-bottom:8px'><a class='btn sm pri' href='learn.html?ntemp=" + encodeURIComponent(it.id) + "' style='display:inline-block;padding:5px 11px;border-radius:999px;background:#0f766e;color:#fff;text-decoration:none;font-size:12.5px;font-weight:700'>📖 ادرس بوضع التعلّم + اسأل عثمان</a></div>" +
            "<p style='margin:3px 0'><b>📌 التعريف:</b> " + it.def + "</p>" +
            "<p style='margin:3px 0'><b>🔎 الأعراض والعلامات:</b> " + it.sx + "</p>" +
            "<p style='margin:3px 0'><b>⚠️ المضاعفات:</b> " + it.comp + "</p>" +
            "<p style='margin:3px 0'><b>🩺 الدور التمريضي:</b> " + it.care + "</p>" +
            "<p style='margin:3px 0 8px'><b>💡 نصيحة الامتحان:</b> " + it.tip + "</p>" +
          "</div>";

        var bodyDiv = dt.lastChild;
        wrongQs.forEach(function (entry) {
          var qobj = entry.qobj, qi = entry.qi, k = qKey(it, qi);
          var qb = d.createElement("div");
          qb.style.cssText = "padding:9px;margin-top:7px;border-radius:10px;background:rgba(14,165,233,.07);border:1px solid rgba(14,165,233,.25)";
          var qp = d.createElement("p");
          qp.style.cssText = "margin:0 0 6px;font-weight:700;font-size:13.5px";
          qp.textContent = "❓ سؤال " + (qi + 1) + ": " + qobj.q;
          qb.appendChild(qp);

          var fb = d.createElement("div");
          fb.style.cssText = "margin-top:5px;font-size:13px;font-weight:700";
          fb.hidden = true;

          qobj.o.forEach(function (ot, oi) {
            var b = d.createElement("button");
            b.type = "button";
            b.style.cssText = "display:block;width:100%;text-align:right;padding:7px 10px;margin-bottom:5px;border-radius:8px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit;font:inherit;cursor:pointer";
            b.textContent = ot;
            b.onclick = function () {
              if (fb.dataset.dn) return;
              fb.dataset.dn = "1";
              fb.hidden = false;
              var st2 = loadState();
              if (oi === qobj.a) {
                b.style.background = "#16a34a";
                b.style.color = "#fff";
                fb.textContent = "✅ صح! " + it.tip;
                st2.done[k] = 1;
                delete st2.wrong[k];
              } else {
                b.style.background = "#dc2626";
                b.style.color = "#fff";
                fb.textContent = "❌ الصح: " + qobj.o[qobj.a];
                st2.wrong[k] = 1;
              }
              saveState(st2);
              var ns = countStats();
              sc.textContent = "المُتقَن: " + ns.dn + " / " + totQ + (ns.wr ? (" · أخطاء للمراجعة: " + ns.wr) : "");
              if (!onlyWrong) wBtn.textContent = "🔄 أعد الأسئلة يلي غلطت فيها فقط (" + ns.wr + ")";
            };
            qb.appendChild(b);
          });

          qb.appendChild(fb);
          bodyDiv.appendChild(qb);
        });

        s.appendChild(dt);
      });

      if (onlyWrong && shown === 0) {
        var empty = d.createElement("p");
        empty.style.cssText = "text-align:center;font-weight:700;color:#15803d;padding:12px";
        empty.textContent = "🎉 ممتاز! صحّحت كل الأسئلة الغلط.";
        s.appendChild(empty);
      }
    }

    renderSection();
    return s;
  }

  function boot() {
    var ntId = getParam("ntemp");
    if (ntId && d.getElementById("ln-app")) {
      var target = findById(ntId);
      if (target) {
        // Delay slightly so learn.js finishes its empty-state pass, then take over cleanly
        setTimeout(function () { runLearnMode(target); }, 60);
        return;
      }
    }
    if (d.getElementById("ln-app")) return; // On learn.html without ?ntemp, stay invisible
    if (d.getElementById("ntemp-sec")) return;
    var host = d.getElementById("ep-app") || d.querySelector("main") || d.body;
    if (host) host.appendChild(buildReviewSection());
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 220);
})(window, document);
