
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerCompanyFormProps {
  formData: {
    company_name: string;
    business_name: string;
    customer_type: "residential" | "trade" | "account";
    entity_type: "individual" | "business";
    account_number?: string;
  };
  onFormDataChange: (updates: Partial<CustomerCompanyFormProps['formData']>) => void;
  isEdit?: boolean;
}

export function CustomerCompanyForm({ formData, onFormDataChange }: CustomerCompanyFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="customer_type">Customer Type</Label>
        <Select 
          value={formData.customer_type} 
          onValueChange={(value: "residential" | "trade" | "account") => onFormDataChange({ customer_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="residential">Residential (Homeowners)</SelectItem>
            <SelectItem value="trade">Trade (Professionals)</SelectItem>
            <SelectItem value="account">Account (Volume/Credit)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="entity_type">Entity Type</Label>
        <Select 
          value={formData.entity_type} 
          onValueChange={(value: "individual" | "business") => onFormDataChange({ entity_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="business">Business/Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.entity_type === 'business' && (
        <>
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => onFormDataChange({ company_name: e.target.value })}
              placeholder="Enter company name"
              required
            />
          </div>

          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => onFormDataChange({ business_name: e.target.value })}
              placeholder="Trading name or DBA name"
            />
          </div>
        </>
      )}

      {formData.entity_type === 'individual' && formData.customer_type !== 'residential' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Individual {formData.customer_type === 'trade' ? 'Trade' : 'Account'} Customer</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {formData.customer_type === 'trade' 
              ? 'Individual tradesperson or contractor working independently'
              : 'Individual customer with account privileges'
            }
          </p>
        </div>
      )}
    </>
  );
}
