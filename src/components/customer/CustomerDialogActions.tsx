
import React from 'react';
import { Button } from '@/components/ui/button';

interface CustomerDialogActionsProps {
  onSave: () => void;
  onCancel: () => void;
}

export function CustomerDialogActions({ onSave, onCancel }: CustomerDialogActionsProps) {
  return (
    <div className="flex justify-end space-x-2 mt-6">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSave}>
        Save
      </Button>
    </div>
  );
}
