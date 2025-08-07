import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Latitude and longitude are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Google Maps API key not configured',
          code: 'MISSING_API_KEY'
        },
        { status: 500 }
      );
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(googleUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Google Elevation API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error_message) {
          errorMessage += ` - ${errorData.error_message}`;
        }
      } catch {}
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: errorMessage, code: 'GOOGLE_API_ERROR' },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const elevation = Math.round(data.results[0].elevation);
      return NextResponse.json<ApiResponse<{ elevation: number; source: string }>>({
        success: true,
        data: { elevation, source: 'google' }
      });
    } else {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No elevation data found',
          code: data.status || 'NO_RESULT'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
