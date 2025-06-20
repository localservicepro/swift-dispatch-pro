
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Edit, Trash2, ImageIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  dimensions: string | null;
  is_active: boolean;
  category_id: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  category?: {
    name: string;
  };
}

interface ProductListProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDeleteSuccess: () => void;
}

export function ProductList({ products, loading, onEdit, onDeleteSuccess }: ProductListProps) {
  const { toast } = useToast();

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
      onDeleteSuccess();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Products ({products.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products found. Create your first product!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                {/* Product Images */}
                <div className="mb-3">
                  {product.images && product.images.length > 0 ? (
                    <div>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Image not available</p>
                        </div>
                      </div>
                      {product.images.length > 1 && (
                        <div className="flex gap-1 mt-2">
                          {product.images.slice(1, 4).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`${product.name} image ${index + 2}`}
                              className="w-12 h-12 object-cover rounded border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ))}
                          {product.images.length > 4 && (
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                              +{product.images.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No image</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Product Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-800 leading-tight">{product.name}</h4>
                    <span className="text-lg font-bold text-green-600 ml-2">${product.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {product.category?.name && (
                      <Badge variant="outline">{product.category.name}</Badge>
                    )}
                  </div>
                </div>
                
                {/* Product Details */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Stock:</span>
                    <span className="font-medium">{product.stock_quantity}</span>
                  </div>
                  {product.sku && (
                    <div className="flex justify-between">
                      <span>SKU:</span>
                      <span className="font-medium">{product.sku}</span>
                    </div>
                  )}
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onEdit(product)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
