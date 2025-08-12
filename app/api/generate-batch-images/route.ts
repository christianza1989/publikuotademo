import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { z } from 'zod';
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { generateEnglishPrompt } from '@/lib/utils';

const imageRequestSchema = z.object({
    heading: z.string(),
    context: z.string(),
});

const batchImageSchema = z.object({
    requests: z.array(imageRequestSchema),
    model: z.string(),
});

async function generateImageUrl(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

    const enhancedPrompt = `${prompt}. CRITICAL RULE: The image must not contain any text, letters, or words. NO TEXT.`;

    const response = await ai.models.generateImages({
        model: process.env.IMAGE_GENERATION_MODEL || 'imagen-4.0-generate-preview-06-06',
        prompt: enhancedPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
        const imageBytes = response.generatedImages[0].image.imageBytes;
        const imageBase64 = Buffer.from(imageBytes as string, "base64").toString('base64');
        return `data:image/png;base64,${imageBase64}`;
    } else {
        throw new Error('Image generation failed or returned no images.');
    }
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
                const englishPrompt = await generateEnglishPrompt(request.context, model, false);
                const imageUrl = await generateImageUrl(englishPrompt);
                if (imageUrl) {
                    results.push({ heading: request.heading, imageUrl, success: true });
                } else {
                    results.push({ heading: request.heading, error: 'Failed to get image URL from Imagen.', success: false });
                }
            } catch (error) {
                results.push({ heading: request.heading, error: error instanceof Error ? error.message : 'Unknown error', success: false });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[IMAGEN_BATCH_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
