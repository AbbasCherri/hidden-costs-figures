from playwright.sync_api import sync_playwright
URL="file:///home/ody/Projects/hidden-costs/hidden-costs-figures/index.html"
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome")
    ctx=b.new_context(viewport={'width':1440,'height':1000},device_scale_factor=2)
    pg=ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1200)
    pg.click("#copy"); pg.wait_for_timeout(1500)
    pg.screenshot(path="shots/17_copy_done.png", clip={'x':0,'y':900,'width':372,'height':100})
    # reproduce a browser that blocks clipboard writes: the app's own fallback window opens
    pg.evaluate("() => { navigator.clipboard.write = () => Promise.reject(new Error('blocked')) }")
    pg.click("#copy"); pg.wait_for_timeout(1500)
    print("modal hidden:", pg.evaluate("document.querySelector('#modal').hidden"))
    pg.screenshot(path="shots/17_copy_modal.png")
    b.close()
