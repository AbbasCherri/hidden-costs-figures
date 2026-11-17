"""Draw numbered callouts on the OnlyOffice screenshot of the Graph_Maker sheet.
The screenshot was taken on a private virtual display, so nothing else from the desktop is in it."""
from PIL import Image, ImageDraw, ImageFont
im = Image.open("shots/oo_graphmaker_plain.png").convert("RGBA"); W, H = im.size; K = 4
ov = Image.new("RGBA", (W * K, H * K), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
font = ImageFont.truetype("/usr/share/fonts/google-noto/NotoSans-Bold.ttf", 21 * K)
ORANGE = (217, 72, 15, 255)
def box(r, n, corner="tl", pad=4):
    x0, y0, x1, y1 = [v * K for v in (r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad)]
    d.rounded_rectangle([x0, y0, x1, y1], radius=8 * K, outline=ORANGE, width=3 * K)
    S = 17 * K; cx, cy = {"tl": (x0, y0), "tr": (x1, y0), "bl": (x0, y1)}[corner]
    d.ellipse([cx - S - 2 * K, cy - S - 2 * K, cx + S + 2 * K, cy + S + 2 * K], fill=(255, 255, 255, 255))
    d.ellipse([cx - S, cy - S, cx + S, cy + S], fill=ORANGE)
    d.text((cx, cy), str(n), fill="white", font=font, anchor="mm")
box((598, 968, 696, 994), 1, "tl", 2)          # Graph_Maker tab
box((66, 372, 693, 684), 2, "tl")              # yellow input cells and their labels
box((802, 372, 1545, 652), 3, "tr", 3)         # suggestions and status
box((66, 773, 1233, 898), 4, "tl", 2)          # chart-ready table, selected
out = Image.alpha_composite(im, ov.resize((W, H), Image.LANCZOS)).convert("RGB"); out.save("shots/oo_graphmaker_annotated.png"); print(out.size)
