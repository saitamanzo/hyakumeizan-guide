import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  const url = new URL(request.url);
  const isAdminPath = url.pathname.startsWith('/admin');
  const isAdminApi = url.pathname.startsWith('/api/admin');

  if ((isAdminPath || isAdminApi)) {
    const allowed = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const email = session?.user?.email || '';
    if (!email || (allowed.length > 0 && !allowed.includes(email))) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // For page routes under /admin, redirect to /auth/error for better UX
      const redirectUrl = new URL('/auth/error', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
