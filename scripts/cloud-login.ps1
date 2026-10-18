$ErrorActionPreference = 'Stop'
$portableBin = Join-Path $env:LOCALAPPDATA 'AsensoOneTools\google-cloud-sdk\bin'
if (!(Get-Command gcloud -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath (Join-Path $portableBin 'gcloud.cmd'))) {
 $env:PATH = $portableBin + ';' + $env:PATH
}
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) { throw 'Install Google Cloud CLI before running this script.' }
$portablePython = Join-Path $env:LOCALAPPDATA 'AsensoOneTools\google-cloud-sdk\platform\bundledpython\python.exe'
if (Test-Path -LiteralPath $portablePython) { $env:CLOUDSDK_PYTHON = $portablePython }
gcloud auth login
if ($LASTEXITCODE -ne 0) { throw 'Google Cloud sign-in did not complete.' }
npx --yes firebase-tools@15.34.0 login
if ($LASTEXITCODE -ne 0) { throw 'Firebase sign-in did not complete.' }
Write-Output 'Cloud and Firebase sign-in complete. Deployment can continue.'
