import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('🔑 Auth callback received:', {
    code: code ? 'present' : 'missing',
    error,
    errorDescription,
    fullUrl: request.url
  });

  // OAuthプロバイダーからエラーが返された場合
  if (error) {
    console.error('❌ OAuth provider error:', { error, errorDescription });
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('❌ Auth callback error:', exchangeError);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=exchange_error&error_description=${encodeURIComponent(exchangeError.message)}`
      );
    }

    console.log('✅ Auth callback success:', {
      userId: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider
    });
  }
  
  // 認証成功後はホームページにリダイレクト
  return NextResponse.redirect(`${requestUrl.origin}/`);
}
