import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const keywordsSchema = z.object({
    title: z.string().min(3, { message: "Straipsnio pavadinimas per trumpas" }).max(150),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = keywordsSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { title } = validation.data;

        const prompt = `Tu esi SEO ekspertas. Sugeneruok 10 svarbiausių ir relevantiškiausių SEO raktinių žodžių (keywords) straipsniui pavadinimu: "${title}". Atsakymą pateik kaip JSON masyvą. Pavyzdys: ["raktinis žodis 1", "raktinis žodis 2"]`;

        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL as string });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up the response to be a valid JSON array
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const keywords = JSON.parse(cleanedText);

        return NextResponse.json({ keywords });

    } catch (error) {
        console.error('[GEMINI_KEYWORDS_API_ERROR]', error);
        return NextResponse.json({ error: "Vidinė serverio klaida." }, { status: 500 });
    }
}
