
import React from 'react';

interface AddressSuggestion {
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressSuggestionsProps {
  suggestions: AddressSuggestion[];
  onSuggestionSelect: (suggestion: AddressSuggestion) => void;
}

export function AddressSuggestions({ suggestions, onSuggestionSelect }: AddressSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.place_id}
          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
          onClick={() => onSuggestionSelect(suggestion)}
        >
          <div className="font-medium text-sm">
            {suggestion.structured_formatting.main_text}
          </div>
          <div className="text-xs text-gray-600">
            {suggestion.structured_formatting.secondary_text}
          </div>
        </div>
      ))}
    </div>
  );
}
