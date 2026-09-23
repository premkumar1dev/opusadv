/**
 * Persistent Rate Limiter
 *
 * Uses a Supabase-backed sliding-window counter with an atomic PL/pgSQL
 * function (`increment_rate_limit`) that checks and increments in a single
 * transaction, preventing race conditions under concurrent requests.
 *
 * Window: 1-minute sliding window (configurable via gateway_config).
 * Key: one row per user_api_key_id per minute bucket.
 */

import { supabaseServer as supabase } from "~/utils/supabase.server";

const WINDOW_SECONDS = 60; // 1-minute window (matches gateway_config default)
const RPC_FUNCTION = "increment_rate_limit";

interface RateLimitRow {
	id: string;
	user_api_key_id: string;
	window_start: number; // unix seconds
	request_count: number;
}

const MAX_SAFE_REMAINING = 999999; // sentinel for "unlimited" remaining

const memoryBuckets = new Map<string, { count: number; windowStart: number }>();

/**
 * Returns true if the request is within the rate limit for this key.
 * Uses an atomic RPC to check-and-increment in a single transaction,
 * with fallback to an in-memory sliding window if RPC is missing.
 */
export async function checkRateLimit(
	userApiKeyId: string,
	limit: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
	if (!limit || limit <= 0 || userApiKeyId === 'passthrough') {
		return { allowed: true, remaining: MAX_SAFE_REMAINING };
	}

	try {
		// Use the atomic RPC function — single DB round-trip, no race condition
		const { data, error } = await supabase.rpc(RPC_FUNCTION, {
			p_user_api_key_id: userApiKeyId,
			p_limit: limit,
			p_window_seconds: WINDOW_SECONDS,
		});

		if (!error && data) {
			const result = data as { allowed: boolean; remaining: number; retry_after: number | null };
			return {
				allowed: result.allowed,
				remaining: result.remaining,
				...(result.retry_after ? { retryAfter: result.retry_after } : {}),
			};
		}
	} catch (err) {
		console.warn("[rateLimiter] DB RPC call threw, falling back to memory:", err);
	}

	// In-memory sliding window fallback if RPC does not exist in schema cache
	const now = Math.floor(Date.now() / 1000);
	const entry = memoryBuckets.get(userApiKeyId) || { count: 0, windowStart: now };
	if (now - entry.windowStart >= WINDOW_SECONDS) {
		entry.count = 1;
		entry.windowStart = now;
		memoryBuckets.set(userApiKeyId, entry);
		return { allowed: true, remaining: Math.max(0, limit - 1) };
	}

	if (entry.count < limit) {
		entry.count += 1;
		memoryBuckets.set(userApiKeyId, entry);
		return { allowed: true, remaining: Math.max(0, limit - entry.count) };
	}

	return {
		allowed: false,
		remaining: 0,
		retryAfter: Math.max(1, WINDOW_SECONDS - (now - entry.windowStart)),
	};
}

/**
 * Purge rate-limit rows older than 2x the window so the table doesn't grow
 * unbounded. Safe to call periodically (e.g., from a cron or on each request).
 */
export async function pruneOldRateLimits(): Promise<number> {
	const cutoff = Math.floor(Date.now() / 1000) - (WINDOW_SECONDS * 2);
	const { error, count } = await supabase
		.from("user_rate_limits")
		.delete()
		.lt("window_start", cutoff);

	if (error) {
		console.error("[rateLimiter] Prune failed:", error);
		return 0;
	}
	return count ?? 0;
}
