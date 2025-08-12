import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const seoAnalysisSchema = z.object({
    text: z.string().min(100),
    keywords: z.array(z.string()).min(1),
    title: z.string(),
    metaDescription: z.string(),
    model: z.string(),
});

async function getSeoAnalysis(text: string, keywords: string[], title: string, metaDescription: string, model: string) {
    const prompt = `
        Imagine you are a world-class SEO expert, "AI Chief SEO Professional". Your task is to analyze the following article written in Lithuanian.
        Provide a detailed, structured SEO analysis in Lithuanian.

        Analyze the following aspects:
        1.  **Keyword Usage:** Check for the primary keyword "${keywords[0]}" in the title, meta description, first paragraph, and at least one H2 heading. Evaluate the natural integration of all keywords.
        2.  **Readability:** Assess sentence and paragraph length. Are they concise?
        3.  **Content Structure:** Check for proper use of H2 and H3 tags. Is there at least one list (<ul>)?
        4.  **Meta Tags:** Evaluate the meta title (under 60 chars) and meta description (under 160 chars) for length and keyword inclusion.
        5.  **Overall Quality:** Give a final score out of 100.

        Your response MUST be a JSON object with the following structure:
        {
          "seoScore": <A number from 0 to 100>,
          "goodPoints": [
            "<Positive feedback point 1 in Lithuanian>",
            "<Positive feedback point 2 in Lithuanian>"
          ],
          "suggestions": [
            "<Specific, actionable improvement suggestion 1 in Lithuanian>",
            "<Specific, actionable improvement suggestion 2 in Lithuanian>"
          ]
        }

        Do not include any other text or markdown.

        ---
        Title: ${title}
        Meta Description: ${metaDescription}
        Keywords: ${keywords.join(', ')}
        Article Text:
        ${text}
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
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error("Failed to get SEO analysis from AI model.");
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = seoAnalysisSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { text, keywords, title, metaDescription, model } = validation.data;
        const analysis = await getSeoAnalysis(text, keywords, title, metaDescription, model);

        return NextResponse.json(analysis);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[ANALYZE_SEO_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
