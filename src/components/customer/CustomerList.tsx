import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerCard } from "./CustomerCard";

interface CustomerListProps {
  customers: any[];
  isLoading: boolean;
  error: any;
  activeFilterCount: number;
  onViewOrders: (customer: any) => void;
  onEditCustomer: (customer: any) => void;
  onDeleteCustomer: (customerId: string) => void;
  onClearFilters: () => void;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export function CustomerList({
  customers,
  isLoading,
  error,
  activeFilterCount,
  onViewOrders,
  onEditCustomer,
  onDeleteCustomer,
  onClearFilters,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: CustomerListProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-8">Loading customers...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            Error loading customers. Please try again.
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {customers?.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onViewOrders={onViewOrders}
                onEditCustomer={onEditCustomer}
                onDeleteCustomer={onDeleteCustomer}
              />
            ))}
            {customers?.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {activeFilterCount > 0 ? (
                  <div className="space-y-2">
                    <p>No customers found matching your criteria.</p>
                    <Button
                      variant="link"
                      onClick={onClearFilters}
                      className="text-blue-600"
                    >
                      Clear all filters to see all customers
                    </Button>
                  </div>
                ) : (
                  "No customers found."
                )}
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage?.()}
                  disabled={isFetchingNextPage}
                  className="min-w-[200px]"
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                      Loading more...
                    </span>
                  ) : (
                    "Load More Customers"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
