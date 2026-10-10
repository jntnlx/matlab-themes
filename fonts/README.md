# Fonts

MATLAB's default code font is `Monospaced`, which Java maps to **Courier New** on Windows. That is likely where the attachment comes from.

## What makes Courier New feel the way it does

Measured from the font files (stem = vertical stroke width at mid-height):

| Font | Cell width | x-height | x-height ÷ width | Stem vs Courier New |
|---|---|---|---|---|
| Courier New | 0.600 em | 0.423 | **0.70** | **1.00×** |
| Source Code Pro Light | 0.600 | 0.480 | 0.80 | 1.12× |
| IBM Plex Mono ExtraLight | 0.600 | 0.516 | 0.86 | 0.88× |
| IBM Plex Mono Light | 0.600 | 0.516 | 0.86 | 1.44× |
| Cutive Mono | 0.605 | 0.378 | 0.62 | 1.12× |
| Red Hat Mono Light | 0.600 | 0.481 | 0.80 | 1.25× |
| Monaspace Xenon ExtraLight | 0.620 | 0.500 | 0.81 | 1.50× |
| Iosevka ExtraLight | 0.500 | 0.520 | 1.04 | 1.00× |
| Courier Prime | 0.600 | 0.451 | 0.75 | 1.81× |
| JetBrains Mono ExtraLight | 0.600 | 0.550 | 0.92 | 1.62× |

Two numbers explain the "thin wide" look: hairline stems, and lowercase letters that are short relative to their cell (0.70). Nearly every modern coding font sits at 0.80–1.05, which reads as tall and vertical even at light weights. Courier Prime keeps the proportions but nearly doubles the stems.

## Picks

1. **Source Code Pro Light**: the closest measurements of any mainstream coding font, with good hinting. Sans-serif.
2. **IBM Plex Mono ExtraLight**: you already liked Plex Light; ExtraLight brings its stems down to Courier New's.
3. **Cutive Mono**: the most Courier-like texture, but crude at small sizes.
4. **Iosevka Quill** (custom build, below): Courier's proportions with modern code glyphs.

`specimen/code-font-bench.html` renders all of these at true editor size next to your own Courier New.

## Iosevka Quill

`iosevka-quill/private-build-plans.toml` is a custom Iosevka build set to Courier New's 600-unit cell, slab serifs, a lowered x-height and hairline stems. It has not been built yet. To build it, run the **Build Iosevka Quill** workflow from the Actions tab and download the TTFs from the run page.
