"use client";

import { useState } from "react";
import { Combobox as HeadlessCombobox } from "@headlessui/react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onInputChange: (input: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const Combobox: React.FC<ComboboxProps> = ({
  value,
  onChange,
  suggestions,
  onInputChange,
  isLoading = false,
  placeholder = "",
}) => {
  const [query, setQuery] = useState("");

  const filteredSuggestions =
    query === ""
      ? suggestions
      : suggestions.filter((suggestion) =>
          suggestion
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        );

  return (
    <HeadlessCombobox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <HeadlessCombobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(item: string) => item}
            onChange={(event) => {
              setQuery(event.target.value);
              onInputChange(event.target.value);
            }}
            placeholder={placeholder}
          />
          <HeadlessCombobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </HeadlessCombobox.Button>
        </div>
        <HeadlessCombobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredSuggestions.length === 0 && query !== "" ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              Nothing found.
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <HeadlessCombobox.Option
                key={suggestion}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-teal-600 text-white" : "text-gray-900"
                  }`
                }
                value={suggestion}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {suggestion}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-teal-600"
                        }`}
                      >
                        <svg
                          className="h-5 w-5"
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </>
                )}
              </HeadlessCombobox.Option>
            ))
          )}
        </HeadlessCombobox.Options>
      </div>
      {isLoading && (
        <div className="absolute inset-y-0 right-10 flex items-center pr-3">
          <svg
            className="animate-spin h-5 w-5 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      )}
    </HeadlessCombobox>
  );
};

export default Combobox;
