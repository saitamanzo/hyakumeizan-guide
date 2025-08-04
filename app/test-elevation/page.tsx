'use client';

import { useState } from 'react';
import { getElevation, ElevationResult } from '@/lib/elevation';

export default function TestElevationPage() {
  const [result, setResult] = useState<ElevationResult | { error: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const testGoogleAPI = async () => {
    setLoading(true);
    console.log('🧪 Testing Google Elevation API...');
    
    try {
      // 富士山の座標でテスト（ただし、elevationパラメータは渡さない）
      const lat = 35.358056;
      const lng = 138.731111;
      
      console.log(`Testing coordinates: ${lat}, ${lng} (without provided elevation)`);
      // elevationパラメータを渡さないことで、強制的にGoogle APIを呼ぶ
      const elevationResult = await getElevation(lat, lng);
      console.log('Test result:', elevationResult);
      setResult(elevationResult);
    } catch (error) {
      console.error('Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({ error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Google Elevation API Test</h1>
      
      <button 
        onClick={testGoogleAPI}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Google Elevation API'}
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800">Instructions:</h3>
        <p className="text-yellow-700">
          1. ブラウザの開発者ツール（F12）を開く<br/>
          2. Consoleタブを選択<br/>
          3. 上のボタンをクリック<br/>
          4. コンソールに出力されるログを確認<br/>
          5. 富士山の座標でGoogle APIから標高を取得します（山の標高データは使用しません）
        </p>
      </div>
    </div>
  );
}
