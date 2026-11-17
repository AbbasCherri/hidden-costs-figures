"""Capture real screenshots of Figure Studio with scripted numbered callouts.
Every image is a Playwright screenshot of the live app; the only additions are
outline boxes and number badges injected into the page DOM right before capture."""
import json, random, os
from playwright.sync_api import sync_playwright

URL = "file:///home/ody/Projects/hidden-costs/hidden-costs-figures/index.html"
OUT = "shots"; os.makedirs(OUT, exist_ok=True)
ORANGE = "#d9480f"

ANN_JS = """
(items)=>{
  document.querySelectorAll('.__ann').forEach(e=>e.remove());
  for(const it of items){
    const el=document.querySelector(it.sel); if(!el) throw new Error('no '+it.sel);
    const r=el.getBoundingClientRect(), p=it.pad??5, px=it.px??p, py=it.py??p;
    const box=document.createElement('div'); box.className='__ann';
    Object.assign(box.style,{position:'fixed',left:(r.left-px)+'px',top:(r.top-py)+'px',width:(r.width+2*px)+'px',height:(r.height+2*py)+'px',
      border:'3px solid %s',borderRadius:'9px',boxSizing:'border-box',pointerEvents:'none',zIndex:99998});
    document.body.appendChild(box);
    const b=document.createElement('div'); b.className='__ann'; b.textContent=it.n;
    const S=30; let bx=r.right+px+6, by=r.top+r.height/2-S/2;
    if(it.pos==='tl'){} else if(it.pos==='r'){bx=r.right+p-S/2; by=r.top-p-S/2}
    if(it.pos==='lm'){bx=r.left-p-S-6; by=r.top+r.height/2-S/2}
    if(it.pos==='bm'){bx=r.left+r.width/2-S/2; by=r.bottom+py+6}
    if(it.pos==='tm'){bx=r.left+r.width/2-S/2; by=r.top-py-S-6}
    if(it.pos==='rm'){bx=r.right+px+6; by=r.top+r.height/2-S/2}
    Object.assign(b.style,{position:'fixed',left:bx+'px',top:by+'px',width:S+'px',height:S+'px',borderRadius:'50%%',background:'%s',color:'#fff',
      font:'700 17px/30px "IBM Plex Sans",Arial,sans-serif',textAlign:'center',zIndex:99999,boxShadow:'0 0 0 3px #fff, 0 2px 6px rgba(0,0,0,.35)',pointerEvents:'none'});
    document.body.appendChild(b);
  }
}""" % (ORANGE, ORANGE)

def union(pg, sels, pad=12):
    L,T,R,B = pad if isinstance(pad,tuple) else (pad,pad,pad,pad)
    r = pg.evaluate("""(a)=>{let l=1e9,t=1e9,r=-1e9,b=-1e9;for(const s of a){const e=document.querySelector(s).getBoundingClientRect();
      l=Math.min(l,e.left);t=Math.min(t,e.top);r=Math.max(r,e.right);b=Math.max(b,e.bottom)}return [l,t,r,b]}""", sels)
    x0=max(0,r[0]-L); y0=max(0,r[1]-T); x1=min(1440,r[2]+R); y1=min(1600,r[3]+B)
    return {"x":x0,"y":y0,"width":x1-x0,"height":y1-y0}

def shot(pg, name, sels=None, pad=12, ann=None, full=False, apad=(10,10,54,10)):
    if ann and not full: pad=apad
    pg.evaluate(ANN_JS, ann or [])
    pg.wait_for_timeout(120)
    if full: pg.screenshot(path=f"{OUT}/{name}.png")
    else: pg.screenshot(path=f"{OUT}/{name}.png", clip=union(pg, sels, pad))
    pg.evaluate("document.querySelectorAll('.__ann').forEach(e=>e.remove())")
    print("saved", name)

def fig(pg, name): shot(pg, name, ['#fig'], pad=0)
def figmeta(pg, name): shot(pg, name, ['#fig', '.meta'], pad=6)

