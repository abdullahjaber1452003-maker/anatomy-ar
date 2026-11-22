name: Daily Nursing Podcast (15-20 min Lebanese MP3)

on:
  schedule:
    - cron: "30 3 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  daily-podcast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install --no-cache-dir edge-tts
      - name: Generate 15-20 min episode with Sara & Osman Lebanese neural voices
        run: |
          python3 - << 'PY'
          import asyncio, datetime, json, os, re, urllib.request, edge_tts

          API = "https://summer-forest-fd40.abdullahjaber1452003.workers.dev/"
          OUT_DIR = "assets/podcasts"
          DAILY_JSON = os.path.join(OUT_DIR, "daily.json")
          SUBJ = {"cardio":("القلب","🫀"),"neuro":("الأعصاب","🧠"),"henderson":("Henderson","📋"),"medsurg":("Med-Surg","🏥"),"rea":("الإنعاش","🚑"),"pharma":("الأدوية","💊"),"law":("القانون","⚖️"),"mgmt":("الإدارة","🏢"),"quality":("الجودة","✅"),"geri":("الشيخوخة","👴"),"comm":("صحة المجتمع","🏘️"),"prev":("الوقائية","🛡️")}
          CHAPTERS = [
            ("١. المقدمة والأساسيات والمصطلحات", "ابدأوا بودكاست تمريضي هادئ وطبيعي باللبناني المبسط مع المصطلحات الفرنسية ومعناها بالعربي. هذا الفصل الأول: ترحيب لطيف من سارة بالأستاذ عثمان وشرح الأساسيات والمصطلحات. اكتب ١٤ إلى ١٦ تبادل حواري غني ومفصّل (كل مداخلة ٢ إلى ٤ جمل)."),
            ("٢. التفاصيل السريرية والأعراض والأرقام", "كمّلوا نفس الحلقة — الفصل الثاني: تعمّقوا بالأعراض، الأسباب، الآلية، الأرقام الطبيعية، والفروقات الأساسية بلا إعادة ترحيب. اكتب ١٤ إلى ١٦ تبادل حواري غني (كل مداخلة ٢ إلى ٤ جمل)."),
            ("٣. حالة مريض واقعية والدور التمريضي", "كمّلوا نفس الحلقة — الفصل الثالث: الأستاذ عثمان يطرح حالة مريض واقعية بالمستشفى وسارة تسأله عن الدور التمريضي والمراقبة والأولويات والأدوية. اكتب ١٤ إلى ١٦ تبادل حواري غني (كل مداخلة ٢ إلى ٤ جمل)."),
            ("٤. فخاخ الامتحان والملخّص الذهبي", "اختموا الحلقة — الفصل الرابع: أشهر فخاخ الامتحان، طرق حفظ سريعة، ملخّص ٣ نقاط ذهبية، ووداع لطيف. اكتب ١٢ إلى ١٤ تبادل حواري، وبآخر سطر أضف حرفياً: QUIZ:{\"q\":\"السؤال\",\"o\":[\"خيار 1\",\"خيار 2\",\"خيار 3\"],\"a\":0,\"x\":\"شرح قصير\"}")
          ]

          day = ([invalid URL](datetime.timezone.utc) + datetime.timedelta(hours=2)).strftime("%Y-%m-%d")
          ep_id = f"daily-{day}"
          os.makedirs(OUT_DIR, exist_ok=True)
          existing = json.load(open(DAILY_JSON, encoding="utf-8")) if os.path.exists(DAILY_JSON) else []
          if any(e.get("id") == ep_id and os.path.exists(e.get("audio", "")) for e in existing):
            raise SystemExit(0)

          txt = open("assets/lessons.js", encoding="utf-8").read()
          lessons = [{"s":m[1],"t":m[2],"l":m[3] or "","n":m[4],"href":m[5]} for m in re.finditer(r'\{\s*s:\s*"([^"]+)"\s*,\s*t:\s*"([^"]+)"(?:\s*,\s*l:\s*"([^"]+)")?\s*,\s*n:\s*"([^"]+)"\s*,\s*href:\s*"([^"]+)"', txt)]
          used = {e.get("href") for e in existing}
          fresh = [l for l in lessons if l["href"] not in used] or lessons
          h = 2166136261
          for c in "nursin-daily-" + day: h = ((h ^ ord(c)) * 16777619) & 0xFFFFFFFF
          les = fresh[h % len(fresh)]
          subj_ar, emo = SUBJ.get(les["s"], (les["s"], "🎙️"))
          sys_ctx = "أنت كاتب سيناريو لبودكاست تمريضي هادئ وطبيعي لطلاب التمريض في لبنان ([invalid URL]) بين «سارة» و«عثمان» فقط. اكتب كل مداخلة في سطر يبدأ بـ «سارة: » أو «عثمان: » فقط بلا عناوين وبلا نجوم وبلا إيموجي."

          def ask(prompt):
            req = urllib.request.Request(API, data=json.dumps({"messages":[{"role":"user","text":prompt}],"context":sys_ctx}).encode(), headers={"Content-Type":"application/json"}, method="POST")
            return json.loads(urllib.request.urlopen(req, timeout=65).read().decode()).get("text", "")

          all_lines, quiz = [], None
          for ch_name, ch_p in CHAPTERS:
            tail = "\nآخر مداخلتين:\n" + "\n".join(f"{x['sp']}: {x['tx']}" for x in [y for y in all_lines if not y.get("chapter")][-2:]) if all_lines else ""
            raw = ask(f"موضوع الحلقة: «{les['n']}» (مادة: {subj_ar}).{tail}\n\n{ch_p}")
            qm = [invalid URL](r"QUIZ\s*:\s*(\{[\s\S]*?\})", raw)
            if qm:
              try: quiz = json.loads([invalid URL](1))
              except Exception: pass
              raw = raw.replace([invalid URL](0), "")
            ch_lines = []
            for r in raw.replace("\r\n","\n").split("\n"):
              r = re.sub(r"^\s*[-*•\d.)]+\s*", "", r).replace("**","").strip()
              m = re.match(r"^(سارة|الأستاذ\s*عثمان|عثمان)\s*[:：\-—]\s*(.+)$", r)
              if m: ch_lines.append({"sp": "سارة" if "سارة" in [invalid URL](1) else "عثمان", "tx": [invalid URL](2).strip()})
              elif ch_lines and len(r) > 5: ch_lines[-1]["tx"] += " " + r
            if ch_lines:
              all_lines.append({"sp":"عنوان","tx":f"📌 {ch_name}","chapter":True})
              all_lines.extend(ch_lines)

          async def make_audio():
            out_mp3 = f"{OUT_DIR}/{ep_id}.mp3"
            chunks = []
            for L in all_lines:
              if L.get("chapter"): continue
              sara = L["sp"] == "سارة"
              comm = edge_tts.Communicate(L["tx"], "ar-LB-LaylaNeural" if sara else "ar-LB-RamiNeural", rate="-6%" if sara else "-5%", pitch="-2Hz" if sara else "-3Hz")
              async for msg in [invalid URL]():
                if msg["type"] == "audio": chunks.append(msg["data"])
            with open(out_mp3, "wb") as f:
              for c in chunks: f.write(c)
            return out_mp3

          out_mp3 = [invalid URL](make_audio())
          words = sum(len(x["tx"].split()) for x in all_lines if not x.get("chapter"))
          ep = {"id":ep_id,"day":day,"ai":True,"s":les["s"],"subj":subj_ar,"e":emo,"title":les["n"],"dur":f"~{max(10,round(words/118))} د","href":les["href"],"audio":out_mp3,"lines":all_lines,"quiz":quiz}
          existing = [ep] + [e for e in existing if e.get("id") != ep_id]
          for old in existing[21:]:
            if old.get("audio","").startswith("assets/podcasts/daily-") and os.path.exists(old["audio"]): os.remove(old["audio"])
          json.dump(existing[:21], open(DAILY_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
          PY
      - name: Commit and push daily MP3
        run: |
          git config [invalid URL] "Nursin Podcast Bot"
          git config [invalid URL] "bot@nursin.store"
          git add assets/podcasts/
          git diff --staged --quiet || (git commit -m "🎙️ Daily 15-20 min Lebanese podcast $(date -u +%Y-%m-%d)" && git push)
