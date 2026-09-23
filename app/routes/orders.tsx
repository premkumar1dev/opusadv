import { type MetaFunction, type ActionFunctionArgs, type LoaderFunctionArgs, useLoaderData, useActionData, useNavigation } from "react-router";
import { Layout } from "../components/Layout";
import { useState, useEffect } from "react";
import { supabaseServer } from "~/utils/supabase.server";

import { buildPageMetaTags } from "~/utils/meta-helper";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/orders");
};

interface OrderResult {
	id: string;
	display_id: string;
	plan_name: string;
	amount: number;
	currency: string;
	status: string;
	payment_method: string;
	coupon_code: string;
	discount: number;
	final_amount: number;
	completed_at: string | null;
	created_at: string;
}

interface LoaderData {
	orders: OrderResult[];
	error: string | null;
	query: string;
}

async function searchOrdersByTerm(term: string) {
	const clean = term.trim();
	if (!clean || clean.length < 3) return { data: [], error: null };

	// Strip characters that could manipulate PostgREST filters
	const safe = clean.replace(/[^a-zA-Z0-9_-]/g, "");
	if (!safe) return { data: [], error: null };

	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safe);
	const PUBLIC_ORDER_COLUMNS = "id, display_id, plan_name, amount, currency, status, payment_method, coupon_code, discount, final_amount, completed_at, created_at";

	let query = supabaseServer.from("orders").select(PUBLIC_ORDER_COLUMNS);

	if (isUuid) {
		query = query.or(`id.eq.${safe},display_id.eq.${safe},payment_ref.eq.${safe}`);
	} else {
		query = query.or(`display_id.eq.${safe},payment_ref.eq.${safe}`);
	}

	return await query.order("created_at", { ascending: false }).limit(5);
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const query = (url.searchParams.get("q") || "").trim();
	const paymentVerify = url.searchParams.get("payment");
	const paymentOrderId = (url.searchParams.get("gatewayOrderId") || "").trim();
	const orders: OrderResult[] = [];
	let error: string | null = null;

	// Auto-search when redirected back from payment gateway
	const targetQuery = paymentVerify === "verify" && paymentOrderId ? paymentOrderId : query;

	if (targetQuery) {
		try {
			const result = await searchOrdersByTerm(targetQuery);
			if (result.error) {
				error = result.error.message;
			} else if (result.data) {
				orders.push(...(result.data as OrderResult[]));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to look up order";
		}
	}

	return { orders, error, query: targetQuery };
}

export async function action({ request }: ActionFunctionArgs) {
	let query = "";
	try {
		const formData = await request.formData();
		query = String(formData.get("q") || "").trim();
	} catch {
		query = "";
	}

	if (!query) {
		return { orders: [], error: null, query: "" };
	}

	const orders: OrderResult[] = [];
	let error: string | null = null;

	try {
		const result = await searchOrdersByTerm(query);
		if (result.error) {
			error = result.error.message;
		} else if (result.data) {
			orders.push(...(result.data as OrderResult[]));
		}
	} catch (err) {
		error = err instanceof Error ? err.message : "Failed to search orders";
	}

	return { orders, error, query };
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return iso;
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const time = d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	return `${day}/${month}/${year}, ${time}`;
}

function formatCurrency(n: number, currency = "INR"): string {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(n);
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
	completed: {
		label: "Completed",
		bg: "bg-emerald-500/10",
		text: "text-emerald-600 dark:text-emerald-400",
		border: "border-emerald-500/20",
		dot: "bg-emerald-500",
	},
	pending: {
		label: "Pending",
		bg: "bg-amber-500/10",
		text: "text-amber-600 dark:text-amber-400",
		border: "border-amber-500/20",
		dot: "bg-amber-500 animate-pulse",
	},
	failed: {
		label: "Failed",
		bg: "bg-red-500/10",
		text: "text-red-600 dark:text-red-400",
		border: "border-red-500/20",
		dot: "bg-red-500",
	},
	cancelled: {
		label: "Cancelled",
		bg: "bg-zinc-500/10",
		text: "text-zinc-600 dark:text-zinc-400",
		border: "border-zinc-500/20",
		dot: "bg-zinc-500",
	},
	refunded: {
		label: "Refunded",
		bg: "bg-violet-500/10",
		text: "text-violet-600 dark:text-violet-400",
		border: "border-violet-500/20",
		dot: "bg-violet-500",
	},
};

