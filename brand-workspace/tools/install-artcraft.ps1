<#
.SYNOPSIS
  Instala (o actualiza) la suite ArtCraft Crafting Apps en modo portable para Windows x64
  y deja los binarios CLI listos para ser usados como servidores MCP por Antigravity.

.DESCRIPTION
  - Descarga la ultima release de cada app desde github.com/storytold/<app>.
  - Extrae en %USERPROFILE%\.artcraft\<app>\
  - Localiza el ejecutable <app>-cli.exe y escribe un manifiesto (artcraft-manifest.json)
    que usa sync-mcp-config.ps1 para generar el mcp_config.json del plugin.
  - Anade cada carpeta al PATH del usuario (requiere reiniciar Antigravity para que lo vea).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File brand-workspace/tools/install-artcraft.ps1
  powershell -ExecutionPolicy Bypass -File brand-workspace/tools/install-artcraft.ps1 -Apps vectorcraft,photocraft
#>
param(
  [string[]]$Apps = @("vectorcraft","photocraft","figcraft","designcraft","pdfcraft","deckcraft","wordcraft","effectcraft","filmcraft","soundcraft","lightcraft"),
  [string]$InstallRoot = (Join-Path $env:USERPROFILE ".artcraft"),
  [string]$Arch = "x64",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # Invoke-WebRequest es 10x mas lento con barra de progreso
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
$manifestPath = Join-Path $InstallRoot "artcraft-manifest.json"
$manifest = @{}
if (Test-Path $manifestPath) {
  (Get-Content $manifestPath -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $manifest[$_.Name] = $_.Value }
}

foreach ($app in $Apps) {
  Write-Host "==> $app" -ForegroundColor Cyan
  try {
    $rel = Invoke-RestMethod "https://api.github.com/repos/storytold/$app/releases/latest" -Headers @{ "User-Agent" = "tec360-brand-studio" }
    $asset = $rel.assets | Where-Object { $_.name -match "windows-$Arch-portable\.zip$" } | Select-Object -First 1
    if (-not $asset) { Write-Warning "   Sin build portable windows-$Arch para $app"; continue }

    $dest = Join-Path $InstallRoot $app
    $current = $manifest[$app]
    if (-not $Force -and $current -and $current.version -eq $rel.tag_name -and (Test-Path $current.cli)) {
      Write-Host "   Ya instalado $($rel.tag_name) -> $($current.cli)"; continue
    }

    $zip = Join-Path $env:TEMP $asset.name
    Write-Host "   Descargando $($asset.name) ($([math]::Round($asset.size/1MB,1)) MB)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing

    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    Remove-Item $zip -Force

    $cli = Get-ChildItem $dest -Recurse -Filter "$app-cli.exe" | Select-Object -First 1
    $gui = Get-ChildItem $dest -Recurse -Filter "$app.exe" | Select-Object -First 1
    if (-not $cli) {
      # Algunas apps exponen el MCP desde el binario principal (`<app>.exe mcp`)
      $cli = $gui
      Write-Warning "   No se encontro $app-cli.exe; se usara $($gui.Name) como entrada MCP"
    }
    if (-not $cli) { Write-Warning "   No se encontro ejecutable para $app"; continue }

    $manifest[$app] = [pscustomobject]@{
      version = $rel.tag_name
      cli     = $cli.FullName
      gui     = $(if ($gui) { $gui.FullName } else { $null })
      dir     = $cli.DirectoryName
    }
    Write-Host "   OK $($rel.tag_name) -> $($cli.FullName)" -ForegroundColor Green
  } catch {
    Write-Warning "   Fallo $app : $($_.Exception.Message)"
  }
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content $manifestPath -Encoding UTF8
Write-Host "`nManifiesto: $manifestPath" -ForegroundColor Yellow

# PATH de usuario (persistente)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$parts = @($userPath -split ";" | Where-Object { $_ })
$changed = $false
foreach ($entry in $manifest.Values) {
  if ($entry.dir -and ($parts -notcontains $entry.dir)) { $parts += $entry.dir; $changed = $true }
}
if ($changed) {
  [Environment]::SetEnvironmentVariable("Path", ($parts -join ";"), "User")
  Write-Host "PATH de usuario actualizado (reinicia Antigravity para que los MCP lo hereden)." -ForegroundColor Yellow
}
