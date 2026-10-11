// Extension glue: reads settings, starts the engine, follows changes.
(() => {
  const DEFAULTS = { enabled: true, dimImages: true, sites: {} };
  const host = location.hostname || "file";

  const fetchCss = (url) =>
    new Promise((resolve, reject) =>
      chrome.runtime.sendMessage({ type: "fetchCss", url }, (res) =>
        res?.text != null ? resolve(res.text) : reject(res?.error)));

  function apply(s) {
    const mode = !s.enabled ? "off" : s.sites[host] ?? "auto";
    MSEngine.start({ palette: MS_PALETTE, mode, dimImages: s.dimImages, fetchCss });
  }

  chrome.storage.sync.get(DEFAULTS, apply);
  chrome.storage.onChanged.addListener(() => chrome.storage.sync.get(DEFAULTS, apply));

  // the popup asks the top frame what it is doing on this page
  if (window === top) {
    chrome.runtime.onMessage.addListener((msg, sender, reply) => {
      if (msg?.type === "status") reply({ host, active: MSEngine.active });
    });
  }
})();
