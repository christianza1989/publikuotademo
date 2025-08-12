import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const proofreadSchema = z.object({
    text: z.string().min(10, { message: "Tekstas per trumpas taisymui" }),
    model: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = proofreadSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { text, model } = validation.data;

        const prompt = `Tu esi profesionalus lietuvių kalbos redaktorius. Atidžiai perskaityk šį HTML tekstą ir ištaisyk visas gramatikos, rašybos ir skyrybos klaidas. Grąžink tik pataisytą HTML tekstą, išsaugodamas visas originalias HTML žymes (pvz., <h2>, <p>, <strong>). Nekeisk teksto struktūros ir nepridėk jokių papildomų komentarų.

        Tekstas taisymui:
        ---
        ${text}
        ---`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || "OpenRouter API failed.");
        }

        const data = await response.json();
        const correctedText = data.choices[0].message.content;
        
        return NextResponse.json({ correctedText });

    } catch (error) {
        console.error('[OPENROUTER_PROOFREAD_API_ERROR]', error);
        return NextResponse.json({ error: "Failed to proofread text." }, { status: 500 });
    }
}
