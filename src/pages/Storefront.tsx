import { useParams, Navigate } from 'react-router-dom';
import { useStorefront } from '@/hooks/useStorefront';
import { StorefrontLayout } from '@/components/storefront/StorefrontLayout';
import { ProductCatalog } from '@/components/storefront/ProductCatalog';

export default function Storefront() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { data: store, isLoading, error } = useStorefront(storeSlug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return <Navigate to="/not-found" replace />;
  }

  return (
    <StorefrontLayout store={store}>
      <ProductCatalog customerId={store.customer_id} />
    </StorefrontLayout>
  );
}
