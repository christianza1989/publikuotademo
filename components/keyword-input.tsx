"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface KeywordInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function KeywordInput({ value, onChange, onGenerate, isLoading }: KeywordInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
        setInputValue('');
      }
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    onChange(value.filter(keyword => keyword !== keywordToRemove));
  };

  const clearKeywords = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Įveskite raktinį žodį ir spauskite Enter"
        />
        <Button type="button" onClick={onGenerate} disabled={isLoading}>
          {isLoading ? "Generuojama..." : "Generuoti Raktinius Žodžius"}
        </Button>
        <Button type="button" variant="outline" onClick={clearKeywords} disabled={value.length === 0}>
          Išvalyti
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((keyword, index) => (
          <div key={index} className="flex items-center gap-1 bg-gray-200 rounded-full px-3 py-1 text-sm">
            {keyword}
            <button type="button" onClick={() => removeKeyword(keyword)} className="text-gray-500 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
