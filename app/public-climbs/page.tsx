'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublicClimbRecords, ClimbRecordWithMountain } from '@/lib/climb-utils';
import LikeButton from '@/components/LikeButton';
import { SocialShareButtonsCompact } from '@/components/SocialShareButtons';
import { getClimbComments, addClimbComment } from '@/lib/comment-utils';
import { useAuth } from '@/components/auth/AuthProvider';
import Image from 'next/image';


export default function PublicClimbsPage() {
  const [climbs, setClimbs] = useState<ClimbRecordWithMountain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'new' | 'like'>('new');
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsCache, setCommentsCache] = useState<Record<string, { content: string; author: string; created_at: string }[]>>({});

  useEffect(() => {
    const loadPublicClimbs = async () => {
      setLoading(true);
      setError(null);
      try {
        const records = await getPublicClimbRecords(50);
        setClimbs(records);
      } catch {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    loadPublicClimbs();
  }, []);

  // 検索・並べ替え適用
  const filteredClimbs = climbs
    .filter(climb => {
      if (!search) return true;
      const keyword = search.toLowerCase();
      return (
        (climb.mountain_name && climb.mountain_name.toLowerCase().includes(keyword)) ||
        (climb.user?.display_name && climb.user.display_name.toLowerCase().includes(keyword)) ||
        (climb.notes && climb.notes.toLowerCase().includes(keyword))
      );
    })
    .sort((a, b) => {
      if (sortKey === 'like') {
        // いいね数降順（未取得の場合は0扱い）
        return (b.like_count || 0) - (a.like_count || 0);
      } else {
        // 新着順（published_at降順）
        return (b.published_at ? new Date(b.published_at).getTime() : 0) - (a.published_at ? new Date(a.published_at).getTime() : 0);
      }
    });

  const getDifficultyBadge = (rating?: number) => {
    if (!rating) return null;
    
    const difficulty = rating <= 2 ? 'easy' : rating <= 4 ? 'moderate' : 'hard';
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
      <span className={`px-2 py-1 text-xs rounded-full ${badges[difficulty]}`}>
        {labels[difficulty]}
      </span>
    );
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
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
          <h1 className="text-3xl font-bold text-gray-900">みんなの登山記録</h1>
          <p className="mt-2 text-gray-600">他の登山者が公開している登山記録を見ることができます</p>
        </div>
        {/* 検索・並べ替えUI */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="山名・ユーザー名・内容で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full md:w-72 text-sm"
          />
          <div className="flex gap-2 ml-auto">
            <button
              className={`px-3 py-2 rounded text-sm font-medium border ${sortKey === 'new' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => setSortKey('new')}
            >新着順</button>
            <button
              className={`px-3 py-2 rounded text-sm font-medium border ${sortKey === 'like' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => setSortKey('like')}
            >いいね順</button>
          </div>
        </div>
        {filteredClimbs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">公開記録がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              まだ公開されている登山記録がありません。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredClimbs.map((climb) => (
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
                      {getDifficultyBadge(climb.difficulty_rating)}
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        公開記録
                      </span>
                    </div>
                    {renderStars(climb.difficulty_rating)}
                    <div className="mt-2 text-sm text-gray-500">
                      by {climb.user?.display_name || '匿名ユーザー'} • 
                      {climb.published_at && (
                        <span> {new Date(climb.published_at).toLocaleDateString('ja-JP')} 公開</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">登山日</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      {climb.climb_date && new Date(climb.climb_date).toLocaleDateString('ja-JP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">天候</dt>
                    <dd className="mt-1 text-base text-gray-900">{climb.weather_conditions || '-'}</dd>
                  </div>
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
                        // Supabaseの公開URLを直接使用
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
                                console.error('📷 画像読み込みエラー:', imageUrl);
                                const target = e.target as HTMLImageElement;
                                // プレースホルダー画像に置き換え
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full bg-gray-200 rounded-md flex items-center justify-center"><span class="text-gray-500 text-sm">📷</span></div>';
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
                    <div className="flex items-center space-x-4">
                      {/* いいねボタン */}
                      <LikeButton
                        type="climb"
                        contentId={climb.id || ''}
                        contentOwnerId={climb.user?.id}
                        size="medium"
                        variant="outline"
                      />
                      
                      {/* ソーシャルシェアボタン（作成者のみ） */}
                      <SocialShareButtonsCompact
                        type="climb"
                        data={climb}
                        ownerId={climb.user?.id || ''}
                      />
                    </div>
                    <Link
                      href={`/mountains/${climb.mountain_id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      この山の詳細を見る →
                    </Link>
                  </div>
                  {/* コメント */}
                  <div className="mt-4">
                    <button
                      className="text-xs text-gray-600 hover:text-gray-800"
                      onClick={async () => {
                        if (!climb.id) return;
                        if (commentsCache[climb.id]) return;
                        const list = await getClimbComments(climb.id);
                        setCommentsCache(prev => ({
                          ...prev,
                          [climb.id!]: list.map(c => ({
                            content: c.content,
                            author: c.user?.nickname || c.user?.display_name || '匿名',
                            created_at: c.created_at,
                          }))
                        }));
                      }}
                    >
                      コメントを表示/更新
                    </button>
                    {climb.id && commentsCache[climb.id] && (
                      <div className="mt-2 space-y-2">
                        {commentsCache[climb.id].length === 0 && (
                          <div className="text-xs text-gray-500">まだコメントはありません</div>
                        )}
                        {commentsCache[climb.id].map((c, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 rounded p-2">
                            <div className="text-gray-800 whitespace-pre-wrap">{c.content}</div>
                            <div className="text-xs text-gray-500 mt-1">by {c.author} • {new Date(c.created_at).toLocaleString('ja-JP')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={climb.id ? (commentInputs[climb.id] || '') : ''}
                        onChange={(e) => climb.id && setCommentInputs(prev => ({ ...prev, [climb.id!]: e.target.value }))}
                        placeholder="コメントを入力..."
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={async () => {
                          if (!user) { alert('コメントにはログインが必要です'); return; }
                          if (!climb.id) return;
                          const content = (commentInputs[climb.id] || '').trim();
                          if (!content) return;
                          const res = await addClimbComment(climb.id, user.id, content);
                          if (res.success) {
                            setCommentInputs(prev => ({ ...prev, [climb.id!]: '' }));
                            // 再取得
                            const list = await getClimbComments(climb.id);
                            setCommentsCache(prev => ({
                              ...prev,
                              [climb.id!]: list.map(c => ({
                                content: c.content,
                                author: c.user?.nickname || c.user?.display_name || '匿名',
                                created_at: c.created_at,
                              }))
                            }));
                          } else {
                            alert('コメント投稿に失敗しました');
                          }
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded text-sm"
                      >
                        投稿
                      </button>
                    </div>
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
