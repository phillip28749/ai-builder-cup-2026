# Technical Specification

## Purpose and scope

This is a hackathon proof of concept for AsensoPost Studio. Build the smallest reliable implementation that demonstrates the connected brand, content, and customer-work value described in the [README](README.md). It is not intended to be a production ecommerce, inventory, POS, ERP, or CRM system.

## Technology and deployment constraints

- Use Google Cloud as the primary application platform.
- The submitted application must be deployed using **Cloud Run or Firebase Hosting**.
- Integrate a Google AI model such as Gemini or Gemma, or an eligible Google agentic platform, for a meaningful AI capability.
- Keep model credentials and privileged integration logic server side.
- Do not make a non-Google cloud provider or a paid third-party service necessary for the core demo.
- Google Sheets may be used as a familiar, inspectable source for demo product, stock, or order data.
- If live AI or Sheets access is unavailable, use an adapter-based demo fallback, and clearly label simulated results in the UI.

## Suggested architecture

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

## Demo reliability

- Keep the primary demonstration path usable with seeded data.
- Distinguish live model output and integrations from deterministic demo responses.
- Provide clear, recoverable UI feedback when a service is unavailable.
- Avoid requiring external social accounts or integrations for the core demonstration.
