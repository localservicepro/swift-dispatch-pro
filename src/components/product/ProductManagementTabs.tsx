
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManagement } from "../CategoryManagement";
import { SpecialManagement } from "../SpecialManagement";
import { ProductsTabContent } from "./ProductsTabContent";

export function ProductManagementTabs() {
  return (
    <Tabs defaultValue="products" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="specials">Specials</TabsTrigger>
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
    </Tabs>
  );
}
