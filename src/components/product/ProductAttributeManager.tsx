
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useProductAttributes, useCreateProductAttribute, useCreateAttributeValue } from "@/hooks/useProductAttributes";
import { Plus, Edit, Trash2 } from "lucide-react";

export function ProductAttributeManager() {
  const { data: attributes = [], refetch } = useProductAttributes();
  const createAttribute = useCreateProductAttribute();
  const createAttributeValue = useCreateAttributeValue();
  const { toast } = useToast();

  const [newAttribute, setNewAttribute] = useState({
    name: "",
    display_name: "",
    attribute_type: "select" as const,
    is_required: false,
    sort_order: 0,
    is_active: true
  });

  const [newValue, setNewValue] = useState({
    attribute_id: "",
    value: "",
    display_value: "",
    hex_color: "",
    sort_order: 0,
    is_active: true
  });

  const [showCreateAttribute, setShowCreateAttribute] = useState(false);
  const [showCreateValue, setShowCreateValue] = useState(false);

  const handleCreateAttribute = async () => {
    if (!newAttribute.name || !newAttribute.display_name) {
      toast({
        title: "Error",
        description: "Name and display name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAttribute(newAttribute);
      toast({
        title: "Success",
        description: "Attribute created successfully!",
      });
      setNewAttribute({
        name: "",
        display_name: "",
        attribute_type: "select",
        is_required: false,
        sort_order: 0,
        is_active: true
      });
      setShowCreateAttribute(false);
      refetch();
    } catch (error) {
      console.error('Error creating attribute:', error);
      toast({
        title: "Error",
        description: "Failed to create attribute",
        variant: "destructive",
      });
    }
  };

  const handleCreateValue = async () => {
    if (!newValue.attribute_id || !newValue.value || !newValue.display_value) {
      toast({
        title: "Error",
        description: "Attribute, value, and display value are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAttributeValue(newValue);
      toast({
        title: "Success",
        description: "Attribute value created successfully!",
      });
      setNewValue({
        attribute_id: "",
        value: "",
        display_value: "",
        hex_color: "",
        sort_order: 0,
        is_active: true
      });
      setShowCreateValue(false);
      refetch();
    } catch (error) {
      console.error('Error creating attribute value:', error);
      toast({
        title: "Error",
        description: "Failed to create attribute value",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Product Attributes</h3>
          <p className="text-slate-600">Manage product variation attributes like size, color, etc.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateAttribute(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Attribute
          </Button>
          <Button onClick={() => setShowCreateValue(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Value
          </Button>
        </div>
      </div>

      {/* Create Attribute Form */}
      {showCreateAttribute && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-800">Create New Attribute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attributeName">Name (Internal)</Label>
                <Input
                  id="attributeName"
                  value={newAttribute.name}
                  onChange={(e) => setNewAttribute({...newAttribute, name: e.target.value})}
                  placeholder="e.g., size"
                />
              </div>
              <div>
                <Label htmlFor="attributeDisplayName">Display Name</Label>
                <Input
                  id="attributeDisplayName"
                  value={newAttribute.display_name}
                  onChange={(e) => setNewAttribute({...newAttribute, display_name: e.target.value})}
                  placeholder="e.g., Size"
                />
              </div>
              <div>
                <Label htmlFor="attributeType">Type</Label>
                <Select 
                  value={newAttribute.attribute_type} 
                  onValueChange={(value) => setNewAttribute({...newAttribute, attribute_type: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="color">Color</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateAttribute} className="bg-blue-600 hover:bg-blue-700">
                Create Attribute
              </Button>
              <Button variant="outline" onClick={() => setShowCreateAttribute(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Value Form */}
      {showCreateValue && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800">Add Attribute Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valueAttribute">Attribute</Label>
                <Select 
                  value={newValue.attribute_id} 
                  onValueChange={(value) => setNewValue({...newValue, attribute_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.map((attr) => (
                      <SelectItem key={attr.id} value={attr.id}>
                        {attr.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valueValue">Value</Label>
                <Input
                  id="valueValue"
                  value={newValue.value}
                  onChange={(e) => setNewValue({...newValue, value: e.target.value})}
                  placeholder="e.g., small"
                />
              </div>
              <div>
                <Label htmlFor="valueDisplayValue">Display Value</Label>
                <Input
                  id="valueDisplayValue"
                  value={newValue.display_value}
                  onChange={(e) => setNewValue({...newValue, display_value: e.target.value})}
                  placeholder="e.g., Small"
                />
              </div>
            </div>
            {attributes.find(a => a.id === newValue.attribute_id)?.attribute_type === 'color' && (
              <div>
                <Label htmlFor="valueColor">Color (Hex)</Label>
                <Input
                  id="valueColor"
                  type="color"
                  value={newValue.hex_color}
                  onChange={(e) => setNewValue({...newValue, hex_color: e.target.value})}
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleCreateValue} className="bg-green-600 hover:bg-green-700">
                Add Value
              </Button>
              <Button variant="outline" onClick={() => setShowCreateValue(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attributes List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          {attributes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No attributes created yet. Create your first attribute!</p>
          ) : (
            <div className="space-y-4">
              {attributes.map((attribute) => (
                <div key={attribute.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{attribute.display_name}</h4>
                      <p className="text-sm text-gray-600">Type: {attribute.attribute_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {attribute.values && attribute.values.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attribute.values.map((value) => (
                        <Badge key={value.id} variant="outline" className="flex items-center gap-1">
                          {value.hex_color && (
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: value.hex_color }}
                            />
                          )}
                          {value.display_value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
