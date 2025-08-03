'use client';

import { useState } from 'react';

export default function WeatherApiStatus() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const useRealAPI = process.env.NEXT_PUBLIC_USE_REAL_WEATHER_API === 'true';
  const hasApiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY && 
                   process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY !== 'demo_key_for_development';

  const getStatusColor = () => {
    if (useRealAPI && hasApiKey) return 'text-green-600 bg-green-50 border-green-200';
    if (useRealAPI && !hasApiKey) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getStatusText = () => {
    if (useRealAPI && hasApiKey) return '実際の天気API使用中';
    if (useRealAPI && !hasApiKey) return 'APIキーが未設定';
    return 'デモモード';
  };

  const getStatusIcon = () => {
    if (useRealAPI && hasApiKey) return '🌤️';
    if (useRealAPI && !hasApiKey) return '⚠️';
    return '🎭';
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="text-xs space-y-2">
            <div>
              <strong>使用モード:</strong> {useRealAPI ? '実際のAPI' : 'デモデータ'}
            </div>
            <div>
              <strong>APIキー:</strong> {hasApiKey ? '設定済み' : '未設定'}
            </div>
            {useRealAPI && !hasApiKey && (
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                <p className="font-medium mb-1">実際の天気データを使用するには:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li><a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="underline">OpenWeatherMap</a>でAPIキーを取得</li>
                  <li>.env.localファイルでNEXT_PUBLIC_OPENWEATHER_API_KEYを設定</li>
                  <li>NEXT_PUBLIC_USE_REAL_WEATHER_API=trueに変更</li>
                  <li>開発サーバーを再起動</li>
                </ol>
              </div>
            )}
            {useRealAPI && hasApiKey && (
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                <p className="font-medium mb-1">OpenWeatherMap API使用中</p>
                <p>実際の天気データを取得しています。</p>
                <div className="mt-2 text-xs text-gray-600">
                  <p><strong>よくある問題:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>401エラー:</strong> APIキーが無効または期限切れ</li>
                    <li><strong>429エラー:</strong> API呼び出し制限に達した</li>
                    <li><strong>解決方法:</strong> APIキーを確認し、必要に応じて新しいキーを取得</li>
                  </ul>
                </div>
              </div>
            )}
            {!useRealAPI && (
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                <p>現在はデモデータを使用しています。位置によって異なる模擬的な天気データを表示します。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
