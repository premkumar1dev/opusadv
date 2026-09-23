# API.OPUSZEN.SHOP — Complete Production Domain Fix Report

**Date:** September 24, 2026  
**Status:** Root Cause Identified — Manual Vercel Action Required  
**Project ID:** `prj_1nyemSS5pbtcI39sGY5ysMWt8mJM` (Vercel project name: `opuszen`)

---

## Executive Summary

The code in this repository is **100% correct and working**. The CORS, authentication, security, and gateway fixes are all deployed and verified on `www.opuszen.shop`.

The **sole remaining blocker** is that `api.opuszen.shop` is attached to a **different, old Vercel project** (a NestJS/Express app with Helmet.js middleware), not to the current OpusZen project. This is a **Vercel domain assignment problem**, not a code problem.

**Once you reassign the domain in Vercel (2-minute manual step), `api.opuszen.shop` will instantly serve the fixed gateway.**

---

## Root Cause: Domain Points to a Different Vercel Project

### Evidence

| Attribute | `api.opuszen.shop` (OLD PROJECT) | `www.opuszen.shop` (THIS PROJECT) |
|---|---|---|
| `GET /` | `404 {"message":"Cannot GET /","error":"Not Found","statusCode":404}` (Express/NestJS) | `200` with full HTML page (React Router) |
| `GET /health` | `{"status":"healthy","env":"production","uptime":...}` (old Express) | `{"status":"ok","refreshInterval":30,"overall":"operational",...}` (our code) |
| `GET /api/status` | `404 {"message":"Cannot GET /api/status"}` (route doesn't exist) | `200 {"status":"ok","timestamp":"..."}` (our route) |
| `GET /v1/messages` | `401 {"status":"error","message":"API key is missing..."}` (old CORS-breaking code) | `200 {"status":"ok","service":"OpusZen API Gateway","version":"9.8.0"}` |
| `OPTIONS /v1/messages` | **`500 {"status":"error","message":"Not allowed by CORS"}`** | **`204 No Content`** with full CORS headers ✅ |
| Response Headers | `x-dns-prefetch-control`, `x-download-options`, `x-frame-options`, `x-permitted-cross-domain-policies`, `x-xss-protection` (Helmet.js = Express/NestJS) | `access-control-max-age: 86400` (our CORS middleware) |
| Service Version | None | `9.8.0` |
| DNS A Records | `216.198.79.1`, `64.29.17.1` | `216.198.79.1`, `64.29.17.65` |

**Conclusion:** `api.opuszen.shop` is assigned to a **separate, old Vercel project** running an Express/NestJS application with Helmet.js middleware. It is NOT connected to this repository.

---

## Fix: Reassign Domain in Vercel Dashboard (2 Minutes)

### Step 1: Log in to Vercel

Go to [https://vercel.com/dashboard](https://vercel.com/dashboard) and log in.

### Step 2: Find the OLD Project That Has `api.opuszen.shop`

1. Click on **each project** in your dashboard.
2. For each project, go to **Settings → Domains**.
3. Find the project that has `api.opuszen.shop` listed as a domain.
4. **Note:** This old project will NOT be named `opuszen`. It will be a different project (likely an Express/NestJS API project).

### Step 3: Remove `api.opuszen.shop` From the Old Project

1. In the old project's **Settings → Domains**, find `api.opuszen.shop`.
2. Click the **⋯** menu (or trash icon) next to it.
3. Click **Remove** to detach the domain from the old project.

### Step 4: Add `api.opuszen.shop` to the Current OpusZen Project

1. Go to the **opuszen** project (Project ID: `prj_1nyemSS5pbtcI39sGY5ysMWt8mJM`).
2. Go to **Settings → Domains**.
3. Click **Add Domain**.
4. Enter: `api.opuszen.shop`
5. Click **Add**.
6. Vercel will verify DNS automatically (DNS already points to Vercel's IPs: `216.198.79.1`, `64.29.17.1`).

### Step 5: Verify

After adding the domain (takes 10-30 seconds to propagate on Vercel), run:

```powershell
curl.exe -i -X OPTIONS "https://api.opuszen.shop/v1/messages" -H "Origin: http://localhost" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: authorization,content-type,anthropic-version,x-api-key"
```

**Expected result:**
```http
HTTP/2 204
access-control-allow-origin: http://localhost
access-control-allow-methods: GET, POST, OPTIONS, HEAD, PUT, DELETE
access-control-allow-headers: authorization,content-type,anthropic-version,x-api-key
access-control-max-age: 86400
access-control-allow-credentials: true
```

---

## Alternative: Transfer Domain Directly

If Vercel shows that `api.opuszen.shop` belongs to another project when you try to add it, Vercel will offer a **"Transfer"** button. Click **Transfer** to move it from the old project to the `opuszen` project in one step.

---

## What Has Already Been Fixed in Code (Deployed to `www.opuszen.shop`)

All of these are live and working on `www.opuszen.shop` right now:

### 1. CORS Preflight (`vercel.json` + `cors.ts` + `api.chat.completions.tsx`)
- Edge CORS headers in `vercel.json` for `/v1/(.*)`, `/api/(.*)`, `/messages`
- `OPTIONS` intercepted BEFORE authentication → returns `204 No Content`
- Dynamic origin reflection for `http://localhost`, Electron, Chromium
- Proper `Access-Control-Allow-Credentials: true` when origin is reflected

### 2. Customer Key Authentication (`user-key-service.ts`)
- `validateUserApiKeyDetailed()` with specific error codes:
  - `401` for invalid, expired, or missing keys
  - `402` for exhausted credits
  - `403` for revoked keys
- Customer keys (`sk_live_...`) are NEVER forwarded upstream

### 3. Provider Key Protection (`gateway-service.ts`)
- `OPUSMAX_API_KEY` environment variable support (priority 0)
- `buildProviderHeaders()` strictly blocks `sk_live_` keys from upstream
- Safe `502 Bad Gateway` when no upstream key is configured

### 4. Structured Diagnostic Logging
- `[GATEWAY] REQUEST RECEIVED`, `OPTIONS PREFLIGHT`, `CUSTOMER AUTH RESULT`
- `[GATEWAY] PROVIDER SELECTED`, `UPSTREAM REQUEST START`, `UPSTREAM STATUS`, `REQUEST COMPLETED`
- All keys masked in logs

---

## After Domain Reassignment: Configure Upstream Key

Once `api.opuszen.shop` points to this project, you still need an active upstream provider key:

### Option A: Vercel Environment Variable (Recommended)
1. Vercel → Project **opuszen** → **Settings** → **Environment Variables**
2. Add: `OPUSMAX_API_KEY` = `<your-active-opusmax-provider-key>`
3. Click **Save** → **Redeploy**

### Option B: Admin Dashboard
1. Go to `https://www.opuszen.shop/auth/admin/gateway/keys`
2. Add a master key with provider `opusmax` and your active upstream key

---

## Final Claude Desktop Configuration

After completing the domain reassignment and provider key setup:

```json
{
  "baseUrl": "https://api.opuszen.shop/v1",
  "apiKey": "sk_live_HgP0Z__935eIUK7z7xC-_J8ZfhTNUMzV"
}
```

### Expected Flow
```
Claude Desktop
    │
    ▼
https://api.opuszen.shop/v1/messages
    │
    ├── OPTIONS → 204 No Content (CORS, no auth needed)
    │
    └── POST → OpusZen Gateway
              │
              ├── Customer Auth (sk_live_...) → Supabase user_api_keys
              ├── Credits / Quota Check
              ├── Rate Limiting
              ├── Provider Selection (OPUSMAX_API_KEY)
              └── Upstream: api.opusmax.live/v1/messages
                    │
                    ▼
              Claude Response → Client
```

---

## Files Changed (Already Deployed)

| File | Change |
|---|---|
| `vercel.json` | Edge CORS headers for `/v1/(.*)`, `/api/(.*)`, `/messages` |
| `app/utils/cors.ts` | Localhost, Electron, dynamic origin support |
| `app/routes/api.chat.completions.tsx` | OPTIONS before auth, strict customer validation, structured logging |
| `app/utils/gateway-service.ts` | OPUSMAX_API_KEY env support, sk_live_ blocking, 502 safe errors |
| `app/utils/user-key-service.ts` | `validateUserApiKeyDetailed()` with 401/402/403 error codes |
| `.env` | `OPUSMAX_API_KEY=` template |

---

## Summary

| Item | Status |
|---|---|
| **Root Cause** | `api.opuszen.shop` assigned to old Express/NestJS Vercel project |
| **Code Fix** | ✅ Complete and deployed to `www.opuszen.shop` |
| **CORS Fix** | ✅ `204 No Content` with full headers |
| **Customer Auth** | ✅ Strict `sk_live_` validation, no passthrough |
| **Provider Security** | ✅ `sk_live_` never forwarded upstream |
| **Remaining Action** | ⚠️ Reassign `api.opuszen.shop` domain in Vercel Dashboard |
| **Remaining Action** | ⚠️ Set `OPUSMAX_API_KEY` in Vercel environment variables |
