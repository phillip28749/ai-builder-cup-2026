# Technical Specification

## Purpose and scope

This is a hackathon proof of concept for Asenso One Studio. Build the smallest reliable implementation that demonstrates the connected brand, content, and customer-work value described in the [README](README.md). It is not intended to be a production ecommerce, inventory, POS, ERP, or CRM system.

## Technology and deployment constraints

- Use Google Cloud as the primary application platform.
- The submitted application must be deployed using **Cloud Run or Firebase Hosting**.
- Integrate a Google AI model such as Gemini or Gemma, or an eligible Google agentic platform, for a meaningful AI capability.
- Keep model credentials and privileged integration logic server side.
- Do not make a non-Google cloud provider or a paid third-party service necessary for the core demo.
- Google Sheets may be used as a familiar, inspectable source for demo product, stock, or order data.
- If live AI or Sheets access is unavailable, use an adapter-based demo fallback, and clearly label simulated results in the UI.

## Suggested architecture

The implemented prototype uses React/TypeScript with Vite and a shared Node/Express API. Custom CSS primitives follow the sample's cards, forms, tabs, and green/sage visual direction. The server serves the production frontend build from the same Cloud Run service. Firebase Authentication verifies Google accounts and isolates their workspaces; Google AI, Firestore, and Sheets access stay server-side. See [DEPLOYMENT.md](DEPLOYMENT.md) for the implementation's deployment contract and reliability boundaries.

- **Web client:** responsive application with workspace and public customer-facing routes.
- **Server-side application layer:** handles AI calls, persistence, business rules, product lookup, customer chat, and order submission.
- **AI integration:** ground responses in the saved brand, audience, catalog, and store policy data relevant to each task. Use structured outputs for actions and records.
- **Persistence:** choose the simplest reliable data store compatible with the repository and Google Cloud deployment. Persist brand profiles, audiences, content, conversations, and order states as needed by the implemented scope.
- **Demo data:** seed a fictional small business, catalog, and examples sufficient to demonstrate the prototype without external accounts. Mark seeded data as sample data.

## Data integrity and behavior

- Treat saved brand information as the source context for brand-aware generation.
- Generated content remains editable; do not imply it is published unless a real publishing integration confirms publication.
- The customer assistant may answer only from configured product and store information. It must not invent stock, price, policy, or order status.
- Validate product IDs, prices, quantities, and totals on the server. Do not trust client-supplied totals.
- Before submitting an order, show the customer a complete review summary and require explicit confirmation.
- Orders are pending owner review until the owner confirms them. Do not claim acceptance before that decision.
- Do not adjust stock before owner confirmation. If stock cannot be verified, disclose the limitation and flag owner follow-up.
- Do not collect payment credentials, issue refunds, book couriers, or imply integrations that are not implemented.
- Handle retries and service failures without silently duplicating records or reporting false success.

## Product creative generation

- Store identity may save `heroAssetId` and `heroImageFit` (`cover` or `contain`) on the brand. Validate the selected image against the owner's media library; public hero reads resolve only the configured image in that storefront. Without a custom image, retain the first-product hero fallback. Omitted optional hero fields on older brand requests preserve existing settings; an empty hero ID explicitly restores the fallback.

- Offerings may reference an uploaded or generated library image using `photoAssetId`. `PATCH /api/owner/products/:id/photo` validates the asset within the authenticated workspace, rejects videos, and saves the photo separately from catalog/stock edits. Photos remain stored in the studio rather than the four-column Products Sheet. The public product-photo endpoint resolves only an image currently assigned to a product in the selected storefront; private library files retain owner authorization.

- `POST /api/owner/media/upload` accepts a base64 JPEG/PNG/WebP payload up to 4 MB. The server decodes and normalizes the actual image, limits pixel count, strips source metadata, and stores it as an uploaded reference.
- `POST /api/owner/media/generate` accepts a saved reference ID, creative direction, output type (product/ad/video), and aspect ratio. Shared brand context is included server-side. Image generation uses Gemini reference-image editing; video generation defaults to `veo-3.1-lite-generate-preview` image-to-video with one eight-second, 720p output for the lowest listed Veo 3.1 per-second rate.
- `GEMINI_API_KEY` is read on the backend, including local `.env` support. The client only receives a presence flag and configured model names. Keys and provider operation names are not returned through the media API.
- Video operation metadata persists before submission. A stable request ID prevents duplicate video starts; `POST /api/owner/media/jobs/:id/check` polls an existing operation without restarting generation. Interrupted submissions are flagged for review, and completion writes use a stable asset ID.
- Media metadata uses separate Firestore documents and bytes use private Google Cloud Storage on Cloud Run. Local mode stores metadata and bytes beside the local workspace file. Media requests require the same owner authorization as other workspace operations.
- Saved content can reference a media asset ID. Protected file reads use authenticated blob requests, so private media remains accessible in restricted owner mode without exposing an API key or making a bucket public.
- Missing access, filtered output, or provider failure does not create an artificial successful result. Generation may incur Google usage charges; the client does not automatically retry a generation request after failure.

