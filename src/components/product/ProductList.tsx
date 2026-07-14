
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Edit, Trash2, ImageIcon, Star, Clock } from "lucide-react";
import { useSpecialPricing } from "@/hooks/useSpecialPricing";
import { format } from "date-fns";
import { ProductEditDialog } from "./ProductEditDialog";

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

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ProductListProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onDeleteSuccess: () => void;
  onEditSuccess: () => void;
}

export function ProductList({ products, categories, loading, onDeleteSuccess, onEditSuccess }: ProductListProps) {
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { specials, loadSpecialsForProducts, hasActiveSpecial, getSpecialForProduct, applySpecialDiscount } = useSpecialPricing();
  const [specialsLoaded, setSpecialsLoaded] = useState(false);

  useEffect(() => {
    if (products.length > 0 && !specialsLoaded) {
      const productIds = products.map(p => p.id);
      loadSpecialsForProducts(productIds).then(() => {
        setSpecialsLoaded(true);
      });
    }
  }, [products, loadSpecialsForProducts, specialsLoaded]);

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

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleCloseEdit = () => {
    setEditingProduct(null);
  };

  const handleEditSuccess = () => {
    onEditSuccess();
    setEditingProduct(null);
  };

  return (
    <>
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
              {products.map((product) => {
                const productSpecial = getSpecialForProduct(product.id);
                
                return (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors relative">
                    {/* Special Badge */}
                    {hasActiveSpecial(product.id) && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-red-500 text-white flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          SPECIAL
                        </Badge>
                      </div>
                    )}

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
                      </div>
                      
                      {/* Pricing Display - Simplified to show only base price and specials */}
                      <div className="mb-2">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <div className="flex items-center gap-2">
                              {hasActiveSpecial(product.id) ? (
                                <>
                                  <span className="line-through text-gray-400">${product.price.toFixed(2)}</span>
                                  <span className="font-medium text-red-600">
                                    ${applySpecialDiscount(product.price, product.id).toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-medium text-gray-800">${product.price.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Special Details */}
                      {productSpecial && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="flex items-center gap-1 text-red-700 font-medium">
                            <Star className="w-3 h-3" />
                            {productSpecial.special_name}
                          </div>
                          <div className="text-red-600">
                            {productSpecial.discount_type === 'percentage' 
                              ? `${productSpecial.discount_value}% off` 
                              : `$${productSpecial.discount_value} off`
                            }
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <Clock className="w-3 h-3" />
                            Ends: {format(new Date(productSpecial.end_date), 'd MMM yyyy')}
                          </div>
                        </div>
                      )}
                      
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
                        onClick={() => handleEditProduct(product)}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductEditDialog
          product={editingProduct}
          categories={categories}
          onClose={handleCloseEdit}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
