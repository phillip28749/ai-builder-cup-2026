param(
 [string]$Project = 'ai-builder-cup-66e9f',
 [string]$Region = 'asia-southeast1',
 [string]$Model = '',
 [string]$MediaBucket = ''
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
 $portableBin = Join-Path $env:LOCALAPPDATA 'AsensoOneTools\google-cloud-sdk\bin'
 if (Test-Path -LiteralPath (Join-Path $portableBin 'gcloud.cmd')) { $env:PATH = $portableBin + ';' + $env:PATH }
 else { throw 'Install Google Cloud CLI, then run gcloud auth login.' }
}
$portablePython = Join-Path $env:LOCALAPPDATA 'AsensoOneTools\google-cloud-sdk\platform\bundledpython\python.exe'
if (Test-Path -LiteralPath $portablePython) { $env:CLOUDSDK_PYTHON = $portablePython }
function Invoke-Cloud {
 & gcloud @args
 if ($LASTEXITCODE -ne 0) { throw 'Google Cloud command failed. Deployment stopped.' }
}
function Invoke-Firebase {
 & npx --yes firebase-tools@15.34.0 @args
 if ($LASTEXITCODE -ne 0) { throw 'Firebase command failed. Deployment stopped.' }
}
$active = Invoke-Cloud auth list --filter=status:ACTIVE --format='value(account)'
if (!$active) { throw 'Sign in first: gcloud auth login' }
$projects = Invoke-Firebase projects:list --non-interactive --json | ConvertFrom-Json
if (!($projects.result | Where-Object { $_.projectId -eq $Project })) { throw 'The Firebase login cannot access the selected project.' }
$billing = Invoke-Cloud billing projects describe $Project --format=json | ConvertFrom-Json
if (!$billing.billingEnabled) { throw 'Enable the Blaze billing plan in Firebase before deploying the backend.' }
if (!(Test-Path -LiteralPath '.env')) { throw 'Local .env is required to securely provision server configuration.' }
# Capture configuration in memory. Do not print keys or pass secret values on a command line.
$settingsJson = & node --input-type=module -e "import {parse} from 'dotenv';import{readFileSync}from'node:fs';process.stdout.write(JSON.stringify(parse(readFileSync('.env'))));"
if ($LASTEXITCODE -ne 0) { throw 'Could not read local server configuration.' }
$settings = $settingsJson | ConvertFrom-Json
$web = $settings.FIREBASE_WEB_CONFIG | ConvertFrom-Json
if ($web.projectId -ne $Project) { throw 'Firebase web configuration must match the deployment project.' }
if (!$settings.GEMINI_API_KEY) { throw 'Provide GEMINI_API_KEY in the local .env before deploying.' }
if (!$Model) { $Model = $settings.GEMINI_MODEL }
if (!$Model) { $Model = 'gemini-3.1-flash-lite' }
if (!$MediaBucket) { $MediaBucket = "$Project-asenso-media" }
if ($Region -ne 'asia-southeast1') { throw 'Update firebase.json run.region together with Region before using another region.' }
$origin = "https://$Project.web.app"
$runtime = "asensopost-runtime@$Project.iam.gserviceaccount.com"
$builder = "asenso-builder@$Project.iam.gserviceaccount.com"

Invoke-Cloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com sheets.googleapis.com drive.googleapis.com --project $Project --quiet
$accounts = Invoke-Cloud iam service-accounts list --project $Project --format=json | ConvertFrom-Json
if (!($accounts | Where-Object { $_.email -eq $runtime })) { Invoke-Cloud iam service-accounts create asensopost-runtime --display-name='Asenso One runtime' --project $Project --quiet }
if (!($accounts | Where-Object { $_.email -eq $builder })) { Invoke-Cloud iam service-accounts create asenso-builder --display-name='Asenso One build' --project $Project --quiet }
Invoke-Cloud projects add-iam-policy-binding $Project --member="serviceAccount:$runtime" --role=roles/datastore.user --condition=None --quiet | Out-Null
Invoke-Cloud projects add-iam-policy-binding $Project --member="serviceAccount:$builder" --role=roles/run.builder --condition=None --quiet | Out-Null

