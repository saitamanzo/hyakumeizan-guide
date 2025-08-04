/**
 * 標高計算用のユーティリティ関数（クライアントサイド用）
 */

/**
 * 標高に基づく気温補正を計算
 * 一般的に100mごとに0.6℃低下
 */
export function calculateTemperatureCorrection(elevation: number, baseElevation: number = 0): number {
  const elevationDiff = elevation - baseElevation;
  return -(elevationDiff / 100) * 0.6;
}

/**
 * 標高に基づく気圧補正を計算
 * 海面更正気圧から実際の気圧を計算
 */
export function calculatePressureAtElevation(seaLevelPressure: number, elevation: number): number {
  // 気圧の高度による変化: 海面から100m上がるごとに約12hPa低下
  const pressureCorrection = (elevation / 100) * 12;
  return Math.round(seaLevelPressure - pressureCorrection);
}

/**
 * 標高に基づく風速補正
 * 高度が上がると風が強くなる傾向
 */
export function calculateWindSpeedCorrection(baseWindSpeed: number, elevation: number): number {
  // 1000mごとに約20%増加
  const windCorrection = (elevation / 1000) * 0.2;
  return baseWindSpeed * (1 + windCorrection);
}

/**
 * 標高に基づく登山注意事項を生成
 */
export function generateElevationWarnings(elevation: number, temperature: number): string[] {
  const warnings: string[] = [];

  // 標高による一般的な注意事項
  if (elevation > 3000) {
    warnings.push('高山病に注意してください（3000m以上）');
    warnings.push('酸素濃度が低下します');
  } else if (elevation > 2000) {
    warnings.push('高地での体調変化に注意してください');
  }

  // 気温と標高の組み合わせ
  if (elevation > 2500 && temperature < 10) {
    warnings.push('凍結や積雪の可能性があります');
  }

  if (elevation > 1500 && temperature < 5) {
    warnings.push('防寒具の準備をお勧めします');
  }

  // 風の影響
  if (elevation > 2000) {
    warnings.push('標高が高いため風が強くなる可能性があります');
  }

  return warnings;
}

/**
 * 標高情報を含む天気データの補正
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
