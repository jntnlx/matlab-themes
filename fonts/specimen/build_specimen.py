"""Builds code-font-bench.html: a 1:1 specimen of thin, wide monospace candidates.
Fonts are embedded as latin-subset WOFF2 data URIs; Courier New comes from the
viewer's own system so it renders exactly as in the editor."""
import base64, json, sys, html
WOFF, METRICS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
M = json.load(open(METRICS))
THEMES = {k: json.load(open(f'/home/claude/matlab-themes/themes/{f}')) for k, f in
          [('light', 'matlab-light-color-theme.json'), ('sepia', 'matlab-sepia-color-theme.json'), ('dark', 'matlab-sepia-dark-color-theme.json')]}

# key, label, metrics key, woff file (None = system), group, VS Code setting, where to get it, note
FONTS = [
 ("cn","Courier New","Courier New",None,"ref","'Courier New'","Ships with Windows",
  "The reference. Hairline stems, a small x-height in a wide cell, Windows TrueType hinting that snaps strokes to whole pixels."),
 ("scp3","Source Code Pro Light","Source Code Pro 300","source-code-pro-300","pick","'Source Code Pro Light'","Google Fonts / Adobe, free",
  "Closest numbers of any modern coding font: stems 1.12× Courier New, an x-height that still leaves air in the cell. Sans, but quiet."),
 ("plex2","IBM Plex Mono ExtraLight","IBM Plex Mono 200","ibm-plex-mono-200","pick","'IBM Plex Mono ExtraLight'","Google Fonts / IBM, free",
  "One weight lighter than the Light you liked. Stems slightly thinner than Courier New, with Plex's slab-tipped i, l, r and j."),
 ("cutive","Cutive Mono","Cutive Mono","cutive-mono-400","pick","'Cutive Mono'","Google Fonts, free",
  "A typewriter face after the IBM Selectric Courier. The lowest x-height here and thin even strokes; the most Courier-like texture, the least polished at small sizes."),
 ("rhm3","Red Hat Mono Light","Red Hat Mono 300","red-hat-mono-300","more","'Red Hat Mono Light'","Google Fonts, free",
  "Similar proportions to Source Code Pro, slightly rounder and a touch heavier."),
 ("scp2","Source Code Pro ExtraLight","Source Code Pro 200","source-code-pro-200","more","'Source Code Pro ExtraLight'","Google Fonts / Adobe, free",
  "Thinner than Courier New. Can go grey at 12px on a dim background; try it on Sepia before committing."),
 ("plex3","IBM Plex Mono Light","IBM Plex Mono 300","ibm-plex-mono-300","more","'IBM Plex Mono Light'","Google Fonts / IBM, free",
  "Your current near-miss, for reference."),
 ("xenon2","Monaspace Xenon ExtraLight","Monaspace Xenon 200","monaspace-xenon-200","more","'Monaspace Xenon Var'  +  \"editor.fontVariations\": \"'wght' 200, 'wdth' 112\"","GitHub Next, free",
  "Slab serifs throughout. The variable version has a width axis, so it can be set wider than shown here, which no other candidate allows."),
 ("lm","Latin Modern Mono Light","Latin Modern Mono Light","lmmonolight","more","'Latin Modern Mono Light'","GUST (TeX), free",
  "The TeX typewriter face, light cut. Courier's spirit with finer detail, but a narrower cell."),
 ("iosevka2","Iosevka ExtraLight","Iosevka 200","iosevka-200","more","'Iosevka Slab Extended' + \"editor.fontWeight\": \"200\"","GitHub, free",
  "Shown at its default narrow width. The Slab Extended build has Courier's 0.6 em cell and slab serifs at the same stem weight."),
 ("gyre","TeX Gyre Cursor","TeX Gyre Cursor","texgyrecursor","clone","'TeX Gyre Cursor'","GUST (TeX), free",
  "A free redraw of Courier with identical metrics. Useful on macOS and Linux; on Windows, Courier New's hinting is better."),
 ("free","GNU FreeMono","FreeMono","freemono","clone","FreeMono","GNU FreeFont, free",
  "Another Courier redraw, the same proportions as TeX Gyre Cursor."),
 ("prime","Courier Prime","Courier Prime","courier-prime-400","heavy","'Courier Prime'","Google Fonts, free",
  "For comparison: Courier's shapes at nearly twice the stem weight. This is the vertical heaviness you noticed."),
 ("plex4","IBM Plex Mono","IBM Plex Mono 400","ibm-plex-mono-400","heavy","'IBM Plex Mono'","Google Fonts / IBM, free",
  "For comparison: Plex at Regular."),
 ("jb2","JetBrains Mono ExtraLight","JetBrains Mono 200","jetbrains-mono-200","heavy","'JetBrains Mono ExtraLight'","JetBrains, free",
  "For comparison: a typical modern coding font. Even at ExtraLight its tall x-height makes it read vertical."),
]
GROUPS = [("ref","Reference"),("pick","Closest in feel"),("more","Also worth a look"),("clone","Courier redraws"),("heavy","Heavier, for contrast")]
ref = M['Courier New']

