// Brightness control for the MATLAB themes.
//
// The theme files VS Code loads (themes/*.json) are regenerated from the
// pristine copies in themes/base/ with every colour's OKLab lightness scaled
// by the brightness setting, the same operation the browser extension
// applies. The themes are contributed with "_watch": true, so VS Code
// re-applies a theme the moment its file changes: no window reload.
//
// Settings: matlabThemes.brightness (60-100), matlabThemes.reloadWindow.

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const SECTION = "matlabThemes";
const MIN = 60, MAX = 100, STEP = 5;
const THEMES = {
  "MATLAB Light": "matlab-light-color-theme.json",
  "MATLAB Sepia": "matlab-sepia-color-theme.json",
  "MATLAB Sepia Dark": "matlab-sepia-dark-color-theme.json",
};

// ------------------------------------------------------------------ colour
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

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

// scale lightness; if that leaves sRGB, reduce chroma (keeps L and hue)
function dim(rgb, k) {
  const [L, a, b] = rgbToOklab(rgb);
  let out = oklabToRgb([L * k, a, b]);
  if (!inGamut(out)) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklabToRgb([L * k, a * mid, b * mid]))) lo = mid; else hi = mid;
    }
    out = oklabToRgb([L * k, a * lo, b * lo]);
  }
  return out.map(clamp01);
}

const hex2 = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0").toUpperCase();

function dimHex(hex, k) {
  const h = hex.slice(1);
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return "#" + dim(rgb, k).map(hex2).join("") + h.slice(6); // alpha unchanged
}

// every "#RRGGBB" / "#RRGGBBAA" string value in the theme
function dimTheme(json, k) {
  if (k === 1) return json;
  return JSON.parse(JSON.stringify(json), (key, v) =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(v) ? dimHex(v, k) : v);
}

// ------------------------------------------------------------------ files
let root = "";

function writeThemes(percent) {
  const k = percent / 100;
  for (const file of Object.values(THEMES)) {
    const base = JSON.parse(fs.readFileSync(path.join(root, "themes", "base", file), "utf8"));
    const text = JSON.stringify(dimTheme(base, k), null, 2) + "\n";
    const target = path.join(root, "themes", file);
    // write in place (not via rename) so the file watcher sees an update
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== text) fs.writeFileSync(target, text);
  }
}

const config = () => vscode.workspace.getConfiguration(SECTION);
const brightness = () => Math.min(MAX, Math.max(MIN, Math.round(config().get("brightness", 100))));
const activeIsOurs = () => Object.hasOwn(THEMES, vscode.workspace.getConfiguration("workbench").get("colorTheme"));

// ------------------------------------------------------------------ UI
let item;

function updateItem() {
  item.text = `$(color-mode) ${brightness()}%`;
  item.tooltip = "MATLAB Themes brightness: click to change";
  if (activeIsOurs()) item.show(); else item.hide();
}

async function save(percent) {
  await config().update("brightness", percent, vscode.ConfigurationTarget.Global);
}

async function pickBrightness() {
  const current = brightness();
  const steps = [];
  for (let p = MAX; p >= MIN; p -= STEP) steps.push(p);
  if (!steps.includes(current)) steps.push(current), steps.sort((a, b) => b - a);

  const qp = vscode.window.createQuickPick();
  qp.title = "MATLAB Themes brightness";
  qp.placeholder = "Move through the list to preview; Enter keeps it, Esc goes back";
  qp.items = steps.map((p) => ({ label: `${p}%`, description: p === 100 ? "as designed" : p === current ? "current" : "", p }));
  qp.activeItems = qp.items.filter((i) => i.p === current);

  const live = !config().get("reloadWindow", false);
  let timer;
  let accepted = false;
  if (live) {
    qp.onDidChangeActive(([i]) => {
      clearTimeout(timer);
      if (i) timer = setTimeout(() => writeThemes(i.p), 60);
    });
  }
  qp.onDidAccept(async () => {
    accepted = true;
    const p = qp.activeItems[0]?.p ?? current;
    qp.hide();
    await save(p);
  });
  qp.onDidHide(() => {
    clearTimeout(timer);
    if (!accepted && live) writeThemes(current);
    qp.dispose();
  });
  qp.show();
}

async function nudge(delta) {
  await save(Math.min(MAX, Math.max(MIN, brightness() + delta)));
}

// ------------------------------------------------------------------ lifecycle
function activate(context) {
  root = context.extensionPath;

  item = vscode.window.createStatusBarItem("matlabThemes.brightness", vscode.StatusBarAlignment.Right, 100);
  item.name = "MATLAB Themes Brightness";
  item.command = "matlabThemes.setBrightness";
  context.subscriptions.push(item);

  context.subscriptions.push(
    vscode.commands.registerCommand("matlabThemes.setBrightness", pickBrightness),
    vscode.commands.registerCommand("matlabThemes.brighter", () => nudge(STEP)),
    vscode.commands.registerCommand("matlabThemes.dimmer", () => nudge(-STEP)),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(`${SECTION}.brightness`)) {
        writeThemes(brightness());
        if (config().get("reloadWindow", false) && activeIsOurs()) {
          await vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      }
      if (e.affectsConfiguration(`${SECTION}.brightness`) || e.affectsConfiguration("workbench.colorTheme")) updateItem();
    })
  );

  // re-apply after install or update, which restore the files at 100%
  try {
    writeThemes(brightness());
  } catch (err) {
    vscode.window.showWarningMessage(`MATLAB Themes couldn't write its theme files: ${err.message}`);
  }
  updateItem();
}

function deactivate() {}

module.exports = { activate, deactivate, dimHex, dimTheme };
