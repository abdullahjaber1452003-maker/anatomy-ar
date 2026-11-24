#!/usr/bin/env python3
"""
Generate human-like Lebanese Arabic dialogue audio for Photo-Story Reels (assets/reels-stories.js)
using Gemini Native Multi-Speaker TTS (1 single API call per Reel instead of 6!).

Usage:
  GEMINI_API_KEY="AIza..." python3 tools/make_reels_stories.py
  GEMINI_API_KEY="AIza..." python3 tools/make_reels_stories.py --model gemini-3.1-flash-tts-preview
"""
import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORIES_JS = ROOT / "assets" / "reels-stories.js"
OUT_DIR = ROOT / "assets" / "reels-audio"

GEMINI_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts"
GEMINI_SAMPLE_RATE = 24000
VOICE_SARA = "Aoede"    # Warm, natural young female voice
VOICE_OSMAN = "Orus"    # Warm, calm male mentor voice
VOICE_KARIM = "Puck"    # Energetic young Lebanese male nursing student voice

SPEAKER_META = {
    "s": ("Sara", VOICE_SARA, "Sara is a friendly young Lebanese female nurse"),
    "o": ("Osman", VOICE_OSMAN, "Osman is a warm, calm Lebanese male nursing mentor"),
    "k": ("Karim", VOICE_KARIM, "Karim is an enthusiastic young Lebanese male nursing student"),
}


def gemini_multispeaker_pcm(story: dict, api_key: str, model: str) -> bytes:
    """Generate an entire 2-speaker Reel dialogue in ONE single Gemini TTS API call."""
    used_codes = []
    lines_txt = []
    for sc in story.get("scenes", []):
        for ln in sc.get("lines", []):
            code = ln.get("sp", "o")
            if code not in SPEAKER_META:
                code = "o"
            if code not in used_codes:
                used_codes.append(code)
            sp_name = SPEAKER_META[code][0]
            lines_txt.append(f"{sp_name}: {ln['tx']}")

    if len(used_codes) < 2:
        used_codes = ["s", "o"]
    used_codes = used_codes[:2]
    desc = "; ".join(SPEAKER_META[c][2] for c in used_codes)
    spk_cfgs = [
        {"speaker": SPEAKER_META[c][0], "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": SPEAKER_META[c][1]}}}
        for c in used_codes
    ]

    prompt = (
        "Read the following two-speaker nursing dialogue naturally in warm, everyday conversational Lebanese Arabic "
        f"(اللهجة اللبنانية الطبيعية اليومية). {desc}. Use natural human pacing, gentle emotion, natural pauses between turns, and clear "
        "pronunciation of French/medical terms. Read ONLY the dialogue lines below without adding anything:\n\n"
        + "\n".join(lines_txt)
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 1.0,
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "multiSpeakerVoiceConfig": {
                    "speakerVoiceConfigs": spk_cfgs
                }
            },
        },
    }
    data = json.dumps(payload).encode("utf-8")

    for attempt in range(1, 4):
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            cands = body.get("candidates") or []
            parts = (cands[0].get("content") or {}).get("parts") or [] if cands else []
            for p in parts:
                inl = p.get("inlineData") or p.get("inline_data")
                if inl and inl.get("data"):
                    return base64.b64decode(inl["data"])
            raise RuntimeError("No audio returned in response")
        except urllib.error.HTTPError as e:
            err_txt = e.read().decode("utf-8", errors="ignore")
            if e.code in (500, 503) and attempt < 3:
                time.sleep(5 * attempt)
                continue
            raise SystemExit(f"❌ Gemini API error {e.code} ({model}): {err_txt[:350]}")


def save_audio(pcm_bytes: bytes, out_base: Path) -> Path:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav_path = Path(tf.name)
    try:
        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(GEMINI_SAMPLE_RATE)
            wf.writeframes(pcm_bytes)
        if shutil.which("ffmpeg"):
            out_mp3 = out_base.with_suffix(".mp3")
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(wav_path), "-c:a", "libmp3lame", "-b:a", "96k", "-loglevel", "error", str(out_mp3)],
                check=True,
            )
            return out_mp3
        out_wav = out_base.with_suffix(".wav")
        shutil.copy2(wav_path, out_wav)
        return out_wav
    finally:
        if wav_path.exists():
            wav_path.unlink()


def sync_proportional_timings(story: dict, total_sec: float) -> None:
    """Distribute total audio duration accurately across scenes & lines by spoken character weight."""
    all_lines = [ln for sc in story.get("scenes", []) for ln in sc.get("lines", [])]
    weights = [max(10, len(ln["tx"])) + 12 for ln in all_lines]
    w_sum = float(sum(weights)) or 1.0
    t = 0.0
    idx = 0
    for sc in story.get("scenes", []):
        sc_t0 = round(t, 2)
        for ln in sc.get("lines", []):
            dur = total_sec * (weights[idx] / w_sum)
            ln["t0"] = round(t, 2)
            t += dur
            ln["t1"] = round(t, 2)
            idx += 1
        sc["t0"] = sc_t0
        sc["t1"] = round(t, 2)


def write_stories_js(raw: str, match: re.Match, stories: list) -> None:
    updated_json = json.dumps(stories, ensure_ascii=False, indent=2)
    indented = "\n".join("  " + line if i > 0 else line for i, line in enumerate(updated_json.splitlines()))
    STORIES_JS.write_text(raw[: match.start(2)] + indented + raw[match.end(2) :], encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=os.environ.get("GEMINI_TTS_MODEL", GEMINI_MODEL_DEFAULT))
    ap.add_argument("--force", action="store_true", help="Regenerate even if .wav already exists")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("❌ Missing GEMINI_API_KEY.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = STORIES_JS.read_text(encoding="utf-8")
    m = re.search(
        r"(/\* STORIES_JSON_START \*/\s*var STORIES = )(\[[\s\S]*?\])(;\s*/\* STORIES_JSON_END \*/)",
        raw,
    )
    if not m:
        raise SystemExit("Could not find STORIES_JSON_START/END markers in assets/reels-stories.js")

    stories = json.loads(m.group(2))
    bytes_per_sec = GEMINI_SAMPLE_RATE * 2

    for st in stories:
        sid = st["id"]
        wav_exists = (OUT_DIR / f"{sid}.wav").exists()
        if wav_exists and not args.force:
            print(f"⏭️ Skipping {sid} (already generated)")
            continue
        print(f"🎙️ Generating 2-speaker human Lebanese audio for {sid} ({st['ti']}) in 1 call...")
        pcm = gemini_multispeaker_pcm(st, api_key=api_key, model=args.model)
        total_sec = len(pcm) / float(bytes_per_sec)
        out_file = save_audio(pcm, OUT_DIR / sid)
        st["aud"] = f"assets/reels-audio/{out_file.name}"
        sync_proportional_timings(st, total_sec)
        # Save progress after EVERY reel!
        raw_now = STORIES_JS.read_text(encoding="utf-8")
        m_now = re.search(
            r"(/\* STORIES_JSON_START \*/\s*var STORIES = )(\[[\s\S]*?\])(;\s*/\* STORIES_JSON_END \*/)",
            raw_now,
        )
        write_stories_js(raw_now, m_now, stories)
        print(f"✅ Saved {out_file.name} ({total_sec:.1f}s, {out_file.stat().st_size // 1024} KB)")
        time.sleep(2.5)

    print("🎉 Done!")


if __name__ == "__main__":
    main()
