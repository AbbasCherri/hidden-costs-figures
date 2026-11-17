# Figure Studio

Figure Studio turns tables from the Graph_Maker sheet of the Hidden Costs study workbook into figures for journals. It runs in the browser with nothing to install. Paste a table, pick a style, edit the text, and download a 300 dpi PNG or an SVG.

Live site: https://abbascherri.github.io/hidden-costs-figures/

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

## Quick start

1. In the study workbook, open the Graph_Maker sheet and choose the graph type, X, Y, group and filter.
2. Click any cell, press Ctrl+A, then Ctrl+C (use Cmd on a Mac).
3. Open Figure Studio and press Ctrl+V anywhere on the page. The chart type is recognised from the column headers and the figure draws immediately.
4. Choose a style, palette and size in the left panel.
5. Click Download PNG.

The page opens with a built-in example (mean by group with 95% CI) so you can explore the controls before loading real data.

Nothing is uploaded. Parsing and drawing both happen in your browser.

## Loading data

There are four ways to load a table. If a load fails, the Data card shows an error message.

### 1. Paste from Graph_Maker

Copy cells in Excel or Google Sheets and press Ctrl+V on the page, with focus outside any text box. You can copy either:

- the whole sheet (Ctrl+A, Ctrl+C), or
- only the table, including its header row (for example `x_category`, `n`, `mean`, and so on).

If the sheet includes Graph_Maker's suggested title, axis labels and footnote, the app fills them in for you.

### 2. Drop or choose a file

Drag a file onto the page, or use Choose file. Accepted formats: `.xlsx`, `.xlsm`, `.csv`, `.tsv`, `.txt`.

- For a workbook, the app reads the sheet whose name matches `Graph_Maker` and needs it to contain a calculated table. If you see "Graph_Maker has no calculated table", open the workbook in Excel, let it recalculate, save it, and upload it again.
- Reading `.xlsx` loads the SheetJS library from a CDN, so it needs an internet connection. Pasting and CSV/TSV files do not.

### 3. Paste box

Open "Paste box and examples" in the Data card, paste into the text area, and click Use pasted cells. This is the fallback if Ctrl+V on the page does nothing.

### 4. Built-in examples

In the same section, "Try a table from the workbook" loads a sample table for any chart type except scatter. It is a quick way to see what each chart looks like.

After a successful load, the Data card shows the detected chart type, the row count and where the data came from.

## Chart types and styles

The app detects the chart type from the table's columns. Each type has its own styles under Style.

| Graph_Maker type | Shows | Styles |
| --- | --- | --- |
| Bar / Pie | Distribution of one variable | Vertical bars, Horizontal bars, Lollipop, Donut, Single stacked bar |
| Histogram | Binned distribution | Bars, Outline, Cumulative line |
| Grouped / stacked | X by group | Grouped bars, Stacked bars, 100% stacked horizontal, Heatmap, Dot plot |
| Mean by group | Means with 95% CI | Bars with CI, Dots with CI, Line with CI, Forest (horizontal) |
| Box plot | Distribution of Y by X | Box and whiskers, Horizontal boxes, Minimal (IQR bar) |
| Scatter | One row per respondent | Points, Points with trend line, Colour and shape by group, Small multiples by group |
| Bubble / heatmap | X × Y with counts | Bubbles, Heatmap |
| Line | Responses over time | Daily responses (bars), Cumulative (lines), Mean of Y by day |
| Item battery | Likert scales | Diverging stacked bars, 100% stacked bars, Ranked means, Heatmap |
| Correlation heatmap | All Spearman pairs | Triangle with coefficients, Full matrix, Circle matrix, Strongest pairs (ranked) |

Each type also adds its own options below the style list, such as Show means, Show n in labels, Order, count or percent values, Significance stars, and Pairs shown.

## Controls reference

The left panel is split into cards. Every change redraws the figure immediately.

### Style
Pick one of the styles listed above. The page remembers your choice for each chart type until you reload.

### Options
- Colour palette. Eleven sets: Journal muted (default), Vivid, Okabe-Ito, Paul Tol Bright, Paul Tol Muted, ColorBrewer Dark2, Nature (NPG), Science (AAAS), The Lancet, JAMA and Greyscale. Each shows its swatches and a note on colour-blind safety. Item battery and Correlation heatmap charts use fixed diverging scales, so the palette is hidden for them.
- Colours. Where offered, choose One colour or Distinct colours.
- Type-specific options. These depend on the chart.
- Patterns for greyscale print. Adds hatching so groups can be told apart without colour. It appears only for charts that support it.

