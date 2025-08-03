'use client';

import React, { useState, useEffect } from 'react';
import WeatherApiStatus from './WeatherApiStatus';

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: {
    main: string;
    description: string;
    icon: string;
  }[];
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  name: string;
}

interface ForecastData {
  list: {
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: {
      main: string;
      description: string;
      icon: string;
    }[];
    wind: {
      speed: number;
      deg: number;
    };
    dt_txt: string;
  }[];
}

interface DailyForecast {
  date: string;
  dayName: string;
  temp_min: number;
  temp_max: number;
  weather: {
    main: string;
    description: string;
    icon: string;
  };
  humidity: number;
  wind_speed: number;
}

interface WeatherInfoProps {
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation?: number;
}

export default function WeatherInfo({ latitude, longitude, mountainName, elevation }: WeatherInfoProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'forecast'>('current');
  const [estimatedElevation, setEstimatedElevation] = useState<number | null>(null);

  useEffect(() => {
    // 標高の推定（簡易計算）
    const estimateElevation = () => {
      if (elevation !== undefined) {
        setEstimatedElevation(elevation);
        return;
      }
      
      // 簡易標高推定（日本の地形を考慮した大まかな計算）
      
      // 簡易標高推定（日本の地形を考慮した大まかな計算）
      // より精密にはGoogle Elevation APIやOpenTopography APIを使用
      const lat = latitude;
      const lng = longitude;
      
      // 日本の主要山脈エリアの判定
      let estimatedAlt = 50; // デフォルト標高
      
      // 富士山周辺（高標高エリア）
      if (lat >= 35.0 && lat <= 35.8 && lng >= 138.5 && lng <= 139.0) {
        estimatedAlt = 1000 + Math.abs(Math.sin(lat * 10) * Math.cos(lng * 10)) * 2000;
      }
      // 日本アルプス（中部山岳）
      else if (lat >= 35.5 && lat <= 37.0 && lng >= 137.0 && lng <= 138.5) {
        estimatedAlt = 800 + Math.abs(Math.sin(lat * 8) * Math.cos(lng * 8)) * 1800;
      }
      // 関東山地
      else if (lat >= 35.5 && lat <= 36.5 && lng >= 138.5 && lng <= 139.5) {
        estimatedAlt = 300 + Math.abs(Math.sin(lat * 12) * Math.cos(lng * 12)) * 1200;
      }
      // 東北山地
      else if (lat >= 37.0 && lat <= 41.0 && lng >= 140.0 && lng <= 141.5) {
        estimatedAlt = 200 + Math.abs(Math.sin(lat * 6) * Math.cos(lng * 6)) * 1000;
      }
      // 九州山地
      else if (lat >= 31.0 && lat <= 34.0 && lng >= 130.0 && lng <= 132.0) {
        estimatedAlt = 200 + Math.abs(Math.sin(lat * 15) * Math.cos(lng * 15)) * 1400;
      }
      // その他の内陸部
      else if (lng >= 136.0 && lng <= 141.0) {
        estimatedAlt = 100 + Math.abs(Math.sin(lat * 20) * Math.cos(lng * 20)) * 800;
      }
      
      setEstimatedElevation(Math.round(estimatedAlt));
    };
    
    estimateElevation();
    
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // デモ用の天気データ（実際のAPIキーがない場合）
        // 位置に応じて少し変化させる
        const tempVariation = Math.sin(latitude * 0.1) * 5 + Math.cos(longitude * 0.1) * 3;
        const humidityVariation = Math.sin(latitude * 0.05) * 15;
        
        const demoWeatherData: WeatherData = {
          main: {
            temp: 15.5 + tempVariation,
            feels_like: 12.3 + tempVariation - 1,
            humidity: Math.max(30, Math.min(90, 65 + humidityVariation)),
            pressure: 1013 + Math.sin(latitude * 0.1) * 20
          },
          weather: [{
            main: "Clouds",
            description: "曇り",
            icon: "04d"
          }],
          wind: {
            speed: 3.2 + Math.sin(longitude * 0.1) * 2,
            deg: (220 + latitude + longitude) % 360
          },
          visibility: 10000,
          name: mountainName
        };

        // デモ用の7日間予報データ（位置に応じて変化）
        const tempBase = 15 + tempVariation;

        // 実際のAPI呼び出しかデモモードかを判定
        const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_WEATHER_API === 'true' && 
                          process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY && 
                          process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY !== 'demo_key_for_development';

        if (useRealAPI) {
          console.log('🌐 Using real OpenWeatherMap API');
          
          try {
            // 現在の天気を取得
            const currentResponse = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=ja`
            );
            
            if (!currentResponse.ok) {
              if (currentResponse.status === 401) {
                throw new Error('OpenWeatherMap APIキーが無効です。APIキーを確認してください。');
              } else if (currentResponse.status === 429) {
                throw new Error('API呼び出し制限に達しました。しばらくお待ちください。');
              } else {
                throw new Error(`天気データの取得に失敗しました (${currentResponse.status}): ${currentResponse.statusText}`);
              }
            }
            
            const currentData = await currentResponse.json();
            
            // 地名の日本語化（APIから取得した地名を使用、なければNominatimで取得）
            let displayName = currentData.name;
            if (!displayName || displayName === mountainName) {
              try {
                const geocodeResponse = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=ja`
                );
                if (geocodeResponse.ok) {
                  const geocodeData = await geocodeResponse.json();
                  displayName = geocodeData.display_name?.split(',')[0] || currentData.name || mountainName;
                }
              } catch (geocodeError) {
                console.warn('地名取得エラー:', geocodeError);
              }
            }
            
            setWeather({
              ...currentData,
              name: displayName
            });

            // 5日間予報を取得
            try {
              const forecastResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=ja`
              );
              
              if (forecastResponse.ok) {
                const forecastData: ForecastData = await forecastResponse.json();
                const dailyForecast = processForecastData(forecastData);
                setForecast(dailyForecast);
              } else {
                console.warn('予報データの取得に失敗:', forecastResponse.status, forecastResponse.statusText);
                // 予報取得に失敗した場合はデモデータを使用
                setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
              }
            } catch (forecastError) {
              console.warn('予報データの取得エラー:', forecastError);
              // 予報取得に失敗した場合はデモデータを使用
              setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
            }
            
          } catch (apiError) {
            console.error('Weather API Error:', apiError);
            // API取得に失敗した場合は完全にデモモードにフォールバック
            console.log('🎭 Falling back to demo mode due to API error');
            setWeather(demoWeatherData);
            setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
            // ユーザーにエラーを通知（ただし、表示は継続）
            setError(`Weather API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
          }
          
        } else {
          console.log('🎭 Using demo weather data mode');
          // デモデータを使用
          setTimeout(() => {
            setWeather(demoWeatherData);
            setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
          }, 500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '天気データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude, mountainName, elevation, setError]); // generateDemoForecastは内部関数なので依存配列から除外

  // 5日間予報データを日ごとに集約する関数
  const processForecastData = (data: ForecastData): DailyForecast[] => {
    const dailyData: { 
      [key: string]: {
        date: string;
        temps: number[];
        weather: { main: string; description: string; icon: string };
        humidity: number;
        wind_speed: number;
      }
    } = {};
    
    data.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          temps: [],
          weather: item.weather[0],
          humidity: item.main.humidity,
          wind_speed: item.wind.speed
        };
      }
      
      dailyData[date].temps.push(item.main.temp);
    });

    return Object.values(dailyData).slice(0, 7).map((day, index) => {
      const dayDate = new Date(day.date);
      let dayName;
      
      if (index === 0) {
        dayName = '今日';
      } else if (index === 1) {
        dayName = '明日';
      } else {
        dayName = dayDate.toLocaleDateString('ja-JP', { weekday: 'short' });
      }

      // 日付の表示形式を改善
      const displayDate = dayDate.toLocaleDateString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric'
      });

      return {
        date: day.date,
        dayName: `${dayName} ${displayDate}`,
        temp_min: Math.round(Math.min(...day.temps)),
        temp_max: Math.round(Math.max(...day.temps)),
        weather: day.weather,
        humidity: day.humidity,
        wind_speed: day.wind_speed
      };
    });
  };

  // デモ用の7日間予報データを生成する関数
  const generateDemoForecast = (tempBase: number, humidityVar: number, lng: number): DailyForecast[] => {
    const today = new Date();
    
    return [
      {
        date: today.toISOString().split('T')[0],
        dayName: `今日 ${today.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 3),
        temp_max: Math.round(tempBase + 3),
        weather: { main: "Clouds", description: "曇り", icon: "04d" },
        humidity: Math.max(30, Math.min(90, 65 + humidityVar)),
        wind_speed: 3.2 + Math.sin(lng * 0.1) * 2
      },
      {
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        dayName: `明日 ${new Date(Date.now() + 86400000).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 5),
        temp_max: Math.round(tempBase + 1),
        weather: { main: "Rain", description: "小雨", icon: "10d" },
        humidity: Math.max(30, Math.min(90, 80 + humidityVar * 0.5)),
        wind_speed: 4.1 + Math.sin(lng * 0.15) * 1.5
      },
      {
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        dayName: `${new Date(Date.now() + 86400000 * 2).toLocaleDateString('ja-JP', { weekday: 'short' })} ${new Date(Date.now() + 86400000 * 2).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 7),
        temp_max: Math.round(tempBase - 1),
        weather: { main: "Clear", description: "晴れ", icon: "01d" },
        humidity: Math.max(30, Math.min(90, 55 + humidityVar * 0.3)),
        wind_speed: 2.8 + Math.sin(lng * 0.08) * 1
      },
      {
        date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        dayName: `${new Date(Date.now() + 86400000 * 3).toLocaleDateString('ja-JP', { weekday: 'short' })} ${new Date(Date.now() + 86400000 * 3).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 4),
        temp_max: Math.round(tempBase + 4),
        weather: { main: "Clouds", description: "曇り時々晴れ", icon: "03d" },
        humidity: Math.max(30, Math.min(90, 60 + humidityVar * 0.4)),
        wind_speed: 3.5 + Math.sin(lng * 0.12) * 1.2
      },
      {
        date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        dayName: `${new Date(Date.now() + 86400000 * 4).toLocaleDateString('ja-JP', { weekday: 'short' })} ${new Date(Date.now() + 86400000 * 4).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 6),
        temp_max: Math.round(tempBase),
        weather: { main: "Rain", description: "雨", icon: "09d" },
        humidity: Math.max(30, Math.min(90, 85 + humidityVar * 0.2)),
        wind_speed: 5.2 + Math.sin(lng * 0.18) * 2
      },
      {
        date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        dayName: `${new Date(Date.now() + 86400000 * 5).toLocaleDateString('ja-JP', { weekday: 'short' })} ${new Date(Date.now() + 86400000 * 5).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 2),
        temp_max: Math.round(tempBase + 6),
        weather: { main: "Clear", description: "快晴", icon: "01d" },
        humidity: Math.max(30, Math.min(90, 45 + humidityVar * 0.3)),
        wind_speed: 2.1 + Math.sin(lng * 0.05) * 0.8
      },
      {
        date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
        dayName: `${new Date(Date.now() + 86400000 * 6).toLocaleDateString('ja-JP', { weekday: 'short' })} ${new Date(Date.now() + 86400000 * 6).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`,
        temp_min: Math.round(tempBase - 1),
        temp_max: Math.round(tempBase + 7),
        weather: { main: "Clear", description: "晴れ", icon: "02d" },
        humidity: Math.max(30, Math.min(90, 50 + humidityVar * 0.4)),
        wind_speed: 3.0 + Math.sin(lng * 0.1) * 1.5
      }
    ];
  };

  const getWeatherIcon = (iconCode: string) => {
    // シンプルな天気アイコンマッピング
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌧️', '09n': '🌧️',
      '10d': '🌦️', '10n': '🌦️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '❄️', '13n': '❄️',
      '50d': '🌫️', '50n': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
  };

  const getWindDirection = (deg: number) => {
    const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
    return directions[Math.round(deg / 22.5) % 16];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="h-6 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 text-red-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
          </svg>
          天気情報
          {estimatedElevation !== null && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              (標高 {estimatedElevation.toLocaleString()}m)
            </span>
          )}
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'current'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            現在
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'forecast'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            7日間予報
          </button>
        </div>
      </div>

      {/* 現在の天気タブ */}
      {activeTab === 'current' && (
        <div>
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
                  {estimatedElevation !== null && estimatedElevation > 1000 && (
                    <li>• 標高{estimatedElevation.toLocaleString()}mでは平地より約{Math.round((estimatedElevation / 100) * 0.6)}°C低くなります</li>
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
        <div>
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
