'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Mountain } from '@/types/database';

interface DashboardStats {
  favoritesCount: number;
  reviewsCount: number;
  uploadedImagesCount: number;
}

interface DashboardProps {
  mountains: Mountain[];
}

export default function Dashboard({ mountains }: DashboardProps) {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    favoritesCount: 0,
    reviewsCount: 0,
    uploadedImagesCount: 0
  });
  const [recentFavorites, setRecentFavorites] = useState<Mountain[]>([]);

  useEffect(() => {
    // ログインしていない場合は統計を取得しない
    if (!user) return;

    // ローカルストレージからデータを取得
    const favorites = JSON.parse(localStorage.getItem('mountainFavorites') || '[]');
    const reviews = JSON.parse(localStorage.getItem('mountainReviews') || '[]');
    
    // 画像数をカウント
    let totalImages = 0;
    mountains.forEach(mountain => {
      const images = JSON.parse(localStorage.getItem(`mountain_images_${mountain.id}`) || '[]');
      totalImages += images.length;
    });

    setStats({
      favoritesCount: favorites.length,
      reviewsCount: reviews.length,
      uploadedImagesCount: totalImages
    });

    // 最近のお気に入りを取得
    const favoriteMountains = mountains.filter(mountain => favorites.includes(mountain.id));
    setRecentFavorites(favoriteMountains.slice(0, 6));
  }, [mountains, user]);

  // ログインしていない場合は何も表示しない
  if (!user && !loading) {
    return null;
  }

  // 読み込み中の場合はスケルトンを表示
  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color }: { 
    title: string; 
    value: number; 
    icon: string; 
    color: string; 
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${color}`}>
          <div className="text-white text-2xl">{icon}</div>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">あなたの登山活動をまとめて確認できます</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="お気に入りの山"
            value={stats.favoritesCount}
            icon="❤️"
            color="bg-red-500"
          />
          <StatCard
            title="投稿したレビュー"
            value={stats.reviewsCount}
            icon="⭐"
            color="bg-yellow-500"
          />
          <StatCard
            title="アップロードした写真"
            value={stats.uploadedImagesCount}
            icon="📸"
            color="bg-blue-500"
          />
        </div>

        {/* 最近のお気に入り */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">お気に入りの山</h2>
            <Link
              href="/favorites"
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              すべて見る →
            </Link>
          </div>
          
          {recentFavorites.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">まだお気に入りの山がありません</p>
              <Link
                href="/mountains"
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                山を探す
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFavorites.map((mountain) => (
                <Link
                  key={mountain.id}
                  href={`/mountains/${mountain.id}`}
                  className="block group"
                >
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
                    <div className="h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-t-lg"></div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                        {mountain.name}
                      </h3>
                      <p className="text-sm text-gray-600">{mountain.prefecture}</p>
                      <p className="text-sm text-gray-500">{mountain.elevation}m</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">クイックアクション</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/mountains"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl mr-3">🏔️</div>
              <div>
                <h3 className="font-medium text-gray-900">山を探す</h3>
                <p className="text-sm text-gray-500">新しい山を発見</p>
              </div>
            </Link>
            
            <Link
              href="/favorites"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl mr-3">❤️</div>
              <div>
                <h3 className="font-medium text-gray-900">お気に入り</h3>
                <p className="text-sm text-gray-500">保存した山を確認</p>
              </div>
            </Link>
            
            <Link
              href="/climbs"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl mr-3">📊</div>
              <div>
                <h3 className="font-medium text-gray-900">登山記録</h3>
                <p className="text-sm text-gray-500">登山の記録を管理</p>
              </div>
            </Link>
            
            <Link
              href="/plans"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl mr-3">🗺️</div>
              <div>
                <h3 className="font-medium text-gray-900">ルート計画</h3>
                <p className="text-sm text-gray-500">登山計画を立てる</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
