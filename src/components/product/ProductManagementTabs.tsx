
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManagement } from "../CategoryManagement";
import { SpecialManagement } from "../SpecialManagement";
import { ProductsTabContent } from "./ProductsTabContent";
import { WooCommerceSyncStatus } from "../woocommerce/WooCommerceSyncStatus";

export function ProductManagementTabs() {
  return (
    <Tabs defaultValue="products" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="specials">Specials</TabsTrigger>
        <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
      </TabsList>

      <TabsContent value="products">
        <ProductsTabContent />
      </TabsContent>

      <TabsContent value="categories">
        <CategoryManagement />
      </TabsContent>

      <TabsContent value="specials">
        <SpecialManagement />
      </TabsContent>

      <TabsContent value="woocommerce">
        <WooCommerceSyncStatus />
      </TabsContent>
    </Tabs>
  );
}
