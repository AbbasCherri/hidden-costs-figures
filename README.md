# Figure Studio

A single-page, no-install tool that turns tables from the **Graph_Maker** sheet of the Hidden Costs study workbook into publication-ready figures. Paste a table, pick a style, tweak the text, and download a 300 dpi PNG or an SVG.

**Live site:** https://abbascherri.github.io/hidden-costs-figures/

## Contents

- [Quick start](#quick-start)
- [Loading data](#loading-data)
- [Chart types and styles](#chart-types-and-styles)
- [Controls reference](#controls-reference)
- [Exporting](#exporting)
- [Tips for publication](#tips-for-publication)
- [Troubleshooting](#troubleshooting)
- [Running locally](#running-locally)
- [Deploying and project layout](#deploying-and-project-layout)

---

## Quick start

1. In the study workbook, open the **Graph_Maker** sheet and choose the graph type, X, Y, group and filter.
2. Click any cell, press **Ctrl+A**, then **Ctrl+C** (use **Cmd** on a Mac).
3. Open Figure Studio and press **Ctrl+V** anywhere on the page. The chart type is recognised from the column headers and the figure draws immediately.
4. Choose a style, palette and size in the left panel.
5. Click **Download PNG**.

The page opens with a built-in example (mean by group with 95% CI) so you can explore the controls before loading real data.

> Nothing is uploaded anywhere. All parsing and drawing happens in your browser.

---

## Loading data

There are four ways to load a table. All of them show an error message in the Data card if something is wrong.

### 1. Paste from Graph_Maker (recommended)

Copy cells in Excel or Google Sheets and press **Ctrl+V** on the page (focus must not be inside a text box). You can copy either:

- the **whole sheet** (Ctrl+A, Ctrl+C), or
- **only the table**, including its header row (for example `x_category`, `n`, `mean`, and so on).

If the sheet carries Graph_Maker's suggested title, axis labels and footnote, they are picked up automatically.

### 2. Drop or choose a file

Drag a file onto the page, or use **Choose file**. Accepted formats: `.xlsx`, `.xlsm`, `.csv`, `.tsv`, `.txt`.

- For a workbook, the app reads the sheet whose name matches `Graph_Maker` and needs it to contain a calculated table. If you see "Graph_Maker has no calculated table", open the workbook in Excel, let it recalculate, save it, and upload it again.
- Reading `.xlsx` loads the SheetJS library from a CDN the first time, so this needs an internet connection. Pasting and CSV/TSV do not.

### 3. Paste box

Open **Paste box and examples** in the Data card, paste into the text area, and click **Use pasted cells**. Use this if Ctrl+V on the page does not work in your browser.

### 4. Built-in examples

In the same section, **Try a table from the workbook** loads a sample table for any chart type (except scatter). Useful for previewing what each chart looks like.

Once loaded, the Data card shows a chip with the detected chart type, the row count and the data source.

---

## Chart types and styles

The chart type is detected from the table's columns. Each type offers its own set of styles under **Style**.

| Graph_Maker type | Required idea | Styles |
| --- | --- | --- |
| **Bar / Pie** | Distribution of one variable | Vertical bars, Horizontal bars, Lollipop, Donut, Single stacked bar |
| **Histogram** | Binned distribution | Bars, Outline, Cumulative line |
| **Grouped / stacked** | X by group | Grouped bars, Stacked bars, 100% stacked horizontal, Heatmap, Dot plot |
| **Mean by group** | Means with 95% CI | Bars with CI, Dots with CI, Line with CI, Forest (horizontal) |
| **Box plot** | Distribution of Y by X | Box and whiskers, Horizontal boxes, Minimal (IQR bar) |
| **Scatter** | One row per respondent | Points, Points with trend line, Colour and shape by group, Small multiples by group |
| **Bubble / heatmap** | X × Y with counts | Bubbles, Heatmap |
| **Line** | Responses over time | Daily responses (bars), Cumulative (lines), Mean of Y by day |
| **Item battery** | Likert scales | Diverging stacked bars, 100% stacked bars, Ranked means, Heatmap |
| **Correlation heatmap** | All Spearman pairs | Triangle with coefficients, Full matrix, Circle matrix, Strongest pairs (ranked) |

Extra options appear below the style list for the chosen type, for example *Show means*, *Show n in labels*, *Order*, *Values as count or percent*, *Significance stars*, or *Pairs shown*.

---

## Controls reference

The left panel is organised into cards. Changes redraw the figure instantly.

### Style
Pick one of the styles listed above for the current chart type. Your choice is remembered per chart type while the page is open.

### Options
- **Colour palette.** Eleven standard sets: Journal muted (default), Vivid, Okabe-Ito, Paul Tol Bright, Paul Tol Muted, ColorBrewer Dark2, Nature (NPG), Science (AAAS), The Lancet, JAMA and Greyscale. Each shows its swatches and a note on colour-blind safety. The palette is hidden for chart types with fixed meaningful colours (Item battery and Correlation heatmap use diverging scales).
- **Colours.** Where available, choose **One colour** or **Distinct colours**.
- **Type-specific options.** Toggles and choices that depend on the chart.
- **Patterns for greyscale print.** Adds hatch patterns so groups stay distinguishable without colour. Only shown when the chart supports it.

### Text
- **Show title.** Off by default, since most journals use captions instead. Typing a title switches this on.
- **Title, X axis, Y axis, Footnote.** Pre-filled from the sheet's suggestions and fully editable.
- **Reset text to the sheet's suggestions.** Discards your edits and restores the automatic text.

### Size
Journal-ready widths. Height follows the content.

| Option | Width | PNG at 300 dpi |
| --- | --- | --- |
| Single column | 3.5 in | 1050 px wide |
| 1.5 column | 5.2 in | 1560 px wide |
| Double column | 7.2 in | 2160 px wide |

The exact export dimensions are shown under the figure.

---

## Exporting

Three buttons sit under the controls:

- **Download PNG:** 300 dpi raster, named like `figure_meanci_bars_mid.png` (type, style, size).
- **SVG:** vector file, best for editing in Illustrator or Inkscape and for journals that prefer vector art.
- **Copy:** copies a 300 dpi PNG to the clipboard so you can paste straight into Word or PowerPoint.

If the browser blocks direct saving or clipboard access, the image opens in a window instead. Right-click it and choose **Save image as** or **Copy image** (on a phone, press and hold). Press **Esc** or **Close** to dismiss it.

---

## Tips for publication

- Choose the **Okabe-Ito** or **Paul Tol** palettes when colour-blind readers matter.
- For black-and-white print, pick **Greyscale** and turn on **Patterns for greyscale print**.
- Colours repeat after 6 groups, and a warning appears under the figure. Filter or merge groups in Graph_Maker rather than relying on distinguishing many colours.
- Keep the title off and put it in the figure caption, as most journals expect.
- Pick the size that matches the journal column width, and avoid scaling the figure afterwards so text stays at the intended size.

---

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| "No Graph_Maker table found" | Copy the table including its header row, or the whole Graph_Maker sheet. |
| "This workbook has no Graph_Maker sheet" | Open the study workbook, or paste the table instead of uploading a different file. |
| "Graph_Maker has no calculated table" | Open the workbook in Excel, let it recalculate, save, and upload again. |
| "The Excel reader could not load" | You are offline or the CDN is blocked. Paste the table or use a CSV. |
| Ctrl+V does nothing | Click on the page background first (not in a text box), or use the paste box in the Data card. |
| "This chart could not be drawn" | The table does not have what that style needs. Try another style or re-copy the table. |
| Text looks wrong after changing options | Click **Reset text to the sheet's suggestions**. |
| Nothing happens on Download | Allow downloads for the site, or use the image window's right-click save. |

---

## Running locally

The app is one self-contained `index.html`, so there is no build step.

```bash
git clone https://github.com/AbbasCherri/hidden-costs-figures.git
cd hidden-costs-figures
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly in a browser also works. Web fonts (IBM Plex Sans) and the `.xlsx` reader load from the internet, and the page falls back gracefully if they are unavailable.

---

## Deploying and project layout

The site is served by GitHub Pages from the root of the `main` branch. Pushing to `main` redeploys it.

```
.
├── index.html    # the whole app: markup, styles, chart code and example data
├── .nojekyll     # tells GitHub Pages to serve files as-is
└── README.md
```

To set up Pages on a fork: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
