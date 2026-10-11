// Colour parsing and the sepia tone map.
//
// The tone map works in OKLab and is monotonic in lightness, so whatever
// was lighter stays lighter. That is why it needs no knowledge of which
// colours are backgrounds and which are text (the guess Dark Reader's
// dynamic mode has to make, and gets wrong on modern CSS).
//
//   L' = c + k·L        white -> palette bg, near-black text (L 0.2) -> palette fg
//   ab' = ab·SAT + tint·(L'/L_bg)   hue kept, chroma eased, sepia cast added
//
// Exposed as globalThis.MSColour.

(() => {
  "use strict";

  // ---------------------------------------------------------------- OKLab
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

  function rgbToOklab([r, g, b]) {
    r = toLin(r); g = toLin(g); b = toLin(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }

  function oklabToRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => toSrgb(Math.max(0, c)));
  }

  const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));

  // keep lightness and hue, reduce chroma until the colour fits sRGB
  function fromOklabClipped(L, a, b) {
    let rgb = oklabToRgb([L, a, b]);
    if (inGamut(rgb)) return rgb.map(clamp01);
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklabToRgb([L, a * mid, b * mid]))) lo = mid; else hi = mid;
    }
    return oklabToRgb([L, a * lo, b * lo]).map(clamp01);
  }

  // ---------------------------------------------------------------- parsing
  const NAMED = {aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkgrey:"a9a9a9",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkslategrey:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dimgrey:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",grey:"808080",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgray:"d3d3d3",lightgreen:"90ee90",lightgrey:"d3d3d3",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"778899",lightslategrey:"778899",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"00ff00",limegreen:"32cd32",linen:"faf0e6",magenta:"ff00ff",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370db",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"db7093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",rebeccapurple:"663399",red:"ff0000",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",slategrey:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"ffffff",whitesmoke:"f5f5f5",yellow:"ffff00",yellowgreen:"9acd32"};

  const num = (s, pctScale = 1) => (s.endsWith("%") ? (parseFloat(s) / 100) * pctScale : parseFloat(s));
  const alphaOf = (s) => (s == null ? 1 : num(s, 1));

  function hueDeg(s) {
    const v = parseFloat(s);
    if (s.endsWith("turn")) return v * 360;
    if (s.endsWith("rad")) return (v * 180) / Math.PI;
    if (s.endsWith("grad")) return v * 0.9;
    return v;
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)];
  }

  function rgbToHsl([r, g, b]) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [(h + 360) % 360, s, l];
  }

  // split "a b c / d" or "a, b, c, d" into components
  function parts(inner) {
    if (inner.includes(",")) {
      const p = inner.split(",").map((x) => x.trim());
      return { c: p.slice(0, 3), a: p[3] };
    }
    const [main, a] = inner.split("/").map((x) => x.trim());
    return { c: main.split(/\s+/), a };
  }

  // -> { rgb: [0..1]×3, a } or null
  function parse(str) {
    const s = str.trim().toLowerCase();
    if (s[0] === "#") {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join("");
      if (h.length !== 6 && h.length !== 8) return null;
      const v = [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2) || "ff", 16) / 255);
      return v.some(Number.isNaN) ? null : { rgb: v.slice(0, 3), a: v[3] };
    }
    if (NAMED[s]) return parse("#" + NAMED[s]);
    const m = s.match(/^(rgba?|hsla?|oklch|oklab)\((.*)\)$/);
    if (!m || /none|var\(|calc\(|from /.test(m[2])) return null;
    const { c, a } = parts(m[2]);
    if (c.length < 3) return null;
    const fn = m[1];
    if (fn.startsWith("rgb")) return { rgb: c.map((x) => num(x, 255) / 255), a: alphaOf(a) };
    if (fn.startsWith("hsl")) return { rgb: hslToRgb(hueDeg(c[0]), num(c[1].replace(/%?$/, "%")), num(c[2].replace(/%?$/, "%"))), a: alphaOf(a) };
    const L = num(c[0]);
    if (fn === "oklab") return { rgb: oklabToRgb([L, num(c[1], 0.4), num(c[2], 0.4)]).map(clamp01), a: alphaOf(a), wide: true };
    const C = num(c[1], 0.4), H = (hueDeg(c[2]) * Math.PI) / 180;
    return { rgb: oklabToRgb([L, C * Math.cos(H), C * Math.sin(H)]).map(clamp01), a: alphaOf(a) };
  }

  const hex2 = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  const toHex = (rgb, a = 1) => "#" + rgb.map(hex2).join("") + (a < 1 ? hex2(a) : "");
  const r4 = (x) => +x.toFixed(4);

  // ---------------------------------------------------------------- tone map
  function makeToneMap(pal) {
    const [bgL, bgA, bgB] = rgbToOklab(parse(pal.bg).rgb);
    const [fgL] = rgbToOklab(parse(pal.fg).rgb);
    const REF_TEXT_L = 0.2; // typical UI "black" (#111..#1c1c1c)
    const k = (bgL - fgL) / (1 - REF_TEXT_L);
    const c = bgL - k;
    const SAT = pal.saturation ?? 0.85;
    const cache = new Map();

    function mapRgb(rgb) {
      const key = rgb.join(",");
      let out = cache.get(key);
      if (!out) {
        const [L, a, b] = rgbToOklab(rgb);
        const L2 = c + k * L;
        const w = Math.max(0, L2 / bgL);
        out = fromOklabClipped(L2, a * SAT + bgA * w, b * SAT + bgB * w);
        cache.set(key, out);
      }
      return out;
    }

    // CSS colour literal -> mapped literal (hex), or null if not a colour
    function mapLiteral(str) {
      const p = parse(str);
      if (!p) return null;
      return toHex(mapRgb(p.rgb), p.a ?? 1);
    }

    // bare "H S% L%" components (Tailwind / shadcn style tokens)
    const HSL_COMPS = /^\s*(-?[\d.]+)(deg)?\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+%?))?\s*$/;
    // bare "R G B" components, only for colour-named custom properties
    const RGB_COMPS = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/;
    const COLOURISH = /colou?r|bg|background|text|fg|foreground|border|surface|accent|primary|secondary|tertiary|muted|ink|paper|neutral|gr[ae]y|white|black|red|green|blue|yellow|orange|purple|violet|pink|brand|canvas|card|popover|ring|input|highlight/i;
    const NOT_COLOUR = /shadow-(?:offset|size|blur|spread)|offset|size|space|inset|radius|blur|width|height|z-?index|duration|delay|font|line|grid|gap|weight|opacity/i;

    function mapComponents(name, value) {
      let m = value.match(HSL_COMPS);
      if (m) {
        const rgb = mapRgb(hslToRgb(+m[1], +m[3] / 100, +m[4] / 100));
        const [h, s, l] = rgbToHsl(rgb);
        return `${r4(h)} ${r4(s * 100)}% ${r4(l * 100)}%` + (m[5] ? ` / ${m[5]}` : "");
      }
      m = value.match(RGB_COMPS);
      if (m && COLOURISH.test(name) && !NOT_COLOUR.test(name) && m.slice(1, 4).every((x) => +x <= 255)) {
        return mapRgb(m.slice(1, 4).map((x) => +x / 255)).map((x) => Math.round(x * 255)).join(" ");
      }
      return null;
    }

    // filter() fallback with the same white point: brightness(b) sepia(s)
    // sepia row sums are R 1+.351s, G 1+.203s, B 1-.063s
    const bgRgb = parse(pal.bg).rgb;
    const ratio = bgRgb[2] / bgRgb[0];
    const sep = clamp01((1 - ratio) / (0.063 + 0.351 * ratio));
    const bri = bgRgb[0] / (1 + 0.351 * sep);
    const filter = `brightness(${r4(bri)}) sepia(${r4(sep)})`;

    return { mapRgb, mapLiteral, mapComponents, filter, toHex };
  }

  // ---------------------------------------------------------------- value rewriting
  const NAMES = Object.keys(NAMED).sort((a, b) => b.length - a.length).join("|");
  // url() and quoted strings are matched first so colours inside them are left alone
  const TOKEN_RE = new RegExp(
    String.raw`url\([^)]*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab)\([^()]*\)|(?<![\w-])(?:${NAMES})(?![\w-]))`,
    "gi"
  );

  function rewriteValue(map, name, value) {
    if (name.startsWith("--")) {
      const comps = map.mapComponents(name, value);
      if (comps) return comps;
    }
    return value.replace(TOKEN_RE, (m, col) => (col ? map.mapLiteral(col) ?? m : m));
  }

  globalThis.MSColour = { makeToneMap, rewriteValue, parse, rgbToOklab, toHex };
})();
