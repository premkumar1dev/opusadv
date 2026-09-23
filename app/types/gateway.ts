/**
 * Enterprise API Gateway - Type Definitions
 * All shared types for the gateway system
 */

// ---------------------------------------------------------------------------
// Master API Keys
// ---------------------------------------------------------------------------
export interface MasterApiKeyRow {
 id: string;
 provider: string;
 name: string;
 api_key: string;
 status: 'active' | 'disabled' | 'quota_exhausted' | 'temporarily_failed' | 'rate_limited';
 priority: number;
 total_credits: number;
 used_credits: number;
 remaining_credits: number;
 total_requests: number;
 success_requests: number;
 failed_requests: number;
 last_used: string | null;
 last_failure: string | null;
 failure_count: number;
 health_status: 'healthy' | 'rate_limited' | 'unhealthy' | 'quota_exhausted' | 'disabled';
 created_at: string;
 updated_at: string;
}

export interface MasterApiKeyInput {
 provider: string;
 name: string;
 api_key: string;
 priority?: number;
 total_credits?: number;
 status?: MasterApiKeyRow['status'];
}

export interface MasterApiKeyStats {
 id: string;
 totalRequests: number;
 successRequests: number;
 failedRequests: number;
 successRate: number;
 totalCredits: number;
 usedCredits: number;
 remainingCredits: number;
 lastUsed: string | null;
 lastFailure: string | null;
 failureCount: number;
}

// ---------------------------------------------------------------------------
// User API Keys
// ---------------------------------------------------------------------------
export interface UserApiKeyRow {
 id: string;
 user_id: string;
 api_key: string;
 name: string;
 status: 'active' | 'disabled' | 'expired' | 'revoked';
 allocated_credits: number;
 used_credits: number;
 remaining_credits: number;
 expiry_date: string | null;
 rate_limit: number;
 allowed_models: string[];
 allowed_providers: string[];
 total_requests: number;
 success_requests: number;
 failed_requests: number;
 last_used: string | null;
 created_at: string;
 updated_at: string;
 plan_name: string;
 pricing_type: 'flat' | 'per_token';
 price_per_1m_input_tokens: number;
 price_per_1m_output_tokens: number;
 last_prompt_tokens: number;
 last_completion_tokens: number;
 total_prompt_tokens: number;
 total_completion_tokens: number;
}

export interface UserApiKeyInput {
 user_id: string;
 name?: string;
 allocated_credits?: number;
 expiry_date?: string | null;
 rate_limit?: number;
 allowed_models?: string[];
 allowed_providers?: string[];
}

// ---------------------------------------------------------------------------
// API Request Logs
// ---------------------------------------------------------------------------
export interface ApiRequestLogRow {
 id: string;
 request_id: string;
 user_id: string | null;
 user_api_key_id: string | null;
 user_api_key_prefix: string;
 master_api_key_id: string | null;
 master_key_prefix: string;
 provider: string;
 model: string;
 prompt_tokens: number;
 completion_tokens: number;
 total_tokens: number;
 credits_used: number;
 response_time_ms: number;
 http_status: number;
 is_success: boolean;
 error_message: string;
 ip_address: string;
 user_agent: string;
 request_body: Record<string, any>;
 created_at: string;
}

export interface ApiRequestLogFilters {
 search?: string;
 provider?: string;
 model?: string;
 status?: 'success' | 'error';
 userId?: string;
 masterKeyId?: string;
 dateFrom?: string;
 dateTo?: string;
}

