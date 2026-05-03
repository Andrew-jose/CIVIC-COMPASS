import { useState, useRef, useEffect } from 'react';

interface JurisdictionInputProps {
  value: string;
  onChange: (value: string) => void;
  onResolve: (address: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * JurisdictionInput — Typeahead address input with autocomplete suggestions.
 * In production: integrates with Google Maps Grounding or Google Places API.
 * Currently provides sample suggestions for demo purposes.
 */
export function JurisdictionInput({
  value,
  onChange,
  onResolve,
  isLoading = false,
  className = '',
}: JurisdictionInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Demo suggestions — replaced by Google Places Autocomplete in production
  const SAMPLE_ADDRESSES = [
    '1600 Pennsylvania Avenue NW, Washington, DC 20500',
    '100 Congress Avenue, Austin, TX 78701',
    '200 N Spring St, Los Angeles, CA 90012',
    '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102',
    '141 W Jackson Blvd, Chicago, IL 60604',
    '250 Broadway, New York, NY 10007',
    '301 W 2nd St, Miami, FL 33130',
    '400 S Orange Ave, Orlando, FL 32801',
  ];

  useEffect(() => {
    if (value.length > 2) {
      const filtered = SAMPLE_ADDRESSES.filter(a =>
        a.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (address: string) => {
    onChange(address);
    setShowSuggestions(false);
    onResolve(address);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <label htmlFor="jurisdiction-input" className="sr-only">
        Enter your address
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg" aria-hidden="true">📍</span>
        <input
          ref={inputRef}
          id="jurisdiction-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              setShowSuggestions(false);
              onResolve(value);
            }
          }}
          placeholder="Enter your address to find your jurisdiction..."
          className="w-full rounded-xl border border-border-default bg-surface-secondary pl-10 pr-4 py-3 text-text-primary placeholder:text-text-muted outline-none focus:border-civic-blue transition-colors text-sm"
          disabled={isLoading}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="jurisdiction-suggestions"
          aria-autocomplete="list"
          aria-label="Enter your home address for personalized election information"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-civic-blue" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        )}
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && (
        <ul
          id="jurisdiction-suggestions"
          className="absolute z-50 w-full mt-1 rounded-xl border border-border-default bg-surface-secondary shadow-xl overflow-hidden"
          role="listbox"
        >
          {suggestions.map((suggestion, i) => (
            <li key={i} role="option">
              <button
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors flex items-center gap-2"
              >
                <span className="text-text-muted text-xs">📍</span>
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
