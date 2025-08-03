import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
import { Route, User, Climb, Review, UserWithClimbs } from '../types/database';

// Routes
export async function getMountainRoutes(mountainId: string): Promise<Route[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('mountain_id', mountainId)
    .order('name');
  
  if (error) throw error;
  return data;
}

// Users
export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserWithClimbs(userId: string): Promise<UserWithClimbs | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      climbs (*)
    `)
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

// Climbs
export async function getUserClimbs(userId: string): Promise<Climb[]> {
  const { data, error } = await supabase
    .from('climbs')
    .select('*')
    .eq('user_id', userId)
    .order('climb_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createClimb(climb: Omit<Climb, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('climbs')
    .insert([climb])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Reviews
export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
