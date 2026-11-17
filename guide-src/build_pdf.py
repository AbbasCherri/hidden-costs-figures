"""Build the Figure Studio guide PDF. Every image comes from shots/ (Playwright screenshots).
Two passes: the first lays out the document, the second fills real page numbers into the contents."""
import subprocess, re, html, os, sys
from playwright.sync_api import sync_playwright

D = os.path.dirname(os.path.abspath(__file__)); SH = f"file://{D}/shots/"
EXPORT = open("exported_name.txt").read().strip()
BAR_TXT = open("real_table.txt").read()
_rows = [r.split("\t") for r in BAR_TXT.strip().split("\n")]
_w = [max(len(r[i]) for r in _rows) for i in range(len(_rows[0]))]
BAR_ALIGNED = "\n".join("  ".join(c.ljust(_w[i]) for i, c in enumerate(r)).rstrip() for r in _rows)
n_fig = [0]

def img(name, cls="", w=None):
    st = f' style="width:{w}"' if w else ""
    return f'<img class="{cls}" src="{SH}{name}.png"{st}>'

def figure(name, caption, w=None, cls=""):
    n_fig[0] += 1
    return f'<figure class="{cls}">{img(name, "shot", w)}<figcaption><b>Figure {n_fig[0]}.</b> {caption}</figcaption></figure>'

def legend(items, cls=""):
    return f'<ol class="legend {cls}">' + "".join(f'<li><span class="b">{i+1}</span><div>{t}</div></li>' for i, t in enumerate(items)) + "</ol>"

def side(name, caption, items, w="76mm"):
    n_fig[0] += 1
    return (f'<div class="side"><figure style="width:{w}">{img(name, "shot")}<figcaption><b>Figure {n_fig[0]}.</b> {caption}</figcaption></figure>'
            f'<div class="sidetxt">{legend(items)}</div></div>')

def grid(cells, cols=2):
    out = f'<div class="grid c{cols}">'
    for name, cap in cells:
        n_fig[0] += 1
        out += f'<figure>{img(name, "shot")}<figcaption><b>Figure {n_fig[0]}.</b> {cap}</figcaption></figure>'
    return out + "</div>"

def tip(t, kind="tip"):
    lab = {"tip": "Tip", "note": "Note", "warn": "Watch out"}[kind]
    return f'<div class="box {kind}"><b>{lab}.</b> {t}</div>'

def step(num, title, anchor):
    return f'<div class="stephead" id="{anchor}"><span class="num">{num}</span><h1>{title}</h1></div>'

def h1(t, a): return f'<h1 id="{a}" class="plain">{t}</h1>'

TOC = [("what", "What Figure Studio does"), ("tour", "A tour of the workspace"),
       ("s1", "Step 1. Copy the table from Graph_Maker"), ("s2", "Step 2. Load the table"),
       ("s3", "Step 3. Choose a chart style"), ("s4", "Step 4. Set colours and options"),
       ("s5", "Step 5. Edit the text"), ("s6", "Step 6. Pick a size"), ("s7", "Step 7. Export the figure"),
       ("gal", "The ten chart types"), ("check", "Quick checklist"), ("trouble", "Troubleshooting")]

def toc(pages):
    rows = "".join(f'<li><a href="#{a}">{t}</a><span class="dots"></span><span class="pg">{pages.get(a, "")}</span></li>' for a, t in TOC)
    return f'<ol class="toc">{rows}</ol>'

