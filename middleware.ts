import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(_req: NextRequest) {
  // Next.js 15の動的APIエラーを回避するため、
  // 認証処理は一時的にクライアントサイドのみで処理
  return NextResponse.next();
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    '/profile/:path*',
    '/signin',
    '/signup',
  ],
};
