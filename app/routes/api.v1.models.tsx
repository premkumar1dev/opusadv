/**
 * API V1 Models Endpoint
 * GET /api/v1/models
 *
 * Returns the list of available models with context window info.
 */
import { type MetaFunction, type LoaderFunctionArgs, data } from "react-router";

export const meta: MetaFunction = () => [{ title: "Models" }];

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
	"Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key, anthropic-version, x-goog-api-key, X-Request-Id, X-Requested-With, Accept, api-key",
	"Access-Control-Max-Age": "86400",
};

export async function loader({ request }: LoaderFunctionArgs) {
	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

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
		// fallback to local models cache below
	}

	const models = [
		{ id: "opuslive-1", name: "OpusLive 1", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Frontier", owned_by: "opuslive", description: "OpusLive model via api.opuslive.pro proxy with handshake authentication." },
		{ id: "claude-fable-5", name: "Claude Fable 5", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Frontier", owned_by: "anthropic", description: "The most capable model in the lineup. Frontier reasoning and long-horizon agentic work." },
		{ id: "claude-opus-5", name: "Claude Opus 5", object: "model", created: 1772496000, launch_date: "Mar 1, 2026", context: "1,000,000", type: "Frontier", owned_by: "anthropic", description: "Highest capability for complex tasks." },
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
	];

	return data({
		object: "list",
		data: models.map((m) => ({
			id: m.id,
			name: m.name,
			context: m.context,
			type: m.type,
			created: m.created,
			launch_date: m.launch_date,
			owned_by: m.owned_by,
			description: m.description,
			object: "model",
		})),
	}, { headers: CORS_HEADERS });
}
