import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const keywordsSchema = z.object({
    title: z.string().min(3, { message: "Pavadinimas per trumpas" }).max(150),
    topic: z.string().min(3, { message: "Temos pavadinimas per trumpas" }).max(100),
    model: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = keywordsSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { title, topic, model } = validation.data;

        const prompt = `
            Įsivaizduok, kad esi SEO strategas. Tavo užduotis - sugeneruoti 10-15 aukštos kokybės, SEO optimizuotų raktinių žodžių lietuvių kalba straipsniui, kurio tema yra "${topic}", o pavadinimas - "${title}".

            Raktiniai žodžiai PRIVALO apimti:
            1.  **Pagrindinius Raktinius Žodžius:** Tiesiogiai susijusius su "${title}".
            2.  **LSI Raktinius Žodžius (Latent Semantic Indexing):** Semantiškai susijusius terminus, kurie padeda paieškos sistemoms suprasti kontekstą (pvz., jei tema "kava", LSI žodžiai galėtų būti "espresas", "kofeinas", "barista").
            3.  **Ilgos Uodegos Raktinius Žodžius (Long-tail Keywords):** Specifiškesnes, 3+ žodžių frazes, į kurias taikosi vartotojai, ieškantys konkrečios informacijos.

            Pateik tik raktinius žodžius, atskirtus kableliais.
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
        
        const keywords = text.split(',').map((k: string) => k.trim()).filter((k: string) => k);

        return NextResponse.json({ keywords });

    } catch (error) {
        console.error('[OPENROUTER_KEYWORDS_API_ERROR]', error);
        return NextResponse.json({ error: "Failed to generate keywords." }, { status: 500 });
    }
}