def body(pages):
    n_fig[0] = 0
    P = []
    # ---------------- cover
    P.append(f'''<section class="cover">
      <div class="brand"><svg viewBox="0 0 28 28" width="46" height="46"><rect x="3" y="15" width="5" height="10" rx="1.5" fill="#2a78d6"/><rect x="11.5" y="8" width="5" height="17" rx="1.5" fill="#2a78d6"/><rect x="20" y="3" width="5" height="22" rx="1.5" fill="#0b2c57"/></svg><span>Figure Studio</span></div>
      <h1 class="title">User guide</h1>
      <p class="sub">Step by step: how to turn a Graph_Maker table from the Hidden Costs workbook into a journal-ready figure, from copying the cells to saving a 300 dpi PNG or an SVG.</p>
      <div class="coverimg">{img("01_cover", "shot")}</div>
      <p class="live">Open the tool: <b>abbascherri.github.io/hidden-costs-figures</b></p>
      <p class="small">Every picture in this guide is a screenshot of the running app, captured by a script. The orange numbered boxes were added by the same script.</p>
    </section>''')
    # ---------------- contents + how to read
    P.append(f'''<section class="pb"><h1 class="plain">Contents</h1>{toc(pages)}
    <h2>How to read this guide</h2>
    <ul class="plainlist">
      <li>Work through Steps 1 to 7 in order the first time. After that, jump straight to the step you need.</li>
      <li>Orange numbered boxes on a screenshot match the numbered list beside or under it.</li>
      <li>Tip and Note boxes are short asides. Watch out boxes flag common mistakes.</li>
      <li>This is the user guide. The technical guide for developers and maintainers is the README in the project repository.</li>
      <li>The charts in the chart-type pages use the sample tables that come built into the app. The Graph_Maker pictures and the pasted and uploaded workbook pictures come from the real study workbook. The scatter chart and the colour, pattern and warning demonstrations use made-up demonstration numbers, because the workbook's current table has no scatter data or multiple groups. They show how the tool behaves, not study results.</li>
    </ul></section>''')
    # ---------------- what it does
    P.append(f'''<section class="pb">{h1("What Figure Studio does", "what")}
    <p>Figure Studio is a web page. You give it a table from the Graph_Maker sheet and it draws a figure sized for a journal column. You then change the style, colours, wording and size, and download the result.</p>
    <p>It works out the chart type from the table's column headers, so you never have to say what kind of data it is.</p>
    <h3>What you need</h3>
    <ul class="plainlist">
      <li>The Hidden Costs study workbook, open in OnlyOffice, Excel or Google Sheets, with a working Graph_Maker sheet.</li>
      <li>A current desktop browser. The screenshots in this guide were captured in Chrome, so other browsers may look slightly different.</li>
      <li>An internet connection for the first load, because the page fetches its font from Google Fonts. You also need it if you upload an <code>.xlsx</code> file, which loads a spreadsheet reader. Pasting cells or loading a CSV works without that reader.</li>
    </ul>
    <h3>The whole job in five moves</h3>
    <ol class="five"><li><b>Copy</b><span>cells in Graph_Maker</span></li><li><b>Paste</b><span>with Ctrl+V on the page</span></li><li><b>Adjust</b><span>style, colours, text, size</span></li><li><b>Check</b><span>the preview</span></li><li><b>Download</b><span>PNG or SVG</span></li></ol>
    {tip("Nothing you load leaves your computer. The page reads and draws everything in your browser.", "note")}
    </section>''')
    # ---------------- tour
    P.append(f'''<section class="pb">{h1("A tour of the workspace", "tour")}
    <p>The window has two parts. The control panel runs down the left. The figure preview sits on the right and redraws every time you change a control.</p>
    {figure("01_overview", "The workspace with the example table loaded. The numbers match the list below.", w="122mm", cls="center")}
    {legend(["<b>Data</b>: where you paste or load a table, and where errors appear.",
      "<b>Style</b>: the ways this chart type can be drawn. The list changes with the chart type.",
      "<b>Options</b>: colour palette, one colour or distinct colours, and switches that belong to the chart.",
      "<b>Text</b>: title, axis labels and footnote, all editable.",
      "<b>Size</b>: single, 1.5 or double column width, plus a link that clears saved preferences.",
      "<b>Export bar</b>: Download PNG, SVG and Copy. It stays at the bottom of the panel while the cards scroll.",
      "<b>Preview</b>: the figure exactly as it will be exported.",
      "<b>Size readout</b>: the width in inches and the pixel size of the exported PNG."], "cols2")}
    {tip("When the app opens it already shows an example, so you can try every control before loading your own data.")}
    </section>''')
    # ---------------- step 1
    P.append(f'''<section class="pb">{step(1, "Copy the table from Graph_Maker", "s1")}
    <p>Figure Studio does not read the workbook's raw answers. It reads the finished table that the Graph_Maker sheet builds for the chart you choose. Your first job is to set up that chart in the workbook and copy the result.</p>
    {figure("oo_graphmaker_annotated", "The Graph_Maker sheet of the study workbook in OnlyOffice Desktop Editors. It is set to Mean by group, X = Q10 Commute time, Y = PSS-10 total, and the table is selected from its header row down.", w="174mm", cls="center")}
    {legend(["The Graph_Maker tab. Click it at the bottom of the window.",
      "What to plot. The yellow cells are the inputs. Click one and pick from its dropdown list. Bin width takes a whole number. Grey rows (here Item set and Show values as) do not apply to this graph type.",
      "What the sheet suggests. A chart description, a title, axis labels, a legend text and a footnote, plus a Status line. Wait for the green tick before you copy.",
      "The chart-ready table. This is what Figure Studio reads. Its column headers tell the app which chart type it is. Here it is selected from the header row (row 18) to the last data row (row 23)."])}
    <ol class="steps">
      <li><span class="n">1a</span><div>Open the <b>Graph_Maker</b> sheet in the study workbook.</div></li>
      <li><span class="n">1b</span><div>Choose the <b>Graph type</b> first, then X, Y, group and filter. Check that the Status line shows a green tick and the row and column counts you expect.</div></li>
      <li><span class="n">1c</span><div>Click any cell, press <kbd>Ctrl</kbd>+<kbd>A</kbd>, then <kbd>Ctrl</kbd>+<kbd>C</kbd>. On a Mac use <kbd>Cmd</kbd>. That copies the whole sheet. To copy only the table, select it as in box 4 instead.</div></li>
    </ol>
    {tip("You can copy less. Selecting only the table (box 4), starting at its header row, works just as well. Copying the whole sheet has one advantage: the app also picks up the suggested title, axis labels and footnote from box 3. Step 2 shows the difference.")}
    <h3>What the copied table looks like</h3>
    <p>Pasted cells arrive as plain text, one row per line, with a tab between cells (lined up here so it is easier to read). This is the table from box 4, exactly as the app receives it. The first line is the header row. The headers are how the app recognises the chart type.</p>
    <pre class="code">{html.escape(BAR_ALIGNED)}</pre>
    {tip("If Graph_Maker shows an empty table or an error in the Status line, the app cannot help yet. Open the workbook in OnlyOffice or Excel, let it recalculate, save it, then copy again.", "warn")}
    <p>The app prints a short version of these steps in its Data card. Click <b>How to get the data</b> to open it.</p>
    </section>''')
    # ---------------- step 2
    P.append(f'''<section class="pb">{step(2, "Load the table", "s2")}
    <p>There are four ways to get a table into the app. The first is the one you will use most of the time.</p>
    <h2>Method A. Paste with Ctrl+V (fastest)</h2>
    <ol class="steps">
      <li><span class="n">1</span><div>Click an empty part of the Figure Studio page, away from any text box.</div></li>
      <li><span class="n">2</span><div>Press <kbd>Ctrl</kbd>+<kbd>V</kbd> (<kbd>Cmd</kbd>+<kbd>V</kbd> on a Mac).</div></li>
      <li><span class="n">3</span><div>The figure redraws at once. The Data card shows a blue tag with the detected chart type, the number of rows, and the word <i>pasted table</i>.</div></li>
    </ol>
    {side("r_paste_card", "After pasting the whole Graph_Maker sheet from Step 1.", ["Detected chart type (Mean by group), row count (5 rows, one per commute category) and where the data came from."], w="61mm")}
    {side("r_paste_text", "The Text card after the same paste. The app filled it from the sheet.", ["Title, from the sheet's Suggested title.", "X axis label, from the sheet's X axis.", "Y axis label, from the sheet's Y axis.", "Footnote, from the sheet's Footnote."], w="61mm")}
        </section>''')
    P.append(f'''<section>
    <div class="keep"><h2>Method B. Drop or choose a file</h2>
    <p>Use this when you have a saved CSV, TSV, text file or the workbook itself. Accepted types are <code>.xlsx</code>, <code>.xlsm</code>, <code>.csv</code>, <code>.tsv</code> and <code>.txt</code>.</p>
    {side("02_data_card", "The Data card in its resting state.", ["The drop zone. Drag a file anywhere on the page and drop it. While you drag, the whole window dims and says \"Drop the workbook to load it\".", "The Choose file button opens your computer's file picker.", "The loaded tag. It tells you what is currently on screen.", "How to get the data: opens the three-line recipe from Step 1.", "Paste box and examples: opens the paste box and the example list (Methods C and D)."], w="61mm")}
        {side("r_upload_card", "After choosing the study workbook with Choose file.", ["The tag shows the chart type and the workbook file name."], w="61mm")}
    <ul class="plainlist">
      <li>For a workbook, the app opens the sheet named Graph_Maker and reads its table, as in the figure below. If the table is blank, recalculate and save the workbook in OnlyOffice or Excel first.</li>
      <li>Reading an <code>.xlsx</code> file needs an internet connection the first time, because the page downloads its spreadsheet reader.</li>
    </ul></div>
    </section>''')
    P.append(f'''<section>
    <div class="keep"><h2>Method C. The paste box</h2>
    <p>If Ctrl+V on the page does nothing in your browser, paste into a box instead.</p>
    <ol class="steps">
      <li><span class="n">1</span><div>In the Data card, click <b>Paste box and examples</b> to open it.</div></li>
      <li><span class="n">2</span><div>Click inside the text area and press Ctrl+V.</div></li>
      <li><span class="n">3</span><div>Click <b>Use pasted cells</b>.</div></li>
    </ol>
    {side("04_pastebox_open", "The Data card with the paste box section open.", ["The text area for pasted cells.", "Use pasted cells loads whatever is in the text area.", "The example list: choose a chart type to load a sample table (Method D)."], w="61mm")}</div>
        <h2>Method D. Try a built-in example</h2>
    <p>In the same section, the list called <b>Try a table from the workbook</b> loads a sample table for any chart type except scatter. Choose one to see what that chart looks like before you copy real data. The chart pages near the end of this guide were all made this way.</p>
    <h2>If something goes wrong</h2>
    <p>When the app cannot use what you gave it, a red message appears in the Data card and the previous figure stays on screen. Nothing is lost.</p>
    {side("06_error_small", "The message after pasting a plain sentence instead of a table.", ["The red message says what is missing. Here it asks for the header row or the whole Graph_Maker sheet. The tag below still shows the earlier, valid table. The most common cause is copying only the data rows and leaving out the header row. Copy again and include the first line."], w="61mm")}
        </section>''')
    # ---------------- step 3
    P.append(f'''<section class="pb">{step(3, "Choose a chart style", "s3")}
    <p>Each chart type can be drawn in several ways. Pick one in the Style card. The preview changes immediately.</p>
    {side("09_style_card", "The Style card for a Mean by group table.", ["The list of styles for this chart type. The filled circle marks the current style. Click any row to switch."])}
    <p>Here is the same table in all four of its styles. Only the style changed. Forest suits many categories with long names. Dots and lines suit a scale that does not start at zero. Every chart type has its own styles, listed in The ten chart types.</p>
    {grid([("style_meanci_bars", "Bars with 95% CI."), ("style_meanci_dots", "Dots with 95% CI."), ("style_meanci_line", "Line with 95% CI."), ("style_meanci_forest", "Forest (horizontal).")])}
</section>''')
    # ---------------- step 4
    P.append(f'''<section class="pb">{step(4, "Set colours and options", "s4")}
    <p>The Options card holds everything that changes the look of the data marks. The controls shown depend on the chart. This example uses a grouped bar chart with three groups called Rent, Own and Family, using demonstration numbers.</p>
    {side("10_options_card", "The Options card for a grouped chart.", ["Colour palette: a list of eleven palettes.", "Swatches: the colours of the chosen palette, in the order groups will use them. A one-line note below says whether the palette is safe for colour-blind readers.", "Chart-specific controls. Here: how values are counted and whether the numbers are printed on the bars."])}
    <h2>Compare palettes</h2>
    <p>Choose a palette from the list. Four of them, plus greyscale, on the same table:</p>
    {grid([("pal_journal", "Journal muted (the default)."), ("pal_okabe", "Okabe-Ito, designed for colour-vision deficiency."), ("pal_tolbright", "Paul Tol Bright."), ("pal_lancet", "The Lancet palette."), ("pal_grey", "Greyscale, for black-and-white print.")])}
    {tip("If readers may be colour-blind, choose Okabe-Ito or one of the Paul Tol palettes. The note under the swatches says which palettes are colour-blind safe.")}
    </section>''')
    P.append(f'''<section>
    <h2>One colour or distinct colours</h2>
    <p>Charts with a single series have a Colours switch. <b>One colour</b> draws every bar in the first palette colour. <b>Distinct colours</b> gives each category its own colour.</p>
    {side("18_hue_row", "The Colours switch.", ["One colour or Distinct colours. It appears only for charts where it makes sense."], w="90mm")}
    {grid([("hue_one", "One colour."), ("hue_distinct", "Distinct colours.")])}
    <h2>Patterns for greyscale print</h2>
    <p>Some journals print in black and white. Choose the Greyscale palette, then turn on <b>Patterns for greyscale print</b>. Each group gets a hatch pattern, so groups still differ when colour is gone.</p>
    {side("18_pat_row", "The Patterns switch.", ["Patterns for greyscale print. It only appears for charts that can use patterns."], w="90mm")}
    {grid([("grey_patterns_off", "Greyscale without patterns: the second and third groups are hard to tell apart."), ("grey_patterns_on", "Greyscale with patterns: every group is distinct.")])}
    </section>''')
    # ---------------- step 5
    P.append(f'''<section class="pb">{step(5, "Edit the text", "s5")}
    <p>The Text card controls the title, axis labels and footnote. They start from Graph_Maker's suggestions. Any field you type in becomes yours and the app stops overwriting it.</p>
    {side("12_text_card", "The Text card.", ["Show title. Off by default, because most journals put the title in the caption.", "Title field. Typing here switches the title on automatically.", "X axis label.", "Y axis label.", "Footnote, shown under the figure. Good for sample size and abbreviations.", "Reset text to the sheet's suggestions."], w="68mm")}
    <h2>Before and after</h2>
    <p>The left picture is the starting text. The right picture has an edited title, Y axis label and footnote.</p>
    {grid([("text_before", "Starting text, title off."), ("text_after", "Edited text, title on.")])}
    <h2>Undoing your edits</h2>
    <p>Click <b>Reset text to the sheet's suggestions</b> to discard everything you typed and go back to the automatic text. The title switch stays as it was.</p>
    {tip("The footnote often carries the sample size. Check that it still matches your chart after you change filters or groups.", "warn")}
    </section>''')
    # ---------------- step 6
    P.append(f'''<section class="pb">{step(6, "Pick a size", "s6")}
    <p>Journals publish figures at fixed widths. Choose the width that matches the column you are writing for, so the text keeps its intended size.</p>
    {side("13_size_card", "The Size card.", ["Single column, 1.5 column or double column. The selected one is highlighted.", "The note that your choices are remembered.", "Reset saved preferences. It clears everything the app saved on this device."])}
    <table class="tbl"><tr><th>Choice</th><th>Width</th><th>Exported PNG at 300 dpi</th></tr>
      <tr><td>Single column</td><td>3.5 in</td><td>1050 px wide</td></tr>
      <tr><td>1.5 column</td><td>5.2 in</td><td>1559 px wide</td></tr>
      <tr><td>Double column</td><td>7.2 in</td><td>2159 px wide</td></tr></table>
    <p>The height follows the content. The exact pixel size of the current figure is printed under the preview.</p>
    <p>Figure Studio remembers your style, palette, colours, patterns, title switch and size on this device, so the next visit starts where you left off. It never saves your data or your typed text. If you want the defaults back, click Reset saved preferences under the size buttons.</p>
    </section>''')
    P.append(f'''<section class="pb"><h2 style="margin-top:0">The same chart at three widths</h2>
    <p>These three captures use the same scale, so you can see the real size difference. They are drawn smaller than life to fit the page. Narrower figures wrap or rotate long labels to fit, as the single-column version shows.</p>
    <div class="rowfig">{figure("size_single", "Single column.", w="66mm")}{figure("size_mid", "1.5 column.", w="98mm")}</div>
    {figure("size_double", "Double column.", w="125mm")}
    </section>''')
    # ---------------- step 7
    P.append(f'''<section class="pb">{step(7, "Export the figure", "s7")}
    <p>Three buttons sit at the bottom of the control panel. They are always visible, however far you scroll the cards.</p>
    {side("14_export_buttons", "The export bar.", ["<b>Download PNG</b>: a 300 dpi picture for Word, PowerPoint or a journal upload form.", "<b>SVG</b>: a vector file for editing in Illustrator or Inkscape, or for journals that ask for vector art.", "<b>Copy</b>: puts the PNG on the clipboard so you can paste it straight into a document."], w="90mm")}
    <h2>Download PNG</h2>
    <ol class="steps">
      <li><span class="n">1</span><div>Check the preview and the size readout.</div></li>
      <li><span class="n">2</span><div>Click <b>Download PNG</b>.</div></li>
      <li><span class="n">3</span><div>A green message under the buttons confirms the file name. The browser saves it to your Downloads folder.</div></li>
    </ol>
    {side("14_export_saved", "The confirmation message after clicking Download PNG.", [f"The saved file name. It records the chart type, style and size, here <code>{EXPORT}</code>."], w="90mm")}
    <p>This is the actual file the app produced when the button was clicked for this guide. It measures 1559 by 1078 pixels at 300 dpi.</p>
    {figure("../exported_figure", "The downloaded PNG, shown at about 70 percent of its real size.", w="92mm", cls="center")}
    </section>''')
    P.append(f'''<section>
    <h2>SVG and Copy</h2>
    <ul class="plainlist">
      <li>Click <b>SVG</b> and you get a file with the same name ending in <code>.svg</code>. Text stays as editable text and shapes stay editable in a vector editor.</li>
      <li>Click <b>Copy</b>, then paste into Word or PowerPoint with Ctrl+V. The message under the buttons says when the copy is done.</li>
    </ul>
    {side("17_copy_done", "The message after clicking Copy.", ["Copy confirmation."], w="86mm")}
    <h2>If the browser blocks saving or copying</h2>
    <p>Some browsers and embedded views block clipboard access. The app then opens a window showing the finished image. Right-click it and choose <b>Copy image</b> or <b>Save image as</b>. On a phone, press and hold the image. Click <b>Close</b> or press <kbd>Esc</kbd> to leave the window.</p>
    {figure("17_copy_modal", "The fallback window, shown here by simulating a browser that blocks clipboard writes.", w="105mm", cls="center")}
    {tip("Always open the saved PNG once and look at it at full size before you send it anywhere. Check that labels are readable and nothing is cut off.")}
    </section>''')
    # ---------------- gallery
    gal = [("gal_bar", "Bar / Pie", "Distribution of one variable", "category, code, count, percent, cumulative_percent", "Vertical bars, Horizontal bars, Lollipop, Donut, Single stacked bar"),
     ("gal_hist", "Histogram", "Binned distribution", "bin_label, bin_start, bin_end_exclusive, count, percent, cumulative_percent", "Bars, Outline, Cumulative line"),
     ("gal_grouped", "Grouped / stacked", "X broken down by a group", "category, one column per group, total", "Grouped bars, Stacked bars, 100% stacked horizontal, Heatmap, Dot plot"),
     ("gal_meanci", "Mean by group", "Means with 95% confidence intervals", "x_category, group_category, x_code, group_code, n, mean, sd, se, ci95_low, ci95_high", "Bars, Dots, Line, Forest (horizontal) with 95% CI"),
     ("gal_box", "Box plot", "Distribution of Y for each X", "x_category, group_category, x_code, group_code, n, min, q1, median, q3, max, mean, whisker_low, whisker_high, n_outliers", "Box and whiskers, Horizontal boxes, Minimal (IQR bar)"),
     ("gal_scatter", "Scatter", "One point per respondent (demonstration data)", "case_id, x_value, y_value, x_label, y_label, group_code, group_label", "Points, Points with trend line, Colour and shape by group, Small multiples by group"),
     ("gal_bubble", "Bubble / heatmap", "X by Y with counts", "x_label, y_label, x_value, y_value, count, percent", "Bubbles, Heatmap"),
     ("gal_line", "Line", "Responses over time", "date, recorded, eligible, cumulative_recorded, cumulative_eligible, mean_of_y", "Daily responses (bars), Cumulative (lines), Mean of Y by day"),
     ("gal_likert", "Item battery", "Likert scale items", "item, n, mean_code, then one column per answer category", "Diverging stacked bars, 100% stacked bars, Ranked means, Heatmap"),
     ("gal_corr", "Correlation heatmap", "All Spearman pairs", "variable_a, variable_b, n, rho, p_value, p_bonferroni, direction, strength", "Triangle with coefficients, Full matrix, Circle matrix, Strongest pairs (ranked)")]
    P.append(f'''<section class="pb">{h1("The ten chart types", "gal")}
    <p>The app recognises these ten tables by their headers. For each one you can see the first header names the app looks for, the styles on offer, and a sample figure in its default style.</p>
    <table class="tbl small"><tr><th>Chart type</th><th>Shows</th><th>Styles</th></tr>
    {"".join(f"<tr><td>{n}</td><td>{s}</td><td>{st}</td></tr>" for _, n, s, _, st in gal)}</table></section>''')
    byname = {g[0]: g for g in gal}
    for pair, wd in [(("gal_bar", "gal_hist"), "132mm"), (("gal_grouped", "gal_meanci"), "132mm"), (("gal_box", "gal_scatter"), "132mm"),
                     (("gal_bubble", "gal_line"), "118mm"), (("gal_likert",), "150mm"), (("gal_corr",), "150mm")]:
        P.append('<section class="pb galpage">' + "".join(
            f'<div class="galitem"><h2>{byname[k][1]}</h2><p class="meta"><b>Use it for:</b> {byname[k][2]}.<br><b>Table columns:</b> <code>{byname[k][3]}</code><br><b>Styles:</b> {byname[k][4]}.</p>{figure(k, byname[k][1] + " in its default style.", w=wd)}</div>'
            for k in pair) + "</section>")
    # ---------------- checklist
    P.append(f'''<section class="pb">{h1("Quick checklist", "check")}
    <p>Use this once you know your way around.</p>
    <ol class="check">
      <li>In Graph_Maker, set the graph type, X, Y, group and filter. Wait for the table.</li>
      <li>Ctrl+A, Ctrl+C in the sheet.</li>
      <li>Open Figure Studio and press Ctrl+V on the page. Confirm the chart type tag.</li>
      <li>Choose a Style.</li>
      <li>Set the palette. Use Okabe-Ito or Paul Tol if colour-blind readers matter. Use Greyscale with Patterns for black-and-white print.</li>
      <li>Edit the Title (if you want one), axis labels and footnote. Check the sample size in the footnote.</li>
      <li>Choose the Size that matches the journal column.</li>
      <li>Read the warning line under the preview if there is one.</li>
      <li>Click Download PNG, or SVG for vector art, or Copy for a document.</li>
      <li>Open the saved file at full size and check it.</li>
    </ol>
    <h2>Handy facts</h2>
    <ul class="plainlist">
      <li>Ctrl+V works anywhere on the page except inside a text box.</li>
      <li>Esc closes the image window.</li>
      <li>Your style, palette, colours, patterns, title switch and size are remembered on this device, even after you close the page. Your data and typed text are not: they reset when you load a new table, and reloading the page starts again from the built-in example.</li>
      <li>Colours repeat after six groups. If a warning says so, filter the groups in Graph_Maker.</li>
    </ul></section>''')
    # ---------------- troubleshooting
    P.append(f'''<section class="pb">{h1("Troubleshooting", "trouble")}
    <table class="tbl small"><tr><th>What you see</th><th>What to do</th></tr>
    <tr><td>No Graph_Maker table found</td><td>Copy the table including its header row, or the whole Graph_Maker sheet.</td></tr>
    <tr><td>This workbook has no Graph_Maker sheet</td><td>Open the study workbook, or paste the table instead of uploading a different file.</td></tr>
    <tr><td>Graph_Maker has no calculated table</td><td>Open the workbook in OnlyOffice or Excel, let it recalculate, save it, and upload again.</td></tr>
    <tr><td>The Excel reader could not load</td><td>You are offline or the network blocks the library. Paste the cells or use a CSV file.</td></tr>
    <tr><td>Ctrl+V does nothing</td><td>Click the page background first, outside any text box. Or use the paste box in the Data card.</td></tr>
    <tr><td>This chart could not be drawn</td><td>The table does not have what that style needs. Try another style, or copy the table again.</td></tr>
    <tr><td>The text looks wrong after changing options</td><td>Click Reset text to the sheet's suggestions.</td></tr>
    <tr><td>Nothing happens on Download</td><td>Allow downloads for the site. Or use the image window and right-click to save.</td></tr>
    <tr><td>The page opens with settings I did not choose</td><td>Another person may have used this browser, or you changed them earlier. Click Reset saved preferences in the Size card.</td></tr>
    <tr><td>Labels are tilted or crowded</td><td>Choose a wider Size, or a horizontal style such as Horizontal bars or Forest.</td></tr>
    </table>
    <h2>A warning about many groups</h2>
    <p>When a table has more than six groups, a line appears under the preview. Colours repeat after six groups, so groups start to look alike.</p>
    {side("18_warn_line", "The warning line under the preview, shown here for a demonstration table with seven groups.", ["The warning. It says how many groups the table has and suggests filtering in Graph_Maker."], w="110mm")}
    {tip("Filter or merge groups in Graph_Maker rather than relying on readers to tell seven colours apart.")}
    </section>''')
    return "\n".join(P)

