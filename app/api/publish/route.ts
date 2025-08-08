import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { availableSites } from '@/lib/sites';

const publishSchema = z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    siteIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = publishSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const { title, content, siteIds } = validation.data;
        const results = [];

        for (const siteId of siteIds) {
            const site = availableSites.find(s => s.id === siteId);
            if (!site || !site.appPassword) {
                results.push({ site: site?.name, success: false, error: 'Site configuration not found or missing app password.' });
                continue;
            }

            const credentials = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
            const response = await fetch(`${site.url}/wp-json/wp/v2/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                },
                body: JSON.stringify({
                    title,
                    content,
                    status: 'publish', // or 'draft'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                results.push({ site: site.name, success: false, error: errorData.message || 'Failed to publish.' });
            } else {
                const post = await response.json();
                results.push({ site: site.name, success: true, url: post.link });
            }
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error('[WP_PUBLISH_API_ERROR]', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
