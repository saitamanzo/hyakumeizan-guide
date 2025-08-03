'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { Mountain } from '@/types/database';

export async function getMountains(): Promise<Mountain[]> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    console.log('getMountains: 開始');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定');
    console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
    
    const { data: mountains, error } = await supabase
      .from('mountains')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('getMountains: Supabase エラー:', error);
      throw error;
    }
    
    console.log('getMountains: 成功 -', mountains?.length || 0, '件取得');
    return mountains as Mountain[];
  } catch (err) {
    console.error('getMountains: エラー発生:', err);
    console.error('Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined
    });
    throw err;
  }
}