CSS = f'''
@page {{ size: A4; margin: 16mm 16mm 18mm 16mm; }}
:root {{ --ink:#14181d; --muted:#5b6672; --blue:#2a78d6; --navy:#0b2c57; --orange:#d9480f; --line:#d9dee5; --soft:#f3f6fa; }}
* {{ box-sizing:border-box; }}
body {{ font-family:"Noto Sans","DejaVu Sans",Arial,sans-serif; color:var(--ink); font-size:10.2pt; line-height:1.45; margin:0; }}
section {{ break-inside:auto; }}
.pb {{ break-before:page; }}
h1 {{ font-size:22pt; line-height:1.15; margin:0 0 6mm; color:var(--navy); }}
h1.plain {{ border-bottom:2px solid var(--blue); padding-bottom:3mm; }}
h2 {{ font-size:14pt; color:var(--navy); margin:7mm 0 2.5mm; break-after:avoid; }}
h3 {{ font-size:11.5pt; margin:5mm 0 2mm; break-after:avoid; }}
p {{ margin:0 0 3mm; }}
code {{ font-family:"Noto Sans Mono","DejaVu Sans Mono",monospace; font-size:9pt; background:var(--soft); padding:0 1.2mm; border-radius:1mm; overflow-wrap:anywhere; }}
kbd {{ font-family:inherit; font-size:9pt; border:1px solid #aab3be; border-bottom-width:2px; border-radius:1.2mm; padding:0 1.5mm; background:#fff; }}
pre.code {{ background:var(--soft); border:1px solid var(--line); border-radius:2mm; padding:3mm; font-size:7.2pt; line-height:1.35; white-space:pre; overflow:hidden; font-family:"Noto Sans Mono","DejaVu Sans Mono",monospace; }}
.stephead {{ display:flex; align-items:center; gap:5mm; margin-bottom:6mm; border-bottom:2px solid var(--blue); padding-bottom:3mm; }}
.stephead h1 {{ margin:0; font-size:21pt; }}
.num {{ width:13mm; height:13mm; border-radius:50%; background:var(--navy); color:#fff; font-weight:700; font-size:19pt; display:flex; align-items:center; justify-content:center; flex:none; }}
figure {{ margin:0 0 4mm; break-inside:avoid; }}
figure.center {{ margin-left:auto; margin-right:auto; text-align:center; }}
.shot {{ display:block; max-width:100%; border:1px solid var(--line); border-radius:2mm; }}
figure.center .shot {{ margin:0 auto; }}
figcaption {{ font-size:8.8pt; color:var(--muted); margin-top:1.6mm; line-height:1.35; }}
.cover {{ text-align:left; }}
.cover .brand {{ display:flex; align-items:center; gap:4mm; font-size:17pt; font-weight:600; margin:6mm 0 14mm; }}
.cover .title {{ font-size:36pt; margin-bottom:5mm; }}
.cover .sub {{ font-size:13pt; color:var(--muted); max-width:150mm; margin-bottom:10mm; }}
.coverimg .shot {{ width:100%; }}
.coverimg {{ overflow:hidden; border:1px solid var(--line); border-radius:2mm; margin-bottom:6mm; }}
.coverimg img {{ border:none; border-radius:0; }}
.live {{ font-size:12pt; margin:0 0 2mm; }}
.small {{ font-size:9pt; color:var(--muted); }}
ul.plainlist, ol.steps, ol.check {{ margin:0 0 4mm; padding-left:5mm; }}
ul.plainlist li {{ margin-bottom:1.6mm; }}
ol.steps {{ list-style:none; padding:0; }}
ol.steps li {{ display:flex; gap:3mm; margin-bottom:3mm; align-items:flex-start; break-inside:avoid; }}
ol.steps .n {{ flex:none; min-width:8mm; height:7mm; padding:0 2mm; border-radius:4mm; background:var(--blue); color:#fff; font-weight:700; font-size:9.5pt; display:flex; align-items:center; justify-content:center; margin-top:.4mm; }}
ol.check li {{ margin-bottom:2mm; padding-left:1mm; }}
.side {{ display:flex; gap:6mm; align-items:flex-start; margin:3mm 0 5mm; break-inside:avoid; }}
.side figure {{ flex:none; margin:0; }}
.sidetxt {{ flex:1; padding-top:2mm; }}
ol.legend {{ list-style:none; padding:0; margin:0 0 3mm; }}
div.keep {{ break-inside:avoid; }}
.rowfig {{ display:flex; gap:6mm; align-items:flex-end; }}
ol.legend.cols2 {{ columns:2; column-gap:8mm; }}
ol.legend li {{ display:flex; gap:3mm; margin-bottom:2.6mm; align-items:flex-start; break-inside:avoid; }}
ol.legend .b {{ flex:none; width:6.6mm; height:6.6mm; border-radius:50%; background:var(--orange); color:#fff; font-weight:700; font-size:9.5pt; display:flex; align-items:center; justify-content:center; margin-top:.3mm; }}
.grid {{ display:grid; gap:4mm 5mm; margin:3mm 0 4mm; }}
.grid.c2 {{ grid-template-columns:1fr 1fr; }}
.box {{ border-left:4px solid var(--blue); background:#eef5fd; padding:2.6mm 4mm; border-radius:0 2mm 2mm 0; margin:4mm 0; break-inside:avoid; font-size:10pt; }}
.box.note {{ border-color:#6a7a8c; background:var(--soft); }}
.box.warn {{ border-color:var(--orange); background:#fff1ea; }}
.tbl {{ width:100%; border-collapse:collapse; margin:3mm 0 4mm; font-size:10pt; }}
.tbl th {{ text-align:left; background:var(--navy); color:#fff; padding:2mm 3mm; }}
.tbl td {{ padding:2mm 3mm; border-bottom:1px solid var(--line); vertical-align:top; }}
.tbl.small {{ font-size:9.4pt; }}
.tbl tr {{ break-inside:avoid; }}
ol.toc {{ list-style:none; padding:0; margin:0 0 6mm; counter-reset:t; }}
ol.toc li {{ display:flex; align-items:baseline; gap:2mm; padding:1.6mm 0; font-size:11pt; }}
ol.toc a {{ color:var(--ink); text-decoration:none; }}
ol.toc .dots {{ flex:1; border-bottom:1.5px dotted #aab3be; transform:translateY(-1mm); }}
ol.toc .pg {{ color:var(--navy); font-weight:600; min-width:6mm; text-align:right; }}
ol.five {{ list-style:none; display:grid; grid-template-columns:repeat(5,1fr); gap:3mm; padding:0; margin:3mm 0 5mm; counter-reset:f; }}
ol.five li {{ border:1px solid var(--line); border-radius:2mm; padding:3mm; text-align:center; background:var(--soft); counter-increment:f; }}
ol.five li::before {{ content:counter(f); display:flex; width:7mm; height:7mm; border-radius:50%; background:var(--navy); color:#fff; align-items:center; justify-content:center; font-weight:700; margin:0 auto 2mm; }}
ol.five b {{ display:block; color:var(--navy); }}
ol.five span {{ font-size:8.8pt; color:var(--muted); }}
.galpage .galitem {{ margin-bottom:8mm; break-inside:avoid; }}
.galpage h2 {{ margin-top:0; }}
.galpage .meta {{ font-size:9.4pt; color:var(--ink); margin-bottom:2mm; }}
.galitem figure {{ margin-bottom:0; }}
'''

