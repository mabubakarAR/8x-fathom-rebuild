// The one setting. Stored in chrome.storage.sync so it follows the profile.
const box = document.getElementById("auto");
chrome.storage.sync.get({ autoOpen: true }, (v) => { box.checked = Boolean(v.autoOpen); });
box.addEventListener("change", () => chrome.storage.sync.set({ autoOpen: box.checked }));
