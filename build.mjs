// Generates themes/*.json from palettes.mjs and syncs package.json.
//   npm run build     regenerate theme JSON
//   npm run package   regenerate + build the .vsix

import { readFileSync, writeFileSync } from "node:fs";
import palettes, { matlabSepia } from "./palettes.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const a = (hex, alpha) => hex + alpha; // "#RRGGBB" + "AA"
const NONE = "#00000000";

// ---------------------------------------------------------------------------
// Workbench colours
// ---------------------------------------------------------------------------

function colors(p) {
  const isDark = p.type === "dark";
  return {
    // global
    foreground: p.fgUI,
    descriptionForeground: p.fgMuted,
    disabledForeground: p.fgFaint,
    errorForeground: p.invalid,
    focusBorder: p.focus,
    contrastBorder: NONE,
    contrastActiveBorder: NONE,
    "icon.foreground": p.fgUI,
    "widget.shadow": a("#000000", isDark ? "40" : "20"),
    "selection.background": a(p.selection, "66"),
    "sash.hoverBorder": p.focus,
    "progressBar.background": p.button,

    // editor surface
    "editor.background": p.bg,
    "editor.foreground": p.fg,
    "editorGutter.background": p.bg,
    "editorLineNumber.foreground": p.fgMuted,
    "editorLineNumber.activeForeground": p.fg,
    "editorCursor.foreground": p.fg,
    "editorWhitespace.foreground": p.fgFaint,
    "editorIndentGuide.background1": p.guide,
    "editorIndentGuide.activeBackground1": p.guideActive,
    "editorRuler.foreground": p.border,
    "editorCodeLens.foreground": p.fgMuted,
    "editorGhostText.foreground": a(p.fgFaint, "CC"),
    "editorInlayHint.foreground": p.fgMuted,
    "editorInlayHint.background": NONE,
    "editor.lineHighlightBackground": a(isDark ? "#FFFFFF" : "#000000", "08"),
    "editor.lineHighlightBorder": NONE,
    "editorStickyScroll.background": p.bg,
    "editorStickyScrollHover.background": p.hover,
    "editor.foldBackground": a(p.selection, "1A"),

    // selection / search / occurrences
    "editor.selectionBackground": a(p.selection, "66"),
    "editor.inactiveSelectionBackground": a(p.selection, "33"),
    "editor.selectionHighlightBackground": a(p.selection, "22"),
    "editor.wordHighlightBackground": a(p.occurrence, "3D"),
    "editor.wordHighlightStrongBackground": a(p.occurrence, "55"),
    "editor.wordHighlightTextBackground": a(p.occurrence, "3D"),
    "editor.symbolHighlightBackground": a(p.occurrence, "3D"),
    "editor.linkedEditingBackground": a(p.occurrence, "3D"),
    "editor.findMatchBackground": a(p.find, "66"),
    "editor.findMatchHighlightBackground": a(p.find, "38"),
    "editor.findRangeHighlightBackground": a(p.find, "26"),
    "editor.rangeHighlightBackground": a(p.find, "30"),
    "editor.hoverHighlightBackground": a(p.find, "30"),
    "editorBracketMatch.background": a(p.selection, "30"),
    "editorBracketMatch.border": a(p.selection, "80"),

    // diagnostics
    "editorError.foreground": p.invalid,
    "editorWarning.foreground": p.warn,
    "editorInfo.foreground": p.info,
    "editorHint.foreground": p.comment,
    "editorOverviewRuler.errorForeground": p.invalid,
    "editorOverviewRuler.warningForeground": p.warn,
    "editorOverviewRuler.infoForeground": p.info,
    "editorOverviewRuler.border": NONE,
    "editorOverviewRuler.findMatchForeground": a(p.find, "AA"),
    "editorOverviewRuler.selectionHighlightForeground": a(p.selection, "AA"),
    "problemsErrorIcon.foreground": p.invalid,
    "problemsWarningIcon.foreground": p.warn,
    "problemsInfoIcon.foreground": p.info,
    "editorLightBulb.foreground": p.gold,
    "editorLightBulbAutoFix.foreground": p.gold,

    // links
    "textLink.foreground": p.keyword,
    "textLink.activeForeground": p.keyword,
    "editorLink.activeForeground": p.keyword,

    // git gutter / diff
    "editorGutter.addedBackground": p.comment,
    "editorGutter.modifiedBackground": p.info,
    "editorGutter.deletedBackground": p.invalid,
    "diffEditor.insertedTextBackground": a(p.comment, isDark ? "33" : "26"),
    "diffEditor.removedTextBackground": a(p.invalid, isDark ? "33" : "22"),
    "diffEditor.insertedLineBackground": a(p.comment, isDark ? "1A" : "14"),
    "diffEditor.removedLineBackground": a(p.invalid, isDark ? "1A" : "12"),
    "diffEditor.diagonalFill": a(p.border, "80"),
    "gitDecoration.modifiedResourceForeground": p.warn,
    "gitDecoration.addedResourceForeground": p.comment,
    "gitDecoration.untrackedResourceForeground": p.comment,
    "gitDecoration.deletedResourceForeground": p.invalid,
    "gitDecoration.conflictingResourceForeground": p.string,
    "gitDecoration.ignoredResourceForeground": p.fgFaint,
    "merge.currentHeaderBackground": a(p.comment, "55"),
    "merge.currentContentBackground": a(p.comment, "22"),
    "merge.incomingHeaderBackground": a(p.info, "55"),
    "merge.incomingContentBackground": a(p.info, "22"),

    // tabs / editor groups
    "editorGroupHeader.tabsBackground": p.bg2,
    "editorGroupHeader.noTabsBackground": p.bg2,
    "editorGroupHeader.tabsBorder": p.border,
    "editorGroup.border": p.border,
    "tab.activeBackground": p.bg,
    "tab.activeForeground": p.fg,
    "tab.activeBorder": NONE,
    "tab.activeBorderTop": NONE,
    "tab.inactiveBackground": p.bg2,
    "tab.inactiveForeground": p.fgMuted,
    "tab.hoverBackground": p.hover,
    "tab.hoverForeground": p.fg,
    "tab.unfocusedActiveBackground": p.bg,
    "tab.unfocusedActiveForeground": p.fgUI,
    "tab.unfocusedInactiveBackground": p.bg2,
    "tab.unfocusedInactiveForeground": p.fgFaint,
    "tab.border": p.border,
    "tab.lastPinnedBorder": p.border,
    "breadcrumb.background": p.bg,
    "breadcrumb.foreground": p.fgMuted,
    "breadcrumb.focusForeground": p.fg,
    "breadcrumb.activeSelectionForeground": p.fg,
    "breadcrumbPicker.background": p.widget,

    // side bar / activity bar / panel
    "sideBar.background": p.bg1,
    "sideBar.foreground": p.fgUI,
    "sideBar.border": p.border,
    "sideBarTitle.foreground": p.fgUI,
    "sideBarSectionHeader.background": p.bg2,
    "sideBarSectionHeader.foreground": p.fgUI,
    "sideBarSectionHeader.border": p.border,
    "activityBar.background": p.bg3,
    "activityBar.foreground": p.fgUI,
    "activityBar.inactiveForeground": p.fgMuted,
    "activityBar.border": p.border,
    "activityBar.activeBackground": p.bg1,
    "activityBar.activeBorder": p.fgMuted,
    "activityBarBadge.background": p.button,
    "activityBarBadge.foreground": p.onButton,
    "activityBarTop.foreground": p.fgUI,
    "activityBarTop.inactiveForeground": p.fgMuted,
    "activityBarTop.activeBorder": p.fgMuted,
    "panel.background": p.bg1,
    "panel.border": p.border,
    "panelTitle.activeForeground": p.fg,
    "panelTitle.inactiveForeground": p.fgMuted,
    "panelTitle.activeBorder": p.fgMuted,
    "panelSection.border": p.border,
    "panelSectionHeader.background": p.bg2,
    "panelSectionHeader.foreground": p.fgUI,

    // lists / trees
    "list.activeSelectionBackground": p.listSel,
    "list.activeSelectionForeground": p.fg,
    "list.inactiveSelectionBackground": p.listSelInactive,
    "list.inactiveSelectionForeground": p.fg,
    "list.hoverBackground": p.hover,
    "list.hoverForeground": p.fg,
    "list.focusBackground": p.listSel,
    "list.focusForeground": p.fg,
    "list.focusOutline": NONE,
    "list.highlightForeground": p.keyword,
    "list.errorForeground": p.invalid,
    "list.warningForeground": p.warn,
    "tree.indentGuidesStroke": p.guideActive,
    "tree.inactiveIndentGuidesStroke": p.guide,

    // status / title / menus / command centre
    "statusBar.background": p.bg3,
    "statusBar.foreground": p.fgUI,
    "statusBar.border": p.border,
    "statusBar.noFolderBackground": p.bg3,
    "statusBar.debuggingBackground": p.gold,
    "statusBar.debuggingForeground": isDark ? p.bg : p.onButton,
    "statusBarItem.hoverBackground": p.hover,
    "statusBarItem.remoteBackground": p.button,
    "statusBarItem.remoteForeground": p.onButton,
    "statusBarItem.errorBackground": p.invalid,
    "statusBarItem.errorForeground": isDark ? p.bg : p.onButton,
    "statusBarItem.warningBackground": p.warn,
    "statusBarItem.warningForeground": isDark ? p.bg : p.onButton,
    "titleBar.activeBackground": p.bg3,
    "titleBar.activeForeground": p.fgUI,
    "titleBar.inactiveBackground": p.bg3,
    "titleBar.inactiveForeground": p.fgMuted,
    "titleBar.border": p.border,
    "menubar.selectionBackground": p.listSel,
    "menubar.selectionForeground": p.fg,
    "menu.background": p.widget,
    "menu.foreground": p.fg,
    "menu.selectionBackground": p.listSel,
    "menu.selectionForeground": p.fg,
    "menu.separatorBackground": p.border,
    "menu.border": p.borderStrong,
    "commandCenter.background": p.bg1,
    "commandCenter.foreground": p.fgUI,
    "commandCenter.border": p.borderStrong,
    "commandCenter.activeBackground": p.listSel,
    "commandCenter.activeForeground": p.fg,

    // inputs / buttons / badges
    "input.background": p.input,
    "input.foreground": p.fg,
    "input.border": p.borderStrong,
    "input.placeholderForeground": p.fgFaint,
    "inputOption.activeBackground": a(p.listSel, "66"),
    "inputOption.activeBorder": p.fgMuted,
    "inputOption.activeForeground": p.fg,
    "inputValidation.errorBackground": p.widget,
    "inputValidation.errorBorder": p.invalid,
    "inputValidation.warningBackground": p.widget,
    "inputValidation.warningBorder": p.warn,
    "inputValidation.infoBackground": p.widget,
    "inputValidation.infoBorder": p.info,
    "dropdown.background": p.input,
    "dropdown.foreground": p.fg,
    "dropdown.border": p.borderStrong,
    "checkbox.background": p.input,
    "checkbox.foreground": p.fg,
    "checkbox.border": p.borderStrong,
    "button.background": p.button,
    "button.foreground": p.onButton,
    "button.hoverBackground": p.fgMuted,
    "button.secondaryBackground": p.bg2,
    "button.secondaryForeground": p.fg,
    "button.secondaryHoverBackground": p.hover,
    "badge.background": p.button,
    "badge.foreground": p.onButton,
    "keybindingLabel.background": p.bg2,
    "keybindingLabel.foreground": p.fg,
    "keybindingLabel.border": p.borderStrong,
    "keybindingLabel.bottomBorder": p.guideActive,
    "toolbar.hoverBackground": a(p.listSel, "66"),
    "toolbar.activeBackground": a(p.listSel, "80"),

    // quick input / widgets / hovers / notifications
    "quickInput.background": p.widget,
    "quickInput.foreground": p.fg,
    "quickInputList.focusBackground": p.listSel,
    "quickInputList.focusForeground": p.fg,
    "quickInputList.focusIconForeground": p.fg,
    "pickerGroup.foreground": p.keyword,
    "pickerGroup.border": p.border,
    "editorWidget.background": p.widget,
    "editorWidget.foreground": p.fg,
    "editorWidget.border": p.borderStrong,
    "editorWidget.resizeBorder": p.guideActive,
    "editorSuggestWidget.background": p.widget,
    "editorSuggestWidget.foreground": p.fg,
    "editorSuggestWidget.border": p.borderStrong,
    "editorSuggestWidget.highlightForeground": p.keyword,
    "editorSuggestWidget.focusHighlightForeground": p.keyword,
    "editorSuggestWidget.selectedBackground": p.listSel,
    "editorSuggestWidget.selectedForeground": p.fg,
    "editorHoverWidget.background": p.widget,
    "editorHoverWidget.foreground": p.fg,
    "editorHoverWidget.border": p.borderStrong,
    "editorHoverWidget.highlightForeground": p.keyword,
    "editorHoverWidget.statusBarBackground": p.bg2,
    "notifications.background": p.widget,
    "notifications.foreground": p.fg,
    "notifications.border": p.borderStrong,
    "notificationCenterHeader.background": p.bg2,
    "notificationCenterHeader.foreground": p.fg,
    "notificationToast.border": p.borderStrong,
    "notificationLink.foreground": p.keyword,
    "notificationsErrorIcon.foreground": p.invalid,
    "notificationsWarningIcon.foreground": p.warn,
    "notificationsInfoIcon.foreground": p.info,

    // peek view
    "peekView.border": p.guideActive,
    "peekViewEditor.background": p.bg,
    "peekViewEditorGutter.background": p.bg,
    "peekViewEditor.matchHighlightBackground": a(p.find, "66"),
    "peekViewResult.background": p.bg1,
    "peekViewResult.fileForeground": p.fg,
    "peekViewResult.lineForeground": p.fgMuted,
    "peekViewResult.matchHighlightBackground": a(p.find, "66"),
    "peekViewResult.selectionBackground": p.listSel,
    "peekViewResult.selectionForeground": p.fg,
    "peekViewTitle.background": p.bg2,
    "peekViewTitleLabel.foreground": p.fg,
    "peekViewTitleDescription.foreground": p.fgMuted,

    // scrollbars
    "scrollbar.shadow": a("#000000", isDark ? "40" : "18"),
    "scrollbarSlider.background": a(p.fgMuted, "45"),
    "scrollbarSlider.hoverBackground": a(p.fgMuted, "66"),
    "scrollbarSlider.activeBackground": a(p.fgMuted, "80"),

    // terminal (ANSI mapped onto the syntax hues)
    "terminal.background": p.bg,
    "terminal.foreground": p.fg,
    "terminalCursor.foreground": p.fg,
    "terminal.selectionBackground": a(p.selection, "66"),
    "terminal.inactiveSelectionBackground": a(p.selection, "33"),
    "terminal.border": p.border,
    "terminal.ansiBlack": isDark ? "#3A3A3A" : p.fg,
    "terminal.ansiBrightBlack": p.fgMuted,
    "terminal.ansiRed": p.invalid,
    "terminal.ansiBrightRed": p.invalid,
    "terminal.ansiGreen": p.comment,
    "terminal.ansiBrightGreen": p.comment,
    "terminal.ansiYellow": p.warn,
    "terminal.ansiBrightYellow": p.gold,
    "terminal.ansiBlue": p.keyword,
    "terminal.ansiBrightBlue": p.info,
    "terminal.ansiMagenta": p.string,
    "terminal.ansiBrightMagenta": p.string,
    "terminal.ansiCyan": p.cyan,
    "terminal.ansiBrightCyan": p.cyan,
    // "white" on a light theme must still be readable, so it maps to muted text
    "terminal.ansiWhite": isDark ? p.fgUI : p.fgMuted,
    "terminal.ansiBrightWhite": isDark ? "#EDEDEB" : p.fg,

    // debug
    "debugConsole.errorForeground": p.invalid,
    "debugConsole.warningForeground": p.warn,
    "debugConsole.infoForeground": p.info,
    "debugConsole.sourceForeground": p.fgMuted,
    "debugToolBar.background": p.widget,
    "debugToolBar.border": p.borderStrong,
    "editor.stackFrameHighlightBackground": a(p.gold, "30"),
    "editor.focusedStackFrameHighlightBackground": a(p.comment, "26"),
    "debugIcon.breakpointForeground": p.invalid,

    // settings editor
    "settings.headerForeground": p.fg,
    "settings.modifiedItemIndicator": p.gold,
    "settings.dropdownBackground": p.input,
    "settings.dropdownBorder": p.borderStrong,
    "settings.checkboxBackground": p.input,
    "settings.checkboxBorder": p.borderStrong,
    "settings.textInputBackground": p.input,
    "settings.textInputBorder": p.borderStrong,
    "settings.numberInputBackground": p.input,
    "settings.numberInputBorder": p.borderStrong,

    // places that otherwise keep a bright stock colour
    "welcomePage.background": p.bg,
    "welcomePage.tileBackground": p.bg1,
    "welcomePage.tileHoverBackground": p.hover,
    "welcomePage.tileBorder": p.border,
    "walkThrough.embeddedEditorBackground": p.bg1,
    "textBlockQuote.background": p.bg1,
    "textBlockQuote.border": p.guideActive,
    "textCodeBlock.background": p.bg1,
    "textPreformat.foreground": p.fg,
    "textPreformat.background": a(p.fgMuted, "22"),
    "chat.requestBackground": p.bg1,
    "chat.requestBorder": p.border,
    "chat.slashCommandBackground": p.bg2,
    "chat.slashCommandForeground": p.keyword,
    "minimap.background": p.bg,
  };
}

