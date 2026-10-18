# Retail Ops AI — Simplified Technical Specification

**Product:** Retail Ops AI  
**Host application:** AsensoPost Studio  
**Document status:** Proposed MVP specification  
**Audience:** Product, design, and development team  
**Demo business:** Habi Home (fictional)

---

## 1. Product overview

Retail Ops AI is a lightweight customer-service and order-capture extension for AsensoPost Studio. It helps small and medium-sized businesses turn interest from marketing content into product questions and simple orders.

It is **not** a full inventory-management system, POS, ERP, or ecommerce platform. The owner should be able to maintain stock in Google Sheets, a familiar tool, while Retail Ops AI provides a simple customer storefront, AI chat, and a small view of incoming orders.

### Core experience

1. A customer opens a public store page from an AsensoPost campaign link or QR code.
2. The customer sees the store introduction and a small selection of products.
3. The customer asks the AI assistant about products, prices, branch availability, and store policies.
4. If the customer wants to order, the assistant collects the minimum necessary details and presents a summary.
5. The assistant collects the customer's contact details and the information needed to fulfil the order.
6. The customer reviews the customer details, items, fulfilment method, and total, then explicitly confirms submission.
7. The order and customer details are recorded in Google Sheets and made visible to the owner.
8. The owner reviews and confirms or cancels the order. Stock is adjusted only after owner confirmation.

### Product principles

- **SME-first:** simple language, few controls, minimal setup.
- **Spreadsheet-first inventory:** Google Sheets is the source of truth for stock quantities.
- **Chat-first ordering:** the customer can order through conversation; a complex checkout flow is not required.
- **Owner stays in control:** the AI must not invent stock, prices, policies, or order outcomes.
- **Channel-ready, not channel-heavy:** build web chat first; design the conversation logic so other channels can be added later.
- **Reuse AsensoPost:** follow its existing visual language and integrate with its current store/settings experience where practical.

---

## 2. MVP scope

### Included in the MVP

| Area | MVP capability |
|---|---|
| Customer storefront | One public landing page per store, with store identity, featured products, stock-status labels, and a visible chat entry point |
| AI chat | Answer product, price, branch, stock, and configured store-policy questions using store data |
| Order capture | Collect customer name and mobile number, relevant contact/delivery details, items, quantities, branch, and pickup or delivery choice; show a summary and ask for confirmation |
| Simple product setup | Add or edit basic product details through a small form in the existing AsensoPost settings area |
| Google Sheets inventory | Generate a spreadsheet from store/product/branch setup; staff update stock quantities directly in the sheet |
| Owner order view | A compact list of orders with pending, confirmed, cancelled, and needs-review statuses |
| Owner AI chat visibility | A lightweight conversation view showing the actual customer messages and AI replies in chronological order |
| Human takeover | Authorized owner/staff can pause AI replies for a conversation and reply directly; they can return the conversation to AI mode when appropriate |
| Sync visibility | Show last-sync time and provide a “Sync now” action |
| Campaign tracking | Keep the campaign ID from an AsensoPost link on the resulting order when available |

### Explicitly out of scope for the MVP

- Full inventory editor inside the application
- POS, accounting, supplier management, purchase orders, or ERP workflows
- Complex product variant management
- Payments, refunds, invoices, or courier booking
- Automatic stock reservations before owner confirmation
- Customer accounts or loyalty programs
- Advanced analytics or a full CRM
- Multi-level staff permissions
- Facebook Messenger, Viber, and WhatsApp integrations
- Voice chat, image-based product questions, and automated upselling

These may be considered after the core flow has been tested with small businesses.

---

## 3. Three primary screens

The product should be demonstrated with three primary screens. Product setup is a compact form, not a large setup wizard. Inventory remains in Google Sheets.

### Screen 1 — Public customer storefront

**Suggested route:** `/s/{slug}?c={campaignId}`

**Purpose:** Let a customer arriving from a post or QR code understand the store, browse a few products, and start a conversation.

**Layout:**
- Store logo/name and a short tagline
- Optional campaign creative or hero image, when the visitor arrives through a tracked campaign
- A small featured-products section
- Each product shows photo (optional), name, price, and availability label
- Optional branch/location information
- A clear “Ask us” / “Chat with us” button, plus a persistent chat entry near the bottom
- Responsive layout suitable for mobile browsers

**Do not add:** a large category system, complex filters, customer account area, cart dashboard, or multi-step checkout.

**Product availability labels:**
- In stock
- Only a few left
- Out of stock

Show an “as of” timestamp for inventory freshness. Exact quantities should be hidden from customers by default; an owner setting may enable them if needed.

