'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './auth/AuthProvider';
import { 
  getClimbLikeCount, 
  getPlanLikeCount, 
  toggleClimbLike, 
  togglePlanLike,
  LikeCount 
} from '@/lib/like-utils';

interface LikeButtonProps {
  type: 'climb' | 'plan';
  contentId: string;
  contentOwnerId?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'outline';
  showCount?: boolean;
}

export default function LikeButton({
  type,
  contentId,
  contentOwnerId,
  className = '',
  size = 'medium',
  variant = 'default',
  showCount = true
}: LikeButtonProps) {
  const { user } = useAuth();
  const [likeData, setLikeData] = useState<LikeCount>({ count: 0, user_has_liked: false });
  const [isLoading, setIsLoading] = useState(false);

  // サイズ設定
  const sizeClasses = {
    small: 'p-1 text-sm',
    medium: 'p-2 text-base',
    large: 'p-3 text-lg'
  };

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  // バリアント設定
  const getButtonClasses = () => {
    const baseClasses = `inline-flex items-center space-x-1 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]}`;
    
    if (likeData.user_has_liked) {
      return `${baseClasses} bg-red-100 text-red-600 hover:bg-red-200 ${className}`;
    }
    
    if (variant === 'outline') {
      return `${baseClasses} border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 ${className}`;
    }
    
    return `${baseClasses} bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 ${className}`;
  };

  // いいね数を取得
  useEffect(() => {
    const loadLikeData = async () => {
      try {
        if (type === 'climb') {
          const data = await getClimbLikeCount(contentId, user?.id);
          setLikeData(data);
        } else {
          const data = await getPlanLikeCount(contentId, user?.id);
          setLikeData(data);
        }
      } catch (error) {
        console.error('いいね数の取得に失敗:', error);
      }
    };

    loadLikeData();
  }, [contentId, type, user?.id]);

  // いいねボタンクリック処理
  const handleLikeClick = async () => {
    if (!user) {
      alert('いいねをするにはログインが必要です');
      return;
    }

    // 自分の投稿にはいいねできない
    if (user.id === contentOwnerId) {
      alert('自分の投稿にはいいねできません');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (type === 'climb') {
        result = await toggleClimbLike(user.id, contentId);
      } else {
        result = await togglePlanLike(user.id, contentId);
      }

      if (result.success) {
        // 楽観的更新
        setLikeData(prev => ({
          count: result.action === 'added' ? prev.count + 1 : prev.count - 1,
          user_has_liked: result.action === 'added'
        }));
      } else {
        console.error('いいね操作に失敗:', result.error);
        alert('いいね操作に失敗しました');
      }
    } catch (error) {
      console.error('いいね操作中にエラー:', error);
      alert('いいね操作中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLikeClick}
      disabled={isLoading || !user}
      className={getButtonClasses()}
      title={
        !user 
          ? 'ログインが必要です' 
          : user.id === contentOwnerId 
          ? '自分の投稿にはいいねできません' 
          : likeData.user_has_liked 
          ? 'いいねを取り消す' 
          : 'いいね'
      }
    >
      {/* ハートアイコン */}
      <svg
        className={`${iconSizeClasses[size]} ${
          likeData.user_has_liked ? 'fill-current' : 'fill-none stroke-current'
        }`}
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>

      {/* いいね数 */}
      {showCount && (
        <span className="font-medium">
          {likeData.count}
        </span>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
      )}
    </button>
  );
}