// ---------------------------------------------------------------------------
// Token colours
//
// Standalone theme = nothing underneath. Anything not matched below renders
// in editor.foreground, so there is no "keep everything else black" rule.
// ---------------------------------------------------------------------------

function tokenColors(p) {
  const rule = (name, scope, foreground, fontStyle = "") => ({
    name,
    scope,
    settings: foreground ? { foreground, fontStyle } : { fontStyle },
  });
  return [
    rule("Comments", ["comment", "punctuation.definition.comment"], p.comment),
    rule(
      "Python docstrings as MATLAB help text",
      [
        "string.quoted.docstring",
        "string.quoted.docstring punctuation.definition.string",
      ],
      p.comment
    ),
    // MATLAB `%%` section headers are bold (scope name from the MathWorks
    // grammar; harmless if your grammar uses another one).
    rule("MATLAB cell titles", ["comment.line.double-percentage.matlab"], p.comment, "bold"),

    rule("Strings", ["string", "punctuation.definition.string", "constant.character"], p.string),
    // Python f/r/b prefixes are scoped storage.type.string.python and would
    // otherwise turn keyword-blue.
    rule("String prefixes", ["storage.type.string", "storage.type.format"], p.string),
    rule("Unterminated strings / invalid", ["invalid", "invalid.illegal"], p.invalid),

    rule(
      "Keywords",
      ["keyword", "storage.type", "storage.modifier"],
      p.keyword
    ),
    // `keyword` above also catches every keyword.operator.* sub-scope
    // (unpacking *, matrix @, bitwise ...). MATLAB draws operators black, so
    // undo that wholesale, then re-blue only operators that are words.
    rule("Symbolic operators stay plain", ["keyword.operator"], p.fg),
    rule(
      "Word operators are keywords",
      [
        "keyword.operator.logical.python",
        "keyword.operator.word",
        "keyword.operator.new",
        "keyword.operator.expression",
        "keyword.operator.delete",
        "keyword.operator.sizeof",
      ],
      p.keyword
    ),

    // Markup: MATLAB's Live Editor colours where the palette has them,
    // otherwise shape only.
    rule("Headings", ["markup.heading", "entity.name.section"], p.md?.heading, "bold"),
    rule("Bold", ["markup.bold"], p.md?.emphasis, "bold"),
    rule("Italic", ["markup.italic"], p.md?.emphasis, "italic"),
    rule("Lists", ["markup.list punctuation.definition.list"], p.md?.emphasis),
    rule("Quotes", ["markup.quote"], p.md?.quote),
    rule("Inline code", ["markup.inline.raw", "markup.fenced_code.block"], p.md?.emphasis ?? p.string),
    rule("Links", ["markup.underline.link", "string.other.link"], p.md?.link ?? p.keyword),
    rule("Diff inserted", ["markup.inserted"], p.comment),
    rule("Diff deleted", ["markup.deleted"], p.invalid),
    rule("Diff changed", ["markup.changed"], p.warn),
  ];
}

