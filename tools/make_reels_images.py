#!/usr/bin/env python3
"""Generate bespoke 9:16 vertical medical illustrations for nursin.store Photo-Story Reels.
Reads GEMINI_API_KEY from .env.local or env. Skips any existing image file."""
import os, sys, json, base64, urllib.request, urllib.error, subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "reels")
os.makedirs(OUT_DIR, exist_ok=True)

def load_key():
    env_p = os.path.join(ROOT, ".env.local")
    if os.path.exists(env_p):
        for line in open(env_p, encoding="utf-8"):
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                if k.strip() == "GEMINI_API_KEY":
                    return v.strip().strip('"').strip("'")
    return os.environ.get("GEMINI_API_KEY", "")

API_KEY = load_key()
MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

STYLE = (
    "Vertical 9:16 modern clean medical educational illustration, warm editorial hospital lighting, "
    "crisp clinical detail, cinematic depth of field, NO text, NO letters, NO numbers, NO watermarks, NO labels."
)

SCENES = {
    # Missing cran-5
    "cran-5.jpg": "Neurosurgery ICU nurse calmly teaching a patient's family at bedside after head surgery, clean modern hospital room, subtle monitor glow",

    # Cardio 1: Myocardial Infarction (STEMI)
    "mi-1.jpg": "Emergency room scene of an adult male patient sitting on ER stretcher clutching center of his chest in severe pain, nurse rushing with pulse oximeter",
    "mi-2.jpg": "Close-up of a glowing hospital cardiac ECG monitor showing a dramatic elevated heart rhythm wave beside a stylized glowing red heart with a blocked coronary artery",
    "mi-3.jpg": "Nurse placing oxygen nasal cannula on a patient in semi-Fowler 45-degree bed position with IV drip line and cardiac monitor leads attached",
    "mi-4.jpg": "Cardiac intensive care monitoring screen glowing softly with a medical clinician attentively watching heart rhythm and blood pressure waveforms",

    # Cardio 2: Angina vs MI
    "ang-1.jpg": "Clean 3D medical cutaway illustration of a human heart highlighting a partially narrowed golden coronary artery with reduced blood flow",
    "ang-2.jpg": "Patient resting calmly in a clinic chair holding a tiny white sublingual tablet with relief, warm soft daylight",
    "ang-3.jpg": "Split conceptual medical visual comparing a partially narrowed coronary vessel on top and a completely clotted blocked vessel below, clinical teal and crimson palette",
    "ang-4.jpg": "Caring nursing student checking a patient's wrist pulse and blood pressure cuff calmly in a bright modern clinic",

    # Cardio 3: Left vs Right Heart Failure
    "ic-1.jpg": "Medical anatomical illustration of human heart and lungs showing fluid congestion glowing softly in the lower lung fields",
    "ic-2.jpg": "Clinical nursing assessment showing visibly swollen edematous lower ankles and neck vein distension in soft medical illustration style",
    "ic-3.jpg": "Close-up of a nurse using a stethoscope over a patient's chest apex to count heartbeat, with a clean glass medication vial and syringe on a sterile tray",
    "ic-4.jpg": "Patient comfortably propped up in semi-Fowler position beside a modern digital bathroom scale and a balanced low-salt healthy meal tray",

    # Cardio 4: Cardiogenic Shock
    "choc-1.jpg": "Intensive care bedside scene of a pale diaphoretic patient on a hospital bed with a glowing vital signs monitor showing critical low waveform",
    "choc-2.jpg": "Anatomical medical illustration of a weakened enlarged heart struggling to pump weak blood flow outward to peripheral organs, dramatic cool blue and red lighting",
    "choc-3.jpg": "Close-up of precision ICU electronic IV infusion pumps delivering clear medication drips with tubing neatly organized beside a urine output collection chamber",
    "choc-4.jpg": "Compassionate nurse holding a frightened cardiac ICU patient's hand while checking vitals in semi-Fowler position",

    # Cardio 5: Pericarditis & Cardiac Tamponade
    "peri-1.jpg": "Patient sitting upright on a hospital bed leaning forward onto a padded overbed table to ease sharp chest discomfort",
    "peri-2.jpg": "3D medical cross-section of a human heart surrounded by a swollen fluid-filled pericardial sac compressing the heart chambers tightly",
    "peri-3.jpg": "Hospital ultrasound echocardiography probe on a patient's chest with sterile procedural tray prepared nearby in a bright cardiac unit",
    "peri-4.jpg": "Attentive ICU nurse checking blood pressure and oxygen saturation on a patient in semi-Fowler position with emergency cart ready in background",

    # Neuro 6: Head Trauma & Epidural Hematoma
    "tched-1.jpg": "Emergency department scene of a young motorcyclist sitting awake and talking on an ER stretcher with a motorcycle helmet on the side table, nurse observing carefully",
    "tched-2.jpg": "Clean medical illustration of a brain side cross-section showing a bright lens-shaped arterial bleed between skull and dura alongside a close-up of unequal eye pupils",
    "tched-3.jpg": "Alert female nurse gently stopping a colleague holding a nasogastric tube, noticing clear fluid with a pale yellowish halo on a sterile gauze pad",
    "tched-4.jpg": "Trauma patient with cervical collar immobilized, head of bed elevated 30 degrees, nurse shining a small penlight to check pupil reaction before CT scan",

    # Pharma 1: Anticoagulants (Heparin, Lovenox, Sintrom)
    "coag-1.jpg": "Clean hospital medication tray featuring a pre-filled subcutaneous syringe, glass heparin vial, and oral tablet blister pack under soft clinical light",
    "coag-2.jpg": "Medical nurse carefully administering a gentle subcutaneous injection into a pinch of abdominal skin with gloved hands, clean instructional illustration",
    "coag-3.jpg": "Clinical safety visual showing a soft-bristle toothbrush, an electric shaver, and laboratory blood coagulation tubes on a neat teal desk",
    "coag-4.jpg": "Nurse checking a patient's arm for bruises and monitoring blood pressure cuff calmly in a bright hospital ward",

    # Pharma 2: Antibiotics (Augmentin, Rocephine, Amikin/Gentamycine)
    "atb-1.jpg": "Modern pharmacology still life of IV antibiotic vials, sterile infusion bag, and oral antibiotic tablets with subtle microscopic bacteria shapes in soft bokeh background",
    "atb-2.jpg": "Nurse performing a careful intradermal allergy skin test on a patient's forearm before the first IV antibiotic dose, bright clinic lighting",
    "atb-3.jpg": "Clean medical illustration of human kidneys and inner ear cochlea glowing softly in teal and amber to symbolize renal and hearing monitoring",
    "atb-4.jpg": "Nurse hanging an IV antibiotic piggyback infusion bag on a stainless stand while checking the patient's wristband and skin for rash",

    # Pharma 3: Cardiac & BP Drugs (Concor, Lasix, Digoxine, Trinitrine)
    "phc-1.jpg": "Neatly arranged cardiovascular medications with a stethoscope, blood pressure cuff, and heart rate waveform on a clean clinical counter",
    "phc-2.jpg": "Nurse carefully listening to apical heart rate with a stethoscope while looking at a wristwatch before giving heart medication",
    "phc-3.jpg": "Medical illustration of a diuretic IV ampoule next to a glowing kidney icon and balanced electrolyte droplets in fresh blue and amber tones",
    "phc-4.jpg": "Nurse assisting an elderly patient to sit slowly on the edge of the hospital bed before standing up to prevent dizziness",

    # Pharma 4: Corticosteroids & Painkillers (Solumedrol, Decadron, AINS, Perfalgan, Tramal)
    "cort-1.jpg": "Hospital pharmacology tray with corticosteroid ampoules, IV paracetamol bottle, and anti-inflammatory tablets arranged cleanly",
    "cort-2.jpg": "Nurse checking a patient's blood glucose with a small glucometer and blood pressure monitor during steroid therapy, healthy low-salt meal nearby",
    "cort-3.jpg": "Anatomical medical illustration highlighting the stomach lining and kidneys softly illuminated to show protective monitoring with NSAIDs",
    "cort-4.jpg": "Nurse gently assessing a patient's pain comfort and breathing rate at bedside with an IV infusion bottle running smoothly",
}

