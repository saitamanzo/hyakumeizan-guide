'use server';

import { supabaseServer } from '@/lib/supabase-server';
import type { Mountain } from '@/types/database';

export async function getMountains(): Promise<Mountain[]> {
  try {
    const { data: mountains, error } = await supabaseServer
      .from('mountains')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    return mountains as Mountain[];
  } catch (err) {
    console.error('getMountains: エラー発生:', err);
    throw err;
  }
}
