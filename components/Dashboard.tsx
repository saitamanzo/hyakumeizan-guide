'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Mountain } from '@/types/database';
// 山画像URL正規化関数（MountainsList.tsxより移植）
function toBase64Url(url: string): string {
  if (typeof window === 'undefined') return '';
  return btoa(url);
}
const toDisplayImageUrl = (url: string | null | undefined, targetWidth = 640): { src: string; filePageUrl: string } | null => {
  if (!url) return null;
  let external: string | null = null;
  let filePageUrl: string | null = null;
  try {
    const u = new URL(url);
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/');
      const isThumb = parts.includes('thumb');
      const rawName = isThumb ? parts[parts.length - 2] : parts[parts.length - 1];
      const fileName = decodeURIComponent(rawName);
      if (fileName) {
        external = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`;
        filePageUrl = u.toString();
      }
    }
    if (!external && (u.hostname.endsWith('wikipedia.org') || u.hostname.endsWith('wikimedia.org'))) {
      if (/\/wiki\/Special:FilePath\//.test(u.pathname)) {
        try {
          const cu = new URL(url);
          if (!cu.searchParams.has('width')) {
            cu.searchParams.set('width', String(targetWidth));
            external = cu.toString();
          } else {
            external = url;
          }
          const name = cu.pathname.replace('/wiki/Special:FilePath/', '');
          if (name) filePageUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(decodeURIComponent(name))}`;
        } catch {
          external = url;
        }
      } else if (u.pathname.startsWith('/wiki/')) {
        const fileFromHash = u.hash && u.hash.startsWith('#/media/') ? decodeURIComponent(u.hash.replace('#/media/', '')) : '';
        const fileFromPath = decodeURIComponent(u.pathname.replace('/wiki/', ''));
        if (fileFromHash) {
          const fileName = fileFromHash.replace(/^ファイル:|^File:/i, '');
          external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`;
          filePageUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
        } else if (/^(?:ファイル:|File:)/i.test(fileFromPath)) {
          const fileName = fileFromPath.replace(/^ファイル:|^File:/i, '');
          external = `${u.protocol}//${u.hostname}/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${targetWidth}`;
          filePageUrl = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;
        }
      }
    }
  } catch {
    external = null;
  }
  if (!external) return null;
  const b64url = toBase64Url(external);
  if (!b64url) return null;
  return { src: `/api/image?u=${b64url}`, filePageUrl: filePageUrl || external };
};

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
    if (!user) return;
    const supabase = createClient();

    // 各種統計を取得
    const fetchStats = async () => {
      // お気に入り
      const { data: favData, error: favError } = await supabase
        .from('mountain_favorites')
        .select('mountain_id')
        .eq('user_id', user.id);
      const favoriteIds = (favData ?? []).map((like: { mountain_id: string }) => like.mountain_id);
      setStats((prev) => ({ ...prev, favoritesCount: favError ? 0 : favoriteIds.length }));
      setRecentFavorites(mountains.filter(m => favoriteIds.includes(m.id)).slice(0, 6));

      // レビュー
      const { count: reviewCount, error: reviewError } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setStats((prev) => ({ ...prev, reviewsCount: reviewError ? 0 : (reviewCount ?? 0) }));

      // 写真
      const { count: photoCount, error: photoError } = await supabase
        .from('climb_photos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setStats((prev) => ({ ...prev, uploadedImagesCount: photoError ? 0 : (photoCount ?? 0) }));
    };
    fetchStats();
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
              {recentFavorites.map((mountain) => {
                const imgObj = toDisplayImageUrl(mountain.photo_url, 640);
                return (
                  <Link
                    key={mountain.id}
                    href={`/mountains/${mountain.id}`}
                    className="block group"
                  >
                    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
                      {imgObj ? (
                        <div className="relative h-32 w-full">
                          <Image
                            src={imgObj.src}
                            alt={`${mountain.name} の写真`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover rounded-t-lg"
                            priority={false}
                            unoptimized={process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true'}
                          />
                        </div>
                      ) : (
                        <div className="h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-t-lg"></div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                          {mountain.name}
                        </h3>
                        <p className="text-sm text-gray-600">{mountain.prefecture}</p>
                        <p className="text-sm text-gray-500">{mountain.elevation}m</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
