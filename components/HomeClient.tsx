'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Mountain } from '@/types/database';
import Dashboard from '@/components/Dashboard';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';

interface HomeClientProps {
  mountains: Mountain[];
}

export default function HomeClient({ mountains }: HomeClientProps) {
  const { user, loading, session } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // クライアントサイドであることを確認
    setIsClient(true);
  }, []);

  useEffect(() => {
    // ページがロードされた際に認証状態を確認（特別な処理は不要）
    if (isClient && user) {
      // URLクリーンアップ（認証関連のクエリパラメータを削除）
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.has('auth')) {
        currentParams.delete('auth');
        const newUrl = window.location.pathname + (currentParams.toString() ? '?' + currentParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [user, isClient]);

  // SSRとクライアントの不一致を避けるため、クライアントサイドでのみレンダリング
  if (!isClient) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  // ローディング中は簡潔なローディング表示
  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">認証状態を確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  // ログイン済みの場合（sessionとuserの両方をチェック）
  if (user && session) {
    return <Dashboard mountains={mountains} />;
  }

  // ログインしていない場合
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}
