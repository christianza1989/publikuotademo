import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const model = formData.get('model') as string | null;

        if (!file || !model) {
            return NextResponse.json({ error: 'No file or model provided.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let textContent = '';

        try {
            if (file.type === 'application/pdf') {
                const pdf = (await import('pdf-parse')).default;
                const data = await pdf(buffer);
                textContent = data.text;
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const mammoth = (await import('mammoth')).default;
                const result = await mammoth.extractRawText({ buffer });
                textContent = result.value;
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const json: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    json.forEach((row) => {
                        textContent += (row as unknown[]).join(' ') + '\n';
                    });
                });
            } else if (file.type === 'text/plain') {
                textContent = buffer.toString('utf-8');
            } else {
                return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
            }
        } catch (parseError) {
            console.error('File parsing error:', parseError);
            return NextResponse.json({ error: 'Failed to read content from the document.' }, { status: 500 });
        }

        if (textContent.length < 50) {
             return NextResponse.json({ error: 'Document content is too short to analyze.' }, { status: 400 });
        }

        const truncatedContent = textContent.substring(0, 15000);

        const prompt = `Analyze the following text extracted from a document. Based on this text, suggest 5 SEO-friendly article titles and 10 relevant SEO keywords. Return the result as a single, valid JSON object with two keys: "titles" (an array of strings) and "keywords" (an array of strings). Do not include any other text or markdown formatting in your response.

        Document text:
        ---
        ${truncatedContent}
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
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            throw new Error("OpenRouter API failed.");
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content;
        
        try {
            const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanedJson);
            return NextResponse.json({ ...analysis, originalText: truncatedContent });
        } catch (jsonError) {
            console.error("Failed to parse JSON from AI response:", responseText);
            throw new Error("AI returned an invalid response format.");
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[ANALYZE_DOCUMENT_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
