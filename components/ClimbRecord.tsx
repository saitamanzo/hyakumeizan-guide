'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getUserClimbRecords, saveClimbRecord, deleteClimbRecord } from '@/lib/climb-utils';
import { getUserPlans, getPublicPlansByMountain, PlanWithMountain } from '@/lib/plan-utils';
import PhotoUpload, { UploadedPhoto } from './PhotoUpload';
import { getClimbPhotos, ClimbPhoto } from '@/lib/photo-utils';
import { createClient } from '@/lib/supabase/client';
import LikeButton from './LikeButton';
import { SocialShareButtonsCompact } from './SocialShareButtons';
const supabase = createClient();

interface ClimbRecordProps {
  mountainName: string;
  mountainId: string;
}

interface RecordData {
  date: string;
  dateFrom?: string;
  dateTo?: string;
  route: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  weather: string;
  companions: string;
  transportMode?: 'car' | 'public' | 'taxi' | 'shuttle' | 'bike' | 'walk' | 'other';
  lodging?: string;
  notes: string;
  rating: number;
}

interface SavedRecord extends RecordData {
  id: string;
  mountainId: string;
  mountainName: string;
  userId: string;
  createdAt: string;
  photos?: ClimbPhoto[];
  thumbnailUrl?: string;
}

export default function ClimbRecord({ mountainName, mountainId }: ClimbRecordProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [plansForMountain, setPlansForMountain] = useState<PlanWithMountain[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [record, setRecord] = useState<RecordData>({
  date: '',
  dateFrom: '',
  dateTo: '',
    route: '一般ルート',
    duration: '',
    difficulty: 'easy',
    weather: '晴れ',
    companions: '',
  transportMode: 'public',
  lodging: '',
    notes: '',
    rating: 5
  });

  // コンポーネントがマウントされた時の状態を確認
  useEffect(() => {
    // マウント時の初期化
  }, [mountainName, mountainId, user, loading]);

  // 計画の読み込み（自分＋公開、山別）
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const results: PlanWithMountain[] = [];
        if (user) {
          const myPlans = await getUserPlans(user.id);
          results.push(
            ...myPlans.filter(p => p.mountain_id === mountainId)
          );
        }
        const publicPlans = await getPublicPlansByMountain(mountainId);
        // 自分の計画と重複する公開計画を除外（idベース）
        const myIds = new Set(results.map(p => p.id));
        results.push(...publicPlans.filter(p => !myIds.has(p.id!)));
        setPlansForMountain(results);
      } catch (e) {
        console.error('計画の読み込みに失敗:', e);
        setPlansForMountain([]);
      }
    };
    loadPlans();
  }, [user, mountainId]);

  // 計画を適用して記録フォームに反映
  const applyPlanToRecord = useCallback((plan: PlanWithMountain) => {
    const plannedDate = plan.planned_date || plan.planned_start_date || '';
    const startDate = plan.planned_start_date || plan.planned_date || '';
    const endDate = plan.planned_end_date || plan.planned_date || '';
    const difficulty = (plan.difficulty_level || 'easy') as RecordData['difficulty'];
    const transportMode = plan.transport_mode || 'public';
    const lodging = plan.lodging || '';
    const prefillNotesParts = [
      plan.description ? `計画の概要: ${plan.description}` : '',
      plan.route_plan ? `計画ルート: ${plan.route_plan}` : '',
      Array.isArray(plan.equipment_list) && plan.equipment_list.length > 0
        ? `装備: ${plan.equipment_list.join(', ')}`
        : '',
    ].filter(Boolean);

    setRecord(prev => ({
      ...prev,
      date: plannedDate?.split('T')[0] || prev.date,
      dateFrom: startDate?.split('T')[0] || prev.dateFrom,
      dateTo: endDate?.split('T')[0] || prev.dateTo,
      difficulty,
      transportMode: transportMode as NonNullable<RecordData['transportMode']>,
      lodging,
      notes: prefillNotesParts.join('\n')
    }));
  }, []);

  // 計画取り込みUI（共通）
  const PlanImportBlock = (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <label className="text-sm font-medium text-orange-800">計画を取り込む</label>
        <div className="flex-1 flex gap-2">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="flex-1 px-3 py-2 border border-orange-300 rounded-md bg-white focus:ring-orange-500 focus:border-orange-500 text-sm"
          >
            <option value="">（未選択）</option>
            {plansForMountain.length > 0 && (
              <optgroup label="利用可能な計画">
                {plansForMountain.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.is_public ? '（公開）' : '（自分）'} {p.planned_date || p.planned_start_date ? `- ${String(p.planned_date || p.planned_start_date).split('T')[0]}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            type="button"
            disabled={!selectedPlanId}
            onClick={() => {
              const plan = plansForMountain.find(p => p.id === selectedPlanId);
              if (plan) {
                applyPlanToRecord(plan);
                setShowRecordForm(true); // 自動でフォームを開く
              }
            }}
            className={`px-4 py-2 text-sm rounded-md ${!selectedPlanId ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
          >
            取り込む
          </button>
        </div>
      </div>
      {plansForMountain.length === 0 && (
        <p className="mt-2 text-xs text-orange-700">この山に関連する公開計画、またはあなたの計画は見つかりませんでした。</p>
      )}
    </div>
  );

  const loadSavedRecords = useCallback(async () => {
    if (!user) return;
    
    try {
      const records = await getUserClimbRecords(user.id);
      
      // 指定した山の記録のみフィルタリング
      const mountainRecords = records.filter(record => record.mountain_id === mountainId);
      
      // 型を変換し、各記録の写真も取得
      const convertedRecords: SavedRecord[] = await Promise.all(
        mountainRecords
          .filter(record => record.id && record.created_at) // undefined値を除外
          .map(async (record) => {
            // 各記録の写真を取得
            const photos = await getClimbPhotos(record.id!);
            const thumbnailUrl = photos.length > 0 && photos[0].thumbnail_path
              ? supabase.storage.from('climb-photos').getPublicUrl(photos[0].thumbnail_path).data.publicUrl
              : undefined;

            return {
              id: record.id!,
              mountainId: record.mountain_id,
              mountainName: record.mountain_name || mountainName,
              userId: record.user_id,
              date: record.climb_date ?? '',
              route: '一般ルート',
              duration: '記録なし',
              difficulty: record.difficulty_rating === 1 ? 'easy' : record.difficulty_rating === 3 ? 'moderate' : 'hard',
              weather: record.weather_conditions || '晴れ',
              companions: '記録なし',
              notes: record.notes || '',
              rating: 5,
              createdAt: record.created_at!,
              photos: photos,
              thumbnailUrl: thumbnailUrl
            };
          })
      );
      
      setSavedRecords(convertedRecords);
    } catch (error) {
      console.error('登山記録の読み込みエラー:', error);
      setSavedRecords([]);
    }
  }, [user, mountainId, mountainName]);

  // ユーザーがログインしたときに保存済み記録を読み込む
  useEffect(() => {
    if (user && !loading) {
      loadSavedRecords();
    }
  }, [user, loading, loadSavedRecords]);

  const handleRecordButtonClick = () => {
    if (loading) {
      return;
    }

    if (!user) {
      alert('ログインしてください');
      return;
    }

    setShowRecordForm(true);
  };

  const saveRecord = async () => {
    if (loading || saving) {
      return;
    }
    
    if (!user) {
      if (window.confirm('登山記録の保存にはログインが必要です。ログインページに移動しますか？')) {
        router.push('/signin');
      }
      return;
    }

    if (!record.date) {
      alert('登山日を入力してください。');
      return;
    }

    setSaving(true);
    
    try {
      // 新しいAPIに合わせて保存
  const result = await saveClimbRecord(user.id, mountainId, record);

      if (result.success) {
        // 写真がある場合は、保存された記録IDに関連付けてアップロード
        if (photos.length > 0 && result.id) {
          for (const photo of photos) {
            if (photo.file && !photo.uploaded) {
              try {
                const formData = new FormData();
                formData.append('file', photo.file);
                formData.append('climbId', result.id);
                formData.append('caption', photo.caption || '');

                const response = await fetch('/api/upload-photo', {
                  method: 'POST',
                  body: formData
                });

                const uploadResult = await response.json();
                
                if (!uploadResult.success) {
                  console.error('写真アップロード失敗:', uploadResult.error);
                }
              } catch (uploadError) {
                console.error('写真アップロード中のエラー:', uploadError);
              }
            }
          }
        }
        
        alert('登山記録を保存しました！');
        
        // 保存済み記録を再読み込み
        await loadSavedRecords();
        
        // フォームをリセット
        setShowRecordForm(false);
        setPhotos([]);
        setRecord({
          date: '',
          dateFrom: '',
          dateTo: '',
          route: '一般ルート',
          duration: '',
          difficulty: 'easy',
          weather: '晴れ',
          companions: '',
          transportMode: 'public',
          lodging: '',
          notes: '',
          rating: 5
        });
        
        // 保存後に記録一覧を更新
        loadSavedRecords();
      } else {
        console.error('データベース保存エラー:', result.error);
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('保存処理中のエラー:', error);
      alert('保存中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const difficultyOptions = [
    { value: 'easy', label: '初級' },
    { value: 'moderate', label: '中級' },
    { value: 'hard', label: '上級' }
  ];

  const weatherOptions = [
    '晴れ', '曇り', '雨', '雪', '霧', '風強', '雷'
  ];

  const handlePhotosChange = useCallback((newPhotos: UploadedPhoto[]) => {
    setPhotos(newPhotos);
  }, []);

  // 記録の編集ハンドラー
  const handleEditRecord = useCallback((savedRecord: SavedRecord) => {
    // フォームに既存データを設定
    setRecord({
      date: savedRecord.date,
      dateFrom: savedRecord.date,
      dateTo: savedRecord.date,
      route: savedRecord.route,
      duration: savedRecord.duration,
      difficulty: savedRecord.difficulty,
      weather: savedRecord.weather,
      companions: savedRecord.companions,
      transportMode: 'public',
      lodging: '',
      notes: savedRecord.notes,
      rating: savedRecord.rating
    });
    
    // 既存の写真データも設定（編集機能として）
    if (savedRecord.photos) {
      const existingPhotos: UploadedPhoto[] = savedRecord.photos.map((photo) => ({
        file: undefined, // 既存写真はファイルオブジェクトなし
        preview: photo.thumbnail_path || photo.storage_path,
        caption: photo.caption || '',
        uploaded: true,
        uploading: false,
        error: undefined,
        id: photo.id
      }));
      setPhotos(existingPhotos);
    }
    
    setShowRecordForm(true);
  }, []);

  // 記録の削除ハンドラー
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!window.confirm('この登山記録を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const success = await deleteClimbRecord(recordId);
      if (success) {
        alert('登山記録を削除しました');
        // 記録一覧を再読み込み
        await loadSavedRecords();
      } else {
        alert('登山記録の削除に失敗しました');
      }
    } catch (error) {
      console.error('削除処理中のエラー:', error);
      alert('削除中にエラーが発生しました');
    }
  }, [loadSavedRecords]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
          </svg>
          登山記録
        </h3>
        {showRecordForm ? (
          <button
            onClick={() => setShowRecordForm(false)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            キャンセル
          </button>
        ) : (
          <button
            onClick={handleRecordButtonClick}
            disabled={loading}
            className={`px-4 py-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors`}
          >
            {loading ? '読込中...' : '記録を作成'}
          </button>
        )}
      </div>

      {!showRecordForm ? (
        <div className="space-y-3">
          {/* 計画から取り込む */}
          {PlanImportBlock}
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-700">
                  登山記録の作成・保存には<Link href="/signin" className="font-medium underline">ログイン</Link>が必要です。
                </p>
              </div>
            </div>
          )}
          
          {/* 保存済み記録の表示 */}
          {user && savedRecords.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">過去の登山記録</h4>
              <div className="space-y-4">
                {savedRecords.map((savedRecord) => (
                  <div key={savedRecord.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex gap-4">
                      {/* サムネイル画像 */}
                      {savedRecord.thumbnailUrl && (
                        <div className="flex-shrink-0">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                            <Image
                              src={savedRecord.thumbnailUrl}
                              alt="登山記録の写真"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 記録内容 */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{savedRecord.date}</h5>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= savedRecord.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                          <div><span className="font-medium">ルート:</span> {savedRecord.route}</div>
                          <div><span className="font-medium">難易度:</span> {savedRecord.difficulty === 'easy' ? '初級' : savedRecord.difficulty === 'moderate' ? '中級' : '上級'}</div>
                          <div><span className="font-medium">天候:</span> {savedRecord.weather}</div>
                        </div>
                        {savedRecord.notes && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">記録:</span> {savedRecord.notes}
                          </div>
                        )}
                        {savedRecord.photos && savedRecord.photos.length > 0 && (
                          <div className="text-xs text-gray-500">
                            📸 写真 {savedRecord.photos.length} 枚
                          </div>
                        )}
                        
                        {/* アクションボタンエリア */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-3">
                            {/* いいねボタン（自分の記録以外に表示） */}
                            {user && savedRecord.userId !== user.id && (
                              <LikeButton
                                type="climb"
                                contentId={savedRecord.id}
                                contentOwnerId={savedRecord.userId}
                                size="small"
                                variant="outline"
                              />
                            )}
                            
                            {/* ソーシャルシェアボタン（作成者のみ） */}
                            {user && savedRecord.userId === user.id && (
                              <SocialShareButtonsCompact
                                type="climb"
                                data={{
                                  id: savedRecord.id,
                                  mountain_id: savedRecord.mountainId,
                                  mountain_name: savedRecord.mountainName,
                                  climb_date: savedRecord.date,
                                  difficulty_rating: savedRecord.difficulty === 'easy' ? 1 : savedRecord.difficulty === 'moderate' ? 3 : 5,
                                  weather_conditions: savedRecord.weather,
                                  notes: savedRecord.notes,
                                  user_id: savedRecord.userId,
                                  is_public: true,
                                  created_at: savedRecord.createdAt,
                                  photos: savedRecord.photos
                                }}
                                ownerId={savedRecord.userId}
                              />
                            )}
                          </div>
                          
                          {/* 編集・削除ボタン（作成者のみ） */}
                          {user && savedRecord.userId === user.id && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditRecord(savedRecord)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(savedRecord.id)}
                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                              >
                                削除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p>登山後に記録を残して、今後の登山計画の参考にしましょう。</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>実際の所要時間や難易度</li>
              <li>天候条件と装備の適切性</li>
              <li>ルートの状況や注意点</li>
              <li>感想や改善点</li>
            </ul>
          </div>
        </div>
      ) : (
        <form onSubmit={async (e) => { e.preventDefault(); await saveRecord(); }} className="space-y-4">
          {/* フォーム上部にも計画取り込みを配置 */}
          <div className="-mt-2">
            {PlanImportBlock}
            <p className="mt-2 text-xs text-gray-600">選択した計画の情報でフォームの一部を上書きします。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                登山日 *
              </label>
              <input
                type="date"
                value={record.date}
                onChange={(e) => setRecord(prev => ({ ...prev, date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期間（From/To）</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={record.dateFrom}
                  onChange={(e) => setRecord(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
                <input
                  type="date"
                  value={record.dateTo}
                  onChange={(e) => setRecord(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所要時間
              </label>
              <input
                type="text"
                value={record.duration}
                onChange={(e) => setRecord(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="例: 6時間30分"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                使用ルート
              </label>
              <select
                value={record.route}
                onChange={(e) => setRecord(prev => ({ ...prev, route: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                体感難易度
              </label>
              <select
                value={record.difficulty}
                onChange={(e) => setRecord(prev => ({ ...prev, difficulty: e.target.value as RecordData['difficulty'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                天候
              </label>
              <select
                value={record.weather}
                onChange={(e) => setRecord(prev => ({ ...prev, weather: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                {weatherOptions.map(weather => (
                  <option key={weather} value={weather}>
                    {weather}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交通手段</label>
              <select
                value={record.transportMode}
                onChange={(e) => setRecord(prev => ({ ...prev, transportMode: e.target.value as NonNullable<RecordData['transportMode']> }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="public">公共交通機関</option>
                <option value="car">自家用車</option>
                <option value="taxi">タクシー</option>
                <option value="shuttle">シャトル・バス</option>
                <option value="bike">自転車</option>
                <option value="walk">徒歩</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              満足度 ({record.rating}/5)
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRecord(prev => ({ ...prev, rating: star }))}
                  className={`w-8 h-8 ${star <= record.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                >
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              同行者
            </label>
            <input
              type="text"
              value={record.companions}
              onChange={(e) => setRecord(prev => ({ ...prev, companions: e.target.value }))}
              placeholder="例: 友人2名、単独行 など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">宿泊地（任意）</label>
            <input
              type="text"
              value={record.lodging}
              onChange={(e) => setRecord(prev => ({ ...prev, lodging: e.target.value }))}
              placeholder="例: 山小屋〇〇、テント場△△ など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              記録・感想・注意点
            </label>
            <textarea
              value={record.notes}
              onChange={(e) => setRecord(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="景色、ルートの状況、装備のポイント、改善点など..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              rows={4}
            />
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写真
            </label>
            <PhotoUpload 
              initialPhotos={photos}
              onPhotosChange={handlePhotosChange}
              maxPhotos={10}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowRecordForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors`}
            >
              {saving ? '保存中...' : '記録を保存'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
