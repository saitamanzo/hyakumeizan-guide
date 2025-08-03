'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OAuthSignIn from './OAuthSignIn';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLからエラーメッセージを取得
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    
    if (urlError) {
      let errorMessage = 'ログインに失敗しました';
      
      switch (urlError) {
        case 'auth_error':
          errorMessage = 'OAuth認証でエラーが発生しました';
          break;
        case 'callback_error':
          errorMessage = 'コールバック処理でエラーが発生しました';
          break;
        case 'no_session':
          errorMessage = 'セッションの作成に失敗しました';
          break;
        default:
          errorMessage = urlMessage || 'ログインに失敗しました';
      }
      
      setError(errorMessage);
      
      // URLクリーンアップ
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (resetMode) {
        // パスワードリセット処理
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          throw error;
        }

        setResetMessage('パスワードリセットのメールを送信しました。メールをご確認ください。');
        setResetMode(false);
      } else {
        // 通常のログイン処理
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session && data.user) {
          console.log('Email signin successful:', data.user.email);
          // ログイン成功、認証状態の変更を待つ
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.push('/');
          router.refresh();
        } else {
          throw new Error('ログインに成功しましたが、セッションの作成に失敗しました。');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof Error) {
        let errorMessage = 'ログインに失敗しました';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。新規登録の場合は、確認メールを受信してアカウントを有効化してください。';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '確認メールが送信されています。メール内のリンクをクリックしてアカウントを有効化してください。';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '試行回数が多すぎます。しばらく待ってから再度お試しください。';
        } else {
          errorMessage = `ログインエラー: ${error.message}`;
        }
        
        setError(errorMessage);
      } else {
        setError('ログインに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          アカウントにログイン
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          または{' '}
          <Link
            href="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            新規会員登録
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* OAuth サインイン */}
          <div className="mb-6">
            <OAuthSignIn />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">
                またはメールアドレスで
              </span>
            </div>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required={!resetMode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  disabled={resetMode}
                />
              </div>
              {!resetMode && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    パスワードを忘れた場合
                  </button>
                </div>
              )}
            </div>

            {resetMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{resetMessage}</div>
              </div>
            )}

            {resetMode && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="text-sm text-blue-700">
                  パスワードリセット用のメールを送信します。メールアドレスを入力して「リセット」ボタンをクリックしてください。
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  ログイン状態を保持
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading 
                  ? (resetMode ? 'メール送信中...' : 'ログイン中...') 
                  : (resetMode ? 'パスワードリセットメールを送信' : 'メールアドレスでログイン')
                }
              </button>
              
              {resetMode && (
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(false);
                    setResetMessage(null);
                    setError(null);
                  }}
                  className="mt-2 flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  ログイン画面に戻る
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
