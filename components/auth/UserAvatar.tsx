'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import Link from 'next/link';
import Image from 'next/image';

export default function UserAvatar() {
  const { user, signOut, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 認証状態の監視
  }, [user, loading]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
    );
  }

  if (!user) {
    return null; // Headerで処理するため、ここではnullを返す
  }

  const handleSignOut = async () => {
    try {
      console.log('UserAvatar: ログアウト開始');
      await signOut();
      console.log('UserAvatar: ログアウト成功');
      setDropdownOpen(false);
    } catch (error) {
      console.error('UserAvatar: ログアウトエラー:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        {user.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name || user.email || 'User'}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        <span className="hidden md:block text-gray-700">
          {user.user_metadata?.full_name || user.email}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
          <div className="px-4 py-2 text-xs text-gray-500 border-b">{user.email}</div>
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
            onClick={() => setDropdownOpen(false)}
          >
            プロフィール
          </Link>
          <Link
            href="/plans"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
            onClick={() => setDropdownOpen(false)}
          >
            登山計画
          </Link>
          <Link
            href="/climbs"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
            onClick={() => setDropdownOpen(false)}
          >
            登山記録
          </Link>
          <Link
            href="/favorites"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
            onClick={() => setDropdownOpen(false)}
          >
            お気に入り
          </Link>
          <hr className="my-1" />
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