def paste(pg, text):
    pg.evaluate("""t=>{const dt=new DataTransfer();dt.setData('text/plain',t);
      document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))}""", text)
    pg.wait_for_timeout(400)

def example(pg, typ):
    pg.evaluate("""t=>{const s=document.querySelector('#example');s.value=t;s.dispatchEvent(new Event('change',{bubbles:true}))}""", typ)
    pg.wait_for_timeout(400)

def details(pg, which, state):
    pg.evaluate("(a)=>{const d=document.querySelectorAll('details.how');a[0].forEach(i=>d[i].open=a[1])}", [which, state])
    pg.wait_for_timeout(150)

def variant(pg, label): pg.click(f"button.variant:has-text('{label}')"); pg.wait_for_timeout(300)
def size(pg, label): pg.click(f".seg button:has-text('{label}')"); pg.wait_for_timeout(300)

# ---- demonstration tables (clearly labelled as demo data in the guide) ----
CATS = ["Less than 15 minutes","15–30 minutes","31–60 minutes","61–90 minutes","More than 90 minutes"]
def grouped_table(groups, seed=3):
    rnd = random.Random(seed)
    rows = [["category"] + groups + ["total"]]
    for c in CATS:
        v = [rnd.randint(3, 16) for _ in groups]
        rows.append([c] + v + [sum(v)])
    return "\n".join("\t".join(map(str, r)) for r in rows)

def meanci_groups(groups, seed=11):
    rnd = random.Random(seed)
    hdr = ["x_category","group_category","x_code","group_code","n","mean","sd","se","ci95_low","ci95_high"]
    rows = [hdr]
    for xi, c in enumerate(CATS[:3]):
        for gi, g in enumerate(groups):
            m = round(20 + gi * 0.6 + xi * 1.1 + rnd.uniform(-1.5, 1.5), 2); se = round(rnd.uniform(1.1, 2.0), 2)
            rows.append([c, g, xi, gi, rnd.randint(6, 20), m, round(se * 4, 2), se, round(m - 1.96 * se, 2), round(m + 1.96 * se, 2)])
    return "\n".join("\t".join(map(str, r)) for r in rows)

