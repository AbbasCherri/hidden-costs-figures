"""Make a copy of the study workbook that opens on the Graph_Maker tab with its table selected.
Only the view settings change; the original file is never touched.
Usage: python3 patch_workbook_view.py <original.xlsx> <copy.xlsx>"""
import sys, zipfile
src, dst = sys.argv[1:3]
zi = zipfile.ZipFile(src); zo = zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED)
for item in zi.infolist():
    data = zi.read(item.filename)
    if item.filename == "xl/workbook.xml":
        data = data.decode().replace("<sheets>", '<bookViews><workbookView activeTab="6" firstSheet="2"/></bookViews><sheets>', 1).encode()
    elif item.filename == "xl/worksheets/sheet1.xml":
        data = data.decode().replace('tabSelected="1"', 'tabSelected="0"', 1).encode()
    elif item.filename == "xl/worksheets/sheet7.xml":
        t = data.decode().replace('tabSelected="0"', 'tabSelected="1"', 1).replace('activePane="bottomLeft"', 'activePane="topLeft"', 1)
        t = t.replace('<selection pane="bottomLeft" activeCell="A1" sqref="A1"/>',
                      '<selection pane="topLeft" activeCell="A18" sqref="A18:J23"/><selection pane="bottomLeft" activeCell="A19" sqref="A18:J23"/>', 1)
        data = t.encode()
    zo.writestr(item, data)
zo.close()
