
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import SocialShareButtonsCompact from '@/components/SocialShareButtons';
import AuthErrorPage from '@/components/AuthErrorPage';
import { getUserClimbRecords, ClimbRecordWithMountain, deleteClimbRecord, updateClimbRecordPublicStatus } from '@/lib/climb-utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  isClimbFavoritedByUser,
  getClimbFavoriteCount,
  toggleClimbFavorite,
} from '@/lib/climb-favorite-utils';



export default function ClimbsPage() {
  // --- 追加: 操作用ハンドラ ---
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [uiMessage, setUiMessage] = useState<string|null>(null);

  async function handleDeleteClimb(climbId: string) {
    if (actionLoading[climbId]) return;
    if (!window.confirm('この登山記録を削除します。よろしいですか？')) return;
    setActionLoading((prev) => ({ ...prev, [climbId]: true }));
    setUiMessage(null);
    const ok = await deleteClimbRecord(climbId);
    setActionLoading((prev) => ({ ...prev, [climbId]: false }));
    if (ok) {
      setClimbs((prev) => prev.filter((c) => c.id !== climbId));
      setUiMessage('削除しました');
    } else {
      setUiMessage('削除に失敗しました');
    }
  }

  async function handleTogglePublic(climbId: string, isPublic: boolean) {
    if (actionLoading[climbId]) return;
    setActionLoading((prev) => ({ ...prev, [climbId]: true }));
    setUiMessage(null);
    const ok = await updateClimbRecordPublicStatus(climbId, !isPublic);
    setActionLoading((prev) => ({ ...prev, [climbId]: false }));
    if (ok) {
      setClimbs((prev) => prev.map((c) => c.id === climbId ? { ...c, is_public: !isPublic } : c));
      setUiMessage(!isPublic ? '公開にしました' : '非公開にしました');
    } else {
      setUiMessage('公開/非公開切替に失敗しました');
    }
  }

  function handleShareClimb(climb: ClimbRecordWithMountain) {
    if (!climb.is_public) {
      setUiMessage('公開中の記録のみSNS投稿できます');
      return;
    }
    const url = `${window.location.origin}/public-climbs?highlight=${climb.id}`;
    const text = `${climb.mountain_name || ''}の登山記録をシェア！`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  }
  const { user, loading } = useAuth();
  const [climbs, setClimbs] = useState<ClimbRecordWithMountain[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // お気に入り状態・数を記録するstate
  const [favoriteStates, setFavoriteStates] = useState<Record<string, { count: number; isFav: boolean }>>({});
  const [favLoading, setFavLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    setError(null);
    getUserClimbRecords(user.id)
      .then((records) => setClimbs(records))
      .catch(() => setError('データの読み込みに失敗しました'))
      .finally(() => setFetching(false));
  }, [user]);

  // climbs取得後に各記録のお気に入り状態・数を取得
  useEffect(() => {
    if (!user || climbs.length === 0) return;
    const fetchFavs = async () => {
      const states: Record<string, { count: number; isFav: boolean }> = {};
      await Promise.all(
        climbs.map(async (climb) => {
          if (!climb.id) return; // idがundefinedの場合はスキップ
          const [count, isFav] = await Promise.all([
            getClimbFavoriteCount(climb.id as string),
            isClimbFavoritedByUser(climb.id as string, user.id),
          ]);
          states[climb.id as string] = { count, isFav };
        })
      );
      setFavoriteStates(states);
    };
    fetchFavs();
  }, [climbs, user]);

  if (loading || fetching) {
    return <div className="py-8 flex justify-center items-center h-64">データ読込中...</div>;
  }
  if (!user) {
    return <AuthErrorPage />;
  }
  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">エラー</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">自分の登山記録</h1>
              <p className="mt-2 text-gray-600">あなたが登録した登山記録一覧です</p>
            </div>
            <Link href="/climbs/new" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition-colors font-medium text-sm text-center">
              ＋ 新規記録作成
            </Link>
          </div>
        </div>
        {climbs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">記録がありません</h3>
            <p className="mt-1 text-sm text-gray-500">まだ登山記録が登録されていません。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {climbs.map((climb) => (
              <div key={climb.id || 'unknown'} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        <Link 
                          href={`/mountains/${climb.mountain_id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {climb.mountain_name}
                        </Link>
                      </h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        {climb.difficulty_rating ? `難易度: ${climb.difficulty_rating}` : ''}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {climb.climb_date && new Date(climb.climb_date).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  {/* 操作ボタン群（作成者のみ表示） */}
                  {climb.user_id === user.id && (
                    <div className="flex items-center space-x-3 mt-2">
                      {/* SNSシェア */}
                      <SocialShareButtonsCompact type="climb" data={climb} ownerId={user.id} />
                      {/* 編集 */}
                      <Link href={climb.id ? `/climbs/edit/${climb.id}` : '#'} title="編集" className={`flex items-center px-2 py-1 rounded text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm${!climb.id ? ' pointer-events-none opacity-50' : ''}`}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                        </svg>
                        編集
                      </Link>
                      {/* 公開/非公開切替 */}
                      <button title={climb.is_public ? '非公開にする' : '公開する'} className={`flex items-center px-2 py-1 rounded text-sm ${climb.is_public ? 'text-green-600 hover:text-gray-600 hover:bg-gray-50' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'}`} onClick={() => climb.id && typeof climb.is_public === 'boolean' && handleTogglePublic(climb.id!, climb.is_public!)} disabled={!climb.id || typeof climb.is_public !== 'boolean' || actionLoading[climb.id!] }>
                        {climb.is_public ? (
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 7.293a1 1 0 00-1.414 0L9 12.586 7.707 11.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {actionLoading[climb.id!] ? '処理中...' : (climb.is_public ? '公開中' : '非公開')}
                      </button>
                      {/* 削除 */}
                      <button title="削除" className="flex items-center px-2 py-1 rounded text-red-600 hover:text-white hover:bg-red-600 transition-colors text-sm" onClick={() => climb.id && handleDeleteClimb(climb.id!)} disabled={!climb.id || actionLoading[climb.id!] }>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        削除
                      </button>
                    </div>
                  )}
      {/* UIメッセージ表示 */}
      {uiMessage && (
        <div className="my-4 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-center text-sm">
          {uiMessage}
        </div>
      )}
                </div>
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
                        const imageUrl = photo.thumbnail_path || photo.storage_path;
                        return (
                          <div key={photo.id || index} className="relative h-20 rounded-md overflow-hidden">
                            <Image
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/climb-photos/${imageUrl}`}
                              alt={photo.caption || `${climb.mountain_name}の写真 ${index + 1}`}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class=\"w-full h-full bg-gray-200 rounded-md flex items-center justify-center\"><span class=\"text-gray-500 text-sm\">📷</span></div>';
                                }
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
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/mountains/${climb.mountain_id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      この山の詳細を見る →
                    </Link>
                    {/* お気に入りボタン */}
                    <button
                      className="flex items-center space-x-1 text-gray-500 hover:text-pink-500 transition-colors text-sm focus:outline-none"
                      aria-label={favoriteStates[climb.id as string]?.isFav ? 'お気に入り解除' : 'お気に入り'}
                      disabled={favLoading[climb.id as string]}
                      onClick={async () => {
                        if (!user || !climb.id) return;
                        setFavLoading((prev) => ({ ...prev, [climb.id as string]: true }));
                        const newFav = await toggleClimbFavorite(climb.id as string, user.id);
                        const newCount = await getClimbFavoriteCount(climb.id as string);
                        setFavoriteStates((prev) => ({
                          ...prev,
                          [climb.id as string]: { count: newCount, isFav: newFav },
                        }));
                        setFavLoading((prev) => ({ ...prev, [climb.id as string]: false }));
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill={favoriteStates[climb.id as string]?.isFav ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className={`w-5 h-5 ${favoriteStates[climb.id as string]?.isFav ? 'text-pink-500' : 'text-gray-400'}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                        />
                      </svg>
                      <span>{favoriteStates[climb.id as string]?.count ?? 0}</span>
                    </button>
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