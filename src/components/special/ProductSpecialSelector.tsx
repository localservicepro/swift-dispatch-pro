
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Tag } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface ProductSpecialSelectorProps {
  selectedProducts: string[];
  selectedCategories: string[];
  onProductsChange: (products: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  specialId?: string;
}

export function ProductSpecialSelector({
  selectedProducts,
  selectedCategories,
  onProductsChange,
  onCategoriesChange,
  specialId
}: ProductSpecialSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    if (specialId) {
      loadExistingSelections();
    }
  }, [specialId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) throw categoriesError;

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadExistingSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('product_special_items')
        .select('product_id, category_id')
        .eq('special_id', specialId);

      if (error) throw error;

      const productIds = data?.filter(item => item.product_id).map(item => item.product_id!) || [];
      const categoryIds = data?.filter(item => item.category_id).map(item => item.category_id!) || [];

      onProductsChange(productIds);
      onCategoriesChange(categoryIds);
    } catch (error) {
      console.error('Error loading existing selections:', error);
    }
  };

  const handleProductToggle = (productId: string, checked: boolean) => {
    if (checked) {
      onProductsChange([...selectedProducts, productId]);
    } else {
      onProductsChange(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, categoryId]);
    } else {
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p.id);
    const uniqueIds = [...new Set([...selectedProducts, ...allFilteredIds])];
    onProductsChange(uniqueIds);
  };

  const handleDeselectAll = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    const remainingIds = selectedProducts.filter(id => !filteredIds.includes(id));
    onProductsChange(remainingIds);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDropdownCategory = selectedCategoryFilter === "all" || 
      product.category?.name === categories.find(c => c.id === selectedCategoryFilter)?.name;
    
    // If categories are selected via checkboxes, only show products from those categories
    const matchesSelectedCategories = selectedCategories.length === 0 || 
      selectedCategories.some(categoryId => {
        const category = categories.find(c => c.id === categoryId);
        return product.category?.name === category?.name;
      });
    
    return matchesSearch && matchesDropdownCategory && matchesSelectedCategories;
  });

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Apply Special To:</Label>
      
      {/* Categories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="w-5 h-5" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select categories to apply this special to all products within those categories.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => (
                  <div key={category.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-accent transition-colors">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => handleCategoryToggle(category.id, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer flex-1">
                      {category.name}
                    </Label>
                  </div>
                ))}
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected categories:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCategories.map(categoryId => {
                    const category = categories.find(c => c.id === categoryId);
                    return category ? (
                      <Badge key={categoryId} variant="secondary">
                        {category.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Individual Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select individual products to apply this special to specific items.
            </p>
            
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
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

            {/* Active Filtering Indicator */}
            {selectedCategories.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Badge variant="default">
                  Filtering by {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Showing products from selected categories above
                </span>
              </div>
            )}

            {/* Select All / Deselect All Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredProducts.length === 0}
              >
                Select All ({filteredProducts.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedProducts.length === 0}
              >
                Deselect All
              </Button>
            </div>

            {/* Product List */}
            {loading ? (
              <div className="text-center py-4">Loading products...</div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleProductToggle(product.id, checked as boolean)}
                      />
                      <div>
                        <Label htmlFor={`product-${product.id}`} className="font-medium">
                          {product.name}
                        </Label>
                        {product.category?.name && (
                          <p className="text-xs text-gray-500">{product.category.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Selected {selectedProducts.length} product(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedProducts.map(productId => {
                    const product = products.find(p => p.id === productId);
                    return product ? (
                      <Badge key={productId} variant="secondary">
                        {product.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(selectedProducts.length === 0 && selectedCategories.length === 0) && (
        <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm">Please select at least one category or product for this special.</p>
        </div>
      )}
    </div>
  );
}
