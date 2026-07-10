import { NextRequest } from 'next/server';
import { UserRole } from '@/types';

export interface SessionUser {
  id: number;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
}

export function getSessionUser(req: NextRequest): SessionUser | null {
  try {
    const cookie = req.cookies.get('resort_session')?.value;
    if (!cookie) return null;
    const decoded = Buffer.from(cookie, 'base64').toString('utf-8');
    const data = JSON.parse(decoded) as SessionUser;
    if (!data.id || !data.role) return null;
    return data;
  } catch {
    return null;
  }
}
