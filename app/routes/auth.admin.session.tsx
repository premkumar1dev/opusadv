import { type ActionFunctionArgs } from "react-router";
import { createAdminSession } from "~/utils/admin-auth";
import { supabaseServer } from "~/utils/supabase.server";

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const cookieHeader = request.headers.get("Cookie") || request.headers.get("cookie") || "";
	const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);

	if (!accessTokenMatch) {
		return new Response(JSON.stringify({ error: "No active session found." }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate the Supabase session server-side
	const { data, error } = await supabaseServer.auth.getUser(accessTokenMatch[1]);
	if (error || !data.user) {
		return new Response(JSON.stringify({ error: "Session expired or invalid." }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const role = (data.user as any).app_metadata?.role;
	const configuredAdminEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
	const userEmail = (data.user.email || "").trim().toLowerCase();
	const isSuperAdmin = Boolean(configuredAdminEmail && userEmail === configuredAdminEmail);

	if (role !== "admin" && !isSuperAdmin) {
		return new Response(JSON.stringify({ error: "Account lacks administrative privileges." }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Create the HMAC-signed admin_session cookie server-side
	const sessionPayload = await createAdminSession(data.user.email ?? "");
	if (!sessionPayload) {
		return new Response(JSON.stringify({ error: "Server misconfigured — session secret not set." }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
	const isProduction = import.meta.env.PROD;
	const cookieParts = [
		`admin_session=${encodeURIComponent(sessionPayload)}`,
		`path=/`,
		`expires=${expires}`,
		`HttpOnly`,
		`SameSite=Strict`,
		isProduction ? 'Secure' : '',
	];
	const setCookie = cookieParts.filter(Boolean).join('; ');
	const body = JSON.stringify({ success: true, redirectTo: "/auth/admin/dashboard" });

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": setCookie,
		},
	});
}