### Text
- Show title. Off by default, since most journals put the title in the caption. Typing a title switches it on.
- Title, X axis, Y axis and Footnote. These start from the sheet's suggestions and you can edit all of them.
- Reset text to the sheet's suggestions. Throws away your edits and restores the automatic text.

### Size
Three journal column widths. Height follows the content.

| Option | Width | PNG at 300 dpi |
| --- | --- | --- |
| Single column | 3.5 in | 1050 px wide |
| 1.5 column | 5.2 in | 1560 px wide |
| Double column | 7.2 in | 2160 px wide |

The exact export dimensions are shown under the figure.

Your style, palette, colours, patterns, title switch and size are remembered on this device (browser localStorage), so the next visit starts where you left off. Data and typed text are never saved. Click Reset saved preferences in the Size card to clear them.

## Exporting

Three buttons sit below the controls:

- Download PNG saves a 300 dpi image named after the type, style and size, for example `figure_meanci_bars_mid.png`.
- SVG saves a vector file for editing in Illustrator or Inkscape, or for journals that want vector art.
- Copy puts a 300 dpi PNG on the clipboard so you can paste it into Word or PowerPoint.

If the browser blocks direct saving or clipboard access, the image opens in a window instead. Right-click it and choose Save image as or Copy image (on a phone, press and hold). Esc or Close dismisses it.

## Tips for journal figures

- Use the Okabe-Ito or Paul Tol palettes if colour-blind readers matter.
- For black-and-white print, pick Greyscale and turn on Patterns for greyscale print.
- Colours repeat after 6 groups and a warning appears under the figure. Filter the groups in Graph_Maker instead.
- Leave the title off and put it in the caption.
- Match the size to the journal's column width and don't rescale the figure afterwards, so the text stays the size you saw.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| "No Graph_Maker table found" | Copy the table including its header row, or the whole Graph_Maker sheet. |
| "This workbook has no Graph_Maker sheet" | Open the study workbook, or paste the table instead of uploading a different file. |
| "Graph_Maker has no calculated table" | Open the workbook in Excel, let it recalculate, save, and upload again. |
| "The Excel reader could not load" | You are offline or the CDN is blocked. Paste the table or use a CSV. |
| Ctrl+V does nothing | Click the page background first, outside any text box, or use the paste box in the Data card. |
| "This chart could not be drawn" | The table does not have what that style needs. Try another style or re-copy the table. |
| Text looks wrong after changing options | Click Reset text to the sheet's suggestions. |
| Nothing happens on Download | Allow downloads for the site, or use the image window's right-click save. |

## Running locally

The app is plain HTML, CSS and JavaScript files, so there is no build step.

```bash
git clone https://github.com/AbbasCherri/hidden-costs-figures.git
cd hidden-costs-figures
python3 -m http.server 8000   # then open http://localhost:8000
```

You can also open `index.html` directly in a browser, because the scripts are classic files rather than modules. The IBM Plex Sans font and the `.xlsx` reader load from the internet; offline, the page uses a fallback font and cannot read workbooks.

## Deploying and project layout

The site is served by GitHub Pages from the root of the `main` branch. Pushing to `main` redeploys it.

```
.
├── index.html                 page markup and the script tags, in load order
├── css/styles.css             all styles
├── data/examples.js           built-in sample tables
├── js/
│   ├── tokens.js              design tokens and colour palettes
│   ├── svg.js                 SVG helpers, scales, patterns, class Fig, axes
│   ├── export.js              SVG and 300 dpi PNG export
│   ├── chart-kit.js           CHARTS registry and frames shared by every chart
│   ├── stats.js               statistics used by the scatter chart
│   ├── parse.js               table detection, pasting, CSV and workbook reading
│   ├── charts/                one file per group of chart types
│   │   ├── distribution.js    Bar / Pie, Histogram
│   │   ├── groups.js          Grouped / stacked, Mean by group, Box plot
│   │   ├── scatter.js         Scatter
│   │   ├── bubble-line.js     Bubble / heatmap, Line
│   │   └── items-corr.js      Item battery, Correlation heatmap
│   ├── prefs.js               saved preferences (localStorage)
│   └── app.js                 state, control panel, drawing, export buttons, startup
├── Figure_Studio_Guide.pdf    step-by-step guide with screenshots
├── guide-src/                 scripts and screenshots that build the guide
├── .nojekyll                  tells GitHub Pages to serve files as-is
└── README.md
```
Scripts load in the order listed in `index.html`. They share one global scope, so a file can use anything defined in the files above it.

To set up Pages on a fork: Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.
