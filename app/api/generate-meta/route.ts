import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const metaSchema = z.object({
    title: z.string().min(10, "Article title must be at least 10 characters long."),
    topic: z.string().min(3, { message: "Temos pavadinimas per trumpas" }).max(100),
    keywords: z.array(z.string()).min(1, "At least one keyword is required."),
    model: z.string(),
});

async function generateMetaContent(title: string, topic: string, keywords: string[], model: string): Promise<{ metaTitle: string; metaDescription: string }> {
    const prompt = `
        Įsivaizduok, kad esi SEO specialistas. Tavo užduotis - sukurti tobulą meta pavadinimą ir meta aprašymą lietuvių kalba, remiantis pateikta tema, straipsnio pavadinimu ir raktiniais žodžiais.

        INFORMACIJA:
        - Tema: "${topic}"
        - Straipsnio Pavadinimas: "${title}"
        - Raktiniai Žodžiai: ${keywords.join(', ')}

        INSTRUKCIJOS:
        1.  **Meta Pavadinimas (metaTitle):**
            - PRIVALO būti trumpesnis nei 60 simbolių.
            - PRIVALO natūraliai integruoti pagrindinį raktinį žodį "${keywords[0]}".
            - Turi būti labai panašus į originalų straipsnio pavadinimą, bet gali būti šiek tiek patobulintas SEO tikslais.
        2.  **Meta Aprašymas (metaDescription):**
            - PRIVALO būti trumpesnis nei 160 simbolių.
            - Turi būti įtraukiantis, aiškiai nurodyti straipsnio vertę ir skatinti vartotoją paspausti.
            - PRIVALO natūraliai integruoti 1-2 svarbiausius raktinius žodžius.
            - Turi baigtis aiškiu kvietimu veiksmui (pvz., "Skaitykite daugiau!", "Sužinokite, kaip!", "Atraskite dabar!").

        ATSAKYMO FORMATAS:
        Pateik atsakymą kaip JSON objektą su dviem raktais: "metaTitle" ir "metaDescription". Jokių papildomų paaiškinimų ar teksto.
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
            model,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error("Failed to generate meta descriptions from AI model.");
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return { metaTitle: content.metaTitle, metaDescription: content.metaDescription };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = metaSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { title, topic, keywords, model } = validation.data;
        const meta = await generateMetaContent(title, topic, keywords, model);

        return NextResponse.json(meta);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[GENERATE_META_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
