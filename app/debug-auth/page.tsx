'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AuthDebugPage() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});
  const [authUrl, setAuthUrl] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    
    const getDebugInfo = async () => {
      const { data: session } = await supabase.auth.getSession();
      
      setDebugInfo({
        environment: process.env.NODE_ENV,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        currentUrl: window.location.href,
        userAgent: navigator.userAgent,
        session: session.session ? 'Active' : 'None',
        user: user ? {
          id: user.id,
          email: user.email,
          provider: user.app_metadata?.provider
        } : null
      });
    };
    
    getDebugInfo();
  }, [user]);

  const getURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ??
      process?.env?.NEXT_PUBLIC_VERCEL_URL ??
      'http://localhost:3000/';
    
    if (process.env.NODE_ENV === 'production') {
      url = 'https://hyakumeizan-guide.vercel.app/';
    } else {
      url = url.includes('http') ? url : `http://${url}`;
    }
    
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };

  const testGoogleAuth = async () => {
    const supabase = createClient();
    const redirectUrl = `${getURL()}auth/callback`;
    
    console.log('🔧 Testing Google Auth with:', {
      redirectTo: redirectUrl,
      baseUrl: getURL()
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('❌ Auth Test Error:', error);
      setAuthUrl(`Error: ${error.message}`);
    } else {
      console.log('✅ Auth Test Success:', data);
      setAuthUrl(data.url || 'Auth initiated');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">認証デバッグ情報</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">環境設定</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Google OAuth テスト</h2>
              <div className="space-y-3">
                <button
                  onClick={testGoogleAuth}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Google認証をテスト
                </button>
                {authUrl && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700">Auth URL: {authUrl}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">予想されるリダイレクトURL</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-700">
                  リダイレクトURL: <code>{getURL()}auth/callback</code>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  このURLがSupabaseの認証設定に登録されている必要があります
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-yellow-800">トラブルシューティング</h3>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                <li>• Supabaseダッシュボード → Authentication → Settings → Site URL を確認</li>
                <li>• Redirect URLs に本番環境のURLが追加されているか確認</li>
                <li>• Google Cloud Console でOAuth同意画面の設定を確認</li>
                <li>• 承認済みリダイレクトURIに正しいURLが設定されているか確認</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