// ---------------------------------------------------------------------------
// Failover Logs
// ---------------------------------------------------------------------------
export interface ApiFailoverLogRow {
 id: string;
 request_id: string;
 original_master_key_id: string | null;
 new_master_key_id: string | null;
 original_provider: string;
 new_provider: string;
 failure_reason: string;
 http_status: number | null;
 error_message: string;
 retry_number: number;
 model: string;
 ip_address: string;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Provider Health
// ---------------------------------------------------------------------------
export interface ProviderHealthRow {
 id: string;
 master_api_key_id: string;
 status: 'healthy' | 'rate_limited' | 'unhealthy' | 'quota_exhausted' | 'disabled';
 consecutive_failures: number;
 consecutive_successes: number;
 last_check: string;
 last_success: string | null;
 last_failure: string | null;
 last_error: string;
 avg_response_time_ms: number;
 total_checks: number;
 success_rate: number;
 retry_after: string | null;
 created_at: string;
 updated_at: string;
}

// ---------------------------------------------------------------------------
// Usage Statistics
// ---------------------------------------------------------------------------
export interface UsageStatRow {
 id: string;
 date: string;
 master_api_key_id: string | null;
 provider: string;
 total_requests: number;
 success_requests: number;
 failed_requests: number;
 total_tokens: number;
 total_credits: number;
 avg_response_time_ms: number;
 failover_count: number;
 created_at: string;
}

// ---------------------------------------------------------------------------
// User Credit History
// ---------------------------------------------------------------------------
export interface UserCreditHistoryRow {
 id: string;
 user_id: string;
 user_api_key_id: string | null;
 action: 'allocated' | 'used' | 'refunded' | 'reset' | 'expired' | 'purchased';
 amount: number;
 balance_after: number;
 description: string;
 request_id: string | null;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Gateway Configuration
// ---------------------------------------------------------------------------
export interface GatewayConfigRow {
 id: string;
 key: string;
 value: string;
 value_type: 'string' | 'number' | 'boolean' | 'json';
 description: string;
 updated_at: string;
}

export interface GatewayConfigInput {
 key: string;
 value: string;
 value_type?: GatewayConfigRow['value_type'];
 description?: string;
}

// ---------------------------------------------------------------------------
// Gateway Request / Response Flow
// ---------------------------------------------------------------------------
export interface GatewayRequestContext {
 requestId: string;
 userApiKey: UserApiKeyRow;
 provider: string;
 model: string;
 messages: any[];
 ipAddress: string;
 userAgent: string;
 endpointPath?: string;
 body?: Record<string, any>;
 headers?: any;
 signal?: AbortSignal;
}

export interface GatewayResponseContext {
 requestId: string;
 masterKeyId: string;
 provider: string;
 httpStatus: number;
 isSuccess: boolean;
 promptTokens: number;
 completionTokens: number;
 totalTokens: number;
 creditsUsed: number;
 responseTimeMs: number;
 errorMessage?: string;
 responseBody: any;
 retryNumber: number;
 isStream?: boolean;
 stream?: any;
 contentType?: string;
}

export interface FailoverEvent {
 requestId: string;
 originalKeyId: string;
 newKeyId: string;
 originalProvider: string;
 newProvider: string;
 failureReason: string;
 httpStatus: number | null;
 errorMessage: string;
 retryNumber: number;
 model: string;
 ipAddress: string;
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------
export interface ProviderConfig {
 name: string;
 baseUrl: string;
 authHeader: string;
 modelsEndpoint?: string;
 supportsStreaming: boolean;
 tokenPricing: Record<string, { input: number; output: number }>;
}

export interface TokenUsage {
 promptTokens: number;
 completionTokens: number;
 totalTokens: number;
}

export interface ChatCompletionMessage {
 role: 'system' | 'user' | 'assistant';
 content: string;
}

export interface ChatCompletionRequest {
 model: string;
 messages: ChatCompletionMessage[];
 max_tokens?: number;
 temperature?: number;
 stream?: boolean;
 [key: string]: any;
}

export interface ChatCompletionResponse {
 id: string;
 choices: { message: { content: string }; finish_reason: string }[];
 usage?: TokenUsage;
 error?: { message: string; type: string };
 provider?: string;
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------
export interface DashboardStats {
 totalMasterKeys: number;
 activeMasterKeys: number;
 failedMasterKeys: number;
 totalUserKeys: number;
 totalRequestsToday: number;
 successRate: number;
 providerStatus: ProviderStatusItem[];
 totalCreditsRemaining: number;
 avgResponseTime: number;
 failoverCountToday: number;
}

export interface ProviderStatusItem {
 provider: string;
 status: 'online' | 'degraded' | 'offline';
 activeKeys: number;
 totalKeys: number;
 successRate: number;
 remainingCredits: number;
}

export interface ChartDataPoint {
 label: string;
 requests: number;
 tokens: number;
 credits: number;
 errors: number;
 failovers: number;
}
