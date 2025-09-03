import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ManualCreditDialogProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (creditData: {
    customerId: string;
    amount: number;
    description: string;
    expires_at: string | null;
  }) => void;
}

export function ManualCreditDialog({ customerId, isOpen, onClose, onSave }: ManualCreditDialogProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    expires_at: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    if (!formData.description.trim()) {
      alert('Description is required for manual credits');
      return;
    }

    onSave({
      customerId,
      amount: formData.amount,
      description: formData.description,
      expires_at: formData.expires_at || null
    });

    // Reset form
    setFormData({
      amount: 0,
      description: '',
      expires_at: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Manual Credit</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (AUD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Reason for manual credit (e.g., Promotional credit, Adjustment, etc.)"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
            <Input
              id="expires_at"
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty for credits that never expire
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Credit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}