export default function OrdersRoute() {
	const loaderData = useLoaderData<LoaderData>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();

	const isLoading = navigation.state === "submitting" || navigation.state === "loading";
	const data = actionData || loaderData;
	const { orders, error, query } = data;
	const [searchQuery, setSearchQuery] = useState(query);
	const [isPaymentFlow, setIsPaymentFlow] = useState(false);

	useEffect(() => {
		setSearchQuery(query);
		// Detect if we landed here from a payment gateway redirect
		const url = new URL(window.location.href);
		if (url.searchParams.get("payment") === "verify") {
			setIsPaymentFlow(true);
			// Clean the URL
			url.searchParams.delete("payment");
			url.searchParams.delete("orderId");
			url.searchParams.delete("gatewayOrderId");
			url.searchParams.delete("planId");
			url.searchParams.delete("planName");
			url.searchParams.delete("multiplier");
			url.searchParams.delete("price");
			url.searchParams.delete("currency");
			url.searchParams.delete("duration");
			url.searchParams.delete("method");
			url.searchParams.delete("tokenPricing");
			url.searchParams.delete("pricePer1mInput");
			url.searchParams.delete("pricePer1mOutput");
			url.searchParams.delete("minCredits");
			window.history.replaceState({}, "", url.toString());
		}
	}, [query]);

	const getStatusConfig = (status: string) => {
		return STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
	};

	return (
		<Layout>
			<div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
				{/* Header */}
				<div className="text-center mb-10">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
						{isPaymentFlow ? "Payment Complete" : "Order Lookup"}
					</div>
					<h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
						{isPaymentFlow ? "Payment Received" : "Track Your Order"}
					</h1>
					<p className="text-muted-foreground text-base max-w-lg mx-auto">
						{isPaymentFlow
							? "Your payment has been processed. Here's your order status:"
							: "Enter your order ID or the email used during purchase to check your order status."}
					</p>
				</div>

				{/* Search Form */}
				<div className="mb-10 p-6 rounded-2xl border border-border bg-card dark:bg-card/60 shadow-md">
					<form method="post" className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width={20}
								height={20}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
								className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
								aria-hidden="true"
							>
								<circle cx="11" cy="11" r={8} />
								<path d="m21 21-4.3-4.3" />
							</svg>
							<input
								type="text"
								name="q"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								disabled={isLoading}
								className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground disabled:opacity-60"
								placeholder="Order ID or email address"
								required
							/>
						</div>
						<button
							type="submit"
							disabled={isLoading}
							className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all px-6 h-12 cursor-pointer shadow-md shadow-primary/20 hover:scale-[1.01] disabled:opacity-75 disabled:cursor-not-allowed whitespace-nowrap"
						>
							{isLoading ? (
								<>
									<svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
									</svg>
									Searching…
								</>
							) : (
								<>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width={18}
										height={18}
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-4 w-4"
										aria-hidden="true"
									>
										<circle cx="11" cy="11" r={8} />
										<path d="m21 21-4.3-4.3" />
									</svg>
									Search
								</>
							)}
						</button>
					</form>
				</div>

				{/* Error Banner */}
				{error && (
					<div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
							<circle cx={12} cy={12} r={10} />
							<line x1={12} y1={8} x2={12} y2={12} />
							<line x1={12} y1={16} x2={12.01} y2={16} />
						</svg>
						<div>
							<p className="font-semibold">Search failed</p>
							<p className="text-xs opacity-90">{error}</p>
						</div>
					</div>
				)}

				{/* Results */}
				{query && (
					<div>
						{orders.length === 0 && !error ? (
							<div className="text-center py-16 px-4 rounded-2xl border border-border/50 bg-card/20 dark:bg-card/10">
								<svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground/40" aria-hidden="true">
									<circle cx="11" cy="11" r={8} />
									<path d="m21 21-4.3-4.3" />
									<line x1="8" y1="11" x2="14" y2="11" />
								</svg>
								<h3 className="text-lg font-semibold text-foreground mb-1">No orders found</h3>
								<p className="text-sm text-muted-foreground max-w-sm mx-auto">
									No orders match "{query}". Double-check your order ID or email address and try again.
								</p>
							</div>
						) : (
							<>
								<div className="flex items-center justify-between mb-4">
									<p className="text-sm text-muted-foreground">
										{orders.length} order{orders.length !== 1 ? "s" : ""} found
									</p>
								</div>
								<div className="space-y-3">
									{orders.map((order) => {
										const statusCfg = getStatusConfig(order.status);
										return (
											<div
												key={order.id}
												className="p-5 sm:p-6 rounded-2xl border border-border bg-card dark:bg-card/60 hover:border-primary/20 transition-all"
											>
												<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
													<div className="min-w-0">
														<div className="flex items-center gap-2.5 mb-1">
															<p className="text-sm font-bold text-foreground">{order.plan_name}</p>
															<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
																<span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
																{statusCfg.label}
															</span>
														</div>
														<p className="text-xs text-muted-foreground font-mono">
															#{order.display_id} &middot; {formatDate(order.created_at)}
														</p>
													</div>
													<div className="text-right shrink-0">
														<p className="text-lg font-bold text-foreground font-mono">{formatCurrency(order.final_amount, order.currency)}</p>
														{order.discount > 0 && (
															<p className="text-[11px] text-muted-foreground line-through">{formatCurrency(order.amount, order.currency)}</p>
														)}
													</div>
												</div>

												<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
													{order.payment_method && (
														<span className="inline-flex items-center gap-1.5">
															<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
																<rect width="20" height="14" x="2" y="5" rx="2" />
																<line x1="2" x2="22" y1="10" y2="10" />
															</svg>
															{order.payment_method}
														</span>
													)}
													{order.completed_at && (
														<span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
															<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
																<polyline points="20 6 9 17 4 12" />
															</svg>
															Completed {formatDate(order.completed_at)}
														</span>
													)}
													{order.coupon_code && (
														<span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono">
															<svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
																<path d="M19 5c-1.4 0-2.6 1.1-2.9 2.5L15 12h3l1-3.5c.3-1.4-.5-2.8-1.9-3.2A3.97 3.97 0 0 0 17 2 4 4 0 0 0 13 6H8.5L7 3.5A2 2 0 0 0 5 2 2 2 0 0 0 3 4a2 2 0 0 0 1 1.7L5.5 12 3 19a2 2 0 0 0 2 2.5h.5a2 2 0 0 0 2-1.7l1.5-7.5L10 20h3l1-7.5L15.5 21a2 2 0 0 0 2 2.5h.5a2 2 0 0 0 2-1.7L19 5Z" />
															</svg>
															{order.coupon_code}
														</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</>
						)}
					</div>
				)}

				{/* Initial empty state */}
				{!query && (
					<div className="text-center py-16 px-4 rounded-2xl border border-border/50 bg-card/20 dark:bg-card/10">
						<svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground/40" aria-hidden="true">
							<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
							<path d="M3 6h18" />
							<path d="M16 10a4 4 0 0 1-8 0" />
						</svg>
						<h3 className="text-lg font-semibold text-foreground mb-1">
							Ready to look up
						</h3>
						<p className="text-sm text-muted-foreground max-w-sm mx-auto">
							Enter your order ID (e.g.{" "}
							<code className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">550e8400-e29b...</code>
							) or the email you used for your purchase above.
						</p>
					</div>
				)}
			</div>
		</Layout>
	);
}
