import { createClient } from './supabase/client';
const supabase = createClient();

export async function addClimbLike(userId: string, climbId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('climb_favorites').insert({ user_id: userId, climb_id: climbId });
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function removeClimbLike(userId: string, climbId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('climb_favorites').delete().eq('user_id', userId).eq('climb_id', climbId);
    if (error) return { success: false, error: error.message ?? 'Unknown error' };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getClimbLikeCount(climbId: string, userId?: string): Promise<{ count: number; user_has_liked: boolean }> {
  const { count } = await supabase.from('climb_favorites').select('id', { count: 'exact', head: true }).eq('climb_id', climbId);
  let user_has_liked = false;
  if (userId) {
    const { data } = await supabase.from('climb_favorites').select('id').eq('climb_id', climbId).eq('user_id', userId).maybeSingle();
    user_has_liked = !!data;
  }
  return { count: count ?? 0, user_has_liked };
}

export async function toggleClimbLike(
  userId: string,
  climbId: string
): Promise<{ success: boolean; liked: boolean; error?: string }> {
  const likeStatus = await getClimbLikeCount(climbId, userId);
  if (likeStatus.user_has_liked) {
    const res = await removeClimbLike(userId, climbId);
    return { ...res, liked: false };
  } else {
    const res = await addClimbLike(userId, climbId);
    return { ...res, liked: true };
  }
}
