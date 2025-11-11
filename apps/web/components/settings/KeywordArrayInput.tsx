import React, { useState } from 'react';

interface KeywordArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function KeywordArrayInput({
  label,
  value,
  onChange,
  placeholder = 'Add keyword...',
  helpText,
}: KeywordArrayInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim().toLowerCase();

    if (!trimmed) {
      setIsAdding(false);
      setInputValue('');
      return;
    }

    if (value.includes(trimmed)) {
      setError('Keyword already exists');
      return;
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setIsAdding(false);
    setError('');
  };

  const handleRemove = (keyword: string) => {
    onChange(value.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
      setError('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="flex flex-wrap gap-2">
        {value.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {keyword}
            <button
              type="button"
              onClick={() => handleRemove(keyword)}
              className="hover:bg-blue-200 rounded-full px-1"
              aria-label={`Remove ${keyword}`}
            >
              ×
            </button>
          </span>
        ))}

        {isAdding ? (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder={placeholder}
            className="px-3 py-1 border border-blue-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-full text-sm font-medium"
          >
            + Add
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
