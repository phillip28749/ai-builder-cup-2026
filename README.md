# Asenso One Studio

A brand, content, and retail operations studio for independent businesses. Create product creatives, plan posts, and handle customer questions and owner-reviewed orders in one workspace.

A hackathon proof of concept for the Google Cloud AI Builder Cup, in the **Future of Work & Enterprise Productivity** category.

**Live app:** [ai-builder-cup-66e9f.web.app](https://ai-builder-cup-66e9f.web.app)

## Local setup

Prerequisites: **Node.js 24.12 or newer** and npm.

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env`:

1. Set `FIREBASE_WEB_CONFIG` to the Firebase web app configuration as single-line JSON. Enable **Authentication > Google** and authorize `localhost`. See [Google sign-in setup](GOOGLE_SIGNIN_SETUP.md).
2. Set `GEMINI_API_KEY` for live AI. Model defaults are included; access depends on the key's project, billing, and quota.
3. Set `SESSION_SECRET` to at least 32 random characters. Generate a value with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

Start the server:

```powershell
npm run dev
```

Open **http://localhost:8088**, sign in with Google, and finish **Store settings**. Restart the server after changing `.env`.

For a shared local sample without sign-in, explicitly set `DEMO_MODE=true`. Anyone with access can edit sample data and invoke the configured AI key. Keep it disabled for personal accounts and deployment.

## Configuration

Configuration is read by the backend. Keep secrets out of Git and never put them in frontend code or `VITE_` variables. Firebase web configuration is public app configuration, not a privileged credential.

| Setting | Purpose |
| --- | --- |
| `FIREBASE_WEB_CONFIG` | Google sign-in and personal accounts. |
| `GEMINI_API_KEY` | Server key for live AI, shared across app users. |
| `GEMINI_MODEL` | Text/chat; defaults to `gemini-3.1-flash-lite` when blank. |
| `GEMINI_IMAGE_MODEL` | Images; defaults to `gemini-3.1-flash-image`. |
| `GEMINI_VIDEO_MODEL` | Video; defaults to `veo-3.1-lite-generate-preview`. |
| `SESSION_SECRET` | Stable signing/encryption secret; required for Sheets connections and cloud deployment. |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Optional per-user Sheets authorization. |
| `DEMO_MODE` | Shared sample studio; default `false`. |
| `SHOW_DEVELOPER_SETUP` | Show operator instructions in the UI; default `false`. |

See [.env.example](.env.example) for grouped settings and optional cloud/Page configuration. The deployment script supplies cloud storage, project, and public-origin settings.

## Workspace

| Area | Features |
| --- | --- |
| **Overview** | Recent work and next steps. |
| **Store settings** | Identity, voice, guidelines, approved claims, supporting documents, and storefront hero photo. Available during first setup, then from the top-right account menu. |
| **Content Studio** | Post writing, product shots, ad creatives, and video generation. |
| **Content Library** | Saved posts, uploads, generated photos/videos, search, previews, downloads, and reuse. |
| **Calendar** | Multiple posts per day with separate times and agendas. Publication is manual. |
| **Audience & Insights** | Audience profiles and brand-grounded suggestions. |
| **Customer Hub** | Offerings, Sheets connection, conversations, order review, and storefront access. |

### Photos and video

In **Content Studio > Product photos & video**, upload a JPEG, PNG, or WebP up to 4 MB, or choose a saved reference with hover/selection preview.

Choose **Product shot**, **Ad creative**, or **Video**, then select direction, shot type, and format. Use an actual product photo, a style template, or both. **Advanced config** contains subject details, benefit, approved proof/offer, headline, subheadline, and CTA.

Creative briefs support AIDA, PAS, and Hook-Benefit-Proof-CTA structures. They instruct the model to preserve product identity and render supplied copy without field labels. Review product fidelity and text accuracy before use; conversion results are not guaranteed. Export dimensions are applied after image generation.

Videos default to one eight-second 720p clip. Saved operations resume status checks when the relevant page is open. Results can be downloaded or attached through **Use in post**.

Uploads and manual editing work without a key. Photo/video generation failures are shown as errors, not simulated successful outputs.

### Storefront and customer chat

Home is at `/s/{workspace}`; the catalog is at `/s/{workspace}/products`. A floating chat widget is available on both pages.

The Gemini assistant is instructed to describe and compare listed products using catalog facts, acknowledge missing details, and link to relevant product cards. Chat links are restricted to existing products in that store. Private supporting documents are excluded from the bot's context, and it has no tools to change stock, prices, or order status.

Guardrails instruct it to resist role overrides, avoid private-data disclosures and invented claims, and report stock as verified only after a successful Sheets read. These controls reduce unwanted responses; generated answers still require review. Unavailable AI produces a labeled fallback.

Order flow:

1. Browse products or ask questions.
2. Select **Prepare an order** and review the details.
3. Explicitly submit the request.
4. The owner reviews and accepts or rejects it in Customer Hub.
5. Stock changes only after owner acceptance. Delivery charges are confirmed separately; no payment is taken.

### Google Sheets

Google sign-in does not connect Sheets automatically. The operator configures the OAuth client once; users select **Connect Google Sheets** to authorize their own account and create a workbook.

- **Products:** names, descriptions, and prices sync when offerings are saved.
- **BranchStock:** stock is read from the workbook; offering updates preserve existing Sheet quantities.
- **Orders:** submitted order records and lifecycle updates.

Customer Hub supports **Add new item**, **Save offering**, workbook sync, and replacing offering photos from the library. Photo assignments remain in workspace storage. Without Sheets, changes remain in local/Firestore records.

See [Google Sheets setup](GOOGLE_SHEETS_SETUP.md) for API access, consent, and callbacks.

## Storage and AI usage

Local personal workspaces persist under `.data/workspaces/user_<hash>/`, including workspace JSON and private media. New accounts receive sample catalog/audience data and a blank brand profile. Shared demo state uses `.data/workspace.json`.

Cloud deployments use Firestore for workspace/private records and a private Cloud Storage bucket for media. Owner identity is verified with Firebase; customer conversations use signed HTTP-only sessions. Local data is **not automatically migrated** on deployment.

**Account menu > AI usage & balance** shows recorded token counts, recent requests, available cost estimates, and planning allowances. It is not a prepaid wallet, does not cap spending, and does not synchronize provider balances. Google billing remains authoritative.

Brand context grounds the existing model; it does not train a new LLM. The optional read-only Facebook connector requires operator configuration and a manually supplied Page token. There is no one-click Meta login, publishing, or messaging integration. See [Brand and usage guide](BRAND_AND_USAGE_GUIDE.md).

## Deployment

The frontend uses **Firebase Hosting**. The Node API runs on **Cloud Run** in Singapore (`asia-southeast1`), reached through Hosting's `/api/**` rewrite. Firebase Authentication, Firestore, private Cloud Storage, and Secret Manager support the runtime.

With Blaze billing enabled and your local `.env` configured:

```powershell
.\scripts\cloud-login.ps1
.\scripts\deploy-firebase.ps1
```

The script targets `ai-builder-cup-66e9f` by default, provisions missing infrastructure, deploys Cloud Run, builds the frontend, and releases Hosting and Firestore rules. Use a dedicated project: supplied Firestore rules deny direct browser access; the backend uses its runtime identity.

After deployment:

1. Authorize the deployed domain in Firebase Authentication.
2. In the **dedicated Sheets OAuth client**, register:

   ```text
   https://ai-builder-cup-66e9f.web.app/api/google/sheets/callback
   ```

   Retain `http://localhost:8088/api/google/sheets/callback` for local development. Preserve the Firebase sign-in client's existing auth handler.
3. Use the Firebase Hosting URL consistently for sign-in, storefronts, and Sheets consent.

Secrets stay on the backend. Deployment preserves the existing session secret; changing it can invalidate sessions and prevent decryption of saved connections. See [Deployment](DEPLOYMENT.md) for permissions, custom origins, and migration boundaries.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local API and Vite development server on port 8088. |
| `npm run build` | Type check and build frontend/backend. |
| `npm start` | Run the production build; build first. |
| `npm test` | API and domain checks. |
| `npm run test:browser` | Browser journey; install Chromium first with `npx playwright install chromium`. |
| `npm run sheets:init` | Initialize a configured empty demo Sheet; see the Sheets guide. |

## Prototype boundaries

- Calendar scheduling does not publish automatically to social platforms.
- Orders require customer submission and owner acceptance; payment processing is not implemented.
- Sheets and Firestore are not a distributed transaction. Ambiguous stock writes require manual review.
- Cloud Run uses one maximum instance and concurrency one; inventory mutations do not support horizontal scaling.
- Hosting has a request timeout ceiling. Check the library before retrying an ambiguous paid-generation failure.
- Sample data, fallback AI, and estimated usage are distinguished from live results. Provider access and quotas are controlled by Google.

## Further documentation

- [Google sign-in setup](GOOGLE_SIGNIN_SETUP.md)
- [Google Sheets setup](GOOGLE_SHEETS_SETUP.md)
- [Brand knowledge and AI usage](BRAND_AND_USAGE_GUIDE.md)
- [Deployment contract](DEPLOYMENT.md)
- [Technical specification](TECH_SPEC.md)
- [Design specification](DESIGN_SPEC.md)
- [Testing specification](TEST_SPEC.md) and [validation report](QA_REPORT.md)
- [Contributor guidance](AGENT.md)
- [Submission package](SUBMISSION.md) and [event brief](AI_Builder_Cup_2026_Brief.md)

The concept combines the AsensoPost brand/content workflow with Retail Ops AI's storefront, grounded chat, and owner-reviewed orders.
