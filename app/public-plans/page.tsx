'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublicPlans, PlanWithMountain } from '@/lib/plan-utils';
import LikeButton from '@/components/LikeButton';
import { useAuth } from '@/components/auth/AuthProvider';

export default function PublicPlansPage() {
  const [plans, setPlans] = useState<PlanWithMountain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'new' | 'like'>('new');
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const loadPublicPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const records = await getPublicPlans(50);
        setPlans(records);
      } catch  {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    loadPublicPlans();
  }, []);

 const getDifficultyBadge = (level?: 'easy' | 'moderate' | 'hard') => {
  if (!level) return null;
  const badges: Record<'easy' | 'moderate' | 'hard', string> = {
    easy: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };
  const labels: Record<'easy' | 'moderate' | 'hard', string> = {
    easy: '初級',
    moderate: '中級',
    hard: '上級',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${badges[level]}`}>{labels[level]}</span>
  );
　};

  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  // 検索・並べ替え適用
  const filteredPlans = plans
    .filter(plan => {
      if (!search) return true;
      const keyword = search.toLowerCase();
      return (
        (plan.title && plan.title.toLowerCase().includes(keyword)) ||
        (plan.mountain_name && plan.mountain_name.toLowerCase().includes(keyword)) ||
        (plan.user?.display_name && plan.user.display_name.toLowerCase().includes(keyword)) ||
        (plan.description && plan.description.toLowerCase().includes(keyword))
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

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">みんなの登山計画</h1>
          <p className="mt-2 text-gray-600">他の登山者が公開している登山計画を見ることができます</p>
        </div>
        {/* 検索・並べ替えUI */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="山名・タイトル・ユーザー名・内容で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full md:w-72 text-sm"
          />
          <div className="flex gap-2 ml-auto">
            <button
              className={`px-3 py-2 rounded text-sm font-medium border ${sortKey === 'new' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => setSortKey('new')}
            >新着順</button>
            <button
              className={`px-3 py-2 rounded text-sm font-medium border ${sortKey === 'like' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => setSortKey('like')}
            >いいね順</button>
          </div>
        </div>
        {filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">公開計画がありません</h3>
            <p className="mt-1 text-sm text-gray-500">まだ公開されている登山計画がありません。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPlans.map((plan) => (
              <div key={plan.id || 'unknown'} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        <Link 
                          href={`/mountains/${plan.mountain_id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {plan.mountain_name}
                        </Link>
                      </h3>
                      {getDifficultyBadge(plan.difficulty_level)}
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        公開計画
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      by {plan.user?.display_name || '匿名ユーザー'} • 
                      {plan.published_at && (
                        <span> {new Date(plan.published_at).toLocaleDateString('ja-JP')} 公開</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">計画日</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      {plan.planned_date && new Date(plan.planned_date).toLocaleDateString('ja-JP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">想定所要時間</dt>
                    <dd className="mt-1 text-base text-gray-900">{plan.estimated_duration ? `${plan.estimated_duration}分` : '-'}</dd>
                  </div>
                </div>
                {plan.description && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500">計画内容</dt>
                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {plan.description}
                    </dd>
                  </div>
                )}
                {plan.notes && (
                  <div className="mb-4">
                    <dt className="text-sm font-medium text-gray-500">備考</dt>
                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {plan.notes}
                    </dd>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/mountains/${plan.mountain_id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      この山の詳細を見る →
                    </Link>
                    {/* 他者の計画のみLikeButtonを表示（未ログイン時は全て非表示） */}
                    {user && plan.user_id && plan.user_id !== user.id && (
                      <LikeButton type="plan" contentId={plan.id || ''} contentOwnerId={plan.user_id || ''} size="small" variant="outline" />
                    )}
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
