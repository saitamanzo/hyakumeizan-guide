import { createClient } from './supabase/client';
const supabase = createClient();

export async function addPlanFavorite(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('plan_favorites').insert({ user_id: userId, plan_id: planId });
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function removePlanFavorite(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('plan_favorites').delete().eq('user_id', userId).eq('plan_id', planId);
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getPlanFavoriteCount(planId: string, userId?: string): Promise<{ count: number; user_has_favorited: boolean }> {
  const { count } = await supabase.from('plan_favorites').select('id', { count: 'exact', head: true }).eq('plan_id', planId);
  let user_has_favorited = false;
  if (userId) {
    const { data } = await supabase.from('plan_favorites').select('id').eq('plan_id', planId).eq('user_id', userId).maybeSingle();
    user_has_favorited = !!data;
  }
  return { count: count ?? 0, user_has_favorited };
}

export async function togglePlanFavorite(
  userId: string,
  planId: string
): Promise<{ success: boolean; favorited: boolean; error?: string }> {
  const favStatus = await getPlanFavoriteCount(planId, userId);
  if (favStatus.user_has_favorited) {
    const res = await removePlanFavorite(userId, planId);
    return { ...res, favorited: false };
  } else {
    const res = await addPlanFavorite(userId, planId);
    return { ...res, favorited: true };
  }
}
