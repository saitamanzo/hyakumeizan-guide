'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// SSRを無効にしてクライアントサイドでのみレンダリング
const MountainMap = dynamic(() => import('@/components/MountainMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <span className="text-gray-500">地図を読み込み中...</span>
  </div>
});

const WeatherInfo = dynamic(() => import('@/components/WeatherInfo'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <span className="text-gray-500">天気情報を読み込み中...</span>
  </div>
});

const ImageGallery = dynamic(() => import('@/components/ImageGallery'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
    <span className="text-gray-500">画像ギャラリーを読み込み中...</span>
  </div>
});

interface MountainMapWrapperProps {
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation: number;
}

interface WeatherMapIntegrationProps {
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation: number;
}

interface ImageGalleryWrapperProps {
  mountainId: string;
  mountainName: string;
}

export function MountainMapWrapper({ latitude, longitude, mountainName, elevation }: MountainMapWrapperProps) {
  return (
    <MountainMap 
      latitude={latitude}
      longitude={longitude}
      mountainName={mountainName}
      elevation={elevation}
    />
  );
}

// 天気と地図の統合コンポーネント
export function WeatherMapIntegration({ latitude, longitude, mountainName, elevation }: WeatherMapIntegrationProps) {
  const [weatherLocation, setWeatherLocation] = useState({
    lat: latitude,
    lng: longitude,
    name: mountainName,
    elevation: undefined // 常に座標から標高を取得するため、undefinedに設定
  });

  const handleLocationChange = (lat: number, lng: number, locationName?: string) => {
    setWeatherLocation({
      lat,
      lng,
      name: locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      elevation: undefined // 標高は座標から取得するため、undefinedに設定
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 天気情報 */}
      <div>
        <WeatherInfo 
          latitude={weatherLocation.lat}
          longitude={weatherLocation.lng}
          mountainName={weatherLocation.name}
          elevation={weatherLocation.elevation}
        />
        {weatherLocation.name !== mountainName && (
          <div className="mt-2 p-2 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-600">
              📍 選択地点: {weatherLocation.name}
            </p>
            <button 
              onClick={() => setWeatherLocation({ lat: latitude, lng: longitude, name: mountainName, elevation: undefined })}
              className="text-xs text-blue-500 hover:text-blue-700 underline mt-1"
            >
              元の山の天気に戻す
            </button>
          </div>
        )}
      </div>
      
      {/* 地図 */}
      <MountainMap 
        latitude={latitude}
        longitude={longitude}
        mountainName={mountainName}
        elevation={elevation}
        onLocationChange={handleLocationChange}
        enableLocationChange={true}
      />
    </div>
  );
}

export function ImageGalleryWrapper({ mountainId, mountainName }: ImageGalleryWrapperProps) {
  return (
    <ImageGallery 
      mountainId={mountainId}
      mountainName={mountainName}
    />
  );
}
