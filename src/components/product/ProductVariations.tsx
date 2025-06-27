import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Layers, DollarSign } from "lucide-react";

interface Attribute {
  name: string;
  values: string[];
}

interface Variation {
  id: string;
  attributes: Record<string, string>;
  sku: string;
  stockQuantity: number;
  tradePrice: number;
  accountPrice: number;
  useGlobalPricing: boolean;
}

interface ProductVariationsProps {
  variations: Variation[];
  onVariationsChange: (variations: Variation[]) => void;
}

export function ProductVariations({ variations, onVariationsChange }: ProductVariationsProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  const addAttribute = () => {
    if (!newAttributeName.trim()) return;
    
    const existingAttribute = attributes.find(attr => attr.name === newAttributeName);
    if (existingAttribute) {
      if (newAttributeValue.trim() && !existingAttribute.values.includes(newAttributeValue)) {
        setAttributes(prev => prev.map(attr => 
          attr.name === newAttributeName 
            ? { ...attr, values: [...attr.values, newAttributeValue] }
            : attr
        ));
      }
    } else {
      setAttributes(prev => [...prev, { 
        name: newAttributeName, 
        values: newAttributeValue.trim() ? [newAttributeValue] : [] 
      }]);
    }
    
    setNewAttributeValue("");
    if (!newAttributeValue.trim()) {
      setNewAttributeName("");
    }
    
    generateVariations([...attributes]);
  };

  const removeAttribute = (attributeName: string) => {
    const newAttributes = attributes.filter(attr => attr.name !== attributeName);
    setAttributes(newAttributes);
    generateVariations(newAttributes);
  };

  const removeAttributeValue = (attributeName: string, value: string) => {
    const newAttributes = attributes.map(attr => 
      attr.name === attributeName 
        ? { ...attr, values: attr.values.filter(v => v !== value) }
        : attr
    ).filter(attr => attr.values.length > 0);
    
    setAttributes(newAttributes);
    generateVariations(newAttributes);
  };

  const generateVariations = (currentAttributes: Attribute[]) => {
    if (currentAttributes.length === 0) {
      onVariationsChange([]);
      return;
    }

    const attributesWithValues = currentAttributes.filter(attr => attr.values.length > 0);
    if (attributesWithValues.length === 0) {
      onVariationsChange([]);
      return;
    }

    const combinations = cartesianProduct(attributesWithValues.map(attr => 
      attr.values.map(value => ({ [attr.name]: value }))
    ));

    const newVariations: Variation[] = combinations.map((combo, index) => {
      const attributes = Object.assign({}, ...combo);
      const existingVariation = variations.find(v => 
        Object.keys(attributes).every(key => v.attributes[key] === attributes[key])
      );

      return {
        id: existingVariation?.id || `var-${Date.now()}-${index}`,
        attributes,
        sku: existingVariation?.sku || `SKU-${Object.values(attributes).join('-')}`,
        stockQuantity: existingVariation?.stockQuantity || 0,
        tradePrice: existingVariation?.tradePrice || 0,
        accountPrice: existingVariation?.accountPrice || 0,
        useGlobalPricing: existingVariation?.useGlobalPricing ?? true,
      };
    });

    onVariationsChange(newVariations);
  };

  const cartesianProduct = (arrays: any[][]): any[][] => {
    return arrays.reduce((a, b) => 
      a.flatMap(x => b.map(y => [...x, y])), [[]]
    );
  };

  const updateVariation = (id: string, field: string, value: string | number | boolean) => {
    onVariationsChange(variations.map(variation => 
      variation.id === id 
        ? { ...variation, [field]: value }
        : variation
    ));
  };

  // Calculate global pricing based on pricing tiers
  const calculateGlobalPrices = (tradePrice: number) => {
    return {
      trade: tradePrice,
      account: tradePrice * 0.9 // 10% discount for account tier
    };
  };

  const calculateDiscountPercentage = (tradePrice: number, accountPrice: number) => {
    if (tradePrice === 0) return 0;
    return ((tradePrice - accountPrice) / tradePrice * 100);
  };

  const applyGlobalPricingToVariation = (variation: Variation) => {
    if (variation.tradePrice > 0) {
      const globalPrices = calculateGlobalPrices(variation.tradePrice);
      updateVariation(variation.id, 'accountPrice', globalPrices.account);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Product Variations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Attributes Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Add Attributes</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Attribute name (e.g., Size, Color)"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
            />
            <Input
              placeholder="Value (e.g., Small, Red)"
              value={newAttributeValue}
              onChange={(e) => setNewAttributeValue(e.target.value)}
            />
            <Button onClick={addAttribute} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Display Current Attributes */}
        {attributes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Current Attributes</h4>
            {attributes.map(attribute => (
              <div key={attribute.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{attribute.name}</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeAttribute(attribute.name)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {attribute.values.map(value => (
                    <Badge key={value} variant="secondary" className="flex items-center gap-1">
                      {value}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeAttributeValue(attribute.name, value)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generated Variations */}
        {variations.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Generated Variations ({variations.length})</h4>
            <div className="space-y-4">
              {variations.map(variation => {
                const globalPrices = calculateGlobalPrices(variation.tradePrice);
                const discountPercentage = calculateDiscountPercentage(variation.tradePrice, variation.accountPrice);
                
                return (
                  <div key={variation.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {Object.entries(variation.attributes).map(([key, value]) => (
                        <Badge key={`${key}-${value}`} variant="outline">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>SKU</Label>
                        <Input
                          value={variation.sku}
                          onChange={(e) => updateVariation(variation.id, 'sku', e.target.value)}
                          placeholder="SKU"
                        />
                      </div>
                      <div>
                        <Label>Stock Quantity</Label>
                        <Input
                          type="number"
                          value={variation.stockQuantity}
                          onChange={(e) => updateVariation(variation.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                          placeholder="0 (optional)"
                        />
                      </div>
                    </div>

                    {/* Pricing Mode Toggle */}
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Switch
                        id={`global-pricing-${variation.id}`}
                        checked={variation.useGlobalPricing}
                        onCheckedChange={(checked) => {
                          updateVariation(variation.id, 'useGlobalPricing', checked);
                          if (checked) {
                            applyGlobalPricingToVariation(variation);
                          }
                        }}
                      />
                      <Label htmlFor={`global-pricing-${variation.id}`} className="text-sm">
                        Use Global Pricing Rules (Account = Trade - 10%)
                      </Label>
                    </div>

                    {/* Individual Pricing Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-blue-600">
                          <DollarSign className="w-4 h-4" />
                          Trade Price (Regular Customers)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variation.tradePrice}
                          onChange={(e) => {
                            const newTradePrice = parseFloat(e.target.value) || 0;
                            updateVariation(variation.id, 'tradePrice', newTradePrice);
                            if (variation.useGlobalPricing && newTradePrice > 0) {
                              updateVariation(variation.id, 'accountPrice', newTradePrice * 0.9);
                            }
                          }}
                          placeholder="0.00"
                          className="border-blue-200"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-4 h-4" />
                          Account Price (VIP Customers)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variation.accountPrice}
                          onChange={(e) => updateVariation(variation.id, 'accountPrice', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          disabled={variation.useGlobalPricing}
                          className={variation.useGlobalPricing ? "bg-gray-100" : "border-green-200"}
                        />
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    {variation.tradePrice > 0 && variation.accountPrice > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-blue-800">Pricing Summary</h5>
                          {variation.useGlobalPricing && (
                            <Badge variant="secondary" className="text-xs">Global Rules Applied</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600">Trade Price</p>
                            <p className="font-semibold text-blue-600">${variation.tradePrice.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Account Price</p>
                            <p className="font-semibold text-green-600">${variation.accountPrice.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Discount</p>
                            <p className="font-semibold text-orange-600">{discountPercentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        {!variation.useGlobalPricing && variation.accountPrice > variation.tradePrice && (
                          <div className="mt-2 text-xs text-red-600">
                            ⚠️ Account price is higher than Trade price
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
