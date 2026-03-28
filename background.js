// ── Context menu setup ──
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "qf-define",
    title: "Define Insurance Term",
    contexts: ["selection"],
  });
});

// ── Context menu click handler ──
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "qf-define" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "define-term",
      text: info.selectionText.trim(),
    });
  }
});

// ── Badge management ──
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#94a3b8" });
  }
}

chrome.storage.sync.get({ highlightEnabled: true }, function (data) {
  updateBadge(data.highlightEnabled);
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.highlightEnabled) {
    updateBadge(changes.highlightEnabled.newValue);
  }
});
