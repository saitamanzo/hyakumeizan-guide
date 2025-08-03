import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  
  console.log('Auth callback received:', { code: !!code, error, errorDescription });
  
  // エラーがある場合はサインインページにリダイレクト
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/signin?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'OAuth authentication failed')}`
    );
  }
  
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false, // サーバーサイドではセッションを永続化しない
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
    
    try {
      // 認証コードをセッションに交換
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(`${requestUrl.origin}/signin?error=auth_error&message=${encodeURIComponent(error.message)}`);
      }
      
      if (data.session && data.user) {
        console.log('Session created successfully for user:', data.user.email);
        
        // ユーザープロファイルの存在確認
        const { error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // ユーザープロファイルが存在しない場合は作成
          const { error: insertError } = await supabase.from('users').insert({
            id: data.user.id,
            display_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'New User',
            experience_level: 'beginner',
            mountains_climbed: 0,
          });
          
          if (insertError) {
            console.error('Failed to create user profile:', insertError);
          } else {
            console.log('User profile created successfully');
          }
        }
        
        // 成功時のリダイレクト（シンプルにホームページへ）
        const response = NextResponse.redirect(`${requestUrl.origin}/`);
        
        // セッションのリフレッシュを促すためのヘッダーを追加
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        // クライアントサイドでの認証状態更新を促すクッキーを設定
        response.cookies.set('auth-callback', 'success', {
          maxAge: 10, // 10秒で期限切れ
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        
        return response;
      } else {
        console.error('No session or user data received');
        return NextResponse.redirect(`${requestUrl.origin}/signin?error=no_session`);
      }
    } catch (error) {
      console.error('Auth callback processing error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/signin?error=callback_error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
    }
  }
  
  // コードがない場合（直接アクセスなど）
  console.log('No auth code provided, redirecting to home');
  return NextResponse.redirect(`${requestUrl.origin}/`);
}
