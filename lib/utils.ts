import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateEnglishPrompt(lithuanianContext: string, model: string, isFeaturedImage: boolean = false): Promise<string> {
    const imageType = isFeaturedImage 
        ? "a featured image for a blog article" 
        : "an illustration for a specific heading in an article";
    
    const contextTitle = isFeaturedImage ? "Article Context" : "Heading Context";

    const promptForPrompt = `Analyze the following Lithuanian text. Create a short, clear, descriptive English prompt (max 30 words) for an image generation AI. This image will be used as ${imageType}. The prompt should be crafted to generate a photorealistic, high-quality, cinematic image that visually represents the main idea of the text. Include keywords like "4k", "HDR", "professional photo", "hyperrealistic", "sharp focus". The generated image MUST NOT contain any text, letters, or words.

    ${contextTitle}:
    ---
    ${lithuanianContext}
    ---`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.SITE_URL || '',
            "X-Title": process.env.SITE_NAME || '',
        },
        body: JSON.stringify({ model, messages: [{ role: "user", content: promptForPrompt }] })
    });
    if (!response.ok) throw new Error("Failed to generate English prompt.");
    const data = await response.json();
    return data.choices[0].message.content.trim();
}
