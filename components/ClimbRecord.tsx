'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getUserClimbRecords, saveClimbRecord, deleteClimbRecord } from '@/lib/climb-utils';
import type { UploadedPhoto } from './PhotoUpload';
import { getClimbPhotos, ClimbPhoto } from '@/lib/photo-utils';
import { createClient } from '../lib/supabase/client';
import LikeButton from './LikeButton';
import { SocialShareButtonsCompact } from './SocialShareButtons';
import { useClimbRecords, RecordData, SavedRecord } from './useClimbRecords';
import ClimbRecordList from './ClimbRecordList';
import ClimbRecordForm from './ClimbRecordForm';


interface ClimbRecordProps {
  mountainName: string;
  mountainId: string;
}


export default function ClimbRecord({ mountainName, mountainId }: ClimbRecordProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [record, setRecord] = useState<RecordData>({
    date: '',
    route: '一般ルート',
    duration: '',
    difficulty: 'easy',
    weather: '晴れ',
    companions: '',
    notes: '',
    rating: 5
  });

  // useClimbRecordsで記録データを管理
  const {
    savedRecords,
    loadSavedRecords,
    loading: recordsLoading,
    setSavedRecords
  } = useClimbRecords(mountainId, user, mountainName);

  // ユーザーがログインしたときに保存済み記録を読み込む
  useEffect(() => {
    if (user && !loading) {
      loadSavedRecords();
    }
  }, [user, loading, loadSavedRecords]);

  // コンポーネントがマウントされた時の状態を確認
  useEffect(() => {
    // マウント時の初期化
  }, [mountainName, mountainId, user, loading]);

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
        // await loadSavedRecords(); // This line is removed as per the new_code
        
        // フォームをリセット
        setShowRecordForm(false);
        setPhotos([]);
        setRecord({
          date: '',
          route: '一般ルート',
          duration: '',
          difficulty: 'easy',
          weather: '晴れ',
          companions: '',
          notes: '',
          rating: 5
        });
        
        // 保存後に記録一覧を更新
        // loadSavedRecords(); // This line is removed as per the new_code
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
      route: savedRecord.route,
      duration: savedRecord.duration,
      difficulty: savedRecord.difficulty,
      weather: savedRecord.weather,
      companions: savedRecord.companions,
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
        // await loadSavedRecords(); // This line is removed as per the new_code
      } else {
        alert('登山記録の削除に失敗しました');
      }
    } catch (error) {
      console.error('削除処理中のエラー:', error);
      alert('削除中にエラーが発生しました');
    }
  }, []); // loadSavedRecords is removed as per the new_code

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
          {user && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">過去の登山記録</h4>
              <div className="space-y-4">
                {/* The useClimbRecords hook is not yet integrated here, so this section will be empty or show a placeholder */}
                {/* For now, we'll just show a message indicating no records or a placeholder */}
                <p className="text-sm text-gray-500">保存済みの登山記録はありません。</p>
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
        <ClimbRecordForm
          record={record}
          setRecord={setRecord}
          onSave={saveRecord}
          saving={saving}
          photos={photos}
          setPhotos={setPhotos}
          user={user}
          loading={loading}
          show={showRecordForm}
          onClose={() => setShowRecordForm(false)}
        />
      )}
    </div>
  );
}
