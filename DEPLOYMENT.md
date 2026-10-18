# Deployment contract

The application supports **Firebase Hosting for the React frontend, with the Node API on one Cloud Run service** in the same Google/Firebase project. Hosting rewrites `/api/**` to Cloud Run, keeping one public app origin. The standalone Cloud Run deployment can also serve the React build. Both use Gemini, Firestore for durable workspace state, private Google Cloud Storage for media, and per-user Google Sheets OAuth for stock and order records.

The repository includes a Dockerfile, Firebase Hosting configuration, and PowerShell deployment commands. Successfully deployed on 18 October 2026 to https://ai-builder-cup-66e9f.web.app, with Cloud Run service `asensopost-studio` in `asia-southeast1` (initial revision `asensopost-studio-00001-6q5`).

## Deploy frontend and backend together

Target project: `ai-builder-cup-66e9f`; default region: Singapore (`asia-southeast1`). Enable the Blaze plan first. Sign in as the project owner:

```powershell
.\scripts\cloud-login.ps1
.\scripts\deploy-firebase.ps1
```

The deployment command checks billing and project access, enables required APIs, creates missing build/runtime identities, creates a missing default Firestore database in native mode and a private media bucket, provisions server secrets from local `.env` without logging their values, deploys Cloud Run, then deploys Hosting and the supplied deny-all Firestore client rules. It preserves an existing session-signing secret. Run this against the studio's dedicated project: the supplied Firestore rules deny all browser access to that project's default database. The backend uses its runtime identity.

The local `.env` remains local. Firebase Hosting uploads only `dist`; cloud build excludes `.env`, `.data`, local output and deployment tooling. Gemini and OAuth credentials are read through Secret Manager on the server. Text uses the configured `GEMINI_MODEL`, or `gemini-3.1-flash-lite` when absent; image/video keep the local configured models.

After deployment, authorize `ai-builder-cup-66e9f.web.app` in Firebase Authentication if not already present. In the existing Google OAuth web client, add:

```text
https://ai-builder-cup-66e9f.web.app/api/google/sheets/callback
```

Use the Firebase URL consistently for sign-in, Sheets connections and storefronts. Adding another domain also requires updating PUBLIC_ORIGIN and the exact OAuth redirect. The backend accepts the configured public origin for write requests forwarded by Hosting.

Firebase Hosting forwards only the `__session` cookie. The server now shares a signed HTTP-only browser identifier between customer sessions and browser-bound Sheets consent; one-time OAuth nonce/PKCE/expiry checks remain server-side. Old local customer sessions may start a new conversation after this cookie change. Existing owner data and media in `.data` are **not automatically migrated**; cloud accounts start with their own fresh Firestore workspace unless a separate migration is performed. Local data is retained.

Hosting has a 60-second request ceiling. The Firebase deployment configures a 45-second media-provider timeout to return before that ceiling where possible; it never automatically retries a paid generation. Slow/cold requests can still time out. Check the library before manually retrying after an ambiguous failure. Video jobs remain asynchronous and are polled. Cloud Run keeps max instances one and concurrency one for the POC's in-process mutation serialization.

