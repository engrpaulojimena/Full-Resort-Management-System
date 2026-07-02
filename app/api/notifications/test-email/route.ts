import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, testEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { to, name } = await req.json().catch(() => ({ to: null, name: null }));

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing "to" email address' }, { status: 400 });
  }

  const template = testEmail(name || 'Admin');
  const result = await sendEmail({ to, subject: template.subject, html: template.html });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ success: true, id: result.id, dryRun: result.id === 'dry-run' });
}
