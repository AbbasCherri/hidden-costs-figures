"""Build the web version of the user guide (../guide/) from the same content as the PDF.

    python3 guide-src/build_site.py

The guide text lives once, in build_pdf.py. This script asks it for the sections, then:
  * points every image at guide/img/ and converts the screenshots to lossless WebP,
  * gives each image alt text (from its caption), real width/height, lazy loading and a click-to-enlarge link,
  * demotes headings one level so the page has a single <h1>,
  * wraps the result in a page with a header, a contents sidebar and a footer.
Do not edit guide/ by hand. Change build_pdf.py or site.css and run this again.
"""
import html
import os
import re
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_pdf as bp  # noqa: E402  (needs HERE on the path)

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "guide")
IMG = os.path.join(OUT, "img")
SITE = "https://abbascherri.github.io/hidden-costs-figures/"
REPO = "https://github.com/AbbasCherri/hidden-costs-figures"
PDF = os.path.join(ROOT, "Figure_Studio_Guide.pdf")

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect x='3' y='15' width='5' height='10' rx='1.5' fill='%232a78d6'/%3E"
           "%3Crect x='11.5' y='8' width='5' height='17' rx='1.5' fill='%232a78d6'/%3E%3Crect x='20' y='3' width='5' height='22' rx='1.5' fill='%230b2c57'/%3E%3C/svg%3E")
LOGO = ('<svg viewBox="0 0 28 28" width="30" height="30" aria-hidden="true"><rect x="3" y="15" width="5" height="10" rx="1.5" fill="#2a78d6"/>'
        '<rect x="11.5" y="8" width="5" height="17" rx="1.5" fill="#2a78d6"/><rect x="20" y="3" width="5" height="22" rx="1.5" fill="#0b2c57"/></svg>')

# ---------------------------------------------------------------- content
bp.SH = "img/"
sections = bp.parts({}, web=True)[2:]            # drop the cover and the printed contents page
content = "\n".join(sections).replace("img/../exported_figure.png", "img/exported_figure.png")


def source_png(name):
    path = os.path.join(bp.D, "shots", name + ".png")
    return path if os.path.exists(path) else os.path.join(bp.D, name + ".png")


used = {}                                          # image name -> (width, height)


def register(name):
    if name not in used:
        with Image.open(source_png(name)) as im:
            used[name] = im.size
    return used[name]


FIG = re.compile(r'<figure([^>]*)>\s*<img class="([^"]*)" src="img/([^"]+)\.png"[^>]*>\s*<figcaption>(.*?)</figcaption>\s*</figure>', re.S)


def figure(m):
    attrs, cls, name, caption = m.groups()
    attrs = re.sub(r'\s*style="[^"]*"', "", attrs)
    w, h = register(name)
    alt = html.escape(re.sub(r"<[^>]+>", "", re.sub(r"^<b>Figure \d+\.</b>\s*", "", caption)).strip(), quote=True)
    return (f'<figure{attrs}><a class="zoom" href="img/{name}.webp" title="Open the full-size picture">'
            f'<img class="{cls}" src="img/{name}.webp" alt="{alt}" width="{w // 2}" height="{h // 2}" loading="lazy" decoding="async"></a>'
            f'<figcaption>{caption}</figcaption></figure>')


content = FIG.sub(figure, content)
leftover = re.findall(r"<img [^>]*>", re.sub(r'<a class="zoom".*?</a>', "", content, flags=re.S))
assert not leftover, f"images outside a captioned figure: {leftover[:2]}"

# one <h1> per page: h1 -> h2 -> h3 -> h4 (reverse order so nothing is renamed twice)
for old, new in (("h3", "h4"), ("h2", "h3"), ("h1", "h2")):
    content = content.replace(f"<{old}", f"<{new}").replace(f"</{old}>", f"</{new}>")

# ---------------------------------------------------------------- images
if os.path.isdir(IMG):
    shutil.rmtree(IMG)