References: [Hosting with Cloud Run](https://firebase.google.com/docs/hosting/cloud-run), [Hosting cookie behavior](https://firebase.google.com/docs/hosting/manage-cache#using_cookies).

## Google Cloud prerequisites

- A billing-enabled project with Cloud Run, Cloud Build, Artifact Registry, Vertex AI, Firestore, Sheets, and Secret Manager APIs enabled.
- A Firestore database in native mode and the supplied deny-all client rules. Only the server accesses Firestore through its service identity.
- A runtime service account named `asensopost-runtime` with Vertex AI User, Cloud Datastore User, and access to the session-signing secret. The deployment identity separately needs permissions to build/deploy and act as the runtime account.
- A strong stable secret named `asensopost-session-secret` in Secret Manager.
- A Gemini API key supplied as a Secret Manager secret named `asensopost-gemini-key` (or the configured secret name). Give the runtime identity access to that secret. This is the prototype operator's server configuration; the browser never stores the key.
- A private Google Cloud Storage bucket for uploaded/generated media, with the runtime identity granted Storage Object User access. Set `MEDIA_BUCKET` to its name. Do not make the bucket public.
- An empty demo Google Sheet shared with the runtime identity as Editor. Initialize its Products, BranchStock, and Orders tabs using `scripts/initialize-sheet.ts` under an authorized Google identity. The initializer refuses existing data.
- An enabled, currently supported Gemini model in the project. Supply its exact model ID to the deployment command; the code intentionally does not assume that the old sample repository's model name is valid.

`deploy.ps1` accepts Project, Model, optional demo SheetId, MediaBucket, FirebaseConfigFile, Region (default Singapore), optional image/video model IDs, and the runtime account and Gemini secret names. It configures Firestore, the selected Sheet and private media bucket, and injects the Gemini API key and session secret from Secret Manager. It reserves 1 GiB for image processing. Cloud Run must expose the container's PORT and permit public HTTPS traffic to the frontend and customer API.

For local media generation, copy `.env.example` to `.env`, provide `GEMINI_API_KEY`, and restart the backend. `GEMINI_IMAGE_MODEL` defaults to `gemini-3.1-flash-image`; `GEMINI_VIDEO_MODEL` defaults to `veo-3.1-lite-generate-preview`. The Content Studio setup panel reports key presence and provides an explicit model-access check. Verify availability and billing in the key's Google project. The key applies to the shared POC workspace, including requests initiated by visitors when demo mode is enabled.

## Google account and demo access

`SHOW_DEVELOPER_SETUP=false` (also the default when unset) hides Firebase sign-in setup instructions, Google Sheets operator setup, generation configuration panels and backend storage details from the UI. Normal sign-in, connection actions, sample labels, and recoverable availability messages remain visible. Set the backend flag to `true` for operator help; restart locally or redeploy. The combined Firebase deployment reads this flag from `.env`; `deploy.ps1` exposes the equivalent `-ShowDeveloperSetup` switch. This controls help visibility, not account authorization.

The default is Google sign-in with Firebase Authentication. Follow [GOOGLE_SIGNIN_SETUP.md](GOOGLE_SIGNIN_SETUP.md) to enable Google, authorize the local/deployed domain, and supply `FIREBASE_WEB_CONFIG`. First sign-in creates a Firebase user; the first verified owner request initializes their private workspace. The server derives the workspace from the verified token rather than trusting a browser-selected owner ID. Firebase's web configuration is public; privileged credentials remain on the server.

`deploy.ps1` requires a `FirebaseConfigFile` containing your Firebase web configuration JSON. It deploys with `DEMO_MODE=false`; the Firebase project must match the deployment project. Authorize the final Cloud Run domain in Firebase Authentication. `OWNER_UID` is only legacy compatibility for an existing explicitly configured owner.

Use `DEMO_MODE=true` only to expose the shared fictional sample workspace. Anyone visiting it can edit sample data and invoke configured AI. The operator's backend Gemini key serves signed-in users too; accounts do not each provide a separate key through this login flow.

Google sign-in grants basic identity access only. [Per-user Sheets setup](GOOGLE_SHEETS_SETUP.md) enables separate consent and private workbooks. The global `GOOGLE_SHEET_ID` integration is limited to the shared demo workspace and is never reused for personal accounts. Without Sheets consent, personal accounts use local/Firestore stock records. Customer sessions remain separate signed HTTP-only cookies, scoped to the selected public storefront.

## Reliability boundaries

- Run **one maximum instance, concurrency one**, as encoded in the deploy command. The POC serializes application mutations in that process; horizontal scaling is not supported by the Sheets adjustment design. Do not run overlapping revisions against the same workbook.
- Sheets BranchStock is the editable stock source. Catalog name, description, and price are stored in the workspace; the Products tab is updated from offering saves and manual workbook sync. Editing catalog details in Sheets is not a supported catalog update path.
- Manual stock sync and order preparation refresh availability. A cache timestamp does not guarantee stock will still be available later.
- Google Sheets and Firestore are not a distributed transaction. Owner acceptance records an intent before changing stock. An interrupted or ambiguous update is placed in Needs review and cannot be blindly retried. Reconcile the workbook before any manual repair.
- Direct human edits to Sheet stock during an owner confirmation can race with the application. Avoid concurrent Sheet edits during the demonstration. Strong concurrent inventory guarantees require a transactional inventory source in a later version.
- The POC stores the small workspace in one Firestore document, capped below the document size limit. It is intended for the demonstration dataset, not continuous production traffic.
- Text-generation failures return explicitly labeled sample fallback output. Photo/video generation never fabricates a successful result: missing configuration and provider failures are shown as errors. Video status checks poll a saved operation rather than starting a new generation. The final submission must be demonstrated with live Google AI and live Google Sheets.

## Pending external verification

Deployment checks completed on 18 October 2026: Firebase home and SPA deep links return the app shell, `/api/health` returns HTTP 200, `/api/config` reports Firestore and live AI configuration with demo disabled, anonymous owner access returns HTTP 401, and the signed customer session survives the Hosting rewrite. The Firebase Hosting domain is authorized in Authentication. These checks do not exercise a full interactive Google login, paid generation, a Google Sheets consent flow, or local-to-cloud data migration.

The local build and automated tests exercise the sample adapters. A project owner must still verify service-account permissions, live Gemini responses, Sheets permissions, Firestore persistence after a restart, live Google sign-in and account isolation, and the final Cloud Run URL. Public repository and video publishing also remain external submission steps.

## Optional personal Sheets deployment

Pass `OAuthClientId`, `OAuthSecretName`, and `PublicOrigin` together to `deploy.ps1` to configure personal Sheets. The named OAuth secret must exist in Secret Manager and be readable by the runtime identity. Authorize the exact `/api/google/sheets/callback` URI for that origin in the OAuth client. If obtaining the Cloud Run hostname requires an initial deployment, deploy without these optional parameters, obtain the hostname, register the redirect, then redeploy with them. Keep the session secret stable; it encrypts persistent OAuth credentials as well as signing customer sessions. See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for consent configuration and limitations.

## Brand knowledge, Page context, and usage

Private knowledge, Facebook authorization, and usage records use the same runtime Firestore identity under workspace-private documents. Keep SESSION_SECRET stable to decrypt Page tokens and Sheets credentials. Optional MetaGraphVersion is passed as a non-secret environment value; Page access tokens are entered in the HTTPS app and encrypted server-side. The Page connector is read-only and currently uses user-provided Page tokens rather than Meta OAuth. pdf-parse runs server-side; extracted text is retained with documented limits, not original document files. See BRAND_AND_USAGE_GUIDE.md. Usage estimates and allowances are informational and do not cap Google spending or synchronize a real prepaid balance.
