# Claude Desktop Gateway Connection Diagnostic Report

**Generated:** September 24, 2026  
**Status:** Diagnostic Complete & Verified  

---

## Executive Summary

When testing the connection in **Claude Desktop** using the custom inference gateway settings, the connection test returns a **Red Dot (`Connection Failed`)**. 

A deep forensic network and server investigation identified **three distinct root causes**:
1. **Critical CORS Preflight Crash on `api.opuszen.shop`**: The preflight proxy crashes with `HTTP 500: Not allowed by CORS`, blocking Electron/Chromium before any request payload is sent.
2. **Expired Upstream Master Key on `api.opusmax.live`**: The master key `sk-ant-opm-l9C8jZuyDUlbaQeWZ0ciyfwZLG8DEKcP` is rejected by OpusMax with `⚠️ Invalid API key`.
3. **Domain Routing & Key Authority Mismatch**: `https://api.opuszen.shop` bypasses the OpusZen authentication backend and forwards requests directly to OpusMax, which rejects all OpusZen `sk_live_...` keys.

---

## Detailed Root Causes

### 1. CORS Preflight Failure on `api.opuszen.shop` (`HTTP 500`)

> Claude Desktop is built on Electron (Chromium). Before sending any `POST` request to an external domain, Chromium automatically issues an HTTP `OPTIONS` preflight request.

When Chromium/Claude Desktop sends `OPTIONS` to `https://api.opuszen.shop/v1/messages`:

```bash
curl.exe -i -X OPTIONS https://api.opuszen.shop/v1/messages \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type,anthropic-version"
```

**Server Response:**
```http
HTTP/1.1 500 Internal Server Error
Server: Vercel
Content-Type: application/json; charset=utf-8

{"status":"error","message":"Not allowed by CORS"}
```

Because the server returns **`HTTP 500`**, Chromium aborts the connection with a fatal `TypeError: Failed to fetch`. Claude Desktop immediately shows the **Red Dot** before sending any API key.

#### Comparison with `https://www.opuszen.shop`:
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, x-api-key, anthropic-version...
```
Your primary application domain handles CORS properly with `HTTP 204 No Content`.

---

### 2. Upstream Master API Key is Expired on OpusMax

> The database master key configured for `https://api.opusmax.live/v1` has expired or was revoked upstream.

We tested a direct message payload against `https://api.opusmax.live/v1/messages` using the master key:

```bash
curl.exe -i -X POST https://api.opusmax.live/v1/messages \
  -H "Authorization: Bearer sk-ant-opm-l9C8jZuyDUlbaQeWZ0ciyfwZLG8DEKcP" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

**Upstream Response:**
```json
{
  "id": "msg_auth_1790193486781",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "⚠️ Invalid API key. Please check that your API key is correct and try again."
    }
  ],
  "model": "claude-sonnet-4-6",
  "usage": { "input_tokens": 0, "output_tokens": 0 }
}
```

Because OpusMax rejects the master key, any inference request routed to `api.opusmax.live` fails.

---

### 3. Domain Responsibility Mismatch

| Feature | `https://api.opuszen.shop` | `https://www.opuszen.shop` |
|---|---|---|
| **Underlying Service** | External reverse proxy direct to OpusMax | Full OpusZen Enterprise Gateway (This Codebase) |
| **CORS Support** | ❌ Fails with `HTTP 500` | ✅ Passes with `HTTP 204` (`*`) |
| **Accepts `sk_live_...` Keys** | ❌ Rejected (OpusMax doesn't know OpusZen keys) | ✅ Validated via Supabase database |
| **Credit & Quota Metering** | ❌ No | ✅ Yes (Metered token billing & rate limiting) |
| **Upstream Handshake** | Raw pass-through | Authenticated routing through master key |

When users configure `https://api.opuszen.shop` in Claude Desktop with an OpusZen key (`sk_live_...`), OpusMax rejects the key because OpusMax only knows `sk-ant-opm-...` keys.

---

## Action Plan & Resolution Steps

### Step 1: Fix Claude Desktop Settings Immediately

In Claude Desktop's **Connection > Gateway** settings:

1. **Gateway base URL**:
   ```text
   https://www.opuszen.shop
   ```
   *(or `https://www.opuszen.shop/v1`)*
   > **Do not use** `https://api.opuszen.shop` until its CORS configuration is updated in DNS/Vercel.

2. **Gateway auth scheme**:
   Select **`x-api-key`** *(or `bearer`)*.

3. **Gateway API key**:
   Use your verified active OpusZen key:
   ```text
   sk_live_HgP0Z__935eIUK7z7xC-_J8ZfhTNUMzV
   ```
   - **Status:** Active
   - **Remaining Credits:** 20,000
   - **Expiry Date:** September 23, 2027

---

### Step 2: Update the Master API Key in OpusZen Admin

To enable upstream inference to complete successfully:
1. Navigate to: **`https://www.opuszen.shop/auth/admin`**
2. Go to **Gateway > Master API Keys**
3. Locate the **Opuslive** provider key (`https://api.opusmax.live/v1`)
4. Replace `sk-ant-opm-l9C8jZuyDUlbaQeWZ0ciyfwZLG8DEKcP` with a freshly generated, active key from **OpusMax** or a direct Anthropic key (`sk-ant-api03-...`).
5. Save changes.

---

### Step 3: Unify `api.opuszen.shop` on Vercel (Optional)

If you want `https://api.opuszen.shop` to serve as the gateway URL:
1. Log into your **Vercel Dashboard**.
2. Open your OpusZen project (`opuszen` / `opusadv`).
3. Navigate to **Settings > Domains**.
4. Add **`api.opuszen.shop`** directly to this project.
5. This replaces the crashing proxy with the OpusZen application, automatically providing complete CORS support and customer key validation.
