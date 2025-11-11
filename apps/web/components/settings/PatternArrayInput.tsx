import React, { useState } from 'react';

interface PatternArrayInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function PatternArrayInput({
  label,
  value,
  onChange,
  placeholder = 'Add pattern...',
  helpText,
}: PatternArrayInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim(); // Preserve case for patterns

    if (!trimmed) {
      setIsAdding(false);
      setInputValue('');
      return;
    }

    if (value.includes(trimmed)) {
      setError('Pattern already exists');
      return;
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setIsAdding(false);
    setError('');
  };

  const handleRemove = (pattern: string) => {
    onChange(value.filter((p) => p !== pattern));
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
        {value.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-mono"
          >
            {pattern}
            <button
              type="button"
              onClick={() => handleRemove(pattern)}
              className="hover:bg-purple-200 rounded-full px-1"
              aria-label={`Remove ${pattern}`}
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
            className="px-3 py-1 border border-purple-300 rounded-full text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-full text-sm font-medium"
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