### Screen 2 — Customer AI chat

**Suggested route:** `/s/{slug}/chat`

**Purpose:** Answer questions and capture a simple order in a conversational flow.

**Interface:**
- Familiar message bubbles with the AsensoPost dark-green and mint visual style
- Short welcome message
- Up to five optional quick-reply chips
- Inline product information when useful (name, image if available, price, availability)
- Branch information when relevant
- A compact order summary in the conversation before submission
- Customer confirms by replying naturally, e.g. “Yes, confirm my order.” A confirm button may also be provided in the web interface as an optional convenience, but it must invoke the same confirmation flow.

**Order flow:**
1. Customer asks a question or expresses intent to order.
2. Assistant identifies the product, quantity, branch, and pickup/delivery request.
3. Assistant asks only for missing details.
4. Server validates product IDs, prices, quantities, and fulfilment options, then creates a draft summary.
5. Assistant presents the item(s), quantity, branch, fulfilment request, customer name/phone (when collected), and server-computed total.
6. Customer explicitly confirms in a separate message or uses the web confirm action.
7. Only then is the order submitted and written to the Orders sheet.
8. Assistant returns the order reference and explains that the store will review/confirm it.

Before submission, the assistant must show a review summary that includes the customer's contact details, items and quantities, branch, pickup/delivery method, delivery address when applicable, and server-computed total. The order must not be submitted merely because the customer asked about a product or began providing details.

**Channel compatibility:** The web chat may show richer cards and buttons. Future messaging channels must adapt the same order and assistant logic to each channel’s supported message format. Do not assume Messenger can render the web interface identically.

### Screen 3 — Owner order list and inventory link

**Suggested route:** an owner-only page within the existing AsensoPost Studio, e.g. `/owner/retail-ops`

**Purpose:** Give the owner visibility without building a full admin suite.

**Show only:**
- A compact list of recent orders
- Order reference, date, customer name, item summary, branch, total, and status
- Basic actions: Confirm, Cancel, or mark Needs review where applicable
- Link/button to open the connected Google Sheet
- Last-sync time and “Sync now” action
- A link to the small product setup form

### Owner chat visibility and human takeover

Include a simple **Chats** view within the owner area. This is not a full CRM or helpdesk. It should let an authorized owner or staff member:

- See a list of recent customer conversations, with customer name when provided, last message preview, last activity time, and status.
- Open a conversation and read the actual customer messages and the AI assistant's replies in chronological order.
- See basic context for the conversation, such as products discussed and an associated order if one exists.
- See whether the AI is active or a human staff member has taken over.
- Select **Take over** to pause AI-generated replies for that conversation and respond as the store.
- Send a human reply and see it appear in the same conversation history.
- Select **Return to AI** when the staff member is ready for the assistant to resume.
- Flag a conversation for follow-up if the assistant cannot answer safely.

When a human has taken over, the system must not send an AI reply to the same conversation until the staff member returns it to AI mode. Messages should be labelled clearly as **Customer**, **AI assistant**, or **Store staff**.

A separate, complex CRM inbox is not required for the MVP. The owner can open the conversation from the Chats view or from an associated order.

**Order statuses:**
- Pending — customer confirmed submission; awaiting owner review
- Confirmed — owner accepted the order and stock update succeeded
- Cancelled — owner cancelled the order
- Needs review — stock or data conflict prevents safe confirmation

---

## 4. Simple product setup

Product setup should be a small form integrated into the existing AsensoPost Store Settings area. It should not look like a separate inventory application.

### Required fields

| Field | Requirement | Notes |
|---|---|---|
| Product name | Required | Customer-facing name |
| Price (PHP) | Required | Store as a numeric amount; validate on the server |
| Description | Optional | Short factual description for AI answers |
| Product photo | Optional | Reuse an existing creative/product image when possible |
| SKU or product ID | Recommended | Generate one if the owner does not provide it |
| Active | Required, default on | Inactive products are not offered by the assistant |

Category and variant fields should be optional and may be deferred if they complicate the initial form. Avoid a variant editor in the MVP.

### Simple owner workflow

1. Owner opens **Store Settings → Products**.
2. Owner selects **Add product**.
3. Owner enters name and price, and optionally adds a photo and description.
4. Owner saves the product.
5. The application adds the product to the store catalog and synchronizes the corresponding row into the generated Google Sheet without overwriting stock quantities.

Branch addresses, hours, contact details, and pickup/delivery availability should use a similarly compact list/form. Do not require a multi-step wizard unless user testing shows it is necessary.

