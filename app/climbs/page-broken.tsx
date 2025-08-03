'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUserClimbRecords, deleteClimbRecord, updateClimbRecordPublicStatus } from '@/lib/climb-utils';
import { getThumbnailUrl, getOriginalUrl } from '@/lib/photo-utils';
import Image from 'next/image';

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
  photos: Array<{
    id: string;
    storage_path: string;
    thumbnail_path?: string;
    caption?: string;
  }>;
  createdAt: string;
  isPublic: boolean;
  publishedAt?: string;
}

export default function ClimbsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [climbs, setClimbs] = useState<ClimbRecordUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('📊 ClimbsPage状態:', { 
    authLoading, 
    user: user ? `ユーザーID: ${user.id}` : 'null', 
    loading, 
    shouldRedirect,
    climbsCount: climbs.length 
  });

  useEffect(() => {
    if (!authLoading && user) {
      loadClimbsFromDatabase();
    } else if (!authLoading && !user) {
      // ユーザーがログインしていない場合はリダイレクト
      setShouldRedirect(true);
    }
  }, [user, authLoading]);

  const loadClimbsFromDatabase = async () => {
    if (!user) return;

    console.log('🔄 データベースから登山記録を読み込み開始:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      const records = await getUserClimbRecords(user.id);
      console.log('✅ 登山記録取得成功:', records.length, '件');
      
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
      console.error('❌ データベース読み込みエラー:', dbError);
      setError(`データベースエラー: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
              duration: '', // 一旦固定値でテスト
              difficulty: 'easy' as const, // デフォルト値
              weather: record.weather_conditions || '',
              companions: '', // データベースにフィールドがないのでデフォルト値
              notes: record.notes || '',
              rating: record.difficulty_rating || 0,
              photos: record.photos || [], // データベースから取得した写真データを使用
              createdAt: record.created_at || new Date().toISOString(),
              isPublic: record.is_public || false,
              publishedAt: record.published_at,
            };
          } catch (conversionError) {
            console.warn('⚠️ 記録変換エラー:', conversionError, record);
            return null;
          }
        }).filter(Boolean) as ClimbRecordUI[];

        console.log('✅ 変換完了:', convertedClimbs.length, '件');
        console.log('📸 写真付き記録:', convertedClimbs.filter(r => r.photos && r.photos.length > 0).length, '件');
        convertedClimbs.forEach((climb, index) => {
          if (climb.photos && climb.photos.length > 0) {
            console.log(`📸 記録${index + 1} (${climb.mountainName}):`, climb.photos.length, '枚の写真');
          }
        });
        setClimbs(convertedClimbs);
      } catch (dbError) {
        console.error('❌ データベース読み込みエラー:', dbError);
        setError(`データベースエラー: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    // 認証ローディングが完了した場合のみ処理
    if (!authLoading) {
      console.log('🔐 認証確認完了:', user ? 'ログイン済み' : '未ログイン');
      if (user) {
        // ユーザーが存在する場合はデータをロード
        loadClimbsFromDatabase();
      } else {
        // ユーザーが存在しない場合は遅延リダイレクト
        console.log('⏳ リダイレクト準備中...');
        setShouldRedirect(true);
      }
    }
  }, [user, authLoading]);

  // リダイレクトフラグが立った場合の処理
  useEffect(() => {
    if (shouldRedirect && !authLoading && !user) {
      console.log('🔄 ログインページにリダイレクト中...');
      const timeoutId = setTimeout(() => {
        router.push('/signin');
      }, 500); // 1秒から0.5秒に短縮
      return () => clearTimeout(timeoutId);
    }
  }, [shouldRedirect, authLoading, user, router]);

  // 認証状態の初期確認中はローディング表示
  if (authLoading) {
    console.log('🔐 認証確認中表示');
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">認証確認中...</span>
          </div>
        </div>
      </div>
    );
  }

  // 認証されていない場合はリダイレクト表示
  if (!user) {
    console.log('👤 未認証ユーザー - リダイレクト表示');
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-blue-800 mb-2">認証が必要です</h3>
            <p className="text-blue-700 mb-4">登山記録を閲覧するにはログインが必要です。</p>
            <div className="space-x-4">
              <button
                onClick={() => router.push('/signin')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                ログインページへ
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                新規登録
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // データローディング中
  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">データ読込中...</span>
          </div>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">データ読み込みエラー</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  const togglePublicStatus = async (climbId: string, currentStatus: boolean) => {
    try {
      const success = await updateClimbRecordPublicStatus(climbId, !currentStatus);
      if (success) {
        setClimbs(climbs.map(climb => 
          climb.id === climbId 
            ? { ...climb, isPublic: !currentStatus, publishedAt: !currentStatus ? new Date().toISOString() : undefined }
            : climb
        ));
      } else {
        alert('公開状態の変更に失敗しました');
      }
    } catch {
      alert('公開状態の変更に失敗しました');
    }
  };

  const deleteClimb = async (climbId: string | undefined) => {
    if (!climbId) return;
    
    if (confirm('この登山記録を削除しますか？')) {
      try {
        // データベースから削除を試行
        const success = await deleteClimbRecord(climbId);
        if (success) {
          setClimbs(climbs.filter(climb => climb.id !== climbId));
        } else {
          alert('登山記録の削除に失敗しました');
        }
      } catch {
        alert('登山記録の削除に失敗しました');
      }
    }
  };



  const getDifficultyBadge = (difficulty: string) => {
    const badges = {
      easy: 'bg-green-100 text-green-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      hard: 'bg-red-100 text-red-700'
    };
    const labels = {
      easy: '初級',
      moderate: '中級', 
      hard: '上級'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badges[difficulty as keyof typeof badges]}`}>
        {labels[difficulty as keyof typeof labels]}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">登山記録</h1>
          <Link
            href="/mountains"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            新しい記録を作成
          </Link>
        </div>

        {climbs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">登山記録がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              山の詳細ページから登山記録を作成してください。
            </p>
            <div className="mt-6">
              <Link
                href="/mountains"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                山を探す
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {climbs.map((climb) => (
              <div key={climb.id} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        <Link 
                          href={`/mountains/${climb.mountainId}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {climb.mountainName}
                        </Link>
                      </h3>
                      {getDifficultyBadge(climb.difficulty)}
                      {climb.isPublic && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          公開中
                        </span>
                      )}
                    </div>
                    {renderStars(climb.rating)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => togglePublicStatus(climb.id, climb.isPublic)}
                      className={`p-2 rounded transition-colors ${
                        climb.isPublic 
                          ? 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      title={climb.isPublic ? '公開を停止' : '公開する'}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        {climb.isPublic ? (
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        ) : (
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        )}
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteClimb(climb.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">登山日</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      {new Date(climb.date).toLocaleDateString('ja-JP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">所要時間</dt>
                    <dd className="mt-1 text-base text-gray-900">{climb.duration}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">天候</dt>
                    <dd className="mt-1 text-base text-gray-900">{climb.weather}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ルート</dt>
                    <dd className="mt-1 text-base text-gray-900">{climb.route}</dd>
                  </div>
                </div>

                {climb.companions && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500">同行者</dt>
                    <dd className="mt-1 text-base text-gray-900">{climb.companions}</dd>
                  </div>
                )}

                {climb.notes && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500">記録・感想</dt>
                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {climb.notes}
                    </dd>
                  </div>
                )}

                {climb.photos && climb.photos.length > 0 && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500 mb-2">写真</dt>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {climb.photos.slice(0, 4).map((photo, index) => {
                        const imageUrl = photo.thumbnail_path 
                          ? getThumbnailUrl(photo.thumbnail_path) 
                          : getOriginalUrl(photo.storage_path);
                        
                        console.log(`📷 写真${index + 1} URL:`, imageUrl);
                        
                        return (
                          <div key={photo.id || index} className="relative h-20 rounded-md overflow-hidden">
                            <Image
                              src={imageUrl}
                              alt={photo.caption || `${climb.mountainName}の写真 ${index + 1}`}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('📷 画像読み込みエラー:', imageUrl);
                                // エラー時の代替表示
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-mountain.jpg'; // プレースホルダー画像
                              }}
                            />
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                {photo.caption}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {climb.photos.length > 4 && (
                        <div className="relative h-20 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          <span className="text-sm text-gray-600">+{climb.photos.length - 4}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>登録日: {new Date(climb.createdAt).toLocaleDateString('ja-JP')}</span>
                    <Link
                      href={`/mountains/${climb.mountainId}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      山の詳細を見る →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
