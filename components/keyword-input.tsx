"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
            }
            setInputValue('');
        }
    };

    const removeKeyword = (keywordToRemove: string) => {
        onChange(value.filter(keyword => keyword !== keywordToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    placeholder="Įveskite raktinį žodį ir spauskite Enter"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <Button type="button" onClick={onGenerate} disabled={isLoading}>
                    {isLoading ? "Generuojama..." : "Generuoti Raktinius Žodžius"}
                </Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {value.map((keyword) => (
                    <div key={keyword} className="flex items-center gap-1 bg-gray-200 text-gray-800 text-sm font-medium px-2 py-1 rounded-md">
                        {keyword}
                        <button type="button" onClick={() => removeKeyword(keyword)} className="ml-1">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