---

## 5. Google Sheets inventory model

### Source of truth

Google Sheets is the owner/staff-facing source of truth for stock quantities and the order log. The application may cache synchronized stock data for faster customer responses, but the cache is not the authoritative stock record.

The owner or branch staff do not need a separate inventory editor or app login just to update stock.

### Suggested workbook tabs

| Tab | Who edits it | Purpose |
|---|---|---|
| README | System-generated | Simple instructions, sync guidance, and warnings about system-managed columns |
| Store | Owner/setup | Store name, contact, policies, and other basic information where appropriate |
| Branches | Owner/setup | Branch name, address, hours, phone, pickup and delivery flags |
| Products | Owner/setup | Product ID/SKU, name, price, description, photo URL, active status |
| Stock | Owner/staff | One stock quantity per product per branch; totals/status can be formula-driven |
| Orders | Application; owner may update status through the app | Submitted order records and status |

Keep the workbook understandable to nontechnical staff. Use clear column headings, frozen header rows, validation where practical, and formulas for totals/status. Do not ask staff to edit formulas or system-managed identifiers.

### Example Stock tab

All values below are fictional demonstration data.

| SKU | Product | Price (PHP) | Makati | Iloilo | Cebu | Total | Reorder at | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| HH-INB-RUN-IND | Inabel Table Runner | 1450 | 12 | 0 | 7 | 19 | 6 | OK |
| HH-HAB-CSH-SUN | Hablon Cushion Cover | 890 | 25 | 14 | 3 | 42 | 10 | OK |
| HH-BIN-THR-NAT | Binakol Throw Blanket | 3200 | 4 | 9 | 0 | 13 | 15 | Low |
| HH-ABA-BSK-M | Abaca Storage Basket | 1100 | 18 | 6 | 11 | 35 | 8 | OK |

### Sync rules

- Generate the spreadsheet in the owner's Google Drive using the minimum required Google permissions.
- Pull stock changes into the app on a five-minute schedule.
- Provide an owner-triggered **Sync now** action.
- Store a `syncedAt` timestamp with the cached stock data.
- Customer answers must show availability based on the last successful sync and disclose the “as of” time.
- Adding a product or branch may update the workbook structure, but must never overwrite existing stock quantities.
- On owner order confirmation, check the current stock cell before decrementing it.
- If the stock value has changed or is insufficient, do not silently overwrite it. Set the order to **Needs review** and ask the owner to resolve the mismatch.
- Make order writes idempotent so retries do not create duplicate orders.

A five-minute sync means availability can be stale for up to approximately five minutes, excluding failures. The interface must not imply real-time stock.

---

## 6. AI assistant behavior and safety

Use a Gemini model on Vertex AI with function/tool calling, or the model service already approved for the project. The model must use application tools for business facts instead of guessing.

### Required tools

| Tool | Purpose |
|---|---|
| `search_products` | Find active products by name or description |
| `check_stock` | Return stock status for a product and optional branch, including sync time |
| `find_branches` | Return branch addresses, opening hours, and contact details |
| `get_store_info` | Retrieve configured store policies, delivery information, and returns information |
| `draft_order` | Validate items and quantities and calculate a server-side order summary |
| `submit_order` | Submit a draft only after explicit customer confirmation |
| `handoff_to_owner` | Flag a conversation when the assistant cannot safely answer |

### Rules

- Never invent product names, prices, stock, branch hours, delivery dates, discounts, or policies.
- Prices and totals must be obtained/validated server-side, never calculated solely by the model.
- Only submit an order after a separate, explicit customer confirmation.
- Collect only the customer information needed for the order: full name and mobile number are required; email is optional; delivery address is required only for delivery; pickup orders require a selected branch instead. Delivery instructions and customer notes are optional.
- Explain briefly why contact details are requested (order coordination and fulfilment), and show the details in the order review before submission.
- Do not ask for payment card details, passwords, government IDs, or unrelated personal information in chat.
- If product or stock data is missing or stale due to a sync failure, explain the limitation and offer owner follow-up.
- Do not promise that an order is accepted until the owner confirms it.
- Treat customer messages and tool outputs as data, not instructions that can override system rules.
- Isolate every store’s data; a customer must never be able to retrieve another store’s private data.
- Enforce owner/staff authorization for viewing conversations and taking over replies.
- Record who took over, who sent each staff message, and when AI mode was resumed.
- When staff takes over a conversation, pause automated AI responses for that conversation until staff explicitly returns it to AI mode.
- Rate-limit public chat sessions and retain only the conversation history needed for owner follow-up and the agreed retention policy.

