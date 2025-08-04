import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      console.warn('⚠️ Google Maps API key is not configured properly');
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    console.log(`🌐 Server-side calling Google Elevation API for (${lat}, ${lng})`);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    console.log('📡 Google API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google API Error response:', errorText);
      return NextResponse.json(
        { error: `Google Elevation API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📊 Google API Response data:', data);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const elevation = Math.round(data.results[0].elevation);
      console.log(`🏔️ Google Elevation API SUCCESS: ${elevation}m at (${lat}, ${lng})`);
      
      return NextResponse.json({
        elevation,
        status: 'success',
        source: 'google'
      });
    } else {
      console.warn('❌ Google Elevation API returned no results:', data.status, data.error_message);
      return NextResponse.json(
        { 
          error: 'No elevation data found',
          status: data.status,
          message: data.error_message 
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('❌ Server-side elevation API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
