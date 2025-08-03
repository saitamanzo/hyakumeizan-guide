'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OAuthSignIn from './OAuthSignIn';

const EXPERIENCE_LEVELS = ['初級', '中級', '上級', 'エキスパート'] as const;
type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('初級');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // フロントエンドでのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください（例: user@example.com）');
      setLoading(false);
      return;
    }
    
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください');
      setLoading(false);
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      // 1. ユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('ユーザーデータが取得できませんでした');
      }

      // まず既存のプロファイルをチェック
      const { error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // プロファイルが存在しない場合のみ作成
        const profileData = {
          id: authData.user.id,
          display_name: displayName,
          experience_level: experienceLevel,
          mountains_climbed: 0,
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert([profileData]);

        if (profileError) {
          throw profileError;
        }
      } else if (checkError) {
        throw checkError;
      }

      // セッション状態を確認
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session) {
        // 成功時はダッシュボードへリダイレクト
        router.push('/');
      } else {
        setError('アカウントが作成されました。確認メールが送信されていますので、メール内のリンクをクリックしてアカウントを有効化してください。');
      }

    } catch (error) {
      
      if (error instanceof Error) {
        let errorMessage = 'アカウントの作成に失敗しました';
        
        if (error.message.includes('User already registered')) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'パスワードは8文字以上で設定してください';
        } else if (error.message.includes('duplicate key value')) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (error.message.includes('Invalid email') || error.message.includes('is invalid')) {
          errorMessage = 'メールアドレスの形式が正しくありません。例: user@example.com';
        } else if (error.message.includes('Email address')) {
          errorMessage = 'メールアドレスの形式が正しくありません。有効なメールアドレスを入力してください';
        } else if (error.message.includes('Password')) {
          errorMessage = 'パスワードの形式が正しくありません。8文字以上の英数字を設定してください';
        } else {
          errorMessage = `登録エラー: ${error.message}`;
        }
        
        setError(errorMessage);
      } else {
        setError('アカウントの作成に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            新しいアカウントを作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link
              href="/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              既存のアカウントでログイン
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="山田太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="user@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                有効なメールアドレスを入力してください（例: user@gmail.com）
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="8文字以上"
              />
            </div>

            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700">
                登山経験レベル
              </label>
              <select
                id="experienceLevel"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '作成中...' : 'アカウントを作成'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">または</span>
              </div>
            </div>

            <div className="mt-6">
              <OAuthSignIn provider="google">
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 62.3l-66.5 64.6C305.5 114.6 279.8 100 248 100c-73 0-132.3 59.2-132.3 132S175 364 248 364c42.4 0 79.7-20.9 103.4-52.7H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.8z"></path></svg>
                Googleでサインアップ
              </OAuthSignIn>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
