"""Cover picture: the whole app window at 1440 x 900, as it opens."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome"); pg = b.new_context(viewport={'width':1440,'height':900}, device_scale_factor=2).new_page()
    pg.goto("file:///home/ody/Projects/hidden-costs/hidden-costs-figures/index.html"); pg.wait_for_timeout(1500)
    pg.screenshot(path="shots/01_cover.png"); b.close()
