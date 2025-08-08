// 写真表示のデバッグ用ユーティリティ
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

/**
 * 登山記録の写真URLデバッグ
 */
export const debugPhotoUrls = async (climbId: string): Promise<void> => {
  try {
    const { data: photos, error } = await supabase
      .from('climb_photos')
      .select('*')
      .eq('climb_id', climbId);
    if (error || !photos) {
      console.error('写真データ取得エラー:', error);
      return;
    }
    console.log('🔍 写真データ詳細:', photos);
    for (const photo of photos) {
      console.log(`📸 写真 ${photo.id}:`);
      console.log('  - storage_path:', photo.storage_path);
      console.log('  - thumbnail_path:', photo.thumbnail_path);
      if (photo.storage_path) {
        const { data: urlData } = supabase.storage
          .from('climb-photos')
          .getPublicUrl(photo.storage_path);
        console.log('  - 生成URL:', urlData.publicUrl);
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log(`  - アクセステスト: ${response.status} ${response.statusText}`);
        } catch (fetchError) {
          console.error('  - アクセスエラー:', fetchError);
        }
      }
    }
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError || !buckets) {
      console.error('バケット一覧取得エラー:', bucketError);
    } else {
      console.log('📁 利用可能バケット:', buckets.map(b => b.name));
      const climbPhotosBucket = buckets.find(b => b.name === 'climb-photos');
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

/**
 * 画像URLのアクセス可否テスト
 */
export const testImageAccess = async (imagePath: string): Promise<boolean> => {
  const fullUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/climb-photos/${imagePath}`;
  console.log('� 画像アクセステスト:', fullUrl);
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
