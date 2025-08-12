import { NextRequest, NextResponse } from 'next/server';
import { availableSites, WordPressSite } from '@/lib/sites';
import { JSDOM } from 'jsdom';

interface WordPressMedia {
    id: number;
    source_url: string;
}

async function uploadImage(site: WordPressSite, imageFile: File, altText: string, title: string): Promise<WordPressMedia> {
    const credentials = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
    const formData = new FormData();
    formData.append('file', imageFile);
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
        throw new Error(`Image upload failed: ${errorData.message}`);
    }
    return response.json();
}

async function processAndUploadImages(content: string, site: WordPressSite) {
    const dom = new JSDOM(content);
    const document = dom.window.document;
    const images = Array.from(document.querySelectorAll('img'));
    let updatedContent = content;

    for (const img of images) {
        const src = img.getAttribute('src');
        if (src && src.startsWith('http')) { // Assuming external images
            try {
                const imageResponse = await fetch(src);
                const blob = await imageResponse.blob();
                const file = new File([blob], "image.jpg", { type: blob.type });
                
                const altText = img.getAttribute('alt') || 'image';
                const title = altText;

                const uploadedImage = await uploadImage(site, file, altText, title);
                
                updatedContent = updatedContent.replace(src, uploadedImage.source_url);
            } catch (error) {
                console.error(`Failed to process image ${src}:`, error);
            }
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

            const credentials = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
            let featuredMediaId: number | null = null;

            if (image) {
                try {
                    const uploadedImage = await uploadImage(site, image, title, title);
                    featuredMediaId = uploadedImage.id;
                } catch (error) {
                    console.error('Featured image upload failed:', error);
                }
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

            const createPostResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                },
                body: JSON.stringify(postData),
            });

            if (!createPostResponse.ok) {
                const errorData = await createPostResponse.json();
                results.push({ site: site.name, success: false, error: errorData.message || 'Failed to create post.' });
                continue;
            }

            const post = await createPostResponse.json();

            if (featuredMediaId) {
                const updatePostResponse = await fetch(`${site.url}/wp-json/wp/v2/posts/${post.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${credentials}`,
                    },
                    body: JSON.stringify({
                        featured_media: featuredMediaId,
                    }),
                });

                if (!updatePostResponse.ok) {
                    const errorData = await updatePostResponse.json();
                    console.error(`Failed to set featured image for post ${post.id} on site ${site.name}:`, errorData.message);
                }
            }
            
            results.push({ site: site.name, success: true, url: post.link });
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error('[WP_PUBLISH_API_ERROR]', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