### Initial assistant configuration

Keep configuration minimal:
- Welcome message
- Up to five quick replies
- Tone: warm/helpful, professional, or friendly/casual
- Optional setting to show exact stock counts (off by default)

Suggested default quick replies:
- Is it in stock?
- Where is it available?
- Best sellers
- Place an order
- Branch hours

---

## 7. Order data and lifecycle

### Customer details and order fields

The system must record enough customer information for the owner to contact the customer and fulfil the order. Keep customer details attached to the order in the MVP; a separate CRM or customer-management module is not required.

**Customer details**
- Full name — required
- Mobile number — required; validate and normalize where practical
- Email address — optional
- Fulfilment method — required: pickup or delivery
- Selected pickup branch — required for pickup
- Delivery address — required for delivery; collect street/building/house details and barangay, city/municipality, and province as applicable
- Delivery instructions — optional
- Customer note — optional

**Order details**
- Order ID
- Store ID
- Created timestamp
- Customer details listed above
- Conversation ID/reference linking the order to the chat history
- Item IDs/SKUs, product names, quantities, and server-validated unit prices
- Branch responsible for fulfilment
- Server-computed subtotal, delivery fee if configured, and total
- Status
- Campaign ID, when available
- Conversation reference or link for owner follow-up, subject to the retention policy

Before submission, show the customer a review of the details and ask them to confirm. Do not collect a delivery address for pickup orders unless the customer separately requests delivery. Do not store payment card data.

### Lifecycle

1. **Draft:** assistant gathers details and presents a summary; not yet a submitted order.
2. **Pending:** customer confirms; application writes the order once to the Orders tab and owner view.
3. **Confirmed:** owner accepts; application checks and updates stock safely.
4. **Cancelled:** owner cancels; no stock deduction.
5. **Needs review:** stock mismatch or write/sync conflict requires owner action.

Do not reserve stock while an order is only a draft or pending. The owner confirmation step is the MVP's control point for preventing unsafe stock changes.

---

## 8. Integration with AsensoPost Studio

- Reuse AsensoPost’s existing design language: dark green navigation, mint accents, rounded cards, and familiar typography.
- Add a compact Retail Ops AI entry point in the existing store/settings area rather than introducing a separate product dashboard.
- Allow an existing campaign creative to link to `/s/{slug}?c={campaignId}`.
- Preserve the campaign ID in the customer session and attach it to the order if an order results.
- Provide a public storefront link and QR code for sharing.
- Keep the initial experience usable even if a customer arrives without a campaign ID.

### Future messaging-channel design

Web chat is the only required channel in the MVP. Keep order handling, product lookup, inventory lookup, and store policy logic in shared backend services. A future Messenger/Viber/WhatsApp adapter can map those results to each channel's supported text, buttons, and templates.

Messenger integration is a later phase, not a prerequisite for the initial demo.

---

## 9. Suggested implementation architecture

This is a proposed implementation, to be confirmed against the existing AsensoPost codebase.

- **Frontend:** add responsive storefront and chat pages; add a compact owner order list and product form to the existing app.
- **Application backend:** authenticate owner/staff actions, serve public store data, handle chat turns, validate draft orders, submit orders, process owner confirmation, and enforce per-conversation AI/staff mode.
- **AI service:** Gemini on Vertex AI with function calling and strict tool-grounding.
- **Database/cache:** Firestore for store configuration, catalog metadata, conversations, order state, and cached stock reads.
- **Inventory/order source of truth:** Google Sheets for branch stock and order records.
- **Scheduled sync:** Cloud Scheduler or the existing scheduling mechanism to refresh stock every five minutes.
- **Campaign tracking:** preserve AsensoPost campaign IDs in store links and order records.

Do not duplicate the entire inventory in a separate admin interface. Firestore stock records are a read cache; Google Sheets remains the authoritative editable stock source.

### Suggested API surface

| Endpoint | Purpose |
|---|---|
| `GET /public/stores/{slug}` | Return public store profile, active products, branches, and cached stock status |
| `POST /public/chat` | Process one chat turn and return a reply plus optional product/branch/order-summary cards |
| `POST /public/orders/confirm` | Submit a validated draft after explicit customer confirmation |
| `POST /owner/products` | Create or update basic product details and synchronize catalog rows |
| `POST /owner/sheet/create` | Create the store's inventory workbook |
| `POST /owner/sheet/sync` | Run an on-demand stock sync |
| `PATCH /owner/orders/{id}` | Confirm/cancel an order; safe stock adjustment occurs on confirmation |
| `GET /owner/chats` | List recent customer conversations for authorized store staff |
| `GET /owner/chats/{id}/messages` | Read the conversation history, including customer, AI, and staff messages |
| `PATCH /owner/chats/{id}/mode` | Take over a conversation or return it to AI mode |
| `POST /owner/chats/{id}/messages` | Send a staff reply and record it in the conversation history |
| `POST /owner/campaigns/{id}/link` | Create a tracked storefront link and QR code |

