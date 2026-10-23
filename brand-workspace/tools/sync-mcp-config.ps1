<#
.SYNOPSIS
  Genera .agents/plugins/tec360-creative-studio/mcp_config.json a partir del manifiesto
  de instalacion de ArtCraft (~/.artcraft/artcraft-manifest.json).

.DESCRIPTION
  Cada servidor ArtCraft arranca en modo headless confinado:
    --automation-read-root  <repo>/brand-workspace            (lee assets-in/ y deliverables/ para encadenar fases)
    --automation-write-root <repo>/brand-workspace/deliverables
  Ademas registra los servidores complementarios del pipeline:
    dembrandt   -> tokens en vivo / auditoria de deriva del sitio
    playwright  -> verificacion visual headless (bucle de auditoria multimodal)
  El servidor generativo (Stitch) vive en la config GLOBAL (~/.gemini/config/mcp_config.json)
  porque lleva una API key y este archivo se versiona.

  Vuelve a ejecutarlo despues de install-artcraft.ps1 (las rutas cambian con cada version).
#>
param(
  [string]$Manifest = (Join-Path $env:USERPROFILE ".artcraft\artcraft-manifest.json")
)
$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ws   = Join-Path $repo "brand-workspace"
$out  = Join-Path $ws "deliverables"
$pluginDir = Join-Path $repo ".agents\plugins\tec360-creative-studio"
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null

function P([string]$p) { $p -replace "\\", "/" }

$m = Get-Content $Manifest -Raw | ConvertFrom-Json
$servers = [ordered]@{}

# Flags especificos verificados con `<app>-cli help` en las versiones instaladas
$extra = @{
  vectorcraft = @("--headless")
  pdfcraft    = @("--compact")      # expone tool_search/tool_call en vez de 161 herramientas sueltas
  lightcraft  = @("--compact")
}
# Apps cuyo MCP no acepta roots de confinamiento (se controlan por --project/--library)
$noRoots = @("filmcraft","effectcraft","lightcraft")

foreach ($p in $m.PSObject.Properties) {
  $name = $p.Name
  $cliArgs = @("mcp")
  if ($extra.ContainsKey($name)) { $cliArgs += $extra[$name] }
  if ($noRoots -notcontains $name) {
    $cliArgs += @("--automation-read-root", (P $ws), "--automation-write-root", (P $out))
  }
  $servers[$name] = [ordered]@{ command = (P $p.Value.cli); args = $cliArgs }
}

$servers["dembrandt"]  = [ordered]@{ command = "npx"; args = @("-y", "dembrandt", "mcp") }
$servers["playwright"] = [ordered]@{ command = "npx"; args = @("-y", "@playwright/mcp@latest", "--headless", "--output-dir", (P (Join-Path $out "audit"))) }

# Leer STITCH_API_KEY desde la config global si existe para incluir StitchMCP en .agents/mcp_config.json
$stitchKey = $env:STITCH_API_KEY
$globalCfgPath = Join-Path $env:USERPROFILE ".gemini\config\mcp_config.json"
if (-not $stitchKey -and (Test-Path $globalCfgPath)) {
  $rawGlobal = Get-Content $globalCfgPath -Raw
  if ($rawGlobal -match "X-Goog-Api-Key:\s*([A-Za-z0-9._\-]+)") { $stitchKey = $Matches[1] }
  elseif ($rawGlobal -match '"STITCH_API_KEY"\s*:\s*"([^"]+)"') { $stitchKey = $Matches[1] }
}

$config = [ordered]@{ mcpServers = $servers }
$json = $config | ConvertTo-Json -Depth 6
$target = Join-Path $pluginDir "mcp_config.json"
[IO.File]::WriteAllText($target, $json, (New-Object Text.UTF8Encoding $false))
Write-Host "Escrito $target con $($servers.Count) servidores:" -ForegroundColor Green
$servers.Keys | ForEach-Object { Write-Host "  - $_" }

# Escribir tambien .agents/mcp_config.json (nivel proyecto, como indica la Seccion 4 del documento)
$projectServers = [ordered]@{}
foreach ($k in $servers.Keys) { $projectServers[$k] = $servers[$k] }
$projectServers["stitch"] = [ordered]@{
  command = "npx"
  args    = @("-y", "@_davideast/stitch-mcp", "proxy")
  env     = [ordered]@{ STITCH_API_KEY = $(if ($stitchKey) { $stitchKey } else { "YOUR_STITCH_API_KEY" }) }
}
$projectCfgPath = Join-Path $repo ".agents\mcp_config.json"
[IO.File]::WriteAllText($projectCfgPath, ([ordered]@{ mcpServers = $projectServers } | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))
Write-Host "Escrito $projectCfgPath (incluye servidor generativo Google Stitch)" -ForegroundColor Cyan
