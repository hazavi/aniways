$ErrorActionPreference = 'Stop'
$electron = Join-Path $PSScriptRoot '..\desktop\node_modules\electron'
$executable = Join-Path $electron 'dist\electron.exe'
if (Test-Path -LiteralPath $executable) { exit 0 }

$version = (Get-Content (Join-Path $electron 'package.json') -Raw | ConvertFrom-Json).version
$archiveName = "electron-v$version-win32-x64.zip"
$checksums = Get-Content (Join-Path $electron 'checksums.json') -Raw | ConvertFrom-Json
$expectedHash = $checksums.$archiveName
if (-not $expectedHash) { throw "No checksum found for $archiveName" }

$archive = Join-Path $env:TEMP ("aniways-" + [guid]::NewGuid().ToString() + '.zip')
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/electron/electron/releases/download/v$version/$archiveName" -OutFile $archive
    $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
    if ($actualHash -ine $expectedHash) { throw 'Electron download checksum did not match.' }
    Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $electron 'dist') -Force
    [System.IO.File]::WriteAllText((Join-Path $electron 'path.txt'), 'electron.exe')
    if (-not (Test-Path -LiteralPath $executable)) { throw 'Electron executable was not extracted.' }
} finally {
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
}
