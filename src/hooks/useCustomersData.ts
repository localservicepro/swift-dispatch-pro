import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPhoneNumber, getPhoneSearchVariants } from "@/utils/phoneUtils";

const PAGE_SIZE = 50;

export interface CustomerFilters {
  searchQuery?: string;
  customerTypeFilter?: string;
  entityTypeFilter?: string;
  statusFilter?: string;
}

async function fetchMatchingSuburbIds(searchTerm: string): Promise<string[]> {
  const { data } = await supabase
    .from("suburbs")
    .select("id")
    .ilike("name", `%${searchTerm}%`)
    .limit(200);
  return data?.map((s) => s.id) || [];
}

async function fetchCustomersPage(pageParam: number, filters: CustomerFilters) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("customers")
    .select(
      `
        *,
        suburbs (
          id,
          name,
          state,
          postcode,
          delivery_rate
        ),
        customer_contacts (
          id,
          first_name,
          last_name,
          email,
          phone,
          contact_role,
          is_primary_contact,
          is_active
        )
      `
    )
    .order("created_at", { ascending: false });

  if (filters.customerTypeFilter && filters.customerTypeFilter !== "all") {
    query = query.eq("customer_type", filters.customerTypeFilter as any);
  }

  if (filters.entityTypeFilter && filters.entityTypeFilter !== "all") {
    query = query.eq("entity_type", filters.entityTypeFilter as any);
  }

  if (filters.statusFilter && filters.statusFilter !== "all") {
    query = query.eq("is_active", filters.statusFilter === "active");
  }

  const q = filters.searchQuery?.trim();
  if (q) {
    if (isPhoneNumber(q)) {
      // Stored phones may be formatted with spaces (e.g. "0409 563 775"),
      // so build multiple variants and match any of them.
      const variants = getPhoneSearchVariants(q);
      if (variants.length > 0) {
        const orFilter = variants.map(v => `phone.ilike.%${v}%`).join(",");
        query = query.or(orFilter);
      }
    } else {
      const matchedSuburbIds = await fetchMatchingSuburbIds(q);

      let orFilter = `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,business_name.ilike.%${q}%,email.ilike.%${q}%,account_number.ilike.%${q}%,full_address.ilike.%${q}%`;

      if (matchedSuburbIds.length > 0) {
        orFilter += `,suburb_id.in.(${matchedSuburbIds.join(",")})`;
      }

      query = query.or(orFilter);
    }
  }

  query = query.range(from, to);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
  return data || [];
}

export function useCustomersData(filters: CustomerFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "customers-paginated",
      filters.searchQuery || "",
      filters.customerTypeFilter || "all",
      filters.entityTypeFilter || "all",
      filters.statusFilter || "all",
    ],
    queryFn: ({ pageParam }) => fetchCustomersPage(pageParam as number, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if ((lastPage as any[]).length === PAGE_SIZE) {
        return (lastPageParam as number) + 1;
      }
      return undefined;
    },
  });

  const customers = useMemo(() => data?.pages.flat() || [], [data]);

  return {
    customers,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  };
}

/**
 * Lightweight server-side aggregate counts used by CustomerStats.
 * Uses count: 'exact', head: true so no rows are transferred.
 */
export function useCustomerStatsCounts() {
  return useQuery({
    queryKey: ["customers-stats-counts"],
    queryFn: async () => {
      const countQuery = (build: (q: any) => any) =>
        build(
          supabase.from("customers").select("*", { count: "exact", head: true })
        ).then(({ count, error }: any) => {
          if (error) throw error;
          return count || 0;
        });

      const [
        total,
        residential,
        trade,
        account,
        active,
        inactive,
      ] = await Promise.all([
        countQuery((q) => q),
        countQuery((q) => q.eq("customer_type", "residential")),
        countQuery((q) => q.eq("customer_type", "trade")),
        countQuery((q) => q.eq("customer_type", "account")),
        countQuery((q) => q.eq("is_active", true)),
        countQuery((q) => q.eq("is_active", false)),
      ]);

      return { total, residential, trade, account, active, inactive };
    },
    staleTime: 60_000,
  });
}
