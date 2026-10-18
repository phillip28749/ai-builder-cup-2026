# Testing Specification

## Purpose

Verify the prototype’s user-visible behavior, data integrity, and honest handling of AI and integration states. Tests should be repeatable using seeded demo data and mock adapters when live Google services are unavailable.

The implemented test suite is in `tests/`. Run `npm run build` before `npm test` or `npm run test:browser`, because test servers use the compiled production server. [QA_REPORT.md](QA_REPORT.md) records completed checks and the cloud checks still pending.

## Functional checks

- Main navigation and primary pages load and remain usable at desktop and mobile sizes.
- A user can save or edit brand context and see relevant context reflected in generated content.
- A user can create or edit content and assign it a calendar state.
- The interface does not claim content was published without confirmation from a real publishing integration.
- A customer can open the storefront and see configured sample product details and availability labels.
- The assistant answers from configured data and indicates when requested information is unavailable.
- The customer can review the complete order summary and must explicitly confirm before submission.
- A submitted order appears in the owner view as pending and includes the captured contact and fulfilment details.
- Stock remains unchanged on order submission and is adjusted only after owner confirmation, if stock adjustment is implemented.
- The owner can inspect order details and the relevant customer conversation.

## AI and data integrity checks

- Generated content reflects saved brand and audience context where provided.
- The UI distinguishes live model output from fallback or mock output.
- The assistant does not invent product price, stock, branch, policy, or order acceptance.
- Server-side validation determines product, quantity, price, and total.
- Retrying an order submission does not unintentionally create duplicate orders where persistence supports idempotency.
- AI, database, or Sheets failures produce clear messages and never report an action as successful when it failed.

## Product photo and video checks

- Accept actual JPEG/PNG/WebP bytes, enforce upload and pixel limits, normalize orientation, and reject invalid data even if the declared MIME type is an image.
- Verify media status never returns the Gemini API key and that restricted owner mode protects media file and library endpoints.
- Pass the uploaded reference and saved brand context to generation; persist the returned image, model, and source reference metadata.
- Show provider rejection, missing key, and missing output as failures; never substitute an illustration for a generated result.
- Persist video operations, resume polling after a reload, deduplicate repeated submission IDs, and use stable asset IDs when completing a job.
- Verify a real uploaded photo can be previewed, attached to a draft, and restored from the persisted media library. Check the upload/setup UI on mobile.
- Keep live generation tests opt-in and manual with the configured Google key. Automated tests use mocked provider responses and never incur generation charges.

## Visual and accessibility checks

- Check key workflows on narrow mobile and standard desktop viewports.
- Check navigation and primary actions using only the keyboard.
- Verify visible focus, readable contrast, semantic labels, and status text that does not rely on color alone.
- Check loading, empty, error, and success states for core pages and actions.

## Demo acceptance criteria

The prototype is ready for a hackathon demonstration when a user can work with a sample brand, generate and edit content, organize it, open the connected storefront, ask a grounded product question, submit an explicitly confirmed sample order, and show that order awaiting owner review. Sample data, simulated responses, and unavailable integrations must be identified accurately.

## Google sign-in and account isolation

- Check desktop/mobile login rendering, missing-configuration guidance, disabled sign-in when unconfigured, and optional demo navigation.
- Verify missing/invalid tokens fail, non-Google providers fail unless explicitly allowed as the legacy owner, and forged workspace headers cannot select another account.
- Verify concurrent accounts persist separate brand state and cannot list/read each other's media. Personal accounts must not inherit the operator's demo Sheet ID.
- Before deployment acceptance, perform real Google popup sign-in/sign-out, first-account creation, returning-user persistence, and two-account isolation using the configured Firebase project. Local injected-token tests do not establish live Firebase configuration.

## Personal Sheets acceptance checks

- Unconnected accounts see Connect Google Sheets rather than Open Sheet. Missing backend configuration reveals setup guidance rather than starting a broken redirect.
- Verify authorization starts only with a Google-authenticated owner. Check expired/replayed/malformed state, missing/wrong cookie, PKCE, denied consent, missing permissions/refresh token, and different-account rejection.
- Check workspace-bound encrypted token storage, no credentials in state/status/public APIs, and separate workbooks for two accounts. Restart the server and verify token refresh.
- Verify initial Products/BranchStock/submitted Orders data, no draft exports, preserved workbook ID after initialization failure, successful retry, and no reinitialization on reconnect.
- Check live stock sync, public order submissions, owner acceptance/cancellation, error recovery for revoked permissions, disconnect without deletion, and retained workspace data. Follow the existing conservative handling of ambiguous stock updates.
- Run these checks with the configured Google project before claiming live integration success. The Sheets OAuth implementation currently has a passing build but no executed OAuth-specific automated or live checks.

## Reference-subject acceptance checks

Before a live media demo, try an animal wearing an accessory, a person with a product, and a standalone product. Check that default scene edits preserve the dominant complete subject, an explicit subject description reaches both image and video generation, and brand context cannot select a different subject. Inspect outputs visually; prompt guidance does not guarantee identity preservation. No paid generation was run for the subject-preservation update.

## Offering and catalog synchronization acceptance

- Create a valid offering and verify local persistence, storefront visibility, Products row, and initial BranchStock rows. Retry the same create ID and verify no duplicate item or rows.
- Edit name, description, and decimal price; verify the existing Products row changes. Existing orders must keep their recorded totals.
- Reject empty names, nonpositive/nonfinite prices, invalid stock quantities, oversized catalogs, and duplicate matching Sheet rows.
- Change Sheet stock externally, then save an offering or sync the workbook; ensure catalog sync never overwrites existing stock. Refresh must import the external quantity.
- Simulate unavailable/revoked Sheets access; local changes must persist with an error status. Explicit retry and workbook sync must recover without duplicates. Disconnected accounts must show local-only status.
- Check new-item fields and error/retry controls on mobile and keyboard navigation. These acceptance checks have not been executed for this update.

