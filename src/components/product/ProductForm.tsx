
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageUpload } from "@/components/ProductImageUpload";

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

interface ProductFormProps {
  isCreating: boolean;
  editingProduct: Product | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductForm({ isCreating, editingProduct, categories, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: editingProduct?.name || "",
    description: editingProduct?.description || "",
    price: editingProduct?.price || 0,
    stock_quantity: editingProduct?.stock_quantity || 0,
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || "",
    weight: editingProduct?.weight || 0,
    dimensions: editingProduct?.dimensions || "",
    category_id: editingProduct?.category_id || "",
    images: editingProduct?.images || []
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: formData.price,
      stock_quantity: formData.stock_quantity,
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      weight: formData.weight || null,
      dimensions: formData.dimensions.trim() || null,
      category_id: formData.category_id || null,
      images: formData.images
    };

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product created successfully!",
        });
      } else if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully!",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isCreating ? 'create' : 'update'} product`,
        variant: "destructive",
      });
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
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
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="Enter product name"
            />
          </div>
          <div>
            <Label htmlFor="productPrice">Price *</Label>
            <Input
              id="productPrice"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="productStock">Stock Quantity *</Label>
            <Input
              id="productStock"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => updateFormData({ stock_quantity: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="productCategory">Category</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => updateFormData({ category_id: value })}
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
              value={formData.sku}
              onChange={(e) => updateFormData({ sku: e.target.value })}
              placeholder="Product SKU"
            />
          </div>
          <div>
            <Label htmlFor="productBarcode">Barcode</Label>
            <Input
              id="productBarcode"
              value={formData.barcode}
              onChange={(e) => updateFormData({ barcode: e.target.value })}
              placeholder="Product barcode"
            />
          </div>
          <div>
            <Label htmlFor="productWeight">Weight (kg)</Label>
            <Input
              id="productWeight"
              type="number"
              step="0.01"
              value={formData.weight}
              onChange={(e) => updateFormData({ weight: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="productDimensions">Dimensions</Label>
            <Input
              id="productDimensions"
              value={formData.dimensions}
              onChange={(e) => updateFormData({ dimensions: e.target.value })}
              placeholder="L x W x H"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="productDescription">Description</Label>
          <Textarea
            id="productDescription"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            placeholder="Enter product description"
            rows={3}
          />
        </div>

        <div>
          <Label>Product Images</Label>
          <ProductImageUpload
            images={formData.images}
            onImagesChange={(images) => updateFormData({ images })}
          />
        </div>
        
        <div className="flex gap-3">
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            {isCreating ? "Create" : "Update"} Product
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
