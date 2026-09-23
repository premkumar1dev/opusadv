/**
 * User API Key Management Service
 * Handles user key generation, validation, credits, expiry, rate limits
 */
import { supabaseServer as supabase } from "~/utils/supabase.server";
import crypto from "node:crypto";
import type { UserApiKeyRow, UserApiKeyInput } from "~/types/gateway";
export type { UserApiKeyRow, UserApiKeyInput };

const KEY_PREFIX = "sk_live_";

function generateApiKey(): string {
 const bytes = crypto.randomBytes(24);
 const b64 = bytes.toString("base64url");
 return `${KEY_PREFIX}${b64}`;
}

function maskKey(key: string): string {
	if (key.length <= 6) return "****";
	const visible = Math.max(4, Math.ceil(key.length * 0.3));
	return `${key.slice(0, visible)}****`;
}

export async function createUserApiKey(input: UserApiKeyInput): Promise<UserApiKeyRow> {
 const apiKey = generateApiKey();
 const now = new Date().toISOString();

 const { data, error } = await (supabase
 .from('user_api_keys') as any)
 .insert({
 user_id: input.user_id,
 api_key: apiKey,
 name: input.name ?? 'Default Key',
 status: 'active',
 allocated_credits: input.allocated_credits ?? 0,
 used_credits: 0,
 remaining_credits: input.allocated_credits ?? 0,
 expiry_date: input.expiry_date ?? null,
 rate_limit: input.rate_limit ?? 60,
 allowed_models: input.allowed_models ?? [],
 allowed_providers: input.allowed_providers ?? [],
 total_requests: 0,
 success_requests: 0,
 failed_requests: 0,
 last_used: null,
 })
 .select()
 .single();

 if (error) throw new Error(`Failed to create user API key: ${error.message}`);
 return data as UserApiKeyRow;
}

export interface KeyValidationResult {
	valid: boolean;
	key?: UserApiKeyRow;
	status: number;
	error?: string;
	errorType?: string;
}

