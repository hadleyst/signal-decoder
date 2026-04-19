interface GlossaryItem {
  term: string;
  definition: string;
}

interface DecodeResult {
  explanation: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  riskLevel: "Low" | "Medium" | "High";
  timeframe: string;
  glossary: GlossaryItem[];
}

const WIDTH = 1080;
const HEIGHT = 1350;

const SENTIMENT_COLORS = {
  Bullish: { text: "#34d399", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", icon: "\u2191" },
  Bearish: { text: "#f87171", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)", icon: "\u2193" },
  Neutral: { text: "#fbbf24", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", icon: "\u2194" },
};

const RISK_COLORS = {
  Low: { text: "#34d399", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
  Medium: { text: "#fbbf24", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  High: { text: "#f87171", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" },
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "\u2026";
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Rounded square background with cyan gradient
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(1, "#06b6d4");

  ctx.save();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.15;
  roundedRect(ctx, x, y, size, size, size * 0.22);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = grad;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  roundedRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, size * 0.22);
  ctx.stroke();
  ctx.restore();

  // Chart line (8,22 → 13,16 → 17,19 → 23,12 → 28,17 in a 36x36 viewBox)
  const s = size / 36;
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, y + 22 * s);
  ctx.lineTo(x + 13 * s, y + 16 * s);
  ctx.lineTo(x + 17 * s, y + 19 * s);
  ctx.lineTo(x + 23 * s, y + 12 * s);
  ctx.lineTo(x + 28 * s, y + 17 * s);
  ctx.stroke();

  // End dot
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(x + 28 * s, y + 17 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  colors: { text: string; bg: string; border: string },
  icon?: string,
) {
  // Background + border
  ctx.fillStyle = colors.bg;
  roundedRect(ctx, x, y, w, h, 20);
  ctx.fill();

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, w, h, 20);
  ctx.stroke();

  // Label
  ctx.fillStyle = "rgba(156, 163, 175, 0.9)";
  ctx.font = "600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label.toUpperCase(), x + w / 2, y + 24);

  // Icon (optional, large)
  if (icon) {
    ctx.fillStyle = colors.text;
    ctx.font = "700 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(icon, x + w / 2, y + 54);
    // Value below
    ctx.font = "700 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(value, x + w / 2, y + h - 44);
  } else {
    // Value centered
    ctx.fillStyle = colors.text;
    ctx.font = "700 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(value, x + w / 2, y + h / 2);
  }
}

export async function generateShareImage(result: DecodeResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  // Background
  ctx.fillStyle = "#0a0b0f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle grid overlay
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < WIDTH; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, HEIGHT);
    ctx.stroke();
  }
  for (let gy = 0; gy < HEIGHT; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(WIDTH, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Header glow (top radial cyan)
  const glow = ctx.createRadialGradient(WIDTH / 2, 120, 0, WIDTH / 2, 120, 600);
  glow.addColorStop(0, "rgba(6, 182, 212, 0.18)");
  glow.addColorStop(1, "rgba(6, 182, 212, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, 400);

  // Padding
  const PAD = 72;

  // Logo + wordmark
  const logoSize = 64;
  const logoY = 72;
  const wordmark = "SignalDecoder";
  ctx.font = "700 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const wordmarkWidth = ctx.measureText(wordmark).width;
  const totalW = logoSize + 20 + wordmarkWidth;
  const startX = (WIDTH - totalW) / 2;
  drawLogo(ctx, startX, logoY, logoSize);

  // Wordmark text (two colors)
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Signal", startX + logoSize + 20, logoY + logoSize / 2);
  const signalWidth = ctx.measureText("Signal").width;
  ctx.fillStyle = "#22d3ee";
  ctx.fillText("Decoder", startX + logoSize + 20 + signalWidth, logoY + logoSize / 2);

  // DECODED label
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(156, 163, 175, 0.85)";
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("SIGNAL DECODED", WIDTH / 2, 200);

  // Divider
  const divGrad = ctx.createLinearGradient(PAD, 0, WIDTH - PAD, 0);
  divGrad.addColorStop(0, "rgba(34, 211, 238, 0)");
  divGrad.addColorStop(0.5, "rgba(34, 211, 238, 0.5)");
  divGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = divGrad;
  ctx.fillRect(PAD + 60, 244, WIDTH - (PAD + 60) * 2, 1);

  // Explanation (big, wrapped)
  const explanation = truncate(result.explanation, 240);
  ctx.fillStyle = "#e2e4ea";
  ctx.font = "500 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const maxLineWidth = WIDTH - PAD * 2;
  const lines = wrapText(ctx, explanation, maxLineWidth);
  const maxLines = 6;
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const last = displayLines[maxLines - 1];
    displayLines[maxLines - 1] = last.replace(/\s*\S*$/, "") + "\u2026";
  }
  const lineHeight = 48;
  const explanationStartY = 300;
  displayLines.forEach((line, i) => {
    ctx.fillText(line, PAD, explanationStartY + i * lineHeight);
  });

  // Badges row
  const badgesY = 830;
  const badgeGap = 24;
  const badgeW = (WIDTH - PAD * 2 - badgeGap * 2) / 3;
  const badgeH = 180;

  const sentiment = SENTIMENT_COLORS[result.sentiment];
  const risk = RISK_COLORS[result.riskLevel];
  const timeframeColors = {
    text: "#e2e4ea",
    bg: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.1)",
  };

  drawBadge(
    ctx,
    PAD,
    badgesY,
    badgeW,
    badgeH,
    "Sentiment",
    result.sentiment,
    sentiment,
    sentiment.icon,
  );
  drawBadge(
    ctx,
    PAD + badgeW + badgeGap,
    badgesY,
    badgeW,
    badgeH,
    "Risk",
    result.riskLevel,
    risk,
  );

  // Timeframe: shorter text, so center it
  const tfText = truncate(result.timeframe, 24);
  drawBadge(
    ctx,
    PAD + (badgeW + badgeGap) * 2,
    badgesY,
    badgeW,
    badgeH,
    "Timeframe",
    tfText,
    timeframeColors,
  );

  // Redraw timeframe value with smaller font if truncated long
  // (drawBadge uses default 32px — override when text is long)
  if (tfText.length > 12) {
    ctx.fillStyle = "rgba(10, 11, 15, 1)";
    const bx = PAD + (badgeW + badgeGap) * 2;
    // Cover old text
    ctx.fillStyle = timeframeColors.bg;
    ctx.fillRect(bx + 8, badgesY + 60, badgeW - 16, badgeH - 70);
    // redraw label
    ctx.fillStyle = "rgba(156, 163, 175, 0.9)";
    ctx.font = "600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("TIMEFRAME", bx + badgeW / 2, badgesY + 24);
    // smaller value
    ctx.fillStyle = timeframeColors.text;
    ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(tfText, bx + badgeW / 2, badgesY + badgeH / 2);
    // redraw border
    ctx.strokeStyle = timeframeColors.border;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, bx, badgesY, badgeW, badgeH, 20);
    ctx.stroke();
  }

  // Footer URL
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("Decode any signal free at", WIDTH / 2, HEIGHT - 120);

  ctx.fillStyle = "#22d3ee";
  ctx.font = "700 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  ctx.fillText("signaldecoder.app", WIDTH / 2, HEIGHT - 78);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate image"));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate share image, then either use Web Share API (mobile) or
 * download the image + open a Twitter/X compose dialog (desktop).
 */
export async function shareSignal(result: DecodeResult, coinSymbol?: string, publicSlug?: string) {
  const blob = await generateShareImage(result);
  const file = new File([blob], "signaldecoder.png", { type: "image/png" });

  const coinText = coinSymbol ? ` $${coinSymbol}` : "";
  const linkUrl = publicSlug
    ? `signaldecoder.app/signal/${publicSlug}`
    : "signaldecoder.app";
  const tweetText = `Just decoded this${coinText} signal on SignalDecoder \uD83D\uDD0D\n\n${linkUrl}`;

  // Try Web Share API (works on mobile, some desktop browsers with file support)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text: tweetText, files: [file] });
        return;
      }
    } catch {
      // User cancelled or API unavailable — fall through to Twitter intent
    }
  }

  // Fallback: download image + open Twitter/X intent
  downloadBlob(blob, `signaldecoder-${Date.now()}.png`);
  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  window.open(twitterUrl, "_blank", "width=550,height=450");
}
