'use server';

import { createClient } from '@/lib/supabase/server';
import type { Mountain } from '@/types/database';

export async function getMountains(): Promise<Mountain[]> {
  const supabase = await createClient();
  
  const { data: mountains, error } = await supabase
    .from('mountains')
    .select('*')
    .order('name');
    
  if (error) {
    console.error('Error fetching mountains:', error);
    throw error;
  }
  
  return mountains as Mountain[];
}
