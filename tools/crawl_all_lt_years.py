#!/usr/bin/env python3
"""Crawl ALL available LT Nursing (العناية التمريضية) official exam links (2009-2026)
from alafak.me/oldexams/ and merge with local assets/lt-exams/ PDFs into assets/lt-exams-list.js."""
import os, re, json, subprocess, urllib.parse

BASE = "https://alafak.me/oldexams/"

def curl_text(url, params=None, max_time=25):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    r = subprocess.run(
        ["curl", "-sSLk", "--max-time", str(max_time),
         "-H", "Referer: https://alafak.me/oldexams/",
         "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", url],
        capture_output=True
    )
    return r.stdout.decode("utf-8", "ignore")

def options_of(html, sel_id):
    m = re.search(r'<select[^>]*id="' + re.escape(sel_id) + r'"[^>]*>([\s\S]*?)</select>', html, re.I)
    if not m:
        return []
    return [(v.strip(), re.sub(r'<[^>]+>', '', t).strip())
            for v, t in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)</option>', m.group(1), re.I)]

def pick_lt_levels(levels):
    return [(v, t) for v, t in levels if re.search(r'\bLT\b|إجازة|اجازة', t, re.I) and v not in ("", "-1")]

def pick_nursing_majors(majors):
    return [(v, t) for v, t in majors if re.search(r'تمريض|العناية|infirm|أ71|أ17', t, re.I) and v not in ("", "-1")]

def encode_url(u):
    p = urllib.parse.urlsplit(u)
    enc_path = urllib.parse.quote(urllib.parse.unquote(p.path), safe="/:@!$&'()*+,;=-._~")
    return urllib.parse.urlunsplit((p.scheme, p.netloc, enc_path, p.query, p.fragment))

local_items = [
    {"y": 2023, "r": 1, "s": "cardio", "t": "العناية التمريضية الطبية (01) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-4.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "neuro", "t": "العناية التمريضية الجراحية (02) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-3.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "rea", "t": "العناية التمريضية للحالات الطارئة والعناية المركّزة (03) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-5.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "comm", "t": "العناية التمريضية للصحة الجماعية والوقائية (04) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-6.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "mgmt", "t": "إدارة وتنظيم المهنة والتقييم والجودة (05) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-1.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "all", "t": "الصحة العقلية (06) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-2.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "geri", "t": "علم الشيخوخة (07) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-9.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "law", "t": "القانون التطبيقي (08) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-7.pdf", "kind": "pdf"},
    {"y": 2023, "r": 1, "s": "henderson", "t": "دراسة حالة رسمية (09) — دورة أولى 2023", "file": "assets/lt-exams/lt-2023-r1-8.pdf", "kind": "pdf"},
    {"y": 2020, "r": 1, "s": "all", "t": "دورة 2020 الرسمية الكاملة — العناية التمريضية (أ17)", "file": "assets/lt-exams/lt-2020-r1-1.pdf", "kind": "pdf"},
]

avail_years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009]
print("Scanning ALL years 2026 -> 2009...", flush=True)

remote_items = []
seen_urls = set()

for y in avail_years:
    h1 = curl_text(BASE, {"year": y})
    lvs = pick_lt_levels(options_of(h1, "lfloatingSelect"))
    if not lvs:
        print(f"[{y}] no LT", flush=True)
        continue
    for lv_id, lv_name in lvs:
        h2 = curl_text(BASE, {"year": y, "level": lv_id})
        mjs = pick_nursing_majors(options_of(h2, "mfloatingSelect"))
        if not mjs:
            print(f"[{y}] LT={lv_id} no nursing", flush=True)
            continue
        for mj_id, mj_name in mjs:
            for rnd_val, rnd_num in [("5", 1), ("2", 2)]:
                h3 = curl_text(BASE, {"year": y, "level": lv_id, "major": mj_id, "round": rnd_val})
                links = re.findall(r'href=[\'"]([^\'"]+\.(?:zip|pdf|rar))[\'"]', h3, re.I)
                for href in links:
                    full = encode_url(urllib.parse.urljoin(BASE, href))
                    if full in seen_urls:
                        continue
                    seen_urls.add(full)
                    ext = os.path.splitext(urllib.parse.urlsplit(full).path)[1].lower().lstrip(".")
                    if y == 2020 and rnd_num == 1 and ext == "pdf":
                        continue
                    r_label = "الدورة الأولى" if rnd_num == 1 else "الدورة الثانية"
                    title = f"دورة {y} ({r_label}) — {mj_name}" + (" — ملف كامل (ZIP)" if ext == "zip" else " — PDF")
                    remote_items.append({"y": y, "r": rnd_num, "s": "all", "t": title, "file": full, "kind": ext})
                    print(f"  + [{y} R{rnd_num}] ({ext}) {mj_name}", flush=True)

all_items = local_items + remote_items
all_items.sort(key=lambda x: (-x["y"], x["r"], 0 if not x["file"].startswith("http") else 1))

years_found = sorted(set(x["y"] for x in all_items), reverse=True)
print(f"TOTAL ITEMS: {len(all_items)} | YEARS COVERED: {years_found}", flush=True)

with open("assets/lt-exams-list.js", "w", encoding="utf-8") as f:
    f.write("/* 📜 دورات شهادة الإجازة الفنية (LT) الرسمية — العناية التمريضية (2009–2026) */\n")
    f.write("window.LT_EXAMS_PDF = " + json.dumps(all_items, ensure_ascii=False, indent=2) + ";\n")
