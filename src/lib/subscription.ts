/**
 * Shared helper for checking whether a subscriptions row represents an active Pro user.
 *
 * The subtle bug this fixes: `new Date(null) > new Date()` is always false
 * (because `new Date(null)` is 1970-01-01). So when the webhook couldn't
 * determine `current_period_end` and stored null, every route wrongly
 * reported the user as unsubscribed despite status='active'.
 *
 * Policy: if status is 'active', treat the user as subscribed. If we also
 * have a period_end, it must be in the future. If it's null (unknown), we
 * trust Stripe to transition the status to 'canceled' or 'past_due' via
 * webhook — so 'active' alone is sufficient.
 */
export function isActiveSubscription(
  data: { status?: string | null; current_period_end?: string | null } | null | undefined
): boolean {
  if (!data || data.status !== "active") return false;
  if (!data.current_period_end) return true; // unknown period → trust status
  return new Date(data.current_period_end) > new Date();
}
