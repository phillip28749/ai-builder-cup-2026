# Prototype validation

## Verified locally

- TypeScript type checking and production frontend/server build pass.
- The final Node 24 Docker image builds successfully and was started locally. Its health endpoint and a sample persistence write/read passed under the non-root runtime user.
- The media-enabled Docker image also passes a real PNG upload, server-side JPEG normalization, private file retrieval, and local persistence check under its non-root Linux runtime.
- API/domain checks cover server-calculated totals, invalid inputs and zero stock, explicit customer confirmation, retry-safe submission and acceptance, campaign attribution, customer session isolation, human takeover, saved brand context, scheduling, cancellation, and rejection of unauthenticated owner access in restricted mode.
- Playwright browser checks cover brand guidelines through content/calendar/storefront/chat/order acceptance, mobile layout across all eight views at 390px width, mobile navigation, and order-dialog keyboard access. The full journey also checks for browser runtime errors.
- Media tests exercise actual image byte validation/normalization, backend-only key status, uploaded-reference and brand-context propagation, visible provider failures, missing-key blocking, persisted/idempotent video jobs, and authenticated media access. Provider responses in these tests are mocked, not live generated examples.
- The browser suite also verifies the product-photo upload/setup interface, attaching an uploaded photo to a draft, persistent library entries, and mobile media layout.
- Before the personal Sheets change, all twenty automated checks passed: fifteen API/domain/media/account checks and five browser checks. Live image and Veo generation remain unverified until an authorized Gemini key is supplied.
- Desktop dashboard reviewed at 1440px width and mobile dashboard reviewed at 390px width. No page overflow was found in the automated mobile checks.
- The eight-page PDF deck was rendered and visually reviewed as a contact sheet.
- A 91-second local sample walkthrough was recorded and a representative frame reviewed. It is labeled sample mode and has no narration audio.
- `npm audit --omit=dev` reports zero known vulnerabilities for the locked dependencies at the time of implementation.

## What local tests do not establish

These checks use the deterministic sample AI, local persisted data, and sample inventory. They do not prove that the target project's Gemini model, Google credentials, Google Sheet sharing, Firestore permissions, or Firebase Google provider and authorized domains are configured correctly. Those services require a separate deployed verification pass.

The Sheets/Firestore update boundary is intentionally conservative: uncertain stock updates require review rather than automatic retries. Concurrent manual Sheet edits are outside the prototype's guarantee. See the deployment contract for the single-instance requirement and reconciliation boundary.

## Repeatable commands

- `npm run build`
- `npm test`
- `npm run test:browser`
- `npm audit --omit=dev`

The browser test server uses its own ignored data file. API tests use temporary directories outside the application data path. Tests do not modify a live Google Sheet or live cloud resources.

## Google account login update

- Added responsive Google registration/sign-in page, setup/error guidance, identity display, and sign-out.
- Default access requires Google sign-in; shared demo access requires an explicit flag.
- Token-fixture account checks establish separate persistent state, concurrent brand writes, private media isolation, forged-header rejection, invalid-token/provider rejection, and no global demo Sheet leakage.
- Desktop and mobile login screenshots reviewed. Mobile decorative note removed to avoid headline overlap.
- Google popup sign-in, token verification against the operator's real Firebase project, and deployed Firestore/account verification remain pending configuration. No real Google account was created in this local check.
- Google identity itself does not grant Sheets access; the separate personal Sheets flow was subsequently added.

## Personal Sheets update

Implemented separate OAuth consent, per-workspace encrypted credentials, workbook creation/initialization, renewal, disconnect, and Customer Hub connection/setup states. TypeScript checking and production build pass. No new automated tests were added or run for this update; the previously reported checks predate it. Live OAuth, workbook creation, expiry/refresh, and order integration remain pending the operator's OAuth client credentials and enabled API. See TEST_SPEC.md for acceptance coverage to execute before the demonstration.

## Subject-preservation update

The reported cat-reference/collar-output mismatch exposed product-centric prompt ambiguity. Replaced that framing with reference-led editing instructions, optional explicit subject selection, limited brand styling context, and subject-aware presets. Production build/type checking completed; automated tests and live paid regeneration were not run for this update. Output identity still requires visual review.

## Customer Hub offering fixes

Added offering creation with stable retry IDs and branch starting stock. Offering saves now upsert Products rows, including price changes, and initialize missing stock rows without changing existing quantities. Added per-item sync status/retry and catalog-aware manual workbook sync. TypeScript checking and production build pass. No automated tests or live workbook writes were run for this update; the acceptance cases in TEST_SPEC.md remain to execute.

## Calendar agendas update

Added per-post agenda/time, multiple daily entries, time-sorted daily cards, edit/reschedule, and reuse of scheduled content as a separate copy. Legacy fields are optional for compatibility. TypeScript checking and production build pass. No automated or browser checks were run for this update; acceptance cases are documented in TEST_SPEC.md.

## Store settings navigation update

Renamed Brand Studio to Store settings, introduced persisted first-time setup with a Finish setup action, and moved subsequent settings/sign-out access into the top-right account dropdown. Existing custom store profiles infer completion; legacy links redirect. Production build/type checking pass. No new automated/browser checks were run for this update.

## Storefront funnel update

Split public Home and Products, added a bottom-right AI chat widget on both pages, routed primary CTAs into the catalog, and preserved legacy chat links/campaign attribution. Added product-specific question and order actions with valid branch options. Production build/type checking pass. No browser or automated checks were run for this update.

## Asenso One Studio enhancement

Rebranded current UI/documents and added structured creative briefs (styles, shots, ad formulas, copy hierarchy, exact canvas exports, product/style/dual references), shared brand knowledge and bounded document extraction, read-only verified Page-token context, and per-workspace API usage/allowance transparency. Added pdf-parse 2.4.5. Production build/type checking pass. No new automated/browser checks or paid service calls were run. Page permissions, PDF/runtime extraction, actual Gemini metadata, exact creative output, and usage rollover/retry behavior still need the acceptance pass in TEST_SPEC.md. Existing deck/video artifacts retain earlier branding. Local Node 22 produces Firebase engine warnings; deployment remains Node 24.

## Content Studio / Content Library split

Separated creation from saved post/media browsing, added library search/filtering, edit/plan/use/download routes, and preserved scheduled-post metadata during updates. Production build/type checking pass. No automated/browser checks were run for this update.

## Creative configuration cleanup

Moved subject and ad-copy overrides into Advanced config and replaced primary dropdowns with clickable choices, including scene presets and saved references. Tab state preserves values and underlying request fields remain compatible. Production build/type checking pass; no browser checks, automated tests, or paid generation were run.

## Reference dropdown preview update

Replaced saved-photo and style-reference button lists with dropdowns plus side previews. Added keyboard/hover preview behavior, selection metadata, and private Sharp thumbnails with debounced loading. Production build/type checking pass. No browser checks, automated tests, or paid generation were run.
