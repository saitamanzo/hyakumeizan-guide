'use client';

import React, { useState } from 'react';
import { updateClimbRecord, ClimbRecord } from '@/lib/climb-utils';

interface EditClimbRecordProps {
  record: ClimbRecord & { mountain_name?: string };
  onUpdate: (updatedRecord: ClimbRecord) => void;
  onCancel: () => void;
}

export default function EditClimbRecord({ record, onUpdate, onCancel }: EditClimbRecordProps) {
  const [formData, setFormData] = useState({
    climb_date: record.climb_date?.split('T')[0] || '',
    weather_conditions: record.weather_conditions || '',
    notes: record.notes || '',
    difficulty_rating: record.difficulty_rating || 1,
    is_public: record.is_public || false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difficultyLabels = {
    1: '初級',
    2: '初級+',
    3: '中級',
    4: '中級+',
    5: '上級'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await updateClimbRecord(record.id!, formData);
      
      if (result.success) {
        // 更新されたレコードを親コンポーネントに渡す
        const updatedRecord = { ...record, ...formData };
        onUpdate(updatedRecord);
      } else {
        setError(result.error || '更新に失敗しました');
      }
    } catch (err) {
      setError('更新中にエラーが発生しました');
      console.error('登山記録更新エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            登山記録を編集 - {record.mountain_name}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* 登山日 */}
          <div>
            <label htmlFor="climb_date" className="block text-sm font-medium text-gray-700 mb-1">
              登山日 *
            </label>
            <input
              type="date"
              id="climb_date"
              value={formData.climb_date}
              onChange={(e) => handleChange('climb_date', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          {/* 天気 */}
          <div>
            <label htmlFor="weather_conditions" className="block text-sm font-medium text-gray-700 mb-1">
              天気
            </label>
            <select
              id="weather_conditions"
              value={formData.weather_conditions}
              onChange={(e) => handleChange('weather_conditions', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="晴れ">晴れ</option>
              <option value="曇り">曇り</option>
              <option value="雨">雨</option>
              <option value="雪">雪</option>
              <option value="霧">霧</option>
              <option value="晴れ時々曇り">晴れ時々曇り</option>
              <option value="曇り時々雨">曇り時々雨</option>
            </select>
          </div>

          {/* 難易度 */}
          <div>
            <label htmlFor="difficulty_rating" className="block text-sm font-medium text-gray-700 mb-1">
              難易度
            </label>
            <select
              id="difficulty_rating"
              value={formData.difficulty_rating}
              onChange={(e) => handleChange('difficulty_rating', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {Object.entries(difficultyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="登山の感想、ルート詳細、装備、注意点など..."
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
              この記録を公開する
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