os.makedirs(IMG)
hero = "01_cover"
register(hero)
total = 0
for name in sorted(used):
    dst = os.path.join(IMG, name + ".webp")
    with Image.open(source_png(name)) as im:
        im.convert("RGB").save(dst, "WEBP", lossless=True, quality=100, method=4)
    total += os.path.getsize(dst)

# ---------------------------------------------------------------- page
nav_items = [("how", "How to read this guide")] + [(a, t) for a, t in bp.TOC]


def nav_list():
    return "<ol>" + "".join(f'<li><a href="#{a}">{html.escape(t)}</a></li>' for a, t in nav_items) + "</ol>"


pdf_mb = os.path.getsize(PDF) / 1e6
hw, hh = used[hero]
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figure Studio user guide</title>
<meta name="description" content="Step-by-step user guide for Figure Studio: copy a table from Graph_Maker, load it, style it and export a journal-ready figure.">
<meta name="theme-color" content="#0b2c57">
<link rel="icon" type="image/svg+xml" href="{FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="guide.css">
</head>
<body>
<a class="skip" href="#content">Skip to the guide</a>
<header class="topbar"><div class="in">
  <a class="brand" href="#top">{LOGO}<span>Figure Studio<small>User guide</small></span></a>
  <a class="btn hide-sm" href="../Figure_Studio_Guide.pdf">Download PDF</a>
  <a class="btn primary" href="../">Open Figure Studio</a>
</div></header>
<div class="layout" id="top">
  <nav class="snav" aria-label="Guide contents"><h2>Contents</h2>{nav_list()}</nav>
  <main id="content">
    <div class="hero">
      <h1>Figure Studio user guide</h1>
      <p class="lead">Step by step: how to turn a Graph_Maker table from the Hidden Costs workbook into a journal-ready figure, from copying the cells to saving a 300 dpi PNG or an SVG.</p>
      <div class="actions">
        <a class="btn primary" href="../">Open Figure Studio</a>
        <a class="btn" href="../Figure_Studio_Guide.pdf">Download the PDF ({pdf_mb:.1f} MB)</a>
      </div>
      <details class="mnav"><summary>Contents</summary>{nav_list()}</details>
      <figure class="center"><a class="zoom" href="img/{hero}.webp"><img class="shot" src="img/{hero}.webp" alt="Figure Studio with the example table loaded: controls on the left, the figure on the right." width="{hw // 2}" height="{hh // 2}"></a></figure>
    </div>
    <section class="intro" id="how"><h2 class="plain">How to read this guide</h2>
    {bp.howto(web=True)}
    </section>
{content}
    <footer class="foot">
      <p>This page and the <a href="../Figure_Studio_Guide.pdf">PDF</a> are generated from the same source, so they always match.</p>
      <p>Developers and maintainers: see the <a href="{REPO}#readme">technical guide</a> and the <a href="{REPO}">source on GitHub</a>.</p>
    </footer>
  </main>
</div>
<script>
/* Highlight the current section in the contents. The page works without this. */
(function () {{
  var links = [].slice.call(document.querySelectorAll('.snav a, .mnav a'));
  var targets = links.map(function (a) {{ return document.getElementById(a.getAttribute('href').slice(1)); }});
  var seen = [], i;
  for (i = 0; i < targets.length; i++) if (targets[i] && seen.indexOf(targets[i]) < 0) seen.push(targets[i]);
  function update() {{
    var current = seen[0];
    seen.forEach(function (t) {{ if (t.getBoundingClientRect().top <= 140) current = t; }});
    links.forEach(function (a) {{
      if (current && a.getAttribute('href') === '#' + current.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    }});
  }}
  var ticking = false;
  addEventListener('scroll', function () {{ if (!ticking) {{ ticking = true; requestAnimationFrame(function () {{ ticking = false; update(); }}); }} }}, {{ passive: true }});
  addEventListener('resize', update); update();
}})();
</script>
</body>
</html>
"""
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(page)
shutil.copyfile(os.path.join(HERE, "site.css"), os.path.join(OUT, "guide.css"))
print(f"guide/index.html: {len(page) / 1024:.0f} KB, {bp.n_fig[0]} figures, {len(used)} images, {total / 1e6:.1f} MB of WebP")
