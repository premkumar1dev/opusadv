/**
 * Security header generators.
 *
 * IMPORTANT: Nonces must be unique per HTTP request. Calling getOrCreateNonce()
 * generates a fresh nonce each time. Never cache the result across requests.
 */

import crypto from "node:crypto";

export function generateNonce(): string {
	const bytes = crypto.randomBytes(16);
	return bytes.toString("base64");
}

export function cspDirectives(nonce: string): string {
	const directives = [
		"default-src 'self'",
		`script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://*.hcaptcha.com https://checkout.razorpay.com https://checkout.flutterwave.com`,
		`style-src 'nonce-${nonce}' 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com 'unsafe-inline'`,
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' https: data: blob:",
		"connect-src 'self' https: wss: ws:",
		"frame-src 'self' https:",
		"object-src 'none'",
		"base-uri 'self'",
	];
	return directives.join("; ");
}

export function securityHeaders(nonce?: string): Record<string, string> {
	const effectiveNonce = nonce || generateNonce();
	const csp = cspDirectives(effectiveNonce);

	const headers: Record<string, string> = {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"X-XSS-Protection": "1; mode=block",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=() microphone=() geolocation=(self) payment=(self)",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
		"Content-Security-Policy": csp,
		"Cross-Origin-Opener-Policy": "same-origin",
		"Cross-Origin-Resource-Policy": "same-origin",
	};

	return headers;
}

export function mergeHeaders(a: Record<string, string>, b: Record<string, string>): Record<string, string> {
	return { ...a, ...b };
}