def doc(pages):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Figure Studio user guide</title><style>{CSS}</style></head><body>{body(pages)}</body></html>'

def render(pages, out):
    open("guide.html", "w").write(doc(pages))
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome"); pg = b.new_page()
        pg.goto(f"file://{D}/guide.html"); pg.wait_for_timeout(1500)
        pg.pdf(path=out, format="A4", print_background=True, prefer_css_page_size=True, display_header_footer=True,
               header_template="<span></span>",
               footer_template='<div style="width:100%;font-size:8px;color:#5b6672;padding:0 16mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>Figure Studio user guide</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
               margin={"top": "16mm", "bottom": "18mm", "left": "16mm", "right": "16mm"})
        b.close()

def find_pages(pdf):
    n = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout).group(1))
    res = {}
    for pno in range(1, n + 1):
        t = subprocess.run(["pdftotext", "-f", str(pno), "-l", str(pno), "-layout", pdf, "-"], capture_output=True, text=True).stdout
        for a, title in TOC:
            title = re.sub(r"^Step \d\. ", "", title)
            if a in res or pno <= 2: continue
            if re.search(r"^\s*(\d\s+)?" + re.escape(title).replace(r"\ ", r"\s+") + r"\s*$", t, re.M): res[a] = pno
    return res, n

if __name__ == "__main__":
    out = "Figure_Studio_Guide.pdf"
    render({}, "pass1.pdf"); pages, n = find_pages("pass1.pdf"); print("pass1 pages", n, pages)
    render(pages, out); pages2, n2 = find_pages(out); print("final pages", n2, pages2, "stable:", pages == pages2)
