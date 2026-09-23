import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
	Link,
	useLocation,
} from "react-router";
import { useLoaderData, useActionData, useNavigation, useFetcher, Form } from "react-router";
import { useState, useEffect } from "react";
import { verifyAdminSession } from "~/utils/admin-auth";
import { requireAdmin } from "~/utils/admin-actions";
import { supabaseServer } from "~/utils/supabase.server";
import { cn } from "@/lib/utils";
import { IndianRupee } from "lucide-react";
import {
	CreditCard,
	Key,
	Globe,
	ToggleLeft,
	ToggleRight,
	Save,
	Check,
	AlertCircle,
	Eye,
	EyeOff,
	RefreshCw,
	Send,
	CheckCircle,
	XCircle,
	Shield,
	Activity,
	Link as LinkIcon,
	Zap,
	Info,
	Settings,
	Lock,
	User,
	Bell,
	Monitor,
	Database,
	Mail,
} from "lucide-react";
import { AdminHeader } from "~/components/admin/admin-header";

const TABS = [
	{ id: "profile", label: "Profile", icon: <User className="w-4 h-4" />, href: "/auth/admin/settings?tab=profile" },
	{ id: "security", label: "Security", icon: <Shield className="w-4 h-4" />, href: "/auth/admin/settings?tab=security" },
	{ id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" />, href: "/auth/admin/settings?tab=notifications" },
	{ id: "appearance", label: "Appearance", icon: <Monitor className="w-4 h-4" />, href: "/auth/admin/settings?tab=appearance" },
	{ id: "data", label: "Data & Storage", icon: <Database className="w-4 h-4" />, href: "/auth/admin/settings?tab=data" },
	{ id: "site", label: "Site Config", icon: <Globe className="w-4 h-4" />, href: "/auth/admin/settings/site" },
	{ id: "payments", label: "Payment Gateway", icon: <CreditCard className="w-4 h-4" />, href: "/auth/admin/settings/payments" },
];

export const meta: MetaFunction = () => [
	{ title: "Payment Gateway Settings | Admin | OpusZen" },
];

interface GatewaySettings {
	id: string;
	gateway_name: string;
	is_active: boolean;
	api_key: string;
	api_base_url: string;
	create_order_endpoint: string;
	check_status_endpoint: string;
	webhook_secret: string;
	test_mode: boolean;
	updated_at: string;
}

interface LoaderData {
	adminEmail: string;
	settings: GatewaySettings | null;
	error?: string;
}

interface ActionData {
	success?: boolean;
	error?: string;
	settings?: GatewaySettings;
	// Test payment result
	test_payment?: {
		status: "success" | "error";
		message: string;
		data?: any;
	};
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
	const adminCheck = await verifyAdminSession(request);
	if (!adminCheck.isAdmin) throw redirect("/auth/admin");

	try {
		const { data, error } = await (supabaseServer as any)
			.from("payment_gateway_settings")
			.select("*")
			.limit(1)
			.maybeSingle() as { data: GatewaySettings | null; error: any };

		if (error) {
			return {
				adminEmail: adminCheck.adminEmail || "",
				settings: null,
				error: error.message,
			};
		}

		return {
			adminEmail: adminCheck.adminEmail || "",
			settings: data as GatewaySettings | null,
		};
	} catch (err: any) {
		return {
			adminEmail: adminCheck.adminEmail || "",
			settings: null,
			error: err?.message || "Failed to load settings",
		};
	}
}

export async function action({ request }: ActionFunctionArgs): Promise<ActionData> {
	const admin = await requireAdmin(request);

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "save") {
		const updates = {
			gateway_name: formData.get("gateway_name") as string,
			is_active: formData.get("is_active") === "true",
			api_key: formData.get("api_key") as string,
			api_base_url: (formData.get("api_base_url") as string).replace(/\/$/, ""),
			create_order_endpoint: formData.get("create_order_endpoint") as string,
			check_status_endpoint: formData.get("check_status_endpoint") as string,
			webhook_secret: formData.get("webhook_secret") as string,
			test_mode: formData.get("test_mode") === "true",
			updated_at: new Date().toISOString(),
		};

		try {
			// Check if a row exists
			const { data: existing } = await (supabaseServer as any)
				.from("payment_gateway_settings")
				.select("id")
				.limit(1)
				.maybeSingle() as { data: { id: string } | null };

			let result: { data: any; error: any };
			if (existing?.id) {
				result = await (supabaseServer as any)
					.from("payment_gateway_settings")
					.update(updates)
					.eq("id", existing.id)
					.select()
					.single();
			} else {
				result = await (supabaseServer as any)
					.from("payment_gateway_settings")
					.insert(updates)
					.select()
					.single();
			}

			if (result.error) {
				return { success: false, error: result.error.message };
			}

			return { success: true, settings: result.data as GatewaySettings };
		} catch (err: any) {
			return { success: false, error: err?.message || "Save failed" };
		}
	}

	if (intent === "test_payment") {
		const testAmount = formData.get("test_amount") as string;
		const amt = parseFloat(testAmount);
		if (!amt || amt <= 0) {
			return { test_payment: { status: "error", message: "Enter a valid amount greater than 0" } };
		}

		// Load saved settings from DB
		const { data: gatewaySettings } = await (supabaseServer as any)
			.from("payment_gateway_settings")
			.select("*")
			.limit(1)
			.maybeSingle() as { data: GatewaySettings | null };

		if (!gatewaySettings?.api_key) {
			return { test_payment: { status: "error", message: "API Key is not configured. Save your gateway settings first." } };
		}

		const orderId = `TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		// Respect test_mode: use test base URL suffix when in sandbox mode
		const baseUrl = gatewaySettings.test_mode
			? gatewaySettings.api_base_url.replace(/\/$/, "") + "/test"
			: gatewaySettings.api_base_url;
		const url = `${baseUrl}${gatewaySettings.create_order_endpoint}`;

		const payload = new URLSearchParams({
			customer_mobile: "9999999999",
			user_token: gatewaySettings.api_key,
			amount: String(amt),
			order_id: orderId,
			redirect_url: (request.headers.get("x-forwarded-proto") || "https") + "://" + (request.headers.get("host") || "opuszen.shop") + "/auth/admin/settings/payments",
			remark1: "admin_test_payment",
			remark2: "test",
		});

		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: payload.toString(),
			});

			const text = await res.text();
			let json: any;
			try {
				json = JSON.parse(text);
			} catch {
				json = { raw: text };
			}

			if (res.ok && json?.status !== false) {
				return {
					test_payment: {
						status: "success",
						message: json?.message || `Gateway responded ${res.status} OK`,
						data: json,
					},
				};
			} else {
				return {
					test_payment: {
						status: "error",
						message: json?.message || `Gateway returned HTTP ${res.status}`,
						data: json,
					},
				};
			}
		} catch (err: any) {
			return {
				test_payment: {
					status: "error",
					message: err?.message || "Network error — could not reach the gateway",
				},
			};
		}
	}

	return { error: "Unknown action" };
}

function MaskValue(value: string, show: boolean): string {
	if (!value) return "";
	if (show) return value;
	if (value.length <= 8) return "•".repeat(value.length);
	return value.slice(0, 4) + "•".repeat(Math.max(0, value.length - 8)) + value.slice(-4);
}

export default function AdminSettingsPaymentsRoute() {
	const { adminEmail, settings, error: loaderError } = useLoaderData<LoaderData>();
	const actionData = useActionData<ActionData>();
	const location = useLocation();
	const navigation = useNavigation();
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		setMobileOpen(false);
	}, [location.pathname]);

	const isSubmitting = navigation.state === "submitting";

	const defaultSettings = {
		gateway_name: "UPICheckout",
		is_active: true,
		api_key: "",
		api_base_url: "https://upicheckout.online",
		create_order_endpoint: "/api/create-order",
		check_status_endpoint: "/api/check-order-status",
		webhook_secret: "",
		test_mode: false,
	};

	const initial = settings ?? defaultSettings;

	const [form, setForm] = useState({
		gateway_name: initial.gateway_name,
		is_active: initial.is_active,
		api_key: initial.api_key,
		api_base_url: initial.api_base_url,
		create_order_endpoint: initial.create_order_endpoint,
		check_status_endpoint: initial.check_status_endpoint,
		webhook_secret: initial.webhook_secret,
		test_mode: initial.test_mode,
	});

	const [showKey, setShowKey] = useState(false);
	const [showSecret, setShowSecret] = useState(false);
	const [saveFlash, setSaveFlash] = useState<"success" | "error" | null>(null);

	// Test payment via useFetcher (avoids full page reload and returns JSON)
	const testFetcher = useFetcher<ActionData>();
	const [testAmount, setTestAmount] = useState("");

	const testLoading = testFetcher.state === "submitting" || testFetcher.state === "loading";
	const testResult = testFetcher.data?.test_payment ?? null;

	const handleTestPayment = () => {
		const amt = parseFloat(testAmount);
		if (!amt || amt <= 0) return;

		testFetcher.submit(
			{ intent: "test_payment", test_amount: String(amt) },
			{ method: "post", action: "/auth/admin/settings/payments" },
		);
	};

	useEffect(() => {
		if (actionData?.success) {
			setSaveFlash("success");
			if (actionData.settings) {
				setForm({
					gateway_name: actionData.settings.gateway_name,
					is_active: actionData.settings.is_active,
					api_key: actionData.settings.api_key,
					api_base_url: actionData.settings.api_base_url,
					create_order_endpoint: actionData.settings.create_order_endpoint,
					check_status_endpoint: actionData.settings.check_status_endpoint,
					webhook_secret: actionData.settings.webhook_secret,
					test_mode: actionData.settings.test_mode,
				});
			}
			const t = setTimeout(() => setSaveFlash(null), 3000);
			return () => clearTimeout(t);
		}
		if (actionData?.error) {
			setSaveFlash("error");
			const t = setTimeout(() => setSaveFlash(null), 4000);
			return () => clearTimeout(t);
		}
	}, [actionData]);

	const Toggle = ({
		checked,
		onChange,
	}: {
		checked: boolean;
		onChange: (v: boolean) => void;
	}) => (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${checked ? "bg-primary" : "bg-muted"
				}`}
			role="switch"
			aria-checked={checked}
		>
			<span
				className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-1"
					}`}
				style={{ width: "18px", height: "18px" }}
			/>
		</button>
	);

	const createOrderUrl = `${form.api_base_url}${form.create_order_endpoint}`;
	const checkStatusUrl = `${form.api_base_url}${form.check_status_endpoint}`;

	return (
		<div className="min-h-screen bg-background text-foreground">
			<AdminHeader adminEmail={adminEmail || undefined} />
			<main className="min-h-screen md:ml-[220px]">
				{/* Mobile header bar with hamburger */}
				<div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
					<button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" aria-label="Open menu">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<span className="text-sm font-semibold">Payment Settings</span>
				</div>
				<div className="max-w-[900px] px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<a
									href="/auth/admin/settings"
									className="text-xs text-muted-foreground hover:text-foreground transition-colors"
								>
									Settings
								</a>
								<span className="text-muted-foreground text-xs">/</span>
								<span className="text-xs text-foreground font-medium">Payments</span>
							</div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
								<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
									<CreditCard className="w-5 h-5 text-white" />
								</div>
								Payment Gateway
							</h1>
							<p className="text-muted-foreground text-sm mt-1 ml-12">
								Configure your payment provider API credentials and endpoints
							</p>
						</div>

						{/* Live status badge */}
						<div
							className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${form.is_active
									? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
									: "bg-muted/40 border-border text-muted-foreground"
								}`}
						>
							<span
								className={`w-2 h-2 rounded-full ${form.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
									}`}
							/>
							{form.is_active ? "Gateway Active" : "Gateway Disabled"}
						</div>
					</div>

					<div className="flex flex-col lg:flex-row gap-6">
						{/* Sidebar */}
						<div className="lg:w-56 shrink-0">
							<div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
								<div className="p-1.5 space-y-0.5">
									{TABS.map((tab) => {
										const baseClasses = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer`;
										const isActive = tab.id === "payments";
										return (
											<Link
												key={tab.id}
												to={tab.href}
												className={`${baseClasses} ${isActive
														? "bg-primary/10 text-primary font-semibold"
														: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
													}`}
											>
												{tab.icon}
												{tab.label}
											</Link>
										);
									})}
								</div>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 space-y-4">
							{/* Toast notifications */}
							{saveFlash === "success" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<Check className="w-4 h-4 shrink-0" />
									Payment gateway settings saved successfully!
								</div>
							)}
							{saveFlash === "error" && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
									<AlertCircle className="w-4 h-4 shrink-0" />
									{actionData?.error || "Failed to save settings. Please try again."}
								</div>
							)}
							{loaderError && (
								<div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium">
									<AlertCircle className="w-4 h-4 shrink-0" />
									Could not load saved settings: {loaderError}. Using defaults.
								</div>
							)}

							<Form method="post" className="space-y-5">
								{/* Hidden form fields to sync state */}
								<input type="hidden" name="intent" value="save" />
								<input type="hidden" name="is_active" value={String(form.is_active)} />
								<input type="hidden" name="test_mode" value={String(form.test_mode)} />

								{/* ── Section 1: Gateway Control ── */}
								<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
											<Settings className="w-4 h-4" />
										</div>
										<div>
											<h3 className="text-base font-bold text-foreground">Gateway Control</h3>
											<p className="text-xs text-muted-foreground">
												Enable or disable the payment gateway globally
											</p>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
										{/* Gateway Name */}
										<div>
											<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
												Gateway Name
											</label>
											<input
												type="text"
												name="gateway_name"
												value={form.gateway_name}
												onChange={(e) =>
													setForm((f) => ({ ...f, gateway_name: e.target.value }))
												}
												placeholder="e.g. KhiladiXPro"
												className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
											/>
										</div>

										{/* Active Toggle */}
										<div>
											<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
												Payment Gateway Status
											</label>
											<div className="flex items-center gap-3 h-10 px-3 rounded-xl border border-border bg-background/50">
												<Toggle
													checked={form.is_active}
													onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
												/>
												<span
													className={`text-sm font-medium ${form.is_active ? "text-emerald-500" : "text-muted-foreground"
														}`}
												>
													{form.is_active ? "Enabled — accepting payments" : "Disabled — no payments"}
												</span>
											</div>
										</div>
									</div>

									{/* Test Mode */}
									<div className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/8 transition-colors">
										<div>
											<p className="text-sm font-semibold text-foreground flex items-center gap-2">
												<Zap className="w-4 h-4 text-amber-500" />
												Test Mode
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												Use sandbox endpoints — no real charges will occur
											</p>
										</div>
										<Toggle
											checked={form.test_mode}
											onChange={(v) => setForm((f) => ({ ...f, test_mode: v }))}
										/>
									</div>
								</div>

								{/* ── Section 2: API Credentials ── */}
								<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
											<Key className="w-4 h-4" />
										</div>
										<div>
											<h3 className="text-base font-bold text-foreground">API Credentials</h3>
											<p className="text-xs text-muted-foreground">
												Sensitive keys are masked — click the eye icon to reveal
											</p>
										</div>
									</div>

									{/* API Key */}
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											User Token / API Key
										</label>
										<div className="relative">
											<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												<Lock className="w-4 h-4" />
											</div>
											<input
												type={showKey ? "text" : "password"}
												name="api_key"
												value={form.api_key}
												onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
												placeholder="Enter your user_token / API key"
												className="w-full h-10 pl-9 pr-10 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
											/>
											<button
												type="button"
												onClick={() => setShowKey((v) => !v)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
												title={showKey ? "Hide key" : "Reveal key"}
											>
												{showKey ? (
													<EyeOff className="w-4 h-4" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
										</div>
										<p className="text-[11px] text-muted-foreground mt-1 font-mono">
											Used as <code className="bg-muted/50 px-1 rounded">user_token</code> in all API
											requests
										</p>
									</div>

									{/* Webhook Secret */}
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Webhook Secret{" "}
											<span className="normal-case font-normal text-muted-foreground">(optional)</span>
										</label>
										<div className="relative">
											<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												<Shield className="w-4 h-4" />
											</div>
											<input
												type={showSecret ? "text" : "password"}
												name="webhook_secret"
												value={form.webhook_secret}
												onChange={(e) =>
													setForm((f) => ({ ...f, webhook_secret: e.target.value }))
												}
												placeholder="Webhook verification secret"
												className="w-full h-10 pl-9 pr-10 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
											/>
											<button
												type="button"
												onClick={() => setShowSecret((v) => !v)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
											>
												{showSecret ? (
													<EyeOff className="w-4 h-4" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>
								</div>

								{/* ── Section 3: API Endpoints ── */}
								<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
											<Globe className="w-4 h-4" />
										</div>
										<div>
											<h3 className="text-base font-bold text-foreground">API Endpoints</h3>
											<p className="text-xs text-muted-foreground">
												Configure the base URL and endpoint paths for the gateway
											</p>
										</div>
									</div>

									{/* Base URL */}
									<div>
										<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											API Base URL
										</label>
										<div className="relative">
											<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												<Globe className="w-4 h-4" />
											</div>
											<input
												type="url"
												name="api_base_url"
												value={form.api_base_url}
												onChange={(e) =>
													setForm((f) => ({ ...f, api_base_url: e.target.value }))
												}
												placeholder="https://khilaadixpro.shop"
												className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{/* Create Order Endpoint */}
										<div>
											<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
												Create Order Path
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													<LinkIcon className="w-4 h-4" />
												</div>
												<input
													type="text"
													name="create_order_endpoint"
													value={form.create_order_endpoint}
													onChange={(e) =>
														setForm((f) => ({ ...f, create_order_endpoint: e.target.value }))
													}
													placeholder="/api/create-order"
													className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
												/>
											</div>
										</div>

										{/* Check Status Endpoint */}
										<div>
											<label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
												Check Status Path
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													<Activity className="w-4 h-4" />
												</div>
												<input
													type="text"
													name="check_status_endpoint"
													value={form.check_status_endpoint}
													onChange={(e) =>
														setForm((f) => ({
															...f,
															check_status_endpoint: e.target.value,
														}))
													}
													placeholder="/api/check-order-status"
													className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
												/>
											</div>
										</div>
									</div>

									{/* Resolved URLs preview */}
									<div className="space-y-2 pt-1">
										<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
											<Info className="w-3.5 h-3.5" />
											Resolved Endpoint URLs
										</p>
										<div className="space-y-1.5">
											<div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/40">
												<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase tracking-wider shrink-0">
													POST
												</span>
												<code className="text-[11px] text-muted-foreground font-mono truncate">
													{createOrderUrl}
												</code>
											</div>
											<div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/40">
												<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase tracking-wider shrink-0">
													POST
												</span>
												<code className="text-[11px] text-muted-foreground font-mono truncate">
													{checkStatusUrl}
												</code>
											</div>
										</div>
									</div>
								</div>

								{/* ── SDK Reference ── */}
								<div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-3">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
										<Info className="w-3.5 h-3.5" />
										Create Order — Payload Reference
									</p>
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
										{[
											{ field: "customer_mobile", type: "string", note: "Buyer phone number" },
											{ field: "user_token", type: "string", note: "← API Key above" },
											{ field: "amount", type: "string", note: "Order amount (INR)" },
											{ field: "order_id", type: "string", note: "Unique order ID" },
											{ field: "redirect_url", type: "string", note: "Post-payment URL" },
											{ field: "remark1", type: "string", note: "Custom tag 1" },
										].map((f) => (
											<div
												key={f.field}
												className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-card/60 border border-border/40"
											>
												<code className="text-[11px] font-mono text-violet-400">{f.field}</code>
												<span className="text-[10px] text-muted-foreground">{f.note}</span>
											</div>
										))}
									</div>
									<p className="text-[11px] text-muted-foreground">
										Webhook receives:{" "}
										<code className="bg-muted/50 px-1 rounded">status</code>,{" "}
										<code className="bg-muted/50 px-1 rounded">order_id</code>,{" "}
										<code className="bg-muted/50 px-1 rounded">remark1</code> via{" "}
										<code className="bg-muted/50 px-1 rounded">POST</code> when payment completes.
									</p>
								</div>

								{/* ── Section 5: Test Payment ── */}
								<div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
											<Send className="w-4 h-4" />
										</div>
										<div>
											<h3 className="text-base font-bold text-foreground">Test Payment</h3>
											<p className="text-xs text-muted-foreground">
												Send a test create-order request to verify your gateway configuration
											</p>
										</div>
									</div>

									<div className="flex flex-col sm:flex-row gap-3">
										{/* Amount input */}
										<div className="relative flex-1">
											<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												<IndianRupee className="w-3.5 h-3.5" />
											</div>
											<input
												type="number"
												min="1"
												step="1"
												value={testAmount}
												onChange={(e) => setTestAmount(e.target.value)}
												placeholder="Enter amount (e.g. 100)"
												className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background/50 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														handleTestPayment();
													}
												}}
											/>
										</div>

										{/* Test button */}
										<button
											type="button"
											onClick={handleTestPayment}
											disabled={testLoading || !testAmount}
											className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
										>
											{testLoading ? (
												<>
													<RefreshCw className="w-4 h-4 animate-spin" />
													Sending…
												</>
											) : (
												<>
													<Send className="w-4 h-4" />
													Send Test Payment
												</>
											)}
										</button>
									</div>

									{/* Test result */}
									{testResult && (
										<div
											className={`rounded-xl border p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 ${testResult.status === "success"
													? "bg-emerald-500/5 border-emerald-500/20"
													: "bg-red-500/5 border-red-500/20"
												}`}
										>
											<div className="flex items-center gap-2">
												{testResult.status === "success" ? (
													<CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
												) : (
													<XCircle className="w-4 h-4 text-red-500 shrink-0" />
												)}
												<span
													className={`text-sm font-semibold ${testResult.status === "success" ? "text-emerald-500" : "text-red-500"
														}`}
												>
													{testResult.status === "success" ? "Gateway Responded Successfully" : "Test Failed"}
												</span>
											</div>
											<p className="text-xs text-muted-foreground">{testResult.message}</p>
											{testResult.data && (
												<details className="mt-1">
													<summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-medium">
														View full response
													</summary>
													<pre className="mt-2 p-3 rounded-lg bg-background/50 border border-border/40 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto">
														{JSON.stringify(testResult.data, null, 2)}
													</pre>
												</details>
											)}
										</div>
									)}

									{/* Info note */}
									<p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
										<Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
										This sends a real create-order request to your configured gateway with a test order ID and dummy mobile number (9999999999).
										Make sure your settings are saved first.
									</p>
								</div>

								{/* Save Button */}
								<div className="flex items-center justify-between pt-1">
									{settings?.updated_at && (
										<p className="text-[11px] text-muted-foreground">
											Last saved:{" "}
											{new Date(settings.updated_at).toLocaleString("en-IN", {
												dateStyle: "medium",
												timeStyle: "short",
											})}
										</p>
									)}
									<button
										type="submit"
										disabled={isSubmitting}
										className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{isSubmitting ? (
											<>
												<RefreshCw className="w-4 h-4 animate-spin" />
												Saving…
											</>
										) : (
											<>
												<Save className="w-4 h-4" />
												Save Gateway Settings
											</>
										)}
									</button>
								</div>
							</Form>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
