'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

interface TestResult {
  test: string;
  success: boolean;
  data: unknown;
  error: string | null;
}

export default function DebugDBPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 1. Basic connection test
      const { data: connectionTest, error: connectionError } = await supabase
        .from('mountains')
        .select('id, name')
        .limit(1);

      const result1 = {
        test: 'Connection Test (mountains table)',
        success: !connectionError,
        data: connectionTest,
        error: connectionError?.message || null
      };

      // 2. Check if climbs table exists
      const { data: climbsTest, error: climbsError } = await supabase
        .from('climbs')
        .select('id')
        .limit(1);

      const result2 = {
        test: 'Climbs Table Exists',
        success: !climbsError,
        data: climbsTest,
        error: climbsError?.message || null
      };

      // 3. Check if plans table exists
      const { data: plansTest, error: plansError } = await supabase
        .from('plans')
        .select('id')
        .limit(1);

      const result3 = {
        test: 'Plans Table Exists',
        success: !plansError,
        data: plansTest,
        error: plansError?.message || null
      };

      // 4. Check climb_photos table
      const { data: photosTest, error: photosError } = await supabase
        .from('climb_photos')
        .select('id')
        .limit(1);

      const result4 = {
        test: 'Climb Photos Table Exists',
        success: !photosError,
        data: photosTest,
        error: photosError?.message || null
      };

      // 5. Check user access
      let result5: TestResult = { test: 'User Access Test', success: false, data: null, error: 'No user' };
      if (user) {
        const { data: userTest, error: userError } = await supabase
          .from('climbs')
          .select('*')
          .eq('user_id', user.id)
          .limit(5);

        result5 = {
          test: 'User Climbs Access',
          success: !userError,
          data: userTest,
          error: userError?.message || null
        };
      }

      setResults([result1, result2, result3, result4, result5]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">データベース接続テスト</h1>
        
        <div className="mb-6">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '接続テスト中...' : '接続テスト実行'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            エラー: {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? '✅' : '❌'} {result.test}
                </h3>
                {result.error && (
                  <p className="text-red-600 mt-2">エラー: {result.error}</p>
                )}
                {result.data && (
                  <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">ユーザー情報:</h3>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify({ 
              user: user ? { id: user.id, email: user.email } : null 
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
