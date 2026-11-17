"""Check the web user guide (guide/index.html).

    python3 tests/check_guide.py [base_url]

base_url defaults to http://localhost:8000/ (serve the repository root first, for example
`python3 -m http.server 8000`). A live check works too:
    python3 tests/check_guide.py https://abbascherri.github.io/hidden-costs-figures/

Checks, at desktop, tablet and phone widths: no console errors or failed requests, every image loads and has
alt text, every in-page link resolves, links out to the app and PDF answer, figure numbers run 1..N, the page
has exactly one <h1>, and nothing scrolls sideways. Exit status 1 if any check fails.
Needs: pip install playwright, and Google Chrome.
"""
import re
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000/").rstrip("/") + "/"
URL = BASE + "guide/"
failures = []


def check(ok, msg):
    print(("PASS  " if ok else "FAIL  ") + msg)
    if not ok:
        failures.append(msg)


def status(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=20) as r:
            return r.status
    except Exception as e:  # noqa: BLE001
        return getattr(e, "code", str(e))


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    for width, height in ((1440, 900), (768, 1024), (390, 844)):
        page = browser.new_page(viewport={"width": width, "height": height})
        problems = []
        page.on("pageerror", lambda e: problems.append("pageerror: " + str(e)))
        page.on("console", lambda m: problems.append("console." + m.type + ": " + m.text) if m.type == "error" else None)
        page.on("response", lambda r: problems.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        page.on("requestfailed", lambda r: problems.append("failed: " + r.url) if not any(h in r.url for h in ("googleapis", "gstatic")) else None)
        page.goto(URL, wait_until="load")
        # lazy images only load when scrolled near; ask the browser to load them all instead of scrolling
        page.evaluate("[...document.images].forEach(i => { i.loading = 'eager'; })")
        try:  # give every lazy image time to arrive before judging
            page.wait_for_function("[...document.images].every(i => i.complete && i.naturalWidth > 0)", timeout=15000)
        except Exception:  # noqa: BLE001
            pass
        page.wait_for_timeout(300)
        tag = f"[{width}px] "
        check(not problems, tag + f"no console errors or failed requests {problems[:3]}")
        if width != 1440:
            check(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), tag + "no horizontal scrolling")
            continue
        check(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), tag + "no horizontal scrolling")
        imgs = page.evaluate("[...document.images].map(i => ({src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, alt: (i.alt || '').trim()}))")
        check(len(imgs) > 40, tag + f"{len(imgs)} images on the page")
        check(all(i["ok"] for i in imgs), tag + "every image loads " + str([i["src"] for i in imgs if not i["ok"]][:3]))
        check(all(i["alt"] for i in imgs), tag + "every image has alt text " + str([i["src"] for i in imgs if not i["alt"]][:3]))
        check(page.evaluate("document.querySelectorAll('h1').length") == 1, tag + "exactly one h1")
        anchors = page.evaluate("[...document.querySelectorAll('a[href^=\"#\"]')].map(a => a.getAttribute('href').slice(1))")
        missing = [a for a in set(anchors) if a and not page.evaluate("id => !!document.getElementById(id)", a)]
        check(len(anchors) > 10 and not missing, tag + f"{len(anchors)} in-page links all resolve {missing[:3]}")
        nums = [int(n) for n in re.findall(r"Figure (\d+)\.", page.inner_text("main"))]
        check(nums == list(range(1, len(nums) + 1)) and len(nums) > 40, tag + f"figure numbers run 1..{len(nums)}")
        for href, label in (("../", "app"), ("../Figure_Studio_Guide.pdf", "PDF")):
            s = status(URL + href)
            check(s == 200, tag + f"link to {label} returns {s}")
        sizes = {}
        for i in imgs:
            try:
                with urllib.request.urlopen(URL + i["src"], timeout=20) as r:
                    sizes[i["src"]] = len(r.read())
            except Exception:  # noqa: BLE001
                pass
        print(f"      images: {len(sizes)} files, {sum(sizes.values()) / 1e6:.1f} MB in total, largest {max(sizes.values()) / 1e6:.2f} MB")
        page.close()
    browser.close()

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
