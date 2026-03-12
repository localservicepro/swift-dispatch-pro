

## Plan: Add Back Orders & Account Statements Documentation to Knowledge Base

Add two new articles to the existing Knowledgebase page explaining how back orders work with account statements and why splitting is important.

### Changes

**File: `src/pages/Knowledgebase.tsx`**

Add two new knowledgebase entries to the `knowledgebaseData` array:

1. **"Back Orders & Account Statements"** (under Order Management category)
   - Explains what back orders are and why they are excluded from statements
   - Explains that only "delivered" orders appear on monthly statements
   - Describes the problem: an order with mixed delivered and back-ordered items
   - Explains the solution: use "Move Items to Backorder" to split the order
   - Step-by-step workflow for the team

2. **"Account Summary Explained"** (under Payment Management category)
   - Explains what the Account Summary boxes mean (Current, Over 30, Over 60, Over 90, Total Due)
   - How each bucket is calculated (days since delivery date)
   - Clarifies it shows ALL unpaid delivered orders, not just the selected month

### Content Preview

**Article 1 — Back Orders & Account Statements:**
- Back orders are items a customer ordered but haven't been delivered yet
- Monthly statements only include delivered orders
- If an order has some items delivered and some not, you must split it
- How to split: Open order → scroll to "Move Items to Backorder" → select items → confirm
- Result: original order shows only delivered items with correct total; back-order items become a separate order that will appear on a future statement once delivered

**Article 2 — Account Summary Explained:**
- Current = unpaid orders delivered in the last 30 days
- Over 30 Days = unpaid orders delivered 31–60 days ago
- Over 60 Days = unpaid orders delivered 61–90 days ago
- Over 90 Days = unpaid orders delivered 91+ days ago
- Total Due = sum of all buckets = customer's total outstanding balance

Both articles will be tagged appropriately and searchable from the Knowledge Base sidebar.

