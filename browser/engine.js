// Page engine: mirrors every colour-bearing CSS rule with tone-mapped values.
//
// For each stylesheet it writes an override <style> placed directly after the
// original, containing the same selectors, the same @media/@layer/@supports
// wrappers and the same !important flags. Same specificity plus later source
// order means each override wins exactly where its original won, so the
// page's own cascade decides everything; only the colour values change.
//
// Exposed as globalThis.MSEngine. Usable without the extension APIs, which is
// how it is tested: MSEngine.start({ palette, mode: "auto" }).

(() => {
  "use strict";
  const { makeToneMap, rewriteValue, parse, rgbToOklab } = globalThis.MSColour;

  const ATTR = "data-matlab-sepia";
  const COLOUR_PROP = /^(color|background-color|background-image|border(-[a-z]+)*-color|border-image-source|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration-color|text-emphasis-color|column-rule-color|accent-color|stop-color|flood-color|lighting-color|scrollbar-color|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-tap-highlight-color)$/;
  // shorthands whose longhands read back empty when the shorthand uses var()
  const SHORTHANDS = ["background", "border", "border-color", "border-top", "border-right", "border-bottom", "border-left", "border-block", "border-block-start", "border-block-end", "border-inline", "border-inline-start", "border-inline-end", "outline", "text-decoration", "column-rule"];

  let map = null;
  let opts = null;
  let active = false;
  const done = new WeakMap(); // owner node / sheet -> { style, ruleCount, text }
  let baseStyle, imgStyle, filterStyle;

  // ------------------------------------------------------------ CSS mirroring
  const absolutise = (v, base) =>
    !base || !v.includes("url(") ? v
      : v.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
          try { return `url("${new URL(u, base).href}")`; } catch { return m; }
        });

  function styleDecls(style, base) {
    const out = [];
    let colourish = false;
    const emptyLonghand = [];
    for (let i = 0; i < style.length; i++) {
      const p = style[i];
      const custom = p.startsWith("--");
      if (!custom && !COLOUR_PROP.test(p)) continue;
      const v = style.getPropertyValue(p);
      if (!v) { emptyLonghand.push(p); continue; }
      if (!custom) colourish = true;
      const nv = absolutise(rewriteValue(map, p, v.trim()), base);
      if (custom && nv !== v.trim()) colourish = true;
      out.push(`${p}:${nv}${style.getPropertyPriority(p) ? " !important" : ""}`);
    }
    if (emptyLonghand.length) {
      for (const sh of SHORTHANDS) {
        const v = style.getPropertyValue(sh);
        if (v && emptyLonghand.some((p) => p.startsWith(sh.replace(/-color$/, "")))) {
          colourish = true;
          out.push(`${sh}:${absolutise(rewriteValue(map, sh, v), base)}${style.getPropertyPriority(sh) ? " !important" : ""}`);
        }
      }
    }
    return colourish ? out.join(";") : "";
  }

  function walk(rules, base) {
    let out = "";
    for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        const decls = styleDecls(r.style, base);
        const nested = r.cssRules && r.cssRules.length ? walk(r.cssRules, base) : "";
        if (decls || nested) out += `${r.selectorText}{${decls}${decls && nested ? ";" : ""}${nested}}`;
      } else if (r instanceof CSSImportRule) {
        let inner = "";
        try { inner = r.styleSheet ? walk(r.styleSheet.cssRules, r.styleSheet.href || base) : ""; } catch { /* cross-origin import */ }
        if (!inner) continue;
        if (r.media && r.media.mediaText) inner = `@media ${r.media.mediaText}{${inner}}`;
        if (r.supportsText) inner = `@supports ${r.supportsText}{${inner}}`;
        if (r.layerName != null) inner = `@layer ${r.layerName}{${inner}}`;
        out += inner;
      } else if (typeof CSSPropertyRule !== "undefined" && r instanceof CSSPropertyRule) {
        if (r.initialValue) {
          const nv = rewriteValue(map, r.name, r.initialValue);
          if (nv !== r.initialValue) out += `@property ${r.name}{syntax:${JSON.stringify(r.syntax)};inherits:${r.inherits};initial-value:${nv}}`;
        }
      } else if (r.cssRules && !(r instanceof CSSKeyframesRule)) {
        // @media @supports @layer @container @scope @starting-style ...
        const inner = walk(r.cssRules, base);
        if (inner) out += r.cssText.slice(0, r.cssText.indexOf("{")).trim() + `{${inner}}`;
      }
    }
    return out;
  }

  // ------------------------------------------------------------ sheet handling
  function overrideFor(owner) {
    let rec = done.get(owner);
    if (!rec) {
      const style = document.createElement("style");
      style.setAttribute(ATTR, "override");
      rec = { style, ruleCount: -1, text: null };
      done.set(owner, rec);
    }
    if (owner.media) rec.style.media = owner.media;
    if (rec.style.previousSibling !== owner) owner.after(rec.style);
    return rec;
  }

  function writeOverride(owner, sheet, base) {
    let rules;
    try { rules = sheet.cssRules; } catch { return false; }
    const rec = overrideFor(owner);
    if (rec.ruleCount === rules.length && rec.text !== null) return true;
    rec.ruleCount = rules.length;
    const text = walk(rules, base);
    if (text !== rec.text) { rec.text = text; rec.style.textContent = text; }
    return true;
  }

  async function processOwner(owner) {
    if (owner.hasAttribute(ATTR)) return;
    const sheet = owner.sheet;
    if (!sheet || sheet.disabled) return;
    const base = sheet.href || document.baseURI;
    if (writeOverride(owner, sheet, base)) return;
    // cross-origin sheet: fetch its text (through the extension, which has
    // host permissions) and read it via a constructed sheet
    const rec = overrideFor(owner);
    if (rec.fetched || !opts.fetchCss) return;
    rec.fetched = true;
    try {
      const text = await opts.fetchCss(sheet.href);
      const cs = new CSSStyleSheet();
      cs.replaceSync(text.replace(/@import[^;]+;/g, ""));
      rec.ruleCount = -1;
      writeOverride(owner, cs, sheet.href);
    } catch { /* leave unthemed */ }
  }

  const owners = () => document.querySelectorAll(`style:not([${ATTR}]), link[rel~="stylesheet"]`);

  function processAll() { owners().forEach(processOwner); }

  // ------------------------------------------------------------ base styles
  // colours the browser itself supplies (canvas white, black text, link blue,
  // unstyled form controls). Inserted first so any page rule beats them.
  // Wrapped in a cascade layer declared before any of the page's own: layered
  // and unlayered page rules both beat it, whatever their specificity.
  function baseCss() {
    const T = (c) => map.mapLiteral(c);
    return `@layer matlab-sepia-base{:root{background-color:${T("#fff")};color:${T("#000")};scrollbar-color:${T("#c1c1c1")} ${T("#f1f1f1")}}
:link{color:${T("#0000ee")}}:visited{color:${T("#551a8b")}}
input,textarea,select{background-color:${T("#fff")};color:${T("#000")};border-color:${T("#767676")}}
button,input[type=button],input[type=submit],input[type=reset]{background-color:${T("#efefef")};color:${T("#000")};border-color:${T("#767676")}}
::selection{background-color:${T("#b4d5fe")}}
mark{background-color:${T("#ffff00")};color:${T("#000")}}}`;
  }

  function ensureBase() {
    baseStyle ??= Object.assign(document.createElement("style"), { textContent: baseCss() });
    baseStyle.setAttribute(ATTR, "base");
    const head = document.head || document.documentElement;
    if (baseStyle.parentNode !== head || head.firstChild !== baseStyle) head.prepend(baseStyle);

    imgStyle ??= document.createElement("style");
    imgStyle.setAttribute(ATTR, "images");
    imgStyle.textContent = opts.dimImages ? `img,video,canvas,picture,svg image{filter:${opts.imageFilter}}` : "";
    if (!imgStyle.isConnected) (document.head || document.documentElement).append(imgStyle);
  }

  // ------------------------------------------------------------ dark pages
  function pageIsDark() {
    const pick = (el) => el && getComputedStyle(el).backgroundColor;
    for (const c of [pick(document.body), pick(document.documentElement)]) {
      const p = c && parse(c);
      if (p && (p.a ?? 1) > 0.5) return rgbToOklab(p.rgb)[0] < 0.5;
    }
    return false;
  }

  function setEnabled(on) {
    active = on;
    document.querySelectorAll(`style[${ATTR}]`).forEach((s) => {
      if (s === filterStyle) return;
      s.disabled = !on;
    });
  }

  let darkCheckTimer = 0;
  function checkDark() {
    if (opts.mode !== "auto") return;
    clearTimeout(darkCheckTimer);
    darkCheckTimer = setTimeout(() => {
      setEnabled(false);
      const dark = pageIsDark();
      setEnabled(!dark);
    }, 60);
  }

  // ------------------------------------------------------------ lifecycle
  let observer, poll;

  function startToneMap() {
    ensureBase();
    processAll();
    observer = new MutationObserver((muts) => {
      let sheetsChanged = false, attrs = false;
      for (const m of muts) {
        if (m.type === "attributes") { attrs = true; continue; }
        const t = m.target;
        if (t.nodeName === "STYLE" && !t.hasAttribute(ATTR)) { const r = done.get(t); if (r) r.ruleCount = -1; sheetsChanged = true; }
        for (const n of m.addedNodes) {
          if (n.nodeName === "LINK") n.addEventListener("load", () => processOwner(n), { once: true });
          if (n.nodeName === "STYLE" || n.nodeName === "LINK" || n.nodeName === "HEAD" || n.nodeName === "BODY") sheetsChanged = true;
        }
      }
      if (sheetsChanged) { ensureBase(); processAll(); }
      if (attrs) checkDark();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "data-theme", "data-mode", "style"] });
    // CSS-in-JS libraries add rules with insertRule(), which no observer sees
    poll = setInterval(processAll, 1500);
    const ready = () => { processAll(); checkDark(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
    else ready();
    window.addEventListener("load", ready, { once: true });
  }

  function startFilter() {
    filterStyle ??= document.createElement("style");
    filterStyle.setAttribute(ATTR, "filter");
    filterStyle.textContent = `html{filter:${map.filter}!important;min-height:100vh}`;
    (document.head || document.documentElement).append(filterStyle);
    // pages without their own background would show unfiltered canvas white
    baseStyle ??= Object.assign(document.createElement("style"), { textContent: "@layer matlab-sepia-base{:root{background-color:#fff}}" });
    baseStyle.setAttribute(ATTR, "base");
    (document.head || document.documentElement).prepend(baseStyle);
  }

  function stop() {
    observer?.disconnect(); clearInterval(poll);
    document.querySelectorAll(`style[${ATTR}]`).forEach((s) => s.remove());
    baseStyle = imgStyle = filterStyle = null;
    active = false;
  }

  function start(o) {
    stop();
    opts = { mode: "auto", dimImages: true, imageFilter: "brightness(.86) sepia(.12)", ...o };
    if (opts.mode === "off") return;
    map = makeToneMap(opts.palette);
    if (opts.mode === "filter") return startFilter();
    startToneMap();
    if (opts.mode === "on") setEnabled(true);
  }

  globalThis.MSEngine = { start, stop, get active() { return active; }, _walk: (r) => walk(r, document.baseURI) };
})();
