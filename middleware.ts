import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // セッションの更新
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 認証が必要なページへの未認証アクセスをリダイレクト
  if (!session && (
    req.nextUrl.pathname.startsWith('/climbs') ||
    req.nextUrl.pathname.startsWith('/profile')
  )) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // 認証済みユーザーのログイン/登録ページへのアクセスをリダイレクト
  if (session && (
    req.nextUrl.pathname.startsWith('/signin') ||
    req.nextUrl.pathname.startsWith('/signup')
  )) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    '/climbs/:path*',
    '/profile/:path*',
    '/signin',
    '/signup',
  ],
};
