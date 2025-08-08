import { createClient } from './supabase/client';
const supabase = createClient();

/**
 * ユーザーが指定の登山記録をお気に入り登録しているか判定
 */
export async function isClimbFavoritedByUser(climbId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('climb_favorites')
    .select('id')
    .eq('climb_id', climbId)
    .eq('user_id', userId)
    .maybeSingle();
  return !error && !!data;
}

/**
 * 登山記録のお気に入り数を取得
 */
export async function getClimbFavoriteCount(climbId: string): Promise<number> {
  const { count, error } = await supabase
    .from('climb_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('climb_id', climbId);
  return error || count == null ? 0 : count;
}

/**
 * 登山記録をお気に入り登録
 */
export async function addClimbFavorite(climbId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('climb_favorites').insert({ climb_id: climbId, user_id: userId });
  return !error;
}

/**
 * 登山記録のお気に入り登録を解除
 */
export async function removeClimbFavorite(climbId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('climb_favorites')
    .delete()
    .eq('climb_id', climbId)
    .eq('user_id', userId);
  return !error;
}

/**
 * 登山記録のお気に入り状態をトグル
 */
export async function toggleClimbFavorite(climbId: string, userId: string): Promise<boolean> {
  const isFav = await isClimbFavoritedByUser(climbId, userId);
  if (isFav) {
    await removeClimbFavorite(climbId, userId);
    return false;
  } else {
    await addClimbFavorite(climbId, userId);
    return true;
  }
}
