// Content script — bridges between the page and the extension.
// Listens for messages from the background script and can
// interact with the page DOM if needed in the future.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "get-selection") {
    const text = window.getSelection()?.toString()?.trim() || "";
    sendResponse({ text });
  }
  return true;
});
