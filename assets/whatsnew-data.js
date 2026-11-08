/* 🆕 «شو الجديد» — what changed on the site, in short student-friendly Lebanese Arabic (Abdullah, Nov 7 2026 1:31 PM: «فيك دايماً تبعت
   إنت لحالك إشعار عند تحديث بعض الميزات أو إضافة دروس»; 1:32 PM: «ويروح الإعلان من بعد ما يشوفو الطالب»).
   ➕ HOW TO ADD: put ONE new line at the TOP of the list — { id: unique (the release tag is fine), date: "YYYY-MM-DD", text: "…", link: "page.html#…" (optional) }.
   Every student sees each entry ONCE (assets/whatsnew.js: a small card, gone after ✕ or after he saw it; seen ids synced to his account).
   New lessons don't need a line here: a lesson with added: 'YYYY-MM-DD' in assets/lessons.js gets a «جديد» badge for 7 days by itself.
   Brand-new students start with every entry already seen (no flood on the first visit). No ads in this card. */
window.NURSIN_WHATSNEW = [
  { id: "30p", date: "2026-11-08", text: "🔊 لعبة المليون صار فيها موسيقى حقيقية متل البرنامج، وبتشتغل عالآيفون حتى لو صامت", link: "/games.html#mil" },
  { id: "30o", date: "2026-11-08", text: "📖 جديد: فوق بالصفحة الرئيسية بيبيّن وين وقفت بالدرس، كبسة وبترجع لنفس المكان", link: "/index.html" },
  { id: "30n", date: "2026-11-08", text: "🔊 لعبة المليون صار فيها صوت متل البرنامج: دقّات الوقت لما يخلص + أصوات الجواب", link: "/games.html#mil" },
  { id: "30m", date: "2026-11-08", text: "🏆 لعبة جديدة: مين بدو يربح المليون؟ ١٥ سؤال من دروسك + ٣ مساعدات", link: "/games.html#mil" },
  { id: "30l", date: "2026-11-07", text: "📅 المراجعة صارت ٦ دروس باليوم (الأقرب لامتحانك أول) وما بتنشطب إلا لما تخلصها", link: "/hifzi.html#due" },
  { id: "30k", date: "2026-11-07", text: "🫁 درس جديد بالإنعاش: التهوية الميكانيكية (VCV · PCV · PSV · VNI) + كويز", link: "/rea.html#r5" },
  { id: "30j", date: "2026-11-07", text: "📅 مواعيد الامتحانات الجديدة: ١٤/١١ وقائية + Réa · ١٦/١١ الباقي · ٢١/١١ عقلية + Géria + Qualité · ٢٨/١١ صحة جماعية + Pharmaco", link: "/midterm.html" },
  { id: "30i", date: "2026-11-07", text: "❓ شرح صغير لكل شي بالموقع: أول مرة بتفوت عحاجة بيورجيك كيف تستعملها (والقلم 🖍️ أول شي). بدك ترجع تشوفو؟ «❓ كيف بستعمل» بالقائمة", link: "" },
  { id: "30h", date: "2026-11-07", text: "✅ بـ«🧭 مسار اليوم» يلّي بتخلصو بينزل لتحت، والباقي بيضل فوق", link: "index.html#path" },
  { id: "30g", date: "2026-11-07", text: "⚡ الكويز والامتحانات وسؤال اليوم والتكرار المتباعد بتحلّن جوّا المسار مباشرة، من غير ما تروح عالصف", link: "index.html#path" },
  { id: "30f", date: "2026-11-07", text: "👀 كل خطوات «🧭 مسار اليوم» صارو ظاهرين دغري (ما في «+كمان»)", link: "index.html#path" },
  { id: "30e", date: "2026-11-07", text: "🧭 صار في لائحة وحدة لكل شي لازم تعملو اليوم: «مسار اليوم» (والأهداف صارو جوّاتو)", link: "index.html#path" }
];
