/**
 * CORS utilities for API routes.
 *
 * Allowed origins are read from the CORS_ALLOWED_ORIGINS environment variable
 * (space-separated list) merged with a built-in production allowlist.
 * The header is set to the requesting origin only if it is in the allowlist,
 * otherwise the header is omitted entirely (no wildcard fallback).
 */

const BUILTIN_ALLOWED_ORIGINS = [
	"https://opuszen.shop",
	"https://api.opuszen.shop",
	"https://www.opuszen.shop",
	"https://api.opusmax.live",
	"https://opuszen.ai",
	"https://www.opuszen.ai",
	"http://localhost",
	"http://localhost:3000",
	"http://localhost:5173",
	"http://127.0.0.1",
	"http://127.0.0.1:3000",
	"http://127.0.0.1:5173",
	"capacitor://localhost",
	"electron://desktop",
];

function isOriginAllowed(origin: string | null): boolean {
	if (!origin || origin === "null") return true;
	const allowed = getAllowedOrigins();
	if (allowed.includes(origin)) return true;
	// Localhost and local IP patterns for desktop/dev tools (Claude Desktop, Electron, etc.)
	if (/^https?:\/\/localhost(:\d+)?$/i.test(origin)) return true;
	if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;
	if (/^(capacitor|electron|tauri|vscode-webview):\/\//i.test(origin)) return true;
	return false;
}

function parseAllowedOrigins(): string[] {
	const envOrigins =
		typeof process !== "undefined" && process.env?.CORS_ALLOWED_ORIGINS
			? process.env.CORS_ALLOWED_ORIGINS.split(/\s+/).filter(Boolean)
			: typeof import.meta !== "undefined" && import.meta.env?.VITE_CORS_ALLOWED_ORIGINS
				? import.meta.env.VITE_CORS_ALLOWED_ORIGINS.split(/\s+/).filter(Boolean)
				: [];

	const combined = new Set<string>([...BUILTIN_ALLOWED_ORIGINS, ...envOrigins]);
	return Array.from(combined);
}

let cachedOrigins: { origins: string[]; timestamp: number } | null = null;
const CORS_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

function getAllowedOrigins(): string[] {
	const now = Date.now();
	if (cachedOrigins && now - cachedOrigins.timestamp < CORS_CACHE_TTL_MS) {
		return cachedOrigins.origins;
	}

	const origins = parseAllowedOrigins();
	cachedOrigins = { origins, timestamp: now };
	return origins;
}

/** Refresh the origin cache — call after env changes (tests). */
export function resetCorsCache(): void {
	cachedOrigins = null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD, PUT, DELETE",
		"Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key, anthropic-version, anthropic-beta, x-goog-api-key, X-Request-Id, X-Requested-With, Accept, api-key",
		"Access-Control-Max-Age": "86400",
	};

	if (origin && origin !== "null") {
		if (isOriginAllowed(origin)) {
			headers["Access-Control-Allow-Origin"] = origin;
			headers["Access-Control-Allow-Credentials"] = "true";
			headers["Vary"] = "Origin";
		} else {
			headers["Access-Control-Allow-Origin"] = "*";
		}
	} else {
		headers["Access-Control-Allow-Origin"] = "*";
	}

	return headers;
}

export function corsHeadersReadOnly(origin: string | null): Record<string, string> {
	const allowed = getAllowedOrigins();
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
	};

	if (origin && allowed.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Vary"] = "Origin";
	}

	return headers;
}
