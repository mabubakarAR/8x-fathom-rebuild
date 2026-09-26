// Noted — service worker.
//
// One message: "open". The content script cannot open a tab on its own
// (a page-initiated window.open with no click behind it is a popup, and
// Chrome blocks it), so it asks here. chrome.tabs.create needs no
// permission. The tab opens in the background so the call keeps focus.

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "open" && typeof msg.url === "string" && msg.url.startsWith("https://ainoted.vercel.app/")) {
    chrome.tabs.create({ url: msg.url, active: false }, () => reply({ ok: true }));
    return true;
  }
  reply({ ok: false });
  return false;
});
