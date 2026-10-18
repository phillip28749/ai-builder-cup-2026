# AI Builder Cup submission package

**Product:** Asenso One Studio - Personal Brand Builder  
**Theme:** Future of Work & Enterprise Productivity

## Pitch

Independent creators often do the work of a brand strategist, copywriter, content planner, and customer support representative. Asenso One Studio gives them one connected studio: define a brand, create consistent content, plan a campaign, and handle the customer interest it generates. Shared brand context guides both marketing work and customer replies, while the owner keeps control of important decisions.

## What is implemented

- Six workspace pages: Overview, Store settings, Content Studio, Calendar, Audience & Insights, and Customer Hub.
- Two public views: a sample brand storefront and customer chat.
- Editable AI brand guidelines, captions, creative direction, and audience suggestions.
- Branded post previews, product photo uploads, Gemini product/ad image generation, and Veo video generation. Media can be previewed, downloaded, and attached to content drafts. The backend key and required model access must be configured for live generation.
- Persisted draft/scheduled content with campaign storefront links.
- Customer questions, explicit order review, owner acceptance/cancellation, stock adjustment, conversation history, and human takeover.
- Google Cloud adapters for Gemini, Firestore, Google Sheets, and private media storage. Text fallback is labeled; image/video failures are shown without fabricated results.

## Timed demonstration script - 2:45

| Time | Show | Narration |
|---|---|---|
| 0:00-0:20 | Overview | Maya is an independent maker. Building her brand means switching between strategy, writing, planning, and customer support. This studio brings that work together. |
| 0:20-0:50 | Store settings | Save Maya's story and voice, generate guidelines with live Gemini, and refine the output. This context follows her into the rest of the studio. |
| 0:50-1:20 | Content Studio and Calendar | Generate caption options, edit one, preview it in a branded layout, and place it on the calendar. The app plans content without claiming an external publication. |
| 1:20-1:55 | Campaign storefront and chat | Open the campaign link as a customer. Ask whether the blanket is available in Iloilo. The assistant uses store information and stock backed by Google Sheets. |
| 1:55-2:25 | Order review and Customer Hub | Prepare a request, inspect contact and fulfilment details and the server-calculated total, then explicitly submit. Show the pending order in the owner view and Sheet; stock is unchanged. |
| 2:25-2:45 | Owner acceptance and architecture | Accept the request and show the stock adjustment. Explain Cloud Run, Gemini, Firestore, and Sheets. One creator stays in control of a connected workday. |

Use only fictional customer information. Record the final submission after live integrations are verified. Local automated captures show sample mode and should not be represented as live Gemini evidence.

## Honest validation and impact

Automated local evidence covers the core journey, server-calculated prices, explicit confirmation, idempotent acceptance, separate customer sessions, and human takeover. Record the actual time needed to create an approved draft and prepare an inquiry/order during the final demonstration. Do not invent productivity percentages, audience analytics, or customer adoption claims.

## Submission readiness

- Source repository: implemented locally; public publishing pending.
- Deployment: Dockerfile and Cloud Run deployment script prepared; live URL pending project access.
- Live Gemini / Firestore / Google Sheets: adapters implemented; cloud verification pending.
- PDF deck: generated in `output/pdf/asensopost-hackathon-deck.pdf`.
- Video: timed script prepared; final live recording and public video link pending.
- Local preview: `output/video/asensopost-local-preview.webm`, approximately 91 seconds, with explicit sample-mode captions and no audio. This is a preview, not evidence of live Gemini or cloud deployment.
- A local, clearly labeled sample preview can be generated with `node scripts/record-demo.mjs` while the app runs on port 8088. It is supplemental demonstration material and does not replace live integration evidence.
- Theme and prototype description: ready above.

## Latest demonstration additions

Show Store settings ? Brand brain with product/guideline/document context, then build an ad using a selected formula/style/shot and preview its brief. Show reference fidelity and exact export sizing, followed by the AI usage screen with measured counters and honest unavailable balance/cost data. Facebook Page context is a read-only token-based POC connection, not automatic publishing. Ad performance remains unmeasured. Refresh the deck/video branding before submission.
