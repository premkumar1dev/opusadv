import { type ActionFunctionArgs } from "react-router";
import { supabaseServer } from "~/utils/supabase.server";
import crypto from "node:crypto";

function generateChildKey(): string {
	return "za_" + crypto.randomBytes(20).toString("base64url").slice(0, 20);
}

function jsonResponse(body: any, error?: string, status = 200): Response {
	const payload =
		typeof body === "boolean"
			? { success: body, ...(error ? { error } : {}) }
			: body;
	return new Response(JSON.stringify(payload), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
	const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie") || "";
	const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
	if (!accessTokenMatch) return null;

	try {
		const { data, error } = await supabaseServer.auth.getUser(accessTokenMatch[1]);
		if (error || !data.user) return null;
		return data.user.id;
	} catch {
		return null;
	}
}

/**
 * POST /api/child-keys
 *
 * Body (FormData):
 * action = "create" | "list" | "delete" | "revoke"
 * parentKeyId — UUID of the parent key
 * keyName — name for the new child key (create only)
 * childKeyId — UUID of child to delete/revoke
 */
export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return jsonResponse(false, "Method not allowed", 405);
	}

	try {
		const userId = await getAuthenticatedUserId(request);
		if (!userId) {
			return jsonResponse(false, "Authentication required", 401);
		}

		const formData = await request.formData();
		const action = (formData.get("action") as string) || "list";

		switch (action) {
			case "create": {
				const parentKeyId = formData.get("parentKeyId") as string;
				const keyName = (formData.get("keyName") as string) || "Child Key";

				if (!parentKeyId) {
					return jsonResponse(false, "Missing parentKeyId", 400);
				}

				// Verify parent exists and is owned by this user
				const { data: parent } = await supabaseServer
					.from("user_api_keys")
					.select("id, name, status, plan_name, pricing_type, rate_limit, expiry_date, tokens_limit, allocated_credits, remaining_credits, allowed_models, allowed_providers, price_per_1m_input_tokens, price_per_1m_output_tokens")
					.eq("id", parentKeyId)
					.eq("user_id", userId)
					.single();

				if (!parent) {
					return jsonResponse(false, "Parent key not found", 404);
				}
				if (parent.status !== "active") {
					return jsonResponse(false, "Parent key is not active", 400);
				}

				// Check if parent is already a child key — allow chaining (max depth 5)
				const { data: chainCheck } = await supabaseServer
					.from("user_api_keys")
					.select("parent_key_id")
					.eq("id", parentKeyId)
					.single();

				let depth = 0;
				let cursor = chainCheck?.parent_key_id;
				while (cursor && depth < 5) {
					const { data: ancestor } = await supabaseServer
						.from("user_api_keys")
						.select("parent_key_id")
						.eq("id", cursor)
						.single();
					cursor = ancestor?.parent_key_id || null;
					depth++;
				}
				if (depth >= 5) {
					return jsonResponse(false, "Maximum child key depth reached", 400);
				}

				// Generate child key with za_ prefix (CSPRNG)
				const childKey = generateChildKey();

				// Compute expiry: inherit from parent, or default to parent's remaining time
				const parentExpiry = parent.expiry_date ? new Date(parent.expiry_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
				const now = Date.now();
				const expiryMs = Math.max(parentExpiry.getTime() - now, 24 * 60 * 60 * 1000); // at least 1 day
				const childExpiry = new Date(now + expiryMs);

				const { data: keyRow, error: keyError } = await supabaseServer
					.from("user_api_keys")
					.insert({
						user_id: userId,
						api_key: childKey,
						name: keyName,
						status: "active",
						parent_key_id: parentKeyId,
						plan_name: parent.plan_name,
						pricing_type: parent.pricing_type,
						rate_limit: Math.max(1, Math.floor((parent.rate_limit || 60) / 2)), // child gets half
						tokens_limit: parent.tokens_limit || 1_000_000,
						allocated_credits: parent.allocated_credits || 0,
						used_credits: 0,
						remaining_credits: parent.remaining_credits || 0,
						expiry_date: childExpiry.toISOString(),
						allowed_models: parent.allowed_models || [],
						allowed_providers: parent.allowed_providers || [],
						price_per_1m_input_tokens: parent.price_per_1m_input_tokens || 0,
						price_per_1m_output_tokens: parent.price_per_1m_output_tokens || 0,
						total_requests: 0,
						success_requests: 0,
						failed_requests: 0,
					})
					.select("id")
					.single();

				if (keyError || !keyRow?.id) {
					console.error("[api/child-keys] Insert failed:", keyError);
					return jsonResponse(false, keyError?.message || "Failed to create child key", 500);
				}

				return jsonResponse({ success: true, keyId: keyRow.id, key: childKey, parentName: parent.name });
			}

			case "list": {
				const parentKeyId = formData.get("parentKeyId") as string;
				if (!parentKeyId) {
					return jsonResponse(false, "Missing parentKeyId", 400);
				}

				const { data: children } = await supabaseServer
					.from("user_api_keys")
					.select("*")
					.eq("parent_key_id", parentKeyId)
					.order("created_at", { ascending: false });

				return jsonResponse({ success: true, children: children || [] });
			}

			case "revoke": {
				const childKeyId = formData.get("childKeyId") as string;
				if (!childKeyId) {
					return jsonResponse(false, "Missing childKeyId", 400);
				}

				const { error } = await supabaseServer
					.from("user_api_keys")
					.update({ status: "revoked" })
					.eq("id", childKeyId)
					.not("parent_key_id", "is", null);

				if (error) {
					return jsonResponse(false, error.message, 500);
				}

				return jsonResponse({ success: true });
			}

			case "delete": {
				const childKeyId = formData.get("childKeyId") as string;
				if (!childKeyId) {
					return jsonResponse(false, "Missing childKeyId", 400);
				}

				const { error } = await supabaseServer
					.from("user_api_keys")
					.delete()
					.eq("id", childKeyId)
					.not("parent_key_id", "is", null);

				if (error) {
					return jsonResponse(false, error.message, 500);
				}

				return jsonResponse({ success: true });
			}

			default:
				return jsonResponse(false, `Unknown action: ${action}`, 400);
		}
	} catch (err: any) {
		console.error("[api/child-keys] Unhandled error:", err);
		return jsonResponse(false, "Internal server error", 500);
	}
}
