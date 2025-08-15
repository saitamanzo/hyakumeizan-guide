'use client';

import React, { useState } from 'react';
import { updatePlan, Plan } from '@/lib/plan-utils';

interface EditPlanProps {
  plan: Plan & { mountain_name?: string; transport_mode?: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other' };
  onUpdate: (updatedPlan: Plan) => void;
  onCancel: () => void;
}

export default function EditPlan({ plan, onUpdate, onCancel }: EditPlanProps) {
  const [formData, setFormData] = useState({
    title: plan.title || '',
    description: plan.description || '',
  planned_date: plan.planned_date?.split('T')[0] || '',
  planned_start_date: plan.planned_start_date?.split('T')[0] || plan.planned_date?.split('T')[0] || '',
  planned_end_date: plan.planned_end_date?.split('T')[0] || plan.planned_date?.split('T')[0] || '',
    estimated_duration: plan.estimated_duration || 480, // 8時間をデフォルトに
    difficulty_level: plan.difficulty_level || 'moderate' as const,
    route_plan: plan.route_plan || '',
  transport_mode: plan.transport_mode || 'public',
    equipment_list: plan.equipment_list || [],
  lodging: plan.lodging || '',
    notes: plan.notes || '',
    is_public: plan.is_public || false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentInput, setEquipmentInput] = useState('');

  const difficultyOptions = [
    { value: 'easy', label: '初級（初心者向け）' },
    { value: 'moderate', label: '中級（経験者向け）' },
    { value: 'hard', label: '上級（熟練者向け）' }
  ];

  const transportOptions = [
    { value: 'public', label: '公共交通機関' },
    { value: 'car', label: '自家用車' },
    { value: 'taxi', label: 'タクシー' },
    { value: 'shuttle', label: 'シャトル・バス' },
    { value: 'bike', label: '自転車' },
    { value: 'walk', label: '徒歩' },
    { value: 'other', label: 'その他' },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
  const result = await updatePlan(plan.id!, formData);
      
      if (result.success) {
        // 更新されたプランを親コンポーネントに渡す
        const updatedPlan = { ...plan, ...formData };
        onUpdate(updatedPlan);
      } else {
        setError(result.error || '更新に失敗しました');
      }
    } catch (err) {
      setError('更新中にエラーが発生しました');
      console.error('登山計画更新エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEquipment = () => {
    if (equipmentInput.trim() && !formData.equipment_list.includes(equipmentInput.trim())) {
      handleChange('equipment_list', [...formData.equipment_list, equipmentInput.trim()]);
      setEquipmentInput('');
    }
  };

  const removeEquipment = (item: string) => {
    handleChange('equipment_list', formData.equipment_list.filter(eq => eq !== item));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            登山計画を編集 - {plan.mountain_name}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* タイトル */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              計画タイトル *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="例: 〇〇山 春の登山"
              required
            />
          </div>

          {/* 予定日 */}
          <div>
            <label htmlFor="planned_date" className="block text-sm font-medium text-gray-700 mb-1">
              予定日
            </label>
            <input
              type="date"
              id="planned_date"
              value={formData.planned_date}
              onChange={(e) => handleChange('planned_date', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          {/* 期間 From/To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期間（From/To）</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={formData.planned_start_date} onChange={(e) => handleChange('planned_start_date', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              <input type="date" value={formData.planned_end_date} onChange={(e) => handleChange('planned_end_date', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            </div>
          </div>

          {/* 難易度 */}
          <div>
            <label htmlFor="difficulty_level" className="block text-sm font-medium text-gray-700 mb-1">
              難易度
            </label>
            <select
              id="difficulty_level"
              value={formData.difficulty_level}
              onChange={(e) => handleChange('difficulty_level', e.target.value as 'easy' | 'moderate' | 'hard')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {difficultyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 予想所要時間 */}
          <div>
            <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700 mb-1">
              予想所要時間: {formatDuration(formData.estimated_duration)}
            </label>
            <input
              type="range"
              id="estimated_duration"
              min="120"
              max="1440"
              step="30"
              value={formData.estimated_duration}
              onChange={(e) => handleChange('estimated_duration', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2時間</span>
              <span>24時間</span>
            </div>
          </div>

          {/* 説明 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="計画の概要や目的を入力..."
            />
          </div>

          {/* ルート計画 */}
          <div>
            <label htmlFor="route_plan" className="block text-sm font-medium text-gray-700 mb-1">
              ルート計画
            </label>
            <textarea
              id="route_plan"
              value={formData.route_plan}
              onChange={(e) => handleChange('route_plan', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="登山口 → 中間地点 → 山頂 → 下山ルート..."
            />
          </div>

          {/* 交通手段 */}
          <div>
            <label htmlFor="transport_mode" className="block text-sm font-medium text-gray-700 mb-1">
              交通手段
            </label>
            <select
              id="transport_mode"
              value={formData.transport_mode}
              onChange={(e) => handleChange('transport_mode', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {transportOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* 装備リスト */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              必要装備
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="装備を入力してEnterキー"
              />
              <button
                type="button"
                onClick={addEquipment}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.equipment_list.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeEquipment(item)}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              メモ・注意事項
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="注意事項、緊急連絡先、保険情報など..."
            />
          </div>

          {/* 宿泊地 */}
          <div>
            <label htmlFor="lodging" className="block text-sm font-medium text-gray-700 mb-1">
              宿泊地（任意）
            </label>
            <input
              type="text"
              id="lodging"
              value={formData.lodging}
              onChange={(e) => handleChange('lodging', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="山小屋〇〇、テント場△△ など"
            />
          </div>

          {/* 公開設定 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => handleChange('is_public', e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
              この計画を公開する（他のユーザーが参考にできます）
            </label>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
