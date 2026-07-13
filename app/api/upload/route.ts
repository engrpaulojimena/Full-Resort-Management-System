import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cloudName   = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey      = process.env.CLOUDINARY_API_KEY;
  const apiSecret   = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Convert file to base64 for Cloudinary API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'kekamiya/rooms';
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha256')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    // Upload to Cloudinary
    const body = new URLSearchParams();
    body.append('file', dataUri);
    body.append('api_key', apiKey);
    body.append('timestamp', String(timestamp));
    body.append('signature', signature);
    body.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Cloudinary error:', err);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.secure_url });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}