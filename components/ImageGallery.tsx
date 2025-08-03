'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ImageUpload from './ImageUpload';

interface ImageGalleryProps {
  mountainId: string;
  mountainName: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

export default function ImageGallery({ mountainId, mountainName }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // ここでは実際のアップロード処理の代わりに、ローカルストレージとFileReaderを使用
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: GalleryImage = {
          id: `img_${Date.now()}`,
          url: e.target?.result as string,
          uploadedAt: new Date(),
          uploadedBy: 'ユーザー', // 実際のアプリでは認証情報から取得
        };
        
        setImages(prev => [newImage, ...prev]);
        
        // ローカルストレージに保存
        const storageKey = `mountain_images_${mountainId}`;
        const existingImages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([newImage, ...existingImages]));
        
        setShowUpload(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('画像のアップロードに失敗しました:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // ローカルストレージから画像を読み込み
  useEffect(() => {
    const storageKey = `mountain_images_${mountainId}`;
    const savedImages = localStorage.getItem(storageKey);
    if (savedImages) {
      setImages(JSON.parse(savedImages));
    }
  }, [mountainId]);

  const openModal = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {mountainName}の写真 ({images.length})
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          {showUpload ? 'キャンセル' : '写真を追加'}
        </button>
      </div>

      {/* 画像アップロード */}
      {showUpload && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-medium mb-4">新しい写真をアップロード</h4>
          <ImageUpload
            onImageSelect={handleImageUpload}
            className="max-w-md"
          />
          {isUploading && (
            <div className="mt-2 flex items-center text-indigo-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              アップロード中...
            </div>
          )}
        </div>
      )}

      {/* 画像ギャラリー */}
      {images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">まだ写真がありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            最初の写真をアップロードしてみましょう！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group cursor-pointer"
              onClick={() => openModal(image)}
            >
              <Image
                src={image.url}
                alt={`${mountainName}の写真`}
                width={200}
                height={150}
                className="w-full h-32 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg"></div>
              <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(image.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 画像モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={selectedImage.url}
              alt={`${mountainName}の写真`}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded">
              <p className="text-sm">
                アップロード: {new Date(selectedImage.uploadedAt).toLocaleDateString()}
              </p>
              {selectedImage.uploadedBy && (
                <p className="text-sm">by {selectedImage.uploadedBy}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
