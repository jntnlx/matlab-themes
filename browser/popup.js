const DEFAULTS = { enabled: true, dimImages: true, sites: {} };
const $ = (id) => document.getElementById(id);
for (const [k, v] of Object.entries(MS_PALETTE)) document.documentElement.style.setProperty("--" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()), v);
let host = null;
let settings = DEFAULTS;

function render(status) {
  document.querySelector("main").classList.toggle("off", !settings.enabled);
  $("enabled").checked = settings.enabled;
  $("dimImages").checked = settings.dimImages;
  $("host").textContent = host ?? "This page can't be themed";
  const mode = settings.sites[host] ?? "auto";
  document.querySelectorAll("#mode button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === mode));
  if (!host) return;
  $("status").textContent =
    !settings.enabled ? "Off everywhere." :
    mode === "off" ? "Off for this site." :
    mode === "filter" ? "Pixel filter applied." :
    status?.active ? "Tone map applied." :
    mode === "auto" ? "Skipped: this page is already dark." : "";
}

async function save(patch) {
  settings = { ...settings, ...patch };
  await chrome.storage.sync.set(settings);
  setTimeout(refresh, 250);
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tab.id, { type: "status" });
    host = status?.host ?? null;
  } catch { host = null; } // browser pages, Web Store, PDF viewer
  render(status);
}

$("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
$("dimImages").addEventListener("change", (e) => save({ dimImages: e.target.checked }));
$("mode").addEventListener("click", (e) => {
  const v = e.target.closest("button")?.dataset.v;
  if (!v || !host) return;
  const sites = { ...settings.sites };
  if (v === "auto") delete sites[host]; else sites[host] = v;
  save({ sites });
});

chrome.storage.sync.get(DEFAULTS, (s) => { settings = s; refresh(); });
