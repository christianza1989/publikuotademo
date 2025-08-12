import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const applySeoSchema = z.object({
    text: z.string().min(100),
    suggestions: z.array(z.string()).min(1),
    title: z.string(),
    metaDescription: z.string(),
    model: z.string(),
});

async function applySeoSuggestions(text: string, suggestions: string[], title: string, metaDescription: string, model: string) {
    const prompt = `
        Imagine you are a surgical code editor AI. Your task is to apply the following SEO suggestions to the provided HTML content, article title, meta title, and meta description.
        Instead of rewriting the entire article, you must identify the specific HTML snippets that need changing and provide the exact "search" and "replace" values for each change.
        This is crucial to preserve images and other HTML elements that should not be altered.

        Your response MUST be a JSON object with the following structure:
        {
          "modifications": [
            {
              "search": "<HTML snippet to find in the original text>",
              "replace": "<The new HTML snippet to replace it with>"
            }
          ],
          "regeneratedTitle": "<The new, improved article title, if changed>",
          "regeneratedMetaTitle": "<The new, improved meta title>",
          "regeneratedMetaDescription": "<The new, improved meta description>"
        }

        RULES:
        - For each suggestion, create one or more objects in the "modifications" array.
        - The "search" string must be an EXACT snippet from the original article text to ensure a correct match. Include surrounding HTML tags.
        - The "replace" string is the new version of that snippet with the suggestion applied.
        - If a suggestion is about the main article title, meta title, or description, update the "regeneratedTitle", "regeneratedMetaTitle", and "regeneratedMetaDescription" fields respectively. Do not create a "modifications" entry for them. If a title is not changed, return the original value.
        - CRITICAL RULE: The regeneratedMetaTitle MUST be under 60 characters.
        - CRITICAL RULE: The regeneratedMetaDescription MUST be under 160 characters.
        - You MUST prioritize adhering to these character limits above all other suggestions.
        - Ensure all HTML in the "replace" strings is valid.
        - Preserve all existing HTML tags and attributes (like \`<img>\`, \`src\`, \`alt\`, \`style\`) that are not directly part of the suggestion.

        SEO Suggestions:
        ---
        ${suggestions.join('\n- ')}
        ---

        Original Article Title: ${title}
        Original Meta Title: ${metaDescription}
        Original Meta Description: ${metaDescription}
        Original Article Text (HTML):
        ---
        ${text}
        ---
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.SITE_URL || '',
            "X-Title": process.env.SITE_NAME || '',
        },
        body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error("Failed to apply SEO suggestions from AI model.");
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = applySeoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { text, suggestions, title, metaDescription, model } = validation.data;
        const result = await applySeoSuggestions(text, suggestions, title, metaDescription, model);

        return NextResponse.json(result);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[APPLY_SEO_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
