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
    x0=max(0,r[0]-L); y0=max(0,r[1]-T); x1=min(1440,r[2]+R); y1=min(1500,r[3]+B)
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


import openpyxl
WB = "/home/ody/Projects/hidden-costs/hidden-costs-figures/Honors_Capstone_-_Hidden_Costs_-_Data_Analysis_Redesign.xlsx"
ws = openpyxl.load_workbook(WB, data_only=True)["Graph_Maker"]
def cell(v): return "" if v is None else (str(v) if not isinstance(v, float) else repr(round(v, 4)).rstrip("0").rstrip("."))
rows = [[cell(c.value) for c in r] for r in ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=14)]
while rows and not any(rows[-1]): rows.pop()
whole = "\n".join("\t".join(r).rstrip("\t") for r in rows)
tbl = "\n".join("\t".join(cell(ws.cell(row=r, column=c).value) for c in range(1, 11)).rstrip("\t") for r in range(18, 24))
open("real_table.txt", "w").write(tbl); open("real_sheet.txt", "w").write(whole)
print(len(rows), "rows in sheet copy"); print(tbl)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    ctx = b.new_context(viewport={'width':1440,'height':1500}, device_scale_factor=2)
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1500)
    # A. paste the whole Graph_Maker sheet, as Ctrl+A / Ctrl+C would copy it
    paste(pg, whole); pg.wait_for_timeout(400)
    print("chip:", pg.inner_text("#chip-type"), "|", pg.inner_text("#chip-meta"), "| err:", pg.inner_text("#err"))
    shot(pg, "r_paste_card", ['#s-data'], ann=[dict(sel="#data-ok", n=1)])
    shot(pg, "r_paste_text", ['.panel .card:nth-of-type(4)'], ann=[dict(sel="#t-title", n=1, pad=3), dict(sel="#t-x", n=2, pad=3), dict(sel="#t-y", n=3, pad=3), dict(sel="#t-foot", n=4, pad=3)])
    shot(pg, "r_paste_full", full=True)
    # B. upload the workbook itself
    pg.goto(URL); pg.wait_for_timeout(1200)
    pg.set_input_files("#file", WB); pg.wait_for_timeout(5000)
    print("chip:", pg.inner_text("#chip-type"), "|", pg.inner_text("#chip-meta"), "| err:", pg.inner_text("#err"))
    shot(pg, "r_upload_card", ['#s-data'], ann=[dict(sel="#data-ok", n=1)])
    shot(pg, "r_upload_full", full=True)
    fig(pg, "r_upload_fig")
    b.close()
