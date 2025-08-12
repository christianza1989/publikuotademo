import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const faqSchema = z.object({
    text: z.string().min(50, "Text must be at least 50 characters long."),
    model: z.string(),
});

async function generateFaqContent(articleText: string, model: string): Promise<string> {
    const prompt = `
        Based on the following article text, generate a concise FAQ section with 3-5 relevant questions and answers.
        The entire output must be in Lithuanian.
        Format the output strictly as an HTML block using <details> and <summary> tags for each question and answer pair.
        Do not include any other text, explanation, or markdown formatting.
        The structure for each question should be:
        <details>
          <summary><strong>[Question in Lithuanian]?</strong></summary>
          <p>[Answer in Lithuanian].</p>
        </details>

        Article Text:
        ---
        ${articleText}
        ---
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
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error("Failed to generate FAQ from AI model.");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = faqSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { text, model } = validation.data;

        const faqHtml = await generateFaqContent(text, model);

        return NextResponse.json({ faqHtml });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[GENERATE_FAQ_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
