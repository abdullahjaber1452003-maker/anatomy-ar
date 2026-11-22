#!/usr/bin/env python3
"""
Generate Lebanese neural MP3 dialogues for Photo-Story Reels (assets/reels-stories.js)
using the exact same soft Lebanese voices as tools/make_podcast.py:
  - سارة (s): ar-LB-LaylaNeural (-6%, -2Hz)
  - عثمان (o): ar-LB-RamiNeural (-5%, -3Hz)

Also measures exact per-line MP3 durations (via ffprobe if installed, or pure-Python
MPEG frame parser fallback) and updates t0/t1 timestamps directly in assets/reels-stories.js
so every photo scene and subtitle switches at the exact millisecond each speaker finishes.

Usage:
  python3 tools/make_reels_stories.py
"""
import asyncio
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

try:
    import edge_tts
except ImportError:
    raise SystemExit("edge-tts is required. Install with: pip3 install edge-tts")

ROOT = Path(__file__).resolve().parent.parent
STORIES_JS = ROOT / "assets" / "reels-stories.js"
OUT_DIR = ROOT / "assets" / "reels-audio"
REELS_IMG_DIR = ROOT / "assets" / "reels"

VOICE_SARA = "ar-LB-LaylaNeural"
RATE_SARA = "-6%"
PITCH_SARA = "-2Hz"

VOICE_OSMAN = "ar-LB-RamiNeural"
RATE_OSMAN = "-5%"
PITCH_OSMAN = "-3Hz"

# Natural pauses (in seconds) between dialogue lines and scenes
GAP_LINE = 0.25
GAP_SCENE = 0.40


def mp3_duration_sec(path: Path) -> float:
    """Measure exact MP3 duration via ffprobe if available, else parse MPEG audio frames."""
    if shutil.which("ffprobe"):
        try:
            out = subprocess.check_output(
                [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(path),
                ],
                text=True,
            ).strip()
            val = float(out)
            if val > 0:
                return val
        except Exception:
            pass

    # Pure-Python MPEG1/2 Layer III frame duration parser (accurate for edge-tts CBR/VBR MP3)
    data = path.read_bytes()
    i = 0
    n = len(data)
    if n >= 10 and data[:3] == b"ID3":
        sz = (
            ((data[6] & 0x7F) << 21)
            | ((data[7] & 0x7F) << 14)
            | ((data[8] & 0x7F) << 7)
            | (data[9] & 0x7F)
        )
        i = 10 + sz

    br_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    br_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    sr_table = {
        3: [44100, 48000, 32000],  # MPEG 1
        2: [22050, 24000, 16000],  # MPEG 2
        0: [11025, 12000, 8000],   # MPEG 2.5
    }
    total = 0.0
    while i + 4 <= n:
        if data[i] == 0xFF and (data[i + 1] & 0xE0) == 0xE0:
            ver = (data[i + 1] >> 3) & 0x03
            layer = (data[i + 1] >> 1) & 0x03
            br_idx = (data[i + 2] >> 4) & 0x0F
            sr_idx = (data[i + 2] >> 2) & 0x03
            pad = (data[i + 2] >> 1) & 0x01
            if ver in sr_table and layer == 1 and 0 < br_idx < 15 and sr_idx < 3:
                sr = sr_table[ver][sr_idx]
                br = (br_v1_l3[br_idx] if ver == 3 else br_v2_l3[br_idx]) * 1000
                spf = 1152 if ver == 3 else 576
                flen = int((spf / 8.0) * br / sr) + pad
                if flen >= 4 and i + flen <= n:
                    total += spf / float(sr)
                    i += flen
                    continue
        i += 1
    return total if total > 0 else max(2.0, n / 6000.0)


def make_silence_mp3(duration_sec: float, out_path: Path) -> bool:
    """Create a short silent MP3 clip matching edge-tts format (24kHz mono 48kbps) if ffmpeg exists."""
    if not shutil.which("ffmpeg"):
        return False
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "anullsrc=r=24000:cl=mono",
            "-t", f"{duration_sec:.3f}",
            "-c:a", "libmp3lame", "-b:a", "48k",
            "-loglevel", "error",
            str(out_path),
        ],
        check=True,
    )
    return True


async def synth_line(text: str, speaker: str, out_path: Path) -> None:
    if speaker == "s":
        voice, rate, pitch = VOICE_SARA, RATE_SARA, PITCH_SARA
    else:
        voice, rate, pitch = VOICE_OSMAN, RATE_OSMAN, PITCH_OSMAN
    comm = edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch)
    await comm.save(str(out_path))


async def build_story(story: dict, tmp_dir: Path) -> dict:
    sid = story["id"]
    out_mp3 = OUT_DIR / f"{sid}.mp3"
    chunks = []
    t = 0.0

    sil_line = tmp_dir / "sil_line.mp3"
    sil_scene = tmp_dir / "sil_scene.mp3"
    has_sil_line = make_silence_mp3(GAP_LINE, sil_line)
    has_sil_scene = make_silence_mp3(GAP_SCENE, sil_scene)
    dur_sil_line = mp3_duration_sec(sil_line) if has_sil_line else 0.0
    dur_sil_scene = mp3_duration_sec(sil_scene) if has_sil_scene else 0.0

    scenes = story.get("scenes", [])
    for si, sc in enumerate(scenes):
        sc_t0 = round(t, 2)
        lines = sc.get("lines", [])
        for li, ln in enumerate(lines):
            part = tmp_dir / f"{sid}_s{si}_l{li}.mp3"
            await synth_line(ln["tx"], ln["sp"], part)
            dur = mp3_duration_sec(part)
            ln["t0"] = round(t, 2)
            t += dur
            ln["t1"] = round(t, 2)
            chunks.append(part)
            # Add natural pause after line
            is_last_line_of_scene = li == len(lines) - 1
            is_last_scene = si == len(scenes) - 1
            if not is_last_line_of_scene and has_sil_line:
                chunks.append(sil_line)
                t += dur_sil_line
            elif is_last_line_of_scene and not is_last_scene and has_sil_scene:
                chunks.append(sil_scene)
                t += dur_sil_scene
        sc["t0"] = sc_t0
        sc["t1"] = round(t, 2)

    # Concatenate all MP3 chunks cleanly
    with open(out_mp3, "wb") as fout:
        for ch in chunks:
            fout.write(ch.read_bytes())

    print(f"✅ {sid}.mp3 ({t:.1f}s, {out_mp3.stat().st_size // 1024} KB)")
    return story


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REELS_IMG_DIR.mkdir(parents=True, exist_ok=True)

    raw = STORIES_JS.read_text(encoding="utf-8")
    m = re.search(
        r"(/\* STORIES_JSON_START \*/\s*var STORIES = )(\[[\s\S]*?\])(;\s*/\* STORIES_JSON_END \*/)",
        raw,
    )
    if not m:
        raise SystemExit("Could not find STORIES_JSON_START/END markers in assets/reels-stories.js")

    stories = json.loads(m.group(2))
    with tempfile.TemporaryDirectory() as td:
        tmp_dir = Path(td)
        for st in stories:
            await build_story(st, tmp_dir)

    updated_json = json.dumps(stories, ensure_ascii=False, indent=2)
    # Indent nicely inside IIFE
    indented = "\n".join("  " + line if i > 0 else line for i, line in enumerate(updated_json.splitlines()))
    new_raw = raw[: m.start(2)] + indented + raw[m.end(2) :]
    STORIES_JS.write_text(new_raw, encoding="utf-8")
    print(f"✅ Synced exact timestamps into {STORIES_JS.name}")


if __name__ == "__main__":
    asyncio.run(main())
