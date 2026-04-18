import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type OpportunityDateFilter = "today" | "week" | "month" | "all";

// Cap on how many delivered orders to ever load into the pipeline view.
// The pipeline is operational, not historical — anything older lives in Order Management.
const DELIVERED_HARD_CAP = 200;
// Explicit cap on active orders to prevent Supabase's silent 1000-row default truncation.
// Active workload should never approach this in practice.
const ACTIVE_HARD_CAP = 2000;

function getCreatedAfter(dateFilter: OpportunityDateFilter): Date | null {
  const now = new Date();
  switch (dateFilter) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "all":
    default:
      return null;
  }
}

function getDeliveredCutoff(dateFilter: OpportunityDateFilter): Date {
  // Even on "All Time" we only show recent delivered jobs in the pipeline.
  if (dateFilter === "all") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
  return getCreatedAfter(dateFilter) ?? new Date(0);
}

const PIPELINE_SELECT = `
  id,
  order_number,
  purchase_order,
  customer_name,
  customer_phone,
  customer_address,
  delivery_address,
  products,
  total_amount,
  status,
  payment_status,
  driver_id,
  created_at,
  delivery_date,
  delivery_time,
  special_instructions,
  customer_id,
  delivery_fee,
  subtotal,
  adjustments,
  truck_type,
  truck_id,
  deleted_at,
  master_order_id,
  is_split_order,
  delivery_suburb_id,
  delivery_method,
  order_notes,
  delivery_notes,
  contact_id,
  contact_name,
  contact_email,
  contact_phone,
  customers!orders_customer_id_fkey(
    id,
    suburb_id,
    company_name,
    business_name,
    customer_type,
    suburbs(id, name, state, postcode)
  ),
  delivery_suburbs:suburbs!orders_delivery_suburb_id_fkey(id, name, state, postcode),
  profiles!orders_driver_id_fkey(full_name),
  trucks!orders_truck_id_fkey(registration_number, truck_type)
`;

function mapOrder(order: any) {
  return {
    ...order,
    suburb_id: order.customers?.suburb_id || null,
    suburb_name: order.customers?.suburbs?.name || null,
    suburb_state: order.customers?.suburbs?.state || null,
    suburb_postcode: order.customers?.suburbs?.postcode || null,
    delivery_suburb_id: order.delivery_suburb_id || null,
    delivery_suburb_name: order.delivery_suburbs?.name || null,
    delivery_suburb_state: order.delivery_suburbs?.state || null,
    delivery_suburb_postcode: order.delivery_suburbs?.postcode || null,
    company_name: order.customers?.company_name || null,
    business_name: order.customers?.business_name || null,
    customer_type: order.customers?.customer_type || null,
    driver_name: order.profiles?.full_name || 'Not Assigned',
    truck_registration: order.trucks?.registration_number || null,
    truck_type_from_truck: order.trucks?.truck_type || order.truck_type,
    delivered_at: null as string | null,
  };
}

