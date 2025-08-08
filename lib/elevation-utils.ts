/**
 * 標高計算ユーティリティ（クライアントサイド用）
 */

/**
 * 標高に基づく気温補正（100mごとに0.6℃低下）
 */
export function calculateTemperatureCorrection(elevation: number, baseElevation: number = 0): number {
  return -((elevation - baseElevation) / 100) * 0.6;
}

/**
 * 標高に基づく気圧補正（100mごとに約12hPa低下）
 */
export function calculatePressureAtElevation(seaLevelPressure: number, elevation: number): number {
  return Math.round(seaLevelPressure - (elevation / 100) * 12);
}

/**
 * 標高に基づく風速補正（1000mごとに約20%増加）
 */
export function calculateWindSpeedCorrection(baseWindSpeed: number, elevation: number): number {
  return baseWindSpeed * (1 + (elevation / 1000) * 0.2);
}

/**
 * 標高・気温に基づく登山注意事項を生成
 */
export function generateElevationWarnings(elevation: number, temperature: number): string[] {
  const warnings: string[] = [];
  if (elevation > 3000) {
    warnings.push('高山病に注意（3000m以上）');
    warnings.push('酸素濃度が低下します');
  } else if (elevation > 2000) {
    warnings.push('高地での体調変化に注意');
  }
  if (elevation > 2500 && temperature < 10) {
    warnings.push('凍結や積雪の可能性あり');
  }
  if (elevation > 1500 && temperature < 5) {
    warnings.push('防寒具の準備を推奨');
  }
  if (elevation > 2000) {
    warnings.push('標高が高いため風が強くなる可能性あり');
  }
  return warnings;
}

/**
 * 標高補正済み天気データ型
 */
export interface ElevationCorrectedWeather {
  originalTemp: number;
  correctedTemp: number;
  originalPressure: number;
  correctedPressure: number;
  originalWindSpeed: number;
  correctedWindSpeed: number;
  elevation: number;
  temperatureCorrection: number;
}
