
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AddTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
  defaultRole: 'admin' | 'driver';
}

export function AddTeamMemberDialog({ 
  isOpen, 
  onClose, 
  onMemberAdded, 
  defaultRole 
}: AddTeamMemberDialogProps) {
  const [creating, setCreating] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: defaultRole
  });
  const { toast } = useToast();

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password || !newMember.full_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      console.log('Creating new team member:', { 
        email: newMember.email, 
        role: newMember.role, 
        full_name: newMember.full_name 
      });

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newMember.email,
          password: newMember.password,
          full_name: newMember.full_name,
          phone: newMember.phone,
          role: newMember.role
        }
      });

      console.log('Create user response:', { data, error });

      if (error) throw error;
      if (!data.success) {
        throw new Error(data.error || 'Failed to create team member');
      }

      setNewMember({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: defaultRole
      });

      setTimeout(async () => {
        console.log('Force refreshing profiles after user creation...');
        onMemberAdded();
      }, 2000);

      toast({
        title: "Success",
        description: data.message || `${newMember.role === 'driver' ? 'Driver' : 'Admin'} added successfully!`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error creating team member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-indigo-800">Add New Team Member</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="memberEmail">Email *</Label>
              <Input
                id="memberEmail"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter email address"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="memberPassword">Password *</Label>
              <Input
                id="memberPassword"
                type="password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                placeholder="Enter password"
                disabled={creating}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="memberFullName">Full Name *</Label>
              <Input
                id="memberFullName"
                value={newMember.full_name}
                onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                placeholder="Enter full name"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="memberPhone">Phone Number</Label>
              <Input
                id="memberPhone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="Enter phone number"
                disabled={creating}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="memberRole">Role *</Label>
            <Select 
              value={newMember.role} 
              onValueChange={(value: 'admin' | 'driver') => setNewMember({ ...newMember, role: value })}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleAddMember} 
              className="bg-indigo-600 hover:bg-indigo-700" 
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Add Team Member'
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
