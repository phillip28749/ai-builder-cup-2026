# Asenso One Studio

## Firebase deployment

Live app: [Asenso One Studio](https://ai-builder-cup-66e9f.web.app), deployed on 18 October 2026. The frontend uses Firebase Hosting and the backend uses Cloud Run in the same project. For subsequent deployments, run `.\scripts\cloud-login.ps1` to authenticate if needed, then `.\scripts\deploy-firebase.ps1`. See [Deployment](DEPLOYMENT.md) for server secrets, OAuth redirects, persistence and local-data migration boundaries.

Asenso One Studio is an AI-powered brand and work studio for independent businesses, creators, and professionals building a one-person company or brand (OPC). It brings brand guidance, audience context, content creation, planning, and customer follow-up into one connected workflow.

This repository contains a working **hackathon proof of concept** for the Google Cloud AI Builder Cup. The concept fits **Future of Work & Enterprise Productivity**: it helps one person handle work that often takes several tools or roles.

The application is implemented in React and TypeScript with a Node API. A fictional Habi Home brand, catalog, and audiences are included. By default, the app opens a Google sign-in page and uses local persistence. New accounts receive sample catalog/audience data and a blank brand profile. Google Cloud adapters are implemented; live cloud verification and publishing remain pending.

## Open the prototype

With Node.js 24 and npm available, run `npm install` and `npm run dev`, then open **http://localhost:8088**. Complete the one-time [Google sign-in setup](GOOGLE_SIGNIN_SETUP.md), then use **Continue with Google** to create an account and open your personal studio. The six workspace pages are available from the sidebar. Select **Visit your storefront** to try the customer view.

For a production build, use `npm run build` followed by `npm start`. Run `npm test` for API and domain checks and `npm run test:browser` for the browser journey (install Playwright Chromium first with `npx playwright install chromium`).

Account data persists under `.data/workspaces/user_<hash>/workspace.json`, with private media in the same workspace directory. Cloud deployments use per-account Firestore documents and scoped private media storage. Explicitly set `DEMO_MODE=true` to enable the shared sample workspace; its older local file remains `.data/workspace.json`. Customer chats use separate session cookies. Google sign-in does not connect Google Sheets automatically. Use **Customer Hub ? Connect Google Sheets** after completing the operator?s [Sheets setup](GOOGLE_SHEETS_SETUP.md). Each account creates its own workbook; the OAuth client is configured once for the app.

## What it helps you do

- Define your brand identity, voice, and target audience.
- Generate and edit marketing content that follows that brand context.
- Upload a product photo and create a styled product shot, advertising creative, or eight-second product video.
- Organize content in a calendar.
- Give customers a simple storefront and AI-assisted way to ask questions.
- Capture customer inquiries and orders for the owner to review.

The connected idea is: **market your OPC brand, then handle the interest that marketing creates, all from one studio.**

## Product photos and video

Open **Content Studio → Product photos & video**. Upload a JPEG, PNG, or WebP product photo (up to 4 MB), choose a creative type and output format, and describe the scene. Images use Gemini image editing; videos use Veo through the Gemini API. Video defaults to `veo-3.1-lite-generate-preview`, one eight-second clip at 720p. Google currently lists Lite 720p at US$0.05/second (about US$0.40 per eight-second clip); see [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing#veo-3.1). Results are saved in the media library and can be previewed, downloaded, and attached to a post draft. Videos continue as persisted Google operations and are checked while the page is open; returning to the page resumes checks.

Provide your key as **`GEMINI_API_KEY` on the backend**. The root [.env.example](.env.example) shows the server settings. Copy it to `.env`, provide your key, and restart the backend. Never put the key in a `VITE_` variable or frontend code. The in-page setup panel shows whether the key is present and lets you check the image model. Image and video models can be selected through `GEMINI_IMAGE_MODEL` and `GEMINI_VIDEO_MODEL`; access depends on the key's project, billing, and quota. `GEMINI_MODEL` remains the optional text-model selection.

Uploads work without a key in local mode. Generation does not simulate successful images or videos when Google access is unavailable. Local media files are stored under the ignored `.data` directory. Cloud Run uses a private Google Cloud Storage bucket configured through `MEDIA_BUCKET`; image/video bytes are not embedded in the workspace's Firestore document.

Implementation references: [Google image editing API](https://ai.google.dev/gemini-api/docs/generate-content/image-generation?hl=en) and [Veo image-to-video API](https://ai.google.dev/gemini-api/docs/veo).

## Main areas

1. **Dashboard** — recent work and useful next steps.
2. **Store settings** — brand profile, voice, and guidelines.
3. **Content Studio** — create and edit campaign content.
4. **Calendar & Publishing** — plan content and see its status.
5. **Audience & Insights** — define audiences and review useful insights.
6. **Customer Hub** — storefront, customer chat, inquiries, and order review.

The public storefront and customer chat are linked experiences within the Customer Hub.

## How the customer workflow works

1. A customer visits a storefront from a campaign link or QR code.
2. They browse products and ask questions about products, prices, stock, or store policies.
3. The assistant uses available store information to answer and can help prepare an order.
4. The customer reviews the order details and explicitly confirms submission.
5. The order appears for the owner to review. The owner decides whether to confirm it.

The owner remains in control: an order is not treated as accepted, and stock is not adjusted, before owner confirmation.

## Hackathon prototype scope

This is a focused demonstration, not a full ecommerce or business-management platform. It is designed to show a connected brand-to-customer workflow. Sample businesses and data may be used in the demo. AI and external integrations should be clearly identified as live or simulated in the interface.

The intended prototype uses Google AI such as Gemini and deploys on Google Cloud through Cloud Run or Firebase. Google Sheets can provide a familiar product/stock/order view. The project should not imply that social posts were published or orders accepted unless those actions actually occurred.

## Category

**Future of Work & Enterprise Productivity** — the studio helps an independent operator build a brand, create and organize work, and manage customer interactions from a connected workspace.

## Project documents

- [Agent instructions](AGENT.md) — high-level repository guidance and constraints for contributors and coding agents.
- [Technical specification](TECH_SPEC.md) — platform, architecture, AI, data integrity, and demo reliability requirements.
- [Design specification](DESIGN_SPEC.md) — visual direction, interaction behavior, responsive design, and accessibility.
- [Testing specification](TEST_SPEC.md) — functional, AI/data integrity, visual, and accessibility checks.
- [Google Sheets setup](GOOGLE_SHEETS_SETUP.md) ? per-user consent, workbook creation, and OAuth operator configuration.
- [Google sign-in setup](GOOGLE_SIGNIN_SETUP.md) ? enable account creation and understand data storage and pricing.
- [Deployment contract](DEPLOYMENT.md) — Cloud Run packaging, Google service integration, access modes, and POC reliability limits.
- [Submission package](SUBMISSION.md) — product pitch, timed demo, implementation status, and remaining public submission steps.
- [Submission deck](output/pdf/asensopost-hackathon-deck.pdf) — eight-slide PDF explaining the problem, product, AI, architecture, and validation.
- [Local preview video](output/video/asensopost-local-preview.webm) — a 91-second sample-mode walkthrough of the working prototype.
- [Validation report](QA_REPORT.md) — completed checks and the live-service checks still pending.
- [AI Builder Cup 2026 brief](AI_Builder_Cup_2026_Brief.md) — event themes, requirements, timeline, judging criteria, and submission checklist.

## Source materials

The concept combines the Asenso One Studio product overview with Lester’s Retail Ops AI specification. AsensoPost provides the brand and content studio direction; Retail Ops AI contributes the storefront, grounded customer chat, and owner-reviewed order workflow.

## Offering updates

In Customer Hub ? Offerings, use **Add new item** to enter name, description, price, and starting stock. **Save offering** updates the connected workbook's Products row, including price changes. **Sync workbook** updates catalog rows and refreshes stock from Sheets. Each card shows sync status and offers retry if a Sheet write fails. Without a Sheet connection, changes remain saved in your studio.

## Multiple posts and agendas

In Calendar, choose a day, planning time, agenda/purpose, and saved content, then click Add to calendar. Repeat for additional posts on the same day. The daily list sorts posts by time and provides Edit schedule and Return to drafts. Choosing an already scheduled post creates another scheduled copy, leaving its original slot unchanged. Times are local planning values; external publication remains manual.

## First setup and Store settings

New personal accounts start with Store settings. Enter a store name and personalize the identity, then choose Finish setup to open Overview. After setup, the settings tab leaves the sidebar: use the top-right avatar ? Store settings to make changes or sign out. Existing custom store profiles are treated as configured; the legacy `/brand` link redirects to `/settings`. Existing brand data and generation remain available.

## Storefront pages and chat

The public storefront has two pages: Home (`/s/{workspace}`) introduces the store, and Products (`/s/{workspace}/products`) lists offerings. Home's Explore our products button leads to the catalog. Chat with us is a fixed bottom-right widget on both pages. Product cards can open a product-specific question or start an order request. Legacy `/chat` links open the product page with the widget expanded. Campaign query parameters are retained across page navigation.

## Brand brain, structured creatives, and AI usage

The product is now **Asenso One Studio**, reflecting both brand building and Retail Ops. Existing workspace data, account connections, Cloud Run resource names, and cookie names are preserved.

- **Store settings ? Brand brain:** save positioning, differentiators, approved claims, phrases to avoid, and writing examples. Current product facts, audiences, and brand guidelines join this context automatically. Upload text-based PDF/TXT/MD/CSV/JSON supporting documents and review the exact context. This grounds the existing Gemini model; it does not train or fine-tune a new LLM.
- **Content Studio ? Product photos & video:** choose direction (minimalist/luxe/playful/organic), shot (hero/lifestyle/flatlay/macro/environmental), and formula (AIDA/PAS/Hook-Benefit-Proof-CTA). Add audience/product facts, benefit, substantiated proof, offer, headline/subheadline, and CTA. Choose text overlay and exact image export dimensions. Review the brief without running generation. Support an actual product photo, a style-only template with a described subject, or an actual photo plus a separate style template. Reference fidelity and actual conversion performance still need review.
- **Account menu ? AI usage & balance:** measured Gemini token counts, recent requests, known estimated costs, and optional monthly planning allowances. There is no purchased-credit wallet or provider-balance synchronization. Missing counts/costs are marked unavailable; Google AI Studio/Cloud Billing remains authoritative. Tracking starts with this update and does not reconstruct older usage.

Facebook Page context uses a read-only POC connector with a Page access token, not one-click Meta OAuth. See [BRAND_AND_USAGE_GUIDE.md](BRAND_AND_USAGE_GUIDE.md) for setup, limits, and usage interpretation. Existing deck/video artifacts were produced before this rebrand and should be refreshed before public submission.

## Content Studio and Content Library

Content Studio (`/content`) is for writing, post previews, and product/ad photo/video generation. Saved posts and media live in the separate Content Library (`/library`) sidebar tab, with Posts and Photos & video sections, search, and filters. Edit opens a saved post in the studio; saving returns to the library and preserves an existing schedule. Plan it opens Calendar with that post selected. Media can be previewed, downloaded, and attached through Use in post. Existing in-progress video operations continue checking while the library is open; no new generation is started by browsing.
