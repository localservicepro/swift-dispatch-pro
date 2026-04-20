
## Investigation

User reports two issues visible in screenshots:
1. **Receipt for ORD-234588** shows NO Fuel Surcharge line (only Delivery $40), Total $499. Subtotal $454 + Adj $5 + Delivery $40 = $499 ✓ — no surcharge added.
2. **ORD-630356N** receipt shows Fuel Surcharge $5, Sale Total $732.50, Total $732.50. But Order Management list shows total **$727.50** (without the $5 fuel surcharge).

So two distinct bugs:
- **Bug A**: Fuel surcharge not applied to some orders at creation time (ORD-234588 has none).
- **Bug B**: When fuel surcharge IS applied (ORD-630356), the `total_amount` saved to DB excludes it, but the receipt PDF recomputes correctly and shows the higher total. This causes the list/badges to show a wrong (lower) total.

Let me investigate.
