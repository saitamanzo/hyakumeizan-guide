'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const { user, loading, forceRefreshAuth } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<{session: unknown, error: unknown} | null>(null);
  const [userInfo, setUserInfo] = useState<{user: unknown, error: unknown} | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('test123456');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const checkAuth = async () => {
      addLog('🔍 初期認証状態チェック開始');
      
      // セッション情報取得
      const { data: { session }, error } = await supabase.auth.getSession();
      addLog(`セッション: ${session ? session.user?.email : 'なし'}`);
      if (error) addLog(`セッションエラー: ${error.message}`);
      setSessionInfo({ session, error });

      // ユーザー情報取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      addLog(`ユーザー: ${user ? user.email : 'なし'}`);
      if (userError) addLog(`ユーザーエラー: ${userError.message}`);
      setUserInfo({ user, error: userError });
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    addLog('🔄 ログアウト実行');
    const { error } = await supabase.auth.signOut();
    if (error) {
      addLog(`❌ ログアウトエラー: ${error.message}`);
    } else {
      addLog('✅ ログアウト成功');
    }
  };

  const handleTestSignIn = async () => {
    addLog('🔄 テストログイン実行');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addLog(`❌ ログインエラー: ${error.message}`);
      } else {
        addLog(`✅ ログイン成功: ${data.user?.email}`);
        addLog(`  - ユーザーID: ${data.user?.id}`);
        addLog(`  - セッション: ${data.session ? '作成済み' : '未作成'}`);
        
        // AuthProviderの状態を強制更新
        await forceRefreshAuth();
        addLog('  - AuthProvider状態更新完了');
      }
    } catch (err) {
      addLog(`❌ ログイン例外: ${err}`);
    }
  };

  const handleTestSignUp = async () => {
    addLog('🔄 テストアカウント作成実行');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });

      if (error) {
        addLog(`❌ アカウント作成エラー: ${error.message}`);
      } else {
        addLog(`✅ アカウント作成成功: ${data.user?.email}`);
        addLog(`  - 確認メール: ${data.user?.email_confirmed_at ? '確認済み' : '未確認'}`);
        addLog(`  - セッション: ${data.session ? '作成済み' : '未作成'}`);
      }
    } catch (err) {
      addLog(`❌ アカウント作成例外: ${err}`);
    }
  };

  const checkLocalStorage = () => {
    addLog('🔍 ローカルストレージ確認');
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('sb-auth-token');
      const allKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('sb-')
      );
      addLog(`  - sb-auth-token: ${authToken ? '存在' : '不在'}`);
      addLog(`  - 関連キー数: ${allKeys.length}`);
      allKeys.forEach(key => {
        const value = localStorage.getItem(key);
        addLog(`    - ${key}: ${value ? '存在' : '不在'}`);
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">🔧 認証システム詳細デバッグ</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 現在の状態 */}
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">AuthProvider状態</h2>
            <div className="text-sm space-y-1">
              <p>Loading: {loading ? 'true' : 'false'}</p>
              <p>User: {user ? user.email : 'null'}</p>
              <p>User ID: {user?.id || 'null'}</p>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">テスト設定</h2>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">テスト実行</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTestSignUp}
                className="bg-purple-500 text-white px-3 py-2 rounded text-sm"
              >
                アカウント作成
              </button>
              <button
                onClick={handleTestSignIn}
                className="bg-blue-500 text-white px-3 py-2 rounded text-sm"
              >
                ログイン
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-3 py-2 rounded text-sm"
              >
                ログアウト
              </button>
              <button
                onClick={checkLocalStorage}
                className="bg-green-500 text-white px-3 py-2 rounded text-sm"
              >
                ストレージ確認
              </button>
              <button
                onClick={() => forceRefreshAuth()}
                className="bg-indigo-500 text-white px-3 py-2 rounded text-sm"
              >
                認証強制更新
              </button>
              <button
                onClick={clearLogs}
                className="bg-gray-500 text-white px-3 py-2 rounded text-sm"
              >
                ログクリア
              </button>
            </div>
          </div>
        </div>

        {/* 右側: ログとデータ */}
        <div className="space-y-4">
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-scroll">
            <h2 className="text-white mb-2">🖥️ リアルタイムログ</h2>
            {logs.length === 0 ? (
              <p className="text-gray-400">テストを実行してください...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Supabase Session</h2>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Supabase User</h2>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
