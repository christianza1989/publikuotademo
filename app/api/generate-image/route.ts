import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const imageSchema = z.object({
    prompt: z.string().min(3, { message: "Promptas per trumpas" }).max(400),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = imageSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { prompt: lithuanianTitle } = validation.data;

        // Step 1: Generate an English prompt from the Lithuanian title using Gemini
        const promptGenerationModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL as string });
        const promptForGemini = `Translate the following Lithuanian article title into a short, clear, descriptive English prompt for an image generation AI. The prompt must be no more than 15 words. Title: "${lithuanianTitle}"`;
        
        const result = await promptGenerationModel.generateContent(promptForGemini);
        const englishPrompt = result.response.text().trim();

        // Step 2: Use the generated English prompt to generate an image with Ideogram
        const formData = new FormData();
        formData.append('prompt', englishPrompt);
        formData.append('aspect_ratio', '16x9');
        formData.append('style_type', 'REALISTIC');

        const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
            method: 'POST',
            headers: { 'Api-Key': process.env.IDEOGRAM_API_KEY as string },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.detail || errorData.error || `Ideogram API failed with status: ${response.status}`;
            console.error('Ideogram API Error:', errorMessage);
            // Pass the specific error message to the frontend
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const data = await response.json();
        const imageUrl = data?.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error("Failed to extract image URL from Ideogram response.");
        }

        return NextResponse.json({ imageUrl });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[IDEOGRAM_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage || "Vidinė serverio klaida generuojant paveikslėlį." }, { status: 500 });
    }
}
