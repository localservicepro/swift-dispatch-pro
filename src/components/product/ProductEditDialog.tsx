
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProductForm } from "./ProductForm";

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
  product_type?: string;
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

interface ProductEditDialogProps {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductEditDialog({ product, categories, onClose, onSuccess }: ProductEditDialogProps) {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ProductForm
          isCreating={false}
          editingProduct={product}
          categories={categories}
          onClose={onClose}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
