export type MediaItem = {
  id: string;
  type: 'book' | 'photobook' | 'movie' | 'novel' | 'essay' | 'drama' | 'other';
  title: string;
  author?: string;
  year?: string;
  thumbnail?: string; // local path or external URL
  url: string; // 外部リンク
};

// 山名をキーにして関連メディアを返す簡易マッピング
// 将来的にはDBや外部APIに差し替え可能
const MEDIA_MAP: Record<string, MediaItem[]> = {
  '利尻岳': [
    {
      id: 'rishiri-book-1',
      type: 'book',
      title: '利尻礼文の山々（写真・紀行）',
      author: '写真家 例',
      year: '2010',
      thumbnail: '/file.svg',
      url: 'https://www.amazon.co.jp/s?k=%E5%88%A9%E5%B0%BB%E5%B2%B3+%E6%9C%AC'
    },
    {
      id: 'rishiri-photobook-1',
      type: 'photobook',
      title: '利尻の風景写真集',
      author: '写真家 例2',
      year: '2015',
      thumbnail: '/file.svg',
      url: 'https://www.amazon.co.jp/s?k=%E5%88%A9%E5%B0%BB+%E5%86%99%E7%9C%9F%E9%9B%86'
    }
  ],
  '富士山': [
    {
      id: 'fuji-book-1',
      type: 'book',
      title: '富士山を知る事典',
      author: '著者名 例',
      year: '2005',
      thumbnail: '/file.svg',
      url: 'https://ja.wikipedia.org/wiki/%E5%AF%8C%E5%A3%AB%E5%B1%B1'
    },
    {
      id: 'fuji-photobook-1',
      type: 'photobook',
      title: '富士山写真集',
      author: '写真家 例',
      year: '2012',
      thumbnail: '/file.svg',
      url: 'https://www.amazon.co.jp/s?k=%E5%AF%8C%E5%A3%AB%E5%B1%B1+%E5%86%99%E7%9C%9F%E9%9B%86'
    },
    {
      id: 'fuji-movie-1',
      type: 'movie',
      title: '富士山ドキュメンタリー',
      thumbnail: '/file.svg',
      url: 'https://www.youtube.com/results?search_query=%E5%AF%8C%E5%A3%AB%E5%B1%B1+%E3%83%89%E3%82%AD%E3%83%A5%E3%83%81%E3%83%A1%E3%83%B3%E3%82%BF%E3%83%AA%E3%83%BC'
    }
  ]
};

export function getRelatedMediaForMountain(name: string | undefined | null): MediaItem[] {
  if (!name) return [];
  const exact = MEDIA_MAP[name];
  if (exact && exact.length > 0) return exact;
  // 正規化して比較（接尾辞の違いを吸収）
  const normalize = (s: string) => s.replace(/\s+/g, '').replace(/(岳|山|ヶ岳|岳$|山$)/g, '').toLowerCase();
  const n = normalize(name);
  for (const key of Object.keys(MEDIA_MAP)) {
    if (key === name) continue; // 既に試した
    if (normalize(key) === n) return MEDIA_MAP[key];
  }
  // 部分一致も試みる
  for (const key of Object.keys(MEDIA_MAP)) {
    const kn = normalize(key);
    if (kn.includes(n) || n.includes(kn)) return MEDIA_MAP[key];
  }
  return [];
}
