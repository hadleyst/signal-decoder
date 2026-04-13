export const FREE_LIMIT = 5;

const STORAGE_KEY = "signaldecoder_uses";

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
