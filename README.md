# AsensoPost Studio

AsensoPost Studio is an AI-powered brand and work studio for independent businesses, creators, and professionals building a one-person company or brand (OPC). It brings brand guidance, audience context, content creation, planning, and customer follow-up into one connected workflow.

This repository describes a **hackathon proof of concept** for the Google Cloud AI Builder Cup. The concept fits **Future of Work & Enterprise Productivity**: it helps one person handle work that often takes several tools or roles.

## What it helps you do

- Define your brand identity, voice, and target audience.
- Generate and edit marketing content that follows that brand context.
- Organize content in a calendar.
- Give customers a simple storefront and AI-assisted way to ask questions.
- Capture customer inquiries and orders for the owner to review.

The connected idea is: **market your OPC brand, then handle the interest that marketing creates, all from one studio.**

## Main areas

1. **Dashboard** — recent work and useful next steps.
2. **Brand Studio** — brand profile, voice, and guidelines.
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
- [AI Builder Cup 2026 brief](AI_Builder_Cup_2026_Brief.md) — event themes, requirements, timeline, judging criteria, and submission checklist.

## Source materials

The concept combines the AsensoPost Studio product overview with Lester’s Retail Ops AI specification. AsensoPost provides the brand and content studio direction; Retail Ops AI contributes the storefront, grounded customer chat, and owner-reviewed order workflow.
