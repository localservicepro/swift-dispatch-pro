
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
import { ProductVariations } from "./ProductVariations";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  account_price?: number;
  trade_price?: number;
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

interface Variation {
  id: string;
  attributes: Record<string, string>;
  sku: string;
  stockQuantity: number;
  accountPrice: number;
  tradePrice: number;
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
    account_price: editingProduct?.account_price || editingProduct?.price || 0,
    trade_price: editingProduct?.trade_price || (editingProduct?.price ? editingProduct.price * 0.9 : 0),
    stock_quantity: editingProduct?.stock_quantity || 0,
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || "",
    weight: editingProduct?.weight || 0,
    dimensions: editingProduct?.dimensions || "",
    category_id: editingProduct?.category_id || "",
    images: editingProduct?.images || []
  });

  const [variations, setVariations] = useState<Variation[]>([]);

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
      price: formData.account_price, // Keep for backwards compatibility
      account_price: formData.account_price,
      trade_price: formData.trade_price,
      stock_quantity: formData.stock_quantity,
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      weight: formData.weight || null,
      dimensions: formData.dimensions.trim() || null,
      category_id: formData.category_id || null,
      images: formData.images
    };

    try {
      let productId = editingProduct?.id;

      if (isCreating) {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        productId = data.id;

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

      // Handle variations if any
      if (variations.length > 0 && productId) {
        // First, delete existing variants for this product
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId);

        // Insert new variants
        const variantData = variations.map(variation => ({
          product_id: productId,
          variant_name: Object.values(variation.attributes).join(' - '),
          sku: variation.sku,
          stock_quantity: variation.stockQuantity,
          account_price: variation.accountPrice,
          trade_price: variation.tradePrice,
          price_adjustment: 0, // Not used in simplified model
        }));

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error('Error saving variants:', variantError);
          toast({
            title: "Warning",
            description: "Product saved but there was an issue with variations",
            variant: "destructive",
          });
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
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
    <div className="space-y-6">
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
          </div>

          {/* Simplified Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountPrice">Account Price *</Label>
              <Input
                id="accountPrice"
                type="number"
                step="0.01"
                value={formData.account_price}
                onChange={(e) => updateFormData({ account_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="tradePrice">Trade Price *</Label>
              <Input
                id="tradePrice"
                type="number"
                step="0.01"
                value={formData.trade_price}
                onChange={(e) => updateFormData({ trade_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {/* Product Variations Section */}
      <ProductVariations
        variations={variations}
        onVariationsChange={setVariations}
      />
      
      <div className="flex gap-3">
        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
          {isCreating ? "Create" : "Update"} Product
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
