const DEFAULTS = { enabled: true, theme: "sepia", brightness: 100, dimImages: true, sites: {}, inline: {} };
const FILES = ["palette.js", "sites.js", "colour.js", "engine.js", "content.js"];
const $ = (id) => document.getElementById(id);
let settings = DEFAULTS, tabId = null, status = null, problem = null;

function paint(themeKey) {
  const ui = (MS_THEMES[themeKey] ?? MS_THEMES.sepia).ui;
  for (const [k, v] of Object.entries(ui)) document.documentElement.style.setProperty("--" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()), v);
}

function render() {
  const host = status?.host ?? null;
  paint(status?.theme ?? (settings.theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "sepia" : "light") : settings.theme));
  document.querySelector("main").classList.toggle("off", !settings.enabled);
  $("enabled").checked = settings.enabled;
  $("dimImages").checked = settings.dimImages;
  $("brightness").value = settings.brightness;
  $("brightnessOut").textContent = settings.brightness + "%";
  document.querySelectorAll("#theme button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === settings.theme));

  const mode = settings.sites[host] ?? status?.mode ?? "auto";
  document.querySelectorAll("#mode button").forEach((b) => { b.setAttribute("aria-checked", !!host && b.dataset.v === mode); b.disabled = !host; });
  $("inline").checked = !!status?.inline;
  $("inline").disabled = !host;
  $("report").disabled = !host;

  if (!host) {
    $("host").textContent = "This page";
    // browser pages and the Web Store refuse every extension; anything else
    // means site access is limited on the extension's details page
    $("status").textContent = /cannot be scripted|chrome|helium|extensions gallery|edge:/i.test(problem ?? "")
      ? "Browser pages can't be themed."
      : 'Blocked here. In the extension\'s Details, set Site access to "On all sites".';
    return;
  }
  $("host").textContent = host;
  $("status").textContent =
    !settings.enabled ? "Off everywhere." :
    mode === "off" ? "Off for this site." :
    mode === "filter" ? "Pixel filter applied." :
    status.active ? "Applied." :
    mode === "auto" ? "Left alone: this page is already dark." : "";
  if (status.siteNote) $("status").textContent += " Site fix: " + status.siteNote;
}

const ask = (type) => chrome.tabs.sendMessage(tabId, { type });

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  problem = null;
  try {
    status = await ask("status");
  } catch {
    // no content script yet (tab opened before install): inject it now
    try {
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: FILES });
      await new Promise((r) => setTimeout(r, 300));
      status = await ask("status");
    } catch (err) {
      status = null;
      problem = String(err?.message || err);
    }
  }
  render();
}

async function save(patch) {
  settings = { ...settings, ...patch };
  await chrome.storage.sync.set(settings);
  setTimeout(refresh, 250);
}

const perSite = (key, value) => {
  const host = status?.host;
  if (!host) return;
  const m = { ...settings[key] };
  if (value === null) delete m[host]; else m[host] = value;
  save({ [key]: m });
};

$("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
$("dimImages").addEventListener("change", (e) => save({ dimImages: e.target.checked }));
$("theme").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (v) save({ theme: v }); });
$("mode").addEventListener("click", (e) => { const v = e.target.closest("button")?.dataset.v; if (v) perSite("sites", v === "auto" ? null : v); });
$("inline").addEventListener("change", (e) => perSite("inline", e.target.checked));

let bTimer;
$("brightness").addEventListener("input", (e) => {
  $("brightnessOut").textContent = e.target.value + "%";
  clearTimeout(bTimer);
  bTimer = setTimeout(() => save({ brightness: +e.target.value }), 200);
});

$("report").addEventListener("click", async () => {
  const btn = $("report");
  try {
    const r = await ask("report");
    const text = "MATLAB Themes site report\n" + JSON.stringify({ ...r, settings: { theme: settings.theme, brightness: settings.brightness, dimImages: settings.dimImages } }, null, 2);
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch {
    btn.textContent = "Couldn't copy";
  }
  setTimeout(() => (btn.textContent = "Copy site report"), 1500);
});

chrome.storage.sync.get(DEFAULTS, (s) => { settings = s; refresh(); });
