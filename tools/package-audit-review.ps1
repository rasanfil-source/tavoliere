$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskManifest = Get-Content -LiteralPath (Join-Path $taskRoot 'prototypes/firebase-spark-pwa/dist/build-manifest.json') -Raw | ConvertFrom-Json
$taskRelease = $taskManifest.release
$taskOutput = Join-Path $taskRoot 'artifacts'
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskZipPath = Join-Path $taskOutput "tavola-comune-audit-$taskRelease.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive = [System.IO.Compression.ZipFile]::Open($taskZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $taskFiles = @()
  foreach ($taskDirectory in @('prototypes/firebase-spark-pwa/public', 'prototypes/firebase-spark-pwa/dist', 'tests')) {
    $taskFiles += Get-ChildItem -LiteralPath (Join-Path $taskRoot $taskDirectory) -File -Recurse
  }
  foreach ($taskFile in @('package.json', 'package-lock.json', 'prototypes/firebase-spark-pwa/firebase.json',
    'prototypes/firebase-spark-pwa/firestore.rules', 'prototypes/firebase-spark-pwa/firestore.indexes.json',
    'tools/build-public.mjs', 'tools/predeploy-gate.mjs', 'tools/firebase-cli.mjs', 'tools/verify-hosting-release.mjs', 'tools/check-invited-browser.cjs',
    'docs/VERIFICA_SEGNALAZIONI_2026-10-17.md', 'docs/VERIFICA_CASI_LIMITE_2026-10-18.md')) {
    $taskFiles += Get-Item -LiteralPath (Join-Path $taskRoot $taskFile)
  }
  foreach ($taskFileInfo in $taskFiles) {
    $taskRelative = [System.IO.Path]::GetRelativePath($taskRoot, $taskFileInfo.FullName).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskArchive, $taskFileInfo.FullName, $taskRelative) | Out-Null
  }
} finally {
  $taskArchive.Dispose()
}
$taskCheck = [System.IO.Compression.ZipFile]::OpenRead($taskZipPath)
try {
  $taskEntry = $taskCheck.GetEntry('prototypes/firebase-spark-pwa/dist/build-manifest.json')
  $taskReader = [System.IO.StreamReader]::new($taskEntry.Open())
  try { $taskArchivedManifest = $taskReader.ReadToEnd() | ConvertFrom-Json } finally { $taskReader.Dispose() }
  if ($taskArchivedManifest.release -ne $taskRelease) { throw 'Release archivio non coerente' }
  Write-Output "Archivio verificato: $($taskCheck.Entries.Count) file; release $taskRelease"
} finally { $taskCheck.Dispose() }
Get-FileHash -LiteralPath $taskZipPath -Algorithm SHA256
