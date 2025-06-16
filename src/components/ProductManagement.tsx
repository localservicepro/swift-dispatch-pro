
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CategoryManagement } from "./CategoryManagement";
import { ProductImageUpload } from "./ProductImageUpload";
import { Package, Edit, Trash2, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  is_active: boolean;
  images: string[];
  category_id: string | null;
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

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock_quantity: "",
    sku: "",
    images: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadCategories();
    
    // Set up realtime subscriptions
    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => loadProducts()
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'product_categories' },
        () => loadCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock_quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('products')
      .insert({
        name: newProduct.name,
        description: newProduct.description || null,
        category_id: newProduct.category_id || null,
        price: parseFloat(newProduct.price),
        stock_quantity: parseInt(newProduct.stock_quantity),
        sku: newProduct.sku || null,
        images: newProduct.images
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product created successfully!",
      });
      setNewProduct({ 
        name: "", 
        description: "", 
        category_id: "", 
        price: "", 
        stock_quantity: "", 
        sku: "",
        images: []
      });
      setIsCreating(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        description: editingProduct.description,
        category_id: editingProduct.category_id,
        price: editingProduct.price,
        stock_quantity: editingProduct.stock_quantity,
        sku: editingProduct.sku,
        images: editingProduct.images
      })
      .eq('id', editingProduct.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product updated successfully!",
      });
      setEditingProduct(null);
    }
  };

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
    }
  };

  const getStatusColor = (isActive: boolean, stockQuantity: number) => {
    if (!isActive) return "bg-gray-100 text-gray-800";
    if (stockQuantity === 0) return "bg-red-100 text-red-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusText = (isActive: boolean, stockQuantity: number) => {
    if (!isActive) return "Inactive";
    if (stockQuantity === 0) return "Out of Stock";
    return "Active";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Product Management</h2>
          <p className="text-slate-600 mt-1">Manage your product catalog and categories</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex justify-end">
            <Button 
              onClick={() => setIsCreating(true)} 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Package className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {(isCreating || editingProduct) && (
            <Card className="border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <CardTitle className="text-green-800">
                  {isCreating ? "Add New Product" : "Edit Product"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={isCreating ? newProduct.name : editingProduct?.name || ""}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewProduct({...newProduct, name: e.target.value});
                        } else if (editingProduct) {
                          setEditingProduct({...editingProduct, name: e.target.value});
                        }
                      }}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={isCreating ? newProduct.category_id : editingProduct?.category_id || ""} 
                      onValueChange={(value) => {
                        if (isCreating) {
                          setNewProduct({...newProduct, category_id: value});
                        } else if (editingProduct) {
                          setEditingProduct({...editingProduct, category_id: value});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={isCreating ? newProduct.description : editingProduct?.description || ""}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewProduct({...newProduct, description: e.target.value});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, description: e.target.value});
                      }
                    }}
                    placeholder="Enter product description"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={isCreating ? newProduct.price : editingProduct?.price || ""}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewProduct({...newProduct, price: e.target.value});
                        } else if (editingProduct) {
                          setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0});
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={isCreating ? newProduct.stock_quantity : editingProduct?.stock_quantity || ""}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewProduct({...newProduct, stock_quantity: e.target.value});
                        } else if (editingProduct) {
                          setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value) || 0});
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={isCreating ? newProduct.sku : editingProduct?.sku || ""}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewProduct({...newProduct, sku: e.target.value});
                        } else if (editingProduct) {
                          setEditingProduct({...editingProduct, sku: e.target.value});
                        }
                      }}
                      placeholder="Product SKU"
                    />
                  </div>
                </div>

                <ProductImageUpload
                  productId={editingProduct?.id}
                  images={isCreating ? newProduct.images : editingProduct?.images || []}
                  onImagesChange={(images) => {
                    if (isCreating) {
                      setNewProduct({...newProduct, images});
                    } else if (editingProduct) {
                      setEditingProduct({...editingProduct, images});
                    }
                  }}
                />

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={isCreating ? handleCreateProduct : handleUpdateProduct} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCreating ? "Add" : "Update"} Product
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreating(false);
                      setEditingProduct(null);
                      setNewProduct({ 
                        name: "", 
                        description: "", 
                        category_id: "", 
                        price: "", 
                        stock_quantity: "", 
                        sku: "",
                        images: []
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Product Catalog ({products.length} products)
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
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4">
                        {product.images && product.images.length > 0 ? (
                          <div className="flex gap-2">
                            {product.images.slice(0, 3).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`${product.name} ${index + 1}`}
                                className="w-16 h-16 object-cover rounded border"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-slate-800">{product.name}</h3>
                              <Badge className={getStatusColor(product.is_active, product.stock_quantity)}>
                                {getStatusText(product.is_active, product.stock_quantity)}
                              </Badge>
                              {product.category?.name && (
                                <Badge variant="outline">{product.category.name}</Badge>
                              )}
                            </div>
                            <span className="text-lg font-bold text-green-600">${product.price.toFixed(2)}</span>
                          </div>
                          
                          {product.description && (
                            <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-slate-500">Stock</p>
                              <p className="font-medium">{product.stock_quantity} units</p>
                            </div>
                            {product.sku && (
                              <div>
                                <p className="text-slate-500">SKU</p>
                                <p className="font-medium">{product.sku}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-slate-500">Images</p>
                              <p className="font-medium">{product.images?.length || 0} uploaded</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingProduct(product)}
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
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
