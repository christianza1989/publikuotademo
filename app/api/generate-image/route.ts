import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const imageSchema = z.object({
    prompt: z.string().min(3, { message: "Promptas per trumpas" }).max(400),
    model: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = imageSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { prompt: lithuanianTitle, model } = validation.data;

        // Step 1: Generate an English prompt from the Lithuanian title using an AI model via OpenRouter
        const promptForEnglish = `Translate the following Lithuanian article title into a short, clear, descriptive English prompt for an image generation AI. The prompt must be no more than 15 words. Title: "${lithuanianTitle}"`;
        
        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.SITE_URL || '',
                "X-Title": process.env.SITE_NAME || '',
            },
            body: JSON.stringify({
                "model": model,
                "messages": [
                    { "role": "user", "content": promptForEnglish }
                ]
            })
        });

        if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json();
            throw new Error(errorData.error.message || "OpenRouter API failed for prompt generation.");
        }

        const openRouterData = await openRouterResponse.json();
        const englishPrompt = openRouterData.choices[0].message.content.trim();

        // Step 2: Use the generated English prompt to generate an image with Ideogram
        const formData = new FormData();
        formData.append('prompt', englishPrompt);
        formData.append('aspect_ratio', '16x9');
        formData.append('style_type', 'REALISTIC');
        formData.append('negative_prompt', 'text, words, letters, typography, signs, logos');

        const ideogramResponse = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
            method: 'POST',
            headers: { 'Api-Key': process.env.IDEOGRAM_API_KEY as string },
            body: formData
        });

        if (!ideogramResponse.ok) {
            const errorData = await ideogramResponse.json();
            const errorMessage = errorData.detail || errorData.error || `Ideogram API failed with status: ${ideogramResponse.status}`;
            console.error('Ideogram API Error:', errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: ideogramResponse.status });
        }

        const ideogramData = await ideogramResponse.json();
        const imageUrl = ideogramData?.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("Failed to extract image URL from Ideogram response.");
        }

        return NextResponse.json({ imageUrl });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[IMAGE_GEN_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage || "Vidinė serverio klaida generuojant paveikslėlį." }, { status: 500 });
    }
}
