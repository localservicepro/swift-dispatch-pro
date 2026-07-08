import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";

/**
 * Groups a flat list of orders into master/split groupings for display.
 *
 * - Master orders (is_split_order === false AND no master_order_id) that have
 *   any children present in the list are emitted as a group with their splits.
 * - Split orders whose master is missing from the list are emitted as
 *   "orphan" singles (rendered with a "Part of MO - ORD-xxx" indicator).
 * - Regular orders (no master, no children) are emitted as singles.
 *
 * Ordering is preserved from the input array — the group takes the position
 * of the earliest of (master, first child) so groups appear where the user
 * expects them in date-sorted lists.
 */

export interface GroupedOrder<T> {
  kind: 'group';
  master: T;
  splits: T[];
  /** Combined total across split orders, falling back to the master total if no split totals exist */
  combinedTotal: number;
}

export interface SingleOrder<T> {
  kind: 'single';
  order: T;
  /** True when this order is a split whose master was not in the source list */
  isOrphanSplit?: boolean;
  /** Master order number to reference in the orphan case (already formatted, no MO- prefix) */
  orphanMasterOrderNumber?: string;
}

export type OrderGroupItem<T> = GroupedOrder<T> | SingleOrder<T>;

interface MinimalOrder {
  id: string;
  order_number: string;
  master_order_id?: string | null;
  is_split_order?: boolean | null;
  total_amount?: number | null;
  subtotal?: number | null;
  delivery_fee?: number | null;
  adjustments?: number | null;
  fuel_surcharge?: number | null;
}

function getDisplayTotal(order: MinimalOrder): number {
  return calculateDisplayTotal({
    total_amount: Number(order.total_amount) || 0,
    subtotal: order.subtotal ?? undefined,
    delivery_fee: order.delivery_fee ?? undefined,
    adjustments: order.adjustments ?? undefined,
    fuel_surcharge: order.fuel_surcharge ?? undefined,
  });
}

export function groupOrdersBySplit<T extends MinimalOrder>(
  orders: T[]
): OrderGroupItem<T>[] {
  if (!orders || orders.length === 0) return [];

  const byId = new Map<string, T>();
  orders.forEach((o) => byId.set(o.id, o));

  // Build children map: masterId -> child orders (preserving input order)
  const childrenByMaster = new Map<string, T[]>();
  for (const o of orders) {
    if (o.master_order_id) {
      const list = childrenByMaster.get(o.master_order_id) ?? [];
      list.push(o);
      childrenByMaster.set(o.master_order_id, list);
    }
  }

  const emitted = new Set<string>();
  const result: OrderGroupItem<T>[] = [];

  for (const o of orders) {
    if (emitted.has(o.id)) continue;

    // Master with at least one child present
    if (!o.master_order_id && o.is_split_order === false) {
      const splits = childrenByMaster.get(o.id);
      if (splits && splits.length > 0) {
        const splitsSum = splits.reduce((sum, s) => sum + getDisplayTotal(s), 0);
        const combinedTotal = splitsSum > 0 ? splitsSum : getDisplayTotal(o);
        result.push({ kind: 'group', master: o, splits, combinedTotal });
        emitted.add(o.id);
        splits.forEach((s) => emitted.add(s.id));
        continue;
      }
    }

    // Split whose master is not in the list -> orphan single
    if (o.master_order_id && !byId.has(o.master_order_id)) {
      result.push({
        kind: 'single',
        order: o,
        isOrphanSplit: true,
        // We don't have the master's order_number here; leave undefined and
        // let the card fall back to just showing the split as-is with a hint.
      });
      emitted.add(o.id);
      continue;
    }

    // Regular single order
    if (!o.master_order_id) {
      result.push({ kind: 'single', order: o });
      emitted.add(o.id);
    }
  }

  return result;
}
