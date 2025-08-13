import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { generateEnglishPrompt } from '@/lib/utils';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, keywords, metaDescription, model } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
        }
        if (!model) {
            return NextResponse.json({ error: 'Model is required.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

        const context = `Title: ${prompt}\nKeywords: ${keywords.join(', ')}\nMeta Description: ${metaDescription}`;
        const englishPrompt = await generateEnglishPrompt(context, model, true);
        const enhancedPrompt = `${englishPrompt}. CRITICAL RULE: The image must not contain any text, letters, or words. NO TEXT.`;

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
            const imageUrl = `data:image/png;base64,${imageBase64}`;
            return NextResponse.json({ imageUrl });
        } else {
            return NextResponse.json({ error: 'Image generation failed.' }, { status: 500 });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[IMAGEN_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
