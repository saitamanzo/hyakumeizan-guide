'use server';

import { 
  calculateTemperatureCorrection, 
  calculatePressureAtElevation, 
  calculateWindSpeedCorrection,
  type ElevationCorrectedWeather 
} from './elevation-utils';

/**
 * 地理院標高APIを使用して標高を取得（複数座標の最高値を返す）
 */
export async function getElevationFromGSI(latitude: number, longitude: number): Promise<number | null> {
  const coordinatePatterns = [
    { lat: latitude, lon: longitude },
    { lat: latitude + 0.0001, lon: longitude },
    { lat: latitude - 0.0001, lon: longitude },
    { lat: latitude, lon: longitude + 0.0001 },
    { lat: latitude, lon: longitude - 0.0001 },
  ];
  const elevations: number[] = [];
  for (const coord of coordinatePatterns) {
    try {
      const response = await fetch(
        `https://cyberjapandata.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${coord.lon}&lat=${coord.lat}&outtype=JSON`,
        { cache: 'force-cache', next: { revalidate: 86400 } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.elevation === 'number' && !isNaN(data.elevation)) {
          elevations.push(Math.round(data.elevation));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`標高取得エラー (${coord.lat}, ${coord.lon}):`, error);
    }
  }
  if (elevations.length === 0) {
    console.warn(`全ての座標で標高取得に失敗: (${latitude}, ${longitude})`);
    return null;
  }
  return Math.max(...elevations);
}

/**
 * 高精度標高取得（山頂付近の詳細検索）
 */
export async function getHighPrecisionElevation(latitude: number, longitude: number): Promise<{ elevation: number; confidence: 'high' | 'medium' | 'low' } | null> {
  const radius = 0.0002;
  const gridPoints: { lat: number; lon: number }[] = [];
  for (let latOffset = -radius; latOffset <= radius; latOffset += radius / 2) {
    for (let lonOffset = -radius; lonOffset <= radius; lonOffset += radius / 2) {
      gridPoints.push({ lat: latitude + latOffset, lon: longitude + lonOffset });
    }
  }
  const elevations: number[] = [];
  let successCount = 0;
  for (const point of gridPoints) {
    try {
      const response = await fetch(
        `https://cyberjapandata.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${point.lon}&lat=${point.lat}&outtype=JSON`,
        { cache: 'force-cache', next: { revalidate: 86400 } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.elevation === 'number' && !isNaN(data.elevation)) {
          elevations.push(Math.round(data.elevation));
          successCount++;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch {
      // 個別エラーは警告程度
    }
  }
  if (elevations.length === 0) return null;
  const maxElevation = Math.max(...elevations);
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (successCount >= 20) confidence = 'high';
  else if (successCount >= 10) confidence = 'medium';
  return { elevation: maxElevation, confidence };
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
    let elevation: number | null = null;
    if (useHighPrecision) {
      const highPrecisionResult = await getHighPrecisionElevation(latitude, longitude);
      if (highPrecisionResult) elevation = highPrecisionResult.elevation;
    }
    if (elevation === null) elevation = await getElevationFromGSI(latitude, longitude);
    if (elevation === null) return null;
    const temperatureCorrection = calculateTemperatureCorrection(elevation);
    const correctedTemp = originalWeatherData.temp + temperatureCorrection;
    const correctedPressure = calculatePressureAtElevation(originalWeatherData.pressure, elevation);
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
    return null;
  }
}
