import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { auth } from '@/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const titleSchema = z.object({
    topic: z.string().min(3, { message: "Temos pavadinimas per trumpas" }).max(100),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Neturite teisės atlikti šio veiksmo.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = titleSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { topic } = validation.data;

        const prompt = `Sugeneruok 5 SEO draugiškus ir patrauklius straipsnio pavadinimus lietuvių kalba tema: "${topic}". Pateik tik pavadinimus, atskirtus nauja eilute, be jokių numerių ar papildomų ženklų.`;

        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL as string });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const titles = text.split('\n').filter(t => t.trim() !== '');

        return NextResponse.json({ titles });

    } catch (error) {
        console.error('[GEMINI_TITLE_API_ERROR]', error);
        return NextResponse.json({ error: "Vidinė serverio klaida." }, { status: 500 });
    }
}
