import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const articleSchema = z.object({
    keywords: z.array(z.string()).min(1, { message: "Reikalingas bent vienas raktinis žodis" }),
    domain: z.string().min(3, { message: "Domenas per trumpas" }).max(100),
    length: z.enum(['200', '400', '800', '1200']),
    tone: z.string(),
    structure: z.enum(['h2-h3', 'h2-only', 'h3-only', 'bold-only']),
    customPrompt: z.string().max(500).optional(),
    maintainStyle: z.boolean().optional(),
    originalText: z.string().optional(),
    model: z.string(),
    image: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = articleSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { keywords, domain, length, tone, structure, customPrompt, maintainStyle, originalText, model, image } = validation.data;

        let styleInstruction = '';
        if (maintainStyle && originalText) {
            styleInstruction = `\nLABAI SVARBI INSTRUKCIJA: Perrašyk straipsnį, bet išlaikyk labai panašų stilių, toną ir sakinių struktūrą kaip šiame pavyzdyje:\n---\n${originalText}\n---\n`;
        }

        let structureInstructions = '';
        switch (structure) {
            case 'h2-only':
                structureInstructions = `* Skaidyk tekstą į logines dalis, kiekvieną pradedant informatyvia H2 antrašte.\n* NENAUDOK H3 antraščių.`;
                break;
            case 'h3-only':
                structureInstructions = `* Skaidyk tekstą į logines dalis, kiekvieną pradedant informatyvia H3 antrašte.\n* NENAUDOK H2 antraščių.`;
                break;
            case 'bold-only':
                structureInstructions = `* Skaidyk tekstą į logines dalis, kiekvieną pradedant atskira pastraipa su paryškinta (<strong>) pirmąja eilute, kuri veiks kaip antraštė.\n* NENAUDOK H2 ar H3 antraščių.`;
                break;
            case 'h2-h3':
            default:
                structureInstructions = `* Sukurk 3-5 pagrindines straipsnio dalis, kiekvieną pradedant informatyvia H2 paantrašte.\n* Kiekvienoje H2 dalyje, jei reikia, naudok H3 paantraštes smulkesnėms temoms.`;
                break;
        }

        const prompt = `
          Įsivaizduok, kad esi pasaulinio lygio SEO tekstų rašytojas ir turinio strategas, kurio supergalia - paversti sudėtingas temas įtraukiančiais, lengvai skaitomais ir skaitytojui vertę kuriančiais straipsniais. Tavo stilius yra "humanizuotas" - rašai kaip ekspertas, bet kalbi kaip draugas.

          TAVO UŽDUOTIS: Parašyti tobulą SEO straipsnį HTML formatu pagal šiuos parametrus.

          PARAMETRAI:
          - PAGRINDINIAI RAKTINIAI ŽODŽIAI: "${keywords.join(', ')}"
          - STRAIPSNIO TONAS: ${tone}.
          - KRITINIS REIKALAVIMAS - ILGIS: Straipsnio ilgis PRIVALO būti kuo artimesnis ${length} žodžių. Tai yra svarbiausias reikalavimas. Negeneruok trumpesnio teksto.
          ${customPrompt ? `- PAPILDOMI KLIENTO NURODYMAI: ${customPrompt}` : ''}
          ${styleInstruction}

          INSTRUKCIJOS TOBULAM STRAIPSNIUI:

          1.  **ĮŽANGA (KABLIUKAS):**
              *   Pradėk nuo klausimo ar netikėto fakto, kuris iškart patrauktų skaitytojo dėmesį.
              *   Pristatyk problemą, kurią straipsnis padės išspręsti.
              *   Pažadėk aiškią vertę, kurią skaitytojas gaus perskaitęs straipsnį.

          2.  **DĖSTYMAS (VERTYBĖ IR SKAITOMUMAS):**
              *   **Struktūra:** Naudok nurodytą antraščių struktūrą: ${structureInstructions}.
              *   **JOKIŲ TEKSTO SIENŲ:** Kiekviena pastraipa - ne ilgesnė nei 3-4 sakiniai. Naudok daug baltos erdvės.
              *   **PRAKTINIAI PAVYZDŽIAI:** Iliustruok sudėtingas idėjas su trumpais, realaus gyvenimo pavyzdžiais ar scenarijais.
              *   **SĄRAŠAI:** Būtinai panaudok bent vieną sąrašą (<ul><li>...</li></ul>), kad suskaidytum informaciją.
              *   **IŠRYŠKINIMAS:** Paryškink (<strong>) 3-4 pačias svarbiausias mintis ar terminus visame tekste.

          3.  **SEO INTEGRACIJA (NATŪRALUMAS):**
              *   **SVARBIAUSIA TAISYKLĖ:** Integruodamas raktinius žodžius, **privalai keisti jų galūnes (linksniuoti), kad jie natūraliai derėtų sakinyje.** Pavyzdžiui, jei raktinis žodis yra "dirbtinis intelektas", sakinyje jį gali panaudoti kaip "dirbtinio intelekto", "dirbtiniam intelektui" ir pan. Tekstas turi skambėti visiškai natūraliai.
              *   Svarbiausią raktinį žodį (${keywords[0]}) įpinti į įžangą, išvadą ir bent vieną H2 antraštę.
              *   Kitus raktinius žodžius (${keywords.join(', ')}) naudok natūraliai visame tekste, kur jie logiškai tinka. Venk dirbtinio "kišimo".
              *   Natūraliai integruok nuorodą į ${domain}. Pavyzdžiui: "Norėdami sužinoti daugiau apie individualius sprendimus, apsilankykite <a href="https://www.${domain}" target="_blank">šioje svetainėje</a>." Naudok prasmingą ankerinį tekstą.

          4.  **IŠVADA (VEIKSMAS):**
              *   Apibendrink pagrindines straipsnio mintis.
              *   Užbaik straipsnį su aiškiu kvietimu veiksmui (call-to-action) arba įsimintina, pamąstyti skatinančia mintimi.

          5.  **FORMATAS:**
              *   Pateik TIK HTML turinį. Pradėk nuo pirmos pastraipos <p> žymės.
              *   NENAUDOK H1, <html>, <head>, ar <body> žymių.

          Pradėk.`;
        
        const visionModel = process.env.ARTICLE_GENERATION_MODEL || 'google/gemini-flash-2.5';

        const finalModel = process.env.ARTICLE_GENERATION_MODEL || 'google/gemini-flash-2.5';

        const messages = image
            ? [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt },
                        { "type": "image_url", "image_url": { "url": image } }
                    ]
                }
            ]
            : [
                { "role": "user", "content": prompt }
            ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.SITE_URL || '',
                "X-Title": process.env.SITE_NAME || '',
            },
            body: JSON.stringify({
                "model": finalModel,
                "messages": messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || "OpenRouter API failed.");
        }

        const data = await response.json();
        let article = data.choices[0].message.content;

        if (!article) throw new Error("AI did not return any content.");

        // Clean up potential markdown code fences
        article = article.replace(/^```html\s*/, '').replace(/```$/, '').trim();
        // Convert markdown bold to strong tags
        article = article.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return NextResponse.json({ article });

    } catch (error) {
        console.error('[OPENROUTER_GENERATE_API_ERROR]', error);
        return NextResponse.json({ error: "Failed to generate article." }, { status: 500 });
    }
}
