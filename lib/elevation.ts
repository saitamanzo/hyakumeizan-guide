/**
 * 標高情報を取得（Google APIラッパー）
 */
export async function getElevation(lat: number, lng: number): Promise<ElevationResult | { error: string }> {
  const elevation = await getElevationFromGoogle(lat, lng);
  if (typeof elevation === 'number') {
    return {
      elevation,
      lat,
      lng,
      source: 'google',
    };
  } else {
    return { error: 'Failed to fetch elevation' };
  }
}
export interface ElevationResult {
  elevation: number;
  lat: number;
  lng: number;
  source: 'google' | 'estimated';
}

/**
 * Google Elevation API から標高を取得（Next.js API Route経由）
 */
export async function getElevationFromGoogle(lat: number, lng: number): Promise<number | null> {
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
    console.log('📡 API Route Response headers:', Object.fromEntries(response.headers.entries()));
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      console.error('❌ API Route Error response:', errorData);
      console.error('❌ Detailed error info:', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }
  const data = await response.json();
  return typeof data.elevation === 'number' ? data.elevation : null;
  } catch (error) {
    console.error('❌ Failed to fetch elevation:', error);
    return null;
  }
}
