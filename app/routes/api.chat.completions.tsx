/**
 * API Gateway - Chat Completions Proxy
 * POST /api/chat/completions
 *
 * Flow:
 * 1. Extract user API key from Authorization header
 * 2. Validate key (active, not expired, has credits)
 * 3. Select best master API key by priority
 * 4. Forward request to upstream provider with automatic failover
 * 5. Log request and return response
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction, data } from "react-router";
import { handleGatewayRequest } from "~/utils/gateway-service";
import { checkRateLimit } from "~/utils/rate-limiter";
import type { UserApiKeyRow } from "~/utils/user-key-service";

const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const meta: MetaFunction = () => [{ title: "API Gateway" }];

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD, PUT, DELETE",
	"Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key, anthropic-version, x-goog-api-key, X-Request-Id, X-Requested-With, Accept, api-key",
	"Access-Control-Max-Age": "86400",
};

export async function loader({ request }: LoaderFunctionArgs) {
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	const url = new URL(request.url);
	if (url.pathname.endsWith("/models")) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000);
			const upstreamRes = await fetch("https://api.opusmax.live/v1/models", {
				headers: {
					"Accept": "application/json",
					...(request.headers.get("authorization") ? { "Authorization": request.headers.get("authorization")! } : {}),
					...(request.headers.get("x-api-key") ? { "x-api-key": request.headers.get("x-api-key")! } : {}),
				},
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			if (upstreamRes.ok) {
				const json: any = await upstreamRes.json().catch(() => null);
				if (json && (Array.isArray(json.data) || Array.isArray(json))) {
					return data(json, { headers: CORS_HEADERS });
				}
			}
		} catch {
			// fallback to local list
		}

		return data({
			object: "list",
			data: [
				{ id: "opuslive-1", name: "OpusLive 1", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Frontier", owned_by: "opuslive", description: "OpusLive model via api.opuslive.pro proxy with handshake authentication." },
				{ id: "claude-fable-5", name: "Claude Fable 5", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Frontier", owned_by: "anthropic", description: "The most capable model in the lineup. Frontier reasoning and long-horizon agentic work." },
				{ id: "claude-sonnet-5", name: "Claude Sonnet 5", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Popular", owned_by: "anthropic", description: "Frontier intelligence at Sonnet speed. The new default for day-to-day building." },
				{ id: "claude-opus-4-8", name: "Claude Opus 4.8", object: "model", created: 1754188800, launch_date: "Aug 3, 2025", context: "1,000,000", type: "Flagship", owned_by: "anthropic", description: "Flagship Opus. Adaptive thinking and sustained agentic coding across a 1M window." },
				{ id: "claude-opus-4-7", name: "Claude Opus 4.7", object: "model", created: 1751664000, launch_date: "Jul 5, 2025", context: "1,000,000", type: "Premium", owned_by: "anthropic", description: "The previous flagship. Still the pick for teams pinned to a known-good version." },
				{ id: "claude-opus-4-6", name: "Claude Opus 4.6", object: "model", created: 1748323200, launch_date: "May 27, 2025", context: "1,000,000", type: "Premium", owned_by: "anthropic", description: "Long-context Opus for deep repository work." },
				{ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", object: "model", created: 1748323200, launch_date: "May 27, 2025", context: "1,000,000", type: "Popular", owned_by: "anthropic", description: "The workhorse — balanced speed and reasoning for everyday tasks." },
				{ id: "claude-opus-4-5", name: "Claude Opus 4.5", object: "model", created: 1734048000, launch_date: "Dec 13, 2024", context: "200,000", type: "Premium", owned_by: "anthropic", description: "Opus-class reasoning on the 200K window." },
				{ id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", object: "model", created: 1759104000, launch_date: "Sep 29, 2025", context: "200,000", type: "Pinned", owned_by: "anthropic", description: "Dated Sonnet build for pinned, reproducible deployments." },
				{ id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", object: "model", created: 1759276800, launch_date: "Oct 1, 2025", context: "200,000", type: "Fast", owned_by: "anthropic", description: "The fastest model here. Built for high-throughput, latency-sensitive calls." },
				{ id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1", object: "model", created: 1754352000, launch_date: "Aug 5, 2025", context: "200,000", type: "Legacy", owned_by: "anthropic", description: "Kept available for workloads already tuned against it." },
				{ id: "claude-opus-4-20250514", name: "Claude Opus 4", object: "model", created: 1747180800, launch_date: "May 14, 2025", context: "200,000", type: "Legacy", owned_by: "anthropic", description: "Kept available for workloads already tuned against it." },
				{ id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", object: "model", created: 1747180800, launch_date: "May 14, 2025", context: "200,000", type: "Legacy", owned_by: "anthropic", description: "Kept available for workloads already tuned against it." },
				{ id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp", object: "model", created: 1734048000, launch_date: "Dec 13, 2024", context: "1,048,576", type: "Chat / Completion", owned_by: "google", description: "Google experimental Flash model." },
				{ id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", object: "model", created: 1733443200, launch_date: "Dec 6, 2024", context: "128,000", type: "Chat / Completion", owned_by: "groq", description: "Groq high-speed Llama 3.3 70B inference." },
				{ id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", object: "model", created: 1729555200, launch_date: "Oct 22, 2024", context: "200,000", type: "Chat / Completion", owned_by: "anthropic", description: "Anthropic Claude 3.5 Sonnet." },
				{ id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", object: "model", created: 1729555200, launch_date: "Oct 22, 2024", context: "200,000", type: "Chat / Completion", owned_by: "anthropic", description: "Anthropic Claude 3.5 Haiku." },
				{ id: "gpt-4o-mini", name: "GPT-4o Mini", object: "model", created: 1721260800, launch_date: "Jul 18, 2024", context: "128,000", type: "Chat / Completion", owned_by: "openai", description: "OpenAI GPT-4o Mini." },
				{ id: "gpt-4o", name: "GPT-4o", object: "model", created: 1715558400, launch_date: "May 13, 2024", context: "128,000", type: "Chat / Completion", owned_by: "openai", description: "OpenAI GPT-4o flagship model." },
				{ id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", object: "model", created: 1715644800, launch_date: "May 14, 2024", context: "2,097,152", type: "Chat / Completion", owned_by: "google", description: "Google Gemini 1.5 Pro with 2M context." },
				{ id: "claude-3-opus-20240229", name: "Claude 3 Opus", object: "model", created: 1709164800, launch_date: "Feb 29, 2024", context: "200,000", type: "Chat / Completion", owned_by: "anthropic", description: "Anthropic Claude 3 Opus." },
				{ id: "mistral-large-latest", name: "Mistral Large", object: "model", created: 1708905600, launch_date: "Feb 26, 2024", context: "128,000", type: "Chat / Completion", owned_by: "mistral", description: "Mistral Large flagship." },
			],
		}, { headers: CORS_HEADERS });
	}

	return data({
		status: "ok",
		service: "OpusZen API Gateway",
		version: "1.4.0",
		timestamp: new Date().toISOString(),
		endpoints: {
			chat: "/v1/chat/completions",
			messages: "/v1/messages",
			models: "/v1/models",
			keyStatus: "/api/key-status",
		},
	}, { headers: CORS_HEADERS });
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	const startTime = Date.now();

	try {
		// 1. Extract and validate user or master API key
		const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? request.headers.get("x-api-key") ?? request.headers.get("api-key") ?? "";
		const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

		if (!apiKey) {
			return data({ error: "Missing API key. Provide Authorization: Bearer <key> or x-api-key header." }, { status: 401, headers: CORS_HEADERS });
		}

		const validatedKey = await import("~/utils/user-key-service").then(m => m.validateUserApiKey(apiKey));
		const userKey: UserApiKeyRow = validatedKey ?? ({
			id: 'passthrough',
			user_id: 'passthrough',
			api_key: apiKey,
			name: 'OpusMax Direct Passthrough',
			status: 'active',
			allocated_credits: 999999,
			used_credits: 0,
			remaining_credits: 999999,
			expiry_date: null,
			rate_limit: 0,
			allowed_models: [],
			allowed_providers: [],
			total_requests: 0,
			success_requests: 0,
			failed_requests: 0,
			last_used: null,
			plan_name: 'Direct Passthrough',
			pricing_type: 'flat',
			price_per_1m_input_tokens: 0,
			price_per_1m_output_tokens: 0,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			last_prompt_tokens: 0,
			last_completion_tokens: 0,
		} as any as UserApiKeyRow);

		// 1b. Enforce body size limit to prevent memory exhaustion
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
			return data({ error: `Request body too large. Maximum size is ${MAX_BODY_SIZE_BYTES / 1024 / 1024} MB.` }, { status: 413, headers: CORS_HEADERS });
		}

		// 2. Parse request body
		let body: any;
		try {
			body = await request.json();
		} catch {
			return data({ error: "Invalid JSON body." }, { status: 400, headers: CORS_HEADERS });
		}

		// 3. Extract requested model
		const urlPath = new URL(request.url).pathname;
		const model = body.model ?? "claude-3-5-haiku-20241022";
		let provider = 'opusmax';

		// 3b. Enforce allowed models restriction
		if (userKey.allowed_models && userKey.allowed_models.length > 0) {
			const modelAllowed = userKey.allowed_models.some(
				(m: string) => model.toLowerCase().includes(m.toLowerCase())
			);
			if (!modelAllowed) {
				return data({
					error: `Model "${model}" is not allowed for this API key. Allowed: ${userKey.allowed_models.join(", ")}`,
				}, { status: 403, headers: CORS_HEADERS });
			}
		}

		// 3c. Enforce allowed providers restriction
		if (userKey.allowed_providers && userKey.allowed_providers.length > 0) {
			if (!userKey.allowed_providers.includes(provider)) {
				return data({
					error: `Provider "${provider}" is not allowed for this API key. Allowed: ${userKey.allowed_providers.join(", ")}`,
				}, { status: 403, headers: CORS_HEADERS });
			}
		}

		// 3d. Rate limiting (Supabase-backed sliding window)
		if (userKey.rate_limit && userKey.rate_limit > 0) {
			const rateResult = await checkRateLimit(userKey.id, userKey.rate_limit);
			if (!rateResult.allowed) {
				return data({
					error: `Rate limit exceeded. Max ${userKey.rate_limit} requests per minute.`,
					retry_after: rateResult.retryAfter,
				}, { status: 429, headers: CORS_HEADERS });
			}
		}

		const ctx = {
			requestId,
			userApiKey: userKey,
			provider,
			model,
			messages: body.messages ?? [],
			ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "",
			userAgent: request.headers.get("user-agent") ?? "",
			endpointPath: urlPath,
			body,
			headers: request.headers,
		};

		// 4. Execute gateway with failover
		const result = await handleGatewayRequest(ctx);

		// 5. Return response
		if (result.isSuccess) {
			if (result.isStream && result.stream) {
				return new Response(result.stream, {
					status: result.httpStatus === 0 ? 200 : result.httpStatus,
					headers: {
						...CORS_HEADERS,
						'Content-Type': result.contentType || 'text/event-stream',
						'Cache-Control': 'no-cache, no-transform',
						'Connection': 'keep-alive',
						'X-Request-Id': requestId,
						'X-Master-Key-Id': result.masterKeyId,
						'X-Provider': result.provider,
					},
				});
			}

			return data(result.responseBody ?? { choices: [] }, {
				status: result.httpStatus === 0 ? 200 : result.httpStatus,
				headers: {
					...CORS_HEADERS,
					'X-Request-Id': requestId,
					'X-Master-Key-Id': result.masterKeyId,
					'X-Provider': result.provider,
					'X-Retry-Count': String(result.retryNumber),
					'X-Tokens-Used': String(result.totalTokens),
					'X-Credits-Used': String(result.creditsUsed.toFixed(6)),
				},
			});
		} else {
			const status = result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
			return data({
				error: {
					message: result.errorMessage ?? 'Request failed',
					type: result.httpStatus === 503 ? 'service_unavailable' : 'api_error',
					request_id: requestId,
					retries: result.retryNumber,
				},
			}, { status, headers: CORS_HEADERS });
		}

	} catch (err: any) {
		console.error(`[gateway] Unhandled error for ${requestId}:`, err);
		return data({
			error: {
				message: "Internal gateway error. Please try again.",
				type: "internal_error",
				request_id: requestId,
			},
		}, { status: 500, headers: CORS_HEADERS });
	}
}
