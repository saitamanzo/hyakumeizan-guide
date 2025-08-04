// 写真表示のデバッグ用ユーティリティ
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const debugPhotoUrls = async (climbId: string) => {
  try {
    // 写真データを取得
    const { data: photos, error } = await supabase
      .from('climb_photos')
      .select('*')
      .eq('climb_id', climbId);

    if (error) {
      console.error('写真データ取得エラー:', error);
      return;
    }

    console.log('🔍 写真データ詳細:', photos);

    // 各写真のURLを検証
    for (const photo of photos || []) {
      console.log(`📸 写真 ${photo.id}:`);
      console.log('  - storage_path:', photo.storage_path);
      console.log('  - thumbnail_path:', photo.thumbnail_path);
      
      // ストレージからの直接URL取得をテスト
      if (photo.storage_path) {
        const { data: urlData } = supabase.storage
          .from('climb-photos')
          .getPublicUrl(photo.storage_path);
        console.log('  - 生成URL:', urlData.publicUrl);
        
        // 実際にアクセス可能かテスト
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log(`  - アクセステスト: ${response.status} ${response.statusText}`);
        } catch (fetchError) {
          console.error('  - アクセスエラー:', fetchError);
        }
      }
    }

    // ストレージバケットの存在確認
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('バケット一覧取得エラー:', bucketError);
    } else {
      console.log('📁 利用可能バケット:', buckets?.map(b => b.name));
      
      const climbPhotosBucket = buckets?.find(b => b.name === 'climb-photos');
      if (climbPhotosBucket) {
        console.log('✅ climb-photos バケット存在確認');
        console.log('  - 公開設定:', climbPhotosBucket.public);
      } else {
        console.error('❌ climb-photos バケットが見つかりません');
      }
    }

  } catch (error) {
    console.error('デバッグ処理エラー:', error);
  }
};

export const testImageAccess = async (imagePath: string) => {
  const fullUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/climb-photos/${imagePath}`;
  console.log('🧪 画像アクセステスト:', fullUrl);
  
  try {
    const response = await fetch(fullUrl, { method: 'HEAD' });
    console.log(`📊 結果: ${response.status} ${response.statusText}`);
    console.log('📋 ヘッダー:', Object.fromEntries(response.headers.entries()));
    return response.ok;
  } catch (error) {
    console.error('❌ アクセスエラー:', error);
    return false;
  }
};
