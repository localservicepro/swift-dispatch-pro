
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "./ProductForm";
import { ProductList } from "./ProductList";
import { ProductFilters } from "./ProductFilters";
import { ProductManagementHeader } from "./ProductManagementHeader";

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

export function ProductsTabContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleFormClose = () => {
    setIsCreating(false);
  };

  const handleFormSuccess = () => {
    loadProducts();
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
    <div className="space-y-6">
      <ProductManagementHeader onCreateProduct={() => setIsCreating(true)} />

      <ProductFilters
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={setSearchQuery}
        onCategoryChange={setSelectedCategory}
      />

      {isCreating && (
        <ProductForm
          isCreating={true}
          editingProduct={null}
          categories={categories}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      <ProductList
        products={filteredProducts}
        categories={categories}
        loading={loading}
        onDeleteSuccess={loadProducts}
        onEditSuccess={loadProducts}
      />
    </div>
  );
}
