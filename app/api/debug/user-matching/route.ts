import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('🕵️ ユーザーマッチング調査開始...');
    
    // 認証状態の確認
    let currentUser = null;
    let authStatus = 'not_authenticated';
    let authError = null;
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && !userError) {
        currentUser = user;
        authStatus = 'authenticated';
        console.log('✅ 認証ユーザー発見:', user.id);
      } else {
        console.log('❌ 認証エラーまたはユーザーなし:', userError);
        authError = userError;
      }
    } catch (authErr) {
      console.log('⚠️ 認証チェック例外:', authErr);
      authStatus = 'auth_check_failed';
      authError = authErr;
    }
    
    // climb_photosテーブルから全user_idを取得
    const { data: photos, error: photosError } = await supabase
      .from('climb_photos')
      .select('user_id, climb_id, id, storage_path, thumbnail_path')
      .limit(10);
    
    // climbs テーブルから全user_idを取得
    const { data: climbs, error: climbsError } = await supabase
      .from('climbs')
      .select('user_id, id, mountain_id, climb_date')
      .limit(10);
    
    // 特定のユーザーIDでの詳細検索テスト
    const testUserIds = [
      '98bc6dca-16ba-4c23-84ac-1bf051c35193',
      '10497880-a627-443e-9b25-296cb6133ca9'
    ];
    
    const userTestResults: Record<string, {
      climbsFound?: number;
      error: string | null;
      sampleClimb?: unknown;
    }> = {};
    
    for (const testUserId of testUserIds) {
      try {
        console.log(`🔍 ユーザー ${testUserId} のデータを検索中...`);
        
        const { data: userClimbs, error: userClimbsError } = await supabase
          .from('climbs')
          .select(`
            *,
            mountains (name),
            climb_photos (
              id,
              storage_path,
              thumbnail_path,
              caption,
              sort_order
            )
          `)
          .eq('user_id', testUserId)
          .order('climb_date', { ascending: false })
          .limit(5);
        
        console.log(`📊 ユーザー ${testUserId} の結果:`, {
          climbsFound: userClimbs?.length || 0,
          error: userClimbsError?.message || null
        });
        
        userTestResults[testUserId] = {
          climbsFound: userClimbs?.length || 0,
          error: userClimbsError?.message || null,
          sampleClimb: userClimbs?.[0] ? {
            id: userClimbs[0].id,
            mountain_name: userClimbs[0].mountains?.name || 'unknown',
            climb_date: userClimbs[0].climb_date,
            photo_count: userClimbs[0].climb_photos?.length || 0,
            photos: userClimbs[0].climb_photos || []
          } : null
        };
      } catch (err) {
        console.error(`❌ ユーザー ${testUserId} 検索エラー:`, err);
        userTestResults[testUserId] = {
          error: `Exception: ${err instanceof Error ? err.message : 'Unknown'}`
        };
      }
    }
    
    // 現在のユーザーでのテスト（認証されている場合）
    let currentUserTest = null;
    if (currentUser) {
      try {
        console.log(`🔍 現在のユーザー ${currentUser.id} のデータを検索中...`);
        
        const { data: currentUserClimbs, error: currentUserError } = await supabase
          .from('climbs')
          .select(`
            *,
            mountains (name),
            climb_photos (
              id,
              storage_path,
              thumbnail_path,
              caption,
              sort_order
            )
          `)
          .eq('user_id', currentUser.id)
          .order('climb_date', { ascending: false })
          .limit(5);
        
        currentUserTest = {
          climbsFound: currentUserClimbs?.length || 0,
          error: currentUserError?.message || null,
          sampleClimb: currentUserClimbs?.[0] || null
        };
        
        console.log(`📊 現在のユーザーの結果:`, currentUserTest);
      } catch (err) {
        console.error(`❌ 現在のユーザー検索エラー:`, err);
        currentUserTest = {
          error: `Exception: ${err instanceof Error ? err.message : 'Unknown'}`
        };
      }
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      authStatus,
      currentUser: {
        id: currentUser?.id || null,
        email: currentUser?.email || null,
        authenticated: !!currentUser
      },
      currentUserTest,
      databaseUserIds: {
        fromClimbs: climbs?.map(c => c.user_id) || [],
        fromPhotos: photos?.map(p => p.user_id) || [],
        uniqueUserIds: [...new Set([
          ...(climbs?.map(c => c.user_id) || []),
          ...(photos?.map(p => p.user_id) || [])
        ])]
      },
      matching: {
        currentUserHasClimbs: climbs?.some(c => c.user_id === currentUser?.id) || false,
        currentUserHasPhotos: photos?.some(p => p.user_id === currentUser?.id) || false,
        currentUserClimbs: climbs?.filter(c => c.user_id === currentUser?.id) || [],
        currentUserPhotos: photos?.filter(p => p.user_id === currentUser?.id) || []
      },
      userTestResults,
      sampleData: {
        allPhotos: photos?.slice(0, 3) || [],
        allClimbs: climbs?.slice(0, 3) || []
      },
      errors: {
        authError: authError ? JSON.stringify(authError) : null,
        photosError: photosError?.message || null,
        climbsError: climbsError?.message || null
      }
    };
    
    console.log('🕵️ ユーザーマッチング調査結果:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('💥 ユーザーマッチング調査中にエラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'ユーザーマッチング調査に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
