// Fetches cross-origin stylesheets for the content script. Pages can't read
// the rules of a stylesheet served from another origin, but the extension,
// with host permissions, can fetch its text.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type !== "fetchCss") return;
  fetch(msg.url, { credentials: "omit" })
    .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
    .then((text) => reply({ text }), (err) => reply({ error: String(err) }));
  return true; // async reply
});

// Content scripts declared in the manifest only reach pages loaded after the
// extension is installed or reloaded. Inject into tabs that are already open.
const FILES = ["palette.js", "sites.js", "colour.js", "engine.js", "content.js"];
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({ url: ["http://*/*", "https://*/*", "file:///*"] })) {
    chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: FILES }).catch(() => {});
  }
});

// Alt+Shift+T cycles MATLAB Light -> Sepia -> Sepia Dark
const ORDER = ["light", "sepia", "dark"];
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "cycle-theme") return;
  const { theme = "sepia" } = await chrome.storage.sync.get("theme");
  const i = ORDER.indexOf(theme);
  await chrome.storage.sync.set({ theme: ORDER[(i + 1) % ORDER.length] });
});
