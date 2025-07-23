
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, User, Phone, Calendar, Clock } from "lucide-react";

interface PickupDetailsEditSectionProps {
  formData: {
    pickup_location_address?: string;
    pickup_location_name?: string;
    pickup_contact_name?: string;
    pickup_contact_phone?: string;
    pickup_instructions?: string;
    pickup_date?: string;
    pickup_time?: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export function PickupDetailsEditSection({ formData, onInputChange }: PickupDetailsEditSectionProps) {
  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <MapPin className="w-5 h-5 text-purple-600" />
          Pickup Location Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pickup_location_address" className="text-gray-700 font-medium">
              Pickup Address
            </Label>
            <Input
              id="pickup_location_address"
              type="text"
              placeholder="Enter pickup address"
              value={formData.pickup_location_address || ''}
              onChange={(e) => onInputChange('pickup_location_address', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>

          <div>
            <Label htmlFor="pickup_location_name" className="text-gray-700 font-medium">
              Location Name
            </Label>
            <Input
              id="pickup_location_name"
              type="text"
              placeholder="e.g., ABC Warehouse"
              value={formData.pickup_location_name || ''}
              onChange={(e) => onInputChange('pickup_location_name', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>

          <div>
            <Label htmlFor="pickup_contact_name" className="text-gray-700 font-medium flex items-center gap-1">
              <User className="w-4 h-4" />
              Contact Person
            </Label>
            <Input
              id="pickup_contact_name"
              type="text"
              placeholder="Contact person name"
              value={formData.pickup_contact_name || ''}
              onChange={(e) => onInputChange('pickup_contact_name', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>

          <div>
            <Label htmlFor="pickup_contact_phone" className="text-gray-700 font-medium flex items-center gap-1">
              <Phone className="w-4 h-4" />
              Contact Phone
            </Label>
            <Input
              id="pickup_contact_phone"
              type="text"
              placeholder="Contact phone number"
              value={formData.pickup_contact_phone || ''}
              onChange={(e) => onInputChange('pickup_contact_phone', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>

          <div>
            <Label htmlFor="pickup_date" className="text-gray-700 font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Pickup Date
            </Label>
            <Input
              id="pickup_date"
              type="date"
              value={formData.pickup_date || ''}
              onChange={(e) => onInputChange('pickup_date', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>

          <div>
            <Label htmlFor="pickup_time" className="text-gray-700 font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Pickup Time
            </Label>
            <Input
              id="pickup_time"
              type="time"
              value={formData.pickup_time || ''}
              onChange={(e) => onInputChange('pickup_time', e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pickup_instructions" className="text-gray-700 font-medium">
            Pickup Instructions
          </Label>
          <Textarea
            id="pickup_instructions"
            placeholder="Any special instructions for pickup (loading dock, access codes, etc.)"
            value={formData.pickup_instructions || ''}
            onChange={(e) => onInputChange('pickup_instructions', e.target.value)}
            className="border-purple-200 focus:border-purple-400 focus:ring-purple-200 min-h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
