# Design Specification

## Design goals

- Present one coherent studio for an independent business, creator, or professional.
- Make the interface approachable to non-technical users.
- Make the next useful action easy to find.
- Make AI assistance visible, understandable, and editable.
- Keep customer commitments and order acceptance under owner control.

## Visual direction

- Follow the Asenso One Studio direction in the supplied materials: dark green and mint accents, light surfaces, clean typography, and restrained cards.
- Use a consistent system for spacing, headings, buttons, forms, status labels, and navigation.
- Use suitable supplied or demo imagery; avoid broken assets and misleading imagery.
- Keep data views focused. Avoid decorative charts that do not help a user make a decision.

## Interaction requirements

- Keep developer setup help hidden unless the backend explicitly enables `SHOW_DEVELOPER_SETUP=true`. This includes the login Firebase guide, Sheets OAuth operator instructions, generation environment/key setup and backend storage details. Keep normal user connection actions, accurate sample labels, and plain-language unavailable/error messages visible.

- Support mobile and desktop viewport sizes.
- Provide clear labels and validation for inputs; placeholder text is not a substitute for a label.
- Use visible loading, success, empty, and recoverable error states.
- Clearly label sample data and simulated AI or integrations.
- Provide review and confirmation steps for consequential actions such as order submission or changing order status.
- Use plain language for AI-generated material and integration status.
- Content Studio exposes Writing and Product photos & video as visible tools. The media workspace follows an upload/reference → creative direction → preview/download/use-in-post layout.
- Label uploaded reference photos separately from generated results. Show persistent video job states and explain configuration failures at the point of generation.
- Put backend-key setup and status guidance in the media workspace; never ask the browser to persist or display a secret key.

## Accessibility requirements

- Use semantic HTML and appropriate accessible names for controls.
- Support keyboard navigation and show visible focus.
- Maintain readable contrast for text, controls, and status indicators.
- Do not communicate status by color alone.
- Ensure responsive layouts do not clip important content or controls.

## Account entry

Use a responsive forest-green brand story and cream sign-in panel consistent with the studio. Provide one primary Continue with Google action for both new and returning users, clear account-creation copy, loading/error feedback, and a separate optional sample-workspace link. When Firebase is unavailable, disable sign-in and show concrete setup guidance. Explain that Sheets access requires a separate connection. Show the Google account identity and sign-out control in the workspace.

## Sheets connection panel

Customer Hub shows Connect Google Sheets until the workbook is connected. Explain what will be created and provide expandable operator setup instructions. Connected users get a direct Open Sheet link, Sync stock, Renew Google access, and Disconnect. Display cancellation, incomplete setup, and connection failures inline. Keep workbooks when disconnecting; do not imply every studio record is continuously mirrored to Sheets.

## Offering management

Provide Add new item above the offering grid, with inline fields for name, price, description, and branch starting stock. Display a neutral photo placeholder for new items. Keep editing on existing cards. Show per-item local/pending/synced/error states and Retry Sheet sync for incomplete writes. Make partial success clear: local save can succeed while external synchronization fails.

Reveal Change photo on image hover or keyboard focus, and show it directly on touch devices. Open an inline library dropdown with hover/selection preview, Use photo and Cancel. Include uploaded and generated images, exclude videos, and disclose storefront visibility before saving. Photo changes save separately from name/price edits and update the storefront catalog and first-product hero.

## Multi-post calendar

Pair the month grid with a date/time/agenda/content form and a full-width daily list. Show per-day counts, up to two compact agenda summaries, and a remaining-post count. Daily cards show time, agenda, content title/preview, campaign link, and edit/return-to-draft controls. Support agenda suggestions and custom text. Clearly distinguish scheduling another copy from editing an existing slot. Keep the daily list stacked on narrow screens and label local planning times and manual publishing.

## Store settings entry

Store identity includes a Storefront hero photo section with the library dropdown/preview, first-product fallback, and Fill frame or Show full image display choices. Explain public visibility and cropping before Save settings. Show full image uses a simple rectangular frame to preserve text and image edges.

Rename the former Brand Studio page to Store settings. Show a Store settings tab and welcome instructions during first-time setup, followed by Finish setup and transition to Overview. After completion, hide the sidebar tab and expose Store settings in a top-right avatar dropdown with account identity and sign-out. Support click-away closing, Escape with focus restoration, keyboard activation, and a popup width that fits mobile screens. Existing custom stores should not repeat onboarding.

## Storefront funnel and floating support

Separate the introductory Home page from the Products catalog with explicit Home/Products navigation. Replace the hero chat CTA with Explore our products. Keep Chat with us fixed at the bottom-right, opening a bounded panel above its launcher with independent message scrolling, close/minimize controls, AI/sample/owner status, and order preparation. Fit the widget within mobile viewport bounds and safe-area spacing; order dialogs must layer above it. Support Escape and return focus to the launcher. Product cards offer product-specific inquiry and request controls.

## Brand knowledge and creative controls

Use Asenso One Studio wordmarks and title. Store settings has Store identity, Brand brain, and AI usage & balance tabs. Brand brain shows source counts, editable business-specific guidance, document text/truncation previews, and explicit read-only Page connection/import status. Keep identity saving separate from knowledge saving.

Creative controls expose role, style, shot, formula, source product/audience, supported benefit/proof/offer/copy, optional overlay, image dimensions, and template references. Provide a full brief preview without generation. Do not imply measured conversion performance or guaranteed subject fidelity. Give long forms a sticky preview at desktop widths and natural stacking on mobile.

Show a discoverable AI usage entry in the header/account menu. The usage screen separates measured tokens, unknown data, known estimated costs, optional planning allowances, and unavailable provider balance. Recent requests display model, feature, status, and estimate basis; tables scroll inside mobile containers.

## Content Library navigation

Add a Content Library sidebar entry beside Content Studio. Keep creation forms and live output preview in the studio; move saved posts and full media collections into the library. Use Posts and Photos & video sub-tabs, labeled search/status/type filters, responsive cards, clear empty states, and Edit/Plan/Use in post/Download actions. Show pending video status and inline previews. Link creation and saved collections in both directions.

## Creative configuration cleanup

Use Creative setup and Advanced config tabs within Product photos & video. Main setup uses selectable cards for reference role, creative direction, shot, scene presets, ad formula, product facts, audience, output format, and optional style reference. Saved reference photos are selectable buttons. Keep subject, custom scene, benefit/proof/offer, headline/subheadline/CTA, text overlay, and custom pixel dimensions in Advanced config. Preserve values between tabs; support tab keyboard navigation, pressed states, busy disabling, and mobile stacking.

## Reference dropdown previews

Use compact dropdowns for saved photos and style/layout references, with a preview panel alongside each. Hover or keyboard focus previews an option without changing selection; selecting pins its preview. Show kind and timestamp for repeated names, retain No style template, and support arrow keys, Home/End, Escape, outside-click closing, and visible focus. Keep other creative options as choice cards.