def gen_one(fname, prompt):
    out_path = os.path.join(OUT_DIR, fname)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
        return fname, "skip"
    payload = {
        "contents": [{"parts": [{"text": f"{prompt}. {STYLE}"}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "9:16"}
        }
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return fname, f"HTTP {e.code}: {e.read().decode('utf-8','ignore')[:160]}"
    except Exception as e:
        return fname, f"ERR: {e}"

    img_bytes = None
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                img_bytes = base64.b64decode(inline["data"])
                break
        if img_bytes:
            break
    if not img_bytes:
        return fname, "NO_IMAGE_DATA"

    tmp = out_path + ".raw"
    with open(tmp, "wb") as f:
        f.write(img_bytes)
    # Resize to crisp lightweight 540x960 JPEG via macOS sips
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "960", tmp, "--out", out_path],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
    )
    if os.path.exists(out_path) and os.path.getsize(out_path) > 5000:
        os.remove(tmp)
    else:
        os.replace(tmp, out_path)
    return fname, f"ok ({os.path.getsize(out_path)//1024} KB)"

def main():
    if not API_KEY:
        print("Missing GEMINI_API_KEY in .env.local")
        sys.exit(1)
    done = 0
    errs = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(gen_one, fn, pr): fn for fn, pr in SCENES.items()}
        for fut in as_completed(futs):
            fn, st = fut.result()
            done += 1
            if st.startswith("ok") or st == "skip":
                print(f"[{done}/{len(SCENES)}] {fn}: {st}", flush=True)
            else:
                errs += 1
                print(f"[{done}/{len(SCENES)}] ❌ {fn}: {st}", flush=True)
    print(f"Finished: {done - errs}/{len(SCENES)} succeeded, {errs} failed.")

if __name__ == "__main__":
    main()
