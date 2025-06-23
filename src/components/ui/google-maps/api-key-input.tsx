
import React, { useState } from 'react';
import { Input } from '../input';
import { Button } from '../button';
import { AlertCircle } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySubmit: (key: string) => void;
}

export function ApiKeyInput({ onApiKeySubmit }: ApiKeyInputProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleSubmit = () => {
    if (apiKeyInput.trim()) {
      console.log('Setting temporary API key');
      localStorage.setItem('temp_google_maps_api_key', apiKeyInput.trim());
      setApiKeyInput('');
      onApiKeySubmit(apiKeyInput.trim());
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h4 className="font-medium text-red-900">Google Maps API Key Required</h4>
      </div>
      <p className="text-sm text-red-700 mb-3">
        The Google Maps functionality requires a valid API key. You can enter it temporarily here, 
        or update the code with your actual key.
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Enter your Google Maps API key..."
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={!apiKeyInput.trim()}>
          Set Key
        </Button>
      </div>
      <div className="text-xs text-red-600 space-y-1">
        <p>• Get your API key from the Google Cloud Console</p>
        <p>• Enable Maps JavaScript API, Places API, and Geocoding API</p>
        <p>• Add your domain to authorized origins</p>
        <p>• Make sure billing is enabled for your Google Cloud project</p>
      </div>
    </div>
  );
}
