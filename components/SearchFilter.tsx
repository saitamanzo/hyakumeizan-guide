'use client';

import { useState } from 'react';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  difficulty: string;
  prefecture: string;
  elevation: {
    min: number | null;
    max: number | null;
  };
  bestSeason: string;
}

const DIFFICULTY_LEVELS = ['', '初級', '中級', '上級'];
const PREFECTURES = [
  '', '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export default function SearchFilter({ onSearch, onFilterChange }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    difficulty: '',
    prefecture: '',
    elevation: { min: null, max: null },
    bestSeason: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      difficulty: '',
      prefecture: '',
      elevation: { min: null, max: null },
      bestSeason: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
    setSearchQuery('');
    onSearch('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      {/* 検索バー */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="山の名前を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            検索
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
          </button>
        </div>
      </form>

      {/* フィルター */}
      {showFilters && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 難易度フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                難易度
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => updateFilters({ difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">すべて</option>
                {DIFFICULTY_LEVELS.slice(1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* 都道府県フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                都道府県
              </label>
              <select
                value={filters.prefecture}
                onChange={(e) => updateFilters({ prefecture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">すべて</option>
                {PREFECTURES.slice(1).map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>

            {/* ベストシーズンフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ベストシーズン
              </label>
              <select 
                value={filters.bestSeason}
                onChange={(e) => updateFilters({ bestSeason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">すべて</option>
                <option value="春">春</option>
                <option value="夏">夏</option>
                <option value="秋">秋</option>
                <option value="冬">冬</option>
                <option value="通年">通年</option>
              </select>
            </div>

            {/* 標高フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                標高 (m)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最低"
                  value={filters.elevation.min || ''}
                  onChange={(e) => 
                    updateFilters({ 
                      elevation: { 
                        ...filters.elevation, 
                        min: e.target.value ? Number(e.target.value) : null 
                      }
                    })
                  }
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="number"
                  placeholder="最高"
                  value={filters.elevation.max || ''}
                  onChange={(e) => 
                    updateFilters({ 
                      elevation: { 
                        ...filters.elevation, 
                        max: e.target.value ? Number(e.target.value) : null 
                      }
                    })
                  }
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* フィルタークリアボタン */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              フィルターをクリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
