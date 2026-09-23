import { type LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const host = "https://opuszen.shop";

  const apiEndpoint = import.meta.env.VITE_API_URL || "https://api.opuszen.shop";
  const brandName = "OpusZen";

  const scriptContent = `#!/usr/bin/env bash
set -e

# ${brandName} Setup — macOS / Linux
# Usage: curl -fsSL ${host}/setup.sh | bash

API_URL="${apiEndpoint}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         ✦ ${brandName} Setup                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

printf "  Enter your ${brandName} API key: "
read -r API_KEY </dev/tty

if [ -z "$API_KEY" ]; then
  echo "  ✗ API key cannot be empty."
  exit 1
fi
echo ""

# [1/3] Check Node.js
printf "  [1/3] Checking Node.js... "
if command -v node >/dev/null 2>&1; then
  echo "✓ \$(node -v)"
else
  echo "✗ Not found. Install from https://nodejs.org"
  exit 1
fi

# [2/3] Configure Claude Code env (~/.claude/settings.json)
printf "  [2/3] Configuring Claude Code... "
CLAUDE_DIR="\$HOME/.claude"
mkdir -p "\$CLAUDE_DIR"

SETUP_API_KEY="\$API_KEY" SETUP_API_URL="\$API_URL" SETUP_DIR="\$CLAUDE_DIR" \
node -e '
const fs = require("fs");
const { SETUP_API_KEY, SETUP_API_URL, SETUP_DIR } = process.env;
const p = SETUP_DIR + "/settings.json";
let s = {};
try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
if (!s.env) s.env = {};
s.env.ANTHROPIC_AUTH_TOKEN = SETUP_API_KEY;
s.env.ANTHROPIC_BASE_URL = SETUP_API_URL;
s.env.ANTHROPIC_MODEL = "Opus 4.8";
s.env.ANTHROPIC_SMALL_FAST_MODEL = "Haiku 4.5";
s.env.ANTHROPIC_DEFAULT_SONNET_MODEL = "Sonnet 4.6";
s.env.ANTHROPIC_DEFAULT_OPUS_MODEL = "Opus 4.8";
s.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = "Haiku 4.5";
s.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
s.hasCompletedOnboarding = true;
fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
'
echo "✓"

# [3/3] Verify
echo ""
printf "  Verifying connection... "
VERIFY_URL="\$API_URL/v1/models"
if [[ "\$API_URL" =~ /v1/?$ ]]; then
  VERIFY_URL="\$API_URL/models"
fi
HTTP=\$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: \$API_KEY" "\$VERIFY_URL" 2>/dev/null || echo "000")
if [ "\$HTTP" = "200" ]; then
  echo "✓ Connected"
else
  echo "⚠ HTTP \$HTTP (config saved — check key later)"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✓ Setup complete!                       ║"
echo "║  Restart Claude Code to apply.           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
`;

  return new Response(scriptContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline; filename=\"setup.sh\"",
    },
  });
}
