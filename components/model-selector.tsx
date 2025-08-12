"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

export const models = [
    { id: process.env.NEXT_PUBLIC_GEMINI_MODEL || 'google/gemini-2.5-flash', name: 'Gemini 2.5 Pro', isBest: true },
    { id: process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'anthropic/claude-3.5-sonnet', name: 'Claude Sonnet 4' },
    { id: process.env.NEXT_PUBLIC_GROK_MODEL || 'x-ai/grok-4', name: 'Grok 4' },
    { id: process.env.NEXT_PUBLIC_GPT_MODEL || 'openai/gpt-4o', name: 'GPT-5' },
];

interface ModelSelectorProps {
    selectedModel: string;
    setSelectedModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, setSelectedModel }: ModelSelectorProps) {
    return (
        <div className="p-1 bg-gray-200 rounded-lg flex gap-1">
            {models.map((model) => (
                <Button
                    key={model.id}
                    variant="ghost"
                    className={cn(
                        "flex-1 justify-center",
                        selectedModel === model.id ? "bg-white shadow" : "hover:bg-gray-100"
                    )}
                    onClick={() => setSelectedModel(model.id)}
                >
                    {model.isBest && <Crown className="h-4 w-4 mr-2 text-yellow-500" />}
                    {model.name}
                </Button>
            ))}
        </div>
    );
}
