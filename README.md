# قلب وأعصاب — دروس تمريض · Cardio & Neuro — Soins infirmiers

موقع ثابت (HTML/CSS/JS فقط) لمراجعة دروس التمريض: **أمراض القلب**، **الجهاز العصبي**، و**حاجات Henderson الـ ١٤** — بالعربي مع كل المصطلحات الفرنسية، و**مجسّمات 3D** حقيقية بتحرّكها بإصبعك، و**كويز** بأسلوب الامتحان من الدروس نفسها.

A static (HTML/CSS/JS only) nursing-revision site in Arabic with French terms: cardiology, neurology and Henderson's 14 needs, interactive 3D anatomy models (heart, brain, lumbar spine) and an exam-style quiz.

---

## 🇱🇧 بالعربي

### شو في بالموقع؟
- `index.html` الرئيسية
- `cardio.html` — 12 دروس قلب + قلب 3D
- `neuro.html` — 8 دروس أعصاب + دماغ وعمود قطني 3D
- `henderson.html` — الحاجات الـ ١٤
- `quiz.html` — 127 سؤال (الأسئلة بملف `assets/quiz-data.js`)
- `3d.html` — المجسّمات التلاتة
- `about.html`، `privacy.html` (ضرورية للإعلانات)، `credits.html` (المصادر والتراخيص — **لا تحذفها**)، `404.html`
- `models/` — ملفات الـ 3D (`heart.glb`، `brain.glb`، `spine.glb`)، مضغوطة بـ meshopt
- `vendor/` — مكتبة `<model-viewer>` من Google:
  - `model-viewer.min.js` النسخة العادية
  - `model-viewer.min.js.bin` نفس الملف بس مضغوط (gzip) — الموقع بيستعملو أوّل شي لأنو أخفّ، وإذا المتصفح قديم بيرجع للنسخة العادية
  - `meshopt_decoder.js` لفك ضغط المجسّمات
- `assets/` التصميم والسكربتات، `sitemap.xml`، `robots.txt`، `ads.txt`، `og.jpg` (صورة المشاركة)، `favicon.svg`
- `tests/` فحص آلي اختياري (`node --test tests/`)

