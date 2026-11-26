#!/usr/bin/env python3
"""Download and extract official LT Nursing (العناية التمريضية) exam ZIPs from alafak.me/oldexams/
using curl with hard timeouts so it never hangs, into assets/lt-exams/ and assets/lt-exams-list.js."""
import os, re, io, json, zipfile, subprocess, urllib.parse

BASE = "https://alafak.me/oldexams/"
OUT_DIR = "assets/lt-exams"
os.makedirs(OUT_DIR, exist_ok=True)

def curl_bytes(url, max_time=35):
    p = urllib.parse.urlsplit(url)
    enc_path = urllib.parse.quote(urllib.parse.unquote(p.path), safe="/:@!$&'()*+,;=-._~")
    safe_url = urllib.parse.urlunsplit((p.scheme, p.netloc, enc_path, p.query, p.fragment))
    r = subprocess.run(
        ["curl", "-sSLk", "--max-time", str(max_time), "-H", "Referer: https://alafak.me/oldexams/",
         "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", safe_url],
        capture_output=True
    )
    return r.stdout

def get_text(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    return curl_bytes(url, max_time=15).decode("utf-8", "ignore")

def options_of(html, sel_id):
    m = re.search(r'<select[^>]*id="' + re.escape(sel_id) + r'"[^>]*>([\s\S]*?)</select>', html, re.I)
    if not m:
        return []
    return [(v.strip(), re.sub(r'<[^>]+>', '', t).strip())
            for v, t in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)</option>', m.group(1), re.I)]

def pick_lt(levels):
    for v, t in levels:
        if re.search(r'\bLT\b|إجازة|اجازة', t, re.I) and v not in ("", "-1"):
            return v, t
    return None, None

def pick_nursing(majors):
    return [(v, t) for v, t in majors if re.search(r'تمريض|العناية التمريضية|infirm', t, re.I) and v not in ("", "-1")]

def guess_subj(name):
    n = name.lower()
    if any(k in n for k in ("قلب", "cardio", "دموي")): return "cardio"
    if any(k in n for k in ("أعصاب", "اعصاب", "neuro", "عصب")): return "neuro"
    if any(k in n for k in ("إنعاش", "انعاش", "طوارئ", "rea", "réa", "تخدير")): return "rea"
    if any(k in n for k in ("أدوية", "ادوية", "دواء", "pharma", "صيدل")): return "pharma"
    if any(k in n for k in ("مجتمع", "جماعي", "وقائ", "وبائي", "comm", "santé", "صحة عامة")): return "comm"
    if any(k in n for k in ("إدارة", "ادارة", "mgmt", "gestion")): return "mgmt"
    if any(k in n for k in ("جودة", "اعتماد", "qualit")): return "quality"
    if any(k in n for k in ("قانون", "تشريع", "أخلاقيات", "اخلاقيات", "law", "déonto", "légis")): return "law"
    if any(k in n for k in ("شيخوخة", "مسن", "geri", "géri")): return "geri"
    return "all"

def decode_zip_name(raw):
    try:
        raw.encode("ascii")
        return raw
    except Exception:
        pass
    try:
        b = raw.encode("cp437")
        for enc in ("utf-8", "cp720", "cp1256", "windows-1256"):
            try:
                dec = b.decode(enc)
                if any("\u0600" <= ch <= "\u06FF" for ch in dec):
                    return dec
            except Exception:
                continue
    except Exception:
        pass
    return raw

years = [2024, 2023, 2022, 2021, 2020, 2018]
manifest = []
seen_zips = set()
total_bytes = 0

for y in years:
    h1 = get_text(BASE, {"year": y})
    lv_id, lv_name = pick_lt(options_of(h1, "lfloatingSelect"))
    if not lv_id:
        print(f"[{y}] no LT", flush=True)
        continue
    h2 = get_text(BASE, {"year": y, "level": lv_id})
    majors = pick_nursing(options_of(h2, "mfloatingSelect"))
    if not majors:
        print(f"[{y}] no Nursing major", flush=True)
        continue
    for mj_id, mj_name in majors:
        for rnd_val, rnd_num in [("5", 1), ("2", 2)]:
            h3 = get_text(BASE, {"year": y, "level": lv_id, "major": mj_id, "round": rnd_val})
            zlinks = re.findall(r'href=[\'"]([^\'"]+\.(?:zip|pdf))[\'"]', h3, re.I)
            for zhref in zlinks:
                full = urllib.parse.urljoin(BASE, zhref)
                if full in seen_zips:
                    continue
                seen_zips.add(full)
                print(f"[{y} R{rnd_num}] Fetching {full} ...", flush=True)
                data = curl_bytes(full, max_time=45)
                print(f"  -> got {len(data)//1024} KB", flush=True)
                if full.lower().endswith(".pdf") and data.startswith(b"%PDF"):
                    fname = f"lt-{y}-r{rnd_num}-{len(manifest)+1}.pdf"
                    with open(os.path.join(OUT_DIR, fname), "wb") as f:
                        f.write(data)
                    total_bytes += len(data)
                    manifest.append({"y": y, "r": rnd_num, "s": "all", "t": f"دورة {y} ({'الأولى' if rnd_num==1 else 'الثانية'}) — {mj_name}", "file": f"assets/lt-exams/{fname}"})
                    continue
                if not data.startswith(b"PK"):
                    print(f"  ! not zip (head={data[:40]!r})", flush=True)
                    continue
                try:
                    zf = zipfile.ZipFile(io.BytesIO(data))
                except Exception as e:
                    print(f"  ! bad zip: {e}", flush=True)
                    continue
                idx = 0
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    base = os.path.basename(decode_zip_name(info.filename))
                    if not base.lower().endswith(".pdf") or base.startswith("."):
                        continue
                    pdf_bytes = zf.read(info)
                    if len(pdf_bytes) < 500 or not pdf_bytes.startswith(b"%PDF"):
                        continue
                    idx += 1
                    fname = f"lt-{y}-r{rnd_num}-{idx}.pdf"
                    with open(os.path.join(OUT_DIR, fname), "wb") as f:
                        f.write(pdf_bytes)
                    total_bytes += len(pdf_bytes)
                    clean_title = os.path.splitext(base)[0].replace("_", " ").replace("-", " ").strip()
                    manifest.append({
                        "y": y,
                        "r": rnd_num,
                        "s": guess_subj(clean_title),
                        "t": clean_title,
                        "file": f"assets/lt-exams/{fname}"
                    })
                    print(f"  + {fname} ({len(pdf_bytes)//1024} KB): {clean_title}", flush=True)

print(f"DONE! Total PDFs: {len(manifest)} | Total size: {total_bytes/1024/1024:.2f} MB", flush=True)
with open("assets/lt-exams-list.js", "w", encoding="utf-8") as f:
    f.write("/* 📜 دورات شهادة LT الرسمية (العناية التمريضية) — من أرشيف معاهد الآفاق */\n")
    f.write("window.LT_EXAMS_PDF = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n")
