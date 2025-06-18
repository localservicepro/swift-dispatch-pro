
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerPersonalInfoFormProps {
  formData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  onFormDataChange: (updates: Partial<CustomerPersonalInfoFormProps['formData']>) => void;
}

export function CustomerPersonalInfoForm({ formData, onFormDataChange }: CustomerPersonalInfoFormProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => onFormDataChange({ first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => onFormDataChange({ last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
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
    </>
  );
}
