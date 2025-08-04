'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUserClimbRecords, deleteClimbRecord, updateClimbRecordPublicStatus } from '@/lib/climb-utils';
import { SocialShareButtonsCompact } from '@/components/SocialShareButtons';

// UI表示用の型定義
interface ClimbRecordUI {
  id: string;
  mountainId: string;
  mountainName: string;
  date: string;
  route: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  weather: string;
  companions: string;
  notes: string;
  rating: number;
  photos: ClimbPhotoUI[];
  createdAt: string;
  isPublic: boolean;
  publishedAt?: string;
}

// 写真用の型定義
interface ClimbPhotoUI {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  caption?: string;
  sort_order?: number;
}

export default function ClimbsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [climbs, setClimbs] = useState<ClimbRecordUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClimbsFromDatabase = useCallback(async () => {
    if (!user) {
      console.log('ClimbsPage: ユーザーなし、記録読み込みスキップ');
      return;
    }

    console.log('ClimbsPage: 記録読み込み開始 - userID:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      const records = await getUserClimbRecords(user.id);
      console.log('ClimbsPage: 記録読み込み成功 -', records.length, '件');
      
      // データベースの形式からUIの形式に変換
      const convertedClimbs: ClimbRecordUI[] = records.map((record, index) => ({
        id: record.id || `temp-${index}`,
        mountainId: record.mountain_id || '',
        mountainName: record.mountain_name || '不明',
        date: record.climb_date || new Date().toISOString().split('T')[0],
        route: '一般ルート',
        duration: '',
        difficulty: 'easy' as const,
        weather: record.weather_conditions || '',
        companions: '',
        notes: record.notes || '',
        rating: record.difficulty_rating || 0,
        photos: record.photos || [],
        createdAt: record.created_at || new Date().toISOString(),
        isPublic: record.is_public || false,
        publishedAt: record.published_at
      }));
      
      setClimbs(convertedClimbs);
    } catch (dbError) {
      console.error('ClimbsPage: データベース読み込みエラー:', dbError);
      setError(`データベースエラー: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadClimbsFromDatabase();
      } else {
        router.push('/signin');
      }
    }
  }, [user, authLoading, router, loadClimbsFromDatabase]);

  const handleDelete = async (climbId: string) => {
    if (!confirm('この登山記録を削除しますか？')) return;

    try {
      const success = await deleteClimbRecord(climbId);
      if (success) {
        setClimbs(climbs.filter(climb => climb.id !== climbId));
      } else {
        alert('登山記録の削除に失敗しました');
      }
    } catch {
      alert('登山記録の削除に失敗しました');
    }
  };

  const handleTogglePublic = async (climbId: string, currentIsPublic: boolean) => {
    try {
      await updateClimbRecordPublicStatus(climbId, !currentIsPublic);
      setClimbs(climbs.map(climb => 
        climb.id === climbId 
          ? { ...climb, isPublic: !currentIsPublic }
          : climb
      ));
    } catch (err) {
      console.error('公開設定の更新に失敗しました:', err);
      alert('公開設定の更新に失敗しました');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">読込中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={loadClimbsFromDatabase}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">登山記録</h1>
          <Link
            href="/mountains"
            className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            新しい記録を追加
          </Link>
        </div>

        {climbs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              まだ登山記録がありません
            </div>
            <Link
              href="/mountains"
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              山を探して記録を追加する
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {climbs.map((climb) => (
              <div key={climb.id} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      <Link 
                        href={`/mountains/${climb.mountainId}`}
                        className="hover:text-orange-600 transition-colors"
                      >
                        {climb.mountainName}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      登山日: {new Date(climb.date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* ソーシャルシェアボタン */}
                    <SocialShareButtonsCompact
                      type="climb"
                      data={{
                        id: climb.id,
                        mountain_id: climb.mountainId,
                        mountain_name: climb.mountainName,
                        climb_date: climb.date,
                        difficulty_rating: climb.difficulty === 'easy' ? 1 : climb.difficulty === 'moderate' ? 3 : 5,
                        weather_conditions: climb.weather,
                        notes: climb.notes,
                        user_id: user?.id || '',
                        is_public: climb.isPublic,
                        created_at: climb.createdAt
                      }}
                      ownerId={user?.id || ''}
                    />
                    
                    <button
                      onClick={() => handleTogglePublic(climb.id, climb.isPublic)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        climb.isPublic
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {climb.isPublic ? '公開中' : '非公開'}
                    </button>
                    <button
                      onClick={() => handleDelete(climb.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {climb.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">メモ</h4>
                    <p className="text-gray-600">{climb.notes}</p>
                  </div>
                )}

                {climb.weather && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">天気</h4>
                    <p className="text-gray-600">{climb.weather}</p>
                  </div>
                )}

                {climb.photos && climb.photos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">写真 ({climb.photos.length}枚)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {climb.photos.slice(0, 4).map((photo, index) => {
                        // Supabaseの公開URLを直接使用
                        const imageUrl = photo.thumbnail_path || photo.storage_path;
                        
                        return (
                          <div key={photo.id || index} className="relative aspect-square">
                            {imageUrl ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/climb-photos/${imageUrl}`}
                                alt={photo.caption || `${climb.mountainName}の写真 ${index + 1}`}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  console.error('📷 画像読み込みエラー:', imageUrl);
                                  const target = e.target as HTMLImageElement;
                                  // プレースホルダー画像に置き換え
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center"><span class="text-gray-500 text-sm">📷</span></div>';
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-gray-500 text-sm">📷</span>
                              </div>
                            )}
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {climb.photos.length > 4 && (
                        <div className="relative aspect-square">
                          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                            <span className="text-gray-600 text-sm">+{climb.photos.length - 4}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
