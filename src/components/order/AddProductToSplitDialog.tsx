
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Product, CartItem } from "./types";

interface AddProductToSplitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product, quantity: number) => void;
  existingProducts: CartItem[];
}

export function AddProductToSplitDialog({
  isOpen,
  onClose,
  onAddProduct,
  existingProducts
}: AddProductToSplitDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .eq('is_active', true);

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      
      let processedProducts = data || [];
      
      // Apply relevance sorting when searching
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        
        const getRelevanceScore = (name: string) => {
          if (name === searchLower) return 4;          // Exact match
          if (name.startsWith(searchLower)) return 3;  // Starts with
          if (name.includes(searchLower)) return 2;    // Contains in name
          return 1;                                     // In description/SKU only
        };
        
        processedProducts.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aScore = getRelevanceScore(aName);
          const bScore = getRelevanceScore(bName);
          
          // Sort by relevance first, then stock, then name
          if (aScore !== bScore) return bScore - aScore;
          if (a.stock_quantity !== b.stock_quantity) return b.stock_quantity - a.stock_quantity;
          return aName.localeCompare(bName);
        });
      } else {
        // No search - sort by stock then name
        processedProducts.sort((a, b) => {
          if (a.stock_quantity !== b.stock_quantity) return b.stock_quantity - a.stock_quantity;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
      }
      
      setProducts(processedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, searchTerm]);

  const handleAddProduct = () => {
    if (selectedProduct && quantity > 0) {
      onAddProduct(selectedProduct, quantity);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm("");
  };

  const getExistingProductQuantity = (productId: string) => {
    const existingItem = existingProducts.find(item => item.product.id === productId);
    return existingItem?.quantity || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product to Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Product Search */}
          <div>
            <Label htmlFor="product-search" className="text-sm font-medium">
              Search Products
            </Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="product-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, or SKU..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchTerm ? 'No products found matching your search' : 'No products available'}
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-2 px-1">
                  Showing {products.length} product{products.length !== 1 ? 's' : ''} {searchTerm && `for "${searchTerm}"`}
                </div>
              <div className="space-y-2">
                {products.map((product) => {
                  const existingQuantity = getExistingProductQuantity(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {product.category.name}
                              </Badge>
                            )}
                            {existingQuantity > 0 && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                In cart: {existingQuantity}
                              </Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-600 mb-2">{product.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-green-600">
                              ${product.price.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              {product.sku && <span className="text-gray-500">SKU: {product.sku}</span>}
                              <span className={`font-medium ${
                                product.stock_quantity > 10 
                                  ? 'text-green-600' 
                                  : product.stock_quantity > 0 
                                  ? 'text-yellow-600' 
                                  : product.stock_quantity === 0 
                                  ? 'text-red-600' 
                                  : 'text-orange-600'
                              }`}>
                                {product.stock_quantity > 0 
                                  ? `Stock: ${product.stock_quantity}` 
                                  : product.stock_quantity === 0 
                                  ? 'Out of Stock' 
                                  : `Backorder (${Math.abs(product.stock_quantity)})`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>

          {/* Selected Product and Quantity */}
          {selectedProduct && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Label className="text-xs font-medium mb-2 block">Selected Product</Label>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-600">
                    ${selectedProduct.price.toFixed(2)} each
                  </p>
                </div>
                <Badge variant="outline">{selectedProduct.sku}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Quantity to add:</Label>
                <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                  <SelectTrigger className="w-20 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-600">
                  Total: ${(selectedProduct.price * quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleAddProduct} 
            disabled={!selectedProduct}
            className="flex-1"
          >
            <Package className="w-4 h-4 mr-2" />
            Add to Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
