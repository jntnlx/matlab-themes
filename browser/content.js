// Extension glue: reads settings, starts the engine, follows changes.
(() => {
  // the popup and the installer may inject this file into a tab that already
  // has it; run once per frame
  if (globalThis.__matlabSepiaLoaded) return;
  globalThis.__matlabSepiaLoaded = true;

  const DEFAULTS = { enabled: true, theme: "sepia", brightness: 100, dimImages: true, sites: {}, inline: {} };
  const host = location.hostname || "file";
  const site = MS_siteFor(host);
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  let settings = DEFAULTS;

  const fetchCss = (url) =>
    new Promise((resolve, reject) =>
      chrome.runtime.sendMessage({ type: "fetchCss", url }, (res) =>
        res?.text != null ? resolve(res.text) : reject(res?.error)));

  // "system" follows the OS like VS Code's autoDetectColorScheme:
  // light -> MATLAB Light, dark -> MATLAB Sepia
  const themeKey = (s) => (s.theme === "system" ? (systemDark.matches ? "sepia" : "light") : s.theme);

  function apply(s) {
    settings = s;
    const key = themeKey(s);
    const theme = MS_THEMES[key] ?? MS_THEMES.sepia;
    const mode = !s.enabled ? "off" : s.sites[host] ?? site?.mode ?? "auto";
    const inline = s.inline[host] ?? site?.inline ?? true;
    const siteCss = [site?.css, site?.themes?.[key]].filter(Boolean).join("\n");
    MSEngine.start({ theme, mode, brightness: s.brightness / 100, dimImages: s.dimImages, inline, siteCss, fetchCss });
  }

  const load = () => chrome.storage.sync.get(DEFAULTS, apply);
  load();
  chrome.storage.onChanged.addListener(load);
  systemDark.addEventListener("change", () => settings.theme === "system" && load());

  // the popup asks the top frame what it is doing on this page
  if (window === top) {
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg?.type === "status") {
        reply({
          host, active: MSEngine.active, theme: themeKey(settings), siteNote: site?.note ?? null,
          mode: settings.sites[host] ?? site?.mode ?? "auto",
          inline: settings.inline[host] ?? site?.inline ?? true,
        });
      }
      if (msg?.type === "report") reply({ ...MSEngine.report(), siteEntry: site ?? null, extension: chrome.runtime.getManifest().version });
    });
  }
})();
