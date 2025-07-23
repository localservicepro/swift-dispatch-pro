import React from 'react';

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  // Temporary simplified component to resolve build errors
  // This needs to be properly implemented with the actual step components
  
  return (
    <div className="space-y-6">
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Multi-Step Order Form</h2>
        <p className="text-gray-600 mb-6">
          This component needs to be properly implemented with the step components.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={onOrderCreated}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Order (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}