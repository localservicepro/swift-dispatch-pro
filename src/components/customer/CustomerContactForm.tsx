
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
  customerType: "residential" | "trade" | "account";
  entityType: "individual" | "business";
  onFormDataChange: (updates: Partial<CustomerContactFormProps['formData']>) => void;
}

export function CustomerContactForm({ formData, customerType, entityType, onFormDataChange }: CustomerContactFormProps) {
  // Check if this is an Account Business entity where contact details are optional
  const isAccountBusiness = customerType === 'account' && entityType === 'business';
  
  const getContactLabel = () => {
    if (entityType === 'business') {
      return isAccountBusiness ? 'Primary Contact (Optional)' : 'Primary Contact';
    }
    return 'Contact Information';
  };
  
  const getContactDescription = () => {
    if (entityType === 'business') {
      if (isAccountBusiness) {
        return 'Primary contact person for this business (can be added later)';
      }
      return 'Primary contact person for this business';
    }
    if (customerType === 'residential') {
      return 'Homeowner information';
    }
    return 'Individual customer information';
  };
  
  const getRolePlaceholder = () => {
    if (entityType === 'business') {
      return 'e.g. Manager, Owner, Admin';
    }
    if (customerType === 'residential') {
      return 'e.g. Owner, Tenant';
    }
    return 'e.g. Owner, Director';
  };
  
  const getFieldLabel = (baseLabel: string) => {
    return isAccountBusiness ? baseLabel : `${baseLabel} *`;
  };
  
  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{getContactLabel()}</h3>
        <p className="text-sm text-gray-600">{getContactDescription()}</p>
        {isAccountBusiness && (
          <p className="text-xs text-blue-600 mt-1">
            For business accounts, contact details are optional and can be added later
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">{getFieldLabel('First Name')}</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onFormDataChange({ first_name: e.target.value })}
            required={!isAccountBusiness}
          />
        </div>
        <div>
          <Label htmlFor="last_name">{getFieldLabel('Last Name')}</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onFormDataChange({ last_name: e.target.value })}
            required={!isAccountBusiness}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">{getFieldLabel('Email')}</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => onFormDataChange({ email: e.target.value })}
          required={!isAccountBusiness}
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
        <Label htmlFor="contact_role">Role</Label>
        <Input
          id="contact_role"
          value={formData.contact_role}
          onChange={(e) => onFormDataChange({ contact_role: e.target.value })}
          placeholder={getRolePlaceholder()}
        />
      </div>
    </>
  );
}
