import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Package, Search, ImageIcon, Settings, Layers, DollarSign } from "lucide-react";
import { CategoryManagement } from "./CategoryManagement";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductAttributeManager } from "./product/ProductAttributeManager";
import { PricingTierManager } from "./product/PricingTierManager";

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

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 0,
    stock_quantity: 0,
    sku: "",
    barcode: "",
    weight: 0,
    dimensions: "",
    category_id: "",
    images: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadCategories();
    
    // Set up realtime subscription with proper cleanup
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Products table changed, reloading...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up products subscription...');
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array to prevent re-subscriptions

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .order('name');

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
    }

    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq('category_id', selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } else {
      // Ensure images array exists for each product
      const productsWithImages = (data || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setProducts(productsWithImages);
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
    if (!newProduct.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('products')
      .insert({
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || null,
        price: newProduct.price,
        stock_quantity: newProduct.stock_quantity,
        sku: newProduct.sku.trim() || null,
        barcode: newProduct.barcode.trim() || null,
        weight: newProduct.weight || null,
        dimensions: newProduct.dimensions.trim() || null,
        category_id: newProduct.category_id || null,
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
        price: 0,
        stock_quantity: 0,
        sku: "",
        barcode: "",
        weight: 0,
        dimensions: "",
        category_id: "",
        images: []
      });
      setIsCreating(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.name.trim()) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name.trim(),
        description: editingProduct.description?.trim() || null,
        price: editingProduct.price,
        stock_quantity: editingProduct.stock_quantity,
        sku: editingProduct.sku?.trim() || null,
        barcode: editingProduct.barcode?.trim() || null,
        weight: editingProduct.weight || null,
        dimensions: editingProduct.dimensions?.trim() || null,
        category_id: editingProduct.category_id || null,
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Tabs defaultValue="products" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="attributes">Attributes</TabsTrigger>
        <TabsTrigger value="variations">Variations</TabsTrigger>
        <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
      </TabsList>

      <TabsContent value="products" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">Product Management</h3>
            <p className="text-slate-600">Manage your product inventory</p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Create/Edit Product Form */}
        {(isCreating || editingProduct) && (
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-800">
                {isCreating ? "Create New Product" : "Edit Product"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
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
                  <Label htmlFor="productPrice">Price *</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    step="0.01"
                    value={isCreating ? newProduct.price : editingProduct?.price || 0}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      if (isCreating) {
                        setNewProduct({...newProduct, price});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, price});
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="productStock">Stock Quantity *</Label>
                  <Input
                    id="productStock"
                    type="number"
                    value={isCreating ? newProduct.stock_quantity : editingProduct?.stock_quantity || 0}
                    onChange={(e) => {
                      const stock_quantity = parseInt(e.target.value) || 0;
                      if (isCreating) {
                        setNewProduct({...newProduct, stock_quantity});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, stock_quantity});
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="productCategory">Category</Label>
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
                <div>
                  <Label htmlFor="productSku">SKU</Label>
                  <Input
                    id="productSku"
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
                <div>
                  <Label htmlFor="productBarcode">Barcode</Label>
                  <Input
                    id="productBarcode"
                    value={isCreating ? newProduct.barcode : editingProduct?.barcode || ""}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewProduct({...newProduct, barcode: e.target.value});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, barcode: e.target.value});
                      }
                    }}
                    placeholder="Product barcode"
                  />
                </div>
                <div>
                  <Label htmlFor="productWeight">Weight (kg)</Label>
                  <Input
                    id="productWeight"
                    type="number"
                    step="0.01"
                    value={isCreating ? newProduct.weight : editingProduct?.weight || ""}
                    onChange={(e) => {
                      const weight = parseFloat(e.target.value) || 0;
                      if (isCreating) {
                        setNewProduct({...newProduct, weight});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, weight});
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="productDimensions">Dimensions</Label>
                  <Input
                    id="productDimensions"
                    value={isCreating ? newProduct.dimensions : editingProduct?.dimensions || ""}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewProduct({...newProduct, dimensions: e.target.value});
                      } else if (editingProduct) {
                        setEditingProduct({...editingProduct, dimensions: e.target.value});
                      }
                    }}
                    placeholder="L x W x H"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="productDescription">Description</Label>
                <Textarea
                  id="productDescription"
                  value={isCreating ? newProduct.description : editingProduct?.description || ""}
                  onChange={(e) => {
                    if (isCreating) {
                      setNewProduct({...newProduct, description: e.target.value});
                    } else if (editingProduct) {
                      setEditingProduct({...editingProduct, description: e.target.value});
                    }
                  }}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Product Images</Label>
                <ProductImageUpload
                  images={isCreating ? newProduct.images : editingProduct?.images || []}
                  onImagesChange={(images) => {
                    if (isCreating) {
                      setNewProduct({...newProduct, images});
                    } else if (editingProduct) {
                      setEditingProduct({...editingProduct, images});
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={isCreating ? handleCreateProduct : handleUpdateProduct} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCreating ? "Create" : "Update"} Product
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProduct(null);
                    setNewProduct({
                      name: "",
                      description: "",
                      price: 0,
                      stock_quantity: 0,
                      sku: "",
                      barcode: "",
                      weight: 0,
                      dimensions: "",
                      category_id: "",
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

        {/* Products List - Enhanced image display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products found. Create your first product!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
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
                        onClick={() => setEditingProduct(product)}
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
      </TabsContent>

      <TabsContent value="categories">
        <CategoryManagement />
      </TabsContent>

      <TabsContent value="attributes">
        <ProductAttributeManager />
      </TabsContent>

      <TabsContent value="variations">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Product Variations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Product variations management will be available here.</p>
              <p className="text-sm">Create attributes first, then manage product variations.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pricing">
        <PricingTierManager />
      </TabsContent>
    </Tabs>
  );
}
