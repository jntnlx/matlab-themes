import json, html, sys
sys.path.insert(0,'.')
from sample import MATLAB, PYTHON
def load(f): return json.load(open(f'../themes/{f}'))
def tok(t):
    c=t['colors']; r={x['name']:x['settings'].get('foreground') for x in t['tokenColors']}
    return dict(k=r['Keywords'],c=r['Comments'],s=r['Strings'],i=r['Unterminated strings / invalid'],d=r['Python docstrings as MATLAB help text'],n=c['editor.foreground'])
def panel(f, font, size=12, lh=15, current=6, sel=(9,10,24)):
    t=load(f); c=t['colors']; T=tok(t)
    rows=[]
    lines=MATLAB+[[("n","")]]+PYTHON
    for i,l in enumerate(lines,1):
        spans=''.join(f'<span style="color:{T[k]}">{html.escape(x)}</span>' for k,x in l)
        bg=c['editor.lineHighlightBackground'] if i==current else 'transparent'
        if i==sel[0]:
            # selection over a slice of text
            txt=''.join(x for _,x in l); a,b=sel[1],sel[2]
            spans=f'<span style="color:{T["n"]}">{html.escape(txt[:a])}</span><span style="background:{c["editor.selectionBackground"]};color:{T["n"]}">{html.escape(txt[a:b])}</span><span style="color:{T["n"]}">{html.escape(txt[b:])}</span>'
        num_c=c['editorLineNumber.activeForeground'] if i==current else c['editorLineNumber.foreground']
        rows.append(f'<div class=r style="background:{bg}"><span class=ln style="color:{num_c}">{i}</span>{spans or "&nbsp;"}</div>')
    tree=''.join(f'<div style="padding:2px 10px 2px {12+d*12}px;{st}">{n}</div>' for n,d,st in [("matlab-themes",0,"font-weight:600"),("palettes.mjs",1,""),(f"fitDamped.m",1,f"background:{c['list.activeSelectionBackground']};color:{c['list.activeSelectionForeground']}"),("fit_damped.py",1,f"color:{c['gitDecoration.modifiedResourceForeground']}"),("new_test.py",1,f"color:{c['gitDecoration.untrackedResourceForeground']}")])
    return f'''<div class=win style="background:{c['editor.background']};border:1px solid {c['editorGroup.border']}">
 <div class=title style="background:{c['titleBar.activeBackground']};color:{c['titleBar.activeForeground']};border-bottom:1px solid {c['titleBar.border']}">{t['name']}</div>
 <div class=body>
  <div class=side style="background:{c['sideBar.background']};color:{c['sideBar.foreground']};border-right:1px solid {c['sideBar.border']}">
   <div style="padding:6px 10px;background:{c['sideBarSectionHeader.background']};font-weight:600;font-size:11px">EXPLORER</div>{tree}</div>
  <div class=main>
   <div class=tabs style="background:{c['editorGroupHeader.tabsBackground']};border-bottom:1px solid {c['editorGroupHeader.tabsBorder']}">
    <span class=tab style="background:{c['tab.activeBackground']};color:{c['tab.activeForeground']};border-right:1px solid {c['tab.border']}">fitDamped.m</span><span class=tab style="background:{c['tab.inactiveBackground']};color:{c['tab.inactiveForeground']};border-right:1px solid {c['tab.border']}">fit_damped.py</span></div>
   <div class=code style="font-family:{font};font-size:{size}px;line-height:{lh}px;background:{c['editor.background']}">{''.join(rows)}</div>
  </div></div>
 <div class=status style="background:{c['statusBar.background']};color:{c['statusBar.foreground']};border-top:1px solid {c['statusBar.border']}">Ln 6, Col 12 &nbsp; UTF-8 &nbsp; MATLAB <span style="float:right;background:{c['statusBarItem.remoteBackground']};color:{c['statusBarItem.remoteForeground']};padding:0 8px">main</span></div>
</div>'''
CSS='''body{margin:0;padding:16px;background:#7a7a7a;font-family:"Segoe UI",system-ui,sans-serif;font-size:12px}
.win{width:660px;margin:0 0 16px 0;display:inline-block;vertical-align:top;margin-right:16px}.title{padding:5px 10px;font-size:12px}
.body{display:flex}.side{width:150px;font-size:12px}.main{flex:1}.tab{display:inline-block;padding:6px 12px}
.code{padding:8px 0;white-space:pre}.r{padding-right:8px}.ln{display:inline-block;width:34px;text-align:right;margin-right:14px}.status{padding:3px 10px;font-size:11px}'''
FONT="'Courier New', monospace"
FACE=""  # uses the system Courier New
open('themes.html','w').write(f'<html><head><style>{FACE}{CSS}</style></head><body>'+''.join(panel(f,FONT) for f in ['matlab-light-color-theme.json','matlab-sepia-color-theme.json','matlab-sepia-dark-color-theme.json'])+'</body></html>')