## Multi-post agenda acceptance

- Schedule multiple drafts on one date with distinct agendas/times and verify all persist, appear in month counts, and sort by time in the daily list.
- Schedule another copy of an already scheduled post; verify the original date/time/agenda stays unchanged and the copy receives a distinct item/campaign ID.
- Edit date, time, and agenda for one entry; verify other entries remain unchanged. Return one entry to drafts without removing others.
- Load legacy scheduled items lacking agenda/time and show General/Not set without discarding them. Validate time format and agenda length server-side.
- Check date-field month navigation, Today, overflow count, custom agenda entry, no-content guidance, and mobile/keyboard usability. Calendar browser checks must populate the newly required agenda/time form controls.
- These new acceptance cases have not been executed for this update.

## Store setup acceptance

- New Google accounts open Store settings before other workspace pages; setup cannot complete with a blank/placeholder store name. Completion persists through reload/sign-out and opens Overview.
- Completed accounts have no settings sidebar tab. The avatar dropdown opens Store settings and sign-out; verify keyboard focus, Escape, outside click, and narrow-screen layout.
- Legacy custom-name workspaces remain configured with their data unchanged; `/brand` redirects to `/settings`. Verify settings updates and editable AI guidelines continue working.
- Adapt existing browser journeys that previously selected Brand Studio from the sidebar. These new checks have not been run for this update.

## Two-page storefront acceptance

- Verify Home CTA and navigation open Products with workspace slug and campaign query retained. Catalog cards must display current offering prices and availability.
- Verify bottom-right chat opens/minimizes/closes on both pages, follows scrolling, restores focus on Escape, and fits mobile viewports without overflow. Messages and owner takeover must persist while moving between Home/Products; different workspace slugs must reset in-memory customer state.
- Product inquiries should prefill the correct question without automatically calling generation. Product requests should preselect the item and use its valid branch names.
- Exercise draft/review/explicit submission and owner review through the widget/product page. Order dialogs must layer above chat and keep keyboard focus handling. Legacy `/chat` links must land on Products with chat open.
- Adapt older journeys that expected catalog cards on Home or a full-page chat. These updated checks have not been run.

## Brand brain, creatives, and usage acceptance (not yet executed)

- Verify Asenso One Studio branding, retained account/workspace state, and all three settings tabs.
- Save differentiators, claims, avoidance rules, and examples. Check caption/guideline/campaign/media briefs include current products, guidelines, Page context and relevant document excerpts. Missing facts should lead to questions, not fabricated trends.
- Upload text PDF/TXT/MD/CSV/JSON; check 2 MB/eight-document/20-page bounds, 12,000-character truncation notices, invalid/scanned PDFs, extraction errors, deletion, and tenant isolation. Private documents/examples must not reach public chat.
- Verify Page identity-token match, encrypted private storage, no secret in responses/logs, refresh/disconnect, expired access, partial metadata/post permission, and honest absence of one-click OAuth/publishing.
- Cover all style/shot/formula choices and format dimensions. Check macro/flatlay perspective, overlay hierarchy, bottom space, unsupported-claim/logo rules, main-subject preservation, style-only subject validation, dual image ordering, private asset checks, and no paid call for brief preview. Verify actual exported dimensions without destructive subject crops.
- Check real Gemini prompt/output/thinking/total metadata, missing metadata, sample fallback with/without a provider call, informational persistence failures, UTC monthly rollovers, optional allowances, unknown cost/balance labels, rate changes affecting only future records, and video deduplication/original-model attribution. Verify no fictitious purchased-credit balance and that public customer calls accrue to the correct workspace.
- Run browser mobile/keyboard checks for long forms, usage tables, header indicator, and template/video switching before demonstrating live services.

## Separate content library acceptance

- Verify Content Studio and Content Library navigation, post/media sub-tabs, search/filter reset on route/history changes, empty/loading/error states, and mobile layout.
- Save a new draft and verify library visibility. Open Edit, update a scheduled post, and ensure its schedule/agenda/media remain unchanged. Switching from edit to new-content mode must reset the target ID rather than overwrite the old post.
- Verify library media preview/download, authenticated asset ownership, Use in post attachment, and Calendar preselection via Plan it.
- Pending video checks must resume existing operations only and show completed results without duplicate generation. Update older browser journeys that expected embedded libraries inside Content Studio; these cases have not been executed for this update.

## Creative setup cleanup acceptance (not executed)

Verify all main options are clickable and show exclusive selected states. Subject/copy/custom-scene fields must appear only under Advanced config; entered values must persist across tab switches and be included in brief/generation payloads. Verify custom-size selection opens advanced fields, template-only subject guidance, video-specific formats/reference restrictions, saved-photo selection, keyboard tab navigation, busy disabling, and mobile option grids.

## Reference dropdown acceptance (not executed)

Verify hover/focus preview versus committed selection for both dropdowns, empty/No template state, duplicate-name disambiguation, arrow/Home/End/Enter/Escape/Tab behavior, outside-click close, loading/error previews, busy disabling, and narrow-screen layout. Thumbnail reads must enforce account isolation, reject videos/invalid IDs, and never trigger generation. Changing the main reference to the style reference must clear the conflicting secondary selection.
