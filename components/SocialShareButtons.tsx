'use client';

import React from 'react';
import { useAuth } from './auth/AuthProvider';
import { 
  createClimbTweetText, 
  createPlanTweetText,
  createClimbInstagramCaption,
  createPlanInstagramCaption,
  createTwitterShareUrl,
  shareToInstagram,
  trackSocialShare 
} from '@/lib/social-share-utils';
import { ClimbRecordWithMountain } from '@/lib/climb-utils';
import { PlanWithMountain } from '@/lib/plan-utils';

interface SocialShareButtonsProps {
  type: 'climb' | 'plan';
  data: ClimbRecordWithMountain | PlanWithMountain;
  ownerId: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
}

export default function SocialShareButtons({
  type,
  data,
  ownerId,
  className = '',
  size = 'medium',
  variant = 'horizontal',
  showLabels = true
}: SocialShareButtonsProps) {
  const { user } = useAuth();

  // 作成者のみがシェアできる
  if (!user || user.id !== ownerId) {
    return null;
  }

  // サイズ設定
  const sizeClasses = {
    small: 'p-2 text-sm',
    medium: 'p-3 text-base',
    large: 'p-4 text-lg'
  };

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  // レイアウト設定
  const layoutClasses = variant === 'horizontal' 
    ? 'flex items-center space-x-3' 
    : 'flex flex-col space-y-3';

  // Twitterシェア処理
  const handleTwitterShare = () => {
    try {
      let shareData;
      if (type === 'climb') {
        shareData = createClimbTweetText(data as ClimbRecordWithMountain);
      } else {
        shareData = createPlanTweetText(data as PlanWithMountain);
      }
      
      const twitterUrl = createTwitterShareUrl(shareData);
      window.open(twitterUrl, '_blank', 'width=550,height=420');
      
      // 統計追跡
      trackSocialShare('twitter', type, data.id || '');
    } catch (error) {
      console.error('Twitter共有エラー:', error);
      alert('Twitter共有に失敗しました');
    }
  };

  // Instagramシェア処理
  const handleInstagramShare = () => {
    try {
      let shareData;
      if (type === 'climb') {
        shareData = createClimbInstagramCaption(data as ClimbRecordWithMountain);
      } else {
        shareData = createPlanInstagramCaption(data as PlanWithMountain);
      }
      
      shareToInstagram(shareData);
      
      // 統計追跡
      trackSocialShare('instagram', type, data.id || '');
    } catch (error) {
      console.error('Instagram共有エラー:', error);
      alert('Instagram共有に失敗しました');
    }
  };

  return (
    <div className={`${layoutClasses} ${className}`}>
      {/* Twitterシェアボタン */}
      <button
        onClick={handleTwitterShare}
        className={`
          ${sizeClasses[size]} 
          bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
          transition-all duration-200 shadow-sm hover:shadow-md
          flex items-center space-x-2
        `}
        title="Twitterでシェア"
      >
        {/* Twitter アイコン */}
        <svg 
          className={iconSizeClasses[size]} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
        {showLabels && <span>Twitter</span>}
      </button>

      {/* Instagramシェアボタン */}
      <button
        onClick={handleInstagramShare}
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 
          text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md
          flex items-center space-x-2
        `}
        title="Instagramでシェア"
      >
        {/* Instagram アイコン */}
        <svg 
          className={iconSizeClasses[size]} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
        {showLabels && <span>Instagram</span>}
      </button>
    </div>
  );
}

// プリセットコンポーネント：コンパクト版
export function SocialShareButtonsCompact({
  type,
  data,
  ownerId,
  className = ''
}: Omit<SocialShareButtonsProps, 'size' | 'variant' | 'showLabels'>) {
  return (
    <SocialShareButtons
      type={type}
      data={data}
      ownerId={ownerId}
      size="small"
      variant="horizontal"
      showLabels={false}
      className={className}
    />
  );
}

// プリセットコンポーネント：フル版
export function SocialShareButtonsFull({
  type,
  data,
  ownerId,
  className = ''
}: Omit<SocialShareButtonsProps, 'size' | 'variant' | 'showLabels'>) {
  return (
    <SocialShareButtons
      type={type}
      data={data}
      ownerId={ownerId}
      size="medium"
      variant="horizontal"
      showLabels={true}
      className={className}
    />
  );
}
