# SignalDecoder Chrome Extension

Highlight any crypto signal on any webpage, right-click, and decode it into plain English.

## Load in Chrome (Development)

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The SignalDecoder icon appears in your toolbar

## How to Use

1. **Highlight** any crypto signal text on a webpage
2. **Right-click** and choose **"Decode this signal"**
3. Click the **SignalDecoder extension icon** to see the result
4. View: sentiment, risk level, timeframe, plain English explanation, key terms
5. Click **"View full decode"** to see it on signaldecoder.app

## Publish to Chrome Web Store

1. Zip the contents of this folder: `cd chrome-extension && zip -r ../signaldecoder-extension.zip . -x "README.md"`
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click **New Item** and upload the zip
4. Fill in the listing: screenshots, description, category (Productivity)
5. Submit for review (typically 1-3 business days)

## Files

- `manifest.json` — Manifest V3 config
- `background.js` — Context menu + decode API call
- `popup.html` / `popup.js` — Results popup UI
- `content.js` — Page-extension bridge
- `styles.css` — Dark theme matching signaldecoder.app
- `icons/` — Extension icons (16, 48, 128px)
