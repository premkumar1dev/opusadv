import { type ActionFunctionArgs } from "react-router";
import { supabaseServer as supabase } from "~/utils/supabase.server";
import { PaymentSDK } from "~/utils/payment-sdk";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
	try {
		return await paymentAction(request);
	} catch (err: any) {
		console.error("[api/payment action] Unhandled error:", err);
		return new Response(
			JSON.stringify({ status: false, message: err?.message || "Internal server error" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

async function paymentAction(request: Request): Promise<Response> {
	console.log("[api/payment action] Received request...");
	const formData = await request.formData();
	const intent = formData.get("intent") as string;
	console.log("[api/payment action] Intent:", intent);

	// Fetch active gateway settings
	console.log("[api/payment action] Querying payment_gateway_settings...");
	const { data: gatewaySettings } = await supabase
		.from("payment_gateway_settings")
		.select("*")
		.eq("is_active", true)
		.maybeSingle();
	console.log("[api/payment action] Settings retrieved. Active:", !!gatewaySettings);
	if (gatewaySettings) {
		console.log("[api/payment action] Gateway config:", {
			base_url: gatewaySettings.api_base_url,
			create_endpoint: gatewaySettings.create_order_endpoint,
			check_endpoint: gatewaySettings.check_status_endpoint,
			has_api_key: !!gatewaySettings.api_key,
		});
	}

	if (!gatewaySettings) {
		console.warn("[api/payment action] No active gateway settings found!");
		return new Response(
			JSON.stringify({ status: false, message: "No active payment gateway found" }),
			{ status: 400, headers: { "Content-Type": "application/json" } }
		);
	}

	if (!gatewaySettings.api_key) {
		console.warn("[api/payment action] Gateway active but API key is empty!");
		return new Response(
			JSON.stringify({ status: false, message: "Gateway API key is not configured" }),
			{ status: 400, headers: { "Content-Type": "application/json" } }
		);
	}

	const sdkInstance = new PaymentSDK(
		gatewaySettings.api_base_url,
		gatewaySettings.create_order_endpoint,
		gatewaySettings.check_status_endpoint
	);

	if (intent === "create_order") {
		const customer_mobile = (formData.get("customer_mobile") as string) ?? "";
		let amount = (formData.get("amount") as string) ?? "";
		const order_id = (formData.get("order_id") as string) ?? "";
		const redirect_url = (formData.get("redirect_url") as string) ?? "";
		const remark1 = (formData.get("remark1") as string) ?? "";
		const remark2 = (formData.get("remark2") as string) ?? "";
		const plan_id = (formData.get("plan_id") as string) ?? "";

		if (!order_id || !amount) {
			return new Response(
				JSON.stringify({ status: false, message: "Missing order_id or amount" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		// Server-side validation of price against database to prevent client-side tampering
		let serverPrice: number | null = null;
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
		let orderQuery = supabase.from("orders").select("amount, plan_id, plan_name");
		if (isUuid) {
			orderQuery = orderQuery.or(`id.eq.${order_id},payment_ref.eq.${order_id}`);
		} else {
			orderQuery = orderQuery.eq("payment_ref", order_id);
		}
		const { data: existingOrder } = await orderQuery.maybeSingle();

		if (existingOrder && existingOrder.amount != null) {
			serverPrice = Number(existingOrder.amount);
		} else {
			let planQuery = supabase.from("plans").select("price, is_active");
			if (plan_id) {
				planQuery = planQuery.eq("id", plan_id);
			} else if (remark1) {
				planQuery = planQuery.eq("name", remark1);
			}
			const { data: matchedPlan } = await planQuery.maybeSingle();
			if (matchedPlan && matchedPlan.price != null) {
				serverPrice = Number(matchedPlan.price);
			}
		}

		if (serverPrice !== null && serverPrice > 0) {
			// Authoritative override: always charge the actual database plan price
			amount = String(serverPrice);
		}

		const parsedAmount = Number(amount);
		if (isNaN(parsedAmount) || parsedAmount <= 0) {
			return new Response(
				JSON.stringify({ status: false, message: "Invalid payment amount" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		try {
			console.log("[api/payment action] Creating order via SDK — amount:", amount, "order_id:", order_id);
			const response = await sdkInstance.createOrder({
				customer_mobile,
				user_token: gatewaySettings.api_key,
				amount,
				order_id,
				redirect_url,
				remark1,
				remark2,
			});
			console.log("[api/payment action] Gateway responded:", response);
			return new Response(JSON.stringify(response), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (error: any) {
			console.error("[api/payment action] createOrder failed:", error.message);
			return new Response(
				JSON.stringify({ status: false, message: error.message || "Failed to create order" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}

	if (intent === "check_status") {
		const order_id = (formData.get("order_id") as string) ?? "";

		if (!order_id) {
			return new Response(
				JSON.stringify({ status: false, message: "Missing order_id" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		try {
			console.log("[api/payment action] Checking status for order_id:", order_id);
			const response = await sdkInstance.checkOrderStatus({
				user_token: gatewaySettings.api_key,
				order_id,
			});
			return new Response(JSON.stringify(response), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (error: any) {
			console.error("[api/payment action] checkOrderStatus failed:", error.message);
			return new Response(
				JSON.stringify({ status: false, message: error.message || "Failed to check order status" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}

	return new Response(
		JSON.stringify({ status: false, message: "Unknown intent: " + intent }),
		{ status: 400, headers: { "Content-Type": "application/json" } }
	);
}
