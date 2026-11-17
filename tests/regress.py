"""Rendering regression check for Figure Studio.

Renders every chart type x style x size x palette x colour mode, serialises each SVG, and records a short hash.
Run it before and after a refactor; identical files mean identical figures.

    python3 tests/regress.py <url> <out.json> [baseline.json]

  <url>          page to test, e.g. http://localhost:8000/index.html or a file:// URL
  <out.json>     where to write the hashes
  baseline.json  optional earlier output; the script then reports every combination that differs

Needs: pip install playwright, and Google Chrome (the script launches the "chrome" channel).
Exit status is 1 if any render throws, produces no SVG, or differs from the baseline.
"""
import json
import random
import sys

from playwright.sync_api import sync_playwright

if len(sys.argv) < 3:
    sys.exit(__doc__)
URL, OUT = sys.argv[1], sys.argv[2]
BASELINE = sys.argv[3] if len(sys.argv) > 3 else None

# The built-in examples have no scatter table, so build a small seeded one.
CATS = ["Less than 15 minutes", "15–30 minutes", "31–60 minutes", "61–90 minutes", "More than 90 minutes"]
rnd = random.Random(5)
rows = [["case_id", "x_value", "y_value", "x_label", "y_label", "group_code", "group_label"]]
for i in range(60):
    x = rnd.randint(0, 4)
    y = max(5, min(38, round(20 + 1.4 * x + rnd.gauss(0, 6))))
    rows.append([i + 1, x, y, CATS[x], "PSS-10 total", "", ""])
SCATTER = "\n".join("\t".join(map(str, r)) for r in rows)

JS = """(scatter) => {
  const hash = s => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const out = {}, errs = [];
  for (const type of TYPE_LIST.map(t => t.id)) {
    const t = type === 'scatter' ? fromText(scatter) : exampleTable(type);
    if (!t) { errs.push('no table for ' + type); continue; }
    load(t, 'regress');
    for (const pal of ['journal', 'grey']) for (const hue of ['blue', 'cat']) for (const v of CHARTS[type].variants) for (const sz of SIZES) {
      state.palette = pal; state.hue = hue; state.patterns = pal === 'grey'; state.variant[type] = v.id; state.size = sz.id; state.showTitle = hue === 'cat';
      const key = [type, pal, hue, v.id, sz.id].join('|');
      try { render(); const s = state.svg ? new XMLSerializer().serializeToString(state.svg) : null; out[key] = s ? hash(s) + ':' + s.length : 'NO-SVG'; }
      catch (e) { out[key] = 'ERR ' + e.message; }
    }
  }
  return { out, errs };
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    page = browser.new_page(viewport={"width": 1440, "height": 1600})
    problems = []
    page.on("pageerror", lambda e: problems.append("pageerror: " + str(e)))
    page.on("console", lambda m: problems.append("console." + m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    page.on("response", lambda r: problems.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    page.on("requestfailed", lambda r: problems.append("failed: " + r.url) if not any(h in r.url for h in ("googleapis", "gstatic")) else None)
    page.goto(URL)
    page.wait_for_timeout(2000)
    res = page.evaluate(JS, SCATTER)
    browser.close()

json.dump(res["out"], open(OUT, "w"), indent=0, sort_keys=True)
bad = {k: v for k, v in res["out"].items() if v.startswith("ERR") or v == "NO-SVG"}
print(f"renders: {len(res['out'])}  failed renders: {len(bad)}  setup errors: {res['errs']}  page problems: {problems[:5]}")
for k, v in list(bad.items())[:10]:
    print("  BAD", k, v)
diff = {}
if BASELINE:
    base = json.load(open(BASELINE))
    diff = {k: (base.get(k), res["out"].get(k)) for k in sorted(set(base) | set(res["out"])) if base.get(k) != res["out"].get(k)}
    print(f"differences from {BASELINE}: {len(diff)}")
    for k, (a, b) in list(diff.items())[:10]:
        print("  DIFF", k, a, "->", b)
sys.exit(1 if bad or res["errs"] or problems or diff else 0)
