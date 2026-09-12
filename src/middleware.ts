import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/admin/:path*',
    '/prof/:path*',
    '/etudiant/:path*',
    '/login',
  ],
};
