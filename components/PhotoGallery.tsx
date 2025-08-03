'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadPhoto, PhotoUploadResult, formatFileSize } from '@/lib/photo-utils';

interface ImageUploadProps {
  onImageSelect?: (file: File) => void;
  onUploadComplete?: (result: PhotoUploadResult) => void;
  currentImage?: string;
  className?: string;
  climbId?: string;
  userId?: string;
  caption?: string;
  multiple?: boolean;
  autoUpload?: boolean;
}

export default function ImageUpload({ 
  onImageSelect, 
  onUploadComplete,
  currentImage, 
  className = '', 
  climbId,
  userId,
  caption,
  multiple = false,
  autoUpload = false
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // 選択されたファイルを状態に保存
      setSelectedFiles([file]);
      
      // 従来のコールバックを呼び出し
      onImageSelect?.(file);
      
      // 自動アップロードが有効で必要な情報がある場合
      if (autoUpload && climbId && userId) {
        await handleUpload(file);
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!climbId || !userId) {
      console.error('アップロードに必要な情報が不足しています');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // プログレスバーのシミュレーション
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadPhoto(file, climbId, userId, caption);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // アップロード完了のコールバックを呼び出し
      onUploadComplete?.(result);
      
      if (result.success) {
        // アップロード成功
      } else {
        console.error('写真のアップロードに失敗:', result.error);
      }
    } catch (error) {
      console.error('アップロード中にエラーが発生:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const manualUpload = () => {
    if (selectedFiles.length > 0 && selectedFiles[0]) {
      handleUpload(selectedFiles[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {preview ? (
          <div className="relative">
            <Image
              src={preview}
              alt="プレビュー"
              width={400}
              height={192}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
              <div className="text-white opacity-0 hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            {/* アップロード進行状況 */}
            {isUploading && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 rounded-b-lg p-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-xs">{uploadProgress}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">写真をアップロード</p>
            <p className="text-xs text-gray-400 mt-1">
              クリックまたはドラッグ&ドロップ
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                選択: {selectedFiles[0].name} ({formatFileSize(selectedFiles[0].size)})
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 手動アップロードボタン */}
      {!autoUpload && selectedFiles.length > 0 && climbId && userId && (
        <div className="mt-4 text-center">
          <button
            onClick={manualUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
          >
            {isUploading ? 'アップロード中...' : '写真をアップロード'}
          </button>
        </div>
      )}
      
      {/* エラー表示エリア */}
      <div id="upload-status" className="mt-2"></div>
    </div>
  );
}
