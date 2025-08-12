import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const titleSchema = z.object({
    topic: z.string().min(3, { message: "Temos pavadinimas per trumpas" }).max(100),
    model: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = titleSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { topic, model } = validation.data;

        const prompt = `
            Įsivaizduok, kad esi kūrybingas žurnalistas ir patyręs turinio kūrėjas. Tavo užduotis - sugeneruoti 5 aiškius, įdomius ir įtraukiančius straipsnio pavadinimus lietuvių kalba tema: "${topic}".

            Kiekvienas pavadinimas PRIVALO:
            1.  Būti informatyvus ir aiškiai nusakyti straipsnio temą.
            2.  Sukelti smalsumą ir skatinti skaitytoją sužinoti daugiau.
            3.  Gali būti ilgesnis, jei tai padeda geriau atskleisti temą.

            Pavyzdžiai:
            - ${topic}: Išsami Analizė, Kaip Technologijos Keičia Mūsų Pasaulį
            - Ar Esame Pasiruošę Ateičiai? Kritinis Požiūris į ${topic}
            - Nuo Fantastikos iki Realybės: Viskas, Ką Reikia Žinoti Apie ${topic}

            Pateik tik pavadinimus, atskirtus nauja eilute, be jokių numerių ar papildomų ženklų.
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
        const text = data.choices[0].message.content;
        
        const titles = text.split('\n').filter((t: string) => t.trim() !== '');

        return NextResponse.json({ titles });

    } catch (error) {
        console.error('[OPENROUTER_TITLE_API_ERROR]', error);
        return NextResponse.json({ error: "Failed to generate titles." }, { status: 500 });
    }
}
