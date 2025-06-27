import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  Copy, 
  Shuffle, 
  MoveHorizontal,
  CheckSquare,
  Square,
  Package,
  Edit3,
  Trash2,
  RotateCcw,
  Plus,
  Minus
} from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { ProductReplacementDialog } from "./ProductReplacementDialog";

interface BulkManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
}

export function BulkManagementDialog({
  isOpen,
  onClose,
  cart,
  splits,
  onSplitsChange,
  onCartChange
}: BulkManagementDialogProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sourceSplit, setSourceSplit] = useState<number | null>(null);
  const [targetSplit, setTargetSplit] = useState<number | null>(null);
  const [operation, setOperation] = useState<'move' | 'copy' | 'distribute' | 'edit' | 'remove' | 'replace'>('move');
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [replacementDialog, setReplacementDialog] = useState<{
    isOpen: boolean;
    productId: string | null;
    splitIndex: number | null;
  }>({
    isOpen: false,
    productId: null,
    splitIndex: null
  });

  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const selectAllProducts = () => {
    const allProductIds = cart.map(item => item.product.id);
    setSelectedProducts(allProductIds);
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const distributeEvenly = () => {
    const updatedSplits = splits.map(split => ({ ...split, products: [] }));
    
    cart.forEach(cartItem => {
      const quantityPerSplit = Math.floor(cartItem.quantity / splits.length);
      const remainder = cartItem.quantity % splits.length;
      
      splits.forEach((_, index) => {
        const quantity = quantityPerSplit + (index < remainder ? 1 : 0);
        if (quantity > 0) {
          updatedSplits[index].products.push({
            productId: cartItem.product.id,
            quantity: quantity
          });
        }
      });
    });
    
    onSplitsChange(updatedSplits);
  };

  const moveAllProductsToSplit = (targetIndex: number) => {
    const updatedSplits = splits.map((split, index) => ({
      ...split,
      products: index === targetIndex 
        ? cart.map(cartItem => ({
            productId: cartItem.product.id,
            quantity: cartItem.quantity
          }))
        : []
    }));
    onSplitsChange(updatedSplits);
  };

  const editProductQuantities = () => {
    if (sourceSplit === null) return;

    const updatedSplits = [...splits];
    const sourceProducts = updatedSplits[sourceSplit].products;

    selectedProducts.forEach(productId => {
      const newQuantity = editQuantities[productId];
      if (newQuantity !== undefined) {
        const productIndex = sourceProducts.findIndex(p => p.productId === productId);
        if (productIndex >= 0) {
          if (newQuantity > 0) {
            sourceProducts[productIndex].quantity = newQuantity;
          } else {
            sourceProducts.splice(productIndex, 1);
          }
        }
      }
    });

    onSplitsChange(updatedSplits);
  };

  const removeSelectedProducts = () => {
    if (sourceSplit === null) return;

    const updatedSplits = [...splits];
    updatedSplits[sourceSplit].products = updatedSplits[sourceSplit].products.filter(p => 
      !selectedProducts.includes(p.productId)
    );

    onSplitsChange(updatedSplits);
  };

  const handleReplaceProduct = (productId: string) => {
    if (sourceSplit === null) return;
    
    setReplacementDialog({
      isOpen: true,
      productId,
      splitIndex: sourceSplit
    });
  };

  const handleProductReplacement = (splitIndex: number, currentProductId: string, newProduct: any, quantity: number) => {
    const updatedSplits = [...splits];
    const split = updatedSplits[splitIndex];
    
    // Remove current product and add new product
    split.products = split.products
      .filter(p => p.productId !== currentProductId)
      .concat([{ productId: newProduct.id, quantity }]);
    
    onSplitsChange(updatedSplits);

    // Add new product to cart if not already there
    if (onCartChange) {
      const existingCartItem = cart.find(item => item.product.id === newProduct.id);
      if (!existingCartItem) {
        const newCartItem: CartItem = {
          product: newProduct,
          quantity,
          unit_price: newProduct.price,
          total_price: newProduct.price * quantity
        };
        onCartChange([...cart, newCartItem]);
      }
    }

    setReplacementDialog({ isOpen: false, productId: null, splitIndex: null });
  };

  const copyProductsBetweenSplits = () => {
    if (sourceSplit === null || targetSplit === null || sourceSplit === targetSplit) return;

    const updatedSplits = [...splits];
    const sourceProducts = updatedSplits[sourceSplit].products.filter(p => 
      selectedProducts.includes(p.productId)
    );

    sourceProducts.forEach(sourceProduct => {
      const existingProduct = updatedSplits[targetSplit].products.find(p => 
        p.productId === sourceProduct.productId
      );

      if (existingProduct) {
        // Add to existing quantity (but don't exceed cart limit)
        const cartItem = cart.find(item => item.product.id === sourceProduct.productId);
        const totalAllocated = splits.reduce((total, split, index) => {
          if (index === targetSplit) return total;
          const splitProduct = split.products.find(p => p.productId === sourceProduct.productId);
          return total + (splitProduct?.quantity || 0);
        }, 0);
        
        const maxAllowed = (cartItem?.quantity || 0) - totalAllocated;
        existingProduct.quantity = Math.min(
          existingProduct.quantity + sourceProduct.quantity,
          maxAllowed
        );
      } else {
        updatedSplits[targetSplit].products.push({ ...sourceProduct });
      }
    });

    onSplitsChange(updatedSplits);
  };

  const moveProductsBetweenSplits = () => {
    if (sourceSplit === null || targetSplit === null || sourceSplit === targetSplit) return;

    const updatedSplits = [...splits];
    
    // Remove products from source split
    const productsToMove = updatedSplits[sourceSplit].products.filter(p => 
      selectedProducts.includes(p.productId)
    );
    
    updatedSplits[sourceSplit].products = updatedSplits[sourceSplit].products.filter(p => 
      !selectedProducts.includes(p.productId)
    );

    // Add products to target split
    productsToMove.forEach(product => {
      const existingProduct = updatedSplits[targetSplit].products.find(p => 
        p.productId === product.productId
      );

      if (existingProduct) {
        existingProduct.quantity += product.quantity;
      } else {
        updatedSplits[targetSplit].products.push({ ...product });
      }
    });

    onSplitsChange(updatedSplits);
  };

  const executeOperation = () => {
    switch (operation) {
      case 'move':
        moveProductsBetweenSplits();
        break;
      case 'copy':
        copyProductsBetweenSplits();
        break;
      case 'distribute':
        distributeEvenly();
        break;
      case 'edit':
        editProductQuantities();
        break;
      case 'remove':
        removeSelectedProducts();
        break;
    }
    
    setSelectedProducts([]);
    setSourceSplit(null);
    setTargetSplit(null);
    setEditQuantities({});
    onClose();
  };

  const getProductAllocation = (productId: string) => {
    return splits.map((split, index) => {
      const splitProduct = split.products.find(p => p.productId === productId);
      return {
        splitIndex: index,
        splitName: split.name,
        quantity: splitProduct?.quantity || 0
      };
    }).filter(allocation => allocation.quantity > 0);
  };

  const getProductQuantityInSplit = (productId: string, splitIndex: number) => {
    if (splitIndex === null) return 0;
    const split = splits[splitIndex];
    const product = split?.products?.find(p => p.productId === productId);
    return product?.quantity || 0;
  };

  const updateEditQuantity = (productId: string, quantity: number) => {
    setEditQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveHorizontal className="w-5 h-5" />
              Bulk Product Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Quick Actions */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Quick Actions</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={distributeEvenly}
                  className="text-xs"
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  Distribute Evenly
                </Button>
                
                {splits.map((split, index) => (
                  <Button
                    key={split.id}
                    variant="outline"
                    size="sm"
                    onClick={() => moveAllProductsToSplit(index)}
                    className="text-xs"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    All to {split.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Operation Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Operation</Label>
                <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="move">Move Products</SelectItem>
                    <SelectItem value="copy">Copy Products</SelectItem>
                    <SelectItem value="edit">Edit Quantities</SelectItem>
                    <SelectItem value="remove">Remove Products</SelectItem>
                    <SelectItem value="replace">Replace Products</SelectItem>
                    <SelectItem value="distribute">Distribute Evenly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(operation === 'move' || operation === 'copy') && (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">From Split</Label>
                    <Select value={sourceSplit?.toString() || ""} onValueChange={(value) => setSourceSplit(parseInt(value))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {splits.map((split, index) => (
                          <SelectItem key={split.id} value={index.toString()}>
                            {split.name} ({split.products.length} products)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">To Split</Label>
                    <Select value={targetSplit?.toString() || ""} onValueChange={(value) => setTargetSplit(parseInt(value))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {splits.map((split, index) => (
                          <SelectItem key={split.id} value={index.toString()} disabled={index === sourceSplit}>
                            {split.name} ({split.products.length} products)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(operation === 'edit' || operation === 'remove' || operation === 'replace') && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium mb-2 block">Select Split</Label>
                  <Select value={sourceSplit?.toString() || ""} onValueChange={(value) => setSourceSplit(parseInt(value))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select split to modify" />
                    </SelectTrigger>
                    <SelectContent>
                      {splits.map((split, index) => (
                        <SelectItem key={split.id} value={index.toString()}>
                          {split.name} ({split.products.length} products)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Product Selection */}
            {operation !== 'distribute' && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Select Products</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllProducts}
                      className="text-xs"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="text-xs"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto space-y-2">
                  {cart.map(cartItem => {
                    const allocations = getProductAllocation(cartItem.product.id);
                    const isSelected = selectedProducts.includes(cartItem.product.id);
                    const currentQuantityInSplit = getProductQuantityInSplit(cartItem.product.id, sourceSplit);
                    const editQuantity = editQuantities[cartItem.product.id] ?? currentQuantityInSplit;
                    
                    return (
                      <div
                        key={cartItem.product.id}
                        className={`p-3 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleProductSelect(cartItem.product.id, checked === true)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4" />
                                <span className="font-medium text-sm">{cartItem.product.name}</span>
                              </div>
                              <p className="text-xs text-gray-600">
                                Total Quantity: {cartItem.quantity} | ${cartItem.unit_price.toFixed(2)} each
                              </p>
                              
                              {/* Edit Quantity Controls */}
                              {operation === 'edit' && isSelected && sourceSplit !== null && currentQuantityInSplit > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateEditQuantity(cartItem.product.id, Math.max(0, editQuantity - 1))}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={editQuantity}
                                    onChange={(e) => updateEditQuantity(cartItem.product.id, parseInt(e.target.value) || 0)}
                                    className="w-16 h-6 text-xs text-center"
                                    min="0"
                                    max={cartItem.quantity}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateEditQuantity(cartItem.product.id, Math.min(cartItem.quantity, editQuantity + 1))}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-xs text-gray-600">
                                    in {splits[sourceSplit]?.name}
                                  </span>
                                </div>
                              )}

                              {/* Replace Product Button */}
                              {operation === 'replace' && isSelected && sourceSplit !== null && currentQuantityInSplit > 0 && (
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReplaceProduct(cartItem.product.id)}
                                    className="text-xs"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Replace Product
                                  </Button>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap gap-1 mt-2">
                                {allocations.map(allocation => (
                                  <Badge key={allocation.splitIndex} variant="secondary" className="text-xs">
                                    {allocation.splitName}: {allocation.quantity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={executeOperation}
              disabled={
                operation !== 'distribute' && 
                (selectedProducts.length === 0 || 
                 ((operation === 'move' || operation === 'copy') && (sourceSplit === null || targetSplit === null)) ||
                 ((operation === 'edit' || operation === 'remove' || operation === 'replace') && sourceSplit === null))
              }
              className="flex-1"
            >
              {operation === 'move' && 'Move Selected Products'}
              {operation === 'copy' && 'Copy Selected Products'}
              {operation === 'edit' && 'Update Quantities'}
              {operation === 'remove' && 'Remove Selected Products'}
              {operation === 'replace' && 'Replace Selected Products'}
              {operation === 'distribute' && 'Distribute All Products'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Replacement Dialog */}
      {replacementDialog.productId && replacementDialog.splitIndex !== null && (
        <ProductReplacementDialog
          isOpen={replacementDialog.isOpen}
          onClose={() => setReplacementDialog({ isOpen: false, productId: null, splitIndex: null })}
          currentProduct={cart.find(item => item.product.id === replacementDialog.productId)!}
          splitIndex={replacementDialog.splitIndex}
          splitName={splits[replacementDialog.splitIndex]?.name || ''}
          onReplace={handleProductReplacement}
        />
      )}
    </>
  );
}
