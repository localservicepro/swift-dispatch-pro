import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryManagement } from "@/hooks/useInventoryManagement";
import { AlertTriangle, Package, TrendingDown, RotateCcw, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InventoryDashboard() {
  const {
    lowStockProducts,
    backOrderSummary,
    loading,
    threshold,
    setThreshold,
    fetchLowStockProducts,
    fetchBackOrderSummary,
    updateProductStock,
    hasLowStock,
    hasBackOrders,
    totalBackOrderedItems,
    totalBackOrderedOrders
  } = useInventoryManagement();

  const [editingStock, setEditingStock] = useState<{ productId: string; currentStock: number } | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>('');

  const handleStockEdit = (productId: string, currentStock: number) => {
    setEditingStock({ productId, currentStock });
    setNewStockValue(currentStock.toString());
  };

  const handleStockUpdate = async () => {
    if (editingStock && newStockValue !== '') {
      await updateProductStock(editingStock.productId, parseFloat(newStockValue));
      setEditingStock(null);
      setNewStockValue('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
          <p className="text-muted-foreground">Monitor stock levels and manage back orders</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchLowStockProducts()}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Items below {threshold} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Back Order Products</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{backOrderSummary.length}</div>
            <p className="text-xs text-muted-foreground">
              Products with pending orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Back Ordered</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalBackOrderedItems}</div>
            <p className="text-xs text-muted-foreground">
              Units in {totalBackOrderedOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-20"
                min="1"
              />
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products */}
      {hasLowStock && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Products
            </CardTitle>
            <CardDescription>
              Products that are running low and may need restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.product_name}</h4>
                    <p className="text-sm text-muted-foreground">Category: {product.category_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium text-amber-600">{product.current_stock} units</div>
                      <div className="text-xs text-muted-foreground">in stock</div>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Low Stock
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStockEdit(product.product_id, product.current_stock)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Stock - {product.product_name}</DialogTitle>
                          <DialogDescription>
                            Current stock: {product.current_stock} units
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newStock">New Stock Quantity</Label>
                            <Input
                              id="newStock"
                              type="number"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value)}
                              placeholder="Enter new stock quantity"
                              min="0"
                              step="0.1"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingStock(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleStockUpdate}>
                            Update Stock
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Order Summary */}
      {hasBackOrders && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              Back Order Summary
            </CardTitle>
            <CardDescription>
              Products with pending back orders that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backOrderSummary.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.orders_count} order{item.orders_count !== 1 ? 's' : ''} waiting
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium text-red-600">{item.total_back_ordered} units</div>
                      <div className="text-xs text-muted-foreground">back ordered</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{item.current_stock} units</div>
                      <div className="text-xs text-muted-foreground">current stock</div>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Back Order
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStockEdit(item.product_id, item.current_stock)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {!hasLowStock && !hasBackOrders && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">All Good!</h3>
            <p className="text-muted-foreground text-center">
              No low stock items or back orders to display. Your inventory levels look healthy.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stock Update Dialog */}
      {editingStock && (
        <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock Quantity</DialogTitle>
              <DialogDescription>
                Current stock: {editingStock.currentStock} units
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newStock">New Stock Quantity</Label>
                <Input
                  id="newStock"
                  type="number"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(e.target.value)}
                  placeholder="Enter new stock quantity"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStock(null)}>
                Cancel
              </Button>
              <Button onClick={handleStockUpdate}>
                Update Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}