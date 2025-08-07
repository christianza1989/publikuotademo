import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { availableSites } from '@/lib/sites';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        
        const title = formData.get('title') as string | null;
        const content = formData.get('content') as string | null;
        const siteIds = formData.getAll('siteIds') as string[] | null;
        const imageFile = formData.get('image') as File | null;

        if (!title || !content || !siteIds || siteIds.length === 0) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const results = [];

        for (const siteId of siteIds) {
            const site = availableSites.find(s => s.id === siteId);
            if (!site || !site.appPassword) {
                results.push({ site: site?.name, success: false, error: 'Site configuration not found.' });
                continue;
            }

            const credentials = Buffer.from(`${site.username}:${site.appPassword.replace(/"/g, '')}`).toString('base64');
            let featuredMediaId = null;

            // 1. Upload image to WordPress Media Library if it exists
            if (imageFile && imageFile.size > 0) {
                try {
                    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
                    const mediaResponse = await fetch(`${site.url}/wp-json/wp/v2/media`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${credentials}`,
                            'Content-Disposition': `attachment; filename="${imageFile.name}"`,
                            'Content-Type': imageFile.type,
                        },
                        body: fileBuffer,
                    });

                    if (!mediaResponse.ok) {
                        const errorData = await mediaResponse.json();
                        throw new Error(errorData.message || 'Failed to upload image to WordPress.');
                    }
                    const mediaData = await mediaResponse.json();
                    featuredMediaId = mediaData.id;
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
                    results.push({ site: site.name, success: false, error: `Failed to upload featured image: ${errorMessage}` });
                    continue;
                }
            }

            // 2. Create the post
            try {
                const postResponse = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${credentials}`,
                    },
                    body: JSON.stringify({
                        title,
                        content,
                        status: 'publish',
                        featured_media: featuredMediaId,
                    }),
                });

                if (!postResponse.ok) {
                    const errorData = await postResponse.json();
                    throw new Error(errorData.message || 'Failed to publish post.');
                }
                const post = await postResponse.json();
                results.push({ site: site.name, success: true, url: post.link });
            } catch (e) {
                 const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
                 results.push({ site: site.name, success: false, error: `Failed to publish post: ${errorMessage}` });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('[WP_PUBLISH_API_ERROR]', error);
        return NextResponse.json({ error: errorMessage || "Internal Server Error" }, { status: 500 });
    }
}
