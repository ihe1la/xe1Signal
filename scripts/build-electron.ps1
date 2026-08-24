$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$electronVersion = '40.10.2'
$archiveName = "electron-v$electronVersion-win32-x64.zip"
$cacheRoot = Join-Path $env:LOCALAPPDATA 'electron\Cache'
$archive = Get-ChildItem -Path $cacheRoot -Filter $archiveName -File -Recurse -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $archive) {
  throw "Electron $electronVersion is not cached. Install it with npm after v2rayN is running."
}

$outputRoot = Join-Path $projectRoot 'dist\electron'
$appRoot = Join-Path $outputRoot 'xe1Signal-win32-x64'
$resourcesRoot = Join-Path $appRoot 'resources\app'
$resolvedOutputRoot = [IO.Path]::GetFullPath($outputRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$resolvedAppRoot = [IO.Path]::GetFullPath($appRoot)

if (-not $resolvedAppRoot.StartsWith("$resolvedOutputRoot$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to replace an output directory outside $resolvedOutputRoot"
}

if (Test-Path -LiteralPath $appRoot) {
  Remove-Item -LiteralPath $appRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
Expand-Archive -LiteralPath $archive.FullName -DestinationPath $appRoot -Force
Rename-Item -LiteralPath (Join-Path $appRoot 'electron.exe') -NewName 'xe1Signal.exe'
New-Item -ItemType Directory -Path $resourcesRoot -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $projectRoot 'electron\main.cjs') -Destination $resourcesRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'electron\offline.html') -Destination $resourcesRoot
Copy-Item -LiteralPath (Join-Path $projectRoot 'public\icon-512x512.png') -Destination (Join-Path $resourcesRoot 'icon.png')
Copy-Item -LiteralPath (Join-Path $projectRoot 'electron\app-package.json') -Destination (Join-Path $resourcesRoot 'package.json')

$zipPath = Join-Path $outputRoot 'xe1Signal-windows-x64.zip'
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $appRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Built $appRoot"
Write-Host "Packed $zipPath"
