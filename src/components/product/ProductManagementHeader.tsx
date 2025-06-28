import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
interface ProductManagementHeaderProps {
  onCreateProduct: () => void;
}
export function ProductManagementHeader({
  onCreateProduct
}: ProductManagementHeaderProps) {
  return <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-slate-800 text-lg">Product Management</h3>
        <p className="text-slate-600">Manage your product inventory with simplified pricing</p>
      </div>
      <Button onClick={onCreateProduct} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />
        Add Product
      </Button>
    </div>;
}