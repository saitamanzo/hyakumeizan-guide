'use server';

import { createClient } from '@/lib/supabase/server';
import type { MountainWithRoutes } from '@/types/database';

export async function getMountainWithRoutes(mountainId: string): Promise<MountainWithRoutes | null> {
  const supabase = await createClient();
  
  const { data: mountain, error } = await supabase
    .from('mountains')
    .select(`
      *,
      routes (*)
    `)
    .eq('id', mountainId)
    .single();
    
  if (error) {
    console.error('Error fetching mountain:', error);
    return null;
  }
  
  return mountain as MountainWithRoutes;
}

export async function getMountainReviews(mountainId: string) {
  const supabase = await createClient();
  
  // まずreviewsテーブルのみで試行
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('mountain_id', mountainId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching reviews:', error);
    // エラーが発生した場合は空配列を返す（ページクラッシュを防ぐ）
    return [];
  }
  
  return reviews || [];
}
