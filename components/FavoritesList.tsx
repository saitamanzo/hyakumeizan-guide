'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './auth/AuthProvider';
import type { Mountain } from '@/types/database';

interface FavoritesListProps {
  initialMountains: Mountain[];
}

export default function FavoritesList({ initialMountains }: FavoritesListProps) {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteMountains, setFavoriteMountains] = useState<Mountain[]>([]);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/signin';
    }
  }, [user, authLoading]);

  // お気に入り機能
  const toggleFavorite = (mountainId: string) => {
    if (!user) return;
    
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(mountainId)) {
        newFavorites.delete(mountainId);
      } else {
        newFavorites.add(mountainId);
      }
      // ユーザー固有のキーでローカルストレージに保存
      localStorage.setItem(`mountainFavorites_${user.id}`, JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  // ローカルストレージからお気に入りを読み込み
  useEffect(() => {
    if (!user) return;
    
    const savedFavorites = localStorage.getItem(`mountainFavorites_${user.id}`);
    if (savedFavorites) {
      const favoriteIds = new Set(JSON.parse(savedFavorites) as string[]);
      setFavorites(favoriteIds);
      
      // お気に入りの山をフィルタリング
      const filtered = initialMountains.filter(mountain => favoriteIds.has(mountain.id));
      setFavoriteMountains(filtered);
    }
  }, [initialMountains, user]);

  // お気に入りが変更されたときに再フィルタリング
  useEffect(() => {
    const filtered = initialMountains.filter(mountain => favorites.has(mountain.id));
    setFavoriteMountains(filtered);
  }, [favorites, initialMountains]);

  // 認証されていない場合は何も表示しない（リダイレクト中）
  if (!user) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>ログインページにリダイレクト中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            お気に入りの山
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            あなたがお気に入りに追加した山々（{favorites.size}件）
          </p>
        </div>

        {favoriteMountains.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">お気に入りがありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              <Link href="/mountains" className="text-indigo-600 hover:text-indigo-800">
                山一覧ページ
              </Link>
              でお気に入りの山を追加してください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteMountains.map((mountain) => (
              <Link
                key={mountain.id}
                href={`/mountains/${mountain.id}`}
                className="block group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
                  {/* お気に入りボタン */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(mountain.id);
                    }}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
                  >
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* 山の画像 */}
                  <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600">
                        {mountain.name}
                      </h2>
                      <span className="text-sm text-gray-600">
                        {mountain.elevation}m
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {mountain.prefecture}
                    </p>
                    <div className="flex items-center space-x-2">
                      {mountain.difficulty_level && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mountain.difficulty_level}
                        </span>
                      )}
                      {mountain.best_season && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {mountain.best_season}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
