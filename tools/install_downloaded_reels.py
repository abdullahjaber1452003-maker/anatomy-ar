#!/usr/bin/env python3
"""Moves & resizes downloaded Gemini reel images from ~/Downloads into assets/reels/."""
import os, glob, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "reels")
DL = os.path.expanduser("~/Downloads")
os.makedirs(OUT, exist_ok=True)

MAPPING = {
    "watermarked_img_8664343752977722056.jpg": "coag-1.jpg",
    "watermarked_img_14091386506881443569.jpg": "coag-2.jpg",
    "watermarked_img_8312819995855933646.jpg": "coag-3.jpg",
    "watermarked_img_2876651600425091.jpg": "coag-4.jpg",
    "watermarked_img_8620301544377119235.jpg": "atb-1.jpg",
    "watermarked_img_6893630964842625315.jpg": "atb-2.jpg",
    "watermarked_img_9057095874428489313.jpg": "atb-3.jpg",
    "watermarked_img_13382696948231776312.jpg": "atb-4.jpg",
    "watermarked_img_7821269599389495355.jpg": "phc-1.jpg",
    "watermarked_img_13625996253518578152.jpg": "phc-2.jpg",
    "watermarked_img_885509386928905913.jpg": "phc-3.jpg",
    "watermarked_img_5927643531966737878.jpg": "phc-4.jpg",
    "watermarked_img_5567388087140620595.jpg": "cort-1.jpg",
    "watermarked_img_15513109150822084743.jpg": "cort-2.jpg",
    "watermarked_img_16709452183720636278.jpg": "cort-3.jpg",
    "watermarked_img_6333056979664758105.jpg": "cort-4.jpg",
    "watermarked_img_7708609723049448599.jpg": "tched-1.jpg",
    "watermarked_img_4474340589449446798.jpg": "tched-2.jpg",
    "watermarked_img_11665567036844591567.jpg": "tched-3.jpg",
    "watermarked_img_16361580501249442657.jpg": "tched-4.jpg",
    "watermarked_img_10134207426081500552.jpg": "mi-1.jpg",
    "watermarked_img_12197029815571943884.jpg": "mi-2.jpg",
    "watermarked_img_14956443495058346681.jpg": "mi-3.jpg",
    "watermarked_img_10848744166606971786.jpg": "mi-4.jpg",
    "watermarked_img_10935725943307283649.jpg": "cran-5.jpg",
    "watermarked_img_9211598627597378982.jpg": "ang-1.jpg",
    "watermarked_img_2444834774561190184.jpg": "ang-2.jpg",
    "watermarked_img_18158984075741541316.jpg": "ang-3.jpg",
    "watermarked_img_8396412421031653118.jpg": "ang-4.jpg",
    "watermarked_img_1498683453290326298.jpg": "ic-1.jpg",
    "watermarked_img_17686267915267804401.jpg": "ic-2.jpg",
    "watermarked_img_14278910945389741102.jpg": "ic-3.jpg",
    "watermarked_img_198072213867253175.jpg": "ic-4.jpg",
    "watermarked_img_705435760723145692.jpg": "choc-1.jpg",
    "watermarked_img_10339753215746787407.jpg": "choc-2.jpg",
    "watermarked_img_15081787896182590622.jpg": "choc-3.jpg",
    "watermarked_img_10734611213129487086.jpg": "choc-4.jpg",
    "watermarked_img_18411297555951022680.jpg": "peri-1.jpg",
    "watermarked_img_6636941007018353071.jpg": "peri-2.jpg",
    "watermarked_img_3980134256031608845.jpg": "peri-3.jpg",
    "watermarked_img_14185066393005152979.jpg": "peri-4.jpg",
}

installed = 0
for src_name, dst_name in MAPPING.items():
    stem = os.path.splitext(src_name)[0]
    candidates = [os.path.join(DL, src_name)] + glob.glob(os.path.join(DL, stem + "*"))
    src = next((c for c in candidates if os.path.isfile(c)), None)
    if not src:
        continue
    dst = os.path.join(OUT, dst_name)
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "960", src, "--out", dst],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
    )
    if os.path.isfile(dst) and os.path.getsize(dst) > 5000:
        installed += 1
        print(f"✅ {dst_name} ({os.path.getsize(dst)//1024} KB)")

print(f"\nInstalled {installed}/{len(MAPPING)} bespoke reel images into assets/reels/")
