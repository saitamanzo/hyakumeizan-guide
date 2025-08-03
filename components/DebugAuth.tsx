'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function DebugAuth() {
  const { user, session, loading, forceRefreshAuth } = useAuth();
  const [manualCheck, setManualCheck] = useState<{
    session: {
      user: string;
      accessToken: boolean;
      refreshToken: boolean;
      expiresAt: string | null;
    } | null;
    error?: string;
  } | null>(null);

  useEffect(() => {
    // 手動でセッションを確認
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setManualCheck({
        session: session ? {
          user: session.user?.email || 'Unknown',
          accessToken: !!session.access_token,
          refreshToken: !!session.refresh_token,
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        } : null,
        error: error?.message
      });
    };

    checkSession();
  }, []);

  const handleTestLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123456'
      });
      console.log('テストログイン結果:', { data, error });
    } catch (err) {
      console.error('テストログインエラー:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md">
      <h3 className="font-semibold mb-2">🔧 認証デバッグ</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>AuthProvider状態:</strong><br/>
          Loading: {loading ? 'Yes' : 'No'}<br/>
          User: {user?.email || 'None'}<br/>
          Session: {session ? 'Yes' : 'No'}
        </div>
        
        <div>
          <strong>手動確認:</strong><br/>
          {manualCheck ? (
            <>
              Session: {manualCheck.session ? 'Yes' : 'No'}<br/>
              {manualCheck.session && (
                <>
                  User: {manualCheck.session.user}<br/>
                  Token: {manualCheck.session.accessToken ? 'Yes' : 'No'}<br/>
                  Expires: {manualCheck.session.expiresAt}
                </>
              )}
              {manualCheck.error && <span className="text-red-600">Error: {manualCheck.error}</span>}
            </>
          ) : (
            'Loading...'
          )}
        </div>
        
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleTestLogin}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
          >
            テストログイン
          </button>
          <button
            onClick={handleLogout}
            className="px-2 py-1 bg-red-500 text-white text-xs rounded"
          >
            ログアウト
          </button>
          <button
            onClick={() => forceRefreshAuth()}
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded"
          >
            強制更新
          </button>
        </div>
      </div>
    </div>
  );
}