## Demo reliability

- Keep the primary demonstration path usable with seeded data.
- Distinguish live model output and integrations from deterministic demo responses.
- Provide clear, recoverable UI feedback when a service is unavailable.
- Avoid requiring external social accounts or integrations for the core demonstration.

## Account identity and persistence

- Google sign-in creates accounts through Firebase Authentication. Owner routes require a verified Google-provider Firebase ID token by default. A configured legacy OWNER_UID remains supported.
- Derive the personal workspace ID from the verified UID using a stable SHA-256 hash; never accept a browser-selected ID for private owner access. Scope workspace state, media metadata, bytes, and generation jobs to that ID.
- New accounts receive an empty brand profile and sample starter catalog/audiences. Local persistence is `.data/workspaces/user_<hash>/workspace.json` with scoped media. Cloud persistence uses `workspaces/{id}` and private workspace-prefixed bucket objects.
- Explicit `DEMO_MODE=true` enables the separate shared sample workspace. Invalid credentials must not fall back into demo access.
- Personal storefront links include the workspace slug. The public API exposes only the customer-facing catalog/brand and that customer's session, never private drafts or media libraries.
- Google sign-in requests identity only. A separate server OAuth flow requests offline `drive.file` access for a personal workbook; a global demo Sheet must never be used by a personal account.

## Personal Google Sheets authorization

- Customer Hub exposes connection status, setup guidance, consent, workbook open, sync, disconnect, and renewal controls. Never offer Open Sheet when there is no configured workbook.
- Use server-side authorization-code exchange with PKCE, browser-bound single-use state expiring after ten minutes, and Google subject matching to the verified Firebase Google identity.
- Store credentials outside returned workspace state. Encrypt tokens and pending verifier with AES-256-GCM using the stable session secret and workspace ID context; keep the OAuth client secret on the backend.
- Create only a new app-owned workbook with Products, BranchStock, and Orders; exclude draft orders. Persist its ID before initialization, and resume failed initialization using that ID. Reconnect preserves initialized workbook data.
- Load the appropriate integration context for owner and customer routes so public order operations use only that storefront?s authorization. Disconnect removes stored tokens and stops sync while preserving the user's workbook.
- The Products tab mirrors saved offering names/descriptions/prices, BranchStock is the connected stock source, and order actions upsert Orders. Posts, media, brand, and conversations remain in application storage. Orders created while disconnected require manual reconciliation.
- Operator setup and live-verification requirements are in [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md).

## Reference-subject preservation

Media generation accepts an optional `subject` description (up to 250 characters). Treat the reference image as the identity source; preserve the complete dominant subject by default, and isolate an accessory only when explicitly selected as the subject. Scene changes affect background, lighting, and composition. Brand name, voice, and color are styling context, not authority to replace the pictured subject. Save an explicit subject description with the creative direction for image/video history. These are generation instructions, not a pixel-fidelity guarantee or an automated identity check.

## Offering creation and workbook updates

- Customer Hub supports adding an item with name, description, positive price, and starting stock for existing branches. Client-generated UUIDs make creation retries reuse the same item. The prototype caps the catalog at 100 items.
- Persist local changes before attempting Sheets writes. Each product records local, pending, synced, or error status; keep failed changes and offer an explicit retry action.
- Upsert Products rows by stable product ID on creation/edit, including price changes. Add only missing BranchStock rows for that product; never replace existing stock during catalog synchronization. Reject duplicate matching rows instead of updating an arbitrary one.
- Manual Sync workbook retries catalog synchronization and then refreshes quantities from BranchStock. The studio remains the source for catalog details; Sheet catalog edits are not imported.

## Calendar agendas

Content items persist optional agenda (up to 120 characters) and planning time (HH:mm or empty). Legacy schedules without these fields remain valid. Allow multiple distinct scheduled posts per date and show a daily list ordered by time. Scheduling an existing scheduled post creates another content item/campaign rather than moving the original; Edit schedule explicitly updates the chosen item. Daily month cells display two agenda summaries and an overflow count. Planning times are local wall-clock values, not automatic publication jobs.

## Store setup and navigation

