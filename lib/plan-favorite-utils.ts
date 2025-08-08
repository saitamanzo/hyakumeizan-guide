import { createClient } from './supabase/client';
const supabase = createClient();

/**
 * 登山計画のお気に入り（Favorite）追加
 */
export async function addPlanFavorite(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('plan_favorites').insert({ user_id: userId, plan_id: planId });
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 登山計画のお気に入り（Favorite）削除
 */
export async function removePlanFavorite(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('plan_favorites').delete().eq('user_id', userId).eq('plan_id', planId);
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export interface PlanFavoriteCount {
  count: number;
  user_has_favorited: boolean;
}

export async function getPlanFavoriteCount(planId: string, userId?: string): Promise<PlanFavoriteCount> {
  const { count } = await supabase.from('plan_favorites').select('id', { count: 'exact', head: true }).eq('plan_id', planId);
  let user_has_favorited = false;
  if (userId) {
    const { data } = await supabase.from('plan_favorites').select('id').eq('plan_id', planId).eq('user_id', userId).maybeSingle();
    user_has_favorited = !!data;
  }
  return { count: count ?? 0, user_has_favorited };
}

/**
 * Favoriteのトグル（追加/削除）
 */
export interface TogglePlanFavoriteResult {
  success: boolean;
  favorited: boolean;
  error?: string;
}

export async function togglePlanFavorite(
  userId: string,
  planId: string
): Promise<TogglePlanFavoriteResult> {
  const favStatus = await getPlanFavoriteCount(planId, userId);
  if (favStatus.user_has_favorited) {
    const res = await removePlanFavorite(userId, planId);
    return { ...res, favorited: false };
  } else {
    const res = await addPlanFavorite(userId, planId);
    return { ...res, favorited: true };
  }
}

// 重複定義をすべて削除
