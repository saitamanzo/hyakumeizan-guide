import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Mountain } from '@/types/database';

export async function getMountains() {
  const supabase = createServerComponentClient({ cookies });
  
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
