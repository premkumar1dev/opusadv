# Why Claude Desktop Is Still Showing Connection Error

**Date:** September 24, 2026  
**Status:** Root Causes Diagnosed with Live Test Evidence  

---

## The 2 Exact Reasons Claude Desktop Still Shows a Red Dot

You are currently facing the connection error for **two specific reasons**:

```text
REASON 1: You are using https://api.opuszen.shop in Claude Desktop
          └── That domain is NOT pointing to this repository. It points to an old server that crashes with HTTP 500 CORS.

REASON 2: There is no Upstream Master Key configured in Vercel / Database
          └── Earlier, all master keys were deleted. Without an active upstream key (OPUSMAX_API_KEY),
              the gateway returns HTTP 502 Bad Gateway when Claude Desktop tests the connection.
```

---

## Live Evidence from Actual Server Tests

### Test 1: `api.opuszen.shop` vs `www.opuszen.shop`

We tested both domains live right now:

#### Domain A: `https://api.opuszen.shop/v1/messages` (OLD SERVER)
```http
OPTIONS https://api.opuszen.shop/v1/messages
Origin: http://localhost

HTTP/1.1 500 Internal Server Error
{"status":"error","message":"Not allowed by CORS"}
```
❌ **This domain is NOT this GitHub repository.** It is an older Express project deployed elsewhere on Vercel. Chromium immediately aborts before sending any data.

---

#### Domain B: `https://www.opuszen.shop/v1/messages` (OUR FIXED REPO)
```http
OPTIONS https://www.opuszen.shop/v1/messages
Origin: http://localhost

HTTP/1.1 204 No Content
access-control-allow-origin: http://localhost
access-control-allow-methods: GET, POST, OPTIONS, HEAD, PUT, DELETE
access-control-allow-headers: authorization,content-type,anthropic-version,x-api-key
access-control-allow-credentials: true
```
✅ **CORS on this repository is 100% FIXED and working!**

---

### Test 2: Upstream Master Key is Missing

When Claude Desktop connects to the gateway, it sends a minimal message to verify the connection.

When testing `https://www.opuszen.shop/v1/messages` with your valid customer key:
```http
POST https://www.opuszen.shop/v1/messages
x-api-key: sk_live_HgP0Z__935eIUK7z7xC-_J8ZfhTNUMzV

HTTP/1.1 502 Bad Gateway
{
  "type": "error",
  "error": {
    "type": "service_unavailable",
    "message": "OpusZen Gateway upstream provider key is not configured or inactive. Please set OPUSMAX_API_KEY in the environment or configure an active provider key in the admin dashboard.",
    "status": 502
  }
}
```

Because all master keys were removed from the database earlier and `OPUSMAX_API_KEY` has not been set in Vercel, the gateway has no credentials to call OpusMax upstream. Claude Desktop interprets the `502` as "Connection Failed" (Red Dot).

---

## How to Fix Both in 2 Minutes

### Step 1: In Claude Desktop Settings, Use `www.opuszen.shop`

In your Claude Desktop configuration (or custom inference settings):

* **Base URL:**
  ```text
  https://www.opuszen.shop/v1
  ```
  *(Do NOT use `api.opuszen.shop` until Step 3 is done)*

* **API Key:**
  ```text
  sk_live_HgP0Z__935eIUK7z7xC-_J8ZfhTNUMzV
  ```

---

### Step 2: Add Your Active OpusMax Master Key

The gateway needs a valid server-side key to connect to `api.opusmax.live`.

**Option A (Recommended — In Vercel Environment Variables):**
1. Go to [vercel.com](https://vercel.com) -> Select your **OpusZen** project.
2. Go to **Settings** -> **Environment Variables**.
3. Add a new variable:
   * **Key:** `OPUSMAX_API_KEY`
   * **Value:** `<your-active-opusmax-key>` (e.g. `sk-ant-opm-...`)
4. Click **Save** and trigger a **Redeploy**.

**Option B (In Admin Dashboard):**
1. Open `https://www.opuszen.shop/auth/admin/gateway/keys`.
2. Click **Add Master Key**.
3. Provider: `opusmax` | Base URL: `https://api.opusmax.live/v1` | Key: `<your-active-opusmax-key>`.
4. Click **Save**.

---

### Step 3: Point `api.opuszen.shop` to This Project in Vercel

If you want Claude Desktop to use `https://api.opuszen.shop` instead of `www.opuszen.shop`:

1. Open your Vercel Dashboard -> Go to the **opuszen** project (this repo).
2. Go to **Settings** -> **Domains**.
3. Add **`api.opuszen.shop`**.
4. If Vercel says it is assigned to another project, click **Transfer** or remove it from the old project first.
5. Once added to this project, `https://api.opuszen.shop` will immediately use our new codebase with the CORS 204 fix!