export async function validateUserApiKeyDetailed(apiKey: string): Promise<KeyValidationResult> {
	if (!apiKey) {
		return {
			valid: false,
			status: 401,
			error: "Missing API key. Provide Authorization: Bearer <key> or x-api-key header.",
			errorType: "authentication_error",
		};
	}

	const cleanKey = apiKey
		.trim()
		.replace(/^Bearer\s+/i, "")
		.trim()
		.replace(/^["']|["']$/g, "")
		.trim();

	if (!cleanKey) {
		return {
			valid: false,
			status: 401,
			error: "Empty API key provided.",
			errorType: "authentication_error",
		};
	}

	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey);

	// 1. Check user_api_keys table
	const { data, error } = await supabase
		.from('user_api_keys')
		.select('*')
		.or(isUuid ? `api_key.eq.${cleanKey},id.eq.${cleanKey}` : `api_key.eq.${cleanKey}`)
		.maybeSingle();

	if (data && !error) {
		const key = data as UserApiKeyRow;

		// Check expiry
		if (key.status === 'expired' || (key.expiry_date && new Date(key.expiry_date) < new Date())) {
			if (key.status !== 'expired') {
				await supabase.from('user_api_keys').update({ status: 'expired' }).eq('id', key.id);
			}
			return {
				valid: false,
				status: 401,
				error: "OpusZen API key has expired. Please renew your subscription or generate a new key.",
				errorType: "authentication_error",
			};
		}

		// Check credit depletion
		if (key.status === 'disabled' || (key.allocated_credits > 0 && (key.remaining_credits ?? 0) <= 0)) {
			if (key.status !== 'disabled') {
				await supabase.from('user_api_keys').update({ status: 'disabled' }).eq('id', key.id);
			}
			return {
				valid: false,
				status: 402,
				error: "Insufficient credits. Your OpusZen credit balance is exhausted. Please top up your account.",
				errorType: "quota_exceeded",
			};
		}

		if (key.status === 'revoked') {
			return {
				valid: false,
				status: 403,
				error: "OpusZen API key has been revoked. Please generate a new key.",
				errorType: "permission_error",
			};
		}

		return {
			valid: true,
			key,
			status: 200,
		};
	}

	// 2. Also check master_api_keys table (for direct admin testing)
	try {
		const { getAllMasterKeys } = await import("~/utils/master-key-service");
		const allMasters = await getAllMasterKeys().catch(() => []);
		const masterData = allMasters.find((m) => (m.api_key === cleanKey || m.id === cleanKey) && m.status !== 'disabled');

		if (masterData) {
			return {
				valid: true,
				key: {
					id: masterData.id,
					user_id: 'master_admin',
					api_key: masterData.api_key,
					name: masterData.name || 'Master Gateway Key',
					status: 'active',
					allocated_credits: masterData.total_credits || 999999,
					used_credits: masterData.used_credits || 0,
					remaining_credits: masterData.remaining_credits || masterData.total_credits || 999999,
					expiry_date: null,
					rate_limit: 10000,
					allowed_models: [],
					allowed_providers: [],
					total_requests: masterData.total_requests || 0,
					success_requests: masterData.success_requests || 0,
					failed_requests: masterData.failed_requests || 0,
					last_used: masterData.last_used || null,
					plan_name: 'Enterprise Master',
					pricing_type: 'per_request',
					price_per_1m_input_tokens: 0,
					price_per_1m_output_tokens: 0,
					created_at: masterData.created_at || new Date().toISOString(),
					updated_at: masterData.updated_at || new Date().toISOString(),
				} as unknown as UserApiKeyRow,
				status: 200,
			};
		}
	} catch {
		// ignore
	}

	return {
		valid: false,
		status: 401,
		error: cleanKey.startsWith(KEY_PREFIX)
			? "Invalid OpusZen API key. The key provided is not recognized by the gateway."
			: "Invalid API key provided.",
		errorType: "authentication_error",
	};
}

export async function validateUserApiKey(apiKey: string): Promise<UserApiKeyRow | null> {
	const result = await validateUserApiKeyDetailed(apiKey);
	return result.valid ? (result.key ?? null) : null;
}

export async function getUserApiKeys(userId: string): Promise<UserApiKeyRow[]> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .eq('user_id', userId)
 .order('created_at', { ascending: false });

 if (error) throw new Error(`Failed to fetch user keys: ${error.message}`);
 return (data ?? []) as UserApiKeyRow[];
}

export async function getAllUserApiKeys(): Promise<UserApiKeyRow[]> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) throw new Error(`Failed to fetch user keys: ${error.message}`);
 return (data ?? []) as UserApiKeyRow[];
}

export async function getUserApiKeyById(id: string): Promise<UserApiKeyRow | null> {
 const { data, error } = await supabase
 .from('user_api_keys')
 .select('*')
 .eq('id', id)
 .single();

 if (error) return null;
 return data as UserApiKeyRow;
}

export async function updateUserApiKey(id: string, updates: Partial<UserApiKeyRow>): Promise<void> {
 const { error } = await (supabase
 .from('user_api_keys') as any)
 .update({ ...updates, updated_at: new Date().toISOString() })
 .eq('id', id);

 if (error) throw new Error(`Failed to update user key: ${error.message}`);
}

export async function deleteUserApiKey(id: string): Promise<void> {
 const { error } = await supabase.from('user_api_keys').delete().eq('id', id);
 if (error) throw new Error(`Failed to delete user key: ${error.message}`);
}

export async function regenerateUserApiKey(id: string): Promise<UserApiKeyRow> {
 const newKey = generateApiKey();
 const { data, error } = await (supabase
 .from('user_api_keys') as any)
 .update({ api_key: newKey, updated_at: new Date().toISOString() })
 .eq('id', id)
 .select()
 .single();

 if (error) throw new Error(`Failed to regenerate key: ${error.message}`);
 return data as UserApiKeyRow;
}

