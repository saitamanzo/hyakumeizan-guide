'use server';

import { 
  calculateTemperatureCorrection, 
  calculatePressureAtElevation, 
  calculateWindSpeedCorrection,
  type ElevationCorrectedWeather 
} from './elevation-utils';

/**
 * 地理院標高APIを使用して標高を取得
 * 複数の座標パターンを試行して最も正確な標高を取得
 */
export async function getElevationFromGSI(latitude: number, longitude: number): Promise<number | null> {
  // 複数の座標パターンを試行（中心点と周辺点）
  const coordinatePatterns = [
    { lat: latitude, lon: longitude }, // 中心点
    { lat: latitude + 0.0001, lon: longitude }, // 北に約11m
    { lat: latitude - 0.0001, lon: longitude }, // 南に約11m
    { lat: latitude, lon: longitude + 0.0001 }, // 東に約11m（緯度による補正は簡略化）
    { lat: latitude, lon: longitude - 0.0001 }, // 西に約11m
  ];

  const elevations: number[] = [];

  for (const coord of coordinatePatterns) {
    try {
      const response = await fetch(
        `https://cyberjapandata.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${coord.lon}&lat=${coord.lat}&outtype=JSON`,
        { 
          cache: 'force-cache',
          next: { revalidate: 86400 } // 24時間キャッシュ
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.elevation !== null && data.elevation !== undefined && !isNaN(data.elevation)) {
          elevations.push(Math.round(data.elevation));
        }
      }
      
      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn(`標高取得エラー (${coord.lat}, ${coord.lon}):`, error);
    }
  }

  if (elevations.length === 0) {
    console.warn(`全ての座標で標高取得に失敗: (${latitude}, ${longitude})`);
    return null;
  }

  // 複数の標高値がある場合は最高値を採用（山頂を想定）
  const maxElevation = Math.max(...elevations);
  
  console.log(`標高取得成功: ${maxElevation}m (${elevations.length}点中の最高値)`);
  return maxElevation;
}

/**
 * 高精度標高取得（山頂付近の詳細検索）
 */
export async function getHighPrecisionElevation(latitude: number, longitude: number): Promise<{elevation: number, confidence: 'high' | 'medium' | 'low'} | null> {
  // より細かいグリッドで検索
  const radius = 0.0002; // 約22m範囲
  const gridPoints = [];
  
  for (let latOffset = -radius; latOffset <= radius; latOffset += radius/2) {
    for (let lonOffset = -radius; lonOffset <= radius; lonOffset += radius/2) {
      gridPoints.push({
        lat: latitude + latOffset,
        lon: longitude + lonOffset
      });
    }
  }

  const elevations: number[] = [];
  let successCount = 0;

  for (const point of gridPoints) {
    try {
      const response = await fetch(
        `https://cyberjapandata.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${point.lon}&lat=${point.lat}&outtype=JSON`,
        { 
          cache: 'force-cache',
          next: { revalidate: 86400 }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data && data.elevation !== null && data.elevation !== undefined && !isNaN(data.elevation)) {
          elevations.push(Math.round(data.elevation));
          successCount++;
        }
      }
      
      // API制限を考慮
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch {
      // 個別エラーは警告程度に留める
    }
  }

  if (elevations.length === 0) {
    return null;
  }

  const maxElevation = Math.max(...elevations);
  
  // 信頼度を判定
  let confidence: 'high' | 'medium' | 'low';
  if (successCount >= 20) {
    confidence = 'high';
  } else if (successCount >= 10) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  console.log(`高精度標高取得: ${maxElevation}m (信頼度: ${confidence}, ${successCount}/${gridPoints.length}点成功)`);
  
  return {
    elevation: maxElevation,
    confidence
  };
}

/**
 * 標高を考慮した天気データの補正を実行
 */
export async function getElevationCorrectedWeather(
  latitude: number,
  longitude: number,
  originalWeatherData: {
    temp: number;
    pressure: number;
    windSpeed: number;
  },
  useHighPrecision: boolean = false
): Promise<ElevationCorrectedWeather | null> {
  try {
    // 1. 標高を取得（高精度オプション対応）
    let elevation: number | null = null;
    
    if (useHighPrecision) {
      const highPrecisionResult = await getHighPrecisionElevation(latitude, longitude);
      if (highPrecisionResult) {
        elevation = highPrecisionResult.elevation;
        console.log(`高精度標高使用: ${elevation}m (信頼度: ${highPrecisionResult.confidence})`);
      }
    }
    
    // 高精度取得に失敗した場合は通常取得
    if (elevation === null) {
      elevation = await getElevationFromGSI(latitude, longitude);
    }
    
    if (elevation === null) {
      console.warn('標高データを取得できませんでした');
      return null;
    }

    // 2. 気温補正
    const temperatureCorrection = calculateTemperatureCorrection(elevation);
    const correctedTemp = originalWeatherData.temp + temperatureCorrection;

    // 3. 気圧補正
    const correctedPressure = calculatePressureAtElevation(originalWeatherData.pressure, elevation);

    // 4. 風速補正
    const correctedWindSpeed = calculateWindSpeedCorrection(originalWeatherData.windSpeed, elevation);

    return {
      originalTemp: originalWeatherData.temp,
      correctedTemp,
      originalPressure: originalWeatherData.pressure,
      correctedPressure,
      originalWindSpeed: originalWeatherData.windSpeed,
      correctedWindSpeed,
      elevation,
      temperatureCorrection
    };

  } catch (error) {
    console.error('標高補正された天気データの取得エラー:', error);
    return null;
  }
}
