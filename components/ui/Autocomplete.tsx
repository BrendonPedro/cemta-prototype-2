// components/ui/Autocomplete.tsx

import React from "react";
import { Input } from "./input";

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onInputChange: (inputValue: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  suggestions,
  onInputChange,
  isLoading = false,
  placeholder = "",
}) => {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => onChange(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
      {isLoading && <p className="mt-1 text-sm text-gray-500">Loading...</p>}
    </div>
  );
};

export default Autocomplete;
