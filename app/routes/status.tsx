import { type MetaFunction, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Layout } from "../components/Layout";
import { useState, useEffect, useRef, useCallback } from "react";

import { buildPageMetaTags } from "~/utils/meta-helper";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/status");
};

interface ServiceStatus {
	name: string;
	status: "operational" | "degraded" | "outage" | "unknown";
	description: string;
}

interface StatusResponse {
	status: string;
	timestamp: string;
	overall: "operational" | "degraded" | "outage";
	services: ServiceStatus[];
	metrics: {
		latency: number | null;
		uptime: string;
		refresh: string;
	};
}

export async function loader({ request }: LoaderFunctionArgs) {
	const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "opuszen.shop";
	const host = rawHost.includes("localhost") ? "opuszen.shop" : rawHost;
	const protocol = host.includes("opuszen.shop") ? "https" : (request.headers.get("x-forwarded-proto") || "https");
	const baseUrl = `${protocol}://${host}`;

	return { baseUrl };
}

export default function StatusRoute() {
	const loaderData = useLoaderData<typeof loader>();
	const [statusData, setStatusData] = useState<StatusResponse | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lastChecked, setLastChecked] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const baseUrl = typeof window !== "undefined"
		? window.location.origin
		: loaderData.baseUrl;

	const apiUrlRef = useRef<string>(`${baseUrl}/api/status`);

	const [countdown, setCountdown] = useState(30);
	const countdownRef = useRef(30);
	const fetchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchStatus = useCallback(async (showRefresh = false) => {
		if (showRefresh) setIsRefreshing(true);
		setError(null);
		try {
			console.log(`[status] fetching ${apiUrlRef.current}`);
			const res = await fetch(apiUrlRef.current, {
				method: "GET",
				headers: { Accept: "application/json" },
				cache: "no-store",
			});
			console.log(`[status] response status: ${res.status}, ok: ${res.ok}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const text = await res.text();
			console.log(`[status] response body: ${text.substring(0, 200)}`);
			const data = JSON.parse(text) as StatusResponse;
			setStatusData(data);
			setLastChecked(new Date().toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			}));
			countdownRef.current = 30;
			setCountdown(30);
		} catch (err) {
			console.error("[status] fetch failed:", err);
			const msg = err instanceof Error ? err.message : String(err);
			setError(`Unable to reach status endpoint: ${msg}`);
		} finally {
			if (showRefresh) setIsRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
		fetchTimerRef.current = setInterval(() => fetchStatus(false), 30_000);
		tickRef.current = setInterval(() => {
			countdownRef.current = Math.max(0, countdownRef.current - 1);
			setCountdown(countdownRef.current);
		}, 1_000);
		return () => {
			if (fetchTimerRef.current) clearInterval(fetchTimerRef.current);
			if (tickRef.current) clearInterval(tickRef.current);
		};
	}, [fetchStatus]);

	const handleManualRefresh = () => {
		fetchStatus(true);
		countdownRef.current = 30;
		setCountdown(30);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "operational":
				return { text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", dot: "bg-emerald-500" };
			case "degraded":
				return { text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-500/20", dot: "bg-amber-500" };
			case "outage":
				return { text: "text-red-700 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-500/20", dot: "bg-red-500" };
			default:
				return { text: "text-gray-600 dark:text-gray-400", bg: "bg-gray-500/10", dot: "bg-gray-400" };
		}
	};

	const overallLabel =
		statusData?.overall === "operational"
			? "All systems operational"
			: statusData?.overall === "degraded"
				? "Some services degraded"
				: statusData?.overall === "outage"
					? "Service disruption detected"
					: "Checking system status…";

	const overallDot =
		statusData?.overall === "operational"
			? "bg-emerald-500"
			: statusData?.overall === "degraded"
				? "bg-amber-500"
				: statusData?.overall === "outage"
					? "bg-red-500"
					: "bg-gray-400";

	return (
		<Layout>
			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
				{/* Header */}
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-semibold mb-5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
						<div className="relative flex items-center justify-center w-2.5 h-2.5">
							<span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${overallDot} opacity-75 animate-ping`} />
							<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${overallDot}`} />
						</div>
						{overallLabel}
					</div>
					<h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-5">
						Service status
					</h1>
					<p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
						Health for every layer between your client and the models,
						probed from your browser every&nbsp;30&nbsp;seconds.
						What you see here is what your requests would see.
					</p>
					<div className="flex items-center justify-center gap-4 mt-4">
						<span className="text-xs text-muted-foreground">
							{lastChecked
								? `Updated ${lastChecked}`
								: "Loading status…"}
						</span>
						{error && (
							<span className="text-xs text-amber-600 dark:text-amber-400">
								{error}
							</span>
						)}
					</div>
				</div>

				{/* Service Cards */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
					{statusData?.services.map((service) => {
						const colors = getStatusColor(service.status);
						return (
							<div
								key={service.name}
								className="p-5 rounded-2xl border border-border bg-card dark:bg-card/60 hover:border-border/80 transition-all"
							>
								<div className="flex items-start justify-between mb-3">
									<h2 className="text-base font-semibold text-foreground">
										{service.name}
									</h2>
									<span
										className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
									>
										<span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
										{service.status === "operational"
											? "Operational"
											: service.status === "degraded"
												? "Degraded"
												: service.status === "outage"
													? "Outage"
													: "Unknown"}
									</span>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{service.description}
								</p>
							</div>
						);
					})}
					{!statusData && (
						<>
							{["Proxy service", "API gateway", "Key management"].map((name) => (
								<div
									key={name}
									className="p-5 rounded-2xl border border-border bg-card dark:bg-card/60 animate-pulse"
								>
									<div className="flex items-start justify-between mb-3">
										<div className="h-5 w-24 bg-muted rounded" />
										<div className="h-6 w-20 bg-muted rounded-full" />
									</div>
									<div className="h-4 w-full bg-muted rounded" />
								</div>
							))}
						</>
					)}
				</div>

				{/* Metrics Row */}
				<div className="grid grid-cols-3 gap-4 mb-10">
					<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 text-center">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
							Latency
						</p>
						<p className="text-3xl font-bold text-foreground tracking-tight">
							{statusData?.metrics?.latency != null
								? `${statusData.metrics.latency}ms`
								: "—"}
						</p>
					</div>
					<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 text-center">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
							Uptime
						</p>
						<p className="text-3xl font-bold text-foreground tracking-tight">
							{statusData?.metrics?.uptime || "—"}
						</p>
					</div>
					<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 text-center">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
							Refresh
						</p>
						<p className="text-3xl font-bold text-foreground tracking-tight">
							{countdown}s
						</p>
					</div>
				</div>

				{/* API Base URL */}
				<div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 mb-6">
					<h2 className="text-lg font-semibold text-foreground mb-4">
						API Base URL
					</h2>
					<div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50">
						<code className="text-sm font-mono text-foreground/90 flex-1 break-all">
							{loaderData.baseUrl}
						</code>
						<button
							onClick={() =>
								navigator.clipboard.writeText(loaderData.baseUrl)
							}
							className="flex-shrink-0 p-2 rounded-lg hover:bg-muted/50 transition-colors"
							aria-label="Copy API URL"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={16}
								height={16}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-muted-foreground hover:text-foreground"
								aria-hidden="true"
							>
								<rect width={14} height={14} x={8} y={8} rx={2} ry={2} />
								<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
							</svg>
						</button>
					</div>
				</div>

				{/* Refresh Button */}
				<div className="flex justify-center">
					<button
						onClick={handleManualRefresh}
						disabled={isRefreshing}
						className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width={16}
							height={16}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							className={`transition-transform ${isRefreshing ? "animate-spin" : ""}`}
							aria-hidden="true"
						>
							<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
							<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
							<path d="M16 16h5v5" />
						</svg>
						{isRefreshing ? "Checking…" : "Refresh now"}
					</button>
				</div>
			</div>
		</Layout>
	);
}