export async function recordUserKeyUsage(
	keyId: string,
	tokensUsed: number,
	creditsUsed: number,
	success: boolean,
	planTokenPricing?: { input: number; output: number } | null,
	deductCredits: boolean = true,
): Promise<void> {
	const key = await getUserApiKeyById(keyId);
	if (!key) {
		console.error(`[user-key-service] recordUserKeyUsage: key not found for id ${keyId}`);
		return;
	}

	// Per-token plan: recalculate credits from plan pricing + actual token usage
	let effectiveCredits = creditsUsed;
	if (planTokenPricing && (planTokenPricing.input > 0 || planTokenPricing.output > 0)) {
		const inputCredits = key.last_prompt_tokens
			? (key.last_prompt_tokens / 1_000_000) * planTokenPricing.input
			: 0;
		const outputCredits = key.last_completion_tokens
			? (key.last_completion_tokens / 1_000_000) * planTokenPricing.output
			: 0;
		if (key.last_prompt_tokens && key.last_completion_tokens) {
			effectiveCredits = Math.round((inputCredits + outputCredits) * 10_000) / 10_000;
		}
	}

	const updates: any = {
		total_requests: key.total_requests + 1,
		last_used: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	if (success) {
		updates.success_requests = key.success_requests + 1;
	} else {
		updates.failed_requests = key.failed_requests + 1;
	}

	// Only deduct credits when the caller hasn't already done so (e.g. the gateway
	// updates remaining_credits independently; setting deductCredits=false avoids
	// double-counting).
	if (deductCredits) {
		const newUsed = key.used_credits + effectiveCredits;
		const newRemaining = Math.max(0, key.allocated_credits - newUsed);
		updates.used_credits = newUsed;
		updates.remaining_credits = newRemaining;

		if (newRemaining <= 0 && key.allocated_credits > 0) {
			updates.status = 'disabled';
		}
	}

	try {
		await updateUserApiKey(keyId, updates);
	} catch (err) {
		console.error(`[user-key-service] Failed to update key ${keyId}:`, err);
		throw err;
	}

	// Record credit history (best-effort — don't block the response on this)
	try {
		const balanceAfter = deductCredits
			? updates.remaining_credits ?? key.remaining_credits
			: key.remaining_credits;
		await recordCreditHistory(
			key.user_id,
			keyId,
			'used',
			deductCredits ? effectiveCredits : 0,
			balanceAfter,
			planTokenPricing ? 'API request (per-token)' : 'API request',
		);
	} catch (err) {
		console.error(`[user-key-service] Failed to record credit history for key ${keyId}:`, err);
	}
}

export async function resetUserKeyUsage(id: string): Promise<void> {
 const key = await getUserApiKeyById(id);
 if (!key) return;

 await updateUserApiKey(id, {
 used_credits: 0,
 remaining_credits: key.allocated_credits,
 total_requests: 0,
 success_requests: 0,
 failed_requests: 0,
 status: 'active',
 });

 await recordCreditHistory(key.user_id, id, 'reset', 0, key.allocated_credits, 'Usage reset by admin');
}

export async function disableUserApiKey(id: string): Promise<void> {
 await updateUserApiKey(id, { status: 'disabled' });
}

export async function enableUserApiKey(id: string): Promise<void> {
 await updateUserApiKey(id, { status: 'active' });
}

export async function extendUserKeyExpiry(id: string, newExpiry: string): Promise<void> {
 await updateUserApiKey(id, { expiry_date: newExpiry, status: 'active' });
}

// ---------------------------------------------------------------------------
// Credit history
// ---------------------------------------------------------------------------
export async function recordCreditHistory(
 userId: string,
 keyId: string | null,
 action: 'allocated' | 'used' | 'refunded' | 'reset' | 'expired' | 'purchased',
 amount: number,
 balanceAfter: number,
 description: string
): Promise<void> {
 await supabase.from('user_credit_history').insert({
 user_id: userId,
 user_api_key_id: keyId,
 action,
 amount,
 balance_after: balanceAfter,
 description,
 });
}

// ---------------------------------------------------------------------------
// Masked key helpers (safe for display)
// ---------------------------------------------------------------------------
export { maskKey };
