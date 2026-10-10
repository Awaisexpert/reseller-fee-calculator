#!/usr/bin/env python3
"""One-time fee-text update. Run from the repo root:  python3 _build/update_fees.py
Safe to run twice (it only replaces text that is still old). Touches only .html, llms.txt, sitemap.xml."""
import re, json
from pathlib import Path
from datetime import date

EBAY = ("13.6% of the total sale amount (item price plus buyer-paid shipping) for most categories, plus $0.30 per order of $10 or less "
        "and $0.40 per order over $10. The percentage also applies to sales tax collected from the buyer, which this calculator does not include. "
        "Some categories have different rates")
ETSY_OLD = ("Below $10,000 in trailing 365-day sales, eligible sellers can generally opt out. Once the shop crosses $10,000, "
            "participation is mandatory and the rate is 12% on attributed orders.")
ETSY_NEW = ("Offsite Ads: 15% of the order total if your shop earned under $10,000 in the past 365 days, and 12% once it reaches $10,000, capped at $100 per order. "
            "At $10,000 or more the program is required, and the 12% rate stays even if sales later fall below $10,000. Below $10,000 you can opt out.")
SWAPS = [
 ("13.25% plus a $0.30 fixed fee", EBAY),
 ("eBay: 13.25% plus $0.30 fixed fee.", "eBay: 13.6% plus $0.30 fixed fee on orders of $10 or less, $0.40 above."),
 ("For Depop, it assumes a 10% estimated fee", "For Depop, it assumes 3.3% + $0.45 payment processing (Depop charges no selling fee in the U.S.)"),
 ("For Mercari, it assumes a 10% estimated fee", "For Mercari, it assumes a 10% fee on the item price plus buyer-paid shipping, which includes payment processing"),
 ("Mercari and Depop: 10% estimated fee.", "Mercari: 10% (payment processing included). Depop: 3.3% + $0.45 payment processing, no U.S. selling fee."),
 ("- Depop: a 10% estimated fee.", "- Depop: 3.3% + $0.45 payment processing; no U.S. selling fee."),
 ("- Mercari: a 10% estimated fee.", "- Mercari: 10% on the item price plus buyer-paid shipping; payment processing included."),
 (ETSY_OLD, ETSY_NEW),
 ("Only when an offsite ad drives the sale; mandatory at $10k+ trailing annual sales (12% past the threshold)",
  "Only when an offsite ad drives the sale; 15% under $10k in trailing 365-day sales, 12% at $10k or more (capped at $100 per order); required at $10k+"),
]
N_EBAY = "eBay charges its percentage on the total sale amount, including buyer-paid shipping and sales tax. This calculator does not include sales tax. Some categories have different rates."
N_POSH = "On Poshmark the buyer pays shipping separately and it is not part of the 20% fee, so enter $0 for shipping unless you offer a shipping discount."
N_MERC = "The 10% fee applies to the item price plus buyer-paid shipping and includes payment processing. Instant Pay costs an optional $3."
N_DEPO = "Depop charges no selling fee in the U.S. The 3.3% + $0.45 is payment processing. Optional Boosted Listings cost 12%, which this calculator does not include."
NOTES = {
 "ebay-fee-calculator.html": [N_EBAY], "poshmark-fee-calculator.html": [N_POSH], "mercari-fee-calculator.html": [N_MERC],
 "depop-fee-calculator.html": [N_DEPO], "poshmark-vs-ebay.html": [N_EBAY, N_POSH], "depop-vs-poshmark.html": [N_DEPO, N_POSH],
 "mercari-vs-poshmark.html": [N_MERC, N_POSH],
}
TAIL = "marketplace rate changes are not included. </p>"
root = Path(".")
if not (root / "index.html").exists():
    raise SystemExit("Run this from the repo root (the folder that contains index.html).")
changed = []
for f in sorted(list(root.glob("*.html")) + [root / "llms.txt"]):
    if not f.exists(): continue
    s = o = f.read_text(encoding="utf-8")
    for old, new in SWAPS: s = s.replace(old, new)
    todo = [n for n in NOTES.get(f.name, []) if n not in s]
    if todo:
        if TAIL in s: s = s.replace(TAIL, "marketplace rate changes are not included. " + " ".join(todo) + "</p>", 1)
        else: print("  WARNING: no fine-print spot found in", f.name)
    if s != o: f.write_text(s, encoding="utf-8"); changed.append(f.name)
sm = root / "sitemap.xml"
if sm.exists():
    t = sm.read_text(encoding="utf-8")
    def bump(m):
        slug = m.group(1).rstrip("/").rsplit("/", 1)[-1]
        name = "index.html" if m.group(1).rstrip("/").endswith(".com") else slug + ".html"
        return m.group(0) if name not in changed else f"<loc>{m.group(1)}</loc><lastmod>{date.today().isoformat()}</lastmod>"
    n = re.sub(r"<loc>([^<]*)</loc><lastmod>[^<]*</lastmod>", bump, t)
    if n != t: sm.write_text(n, encoding="utf-8"); changed.append("sitemap.xml")
print("\nFiles changed (%d): %s" % (len(changed), ", ".join(changed) or "none"))
bad = 0
for f in sorted(root.glob("*.html")):
    h = f.read_text(encoding="utf-8")
    for m in re.findall(r'application/ld\+json">(.*?)</script>', h, re.S):
        try: json.loads(m)
        except Exception: print("  ERROR: bad JSON-LD in", f.name); bad += 1
for f in list(root.glob("*.html")) + [root / "llms.txt"]:
    if f.exists():
        for old in ("13.25", "10% estimated fee", "Mercari and Depop: 10%", "generally opt out"):
            if old in f.read_text(encoding="utf-8"): print("  LEFTOVER:", old, "in", f.name); bad += 1
js = root / "app.js"
if js.exists():
    a = js.read_text(encoding="utf-8")
    for need, why in (("rate: 0.136", "eBay 13.6%"), ("rate: 0.033", "Depop 3.3%"), ("0.40", "eBay $0.40 tier"), ('platform === "Poshmark" ? price', "Poshmark ignores buyer shipping")):
        if need not in a: print("  WARNING: app.js is missing", why); bad += 1
print("ALL CHECKS PASSED" if not bad else "%d problem(s) above, send them to Claude" % bad)
