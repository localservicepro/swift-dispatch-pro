import { ReactNode } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorefrontCart } from '@/hooks/useStorefrontCart';
import { Badge } from '@/components/ui/badge';

interface StorefrontLayoutProps {
  children: ReactNode;
  store: any;
}

export function StorefrontLayout({ children, store }: StorefrontLayoutProps) {
  const { totalItems } = useStorefrontCart();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{store.display_name}</h1>
              {store.customer?.company_name && (
                <p className="text-sm text-muted-foreground">{store.customer.company_name}</p>
              )}
            </div>
            <Button variant="outline" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {store.custom_message && (
        <div className="bg-primary/10 border-b">
          <div className="container mx-auto px-4 py-3">
            <p className="text-sm text-center">{store.custom_message}</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              {store.contact_email && (
                <p>Email: {store.contact_email}</p>
              )}
              {store.contact_phone && (
                <p>Phone: {store.contact_phone}</p>
              )}
            </div>
            <p className="text-xs">Powered by SwiftDispatch Pro</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
