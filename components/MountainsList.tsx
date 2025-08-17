'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Mountain } from '@/types/database';
import SearchFilter, { type SearchFilters } from './SearchFilter';

interface MountainsListProps {
  initialMountains: Mountain[];
}

export default function MountainsList({ initialMountains }: MountainsListProps) {
  const [mountains] = useState<Mountain[]>(initialMountains);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'elevation' | 'difficulty' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [filters, setFilters] = useState<SearchFilters>({
    difficulty: '',
    prefecture: '',
    elevation: { min: null, max: null },
    bestSeason: ''
  });
  const [filteredMountains, setFilteredMountains] = useState<Mountain[]>(initialMountains);
  const [isLoading, setIsLoading] = useState(false);

  // サーバー同期型お気に入り機能
  const toggleFavorite = async (mountainId: string) => {
    if (!user) {
      window.location.href = '/signin';
      return;
    }
    const isFavorite = favorites.has(mountainId);
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isFavorite) {
        newFavorites.delete(mountainId);
      } else {
        newFavorites.add(mountainId);
      }
      return newFavorites;
    });
    if (isFavorite) {
      await supabase
        .from('mountain_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('mountain_id', mountainId);
    } else {
      await supabase
        .from('mountain_favorites')
        .insert({ user_id: user.id, mountain_id: mountainId });
    }
    fetchFavorites();
  };

  // サーバーからお気に入り取得
  const fetchFavorites = async () => {
    if (!user) {
      setFavorites(new Set());
      setLoadingFavorites(false);
      return;
    }
    setLoadingFavorites(true);
    const { data, error } = await supabase
      .from('mountain_favorites')
      .select('mountain_id');
    if (error) {
      setFavorites(new Set());
      setLoadingFavorites(false);
      return;
    }
    const favoriteIds = new Set((data ?? []).map((like: { mountain_id: string }) => like.mountain_id));
    setFavorites(favoriteIds);
    setLoadingFavorites(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 検索クエリのデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(true);

    const filterMountains = () => {
      let filtered = mountains;

      // テキスト検索
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        filtered = filtered.filter(mountain => 
          mountain.name.toLowerCase().includes(query) ||
          mountain.prefecture.toLowerCase().includes(query)
        );
      }

      // 難易度フィルター
      if (filters.difficulty) {
        filtered = filtered.filter(mountain => 
          mountain.difficulty_level === filters.difficulty
        );
      }

      // 都道府県フィルター
      if (filters.prefecture) {
        filtered = filtered.filter(mountain => 
          mountain.prefecture === filters.prefecture
        );
      }

      // 標高フィルター
      if (filters.elevation.min !== null || filters.elevation.max !== null) {
        filtered = filtered.filter(mountain => {
          const minOk = filters.elevation.min === null || mountain.elevation >= filters.elevation.min;
          const maxOk = filters.elevation.max === null || mountain.elevation <= filters.elevation.max;
          return minOk && maxOk;
        });
      }

      // ベストシーズンフィルター
      if (filters.bestSeason) {
        filtered = filtered.filter(mountain => 
          mountain.best_season === filters.bestSeason
        );
      }

      // ソート
      const sorted = [...filtered].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'ja');
            break;
          case 'elevation':
            comparison = a.elevation - b.elevation;
            break;
          case 'difficulty': {
            const difficultyOrder: Record<string, number> = { 初級: 1, 中級: 2, 上級: 3 };
            const aLevel = a.difficulty_level ? difficultyOrder[a.difficulty_level] ?? 0 : 0;
            const bLevel = b.difficulty_level ? difficultyOrder[b.difficulty_level] ?? 0 : 0;
            comparison = aLevel - bLevel;
            break;
          }
          case 'category': {
            // NULL は最後扱い
            const aCat = (a.category ?? 999) * 100 + (a.category_order ?? 99);
            const bCat = (b.category ?? 999) * 100 + (b.category_order ?? 99);
            comparison = aCat - bCat;
            break;
          }
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setFilteredMountains(sorted);
      setIsLoading(false);
    };

    const timer = setTimeout(filterMountains, 100);
    return () => clearTimeout(timer);
  }, [mountains, debouncedSearchQuery, filters, sortBy, sortOrder]);

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filters]);

  // ページネーション計算
  const totalPages = Math.ceil(filteredMountains.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMountains = filteredMountains.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 未ログイン時はお気に入り機能をスキップ
  if (authLoading || loadingFavorites) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    // お気に入り機能なしで山一覧のみ表示
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              日本百名山一覧
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              深田久弥が選定した日本を代表する100座の山々
            </p>
          </div>
          <SearchFilter onSearch={setSearchQuery} onFilterChange={setFilters} />
          {/* 検索・ソート・ページネーション・山一覧部分のみ表示（お気に入りボタン非表示） */}
          {/* ...既存の山一覧表示部分を流用... */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredMountains.length} 件の山が見つかりました
              {debouncedSearchQuery && ` (「${debouncedSearchQuery}」で検索)`}
              {totalPages > 1 && (
                <span className="ml-2">
                  (ページ {currentPage}/{totalPages})
                </span>
              )}
            </p>
            {totalPages > 1 && (
              <div className="text-sm text-gray-600">
                {startIndex + 1}-{Math.min(endIndex, filteredMountains.length)} 件を表示中
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentMountains.map((mountain) => (
              <Link
                key={mountain.id}
                href={`/mountains/${mountain.id}`}
                className="block group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
                  {/* 山の画像 */}
                  <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600">
                        {mountain.name}
                      </h2>
                      <span className="text-sm text-gray-600">
                        {mountain.elevation}m
                      </span>
                    </div>
                    {mountain.category !== null && mountain.category !== undefined && (
                      <p className="text-xs text-gray-500 mb-1">
                        カテゴリ: {mountain.category} / 順位: {mountain.category_order ?? '-'}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      {mountain.prefecture}
                    </p>
                    <div className="flex items-center space-x-2">
                      {mountain.difficulty_level && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mountain.difficulty_level}
                        </span>
                      )}
                      {mountain.best_season && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {mountain.best_season}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                  })
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          key={`page-btn-${page}`}
                          onClick={() => goToPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
          {/* 結果がない場合 */}
          {filteredMountains.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">結果が見つかりません</h3>
              <p className="mt-1 text-sm text-gray-500">検索条件を変更してお試しください。</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            日本百名山一覧
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            深田久弥が選定した日本を代表する100座の山々
          </p>
        </div>

        {/* 検索・フィルター */}
        <SearchFilter
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
        />

        {/* ソート機能 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">並び順:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'elevation' | 'difficulty' | 'category')}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="name">山名順</option>
                <option value="elevation">標高順</option>
                <option value="difficulty">難易度順</option>
                <option value="category">カテゴリ順</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {sortOrder === 'asc' ? '昇順 ↑' : '降順 ↓'}
              </button>
            </div>
            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-sm text-gray-600">
                お気に入り: {favorites.size}件
              </span>
              <span className="text-sm text-gray-600">|</span>
              <label className="text-sm text-gray-600">表示件数:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={6}>6件</option>
                <option value={12}>12件</option>
                <option value={24}>24件</option>
                <option value={48}>48件</option>
              </select>
            </div>
          </div>
        </div>

        {/* 検索結果の表示 */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredMountains.length} 件の山が見つかりました
            {debouncedSearchQuery && ` (「${debouncedSearchQuery}」で検索)`}
            {totalPages > 1 && (
              <span className="ml-2">
                (ページ {currentPage}/{totalPages})
              </span>
            )}
          </p>
          {totalPages > 1 && (
            <div className="text-sm text-gray-600">
              {startIndex + 1}-{Math.min(endIndex, filteredMountains.length)} 件を表示中
            </div>
          )}
        </div>

        {/* 山の一覧 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">検索中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentMountains.map((mountain) => (
              <Link
                key={mountain.id}
                href={`/mountains/${mountain.id}`}
                className="block group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
                  {/* お気に入りボタン */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(mountain.id);
                    }}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
                  >
                    {favorites.has(mountain.id) ? (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )}
                  </button>

                  {/* 山の画像 */}
                  <div className="h-48 bg-gradient-to-br from-green-400 to-blue-500"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600">
                        {mountain.name}
                      </h2>
                      <span className="text-sm text-gray-600">
                        {mountain.elevation}m
                      </span>
                    </div>
                    {mountain.category !== null && mountain.category !== undefined && (
                      <p className="text-xs text-gray-500 mb-1">
                        カテゴリ: {mountain.category} / 順位: {mountain.category_order ?? '-'}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      {mountain.prefecture}
                    </p>
                    <div className="flex items-center space-x-2">
                      {mountain.difficulty_level && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mountain.difficulty_level}
                        </span>
                      )}
                      {mountain.best_season && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {mountain.best_season}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              {/* 前のページ */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              {/* ページ番号 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                })
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1;
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => goToPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              {/* 次のページ */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        )}

        {/* 結果がない場合 */}
        {filteredMountains.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">結果が見つかりません</h3>
            <p className="mt-1 text-sm text-gray-500">検索条件を変更してお試しください。</p>
          </div>
        )}
      </div>
    </div>
  );
}