function sortOrders(rows: any[]) {
  const getDeliveryDateTime = (order: any) => {
    if (!order.delivery_date) return null;
    const dateStr = order.delivery_date;
    const timeStr = order.delivery_time || '00:00:00';
    return new Date(`${dateStr}T${timeStr}`).getTime();
  };

  return [...rows].sort((a, b) => {
    const aT = getDeliveryDateTime(a);
    const bT = getDeliveryDateTime(b);
    if (aT && bT) return aT - bT;
    if (aT && !bT) return -1;
    if (!aT && bT) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function useOpportunityData(dateFilter: OpportunityDateFilter = "all") {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track orders we just mutated locally so realtime echoes don't trigger refetches/toasts.
  const recentlyMutatedRef = useRef<Map<string, number>>(new Map());

  const markRecentlyMutated = useCallback((orderId: string) => {
    recentlyMutatedRef.current.set(orderId, Date.now());
    // Auto-cleanup after 4s
    setTimeout(() => recentlyMutatedRef.current.delete(orderId), 4000);
  }, []);

  const queryKey = ['opportunity-orders', dateFilter];

  const invalidateOrdersCache = useCallback(async (reason?: string) => {
    console.log(`Invalidating orders cache: ${reason || 'unknown reason'}`);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      await queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['deleted-orders'] });
    }, 500);
  }, [queryClient]);

  // Optimistically patch a single order in the cache (e.g. after drag-drop).
  const patchOrderInCache = useCallback((orderId: string, patch: Record<string, any>) => {
    markRecentlyMutated(orderId);
    queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(o => (o.id === orderId ? { ...o, ...patch } : o));
    });
  }, [queryClient, queryKey, markRecentlyMutated]);

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`Fetching opportunity orders (filter=${dateFilter})...`);

      const createdAfter = getCreatedAfter(dateFilter);
      const deliveredCutoff = getDeliveredCutoff(dateFilter);

      // Active stages: respect dateFilter only when not "all" (active work should always be visible).
      let activeQuery = supabase
        .from('orders')
        .select(PIPELINE_SELECT)
        .is('deleted_at', null)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(ACTIVE_HARD_CAP);

      if (createdAfter) {
        activeQuery = activeQuery.gte('created_at', createdAfter.toISOString());
      }

      // Delivered stage: always capped, and date-restricted to recent window.
      const deliveredQuery = supabase
        .from('orders')
        .select(PIPELINE_SELECT)
        .is('deleted_at', null)
        .eq('status', 'delivered')
        .gte('created_at', deliveredCutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(DELIVERED_HARD_CAP);

      const [activeRes, deliveredRes] = await Promise.all([activeQuery, deliveredQuery]);

      if (activeRes.error) throw activeRes.error;
      if (deliveredRes.error) throw deliveredRes.error;

      const activeRows = activeRes.data || [];
      const deliveredRows = deliveredRes.data || [];

      // Warn if we hit the cap — indicates we may be silently dropping active orders.
      if (activeRows.length === ACTIVE_HARD_CAP) {
        console.warn(`[OpportunityPipeline] Active orders query hit cap of ${ACTIVE_HARD_CAP}. Some orders may be missing.`);
      }

      const combined = [...activeRows, ...deliveredRows];
      const mapped = combined.map(mapOrder);
      const sorted = sortOrders(mapped);

      console.log(`Opportunity orders loaded: ${sorted.length} (active=${activeRows.length}, delivered=${deliveredRows.length})`);
      return sorted;
    },
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 5,
  });

  // Lightweight realtime: patch cache instead of invalidating, and skip self-echoes.
  useEffect(() => {
    const channel = supabase
      .channel(`opportunity-pipeline-${dateFilter}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (!newRecord) return;

          // Skip echoes from our own optimistic updates
          if (recentlyMutatedRef.current.has(newRecord.id)) return;

          // Soft-delete: remove from cache
          if (oldRecord?.deleted_at === null && newRecord.deleted_at !== null) {
            queryClient.setQueryData(queryKey, (oldData: any[] | undefined) =>
              (oldData || []).filter(o => o.id !== newRecord.id)
            );
            return;
          }

          // Restoration: needs full refetch to repopulate joins
          if (oldRecord?.deleted_at !== null && newRecord.deleted_at === null) {
            invalidateOrdersCache('order restored');
            return;
          }

          // Status change toast (only for changes from other users)
          if (oldRecord && oldRecord.status !== newRecord.status) {
            toast({
              title: "Pipeline Update",
              description: `Order ${newRecord.order_number} moved to ${newRecord.status}`,
              duration: 2500,
            });
          }

          // Patch the order in cache without refetch
          queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
            if (!oldData) return oldData;
            const exists = oldData.some(o => o.id === newRecord.id);
            if (!exists) return oldData;
            return oldData.map(o => (o.id === newRecord.id ? { ...o, ...newRecord } : o));
          });
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newRecord = payload.new as any;
          if (!newRecord || newRecord.deleted_at) return;
          if (recentlyMutatedRef.current.has(newRecord.id)) return;

          toast({
            title: "New Opportunity",
            description: `Order ${newRecord.order_number} entered pipeline`,
            duration: 2500,
          });
          // Need a refetch so we get the joined customer/driver/truck info
          invalidateOrdersCache('new order INSERT');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast, dateFilter, invalidateOrdersCache]);

  return {
    orders,
    isLoading,
    error,
    refetch,
    invalidateOrdersCache,
    patchOrderInCache,
    markRecentlyMutated,
  };
}
