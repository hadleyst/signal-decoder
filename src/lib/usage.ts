export const FREE_LIMIT = 5;
export const EMAIL_GATE_AT = 2;

const STORAGE_KEY = "signaldecoder_uses";
const EMAIL_KEY = "signaldecoder_email_captured";

export function getUsageCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

export function incrementUsage(): number {
  const count = getUsageCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(count));
  return count;
}

export function hasReachedLimit(): boolean {
  return getUsageCount() >= FREE_LIMIT;
}

export function resetUsage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isEmailCaptured(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(EMAIL_KEY) === "1";
}

export function setEmailCaptured(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMAIL_KEY, "1");
}
