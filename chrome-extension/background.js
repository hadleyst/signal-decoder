// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "decode-signal",
    title: "Decode this signal",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "decode-signal" || !info.selectionText) return;

  const signal = info.selectionText.trim();
  if (!signal) return;

  // Store signal + loading state so popup can read it
  await chrome.storage.local.set({
    decodeState: "loading",
    decodeSignal: signal,
    decodeResult: null,
    decodeError: null,
  });

  // Open the popup
  // Note: programmatic popup open isn't supported in MV3,
  // so we decode in background and the user clicks the extension icon to see results.
  // Send a message to any open popup to refresh.
  chrome.runtime.sendMessage({ type: "decode-started" }).catch(() => {});

  try {
    const res = await fetch("https://signaldecoder.app/api/decode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const result = await res.json();

    await chrome.storage.local.set({
      decodeState: "done",
      decodeResult: result,
      decodeError: null,
    });

    // Notify popup
    chrome.runtime.sendMessage({ type: "decode-complete" }).catch(() => {});

    // Show notification badge
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#06b6d4" });
  } catch (e) {
    await chrome.storage.local.set({
      decodeState: "error",
      decodeResult: null,
      decodeError: e.message || "Failed to decode",
    });
    chrome.runtime.sendMessage({ type: "decode-error" }).catch(() => {});
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  }
});
