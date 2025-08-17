'use server';

import { createClient } from '@/lib/supabase/server';
import type { Mountain } from '@/types/database';

export async function getMountains(): Promise<Mountain[]> {
  const supabase = await createClient();
  
  const { data: mountains, error } = await supabase
    .from('mountains')
    .select('*')
  // カテゴリ → カテゴリ内順 → 名前 の優先で並べる（NULLは最後）
  .order('category', { ascending: true, nullsFirst: false })
  .order('category_order', { ascending: true, nullsFirst: false })
  .order('name', { ascending: true });
    
  if (error) {
    console.error('Error fetching mountains:', error);
    throw error;
  }
  
  return mountains as Mountain[];
}
