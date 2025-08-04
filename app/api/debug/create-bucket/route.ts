import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// サービスロールキーが必要（管理操作用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  try {
    console.log('🗂️ ストレージバケット作成開始...');
    
    // バケットの作成
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('climb-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });
    
    if (bucketError) {
      console.error('❌ バケット作成エラー:', bucketError);
      
      // バケットが既に存在する場合は成功として扱う
      if (bucketError.message?.includes('already exists')) {
        console.log('✅ バケットは既に存在しています');
        return NextResponse.json({
          success: true,
          message: 'バケットは既に存在しています',
          bucket: { name: 'climb-photos' }
        });
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'バケット作成に失敗しました',
          details: bucketError.message 
        },
        { status: 500 }
      );
    }
    
    console.log('✅ バケット作成成功:', bucket);
    
    // バケット一覧を取得して確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    console.log('📋 バケット一覧:', buckets);
    
    if (listError) {
      console.error('⚠️ バケット一覧取得エラー:', listError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'ストレージバケットを作成しました',
      bucket,
      allBuckets: buckets
    });
    
  } catch (error) {
    console.error('💥 ストレージバケット作成中にエラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'ストレージバケット作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
