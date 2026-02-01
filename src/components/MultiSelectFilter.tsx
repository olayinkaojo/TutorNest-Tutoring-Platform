import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, ChevronDown, X } from 'lucide-react';

interface MultiSelectFilterProps {
  options: { value: string | number; label: string }[];
  selectedValues: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder: string;
  allLabel?: string;
  className?: string;
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onChange,
  placeholder,
  allLabel = 'All',
  className = ''
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleValue = (value: string | number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const selectAll = () => {
    onChange(options.map(opt => opt.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const isAllSelected = selectedValues.length === options.length;
  const displayText = selectedValues.length === 0 
    ? allLabel
    : selectedValues.length === options.length
    ? allLabel
    : `${selectedValues.length} selected`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 text-sm justify-between min-w-[140px]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border rounded-lg shadow-lg min-w-[200px] max-h-[320px] overflow-hidden flex flex-col">
          {/* Header with quick actions */}
          <div className="p-2 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">{placeholder}</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-6 px-2 text-xs"
                disabled={isAllSelected}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-xs"
                disabled={selectedValues.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-[260px]">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleValue(option.value)}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-purple-50' : ''
                  }`}
                >
                  <span className={isSelected ? 'font-medium text-purple-900' : 'text-gray-700'}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4" style={{ color: '#625d9c' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected count footer */}
          {selectedValues.length > 0 && selectedValues.length < options.length && (
            <div className="p-2 border-t bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {selectedValues.length} of {options.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-xs hover:text-red-600"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component to show selected values as badges
export function SelectedFilterBadges({
  options,
  selectedValues,
  onRemove,
  onClearAll
}: {
  options: { value: string | number; label: string }[];
  selectedValues: (string | number)[];
  onRemove: (value: string | number) => void;
  onClearAll: () => void;
}) {
  if (selectedValues.length === 0 || selectedValues.length === options.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedValues.map(value => {
        const option = options.find(opt => opt.value === value);
        if (!option) return null;
        
        return (
          <Badge
            key={value}
            variant="secondary"
            className="gap-1 pr-1 cursor-pointer hover:bg-gray-300"
            onClick={() => onRemove(value)}
          >
            {option.label}
            <X className="w-3 h-3" />
          </Badge>
        );
      })}
      {selectedValues.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-gray-600 hover:text-red-600"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
