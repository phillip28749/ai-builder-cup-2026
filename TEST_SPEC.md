# Testing Specification

## Purpose

Verify the prototype’s user-visible behavior, data integrity, and honest handling of AI and integration states. Tests should be repeatable using seeded demo data and mock adapters when live Google services are unavailable.

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

## Visual and accessibility checks

- Check key workflows on narrow mobile and standard desktop viewports.
- Check navigation and primary actions using only the keyboard.
- Verify visible focus, readable contrast, semantic labels, and status text that does not rely on color alone.
- Check loading, empty, error, and success states for core pages and actions.

## Demo acceptance criteria

The prototype is ready for a hackathon demonstration when a user can work with a sample brand, generate and edit content, organize it, open the connected storefront, ask a grounded product question, submit an explicitly confirmed sample order, and show that order awaiting owner review. Sample data, simulated responses, and unavailable integrations must be identified accurately.
