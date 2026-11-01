/* 📌 built-in homework (Nov 1 2026, Abdullah 3:30 PM: «إذا هيدي الوظيفة دغري بتحط أسئلتك») — works WITHOUT Firestore, for every student
   (signed in or not). assets/homework.js merges these with the admin's Firestore homework (homework/{id}); if he later adds the same one
   from admin.html (same due date + a title with one of `match`), only this one shows and either «سلّمتها ✅» counts.
   Each entry: id, title, subj (lesson subject key), due 'YYYY-MM-DD' (Asia/Beirut — it leaves the path and the list after that day), note,
   img {src, w, h, ar, fr} = the teacher's sheet (tap → the diagram zoom viewer), cases [{n, lines[], q[]}] = the questions typed out in the
   teacher's own words; «(؟)» marks a word that could not be read for sure on the photo. To add one: push an object. */
window.NURSIN_HW_STATIC = [
  {
    id: "st-massage-cardiaque",
    title: "Etude de cas — Massage cardiaque (إنعاش القلب)",
    subj: "rea",
    due: "2026-11-06",
    note: "حالتين: حلّوهن وسلّموهن للأستاذ",
    notefr: "Deux cas : à résoudre et à rendre au prof",
    match: ["massage cardiaque", "massage", "إنعاش القلب"],
    img: { src: "assets/homework/devoir-massage-cardiaque.jpg", w: 900, h: 1210, ar: "ورقة الوظيفة الأصلية", fr: "La feuille originale du devoir",
      alt: "صورة ورقة الوظيفة: Étude de cas — Massage cardiaque، حالتين مع الأسئلة", altfr: "Photo de la feuille : Étude de cas — Massage cardiaque, deux cas avec les questions" },
    head: "Étude de cas — Massage cardiaque",
    cases: [
      { n: "الحالة 1", nfr: "Cas 1", lines: [
        "وصل مريض على الطوارئ عمره 35 ans.",
        "عندو: Température (حرارة) – Céphalée (وجع راس).",
        "وهو عم يحكي مع الطاقم صار عندو دوخة (؟).",
        "أخدولو: Tachycardie (تسرّع القلب) – Hyperthermie (ارتفاع الحرارة).",
        "بعدين فقد الوعي.",
        "Score de Glasgow = 8 après 15 min → Coma.",
        "التشخيص المحتمل: AVC hémorragique (جلطة نزفية) – Méningite (التهاب السحايا)."
      ], q: ["1- شخّص الحالة وحدّد العناية التمريضية للمريض."] },
      { n: "الحالة 2", nfr: "Cas 2", lines: [
        "وصلت مريضة عمرها 80 ans على الطوارئ بعد ما وقعت (؟) بالبيت.",
        "عندها: Hémorragie cérébrale (نزيف دماغي) : Scan cérébral",
        "– BAV 3ème degré (إحصار أذيني بطيني درجة 3) : E.C.G",
        "– Côte fracturée (ضلع مكسور) : صورة أشعة.",
        "Score de Glasgow = 10.",
        "صار عندها Arrêt cardiaque (توقف القلب)."
      ], q: ["1- شو لازم تعمل؟ (إنعاش القلب)"] }
    ]
  }
];
