
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerCompanyFormProps {
  formData: {
    company_name: string;
    business_name: string;
    customer_type: "trade" | "account";
  };
  onFormDataChange: (updates: Partial<CustomerCompanyFormProps['formData']>) => void;
}

export function CustomerCompanyForm({ formData, onFormDataChange }: CustomerCompanyFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="customer_type">Customer Type</Label>
        <Select 
          value={formData.customer_type} 
          onValueChange={(value: "trade" | "account") => onFormDataChange({ customer_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trade">Trade (Individual)</SelectItem>
            <SelectItem value="account">Account (Business)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.customer_type === 'account' && (
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
    </>
  );
}
