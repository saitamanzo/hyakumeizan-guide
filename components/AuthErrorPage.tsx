"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AuthErrorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const checkAuthStatus = async () => {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      setErrorDetails(`
認証エラーが発生しました:
- エラーコード: ${error || 'unknown'}
- 説明: ${errorDescription || 'エラーの詳細が提供されていません'}
- セッション: ${session.session ? 'あり' : 'なし'}
- セッションエラー: ${sessionError ? sessionError.message : 'なし'}
- 現在のURL: ${window.location.href}
- リファラー: ${document.referrer}
      `);
      setLoading(false);
    };
    checkAuthStatus();
  }, [searchParams]);

  const retryAuth = () => {
    router.push('/signin');
  };
  const goHome = () => {
    router.push('/');
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状況を確認中...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            認証エラー
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ログイン処理中にエラーが発生しました
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">エラー詳細</h3>
          <pre className="text-xs text-red-700 whitespace-pre-wrap">{errorDetails}</pre>
        </div>
        <div className="space-y-3">
          <button
            onClick={retryAuth}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            再度ログインを試す
          </button>
          <button
            onClick={goHome}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            ホームに戻る
          </button>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">トラブルシューティング</h3>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• ブラウザのCookieとキャッシュをクリアしてください</li>
            <li>• プライベートブラウザモードで試してください</li>
            <li>• 異なるブラウザで試してください</li>
            <li>• しばらく時間をおいてから再試行してください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorPageInner />
    </Suspense>
  );
}