Exact endpoint names can be adapted to existing project conventions.

---

## 10. Acceptance criteria for the MVP

The MVP is ready for demonstration when the following end-to-end checks pass:

1. An owner can enter basic store details and add a product through a compact form.
2. The application creates or connects the Google Sheet and documents which tabs staff can edit.
3. Branch staff can change a stock quantity in the sheet without needing a separate inventory editor.
4. A scheduled or manual sync updates the app's stock cache and last-sync timestamp.
5. A customer can open the public store page on mobile and see product prices and availability labels.
6. The assistant answers stock, price, branch, and policy questions from tools backed by store data.
7. The assistant collects the customer's full name and mobile number, plus the fulfilment-specific details required for pickup or delivery.
8. The assistant presents a review summary containing customer details, items, fulfilment details, and a server-computed total.
9. An order is not submitted until the customer explicitly confirms the summary.
10. A confirmed customer submission appears once in the Orders tab and owner order list as Pending, with customer contact details.
11. The owner can see and use the recorded contact details to coordinate fulfilment, and can confirm or cancel the order.
12. Owner confirmation decrements the correct branch stock only after validating the current sheet value.
13. A stock conflict produces Needs review rather than a silent overwrite.
14. The customer is not told the order is accepted until the owner confirms it.
15. The campaign ID is retained on an order when the customer arrived through a tracked campaign.
16. If inventory cannot be checked, the assistant discloses that limitation and offers owner follow-up.

### Prototype targets (to measure, not assumed achieved)

- First reply visible in under 3 seconds for a typical stock question.
- Stock cache reflects a successful scheduled sync within five minutes.
- No duplicate order records after retrying the same submission.
- No stock deductions before owner confirmation.

---

## 11. Demo script

Use a fictional business such as Habi Home and label all data as demonstration data.

1. **Show the customer storefront:** a campaign hero, a few products, price, availability, and chat entry.
2. **Ask a stock question:** “Is the Binakol Throw Blanket available in Iloilo?”
3. **Show grounded AI output:** the assistant checks the synchronized sheet-backed stock and reports the last-sync time.
4. **Place a sample order:** ask for one blanket, provide name and phone, select branch/fulfilment, then explicitly confirm the summary.
5. **Show the owner view:** the order appears as Pending.
6. **Show Google Sheets:** the order is recorded, while stock has not yet been deducted.
7. **Confirm the order as owner:** demonstrate the safe stock update and changed status.
8. **Show the simple product form:** change a product's name, price, or description without navigating a large setup wizard.

---

## 12. Roadmap after MVP

### Next, if validated by SME feedback
- CSV product import
- Low-stock alerts
- Improved stock-sync resilience or push sync
- Filipino-language replies
- Basic campaign-to-order attribution summary

### Later
- Facebook Messenger, Viber, and WhatsApp channel adapters
- Payment links and courier integrations
- Branch-manager roles
- Product variants and richer catalog tools
- Advanced campaign analytics

Only promote a roadmap feature into the MVP when a real customer need justifies its added complexity.

---

## 13. Final product definition

**Retail Ops AI is a simple storefront and AI assistant that helps SMEs answer customer questions and capture orders, using Google Sheets as the familiar inventory and order-recording tool.**

The MVP's customer-facing experience consists of the storefront and AI chat. The owner area stays lightweight and contains a compact order list, a simple Chats view for reading AI/customer messages and taking over replies, and a link to Google Sheets. Product setup is a compact form within existing AsensoPost settings.

For presentation, the three primary mockups are:
1. Customer storefront with featured products and chat entry
2. Customer AI chat with a clear order-summary/confirmation flow
3. Owner Chats view showing real conversation history and human takeover, with the compact order/inventory links available from the same lightweight owner area

The Google Sheet remains the source of truth for stock quantities; no separate full inventory dashboard is required. Google Sheets—not a new inventory dashboard—is the source of truth for stock quantities. The system records the customer's name, mobile number, optional email, and the pickup/delivery details needed for fulfilment. The owner remains in control of order acceptance and stock deduction.

The goal is to help small businesses respond professionally and capture more of the interest their marketing creates, without making them adopt a large business-management system.
