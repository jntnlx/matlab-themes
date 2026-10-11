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
