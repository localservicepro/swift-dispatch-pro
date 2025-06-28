
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerContactFormProps {
  formData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    contact_role: string;
  };
  customerType: "trade" | "account";
  onFormDataChange: (updates: Partial<CustomerContactFormProps['formData']>) => void;
}

export function CustomerContactForm({ formData, customerType, onFormDataChange }: CustomerContactFormProps) {
  const contactLabel = customerType === 'account' ? 'Primary Contact' : 'Contact Information';
  const roleLabel = customerType === 'account' ? 'Contact Role' : 'Role';
  
  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{contactLabel}</h3>
        <p className="text-sm text-gray-600">
          {customerType === 'account' 
            ? 'Primary contact person for this business' 
            : 'Individual customer information'
          }
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onFormDataChange({ first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onFormDataChange({ last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onFormDataChange({ email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => onFormDataChange({ phone: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="contact_role">{roleLabel}</Label>
        <Input
          id="contact_role"
          value={formData.contact_role}
          onChange={(e) => onFormDataChange({ contact_role: e.target.value })}
          placeholder={customerType === 'account' ? 'e.g. Manager, Owner, Admin' : 'e.g. Owner, Director'}
        />
      </div>
    </>
  );
}
