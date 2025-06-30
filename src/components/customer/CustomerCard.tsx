
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCustomerDisplayName } from "@/components/order/services/orderFormattingService";
import { MapPin, Bell, BellOff, Building2, User, Home, Wrench, Eye, Edit, Trash2 } from "lucide-react";

interface CustomerCardProps {
  customer: any;
  onViewOrders: (customer: any) => void;
  onEditCustomer: (customer: any) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export function CustomerCard({ customer, onViewOrders, onEditCustomer, onDeleteCustomer }: CustomerCardProps) {
  const getCustomerSubtitle = (customer: any) => {
    if (customer.entity_type === 'business' && customer.company_name) {
      if (customer.first_name && customer.last_name) {
        return `Contact: ${customer.first_name} ${customer.last_name}`;
      }
      return customer.email || 'No contact details';
    }
    return customer.email || 'No email provided';
  };

  const getCustomerTypeIcon = (customerType: string) => {
    switch (customerType) {
      case 'residential':
        return <Home className="w-5 h-5 text-green-600" />;
      case 'trade':
        return <Wrench className="w-5 h-5 text-orange-600" />;
      case 'account':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCustomerTypeColor = (customerType: string) => {
    switch (customerType) {
      case 'residential':
        return 'bg-green-100 text-green-800';
      case 'trade':
        return 'bg-orange-100 text-orange-800';
      case 'account':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'individual':
        return 'bg-blue-100 text-blue-800';
      case 'business':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getCustomerTypeIcon(customer.customer_type)}
            <h3 className="font-semibold text-lg">
              {getCustomerDisplayName(customer)}
            </h3>
            <Badge className={getCustomerTypeColor(customer.customer_type)}>
              {customer.customer_type}
            </Badge>
            <Badge className={getEntityTypeColor(customer.entity_type)}>
              {customer.entity_type}
            </Badge>
            {!customer.is_active && (
              <Badge variant="destructive">Inactive</Badge>
            )}
            {customer.sms_notifications_enabled ? (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200 bg-green-50">
                <Bell className="w-3 h-3" />
                <span>Notifications On</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-200 bg-amber-50">
                <BellOff className="w-3 h-3" />
                <span>Notifications Off</span>
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <p>{getCustomerSubtitle(customer)}</p>
            {customer.entity_type === 'business' && customer.business_name && (
              <p>Trading as: {customer.business_name}</p>
            )}
            {customer.phone && <p>Phone: {customer.phone}</p>}
            {customer.contact_role && <p>Role: {customer.contact_role}</p>}
            <p>Address: {customer.full_address}</p>
            {customer.suburbs && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {customer.suburbs.name}, {customer.suburbs.state} {customer.suburbs.postcode}
                  {customer.suburbs.delivery_rate && customer.suburbs.delivery_rate !== "0" && (
                    <span className="ml-2 text-green-600 font-medium">
                      (Delivery: ${customer.suburbs.delivery_rate})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewOrders(customer)}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Orders
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditCustomer(customer)}
            className="flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteCustomer(customer.id)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
