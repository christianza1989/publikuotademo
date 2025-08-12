import { NextRequest, NextResponse } from 'next/server';
import { availableSites, WordPressSite } from '@/lib/sites';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WordPressMedia {
    id: number;
    source_url: string;
}

async function convertToWebp(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).webp({ quality: 80 }).toBuffer();
}

async function uploadImage(site: WordPressSite, imageFile: File, altText: string, title: string): Promise<WordPressMedia> {
    const credentials = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
    
    const originalBuffer = Buffer.from(await imageFile.arrayBuffer());
    const webpBuffer = await convertToWebp(originalBuffer);
    
    const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' });
    const webpFilename = `${path.parse(imageFile.name).name}.webp`;

    const formData = new FormData();
    formData.append('file', webpBlob, webpFilename);
    formData.append('alt_text', altText);
    formData.append('title', title);
    formData.append('caption', altText);

    const response = await fetch(`${site.url}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}` },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image upload failed: ${errorData.message || JSON.stringify(errorData)}`);
    }
    return response.json();
}

async function processAndUploadImages(content: string, site: WordPressSite): Promise<string> {
    const dom = new JSDOM(content);
    const document = dom.window.document;
    const images = Array.from(document.querySelectorAll('img'));
    let updatedContent = content;

    for (const img of images) {
        const src = img.getAttribute('src');
        if (!src) continue;

        try {
            let imageBuffer: Buffer;
            let originalFilename: string;

            if (src.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', src);
                imageBuffer = await fs.readFile(filePath);
                originalFilename = path.basename(src);
            } else if (src.startsWith('http')) {
                const imageResponse = await fetch(src);
                const arrayBuffer = await imageResponse.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                originalFilename = 'external-image.jpg';
            } else {
                continue; // Skip data URIs or other formats for now
            }
            
            const webpBuffer = await convertToWebp(imageBuffer);
            const webpBlob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' });
            const webpFilename = `${path.parse(originalFilename).name}.webp`;
            const imageFile = new File([webpBlob], webpFilename, { type: 'image/webp' });

            const altText = img.getAttribute('alt') || 'image';
            const title = altText;

            const uploadedImage = await uploadImage(site, imageFile, altText, title);
            
            updatedContent = updatedContent.replace(src, uploadedImage.source_url);

        } catch (error) {
            console.error(`Failed to process image ${src}:`, error);
        }
    }
    return updatedContent;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const title = formData.get('title') as string;
        let content = formData.get('content') as string;
        const siteIds = formData.getAll('siteIds') as string[];
        const image = formData.get('image') as File | null;
        const metaTitle = formData.get('metaTitle') as string;
        const metaDescription = formData.get('metaDescription') as string;

        if (!title || !content || !siteIds || siteIds.length === 0 || !image) {
            return NextResponse.json({ error: 'Missing required fields, including the featured image.' }, { status: 400 });
        }

        const results = [];

        for (const siteId of siteIds) {
            const site = availableSites.find(s => s.id === siteId);
            if (!site || !site.appPassword) {
                results.push({ site: site?.name, success: false, error: 'Site configuration not found or missing app password.' });
                continue;
            }

            try {
                let featuredMediaId: number | null = null;
                if (image) {
                    const uploadedImage = await uploadImage(site, image, title, title);
                    featuredMediaId = uploadedImage.id;
                }
                
                content = await processAndUploadImages(content, site);

                const postData: {
                    title: string;
                    content: string;
                    status: 'publish' | 'draft';
                    featured_media?: number;
                    meta?: {
                        _aioseo_title?: string;
                        _aioseo_description?: string;
                    }
                } = {
                    title,
                    content,
                    status: 'publish',
                    meta: {
                        _aioseo_title: metaTitle,
                        _aioseo_description: metaDescription,
                    }
                };

                if (featuredMediaId) {
                    postData.featured_media = featuredMediaId;
                }

                const createPostResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${site.username}:${site.appPassword}`).toString('base64')}`,
                    },
                    body: JSON.stringify(postData),
                });

                if (!createPostResponse.ok) {
                    const errorData = await createPostResponse.json();
                    throw new Error(errorData.message || 'Failed to create post.');
                }

                const post = await createPostResponse.json();
                results.push({ site: site.name, success: true, url: post.link });

            } catch (error) {
                results.push({ site: site.name, success: false, error: error instanceof Error ? error.message : 'Unknown error during publishing.' });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error('[WP_PUBLISH_API_ERROR]', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
