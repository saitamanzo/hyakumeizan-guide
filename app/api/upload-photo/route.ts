import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // フォームデータの取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const climbId = formData.get('climbId') as string;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    if (!climbId) {
      return NextResponse.json(
        { error: '登山記録IDが必要です' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大10MB）' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です' },
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
      console.error('画像アップロードエラー:', uploadError);
      return NextResponse.json(
        { error: `画像のアップロードに失敗しました: ${uploadError.message}` },
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
      console.error('データベース保存エラー:', dbError);
      // アップロードした画像を削除
      await supabase.storage.from('climb-photos').remove([uploadData.path]);
      return NextResponse.json(
        { error: `データベースへの保存に失敗しました: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('climb-photos')
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
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
    console.error('写真アップロード処理エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
