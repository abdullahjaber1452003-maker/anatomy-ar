#!/usr/bin/env python3
"""
توليد ملفات MP3 مجانية 100% بأصوات عربية لبنانية طبيعية (عثمان وسارة)
عبر مكتبة edge-tts من مايكروسوفت بدون أي مفتاح API أو كلفة.

الاستخدام على الماك:
  pip3 install edge-tts
  python3 tools/make_podcast.py
"""
import asyncio
import json
import os
import re

VOICE_OSMAN = "ar-LB-RamiNeural"
VOICE_SARA = "ar-LB-LaylaNeural"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(ROOT, "assets", "podcast-data.js")
OUT_DIR = os.path.join(ROOT, "assets", "podcasts")


def extract_episodes(js_text: str):
    m = re.search(r"w\.NPODCAST\s*=\s*(\[[\s\S]*?\n\s*\]);", js_text)
    if not m:
        raise RuntimeError("لم يتم العثور على w.NPODCAST في assets/podcast-data.js")
    raw = m.group(1)
    raw = re.sub(r'([\{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', raw)
    return json.loads(raw)


async def synth_episode(ep, edge_tts):
    os.makedirs(OUT_DIR, exist_ok=True)
    out_mp3 = os.path.join(OUT_DIR, f"{ep['id']}.mp3")
    if os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 1000:
        print(f"✓ موجود مسبقاً: {ep['id']}.mp3")
        return f"assets/podcasts/{ep['id']}.mp3"

    print(f"🎙️ جاري توليد {ep['id']}: {ep['title']} ...")
    chunks = []
    for line in ep["lines"]:
        voice = VOICE_SARA if line["sp"] == "سارة" else VOICE_OSMAN
        comm = edge_tts.Communicate(line["tx"], voice, rate="+5%")
        async for msg in comm.stream():
            if msg["type"] == "audio":
                chunks.append(msg["data"])
    with open(out_mp3, "wb") as f:
        for c in chunks:
            f.write(c)
    print(f"✅ تم حفظ {out_mp3}")
    return f"assets/podcasts/{ep['id']}.mp3"


async def main():
    import edge_tts
    with open(DATA_JS, "r", encoding="utf-8") as f:
        text = f.read()
    eps = extract_episodes(text)
    for ep in eps:
        rel = await synth_episode(ep, edge_tts)
        pattern = rf'(id:\s*"{re.escape(ep["id"])}"[\s\S]*?audio:\s*)"[^"]*"'
        text = re.sub(pattern, rf'\1"{rel}"', text, count=1)
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(text)
    print("🎉 خلصت كل الحلقات وتحدّث podcast-data.js!")


if __name__ == "__main__":
    asyncio.run(main())