// ---------------------------------------------------------------------------

for (const p of palettes) {
  const theme = {
    $schema: "vscode://schemas/color-theme",
    name: p.name,
    type: p.type,
    // Language servers must not recolour the deliberately sparse palette.
    semanticHighlighting: false,
    colors: { ...colors(p), ...(p.overrides ?? {}) },
    tokenColors: tokenColors(p),
  };
  writeFileSync(`themes/${p.file}`, JSON.stringify(theme, null, 2) + "\n");
  console.log(`wrote themes/${p.file}  (${Object.keys(theme.colors).length} colours, ${theme.tokenColors.length} token rules)`);
}

// keep the extension manifest in step with the palette list
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.contributes.themes = palettes.map((p) => ({
  label: p.name,
  uiTheme: p.type === "dark" ? "vs-dark" : "vs",
  path: `./themes/${p.file}`,
}));
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

// browser extension: same sepia palette, consumed by browser/*.js
const web = {
  bg: matlabSepia.bg, fg: matlabSepia.fg,
  // popup chrome
  bg2: matlabSepia.bg2, line: matlabSepia.border, muted: matlabSepia.fgMuted,
  sel: matlabSepia.button, onSel: matlabSepia.onButton,
};
writeFileSync(
  "browser/palette.js",
  "// Generated by build.mjs from palettes.mjs (matlabSepia). Do not edit.\n" +
    `globalThis.MS_PALETTE = ${JSON.stringify(web, null, 2)};\n`
);
console.log("wrote browser/palette.js");