ما في build ولا server. **مهم:** الـ 3D ما بيشتغل إذا فتحت `index.html` مباشرة من الملف (file://) لأن المتصفح بيمنع تحميل الـ GLB؛ جرّبو على GitHub Pages أو بسيرفر محلي (مثلاً `python3 -m http.server`).

### كيف ترفعه على GitHub وتشغّل GitHub Pages
1. اعمل حساب على https://github.com (إذا ما عندك).
2. اضغط **New repository**، سمّيه مثلاً `nursing` واختار **Public**، وبعدين **Create repository**.
3. فك ملف الـ zip. بصفحة الـ repository اضغط **uploading an existing file** (أو Add file ← Upload files) واسحب **محتوى** المجلّد (الملفات والمجلّدات `assets` و`models` و`vendor`، مش المجلّد نفسه)، وبعدين **Commit changes**.
   - ملف `.nojekyll` مخفي؛ الأفضل يكون موجود.
4. **Settings ← Pages ← Deploy from a branch**، الفرع `main` والمجلّد `/ (root)`، **Save**.
5. بعد دقيقة أو اثنتين: `https://اسم-المستخدم.github.io/nursing/`

### بعد ما يشتغل: غيّر الرابط
الرابط التجريبي `https://nursin.store` مكتوب في `sitemap.xml` و`robots.txt` وأول كل صفحة `.html` (`canonical` و`og:url` و`og:image`). بدّلو برابطك بـ Find & Replace (مثلاً بـ VS Code). وغيّر `[ضع بريدك الإلكتروني هنا]` في `about.html` و`privacy.html`.

### الإعلانات (Google AdSense) — بصراحة
- AdSense **بدها موافقة** من Google ومش مضمونة: محتوى أصلي وكافي، صفحة خصوصية (موجودة)، صفحة "من نحن" وطريقة تواصل.
- غالباً **ما بيقبلوا** رابط `github.io`. الأفضل **دومين خاص** (تقريباً 10–15$ بالسنة) وتربطه من **Settings ← Pages ← Custom domain**.
- الأرباح **قليلة** بالبداية وبتكبر مع الزوّار. سجّل الموقع على **Google Search Console** وابعت `sitemap.xml`، وشاركو مع رفقاتك.
- **انتبه:** بعض الشرح مأخوذ من كورسات الصف. قبل ما تنشرو للعموم وتربح منو، الأفضل تتأكّد إنو الأستاذ/المعهد ما عندن مانع.

### كيف تحط كود AdSense بعد الموافقة
1. بكل صفحة `.html` بالـ `<head>` في تعليق فيه `Google AdSense`: شيل `<!--` و`-->` وحط رقمك `ca-pub-...`.
2. أماكن الإعلانات: ابحث عن `class="ad-slot"` وشيل التعليق من حول `<ins class="adsbygoogle" ...>` وحط `data-ad-client` و`data-ad-slot`.
3. بملف `ads.txt` حط السطر يلي بتعطيك ياه Google. أو فعّل **Auto ads** وحط سكربت الـ `<head>` بس.

### تعديل المحتوى
- النصوص مباشرة بملفات `cardio.html` و`neuro.html` و`henderson.html` (كل درس جوّا `<details class="topic">`).
- الأسئلة بـ `assets/quiz-data.js`: كل سؤال `q` (السؤال)، `o` (٣ خيارات)، `a` (رقم الجواب الصح: 0=a، 1=b، 2=c)، `x` (الشرح)، `t` (الدرس)، `id` (رقم ثابت متل `q001`، لا تغيّرو لسؤال موجود؛ للسؤال الجديد خود رقم جديد).
- **نقاط ضعفك** (`assets/weak.js`): شخصية لكل زائر. كل سؤال بيغلط فيه بالكويز بينحفظ بمتصفّحو بس (localStorage، المفتاح `nursin_weak_v1`)، بلا server ولا تسجيل. بس يجاوبو صح مرّتين ورا بعض بيطلع. القسم بيطلع بالرئيسية وبصفحة الكويز، وفيه «كويز من أخطائك» وزر يمحي الكل.
- أسماء النقاط على المجسّمات وأماكنها بأول `assets/viewer.js`.
- **أصحابي والليفلات** (`friends.html`، `assets/account.js`، `assets/fb.js`): تسجيل دخول اختياري بغوغل عبر Firebase (مشروع `nursin-5aaa0`). كل جواب صح بالكويز = +١٠ نقاط وكل غلط = −٥ (ما بتنزل تحت الصفر) لمّا يكون الطالب مسجّل؛ الليفل = ⌊√(النقاط÷50)⌋+1 (ليفل 2 بـ 50، ليفل 3 بـ 200، ليفل 4 بـ 450…). كل طالب إلو كود صداقة من ٦ أحرف/أرقام، بيزيد أصحابو بالكود وبيشوف «ترتيب أصحابي». البيانات بـ Firestore: `users/{uid}` (name, photo, points, level, friendCode, updatedAt)، `users/{uid}/friends/{friendUid}` (since)، `friendCodes/{code}` (uid). **التحدّي ⚔️**: من «ترتيب أصحابي» زر «تحدّى» بيعمل `challenges/{id}` (from, to, fromName, toName, seed, qids = ١٠ أسئلة من الـ seed، fromScore, toScore, fromBonus, toBonus, createdAt)؛ الاتنين بيلعبوا نفس الأسئلة بـ `quiz.html?challenge=<id>`، ويلي بيربح بياخد +٢٠ مرّة وحدة (كل واحد بيزيد نقاطو هوّي بس). قواعد الأمان بملف `firestore.rules` (لازم تنحط بـ Firebase Console ← Firestore ← Rules). Firebase بينزل بس بصفحة أصحابي أو لمين مسجّل دخول، فالزوّار يلي مش مسجّلين ما بيتأثّروا. الإعدادات (`firebaseConfig`) عامة وآمنة بالكود؛ ما في Firebase Analytics لأن الموقع عندو GA4.

### المجسّمات والتراخيص
المجسّمات من **BodyParts3D** (© The Database Center for Life Science) بترخيص **CC BY-SA 2.1 Japan**: لازم يضل ذكر المصدر، وأي تعديل عليها بيضل بنفس الترخيص. `<model-viewer>` بترخيص Apache 2.0، وmeshoptimizer بترخيص MIT. التفاصيل بـ `credits.html`. ما في شي مولّد بالذكاء الاصطناعي.

---

## 🇬🇧 English

### What's inside
Home, cardiology (12 lessons + 3D heart), neurology (8 lessons + 3D brain and lumbar spine), Henderson's 14 needs, a 127-question exam-style quiz with explanations, a 3D page, about / privacy / credits / 404, `sitemap.xml`, `robots.txt`, `ads.txt`, an Open Graph image. No build step, no server, no external requests.

3D uses Google's `<model-viewer>` (vendored in `vendor/`). The site first loads `vendor/model-viewer.min.js.bin` (the same file gzip-compressed, decompressed in the browser) and falls back to `vendor/model-viewer.min.js`. Models are meshopt-compressed GLB files in `models/`. Note: browsers block GLB loading from `file://`, so test over http (GitHub Pages or `python3 -m http.server`).

### Publish on GitHub Pages
1. Create a **public** repository. 2. Upload the **contents** of the folder (including `assets/`, `models/`, `vendor/`, and `.nojekyll`). 3. *Settings → Pages → Deploy from a branch → `main` / root → Save.* 4. Replace `https://nursin.store` with your URL in `sitemap.xml`, `robots.txt` and each page's `canonical`/`og:` tags; add your email to `about.html` and `privacy.html`.

### AdSense, honestly
Approval is required and not guaranteed; a `github.io` address is usually refused — buy a custom domain and connect it in *Settings → Pages*. Revenue starts small. After approval, uncomment the head script (search `Google AdSense`) and the `<ins class="adsbygoogle">` units inside `class="ad-slot"`, and fill `ads.txt`. EU/UK visitors need a certified consent banner (AdSense *Privacy & messaging*). Some lesson content is based on class course material — check with the instructor/institute before monetising it publicly.

### Licences
3D models: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan (modified: parts selected/merged, recoloured, decimated, vessels trimmed, meshopt-compressed; the modified models stay under CC BY-SA 2.1 JP). `<model-viewer>`: Apache-2.0. meshoptimizer: MIT.

### Disclaimer
Educational revision content only; not medical advice. Always follow your institution's protocols.

## Opening splash
`assets/splash.js` (loaded right after `<body>` on every page) shows the nursin logo — a heart with a heartbeat line, a small nurse cross, «nursin» and «تمريض بالعربي» — once per browser session (sessionStorage), about 2 s, tap to skip. It hides itself by CSS even if JS stops, and shows a static logo for visitors who prefer reduced motion. The same heart is the favicon and the header logo.
