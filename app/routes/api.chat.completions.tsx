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
import { corsHeaders } from "~/utils/cors";
import { validateUserApiKeyDetailed, type UserApiKeyRow } from "~/utils/user-key-service";

const MAX_BODY_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const meta: MetaFunction = () => [{ title: "API Gateway" }];

function maskKey(key?: string | null): string {
	if (!key) return "none";
	const trimmed = key.trim();
	if (trimmed.length <= 8) return "***";
	return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

function getCorsResponseHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get("origin");
	return corsHeaders(origin);
}

function handleOptionsPreflight(request: Request): Response {
	const origin = request.headers.get("origin") || "*";
	const requestHeaders = request.headers.get("access-control-request-headers")
		|| "Authorization, Content-Type, x-api-key, anthropic-version, anthropic-beta, x-goog-api-key, X-Request-Id, X-Requested-With, Accept, api-key";

	console.log(`[GATEWAY] OPTIONS PREFLIGHT | path=${new URL(request.url).pathname} origin=${origin}`);

	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD, PUT, DELETE",
			"Access-Control-Allow-Headers": requestHeaders,
			"Access-Control-Max-Age": "86400",
			"Access-Control-Allow-Credentials": "true",
		},
	});
}

export async function loader({ request }: LoaderFunctionArgs) {
	if (request.method === "OPTIONS") {
		return handleOptionsPreflight(request);
	}

	const cors = getCorsResponseHeaders(request);
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
					return data(json, { headers: cors });
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
		}, { headers: cors });
	}

	return data({
		status: "ok",
		service: "OpusZen API Gateway",
		version: "9.8.0",
		timestamp: new Date().toISOString(),
		endpoints: {
			chat: "/v1/chat/completions",
			messages: "/v1/messages",
			models: "/v1/models",
			keyStatus: "/api/key-status",
		},
	}, { headers: cors });
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method === "OPTIONS") {
		return handleOptionsPreflight(request);
	}

	const cors = getCorsResponseHeaders(request);
	const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	const urlPath = new URL(request.url).pathname;
	const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
	const userAgent = request.headers.get("user-agent") ?? "";

	console.log(`[GATEWAY] REQUEST RECEIVED | method=${request.method} path=${urlPath} id=${requestId} ip=${clientIp}`);

	try {
		// 1. Extract customer API key
		let authHeader = request.headers.get("authorization")
			?? request.headers.get("Authorization")
			?? request.headers.get("x-authorization")
			?? request.headers.get("x-api-key")
			?? request.headers.get("api-key")
			?? "";

		if (!authHeader) {
			const sc = request.headers.get("x-vercel-sc-headers");
			if (sc) {
				try {
					const parsed = JSON.parse(sc);
					authHeader = parsed["authorization"] || parsed["Authorization"] || parsed["x-authorization"] || parsed["x-api-key"] || parsed["api-key"] || "";
				} catch {}
			}
		}

		if (!authHeader) {
			for (const [k, v] of request.headers.entries()) {
				const lower = k.toLowerCase();
				if (lower === "authorization" || lower === "x-api-key" || lower === "api-key" || lower === "x-authorization") {
					authHeader = v;
					break;
				}
			}
		}

		if (!authHeader) {
			try {
				const url = new URL(request.url);
				authHeader = url.searchParams.get("api_key") || url.searchParams.get("key") || "";
			} catch {}
		}

		const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

		if (!apiKey) {
			console.log(`[GATEWAY] CUSTOMER AUTH RESULT | status=FAILED reason="Missing API key" id=${requestId}`);
			return data({
				type: "error",
				error: {
					type: "authentication_error",
					message: "Missing API key. Provide Authorization: Bearer <key> or x-api-key header.",
					status: 401,
					request_id: requestId,
				},
			}, { status: 401, headers: cors });
		}

		// 2. Strict Customer API Key Validation
		const valResult = await validateUserApiKeyDetailed(apiKey);

		if (!valResult.valid || !valResult.key) {
			console.log(`[GATEWAY] CUSTOMER AUTH RESULT | status=FAILED keyPrefix=${maskKey(apiKey)} error="${valResult.error}" id=${requestId}`);
			return data({
				type: "error",
				error: {
					type: valResult.errorType || "authentication_error",
					message: valResult.error || "Authentication failed. Invalid API key.",
					status: valResult.status || 401,
					request_id: requestId,
				},
			}, { status: valResult.status || 401, headers: cors });
		}

		const userKey: UserApiKeyRow = valResult.key;
		console.log(`[GATEWAY] CUSTOMER AUTH RESULT | status=SUCCESS user=${userKey.user_id} keyPrefix=${maskKey(apiKey)} credits=${userKey.remaining_credits} id=${requestId}`);

		// 3. Quota & Credit check
		if (userKey.allocated_credits > 0 && (userKey.remaining_credits ?? 0) <= 0) {
			console.log(`[GATEWAY] CUSTOMER QUOTA EXHAUSTED | user=${userKey.user_id} keyPrefix=${maskKey(apiKey)} id=${requestId}`);
			return data({
				type: "error",
				error: {
					type: "quota_exceeded",
					message: "Insufficient credits. Your OpusZen credit balance is exhausted. Please top up your account.",
					status: 402,
					request_id: requestId,
				},
			}, { status: 402, headers: cors });
		}

		// 4. Enforce body size limit
		const contentLength = request.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
			return data({
				type: "error",
				error: {
					type: "invalid_request_error",
					message: `Request body too large. Maximum size is ${MAX_BODY_SIZE_BYTES / 1024 / 1024} MB.`,
					status: 413,
					request_id: requestId,
				},
			}, { status: 413, headers: cors });
		}

		// 5. Parse request body
		let body: any;
		try {
			body = await request.json();
		} catch {
			return data({
				type: "error",
				error: {
					type: "invalid_request_error",
					message: "Invalid JSON body.",
					status: 400,
					request_id: requestId,
				},
			}, { status: 400, headers: cors });
		}

		// 6. Extract requested model and provider
		const model = body.model ?? "claude-3-5-haiku-20241022";
		let provider = 'opusmax';

		// 6b. Enforce allowed models restriction
		if (userKey.allowed_models && userKey.allowed_models.length > 0) {
			const modelAllowed = userKey.allowed_models.some(
				(m: string) => model.toLowerCase().includes(m.toLowerCase())
			);
			if (!modelAllowed) {
				return data({
					type: "error",
					error: {
						type: "permission_error",
						message: `Model "${model}" is not allowed for this API key. Allowed: ${userKey.allowed_models.join(", ")}`,
						status: 403,
						request_id: requestId,
					},
				}, { status: 403, headers: cors });
			}
		}

		// 6c. Enforce allowed providers restriction
		if (userKey.allowed_providers && userKey.allowed_providers.length > 0) {
			if (!userKey.allowed_providers.includes(provider)) {
				return data({
					type: "error",
					error: {
						type: "permission_error",
						message: `Provider "${provider}" is not allowed for this API key. Allowed: ${userKey.allowed_providers.join(", ")}`,
						status: 403,
						request_id: requestId,
					},
				}, { status: 403, headers: cors });
			}
		}

		// 6d. Rate limiting
		if (userKey.rate_limit && userKey.rate_limit > 0) {
			const rateResult = await checkRateLimit(userKey.id, userKey.rate_limit);
			if (!rateResult.allowed) {
				return data({
					type: "error",
					error: {
						type: "rate_limit_error",
						message: `Rate limit exceeded. Max ${userKey.rate_limit} requests per minute.`,
						status: 429,
						retry_after: rateResult.retryAfter,
						request_id: requestId,
					},
				}, { status: 429, headers: cors });
			}
		}

		const ctx = {
			requestId,
			userApiKey: userKey,
			provider,
			model,
			messages: body.messages ?? [],
			ipAddress: clientIp,
			userAgent,
			endpointPath: urlPath,
			body,
			headers: request.headers,
			signal: request.signal,
		};

		// 4. Execute gateway with failover
		const result = await handleGatewayRequest(ctx);

		// 7. Return response
		if (result.isSuccess) {
			console.log(`[GATEWAY] REQUEST COMPLETED | id=${requestId} status=${result.httpStatus || 200} tokens=${result.totalTokens} credits=${result.creditsUsed.toFixed(4)}`);

			if (result.isStream && result.stream) {
				return new Response(result.stream, {
					status: result.httpStatus === 0 ? 200 : result.httpStatus,
					headers: {
						...cors,
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
					...cors,
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
			const upstreamErrorObj = (result.responseBody as any)?.error;
			const rawMessage = typeof upstreamErrorObj === "string"
				? upstreamErrorObj
				: (upstreamErrorObj?.message || result.errorMessage || "Request failed");
			const errorType = upstreamErrorObj?.type
				|| (status === 401 ? "authentication_error"
					: status === 403 ? "permission_error"
					: status === 404 ? "not_found_error"
					: status === 429 ? "rate_limit_error"
					: status === 502 ? "bad_gateway"
					: status === 503 ? "service_unavailable"
					: "api_error");

			console.log(`[GATEWAY] REQUEST FAILED | id=${requestId} status=${status} errorType=${errorType}`);

			return data({
				type: "error",
				error: {
					type: errorType,
					message: rawMessage,
					status,
					request_id: requestId,
					retries: result.retryNumber,
					...(upstreamErrorObj && typeof upstreamErrorObj === "object" ? upstreamErrorObj : {}),
				},
			}, { status, headers: cors });
		}

	} catch (err: any) {
		console.error(`[GATEWAY] Unhandled error for ${requestId}:`, err);
		return data({
			type: "error",
			error: {
				message: "Internal gateway error. Please try again.",
				type: "internal_error",
				request_id: requestId,
			},
		}, { status: 500, headers: cors });
	}
}
