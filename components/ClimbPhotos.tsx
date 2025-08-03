'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getClimbPhotos, getThumbnailUrl, getOriginalUrl, deletePhoto, ClimbPhoto } from '@/lib/photo-utils';

interface PhotoGalleryProps {
  climbId: string;
  userId?: string;
  showControls?: boolean;
  maxPhotos?: number;
  thumbnailSize?: 'small' | 'medium' | 'large';
}

export default function PhotoGallery({ 
  climbId, 
  userId, 
  showControls = false, 
  maxPhotos,
  thumbnailSize = 'medium'
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<ClimbPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ClimbPhoto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-24 w-24',
    large: 'h-32 w-32'
  };

  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      try {
        const climbPhotos = await getClimbPhotos(climbId);
        setPhotos(maxPhotos ? climbPhotos.slice(0, maxPhotos) : climbPhotos);
      } catch (error) {
        console.error('写真の読み込みに失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [climbId, maxPhotos]);

  const handlePhotoClick = (photo: ClimbPhoto) => {
    setSelectedPhoto(photo);
    setIsModalOpen(true);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('この写真を削除しますか？')) return;

    try {
      const success = await deletePhoto(photoId);
      if (success) {
        setPhotos(photos.filter(p => p.id !== photoId));
        if (selectedPhoto?.id === photoId) {
          setIsModalOpen(false);
          setSelectedPhoto(null);
        }
      } else {
        alert('写真の削除に失敗しました');
      }
    } catch (error) {
      console.error('写真削除中にエラー:', error);
      alert('写真の削除中にエラーが発生しました');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedPhoto(photos[newIndex]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">写真がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative group">
            <div 
              className={`${sizeClasses[thumbnailSize]} relative rounded-md overflow-hidden cursor-pointer transition-transform hover:scale-105`}
              onClick={() => handlePhotoClick(photo)}
            >
              <Image
                src={photo.thumbnail_path ? getThumbnailUrl(photo.thumbnail_path) : getOriginalUrl(photo.storage_path)}
                alt={photo.caption || `写真 ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
              
              {/* ホバー時のオーバーレイ */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* 削除ボタン */}
            {showControls && userId && photo.user_id === userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(photo.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            )}
            
            {/* 写真番号 */}
            <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
              {index + 1}
            </div>
          </div>
        ))}
        
        {/* さらに多くの写真がある場合の表示 */}
        {maxPhotos && photos.length >= maxPhotos && (
          <div className={`${sizeClasses[thumbnailSize]} bg-gray-100 rounded-md flex items-center justify-center text-gray-500`}>
            <span className="text-xs text-center">
              +他<br />{photos.length > maxPhotos ? '...' : ''}
            </span>
          </div>
        )}
      </div>

      {/* フルサイズ表示モーダル */}
      {isModalOpen && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="relative max-w-4xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            {/* 閉じるボタン */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* ナビゲーションボタン */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {/* メイン画像 */}
            <div className="relative">
              <Image
                src={getOriginalUrl(selectedPhoto.storage_path)}
                alt={selectedPhoto.caption || '写真'}
                width={800}
                height={600}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              
              {/* キャプション */}
              {selectedPhoto.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                  <p className="text-sm">{selectedPhoto.caption}</p>
                </div>
              )}
            </div>
            
            {/* 写真情報 */}
            <div className="mt-4 text-white text-sm">
              <p>
                {photos.findIndex(p => p.id === selectedPhoto.id) + 1} / {photos.length}
                {selectedPhoto.original_filename && ` • ${selectedPhoto.original_filename}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
