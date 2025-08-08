import { useState, useEffect, useCallback } from 'react';
import { getElevation, ElevationResult } from '@/lib/elevation';

export interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  /**
   * OpenWeatherMap APIの天気データ型
   */
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  name: string;
}

export interface DailyForecast {
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

export interface UseWeatherInfoOptions {
  /**
   * 1日分の天気予報データ型
   */
  latitude: number;
  longitude: number;
  mountainName: string;
  elevation?: number;
}

/**
 * useWeatherInfo - 天気・標高情報を取得するカスタムフック
 * @param options - 緯度・経度・山名・標高
 * @returns 天気データ・予報・標高・ローディング・エラー状態
 */
/**
 * useWeatherInfoのオプション型
 * @property latitude - 緯度
 * @property longitude - 経度
 * @property mountainName - 山名
 * @property elevation - 標高（任意）
 */
export function useWeatherInfo(options: UseWeatherInfoOptions) {
  const { latitude, longitude, mountainName, elevation } = options;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elevationData, setElevationData] = useState<ElevationResult | { error: string } | null>(null);
  const [elevationLoading, setElevationLoading] = useState(false);


  // 5日間予報データを日ごとに集約する関数
  interface ForecastData {
    list: Array<{
      dt: number;
      main: {
        temp: number;
        temp_min: number;
        temp_max: number;
        humidity: number;
      };
      weather: Array<{
        main: string;
        description: string;
        icon: string;
      }>;
      wind: {
        speed: number;
        deg: number;
      };
      dt_txt: string;
    }>;
  }

  const processForecastData = useCallback((data: ForecastData): DailyForecast[] => {
    const dailyData: { [key: string]: { date: string; temps: number[]; weather: { main: string; description: string; icon: string }; humidity: number; wind_speed: number; } } = {};
    data.list.forEach((item) => {
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
      if (index === 0) dayName = '今日';
      else if (index === 1) dayName = '明日';
      else dayName = dayDate.toLocaleDateString('ja-JP', { weekday: 'short' });
      const displayDate = dayDate.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
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
  }, []);

  // デモ用の7日間予報データを生成する関数
  const generateDemoForecast = useCallback((tempBase: number, humidityVar: number, lng: number): DailyForecast[] => {
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
  }, []);

  useEffect(() => {
    // エラーメッセージ統一ヘルパー
    const formatError = (context: string, err: unknown): string => {
      if (err instanceof Error) return `${context}: ${err.message}`;
      if (typeof err === 'string') return `${context}: ${err}`;
      return `${context}: 不明なエラー`;
    };

    // 標高データ取得
    const fetchElevation = async () => {
      setElevationLoading(true);
      try {
        const result = await getElevation(latitude, longitude);
        setElevationData(result);
      } catch (err) {
        setElevationData({ elevation: 500, lat: latitude, lng: longitude, source: 'estimated' });
        setError(formatError('標高取得エラー', err));
      } finally {
        setElevationLoading(false);
      }
    };
    fetchElevation();

    // 型ガード: WeatherData
    const isWeatherData = (data: unknown): data is WeatherData => {
      if (!data || typeof data !== 'object') return false;
      const d = data as WeatherData;
      return (
        typeof d.main?.temp === 'number' &&
        typeof d.main?.feels_like === 'number' &&
        typeof d.main?.humidity === 'number' &&
        typeof d.main?.pressure === 'number' &&
        Array.isArray(d.weather) &&
        typeof d.wind?.speed === 'number' &&
        typeof d.wind?.deg === 'number' &&
        typeof d.visibility === 'number' &&
        typeof d.name === 'string'
      );
    };

    // 型ガード: ForecastData
    const isForecastData = (data: unknown): data is ForecastData => {
      if (!data || typeof data !== 'object') return false;
      const d = data as ForecastData;
      return Array.isArray(d.list) && d.list.every(item =>
        typeof item.dt === 'number' &&
        typeof item.main?.temp === 'number' &&
        Array.isArray(item.weather) &&
        typeof item.wind?.speed === 'number' &&
        typeof item.dt_txt === 'string'
      );
    };

    // 天気データ取得
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      const tempVariation = Math.sin(latitude * 0.1) * 5 + Math.cos(longitude * 0.1) * 3;
      const humidityVariation = Math.sin(latitude * 0.05) * 15;
      const demoWeatherData: WeatherData = {
        main: {
          temp: 15.5 + tempVariation,
          feels_like: 12.3 + tempVariation - 1,
          humidity: Math.max(30, Math.min(90, 65 + humidityVariation)),
          pressure: 1013 + Math.sin(latitude * 0.1) * 20
        },
        weather: [{ main: "Clouds", description: "曇り", icon: "04d" }],
        wind: { speed: 3.2 + Math.sin(longitude * 0.1) * 2, deg: (220 + latitude + longitude) % 360 },
        visibility: 10000,
        name: mountainName
      };
      const tempBase = 15 + tempVariation;
      const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_WEATHER_API === 'true' && process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY && process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY !== 'demo_key_for_development';
      if (useRealAPI) {
        try {
          const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=ja`);
          if (!currentResponse.ok) {
            if (currentResponse.status === 401) throw new Error('OpenWeatherMap APIキーが無効です。APIキーを確認してください。');
            else if (currentResponse.status === 429) throw new Error('API呼び出し制限に達しました。しばらくお待ちください。');
            else throw new Error(`天気データの取得に失敗しました (${currentResponse.status}): ${currentResponse.statusText}`);
          }
          const currentData = await currentResponse.json();
          let displayName = (typeof currentData.name === 'string') ? currentData.name : mountainName;
          if (!displayName || displayName === mountainName) {
            try {
              const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=ja`);
              if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                displayName = typeof geocodeData.display_name === 'string' ? geocodeData.display_name.split(',')[0] : currentData.name || mountainName;
              }
            } catch (err) {
              setError(formatError('地名取得エラー', err));
            }
          }
          if (isWeatherData(currentData)) {
            setWeather({ ...currentData, name: displayName });
          } else {
            setWeather(demoWeatherData);
            setError('APIレスポンスの型が不正です。デモデータを表示します。');
          }
          try {
            const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric&lang=ja`);
            if (forecastResponse.ok) {
              const forecastData = await forecastResponse.json();
              if (isForecastData(forecastData)) {
                const dailyForecast = processForecastData(forecastData);
                setForecast(dailyForecast);
              } else {
                setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
                setError('予報APIレスポンスの型が不正です。デモデータを表示します。');
              }
            } else {
              setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
            }
          } catch (err) {
            setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
            setError(formatError('予報取得エラー', err));
          }
        } catch (apiError) {
          setWeather(demoWeatherData);
          setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
          setError(formatError('Weather API Error', apiError));
        }
      } else {
        setTimeout(() => {
          setWeather(demoWeatherData);
          setForecast(generateDemoForecast(tempBase, humidityVariation, longitude));
        }, 500);
      }
      setLoading(false);
    };
    fetchWeather();
  }, [latitude, longitude, mountainName, elevation, processForecastData, generateDemoForecast]);

  return {
    weather,
    forecast,
    loading,
    error,
    elevationData,
    elevationLoading,
    setError,
    setWeather,
    setForecast,
  };
}
