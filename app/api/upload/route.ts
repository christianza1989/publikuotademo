import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + '_' + file.name.replaceAll(' ', '_');
    
    try {
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(
            path.join(uploadDir, filename),
            buffer
        );
        return NextResponse.json({ success: true, filename: filename, url: `/uploads/${filename}` });
    } catch (error) {
        console.log('Error occurred ', error);
        return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
    }
}