faces = []
for key, label, mk, woff, *_ in FONTS:
    if woff:
        b = base64.b64encode(open(f'{WOFF}/{woff}.woff2','rb').read()).decode()
        faces.append(f"@font-face{{font-family:'b-{key}';src:url(data:font/woff2;base64,{b}) format('woff2');font-display:block}}")
faces.append("@font-face{font-family:'b-cn';src:local('Courier New'),local('CourierNewPSMT')}")

def theme_tokens(t):
    c = t['colors']; r = {x['name']: x['settings'].get('foreground') for x in t['tokenColors']}
    return dict(bg=c['editor.background'], fg=c['editor.foreground'], ln=c['editorLineNumber.foreground'],
                k=r['Keywords'], c=r['Comments'], s=r['Strings'], i=r['Unterminated strings / invalid'], d=r['Python docstrings as MATLAB help text'],
                cur=c['editor.lineHighlightBackground'])
TT = {k: theme_tokens(v) for k, v in THEMES.items()}

sys.path.insert(0, '/home/claude/matlab-themes/preview')
from sample import MATLAB, PYTHON
def code_html(lines):
    out = []
    for n, l in enumerate(lines, 1):
        out.append(f'<span class="ln">{n}</span>' + ''.join(f'<span class="t-{k}">{html.escape(x)}</span>' for k, x in l))
    return '\n'.join(out)
SAMPLES = {'matlab': code_html(MATLAB[:10]), 'python': code_html(PYTHON)}

def bar(v, maxv, mark):
    return (f'<span class="bar"><span class="fill" style="width:{min(v/maxv,1)*100:.1f}%"></span>'
            f'<span class="mark" style="left:{mark/maxv*100:.1f}%"></span></span>')

cards = []
for gkey, gname in GROUPS:
    items = [f for f in FONTS if f[4] == gkey]
    cards.append(f'<h2 class="group">{gname}</h2>')
    for key, label, mk, woff, g, setting, src, note in items:
        m = M[mk]; stem = m['stem']/ref['stem']; xa = m['xh']/m['adv']
        cards.append(f'''<article class="font{' is-ref' if g=='ref' else ''}" data-key="{key}">
 <div class="meta">
  <h3>{label}</h3>
  <p class="note">{note}</p>
  <dl class="nums">
   <div><dt>Stem weight</dt><dd><span class="v">{stem:.2f}×</span>{bar(stem,2.2,1)}</dd></div>
   <div><dt>x-height ÷ width</dt><dd><span class="v">{xa:.2f}</span>{bar(xa,1.1,ref['xh']/ref['adv'])}</dd></div>
   <div><dt>Cell width</dt><dd>{m['adv']:.3f} em</dd></div>
  </dl>
  <p class="src">{src}</p>
  <code class="setting">{html.escape(setting)}</code>
 </div>
 <div class="specimen" style="font-family:'b-{key}',monospace"><pre class="code"></pre><pre class="code cnref" hidden style="font-family:'b-cn',monospace"></pre></div>
</article>''')

page = open('/home/claude/matlab-themes/fonts/specimen/template.html').read()
page = (page.replace('/*FACES*/', '\n'.join(faces))
            .replace('<!--CARDS-->', '\n'.join(cards))
            .replace('/*DATA*/', 'const THEMES=' + json.dumps(TT) + ';const SAMPLES=' + json.dumps(SAMPLES) + ';'))
open(OUT, 'w').write(page)
print(OUT, len(page)//1024, 'KB')
