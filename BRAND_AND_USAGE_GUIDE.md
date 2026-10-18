# Asenso One Studio: brand knowledge, creatives, and usage

## 1. Build the brand brain

Open the top-right account menu → **Store settings**. Save identity and editable brand guidelines in **Store identity**, then open **Brand brain**.

Enter positioning, concrete differentiators, approved public-safe claims/offers, words/styles to avoid, and examples of your writing. Product names, descriptions, and prices come from Customer Hub automatically; audience definitions and saved brand guidelines are also included.

Upload supporting material in PDF (text-based, up to 20 pages), TXT, MD, CSV, or JSON. Files are limited to 2 MB each and eight documents. The first 12,000 extracted characters are retained and truncation is shown. Scanned PDFs need OCR before upload. The POC retrieves up to two relevant 1,500-character excerpts per document based on the request topic; this is not a full vector-search system. Use **Review the context used for generation** to inspect what is provided without spending AI generation credits.

Captions, creative briefs, brand guidelines, and campaign suggestions use the shared knowledge. Strategy suggestions must reference supplied facts and identify missing evidence rather than inventing current trends. This improves grounding but does not guarantee accuracy or creative quality. The model is not fine-tuned or trained into a separate brand LLM.

Supporting documents, private examples, and internal positioning are excluded from public customer chat. The field labeled approved claims is explicitly public-safe; customer chat may use those claims and the public catalog. Documents remain private records, separate from returned public storefront data.

### Read-only Facebook Page context

The POC supports verifying a **Page access token** and importing Page identity/about information plus up to five recent text posts when permissions allow. It does not provide one-click Meta OAuth, publish content, import private messages, or fetch trend/performance analytics.

1. In your Meta developer setup, obtain a Page access token for a Page you manage, with permission to read that Page's information/content. A normal user access token is rejected. Use Meta's [Pages API guidance](https://developers.facebook.com/docs/pages-api/getting-started/) and token tools to obtain appropriate authorization.
2. The operator sets `META_GRAPH_VERSION` on the backend to a currently supported version from their Meta app configuration, then restarts the server. Keep the existing `SESSION_SECRET` stable; it encrypts the Page token as well as Sheets credentials.
3. In **Brand brain → Facebook Page context**, enter the Page ID and access token, then click **Verify and connect Page**. The backend checks that the token identity matches that Page, encrypts the token, and imports the available context.
4. Refresh explicitly when the Page changes. If recent posts cannot be read, the UI states that only identity/about context was imported. Expired/revoked tokens require reconnecting. Disconnect removes the local encrypted token and Page context; it does not revoke the grant at Meta.

For Cloud Run, set the same version through the service environment or `deploy.ps1 -MetaGraphVersion ...`. Tokens are entered over the deployed HTTPS app and stored encrypted, not in frontend bundles or returned by the knowledge API.

## 2. Build a structured ad creative

Open **Content Studio → Product photos & video** and upload a reference. Choose its role:

- **Actual product / subject photo:** identity comes from that image. The main subject field resolves ambiguities such as a cat versus its collar.
- **Style/layout template only:** choose a catalog product or describe a new subject. The template supplies styling, not product identity. Exact appearance cannot be guaranteed without an actual product photo.
- **Product plus separate style template:** use the actual subject photo as the main reference, then choose another saved image for style/layout. The subject and template are labeled separately in the request. This dual-reference mode is for images; video requires the actual subject reference.

Choose a direction (minimalist, luxe, playful, organic), shot type (hero, lifestyle, flatlay, macro, environmental), and formula (AIDA, PAS, or Hook → Benefit → Proof → CTA). Add the audience/product, one specific benefit, only supported proof, an approved offer if applicable, and CTA.

If text overlay is enabled, supply the exact headline/subheadline/offer/CTA text. The generated brief requests that hierarchy, reserves the bottom 20% for a later logo, and forbids invented logos. Branding already visible on the actual product is preserved in the instructions. Text rendering and subject fidelity still need inspection.

Square exports at 1080×1080, Story/Portrait at 1080×1920, and Landscape at 1920×1080. Custom images support dimensions from 512 to 4096 per side. The model generates a supported aspect ratio, then Sharp fits it onto the exact output canvas without cropping. This can include padding or upscaling; it does not imply native high-resolution detail. Flatlay uses overhead perspective; macro permits a detail crop rather than contradicting the requested shot with an eye-level rule.

Video remains one eight-second, 720p Veo Lite clip in landscape/portrait. The image export dimensions do not change video resolution. Review the full brief before submitting; the preview itself does not call a paid model. There is no guarantee that a formula produces high conversion rates: validate campaign performance using real results.

## 3. Understand usage, allowances, and balance

Open **AI usage & balance** from the top-right menu or usage indicator. Store settings also includes a usage tab.

- Gemini text and image responses supply measured prompt, output, thinking, and total token counts when available. The displayed total uses the provider total rather than adding counters that could overlap.
- Successful/failed provider attempts are recorded from this app version onward. Existing usage in AI Studio is not imported. Sample output without a provider call does not create fictional token use.
- Video completion is recorded when its operation is checked, deduplicated using that operation. Pending videos are excluded until completion; interrupted submission or missing operation data may not be recorded. Old jobs retain their recorded model for cost attribution.
- Veo 3.1 Lite at 720p uses the current listed US$0.05/second estimate, about US$0.40 for eight seconds. Other video models are unpriced unless supported later. See [Google pricing](https://ai.google.dev/gemini-api/docs/pricing#veo-3.1).
- Text input/output rates and image-per-request estimates are optional user-configured planning rates. Unknown rates stay unpriced. Image estimates exclude input/extra charges; text estimates do not apply cache discounts or extras. Rates apply to future records only. Taxes, discounts, free-tier eligibility, and other account activity are not reconciled.
- Monthly token/USD allowances are optional soft planning amounts. They reset by UTC calendar month, may show overage, and do not enforce a spending cap or represent purchased credits. Remaining amounts are unavailable when relevant recorded usage is unknown/unpriced or the process has observed a tracking write failure.
- The app uses the operator's configured backend key/project. It has no provider-balance synchronization, credit purchase/refund flow, or user credit wallet. Google AI Studio/Cloud Billing is the source for actual charges and prepaid balances. Other apps using the same key/project are outside this ledger.

Private knowledge, encrypted Page authorization, usage settings, and the ledger live under `.data/workspaces/{workspace}/` locally or `workspaces/{workspace}/private/{record}` in Firestore. Recent request detail is capped at 150 events; monthly totals remain. The ledger is informational, not an accounting system or a billing guarantee.

References: [Gemini token metadata](https://ai.google.dev/gemini-api/docs/tokens), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [pdf-parse](https://github.com/mehmet-kozan/pdf-parse).

## Validation still required

Production build and TypeScript checking pass. No new automated/browser tests or paid generations were run for this update. Before the demo, verify document extraction, private/public context isolation, single/dual/template-only image requests and dimensions, Page token permissions/expiry, token metadata, failed-call accounting, monthly allowances, and video-completion deduplication with the configured services. The older PDF deck/video still use the previous branding.

## Simplified creative setup

The main Creative setup tab now uses clickable choices. Use Advanced config for subject clarification, custom scene direction, specific benefit, approved proof/offer, headline/subheadline, CTA, text overlay, and custom dimensions. Switching tabs keeps the current values. Selecting Custom scene or Custom dimensions opens Advanced config automatically.
