// Page engine: mirrors every colour-bearing CSS rule with tone-mapped values.
//
// For each stylesheet it writes an override <style> placed directly after the
// original, containing the same selectors, the same @media/@layer/@supports
// wrappers and the same !important flags. Same specificity plus later source
// order means each override wins exactly where its original won, so the
// page's own cascade decides everything; only the colour values change.
//
// Optional: colours written on elements themselves (style="", SVG fill/stroke,
// legacy bgcolor / <font color>), and per-site fix CSS from sites.js.
//
// Exposed as globalThis.MSEngine. Usable without the extension APIs, which is
// how it is tested: MSEngine.start({ theme: MS_THEMES.sepia, mode: "auto" }).

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
  let done = new WeakMap(); // owner node -> { style, ruleCount, text, fetched }
  const own = {};          // our singleton style elements: base, images, site, filter
  const stats = { sheets: 0, mirrored: 0, fetched: 0, unreadable: 0, bytes: 0, inline: 0, skippedDark: false };

  const head = () => document.head || document.documentElement;
  function ownStyle(key, text, where = "append") {
    let el = own[key];
    if (!el) { el = own[key] = document.createElement("style"); el.setAttribute(ATTR, key); }
    if (el.textContent !== text) el.textContent = text;
    const h = head();
    // tail styles only move when something other than our own styles follows
    // them, so repeated calls cause no DOM churn (and no observer feedback)
    const next = el.nextElementSibling;
    const misplaced = el.parentNode !== h || (where === "prepend" ? h.firstChild !== el : next && !next.hasAttribute(ATTR));
    if (misplaced) h[where](el);
    return el;
  }

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
    rec.style.disabled = !active;
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
      rec.viaFetch = true;
    } catch { rec.failed = true; }
  }

  const owners = () => document.querySelectorAll(`style:not([${ATTR}]), link[rel~="stylesheet"]`);
  function processAll() {
    owners().forEach(processOwner);
    if (own.site) ownStyle("site", own.site.textContent); // keep site fixes last
    if (own.images) ownStyle("images", own.images.textContent);
  }

  // ------------------------------------------------------------ base styles
  // Colours the browser itself supplies (canvas white, black text, link blue,
  // unstyled form controls), in a cascade layer declared before any of the
  // page's own: layered and unlayered page rules both beat it.
  function baseCss() {
    const T = (c) => map.mapLiteral(c);
    return `@layer matlab-sepia-base{:root{background-color:${T("#fff")};color:${T("#000")};scrollbar-color:${T("#c1c1c1")} ${T("#f1f1f1")}${map.invert ? ";color-scheme:dark" : ""}}
:link{color:${T("#0000ee")}}:visited{color:${T("#551a8b")}}
input,textarea,select{background-color:${T("#fff")};color:${T("#000")};border-color:${T("#767676")}}
button,input[type=button],input[type=submit],input[type=reset]{background-color:${T("#efefef")};color:${T("#000")};border-color:${T("#767676")}}
::selection{background-color:${T("#b4d5fe")}}
mark{background-color:${T("#ffff00")};color:${T("#000")}}}`;
  }

  // per-site fixes can use these variables
  function siteCss() {
    if (!opts.siteCss) return "";
    const u = opts.theme.ui || {};
    return `:root{--ms-bg:${opts.theme.bg};--ms-fg:${opts.theme.fg};--ms-bg2:${u.bg2};--ms-line:${u.line};--ms-muted:${u.muted};--ms-accent:${u.sel}}\n${opts.siteCss}`;
  }

  function imagesCss() {
    return opts.dimImages ? `img,video,canvas,picture,svg image{filter:${opts.theme.imageFilter}}` : "";
  }

  // ------------------------------------------------------------ inline colours
  const INLINE_SEL = "[style],[fill],[stroke],[stop-color],[flood-color],[bgcolor],font[color],body[text],body[link],body[vlink],body[alink]";
  const INLINE_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "bgcolor", "color", "text", "link", "vlink", "alink"];
  const STYLE_HINT = /colou?r|background|border|fill|stroke|shadow|outline|--/i;
  let inlineRecs = new Map(); // element -> { style:[orig, mapped], attrs:{ name:[orig, mapped] } }

  const legacyHex = (v) => (/^[0-9a-f]{6}$/i.test(v) ? "#" + v : v);

  function mapElement(el) {
    let rec = inlineRecs.get(el);
    const st = el.getAttribute("style");
    if (st && STYLE_HINT.test(st) && !(rec?.style && st === rec.style[1])) {
      const d = el.style, todo = [];
      for (let i = 0; i < d.length; i++) {
        const p = d[i];
        if (!p.startsWith("--") && !COLOUR_PROP.test(p)) continue;
        const v = d.getPropertyValue(p);
        const nv = v && rewriteValue(map, p, v);
        if (nv && nv !== v) todo.push([p, nv, d.getPropertyPriority(p)]);
      }
      if (todo.length) {
        rec ??= { attrs: {} };
        rec.style = [st, null];
        for (const [p, v, pr] of todo) d.setProperty(p, v, pr);
        rec.style[1] = el.getAttribute("style");
      }
    }
    for (const a of INLINE_ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (a === "color" && el.nodeName !== "FONT" && el.nodeName !== "HR" && !(el instanceof SVGElement)) continue;
      if ((a === "text" || a === "link" || a === "vlink" || a === "alink") && el.nodeName !== "BODY") continue;
      const v = el.getAttribute(a);
      if (rec?.attrs[a] && v === rec.attrs[a][1]) continue;
      const nv = map.mapLiteral(legacyHex(v.trim()));
      if (nv && nv !== v) {
        rec ??= { attrs: {} };
        rec.attrs[a] = [v, nv];
        el.setAttribute(a, nv);
      }
    }
    if (rec) inlineRecs.set(el, rec);
  }

  let inlineQueue = new Set(), inlineScheduled = false;
  function queueInline(el) {
    if (!opts.inline || !active) return;
    inlineQueue.add(el);
    if (!inlineScheduled) {
      inlineScheduled = true;
      requestAnimationFrame(() => {
        inlineScheduled = false;
        const q = inlineQueue; inlineQueue = new Set();
        for (const el of q) if (el.isConnected) mapElement(el);
        stats.inline = inlineRecs.size;
      });
    }
  }
  function scanInline(root = document) {
    if (!opts.inline || !active) return;
    if (root.matches?.(INLINE_SEL)) queueInline(root);
    root.querySelectorAll?.(INLINE_SEL).forEach(queueInline);
  }
  function restoreInline() {
    for (const [el, rec] of inlineRecs) {
      if (!el.isConnected) continue;
      if (rec.style && el.getAttribute("style") === rec.style[1]) el.setAttribute("style", rec.style[0]);
      for (const [a, [o, m]] of Object.entries(rec.attrs)) if (el.getAttribute(a) === m) el.setAttribute(a, o);
    }
    inlineRecs = new Map();
    stats.inline = 0;
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
    const was = active;
    active = on;
    document.querySelectorAll(`style[${ATTR}]`).forEach((s) => { s.disabled = !on; });
    if (on && !was) scanInline();
    if (!on && was) restoreInline();
  }

  let darkCheckTimer = 0;
  function checkDark() {
    if (opts.mode !== "auto") return;
    clearTimeout(darkCheckTimer);
    darkCheckTimer = setTimeout(() => {
      const prev = active;
      document.querySelectorAll(`style[${ATTR}]`).forEach((s) => { s.disabled = true; });
      const dark = pageIsDark();
      document.querySelectorAll(`style[${ATTR}]`).forEach((s) => { s.disabled = !prev; });
      stats.skippedDark = dark;
      setEnabled(!dark);
    }, 60);
  }

  // ------------------------------------------------------------ lifecycle
  let observer, poll;

  function startToneMap() {
    active = true;
    if (!map.identity) ownStyle("base", baseCss(), "prepend");
    ownStyle("images", imagesCss());
    if (opts.siteCss) ownStyle("site", siteCss());
    if (!map.identity) processAll();
    scanInline();

    observer = new MutationObserver((muts) => {
      let sheetsChanged = false, attrs = false;
      for (const m of muts) {
        const t = m.target;
        if (m.type === "attributes") {
          if (t === document.documentElement || t === document.body) attrs = true;
          if (opts.inline && m.attributeName !== "class" && m.attributeName !== "data-theme" && m.attributeName !== "data-mode") queueInline(t);
          continue;
        }
        if (t.nodeName === "STYLE" && !t.hasAttribute(ATTR)) { const r = done.get(t); if (r) r.ruleCount = -1; sheetsChanged = true; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1 || n.hasAttribute(ATTR)) continue;
          if (n.nodeName === "LINK") n.addEventListener("load", () => processOwner(n), { once: true });
          if (n.nodeName === "STYLE" || n.nodeName === "LINK" || n.nodeName === "HEAD" || n.nodeName === "BODY") sheetsChanged = true;
          else if (opts.inline) scanInline(n);
        }
      }
      if (sheetsChanged && !map.identity) { ownStyle("base", baseCss(), "prepend"); processAll(); }
      if (attrs) checkDark();
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ["class", "data-theme", "data-mode", "style", ...(opts.inline ? INLINE_ATTRS : [])],
    });
    // CSS-in-JS libraries add rules with insertRule(), which no observer sees
    if (!map.identity) poll = setInterval(processAll, 1500);
    const ready = () => { if (!map.identity) processAll(); scanInline(); checkDark(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
    else ready();
    window.addEventListener("load", ready, { once: true });
  }

  function startFilter() {
    active = true;
    ownStyle("base", "@layer matlab-sepia-base{:root{background-color:#fff}}", "prepend");
    // media get the inverse of an inverting filter, then the usual dimming
    const media = [map.mediaFilter, opts.dimImages && map.invert ? "brightness(.9)" : ""].filter(Boolean).join(" ");
    ownStyle("filter", `html{filter:${map.filter}!important;min-height:100vh}` +
      (media ? `img,video,picture,canvas,svg image,iframe{filter:${media}!important}` : ""));
    if (opts.siteCss) ownStyle("site", siteCss());
  }

  function stop() {
    observer?.disconnect(); clearInterval(poll); clearTimeout(darkCheckTimer);
    restoreInline();
    document.querySelectorAll(`style[${ATTR}]`).forEach((s) => s.remove());
    for (const k of Object.keys(own)) delete own[k];
    done = new WeakMap();
    active = false;
    stats.skippedDark = false;
  }

  function start(o) {
    stop();
    opts = { mode: "auto", dimImages: true, brightness: 1, inline: false, ...o };
    if (opts.mode === "off") return;
    map = makeToneMap(opts.theme, opts.brightness);
    if (opts.mode === "filter") return startFilter();
    startToneMap();
  }

  function report() {
    let sheets = 0, mirrored = 0, viaFetch = 0, failed = 0, bytes = 0;
    owners().forEach((o) => {
      sheets++;
      const r = done.get(o);
      if (r?.text) { mirrored++; bytes += r.text.length; }
      if (r?.viaFetch) viaFetch++;
      if (r?.failed) failed++;
    });
    const all = document.querySelectorAll("*");
    let shadow = 0;
    all.forEach((e) => { if (e.shadowRoot) shadow++; });
    return {
      url: location.origin + location.pathname,
      theme: opts?.theme?.name, mode: opts?.mode, active, brightness: opts?.brightness,
      skippedAsDark: stats.skippedDark,
      stylesheets: { total: sheets, mirrored, fetchedCrossOrigin: viaFetch, unreadable: failed, overrideKB: Math.round(bytes / 1024) },
      inline: { enabled: !!opts?.inline, mapped: inlineRecs.size, candidates: document.querySelectorAll(INLINE_SEL).length },
      hardToReach: { shadowRoots: shadow, canvases: document.querySelectorAll("canvas").length, iframes: document.querySelectorAll("iframe").length },
      pageBackground: getComputedStyle(document.body || document.documentElement).backgroundColor,
      siteFix: !!opts?.siteCss,
    };
  }

  globalThis.MSEngine = { start, stop, report, get active() { return active; } };
})();
