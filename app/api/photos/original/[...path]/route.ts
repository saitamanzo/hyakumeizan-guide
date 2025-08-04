import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const supabase = createClient();
    const imagePath = params.path.join('/');

    // Supabase Storageから画像を取得
    const { data, error } = await supabase.storage
      .from('climb-photos')
      .download(imagePath);

    if (error) {
      console.error('画像取得エラー:', error);
      return new NextResponse('画像が見つかりません', { status: 404 });
    }

    // 画像のバイナリデータを取得
    const buffer = await data.arrayBuffer();

    // 適切なContent-Typeを設定
    const contentType = data.type || 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('画像配信エラー:', error);
    return new NextResponse('内部エラー', { status: 500 });
  }
}
