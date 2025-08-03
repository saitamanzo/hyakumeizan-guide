import { supabase } from './supabase';

export interface PhotoUploadResult {
  success: boolean;
  photoId?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  filePath?: string;
  error?: string;
}

export interface ClimbPhoto {
  id: string;
  climb_id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path?: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  caption?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 画像をリサイズしてサムネイルを作成
 */
export const createThumbnail = (file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // アスペクト比を保持してリサイズ
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(thumbnailFile);
          } else {
            reject(new Error('サムネイル作成に失敗しました'));
          }
        }, file.type, quality);
      } else {
        reject(new Error('Canvas context を取得できませんでした'));
      }
    };

    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 写真をSupabase Storageにアップロード
 */
export const uploadPhoto = async (
  file: File,
  climbId: string,
  userId: string,
  caption?: string
): Promise<PhotoUploadResult> => {
  try {
    // ファイル名を生成（ユーザーID/登山記録ID/タイムスタンプ_オリジナルファイル名）
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const originalFileName = `${userId}/${climbId}/${timestamp}_original.${fileExtension}`;
    const thumbnailFileName = `${userId}/${climbId}/${timestamp}_thumb.${fileExtension}`;

    // サムネイルを作成
    const thumbnailFile = await createThumbnail(file);

    // オリジナル画像をアップロード
    const { data: originalData, error: originalError } = await supabase.storage
      .from('climb-photos')
      .upload(originalFileName, file);

    if (originalError) {
      console.error('オリジナル画像のアップロードに失敗:', originalError);
      return {
        success: false,
        error: `オリジナル画像のアップロードに失敗しました: ${originalError.message}`
      };
    }

    // サムネイル画像をアップロード
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from('climb-photos')
      .upload(thumbnailFileName, thumbnailFile);

    if (thumbnailError) {
      console.error('サムネイル画像のアップロードに失敗:', thumbnailError);
      // オリジナル画像を削除
      await supabase.storage.from('climb-photos').remove([originalFileName]);
      return {
        success: false,
        error: `サムネイル画像のアップロードに失敗しました: ${thumbnailError.message}`
      };
    }

    // データベースにメタデータを保存
    const { data: photoData, error: dbError } = await supabase
      .from('climb_photos')
      .insert({
        climb_id: climbId,
        user_id: userId,
        storage_path: originalData.path,
        thumbnail_path: thumbnailData.path,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        sort_order: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error('データベースへの保存に失敗:', dbError);
      // アップロードした画像を削除
      await supabase.storage.from('climb-photos').remove([originalFileName, thumbnailFileName]);
      return {
        success: false,
        error: `データベースへの保存に失敗しました: ${dbError.message}`
      };
    }

    // 公開URLを取得
    const { data: originalUrlData } = supabase.storage
      .from('climb-photos')
      .getPublicUrl(originalData.path);

    const { data: thumbnailUrlData } = supabase.storage
      .from('climb-photos')
      .getPublicUrl(thumbnailData.path);

    return {
      success: true,
      photoId: photoData.id,
      originalUrl: originalUrlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl,
      filePath: originalData.path,
    };

  } catch (error) {
    console.error('写真アップロード中にエラーが発生:', error);
    return {
      success: false,
      error: `写真アップロード中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    };
  }
};

/**
 * 登山記録の写真一覧を取得
 */
export const getClimbPhotos = async (climbId: string): Promise<ClimbPhoto[]> => {
  try {
    const { data, error } = await supabase
      .from('climb_photos')
      .select('*')
      .eq('climb_id', climbId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('写真一覧の取得に失敗:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('写真一覧取得中にエラーが発生:', error);
    return [];
  }
};

/**
 * 写真のサムネイルURLを取得
 */
export const getThumbnailUrl = (thumbnailPath: string): string => {
  const { data } = supabase.storage
    .from('climb-photos')
    .getPublicUrl(thumbnailPath);
  
  return data.publicUrl;
};

/**
 * 写真のオリジナルURLを取得
 */
export const getOriginalUrl = (storagePath: string): string => {
  const { data } = supabase.storage
    .from('climb-photos')
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
};

/**
 * 写真を削除
 */
export const deletePhoto = async (photoId: string): Promise<boolean> => {
  try {
    // メタデータを取得
    const { data: photoData, error: fetchError } = await supabase
      .from('climb_photos')
      .select('storage_path, thumbnail_path')
      .eq('id', photoId)
      .single();

    if (fetchError || !photoData) {
      console.error('写真データの取得に失敗:', fetchError);
      return false;
    }

    // ストレージから画像を削除
    const filesToDelete = [photoData.storage_path];
    if (photoData.thumbnail_path) {
      filesToDelete.push(photoData.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage
      .from('climb-photos')
      .remove(filesToDelete);

    if (storageError) {
      console.error('ストレージからの削除に失敗:', storageError);
      return false;
    }

    // データベースから削除
    const { error: dbError } = await supabase
      .from('climb_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      console.error('データベースからの削除に失敗:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('写真削除中にエラーが発生:', error);
    return false;
  }
};

/**
 * 写真の並び順を更新
 */
export const updatePhotoOrder = async (photoId: string, newOrder: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('climb_photos')
      .update({ sort_order: newOrder })
      .eq('id', photoId);

    if (error) {
      console.error('写真の並び順更新に失敗:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('写真の並び順更新中にエラーが発生:', error);
    return false;
  }
};