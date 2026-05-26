
## Staff AI Assistant (Claude-powered)

A dedicated "AI Assistant" page in the admin sidebar where any authenticated staff member can chat with Claude. The assistant understands how the app works and can look up real business data on demand.

### What gets built

**1. New sidebar page**
- Add `AI Assistant` entry in `AdminSidebar.tsx` (icon: `Sparkles` or `Bot`).
- New route `/dashboard` tab + component `src/components/AIAssistant.tsx` rendering a full-page chat (messages list + input + streaming responses).
- Markdown rendering for assistant replies (`react-markdown`).
- Conversation kept in component state for this iteration (no persistence). A "Clear chat" button resets it.

**2. Anthropic API key**
- Request `ANTHROPIC_API_KEY` secret via the secrets tool.
- Stored server-side only, used inside the edge function.

**3. Edge function `ai-assistant` (streaming)**
- File: `supabase/functions/ai-assistant/index.ts`, `verify_jwt = true` in `supabase/config.toml`.
- Validates JWT (any authenticated user — admin, super_admin, driver, account_customer all allowed).
- Calls Claude (`claude-sonnet-4-5` or latest equivalent) with:
  - **System prompt** baking in app knowledge: roles & permissions, order/split numbering (MO-, -A/-B), order types & colors, delivery fee logic (suburb-based + global markup), time-slot formats, customer name rules (business_name priority), payment methods (incl. COD), MYOB/Google Sheets sync behavior, receipt/statement rules, Australian DD/MM/YYYY dates. Sourced from `mem://` index + `SwiftDispatchGuide.tsx` + `Knowledgebase.tsx`.
  - **Tool definitions** for live DB lookups (see below).
  - Full conversation history forwarded each call.
- Streams responses back using SSE; frontend renders tokens incrementally.

**4. Tool-calling for live business data**
Claude can call these read-only tools (executed inside the edge function using the service role, scoped to safe SELECTs):
- `search_orders(query, status?, limit)` — by order number, customer name, phone
- `get_order(order_number)` — full order detail incl. split siblings
- `search_customers(query)` — by name/business/phone/account number
- `get_customer(id)` — profile, recent orders, outstanding balance
- `search_products(query)` — name/SKU, stock, price
- `get_suburb_fee(suburb_name)` — delivery rate + markup
- `list_drivers_today()` — driver assignments for today
- `get_business_settings()` — non-secret settings (hours, contact, MYOB/Sheets toggles)

Each tool runs a parameterized query, hard-caps results (≤25 rows), and never returns secrets. No write tools in this phase.

**5. Access control**
- All authenticated users in `auth.users` can call the function (JWT required).
- No role check — drivers can also ask "where is order MO-1234?".
- Rate limit: simple in-memory per-user limiter inside the edge function (e.g., 20 req/min) with friendly toast on 429.

**6. Error handling**
- 401 (missing/invalid API key), 429 (rate limit), 402-equivalent (Anthropic credits) all surfaced as toasts.
- Network errors show a retryable inline error in the chat.

### Files

- `supabase/functions/ai-assistant/index.ts` (new) — Claude proxy + tools + streaming
- `supabase/config.toml` — register function with `verify_jwt = true`
- `src/components/AIAssistant.tsx` (new) — chat UI, streaming reader, markdown rendering
- `src/components/AdminSidebar.tsx` — add nav entry
- `src/pages/Index.tsx` (or wherever dashboard tabs are wired) — add tab case
- Secret request: `ANTHROPIC_API_KEY`

### Out of scope (this phase)
- Persisting chat history to DB
- Write/mutation tools (creating orders, updating statuses)
- Per-role tool restrictions
- File/image uploads to the assistant
- Voice input

### Validation
- Ask "How do I create a split order?" → returns workflow guidance.
- Ask "What's the status of order MO-XXXX?" → tool call + accurate answer.
- Ask "Show me customers in Burwood" → returns matches from DB.
- Verify drivers can access and that no secrets leak in responses.
