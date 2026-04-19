const root = document.getElementById("root");

function render() {
  chrome.storage.local.get(
    ["decodeState", "decodeSignal", "decodeResult", "decodeError"],
    (data) => {
      const { decodeState, decodeSignal, decodeResult, decodeError } = data;

      if (decodeState === "loading") {
        root.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <div class="loading-text">Decoding signal...</div>
          </div>
        `;
        return;
      }

      if (decodeState === "error") {
        root.innerHTML = `
          <div class="error">${escHtml(decodeError || "Failed to decode signal.")}</div>
        `;
        return;
      }

      if (decodeState === "done" && decodeResult) {
        renderResult(decodeSignal, decodeResult);
        // Clear badge
        chrome.action.setBadgeText({ text: "" });
        return;
      }

      // Default empty state
      root.innerHTML = `
        <div class="empty">
          <p>No signal decoded yet.</p>
          <p class="hint">Highlight text on any page, right-click, and choose "Decode this signal".</p>
        </div>
      `;
    }
  );
}

function renderResult(signal, r) {
  const sentimentClass =
    r.sentiment === "Bullish" ? "badge-bullish" :
    r.sentiment === "Bearish" ? "badge-bearish" : "badge-neutral";
  const sentimentIcon =
    r.sentiment === "Bullish" ? "\u2191" :
    r.sentiment === "Bearish" ? "\u2193" : "\u2194";

  const riskClass =
    r.riskLevel === "Low" ? "badge-risk-low" :
    r.riskLevel === "High" ? "badge-risk-high" : "badge-risk-medium";

  const coin = r.coin ? `<div class="coin-tag">${escHtml(r.coin.symbol)}</div>` : "";

  const glossaryHtml = r.glossary && r.glossary.length > 0
    ? `<div class="glossary">
        <div class="label">Key Terms</div>
        ${r.glossary.slice(0, 5).map((g) => `
          <div class="glossary-item">
            <span class="glossary-term">${escHtml(g.term)}</span>
            <span class="glossary-def">${escHtml(g.definition)}</span>
          </div>
        `).join("")}
      </div>`
    : "";

  const slug = r.slug;
  const linkHtml = slug
    ? `<a class="view-link" href="https://signaldecoder.app/signal/${escAttr(slug)}" target="_blank">
        View full decode &rarr;
      </a>`
    : `<a class="view-link" href="https://signaldecoder.app/app" target="_blank">
        Open SignalDecoder &rarr;
      </a>`;

  root.innerHTML = `
    ${signal ? `<div class="signal-text">${escHtml(truncate(signal, 150))}</div>` : ""}
    ${coin}
    <div class="badges">
      <span class="badge ${sentimentClass}">${sentimentIcon} ${escHtml(r.sentiment)}</span>
      <span class="badge ${riskClass}">${escHtml(r.riskLevel)} Risk</span>
      <span class="badge badge-timeframe">${escHtml(r.timeframe)}</span>
    </div>
    <div class="explanation">
      <div class="label">Plain English</div>
      <p>${escHtml(r.explanation)}</p>
    </div>
    ${glossaryHtml}
    ${linkHtml}
  `;
}

function escHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(s) {
  return s.replace(/[^a-z0-9]/gi, "");
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "\u2026";
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "decode-started" || msg.type === "decode-complete" || msg.type === "decode-error") {
    render();
  }
});

// Render on open
render();
