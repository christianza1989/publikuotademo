import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const imageRequestSchema = z.object({
    heading: z.string(),
    context: z.string(),
});

const batchImageSchema = z.object({
    requests: z.array(imageRequestSchema),
    model: z.string(),
});

async function generateEnglishPrompt(lithuanianContext: string, model: string): Promise<string> {
    const promptForPrompt = `Analyze the following Lithuanian text block from an article. Create a short, clear, descriptive English prompt (max 25 words) for an image generation AI. The prompt should be crafted to generate a photorealistic, high-quality, cinematic image that visually represents the main idea of the text. The generated image MUST NOT contain any text, letters, or words.

    Lithuanian Text:
    ---
    ${lithuanianContext}
    ---`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.SITE_URL || '',
            "X-Title": process.env.SITE_NAME || '',
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: promptForPrompt }] })
    });
    if (!response.ok) throw new Error("Failed to generate English prompt.");
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

async function generateImageUrl(prompt: string): Promise<string> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('aspect_ratio', '16x9');
    formData.append('style_type', 'REALISTIC');
    formData.append('rendering_speed', 'QUALITY');
    formData.append('magic_prompt', 'ON');
    formData.append('negative_prompt', 'text, words, letters, typography, signs, logos');

    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
        method: 'POST',
        headers: { 'Api-Key': process.env.IDEOGRAM_API_KEY as string },
        body: formData
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ideogram API failed.");
    }
    const data = await response.json();
    return data?.data?.[0]?.url;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = batchImageSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { requests, model } = validation.data;
        const results = [];

        for (const request of requests) {
            try {
                const englishPrompt = await generateEnglishPrompt(request.context, model);
                const imageUrl = await generateImageUrl(englishPrompt);
                if (imageUrl) {
                    results.push({ heading: request.heading, imageUrl, success: true });
                } else {
                    results.push({ heading: request.heading, error: 'Failed to get image URL from Ideogram.', success: false });
                }
            } catch (error) {
                results.push({ heading: request.heading, error: error instanceof Error ? error.message : 'Unknown error', success: false });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[BATCH_IMAGE_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
