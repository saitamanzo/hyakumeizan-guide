'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSearchParams } from 'next/navigation';
import type { Mountain } from '@/types/database';
import Dashboard from '@/components/Dashboard';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';

interface HomeClientProps {
  mountains: Mountain[];
}

export default function HomeClient({ mountains }: HomeClientProps) {
  const { user, loading, session } = useAuth();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // クライアントサイドであることを確認
    setIsClient(true);
  }, []);

  useEffect(() => {
    // OAuth認証成功時の処理
    if (isClient) {
      const authSuccess = searchParams.get('auth');
      if (authSuccess === 'success' && user) {
        // URLクリーンアップ（オプション）
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, user, isClient]);

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
