'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadPhoto, PhotoUploadResult } from '@/lib/photo-utils';

interface ImageUploadProps {
  onImageSelect?: (file: File) => void;
  onUploadComplete?: (result: PhotoUploadResult) => void;
  currentImage?: string;
  className?: string;
  climbId?: string;
  userId?: string;
  caption?: string;
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
  autoUpload = false
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      // プレビュー画像を設定
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // ファイル選択のコールバック
      if (onImageSelect) {
        onImageSelect(file);
      }

      // 自動アップロードが有効な場合
      if (autoUpload) {
        await handleUpload(file);
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!climbId || !userId) {
      console.error('アップロードに必要な情報が不足しています');
      return;
    }

    try {
      const result = await uploadPhoto(file, climbId, userId, caption);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      console.log('アップロード完了:', result);
    } catch (error) {
      console.error('アップロードエラー:', error);
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : preview
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
      >
        {preview ? (
          <div className="space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              <Image
                src={preview}
                alt="プレビュー"
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <p className="text-sm text-green-600">
              画像が選択されました
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              別の画像を選択
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg
                className="w-12 h-12"
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
            </div>
            <div>
              <p className="text-gray-600">
                画像をドラッグ&ドロップするか、クリックして選択
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG、JPG、GIF形式に対応
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
