
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CartItem, Product } from "./types";

interface ProductReplacementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: CartItem;
  splitIndex: number;
  splitName: string;
  onReplace: (splitIndex: number, currentProductId: string, newProduct: Product, quantity: number) => void;
}

export function ProductReplacementDialog({
  isOpen,
  onClose,
  currentProduct,
  splitIndex,
  splitName,
  onReplace
}: ProductReplacementDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .neq('id', currentProduct.product.id); // Exclude current product

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      
      if (error) throw error;
      setProducts(data || []);
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

  const handleReplace = () => {
    if (selectedProduct) {
      onReplace(splitIndex, currentProduct.product.id, selectedProduct, currentProduct.quantity);
      onClose();
      setSelectedProduct(null);
      setSearchTerm("");
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedProduct(null);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Replace Product in {splitName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Current Product Display */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-xs font-medium mb-2 block">Current Product</Label>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{currentProduct.product.name}</p>
                <p className="text-xs text-gray-600">
                  ${currentProduct.unit_price.toFixed(2)} × {currentProduct.quantity} = ${currentProduct.total_price.toFixed(2)}
                </p>
              </div>
              <Badge variant="outline">{currentProduct.product.sku}</Badge>
            </div>
          </div>

          {/* Replacement Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* Product Search */}
          <div>
            <Label htmlFor="product-search" className="text-sm font-medium">
              Search Replacement Product
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
              <div className="space-y-2">
                {products.map((product) => (
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
                        </div>
                        {product.description && (
                          <p className="text-xs text-gray-600 mb-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-green-600">
                            ${product.price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {product.sku && <span>SKU: {product.sku}</span>}
                            <span>Stock: {product.stock_quantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Product Preview */}
          {selectedProduct && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Label className="text-xs font-medium mb-2 block">New Product Selection</Label>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-600">
                    ${selectedProduct.price.toFixed(2)} × {currentProduct.quantity} = ${(selectedProduct.price * currentProduct.quantity).toFixed(2)}
                  </p>
                </div>
                <Badge variant="outline">{selectedProduct.sku}</Badge>
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
            onClick={handleReplace} 
            disabled={!selectedProduct}
            className="flex-1"
          >
            Replace Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
