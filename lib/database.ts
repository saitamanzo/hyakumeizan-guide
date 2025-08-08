import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
import type { Route, User, Climb, Review, UserWithClimbs } from '../types/database';

/**
 * 山のルート一覧を取得
 */
export async function getMountainRoutes(mountainId: string): Promise<Route[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('mountain_id', mountainId)
    .order('name');
  if (error || !data) return [];
  return data;
}

/**
 * ユーザープロフィールを取得
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

/**
 * ユーザーと登山記録一覧を取得
 */
export async function getUserWithClimbs(userId: string): Promise<UserWithClimbs | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`*, climbs (*)`)
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

/**
 * ユーザーの登山記録一覧を取得
 */
export async function getUserClimbs(userId: string): Promise<Climb[]> {
  const { data, error } = await supabase
    .from('climbs')
    .select('*')
    .eq('user_id', userId)
    .order('climb_date', { ascending: false });
  if (error || !data) return [];
  return data;
}

/**
 * 登山記録を新規作成
 */
export async function createClimb(climb: Omit<Climb, 'id' | 'created_at' | 'updated_at'>): Promise<Climb | null> {
  const { data, error } = await supabase
    .from('climbs')
    .insert([climb])
    .select()
    .single();
  if (error || !data) return null;
  return data;
}

/**
 * レビューを新規作成
 */
export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select()
    .single();
  if (error || !data) return null;
  return data;
}
