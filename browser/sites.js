// Per-site fixes. The engine handles most sites on its own; entries here are
// for what it can't infer. Matched on the hostname and its parent domains,
// so "github.com" also covers "gist.github.com".
//
//   "example.com": {
//     note:   "why this entry exists",
//     mode:   "auto" | "on" | "filter" | "off",  // default mode for the site
//     inline: true,                              // also map style="" / SVG fill colours
//     css:    "...",                             // fix CSS for every theme
//     themes: { light: "...", sepia: "...", dark: "..." },  // per-theme fix CSS
//   }
//
// Fix CSS is appended last, unlayered, and can use the theme variables
// --ms-bg --ms-fg --ms-bg2 --ms-line --ms-muted --ms-accent.
//
// To report a mismatch: open the popup on the page, click "Copy site report",
// and paste it to Claude along with a screenshot.

globalThis.MS_SITES = {
  "docs.google.com": {
    note: "Docs and Sheets draw the document on a canvas the tone map can't reach.",
    mode: "filter",
  },
};

globalThis.MS_siteFor = (host) => {
  for (let h = host; h; h = h.includes(".") ? h.slice(h.indexOf(".") + 1) : "") {
    if (MS_SITES[h]) return MS_SITES[h];
  }
  return null;
};
