import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('🔍 データベース構造を確認中...');
    
    // テーブルの存在確認
    const tables = ['climbs', 'climb_photos', 'likes', 'climbing_plans', 'mountains', 'users'];
    const tableStatus: Record<string, {
      exists: boolean;
      hasData?: boolean;
      sampleCount?: number;
      error?: string;
      code?: string;
      sampleData?: unknown;
      photosError?: unknown;
    }> = {};
    
    for (const tableName of tables) {
      try {
        // テーブルの存在確認とサンプルクエリ
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ テーブル ${tableName} エラー:`, error);
          tableStatus[tableName] = {
            exists: false,
            error: error.message,
            code: error.code
          };
        } else {
          console.log(`✅ テーブル ${tableName} 存在確認OK`);
          tableStatus[tableName] = {
            exists: true,
            hasData: data && data.length > 0,
            sampleCount: data ? data.length : 0
          };
        }
      } catch (err) {
        console.error(`💥 テーブル ${tableName} 例外:`, err);
        tableStatus[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }
    
    // climb_photos テーブルの詳細確認
    if (tableStatus.climb_photos?.exists) {
      try {
        const { data: photos, error: photosError } = await supabase
          .from('climb_photos')
          .select('*')
          .limit(5);
        
        tableStatus.climb_photos.sampleData = photos;
        tableStatus.climb_photos.photosError = photosError;
      } catch (err) {
        console.error('📸 climb_photos サンプルデータ取得エラー:', err);
      }
    }
    
    // ストレージバケットの確認
    let storageStatus = {};
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      storageStatus = {
        bucketsAvailable: buckets?.map(b => b.name) || [],
        bucketsError: bucketsError
      };
      
      // climb-photos バケットの存在確認
      const climbPhotosBucket = buckets?.find(b => b.name === 'climb-photos');
      if (climbPhotosBucket) {
        const { data: files, error: filesError } = await supabase.storage
          .from('climb-photos')
          .list('', { limit: 5 });
        
        storageStatus = {
          ...storageStatus,
          climbPhotosBucket: {
            exists: true,
            public: climbPhotosBucket.public,
            fileCount: files?.length || 0,
            sampleFiles: files?.slice(0, 3) || [],
            filesError
          }
        };
      } else {
        storageStatus = {
          ...storageStatus,
          climbPhotosBucket: {
            exists: false
          }
        };
      }
    } catch (err) {
      console.error('🗂️ ストレージ確認エラー:', err);
      storageStatus = {
        error: err instanceof Error ? err.message : 'Unknown storage error'
      };
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      tables: tableStatus,
      storage: storageStatus,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      environment: process.env.NODE_ENV
    };
    
    console.log('📊 データベース状態レポート:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 データベース状態確認中にエラー:', error);
    return NextResponse.json(
      { 
        error: 'データベース状態確認に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