Persist `storeSetupComplete` in workspace state, defaulting false for newly created personal workspaces. Completing setup saves brand settings and the flag together after validating a non-placeholder store name. For legacy state without the flag, infer completion from an existing custom store name. First-time owner navigation opens `/settings`; configured workspaces omit that sidebar tab and expose it via the account dropdown. Preserve `/brand` as a redirect. Settings continue to edit the existing brand fields used by generation; this is not a data-model rename of brand context.

## Storefront page separation

Use separate public Home and Products paths within the workspace slug, preserving campaign attribution. Home's primary CTA funnels to Products. A non-modal floating AI chat is available on both pages; legacy `/chat` redirects to Products and opens it. Preserve customer conversation, human takeover, order review, and confirmation behavior. Product inquiry prepopulates the composer without sending a paid request automatically; order actions preselect the offering and derive available branch labels from it. Remount the public view when changing workspace slugs to isolate in-memory customer state.

## Asenso One brand knowledge and creative briefs

- Use Asenso One Studio in the UI and current documentation; retain existing infrastructure identifiers, data paths, and cookies for compatibility.
- Store per-workspace brand knowledge separately from public state: positioning, differentiators, approved public claims, avoidance rules, writing examples, extracted documents, and read-only Facebook Page context. Include current product/audience/guideline facts in owner generation.
- Bound supporting documents to eight files, 2 MB each, PDFs up to 20 pages, retaining up to 12,000 characters with a visible truncation marker. Retrieve up to two relevant 1,500-character chunks per document. Exclude private documents/internal guidance from customer prompts; only public-safe approved claims supplement public catalog context.
- Facebook POC connection verifies a Page-bound access token against Meta, encrypts it with workspace-bound AES-GCM, and imports metadata plus up to five recent text posts if allowed. Surface unavailable posts; never imply publishing, trend analytics, or one-click OAuth. Keep Graph version operator-configurable.
- Build ad briefs from validated style/shot/formula enums and bounded copy fields. Include source facts, subject priority, text hierarchy, bottom 20% logo space, and no invented claims/logos. Product references govern identity; style references govern layout. A style-only request must describe a subject or select product facts; dual-reference images use distinct owned assets. Video requires an actual subject reference.
- Exact image export size is enforced by Sharp contain-fit resizing, not merely prompt text. Keep shot-specific perspective, optional exact overlay copy, and truthful warnings about padding/upscaling and generative fidelity.

## AI usage transparency

Record provider response token metadata per workspace, model, feature, and status. Text/image usage is measured only when returned; failed/unknown calls are not reported as free. Deduplicate video completion by operation and retain the job's original model. Preserve UTC monthly counters and up to 150 recent event details in a separate private ledger. Serialize ledger writes independently of domain locks to avoid deadlock.

Display measured counters, unknown/unpriced requests, user-configured optional estimate rates, and soft planning allowances. Veo Lite 720p estimates use the checked list rate; unknown models remain unpriced. Never present a planning allowance as purchased credits, an enforced cap, or Google's real prepaid balance. Provider balance is explicitly unavailable and linked to Google billing. Tracking begins at this implementation; it can have gaps after interruption or persistence failure. Do not fail a successful generation solely because informational ledger persistence failed.

## Separate content workspace and library

Use `/content` for creation and `/library` for persisted post/media browsing. Library links identify the post to edit or media to attach through query parameters; validate media ownership before attaching it. Query changes reset editing state without a background workspace refresh overwriting unsaved form text. Updating scheduled content preserves date, time, agenda, and status. Save returns to the library. Calendar accepts a content query for preselection. The library reuses authenticated media reads and existing persisted video operation checks; it must never restart generation during browsing.

## Private reference thumbnails

Library image cards load thumbnails; full previews and downloads load original files. Immutable owner media reads share an account-scoped in-memory blob cache (five-minute lifetime, at most 64 entries/32 MB), deduplicate in-flight requests, and limit concurrency to four. Clear this cache on auth changes/sign-out; never cache failed requests or mutable public hero/product URLs. API limits use separate media-read, other-read, and write buckets so tab browsing cannot exhaust write capacity. Owner buckets are scoped to the authenticated workspace; public buckets use client IP. Return Retry-After for rate limits. These are per-process POC limits.

Serve authenticated image thumbnails from `/api/owner/media/:id/thumbnail`, validating workspace ownership before retrieving bytes. Normalize with Sharp into a bounded 320x240 WebP preview; reject videos and send private/no-store caching headers. Debounce hover fetches and release object URLs on change/unmount. Clear a style reference if it becomes the selected main source. Thumbnail browsing does not call a paid model.
