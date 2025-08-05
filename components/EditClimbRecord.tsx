'use client';

import React, { useState } from 'react';
import { updateClimbRecord, ClimbRecordWithMountain } from '@/lib/climb-utils';
import PhotoUpload, { UploadedPhoto } from './PhotoUpload';

interface EditClimbRecordProps {
  record: ClimbRecordWithMountain;
  onUpdate: (updatedRecord: ClimbRecordWithMountain) => void;
  onCancel: () => void;
}

export default function EditClimbRecord({ record, onUpdate, onCancel }: EditClimbRecordProps) {
  const [formData, setFormData] = useState({
    climb_date: record.climb_date?.split('T')[0] || '',
    weather_conditions: record.weather_conditions || '',
    notes: record.notes || '',
    difficulty_rating: record.difficulty_rating || 1,
    is_public: record.is_public || false,
    rating: 'rating' in record && typeof record.rating === 'number' ? record.rating : 5,
    route_name: 'route_name' in record && typeof record.route_name === 'string' ? record.route_name : '',
    companions: 'companions' in record && typeof record.companions === 'string' ? record.companions : '',
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>(record.photos?.map(p => ({
    id: p.id,
    preview: p.thumbnail_path || p.storage_path,
    caption: p.caption || '',
    uploaded: true,
    uploading: false,
  })) || []);
  
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
      // 写真アップロード処理（省略: 必要に応じて実装）
      const result = await updateClimbRecord(record.id!, {
        ...formData,
        // 写真・満足度・ルート名・同行者も送信
      });
      if (result.success) {
        const updatedRecord = { ...record, ...formData, photos };
        // SNSや親への渡し用にClimbPhoto型へ変換
        const photosForShare = photos.map(p => ({
          id: p.id || '',
          storage_path: p.preview,
          thumbnail_path: p.thumbnailUrl || p.preview,
          caption: p.caption,
        }));
        onUpdate({ ...updatedRecord, photos: photosForShare });
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
        <div className="px-6 pt-6 pb-2 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">登山記録を編集</h3>
          {record.mountain_name && (
            <div className="mt-2 mb-1 text-2xl font-bold text-center text-green-700 tracking-wide">{record.mountain_name}</div>
          )}
        </div>
        <form id="edit-climb-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}
          {/* 登山日 */}
          <div>
            <label htmlFor="climb_date" className="block text-sm font-medium text-gray-700 mb-1">登山日 *</label>
            <input type="date" id="climb_date" value={formData.climb_date} onChange={(e) => handleChange('climb_date', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
          </div>
          {/* 天気 */}
          <div>
            <label htmlFor="weather_conditions" className="block text-sm font-medium text-gray-700 mb-1">天気</label>
            <select id="weather_conditions" value={formData.weather_conditions} onChange={(e) => handleChange('weather_conditions', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
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
            <label htmlFor="difficulty_rating" className="block text-sm font-medium text-gray-700 mb-1">難易度</label>
            <select id="difficulty_rating" value={formData.difficulty_rating} onChange={(e) => handleChange('difficulty_rating', parseInt(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              {Object.entries(difficultyLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {/* 満足度 */}
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">満足度（1〜5）</label>
            <input type="number" id="rating" min={1} max={5} value={formData.rating} onChange={(e) => handleChange('rating', parseInt(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          {/* ルート名 */}
          <div>
            <label htmlFor="route_name" className="block text-sm font-medium text-gray-700 mb-1">ルート名</label>
            <input type="text" id="route_name" value={formData.route_name} onChange={(e) => handleChange('route_name', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          {/* 同行者 */}
          <div>
            <label htmlFor="companions" className="block text-sm font-medium text-gray-700 mb-1">同行者</label>
            <input type="text" id="companions" value={formData.companions} onChange={(e) => handleChange('companions', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          {/* メモ */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={6} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="登山の感想、ルート詳細、装備、注意点など..." />
          </div>
          {/* 公開設定 */}
          <div className="flex items-center">
            <input type="checkbox" id="is_public" checked={formData.is_public} onChange={(e) => handleChange('is_public', e.target.checked)} className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">この記録を公開する</label>
          </div>
          {/* 写真編集（下部に移動） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">写真</label>
            <PhotoUpload initialPhotos={photos} onPhotosChange={setPhotos} maxPhotos={10} />
          </div>
          {/* stickyなボタンバー */}
          <div className="sticky bottom-0 left-0 right-0 z-30 flex justify-end items-center bg-white border-t border-gray-200 px-6 py-3 -mx-6" style={{boxShadow: '0 -2px 8px rgba(0,0,0,0.03)'}}>
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 mr-2" disabled={loading}>キャンセル</button>
            <button type="submit" form="edit-climb-form" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50" disabled={loading}>{loading ? '更新中...' : '更新'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
