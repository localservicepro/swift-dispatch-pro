// TEMPORARY performance-measurement harness. Delete after Batch 1 verification.
import { useRef } from "react";
import { useOrderEditFormLogic } from "@/components/order/OrderEditFormLogic";
import { ProductEditSection } from "@/components/order/ProductEditSection";

const mockOrder: any = {
  id: "00000000-0000-0000-0000-000000000001",
  order_number: "PERF-1",
  customer_name: "Perf Harness",
  customer_address: "1 Test St, Surrey Hills VIC 3127",
  products: [
    { id: "p1", product_id: "p1", name: "Soil", price: 42.5, unit_price: 42.5, quantity: 3 },
    { id: "p2", product_id: "p2", name: "Mulch", price: 18.25, unit_price: 18.25, quantity: 2 },
  ],
  subtotal: 164.0,
  delivery_fee: 45,
  adjustments: -10,
  fuel_surcharge: 5,
  total_amount: 204.0,
  status: "preparing",
  delivery_method: "delivery",
  payment_method: "card_on_file",
  delivery_date: "",
  delivery_time: "",
  created_at: new Date().toISOString(),
};

export default function PerfHarness() {
  const renders = useRef(0);
  renders.current += 1;
  (window as any).__perfRenders = renders.current;

  const logic = useOrderEditFormLogic(mockOrder);
  (window as any).__perfTotal = logic.formData.total_amount;
  (window as any).__perfBreakdown = logic.calculationBreakdown;

  return (
    <div style={{ padding: 24 }}>
      <div data-testid="renders">{renders.current}</div>
      <div data-testid="total">{logic.formData.total_amount}</div>
      <ProductEditSection
        currentProducts={logic.formData.products}
        onProductsChange={logic.handleProductsChange}
        onSubtotalChange={logic.handleSubtotalChange}
      />
    </div>
  );
}
