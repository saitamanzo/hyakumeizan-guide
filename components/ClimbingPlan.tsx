'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { savePlan, getUserPlans, deletePlan, PlanWithMountain } from '@/lib/plan-utils';
import LikeButton from './LikeButton';
import { SocialShareButtonsCompact } from './SocialShareButtons';

interface ClimbingPlanProps {
  mountainName: string;
  mountainId: string;
  difficulty: string;
  elevation: number;
}

interface PlanData {
  date: string;
  startTime: string;
  estimatedDuration: string;
  route: string;
  equipment: string[];
  notes: string;
}

export default function ClimbingPlan({ mountainName, mountainId, difficulty, elevation }: ClimbingPlanProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [savedPlans, setSavedPlans] = useState<PlanWithMountain[]>([]);
  const [plan, setPlan] = useState<PlanData>({
    date: '',
    startTime: '06:00',
    estimatedDuration: '6',
    route: '一般ルート',
    equipment: [],
    notes: ''
  });

  const equipmentOptions = [
    '登山靴', 'ザック', '雨具', 'ヘッドライト', '地図・コンパス',
    '救急用品', '非常食', '水筒', '防寒着', 'サングラス',
    'トレッキングポール', 'ヘルメット', 'ロープ', 'ハーネス'
  ];

  // 保存済み計画を読み込む
  const loadSavedPlans = useCallback(async () => {
    if (!user) return;
    
    try {
      const plans = await getUserPlans(user.id);
      // 指定した山の計画のみフィルタリング
      const mountainPlans = plans.filter(plan => plan.mountain_id === mountainId);
      setSavedPlans(mountainPlans);
    } catch (error) {
      console.error('計画の読み込みエラー:', error);
      setSavedPlans([]);
    }
  }, [user, mountainId]);

  // ユーザーがログインしたときに保存済み計画を読み込む
  useEffect(() => {
    if (user && !loading) {
      loadSavedPlans();
    }
  }, [user, loading, loadSavedPlans]);

  const getRecommendedEquipment = () => {
    const basic = ['登山靴', 'ザック', '雨具', 'ヘッドライト', '地図・コンパス', '救急用品', '非常食', '水筒'];
    
    if (elevation > 3000) {
      return [...basic, '防寒着', 'サングラス'];
    } else if (difficulty === '上級') {
      return [...basic, 'ヘルメット', 'トレッキングポール'];
    } else {
      return [...basic, 'トレッキングポール'];
    }
  };

  const handleEquipmentChange = (item: string) => {
    setPlan(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(eq => eq !== item)
        : [...prev.equipment, item]
    }));
  };

  const handlePlanButtonClick = () => {
    if (loading) {
      return; // 認証状態確認中は何もしない
    }
    
    if (!user) {
      if (window.confirm('登山計画の作成にはログインが必要です。ログインページに移動しますか？')) {
        router.push('/signin');
      }
      return;
    }
    
    setShowPlanForm(!showPlanForm);
  };

  const handleSavePlan = async () => {
    if (loading) {
      return; // 認証状態確認中は何もしない
    }
    
    if (!user) {
      if (window.confirm('登山計画の保存にはログインが必要です。ログインページに移動しますか？')) {
        router.push('/signin');
      }
      return;
    }

    try {
      // データベースに保存
      const planOptions = {
        title: `${mountainName}登山計画`,
        description: plan.notes,
        plannedDate: plan.date,
        estimatedDuration: plan.estimatedDuration ? parseInt(plan.estimatedDuration) * 60 : undefined, // 時間を分に変換
        routePlan: plan.route,
        equipmentList: plan.equipment.filter(item => item.trim() !== ''),
        notes: plan.notes,
        isPublic: false
      };

      await savePlan(user.id, mountainId, planOptions);
      alert('登山計画を保存しました！');
      setShowPlanForm(false);
      // 保存後に計画一覧を再読み込み
      await loadSavedPlans();
    } catch (error) {
      console.error('登山計画の保存に失敗しました:', error);
      alert('登山計画の保存に失敗しました。もう一度お試しください。');
    }
  };

  // 計画の編集ハンドラー
  const handleEditPlan = useCallback((savedPlan: PlanWithMountain) => {
    // フォームに既存データを設定
    setPlan({
      date: savedPlan.planned_date || '',
      startTime: '06:00', // デフォルト値
      estimatedDuration: savedPlan.estimated_duration ? Math.round(savedPlan.estimated_duration / 60).toString() : '6',
      route: savedPlan.route_plan || '一般ルート',
      equipment: savedPlan.equipment_list || [],
      notes: savedPlan.notes || ''
    });
    
    setShowPlanForm(true);
  }, []);

  // 計画の削除ハンドラー
  const handleDeletePlan = useCallback(async (planId: string) => {
    if (!window.confirm('この登山計画を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const success = await deletePlan(planId);
      if (success) {
        alert('登山計画を削除しました');
        // 計画一覧を再読み込み
        await loadSavedPlans();
      } else {
        alert('登山計画の削除に失敗しました');
      }
    } catch (error) {
      console.error('削除処理中のエラー:', error);
      alert('削除中にエラーが発生しました');
    }
  }, [loadSavedPlans]);

  const estimatedCalories = Math.round(elevation * 0.8 + parseInt(plan.estimatedDuration) * 400);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          登山計画
        </h3>
        <button
          onClick={handlePlanButtonClick}
          disabled={loading}
          className={`px-4 py-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-md transition-colors`}
        >
          {loading ? '読込中...' : (showPlanForm ? 'キャンセル' : '計画を作成')}
        </button>
      </div>

      {!showPlanForm ? (
        <div className="space-y-3">
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-700">
                  登山計画の作成・保存には<Link href="/signin" className="font-medium underline">ログイン</Link>が必要です。
                </p>
              </div>
            </div>
          )}
          
          {/* 保存済み計画の表示 */}
          {user && savedPlans.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">過去の登山計画</h4>
              <div className="space-y-4">
                {savedPlans.map((savedPlan) => (
                  <div key={savedPlan.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{savedPlan.title}</h5>
                        {savedPlan.planned_date && (
                          <p className="text-sm text-gray-600">
                            予定日: {new Date(savedPlan.planned_date).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                      
                      {/* アクションボタンエリア */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* いいねボタン（自分の計画以外に表示） */}
                          {user && savedPlan.user_id !== user.id && (
                            <LikeButton
                              type="plan"
                              contentId={savedPlan.id || ''}
                              contentOwnerId={savedPlan.user_id}
                              size="small"
                              variant="outline"
                            />
                          )}
                          
                          {/* ソーシャルシェアボタン（作成者のみ） */}
                          {user && savedPlan.user_id === user.id && (
                            <SocialShareButtonsCompact
                              type="plan"
                              data={savedPlan}
                              ownerId={savedPlan.user_id}
                            />
                          )}
                        </div>
                        
                        {/* 編集・削除ボタン（作成者のみ） */}
                        {user && savedPlan.user_id === user.id && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditPlan(savedPlan)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeletePlan(savedPlan.id || '')}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                      {savedPlan.estimated_duration && (
                        <div>
                          <span className="font-medium">予想時間:</span> {Math.round(savedPlan.estimated_duration / 60)}時間
                        </div>
                      )}
                      <div>
                        <span className="font-medium">ルート:</span> {savedPlan.route_plan || '一般ルート'}
                      </div>
                      {savedPlan.equipment_list && savedPlan.equipment_list.length > 0 && (
                        <div>
                          <span className="font-medium">装備:</span> {savedPlan.equipment_list.length}点
                        </div>
                      )}
                    </div>
                    
                    {savedPlan.notes && (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">メモ:</span> {savedPlan.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-gray-600 mb-1">推定所要時間</div>
              <div className="font-semibold">
                {difficulty === '初級' ? '4-6時間' : difficulty === '中級' ? '6-8時間' : '8-12時間'}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-gray-600 mb-1">推定消費カロリー</div>
              <div className="font-semibold">{Math.round(elevation * 0.6)} kcal</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-gray-600 mb-1">適期</div>
              <div className="font-semibold">
                {elevation > 3000 ? '7-9月' : elevation > 2000 ? '5-10月' : '4-11月'}
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-900 mb-2">推奨装備</h4>
            <div className="flex flex-wrap gap-2">
              {getRecommendedEquipment().map((item) => (
                <span
                  key={item}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleSavePlan(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                登山予定日
              </label>
              <input
                type="date"
                value={plan.date}
                onChange={(e) => setPlan(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出発時刻
              </label>
              <input
                type="time"
                value={plan.startTime}
                onChange={(e) => setPlan(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                予想所要時間（時間）
              </label>
              <select
                value={plan.estimatedDuration}
                onChange={(e) => setPlan(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="3">3時間</option>
                <option value="4">4時間</option>
                <option value="5">5時間</option>
                <option value="6">6時間</option>
                <option value="7">7時間</option>
                <option value="8">8時間</option>
                <option value="9">9時間</option>
                <option value="10">10時間</option>
                <option value="12">12時間</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ルート
              </label>
              <select
                value={plan.route}
                onChange={(e) => setPlan(prev => ({ ...prev, route: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="一般ルート">一般ルート</option>
                <option value="表参道">表参道</option>
                <option value="裏参道">裏参道</option>
                <option value="東面ルート">東面ルート</option>
                <option value="西面ルート">西面ルート</option>
                <option value="北面ルート">北面ルート</option>
                <option value="南面ルート">南面ルート</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              持参装備（推定消費カロリー: {estimatedCalories} kcal）
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {equipmentOptions.map((item) => (
                <label key={item} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.equipment.includes(item)}
                    onChange={() => handleEquipmentChange(item)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className={getRecommendedEquipment().includes(item) ? 'font-medium text-orange-700' : ''}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ・注意事項
            </label>
            <textarea
              value={plan.notes}
              onChange={(e) => setPlan(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="天候確認、緊急連絡先、特記事項など..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowPlanForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              計画を保存
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
