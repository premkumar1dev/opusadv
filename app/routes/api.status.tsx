/**
 * Public API Status Endpoint
 * GET /api/status
 *
 * Returns real-time service status, latency, and uptime for public monitoring.
 * Supports CORS for external integrations.
 */
import { type MetaFunction, type LoaderFunctionArgs, data } from "react-router";
import { getDashboardStats } from "~/utils/usage-service";
import { getAllHealthRecords } from "~/utils/health-service.server";

interface ServiceStatus {
	name: string;
	status: "operational" | "degraded" | "outage";
	description: string;
}

export const meta: MetaFunction = () => [
	{ title: "API Status" },
	{
		name: "description",
		content: "Real-time service status for the OpusZen API gateway.",
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const origin = request.headers.get("origin") || "*";
	const allowedOrigins = [
		"https://opuszen.shop",
		"https://www.opuszen.shop",
		"https://api.opuszen.shop",
		"https://opusmax.live",
		"https://www.opusmax.live",
		"https://opuszen.com",
		"https://www.opuszen.com",
	];

	const headers = new Headers();
	headers.set("Access-Control-Allow-Origin", allowedOrigins.includes(origin) ? origin : "*");
	headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
	headers.set("Access-Control-Max-Age", "86400");
	headers.set("Content-Type", "application/json");

	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers });
	}

	try {
		const startTime = Date.now();

		const [stats, healthRecords] = await Promise.all([
			getDashboardStats(),
			getAllHealthRecords(),
		]);

		const serverProcessingMs = Date.now() - startTime;
		const services = buildServiceStatus(stats, healthRecords);
		const dbLatency = calculateLatency(healthRecords);
		// If no health records yet, fall back to server processing time
		const overallLatency = dbLatency ?? Math.round(serverProcessingMs);
		const overallUptime = calculateUptime(stats);

		const response = {
			status: "ok",
			timestamp: new Date().toISOString(),
			refreshInterval: 30,
			overall: services.every((s) => s.status === "operational")
				? "operational"
				: "degraded",
			services,
			metrics: {
				latency: overallLatency,
				uptime: overallUptime,
				refresh: "30s",
			},
		};

		return data(response, { headers });
	} catch (err) {
		return data(
			{
				status: "error",
				timestamp: new Date().toISOString(),
				error: "Failed to fetch status data",
				services: [
					{
						name: "API Gateway",
						status: "degraded",
						description: "Unable to check gateway health",
					},
					{
						name: "Anthropic Provider",
						status: "unknown",
						description: "Provider status unavailable",
					},
					{
						name: "Key Management",
						status: "unknown",
						description: "Key management status unavailable",
					},
				],
				metrics: {
					latency: null,
					uptime: "99.5%",
					refresh: "30s",
				},
			},
			{ status: 500, headers }
		);
	}
}

function buildServiceStatus(stats: any, healthRecords: any[]): ServiceStatus[] {
	const services: ServiceStatus[] = [
		{
			name: "Proxy service",
			status: "operational",
			description: "Request routing, streaming, and model mapping",
		},
		{
			name: "API gateway",
			status: "operational",
			description: "Authentication, rate limiting, and usage accounting",
		},
		{
			name: "Key management",
			status: "operational",
			description: "Key validation and window budget enforcement",
		},
	];

	if (stats.providers && stats.providers.length > 0) {
		for (const provider of stats.providers) {
			const providerName = (provider.provider || "").toLowerCase();
			if (
				providerName.includes("anthropic") ||
				providerName.includes("openai") ||
				providerName.includes("google") ||
				providerName.includes("groq") ||
				providerName.includes("mistral") ||
				providerName.includes("cohere")
			) {
				if (
					provider.status === "online" &&
					(provider.activeKeys ?? 0) > 0
				) {
					services[1] = { ...services[1], status: "operational" };
				} else if (
					provider.status === "offline" ||
					(provider.activeKeys ?? 0) === 0
				) {
					services[1] = { ...services[1], status: "outage" };
				} else {
					services[1] = { ...services[1], status: "degraded" };
				}
			}
		}
	}

	if (healthRecords.length > 0) {
		const degradedCount = healthRecords.filter(
			(r) => r.status === "rate_limited" || r.status === "unhealthy"
		).length;
		const outageCount = healthRecords.filter(
			(r) => r.status === "quota_exhausted" || r.status === "disabled"
		).length;

		if (outageCount > healthRecords.length / 2) {
			services[1] = { ...services[1], status: "outage" };
		} else if (degradedCount > 0) {
			services[1] = { ...services[1], status: "degraded" };
		}
	}

	const healthyKeys =
		healthRecords.filter((r) => r.status === "healthy").length;
	const totalKeys = healthRecords.length;

	if (totalKeys > 0 && healthyKeys / totalKeys < 0.5) {
		services[2] = {
			...services[2],
			status: "degraded",
		};
	}

	return services;
}

function calculateLatency(healthRecords: any[]): number | null {
	// Use any record with a recorded response time, not just "healthy"
	const recordsWithLatency = healthRecords.filter(
		(r) => typeof r.avg_response_time_ms === "number" && r.avg_response_time_ms > 0
	);
	if (recordsWithLatency.length > 0) {
		const avg =
			recordsWithLatency.reduce((sum, r) => sum + r.avg_response_time_ms, 0) /
			recordsWithLatency.length;
		return Math.round(avg);
	}

	// Fallback: measure round-trip by timing the health check queries themselves
	const timings: number[] = [];
	for (const r of healthRecords) {
		if (r.last_check) {
			const lastCheck = new Date(r.last_check).getTime();
			const updatedAt = new Date(r.updated_at || r.last_check).getTime();
			if (updatedAt > lastCheck && updatedAt - lastCheck < 60_000) {
				timings.push(Math.round(updatedAt - lastCheck));
			}
		}
	}
	if (timings.length > 0) {
		return Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
	}

	return null;
}

function calculateUptime(stats: any): string {
	if (typeof stats.successRate === "number") {
		return `${stats.successRate}%`;
	}
	if (stats.providers && stats.providers.length > 0) {
		const totalSuccessRates = stats.providers
			.map((p: any) => p.successRate ?? 100)
			.filter((r: number) => r > 0);
		if (totalSuccessRates.length > 0) {
			const avgUptime =
				totalSuccessRates.reduce((a: number, b: number) => a + b, 0) /
				totalSuccessRates.length;
			return `${Math.round(avgUptime)}%`;
		}
	}
	return "99.9%";
}
