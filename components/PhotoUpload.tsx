'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface PhotoUploadProps {
  climbId?: string;
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  initialPhotos?: UploadedPhoto[];
  maxPhotos?: number;
}

export interface UploadedPhoto {
  id?: string;
  file?: File;
  preview: string;
  caption: string;
  uploading: boolean;
  uploaded: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export default function PhotoUpload({ 
  climbId, 
  onPhotosChange, 
  initialPhotos = [], 
  maxPhotos = 10 
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePhotos = useCallback((newPhotos: UploadedPhoto[]) => {
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  }, [onPhotosChange]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    if (filesToProcess < files.length) {
      alert(`最大${maxPhotos}枚まで登録できます。${filesToProcess}枚のみ追加されます。`);
    }

    const newPhotos: UploadedPhoto[] = [];

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];
      
      // ファイルタイプをチェック
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}は画像ファイルではありません。`);
        continue;
      }

      // ファイルサイズをチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}のファイルサイズが大きすぎます（10MB以下にしてください）。`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newPhotos.push({
        file,
        preview,
        caption: '',
        uploading: false,
        uploaded: false,
      });
    }

    if (newPhotos.length > 0) {
      updatePhotos([...photos, ...newPhotos]);
    }
  }, [photos, maxPhotos, updatePhotos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    updatePhotos(newPhotos);
  }, [photos, updatePhotos]);

  const updateCaption = useCallback((index: number, caption: string) => {
    const newPhotos = photos.map((photo, i) => 
      i === index ? { ...photo, caption } : photo
    );
    updatePhotos(newPhotos);
  }, [photos, updatePhotos]);

  const uploadAllPhotos = useCallback(async () => {
    if (!climbId) {
      console.error('climbId が設定されていません');
      return;
    }

    const unuploadedPhotos = photos.filter(photo => !photo.uploaded && photo.file);
    
    if (unuploadedPhotos.length === 0) {
      return;
    }

    // アップロード状態を更新
    const updatedPhotos = photos.map(photo => 
      !photo.uploaded && photo.file ? { ...photo, uploading: true, error: undefined } : photo
    );
    updatePhotos(updatedPhotos);

    const promises = unuploadedPhotos.map(async (photo) => {
      if (!photo.file) return null;

      try {
        // サーバーサイドAPIを使用してアップロード
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('climbId', climbId);
        formData.append('caption', photo.caption || '');

        const response = await fetch('/api/upload-photo', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        const photoIndex = photos.findIndex(p => p === photo);
        if (photoIndex === -1) return null;

        if (result.success) {
          return {
            index: photoIndex,
            update: {
              ...photo,
              id: result.data.id,
              uploading: false,
              uploaded: true,
              originalUrl: result.data.url,
              thumbnailUrl: result.data.url, // サムネイルとオリジナルが同じ場合
              error: undefined,
            }
          };
        } else {
          return {
            index: photoIndex,
            update: {
              ...photo,
              uploading: false,
              error: result.error || 'アップロードに失敗しました',
            }
          };
        }
      } catch (error) {
        const photoIndex = photos.findIndex(p => p === photo);
        console.error('写真アップロードエラー:', error);
        return {
          index: photoIndex,
          update: {
            ...photo,
            uploading: false,
            error: error instanceof Error ? error.message : 'アップロードエラー',
          }
        };
      }
    });

    try {
      const results = await Promise.all(promises);
      
      const newPhotos = [...photos];
      results.forEach(result => {
        if (result) {
          newPhotos[result.index] = result.update;
        }
      });
      
      updatePhotos(newPhotos);
      
      // 成功したアップロード数をログ出力
      const successCount = results.filter(r => r?.update.uploaded).length;
      console.log(`✅ 写真アップロード完了: ${successCount}/${unuploadedPhotos.length}枚`);
      
    } catch (error) {
      console.error('写真アップロード中にエラーが発生:', error);
    }
  }, [photos, climbId, updatePhotos]);

  const movePhoto = useCallback((fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);
    updatePhotos(newPhotos);
  }, [photos, updatePhotos]);

  return (
    <div className="space-y-4">
      {/* ファイル選択エリア */}
      {photos.length < maxPhotos && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                ファイルを選択
              </button>
              <span className="mx-1">または</span>
              <span>ドラッグ&ドロップ</span>
            </div>
            <p className="text-xs text-gray-500">
              JPG, PNG, GIF（最大10MB、{maxPhotos}枚まで）
            </p>
            <p className="text-xs text-gray-400">
              残り{maxPhotos - photos.length}枚追加可能
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* 写真プレビューリスト */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-900">
              選択した写真（{photos.length}/{maxPhotos}）
            </h4>
            {climbId && photos.some(p => !p.uploaded && p.file) && (
              <button
                type="button"
                onClick={uploadAllPhotos}
                disabled={photos.some(p => p.uploading)}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {photos.some(p => p.uploading) ? 'アップロード中...' : 'すべてアップロード'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative bg-white border border-gray-200 rounded-lg p-3 space-y-3"
              >
                {/* プレビュー画像 */}
                <div className="relative h-32 bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={photo.preview}
                    alt={`プレビュー ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* 並び順インジケーター */}
                  <div className="absolute top-1 left-1 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                    {index + 1}
                  </div>

                  {/* 状態インジケーター */}
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                  
                  {photo.uploaded && (
                    <div className="absolute bottom-1 right-1 p-1 bg-green-500 text-white rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* キャプション入力 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    キャプション
                  </label>
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    placeholder="写真の説明を入力（任意）"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* エラー表示 */}
                {photo.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {photo.error}
                  </div>
                )}

                {/* 並び替えボタン */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => movePhoto(index, index - 1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="前に移動"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        onClick={() => movePhoto(index, index + 1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="後に移動"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {index === 0 && photos.length > 1 && (
                    <span className="text-xs text-blue-600 font-medium">
                      サムネイル画像
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              💡 最初の写真が記録一覧でサムネイル画像として表示されます
            </div>
          )}
        </div>
      )}
    </div>
  );
}
