'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getUserPlans, deletePlan, updatePlanPublicStatus, PlanWithMountain } from '@/lib/plan-utils';

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithMountain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const userPlans = await getUserPlans(user.id);
      setPlans(userPlans);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('登山計画の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadPlans();
      } else {
        router.push('/signin');
      }
    }
  }, [user, authLoading, router, loadPlans]);

  // 認証状態の初期確認中はローディング表示
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

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('この登山計画を削除しますか？')) return;

    try {
      await deletePlan(planId);
      setPlans(plans.filter(plan => plan.id !== planId));
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('登山計画の削除に失敗しました');
    }
  };

  const handleTogglePublic = async (planId: string, currentIsPublic: boolean) => {
    try {
      await updatePlanPublicStatus(planId, !currentIsPublic);
      setPlans(plans.map(plan => 
        plan.id === planId 
          ? { ...plan, is_public: !currentIsPublic }
          : plan
      ));
    } catch (err) {
      console.error('Error updating plan public status:', err);
      setError('公開設定の更新に失敗しました');
    }
  };

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={loadPlans}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (date: string) => {
    const planDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (planDate < today) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">完了</span>;
    } else if (planDate.toDateString() === today.toDateString()) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">今日</span>;
    } else if (planDate.toDateString() === tomorrow.toDateString()) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">明日</span>;
    } else {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">予定</span>;
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">登山計画</h1>
          <Link
            href="/mountains"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            新しい計画を作成
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l6-6m0 0l6 6m-6-6v12" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">登山計画がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              山の詳細ページから登山計画を作成してください。
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
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        <Link 
                          href={`/mountains/${plan.mountain_id}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {plan.mountain_name}
                        </Link>
                      </h3>
                      {getStatusBadge(plan.planned_date || '')}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      作成日: {plan.created_at ? new Date(plan.created_at).toLocaleDateString('ja-JP') : '-'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTogglePublic(plan.id!, plan.is_public || false)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        plan.is_public
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {plan.is_public ? '公開中' : '非公開'}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">登山日</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      {plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('ja-JP', { 
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      }) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">出発時刻</dt>
                    <dd className="mt-1 text-base text-gray-900">{plan.route_plan || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">予想所要時間</dt>
                    <dd className="mt-1 text-base text-gray-900">{plan.estimated_duration ? `${Math.round(plan.estimated_duration / 60)}時間` : '-'}</dd>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ルート</dt>
                    <dd className="mt-1 text-base text-gray-900">{plan.route_plan || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">装備（{plan.equipment_list?.length || 0}点）</dt>
                    <dd className="mt-1">
                      <div className="flex flex-wrap gap-1">
                        {plan.equipment_list && plan.equipment_list.slice(0, 6).map((item: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {item}
                          </span>
                        ))}
                        {plan.equipment_list && plan.equipment_list.length > 6 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{plan.equipment_list.length - 6}
                          </span>
                        )}
                      </div>
                    </dd>
                  </div>
                </div>

                {plan.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">メモ</dt>
                    <dd className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {plan.notes}
                    </dd>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <Link
                        href={`/mountains/${plan.mountain_id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        山の詳細を見る →
                      </Link>
                      <button
                        onClick={() => {
                          const weatherUrl = `https://weather.yahoo.co.jp/weather/`;
                          window.open(weatherUrl, '_blank');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        天気予報を確認 →
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {plan.planned_date && new Date(plan.planned_date).getTime() > new Date().getTime() ? (
                        `あと${Math.ceil((new Date(plan.planned_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日`
                      ) : (
                        '完了済み'
                      )}
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
