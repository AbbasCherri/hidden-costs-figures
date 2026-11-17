# Figure Studio

Figure Studio turns tables from the Graph_Maker sheet of the Hidden Costs study workbook into journal-ready figures. It is a static web page: plain HTML, CSS and JavaScript, no build step, no server, and nothing leaves the browser.

- Live site: https://abbascherri.github.io/hidden-costs-figures/
- **Using the app?** Read the step-by-step user guide: [Figure_Studio_Guide.pdf](Figure_Studio_Guide.pdf).
- **Changing the app?** This README is the technical guide.

## Contents

- [Design constraints](#design-constraints)
- [Run it locally](#run-it-locally)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Application state and the render loop](#application-state-and-the-render-loop)
- [Chart registry](#chart-registry)
- [Drawing API](#drawing-api)
- [Colour and palettes](#colour-and-palettes)
- [Export pipeline](#export-pipeline)
- [Saved preferences](#saved-preferences)
- [Testing](#testing)
- [Deploying](#deploying)
- [Building the user guide](#building-the-user-guide)
- [Known limits](#known-limits)
- [Project layout](#project-layout)

## Design constraints

- **No build, no bundler, no framework.** Every file is served as written. GitHub Pages serves the repository root.
- **Classic scripts, not ES modules.** Chrome blocks module imports over `file://`, and the app has to open from disk. The scripts load with `defer`, in the order given in `index.html`, and share one global scope. A file can use anything declared in the files above it.
- **Strict mode** in every code file (`'use strict'` at the top).
- **Two external resources.** The IBM Plex Sans web font (Google Fonts, with a system fallback) and SheetJS 0.18.5 from cdnjs, used only to read `.xlsx` files. Pasting and CSV/TSV loading work offline.
- **Output is SVG.** Charts are built with DOM calls into one `<svg>`. PNG is produced from that SVG at export time, so the screen preview and the exported file always match.
- **True print sizes.** Sizes are CSS pixels at 96 dpi, so 1 inch of journal width is 96 units and text sizes are real point sizes.

## Run it locally

```bash
git clone https://github.com/AbbasCherri/hidden-costs-figures.git
cd hidden-costs-figures
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` straight from disk also works. Offline, the page falls back to a system font and cannot read workbooks.

## Architecture

Data moves in one direction. A table comes in, the user's choices live in `state`, and every change redraws the figure from scratch.

```
paste / drop / file / example
        │  fromText() · fromFile()          js/parse.js
        ▼
table { type, headers, rows, settings }
        │  load()                           js/app.js
        ▼
state ──► buildPanel()   (controls)         js/app.js
  │
  └─────► render() ──► new Fig(width, cfg)  js/svg.js
                       CHARTS[type].draw()  js/charts/*.js
                       f.end() → <svg>
                              │
              preview in #fig │ pngBlob() / svgString()   js/export.js
                              ▼
                    PNG (300 dpi) · SVG · clipboard
```

Scripts load in this order. Later files rely on earlier ones.

| File | Responsibility | Main globals |
| --- | --- | --- |
| `data/examples.js` | Built-in sample tables taken from the study workbook | `EXAMPLES` |
| `js/tokens.js` | Design tokens and colour palettes | `NS`, `CH`, `PALETTES`, `applyPalette` |
| `js/svg.js` | SVG element helpers, text measuring, scales and ticks, group colours and patterns, the `Fig` class, axes and plot frames | `el`, `T`, `tw`, `wrap`, `linear`, `niceTicks`, `Fig`, `frameV`, `frameH` |
| `js/export.js` | SVG serialising, PNG rendering with DPI metadata | `svgString`, `pngBlob` |
| `js/chart-kit.js` | The `CHARTS` registry plus frames, pivots and legends shared by charts | `CHARTS`, `frameGrid`, `frameXY`, `pivot`, `groupLegend`, `plotH` |
| `js/stats.js` | Statistics for the scatter chart: t distribution, ranks, Pearson, Spearman, OLS, seeded random numbers | `spearman`, `ols`, `tinv`, `rng` |
| `js/parse.js` | Chart-type detection, delimited-text parsing, table extraction, SheetJS loading | `TYPE_LIST`, `detectType`, `fromText`, `fromFile` |
| `js/charts/*.js` | One definition per chart type, grouped five to a file | `CHARTS.<id>` |
| `js/prefs.js` | Saved preferences | `loadPrefs`, `savePrefs`, `resetPrefs` |
| `js/app.js` | State, control panel, drawing, export buttons, startup | `state`, `SIZES`, `load`, `render`, `init` |

## Data model

Everything downstream of parsing works on one object, the **table**:

```js
{
  type: 'meanci',                          // an id from TYPE_LIST
  headers: ['x_category', 'group_category', ...],
  rows: [{ x_category: 'Less than 15 minutes', mean: 22.429, ... }],   // one object per data row
  settings: { title, x, y, legend, foot, graphType, status },          // optional, from cells above the table
  source: 'file name'                      // set for uploaded workbooks
}
```

### Input paths

| Path | Entry point | Notes |
| --- | --- | --- |
| Ctrl+V anywhere on the page | `document` `paste` handler in `init()` | Ignored when the event target is an `<input>` or `<textarea>` |
| Paste box and Use pasted cells | `#use-paste` click handler | Fallback for browsers that block page-level paste |
| Drag and drop, Choose file | `fromFile(file)` | `.csv`, `.tsv`, `.txt` go through `fromText`; anything else is read as a workbook |
| Built-in example list | `exampleTable(id)` | Builds a table from `EXAMPLES`. There is no scatter example |

Text is split by `parseDelimited`. It is quote-aware (Excel puts newlines inside quoted cells) and picks tab, semicolon or comma from the first six lines. `coerce` turns cells into numbers, `null` or trimmed strings.

### Finding the table

`extract(grid)` scans rows from the top. A header candidate is the run of non-empty cells at the start of a row, at least three long, that `detectType` recognises. Data rows follow until column A is empty. Labelled cells above the header (`Suggested title`, `X axis`, `Y axis`, `Legend / series`, `Footnote`, `Graph type`, `Status`) become `settings`; each value is the next non-empty cell to the right of its label. That is why pasting the whole sheet fills in the text fields and pasting only the table does not.

For `.xlsx` files `fromFile` picks the first sheet whose name matches `/graph[_ ]?maker/i`, forces the read range to `A1:N620`, and reads cached cell values. It does not recalculate formulas.

### Chart-type detection

`detectType(headers)` tests these rules in order and returns the first match:

| Order | Type | Rule |
| --- | --- | --- |
| 1 | `corr` | has `variable_a` and `rho` |
| 2 | `scatter` | has `case_id` and `x_value` |
| 3 | `line` | has `date` and `recorded` |
| 4 | `likert` | first header is `item` and has `mean_code` |
| 5 | `box` | has `q1`, `median` and `whisker_low` |
| 6 | `meanci` | has `ci95_low` and `mean` |
| 7 | `hist` | has `bin_start` |
| 8 | `bubble` | has `x_label`, `y_label` and `count` |
| 9 | `bar` | first header is `category` and has `cumulative_percent` |
| 10 | `grouped` | first header is `category` and last header is `total` |

### Table columns by type

| Type | Columns |
| --- | --- |
| `bar` | `category, code, count, percent, cumulative_percent` |
| `hist` | `bin_label, bin_start, bin_end_exclusive, count, percent, cumulative_percent` |
| `grouped` | `category`, one column per group, `total` |
| `meanci` | `x_category, group_category, x_code, group_code, n, mean, sd, se, ci95_low, ci95_high` |
| `box` | `x_category, group_category, x_code, group_code, n, min, q1, median, q3, max, mean, whisker_low, whisker_high, n_outliers` |
| `scatter` | `case_id, x_value, y_value, x_label, y_label, group_code, group_label` |
| `bubble` | `x_label, y_label, x_value, y_value, count, percent` |
| `line` | `date, recorded, eligible, cumulative_recorded, cumulative_eligible, mean_of_y` |
| `likert` | `item, n, mean_code`, then one column per answer category |
| `corr` | `variable_a, variable_b, n, rho, p_value, p_bonferroni, direction, strength` |

## Application state and the render loop

`js/app.js` keeps all mutable state in one object:

| Field | Meaning |
| --- | --- |
| `data`, `type`, `source`, `settings` | The loaded table and where it came from |
| `variant` | Chosen style per chart type, `{ meanci: 'dots', ... }` |
| `opts` | Option values per chart type, `{ meanci: { zero: false, ... } }` |
| `text`, `dirty` | Title, axis and footnote text, and which fields the user has edited |
| `showTitle`, `size`, `patterns`, `hue`, `palette` | Global look-and-feel choices |
| `svg` | The most recently drawn `<svg>` element |

The loop has three functions:

- `load(table, source)` stores the table, validates the saved style and option values against the chart definition (falling back to defaults), clears errors, then calls `buildPanel()` and `render()`.
- `buildPanel()` rebuilds every control from the current chart definition: style list, palette, colour mode, options, size buttons, text fields. Controls are rebuilt, not patched.
- `render()` saves preferences, applies the palette, creates `new Fig(width, cfg)`, calls `CHARTS[type].draw()`, finishes the figure, swaps the SVG into `#fig`, and updates the size readout and the many-groups warning. A thrown error is caught and shown in `#stage-err`; the previous figure is cleared.

Text fields follow a simple rule. `autoText()` asks the chart definition for default axis labels and footnote and uses `settings.title` for the title. `syncText()` writes those defaults into the inputs except where `state.dirty[field]` is set, so the user's edits survive option changes and Reset text clears `dirty`. Typing a title switches `showTitle` on.

Sizes come from `SIZES`: 3.5, 5.2 and 7.2 inches, drawn at `round(inch × 96)` pixels wide and exported at 300 dpi.

| Size | Drawn width | Exported width |
| --- | --- | --- |
| Single column | 336 px | 1050 px |
| 1.5 column | 499 px | 1559 px |
| Double column | 691 px | 2159 px |

The many-groups warning counts distinct `group_category` or `group_label` values and appears above six, because palettes cycle after that.

## Chart registry

Every chart type is an entry in `CHARTS`, keyed by the id in `TYPE_LIST`:

```js
CHARTS.meanci = {
  variants: [{ id: 'bars', label: 'Bars with 95% CI' }, ...],     // styles; the first is the default
  options: [                                                     // per-chart controls
    { id: 'zero',   label: '...', kind: 'toggle', def: false },
    { id: 'value',  label: '...', choices: [['count', 'Count'], ['percent', 'Percent']], def: 'count' },
  ],
  hue: true,            // optional: show the One colour / Distinct colours switch
  fixedColours: true,   // optional: ignore palettes (diverging scales carry meaning)
  auto(data, settings, opts) { return { x, y, foot }; },        // default text
  draw(f, data, variantId, opts) { /* draw into the Fig f */ },
};
```

- An option with `kind: 'toggle'` is a boolean switch. An option with `choices` renders as a segmented control for up to three choices and a `<select>` for more. `load()` discards saved values that are not valid for the current definition.
- `draw` receives the saved option values plus `hue` (`'blue'` or `'cat'`). It reads `f.cfg.x` and `f.cfg.y` for the axis labels the user sees.
- Some definitions carry a `useSheetY: true` flag. Nothing reads it today.

### Adding a chart type

1. Add `{ id, name, note }` to `TYPE_LIST` in `js/parse.js`.
2. Add a rule to `detectType` in the same file. Put it before any rule that would match the same headers.
3. Write `CHARTS.<id>` in a file under `js/charts/` and list that file in `index.html` after `chart-kit.js`.
4. Add a sample table to `EXAMPLES` in `data/examples.js` so the example list and tests can reach it.
5. Run the regression check (see [Testing](#testing)). With a baseline taken first, the only differences should be new combinations for your type.

## Drawing API

`js/svg.js` and `js/chart-kit.js` hold the helpers charts use. Positions are in CSS pixels.

**`new Fig(width, cfg)`** builds the figure shell. `cfg` carries `title`, `showTitle`, `x`, `y`, `foot` and `patterns`.

| Member | Purpose |
| --- | --- |
| `f.add(...nodes)` | Append SVG nodes to the drawing layer |
| `f.legend(items, title?)` | Flow a legend in rows. Item kinds: box (default), `line`, `dot`, `mark` |
| `f.begin(h, { l, r, b, t })` | Reserve the plot rectangle of height `h` with margins, and return `{ x, y, w, h }` |
| `f.end()` | Add the footnote, size the SVG and return the `<svg>` element |
| `f.canPattern` | Set to true once a chart uses a second group fill, which reveals the Patterns switch |
| `f.notes` | Extra sentences appended to the footnote |

**Frames** lay out axes, ticks and labels and return scale functions: `frameV` (categories along x), `frameH` (categories down y), `frameXY` (two numeric axes), `frameGrid` (categorical grid for heatmaps and bubbles).

**Primitives**: `el(tag, attrs, ...kids)` makes an SVG element; `T(x, y, text, opts)` makes a text node; `rbar` draws a bar with a thin, darker outline; `markEl` draws marker shapes.

**Measuring and scales**: `tw(text, size, weight)` measures text with a canvas context, `wrap(text, maxWidth, size)` word-wraps, `linear(d0, d1, r0, r1)` builds a scale, `niceTicks(min, max, n)` picks round ticks.

**Data helpers**: `pivot(rows, categoryKey, groupKey)` returns `{ cats, grps, get }`; `groupLegend(f, groups, kind)` builds legend items; `plotH(width)` picks a plot height.

Text sizes live in the `S` object (tick 10.5, label 11.5, legend 10.5, title 13.5, note 9.5, value 10.5).

## Colour and palettes

`CH` in `js/tokens.js` is the single bag of design tokens: ink and axis colours, the active group palette `CH.pal`, and derived tints, sequential, diverging and Likert ramps. Charts read `CH` at draw time, never at load time.

`PALETTES` is a list of `{ id, name, cb, note, c: [...] }`. `cb` marks colour-blind-safe sets and drives the note shown under the swatches. `applyPalette(id)` copies the chosen set into `CH.pal` and recomputes the tints and ramps from its first colour, so it must run before every draw. `render()` and `buildPanel()` both call it.

To add a palette, append an entry to `PALETTES`. The dropdown, swatches and preferences validation pick it up automatically.

Print patterns are applied by `groupFill(f, i, color)`. Group 0 keeps the plain colour. Later groups get a hatched `<pattern>` when `cfg.patterns` is on, cycling through five designs, and calling it with `i > 0` sets `f.canPattern`. Charts with `fixedColours` hide the palette control.

## Export pipeline

`js/export.js` and `save()` / `copyImage()` in `js/app.js`:

1. `svgString(svg)` serialises the SVG with an XML declaration.
2. `pngBlob(svg, 300)` loads that string as an image from a data URI, draws it on a canvas scaled by `300 / 96` over a white background, and encodes PNG. `pngWithDpi` then inserts a `pHYs` chunk (with a CRC32) after the header, so Word and InDesign place the picture at its true size.
3. The file name is `figure_<type>_<variant>_<size>.<png|svg>`.
4. `save()` tries, in order: a host `downloads` hook if `window.claude.use('downloads')` exists; then a normal anchor download on an ordinary website; then, inside a host that offers no working download hook, the image modal with right-click instructions for PNG, or a message for SVG. A declined host save stops quietly.
5. `copyImage()` writes the PNG to the clipboard with `ClipboardItem`. If the browser blocks that, the image modal opens with a right-click copy hint.

## Saved preferences

`js/prefs.js` stores look-and-feel choices in `localStorage` under `figure-studio-prefs-v1` as JSON:

```json
{ "palette": "okabe", "size": "single", "patterns": false, "showTitle": true,
  "hue": "blue", "variant": { "meanci": "dots" }, "opts": { "meanci": { "zero": false } } }
```

- `render()` calls `savePrefs()`, so every change is stored. `init()` calls `loadPrefs()` once, before the first table loads.
- `loadPrefs()` accepts only known values: a palette id in `PALETTES`, a size id in `SIZES`, booleans for the switches, `blue` or `cat` for the colour mode. Style and option values are checked per chart type later, in `load()`.
- All storage calls sit in `try/catch`. If storage is blocked or the stored JSON is bad, the app runs with defaults and simply does not save.
- Data, text edits and the chosen example are never stored.
- `resetPrefs()` removes the key, restores defaults and reloads the current table. The next render writes the defaults back.

Bump the `-v1` suffix of `PREF_KEY` if the stored shape changes incompatibly.

## Testing

There is no unit-test framework. Rendering is deterministic, so the check is a regression harness, `tests/regress.py`. It renders every chart type × style × size × two palettes × two colour modes (444 figures), hashes each SVG, and reports page errors and failed requests.

```bash
pip install playwright           # plus Google Chrome on the machine
python3 -m http.server 8000 &    # or use a file:// URL
python3 tests/regress.py http://localhost:8000/index.html before.json
# ...make changes...
python3 tests/regress.py http://localhost:8000/index.html after.json before.json
```

With a baseline, the script lists every combination that changed and exits with status 1. A refactor should show zero differences. A new chart type or option shows only its own new combinations.

Manual smoke test after UI changes: paste the whole Graph_Maker sheet, upload the workbook, change palette and size, download PNG and SVG, press Copy, and use Reset saved preferences. The user guide's screenshot scripts exercise most of these paths too.

## Deploying

GitHub Pages serves the repository root from `main` (Settings → Pages → Deploy from a branch → `main` / `(root)`). `.nojekyll` tells Pages to serve files as-is. A push to `main` redeploys within a minute or two. Relative paths mean the site works under the `/hidden-costs-figures/` subpath and from `file://`.

## Building the user guide

`Figure_Studio_Guide.pdf` is the user guide. It is generated by scripts in `guide-src/`, and every picture in it is a real screenshot. The orange numbered boxes are drawn by the same scripts.

| Script | Does |
| --- | --- |
| `capture.py`, `capture3.py`, `capture4.py`, `capture5.py` | Playwright drives the app and captures screenshots, injecting callout boxes into the page just before each capture. `capture4.py` loads the real workbook by paste and upload |
| `capture2.py` | Captures the copy confirmation and the blocked-clipboard fallback window |
| `patch_workbook_view.py`, `oo_capture.sh`, `annotate_oo.py` | Open a copy of the workbook on its Graph_Maker tab in OnlyOffice on a private virtual display, capture it, and draw callouts |
| `build_pdf.py` | Writes the guide as HTML and prints it to PDF with Chrome. It runs twice so the contents page shows real page numbers |

Requirements: Python with Playwright and Pillow, Google Chrome, `pdftotext` and `pdfinfo` (Poppler). The OnlyOffice step also needs Xwayland, ImageMagick `import` and the OnlyOffice Flatpak. The scripts contain absolute paths to this checkout and to the study workbook; edit them when running elsewhere. To regenerate: run the capture scripts, then `build_pdf.py`.

The study workbook holds respondents' answers and is deliberately ignored by Git (`.gitignore`). Do not commit it.

## Known limits

- Workbook uploads read cached values only and stop at row 620 of the Graph_Maker sheet. The sheet must have been recalculated and saved.
- The `.xlsx` reader needs an internet connection the first time, because SheetJS comes from a CDN.
- The built-in examples cover nine of the ten chart types. Scatter has no example table.
- Tested in Chrome only.
- Each chart type's table layout is fixed by Graph_Maker. Renaming a column there breaks detection until `detectType` is updated.

## Project layout

```
.
├── index.html                 markup and the script tags, in load order
├── css/styles.css             all styles
├── data/examples.js           built-in sample tables
├── js/
│   ├── tokens.js              design tokens and colour palettes
│   ├── svg.js                 SVG helpers, scales, patterns, class Fig, axes
│   ├── export.js              SVG and 300 dpi PNG export
│   ├── chart-kit.js           CHARTS registry and frames shared by every chart
│   ├── stats.js               statistics used by the scatter chart
│   ├── parse.js               table detection, pasting, CSV and workbook reading
│   ├── charts/
│   │   ├── distribution.js    Bar / Pie, Histogram
│   │   ├── groups.js          Grouped / stacked, Mean by group, Box plot
│   │   ├── scatter.js         Scatter
│   │   ├── bubble-line.js     Bubble / heatmap, Line
│   │   └── items-corr.js      Item battery, Correlation heatmap
│   ├── prefs.js               saved preferences (localStorage)
│   └── app.js                 state, control panel, drawing, export buttons, startup
├── tests/regress.py           rendering regression check
├── Figure_Studio_Guide.pdf    user guide
├── guide-src/                 scripts and screenshots that build the user guide
├── .gitignore                 keeps workbook files out of the repository
├── .nojekyll                  tells GitHub Pages to serve files as-is
└── README.md                  this technical guide
```
