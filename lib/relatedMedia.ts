export type MediaItem = {
  id: string;
  type: 'book' | 'photobook' | 'movie' | 'novel' | 'essay' | 'drama' | 'other';
  title: string;
  author?: string;
  year?: string;
  thumbnail?: string; // local path or external URL
  url: string; // 外部リンク
};

// Small in-memory map for manual entries.
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
    }
  ]
};

// エイリアス辞書（よくある別表記）
const ALIASES: Record<string, string[]> = {
  '富士': ['富士山'],
  '富士山': ['富士']
};

function normalizeName(s: string) {
  return s
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[・・,.。､]/g, '')
    .replace(/(岳|山|ヶ岳|岳$|山$)/g, '')
    .toLowerCase();
}

// レーベンシュタイン距離（小さめの文字列用）
function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function makeSearchFallback(name: string): MediaItem[] {
  const q = encodeURIComponent(name);
  const items: MediaItem[] = [
    // books / general
    { id: `search-amazon-${q}`, type: 'book', title: `${name} をAmazonで検索`, url: `https://www.amazon.co.jp/s?k=${q}`, thumbnail: '/file.svg' },
    { id: `search-googlebooks-${q}`, type: 'book', title: `${name} を書籍で検索`, url: `https://www.google.co.jp/search?tbm=bks&q=${q}`, thumbnail: '/file.svg' },
    { id: `search-wikipedia-${q}`, type: 'other', title: `${name} のWikipedia`, url: `https://ja.wikipedia.org/wiki/${q}`, thumbnail: '/file.svg' },

    // movies / films
    { id: `search-eiga-${q}`, type: 'movie', title: `${name} をeiga.comで検索`, url: `https://eiga.com/search/?q=${q}`, thumbnail: '/file.svg' },
    { id: `search-filmarks-${q}`, type: 'movie', title: `${name} をFilmarksで検索`, url: `https://filmarks.com/search?query=${q}`, thumbnail: '/file.svg' },
    { id: `search-imdb-${q}`, type: 'movie', title: `${name} をIMDbで検索`, url: `https://www.imdb.com/find?q=${q}`, thumbnail: '/file.svg' },

    // drama / TV
    { id: `search-thetv-${q}`, type: 'drama', title: `${name} をTheTVで検索`, url: `https://thetv.jp/search/?q=${q}`, thumbnail: '/file.svg' },

    // novels / light novels / ebooks
    { id: `search-bookwalker-${q}`, type: 'book', title: `${name} をBookWalkerで検索`, url: `https://bookwalker.jp/search/?keyword=${q}`, thumbnail: '/file.svg' },
    { id: `search-bookmeter-${q}`, type: 'book', title: `${name} をBookmeterで検索`, url: `https://bookmeter.com/search?query=${q}`, thumbnail: '/file.svg' },
    { id: `search-honto-${q}`, type: 'book', title: `${name} をhontoで検索`, url: `https://www.honto.jp/search.html?qt=${q}`, thumbnail: '/file.svg' },

    // video general
    { id: `search-youtube-${q}`, type: 'movie', title: `${name} をYouTubeで検索`, url: `https://www.youtube.com/results?search_query=${q}`, thumbnail: '/file.svg' }
  ];
  return items;
}

export function getRelatedMediaForMountain(name: string | undefined | null): MediaItem[] {
  if (!name) return [];
  // 1) まずは直キー
  if (MEDIA_MAP[name] && MEDIA_MAP[name].length) return MEDIA_MAP[name];

  const n = normalizeName(name);

  // 2) エイリアスを試す（短いリスト）
  for (const [k, vs] of Object.entries(ALIASES)) {
    if (k === name || vs.includes(name)) continue;
    if (normalizeName(k) === n || vs.map(normalizeName).includes(n)) {
      if (MEDIA_MAP[k] && MEDIA_MAP[k].length) return MEDIA_MAP[k];
    }
  }

  // 3) 正規化して完全一致
  for (const key of Object.keys(MEDIA_MAP)) {
    if (normalizeName(key) === n) return MEDIA_MAP[key];
  }

  // 4) トークン部分一致（複合語対応）
  const tokens = n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length) {
    for (const key of Object.keys(MEDIA_MAP)) {
      const kn = normalizeName(key);
      if (tokens.every(t => kn.includes(t))) return MEDIA_MAP[key];
    }
  }

  // 5) ファジー一致（Levenshtein）: 閾値は長さに応じて
  let best: { key: string; dist: number } | null = null;
  for (const key of Object.keys(MEDIA_MAP)) {
    const kn = normalizeName(key);
    const d = levenshtein(n, kn);
    const thresh = Math.max(1, Math.floor(Math.min(n.length, kn.length) * 0.3));
    if (d <= thresh) {
      if (!best || d < best.dist) best = { key, dist: d };
    }
  }
  if (best) return MEDIA_MAP[best.key];

  // 6) 部分一致（逆も含む）
  for (const key of Object.keys(MEDIA_MAP)) {
    const kn = normalizeName(key);
    if (kn.includes(n) || n.includes(kn)) return MEDIA_MAP[key];
  }

  // 7) 見つからない場合は外部検索へのフォールバックを返す
  return makeSearchFallback(name);
}
