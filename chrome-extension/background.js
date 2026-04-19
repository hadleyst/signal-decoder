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

  // Store loading state and open the popup window immediately
  await chrome.storage.local.set({
    decodeState: "loading",
    decodeSignal: signal,
    decodeResult: null,
    decodeError: null,
  });

  // Open popup.html in a small popup-style window so the user sees
  // the loading spinner right away. MV3 doesn't allow opening the
  // action popup programmatically, so we use a real window instead.
  const popupURL = chrome.runtime.getURL("popup.html");
  chrome.windows.create({
    url: popupURL,
    type: "popup",
    width: 420,
    height: 520,
    focused: true,
  });

  // Decode the signal
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

    // Notify the popup window to re-render
    chrome.runtime.sendMessage({ type: "decode-complete" }).catch(() => {});
  } catch (e) {
    await chrome.storage.local.set({
      decodeState: "error",
      decodeResult: null,
      decodeError: e.message || "Failed to decode",
    });
    chrome.runtime.sendMessage({ type: "decode-error" }).catch(() => {});
  }
});