$databases = Invoke-Cloud firestore databases list --project $Project --format=json | ConvertFrom-Json
$database = $databases | Where-Object { $_.name -like '*/databases/(default)' }
if (!$database) { Invoke-Cloud firestore databases create --database='(default)' --location=$Region --type=firestore-native --project $Project --quiet }
elseif ($database.type -ne 'FIRESTORE_NATIVE') { throw 'The existing default database must use Firestore native mode.' }
$buckets = Invoke-Cloud storage buckets list --project $Project --format=json | ConvertFrom-Json
if (!($buckets | Where-Object { $_.name -eq $MediaBucket -or $_.name -eq "gs://$MediaBucket" })) {
 Invoke-Cloud storage buckets create "gs://$MediaBucket" --location=$Region --uniform-bucket-level-access --public-access-prevention --project $Project --quiet
}
Invoke-Cloud storage buckets add-iam-policy-binding "gs://$MediaBucket" --member="serviceAccount:$runtime" --role=roles/storage.objectUser --quiet | Out-Null

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('asenso-deploy-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
 $secretNames = @(Invoke-Cloud secrets list --project $Project --format='value(name)')
 function Publish-Secret([string]$Name, [string]$Value, [bool]$PreserveExisting = $false) {
  $exists = $secretNames | Where-Object { $_ -eq $Name -or $_ -like "*/secrets/$Name" }
  if (!$exists -or !$PreserveExisting) {
   if (!$Value) { throw "Missing value for required secret $Name" }
   $secretFile = Join-Path $temporary $Name
   [IO.File]::WriteAllText($secretFile, $Value, [Text.UTF8Encoding]::new($false))
   if (!$exists) { Invoke-Cloud secrets create $Name --replication-policy=automatic --data-file=$secretFile --project $Project --quiet }
   else { Invoke-Cloud secrets versions add $Name --data-file=$secretFile --project $Project --quiet }
  }
  Invoke-Cloud secrets add-iam-policy-binding $Name --member="serviceAccount:$runtime" --role=roles/secretmanager.secretAccessor --project $Project --quiet | Out-Null
 }
 $session = $settings.SESSION_SECRET
 if (!$session) { $sessionBytes = New-Object byte[] 48; $rng = [Security.Cryptography.RandomNumberGenerator]::Create(); try { $rng.GetBytes($sessionBytes) } finally { $rng.Dispose() }; $session = [Convert]::ToBase64String($sessionBytes) }
 if ($session.Length -lt 32) { throw 'SESSION_SECRET must contain at least 32 characters.' }
 Publish-Secret 'asensopost-session-secret' $session $true
 Publish-Secret 'asensopost-gemini-key' $settings.GEMINI_API_KEY
 $webFile = Join-Path $temporary 'firebase-web.json'
 [IO.File]::WriteAllText($webFile, ($web | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
 $deployOptions = @{
  Project=$Project; Model=$Model; FirebaseConfigFile=$webFile; MediaBucket=$MediaBucket;
  PublicOrigin=$origin; Region=$Region; BuildServiceAccount="projects/$Project/serviceAccounts/$builder"
 }
 if ($settings.GEMINI_IMAGE_MODEL) { $deployOptions.ImageModel = $settings.GEMINI_IMAGE_MODEL }
 if ($settings.GEMINI_VIDEO_MODEL) { $deployOptions.VideoModel = $settings.GEMINI_VIDEO_MODEL }
 if ($settings.META_GRAPH_VERSION) { $deployOptions.MetaGraphVersion = $settings.META_GRAPH_VERSION }
 if ($settings.SHOW_DEVELOPER_SETUP -eq 'true') { $deployOptions.ShowDeveloperSetup = $true }
 if ($settings.GOOGLE_OAUTH_CLIENT_ID -and $settings.GOOGLE_OAUTH_CLIENT_SECRET) {
  Publish-Secret 'asenso-oauth-client-secret' $settings.GOOGLE_OAUTH_CLIENT_SECRET
  $deployOptions.OAuthClientId = $settings.GOOGLE_OAUTH_CLIENT_ID
  $deployOptions.OAuthSecretName = 'asenso-oauth-client-secret'
 }
 & '.\deploy.ps1' @deployOptions
 Invoke-Firebase deploy --only 'hosting,firestore:rules' --project $Project --non-interactive
 Write-Output "Frontend and backend deployed: $origin"
 Write-Output "Register the Sheets OAuth redirect: $origin/api/google/sheets/callback"
} finally {
 # Delete only files created in this exact temporary directory; never recurse.
 Get-ChildItem -LiteralPath $temporary -File | ForEach-Object { Remove-Item -LiteralPath $_.FullName }
 Remove-Item -LiteralPath $temporary
}
