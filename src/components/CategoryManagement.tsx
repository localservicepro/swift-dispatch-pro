import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  allows_fractional_quantities: boolean;
  created_at: string;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    allows_fractional_quantities: false
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    
    // Set up realtime subscription with proper cleanup
    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'product_categories' },
        () => {
          console.log('Categories table changed, reloading...');
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up categories subscription...');
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array to prevent re-subscriptions

  const loadCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('product_categories')
      .insert({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || null,
        allows_fractional_quantities: newCategory.allows_fractional_quantities
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category created successfully!",
      });
      setNewCategory({ name: "", description: "", allows_fractional_quantities: false });
      setIsCreating(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    const { error } = await supabase
      .from('product_categories')
      .update({
        name: editingCategory.name.trim(),
        description: editingCategory.description?.trim() || null,
        allows_fractional_quantities: editingCategory.allows_fractional_quantities
      })
      .eq('id', editingCategory.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category updated successfully!",
      });
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category is used by products
    const { data: productsUsingCategory } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (productsUsingCategory && productsUsingCategory.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "This category is being used by products",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category deleted successfully!",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Category Management</h3>
          <p className="text-slate-600">Manage product categories</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {(isCreating || editingCategory) && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-800">
              {isCreating ? "Create New Category" : "Edit Category"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={isCreating ? newCategory.name : editingCategory?.name || ""}
                onChange={(e) => {
                  if (isCreating) {
                    setNewCategory({...newCategory, name: e.target.value});
                  } else if (editingCategory) {
                    setEditingCategory({...editingCategory, name: e.target.value});
                  }
                }}
                placeholder="Enter category name"
              />
            </div>
            <div>
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={isCreating ? newCategory.description : editingCategory?.description || ""}
                onChange={(e) => {
                  if (isCreating) {
                    setNewCategory({...newCategory, description: e.target.value});
                  } else if (editingCategory) {
                    setEditingCategory({...editingCategory, description: e.target.value});
                  }
                }}
                placeholder="Enter category description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fractional-quantities"
                checked={isCreating ? newCategory.allows_fractional_quantities : editingCategory?.allows_fractional_quantities || false}
                onCheckedChange={(checked) => {
                  if (isCreating) {
                    setNewCategory({...newCategory, allows_fractional_quantities: checked});
                  } else if (editingCategory) {
                    setEditingCategory({...editingCategory, allows_fractional_quantities: checked});
                  }
                }}
              />
              <Label htmlFor="fractional-quantities" className="text-sm font-medium">
                Allow Fractional Quantities (0.25 increments)
              </Label>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={isCreating ? handleCreateCategory : handleUpdateCategory} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? "Create" : "Update"} Category
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingCategory(null);
                  setNewCategory({ name: "", description: "", allows_fractional_quantities: false });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Categories ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No categories found. Create your first category!
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{category.name}</h4>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {category.allows_fractional_quantities && (
                          <Badge variant="outline" className="text-blue-600 bg-blue-50">
                            Fractional Qty
                          </Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
