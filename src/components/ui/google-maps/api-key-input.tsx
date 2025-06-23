
import React, { useState } from 'react';
import { Input } from '../input';
import { Button } from '../button';

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
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 className="font-medium text-yellow-900 mb-2">Google Maps API Key Required</h4>
      <p className="text-sm text-yellow-700 mb-3">
        To use the map functionality, you need a valid Google Maps API key. 
        You can enter it temporarily here, or update the code with your actual key.
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
      <div className="text-xs text-yellow-600 space-y-1">
        <p>• Get your API key from the Google Cloud Console</p>
        <p>• Enable Maps JavaScript API, Places API, and Geocoding API</p>
        <p>• Add your domain to authorized origins</p>
      </div>
    </div>
  );
}
