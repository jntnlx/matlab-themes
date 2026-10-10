// The three palettes. Every colour in themes/*.json is derived from these.
// Edit here, then `npm run build`.
//
// Shared role names (all required):
//   surfaces  input bg widget bg1 bg2 bg3 border borderStrong guide guideActive
//   text      fg fgUI fgMuted fgFaint
//   UI        listSel listSelInactive hover selection find occurrence focus button onButton
//   syntax    keyword comment string invalid
//   extras    warn info cyan gold
//
// Optional:
//   md        { heading, emphasis, quote, link }  Markdown token colours
//   overrides { "<workbench key>": "#hex" }       applied last, verbatim

// ---------------------------------------------------------------------------
// MATLAB Light: daytime match for a MATLAB window on the side.
//
// Syntax, current-line, variable-highlight, text-limit-line, Code Analyzer
// and Markdown colours are MATLAB's documented defaults (matlab.colors,
// matlab.editor and matlab.colors.programmingtools settings, light theme).
// Window chrome is approximated: neutral light greys with MathWorks blue.
// ---------------------------------------------------------------------------
export const matlabLight = {
  type: "light",
  name: "MATLAB Light",
  file: "matlab-light-color-theme.json",

  input: "#FFFFFF",
  bg: "#FFFFFF",
  widget: "#F8F8F8",
  bg1: "#F5F5F5",
  bg2: "#EDEDED",
  bg3: "#E8E8E8",
  border: "#D9D9D9",
  borderStrong: "#C4C4C4",
  guide: "#E6E6E6",
  guideActive: "#BDBDBD",

  fg: "#000000",
  fgUI: "#1F1F1F",
  fgMuted: "#6B6B6B",
  fgFaint: "#8F8F8F",

  listSel: "#CCE4F7",
  listSelInactive: "#E4E4E4",
  hover: "#ECECEC",
  selection: "#3399FF",
  find: "#E8B800",
  occurrence: "#00A3A3",
  focus: "#0076A8",
  button: "#0076A8",
  onButton: "#FFFFFF",

  keyword: "#0E00FF",  // KeywordColor           [14 0 255]
  comment: "#028009",  // CommentColor           [2 128 9]
  string: "#AA04F9",   // StringColor            [170 4 249]
  invalid: "#C40000",  // UnterminatedStringColor [196 0 0]

  // Text-safe versions of MATLAB's orange/teal (the originals are used
  // verbatim for squiggles below, where they don't need to be read).
  warn: "#A35A00",
  info: "#1656A7",     // CodeAnalyzerInfoColor  [22 86 167]
  cyan: "#007A7A",
  gold: "#B28C00",     // SystemCommandColor     [178 140 0]

  md: {
    heading: "#C04C0B", // Markdown HeadingColor [192 76 11]
    emphasis: "#0E00FF",
    quote: "#008013",
    link: "#1171BE",
  },

  overrides: {
    "editor.lineHighlightBackground": "#DEEED8",       // HighlightCurrentLineColor
    "editor.wordHighlightBackground": "#CAE8E8",       // VariableHighlightColor
    "editor.wordHighlightStrongBackground": "#B5DEDE",
    "editor.wordHighlightTextBackground": "#CAE8E8",
    "editor.symbolHighlightBackground": "#CAE8E8",
    "editor.selectionBackground": "#B5D5FF",
    "editor.inactiveSelectionBackground": "#D9E8FB",
    "editor.findMatchBackground": "#F5DA6B",
    "editor.findMatchHighlightBackground": "#EEE1B4",  // AutofixHighlightColor
    "editorRuler.foreground": "#CCCCCC",               // text limit line colour
    "editorError.foreground": "#FF0000",               // SyntaxErrorColor
    "editorWarning.foreground": "#FF9400",             // CodeAnalyzerWarningColor
    "editorOverviewRuler.errorForeground": "#FF0000",
    "editorOverviewRuler.warningForeground": "#FF9400",
    "editorIndentGuide.background1": "#EBEBEB",
    "terminal.ansiRed": "#E60000",                     // Command Window ErrorColor
    "terminal.ansiBrightRed": "#E60000",
    "terminal.ansiYellow": "#FF6400",                  // Command Window WarningColor
    "terminal.ansiBlue": "#0000FF",                    // Command Window HyperlinkColor
    "statusBar.background": "#F0F0F0",
    "statusBar.debuggingBackground": "#A0522D",        // ValidationSectionColor
    "statusBar.debuggingForeground": "#FFFFFF",
  },
};

// ---------------------------------------------------------------------------
// MATLAB Sepia: evening theme. Dim warm "Dark Reader sepia" surface for a
// harsh-white TN panel. MATLAB hues (OKLCH), each at the lightest tone that
// clears its contrast target against bg:
//   text 7.7 · keyword 5.6 · string 5.1 · unterminated 5.1 · comment 4.4
// ---------------------------------------------------------------------------
export const matlabSepia = {
  type: "light",
  name: "MATLAB Sepia",
  file: "matlab-sepia-color-theme.json",

  input: "#B9B1A4",
  bg: "#B3AC9F",
  widget: "#AEA69A",
  bg1: "#AAA397",
  bg2: "#A59E92",
  bg3: "#A19A8F",
  border: "#938C81",
  borderStrong: "#878177",
  guide: "#9D968B",
  guideActive: "#777168",

  fg: "#1A1A18",
  fgUI: "#2C2C29",
  fgMuted: "#57534C",
  fgFaint: "#6A655E",

  listSel: "#92948F",
  listSelInactive: "#A09B92",
  hover: "#A59F94",
  selection: "#657A8C",
  find: "#806A41",
  occurrence: "#638080",
  focus: "#6F7778",
  button: "#5E635E",
  onButton: "#E4DDD2",

  keyword: "#022395",
  comment: "#0F4E0F",
  string: "#571484",
  invalid: "#73120C",

  warn: "#5F380E",
  info: "#0F4368",
  cyan: "#10484B",
  gold: "#503C0C",
};

// ---------------------------------------------------------------------------
// MATLAB Sepia Dark: same hues, darkest tone that clears its target.
//   text 11.3 · keyword 5.6 · string 5.7 · unterminated 5.2 · comment 4.6
// ---------------------------------------------------------------------------
export const matlabSepiaDark = {
  type: "dark",
  name: "MATLAB Sepia Dark",
  file: "matlab-sepia-dark-color-theme.json",

  input: "#262626",
  bg: "#1C1C1C",
  widget: "#232323",
  bg1: "#202020",
  bg2: "#242424",
  bg3: "#1F1F1F",
  border: "#303030",
  borderStrong: "#3A3A3A",
  guide: "#2E2E2E",
  guideActive: "#4A4A4A",

  fg: "#D2D2D0",
  fgUI: "#C4C4C2",
  fgMuted: "#7A7A78",
  fgFaint: "#6A6A68",

  listSel: "#37414B",
  listSelInactive: "#2C3036",
  hover: "#2A2A2A",
  selection: "#3A5F8A",
  find: "#B8995A",
  occurrence: "#4E9A90",
  focus: "#4F5B66",
  button: "#3E4A56",
  onButton: "#E2E2E0",

  keyword: "#6391F5",
  comment: "#2E9A2E",
  string: "#B977F5",
  invalid: "#F05A4A",

  warn: "#C87A29",
  info: "#2B93DD",
  cyan: "#2C9AA0",
  gold: "#AD8627",
};

export default [matlabLight, matlabSepia, matlabSepiaDark];
