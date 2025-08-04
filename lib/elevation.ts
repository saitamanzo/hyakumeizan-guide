/**
 * 標高取得ユーティリティ
 * Google Elevation API を使用して正確な標高データを取得
 */

export interface ElevationResult {
  elevation: number;
  source: 'google' | 'estimated' | 'cache';
  accuracy?: 'high' | 'medium' | 'low';
}

// キャッシュ用のインターフェース
interface ElevationCache {
  [key: string]: {
    elevation: number;
    timestamp: number;
    source: 'google' | 'estimated';
  };
}

// メモリキャッシュ（セッション中のみ有効）
let elevationCache: ElevationCache = {};

// キャッシュの有効期限（1時間）
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Google Elevation API から標高を取得（Next.js API Route経由）
 */
async function getElevationFromGoogle(lat: number, lng: number): Promise<number | null> {
  try {
    console.log(`🌐 Calling elevation API route for (${lat}, ${lng})`);
    
    const response = await fetch(
      `/api/elevation?lat=${lat}&lng=${lng}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    console.log('📡 API Route Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route Error response:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('📊 API Route Response data:', data);

    if (data.status === 'success' && data.elevation !== undefined) {
      console.log(`🏔️ Elevation API SUCCESS: ${data.elevation}m at (${lat}, ${lng})`);
      return data.elevation;
    } else {
      console.warn('❌ Elevation API returned no results:', data);
      return null;
    }

  } catch (error) {
    console.error('❌ Elevation API Network Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      // ネットワークエラーの詳細な分類
      if (error.message.includes('Failed to fetch')) {
        console.error('🌐 Network connectivity issue detected');
      } else if (error.message.includes('timeout')) {
        console.error('⏰ Request timeout detected');
      }
    }
    return null;
  }
}

/**
 * 簡易標高推定（日本の地形を考慮）
 */
function estimateElevationJapan(lat: number, lng: number): number {
  // 日本の主要山脈エリアの判定
  let estimatedAlt = 50; // デフォルト標高
  
  // 富士山周辺（高標高エリア）
  if (lat >= 35.0 && lat <= 35.8 && lng >= 138.5 && lng <= 139.0) {
    estimatedAlt = 1000 + Math.abs(Math.sin(lat * 10) * Math.cos(lng * 10)) * 2000;
  }
  // 日本アルプス（中部山岳）
  else if (lat >= 35.5 && lat <= 37.0 && lng >= 137.0 && lng <= 138.5) {
    estimatedAlt = 800 + Math.abs(Math.sin(lat * 8) * Math.cos(lng * 8)) * 1800;
  }
  // 関東山地
  else if (lat >= 35.5 && lat <= 36.5 && lng >= 138.5 && lng <= 139.5) {
    estimatedAlt = 300 + Math.abs(Math.sin(lat * 12) * Math.cos(lng * 12)) * 1200;
  }
  // 東北山地
  else if (lat >= 37.0 && lat <= 41.0 && lng >= 140.0 && lng <= 141.5) {
    estimatedAlt = 200 + Math.abs(Math.sin(lat * 6) * Math.cos(lng * 6)) * 1000;
  }
  // 九州山地
  else if (lat >= 31.0 && lat <= 34.0 && lng >= 130.0 && lng <= 132.0) {
    estimatedAlt = 200 + Math.abs(Math.sin(lat * 15) * Math.cos(lng * 15)) * 1400;
  }
  // その他の内陸部
  else if (lng >= 136.0 && lng <= 141.0) {
    estimatedAlt = 100 + Math.abs(Math.sin(lat * 20) * Math.cos(lng * 20)) * 800;
  }
  
  return Math.round(estimatedAlt);
}

/**
 * キャッシュキーを生成
 */
function getCacheKey(lat: number, lng: number): string {
  // 小数点第4位まで丸めてキャッシュキーとする（約11m精度）
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `${roundedLat},${roundedLng}`;
}

/**
 * キャッシュから標高を取得
 */
function getFromCache(lat: number, lng: number): ElevationResult | null {
  const key = getCacheKey(lat, lng);
  const cached = elevationCache[key];
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return {
      elevation: cached.elevation,
      source: 'cache',
      accuracy: cached.source === 'google' ? 'high' : 'low'
    };
  }
  
  return null;
}

/**
 * キャッシュに標高を保存
 */
function saveToCache(lat: number, lng: number, elevation: number, source: 'google' | 'estimated'): void {
  const key = getCacheKey(lat, lng);
  elevationCache[key] = {
    elevation,
    timestamp: Date.now(),
    source
  };
}

/**
 * メイン関数：標高を取得（複数ソースを試行）
 */
export async function getElevation(lat: number, lng: number, useProvidedElevation?: number): Promise<ElevationResult> {
  console.log(`🔎 getElevation called for (${lat}, ${lng}), provided elevation: ${useProvidedElevation}`);
  
  // 1. 既に提供されている標高がある場合はそれを使用
  if (useProvidedElevation !== undefined && useProvidedElevation > 0) {
    console.log(`✅ Using provided elevation: ${useProvidedElevation}m`);
    return {
      elevation: Math.round(useProvidedElevation),
      source: 'google', // データベースの値は信頼性が高いものとして扱う
      accuracy: 'high'
    };
  }

  // 2. キャッシュをチェック
  const cached = getFromCache(lat, lng);
  if (cached) {
    console.log(`📋 Using cached elevation: ${cached.elevation}m`);
    return cached;
  }

  // 3. Google Elevation API を試行
  console.log('🚀 Attempting Google Elevation API...');
  try {
    const googleElevation = await getElevationFromGoogle(lat, lng);
    if (googleElevation !== null) {
      saveToCache(lat, lng, googleElevation, 'google');
      return {
        elevation: Math.round(googleElevation),
        source: 'google',
        accuracy: 'high'
      };
    }
  } catch (error) {
    console.warn('❌ Google Elevation API failed, falling back to estimation:', error);
    
    // エラーの詳細情報をログ出力
    if (error instanceof Error) {
      console.warn('Error type:', error.constructor.name);
      console.warn('Error message:', error.message);
    }
  }

  // 4. フォールバック：簡易推定
  const estimatedElevation = estimateElevationJapan(lat, lng);
  saveToCache(lat, lng, estimatedElevation, 'estimated');
  
  console.log(`📐 Using estimated elevation: ${estimatedElevation}m`);
  return {
    elevation: Math.round(estimatedElevation),
    source: 'estimated',
    accuracy: 'low'
  };
}

/**
 * キャッシュをクリア（開発用）
 */
export function clearElevationCache(): void {
  elevationCache = {};
  console.log('🗑️ Elevation cache cleared');
}

/**
 * 複数地点の標高を一括取得（将来の拡張用）
 */
export async function getBatchElevations(locations: Array<{lat: number, lng: number}>): Promise<ElevationResult[]> {
  // 現在は個別に取得、将来的にはGoogle APIのバッチ機能を使用可能
  const results = await Promise.all(
    locations.map(async (location) => {
      return await getElevation(location.lat, location.lng);
    })
  );
  
  return results;
}
