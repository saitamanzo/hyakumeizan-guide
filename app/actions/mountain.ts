import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { MountainWithRoutes } from '@/types/database';

export async function getMountainWithRoutes(mountainId: string) {
  const supabase = createServerComponentClient({ cookies });
  
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
    throw error;
  }
  
  return mountain as MountainWithRoutes;
}

export async function getMountainReviews(mountainId: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      *,
      users (id, display_name)
    `)
    .eq('mountain_id', mountainId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
  
  return reviews;
}
