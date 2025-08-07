import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { auth } from '@/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const articleSchema = z.object({
    keywords: z.array(z.string()).min(1, { message: "Reikalingas bent vienas raktinis žodis" }),
    domain: z.string().min(3, { message: "Domenas per trumpas" }).max(100),
    length: z.enum(['200', '400', '800', '1200']),
    tone: z.string(),
    customPrompt: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Neturite teisės atlikti šio veiksmo.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = articleSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { keywords, domain, length, tone, customPrompt } = validation.data;

        const prompt = `
          Tu esi profesionalus SEO turinio kūrėjas ir lietuvių kalbos ekspertas. Tavo užduotis - parašyti aukštos kokybės, SEO optimizuotą straipsnį HTML formatu.

          PAGRINDINIAI RAKTINIAI ŽODŽIAI: "${keywords.join(', ')}"
          STRAIPSNIO ILGIS: Apytiksliai ${length} žodžių.
          STRAIPSNIO TONAS: ${tone}.
          ${customPrompt ? `PAPILDOMI KLIENTO NURODYMAI: ${customPrompt}` : ''}

          INSTRUKCIJOS:
          1.  **Struktūra:**
              *   **NENAUDOK H1 ANTRAŠTĖS.** Straipsnio pavadinimas jau yra duotas. Tavo tekstas prasidės nuo įžangos.
              *   Parašyk įžangą (1-2 pastraipos), kuri sudomintų skaitytoją.
              *   Sukurk 3-5 pagrindines straipsnio dalis, kiekvieną pradedant informatyvia H2 paantrašte.
              *   Kiekvienoje H2 dalyje, jei reikia, naudok H3 paantraštes smulkesnėms temoms.
              *   Panaudok bent vieną sąrašą su kulkiniais ženklais (<ul><li>...</li></ul>).
              *   Parašyk apibendrinančią išvadą.

          2.  **SEO ir turinys:**
              *   **Venk raktinių žodžių "kišimo" (keyword stuffing).** Raktinius žodžius (${keywords.join(', ')}) naudok natūraliai ir logiškai. Svarbiausią raktinį žodį (${keywords[0]}) įtrauk į H1, įžangą, išvadą ir vieną ar dvi H2 antraštes.
              *   Tekstas turi būti parašytas sklandžia, rišlia kalba. Kiekviena pastraipa turi logiškai sietis su prieš tai buvusia.
              *   Vienoje iš pastraipų, kur tai tinka pagal kontekstą, natūraliai įterpk nuorodą. Pavyzdžiui: "Daugiau apie šias technologijas galite sužinoti apsilankę <a href="https://www.${domain}" target="_blank">šioje svetainėje</a>." Naudok prasmingą ankerinį tekstą, o ne tik patį domeną.
              *   Paryškink (<strong>) 3-4 svarbiausias frazes visame straipsnyje, kad pabrėžtum esminius momentus.

          3.  **Formatas:**
              *   Visą atsakymą pateik kaip vientisą HTML kodą.
              *   Pradėk tiesiogiai nuo pirmosios įžangos pastraipos (<p>...</p>). Nenaudok H1, <html>, <head>, ar <body> žymių.
              *   Naudok <p> žymes pastraipoms.

          Pradėk rašyti.`;

        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL as string });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const article = response.text();

        if (!article) throw new Error("AI negrąžino jokio turinio.");

        return NextResponse.json({ article });

    } catch (error) {
        console.error('[GEMINI_GENERATE_API_ERROR]', error);
        return NextResponse.json({ error: "Vidinė serverio klaida." }, { status: 500 });
    }
}
