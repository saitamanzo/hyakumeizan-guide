import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    console.log(`🔍 Elevation API called with lat=${lat}, lng=${lng}`);

    if (!lat || !lng) {
      console.error('❌ Missing required parameters');
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('🔑 API Key status:', {
      exists: !!apiKey,
      length: apiKey?.length || 0,
      startsWithAI: apiKey?.startsWith('AI') || false,
      isDemo: apiKey === 'your_google_maps_api_key'
    });
    
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      console.warn('⚠️ Google Maps API key is not configured properly');
      return NextResponse.json(
        { 
          error: 'Google Maps API key not configured',
          details: 'Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable',
          status: 'missing_api_key',
          availableEnvVars: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('MAP')),
          nodeEnv: process.env.NODE_ENV
        },
        { status: 500 }
      );
    }

    console.log(`🌐 Server-side calling Google Elevation API for (${lat}, ${lng})`);

    const googleUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;
    console.log('🔗 Google API URL (without key):', googleUrl.replace(apiKey, '[API_KEY]'));

    const response = await fetch(googleUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📡 Google API Response status:', response.status);
    console.log('📡 Google API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google API Error response:', errorText);
      
      // 具体的なエラー内容を返す
      let errorMessage = `Google Elevation API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error_message) {
          errorMessage += ` - ${errorData.error_message}`;
        }
      } catch {
        console.warn('Failed to parse error response as JSON');
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: errorText
        },
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
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
