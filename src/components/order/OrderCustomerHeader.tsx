import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Phone, AlertTriangle } from "lucide-react";
import { getCustomerTypeColors, getCustomerTypeLabel } from "@/utils/customerTypeColors";

interface OrderCustomerHeaderProps {
  customer: any;
  contact?: any;
  onChangeCustomer: () => void;
}

export function OrderCustomerHeader({ customer, contact, onChangeCustomer }: OrderCustomerHeaderProps) {
  const colors = getCustomerTypeColors(customer.customer_type);
  const typeLabel = getCustomerTypeLabel(customer.customer_type);
  
  const getDisplayName = () => {
    if (customer.company_name) {
      return customer.company_name;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const getContactInfo = () => {
    if (contact) {
      return {
        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        email: contact.email,
        phone: contact.phone
      };
    }
    return {
      name: null,
      email: customer.email,
      phone: customer.phone
    };
  };

  const contactInfo = getContactInfo();

  return (
    <Card className={`${colors.card} ${colors.border} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">{getDisplayName()}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {typeLabel}
                  </Badge>
                  {customer.stop_credit && (
                    <Badge variant="destructive" className="text-xs flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Stop Credit</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {contactInfo.name && contactInfo.name !== getDisplayName() && (
                <div className="flex items-center space-x-1">
                  <span className="font-medium">Contact:</span>
                  <span>{contactInfo.name}</span>
                </div>
              )}
              {contactInfo.email && (
                <div className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>{contactInfo.email}</span>
                </div>
              )}
              {contactInfo.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>{contactInfo.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={onChangeCustomer}>
            Change Customer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}