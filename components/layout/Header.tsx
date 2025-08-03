'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import UserAvatar from '@/components/auth/UserAvatar';
import { useEffect, useState } from 'react';

export default function Header() {
  const { user, loading, forceStopLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // クライアントサイドであることを確認
    setIsClient(true);
  }, []);

  useEffect(() => {
    // 認証状態の監視
  }, [user, loading]);

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* ロゴ/サイト名 */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-bold text-xl text-gray-900">
                百名山ガイド
              </Link>
            </div>
            {/* メインナビゲーション */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/mountains"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
              >
                山一覧
              </Link>
              <Link
                href="/public-climbs"
                className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
              >
                みんなの記録
              </Link>
              {user && (
                <>
                  <Link
                    href="/favorites"
                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
                  >
                    お気に入り
                  </Link>
                  <Link
                    href="/plans"
                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
                  >
                    登山計画
                  </Link>
                  <Link
                    href="/climbs"
                    className="inline-flex items-center px-1 pt-1 text-gray-900 hover:text-gray-600"
                  >
                    登山記録
                  </Link>
                </>
              )}
            </div>
          </div>
          {/* 右側のナビゲーション */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {!isClient ? (
              // SSR時は何も表示しない（ハイドレーション問題を避ける）
              <div className="w-32 h-8"></div>
            ) : loading ? (
              // ローディング中はスケルトンを表示
              <div className="flex space-x-2 items-center">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                <button
                  onClick={forceStopLoading}
                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  title="ローディングが止まらない場合はクリック"
                >
                  停止
                </button>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-2">
                <UserAvatar />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/signin"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  新規登録
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
