import { useState } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PortalOrders() {
  const { customerId } = useCustomerAuth();
  const { orders, isLoading, cancelOrder, isCancelling } = useCustomerOrders(customerId);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(order => 
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = (status: string) => status === 'requested';
  const canCancel = (status: string) => status === 'requested';

  if (isLoading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Orders</h2>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You can only edit or cancel orders with "Requested" status. Once processing begins, please contact us to make changes.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-medium mb-2">No orders found</p>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first order'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString()} • {order.customer_name}
                    </p>
                  </div>
                  <Badge variant={
                    order.status === 'delivered' ? 'default' :
                    order.status === 'requested' ? 'secondary' :
                    order.status === 'cancelled' ? 'destructive' :
                    'outline'
                  }>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Delivery Address</p>
                      <p className="font-medium">{order.delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium text-lg">${order.total_amount.toFixed(2)}</p>
                    </div>
                    {order.delivery_date && (
                      <div>
                        <p className="text-muted-foreground">Delivery Date</p>
                        <p className="font-medium">{new Date(order.delivery_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {order.placed_via && (
                      <div>
                        <p className="text-muted-foreground">Placed Via</p>
                        <p className="font-medium capitalize">{order.placed_via}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    {canEdit(order.status) ? (
                      <>
                        <Button size="sm" variant="outline">
                          Edit Order
                        </Button>
                        {canCancel(order.status) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                Cancel Order
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel order {order.order_number}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No, keep order</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelOrder(order.id)}
                                  disabled={isCancelling}
                                >
                                  Yes, cancel order
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Contact us to modify this order
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
