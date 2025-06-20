
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

export function ProductVariationManager() {
  return (
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
  );
}
