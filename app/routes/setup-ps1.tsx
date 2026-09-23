import { type LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const host = "https://opuszen.shop";

  const apiEndpoint = import.meta.env.VITE_API_URL || "https://api.opuszen.shop";
  const brandName = "OpusZen";

  const scriptContent = `# ${brandName} Setup Script for Windows
# Usage: irm ${host}/setup.ps1 | iex

[console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Stop"

$ApiEndpoint    = "${apiEndpoint}"

# ── Banner ──
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║         ${brandName} Setup for Windows        ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$ApiKey = Read-Host "  Enter your ${brandName} API key"
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "  ✗ API key cannot be empty. Aborting." -ForegroundColor Red
    return
}
Write-Host ""

# ── Helpers ──
function Read-JsonFile {
    param([string]$Path)
    if (Test-Path $Path) {
        try {
            $raw = Get-Content -Path $Path -Raw -ErrorAction Stop
            if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
            return $raw | ConvertFrom-Json -ErrorAction Stop
        } catch { return @{} }
    }
    return @{}
}

function Write-JsonFile {
    param([string]$Path, [object]$Data)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $Data | ConvertTo-Json -Depth 10 | Set-Content -Path $Path -Encoding UTF8
}

function Set-JsonProp {
    param([psobject]$Obj, [string]$Name, [object]$Value)
    if ($Obj.PSObject.Properties.Name -contains $Name) {
        $Obj.$Name = $Value
    } else {
        $Obj | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
}

function Ensure-Property {
    param([psobject]$Obj, [string]$Name, [object]$Default)
    if (-not ($Obj.PSObject.Properties.Name -contains $Name)) {
        $Obj | Add-Member -NotePropertyName $Name -NotePropertyValue $Default
    }
}

# ── [1/2] Check Node.js ──
Write-Host "  [1/2] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "  ✓ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    return
}

# ── [2/2] Configure Claude Code (~/.claude/settings.json) ──
Write-Host "  [2/2] Configuring Claude Code..." -ForegroundColor Yellow
try {
    $settingsPath = Join-Path (Join-Path $env:USERPROFILE ".claude") "settings.json"
    $settings = Read-JsonFile -Path $settingsPath
    Ensure-Property -Obj $settings -Name "env" -Default ([PSCustomObject]@{})

    $envVars = @{
        "ANTHROPIC_AUTH_TOKEN"                     = $ApiKey
        "ANTHROPIC_BASE_URL"                       = $ApiEndpoint
        "ANTHROPIC_MODEL"                          = "Opus 4.8"
        "ANTHROPIC_SMALL_FAST_MODEL"               = "Haiku 4.5"
        "ANTHROPIC_DEFAULT_SONNET_MODEL"           = "Sonnet 4.6"
        "ANTHROPIC_DEFAULT_OPUS_MODEL"             = "Opus 4.8"
        "ANTHROPIC_DEFAULT_HAIKU_MODEL"            = "Haiku 4.5"
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC" = "1"
    }
    foreach ($key in $envVars.Keys) {
        Set-JsonProp -Obj $settings.env -Name $key -Value $envVars[$key]
    }

    Set-JsonProp -Obj $settings -Name "hasCompletedOnboarding" -Value $true

    Write-JsonFile -Path $settingsPath -Data $settings
    Write-Host "  ✓ $settingsPath" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed: $_" -ForegroundColor Red
    return
}

# ── Verify ──
Write-Host ""
Write-Host "  Verifying connection..." -ForegroundColor Yellow
try {
    $headers = @{ "x-api-key" = $ApiKey }
    $verifyUrl = if ($ApiEndpoint -match '/v1/?$') { "$ApiEndpoint/models" } else { "$ApiEndpoint/v1/models" }
    Invoke-RestMethod -Uri $verifyUrl -Headers $headers -Method Get -TimeoutSec 10 | Out-Null
    Write-Host "  ✓ Connected" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not verify (config saved — check key later)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║       ✓ Setup complete!                  ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Restart Claude Code to apply." -ForegroundColor White
Write-Host "  Re-run anytime to update your key." -ForegroundColor White
Write-Host ""
`;

  return new Response(scriptContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline; filename=\"setup.ps1\"",
    },
  });
}
