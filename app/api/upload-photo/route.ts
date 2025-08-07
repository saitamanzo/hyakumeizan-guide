import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import type { ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '認証が必要です', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // フォームデータの取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const climbId = formData.get('climbId') as string;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ファイルが選択されていません', code: 'NO_FILE' },
        { status: 400 }
      );
    }
    if (!climbId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: '登山記録IDが必要です', code: 'NO_CLIMB_ID' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'ファイルサイズが大きすぎます（最大10MB）', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'サポートされていないファイル形式です', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${climbId}/${timestamp}.${fileExtension}`;

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('climb-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `画像のアップロードに失敗しました: ${uploadError.message}`, code: 'UPLOAD_ERROR' },
        { status: 500 }
      );
    }

    // サムネイル作成（今後の機能拡張用）
    const thumbnailPath = null;

    // データベースに写真メタデータを保存
    const { data: photoData, error: dbError } = await supabase
      .from('climb_photos')
      .insert({
        climb_id: climbId,
        user_id: user.id,
        storage_path: uploadData.path,
        thumbnail_path: thumbnailPath,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        sort_order: 0
      })
      .select()
      .single();
    if (dbError) {
      // アップロードした画像を削除
      await supabase.storage.from('climb-photos').remove([uploadData.path]);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `データベースへの保存に失敗しました: ${dbError.message}`, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('climb-photos')
      .getPublicUrl(uploadData.path);

    return NextResponse.json<ApiResponse<{
      id: string;
      storage_path: string;
      url: string;
      caption: string;
      original_filename: string;
      file_size: number;
    }>>({
      success: true,
      data: {
        id: photoData.id,
        storage_path: uploadData.path,
        url: urlData.publicUrl,
        caption: photoData.caption,
        original_filename: photoData.original_filename,
        file_size: photoData.file_size
      }
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: '内部サーバーエラーが発生しました', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