def scatter_table(n=60, seed=5):
    rnd = random.Random(seed)
    rows = [["case_id","x_value","y_value","x_label","y_label","group_code","group_label"]]
    for i in range(n):
        x = rnd.randint(0, 4); y = max(5, min(38, round(20 + 1.4 * x + rnd.gauss(0, 6))))
        rows.append([i + 1, x, y, CATS[x], "PSS-10 total", "", ""])
    return "\n".join("\t".join(map(str, r)) for r in rows)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    ctx = b.new_context(viewport={'width':1440,'height':1600}, device_scale_factor=2, accept_downloads=True)
    pg = ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(1500)

    # 01 overview (annotated, whole window)
    shot(pg, "01_overview", full=True, ann=[
        dict(sel="#s-data", n=1, px=8, py=-2), dict(sel=".panel .card:nth-of-type(2)", n=2, px=8, py=-2),
        dict(sel=".panel .card:nth-of-type(3)", n=3, px=8, py=-2), dict(sel=".panel .card:nth-of-type(4)", n=4, px=8, py=-2),
        dict(sel=".panel .card:nth-of-type(5)", n=5, px=8, py=-2), dict(sel=".actions", n=6, px=-2, py=-2),
        dict(sel="#fig", n=7, pad=4), dict(sel=".meta", n=8, pad=4)])
    shot(pg, "01_overview_plain", full=True)

    # 02 data card
    shot(pg, "02_data_card", ['#s-data'], pad=6, ann=[
        dict(sel=".dropzone", n=1), dict(sel=".dropzone .btn", n=2, pad=3), dict(sel="#data-ok", n=3),
        dict(sel="details.how:nth-of-type(1) summary", n=4, pad=3), dict(sel="details.how:nth-of-type(2) summary", n=5, pad=3)])

    # 03 how-to open
    details(pg, [0], True)
    shot(pg, "03_howto_open", ['#s-data'], pad=6, ann=[dict(sel="details.how:nth-of-type(1) ol", n=1, pad=4)])
    details(pg, [0], False)

    # 04 paste box open
    details(pg, [1], True)
    shot(pg, "04_pastebox_open", ['#s-data'], pad=6, ann=[
        dict(sel="#paste", n=1), dict(sel="#use-paste", n=2, pad=3), dict(sel="#example", n=3, pad=3)])
    details(pg, [1], False)

    # 05 a real paste: bar chart table (as copied from Graph_Maker)
    bar_txt = "\n".join("\t".join(map(str, r)) for r in [
        ["category","code","count","percent","cumulative_percent"],
        ["Less than 15 minutes",0,30,37.04,37.04],["15–30 minutes",1,19,23.46,60.49],["31–60 minutes",2,17,20.99,81.48],
        ["61–90 minutes",3,9,11.11,92.59],["More than 90 minutes",4,6,7.41,100]])
    open("pasted_bar_table.txt","w").write(bar_txt)
    paste(pg, bar_txt)
    shot(pg, "05_after_paste", ['#s-data'], pad=6, ann=[dict(sel="#data-ok", n=1)])
    shot(pg, "05_after_paste_full", full=True)

    # 06 error on bad paste
    paste(pg, "this is just a sentence, not a table")
    shot(pg, "06_error", ['#s-data'], pad=6, ann=[dict(sel="#err", n=1, pad=3)])
    # recover
    paste(pg, bar_txt)

    # 07 drop overlay
    pg.evaluate("document.querySelector('#drop').classList.add('over')"); pg.wait_for_timeout(250)
    pg.screenshot(path=f"{OUT}/07_drop_overlay.png")
    pg.evaluate("document.querySelector('#drop').classList.remove('over')")

    # 08 chart-type gallery (default style of each) from built-in examples
    types = ["bar","hist","grouped","meanci","box","bubble","line","likert","corr"]
    for t in types:
        example(pg, t); fig(pg, f"gal_{t}")
    paste(pg, scatter_table()); fig(pg, "gal_scatter")
    # also snapshot of the panel for the item battery and correlation (option sets differ)
    example(pg, "likert"); shot(pg, "likert_panel", ['.panel'], pad=0)

    # 09 style choices for the mean-by-group chart
    example(pg, "meanci")
    shot(pg, "09_style_card", ['.panel .card:nth-of-type(2)'], pad=4, ann=[dict(sel=".variants", n=1, pad=2)])
    for lab, key in [("Bars with 95% CI","bars"),("Dots with 95% CI","dots"),("Line with 95% CI","line"),("Forest","forest")]:
        variant(pg, lab); fig(pg, f"style_meanci_{key}")
    variant(pg, "Bars with 95% CI")

    # 10 options card and palettes (grouped chart, 3 groups)
    paste(pg, grouped_table(["Rent","Own","Family"]))
    shot(pg, "10_options_card", ['.panel .card:nth-of-type(3)'], pad=4, ann=[
        dict(sel="#palette", n=1, pad=3), dict(sel="#swatches", n=2, pad=3), dict(sel="#options", n=3, pad=3)])
    for pid in ["journal","okabe","tolbright","lancet","grey"]:
        pg.select_option("#palette", pid); pg.wait_for_timeout(300); fig(pg, f"pal_{pid}")
    pg.select_option("#palette", "journal")
    shot(pg, "10_options_card_grouped", ['.panel .card:nth-of-type(3)'], pad=4)

    # patterns on greyscale
    pg.select_option("#palette", "grey"); pg.wait_for_timeout(250)
    shot(pg, "11_patterns_off_panel", ['.panel .card:nth-of-type(3)'], pad=4, ann=[dict(sel="#pat-row", n=1, pad=3)])
    fig(pg, "grey_patterns_off")
    pg.click("#pat-row"); pg.wait_for_timeout(300); fig(pg, "grey_patterns_on")
    pg.click("#pat-row"); pg.select_option("#palette", "journal"); pg.wait_for_timeout(250)

    # 12 text card
    example(pg, "meanci")
    shot(pg, "12_text_card", ['.panel .card:nth-of-type(4)'], pad=4, ann=[
        dict(sel="label.switch:has(#title-on)", n=1, pad=4), dict(sel="#t-title", n=2, pad=3), dict(sel="#t-x", n=3, pad=3),
        dict(sel="#t-y", n=4, pad=3), dict(sel="#t-foot", n=5, pad=3), dict(sel="#reset-text", n=6, pad=3)])
    fig(pg, "text_before")
    pg.fill("#t-title", "Perceived stress by one-way commute time")
    pg.fill("#t-y", "Mean stress score (0–40)")
    pg.fill("#t-foot", "Error bars show 95% confidence intervals. n = 75.")
    pg.wait_for_timeout(300); fig(pg, "text_after")
    shot(pg, "12_text_card_edited", ['.panel .card:nth-of-type(4)'], pad=4, ann=[dict(sel="#reset-text", n=1, pad=3)])
    pg.click("#reset-text"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#title-on').click()"); pg.wait_for_timeout(100)
    if pg.evaluate("document.querySelector('#title-on').checked"): pg.evaluate("document.querySelector('#title-on').click()")

    # 13 size card + same chart at three widths
    shot(pg, "13_size_card", ['.panel .card:nth-of-type(5)'], ann=[dict(sel="#size", n=1, pad=3), dict(sel=".panel .card:nth-of-type(5) p.muted", n=2, pad=3), dict(sel="#reset-prefs", n=3, pad=3)], apad=(10,10,54,-8))
    for lab, key in [("Single column","single"),("1.5 column","mid"),("Double column","double")]:
        size(pg, lab); fig(pg, f"size_{key}")
        shot(pg, f"size_{key}_meta", ['.meta'], pad=4)
    size(pg, "1.5 column")

    # 14 export area and real download
    shot(pg, "14_export_buttons", ['.actions'], ann=[dict(sel="#png", n=1, pad=3, pos='bm'), dict(sel="#svg", n=2, pad=3, pos='bm'), dict(sel="#copy", n=3, pad=3, pos='bm')], apad=(10,-4,12,0))
    with pg.expect_download() as dl:
        pg.click("#png")
    d = dl.value; d.save_as("exported_figure.png"); print("download:", d.suggested_filename)
    open("exported_name.txt","w").write(d.suggested_filename)
    pg.wait_for_timeout(300)
    shot(pg, "14_export_saved", ['.actions'], ann=[dict(sel="#say", n=1, pad=3)], apad=(10,10,54,6))
    with pg.expect_download() as dl:
        pg.click("#svg")
    d2 = dl.value; d2.save_as("exported_figure.svg"); open("exported_svg_name.txt","w").write(d2.suggested_filename)

    # 15 more than six groups warning
    paste(pg, meanci_groups(["Group A","Group B","Group C","Group D","Group E","Group F","Group G"]))
    figmeta(pg, "15_warning")
    shot(pg, "15_warning_marked", ['#fig', '.meta'], pad=6, ann=[dict(sel="#warn", n=1, pad=3)])

    example(pg, "meanci")
    fig(pg, "hue_one")
    pg.click(".seg button:has-text('Distinct colours')"); pg.wait_for_timeout(300)
    fig(pg, "hue_distinct")
    shot(pg, "16_colours_toggle", ['.panel .card:nth-of-type(3)'], pad=4, ann=[dict(sel="#hue", n=1, pad=3)])
    pg.click(".seg button:has-text('One colour')"); pg.wait_for_timeout(200)

    # 16 title shown on a figure, plus other types' option panels for reference
    example(pg, "meanci")
    pg.evaluate("document.querySelector('#title-on').click()"); pg.wait_for_timeout(300)
    fig(pg, "title_on")
    b.close()
