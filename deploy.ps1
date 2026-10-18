param(
 [Parameter(Mandatory=$true)][string]$Project,
 [Parameter(Mandatory=$true)][string]$Model,
 [string]$SheetId = '',
 [Parameter(Mandatory=$true)][string]$FirebaseConfigFile,
 [Parameter(Mandatory=$true)][string]$MediaBucket,
 [string]$ImageModel = 'gemini-3.1-flash-image',
 [string]$VideoModel = 'veo-3.1-lite-generate-preview',
 [string]$GeminiSecretName = 'asensopost-gemini-key',
 [string]$OAuthClientId = '',
 [string]$OAuthSecretName = '',
 [string]$PublicOrigin = '',
 [string]$MetaGraphVersion = '',
 [string]$BuildServiceAccount = '',
 [switch]$ShowDeveloperSetup,
 [string]$Region = 'asia-southeast1',
 [string]$ServiceAccountName = 'asensopost-runtime'
)
$ErrorActionPreference = 'Stop'
$firebaseConfig = Get-Content -LiteralPath $FirebaseConfigFile -Raw | ConvertFrom-Json
if (!$firebaseConfig.apiKey -or !$firebaseConfig.authDomain -or $firebaseConfig.projectId -ne $Project) { throw 'Supply Firebase web configuration for the deployment project.' }
$firebaseJson = $firebaseConfig | ConvertTo-Json -Compress
if (($OAuthClientId -or $OAuthSecretName) -and !($OAuthClientId -and $OAuthSecretName -and $PublicOrigin)) { throw 'Supply OAuthClientId, OAuthSecretName, and PublicOrigin together for personal Google Sheets.' }
if ($PublicOrigin) {
  $originUri = [uri]$PublicOrigin
  if (!$originUri.IsAbsoluteUri -or $originUri.Scheme -ne 'https' -or $originUri.AbsolutePath -ne '/' -or $originUri.Query -or $originUri.Fragment -or $originUri.UserInfo) { throw 'PublicOrigin must be an HTTPS origin without a path, credentials, query, or fragment.' }
}
# Prerequisites are documented in DEPLOYMENT.md. This deploys only the configured project.
$runtimeIdentity = "$ServiceAccountName@$Project.iam.gserviceaccount.com"
$deployVariables = @{
 DATA_BACKEND = 'firestore'; GOOGLE_CLOUD_PROJECT = $Project; GOOGLE_CLOUD_LOCATION = 'global';
 GEMINI_MODEL = $Model; GOOGLE_SHEET_ID = $SheetId; DEMO_MODE = 'false'; FIREBASE_WEB_CONFIG = $firebaseJson;
 MEDIA_BUCKET = $MediaBucket; GEMINI_IMAGE_MODEL = $ImageModel; GEMINI_VIDEO_MODEL = $VideoModel
 SHOW_DEVELOPER_SETUP = $(if ($ShowDeveloperSetup) { 'true' } else { 'false' })
}
if ($PublicOrigin) {
 $deployVariables.PUBLIC_ORIGIN = $PublicOrigin.TrimEnd('/')
 # Hosting requests have a 60-second ceiling. Fail before it, without retrying a paid generation.
 $deployVariables.GEMINI_MEDIA_TIMEOUT_MS = '45000'
}
$secretBindings = "SESSION_SECRET=asensopost-session-secret:latest,GEMINI_API_KEY=${GeminiSecretName}:latest"
if ($MetaGraphVersion) {
 if ($MetaGraphVersion -notmatch '^v\d+\.\d+$') { throw 'MetaGraphVersion must use the form vNN.N from your Meta app configuration.' }
 $deployVariables.META_GRAPH_VERSION = $MetaGraphVersion
}
if ($OAuthClientId) {
 $deployVariables.GOOGLE_OAUTH_CLIENT_ID = $OAuthClientId
 $deployVariables.GOOGLE_OAUTH_REDIRECT_URI = $PublicOrigin.TrimEnd('/') + '/api/google/sheets/callback'
 $secretBindings += ",GOOGLE_OAUTH_CLIENT_SECRET=${OAuthSecretName}:latest"
}
# JSON is valid YAML and avoids native-shell quoting issues with Firebase JSON.
$deployVariablesFile = Join-Path ([System.IO.Path]::GetTempPath()) ("asensopost-env-" + [guid]::NewGuid().ToString('N') + '.yaml')
try {
 [System.IO.File]::WriteAllText($deployVariablesFile, ($deployVariables | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
 $buildOptions = @()
 if ($BuildServiceAccount) { $buildOptions = @('--build-service-account', $BuildServiceAccount) }
 gcloud run deploy asensopost-studio --source . --project $Project --region $Region --service-account $runtimeIdentity --allow-unauthenticated --concurrency 1 --max-instances 1 --min-instances 0 --memory 1Gi --timeout 120 --env-vars-file $deployVariablesFile --set-secrets $secretBindings @buildOptions --quiet
 if ($LASTEXITCODE -ne 0) { throw 'Cloud Run deployment failed.' }
} finally {
 if (Test-Path -LiteralPath $deployVariablesFile) { Remove-Item -LiteralPath $deployVariablesFile }
}
