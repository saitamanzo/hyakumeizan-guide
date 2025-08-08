'use client';

import React, { useState } from 'react';
import WeatherApiStatus from './WeatherApiStatus';
import { useWeatherInfo } from '@/hooks/useWeatherInfo';

interface WeatherInfoProps {
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation?: number;
}

const getWeatherIcon = (iconCode: string) => {
  const iconMap: { [key: string]: string } = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '�️', '50n': '🌫️'
  };
  return iconMap[iconCode] || '🌤️';
};

const getWindDirection = (deg: number) => {
  const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
  return directions[Math.round(deg / 22.5) % 16];
};

export default function WeatherInfo({ latitude, longitude, mountainName, elevation }: WeatherInfoProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'forecast'>('current');

  // キーボード操作対応: Tab切り替え
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tab: 'current' | 'forecast') => {
    if (e.key === 'Enter' || e.key === ' ') {
      setActiveTab(tab);
    }
  };
  const {
    weather,
    forecast,
    loading,
    error,
    elevationData,
    elevationLoading,
  } = useWeatherInfo({ latitude, longitude, mountainName, elevation });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" aria-busy="true" aria-live="polite">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-4 w-4 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
          <div className="h-6 bg-gray-300 rounded w-24 mb-2" />
          <div className="h-4 bg-gray-300 rounded w-32" />
        </div>
        {/* 予報タブのローディングスケルトン */}
        <div className="mt-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-red-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm" role="alert">{error}</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" role="region" aria-label="天気情報">
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <div className="flex items-start">
            <span className="text-red-500 mr-2 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">天気データ取得エラー</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-xs mt-1 text-red-600">
                現在はデモデータを表示しています。実際の天気データを取得するには、有効なAPIキーが必要です。
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* API Status */}
      <div className="mb-4">
        <WeatherApiStatus />
      </div>
      
      {/* タブナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
          </svg>
          天気情報
          {elevationData && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              {(elevationData && 'elevation' in elevationData) ? `(座標地点標高 ${elevationData.elevation.toLocaleString()}m)` : null}
            </span>
          )}
          {elevationLoading && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              標高取得中...
            </span>
          )}
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-1" role="tablist" aria-label="天気情報タブ">
          <button
            onClick={() => setActiveTab('current')}
            onKeyDown={e => handleTabKeyDown(e, 'current')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'current'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            role="tab"
            aria-selected={activeTab === 'current'}
            aria-controls="weather-current"
            tabIndex={activeTab === 'current' ? 0 : -1}
          >
            現在
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            onKeyDown={e => handleTabKeyDown(e, 'forecast')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'forecast'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            role="tab"
            aria-selected={activeTab === 'forecast'}
            aria-controls="weather-forecast"
            tabIndex={activeTab === 'forecast' ? 0 : -1}
          >
            7日間予報
          </button>
        </div>
      </div>

      {/* 標高情報表示（Google Maps APIから取得） */}
      {elevationData && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-blue-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                {elevationData && 'elevation' in elevationData
                  ? `座標地点の標高: ${elevationData.elevation.toLocaleString()}m`
                  : elevationData && 'error' in elevationData
                  ? `標高取得エラー: ${elevationData.error}`
                  : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {elevationData && 'source' in elevationData && elevationData.source === 'google' && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  Google Maps API
                </span>
              )}
              {elevationData && 'source' in elevationData && elevationData.source === 'estimated' && (
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                  推定値
                </span>
              )}
            </div>
          </div>
          {elevationData && 'source' in elevationData && elevationData.source === 'google' && (
            <p className="text-xs text-blue-600 mt-1">
              📍 この標高は座標地点（{latitude.toFixed(4)}, {longitude.toFixed(4)}）のGoogle Maps APIから取得した値です。
            </p>
          )}
        </div>
      )}

      {/* 現在の天気タブ */}
      {activeTab === 'current' && (
        <div id="weather-current" role="tabpanel" aria-labelledby="weather-current-tab">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                weekday: 'long' 
              })} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 現在
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 基本天気情報 */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getWeatherIcon(weather.weather[0].icon)}</span>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(weather.main.temp)}°C
                  </div>
                  <div className="text-sm text-gray-600">
                    体感 {Math.round(weather.main.feels_like)}°C
                  </div>
                </div>
              </div>
              <p className="text-gray-700 capitalize">
                {weather.weather[0].description}
              </p>
            </div>

            {/* 詳細情報 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">湿度:</span>
                <span className="font-medium">{weather.main.humidity}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">気圧:</span>
                <span className="font-medium">{weather.main.pressure} hPa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">風速:</span>
                <span className="font-medium">
                  {weather.wind.speed.toFixed(1)} m/s {getWindDirection(weather.wind.deg)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">視界:</span>
                <span className="font-medium">{(weather.visibility / 1000).toFixed(1)} km</span>
              </div>
            </div>
          </div>

          {/* 登山時の注意喚起 */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-yellow-800 font-medium mb-1">登山時の注意</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• 山頂付近は平地より気温が低くなります</li>
                  {elevationData && 'elevation' in elevationData && elevationData.elevation > 1000 && (
                    <li>• 標高{elevationData.elevation.toLocaleString()}mでは平地より約{Math.round((elevationData.elevation / 100) * 0.6)}°C低くなります</li>
                  )}
                  <li>• 天候は急変する可能性があります</li>
                  <li>• 風速が強い場合は十分注意してください</li>
                  <li>• 最新の気象情報を確認してから出発しましょう</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7日間予報タブ */}
      {activeTab === 'forecast' && (
        <div id="weather-forecast" role="tabpanel" aria-labelledby="weather-forecast-tab">
          <div className="text-sm text-gray-500 mb-4">
            今後7日間の天気予報（登山計画の参考にしてください）
          </div>
          
          <div className="space-y-3">
            {forecast.map((day, index) => (
              <div 
                key={day.date} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-20 text-sm">
                    <div className="font-medium text-gray-900">
                      {day.dayName.split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {day.dayName.split(' ')[1]}
                    </div>
                  </div>
                  <div className="text-lg">
                    {getWeatherIcon(day.weather.icon)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700">
                      {day.weather.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      湿度 {day.humidity}% • 風速 {day.wind_speed.toFixed(1)}m/s
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-900">
                      {day.temp_max}°
                    </span>
                    <span className="text-xs text-gray-500">/</span>
                    <span className="text-sm text-gray-600">
                      {day.temp_min}°
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 週間予報の注意事項 */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-green-800 font-medium mb-1">登山計画のヒント</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• 連続する晴天日を狙って計画を立てましょう</li>
                  <li>• 雨の日は避け、前後の天候も考慮してください</li>
                  <li>• 風の強い日は稜線歩きを避けることをお勧めします</li>
                  <li>• 予報は変更される可能性があります。出発前に再確認を</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
